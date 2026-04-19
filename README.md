# 팩플로우 (PackFlow)

> 패키지 제조업을 위한 견적-수주-작업지시-외주-출고-정산 운영 시스템  
> 얼마에요2E의 거래처/회계 구조를 참고해 만든 가벼운 웹 기반 패키지 공장 관리 도구

![Stack](https://img.shields.io/badge/stack-FastAPI%20%7C%20SQLite%20%7C%20Vanilla%20JS-1E3A5F)
![PWA](https://img.shields.io/badge/PWA-ready-success)
![Deploy](https://img.shields.io/badge/deploy-Synology%20NAS-blue)

---

## 📋 개요

팩플로우는 포장재 제조 공장을 위해 만든 **패키지 제조 전용 운영 시스템**입니다.

- **패키지 견적** — 견적가, 단가, 마진, 반복 견적 이력 관리
- **수주 / 작업지시** — 수주 전환, 작업지시, 공정 진행, 협력사/외주 연결
- **자재 / 입고 / 재고** — 발주, 입고, BOM, 재고 흐름 관리
- **출고 / 정산** — 출고, 매출, 세금계산서, 미수/자금 흐름 관리
- **품질 / 설비** — 검사, 불량 분석, 설비 이력

핵심 목표는 `견적 → 수주 → 작업지시 → 외주 → 출고 → 정산` 흐름을 한 시스템 안에서 끊기지 않게 운영하는 것입니다.

---

## 🏗️ 기술 스택

| 계층 | 기술 |
|------|------|
| 백엔드 | Python 3.8+ / FastAPI / Uvicorn |
| 데이터베이스 | SQLite (KV 저장소 구조) |
| 프론트엔드 | Vanilla JavaScript (SPA) |
| 인증 | JWT + bcrypt |
| 배포 | Docker / Synology NAS |

### 의존성
```
fastapi
uvicorn
python-multipart
aiofiles
PyJWT
bcrypt
```

---

## 🚀 실행 방법

### 로컬 개발
```bash
git clone https://github.com/marche12/smart-factory-mes.git
cd smart-factory-mes
pip install -r requirements.txt
python3 server.py
```
→ http://localhost:8080 접속

### 핵심 흐름 검증
```bash
node scripts/verify_packflow_flows.js
```
견적-수주-작업지시, 입고-재고-매입, 출고-매출-세금계산서, 다품목 수주/외주 동기화 정합성을 한 번에 점검합니다.

### 수동 QA
```bash
cat docs/manual-qa-checklist.md
```
역할별 권한, UI 동선, 충돌 처리, 패키지 제조 반복주문 흐름까지 수동으로 점검할 수 있습니다.

### Docker
```bash
docker-compose up -d
```

### Synology NAS (시놀로지)
상세 가이드: [docs/synology-nas-install.md](docs/synology-nas-install.md)

```bash
# SSH 접속 후
cd /volume1/homes/apps/packflow
python3 -m pip install --user -r requirements.txt
nohup python3 server.py > server.log 2>&1 &
```

---

## 📁 프로젝트 구조

```
팩플로우/
├── server.py              # FastAPI 서버 메인
├── database.py            # SQLite DB 관리
├── requirements.txt       # Python 의존성
├── Dockerfile             # Docker 이미지
├── docker-compose.yml     # Docker 컴포즈
│
├── static/                # 프론트엔드
│   ├── index.html         # SPA 메인 (131KB)
│   ├── manifest.json      # PWA 매니페스트
│   ├── sw.js              # Service Worker
│   ├── css/style.css
│   └── js/
│       ├── core.js          # 전역 DB API, 라우팅
│       ├── mes-wo.js        # 작업지시서 (1840줄)
│       ├── mes-plan.js      # 생산계획/재고 (2244줄)
│       ├── mes-ship.js      # 출고 (1677줄)
│       ├── mes-dash.js      # 대시보드
│       ├── mes-cli.js       # 거래처
│       ├── mes-settings.js  # 설정/공통
│       ├── erp-account.js   # 매출/매입/세금계산서
│       ├── erp-purchase.js  # 발주/입고
│       ├── erp-quality.js   # 품질관리
│       └── features-ext.js  # 확장 모듈 (1782줄)
│
├── data/                  # 데이터 (Git 제외)
│   ├── mes.db             # SQLite DB
│   └── backup/            # 자동 백업
│
├── docs/                  # 문서
├── migrate/               # 얼마에요2E → 팩플로우 이관
└── scripts/               # 유틸리티
```

---

## 💾 데이터 구조 (Key-Value)

팩플로우는 `data_store (key TEXT, value JSON)` 단일 테이블을 사용합니다.

| 키 | 내용 |
|---|------|
| `ino_companies` | 두 회사 정보 (Group 구조) |
| `ino_users` | 사용자 계정 |
| `ino_co` | 회사 정보 (레거시) |
| `ino_cli` | 거래처 |
| `ino_prod` | 품목 |
| `ino_mold` | 목형 |
| `ino_wo` | 작업지시서 |
| `ino_shipLog` | 출고이력 |
| `ino_sales` | 매출 |
| `ino_purchase` | 매입 |
| `ino_taxInvoice` | 세금계산서 |
| `ino_stockLog` | 재고 이력 |
| `ino_changeLog` | 변경 이력 (얼마에요 EntityLog 패턴) |
| `ino_popbillConfig` | 팝빌 API 설정 |

---

## 🏢 두 회사 통합 운영 구조

얼마에요2E의 **GroupId 패턴**을 그대로 차용했습니다.

```
공정/재고/거래처 → 공유 (GroupId 없음)
    ↓
매출/매입 발생 시
    ↓
매출 레코드에 companyId 태그
  ├─ "A" → 개인사업자 (이노패키지)
  └─ "B" → 법인 (주식회사 이노패키지)
```

### 상단 토글로 회사별 필터링
```
[전체 ALL] [이노패키지] [주식회사 이노패키지]
```
- **매출/매입/세금계산서 탭**: 회사별 분리
- **공정/재고/출고 탭**: 통합 표시

---

## 🧾 수정세금계산서 (얼마에요 TaxBook 구조)

국세청 CodeCategory 203 표준 6가지 사유코드를 적용했습니다.

| 코드 | 사유 |
|------|------|
| 1 | 환입 |
| 2 | 계약의 해제 |
| 3 | 공급가액의 변동 |
| 4 | 기재사항의 착오 정정 |
| 5 | 내국신용장 사후 개설 |
| 6 | 착오에 의한 이중 발급 |

### 처리 로직
```
원본 매출 (isAmended=true)
    +
부의(-) 레코드 (isAdditionalAmended=true)
    +
신규 매출 (amendedOriginalId 참조)
```
→ 원본 보존 + 홈택스 규정 준수

---

## 🔗 외부 연동

- 팝빌 같은 외부 전자세금계산서 연동은 선택적으로 붙일 수 있습니다.
- 현재 기본 제품 범위는 내부 운영 흐름 고정에 맞춰져 있고, 외부 연동은 운영 환경에 맞게 나중에 연결하는 구조를 권장합니다.

---

## 🔄 배포 & 업데이트

### 맥 → NAS 직접 배포 (빠름)
```bash
./update-nas.sh
```
- NAS 마운트 후 rsync로 파일 동기화
- SSH로 서버 자동 재시작

### Git 자동 배포 (매일 밤 12시)
```bash
git add .
git commit -m "수정내용"
git push
```
- NAS 작업 스케줄러가 매일 자정 GitHub 체크
- 새 커밋 있으면 자동 pull + 재시작
- 로그: `/volume1/homes/apps/packflow/deploy.log`

### 자동 배포 스크립트
- `update-nas.sh` — 맥에서 NAS로 rsync 동기화
- `git-auto-deploy.sh` — NAS에서 GitHub 자동 pull
- `start-packflow.sh` — 부팅 시 자동 시작

---

## 📊 얼마에요2E 데이터 이관

기존 얼마에요2E(MS SQL Server) 데이터를 팩플로우로 이관 가능.

```bash
cd migrate/
python3 01_export_auto.py       # SQL Server에서 CSV 추출
python3 02_import_to_packflow.py # 팩플로우 SQLite로 import
python3 03_setup_users.py        # 사용자 계정 일괄 생성
```

**이관된 데이터:**
- 거래처 1,457건
- 품목 7,459건  
- 목형 659건

---

## 🔐 보안 & 백업

### JWT 인증
- 기본 토큰 만료: 15분
- 리프레시 토큰: 30일
- 비밀번호 해싱: bcrypt

### 자동 백업
- 매일 자정 `data/backup/` 에 전체 DB 백업
- 30일 보관 후 자동 삭제
- DSM 작업 스케줄러로 NAS 외부 백업도 권장

### 감사 로그
모든 주요 작업(로그인, 수정, 삭제, 발행 등)이 `audit_log` 테이블에 기록됩니다.

---

## 🛠️ 개발 가이드

### 코드 스타일
- **짧은 변수명** — `r`, `c`, `cid` 등 (기존 코드 관례)
- **한글 주석 허용**
- **인라인 스타일 → CSS 클래스로 점진 마이그레이션** (진행 중)
- **Vanilla JS** — 외부 프레임워크 없음

### DB 접근 (프론트엔드)
```javascript
var sales = DB.g('sales');       // 배열 조회
DB.s('sales', sales);            // 배열 저장
var co = DB.g1('co');            // 단일 객체 조회
DB.s1('co', co);                 // 단일 객체 저장
```

### 새 모듈 추가
1. `static/js/새모듈.js` 생성
2. `static/index.html`에 `<script>` 태그 추가
3. `static/js/core.js`의 `MR[]` 라우팅 테이블에 등록
4. 사이드바에 `<button class="sb-item" data-mod="...">` 추가

---

## 📱 PWA 지원

- 홈 화면 추가 가능 (iOS/Android)
- 서비스 워커로 오프라인 캐싱
- 앱 아이콘: `static/icon-192.png`, `static/icon-512.png`

---

## 🌐 접속 정보 (운영 환경)

| 항목 | 값 |
|------|------|
| 도메인 | http://inno.local:8080 |
| IP 직접 | http://192.168.0.2:8080 |
| NAS | Synology DS218play |
| 경로 | `/volume1/homes/apps/packflow` |

기본 로그인:
- 사용자: 관리자
- 비밀번호: 1234 (초기 설정 — 변경 권장)

---

## 📚 주요 문서

- [사용 설명서](docs/user-guide.html)
- [DB 스키마](docs/db-schema.sql)
- [시놀로지 NAS 설치](docs/synology-nas-install.md)
- [이관 가이드](migrate/README.md)

---

## 📝 변경 이력

### v1.3 (2026-04-16)
- 얼마에요 GroupId 구조 기반 **다중 회사 지원**
- 두 법인(개인/법인) 매출/매입 분리
- 상단 회사 토글 UI
- 시놀로지 NAS 배포 완료

### v1.2
- 얼마에요 구조 참고 **전면 연동 + 반응형 개선**
- 생산현황 대시보드 차트 교체 (SVG→CSS)
- 수정세금계산서 발행
- 출고 시 거래처 변경 (방안 A)

### v1.1
- 팝빌 전자세금계산서 발행 연동
- 홈택스 일괄업로드 CSV 내보내기
- JWT 인증 + 감사 로그

### v1.0
- 초기 릴리스

---

## 📄 라이선스

내부 사용 전용 (Private)

---

## 🙋 문의

- 개발: Claude + Shoon
- 저장소: https://github.com/marche12/smart-factory-mes
