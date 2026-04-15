# 팩플로우 현장 도입 가이드

## Step 1: 데이터 이관 (얼마에요 → 팩플로우)

### 방법 A: 자동 추출 (권장)
```bash
# 얼마에요 서버에 접근 가능한 PC에서
pip install pymssql
python3 01_export_auto.py     # → exported/ 폴더에 CSV 생성
python3 02_import_to_packflow.py  # → 팩플로우 DB에 적용
```

### 방법 B: 수동 SQL
1. Windows에서 SSMS로 `01_export_from_almayo.sql` 실행
2. 결과를 `exported/customers.csv`, `exported/items.csv`로 저장
3. `python3 02_import_to_packflow.py` 실행

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
