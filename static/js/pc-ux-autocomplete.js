/* ================================================================
   pc-ux-autocomplete.js — 통합 자동완성 레이어
   원칙: 기본 자동완성 + 보조 F4 검색모달 (pc-search-keys.js 연동).
   - 기존 ac 함수·모달은 건드리지 않음 (공존)
   - readonly 로 잠겨있던 필드 해제 (타이핑 가능하게)
   - HTML5 datalist 사용 — 네이티브 방향키·Enter·Esc 지원
   - DB 데이터 변경 시 datalist 자동 갱신
   ================================================================ */
(function(){
'use strict';

/* 필드 → 데이터 소스 매핑
   거래처는 화면별로 성격이 다르므로 소스 분리:
   - cliSales   : 수주/견적/작업지시/출고/매출/클레임  → cType in ('sales','both')  & !isDormant
   - cliPurchase: 매입/입고                              → cType in ('purchase','both') & !isDormant
*/
function _cliRow(c){
  return {label:c.nm||'', sub:[c.ps||c.ceo||'', c.tel||'', c.bizNo||c.biz||''].filter(Boolean).join(' · ')};
}
function _cliMatchesKind(c, kind){
  if(!c || c.isDormant) return false;
  var t=c.cType||'sales';
  if(kind==='purchase') return t==='purchase'||t==='both';
  return t==='sales'||t==='both';
}
function _dynamicCliKind(fieldId){
  if(fieldId==='txCli'){
    var tp=document.getElementById('txTpS');
    return tp&&tp.value==='매입'?'purchase':'sales';
  }
  if(fieldId==='payCli'){
    var tgt=document.getElementById('payTgt');
    return tgt&&tgt.value==='purchase'?'purchase':'sales';
  }
  return 'sales';
}
var FIELD_DATASOURCE = {
  // 매출처 (수주/견적/작업지시/출고/매출/클레임)
  cliSales: {ids:['woCli','ordCli','qtCli','sCli','clmCli','smCli'], get:function(){
    return (DB.g('cli')||[]).filter(function(c){
      return _cliMatchesKind(c, 'sales');
    }).map(_cliRow);
  }},
  // 매입처 (매입/입고/발주)
  cliPurchase: {ids:['pCli','incCli'], get:function(){
    return (DB.g('cli')||[]).filter(function(c){
      return _cliMatchesKind(c, 'purchase');
    }).map(_cliRow);
  }},
  // 세금계산서: 매출/매입 구분 선택값에 맞춰 동적 전환
  cliTax: {ids:['txCli'], get:function(){
    var kind=_dynamicCliKind('txCli');
    return (DB.g('cli')||[]).filter(function(c){ return _cliMatchesKind(c, kind); }).map(_cliRow);
  }},
  // 입출금: 입금/지급 처리 구분에 맞춰 동적 전환
  cliPay: {ids:['payCli'], get:function(){
    var kind=_dynamicCliKind('payCli');
    return (DB.g('cli')||[]).filter(function(c){ return _cliMatchesKind(c, kind); }).map(_cliRow);
  }},
  // 품목
  prod: {ids:['woProd','qtProd','sProd','pProd','clmProd','incNm','incMat'], get:function(scope){
    var ps=(DB.g('prod')||[]);
    // scope=cliNm 이면 해당 거래처 품목 우선
    return ps.map(function(p){
      return {label:p.nm||'', sub:[p.cnm||'', p.spec||'', p.code||''].filter(Boolean).join(' · ')};
    });
  }},
  // 협력사
  vendor:{ids:['woVendor','incVd'], get:function(){
    var map={};
    (DB.g('cli')||[]).forEach(function(c){
      if(c.cType==='purchase'||c.cType==='both'||c.isVendor) map[c.nm]={label:c.nm,sub:(c.tel||'')+(c.addr?' · '+c.addr.slice(0,20):'')};
    });
    (DB.g('vendors')||[]).forEach(function(v){
      map[v.nm]={label:v.nm,sub:[(v.tel||''),(v.mgr||''),(v.type==='out'?'외주가공':'')].filter(Boolean).join(' · ')};
    });
    return Object.keys(map).map(function(k){return map[k];});
  }},
  // 납품처
  dlv:  {ids:['woDlv','smDlv'], get:function(){
    var list=[];
    (DB.g('cli')||[]).forEach(function(c){
      if(c.addr) list.push({label:c.addr,sub:c.nm});
      if(Array.isArray(c.deliveries)) c.deliveries.forEach(function(d){
        if(d.nm||d.addr) list.push({label:(d.nm||d.addr),sub:c.nm+(d.addr?' · '+d.addr:'')});
      });
    });
    return list;
  }}
};

/* datalist id 생성 + 주입 */
function ensureDatalist(id){
  var dl = document.getElementById(id);
  if(dl) return dl;
  dl = document.createElement('datalist');
  dl.id = id;
  document.body.appendChild(dl);
  return dl;
}

function populateDatalist(dl, items, max){
  if(!dl || !items) return;
  var html = items.slice(0, max||100).map(function(it){
    // label="보조정보" 으로 사용자에 힌트 (브라우저가 드롭다운에 표시)
    var sub = (it.sub||'').replace(/"/g,'&quot;');
    var label = (it.label||'').replace(/"/g,'&quot;');
    return sub ? '<option value="'+label+'" label="'+sub+'">' : '<option value="'+label+'">';
  }).join('');
  dl.innerHTML = html;
}

function findCliByName(name){
  var v=(name||'').trim();
  if(!v) return null;
  return (DB.g('cli')||[]).find(function(c){ return (c.nm||'').trim()===v; }) || null;
}

function findProdByName(name){
  var v=(name||'').trim();
  if(!v) return null;
  return (DB.g('prod')||[]).find(function(p){ return (p.nm||'').trim()===v; }) || null;
}

function bindSyncHandlers(el, kind){
  if(!el || el._uxAcSyncBound) return;
  var sync = null;
  // 거래처 계열은 동기 핸들러상 'cli' 로 통일
  if(kind==='cliSales'||kind==='cliPurchase'||kind==='cliTax'||kind==='cliPay') kind='cli';
  if(kind==='cli'){
    if(el.id==='woCli'){
      sync=function(){
        var c=findCliByName(el.value);
        if(!c) return;
        if($('woAddr')) $('woAddr').value = c.addr || '';
        if($('woTel')) $('woTel').value = c.tel || '';
        if($('woFax')) $('woFax').value = c.fax || '';
        if($('woProd')) $('woProd').value = '';
        if(typeof renderWOQuickBars==='function') renderWOQuickBars();
      };
    } else if(el.id==='ordCli'){
      sync=function(){
        if(typeof updateOrderAssist==='function') updateOrderAssist();
      };
    } else if(el.id==='sCli' || el.id==='pCli'){
      sync=function(){
        if(typeof applyCliPrice==='function') applyCliPrice();
      };
    } else if(el.id==='qtCli'){
      sync=function(){
        if(typeof updateQtAssist==='function') updateQtAssist();
      };
    } else if(el.id==='txCli'){
      sync=function(){
        var c=findCliByName(el.value);
        if(!c) return;
        if($('txBiz')) $('txBiz').value = c.bizNo || c.biz || '';
        if($('txCeo')) $('txCeo').value = c.ceo || c.ps || '';
        if($('txAddr')) $('txAddr').value = c.addr || '';
      };
    }
  } else if(kind==='prod'){
    if(el.id==='woProd'){
      sync=function(){
        var p=findProdByName(el.value);
        if(!p || typeof selProd!=='function') return;
        selProd(p.id);
      };
    } else if(el.id==='qtProd'){
      sync=function(){
        if(typeof updateQtAssist==='function') updateQtAssist();
      };
    }
  }
  if(!sync) return;
  el.addEventListener('change', sync);
  el.addEventListener('blur', sync);
  el._uxAcSyncBound = true;
}

/* 필드 업그레이드: readonly 해제 + list 속성 연결 + 포커스 시 datalist 갱신 */
function upgradeField(el, kind){
  if(!el || el._uxAcReady) return;
  el._uxAcReady = true;
  // select 는 datalist 대상이 아니고, 종속 필드가 많은 핵심 입력만 해제 허용
  var tag=(el.tagName||'').toUpperCase();
  if(tag==='SELECT') return;
  if(el.readOnly){
    var canUnlock = {'woCli':true,'woProd':true,'ordCli':true};
    if(canUnlock[el.id]){
      el.readOnly = false;
      el.removeAttribute('readonly');
    }
  }
  // datalist 연결 (kind 별 분리 — 매출처/매입처 서로 다른 소스)
  var kindKey = kind;
  var listId = 'ux-dl-'+kindKey;
  el.setAttribute('list', listId);
  var dl = ensureDatalist(listId);
  el.addEventListener('focus', function(){
    try{
      var ds = FIELD_DATASOURCE[kindKey];
      if(ds && ds.get) populateDatalist(dl, ds.get());
    }catch(e){}
  });
  // placeholder 개선 — F3/F4 단축키 통일 안내
  if(!el.placeholder || /선택\s*$/.test(el.placeholder)){
    var placeMap={cliSales:'매출처 입력 (F3/F4 검색)',cliPurchase:'매입처 입력 (F3/F4 검색)',cliTax:'거래처 입력 (F3/F4 검색)',cliPay:'거래처 입력 (F3/F4 검색)',prod:'품목 입력 (F3/F4 검색)',vendor:'협력사 입력 (F3/F4 검색)',dlv:'납품처/주소 입력 (F3/F4 검색)'};
    el.placeholder = placeMap[kind] || el.placeholder;
  }
  bindSyncHandlers(el, kind);
}

function scanAll(){
  Object.keys(FIELD_DATASOURCE).forEach(function(kind){
    var cfg = FIELD_DATASOURCE[kind];
    cfg.ids.forEach(function(id){
      var el = document.getElementById(id);
      if(el) upgradeField(el, kind);
    });
    // WO 공정 카드 내부 vendor 필드 (acVdP0/1/2... 같이 ac- 가 있는 필드)
    if(kind==='vendor'){
      document.querySelectorAll('input[oninput*="acVendorInProc"]').forEach(function(el){
        upgradeField(el, 'vendor');
      });
    }
  });
}

/* 주기적 재스캔 — 동적으로 추가되는 공정 카드 vendor 필드 대응 */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', scanAll);
} else {
  scanAll();
}
setInterval(scanAll, 2500);

/* DB 데이터 변경 감지 — datalist 재빌드 */
(function(){
  if(typeof DB !== 'undefined' && typeof DB.s === 'function' && !DB.s.__uxAcWrapped){
    var orig = DB.s;
    DB.s = function(key, val){
      var r = orig.apply(this, arguments);
      // cli/prod/vendors 변경 시 해당 datalist 강제 비움 (다음 focus 에 재빌드)
      if(['cli','prod','vendors'].indexOf(key) >= 0){
        ['ux-dl-cliSales','ux-dl-cliPurchase','ux-dl-cliTax','ux-dl-cliPay','ux-dl-prod','ux-dl-vendor','ux-dl-dlv'].forEach(function(id){
          var dl = document.getElementById(id);
          if(dl) dl.innerHTML = '';
        });
      }
      return r;
    };
    DB.s.__uxAcWrapped = true;
  }
})();

console.log('[pc-ux-autocomplete] loaded. 거래처·품목·협력사·납품처 자동완성 + F4 모달');
})();
