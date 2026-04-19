/* ================================================================
   pc-ux-excel-paste.js — 수주/작업지시 품목 테이블에 엑셀 붙여넣기
   - 수주 품목 첫 input에 엑셀 행(탭·개행 구분)을 붙여넣으면
     자동으로 여러 행으로 분할 입력.
   - _ordItems (수주), cPapers/cFabrics (WO) 대상.
   ================================================================ */
(function(){
'use strict';

/* 클립보드 텍스트 → 2차원 배열 (엑셀 TSV) */
function parseTSV(text){
  if(!text) return [];
  return text.split(/\r?\n/).filter(function(r){ return r.trim(); }).map(function(r){
    return r.split('\t');
  });
}

/* 수주 품목 붙여넣기 — 컬럼 가정: 품명 / 규격 / 수량 / 단가 / 비고 */
document.addEventListener('paste', function(e){
  var target = e.target;
  if(!target || target.tagName !== 'INPUT') return;
  // _ordItems 가 있고, 수주 폼 내부의 input 인지 체크
  if(typeof _ordItems === 'undefined') return;
  var form = target.closest('#order-new, #pg-acc-sales #t-order-new, [id*="order"]');
  if(!form && !target.id.startsWith('ord')) return;
  // 품명 필드나 _ordItems 첫 필드 포커스 시에만
  var oc = target.getAttribute('onchange') || '';
  var isItemField = /_ordItems\[/.test(oc);
  if(!isItemField) return;

  var txt = (e.clipboardData || window.clipboardData).getData('text');
  if(!txt || txt.indexOf('\t') < 0 && txt.indexOf('\n') < 0) return; // 엑셀 아님
  var rows = parseTSV(txt);
  if(rows.length < 1) return;

  e.preventDefault();
  // 기존 비어있는 행 1개만 유지, 나머지는 제거 후 새로 채움
  _ordItems = rows.map(function(cols){
    return {
      nm:    (cols[0]||'').trim(),
      spec:  (cols[1]||'').trim(),
      qty:   Number(String(cols[2]||'').replace(/[,\s]/g,'')) || '',
      price: Number(String(cols[3]||'').replace(/[,\s]/g,'')) || '',
      note:  (cols[4]||'').trim()
    };
  });
  if(!_ordItems.length) _ordItems = [{nm:'',spec:'',qty:'',price:'',note:''}];
  if(typeof renderOrdItems === 'function') renderOrdItems();
  if(typeof updateOrderAssist === 'function') updateOrderAssist();
  if(typeof toast === 'function') toast('엑셀 '+rows.length+'행 불러옴','ok');
});

console.log('[pc-ux-excel-paste] loaded. 수주 품목에 엑셀 붙여넣기 가능');
})();
