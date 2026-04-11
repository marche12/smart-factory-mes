/* ===== ERP:sales ===== */

function cAmt(p){const q=+$(p+'Qty').value||1,pr=+$(p+'Price').value||0;$(p+'Amt').value=fmt(q*pr)+'원'}
function cTax(){const s=+$('txSup').value||0;$('txVat').value=Math.round(s*0.1);$('txTot').value=fmt(s+Math.round(s*0.1))+'원'}

/* === 매출 === */
function rSl(){
  const mo=$('slMo').value||td().slice(0,7);if(!$('slMo').value)$('slMo').value=mo;
  const sch=($('slSch').value||'').toLowerCase(),uo=$('slUO').checked;
  const all=DB.g('sales'),ma=all.filter(r=>r.dt.startsWith(mo));
  const fl=ma.filter(r=>{if(sch&&!r.cli.toLowerCase().includes(sch))return false;if(uo&&(r.paid||0)>=(r.amt||0))return false;return true}).sort((a,b)=>b.dt>a.dt?1:-1);
  $('slT').textContent=fmt(ma.reduce((s,r)=>s+(r.amt||0),0))+'원';
  $('slU').textContent=fmt(ma.reduce((s,r)=>s+Math.max(0,(r.amt||0)-(r.paid||0)),0))+'원';
  $('slP').textContent=fmt(ma.reduce((s,r)=>s+(r.paid||0),0))+'원';
  $('slC').textContent=[...new Set(ma.map(r=>r.cli))].length;
  $('slTbl').querySelector('tbody').innerHTML=fl.map(r=>{const u=Math.max(0,(r.amt||0)-(r.paid||0));const st=u<=0?'<span class="bd bd-s">완납</span>':r.paid>0?'<span class="bd bd-o">부분</span>':'<span class="bd bd-d">미수</span>';
    const supply=Math.round((r.amt||0)/1.1),vat=(r.amt||0)-supply;
    return `<tr${u>0?' class="row-warn"':''}><td>${r.dt}</td><td style="font-weight:700">${r.cli}</td><td>${r.prod}</td><td style="text-align:right">${fmt(r.qty)}</td><td style="text-align:right">${fmt(r.price)}</td><td style="text-align:right">${fmt(supply)}</td><td style="text-align:right;color:var(--txt2)">${fmt(vat)}</td><td style="text-align:right;font-weight:700">${fmt(r.amt)}</td><td style="text-align:right;color:var(--suc)">${fmt(r.paid||0)}</td><td style="text-align:right;color:var(--dan);font-weight:700">${fmt(u)}</td><td>${st}</td><td><button class="btn btn-sm btn-o" onclick="genTradeStatement('${r.id}')" title="거래명세서">명세</button> <button class="btn btn-sm btn-o" onclick="eSlr('${r.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dSlr('${r.id}')">삭제</button></td></tr>`}).join('')||'<tr><td colspan="12" class="empty-cell">등록된 내역이 없습니다. 상단 버튼으로 등록해주세요.</td></tr>';
  rRecv();
}
function rRecv(){
  const el=$('recvList');if(!el)return;
  const all=DB.g('sales');
  const byCli={};
  all.forEach(r=>{const u=Math.max(0,(r.amt||0)-(r.paid||0));if(u<=0)return;
    if(!byCli[r.cli])byCli[r.cli]={cli:r.cli,amt:0,oldest:r.dt};
    byCli[r.cli].amt+=u;
    if(r.dt<byCli[r.cli].oldest)byCli[r.cli].oldest=r.dt;
  });
  const list=Object.values(byCli).sort((a,b)=>b.amt-a.amt);
  if(!list.length){el.innerHTML='<div class="recv-empty">미수금이 없습니다.</div>';return}
  const max=Math.max(...list.map(x=>x.amt));
  const today=new Date();
  el.innerHTML=list.map(x=>{
    const days=Math.floor((today-new Date(x.oldest))/86400000);
    const lv=days>=30?'lv-hi':days>=14?'lv-md':'lv-lo';
    const w=Math.max(5,Math.round(x.amt/max*100));
    return `<div class="recv-row"><div class="recv-nm">${x.cli}</div><div class="recv-bar-wrap"><div class="recv-bar ${lv}" style="width:${w}%"></div></div><div class="recv-amt">${fmt(x.amt)}원</div><div class="recv-days">${days}일 경과</div></div>`;
  }).join('');
}
function openSM(){['sId','sProd','sNote'].forEach(x=>$(x).value='');$('sDt').value=td();$('sCli').value='';$('sQty').value='';$('sPrice').value='';$('sAmt').value='';$('sPaid').value=0;$('sPay').value='미수';$('sMoT').textContent='매출 등록';oMo('sMo')}
function eSlr(id){const r=DB.g('sales').find(x=>x.id===id);if(!r)return;$('sId').value=r.id;$('sDt').value=r.dt;$('sCli').value=r.cli;$('sProd').value=r.prod;$('sQty').value=r.qty;$('sPrice').value=r.price;$('sAmt').value=fmt(r.amt);$('sPaid').value=r.paid||0;$('sPay').value=r.payType||'미수';$('sNote').value=r.note||'';$('sMoT').textContent='매출 수정';oMo('sMo')}
function saveSl(){const c=$('sCli').value.trim(),p=$('sProd').value.trim(),pr=+$('sPrice').value;if(!c){toast('거래처','err');return}if(!p){toast('품명','err');return}if(!pr){toast('단가','err');return}const id=$('sId').value||gid(),q=+$('sQty').value||1;const rec={id,dt:$('sDt').value,cli:c,prod:p,qty:q,price:pr,amt:q*pr,paid:+$('sPaid').value||0,payType:$('sPay').value,note:$('sNote').value,cat:nw()};const ls=DB.g('sales');const idx=ls.findIndex(x=>x.id===id);if(idx>=0)ls[idx]=rec;else ls.push(rec);DB.s('sales',ls);cMo('sMo');rSl();toast('저장','ok')}
function dSlr(id){if(!confirm('삭제?'))return;DB.s('sales',DB.g('sales').filter(x=>x.id!==id));rSl();toast('삭제','ok')}

/* === 매입 === */
function rPr(){
  const mo=$('prMo').value||td().slice(0,7);if(!$('prMo').value)$('prMo').value=mo;
  const sch=($('prSch').value||'').toLowerCase(),uo=$('prUO').checked;
  const all=DB.g('purchase'),ma=all.filter(r=>r.dt.startsWith(mo));
  const fl=ma.filter(r=>{if(sch&&!r.cli.toLowerCase().includes(sch))return false;if(uo&&(r.paid||0)>=(r.amt||0))return false;return true}).sort((a,b)=>b.dt>a.dt?1:-1);
  $('prT').textContent=fmt(ma.reduce((s,r)=>s+(r.amt||0),0))+'원';
  $('prU').textContent=fmt(ma.reduce((s,r)=>s+Math.max(0,(r.amt||0)-(r.paid||0)),0))+'원';
  $('prP').textContent=fmt(ma.reduce((s,r)=>s+(r.paid||0),0))+'원';
  $('prC').textContent=[...new Set(ma.map(r=>r.cli))].length;
  $('prTbl').querySelector('tbody').innerHTML=fl.map(r=>{const u=Math.max(0,(r.amt||0)-(r.paid||0));const st=u<=0?'<span class="bd bd-s">완납</span>':r.paid>0?'<span class="bd bd-o">부분</span>':'<span class="bd bd-d">미지급</span>';
    return `<tr${u>0?' class="row-warn"':''}><td>${r.dt}</td><td style="font-weight:700">${r.cli}</td><td>${r.prod}</td><td style="text-align:right">${fmt(r.qty)}</td><td style="text-align:right">${fmt(r.price)}</td><td style="text-align:right;font-weight:700">${fmt(r.amt)}</td><td style="text-align:right;color:var(--suc)">${fmt(r.paid||0)}</td><td style="text-align:right;color:var(--dan);font-weight:700">${fmt(u)}</td><td>${st}</td><td><button class="btn btn-sm btn-o" onclick="ePrr('${r.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dPrr('${r.id}')">삭제</button></td></tr>`}).join('')||'<tr><td colspan="10" class="empty-cell">등록된 내역이 없습니다. 상단 버튼으로 등록해주세요.</td></tr>';
}
function openPM(){['pId','pProd','pNote'].forEach(x=>$(x).value='');$('pDt').value=td();$('pCli').value='';$('pQty').value='';$('pPrice').value='';$('pAmt').value='';$('pPaid').value=0;$('pPayT').value='미지급';$('pMoT').textContent='매입 등록';oMo('pMo')}
function ePrr(id){const r=DB.g('purchase').find(x=>x.id===id);if(!r)return;$('pId').value=r.id;$('pDt').value=r.dt;$('pCli').value=r.cli;$('pProd').value=r.prod;$('pQty').value=r.qty;$('pPrice').value=r.price;$('pAmt').value=fmt(r.amt);$('pPaid').value=r.paid||0;$('pPayT').value=r.payType||'미지급';$('pNote').value=r.note||'';$('pMoT').textContent='매입 수정';oMo('pMo')}
function savePr(){const c=$('pCli').value.trim(),p=$('pProd').value.trim(),pr=+$('pPrice').value;if(!c){toast('거래처','err');return}if(!p){toast('품명','err');return}if(!pr){toast('단가','err');return}const id=$('pId').value||gid(),q=+$('pQty').value||1;const rec={id,dt:$('pDt').value,cli:c,prod:p,qty:q,price:pr,amt:q*pr,paid:+$('pPaid').value||0,payType:$('pPayT').value,note:$('pNote').value,cat:nw()};const ls=DB.g('purchase');const idx=ls.findIndex(x=>x.id===id);if(idx>=0)ls[idx]=rec;else ls.push(rec);DB.s('purchase',ls);cMo('pMo');rPr();toast('저장','ok')}
function dPrr(id){if(!confirm('삭제?'))return;DB.s('purchase',DB.g('purchase').filter(x=>x.id!==id));rPr();toast('삭제','ok')}

/* === 입금/지급 === */
function openPay(type){$('payTgt').value=type;$('payT').textContent=type==='sales'?'입금 처리':'지급 처리';$('payCli').value='';$('payAmt').value='';$('payDt').value=td();$('payInfo').innerHTML='';oMo('payMo')}
function doPay(){
  const tgt=$('payTgt').value,cli=$('payCli').value.trim(),amt=+$('payAmt').value;
  if(!cli){toast('거래처','err');return}if(!amt||amt<=0){toast('금액','err');return}
  const key=tgt==='sales'?'sales':'purchase';
  const ls=DB.g(key);const unpaid=ls.filter(r=>r.cli===cli&&(r.paid||0)<(r.amt||0)).sort((a,b)=>a.dt>b.dt?1:-1);
  let remain=amt;
  unpaid.forEach(r=>{if(remain<=0)return;const need=(r.amt||0)-(r.paid||0);const apply=Math.min(need,remain);r.paid=(r.paid||0)+apply;remain-=apply;const idx=ls.findIndex(x=>x.id===r.id);if(idx>=0)ls[idx]=r});
  DB.s(key,ls);cMo('payMo');if(tgt==='sales')rSl();else rPr();toast(`${fmt(amt)}원 ${tgt==='sales'?'입금':'지급'} 처리`,'ok');
}

/* === 손익 === */
function rPl(){
  const y=$('plY').value||new Date().getFullYear();
  const sl=DB.g('sales'),pr=DB.g('purchase'),pay=DB.g('payroll');
  const cm=td().slice(0,7);
  const cms=sl.filter(r=>r.dt.startsWith(cm));const cmp=pr.filter(r=>r.dt.startsWith(cm));
  const cml=pay.filter(r=>r.month===cm);
  $('plS').textContent=fmt(cms.reduce((s,r)=>s+(r.amt||0),0))+'원';
  $('plP').textContent=fmt(cmp.reduce((s,r)=>s+(r.amt||0),0))+'원';
  $('plL').textContent=fmt(cml.reduce((s,r)=>s+(r.total||0),0))+'원';
  const profit=cms.reduce((s,r)=>s+(r.amt||0),0)-cmp.reduce((s,r)=>s+(r.amt||0),0)-cml.reduce((s,r)=>s+(r.total||0),0);
  $('plN').textContent=fmt(profit)+'원';$('plN').style.color=profit>=0?'var(--suc)':'var(--dan)';

  let rows='',maxVal=1,data=[];
  for(let m=1;m<=12;m++){
    const mk=y+'-'+String(m).padStart(2,'0');
    const sAmt=sl.filter(r=>r.dt.startsWith(mk)).reduce((s,r)=>s+(r.amt||0),0);
    const pAmt=pr.filter(r=>r.dt.startsWith(mk)).reduce((s,r)=>s+(r.amt||0),0);
    const lAmt=pay.filter(r=>r.month===mk).reduce((s,r)=>s+(r.total||0),0);
    const net=sAmt-pAmt-lAmt;const rate=sAmt?Math.round(net/sAmt*100):0;
    data.push({m,sAmt,pAmt,lAmt,net,rate});
    maxVal=Math.max(maxVal,sAmt,pAmt);
    rows+=`<tr><td>${m}월</td><td style="text-align:right">${fmt(sAmt)}</td><td style="text-align:right">${fmt(pAmt)}</td><td style="text-align:right">${fmt(lAmt)}</td><td style="text-align:right">-</td><td style="text-align:right;font-weight:700;color:${net>=0?'var(--suc)':'var(--dan)'}">${fmt(net)}</td><td style="text-align:right;color:${rate>=0?'var(--suc)':'var(--dan)'}">${rate}%</td></tr>`;
  }
  $('plTbl').querySelector('tbody').innerHTML=rows;
  // 차트
  $('plChart').innerHTML=`<div class="bar-wrap">${data.map(d=>`<div class="bar-g"><div style="display:flex;gap:2px;align-items:flex-end;height:100%"><div class="bar" style="height:${Math.max(2,d.sAmt/maxVal*160)}px;background:var(--pri);width:12px" title="매출 ${fmt(d.sAmt)}"></div><div class="bar" style="height:${Math.max(2,d.pAmt/maxVal*160)}px;background:var(--wrn);width:12px" title="매입 ${fmt(d.pAmt)}"></div></div><div class="bar-lb">${d.m}월</div></div>`).join('')}</div><div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:11px"><span style="color:var(--pri)">■ 매출</span><span style="color:var(--wrn)">■ 매입</span></div>`;
}
function printPl(){const c=$('plTbl').innerHTML;const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>손익현황</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Nanum Gothic',sans-serif;font-size:11px;padding:15mm}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px 6px;font-size:10px}th{background:#E5E7EB;font-weight:700}@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body><h2 style="text-align:center;margin-bottom:12px">이노패키지 ${$('plY').value}년 손익현황</h2><table>${c}</table></body></html>`);w.document.close();setTimeout(()=>w.print(),300)}

/* === 세금계산서 === */
function rTx(){
  const mo=$('txMo').value||td().slice(0,7);if(!$('txMo').value)$('txMo').value=mo;
  const tp=$('txTp').value;const all=DB.g('taxInvoice');
  const fl=all.filter(r=>{if(!r.dt.startsWith(mo))return false;if(tp&&r.type!==tp)return false;return true}).sort((a,b)=>b.dt>a.dt?1:-1);
  const ma=all.filter(r=>r.dt.startsWith(mo));
  $('txC').textContent=ma.length;$('txS').textContent=fmt(ma.reduce((s,r)=>s+(r.supply||0),0))+'원';
  $('txV').textContent=fmt(ma.reduce((s,r)=>s+(r.vat||0),0))+'원';
  $('txT').textContent=fmt(ma.reduce((s,r)=>s+(r.supply||0)+(r.vat||0),0))+'원';
  var stBadge=function(m){
    if(m==='전자발행')return '<span class="bd" style="background:#EFF6FF;color:#1E40AF;border-color:#BFDBFE">⚡전자</span>';
    if(m==='전자실패')return '<span class="bd" style="background:#FEE2E2;color:#DC2626;border-color:#FECACA">실패</span>';
    return '<span class="bd" style="background:#F1F5F9;color:#64748B;border-color:#E2E8F0">📄종이</span>';
  };
  $('txTbl').querySelector('tbody').innerHTML=fl.map(r=>{const tot=(r.supply||0)+(r.vat||0);
    return `<tr><td>${r.dt}</td><td><span class="bd ${r.type==='매출'?'bd-p':'bd-o'}">${r.type}</span></td><td style="font-weight:700">${r.cli}</td><td>${r.item||'-'}</td><td style="text-align:right">${fmt(r.supply)}</td><td style="text-align:right">${fmt(r.vat)}</td><td style="text-align:right;font-weight:700">${fmt(tot)}</td><td>${stBadge(r.method||'종이')}</td><td><button class="btn btn-sm btn-o" onclick="eTxr('${r.id}')">수정</button>${r.method!=='전자발행'?' <button class="btn btn-sm" style="background:#1E40AF;color:#fff" onclick="reissueElecTx(\''+r.id+'\')">전자발행</button>':''} <button class="btn btn-sm btn-d" onclick="dTxr('${r.id}')">삭제</button></td></tr>`}).join('')||'<tr><td colspan="9" class="empty-cell">등록된 내역이 없습니다. 상단 버튼으로 등록해주세요.</td></tr>';
}
function toggleTxMethod(){
  var method=document.querySelector('input[name="txMethod"]:checked').value;
  var isElec=method==='electronic';
  $('txPrintBtn').style.display=isElec?'none':'';
  $('txElecBtn').style.display=isElec?'':'none';
  $('txElecInfo').style.display=isElec?'':'none';
  $('txElecLabel').style.borderColor=isElec?'var(--pri)':'var(--bdr)';
  $('txElecLabel').style.background=isElec?'var(--pri-l)':'';
  document.querySelector('input[name="txMethod"][value="paper"]').closest('label').style.borderColor=isElec?'var(--bdr)':'var(--pri)';
  document.querySelector('input[name="txMethod"][value="paper"]').closest('label').style.background=isElec?'':'var(--pri-l)';
  if(isElec){
    var cfg=DB.g1('popbillConfig')||{};
    $('txElecStatus').textContent=cfg.linkId?'✅ 팝빌 연동 설정됨 (LinkID: '+cfg.linkId+')':'⚠️ 시스템관리 → 팝빌 API 설정이 필요합니다';
  }
}
function openTxM(){['txId','txItem','txBiz','txNt','txCeo','txAddr'].forEach(x=>{if($(x))$(x).value=''});$('txDt').value=td();$('txTpS').value='매출';$('txCli').value='';$('txSup').value='';$('txVat').value='';$('txTot').value='';if($('txQty'))$('txQty').value=1;if($('txPrice'))$('txPrice').value='';if($('txPurpose'))$('txPurpose').value='영수';document.querySelector('input[name="txMethod"][value="paper"]').checked=true;toggleTxMethod();$('txMoT').textContent='세금계산서 등록';oMo('txMo2')}
function eTxr(id){const r=DB.g('taxInvoice').find(x=>x.id===id);if(!r)return;$('txId').value=r.id;$('txDt').value=r.dt;$('txTpS').value=r.type;$('txCli').value=r.cli;$('txBiz').value=r.bizNo||'';if($('txCeo'))$('txCeo').value=r.ceo||'';if($('txAddr'))$('txAddr').value=r.addr||'';$('txItem').value=r.item||'';if($('txQty'))$('txQty').value=r.qty||1;if($('txPrice'))$('txPrice').value=r.price||'';$('txSup').value=r.supply;$('txVat').value=r.vat;$('txTot').value=fmt((r.supply||0)+(r.vat||0))+'원';$('txNt').value=r.note||'';if($('txPurpose'))$('txPurpose').value=r.purpose||'영수';var m=(r.method==='전자발행')?'electronic':'paper';document.querySelector('input[name="txMethod"][value="'+m+'"]').checked=true;toggleTxMethod();$('txMoT').textContent='수정';oMo('txMo2')}
function saveTx(){const c=$('txCli').value.trim(),s=+$('txSup').value;if(!c){toast('거래처','err');return}if(!s){toast('공급가액','err');return}const id=$('txId').value||gid();const v=Math.round(s*0.1);const method=document.querySelector('input[name="txMethod"]:checked').value==='electronic'?'전자대기':'종이';const rec={id,dt:$('txDt').value,type:$('txTpS').value,cli:c,bizNo:$('txBiz').value,ceo:$('txCeo')?$('txCeo').value:'',addr:$('txAddr')?$('txAddr').value:'',item:$('txItem').value,qty:+($('txQty')?$('txQty').value:1)||1,price:+($('txPrice')?$('txPrice').value:0)||0,supply:s,vat:v,purpose:$('txPurpose')?$('txPurpose').value:'영수',method:method,note:$('txNt').value,cat:nw()};const ls=DB.g('taxInvoice');const idx=ls.findIndex(x=>x.id===id);if(idx>=0)ls[idx]=rec;else ls.push(rec);DB.s('taxInvoice',ls);cMo('txMo2');rTx();toast('저장','ok')}
function dTxr(id){if(!confirm('삭제?'))return;DB.s('taxInvoice',DB.g('taxInvoice').filter(x=>x.id!==id));rTx();toast('삭제','ok')}

/* 종이 세금계산서 인쇄 */
function printTx(){
  const c=$('txCli').value.trim(),s=+$('txSup').value;
  if(!c||!s){toast('거래처/공급가액 필요','err');return}
  const co=DB.g1('co')||{nm:'이노패키지',addr:'',tel:'',fax:''};
  const v=Math.round(s*0.1);
  const qty=$('txQty')?$('txQty').value:'1';
  const price=$('txPrice')?$('txPrice').value:s;
  const purpose=$('txPurpose')?$('txPurpose').value:'영수';
  const w=window.open('','_blank','width=900,height=700');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>세금계산서</title>');
  w.document.write('<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Malgun Gothic",sans-serif;font-size:11px;padding:15mm}');
  w.document.write('.wrap{border:3px solid #1E40AF;padding:0}.title-row{display:flex;background:#1E40AF;color:#fff}');
  w.document.write('.title-col{flex:1;text-align:center;padding:8px;font-size:20px;font-weight:900;letter-spacing:6px}');
  w.document.write('.title-side{width:40px;display:flex;align-items:center;justify-content:center;writing-mode:vertical-rl;font-size:13px;font-weight:700;letter-spacing:4px}');
  w.document.write('.half{display:grid;grid-template-columns:1fr 1fr;border-bottom:2px solid #1E40AF}');
  w.document.write('.half>div{padding:0}.half>div:first-child{border-right:2px solid #1E40AF}');
  w.document.write('table{width:100%;border-collapse:collapse}th,td{border:1px solid #94A3B8;padding:5px 7px;font-size:11px}');
  w.document.write('th{background:#E8F0FE;font-weight:700;text-align:center;white-space:nowrap}');
  w.document.write('.amt-tbl td{text-align:right}.amt-tbl th{width:80px}');
  w.document.write('.total{font-size:16px;font-weight:900;color:#1E40AF}');
  w.document.write('.purpose{display:flex;gap:20px;padding:6px 10px;font-size:12px;border-bottom:1px solid #94A3B8}');
  w.document.write('.purpose span{font-weight:700}.ck{color:#1E40AF;font-weight:900}');
  w.document.write('@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body>');
  w.document.write('<div class="wrap">');
  w.document.write('<div class="title-row"><div class="title-side" style="background:#1565C0;color:#fff">공급자</div><div class="title-col">세 금 계 산 서</div><div class="title-side" style="background:#1565C0;color:#fff">공급받는자</div></div>');
  // 공급자/공급받는자 정보
  w.document.write('<div class="half"><div><table>');
  w.document.write('<tr><th>등록번호</th><td colspan="3">'+(co.bizNo||'')+'</td></tr>');
  w.document.write('<tr><th>상호</th><td>'+(co.nm||'')+'</td><th>성명</th><td>'+(co.ceo||'')+'</td></tr>');
  w.document.write('<tr><th>주소</th><td colspan="3">'+(co.addr||'')+'</td></tr>');
  w.document.write('<tr><th>업태</th><td>'+(co.bizType||'')+'</td><th>종목</th><td>'+(co.bizClass||'')+'</td></tr>');
  w.document.write('</table></div><div><table>');
  w.document.write('<tr><th>등록번호</th><td colspan="3">'+($('txBiz').value||'')+'</td></tr>');
  w.document.write('<tr><th>상호</th><td>'+c+'</td><th>성명</th><td>'+($('txCeo')?$('txCeo').value:'')+'</td></tr>');
  w.document.write('<tr><th>주소</th><td colspan="3">'+($('txAddr')?$('txAddr').value:'')+'</td></tr>');
  w.document.write('<tr><th>업태</th><td></td><th>종목</th><td></td></tr>');
  w.document.write('</table></div></div>');
  // 금액
  w.document.write('<table class="amt-tbl"><tr><th>공급가액</th><td style="width:30%"><span class="total">'+fmt(s)+'</span> 원</td><th>세액</th><td>'+fmt(v)+' 원</td></tr></table>');
  // 품목
  w.document.write('<table><thead><tr><th>월일</th><th>품목</th><th>규격</th><th>수량</th><th>단가</th><th>공급가액</th><th>세액</th><th>비고</th></tr></thead><tbody>');
  var dtShort=$('txDt').value?$('txDt').value.slice(5):'';
  w.document.write('<tr><td style="text-align:center">'+dtShort+'</td><td>'+($('txItem').value||'-')+'</td><td></td><td style="text-align:right">'+qty+'</td><td style="text-align:right">'+fmt(+price)+'</td><td style="text-align:right">'+fmt(s)+'</td><td style="text-align:right">'+fmt(v)+'</td><td>'+($('txNt').value||'')+'</td></tr>');
  // 빈 행 3줄
  for(var i=0;i<3;i++)w.document.write('<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>');
  w.document.write('</tbody></table>');
  // 합계/영수청구
  w.document.write('<table class="amt-tbl"><tr><th>합계금액</th><td colspan="3"><span class="total">'+fmt(s+v)+'</span> 원</td><th>현금</th><td></td><th>수표</th><td></td></tr>');
  w.document.write('<tr><th>'+purpose+'</th><td colspan="7" style="text-align:left;font-size:12px">위 금액을 '+(purpose==='영수'?'영수':'청구')+'함</td></tr></table>');
  w.document.write('</div></body></html>');
  w.document.close();setTimeout(function(){w.print()},300);
}

/* 전자세금계산서 발행 (팝빌 API) */
function issueElecTx(){
  var c=$('txCli').value.trim(),s=+$('txSup').value;
  if(!c||!s){toast('거래처/공급가액 필요','err');return}
  var cfg=DB.g1('popbillConfig')||{};
  if(!cfg.linkId||!cfg.secretKey){toast('시스템관리에서 팝빌 API 설정을 먼저 해주세요','err');return}
  if(!$('txBiz').value.trim()){toast('공급받는자 사업자번호가 필요합니다','err');return}
  // 먼저 저장
  saveTx();
  var ls=DB.g('taxInvoice');var last=ls[ls.length-1];
  if(!last)return;
  // 서버로 전자발행 요청
  var body={
    invoiceId:last.id,
    writeDate:last.dt.replace(/-/g,''),
    type:last.type,
    purposeType:last.purpose||'영수',
    invoiceeCorp:last.cli,
    invoiceeCorpNum:last.bizNo.replace(/-/g,''),
    invoiceeCeo:last.ceo||'',
    invoiceeAddr:last.addr||'',
    itemName:last.item||'',
    qty:last.qty||1,
    unitCost:String(last.price||last.supply),
    supplyCost:String(last.supply),
    tax:String(last.vat),
    totalAmount:String(last.supply+last.vat),
    note:last.note||''
  };
  toast('전자세금계산서 발행 중...','');
  authFetch('/api/popbill/issue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){return r.json()})
    .then(function(res){
      if(res.ok){
        last.method='전자발행';last.ntsNum=res.ntsConfirmNum||'';
        DB.s('taxInvoice',ls);rTx();
        toast('✅ 전자세금계산서 발행 완료'+(res.ntsConfirmNum?' (승인번호: '+res.ntsConfirmNum+')':''),'ok');
      } else {
        last.method='전자실패';DB.s('taxInvoice',ls);rTx();
        toast('❌ 발행 실패: '+(res.error||'알 수 없는 오류'),'err');
      }
    })
    .catch(function(e){last.method='전자실패';DB.s('taxInvoice',ls);rTx();toast('❌ 서버 오류: '+e.message,'err')});
}

/* 기존 세금계산서 전자 재발행 */
function reissueElecTx(id){
  var ls=DB.g('taxInvoice');var r=ls.find(function(x){return x.id===id});
  if(!r){toast('데이터 없음','err');return}
  if(!r.bizNo){toast('사업자번호가 필요합니다. 수정에서 입력해주세요','err');return}
  var cfg=DB.g1('popbillConfig')||{};
  if(!cfg.linkId||!cfg.secretKey){toast('시스템관리에서 팝빌 API 설정을 먼저 해주세요','err');return}
  if(!confirm(r.cli+' - '+fmt(r.supply)+'원 전자발행하시겠습니까?'))return;
  var body={
    invoiceId:r.id,writeDate:r.dt.replace(/-/g,''),type:r.type,purposeType:r.purpose||'영수',
    invoiceeCorp:r.cli,invoiceeCorpNum:(r.bizNo||'').replace(/-/g,''),invoiceeCeo:r.ceo||'',invoiceeAddr:r.addr||'',
    itemName:r.item||'',qty:r.qty||1,unitCost:String(r.price||r.supply),
    supplyCost:String(r.supply),tax:String(r.vat),totalAmount:String(r.supply+r.vat),note:r.note||''
  };
  toast('전자발행 중...','');
  authFetch('/api/popbill/issue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(res){return res.json()})
    .then(function(res){
      if(res.ok){r.method='전자발행';r.ntsNum=res.ntsConfirmNum||'';DB.s('taxInvoice',ls);rTx();toast('✅ 전자발행 완료','ok')}
      else{r.method='전자실패';DB.s('taxInvoice',ls);rTx();toast('❌ 실패: '+(res.error||''),'err')}
    }).catch(function(){toast('서버 오류','err')});
}

/* 홈택스 일괄업로드용 엑셀 내보내기 */
function expHometax(){
  var mo=$('txMo').value||td().slice(0,7);
  var data=DB.g('taxInvoice').filter(function(r){return r.dt&&r.dt.startsWith(mo)});
  if(!data.length){toast('해당 월에 세금계산서가 없습니다','err');return}
  var co=DB.g1('co')||{};
  // 홈택스 전자세금계산서 일괄발급 양식 (CSV)
  var csv='\uFEFF';
  csv+='작성일자,공급자사업자번호,공급자상호,공급자대표자,공급자주소,공급자업태,공급자종목,';
  csv+='공급받는자사업자번호,공급받는자상호,공급받는자대표자,공급받는자주소,';
  csv+='품목명,규격,수량,단가,공급가액,세액,합계금액,영수청구,비고\n';
  data.forEach(function(r){
    csv+=(r.dt||'').replace(/-/g,'')+',';
    csv+=(co.bizNo||'')+','+(co.nm||'')+','+(co.ceo||'')+','+(co.addr||'')+','+(co.bizType||'')+','+(co.bizClass||'')+',';
    csv+=(r.bizNo||'').replace(/-/g,'')+','+(r.cli||'')+','+(r.ceo||'')+','+(r.addr||'')+',';
    csv+=(r.item||'')+','+(r.spec||'')+','+(r.qty||1)+','+(r.price||r.supply)+',';
    csv+=(r.supply||0)+','+(r.vat||0)+','+((r.supply||0)+(r.vat||0))+',';
    csv+=(r.purpose||'영수')+','+(r.note||'')+'\n';
  });
  var b=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(b);
  a.download='hometax_'+mo+'.csv';a.click();
  toast('홈택스 일괄발행용 엑셀 다운로드 ('+data.length+'건)','ok');
}

/* 세금계산서 단가/수량→공급가액 자동계산 */
function cTax(){
  var qty=+($('txQty')?$('txQty').value:0)||0;
  var price=+($('txPrice')?$('txPrice').value:0)||0;
  var s=+$('txSup').value||0;
  // 수량×단가가 있으면 공급가액 자동계산
  if(qty&&price){s=qty*price;$('txSup').value=s}
  $('txVat').value=Math.round(s*0.1);
  $('txTot').value=fmt(s+Math.round(s*0.1))+'원';
}

/* 팝빌 설정 저장/로드 */
function savePopbillConfig(){
  var cfg={linkId:$('pbLinkId').value.trim(),secretKey:$('pbSecretKey').value.trim(),corpNum:$('pbCorpNum').value.trim().replace(/-/g,''),isTest:$('pbIsTest').checked};
  DB.s1('popbillConfig',cfg);toast('팝빌 API 설정 저장 완료','ok');
}
function loadPopbillConfig(){
  var cfg=DB.g1('popbillConfig')||{};
  if($('pbLinkId'))$('pbLinkId').value=cfg.linkId||'';
  if($('pbSecretKey'))$('pbSecretKey').value=cfg.secretKey||'';
  if($('pbCorpNum'))$('pbCorpNum').value=cfg.corpNum||'';
  if($('pbIsTest'))$('pbIsTest').checked=cfg.isTest!==false;
}

function expCSV(type){
  let csv='',data;
  if(type==='sales'){data=DB.g('sales');csv='\uFEFF일자,거래처,품명,수량,단가,매출액,입금,미수금\n';data.forEach(r=>{csv+=`${r.dt},${r.cli},${r.prod},${r.qty},${r.price},${r.amt},${r.paid||0},${Math.max(0,r.amt-(r.paid||0))}\n`})}
  else if(type==='purchase'){data=DB.g('purchase');csv='\uFEFF일자,거래처,품명,수량,단가,매입액,지급,미지급\n';data.forEach(r=>{csv+=`${r.dt},${r.cli},${r.prod},${r.qty},${r.price},${r.amt},${r.paid||0},${Math.max(0,r.amt-(r.paid||0))}\n`})}
  else{data=DB.g('taxInvoice');csv='\uFEFF발행일,구분,거래처,품목,공급가액,세액,합계\n';data.forEach(r=>{csv+=`${r.dt},${r.type},${r.cli},${r.item||''},${r.supply},${r.vat},${(r.supply||0)+(r.vat||0)}\n`})}
  const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=type+'_'+td()+'.csv';a.click();toast('내보내기','ok');
}

