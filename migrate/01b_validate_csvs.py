#!/usr/bin/env python3
"""
얼마에요에서 추출한 7개 CSV 검증 도구.

사용법:
    python3 01b_validate_csvs.py
    python3 01b_validate_csvs.py --dir /path/to/csv-folder

검증 항목:
  - 7개 파일 존재 여부
  - UTF-8(BOM 허용) 인코딩
  - 필수 헤더 컬럼 존재
  - 행 수 (0건이면 경고, 1건이면 PASS, N건 표시)
  - 샘플 1행 미리보기
  - 중복키 가능성(거래처명/품목명/사업자번호) 즉시 카운트
  - price_history.csv 의 IoCode 분포(매출/매입 비율)
"""
import csv
import os
import sys
from collections import Counter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DIR = os.path.join(SCRIPT_DIR, "exported")

# (filename, required_headers, optional_headers, label)
EXPECTED = [
    (
        "customers.csv",
        ["nm"],
        ["bizNo", "ceo", "bizType", "bizClass", "addr", "tel", "handphone",
         "hometel", "email", "zipcode", "note", "memo", "customerType",
         "bookNo", "bookId"],
        "거래처",
    ),
    (
        "items.csv",
        ["nm"],
        ["code", "spec", "price", "stock", "openStock", "openPrice",
         "barcode", "note", "rank", "unit"],
        "품목",
    ),
    (
        "company.csv",
        ["nm"],
        ["bizNo", "ceo", "bizType", "bizClass", "addr", "tel", "fax"],
        "회사정보",
    ),
    (
        "balances.csv",
        ["customerNm", "balance"],
        ["bizNo", "bookNm"],
        "거래처 잔액",
    ),
    (
        "price_history.csv",
        ["itemNm", "price"],
        ["ItemId", "itemCode", "qty", "amount", "dt", "ioCode",
         "customerNm", "customerBizNo", "memo"],
        "단가 이력",
    ),
    (
        "recent_prices.csv",
        ["itemNm", "recentPrice"],
        ["ItemId", "itemCode", "recentQty", "recentDt", "recentCustomer"],
        "품목별 최근 단가",
    ),
    (
        "customer_history.csv",
        ["customerNm", "dt"],
        ["customerBizNo", "ioCode", "amount", "slipNo", "note"],
        "거래처 거래 이력",
    ),
]


class Result:
    def __init__(self, name):
        self.name = name
        self.exists = False
        self.rows = 0
        self.missing_required = []
        self.missing_optional = []
        self.sample = None
        self.notes = []
        self.error = None


def validate_file(folder, fname, required, optional, label):
    r = Result(fname)
    path = os.path.join(folder, fname)
    if not os.path.isfile(path):
        return r
    r.exists = True

    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []
            headers_lower = {h.strip().lower() for h in headers}

            for col in required:
                if col.lower() not in headers_lower:
                    r.missing_required.append(col)
            for col in optional:
                if col.lower() not in headers_lower:
                    r.missing_optional.append(col)

            rows = list(reader)
            r.rows = len(rows)
            if rows:
                r.sample = {
                    k: (str(v)[:40] + "…" if v and len(str(v)) > 40 else v)
                    for k, v in list(rows[0].items())[:8]
                }
            if fname == "customers.csv":
                names = [(row.get("nm") or "").strip() for row in rows]
                dup_nm = sum(1 for _, c in Counter(names).items() if c > 1 and _)
                empty_nm = sum(1 for n in names if not n)
                r.notes.append(f"중복 상호: {dup_nm}건 / 빈 상호: {empty_nm}건")
                bizno_set = {(row.get("bizNo") or "").strip() for row in rows}
                bizno_set.discard("")
                r.notes.append(f"고유 사업자번호: {len(bizno_set)}건")
            elif fname == "items.csv":
                names = [(row.get("nm") or "").strip() for row in rows]
                dup_nm = sum(1 for _, c in Counter(names).items() if c > 1 and _)
                empty_nm = sum(1 for n in names if not n)
                no_price = sum(1 for row in rows if not (row.get("price") or "").strip()
                               or (row.get("price") or "").strip() in ("0", "0.0"))
                r.notes.append(f"중복 품명: {dup_nm}건 / 빈 품명: {empty_nm}건 / 단가 0원: {no_price}건")
            elif fname == "price_history.csv":
                io_counter = Counter((row.get("ioCode") or "").strip() for row in rows)
                io_summary = ", ".join(
                    f"{k or '∅'}={v}" for k, v in io_counter.most_common()
                )
                r.notes.append(f"IoCode 분포: {io_summary}")
                empty_dt = sum(1 for row in rows if not (row.get("dt") or "").strip())
                r.notes.append(f"날짜 빈값: {empty_dt}건")
            elif fname == "recent_prices.csv":
                no_cust = sum(1 for row in rows if not (row.get("recentCustomer") or "").strip())
                r.notes.append(f"최근 거래처 빈값: {no_cust}건")
            elif fname == "balances.csv":
                pos = sum(1 for row in rows if _safe_float(row.get("balance")) > 0)
                neg = sum(1 for row in rows if _safe_float(row.get("balance")) < 0)
                r.notes.append(f"미수(+): {pos}건 / 미지급(-): {neg}건")

    except UnicodeDecodeError as e:
        r.error = f"인코딩 오류 (UTF-8 아님): {e}"
    except Exception as e:
        r.error = f"읽기 실패: {e}"

    return r


def _safe_float(v):
    try:
        return float((v or "0").replace(",", ""))
    except (ValueError, TypeError, AttributeError):
        return 0.0


def main():
    folder = DEFAULT_DIR
    args = sys.argv[1:]
    if "--dir" in args:
        idx = args.index("--dir")
        if idx + 1 < len(args):
            folder = os.path.abspath(args[idx + 1])

    if not os.path.isdir(folder):
        print(f"[ERROR] 폴더 없음: {folder}")
        print("        먼저 migrate/exported/ 폴더를 만들고 CSV 7개를 넣어주세요.")
        sys.exit(2)

    print(f"검증 대상 폴더: {folder}\n")

    pass_cnt, warn_cnt, fail_cnt = 0, 0, 0
    for fname, required, optional, label in EXPECTED:
        r = validate_file(folder, fname, required, optional, label)
        status = "[PASS]"
        if not r.exists:
            status = "[FAIL]"
            fail_cnt += 1
        elif r.error:
            status = "[FAIL]"
            fail_cnt += 1
        elif r.missing_required:
            status = "[FAIL]"
            fail_cnt += 1
        elif r.rows == 0:
            status = "[WARN]"
            warn_cnt += 1
        elif r.missing_optional:
            status = "[WARN]"
            warn_cnt += 1
        else:
            pass_cnt += 1

        print(f"{status} {fname} ({label})")
        if not r.exists:
            print("    파일 없음")
        else:
            print(f"    행 수: {r.rows}")
            if r.error:
                print(f"    오류: {r.error}")
            if r.missing_required:
                print(f"    필수 컬럼 누락: {', '.join(r.missing_required)}")
            if r.missing_optional:
                print(f"    선택 컬럼 누락: {', '.join(r.missing_optional[:5])}"
                      f"{' …' if len(r.missing_optional) > 5 else ''}")
            for n in r.notes:
                print(f"    · {n}")
            if r.sample:
                preview = ", ".join(f"{k}={v}" for k, v in r.sample.items())
                print(f"    샘플: {preview}")
        print()

    total = pass_cnt + warn_cnt + fail_cnt
    print("=" * 50)
    print(f"  결과: PASS {pass_cnt} / WARN {warn_cnt} / FAIL {fail_cnt}  (총 {total})")
    print("=" * 50)
    if fail_cnt:
        print("\nFAIL 이 있으면 02_import_to_packflow.py 실행 전에 SQL 재추출 권장.")
        sys.exit(1)
    if warn_cnt:
        print("\nWARN 만 있으면 진행 가능. 중복/빈값은 02 스크립트가 알아서 처리.")
    sys.exit(0)


if __name__ == "__main__":
    main()
