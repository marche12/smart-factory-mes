/**
 * 이노패키지 MES - 전 공정 시뮬레이션 데이터 주입 스크립트
 * Chrome DevTools Console (F12) 에 붙여넣고 Enter
 *
 * 생성되는 데이터:
 *  WO-SIM-01 : 대기    - 전공정 대기 (납기 D-12)
 *  WO-SIM-02 : 진행중  - 인쇄소(외주) 진행중, 코팅~접착 대기 (납기 D-7)
 *  WO-SIM-03 : 진행중  - 인쇄 완료 입고, 코팅 진행중 (납기 D-4)
 *  WO-SIM-04 : 완료대기 - 전공정 완료, 완료확인 대기 (납기 D-2)
 *  WO-SIM-05 : 출고지연 - 납기 5일 초과, 합지 진행중 (빨간 지연 뱃지)
 *
 * 제거: 이 스크립트 맨 아래 CLEANUP 섹션 실행
 */

(function(){
  var TODAY = '2026-04-08';
  var NOW = new Date().toISOString();
  function gid(){ return 'sim_'+Math.random().toString(36).slice(2,10); }

  // ── 공정 템플릿 ──────────────────────────────────────
  // tp: 'out'=외주(인쇄소), 'exc'=외주가공, 'n'=내부
  function mkProc(nm, tp, st, qty, t1, t2){
    return {nm:nm, tp:tp||'n', mt:'', vd: tp==='out'?'한국인쇄':'', st:st||'대기', qty:qty||0, t1:t1||'', t2:t2||''};
  }

  // ── 작업지시서 5개 ────────────────────────────────────
  var SIM_WOS = [

    // WO-SIM-01: 전공정 대기 (방금 등록됨, 납기 D-12)
    {
      id:'sim_wo_01', wn:'WO-SIM-01', dt:TODAY, cat:NOW,
      cnm:'테스트거래처A', pnm:'고급 선물박스 A', paper:'아트지 250g', spec:'A3',
      qm:1100, qe:100, fq:1000, sd:'2026-04-20', dlv:'본사창고',
      ps:'4도 인쇄, 무광코팅', mgr:'홍길동', vendor:'한국인쇄', price:850, amt:850000,
      status:'대기', pri:1,
      procs:[
        mkProc('인쇄','out','대기'),
        mkProc('코팅','n','대기'),
        mkProc('합지','n','대기'),
        mkProc('톰슨','n','대기'),
        mkProc('접착','n','대기'),
      ],
      papers:[{paper:'아트지 250g',spec:'A3',qm:1100,qe:100}], fabrics:[],
      gold:'',mold:'목형A',hand:'',nt:'샘플 확인 후 진행',caut:'',img:'',
      cid:'',pid:'',addr:'서울 강남구',tel:'02-1234-5678',fax:'',
      fabric:'',fabricSpec:'',fabricQty:0,fabricExtra:0,
    },

    // WO-SIM-02: 인쇄소(외주) 진행중, 나머지 대기 (납기 D-7)
    {
      id:'sim_wo_02', wn:'WO-SIM-02', dt:'2026-04-05', cat:NOW,
      cnm:'테스트거래처B', pnm:'판촉용 패키지 B', paper:'스노우지 200g', spec:'B3',
      qm:2100, qe:100, fq:2000, sd:'2026-04-15', dlv:'테스트거래처B 창고',
      ps:'2도 + 금박', mgr:'홍길동', vendor:'성광인쇄', price:420, amt:840000,
      status:'진행중', pri:2,
      procs:[
        mkProc('인쇄','out','진행중', 0, '2026-04-05T09:00:00'),  // 인쇄소 진행중
        mkProc('코팅','n','대기'),
        mkProc('합지','n','대기'),
        mkProc('톰슨','n','대기'),
        mkProc('접착','n','대기'),
      ],
      papers:[{paper:'스노우지 200g',spec:'B3',qm:2100,qe:100}], fabrics:[],
      gold:'금박 로고',mold:'목형B',hand:'',nt:'',caut:'금박 위치 주의',img:'',
      cid:'',pid:'',addr:'경기 성남시',tel:'031-9876-5432',fax:'',
      fabric:'',fabricSpec:'',fabricQty:0,fabricExtra:0,
    },

    // WO-SIM-03: 인쇄 완료 입고, 코팅 진행중 (납기 D-4)
    {
      id:'sim_wo_03', wn:'WO-SIM-03', dt:'2026-04-01', cat:NOW,
      cnm:'테스트거래처C', pnm:'화장품 케이스 C', paper:'크라프트지 300g', spec:'A4',
      qm:3200, qe:200, fq:3000, sd:'2026-04-12', dlv:'테스트거래처C',
      ps:'단색 인쇄', mgr:'김철수', vendor:'', price:310, amt:930000,
      status:'진행중', pri:3,
      procs:[
        mkProc('인쇄','out','완료', 3200, '2026-04-01T09:00:00', '2026-04-04T17:00:00'),  // 입고 완료
        mkProc('코팅','n','진행중', 0, '2026-04-06T08:30:00'),  // 코팅 진행중
        mkProc('합지','n','대기'),
        mkProc('톰슨','n','대기'),
        mkProc('접착','n','대기'),
      ],
      papers:[{paper:'크라프트지 300g',spec:'A4',qm:3200,qe:200}], fabrics:[],
      gold:'',mold:'목형C',hand:'',nt:'',caut:'',img:'',
      cid:'',pid:'',addr:'서울 마포구',tel:'02-5555-0000',fax:'',
      fabric:'',fabricSpec:'',fabricQty:0,fabricExtra:0,
    },

    // WO-SIM-04: 전공정 완료, 완료확인 대기 (납기 D-2)
    {
      id:'sim_wo_04', wn:'WO-SIM-04', dt:'2026-03-25', cat:NOW,
      cnm:'테스트거래처D', pnm:'의류 쇼핑백 D', paper:'아이보리지 210g', spec:'A2',
      qm:5100, qe:100, fq:5000, sd:'2026-04-10', dlv:'테스트거래처D 물류창고',
      ps:'4도 전면인쇄, 유광코팅', mgr:'박영희', vendor:'', price:280, amt:1400000,
      status:'완료대기', pri:4,
      procs:[
        mkProc('인쇄','out','완료', 5100, '2026-03-25T09:00:00', '2026-03-28T18:00:00'),
        mkProc('코팅','n','완료', 5050, '2026-03-29T08:00:00', '2026-03-30T17:00:00'),
        mkProc('합지','n','완료', 5000, '2026-04-01T08:00:00', '2026-04-02T17:00:00'),
        mkProc('톰슨','n','완료', 4990, '2026-04-03T08:00:00', '2026-04-04T16:00:00'),
        mkProc('접착','n','완료', 5000, '2026-04-05T08:00:00', '2026-04-07T17:00:00'),
      ],
      papers:[{paper:'아이보리지 210g',spec:'A2',qm:5100,qe:100}], fabrics:[],
      gold:'',mold:'목형D',hand:'끈손잡이',nt:'끈 색상: 블랙',caut:'',img:'',
      cid:'',pid:'',addr:'인천 남동구',tel:'032-7777-8888',fax:'',
      fabric:'',fabricSpec:'',fabricQty:0,fabricExtra:0,
    },

    // WO-SIM-05: 출고지연! 납기 2026-04-03 (5일 초과), 합지 진행중
    {
      id:'sim_wo_05', wn:'WO-SIM-05', dt:'2026-03-20', cat:NOW,
      cnm:'테스트거래처E', pnm:'납기지연 테스트 박스 E', paper:'백상지 180g', spec:'A3',
      qm:1600, qe:100, fq:1500, sd:'2026-04-03', dlv:'테스트거래처E',  // 납기 초과!
      ps:'2도 인쇄, 무광코팅', mgr:'홍길동', vendor:'', price:550, amt:825000,
      status:'진행중', pri:5,
      procs:[
        mkProc('인쇄','out','완료', 1600, '2026-03-20T09:00:00', '2026-03-24T17:00:00'),
        mkProc('코팅','n','완료', 1580, '2026-03-25T08:00:00', '2026-03-26T17:00:00'),
        mkProc('합지','n','진행중', 0, '2026-04-01T08:00:00'),  // 합지 진행중이지만 납기 초과
        mkProc('톰슨','n','대기'),
        mkProc('접착','n','대기'),
      ],
      papers:[{paper:'백상지 180g',spec:'A3',qm:1600,qe:100}], fabrics:[],
      gold:'',mold:'목형E',hand:'',nt:'납기 지연 발생 - 원자재 수급 문제',caut:'긴급 처리 요망',img:'',
      cid:'',pid:'',addr:'부산 해운대구',tel:'051-3333-4444',fax:'',
      fabric:'',fabricSpec:'',fabricQty:0,fabricExtra:0,
    },
  ];

  // ── hist 완료 기록 (성과분석용) ─────────────────────────
  var SIM_HIST = [
    // WO-SIM-03의 인쇄 완료
    {id:gid(),woId:'sim_wo_03',pnm:'화장품 케이스 C',cnm:'테스트거래처C',proc:'인쇄',worker:'김인쇄',qty:3200,t1:'2026-04-01T09:00:00',t2:'2026-04-04T17:00:00',setupMin:30,doneAt:'2026-04-04'},
    // WO-SIM-04 전공정 완료
    {id:gid(),woId:'sim_wo_04',pnm:'의류 쇼핑백 D',cnm:'테스트거래처D',proc:'인쇄',worker:'김인쇄',qty:5100,t1:'2026-03-25T09:00:00',t2:'2026-03-28T18:00:00',setupMin:45,doneAt:'2026-03-28'},
    {id:gid(),woId:'sim_wo_04',pnm:'의류 쇼핑백 D',cnm:'테스트거래처D',proc:'코팅',worker:'이코팅',qty:5050,t1:'2026-03-29T08:00:00',t2:'2026-03-30T17:00:00',setupMin:20,doneAt:'2026-03-30'},
    {id:gid(),woId:'sim_wo_04',pnm:'의류 쇼핑백 D',cnm:'테스트거래처D',proc:'합지',worker:'박합지',qty:5000,t1:'2026-04-01T08:00:00',t2:'2026-04-02T17:00:00',setupMin:15,doneAt:'2026-04-02'},
    {id:gid(),woId:'sim_wo_04',pnm:'의류 쇼핑백 D',cnm:'테스트거래처D',proc:'톰슨',worker:'최톰슨',qty:4990,t1:'2026-04-03T08:00:00',t2:'2026-04-04T16:00:00',setupMin:25,doneAt:'2026-04-04'},
    {id:gid(),woId:'sim_wo_04',pnm:'의류 쇼핑백 D',cnm:'테스트거래처D',proc:'접착',worker:'정접착',qty:5000,t1:'2026-04-05T08:00:00',t2:'2026-04-07T17:00:00',setupMin:10,doneAt:'2026-04-07'},
    // WO-SIM-05 완료된 공정
    {id:gid(),woId:'sim_wo_05',pnm:'납기지연 테스트 박스 E',cnm:'테스트거래처E',proc:'인쇄',worker:'김인쇄',qty:1600,t1:'2026-03-20T09:00:00',t2:'2026-03-24T17:00:00',setupMin:30,doneAt:'2026-03-24'},
    {id:gid(),woId:'sim_wo_05',pnm:'납기지연 테스트 박스 E',cnm:'테스트거래처E',proc:'코팅',worker:'이코팅',qty:1580,t1:'2026-03-25T08:00:00',t2:'2026-03-26T17:00:00',setupMin:20,doneAt:'2026-03-26'},
  ];

  // ── defectLog 불량 기록 (품질관리용) ─────────────────────
  var SIM_DEFECT = [
    {id:gid(),woId:'sim_wo_03',wn:'WO-SIM-03',pnm:'화장품 케이스 C',cnm:'테스트거래처C',proc:'인쇄',defect:12,reason:'잉크번짐',worker:'김인쇄',dt:'2026-04-02',tm:'10:30'},
    {id:gid(),woId:'sim_wo_04',wn:'WO-SIM-04',pnm:'의류 쇼핑백 D',cnm:'테스트거래처D',proc:'코팅',defect:8,reason:'기포발생',worker:'이코팅',dt:'2026-03-30',tm:'14:20'},
    {id:gid(),woId:'sim_wo_04',wn:'WO-SIM-04',pnm:'의류 쇼핑백 D',cnm:'테스트거래처D',proc:'합지',defect:3,reason:'밀림',worker:'박합지',dt:'2026-04-02',tm:'11:00'},
    {id:gid(),woId:'sim_wo_05',wn:'WO-SIM-05',pnm:'납기지연 테스트 박스 E',cnm:'테스트거래처E',proc:'코팅',defect:20,reason:'코팅 들뜸',worker:'이코팅',dt:'2026-03-26',tm:'16:00'},
  ];

  // ── 데이터 주입 ───────────────────────────────────────────
  // 1. WO 주입 (월별 키 ino_wo_YYYY-MM 방식)
  var moMap = {};
  SIM_WOS.forEach(function(wo){
    var mo = wo.sd.slice(0,7);  // 납기월 기준
    if(!moMap[mo]) moMap[mo] = [];
    moMap[mo].push(wo);
  });

  // 기존 데이터와 병합 (시뮬레이션 데이터만 교체)
  Object.keys(moMap).forEach(function(mo){
    var key = 'ino_wo_'+mo;
    var existing = [];
    try{ existing = JSON.parse(localStorage.getItem(key))||[]; }catch(e){}
    // 기존 시뮬레이션 데이터 제거 후 새로 추가
    var filtered = existing.filter(function(o){ return !o.id.startsWith('sim_wo_'); });
    var merged = filtered.concat(moMap[mo]);
    localStorage.setItem(key, JSON.stringify(merged));
  });

  // 2. hist 주입
  var existHist = [];
  try{ existHist = JSON.parse(localStorage.getItem('ino_hist'))||[]; }catch(e){}
  var filtHist = existHist.filter(function(h){ return !h.woId.startsWith('sim_wo_'); });
  localStorage.setItem('ino_hist', JSON.stringify(filtHist.concat(SIM_HIST)));

  // 3. defectLog 주입
  var existDef = [];
  try{ existDef = JSON.parse(localStorage.getItem('ino_defectLog'))||[]; }catch(e){}
  var filtDef = existDef.filter(function(d){ return !d.woId.startsWith('sim_wo_'); });
  localStorage.setItem('ino_defectLog', JSON.stringify(filtDef.concat(SIM_DEFECT)));

  // 4. 캐시 초기화 (DB._cache 리셋)
  if(window.DB && DB._cache){
    Object.keys(DB._cache).forEach(function(k){
      if(k.indexOf('ino_wo')===0||k==='ino_hist'||k==='ino_defectLog') delete DB._cache[k];
    });
  }

  console.log('%c✅ 시뮬레이션 데이터 주입 완료!', 'color:green;font-size:16px;font-weight:bold');
  console.log('WO-SIM-01: 전공정 대기 (납기 D-12)');
  console.log('WO-SIM-02: 인쇄소(외주) 진행중 (납기 D-7)');
  console.log('WO-SIM-03: 인쇄 완료 입고, 코팅 진행중 (납기 D-4)');
  console.log('WO-SIM-04: 전공정 완료, 확인 대기 (납기 D-2)');
  console.log('WO-SIM-05: 출고지연! 5일 초과 (납기 2026-04-03)');
  console.log('------');
  console.log('페이지 새로고침 후 확인하세요 (F5)');

})();


/* ══════════════════════════════════════════════
   ■ 시뮬레이션 데이터 전체 제거 (초기화)
   아래 코드를 콘솔에 붙여넣으면 시뮬레이션 데이터만 삭제됩니다
   ══════════════════════════════════════════════

(function(){
  var months = ['2026-04','2026-03'];
  months.forEach(function(mo){
    var key = 'ino_wo_'+mo;
    var existing = [];
    try{ existing = JSON.parse(localStorage.getItem(key))||[]; }catch(e){}
    var cleaned = existing.filter(function(o){ return !o.id.startsWith('sim_wo_'); });
    localStorage.setItem(key, JSON.stringify(cleaned));
  });
  var hist = [];
  try{ hist = JSON.parse(localStorage.getItem('ino_hist'))||[]; }catch(e){}
  localStorage.setItem('ino_hist', JSON.stringify(hist.filter(function(h){ return !h.woId.startsWith('sim_wo_'); })));
  var def = [];
  try{ def = JSON.parse(localStorage.getItem('ino_defectLog'))||[]; }catch(e){}
  localStorage.setItem('ino_defectLog', JSON.stringify(def.filter(function(d){ return !d.woId.startsWith('sim_wo_'); })));
  if(window.DB && DB._cache){ Object.keys(DB._cache).forEach(function(k){ if(k.indexOf('ino_wo')===0||k==='ino_hist'||k==='ino_defectLog') delete DB._cache[k]; }); }
  console.log('%c🗑️ 시뮬레이션 데이터 제거 완료. F5 새로고침하세요.', 'color:red;font-size:14px;font-weight:bold');
})();

*/
