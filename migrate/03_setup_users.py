#!/usr/bin/env python3
"""
팩플로우 현장 사용자 계정 일괄 생성 스크립트.

사용법:
  python3 03_setup_users.py

역할:
  admin    - 전체 관리자 (모든 메뉴)
  office   - 사무실 (생산/출고/회계)
  worker   - 현장 작업자 (본인 공정만)
  material - 자재 담당 (입고/재고/발주)
  sales    - 영업 (수주/거래처/매출)
"""
import json
import os
import sys
import sqlite3
import uuid

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "mes.db")

# === 여기에 실제 사용할 계정을 입력하세요 ===
USERS = [
    # 관리자
    {"nm": "관리자",   "un": "admin",    "pw": "1234",   "role": "admin",    "dept": "관리부",   "position": "대표"},

    # 사무실
    {"nm": "사무실1",  "un": "office1",  "pw": "1234",   "role": "office",   "dept": "사무실",   "position": "사원"},

    # 현장 작업자 (proc에 담당 공정 입력)
    {"nm": "작업자1",  "un": "worker1",  "pw": "0000",   "role": "worker",   "dept": "생산부",   "position": "작업자", "proc": "인쇄"},
    {"nm": "작업자2",  "un": "worker2",  "pw": "0000",   "role": "worker",   "dept": "생산부",   "position": "작업자", "proc": "코팅"},
    {"nm": "작업자3",  "un": "worker3",  "pw": "0000",   "role": "worker",   "dept": "생산부",   "position": "작업자", "proc": "톰슨"},
    {"nm": "작업자4",  "un": "worker4",  "pw": "0000",   "role": "worker",   "dept": "생산부",   "position": "작업자", "proc": "접착"},

    # 자재 담당
    {"nm": "자재담당",  "un": "material", "pw": "1234",   "role": "material", "dept": "자재부",   "position": "담당자"},

    # 영업
    {"nm": "영업담당",  "un": "sales",    "pw": "1234",   "role": "sales",    "dept": "영업부",   "position": "담당자"},
]


def main():
    if not os.path.exists(DB_PATH):
        print(f"DB 없음: {DB_PATH}")
        sys.exit(1)

    db = sqlite3.connect(DB_PATH)
    row = db.execute("SELECT value FROM data_store WHERE key='users'").fetchone()
    existing = json.loads(row[0]) if row else []

    existing_uns = {u.get("un") for u in existing}
    added = 0

    for u in USERS:
        if u["un"] in existing_uns:
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

    db.execute(
        "INSERT OR REPLACE INTO data_store(key, value) VALUES('users', ?)",
        [json.dumps(existing, ensure_ascii=False)]
    )
    db.commit()
    db.close()

    print(f"\n총 {added}건 추가, 전체 {len(existing)}명")
    print("\n로그인 정보:")
    print(f"  {'이름':<10} {'아이디':<12} {'비번':<8} {'역할'}")
    print(f"  {'-'*45}")
    for u in USERS:
        print(f"  {u['nm']:<10} {u['un']:<12} {u['pw']:<8} {u['role']}")


if __name__ == "__main__":
    main()
