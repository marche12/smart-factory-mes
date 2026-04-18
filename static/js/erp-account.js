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
function saveSl(){
  const c=$('sCli').value.trim(),p=$('sProd').value.trim(),pr=+$('sPrice').value;
  if(!c){toast('거래처','err');return}
  if(!p){toast('품명','err');return}
  if(!pr){toast('단가','err');return}
  const id=$('sId').value||gid(),q=+$('sQty').value||1;
  const amt = q*pr;
  const paid = +$('sPaid').value||0;

  // 신용한도 체크
  if(typeof checkCreditLimit === 'function'){
    var existing = $('sId').value ? DB.g('sales').find(function(x){return x.id===id}) : null;
    var addAmt = amt - paid - (existing ? (existing.amt - (existing.paid||0)) : 0);
    if(addAmt > 0){
      var credit = checkCreditLimit(c, addAmt);
      if(!credit.ok){
        if(!confirm(credit.msg + '\n\n그래도 저장하시겠습니까?')) return;
      } else if(credit.warn){
        toast(credit.msg, 'err');
      }
    }
  }

  const gId=getSelectedGrpId('sGrpSel')||(_currentGroupId!=='ALL'?_currentGroupId:'');
  const rec={id,dt:$('sDt').value,cli:c,prod:p,qty:q,price:pr,amt:amt,paid:paid,payType:$('sPay').value,note:$('sNote').value,groupId:gId,cat:nw()};
  const ls=DB.g('sales');const idx=ls.findIndex(x=>x.id===id);
  if(idx>=0)ls[idx]=rec;else ls.push(rec);
  DB.s('sales',ls);cMo('sMo');rSl();toast('저장','ok');
}

/* 거래처 단가표에서 자동 단가 채우기 */
function applyCliPrice(){
  var cliField = $('sCli'), prodField = $('sProd'), priceField = $('sPrice');
  if(!cliField || !prodField || !priceField) return;
  if(priceField.value) return;
  if(typeof getCliPrice !== 'function') return;
  var p = getCliPrice(cliField.value.trim(), prodField.value.trim());
  if(p){
    priceField.value = p;
    if(typeof cAmt === 'function') cAmt('s');
    toast('거래처 단가표 적용 ('+fmt(p)+'원)', 'ok');
  }
}
window.applyCliPrice = applyCliPrice;
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
    if(m==='전자대기')return '<span class="bd" style="background:#EEF2FF;color:#4338CA;border-color:#C7D2FE">전자대기</span>';
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
function eTxr(id){const r=DB.g('taxInvoice').find(x=>x.id===id);if(!r)return;$('txId').value=r.id;$('txDt').value=r.dt;$('txTpS').value=r.type;$('txCli').value=r.cli;$('txBiz').value=r.bizNo||'';if($('txCeo'))$('txCeo').value=r.ceo||'';if($('txAddr'))$('txAddr').value=r.addr||'';$('txItem').value=r.item||'';if($('txQty'))$('txQty').value=r.qty||1;if($('txPrice'))$('txPrice').value=r.price||'';$('txSup').value=r.supply;$('txVat').value=r.vat;$('txTot').value=fmt((r.supply||0)+(r.vat||0))+'원';$('txNt').value=r.note||'';if($('txPurpose'))$('txPurpose').value=r.purpose||'영수';var m=(r.method&&r.method.indexOf('전자')===0)?'electronic':'paper';document.querySelector('input[name="txMethod"][value="'+m+'"]').checked=true;toggleTxMethod();$('txMoT').textContent='수정';
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


/* ===== 팝빌 수신 세금계산서 조회 ===== */
var _pbRecvCache = [];

function openPopbillReceive(){
  var today = td();
  var monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth()-1);
  $('pbRecvFrom').value = monthAgo.toISOString().slice(0,10);
  $('pbRecvTo').value = today;
  $('pbRecvResult').innerHTML = '';
  $('pbRecvImportBtn').style.display = 'none';
  _pbRecvCache = [];
  oMo('popbillRecvMo');
}

function queryPopbillReceived(){
  var from = $('pbRecvFrom').value.replace(/-/g,'');
  var to = $('pbRecvTo').value.replace(/-/g,'');
  var type = $('pbRecvType').value;
  if(!from || !to){toast('기간 입력','err');return}
  $('pbRecvResult').innerHTML = '<div style="text-align:center;padding:30px;color:var(--txt3)">조회 중...</div>';
  authFetch('/api/popbill/received', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({dateType: type, from: from, to: to, page: 1, perPage: 100})
  }).then(function(r){return r.json()}).then(function(res){
    if(!res.ok){
      $('pbRecvResult').innerHTML = '<div style="color:var(--dan);padding:14px">❌ '+res.error+'</div>';
      return;
    }
    var list = (res.data && res.data.list) ? res.data.list : [];
    _pbRecvCache = list;
    if(list.length === 0){
      $('pbRecvResult').innerHTML = '<div style="padding:20px;text-align:center;color:var(--txt3)">해당 기간에 수신된 세금계산서가 없습니다</div>';
      return;
    }
    var h = '<div style="margin-bottom:8px;font-size:13px;font-weight:700">총 '+list.length+'건</div>';
    h += '<table class="dt" style="font-size:12px"><thead><tr><th><input type="checkbox" checked onclick="document.querySelectorAll(\'.pb-chk\').forEach(function(x){x.checked=this.checked}.bind(this))"></th><th>작성일</th><th>공급자</th><th>사업자번호</th><th>품목</th><th>공급가액</th><th>세액</th><th>합계</th></tr></thead><tbody>';
    list.forEach(function(r,i){
      h += '<tr><td><input type="checkbox" class="pb-chk" data-idx="'+i+'" checked></td>';
      h += '<td>'+(r.writeDate||'-')+'</td>';
      h += '<td>'+(r.invoicerCorpName||'-')+'</td>';
      h += '<td>'+(r.invoicerCorpNum||'-')+'</td>';
      h += '<td>'+(r.itemName||'-')+'</td>';
      h += '<td style="text-align:right">'+fmt(+r.supplyCostTotal||0)+'</td>';
      h += '<td style="text-align:right">'+fmt(+r.taxTotal||0)+'</td>';
      h += '<td style="text-align:right;font-weight:700">'+fmt(+r.totalAmount||0)+'</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
    $('pbRecvResult').innerHTML = h;
    $('pbRecvImportBtn').style.display = '';
  }).catch(function(e){
    $('pbRecvResult').innerHTML = '<div style="color:var(--dan);padding:14px">서버 오류: '+e.message+'</div>';
  });
}

function importPopbillReceived(){
  var checked = Array.from(document.querySelectorAll('.pb-chk')).filter(function(x){return x.checked});
  if(checked.length === 0){toast('선택된 건이 없습니다','err');return}
  if(!confirm(checked.length+'건을 매입장부에 등록하시겠습니까?')) return;

  var purchase = DB.g('purchase') || [];
  var added = 0, skipped = 0;
  checked.forEach(function(cb){
    var r = _pbRecvCache[+cb.dataset.idx];
    if(!r) return;
    // 중복 방지: ntsConfirmNum 같은 건 스킵
    if(r.ntsConfirmNum && purchase.some(function(p){return p.ntsNum === r.ntsConfirmNum})){
      skipped++; return;
    }
    var amt = (+r.totalAmount) || ((+r.supplyCostTotal||0) + (+r.taxTotal||0));
    var dt = r.writeDate ? r.writeDate.substring(0,4)+'-'+r.writeDate.substring(4,6)+'-'+r.writeDate.substring(6,8) : td();
    purchase.push({
      id: gid(),
      dt: dt,
      cli: r.invoicerCorpName || '-',
      bizNo: r.invoicerCorpNum || '',
      prod: r.itemName || '-',
      qty: 1,
      price: amt,
      amt: amt,
      paid: 0,
      payType: '미지급',
      note: '팝빌 자동등록',
      ntsNum: r.ntsConfirmNum || '',
      cat: nw(),
      _src: 'popbill'
    });
    added++;
  });
  DB.s('purchase', purchase);
  toast('등록 '+added+'건 / 중복스킵 '+skipped+'건','ok');
  cMo('popbillRecvMo');
  if(typeof rPr === 'function') rPr();
}

/* ===== 홈택스 엑셀 업로드 ===== */
var _htxRecords = [];

function openHometaxUpload(){
  $('htxType').value = 'purchase';
  $('htxFile').value = '';
  $('htxResult').innerHTML = '';
  $('htxImportBtn').style.display = 'none';
  _htxRecords = [];
  oMo('hometaxUploadMo');
}

function parseHometaxExcel(){
  var file = $('htxFile').files[0];
  if(!file){toast('파일 선택','err');return}
  if(file.size > 5*1024*1024){toast('5MB 이하만 가능','err');return}

  var reader = new FileReader();
  reader.onload = function(e){
    var base64 = e.target.result.split(',')[1] || e.target.result;
    $('htxResult').innerHTML = '<div style="text-align:center;padding:30px;color:var(--txt3)">분석 중...</div>';

    authFetch('/api/hometax/parse-excel', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({fileBase64: base64, type: $('htxType').value})
    }).then(function(r){return r.json()}).then(function(res){
      if(!res.ok){
        $('htxResult').innerHTML = '<div style="color:var(--dan);padding:14px">❌ '+res.error+'</div>';
        return;
      }
      _htxRecords = res.records || [];
      if(_htxRecords.length === 0){
        $('htxResult').innerHTML = '<div style="padding:20px;text-align:center;color:var(--txt3)">파싱된 레코드 없음</div>';
        return;
      }
      var h = '<div style="margin-bottom:8px;font-size:13px;font-weight:700">총 '+_htxRecords.length+'건 파싱됨</div>';
      h += '<table class="dt" style="font-size:12px"><thead><tr><th>일자</th><th>거래처</th><th>품목</th><th>공급가액</th><th>세액</th><th>합계</th></tr></thead><tbody>';
      _htxRecords.slice(0, 50).forEach(function(r){
        h += '<tr>';
        h += '<td>'+(r.dt||'-')+'</td>';
        h += '<td>'+(r.cli||'-')+'</td>';
        h += '<td>'+(r.item||'-')+'</td>';
        h += '<td style="text-align:right">'+fmt(r.supply)+'</td>';
        h += '<td style="text-align:right">'+fmt(r.vat)+'</td>';
        h += '<td style="text-align:right;font-weight:700">'+fmt(r.total)+'</td>';
        h += '</tr>';
      });
      h += '</tbody></table>';
      if(_htxRecords.length > 50){
        h += '<div style="text-align:center;color:var(--txt3);padding:8px">... 외 '+(_htxRecords.length-50)+'건</div>';
      }
      $('htxResult').innerHTML = h;
      $('htxImportBtn').style.display = '';
    }).catch(function(e){
      $('htxResult').innerHTML = '<div style="color:var(--dan);padding:14px">서버 오류: '+e.message+'</div>';
    });
  };
  reader.readAsDataURL(file);
}

function importHometaxData(){
  if(_htxRecords.length === 0){toast('데이터 없음','err');return}
  if(!confirm(_htxRecords.length+'건을 등록하시겠습니까?')) return;

  var type = $('htxType').value;
  var dbKey = type === 'sales' ? 'sales' : 'purchase';
  var list = DB.g(dbKey) || [];
  var added = 0, skipped = 0;

  _htxRecords.forEach(function(r){
    // 중복 체크: 승인번호 있으면 그걸로
    if(r.ntsNum && list.some(function(x){return x.ntsNum === r.ntsNum})){
      skipped++; return;
    }
    var dt = r.dt ? r.dt.replace(/\//g,'-').substring(0,10) : td();
    var amt = (+r.total) || ((+r.supply||0) + (+r.vat||0));
    list.push({
      id: gid(),
      dt: dt,
      cli: r.cli || '-',
      bizNo: r.bizNo || '',
      prod: r.item || '-',
      qty: +r.qty || 1,
      price: amt,
      amt: amt,
      paid: 0,
      payType: type === 'sales' ? '미수' : '미지급',
      note: '홈택스 엑셀 자동등록',
      ntsNum: r.ntsNum || '',
      cat: nw(),
      _src: 'hometax'
    });
    added++;
  });
  DB.s(dbKey, list);
  toast('등록 '+added+'건 / 중복스킵 '+skipped+'건','ok');
  cMo('hometaxUploadMo');
  if(type === 'sales' && typeof rSl === 'function') rSl();
  else if(typeof rPr === 'function') rPr();
}

/* =======================================================
   부가세 신고 자료 (얼마에요 VatReport 패턴)
   매출/매입 → 거래처별 집계 → 홈택스 신고 양식 호환
   ======================================================= */

function _vatGetPeriod(){
  var year = +$('vatYear').value || new Date().getFullYear();
  var p = $('vatPeriod').value || 'Q1';
  var map = {Q1:[1,3],Q2:[4,6],Q3:[7,9],Q4:[10,12],H1:[1,6],H2:[7,12],Y:[1,12]};
  var r = map[p] || [1,3];
  var from = year+'-'+String(r[0]).padStart(2,'0')+'-01';
  var lastDay = new Date(year, r[1], 0).getDate();
  var to = year+'-'+String(r[1]).padStart(2,'0')+'-'+String(lastDay).padStart(2,'0');
  return {from:from, to:to, label:year+'년 '+p, year:year, p:p};
}

function _vatAggregate(type){
  var period = _vatGetPeriod();
  var companyId = $('vatCompany').value;
  var list = DB.g(type) || [];
  var filtered = list.filter(function(r){
    if(!r.dt || r.dt < period.from || r.dt > period.to) return false;
    if(companyId && r.companyId !== companyId) return false;
    return true;
  });

  // 거래처별 집계 (사업자번호 있으면 사업자번호 기준)
  var agg = {};
  filtered.forEach(function(r){
    var key = r.bizNo || r.cli || '-';
    if(!agg[key]){
      agg[key] = {
        cli: r.cli || '-',
        bizNo: r.bizNo || '',
        count: 0,
        supply: 0,
        vat: 0,
        total: 0
      };
    }
    var vatRate = typeof SysCode!=='undefined' ? SysCode.vatRate() : 0.1;
    var amt = r.amt || 0;
    var supply = r.supply != null ? r.supply : Math.round(amt / (1+vatRate));
    var vat = r.vat != null ? r.vat : (amt - supply);
    agg[key].count++;
    agg[key].supply += supply;
    agg[key].vat += vat;
    agg[key].total += (supply + vat);
  });
  return {period: period, list: Object.values(agg).sort(function(a,b){return b.total - a.total})};
}

function renderVatReport(){
  var sales = _vatAggregate('sales');
  var purchase = _vatAggregate('purchase');

  var sTotal = sales.list.reduce(function(s,r){return s+r.supply},0);
  var sVat = sales.list.reduce(function(s,r){return s+r.vat},0);
  var pTotal = purchase.list.reduce(function(s,r){return s+r.supply},0);
  var pVat = purchase.list.reduce(function(s,r){return s+r.vat},0);
  var payableVat = sVat - pVat;

  var h = '<div style="background:#EFF6FF;padding:14px;border-radius:10px;margin-bottom:16px">'
    + '<div style="font-size:13px;font-weight:700;color:#1E40AF;margin-bottom:8px">📌 '+sales.period.label+' 신고 요약</div>'
    + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'
    + '<div><div style="font-size:11px;color:var(--txt3)">매출 공급가액</div><div style="font-size:18px;font-weight:700;color:#1E40AF">'+fmt(sTotal)+'</div></div>'
    + '<div><div style="font-size:11px;color:var(--txt3)">매출세액</div><div style="font-size:18px;font-weight:700;color:#1E40AF">'+fmt(sVat)+'</div></div>'
    + '<div><div style="font-size:11px;color:var(--txt3)">매입 공급가액</div><div style="font-size:18px;font-weight:700;color:#DC2626">'+fmt(pTotal)+'</div></div>'
    + '<div><div style="font-size:11px;color:var(--txt3)">매입세액</div><div style="font-size:18px;font-weight:700;color:#DC2626">'+fmt(pVat)+'</div></div>'
    + '</div>'
    + '<div style="border-top:1px solid #DBEAFE;margin-top:12px;padding-top:12px">'
    + '<div style="display:flex;justify-content:space-between;align-items:center">'
    + '<span style="font-size:14px;font-weight:700">납부할 부가세 (매출세액 - 매입세액)</span>'
    + '<span style="font-size:22px;font-weight:900;color:'+(payableVat>=0?'#DC2626':'#16A34A')+'">'+fmt(payableVat)+'원'+(payableVat<0?' (환급)':'')+'</span>'
    + '</div>'
    + '</div>'
    + '</div>';

  // 매출처별
  h += '<div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#1E40AF">📥 매출처별 집계 ('+sales.list.length+'곳)</div>';
  h += '<div class="u-scroll-x"><table class="dt" style="font-size:12px"><thead><tr>';
  h += '<th>거래처</th><th>사업자번호</th><th>건수</th><th>공급가액</th><th>세액</th><th>합계</th></tr></thead><tbody>';
  sales.list.forEach(function(r){
    h += '<tr><td style="font-weight:700">'+r.cli+'</td>';
    h += '<td>'+r.bizNo+'</td>';
    h += '<td style="text-align:center">'+r.count+'</td>';
    h += '<td style="text-align:right">'+fmt(r.supply)+'</td>';
    h += '<td style="text-align:right">'+fmt(r.vat)+'</td>';
    h += '<td style="text-align:right;font-weight:700">'+fmt(r.total)+'</td></tr>';
  });
  if(sales.list.length === 0) h += '<tr><td colspan="6" class="empty-cell">매출 내역이 없습니다</td></tr>';
  h += '</tbody></table></div>';

  // 매입처별
  h += '<div style="font-size:14px;font-weight:700;margin:20px 0 8px;color:#DC2626">📤 매입처별 집계 ('+purchase.list.length+'곳)</div>';
  h += '<div class="u-scroll-x"><table class="dt" style="font-size:12px"><thead><tr>';
  h += '<th>거래처</th><th>사업자번호</th><th>건수</th><th>공급가액</th><th>세액</th><th>합계</th></tr></thead><tbody>';
  purchase.list.forEach(function(r){
    h += '<tr><td style="font-weight:700">'+r.cli+'</td>';
    h += '<td>'+r.bizNo+'</td>';
    h += '<td style="text-align:center">'+r.count+'</td>';
    h += '<td style="text-align:right">'+fmt(r.supply)+'</td>';
    h += '<td style="text-align:right">'+fmt(r.vat)+'</td>';
    h += '<td style="text-align:right;font-weight:700">'+fmt(r.total)+'</td></tr>';
  });
  if(purchase.list.length === 0) h += '<tr><td colspan="6" class="empty-cell">매입 내역이 없습니다</td></tr>';
  h += '</tbody></table></div>';

  $('vatReportArea').innerHTML = h;
}

function exportVatCSV(){
  var sales = _vatAggregate('sales');
  var purchase = _vatAggregate('purchase');
  var csv = '\uFEFF[부가세 신고자료] '+sales.period.label+'\n\n';

  csv += '=== 매출처별 ===\n';
  csv += '거래처,사업자번호,건수,공급가액,세액,합계\n';
  sales.list.forEach(function(r){
    csv += [r.cli, r.bizNo, r.count, r.supply, r.vat, r.total].join(',')+'\n';
  });

  csv += '\n=== 매입처별 ===\n';
  csv += '거래처,사업자번호,건수,공급가액,세액,합계\n';
  purchase.list.forEach(function(r){
    csv += [r.cli, r.bizNo, r.count, r.supply, r.vat, r.total].join(',')+'\n';
  });

  var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vat_report_'+sales.period.year+'_'+sales.period.p+'.csv';
  a.click();
  toast('CSV 다운로드 완료','ok');
}

function printVatReport(){
  window.print();
}

/* =======================================================
   어음 관리 (얼마에요 IoCode 어음 패턴 + 만기 알림)
   ======================================================= */

function rBill(){
  var bills = DB.g('bills') || [];
  var td = new Date().toISOString().slice(0,10);
  var filter = $('billFilter').value || 'all';
  var type = $('billType').value || '';

  // 요약
  var holding = bills.filter(function(b){return b.status==='holding'||b.status==='discounted'||b.status==='endorsed'});
  var totalRecv = holding.filter(function(b){return b.kind==='R'}).reduce(function(s,b){return s+(+b.amt||0)},0);
  var totalPay = holding.filter(function(b){return b.kind==='P'}).reduce(function(s,b){return s+(+b.amt||0)},0);
  var dueSoon = holding.filter(function(b){
    var diff = (new Date(b.dueDt) - new Date(td))/86400000;
    return diff >= 0 && diff <= 7;
  }).length;
  var overdue = holding.filter(function(b){return b.dueDt < td}).length;

  $('billSummary').innerHTML =
      '<div class="sb blue"><div class="l">받을 어음</div><div class="v">'+fmt(totalRecv)+'</div></div>'
    + '<div class="sb orange"><div class="l">지급할 어음</div><div class="v">'+fmt(totalPay)+'</div></div>'
    + '<div class="sb red"><div class="l">만기 임박 (7일)</div><div class="v">'+dueSoon+'</div></div>'
    + '<div class="sb" style="background:#7C2D12;color:#fff"><div class="l">만기 경과</div><div class="v" style="color:#fff">'+overdue+'</div></div>';

  var filtered = bills.filter(function(b){
    if(type && b.kind !== type) return false;
    if(filter === 'all') return true;
    if(filter === 'settled') return b.status === 'settled';
    if(filter === 'dishonored') return b.status === 'dishonored';
    if(filter === 'pending') return b.status === 'holding' || b.status === 'discounted' || b.status === 'endorsed';
    if(filter === 'due7'){
      if(b.status !== 'holding') return false;
      var diff = (new Date(b.dueDt) - new Date(td))/86400000;
      return diff >= 0 && diff <= 7;
    }
    if(filter === 'overdue') return b.status === 'holding' && b.dueDt < td;
    return true;
  }).sort(function(a,b){return (a.dueDt||'9999') > (b.dueDt||'9999') ? 1 : -1});

  var statusMap = {holding:'보유중', settled:'결제완료', dishonored:'부도', discounted:'할인', endorsed:'배서양도'};
  var statusColor = {holding:'#1E40AF', settled:'#16A34A', dishonored:'#DC2626', discounted:'#9333EA', endorsed:'#F59E0B'};

  var h = '<div class="u-scroll-x"><table class="dt" style="font-size:12px"><thead><tr>';
  h += '<th>구분</th><th>어음번호</th><th>거래처</th><th>금액</th><th>발행일</th><th>만기일</th><th>은행</th><th>상태</th><th>관리</th>';
  h += '</tr></thead><tbody>';

  filtered.forEach(function(b){
    var days = Math.ceil((new Date(b.dueDt) - new Date(td))/86400000);
    var dueLabel = b.dueDt;
    if(b.status === 'holding'){
      if(days < 0) dueLabel += ' <span class="bd bd-d">경과 '+(-days)+'일</span>';
      else if(days <= 7) dueLabel += ' <span class="bd bd-o">D-'+days+'</span>';
    }
    var kindLabel = b.kind === 'R' ? '<span class="bd" style="background:#DBEAFE;color:#1E40AF">받은</span>' : '<span class="bd" style="background:#FEE2E2;color:#DC2626">발행</span>';
    var statusLabel = '<span class="bd" style="background:'+(statusColor[b.status]||'#999')+'22;color:'+(statusColor[b.status]||'#999')+'">'+(statusMap[b.status]||b.status)+'</span>';

    h += '<tr'+(b.status==='holding' && b.dueDt < td ? ' class="row-warn"' : '')+'>';
    h += '<td>'+kindLabel+'</td>';
    h += '<td style="font-family:monospace">'+(b.billNo||'-')+'</td>';
    h += '<td style="font-weight:700">'+(b.cli||'-')+'</td>';
    h += '<td style="text-align:right;font-weight:700">'+fmt(b.amt||0)+'</td>';
    h += '<td>'+(b.issueDt||'-')+'</td>';
    h += '<td>'+dueLabel+'</td>';
    h += '<td>'+(b.bank||'-')+'</td>';
    h += '<td>'+statusLabel+'</td>';
    h += '<td><button class="btn btn-sm btn-o" onclick="editBill(\''+b.id+'\')">수정</button></td>';
    h += '</tr>';
  });
  if(filtered.length === 0) h += '<tr><td colspan="9" class="empty-cell">등록된 어음이 없습니다</td></tr>';
  h += '</tbody></table></div>';
  $('billArea').innerHTML = h;
}
window.renderBills = rBill;

function openBillM(){
  ['billId','billNo','billCli','billAmt','billBank','billNote'].forEach(function(k){if($(k))$(k).value=''});
  $('billKind').value = 'R';
  $('billStatus').value = 'holding';
  var today = new Date().toISOString().slice(0,10);
  $('billIssueDt').value = today;
  // 기본 만기: 60일 후
  var due = new Date(); due.setDate(due.getDate()+60);
  $('billDueDt').value = due.toISOString().slice(0,10);
  $('billMoT').textContent = '어음 등록';
  $('billDelBtn').style.display = 'none';
  oMo('billMo');
}

function editBill(id){
  var b = (DB.g('bills')||[]).find(function(x){return x.id===id});
  if(!b){toast('어음 없음','err');return}
  $('billId').value = b.id;
  $('billKind').value = b.kind || 'R';
  $('billNo').value = b.billNo || '';
  $('billCli').value = b.cli || '';
  $('billAmt').value = b.amt || '';
  $('billIssueDt').value = b.issueDt || '';
  $('billDueDt').value = b.dueDt || '';
  $('billBank').value = b.bank || '';
  $('billStatus').value = b.status || 'holding';
  $('billNote').value = b.note || '';
  $('billMoT').textContent = '어음 수정';
  $('billDelBtn').style.display = '';
  oMo('billMo');
}

function saveBill(){
  var cli = $('billCli').value.trim();
  var amt = +$('billAmt').value;
  var dueDt = $('billDueDt').value;
  if(!cli){toast('거래처 입력','err');return}
  if(!amt){toast('금액 입력','err');return}
  if(!dueDt){toast('만기일 입력','err');return}

  var id = $('billId').value || gid();
  var rec = {
    id: id,
    kind: $('billKind').value,
    billNo: $('billNo').value.trim(),
    cli: cli,
    amt: amt,
    issueDt: $('billIssueDt').value,
    dueDt: dueDt,
    bank: $('billBank').value.trim(),
    status: $('billStatus').value,
    note: $('billNote').value,
    cat: nw()
  };
  var bills = DB.g('bills') || [];
  var idx = bills.findIndex(function(x){return x.id===id});
  if(idx >= 0) bills[idx] = rec;
  else bills.push(rec);
  DB.s('bills', bills);

  // 변경이력 기록
  var cl = DB.g('changeLog') || [];
  cl.push({
    id: gid(), dt: td(), tm: nw(),
    type: idx>=0 ? '어음수정' : '어음등록',
    target: 'BILL:' + (rec.billNo || rec.id),
    memo: rec.cli + ' ' + fmt(rec.amt) + '원 만기 ' + rec.dueDt,
    by: CU ? CU.nm : ''
  });
  DB.s('changeLog', cl);

  cMo('billMo');
  rBill();
  toast('저장 완료','ok');
}

function deleteBill(){
  var id = $('billId').value;
  if(!id || !confirm('이 어음을 삭제합니다. 계속?')) return;
  var bills = DB.g('bills') || [];
  DB.s('bills', bills.filter(function(x){return x.id!==id}));
  cMo('billMo');
  rBill();
  toast('삭제 완료','ok');
}

/* =======================================================
   통장 관리 (얼마에요 BankBook 패턴)
   ======================================================= */

function _bankAccList(){return DB.g('bankAccounts') || []}
function _bankTxnList(){return DB.g('bankTxns') || []}

function _fillBankAccSelects(){
  var accs = _bankAccList();
  var html1 = '<option value="">-- 계좌 선택 --</option>';
  var html2 = '';
  accs.forEach(function(a){
    var label = (a.bank||'') + ' ' + (a.accNo||'') + (a.nm?' ('+a.nm+')':'');
    html1 += '<option value="'+a.id+'">'+label+'</option>';
    html2 += '<option value="'+a.id+'">'+label+'</option>';
  });
  if($('bankAccSel')){var p = $('bankAccSel').value; $('bankAccSel').innerHTML = html1; $('bankAccSel').value = p}
  if($('bankTxnAcc')){var p2 = $('bankTxnAcc').value; $('bankTxnAcc').innerHTML = html2; $('bankTxnAcc').value = p2}
}

function rBank(){
  _fillBankAccSelects();
  rBankTxn();
}
window.rBank = rBank;

function rBankTxn(){
  var accs = _bankAccList();
  var txns = _bankTxnList();
  var accId = $('bankAccSel').value;

  // 잔액 계산
  var balanceMap = {};
  accs.forEach(function(a){balanceMap[a.id] = +a.balance||0});
  txns.slice().sort(function(a,b){return (a.dt||'') > (b.dt||'') ? 1 : -1}).forEach(function(t){
    if(!balanceMap[t.accId]) balanceMap[t.accId] = 0;
    if(t.kind === 'in') balanceMap[t.accId] += +t.amt||0;
    else balanceMap[t.accId] -= +t.amt||0;
  });

  // KPI
  var totalBal = Object.values(balanceMap).reduce(function(s,v){return s+v},0);
  var accCnt = accs.length;
  var td = new Date().toISOString().slice(0,10);
  var todayIn = txns.filter(function(t){return t.dt===td && t.kind==='in'}).reduce(function(s,t){return s+(+t.amt||0)},0);
  var todayOut = txns.filter(function(t){return t.dt===td && t.kind==='out'}).reduce(function(s,t){return s+(+t.amt||0)},0);

  $('bankSummary').innerHTML =
      '<div class="sb blue"><div class="l">총 잔액</div><div class="v">'+fmt(totalBal)+'</div></div>'
    + '<div class="sb purple"><div class="l">계좌 수</div><div class="v">'+accCnt+'</div></div>'
    + '<div class="sb green"><div class="l">오늘 입금</div><div class="v">'+fmt(todayIn)+'</div></div>'
    + '<div class="sb orange"><div class="l">오늘 출금</div><div class="v">'+fmt(todayOut)+'</div></div>';

  // 계좌 목록 or 거래내역
  var h = '';
  if(!accId){
    // 계좌 목록
    h += '<div style="font-size:13px;font-weight:700;margin-bottom:8px">📋 등록된 계좌</div>';
    if(accs.length === 0){
      h += '<div style="padding:30px;text-align:center;color:var(--txt3)">등록된 계좌가 없습니다. "+ 계좌 등록" 버튼을 눌러주세요.</div>';
    } else {
      h += '<div class="u-scroll-x"><table class="dt" style="font-size:12px"><thead><tr>';
      h += '<th>은행</th><th>계좌번호</th><th>별칭</th><th>예금주</th><th>용도</th><th>회사</th><th>잔액</th><th>관리</th>';
      h += '</tr></thead><tbody>';
      var purposeMap = {main:'운영', vat:'부가세', salary:'급여', saving:'적립', other:'기타'};
      var coMap = {A:'개인', B:'법인', '':'공용'};
      accs.forEach(function(a){
        h += '<tr>';
        h += '<td style="font-weight:700">'+(a.bank||'-')+'</td>';
        h += '<td style="font-family:monospace">'+(a.accNo||'-')+'</td>';
        h += '<td>'+(a.nm||'-')+'</td>';
        h += '<td>'+(a.holder||'-')+'</td>';
        h += '<td><span class="bd">'+(purposeMap[a.purpose]||a.purpose||'-')+'</span></td>';
        h += '<td>'+(coMap[a.company||'']||'-')+'</td>';
        h += '<td style="text-align:right;font-weight:700">'+fmt(balanceMap[a.id]||0)+'</td>';
        h += '<td><button class="btn btn-sm btn-o" onclick="editBankAcc(\''+a.id+'\')">수정</button> <button class="btn btn-sm btn-p" onclick="viewBankAcc(\''+a.id+'\')">내역</button></td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }
  } else {
    // 선택된 계좌의 거래 내역
    var acc = accs.find(function(a){return a.id===accId});
    if(!acc){h = '계좌 없음';$('bankTxnArea').innerHTML=h;return}
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    h += '<div><span style="font-size:14px;font-weight:700">'+(acc.bank||'')+' '+(acc.accNo||'')+'</span>';
    if(acc.nm) h += ' <span style="color:var(--txt3);font-size:12px">('+acc.nm+')</span>';
    h += '</div>';
    h += '<div style="font-size:16px;font-weight:700;color:'+(balanceMap[accId]>=0?'#1E40AF':'#DC2626')+'">잔액: '+fmt(balanceMap[accId]||0)+'</div>';
    h += '</div>';

    var accTxns = txns.filter(function(t){return t.accId===accId}).sort(function(a,b){return (b.dt||'') > (a.dt||'') ? 1 : -1});

    // 누적 잔액 계산
    var cumulative = (+acc.balance||0);
    var sortedAsc = accTxns.slice().reverse();
    var balMap = {};
    sortedAsc.forEach(function(t){
      if(t.kind==='in') cumulative += +t.amt||0;
      else cumulative -= +t.amt||0;
      balMap[t.id] = cumulative;
    });

    h += '<div class="u-scroll-x"><table class="dt" style="font-size:12px"><thead><tr>';
    h += '<th>일자</th><th>구분</th><th>거래처</th><th>적요</th><th>금액</th><th>잔액</th><th>관리</th>';
    h += '</tr></thead><tbody>';
    accTxns.forEach(function(t){
      var kindLbl = t.kind==='in' ? '<span class="bd bd-s">입금</span>' : '<span class="bd bd-d">출금</span>';
      var amtColor = t.kind==='in' ? '#16A34A' : '#DC2626';
      h += '<tr>';
      h += '<td>'+(t.dt||'-')+'</td>';
      h += '<td>'+kindLbl+'</td>';
      h += '<td>'+(t.cli||'-')+'</td>';
      h += '<td>'+(t.memo||'-')+'</td>';
      h += '<td style="text-align:right;font-weight:700;color:'+amtColor+'">'+(t.kind==='in'?'+':'-')+fmt(t.amt||0)+'</td>';
      h += '<td style="text-align:right">'+fmt(balMap[t.id]||0)+'</td>';
      h += '<td><button class="btn btn-sm btn-o" onclick="editBankTxn(\''+t.id+'\')">수정</button></td>';
      h += '</tr>';
    });
    if(accTxns.length === 0) h += '<tr><td colspan="7" class="empty-cell">거래 내역이 없습니다</td></tr>';
    h += '</tbody></table></div>';
  }
  $('bankTxnArea').innerHTML = h;
}
window.renderBankTxn = rBankTxn;

function openBankAccM(){
  ['bankAccId','bankAccNo','bankAccNm','bankAccHolder','bankAccNote'].forEach(function(k){if($(k))$(k).value=''});
  $('bankAccBank').value = '국민은행';
  $('bankAccPurpose').value = 'main';
  $('bankAccCompany').value = '';
  $('bankAccBalance').value = 0;
  $('bankAccMoT').textContent = '계좌 등록';
  $('bankAccDelBtn').style.display = 'none';
  oMo('bankAccMo');
}

function editBankAcc(id){
  var a = _bankAccList().find(function(x){return x.id===id});
  if(!a){toast('계좌 없음','err');return}
  $('bankAccId').value = a.id;
  $('bankAccBank').value = a.bank || '국민은행';
  $('bankAccNo').value = a.accNo || '';
  $('bankAccNm').value = a.nm || '';
  $('bankAccHolder').value = a.holder || '';
  $('bankAccPurpose').value = a.purpose || 'main';
  $('bankAccCompany').value = a.company || '';
  $('bankAccBalance').value = a.balance || 0;
  $('bankAccNote').value = a.note || '';
  $('bankAccMoT').textContent = '계좌 수정';
  $('bankAccDelBtn').style.display = '';
  oMo('bankAccMo');
}

function saveBankAcc(){
  var accNo = $('bankAccNo').value.trim();
  if(!accNo){toast('계좌번호 입력','err');return}
  var id = $('bankAccId').value || gid();
  var rec = {
    id: id,
    bank: $('bankAccBank').value,
    accNo: accNo,
    nm: $('bankAccNm').value.trim(),
    holder: $('bankAccHolder').value.trim(),
    purpose: $('bankAccPurpose').value,
    company: $('bankAccCompany').value,
    balance: +$('bankAccBalance').value || 0,
    note: $('bankAccNote').value,
    cat: nw()
  };
  var accs = _bankAccList();
  var idx = accs.findIndex(function(x){return x.id===id});
  if(idx >= 0) accs[idx] = rec;
  else accs.push(rec);
  DB.s('bankAccounts', accs);
  cMo('bankAccMo');
  rBank();
  toast('저장 완료','ok');
}

function deleteBankAcc(){
  var id = $('bankAccId').value;
  if(!id) return;
  var txnCnt = _bankTxnList().filter(function(t){return t.accId===id}).length;
  if(txnCnt > 0){
    if(!confirm('이 계좌에 '+txnCnt+'건의 거래 내역이 있습니다. 계좌와 모든 거래를 삭제합니다. 계속?')) return;
    DB.s('bankTxns', _bankTxnList().filter(function(t){return t.accId !== id}));
  } else {
    if(!confirm('계좌 삭제?')) return;
  }
  DB.s('bankAccounts', _bankAccList().filter(function(x){return x.id !== id}));
  cMo('bankAccMo');
  rBank();
  toast('삭제 완료','ok');
}

function viewBankAcc(id){
  $('bankAccSel').value = id;
  rBankTxn();
}

function openBankTxnM(){
  ['bankTxnId','bankTxnAmt','bankTxnCli','bankTxnMemo','bankTxnNote'].forEach(function(k){if($(k))$(k).value=''});
  _fillBankAccSelects();
  var sel = $('bankAccSel').value;
  if(sel) $('bankTxnAcc').value = sel;
  $('bankTxnKind').value = 'in';
  $('bankTxnDt').value = td();
  $('bankTxnMoT').textContent = '거래 등록';
  $('bankTxnDelBtn').style.display = 'none';
  oMo('bankTxnMo');
}

function editBankTxn(id){
  var t = _bankTxnList().find(function(x){return x.id===id});
  if(!t) return;
  _fillBankAccSelects();
  $('bankTxnId').value = t.id;
  $('bankTxnAcc').value = t.accId;
  $('bankTxnKind').value = t.kind;
  $('bankTxnDt').value = t.dt;
  $('bankTxnAmt').value = t.amt;
  $('bankTxnCli').value = t.cli || '';
  $('bankTxnMemo').value = t.memo || '';
  $('bankTxnNote').value = t.note || '';
  $('bankTxnMoT').textContent = '거래 수정';
  $('bankTxnDelBtn').style.display = '';
  oMo('bankTxnMo');
}

function saveBankTxn(){
  var accId = $('bankTxnAcc').value;
  var amt = +$('bankTxnAmt').value;
  if(!accId){toast('계좌 선택','err');return}
  if(!amt){toast('금액 입력','err');return}
  var id = $('bankTxnId').value || gid();
  var rec = {
    id: id,
    accId: accId,
    kind: $('bankTxnKind').value,
    dt: $('bankTxnDt').value,
    amt: amt,
    cli: $('bankTxnCli').value.trim(),
    memo: $('bankTxnMemo').value.trim(),
    note: $('bankTxnNote').value,
    cat: nw()
  };
  var txns = _bankTxnList();
  var idx = txns.findIndex(function(x){return x.id===id});
  if(idx >= 0) txns[idx] = rec;
  else txns.push(rec);
  DB.s('bankTxns', txns);
  cMo('bankTxnMo');
  rBankTxn();
  toast('저장 완료','ok');
}

function deleteBankTxn(){
  var id = $('bankTxnId').value;
  if(!id || !confirm('삭제?')) return;
  DB.s('bankTxns', _bankTxnList().filter(function(x){return x.id !== id}));
  cMo('bankTxnMo');
  rBankTxn();
  toast('삭제 완료','ok');
}

/* =======================================================
   지출결의서 + 원천세 (얼마에요 ExpenseSlip / WithholdingTax)
   ======================================================= */

function calcExpWithholding(){
  var checked = $('expWithhold').checked;
  var amt = +$('expAmt').value || 0;
  if(!checked){
    $('expWhIncomeTax').value = 0;
    $('expWhResTax').value = 0;
    $('expNetAmt').value = fmt(amt) + '원';
    return;
  }
  var rateStr = $('expWhRate').value;
  // 사업소득 3.3% = 소득세 3% + 주민세 0.3%
  // 기타소득 8.8% = 소득세 8% + 주민세 0.8%
  var incomeRate = 0, resRate = 0;
  if(rateStr === '3.3'){ incomeRate = 0.03; resRate = 0.003; }
  else if(rateStr === '8.8'){ incomeRate = 0.08; resRate = 0.008; }

  var incomeTax = Math.floor(amt * incomeRate);
  var resTax = Math.floor(amt * resRate);
  var net = amt - incomeTax - resTax;

  $('expWhIncomeTax').value = incomeTax;
  $('expWhResTax').value = resTax;
  $('expNetAmt').value = fmt(net) + '원';
}

function rExpense(){
  var list = DB.g('expenses') || [];
  var statusFilter = $('expStatus') ? $('expStatus').value : '';
  var monthFilter = $('expMonth') ? $('expMonth').value : '';

  var filtered = list.filter(function(r){
    if(statusFilter && r.status !== statusFilter) return false;
    if(monthFilter && (!r.dt || r.dt.slice(0,7) !== monthFilter)) return false;
    return true;
  }).sort(function(a,b){return (b.dt||'') > (a.dt||'') ? 1 : -1});

  // KPI
  var total = filtered.reduce(function(s,r){return s+(+r.amt||0)},0);
  var whTotal = filtered.reduce(function(s,r){return s+(+r.whIncomeTax||0)+(+r.whResTax||0)},0);
  var pending = filtered.filter(function(r){return r.status === 'pending'}).length;
  var approved = filtered.filter(function(r){return r.status === 'approved' || r.status === 'paid'}).length;

  $('expSummary').innerHTML =
      '<div class="sb blue"><div class="l">총 지출</div><div class="v">'+fmt(total)+'</div></div>'
    + '<div class="sb orange"><div class="l">원천징수</div><div class="v">'+fmt(whTotal)+'</div></div>'
    + '<div class="sb red"><div class="l">승인 대기</div><div class="v">'+pending+'</div></div>'
    + '<div class="sb green"><div class="l">승인/지급</div><div class="v">'+approved+'</div></div>';

  var statusMap = {draft:'작성중', pending:'승인대기', approved:'승인', rejected:'반려', paid:'지급완료'};
  var statusColor = {draft:'#6B7280', pending:'#F59E0B', approved:'#10B981', rejected:'#DC2626', paid:'#2563EB'};
  var payMap = {cash:'현금', card:'카드', bank:'계좌이체', petty:'소액현금'};
  var evidenceMap = {card:'카드전표', cash:'현금영수증', tax:'세금계산서', simple:'간이영수증', internal:'내부증빙'};

  var h = '<div class="u-scroll-x"><table class="dt" style="font-size:12px"><thead><tr>';
  h += '<th>일자</th><th>계정과목</th><th>지급처</th><th>금액</th><th>원천세</th><th>실지급</th><th>결제</th><th>증빙</th><th>상태</th><th>관리</th>';
  h += '</tr></thead><tbody>';
  filtered.forEach(function(r){
    var wh = (+r.whIncomeTax||0) + (+r.whResTax||0);
    var net = (+r.amt||0) - wh;
    var statusLbl = '<span class="bd" style="background:'+(statusColor[r.status]||'#999')+'22;color:'+(statusColor[r.status]||'#999')+'">'+(statusMap[r.status]||r.status||'-')+'</span>';
    h += '<tr>';
    h += '<td>'+(r.dt||'-')+'</td>';
    h += '<td style="font-weight:700">'+(r.category||'-')+'</td>';
    h += '<td>'+(r.vendor||'-')+'</td>';
    h += '<td style="text-align:right">'+fmt(r.amt||0)+'</td>';
    h += '<td style="text-align:right;color:#DC2626">'+(wh>0?fmt(wh):'-')+'</td>';
    h += '<td style="text-align:right;font-weight:700">'+fmt(net)+'</td>';
    h += '<td>'+(payMap[r.payment]||r.payment||'-')+'</td>';
    h += '<td>'+(evidenceMap[r.evidence]||r.evidence||'-')+'</td>';
    h += '<td>'+statusLbl+'</td>';
    h += '<td><button class="btn btn-sm btn-o" onclick="editExpense(\''+r.id+'\')">수정</button></td>';
    h += '</tr>';
  });
  if(filtered.length === 0) h += '<tr><td colspan="10" class="empty-cell">등록된 지출결의서가 없습니다</td></tr>';
  h += '</tbody></table></div>';
  $('expArea').innerHTML = h;
}
window.rExpense = rExpense;

function openExpM(){
  ['expId','expAmt','expVendor','expDesc'].forEach(function(k){if($(k))$(k).value=''});
  $('expDt').value = td();
  $('expWriter').value = (CU && CU.nm) || '관리자';
  $('expCategory').value = '소모품비';
  $('expPayment').value = 'card';
  $('expWithhold').checked = false;
  $('expWhRate').value = '3.3';
  $('expEvidence').value = '';
  $('expStatusSel').value = 'draft';
  $('expMoT').textContent = '지출결의서 작성';
  $('expDelBtn').style.display = 'none';
  calcExpWithholding();
  oMo('expMo');
}

function editExpense(id){
  var r = (DB.g('expenses')||[]).find(function(x){return x.id===id});
  if(!r) return;
  $('expId').value = r.id;
  $('expDt').value = r.dt;
  $('expWriter').value = r.writer || '';
  $('expCategory').value = r.category || '소모품비';
  $('expVendor').value = r.vendor || '';
  $('expAmt').value = r.amt || 0;
  $('expPayment').value = r.payment || 'card';
  $('expWithhold').checked = !!r.withhold;
  $('expWhRate').value = r.whRate || '3.3';
  $('expDesc').value = r.desc || '';
  $('expEvidence').value = r.evidence || '';
  $('expStatusSel').value = r.status || 'draft';
  $('expMoT').textContent = '지출결의서 수정';
  $('expDelBtn').style.display = '';
  calcExpWithholding();
  oMo('expMo');
}

function saveExpense(){
  var amt = +$('expAmt').value;
  var vendor = $('expVendor').value.trim();
  if(!amt){toast('금액 입력','err');return}

  var id = $('expId').value || gid();
  var rec = {
    id: id,
    dt: $('expDt').value,
    writer: $('expWriter').value,
    category: $('expCategory').value,
    vendor: vendor,
    amt: amt,
    payment: $('expPayment').value,
    withhold: $('expWithhold').checked,
    whRate: $('expWhRate').value,
    whIncomeTax: +$('expWhIncomeTax').value || 0,
    whResTax: +$('expWhResTax').value || 0,
    desc: $('expDesc').value,
    evidence: $('expEvidence').value,
    status: $('expStatusSel').value,
    cat: nw()
  };
  var list = DB.g('expenses') || [];
  var idx = list.findIndex(function(x){return x.id===id});
  if(idx >= 0) list[idx] = rec;
  else list.push(rec);
  DB.s('expenses', list);
  cMo('expMo');
  rExpense();
  toast('저장 완료','ok');
}

function deleteExpense(){
  var id = $('expId').value;
  if(!id || !confirm('결의서 삭제?')) return;
  DB.s('expenses', (DB.g('expenses')||[]).filter(function(x){return x.id !== id}));
  cMo('expMo');
  rExpense();
  toast('삭제 완료','ok');
}

function printExpense(){
  var r = {
    dt: $('expDt').value,
    writer: $('expWriter').value,
    category: $('expCategory').value,
    vendor: $('expVendor').value,
    amt: +$('expAmt').value || 0,
    payment: $('expPayment').value,
    desc: $('expDesc').value,
    evidence: $('expEvidence').value,
    whIncomeTax: +$('expWhIncomeTax').value || 0,
    whResTax: +$('expWhResTax').value || 0
  };
  var co = DB.g1('co') || {nm:'팩플로우'};
  var payMap = {cash:'현금', card:'카드', bank:'계좌이체', petty:'소액현금'};
  var evidenceMap = {card:'신용카드 매출전표', cash:'현금영수증', tax:'세금계산서', simple:'간이영수증', internal:'내부증빙'};
  var net = r.amt - r.whIncomeTax - r.whResTax;

  var w = window.open('', '_blank', 'width=800,height=1000');
  w.document.write('<html><head><meta charset="UTF-8"><title>지출결의서</title>');
  w.document.write('<style>body{font-family:"Malgun Gothic",sans-serif;padding:20mm;font-size:12px}');
  w.document.write('.t{text-align:center;font-size:24px;font-weight:900;letter-spacing:20px;margin-bottom:20px}');
  w.document.write('.co{text-align:right;font-size:13px;margin-bottom:20px}');
  w.document.write('table{width:100%;border-collapse:collapse;margin-bottom:15px}th,td{border:1px solid #000;padding:8px;text-align:left;vertical-align:middle}th{background:#F3F4F6;width:20%}');
  w.document.write('.sign{margin-top:40px;display:flex;justify-content:space-around}.sign div{text-align:center}.sign-box{border:1px solid #000;width:80px;height:80px;margin:8px auto}');
  w.document.write('@media print{@page{size:A4;margin:15mm}}</style></head><body>');
  w.document.write('<div class="t">지 출 결 의 서</div>');
  w.document.write('<div class="co">'+(co.nm||'')+'</div>');
  w.document.write('<table>');
  w.document.write('<tr><th>지출일자</th><td>'+r.dt+'</td><th>작성자</th><td>'+r.writer+'</td></tr>');
  w.document.write('<tr><th>계정과목</th><td>'+r.category+'</td><th>지급처</th><td>'+r.vendor+'</td></tr>');
  w.document.write('<tr><th>금액</th><td>'+fmt(r.amt)+'원</td><th>결제수단</th><td>'+(payMap[r.payment]||r.payment)+'</td></tr>');
  if(r.whIncomeTax > 0){
    w.document.write('<tr><th>원천소득세</th><td>'+fmt(r.whIncomeTax)+'원</td><th>주민세</th><td>'+fmt(r.whResTax)+'원</td></tr>');
    w.document.write('<tr><th>실지급액</th><td colspan="3" style="font-weight:700;font-size:14px">'+fmt(net)+'원</td></tr>');
  }
  w.document.write('<tr><th>증빙</th><td colspan="3">'+(evidenceMap[r.evidence]||r.evidence||'-')+'</td></tr>');
  w.document.write('<tr><th>사용내역</th><td colspan="3" style="height:80px;vertical-align:top">'+(r.desc||'').replace(/\n/g,'<br>')+'</td></tr>');
  w.document.write('</table>');
  w.document.write('<div class="sign">');
  w.document.write('<div>기안<div class="sign-box"></div></div>');
  w.document.write('<div>검토<div class="sign-box"></div></div>');
  w.document.write('<div>승인<div class="sign-box"></div></div>');
  w.document.write('</div>');
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function(){w.print()}, 300);
}
