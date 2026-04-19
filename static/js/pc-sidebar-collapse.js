/* ================================================================
   pc-sidebar-collapse.js — 사이드바 토글 (데스크톱 전용)
   localStorage 에 사용자 선호 저장, 로그인 시 자동 복원
   Feature flag: window.PACKFLOW_EXPERIMENTAL?.sideCollapse
   ================================================================ */
(function(){
'use strict';

window.PACKFLOW_EXPERIMENTAL = window.PACKFLOW_EXPERIMENTAL || {};
if(window.PACKFLOW_EXPERIMENTAL.sideCollapse === false) return;

var KEY = 'packflow_sbCollapsed';

function toggleSidebar(){
  var collapsed = document.body.classList.toggle('sb-collapsed');
  try{ localStorage.setItem(KEY, collapsed ? '1' : '0'); }catch(e){}
}
window.toggleSidebarCollapse = toggleSidebar;

function restorePref(){
  try{
    if(localStorage.getItem(KEY) === '1') document.body.classList.add('sb-collapsed');
  }catch(e){}
}

function addButton(){
  var sb = document.getElementById('sidebar');
  if(!sb || document.getElementById('sbCollapseBtn')) return;
  var btn = document.createElement('button');
  btn.id = 'sbCollapseBtn';
  btn.className = 'sb-collapse-btn';
  btn.setAttribute('aria-label', '사이드바 접기/펼치기');
  btn.title = '사이드바 접기 / 펼치기';
  btn.onclick = toggleSidebar;
  // FAB처럼 position:absolute — 사이드바 내부에 삽입
  sb.style.position = sb.style.position || 'relative';
  sb.appendChild(btn);

  // 그룹에 data-tip 추가 (접힘 시 툴팁)
  document.querySelectorAll('.sb-group').forEach(function(g){
    var txt = (g.textContent || '').replace(/▶|▼/g, '').trim();
    if(txt) g.setAttribute('data-tip', txt);
  });
}

function init(){
  restorePref();
  addButton();
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('[pc-sidebar-collapse] loaded. ◀ 버튼으로 사이드바 접기 가능');
})();
