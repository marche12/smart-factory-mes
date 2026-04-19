/* ==========================================
   팩플로우 UX 강화 — 전역검색 / 브레드크럼 / 알림 / 단축키
   ========================================== */

var UX = (function(){

  /* ========== 1. 전역 검색 (Cmd+K) ========== */

  function openGlobalSearch(){
    var el = document.getElementById('uxGlobalSearch');
    if(!el) return;
    el.classList.remove('hidden');
    var input = document.getElementById('uxgsInput');
    if(input){ input.value=''; setTimeout(function(){input.focus()}, 50) }
    renderGlobalSearchResults('');
  }

  function closeGlobalSearch(){
    var el = document.getElementById('uxGlobalSearch');
    if(el) el.classList.add('hidden');
  }

  function renderGlobalSearchResults(q){
    var resEl = document.getElementById('uxgsResults');
    if(!resEl) return;
    q = (q || '').trim();

    // 카테고리별 검색
    var hasUtil = typeof SearchUtil !== 'undefined';
    var results = [];

    // 메뉴
    var menus = [
      {t:'작업지시서', mod:'mes-wo', ico:'📋'},
      {t:'출고', mod:'mes-ship', ico:'🚚'},
      {t:'매출', mod:'acc-sales', ico:'💰'},
      {t:'매입', mod:'acc-purchase', ico:'📤'},
      {t:'세금계산서', mod:'acc-tax', ico:'📄'},
      {t:'재고', mod:'mat-stock', ico:'📦'},
      {t:'거래처', mod:'mes-cli', ico:'📇'},
      {t:'품목', mod:'mes-prod', ico:'🏷️'},
      {t:'목형', mod:'mes-mold', ico:'🔲'},
      {t:'채권/자금', mod:'acc-recv', ico:'💳'},
      {t:'입출금', mod:'acc-cashflow', ico:'💵'},
      {t:'생산현황', mod:'mes-dash', ico:'🏭'},
      {t:'시스템설정', mod:'mes-queue', ico:'⚙️'}
    ];
    menus.forEach(function(m){
      if(!q || (hasUtil ? SearchUtil.match(m.t, q) : m.t.indexOf(q) >= 0)){
        results.push({type:'menu', ico:m.ico, title:m.t, sub:'메뉴', action:"goMod('"+m.mod+"')"});
      }
    });

    if(q){
      // 거래처 (최대 8)
      (DB.g('cli')||[]).forEach(function(c){
        if(results.length > 30) return;
        if(hasUtil ? SearchUtil.match(c.nm, q) || SearchUtil.match(c.biz||'', q) : (c.nm||'').toLowerCase().indexOf(q.toLowerCase())>=0){
          results.push({type:'cli', ico:'📇', title:c.nm, sub:'거래처 · '+(c.biz||'-'), action:"goMod('mes-cli');setTimeout(function(){if(typeof showCliHist==='function')showCliHist('"+c.id+"')},300)"});
        }
      });

      // 품목 (최대 8)
      var prodCnt = 0;
      (DB.g('prod')||[]).forEach(function(p){
        if(prodCnt >= 8) return;
        if(hasUtil ? SearchUtil.match(p.nm, q) : (p.nm||'').toLowerCase().indexOf(q.toLowerCase())>=0){
          results.push({type:'prod', ico:'🏷️', title:p.nm, sub:'품목 · '+(p.cnm||'-'), action:"goMod('mes-prod')"});
          prodCnt++;
        }
      });

      // WO (최대 5)
      var woCnt = 0;
      (DB.g('wo')||[]).forEach(function(w){
        if(woCnt >= 5) return;
        var txt = (w.wn||'')+' '+(w.cnm||'')+' '+(w.pnm||'');
        if(hasUtil ? SearchUtil.match(txt, q) : txt.toLowerCase().indexOf(q.toLowerCase())>=0){
          results.push({type:'wo', ico:'📋', title:w.wn+' '+(w.cnm||''), sub:'WO · '+(w.pnm||'')+' '+(w.status||''), action:"goMod('mes-wo')"});
          woCnt++;
        }
      });
    }

    if(results.length === 0){
      resEl.innerHTML = '<div style="padding:40px;text-align:center;color:#94A3B8">검색 결과가 없습니다</div>';
      return;
    }

    var html = '';
    var lastType = null;
    var typeLabels = {menu:'메뉴', cli:'거래처', prod:'품목', wo:'작업지시서'};
    results.slice(0, 30).forEach(function(r, i){
      if(r.type !== lastType){
        if(lastType !== null) html += '</div>';
        html += '<div class="uxgs-section-hdr">'+typeLabels[r.type]+'</div><div class="uxgs-section">';
        lastType = r.type;
      }
      var highlightedTitle = hasUtil ? SearchUtil.highlight(r.title, q) : r.title;
      html += '<div class="uxgs-item" onclick="UX.selectResult(\''+r.action.replace(/'/g,"\\'")+'\')" data-action="'+encodeURIComponent(r.action)+'">';
      html += '<div class="uxgs-ico">'+r.ico+'</div>';
      html += '<div class="uxgs-body"><div class="uxgs-ttl">'+highlightedTitle+'</div><div class="uxgs-sub">'+r.sub+'</div></div>';
      html += '<div class="uxgs-kbd">↵</div>';
      html += '</div>';
    });
    if(lastType !== null) html += '</div>';

    resEl.innerHTML = html;
  }

  function selectResult(action){
    try { eval(action); } catch(e) { console.error(e); }
    closeGlobalSearch();
  }

  /* ========== 2. 브레드크럼 ========== */

  function updateBreadcrumb(mod){
    var el = document.getElementById('uxBreadcrumb');
    if(!el) return;

    var groupMap = {
      'mes-wo':'매일 업무', 'mes-ship':'매일 업무', 'acc-sales':'매일 업무', 'acc-purchase':'매일 업무', 'acc-tax':'매일 업무',
      'mes-plan':'현황', 'mat-stock':'현황', 'acc-recv':'현황', 'acc-cashflow':'현황', 'mes-dash':'현황',
      'mes-cli':'거래처·품목', 'mes-prod':'거래처·품목', 'mes-mold':'거래처·품목', 'mes-vendor':'거래처·품목',
      'mat-po':'구매·자재', 'mat-income':'구매·자재', 'mat-bom':'구매·자재',
      'mes-proc-log':'생산관리', 'mes-outsource':'생산관리', 'qc-inspect':'생산관리', 'qc-equip':'생산관리',
      'adm-perm':'시스템', 'adm-backup':'시스템', 'mes-queue':'시스템'
    };

    var titleMap = {
      'mes-wo':'작업지시서', 'mes-ship':'출고', 'acc-sales':'매출', 'acc-purchase':'매입', 'acc-tax':'세금계산서',
      'mes-plan':'생산계획', 'mat-stock':'재고 현황', 'acc-recv':'채권/자금', 'acc-cashflow':'입출금', 'mes-dash':'생산현황',
      'mes-cli':'거래처', 'mes-prod':'품목', 'mes-mold':'목형', 'mes-vendor':'인쇄소',
      'mat-po':'발주', 'mat-income':'입고', 'mat-bom':'BOM',
      'mes-proc-log':'공정실적', 'mes-outsource':'외주관리', 'qc-inspect':'품질', 'qc-equip':'설비',
      'adm-perm':'권한 관리', 'adm-backup':'백업', 'mes-queue':'시스템설정'
    };

    var group = groupMap[mod] || '';
    var title = titleMap[mod] || mod;
    el.innerHTML = '<span class="uxbc-home" onclick="goMod(\'mes-dash\')">🏠</span>'
      + (group ? '<span class="uxbc-sep">›</span><span class="uxbc-group">'+group+'</span>' : '')
      + '<span class="uxbc-sep">›</span><span class="uxbc-current">'+title+'</span>';

    // 최근 방문 기록
    addRecentMenu(mod, title);
  }

  /* ========== 3. 알림 센터 ========== */

  function getNotifications(){
    var noti = [];
    var td = new Date().toISOString().slice(0,10);

    // 1. 납기 임박 WO (3일 이내)
    (DB.g('wo')||[]).forEach(function(w){
      if(w.status === '출고완료' || w.status === '완료' || w.status === '취소') return;
      var due = w.dueDt || w.sd;
      if(!due) return;
      var diff = (new Date(due) - new Date(td)) / 86400000;
      if(diff < 0){
        noti.push({icon:'🔴', title:(w.cnm||'')+' 납기 지연 '+(-Math.ceil(diff))+'일', sub:w.pnm+' · '+(w.wn||''), level:'danger', action:"goMod('mes-wo')"});
      } else if(diff <= 3){
        noti.push({icon:'🟠', title:(w.cnm||'')+' 납기 '+Math.ceil(diff)+'일 남음', sub:w.pnm+' · '+(w.wn||''), level:'warn', action:"goMod('mes-wo')"});
      }
    });

    // 3. 미수금 30일 이상
    var byCli = {};
    (DB.g('sales')||[]).forEach(function(s){
      var unpaid = (s.amt||0) - (s.paid||0);
      if(unpaid <= 0) return;
      if(!byCli[s.cli]) byCli[s.cli] = {amt:0, oldest:s.dt};
      byCli[s.cli].amt += unpaid;
      if(s.dt < byCli[s.cli].oldest) byCli[s.cli].oldest = s.dt;
    });
    Object.keys(byCli).forEach(function(cli){
      var c = byCli[cli];
      var days = Math.floor((new Date(td) - new Date(c.oldest))/86400000);
      if(days >= 30){
        noti.push({icon:'⚠️', title:cli+' 미수 '+days+'일 경과', sub:fmt(c.amt)+'원', level:'warn', action:"goMod('acc-recv')"});
      }
    });

    // 4. 안전재고 미만 자재
    (DB.g('stock')||[]).forEach(function(s){
      var cur = +(s.qty||0), safe = +(s.safeQty||s.safe||s.minQty||0);
      if(safe <= 0) return;
      if(cur <= 0){
        noti.push({icon:'🛑', title:(s.nm||'자재')+' 재고 소진', sub:'즉시 발주 필요 · 안전재고 '+safe, level:'danger', action:"goMod('mat-safety')"});
      } else if(cur < safe){
        noti.push({icon:'📦', title:(s.nm||'자재')+' 안전재고 미만', sub:'현재 '+cur+' / 안전 '+safe, level:'warn', action:"goMod('mat-safety')"});
      }
    });

    // 5. 반품 미처리 (접수/처리중)
    var pendingClaims = (DB.g('claims')||[]).filter(function(c){return c.type==='반품' && c.st!=='완료';});
    if(pendingClaims.length > 0){
      noti.push({icon:'↩️', title:'처리 대기 반품 '+pendingClaims.length+'건', sub:'완료 처리 시 재고·매출 자동 역동기화', level:'info', action:"goMod('mes-claim')"});
    }

    return noti.slice(0, 20);
  }

  function toggleNotifPanel(){
    var el = document.getElementById('uxNotifPanel');
    if(!el) return;
    el.classList.toggle('hidden');
    if(!el.classList.contains('hidden')) renderNotifications();
  }

  function renderNotifications(){
    var el = document.getElementById('uxNotifList');
    if(!el) return;
    var noti = getNotifications();
    if(noti.length === 0){
      el.innerHTML = '<div style="padding:40px 20px;text-align:center;color:#94A3B8">알림이 없습니다</div>';
    } else {
      var colorMap = {danger:'#DC2626', warn:'#F59E0B', info:'#1E40AF'};
      el.innerHTML = noti.map(function(n){
        return '<div class="uxnt-item uxnt-'+n.level+'" onclick="UX.actionAndClose(\''+(n.action||'').replace(/\'/g,"\\'")+'\')">'
          + '<div class="uxnt-ico" style="color:'+colorMap[n.level]+'">'+n.icon+'</div>'
          + '<div class="uxnt-body"><div class="uxnt-ttl">'+n.title+'</div><div class="uxnt-sub">'+n.sub+'</div></div>'
          + '</div>';
      }).join('');
    }
    // 배지 업데이트
    updateNotifBadge();
  }

  function updateNotifBadge(){
    var badge = document.getElementById('uxNotifBadge');
    if(!badge) return;
    var cnt = getNotifications().length;
    if(cnt > 0){badge.textContent = cnt > 99 ? '99+' : cnt; badge.style.display = 'inline-flex'}
    else badge.style.display = 'none';
  }

  function actionAndClose(action){
    try { eval(action) } catch(e) {}
    var el = document.getElementById('uxNotifPanel');
    if(el) el.classList.add('hidden');
  }

  /* ========== 4. 최근 방문 메뉴 ========== */

  var RECENT_KEY = 'ino_recentMenus';
  var MAX_RECENT = 8;

  function addRecentMenu(mod, title){
    if(!mod || mod === 'mes-dash') return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem(RECENT_KEY)||'[]') } catch(e){}
    list = [{mod:mod, title:title, at:Date.now()}].concat(list.filter(function(x){return x.mod !== mod}));
    list = list.slice(0, MAX_RECENT);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)) } catch(e){}
  }

  function getRecentMenus(){
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]') } catch(e){ return [] }
  }

  /* ========== 5. 키보드 단축키 ========== */

  function initShortcuts(){
    document.addEventListener('keydown', function(e){
      // Cmd+K / Ctrl+K → 전역 검색
      if((e.metaKey || e.ctrlKey) && e.key === 'k'){
        e.preventDefault();
        openGlobalSearch();
        return;
      }
      // Esc → 모달 닫기
      if(e.key === 'Escape'){
        closeGlobalSearch();
        var notif = document.getElementById('uxNotifPanel');
        if(notif && !notif.classList.contains('hidden')) notif.classList.add('hidden');
        var userMenu = document.getElementById('uxUserMenu');
        if(userMenu && !userMenu.classList.contains('hidden')) userMenu.classList.add('hidden');
      }
      // ? → 단축키 도움말
      if(e.key === '?' && !isInputFocused()){
        e.preventDefault();
        showShortcutHelp();
      }
    });
  }

  function isInputFocused(){
    var el = document.activeElement;
    return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
  }

  function showShortcutHelp(){
    if(typeof toast === 'function'){
      toast('Cmd+K: 전역검색 | Esc: 닫기 | ?: 도움말', '');
    }
  }

  /* ========== 6. 사용자 메뉴 ========== */

  function toggleUserMenu(){
    var el = document.getElementById('uxUserMenu');
    if(!el) return;
    el.classList.toggle('hidden');
  }

  /* ========== 7. 상단바 초기화 ========== */

  function initTopBar(){
    var existing = document.getElementById('uxTopBar');
    if(existing){ existing.remove(); }

    // 알림 패널
    var notifPanel = document.getElementById('uxNotifPanel');
    if(!notifPanel){
      notifPanel = document.createElement('div');
      notifPanel.id = 'uxNotifPanel';
      notifPanel.className = 'ux-notif-panel hidden';
      notifPanel.innerHTML =
          '<div class="ux-notif-hdr"><span style="font-weight:700">🔔 알림</span><button onclick="UX.toggleNotifPanel()" style="border:none;background:transparent;font-size:18px;cursor:pointer;color:#94A3B8">×</button></div>'
        + '<div id="uxNotifList" class="ux-notif-list"></div>';
      document.body.appendChild(notifPanel);
    }

    // 사용자 메뉴 드롭다운
    var userMenu = document.getElementById('uxUserMenu');
    if(!userMenu){
      userMenu = document.createElement('div');
      userMenu.id = 'uxUserMenu';
      userMenu.className = 'ux-user-menu hidden';
      userMenu.innerHTML =
          '<div class="ux-um-hdr"><div class="ux-um-avatar" id="uxUmAvatar">관</div>'
        + '<div><div style="font-weight:700;font-size:14px" id="uxUmName">관리자</div><div style="font-size:12px;color:#94A3B8" id="uxUmRole">관리자</div></div></div>'
        + '<div class="ux-um-item" onclick="goMod(\'mes-queue\')">⚙️ 시스템 설정</div>'
        + '<div class="ux-um-item" onclick="goMod(\'adm-perm\')">🔒 권한 관리</div>'
        + '<div class="ux-um-item" onclick="goMod(\'adm-backup\')">💾 백업</div>'
        + '<div class="ux-um-divider"></div>'
        + '<div class="ux-um-item" style="color:#DC2626" onclick="unifiedLogout()">🚪 로그아웃</div>';
      document.body.appendChild(userMenu);
    }

    // 전역 검색 모달
    var gsModal = document.getElementById('uxGlobalSearch');
    if(!gsModal){
      gsModal = document.createElement('div');
      gsModal.id = 'uxGlobalSearch';
      gsModal.className = 'ux-gs-overlay hidden';
      gsModal.onclick = function(e){ if(e.target === gsModal) closeGlobalSearch() };
      gsModal.innerHTML =
          '<div class="ux-gs-box">'
        + '<div class="ux-gs-input-wrap"><span style="font-size:18px">🔍</span><input type="text" id="uxgsInput" placeholder="메뉴 / 거래처 / 품목 / 작업지시서 검색..." oninput="UX.renderSearch(this.value)"><span class="ux-kbd" onclick="UX.closeGlobalSearch()">ESC</span></div>'
        + '<div id="uxgsResults" class="ux-gs-results"></div>'
        + '<div class="ux-gs-footer">↑↓ 이동 · ↵ 선택 · ESC 닫기</div>'
        + '</div>';
      document.body.appendChild(gsModal);
    }

    // 사용자 정보 업데이트
    updateUserInfo();

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener('click', function(e){
      if(!e.target.closest('#uxNotifPanel') && !e.target.closest('.ux-tb-notif')){
        var n = document.getElementById('uxNotifPanel');
        if(n && !n.classList.contains('hidden') && !e.target.closest('.uxnt-item')) n.classList.add('hidden');
      }
      if(!e.target.closest('#uxUserMenu') && !e.target.closest('.ux-tb-btn:last-child')){
        var u = document.getElementById('uxUserMenu');
        if(u && !u.classList.contains('hidden')) u.classList.add('hidden');
      }
    });

    updateNotifBadge();
    // 30초마다 알림 배지 갱신
    setInterval(updateNotifBadge, 30000);
  }

  function updateUserInfo(){
    var cu = (typeof CU !== 'undefined' && CU) ? CU : {nm:'관리자', role:'admin'};
    var ch = (cu.nm || '관').charAt(0);
    var nameEl = document.getElementById('uxUserName');
    var avatarEl = document.getElementById('uxUserAvatar');
    var umName = document.getElementById('uxUmName');
    var umRole = document.getElementById('uxUmRole');
    var umAvatar = document.getElementById('uxUmAvatar');
    if(nameEl) nameEl.textContent = cu.nm || '사용자';
    if(avatarEl) avatarEl.textContent = ch;
    if(umName) umName.textContent = cu.nm || '사용자';
    if(umAvatar) umAvatar.textContent = ch;
    var roleMap = {admin:'관리자', office:'사무실', sales:'영업', material:'자재', accounting:'회계', quality:'품질', worker:'작업자'};
    if(umRole) umRole.textContent = (roleMap[cu.role] || cu.role || '');
  }

  /* ========== Public API ========== */

  return {
    init: function(){
      initTopBar();
      initShortcuts();
    },
    initTopBar: initTopBar,
    openGlobalSearch: openGlobalSearch,
    closeGlobalSearch: closeGlobalSearch,
    renderSearch: renderGlobalSearchResults,
    selectResult: selectResult,
    toggleNotifPanel: toggleNotifPanel,
    toggleUserMenu: toggleUserMenu,
    actionAndClose: actionAndClose,
    updateBreadcrumb: updateBreadcrumb,
    updateUserInfo: updateUserInfo,
    getRecentMenus: getRecentMenus
  };
})();

/* ========== 전역 함수 확장 ========== */

// goMod 후킹하여 브레드크럼 업데이트
(function(){
  if(typeof window.goMod !== 'function') return;
  var origGoMod = window.goMod;
  window.goMod = function(mod){
    origGoMod.apply(this, arguments);
    if(typeof UX !== 'undefined' && UX.updateBreadcrumb) UX.updateBreadcrumb(mod);
  };
})();

// 로그인 성공 후 UX 초기화
window.addEventListener('DOMContentLoaded', function(){
  // 로그인 시점에 맞춰 초기화
  var interval = setInterval(function(){
    var adminApp = document.getElementById('adminApp');
    if(adminApp && adminApp.style.display !== 'none'){
      UX.init();
      clearInterval(interval);
    }
  }, 500);
});
