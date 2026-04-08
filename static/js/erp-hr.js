/* ===== ERP:hr ===== */

/* === 직원 정보 === */
function rEmp(){
  const filter=$('empFilter').value,sch=($('empSch').value||'').toLowerCase();
  const all=DB.g('emp').filter(e=>e.st!=='퇴직');
  const fl=all.filter(e=>{if(filter&&e.dept!==filter)return false;if(sch&&!e.nm.toLowerCase().includes(sch))return false;return true});
  const todayAtt=DB.g('att').filter(a=>a.dt===td());
  $('empCnt').textContent=all.length;$('empField').textContent=all.filter(e=>e.dept==='현장').length;
  $('empOffice').textContent=all.filter(e=>e.dept==='사무').length;
  $('empToday').textContent=todayAtt.filter(a=>a.inTime).length;
  $('empList').innerHTML=fl.map(e=>{
    const att=todayAtt.find(a=>a.empId===e.id);
    const stBd=att&&att.inTime?(att.outTime?'bd-w':'bd-s'):'bd-d';
    const stTx=att&&att.inTime?(att.outTime?'퇴근':'출근중'):'미출근';
    return `<div class="emp-card" onclick="viewEmp('${e.id}')">
      <div class="emp-avatar">${e.nm.charAt(0)}</div>
      <div class="emp-info"><div class="emp-nm">${e.nm} <span class="bd ${stBd}">${stTx}</span></div>
        <div class="emp-sub">${e.dept} | ${e.rank||'사원'} | ${e.proc||'-'} | ${e.tel||'-'}</div></div>
      <div class="emp-actions">
        ${!att||!att.inTime?`<button class="time-btn btn-s" onclick="event.stopPropagation();clockIn('${e.id}')">출근</button>`:''}
        ${att&&att.inTime&&!att.outTime?`<button class="time-btn btn-o" onclick="event.stopPropagation();clockOut('${e.id}')">퇴근</button>`:''}
        <button class="btn btn-sm btn-o" onclick="event.stopPropagation();eEmp('${e.id}')">수정</button>
      </div></div>`}).join('')||'<div class="empty-state"><div class="msg">등록된 직원이 없습니다</div><div class="sub">[+ 직원등록] 버튼으로 시작하세요</div></div>';
}
function openEmpM(){['eId','eNm','eTel','eEmg','eBase','eHourly','eNote'].forEach(x=>$(x).value='');$('eDept').value='현장';$('eRank').value='사원';$('eProc').value='';$('eJoin').value=td();$('eBirth').value='';$('eAnnual').value=15;$('eSt').value='재직';$('empMoT').textContent='직원 등록';oMo('empMo')}
function eEmp(id){const e=DB.g('emp').find(x=>x.id===id);if(!e)return;$('eId').value=e.id;$('eNm').value=e.nm;$('eDept').value=e.dept;$('eRank').value=e.rank||'사원';$('eProc').value=e.proc||'';$('eJoin').value=e.join||'';$('eBirth').value=e.birth||'';$('eTel').value=e.tel||'';$('eEmg').value=e.emg||'';$('eBase').value=e.base||'';$('eHourly').value=e.hourly||'';$('eAnnual').value=e.annual||15;$('eSt').value=e.st||'재직';$('eNote').value=e.note||'';$('empMoT').textContent='직원 수정';oMo('empMo')}
function saveEmp(){const nm=$('eNm').value.trim();if(!nm){toast('이름 필요','err');return}const id=$('eId').value||gid();const rec={id,nm,dept:$('eDept').value,rank:$('eRank').value,proc:$('eProc').value,join:$('eJoin').value,birth:$('eBirth').value,tel:$('eTel').value,emg:$('eEmg').value,base:+$('eBase').value||0,hourly:+$('eHourly').value||0,annual:+$('eAnnual').value||15,st:$('eSt').value,note:$('eNote').value};const ls=DB.g('emp');const idx=ls.findIndex(x=>x.id===id);if(idx>=0)ls[idx]=rec;else ls.push(rec);DB.s('emp',ls);cMo('empMo');rEmp();toast('저장','ok')}
function viewEmp(id){eEmp(id)}

/* === 출퇴근 === */
function clockIn(empId){const dt=td(),t=new Date().toTimeString().slice(0,5);const ls=DB.g('att');const exist=ls.find(a=>a.empId===empId&&a.dt===dt);if(exist){exist.inTime=t}else{ls.push({id:gid(),empId,dt,inTime:t,outTime:'',note:''})}DB.s('att',ls);rEmp();rAtt();const e=DB.g('emp').find(x=>x.id===empId);toast(`${e?e.nm:''} 출근 ${t}`,'ok')}
function clockOut(empId){const dt=td(),t=new Date().toTimeString().slice(0,5);const ls=DB.g('att');const exist=ls.find(a=>a.empId===empId&&a.dt===dt);if(!exist||!exist.inTime){toast('출근 기록 없음','err');return}exist.outTime=t;DB.s('att',ls);rEmp();rAtt();const e=DB.g('emp').find(x=>x.id===empId);toast(`${e?e.nm:''} 퇴근 ${t}`,'ok')}
function rAtt(){
  if(!$('attDt').value)$('attDt').value=td();
  const dt=$('attDt').value;const emps=DB.g('emp').filter(e=>e.st==='재직');const atts=DB.g('att').filter(a=>a.dt===dt);
  $('attIn').textContent=atts.filter(a=>a.inTime).length;$('attOut').textContent=atts.filter(a=>a.outTime).length;
  $('attAbsent').textContent=emps.length-atts.filter(a=>a.inTime).length;
  $('attOT').textContent=atts.filter(a=>{if(!a.inTime||!a.outTime)return false;const h=calcHours(a.inTime,a.outTime);return h>9}).length;
  $('attTbl').querySelector('tbody').innerHTML=emps.map(e=>{
    const a=atts.find(x=>x.empId===e.id)||{};
    const hrs=a.inTime&&a.outTime?calcHours(a.inTime,a.outTime):0;
    const ot=Math.max(0,hrs-9);
    const st=!a.inTime?'<span class="bd bd-d">미출근</span>':!a.outTime?'<span class="bd bd-s">출근중</span>':ot>0?'<span class="bd bd-o">초과근무</span>':'<span class="bd bd-w">정상</span>';
    return `<tr><td style="font-weight:700">${e.nm}</td><td>${e.dept}</td><td>${e.proc||'-'}</td><td>${a.inTime||'-'}</td><td>${a.outTime||'-'}</td><td style="text-align:right">${hrs?hrs.toFixed(1)+'h':'-'}</td><td style="text-align:right;color:var(--wrn)">${ot?ot.toFixed(1)+'h':'-'}</td><td>${st}</td><td><button class="btn btn-sm btn-o" onclick="editAtt('${e.id}')">수정</button></td></tr>`}).join('');
}
function calcHours(inT,outT){const[ih,im]=inT.split(':').map(Number);const[oh,om]=outT.split(':').map(Number);let mins=(oh*60+om)-(ih*60+im);if(mins<0)mins+=1440;return mins/60}
function editAtt(empId){
  const dt=$('attDt').value;const a=DB.g('att').find(x=>x.empId===empId&&x.dt===dt)||{};
  const e=DB.g('emp').find(x=>x.id===empId);
  $('attEmpId').value=empId;$('attNm').textContent=e?e.nm:'';
  $('attInT').value=a.inTime||'';$('attOutT').value=a.outTime||'';$('attNote').value=a.note||'';oMo('attMo');
}
function saveAtt(){
  const empId=$('attEmpId').value,dt=$('attDt').value;
  const ls=DB.g('att');let a=ls.find(x=>x.empId===empId&&x.dt===dt);
  if(!a){a={id:gid(),empId,dt,inTime:'',outTime:'',note:''};ls.push(a)}
  a.inTime=$('attInT').value;a.outTime=$('attOutT').value;a.note=$('attNote').value;
  DB.s('att',ls);cMo('attMo');rAtt();toast('저장','ok');
}
function expAttCSV(){
  const dt=$('attDt').value||td();const emps=DB.g('emp');const atts=DB.g('att').filter(a=>a.dt===dt);
  let csv='\uFEFF이름,부서,공정,출근,퇴근,근무시간\n';
  emps.forEach(e=>{const a=atts.find(x=>x.empId===e.id)||{};const h=a.inTime&&a.outTime?calcHours(a.inTime,a.outTime).toFixed(1):'';csv+=`${e.nm},${e.dept},${e.proc||''},${a.inTime||''},${a.outTime||''},${h}\n`});
  const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='출퇴근_'+dt+'.csv';a.click();toast('내보내기','ok');
}

/* === 급여 === */
function rPay(){
  const mo=$('payMo').value||td().slice(0,7);if(!$('payMo').value)$('payMo').value=mo;
  const ls=DB.g('payroll').filter(r=>r.month===mo);
  $('payTotal').textContent=fmt(ls.reduce((s,r)=>s+(r.total||0),0))+'원';
  $('payBase').textContent=fmt(ls.reduce((s,r)=>s+(r.base||0),0))+'원';
  $('payAllow').textContent=fmt(ls.reduce((s,r)=>s+(r.ot||0)+(r.etc||0),0))+'원';
  $('payDeduct').textContent=fmt(ls.reduce((s,r)=>s+(r.ded||0),0))+'원';
  $('payTbl').querySelector('tbody').innerHTML=ls.map(r=>{
    return `<tr><td style="font-weight:700">${r.nm}</td><td>${r.dept}</td><td style="text-align:center">${r.days||0}</td><td style="text-align:right">${fmt(r.base)}</td><td style="text-align:right;color:var(--wrn)">${fmt(r.ot)}</td><td style="text-align:right;color:var(--suc)">${fmt(r.etc)}</td><td style="text-align:right;color:var(--dan)">${fmt(r.ded)}</td><td style="text-align:right;font-weight:800;font-size:14px">${fmt(r.total)}</td><td><button class="btn btn-sm btn-o" onclick="editPay('${r.id}')">수정</button> <button class="btn btn-sm btn-p" onclick="printPayOne('${r.id}')">명세서</button></td></tr>`}).join('')||'<tr><td colspan="10" class="empty-cell">등록된 급여 내역이 없습니다. [급여 자동계산] 버튼을 클릭하세요.</td></tr>';
}
function genPay(){
  const mo=$('payMo').value;if(!mo){toast('월 선택','err');return}
  if(DB.g('payroll').some(r=>r.month===mo)&&!confirm('이미 있습니다. 다시 계산?'))return;
  const emps=DB.g('emp').filter(e=>e.st==='재직');
  const atts=DB.g('att').filter(a=>a.dt.startsWith(mo));
  const payList=[];
  emps.forEach(e=>{
    const myAtt=atts.filter(a=>a.empId===e.id&&a.inTime);
    const days=myAtt.length;
    const otHours=myAtt.reduce((s,a)=>{if(!a.outTime)return s;const h=calcHours(a.inTime,a.outTime);return s+Math.max(0,h-9)},0);
    const base=e.base||0;const ot=Math.round(otHours*(e.hourly||0)*1.5);
    const total=base+ot;
    payList.push({id:gid(),empId:e.id,nm:e.nm,dept:e.dept,month:mo,days,base,ot,etc:0,ded:0,total});
  });
  // 기존 제거 후 새로 저장
  const existing=DB.g('payroll').filter(r=>r.month!==mo);
  DB.s('payroll',[]);rPay();toast(`${emps.length}명 급여 계산 완료`,'ok');
}
function editPay(id){
  const r=DB.g('payroll').find(x=>x.id===id);if(!r)return;
  $('peId').value=r.id;$('peNm').textContent=r.nm;$('peDays').value=r.days;$('peBase').value=r.base;
  $('peOT').value=r.ot;$('peEtc').value=r.etc||0;$('peDed').value=r.ded||0;calcPe();oMo('payEditMo');
}
function calcPe(){const b=+$('peBase').value||0,o=+$('peOT').value||0,e=+$('peEtc').value||0,d=+$('peDed').value||0;$('peNet').value=fmt(b+o+e-d)+'원'}
function savePayEdit(){
  const id=$('peId').value;const ls=DB.g('payroll');const idx=ls.findIndex(x=>x.id===id);if(idx<0)return;
  ls[idx].days=+$('peDays').value||0;ls[idx].base=+$('peBase').value||0;ls[idx].ot=+$('peOT').value||0;
  ls[idx].etc=+$('peEtc').value||0;ls[idx].ded=+$('peDed').value||0;
  ls[idx].total=ls[idx].base+ls[idx].ot+ls[idx].etc-ls[idx].ded;
  DB.s('payroll',ls);cMo('payEditMo');rPay();toast('저장','ok');
}
function printPayOne(id){
  let r;if(typeof id==='string'){r=DB.g('payroll').find(x=>x.id===id)}else{r=DB.g('payroll').find(x=>x.id===$('peId').value)}
  if(!r){toast('급여 데이터 없음','err');return}
  const co=DB.g1('co')||{nm:'이노패키지'};
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>급여명세서</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Nanum Gothic',sans-serif;padding:20mm;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:8px}th{background:#E5E7EB;font-weight:700}.title{text-align:center;font-size:20px;font-weight:800;margin-bottom:20px}@media print{@page{size:A4;margin:15mm}}</style></head><body>
  <div class="title">급 여 명 세 서</div>
  <div style="text-align:right;margin-bottom:12px">${co.nm} | ${r.month}</div>
  <table><tr><th>성명</th><td>${r.nm}</td><th>부서</th><td>${r.dept}</td><th>근무일수</th><td>${r.days}일</td></tr></table>
  <table style="margin-top:12px"><tr><th>기본급</th><td style="text-align:right">${fmt(r.base)} 원</td></tr><tr><th>야근수당</th><td style="text-align:right">${fmt(r.ot)} 원</td></tr><tr><th>기타수당</th><td style="text-align:right">${fmt(r.etc||0)} 원</td></tr><tr><th>공제</th><td style="text-align:right;color:red">-${fmt(r.ded||0)} 원</td></tr><tr><th style="font-size:16px">실수령액</th><td style="text-align:right;font-size:20px;font-weight:800">${fmt(r.total)} 원</td></tr></table>
  </body></html>`);w.document.close();setTimeout(()=>w.print(),300);
}
function printPayAll(){
  const mo=$('payMo').value;const ls=DB.g('payroll').filter(r=>r.month===mo);
  if(!ls.length){toast('데이터 없음','err');return}ls.forEach(r=>printPayOne(r.id));
}
function expPayCSV(){
  const mo=$('payMo').value||td().slice(0,7);const ls=DB.g('payroll').filter(r=>r.month===mo);
  let csv='\uFEFF이름,부서,근무일,기본급,야근,기타,공제,실수령\n';
  ls.forEach(r=>{csv+=`${r.nm},${r.dept},${r.days},${r.base},${r.ot},${r.etc||0},${r.ded||0},${r.total}\n`});
  const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='급여_'+mo+'.csv';a.click();toast('내보내기','ok');
}

/* === 연차/휴가 === */
function rLeave(){
  const y=$('lvYear2').value||new Date().getFullYear();
  const emps=DB.g('emp').filter(e=>e.st==='재직');
  const all=DB.g('leave').filter(l=>l.from.startsWith(y));
  const cm=td().slice(0,7);
  $('lvUsed').textContent=all.filter(l=>l.from.startsWith(cm)&&l.st==='승인').length;
  $('lvPend').textContent=all.filter(l=>l.st==='승인대기').length;
  $('lvYear').textContent=all.filter(l=>l.st==='승인').reduce((s,l)=>s+(l.days||0),0);

  $('lvTbl').querySelector('tbody').innerHTML=all.sort((a,b)=>b.from>a.from?1:-1).map(l=>{
    const stBd=l.st==='승인'?'bd-s':l.st==='반려'?'bd-d':'bd-o';
    return `<tr><td style="font-weight:700">${l.nm}</td><td>${l.type}</td><td>${l.from}</td><td>${l.to}</td><td style="text-align:center">${l.days}</td><td>${l.reason||'-'}</td><td><span class="bd ${stBd}">${l.st}</span></td><td>
      ${l.st==='승인대기'?`<button class="btn btn-sm btn-s" onclick="appLv('${l.id}')">승인</button> <button class="btn btn-sm btn-d" onclick="rejLv('${l.id}')">반려</button>`:''} <button class="btn btn-sm btn-d" onclick="dLv('${l.id}')">삭제</button></td></tr>`}).join('')||'<tr><td colspan="8" class="empty-cell">등록된 내역이 없습니다. 상단 버튼으로 등록해주세요.</td></tr>';

  // 연차 현황
  $('lvSumTbl').querySelector('tbody').innerHTML=emps.map(e=>{
    const used=all.filter(l=>l.empId===e.id&&l.st==='승인').reduce((s,l)=>s+(l.days||0),0);
    const remain=(e.annual||15)-used;
    return `<tr><td style="font-weight:700">${e.nm}</td><td>${e.dept}</td><td style="text-align:center">${e.annual||15}</td><td style="text-align:center">${used}</td><td style="text-align:center;font-weight:700;color:${remain<=3?'var(--dan)':'var(--suc)'}">${remain}</td></tr>`}).join('');
}
function openLvM(){
  const emps=DB.g('emp').filter(e=>e.st==='재직');
  $('lvEmp').innerHTML=emps.map(e=>`<option value="${e.id}">${e.nm} (${e.dept})</option>`).join('');
  $('lvId').value='';$('lvFrom').value=td();$('lvTo').value=td();$('lvReason').value='';$('lvType').value='연차';$('lvSt').value='승인대기';
  $('lvMoT').textContent='휴가 등록';oMo('lvMo');
}
function saveLv(){
  const empId=$('lvEmp').value,from=$('lvFrom').value,to=$('lvTo').value;
  if(!empId||!from||!to){toast('필수 항목','err');return}
  const e=DB.g('emp').find(x=>x.id===empId);
  const days=Math.max(1,Math.round((new Date(to)-new Date(from))/864e5)+1);
  const type=$('lvType').value;const adjDays=type.includes('반차')?0.5:days;
  const id=$('lvId').value||gid();
  const rec={id,empId,nm:e?e.nm:'',type,from,to,days:adjDays,reason:$('lvReason').value,st:$('lvSt').value};
  const ls=DB.g('leave');const idx=ls.findIndex(x=>x.id===id);
  if(idx>=0)ls[idx]=rec;else ls.push(rec);DB.s('leave',ls);cMo('lvMo');rLeave();toast('저장','ok');
}
function appLv(id){const ls=DB.g('leave');const idx=ls.findIndex(x=>x.id===id);if(idx>=0){ls[idx].st='승인';DB.s('leave',ls);rLeave();toast('승인','ok')}}
function rejLv(id){const ls=DB.g('leave');const idx=ls.findIndex(x=>x.id===id);if(idx>=0){ls[idx].st='반려';DB.s('leave',ls);rLeave();toast('반려','ok')}}
function dLv(id){if(!confirm('삭제?'))return;DB.s('leave',DB.g('leave').filter(x=>x.id!==id));rLeave();toast('삭제','ok')}

