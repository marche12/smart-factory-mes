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

/* 얼마에요/더존 스타일: 상단 탭 = 주 카테고리, 사이드바 = 해당 탭의 텍스트 하위 메뉴 */
var MODES = [
  {id:'all',     label:'홈',     ico:'🏠',  gotoMod:'mes-dash', groupKw:null /* 전부 표시 */},
  {id:'prod',    label:'제조',   ico:'🏭',  gotoMod:'mes-wo',    groupKw:['견적','생산','자재']},
  {id:'acct',    label:'회계',   ico:'📒',  gotoMod:'acc-sales', groupKw:['출고','기준']},
  {id:'tax',     label:'신고',   ico:'📋',  gotoMod:'acc-tax',   groupKw:['출고']},
  {id:'report',  label:'분석',   ico:'📊',  gotoMod:'mes-dash',  groupKw:null},
  {id:'setup',   label:'설정',   ico:'⚙️',  gotoMod:'mes-queue', groupKw:['시스템']}
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
  var tabs = MODES.map(function(m){
    return '<button class="tm-tab'+(m.id===cur?' on':'')+'" data-mode="'+m.id+'" onclick="setTopMode(\''+m.id+'\')" title="'+m.label+'">'
      + '<span class="tm-tab-ico">'+m.ico+'</span><span>'+m.label+'</span>'
      + '</button>';
  }).join('');
  // 우측 액션 (알림·프로필·로그아웃)
  var userName = (typeof CU !== 'undefined' && CU && CU.nm) ? CU.nm : '관리자';
  var userRole = (typeof CU !== 'undefined' && CU && CU.role) ? CU.role : 'admin';
  var roleMap = {admin:'관리자',office:'사무실',sales:'영업',material:'자재',accounting:'회계',quality:'품질'};
  var initial = (userName||'관').charAt(0);
  var right = '<div class="tm-right">'
    + '<button class="tm-right-btn has-noti" title="알림" onclick="if(typeof UX!==\'undefined\'&&UX.toggleNotifPanel)UX.toggleNotifPanel();else alert(\'알림 센터\')">🔔<span class="tm-noti-dot"></span></button>'
    + '<button class="tm-right-btn" title="키보드 단축키" onclick="if(typeof openShortcuts===\'function\')openShortcuts()">⌨</button>'
    + '<div class="tm-user" title="'+userName+' ('+(roleMap[userRole]||userRole)+')">'
    +   '<div class="tm-avatar">'+initial+'</div>'
    +   '<span>'+userName+'</span>'
    + '</div>'
    + '<button class="tm-right-btn" title="로그아웃" onclick="if(typeof unifiedLogout===\'function\')unifiedLogout()">↩</button>'
    + '</div>';
  bar.innerHTML = tabs + right;
}

/* 모드 선택 시 대표 화면으로 이동 (사이드바는 항상 전체 아이콘 그대로 유지) */
function applyMode(modeId){
  var m = MODES.find(function(x){return x.id===modeId;});
  if(!m) return;
  document.querySelectorAll('.sb-group').forEach(function(g){
    var next = g.nextElementSibling;
    var txt = (g.textContent||'').replace(/▶|▼/g,'').trim();
    if(!m.groupKw){ g.style.display=''; if(next)next.style.display=''; g.classList.add('open'); return; }
    var match = m.groupKw.some(function(k){return txt.indexOf(k)>=0;});
    g.style.display = match?'':'none';
    if(next) next.style.display = match?'':'none';
    if(match) g.classList.add('open');
  });
  if(m.gotoMod && typeof goMod==='function') try{goMod(m.gotoMod)}catch(e){}
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
  applyMode(getCurrentMode());
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
