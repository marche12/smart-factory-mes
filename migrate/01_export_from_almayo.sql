-- ============================================================
-- 얼마에요2E → 팩플로우 데이터 내보내기
--
-- 실행 방법:
-- 1. 얼마에요가 설치된 Windows PC에서 실행
-- 2. SSMS(SQL Server Management Studio) 또는 sqlcmd 사용
-- 3. 결과를 CSV로 저장
--
-- 서버: 192.168.2.36,1511
-- DB: NeoHowMuch2
-- 계정: sa / iqst63214
-- ============================================================

-- === 1. 거래처 내보내기 ===
-- 결과를 customers.csv로 저장
SELECT
    c.Id,
    c.Name AS nm,
    c.RegistrationNumber AS bizNo,
    c.RepresentativeName AS ceo,
    c.BusinessCategory AS bizType,
    c.BusinessItem AS bizClass,
    c.Address AS addr,
    c.PhoneNumber AS tel,
    c.FaxNumber AS fax,
    c.Email AS email,
    ct.Name AS customerType,
    c.Note AS note,
    con.Name AS contactNm,
    con.PhoneNumber AS contactTel,
    con.Email AS contactEmail
FROM Customer c
LEFT JOIN CustomerType ct ON c.CustomerTypeId = ct.Id
LEFT JOIN Contact con ON c.Id = con.CustomerId
WHERE c.GroupId = (SELECT TOP 1 Id FROM [Group])
ORDER BY c.Name;

-- === 2. 품목 내보내기 ===
-- 결과를 items.csv로 저장
SELECT
    i.Id,
    i.Code AS code,
    i.Name AS nm,
    i.Standard AS spec,
    i.UnitPrice AS price,
    i.CurrentStock AS stock,
    i.OpeningStock AS openStock,
    i.OpeningStockUnitPrice AS openPrice,
    ir.Name AS rank,
    i.Barcode AS barcode,
    i.Note AS note
FROM Item i
LEFT JOIN ItemRank ir ON i.ItemRankId = ir.Id
WHERE i.GroupId = (SELECT TOP 1 Id FROM [Group])
ORDER BY i.Name;

-- === 3. 회사정보 내보내기 ===
-- 결과를 company.csv로 저장
SELECT
    g.Name AS nm,
    g.RegistrationNumber AS bizNo,
    g.RepresentativeName AS ceo,
    g.BusinessCategory AS bizType,
    g.BusinessItem AS bizClass,
    g.Address AS addr,
    g.PhoneNumber AS tel,
    g.FaxNumber AS fax
FROM [Group] g;

-- === 4. 거래처별 잔액 (외상/미수 현황) ===
-- 결과를 balances.csv로 저장
SELECT
    b.Name AS bookNm,
    b.Balance AS balance,
    c.Name AS customerNm
FROM Book b
LEFT JOIN Customer c ON b.CustomerId = c.Id
WHERE b.GroupId = (SELECT TOP 1 Id FROM [Group])
  AND b.Balance <> 0
ORDER BY b.Balance DESC;
