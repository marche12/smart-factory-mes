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
var maxIng=proc==='톰슨'?2:1;
var canStart=works.length<maxIng;
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
if($('wQueueWait'))$('wQueueWait').innerHTML=waitH;
if($('wQueueWork'))$('wQueueWork').innerHTML=workH;
if($('wQueueDone'))$('wQueueDone').innerHTML=doneH;
if($('wCntWait'))$('wCntWait').textContent=waits.length+'건';
if($('wCntWork'))$('wCntWork').textContent=works.length+'건';
if($('wCntDone'))$('wCntDone').textContent=dones.length+'건';
if($('qWait'))$('qWait').innerHTML=waitH;
if($('qWork'))$('qWork').innerHTML=workH;
if($('qDone'))$('qDone').innerHTML=doneH;
if($('cntW'))$('cntW').textContent=waits.length+'건';
if($('cntK'))$('cntK').textContent=works.length+'건';
if($('cntD'))$('cntD').textContent=dones.length+'건';}

// === 관리자용 공정별 작업 현황 (작업자 등록 불필요) ===
var _wmProc='';
function rWorkerMonitor(proc){
  if(proc!==undefined)_wmProc=proc;
  var btns=document.querySelectorAll('#t-worker .btn');
  btns.forEach(function(b){b.className='btn btn-sm btn-o'});
  var activeBtn=_wmProc?null:document.getElementById('wm-all');
  if(!_wmProc&&activeBtn)activeBtn.className='btn btn-sm btn-p';
  else btns.forEach(function(b){if(b.textContent.trim()===_wmProc)b.className='btn btn-sm btn-p'});

  var procList=_wmProc?[_wmProc]:['인쇄','코팅','합지','톰슨','접착','외주가공'];
  var os=DB.g('wo').filter(function(o){return o.status!=='취소'&&o.status!=='출고완료'});
  var area=$('workerMonArea');if(!area)return;
  var h='';

  procList.forEach(function(proc){
    var isExt=typeof isExternalProc==='function'&&isExternalProc(proc);
    var waits=[],works=[],dones=[];
    os.forEach(function(o){
      if(!o.procs)return;
      o.procs.forEach(function(p,pi){
        if(p.nm!==proc)return;
        // 기계코팅 스킵
        if(p.nm==='코팅'&&p.mt==='기계코팅'&&p.st==='대기')return;
        if(p.st==='진행중'||p.st==='외주대기'||p.st==='외주진행중')works.push({o:o,p:p,pi:pi});
        else if(p.st==='대기'){var cp=curP(o);if(cp&&cp.nm===proc)waits.push({o:o,p:p,pi:pi})}
        else if(p.st==='완료'||p.st==='외주완료')dones.push({o:o,p:p,pi:pi});
      });
    });

    var procColors={'인쇄':'#1E3A5F','코팅':'#0891B2','합지':'#7C3AED','톰슨':'#DC2626','접착':'#EA580C','외주가공':'#9333EA'};
    var pc=procColors[proc]||'#6B7280';

    h+='<div style="background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.08);overflow:hidden">';
    // 헤더
    h+='<div style="padding:14px 16px;background:linear-gradient(135deg,'+pc+'11,'+pc+'05);border-bottom:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center">';
    h+='<div style="font-weight:800;font-size:16px;color:'+pc+'">'+proc+'</div>';
    h+='<div style="display:flex;gap:8px">';
    h+='<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#FEF3C7;color:#D97706">대기 '+waits.length+'</span>';
    h+='<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#DBEAFE;color:#1D4ED8">진행 '+works.length+'</span>';
    h+='<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#D1FAE5;color:#059669">완료 '+dones.length+'</span>';
    h+='</div></div>';
    // 내용
    h+='<div style="padding:10px 14px;max-height:300px;overflow-y:auto">';

    // 진행중
    if(works.length){
      works.forEach(function(it){
        h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:4px;background:#EFF6FF;border-radius:8px;border-left:3px solid '+pc+'">';
        h+='<div style="flex:1"><b style="font-size:13px">'+it.o.pnm+'</b> <span style="font-size:12px;color:#64748B">'+it.o.cnm+' | '+fmt(it.p.qty||it.o.fq)+'매</span></div>';
        if(isExt){
          h+='<button onclick="pqConfirmIn(\''+it.o.id+'\','+it.pi+')" class="btn btn-sm" style="font-size:11px;padding:4px 10px;background:#9333EA;color:#fff;border:none">입고확인</button>';
        }else{
          h+='<button onclick="pqComplete(\''+it.o.id+'\','+it.pi+')" class="btn btn-sm" style="font-size:11px;padding:4px 10px;background:#10B981;color:#fff;border:none">완료</button>';
        }
        h+='</div>';
      });
    }
    // 대기
    if(waits.length){
      var maxIng=proc==='톰슨'?2:1;
      var canStart=works.length<maxIng;
      waits.forEach(function(it){
        h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:4px;background:#FFFBEB;border-radius:8px;border-left:3px solid #F59E0B">';
        h+='<div style="flex:1"><b style="font-size:13px">'+it.o.pnm+'</b> <span style="font-size:12px;color:#64748B">'+it.o.cnm+' | 출고:'+it.o.sd+'</span></div>';
        if(canStart){
          h+='<button onclick="pqStart(\''+it.o.id+'\','+it.pi+')" class="btn btn-sm" style="font-size:11px;padding:4px 10px;background:#1E3A5F;color:#fff;border:none">시작</button>';
        }else{
          h+='<span style="font-size:11px;color:#9CA3AF;padding:4px 8px">대기중</span>';
        }
        h+='</div>';
      });
    }
    // 완료 (오늘만)
    var todayDones=dones.filter(function(it){return it.p.t2&&it.p.t2.slice(0,10)===td()});
    if(todayDones.length){
      todayDones.forEach(function(it){
        h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:4px;background:#F0FDF4;border-radius:8px;border-left:3px solid #10B981;opacity:.7">';
        h+='<div style="flex:1"><b style="font-size:13px">'+it.o.pnm+'</b> <span style="font-size:12px;color:#64748B">'+it.o.cnm+' | '+fmt(it.p.qty)+'매</span></div>';
        h+='<span style="font-size:12px;font-weight:700;color:#10B981">완료</span>';
        h+='</div>';
      });
    }
    if(!works.length&&!waits.length&&!todayDones.length){
      h+='<div style="padding:16px;text-align:center;color:#CBD5E1;font-size:13px">현재 작업 없음</div>';
    }
    h+='</div></div>';
  });

  area.innerHTML=h;
}
