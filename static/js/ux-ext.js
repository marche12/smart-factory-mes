/* ================================================================
   ux-ext.js — 월말 마감 리포트 + 키보드 단축키 치트시트
   Load after ui-enhance.js
   ================================================================ */
(function(){
'use strict';

/* ==========================================================
   1. 월말 마감 리포트
   ========================================================== */
function _mrMonth(){
  var d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
function _mrRange(ym){
  var y=parseInt(ym.slice(0,4),10), m=parseInt(ym.slice(5,7),10);
  var from=ym+'-01';
  var lastDay=new Date(y,m,0).getDate();
  var to=ym+'-'+String(lastDay).padStart(2,'0');
  return {from:from,to:to};
}
function _inRange(dt,from,to){return dt && dt>=from && dt<=to;}
function _sumAmt(list,key){key=key||'amt';return list.reduce(function(s,x){return s+(+x[key]||0);},0);}

function openMonthlyReport(ym){
  ym=ym||_mrMonth();
  var el=document.getElementById('mrCloseMo');
  if(!el){
    el=document.createElement('div');
    el.id='mrCloseMo';
    el.className='mo-bg';
    el.onclick=function(e){if(e.target===el)cMo('mrCloseMo');};
    el.innerHTML=
      '<div class="mo" style="width:min(960px,95vw);max-height:92vh;overflow:auto">'
      +'<div class="mo-t" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">'
      +'<span>월말 마감 리포트</span>'
      +'<div style="display:flex;gap:8px;align-items:center">'
      +'<input type="month" id="mrYm" value="'+ym+'" style="padding:6px 10px;font-size:13px;border:1px solid var(--bdr);border-radius:6px">'
      +'<button class="btn btn-sm btn-o" onclick="renderMonthlyReport()">조회</button>'
      +'<button class="btn btn-sm btn-s" onclick="exportMonthlyCSV()">CSV</button>'
      +'<button class="btn btn-sm btn-p" onclick="printMonthlyReport()">출력</button>'
      +'<button class="mo-x" onclick="cMo(\'mrCloseMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button>'
      +'</div></div>'
      +'<div class="mo-b"><div id="mrBody">조회 중...</div></div>'
      +'</div>';
    document.body.appendChild(el);
  }
  oMo('mrCloseMo');
  renderMonthlyReport();
}
window.openMonthlyReport=openMonthlyReport;

function renderMonthlyReport(){
  var ymEl=document.getElementById('mrYm');
  var ym=ymEl?ymEl.value:_mrMonth();
  var r=_mrRange(ym);
  var body=document.getElementById('mrBody');
  if(!body)return;

  var sales=(DB.g('sales')||[]).filter(function(s){return _inRange(s.dt,r.from,r.to);});
  var purchase=(DB.g('purchase')||[]).filter(function(p){return _inRange(p.dt,r.from,r.to);});
  var tax=(DB.g('taxInvoice')||[]).filter(function(t){return _inRange(t.dt,r.from,r.to);});
  var etax=(DB.g('etax')||[]).filter(function(t){return _inRange(t.dt,r.from,r.to);});
  var ship=(DB.g('shipLog')||[]).filter(function(s){return _inRange(s.dt,r.from,r.to);});
  var income=(DB.g('income')||[]).filter(function(i){return _inRange(i.dt,r.from,r.to);});
  var claims=(DB.g('claims')||[]).filter(function(c){return _inRange(c.dt,r.from,r.to);});

  var salesSum=_sumAmt(sales,'amt');
  var returnSum=sales.filter(function(s){return (s.amt||0)<0;}).reduce(function(s,x){return s+Math.abs(+x.amt||0);},0);
  var purchaseSum=_sumAmt(purchase,'amt');
  var profit=salesSum-purchaseSum;

  // 미수/미지급 (전체 누적)
  var unpaidRecv=(DB.g('sales')||[]).reduce(function(s,x){return s+Math.max(0,(+x.amt||0)-(+x.paid||0));},0);
  var unpaidPay=(DB.g('purchase')||[]).reduce(function(s,x){return s+Math.max(0,(+x.amt||0)-(+x.paid||0));},0);

  // 거래처 TOP 5
  var byCli={};
  sales.forEach(function(s){var n=s.cnm||s.cli||'-';byCli[n]=(byCli[n]||0)+(+s.amt||0);});
  var topCli=Object.keys(byCli).map(function(n){return {nm:n,amt:byCli[n]};}).sort(function(a,b){return b.amt-a.amt;}).slice(0,5);

  // 품목 TOP 5 (매출 기준)
  var byProd={};
  sales.forEach(function(s){var n=s.pnm||'-';byProd[n]=(byProd[n]||0)+(+s.amt||0);});
  var topProd=Object.keys(byProd).map(function(n){return {nm:n,amt:byProd[n]};}).sort(function(a,b){return b.amt-a.amt;}).slice(0,5);

  var f=function(n){return Number(n).toLocaleString('ko-KR');};
  var kpi=function(label,value,sub,tone){
    return '<div class="mr-kpi mr-kpi-'+(tone||'pri')+'">'
      +'<div class="mr-kpi-label">'+label+'</div>'
      +'<div class="mr-kpi-value">'+value+'</div>'
      +'<div class="mr-kpi-sub">'+(sub||'')+'</div></div>';
  };

  var html=''
    +'<div style="margin-bottom:14px;font-size:13px;color:var(--txt2)"><b>'+ym+'</b> · 기간 '+r.from+' ~ '+r.to+'</div>'
    +'<div class="mr-kpi-grid">'
    +kpi('매출 합계',f(salesSum)+'원','건수 '+sales.length+'건','pri')
    +kpi('매입 합계',f(purchaseSum)+'원','건수 '+purchase.length+'건','warn')
    +kpi('영업 손익',(profit>=0?'+':'')+f(profit)+'원','매출-매입',profit>=0?'green':'danger')
    +kpi('반품 차감',f(returnSum)+'원','반품 '+claims.filter(function(c){return c.type==='반품';}).length+'건','danger')
    +kpi('세금계산서',tax.length+'건','전자 '+etax.length+'건','pri')
    +kpi('출고 건수',ship.length+'건','총 '+f(_sumAmt(ship,'qty'))+'매','green')
    +kpi('입고 건수',income.length+'건','총 '+f(_sumAmt(income,'qty'))+'매','pri')
    +kpi('미수금(누적)',f(unpaidRecv)+'원','전체 미회수','warn')
    +'</div>';

  html+='<div style="margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:14px">';
  html+='<div class="mr-section"><div class="mr-section-t">거래처 TOP 5 (매출)</div>'
    +'<table class="dt"><thead><tr><th>거래처</th><th style="text-align:right">매출액</th><th style="text-align:right">비중</th></tr></thead><tbody>'
    +(topCli.length?topCli.map(function(c){
      var pct=salesSum?Math.round(c.amt*100/salesSum):0;
      return '<tr><td>'+c.nm+'</td><td style="text-align:right">'+f(c.amt)+'원</td><td style="text-align:right">'+pct+'%</td></tr>';
    }).join(''):'<tr><td colspan="3" class="empty-cell">데이터 없음</td></tr>')
    +'</tbody></table></div>';

  html+='<div class="mr-section"><div class="mr-section-t">품목 TOP 5 (매출)</div>'
    +'<table class="dt"><thead><tr><th>품목</th><th style="text-align:right">매출액</th><th style="text-align:right">비중</th></tr></thead><tbody>'
    +(topProd.length?topProd.map(function(p){
      var pct=salesSum?Math.round(p.amt*100/salesSum):0;
      return '<tr><td>'+p.nm+'</td><td style="text-align:right">'+f(p.amt)+'원</td><td style="text-align:right">'+pct+'%</td></tr>';
    }).join(''):'<tr><td colspan="3" class="empty-cell">데이터 없음</td></tr>')
    +'</tbody></table></div>';
  html+='</div>';

  html+='<div class="mr-section" style="margin-top:18px"><div class="mr-section-t">세금계산서 발행 현황</div>'
    +'<table class="dt"><thead><tr><th>일자</th><th>거래처</th><th style="text-align:right">공급가</th><th style="text-align:right">세액</th><th style="text-align:right">합계</th><th>종류</th></tr></thead><tbody>'
    +(tax.length?tax.slice(0,30).map(function(t){
      return '<tr><td>'+t.dt+'</td><td>'+(t.cnm||t.cli||'-')+'</td>'
        +'<td style="text-align:right">'+f(+t.supply||0)+'</td>'
        +'<td style="text-align:right">'+f(+t.vat||0)+'</td>'
        +'<td style="text-align:right;font-weight:700">'+f((+t.supply||0)+(+t.vat||0))+'</td>'
        +'<td>'+(t.amendedKindCode?'수정':'일반')+'</td></tr>';
    }).join(''):'<tr><td colspan="6" class="empty-cell">발행 내역 없음</td></tr>')
    +'</tbody></table></div>';

  body.innerHTML=html;
  window._mrLatest={ym:ym,sales:sales,purchase:purchase,tax:tax,topCli:topCli,topProd:topProd,salesSum:salesSum,purchaseSum:purchaseSum,profit:profit};
}
window.renderMonthlyReport=renderMonthlyReport;

function exportMonthlyCSV(){
  var d=window._mrLatest;if(!d){toast('먼저 조회하세요','err');return;}
  var csv='\uFEFF월말마감 '+d.ym+'\n\n';
  csv+='구분,값\n';
  csv+='매출합계,'+d.salesSum+'\n매입합계,'+d.purchaseSum+'\n영업손익,'+d.profit+'\n\n';
  csv+='[거래처 TOP 5]\n거래처,매출액\n';
  d.topCli.forEach(function(c){csv+=c.nm+','+c.amt+'\n';});
  csv+='\n[세금계산서]\n일자,거래처,공급가,세액,합계,종류\n';
  d.tax.forEach(function(t){csv+=[t.dt,(t.cnm||t.cli||'-'),(+t.supply||0),(+t.vat||0),((+t.supply||0)+(+t.vat||0)),(t.amendedKindCode?'수정':'일반')].join(',')+'\n';});
  var b=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='월말마감_'+d.ym+'.csv';a.click();
  toast('CSV 다운로드','ok');
}
window.exportMonthlyCSV=exportMonthlyCSV;

function printMonthlyReport(){
  var body=document.getElementById('mrBody');if(!body)return;
  var d=window._mrLatest;
  var co=DB.g1?DB.g1('co'):{nm:'팩플로우'};
  var w=window.open('','_blank');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>월말마감 '+(d?d.ym:'')+'</title>'
    +'<style>body{font-family:-apple-system,"Pretendard",sans-serif;font-size:12px;padding:20mm;color:#0F172A}h1{font-size:20px;margin-bottom:4px}.meta{color:#64748B;font-size:12px;margin-bottom:18px}.mr-kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}.mr-kpi{padding:12px;border:1px solid #E2E8F0;border-radius:8px;background:#F8FAFC}.mr-kpi-label{font-size:11px;color:#64748B;font-weight:700;margin-bottom:3px}.mr-kpi-value{font-size:17px;font-weight:800}.mr-kpi-sub{font-size:10px;color:#94A3B8;margin-top:2px}.mr-section{margin-top:18px}.mr-section-t{font-weight:700;margin-bottom:8px;font-size:13px;border-left:3px solid #1E3A5F;padding-left:8px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #CBD5E1;padding:5px 7px;font-size:11px;text-align:left}th{background:#EEF3FF}.empty-cell{color:#94A3B8;text-align:center;padding:12px}@media print{@page{size:A4;margin:12mm}}</style></head><body>'
    +'<h1>'+(co.nm||'팩플로우')+' — 월말 마감 리포트</h1><div class="meta">'+(d?d.ym:'')+' / 발행일 '+td()+'</div>'
    +body.innerHTML
    +'</body></html>');
  w.document.close();
  setTimeout(function(){w.print();},400);
}
window.printMonthlyReport=printMonthlyReport;


/* ==========================================================
   2. 키보드 단축키 치트시트
   Press `?` (Shift+/) to open
   ========================================================== */
var SHORTCUTS=[
  {keys:['?'],            label:'이 치트시트 열기'},
  {keys:['⌘','K'],        label:'전역 검색 (거래처·품목·작업지시)'},
  {keys:['Esc'],          label:'열린 모달/검색 닫기'},
  {keys:['G','H'],        label:'홈(대시보드)로 이동'},
  {keys:['G','O'],        label:'견적·수주 화면'},
  {keys:['G','W'],        label:'작업지시서'},
  {keys:['G','S'],        label:'출고 준비'},
  {keys:['G','C'],        label:'거래처'},
  {keys:['N','O'],        label:'새 수주 등록'},
  {keys:['N','W'],        label:'새 작업지시 등록'},
  {keys:['N','Q'],        label:'새 견적 등록'},
  {keys:['M'],            label:'월말 마감 리포트'},
  {keys:['C'],            label:'동시수정 충돌 이력 (관리자)'},
  {keys:['B'],            label:'오늘 아침 브리핑 다시 보기'},
  {keys:['R'],            label:'현재 화면 새로고침'},
  {keys:['/'],            label:'현재 화면의 검색창에 포커스'}
];

function openShortcuts(){
  var el=document.getElementById('kbCheatMo');
  if(!el){
    el=document.createElement('div');
    el.id='kbCheatMo';
    el.className='mo-bg';
    el.onclick=function(e){if(e.target===el)cMo('kbCheatMo');};
    var body=SHORTCUTS.map(function(s){
      var keys=s.keys.map(function(k){return '<kbd class="kb-key">'+k+'</kbd>';}).join('<span class="kb-sep">+</span>');
      return '<div class="kb-row"><div class="kb-keys">'+keys+'</div><div class="kb-label">'+s.label+'</div></div>';
    }).join('');
    el.innerHTML='<div class="mo" style="width:min(560px,95vw)">'
      +'<div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">'
      +'<span>키보드 단축키</span>'
      +'<button class="mo-x" onclick="cMo(\'kbCheatMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button>'
      +'</div>'
      +'<div class="mo-b" style="max-height:70vh;overflow:auto">'+body+'<div style="margin-top:14px;padding:10px;background:#F8FAFC;border-radius:8px;font-size:11px;color:#64748B">팁: <kbd class="kb-key">G</kbd> <kbd class="kb-key">H</kbd> 같은 조합은 순서대로 눌러주세요 (Gmail 스타일).</div></div>'
      +'</div>';
    document.body.appendChild(el);
  }
  oMo('kbCheatMo');
}
window.openShortcuts=openShortcuts;

/* 2-step chord tracking (e.g. G → H) */
var _chord=null, _chordTimer=null;
function _clearChord(){_chord=null;if(_chordTimer){clearTimeout(_chordTimer);_chordTimer=null;}}
function _armChord(prefix){
  _chord=prefix;
  if(_chordTimer)clearTimeout(_chordTimer);
  _chordTimer=setTimeout(_clearChord,1200);
}

var _go=function(mod){if(typeof goMod==='function')goMod(mod);};
var _open=function(fn){if(typeof window[fn]==='function')window[fn]();};

document.addEventListener('keydown',function(e){
  // Skip when typing in input/textarea/contenteditable
  var t=e.target;
  if(t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable))return;
  // Skip when modifier keys are involved (except for explicit shortcuts)
  if(e.altKey||e.ctrlKey||e.metaKey)return;

  var k=(e.key||'').toLowerCase();

  // `?` opens cheatsheet
  if(e.key==='?'){e.preventDefault();openShortcuts();return;}

  // Chord prefixes
  if(_chord==='g'){
    _clearChord();
    if(k==='h'){e.preventDefault();_go('mes-dash');return;}
    if(k==='o'){e.preventDefault();_go('mes-quote');return;}
    if(k==='w'){e.preventDefault();_go('mes-wo');return;}
    if(k==='s'){e.preventDefault();_go('mes-ship');return;}
    if(k==='c'){e.preventDefault();_go('mes-cli');return;}
    return;
  }
  if(_chord==='n'){
    _clearChord();
    if(k==='o'){e.preventDefault();_go('mes-quote');_open('openOrderForm');return;}
    if(k==='w'){e.preventDefault();_go('mes-wo');_open('openWOForm');_open('resetWO');return;}
    if(k==='q'){e.preventDefault();_go('mes-quote');_open('openQtM');return;}
    return;
  }

  if(k==='g'){e.preventDefault();_armChord('g');return;}
  if(k==='n'){e.preventDefault();_armChord('n');return;}
  if(k==='m'){e.preventDefault();openMonthlyReport();return;}
  if(k==='c'){e.preventDefault();openConflictLog();return;}
  if(k==='b'){
    e.preventDefault();
    try{localStorage.removeItem('ino_morningBrief:'+td());}catch(e2){}
    showMorningBriefing();
    return;
  }
  if(k==='r'){
    var mod=(typeof currentMod!=='undefined')?currentMod:null;
    if(mod&&typeof goMod==='function'){e.preventDefault();goMod(mod);}
    return;
  }
  if(k==='/'){
    var inp=document.querySelector('.main-content input[type="search"], .main-content input[placeholder*="검색"]');
    if(inp){e.preventDefault();inp.focus();}
  }
});


/* ==========================================================
   3. 동시수정 충돌 이력 패널 (관리자)
   ========================================================== */
function openConflictLog(){
  var el=document.getElementById('cfLogMo');
  if(!el){
    el=document.createElement('div');
    el.id='cfLogMo';
    el.className='mo-bg';
    el.onclick=function(e){if(e.target===el)cMo('cfLogMo');};
    el.innerHTML='<div class="mo" style="width:min(820px,95vw);max-height:90vh;overflow:auto">'
      +'<div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">'
      +'<span>동시 수정 충돌 이력</span>'
      +'<div style="display:flex;gap:8px;align-items:center">'
      +'<button class="btn btn-sm btn-o" onclick="renderConflictLog()">새로고침</button>'
      +'<button class="btn btn-sm btn-d" onclick="if(confirm(\'충돌 이력을 전부 삭제하시겠습니까?\')){DB.clearConflictLog();renderConflictLog()}">기록 삭제</button>'
      +'<button class="mo-x" onclick="cMo(\'cfLogMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button>'
      +'</div></div>'
      +'<div class="mo-b"><div id="cfLogBody">조회 중...</div></div>'
      +'</div>';
    document.body.appendChild(el);
  }
  oMo('cfLogMo');
  renderConflictLog();
}
window.openConflictLog=openConflictLog;

function renderConflictLog(){
  var body=document.getElementById('cfLogBody');if(!body)return;
  var log=(typeof DB!=='undefined'&&DB.getConflictLog)?DB.getConflictLog():[];
  if(!log.length){
    body.innerHTML='<div style="padding:40px 20px;text-align:center;color:#94A3B8">기록된 충돌 이력이 없습니다.</div>';
    return;
  }
  var pending=log.filter(function(x){return x.status==='pending';}).length;
  var resolved=log.length-pending;
  var labelMap={'ino_cli':'거래처','ino_prod':'품목','ino_orders':'수주','ino_quotes':'견적','ino_wo':'작업지시','ino_shipLog':'출고','ino_stock':'재고','ino_income':'입고','ino_purchase':'매입','ino_sales':'매출','ino_taxInvoice':'세금계산서','ino_etax':'전자세금계산서','ino_claims':'반품/클레임'};
  var html=''
    +'<div style="display:flex;gap:10px;margin-bottom:14px">'
    +'<div class="mr-kpi mr-kpi-pri" style="flex:1"><div class="mr-kpi-label">총 충돌</div><div class="mr-kpi-value">'+log.length+'건</div></div>'
    +'<div class="mr-kpi mr-kpi-warn" style="flex:1"><div class="mr-kpi-label">미해결</div><div class="mr-kpi-value">'+pending+'건</div></div>'
    +'<div class="mr-kpi mr-kpi-green" style="flex:1"><div class="mr-kpi-label">해결됨</div><div class="mr-kpi-value">'+resolved+'건</div></div>'
    +'</div>'
    +'<table class="dt"><thead><tr><th>일시</th><th>대상</th><th>사용자</th><th style="text-align:right">로컬 크기</th><th style="text-align:right">서버 크기</th><th>상태</th><th>해소</th></tr></thead><tbody>';
  log.forEach(function(r){
    var stBadge=r.status==='pending'
      ? '<span class="bd bd-d">미해결</span>'
      : r.status==='내변경-재저장'
        ? '<span class="bd bd-p">내변경 재저장</span>'
        : '<span class="bd bd-s">서버값 유지</span>';
    var at=r.at?r.at.slice(0,16).replace('T',' '):'-';
    var rAt=r.resolvedAt?r.resolvedAt.slice(0,16).replace('T',' '):'-';
    var label=labelMap[r.key]||r.key.replace(/^ino_/,'');
    html+='<tr>'
      +'<td style="white-space:nowrap">'+at+'</td>'
      +'<td>'+label+' <span style="font-size:10px;color:#94A3B8">'+r.key+'</span></td>'
      +'<td>'+(r.user||'-')+'</td>'
      +'<td style="text-align:right">'+Number(r.localSize||0).toLocaleString()+'</td>'
      +'<td style="text-align:right">'+Number(r.serverSize||0).toLocaleString()+'</td>'
      +'<td>'+stBadge+'</td>'
      +'<td style="white-space:nowrap;font-size:11px;color:#64748B">'+rAt+'</td>'
      +'</tr>';
  });
  html+='</tbody></table>';
  body.innerHTML=html;
}
window.renderConflictLog=renderConflictLog;


/* ==========================================================
   4. 아침 브리핑 카드 (로그인 1회)
   ========================================================== */
function showMorningBriefing(){
  var seenKey='ino_morningBrief:'+td();
  try{if(localStorage.getItem(seenKey))return;}catch(e){}
  var wo=DB.g('wo')||[];
  var today=td();
  var dueToday=wo.filter(function(o){
    if(o.status==='완료'||o.status==='출고완료'||o.status==='취소')return false;
    return o.sd===today;
  });
  var urgent=wo.filter(function(o){
    if(o.status==='완료'||o.status==='출고완료'||o.status==='취소')return false;
    if(!o.sd)return false;
    var d=Math.round((new Date(o.sd+'T00:00:00')-new Date(today+'T00:00:00'))/86400000);
    return d>=0&&d<=1;
  });
  var overdue=wo.filter(function(o){
    if(o.status==='완료'||o.status==='출고완료'||o.status==='취소')return false;
    if(!o.sd)return false;
    return o.sd<today;
  });
  var unpaid=0,unpaidCnt=0;
  (DB.g('sales')||[]).forEach(function(s){
    var u=(+s.amt||0)-(+s.paid||0);
    if(u>0){unpaid+=u;unpaidCnt++;}
  });
  var lowStock=(DB.g('stock')||[]).filter(function(s){
    var c=+(s.qty||0),sf=+(s.safeQty||s.safe||0);
    return sf>0&&c<sf;
  }).length;
  var pendingClaims=(DB.g('claims')||[]).filter(function(c){return c.type==='반품'&&c.st!=='완료';}).length;
  var hasSignal=dueToday.length||urgent.length||overdue.length||unpaid||lowStock||pendingClaims;
  if(!hasSignal)return;

  var el=document.createElement('div');
  el.id='morningBriefMo';
  el.className='mo-bg';
  el.onclick=function(e){if(e.target===el){try{localStorage.setItem(seenKey,'1');}catch(e2){}cMo('morningBriefMo');}};
  var f=function(n){return Number(n).toLocaleString('ko-KR');};
  var now=new Date();
  var hour=now.getHours();
  var greet=hour<10?'좋은 아침입니다':hour<14?'점심 전 체크':hour<18?'오후 업무 체크':'하루 마무리';
  var list=[];
  if(overdue.length)list.push({ico:'⚠️',label:'납기 지연',val:overdue.length+'건',sub:'즉시 처리 필요',tone:'danger',action:"goMod('mes-wo')"});
  if(dueToday.length)list.push({ico:'🗓',label:'오늘 납기',val:dueToday.length+'건',sub:'오늘까지 완료',tone:'warn',action:"goMod('mes-wo')"});
  if(urgent.length)list.push({ico:'🔥',label:'급한 WO',val:urgent.length+'건',sub:'1일 이내 납기',tone:'warn',action:"goMod('mes-wo')"});
  if(lowStock)list.push({ico:'📦',label:'안전재고 미만',val:lowStock+'품목',sub:'발주 검토',tone:'warn',action:"goMod('mat-safety')"});
  if(pendingClaims)list.push({ico:'↩️',label:'미처리 반품',val:pendingClaims+'건',sub:'완료 시 자동 역처리',tone:'pri',action:"goMod('mes-claim')"});
  if(unpaidCnt)list.push({ico:'💰',label:'미수금',val:f(unpaid)+'원',sub:unpaidCnt+'건 누적',tone:'pri',action:"goMod('acc-recv')"});

  el.innerHTML='<div class="mo" style="width:min(680px,95vw)">'
    +'<div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">'
    +'<div><div style="font-size:17px;font-weight:800">'+greet+', '+((typeof CU!=='undefined'&&CU&&CU.nm)||'관리자')+'님</div>'
    +'<div style="font-size:12px;color:#64748B;margin-top:2px">'+today+' · 오늘의 빠른 체크</div></div>'
    +'<button class="mo-x" onclick="try{localStorage.setItem(\''+seenKey+'\',\'1\')}catch(e){};cMo(\'morningBriefMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button>'
    +'</div>'
    +'<div class="mo-b">'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">'
    +list.map(function(x){
      return '<button onclick="try{localStorage.setItem(\''+seenKey+'\',\'1\')}catch(e){};cMo(\'morningBriefMo\');'+x.action+'" class="mr-kpi mr-kpi-'+x.tone+'" style="text-align:left;cursor:pointer;border:1px solid;border-color:inherit">'
        +'<div class="mr-kpi-label">'+x.ico+' '+x.label+'</div>'
        +'<div class="mr-kpi-value">'+x.val+'</div>'
        +'<div class="mr-kpi-sub">'+x.sub+'</div></button>';
    }).join('')
    +'</div>'
    +'<div style="text-align:right;margin-top:14px">'
    +'<button class="btn btn-o btn-sm" onclick="try{localStorage.setItem(\''+seenKey+'\',\'1\')}catch(e){};cMo(\'morningBriefMo\')">닫기 (오늘 다시 안 보기)</button>'
    +'</div></div></div>';
  document.body.appendChild(el);
  setTimeout(function(){el.classList.add('show');oMo('morningBriefMo');},50);
}
window.showMorningBriefing=showMorningBriefing;

/* 로그인 완료 후 2초 뒤 브리핑 체크 */
(function(){
  var origUnifiedLogin=window.unifiedLogin;
  if(typeof origUnifiedLogin==='function'){
    window.unifiedLogin=async function(){
      var r=await origUnifiedLogin.apply(this,arguments);
      setTimeout(function(){try{showMorningBriefing();}catch(e){console.warn(e);}},2500);
      return r;
    };
  }
})();

/* Expose to nav: 사용자 프로필 드롭다운이 있으면 링크 추가 예정 */
console.log('[ux-ext] 월말 마감 + 단축키 + 충돌 이력 + 아침 브리핑 로드됨. ? M G C 단축키 사용');

})();
