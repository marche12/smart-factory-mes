/* ============================================
   팩플로우 모바일 앱 로직 (m-app.js)
   core.js의 DB API를 재사용
   ============================================ */

var mState = {
  currentTab: 'home',
  orderFilter: 'all',
  searchType: 'cli',  // 검색 모달 상태
  selectedCompany: 'A',
  expandedWO: ''       // accordion: 카드별 펼침 ID
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
/* 현재 활성 모바일 탭 재렌더 (storage 이벤트 핸들러용) */
function mRefreshCurrentView(){
  if(!mState || !mState.currentTab) return;
  if(mState.currentTab === 'home')       mRenderHome();
  else if(mState.currentTab === 'order') mRenderOrders();
  else if(mState.currentTab === 'cli')   mRenderCli();
  else if(mState.currentTab === 'prod')  mRenderProd();
}

/* ============================================
   거래처 탭 (대표/영업 외부 조회)
   - 검색: 거래처명/담당자/전화/주소/사업자번호
   - 표시: 이름/담당자/전화 tel:/주소/최근 작업
   - 마스터 수정·삭제 금지
   ============================================ */
function mRenderCli(){
  var clis = DB.g('cli') || [];
  var wos  = DB.g('wo')  || [];
  var input = mq('mCliSearchInput');
  var q = ((input && input.value) || '').trim().toLowerCase();
  var hasUtil = typeof SearchUtil !== 'undefined';

  var list = clis.filter(function(c){
    if(!q) return true;
    var hay = [c.nm, c.ceo, c.mgr, c.tel, c.phone, c.mobile, c.addr, c.bizNo].filter(Boolean).join(' ').toLowerCase();
    if(hasUtil) return SearchUtil.match(hay, q);
    return hay.indexOf(q) >= 0;
  }).slice(0, 100);

  var cnt = mq('mCliCount'); if(cnt) cnt.textContent = list.length;

  var box = mq('mCliList');
  if(!box) return;
  if(!list.length){
    box.innerHTML = '<div class="m-empty" style="padding:30px"><div class="m-empty-msg">검색 결과 없음</div></div>';
    return;
  }
  box.innerHTML = list.map(function(c){
    var tel = c.tel || c.phone || c.mobile || '';
    var telBtn = tel
      ? '<a class="m-wo-link-btn" onclick="event.stopPropagation()" href="tel:'+tel.replace(/[^0-9+]/g,'')+'">'+tel+'</a>'
      : '';
    /* 최근 작업지시 (이 거래처의 최근 3건) */
    var recent = wos.filter(function(w){return w.cnm === c.nm || w.cid === c.id;})
      .sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');}).slice(0, 3);
    var recentHtml = recent.length
      ? '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--m-bdr);font-size:11px;color:var(--m-text3)">최근 '+recent.length+'건: '
        + recent.map(function(w){return '<span style="margin-right:6px">'+(w.pnm||'-')+(w.dueDt?'('+w.dueDt.slice(5)+')':'')+'</span>';}).join('')
        + '</div>'
      : '';
    var meta = [];
    if(c.ceo) meta.push('대표 '+c.ceo);
    if(c.mgr) meta.push('담당 '+c.mgr);
    if(c.bizNo) meta.push(c.bizNo);
    if(c.addr) meta.push(c.addr);
    return '<div class="m-item" style="padding:12px 14px">'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">'
      +   '<div style="flex:1;min-width:0">'
      +     '<div class="m-item-title" style="font-size:15px">'+(c.nm||'-')+'</div>'
      +     (meta.length ? '<div class="m-item-sub" style="font-size:12px;margin-top:2px">'+meta.join(' · ')+'</div>' : '')
      +   '</div>'
      +   telBtn
      + '</div>'
      + recentHtml
      + '</div>';
  }).join('');
}

/* ============================================
   품목 탭 (단가 확인)
   - 검색: 품목명/코드/거래처/규격
   - 표시: 품목명/코드/규격/기준단가/최근 적용단가
   - 마스터/단가 수정·삭제 금지
   ============================================ */
function mRenderProd(){
  var prods = DB.g('prod') || [];
  var wos   = DB.g('wo')   || [];
  var sales = DB.g('sales')|| [];
  var input = mq('mProdSearchInput');
  var q = ((input && input.value) || '').trim().toLowerCase();
  var hasUtil = typeof SearchUtil !== 'undefined';

  /* 최근 단가 인덱스: 품목명 → 가장 최근 단가/일자 */
  function findRecentPrice(pnm){
    if(!pnm) return null;
    /* 1순위: sales 의 amt/qty (가장 정확한 실거래가) */
    var s = sales.filter(function(x){return x.pnm === pnm && x.qty && x.amt;})
      .sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');})[0];
    if(s){
      var unit = Math.round(Math.abs(s.amt) / Math.abs(s.qty));
      return {price: unit, dt: s.dt, src: '매출'};
    }
    /* 2순위: wo 의 price 또는 amt/fq */
    var w = wos.filter(function(x){return x.pnm === pnm && (x.price || (x.amt && x.fq));})
      .sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');})[0];
    if(w){
      var p = w.price || Math.round((w.amt||0)/(w.fq||1));
      return {price: p, dt: w.dt || w.dueDt || '', src: '작업지시'};
    }
    return null;
  }

  var list = prods.filter(function(p){
    if(!q) return true;
    var hay = [p.nm, p.code, p.cnm, p.spec, p.paper].filter(Boolean).join(' ').toLowerCase();
    if(hasUtil) return SearchUtil.match(hay, q);
    return hay.indexOf(q) >= 0;
  }).slice(0, 100);

  var cnt = mq('mProdCount'); if(cnt) cnt.textContent = list.length;

  var box = mq('mProdList');
  if(!box) return;
  if(!list.length){
    box.innerHTML = '<div class="m-empty" style="padding:30px"><div class="m-empty-msg">검색 결과 없음</div></div>';
    return;
  }
  box.innerHTML = list.map(function(p){
    var basePrice = p.price || p.basePrice || 0;
    var rec = findRecentPrice(p.nm);
    var meta = [];
    if(p.code) meta.push('코드 '+p.code);
    if(p.cnm) meta.push(p.cnm);
    if(p.spec) meta.push(p.spec);
    if(p.paper) meta.push(p.paper);
    var priceRow =
        '<div style="display:flex;gap:14px;margin-top:8px;font-size:12px">'
      +   '<div><span style="color:var(--m-text3)">기준단가</span> '
      +     '<b style="color:var(--m-text);font-size:14px">'+(basePrice ? mFmt(basePrice)+'원' : '-')+'</b></div>'
      +   (rec
            ? '<div><span style="color:var(--m-text3)">최근('+rec.src+')</span> '
              + '<b style="color:#E8913A;font-size:14px">'+mFmt(rec.price)+'원</b>'
              + (rec.dt?'<span style="color:var(--m-text3);margin-left:4px">'+rec.dt.slice(5)+'</span>':'')
              + '</div>'
            : '')
      + '</div>';
    return '<div class="m-item" style="padding:12px 14px">'
      + '<div class="m-item-title" style="font-size:15px">'+(p.nm||'-')+'</div>'
      + (meta.length ? '<div class="m-item-sub" style="font-size:12px;margin-top:2px">'+meta.join(' · ')+'</div>' : '')
      + priceRow
      + '</div>';
  }).join('');
}
window.mRenderCli = mRenderCli;
window.mRenderProd = mRenderProd;

function mGoTab(tab){
  mState.currentTab = tab;
  document.querySelectorAll('.m-page').forEach(function(p){p.classList.remove('on')});
  var pg = mq('mPage' + tab.charAt(0).toUpperCase() + tab.slice(1));
  if(pg) pg.classList.add('on');

  document.querySelectorAll('.m-tab').forEach(function(t){
    t.classList.toggle('on', t.dataset.tab === tab);
  });

  var titles = {home:'생산현황', order:'작업지시', cli:'거래처', prod:'품목단가'};
  mq('mHdrTitle').textContent = titles[tab] || '팩플로우';

  // 탭별 렌더링 (대표/영업 외부 조회 + 작업지시 보조 작성)
  if(tab === 'home')      mRenderHome();
  else if(tab === 'order') mRenderOrders();
  else if(tab === 'cli')   mRenderCli();
  else if(tab === 'prod')  mRenderProd();

  window.scrollTo({top:0, behavior:'smooth'});
}

/* 헤더 우측 ⋮ 메뉴 토글 (PC전환 / 새로고침 / 로그아웃) */
function mToggleHdrMenu(){
  var el = mq('mHdrMenu');
  if(!el) return;
  el.style.display = el.style.display === 'block' ? 'none' : 'block';
}
window.mToggleHdrMenu = mToggleHdrMenu;

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

  /* 대표/영업용 KPI: 진행중 / 완료대기 / 납기임박(3일) / 지연 */
  var progressWO = wo.filter(mIsWOInProgress);
  var waitDoneWO = wo.filter(mIsWOCompleteWait);
  var dueWO      = wo.filter(function(r){
    if(!mIsWOActive(r)) return false;
    var due = mGetDue(r);
    if(!due) return false;
    var diff = (new Date(due) - new Date(td)) / 86400000;
    return diff >= 0 && diff <= 3;
  });
  var overdueWO  = wo.filter(function(r){
    if(!mIsWOActive(r)) return false;
    var due = mGetDue(r);
    return due && due < td;
  });

  var elProgress  = mq('mHomeWOCnt');       if(elProgress)  elProgress.textContent  = progressWO.length;
  var elWaitDone  = mq('mHomeWaitDoneCnt'); if(elWaitDone)  elWaitDone.textContent  = waitDoneWO.length;
  var elDue       = mq('mHomeDueCnt');      if(elDue)       elDue.textContent       = dueWO.length;
  var elOverdue   = mq('mHomeOverdueCnt');  if(elOverdue)   elOverdue.textContent   = overdueWO.length;

  /* 진행 카드 (현장이 아니라 외부 응대용 — 큼직하게 진행률·D-Day) */
  var progressList = mq('mHomeProgressList');
  if(progressList){
    if(!progressWO.length){
      progressList.innerHTML = '<div class="m-empty" style="padding:20px"><div class="m-empty-msg">진행 중인 작업 없음</div></div>';
    } else {
      progressList.innerHTML = progressWO.slice(0, 10).map(function(r){
        var pg = mCalcWOProgress(r);
        var due = mGetDue(r);
        var dInfo = mDDayInfo(due);
        var currentProc = (r.procs||[]).find(mIsProcDoing);
        var procLabel = currentProc ? currentProc.nm : (r.status||'-');
        return '<div class="m-item" onclick="mShowWODetail(\''+r.id+'\')" style="padding:12px 14px">'
          + '<div class="m-item-hdr"><div class="m-item-title">'+(r.cnm||'-')+'</div>'
          +   '<span class="m-badge '+dInfo.cls+'">'+dInfo.label+'</span></div>'
          + '<div class="m-item-sub">'+(r.pnm||'')+' · '+mFmt(r.fq||0)+'개</div>'
          + '<div class="m-progress" style="margin-top:6px"><div class="m-progress-bar '+pg.color+'" style="width:'+pg.pct+'%"></div></div>'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:11px">'
          +   '<span style="color:var(--m-blue);font-weight:700">▸ '+procLabel+'</span>'
          +   '<span style="color:var(--m-text3);font-weight:700">'+pg.pct+'%</span>'
          + '</div></div>';
      }).join('');
    }
  }

  // 오늘/이번주 납기 (7일 이내, 활성만)
  var due = wo.filter(function(r){
    if(!mIsWOActive(r)) return false;
    var d = mGetDue(r);
    if(!d) return false;
    var diff = (new Date(d) - new Date(td)) / 86400000;
    return diff >= 0 && diff <= 7;
  }).sort(function(a,b){
    var da = mGetDue(a), db = mGetDue(b);
    return da > db ? 1 : -1;
  }).slice(0, 5);

  var dueHtml = '';
  if(due.length === 0){
    dueHtml = '<div class="m-empty" style="padding:24px"><div class="m-empty-ico"></div><div class="m-empty-msg">예정된 납기가 없습니다</div></div>';
  } else {
    due.forEach(function(r){
      var d = mGetDue(r);
      var info = mDDayInfo(d);
      dueHtml += '<div class="m-item" onclick="mShowWODetail(\''+r.id+'\')">'
        + '<div class="m-item-hdr">'
        + '<div class="m-item-title">'+(r.cnm||'-')+'</div>'
        + '<span class="m-badge '+info.cls+'">'+info.label+'</span>'
        + '</div>'
        + '<div class="m-item-sub">'+(r.pnm||'')+'</div>'
        + '<div class="m-item-meta">'
        + '<span>'+mFmt(r.fq||0)+'개</span>'
        + '<span>'+d+'</span>'
        + '</div>'
        + '</div>';
    });
  }
  mq('mHomeDueList').innerHTML = dueHtml;
}

/* ===== 생산현황 렌더 ===== */
function mRenderDash(){
  var wo = DB.g('wo') || [];
  var td = mTd();

  // KPI (헬퍼 통일)
  var progress = wo.filter(mIsWOInProgress);
  var wait     = wo.filter(mIsWOWaiting);
  var overdue  = wo.filter(function(r){
    if(!mIsWOActive(r)) return false;
    var due = mGetDue(r);
    return due && due < td;
  });
  var done = wo.filter(function(r){
    if(!mIsWODoneLike(r)) return false;
    return (r.cat && r.cat.indexOf(td) === 0) || r.doneDt === td;
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
    if(!mIsWOActive(w) || mIsWOCompleteWait(w)) return;
    if(!Array.isArray(w.procs) || !w.procs.length) return;
    // 현재 진행 중인 공정 / 다음 대기 공정
    var doing   = w.procs.find(mIsProcDoing);
    var waiting = w.procs.find(function(p){return mNormProcState(p.st) === '대기';});
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
    if(!mIsWOActive(r)) return false;
    var due = mGetDue(r);
    if(!due) return false;
    var diff = (new Date(due) - new Date(td)) / 86400000;
    return diff >= -30 && diff <= 7;
  }).sort(function(a,b){
    var da = mGetDue(a), db = mGetDue(b);
    return da > db ? 1 : -1;
  }).slice(0, 10);

  if(dueList.length === 0){
    mq('mDashDueList').innerHTML = '<div class="m-empty" style="padding:20px"><div class="m-empty-msg">납기 임박한 작업 없음</div></div>';
  } else {
    mq('mDashDueList').innerHTML = dueList.map(function(r){
      var due = mGetDue(r);
      var d = mDDayInfo(due);
      var badge = '<span class="m-badge '+d.cls+'">'+d.label+'</span>';
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
      var currentProc = (r.procs||[]).find(mIsProcDoing);
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

/* ===== 더보기 탭 (deprecated — 헤더 메뉴로 이전) ===== */
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

/* ===== 검색 모달 ===== */
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
      var imgHtml = r.img
        ? '<img class="m-wo-thumb" src="'+r.img+'" alt="">'
        : '';

      /* 공정 타임라인 (CSS 클래스 사용) */
      var timelineHtml = mBuildProcTimeline(r);

      /* D-Day */
      var dInfo = mDDayInfo(due);
      var dueBadge = mIsWOActive(r) && due
        ? '<span class="m-badge '+dInfo.cls+'">'+dInfo.label+'</span>'
        : '';

      /* accordion 펼침 여부 */
      var isOpen = mState.expandedWO === r.id;

      var card =
          '<div class="m-wo-card'+(isOpen?' open':'')+'" data-wo-id="'+r.id+'" onclick="mToggleWOCard(\''+r.id+'\')">'
        +   '<div class="m-wo-card-head">'
        +     '<span class="m-wo-no">'+(r.wn||'WO')+'</span>'
        +     '<span class="m-wo-badges">'+priBadge+statusBadge+'</span>'
        +   '</div>'
        +   (imgHtml
              ? '<div class="m-wo-row-thumb">'+imgHtml+'<div class="m-wo-text">'
                + '<div class="m-wo-client">'+(r.cnm||'-')+'</div>'
                + '<div class="m-wo-product">'+(r.pnm||'-')+'</div>'
                + '<div class="m-wo-meta"><span><b>'+mFmt(r.fq||0)+'</b>개</span>'
                + (due ? '<span>· 납기 <b>'+due+'</b></span>' : '')
                + ' '+dueBadge+'</div>'
                + '</div></div>'
              : '<div class="m-wo-client">'+(r.cnm||'-')+'</div>'
                + '<div class="m-wo-product">'+(r.pnm||'-')+'</div>'
                + '<div class="m-wo-meta"><span><b>'+mFmt(r.fq||0)+'</b>개</span>'
                + (due ? '<span>· 납기 <b>'+due+'</b></span>' : '')
                + ' '+dueBadge+'</div>')
        +   '<div class="m-wo-progress-row">'
        +     '<div class="m-progress"><div class="m-progress-bar '+progress.color+'" style="width:'+progress.pct+'%"></div></div>'
        +     '<div class="m-wo-progress-foot">'
        +       timelineHtml
        +       '<span class="m-wo-pct">'+progress.pct+'%</span>'
        +     '</div>'
        +   '</div>'
        +   '<div class="m-wo-expand-label">'+(isOpen?'접기':'상세 보기')+'</div>'
        +   (isOpen ? mBuildAccordionBody(r) : '')
        + '</div>';

      html += card;
    });
  }
  mq('mOrderList').innerHTML = html;
}

/* 카드 토글 (accordion) — 카드 자체 클릭 핸들러 */
function mToggleWOCard(id){
  /* 펼침 영역 내부의 인터랙티브 요소 클릭은 토글되지 않도록 호출자에서 stopPropagation 처리 */
  mState.expandedWO = mState.expandedWO === id ? '' : id;
  mRenderOrders();
}

/* accordion 본문: 거래처/담당자/연락처/납품처/목형/이미지/메모/공정/이력 */
function mBuildAccordionBody(wo){
  var stop = ' onclick="event.stopPropagation()"';

  /* 거래처 마스터 매칭 (연락처) */
  var cli = (DB.g('cli') || []).find(function(c){
    return c.id === wo.cid || c.nm === wo.cnm;
  });
  var tel = wo.tel || wo.phone || wo.mobile || (cli && (cli.tel || cli.phone || cli.mobile)) || '';
  var telLink = tel
    ? '<a class="m-wo-link-btn"'+stop+' href="tel:'+tel.replace(/[^0-9+]/g,'')+'">전화 '+tel+'</a>'
    : '';

  /* 정보 grid 항목 — 값이 있을 때만 추가 */
  var items = [];
  function add(label, value){
    if(value === undefined || value === null || value === '') return;
    items.push('<div class="m-wo-detail-item"><div class="m-wo-detail-lbl">'+label+'</div><div class="m-wo-detail-val">'+value+'</div></div>');
  }
  add('거래처', wo.cnm);
  add('담당자', wo.mgr);
  if(tel) items.push('<div class="m-wo-detail-item"><div class="m-wo-detail-lbl">연락처</div><div class="m-wo-detail-val">'+telLink+'</div></div>');
  add('납품처', wo.dlv);
  add('목형', wo.mold);

  var imgHtml = wo.img
    ? '<div class="m-wo-detail-img"><img src="'+wo.img+'" alt=""'+stop+' onload="this.style.opacity=1"></div>'
    : '';
  var noteHtml = wo.nt
    ? '<div class="m-wo-detail-note">'+wo.nt+'</div>'
    : '';

  /* 공정 진행 (세로 타임라인) */
  var procRows = '';
  if(Array.isArray(wo.procs) && wo.procs.length){
    procRows = wo.procs.map(function(p,i){
      var st = mNormProcState(p.st);
      var dotCls = mIsProcDone(p) ? 'done' : mIsProcDoing(p) ? 'doing' : mIsProcHold(p) ? 'hold' : 'wait';
      var stCls  = dotCls;
      var meta = [];
      if(p.vd) meta.push(p.vd);
      if(p.qty) meta.push(mFmt(p.qty)+'개');
      if(p.t1) meta.push('시작 '+p.t1.slice(5,16));
      if(p.t2) meta.push('완료 '+p.t2.slice(5,16));
      return '<div class="m-wo-proc-row">'
        +   '<span class="m-wo-dot '+dotCls+'"></span>'
        +   '<div class="m-wo-proc-body">'
        +     '<div class="m-wo-proc-name">'+(i+1)+'. '+(p.nm||'-')+'</div>'
        +     (meta.length ? '<div class="m-wo-proc-meta">'+meta.join(' · ')+'</div>' : '')
        +   '</div>'
        +   '<span class="m-wo-proc-st '+stCls+'">'+st+'</span>'
        + '</div>';
    }).join('');
  }

  /* 변경이력 (최근 3건) */
  var logs = (DB.g('changeLog') || DB.g('ino_changeLog') || []).filter(function(l){
    if(!l) return false;
    if(l.woId === wo.id) return true;
    if(l.wid === wo.id)  return true;
    if(l.id === wo.id)   return true;
    if(wo.wn && l.target && String(l.target).indexOf(wo.wn) >= 0) return true;
    if(l.target && String(l.target).indexOf(wo.id) >= 0) return true;
    if(wo.wn && l.wn === wo.wn) return true;
    return false;
  }).sort(function(a,b){
    return (b.dt||b.tm||'').localeCompare(a.dt||a.tm||'');
  }).slice(0, 3);

  var logsHtml = '';
  if(logs.length){
    logsHtml = '<div class="m-wo-section-t">최근 변경이력</div>'
      + logs.map(function(l){
          var when = l.dt || l.tm || '';
          var who  = l.user || l.by || '';
          var what = l.detail || l.msg || l.action || '';
          return '<div class="m-wo-log">'
            + '<div class="m-wo-log-when">'+when+(who?' · '+who:'')+'</div>'
            + (what ? '<div class="m-wo-log-what">'+what+'</div>' : '')
            + '</div>';
        }).join('');
  }

  return '<div class="m-wo-accordion"'+stop+'>'
    + (imgHtml ? imgHtml : '')
    + (items.length ? '<div class="m-wo-detail-grid">'+items.join('')+'</div>' : '')
    + (noteHtml ? '<div class="m-wo-section-t">메모</div>'+noteHtml : '')
    + (procRows ? '<div class="m-wo-section-t">공정 진행</div>'+procRows : '')
    + logsHtml
    + '<button class="m-btn"'+stop+' onclick="event.stopPropagation();mShowWODetail(\''+wo.id+'\')">전체 상세 열기</button>'
    + '</div>';
}

/* ============================================
   상태값/공정 흐름 헬퍼 (PC 동기화 기준)
   ============================================ */
var M_DONE_STATES = ['완료','외주완료','스킵'];

function mNormProcState(st){
  if(st === '진행') return '진행중';
  if(st === 'doing') return '진행중';
  if(st === 'done')  return '완료';
  return st || '대기';
}
function mIsProcDone(p){ return !!p && M_DONE_STATES.indexOf(mNormProcState(p.st)) >= 0; }
function mIsProcDoing(p){ return !!p && mNormProcState(p.st) === '진행중'; }
function mIsProcHold(p){
  if(!p) return false;
  var st = mNormProcState(p.st);
  return st === '보류' || st === '외주대기';
}

function mGetDue(wo){ return (wo && (wo.dueDt || wo.sd || wo.due || wo.dlvDt)) || ''; }

function mIsWOClosed(wo){ return !!wo && ['출고완료','취소'].indexOf(wo.status) >= 0; }
function mIsWOCompleteWait(wo){ return !!wo && wo.status === '완료대기'; }
function mIsWOActive(wo){ return !mIsWOClosed(wo); }
function mIsWODoneLike(wo){
  if(!wo) return false;
  return wo.status === '완료대기' || wo.status === '출고완료' || wo.status === '완료';
}
function mHasDoingProc(wo){ return !!wo && Array.isArray(wo.procs) && wo.procs.some(mIsProcDoing); }
function mAllProcsDone(wo){
  return !!wo && Array.isArray(wo.procs) && wo.procs.length > 0 && wo.procs.every(mIsProcDone);
}

/* WO가 "진행중"으로 보일 조건 (UI 집계용) */
function mIsWOInProgress(wo){
  if(!wo || mIsWOClosed(wo) || mIsWOCompleteWait(wo)) return false;
  if(mHasDoingProc(wo)) return true;
  if(wo.status === '진행중') return true;
  /* 레거시: 공정명을 그대로 status에 저장한 경우 */
  return ['인쇄','코팅','합지','톰슨','접착'].indexOf(wo.status) >= 0;
}

/* WO가 "대기"로 보일 조건 */
function mIsWOWaiting(wo){
  if(!wo || mIsWOClosed(wo) || mIsWOCompleteWait(wo) || mIsWOInProgress(wo)) return false;
  if(!wo.status) return true;
  return ['대기','수주','수주확정','생산대기'].indexOf(wo.status) >= 0;
}

/* ============================================
   공정 이력(hist) 기록 — PC 보고서(genRpt)와 호환
   PC 구조: {id, woId, pnm, cnm, proc, worker, qty, t1, t2, setupMin, doneAt}
   ============================================ */
function mRecordProcHist(wo, proc, status){
  if(!wo || !proc) return;
  /* 완료 성격(완료/외주완료/스킵) 만 기록 — PC와 동일 */
  if(M_DONE_STATES.indexOf(status) < 0) return;

  var hs = DB.g('hist') || [];
  var nowStr = mNw();
  var today = mTd();

  /* 중복 방지: 같은 woId+proc+status가 최근 1분 내 있으면 스킵 */
  var dupe = hs.find(function(h){
    if(h.woId !== wo.id) return false;
    if(h.proc !== proc.nm) return false;
    var when = h.doneAt || h.t2 || h.tm || '';
    if(!when) return false;
    var diffMs = (new Date(nowStr.replace(' ','T')+':00') - new Date(when.replace(' ','T')+ (when.length===16?':00':''))) ;
    return diffMs >= 0 && diffMs < 60000;
  });
  if(dupe) return;

  var workerNm = (typeof CU !== 'undefined' && CU && (CU.nm || CU.name)) ||
                 (typeof window !== 'undefined' && window.CU && (window.CU.nm || window.CU.name)) ||
                 '모바일';

  hs.push({
    id: mGid(),
    woId: wo.id,
    pnm:  wo.pnm  || '',
    cnm:  wo.cnm  || '',
    proc: proc.nm || '',
    worker: workerNm,
    qty:  Number(proc.qty || wo.fq || 0),
    t1:   proc.t1 || '',
    t2:   proc.t2 || nowStr,
    setupMin: 0,
    doneAt: nowStr,
    src: 'mobile'
  });
  DB.s('hist', hs);
}

/* D-Day 정보 (label + cls) */
function mDDayInfo(due){
  if(!due) return {label:'-', cls:'gray'};
  var now = new Date(); now.setHours(0,0,0,0);
  var d = new Date(due + 'T00:00:00');
  var diff = Math.round((d - now) / 86400000);
  if(diff < 0)   return {label:'지연 '+(-diff)+'일', cls:'red'};
  if(diff === 0) return {label:'D-Day', cls:'red'};
  if(diff <= 2)  return {label:'D-'+diff, cls:'orange'};
  return {label:'D-'+diff, cls:'green'};
}

/* 공정 타임라인 — ● 완료(녹) / ◐ 진행중(파) / ◌ 보류(주) / ○ 대기(회) */
function mBuildProcTimeline(r){
  var procs = (r && r.procs) || [];
  if(!procs.length) return '<span class="m-wo-empty-proc">공정 없음</span>';
  var show = procs.slice(0, 6);
  var dotsHtml = show.map(function(p){
    var cls = mIsProcDone(p) ? 'done' : mIsProcDoing(p) ? 'doing' : mIsProcHold(p) ? 'hold' : 'wait';
    return '<span class="m-wo-dot '+cls+'"></span>';
  }).join('');
  var more = procs.length > show.length
    ? '<span class="m-wo-timeline-more">+'+(procs.length-show.length)+'</span>'
    : '';
  /* 현재 진행중 우선, 없으면 첫 대기, 둘다 없으면 마지막 */
  var current = procs.find(mIsProcDoing) ||
                procs.find(function(p){return mNormProcState(p.st)==='대기';}) ||
                procs[procs.length-1];
  var label = current ? '<span class="m-wo-timeline-label">'+current.nm+'</span>' : '';
  return '<div class="m-wo-timeline">'+dotsHtml+more+label+'</div>';
}

function mCalcWOProgress(r){
  var status = (r && r.status) || '';
  if(status === '출고완료') return {pct:100, color:'green'};
  if(status === '취소') return {pct:0, color:'red'};

  var pct = 0;
  if(r && Array.isArray(r.procs) && r.procs.length){
    var done = r.procs.filter(mIsProcDone).length;
    pct = Math.round(done / r.procs.length * 100);
  } else {
    var map = {'수주확정':10,'생산대기':20,'대기':20,'진행중':50,'인쇄':30,'코팅':45,'합지':55,'톰슨':70,'접착':85,'완료대기':100,'완료':100};
    pct = map[status] || 20;
  }

  var color = 'blue';
  if(status === '완료대기' || pct >= 100) color = 'green';
  else if(pct >= 80) color = 'orange';
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
    + '<div style="text-align:right;font-size:12px;color:var(--m-text3);margin-top:4px">진행률 '+progress.pct+'%</div>'
    /* 대표/영업 외부용 — 출고 이력은 조회 허용, 거래처 변경 등 확정성 액션은 PC로 안내 */
    + '<div style="display:flex;gap:6px;margin-top:12px">'
    +   '<button class="m-btn-sm m-btn" onclick="mShowShipHistory(\''+id+'\')" style="flex:1;padding:10px">출고 이력</button>'
    + '</div>';

  // 공정 렌더
  var procs = r.procs || [];
  if(procs.length === 0){
    mq('mWOProcs').innerHTML = '<div class="m-empty" style="padding:24px"><div class="m-empty-msg">등록된 공정이 없습니다</div><div class="m-empty-sub">PC에서 공정을 추가하세요</div></div>';
  } else {
    /* 대표/영업 외부용 — 공정 조회 전용 (시작/완료 버튼 숨김)
       작업자/관리자 권한 + window.M_ENABLE_PROC_BTN === true 일 때만 노출 */
    var showProcBtn = (typeof window !== 'undefined' && window.M_ENABLE_PROC_BTN === true) &&
                      (typeof CU !== 'undefined' && CU && (CU.role === 'worker' || CU.role === 'admin'));
    mq('mWOProcs').innerHTML = procs.map(function(p,i){
      var st = p.st || '대기';
      if(st === '진행') st = '진행중'; /* 레거시 보정 */
      var stClass = mIsProcDone({st:st}) ? 'green' : st === '진행중' || st === 'doing' ? 'blue' : 'gray';
      var meta = [];
      if(p.vd) meta.push(p.vd);
      if(p.t1) meta.push('시작 '+p.t1.slice(5,16));
      if(p.t2) meta.push('완료 '+p.t2.slice(5,16));
      var btnRow = showProcBtn
        ? ('<div style="display:flex;gap:6px;margin-top:10px">'
          + '<button class="m-btn-sm '+(st==='대기'?'m-btn':'m-btn gray')+'" onclick="mSetProcStatus('+i+',\'대기\')" style="flex:1;padding:8px">대기</button>'
          + '<button class="m-btn-sm '+(st==='진행중'?'m-btn':'m-btn gray')+'" onclick="mSetProcStatus('+i+',\'진행중\')" style="flex:1;padding:8px">진행중</button>'
          + '<button class="m-btn-sm '+(mIsProcDone({st:st})?'m-btn green':'m-btn gray')+'" onclick="mSetProcStatus('+i+',\'완료\')" style="flex:1;padding:8px">완료</button>'
          + '</div>')
        : '';
      return '<div class="m-item" style="padding:12px 14px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center">'
        +   '<div style="flex:1;min-width:0">'
        +     '<div style="font-weight:700">'+(i+1)+'. '+p.nm+'</div>'
        +     (meta.length ? '<div style="font-size:11px;color:var(--m-text3);margin-top:2px">'+meta.join(' · ')+'</div>' : '')
        +   '</div>'
        +   '<span class="m-badge '+stClass+'">'+st+'</span>'
        + '</div>'
        + btnRow
        + '</div>';
    }).join('');
  }

  mOpenModal('mModalWO');
}

function mSetProcStatus(idx, status){
  /* 상태값 정규화 — 레거시 입력 보정 */
  status = mNormProcState(status);

  var id = mq('mWOId').value;
  var all = DB.g('wo') || [];
  var i = all.findIndex(function(x){return x.id === id});
  if(i < 0) return;

  if(!all[i].procs || !all[i].procs[idx]) return;
  if(mIsWOClosed(all[i])){ mToast('이미 종료된 작업입니다','err'); return; }

  /* 기존 procs 의 레거시 값(진행/doing/done) 일괄 정규화 */
  all[i].procs.forEach(function(p){ p.st = mNormProcState(p.st); });

  all[i].procs[idx].st = status;

  // 시작/완료 시간 기록
  var nowStr = mNw();
  if(status === '진행중' && !all[i].procs[idx].t1) all[i].procs[idx].t1 = nowStr;
  if(M_DONE_STATES.indexOf(status) >= 0 && !all[i].procs[idx].t2) all[i].procs[idx].t2 = nowStr;

  // 전체 공정 완료 시 PC 기준 '완료대기'로 전환 (출고완료/취소 보존)
  if(mAllProcsDone(all[i])){
    if(all[i].status !== '출고완료' && all[i].status !== '취소'){
      all[i].status = '완료대기';
    }
  } else if(all[i].procs.some(mIsProcDoing)){
    if(all[i].status !== '출고완료' && all[i].status !== '완료대기' && all[i].status !== '취소'){
      all[i].status = '진행중';
    }
  }

  DB.s('wo', all);

  /* 공정 완료(완료/외주완료/스킵) 시 PC 호환 hist 기록 */
  if(M_DONE_STATES.indexOf(status) >= 0){
    mRecordProcHist(all[i], all[i].procs[idx], status);
  }

  mToast(status+' 처리됨', 'ok');
  mShowWODetail(id); // 새로고침
}

/* ===== 모바일: 출고 이력 + 개별 출고 취소 ===== */
function mShowShipHistory(woId){
  var logs = (DB.g('shipLog') || []).filter(function(s){return s.woId === woId}).sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'')});
  var wo = (DB.g('wo')||[]).find(function(x){return x.id === woId});
  if(!logs.length){ mToast('출고 이력 없음', ''); return; }
  var html = '<div style="padding:14px"><div style="font-weight:700;margin-bottom:10px">'+(wo?wo.wn:'-')+' 출고 이력 ('+logs.length+'건)</div>';
  logs.forEach(function(s){
    var chg = s.isCliChanged ? '<span class="m-badge red" style="margin-left:6px">거래처변경</span>' : '';
    html += '<div style="padding:10px;border:1px solid var(--m-bdr);border-radius:10px;margin-bottom:8px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center"><b>'+s.dt+'</b>'+chg+'</div>'
      + '<div style="font-size:13px;margin-top:4px">'+(s.cnm||'-')+' · '+mFmt(s.qty||0)+'매'
      + (s.defect?' <span style="color:#DC2626">(불량 '+s.defect+')</span>':'')
      + '</div>'
      + (s.origCnm&&s.origCnm!==s.cnm?'<div style="font-size:11px;color:var(--m-text3)">원거래처: '+s.origCnm+'</div>':'')
      + '<button class="m-btn-sm m-btn gray" onclick="mCancelShip(\''+s.id+'\')" style="margin-top:8px;padding:8px 14px;background:#DC2626;color:#fff">이 출고 취소</button>'
      + '</div>';
  });
  html += '<button class="m-btn-sm" onclick="mCloseModal(\'mShipHistMo\')" style="width:100%;margin-top:8px;padding:10px;background:var(--m-bg2);border:1px solid var(--m-bdr);border-radius:10px">닫기</button></div>';
  var el = document.getElementById('mShipHistMo');
  if(!el){ el = document.createElement('div'); el.id = 'mShipHistMo'; el.className = 'm-modal'; document.body.appendChild(el); }
  el.innerHTML = '<div class="m-modal-body" style="max-height:85vh;overflow:auto">'+html+'</div>';
  el.classList.add('on');
}
function mCancelShip(shipId){
  if(!confirm('이 출고를 취소합니다.\n재고/매출/세금계산서도 자동으로 원복됩니다. 계속?')) return;
  if(typeof cancelShipById === 'function'){
    cancelShipById(shipId, true);
    mToast('출고 취소 완료', 'ok');
    mCloseModal('mShipHistMo');
    // 현재 WO 상세 새로고침
    var wid = mq('mWOId').value;
    if(wid) mShowWODetail(wid);
    mRenderOrders();
    return;
  }
  // cancelShipById 없으면 수동 처리 (최소 shipLog만 제거)
  var logs = (DB.g('shipLog')||[]).filter(function(s){return s.id !== shipId});
  DB.s('shipLog', logs);
  mToast('출고만 취소 (매출/세금은 PC에서 확인)', 'warn');
  mCloseModal('mShipHistMo');
}
/* ===== 모바일: 출고 거래처 변경 (다음 출고에 적용) ===== */
function mChangeShipCli(woId){
  var wo = (DB.g('wo')||[]).find(function(x){return x.id === woId});
  if(!wo) return;
  var clis = (DB.g('cli')||[]).filter(function(c){return !c.cType || c.cType === 'sales' || c.cType === 'both'}).slice(0, 30);
  var html = '<div style="padding:14px">'
    + '<div style="font-weight:700;margin-bottom:6px">납품 거래처 변경</div>'
    + '<div style="font-size:12px;color:var(--m-text2);margin-bottom:10px">원 거래처: <b>'+(wo.cnm||'-')+'</b><br>변경된 거래처는 다음 출고부터 매출/세금계산서에 반영됩니다</div>'
    + '<select id="mCliChangeReason" style="width:100%;padding:10px;border:1px solid var(--m-bdr);border-radius:8px;margin-bottom:8px;font-size:13px">'
    + '<option value="4|기재사항의 착오 정정">4. 기재사항의 착오 정정</option>'
    + '<option value="3|공급가액의 변동">3. 공급가액의 변동</option>'
    + '<option value="1|환입">1. 환입</option>'
    + '<option value="2|계약의 해제">2. 계약의 해제</option>'
    + '</select>'
    + '<input id="mCliSearch" placeholder="거래처명 검색..." oninput="mFilterCliChange()" style="width:100%;padding:10px;border:1px solid var(--m-bdr);border-radius:8px;margin-bottom:8px">'
    + '<div id="mCliChangeList" style="max-height:50vh;overflow:auto"></div>'
    + '<button class="m-btn-sm" onclick="mCloseModal(\'mCliChangeMo\')" style="width:100%;margin-top:8px;padding:10px;background:var(--m-bg2);border:1px solid var(--m-bdr);border-radius:10px">취소</button>'
    + '</div>';
  var el = document.getElementById('mCliChangeMo');
  if(!el){ el = document.createElement('div'); el.id = 'mCliChangeMo'; el.className = 'm-modal'; document.body.appendChild(el); }
  el.dataset.woid = woId;
  el.innerHTML = '<div class="m-modal-body" style="max-height:90vh;overflow:auto">'+html+'</div>';
  el.classList.add('on');
  mFilterCliChange();
}
function mFilterCliChange(){
  var q = (document.getElementById('mCliSearch')||{}).value || '';
  q = q.toLowerCase();
  var clis = (DB.g('cli')||[]).filter(function(c){
    if(c.cType && c.cType!=='sales' && c.cType!=='both') return false;
    if(!q) return true;
    return (c.nm||'').toLowerCase().includes(q) || (c.tel||'').includes(q);
  }).slice(0, 40);
  var html = clis.length ? clis.map(function(c){
    return '<div onclick="mPickCliChange(\''+c.id+'\')" style="padding:12px;border:1px solid var(--m-bdr);border-radius:8px;margin-bottom:6px;cursor:pointer">'
      + '<div style="font-weight:700">'+(c.nm||'')+'</div>'
      + '<div style="font-size:11px;color:var(--m-text3);margin-top:2px">'+(c.bizNo||'')+(c.tel?' · '+c.tel:'')+'</div>'
      + '</div>';
  }).join('') : '<div style="padding:20px;text-align:center;color:var(--m-text3)">검색 결과 없음</div>';
  document.getElementById('mCliChangeList').innerHTML = html;
}
function mPickCliChange(cid){
  var c = (DB.g('cli')||[]).find(function(x){return x.id===cid});
  if(!c) return;
  var el = document.getElementById('mCliChangeMo');
  var woId = el.dataset.woid;
  var reasonVal = (document.getElementById('mCliChangeReason')||{}).value || '4|기재사항의 착오 정정';
  var parts = reasonVal.split('|');
  /* 저장: WO에 nextShipCliOverride 필드로 보관 → PC의 다음 출고에서 사용 */
  var all = DB.g('wo')||[];
  var i = all.findIndex(function(x){return x.id===woId});
  if(i < 0){ mToast('WO 없음','err'); return; }
  all[i].nextShipCliOverride = {
    id: c.id, nm: c.nm,
    amendedKindCode: parseInt(parts[0]),
    reason: parts[1]||reasonVal,
    changedAt: mNw(),
    changedBy: (window.CU && CU.nm) || '모바일'
  };
  /* 변경 이력 기록 */
  var chg = DB.g('changeLog') || [];
  chg.push({
    id: Date.now().toString(36)+Math.random().toString(36).substr(2,5),
    dt: mTd(), tm: mNw(),
    type: '출고거래처변경(모바일 예약)',
    target: 'WO:'+all[i].wn,
    amendedKindCode: parseInt(parts[0]),
    amendedKindName: parts[1]||reasonVal,
    from: all[i].cnm, to: c.nm,
    by: (window.CU && CU.nm) || '모바일'
  });
  DB.s('changeLog', chg);
  DB.s('wo', all);
  mToast('다음 출고부터 '+c.nm+' 으로 적용됩니다', 'ok');
  mCloseModal('mCliChangeMo');
  mShowWODetail(woId);
}
window.mShowShipHistory = mShowShipHistory;
window.mCancelShip = mCancelShip;
window.mChangeShipCli = mChangeShipCli;
window.mFilterCliChange = mFilterCliChange;
window.mPickCliChange = mPickCliChange;

function mWOComplete(){
  var id = mq('mWOId').value;
  if(!confirm('모든 공정을 완료 처리하고 완료대기로 전환할까요?\n(최종 완료/출고 확정은 PC에서 진행됩니다)')) return;

  var all = DB.g('wo') || [];
  var i = all.findIndex(function(x){return x.id === id});
  if(i < 0) return;

  if(mIsWOClosed(all[i])){
    mToast('이미 종료된 작업입니다','err');
    return;
  }

  var nowStr = mNw();
  var procsToRecord = []; /* hist 기록 대상 (이미 완료된 공정 제외) */
  if(Array.isArray(all[i].procs) && all[i].procs.length){
    all[i].procs.forEach(function(p){
      var prevSt = mNormProcState(p.st);
      var alreadyDone = M_DONE_STATES.indexOf(prevSt) >= 0;
      p.st = mNormProcState(p.st);
      p.st = '완료';
      if(!p.t2) p.t2 = nowStr;
      if(!alreadyDone) procsToRecord.push(p);
    });
  }

  /* 모바일에서는 절대 '완료'로 직접 저장하지 않는다 → '완료대기'만 */
  all[i].status = '완료대기';

  DB.s('wo', all);

  /* 새로 완료된 공정만 hist 기록 (이미 완료/외주완료/스킵이던 건 중복 방지) */
  procsToRecord.forEach(function(p){
    mRecordProcHist(all[i], p, '완료');
  });

  mToast('전체 공정 완료, 완료대기 전환됨', 'ok');
  mCloseModal('mModalWO');

  if(mState.currentTab === 'order') mRenderOrders();
  else if(mState.currentTab === 'home') mRenderHome();
  else if(mState.currentTab === 'dash') mRenderDash();
  else mRenderOrders();
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

/* ===== 공정 선택 (모바일 등록 시) — PC 호환: 중복 허용 + 외주 옵션 ===== */
var M_DEFAULT_PROCS = ['인쇄','코팅','합지','톰슨','접착','검수','외주가공'];

function mRenderProcPick(selectedProcs){
  /* PC와 동일하게 같은 공정 중복 추가 허용 — 필터 제거 */
  mq('mOrderProcPick').innerHTML = M_DEFAULT_PROCS.map(function(p){
    return '<button class="m-filter-btn" style="background:var(--m-pri-light);color:var(--m-blue)" onclick="mAddProc(\''+p+'\')">+ '+p+'</button>';
  }).join('');
}

/* 선택된 공정: 카드형 — 외주 토글 + 외주처(vd) 입력 인라인 */
function mRenderSelectedProcs(){
  var box = mq('mOrderProcs');
  if(!box) return;
  if(mOrderProcs.length === 0){
    box.innerHTML = '<span style="font-size:12px;color:var(--m-text3)">공정을 추가하세요 ↓</span>';
    return;
  }
  box.innerHTML = mOrderProcs.map(function(p, i){
    var isOut = p.tp && p.tp !== 'n';
    /* 외주가공 공정은 무조건 외주 (PC와 동일) */
    var forcedOut = p.nm === '외주가공';
    var checked = (isOut || forcedOut) ? 'checked' : '';
    var vdHtml = (isOut || forcedOut)
      ? '<input type="text" class="m-input" placeholder="외주업체명" value="'+(p.vd||'').replace(/"/g,'&quot;')+
        '" oninput="mUpdateProcVd('+i+',this.value)" style="margin-top:6px;padding:6px 10px;font-size:12px;height:34px">'
      : '';
    return '<div class="m-proc-card" style="display:block;padding:8px 10px;background:var(--m-bg);border:1px solid var(--m-bdr);border-radius:8px;margin-bottom:6px;width:100%">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px">'
      +   '<span style="font-size:13px;font-weight:700">'+(i+1)+'. '+p.nm+'</span>'
      +   '<div style="display:flex;align-items:center;gap:10px">'
      +     '<label style="font-size:11px;color:var(--m-text2);display:inline-flex;align-items:center;gap:4px;cursor:pointer">'
      +       '<input type="checkbox" '+checked+' '+(forcedOut?'disabled':'')+' onchange="mToggleProcOut('+i+',this.checked)" style="margin:0">'
      +       '외주'
      +     '</label>'
      +     '<button type="button" onclick="mRemoveProc('+i+')" style="background:transparent;border:0;color:var(--m-red);font-size:18px;line-height:1;cursor:pointer;padding:0 4px">×</button>'
      +   '</div>'
      + '</div>'
      + vdHtml
      + '</div>';
  }).join('');
}

var mOrderProcs = [];

function mAddProc(nm){
  /* 외주가공은 기본 tp='out' */
  var defaultTp = (nm === '외주가공') ? 'out' : 'n';
  mOrderProcs.push({nm: nm, tp: defaultTp, mt: '', vd: '', st: '대기', qty: 0, t1: '', t2: ''});
  mRenderSelectedProcs();
  mRenderProcPick(mOrderProcs);
}

function mRemoveProc(idx){
  mOrderProcs.splice(idx, 1);
  mRenderSelectedProcs();
  mRenderProcPick(mOrderProcs);
}

/* 외주 토글 — tp 전환 ('n' ↔ 'out') */
function mToggleProcOut(idx, checked){
  if(!mOrderProcs[idx]) return;
  mOrderProcs[idx].tp = checked ? 'out' : 'n';
  if(!checked) mOrderProcs[idx].vd = ''; /* 내부 전환 시 vd 비움 */
  mRenderSelectedProcs();
}

/* 외주업체명 업데이트 (re-render 안 함 — 입력 포커스 유지) */
function mUpdateProcVd(idx, val){
  if(!mOrderProcs[idx]) return;
  mOrderProcs[idx].vd = val;
}

window.mAddProc = mAddProc;
window.mRemoveProc = mRemoveProc;
window.mToggleProcOut = mToggleProcOut;
window.mUpdateProcVd = mUpdateProcVd;

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
  /* 모바일은 현장 공정 중심 — 출고 확정은 PC 흐름 보호를 위해 차단 */
  mToast('출고 확정은 PC에서 진행하세요','err');
  return;
  /* eslint-disable no-unreachable */
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
  /* 모바일에서 출고/매출/세금계산서 확정 흐름 우회 차단 — PC 전용 */
  mToast('출고 확정은 PC에서 진행하세요','err');
  return;
  /* eslint-disable no-unreachable */
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
      status: '대기',  /* 모바일 작성은 항상 대기 — PC에서 사무실 담당자가 보완 */
      cat: mNw(),
      src: 'mobile',   /* 등록 출처 표시 */
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

/* ===== 이미지 처리 ===== */
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

/* ============================================
   포그라운드 복귀 시 강제 동기화
   - storage 이벤트는 다른 탭에서만 발생. 모바일을 백그라운드로 두고 PC에서
     데이터 변경 후 모바일 복귀 시, 탭이 비활성이라 storage 이벤트가 누락될 수
     있음. visibilitychange 로 보강.
   - 모달 열려있으면 사용자 입력 보호를 위해 갱신 보류 (toast로만 안내)
   ============================================ */
document.addEventListener('visibilitychange', function(){
  if(document.visibilityState !== 'visible') return;
  if(typeof mState === 'undefined' || !mState.currentTab) return;
  var openMM = document.querySelector('.m-modal.on');
  if(openMM){
    if(typeof mToast === 'function') mToast('포그라운드 복귀 — 모달 닫고 갱신','');
    return;
  }
  if(typeof mRefreshCurrentView === 'function'){
    try{ mRefreshCurrentView(); }catch(e){ console.warn('[m-sync] visibilitychange re-render fail', e); }
  }
});
