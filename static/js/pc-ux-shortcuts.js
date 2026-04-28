/* ================================================================
   pc-ux-shortcuts.js — 실사용 단축 동작
   1. 행 더블클릭 → 수정
   2. 숫자키 1~9 → 상단 모드 탭 이동
   10. Ctrl+S / ⌘S / Enter(마지막 필드) → 폼 저장
   ================================================================ */
(function(){
'use strict';

/* =========================================================
   1. 행 더블클릭 = 수정
   ========================================================= */
var DBL_TABLE_EDIT = {
  'cliTbl':       'eCli',
  'prodTbl':      'eProd',
  'orderTbl':     'editOrder',
  'woTbl':        'editWO',
  'shipReadyTbl': 'openShipM',        // 출고 대기 → 출고 입력
  'shipHistTbl':  'openShipHistLedgerPanel',
  'moldTbl':      'eMold',
  'claimTbl':     'eClaim',
  'qtTbl':        'eQt',
  'slTbl':        'eSlr',             // 매출
  'prTbl':        'ePrr',             // 매입
  'txTbl':        'eTxr'              // 세금계산서
};

document.addEventListener('dblclick', function(e){
  var row = e.target.closest('tbody tr');
  if(!row) return;
  var table = row.closest('table');
  if(!table || !table.id) return;
  var fnName = DBL_TABLE_EDIT[table.id];
  if(!fnName || typeof window[fnName] !== 'function') return;
  // 버튼·링크 클릭은 제외
  if(e.target.closest('button, a, input, select, textarea')) return;
  // 행에서 id 추출 (rowmenus.js 와 동일 규칙)
  var id = extractRowId(row);
  if(!id) return;
  e.preventDefault();
  try{ window[fnName](id); }catch(err){ console.warn('[dbl-edit]', fnName, err); }
});
function extractRowId(row){
  var oc = row.getAttribute('onclick') || '';
  var m = oc.match(/\w+\(\s*['"]([^'"]+)['"]/);
  if(m) return m[1];
  var btns = row.querySelectorAll('button[onclick], a[onclick]');
  for(var i=0;i<btns.length;i++){
    var m2 = (btns[i].getAttribute('onclick')||'').match(/\w+\(\s*['"]([^'"]+)['"]/);
    if(m2) return m2[1];
  }
  return '';
}

/* =========================================================
   2. 숫자키 1~9 = 상단 모드 탭
   ========================================================= */
document.addEventListener('keydown', function(e){
  // 폼·검색창 입력 중엔 무시
  var t = e.target;
  if(t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable)) return;
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  // 단축키 치트시트 등 모달 열려있을 땐 무시
  if(document.querySelector('.mo-bg:not(.hidden)')) return;
  var key = e.key;
  if(!/^[1-9]$/.test(key)) return;
  var bar = document.getElementById('tmBar');
  if(!bar) return;
  var tabs = bar.querySelectorAll('.tm-tab');
  var idx = parseInt(key,10) - 1;
  if(idx >= tabs.length) return;
  e.preventDefault();
  tabs[idx].click();
});

/* =========================================================
   10. Ctrl+S / ⌘S = 현재 열린 모달의 "저장" 버튼 클릭
   ========================================================= */
document.addEventListener('keydown', function(e){
  if(!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 's') return;
  // 열린 모달 탐지 (가장 나중에 열린 것)
  var openModals = [...document.querySelectorAll('.mo-bg:not(.hidden), .qe-modal-bg.on')];
  if(!openModals.length) return;
  var modal = openModals[openModals.length-1];
  // 저장 버튼 후보: "저장" 글씨, .btn-p, id가 '...Save...'
  var saveBtn = Array.from(modal.querySelectorAll('button')).find(function(b){
    var t = (b.textContent||'').trim();
    return /저장$|저장\+|Save$/i.test(t) && !b.disabled;
  });
  if(!saveBtn){
    // 폴백: btn-p 중 가장 첫 번째
    saveBtn = modal.querySelector('button.btn-p, button.qe-btn-save');
  }
  if(!saveBtn) return;
  e.preventDefault();
  saveBtn.click();
});

/* Enter 로 폼 저장 (단, textarea 제외) */
document.addEventListener('keydown', function(e){
  if(e.key !== 'Enter') return;
  if(e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
  var t = e.target;
  if(!t) return;
  // textarea 는 줄바꿈 유지
  if(t.tagName === 'TEXTAREA') return;
  // 검색 필드/자동완성 중엔 무시
  if(t.closest('.ac-l, .pack-search-modal, #packSearchMo')) return;
  // input 이 아니면 무시
  if(t.tagName !== 'INPUT' && t.tagName !== 'SELECT') return;
  // 현재 포커스가 모달 안의 마지막 일반 input 이면 저장
  var modal = t.closest('.mo, .qe-modal');
  if(!modal) return;
  // form.role="form" 같은 폼 태그 안이면 기본 submit 사용
  if(t.closest('form')) return; // 폼이면 브라우저가 알아서
  // 모달 안 모든 입력 가능 요소 수집
  var inputs = Array.from(modal.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select')).filter(function(el){
    return el.offsetParent !== null && !el.disabled && !el.readOnly;
  });
  if(!inputs.length) return;
  var idx = inputs.indexOf(t);
  // 마지막 입력이면 저장 트리거
  if(idx === inputs.length - 1){
    var saveBtn = Array.from(modal.querySelectorAll('button')).find(function(b){
      var s = (b.textContent||'').trim();
      return /저장$/.test(s) && !b.disabled;
    });
    if(saveBtn){
      e.preventDefault();
      saveBtn.click();
      return;
    }
  }
  // 아니면 다음 input 으로 포커스 이동
  if(idx >= 0 && idx < inputs.length - 1){
    e.preventDefault();
    inputs[idx+1].focus();
    if(inputs[idx+1].select) try{ inputs[idx+1].select(); }catch(err){}
  }
});

console.log('[pc-ux-shortcuts] loaded. 더블클릭 수정 · 숫자키 1~9 · Ctrl+S · Enter 이동/저장');
})();
