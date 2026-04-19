/* ============================================
   팩플로우 모바일 앱 로직 (m-app.js)
   core.js의 DB API를 재사용
   ============================================ */

var mState = {
  currentTab: 'home',
  orderFilter: 'all',
  searchType: 'cli',  // 검색 모달 상태
  selectedCompany: 'A'
};

/* ===== 유틸 ===== */
function mq(id){return document.getElementById(id)}
function mFmt(n){return (n||0).toLocaleString('ko-KR')}
function mFmtDate(d){return d?d.slice(5):''}
function mTd(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function mNw(){var d=new Date();return d.toISOString().replace('T',' ').slice(0,16)}
function mGid(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36)}

function mToast(msg, type){
  var t = mq('mToast');
  t.textContent = msg;
  t.className = 'm-toast show' + (type==='err'?' err':'');
  setTimeout(function(){t.className='m-toast'}, 1800);
}

/* ===== 페이지 전환 ===== */
function mGoTab(tab){
  mState.currentTab = tab;
  document.querySelectorAll('.m-page').forEach(function(p){p.classList.remove('on')});
  var pg = mq('mPage' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if(pg) pg.classList.add('on');

  document.querySelectorAll('.m-tab').forEach(function(t){
    t.classList.toggle('on', t.dataset.tab === tab);
  });

  var titles = {home:'홈', order:'패키지 작업', dash:'생산현황', more:'더보기'};
  mq('mHdrTitle').textContent = titles[tab] || '팩플로우';

  // 탭별 렌더링
  if(tab === 'home') mRenderHome();
  else if(tab === 'order') mRenderOrders();
  else if(tab === 'dash') mRenderDash();
  else if(tab === 'more') mRenderMore();

  window.scrollTo({top:0, behavior:'smooth'});
}

/* ===== 로그인 ===== */
function mLoadLoginUsers(){
  var sel = mq('mLoginUser');
  sel.innerHTML = '<option value="">-- 선택 --</option>';

  // 1) 서버 공개 사용자 목록 사용
  fetch('/api/users/public').then(function(r){
    if(!r.ok) throw new Error('API');
    return r.json();
  }).then(function(data){
    var users = [];
    try {
      users = typeof data === 'string' ? JSON.parse(data) : data;
      if (!Array.isArray(users)) users = [];
    } catch(e) { users = []; }

    if (!users.length) {
      users = [{nm:'관리자', un:'admin', role:'admin'}];
    }

    users.forEach(function(u){
      var val = u.un || u.nm;
      var label = u.nm + (u.proc ? ' ('+u.proc+')' : u.role==='admin' ? ' (관리자)' : u.role==='office' ? ' (사무실)' : '');
      sel.innerHTML += '<option value="'+val+'">'+label+'</option>';
    });
  }).catch(function(){
    // API 실패 시 로컬 DB 시도 후 폴백
    var users = [];
    try { users = DB.g('users') || [] } catch(e) {}
    if (!users.length) users = [{nm:'관리자', un:'admin', role:'admin'}];
    users.forEach(function(u){
      var val = u.un || u.nm;
      var label = u.nm + (u.role==='admin' ? ' (관리자)' : '');
      sel.innerHTML += '<option value="'+val+'">'+label+'</option>';
    });
  });
}

function mLogin(){
  var uid = mq('mLoginUser').value;
  var pw = mq('mLoginPw').value;
  if(!uid){mToast('사용자를 선택하세요','err');return}

  fetch('/api/auth/login', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({username: uid, password: pw})
  }).then(function(r){return r.json()}).then(function(res){
    if(res.access_token){
      localStorage.setItem('access_token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token||'');
      localStorage.setItem('current_user', JSON.stringify(res.user));
      window.CU = res.user;
      // core.js의 authFetch가 사용하는 전역 토큰 객체에도 저장 (필수!)
      if(typeof _authTokens !== 'undefined'){
        _authTokens.access = res.access_token;
        _authTokens.refresh = res.refresh_token || null;
      }
      mStartApp();
    } else {
      mq('mLoginErr').textContent = res.detail || '로그인 실패';
    }
  }).catch(function(e){
    mq('mLoginErr').textContent = '서버 연결 실패';
  });
}

function mLogout(){
  if(!confirm('로그아웃 하시겠습니까?')) return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('current_user');
  location.reload();
}

function mStartApp(){
  mq('mLogin').style.display = 'none';
  mq('mApp').style.display = 'block';

  var cu = JSON.parse(localStorage.getItem('current_user')||'{}');
  mq('mUserName').textContent = cu.name || '사용자';

  var today = new Date();
  var days = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  mq('mToday').textContent = (today.getMonth()+1)+'월 '+today.getDate()+'일 '+days[today.getDay()];

  // 서버에서 데이터 로드 후 렌더 (DB.init이 서버 API 호출해서 _cache 채움)
  if(typeof DB.init === 'function'){
    mToast('데이터 로드 중...', '');
    DB.init().then(function(){
      var cnt = (DB.g('cli')||[]).length + (DB.g('prod')||[]).length + (DB.g('mold')||[]).length;
      if(cnt === 0){
        mToast('데이터 비어있음 - 새로고침 시도', 'err');
      } else {
        mToast('데이터 로드 완료 ('+mFmt(cnt)+'건)', 'ok');
      }
      /* QR 딥링크: ?wo=xxx 있으면 바로 WO 상세 */
      try{
        var params=new URLSearchParams(window.location.search||'');
        var woId=params.get('wo');
        if(woId&&typeof mShowWODetail==='function'){
          mGoTab('order');
          setTimeout(function(){mShowWODetail(woId);},300);
          return;
        }
      }catch(e2){}
      mGoTab('home');
    }).catch(function(e){
      console.warn('DB init 실패:', e);
      mToast('데이터 로드 실패 - 오프라인 모드', 'err');
      mGoTab('home');
    });
  } else {
    mGoTab('home');
  }
}

/* ===== 홈 렌더 ===== */
function mRenderHome(){
  var td = mTd();
  var wo = DB.g('wo') || [];

  // 상태별 집계
  var progressWO = wo.filter(function(r){
    return r.status && ['진행','진행중','인쇄','코팅','합지','톰슨','접착'].includes(r.status);
  });
  var waitWO = wo.filter(function(r){
    return !r.status || r.status === '대기' || r.status === '수주' || r.status === '수주확정';
  });
  var dueWO = wo.filter(function(r){
    if(r.status === '출고완료' || r.status === '완료' || r.status === '취소') return false;
    if(!r.dueDt && !r.sd) return false;
    var due = r.dueDt || r.sd;
    var diff = (new Date(due) - new Date(td)) / 86400000;
    return diff >= 0 && diff <= 3;
  });
  var doneWO = wo.filter(function(r){
    return r.status === '출고완료' || r.status === '완료';
  }).filter(function(r){
    // 오늘 완료된 것만
    return (r.cat && r.cat.indexOf(td) === 0) || (r.doneDt === td);
  });

  mq('mHomeWOCnt').textContent = progressWO.length;
  mq('mHomeWaitCnt').textContent = waitWO.length;
  mq('mHomeDueCnt').textContent = dueWO.length;
  mq('mHomeDoneCnt').textContent = doneWO.length;

  // 오늘/이번주 납기
  var due = wo.filter(function(r){
    if(r.status === '출고완료' || r.status === '취소') return false;
    if(!r.dueDt) return false;
    var diff = (new Date(r.dueDt) - new Date(td)) / 86400000;
    return diff >= 0 && diff <= 7;
  }).sort(function(a,b){return a.dueDt > b.dueDt ? 1 : -1}).slice(0, 5);

  var dueHtml = '';
  if(due.length === 0){
    dueHtml = '<div class="m-empty" style="padding:24px"><div class="m-empty-ico"></div><div class="m-empty-msg">예정된 납기가 없습니다</div></div>';
  } else {
    due.forEach(function(r){
      var daysLeft = Math.ceil((new Date(r.dueDt) - new Date(td)) / 86400000);
      var badgeClass = daysLeft <= 1 ? 'red' : daysLeft <= 3 ? 'orange' : 'blue';
      dueHtml += '<div class="m-item" onclick="mShowWODetail(\''+r.id+'\')">'
        + '<div class="m-item-hdr">'
        + '<div class="m-item-title">'+(r.cnm||'-')+'</div>'
        + '<span class="m-badge '+badgeClass+'">D-'+daysLeft+'</span>'
        + '</div>'
        + '<div class="m-item-sub">'+(r.pnm||'')+'</div>'
        + '<div class="m-item-meta">'
        + '<span>'+mFmt(r.fq||0)+'개</span>'
        + '<span>'+r.dueDt+'</span>'
        + '</div>'
        + '</div>';
    });
  }
  mq('mHomeDueList').innerHTML = dueHtml;
}

/* ===== 🏭 생산현황 렌더 ===== */
function mRenderDash(){
  var wo = DB.g('wo') || [];
  var td = mTd();

  // KPI
  var progress = wo.filter(function(r){
    return r.status && ['진행','진행중','인쇄','코팅','합지','톰슨','접착'].includes(r.status);
  });
  var wait = wo.filter(function(r){
    return !r.status || r.status === '대기' || r.status === '수주' || r.status === '수주확정';
  });
  var overdue = wo.filter(function(r){
    if(r.status === '출고완료' || r.status === '완료' || r.status === '취소') return false;
    var due = r.dueDt || r.sd;
    return due && due < td;
  });
  var done = wo.filter(function(r){
    return (r.status === '출고완료' || r.status === '완료') &&
      ((r.cat && r.cat.indexOf(td) === 0) || r.doneDt === td);
  });

  mq('mDashProgress').textContent = progress.length;
  mq('mDashWait').textContent = wait.length;
  mq('mDashOverdue').textContent = overdue.length;
  mq('mDashDone').textContent = done.length;

  // 공정별 현황
  var procCounts = {};
  var allProcs = ['인쇄','코팅','합지','톰슨','접착','검수'];
  allProcs.forEach(function(p){procCounts[p] = {working:0, wait:0}});

  wo.forEach(function(w){
    if(w.status === '출고완료' || w.status === '완료' || w.status === '취소') return;
    if(!w.procs || !w.procs.length) return;
    // 현재 진행 중인 공정 찾기
    var doing = w.procs.find(function(p){return p.st === '진행'});
    var waiting = w.procs.find(function(p){return p.st === '대기'});
    if(doing && procCounts[doing.nm]) procCounts[doing.nm].working++;
    else if(waiting && procCounts[waiting.nm]) procCounts[waiting.nm].wait++;
  });

  var procHtml = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  allProcs.forEach(function(p){
    var c = procCounts[p];
    var total = c.working + c.wait;
    var color = c.working > 0 ? 'var(--m-blue)' : total > 0 ? 'var(--m-orange)' : 'var(--m-text3)';
    procHtml += '<div style="padding:10px 12px;background:var(--m-bg);border-radius:10px">'
      + '<div style="font-size:12px;color:var(--m-text3);margin-bottom:4px">'+p+'</div>'
      + '<div style="font-size:18px;font-weight:700;color:'+color+'">'+total+'<span style="font-size:11px;font-weight:500;margin-left:4px">건</span></div>'
      + (c.working > 0 ? '<div style="font-size:10px;color:var(--m-blue)">진행 '+c.working+'</div>' : '')
      + '</div>';
  });
  procHtml += '</div>';
  mq('mDashProcs').innerHTML = procHtml;

  // 납기 임박 리스트
  var dueList = wo.filter(function(r){
    if(r.status === '출고완료' || r.status === '완료' || r.status === '취소') return false;
    var due = r.dueDt || r.sd;
    if(!due) return false;
    var diff = (new Date(due) - new Date(td)) / 86400000;
    return diff >= -30 && diff <= 7;
  }).sort(function(a,b){
    var da = a.dueDt || a.sd, db = b.dueDt || b.sd;
    return da > db ? 1 : -1;
  }).slice(0, 10);

  if(dueList.length === 0){
    mq('mDashDueList').innerHTML = '<div class="m-empty" style="padding:20px"><div class="m-empty-msg">납기 임박한 작업 없음</div></div>';
  } else {
    mq('mDashDueList').innerHTML = dueList.map(function(r){
      var due = r.dueDt || r.sd;
      var days = Math.ceil((new Date(due) - new Date(td)) / 86400000);
      var badge = days < 0 ? '<span class="m-badge red">지연 '+(-days)+'일</span>' :
                   days === 0 ? '<span class="m-badge red">D-Day</span>' :
                   days <= 3 ? '<span class="m-badge orange">D-'+days+'</span>' :
                   '<span class="m-badge blue">D-'+days+'</span>';
      return '<div class="m-item" onclick="mShowWODetail(\''+r.id+'\')">'
        + '<div class="m-item-hdr"><div class="m-item-title">'+(r.cnm||'-')+'</div>'+badge+'</div>'
        + '<div class="m-item-sub">'+(r.pnm||'')+' · '+mFmt(r.fq||0)+'개</div>'
        + '</div>';
    }).join('');
  }

  // 진행중 WO 리스트
  if(progress.length === 0){
    mq('mDashWOList').innerHTML = '<div class="m-empty" style="padding:20px"><div class="m-empty-msg">진행 중인 작업 없음</div></div>';
  } else {
    mq('mDashWOList').innerHTML = progress.slice(0, 15).map(function(r){
      var pg = mCalcWOProgress(r);
      var currentProc = (r.procs||[]).find(function(p){return p.st === '진행'});
      var procLabel = currentProc ? currentProc.nm : r.status;
      return '<div class="m-item" onclick="mShowWODetail(\''+r.id+'\')">'
        + '<div class="m-item-hdr"><div class="m-item-title">'+(r.cnm||'-')+'</div>'
        + '<span class="m-badge blue">'+procLabel+'</span></div>'
        + '<div class="m-item-sub">'+(r.pnm||'')+' · '+mFmt(r.fq||0)+'개</div>'
        + '<div class="m-progress"><div class="m-progress-bar '+pg.color+'" style="width:'+pg.pct+'%"></div></div>'
        + '<div style="text-align:right;font-size:11px;color:var(--m-text3);margin-top:4px">'+pg.pct+'%</div>'
        + '</div>';
    }).join('');
  }
}

/* ===== ⚙️ 더보기 탭 ===== */
function mRenderMore(){
  var clis = DB.g('cli') || [];
  var prods = DB.g('prod') || [];
  var molds = DB.g('mold') || [];

  mq('mCntCli').textContent = '('+mFmt(clis.length)+')';
  mq('mCntProd').textContent = '('+mFmt(prods.length)+')';
  mq('mCntMold').textContent = '('+mFmt(molds.length)+')';

  var cu = JSON.parse(localStorage.getItem('current_user')||'{}');
  mq('mMoreUser').textContent = cu.name || '-';
}

/* ===== 🔍 검색 모달 ===== */
function mOpenSearch(type){
  mState.searchType = type;
  var titles = {cli:'거래처 검색', prod:'품목 검색', mold:'목형 검색'};
  mq('mSearchTitle').textContent = titles[type] || '검색';
  mq('mSearchInput').value = '';
  mq('mSearchResults').innerHTML = '';
  mOpenModal('mModalSearch');
  setTimeout(function(){mq('mSearchInput').focus()}, 300);
  mRenderSearchResults();
}

function mRenderSearchResults(){
  var type = mState.searchType;
  var key = type === 'cli' ? 'cli' : type === 'prod' ? 'prod' : 'mold';
  var data = DB.g(key) || [];
  var q = (mq('mSearchInput').value || '').trim();
  var hasUtil = typeof SearchUtil !== 'undefined';

  var filtered;
  if(!q){
    filtered = data.slice(0, 50);
  } else {
    filtered = data.filter(function(r){
      var nm = r.nm || r.code || '';
      var extra = '';
      if(type === 'cli') extra = (r.bizNo || '') + ' ' + (r.tel || '') + ' ' + (r.ceo || '');
      else if(type === 'prod') extra = (r.cnm || '') + ' ' + (r.code || '') + ' ' + (r.paper || '');
      else if(type === 'mold') extra = (r.cnm || '') + ' ' + (r.spec || '');

      if(hasUtil){
        return SearchUtil.match(nm, q) || SearchUtil.match(extra, q);
      }
      var lq = q.toLowerCase();
      return nm.toLowerCase().indexOf(lq) >= 0 || extra.toLowerCase().indexOf(lq) >= 0;
    }).slice(0, 100);
    if(hasUtil && filtered.length > 0) SearchUtil.saveHistory(type, q);
  }

  var html = '';
  if(filtered.length === 0){
    var chosungHint = (q && hasUtil && SearchUtil.isChosungOnly(q)) ? '<div class="m-empty-sub">초성 검색 중</div>' : '';
    html = '<div class="m-empty" style="padding:30px"><div class="m-empty-msg">검색 결과 없음</div>'+chosungHint+'</div>';
  } else {
    html = '<div style="font-size:12px;color:var(--m-text3);padding:4px 8px">'+filtered.length+'건 표시 ('+ (q?'검색':'전체')+')</div>';
    filtered.forEach(function(r){
      var nm = r.nm || r.code || '-';
      var sub = '';
      if(type === 'cli') sub = [r.bizNo, r.ceo, r.tel].filter(Boolean).join(' · ');
      else if(type === 'prod') sub = [r.cnm, r.paper, r.spec].filter(Boolean).join(' · ');
      else if(type === 'mold') sub = [r.cnm, r.spec].filter(Boolean).join(' · ');

      var nmHtml = hasUtil ? SearchUtil.highlight(nm, q) : nm;
      var subHtml = sub && hasUtil ? SearchUtil.highlight(sub, q) : sub;

      html += '<div class="m-item" style="padding:10px 14px">'
        + '<div class="m-item-title" style="font-size:14px">'+nmHtml+'</div>'
        + (sub ? '<div class="m-item-sub" style="font-size:12px;margin-top:2px">'+subHtml+'</div>' : '')
        + '</div>';
    });
  }
  mq('mSearchResults').innerHTML = html;
}

function mRefreshData(){
  if(typeof DB.init === 'function'){
    mToast('데이터 새로고침 중...', '');
    DB.init().then(function(){
      mToast('새로고침 완료', 'ok');
      if(mState.currentTab === 'more') mRenderMore();
    });
  }
}

/* ===== 수주/WO 렌더 ===== */
function mRenderOrders(){
  var wo = DB.g('wo') || [];
  var search = (mq('mOrderSearch').value || '').toLowerCase();
  var filter = mState.orderFilter;
  var td = mTd();

  document.querySelectorAll('#mOrderFilters .m-filter-btn').forEach(function(b){
    b.classList.toggle('on', b.dataset.f === filter);
    if(!b.onclick) b.onclick = function(){mState.orderFilter = this.dataset.f; mRenderOrders()};
  });

  var list = wo.filter(function(r){
    if(search){
      var txt = ((r.cnm||'')+' '+(r.pnm||'')+' '+(r.wn||'')+' '+(r.mgr||'')).toLowerCase();
      if(txt.indexOf(search) < 0) return false;
    }
    var due = r.dueDt || r.sd;
    var isActive = r.status !== '출고완료' && r.status !== '완료' && r.status !== '취소';

    if(filter === 'progress') return isActive && r.status !== '대기' && r.status !== '수주';
    if(filter === 'wait') return isActive && (!r.status || r.status === '대기' || r.status === '수주' || r.status === '수주확정');
    if(filter === 'due'){
      if(!isActive || !due) return false;
      var diff = (new Date(due) - new Date(td)) / 86400000;
      return diff >= 0 && diff <= 3;
    }
    if(filter === 'overdue'){
      return isActive && due && due < td;
    }
    if(filter === 'high') return isActive && r.pri === 'high';
    if(filter === 'done') return !isActive;
    return true; // all
  }).sort(function(a,b){
    // 우선순위: 급함 > 보통 > 일반
    var priOrder = {high:0, normal:1, low:2};
    var pa = priOrder[a.pri] !== undefined ? priOrder[a.pri] : 1;
    var pb = priOrder[b.pri] !== undefined ? priOrder[b.pri] : 1;
    if(pa !== pb) return pa - pb;

    // 완료는 뒤로
    var aDone = a.status === '출고완료' || a.status === '완료' || a.status === '취소';
    var bDone = b.status === '출고완료' || b.status === '완료' || b.status === '취소';
    if(aDone && bDone) return (b.cat||'') > (a.cat||'') ? 1 : -1;
    if(aDone) return 1;
    if(bDone) return -1;

    // 납기일 빠른 순
    var da = a.dueDt || a.sd || '9999';
    var db2 = b.dueDt || b.sd || '9999';
    return da > db2 ? 1 : -1;
  });

  var html = '';
  if(list.length === 0){
    html = '<div class="m-empty"><div class="m-empty-ico"></div><div class="m-empty-msg">패키지 작업이 없습니다</div><div class="m-empty-sub">+ 새 작업지시 등록으로 시작하세요</div></div>';
  } else {
    list.forEach(function(r){
      var progress = mCalcWOProgress(r);
      var statusBadge = mWOStatusBadge(r);
      var due = r.dueDt || r.sd;

      // 납기 뱃지
      var dueBadge = '';
      var isActive = r.status !== '출고완료' && r.status !== '완료' && r.status !== '취소';
      if(due && isActive){
        var daysLeft = Math.ceil((new Date(due) - new Date(td)) / 86400000);
        if(daysLeft < 0) dueBadge = '<span class="m-badge red">지연 '+(-daysLeft)+'일</span>';
        else if(daysLeft === 0) dueBadge = '<span class="m-badge red">D-Day</span>';
        else if(daysLeft <= 3) dueBadge = '<span class="m-badge orange">D-'+daysLeft+'</span>';
        else dueBadge = '<span class="m-badge gray">D-'+daysLeft+'</span>';
      }

      // 우선순위 뱃지
      var priBadge = '';
      if(r.pri === 'high') priBadge = '<span class="m-badge red">급함</span>';
      else if(r.pri === 'low') priBadge = '<span class="m-badge gray">일반</span>';

      // 이미지 썸네일
      var imgHtml = '';
      if(r.img){
        imgHtml = '<img src="'+r.img+'" style="width:56px;height:56px;object-fit:cover;border-radius:10px;flex-shrink:0">';
      }

      // 좌우 배치 (이미지 있을 때만 flex, 없으면 기본)
      var mainContent =
          '<div style="flex:1;min-width:0">'
        + '<div class="m-item-hdr">'
        + '<div class="m-item-title" style="font-size:15px">'+(r.cnm||'-')+'</div>'
        + '<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">'+priBadge+dueBadge+'</div>'
        + '</div>'
        + '<div class="m-item-sub" style="font-size:13px">'+(r.pnm||'')+'</div>'
        + '<div class="m-item-meta" style="font-size:11px">'
        + '<span>'+mFmt(r.fq||0)+'개</span>'
        + (r.amt ? '<span>'+mFmt(r.amt)+'원</span>' : '')
        + (r.mgr ? '<span>담당 '+r.mgr+'</span>' : '')
        + (r.wn ? '<span>'+r.wn+'</span>' : '')
        + '</div>'
        + '</div>';

      html += '<div class="m-item" onclick="mShowWODetail(\''+r.id+'\')">'
        + (imgHtml ? '<div style="display:flex;gap:10px;align-items:flex-start">' + imgHtml + mainContent + '</div>' : mainContent)
        + '<div class="m-progress" style="margin-top:8px"><div class="m-progress-bar '+progress.color+'" style="width:'+progress.pct+'%"></div></div>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">'
        + statusBadge
        + '<span style="font-size:11px;color:var(--m-text3);font-weight:600">'+progress.pct+'%</span>'
        + '</div>'
        + '</div>';
    });
  }
  mq('mOrderList').innerHTML = html;
}

function mCalcWOProgress(r){
  var status = r.status || '';
  if(status === '출고완료') return {pct:100, color:'green'};
  if(status === '취소') return {pct:0, color:'red'};
  var pct = 0, color = 'blue';
  if(r.procs && r.procs.length){
    var done = r.procs.filter(function(p){return p.status === '완료' || p.status === 'done'}).length;
    pct = Math.round(done / r.procs.length * 100);
  } else {
    var map = {'수주확정':10, '생산대기':20, '인쇄':30, '코팅':45, '합지':55, '톰슨':70, '접착':85, '완료':95};
    pct = map[status] || 20;
  }
  if(pct >= 80) color = 'orange';
  return {pct:pct, color:color};
}

function mWOStatusBadge(r){
  var status = r.status || '수주';
  var cls = 'gray';
  if(status === '출고완료') cls = 'green';
  else if(status.includes('진행') || ['인쇄','코팅','합지','톰슨','접착'].includes(status)) cls = 'blue';
  else if(status === '대기' || status === '생산대기') cls = 'orange';
  else if(status === '취소') cls = 'red';
  return '<span class="m-badge '+cls+'">'+status+'</span>';
}

/* ===== WO 상세 + 공정 진행 체크 ===== */
function mShowWODetail(id){
  var r = (DB.g('wo')||[]).find(function(x){return x.id===id});
  if(!r){mToast('데이터 없음','err');return}

  mq('mWOId').value = id;
  mq('mWOTitle').textContent = r.wn || '패키지 작업지시';

  // 기본 정보 렌더
  var progress = mCalcWOProgress(r);
  var statusBadge = mWOStatusBadge(r);
  var coBadge = r.companyId === 'B' ?
    '<span class="m-badge purple">법인</span>' :
    '<span class="m-badge blue">개인</span>';

  // 우선순위 배지
  var priBadge = r.pri === 'high' ? '<span class="m-badge red">급함</span>' :
                  r.pri === 'low' ? '<span class="m-badge gray">일반</span>' :
                  '<span class="m-badge blue">보통</span>';

  mq('mWOInfo').innerHTML =
      (r.img ? '<div style="margin-bottom:14px;text-align:center"><img src="'+r.img+'" style="max-width:100%;max-height:240px;border-radius:10px;cursor:pointer" onclick="window.open(\''+r.img+'\')"></div>' : '')
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'
    + '<div style="font-size:18px;font-weight:700">'+(r.cnm||'-')+'</div>'
    + '<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end">'+priBadge+' '+statusBadge+' '+coBadge+'</div>'
    + '</div>'
    + '<div style="font-size:15px;color:var(--m-text2);margin-bottom:10px">'+(r.pnm||'')+'</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;margin-bottom:10px">'
    + '<div><span style="color:var(--m-text3)">수량</span><br><b style="font-size:15px">'+mFmt(r.fq||0)+'개</b></div>'
    + '<div><span style="color:var(--m-text3)">금액</span><br><b style="font-size:15px">'+mFmt(r.amt||0)+'원</b></div>'
    + '<div><span style="color:var(--m-text3)">납기</span><br><b>'+(r.dueDt||r.sd||'-')+'</b></div>'
    + '<div><span style="color:var(--m-text3)">납품처</span><br><b>'+(r.dlv||'-')+'</b></div>'
    + (r.mgr ? '<div><span style="color:var(--m-text3)">담당자</span><br><b>'+r.mgr+'</b></div>' : '')
    + (r.mold ? '<div><span style="color:var(--m-text3)">목형</span><br><b>'+r.mold+'</b></div>' : '')
    + '</div>'
    + (r.nt ? '<div style="padding:10px;background:var(--m-bg);border-radius:8px;font-size:13px;color:var(--m-text2);margin-bottom:10px">'+r.nt+'</div>' : '')
    + '<div class="m-progress" style="height:8px"><div class="m-progress-bar '+progress.color+'" style="width:'+progress.pct+'%"></div></div>'
    + '<div style="text-align:right;font-size:12px;color:var(--m-text3);margin-top:4px">진행률 '+progress.pct+'%</div>';

  // 공정 렌더
  var procs = r.procs || [];
  if(procs.length === 0){
    mq('mWOProcs').innerHTML = '<div class="m-empty" style="padding:24px"><div class="m-empty-msg">등록된 공정이 없습니다</div><div class="m-empty-sub">PC에서 공정을 추가하세요</div></div>';
  } else {
    mq('mWOProcs').innerHTML = procs.map(function(p,i){
      var st = p.st || '대기';
      var stClass = st === '완료' || st === 'done' ? 'green' : st === '진행' || st === 'doing' ? 'blue' : 'gray';
      var stIco = '';
      return '<div class="m-item" style="padding:12px 14px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center">'
        + '<div style="display:flex;align-items:center;gap:10px">'
        + ''
        + '<div>'
        + '<div style="font-weight:700">'+(i+1)+'. '+p.nm+'</div>'
        + (p.vd?'<div style="font-size:11px;color:var(--m-text3)">'+p.vd+'</div>':'')
        + '</div>'
        + '</div>'
        + '<span class="m-badge '+stClass+'">'+st+'</span>'
        + '</div>'
        + '<div style="display:flex;gap:6px;margin-top:10px">'
        + '<button class="m-btn-sm '+(st==='대기'?'m-btn':'m-btn gray')+'" onclick="mSetProcStatus('+i+',\'대기\')" style="flex:1;padding:8px">대기</button>'
        + '<button class="m-btn-sm '+(st==='진행'?'m-btn':'m-btn gray')+'" onclick="mSetProcStatus('+i+',\'진행\')" style="flex:1;padding:8px">진행</button>'
        + '<button class="m-btn-sm '+(st==='완료'?'m-btn green':'m-btn gray')+'" onclick="mSetProcStatus('+i+',\'완료\')" style="flex:1;padding:8px">완료</button>'
        + '</div>'
        + '</div>';
    }).join('');
  }

  mOpenModal('mModalWO');
}

function mSetProcStatus(idx, status){
  var id = mq('mWOId').value;
  var all = DB.g('wo') || [];
  var i = all.findIndex(function(x){return x.id === id});
  if(i < 0) return;

  if(!all[i].procs || !all[i].procs[idx]) return;
  all[i].procs[idx].st = status;

  // 시작/완료 시간 기록
  var nowStr = mNw();
  if(status === '진행' && !all[i].procs[idx].t1) all[i].procs[idx].t1 = nowStr;
  if(status === '완료' && !all[i].procs[idx].t2) all[i].procs[idx].t2 = nowStr;

  // 전체 공정 완료 시 상태 자동 업데이트
  var allDone = all[i].procs.every(function(p){return p.st === '완료'});
  if(allDone && all[i].status !== '출고완료'){
    all[i].status = '완료';
  } else if(all[i].procs.some(function(p){return p.st === '진행'})){
    all[i].status = '진행중';
  }

  DB.s('wo', all);
  mToast(status+' 처리됨', 'ok');
  mShowWODetail(id); // 새로고침
}

function mWOComplete(){
  var id = mq('mWOId').value;
  if(!confirm('이 패키지 작업지시를 완료 처리하시겠습니까?')) return;
  var all = DB.g('wo') || [];
  var i = all.findIndex(function(x){return x.id === id});
  if(i < 0) return;
  all[i].status = '완료';
  if(all[i].procs){
    all[i].procs.forEach(function(p){p.st = '완료'});
  }
  DB.s('wo', all);
  mToast('완료 처리됨', 'ok');
  mCloseModal('mModalWO');
  mRenderOrders();
}

function mWOCancel(){
  var id = mq('mWOId').value;
  if(!confirm('이 패키지 작업지시를 취소하시겠습니까?')) return;
  var all = DB.g('wo') || [];
  var i = all.findIndex(function(x){return x.id === id});
  if(i < 0) return;
  all[i].status = '취소';
  DB.s('wo', all);
  mToast('취소 처리됨', 'ok');
  mCloseModal('mModalWO');
  mRenderOrders();
}

function mEditWO(){
  var id = mq('mWOId').value;
  mCloseModal('mModalWO');
  mOpenNewOrder(id); // 수정 모드로 열기
}

/* ===== 공정 선택 (모바일 등록 시) ===== */
var M_DEFAULT_PROCS = ['인쇄','코팅','합지','톰슨','접착','검수'];

function mRenderProcPick(selectedProcs){
  var available = M_DEFAULT_PROCS.filter(function(p){
    return !selectedProcs.some(function(s){return s.nm === p});
  });
  mq('mOrderProcPick').innerHTML = available.map(function(p){
    return '<button class="m-filter-btn" style="background:var(--m-pri-light);color:var(--m-blue)" onclick="mAddProc(\''+p+'\')">+ '+p+'</button>';
  }).join('');
}

function mRenderSelectedProcs(){
  var html = mOrderProcs.length === 0 ?
    '<span style="font-size:12px;color:var(--m-text3)">공정을 추가하세요 ↓</span>' :
    mOrderProcs.map(function(p,i){
      return '<span class="m-badge blue" style="padding:6px 10px;font-size:13px">'+(i+1)+'. '+p.nm+
        ' <span style="cursor:pointer;margin-left:4px;font-size:14px" onclick="mRemoveProc('+i+')">×</span></span>';
    }).join('');
  mq('mOrderProcs').innerHTML = html;
}

var mOrderProcs = [];

function mAddProc(nm){
  mOrderProcs.push({nm: nm, tp: 'n', mt: '', vd: '', st: '대기', qty: 0, t1: '', t2: ''});
  mRenderSelectedProcs();
  mRenderProcPick(mOrderProcs);
}

function mRemoveProc(idx){
  mOrderProcs.splice(idx, 1);
  mRenderSelectedProcs();
  mRenderProcPick(mOrderProcs);
}

/* ===== 품목 자동완성 (공정 자동 적용) ===== */
function mAcProd(val, listId, inputId){
  var list = mq(listId);
  if(!val || val.length < 1){list.style.display='none';return}

  var prods = DB.g('prod') || [];
  var v = val.toLowerCase();
  var matches = prods.filter(function(p){
    return (p.nm||'').toLowerCase().indexOf(v) >= 0;
  }).slice(0, 8);

  if(matches.length === 0){list.style.display='none';return}

  list.innerHTML = matches.map(function(p){
    var procCnt = (p.procs||[]).length;
    return '<div class="m-ac-item" onclick="mPickProd(\''+p.id+'\')">'
      + '<div style="font-weight:600">'+p.nm+'</div>'
      + '<div style="font-size:11px;color:var(--m-text3)">'+(p.cnm||'-')+' · 공정 '+procCnt+'개</div>'
      + '</div>';
  }).join('');
  list.style.display = 'block';
}

/* ===== 목형 자동완성 ===== */
function mAcMold(val, listId, inputId){
  var list = mq(listId);
  if(!val || val.length < 1){list.style.display='none';return}

  var molds = DB.g('mold') || [];
  var v = val.toLowerCase();
  var matches = molds.filter(function(m){
    var nm = (m.nm || m.code || '').toLowerCase();
    return nm.indexOf(v) >= 0;
  }).slice(0, 10);

  if(matches.length === 0){list.style.display='none';return}

  list.innerHTML = matches.map(function(m){
    var nm = m.nm || m.code || '';
    var sub = [m.cnm, m.spec].filter(Boolean).join(' · ');
    return '<div class="m-ac-item" onclick="mPickMold(\''+(m.id||'')+'\',\''+nm.replace(/\'/g,"\\'")+'\',\''+inputId+'\',\''+listId+'\')">'
      + '<div style="font-weight:600">'+nm+'</div>'
      + (sub ? '<div style="font-size:11px;color:var(--m-text3)">'+sub+'</div>' : '')
      + '</div>';
  }).join('');
  list.style.display = 'block';
}

function mPickMold(id, nm, inputId, listId){
  mq(inputId).value = nm;
  mq(listId).style.display = 'none';
}

function mPickProd(prodId){
  var p = (DB.g('prod')||[]).find(function(x){return x.id === prodId});
  if(!p) return;
  mq('mOrderProd').value = p.nm;
  if(p.cnm && !mq('mOrderCli').value) mq('mOrderCli').value = p.cnm;
  if(p.price && !mq('mOrderPrice').value) mq('mOrderPrice').value = p.price;
  // 기존 공정 자동 적용
  if(p.procs && p.procs.length){
    mOrderProcs = p.procs.map(function(proc){
      return {nm: proc.nm, tp: proc.tp||'n', mt: proc.mt||'', vd: proc.vd||'', st:'대기', qty:0, t1:'', t2:''};
    });
    mRenderSelectedProcs();
    mRenderProcPick(mOrderProcs);
  }
  mq('mOrderProdList').style.display = 'none';
  mCalcOrderAmt();
  mToast('품목 정보 불러옴 (공정 '+(p.procs||[]).length+'개)', 'ok');
}

/* ===== 출고 렌더 ===== */
function mSwitchShipTab(btn, filter){
  mState.shipFilter = filter;
  document.querySelectorAll('#mPageShip .m-filter-btn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
  mRenderShip();
}

function mRenderShip(){
  var wo = DB.g('wo') || [];
  var shipLog = DB.g('shipLog') || [];
  var td = mTd();

  // 오늘 완료
  var todayDone = shipLog.filter(function(r){return r.dt === td});
  mq('mShipDoneCnt').textContent = todayDone.length;

  // 출고 대기
  var waitList = wo.filter(function(r){
    if(r.status === '출고완료' || r.status === '취소') return false;
    // 생산 완료된 것 또는 출고 가능 상태
    return ['출고대기','생산완료','완료','접착'].includes(r.status) || (mCalcWOProgress(r).pct >= 80);
  });
  mq('mShipWaitCnt').textContent = waitList.length;

  var list = mState.shipFilter === 'wait' ? waitList : todayDone;
  var html = '';

  if(list.length === 0){
    html = '<div class="m-empty"><div class="m-empty-ico"></div><div class="m-empty-msg">'+(mState.shipFilter==='wait'?'출고 대기 중인 작업이 없습니다':'오늘 출고 건이 없습니다')+'</div></div>';
  } else if(mState.shipFilter === 'wait'){
    list.forEach(function(r){
      html += '<div class="m-item">'
        + '<div class="m-item-hdr"><div class="m-item-title">'+(r.cnm||'')+'</div>'
        + '<span class="m-badge orange">대기</span></div>'
        + '<div class="m-item-sub">'+(r.pnm||'')+'</div>'
        + '<div class="m-item-meta">'
        + '<span>'+mFmt(r.fq||0)+'개</span>'
        + (r.amt?'<span>'+mFmt(r.amt)+'원</span>':'')
        + '</div>'
        + '<button class="m-btn green m-btn-sm" onclick="mOpenShip(\''+r.id+'\')" style="margin-top:10px">▶ 출고 확정</button>'
        + '</div>';
    });
  } else {
    // 오늘 완료 목록
    list.forEach(function(r){
      html += '<div class="m-item">'
        + '<div class="m-item-hdr"><div class="m-item-title">'+(r.cnm||'')+'</div>'
        + '<span class="m-badge green">완료</span></div>'
        + '<div class="m-item-sub">'+(r.pnm||'')+'</div>'
        + '<div class="m-item-meta">'
        + '<span>출고 '+mFmt(r.qty||0)+'개</span>'
        + (r.defect?'<span style="color:var(--m-red)">불량 '+r.defect+'</span>':'')
        + (r.car?'<span>'+r.car+'</span>':'')
        + '</div>'
        + '</div>';
    });
  }
  mq('mShipList').innerHTML = html;
}

function mOpenShip(woId){
  var wo = (DB.g('wo')||[]).find(function(x){return x.id===woId});
  if(!wo){mToast('패키지 작업지시 없음','err');return}

  mq('mShipWoId').value = woId;
  mq('mShipInfo').innerHTML = '<b>'+(wo.cnm||'')+'</b><br>'
    + (wo.pnm||'') + '<br>'
    + '<span style="color:var(--m-text3)">수량: '+mFmt(wo.fq||0)+'개</span>';
  mq('mShipQty').value = wo.fq || '';
  mq('mShipDefect').value = 0;
  mq('mShipGood').value = mFmt(wo.fq||0);
  mq('mShipCar').value = '';
  mq('mShipDriver').value = '';
  mq('mShipDlv').value = '';
  mq('mShipMemo').value = '';

  mOpenModal('mModalShip');
}

function mCalcGood(){
  var q = +mq('mShipQty').value || 0;
  var d = +mq('mShipDefect').value || 0;
  mq('mShipGood').value = mFmt(Math.max(0, q-d));
}

function mDoShip(){
  var woId = mq('mShipWoId').value;
  var qty = +mq('mShipQty').value;
  var defect = +mq('mShipDefect').value || 0;

  if(!qty || qty <= 0){mToast('출고 수량을 입력하세요','err');return}

  var wo = (DB.g('wo')||[]).find(function(x){return x.id===woId});
  if(!wo){mToast('패키지 작업지시 없음','err');return}

  var rec = {
    id: mGid(),
    woId: woId,
    wn: wo.wn,
    cnm: wo.cnm,
    origCnm: wo.cnm,
    pnm: wo.pnm,
    qty: qty,
    defect: defect,
    good: qty-defect,
    car: mq('mShipCar').value,
    driver: mq('mShipDriver').value,
    dlv: mq('mShipDlv').value,
    memo: mq('mShipMemo').value,
    dt: mTd(),
    tm: mNw(),
    mgr: (window.CU||{}).name || ''
  };

  var logs = DB.g('shipLog') || [];
  logs.push(rec);
  DB.s('shipLog', logs);

  // WO 상태 업데이트
  var allWO = DB.g('wo');
  var idx = allWO.findIndex(function(x){return x.id===woId});
  if(idx >= 0){
    allWO[idx].status = '출고완료';
    DB.s('wo', allWO);
  }

  // 매출 자동 등록
  try {
    var unitPrice = wo.price || (wo.amt && wo.fq ? Math.round(wo.amt/wo.fq) : 0);
    var salesAmt = Math.round(unitPrice * qty);
    var sb = DB.g('sales') || [];
    sb.push({
      id: mGid(),
      dt: mTd(),
      cli: wo.cnm,
      prod: wo.pnm,
      qty: qty,
      price: unitPrice,
      amt: salesAmt,
      paid: 0,
      payType: '미수',
      note: '모바일 출고 ('+wo.wn+')',
      woId: woId,
      shipId: rec.id,
      companyId: wo.companyId || 'A'
    });
    DB.s('sales', sb);
  } catch(e){console.warn('매출 자동등록 실패',e)}

  mToast('출고 확정 완료', 'ok');
  mCloseModal('mModalShip');
  mRenderShip();
}

/* ===== 매출 렌더 ===== */
function mRenderSales(){
  var sales = DB.g('sales') || [];
  var td = mTd();
  var month = td.slice(0,7);

  // 이번 달 매출
  var monthSales = sales.filter(function(r){return r.dt && r.dt.slice(0,7) === month});
  var monthSum = monthSales.reduce(function(s,r){return s+(r.amt||0)},0);
  mq('mSalesMonth').textContent = mFmt(monthSum)+'원';

  // 미수금
  var unpaid = sales.reduce(function(s,r){return s + Math.max(0, (r.amt||0)-(r.paid||0))}, 0);
  mq('mSalesUnpaid').textContent = mFmt(unpaid)+'원';

  // 필터
  var filter = mState.salesFilter;
  document.querySelectorAll('#mPageSales .m-filter-btn').forEach(function(b){
    b.classList.toggle('on', b.dataset.f === filter);
    if(!b.onclick) b.onclick = function(){mState.salesFilter=this.dataset.f; mRenderSales()};
  });

  var list = sales.filter(function(r){
    if(filter === 'unpaid') return (r.amt||0)-(r.paid||0) > 0;
    if(filter === 'today') return r.dt === td;
    if(filter === 'week'){
      var weekAgo = new Date(Date.now() - 7*86400000).toISOString().slice(0,10);
      return r.dt >= weekAgo;
    }
    return true;
  }).sort(function(a,b){return b.dt > a.dt ? 1 : -1});

  var html = '';
  if(list.length === 0){
    html = '<div class="m-empty"><div class="m-empty-ico"></div><div class="m-empty-msg">매출 내역이 없습니다</div></div>';
  } else {
    list.slice(0, 50).forEach(function(r){
      var u = Math.max(0, (r.amt||0)-(r.paid||0));
      var statusBadge = u <= 0 ? '<span class="m-badge green">완납</span>' :
                         (r.paid||0) > 0 ? '<span class="m-badge orange">부분</span>' :
                         '<span class="m-badge red">미수</span>';
      var coBadge = r.companyId === 'B' ?
        '<span class="m-badge purple">법인</span>' :
        '<span class="m-badge blue">개인</span>';

      html += '<div class="m-item">'
        + '<div class="m-item-hdr">'
        + '<div class="m-item-title">'+r.cli+'</div>'
        + statusBadge
        + '</div>'
        + '<div class="m-item-sub">'+(r.prod||'-')+'</div>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">'
        + '<div style="font-size:15px;font-weight:700">'+mFmt(r.amt||0)+'원</div>'
        + '<div style="display:flex;gap:6px">'+coBadge+'<span style="font-size:12px;color:var(--m-text3)">'+r.dt+'</span></div>'
        + '</div>'
        + (u > 0 ? '<div style="font-size:12px;color:var(--m-red);margin-top:4px">미수금 '+mFmt(u)+'원</div>' : '')
        + '</div>';
    });
    if(list.length > 50){
      html += '<div class="m-empty-sub" style="text-align:center;padding:16px">최근 50건만 표시됩니다. 전체 내역은 PC에서 확인하세요.</div>';
    }
  }
  mq('mSalesList').innerHTML = html;
}

/* ===== 새 수주/WO 등록 ===== */
var mCurrentImg = ''; // 업로드된 이미지 base64
var mCurrentPri = 'normal';

function mOpenNewOrder(editId){
  // 수정 모드 or 신규
  var existing = null;
  if(editId){
    existing = (DB.g('wo')||[]).find(function(x){return x.id === editId});
  }

  mq('mOrderId').value = editId || '';
  mq('mOrderCli').value = existing ? (existing.cnm||'') : '';
  mq('mOrderProd').value = existing ? (existing.pnm||'') : '';
  mq('mOrderQty').value = existing ? (existing.fq||'') : '';
  mq('mOrderPrice').value = existing ? (existing.price||'') : '';
  mq('mOrderDue').value = existing ? (existing.dueDt || existing.sd || '') : '';
  if(mq('mOrderDlv')) mq('mOrderDlv').value = existing ? (existing.dlv||'') : '';
  if(mq('mOrderMold')) mq('mOrderMold').value = existing ? (existing.mold||'') : '';
  mq('mOrderNote').value = existing ? (existing.nt||existing.note||'') : '';
  mState.selectedCompany = existing ? (existing.companyId || 'A') : 'A';
  mUpdateCompanyRadio('mOrderCompany', mState.selectedCompany);
  mCalcOrderAmt();

  // 우선순위
  mCurrentPri = existing ? (existing.pri || 'normal') : 'normal';
  mUpdatePriRadio(mCurrentPri);
  document.querySelectorAll('#mOrderPri .m-radio').forEach(function(r){
    r.onclick = function(){
      mCurrentPri = this.dataset.pri;
      mUpdatePriRadio(mCurrentPri);
    };
  });

  // 담당자 옵션 채우기
  var mgrSel = mq('mOrderMgr');
  if(mgrSel){
    var users = DB.g('users') || [];
    if(!users.length) users = [{nm:(window.CU||{}).name || '관리자'}];
    mgrSel.innerHTML = '<option value="">-- 선택 --</option>' +
      users.map(function(u){
        var nm = u.nm;
        return '<option value="'+nm+'">'+nm+(u.proc?' ('+u.proc+')':'')+'</option>';
      }).join('');
    mgrSel.value = existing ? (existing.mgr||'') : ((window.CU||{}).name || '');
  }

  // 이미지 미리보기
  mCurrentImg = existing ? (existing.img || '') : '';
  mRenderImgPreview();

  // 공정 상태
  if(existing && existing.procs && existing.procs.length){
    mOrderProcs = existing.procs.map(function(p){
      return {nm:p.nm, tp:p.tp||'n', mt:p.mt||'', vd:p.vd||'', st:p.st||'대기', qty:p.qty||0, t1:p.t1||'', t2:p.t2||''};
    });
  } else {
    mOrderProcs = [];
  }
  mRenderSelectedProcs();
  mRenderProcPick(mOrderProcs);

  // 타이틀
  var titleEl = document.querySelector('#mModalOrder .m-modal-title');
  if(titleEl) titleEl.textContent = editId ? '패키지 작업지시 수정' : '새 작업지시';

  // 금액 자동 계산
  mq('mOrderQty').oninput = mCalcOrderAmt;
  mq('mOrderPrice').oninput = mCalcOrderAmt;

  // 회사 선택
  document.querySelectorAll('#mOrderCompany .m-radio').forEach(function(r){
    r.onclick = function(){
      mUpdateCompanyRadio('mOrderCompany', this.dataset.co);
      mState.selectedCompany = this.dataset.co;
    };
  });

  mOpenModal('mModalOrder');
}

function mCalcOrderAmt(){
  var q = +mq('mOrderQty').value || 0;
  var p = +mq('mOrderPrice').value || 0;
  mq('mOrderAmt').value = mFmt(q*p) + '원';
}

function mSaveOrder(){
  var cli = mq('mOrderCli').value.trim();
  var prod = mq('mOrderProd').value.trim();
  var qty = +mq('mOrderQty').value;
  var price = +mq('mOrderPrice').value;
  var due = mq('mOrderDue').value;
  var dlv = mq('mOrderDlv') ? mq('mOrderDlv').value.trim() : '';
  var mold = mq('mOrderMold') ? mq('mOrderMold').value.trim() : '';

  if(!cli){mToast('거래처를 입력하세요','err');return}
  if(!prod){mToast('제품명을 입력하세요','err');return}
  if(!qty){mToast('수량을 입력하세요','err');return}
  if(!due){mToast('납기일을 선택하세요','err');return}

  var editId = mq('mOrderId').value;
  var wo = DB.g('wo') || [];

  if(editId){
    // 수정
    var idx = wo.findIndex(function(x){return x.id === editId});
    if(idx < 0){mToast('원본을 찾을 수 없음','err');return}
    wo[idx].cnm = cli;
    wo[idx].pnm = prod;
    wo[idx].fq = qty;
    wo[idx].price = price;
    wo[idx].amt = qty*price;
    wo[idx].dueDt = due;
    wo[idx].sd = due;
    wo[idx].dlv = dlv;
    wo[idx].mold = mold;
    wo[idx].nt = mq('mOrderNote').value;
    wo[idx].companyId = mState.selectedCompany;
    wo[idx].pri = mCurrentPri;
    wo[idx].mgr = mq('mOrderMgr') ? mq('mOrderMgr').value : wo[idx].mgr;
    wo[idx].img = mCurrentImg;
    wo[idx].procs = mOrderProcs.map(function(p){return Object.assign({}, p)});
    DB.s('wo', wo);
    mToast('수정 완료', 'ok');
  } else {
    // 신규
    var yr = new Date().getFullYear(), mo = String(new Date().getMonth()+1).padStart(2,'0');
    var seq = wo.filter(function(x){return x.wn && x.wn.indexOf('WO-'+yr+'-'+mo)===0}).length + 1;
    var wn = 'WO-'+yr+'-'+mo+'-'+String(seq).padStart(3,'0');

    var rec = {
      id: mGid(),
      wn: wn,
      dt: mTd(),
      mgr: mq('mOrderMgr') ? mq('mOrderMgr').value : ((window.CU||{}).name || ''),
      cnm: cli,
      pnm: prod,
      fq: qty,
      price: price,
      amt: qty*price,
      sd: due,
      dueDt: due,
      dlv: dlv,
      mold: mold,
      status: '대기',
      cat: mNw(),
      nt: mq('mOrderNote').value,
      companyId: mState.selectedCompany,
      pri: mCurrentPri,
      img: mCurrentImg,
      procs: mOrderProcs.map(function(p){return Object.assign({}, p)}),
      colors: []
    };

    wo.push(rec);
    DB.s('wo', wo);
    mToast('패키지 작업지시 등록 완료', 'ok');
  }

  mCloseModal('mModalOrder');
  mRenderOrders();
  if(mState.currentTab === 'home') mRenderHome();
}

/* ===== 매출 등록 ===== */
function mOpenNewSale(){
  mq('mSaleDt').value = mTd();
  mq('mSaleCli').value = '';
  mq('mSaleProd').value = '';
  mq('mSaleQty').value = '';
  mq('mSalePrice').value = '';
  mq('mSaleAmt').value = '';
  mq('mSalePaid').value = 0;
  mq('mSaleNote').value = '';
  mState.selectedCompany = 'A';
  mUpdateCompanyRadio('mSaleCompany', 'A');

  mq('mSaleQty').oninput = mCalcSaleAmt;
  mq('mSalePrice').oninput = mCalcSaleAmt;

  document.querySelectorAll('#mSaleCompany .m-radio').forEach(function(r){
    r.onclick = function(){
      mUpdateCompanyRadio('mSaleCompany', this.dataset.co);
      mState.selectedCompany = this.dataset.co;
    };
  });

  mOpenModal('mModalSale');
}

function mCalcSaleAmt(){
  var q = +mq('mSaleQty').value || 1;
  var p = +mq('mSalePrice').value || 0;
  mq('mSaleAmt').value = mFmt(q*p) + '원';
}

function mSaveSale(){
  var cli = mq('mSaleCli').value.trim();
  var prod = mq('mSaleProd').value.trim();
  var price = +mq('mSalePrice').value;

  if(!cli){mToast('거래처를 입력하세요','err');return}
  if(!prod){mToast('품명을 입력하세요','err');return}
  if(!price){mToast('단가를 입력하세요','err');return}

  var qty = +mq('mSaleQty').value || 1;
  var paid = +mq('mSalePaid').value || 0;
  var amt = qty * price;

  var rec = {
    id: mGid(),
    dt: mq('mSaleDt').value || mTd(),
    cli: cli,
    prod: prod,
    qty: qty,
    price: price,
    amt: amt,
    paid: paid,
    payType: paid >= amt ? '완납' : paid > 0 ? '부분' : '미수',
    note: mq('mSaleNote').value,
    cat: mNw(),
    companyId: mState.selectedCompany
  };

  var sales = DB.g('sales') || [];
  sales.push(rec);
  DB.s('sales', sales);

  mToast('매출 등록 완료', 'ok');
  mCloseModal('mModalSale');
  mRenderSales();
  if(mState.currentTab === 'home') mRenderHome();
}

/* ===== 공통: 회사 라디오 업데이트 ===== */
function mUpdateCompanyRadio(groupId, co){
  document.querySelectorAll('#'+groupId+' .m-radio').forEach(function(r){
    r.classList.toggle('on', r.dataset.co === co);
  });
}

/* ===== 우선순위 라디오 업데이트 ===== */
function mUpdatePriRadio(pri){
  document.querySelectorAll('#mOrderPri .m-radio').forEach(function(r){
    r.classList.toggle('on', r.dataset.pri === pri);
  });
}

/* ===== 📷 이미지 처리 ===== */
function mHandleImgPick(input){
  var file = input.files && input.files[0];
  if(!file) return;

  // 최대 파일 크기 제한 (5MB)
  if(file.size > 5 * 1024 * 1024){
    mToast('이미지는 5MB 이하만 가능', 'err');
    return;
  }

  mToast('이미지 처리 중...', '');

  var reader = new FileReader();
  reader.onload = function(e){
    // 이미지를 Canvas로 리사이즈 (최대 1280px, 품질 0.8)
    var img = new Image();
    img.onload = function(){
      var MAX = 1280;
      var w = img.width, h = img.height;
      if(w > MAX || h > MAX){
        if(w > h){h = h * MAX / w; w = MAX;}
        else {w = w * MAX / h; h = MAX;}
      }
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      mCurrentImg = canvas.toDataURL('image/jpeg', 0.8);
      mRenderImgPreview();
      mToast('이미지 첨부됨', 'ok');
    };
    img.onerror = function(){mToast('이미지 로드 실패', 'err')};
    img.src = e.target.result;
  };
  reader.onerror = function(){mToast('파일 읽기 실패', 'err')};
  reader.readAsDataURL(file);

  // input 리셋 (같은 파일 다시 선택 가능)
  input.value = '';
}

function mRenderImgPreview(){
  var el = mq('mOrderImgPreview');
  if(!el) return;
  if(mCurrentImg){
    // 약 KB 크기 계산
    var kb = Math.round(mCurrentImg.length * 0.75 / 1024);
    el.innerHTML = '<div style="position:relative;display:inline-block">'
      + '<img src="'+mCurrentImg+'" style="max-width:100%;max-height:200px;border-radius:10px;border:1px solid var(--m-sep)">'
      + '<button type="button" onclick="mRemoveImg()" style="position:absolute;top:6px;right:6px;width:28px;height:28px;border-radius:14px;background:rgba(0,0,0,0.7);color:#fff;border:none;font-size:16px;cursor:pointer"></button>'
      + '<div style="font-size:11px;color:var(--m-text3);margin-top:4px">'+kb+' KB</div>'
      + '</div>';
  } else {
    el.innerHTML = '';
  }
}

function mRemoveImg(){
  mCurrentImg = '';
  mRenderImgPreview();
}

/* ===== 거래처 자동완성 ===== */
function mAcCli(val, listId, inputId){
  var list = mq(listId);
  if(!val || val.length < 1){list.style.display='none';return}

  var clis = DB.g('cli') || [];
  var v = val.toLowerCase();
  var matches = clis.filter(function(c){
    return (c.nm||'').toLowerCase().indexOf(v) >= 0;
  }).slice(0, 10);

  if(matches.length === 0){list.style.display='none';return}

  list.innerHTML = matches.map(function(c){
    return '<div class="m-ac-item" onclick="mPickCli(\''+c.nm.replace(/'/g,"\\'")+'\',\''+inputId+'\',\''+listId+'\')">'+c.nm+'</div>';
  }).join('');
  list.style.display = 'block';
}

function mPickCli(nm, inputId, listId){
  mq(inputId).value = nm;
  mq(listId).style.display = 'none';
}

/* ===== 모달 ===== */
function mOpenModal(id){
  mq(id).classList.add('on');
  document.body.style.overflow = 'hidden';
}

function mCloseModal(id){
  mq(id).classList.remove('on');
  document.body.style.overflow = '';
  // 자동완성 닫기
  document.querySelectorAll('.m-ac-list').forEach(function(l){l.style.display='none'});
}

/* ===== 초기화 ===== */
window.addEventListener('DOMContentLoaded', function(){
  // 로그인 토큰 있으면 바로 앱 시작
  var token = localStorage.getItem('access_token');
  var refresh = localStorage.getItem('refresh_token');
  if(token){
    try {
      var cu = JSON.parse(localStorage.getItem('current_user')||'null');
      if(cu){
        window.CU = cu;
        // core.js의 authFetch가 사용하는 전역 토큰 객체 복원 (필수!)
        if(typeof _authTokens !== 'undefined'){
          _authTokens.access = token;
          _authTokens.refresh = refresh || null;
        }
        mStartApp();
        return;
      }
    } catch(e){}
  }
  mLoadLoginUsers();
});
