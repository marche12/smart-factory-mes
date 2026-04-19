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
  'qtCli':       'openCliSearch',
  'sCli':        'openCliSearch',
  'pCli':        'openCliSearch',
  'clmCli':      'openCliSearch',
  // 품목
  'woProd':      'openProdSearch',
  'qtProd':      'openProdSearch',
  'sProd':       'openProdSearch',
  'pProd':       'openProdSearch',
  'clmProd':     'openProdSearch',
  // 납품처
  'woDlv':       'openDlvSearch',
  'smDlv':       'openDlvSearch',
  // 협력사/외주
  'woVendor':    'openVendorSearch'
};

function getActiveFieldSearch(){
  var el = document.activeElement;
  if(!el || !el.id) return null;
  var fn = FIELD_TO_SEARCH[el.id];
  if(fn && typeof window[fn] === 'function') return fn;
  return null;
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
    var fn = getActiveFieldSearch() || getDefaultSearch();
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
