/* ================================================================
   pc-search-keys.js — F3 (직접입력 모드) / F4 (코드도움/전체목록)
   활성 필드의 id 패턴으로 적합한 검색 모달 자동 호출.
   ================================================================ */
(function(){
'use strict';

/* 필드 id → 검색 함수 매핑 */
var FIELD_TO_SEARCH = {
  // 거래처
  'woCli':       'openCliSearch',
  'ordCli':      'openOrdCliSearch',
  'qtCli':       'openActiveCliSearch',
  'sCli':        'openActiveCliSearch',
  'pCli':        'openActiveCliSearch',
  'clmCli':      'openActiveCliSearch',
  // 품목
  'woProd':      'openProdSearch',
  'qtProd':      'openActiveProdSearch',
  'sProd':       'openActiveProdSearch',
  'pProd':       'openActiveProdSearch',
  'clmProd':     'openActiveProdSearch',
  // 납품처
  'woDlv':       'openDlvSearch',
  'smDlv':       'openDlvSearch',
  // 협력사/외주
  'woVendor':    'openVendorSearch'
};

function _dispatchFieldSync(el){
  if(!el) return;
  try{ el.dispatchEvent(new Event('input', {bubbles:true})); }catch(err){}
  try{ el.dispatchEvent(new Event('change', {bubbles:true})); }catch(err){}
  try{ el.dispatchEvent(new Event('blur', {bubbles:true})); }catch(err){}
}

function _activeField(){
  var el = document.activeElement;
  return (el && el.id) ? el : null;
}

function _highlightText(v, q){
  if(typeof SearchUtil !== 'undefined' && SearchUtil.highlight){
    return SearchUtil.highlight(v || '', q || '');
  }
  return v || '';
}

function _setFieldValue(fieldId, value){
  var el = fieldId ? document.getElementById(fieldId) : _activeField();
  if(!el) return false;
  el.value = value || '';
  _dispatchFieldSync(el);
  return true;
}

function openActiveCliSearch(fieldId){
  var targetId = fieldId || (_activeField() && _activeField().id);
  if(!targetId || typeof openPackSearchModal !== 'function') return;
  openPackSearchModal({
    title:'거래처 검색',
    subTitle:'거래처명, 담당자, 전화번호, 사업자번호를 함께 검색합니다.',
    placeholder:'거래처명, 담당자, 전화번호, 사업자번호 검색',
    historyKey:'cli',
    pickHistoryKey:'cli',
    modeKey:'cli-search',
    fields:['nm','ps','tel','biz','bizNo','addr'],
    getItems:function(){
      return (DB.g('cli')||[]).filter(function(c){ return !c.isDormant; })
        .sort(function(a,b){ return (a.nm||'').localeCompare(b.nm||''); });
    },
    renderRow:function(item,q){
      return {
        primary:_highlightText(item.nm||'',q),
        secondary:[item.ps||item.ceo||'', item.tel||'', item.bizNo||item.biz||'', item.addr||'']
          .filter(Boolean).map(function(v){ return _highlightText(v,q); }).join(' | '),
        meta:item.cType==='purchase'?'매입처':item.cType==='both'?'매출·매입':'거래처'
      };
    },
    onPick:function(item){
      _setFieldValue(targetId, item.nm || '');
    }
  });
}

function openActiveProdSearch(fieldId){
  var targetId = fieldId || (_activeField() && _activeField().id);
  if(!targetId || typeof openPackSearchModal !== 'function') return;
  openPackSearchModal({
    title:'품목 검색',
    subTitle:'품목명, 코드, 규격, 거래처를 함께 검색합니다.',
    placeholder:'품목명, 코드, 규격 검색',
    historyKey:'prod',
    pickHistoryKey:'prod',
    modeKey:'prod-search',
    enableQuickMode:true,
    fields:['nm','code','spec','paper','cnm'],
    getItems:function(){
      return (DB.g('prod')||[]).slice();
    },
    renderRow:function(item,q){
      return {
        primary:_highlightText(item.nm||'',q)
          +(item.code ? ' <span style="font-size:11px;color:#1E3A5F">['+_highlightText(item.code,q)+']</span>' : ''),
        secondary:[item.cnm||'',item.spec||'',item.paper||'']
          .filter(Boolean).map(function(v){ return _highlightText(v,q); }).join(' | '),
        meta:item.price ? ((Number(item.price)||0).toLocaleString()+'원') : '품목'
      };
    },
    onPick:function(item){
      _setFieldValue(targetId, item.nm || '');
    }
  });
}

window.openActiveCliSearch = openActiveCliSearch;
window.openActiveProdSearch = openActiveProdSearch;

function getActiveFieldSearch(){
  var el = document.activeElement;
  if(!el || !el.id) return null;
  var fn = FIELD_TO_SEARCH[el.id];
  if(fn && typeof window[fn] === 'function') return fn;
  return null;
}

function isEditableField(el){
  if(!el) return false;
  if(el.isContentEditable) return true;
  var tag = (el.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/* 기본 fallback: 현재 페이지 성격에 따라 */
function getDefaultSearch(){
  var activeMod = document.querySelector('.sb-item.active')?.getAttribute('data-mod') || '';
  if(activeMod === 'mes-cli') return 'openCliSearch';
  if(activeMod === 'mes-prod') return 'openProdSearch';
  if(activeMod === 'mes-vendor') return 'openVendorSearch';
  // Cmd+K/Ctrl+K 전역 검색이 있으면 그 쪽
  if(typeof UX !== 'undefined' && UX.openGlobalSearch) return '__global__';
  return null;
}

document.addEventListener('keydown', function(e){
  // F3 (직접입력 느낌) / F4 (코드도움/전체) 모두 동일 동작
  if(e.key === 'F3' || e.key === 'F4'){
    // Ctrl+F3 같은 브라우저 단축은 제외
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    var activeEl = document.activeElement;
    var fn = getActiveFieldSearch();
    if(!fn){
      if(isEditableField(activeEl)) return;
      fn = getDefaultSearch();
    }
    if(!fn) return;
    e.preventDefault();
    if(fn === '__global__'){
      try{ UX.openGlobalSearch(); }catch(err){}
      return;
    }
    try{ window[fn](); }catch(err){ console.warn('[pc-search-keys]', fn, err); }
  }
});

console.log('[pc-search-keys] loaded. F3/F4 로 필드 맞춤 검색');
})();
