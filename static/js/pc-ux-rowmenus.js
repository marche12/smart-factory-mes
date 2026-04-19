/* ================================================================
   pc-ux-rowmenus.js — 리스트 행 우클릭 공통 메뉴 (실제 적용 레이어)
   - 기존 함수(openCliLedgerPanel, editOrder, copyWO, cancelShipById, …)를
     "내부 재사용"하여 UI만 uxCtxOpen() 으로 통일
   - 삭제 정책·데이터 정합성 로직은 건드리지 않고, 기존 함수 호출만 함
   - capture phase 로 등록되어 각 화면의 기존 oncontextmenu="return openXxx..."
     과 충돌 없이 우선권을 가진다 (각 기존 핸들러도 제자리 동작 OK)
   ================================================================ */
(function(){
'use strict';

/* 기존 전역 함수가 있을 때만 호출 (없으면 no-op) */
function safe(fn, args){
  try{ if(typeof window[fn] === 'function') return window[fn].apply(window, args||[]); }
  catch(e){ console.warn('[pc-ux-rowmenus]', fn, e); }
}

/* onclick 속성에서 id 추출: openXxx('ID') / editXxx('ID') 등 */
function extractId(onclick, hintFn){
  if(!onclick) return '';
  var re = new RegExp((hintFn||'\\w+')+"\\s*\\(\\s*['\"]([^'\"]+)['\"]", 'i');
  var m = onclick.match(re);
  return m ? m[1] : '';
}
function rowIdFromOnclick(row, hintFn){
  var oc = row.getAttribute('onclick') || '';
  var id = extractId(oc, hintFn);
  if(id) return id;
  // 각 셀 안 버튼 onclick에서도 시도
  var btns = row.querySelectorAll('button[onclick], a[onclick]');
  for(var i=0;i<btns.length;i++){
    id = extractId(btns[i].getAttribute('onclick'), hintFn);
    if(id) return id;
  }
  return '';
}

/* ============ 화면별 메뉴 빌더 ============ */

function buildCliMenu(id){
  var c = (DB.g('cli')||[]).find(function(x){return x.id===id;});
  if(!c) return [];
  var isFav = !!c.isFavorite;
  var isDormant = !!c.isDormant;
  return [
    {label:'상세 확인',  action:function(){ safe('openCliLedgerPanel',[id]); }},
    {label:isFav?'즐겨찾기 해제':'즐겨찾기 추가', action:function(){ safe('toggleCliFavorite',[id]); }},
    {label:isDormant?'휴면 해제':'휴면 처리', action:function(){ safe('toggleCliDormant',[id]); }},
    {separator:true},
    {label:'수정',        action:function(){ safe('eCli',[id]); }},
    {label:'거래원장 보기', action:function(){ safe('openCliLedgerPanel',[id]); }},
    {label:'오늘 거래',    action:function(){ safe('openCliLedgerPanel',[id,'today']); }},
    {label:'7일 거래',     action:function(){ safe('openCliLedgerPanel',[id,'7d']); }},
    {separator:true},
    {label:'삭제',         action:function(){ safe('dCli',[id]); }, danger:true}
  ];
}

function buildProdMenu(id){
  var p = (DB.g('prod')||[]).find(function(x){return x.id===id;});
  if(!p) return [];
  return [
    {label:'상세 확인',   action:function(){ safe('openProdLedgerPanel',[id]); }},
    {label:p.isFavorite?'즐겨찾기 해제':'즐겨찾기 추가', action:function(){ safe('toggleProdFavorite',[id]); }},
    {label:'수정',        action:function(){ safe('eProd',[id]); }},
    {separator:true},
    {label:'최근 작업 보기', action:function(){ safe('openProdLedgerPanel',[id,'recent']); }},
    {label:'BOM 보기',      action:function(){ safe('goMod',['mat-bom']); }},
    {separator:true},
    {label:'삭제',         action:function(){ safe('dProd',[id]); }, danger:true}
  ];
}

function buildOrderMenu(id){
  var o = (typeof getOrders==='function'?getOrders():DB.g('orders')||[]).find(function(x){return x.id===id;});
  if(!o) return [];
  var cli = (DB.g('cli')||[]).find(function(x){return x.nm===o.cli;});
  var summary = (typeof summarizeOrderFlow==='function')
    ? summarizeOrderFlow(o, DB.g('wo')||[], DB.g('shipLog')||[])
    : {woIds:[], shipCount:0};
  var salesCount = (DB.g('sales')||[]).filter(function(s){ return s && s.orderId===id; }).length;
  var hasLinkedDocs = !!((summary.woIds&&summary.woIds.length) || summary.shipCount || salesCount);
  var items = [
    {label:'상세 확인',      action:function(){ safe('openOrderLedgerPanel',[id]); }},
    {label:'수정',           action:function(){ safe('editOrder',[id]); }},
    {label:'복제',           action:function(){ safe('cloneOrder',[id]); }},
    {separator:true},
    {label:'작업지시 생성',   action:function(){ safe('orderToWO',[id]); }},
    {label:'거래처 원장 보기', action:function(){ if(cli) safe('openCliLedgerPanel',[cli.id]); }}
  ];
  items.push({separator:true});
  if(hasLinkedDocs){
    items.push({
      label:'삭제 불가 (연결 문서 있음)',
      action:function(){
        var bits=[];
        if(summary.woIds&&summary.woIds.length)bits.push('작업지시 '+summary.woIds.length+'건');
        if(summary.shipCount)bits.push('출고 '+summary.shipCount+'건');
        if(salesCount)bits.push('매출 '+salesCount+'건');
        alert('이 수주는 연결 문서가 있어 삭제할 수 없습니다.\n\n'+bits.join(', ')+'\n\n삭제 대신 상세 화면에서 진행 상태를 확인하세요.');
      }
    });
  }else{
    items.push({label:'삭제', action:function(){ safe('delOrder',[id]); }, danger:true});
  }
  return items;
}

function buildWOMenu(id){
  var w = (DB.g('wo')||[]).find(function(x){return x.id===id;});
  if(!w) return [];
  var cli = (DB.g('cli')||[]).find(function(x){return x.nm===w.cnm;});
  var items = [
    {label:'상세 보기',      action:function(){ safe('showDet',[id]); }},
    {label:'수정',           action:function(){ safe('editWO',[id]); }},
    {label:'복제',           action:function(){ safe('copyWO',[id]); }},
    {separator:true},
    {label:'외주 등록',       action:function(){ safe('goMod',['mes-outsource']); }},
    {label:'출고 준비 보기',  action:function(){ safe('goMod',['mes-ship']); }},
    {label:'인쇄 / 출력',     action:function(){ safe('printWO',[id]); }},
    {label:'템플릿 저장',     action:function(){ safe('saveAsTpl',[id]); }},
    {separator:true}
  ];
  if(w.status==='취소'){
    items.push({label:'복원', action:function(){ safe('restoreWO',[id]); }});
    items.push({label:'삭제', action:function(){ safe('delWO',[id]); }, danger:true});
  } else if(w.status!=='완료' && w.status!=='출고완료'){
    if(w.status==='보류') items.push({label:'보류 해제', action:function(){ safe('restoreWO',[id]); }});
    else items.push({label:'보류 처리', action:function(){ safe('holdWO',[id]); }});
    items.push({label:'취소',           action:function(){ safe('cancelWO',[id]); }, danger:true});
  }
  if(cli){
    items.push({separator:true});
    items.push({label:'거래처 원장 보기', action:function(){ safe('openCliLedgerPanel',[cli.id]); }});
  }
  return items;
}

function buildShipReadyMenu(woId){
  var w = (DB.g('wo')||[]).find(function(x){return x.id===woId;});
  if(!w) return [];
  var remain = (w.fq||0) - (typeof getShipped==='function'?getShipped(woId):0);
  var items = [
    {label:'상세 확인',    action:function(){ safe('openShipReadyLedgerPanel',[woId]); }},
  ];
  if(remain>0) items.push({label:'출고 등록', action:function(){ safe('openShipM',[woId]); }});
  items.push({label:'작업지시 상세', action:function(){ safe('showDet',[woId]); }});
  return items;
}

function buildShipHistMenu(shipId){
  var s = (DB.g('shipLog')||[]).find(function(x){return x.id===shipId;});
  if(!s) return [];
  return [
    {label:'상세 보기',       action:function(){ safe('openShipHistLedgerPanel',[shipId]); }},
    {label:'거래명세서',      action:function(){ safe('printTransStatement',[shipId]); }},
    {label:'명세표 (구형)',    action:function(){ safe('printShipOne',[shipId]); }},
    {separator:true},
    {label:'재출고용 복제',    action:function(){
      if(s.woId){ safe('openShipM',[s.woId]); toast && toast('같은 WO로 새 출고 창을 열었습니다','ok'); }
    }},
    {separator:true},
    {label:'출고 취소',       action:function(){ safe('cancelShipById',[shipId]); }, danger:true}
  ];
}

/* ============ 바인딩 — 테이블별 설정 ============ */
var TABLES = [
  {
    id:'cliTbl', rowSelector:'tbody tr',
    hintFn:'openCliLedgerPanel',
    build:buildCliMenu
  },
  {
    id:'prodTbl', rowSelector:'tbody tr',
    hintFn:'openProdLedgerPanel',
    build:buildProdMenu
  },
  {
    id:'orderTbl', rowSelector:'tbody tr',
    hintFn:'openOrderLedgerPanel',
    build:buildOrderMenu
  },
  {
    id:'woTbl', rowSelector:'tbody tr',
    hintFn:'editWO',         // 행에 editWO('id') 버튼 있음
    build:buildWOMenu
  },
  {
    id:'shipReadyTbl', rowSelector:'tbody tr',
    hintFn:'openShipReadyLedgerPanel',
    build:buildShipReadyMenu
  },
  {
    id:'shipHistTbl', rowSelector:'tbody tr',
    hintFn:'openShipHistLedgerPanel',
    build:buildShipHistMenu
  }
];

/* 갤러리 뷰도 커버 (거래처·품목의 gal-card) */
var GAL_CONFIGS = [
  {container:'cliGalleryArea', card:'.gal-card', hintFn:'openCliLedgerPanel', build:buildCliMenu},
  {container:'prodGalleryArea', card:'.gal-card', hintFn:'openProdLedgerPanel', build:buildProdMenu}
];

/* capture phase 에서 contextmenu 가로채기 — 기존 개별 핸들러보다 먼저 실행 */
document.addEventListener('contextmenu', function(e){
  // 어떤 테이블/카드 내부인지 판별
  for(var i=0;i<TABLES.length;i++){
    var cfg = TABLES[i];
    var row = e.target.closest('#'+cfg.id+' '+cfg.rowSelector);
    if(row){
      var id = rowIdFromOnclick(row, cfg.hintFn);
      if(!id) return;
      e.preventDefault();
      e.stopPropagation();  // 기존 oncontextmenu="" 핸들러 중복 실행 방지
      var items;
      try{ items = cfg.build(id); }catch(err){ console.warn(err); return; }
      if(typeof window.uxCtxOpen==='function' && items && items.length){
        window.uxCtxOpen(e, items);
      }
      return;
    }
  }
  for(var j=0;j<GAL_CONFIGS.length;j++){
    var gcfg = GAL_CONFIGS[j];
    var box = document.getElementById(gcfg.container);
    if(box && box.contains(e.target)){
      var card = e.target.closest(gcfg.card);
      if(!card) return;
      var gid = rowIdFromOnclick(card, gcfg.hintFn);
      if(!gid) return;
      e.preventDefault();
      e.stopPropagation();
      var gitems;
      try{ gitems = gcfg.build(gid); }catch(err){ return; }
      if(typeof window.uxCtxOpen==='function' && gitems && gitems.length){
        window.uxCtxOpen(e, gitems);
      }
      return;
    }
  }
}, true); // capture = true

console.log('[pc-ux-rowmenus] 활성화 — 거래처·품목·수주·WO·출고 리스트 공통 우클릭 적용');
})();
