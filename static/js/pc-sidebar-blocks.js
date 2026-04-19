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
var MAX_RECENT = 5;

/* 메뉴 메타: 모듈 id → 라벨·아이콘 */
function getModuleMeta(mod){
  var map = {
    'mes-dash':      {l:'패키지 운영판',  i:'🏠'},
    'qc-quote':      {l:'패키지 견적',    i:'🧾'},
    'mes-order':     {l:'수주관리',       i:'📋'},
    'mes-wo':        {l:'작업지시',       i:'📝'},
    'mes-plan':      {l:'생산계획',       i:'📅'},
    'mes-proc-log':  {l:'공정실적',       i:'🔧'},
    'mes-outsource': {l:'외주진행',       i:'🤝'},
    'mes-worker':    {l:'현장작업',       i:'👷'},
    'mat-stock':     {l:'재고 현황',      i:'📦'},
    'mat-po':        {l:'발주',           i:'📤'},
    'mat-income':    {l:'입고',           i:'📥'},
    'mat-bom':       {l:'BOM',            i:'🔗'},
    'mes-vendor':    {l:'협력사',         i:'🏢'},
    'mes-ship':      {l:'출고',           i:'🚚'},
    'acc-sales':     {l:'매출',           i:'💰'},
    'acc-purchase':  {l:'매입',           i:'💳'},
    'acc-tax':       {l:'세금계산서',     i:'📋'},
    'acc-recv':      {l:'채권/자금',      i:'💵'},
    'acc-cashflow':  {l:'입출금',         i:'🏦'},
    'mes-cli':       {l:'거래처',         i:'👥'},
    'mes-prod':      {l:'패키지 품목',    i:'📦'},
    'mes-mold':      {l:'목형',           i:'🔲'},
    'qc-inspect':    {l:'품질',           i:'✓'},
    'qc-equip':      {l:'설비',           i:'⚙️'},
    'adm-perm':      {l:'권한 관리',      i:'🔐'},
    'adm-backup':    {l:'백업',           i:'💾'},
    'mes-queue':     {l:'시스템설정',     i:'⚙️'}
  };
  return map[mod] || {l:mod, i:'•'};
}

function load(key){
  try{ return JSON.parse(localStorage.getItem(key)||'[]'); }catch(e){ return []; }
}
function save(key, arr){
  try{ localStorage.setItem(key, JSON.stringify(arr)); }catch(e){}
}

function renderFavs(){
  var box = document.getElementById('sbFavList');
  if(!box) return;
  var favs = load(FAV_KEY);
  if(!favs.length){
    box.innerHTML = '<div class="sb-empty">별 모양(＋) 클릭으로 현재 메뉴 추가</div>';
    return;
  }
  box.innerHTML = favs.map(function(mod){
    var m = getModuleMeta(mod);
    return '<button class="sb-item sb-fav-item" data-mod="'+mod+'" onclick="goMod(\''+mod+'\')" title="'+m.l+'">'
      + '<span class="sb-item-ico">'+m.i+'</span>'
      + '<span>'+m.l+'</span>'
      + '<span class="sb-fav-x" onclick="event.stopPropagation();sbFavRemove(\''+mod+'\')" title="제거">×</span>'
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
  box.innerHTML = recent.map(function(mod){
    var m = getModuleMeta(mod);
    return '<button class="sb-item" data-mod="'+mod+'" onclick="goMod(\''+mod+'\')" title="'+m.l+'">'
      + '<span class="sb-item-ico">'+m.i+'</span>'
      + '<span>'+m.l+'</span>'
      + '</button>';
  }).join('');
}

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

function init(){
  hookGoMod();
  renderFavs();
  renderRecent();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('[pc-sidebar-blocks] loaded. ★ 즐겨찾기 + 🕒 최근 활성화');
})();
