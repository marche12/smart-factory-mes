# 팩플로우 현장 도입 가이드

## Step 1: 데이터 이관 (얼마에요 → 팩플로우)

### 방법 A: 자동 추출 (권장)
```bash
# 얼마에요 서버에 접근 가능한 PC에서
pip install pymssql
python3 01_export_auto.py     # → exported/ 폴더에 CSV 생성
python3 02_import_to_packflow.py  # → 팩플로우 DB에 적용
```

### 방법 B: 수동 SQL (권장 — 단가 이력 포함)
1. Windows에서 SSMS로 `01_export_from_almayo.sql` 열기
2. 7개 SELECT 블록을 각각 실행 후 CSV로 저장:
   - `customers.csv` — 거래처 마스터 (사업자번호·전화·주소·대표자·업태·업종)
   - `items.csv` — 품목 마스터 (코드·이름·기준 단가·재고)
   - `company.csv` — 회사 정보
   - `balances.csv` — 거래처 잔액 (미수/미지급)
   - `price_history.csv` — 품목 거래 단가 이력 (최근 2년)
   - `recent_prices.csv` — 품목별 최근 적용 단가 요약
   - `customer_history.csv` — 거래처별 거래 이력 (선택)
3. CSV 7개를 `migrate/exported/` 폴더에 복사
4. **사전 검증**: `python3 01b_validate_csvs.py`
5. **이관 시뮬레이션**: `python3 02_import_to_packflow.py --dry-run`
6. **실제 이관**: `python3 02_import_to_packflow.py`

거래처에 사업자번호·전화·주소가, 품목에 기준단가·최근 적용단가가, priceHistory에 거래 단가 이력이 채워집니다.

### 매핑 사양 (priceHistory / recent_prices)

| 얼마에요 컬럼 | → 팩플로우 필드 | 비고 |
|---|---|---|
| `SlipDetail.UnitPrice` | `priceHistory[].unitPrice` | int 캐스팅, `>0` 만 |
| `SlipDetail.Quantity` | `priceHistory[].qty` | float |
| `SlipDetail.Amount` | `priceHistory[].amount` | int (없으면 `unit*qty`) |
| `Slip.Date` | `priceHistory[].dt` (앞 10자) / `tm` (앞 16자) | YYYY-MM-DD |
| `Slip.IoCode` (1=매출, 2=매입) | `priceHistory[].refType` (`sale`/`purchase`/`almayo`) | 그 외는 `almayo` |
| `Customer.CompanyName` | `priceHistory[].cliNm` | |
| `Item.Name` | `priceHistory[].prodNm` | |
| `SlipDetail.Bigo` | `priceHistory[].memo` | |
| 고정 | `priceHistory[].source = "almayo"`, `_src = "almayo"` | 재이관 시 식별자 |

- **최대 2000건**: 오래된 순 drop (이미 있는 비-`almayo` 이력은 유지).
- **재이관 안전**: 기존 `_src == "almayo"` 이력만 제거 후 신규로 교체 → 사용자 수기 입력 이력 보존.

| 얼마에요 컬럼 (recent_prices) | → 팩플로우 prod 필드 |
|---|---|
| `recentPrice` | `prod[].lastPrice` (int) |
| `recentDt` | `prod[].lastPriceDt` (YYYY-MM-DD) |
| `recentCustomer` | `prod[].lastPriceCustomer` |

매칭 키: `Item.Name → prod.nm` 우선, 실패 시 `Item.ItemCode → prod.code`.

### 방법 C: 직접 입력
```bash
python3 02_import_to_packflow.py --manual
```

## Step 2: 사용자 계정 생성
```bash
# 03_setup_users.py 파일을 열어 실제 이름/아이디/비번 수정 후
python3 03_setup_users.py
```

## Step 3: NAS 배포
```bash
# docs/synology-nas-install.md 참고
docker-compose up -d --build
```

## Step 4: 태블릿 접속
- 같은 WiFi에서 `http://NAS-IP:8080` 접속
- Safari/Chrome에서 "홈 화면에 추가" → 앱처럼 사용
