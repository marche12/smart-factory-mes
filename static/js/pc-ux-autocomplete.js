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

/* 필드 → 데이터 소스 매핑 */
var FIELD_DATASOURCE = {
  // 거래처 (매출처·매입처 공통)
  cli:  {ids:['woCli','ordCli','qtCli','sCli','pCli','clmCli','incCli','smCli'], get:function(){
    return (DB.g('cli')||[]).filter(function(c){return !c.isDormant;}).map(function(c){
      return {label:c.nm||'', sub:[c.ps||c.ceo||'', c.tel||'', c.bizNo||c.biz||''].filter(Boolean).join(' · ')};
    });
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

/* 필드 업그레이드: readonly 해제 + list 속성 연결 + 포커스 시 datalist 갱신 */
function upgradeField(el, kind){
  if(!el || el._uxAcReady) return;
  el._uxAcReady = true;
  // readonly 해제 (버튼으로만 열던 필드도 타이핑 가능하게)
  if(el.readOnly){ el.readOnly = false; el.removeAttribute('readonly'); }
  // datalist 연결
  var listId = 'ux-dl-'+kind;
  el.setAttribute('list', listId);
  var dl = ensureDatalist(listId);
  el.addEventListener('focus', function(){
    try{
      var ds = FIELD_DATASOURCE[kind];
      if(ds && ds.get) populateDatalist(dl, ds.get());
    }catch(e){}
  });
  // placeholder 개선 — 기존 읽기만 안내 문구 대체
  if(!el.placeholder || /선택\s*$/.test(el.placeholder)){
    var placeMap={cli:'거래처 입력 (F4 검색)',prod:'품목 입력 (F4 검색)',vendor:'협력사 입력 (F4 검색)',dlv:'납품처/주소 입력 (F4 검색)'};
    el.placeholder = placeMap[kind] || el.placeholder;
  }
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
        ['ux-dl-cli','ux-dl-prod','ux-dl-vendor','ux-dl-dlv'].forEach(function(id){
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
