/* ===== ERP:sales ===== */

/* ============================================================
   얼마에요 Group 구조 — 다중 회사(GroupId) 관리
   얼마에요: [Group] 테이블 + 모든 재무 레코드에 GroupId 필드
   팩플로우: ino_companies KV + sales/purchase/taxInvoice에 groupId
   ============================================================ */
var _currentGroupId = localStorage.getItem('_pf_groupId') || 'ALL';

function getCurrentGroup(){return _currentGroupId;}

function setCurrentGroup(id){
  _currentGroupId=id;
  localStorage.setItem('_pf_groupId',id);
  renderGrpToggle();
  if(typeof rSl==='function')rSl();
  if(typeof rPr==='function')rPr();
  if(typeof rTx==='function')rTx();
}

function renderGrpToggle(){
  var bar=$('grpToggleBar');if(!bar)return;
  var cos=DB.g('companies')||[];
  var h='<span class="grp-label">회사</span>';
  h+='<button class="grp-btn'+(_currentGroupId==='ALL'?' active':'')+'" data-grp="ALL" onclick="setCurrentGroup(\'ALL\')">전체 <span class="grp-badge grp-badge-ALL">ALL</span></button>';
  cos.forEach(function(co,i){
    var badge=i===0?'grp-badge-A':'grp-badge-B';
    var abadge=i===0?'active-A':'active-B';
    h+='<button class="grp-btn'+(_currentGroupId===co.id?' active '+abadge:'')+'" data-grp="'+co.id+'" onclick="setCurrentGroup(\''+co.id+'\')">'
      +co.nm+' <span class="grp-badge '+badge+'">'+co.bizNo+'</span></button>';
  });
  bar.innerHTML=h;
}

/* 모달 내 GroupId 라디오 버튼 렌더링 (얼마에요 Group 선택 패턴) */
function renderGrpRadio(containerId, selectedId){
  var el=$(containerId);if(!el)return;
  var cos=DB.g('companies')||[];
  if(!cos.length){
    el.innerHTML='<span style="color:var(--txt2);font-size:12px">⚠ 시스템관리 → 회사 설정을 먼저 해주세요</span>';
    return;
  }
  var h='';
  cos.forEach(function(co,i){
    var chk=(selectedId?selectedId===co.id:i===0)?' checked':'';
    var color=i===0?'#1E40AF':'#7C3AED';
    var bg=i===0?'#EFF6FF':'#F5F3FF';
    h+='<label style="border-color:'+(co.id===selectedId?color:'var(--bdr)')+';background:'+(co.id===selectedId?bg:'')+';">'
      +'<input type="radio" name="'+containerId+'_r" value="'+co.id+'"'+chk+' onchange="onGrpRadioChange(\''+containerId+'\')">'
      +co.nm
      +'<span style="font-size:10px;color:var(--txt2)">('+co.bizNo+')</span>'
      +'</label>';
  });
  el.innerHTML=h;
}

function onGrpRadioChange(containerId){
  // 라디오 선택 시 선택된 항목 시각적 업데이트
  var el=$(containerId);if(!el)return;
  var cos=DB.g('companies')||[];
  var sel=getSelectedGrpId(containerId);
  el.querySelectorAll('label').forEach(function(lbl,i){
    var co=cos[i];if(!co)return;
    var color=i===0?'#1E40AF':'#7C3AED';
    var bg=i===0?'#EFF6FF':'#F5F3FF';
    if(co.id===sel){lbl.style.borderColor=color;lbl.style.background=bg;}
    else{lbl.style.borderColor='var(--bdr)';lbl.style.background='';}
  });
  // 세금계산서 모달: 공급자 정보 자동 반영
  if(containerId==='txGrpSel')updateTxGrpInfo(sel);
}

function getSelectedGrpId(containerId){
  var el=document.querySelector('#'+containerId+' input[type=radio]:checked');
  return el?el.value:'';
}

/* 세금계산서 모달 — 공급자 정보 자동 표시 (선택된 GroupId 기준) */
function updateTxGrpInfo(groupId){
  var el=$('txGrpInfo');if(!el)return;
  var cos=DB.g('companies')||[];
  var co=cos.find(function(c){return c.id===groupId});
  if(!co){el.innerHTML='';return;}
  el.innerHTML='사업자번호: <b>'+co.bizNo+'</b> | 대표자: <b>'+(co.ceo||'-')+'</b> | 주소: '+(co.addr||'-');
}

/* 회사 설정 저장/불러오기 (얼마에요 [Group] 테이블 역할) */
function saveCompanies(){
  var cos=[
    {id:'A',nm:$('coA_nm').value.trim(),bizNo:$('coA_bizNo').value.trim(),ceo:$('coA_ceo').value.trim(),bizType:$('coA_bizType').value.trim(),bizClass:$('coA_bizClass').value.trim(),addr:$('coA_addr').value.trim(),tel:$('coA_tel').value.trim(),type:'sole'},
    {id:'B',nm:$('coB_nm').value.trim(),bizNo:$('coB_bizNo').value.trim(),ceo:$('coB_ceo').value.trim(),bizType:$('coB_bizType').value.trim(),bizClass:$('coB_bizClass').value.trim(),addr:$('coB_addr').value.trim(),tel:$('coB_tel').value.trim(),type:'corp'}
  ].filter(function(c){return c.nm;});
  DB.s('companies',cos);
  renderGrpToggle();
  toast('회사 설정 저장 완료','ok');
}
function loadCompanies(){
  var cos=DB.g('companies')||[];
  var a=cos.find(function(c){return c.id==='A'})||{};
  var b=cos.find(function(c){return c.id==='B'})||{};
  ['nm','bizNo','ceo','bizType','bizClass','addr','tel'].forEach(function(k){
    if($('coA_'+k))$('coA_'+k).value=a[k]||'';
    if($('coB_'+k))$('coB_'+k).value=b[k]||'';
  });
}

/* 페이지 로드 시 초기화 */
document.addEventListener('DOMContentLoaded',function(){
  setTimeout(function(){renderGrpToggle();loadCompanies();loadPopbillConfig();},300);
});

function cAmt(p){const q=+$(p+'Qty').value||1,pr=+$(p+'Price').value||0;$(p+'Amt').value=fmt(q*pr)+'원'}
function cTax(){const s=+$('txSup').value||0;var _vr=typeof SysCode!=='undefined'?SysCode.vatRate():0.1;$('txVat').value=Math.round(s*_vr);$('txTot').value=fmt(s+Math.round(s*_vr))+'원'}

/* === 매출 === */
function rSl(){
  // 기간 필터 초기화
  if(!$('slPrdBar').innerHTML)$('slPrdBar').innerHTML=periodFilterHTML('sl');
  if(!_prdState['sl']){setPrd('sl','monthly',null);if(!$('slDtVal').value)$('slDtVal').value=td().slice(0,7)}
  const sch=($('slSch').value||'').toLowerCase(),uo=$('slUO').checked;
  // 얼마에요 GroupId 필터 — 선택된 회사만, ALL이면 전체
  const rawAll=DB.g('sales');
  const all=_currentGroupId==='ALL'?rawAll:rawAll.filter(function(r){return !r.groupId||r.groupId===_currentGroupId;});
  const ma=prdFilterData(all,'sl','dt');
  const fl=ma.filter(r=>{if(sch&&!r.cli.toLowerCase().includes(sch))return false;if(uo&&(r.paid||0)>=(r.amt||0))return false;return true}).sort((a,b)=>b.dt>a.dt?1:-1);
  $('slT').textContent=fmt(ma.reduce((s,r)=>s+(r.amt||0),0))+'원';
  $('slU').textContent=fmt(ma.reduce((s,r)=>s+Math.max(0,(r.amt||0)-(r.paid||0)),0))+'원';
  $('slP').textContent=fmt(ma.reduce((s,r)=>s+(r.paid||0),0))+'원';
  $('slC').textContent=[...new Set(ma.map(r=>r.cli))].length;
  var _slCos=DB.g('companies')||[];
  $('slTbl').querySelector('tbody').innerHTML=fl.map(r=>{const u=Math.max(0,(r.amt||0)-(r.paid||0));const st=u<=0?'<span class="bd bd-s">완납</span>':r.paid>0?'<span class="bd bd-o">부분</span>':'<span class="bd bd-d">미수</span>';
    const supply=Math.round((r.amt||0)/(1+(typeof SysCode!=='undefined'?SysCode.vatRate():0.1))),vat=(r.amt||0)-supply;
    var _slGrpCo=_slCos.find(function(c){return c.id===r.groupId});
    var _slGrpBadge=_slGrpCo?'<span class="grp-badge '+(_slGrpCo.id==='A'?'grp-badge-A':'grp-badge-B')+'">'+_slGrpCo.nm+'</span>':'';
    var cliCell = '<span style="font-weight:700">'+r.cli+'</span>'+_slGrpBadge;
    // 얼마에요 패턴: IsAmended (당초), IsAdditionalAmended (부의), 수정 신규
    if(r.isAmended) cliCell += ' <span style="font-size:10px;background:#E5E7EB;color:#374151;padding:2px 5px;border-radius:4px" title="수정사유: '+(typeof AMEND_KINDS!=='undefined'?(AMEND_KINDS[r.amendedKindCode]||''):'')+'">당초(수정완료)</span>';
    else if(r.isAdditionalAmended) cliCell += ' <span style="font-size:10px;background:#FEE2E2;color:#991B1B;padding:2px 5px;border-radius:4px" title="당초 취소">부의(-)</span>';
    else if(r.amendedOriginalId) cliCell += ' <span style="font-size:10px;background:#DBEAFE;color:#1E3A5F;padding:2px 5px;border-radius:4px" title="수정 발행">수정(+)</span>';
    if(r.changeMeta && !r.isAmended && !r.isAdditionalAmended && !r.amendedOriginalId) cliCell += ' <span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:2px 5px;border-radius:4px" title="원래: '+(r.changeMeta.from||'?')+' / 사유: '+(r.changeMeta.reason||'')+'">출고시 변경</span>';
    return `<tr${u>0?' class="row-warn"':''}><td>${r.dt}</td><td>${cliCell}</td><td>${r.prod}</td><td style="text-align:right">${fmt(r.qty)}</td><td style="text-align:right">${fmt(r.price)}</td><td style="text-align:right">${fmt(supply)}</td><td style="text-align:right;color:var(--txt2)">${fmt(vat)}</td><td style="text-align:right;font-weight:700">${fmt(r.amt)}</td><td style="text-align:right;color:var(--suc)">${fmt(r.paid||0)}</td><td style="text-align:right;color:var(--dan);font-weight:700">${fmt(u)}</td><td>${st}</td><td><button class="btn btn-sm btn-o" onclick="genTradeStatement('${r.id}')" title="거래명세서">명세</button> <button class="btn btn-sm" style="background:#FEF3C7;color:#92400E;border:none;padding:5px 10px;font-size:11px;font-weight:600;border-radius:6px;cursor:pointer" onclick="openAmendSale('${r.id}')" title="거래처/내용 수정 (이력 보존)">⚠ 수정</button> <button class="btn btn-sm btn-o" onclick="eSlr('${r.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dSlr('${r.id}')">삭제</button></td></tr>`}).join('')||'<tr><td colspan="12" class="empty-cell">등록된 내역이 없습니다. 상단 버튼으로 등록해주세요.</td></tr>';
  // 엑셀 내보내기 데이터
  _prdExportData['sl']={headers:['일자','거래처','품명','수량','단가','공급가액','부가세','합계','입금','미수금','상태'],rows:fl.map(r=>{const u=Math.max(0,(r.amt||0)-(r.paid||0));const supply=Math.round((r.amt||0)/(1+(typeof SysCode!=='undefined'?SysCode.vatRate():0.1))),vat=(r.amt||0)-supply;return[r.dt,r.cli,r.prod,r.qty,r.price,supply,vat,r.amt,r.paid||0,u,u<=0?'완납':r.paid>0?'부분':'미수']}),sheetName:'매출장부',fileName:'매출장부'};
  rRecv();
}
window._prdCb_sl=rSl;
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
function openSM(){['sId','sProd','sNote'].forEach(x=>$(x).value='');$('sDt').value=td();$('sCli').value='';$('sQty').value='';$('sPrice').value='';$('sAmt').value='';$('sPaid').value=0;$('sPay').value='미수';$('sMoT').textContent='매출 등록';
  renderGrpRadio('sGrpSel',_currentGroupId==='ALL'?'':_currentGroupId);
  oMo('sMo')}
function eSlr(id){const r=DB.g('sales').find(x=>x.id===id);if(!r)return;$('sId').value=r.id;$('sDt').value=r.dt;$('sCli').value=r.cli;$('sProd').value=r.prod;$('sQty').value=r.qty;$('sPrice').value=r.price;$('sAmt').value=fmt(r.amt);$('sPaid').value=r.paid||0;$('sPay').value=r.payType||'미수';$('sNote').value=r.note||'';$('sMoT').textContent='매출 수정';
  renderGrpRadio('sGrpSel',r.groupId||'');
var _bcSale=typeof DocTrace!=='undefined'?DocTrace.renderBreadcrumb('SALE',id):'';var _bcEl=$('saleBreadcrumb');if(_bcEl)_bcEl.innerHTML=_bcSale;
oMo('sMo')}
function saveSl(){const c=$('sCli').value.trim(),p=$('sProd').value.trim(),pr=+$('sPrice').value;if(!c){toast('거래처','err');return}if(!p){toast('품명','err');return}if(!pr){toast('단가','err');return}const id=$('sId').value||gid(),q=+$('sQty').value||1;
  const gId=getSelectedGrpId('sGrpSel')||(_currentGroupId!=='ALL'?_currentGroupId:'');
  const rec={id,dt:$('sDt').value,cli:c,prod:p,qty:q,price:pr,amt:q*pr,paid:+$('sPaid').value||0,payType:$('sPay').value,note:$('sNote').value,groupId:gId,cat:nw()};
  const ls=DB.g('sales');const idx=ls.findIndex(x=>x.id===id);if(idx>=0)ls[idx]=rec;else ls.push(rec);DB.s('sales',ls);cMo('sMo');rSl();toast('저장','ok')}
function dSlr(id){if(!confirm('삭제?'))return;if(typeof deleteSalesCascade==='function')deleteSalesCascade(id);else DB.s('sales',DB.g('sales').filter(x=>x.id!==id));rSl();toast('삭제','ok')}

/* === 매입 === */
function rPr(){
  // 기간 필터 초기화
  if(!$('prPrdBar').innerHTML)$('prPrdBar').innerHTML=periodFilterHTML('pr');
  if(!_prdState['pr']){setPrd('pr','monthly',null);if(!$('prDtVal').value)$('prDtVal').value=td().slice(0,7)}
  const sch=($('prSch').value||'').toLowerCase(),uo=$('prUO').checked;
  // 얼마에요 GroupId 필터
  const rawAll=DB.g('purchase');
  const all=_currentGroupId==='ALL'?rawAll:rawAll.filter(function(r){return !r.groupId||r.groupId===_currentGroupId;});
  const ma=prdFilterData(all,'pr','dt');
  const fl=ma.filter(r=>{if(sch&&!r.cli.toLowerCase().includes(sch))return false;if(uo&&(r.paid||0)>=(r.amt||0))return false;return true}).sort((a,b)=>b.dt>a.dt?1:-1);
  $('prT').textContent=fmt(ma.reduce((s,r)=>s+(r.amt||0),0))+'원';
  $('prU').textContent=fmt(ma.reduce((s,r)=>s+Math.max(0,(r.amt||0)-(r.paid||0)),0))+'원';
  $('prP').textContent=fmt(ma.reduce((s,r)=>s+(r.paid||0),0))+'원';
  $('prC').textContent=[...new Set(ma.map(r=>r.cli))].length;
  $('prTbl').querySelector('tbody').innerHTML=fl.map(r=>{const u=Math.max(0,(r.amt||0)-(r.paid||0));const st=u<=0?'<span class="bd bd-s">완납</span>':r.paid>0?'<span class="bd bd-o">부분</span>':'<span class="bd bd-d">미지급</span>';
    return `<tr${u>0?' class="row-warn"':''}><td>${r.dt}</td><td style="font-weight:700">${r.cli}</td><td>${r.prod}</td><td style="text-align:right">${fmt(r.qty)}</td><td style="text-align:right">${fmt(r.price)}</td><td style="text-align:right;font-weight:700">${fmt(r.amt)}</td><td style="text-align:right;color:var(--suc)">${fmt(r.paid||0)}</td><td style="text-align:right;color:var(--dan);font-weight:700">${fmt(u)}</td><td>${st}</td><td><button class="btn btn-sm btn-o" onclick="ePrr('${r.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dPrr('${r.id}')">삭제</button></td></tr>`}).join('')||'<tr><td colspan="10" class="empty-cell">등록된 내역이 없습니다. 상단 버튼으로 등록해주세요.</td></tr>';
  // 엑셀 내보내기 데이터
  _prdExportData['pr']={headers:['일자','거래처','품명','수량','단가','매입액','지급','미지급','상태'],rows:fl.map(r=>{const u=Math.max(0,(r.amt||0)-(r.paid||0));return[r.dt,r.cli,r.prod,r.qty,r.price,r.amt,r.paid||0,u,u<=0?'완납':r.paid>0?'부분':'미지급']}),sheetName:'매입장부',fileName:'매입장부'};
}
window._prdCb_pr=rPr;
function openPM(){['pId','pProd','pNote'].forEach(x=>$(x).value='');$('pDt').value=td();$('pCli').value='';$('pQty').value='';$('pPrice').value='';$('pAmt').value='';$('pPaid').value=0;$('pPayT').value='미지급';$('pMoT').textContent='매입 등록';
  renderGrpRadio('pGrpSel',_currentGroupId==='ALL'?'':_currentGroupId);
  oMo('pMo')}
function ePrr(id){const r=DB.g('purchase').find(x=>x.id===id);if(!r)return;$('pId').value=r.id;$('pDt').value=r.dt;$('pCli').value=r.cli;$('pProd').value=r.prod;$('pQty').value=r.qty;$('pPrice').value=r.price;$('pAmt').value=fmt(r.amt);$('pPaid').value=r.paid||0;$('pPayT').value=r.payType||'미지급';$('pNote').value=r.note||'';$('pMoT').textContent='매입 수정';
  renderGrpRadio('pGrpSel',r.groupId||'');
  oMo('pMo')}
function savePr(){const c=$('pCli').value.trim(),p=$('pProd').value.trim(),pr=+$('pPrice').value;if(!c){toast('거래처','err');return}if(!p){toast('품명','err');return}if(!pr){toast('단가','err');return}const id=$('pId').value||gid(),q=+$('pQty').value||1;
  const gId=getSelectedGrpId('pGrpSel')||(_currentGroupId!=='ALL'?_currentGroupId:'');
  const rec={id,dt:$('pDt').value,cli:c,prod:p,qty:q,price:pr,amt:q*pr,paid:+$('pPaid').value||0,payType:$('pPayT').value,note:$('pNote').value,groupId:gId,cat:nw()};
  const ls=DB.g('purchase');const idx=ls.findIndex(x=>x.id===id);if(idx>=0)ls[idx]=rec;else ls.push(rec);DB.s('purchase',ls);cMo('pMo');rPr();toast('저장','ok')}
function dPrr(id){if(!confirm('삭제?'))return;if(typeof deletePurchaseCascade==='function')deletePurchaseCascade(id);else DB.s('purchase',DB.g('purchase').filter(x=>x.id!==id));rPr();toast('삭제','ok')}

/* === 매출 거래처 변경 / 수정세금계산서 발행 (방안 B + D)
   얼마에요 TaxBook 구조 그대로:
   - isAmended (원본을 수정대상으로 표시)
   - amendedKindCode (사유 코드 1~6, 얼마에요 CodeCategory 203)
   - isAdditionalAmended (부의 발행 표시, 음수 행)
   - amendedOriginalId (원본 매출 ID 참조)
   ============================================ */
// 얼마에요 CodeCategory 203 - 수정세금계산서 종류
var AMEND_KINDS = {
  1: '환입',
  2: '계약의 해제',
  3: '공급가액의 변동',
  4: '기재사항의 착오 정정',
  5: '내국신용장 사후 개설',
  6: '착오에 의한 이중 발급'
};
function openAmendSale(saleId){
  var sale=DB.g('sales').find(function(s){return s.id===saleId});
  if(!sale){toast('매출 정보 없음','err');return}
  var h='<div class="mb" style="width:600px"><div class="mo-t">수정세금계산서 발행 / 거래명세표 정정<button class="mo-x" onclick="cMo(\'amendMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button></div>';
  h+='<div style="padding:16px 20px">';
  h+='<div style="background:#F8FAFC;padding:12px;border-radius:8px;margin-bottom:14px">';
  h+='<div style="font-size:11px;color:var(--txt3);margin-bottom:4px">당초 (원본)</div>';
  h+='<div style="font-size:14px;font-weight:700">'+sale.cli+' / '+sale.prod+'</div>';
  h+='<div style="font-size:12px;color:var(--txt2);margin-top:4px">'+sale.dt+' | 수량 '+fmt(sale.qty)+' | 합계 '+fmt(sale.amt)+'원</div>';
  h+='</div>';
  h+='<div class="fg"><label class="req">수정사유 (국세청 표준 6가지)</label><select id="amKind" style="width:100%;padding:10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px">';
  Object.keys(AMEND_KINDS).forEach(function(k){
    h+='<option value="'+k+'">'+k+'. '+AMEND_KINDS[k]+'</option>';
  });
  h+='</select></div>';
  h+='<div class="fg"><label>새 거래처</label><div style="display:flex;gap:6px"><input id="amNewCli" value="'+sale.cli+'" style="flex:1;padding:9px;border:1px solid var(--bdr);border-radius:8px"><button class="btn btn-o btn-sm" onclick="pickAmendCli()" style="white-space:nowrap">🔍 검색</button></div></div>';
  h+='<div class="fr" style="gap:8px"><div class="fg" style="flex:1"><label>새 수량</label><input type="number" id="amQty" value="'+sale.qty+'" style="width:100%;padding:9px;border:1px solid var(--bdr);border-radius:8px" oninput="amCalc()"></div>';
  h+='<div class="fg" style="flex:1"><label>새 단가</label><input type="number" id="amPrice" value="'+sale.price+'" style="width:100%;padding:9px;border:1px solid var(--bdr);border-radius:8px" oninput="amCalc()"></div>';
  h+='<div class="fg" style="flex:1"><label>새 금액</label><input type="number" id="amAmt" value="'+sale.amt+'" style="width:100%;padding:9px;border:1px solid var(--bdr);border-radius:8px;font-weight:700" readonly></div></div>';
  h+='<div class="fg"><label>변경 메모</label><textarea id="amMemo" rows="2" style="width:100%;padding:9px;border:1px solid var(--bdr);border-radius:8px" placeholder="추가 설명 (선택)"></textarea></div>';
  h+='<div style="background:#FFFBEB;border-left:3px solid #F59E0B;padding:10px;margin-top:8px;font-size:11px;color:#92400E">원본 매출은 그대로 유지되고, ① 부의(-) 매출 자동 발행 ② 새 매출(+) 자동 등록 됩니다. 변경 이력이 기록되어 추적 가능합니다.</div>';
  h+='<input type="hidden" id="amOrigId" value="'+saleId+'">';
  h+='</div>';
  h+='<div class="mf"><button class="btn btn-o" onclick="cMo(\'amendMo\')">취소</button><button class="btn btn-p" onclick="doAmendSale()">수정 발행</button></div></div>';
  var el=document.createElement('div');el.id='amendMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('amendMo')};
  document.body.appendChild(el);
}
function amCalc(){
  var q=+$('amQty').value||0,p=+$('amPrice').value||0;
  $('amAmt').value=q*p;
}
function pickAmendCli(){
  var h='<div class="mb" style="width:500px"><div class="mo-t">거래처 선택<button class="mo-x" onclick="cMo(\'amCliMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button></div>';
  h+='<div style="padding:14px 18px"><input id="amCliSch" placeholder="거래처명 검색..." oninput="amFilterCli()" style="width:100%;padding:10px;border:1px solid var(--bdr);border-radius:8px;margin-bottom:8px">';
  h+='<div id="amCliList" style="max-height:300px;overflow-y:auto;border:1px solid var(--bdr);border-radius:8px;padding:6px"></div></div></div>';
  var el=document.createElement('div');el.id='amCliMo';el.className='mo-bg';el.style.zIndex='10000';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('amCliMo')};
  document.body.appendChild(el);
  amFilterCli();
  setTimeout(function(){$('amCliSch').focus()},80);
}
function amFilterCli(){
  var v=($('amCliSch')?$('amCliSch').value:'').toLowerCase();
  var cs=DB.g('cli').filter(function(c){return !v||(c.nm||'').toLowerCase().includes(v)});
  if(cs.length>50)cs=cs.slice(0,50);
  var h='';
  if(!cs.length)h='<div style="padding:14px;text-align:center;color:var(--txt3)">검색 결과 없음</div>';
  else cs.forEach(function(c){
    h+='<div onclick="$(\'amNewCli\').value=\''+c.nm.replace(/\'/g,"&#39;")+'\';cMo(\'amCliMo\')" style="padding:10px 12px;border-radius:6px;cursor:pointer;font-size:13px" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">';
    h+='<div style="font-weight:700">'+c.nm+'</div>';
    if(c.bizNo||c.addr)h+='<div style="font-size:11px;color:var(--txt3);margin-top:2px">'+(c.bizNo||'')+(c.addr?' | '+c.addr.slice(0,30):'')+'</div>';
    h+='</div>';
  });
  $('amCliList').innerHTML=h;
}
function doAmendSale(){
  var origId=$('amOrigId').value;
  var orig=DB.g('sales').find(function(s){return s.id===origId});
  if(!orig){toast('원본 매출 없음','err');return}
  var newCli=$('amNewCli').value.trim();
  var newQty=+$('amQty').value||0;
  var newPrice=+$('amPrice').value||0;
  var newAmt=+$('amAmt').value||0;
  var kindCode=parseInt($('amKind').value);
  var kindName=AMEND_KINDS[kindCode]||'';
  var memo=$('amMemo').value.trim();
  if(!newCli){toast('거래처 필요','err');return}
  if(newAmt<=0){toast('금액 필요','err');return}

  var sales=DB.g('sales');
  var ts=new Date().toISOString();
  var by=(typeof CU!=='undefined'&&CU)?CU.nm:'';

  // 1. 당초(원본) → 얼마에요 IsAmended=true
  var oi=sales.findIndex(function(s){return s.id===origId});
  if(oi>=0){
    sales[oi].isAmended=true;            // 얼마에요 IsAmended
    sales[oi].amendedKindCode=kindCode;  // 얼마에요 AmendedKindCode
    sales[oi].amendedAt=ts;
    sales[oi].amendedBy=by;
  }
  // 2. 부의(-) 발행 → 얼마에요 IsAdditionalAmended=true
  var negId=gid();
  sales.push({
    id:negId, dt:td(), cli:orig.cli, prod:orig.prod,
    qty:-orig.qty, price:orig.price, amt:-orig.amt, paid:0, payType:'수정',
    note:'[부의(-) - 당초 취소] '+kindCode+'.'+kindName+(memo?' / '+memo:''),
    isAdditionalAmended:true,         // 얼마에요 IsAdditionalAmended (부의 표시)
    amendedKindCode:kindCode,         // 얼마에요 AmendedKindCode
    amendedOriginalId:origId,         // 얼마에요 AmendedOriginalServerKey
    cat:ts, regBy:by
  });
  // 3. 신규(+) 발행 → 수정된 정보로 새 매출
  var newId=gid();
  sales.push({
    id:newId, dt:td(), cli:newCli, prod:orig.prod,
    qty:newQty, price:newPrice, amt:newAmt, paid:0, payType:'미수',
    note:'[수정 발행] '+kindCode+'.'+kindName+(memo?' / '+memo:''),
    isAdditionalAmended:false,        // 부의 아님 (신규 수정 발행)
    amendedKindCode:kindCode,
    amendedOriginalId:origId,
    changeMeta:{from:orig.cli, to:newCli, reason:kindName, kindCode:kindCode, memo:memo, by:by},
    cat:ts, regBy:by
  });
  DB.s('sales',sales);

  // 4. 변경 이력 기록 (얼마에요 EntityLog 패턴)
  var cl=DB.g('changeLog');
  cl.push({
    id:gid(), dt:td(), tm:nw(),
    type:'수정세금계산서발행',
    target:'SALE:'+origId,
    amendedKindCode:kindCode,
    amendedKindName:kindName,
    from:orig.cli+' / '+fmt(orig.amt)+'원',
    to:newCli+' / '+fmt(newAmt)+'원',
    memo:memo, by:by,
    refIds:[origId,negId,newId]
  });
  DB.s('changeLog',cl);

  cMo('amendMo');
  if(typeof rSl==='function')rSl();
  toast('수정세금계산서 발행 완료 ('+kindCode+'.'+kindName+')','ok');
}

/* === 입금/지급 === */
function openPay(type){$('payTgt').value=type;$('payT').textContent=type==='sales'?'입금 처리':'지급 처리';$('payCli').value='';$('payAmt').value='';$('payDt').value=td();$('payInfo').innerHTML='';oMo('payMo')}
function doPay(){
  const tgt=$('payTgt').value,cli=$('payCli').value.trim(),amt=+$('payAmt').value;
  if(!cli){toast('거래처','err');return}if(!amt||amt<=0){toast('금액','err');return}
  const key=tgt==='sales'?'sales':'purchase';
  const ls=DB.g(key);const unpaid=ls.filter(r=>r.cli===cli&&(r.paid||0)<(r.amt||0)).sort((a,b)=>a.dt>b.dt?1:-1);
  let remain=amt;
  unpaid.forEach(r=>{if(remain<=0)return;const need=(r.amt||0)-(r.paid||0);const apply=Math.min(need,remain);r.paid=(r.paid||0)+apply;remain-=apply;const idx=ls.findIndex(x=>x.id===r.id);if(idx>=0)ls[idx]=r});
  DB.s(key,ls);
  /* === 입금/지급 이력 저장 === */
  try{
    var _ph=DB.g('payHistory');
    _ph.push({id:gid(),dt:$('payDt').value||td(),type:tgt==='sales'?'입금':'지급',cli:cli,amt:amt,applied:amt-remain,note:'',mgr:typeof CU!=='undefined'&&CU?CU.nm:'',tm:nw()});
    DB.s('payHistory',_ph);
  }catch(e){console.warn('입금이력 저장 오류:',e)}
  cMo('payMo');if(tgt==='sales')rSl();else rPr();toast(`${fmt(amt)}원 ${tgt==='sales'?'입금':'지급'} 처리`,'ok');
}

/* === 손익 === */
/* === 경비 CRUD === */
function openExpM(){$('expId').value='';$('expDt').value=td();$('expCat').value='임대료';$('expAmt').value='';$('expNote').value='';oMo('expMo')}
function saveExp(){
  const dt=$('expDt').value,cat=$('expCat').value,amt=+$('expAmt').value;
  if(!dt){toast('날짜 필요','err');return}if(!amt||amt<=0){toast('금액 필요','err');return}
  const id=$('expId').value||gid();
  const rec={id,dt,cat,amt,note:$('expNote').value};
  const ls=DB.g('expense');const idx=ls.findIndex(x=>x.id===id);
  if(idx>=0)ls[idx]=rec;else ls.push(rec);DB.s('expense',ls);cMo('expMo');rPl();toast('저장','ok');
}
function eExp(id){const r=DB.g('expense').find(x=>x.id===id);if(!r)return;$('expId').value=r.id;$('expDt').value=r.dt;$('expCat').value=r.cat;$('expAmt').value=r.amt;$('expNote').value=r.note||'';oMo('expMo')}
function dExp(id){if(!confirm('삭제?'))return;DB.s('expense',DB.g('expense').filter(x=>x.id!==id));rPl();toast('삭제','ok')}

function rPl(){
  const y=$('plY').value||new Date().getFullYear();
  const sl=DB.g('sales'),pr=DB.g('purchase'),pay=DB.g('payroll'),exp=DB.g('expense');
  const cm=td().slice(0,7);
  const cms=sl.filter(r=>r.dt.startsWith(cm));const cmp=pr.filter(r=>r.dt.startsWith(cm));
  const cml=pay.filter(r=>r.month===cm);const cme=exp.filter(r=>r.dt.startsWith(cm));
  $('plS').textContent=fmt(cms.reduce((s,r)=>s+(r.amt||0),0))+'원';
  $('plP').textContent=fmt(cmp.reduce((s,r)=>s+(r.amt||0),0))+'원';
  $('plL').textContent=fmt(cml.reduce((s,r)=>s+(r.total||0),0))+'원';
  const expAmt=cme.reduce((s,r)=>s+(r.amt||0),0);
  if($('plE'))$('plE').textContent=fmt(expAmt)+'원';
  const profit=cms.reduce((s,r)=>s+(r.amt||0),0)-cmp.reduce((s,r)=>s+(r.amt||0),0)-cml.reduce((s,r)=>s+(r.total||0),0)-expAmt;
  $('plN').textContent=fmt(profit)+'원';$('plN').style.color=profit>=0?'var(--suc)':'var(--dan)';

  let rows='',maxVal=1,data=[];
  for(let m=1;m<=12;m++){
    const mk=y+'-'+String(m).padStart(2,'0');
    const sAmt=sl.filter(r=>r.dt.startsWith(mk)).reduce((s,r)=>s+(r.amt||0),0);
    const pAmt=pr.filter(r=>r.dt.startsWith(mk)).reduce((s,r)=>s+(r.amt||0),0);
    const lAmt=pay.filter(r=>r.month===mk).reduce((s,r)=>s+(r.total||0),0);
    const eAmt=exp.filter(r=>r.dt.startsWith(mk)).reduce((s,r)=>s+(r.amt||0),0);
    const net=sAmt-pAmt-lAmt-eAmt;const rate=sAmt?Math.round(net/sAmt*100):0;
    data.push({m,sAmt,pAmt,lAmt,eAmt,net,rate});
    maxVal=Math.max(maxVal,sAmt,pAmt);
    rows+=`<tr><td>${m}월</td><td style="text-align:right">${fmt(sAmt)}</td><td style="text-align:right">${fmt(pAmt)}</td><td style="text-align:right">${fmt(lAmt)}</td><td style="text-align:right">${fmt(eAmt)}</td><td style="text-align:right;font-weight:700;color:${net>=0?'var(--suc)':'var(--dan)'}">${fmt(net)}</td><td style="text-align:right;color:${rate>=0?'var(--suc)':'var(--dan)'}">${rate}%</td></tr>`;
  }
  $('plTbl').querySelector('tbody').innerHTML=rows;
  // 차트
  $('plChart').innerHTML=`<div class="bar-wrap">${data.map(d=>`<div class="bar-g"><div style="display:flex;gap:2px;align-items:flex-end;height:100%"><div class="bar" style="height:${Math.max(2,d.sAmt/maxVal*160)}px;background:var(--pri);width:12px" title="매출 ${fmt(d.sAmt)}"></div><div class="bar" style="height:${Math.max(2,d.pAmt/maxVal*160)}px;background:var(--wrn);width:12px" title="매입 ${fmt(d.pAmt)}"></div></div><div class="bar-lb">${d.m}월</div></div>`).join('')}</div><div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:11px"><span style="color:var(--pri)">■ 매출</span><span style="color:var(--wrn)">■ 매입</span></div>`;
  // 경비 내역 테이블
  const yExp=exp.filter(r=>r.dt.startsWith(y)).sort((a,b)=>b.dt>a.dt?1:-1);
  if($('plExpTbl'))$('plExpTbl').querySelector('tbody').innerHTML=yExp.map(r=>{
    return `<tr><td>${r.dt}</td><td style="font-weight:600">${r.cat}</td><td style="text-align:right;font-weight:700">${fmt(r.amt)}원</td><td>${r.note||'-'}</td><td><button class="btn btn-sm btn-o" onclick="eExp('${r.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dExp('${r.id}')">삭제</button></td></tr>`;
  }).join('')||'<tr><td colspan="5" class="empty-cell">등록된 경비가 없습니다</td></tr>';
}
function printPl(){const c=$('plTbl').innerHTML;const w=window.open('','_blank');w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>손익현황</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Nanum Gothic',sans-serif;font-size:11px;padding:15mm}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px 6px;font-size:10px}th{background:#E5E7EB;font-weight:700}@media print{@page{size:A4 landscape;margin:10mm}}</style></head><body><h2 style="text-align:center;margin-bottom:12px">팩플로우 ${$('plY').value}년 손익현황</h2><table>${c}</table></body></html>`);w.document.close();setTimeout(()=>w.print(),300)}

/* === 세금계산서 === */
function rTx(){
  // 기간 필터 초기화
  if(!$('txPrdBar').innerHTML)$('txPrdBar').innerHTML=periodFilterHTML('tx');
  if(!_prdState['tx']){setPrd('tx','monthly',null);if(!$('txDtVal').value)$('txDtVal').value=td().slice(0,7)}
  const tp=$('txTp').value;
  // 얼마에요 GroupId 필터
  const rawAll=DB.g('taxInvoice');
  const all=_currentGroupId==='ALL'?rawAll:rawAll.filter(function(r){return !r.groupId||r.groupId===_currentGroupId;});
  const ma=prdFilterData(all,'tx','dt');
  const fl=ma.filter(r=>{if(tp&&r.type!==tp)return false;return true}).sort((a,b)=>b.dt>a.dt?1:-1);
  $('txC').textContent=ma.length;$('txS').textContent=fmt(ma.reduce((s,r)=>s+(r.supply||0),0))+'원';
  $('txV').textContent=fmt(ma.reduce((s,r)=>s+(r.vat||0),0))+'원';
  $('txT').textContent=fmt(ma.reduce((s,r)=>s+(r.supply||0)+(r.vat||0),0))+'원';
  var stBadge=function(m){
    if(m==='전자발행')return '<span class="bd" style="background:#EFF6FF;color:#1E40AF;border-color:#BFDBFE">⚡전자</span>';
    if(m==='전자실패')return '<span class="bd" style="background:#FEE2E2;color:#DC2626;border-color:#FECACA">실패</span>';
    return '<span class="bd" style="background:#F1F5F9;color:#64748B;border-color:#E2E8F0">📄종이</span>';
  };
  var _cos=DB.g('companies')||[];
  $('txTbl').querySelector('tbody').innerHTML=fl.map(r=>{const tot=(r.supply||0)+(r.vat||0);
    var _grpCo=_cos.find(function(c){return c.id===r.groupId});
    var _grpBadge=_grpCo?'<span class="grp-badge '+(_grpCo.id==='A'?'grp-badge-A':'grp-badge-B')+'">'+_grpCo.nm+'</span>':'';
    return `<tr><td>${r.dt}</td><td><span class="bd ${r.type==='매출'?'bd-p':'bd-o'}">${r.type}</span></td><td style="font-weight:700">${r.cli}</td><td>${r.item||'-'}</td><td style="text-align:right">${fmt(r.supply)}</td><td style="text-align:right">${fmt(r.vat)}</td><td style="text-align:right;font-weight:700">${fmt(tot)}</td><td>${stBadge(r.method||'종이')} ${_grpBadge}</td><td><button class="btn btn-sm btn-o" onclick="eTxr('${r.id}')">수정</button>${r.method!=='전자발행'?' <button class="btn btn-sm" style="background:#1E40AF;color:#fff" onclick="reissueElecTx(\''+r.id+'\')">전자발행</button>':''} <button class="btn btn-sm btn-d" onclick="dTxr('${r.id}')">삭제</button></td></tr>`}).join('')||'<tr><td colspan="9" class="empty-cell">등록된 내역이 없습니다. 상단 버튼으로 등록해주세요.</td></tr>';
  // 엑셀 내보내기 데이터
  _prdExportData['tx']={headers:['발행일','구분','거래처','품목','공급가액','세액','합계','발행방법'],rows:fl.map(r=>[r.dt,r.type,r.cli,r.item||'',r.supply||0,r.vat||0,(r.supply||0)+(r.vat||0),r.method||'종이']),sheetName:'세금계산서',fileName:'세금계산서'};
}
window._prdCb_tx=rTx;
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
function openTxM(){['txId','txItem','txBiz','txNt','txCeo','txAddr'].forEach(x=>{if($(x))$(x).value=''});$('txDt').value=td();$('txTpS').value='매출';$('txCli').value='';$('txSup').value='';$('txVat').value='';$('txTot').value='';if($('txQty'))$('txQty').value=1;if($('txPrice'))$('txPrice').value='';if($('txPurpose'))$('txPurpose').value='영수';document.querySelector('input[name="txMethod"][value="paper"]').checked=true;toggleTxMethod();$('txMoT').textContent='세금계산서 등록';
  renderGrpRadio('txGrpSel',_currentGroupId==='ALL'?'':_currentGroupId);
  updateTxGrpInfo(getSelectedGrpId('txGrpSel'));
  oMo('txMo2')}
function eTxr(id){const r=DB.g('taxInvoice').find(x=>x.id===id);if(!r)return;$('txId').value=r.id;$('txDt').value=r.dt;$('txTpS').value=r.type;$('txCli').value=r.cli;$('txBiz').value=r.bizNo||'';if($('txCeo'))$('txCeo').value=r.ceo||'';if($('txAddr'))$('txAddr').value=r.addr||'';$('txItem').value=r.item||'';if($('txQty'))$('txQty').value=r.qty||1;if($('txPrice'))$('txPrice').value=r.price||'';$('txSup').value=r.supply;$('txVat').value=r.vat;$('txTot').value=fmt((r.supply||0)+(r.vat||0))+'원';$('txNt').value=r.note||'';if($('txPurpose'))$('txPurpose').value=r.purpose||'영수';var m=(r.method==='전자발행')?'electronic':'paper';document.querySelector('input[name="txMethod"][value="'+m+'"]').checked=true;toggleTxMethod();$('txMoT').textContent='수정';
  renderGrpRadio('txGrpSel',r.groupId||'');
  updateTxGrpInfo(r.groupId||'');
  oMo('txMo2')}
function saveTx(){const c=$('txCli').value.trim(),s=+$('txSup').value;if(!c){toast('거래처','err');return}if(!s){toast('공급가액','err');return}const id=$('txId').value||gid();const v=Math.round(s*(typeof SysCode!=='undefined'?SysCode.vatRate():0.1));const method=document.querySelector('input[name="txMethod"]:checked').value==='electronic'?'전자대기':'종이';
  const gId=getSelectedGrpId('txGrpSel')||(_currentGroupId!=='ALL'?_currentGroupId:'');
  const cos=DB.g('companies')||[];const co=cos.find(function(c){return c.id===gId;})||{};
  const rec={id,dt:$('txDt').value,type:$('txTpS').value,cli:c,bizNo:$('txBiz').value,ceo:$('txCeo')?$('txCeo').value:'',addr:$('txAddr')?$('txAddr').value:'',item:$('txItem').value,qty:+($('txQty')?$('txQty').value:1)||1,price:+($('txPrice')?$('txPrice').value:0)||0,supply:s,vat:v,purpose:$('txPurpose')?$('txPurpose').value:'영수',method:method,note:$('txNt').value,groupId:gId,supplierNm:co.nm||'',supplierBizNo:co.bizNo||'',cat:nw()};
  const ls=DB.g('taxInvoice');const idx=ls.findIndex(x=>x.id===id);if(idx>=0)ls[idx]=rec;else ls.push(rec);DB.s('taxInvoice',ls);cMo('txMo2');rTx();toast('저장','ok')}
function dTxr(id){if(!confirm('삭제?'))return;DB.s('taxInvoice',DB.g('taxInvoice').filter(x=>x.id!==id));rTx();toast('삭제','ok')}

/* 종이 세금계산서 인쇄 */
function printTx(){
  const c=$('txCli').value.trim(),s=+$('txSup').value;
  if(!c||!s){toast('거래처/공급가액 필요','err');return}
  const co=DB.g1('co')||{nm:'팩플로우',addr:'',tel:'',fax:''};
  const v=Math.round(s*(typeof SysCode!=='undefined'?SysCode.vatRate():0.1));
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
  var all=DB.g('taxInvoice');
  var data=prdFilterData(all,'tx','dt');
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
  var _vr2=typeof SysCode!=='undefined'?SysCode.vatRate():0.1;
  $('txVat').value=Math.round(s*_vr2);
  $('txTot').value=fmt(s+Math.round(s*_vr2))+'원';
}

/* 팝빌 설정 저장/로드 — 두 회사 지원 */
function savePopbillConfig(){
  var cfg={
    linkId:$('pbLinkId').value.trim(),
    secretKey:$('pbSecretKey').value.trim(),
    corpNum:$('pbCorpNum').value.trim().replace(/-/g,''),    // 회사 A
    corpNumB:$('pbCorpNumB')?$('pbCorpNumB').value.trim().replace(/-/g,''):'', // 회사 B
    isTest:$('pbIsTest').checked
  };
  DB.s1('popbillConfig',cfg);toast('팝빌 API 설정 저장 완료','ok');
}
function loadPopbillConfig(){
  var cfg=DB.g1('popbillConfig')||{};
  if($('pbLinkId'))$('pbLinkId').value=cfg.linkId||'';
  if($('pbSecretKey'))$('pbSecretKey').value=cfg.secretKey||'';
  if($('pbCorpNum'))$('pbCorpNum').value=cfg.corpNum||'';
  if($('pbCorpNumB'))$('pbCorpNumB').value=cfg.corpNumB||'';
  if($('pbIsTest'))$('pbIsTest').checked=cfg.isTest!==false;
}

function expCSV(type){
  let csv='',data;
  if(type==='sales'){data=DB.g('sales');csv='\uFEFF일자,거래처,품명,수량,단가,매출액,입금,미수금\n';data.forEach(r=>{csv+=`${r.dt},${r.cli},${r.prod},${r.qty},${r.price},${r.amt},${r.paid||0},${Math.max(0,r.amt-(r.paid||0))}\n`})}
  else if(type==='purchase'){data=DB.g('purchase');csv='\uFEFF일자,거래처,품명,수량,단가,매입액,지급,미지급\n';data.forEach(r=>{csv+=`${r.dt},${r.cli},${r.prod},${r.qty},${r.price},${r.amt},${r.paid||0},${Math.max(0,r.amt-(r.paid||0))}\n`})}
  else{data=DB.g('taxInvoice');csv='\uFEFF발행일,구분,거래처,품목,공급가액,세액,합계\n';data.forEach(r=>{csv+=`${r.dt},${r.type},${r.cli},${r.item||''},${r.supply},${r.vat},${(r.supply||0)+(r.vat||0)}\n`})}
  const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=type+'_'+td()+'.csv';a.click();toast('내보내기','ok');
}

