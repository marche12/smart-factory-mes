@echo off
chcp 65001 >nul
echo ============================================
echo  얼마에요 → 팩플로우 데이터 추출
echo ============================================
echo.

REM === 설정 ===
set SERVER=192.168.2.36,1511
set DB=NeoHowMuch2
set USER=sa
set PASS=iqst63214
set OUTDIR=%~dp0exported

if not exist "%OUTDIR%" mkdir "%OUTDIR%"

echo 거래처 추출 중...
sqlcmd -S %SERVER% -d %DB% -U %USER% -P %PASS% -W -s "," -h -1 -Q "SET NOCOUNT ON; SELECT c.Name, ISNULL(c.RegistrationNumber,''), ISNULL(c.RepresentativeName,''), ISNULL(c.BusinessCategory,''), ISNULL(c.BusinessItem,''), ISNULL(c.Address,''), ISNULL(c.PhoneNumber,''), ISNULL(c.FaxNumber,''), ISNULL(c.Email,''), ISNULL(ct.Name,''), ISNULL(c.Note,'') FROM Customer c LEFT JOIN CustomerType ct ON c.CustomerTypeId = ct.Id WHERE c.GroupId = (SELECT TOP 1 Id FROM [Group]) ORDER BY c.Name" -o "%OUTDIR%\customers.csv"
echo   → customers.csv 저장 완료

echo 품목 추출 중...
sqlcmd -S %SERVER% -d %DB% -U %USER% -P %PASS% -W -s "," -h -1 -Q "SET NOCOUNT ON; SELECT i.Name, ISNULL(i.Code,''), ISNULL(i.Standard,''), ISNULL(CAST(i.UnitPrice AS VARCHAR),'0'), ISNULL(CAST(i.CurrentStock AS VARCHAR),'0'), ISNULL(i.Note,'') FROM Item i WHERE i.GroupId = (SELECT TOP 1 Id FROM [Group]) ORDER BY i.Name" -o "%OUTDIR%\items.csv"
echo   → items.csv 저장 완료

echo 회사정보 추출 중...
sqlcmd -S %SERVER% -d %DB% -U %USER% -P %PASS% -W -s "," -h -1 -Q "SET NOCOUNT ON; SELECT Name, ISNULL(RegistrationNumber,''), ISNULL(RepresentativeName,''), ISNULL(BusinessCategory,''), ISNULL(BusinessItem,''), ISNULL(Address,''), ISNULL(PhoneNumber,''), ISNULL(FaxNumber,'') FROM [Group]" -o "%OUTDIR%\company.csv"
echo   → company.csv 저장 완료

echo.
echo ============================================
echo  추출 완료!
echo  파일 위치: %OUTDIR%
echo.
echo  다음 단계:
echo  1. exported 폴더를 USB 또는 공유폴더로 Mac에 복사
echo  2. Mac에서: python3 02_import_to_packflow.py
echo ============================================
pause
