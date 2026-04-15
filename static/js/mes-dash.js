/* ===== MES JS ===== */
// ===== UTILS =====
// util: in wrapper
// DB: in wrapper
// util: in wrapper
// util: in wrapper
// util: in wrapper
function gWN(){const d=td().replace(/-/g,'');const n=DB.g('wo').filter(o=>o.wn&&o.wn.startsWith('WO'+d)).length;return 'WO'+d+String(n+1).padStart(3,'0')}
// 
function isLate(o){return o.status!=='완료'&&o.status!=='출고완료'&&o.sd&&o.sd<=td()}
function dLeft(o){if(!o.sd)return 999;return Math.ceil((new Date(o.sd)-new Date(td()))/864e5)}
function curP(o){if(!o||!o.procs)return null;for(let i=0;i<o.procs.length;i++){var p=o.procs[i];if(p.st==='완료'||p.st==='외주완료'||p.st==='스킵')continue;if(p.nm==='코팅'&&p.mt==='기계코팅'&&p.st==='대기'){var printP=o.procs.find(function(x){return x.nm==='인쇄'});if(printP&&(printP.st==='완료'||printP.st==='외주완료')){p.st='완료';p.qty=printP.qty||0;p.t2=nw();continue}}return p}return null}
function progBar(o){if(!o||!o.procs)return'<div style="font-size:11px;color:var(--txt3)">0/0</div>';const t=o.procs.length,d=o.procs.filter(p=>p.st==='완료'||p.st==='외주완료'||p.st==='스킵').length;const pct=t?Math.round(d/t*100):0;return`<div><div class="prog-bar"><div class="track"><div class="fill" style="width:${pct}%"></div></div></div><div style="font-size:11px;color:var(--txt2);margin-top:2px">${d}/${t} (${pct}%)</div></div>`}
function addLog(msg){const logs=DB.g('logs');logs.unshift({t:nw(),m:msg});if(logs.length>100)logs.length=100;DB.s('logs',logs)}

// ===== INIT DATA =====

/* 작업 있는 주 자동 찾기 */
function schedFindWork(){
  var os=DB.g('wo').filter(function(o){return o.status!=='출고완료'});
  if(!os.length){toast('등록된 작업이 없습니다','err');return}
  // 모든 공정의 날짜 수집
  var dates=[];
  os.forEach(function(o){
    if(!o.procs)return;
    o.procs.forEach(function(p,pi){
      var pDate='';
      if(p.t1)pDate=p.t1.slice(0,10);
      else if(p.st==='완료'&&p.t2)pDate=p.t2.slice(0,10);
      else if(p.st==='진행중')pDate=td();
      else{
        var totalP=o.procs.length;var base=o.sd||td();
        var daysBack=(totalP-pi)*2;
        var est=new Date(base);est.setDate(est.getDate()-daysBack);
        var now=new Date(td());
        if(est<now&&p.st!=='완료'){est=new Date(now);est.setDate(est.getDate()+pi)}
        pDate=est.getFullYear()+'-'+String(est.getMonth()+1).padStart(2,'0')+'-'+String(est.getDate()).padStart(2,'0');
      }
      if(pDate)dates.push(pDate);
    });
  });
  if(!dates.length){toast('작업 날짜를 찾을 수 없습니다','err');return}
  // 오늘에서 가장 가까운 날짜 찾기
  dates.sort();
  var today=td();
  var closest=dates[0];
  for(var i=0;i<dates.length;i++){
    if(dates[i]>=today){closest=dates[i];break}
    closest=dates[i];
  }
  // 해당 날짜의 월요일로 이동
  _schedWeekStart=getMonday(new Date(closest));
  renderSchedBoard();
  toast('작업이 있는 주로 이동했습니다','ok');
}

/* 샘플 데이터 초기화 */
function resetSample(){
  Object.keys(localStorage).filter(function(k){return k.startsWith('ino_')}).forEach(function(k){localStorage.removeItem(k)});
  initDB();
  toast('샘플 데이터가 초기화되었습니다','ok');
  goMod('mes-sched');
}

function initDB(){
var _DATA_VER='v28-production';
if(DB.g1('init')===_DATA_VER)return;
if(DB.g1('init')){Object.keys(localStorage).filter(function(k){return k.startsWith('ino_')}).forEach(function(k){localStorage.removeItem(k)})}
// 기본 관리자 계정
DB.s('users',[
{id:'u1',nm:'관리자',role:'admin',proc:'',un:'admin',pw:'1234',dept:'관리부',position:'대표'}
]);
// 빈 데이터 초기화
DB.s('cli',[]);DB.s('prod',[]);DB.s('mold',[]);DB.s('vendors',[]);DB.s('wo',[]);DB.s('hist',[]);DB.s('shipLog',[]);DB.s('logs',[]);DB.s('incLog',[]);DB.s('qcRecords',[]);DB.s('sales',[]);DB.s('purchase',[]);DB.s('monthlyRpt',[]);
// 회사 정보
DB.s1('co',{nm:'팩플로우',addr:'경기도 파주시 월롱산로 89',tel:'031-957-5921',fax:'031-957-5925'});
DB.s1('init',_DATA_VER);
}


// ===== ADMIN TABS (구 시스템 제거됨 - unifiedLogin 사용) =====
function woSub(t,b){if(t==='new'){openWOForm();return;}rWOList();}
function openWOForm(){if(typeof resetWO==='function'&&!editId)resetWO();var ov=$('woFormOv');if(ov)ov.classList.remove('hidden');}
function rptSub(t,b){document.querySelectorAll('#t-rpt .s-tab').forEach(x=>x.classList.remove('on'));if(b)b.classList.add('on');else{var fb=document.querySelector('#t-rpt .s-tab');if(fb)fb.classList.add('on')};['day','week','month','pl','eff','monthly','perf','prodstat','ordmonthly','ordstat','defect','ship'].forEach(x=>{var el=$('rpt-'+x);if(el)el.classList.toggle('hidden',x!==t)});if(t==='day'){var dd=$('rptDD');if(dd&&!dd.value)dd.value=td();genRpt('day')}if(t==='week'){var wd=$('rptWD');if(wd&&!wd.value){var d=new Date();wd.value=d.getFullYear()+'-W'+String(Math.ceil(((d-new Date(d.getFullYear(),0,1))/864e5+new Date(d.getFullYear(),0,1).getDay()+1)/7)).padStart(2,'0')}genRpt('week')}if(t==='month'){var md=$('rptMD');if(md&&!md.value)md.value=td().slice(0,7);genRpt('month')}if(t==='pl'){var py=$('plY');if(py&&!py.options.length){var yr=new Date().getFullYear();for(var i=yr;i>=yr-3;i--){var o=document.createElement('option');o.value=i;o.textContent=i+'년';py.appendChild(o)}}if(typeof rPl==='function')rPl()}if(t==='perf'&&typeof rPerf==='function')rPerf();if(t==='prodstat')rProdStat();if(t==='ordmonthly'&&typeof rOrderMonthly==='function')rOrderMonthly();if(t==='ordstat'&&typeof rOrderStat==='function')rOrderStat();if(t==='defect'){var dm=$('rptDefectM');if(dm&&!dm.value)dm.value=td().slice(0,7);if(typeof genDefectRpt==='function')genDefectRpt()}if(t==='ship'){var sm=$('rptShipM');if(sm&&!sm.value)sm.value=td().slice(0,7);if(typeof genShipRpt==='function')genShipRpt()}}
function rProdStat(){
  var os=DB.g('wo');
  var allHs=DB.g('hist');
  // 상태별 분포
  var stNames=['대기','진행중','완료','출고완료','보류','취소'];
  var stColors=['#1E3A5F','#1E3A5F','#059669','#059669','#DC2626','#94A3B8'];
  var stData=stNames.map(function(s){var cnt=0;os.forEach(function(o){var st=o.status||'대기';if(st===s||(s==='대기'&&!o.status))cnt++});return cnt});
  var fL=[],fD=[],fC=[];
  stNames.forEach(function(s,i){if(stData[i]>0){fL.push(s);fD.push(stData[i]);fC.push(stColors[i])}});
  setTimeout(function(){drawDonutChart('rptChartStatus',fL,fD,fC)},50);
  // 월별 생산량 비교 (최근 6개월)
  var now=new Date(),months=[],mQtys=[];
  for(var mi=5;mi>=0;mi--){
    var d=new Date(now.getFullYear(),now.getMonth()-mi,1);
    var m=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    months.push((d.getMonth()+1)+'월');
    var q=0;allHs.forEach(function(h){if(h.doneAt&&h.doneAt.startsWith(m))q+=(+h.qty||0)});
    mQtys.push(q);
  }
  setTimeout(function(){drawBarChart('rptChartMonthly',months,[{label:'생산량',data:mQtys,color:'#1E3A5F'}])},50);
  // 거래처별 수주량
  var cliQty={};
  os.forEach(function(o){if(o.status==='취소')return;if(!cliQty[o.cnm])cliQty[o.cnm]=0;cliQty[o.cnm]+=(o.fq||0)});
  var cL=Object.keys(cliQty).sort(function(a,b){return cliQty[b]-cliQty[a]}).slice(0,8);
  var cD=cL.map(function(c){return cliQty[c]});
  var cC=['#1E3A5F','#1E3A5F','#1E3A5F','#1E3A5F','#1E3A5F','#1E3A5F','#1E3A5F','#1E3A5F'];
  setTimeout(function(){drawHBarChart('rptChartClient',cL,cD,cC)},50);
  // 공정별 작업 품목
  var procItems={};
  os.forEach(function(o){if(o.status==='취소')return;if(!o.procs)return;o.procs.forEach(function(p){if(!procItems[p.nm])procItems[p.nm]=0;procItems[p.nm]++})});
  var eL=Object.keys(procItems).sort(function(a,b){return procItems[b]-procItems[a]});
  var eD=eL.map(function(l){return procItems[l]});
  var eC=eL.map(function(){return '#1E3A5F'});
  setTimeout(function(){drawHBarChart('rptChartEfficiency',eL,eD,eC)},50);
}

function shipSub(t,b){document.querySelectorAll('#t-ship .s-tab').forEach(x=>x.classList.remove('on'));if(b)b.classList.add('on');else{var fb=document.querySelector('#t-ship .s-tab');if(fb)fb.classList.add('on')};['ready','hist','stat','claim','lot'].forEach(x=>$('ship-'+x).classList.toggle('hidden',x!==t));if(t==='ready')rShipReady();else if(t==='hist')rShipHist();else if(t==='stat')rShipStat();else if(t==='claim')rClaim();else if(t==='lot')rLotHist();}

// ===== 공정별 상세 모달 (작업자 화면과 동일) =====
function showProcDet(procNm){
var q=getProcQueue(procNm);
var os=DB.g('wo');
// getProcQueue 결과를 showProcDet 형식으로 변환
var waits=q.wait.map(function(it){var o=os.find(function(x){return x.id===it.wid});return{wo:o,p:o.procs[it.pi],pi:it.pi}});
var ings=q.ing.map(function(it){var o=os.find(function(x){return x.id===it.wid});return{wo:o,p:o.procs[it.pi],pi:it.pi}});
var dones=q.done.map(function(it){var o=os.find(function(x){return x.id===it.wid});return{wo:o,p:o.procs[it.pi],pi:it.pi}});

var h='<div class="mb" style="width:520px;max-height:85vh;display:flex;flex-direction:column"><div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">';
h+=procNm+' 공정';
h+='<button class="mo-x" onclick="cMo(\'procDetMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button></div>';
// 카운트 요약
h+='<div style="display:flex;gap:0;border-bottom:1px solid var(--bdr)">';
h+='<div style="flex:1;text-align:center;padding:8px;font-size:12px"><div style="font-size:18px;font-weight:700;color:var(--pri)">'+waits.length+'<span style="font-size:11px;font-weight:400">건</span></div><div style="color:var(--txt3)">대기</div></div>';
h+='<div style="flex:1;text-align:center;padding:8px;font-size:12px;border-left:1px solid var(--bdr);border-right:1px solid var(--bdr)"><div style="font-size:18px;font-weight:700;color:#F59E0B">'+ings.length+'<span style="font-size:11px;font-weight:400">건</span></div><div style="color:var(--txt3)">진행</div></div>';
h+='<div style="flex:1;text-align:center;padding:8px;font-size:12px"><div style="font-size:18px;font-weight:700;color:var(--suc)">'+dones.length+'<span style="font-size:11px;font-weight:400">건</span></div><div style="color:var(--txt3)">완료</div></div>';
h+='</div>';
h+='<div style="padding:10px 16px;flex:1;overflow-y:auto">';

// 진행중
ings.forEach(function(it){
  h+='<div style="border-left:4px solid #F59E0B;background:#FFFBEB;border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px">';
  h+='<div style="flex:1"><div style="font-weight:700;font-size:13px">'+it.wo.pnm+'</div>';
  h+='<div style="font-size:11px;color:var(--txt3);margin-top:2px">'+it.wo.cnm+' | '+it.wo.fq+'매 | 출고:'+it.wo.sd+'</div></div>';
  h+='<button class="btn btn-sm btn-o" onclick="cMo(\'procDetMo\');showDet(\''+it.wo.id+'\')" style="padding:4px 8px;font-size:11px">상세</button>';
  h+='<span style="padding:3px 8px;border-radius:6px;background:#DCE8F5;color:#1D4ED8;font-size:11px;font-weight:600">진행중</span></div>';
});

// 대기 - 관리자만 화살표로 순서 변경 가능
var isAdmin=CU&&CU.role==='admin';
if(isAdmin&&waits.length>1){
h+='<div style="font-size:11px;color:#1E3A5F;margin-bottom:6px;font-weight:600">↕ 화살표로 대기열 순서 변경</div>';
}
h+='<div id="procQueueList" data-proc="'+procNm+'">';
waits.forEach(function(it,idx){
  var dl=dLeft(it.wo);
  var urgStyle=dl<=1?'border-color:#DC2626;background:#FEF2F2':dl<=3?'border-color:#F59E0B;background:#FFFBEB':'';
  var ddColor=dl<=1?'#DC2626':dl<=3?'#F59E0B':'#64748B';
  var isFirst=idx===0,isLast=idx===waits.length-1;
  h+='<div class="proc-q-item" data-woid="'+it.wo.id+'" data-pi="'+it.pi+'" style="border-left:4px solid var(--pri);background:var(--bg2);border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;'+urgStyle+'">';
  if(isAdmin){
    h+='<div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">';
    h+='<button onclick="procQMove(\''+procNm+'\','+idx+',-1)" style="border:none;background:'+(isFirst?'#E5E7EB':'#DCE8F5')+';color:'+(isFirst?'#D1D5DB':'#1E3A5F')+';font-size:10px;line-height:1;padding:3px 4px;border-radius:3px;cursor:'+(isFirst?'default':'pointer')+'" '+(isFirst?'disabled':'')+'>▲</button>';
    h+='<button onclick="procQMove(\''+procNm+'\','+idx+',1)" style="border:none;background:'+(isLast?'#E5E7EB':'#DCE8F5')+';color:'+(isLast?'#D1D5DB':'#1E3A5F')+';font-size:10px;line-height:1;padding:3px 4px;border-radius:3px;cursor:'+(isLast?'default':'pointer')+'" '+(isLast?'disabled':'')+'>▼</button>';
    h+='</div>';
  }
  h+='<div style="width:22px;height:22px;border-radius:50%;background:#E2E8F0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#475569">'+(idx+1)+'</div>';
  h+='<div style="flex:1"><div style="font-weight:700;font-size:13px">'+it.wo.pnm+'</div>';
  h+='<div style="font-size:11px;color:var(--txt3);margin-top:2px">'+it.wo.cnm+' | '+it.wo.fq+'매 | 출고:'+it.wo.sd+'</div></div>';
  h+='<span style="font-size:11px;font-weight:700;color:'+ddColor+'">D'+(dl>=0?'-':'+')+Math.abs(dl)+'</span>';
  h+='<span style="padding:3px 8px;border-radius:6px;background:#FEF3C7;color:#B45309;font-size:11px;font-weight:600">대기</span></div>';
});
h+='</div>';

// 완료 (오늘)
dones.forEach(function(it){
  h+='<div style="border-left:4px solid var(--suc);background:#F0FDF4;border-radius:8px;padding:10px 12px;margin-bottom:6px;display:flex;align-items:center;gap:10px;opacity:.7">';
  h+='<div style="flex:1"><div style="font-weight:700;font-size:13px">'+it.wo.pnm+'</div>';
  h+='<div style="font-size:11px;color:var(--txt3);margin-top:2px">'+it.wo.cnm+' | 수량:'+(it.p.qty||it.wo.fq)+'</div></div>';
  h+='<div style="font-size:13px;font-weight:700;color:var(--suc)">완료</div>';
  h+='</div>';
});

if(!waits.length&&!ings.length&&!dones.length){
h+='<div style="text-align:center;padding:30px;color:var(--txt3);font-size:13px">대기중인 작업이 없습니다</div>';
}

h+='</div></div>';
var el=document.createElement('div');el.id='procDetMo';el.className='mo-bg';el.innerHTML=h;
el.onclick=function(e){if(e.target===el)cMo('procDetMo')};
document.body.appendChild(el);
}
// 대기열 화살표 순서 변경
function procQMove(procNm,idx,dir){
  var q=getProcQueue(procNm);
  var wait=q.wait;
  var newIdx=idx+dir;
  if(newIdx<0||newIdx>=wait.length)return;
  var moved=wait.splice(idx,1)[0];
  wait.splice(newIdx,0,moved);
  var allWo=DB.g('wo');
  wait.forEach(function(it,i){
    var o=allWo.find(function(x){return x.id===it.wid});
    if(o)o.pri=i+1;
  });
  DB.s('wo',allWo);
  toast('순서 변경','ok');
  cMo('procDetMo');
  showProcDet(procNm);
}

// ===== DASHBOARD =====
// ===== Dashboard Chart Functions (pure canvas, no external libs) =====
if(!CanvasRenderingContext2D.prototype.roundRect){CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){if(typeof r==='number')r=[r,r,r,r];var tl=r[0]||0;this.moveTo(x+tl,y);this.lineTo(x+w-tl,y);this.arcTo(x+w,y,x+w,y+tl,tl);this.lineTo(x+w,y+h-tl);this.arcTo(x+w,y+h,x+w-tl,y+h,tl);this.lineTo(x+tl,y+h);this.arcTo(x,y+h,x,y+h-tl,tl);this.lineTo(x,y+tl);this.arcTo(x,y,x+tl,y,tl);this.closePath()}}
function _initCanvas(canvasId,h){
  var c=document.getElementById(canvasId);if(!c)return null;
  var ct=c.parentElement;
  var dpr=Math.max(window.devicePixelRatio||1,3);
  var cssW=ct.clientWidth;var cssH=h||200;
  c.width=Math.round(cssW*dpr);c.height=Math.round(cssH*dpr);
  c.style.width=cssW+'px';c.style.height=cssH+'px';
  var x=c.getContext('2d');x.scale(dpr,dpr);
  x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';
  x.textRendering='geometricPrecision';
  x.clearRect(0,0,cssW,cssH);
  return{c:c,x:x,w:cssW,h:cssH}
}

function drawBarChart(canvasId,labels,datasets){
  var r=_initCanvas(canvasId,210);if(!r)return;var x=r.x,W=r.w,H=r.h;
  // 최대값 계산 후 Y축 레이블 너비 동적 측정
  var maxV=0;datasets.forEach(function(ds){ds.data.forEach(function(v){if(v>maxV)maxV=v})});
  if(maxV===0)maxV=1;
  var step=Math.ceil(maxV/4);maxV=step*4;
  x.font='11px -apple-system,sans-serif';
  var maxLW=x.measureText(maxV.toLocaleString()).width;
  var pad={t:30,b:36,l:Math.ceil(maxLW)+14,r:14};
  var cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  // legend
  var lx=pad.l;
  x.font='bold 11px -apple-system,sans-serif';
  datasets.forEach(function(ds){
    x.fillStyle=ds.color;x.beginPath();x.roundRect(lx,6,10,10,2);x.fill();
    x.fillStyle='#64748B';x.fillText(ds.label,lx+14,15);lx+=x.measureText(ds.label).width+30;
  });
  // Y axis
  x.font='11px -apple-system,sans-serif';x.fillStyle='#94A3B8';x.textAlign='right';
  for(var i=0;i<=4;i++){
    var yv=step*i,yy=pad.t+cH-cH*(yv/maxV);
    x.fillText(yv.toLocaleString(),pad.l-6,yy+4);
    x.strokeStyle='#F1F5F9';x.lineWidth=1;x.beginPath();x.moveTo(pad.l,yy);x.lineTo(W-pad.r,yy);x.stroke();
  }
  // bars
  var gW=cW/labels.length,bW=Math.min(20,gW/(datasets.length+1)),gap=2;
  x.textAlign='center';
  labels.forEach(function(lb,li){
    var gx=pad.l+gW*li+gW/2;
    datasets.forEach(function(ds,di){
      var bh=cH*(ds.data[li]/maxV);
      var bx=gx-((datasets.length*bW+(datasets.length-1)*gap)/2)+di*(bW+gap);
      var by=pad.t+cH-bh;
      if(bh<=0||bW<=0)return;
      var rr=Math.max(0,Math.min(3,bW/2,bh/2));
      x.fillStyle=ds.color;x.beginPath();x.roundRect(bx,by,bW,bh,rr);x.fill();
    });
    x.fillStyle='#475569';x.font='11px -apple-system,sans-serif';
    x.fillText(lb,gx,H-pad.b+16);
  });
}

function drawDonutChart(canvasId,labels,data,colors){
  var r=_initCanvas(canvasId,180);if(!r)return;var x=r.x,W=r.w,H=r.h;
  var total=0;data.forEach(function(v){total+=v});if(total===0){x.fillStyle='#94A3B8';x.font='12px -apple-system,sans-serif';x.textAlign='center';x.fillText('데이터 없음',W/2,H/2);return}
  var cx=W/2,cy=70,rad=55,inner=32;
  var angle=-Math.PI/2;
  data.forEach(function(v,i){
    var slice=2*Math.PI*(v/total);
    x.beginPath();x.moveTo(cx+inner*Math.cos(angle),cy+inner*Math.sin(angle));
    x.arc(cx,cy,rad,angle,angle+slice);x.arc(cx,cy,inner,angle+slice,angle,true);
    x.closePath();x.fillStyle=colors[i%colors.length];x.fill();
    angle+=slice;
  });
  // center total
  x.fillStyle='#1E293B';x.font='bold 18px -apple-system,sans-serif';x.textAlign='center';x.textBaseline='middle';
  x.fillText(total,cx,cy-4);
  x.fillStyle='#94A3B8';x.font='10px -apple-system,sans-serif';x.fillText('전체',cx,cy+12);
  // legend below
  var lx=8,ly=H-30;
  x.textAlign='left';x.textBaseline='top';x.font='10px -apple-system,sans-serif';
  labels.forEach(function(lb,i){
    x.fillStyle=colors[i%colors.length];x.beginPath();x.arc(lx+5,ly+5,4,0,2*Math.PI);x.fill();
    x.fillStyle='#475569';x.fillText(lb+' '+data[i],lx+13,ly);
    lx+=x.measureText(lb+' '+data[i]).width+26;
    if(lx>W-30){lx=8;ly+=16}
  });
}

function drawLineChart(canvasId,labels,data,color){
  var r=_initCanvas(canvasId,210);if(!r)return;var x=r.x,W=r.w,H=r.h;
  var maxV=0;data.forEach(function(v){if(v>maxV)maxV=v});
  if(maxV===0)maxV=1;
  var step=Math.ceil(maxV/4);maxV=step*4;
  x.font='11px -apple-system,sans-serif';
  var maxLW=x.measureText(maxV.toLocaleString()).width;
  var pad={t:16,b:32,l:Math.ceil(maxLW)+14,r:14};
  var cW=W-pad.l-pad.r,cH=H-pad.t-pad.b;
  // Y grid
  x.fillStyle='#94A3B8';x.textAlign='right';
  for(var i=0;i<=4;i++){
    var yv=step*i,yy=pad.t+cH-cH*(yv/maxV);
    x.fillText(yv.toLocaleString(),pad.l-6,yy+4);
    x.strokeStyle='#F1F5F9';x.lineWidth=1;x.beginPath();x.moveTo(pad.l,yy);x.lineTo(W-pad.r,yy);x.stroke();
  }
  // points
  var pts=[];
  var gW=cW/(labels.length-1||1);
  labels.forEach(function(lb,li){
    var px=pad.l+gW*li,py=pad.t+cH-cH*(data[li]/maxV);
    pts.push({x:px,y:py});
    if(lb){x.fillStyle='#64748B';x.textAlign='center';x.font='11px -apple-system,sans-serif';x.fillText(lb,px,H-8);}
  });
  if(pts.length<2)return;
  var grad=x.createLinearGradient(0,pad.t,0,pad.t+cH);
  grad.addColorStop(0,color+'33');grad.addColorStop(1,color+'05');
  x.beginPath();x.moveTo(pts[0].x,pad.t+cH);
  pts.forEach(function(p){x.lineTo(p.x,p.y)});
  x.lineTo(pts[pts.length-1].x,pad.t+cH);x.closePath();x.fillStyle=grad;x.fill();
  x.strokeStyle=color;x.lineWidth=2;x.lineJoin='round';x.beginPath();
  pts.forEach(function(p,i){if(i===0)x.moveTo(p.x,p.y);else x.lineTo(p.x,p.y)});
  x.stroke();
  pts.forEach(function(p){
    x.beginPath();x.arc(p.x,p.y,3,0,2*Math.PI);x.fillStyle='#fff';x.fill();
    x.strokeStyle=color;x.lineWidth=2;x.stroke();
  });
}

function drawGaugeChart(canvasId, percentage, label, color) {
  var canvas = document.getElementById(canvasId);
  if(!canvas) return;
  var container = canvas.parentElement;
  var dpr=Math.max(window.devicePixelRatio||1,3);
  var cssW=container.clientWidth;var cssH=210;
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
  canvas.style.width=cssW+'px';canvas.style.height=cssH+'px';
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.textRendering='geometricPrecision';
  var cx = cssW / 2;
  var cy = cssH * 0.55;
  var radius = Math.max(Math.min(cx, cy) - 20, 1);
  var startAngle = Math.PI;
  var endAngle = 2 * Math.PI;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.lineWidth = 22;
  ctx.strokeStyle = '#F1F5F9';
  ctx.lineCap = 'round';
  ctx.stroke();
  var valueAngle = startAngle + (Math.PI * Math.min(percentage, 100) / 100);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, valueAngle);
  ctx.lineWidth = 22;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 30px -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(percentage + '%', cx, cy - 6);
  ctx.fillStyle = '#64748B';
  ctx.font = '13px -apple-system, sans-serif';
  ctx.fillText(label, cx, cy + 26);
  ctx.font = '11px -apple-system, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.textAlign = 'left';
  ctx.fillText('0%', cx - radius - 4, cy + 16);
  ctx.textAlign = 'right';
  ctx.fillText('100%', cx + radius + 4, cy + 16);
}

function drawHBarChart(canvasId, labels, data, colors) {
  var canvas = document.getElementById(canvasId);
  if(!canvas) return;
  var container = canvas.parentElement;
  var dpr = Math.max(window.devicePixelRatio || 1, 3);
  var maxVal = Math.max.apply(null, data) || 1;
  var barH = 22;
  var gap = 10;
  var startY = 16;
  var itemCount = labels.length;
  var cssH = Math.max(180, startY + itemCount * (barH + gap) + 12);
  var cssW = container.clientWidth || 200;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.textRendering = 'geometricPrecision';
  ctx.clearRect(0, 0, cssW, cssH);
  // 동적 leftPad: 가장 긴 레이블 너비 측정
  ctx.font = '11px -apple-system, sans-serif';
  var maxLabelW = 0;
  labels.forEach(function(lb) { var w = ctx.measureText(lb).width; if(w > maxLabelW) maxLabelW = w; });
  var leftPad = Math.min(Math.ceil(maxLabelW) + 12, Math.floor(cssW * 0.4));
  // 동적 rightPad: 최대값 텍스트 너비 측정
  ctx.font = 'bold 11px -apple-system, sans-serif';
  var rightPad = Math.ceil(ctx.measureText(maxVal.toLocaleString()).width) + 14;
  var chartW = cssW - leftPad - rightPad;
  labels.forEach(function(label, i) {
    var y = startY + i * (barH + gap);
    var w = (data[i] / maxVal) * chartW;
    var color = colors ? (colors[i] || '#1E3A5F') : '#1E3A5F';
    // 레이블 (잘림 방지: leftPad 내에서 클리핑)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y, leftPad - 4, barH);
    ctx.clip();
    ctx.fillStyle = '#475569';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, leftPad - 6, y + barH / 2);
    ctx.restore();
    // 배경 바
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(leftPad, y, chartW, barH, 4);
    else ctx.rect(leftPad, y, chartW, barH);
    ctx.fill();
    // 데이터 바
    if(w > 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(leftPad, y, Math.max(w, 6), barH, 4);
      else ctx.rect(leftPad, y, Math.max(w, 6), barH);
      ctx.fill();
    }
    // 값 레이블
    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(data[i].toLocaleString(), leftPad + w + 6, y + barH / 2);
  });
}

function renderDashCharts(){
  var allOs=DB.g('wo');
  // 공정별 현황/미출고: 전체 미완료 WO 기준
  var os=allOs.filter(function(o){return o.status!=='취소';});
  var allHs=DB.g('hist');
  var thisMonth=td().slice(0,7);
  // 납기준수율·거래처별수주량: 이번 달 기준
  var monthOs=allOs.filter(function(o){return (o.dt&&o.dt.startsWith(thisMonth))||(o.sd&&o.sd.startsWith(thisMonth));});
  var monthHs=allHs.filter(function(h){return h.doneAt&&h.doneAt.startsWith(thisMonth);});
  // Chart 1: 공정별 작업 현황
  var pns=getProcNames().filter(function(n){return n!=='생산완료'});
  var waitD=[],progD=[],doneD=[];
  pns.forEach(function(pn){
    var w=0,k=0,d=0;
    os.forEach(function(o){if(o.status==='취소')return;if(!o.procs)return;var cp=curP(o);
      o.procs.forEach(function(p){if(p.nm!==pn)return;
        if(p.st==='완료'||p.st==='외주완료'){d++;return}
        if(o.status==='출고완료'||o.status==='완료'||o.status==='완료대기')return;
        if(cp&&cp.nm===pn){if(cp.st==='대기')w++;else if(cp.st==='진행중'||cp.st==='외주대기')k++}
      });
    });
    waitD.push(w);progD.push(k);doneD.push(d);
  });
  drawBarChart('chartProc',pns,[{label:'대기',data:waitD,color:'#D97706'},{label:'진행',data:progD,color:'#1E3A5F'},{label:'완료',data:doneD,color:'#059669'}]);

  // Chart 2: 납기 준수율 → 이제 Row1 가운데로 이동됨 (Chart 5 위치 유지)

  // Chart 3: 최근 30일 일별 생산량
  var dayLabels=[],dayData=[];
  var today=new Date();
  for(var di=29;di>=0;di--){
    var dd=new Date(today);dd.setDate(dd.getDate()-di);
    var ds=dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');
    // 7일 간격으로만 레이블 표시
    dayLabels.push(di===29||di===0||(di%7===0)?((dd.getMonth()+1)+'/'+dd.getDate()):'');
    var sum=0;allHs.forEach(function(h){if(h.doneAt&&h.doneAt.startsWith(ds))sum+=(+h.qty||0);});
    dayData.push(sum);
  }
  drawLineChart('chartDaily',dayLabels,dayData,'#1E3A5F');

  // Chart 4: 미출고 잔량 (납기 임박순)
  var pendingOs=os.filter(function(o){return o.status!=='출고완료'&&o.status!=='취소'&&o.sd});
  pendingOs.sort(function(a,b){return(a.sd||'').localeCompare(b.sd||'')});
  var pendingOs6=pendingOs.slice(0,8);
  var pendingLabels=pendingOs6.map(function(o){
    var dl=dLeft(o);
    var suffix=dl<0?'('+Math.abs(dl)+'일 초과)':dl===0?'(오늘)':'(D-'+dl+')';
    return o.cnm.slice(0,6)+' '+suffix;
  });
  var pendingData=pendingOs6.map(function(o){return o.fq||0});
  var pendingColors=pendingOs6.map(function(o){
    var dl=dLeft(o);
    return dl<0?'#DC2626':dl<=3?'#D97706':'#1E3A5F';
  });
  drawHBarChart('chartPending',pendingLabels,pendingData,pendingColors);

  // Chart 4b: 거래처별 수주량 (이번 달)
  var cliQty = {};
  monthOs.forEach(function(o) {
    if(o.status === '취소') return;
    if(!cliQty[o.cnm]) cliQty[o.cnm] = 0;
    cliQty[o.cnm] += (o.fq || 0);
  });
  var cliLabels = Object.keys(cliQty).sort(function(a,b){ return cliQty[b] - cliQty[a]; }).slice(0, 6);
  var cliData = cliLabels.map(function(c){ return cliQty[c]; });
  var cliColors = ['#1E3A5F','#059669','#D97706','#DC2626','#7C3AED','#EC4899'];
  drawHBarChart('chartClient', cliLabels, cliData, cliColors);

  // Chart 5: 납기 준수율 (이번 달 기준)
  var totalDone = monthOs.filter(function(o){ return o.status==='완료' || o.status==='출고완료'; }).length;
  var onTime = monthOs.filter(function(o){
    if(o.status!=='완료' && o.status!=='출고완료') return false;
    var lastT2 = '';
    if(o.procs) o.procs.forEach(function(p){ if(p.t2 && p.t2 > lastT2) lastT2 = p.t2; });
    // t2 없으면 compDate 사용, 그것도 없으면 출고일(sd)로 간주
    if(!lastT2) lastT2 = o.compDate ? (o.compDate+'T00:00:00') : '';
    if(!lastT2) return false; // 완료 날짜 정보 없으면 납기 준수 불명 → 미준수 처리
    return lastT2.slice(0,10) <= (o.sd||'9999-99-99');
  }).length;
  var deliveryRate = totalDone > 0 ? Math.round(onTime / totalDone * 100) : 0;
  var gaugeColor = deliveryRate >= 90 ? '#059669' : deliveryRate >= 70 ? '#D97706' : '#DC2626';
  drawGaugeChart('chartDelivery', deliveryRate, td().slice(0,7).replace('-','년 ')+'월 납기 준수율', gaugeColor);

  // Chart 6: 이번 달 vs 전달 비교
  var _curM=td().slice(0,7);
  var selDate=new Date(_curM+'-01');
  var prevDate2=new Date(selDate.getFullYear(),selDate.getMonth()-1,1);
  var prevMonth2=prevDate2.getFullYear()+'-'+String(prevDate2.getMonth()+1).padStart(2,'0');
  var thisQty=0,prevQty=0;
  allHs.forEach(function(h){
    if(!h.doneAt)return;
    var m=h.doneAt.slice(0,7);
    if(m===_curM)thisQty+=(+h.qty||0);
    else if(m===prevMonth2)prevQty+=(+h.qty||0);
  });
  var monthLabels=[(prevDate2.getMonth()+1)+'월',(selDate.getMonth()+1)+'월'];
  drawBarChart('chartMonthly', monthLabels, [
    {label:'생산량', data:[prevQty, thisQty], color:'#1E3A5F'}
  ]);

  // Chart 7: 공정별 작업 품목 현황
  var procItems = {};
  os.forEach(function(o){
    if(o.status==='취소')return;
    if(!o.procs)return;
    o.procs.forEach(function(p){
      if(!procItems[p.nm])procItems[p.nm]=0;
      procItems[p.nm]++;
    });
  });
  var effLabels = Object.keys(procItems);
  var effData = effLabels.map(function(p){return procItems[p]});
  var effPairs = effLabels.map(function(l,i){return{l:l,d:effData[i]}}).sort(function(a,b){return b.d-a.d});
  effLabels = effPairs.map(function(p){return p.l});
  effData = effPairs.map(function(p){return p.d});
  var effColors = effLabels.map(function(l){
    var icons = {'인쇄':'#1E3A5F','코팅':'#7B61FF','합지':'#F59E0B','톰슨':'#EF4444','접착':'#10B981','외주가공':'#9333EA'};
    return icons[l] || '#64748B';
  });
  drawHBarChart('chartEfficiency', effLabels, effData, effColors);
}

// ===== 월별 대시보드 =====
var _dashMonth=td().slice(0,7);
function saveMonthlyReport(month){
  var allOs=DB.g('wo');
  // 납기일 또는 수주일이 해당 월인 WO
  var os=allOs.filter(function(o){return (o.dt&&o.dt.startsWith(month))||(o.sd&&o.sd.startsWith(month));});
  var hs=DB.g('hist').filter(function(h){return h.doneAt&&h.doneAt.startsWith(month);});
  if(!os.length&&!hs.length)return;
  var done=os.filter(function(o){return o.status==='완료'||o.status==='출고완료';});
  var onTime=done.filter(function(o){
    var lt='';if(o.procs)o.procs.forEach(function(p){if(p.t2&&p.t2>lt)lt=p.t2;});
    if(!lt)lt=o.compDate?o.compDate+'T00:00:00':'';
    if(!lt)return false;
    return lt.slice(0,10)<=(o.sd||'9999');
  }).length;
  var byClient={};os.forEach(function(o){if(!byClient[o.cnm])byClient[o.cnm]=0;byClient[o.cnm]+=(+o.fq||0);});
  var byProc={};hs.forEach(function(h){if(!byProc[h.proc])byProc[h.proc]=0;byProc[h.proc]+=(+h.qty||0);});
  var totalProd=hs.reduce(function(s,h){return s+(+h.qty||0);},0);
  var report={
    month:month,savedAt:nw(),
    totalWO:os.length,completedWO:done.length,
    inProgress:os.filter(function(o){return o.status==='진행중';}).length,
    totalProduction:totalProd,
    deliveryRate:done.length>0?Math.round(onTime/done.length*100):0,
    byClient:byClient,byProc:byProc,
    woList:os.map(function(o){return{id:o.id,wn:o.wn,cnm:o.cnm,pnm:o.pnm,fq:o.fq,sd:o.sd,status:o.status,dt:o.dt};})
  };
  var rpts=DB.g('monthlyRpt');
  var idx=rpts.findIndex(function(r){return r.month===month;});
  if(idx>=0)rpts[idx]=report;else rpts.unshift(report);
  rpts.sort(function(a,b){return b.month.localeCompare(a.month);});
  DB.s('monthlyRpt',rpts);
}

// ===== hist 백필: pqDone 없이 생성된 WO의 완료 공정 이력 자동 복원 =====
function backfillHist(){
  var hs=DB.g('hist');
  var os=DB.g('wo');
  // hist 키 셋 (woId+proc 조합으로 중복 방지)
  var hsSet={};
  hs.forEach(function(h){hsSet[(h.woId||'')+'|'+(h.proc||'')]=true;});
  var newHist=[];
  var woChanged=false;
  os.forEach(function(o){
    if(!o.procs)return;
    o.procs.forEach(function(p){
      if(p.st!=='완료'&&p.st!=='외주완료')return;
      var key=o.id+'|'+p.nm;
      if(hsSet[key])return; // 이미 hist 있으면 스킵
      var qty=+p.qty||+o.fq||0;
      if(!qty)return;
      // 완료일: p.t2 > o.compDate > o.dt > 오늘
      var doneDate=p.t2?p.t2.slice(0,10):(o.compDate||(o.dt&&o.dt.slice(0,10))||td());
      // p.t2가 없으면 WO 생성일로 채움 (납기 준수율 계산 기준)
      if(!p.t2&&doneDate){p.t2=doneDate+'T00:00:00';woChanged=true;}
      newHist.push({id:gid(),woId:o.id,pnm:o.pnm,cnm:o.cnm,proc:p.nm,worker:'관리자',qty:qty,t1:p.t1,t2:p.t2,doneAt:doneDate+'T00:00:00'});
      hsSet[key]=true;
    });
  });
  if(woChanged)DB.s('wo',os);
  if(newHist.length>0){
    var merged=DB.g('hist').concat(newHist);
    DB.s('hist',merged);
    addLog('생산이력 자동복원: '+newHist.length+'건');
  }
}

// CSS 기반 원형 게이지 (conic-gradient)
function _ndSvgGauge(pct,label){
  if(pct<0)pct=0;if(pct>100)pct=100;
  var color=pct>=80?'#059669':pct>=50?'#D97706':'#DC2626';
  return '<div class="nd-gauge-v2">'
    +'<div class="nd-gauge-title">'+label+'</div>'
    +'<div class="nd-gauge-circle" style="background:conic-gradient('+color+' 0% '+pct+'%, #E9EDF2 '+pct+'% 100%)">'
    +'<div class="nd-gauge-inner"><div class="nd-gauge-val" style="color:'+color+'">'+pct+'<span style="font-size:14px">%</span></div></div>'
    +'</div></div>';
}
// CSS flex 기반 막대 차트
function _ndAreaChart(dailyData,labels){
  var maxV=Math.max.apply(null,dailyData);if(maxV===0)maxV=1;
  var h='<div class="nd-bars">';
  dailyData.forEach(function(v,i){
    var pct=Math.round(v/maxV*100);
    var isToday=(i===dailyData.length-1);
    var barColor=isToday?'#059669':'#1E3A5F';
    h+='<div class="nd-bar-col">';
    h+='<div class="nd-bar-val">'+(v>0?(v>=1000?Math.round(v/100)/10+'k':v):'')+'</div>';
    h+='<div class="nd-bar-track"><div class="nd-bar-fill" style="height:'+Math.max(pct,v>0?4:0)+'%;background:'+barColor+'"></div></div>';
    h+='<div class="nd-bar-lbl" style="color:'+(isToday?'#059669':'#94A3B8')+';font-weight:'+(isToday?'700':'500')+'">'+labels[i]+'</div>';
    h+='</div>';
  });
  h+='</div>';
  return h;
}
// CSS conic-gradient 원형 링 (공정 파이프라인용)
function _ndPipeRing(pct){
  if(pct<0)pct=0;if(pct>100)pct=100;
  return '<div class="nd-pipe-ring-v2" style="background:conic-gradient(#1E3A5F 0% '+pct+'%, #E9EDF2 '+pct+'% 100%)"><div class="nd-pipe-ring-inner"></div></div>';
}
function rDash(){
var _now=new Date(),_days=['일','월','화','수','목','금','토'];
if($('dashDateDisp'))$('dashDateDisp').textContent=_now.getFullYear()+'.'+String(_now.getMonth()+1).padStart(2,'0')+'.'+String(_now.getDate()).padStart(2,'0')+' ('+_days[_now.getDay()]+')';
var allOs=DB.g('wo');
var os=allOs.filter(function(o){return o.status!=='취소'});
var tot=os.length,dn=os.filter(function(o){return o.status==='완료'||o.status==='출고완료'||o.status==='완료대기'}).length;
var pg=os.filter(function(o){return o.status==='진행중'}).length;
var dl=os.filter(function(o){return isLate(o)}).length;
var rate=tot>0?Math.round(dn/tot*100):0;
var hold=os.filter(function(o){return o.status==='보류'}).length;
var rework=os.filter(function(o){return o.status==='재작업'}).length;
var allHs=DB.g('hist');
var now=new Date();
var curM=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
var prevD2=new Date(now.getFullYear(),now.getMonth()-1,1);
var prevM=prevD2.getFullYear()+'-'+String(prevD2.getMonth()+1).padStart(2,'0');
var curQ=0,prevQ=0;
allHs.forEach(function(h){if(!h.doneAt)return;if(h.doneAt.startsWith(curM))curQ+=(+h.qty||0);if(h.doneAt.startsWith(prevM))prevQ+=(+h.qty||0)});
// === 1. 근무 진행률 ===
var shiftStart=8,shiftEnd=18,curHour=now.getHours()+now.getMinutes()/60;
var shiftPct=Math.max(0,Math.min(100,Math.round((curHour-shiftStart)/(shiftEnd-shiftStart)*100)));
var curTime=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
if($('ndShift'))$('ndShift').innerHTML='<div class="nd-shift"><div class="nd-shift-title">오늘 근무 진행률 ('+String(shiftStart).padStart(2,'0')+':00 ~ '+String(shiftEnd).padStart(2,'0')+':00)</div>'
  +'<div class="nd-shift-track"><div class="nd-shift-fill" style="width:'+shiftPct+'%"></div><div class="nd-shift-target" style="left:75%"></div></div>'
  +'<div class="nd-shift-labels"><span>'+String(shiftStart).padStart(2,'0')+':00 시작</span><span style="color:#1E3A5F;font-weight:700">현재 '+curTime+' ('+shiftPct+'%)</span><span>'+String(shiftEnd).padStart(2,'0')+':00 종료</span></div></div>';
// === 2. KPI 카드 ===
var prevTot=0,prevDn=0,prevDl=0,prevHold=0;
allOs.forEach(function(o){if(o.status==='취소')return;var cd=o.cd||'';if(!cd.startsWith(prevM))return;prevTot++;if(o.status==='완료'||o.status==='출고완료')prevDn++;if(o.status==='보류'||o.status==='재작업')prevHold++});
function _delta(cur,prev){if(prev===0&&cur===0)return{cls:'flat',txt:'— 동일'};if(prev===0)return{cls:'up',txt:'▲ '+cur+'건 증가'};var d=cur-prev;if(d>0)return{cls:'up',txt:'▲ '+d+'건 증가'};if(d<0)return{cls:'down',txt:'▼ '+Math.abs(d)+'건 증가'};return{cls:'flat',txt:'— 동일'}}
var prodDelta=prevQ>0?{cls:curQ>=prevQ?'up':'down',txt:(curQ>=prevQ?'▲':'▼')+' '+Math.abs(Math.round((curQ-prevQ)/prevQ*100))+'% '+(curQ>=prevQ?'개선':'감소')}:{cls:'flat',txt:'— 비교없음'};
var kpis=[
  {val:tot,label:'전체 작업',cls:'nd-navy',icon:'📦',delta:_delta(tot,prevTot),filter:'all',spark:false},
  {val:pg,label:'진행중',cls:'nd-navy',icon:'⚡',delta:{cls:'flat',txt:'— 동일'},filter:'ing',spark:false},
  {val:dn,label:'완료 '+rate+'%',cls:'nd-green',icon:'✅',delta:prodDelta,filter:'done',spark:true},
  {val:dl,label:'출고 지연',cls:'nd-red',icon:'🚨',delta:_delta(dl,0),filter:'late',spark:false},
  {val:hold+rework,label:'보류/재작업',cls:'nd-red',icon:'⏸️',delta:_delta(hold+rework,prevHold),filter:'hold',spark:false}
];
if($('ndKpi'))$('ndKpi').innerHTML=kpis.map(function(k){
  var h='<div class="nd-kpi-card '+k.cls+'" onclick="openPlanFilter(\''+k.filter+'\')">';
  h+='<div class="nd-kpi-icon">'+k.icon+'</div>';
  h+='<div class="nd-kpi-num">'+k.val+'</div>';
  h+='<div class="nd-kpi-label">'+k.label+'</div>';
  h+='<div class="nd-kpi-delta '+k.delta.cls+'">'+k.delta.txt+'</div>';
  if(k.spark){
    var days7=[];for(var di=6;di>=0;di--){var dd=new Date(now);dd.setDate(dd.getDate()-di);var dm=dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');var dq=0;allHs.forEach(function(hh){if(hh.doneAt&&hh.doneAt.startsWith(dm))dq+=(+hh.qty||0)});days7.push(dq)}
    var mx=Math.max.apply(null,days7);if(mx===0)mx=1;
    h+='<div class="nd-kpi-spark-v2">';
    days7.forEach(function(v,i){
      var pct=Math.max(Math.round(v/mx*100),v>0?8:0);
      h+='<span class="nd-kpi-spark-bar" style="height:'+pct+'%;opacity:'+(0.4+(i/6)*0.6)+'"></span>';
    });
    h+='</div>';
  }
  h+='</div>';return h;
}).join('');
// === 3. 게이지 + 면적 차트 ===
var oeeOs=os.filter(function(o){return o.status==='진행중'||o.status==='완료'||o.status==='출고완료'});
var oeePct=tot>0?Math.round(oeeOs.length/tot*100):0;
var qualHs=allHs.filter(function(h){return h.doneAt&&h.doneAt.startsWith(curM)});
var qualTotal=0,qualDef=0;qualHs.forEach(function(h){qualTotal+=(+h.qty||0);qualDef+=(+h.defect||0)});
var qualPct=qualTotal>0?Math.round((qualTotal-qualDef)/qualTotal*100):100;
var days7Data=[],days7Labels=[];
for(var di=6;di>=0;di--){var dd=new Date(now);dd.setDate(dd.getDate()-di);var dm=dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0');var dq=0;allHs.forEach(function(h){if(h.doneAt&&h.doneAt.startsWith(dm))dq+=(+h.qty||0)});days7Data.push(dq);days7Labels.push((dd.getMonth()+1)+'/'+dd.getDate())}
days7Labels[6]='오늘';
var gaugeH=_ndSvgGauge(oeePct,'설비가동률');
gaugeH+=_ndSvgGauge(rate,'생산 달성률');
gaugeH+=_ndSvgGauge(qualPct,'품질 합격률');
gaugeH+='<div class="nd-area"><div class="nd-area-header"><div class="nd-area-title">일별 생산량 추이</div><div style="font-size:10px;color:#94A3B8;font-weight:600">최근 7일</div></div>';
gaugeH+=_ndAreaChart(days7Data,days7Labels);
gaugeH+='</div>';
if($('ndGaugeRow'))$('ndGaugeRow').innerHTML=gaugeH;
// === 4. 공정 파이프라인 ===
var pns2=getProcNames();
var pipH='<div class="nd-pipe"><div class="nd-pipe-title">공정 파이프라인</div><div class="nd-pipe-row">';
pns2.forEach(function(pn,idx){
  var w=0,k=0,d=0;
  if(pn==='생산완료'){os.forEach(function(o){if(o.status==='출고완료'||o.status==='취소')return;if(o.status==='완료'||o.status==='완료대기')d++})}
  else{var pq=getProcQueue(pn);w=pq.wait.length;k=pq.ing.length;d=pq.done.length}
  var tt=w+k+d,pct=tt>0?Math.round(d/tt*100):0;
  var isDone=pn==='생산완료'||pct===100;
  pipH+='<div class="nd-pipe-step" onclick="showProcDet(\''+pn+'\')">';
  pipH+='<div class="nd-pipe-circle"'+(isDone?' style="background:#ECFDF5;color:#059669"':'')+'>'+_ndPipeRing(pct)+'<span class="nd-pipe-num">'+(isDone?'✓':String(w+k))+'</span></div>';
  pipH+='<div class="nd-pipe-name"'+(isDone?' style="color:#059669;font-weight:800"':'')+'>'+pn+'</div>';
  pipH+='<div class="nd-pipe-tags">';
  if(w>0)pipH+='<span style="background:#FEF3C7;color:#92400E">'+w+'</span>';
  if(k>0)pipH+='<span style="background:#E0F2FE;color:#1E3A5F">'+k+'</span>';
  if(d>0)pipH+='<span style="background:#E9EDF2;color:#475569">'+d+'</span>';
  if(tt===0)pipH+='<span style="background:#F5F7FA;color:#94A3B8">0</span>';
  pipH+='</div></div>';
  if(idx<pns2.length-1)pipH+='<div class="nd-pipe-arrow">→</div>';
});
pipH+='</div></div>';
if($('ndPipeline'))$('ndPipeline').innerHTML=pipH;
// === 5. 실시간 알림 ===
var feeds=[];
if(dl>0)os.filter(function(o){return isLate(o)}).slice(0,2).forEach(function(o){feeds.push({cls:'nd-f-red',icon:'🚨',msg:o.pnm+' — 출고일 초과 (D+'+(Math.abs(dLeft(o)))+')',time:''})});
var maxWait2='',maxWC2=0;
pns2.forEach(function(pn){if(pn==='생산완료')return;var pq=getProcQueue(pn);if(pq.wait.length>maxWC2){maxWC2=pq.wait.length;maxWait2=pn}});
if(maxWC2>=3)feeds.push({cls:'nd-f-red',icon:'⚠️',msg:maxWait2+' 공정 대기 '+maxWC2+'건 — 병목 주의',time:''});
var recentDone=allHs.filter(function(h){return h.doneAt&&h.doneAt.startsWith(td())}).slice(0,3);
recentDone.forEach(function(h){feeds.push({cls:'nd-f-green',icon:'✅',msg:(h.pnm||'')+ ' — '+(h.proc||'')+' 완료'+(h.qty?' ('+h.qty+'매)':''),time:h.doneAt?h.doneAt.slice(11,16):''})});
var recentLogs=DB.g('logs').slice(0,3);
recentLogs.forEach(function(l){if(feeds.length<6)feeds.push({cls:'nd-f-navy',icon:'📋',msg:l.m,time:l.t?l.t.slice(11,16):''})});
if(feeds.length===0)feeds.push({cls:'nd-f-green',icon:'✅',msg:'현재 특이사항 없음',time:''});
var fdH='<div class="nd-feed"><div class="nd-feed-title">실시간 알림 <span style="font-size:11px;color:var(--txt2);font-weight:400">(최근 5건)</span></div>';
fdH+='<div style="max-height:220px;overflow-y:auto">';
feeds.slice(0,5).forEach(function(f){fdH+='<div class="nd-feed-item '+f.cls+'">'+f.icon+' '+f.msg+(f.time?'<div class="nd-feed-time">'+f.time+'</div>':'')+'</div>'});
fdH+='</div></div>';
if($('ndFeed'))$('ndFeed').innerHTML=fdH;
// === 완료 확인 대기 (기존 유지) ===
var compWait=os.filter(function(o){return o.status==='완료대기'});
if(compWait.length){
var cwH='<div style="max-height:200px;overflow-y:auto">';compWait.slice(0,5).forEach(function(o){
var lastQty=0;for(var _i=o.procs.length-1;_i>=0;_i--){if(o.procs[_i].qty>0){lastQty=o.procs[_i].qty;break}}
cwH+='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin-bottom:4px;background:var(--bg2);border-radius:var(--r-sm)">';
cwH+='<div style="display:flex;align-items:center;gap:10px;flex:1">';
cwH+='<span style="font-weight:700;font-size:13px;color:var(--txt)">'+o.pnm+'</span>';
cwH+='<span style="font-size:12px;color:var(--txt2)">'+o.cnm+'</span>';
cwH+='<span style="font-size:12px;color:var(--suc);font-weight:600">전 공정 완료</span>';
cwH+='<span style="font-size:12px;color:var(--txt);font-weight:600">수량: '+(lastQty||'-')+'</span>';
cwH+='</div><span class="tag tag-orange">확인대기</span></div>';
});
cwH+='</div>';
$('dCompleteList').innerHTML=cwH;$('dCompleteCount').textContent=compWait.length+'건';$('dCompleteSection').style.display='';
}else{$('dCompleteSection').style.display='none'}
genNotifications();renderCal();populateVendorDropdowns();backfillHist();
}
// Outsource status change
function chgOutSt(woId,pi,newSt){const os=DB.g('wo');const oi=os.findIndex(o=>o.id===woId);if(oi<0)return;os[oi].procs[pi].st=newSt;if(newSt==='외주완료'){os[oi].procs[pi].t2=nw();const allDone=os[oi].procs.every(x=>x.st==='완료'||x.st==='외주완료'||x.st==='스킵');if(allDone)os[oi].status='완료'}if(newSt==='외주대기')os[oi].procs[pi].t1=nw();DB.s('wo',os);addLog(`외주상태변경: ${os[oi].pnm} ${os[oi].procs[pi].nm} → ${newSt}`);rDash();if(typeof rPlan==='function')rPlan();if(typeof rWOList==='function')rWOList();if(typeof rWQ==='function')rWQ();if(typeof updateShipBadge==='function')updateShipBadge();toast('상태 변경','ok')}
// === 입고확인 (관리자 전용) ===
var _incItem=null;
function openIncoming(woId,pi){
  var o=DB.g('wo').find(x=>x.id===woId);if(!o)return;
  var p=o.procs[pi];_incItem={woId:woId,pi:pi};
  var h='<div style="padding:16px">';
  h+='<div style="font-size:13px;color:#64748B;margin-bottom:12px">'+o.cnm+' | '+o.pnm+' | '+(p.vd||'자체')+'</div>';
  h+='<div style="display:flex;gap:8px;align-items:end">';
  h+='<div class="fg" style="flex:1"><label style="font-weight:700;font-size:12px">입고 수량</label><input type="number" id="incQty2" value="'+(o.qty||o.qm||0)+'" min="0" style="padding:10px;font-size:16px;font-weight:700;border:2px solid var(--pri);border-radius:8px"></div>';
  h+='<input type="hidden" id="incDefect2" value="0"><input type="hidden" id="incNote2" value=""><input type="radio" name="incResult2" value="합격" checked style="display:none">';
  h+='<button onclick="confirmIncoming()" style="padding:10px 24px;font-size:14px;font-weight:700;background:#1E3A5F;color:#fff;border:none;border-radius:8px;cursor:pointer;height:44px;white-space:nowrap">입고</button>';
  h+='</div></div>';
  // 모달 생성
  var mo=document.getElementById('incomingMo');
  if(!mo){mo=document.createElement('div');mo.id='incomingMo';mo.className='cm hidden';mo.onclick=function(e){if(e.target===mo)cMo('incomingMo')};mo.innerHTML='<div class="cmb" style="width:520px"><div class="mh"><h3>입고 확인</h3><button class="mc" onclick="cMo(\'incomingMo\')">&times;</button></div><div id="incContent"></div></div>';document.body.appendChild(mo)}
  $('incContent').innerHTML=h;mo.classList.remove('hidden');
}
function doIncome(){
  // Legacy stub - incomeMo is opened by openIncoming() dynamically
  // Delegate to confirmIncoming if _incItem is set
  confirmIncoming();
}
function confirmIncoming(){
  if(!_incItem){toast('입고 정보 없음','err');return}
  var qtyEl=document.getElementById('incQty2');
  var defEl=document.getElementById('incDefect2');
  var noteEl=document.getElementById('incNote2');
  var resultEl=document.querySelector('input[name="incResult2"]:checked');
  if(!qtyEl){toast('수량 입력란을 찾을 수 없습니다','err');return}
  var qty=+qtyEl.value;if(!qty||qty<=0){toast('입고수량을 입력하세요','err');qtyEl.focus();return}
  var defect=defEl?(+defEl.value||0):0;
  var result=resultEl?resultEl.value:'합격';
  var note=noteEl?noteEl.value:'';
  var os=DB.g('wo');var oi=os.findIndex(o=>o.id===_incItem.woId);if(oi<0)return;
  var o=os[oi],p=o.procs[_incItem.pi];
  // 입고 기록 저장
  var incLog=DB.g('incLog');
  incLog.push({id:gid(),woId:o.id,wn:o.wn||o.num,cnm:o.cnm,pnm:o.pnm,proc:p.nm,vendor:p.vd||'',qty:qty,defect:defect,good:qty-defect,result:result,note:note,dt:td(),tm:nw(),mgr:CU?CU.nm:''});
  DB.s('incLog',incLog);
  // 공정 완료 처리
  p.st='외주완료';p.t2=nw();p.qty=qty;p.df=defect;
  // 불합격이면 보류
  if(result==='불합격'){o.status='보류';toast('불합격 → 보류 처리','err')}
  else{
    // 다음 공정 대기열로 이동
    var nextIdx=-1;
    for(var ni=_incItem.pi+1;ni<o.procs.length;ni++){
      if(o.procs[ni].st==='대기'){nextIdx=ni;break}
    }
    if(nextIdx>=0){
      o.procs[nextIdx].st='대기'; // 이미 대기지만 명시적으로
      o.status='진행중';
      toast('→ 다음 공정: '+o.procs[nextIdx].nm+' 대기열 등록','ok');
    } else {
      var allDone=o.procs.every(x=>x.st==='완료'||x.st==='외주완료'||x.st==='스킵');
      if(allDone){o.status='완료대기';o.compDate=new Date().toISOString().slice(0,10)}
    }
  }
  DB.s('wo',os);
  addLog('입고확인: '+o.pnm+' '+p.nm+' ('+p.vd+') '+qty+'매 / '+result);
  cMo('incomingMo');rDash();if(typeof rPlan==='function')rPlan();if(typeof rWOList==='function')rWOList();if(typeof rWQ==='function')rWQ();if(typeof rShipReady==='function')rShipReady();if(typeof updateShipBadge==='function')updateShipBadge();
  toast('입고 완료 → 다음 공정 대기열 등록','ok');
}

// Calendar
function renderCal(){var now=new Date();var y=now.getFullYear(),m=now.getMonth();var first=new Date(y,m,1).getDay();var last=new Date(y,m+1,0).getDate();var os=DB.g('wo');var h='<div class="wcal-header"><div class="wcal-title">'+y+'년 '+(m+1)+'월</div></div>';h+='<div class="wcal-grid">';var dayNames=['일','월','화','수','목','금','토'];dayNames.forEach(function(d,i){h+='<div class="wcal-day-hd'+(i===0?' wcal-sun':'')+(i===6?' wcal-sat':'')+'">'+d+'</div>'});for(var e=0;e<first;e++)h+='<div class="wcal-cell wcal-empty"></div>';for(var d=1;d<=last;d++){var ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');var isT=ds===td();var dow=new Date(y,m,d).getDay();var cellCls='wcal-cell'+(isT?' wcal-today':'')+(dow===0?' wcal-sun':'')+(dow===6?' wcal-sat':'');h+='<div class="'+cellCls+'">';h+='<div class="wcal-num">'+d+'</div>';var ships=os.filter(function(o){return o.sd===ds&&o.status!=='출고완료'});ships.slice(0,2).forEach(function(o){var isLt=o.sd&&o.sd<td()&&o.status!=='완료';h+='<div class="wcal-chip'+(isLt?' wc-late':' wc-ship')+'" onclick="showDet(\''+o.id+'\')" title="'+o.cnm+' '+o.pnm+'">'+o.cnm.slice(0,4)+'</div>'});var starts=os.filter(function(o){return o.dt===ds});starts.slice(0,1).forEach(function(o){h+='<div class="wcal-chip wc-start" onclick="showDet(\''+o.id+'\')" title="'+o.pnm+'">'+o.pnm.slice(0,5)+'</div>'});var dones=os.filter(function(o){return o.compDate===ds});dones.slice(0,1).forEach(function(o){h+='<div class="wcal-chip wc-done" title="'+o.pnm+'">'+o.pnm.slice(0,5)+'</div>'});if(ships.length>2)h+='<div style="font-size:9px;color:var(--txt3);text-align:center">+'+(ships.length-2)+'건</div>';h+='</div>'}h+='</div>';$('dCal').innerHTML=h}

/* ===== 현장모니터 ===== */
var _monTimer=null;
function rMonitor(){
  // 시계
  var now=new Date();
  var ck=$('monClock');if(ck)ck.textContent=now.toLocaleTimeString('ko-KR');
  // 자동 갱신 (30초)
  if(_monTimer)clearInterval(_monTimer);
  _monTimer=setInterval(function(){rMonitor()},30000);

  var wos=DB.g('wo');
  var active=wos.filter(function(o){return o.status==='진행중'});
  var waiting=wos.filter(function(o){return o.status==='대기'||o.status==='계획'});
  var done=wos.filter(function(o){return o.status==='완료'||o.status==='출고완료'});
  var late=wos.filter(function(o){return o.sd&&o.sd<td()&&o.status!=='완료'&&o.status!=='출고완료'});

  // 요약 카드
  var sh=$('monSummary');
  if(sh) sh.innerHTML=
    '<div class="sb blue"><div class="l">진행중</div><div class="v" style="font-size:32px">'+active.length+'</div></div>'+
    '<div class="sb orange"><div class="l">대기</div><div class="v" style="font-size:32px">'+waiting.length+'</div></div>'+
    '<div class="sb '+(late.length>0?'red':'green')+'"><div class="l">납기지연</div><div class="v" style="font-size:32px">'+late.length+'</div></div>'+
    '<div class="sb green"><div class="l">금일완료</div><div class="v" style="font-size:32px">'+done.filter(function(o){return o.compDate===td()}).length+'</div></div>';

  // 공정별 현황 카드
  var procNames=['인쇄','코팅','톰슨','접착','검사'];
  var ph=$('monProcs');
  if(ph){
    var html='';
    procNames.forEach(function(pn){
      var inProc=active.filter(function(o){
        if(!o.procs)return false;
        var cur=null;
        for(var i=0;i<o.procs.length;i++){
          if(!o.procs[i].qty||o.procs[i].qty<o.fq){cur=o.procs[i];break}
        }
        return cur&&cur.nm===pn;
      });
      var totalQty=inProc.reduce(function(s,o){return s+o.fq},0);
      var doneQty=inProc.reduce(function(s,o){
        var p=o.procs.find(function(x){return x.nm===pn});
        return s+(p?p.qty||0:0);
      },0);
      var pct=totalQty>0?Math.round(doneQty/totalQty*100):0;
      var color=pct>=80?'#10B981':pct>=40?'#F59E0B':'#6B7280';
      html+='<div style="background:#fff;border-radius:12px;padding:16px;border:1px solid #E5E7EB;box-shadow:0 1px 3px rgba(0,0,0,.04)">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
        +'<span style="font-size:16px;font-weight:800;color:var(--pri)">'+pn+'</span>'
        +'<span style="font-size:20px;font-weight:900;color:'+color+'">'+inProc.length+'건</span></div>'
        +'<div style="background:#E5E7EB;border-radius:6px;height:10px;overflow:hidden;margin-bottom:8px">'
        +'<div style="width:'+pct+'%;height:100%;background:'+color+';border-radius:6px;transition:width .3s"></div></div>'
        +'<div style="display:flex;justify-content:space-between;font-size:11px;color:#6B7280">'
        +'<span>완료 '+fmt(doneQty)+'</span><span>목표 '+fmt(totalQty)+'</span></div>';
      // 각 공정 내 작업 리스트 (최대 3개)
      if(inProc.length>0){
        html+='<div style="margin-top:8px;border-top:1px solid #F3F4F6;padding-top:6px">';
        inProc.slice(0,3).forEach(function(o){
          var isLate=o.sd&&o.sd<td();
          html+='<div style="font-size:11px;padding:3px 0;display:flex;justify-content:space-between">'
            +'<span style="font-weight:600;'+(isLate?'color:#EF4444':'')+'">'+(o.cnm||'').slice(0,6)+'</span>'
            +'<span style="color:#6B7280">'+(o.pnm||'').slice(0,8)+' '+fmt(o.fq)+'</span></div>';
        });
        if(inProc.length>3) html+='<div style="font-size:10px;color:#94A3B8;text-align:center">+'+(inProc.length-3)+'건 더</div>';
        html+='</div>';
      }
      html+='</div>';
    });
    ph.innerHTML=html;
  }

  // 진행중 작업 테이블
  var tbl=$('monWOTbl');
  if(tbl){
    tbl.querySelector('tbody').innerHTML=active.sort(function(a,b){
      if(a.sd&&b.sd)return a.sd>b.sd?1:-1;return 0;
    }).map(function(o){
      // 현재 공정 찾기
      var curProc='-';var pct=0;
      if(o.procs&&o.procs.length){
        var totalSteps=o.procs.length;var doneSteps=0;
        for(var i=0;i<o.procs.length;i++){
          if(o.procs[i].qty>=o.fq){doneSteps++}else{curProc=o.procs[i].nm;break}
        }
        if(doneSteps===totalSteps)curProc='완료';
        pct=Math.round(doneSteps/totalSteps*100);
      }
      var isLate=o.sd&&o.sd<td();
      var barColor=pct>=80?'#10B981':pct>=40?'#F59E0B':'#3B82F6';
      return '<tr'+(isLate?' style="background:#FEF2F2"':'')+'>'
        +'<td style="font-weight:700">'+o.wn+'</td><td>'+o.cnm+'</td><td>'+o.pnm+'</td>'
        +'<td style="text-align:right">'+fmt(o.fq)+'</td>'
        +'<td style="font-weight:700;color:var(--pri)">'+curProc+'</td>'
        +'<td><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;background:#E5E7EB;border-radius:4px;height:8px;overflow:hidden">'
        +'<div style="width:'+pct+'%;height:100%;background:'+barColor+';border-radius:4px"></div></div>'
        +'<span style="font-size:12px;font-weight:700;color:'+barColor+'">'+pct+'%</span></div></td>'
        +'<td'+(isLate?' style="color:#EF4444;font-weight:700"':'')+'>'+o.sd+(isLate?' ⚠':'')+'</td>'
        +'<td>'+(isLate?'<span class="bd bd-d">지연</span>':'<span class="bd bd-s">정상</span>')+'</td></tr>';
    }).join('')||'<tr><td colspan="8" class="empty-cell">진행중인 작업이 없습니다</td></tr>';
  }
}
function openMonitorFull(){
  var w=window.open('','_blank','width=1920,height=1080');
  var wos=DB.g('wo');
  var active=wos.filter(function(o){return o.status==='진행중'});
  var late=wos.filter(function(o){return o.sd&&o.sd<td()&&o.status!=='완료'&&o.status!=='출고완료'});
  var procNames=['인쇄','코팅','톰슨','접착','검사'];
  var procHTML='';
  procNames.forEach(function(pn){
    var inProc=active.filter(function(o){if(!o.procs)return false;for(var i=0;i<o.procs.length;i++){if(!o.procs[i].qty||o.procs[i].qty<o.fq)return o.procs[i].nm===pn}return false});
    var bg=inProc.length>0?'#1E3A5F':'#64748B';
    procHTML+='<div style="background:'+bg+';border-radius:16px;padding:24px;text-align:center">'
      +'<div style="font-size:24px;font-weight:900;margin-bottom:8px">'+pn+'</div>'
      +'<div style="font-size:48px;font-weight:900">'+inProc.length+'<span style="font-size:20px">건</span></div>'
      +'<div style="margin-top:12px;font-size:14px">';
    inProc.slice(0,4).forEach(function(o){procHTML+='<div style="padding:3px 0;opacity:0.9">'+o.cnm+' — '+o.pnm+'</div>'});
    procHTML+='</div></div>';
  });
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>현장 모니터</title>'
    +'<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0F172A;color:#fff;font-family:sans-serif;padding:32px}'
    +'</style></head><body>'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">'
    +'<div style="font-size:28px;font-weight:900">팩플로우 현장 모니터</div>'
    +'<div style="font-size:24px;font-weight:700;font-feature-settings:tnum">'+new Date().toLocaleString('ko-KR')+'</div></div>'
    +'<div style="display:flex;gap:16px;margin-bottom:24px">'
    +'<div style="flex:1;background:#1E40AF;border-radius:12px;padding:20px;text-align:center"><div style="font-size:16px">진행중</div><div style="font-size:48px;font-weight:900">'+active.length+'</div></div>'
    +'<div style="flex:1;background:'+(late.length>0?'#DC2626':'#059669')+';border-radius:12px;padding:20px;text-align:center"><div style="font-size:16px">납기지연</div><div style="font-size:48px;font-weight:900">'+late.length+'</div></div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:16px">'+procHTML+'</div>'
    +'<div style="margin-top:16px;font-size:10px;color:#64748B;text-align:center">30초마다 자동 새로고침 | 브라우저에서 F11로 전체화면</div>'
    +'<script>setInterval(function(){location.reload()},30000)<\/script>'
    +'</body></html>');
  w.document.close();
}

// WORK ORDER CRUD
