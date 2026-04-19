/* ================================================================
   pc-top-modes.js — 상단 업무영역 탭
   역할:
   - 상단: 업무영역 전환(필터)
   - 좌측: 실제 실행 메뉴
   원칙:
   - 로그인/복원 시 자동 화면 이동 금지
   - 권한 없는 모드는 숨김
   - 그룹 텍스트가 아니라 data-group-key 기반으로 필터링
   ================================================================ */
(function(){
'use strict';

window.PACKFLOW_EXPERIMENTAL = window.PACKFLOW_EXPERIMENTAL || {};
if(window.PACKFLOW_EXPERIMENTAL.topModes === undefined){
  window.PACKFLOW_EXPERIMENTAL.topModes = true;
}

var MODE_KEY = 'packflow_topMode_v2';
var DEFAULT_MODE = 'order';

var MODES = [
  {
    id:'order',
    label:'견적·수주',
    ico:'🧾',
    groupKeys:['order'],
    modules:['qc-quote','mes-order','mes-wo']
  },
  {
    id:'prod',
    label:'생산·공정',
    ico:'🏭',
    groupKeys:['prod'],
    modules:['mes-plan','mes-proc-log','mes-outsource','mes-worker']
  },
  {
    id:'material',
    label:'자재·외주',
    ico:'📦',
    groupKeys:['material'],
    modules:['mat-stock','mat-po','mat-income','mat-bom','mes-vendor']
  },
  {
    id:'ship',
    label:'출고·정산',
    ico:'🚚',
    groupKeys:['ship'],
    modules:['mes-ship','acc-sales','acc-purchase','acc-tax','acc-recv','acc-cashflow']
  },
  {
    id:'setup',
    label:'기준·설정',
    ico:'⚙️',
    groupKeys:['master','system'],
    modules:['mes-cli','mes-prod','mes-mold','qc-inspect','qc-equip','adm-perm','adm-backup','mes-queue']
  }
];

function currentUser(){
  if(typeof CU !== 'undefined' && CU) return CU;
  return null;
}

function isAllowed(mod){
  var user = currentUser();
  if(!user) return true;
  if(user.role === 'admin') return true;
  if(!Array.isArray(user.perms)) return true;
  return user.perms.indexOf(mod) >= 0;
}

function getAvailableModes(){
  return MODES.filter(function(mode){
    return mode.modules.some(isAllowed);
  });
}

function getModeById(id){
  return MODES.find(function(mode){ return mode.id === id; }) || null;
}

function getFallbackModeId(){
  var available = getAvailableModes();
  if(!available.length) return null;
  return available[0].id;
}

function getStoredMode(){
  var fallback = getFallbackModeId() || DEFAULT_MODE;
  try{
    var stored = localStorage.getItem(MODE_KEY) || fallback;
    var mode = getModeById(stored);
    if(mode && getAvailableModes().some(function(m){ return m.id === stored; })) return stored;
  }catch(e){}
  return fallback;
}

function storeMode(id){
  try{ localStorage.setItem(MODE_KEY, id); }catch(e){}
}

function getModeForModule(mod){
  if(!mod) return null;
  for(var i=0;i<MODES.length;i++){
    if(MODES[i].modules.indexOf(mod) >= 0) return MODES[i];
  }
  return null;
}

function renderTabs(){
  var bar = document.getElementById('tmBar');
  if(!bar) return;

  var cur = getStoredMode();
  var tabs = getAvailableModes().map(function(mode){
    return '<button class="tm-tab'+(mode.id===cur?' on':'')+'"'
      + ' data-mode="'+mode.id+'"'
      + ' onclick="setTopMode(\''+mode.id+'\')"'
      + ' title="'+mode.label+'">'
      + '<span class="tm-tab-ico">'+mode.ico+'</span>'
      + '<span>'+mode.label+'</span>'
      + '</button>';
  }).join('');

  var user = currentUser();
  var userName = user && user.nm ? user.nm : '관리자';
  var userRole = user && user.role ? user.role : 'admin';
  var roleMap = {admin:'관리자',office:'사무실',sales:'영업',material:'자재',accounting:'회계',quality:'품질'};
  var initial = (userName||'관').charAt(0);

  // 우측 = 알림 + 사용자 드롭다운 만 (로그아웃/단축키/홈은 드롭다운 안으로 흡수)
  var right = '<div class="tm-right">'
    + '<button class="tm-right-btn has-noti" title="알림" onclick="if(typeof UX!==\'undefined\'&&UX.toggleNotifPanel)UX.toggleNotifPanel();else if(typeof toggleNotiPanel===\'function\')toggleNotiPanel()">🔔<span class="tm-noti-dot"></span></button>'
    + '<div class="tm-user-wrap" id="tmUserWrap">'
    +   '<button class="tm-user" onclick="_tmToggleUserMenu(event)" title="'+userName+' ('+(roleMap[userRole]||userRole)+')">'
    +     '<div class="tm-avatar">'+initial+'</div>'
    +     '<span>'+userName+'</span>'
    +     '<span class="tm-user-caret">▾</span>'
    +   '</button>'
    +   '<div class="tm-user-menu hidden" id="tmUserMenu">'
    +     '<div class="tm-user-menu-hd"><div class="tm-user-menu-nm">'+userName+'</div><div class="tm-user-menu-role">'+(roleMap[userRole]||userRole)+'</div></div>'
    +     '<button class="tm-user-menu-item" onclick="goMod(\'mes-dash\');_tmCloseUserMenu()">🏠 홈 (패키지 운영판)</button>'
    +     '<button class="tm-user-menu-item" onclick="openShortcuts&&openShortcuts();_tmCloseUserMenu()">⌨ 키보드 단축키</button>'
    +     '<button class="tm-user-menu-item" onclick="goMod(\'mes-queue\');_tmCloseUserMenu()">⚙️ 시스템 설정</button>'
    +     '<div class="tm-user-menu-sep"></div>'
    +     '<button class="tm-user-menu-item danger" onclick="unifiedLogout&&unifiedLogout()">↩ 로그아웃</button>'
    +   '</div>'
    + '</div>'
    + '</div>';

  bar.innerHTML = tabs + right;
}

function applyMode(modeId){
  var mode = getModeById(modeId);
  var keys = mode ? mode.groupKeys : null;

  document.querySelectorAll('.sb-group').forEach(function(group){
    var key = group.getAttribute('data-group-key');
    var tree = group.nextElementSibling;
    var show = !keys || (key && keys.indexOf(key) >= 0);
    group.style.display = show ? '' : 'none';
    if(tree && tree.classList.contains('sb-tree')) tree.style.display = show ? '' : 'none';
    if(show) group.classList.add('open');
  });
}

function syncTabUi(modeId){
  var cur = modeId || getStoredMode();
  document.querySelectorAll('#tmBar .tm-tab').forEach(function(tab){
    tab.classList.toggle('on', tab.getAttribute('data-mode') === cur);
  });
}

function setTopMode(id){
  if(!id) return;
  if(!getAvailableModes().some(function(mode){ return mode.id === id; })) return;
  storeMode(id);
  applyMode(id);
  syncTabUi(id);
}
window.setTopMode = setTopMode;

window._tmToggleUserMenu = function(e){
  if(e) e.stopPropagation();
  var m = document.getElementById('tmUserMenu');
  if(!m) return;
  m.classList.toggle('hidden');
};
window._tmCloseUserMenu = function(){
  var m = document.getElementById('tmUserMenu');
  if(m) m.classList.add('hidden');
};
/* 외부 클릭 시 닫기 */
document.addEventListener('click', function(e){
  var wrap = document.getElementById('tmUserWrap');
  if(!wrap || wrap.contains(e.target)) return;
  window._tmCloseUserMenu();
});

function syncTopModeByModule(mod){
  var mode = getModeForModule(mod);
  if(!mode) return;
  if(!getAvailableModes().some(function(m){ return m.id === mode.id; })) return;
  storeMode(mode.id);
  applyMode(mode.id);
  syncTabUi(mode.id);
}

function hookGoMod(){
  if(typeof window.goMod !== 'function' || window.goMod.__topModeWrapped) return;
  var orig = window.goMod;
  var wrapped = function(id){
    var result = orig.apply(this, arguments);
    try{ syncTopModeByModule(id); }catch(e){}
    return result;
  };
  wrapped.__topModeWrapped = true;
  window.goMod = wrapped;
}

function enable(){
  if(!window.PACKFLOW_EXPERIMENTAL.topModes) return;

  var mainArea = document.querySelector('.main-area');
  var mainHeader = mainArea ? mainArea.querySelector('.main-header') : null;
  if(!mainArea || !mainHeader) return;

  if(!document.getElementById('tmBar')){
    var bar = document.createElement('div');
    bar.id = 'tmBar';
    bar.className = 'tm-bar';
    mainArea.insertBefore(bar, mainHeader);
  }

  document.body.classList.add('tm-enabled');
  hookGoMod();
  renderTabs();
  applyMode(getStoredMode());
  syncTabUi(getStoredMode());
}

function disable(){
  document.body.classList.remove('tm-enabled');
  var bar = document.getElementById('tmBar');
  if(bar) bar.remove();
}
window.disableTopModes = disable;
window.enableTopModes = function(){
  window.PACKFLOW_EXPERIMENTAL.topModes = true;
  enable();
};

function initAfterLogin(){
  try{
    var user = currentUser();
    if(user && user.role !== 'worker') enable();
  }catch(e){}
}

(function(){
  var origLogin = window.unifiedLogin;
  if(typeof origLogin === 'function' && !origLogin.__topModeWrapped){
    var wrappedLogin = async function(){
      var result = await origLogin.apply(this, arguments);
      setTimeout(initAfterLogin, 300);
      return result;
    };
    wrappedLogin.__topModeWrapped = true;
    window.unifiedLogin = wrappedLogin;
  }

  setTimeout(function(){
    var admin = document.getElementById('adminApp');
    if(admin && admin.style.display && admin.style.display !== 'none'){
      initAfterLogin();
    }
  }, 1500);
})();

console.log('[pc-top-modes] loaded. 업무영역 필터 모드 활성=', window.PACKFLOW_EXPERIMENTAL.topModes);
})();
