-- ============================================================
-- 얼마에요2E (NeoHowMuch2) → 팩플로우 데이터 내보내기
-- ※ 실제 스키마: Customer, Item, Slip, SlipDetail, Book 기반
--
-- 실행 방법:
-- 1. 얼마에요 Windows PC의 SSMS(SQL Server Management Studio) 실행
-- 2. 서버: 192.168.2.36,1511 / DB: NeoHowMuch2 / 계정: sa / iqst63214
-- 3. 아래 8개 SELECT 블록 각각 실행
-- 4. "결과 → 다른 이름으로 저장 (CSV)" → migrate/exported/ 폴더에 저장
--
-- 추출 결과 → migrate/exported/ 폴더에:
--   customers.csv, items.csv, company.csv, balances.csv,
--   price_history.csv, recent_prices.csv, customer_history.csv
-- ============================================================

-- === 1. 거래처 → customers.csv ===
SELECT
    c.CustomerId            AS Id,
    c.CompanyName           AS nm,            -- 상호
    c.BusinessNo            AS bizNo,         -- 사업자번호
    c.Name                  AS ceo,           -- 대표자
    c.UpTae                 AS bizType,       -- 업태
    c.UpJong                AS bizClass,      -- 업종
    (c.Address1 + ' ' + c.Address2) AS addr,  -- 주소
    c.CompanyTelephone      AS tel,           -- 회사 전화
    c.Handphone             AS handphone,     -- 휴대전화
    c.HomeTelephone         AS hometel,
    c.Email                 AS email,
    c.Zipcode               AS zipcode,
    c.Bigo                  AS note,          -- 비고
    c.Memo                  AS memo,
    ct.Name                 AS customerType,
    c.BookNo                AS bookNo,
    c.BookId                AS bookId
FROM Customer c
LEFT JOIN CustomerType ct ON c.CustomerTypeId = ct.CustomerTypeId
ORDER BY c.CompanyName;

-- === 2. 품목 → items.csv ===
SELECT
    i.ItemId                AS Id,
    i.ItemCode              AS code,
    i.Name                  AS nm,
    i.Standard              AS spec,
    i.UnitPrice             AS price,         -- 기준 단가
    i.CurrentStock          AS stock,
    i.OpeningStock          AS openStock,
    i.OpeningStockUnitPrice AS openPrice,
    i.Barcode               AS barcode,
    i.Bigo                  AS note,
    ir.Name                 AS rank,
    i.Unit                  AS unit
FROM Item i
LEFT JOIN ItemRank ir ON i.ItemRankId = ir.ItemRankId
ORDER BY i.Name;

-- === 3. 회사정보 → company.csv ===
SELECT
    g.Name                  AS nm,
    g.BusinessNo            AS bizNo,
    g.RepresentativeName    AS ceo,
    g.UpTae                 AS bizType,
    g.UpJong                AS bizClass,
    g.Address               AS addr,
    g.Telephone             AS tel,
    g.Fax                   AS fax
FROM [Group] g;

-- === 4. 거래처별 잔액 → balances.csv ===
SELECT
    c.CompanyName           AS customerNm,
    c.BusinessNo            AS bizNo,
    c.Balance               AS balance,
    b.BookName              AS bookNm
FROM Customer c
LEFT JOIN Book b ON c.BookId = b.BookId
WHERE c.Balance <> 0
ORDER BY c.Balance DESC;

-- ============================================================
-- 단가 이력 (Slip + SlipDetail 기반)
-- ============================================================

-- === 5. 품목 거래 단가 이력 (전체) → price_history.csv ===
-- 수십만 건 가능 — 최근 2년치만 추출 권장
SELECT
    sd.ItemId,
    sd.ItemName             AS itemNm,
    i.ItemCode              AS itemCode,
    sd.UnitPrice            AS price,
    sd.Quantity             AS qty,
    sd.Amount               AS amount,
    sd.Date                 AS dt,
    s.IoCode                AS ioCode,        -- 1:매출, 2:매입 등
    c.CompanyName           AS customerNm,
    c.BusinessNo            AS customerBizNo,
    sd.Bigo                 AS memo
FROM SlipDetail sd
JOIN Slip s ON sd.SlipId = s.SlipId
LEFT JOIN Item i ON sd.ItemId = i.ItemId
LEFT JOIN Customer c ON sd.BookId = c.BookId
WHERE sd.UnitPrice > 0
  AND sd.ItemId IS NOT NULL
  AND s.Date >= DATEADD(YEAR, -2, GETDATE())   -- 최근 2년 (필요 시 조정)
ORDER BY sd.ItemId, s.Date DESC;

-- === 6. 품목별 최근 적용 단가 (요약) → recent_prices.csv ===
;WITH RankedPrices AS (
    SELECT
        sd.ItemId,
        sd.UnitPrice         AS price,
        sd.Quantity          AS qty,
        sd.Date              AS dt,
        c.CompanyName        AS customerNm,
        ROW_NUMBER() OVER (PARTITION BY sd.ItemId ORDER BY sd.Date DESC) AS rn
    FROM SlipDetail sd
    JOIN Slip s ON sd.SlipId = s.SlipId
    LEFT JOIN Customer c ON sd.BookId = c.BookId
    WHERE sd.UnitPrice > 0
      AND sd.ItemId IS NOT NULL
)
SELECT
    rp.ItemId,
    i.Name                  AS itemNm,
    i.ItemCode              AS itemCode,
    rp.price                AS recentPrice,
    rp.qty                  AS recentQty,
    rp.dt                   AS recentDt,
    rp.customerNm           AS recentCustomer
FROM RankedPrices rp
LEFT JOIN Item i ON rp.ItemId = i.ItemId
WHERE rp.rn = 1
ORDER BY i.Name;

-- === 7. 거래처별 거래 이력 → customer_history.csv ===
SELECT
    c.CompanyName           AS customerNm,
    c.BusinessNo            AS customerBizNo,
    s.Date                  AS dt,
    s.IoCode                AS ioCode,
    s.Price                 AS amount,
    s.SlipNo                AS slipNo,
    s.Bigo                  AS note
FROM Slip s
LEFT JOIN Customer c ON s.BookId = c.BookId
WHERE s.Date >= DATEADD(YEAR, -2, GETDATE())
ORDER BY c.CompanyName, s.Date DESC;

-- ============================================================
-- 참고
-- IoCode 의미: 1=매출, 2=매입, 3=수금, 4=지급, ... (얼마에요 정의 따름)
-- 단가 0인 거래(샘플/무상)는 제외됨
-- ============================================================
