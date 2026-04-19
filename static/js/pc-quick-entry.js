/* ================================================================
   pc-quick-entry.js — 우측 하단 플로팅 빠른 거래입력
   얼마에요 "번개입력" 기능. 매출/매입/입금/지급 한 화면에서 즉시 입력.
   Feature flag: window.PACKFLOW_EXPERIMENTAL?.quickEntry (default: on)
   ================================================================ */
(function(){
'use strict';

// 기본 on. 문제 시 window.PACKFLOW_EXPERIMENTAL.quickEntry=false 로 끌 수 있음
window.PACKFLOW_EXPERIMENTAL = window.PACKFLOW_EXPERIMENTAL || {};
if(window.PACKFLOW_EXPERIMENTAL.quickEntry === false) return;

var QE_KINDS = {
  sale:       {label:'매출',  store:'sales',    color:'#1E3A5F'},
  purchase:   {label:'매입',  store:'purchase', color:'#C2410C'},
  'sale-pay': {label:'입금',  store:'sales',    color:'#059669'},
  'purchase-pay': {label:'지급', store:'purchase', color:'#DC2626'}
};

var _qeState = {kind:'sale'};

function fmtN(n){try{return Number(n||0).toLocaleString('ko-KR');}catch(e){return String(n||0)}}
function _gid(){return (typeof gid==='function'?gid():(Date.now().toString(36)+Math.random().toString(36).substr(2,5)))}
function _td(){return (typeof td==='function'?td():new Date().toISOString().slice(0,10))}

function ensureModal(){
  if(document.getElementById('qeModalBg')) return;

  // FAB 버튼
  var fab = document.createElement('button');
  fab.id = 'qeFab';
  fab.className = 'qe-fab';
  fab.title = '빠른 거래 입력 (번개입력)';
  fab.innerHTML = '⚡<span class="qe-fab-tip">빠른 입력</span>';
  fab.onclick = openQe;
  document.body.appendChild(fab);

  // 모달
  var bg = document.createElement('div');
  bg.id = 'qeModalBg';
  bg.className = 'qe-modal-bg';
  bg.onclick = function(e){if(e.target===bg)closeQe()};
  bg.innerHTML = ''
    + '<div class="qe-modal" role="dialog" aria-label="빠른 거래 입력">'
    +   '<div class="qe-hd"><div class="qe-hd-t">⚡ 빠른 거래 입력</div>'
    +     '<button class="qe-hd-x" onclick="closeQe()" aria-label="닫기">&times;</button>'
    +   '</div>'
    +   '<div class="qe-types" id="qeTypes">'
    +     '<button class="qe-type on" data-kind="sale" onclick="setQeKind(\'sale\')">매출</button>'
    +     '<button class="qe-type" data-kind="sale-pay" onclick="setQeKind(\'sale-pay\')">입금</button>'
    +     '<button class="qe-type" data-kind="purchase" onclick="setQeKind(\'purchase\')">매입</button>'
    +     '<button class="qe-type" data-kind="purchase-pay" onclick="setQeKind(\'purchase-pay\')">지급</button>'
    +   '</div>'
    +   '<div class="qe-field"><label>최근 거래처</label><div class="qe-recent" id="qeRecent"></div></div>'
    +   '<div class="qe-field"><label>거래처 <span style="color:#DC2626">*</span></label><input id="qeCli" list="qeCliList" placeholder="거래처명"></div>'
    +   '<datalist id="qeCliList"></datalist>'
    +   '<div class="qe-field" id="qeProdWrap"><label>품목</label><input id="qeProd" list="qeProdList" placeholder="품목 (선택)"></div>'
    +   '<datalist id="qeProdList"></datalist>'
    +   '<div class="qe-row">'
    +     '<div class="qe-field" id="qeQtyWrap"><label>수량</label><input id="qeQty" type="number" inputmode="numeric" placeholder="0"></div>'
    +     '<div class="qe-field" id="qePriceWrap"><label>단가</label><input id="qePrice" type="number" inputmode="numeric" placeholder="0"></div>'
    +   '</div>'
    +   '<div class="qe-field"><label id="qeAmtLbl">금액 (부가세 포함) <span style="color:#DC2626">*</span></label><input id="qeAmt" type="number" inputmode="numeric" placeholder="0"></div>'
    +   '<div class="qe-amt-hint" id="qeAmtHint"></div>'
    +   '<div class="qe-field"><label>일자</label><input id="qeDt" type="date"></div>'
    +   '<div class="qe-field"><label>메모</label><input id="qeNote" placeholder="비고"></div>'
    +   '<div class="qe-actions">'
    +     '<button class="qe-btn qe-btn-cancel" onclick="closeQe()">취소</button>'
    +     '<button class="qe-btn qe-btn-save" onclick="saveQe()" id="qeSaveBtn">저장 (Ctrl+Enter)</button>'
    +   '</div>'
    + '</div>';
  document.body.appendChild(bg);

  // 자동 계산: 수량·단가 → 금액
  var qtyEl = document.getElementById('qeQty');
  var priceEl = document.getElementById('qePrice');
  var amtEl = document.getElementById('qeAmt');
  var hintEl = document.getElementById('qeAmtHint');
  function recalc(){
    var q = +qtyEl.value||0, p = +priceEl.value||0;
    if(q && p){
      var supply = q*p;
      var vat = Math.round(supply*0.1);
      amtEl.value = supply + vat;
      hintEl.innerHTML = '공급가 <b>'+fmtN(supply)+'원</b> + 부가세 10% <b>'+fmtN(vat)+'원</b>';
    }else{
      hintEl.textContent = '';
    }
  }
  qtyEl.addEventListener('input', recalc);
  priceEl.addEventListener('input', recalc);
  amtEl.addEventListener('input', function(){
    if(+qtyEl.value && +priceEl.value) hintEl.textContent='수동 입력';
  });

  // Ctrl+Enter 저장
  bg.addEventListener('keydown', function(e){
    if((e.ctrlKey||e.metaKey) && e.key==='Enter'){e.preventDefault();saveQe();}
  });
}

function setQeKind(k){
  _qeState.kind = k;
  document.querySelectorAll('#qeTypes .qe-type').forEach(function(b){
    b.classList.toggle('on', b.dataset.kind===k);
  });
  // 입금/지급은 품목·수량·단가 숨김
  var isPay = (k==='sale-pay'||k==='purchase-pay');
  ['qeProdWrap','qeQtyWrap','qePriceWrap'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.style.display = isPay?'none':'';
  });
  var amtLbl = document.getElementById('qeAmtLbl');
  if(amtLbl) amtLbl.innerHTML = (isPay?'입금/지급 금액':'금액 (부가세 포함)')+' <span style="color:#DC2626">*</span>';
  // 거래처 datalist 필터 (매입일 땐 매입처 우선)
  refreshQeCliList();
  refreshQeProdList();
  refreshRecentChips();
}
window.setQeKind = setQeKind;

function refreshQeCliList(){
  var list = document.getElementById('qeCliList');
  if(!list) return;
  var cls = (DB.g('cli')||[]).filter(function(c){return !c.isDormant;});
  var k = _qeState.kind;
  if(k==='purchase'||k==='purchase-pay'){
    cls = cls.filter(function(c){return c.cType==='purchase'||c.cType==='both';});
  }else{
    cls = cls.filter(function(c){return !c.cType||c.cType==='sales'||c.cType==='both';});
  }
  list.innerHTML = cls.map(function(c){return '<option value="'+(c.nm||'')+'">'}).join('');
}

function refreshQeProdList(){
  var list = document.getElementById('qeProdList');
  if(!list) return;
  var cli = document.getElementById('qeCli').value||'';
  var prods = (DB.g('prod')||[]);
  if(cli) prods = prods.filter(function(p){return p.cnm===cli;});
  list.innerHTML = prods.slice(0,40).map(function(p){return '<option value="'+(p.nm||'')+'">'}).join('');
}

function refreshRecentChips(){
  var box = document.getElementById('qeRecent');
  if(!box) return;
  var k = _qeState.kind;
  var store = (k==='purchase'||k==='purchase-pay')?'purchase':'sales';
  var recent = (DB.g(store)||[]).slice().sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'')}).slice(0,8);
  var names = [];
  var seen = {};
  recent.forEach(function(r){
    var n = r.cli||r.cnm||'';
    if(n && !seen[n]){seen[n]=1; names.push(n);}
  });
  box.innerHTML = names.slice(0,5).map(function(n){
    return '<button class="qe-recent-chip" onclick="qePickCli(\''+n.replace(/\'/g,"\\'")+'\')">'+n+'</button>';
  }).join('');
}

function qePickCli(n){
  document.getElementById('qeCli').value = n;
  refreshQeProdList();
  document.getElementById('qeAmt').focus();
}
window.qePickCli = qePickCli;

function openQe(){
  ensureModal();
  document.getElementById('qeDt').value = _td();
  document.getElementById('qeCli').value = '';
  document.getElementById('qeProd').value = '';
  document.getElementById('qeQty').value = '';
  document.getElementById('qePrice').value = '';
  document.getElementById('qeAmt').value = '';
  document.getElementById('qeNote').value = '';
  document.getElementById('qeAmtHint').textContent = '';
  setQeKind(_qeState.kind||'sale');
  document.getElementById('qeModalBg').classList.add('on');
  setTimeout(function(){document.getElementById('qeCli').focus()}, 50);
}
window.openQe = openQe;

function closeQe(){
  var bg = document.getElementById('qeModalBg');
  if(bg) bg.classList.remove('on');
}
window.closeQe = closeQe;

function saveQe(){
  var k = _qeState.kind;
  var cli = document.getElementById('qeCli').value.trim();
  var amt = +document.getElementById('qeAmt').value||0;
  var dt  = document.getElementById('qeDt').value || _td();
  var note= document.getElementById('qeNote').value.trim();
  if(!cli){toast('거래처를 입력하세요','err');document.getElementById('qeCli').focus();return;}
  if(!amt){toast('금액을 입력하세요','err');document.getElementById('qeAmt').focus();return;}

  var isPay = (k==='sale-pay'||k==='purchase-pay');
  var store = (k==='purchase'||k==='purchase-pay')?'purchase':'sales';

  if(isPay){
    // 입금/지급: 해당 거래처의 가장 오래된 미수/미지급 건부터 분배
    var list = DB.g(store)||[];
    var unpaid = list.filter(function(r){
      var nm = r.cli||r.cnm||'';
      var u = (+r.amt||0)-(+r.paid||0);
      return nm===cli && u>0;
    }).sort(function(a,b){return (a.dt||'').localeCompare(b.dt||'');});
    if(!unpaid.length){
      toast('미'+(k==='sale-pay'?'수':'지급')+' 건이 없습니다','err');
      return;
    }
    var remaining = amt;
    unpaid.forEach(function(r){
      if(remaining<=0) return;
      var u = (+r.amt||0)-(+r.paid||0);
      var apply = Math.min(remaining, u);
      r.paid = (+r.paid||0) + apply;
      remaining -= apply;
    });
    DB.s(store, list);
    // 메모 로그
    if(note && typeof addLog==='function') addLog('빠른입력: '+cli+' '+(k==='sale-pay'?'입금':'지급')+' '+fmtN(amt)+'원 '+note);
    toast(cli+' '+fmtN(amt)+'원 '+(k==='sale-pay'?'입금':'지급')+' 처리','ok');
  } else {
    // 매출/매입 신규 추가
    var prod = document.getElementById('qeProd').value.trim();
    var qty = +document.getElementById('qeQty').value||0;
    var price = +document.getElementById('qePrice').value||0;
    var rec = {
      id: _gid(), dt: dt,
      cli: cli, cnm: cli,
      prod: prod, pnm: prod,
      qty: qty, price: price, amt: amt,
      paid: 0,
      note: note,
      groupId: (typeof _currentGroupId!=='undefined'&&_currentGroupId!=='ALL')?_currentGroupId:''
    };
    var list2 = DB.g(store)||[];
    list2.push(rec);
    DB.s(store, list2);
    if(typeof addLog==='function') addLog('빠른입력: '+cli+' '+(k==='sale'?'매출':'매입')+' '+fmtN(amt)+'원');
    toast(cli+' '+(k==='sale'?'매출':'매입')+' '+fmtN(amt)+'원 등록','ok');
  }

  // 관련 화면 리렌더
  if(typeof rSl==='function' && document.getElementById('pg-acc-sales')) try{rSl();}catch(e){}
  if(typeof rPr==='function' && document.getElementById('pg-acc-sales')) try{rPr();}catch(e){}
  if(typeof rDash==='function') try{rDash();}catch(e){}

  closeQe();
}
window.saveQe = saveQe;

// 거래처 입력 시 품목 자동완성 업데이트
document.addEventListener('input', function(e){
  if(e.target && e.target.id==='qeCli') refreshQeProdList();
});

// FAB 즉시 생성 + 로그인 성공 감지 시 body.qe-ready 붙임
function _qeInit(){
  try{ ensureModal(); }catch(e){ console.warn('[pc-quick-entry] init 실패', e); }
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _qeInit);
} else {
  _qeInit();
}

// unifiedLogin 성공 시 body에 qe-ready 클래스 부여 (CSS로 FAB 표시)
(function(){
  var orig = window.unifiedLogin;
  if(typeof orig === 'function'){
    window.unifiedLogin = async function(){
      var r = await orig.apply(this, arguments);
      try{
        if(typeof CU !== 'undefined' && CU && CU.role !== 'worker'){
          document.body.classList.add('qe-ready');
        }
      }catch(e){}
      return r;
    };
  }
  // 페이지 로드 시 이미 로그인 상태면 바로 추가
  setTimeout(function(){
    var admin = document.getElementById('adminApp');
    if(admin && admin.style.display && admin.style.display !== 'none'){
      document.body.classList.add('qe-ready');
    }
  }, 2000);
  // logout 시 제거
  var origOut = window.unifiedLogout;
  if(typeof origOut === 'function'){
    window.unifiedLogout = function(){
      document.body.classList.remove('qe-ready');
      return origOut.apply(this, arguments);
    };
  }
})();

console.log('[pc-quick-entry] loaded. ⚡ 버튼으로 빠른 거래입력 가능');
})();
