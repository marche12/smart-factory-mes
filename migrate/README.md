# 팩플로우 현장 도입 가이드

> 얼마에요2E → 팩플로우 마이그레이션 + 신규 사용자 계정 + NAS 배포 + 태블릿 접속까지 1회에 처리.

---

## 0. 사전 준비

| 항목 | 확인 |
|---|---|
| 얼마에요 운영 PC 또는 `.bak` 백업 파일 위치 | 운영 PC = SSMS 직접 / `.bak` = Mac Docker |
| 얼마에요 SQL Server 접속 정보 | 서버 `192.168.2.36,1511` · DB `NeoHowMuch2` · 계정 `sa` / `iqst63214` |
| 팩플로우 NAS | DSM 7.2+ / SSH 또는 Container Manager 사용 가능 |
| 태블릿/PC | NAS와 같은 네트워크 (Tailscale 도 가능) |
| Python 3.10+ | Mac/Windows 어디서든 — `python3 --version` |
| Python 패키지 | `pip3 install openpyxl` (엑셀 입력시), `pip3 install pymssql` (자동 추출시) |

> NAS 인프라 (Tailscale IP, 외부 도메인, SSH 비번 등) 는 `docs/session-handoff-2026-04-28.json` 의 `infrastructure` 섹션 참조.

---

## Step 1. 데이터 이관 (얼마에요 → 팩플로우)

> 권장 순서: **방법 B** (운영 PC SSMS · 가장 빠르고 안전) → 안되면 방법 C (Mac Docker) → 그것도 안되면 방법 A (DB 직접 fetch).
> 마이그레이션 결과 자체 검증 방법은 §1.5 참조.

### 방법 A: 자동 추출 (얼마에요 SQL Server에 직접 붙음)
```bash
# 얼마에요 서버에 네트워크로 도달 가능한 PC에서
pip3 install pymssql
cd migrate/
python3 01_export_auto.py          # → exported/ 에 CSV 생성
python3 02_import_to_packflow.py   # → 팩플로우 DB 적용
```

### 방법 B: 운영 PC SSMS — 권장 (단가 이력 포함, 10~20분)
1. 얼마에요 운영 Windows PC 에서 SSMS 실행 → `192.168.2.36,1511` / `NeoHowMuch2` / `sa` / `iqst63214` 로 접속.
2. `migrate/01_export_from_almayo.sql` 열기 — 7~8개 SELECT 블록이 보임.
3. 각 SELECT 블록을 차례로 실행 후 `결과 → 다른 이름으로 저장(CSV)` 으로 다음 파일명 그대로 저장:
   - `customers.csv` — 거래처 마스터 (사업자번호·전화·주소·대표자·업태·업종)
   - `items.csv` — 품목 마스터 (코드·이름·기준 단가·재고)
   - `company.csv` — 회사 정보
   - `balances.csv` — 거래처 잔액 (미수/미지급)
   - `price_history.csv` — 품목 거래 단가 이력 (최근 2년)
   - `recent_prices.csv` — 품목별 최근 적용 단가 요약
   - `customer_history.csv` — 거래처별 거래 이력 (선택)
4. CSV 7개를 Mac/팩플로우 측 `migrate/exported/` 폴더에 복사.
5. 팩플로우 측에서 변환·적용:
   ```bash
   cd migrate/
   pip3 install openpyxl    # 엑셀 입력 시에만 필요. CSV 만이면 생략 가능
   python3 02_import_to_packflow.py
   ```

이 경로로 거래처에 사업자번호·전화·주소가, 품목에 기준단가·최근 적용단가가, `priceHistory` 에 거래 단가 이력이 채워집니다.

### 방법 C: Mac Docker SQL Server (`.bak` 백업파일 → 복원 → 추출, 30~60분)
운영 PC 에 접근이 안 되고 `.bak` 만 있을 때:

```bash
# 1) Apple Silicon 호환 SQL Server 이미지 기동
docker run -e ACCEPT_EULA=Y -e SA_PASSWORD='Strong!Pwd123' \
  -p 1433:1433 \
  -v "$HOME/Documents/팩플로우/얼마에요2E/database/Backup:/var/opt/mssql/backup" \
  -d --name mssql mcr.microsoft.com/azure-sql-edge:latest

# 2) 가장 최신 .bak 한 개 복원 (예시)
docker exec -i mssql /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'Strong!Pwd123' -Q "
  RESTORE DATABASE NeoHowMuch2
  FROM DISK='/var/opt/mssql/backup/3XBPBL-CP0F5Z-KWDUKU_13.bak'
  WITH MOVE 'NeoHowMuch2_Data' TO '/var/opt/mssql/data/NeoHowMuch2.mdf',
       MOVE 'NeoHowMuch2_Log'  TO '/var/opt/mssql/data/NeoHowMuch2_log.ldf',
       REPLACE;"

# 3) DBeaver/Azure Data Studio 등으로 localhost:1433 접속 → 01_export_from_almayo.sql 실행 → CSV 7개 저장
# 4) migrate/exported/ 에 복사 → python3 02_import_to_packflow.py
```

### 방법 D: 직접 입력 (소량 거래처/품목만)
```bash
cd migrate/
python3 02_import_to_packflow.py --manual
```

### 1.5. 이관 결과 자체 검증
이관 직후 반드시 한 번:

```bash
# Mac 또는 NAS 어디서든 (DB 경로만 바꾸면 됨)
sqlite3 data/mes.db <<'SQL'
SELECT key, length(value) AS bytes,
       (length(value) - length(replace(value,'_src','')))/4 AS almayo_marker_count
  FROM data_store
 WHERE key IN ('ino_cli','ino_prod','ino_priceHistory','ino_co')
 ORDER BY key;
SQL
```

기대값:
- `ino_cli` length > 100KB, almayo_marker_count ≈ 거래처 수
- `ino_prod` length > 500KB, almayo_marker_count ≈ 품목 수
- `ino_priceHistory` 존재 + 최대 2000건
- `ino_co` 존재 (회사 정보 1건)

또한 팩플로우 화면에서 :
- 기초정보 > 거래처 → 사업자번호/전화/주소가 채워진 행이 다수
- 기초정보 > 품목 → '최근 단가' 컬럼이 비어있지 않은 행이 다수
- 모바일 품목·단가 탭 → "최근(매출): 12500원 · 04-25 ○○패키지" 같은 힌트 표시

이 셋 중 하나라도 비어있으면 §1.6 트러블슈팅으로.

### 1.6. 자주 보는 이관 오류
| 증상 | 원인 | 해결 |
|---|---|---|
| `이미 이관된 데이터가 있습니다` 프롬프트 | 직전 이관 시도 흔적 (`_src='almayo'`) | `y` 입력 — 기존 almayo 데이터만 제거 후 재이관 (수동 입력분은 보존) |
| `openpyxl 설치 필요` | 엑셀 입력 모드인데 패키지 없음 | `pip3 install openpyxl` 후 재실행 |
| `거래처 이름이 비어있는 행 발견` | CSV 첫 행이 헤더가 아님 | SSMS 에서 `결과 → 다른 이름으로 저장` 시 "포함: 머리글" 옵션 켜기 |
| 거래처 1457 인데 사업자번호 0 | 옛 마이그레이션이 잔액 SQL 만 사용 | `migrate/01_export_from_almayo.sql` 의 1번 블록 (Customer 마스터) 다시 실행 후 재이관 |
| 단가 이력 0 건 | `price_history.csv` 누락 또는 헤더 깨짐 | SSMS 5번 블록 재실행 + UTF-8 BOM 인코딩 확인 |

> 데이터 사고 시: `docs/deploy-runbook.md` §4 의 DB 롤백 절차 — 직전 백업으로 즉시 복원 가능.

---

## Step 2. 사용자 계정 생성

```bash
cd migrate/
# 03_setup_users.py 파일을 열어 실제 이름/아이디/비번/권한 수정
python3 03_setup_users.py
```

권한 모델 (운영자 = `admin`):
- `admin` — 전체 메뉴 + 백업/복원/시스템 설정
- `staff` 또는 `office` — 견적·수주·출고·매출 등 일반 데이터 입출력
- `worker` — 모바일 위주, 공정 실적 입력만 (일반 `/api/data` 쓰기 막힘)
- `viewer` (대표·영업) — 모바일 4탭 조회 전용

> 자세한 권한 가드는 `docs/manual-qa-checklist.md` §1 참조.

---

## Step 3. NAS 배포

### 3.1. 신규 설치 (NAS 처음 셋업)
- **빠른 설치** : `docs/nas-quick-install.md` (1장짜리)
- **자세한 설치** : `docs/synology-nas-install.md`
- **Tailscale + 자동 배포** : `docs/deploy-runbook.md` (운영 진입 후 표준)

### 3.2. 이관 후 1회 — 데이터 동기화
이관 작업을 Mac에서 했다면 결과 DB를 NAS에 올려야 함. 두 가지 방법:

**(a) Mac에서 직접 sqlite 변환·전송** (권장)
```bash
# Mac
scp data/mes.db inno@100.74.217.19:/volume1/homes/apps/packflow/data/mes.db.imported
ssh inno@100.74.217.19 'cd /volume1/homes/apps/packflow && \
  cp -p data/mes.db data/mes.db.before-import-$(date +%Y%m%d-%H%M) && \
  pkill -f "python3 server.py"; sleep 3; \
  cp -p data/mes.db.imported data/mes.db && \
  ( setsid bash -c "sleep 2; cd \"$PWD\"; exec nohup python3 server.py </dev/null >>server.log 2>&1" </dev/null >/dev/null 2>&1 & ) </dev/null >/dev/null 2>&1 &
  disown; sleep 8; \
  curl -sS -o /dev/null -w "code=%{http_code}\n" http://127.0.0.1:8080/m'
```

**(b) NAS 위에서 직접 이관** (NAS 가 인터넷 접근 가능할 때)
```bash
ssh inno@100.74.217.19
cd /volume1/homes/apps/packflow/migrate
# CSV 7개를 NAS exported/ 에 업로드 (File Station 또는 scp)
python3 02_import_to_packflow.py
```

> 이관 직전 백업 (자동 + 수동) 은 `docs/deploy-runbook.md` §1.4 참고.

---

## Step 4. 태블릿/모바일 접속

- 같은 WiFi: `http://NAS-IP:8080`  (예: `http://192.168.0.2:8080`)
- 외부 / Tailscale: `http://100.74.217.19:8080` 또는 `https://packflow.mckim.i234.me`
- Safari/Chrome 에서 "홈 화면에 추가" → 앱처럼 사용 (PWA)

모바일 4탭 — 생산현황 / 작업지시 / 거래처 / 품목·단가 (대표·영업 외부 조회용).

---

## Step 5. 운영 투입 전 마지막 점검

`docs/manual-qa-checklist.md` 의 **블로커 4개** 가 모두 ⏳ → ✅ 가 됐는지 확인:

1. `static/index.html` 의 `autoLoginForTesting` 블록 제거 (보안)
2. DSM Let's Encrypt 인증서 발급 (외부 HTTPS 경고 제거)
3. `nas-watchdog.sh` DSM 등록 (5분 간격) — `docs/deploy-runbook.md` §5.5
4. `nas-auto-backup.sh` DSM 등록 (매일 03:00) — `docs/deploy-runbook.md` §5.2

---

## 부록 A. 마이그레이션 파일 한눈에

| 파일 | 역할 |
|---|---|
| `01_export_from_almayo.sql` | 얼마에요 NeoHowMuch2 스키마(`Customer`, `Item`, `Slip`, `SlipDetail` …) 기반 7~8개 SELECT |
| `01_export_auto.py` | pymssql 로 SQL Server 에 직접 붙어 위 SELECT 들을 자동 실행 + CSV 저장 |
| `02_import_to_packflow.py` | CSV/엑셀 읽어 팩플로우 `data_store` (cli/prod/co/priceHistory) 로 변환·저장 |
| `03_setup_users.py` | 사용자 계정 + 권한 일괄 등록 |
| `export_almayo_win.bat` | Windows 운영 PC 에서 자동 추출용 배치 |
| `exported/` | CSV 입력 폴더 (비어있음) |

## 부록 B. 핵심 KV 키

이관 결과는 SQLite `data_store` 테이블에 다음 키로 저장됩니다:

| 키 | 내용 | 형태 |
|---|---|---|
| `ino_cli` | 거래처 배열 | JSON `[{nm, bizNo, ceo, addr, tel, …}, …]` |
| `ino_prod` | 품목 배열 | JSON `[{nm, code, spec, price, lastPrice, lastPriceDt, lastPriceCustomer, …}, …]` |
| `ino_co` | 회사 정보 | JSON `{nm, bizNo, ceo, addr, …}` |
| `ino_priceHistory` | 단가 이력 (최대 2000건) | JSON `[{dt, refNo, cliNm, prodNm, qty, unitPrice, source:'almayo'}, …]` |

이관된 행은 모두 `_src: 'almayo'` 마커가 붙어 재이관 시 정확히 그 부분만 교체됩니다.

> 핵심 가드: `static/js/core.js` 의 `GUARDED_KEYS` 가 위 4개 키를 빈 배열로 덮어쓰는 시도를 차단합니다 (2026-04-28 데이터 사고 방지). 자세한 내용은 `docs/session-handoff-2026-04-28.json` 의 `critical_guards_and_rules`.
