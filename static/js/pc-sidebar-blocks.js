/* ================================================================
   pc-sidebar-blocks.js — 사이드바 상단 3블록
   A. 즐겨찾기 (packflow_sbFav)
   B. 최근 사용 (packflow_sbRecent — 최대 5개)
   C. (기존 그룹은 index.html에 그대로)
   ================================================================ */
(function(){
'use strict';

var FAV_KEY = 'packflow_sbFav';
var RECENT_KEY = 'packflow_sbRecent';
var SEED_KEY = 'packflow_sbFav_seeded_v1';
var MAX_RECENT = 5;

/* 실무 기본 즐겨찾기 5개 — 최초 1회만 시드. 이후 사용자 편집 유지 */
var DEFAULT_FAVS = ['mes-order','mes-wo','mes-ship','acc-sales','mes-cli'];
var QUICK_ACTIONS = [
  {kind:'quote', mod:'qc-quote', label:'＋ 새 견적'},
  {kind:'order', mod:'mes-order', label:'＋ 새 수주'},
  {kind:'wo',    mod:'mes-wo',    label:'＋ 새 작업지시서'},
  {kind:'ship',  mod:'mes-ship',  label:'＋ 출고 등록'}
];

/* 메뉴 메타: 모듈 id → 라벨·아이콘 */
function getModuleMeta(mod){
  var map = {
    'mes-dash':      {l:'생산현황',       i:''},
    'qc-quote':      {l:'패키지 견적',    i:''},
    'mes-order':     {l:'수주관리',       i:''},
    'mes-wo':        {l:'작업지시서',     i:''},
    'mes-plan':      {l:'생산계획',       i:''},
    'mes-proc-log':  {l:'공정실적',       i:''},
    'mes-outsource': {l:'외주진행',       i:''},
    'mes-worker':    {l:'현장작업',       i:''},
    'mat-stock':     {l:'재고 현황',      i:''},
    'mat-po':        {l:'발주',           i:''},
    'mat-income':    {l:'입고',           i:''},
    'mat-bom':       {l:'BOM',            i:''},
    'mes-vendor':    {l:'협력사',         i:''},
    'mes-ship':      {l:'출고',           i:''},
    'acc-sales':     {l:'매출',           i:''},
    'acc-purchase':  {l:'매입',           i:''},
    'acc-tax':       {l:'세금계산서',     i:''},
    'acc-recv':      {l:'채권/자금',      i:''},
    'acc-cashflow':  {l:'입출금',         i:''},
    'mes-cli':       {l:'거래처',         i:''},
    'mes-prod':      {l:'품목',           i:''},
    'mes-mold':      {l:'목형',           i:''},
    'qc-inspect':    {l:'품질',           i:''},
    'qc-equip':      {l:'설비',           i:''},
    'adm-perm':      {l:'권한 관리',      i:''},
    'adm-backup':    {l:'백업',           i:''},
    'mes-queue':     {l:'시스템설정',     i:''},
    /* 신규 서브 항목 */
    'mes-order-track':{l:'납기추적',       i:''},
    'mat-safety':    {l:'안전재고',       i:''},
    'ship-partial':  {l:'부분출고',       i:''},
    'ship-return':   {l:'반품',           i:''},
    'qc-claim':      {l:'클레임',         i:''},
    'acc-costing':   {l:'원가분석',       i:''},
    'acc-etax':      {l:'전자세금계산서', i:''},
    'ship-inspect':  {l:'출하검사',       i:''},
    'qc-cert':       {l:'검사성적서',     i:''},
    'mes-defect':    {l:'불량등록',       i:''},
    'adm-audit':     {l:'감사로그',       i:''},
    'adm-code':      {l:'공통코드',       i:''}
  };
  return map[mod] || {l:mod, i:'•'};
}

function load(key){
  try{ return JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){ return []; }
}
function save(key, arr){
  try{ localStorage.setItem(key, JSON.stringify(arr)); }catch(e){}
}

function getCurrentUser(){
  try{ return window.CU || (typeof CU !== 'undefined' ? CU : null); }catch(e){ return null; }
}

function isAllowedMod(mod){
  var cu = getCurrentUser();
  if(!mod) return false;
  if(!cu) return false;
  if(cu.role === 'admin') return true;
  if(cu.role === 'worker') return false;
  if(Array.isArray(cu.perms)) return cu.perms.indexOf(mod) >= 0;
  return true;
}

function getQuickAction(kind){
  return QUICK_ACTIONS.find(function(a){ return a.kind === kind; }) || null;
}

function renderQuickActions(){
  var section = document.getElementById('sbQuickSection');
  var box = document.getElementById('sbQuickList');
  if(!section || !box) return;
  var actions = QUICK_ACTIONS.filter(function(a){ return isAllowedMod(a.mod); });
  if(!actions.length){
    section.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  section.style.display = '';
  box.innerHTML = actions.map(function(a){
    return '<button class="sb-quick-btn" data-quick-new="'+a.kind+'" title="'+a.label.replace(/^＋\s*/,'')+'">'
      + a.label
      + '</button>';
  }).join('');
}

function renderFavs(){
  var box = document.getElementById('sbFavList');
  if(!box) return;
  var favs = load(FAV_KEY);
  if(!favs.length){
    box.innerHTML = '<div class="sb-empty">별 모양(＋) 클릭으로 현재 메뉴 추가</div>';
    return;
  }
  // inline onclick 제거 — 상위 #sidebar delegation 이 data-mod 로 goMod 호출
  // (기존에 inline + delegation 이 겹쳐 goMod 이 2회 실행되던 이슈 수정)
  box.innerHTML = favs.map(function(mod){
    var m = getModuleMeta(mod);
    return '<button class="sb-item sb-fav-item" data-mod="'+mod+'" title="'+m.l+'">'
      + '<span>'+m.l+'</span>'
      + '<span class="sb-fav-x" data-fav-x="'+mod+'" title="제거">×</span>'
      + '</button>';
  }).join('');
}

function renderRecent(){
  var box = document.getElementById('sbRecentList');
  if(!box) return;
  var recent = load(RECENT_KEY);
  if(!recent.length){
    box.innerHTML = '<div class="sb-empty">최근 방문 메뉴가 여기에 표시됩니다</div>';
    return;
  }
  // inline onclick 제거 — #sidebar delegation 만 사용
  box.innerHTML = recent.map(function(mod){
    var m = getModuleMeta(mod);
    return '<button class="sb-item" data-mod="'+mod+'" title="'+m.l+'">'
      + '<span>'+m.l+'</span>'
      + '</button>';
  }).join('');
}
/* sb-fav-x 전용 delegation — sbFavRemove 호출 (버블링 차단 포함)
   inline onclick 을 없앴으므로 별도 핸들러로 처리 */
document.addEventListener('click', function(e){
  var x = e.target.closest('[data-fav-x]');
  if(!x) return;
  e.stopPropagation();
  e.preventDefault();
  sbFavRemove(x.getAttribute('data-fav-x'));
}, true);

document.addEventListener('click', function(e){
  var btn = e.target.closest('[data-quick-new]');
  if(!btn) return;
  e.preventDefault();
  e.stopPropagation();
  sbQuickNew(btn.getAttribute('data-quick-new'));
}, true);

function pushRecent(mod){
  if(!mod || mod === 'mes-dash') return;
  var recent = load(RECENT_KEY);
  recent = [mod].concat(recent.filter(function(x){return x !== mod;})).slice(0, MAX_RECENT);
  save(RECENT_KEY, recent);
  renderRecent();
}

function sbFavToggle(){
  // 현재 열린 모듈 탐지
  var activeItem = document.querySelector('.sb-item.active');
  if(!activeItem){
    if(typeof toast==='function') toast('현재 화면을 먼저 선택하세요','err');
    return;
  }
  var mod = activeItem.getAttribute('data-mod');
  if(!mod) return;
  var favs = load(FAV_KEY);
  var idx = favs.indexOf(mod);
  if(idx >= 0){
    favs.splice(idx, 1);
    if(typeof toast==='function') toast('즐겨찾기 해제','ok');
  } else {
    favs.unshift(mod);
    favs = favs.slice(0, 8);
    if(typeof toast==='function') toast('즐겨찾기 추가','ok');
  }
  save(FAV_KEY, favs);
  renderFavs();
}
window.sbFavToggle = sbFavToggle;

function sbFavRemove(mod){
  var favs = load(FAV_KEY).filter(function(x){return x !== mod;});
  save(FAV_KEY, favs);
  renderFavs();
}
window.sbFavRemove = sbFavRemove;

/* goMod 훅: 최근 사용 기록
   순서 주의 — pushRecent 가 recent 섹션 DOM 을 재빌드하므로
   orig 실행 전에 호출해야 한다. 그렇지 않으면 orig 가 설정한 sb-item.active 가
   재렌더로 사라진다. */
function hookGoMod(){
  if(typeof window.goMod !== 'function' || window.goMod.__sbRecentWrapped) return;
  var orig = window.goMod;
  var wrapped = function(mod){
    try{ pushRecent(mod); }catch(e){}
    return orig.apply(this, arguments);
  };
  wrapped.__sbRecentWrapped = true;
  window.goMod = wrapped;
}

/* 빠른 생성 — 해당 모듈로 이동 후 등록 모달/폼 오픈 */
function sbQuickNew(kind){
  var action = getQuickAction(kind);
  if(!action) return;
  if(!isAllowedMod(action.mod)){
    if(typeof toast === 'function') toast('해당 등록 권한이 없습니다','err');
    renderQuickActions();
    return;
  }
  var handlers = {
    quote: function(){
      if(typeof goMod==='function') goMod('qc-quote');
      setTimeout(function(){ if(typeof openQtM==='function') openQtM(); }, 260);
    },
    order: function(){
      if(typeof goMod==='function') goMod('mes-order');
      setTimeout(function(){ if(typeof orderSub==='function') orderSub('new'); }, 260);
    },
    wo: function(){
      if(typeof goMod==='function') goMod('mes-wo');
      setTimeout(function(){
        if(typeof openWOForm==='function') openWOForm();
        else if(typeof resetWO==='function'){
          resetWO();
          var ov=document.getElementById('woFormOv');
          if(ov) ov.classList.remove('hidden');
        }
      }, 260);
    },
    ship: function(){
      if(typeof goMod==='function') goMod('mes-ship');
      // 출고는 WO 선택 플로우이므로 모듈만 이동
    }
  };
  var h = handlers[kind];
  if(h) h();
}
window.sbQuickNew = sbQuickNew;

function hookAuth(){
  if(typeof window.unifiedLogin === 'function' && !window.unifiedLogin.__sbQuickWrapped){
    var origLogin = window.unifiedLogin;
    var wrappedLogin = function(){
      var r = origLogin.apply(this, arguments);
      if(r && typeof r.then === 'function'){
        return r.then(function(v){ setTimeout(renderQuickActions, 0); return v; });
      }
      setTimeout(renderQuickActions, 0);
      return r;
    };
    wrappedLogin.__sbQuickWrapped = true;
    window.unifiedLogin = wrappedLogin;
  }
  if(typeof window.unifiedLogout === 'function' && !window.unifiedLogout.__sbQuickWrapped){
    var origLogout = window.unifiedLogout;
    var wrappedLogout = function(){
      var r = origLogout.apply(this, arguments);
      setTimeout(renderQuickActions, 0);
      return r;
    };
    wrappedLogout.__sbQuickWrapped = true;
    window.unifiedLogout = wrappedLogout;
  }
}

function seedDefaultFavs(){
  try{
    if(localStorage.getItem(SEED_KEY)) return; // 한 번만
    var cur = load(FAV_KEY);
    if(cur.length === 0){
      save(FAV_KEY, DEFAULT_FAVS.slice());
    }
    localStorage.setItem(SEED_KEY,'1');
  }catch(e){}
}

function init(){
  seedDefaultFavs();
  hookGoMod();
  hookAuth();
  renderFavs();
  renderRecent();
  renderQuickActions();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('[pc-sidebar-blocks] loaded. favorites + recent + permission-aware quick actions active');
})();
