/* ================================================================
   pc-ux-memory.js — UX 기억 레이어
   목적: 기존 핵심 로직은 건드리지 않고 "사용자 선호"만 localStorage 에 얹음
   - 테이블 정렬 상태 기억 (클릭 기준 컬럼 + 방향)
   - 최근 메뉴 클릭 기록 (이미 sidebar-blocks 에 있음)
   - 우클릭 공통 메뉴 헬퍼 (윈도우 공용)
   ================================================================ */
(function(){
'use strict';

/* -------- 1. 테이블 정렬 기억 -------- */
var SORT_KEY = 'packflow_sortMemo_v1';

function loadSort(){ try{ return JSON.parse(localStorage.getItem(SORT_KEY)||'{}'); }catch(e){ return {}; } }
function saveSort(m){ try{ localStorage.setItem(SORT_KEY, JSON.stringify(m)); }catch(e){} }

// thead th 클릭 시 저장 (capture phase — 기존 ux-advanced.js 핸들러와 병행)
document.addEventListener('click', function(e){
  var th = e.target.closest('.dt thead th');
  if(!th) return;
  var table = th.closest('table');
  if(!table || !table.id) return;
  // 약간의 지연 후 최종 상태 저장 (기존 핸들러 반영 후)
  setTimeout(function(){
    var sortedTh = table.querySelector('thead th.sort-asc, thead th.sort-desc');
    if(!sortedTh) return;
    var colIdx = Array.from(sortedTh.parentNode.children).indexOf(sortedTh);
    var dir = sortedTh.classList.contains('sort-asc') ? 'asc' : 'desc';
    var memo = loadSort();
    memo[table.id] = {col: colIdx, dir: dir, label: sortedTh.textContent.trim()};
    saveSort(memo);
  }, 30);
});

// 표가 다시 렌더된 후 저장된 정렬 자동 적용
var _applying = {}; // 테이블별 재적용 중 플래그 (jitter 방지)
function applyStoredSort(tableId){
  if(_applying[tableId]) return;
  var memo = loadSort()[tableId];
  if(!memo) return;
  var table = document.getElementById(tableId);
  if(!table) return;
  var th = table.querySelectorAll('thead th')[memo.col];
  if(!th) return;
  // 이미 정렬된 상태면 skip
  if(th.classList.contains('sort-'+memo.dir)) return;
  _applying[tableId] = true;
  try{
    var currentAsc = th.classList.contains('sort-asc');
    var currentDesc = th.classList.contains('sort-desc');
    if(!currentAsc && !currentDesc){
      th.click();
      if(memo.dir === 'desc') th.click();
    } else if(currentAsc && memo.dir === 'desc'){
      th.click();
    } else if(currentDesc && memo.dir === 'asc'){
      th.click(); th.click();
    }
  }finally{
    // 약간 지연 후 해제 (tbody 변이 debounce 시간과 매칭)
    setTimeout(function(){ _applying[tableId] = false; }, 300);
  }
}

// tbody 변경 감지 → 자동 적용 (디바운스)
var _applyTimers = {};
function watchTable(table){
  if(!table || !table.id || table._sortWatched) return;
  var tbody = table.tBodies[0];
  if(!tbody) return;
  table._sortWatched = true;
  var id = table.id;
  var obs = new MutationObserver(function(){
    clearTimeout(_applyTimers[id]);
    _applyTimers[id] = setTimeout(function(){ applyStoredSort(id); }, 150);
  });
  obs.observe(tbody, {childList:true, subtree:false});
}

function scanTables(){
  document.querySelectorAll('table.dt').forEach(watchTable);
}

/* -------- 2. 우클릭 공통 메뉴 헬퍼 -------- */
/**
 * 사용 예:
 *   window.uxCtxBind(rowEl, function(){ return [
 *     {label:'상세 보기', action:function(){...}},
 *     {label:'메모', action:function(){...}},
 *     {label:'삭제', action:function(){...}, danger:true}
 *   ]});
 */
function ensureMenu(){
  var m = document.getElementById('uxCtxMenu');
  if(m) return m;
  m = document.createElement('div');
  m.id = 'uxCtxMenu';
  m.className = 'ux-ctx-menu hidden';
  document.body.appendChild(m);
  document.addEventListener('click', closeMenu);
  document.addEventListener('contextmenu', function(e){
    if(!e.target.closest('#uxCtxMenu')) closeMenu();
  }, true);
  window.addEventListener('scroll', closeMenu, true);
  return m;
}
function closeMenu(){ var m=document.getElementById('uxCtxMenu'); if(m)m.classList.add('hidden'); }
function openMenu(e, items){
  if(!items || !items.length) return;
  e.preventDefault();
  var m = ensureMenu();
  m.innerHTML = items.map(function(it, i){
    if(it.separator) return '<div class="ux-ctx-sep"></div>';
    return '<button class="ux-ctx-item'+(it.danger?' danger':'')+'" data-idx="'+i+'">'+(it.label||'')+'</button>';
  }).join('');
  m.style.left = Math.min(e.clientX, window.innerWidth-210)+'px';
  m.style.top  = Math.min(e.clientY, window.innerHeight-Math.max(items.length*36, 80))+'px';
  m.classList.remove('hidden');
  // 버튼에 클릭 핸들러 연결
  m.querySelectorAll('.ux-ctx-item').forEach(function(btn){
    btn.onclick = function(ev){
      ev.stopPropagation();
      var idx = +btn.getAttribute('data-idx');
      closeMenu();
      try{ items[idx].action && items[idx].action(); }catch(err){ console.warn(err); }
    };
  });
}
window.uxCtxBind = function(el, buildItems){
  if(!el) return;
  el.addEventListener('contextmenu', function(e){
    var items;
    try{ items = buildItems(e, el); }catch(err){ return; }
    openMenu(e, items);
  });
};
window.uxCtxOpen = openMenu;

/* 공통 CSS 주입 (없으면) */
if(!document.getElementById('uxCtxStyle')){
  var st = document.createElement('style');
  st.id = 'uxCtxStyle';
  st.textContent = ''
    +'.ux-ctx-menu{position:fixed;z-index:9999;background:#fff;border:1px solid #E5E7EB;border-radius:10px;box-shadow:0 12px 32px rgba(15,23,42,.18);min-width:180px;padding:4px;font-size:13px}'
    +'.ux-ctx-menu.hidden{display:none}'
    +'.ux-ctx-item{display:block;width:100%;padding:8px 12px;background:transparent;border:none;text-align:left;cursor:pointer;border-radius:6px;color:#1F2937;font-size:13px;font-weight:500}'
    +'.ux-ctx-item:hover{background:#F1F5F9}'
    +'.ux-ctx-item.danger{color:#DC2626}'
    +'.ux-ctx-item.danger:hover{background:#FEE2E2}'
    +'.ux-ctx-sep{height:1px;background:#E5E7EB;margin:4px 0}';
  document.head.appendChild(st);
}

/* 초기 스캔 + 주기적 재스캔 (동적 테이블 대응) */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', scanTables);
} else {
  scanTables();
}
setInterval(scanTables, 3000);

console.log('[pc-ux-memory] loaded. 정렬 기억 + uxCtxBind 사용 가능');
})();
