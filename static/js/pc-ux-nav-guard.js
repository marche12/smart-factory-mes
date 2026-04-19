/* ================================================================
   pc-ux-nav-guard.js — goMod 연속 실행 방지 가드
   원인: 여러 래퍼(pc-top-modes, pc-sidebar-blocks)가 goMod 를 감싸면서
         빠른 연속 클릭 시 동일 모듈 렌더가 중복 트리거 될 수 있음.
   해결: 중앙에서 "같은 모듈은 300ms 내 중복 호출 무시".
   - 삭제/저장 로직엔 간섭 안 함, 단지 네비게이션만.
   ================================================================ */
(function(){
'use strict';

var _lastMod = null;
var _lastAt = 0;
var DEBOUNCE_MS = 300;

function installGuard(){
  if(typeof window.goMod !== 'function') return setTimeout(installGuard, 500);
  if(window.goMod.__navGuardWrapped) return;
  var orig = window.goMod;
  var guarded = function(mod){
    var now = Date.now();
    if(mod && mod === _lastMod && (now - _lastAt) < DEBOUNCE_MS){
      // 동일 모듈 연속 클릭 — 사일런트 무시
      return;
    }
    _lastMod = mod;
    _lastAt = now;
    return orig.apply(this, arguments);
  };
  guarded.__navGuardWrapped = true;
  // 기존 래퍼 플래그도 복사 (다른 가드들이 중복 wrap 방지용)
  Object.keys(orig).forEach(function(k){ if(k.indexOf('__')===0) guarded[k] = orig[k]; });
  window.goMod = guarded;
}

/* 다른 wrapper(pc-top-modes, pc-sidebar-blocks)가 goMod 를 감싸고 난 뒤 최상위에서
   한 번 더 감싸야 전역 가드 역할을 한다. 로그인 이후 1.8초 + 재시도. */
function tryInstall(){
  installGuard();
  // 다른 래퍼가 뒤늦게 덮으면 다시 감쌈 (최대 5회, 900ms 간격)
  var tries = 0;
  var t = setInterval(function(){
    tries++;
    if(window.goMod && !window.goMod.__navGuardWrapped){
      installGuard();
    }
    if(tries >= 5) clearInterval(t);
  }, 900);
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(tryInstall, 1800); });
} else {
  setTimeout(tryInstall, 1800);
}

console.log('[pc-ux-nav-guard] loaded. goMod 중복 호출 300ms 디바운스');
})();
