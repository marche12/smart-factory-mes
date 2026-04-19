/* ================================================================
   pc-ux-inputs.js — 숫자 필드 자동 콤마 + 금액 한글 표시
   data-pack-number 속성이 있는 input, 또는 class 에 "num" / id 가
   Amt|Price|amt|price 패턴인 input 에 자동 적용.
   ================================================================ */
(function(){
'use strict';

var AMT_ID_RE = /(amt|total|price|합계|금액|공급가|세액)/i;

function isNumField(el){
  if(!el || el.tagName !== 'INPUT') return false;
  if(el.type === 'number') return true;
  if(el.hasAttribute('data-pack-number')) return true;
  // id 패턴
  if(el.id && AMT_ID_RE.test(el.id)) return true;
  return false;
}

function toNum(v){
  if(v===undefined||v===null) return 0;
  var s = String(v).replace(/[,\s]/g,'');
  if(s === '' || s === '-') return 0;
  var n = Number(s);
  return isFinite(n) ? n : 0;
}

function fmtComma(n){
  return Number(n||0).toLocaleString('ko-KR');
}

/* 한글 금액 변환 — 간단 버전 (억/만/원 단위까지) */
var KOR_NUMS = ['','일','이','삼','사','오','육','칠','팔','구'];
var KOR_UNITS = ['','십','백','천'];
var KOR_BIG = ['','만','억','조'];

function toKorAmount(n){
  n = Math.abs(Math.round(Number(n)||0));
  if(!n) return '';
  if(n > 9999999999999) return '';  // 9조 초과 skip
  var out = '';
  var group = 0;
  while(n > 0){
    var part = n % 10000;
    var partStr = '';
    var partArr = String(part).split('').reverse();
    for(var i=0;i<partArr.length;i++){
      var d = +partArr[i];
      if(d){
        var digit = (d===1 && i>0) ? '' : KOR_NUMS[d];
        partStr = digit + KOR_UNITS[i] + partStr;
      }
    }
    if(partStr) out = partStr + KOR_BIG[group] + out;
    n = Math.floor(n/10000);
    group++;
  }
  return out ? out + '원' : '';
}

/* 포커스 아웃 시 콤마 포맷, 포커스 인 시 원복 */
document.addEventListener('focusin', function(e){
  if(!isNumField(e.target)) return;
  // text 타입으로 둔 필드만 콤마 처리 (type=number 는 브라우저 기본 유지)
  if(e.target.type === 'number') return;
  var v = e.target.value;
  if(v){
    e.target.value = String(toNum(v));  // 콤마 제거
    try{ e.target.select(); }catch(err){}
  }
});

document.addEventListener('focusout', function(e){
  if(!isNumField(e.target)) return;
  if(e.target.type === 'number') return;
  var v = e.target.value;
  if(v === '' || v === null) return;
  var n = toNum(v);
  if(!isNaN(n) && n !== 0){
    e.target.value = fmtComma(n);
  }
});

/* 입력 중 한글 금액 힌트 (금액성 필드만) */
function isAmountField(el){
  if(!el || el.tagName !== 'INPUT') return false;
  if(!el.id) return false;
  return /(amt|total|공급가|세액|합계|금액)/i.test(el.id) && !/qty|cnt|수량/i.test(el.id);
}

document.addEventListener('input', function(e){
  var el = e.target;
  if(!isAmountField(el)) return;
  var hint = el._packKorHint;
  var n = toNum(el.value);
  if(!hint){
    hint = document.createElement('div');
    hint.className = 'pack-kor-hint';
    hint.style.cssText = 'font-size:11px;color:#64748B;margin-top:3px;min-height:14px;font-weight:600;letter-spacing:-.01em;';
    el.parentNode && el.parentNode.insertBefore(hint, el.nextSibling);
    el._packKorHint = hint;
  }
  hint.textContent = n ? toKorAmount(n) : '';
});

window.PackfFmt = {num:fmtComma, toKor:toKorAmount, toNum:toNum};

console.log('[pc-ux-inputs] loaded. 숫자 콤마 자동 + 금액 한글 힌트');
})();
