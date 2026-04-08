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
  $('txTbl').querySelector('tbody').innerHTML=fl.map(r=>{const tot=(r.supply||0)+(r.vat||0);
    return `<tr><td>${r.dt}</td><td><span class="bd ${r.type==='매출'?'bd-p':'bd-o'}">${r.type}</span></td><td style="font-weight:700">${r.cli}</td><td>${r.item||'-'}</td><td style="text-align:right">${fmt(r.supply)}</td><td style="text-align:right">${fmt(r.vat)}</td><td style="text-align:right;font-weight:700">${fmt(tot)}</td><td>${r.note||'-'}</td><td><button class="btn btn-sm btn-o" onclick="eTxr('${r.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dTxr('${r.id}')">삭제</button></td></tr>`}).join('')||'<tr><td colspan="10" class="empty-cell">등록된 내역이 없습니다. 상단 버튼으로 등록해주세요.</td></tr>';
}
function openTxM(){['txId','txItem','txBiz','txNt'].forEach(x=>$(x).value='');$('txDt').value=td();$('txTpS').value='매출';$('txCli').value='';$('txSup').value='';$('txVat').value='';$('txTot').value='';$('txMoT').textContent='세금계산서 등록';oMo('txMo2')}
function eTxr(id){const r=DB.g('taxInvoice').find(x=>x.id===id);if(!r)return;$('txId').value=r.id;$('txDt').value=r.dt;$('txTpS').value=r.type;$('txCli').value=r.cli;$('txBiz').value=r.bizNo||'';$('txItem').value=r.item||'';$('txSup').value=r.supply;$('txVat').value=r.vat;$('txTot').value=fmt((r.supply||0)+(r.vat||0))+'원';$('txNt').value=r.note||'';$('txMoT').textContent='수정';oMo('txMo2')}
function saveTx(){const c=$('txCli').value.trim(),s=+$('txSup').value;if(!c){toast('거래처','err');return}if(!s){toast('공급가액','err');return}const id=$('txId').value||gid();const v=Math.round(s*0.1);const rec={id,dt:$('txDt').value,type:$('txTpS').value,cli:c,bizNo:$('txBiz').value,item:$('txItem').value,supply:s,vat:v,note:$('txNt').value,cat:nw()};const ls=DB.g('taxInvoice');const idx=ls.findIndex(x=>x.id===id);if(idx>=0)ls[idx]=rec;else ls.push(rec);DB.s('taxInvoice',ls);cMo('txMo2');rTx();toast('저장','ok')}
function dTxr(id){if(!confirm('삭제?'))return;DB.s('taxInvoice',DB.g('taxInvoice').filter(x=>x.id!==id));rTx();toast('삭제','ok')}
function printTx(){const c=$('txCli').value.trim(),s=+$('txSup').value;if(!c||!s){toast('거래처/공급가액 필요','err');return}const co=DB.g1('co')||{nm:'이노패키지',addr:'',tel:'',fax:''};const v=Math.round(s*0.1);const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>세금계산서</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Nanum Gothic',sans-serif;font-size:12px;padding:20mm}.title{text-align:center;font-size:24px;font-weight:800;margin-bottom:24px;letter-spacing:8px;color:#1E40AF}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:8px;font-size:12px}th{background:#E5E7EB;font-weight:700;width:100px}@media print{@page{size:A4;margin:15mm}}</style></head><body><div class="title">세 금 계 산 서</div><table><tr><th>공급자</th><td>${co.nm}</td><th>공급받는자</th><td>${c}</td></tr><tr><th>사업자번호</th><td></td><th>사업자번호</th><td>${$('txBiz').value||''}</td></tr><tr><th>주소</th><td>${co.addr||''}</td><th>품목</th><td>${$('txItem').value||''}</td></tr></table><table style="margin-top:16px"><tr><th>공급가액</th><td style="text-align:right;font-size:16px;font-weight:700">${fmt(s)} 원</td></tr><tr><th>세액 (10%)</th><td style="text-align:right;font-size:16px">${fmt(v)} 원</td></tr><tr><th>합계</th><td style="text-align:right;font-size:20px;font-weight:800;color:#1E40AF">${fmt(s+v)} 원</td></tr></table><div style="margin-top:16px;font-size:11px">발행일: ${$('txDt').value}${$('txNt').value?' | 비고: '+$('txNt').value:''}</div></body></html>`);w.document.close();setTimeout(()=>w.print(),300)}

function expCSV(type){
  let csv='',data;
  if(type==='sales'){data=DB.g('sales');csv='\uFEFF일자,거래처,품명,수량,단가,매출액,입금,미수금\n';data.forEach(r=>{csv+=`${r.dt},${r.cli},${r.prod},${r.qty},${r.price},${r.amt},${r.paid||0},${Math.max(0,r.amt-(r.paid||0))}\n`})}
  else if(type==='purchase'){data=DB.g('purchase');csv='\uFEFF일자,거래처,품명,수량,단가,매입액,지급,미지급\n';data.forEach(r=>{csv+=`${r.dt},${r.cli},${r.prod},${r.qty},${r.price},${r.amt},${r.paid||0},${Math.max(0,r.amt-(r.paid||0))}\n`})}
  else{data=DB.g('taxInvoice');csv='\uFEFF발행일,구분,거래처,품목,공급가액,세액,합계\n';data.forEach(r=>{csv+=`${r.dt},${r.type},${r.cli},${r.item||''},${r.supply},${r.vat},${(r.supply||0)+(r.vat||0)}\n`})}
  const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=type+'_'+td()+'.csv';a.click();toast('내보내기','ok');
}

