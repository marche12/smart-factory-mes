#!/usr/bin/env python3
"""
KV 데이터 중복 정리 스크립트.

현재 지원:
  --merge-cli   거래처(cli) 중복 후보 탐지 및 병합

거래처 중복 패턴:
  1) 같은 사업자번호(bizNo) 다른 이름  → 사업자번호 기준 병합
  2) 같은 정규화 이름 + 한쪽만 사업자번호 있음
  3) 띄어쓰기·괄호·"주식회사" 접두사·"(주)" 차이만 있는 이름

병합 방향:
  - 보존측(target): 거래이력이 더 많거나, 사업자번호가 채워진 쪽,
    동률이면 cat(생성일)이 더 오래된 쪽
  - 흡수측(loser): nm/biz가 비어 있는 필드만 target으로 채움 (덮어쓰지 않음)
  - 참조 갱신: sales/purchase/wo/orders/quotes/shipLog/income/po/priceHistory
    의 cli/cnm/customerNm 필드를 target.nm 으로 일괄 교체
  - loser 는 status='merged', mergedTo=target.id 로 마킹 (삭제하지 않음)

기본 dry-run. --apply 옵션 시에만 DB 갱신.

사용법:
  python3 migrate/04_dedupe_kv.py --merge-cli
  python3 migrate/04_dedupe_kv.py --merge-cli --apply
  python3 migrate/04_dedupe_kv.py --merge-cli --db /path/to/mes.db

주의:
  - NAS DB에 직접 쓰지 말 것. Mac 로컬 카피본만 사용.
  - 병합은 비가역적이므로 --apply 전에 dry-run 출력을 반드시 검토.
"""
import argparse
import json
import os
import re
import sqlite3
import sys
from collections import defaultdict
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DEFAULT_DB = os.path.join(PROJECT_DIR, "data", "mes.db")

# 참조 키 → 후보 필드명 (있는 첫 필드를 거래처명으로 간주)
CLI_REF_KEYS = {
    "sales":        ["cli", "cnm", "customerNm", "client"],
    "purchase":     ["cli", "cnm", "vendor", "customerNm"],
    "wo":           ["cli", "cnm", "customerNm"],
    "orders":       ["cli", "cnm", "customerNm"],
    "quotes":       ["cli", "cnm", "customerNm"],
    "shipLog":      ["cnm", "cli", "customerNm"],
    "income":       ["cli", "cnm", "vendor"],
    "po":           ["vendor", "cli", "cnm"],
    "priceHistory": ["cliNm", "customerNm", "cli"],
}

NAME_NORM_RE = re.compile(r"[\s\(\)\[\]\.\-_/·~・]")


def normalize_name(nm):
    s = str(nm or "")
    # 흔한 회사 접두/접미사 제거
    for token in ["주식회사", "(주)", "㈜", "유한회사", "(유)", "합자회사", "합명회사"]:
        s = s.replace(token, "")
    s = NAME_NORM_RE.sub("", s)
    return s.lower()


def normalize_biz(biz):
    return re.sub(r"\D", "", str(biz or ""))


def get_kv(db, key):
    row = db.execute("SELECT value FROM data_store WHERE key=?", [key]).fetchone()
    if not row:
        return []
    try:
        return json.loads(row[0]) or []
    except Exception:
        return []


def set_kv(db, key, data):
    db.execute(
        "INSERT OR REPLACE INTO data_store(key, value) VALUES(?, ?)",
        [key, json.dumps(data, ensure_ascii=False)],
    )


def count_refs(name, cli_refs_cache):
    """거래처 이름이 참조된 횟수 합계"""
    total = 0
    for rows, fields in cli_refs_cache:
        for r in rows:
            for f in fields:
                v = r.get(f)
                if v and str(v).strip() == name:
                    total += 1
                    break
    return total


def build_refs_cache(db):
    cache = []
    for key, fields in CLI_REF_KEYS.items():
        rows = get_kv(db, key)
        cache.append((rows, fields))
    return cache


def pick_target(group, refs_cache):
    """병합 대상 그룹 중 보존할 항목 선택"""
    def score(c):
        s = 0
        if normalize_biz(c.get("bizNo") or c.get("biz")):
            s += 100
        s += count_refs(c.get("nm") or "", refs_cache) * 10
        cat = str(c.get("cat") or "")
        if cat:
            # 오래된 게 우선 → 음수로 비교
            s += -ord(cat[0]) if cat else 0
        return s
    return sorted(group, key=score, reverse=True)[0]


def merge_fields(target, loser):
    """loser → target 으로 빈 필드만 보충"""
    for k, v in loser.items():
        if k in ("id", "nm", "cat", "status", "mergedTo", "_src"):
            continue
        if v in (None, "", 0):
            continue
        if not target.get(k):
            target[k] = v
    # receivable/payable 합산 (둘 다 잔액 있는 경우)
    for k in ("receivable", "payable"):
        try:
            tv = float(target.get(k) or 0)
            lv = float(loser.get(k) or 0)
            if tv or lv:
                target[k] = int(tv + lv)
        except Exception:
            pass


def find_groups(cli):
    """중복 후보 그룹 목록 반환. 각 그룹은 (reason, [c1, c2, ...])"""
    by_biz = defaultdict(list)
    by_norm = defaultdict(list)
    for c in cli:
        if c.get("status") == "merged":
            continue
        biz = normalize_biz(c.get("bizNo") or c.get("biz"))
        if biz and len(biz) >= 9:
            by_biz[biz].append(c)
        nn = normalize_name(c.get("nm"))
        if nn:
            by_norm[nn].append(c)

    groups = []
    seen_ids = set()

    # 1) 같은 사업자번호
    for biz, items in by_biz.items():
        if len(items) <= 1:
            continue
        ids = tuple(sorted(c.get("id") for c in items))
        if ids in seen_ids:
            continue
        seen_ids.add(ids)
        groups.append(("같은 사업자번호 " + biz, items))

    # 2/3) 정규화 이름 동일
    for nn, items in by_norm.items():
        if len(items) <= 1:
            continue
        ids = tuple(sorted(c.get("id") for c in items))
        if ids in seen_ids:
            continue
        seen_ids.add(ids)
        # 사업자번호가 한쪽만 있으면 reason 강화
        bizes = [normalize_biz(c.get("bizNo") or c.get("biz")) for c in items]
        non_empty = [b for b in bizes if b]
        if non_empty and len(non_empty) < len(items):
            reason = "정규화이름동일 + 사업자번호 한쪽만"
        else:
            reason = "정규화이름동일"
        groups.append((reason, items))

    return groups


def update_refs(db, refs_cache, name_map, apply_changes):
    """name_map: {old_name: new_name} 으로 모든 참조 갱신"""
    summary = {}
    for (rows, fields), key in zip(refs_cache, CLI_REF_KEYS.keys()):
        touched = 0
        for r in rows:
            for f in fields:
                v = r.get(f)
                if v and str(v).strip() in name_map:
                    new_v = name_map[str(v).strip()]
                    if new_v != v:
                        r[f] = new_v
                        touched += 1
                    break
        summary[key] = touched
        if apply_changes and touched:
            set_kv(db, key, rows)
    return summary


def cmd_merge_cli(args, db):
    cli = get_kv(db, "cli")
    if not cli:
        print("[ERROR] cli 비어있음 — 중단")
        sys.exit(1)

    refs_cache = build_refs_cache(db)
    groups = find_groups(cli)
    print(f"[INFO] 거래처 {len(cli)}건, 중복 후보 그룹 {len(groups)}개")

    if not groups:
        print("[OK] 중복 후보 없음")
        return

    name_map = {}
    cli_by_id = {c.get("id"): c for c in cli}
    plans = []  # (reason, target_nm, [loser_nms])

    for reason, items in groups:
        target = pick_target(items, refs_cache)
        losers = [c for c in items if c.get("id") != target.get("id")]
        if not losers:
            continue
        plans.append((reason, target.get("nm"), [c.get("nm") for c in losers]))
        for l in losers:
            name_map[l.get("nm")] = target.get("nm")
            if args.apply:
                merge_fields(target, l)
                l["status"] = "merged"
                l["mergedTo"] = target.get("id")
                l["mergedAt"] = datetime.now().isoformat()

    print(f"\n[PLAN] 병합 계획 {len(plans)}건:")
    for reason, t, ls in plans[: args.show]:
        print(f"  - [{reason}] target={t}  ← {', '.join(ls)}")
    if len(plans) > args.show:
        print(f"  ... ({len(plans) - args.show}건 더 있음, --show N 으로 늘리기)")

    if args.apply:
        ref_summary = update_refs(db, refs_cache, name_map, apply_changes=True)
        if not cli:
            print("[ABORT] cli 비어있음 — 저장 차단")
            sys.exit(2)
        set_kv(db, "cli", cli)
        db.commit()
        print(f"\n[OK] 병합 적용 완료")
        print(f"  cli       : {len(plans)}건 그룹 병합 (loser 는 status='merged' 마킹)")
        for k, n in ref_summary.items():
            if n:
                print(f"  {k:<10}: {n}건 참조 갱신")
    else:
        # dry-run: 참조 갱신 영향 미리보기
        ref_preview = update_refs(db, refs_cache, name_map, apply_changes=False)
        print(f"\n[DRY-RUN] 참조 갱신 예상:")
        for k, n in ref_preview.items():
            if n:
                print(f"  {k:<10}: {n}건")
        print("\n실제 적용은 --apply 옵션을 추가하세요.")


def main():
    ap = argparse.ArgumentParser(description="KV 중복 정리")
    ap.add_argument("--db", default=DEFAULT_DB)
    ap.add_argument("--apply", action="store_true", help="DB에 반영 (기본 dry-run)")
    ap.add_argument("--show", type=int, default=20, help="dry-run에서 출력할 그룹 수")
    ap.add_argument("--merge-cli", action="store_true", help="거래처 중복 병합")
    args = ap.parse_args()

    if not os.path.exists(args.db):
        print(f"[ERROR] DB 없음: {args.db}")
        sys.exit(1)

    if not args.merge_cli:
        ap.print_help()
        print("\n[INFO] 동작 옵션이 필요합니다. 예) --merge-cli")
        sys.exit(0)

    print(f"[INFO] DB: {args.db}")
    print(f"[INFO] 모드: {'APPLY' if args.apply else 'DRY-RUN'}")
    db = sqlite3.connect(args.db)
    try:
        if args.merge_cli:
            cmd_merge_cli(args, db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
