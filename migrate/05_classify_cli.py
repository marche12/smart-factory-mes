#!/usr/bin/env python3
"""
거래처(cli) 자동 분류 점수 스크립트.

운영 투입 후 NAS에 1457건이 누적되면서, 휴면·정보누락·잔존 거래처가
일상 화면을 가리는 문제를 줄이기 위해 각 거래처에 'status' 필드를 부여한다.

분류 기준 (점수):
  +5  최근 12개월 거래(매출/매입) 있음
  +2  최근 24개월 거래 있음 (12개월 신호와 중복 가능)
  -3  24개월 초과 거래 없음
  -2  사업자번호 비어있음
  -2  전화·주소·대표자 모두 비어있음
  +3  미수/미지급 잔액 있음 (보존 필요)

status 결정:
  점수 ≥  5  → active
  점수 0~4   → dormant
  점수 ≤ -1  → archive_candidate

사용법 (기본 dry-run):
  python3 migrate/05_classify_cli.py            # 분포만 출력
  python3 migrate/05_classify_cli.py --apply    # cli[i].status 갱신
  python3 migrate/05_classify_cli.py --db /path/to/mes.db

주의:
  - NAS DB에 직접 쓰지 말 것. Mac 로컬 카피본만 사용.
  - 마스터 데이터(cli) 빈 배열 덮어쓰기 가드는 server 측이 아닌
    이 스크립트 안에서도 별도 확인한다.
"""
import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DEFAULT_DB = os.path.join(PROJECT_DIR, "data", "mes.db")


def parse_dt(s):
    if not s:
        return None
    s = str(s).strip()[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except Exception:
        return None


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


def collect_trade_dates(rows, cli_field_candidates):
    """sales/purchase/shipLog 등에서 거래처별 거래일자 목록 만들기"""
    by_nm = {}
    for r in rows or []:
        nm = ""
        for f in cli_field_candidates:
            v = r.get(f)
            if v:
                nm = str(v).strip()
                break
        if not nm:
            continue
        dt = parse_dt(r.get("dt") or r.get("date") or r.get("createdAt"))
        if not dt:
            continue
        by_nm.setdefault(nm, []).append(dt)
    return by_nm


def compute_score(c, last_trade_dt, today):
    """단일 거래처에 대한 점수 + 사유 목록 산출"""
    reasons = []
    score = 0

    if last_trade_dt:
        delta = today - last_trade_dt
        if delta <= timedelta(days=365):
            score += 5
            reasons.append("최근12M거래 +5")
        if delta <= timedelta(days=730):
            score += 2
            reasons.append("최근24M거래 +2")
        if delta > timedelta(days=730):
            score -= 3
            reasons.append("24M초과거래없음 -3")
    else:
        score -= 3
        reasons.append("거래이력없음 -3")

    biz = (c.get("bizNo") or c.get("biz") or "").strip()
    if not biz:
        score -= 2
        reasons.append("사업자번호없음 -2")

    tel = (c.get("tel") or c.get("telCompany") or c.get("telHandphone") or "").strip()
    addr = (c.get("addr") or "").strip()
    ceo = (c.get("ceo") or "").strip()
    if not tel and not addr and not ceo:
        score -= 2
        reasons.append("연락정보전부없음 -2")

    receivable = float(c.get("receivable") or 0)
    payable = float(c.get("payable") or 0)
    if receivable > 0 or payable > 0:
        score += 3
        reasons.append("잔액존재 +3")

    return score, reasons


def status_for(score):
    if score >= 5:
        return "active"
    if score >= 0:
        return "dormant"
    return "archive_candidate"


def main():
    ap = argparse.ArgumentParser(description="거래처 자동 분류 점수")
    ap.add_argument("--db", default=DEFAULT_DB, help="mes.db 경로 (기본: data/mes.db)")
    ap.add_argument("--apply", action="store_true", help="실제로 cli.status 를 DB에 반영")
    ap.add_argument("--today", default=None, help="기준일자(YYYY-MM-DD), 기본은 오늘")
    args = ap.parse_args()

    if not os.path.exists(args.db):
        print(f"[ERROR] DB 없음: {args.db}")
        sys.exit(1)

    today = parse_dt(args.today) or datetime.now()
    print(f"[INFO] 기준일자: {today.strftime('%Y-%m-%d')}")
    print(f"[INFO] DB: {args.db}")
    print(f"[INFO] 모드: {'APPLY (DB 업데이트)' if args.apply else 'DRY-RUN'}")

    db = sqlite3.connect(args.db)

    cli = get_kv(db, "cli")
    if not isinstance(cli, list) or not cli:
        print("[ERROR] cli 가 비었거나 배열 아님 — 중단")
        db.close()
        sys.exit(1)

    sales = get_kv(db, "sales")
    purchase = get_kv(db, "purchase")
    ship = get_kv(db, "shipLog")
    income = get_kv(db, "income")

    sales_by = collect_trade_dates(sales, ["cli", "cnm", "customerNm", "client"])
    purchase_by = collect_trade_dates(purchase, ["cli", "cnm", "customerNm", "vendor"])
    ship_by = collect_trade_dates(ship, ["cnm", "cli", "customerNm"])
    income_by = collect_trade_dates(income, ["cli", "cnm", "vendor", "customerNm"])

    last_trade = {}
    for src in (sales_by, purchase_by, ship_by, income_by):
        for nm, dts in src.items():
            cur = last_trade.get(nm)
            mx = max(dts)
            if not cur or mx > cur:
                last_trade[nm] = mx

    counts = {"active": 0, "dormant": 0, "archive_candidate": 0}
    changed = 0
    samples = {"active": [], "dormant": [], "archive_candidate": []}

    for c in cli:
        nm = (c.get("nm") or "").strip()
        last_dt = last_trade.get(nm)
        score, reasons = compute_score(c, last_dt, today)
        st = status_for(score)
        counts[st] += 1
        if c.get("status") != st:
            changed += 1
        if len(samples[st]) < 3:
            samples[st].append({
                "nm": nm,
                "score": score,
                "reasons": reasons,
                "last": last_dt.strftime("%Y-%m-%d") if last_dt else "-",
            })
        if args.apply:
            c["status"] = st
            c["score"] = score
            c["scoreAt"] = datetime.now().isoformat()
            c["scoreReasons"] = reasons

    print()
    print("=" * 50)
    print(f"  거래처 {len(cli)}건 분류 결과")
    print(f"  활성(active)             : {counts['active']:>5}건")
    print(f"  휴면(dormant)            : {counts['dormant']:>5}건")
    print(f"  보관후보(archive_cand.)  : {counts['archive_candidate']:>5}건")
    print(f"  status 변경 예정         : {changed:>5}건")
    print("=" * 50)

    for k, items in samples.items():
        if not items:
            continue
        print(f"\n[{k}] 샘플:")
        for it in items:
            print(f"  - {it['nm']} (score={it['score']}, last={it['last']})")
            print(f"      {' / '.join(it['reasons'])}")

    if args.apply:
        # 가드: 빈 배열 덮어쓰기 방지
        if not cli:
            print("[ABORT] cli 가 비어 있음 — 저장하지 않음")
            db.close()
            sys.exit(2)
        set_kv(db, "cli", cli)
        db.commit()
        print(f"\n[OK] cli.status 업데이트 완료 ({changed}건 변경)")
    else:
        print("\n[DRY-RUN] DB 변경 없음. 실제 적용은 --apply 옵션을 추가하세요.")

    db.close()


if __name__ == "__main__":
    main()
