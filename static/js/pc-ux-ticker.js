/* ================================================================
   pc-ux-ticker.js — 상단 바 납기 임박 티커
   tmBar 우측 사용자 영역 왼쪽에 "오늘 N · 지연 N · 3일 이내 N" 표시
   클릭 시 작업지시 리스트로 이동
   ================================================================ */
(function(){
'use strict';

function computeCounts(){
  var today = (typeof td==='function') ? td() : new Date().toISOString().slice(0,10);
  var wo = DB.g('wo') || [];
  var dueToday = 0, overdue = 0, soon = 0;
  wo.forEach(function(o){
    if(o.status==='완료'||o.status==='출고완료'||o.status==='취소') return;
    if(!o.sd) return;
    if(o.sd < today) overdue++;
    else if(o.sd === today) dueToday++;
    else {
      var d = Math.round((new Date(o.sd+'T00:00:00') - new Date(today+'T00:00:00'))/86400000);
      if(d <= 3) soon++;
    }
  });
  return {dueToday:dueToday, overdue:overdue, soon:soon};
}

function render(){
  var bar = document.getElementById('tmBar');
  if(!bar) return;
  var tick = document.getElementById('tmTicker');
  var c = computeCounts();
  if(c.dueToday===0 && c.overdue===0 && c.soon===0){
    if(tick) tick.remove();
    return;
  }
  if(!tick){
    tick = document.createElement('button');
    tick.id = 'tmTicker';
    tick.className = 'tm-ticker';
    tick.onclick = function(){ if(typeof goMod==='function') goMod('mes-wo'); };
    // tm-right 앞에 삽입
    var right = bar.querySelector('.tm-right');
    if(right) bar.insertBefore(tick, right);
    else bar.appendChild(tick);
  }
  // 신호형(작은 점+숫자)로 축소. 지연 우선, 없으면 오늘, 없으면 3일내
  var dotCls='', label='';
  if(c.overdue){ dotCls='dot-danger'; label='지연 '+c.overdue; }
  else if(c.dueToday){ dotCls='dot-warn'; label='오늘 '+c.dueToday; }
  else if(c.soon){ dotCls='dot-info'; label='3일내 '+c.soon; }
  var tip='';
  if(c.overdue) tip+='지연 '+c.overdue+' · ';
  if(c.dueToday) tip+='오늘 '+c.dueToday+' · ';
  if(c.soon) tip+='3일내 '+c.soon;
  tick.title = '납기: '+tip.replace(/ · $/,'');
  tick.innerHTML = '<span class="tk-dot '+dotCls+'"></span><span class="tk-lbl">'+label+'</span>';
}

/* tm-bar 렌더 후 호출 */
function init(){
  render();
  // 상단 모드 탭이 다시 그려질 때도 복원
  setInterval(function(){
    if(document.getElementById('tmBar') && !document.getElementById('tmTicker')){
      render();
    }
  }, 3000);
  // 30초마다 갱신
  setInterval(render, 30000);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(init, 1500); });
} else {
  setTimeout(init, 1500);
}

/* 신호형 CSS: 아주 얇은 상태 배지 (상단 바 톤 방해 안 함) */
var style = document.createElement('style');
style.textContent = ''
  +'.tm-ticker{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;margin:0 4px;'
    +'background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:999px;'
    +'color:#CBD5E1;cursor:pointer;font-size:11px;font-weight:700;transition:all .12s;height:28px}'
  +'.tm-ticker:hover{background:rgba(255,255,255,.06);color:#fff;border-color:rgba(255,255,255,.18)}'
  +'.tm-ticker .tk-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex-shrink:0}'
  +'.tm-ticker .dot-danger{background:#EF4444;box-shadow:0 0 0 3px rgba(239,68,68,.18);animation:tkPulse 1.8s ease infinite}'
  +'.tm-ticker .dot-warn{background:#F59E0B;box-shadow:0 0 0 3px rgba(245,158,11,.18)}'
  +'.tm-ticker .dot-info{background:#3B82F6;box-shadow:0 0 0 3px rgba(59,130,246,.18)}'
  +'.tm-ticker .tk-lbl{letter-spacing:-.01em}'
  +'@keyframes tkPulse{0%,100%{box-shadow:0 0 0 3px rgba(239,68,68,.18)}50%{box-shadow:0 0 0 5px rgba(239,68,68,.28)}}';
document.head.appendChild(style);

window.refreshTicker = render;
console.log('[pc-ux-ticker] loaded. 상단 납기 티커 활성');
})();
