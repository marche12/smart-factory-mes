#!/usr/bin/env python3
"""
얼마에요2E SQL Server에서 직접 데이터를 추출하는 스크립트.

사전 설치 필요:
  pip install pymssql

얼마에요 DB 서버(192.168.2.36:1511)에 네트워크 접근이 가능해야 합니다.
같은 사내 네트워크에서 실행하세요.
"""
import csv
import os
import sys

try:
    import pymssql
except ImportError:
    print("pymssql 설치 필요: pip install pymssql")
    sys.exit(1)

# 얼마에요2E DB 접속 정보 (NeoHowMuch2.Data.dll.config 에서 추출)
DB_HOST = "192.168.2.36"
DB_PORT = 1511
DB_NAME = "NeoHowMuch2"
DB_USER = "sa"
DB_PASS = "iqst63214"

OUT_DIR = os.path.join(os.path.dirname(__file__), "exported")
os.makedirs(OUT_DIR, exist_ok=True)


def export_query(conn, filename, query, headers):
    """쿼리 실행 후 CSV로 저장"""
    cursor = conn.cursor()
    cursor.execute(query)
    rows = cursor.fetchall()
    path = os.path.join(OUT_DIR, filename)
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
    print(f"  {filename}: {len(rows)}건 저장")
    return len(rows)


def main():
    print(f"얼마에요2E 데이터 추출 시작")
    print(f"  서버: {DB_HOST}:{DB_PORT}")
    print(f"  DB: {DB_NAME}")
    print()

    try:
        conn = pymssql.connect(
            server=DB_HOST, port=DB_PORT,
            user=DB_USER, password=DB_PASS,
            database=DB_NAME, charset="utf8"
        )
        print("DB 연결 성공!")
    except Exception as e:
        print(f"DB 연결 실패: {e}")
        print("얼마에요 서버(192.168.2.36)에 네트워크 접근이 가능한지 확인하세요.")
        sys.exit(1)

    # 1. 거래처
    export_query(conn, "customers.csv", """
        SELECT
            c.Id, c.Name, c.RegistrationNumber,
            c.RepresentativeName, c.BusinessCategory, c.BusinessItem,
            c.Address, c.PhoneNumber, c.FaxNumber, c.Email,
            ct.Name AS CustomerType, c.Note,
            con.Name AS ContactName, con.PhoneNumber AS ContactPhone
        FROM Customer c
        LEFT JOIN CustomerType ct ON c.CustomerTypeId = ct.Id
        LEFT JOIN (
            SELECT CustomerId, MIN(Id) AS MinId
            FROM Contact GROUP BY CustomerId
        ) cm ON c.Id = cm.CustomerId
        LEFT JOIN Contact con ON cm.MinId = con.Id
        WHERE c.GroupId = (SELECT TOP 1 Id FROM [Group])
        ORDER BY c.Name
    """, [
        "id", "nm", "bizNo", "ceo", "bizType", "bizClass",
        "addr", "tel", "fax", "email", "customerType", "note",
        "contactNm", "contactTel"
    ])

    # 2. 품목
    export_query(conn, "items.csv", """
        SELECT
            i.Id, i.Code, i.Name, i.Standard,
            i.UnitPrice, i.CurrentStock,
            i.OpeningStock, i.OpeningStockUnitPrice,
            ir.Name AS Rank, i.Barcode, i.Note
        FROM Item i
        LEFT JOIN ItemRank ir ON i.ItemRankId = ir.Id
        WHERE i.GroupId = (SELECT TOP 1 Id FROM [Group])
        ORDER BY i.Name
    """, [
        "id", "code", "nm", "spec", "price", "stock",
        "openStock", "openPrice", "rank", "barcode", "note"
    ])

    # 3. 회사정보
    export_query(conn, "company.csv", """
        SELECT Name, RegistrationNumber, RepresentativeName,
               BusinessCategory, BusinessItem, Address,
               PhoneNumber, FaxNumber
        FROM [Group]
    """, ["nm", "bizNo", "ceo", "bizType", "bizClass", "addr", "tel", "fax"])

    # 4. 거래처 잔액
    export_query(conn, "balances.csv", """
        SELECT b.Name, b.Balance, c.Name AS CustomerName
        FROM Book b
        LEFT JOIN Customer c ON b.CustomerId = c.Id
        WHERE b.GroupId = (SELECT TOP 1 Id FROM [Group])
          AND b.Balance <> 0
        ORDER BY b.Balance DESC
    """, ["bookNm", "balance", "customerNm"])

    conn.close()
    print(f"\n추출 완료! 파일 위치: {OUT_DIR}/")
    print("다음 단계: python3 02_import_to_packflow.py")


if __name__ == "__main__":
    main()
