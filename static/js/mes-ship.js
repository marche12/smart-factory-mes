// Ship history - uses universal period filter
function _renderShipHeatmap(allLogs){
  var el=$('shipHeatmap');if(!el)return;
  // 최근 13주(91일) 일별 출고 건수
  var days=91;
  var counts=[];var max=0;
  for(var i=days-1;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);var ds=d.toISOString().slice(0,10);var c=allLogs.filter(function(r){return r.dt===ds}).length;counts.push({d:ds,c:c});if(c>max)max=c}
  if(max===0){el.innerHTML='';return}
  var lvl=function(c){if(c===0)return '';var r=c/max;if(r>.8)return 'lv5';if(r>.6)return 'lv4';if(r>.4)return 'lv3';if(r>.2)return 'lv2';return 'lv1'};
  var cells=counts.map(function(x){return '<div class="heat-cell '+lvl(x.c)+'" title="'+x.d+': '+x.c+'건"><span class="tip">'+x.d+' · '+x.c+'건</span></div>'}).join('');
  el.innerHTML='<div class="heat"><div class="heat-hd"><div class="heat-title">최근 13주 출고 활동</div><div class="heat-legend">적음 <div class="heat-legend-cell" style="background:#F1F3F7"></div><div class="heat-legend-cell lv1"></div><div class="heat-legend-cell lv2"></div><div class="heat-legend-cell lv3"></div><div class="heat-legend-cell lv4"></div><div class="heat-legend-cell lv5"></div> 많음</div></div><div class="heat-grid">'+cells+'</div></div>';
}
function rShipHist(){
  // 기간 필터 초기화
  if(!$('shHiPrdBar').innerHTML)$('shHiPrdBar').innerHTML=periodFilterHTML('shHi');
  if(!_prdState['shHi']){setPrd('shHi','daily',null);if(!$('shHiDtVal').value)$('shHiDtVal').value=td()}
  var s=($('shHistSch')?.value||'').toLowerCase();
  var allLogs=DB.g('shipLog');
  _renderShipHeatmap(allLogs);
  var filtered=prdFilterData(allLogs,'shHi','dt');
  var logs=filtered.filter(function(r){
    if(s&&r.cnm.toLowerCase().indexOf(s)<0&&r.pnm.toLowerCase().indexOf(s)<0)return false;
    return true;
  }).sort(function(a,b){return b.dt>a.dt?1:-1});
  // 기간별 요약
  var ps=$('shipPeriodSum');
  var rng=getPrdRange('shHi');
  if(rng.from){
    var tQty=0,tDef=0;logs.forEach(function(r){tQty+=r.qty||0;tDef+=r.defect||0});
    ps.innerHTML='<div class="sg" style="margin-bottom:10px">'+
      '<div class="sb blue" style="text-align:center"><div class="v">'+logs.length+'</div><div class="l">출고건수</div></div>'+
      '<div class="sb green" style="text-align:center"><div class="v">'+fmt(tQty)+'</div><div class="l">총 출고량</div></div>'+
      '<div class="sb '+(tDef>0?'red':'')+'" style="text-align:center"><div class="v">'+fmt(tDef)+'</div><div class="l">불량</div></div>'+
      '<div class="sb orange" style="text-align:center"><div class="v">'+(tQty?((tDef/tQty)*100).toFixed(1):0)+'%</div><div class="l">불량률</div></div>'+
      '</div>';
  }else{ps.innerHTML=''}
  $('shipHistTbl').querySelector('tbody').innerHTML=logs.length?logs.map(function(r){return '<tr onclick="openShipHistLedgerPanel(\''+r.id+'\')" oncontextmenu="return openShipHistContextMenu(event,\''+r.id+'\')"><td>'+r.dt+'</td><td>'+r.cnm+'</td><td>'+r.pnm+'</td><td style="font-weight:700">'+r.qty+'</td><td>'+(r.good||r.qty)+'/'+r.qty+(r.defect?' <span style="color:var(--dan)">(불량'+r.defect+')</span>':'')+'</td><td>'+(r.defect||0)+'</td><td>'+(r.car?r.car+' ':'')+(r.driver||'')+'</td><td><button class="btn btn-sm btn-o" onclick="event.stopPropagation();showShipDet(\''+r.id+'\')">상세</button> <button class="btn btn-sm btn-p" onclick="event.stopPropagation();printShipOne(\''+r.id+'\')">명세표</button> <button class="btn btn-sm btn-s" onclick="event.stopPropagation();printTransStatement(\''+r.id+'\')">거래명세서</button></td></tr>'}).join(''):'<tr><td colspan="8" class="empty-cell">출고 이력 없음</td></tr>';
  // 엑셀 내보내기 데이터
  _prdExportData['shHi']={headers:['출고일','거래처','제품','출고수량','양품','불량','차량','기사'],rows:logs.map(function(r){return[r.dt,r.cnm,r.pnm,r.qty,r.good||r.qty,r.defect||0,r.car||'',r.driver||'']}),sheetName:'출고이력',fileName:'출고이력'};
}
window._prdCb_shHi=rShipHist;
function ensureShipHistContextMenu(){
  var ex=document.getElementById('shipHistContextMenu');
  if(ex)return ex;
  var el=document.createElement('div');
  el.id='shipHistContextMenu';
  el.style.cssText='position:fixed;min-width:200px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 18px 40px rgba(15,23,42,.16);padding:6px;z-index:220;display:none';
  document.body.appendChild(el);
  document.addEventListener('click',closeShipHistContextMenu);
  return el;
}
function closeShipHistContextMenu(){var el=document.getElementById('shipHistContextMenu');if(el)el.style.display='none';}
function openShipHistContextMenu(e,id){
  e.preventDefault();
  var r=(DB.g('shipLog')||[]).find(function(x){return x.id===id;});if(!r)return false;
  var el=ensureShipHistContextMenu();
  el.innerHTML=''
    +'<button onclick="openShipHistLedgerPanel(\''+id+'\');closeShipHistContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer">상세 확인</button>'
    +'<button onclick="printShipOne(\''+id+'\');closeShipHistContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer">명세표 인쇄</button>'
    +'<button onclick="printTransStatement(\''+id+'\');closeShipHistContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer">거래명세서 인쇄</button>'
    +'<button onclick="cancelShipById(\''+id+'\');closeShipHistContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer;color:#DC2626">출고 취소</button>';
  el.style.left=Math.min(e.clientX,window.innerWidth-220)+'px';
  el.style.top=Math.min(e.clientY,window.innerHeight-230)+'px';
  el.style.display='block';
  return false;
}
function openShipHistLedgerPanel(id){
  var r=(DB.g('shipLog')||[]).find(function(x){return x.id===id;});if(!r)return;
  var sale=(DB.g('sales')||[]).find(function(x){return x.shipId===id;})||null;
  var tx=(DB.g('taxInvoice')||[]).find(function(x){return x.shipId===id;})||null;
  var etx=(DB.g('etax')||[]).find(function(x){return x.shipId===id;})||null;
  var body=''
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">출고일시</div><div class="ux-sp-field-v" style="font-size:18px;font-weight:800">'+(r.tm||r.dt||'-')+'</div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">'
    +'<div style="padding:12px;background:#EFF6FF;border-radius:10px"><div style="font-size:11px;color:#1D4ED8;font-weight:700">거래처</div><div style="font-size:16px;font-weight:800;color:#1E3A8A">'+(r.cnm||'-')+'</div></div>'
    +'<div style="padding:12px;background:#F8FAFC;border-radius:10px"><div style="font-size:11px;color:#475569;font-weight:700">제품</div><div style="font-size:16px;font-weight:800;color:#0F172A">'+(r.pnm||'-')+'</div></div>'
    +'<div style="padding:12px;background:#DCFCE7;border-radius:10px"><div style="font-size:11px;color:#166534;font-weight:700">양품</div><div style="font-size:16px;font-weight:800;color:#166534">'+fmt(r.good||r.qty||0)+'매</div></div>'
    +'<div style="padding:12px;background:#FEF2F2;border-radius:10px"><div style="font-size:11px;color:#991B1B;font-weight:700">불량</div><div style="font-size:16px;font-weight:800;color:#B91C1C">'+fmt(r.defect||0)+'매</div></div>'
    +'</div>'
    +'<div class="ux-sp-section"><div class="ux-sp-section-t">문서 연결</div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px"><div class="ux-sp-field"><div class="ux-sp-field-l">매출</div><div class="ux-sp-field-v">'+(sale?sale.id:'없음')+'</div></div><div class="ux-sp-field"><div class="ux-sp-field-l">세금계산서</div><div class="ux-sp-field-v">'+(tx?tx.id:'없음')+'</div></div><div class="ux-sp-field"><div class="ux-sp-field-l">전자세금</div><div class="ux-sp-field-v">'+(etx?etx.id:'없음')+'</div></div></div></div>'
    +'<div class="ux-sp-section"><div class="ux-sp-section-t">배송 정보</div><div class="ux-sp-field"><div class="ux-sp-field-l">차량 / 기사</div><div class="ux-sp-field-v">'+((r.car||'-')+' / '+(r.driver||'-'))+'</div></div><div class="ux-sp-field"><div class="ux-sp-field-l">입고처</div><div class="ux-sp-field-v">'+(r.dlv||'-')+'</div></div>'+(r.memo?'<div class="ux-sp-field"><div class="ux-sp-field-l">메모</div><div class="ux-sp-field-v">'+r.memo+'</div></div>':'')+'</div>'
    +'<div class="ux-sp-section" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-p" onclick="showShipDet(\''+id+'\');UXAdv.closeSidePanel()">상세 보기</button><button class="btn btn-o" onclick="printShipOne(\''+id+'\');UXAdv.closeSidePanel()">명세표</button><button class="btn btn-s" onclick="printTransStatement(\''+id+'\');UXAdv.closeSidePanel()">거래명세서</button><button class="btn btn-d" onclick="cancelShipById(\''+id+'\');UXAdv.closeSidePanel()">취소</button></div>';
  if(window.UXAdv&&typeof UXAdv.openSidePanel==='function')UXAdv.openSidePanel((r.cnm||'거래처')+' 출고 이력',body);
}
function showShipDet(sid){
const r=DB.g('shipLog').find(x=>x.id===sid);if(!r)return;
const o=DB.g('wo').find(x=>x.id===r.woId)||{};
const sale=(DB.g('sales')||[]).find(function(x){return x.shipId===sid;})||null;
const tx=(DB.g('taxInvoice')||[]).find(function(x){return x.shipId===sid;})||null;
const etx=(DB.g('etax')||[]).find(function(x){return x.shipId===sid;})||null;
var _bcShip=typeof DocTrace!=='undefined'?DocTrace.renderBreadcrumb('SHIP',sid):'';
var _flow='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'
  +'<span style="background:#DBEAFE;color:#1D4ED8;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700">WO '+(r.wn||'-')+'</span>'
  +(r.orderId?'<span style="background:#EDE9FE;color:#6D28D9;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700">수주 연결</span>':'')
  +(sale?'<span style="background:#DCFCE7;color:#166534;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700">매출 등록</span>':'')
  +(tx?'<span style="background:#FEF3C7;color:#92400E;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700">세금계산서 '+(tx.method||'')+'</span>':'')
  +(etx?'<span style="background:#FCE7F3;color:#BE185D;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700">전자세금계산 '+(etx.st||'')+'</span>':'')
  +'</div>';
var _linked='<div style="border:1px solid var(--bdr);border-radius:12px;padding:12px;background:#F8FAFC;margin-top:12px">'
  +'<div style="font-size:12px;font-weight:800;color:#475569;margin-bottom:8px">자동 연동 현황</div>'
  +'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;font-size:12px">'
  +'<div><div style="color:#94A3B8;margin-bottom:2px">작업지시</div><div style="font-weight:700">'+(o.wn||r.wn||'-')+'</div></div>'
  +'<div><div style="color:#94A3B8;margin-bottom:2px">수주 ID</div><div style="font-weight:700">'+(r.orderId||o.ordId||'-')+'</div></div>'
  +'<div><div style="color:#94A3B8;margin-bottom:2px">매출 전표</div><div style="font-weight:700">'+(sale?sale.id:'-')+'</div></div>'
  +'<div><div style="color:#94A3B8;margin-bottom:2px">세금계산서</div><div style="font-weight:700">'+(tx?tx.id:'-')+'</div></div>'
  +'<div><div style="color:#94A3B8;margin-bottom:2px">전자세금 대기</div><div style="font-weight:700">'+(etx?etx.id:'-')+'</div></div>'
  +'<div><div style="color:#94A3B8;margin-bottom:2px">세금 처리 상태</div><div style="font-weight:700">'+(tx&&tx.method?tx.method:(etx&&etx.st?etx.st:'-'))+'</div></div>'
  +'</div></div>';
$('shipDetC').innerHTML=_bcShip+_flow+`<div class="fr"><div class="fg"><label>출고일시</label><div style="font-weight:700">${r.tm||r.dt}</div></div><div class="fg"><label>지시번호</label><div>${r.wn||'-'}</div></div><div class="fg"><label>담당</label><div>${r.mgr||'-'}</div></div></div><div class="fr"><div class="fg"><label>거래처</label><div style="font-weight:700;font-size:15px">${r.cnm}</div></div><div class="fg"><label>제품</label><div style="font-weight:700;font-size:15px">${r.pnm}</div></div></div><div class="fr" style="margin-top:10px"><div class="fg"><label>출고수량</label><div style="font-weight:700;font-size:18px">${r.qty}</div></div><div class="fg"><label>양품</label><div style="color:var(--suc);font-weight:700;font-size:18px">${r.good||r.qty}</div></div><div class="fg"><label>불량</label><div style="color:var(--dan);font-weight:700;font-size:18px">${r.defect||0}</div></div></div>${r.inspNote?`<div class="fg" style="margin-top:10px"><label>검수메모</label><div style="background:var(--bg2);padding:8px">${r.inspNote}</div></div>`:''}<div style="border-top:1px solid var(--bdr);margin:14px 0;padding-top:10px"><div class="fr"><div class="fg"><label>차량번호</label><div>${r.car||'-'}</div></div><div class="fg"><label>기사</label><div>${r.driver||'-'}</div></div></div><div class="fg" style="margin-top:8px"><label>입고처</label><div>${r.dlv||'-'}</div></div>${r.memo?`<div class="fg" style="margin-top:8px"><label>배송메모</label><div style="background:var(--bg2);padding:8px">${r.memo}</div></div>`:''}</div>`+_linked;_shipDetId=sid;oMo('shipDetMo')}
let _shipDetId=null;function printShipDocById(){if(_shipDetId)printShipOne(_shipDetId)}
// Ship statistics
function rShipStat(){
  if(!$('shStatPrdBar').innerHTML)$('shStatPrdBar').innerHTML=periodFilterHTML('shSt');
  if(!_prdState['shSt']){setPrd('shSt','monthly',null);if(!$('shStDtVal').value)$('shStDtVal').value=td().slice(0,7)}
  const logs=prdFilterData(DB.g('shipLog'),'shSt','dt');const byCli={};let totQ=0,totD=0;logs.forEach(r=>{if(!byCli[r.cnm])byCli[r.cnm]={cnt:0,qty:0,defect:0};byCli[r.cnm].cnt++;byCli[r.cnm].qty+=r.qty;byCli[r.cnm].defect+=r.defect||0;totQ+=r.qty;totD+=r.defect||0});
$('shipStatC').innerHTML=
  '<div class="sg" style="margin-bottom:16px">'+
  `<div class="sb blue" style="text-align:center"><div class="v">${logs.length}</div><div class="l">총 출고건</div></div>`+
  `<div class="sb green" style="text-align:center"><div class="v">${fmt(totQ)}</div><div class="l">총 출고량</div></div>`+
  `<div class="sb ${totD>0?'red':''}" style="text-align:center"><div class="v">${fmt(totD)}</div><div class="l">총 불량</div></div>`+
  `<div class="sb orange" style="text-align:center"><div class="v">${totQ?((totD/totQ)*100).toFixed(1):0}%</div><div class="l">불량률</div></div>`+
  '</div>'+
  `<table class="dt"><thead><tr><th>거래처</th><th>출고건수</th><th>출고량</th><th>불량</th><th>불량률</th></tr></thead><tbody>${Object.entries(byCli).sort((a,b)=>b[1].qty-a[1].qty).map(([k,v])=>`<tr><td style="font-weight:700">${k}</td><td>${v.cnt}건</td><td style="font-weight:700">${fmt(v.qty)}</td><td style="color:${v.defect>0?'#DC2626':'#94A3B8'};font-weight:${v.defect>0?700:400}">${v.defect}</td><td>${v.qty?((v.defect/v.qty)*100).toFixed(1):0}%</td></tr>`).join('')||'<tr><td colspan="5" class="empty-cell">출고 기록 없음</td></tr>'}</tbody></table>`;
  // 엑셀 내보내기 데이터
  _prdExportData['shSt']={headers:['거래처','출고건수','출고량','불량','불량률'],rows:Object.entries(byCli).sort((a,b)=>b[1].qty-a[1].qty).map(([k,v])=>[k,v.cnt,v.qty,v.defect,v.qty?((v.defect/v.qty)*100).toFixed(1)+'%':'0%']),sheetName:'출고통계',fileName:'출고통계'};
}
window._prdCb_shSt=rShipStat;
function printShipStat(){const c=$('shipStatC').innerHTML;if(!c)return;var rng=getPrdRange('shSt');const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>출고통계</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Nanum Gothic',sans-serif;font-size:11px;padding:15mm}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px 6px;font-size:10px}th{background:#E5E7EB;font-weight:700}.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.sb{border:1px solid #ccc;padding:10px}.sb .l{font-size:10px}.sb .v{font-size:16px;font-weight:700}@media print{@page{size:A4;margin:10mm}}</style></head><body><h2 style="text-align:center;margin-bottom:12px;font-size:16px">팩플로우 출고 통계 (${rng.label})</h2>${c}</body></html>`);w.document.close();setTimeout(()=>w.print(),300)}
function exportShipCSV(){const logs=DB.g('shipLog');let csv='\uFEFF출고일,거래처,제품,출고수량,양품,불량,차량,기사,입고처\n';logs.forEach(r=>{csv+=`${r.dt},${r.cnm},${r.pnm},${r.qty},${r.good||r.qty},${r.defect||0},${r.car||''},${r.driver||''},${r.dlv||''}\n`});const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='출고이력_'+td()+'.csv';a.click();toast('엑셀 내보내기','ok')}
// Print ship document (거래명세표)
function printShipDoc(){const woId=$('smWoId').value;const o=DB.g('wo').find(x=>x.id===woId);if(!o)return;const co=DB.g1('co')||{nm:'팩플로우',addr:'',tel:'',fax:''};const qty=+$('smQty').value||0;const defect=+$('smDefect').value||0;doPrintShipDoc(co,o,qty,defect,$('smDlv').value,$('smCar').value,$('smDriver').value,$('smMemo').value)}
function printShipOne(sid){const r=DB.g('shipLog').find(x=>x.id===sid);if(!r)return;const o=DB.g('wo').find(x=>x.id===r.woId);const co=DB.g1('co')||{nm:'팩플로우',addr:'',tel:'',fax:''};doPrintShipDoc(co,o||{cnm:r.cnm,pnm:r.pnm,spec:'',paper:''},r.qty,r.defect||0,r.dlv||'',r.car||'',r.driver||'',r.memo||'')}
function doPrintShipDoc(co,o,qty,defect,dlv,car,driver,memo){
const h=`<h2 style="text-align:center;font-size:18px;letter-spacing:8px;margin-bottom:12px;font-weight:800">거 래 명 세 표</h2>
<div style="display:flex;justify-content:space-between;font-size:10px;border-bottom:1px solid #999;padding-bottom:5px;margin-bottom:8px"><div><strong>${co.nm}</strong> | ${co.addr} | TEL:${co.tel} | FAX:${co.fax}</div><div>발행일: ${td()}</div></div>
<table><tr><th width="70">거래처</th><td colspan="3" style="font-weight:700;font-size:11px">${o.cnm}</td></tr><tr><th>제품명</th><td colspan="3" style="font-weight:700;font-size:11px">${o.pnm}</td></tr><tr><th>규격</th><td>${o.spec||''}</td><th width="70">종이</th><td>${o.paper||''}</td></tr></table>
<table style="margin-top:6px"><thead><tr><th>품목</th><th>수량</th><th>불량</th><th>양품(납품수량)</th></tr></thead><tbody><tr><td style="font-weight:700">${o.pnm}</td><td>${qty}</td><td style="color:red">${defect}</td><td style="font-weight:700;font-size:12px">${qty-defect}</td></tr></tbody></table>
<table style="margin-top:6px"><tr><th width="70">입고처</th><td>${dlv}</td></tr><tr><th>차량번호</th><td>${car}</td></tr><tr><th>기사</th><td>${driver}</td></tr>${memo?`<tr><th>비고</th><td>${memo}</td></tr>`:''}</table>
<div style="margin-top:30px;display:flex;justify-content:space-around;font-size:11px"><div style="text-align:center"><div style="border-top:1px solid #333;width:120px;padding-top:5px">공급자 (인)</div></div><div style="text-align:center"><div style="border-top:1px solid #333;width:120px;padding-top:5px">인수자 (인)</div></div></div>`;
const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>거래명세표</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Nanum Gothic',sans-serif;font-size:10px;line-height:1.3;padding:12mm;width:210mm}table{width:100%;border-collapse:collapse;margin-bottom:4px}th,td{border:1px solid #333;padding:4px 6px;font-size:10px;text-align:left}th{background:#E5E7EB;font-weight:700;white-space:nowrap}@media print{@page{size:A4;margin:8mm}}</style></head><body>${h}</body></html>`);w.document.close();setTimeout(()=>w.print(),300)}
// CLAIM MANAGEMENT
var _claimView='table';
function setClaimView(v,btn){_claimView=v;if(btn){btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}var t=$('claimTableView'),k=$('claimKanbanView');if(t)t.style.display=v==='table'?'':'none';if(k)k.style.display=v==='kanban'?'':'none';rClaim()}
function rClaim(){const s=($('claimSch')?.value||'').toLowerCase();const cs=DB.g('claims').filter(c=>!s||c.cnm.toLowerCase().includes(s)||c.pnm.toLowerCase().includes(s)).sort((a,b)=>b.dt>a.dt?1:-1);
var _typeBadge=(t)=>t==='반품'?'<span class="bd bd-d">반품</span>':t==='클레임'?'<span class="bd bd-o">클레임</span>':'<span class="bd bd-p">재작업</span>';
var _stBadge=(s)=>s==='접수'?'<span class="bd bd-w">접수</span>':s==='처리중'?'<span class="bd bd-p">처리중</span>':'<span class="bd bd-s">완료</span>';
if(_claimView==='table'){
  $('claimTbl').querySelector('tbody').innerHTML=cs.length?cs.map(c=>`<tr><td>${c.dt}</td><td style="font-weight:600">${c.cnm}</td><td>${c.pnm}</td><td>${_typeBadge(c.type)}</td><td style="font-weight:700">${c.qty}</td><td style="color:#475569">${c.reason}</td><td>${_stBadge(c.st)}</td><td><button class="btn btn-sm btn-o" onclick="eClaim('${c.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dClaim('${c.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty-cell">등록된 반품/클레임 없음</td></tr>'
}else{
  // Kanban
  var groups={'접수':[],'처리중':[],'완료':[]};
  cs.forEach(c=>{var st=c.st||'접수';if(!groups[st])groups[st]=[];groups[st].push(c)});
  var col=(key,cls)=>`<div class="kb-col ${cls}"><div class="kb-hd"><div class="kb-hd-nm">${key}</div><div class="kb-cnt">${groups[key].length}</div></div>${groups[key].length?groups[key].map(c=>`<div class="kb-card" onclick="eClaim('${c.id}')"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">${_typeBadge(c.type)}<span style="font-size:11px;color:var(--txt3);font-weight:600">${c.dt}</span></div><div class="kb-card-cli">${c.cnm}</div><div class="kb-card-prod">${c.pnm} · ${c.qty}매</div><div class="kb-card-reason">${c.reason}</div></div>`).join(''):'<div class="kb-empty">없음</div>'}</div>`;
  $('claimKanbanArea').innerHTML='<div class="kanban">'+col('접수','recv')+col('처리중','proc')+col('완료','done')+'</div>';
}}
function openClaimM(){['clmId','clmCli','clmProd','clmQty','clmReason','clmNote'].forEach(x=>$(x).value='');$('clmType').value='반품';$('clmSt').value='접수';$('claimMoT').textContent='반품/클레임 등록';oMo('claimMo')}
function eClaim(id){const c=DB.g('claims').find(x=>x.id===id);if(!c)return;$('clmId').value=c.id;$('clmCli').value=c.cnm;$('clmProd').value=c.pnm;$('clmType').value=c.type;$('clmQty').value=c.qty;$('clmReason').value=c.reason;$('clmSt').value=c.st;$('clmNote').value=c.note||'';$('claimMoT').textContent='반품/클레임 수정';oMo('claimMo')}
/* ================================================================
   반품 역동기화: type=반품 && st=완료 일 때 자동 실행
   - 재고 원복 (동일 품명)
   - 매출 차감 (최근 매출 음수 entry 추가)
   - 세금계산서 환입 코드 마킹 (amendedKindCode=1)
   저장된 claim.synced 플래그로 중복 적용 방지.
   ================================================================ */
function _applyReturnSync(claim){
  if(!claim||claim.type!=='반품'||claim.st!=='완료')return false;
  if(claim.synced)return false;
  var qty=Number(claim.qty)||0; if(qty<=0)return false;
  /* 1) 재고 복원 */
  var stocks=DB.g('stock')||[];
  var si=stocks.findIndex(function(s){return (s.nm||'')===claim.pnm;});
  if(si>=0){stocks[si].qty=(Number(stocks[si].qty)||0)+qty;}
  else{stocks.push({id:gid(),nm:claim.pnm,spec:'',qty:qty,cat:'완제품',note:'반품 복원'});}
  DB.s('stock',stocks);
  if(typeof addStockLog==='function')addStockLog(claim.pnm,'반품입고',qty,'CLAIM:'+claim.id,'반품 복원');
  /* 2) 매출 차감 (음수 매출 entry) */
  var sales=DB.g('sales')||[];
  var origShip=claim.shipId?(DB.g('shipLog')||[]).find(function(x){return x.id===claim.shipId;}):null;
  var unitPrice=0;
  if(origShip){
    var origSale=sales.find(function(s){return s.shipId===claim.shipId;});
    if(origSale&&origSale.qty)unitPrice=Math.round((origSale.amt||0)/origSale.qty);
  }
  if(!unitPrice){
    var wo=claim.woId?(DB.g('wo')||[]).find(function(x){return x.id===claim.woId;}):null;
    unitPrice=wo&&wo.price?wo.price:0;
  }
  if(unitPrice>0){
    var retAmt=-qty*unitPrice;
    sales.push({
      id:gid(),dt:td(),cnm:claim.cnm,pnm:claim.pnm,
      qty:-qty,amt:retAmt,
      type:'반품',claimId:claim.id,shipId:claim.shipId||'',woId:claim.woId||'',
      note:'반품 차감 (환입): '+(claim.reason||'')
    });
    DB.s('sales',sales);
  }
  /* 3) 세금계산서 환입 마킹 */
  if(claim.shipId){
    var txs=DB.g('taxInvoice')||[];
    txs.forEach(function(tx){
      if(tx.shipId===claim.shipId){tx.amendedKindCode=1;tx.amendedNote='반품 환입: '+claim.id;}
    });
    DB.s('taxInvoice',txs);
    var etax=DB.g('etax')||[];
    etax.forEach(function(e){
      if(e.shipId===claim.shipId){e.amendedKindCode=1;e.amendedNote='반품 환입: '+claim.id;}
    });
    DB.s('etax',etax);
  }
  return true;
}
function _undoReturnSync(claim){
  if(!claim||!claim.synced)return false;
  var qty=Number(claim.qty)||0;
  var stocks=DB.g('stock')||[];
  var si=stocks.findIndex(function(s){return (s.nm||'')===claim.pnm;});
  if(si>=0){stocks[si].qty=Math.max(0,(Number(stocks[si].qty)||0)-qty);DB.s('stock',stocks);}
  if(typeof addStockLog==='function')addStockLog(claim.pnm,'반품취소',qty,'CLAIM:'+claim.id,'반품 역처리 취소');
  DB.s('sales',(DB.g('sales')||[]).filter(function(s){return s.claimId!==claim.id;}));
  var txs=DB.g('taxInvoice')||[];
  txs.forEach(function(tx){if(tx.amendedNote==='반품 환입: '+claim.id){tx.amendedKindCode=0;delete tx.amendedNote;}});
  DB.s('taxInvoice',txs);
  var etax=DB.g('etax')||[];
  etax.forEach(function(e){if(e.amendedNote==='반품 환입: '+claim.id){e.amendedKindCode=0;delete e.amendedNote;}});
  DB.s('etax',etax);
  return true;
}
function saveClaim(){const cn=$('clmCli').value.trim(),pn=$('clmProd').value.trim(),qty=+$('clmQty').value;if(!cn||!pn){toast('거래처/제품 필요','err');return}if(!qty){toast('수량 필요','err');return}if(!$('clmReason').value.trim()){toast('사유 필요','err');return}
const id=$('clmId').value||gid();
/* WO/출고 자동 연결: 같은 거래처+품목의 최근 WO/출고 매칭 */
var _clmWoId='',_clmShipId='';
try{
  var _ws=DB.g('wo').filter(function(w){return w.cnm===cn&&w.pnm===pn}).sort(function(a,b){return b.cat>a.cat?1:-1});
  if(_ws.length){_clmWoId=_ws[0].id;var _sl=(DB.g('shipLog')||[]).filter(function(s){return s.woId===_clmWoId}).sort(function(a,b){return b.dt>a.dt?1:-1});if(_sl.length)_clmShipId=_sl[0].id}
}catch(e){}
var prev=(DB.g('claims')||[]).find(function(x){return x.id===id;})||null;
const c={id,cnm:cn,pnm:pn,type:$('clmType').value,qty,reason:$('clmReason').value,st:$('clmSt').value,note:$('clmNote').value,dt:prev?prev.dt:td(),woId:_clmWoId||(prev&&prev.woId)||'',shipId:_clmShipId||(prev&&prev.shipId)||'',synced:prev?prev.synced:false};
/* 상태 전이에 따른 역동기화 처리 */
var syncMsg='';
if(prev&&prev.synced&&(c.type!=='반품'||c.st!=='완료')){
  if(_undoReturnSync(prev)){c.synced=false;syncMsg=' · 역처리 취소됨';}
}
if(c.type==='반품'&&c.st==='완료'&&!c.synced){
  if(_applyReturnSync(c)){c.synced=true;syncMsg=' · 재고+매출-세금 역처리 완료';}
}
const cs=DB.g('claims');const i=cs.findIndex(x=>x.id===id);if(i>=0)cs[i]=c;else cs.push(c);DB.s('claims',cs);addLog(`${c.type}: ${cn} ${pn} ${qty}매`+syncMsg);cMo('claimMo');rClaim();if(typeof rStock==='function')rStock();if(typeof rDash==='function')rDash();toast('저장'+syncMsg,'ok')}
function dClaim(id){var prev=(DB.g('claims')||[]).find(function(x){return x.id===id;});if(!confirm('삭제?'))return;if(prev&&prev.synced){_undoReturnSync(prev);}DB.s('claims',DB.g('claims').filter(x=>x.id!==id));rClaim();if(typeof rStock==='function')rStock();if(typeof rDash==='function')rDash();toast('삭제','ok')}
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
  $('calStats').innerHTML='<div class="cal-stat"><div class="cal-stat-v" style="color:#1E3A5F">'+mStart+'</div><div class="cal-stat-l">작업등록</div></div>'
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
  var colors=['#1E3A5F','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
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
      +'<div class="perf-stat"><div class="perf-stat-v" style="color:#1E3A5F">'+fmt(d.qty)+'</div><div class="perf-stat-l">생산량</div></div>'
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
  w.document.write('<title>'+(title||'팩플로우 보고서')+'</title>');
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
  w.document.write('<div class="print-header"><h1>'+(title||'팩플로우 보고서')+'</h1><div class="co">팩플로우 ERP+MES</div><div class="dt">출력일시: '+dateStr+'</div></div>');
  w.document.write(content);
  w.document.write('<div class="print-footer">팩플로우 | 경기도 파주시 | 본 문서는 시스템에서 자동 생성되었습니다.</div>');
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function(){w.print()},500);
updateShipBadge();
}

/* ===== DAILY PRODUCTION PLAN ===== */
function rPlanList(){if(typeof rPlan==='function')rPlan()}
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
  var extCnt=active.filter(function(o){return(o.procs||[]).some(function(p){return p.st==='외주대기'||p.st==='외주진행중'})}).length;
  var todayCnt=active.filter(function(o){return o.sd===dt}).length;
  var sH='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
  sH+='<div class="plan-kpi k-gray" onclick="openPlanFilter(\'all\')"><div class="num">'+active.length+'</div><div class="lbl">전체</div></div>';
  sH+='<div class="plan-kpi k-blue" onclick="openPlanFilter(\'ing\')"><div class="num">'+ingCnt+'</div><div class="lbl">진행중</div></div>';
  sH+='<div class="plan-kpi k-orange" onclick="openPlanFilter(\'wait\')"><div class="num">'+waitCnt+'</div><div class="lbl">대기중</div></div>';
  if(extCnt)sH+='<div class="plan-kpi k-purple"><div class="num">'+extCnt+'</div><div class="lbl">외주 진행</div></div>';
  if(todayCnt)sH+='<div class="plan-kpi k-green"><div class="num">'+todayCnt+'</div><div class="lbl">오늘 납기</div></div>';
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

  }catch(e){var _pg=$('planGrid');if(_pg){_pg.textContent='';var _ed=document.createElement('div');_ed.style.cssText='padding:20px;color:red;font-size:13px';_ed.textContent='오류: '+e.message;_pg.appendChild(_ed);}console.error('rPlan error:',e);}
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
  if(type==='all'){items=active;title='전체 패키지 작업지시';}
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
    h+='<div style="margin-bottom:12px"><div style="font-size:12px;font-weight:700;color:#1E3A5F;padding:6px 0;border-bottom:2px solid #1E3A5F">진행중 ('+ing.length+')</div>';
    ing.forEach(function(it){
      var machineTag=it.machine?'<span style="font-size:10px;padding:1px 6px;border-radius:8px;background:#DCE8F5;color:#1D4ED8;font-weight:700">'+it.machine+'</span> ':'';
      var btnLabel=isExt?'입고 확인':'완료';
      var rowBg=isExt?'#FDF4FF':'#EFF6FF';var rowBdr=isExt?'#9333EA':'#1E3A5F';
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
        h+='<button onclick="wqMove('+idx+',-1)" style="border:none;background:'+(isFirst?'#E5E7EB':'#DCE8F5')+';color:'+(isFirst?'#D1D5DB':'#1E3A5F')+';font-size:10px;line-height:1;padding:3px 4px;border-radius:3px;cursor:'+(isFirst?'default':'pointer')+'" '+(isFirst?'disabled':'')+'>▲</button>';
        h+='<button onclick="wqMove('+idx+',1)" style="border:none;background:'+(isLast?'#E5E7EB':'#DCE8F5')+';color:'+(isLast?'#D1D5DB':'#1E3A5F')+';font-size:10px;line-height:1;padding:3px 4px;border-radius:3px;cursor:'+(isLast?'default':'pointer')+'" '+(isLast?'disabled':'')+'>▼</button>';
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
  // 작업자 또는 관리자 시작 가능
  if(!CU||(CU.role!=='worker'&&CU.role!=='admin')){toast('권한이 없습니다','err');return;}
  var os=DB.g('wo');var o=os.find(function(x){return x.id===wid});
  if(!o)return;
  var p=o.procs[pi];
  // 이전 공정 완료 체크
  for(var j=0;j<pi;j++){
    var prev=o.procs[j];
    if(prev.tp==='out'||prev.tp==='exc')continue;
    // 기계코팅은 인쇄 완료 시 자동 완료 → 스킵
    if(prev.nm==='코팅'&&prev.mt==='기계코팅'){
      var printP=o.procs.find(function(x){return x.nm==='인쇄'});
      if(printP&&(printP.st==='완료'||printP.st==='외주완료')){prev.st='완료';prev.qty=printP.qty||0;prev.t2=prev.t2||nw();DB.s('wo',os);continue}
    }
    if(prev.st!=='완료'&&prev.st!=='외주완료'&&prev.st!=='스킵'){toast('이전 공정('+prev.nm+') 미완료','err');return}
  }
  // 톰슨: 기계 자동 배정
  if(p.nm==='톰슨'){
    var t1Busy=os.some(function(x){return x.procs&&x.procs.some(function(q){return q.nm==='톰슨'&&q.st==='진행중'&&q.machine==='톰슨1'})});
    var t2Busy=os.some(function(x){return x.procs&&x.procs.some(function(q){return q.nm==='톰슨'&&q.st==='진행중'&&q.machine==='톰슨2'})});
    if(t1Busy&&t2Busy){toast('톰슨1, 톰슨2 모두 진행 중입니다','err');return;}
    var machine=!t1Busy?'톰슨1':'톰슨2';
    _doStart(wid,pi,machine);
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
  if(typeof rWorkerMonitor==='function')rWorkerMonitor();
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
  var _isLast2=(pi===o.procs.length-1)||o.procs.slice(pi+1).every(function(x){return x.st==='완료'||x.st==='외주완료'||x.st==='스킵'});
  $('compQty').value=_isLast2?(o.fq||getWQ(o)):(getWQ(o)||'');
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
  // 작업자 또는 관리자 완료 가능
  if(!CU||(CU.role!=='worker'&&CU.role!=='admin')){toast('권한이 없습니다','err');return;}
  var os=DB.g('wo');var o=os.find(function(x){return x.id===wid});
  if(!o)return;
  var p=o.procs[pi];
  var isExt=typeof isExternalProc==='function'&&isExternalProc(p.nm);
  cMo('procEditMo');
  compItem={woId:wid,pIdx:pi,newSt:'완료'};
  $('compNm').textContent=o.pnm;
  $('compInf').textContent=o.cnm+' | '+p.nm+(isExt?' (외주 입고)':'');
  var _isLast=(pi===o.procs.length-1)||o.procs.slice(pi+1).every(function(x){return x.st==='완료'||x.st==='외주완료'||x.st==='스킵'});
  $('compQty').value=_isLast?(o.fq||getWQ(o)):(getWQ(o)||'');
  // 외주공정은 버튼 텍스트 '입고 확인'
  var compBtn=$('compSubmitBtn');
  if(compBtn)compBtn.textContent=isExt?'입고 확인':'완료';
  $('compMo').classList.remove('hidden');
  $('compQty').focus();
}

/* =============================================
   수주관리 (Order Management)
   ============================================= */
var _orderFilter=(typeof SearchUtil!=='undefined'&&SearchUtil.getPref?SearchUtil.getPref('order-list','filter','all'):'all');
var _orderPeriod=(typeof SearchUtil!=='undefined'&&SearchUtil.getPref?SearchUtil.getPref('order-list','period','daily'):'daily');
var _ordItems=[];

function getOrders(){return DB.g('orders')||[]}
function saveOrders(list){DB.s('orders',list)}
function getOrderTemplates(){return DB.g('orderTemplates')||[]}
function saveOrderTemplates(list){DB.s('orderTemplates',list||[])}

function _orderRecentClientPicks(){
  var picks=(typeof SearchUtil!=='undefined'&&SearchUtil.getRecentPicks)?SearchUtil.getRecentPicks('order-cli'):[];
  var byName={};
  (DB.g('cli')||[]).forEach(function(c){byName[c.nm]=c;});
  return picks.map(function(p){
    return byName[p.label]||byName[p.id]||null;
  }).filter(Boolean).filter(function(c,idx,arr){
    return idx===arr.findIndex(function(x){return x.id===c.id;});
  }).filter(function(c){return !c.isDormant;}).slice(0,5);
}
function _orderFavoriteClients(){
  return (DB.g('cli')||[]).filter(function(c){
    return c.isFavorite&&!c.isDormant&&(!c.cType||c.cType==='sales'||c.cType==='both');
  }).sort(function(a,b){return (a.nm||'').localeCompare(b.nm||'','ko');}).slice(0,6);
}
function _orderFavoriteProducts(cliNm){
  var prods=(DB.g('prod')||[]).filter(function(p){return p.isFavorite;});
  if(cliNm){
    var scoped=prods.filter(function(p){return p.cnm===cliNm;});
    if(scoped.length)prods=scoped.concat(prods.filter(function(p){return p.cnm!==cliNm;}));
  }
  return prods.slice(0,6);
}
function _orderRecentProducts(cliNm){
  var rows=getOrders().filter(function(o){return !cliNm||o.cli===cliNm;}).sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');}).flatMap(function(o){
    return (o.items||[]).map(function(it){
      return {nm:it.nm||'',spec:it.spec||'',price:Number(it.price)||0,qty:Number(it.qty)||0,cli:o.cli||'',dt:o.dt||''};
    });
  }).filter(function(it){return it.nm;});
  var seen={};
  return rows.filter(function(it){
    var key=[it.nm,it.spec,it.price].join('|');
    if(seen[key])return false;
    seen[key]=1;
    return true;
  }).slice(0,6);
}
function _orderSyncFilterUi(){
  var periodWrap=$('orderPeriodBtns');
  if(periodWrap){
    periodWrap.querySelectorAll('[data-period]').forEach(function(btn){
      btn.classList.toggle('on',btn.dataset.period===_orderPeriod);
    });
  }
  document.querySelectorAll('#order-list [data-f]').forEach(function(btn){
    btn.classList.toggle('on',btn.dataset.f===_orderFilter);
  });
  var dc=$('orderDateCtrl'),rc=$('orderRangeCtrl');
  if(dc&&rc){
    if(_orderPeriod==='range'){dc.style.display='none';rc.style.display='flex'}
    else if(_orderPeriod==='all'){dc.style.display='none';rc.style.display='none'}
    else{dc.style.display='flex';rc.style.display='none'}
  }
}
function renderOrderQuickBars(){
  var cliBox=$('ordClientShortcutPicks'),prodBox=$('ordProdShortcutPicks'),tplBox=$('ordTemplatePicks');
  if(!cliBox||!prodBox||!tplBox)return;
  var cliNm=$('ordCli')&&$('ordCli').value?$('ordCli').value.trim():'';
  var favCli=_orderFavoriteClients();
  var recentCli=_orderRecentClientPicks();
  var favProd=_orderFavoriteProducts(cliNm);
  var recentProd=_orderRecentProducts(cliNm);
  var templates=getOrderTemplates().slice().sort(function(a,b){return (b.savedAt||'').localeCompare(a.savedAt||'');}).slice(0,5);
  var cliChips=[];
  favCli.forEach(function(c){cliChips.push('<button class="pack-search-tag" onclick="applyOrderQuickClient(\''+c.id+'\')">★ '+c.nm+'</button>');});
  recentCli.forEach(function(c){if(!favCli.some(function(x){return x.id===c.id;}))cliChips.push('<button class="pack-search-tag" onclick="applyOrderQuickClient(\''+c.id+'\')">'+c.nm+'</button>');});
  cliBox.innerHTML=cliChips.length?'<span class="pack-chip ok">빠른 거래처</span>'+cliChips.join(''):'';
  var prodChips=[];
  favProd.forEach(function(p){prodChips.push('<button class="pack-search-tag" onclick="applyOrderProductMaster(\''+p.id+'\')">★ '+p.nm+(p.spec?(' · '+p.spec):'')+'</button>');});
  recentProd.forEach(function(p,idx){if(!favProd.some(function(x){return x.nm===p.nm&&x.spec===p.spec;}))prodChips.push('<button class="pack-search-tag" onclick="applyOrderRecentProduct('+idx+')">'+p.nm+(p.spec?(' · '+p.spec):'')+(p.price?(' · '+fmt(p.price)+'원'):'')+'</button>');});
  window._orderRecentProdRows=recentProd;
  prodBox.innerHTML=prodChips.length?'<span class="pack-chip">빠른 품목</span>'+prodChips.join(''):'';
  tplBox.innerHTML=templates.length?'<span class="pack-chip warn">최근 템플릿</span>'+templates.map(function(t){
    return '<button class="pack-search-tag" onclick="applyOrderTemplate(\''+t.id+'\')">'+(t.name||t.cli||'템플릿')+'</button>';
  }).join(''):'';
}
function applyOrderQuickClient(id){
  var c=(DB.g('cli')||[]).find(function(x){return x.id===id;});
  if(!c)return;
  $('ordCli').value=c.nm||'';
  if(typeof SearchUtil!=='undefined'&&SearchUtil.saveRecentPick)SearchUtil.saveRecentPick('order-cli',{id:c.id,label:c.nm,meta:c.tel||''});
  updateOrderAssist();
  renderOrderQuickBars();
}
function applyOrderProductMaster(id){
  var p=(DB.g('prod')||[]).find(function(x){return x.id===id;});
  if(!p)return;
  var emptyIdx=_ordItems.findIndex(function(it){return !(it&&it.nm);});
  if(emptyIdx<0){_ordItems.push({nm:'',spec:'',qty:'',price:'',note:''});emptyIdx=_ordItems.length-1;}
  _ordItems[emptyIdx].nm=p.nm||'';
  _ordItems[emptyIdx].spec=p.spec||'';
  _ordItems[emptyIdx].price=Number(p.price)||0;
  renderOrdItems();
  toast((p.nm||'품목')+' 불러옴','ok');
}
function applyOrderRecentProduct(idx){
  var row=(window._orderRecentProdRows||[])[idx];
  if(!row)return;
  var emptyIdx=_ordItems.findIndex(function(it){return !(it&&it.nm);});
  if(emptyIdx<0){_ordItems.push({nm:'',spec:'',qty:'',price:'',note:''});emptyIdx=_ordItems.length-1;}
  _ordItems[emptyIdx].nm=row.nm||'';
  _ordItems[emptyIdx].spec=row.spec||'';
  _ordItems[emptyIdx].price=row.price||'';
  if(!_ordItems[emptyIdx].qty)_ordItems[emptyIdx].qty=row.qty||'';
  renderOrdItems();
}
function saveCurrentOrderTemplate(){
  var cli=$('ordCli')&&$('ordCli').value?$('ordCli').value.trim():'';
  var items=(_ordItems||[]).filter(function(it){return it&&it.nm;}).map(function(it){return {nm:it.nm||'',spec:it.spec||'',qty:Number(it.qty)||0,price:Number(it.price)||0,note:it.note||''};});
  if(!cli){toast('거래처를 먼저 선택하세요','err');return;}
  if(!items.length){toast('템플릿으로 저장할 품목이 없습니다','err');return;}
  var list=getOrderTemplates();
  list.unshift({
    id:gid(),
    name:cli+' · '+(items[0].nm||'품목')+(items.length>1?' 외 '+(items.length-1)+'건':''),
    cli:cli,
    shipDt:$('ordShipDt').value||'',
    dlv:$('ordDlv').value||'',
    note:$('ordNote').value||'',
    items:items,
    savedAt:nw()
  });
  list=list.slice(0,20);
  saveOrderTemplates(list);
  renderOrderQuickBars();
  toast('수주 템플릿 저장','ok');
}
function applyOrderTemplate(id){
  var tpl=getOrderTemplates().find(function(t){return t.id===id;});
  if(!tpl)return;
  $('ordId').value='';
  $('ordNo').value=genOrderNo();
  $('ordCli').value=tpl.cli||'';
  $('ordShipDt').value=tpl.shipDt||'';
  $('ordDlv').value=tpl.dlv||'';
  $('ordNote').value=tpl.note||'';
  _ordItems=(tpl.items||[]).map(function(it){return {nm:it.nm||'',spec:it.spec||'',qty:it.qty||'',price:it.price||'',note:it.note||''};});
  if(!_ordItems.length)_ordItems=[{nm:'',spec:'',qty:'',price:'',note:''}];
  renderOrdItems();
  updateOrderAssist();
  renderOrderQuickBars();
  toast('수주 템플릿 적용','ok');
}
function cloneOrder(id){
  var o=getOrders().find(function(x){return x.id===id;});
  if(!o)return;
  resetOrder();
  $('ordCli').value=o.cli||'';
  $('ordShipDt').value=o.shipDt||'';
  $('ordDlv').value=o.dlv||'';
  $('ordNote').value=o.note||'';
  _ordItems=(o.items&&o.items.length?o.items:[{nm:o.prodNm||'',spec:'',qty:o.qty||'',price:o.price||'',note:''}]).map(function(it){
    return {nm:it.nm||'',spec:it.spec||'',qty:it.qty||'',price:it.price||'',note:it.note||''};
  });
  renderOrdItems();
  updateOrderAssist();
  renderOrderQuickBars();
  orderSub('new');
  toast('수주 복제값 준비 완료','ok');
}

function genOrderNo(){
  var now=new Date();
  var prefix='SO-'+String(now.getFullYear()).slice(2)+String(now.getMonth()+1).padStart(2,'0');
  var orders=getOrders();
  var cnt=orders.filter(function(o){return o.no&&o.no.startsWith(prefix)}).length;
  return prefix+'-'+String(cnt+1).padStart(3,'0');
}

/* 서브탭 전환 */
function orderSub(tab,btn){
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
  if(typeof SearchUtil!=='undefined'&&SearchUtil.savePref)SearchUtil.savePref('order-list','filter',f);
  btn.parentElement.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
  rOrderList();
}

/* 기간 필터 */
function setOrderPeriod(p,btn){
  _orderPeriod=p;
  if(typeof SearchUtil!=='undefined'&&SearchUtil.savePref)SearchUtil.savePref('order-list','period',p);
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
function _orderFlowSummaryHtml(o,woDateMap){
  var summary=typeof summarizeOrderFlow==='function'?summarizeOrderFlow(o,DB.g('wo')||[],DB.g('shipLog')||[]):null;
  var linkedWoIds=summary?summary.woIds:(typeof orderWOIds==='function'?orderWOIds(o):[]);
  var linkedWoNos=summary?summary.woNos:(typeof orderWONos==='function'?orderWONos(o):[]);
  var totalQty=summary?summary.totalQty:0;
  var shippedQty=summary?summary.shippedQty:0;
  var remainQty=summary?summary.remainQty:0;
  var woDt=linkedWoIds.map(function(id){return woDateMap[id]}).filter(Boolean).sort().slice(-1)[0]||'';
  var chips=['<span style="background:#DCE8F5;color:#1D4ED8;padding:1px 6px;border-radius:999px">수주 '+((o.dt||'').slice(5)||'-')+'</span>'];
  if(linkedWoIds.length){
    chips.push('<span style="background:#EDE9FE;color:#6D28D9;padding:1px 6px;border-radius:999px">WO '+(linkedWoIds.length>1?linkedWoIds.length+'건':((woDt||'').slice(5)||linkedWoNos[0]||'1건'))+'</span>');
  }else if(o.status==='수주확정'){
    chips.push('<span style="background:#F1F5F9;color:#94A3B8;padding:1px 6px;border-radius:999px">WO 미작성</span>');
  }
  if(shippedQty>0)chips.push('<span style="background:#DCFCE7;color:#166534;padding:1px 6px;border-radius:999px">출고 '+fmt(shippedQty)+' / '+fmt(totalQty||0)+'</span>');
  var meta=[];
  if(linkedWoNos.length)meta.push('연결 WO: '+linkedWoNos.join(', '));
  if(totalQty)meta.push('잔량 '+fmt(remainQty));
  if(summary&&summary.lastShipDt)meta.push('최근 출고 '+summary.lastShipDt);
  return '<div style="display:flex;flex-direction:column;gap:5px"><div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:11px">'+chips.join('<span style="color:#CBD5E1">→</span>')+'</div>'+(meta.length?'<div style="font-size:11px;color:#64748B">'+meta.join(' · ')+'</div>':'')+'</div>';
}

function _makeOrderRow(o,woDateMap,now){
  var amt=_orderAmt(o);
  var prodNm=_orderProdNm(o);
  var pendingWoCount=typeof orderPendingItemEntries==='function'?orderPendingItemEntries(o).length:0;
  var dday='';
  if(o.shipDt&&(o.status==='수주'||o.status==='수주확정'||o.status==='생산중')){
    var dd=Math.ceil((new Date(o.shipDt+'T00:00:00')-now)/(1000*60*60*24));
    if(dd<0)dday='<span style="color:#EF4444;font-weight:700;margin-left:4px">D+'+Math.abs(dd)+'</span>';
    else if(dd<=3)dday='<span style="color:#F59E0B;font-weight:700;margin-left:4px">D-'+dd+'</span>';
    else dday='<span style="color:#94A3B8;font-size:11px;margin-left:4px">D-'+dd+'</span>';
  }
  var flow=_orderFlowSummaryHtml(o,woDateMap);
  return '<tr onclick="openOrderLedgerPanel(\''+o.id+'\')" oncontextmenu="return openOrderContextMenu(event,\''+o.id+'\')">'+
    '<td style="font-weight:600;font-size:12px">'+(o.no||'-')+'</td>'+
    '<td style="font-weight:600">'+(o.cli||'-')+'</td>'+
    '<td>'+prodNm+'</td>'+
    '<td style="text-align:right;font-weight:600">'+fmt(amt)+'원</td>'+
    '<td>'+flow+'</td>'+
    '<td>'+(o.shipDt||'-')+dday+'</td>'+
    '<td>'+badge(o.status||'수주')+'</td>'+
    '<td><div style="display:flex;gap:3px">'+
      '<button class="btn btn-sm btn-o" onclick="event.stopPropagation();editOrder(\''+o.id+'\')">수정</button>'+
      (o.status==='수주'?'<button class="btn btn-sm btn-p" onclick="event.stopPropagation();confirmOrder(\''+o.id+'\')">확정</button>':'')+
      ((o.status==='수주확정'||(o.status==='생산중'&&pendingWoCount>0))?'<button class="btn btn-sm btn-s" onclick="event.stopPropagation();orderToWO(\''+o.id+'\')">작업지시</button>':'')+
      '<button class="btn btn-sm btn-d" onclick="event.stopPropagation();delOrder(\''+o.id+'\')">삭제</button>'+
    '</div></td></tr>';
}

function openOrderLedgerPanel(id){
  var o=getOrders().find(function(x){return x.id===id;});
  if(!o)return;
  var summary=typeof summarizeOrderFlow==='function'?summarizeOrderFlow(o,DB.g('wo')||[],DB.g('shipLog')||[]):null;
  var woList=(DB.g('wo')||[]).filter(function(w){return (summary&&summary.woIds||[]).includes(w.id)||w.ordId===o.id;});
  var ships=(DB.g('shipLog')||[]).filter(function(s){return s.orderId===o.id;}).sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');});
  var sales=(DB.g('sales')||[]).filter(function(s){return s.orderId===o.id;});
  var totalAmt=_orderAmt(o);
  var itemRows=(o.items||[]).map(function(it){
    var itemAmt=(Number(it.qty)||0)*(Number(it.price)||0);
    return '<tr><td style="padding:8px 10px;border-top:1px solid #F1F5F9">'+(it.nm||'-')+'</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9">'+(it.spec||'-')+'</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9;text-align:right">'+fmt(it.qty||0)+'</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9;text-align:right">'+fmt(it.price||0)+'원</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9;text-align:right">'+fmt(itemAmt)+'원</td></tr>';
  }).join('');
  var body=''
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">수주번호</div><div class="ux-sp-field-v" style="font-size:18px;font-weight:800">'+(o.no||o.id)+'</div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">'
    +'<div style="padding:12px;background:#EFF6FF;border-radius:10px"><div style="font-size:11px;color:#1D4ED8;font-weight:700">거래처</div><div style="font-size:16px;font-weight:800;color:#1E3A8A">'+(o.cli||'-')+'</div></div>'
    +'<div style="padding:12px;background:#F8FAFC;border-radius:10px"><div style="font-size:11px;color:#475569;font-weight:700">수주 금액</div><div style="font-size:16px;font-weight:800;color:#0F172A">'+fmt(totalAmt)+'원</div></div>'
    +'<div style="padding:12px;background:#FEF3C7;border-radius:10px"><div style="font-size:11px;color:#92400E;font-weight:700">납기</div><div style="font-size:16px;font-weight:800;color:#92400E">'+(o.shipDt||'-')+'</div></div>'
    +'<div style="padding:12px;background:#DCFCE7;border-radius:10px"><div style="font-size:11px;color:#166534;font-weight:700">진행 상태</div><div style="font-size:16px;font-weight:800;color:#166534">'+(summary&&summary.status||o.status||'수주')+'</div></div>'
    +'</div>'
    +'<div class="ux-sp-section"><div class="ux-sp-section-t">품목 구성</div><div style="border:1px solid #E5E7EB;border-radius:10px;overflow:hidden"><table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr style="background:#F8FAFC"><th style="padding:8px 10px;text-align:left">품목</th><th style="padding:8px 10px;text-align:left">규격</th><th style="padding:8px 10px;text-align:right">수량</th><th style="padding:8px 10px;text-align:right">단가</th><th style="padding:8px 10px;text-align:right">금액</th></tr></thead><tbody>'+(itemRows||'<tr><td colspan="5" style="padding:14px;text-align:center;color:#94A3B8">품목 없음</td></tr>')+'</tbody></table></div></div>'
    +'<div class="ux-sp-section"><div class="ux-sp-section-t">연결 흐름</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">'
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">연결 WO</div><div class="ux-sp-field-v">'+(woList.length?woList.map(function(w){return w.wn||w.id;}).join(', '):'없음')+'</div></div>'
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">출고 현황</div><div class="ux-sp-field-v">'+(summary?fmt(summary.shippedQty||0)+' / '+fmt(summary.totalQty||0):fmt(ships.reduce(function(s,r){return s+(r.qty||0);},0))+' 출고')+'</div></div>'
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">매출 연동</div><div class="ux-sp-field-v">'+(sales.length?sales.length+'건':'없음')+'</div></div>'
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">배송지</div><div class="ux-sp-field-v">'+(o.dlv||'-')+'</div></div>'
    +'</div></div>'
    +(ships.length?'<div class="ux-sp-section"><div class="ux-sp-section-t">최근 출고</div>'+ships.slice(0,5).map(function(s){
      return '<div style="padding:8px 10px;background:#F8FAFC;border-radius:8px;margin-bottom:6px;font-size:12px;display:flex;justify-content:space-between;gap:8px"><span>'+s.dt+' · '+(s.cnm||o.cli||'-')+'</span><b>'+fmt(s.qty||0)+'매</b></div>';
    }).join('')+'</div>':'')
    +'<div class="ux-sp-section" style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<button class="btn btn-p" onclick="editOrder(\''+o.id+'\');UXAdv.closeSidePanel()">수주 수정</button>'
    +'<button class="btn btn-o" onclick="cloneOrder(\''+o.id+'\');UXAdv.closeSidePanel()">복제</button>'
    +((o.status==='수주확정'||(summary&&summary.pendingWoCount>0&&summary.status==='생산중'))?'<button class="btn btn-s" onclick="orderToWO(\''+o.id+'\');UXAdv.closeSidePanel()">작업지시</button>':'')
    +'<button class="btn btn-o" onclick="openTradeDigestPanel(\''+((DB.g('cli')||[]).find(function(c){return c.nm===o.cli;})||{}).id+'\');UXAdv.closeSidePanel()">거래 확인</button>'
    +'</div>';
  if(window.UXAdv&&typeof UXAdv.openSidePanel==='function')UXAdv.openSidePanel((o.cli||'거래처')+' 수주',body);
}
function ensureOrderContextMenu(){
  var ex=document.getElementById('orderContextMenu');
  if(ex)return ex;
  var el=document.createElement('div');
  el.id='orderContextMenu';
  el.style.cssText='position:fixed;min-width:190px;background:#fff;border:1px solid #E5E7EB;border-radius:12px;box-shadow:0 18px 40px rgba(15,23,42,.16);padding:6px;z-index:220;display:none';
  document.body.appendChild(el);
  document.addEventListener('click',closeOrderContextMenu);
  return el;
}
function closeOrderContextMenu(){var el=document.getElementById('orderContextMenu');if(el)el.style.display='none';}
function openOrderContextMenu(e,id){
  e.preventDefault();
  var o=getOrders().find(function(x){return x.id===id;});if(!o)return false;
  var cli=(DB.g('cli')||[]).find(function(c){return c.nm===o.cli;});
  var el=ensureOrderContextMenu();
  el.innerHTML=''
    +'<button onclick="openOrderLedgerPanel(\''+id+'\');closeOrderContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer">상세 확인</button>'
    +'<button onclick="editOrder(\''+id+'\');closeOrderContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer">수정</button>'
    +'<button onclick="cloneOrder(\''+id+'\');closeOrderContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer">복제</button>'
    +(o.status==='수주'?'<button onclick="confirmOrder(\''+id+'\');closeOrderContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer">확정</button>':'')
    +((o.status==='수주확정'||o.status==='생산중')?'<button onclick="orderToWO(\''+id+'\');closeOrderContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer">작업지시 생성</button>':'')
    +(cli?'<button onclick="openCliLedgerPanel(\''+cli.id+'\');closeOrderContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer">거래처 원장</button>':'')
    +'<button onclick="saveCurrentOrderTemplateFromExisting(\''+id+'\');closeOrderContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer">템플릿 저장</button>'
    +'<button onclick="delOrder(\''+id+'\');closeOrderContextMenu()" style="width:100%;text-align:left;border:none;background:transparent;padding:10px 12px;border-radius:8px;cursor:pointer;color:#DC2626">삭제</button>';
  el.style.left=Math.min(e.clientX,window.innerWidth-220)+'px';
  el.style.top=Math.min(e.clientY,window.innerHeight-260)+'px';
  el.style.display='block';
  return false;
}
function saveCurrentOrderTemplateFromExisting(id){
  var o=getOrders().find(function(x){return x.id===id;});
  if(!o)return;
  var list=getOrderTemplates();
  list.unshift({
    id:gid(),
    name:(o.cli||'거래처')+' · '+_orderProdNm(o),
    cli:o.cli||'',
    shipDt:o.shipDt||'',
    dlv:o.dlv||'',
    note:o.note||'',
    items:(o.items||[]).map(function(it){return {nm:it.nm||'',spec:it.spec||'',qty:it.qty||0,price:it.price||0,note:it.note||''};}),
    savedAt:nw()
  });
  saveOrderTemplates(list.slice(0,20));
  renderOrderQuickBars();
  toast('수주 템플릿 저장','ok');
}

function rOrderList(){
  _orderSyncFilterUi();
  if(_orderPeriod!=='all'&&_orderPeriod!=='range'&&!$('orderDateVal').value)$('orderDateVal').value=td();
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
    ps.innerHTML='<div style="display:flex;gap:12px;padding:8px 14px;background:#EFF6FF;border-radius:8px;border-left:4px solid #1E3A5F;font-size:13px">'+
      '<span style="font-weight:700;color:#1E293B">조회기간 합계</span>'+
      '<span>건수: <b>'+pCnt+'</b>건</span>'+
      '<span>금액: <b style="color:#1E3A5F">'+fmt(pAmt)+'원</b></span></div>';
  }else{ps.innerHTML=''}

  // WO 날짜 맵 (woId → dt)
  var woDateMap={};
  try{DB.g('wo').forEach(function(w){if(w.id)woDateMap[w.id]=w.dt||''})}catch(e){/* WO store may not exist yet on first load — safe to ignore */}

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
        (isToday?' <span style="background:#1E3A5F;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:4px">오늘</span>':'')+
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

function updateOrderAssist(){
  var sum=$('ordQuickSummary');var note=$('ordClientHistory');var picks=$('ordClientQuickPicks');
  if(!sum||!note)return;
  var cli=$('ordCli').value||'';
  var due=$('ordShipDt').value||'';
  var activeItems=_ordItems.filter(function(it){return it&&it.nm;});
  var totalQty=activeItems.reduce(function(acc,it){return acc+(Number(it.qty)||0);},0);
  var totalAmt=activeItems.reduce(function(acc,it){return acc+((Number(it.qty)||0)*(Number(it.price)||0));},0);
  var orders=getOrders();
  var sameCli=orders.filter(function(o){return cli&&o.cli===cli}).sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'')});
  var latest=sameCli[0]||null;
  var latestItem=latest&&latest.items&&latest.items[0]?latest.items[0]:null;
  sum.innerHTML=''
    +'<div class="item"><div class="k">품목 수</div><div class="v">'+(activeItems.length||0)+'개</div></div>'
    +'<div class="item"><div class="k">총 수량</div><div class="v">'+(totalQty?fmt(totalQty)+'매':'미입력')+'</div></div>'
    +'<div class="item"><div class="k">예상 수주금액</div><div class="v">'+(totalAmt?fmt(totalAmt)+'원':'0원')+'</div></div>'
    +'<div class="item"><div class="k">납기 흐름</div><div class="v">'+(due||'미정')+'</div></div>';
  if(!cli){
    note.innerHTML='거래처를 선택하면 <b>최근 수주</b>, <b>반복 품목</b>, <b>최근 단가</b>를 이 자리에서 바로 보여줍니다.';
    if(picks)picks.innerHTML='';
    renderOrderQuickBars();
    return;
  }
  var dueTag='';
  if(due){
    var diff=Math.round((new Date(due+'T00:00:00')-new Date(td()+'T00:00:00'))/86400000);
    dueTag='<span class="pack-chip '+(diff<0?'warn':diff<=2?'warn':'ok')+'">'+(diff<0?(''+Math.abs(diff)+'일 지연 위험'):diff===0?'오늘 납기':('D-'+diff))+'</span>';
  }
  var repeatProducts=[...new Set(sameCli.flatMap(function(o){return (o.items||[]).map(function(it){return it.nm}).filter(Boolean);}))]
    .slice(0,4)
    .map(function(nm){return '<span class="pack-chip">'+nm+'</span>'})
    .join('');
  var recentItemRows=sameCli.flatMap(function(o){
    return (o.items||[]).map(function(it,idx){
      return {orderId:o.id,itemIdx:idx,nm:it.nm||'',spec:it.spec||'',price:Number(it.price)||0,qty:Number(it.qty)||0,dt:o.dt||''};
    });
  }).filter(function(it){return it.nm;});
  var seen={};
  recentItemRows=recentItemRows.filter(function(it){
    var key=[it.nm,it.spec,it.price].join('|');
    if(seen[key])return false;
    seen[key]=1;
    return true;
  }).slice(0,6);
  note.innerHTML='<div><b>'+cli+'</b> 기준 최근 수주 '+sameCli.length+'건'
    +(latest?' · 마지막 수주 '+latest.dt:'')
    +(latestItem&&latestItem.price?(' · 최근 단가 '+fmt(latestItem.price)+'원'):'')
    +'</div><div class="pack-chip-row">'+(dueTag||'')+(repeatProducts||'<span class="pack-chip">반복 품목 없음</span>')+'</div>';
  if(picks){
    picks.innerHTML=recentItemRows.length
      ?recentItemRows.map(function(it,idx){
        return '<button class="pack-search-tag" onclick="applyOrderQuickPick('+idx+')">'+it.nm+(it.spec?' · '+it.spec:'')+(it.price?(' · '+fmt(it.price)+'원'):'')+'</button>';
      }).join('')
      :'';
    window._orderQuickPickRows=recentItemRows;
  }
  renderOrderQuickBars();
}
function applyOrderQuickPick(idx){
  var row=(window._orderQuickPickRows||[])[idx];
  if(!row)return;
  var emptyIdx=_ordItems.findIndex(function(it){return !(it&&it.nm);});
  if(emptyIdx<0){_ordItems.push({nm:'',spec:'',qty:'',price:'',note:''});emptyIdx=_ordItems.length-1;}
  _ordItems[emptyIdx].nm=row.nm||'';
  _ordItems[emptyIdx].spec=row.spec||'';
  _ordItems[emptyIdx].price=row.price||'';
  if(!_ordItems[emptyIdx].qty)_ordItems[emptyIdx].qty=row.qty||'';
  renderOrdItems();
  toast((row.nm||'최근 품목')+' 불러옴','ok');
}

function bindOrderAssistEvents(){
  ['ordDt','ordShipDt','ordDlv','ordNote'].forEach(function(id){
    var el=$(id);if(!el||el.dataset.assistBound)return;
    el.addEventListener('input',updateOrderAssist);
    el.addEventListener('change',updateOrderAssist);
    el.dataset.assistBound='1';
  });
}

/* 수주 초기화 */
function resetOrder(){
  bindOrderAssistEvents();
  $('ordId').value='';
  $('ordNo').value=genOrderNo();
  $('ordDt').value=new Date().toISOString().slice(0,10);
  $('ordCli').value='';
  $('ordShipDt').value='';
  $('ordDlv').value='';
  $('ordNote').value='';
  $('orderFormTitle').textContent='패키지 수주 등록';
  _ordItems=[{nm:'',spec:'',qty:'',price:'',note:''}];
  renderOrdItems();
  updateOrderAssist();
  renderOrderQuickBars();
}

/* 품목 행 렌더 */
function renderOrdItems(){
  var body=$('ordItemBody');
  body.innerHTML=_ordItems.map(function(it,i){
    var amt=(Number(it.qty)||0)*(Number(it.price)||0);
    return '<tr>'+
      '<td><input value="'+(it.nm||'')+'" onchange="_ordItems['+i+'].nm=this.value;updateOrderAssist()" style="width:100%;padding:4px 6px;font-size:12px;border:1px solid var(--bdr);border-radius:4px" placeholder="제품명"></td>'+
      '<td><input value="'+(it.spec||'')+'" onchange="_ordItems['+i+'].spec=this.value;updateOrderAssist()" style="width:80px;padding:4px 6px;font-size:12px;border:1px solid var(--bdr);border-radius:4px" placeholder="규격"></td>'+
      '<td><input type="number" value="'+(it.qty||'')+'" onchange="_ordItems['+i+'].qty=this.value;renderOrdItems()" style="width:70px;padding:4px 6px;font-size:12px;border:1px solid var(--bdr);border-radius:4px;text-align:right"></td>'+
      '<td><input type="number" value="'+(it.price||'')+'" onchange="_ordItems['+i+'].price=this.value;renderOrdItems()" style="width:80px;padding:4px 6px;font-size:12px;border:1px solid var(--bdr);border-radius:4px;text-align:right"></td>'+
      '<td style="text-align:right;font-weight:600">'+fmt(amt)+'</td>'+
      '<td><input value="'+(it.note||'')+'" onchange="_ordItems['+i+'].note=this.value;updateOrderAssist()" style="width:80px;padding:4px 6px;font-size:12px;border:1px solid var(--bdr);border-radius:4px"></td>'+
      '<td><button class="btn btn-sm btn-d" onclick="removeOrdItem('+i+')">X</button></td></tr>';
  }).join('');
  var total=0;_ordItems.forEach(function(it){total+=(Number(it.qty)||0)*(Number(it.price)||0)});
  $('ordTotalAmt').textContent=fmt(total);
  updateOrderAssist();
  renderOrderQuickBars();
}

function addOrdItem(){_ordItems.push({nm:'',spec:'',qty:'',price:'',note:''});renderOrdItems()}
function removeOrdItem(i){if(_ordItems.length<=1){toast('최소 1개 품목이 필요합니다','err');return}_ordItems.splice(i,1);renderOrdItems()}

/* 거래처 검색 (수주용) */
function openOrdCliSearch(){
  var clis=DB.g('cli')||[];
  if(!clis.length){toast('거래처를 먼저 등록하세요','err');return}
  openPackSearchModal({
    title:'거래처 선택',
    subTitle:'수주 입력용 거래처를 이름, 담당자, 전화번호 기준으로 찾습니다.',
    placeholder:'거래처명, 담당자, 전화번호 검색',
    historyKey:'order-cli',
    pickHistoryKey:'order-cli',
    modeKey:'order-cli-search',
    fields:['nm','ps','tel','biz','addr'],
    getItems:function(){
      return clis.filter(function(c){return (!c.cType||c.cType==='sales'||c.cType==='both')&&!c.isDormant;}).sort(function(a,b){return (a.nm||'').localeCompare(b.nm||'')});
    },
    renderRow:function(item,q){
      var orderCount=(getOrders()||[]).filter(function(o){return o.cli===item.nm;}).length;
      return {
        primary:SearchUtil.highlight(item.nm||'',q),
        secondary:[item.ps||'',item.tel||'',item.biz||'',item.addr||''].filter(Boolean).map(function(v){return SearchUtil.highlight(v,q)}).join(' | '),
        meta:orderCount?('수주 '+orderCount+'건'):'신규 거래처'
      };
    },
    onPick:function(item){
      $('ordCli').value=item.nm||'';
      updateOrderAssist();
    }
  });
}
function filterOrdCli(){
  var clis=DB.g('cli')||[];
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
  updateOrderAssist();
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
  var existing=isEdit?orders.find(function(o){return o.id===id}):null;
  var items=_ordItems.filter(function(it){return it.nm}).map(function(it){
    return {nm:it.nm,spec:it.spec||'',qty:+it.qty||0,price:+it.price||0,note:it.note||''};
  });
  var totalAmt=items.reduce(function(sum,it){return sum+((Number(it.qty)||0)*(Number(it.price)||0));},0);

  var obj={
    id:id||'ord_'+Date.now(),
    no:$('ordNo').value,
    dt:$('ordDt').value,
    cli:cli,
    shipDt:$('ordShipDt').value,
    dlv:$('ordDlv').value,
    note:$('ordNote').value,
    items:items,
    price:items.length===1?(items[0].price||0):0,
    amt:totalAmt,
    status:'수주',
    cdt:existing&&existing.cdt||new Date().toISOString(),
    quoteId:existing&&existing.quoteId||'',
    quoteNum:existing&&existing.quoteNum||'',
    quoteSnapshot:existing&&existing.quoteSnapshot||null,
    woId:existing&&existing.woId||'',
    woNo:existing&&existing.woNo||'',
    woIds:existing&&Array.isArray(existing.woIds)?existing.woIds.slice():(existing&&existing.woId?[existing.woId]:[]),
    woNos:existing&&Array.isArray(existing.woNos)?existing.woNos.slice():(existing&&existing.woNo?[existing.woNo]:[]),
    woLinks:existing&&Array.isArray(existing.woLinks)?existing.woLinks.map(function(link){return Object.assign({},link)}):[]
  };

  if(isEdit){
    var idx=orders.findIndex(function(o){return o.id===id});
    if(idx>=0){obj.status=orders[idx].status;orders[idx]=obj}
  }else{
    orders.push(obj);
  }
  saveOrders(orders);
  updateOrderAssist();
  renderOrderQuickBars();
  toast(isEdit?'패키지 수주 수정 완료':'패키지 수주 등록 완료','ok');
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
      '<div style="background:#1E3A5F;padding:16px 20px">'+
        '<div style="font-size:15px;font-weight:700;color:#fff">패키지 수주 등록 완료</div>'+
        '<div style="font-size:12px;color:#B0C9E0;margin-top:2px">'+o.no+' · '+(o.cli||'')+'</div>'+
      '</div>'+
      '<div style="padding:20px">'+
        '<div style="font-size:14px;color:#1E293B;margin-bottom:16px">패키지 작업지시를 바로 작성하시겠습니까?</div>'+
        '<div style="display:flex;gap:8px">'+
          '<button onclick="_doWONow(\''+o.id+'\')" style="flex:1;padding:10px;background:#1E3A5F;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">지금 작성</button>'+
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
  bindOrderAssistEvents();
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
  $('orderFormTitle').textContent='패키지 수주 수정';
  _ordItems=o.items&&o.items.length?o.items.map(function(it){return{nm:it.nm,spec:it.spec,qty:it.qty,price:it.price,note:it.note}}):[{nm:o.prodNm||'',spec:'',qty:o.qty||'',price:o.price||'',note:''}];
  renderOrdItems();
  updateOrderAssist();
  renderOrderQuickBars();
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

  var entries=typeof orderPendingItemEntries==='function'?orderPendingItemEntries(o):((o.items||[]).map(function(it,idx){return{it:it,idx:idx}}).filter(function(entry){return entry.it&&entry.it.nm}));
  if(!entries.length){toast('이미 모든 품목이 작업지시로 연결되었습니다','err');return}

  // 품목이 여러 개면 체크박스 선택 팝업 (개선)
  if(entries.length>1){
    var el=document.createElement('div');el.className='mo-bg';el.id='ordToWoMo';
    var listH=entries.map(function(entry){
      var it=entry.it;
      return '<label class="ord-wo-row" style="display:flex;gap:10px;padding:10px 14px;border-bottom:1px solid #F1F5F9;cursor:pointer;align-items:center;transition:background .1s" onmouseover="this.style.background=\'#F8FAFC\'" onmouseout="this.style.background=\'\'">'
        +'<input type="checkbox" class="ord-wo-chk" data-idx="'+entry.idx+'" checked style="width:16px;height:16px;cursor:pointer">'
        +'<div style="flex:1"><div style="font-weight:700;font-size:13px;color:#0F172A">'+(it.nm||'')+'</div><div style="font-size:11px;color:#64748B;margin-top:2px">'+(it.spec||'-')+(it.qty?' · '+fmt(it.qty)+'매':'')+(it.price?' · '+fmt(it.price)+'원':'')+'</div></div>'
        +'<button type="button" onclick="event.preventDefault();event.stopPropagation();selectOrdItem(\''+id+'\','+entry.idx+')" class="btn btn-o btn-sm" style="padding:5px 10px;font-size:11px;white-space:nowrap">개별 작성 ›</button>'
        +'</label>';
    }).join('');
    el.innerHTML='<div style="background:#fff;border-radius:14px;width:480px;box-shadow:0 25px 50px rgba(0,0,0,.15)">'
      +'<div style="padding:14px 18px;border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center">'
      +'<div><div style="font-weight:800;font-size:15px;color:#0F172A">작업지시로 넘길 품목</div><div style="font-size:11px;color:#64748B;margin-top:2px">체크된 품목마다 별도 패키지 작업지시가 생성됩니다</div></div>'
      +'<button onclick="document.getElementById(\'ordToWoMo\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94A3B8">&times;</button></div>'
      +'<div style="padding:4px 0;max-height:50vh;overflow-y:auto">'+listH+'</div>'
      +'<div style="padding:10px 16px;border-top:1px solid var(--bdr);display:flex;gap:8px;align-items:center">'
      +'<button onclick="_ordWoChkAll(true)" class="btn btn-o btn-sm" style="font-size:11px">전체 선택</button>'
      +'<button onclick="_ordWoChkAll(false)" class="btn btn-o btn-sm" style="font-size:11px">해제</button>'
      +'<div style="margin-left:auto;display:flex;gap:6px">'
      +'<button onclick="document.getElementById(\'ordToWoMo\').remove()" class="btn btn-o btn-sm">취소</button>'
      +'<button onclick="_batchOrdToWO(\''+id+'\')" class="btn btn-p btn-sm" style="font-weight:700">선택 일괄 생성</button>'
      +'</div></div></div>';
    document.body.appendChild(el);
    window._orderToWoId=id;
    return;
  }

  // 단일 품목
  _fillWOFromOrder(o,entries[0].it,entries[0].idx);
}
function selectOrdItem(ordId,idx){
  var el=document.getElementById('ordToWoMo');if(el)el.remove();
  var o=getOrders().find(function(x){return x.id===ordId});
  if(!o)return;
  var item=(o.items||[])[idx];
  if(item&&item.nm)_fillWOFromOrder(o,item,idx);
}
/* 체크된 품목들 일괄 선택 (전체/해제) */
function _ordWoChkAll(on){
  document.querySelectorAll('.ord-wo-chk').forEach(function(c){c.checked=!!on;});
}
window._ordWoChkAll = _ordWoChkAll;
/* 체크된 품목 일괄 WO 생성 — 각 품목마다 드래프트 WO 를 대기 상태로 저장 */
function _batchOrdToWO(ordId){
  var chks = [...document.querySelectorAll('.ord-wo-chk:checked')];
  if(!chks.length){ toast('선택된 품목이 없습니다','err'); return; }
  var o = getOrders().find(function(x){return x.id===ordId;});
  if(!o) return;
  if(chks.length === 1){
    // 1개면 기존 플로우 그대로 (폼 열고 사용자 검토)
    var idx = +chks[0].getAttribute('data-idx');
    _fillWOFromOrder(o, o.items[idx], idx);
    document.getElementById('ordToWoMo')?.remove();
    return;
  }
  if(!confirm(chks.length+'개 품목을 한번에 작업지시로 생성합니다.\n각 WO 는 "대기" 상태로 저장되며, 필요 시 개별 수정 가능합니다.\n계속하시겠습니까?')) return;
  var wos = DB.g('wo') || [];
  var created = [];
  chks.forEach(function(c){
    var idx = +c.getAttribute('data-idx');
    var it  = (o.items||[])[idx];
    if(!it || !it.nm) return;
    var wn = (typeof gWN === 'function') ? gWN() : ('WO-'+Date.now());
    // 같은 tick 내 중복 방지
    while(wos.some(function(w){return w.wn===wn;})) wn = wn + '-' + Math.random().toString(36).substr(2,3);
    var noteBits = [];
    if(o.quoteNum) noteBits.push('견적번호: '+o.quoteNum);
    if(o.no)       noteBits.push('수주번호: '+o.no);
    if(it.spec)    noteBits.push('사양: '+it.spec);
    if(o.note)     noteBits.push(o.note);
    var newWO = {
      id: (typeof gid==='function'?gid():Date.now().toString(36)+Math.random().toString(36).substr(2,5)),
      wn: wn,
      dt: (typeof td==='function'?td():new Date().toISOString().slice(0,10)),
      cnm: o.cli || '',
      pnm: it.nm || '',
      spec: it.spec || '',
      fq: Number(it.qty)||0,
      qm: Number(it.qty)||0,
      qe: 0,
      price: Number(it.price)||Number(o.price)||0,
      sd: o.shipDt || o.due || '',
      dlv: o.dlv || '',
      nt: noteBits.join(' / '),
      status: '대기',
      procs: [],
      mgr: (typeof CU !== 'undefined' && CU && CU.nm) ? CU.nm : '',
      ordId: o.id,
      cat: (typeof nw==='function'?nw():new Date().toISOString())
    };
    wos.push(newWO);
    created.push(newWO);
  });
  DB.s('wo', wos);
  // 수주 상태 갱신 (연결 WO 존재하므로 '생산중' 혹은 기존 로직에 맡김)
  if(typeof syncOrderFlowState === 'function') try{ syncOrderFlowState(o.id, null, DB.g('wo'), null); }catch(e){}
  if(typeof rWOList === 'function') rWOList();
  if(typeof rOrderList === 'function') rOrderList();
  if(typeof rDash === 'function') rDash();
  document.getElementById('ordToWoMo')?.remove();
  toast(created.length+'개 작업지시 일괄 생성 완료 ('+created.map(function(w){return w.wn;}).join(', ')+')','ok');
}
window._batchOrdToWO = _batchOrdToWO;
function _fillWOFromOrder(o,it,itemIdx){
  goMod('mes-wo');woSub('new');
  setTimeout(function(){
    $('woCli').value=o.cli||'';
    $('woProd').value=it.nm||'';
    $('woFQ').value=it.qty||'';
    $('woQM').value=it.qty||'';
    $('woShip').value=o.shipDt||o.due||'';
    $('woDlv').value=o.dlv||'';
    var noteBits=[];
    if(o.quoteNum)noteBits.push('견적번호: '+o.quoteNum);
    if(o.no)noteBits.push('수주번호: '+o.no);
    if(it.spec)noteBits.push('사양: '+it.spec);
    if(o.note)noteBits.push(o.note);
    $('woNote').value=noteBits.join(' / ');
    if($('woPrice'))$('woPrice').value=it.price||o.price||'';
    _updateWoAmt();
    // 수주 ID 연결 (hidden field)
    if($('woOrdId')){
      $('woOrdId').value=o.id;
      $('woOrdId').dataset.itemIdx=itemIdx===undefined||itemIdx===null?'':String(itemIdx);
      $('woOrdId').dataset.orderNo=o.no||'';
      $('woOrdId').dataset.quoteNum=o.quoteNum||'';
    }
    toast('패키지 작업지시 화면으로 이동합니다. 공정 흐름을 확인한 뒤 저장하세요.');
    if(typeof renderWOOrderBridge==='function')renderWOOrderBridge({orderId:o.id,orderNo:o.no||'',quoteNum:o.quoteNum||'',client:o.cli||'',product:it.nm||'',spec:it.spec||'',qty:it.qty||0,due:o.shipDt||o.due||''});
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
    var fill=isSel?'#1E3A5F':d.cnt>0?'#7EB8E0':'#E2E8F0';
    var stroke=isSel?'#1D4ED8':'none';
    var label=m.slice(5)+'월';
    return '<g onclick="openOrderMonthPopup(\''+m+'\')" style="cursor:pointer">'+
      '<rect x="'+x+'" y="'+(topPad+innerH-Math.max(barH,2))+'" width="'+barW+'" height="'+Math.max(barH,2)+'" rx="4" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>'+
      (d.cnt>0?'<text x="'+(x+barW/2)+'" y="'+(topPad+innerH-barH-5)+'" text-anchor="middle" font-size="10" fill="'+(isSel?'#1D4ED8':'#64748B')+'">'+d.cnt+'</text>':'')+
      '<text x="'+(x+barW/2)+'" y="'+(topPad+innerH+15)+'" text-anchor="middle" font-size="11" fill="'+(isSel?'#1D4ED8':'#374151')+'" font-weight="'+(isSel?'700':'400')+'">'+label+'</text>'+
      (d.amt>0?'<text x="'+(x+barW/2)+'" y="'+(topPad+innerH+26)+'" text-anchor="middle" font-size="9" fill="'+(isSel?'#1E3A5F':'#94A3B8')+'">'+Math.round(d.amt/10000)+'만</text>':'')+
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
  var stColors={수주:'#1E3A5F',수주확정:'#8B5CF6',생산중:'#F59E0B',출고완료:'#10B981',취소:'#94A3B8'};
  var cards=months.map(function(m){
    var d=mData[m];
    var isSel=m===_orderSelMonth;
    var yr=m.slice(0,4),mo=m.slice(5);
    var border=isSel?'2px solid #1E3A5F':'1px solid #E2E8F0';
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
        '<span style="font-size:12px;font-weight:600;color:'+(isSel?'#1E3A5F':'#64748B')+'">'+d.cnt+'건</span>'+
      '</div>'+
      '<div style="font-size:14px;font-weight:700;color:'+(isSel?'#1E3A5F':'#334155')+';margin-bottom:4px">'+fmt(d.amt)+'원</div>'+
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
        '<span style="display:flex;align-items:center;gap:3px"><span style="display:inline-block;width:10px;height:10px;background:#1E3A5F;border-radius:2px"></span> 선택된 월</span>'+
        '<span style="display:flex;align-items:center;gap:3px"><span style="display:inline-block;width:10px;height:10px;background:#7EB8E0;border-radius:2px"></span> 수주 있음</span>'+
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
    var woNos=typeof orderWONos==='function'?orderWONos(o):(o.woNo?[o.woNo]:[]);
    var woLink=woNos.length?'<a href="#" onclick="cMo(\'ordMonthPopMo\');goMod(\'mes-wo\');return false" style="color:#1E3A5F;font-weight:600">'+(woNos.length>1?woNos[0]+' 외 '+(woNos.length-1)+'건':woNos[0])+'</a>':'-';
    return '<tr><td style="font-weight:600">'+(o.no||'-')+'</td><td>'+(o.cli||'-')+'</td><td>'+prodNm+'</td><td style="text-align:right">'+fmt(qty)+'</td><td style="text-align:right;font-weight:600;color:#1E3A5F">'+fmt(amt)+'원</td><td>'+(o.shipDt||'-')+'</td><td style="text-align:center">'+woLink+'</td><td>'+badge(o.status||'수주')+'</td></tr>';
  }).join(''):'<tr><td colspan="8" style="text-align:center;padding:20px;color:#94A3B8">수주 내역이 없습니다</td></tr>';
  var h='<div class="cmb" style="width:780px;max-height:85vh;display:flex;flex-direction:column">';
  h+='<div class="mh" style="flex-shrink:0"><h3>'+yr+'년 '+mo+'월 수주 목록</h3><button class="mc" onclick="cMo(\'ordMonthPopMo\')">&times;</button></div>';
  h+='<div style="padding:8px 16px;background:#F8FAFC;border-bottom:1px solid #E2E8F0;display:flex;gap:16px">';
  h+='<span style="font-size:13px;color:#64748B">총 <b style="color:#1E293B">'+selOrders.length+'건</b></span>';
  h+='<span style="font-size:13px;color:#64748B">총액 <b style="color:#1E3A5F">'+fmt(totalAmt)+'원</b></span></div>';
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
  orderSub('list');
}

// ===== 이력조회 =====
function rLotHist(){
  var sch=($('lotSch')?$('lotSch').value:'').trim().toLowerCase();
  var area=$('lotResult');if(!area)return;
  if(!sch){
    area.innerHTML='<div class="empty-state"><div class="msg">제품명을 검색하세요</div><div class="sub">협력사 · 작업수량 · 출고량 · 불량 이력을 한눈에 확인</div></div>';
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
    +'<th>지시번호</th><th>제품명</th><th>거래처</th><th>협력사</th><th>작업수량</th><th>출고량</th><th>불량</th><th>손실</th><th>최근출고</th><th>상태</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}

function showLotDetail(woId){
  var o=DB.g('wo').find(function(x){return x.id===woId});if(!o)return;
  var shipLogs=DB.g('shipLog').filter(function(s){return s.woId===woId});
  var claims=DB.g('claims').filter(function(c){return c.pnm===o.pnm&&c.cnm===o.cnm});
  // 공정/인쇄소
  var procs=(o.procs||[]).filter(function(p){return p.vd&&p.vd.trim()});
  var procsHtml=procs.length?'<div style="margin-top:12px"><div style="font-size:12px;font-weight:700;color:var(--txt3);margin-bottom:6px">공정 / 협력사</div>'
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
  // ===== Timeline view =====
  var totalPaper=0;
  if(o.papers&&o.papers.length){o.papers.forEach(function(p){totalPaper+=(p.qm||0)+(p.qe||0)})}
  else{totalPaper=(o.qm||0)+(o.qe||0)}
  var paperLines=(o.papers&&o.papers.length?o.papers:[{paper:o.paper,spec:o.spec,qm:o.qm,qe:o.qe}]).map(function(p){
    return '<div style="padding:4px 0">'+(p.paper||'미기재')+(p.spec?' <span style="color:var(--txt3)">('+p.spec+')</span>':'')+' — 정매 <strong>'+fmt(p.qm||0)+'</strong> + 여분 <strong>'+fmt(p.qe||0)+'</strong></div>';
  }).join('');
  var orderStep='<div class="lot-step done"><div class="lot-step-hd">📋 작업 지시 <span class="lot-step-date">'+(o.cat||o.dt||'-')+'</span></div><div class="lot-step-body"><strong>'+o.wn+'</strong> · '+o.cnm+' · 완제품 <strong>'+fmt(o.fq||0)+'</strong>매<div style="margin-top:6px;color:var(--txt3);font-size:11px">납기 '+(o.sd||'미정')+'</div></div></div>';
  var paperStep=totalPaper>0?'<div class="lot-step done"><div class="lot-step-hd">📦 종이 발주 <span class="lot-step-date">총 '+fmt(totalPaper)+'매</span></div><div class="lot-step-body">'+paperLines+'</div></div>':'';
  var procStep=procs.length?'<div class="lot-step done"><div class="lot-step-hd">⚙️ 공정 진행 <span class="lot-step-date">'+procs.length+'개 공정</span></div><div class="lot-step-body">'+procs.map(function(p){return'<div style="padding:3px 0"><strong>'+p.nm+'</strong>'+(p.mt?' · '+p.mt:'')+' → '+p.vd+'</div>'}).join('')+'</div></div>':'';
  var shipSteps=sortedLogs.length?sortedLogs.slice().reverse().map(function(s){
    var cls=s.defect>0?'warn':'done';
    return '<div class="lot-step '+cls+'"><div class="lot-step-hd">🚚 출고 <span class="lot-step-date">'+s.dt+'</span></div><div class="lot-step-body"><strong>'+fmt(s.qty)+'</strong>매 출고 · 양품 <strong style="color:var(--suc)">'+fmt(s.good||s.qty)+'</strong>'+(s.defect?' · 불량 <strong style="color:var(--dan)">'+fmt(s.defect)+'</strong>':'')+(s.dlv?'<div style="margin-top:4px;color:var(--txt3);font-size:11px">→ '+s.dlv+'</div>':'')+'</div></div>';
  }).join(''):'<div class="lot-step"><div class="lot-step-hd">🚚 출고 대기</div><div class="lot-step-body" style="color:var(--txt3)">아직 출고 이력 없음</div></div>';
  var claimSteps=claims.length?claims.map(function(c){
    return '<div class="lot-step danger"><div class="lot-step-hd">⚠ '+c.type+' <span class="lot-step-date">'+c.dt+'</span></div><div class="lot-step-body"><strong>'+fmt(c.qty)+'</strong>매 · '+c.reason+'<div style="margin-top:4px;color:var(--txt3);font-size:11px">상태: '+c.st+'</div></div></div>';
  }).join(''):'';
  var h='<div class="fr">'
    +'<div class="fg"><label>지시번호</label><div style="font-weight:800;color:var(--pri);font-size:15px">'+o.wn+'</div></div>'
    +'<div class="fg"><label>거래처</label><div style="font-weight:700">'+o.cnm+'</div></div>'
    +'<div class="fg"><label>완제품 수량</label><div style="font-weight:700">'+fmt(o.fq||0)+'매</div></div>'
    +'</div>'
    +'<div style="margin-top:10px;margin-bottom:18px;padding:14px 16px;background:var(--pri-l);border-radius:var(--r-sm);border-left:3px solid var(--pri)"><div style="font-size:11px;color:var(--pri);font-weight:700;letter-spacing:.3px;text-transform:uppercase;margin-bottom:4px">제품명</div><div style="font-weight:800;font-size:18px;color:var(--txt)">'+o.pnm+'</div></div>'
    +'<div class="lot-tl">'+orderStep+paperStep+procStep+shipSteps+claimSteps+'</div>';
  $('lotDetC').innerHTML=h;
  $('lotDetTitle').textContent=o.pnm+' — 생산 이력';
  oMo('lotDetMo');
}
