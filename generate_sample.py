#!/usr/bin/env python3
"""한달치 MES/ERP 샘플 데이터 생성 스크립트 (2026년 3월)"""
import json, random, string, time, requests

BASE = "http://localhost:8080"
PREFIX = "ino_"

def gid():
    return hex(int(time.time()*1000))[2:] + ''.join(random.choices(string.ascii_lowercase+string.digits, k=5))

def save(key, data):
    store_key = PREFIX + key
    r = requests.post(f"{BASE}/api/data/{store_key}", json={"value": json.dumps(data, ensure_ascii=False)})
    print(f"  [{r.status_code}] {store_key}: {len(data) if isinstance(data,list) else 'obj'}")

def save_wo_by_month(wo_list):
    """WO를 월별로 분할 저장"""
    by_month = {}
    for o in wo_list:
        mo = o.get('dt','')[:7] or 'unknown'
        by_month.setdefault(mo, []).append(o)
    for mo, items in by_month.items():
        store_key = f"ino_wo_{mo}"
        r = requests.post(f"{BASE}/api/data/{store_key}", json={"value": json.dumps(items, ensure_ascii=False)})
        print(f"  [{r.status_code}] {store_key}: {len(items)} WOs")

# ===== 기본 데이터 =====
MONTH = "2026-03"
PROCS_POOL = [
    [("인쇄","out"),("코팅","n"),("톰슨","n"),("접착","n")],
    [("인쇄","out"),("코팅","n"),("합지","n"),("톰슨","n"),("접착","n")],
    [("인쇄","out"),("코팅","n"),("톰슨","n")],
    [("인쇄","out"),("합지","n"),("톰슨","n"),("접착","n")],
    [("인쇄","out"),("코팅","n"),("합지","n"),("톰슨","n")],
    [("인쇄","out"),("외주가공","out"),("톰슨","n"),("접착","n")],
]

# ===== 거래처 (매출처 12개) =====
CLIENTS = [
    {"nm":"대한제과","addr":"경기도 안산시 상록구 건건로 1","tel":"031-401-0001","fax":"031-401-0002","ps":"김영수","cType":"sales"},
    {"nm":"서울식품","addr":"서울시 강남구 테헤란로 82","tel":"02-555-1234","fax":"02-555-1235","ps":"이민호","cType":"sales"},
    {"nm":"한빛화장품","addr":"경기도 화성시 동탄중심상가 3층","tel":"031-777-3001","fax":"031-777-3002","ps":"박지영","cType":"sales"},
    {"nm":"동서음료","addr":"충남 천안시 서북구 성성1로","tel":"041-622-4400","fax":"041-622-4401","ps":"최종혁","cType":"sales"},
    {"nm":"미래건강","addr":"경기도 성남시 분당구 판교로 228","tel":"031-898-1100","fax":"031-898-1101","ps":"한수진","cType":"sales"},
    {"nm":"한국의료용품","addr":"대구시 동구 첨단로 100","tel":"053-762-3300","fax":"053-762-3301","ps":"김도현","cType":"sales"},
    {"nm":"오성전자","addr":"경기도 수원시 영통구 광교로 156","tel":"031-210-5500","fax":"031-210-5501","ps":"정우진","cType":"sales"},
    {"nm":"그린농산","addr":"전남 나주시 빛가람로 745","tel":"061-334-7700","fax":"061-334-7701","ps":"박상미","cType":"sales"},
    {"nm":"프리미엄푸드","addr":"경기도 용인시 기흥구 동백중앙로 16","tel":"031-286-9800","fax":"031-286-9801","ps":"유재석","cType":"sales"},
    {"nm":"세종문구","addr":"서울시 종로구 율곡로 123","tel":"02-733-2200","fax":"02-733-2201","ps":"김나영","cType":"sales"},
    {"nm":"테크팜","addr":"대전시 유성구 테크노2로 34","tel":"042-823-6600","fax":"042-823-6601","ps":"이정훈","cType":"sales"},
    {"nm":"코스메틱플러스","addr":"서울시 강서구 공항대로 248","tel":"02-2658-1100","fax":"02-2658-1101","ps":"문지은","cType":"both"},
]

# 매입처 (인쇄소/자재) 5개
VENDORS_CLI = [
    {"nm":"한성인쇄","addr":"경기도 안산시 단원구 산단로 11","tel":"031-487-5500","fax":"031-487-5501","ps":"장현우","cType":"purchase"},
    {"nm":"대영인쇄","addr":"서울시 금천구 가산디지털1로 30","tel":"02-2105-3300","fax":"02-2105-3301","ps":"오승환","cType":"purchase"},
    {"nm":"삼진페이퍼","addr":"경기도 시흥시 공단1대로 113","tel":"031-498-2200","fax":"031-498-2201","ps":"윤대석","cType":"purchase"},
    {"nm":"동양잉크","addr":"경기도 안양시 만안구 전파로 13","tel":"031-476-1100","fax":"031-476-1101","ps":"강동수","cType":"purchase"},
    {"nm":"한일박지","addr":"경기도 군포시 산본로 323","tel":"031-392-8800","fax":"031-392-8801","ps":"송민아","cType":"purchase"},
]

ALL_CLIENTS = CLIENTS + VENDORS_CLI

# ===== 품목 30개 =====
PRODUCTS = [
    {"cnm":"대한제과","nm":"대한제과 쿠키박스 (중)","paper":"C1S 350g","spec":"300×220×80mm","code":"대한-001"},
    {"cnm":"대한제과","nm":"대한제과 선물세트 박스","paper":"C1S 400g","spec":"450×300×120mm","code":"대한-002"},
    {"cnm":"대한제과","nm":"대한제과 파이상자","paper":"E골 B/W","spec":"260×200×100mm","code":"대한-003"},
    {"cnm":"서울식품","nm":"서울식품 김치포장 (1kg)","paper":"합지 350g","spec":"300×200×150mm","code":"서울-001"},
    {"cnm":"서울식품","nm":"서울식품 반찬세트 박스","paper":"C1S 300g","spec":"350×250×80mm","code":"서울-002"},
    {"cnm":"한빛화장품","nm":"한빛 스킨케어 단상자","paper":"아이보리 300g","spec":"80×80×180mm","code":"한빛-001"},
    {"cnm":"한빛화장품","nm":"한빛 세럼 패키지","paper":"아이보리 350g","spec":"60×60×160mm","code":"한빛-002"},
    {"cnm":"한빛화장품","nm":"한빛 기초세트 박스","paper":"C1S 400g","spec":"280×220×100mm","code":"한빛-003"},
    {"cnm":"동서음료","nm":"동서음료 6캔 캐리어","paper":"E골 K/K","spec":"200×130×130mm","code":"동서-001"},
    {"cnm":"동서음료","nm":"동서음료 선물세트","paper":"C1S 350g","spec":"350×250×100mm","code":"동서-002"},
    {"cnm":"미래건강","nm":"미래건강 영양제 박스","paper":"아이보리 300g","spec":"100×100×150mm","code":"미래-001"},
    {"cnm":"미래건강","nm":"미래건강 종합선물세트","paper":"C1S 400g","spec":"400×300×120mm","code":"미래-002"},
    {"cnm":"한국의료용품","nm":"의료키트 포장","paper":"백판지 350g","spec":"250×200×80mm","code":"한국-001"},
    {"cnm":"한국의료용품","nm":"마스크 50매 박스","paper":"C1S 300g","spec":"200×110×70mm","code":"한국-002"},
    {"cnm":"오성전자","nm":"오성 이어폰 패키지","paper":"C1S 350g","spec":"120×120×50mm","code":"오성-001"},
    {"cnm":"오성전자","nm":"오성 보조배터리 박스","paper":"C1S 300g","spec":"150×100×40mm","code":"오성-002"},
    {"cnm":"오성전자","nm":"오성 스피커 포장","paper":"E골 B/W","spec":"350×250×300mm","code":"오성-003"},
    {"cnm":"그린농산","nm":"그린농산 사과 5kg","paper":"E골 K/K","spec":"400×300×200mm","code":"그린-001"},
    {"cnm":"그린농산","nm":"그린농산 배 선물세트","paper":"E골 B/W","spec":"500×350×150mm","code":"그린-002"},
    {"cnm":"프리미엄푸드","nm":"프리미엄 한우세트 박스","paper":"C1S 400g","spec":"450×350×130mm","code":"프리-001"},
    {"cnm":"프리미엄푸드","nm":"프리미엄 참기름세트","paper":"C1S 350g","spec":"300×200×100mm","code":"프리-002"},
    {"cnm":"세종문구","nm":"세종 연필세트 박스","paper":"아이보리 250g","spec":"220×60×30mm","code":"세종-001"},
    {"cnm":"세종문구","nm":"세종 학용품세트","paper":"C1S 300g","spec":"300×200×50mm","code":"세종-002"},
    {"cnm":"테크팜","nm":"테크팜 시약키트 박스","paper":"백판지 300g","spec":"200×150×100mm","code":"테크-001"},
    {"cnm":"테크팜","nm":"테크팜 진단키트 포장","paper":"아이보리 350g","spec":"180×120×60mm","code":"테크-002"},
    {"cnm":"코스메틱플러스","nm":"코플 립스틱 단상자","paper":"아이보리 300g","spec":"40×40×120mm","code":"코플-001"},
    {"cnm":"코스메틱플러스","nm":"코플 파운데이션 박스","paper":"아이보리 350g","spec":"80×80×50mm","code":"코플-002"},
    {"cnm":"코스메틱플러스","nm":"코플 화장품세트","paper":"C1S 400g","spec":"300×250×100mm","code":"코플-003"},
    {"cnm":"대한제과","nm":"대한제과 마카롱박스","paper":"아이보리 300g","spec":"200×200×60mm","code":"대한-004"},
    {"cnm":"서울식품","nm":"서울식품 도시락 용기","paper":"E골 B/W","spec":"250×180×80mm","code":"서울-003"},
]

# 인쇄소 (vendors)
VENDORS = [
    {"id": gid(), "nm":"한성인쇄","tel":"031-487-5500","addr":"안산시 단원구","note":"4도 인쇄 전문","cat":time.strftime('%Y-%m-%d %H:%M')},
    {"id": gid(), "nm":"대영인쇄","tel":"02-2105-3300","addr":"서울 금천구","note":"UV인쇄, 소량 가능","cat":time.strftime('%Y-%m-%d %H:%M')},
]

# 목형
MOLDS = [
    {"id":gid(),"no":"M-2025-001","pnm":"대한제과 쿠키박스 (중)","cnm":"대한제과","loc":"1열-A","st":"사용중","note":"","cat":time.strftime('%Y-%m-%d %H:%M')},
    {"id":gid(),"no":"M-2025-002","pnm":"한빛 스킨케어 단상자","cnm":"한빛화장품","loc":"1열-B","st":"사용중","note":"","cat":time.strftime('%Y-%m-%d %H:%M')},
    {"id":gid(),"no":"M-2025-003","pnm":"동서음료 6캔 캐리어","cnm":"동서음료","loc":"2열-A","st":"사용중","note":"","cat":time.strftime('%Y-%m-%d %H:%M')},
    {"id":gid(),"no":"M-2025-004","pnm":"오성 이어폰 패키지","cnm":"오성전자","loc":"2열-B","st":"사용중","note":"","cat":time.strftime('%Y-%m-%d %H:%M')},
    {"id":gid(),"no":"M-2025-005","pnm":"미래건강 영양제 박스","cnm":"미래건강","loc":"3열-A","st":"사용중","note":"","cat":time.strftime('%Y-%m-%d %H:%M')},
    {"id":gid(),"no":"M-2025-006","pnm":"코플 립스틱 단상자","cnm":"코스메틱플러스","loc":"3열-B","st":"사용중","note":"","cat":time.strftime('%Y-%m-%d %H:%M')},
    {"id":gid(),"no":"M-2024-010","pnm":"(구)제과박스","cnm":"대한제과","loc":"창고","st":"폐기","note":"2024년 금형 교체","cat":time.strftime('%Y-%m-%d %H:%M')},
]

# 사용자
USERS = [
    {"id":gid(),"nm":"관리자","un":"admin","role":"admin","proc":"","pw":"1234","perms":None},
    {"id":gid(),"nm":"김사무","un":"office1","role":"office","proc":"","pw":"1234","perms":["mes-dash","mes-wo","mes-ship","mes-cli","mes-prod","mes-rpt","acc-sales","acc-purchase","acc-pl"]},
    {"id":gid(),"nm":"이영업","un":"sales1","role":"sales","proc":"","pw":"1234","perms":["mes-dash","mes-wo","mes-ship","mes-cli","mes-prod","acc-sales","acc-purchase","qc-quote"]},
    {"id":gid(),"nm":"박코팅","un":"w_coat","role":"worker","proc":"코팅","pw":"1234","perms":[]},
    {"id":gid(),"nm":"최합지","un":"w_laminate","role":"worker","proc":"합지","pw":"1234","perms":[]},
    {"id":gid(),"nm":"정톰슨","un":"w_thomson","role":"worker","proc":"톰슨","pw":"1234","perms":[]},
    {"id":gid(),"nm":"강접착","un":"w_glue","role":"worker","proc":"접착","pw":"1234","perms":[]},
    {"id":gid(),"nm":"한자재","un":"mat1","role":"material","proc":"","pw":"1234","perms":["mes-dash","mat-income","mat-stock","mat-po","mat-bom","acc-purchase"]},
]

# 직원
EMPLOYEES = [
    {"id":gid(),"nm":"관리자","dept":"사무","rank":"대표","proc":"","join":"2020-01-01","birth":"1975-03-15","tel":"010-1234-5678","emg":"","base":5000000,"hourly":0,"annual":15,"st":"재직","note":""},
    {"id":gid(),"nm":"김사무","dept":"사무","rank":"과장","proc":"","join":"2021-06-01","birth":"1988-07-22","tel":"010-2345-6789","emg":"010-9999-1111","base":3500000,"hourly":0,"annual":15,"st":"재직","note":""},
    {"id":gid(),"nm":"이영업","dept":"사무","rank":"대리","proc":"","join":"2022-03-15","birth":"1992-11-03","tel":"010-3456-7890","emg":"","base":3200000,"hourly":0,"annual":15,"st":"재직","note":""},
    {"id":gid(),"nm":"박코팅","dept":"현장","rank":"사원","proc":"코팅","join":"2023-01-10","birth":"1995-05-20","tel":"010-4567-8901","emg":"","base":0,"hourly":12000,"annual":15,"st":"재직","note":""},
    {"id":gid(),"nm":"최합지","dept":"현장","rank":"사원","proc":"합지","join":"2023-04-01","birth":"1996-08-14","tel":"010-5678-9012","emg":"","base":0,"hourly":12000,"annual":15,"st":"재직","note":""},
    {"id":gid(),"nm":"정톰슨","dept":"현장","rank":"주임","proc":"톰슨","join":"2022-07-01","birth":"1990-01-30","tel":"010-6789-0123","emg":"","base":0,"hourly":13000,"annual":15,"st":"재직","note":""},
    {"id":gid(),"nm":"강접착","dept":"현장","rank":"사원","proc":"접착","join":"2023-09-01","birth":"1997-12-05","tel":"010-7890-1234","emg":"","base":0,"hourly":11500,"annual":15,"st":"재직","note":""},
    {"id":gid(),"nm":"한자재","dept":"사무","rank":"사원","proc":"","join":"2024-01-15","birth":"1994-04-18","tel":"010-8901-2345","emg":"","base":2800000,"hourly":0,"annual":15,"st":"재직","note":""},
]

# ===== 회사 정보 =====
COMPANY = {"nm":"이노패키지","addr":"경기도 안산시 상록구 건건동 530-1","tel":"031-401-7700","fax":"031-401-7701"}

WORKER_MAP = {"코팅":"박코팅","합지":"최합지","톰슨":"정톰슨","접착":"강접착"}

def main():
    print("=== 팩플로우 한달치 샘플 데이터 생성 ===\n")

    # 1) 거래처
    cli_list = []
    for c in ALL_CLIENTS:
        cli_list.append({"id":gid(),"nm":c["nm"],"addr":c["addr"],"tel":c["tel"],"fax":c["fax"],"ps":c["ps"],"cType":c["cType"],"nt":"","cat":"2026-03-01 09:00"})
    print("1. 거래처 생성:", len(cli_list))
    save("cli", cli_list)

    # 2) 품목
    prod_list = []
    for p in PRODUCTS:
        procs_template = random.choice(PROCS_POOL)
        procs = [{"nm":nm,"tp":tp,"mt":"","vd":"한성인쇄" if nm=="인쇄" else "","st":"대기","qty":0,"t1":"","t2":""} for nm,tp in procs_template]
        caut = ""
        prod_list.append({"id":gid(),"nm":p["nm"],"cnm":p["cnm"],"paper":p["paper"],"spec":p["spec"],"code":p.get("code",""),
                          "procs":procs,"caut":caut,"cat":"2026-03-01 09:00"})
    print("2. 품목 생성:", len(prod_list))
    save("prod", prod_list)

    # 3) 인쇄소
    print("3. 인쇄소:", len(VENDORS))
    save("vendors", VENDORS)

    # 4) 목형
    print("4. 목형:", len(MOLDS))
    save("mold", MOLDS)

    # 5) 사용자
    print("5. 사용자:", len(USERS))
    save("users", USERS)

    # 6) 직원
    print("6. 직원:", len(EMPLOYEES))
    save("emp", EMPLOYEES)

    # 7) 회사정보
    print("7. 회사정보")
    store_key = PREFIX + "co"
    requests.post(f"{BASE}/api/data/{store_key}", json={"value": json.dumps(COMPANY, ensure_ascii=False)})

    # ===== 작업지시서 50개 =====
    wo_list = []
    ship_log = []
    defect_log = []
    sales_list = []
    purchase_list = []
    income_list = []
    stock_list = []
    tax_invoices = []
    logs_list = []
    qc_records = []
    att_list = []
    payroll_list = []

    wn_counter = 1

    # 3월 1일~31일에 걸쳐 분포
    for i in range(50):
        day = random.randint(1, 28)  # 3월 1~28일
        dt = f"2026-03-{day:02d}"
        ship_day = min(28, day + random.randint(3, 10))
        ship_dt = f"2026-03-{ship_day:02d}"

        prod = random.choice(PRODUCTS)
        cli_nm = prod["cnm"]
        wn = f"WO-2603-{wn_counter:03d}"
        wn_counter += 1

        fq = random.choice([500, 1000, 2000, 3000, 5000, 8000, 10000, 15000, 20000])
        qm = fq + random.randint(100, 500)  # 정매수량 (완제품+여분)

        # 공정 배열
        vendor = random.choice(["한성인쇄","대영인쇄"])

        # 상태 결정 + 적합한 공정 템플릿 배정
        POOL_WITH_HAPJI = [t for t in PROCS_POOL if any(p[0]=="합지" for p in t)]
        POOL_WITH_접착 = [t for t in PROCS_POOL if any(p[0]=="접착" for p in t)]
        if i < 6:
            status = "코팅대기"
            proc_template = random.choice(PROCS_POOL)
        elif i < 10:
            status = "합지대기"
            proc_template = random.choice(POOL_WITH_HAPJI)
        elif i < 14:
            status = "톰슨대기"
            proc_template = random.choice(PROCS_POOL)
        elif i < 18:
            status = "접착대기"
            proc_template = random.choice(POOL_WITH_접착)
        elif i < 21:
            status = "진행중"
            proc_template = random.choice(PROCS_POOL)
        elif i < 37:
            status = "완료"
            proc_template = random.choice(PROCS_POOL)
        elif i < 43:
            status = "출고완료"
            proc_template = random.choice(PROCS_POOL)
        elif i < 48:
            status = "대기"
            proc_template = random.choice(PROCS_POOL)
        else:
            status = "보류"
            proc_template = random.choice(PROCS_POOL)

        procs = []
        for pi, (pnm, ptp) in enumerate(proc_template):
            p = {"nm":pnm,"tp":ptp,"mt":"","vd":"","st":"대기","qty":0,"t1":"","t2":""}
            if pnm == "인쇄":
                p["vd"] = vendor
                p["tp"] = "out"
                p["mt"] = random.choice(["4도인쇄","UV인쇄","2도인쇄"])
            elif pnm == "코팅":
                p["mt"] = random.choice(["유광코팅","무광코팅","매트코팅","UV코팅"])
            elif pnm == "합지":
                p["mt"] = random.choice(["합지","E골합지","B골합지"])
            elif pnm == "외주가공":
                p["vd"] = "한일박지"
                p["tp"] = "out"
                p["mt"] = random.choice(["금박","형압","실크"])

            # 상태에 따라 공정 진행
            if status == "코팅대기":
                if pi == 0:  # 인쇄: 외주완료
                    p["st"] = "외주완료"
                    p["t1"] = f"2026-03-{min(28,day):02d} 09:00"
                    p["t2"] = f"2026-03-{min(28,day+1):02d} 17:00"
                    p["qty"] = fq + random.randint(-5, 5)
                elif pi == 1:  # 코팅: 대기
                    p["st"] = "대기"
                # 나머지 공정은 기본 대기 유지
            elif status == "합지대기":
                # 인쇄,코팅 완료 → 합지 대기 (합지가 없는 템플릿이면 톰슨대기로 대체)
                proc_names = [x[0] for x in proc_template]
                if "합지" in proc_names:
                    target_idx = proc_names.index("합지")
                else:
                    target_idx = proc_names.index("톰슨") if "톰슨" in proc_names else 2
                if pi < target_idx:
                    p["st"] = "외주완료" if ptp == "out" else "완료"
                    p["t1"] = f"2026-03-{min(28,day+pi):02d} 09:00"
                    p["t2"] = f"2026-03-{min(28,day+pi+1):02d} 17:00"
                    p["qty"] = fq + random.randint(-5, 5)
                elif pi == target_idx:
                    p["st"] = "대기"
            elif status == "톰슨대기":
                proc_names = [x[0] for x in proc_template]
                if "톰슨" in proc_names:
                    target_idx = proc_names.index("톰슨")
                else:
                    target_idx = min(3, len(proc_template)-1)
                if pi < target_idx:
                    p["st"] = "외주완료" if ptp == "out" else "완료"
                    p["t1"] = f"2026-03-{min(28,day+pi):02d} 09:00"
                    p["t2"] = f"2026-03-{min(28,day+pi+1):02d} 17:00"
                    p["qty"] = fq + random.randint(-5, 5)
                elif pi == target_idx:
                    p["st"] = "대기"
            elif status == "접착대기":
                proc_names = [x[0] for x in proc_template]
                if "접착" in proc_names:
                    target_idx = proc_names.index("접착")
                else:
                    target_idx = len(proc_template)-1
                if pi < target_idx:
                    p["st"] = "외주완료" if ptp == "out" else "완료"
                    p["t1"] = f"2026-03-{min(28,day+pi):02d} 09:00"
                    p["t2"] = f"2026-03-{min(28,day+pi+1):02d} 17:00"
                    p["qty"] = fq + random.randint(-5, 5)
                elif pi == target_idx:
                    p["st"] = "대기"
            elif status == "대기":
                if pi == 0:
                    p["st"] = "진행중" if pnm == "인쇄" else "대기"
                    if pnm == "인쇄":
                        p["t1"] = f"{dt} 09:00"
                        status_real = "진행중"  # 인쇄 나간 것은 진행중
            elif status == "진행중":
                # 일부 공정 완료
                done_count = random.randint(1, max(1, len(proc_template)-2))
                if pi < done_count:
                    p["st"] = "완료" if ptp == "n" else "외주완료"
                    p["t1"] = f"2026-03-{min(28,day+pi):02d} 09:00"
                    p["t2"] = f"2026-03-{min(28,day+pi+1):02d} 17:00"
                    p["qty"] = fq + random.randint(-10, 10)
                elif pi == done_count:
                    p["st"] = "진행중" if ptp == "n" else ("외주대기" if random.random() < 0.3 else "진행중")
                    p["t1"] = f"2026-03-{min(28,day+pi):02d} 09:00"
            elif status in ("완료","출고완료"):
                p["st"] = "완료" if ptp == "n" else "외주완료"
                p["t1"] = f"2026-03-{min(28,day+pi):02d} 09:00"
                p["t2"] = f"2026-03-{min(28,day+pi+1):02d} 17:00"
                comp_qty = fq + random.randint(-10, 5)
                p["qty"] = comp_qty
                # 불량 발생 (15% 확률)
                if random.random() < 0.15:
                    defect_cnt = random.randint(1, max(1, fq//100))
                    defect_reason = random.choice(["인쇄불량","코팅벗겨짐","합지밀림","톰슨칼선불량","접착불량","색상불일치","오염"])
                    worker = WORKER_MAP.get(pnm, "관리자")
                    defect_log.append({
                        "id":gid(),"woId":"__WO__"+str(i),"wn":wn,"pnm":prod["nm"],"cnm":cli_nm,
                        "proc":pnm,"defect":defect_cnt,"reason":defect_reason,"worker":worker,
                        "dt":f"2026-03-{min(28,day+pi+1):02d}","tm":f"2026-03-{min(28,day+pi+1):02d} 15:30"
                    })
            elif status == "보류":
                if pi == 0:
                    p["st"] = "보류"
                    p["holdReason"] = random.choice(["자재 미입고","고객 디자인 변경 대기","인쇄소 일정 조율 중"])
                    p["t1"] = f"{dt} 09:00"

            procs.append(p)

        # 대기 상태인데 인쇄가 나간 건 진행중으로
        if status == "대기" and any(p["st"] == "진행중" for p in procs):
            status = "진행중"
        # 각 공정대기는 실제 status를 진행중으로
        if status in ("코팅대기","합지대기","톰슨대기","접착대기"):
            status = "진행중"

        wo = {
            "id": gid(),
            "wn": wn,
            "dt": dt,
            "cid": "",
            "cnm": cli_nm,
            "addr": next((c["addr"] for c in ALL_CLIENTS if c["nm"]==cli_nm), ""),
            "tel": next((c["tel"] for c in ALL_CLIENTS if c["nm"]==cli_nm), ""),
            "fax": next((c["fax"] for c in ALL_CLIENTS if c["nm"]==cli_nm), ""),
            "pid": "",
            "pnm": prod["nm"],
            "paper": prod["paper"],
            "spec": prod["spec"],
            "qm": qm,
            "qe": random.randint(50, 300),
            "fabric": "",
            "fabricSpec": "",
            "fabricQty": 0,
            "fabricExtra": 0,
            "ps": "",
            "procs": procs,
            "gold": "",
            "mold": "",
            "hand": "",
            "fq": fq,
            "sd": ship_dt,
            "dlv": next((c["addr"] for c in ALL_CLIENTS if c["nm"]==cli_nm), ""),
            "nt": "",
            "caut": "",
            "img": "",
            "status": status,
            "pri": i + 1,
            "cat": f"{dt} 09:00",
            "mgr": "관리자",
            "vendor": vendor,
        }

        # 출고완료인 경우 출고 기록 생성
        if status == "출고완료":
            ship_defect = random.randint(0, max(1, fq // 200))
            ship_rec = {
                "id": gid(),
                "woId": wo["id"],
                "wn": wn,
                "cnm": cli_nm,
                "pnm": prod["nm"],
                "qty": fq,
                "defect": ship_defect,
                "good": fq - ship_defect,
                "inspNote": "",
                "car": random.choice(["12가3456","34나5678","56다7890","78라9012"]),
                "driver": random.choice(["김기사","박기사","이기사"]),
                "dlv": wo["dlv"],
                "memo": "",
                "dt": ship_dt,
                "tm": f"{ship_dt} 14:00",
                "mgr": "관리자",
            }
            ship_log.append(ship_rec)

            # 매출 자동 등록
            unit_price = random.choice([50, 80, 100, 120, 150, 200, 300, 500])
            sales_amt = unit_price * fq
            sales_list.append({
                "id": gid(), "dt": ship_dt, "cli": cli_nm, "prod": prod["nm"],
                "qty": fq, "price": unit_price, "amt": sales_amt,
                "paid": sales_amt if random.random() < 0.4 else (int(sales_amt * 0.5) if random.random() < 0.3 else 0),
                "payType": "완납" if random.random() < 0.4 else "미수",
                "note": f"출고자동등록 ({wn})", "cat": f"{ship_dt} 14:00"
            })

        # 완료 상태 중 일부도 매출 등록 (출고 전이지만 수주 확정)
        elif status == "완료" and random.random() < 0.5:
            unit_price = random.choice([50, 80, 100, 120, 150, 200, 300])
            sales_amt = unit_price * fq
            sales_list.append({
                "id": gid(), "dt": dt, "cli": cli_nm, "prod": prod["nm"],
                "qty": fq, "price": unit_price, "amt": sales_amt,
                "paid": 0, "payType": "미수",
                "note": f"수주 ({wn})", "cat": f"{dt} 09:00"
            })

        wo_list.append(wo)

    # 불량로그의 woId 치환
    for dl in defect_log:
        tag = dl["woId"]
        if tag.startswith("__WO__"):
            idx = int(tag.replace("__WO__",""))
            dl["woId"] = wo_list[idx]["id"]

    print(f"\n8. 작업지시서: {len(wo_list)}")
    save_wo_by_month(wo_list)

    print(f"9. 출고이력: {len(ship_log)}")
    save("shipLog", ship_log)

    print(f"10. 불량이력: {len(defect_log)}")
    save("defectLog", defect_log)

    # ===== 매입 데이터 (인쇄/자재 비용) =====
    for i in range(20):
        day = random.randint(1, 28)
        vendor_nm = random.choice(["한성인쇄","대영인쇄","삼진페이퍼","동양잉크","한일박지"])
        prod_nm = random.choice(["4도인쇄 가공비","UV인쇄 가공비","C1S 350g 종이","합지 350g","잉크 CMY세트","박지 롤","E골 원지"])
        qty = random.randint(1, 50)
        price = random.choice([50000, 100000, 150000, 200000, 300000, 500000])
        amt = qty * price
        purchase_list.append({
            "id": gid(), "dt": f"2026-03-{day:02d}", "cli": vendor_nm, "prod": prod_nm,
            "qty": qty, "price": price, "amt": amt,
            "paid": amt if random.random() < 0.3 else 0,
            "payType": "완납" if random.random() < 0.3 else "미지급",
            "note": "", "cat": f"2026-03-{day:02d} 10:00"
        })

    print(f"11. 매출: {len(sales_list)}")
    save("sales", sales_list)
    print(f"12. 매입: {len(purchase_list)}")
    save("purchase", purchase_list)

    # ===== 입고 데이터 =====
    stock_items = [
        ("종이","C1S 350g","매","삼진페이퍼","350g 53×77cm",50000),
        ("종이","C1S 400g","매","삼진페이퍼","400g 53×77cm",60000),
        ("종이","C1S 300g","매","삼진페이퍼","300g 53×77cm",45000),
        ("종이","아이보리 300g","매","삼진페이퍼","300g 53×77cm",48000),
        ("종이","아이보리 350g","매","삼진페이퍼","350g 53×77cm",55000),
        ("종이","백판지 350g","매","삼진페이퍼","350g 53×77cm",42000),
        ("종이","E골 K/K","매","삼진페이퍼","K/K","35000"),
        ("종이","E골 B/W","매","삼진페이퍼","B/W","38000"),
        ("잉크","프로세스 CMY","세트","동양잉크","1kg×4","280000"),
        ("잉크","특색잉크","kg","동양잉크","1kg","95000"),
        ("접착제","핫멜트 접착제","kg","동양잉크","25kg","120000"),
        ("박지","금박필름","롤","한일박지","640mm×120m","180000"),
        ("부자재","코팅필름 (유광)","롤","한일박지","640mm×100m","85000"),
        ("부자재","코팅필름 (무광)","롤","한일박지","640mm×100m","90000"),
    ]

    for cat, nm, unit, vd, spec, price in stock_items:
        inc_qty = random.randint(5, 30)
        inc_day = random.randint(1, 15)
        income_list.append({
            "id": gid(), "dt": f"2026-03-{inc_day:02d}", "cat": cat, "vd": vd,
            "nm": nm, "spec": spec, "unit": unit, "qty": inc_qty, "price": price,
            "note": "", "st": "확인", "cat_at": f"2026-03-{inc_day:02d} 10:00"
        })
        used = random.randint(0, inc_qty - 1)
        stock_list.append({
            "id": gid(), "cat": cat, "nm": nm, "spec": spec, "unit": unit,
            "qty": inc_qty - used, "safe": random.choice([3, 5, 10]),
            "price": price, "vd": vd, "loc": "", "note": "",
            "updated": "2026-03-15 10:00"
        })

    print(f"13. 입고: {len(income_list)}")
    save("income", income_list)
    print(f"14. 재고: {len(stock_list)}")
    save("stock", stock_list)

    # ===== 세금계산서 =====
    for s in sales_list:
        if random.random() < 0.6:
            supply = s["amt"]
            vat = round(supply * 0.1)
            tax_invoices.append({
                "id": gid(), "dt": s["dt"], "type": "매출", "cli": s["cli"],
                "bizNo": "", "item": s["prod"], "supply": supply, "vat": vat,
                "note": "", "cat": s["dt"] + " 15:00"
            })
    for p in purchase_list:
        if random.random() < 0.5:
            supply = p["amt"]
            vat = round(supply * 0.1)
            tax_invoices.append({
                "id": gid(), "dt": p["dt"], "type": "매입", "cli": p["cli"],
                "bizNo": "", "item": p["prod"], "supply": supply, "vat": vat,
                "note": "", "cat": p["dt"] + " 15:00"
            })
    print(f"15. 세금계산서: {len(tax_invoices)}")
    save("taxInvoice", tax_invoices)

    # ===== 출퇴근 기록 (3월 한달) =====
    import datetime
    for day in range(1, 29):
        dow = datetime.date(2026, 3, day).weekday()
        if dow >= 5:
            continue  # 주말 스킵
        for emp in EMPLOYEES:
            if emp["st"] != "재직":
                continue
            if random.random() < 0.05:
                continue  # 5% 결근
            in_h = random.randint(7, 9)
            in_m = random.randint(0, 59)
            out_h = random.randint(17, 20)
            out_m = random.randint(0, 59)
            att_list.append({
                "id": gid(), "empId": emp["id"],
                "dt": f"2026-03-{day:02d}",
                "inTime": f"{in_h:02d}:{in_m:02d}",
                "outTime": f"{out_h:02d}:{out_m:02d}",
                "note": ""
            })
    print(f"16. 출퇴근: {len(att_list)}")
    save("att", att_list)

    # ===== 급여 (3월) =====
    for emp in EMPLOYEES:
        if emp["base"] > 0:
            total = emp["base"]
        else:
            # 시급제: 대략 22일 × 8시간
            total = emp["hourly"] * 8 * 22
        payroll_list.append({
            "id": gid(), "empId": emp["id"], "empNm": emp["nm"],
            "month": "2026-03", "base": emp["base"], "hourly": emp["hourly"],
            "days": 22, "hours": 176, "ot": random.randint(0, 20),
            "otPay": random.randint(0, 500000),
            "total": total + random.randint(0, 500000),
            "tax": round(total * 0.033),
            "net": round(total * 0.967),
            "paid": True, "note": ""
        })
    print(f"17. 급여: {len(payroll_list)}")
    save("payroll", payroll_list)

    # ===== 품질검사 기록 =====
    for dl in defect_log:
        qc_records.append({
            "id": gid(), "dt": dl["dt"], "prod": dl["pnm"], "proc": dl["proc"],
            "sampleCnt": random.randint(100, 1000), "defectCnt": dl["defect"],
            "defectRate": str(round(dl["defect"] / max(1, random.randint(100, 1000)) * 100, 1)),
            "result": "합격" if dl["defect"] < 5 else "불합격",
            "action": dl["reason"], "mgr": "관리자", "woId": dl["woId"]
        })
    print(f"18. 품질검사: {len(qc_records)}")
    save("qcRecords", qc_records)

    # ===== 로그 =====
    for wo in wo_list:
        logs_list.append({
            "id": gid(), "dt": wo["dt"], "msg": f"등록: {wo['wn']} {wo['pnm']}",
            "user": "관리자", "tm": wo["cat"]
        })
    for sl in ship_log:
        logs_list.append({
            "id": gid(), "dt": sl["dt"], "msg": f"출고: {sl['pnm']} {sl['qty']}매 → {sl['cnm']}",
            "user": "관리자", "tm": sl["tm"]
        })
    print(f"19. 로그: {len(logs_list)}")
    save("logs", logs_list)

    # BOM (빈 배열 초기화)
    save("bom", [])
    save("po", [])
    save("claims", [])
    save("done", [])
    save("hist", [])
    save("incLog", [])

    print(f"\n✅ 완료! 총 데이터:")
    print(f"   거래처: {len(cli_list)}, 품목: {len(prod_list)}, WO: {len(wo_list)}")
    print(f"   출고: {len(ship_log)}, 매출: {len(sales_list)}, 매입: {len(purchase_list)}")
    print(f"   입고: {len(income_list)}, 재고: {len(stock_list)}, 세금계산서: {len(tax_invoices)}")
    print(f"   불량: {len(defect_log)}, 품질: {len(qc_records)}")
    print(f"   직원: {len(EMPLOYEES)}, 출퇴근: {len(att_list)}, 급여: {len(payroll_list)}")

if __name__ == "__main__":
    main()
