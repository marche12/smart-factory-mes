/* ================================================================
   pc-context-bar.js — 메인 헤더 우측 컨텍스트 바
   예: 출고·정산 > 출고 | 최근 거래처: 지원음료 | 최근 품목: 4x6 단상자
   ================================================================ */
(function(){
'use strict';

var CTX_KEY = 'packflow_ctx_v1'; // {lastCli, lastProd}

function loadCtx(){
  try{ return JSON.parse(localStorage.getItem(CTX_KEY)||'{}'); }catch(e){ return {}; }
}
function saveCtx(ctx){
  try{ localStorage.setItem(CTX_KEY, JSON.stringify(ctx)); }catch(e){}
}

window.setPackflowCtx = function(key, value){
  var ctx = loadCtx();
  ctx[key] = value;
  saveCtx(ctx);
  renderCtx();
};

function ensureBar(){
  var header = document.querySelector('.main-header');
  if(!header) return null;
  var bar = document.getElementById('ctxBar');
  if(bar) return bar;
  bar = document.createElement('div');
  bar.id = 'ctxBar';
  bar.className = 'ctx-bar';
  // 기존 우측 액션(alarm/tab buttons) 왼쪽에 삽입
  var rightActions = header.querySelector('[style*="margin-left:auto"]');
  if(rightActions) header.insertBefore(bar, rightActions);
  else header.appendChild(bar);
  return bar;
}

function renderCtx(){
  var bar = ensureBar();
  if(!bar) return;
  var ctx = loadCtx();
  var parts = [];
  if(ctx.lastCli){
    parts.push('<span class="ctx-item" onclick="_ctxOpenCli(\''+(ctx.lastCli||'').replace(/\'/g,"\\'")+'\')" title="최근 거래처: '+ctx.lastCli+'">'
      +'<span class="ctx-lbl">거래처</span>'
      +'<span class="ctx-val">'+ctx.lastCli+'</span>'
      +'</span>');
  }
  if(ctx.lastProd){
    parts.push('<span class="ctx-item" onclick="_ctxOpenProd(\''+(ctx.lastProd||'').replace(/\'/g,"\\'")+'\')" title="최근 품목: '+ctx.lastProd+'">'
      +'<span class="ctx-lbl">품목</span>'
      +'<span class="ctx-val">'+ctx.lastProd+'</span>'
      +'</span>');
  }
  bar.innerHTML = parts.join('<span class="ctx-sep">·</span>');
}
window._ctxOpenCli = function(nm){
  var cli = (DB.g('cli')||[]).find(function(c){return c.nm===nm;});
  if(cli && typeof openCliLedgerPanel==='function'){ openCliLedgerPanel(cli.id); return; }
  if(typeof goMod==='function') goMod('mes-cli');
};
window._ctxOpenProd = function(nm){
  var prod = (DB.g('prod')||[]).find(function(p){return p.nm===nm;});
  if(prod && typeof openProdLedgerPanel==='function'){ openProdLedgerPanel(prod.id); return; }
  if(typeof goMod==='function') goMod('mes-prod');
};

/* F9 단축키: 최근 컨텍스트 기반 원장 빠르게 열기 */
document.addEventListener('keydown', function(e){
  var t = e.target;
  if(t && (t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)) return;
  if(e.key === 'F9' || (e.shiftKey && e.key.toLowerCase() === 'f9')){
    e.preventDefault();
    var ctx = loadCtx();
    if(e.shiftKey && ctx.lastProd){ window._ctxOpenProd(ctx.lastProd); }
    else if(ctx.lastCli){ window._ctxOpenCli(ctx.lastCli); }
    else if(ctx.lastProd){ window._ctxOpenProd(ctx.lastProd); }
  }
});

/* 자동 감지: 주요 함수 호출 시 ctx 기록 */
function hookAutoCapture(){
  // 거래처 선택: pickCli / selCli / openCliLedgerPanel
  ['pickCli','selCli'].forEach(function(fn){
    if(typeof window[fn]==='function' && !window[fn].__ctxWrapped){
      var orig = window[fn];
      window[fn] = function(id){
        var r = orig.apply(this, arguments);
        try{
          var c = (DB.g('cli')||[]).find(function(x){return x.id===id;});
          if(c) setPackflowCtx('lastCli', c.nm);
        }catch(e){}
        return r;
      };
      window[fn].__ctxWrapped = true;
    }
  });
  // 품목 선택: selProd
  if(typeof window.selProd==='function' && !window.selProd.__ctxWrapped){
    var orig = window.selProd;
    window.selProd = function(id){
      var r = orig.apply(this, arguments);
      try{
        var p = (DB.g('prod')||[]).find(function(x){return x.id===id;});
        if(p) setPackflowCtx('lastProd', p.nm);
      }catch(e){}
      return r;
    };
    window.selProd.__ctxWrapped = true;
  }
}

function init(){
  hookAutoCapture();
  renderCtx();
  // 주기적으로 훅 재확인 (나중에 로드되는 함수 대응)
  setInterval(hookAutoCapture, 2500);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('[pc-context-bar] loaded. 최근 거래처·품목 자동 추적');
})();
