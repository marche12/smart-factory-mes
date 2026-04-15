-- ============================================
-- 팩플로우 MES 정규화 DB 스키마
-- 얼마에요 DB 구조 참고 + 버그 경험 반영
-- SQLite 호환 (추후 PostgreSQL 전환 가능)
-- ============================================

-- 1. 거래처
CREATE TABLE IF NOT EXISTS clients (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,                     -- 거래처명
    biz_no      TEXT DEFAULT '',                   -- 사업자등록번호
    ceo         TEXT DEFAULT '',                   -- 대표자
    c_type      TEXT DEFAULT 'sales' CHECK(c_type IN ('sales','purchase','both')),  -- 매출/매입/겸용
    is_vendor   INTEGER DEFAULT 0,                 -- 인쇄소 여부 (1=인쇄소)
    addr        TEXT DEFAULT '',                   -- 주소
    tel         TEXT DEFAULT '',                   -- 전화
    fax         TEXT DEFAULT '',                   -- 팩스
    email       TEXT DEFAULT '',                   -- 이메일
    manager     TEXT DEFAULT '',                   -- 담당자
    pay_method  TEXT DEFAULT '',                   -- 결제조건
    note        TEXT DEFAULT '',                   -- 비고
    balance     REAL DEFAULT 0,                    -- 잔액 (미수/미지급)
    status      TEXT DEFAULT 'active' CHECK(status IN ('active','ended')),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 품목
CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT DEFAULT '',                    -- 품목코드
    name        TEXT NOT NULL,                      -- 품목명 (제품명)
    client_id   INTEGER REFERENCES clients(id),     -- 거래처 FK
    client_name TEXT DEFAULT '',                    -- 거래처명 (조회용)
    paper       TEXT DEFAULT '',                    -- 종이
    spec        TEXT DEFAULT '',                    -- 규격
    fabric      TEXT DEFAULT '',                    -- 원단
    fabric_spec TEXT DEFAULT '',                    -- 원단규격
    price       REAL DEFAULT 0,                    -- 단가
    print_spec  TEXT DEFAULT '',                    -- 인쇄사양
    gold        TEXT DEFAULT '',                    -- 금박
    mold_no     TEXT DEFAULT '',                    -- 목형번호
    hand        TEXT DEFAULT '',                    -- 손잡이
    note        TEXT DEFAULT '',                    -- 특이사항
    caution     TEXT DEFAULT '',                    -- 주의사항
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 품목별 기본공정 (품목 등록 시 설정)
CREATE TABLE IF NOT EXISTS product_procs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    seq         INTEGER NOT NULL,                   -- 순서
    proc_name   TEXT NOT NULL,                      -- 공정명
    proc_type   TEXT DEFAULT 'n' CHECK(proc_type IN ('n','out','exc'))  -- 일반/외주/기타
);

-- 4. 목형
CREATE TABLE IF NOT EXISTS molds (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    mold_no     TEXT NOT NULL,                      -- 목형번호
    product_name TEXT DEFAULT '',                   -- 제품명
    client_name TEXT DEFAULT '',                    -- 거래처명
    location    TEXT DEFAULT '',                    -- 보관위치
    status      TEXT DEFAULT '사용중' CHECK(status IN ('사용중','보관중','폐기')),
    note        TEXT DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 작업지시서 (헤더)
CREATE TABLE IF NOT EXISTS work_orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wo_no       TEXT NOT NULL UNIQUE,               -- 지시번호 (WO20260413001)
    order_id    INTEGER,                            -- 수주 FK (NULL 가능)
    client_id   INTEGER REFERENCES clients(id),
    client_name TEXT NOT NULL,
    product_id  INTEGER REFERENCES products(id),
    product_name TEXT NOT NULL,
    vendor_name TEXT DEFAULT '',                    -- 인쇄소명
    manager     TEXT DEFAULT '',                    -- 담당자
    paper       TEXT DEFAULT '',
    spec        TEXT DEFAULT '',
    qm          INTEGER DEFAULT 0,                 -- 정매수량
    qe          INTEGER DEFAULT 0,                 -- 여분수량
    fabric      TEXT DEFAULT '',
    fabric_spec TEXT DEFAULT '',
    fabric_qty  INTEGER DEFAULT 0,
    fabric_extra INTEGER DEFAULT 0,
    print_spec  TEXT DEFAULT '',                    -- 인쇄사양
    mold_no     TEXT DEFAULT '',                    -- 목형번호
    hand        TEXT DEFAULT '',                    -- 손잡이
    fq          INTEGER NOT NULL,                   -- 완제품수량
    ship_date   TEXT NOT NULL,                      -- 출고일
    dlv         TEXT DEFAULT '',                    -- 입고처
    price       REAL DEFAULT 0,                    -- 단가
    amount      REAL DEFAULT 0,                    -- 금액
    note        TEXT DEFAULT '',
    caution     TEXT DEFAULT '',
    image       TEXT DEFAULT '',                    -- 참고이미지 (base64)
    status      TEXT DEFAULT '대기' CHECK(status IN ('대기','진행중','완료대기','완료','출고완료','보류','취소')),
    priority    INTEGER DEFAULT 0,
    wo_date     TEXT,                               -- 작성일
    comp_date   TEXT,                               -- 완료일
    comp_qty    INTEGER DEFAULT 0,                  -- 완료수량
    ship_actual TEXT,                               -- 실제 출고일
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 작업지시서 공정 (★ 핵심: 분리된 테이블)
-- 버그 원인이었던 "공정 상태"를 독립 테이블로 분리
-- curP(), getProcQueue(), pqStart(), doComp()가 이 테이블 하나만 보면 됨
CREATE TABLE IF NOT EXISTS wo_procs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wo_id       INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    seq         INTEGER NOT NULL,                   -- 공정 순서
    proc_name   TEXT NOT NULL,                      -- 공정명 (인쇄/코팅/톰슨 등)
    proc_type   TEXT DEFAULT 'n' CHECK(proc_type IN ('n','out','exc')),
    method      TEXT DEFAULT '',                    -- 방식 (4도, 기계코팅 등)
    vendor      TEXT DEFAULT '',                    -- 업체명
    mold_no     TEXT DEFAULT '',                    -- 목형번호 (톰슨용)
    machine     TEXT DEFAULT '',                    -- 기계 (톰슨1/톰슨2)
    mech_coat   INTEGER DEFAULT 0,                  -- 기계코팅 포함 여부 (인쇄 공정용)
    status      TEXT DEFAULT '대기' CHECK(status IN ('대기','진행중','외주대기','외주진행중','완료','외주완료','스킵','취소')),
    qty         INTEGER DEFAULT 0,                  -- 완료 수량
    defect      INTEGER DEFAULT 0,                  -- 불량 수량
    defect_reason TEXT DEFAULT '',                   -- 불량 사유
    started_at  TEXT,                               -- 시작 시각
    finished_at TEXT,                               -- 완료 시각
    UNIQUE(wo_id, seq)
);

-- ★ 기계코팅 자동 완료 트리거
-- 인쇄 완료 시 같은 WO의 기계코팅 공정을 자동 완료
CREATE TRIGGER IF NOT EXISTS trg_mech_coat_auto
AFTER UPDATE OF status ON wo_procs
WHEN NEW.proc_name = '인쇄' AND (NEW.status = '완료' OR NEW.status = '외주완료') AND NEW.mech_coat = 1
BEGIN
    UPDATE wo_procs
    SET status = '완료', qty = NEW.qty, finished_at = datetime('now','localtime')
    WHERE wo_id = NEW.wo_id AND proc_name = '코팅' AND method = '기계코팅' AND status = '대기';
END;

-- ★ 전체 공정 완료 시 WO 상태 자동 변경
CREATE TRIGGER IF NOT EXISTS trg_wo_complete_check
AFTER UPDATE OF status ON wo_procs
WHEN NEW.status IN ('완료','외주완료','스킵')
BEGIN
    UPDATE work_orders
    SET status = '완료대기',
        comp_date = date('now','localtime'),
        updated_at = datetime('now','localtime')
    WHERE id = NEW.wo_id
    AND status NOT IN ('완료대기','완료','출고완료','취소')
    AND NOT EXISTS (
        SELECT 1 FROM wo_procs
        WHERE wo_id = NEW.wo_id
        AND status NOT IN ('완료','외주완료','스킵','취소')
    );
END;

-- 7. 작업지시서 종이/원단 (다중)
CREATE TABLE IF NOT EXISTS wo_papers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wo_id       INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    paper       TEXT DEFAULT '',
    spec        TEXT DEFAULT '',
    qm          INTEGER DEFAULT 0,
    qe          INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wo_fabrics (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wo_id       INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    fabric      TEXT DEFAULT '',
    fabric_spec TEXT DEFAULT '',
    qty         INTEGER DEFAULT 0,
    extra       INTEGER DEFAULT 0
);

-- 8. 수주
CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no    TEXT NOT NULL,                       -- 수주번호
    order_date  TEXT NOT NULL,
    client_name TEXT NOT NULL,
    product_name TEXT DEFAULT '',
    qty         INTEGER DEFAULT 0,
    price       REAL DEFAULT 0,
    amount      REAL DEFAULT 0,
    due_date    TEXT,                                -- 납기일
    wo_id       INTEGER REFERENCES work_orders(id),  -- 작업지시서 연결
    wo_no       TEXT DEFAULT '',
    status      TEXT DEFAULT '수주' CHECK(status IN ('수주','수주확정','생산중','출고완료','취소')),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. 출고
CREATE TABLE IF NOT EXISTS shipments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wo_id       INTEGER REFERENCES work_orders(id),
    wo_no       TEXT DEFAULT '',
    client_name TEXT DEFAULT '',
    product_name TEXT DEFAULT '',
    qty         INTEGER DEFAULT 0,
    ship_date   TEXT DEFAULT '',
    dlv         TEXT DEFAULT '',                     -- 입고처
    note        TEXT DEFAULT '',
    manager     TEXT DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ★ 출고 시 WO 상태 자동 변경 + 매출 자동 등록
CREATE TRIGGER IF NOT EXISTS trg_ship_complete
AFTER INSERT ON shipments
BEGIN
    UPDATE work_orders
    SET status = '출고완료', ship_actual = NEW.ship_date, updated_at = datetime('now','localtime')
    WHERE id = NEW.wo_id;
END;

-- 10. 매출
CREATE TABLE IF NOT EXISTS sales (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_date   TEXT NOT NULL,
    client_id   INTEGER REFERENCES clients(id),
    client_name TEXT NOT NULL,
    product_name TEXT DEFAULT '',
    qty         INTEGER DEFAULT 0,
    price       REAL DEFAULT 0,
    amount      REAL DEFAULT 0,                     -- 공급가
    vat         REAL DEFAULT 0,                     -- 부가세
    total       REAL DEFAULT 0,                     -- 합계
    paid        REAL DEFAULT 0,                     -- 입금액
    pay_type    TEXT DEFAULT '미수',
    wo_id       INTEGER REFERENCES work_orders(id),
    ship_id     INTEGER REFERENCES shipments(id),
    note        TEXT DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. 매입
CREATE TABLE IF NOT EXISTS purchases (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_date TEXT NOT NULL,
    client_id   INTEGER REFERENCES clients(id),
    client_name TEXT NOT NULL,
    product_name TEXT DEFAULT '',
    qty         INTEGER DEFAULT 0,
    price       REAL DEFAULT 0,
    amount      REAL DEFAULT 0,
    vat         REAL DEFAULT 0,
    total       REAL DEFAULT 0,
    paid        REAL DEFAULT 0,
    pay_type    TEXT DEFAULT '미지급',
    note        TEXT DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. 활동 로그
CREATE TABLE IF NOT EXISTS activity_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    message     TEXT NOT NULL,
    category    TEXT DEFAULT '',                     -- wo/ship/proc/sales 등
    ref_id      INTEGER,                            -- 참조 ID
    user_name   TEXT DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. 사용자
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT UNIQUE,
    name        TEXT NOT NULL,
    dept        TEXT DEFAULT '',
    position    TEXT DEFAULT '',
    role        TEXT DEFAULT 'admin' CHECK(role IN ('admin','office','worker','sales','material','accounting','quality')),
    proc        TEXT DEFAULT '',                     -- 담당공정 (작업자용)
    pw_hash     TEXT DEFAULT '',                     -- bcrypt 해시
    perms       TEXT DEFAULT '',                     -- JSON 권한 배열
    status      TEXT DEFAULT 'active',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. 회사정보
CREATE TABLE IF NOT EXISTS company (
    id          INTEGER PRIMARY KEY DEFAULT 1,
    name        TEXT DEFAULT '팩플로우',
    addr        TEXT DEFAULT '',
    tel         TEXT DEFAULT '',
    fax         TEXT DEFAULT ''
);

-- 15. 공통코드 카테고리
CREATE TABLE IF NOT EXISTS code_categories (
    id          TEXT PRIMARY KEY,                      -- 카테고리ID (PROC_TYPE, WO_STATUS 등)
    name        TEXT NOT NULL,                         -- 카테고리명
    description TEXT DEFAULT '',                       -- 설명
    is_system   INTEGER DEFAULT 0,                     -- 시스템 카테고리 여부 (1=삭제불가)
    ord         INTEGER DEFAULT 0                      -- 정렬순서
);

-- 16. 공통코드 아이템
CREATE TABLE IF NOT EXISTS codes (
    id          TEXT PRIMARY KEY,                      -- 코드ID
    category_id TEXT NOT NULL REFERENCES code_categories(id),
    code        TEXT NOT NULL,                         -- 코드값
    name        TEXT NOT NULL,                         -- 표시명
    value       TEXT DEFAULT '',                       -- 추가값 (세율 등)
    color       TEXT DEFAULT '',                       -- 배지 색상
    is_default  INTEGER DEFAULT 0,                     -- 기본값 여부
    is_active   INTEGER DEFAULT 1,                     -- 활성 여부
    ord         INTEGER DEFAULT 0,                     -- 정렬순서
    UNIQUE(category_id, code)
);

-- 17. 문서 연결
CREATE TABLE IF NOT EXISTS doc_links (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    from_type   TEXT NOT NULL,                         -- QUOTE, ORDER, WO, SHIP 등
    from_id     TEXT NOT NULL,
    from_no     TEXT DEFAULT '',                       -- 문서번호
    to_type     TEXT NOT NULL,
    to_id       TEXT NOT NULL,
    to_no       TEXT DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_type, from_id, to_type, to_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_wo_client ON work_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_wo_date ON work_orders(wo_date);
CREATE INDEX IF NOT EXISTS idx_woproc_wo ON wo_procs(wo_id);
CREATE INDEX IF NOT EXISTS idx_woproc_status ON wo_procs(status);
CREATE INDEX IF NOT EXISTS idx_woproc_name ON wo_procs(proc_name);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_ship_wo ON shipments(wo_id);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(c_type);
CREATE INDEX IF NOT EXISTS idx_products_client ON products(client_id);
CREATE INDEX IF NOT EXISTS idx_molds_no ON molds(mold_no);
CREATE INDEX IF NOT EXISTS idx_codes_cat ON codes(category_id);
CREATE INDEX IF NOT EXISTS idx_doclinks_from ON doc_links(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_doclinks_to ON doc_links(to_type, to_id);
