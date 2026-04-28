#!/usr/bin/env python3
"""
팩플로우 현장 사용자 계정 일괄 생성 스크립트.

사용법:
  python3 03_setup_users.py            # USERS 시드 적용
  python3 03_setup_users.py --dry-run  # 적용 없이 적용 예정 목록만 출력
  python3 03_setup_users.py --reset-pw # 이미 있는 계정의 비밀번호도 USERS 값으로 덮어쓰기

역할:
  admin    - 전체 관리자 (모든 메뉴)
  office   - 사무실 (생산/출고/회계)
  worker   - 현장 작업자 (본인 공정만)
  material - 자재 담당 (입고/재고/발주)
  sales    - 영업 (수주/거래처/매출)

운영 시드 정책:
  - 같은 un(아이디)이 이미 있으면 SKIP (--reset-pw 일 땐 비번만 갱신)
  - admin 의 perms 는 None (전체 권한). 그 외 역할은 [] 로 시작 → UI에서 부여
  - proc 필드 정책 (회귀 방지를 위해 모든 항목에 명시):
      worker  → 담당 공정명 (예: "인쇄","코팅","톰슨","접착","후가공")
      admin   → "all"  (전체 공정 — 어디서든 시작/완료 가능)
      office  → "all"  (사무실은 모든 공정 모니터링)
      material→ ""     (자재는 공정과 무관)
      sales   → ""     (영업은 공정과 무관)
    "all" 은 모바일 작업자 화면에서 공정 필터링을 건너뛰는 의도된 마커.
"""
import json
import os
import sys
import sqlite3
import uuid

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "mes.db")

# === 여기에 실제 사용할 계정을 입력하세요 ===
# 운영 전 반드시 nm/un/pw 를 실제 정보로 교체하세요. 비번은 첫 로그인 시 본인이 변경.
# role 별 proc 필드 의도는 위 docstring 참조 — 모든 항목에 명시.
USERS = [
    # 관리자 (대표·시스템 담당) — proc="all" 로 모든 공정 권한
    {"nm": "대표",     "un": "admin",    "pw": "Admin!2026", "role": "admin",    "dept": "관리부", "position": "대표",   "proc": "all"},

    # 사무실 (수주·출고·회계) — proc="all" 로 모니터링·예외처리 가능
    {"nm": "사무1",    "un": "office1",  "pw": "Pack!2026",  "role": "office",   "dept": "사무실", "position": "사원",   "proc": "all"},
    {"nm": "사무2",    "un": "office2",  "pw": "Pack!2026",  "role": "office",   "dept": "사무실", "position": "사원",   "proc": "all"},

    # 현장 작업자 — proc 에 담당 공정. 모바일 작업자 화면에서 본인 공정만 노출
    {"nm": "인쇄담당", "un": "worker1",  "pw": "Worker2026", "role": "worker",   "dept": "생산부", "position": "작업자", "proc": "인쇄"},
    {"nm": "코팅담당", "un": "worker2",  "pw": "Worker2026", "role": "worker",   "dept": "생산부", "position": "작업자", "proc": "코팅"},
    {"nm": "톰슨담당", "un": "worker3",  "pw": "Worker2026", "role": "worker",   "dept": "생산부", "position": "작업자", "proc": "톰슨"},
    {"nm": "접착담당", "un": "worker4",  "pw": "Worker2026", "role": "worker",   "dept": "생산부", "position": "작업자", "proc": "접착"},

    # 자재 — 공정 무관
    {"nm": "자재담당", "un": "material", "pw": "Mat!2026",   "role": "material", "dept": "자재부", "position": "담당자", "proc": ""},

    # 영업 — 공정 무관
    {"nm": "영업담당", "un": "sales",    "pw": "Sales!2026", "role": "sales",    "dept": "영업부", "position": "담당자", "proc": ""},
]


# 의도 검증: role 별 proc 정책에 어긋나는 항목이 있으면 즉시 알린다.
PROC_POLICY = {
    "admin":    {"required": "all",     "label": "전체 공정"},
    "office":   {"required": "all",     "label": "전체 공정"},
    "worker":   {"required": "_named_", "label": "담당 공정명 (빈값/all 금지)"},
    "material": {"required": "",        "label": "공정 없음"},
    "sales":    {"required": "",        "label": "공정 없음"},
}


def validate_proc_policy():
    problems = []
    for u in USERS:
        role = u.get("role", "")
        proc = (u.get("proc") or "").strip()
        rule = PROC_POLICY.get(role)
        if not rule:
            problems.append(f"{u['un']}: 알 수 없는 role={role!r}")
            continue
        req = rule["required"]
        if req == "_named_":
            if not proc or proc == "all":
                problems.append(f"{u['un']} (worker): proc 가 비어있거나 'all' — 담당 공정명 필요")
        else:
            if proc != req:
                problems.append(
                    f"{u['un']} ({role}): proc={proc!r} → {rule['label']} (proc={req!r}) 권장"
                )
    return problems


def main():
    dry_run = "--dry-run" in sys.argv or "-n" in sys.argv
    reset_pw = "--reset-pw" in sys.argv

    # proc 정책 검증 — 위반 시 경고 출력 후 계속 진행 (의도된 예외도 있을 수 있음)
    policy_problems = validate_proc_policy()
    if policy_problems:
        print("[POLICY-WARN] proc 정책에 어긋나는 항목:")
        for p in policy_problems:
            print(f"  · {p}")
        print()
    else:
        print("[POLICY-OK] proc 정책 일관성 통과\n")

    if not os.path.exists(DB_PATH):
        print(f"DB 없음: {DB_PATH}")
        sys.exit(1)

    db = sqlite3.connect(DB_PATH)
    row = db.execute("SELECT value FROM data_store WHERE key='users'").fetchone()
    existing = json.loads(row[0]) if row else []

    by_un = {u.get("un"): u for u in existing}
    added = 0
    updated = 0

    for u in USERS:
        cur = by_un.get(u["un"])
        if cur:
            if reset_pw and cur.get("pw") != u["pw"]:
                cur["pw"] = u["pw"]
                cur["role"] = u["role"]
                cur["dept"] = u.get("dept", cur.get("dept", ""))
                cur["position"] = u.get("position", cur.get("position", ""))
                if u.get("proc"):
                    cur["proc"] = u["proc"]
                if u["role"] == "admin":
                    cur["perms"] = None
                print(f"  [UPDATE] {u['nm']} ({u['un']}) - 비번/역할 갱신")
                updated += 1
            else:
                print(f"  [SKIP] {u['nm']} ({u['un']}) - 이미 존재")
            continue
        user = {
            "id": str(uuid.uuid4())[:8],
            "nm": u["nm"],
            "un": u["un"],
            "pw": u["pw"],
            "role": u["role"],
            "dept": u.get("dept", ""),
            "position": u.get("position", ""),
            "proc": u.get("proc", ""),
            "perms": None if u["role"] == "admin" else [],
        }
        existing.append(user)
        print(f"  [ADD] {u['nm']} ({u['un']}) - {u['role']}")
        added += 1

    if dry_run:
        print(f"\n[DRY-RUN] 추가 예정 {added}건, 갱신 예정 {updated}건 (저장 안 함)")
        print(f"\n  {'이름':<10} {'아이디':<12} {'비번':<14} {'역할':<10} {'공정'}")
        print(f"  {'-'*65}")
        for u in USERS:
            proc_disp = u.get("proc", "") or "-"
            print(f"  {u['nm']:<10} {u['un']:<12} {u['pw']:<14} {u['role']:<10} {proc_disp}")
        db.close()
        return

    db.execute(
        "INSERT OR REPLACE INTO data_store(key, value) VALUES('users', ?)",
        [json.dumps(existing, ensure_ascii=False)]
    )
    db.commit()
    db.close()

    print(f"\n총 추가 {added}건, 갱신 {updated}건, 전체 {len(existing)}명")
    print("\n로그인 정보 (운영 전 비번은 첫 로그인 후 변경 권장):")
    print(f"  {'이름':<10} {'아이디':<12} {'비번':<14} {'역할':<10} {'공정'}")
    print(f"  {'-'*65}")
    for u in USERS:
        proc_disp = u.get("proc", "") or "-"
        print(f"  {u['nm']:<10} {u['un']:<12} {u['pw']:<14} {u['role']:<10} {proc_disp}")


if __name__ == "__main__":
    main()
