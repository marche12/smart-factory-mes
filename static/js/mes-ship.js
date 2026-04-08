// Ship history
var _shipPeriod='daily';
function setShipPeriod(p,btn){
  _shipPeriod=p;
  btn.parentElement.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
  var dc=$('shipDateCtrl'),rc=$('shipRangeCtrl');
  if(p==='range'){dc.style.display='none';rc.style.display='flex'}
  else if(p==='all'){dc.style.display='none';rc.style.display='none'}
  else{dc.style.display='flex';rc.style.display='none'}
  if(!$('shipDateVal').value)$('shipDateVal').value=td();
  rShipHist();
}
function shipDateNav(dir){
  var v=$('shipDateVal').value;if(!v)v=td();
  var d=new Date(v);
  if(_shipPeriod==='daily')d.setDate(d.getDate()+dir);
  else if(_shipPeriod==='weekly')d.setDate(d.getDate()+dir*7);
  else if(_shipPeriod==='monthly')d.setMonth(d.getMonth()+dir);
  $('shipDateVal').value=d.toISOString().slice(0,10);
  rShipHist();
}
function _getShipDateRange(){
  var p=_shipPeriod,v=$('shipDateVal').value||td();
  if(p==='all')return{from:null,to:null,label:'전체 기간'};
  if(p==='range'){
    var f=$('shHistFrom').value,t=$('shHistTo').value;
    return{from:f||null,to:t||null,label:(f||'')+'~'+(t||'')};
  }
  if(p==='daily')return{from:v,to:v,label:v};
  if(p==='weekly'){
    var ws=weekStart(v),we=weekEnd(v);
    return{from:ws,to:we,label:ws+' ~ '+we};
  }
  if(p==='monthly'){
    var ms=monthStart(v),me=monthEnd(v);
    var d=new Date(v+'T00:00:00');
    return{from:ms,to:me,label:d.getFullYear()+'년 '+(d.getMonth()+1)+'월'};
  }
  return{from:null,to:null,label:''};
}
function rShipHist(){
  if(!$('shipDateVal').value)$('shipDateVal').value=td();
  var range=_getShipDateRange();
  $('shipPeriodLabel').textContent=range.label;
  var f=range.from,t=range.to;
  var s=($('shHistSch')?.value||'').toLowerCase();
  var allLogs=DB.g('shipLog');
  var logs=allLogs.filter(function(r){
    if(f&&r.dt<f)return false;
    if(t&&r.dt>t)return false;
    if(s&&r.cnm.toLowerCase().indexOf(s)<0&&r.pnm.toLowerCase().indexOf(s)<0)return false;
    return true;
  }).sort(function(a,b){return b.dt>a.dt?1:-1});
  // 기간별 요약
  var ps=$('shipPeriodSum');
  if(_shipPeriod!=='all'&&f){
    var tQty=0,tDef=0;logs.forEach(function(r){tQty+=r.qty||0;tDef+=r.defect||0});
    ps.innerHTML='<div class="sg" style="margin-bottom:10px">'+
      '<div class="sb blue" style="text-align:center"><div class="v">'+logs.length+'</div><div class="l">출고건수</div></div>'+
      '<div class="sb green" style="text-align:center"><div class="v">'+fmt(tQty)+'</div><div class="l">총 출고량</div></div>'+
      '<div class="sb '+(tDef>0?'red':'')+'" style="text-align:center"><div class="v">'+fmt(tDef)+'</div><div class="l">불량</div></div>'+
      '<div class="sb orange" style="text-align:center"><div class="v">'+(tQty?((tDef/tQty)*100).toFixed(1):0)+'%</div><div class="l">불량률</div></div>'+
      '</div>';
  }else{ps.innerHTML=''}
  $('shipHistTbl').querySelector('tbody').innerHTML=logs.length?logs.map(function(r){return '<tr><td>'+r.dt+'</td><td>'+r.cnm+'</td><td>'+r.pnm+'</td><td style="font-weight:700">'+r.qty+'</td><td>'+(r.good||r.qty)+'/'+r.qty+(r.defect?' <span style="color:var(--dan)">(불량'+r.defect+')</span>':'')+'</td><td>'+(r.defect||0)+'</td><td>'+(r.car?r.car+' ':'')+(r.driver||'')+'</td><td><button class="btn btn-sm btn-o" onclick="showShipDet(\''+r.id+'\')">상세</button> <button class="btn btn-sm btn-p" onclick="printShipOne(\''+r.id+'\')">명세표</button></td></tr>'}).join(''):'<tr><td colspan="8" class="empty-cell">출고 이력 없음</td></tr>';
}
function showShipDet(sid){const r=DB.g('shipLog').find(x=>x.id===sid);if(!r)return;$('shipDetC').innerHTML=`<div class="fr"><div class="fg"><label>출고일시</label><div style="font-weight:700">${r.tm||r.dt}</div></div><div class="fg"><label>지시번호</label><div>${r.wn||'-'}</div></div><div class="fg"><label>담당</label><div>${r.mgr||'-'}</div></div></div><div class="fr"><div class="fg"><label>거래처</label><div style="font-weight:700;font-size:15px">${r.cnm}</div></div><div class="fg"><label>제품</label><div style="font-weight:700;font-size:15px">${r.pnm}</div></div></div><div class="fr" style="margin-top:10px"><div class="fg"><label>출고수량</label><div style="font-weight:700;font-size:18px">${r.qty}</div></div><div class="fg"><label>양품</label><div style="color:var(--suc);font-weight:700;font-size:18px">${r.good||r.qty}</div></div><div class="fg"><label>불량</label><div style="color:var(--dan);font-weight:700;font-size:18px">${r.defect||0}</div></div></div>${r.inspNote?`<div class="fg" style="margin-top:10px"><label>검수메모</label><div style="background:var(--bg2);padding:8px">${r.inspNote}</div></div>`:''}<div style="border-top:1px solid var(--bdr);margin:14px 0;padding-top:10px"><div class="fr"><div class="fg"><label>차량번호</label><div>${r.car||'-'}</div></div><div class="fg"><label>기사</label><div>${r.driver||'-'}</div></div></div><div class="fg" style="margin-top:8px"><label>입고처</label><div>${r.dlv||'-'}</div></div>${r.memo?`<div class="fg" style="margin-top:8px"><label>배송메모</label><div style="background:var(--bg2);padding:8px">${r.memo}</div></div>`:''}</div>`;_shipDetId=sid;oMo('shipDetMo')}
let _shipDetId=null;function printShipDocById(){if(_shipDetId)printShipOne(_shipDetId)}
// Ship statistics
function rShipStat(){if(!$('shStatM').value)$('shStatM').value=td().slice(0,7);const m=$('shStatM').value;const logs=DB.g('shipLog').filter(r=>r.dt.startsWith(m));const byCli={};let totQ=0,totD=0;logs.forEach(r=>{if(!byCli[r.cnm])byCli[r.cnm]={cnt:0,qty:0,defect:0};byCli[r.cnm].cnt++;byCli[r.cnm].qty+=r.qty;byCli[r.cnm].defect+=r.defect||0;totQ+=r.qty;totD+=r.defect||0});
$('shipStatC').innerHTML=
  '<div class="sg" style="margin-bottom:16px">'+
  `<div class="sb blue" style="text-align:center"><div class="v">${logs.length}</div><div class="l">총 출고건</div></div>`+
  `<div class="sb green" style="text-align:center"><div class="v">${fmt(totQ)}</div><div class="l">총 출고량</div></div>`+
  `<div class="sb ${totD>0?'red':''}" style="text-align:center"><div class="v">${fmt(totD)}</div><div class="l">총 불량</div></div>`+
  `<div class="sb orange" style="text-align:center"><div class="v">${totQ?((totD/totQ)*100).toFixed(1):0}%</div><div class="l">불량률</div></div>`+
  '</div>'+
  `<table class="dt"><thead><tr><th>거래처</th><th>출고건수</th><th>출고량</th><th>불량</th><th>불량률</th></tr></thead><tbody>${Object.entries(byCli).sort((a,b)=>b[1].qty-a[1].qty).map(([k,v])=>`<tr><td style="font-weight:700">${k}</td><td>${v.cnt}건</td><td style="font-weight:700">${fmt(v.qty)}</td><td style="color:${v.defect>0?'#DC2626':'#94A3B8'};font-weight:${v.defect>0?700:400}">${v.defect}</td><td>${v.qty?((v.defect/v.qty)*100).toFixed(1):0}%</td></tr>`).join('')||'<tr><td colspan="5" class="empty-cell">이번 달 출고 기록 없음</td></tr>'}</tbody></table>`}
function printShipStat(){const c=$('shipStatC').innerHTML;if(!c)return;const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>출고통계</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Nanum Gothic',sans-serif;font-size:11px;padding:15mm}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px 6px;font-size:10px}th{background:#E5E7EB;font-weight:700}.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.sb{border:1px solid #ccc;padding:10px}.sb .l{font-size:10px}.sb .v{font-size:16px;font-weight:700}@media print{@page{size:A4;margin:10mm}}</style></head><body><h2 style="text-align:center;margin-bottom:12px;font-size:16px">이노패키지 월별 출고 통계 (${$('shStatM').value})</h2>${c}</body></html>`);w.document.close();setTimeout(()=>w.print(),300)}
function exportShipCSV(){const logs=DB.g('shipLog');let csv='\uFEFF출고일,거래처,제품,출고수량,양품,불량,차량,기사,입고처\n';logs.forEach(r=>{csv+=`${r.dt},${r.cnm},${r.pnm},${r.qty},${r.good||r.qty},${r.defect||0},${r.car||''},${r.driver||''},${r.dlv||''}\n`});const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='출고이력_'+td()+'.csv';a.click();toast('엑셀 내보내기','ok')}
// Print ship document (거래명세표)
function printShipDoc(){const woId=$('smWoId').value;const o=DB.g('wo').find(x=>x.id===woId);if(!o)return;const co=DB.g1('co')||{nm:'이노패키지',addr:'',tel:'',fax:''};const qty=+$('smQty').value||0;const defect=+$('smDefect').value||0;doPrintShipDoc(co,o,qty,defect,$('smDlv').value,$('smCar').value,$('smDriver').value,$('smMemo').value)}
function printShipOne(sid){const r=DB.g('shipLog').find(x=>x.id===sid);if(!r)return;const o=DB.g('wo').find(x=>x.id===r.woId);const co=DB.g1('co')||{nm:'이노패키지',addr:'',tel:'',fax:''};doPrintShipDoc(co,o||{cnm:r.cnm,pnm:r.pnm,spec:'',paper:''},r.qty,r.defect||0,r.dlv||'',r.car||'',r.driver||'',r.memo||'')}
function doPrintShipDoc(co,o,qty,defect,dlv,car,driver,memo){
const h=`<h2 style="text-align:center;font-size:18px;letter-spacing:8px;margin-bottom:12px;font-weight:800">거 래 명 세 표</h2>
<div style="display:flex;justify-content:space-between;font-size:10px;border-bottom:1px solid #999;padding-bottom:5px;margin-bottom:8px"><div><strong>${co.nm}</strong> | ${co.addr} | TEL:${co.tel} | FAX:${co.fax}</div><div>발행일: ${td()}</div></div>
<table><tr><th width="70">거래처</th><td colspan="3" style="font-weight:700;font-size:11px">${o.cnm}</td></tr><tr><th>제품명</th><td colspan="3" style="font-weight:700;font-size:11px">${o.pnm}</td></tr><tr><th>규격</th><td>${o.spec||''}</td><th width="70">종이</th><td>${o.paper||''}</td></tr></table>
<table style="margin-top:6px"><thead><tr><th>품목</th><th>수량</th><th>불량</th><th>양품(납품수량)</th></tr></thead><tbody><tr><td style="font-weight:700">${o.pnm}</td><td>${qty}</td><td style="color:red">${defect}</td><td style="font-weight:700;font-size:12px">${qty-defect}</td></tr></tbody></table>
<table style="margin-top:6px"><tr><th width="70">입고처</th><td>${dlv}</td></tr><tr><th>차량번호</th><td>${car}</td></tr><tr><th>기사</th><td>${driver}</td></tr>${memo?`<tr><th>비고</th><td>${memo}</td></tr>`:''}</table>
<div style="margin-top:30px;display:flex;justify-content:space-around;font-size:11px"><div style="text-align:center"><div style="border-top:1px solid #333;width:120px;padding-top:5px">공급자 (인)</div></div><div style="text-align:center"><div style="border-top:1px solid #333;width:120px;padding-top:5px">인수자 (인)</div></div></div>`;
const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>거래명세표</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Nanum Gothic',sans-serif;font-size:10px;line-height:1.3;padding:12mm;width:210mm}table{width:100%;border-collapse:collapse;margin-bottom:4px}th,td{border:1px solid #333;padding:4px 6px;font-size:10px;text-align:left}th{background:#E5E7EB;font-weight:700;white-space:nowrap}@media print{@page{size:A4;margin:8mm}}</style></head><body>${h}</body></html>`);w.document.close();setTimeout(()=>w.print(),300)}
// CLAIM MANAGEMENT
function rClaim(){const s=($('claimSch')?.value||'').toLowerCase();const cs=DB.g('claims').filter(c=>!s||c.cnm.toLowerCase().includes(s)||c.pnm.toLowerCase().includes(s)).sort((a,b)=>b.dt>a.dt?1:-1);
var _typeBadge=(t)=>t==='반품'?'<span class="bd bd-d">반품</span>':t==='클레임'?'<span class="bd bd-o">클레임</span>':'<span class="bd bd-p">재작업</span>';
var _stBadge=(s)=>s==='접수'?'<span class="bd bd-w">접수</span>':s==='처리중'?'<span class="bd bd-p">처리중</span>':'<span class="bd bd-s">완료</span>';
$('claimTbl').querySelector('tbody').innerHTML=cs.length?cs.map(c=>`<tr><td>${c.dt}</td><td style="font-weight:600">${c.cnm}</td><td>${c.pnm}</td><td>${_typeBadge(c.type)}</td><td style="font-weight:700">${c.qty}</td><td style="color:#475569">${c.reason}</td><td>${_stBadge(c.st)}</td><td><button class="btn btn-sm btn-o" onclick="eClaim('${c.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dClaim('${c.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty-cell">등록된 반품/클레임 없음</td></tr>'}
function openClaimM(){['clmId','clmCli','clmProd','clmQty','clmReason','clmNote'].forEach(x=>$(x).value='');$('clmType').value='반품';$('clmSt').value='접수';$('claimMoT').textContent='반품/클레임 등록';oMo('claimMo')}
function eClaim(id){const c=DB.g('claims').find(x=>x.id===id);if(!c)return;$('clmId').value=c.id;$('clmCli').value=c.cnm;$('clmProd').value=c.pnm;$('clmType').value=c.type;$('clmQty').value=c.qty;$('clmReason').value=c.reason;$('clmSt').value=c.st;$('clmNote').value=c.note||'';$('claimMoT').textContent='반품/클레임 수정';oMo('claimMo')}
function saveClaim(){const cn=$('clmCli').value.trim(),pn=$('clmProd').value.trim(),qty=+$('clmQty').value;if(!cn||!pn){toast('거래처/제품 필요','err');return}if(!qty){toast('수량 필요','err');return}if(!$('clmReason').value.trim()){toast('사유 필요','err');return}
const id=$('clmId').value||gid();const c={id,cnm:cn,pnm:pn,type:$('clmType').value,qty,reason:$('clmReason').value,st:$('clmSt').value,note:$('clmNote').value,dt:td()};const cs=DB.g('claims');const i=cs.findIndex(x=>x.id===id);if(i>=0)cs[i]=c;else cs.push(c);DB.s('claims',cs);addLog(`${c.type}: ${cn} ${pn} ${qty}매`);cMo('claimMo');rClaim();toast('저장','ok')}
function dClaim(id){if(!confirm('삭제?'))return;DB.s('claims',DB.g('claims').filter(x=>x.id!==id));rClaim();toast('삭제','ok')}
function acClmCli(v){const l=$('acClmCliL');const cs=DB.g('cli').filter(c=>!v||!v.trim()||v.trim()===' '||c.nm.toLowerCase().includes(v.toLowerCase()));if(!cs.length){l.classList.add('hidden');return}l.innerHTML=cs.map(c=>{var sn=c.nm.replace(/'/g,"&#39;");return`<div class="ac-i" onclick="$('clmCli').value='${sn}';$('acClmCliL').classList.add('hidden')">${c.nm}</div>`}).join('');l.classList.remove('hidden')}



document.addEventListener('click',e=>{document.querySelectorAll('.ac-l').forEach(l=>{if(!l.parentElement.contains(e.target))l.classList.add('hidden')})});

// ===== INIT =====

/* ===== NOTIFICATION SYSTEM ===== */
var _notiItems=[];
function genNotifications(){
  _notiItems=[];
  var os=DB.g('wo'),now=new Date(),todayStr=td();
  // 1. 지연 경고
  os.forEach(function(o){
    if(o.status==='완료'||o.status==='출고완료')return;
    if(o.sd&&o.sd<todayStr){
      _notiItems.push({type:'danger',icon:'',msg:o.cnm+' - '+o.pnm+' 납기 지연',detail:'출고예정: '+o.sd+' ('+Math.abs(Math.round((new Date(o.sd)-now)/(1000*60*60*24)))+'일 초과)',time:o.sd,unread:true});
    }
  });
  // 2. 납기 임박 (3일 이내)
  os.forEach(function(o){
    if(o.status==='완료'||o.status==='출고완료')return;
    if(o.sd){
      var diff=Math.round((new Date(o.sd)-now)/(1000*60*60*24));
      if(diff>=0&&diff<=3){
        _notiItems.push({type:'warning',icon:'',msg:o.cnm+' - '+o.pnm+' 납기 임박',detail:'D-'+diff+' | 출고예정: '+o.sd,time:o.sd,unread:true});
      }
    }
  });
  // 3. 완료 미출고
  os.forEach(function(o){
    if(o.status==='완료'&&o.sd){
      _notiItems.push({type:'info',icon:'',msg:o.pnm+' 생산완료 - 출고 대기',detail:o.cnm+' | 출고예정: '+o.sd,time:o.sd,unread:true});
    }
  });
  // 4. 재고 부족 알림
  var stocks=DB.g('stock');
  stocks.forEach(function(s){
    if(s.qty!==undefined&&s.min!==undefined&&Number(s.qty)<=Number(s.min)){
      _notiItems.push({type:'danger',icon:'',msg:s.nm+' 재고 부족',detail:'현재: '+s.qty+' / 기준: '+s.min,time:todayStr,unread:true});
    }
  });
  // 4.5 출고 임박 알림 강화
  var shipAlerts=getShipAlerts();
  shipAlerts.forEach(function(sa){
    if(sa.type==='D-DAY')_notiItems.push({type:'danger',icon:'',msg:sa.o.pnm+' 오늘 출고!',detail:sa.o.cnm+' | '+sa.o.sd,time:sa.o.sd,unread:true});
    else if(sa.type==='D-1')_notiItems.push({type:'warning',icon:'',msg:sa.o.pnm+' 내일 출고',detail:sa.o.cnm+' | '+sa.o.sd,time:sa.o.sd,unread:true});
  });
  // 4.6 안전재고 알림
  var ssAlerts=checkSafetyStock();
  ssAlerts.forEach(function(sa){
    _notiItems.push({type:'danger',icon:'',msg:sa.nm+' 안전재고 이하',detail:'현재: '+sa.qty+' / 기준: '+sa.min,time:td(),unread:true});
  });
  // 4.7 입고 확인 대기
  os.forEach(function(o){
    if(o.status==='출고완료'||o.status==='취소'||o.status==='완료')return;
    if(!o.procs)return;
    o.procs.forEach(function(p){
      if(p.nm==='인쇄'&&p.tp==='out'&&p.st==='진행중'){
        _notiItems.push({type:'warning',icon:'',msg:o.pnm+' 인쇄 입고 대기',detail:(p.vd||o.vendor||'외주')+' | '+o.cnm,time:todayStr,unread:true});
      }
      if(p.nm==='외주가공'&&(p.tp==='out'||p.tp==='exc')&&p.st==='진행중'){
        _notiItems.push({type:'warning',icon:'',msg:o.pnm+' 외주가공 입고 대기',detail:(p.vd||'외주')+' | '+o.cnm,time:todayStr,unread:true});
      }
    });
  });
  // 4.8 완료 확인 대기
  os.forEach(function(o){
    if(o.status==='완료대기'){
      _notiItems.push({type:'info',icon:'',msg:o.pnm+' 완료 확인 대기',detail:o.cnm+' | 전 공정 완료',time:todayStr,unread:true});
    }
  });
  // 5. 금일 완료 작업
  os.forEach(function(o){
    if((o.status==='완료'||o.status==='출고완료')&&o.cat&&o.cat.slice(0,10)===todayStr){
      _notiItems.push({type:'success',icon:'',msg:o.pnm+' 작업 완료',detail:o.cnm,time:todayStr,unread:false});
    }
  });
  // 정렬: danger > warning > info > success
  var prio={danger:0,warning:1,info:2,success:3};
  _notiItems.sort(function(a,b){return(prio[a.type]||9)-(prio[b.type]||9)});
  renderNoti();
  var _unread=_notiItems.filter(function(n){return n.unread}).length;
  if(_unread>0)notiAlert();
}
function renderNoti(){
  var badge=$('notiBadge'),list=$('notiList');
  if(!badge||!list)return;
  var unread=_notiItems.filter(function(n){return n.unread}).length;
  badge.textContent=unread>0?unread:'';
  // 사이드바 배지도
  var sbBadge=$('sbNotiBadge');
  if(sbBadge)sbBadge.textContent=unread>0?unread:'';
  if(_notiItems.length===0){
    list.innerHTML='<div class="noti-empty"><div class="noti-empty-icon"></div><div class="noti-empty-text">새로운 알림이 없습니다</div></div>';
    return;
  }
  list.innerHTML=_notiItems.map(function(n,i){
    return '<div class="noti-item type-'+n.type+(n.unread?' unread':'')+'" onclick="readNoti('+i+')">'
      +'<div class="noti-icon">'+n.icon+'</div>'
      +'<div class="noti-body"><div class="noti-msg">'+n.msg+'</div><div class="noti-detail">'+n.detail+'</div></div>'
      +'<div class="noti-time">'+n.time+'</div></div>';
  }).join('');
}
function toggleNotiPanel(){
  var p=$('notiPanel');
  if(p.classList.contains('open')){p.classList.remove('open')}
  else{genNotifications();p.classList.add('open')}
}
function clearNoti(){
  _notiItems.forEach(function(n){n.unread=false});
  renderNoti();
}
function readNoti(i){
  if(_notiItems[i])_notiItems[i].unread=false;
  renderNoti();
}
// 패널 외부 클릭 시 닫기
document.addEventListener('click',function(e){
  var w=$('notiWrap');
  if(w&&!w.contains(e.target)){var p=$('notiPanel');if(p)p.classList.remove('open')}
});
// Mobile sidebar: close when clicking outside
document.addEventListener('click',function(e){
  var sb=$('sidebar');if(!sb||!sb.classList.contains('open'))return;
  if(!sb.contains(e.target)&&!e.target.classList.contains('mob-toggle'))sb.classList.remove('open');
});

/* ===== CALENDAR VIEW ===== */
var _calY=new Date().getFullYear(),_calM=new Date().getMonth();
function calNav(dir){_calM+=dir;if(_calM<0){_calM=11;_calY--}if(_calM>11){_calM=0;_calY++}rCal()}
function rCal(){
  var os=DB.g('wo'),todayStr=td();
  var y=_calY,m=_calM;
  var first=new Date(y,m,1),last=new Date(y,m+1,0);
  var startDay=first.getDay(),totalDays=last.getDate();
  var mo=String(m+1).padStart(2,'0');
  $('calTitle').textContent=y+'년 '+mo+'월';
  // 월 통계
  var mShip=0,mStart=0,mDone=0,mLate=0;
  os.forEach(function(o){
    var ym=y+'-'+mo;
    if(o.sd&&o.sd.slice(0,7)===ym)mShip++;
    if(o.dt&&o.dt.slice(0,7)===ym)mStart++;
    if((o.status==='완료'||o.status==='출고완료')&&o.cat&&o.cat.slice(0,7)===ym)mDone++;
    if(o.sd&&o.sd<todayStr&&o.status!=='완료'&&o.status!=='출고완료'&&o.sd.slice(0,7)===ym)mLate++;
  });
  $('calStats').innerHTML='<div class="cal-stat"><div class="cal-stat-v" style="color:#3182F6">'+mStart+'</div><div class="cal-stat-l">작업등록</div></div>'
    +'<div class="cal-stat"><div class="cal-stat-v" style="color:#10B981">'+mShip+'</div><div class="cal-stat-l">출고예정</div></div>'
    +'<div class="cal-stat"><div class="cal-stat-v" style="color:#059669">'+mDone+'</div><div class="cal-stat-l">완료</div></div>'
    +'<div class="cal-stat"><div class="cal-stat-v" style="color:#EF4444">'+mLate+'</div><div class="cal-stat-l">지연</div></div>';
  // 캘린더 그리드
  var dayNames=['일','월','화','수','목','금','토'];
  var h='';
  dayNames.forEach(function(d,i){h+='<div class="cal-day-hd'+(i===0?' sun':'')+(i===6?' sat':'')+'">'+d+'</div>'});
  // 이전달 빈칸
  var prevLast=new Date(y,m,0).getDate();
  for(var i=startDay-1;i>=0;i--){
    h+='<div class="cal-day other"><div class="cal-day-num">'+(prevLast-i)+'</div></div>';
  }
  // 이번달
  for(var d=1;d<=totalDays;d++){
    var ds=y+'-'+mo+'-'+String(d).padStart(2,'0');
    var dow=(startDay+d-1)%7;
    var isToday=ds===todayStr;
    var cls='cal-day'+(isToday?' today':'')+(dow===0?' sun':'')+(dow===6?' sat':'');
    var evts=[];
    os.forEach(function(o){
      if(o.dt===ds)evts.push({type:'start',txt:''+o.pnm});
      if(o.sd===ds){
        if(o.status==='출고완료')evts.push({type:'done',txt:''+o.pnm});
        else if(ds<todayStr&&o.status!=='완료')evts.push({type:'late',txt:''+o.pnm});
        else evts.push({type:'ship',txt:''+o.pnm});
      }
    });
    h+='<div class="'+cls+'"><div class="cal-day-num">'+d+'</div>';
    var show=evts.slice(0,3);
    show.forEach(function(e){h+='<div class="cal-evt '+e.type+'">'+e.txt+'</div>'});
    if(evts.length>3)h+='<div class="cal-evt-more">+' +(evts.length-3)+'건 더</div>';
    h+='</div>';
  }
  // 다음달 빈칸
  var remain=(7-((startDay+totalDays)%7))%7;
  for(var i=1;i<=remain;i++){
    h+='<div class="cal-day other"><div class="cal-day-num">'+i+'</div></div>';
  }
  $('calGrid').innerHTML=h;
}

/* ===== WORKER PERFORMANCE ===== */
var _perfAll=false;
function perfAll(){_perfAll=true;rPerf()}
function rPerf(){
  // 월 선택 드롭다운 초기화
  var sel=$('perfMonth');
  if(sel&&!sel.options.length){
    var now=new Date();
    for(var i=0;i<12;i++){
      var d=new Date(now.getFullYear(),now.getMonth()-i,1);
      var v=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      var opt=document.createElement('option');opt.value=v;opt.textContent=d.getFullYear()+'년 '+(d.getMonth()+1)+'월';
      sel.appendChild(opt);
    }
  }
  var mo=_perfAll?'all':(sel?sel.value:'');

  // hist 기반 실제 작업자 데이터
  var allHs=DB.g('hist');
  var hs=mo==='all'?allHs:allHs.filter(function(h){return h.doneAt&&h.doneAt.startsWith(mo)});
  var allDl=DB.g('defectLog');
  var dls=mo==='all'?allDl:allDl.filter(function(d){return d.dt&&d.dt.startsWith(mo)});

  // 작업자별 집계
  var byW={};
  hs.forEach(function(h){
    var w=h.worker||'미지정';
    if(!byW[w])byW[w]={cnt:0,qty:0,workMin:0,setupMin:0,procs:{},defect:0,defectCnt:0};
    byW[w].cnt++;
    byW[w].qty+=h.qty||0;
    var wm=calcMins(h.t1,h.t2);
    if(wm>0&&wm<1440)byW[w].workMin+=wm;
    byW[w].setupMin+=(h.setupMin||0);
    byW[w].procs[h.proc]=(byW[w].procs[h.proc]||0)+1;
  });
  // 불량 집계
  dls.forEach(function(d){
    if(!d.defect||d.defect<=0)return;
    var w=d.worker||'미지정';
    if(!byW[w])byW[w]={cnt:0,qty:0,workMin:0,setupMin:0,procs:{},defect:0,defectCnt:0};
    byW[w].defect+=d.defect||0;
    byW[w].defectCnt++;
  });

  var results=Object.entries(byW).sort(function(a,b){return b[1].qty-a[1].qty});
  var totalCnt=results.reduce(function(s,x){return s+x[1].cnt},0);
  var totalQty=results.reduce(function(s,x){return s+x[1].qty},0);
  var totalDf=results.reduce(function(s,x){return s+(x[1].defect||0)},0);
  var topW=results.length?results[0][0]:'-';

  // 요약 카드
  $('perfSummary').innerHTML='<div class="sg">'
    +'<div class="sb blue"><div class="v">'+totalCnt+'건</div><div class="l">총 완료 공정</div></div>'
    +'<div class="sb green"><div class="v">'+fmt(totalQty)+'매</div><div class="l">총 생산수량</div></div>'
    +'<div class="sb orange"><div class="v">'+results.length+'명</div><div class="l">작업 인원</div></div>'
    +'<div class="sb '+(totalDf>0?'red':'green')+'"><div class="v">'+fmt(totalDf)+'매</div><div class="l">총 불량수량</div></div>'
    +'</div>'
    +(results.length?'<div style="font-size:12px;color:var(--txt2);margin-bottom:12px">🏆 최고 생산량: <strong>'+topW+'</strong> ('+fmt(results[0][1].qty)+'매)</div>':'');

  // 작업자 카드
  var colors=['#3182F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
  var h='';
  results.forEach(function(entry,i){
    var nm=entry[0];var d=entry[1];
    var eff=d.workMin>0?Math.round(d.qty/(d.workMin/60)):0;
    var util=(d.workMin+d.setupMin)>0?Math.round(d.workMin/(d.workMin+d.setupMin)*100):0;
    var defRate=d.qty>0?((d.defect||0)/d.qty*100).toFixed(1):0;
    var mainProc=Object.entries(d.procs).sort(function(a,b){return b[1]-a[1]})[0];
    var procList=Object.entries(d.procs).sort(function(a,b){return b[1]-a[1]}).slice(0,3).map(function(x){return x[0]+'('+x[1]+')'}).join(' · ');
    var rankClass=i===0?'gold':i===1?'silver':i===2?'bronze':'';
    var rankLabel=(i+1)+'위';
    var barColor=util>=80?'#10B981':util>=50?'#F59E0B':'#EF4444';
    h+='<div class="perf-card">'
      +'<div class="perf-card-hd">'
      +'<div class="perf-avatar" style="background:'+colors[i%8]+'">'+nm.charAt(0)+'</div>'
      +'<div style="flex:1"><div class="perf-name">'+nm+'</div>'
      +'<div class="perf-proc" style="font-size:11px;color:var(--txt2)">'+procList+'</div></div>'
      +(rankClass?'<div class="perf-rank '+rankClass+'">'+rankLabel+'</div>':'<div style="font-size:11px;color:var(--txt3);margin-left:auto">'+rankLabel+'</div>')
      +'</div>'
      +'<div class="perf-stats">'
      +'<div class="perf-stat"><div class="perf-stat-v" style="color:#059669">'+d.cnt+'</div><div class="perf-stat-l">완료건수</div></div>'
      +'<div class="perf-stat"><div class="perf-stat-v" style="color:#3182F6">'+fmt(d.qty)+'</div><div class="perf-stat-l">생산량</div></div>'
      +'<div class="perf-stat"><div class="perf-stat-v" style="color:#F59E0B">'+fmt(eff)+'</div><div class="perf-stat-l">매/시간</div></div>'
      +'<div class="perf-stat"><div class="perf-stat-v" style="color:'+(+defRate>3?'#EF4444':'#10B981')+'">'+defRate+'%</div><div class="perf-stat-l">불량률</div></div>'
      +'</div>'
      +'<div class="perf-bar-wrap">'
      +'<div class="perf-bar-label"><span>가동률</span><span style="color:'+barColor+'">'+util+'%</span></div>'
      +'<div class="perf-bar"><div class="perf-bar-fill" style="width:'+Math.min(util,100)+'%;background:'+barColor+'"></div></div>'
      +'</div>'
      +'<div style="font-size:11px;color:var(--txt3);margin-top:6px">'
      +'작업 '+Math.round(d.workMin/60*10)/10+'h · 셋업 '+(d.setupMin||0)+'분'
      +(d.defect>0?' · 불량 '+fmt(d.defect)+'매 ('+d.defectCnt+'건)':'')
      +'</div>'
      +'</div>';
  });
  $('perfGrid').innerHTML=h||emptyHtml('','성과 데이터 없음','작업 완료 기록이 쌓이면 작업자별 분석이 표시됩니다');
  _perfAll=false;
}

/* ===== PDF / PRINT EXPORT ===== */
function exportPDF(title,contentId){
  var content='';
  if(contentId){
    var el=$(contentId);
    if(el)content=el.innerHTML;
  }else{
    // 현재 활성 모듈 페이지의 내용
    var active=document.querySelector('.module-page.active');
    if(active)content=active.innerHTML;
  }
  var now=new Date();
  var dateStr=now.getFullYear()+'.'+String(now.getMonth()+1).padStart(2,'0')+'.'+String(now.getDate()).padStart(2,'0')+' '+String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  var w=window.open('','_blank','width=900,height=700');
  if(!w){toast('팝업이 차단되었습니다','err');return}w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8">');
  w.document.write('<title>'+(title||'이노패키지 보고서')+'</title>');
  w.document.write('<style>');
  w.document.write('*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}');
  w.document.write('body{font-family:Pretendard,Apple SD Gothic Neo,sans-serif;color:#111;padding:24px;font-size:13px;line-height:1.5}');
  w.document.write('.print-header{text-align:center;padding:20px 0;border-bottom:2.5px solid #1E293B;margin-bottom:24px}');
  w.document.write('.print-header h1{font-size:22px;font-weight:900;color:#1E293B;letter-spacing:-.5px}');
  w.document.write('.print-header .co{font-size:13px;color:#64748B;margin-top:2px}');
  w.document.write('.print-header .dt{font-size:11px;color:#94A3B8;margin-top:6px}');
  w.document.write('table{width:100%;border-collapse:collapse;margin:12px 0}');
  w.document.write('th{background:#F1F5F9;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;border-bottom:2px solid #CBD5E1}');
  w.document.write('td{padding:8px 10px;border-bottom:1px solid #E2E8F0;font-size:12px}');
  w.document.write('.card{border:1px solid #E2E8F0;padding:16px;margin-bottom:12px;border-radius:8px;page-break-inside:avoid}');
  w.document.write('.card-t{font-size:14px;font-weight:800;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #F1F5F9}');
  w.document.write('.kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px}');
  w.document.write('.kpi-card{border:1px solid #E2E8F0;padding:12px;border-radius:8px;text-align:center}');
  w.document.write('.kpi-value{font-size:24px;font-weight:900}');
  w.document.write('.kpi-label{font-size:10px;color:#64748B;font-weight:600}');
  w.document.write('.bd{display:inline-block;padding:2px 8px;font-size:10px;font-weight:700;border-radius:20px}');
  w.document.write('.sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:12px}');
  w.document.write('.sb{border:1px solid #E2E8F0;padding:10px;border-radius:6px}');
  w.document.write('.sb .l{font-size:10px;color:#64748B}.sb .v{font-size:18px;font-weight:800}');
  w.document.write('.perf-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}');
  w.document.write('.perf-card{border:1px solid #E2E8F0;padding:14px;border-radius:8px}');
  w.document.write('.cal-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}');
  w.document.write('.cal-stat{border:1px solid #E2E8F0;padding:8px;text-align:center;border-radius:6px}');
  w.document.write('.print-footer{text-align:center;padding:16px 0;border-top:1px solid #CBD5E1;margin-top:24px;font-size:10px;color:#94A3B8}');
  w.document.write('button,.btn,.s-tab,.noti-bell,.toast{display:none!important}');
  w.document.write('@media print{@page{margin:15mm}}');
  w.document.write('</style></head><body>');
  w.document.write('<div class="print-header"><h1>'+(title||'이노패키지 보고서')+'</h1><div class="co">이노패키지 ERP+MES</div><div class="dt">출력일시: '+dateStr+'</div></div>');
  w.document.write(content);
  w.document.write('<div class="print-footer">이노패키지 | 경기도 파주시 | 본 문서는 시스템에서 자동 생성되었습니다.</div>');
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function(){w.print()},500);
updateShipBadge();
}

/* ===== DAILY PRODUCTION PLAN ===== */
function rPlanList(){/* 호환용 stub — rPlan()이 실제 렌더링 처리 */}
// === 공정별 대기열 화살표 순서 변경 ===

function rPlan(){
  try{
  var dt=td(),os=DB.g('wo');
  var procColors=getProcColors();
  var planProcs=['인쇄','외주가공','코팅','합지','톰슨','접착','생산완료'];

  // 요약 배지
  var active=os.filter(function(o){return o.status!=='완료'&&o.status!=='출고완료'&&o.status!=='취소'});
  var ingCnt=active.filter(function(o){return o.status==='진행중'}).length;
  var waitCnt=active.filter(function(o){return o.status==='대기'}).length;
  var lateCnt=active.filter(function(o){return isLate(o)}).length;
  var sH='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
  sH+='<div class="plan-kpi k-gray" onclick="openPlanFilter(\'all\')"><div class="num">'+active.length+'</div><div class="lbl">전체</div></div>';
  sH+='<div class="plan-kpi k-blue" onclick="openPlanFilter(\'ing\')"><div class="num">'+ingCnt+'</div><div class="lbl">진행중</div></div>';
  sH+='<div class="plan-kpi k-orange" onclick="openPlanFilter(\'wait\')"><div class="num">'+waitCnt+'</div><div class="lbl">대기중</div></div>';
  if(lateCnt)sH+='<div class="plan-kpi k-red" onclick="openPlanFilter(\'late\')"><div class="num">'+lateCnt+'</div><div class="lbl">출고 지연</div></div>';
  sH+='</div>';
  $('planPriority').innerHTML=sH;

  // 공정별 전체 너비 행 카드
  var gH='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
  planProcs.forEach(function(proc){
    var pColor=procColors[proc]||'#6B7280';
    var wait=[],ing=[],done=[],isExt=false;
    if(proc==='생산완료'){
      os.forEach(function(o){
        if(o.status==='취소'||o.status==='출고완료')return;
        var dday=o.sd?Math.round((new Date(o.sd)-new Date(dt))/864e5):999;
        var item={wid:o.id,pnm:o.pnm,cnm:o.cnm,qty:o.compQty||o.fq||0,dday:dday,pi:-1};
        if(o.status==='완료대기')wait.push(item);
        else if(o.status==='완료')done.push(item);
      });
      window._compItems=wait.concat(done);
    }else{
      var q=getProcQueue(proc);
      wait=q.wait;ing=q.ing;done=q.done;isExt=q.isExt;
    }

    var clickFn=proc==='생산완료'?'openCompPopup()':'openProcQueue(\''+proc+'\')';
    var isComp=proc==='생산완료';

    // 행 카드 시작 (생산완료는 전체 너비 가운데 배치)
    if(isComp)gH+='<div style="grid-column:1/-1;display:flex;justify-content:center">';
    gH+='<div class="plan-card"'+(isComp?' style="width:50%"':'')+' >';

    // 헤더 행
    gH+='<div class="plan-card-hdr" onclick="'+clickFn+'" style="border-left-color:'+pColor+'">';
    gH+='<span class="plan-card-nm">'+proc+'</span>';
    if(proc==='생산완료'){
      if(wait.length)gH+='<span class="tag tag-red">확인대기 '+wait.length+'</span>';
      if(done.length)gH+='<span class="tag tag-green">완료 '+done.length+'</span>';
    }else if(isExt){
      if(ing.length)gH+='<span class="tag tag-purple">진행중 '+ing.length+'</span>';
      if(done.length)gH+='<span class="tag tag-green">입고완료 '+done.length+'</span>';
    }else{
      if(wait.length)gH+='<span class="tag tag-orange">대기중 '+wait.length+'</span>';
      if(ing.length)gH+='<span class="tag tag-blue">진행중 '+ing.length+'</span>';
      if(done.length)gH+='<span class="tag tag-green">오늘완료 '+done.length+'</span>';
    }
    if(!wait.length&&!ing.length&&!done.length)gH+='<span class="lbl">작업 없음</span>';
    gH+='<span class="plan-card-more">전체보기 ›</span>';
    gH+='</div>';

    // 섹션 본문
    if(proc==='생산완료'){
      // 2분할: 확인대기 | 완료
      gH+='<div style="display:grid;grid-template-columns:1fr 1fr;min-height:60px">';
      gH+=_planSection('확인대기','var(--dan)',wait,function(it){
        return '<div class="plan-item pi-chk"><div class="plan-item-inf"><div class="plan-item-nm">'+it.pnm+'</div><div class="plan-item-cli">'+it.cnm+'</div></div><span class="plan-item-st" style="color:var(--dan)">확인대기</span></div>';
      },true);
      gH+=_planSection('완료','var(--suc)',done,function(it){
        return '<div class="plan-item pi-done"><div class="plan-item-inf"><div class="plan-item-nm">'+it.pnm+'</div><div class="plan-item-cli">'+it.cnm+'</div></div><span class="plan-item-st" style="color:var(--suc)">완료</span></div>';
      },false);
      gH+='</div>';
    }else if(isExt){
      // 2분할: 진행중(+입고버튼) | 입고완료
      gH+='<div style="display:grid;grid-template-columns:1fr 1fr;min-height:60px">';
      gH+=_planSection('진행중','#9333EA',ing,function(it){
        var ddCls=it.dday<=0?'var(--dan)':it.dday<=3?'var(--exc)':'var(--txt2)';
        return '<div class="plan-item pi-ext"><div class="plan-item-inf"><div class="plan-item-nm">'+it.pnm+'</div><div class="plan-item-cli">'+it.cnm+'</div></div><span class="plan-item-dd" style="color:'+ddCls+'">D'+(it.dday>=0?'-':'+')+Math.abs(it.dday)+'</span><button onclick="event.stopPropagation();pqConfirmIn(\''+it.wid+'\','+it.pi+')" class="btn btn-sm" style="font-size:10px;padding:2px 6px;background:#9333EA;color:#fff;border:none;white-space:nowrap">입고</button></div>';
      },true);
      gH+=_planSection('입고완료','var(--suc)',done,function(it){
        return '<div class="plan-item pi-done"><div class="plan-item-inf"><div class="plan-item-nm">'+it.pnm+'</div><div class="plan-item-cli">'+it.cnm+'</div></div><span class="plan-item-st" style="color:var(--suc)">입고완료</span></div>';
      },false);
      gH+='</div>';
    }else{
      // 3분할: 대기중 | 진행중 | 오늘완료
      gH+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;min-height:60px">';
      gH+=_planSection('대기중','var(--exc)',wait,function(it,idx){
        var ddCls=it.dday<=0?'var(--dan)':it.dday<=3?'var(--exc)':'var(--txt2)';
        return '<div class="plan-item pi-wait"><span style="font-size:11px;font-weight:800;color:var(--bdr2);min-width:16px;text-align:center">'+(idx+1)+'</span><div class="plan-item-inf"><div class="plan-item-nm">'+it.pnm+'</div><div class="plan-item-cli">'+it.cnm+'</div></div><span class="plan-item-dd" style="color:'+ddCls+'">D'+(it.dday>=0?'-':'+')+Math.abs(it.dday)+'</span></div>';
      },true);
      // 진행중: 톰슨은 기계별(각 1개), 그 외 1개만 표시
      gH+='<div class="plan-sec plan-sec-br">';
      if(proc==='톰슨'){
        var m1=ing.filter(function(it){return it.machine!=='톰슨2'});
        var m2=ing.filter(function(it){return it.machine==='톰슨2'});
        var ingTotal=Math.min(m1.length,1)+Math.min(m2.length,1);
        gH+='<div class="plan-sec-t" style="color:var(--pri)">진행중 ('+ingTotal+'/2)</div>';
        // 톰슨1
        gH+='<div class="plan-mach-t">톰슨1</div>';
        if(m1.length){
          var it1=m1[0];var ddC1=it1.dday<=0?'var(--dan)':it1.dday<=3?'var(--exc)':'var(--txt2)';
          gH+='<div class="plan-item pi-ing"><div class="plan-item-inf"><div class="plan-item-nm">'+it1.pnm+'</div><div class="plan-item-cli">'+it1.cnm+'</div></div><span class="plan-item-dd" style="color:'+ddC1+'">D'+(it1.dday>=0?'-':'+')+Math.abs(it1.dday)+'</span></div>';
        }else{
          gH+='<div class="plan-sec-empty">대기없음</div>';
        }
        // 톰슨2
        gH+='<div class="plan-mach-t" style="margin-top:6px">톰슨2</div>';
        if(m2.length){
          var it2=m2[0];var ddC2=it2.dday<=0?'var(--dan)':it2.dday<=3?'var(--exc)':'var(--txt2)';
          gH+='<div class="plan-item pi-ing"><div class="plan-item-inf"><div class="plan-item-nm">'+it2.pnm+'</div><div class="plan-item-cli">'+it2.cnm+'</div></div><span class="plan-item-dd" style="color:'+ddC2+'">D'+(it2.dday>=0?'-':'+')+Math.abs(it2.dday)+'</span></div>';
        }else{
          gH+='<div class="plan-sec-empty">대기없음</div>';
        }
      }else{
        // 기계 1대 — 진행중 1개만 표시
        gH+='<div class="plan-sec-t" style="color:var(--pri)">진행중 ('+Math.min(ing.length,1)+'/1)</div>';
        if(!ing.length){
          gH+='<div class="plan-sec-empty">없음</div>';
        }else{
          var it=ing[0];var ddC=it.dday<=0?'var(--dan)':it.dday<=3?'var(--exc)':'var(--txt2)';
          gH+='<div class="plan-item pi-ing"><div class="plan-item-inf"><div class="plan-item-nm">'+it.pnm+'</div><div class="plan-item-cli">'+it.cnm+'</div></div><span class="plan-item-dd" style="color:'+ddC+'">D'+(it.dday>=0?'-':'+')+Math.abs(it.dday)+'</span></div>';
        }
      }
      gH+='</div>';
      gH+=_planSection('오늘완료','var(--suc)',done,function(it){
        return '<div class="plan-item pi-done"><div class="plan-item-inf"><div class="plan-item-nm">'+it.pnm+'</div><div class="plan-item-cli">'+it.cnm+'</div></div><span class="plan-item-st" style="color:var(--suc)">완료</span></div>';
      },false);
      gH+='</div>';
    }

    gH+='</div>'; // 카드 끝
    if(isComp)gH+='</div>'; // 가운데 정렬 래퍼 끝
  });
  gH+='</div>';
  $('planGrid').innerHTML=gH;

  }catch(e){var _pg=$('planGrid');if(_pg)_pg.innerHTML='<div style="padding:20px;color:red;font-size:13px">오류: '+e.message+'</div>';console.error('rPlan error:',e);}
}
// 섹션 렌더 헬퍼 (border-right 여부 포함)
function _planSection(title,color,items,rowFn,hasBorderRight){
  var h='<div class="plan-sec'+(hasBorderRight?' plan-sec-br':'')+'">';
  h+='<div class="plan-sec-t" style="color:'+color+'">'+title+' ('+items.length+')</div>';
  if(!items.length){
    h+='<div class="plan-sec-empty">없음</div>';
  }else{
    items.slice(0,5).forEach(function(it,idx){h+=rowFn(it,idx)});
    if(items.length>5)h+='<div class="plan-more">+'+(items.length-5)+'건 더</div>';
  }
  h+='</div>';
  return h;
}
// === 생산계획 상단 필터 팝업 ===
function openPlanFilter(type){
  var os=DB.g('wo');
  var active=os.filter(function(o){return o.status!=='완료'&&o.status!=='출고완료'&&o.status!=='취소'});
  var items,title;
  if(type==='all'){items=active;title='전체 작업지시서';}
  else if(type==='ing'){items=active.filter(function(o){return o.status==='진행중'});title='진행중';}
  else if(type==='wait'){items=active.filter(function(o){return o.status==='대기'});title='대기중';}
  else if(type==='late'){items=active.filter(function(o){return isLate(o)});title='출고 지연';}
  else{items=[];title='';}
  items=items.slice().sort(function(a,b){var da=a.sd?new Date(a.sd):new Date('9999-01-01'),db=b.sd?new Date(b.sd):new Date('9999-01-01');return da-db;});
  var h='<div id="planFilterPop" class="mo-ov" onclick="if(event.target===this)this.remove()">';
  h+='<div class="mo" style="width:500px;max-width:92vw;max-height:80vh;display:flex;flex-direction:column;overflow:hidden">';
  h+='<div class="mo-hd"><span class="sec-t" style="margin:0">'+title+' <span class="lbl">'+items.length+'건</span></span>';
  h+='<button onclick="document.getElementById(\'planFilterPop\').remove()" class="mo-x">×</button>';
  h+='</div>';
  h+='<div style="overflow-y:auto;padding:10px 14px">';
  if(!items.length){
    h+='<div class="empty-state"><div class="msg">해당 항목 없음</div></div>';
  }else{
    items.forEach(function(o){
      var dday=o.sd?Math.round((new Date(o.sd)-new Date(td()))/864e5):999;
      var ddCls=dday<=0?'var(--dan)':dday<=3?'var(--exc)':'var(--txt2)';
      var stBadge=o.status==='진행중'?'tag-blue':o.status==='대기'?'tag-orange':'tag-green';
      var cp=curP(o);var cpNm=cp?cp.nm:'';
      h+='<div onclick="document.getElementById(\'planFilterPop\').remove();showDet(\''+o.id+'\')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;margin:3px 0;border-radius:10px;border:1px solid var(--bdr);cursor:pointer;background:var(--bg);transition:background .1s" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'var(--bg)\'">';
      h+='<div style="flex:1;min-width:0">';
      h+='<div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+o.pnm+'</div>';
      h+='<div class="lbl" style="margin-top:2px">'+o.cnm+(cpNm?' · 현재: '+cpNm:'')+(o.fq?' · '+fmt(o.fq)+'매':'')+'</div>';
      h+='</div>';
      h+='<div style="text-align:right;flex-shrink:0">';
      h+='<span class="tag '+stBadge+'">'+o.status+'</span>';
      if(o.sd)h+='<div style="font-size:10px;color:'+ddCls+';margin-top:3px;font-weight:700">D'+(dday>=0?'-':'+')+Math.abs(dday)+'</div>';
      h+='</div>';
      h+='</div>';
    });
  }
  h+='</div></div></div>';
  var old=document.getElementById('planFilterPop');if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend',h);
}
// === 공정 대기열 팝업 (구 코드 제거됨) ===

// === 공정 대기열 팝업 (아래) ===
var _pqProc='';
function openProcQueue(proc){
  if(proc==='생산완료'){openCompPopup();return;}
  _pqProc=proc;
  $('procEditTitle').textContent=proc+' 대기열 관리';
  renderProcQueue();
  $('procEditMo').classList.remove('hidden');
}
function renderProcQueue(){
  var proc=_pqProc;
  var q=getProcQueue(proc);
  var wait=q.wait,ing=q.ing,done=q.done,isExt=q.isExt;
  var isWorker=CU&&CU.role==='worker';
  var isAdmin=CU&&CU.role==='admin';
  var h='';
  // 진행중
  if(ing.length){
    h+='<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:#2563EB;padding:6px 0;border-bottom:2px solid #3B82F6">진행중 ('+ing.length+')</div>';
    ing.forEach(function(it){
      var machineTag=it.machine?'<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#DBEAFE;color:#1D4ED8;font-weight:700">'+it.machine+'</span> ':'';
      var btnLabel=isExt?'입고 확인':'완료';
      var rowBg=isExt?'#FDF4FF':'#EFF6FF';var rowBdr=isExt?'#9333EA':'#3B82F6';
      h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin:4px 0;border-radius:8px;background:'+rowBg+';border-left:3px solid '+rowBdr+'">';
      h+='<div style="flex:1"><div style="font-weight:600;font-size:13px">'+machineTag+it.pnm+'</div><div style="font-size:11px;color:#6B7280">'+it.cnm+' | '+fmt(it.qty)+'매'+(it.t1?' | 시작:'+it.t1:'')+'</div></div>';
      if(isExt&&(isWorker||isAdmin))h+='<button class="btn btn-s btn-sm" onclick="pqConfirmIn(\''+it.wid+'\','+it.pi+')" style="font-size:11px;background:#9333EA;color:#fff;border:none">입고 확인</button>';
      else if(!isExt&&isWorker)h+='<button class="btn btn-s btn-sm" onclick="pqComplete(\''+it.wid+'\','+it.pi+')" style="font-size:11px">'+btnLabel+'</button>';
      h+='</div>';
    });
    h+='</div>';
  }
  // 대기 — 외주공정은 숨김
  if(!isExt){
    var canReorder=isAdmin||isWorker; // 관리자만 순서변경, 작업자만 시작버튼
    h+='<div style="margin-bottom:12px;display:flex;flex-direction:column;min-height:0;flex:1"><div style="font-size:12px;font-weight:700;color:#EA580C;padding:6px 0;border-bottom:2px solid #F59E0B;display:flex;justify-content:space-between;flex-shrink:0"><span>대기 ('+wait.length+')</span>'+(isAdmin?'<span style="font-size:10px;font-weight:400;color:#9CA3AF">화살표로 순서 변경</span>':'')+'</div>';
    h+='<div style="overflow-y:auto;flex:1">';
    if(!wait.length)h+='<div style="padding:12px;text-align:center;color:#9CA3AF;font-size:12px">대기 작업 없음</div>';
    // 진행중 여부 (시작 버튼 활성화 판단)
    var maxIng=proc==='톰슨'?2:1;
    var canStart=isWorker&&ing.length<maxIng;
    wait.forEach(function(it,idx){
      var ddC=it.dday<=1?'#DC2626':it.dday<=3?'#EA580C':'#6B7280';
      var isFirst=idx===0,isLast=idx===wait.length-1;
      h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin:4px 0;border-radius:8px;background:#FFF7ED;border-left:3px solid #F59E0B">';
      // 관리자만 순서 화살표
      if(isAdmin){
        h+='<div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">';
        h+='<button onclick="wqMove('+idx+',-1)" style="border:none;background:'+(isFirst?'#E5E7EB':'#DBEAFE')+';color:'+(isFirst?'#D1D5DB':'#2563EB')+';font-size:10px;line-height:1;padding:3px 4px;border-radius:3px;cursor:'+(isFirst?'default':'pointer')+'" '+(isFirst?'disabled':'')+'>▲</button>';
        h+='<button onclick="wqMove('+idx+',1)" style="border:none;background:'+(isLast?'#E5E7EB':'#DBEAFE')+';color:'+(isLast?'#D1D5DB':'#2563EB')+';font-size:10px;line-height:1;padding:3px 4px;border-radius:3px;cursor:'+(isLast?'default':'pointer')+'" '+(isLast?'disabled':'')+'>▼</button>';
        h+='</div>';
      }
      h+='<div style="font-size:14px;font-weight:800;color:#D1D5DB;min-width:22px;text-align:center">'+(idx+1)+'</div>';
      h+='<div style="flex:1"><div style="font-weight:600;font-size:13px">'+it.pnm+'</div><div style="font-size:11px;color:#6B7280">'+it.cnm+' | '+fmt(it.qty)+'매 | 납기:'+it.sd+'</div></div>';
      h+='<span style="font-size:11px;color:'+ddC+';font-weight:600">D'+(it.dday>=0?'-':'+')+Math.abs(it.dday)+'</span>';
      // 작업자만 시작 버튼
      if(isWorker){
        if(canStart)h+='<button class="btn btn-p btn-sm" onclick="event.stopPropagation();pqStart(\''+it.wid+'\','+it.pi+')" style="font-size:10px;padding:3px 8px">시작</button>';
        else h+='<span style="font-size:10px;color:#9CA3AF;padding:3px 6px">진행중</span>';
      }
      h+='</div>';
    });
    h+='</div></div>';
  }else{
    // 외주공정: 대기 없음 안내
    if(!ing.length)h+='<div style="padding:20px;text-align:center;color:#9CA3AF;font-size:12px">현재 진행중인 외주 작업 없음</div>';
  }
  // 완료
  if(done.length){
    h+='<div><div style="font-size:12px;font-weight:700;color:#16A34A;padding:6px 0;border-bottom:2px solid #22C55E">금일 완료 ('+done.length+')</div>';
    done.forEach(function(it){
      h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;margin:3px 0;border-radius:6px;background:#F0FDF4;border-left:3px solid #22C55E;font-size:12px;color:#6B7280">';
      h+='<span style="flex:1">'+it.pnm+' <span style="font-size:10px">'+it.cnm+'</span></span>';
      h+='<span style="font-size:10px">'+fmt(it.qty)+'매</span>';
      h+='</div>';
    });
    h+='</div>';
  }
  $('procQueueBody').innerHTML=h;
}
// 작업자화면 화살표로 대기열 순서 변경
function wqMove(idx,dir){
  var proc=_pqProc;
  var q=getProcQueue(proc);
  var wait=q.wait;
  var newIdx=idx+dir;
  if(newIdx<0||newIdx>=wait.length)return;
  var moved=wait.splice(idx,1)[0];
  wait.splice(newIdx,0,moved);
  var os=DB.g('wo');
  wait.forEach(function(it,i){
    var o=os.find(function(x){return x.id===it.wid});
    if(o)o.pri=i+1;
  });
  DB.s('wo',os);
  renderProcQueue();
  toast('순서 변경','ok');
  if(typeof rPlan==='function')rPlan();
  if(typeof rPlanList==='function')rPlanList();
}
// 대기→시작
var _pqStartWid=null,_pqStartPi=null;
function pqStart(wid,pi){
  // 작업자만 시작 가능
  if(!CU||CU.role!=='worker'){toast('작업자만 시작할 수 있습니다','err');return;}
  var os=DB.g('wo');var o=os.find(function(x){return x.id===wid});
  if(!o)return;
  var p=o.procs[pi];
  // 이전 공정 완료 체크
  for(var j=0;j<pi;j++){
    var prev=o.procs[j];
    if(prev.tp==='out'||prev.tp==='exc')continue;
    if(prev.st!=='완료'&&prev.st!=='외주완료'&&prev.st!=='스킵'){toast('이전 공정('+prev.nm+') 미완료','err');return}
  }
  // 톰슨: 기계 선택 모달
  if(p.nm==='톰슨'){
    var t1Busy=os.some(function(x){return x.procs&&x.procs.some(function(q){return q.nm==='톰슨'&&q.st==='진행중'&&q.machine==='톰슨1'})});
    var t2Busy=os.some(function(x){return x.procs&&x.procs.some(function(q){return q.nm==='톰슨'&&q.st==='진행중'&&q.machine==='톰슨2'})});
    if(t1Busy&&t2Busy){toast('톰슨1, 톰슨2 모두 진행 중입니다','err');return;}
    _pqStartWid=wid;_pqStartPi=pi;
    var b1=$('tomsonM1Btn'),b2=$('tomsonM2Btn');
    if(b1){b1.disabled=t1Busy;b1.style.opacity=t1Busy?'.4':'1';}
    if(b2){b2.disabled=t2Busy;b2.style.opacity=t2Busy?'.4':'1';}
    $('tomsonSelectMo').classList.remove('hidden');
    return;
  }
  // 일반 공정: 이미 진행중 1개면 차단
  var ingCount=os.filter(function(x){return x.procs&&x.procs.some(function(q){return q.nm===p.nm&&q.st==='진행중'})}).length;
  if(ingCount>=1){toast(p.nm+' 공정에 이미 진행 중인 작업이 있습니다','err');return;}
  _doStart(wid,pi,null);
}
function _doStart(wid,pi,machine){
  var os=DB.g('wo');var o=os.find(function(x){return x.id===wid});if(!o)return;
  var p=o.procs[pi];
  p.st='진행중';p.t1=td()+' '+new Date().toTimeString().slice(0,5);
  if(machine)p.machine=machine;
  o.status='진행중';
  DB.s('wo',os);
  addLog('공정시작: '+o.pnm+' '+p.nm+(machine?' ('+machine+')':''));
  toast(o.pnm+' ['+p.nm+(machine?' '+machine:'')+'] 시작','ok');
  if(typeof renderProcQueue==='function')renderProcQueue();
  if(typeof rPlan==='function')rPlan();
  if(typeof rWQ==='function')rWQ();
  if(typeof rDash==='function')rDash();
}
function selectTomsonMachine(machine){
  $('tomsonSelectMo').classList.add('hidden');
  _doStart(_pqStartWid,_pqStartPi,machine);
}
// 진행→완료 (수량입력)
// 관리자용 인쇄 입고확인 (카드에서 직접 클릭)
function pqConfirmIn(wid,pi){
  var os=DB.g('wo');var o=os.find(function(x){return x.id===wid});
  if(!o)return;
  var p=o.procs[pi];
  compItem={woId:wid,pIdx:pi,newSt:'외주완료'};
  $('compNm').textContent=o.pnm;
  $('compInf').textContent=o.cnm+' | 인쇄 입고확인 | '+(p.vd||'외주');
  $('compQty').value=getWQ(o)||'';
  var compBtn=$('compSubmitBtn');if(compBtn)compBtn.textContent='입고 확인';
  $('compMo').classList.remove('hidden');
  $('compQty').focus();
}
function pqComplete(wid,pi){
  var isAdm=CU&&CU.role==='admin';
  var os=DB.g('wo');var o=os.find(function(x){return x.id===wid});
  if(!o)return;
  var p=o.procs[pi];
  var isExt=typeof isExternalProc==='function'&&isExternalProc(p.nm);
  // 작업자만 완료, 관리자는 외주입고만 가능
  if(!CU||(CU.role!=='worker'&&!(isAdm&&isExt))){toast('작업자만 완료 처리할 수 있습니다','err');return;}
  var os=DB.g('wo');var o=os.find(function(x){return x.id===wid});
  if(!o)return;
  var p=o.procs[pi];
  var isExt=typeof isExternalProc==='function'&&isExternalProc(p.nm);
  cMo('procEditMo');
  compItem={woId:wid,pIdx:pi,newSt:'완료'};
  $('compNm').textContent=o.pnm;
  $('compInf').textContent=o.cnm+' | '+p.nm+(isExt?' (외주 입고)':'');
  $('compQty').value=getWQ(o)||'';
  // 외주공정은 버튼 텍스트 '입고 확인'
  var compBtn=$('compSubmitBtn');
  if(compBtn)compBtn.textContent=isExt?'입고 확인':'완료';
  $('compMo').classList.remove('hidden');
  $('compQty').focus();
}

/* =============================================
   수주관리 (Order Management)
   ============================================= */
var _orderFilter='all';
var _orderPeriod='daily';
var _ordItems=[];

function getOrders(){return DB.g('orders')||[]}
function saveOrders(list){DB.s('orders',list)}

function genOrderNo(){
  var now=new Date();
  var prefix='SO-'+String(now.getFullYear()).slice(2)+String(now.getMonth()+1).padStart(2,'0');
  var orders=getOrders();
  var cnt=orders.filter(function(o){return o.no&&o.no.startsWith(prefix)}).length;
  return prefix+'-'+String(cnt+1).padStart(3,'0');
}

/* 서브탭 전환 */
function orderSub(tab,btn){
  // 작업지시서 등록: 탭 하이라이트 없이 바로 이동
  if(tab==='new'){goMod('mes-wo');woSub('new');return;}
  if(btn){btn.parentElement.querySelectorAll('.s-tab').forEach(function(t){t.classList.remove('on')});btn.classList.add('on')}
  ['order-list','order-new','order-monthly','order-stat'].forEach(function(id){
    var el=document.getElementById(id);if(el){el.classList.toggle('hidden',id!=='order-'+tab)}
  });
  if(tab==='list')rOrderList();
  if(tab==='monthly')rOrderMonthly();
  if(tab==='stat')rOrderStat();
}

/* 상태 필터 */
function setOrderFilter(f,btn){
  _orderFilter=f;
  btn.parentElement.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
  rOrderList();
}

/* 기간 필터 */
function setOrderPeriod(p,btn){
  _orderPeriod=p;
  btn.parentElement.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
  var dc=$('orderDateCtrl'),rc=$('orderRangeCtrl');
  if(p==='range'){dc.style.display='none';rc.style.display='flex'}
  else if(p==='all'){dc.style.display='none';rc.style.display='none'}
  else{dc.style.display='flex';rc.style.display='none'}
  if(p==='daily'&&!$('orderDateVal').value)$('orderDateVal').value=td();
  if(p==='weekly'&&!$('orderDateVal').value)$('orderDateVal').value=td();
  if(p==='monthly'&&!$('orderDateVal').value)$('orderDateVal').value=td();
  rOrderList();
}
function orderDateNav(dir){
  var v=$('orderDateVal').value;if(!v)v=td();
  var d=new Date(v);
  if(_orderPeriod==='daily')d.setDate(d.getDate()+dir);
  else if(_orderPeriod==='weekly')d.setDate(d.getDate()+dir*7);
  else if(_orderPeriod==='monthly')d.setMonth(d.getMonth()+dir);
  $('orderDateVal').value=d.toISOString().slice(0,10);
  rOrderList();
}
function _getOrderDateRange(){
  var p=_orderPeriod,v=$('orderDateVal').value||td();
  if(p==='all')return{from:null,to:null,label:'전체 기간'};
  if(p==='range'){
    var f=$('orderFrom').value,t=$('orderTo').value;
    return{from:f||null,to:t||null,label:(f||'')+'~'+(t||'')};
  }
  if(p==='daily')return{from:v,to:v,label:v};
  if(p==='weekly'){
    var ws=weekStart(v),we=weekEnd(v);
    return{from:ws,to:we,label:ws+' ~ '+we};
  }
  if(p==='monthly'){
    var ms=monthStart(v),me=monthEnd(v);
    var d=new Date(v+'T00:00:00');
    return{from:ms,to:me,label:d.getFullYear()+'년 '+(d.getMonth()+1)+'월'};
  }
  return{from:null,to:null,label:''};
}

/* 수주 목록 렌더 */
var _DAY_NM=['일','월','화','수','목','금','토'];
function _orderAmt(o){var a=0;if(o.items){o.items.forEach(function(it){a+=(Number(it.qty)||0)*(Number(it.price)||0)})}else{a=(Number(o.qty)||0)*(Number(o.price)||0)}return a}
function _orderProdNm(o){if(o.items&&o.items.length){return o.items[0].nm+(o.items.length>1?' 외 '+(o.items.length-1)+'건':'')}return o.prodNm||''}

function _makeOrderRow(o,woDateMap,now){
  var amt=_orderAmt(o);
  var prodNm=_orderProdNm(o);
  var dday='';
  if(o.shipDt&&(o.status==='수주'||o.status==='수주확정'||o.status==='생산중')){
    var dd=Math.ceil((new Date(o.shipDt+'T00:00:00')-now)/(1000*60*60*24));
    if(dd<0)dday='<span style="color:#EF4444;font-weight:700;margin-left:4px">D+'+Math.abs(dd)+'</span>';
    else if(dd<=3)dday='<span style="color:#F59E0B;font-weight:700;margin-left:4px">D-'+dd+'</span>';
    else dday='<span style="color:#94A3B8;font-size:11px;margin-left:4px">D-'+dd+'</span>';
  }
  // 진행흐름
  var woDt=o.woId&&woDateMap[o.woId]?woDateMap[o.woId]:'';
  var flow='<div style="display:flex;align-items:center;gap:3px;font-size:11px">';
  flow+='<span style="background:#DBEAFE;color:#1D4ED8;padding:1px 6px;border-radius:3px">수주 '+(o.dt?o.dt.slice(5):'')+'</span>';
  if(woDt){
    flow+='<span style="color:#CBD5E1">→</span>';
    flow+='<span style="background:#EDE9FE;color:#6D28D9;padding:1px 6px;border-radius:3px">WO '+woDt.slice(5)+'</span>';
  }else if(o.status==='수주확정'){
    flow+='<span style="color:#CBD5E1">→</span>';
    flow+='<span style="background:#F1F5F9;color:#94A3B8;padding:1px 6px;border-radius:3px">WO 미작성</span>';
  }
  if(o.status==='출고완료'){
    flow+='<span style="color:#CBD5E1">→</span>';
    flow+='<span style="background:#D1FAE5;color:#065F46;padding:1px 6px;border-radius:3px">출고완료</span>';
  }
  flow+='</div>';
  return '<tr>'+
    '<td style="font-weight:600;font-size:12px">'+(o.no||'-')+'</td>'+
    '<td style="font-weight:600">'+(o.cli||'-')+'</td>'+
    '<td>'+prodNm+'</td>'+
    '<td style="text-align:right;font-weight:600">'+fmt(amt)+'원</td>'+
    '<td>'+flow+'</td>'+
    '<td>'+(o.shipDt||'-')+dday+'</td>'+
    '<td>'+badge(o.status||'수주')+'</td>'+
    '<td><div style="display:flex;gap:3px">'+
      '<button class="btn btn-sm btn-o" onclick="editOrder(\''+o.id+'\')">수정</button>'+
      (o.status==='수주'?'<button class="btn btn-sm btn-p" onclick="confirmOrder(\''+o.id+'\')">확정</button>':'')+
      (o.status==='수주확정'?'<button class="btn btn-sm btn-s" onclick="orderToWO(\''+o.id+'\')">작업지시</button>':'')+
      '<button class="btn btn-sm btn-d" onclick="delOrder(\''+o.id+'\')">삭제</button>'+
    '</div></td></tr>';
}

function rOrderList(){
  var orders=getOrders();
  var now=new Date();
  var sch=($('orderSch').value||'').toLowerCase();
  var cliFilt=$('orderCliFilter').value;

  var range=_getOrderDateRange();
  $('orderPeriodLabel').textContent=range.label;

  // 거래처 필터 옵션
  var cliSet={};orders.forEach(function(o){if(o.cli)cliSet[o.cli]=1});
  var cliOpts='<option value="">전체 거래처</option>';
  Object.keys(cliSet).sort().forEach(function(c){cliOpts+='<option value="'+c+'"'+(c===cliFilt?' selected':'')+'>'+c+'</option>'});
  $('orderCliFilter').innerHTML=cliOpts;

  var filtered=orders.filter(function(o){
    if(_orderFilter!=='all'&&o.status!==_orderFilter)return false;
    if(sch&&(o.cli||'').toLowerCase().indexOf(sch)<0&&(_orderProdNm(o)).toLowerCase().indexOf(sch)<0&&(o.no||'').toLowerCase().indexOf(sch)<0)return false;
    if(cliFilt&&o.cli!==cliFilt)return false;
    if(range.from&&o.dt&&o.dt<range.from)return false;
    if(range.to&&o.dt&&o.dt>range.to)return false;
    return true;
  });
  filtered.sort(function(a,b){return(b.dt||'').localeCompare(a.dt||'')});

  // 기간 요약
  var pCnt=filtered.length,pAmt=0;
  filtered.forEach(function(o){pAmt+=_orderAmt(o)});
  var ps=$('orderPeriodSum');
  if(_orderPeriod!=='all'&&range.from){
    ps.innerHTML='<div style="display:flex;gap:12px;padding:8px 14px;background:#EFF6FF;border-radius:8px;border-left:4px solid #3B82F6;font-size:13px">'+
      '<span style="font-weight:700;color:#1E293B">조회기간 합계</span>'+
      '<span>건수: <b>'+pCnt+'</b>건</span>'+
      '<span>금액: <b style="color:#2563EB">'+fmt(pAmt)+'원</b></span></div>';
  }else{ps.innerHTML=''}

  // WO 날짜 맵 (woId → dt)
  var woDateMap={};
  try{DB.g('wo').forEach(function(w){if(w.id)woDateMap[w.id]=w.dt||''})}catch(e){}

  var tb=$('orderTbl').querySelector('tbody');
  if(!filtered.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--txt3)">수주 내역이 없습니다</td></tr>';return}

  // 일별: 단순 목록
  if(_orderPeriod==='daily'){
    tb.innerHTML=filtered.map(function(o){return _makeOrderRow(o,woDateMap,now)}).join('');
    return;
  }

  // 주간/월별/기간/전체: 날짜별 그룹핑
  var groups={},groupKeys=[];
  filtered.forEach(function(o){
    var d=o.dt||'없음';
    if(!groups[d]){groups[d]=[];groupKeys.push(d)}
    groups[d].push(o);
  });
  groupKeys.sort(function(a,b){return b.localeCompare(a)});

  // 주간이면 해당 주 7일 모두 표시 (빈 날짜 포함)
  if(_orderPeriod==='weekly'&&range.from&&range.to){
    var allDays=[];
    var cur=range.from;
    while(cur<=range.to){allDays.push(cur);cur=addDays(cur,1)}
    allDays.forEach(function(d){if(!groups[d]){groups[d]=[];groupKeys.push(d)}});
    groupKeys=allDays.slice().reverse();
  }

  var html='';
  groupKeys.forEach(function(d){
    var dayOrders=groups[d];
    var dayAmt=0;dayOrders.forEach(function(o){dayAmt+=_orderAmt(o)});
    var dayObj=new Date(d+'T00:00:00');
    var dayName=_DAY_NM[dayObj.getDay()]||'';
    var isToday=d===localDate(now);
    var headerBg=isToday?'#EFF6FF':'#F8FAFC';
    var headerColor=isToday?'#1D4ED8':'#374151';
    html+='<tr style="background:'+headerBg+';border-top:2px solid #E2E8F0">'+
      '<td colspan="8" style="padding:7px 12px;font-size:12px;font-weight:700;color:'+headerColor+'">'+
        d+' ('+dayName+')'+
        (isToday?' <span style="background:#3B82F6;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:4px">오늘</span>':'')+
        ' <span style="font-weight:400;color:#94A3B8;margin-left:8px">'+
          (dayOrders.length?dayOrders.length+'건 · '+fmt(dayAmt)+'원':'내역 없음')+
        '</span>'+
      '</td></tr>';
    if(dayOrders.length){
      html+=dayOrders.map(function(o){return _makeOrderRow(o,woDateMap,now)}).join('');
    }
  });
  tb.innerHTML=html;
}

/* 수주 초기화 */
function resetOrder(){
  $('ordId').value='';
  $('ordNo').value=genOrderNo();
  $('ordDt').value=new Date().toISOString().slice(0,10);
  $('ordCli').value='';
  $('ordShipDt').value='';
  $('ordDlv').value='';
  $('ordNote').value='';
  $('orderFormTitle').textContent='수주 등록';
  _ordItems=[{nm:'',spec:'',qty:'',price:'',note:''}];
  renderOrdItems();
}

/* 품목 행 렌더 */
function renderOrdItems(){
  var body=$('ordItemBody');
  body.innerHTML=_ordItems.map(function(it,i){
    var amt=(Number(it.qty)||0)*(Number(it.price)||0);
    return '<tr>'+
      '<td><input value="'+(it.nm||'')+'" onchange="_ordItems['+i+'].nm=this.value" style="width:100%;padding:4px 6px;font-size:12px;border:1px solid var(--bdr);border-radius:4px" placeholder="제품명"></td>'+
      '<td><input value="'+(it.spec||'')+'" onchange="_ordItems['+i+'].spec=this.value" style="width:80px;padding:4px 6px;font-size:12px;border:1px solid var(--bdr);border-radius:4px" placeholder="규격"></td>'+
      '<td><input type="number" value="'+(it.qty||'')+'" onchange="_ordItems['+i+'].qty=this.value;renderOrdItems()" style="width:70px;padding:4px 6px;font-size:12px;border:1px solid var(--bdr);border-radius:4px;text-align:right"></td>'+
      '<td><input type="number" value="'+(it.price||'')+'" onchange="_ordItems['+i+'].price=this.value;renderOrdItems()" style="width:80px;padding:4px 6px;font-size:12px;border:1px solid var(--bdr);border-radius:4px;text-align:right"></td>'+
      '<td style="text-align:right;font-weight:600">'+fmt(amt)+'</td>'+
      '<td><input value="'+(it.note||'')+'" onchange="_ordItems['+i+'].note=this.value" style="width:80px;padding:4px 6px;font-size:12px;border:1px solid var(--bdr);border-radius:4px"></td>'+
      '<td><button class="btn btn-sm btn-d" onclick="removeOrdItem('+i+')">X</button></td></tr>';
  }).join('');
  var total=0;_ordItems.forEach(function(it){total+=(Number(it.qty)||0)*(Number(it.price)||0)});
  $('ordTotalAmt').textContent=fmt(total);
}

function addOrdItem(){_ordItems.push({nm:'',spec:'',qty:'',price:'',note:''});renderOrdItems()}
function removeOrdItem(i){if(_ordItems.length<=1){toast('최소 1개 품목이 필요합니다','err');return}_ordItems.splice(i,1);renderOrdItems()}

/* 거래처 검색 (수주용) */
function openOrdCliSearch(){
  var clis=DB.g('clients')||[];
  if(!clis.length){toast('거래처를 먼저 등록하세요','err');return}
  var el=document.createElement('div');el.className='mo-bg';el.id='ordCliSearchMo';
  el.innerHTML='<div style="background:#fff;border-radius:14px;width:500px;max-height:70vh;display:flex;flex-direction:column;box-shadow:0 25px 50px rgba(0,0,0,.15)">'+
    '<div style="padding:12px 16px;border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700">거래처 선택</span><button onclick="document.getElementById(\'ordCliSearchMo\').remove()" style="background:none;border:none;font-size:18px;cursor:pointer">&times;</button></div>'+
    '<div style="padding:8px 16px"><input id="ordCliSchInput" placeholder="거래처명 검색" oninput="filterOrdCli()" style="width:100%;padding:8px 12px;border:1px solid var(--bdr);border-radius:8px;font-size:13px"></div>'+
    '<div id="ordCliList" style="flex:1;overflow-y:auto;padding:0 16px 12px"></div></div>';
  document.body.appendChild(el);
  filterOrdCli();
  document.getElementById('ordCliSchInput').focus();
}
function filterOrdCli(){
  var clis=DB.g('clients')||[];
  var q=(document.getElementById('ordCliSchInput').value||'').toLowerCase();
  var list=clis.filter(function(c){return!q||(c.nm||'').toLowerCase().indexOf(q)>=0});
  document.getElementById('ordCliList').innerHTML=list.map(function(c){
    return '<div onclick="selectOrdCli(\''+c.nm.replace(/'/g,"\\'")+'\')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #F1F5F9;font-size:13px;transition:background .1s" onmouseover="this.style.background=\'#F8FAFC\'" onmouseout="this.style.background=\'\'">'+
      '<div style="font-weight:600">'+c.nm+'</div>'+
      (c.addr?'<div style="font-size:11px;color:#64748B">'+c.addr+'</div>':'')+
    '</div>';
  }).join('')||'<div style="padding:20px;text-align:center;color:#94A3B8">검색 결과 없음</div>';
}
function selectOrdCli(nm){
  $('ordCli').value=nm;
  var el=document.getElementById('ordCliSearchMo');if(el)el.remove();
}

/* 수주 저장 */
function saveOrder(){
  var cli=$('ordCli').value;
  if(!cli){toast('거래처를 선택하세요','err');return}
  var hasItem=_ordItems.some(function(it){return it.nm&&it.qty});
  if(!hasItem){toast('최소 1개 품목의 제품명과 수량을 입력하세요','err');return}

  var orders=getOrders();
  var id=$('ordId').value;
  var isEdit=!!id;

  var obj={
    id:id||'ord_'+Date.now(),
    no:$('ordNo').value,
    dt:$('ordDt').value,
    cli:cli,
    shipDt:$('ordShipDt').value,
    dlv:$('ordDlv').value,
    note:$('ordNote').value,
    items:_ordItems.filter(function(it){return it.nm}),
    status:'수주',
    cdt:new Date().toISOString()
  };

  if(isEdit){
    var idx=orders.findIndex(function(o){return o.id===id});
    if(idx>=0){obj.status=orders[idx].status;obj.woId=orders[idx].woId;orders[idx]=obj}
  }else{
    orders.push(obj);
  }
  saveOrders(orders);
  toast(isEdit?'수주 수정 완료':'수주 등록 완료','ok');
  if(isEdit){orderSub('list');return}
  // 신규 저장 → 작업지시서 바로 작성 여부 묻기
  _askWOAfterOrder(obj);
}

function _askWOAfterOrder(o){
  var el=document.createElement('div');
  el.id='askWOMo';
  el.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:9999';
  el.innerHTML=
    '<div style="background:#fff;border-radius:16px;width:380px;box-shadow:0 25px 60px rgba(0,0,0,.2);overflow:hidden">'+
      '<div style="background:#3B82F6;padding:16px 20px">'+
        '<div style="font-size:15px;font-weight:700;color:#fff">수주 등록 완료</div>'+
        '<div style="font-size:12px;color:#BFDBFE;margin-top:2px">'+o.no+' · '+(o.cli||'')+'</div>'+
      '</div>'+
      '<div style="padding:20px">'+
        '<div style="font-size:14px;color:#1E293B;margin-bottom:16px">작업지시서를 바로 작성하시겠습니까?</div>'+
        '<div style="display:flex;gap:8px">'+
          '<button onclick="_doWONow(\''+o.id+'\')" style="flex:1;padding:10px;background:#3B82F6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">지금 작성</button>'+
          '<button onclick="_skipWO()" style="flex:1;padding:10px;background:#F1F5F9;color:#64748B;border:none;border-radius:8px;font-size:14px;cursor:pointer">나중에</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  document.body.appendChild(el);
}

function _doWONow(ordId){
  var el=document.getElementById('askWOMo');if(el)el.remove();
  var orders=getOrders();
  var o=orders.find(function(x){return x.id===ordId});
  if(!o)return;
  // 수주확정으로 변경 후 WO 작성
  o.status='수주확정';saveOrders(orders);
  orderToWO(ordId);
}

function _skipWO(){
  var el=document.getElementById('askWOMo');if(el)el.remove();
  orderSub('list');
}

/* 수주 수정 */
function editOrder(id){
  var orders=getOrders();
  var o=orders.find(function(x){return x.id===id});
  if(!o)return;
  $('ordId').value=o.id;
  $('ordNo').value=o.no||'';
  $('ordDt').value=o.dt||'';
  $('ordCli').value=o.cli||'';
  $('ordShipDt').value=o.shipDt||'';
  $('ordDlv').value=o.dlv||'';
  $('ordNote').value=o.note||'';
  $('orderFormTitle').textContent='수주 수정';
  _ordItems=o.items&&o.items.length?o.items.map(function(it){return{nm:it.nm,spec:it.spec,qty:it.qty,price:it.price,note:it.note}}):[{nm:o.prodNm||'',spec:'',qty:o.qty||'',price:o.price||'',note:''}];
  renderOrdItems();
  orderSub('new');
}

/* 수주 확정 */
function confirmOrder(id){
  var orders=getOrders();
  var o=orders.find(function(x){return x.id===id});
  if(!o)return;
  if(!confirm(o.no+' 수주를 확정하시겠습니까?'))return;
  o.status='수주확정';
  saveOrders(orders);
  toast('수주 확정','ok');
  rOrderList();
}

/* 수주 삭제 */
function delOrder(id){
  if(!confirm('이 수주를 삭제하시겠습니까?'))return;
  var orders=getOrders().filter(function(o){return o.id!==id});
  saveOrders(orders);
  toast('수주 삭제','ok');
  rOrderList();
}

/* 수주 → 작업지시서 변환 */
function orderToWO(id){
  var orders=getOrders();
  var o=orders.find(function(x){return x.id===id});
  if(!o)return;

  var items=(o.items||[]).filter(function(it){return it.nm});
  if(!items.length){toast('품목이 없습니다','err');return}

  // 품목이 여러 개면 선택 팝업
  if(items.length>1){
    var el=document.createElement('div');el.className='mo-bg';el.id='ordToWoMo';
    var listH=items.map(function(it,i){
      return '<div onclick="selectOrdItem(\''+id+'\','+i+')" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #F1F5F9;display:flex;justify-content:space-between;align-items:center;transition:background .1s" onmouseover="this.style.background=\'#F8FAFC\'" onmouseout="this.style.background=\'\'">'
        +'<div><div style="font-weight:600;font-size:13px">'+(it.nm||'')+'</div><div style="font-size:11px;color:#64748B">'+(it.spec||'')+(it.qty?' | '+fmt(it.qty)+'매':'')+'</div></div>'
        +'<span style="font-size:12px;color:#3B82F6;font-weight:600">선택 ›</span></div>';
    }).join('');
    el.innerHTML='<div style="background:#fff;border-radius:14px;width:420px;box-shadow:0 25px 50px rgba(0,0,0,.15)">'
      +'<div style="padding:14px 16px;border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center"><span style="font-weight:700">작업지시서 생성할 품목 선택</span><button onclick="document.getElementById(\'ordToWoMo\').remove()" style="background:none;border:none;font-size:18px;cursor:pointer">&times;</button></div>'
      +'<div style="padding:4px 0;max-height:60vh;overflow-y:auto">'+listH+'</div>'
      +'<div style="padding:10px 14px;border-top:1px solid var(--bdr);font-size:11px;color:#94A3B8">품목마다 별도 작업지시서가 생성됩니다</div></div>';
    document.body.appendChild(el);
    window._orderToWoId=id;
    return;
  }

  // 단일 품목
  _fillWOFromOrder(o,items[0]);
}
function selectOrdItem(ordId,idx){
  var el=document.getElementById('ordToWoMo');if(el)el.remove();
  var o=getOrders().find(function(x){return x.id===ordId});
  if(!o)return;
  var items=(o.items||[]).filter(function(it){return it.nm});
  if(items[idx])_fillWOFromOrder(o,items[idx]);
}
function _fillWOFromOrder(o,it){
  goMod('mes-wo');woSub('new');
  setTimeout(function(){
    $('woCli').value=o.cli||'';
    $('woProd').value=it.nm||'';
    $('woFQ').value=it.qty||'';
    $('woQM').value=it.qty||'';
    $('woShip').value=o.shipDt||o.due||'';
    $('woDlv').value=o.dlv||'';
    $('woNote').value='수주번호: '+(o.no||'')+(o.note?' / '+o.note:'');
    if($('woPrice'))$('woPrice').value=o.price||'';
    _updateWoAmt();
    // 수주 ID 연결 (hidden field)
    if($('woOrdId'))$('woOrdId').value=o.id;
    // 수주 상태를 생산중으로
    var orders=getOrders();
    var ord=orders.find(function(x){return x.id===o.id});
    if(ord){ord.status='생산중';saveOrders(orders)}
    toast('작업지시서 등록 화면으로 이동합니다. 공정 설정 후 저장하세요.');
  },100);
}

/* ===== 월별 수주 현황 ===== */
var _orderSelMonth=''; // 선택된 월 (YYYY-MM)

function rOrderMonthly(selMonth){
  var orders=getOrders();
  // 데이터 존재하는 12개월 범위 계산 (최근 12개월 기준)
  var now=new Date();
  var months=[];
  for(var i=11;i>=0;i--){
    var d=new Date(now.getFullYear(),now.getMonth()-i,1);
    months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'));
  }

  // 월별 집계
  var mData={};
  months.forEach(function(m){mData[m]={cnt:0,amt:0,qty:0,st:{수주:0,수주확정:0,생산중:0,출고완료:0,취소:0}}});
  orders.forEach(function(o){
    var ym=o.dt?o.dt.slice(0,7):'';
    if(!mData[ym])return;
    mData[ym].cnt++;
    var amt=0,qty=0;
    if(o.items){o.items.forEach(function(it){amt+=(Number(it.qty)||0)*(Number(it.price)||0);qty+=Number(it.qty)||0})}
    else{amt=(Number(o.qty)||0)*(Number(o.price)||0);qty=Number(o.qty)||0}
    mData[ym].amt+=amt;
    mData[ym].qty+=qty;
    var st=o.status||'수주';
    if(mData[ym].st[st]!==undefined)mData[ym].st[st]++;
    else mData[ym].st[st]=1;
  });

  // 선택 월 초기화 (기본: 현재 월)
  if(selMonth){_orderSelMonth=selMonth}
  else if(!_orderSelMonth||months.indexOf(_orderSelMonth)<0){_orderSelMonth=months[months.length-1]}

  var maxAmt=0;
  months.forEach(function(m){if(mData[m].amt>maxAmt)maxAmt=mData[m].amt});
  if(maxAmt===0)maxAmt=1;

  // ── 바 차트 (SVG) ──
  var chartW=760,chartH=140,barW=40,gap=16;
  var leftPad=50,topPad=10,botPad=35;
  var innerH=chartH-topPad-botPad;
  var totalW=leftPad+(barW+gap)*months.length;

  var svgBars=months.map(function(m,i){
    var d=mData[m];
    var barH=d.amt>0?Math.max(4,Math.round(d.amt/maxAmt*innerH)):2;
    var x=leftPad+i*(barW+gap);
    var y=topPad+innerH-barH;
    var isSel=m===_orderSelMonth;
    var fill=isSel?'#3B82F6':d.cnt>0?'#93C5FD':'#E2E8F0';
    var stroke=isSel?'#1D4ED8':'none';
    var label=m.slice(5)+'월';
    return '<g onclick="openOrderMonthPopup(\''+m+'\')" style="cursor:pointer">'+
      '<rect x="'+x+'" y="'+(topPad+innerH-Math.max(barH,2))+'" width="'+barW+'" height="'+Math.max(barH,2)+'" rx="4" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>'+
      (d.cnt>0?'<text x="'+(x+barW/2)+'" y="'+(topPad+innerH-barH-5)+'" text-anchor="middle" font-size="10" fill="'+(isSel?'#1D4ED8':'#64748B')+'">'+d.cnt+'</text>':'')+
      '<text x="'+(x+barW/2)+'" y="'+(topPad+innerH+15)+'" text-anchor="middle" font-size="11" fill="'+(isSel?'#1D4ED8':'#374151')+'" font-weight="'+(isSel?'700':'400')+'">'+label+'</text>'+
      (d.amt>0?'<text x="'+(x+barW/2)+'" y="'+(topPad+innerH+26)+'" text-anchor="middle" font-size="9" fill="'+(isSel?'#3B82F6':'#94A3B8')+'">'+Math.round(d.amt/10000)+'만</text>':'')+
      '</g>';
  }).join('');

  // Y축 눈금선 (3개)
  var yLines='';
  [0.25,0.5,0.75,1.0].forEach(function(r){
    var y=topPad+innerH-Math.round(r*innerH);
    yLines+='<line x1="'+leftPad+'" y1="'+y+'" x2="'+(leftPad+(barW+gap)*12)+'" y2="'+y+'" stroke="#F1F5F9" stroke-width="1"/>';
    yLines+='<text x="'+(leftPad-4)+'" y="'+(y+3)+'" text-anchor="end" font-size="9" fill="#94A3B8">'+Math.round(maxAmt*r/10000)+'만</text>';
  });

  var chartSvg='<div style="overflow-x:auto"><svg width="'+totalW+'" height="'+chartH+'" style="display:block;min-width:400px">'+
    yLines+svgBars+'</svg></div>';

  // ── 월별 카드 그리드 ──
  var stColors={수주:'#3B82F6',수주확정:'#8B5CF6',생산중:'#F59E0B',출고완료:'#10B981',취소:'#94A3B8'};
  var cards=months.map(function(m){
    var d=mData[m];
    var isSel=m===_orderSelMonth;
    var yr=m.slice(0,4),mo=m.slice(5);
    var border=isSel?'2px solid #3B82F6':'1px solid #E2E8F0';
    var bg=isSel?'#EFF6FF':'#fff';
    // 상태 미니바
    var total=d.cnt||1;
    var stBar=Object.keys(stColors).map(function(st){
      var w=Math.round((d.st[st]||0)/total*100);
      return w>0?'<div style="width:'+w+'%;height:100%;background:'+stColors[st]+'" title="'+st+': '+(d.st[st]||0)+'건"></div>':'';
    }).join('');
    return '<div onclick="openOrderMonthPopup(\''+m+'\')" style="border:'+border+';background:'+bg+';border-radius:10px;padding:10px 12px;cursor:pointer;transition:all .15s">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
        '<span style="font-size:13px;font-weight:700;color:'+(isSel?'#1D4ED8':'#1E293B')+'">'+yr+'년 '+mo+'월</span>'+
        '<span style="font-size:12px;font-weight:600;color:'+(isSel?'#3B82F6':'#64748B')+'">'+d.cnt+'건</span>'+
      '</div>'+
      '<div style="font-size:14px;font-weight:700;color:'+(isSel?'#2563EB':'#334155')+';margin-bottom:4px">'+fmt(d.amt)+'원</div>'+
      '<div style="font-size:11px;color:#94A3B8;margin-bottom:5px">수량: '+fmt(d.qty)+'</div>'+
      '<div style="display:flex;height:5px;border-radius:3px;overflow:hidden;background:#F1F5F9">'+stBar+'</div>'+
    '</div>';
  }).join('');

  // ── 선택 월 수주 목록 ──
  var html=
    '<div class="card" style="margin-bottom:12px">'+
      '<div style="font-size:14px;font-weight:700;margin-bottom:12px;color:#1E293B">월별 수주 추이 (최근 12개월)</div>'+
      chartSvg+
      '<div style="display:flex;gap:8px;margin-top:8px;font-size:11px;color:#94A3B8">'+
        '<span style="display:flex;align-items:center;gap:3px"><span style="display:inline-block;width:10px;height:10px;background:#3B82F6;border-radius:2px"></span> 선택된 월</span>'+
        '<span style="display:flex;align-items:center;gap:3px"><span style="display:inline-block;width:10px;height:10px;background:#93C5FD;border-radius:2px"></span> 수주 있음</span>'+
        '<span style="display:flex;align-items:center;gap:3px"><span style="display:inline-block;width:10px;height:10px;background:#E2E8F0;border-radius:2px"></span> 수주 없음</span>'+
        '<span style="margin-left:8px">막대/카드 클릭 시 해당 월 수주 목록 보기</span>'+
      '</div>'+
    '</div>'+
    '<div class="card">'+
      '<div style="font-size:14px;font-weight:700;margin-bottom:10px">월별 현황 <span style="font-size:12px;font-weight:400;color:#94A3B8">— 클릭하면 수주 목록을 볼 수 있어요</span></div>'+
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'+cards+'</div>'+
      '<div style="margin-top:8px;font-size:11px;color:#94A3B8;display:flex;gap:12px">'+
        Object.keys(stColors).map(function(st){return '<span style="display:flex;align-items:center;gap:3px"><span style="display:inline-block;width:8px;height:8px;background:'+stColors[st]+';border-radius:50%"></span>'+st+'</span>'}).join('')+
      '</div>'+
    '</div>';

  // 보고서 탭과 수주관리 탭 모두 렌더링
  if($('orderMonthlyWrap'))$('orderMonthlyWrap').innerHTML=html;
  if($('rptOrdMonthlyWrap'))$('rptOrdMonthlyWrap').innerHTML=html;
}

function openOrderMonthPopup(month){
  var orders=getOrders();
  var selOrders=orders.filter(function(o){return o.dt&&o.dt.slice(0,7)===month});
  selOrders.sort(function(a,b){return(b.dt||'').localeCompare(a.dt||'')});
  var yr=month.slice(0,4),mo=month.slice(5);
  var totalAmt=0;
  selOrders.forEach(function(o){
    if(o.items){o.items.forEach(function(it){totalAmt+=(Number(it.qty)||0)*(Number(it.price)||0)})}
    else{totalAmt+=(Number(o.qty)||0)*(Number(o.price)||0)}
  });
  var rows=selOrders.length?selOrders.map(function(o){
    var amt=0,prodNm='',qty=0;
    if(o.items&&o.items.length){
      o.items.forEach(function(it){amt+=(Number(it.qty)||0)*(Number(it.price)||0);qty+=Number(it.qty)||0});
      prodNm=o.items[0].nm+(o.items.length>1?' 외 '+(o.items.length-1)+'건':'');
    }else{amt=(Number(o.qty)||0)*(Number(o.price)||0);qty=Number(o.qty)||0;prodNm=o.prodNm||''}
    var woLink=o.woNo?'<a href="#" onclick="cMo(\'ordMonthPopMo\');goMod(\'mes-wo\');return false" style="color:#3B82F6;font-weight:600">'+o.woNo+'</a>':'-';
    return '<tr><td style="font-weight:600">'+(o.no||'-')+'</td><td>'+(o.cli||'-')+'</td><td>'+prodNm+'</td><td style="text-align:right">'+fmt(qty)+'</td><td style="text-align:right;font-weight:600;color:#2563EB">'+fmt(amt)+'원</td><td>'+(o.shipDt||'-')+'</td><td style="text-align:center">'+woLink+'</td><td>'+badge(o.status||'수주')+'</td></tr>';
  }).join(''):'<tr><td colspan="8" style="text-align:center;padding:20px;color:#94A3B8">수주 내역이 없습니다</td></tr>';
  var h='<div class="cmb" style="width:780px;max-height:85vh;display:flex;flex-direction:column">';
  h+='<div class="mh" style="flex-shrink:0"><h3>'+yr+'년 '+mo+'월 수주 목록</h3><button class="mc" onclick="cMo(\'ordMonthPopMo\')">&times;</button></div>';
  h+='<div style="padding:8px 16px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;display:flex;gap:16px">';
  h+='<span style="font-size:13px;color:#64748B">총 <b style="color:#1E293B">'+selOrders.length+'건</b></span>';
  h+='<span style="font-size:13px;color:#64748B">총액 <b style="color:#2563EB">'+fmt(totalAmt)+'원</b></span></div>';
  h+='<div style="padding:12px;overflow-y:auto;flex:1"><div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>수주번호</th><th>거래처</th><th>제품</th><th>수량</th><th>금액</th><th>납기일</th><th>작업지시</th><th>상태</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
  var old=document.getElementById('ordMonthPopMo');if(old)old.remove();
  var el=document.createElement('div');el.id='ordMonthPopMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('ordMonthPopMo')};
  document.body.appendChild(el);
}

/* 수주 현황 통계 */
function rOrderStat(){
  var orders=getOrders();
  var now=new Date();
  var thisYear=String(now.getFullYear());
  var lastYear=String(now.getFullYear()-1);

  // 연간 집계
  var thisYrCnt=0,thisYrAmt=0,lastYrCnt=0,lastYrAmt=0;
  orders.forEach(function(o){
    var yr=o.dt?o.dt.slice(0,4):'';
    var amt=0;
    if(o.items){o.items.forEach(function(it){amt+=(Number(it.qty)||0)*(Number(it.price)||0)})}
    else{amt=(Number(o.qty)||0)*(Number(o.price)||0)}
    if(yr===thisYear){thisYrCnt++;thisYrAmt+=amt}
    if(yr===lastYear){lastYrCnt++;lastYrAmt+=amt}
  });
  var growthAmt=lastYrAmt>0?Math.round((thisYrAmt-lastYrAmt)/lastYrAmt*100):null;
  var growthCnt=lastYrCnt>0?Math.round((thisYrCnt-lastYrCnt)/lastYrCnt*100):null;
  var growthAmtStr=growthAmt===null?'-':(growthAmt>=0?'<span style="color:#10B981">+'+growthAmt+'%</span>':'<span style="color:#EF4444">'+growthAmt+'%</span>');
  var growthCntStr=growthCnt===null?'-':(growthCnt>=0?'<span style="color:#10B981">+'+growthCnt+'%</span>':'<span style="color:#EF4444">'+growthCnt+'%</span>');

  var sumHtml=
    '<div class="sb"><div class="l">'+thisYear+'년 수주건수</div><div class="v">'+thisYrCnt+'건 <small style="font-size:12px;font-weight:400">전년비 '+growthCntStr+'</small></div></div>'+
    '<div class="sb"><div class="l">'+thisYear+'년 수주금액</div><div class="v">'+fmt(thisYrAmt)+'원 <small style="font-size:12px;font-weight:400">전년비 '+growthAmtStr+'</small></div></div>'+
    '<div class="sb"><div class="l">'+lastYear+'년 수주건수</div><div class="v" style="color:#94A3B8">'+lastYrCnt+'건</div></div>'+
    '<div class="sb"><div class="l">'+lastYear+'년 수주금액</div><div class="v" style="color:#94A3B8">'+fmt(lastYrAmt)+'원</div></div>';
  if($('orderStatSum'))$('orderStatSum').innerHTML=sumHtml;

  // 거래처별
  var byCliMap={};
  orders.forEach(function(o){
    if(!o.cli)return;
    if(!byCliMap[o.cli])byCliMap[o.cli]={cnt:0,amt:0};
    byCliMap[o.cli].cnt++;
    if(o.items){o.items.forEach(function(it){byCliMap[o.cli].amt+=(Number(it.qty)||0)*(Number(it.price)||0)})}
  });
  var cliArr=Object.keys(byCliMap).map(function(k){return{nm:k,cnt:byCliMap[k].cnt,amt:byCliMap[k].amt}}).sort(function(a,b){return b.amt-a.amt});
  var cliHtml=cliArr.length?
    '<table class="dt"><thead><tr><th>거래처</th><th>건수</th><th>금액</th></tr></thead><tbody>'+
    cliArr.map(function(c){return '<tr><td>'+c.nm+'</td><td>'+c.cnt+'건</td><td style="text-align:right;font-weight:600">'+fmt(c.amt)+'원</td></tr>'}).join('')+
    '</tbody></table>':'<div style="padding:20px;text-align:center;color:var(--txt3)">데이터 없음</div>';
  if($('orderByCliArea'))$('orderByCliArea').innerHTML=cliHtml;

  // 월별 추이
  var byMonth={};
  orders.forEach(function(o){
    if(!o.dt)return;
    var m=o.dt.slice(0,7);
    if(!byMonth[m])byMonth[m]={cnt:0,amt:0};
    byMonth[m].cnt++;
    if(o.items){o.items.forEach(function(it){byMonth[m].amt+=(Number(it.qty)||0)*(Number(it.price)||0)})}
  });
  var mArr=Object.keys(byMonth).sort().reverse().slice(0,12).reverse();
  var monthHtml=mArr.length?
    '<table class="dt"><thead><tr><th>월</th><th>건수</th><th>금액</th></tr></thead><tbody>'+
    mArr.map(function(m){return '<tr><td>'+m+'</td><td>'+byMonth[m].cnt+'건</td><td style="text-align:right;font-weight:600">'+fmt(byMonth[m].amt)+'원</td></tr>'}).join('')+
    '</tbody></table>':'<div style="padding:20px;text-align:center;color:var(--txt3)">데이터 없음</div>';
  if($('orderByMonthArea'))$('orderByMonthArea').innerHTML=monthHtml;

  // 제품별
  var byProd={};
  orders.forEach(function(o){
    if(!o.items)return;
    o.items.forEach(function(it){
      if(!it.nm)return;
      if(!byProd[it.nm])byProd[it.nm]={qty:0,amt:0,cnt:0};
      byProd[it.nm].qty+=Number(it.qty)||0;
      byProd[it.nm].amt+=(Number(it.qty)||0)*(Number(it.price)||0);
      byProd[it.nm].cnt++;
    });
  });
  var pArr=Object.keys(byProd).map(function(k){return{nm:k,qty:byProd[k].qty,amt:byProd[k].amt,cnt:byProd[k].cnt}}).sort(function(a,b){return b.amt-a.amt});
  var prodHtml=pArr.length?
    '<table class="dt"><thead><tr><th>제품명</th><th>수주횟수</th><th>총수량</th><th>총금액</th></tr></thead><tbody>'+
    pArr.map(function(p){return '<tr><td>'+p.nm+'</td><td>'+p.cnt+'회</td><td style="text-align:right">'+fmt(p.qty)+'</td><td style="text-align:right;font-weight:600">'+fmt(p.amt)+'원</td></tr>'}).join('')+
    '</tbody></table>':'<div style="padding:20px;text-align:center;color:var(--txt3)">데이터 없음</div>';
  if($('orderByProdArea'))$('orderByProdArea').innerHTML=prodHtml;

  // 보고서 탭 이중 렌더링
  if($('rptOrdStatWrap')){
    $('rptOrdStatWrap').innerHTML=
      '<div class="sg" style="margin-bottom:12px">'+sumHtml+'</div>'+
      '<div class="card" style="margin-bottom:12px"><div class="card-t">거래처별 수주현황</div>'+cliHtml+'</div>'+
      '<div class="card" style="margin-bottom:12px"><div class="card-t">월별 수주추이</div>'+monthHtml+'</div>'+
      '<div class="card"><div class="card-t">제품별 수주현황</div>'+prodHtml+'</div>';
  }
}

/* 수주 엑셀 내보내기 */
function csvCell(v){var s=String(v==null?'':v);if(s.indexOf(',')>=0||s.indexOf('"')>=0||s.indexOf('\n')>=0)s='"'+s.replace(/"/g,'""')+'"';return s}
function exportOrderCSV(){
  var orders=getOrders();
  if(!orders.length){toast('수주 데이터가 없습니다','err');return}
  var rows=[['수주번호','수주일','거래처','제품','규격','수량','단가','금액','납기일','상태','비고']];
  orders.forEach(function(o){
    var items=o.items&&o.items.length?o.items:[{nm:o.prodNm||'',spec:'',qty:o.qty||0,price:o.price||0,note:''}];
    items.forEach(function(it){
      rows.push([o.no,o.dt,o.cli,it.nm||'',it.spec||'',it.qty||0,it.price||0,(Number(it.qty)||0)*(Number(it.price)||0),o.shipDt||'',o.status||'',o.note||'']);
    });
  });
  var csv='\uFEFF'+rows.map(function(r){return r.map(csvCell).join(',')}).join('\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='수주내역_'+td()+'.csv';a.click();
  toast('엑셀 내보내기 완료','ok');
}

/* 메인 렌더 */
function rOrder(){
  if(!$('orderDateVal').value)$('orderDateVal').value=td();
  if(!$('shipDateVal').value)$('shipDateVal').value=td();
  orderSub('list');
}

// ===== 이력조회 =====
function rLotHist(){
  var sch=($('lotSch')?$('lotSch').value:'').trim().toLowerCase();
  var area=$('lotResult');if(!area)return;
  if(!sch){
    area.innerHTML='<div class="empty-state"><div class="msg">제품명을 검색하세요</div><div class="sub">인쇄소 · 작업수량 · 출고량 · 불량 이력을 한눈에 확인</div></div>';
    return;
  }
  var wos=DB.g('wo');
  var shipLogs=DB.g('shipLog');
  var matched=wos.filter(function(o){
    return o.pnm&&o.pnm.toLowerCase().includes(sch);
  }).sort(function(a,b){return b.cat>a.cat?1:-1});
  if(!matched.length){
    area.innerHTML='<div class="empty-state"><div class="msg">검색 결과 없음</div><div class="sub">"'+sch+'"에 해당하는 제품이 없습니다</div></div>';
    return;
  }
  var rows=matched.map(function(o){
    // 인쇄소 추출 (외주 공정 또는 인쇄 공정의 업체명)
    var procs=o.procs||[];
    var printProc=procs.find(function(p){return p.nm==='인쇄'&&p.vd})||procs.find(function(p){return p.tp==='out'&&p.vd})||procs.find(function(p){return p.vd&&p.vd.trim()});
    var printer=printProc?printProc.vd:'-';
    // 작업 수량 (정매+여분)
    var papers=o.papers&&o.papers.length?o.papers:null;
    var workQty=0,isMulti=false;
    if(papers&&papers.length===1){
      workQty=(papers[0].qm||0)+(papers[0].qe||0);
    }else if(papers&&papers.length>1){
      workQty=o.fq||0;isMulti=true;
    }else{
      workQty=(o.qm||0)+(o.qe||0);
    }
    // 출고 집계
    var logs=shipLogs.filter(function(s){return s.woId===o.id});
    var shipQty=logs.reduce(function(s,r){return s+(r.qty||0)},0);
    var defectQty=logs.reduce(function(s,r){return s+(r.defect||0)},0);
    var loss=workQty>0?workQty-shipQty:0;
    var lastShip=logs.length?logs.slice().sort(function(a,b){return b.dt>a.dt?1:-1})[0].dt:'-';
    var defectBd=defectQty>0?'bd-d':logs.length>0?'bd-s':'bd-w';
    var defectTxt=defectQty>0?'불량 '+fmt(defectQty):logs.length>0?'정상':'미출고';
    return '<tr onclick="showLotDetail(\''+o.id+'\')" style="cursor:pointer">'
      +'<td style="font-weight:700;color:var(--pri);white-space:nowrap">'+o.wn+'</td>'
      +'<td style="font-weight:700">'+o.pnm+'</td>'
      +'<td>'+o.cnm+'</td>'
      +'<td style="font-weight:600;color:#7C3AED">'+printer+'</td>'
      +'<td style="text-align:right">'+(workQty>0?fmt(workQty)+(isMulti?' <span style="font-size:10px;color:var(--txt3)">(완제품기준)</span>':''):'<span style="color:var(--txt3)">-</span>')+'</td>'
      +'<td style="text-align:right;font-weight:700">'+fmt(shipQty)+'</td>'
      +'<td style="text-align:right;color:var(--dan);font-weight:'+(defectQty>0?700:400)+'">'+(defectQty>0?fmt(defectQty):'-')+'</td>'
      +'<td style="text-align:right;color:var(--txt3)">'+fmt(loss)+'</td>'
      +'<td style="white-space:nowrap">'+lastShip+'</td>'
      +'<td><span class="bd '+defectBd+'">'+defectTxt+'</span></td>'
      +'</tr>';
  }).join('');
  area.innerHTML='<div style="margin-bottom:10px;color:var(--txt3);font-size:13px">검색결과 <b style="color:var(--txt)">'+matched.length+'건</b></div>'
    +'<div style="overflow-x:auto"><table class="dt"><thead><tr>'
    +'<th>지시번호</th><th>제품명</th><th>거래처</th><th>인쇄소</th><th>작업수량</th><th>출고량</th><th>불량</th><th>손실</th><th>최근출고</th><th>상태</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

function showLotDetail(woId){
  var o=DB.g('wo').find(function(x){return x.id===woId});if(!o)return;
  var shipLogs=DB.g('shipLog').filter(function(s){return s.woId===woId});
  var claims=DB.g('claims').filter(function(c){return c.pnm===o.pnm&&c.cnm===o.cnm});
  // 공정/인쇄소
  var procs=(o.procs||[]).filter(function(p){return p.vd&&p.vd.trim()});
  var procsHtml=procs.length?'<div style="margin-top:12px"><div style="font-size:12px;font-weight:700;color:var(--txt3);margin-bottom:6px">공정 / 인쇄소</div>'
    +procs.map(function(p){return'<div style="font-size:12px;padding:5px 10px;background:#EDE9FE;border-radius:8px;margin-bottom:4px"><b style="color:#7C3AED">'+p.nm+'</b>'+(p.mt?' · '+p.mt:'')+' → <b>'+p.vd+'</b></div>'}).join('')+'</div>':'';
  // 종이 목록
  var papersHtml='';
  if(o.papers&&o.papers.length){
    papersHtml='<div style="margin-top:12px"><div style="font-size:12px;font-weight:700;color:var(--txt3);margin-bottom:6px">종이 구성</div>'
      +o.papers.map(function(p,i){
        var total=(p.qm||0)+(p.qe||0);
        return'<div style="font-size:12px;padding:5px 10px;background:var(--bg2);border-radius:8px;margin-bottom:4px">'
          +(o.papers.length>1?'<b>종이'+(i+1)+'</b>: ':'')+( p.paper||'미기재')+(p.spec?' ('+p.spec+')':'')
          +' — 정매 <b>'+fmt(p.qm||0)+'</b>매 + 여분 <b>'+fmt(p.qe||0)+'</b>매 = <b style="color:var(--pri)">'+fmt(total)+'</b>매'
          +'</div>';
      }).join('')+'</div>';
  }
  // 출고 이력
  var sortedLogs=shipLogs.slice().sort(function(a,b){return b.dt>a.dt?1:-1});
  var totalShip=sortedLogs.reduce(function(s,r){return s+(r.qty||0)},0);
  var totalDefect=sortedLogs.reduce(function(s,r){return s+(r.defect||0)},0);
  var shipHtml=sortedLogs.length
    ?'<div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>출고일</th><th>출고량</th><th>양품</th><th>불량</th><th>입고처</th></tr></thead><tbody>'
      +sortedLogs.map(function(s){
        return'<tr><td>'+s.dt+'</td><td style="font-weight:700">'+fmt(s.qty)+'</td><td style="color:var(--suc)">'+fmt(s.good||s.qty)+'</td><td style="color:var(--dan);font-weight:'+(s.defect?700:400)+'">'+(s.defect||0)+'</td><td>'+(s.dlv||'-')+'</td></tr>';
      }).join('')
      +'<tr style="background:var(--bg2);font-weight:700"><td>합계</td><td>'+fmt(totalShip)+'</td><td style="color:var(--suc)">'+fmt(totalShip-totalDefect)+'</td><td style="color:var(--dan)">'+(totalDefect||0)+'</td><td></td></tr>'
      +'</tbody></table></div>'
    :'<div style="color:var(--txt3);font-size:13px;padding:10px 0">출고 이력 없음</div>';
  // 클레임
  var claimHtml=claims.length
    ?'<div style="margin-top:12px"><div style="font-size:12px;font-weight:700;color:var(--dan);margin-bottom:6px">⚠ 관련 클레임 '+claims.length+'건</div>'
      +claims.map(function(c){return'<div style="font-size:12px;padding:5px 10px;background:#FEF2F2;border-radius:8px;margin-bottom:4px;color:#DC2626">'+c.dt+' · '+c.type+' · '+fmt(c.qty)+'매 · '+c.reason+'</div>'}).join('')+'</div>'
    :'';
  var h='<div class="fr">'
    +'<div class="fg"><label>지시번호</label><div style="font-weight:700;color:var(--pri)">'+o.wn+'</div></div>'
    +'<div class="fg"><label>거래처</label><div style="font-weight:700">'+o.cnm+'</div></div>'
    +'<div class="fg"><label>완제품 수량</label><div style="font-weight:700">'+fmt(o.fq||0)+'매</div></div>'
    +'</div>'
    +'<div style="margin-top:8px"><label style="font-size:12px;color:var(--txt3)">제품명</label><div style="font-weight:700;font-size:17px;margin-top:2px">'+o.pnm+'</div></div>'
    +procsHtml+papersHtml
    +'<div style="margin-top:12px"><div style="font-size:12px;font-weight:700;color:var(--txt3);margin-bottom:6px">출고 이력</div>'+shipHtml+'</div>'
    +claimHtml;
  $('lotDetC').innerHTML=h;
  $('lotDetTitle').textContent=o.pnm+' — 생산 이력';
  oMo('lotDetMo');
}
