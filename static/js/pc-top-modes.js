/* ================================================================
   pc-top-modes.js — 상단 모드 탭 (얼마에요식 상단 리본)
   Feature flag: window.PACKFLOW_EXPERIMENTAL?.topModes
   기본값: 처음에는 false(OFF)로 배포 → 안전 검증 후 true 전환
   ================================================================ */
(function(){
'use strict';

window.PACKFLOW_EXPERIMENTAL = window.PACKFLOW_EXPERIMENTAL || {};
// 기본값: true (활성화). 문제 시 false 설정하고 reload
if(window.PACKFLOW_EXPERIMENTAL.topModes === undefined){
  window.PACKFLOW_EXPERIMENTAL.topModes = true;
}

var MODES = [
  {id:'all',     label:'전체',   ico:'☰',   groups:null /* null = 전부 보임 */},
  {id:'prod',    label:'제조',   ico:'🏭',  groups:['견적','생산','자재']},
  {id:'acct',    label:'회계',   ico:'📒',  groups:['출고','기준']},
  {id:'tax',     label:'신고',   ico:'📋',  gotoMod:'acc-tax', groups:['출고']},
  {id:'report',  label:'분석',   ico:'📊',  gotoMod:'mes-dash', groups:['견적','생산','출고']},
  {id:'setup',   label:'설정',   ico:'⚙️',  groups:['시스템']}
];

var CURRENT_MODE_KEY = 'packflow_topMode';

function getCurrentMode(){
  try{ return localStorage.getItem(CURRENT_MODE_KEY) || 'all'; }catch(e){ return 'all'; }
}
function setCurrentMode(id){
  try{ localStorage.setItem(CURRENT_MODE_KEY, id); }catch(e){}
}

function renderTabs(){
  var bar = document.getElementById('tmBar');
  if(!bar) return;
  var cur = getCurrentMode();
  bar.innerHTML = MODES.map(function(m){
    return '<button class="tm-tab'+(m.id===cur?' on':'')+'" data-mode="'+m.id+'" onclick="setTopMode(\''+m.id+'\')" title="'+m.label+'">'
      + '<span class="tm-tab-ico">'+m.ico+'</span><span>'+m.label+'</span>'
      + '</button>';
  }).join('');
}

/* 모드에 따라 사이드바 그룹 필터링 — 그룹을 "숨김" 하지 않고 "펼침/접힘"만 제어 */
function applyMode(modeId){
  var m = MODES.find(function(x){return x.id===modeId;});
  if(!m) return;
  var groups = document.querySelectorAll('.sb-group');
  groups.forEach(function(g){
    var txt = (g.textContent||'').replace(/▶|▼/g,'').trim();
    if(m.groups === null){
      // 전체 모드: 모든 그룹 펼침
      g.classList.add('open');
      return;
    }
    var match = m.groups.some(function(kw){return txt.indexOf(kw)>=0;});
    if(match) g.classList.add('open');
    else g.classList.remove('open');
  });
  // gotoMod가 있으면 해당 화면으로 이동
  if(m.gotoMod && typeof goMod==='function'){
    try{ goMod(m.gotoMod); }catch(e){ console.warn('[pc-top-modes] goMod 실패', e); }
  }
}

function setTopMode(id){
  setCurrentMode(id);
  renderTabs();
  applyMode(id);
}
window.setTopMode = setTopMode;

/* 활성화: body.tm-enabled 추가 + 탭 바 주입 */
function enable(){
  if(!window.PACKFLOW_EXPERIMENTAL.topModes) return;
  if(document.getElementById('tmBar')) return;

  // main-header 직전에 바 삽입 (조심: 기존 DOM 유지)
  var mainArea = document.querySelector('.main-area');
  var mainHeader = mainArea ? mainArea.querySelector('.main-header') : null;
  if(!mainArea || !mainHeader) return;

  var bar = document.createElement('div');
  bar.id = 'tmBar';
  bar.className = 'tm-bar';
  mainArea.insertBefore(bar, mainHeader);

  document.body.classList.add('tm-enabled');
  renderTabs();
  // 초기 모드는 'all' → 사이드바 건드리지 않음 (안전)
  var cur = getCurrentMode();
  if(cur !== 'all') applyMode(cur);
}

function disable(){
  document.body.classList.remove('tm-enabled');
  var bar = document.getElementById('tmBar');
  if(bar) bar.remove();
}
window.disableTopModes = disable;
window.enableTopModes = function(){window.PACKFLOW_EXPERIMENTAL.topModes=true; enable();};

/* 로그인 후에만 활성화 (worker 제외) */
function initAfterLogin(){
  try{
    if(typeof CU !== 'undefined' && CU && CU.role !== 'worker'){
      enable();
    }
  }catch(e){}
}
(function(){
  var orig = window.unifiedLogin;
  if(typeof orig === 'function'){
    window.unifiedLogin = async function(){
      var r = await orig.apply(this, arguments);
      setTimeout(initAfterLogin, 300);
      return r;
    };
  }
  // 이미 로그인 상태면 바로
  setTimeout(function(){
    var admin = document.getElementById('adminApp');
    if(admin && admin.style.display && admin.style.display !== 'none'){
      initAfterLogin();
    }
  }, 1500);
})();

console.log('[pc-top-modes] loaded. PACKFLOW_EXPERIMENTAL.topModes=', window.PACKFLOW_EXPERIMENTAL.topModes);
})();
