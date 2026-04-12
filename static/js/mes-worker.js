// WORKER
let compItem=null;
function rWQ(){if(!CU||CU.role!=='worker')return;const proc=CU.proc,os=DB.g('wo');let waits=[],works=[],dones=[];
var isExt=typeof isExternalProc==='function'&&isExternalProc(proc);
os.forEach(o=>{if(o.status==='완료'||o.status==='출고완료')return;
  o.procs.forEach(function(p){
    if(p.nm!==proc)return;
    if(p.st==='진행중'||p.st==='외주대기')works.push({wo:o,p:p});
    else if(p.st==='대기'&&!isExt){var cp=curP(o);if(cp&&cp.nm===proc)waits.push({wo:o,p:p})}
  });
});
waits.sort((a,b)=>(a.wo.pri||999)-(b.wo.pri||999));
os.forEach(o=>{o.procs.forEach(p=>{if(p.nm===proc&&(p.st==='완료'||p.st==='외주완료'))dones.push({wo:o,p})})});
// 진행 가능 여부 (톰슨=2, 나머지=1)
var maxIng=proc==='톰슨'?2:1;
var canStart=works.length<maxIng;
// 두 세트의 ID 모두 업데이트 (workerApp + workerScreen 호환)
var waitH=isExt?'<div style="padding:20px;text-align:center;color:#9CA3AF">외주 공정 — 대기 없음</div>'
  :(waits.length?waits.map(({wo,p},idx)=>{
    var startBtn=canStart
      ?`<button onclick="pqStart('${wo.id}',${wo.procs.findIndex(x=>x.nm===proc&&x.st==='대기')})" style="padding:8px 16px;border-radius:8px;border:none;background:#1E3A5F;color:#fff;font-size:13px;font-weight:700;cursor:pointer">시작</button>`
      :`<span style="padding:8px 10px;font-size:12px;color:#9CA3AF">진행중</span>`;
    return `<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-radius:10px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="font-size:13px;font-weight:800;color:#D1D5DB;min-width:20px">${idx+1}</div><div style="flex:1" onclick="showWkDet('${wo.id}')"><div style="font-size:14px;font-weight:700">${wo.pnm}</div><div style="font-size:12px;color:#6B7280;margin-top:3px">${wo.cnm} | 정매 ${getWQ(wo)}매 | 출고:${wo.sd}${wo.caut?' | <span style=color:#DC2626>주의</span>':''}</div></div><button onclick="showWkDet('${wo.id}')" style="padding:8px 12px;border-radius:8px;border:1px solid #E5E7EB;background:#fff;font-size:12px;cursor:pointer">상세</button>${startBtn}</div>`;
  }).join(''):'<div style="padding:20px;text-align:center;color:#9CA3AF">대기 없음</div>');
var workH=works.length?works.map(({wo,p})=>{
  var machineTag=p.machine?`<span style="font-size:10px;padding:1px 5px;border-radius:6px;background:#DCE8F5;color:#1D4ED8;font-weight:700;margin-right:4px">${p.machine}</span>`:'';
  var compLabel=isExt?'입고 확인':'완료';
  var compColor=isExt?'#F59E0B':'#10B981';
  return `<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-left:4px solid #1E3A5F;border-radius:10px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,.06)"><div style="flex:1" onclick="showWkDet('${wo.id}')"><div style="font-size:14px;font-weight:700">${machineTag}${wo.pnm}</div><div style="font-size:12px;color:#6B7280;margin-top:3px">${wo.cnm} | 시작: ${p.t1||'-'}</div></div><button onclick="showWkDet('${wo.id}')" style="padding:8px 12px;border-radius:8px;border:1px solid #E5E7EB;background:#fff;font-size:12px;cursor:pointer">상세</button><button onclick="openComp('${wo.id}')" style="padding:8px 16px;border-radius:8px;border:none;background:${compColor};color:#fff;font-size:13px;font-weight:700;cursor:pointer">${compLabel}</button></div>`;
}).join(''):'<div style="padding:20px;text-align:center;color:#9CA3AF">진행중 없음</div>';
var doneH=dones.length?dones.map(({wo,p})=>`<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-left:4px solid #10B981;border-radius:10px;margin-bottom:6px;opacity:.7"><div style="flex:1"><div style="font-size:14px;font-weight:700">${wo.pnm}</div><div style="font-size:12px;color:#6B7280;margin-top:3px">${wo.cnm} | 수량:${p.qty}</div></div><div style="font-size:14px;font-weight:700;color:#10B981">완료</div></div>`).join(''):'<div style="padding:20px;text-align:center;color:#9CA3AF">완료 없음</div>';
// workerApp IDs
if($('wQueueWait'))$('wQueueWait').innerHTML=waitH;
if($('wQueueWork'))$('wQueueWork').innerHTML=workH;
if($('wQueueDone'))$('wQueueDone').innerHTML=doneH;
if($('wCntWait'))$('wCntWait').textContent=waits.length+'건';
if($('wCntWork'))$('wCntWork').textContent=works.length+'건';
if($('wCntDone'))$('wCntDone').textContent=dones.length+'건';
// workerScreen IDs (호환)
if($('qWait'))$('qWait').innerHTML=waitH;
if($('qWork'))$('qWork').innerHTML=workH;
if($('qDone'))$('qDone').innerHTML=doneH;
if($('cntW'))$('cntW').textContent=waits.length+'건';
if($('cntK'))$('cntK').textContent=works.length+'건';
if($('cntD'))$('cntD').textContent=dones.length+'건';}
// === 관리자용 작업자 모니터링 ===
var _wmProc='';
function rWorkerMonitor(proc){
  if(proc!==undefined)_wmProc=proc;
  var us=DB.g('users').filter(function(u){return u.proc&&u.proc.trim()});
  if(_wmProc)us=us.filter(function(u){return u.proc===_wmProc});
  // 필터 버튼 활성화
  var btns=document.querySelectorAll('#t-worker .btn');
  btns.forEach(function(b){b.className='btn btn-sm btn-o'});
  var activeBtn=_wmProc?null:document.getElementById('wm-all');
  if(!_wmProc&&activeBtn)activeBtn.className='btn btn-sm btn-p';
  else btns.forEach(function(b){if(b.textContent.trim()===_wmProc)b.className='btn btn-sm btn-p'});

  var os=DB.g('wo');
  var area=$('workerMonArea');if(!area)return;
  if(!us.length){area.innerHTML='<div style="padding:40px;text-align:center;color:var(--txt3);grid-column:1/-1">등록된 작업자가 없습니다. 설정 > 사용자 관리에서 작업자를 추가하세요.</div>';return}
  var h='';
  us.forEach(function(u){
    var waits=[],works=[],dones=[];
    os.forEach(function(o){
      if(o.status==='완료'||o.status==='출고완료')return;
      o.procs.forEach(function(p){
        if(p.nm!==u.proc)return;
        if(p.st==='진행중'||p.st==='외주대기')works.push(o);
        else if(p.st==='대기'){var cp=curP(o);if(cp&&cp.nm===u.proc)waits.push(o)}
      });
    });
    os.forEach(function(o){o.procs.forEach(function(p){
      if(p.nm===u.proc&&(p.st==='완료'||p.st==='외주완료'))dones.push({o:o,p:p});
    })});
    var statusColor=works.length?'#1E3A5F':waits.length?'#F59E0B':'#94A3B8';
    var statusText=works.length?'작업중':waits.length?'대기중':'유휴';
    h+='<div style="background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden">';
    h+='<div style="padding:14px 16px;background:linear-gradient(135deg,'+statusColor+'11,'+statusColor+'05);border-bottom:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center">';
    h+='<div><div style="font-weight:800;font-size:15px">'+u.nm+'</div><div style="font-size:12px;color:#64748B;margin-top:2px">'+u.proc+' 공정'+(u.dept?' | '+u.dept:'')+'</div></div>';
    h+='<span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+statusColor+'18;color:'+statusColor+'">'+statusText+'</span>';
    h+='</div>';
    h+='<div style="display:flex;gap:0;border-bottom:1px solid #F1F5F9">';
    h+='<div style="flex:1;text-align:center;padding:10px 0;border-right:1px solid #F1F5F9"><div style="font-size:20px;font-weight:800;color:#F59E0B">'+waits.length+'</div><div style="font-size:10px;color:#94A3B8">대기</div></div>';
    h+='<div style="flex:1;text-align:center;padding:10px 0;border-right:1px solid #F1F5F9"><div style="font-size:20px;font-weight:800;color:#1E3A5F">'+works.length+'</div><div style="font-size:10px;color:#94A3B8">진행</div></div>';
    h+='<div style="flex:1;text-align:center;padding:10px 0"><div style="font-size:20px;font-weight:800;color:#10B981">'+dones.length+'</div><div style="font-size:10px;color:#94A3B8">완료</div></div>';
    h+='</div>';
    h+='<div style="padding:10px 14px;max-height:200px;overflow-y:auto">';
    if(works.length){works.forEach(function(o){h+='<div style="padding:6px 8px;margin-bottom:4px;background:#EFF6FF;border-radius:8px;font-size:12px;border-left:3px solid #1E3A5F"><b>'+o.pnm+'</b> <span style="color:#64748B">'+o.cnm+' | 정매 '+getWQ(o)+'매</span></div>'})}
    if(waits.length){waits.forEach(function(o){h+='<div style="padding:6px 8px;margin-bottom:4px;background:#FFFBEB;border-radius:8px;font-size:12px;border-left:3px solid #F59E0B"><b>'+o.pnm+'</b> <span style="color:#64748B">'+o.cnm+' | 출고:'+o.sd+'</span></div>'})}
    if(!works.length&&!waits.length)h+='<div style="padding:8px;text-align:center;color:#CBD5E1;font-size:12px">현재 작업 없음</div>';
    h+='</div></div>';
  });
  area.innerHTML=h;
}

