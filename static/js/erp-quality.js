/* ===== ERP:quality ===== */

/* 품질검사 — defectLog 기반 자동 분석 */
function rQc(){
  // 기간 필터 초기화
  if(!$('qcPrdBar').innerHTML)$('qcPrdBar').innerHTML=periodFilterHTML('qc');
  if(!_prdState['qc']){setPrd('qc','monthly',null);if(!$('qcDtVal').value)$('qcDtVal').value=td().slice(0,7)}
  var all=DB.g('defectLog');
  var mLogs=prdFilterData(all,'qc','dt');
  var totalDf=mLogs.reduce(function(s,d){return s+(d.defect||0)},0);

  // KPI
  if($('qcDfTotal'))$('qcDfTotal').textContent=fmt(totalDf);
  if($('qcDfCnt'))$('qcDfCnt').textContent=mLogs.length+'건';

  // 공정별 불량
  var byProc={};
  mLogs.forEach(function(d){if(!byProc[d.proc])byProc[d.proc]=0;byProc[d.proc]+=d.defect||0});
  var procEntries=Object.entries(byProc).sort(function(a,b){return b[1]-a[1]});
  if($('qcByProc'))$('qcByProc').innerHTML=procEntries.length
    ?procEntries.map(function(e){
      var pct=totalDf>0?Math.round(e[1]/totalDf*100):0;
      return'<div style="margin-bottom:8px">'
        +'<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px"><b>'+e[0]+'</b><span style="color:var(--dan);font-weight:700">'+fmt(e[1])+'매 ('+pct+'%)</span></div>'
        +'<div style="background:var(--bg2);border-radius:4px;height:8px"><div style="background:var(--dan);width:'+pct+'%;height:8px;border-radius:4px;transition:.3s"></div></div>'
        +'</div>';
    }).join('')
    :'<div class="empty-state"><div class="msg">불량 없음</div></div>';

  // 불량 사유 순위
  var byReason={};
  mLogs.forEach(function(d){var r=d.reason||'사유없음';if(!byReason[r])byReason[r]=0;byReason[r]+=d.defect||0});
  var reasonEntries=Object.entries(byReason).sort(function(a,b){return b[1]-a[1]});
  if($('qcByReason'))$('qcByReason').innerHTML=reasonEntries.length
    ?reasonEntries.map(function(e,i){
      var pct=totalDf>0?Math.round(e[1]/totalDf*100):0;
      return'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px">'
        +'<span style="min-width:18px;height:18px;background:'+(i===0?'#EF4444':i===1?'#F59E0B':'#94A3B8')+';color:#fff;border-radius:50%;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center">'+(i+1)+'</span>'
        +'<span style="flex:1">'+e[0]+'</span>'
        +'<span style="font-weight:700;color:var(--dan)">'+fmt(e[1])+'매</span>'
        +'<span style="color:var(--txt3);min-width:32px;text-align:right">'+pct+'%</span>'
        +'</div>';
    }).join('')
    :'<div class="empty-state"><div class="msg">불량 없음</div></div>';

  // 상세 목록
  var sorted=mLogs.slice().sort(function(a,b){return b.dt>a.dt?1:-1});
  if($('qcDfTbl'))$('qcDfTbl').querySelector('tbody').innerHTML=sorted.length
    ?sorted.map(function(d){
      return'<tr>'
        +'<td>'+d.dt+'</td>'
        +'<td style="font-weight:700">'+d.pnm+'</td>'
        +'<td>'+d.cnm+'</td>'
        +'<td><span class="bd bd-o">'+d.proc+'</span></td>'
        +'<td style="text-align:right;color:var(--dan);font-weight:700">'+fmt(d.defect||0)+'</td>'
        +'<td>'+( d.reason||'-')+'</td>'
        +'<td style="color:var(--txt3)">'+( d.worker||'-')+'</td>'
        +'</tr>';
    }).join('')
    :'<tr><td colspan="7" class="empty-cell">불량 없음</td></tr>';
  // 엑셀 내보내기 데이터
  _prdExportData['qc']={headers:['날짜','제품','거래처','공정','불량수량','사유','작업자'],rows:sorted.map(function(d){return[d.dt,d.pnm,d.cnm,d.proc,d.defect||0,d.reason||'',d.worker||'']}),sheetName:'불량현황',fileName:'불량현황'};
}
window._prdCb_qc=rQc;

/* 설비관리 */
function rEq(){const all=DB.g('equip');$('eqCnt').textContent=all.length;$('eqOk').textContent=all.filter(e=>e.st==='정상').length;$('eqWarn').textContent=all.filter(e=>e.st==='점검필요').length;$('eqDown').textContent=all.filter(e=>e.st==='수리중').length;$('eqTbl').querySelector('tbody').innerHTML=all.map(e=>{const stBd=e.st==='정상'?'bd-s':e.st==='점검필요'?'bd-o':'bd-d';return '<tr><td style="font-weight:700">'+e.nm+'</td><td>'+(e.model||'-')+'</td><td>'+e.proc+'</td><td>'+(e.install||'-')+'</td><td>'+(e.lastCheck||'-')+'</td><td>'+(e.nextCheck||'-')+'</td><td><span class="bd '+stBd+'">'+e.st+'</span></td><td><button class="btn btn-sm btn-o" onclick="editEq(\''+e.id+'\')">수정</button> <button class="btn btn-sm btn-d" onclick="dEq(\''+e.id+'\')">삭제</button></td></tr>'}).join('')||'<tr><td colspan="8" class="empty-cell">설비 없음</td></tr>'}
function openEqM(){['eqId','eqNm','eqModel','eqNote'].forEach(x=>$(x).value='');$('eqProc').value='코팅';$('eqInstall').value='';$('eqCycle').value=90;$('eqSt').value='정상';$('eqMoT').textContent='설비 등록';oMo('eqMo')}
function editEq(id){const e=DB.g('equip').find(x=>x.id===id);if(!e)return;$('eqId').value=e.id;$('eqNm').value=e.nm;$('eqModel').value=e.model||'';$('eqProc').value=e.proc;$('eqInstall').value=e.install||'';$('eqCycle').value=e.cycle||90;$('eqSt').value=e.st;$('eqNote').value=e.note||'';$('eqMoT').textContent='수정';oMo('eqMo')}
function saveEq(){const nm=$('eqNm').value.trim();if(!nm){toast('설비명','err');return}const id=$('eqId').value||gid();const cycle=+$('eqCycle').value||90;const rec={id,nm,model:$('eqModel').value,proc:$('eqProc').value,install:$('eqInstall').value,cycle,st:$('eqSt').value,note:$('eqNote').value,lastCheck:'',nextCheck:''};if(rec.install){const d=new Date();rec.nextCheck=new Date(d.getTime()+cycle*864e5).toISOString().slice(0,10)}const ls=DB.g('equip');const idx=ls.findIndex(x=>x.id===id);if(idx>=0){rec.lastCheck=ls[idx].lastCheck;rec.nextCheck=ls[idx].nextCheck;ls[idx]=rec}else ls.push(rec);DB.s('equip',ls);cMo('eqMo');rEq();toast('저장','ok')}
function dEq(id){if(!confirm('삭제?'))return;DB.s('equip',DB.g('equip').filter(x=>x.id!==id));rEq();toast('삭제','ok')}
function openEqLog(){const eqs=DB.g('equip');$('elEq').innerHTML=eqs.map(e=>'<option value="'+e.id+'">'+e.nm+'</option>').join('');$('elDt').value=td();$('elContent').value='';$('elResult').value='정상';oMo('eqLogMo')}
function saveEqLog(){const eqId=$('elEq').value;if(!eqId){toast('설비 선택','err');return}const ls=DB.g('equip');const idx=ls.findIndex(x=>x.id===eqId);if(idx>=0){ls[idx].lastCheck=$('elDt').value;const cycle=ls[idx].cycle||90;ls[idx].nextCheck=new Date(new Date($('elDt').value).getTime()+cycle*864e5).toISOString().slice(0,10);if($('elResult').value==='수리필요')ls[idx].st='수리중';else ls[idx].st='정상';DB.s('equip',ls)}const logs=DB.g('eqLogs');logs.push({id:gid(),eqId,dt:$('elDt').value,content:$('elContent').value,result:$('elResult').value});DB.s('eqLogs',logs);cMo('eqLogMo');rEq();toast('점검 기록','ok')}

/* 견적서 */
function genQtNum(){var d=td().replace(/-/g,'');var c=DB.g('quotes').filter(function(r){return r.num&&r.num.startsWith('QT'+d)}).length;return 'QT'+d+String(c+1).padStart(3,'0')}

function openQtM(){
  $('qtId').value='';$('qtNum').value=genQtNum();$('qtDt').value=td();
  $('qtCli').value='';$('qtProd').value='';$('qtQty').value='';
  $('qtPrice').value='';$('qtContent').value='';$('qtNote').value='';
  $('qtSt').value='작성중';$('qtToWOBtn').style.display='none';
  $('qtMoT').textContent='견적 등록';oMo('qtMo2');
}

function eQt(id){
  var r=DB.g('quotes').find(function(x){return x.id===id});if(!r)return;
  $('qtId').value=r.id;$('qtNum').value=r.num;$('qtDt').value=r.dt;
  $('qtCli').value=r.cli;$('qtProd').value=r.prod||'';
  $('qtQty').value=r.qty||'';$('qtPrice').value=r.price||'';
  $('qtContent').value=r.content||'';$('qtNote').value=r.note||'';
  $('qtSt').value=r.st;$('qtToWOBtn').style.display='inline-block';
  $('qtMoT').textContent='견적 수정';oMo('qtMo2');
}

function saveQt(){
  var cli=$('qtCli').value.trim();var prod=$('qtProd').value.trim();
  if(!cli){toast('거래처를 입력하세요','err');return}
  if(!prod){toast('제품명을 입력하세요','err');return}
  var id=$('qtId').value||gid();
  var rec={id,num:$('qtNum').value,dt:$('qtDt').value,cli,prod,
    qty:+$('qtQty').value||0,price:+$('qtPrice').value||0,
    content:$('qtContent').value,note:$('qtNote').value,st:$('qtSt').value};
  var ls=DB.g('quotes');var idx=ls.findIndex(function(x){return x.id===id});
  if(idx>=0)ls[idx]=rec;else ls.push(rec);
  DB.s('quotes',ls);cMo('qtMo2');rQt();toast('견적 저장','ok');
}

function dQt(id){
  if(!confirm('삭제하시겠습니까?'))return;
  DB.s('quotes',DB.g('quotes').filter(function(x){return x.id!==id}));
  rQt();toast('삭제','ok');
}

function qtToWO(){
  var cli=$('qtCli').value.trim();var prod=$('qtProd').value.trim();
  var qty=$('qtQty').value;var price=$('qtPrice').value;
  if(!cli||!prod){toast('거래처/제품명을 먼저 입력하세요','err');return}
  cMo('qtMo2');
  setTimeout(function(){
    if(typeof resetWO==='function')resetWO();
    setTimeout(function(){
      if($('woCli'))$('woCli').value=cli;
      if($('woProd'))$('woProd').value=prod;
      if($('woFQ'))$('woFQ').value=qty;
      if($('woPrice'))$('woPrice').value=price;
      if(typeof checkProcWarn==='function')checkProcWarn();
      if(typeof openWOForm==='function')openWOForm();
      toast('거래처·제품·수량 자동 입력됐어요. 나머지 확인 후 저장하세요.','ok');
    },100);
  },300);
}

function qtToWODirect(id){
  var r=DB.g('quotes').find(function(x){return x.id===id});if(!r)return;
  eQt(id);
  setTimeout(function(){qtToWO()},400);
}

function rQt(){
  var mo=$('qtMo').value||td().slice(0,7);
  if(!$('qtMo').value)$('qtMo').value=mo;
  var all=DB.g('quotes');
  var fl=all.filter(function(r){return r.dt&&r.dt.startsWith(mo)}).sort(function(a,b){return b.dt>a.dt?1:-1});
  var ma=all.filter(function(r){return r.dt&&r.dt.startsWith(td().slice(0,7))});
  $('qtCnt').textContent=ma.length;
  $('qtAmt').textContent=fmt(ma.reduce(function(s,r){return s+(r.price||0)},0))+'원';
  $('qtWon').textContent=ma.filter(function(r){return r.st==='수주'}).length;
  var stColor={작성중:'#94A3B8',발송:'#3182F6',수주:'#10B981',실주:'#EF4444'};
  $('qtTbl').querySelector('tbody').innerHTML=fl.length?fl.map(function(r){
    var c=stColor[r.st]||'#94A3B8';
    return '<tr>'
      +'<td style="font-weight:700">'+r.num+'</td>'
      +'<td>'+r.dt+'</td>'
      +'<td style="font-weight:700">'+r.cli+'</td>'
      +'<td>'+(r.prod||'-')+'</td>'
      +'<td style="text-align:right">'+(r.price?fmt(r.price)+'원':'-')+'</td>'
      +'<td><span class="bd" style="background:'+c+'20;color:'+c+';border-color:'+c+'40">'+r.st+'</span></td>'
      +'<td style="display:flex;gap:4px;flex-wrap:wrap">'
      +'<button class="btn btn-s btn-sm" onclick="eQt(\''+r.id+'\')">보기/수정</button>'
      +'<button class="btn btn-sm" style="background:#EFF6FF;color:#3182F6;border:1px solid #BFDBFE" onclick="qtToWODirect(\''+r.id+'\')">→작업지시</button>'
      +'<button class="btn btn-sm btn-p" onclick="printQuote(\''+r.id+'\')">인쇄</button>'
      +'<button class="btn btn-sm" style="color:var(--dan)" onclick="dQt(\''+r.id+'\')">삭제</button>'
      +'</td></tr>';
  }).join(''):'<tr><td colspan="7" class="empty-cell">견적 내역이 없습니다</td></tr>';
}

/* 전자결재 */
function rAp(){
  var stFilter=$('apFilter').value;
  var typeFilter=$('apTypeFilter')?$('apTypeFilter').value:'';
  var all=DB.g('approvals');
  var fl=all;
  if(stFilter)fl=fl.filter(function(r){return r.st===stFilter});
  if(typeFilter)fl=fl.filter(function(r){return r.type===typeFilter});
  $('apPend').textContent=all.filter(function(r){return r.st==='대기'}).length;
  var progEl=$('apProg');if(progEl)progEl.textContent=all.filter(function(r){return r.st==='진행중'}).length;
  $('apOk').textContent=all.filter(function(r){return r.st==='승인'}).length;
  $('apRej').textContent=all.filter(function(r){return r.st==='반려'}).length;
  var myEl=$('apMyCount');
  if(myEl&&CU){var myPend=all.filter(function(r){return r.st==='대기'&&(r.approver===CU.nm||!r.approver)}).length;myEl.textContent=myPend?'내 결재대기: '+myPend+'건':''}
  $('apTbl').querySelector('tbody').innerHTML=fl.sort(function(a,b){return b.dt>a.dt?1:-1}).map(function(r){
    var stBd=r.st==='승인'?'bd-s':r.st==='반려'?'bd-d':r.st==='진행중'?'bd-o':'bd-o';
    var urgTag=r.urgent?'<span style="color:#EF4444;font-weight:700;margin-right:4px">[긴급]</span>':'';
    var acts='';
    if(r.st==='대기'||r.st==='진행중'){
      acts='<button class="btn btn-sm btn-s" onclick="apActionMo(\''+r.id+'\',\'승인\')">승인</button> <button class="btn btn-sm btn-d" onclick="apActionMo(\''+r.id+'\',\'반려\')">반려</button> ';
    }
    acts+='<button class="btn btn-sm btn-o" onclick="eAp(\''+r.id+'\')">상세</button>';
    if(r.st==='대기')acts+=' <button class="btn btn-sm btn-d" onclick="dAp(\''+r.id+'\')">삭제</button>';
    return '<tr><td>'+r.dt+'</td><td>'+r.type+'</td><td style="font-weight:700">'+urgTag+r.title+'</td><td>'+r.req+'</td><td>'+(r.approver||'관리자')+'</td><td style="text-align:right">'+(r.amt?fmt(r.amt)+'원':'-')+'</td><td><span class="bd '+stBd+'">'+r.st+'</span></td><td>'+acts+'</td></tr>';
  }).join('')||'<tr><td colspan="8" class="empty-cell">내역 없음</td></tr>';
}
function _fillApproverSelect(){
  var sel=$('apApprover');if(!sel)return;
  var users=DB.g('users');
  sel.innerHTML='<option value="">관리자</option>';
  users.forEach(function(u){if(u.role==='admin'||u.role==='office')sel.innerHTML+='<option value="'+u.nm+'">'+u.nm+'</option>'});
}
function openApM(){
  ['apId','apTitle','apAmt','apContent'].forEach(function(x){$(x).value=''});
  $('apReq').value=CU?CU.nm:'';
  $('apType').value='발주서';$('apDt').value=td();$('apSt').value='대기';
  var urg=$('apUrgent');if(urg)urg.value='';
  $('apMoT').textContent='결재 요청';
  $('apHistoryWrap').style.display='none';
  $('apCommentWrap').style.display='none';
  _fillApproverSelect();
  oMo('apMo');
}
function eAp(id){
  var r=DB.g('approvals').find(function(x){return x.id===id});if(!r)return;
  $('apId').value=r.id;$('apType').value=r.type;$('apDt').value=r.dt;
  $('apTitle').value=r.title;$('apReq').value=r.req;$('apAmt').value=r.amt||'';
  $('apContent').value=r.content||'';$('apSt').value=r.st;
  var urg=$('apUrgent');if(urg)urg.value=r.urgent||'';
  _fillApproverSelect();
  var apSel=$('apApprover');if(apSel)apSel.value=r.approver||'';
  $('apMoT').textContent=r.st==='대기'?'결재 수정':'결재 상세';
  // 이력 표시
  var hw=$('apHistoryWrap'),hd=$('apHistory');
  if(r.history&&r.history.length){
    hw.style.display='block';
    hd.innerHTML=r.history.map(function(h){return '<div style="padding:4px 0;border-bottom:1px solid var(--bdr)"><span style="color:var(--pri);font-weight:700">'+h.who+'</span> <span class="bd '+(h.action==='승인'?'bd-s':'bd-d')+'">'+h.action+'</span> <span style="color:var(--txt3)">'+h.dt+'</span>'+(h.comment?'<div style="margin-top:2px;color:var(--txt2)">'+h.comment+'</div>':'')+'</div>'}).join('');
  }else{hw.style.display='none'}
  $('apCommentWrap').style.display='none';
  oMo('apMo');
}
function saveAp(){
  var title=$('apTitle').value.trim();if(!title){toast('제목을 입력하세요','err');return}
  var id=$('apId').value||gid();
  var rec={id:id,type:$('apType').value,dt:$('apDt').value,title:title,req:$('apReq').value,
    approver:$('apApprover')?$('apApprover').value:'',
    amt:+$('apAmt').value||0,content:$('apContent').value,st:$('apSt').value,
    urgent:$('apUrgent')?$('apUrgent').value:''};
  var ls=DB.g('approvals');var idx=ls.findIndex(function(x){return x.id===id});
  if(idx>=0){rec.history=ls[idx].history||[];ls[idx]=rec}else{rec.history=[];ls.push(rec)}
  DB.s('approvals',ls);cMo('apMo');rAp();toast('저장','ok');
}
function apActionMo(id,action){
  $('apCommentWrap').style.display='block';
  $('apComment').value='';
  $('apComment').placeholder=action==='승인'?'승인 코멘트 (선택)':'반려 사유를 입력하세요';
  // Show confirmation dialog
  var ok=action==='반려'?prompt(action+' 사유를 입력하세요:',''):confirm(action+' 처리하시겠습니까?');
  if(ok===null)return;
  var comment=typeof ok==='string'?ok:'';
  var ls=DB.g('approvals');var idx=ls.findIndex(function(x){return x.id===id});
  if(idx>=0){
    ls[idx].st=action;
    if(!ls[idx].history)ls[idx].history=[];
    ls[idx].history.push({who:CU?CU.nm:'관리자',action:action,dt:td()+' '+new Date().toTimeString().substring(0,5),comment:comment});
    DB.s('approvals',ls);rAp();toast(action+' 처리 완료','ok');
  }
}
function dAp(id){if(!confirm('삭제하시겠습니까?'))return;DB.s('approvals',DB.g('approvals').filter(function(x){return x.id!==id}));rAp();toast('삭제','ok')}

/* ===== [NEW] 1. 현재위치 추적 시스템 ===== */

/* ===== [NEW] 2. 외주 입고확인/검수 프로세스 ===== */
function completeInspect(woId,procIdx,result){
  var os=DB.g('wo');var wi=os.findIndex(function(x){return x.id===woId});
  if(wi<0)return;var wo=os[wi];var p=wo.procs[procIdx];
  var qty=+($('inspQty')?$('inspQty').value:0);
  var def=+($('inspDef')?$('inspDef').value:0);
  var note=$('inspNote')?$('inspNote').value:'';
  p.inspQty=qty;p.inspDef=def;p.inspNote=note;
  if(result==='pass'){
    p.st='완료';p.t2=td()+' '+new Date().toTimeString().slice(0,5);
    p.qty=qty;
    addLog('검수합격: '+wo.pnm+' '+p.nm+' (불량:'+def+')');
    moveToNextProc(wo);
  }else{
    p.st='보류';p.holdReason='검수불합격: '+note;
    addLog('검수불합격: '+wo.pnm+' '+p.nm);
  }
  os[wi]=wo;DB.s('wo',os);
  if(document.getElementById('inspectMo'))cMo('inspectMo');
  toast(result==='pass'?'검수 합격':'검수 불합격 - 보류 처리',result==='pass'?'ok':'err');
  if(typeof rDash==='function')rDash();
}

/* ===== [NEW] 3. 보류/재작업 상태 관리 ===== */

/* ===== [NEW] 4. 공정 스킵 로직 ===== */
function moveToNextProc(wo){
  var ci=-1;
  for(var i=0;i<wo.procs.length;i++){
    if(wo.procs[i].st!=='완료'&&wo.procs[i].st!=='외주완료'&&wo.procs[i].st!=='스킵'){ci=i;break}
  }
  if(ci<0){wo.status='완료';addLog('전공정 완료: '+wo.pnm);return}
  var np=wo.procs[ci];
  if(np.tp==='skip'||np.mt==='없음'||np.mt==='스킵'){
    np.st='스킵';np.t1=td();np.t2=td();
    addLog('공정 스킵: '+wo.pnm+' '+np.nm);
    moveToNextProc(wo);
    return;
  }
  if(np.tp==='out'||np.tp==='exc'){
    np.st='외주진행중';
    wo.status='진행중';
    addLog('외주 이동: '+wo.pnm+' '+np.nm+' → '+(np.vd||'외주처'));
  }else{
    np.st='대기';
    wo.status='진행중';
  }
}

/* ===== [NEW] 5. LOT 분할 기능 ===== */

/* ===== [NEW] 6. 수주 관리 ===== */

/* ===== [NEW] 7. 자재 직송/이동 추적 ===== */

/* ===== [NEW] 8. 출고→매출 자동 연계 ===== */
/* ===== badge 함수 통합 (원본 덮어쓰기) ===== */

/* 현재위치는 rDash의 작업지시 테이블에서 이미 표시됨 */

/* ===== 모든 모달에 닫기 버튼 자동 추가 ===== */
document.addEventListener('DOMContentLoaded',function(){
  // Initialize DB from server (async, non-blocking)
  DB.init().then(function(){if(typeof refreshLoginUsers==='function')refreshLoginUsers()}).catch(function(e){console.warn('DB init error:',e)});
  // mo-t (ERP 모달 헤더)에 × 버튼이 없으면 추가
  document.querySelectorAll('.mo-t').forEach(function(el){
    if(el.querySelector('.mo-x')||el.querySelector('button'))return;
    var moParent=el.closest('.mo-bg')||el.closest('.mo-ov')||el.closest('[id$="Mo"]')||el.closest('.mo');
    if(!moParent)return;
    var moId=moParent.id;
    if(!moId)return;
    var btn=document.createElement('button');
    btn.className='mo-x';
    btn.innerHTML='×';
    btn.style.cssText='float:right;background:none;border:none;font-size:22px;cursor:pointer;color:var(--txt2);padding:0 4px;border-radius:4px;line-height:1';
    btn.onmouseover=function(){this.style.color='var(--dan)';this.style.background='var(--dan-l)'};
    btn.onmouseout=function(){this.style.color='var(--txt2)';this.style.background='none'};
    btn.onclick=function(){cMo(moId)};
    el.appendChild(btn);
  });
  // mh (MES 모달 헤더)에 mc 버튼 없으면 추가
  document.querySelectorAll('.mh').forEach(function(el){
    if(el.querySelector('.mc'))return;
    var moParent=el.closest('[id$="Mo"]');
    if(!moParent)return;
    var moId=moParent.id;
    var btn=document.createElement('button');
    btn.className='mc';
    btn.innerHTML='×';
    btn.onclick=function(){cMo(moId)};
    el.appendChild(btn);
  });
  // mo-bg 배경 클릭으로 닫기 (woFormOv 제외 — 작업지시서 폼은 실수 닫힘 방지)
  document.querySelectorAll('.mo-bg,.mo-ov').forEach(function(el){
    if(!el.id)return;
    if(el.id==='woFormOv')return;
    el.addEventListener('click',function(e){
      if(e.target===el)cMo(el.id);
    });
  });
  // 다른 탭에서 localStorage 변경 시 자동 갱신 (관리자↔작업자 실시간 동기화)
  window.addEventListener('storage',function(e){
    if(e.key==='wo'||e.key==='cli'||e.key==='prod'){
      if(CU&&CU.role==='worker'&&typeof rWQ==='function')rWQ();
      if(CU&&CU.role==='admin'&&typeof rDash==='function')rDash();
    }
  });
});

initDB();

/* ===== AI 어시스턴트 (Gemini) ===== */
var _aiOpen=false;
function toggleAI(){
  var panel=$('aiPanel');
  if(!panel){
    var el=document.createElement('div');
    el.id='aiPanel';
    el.innerHTML=`
    <div style="position:fixed;right:16px;bottom:16px;width:380px;height:520px;background:#fff;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.2);display:flex;flex-direction:column;z-index:9999;overflow:hidden">
      <div style="background:linear-gradient(135deg,#4285F4,#34A853);color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
        <span style="font-weight:700;font-size:14px">AI 어시스턴트</span>
        <button onclick="toggleAI()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer">&times;</button>
      </div>
      <div id="aiMessages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px">
        <div style="background:#F0F7FF;padding:10px 12px;border-radius:12px;font-size:13px;color:#1E40AF;max-width:90%">안녕하세요! MES 데이터를 기반으로 도움을 드립니다.<br><br>예시 질문:<br>• 현재 생산 현황 요약해줘<br>• 납기 임박한 작업 알려줘<br>• 이번주 생산 효율 분석해줘</div>
      </div>
      <div style="padding:8px;border-top:1px solid #E5E7EB;display:flex;gap:6px;flex-shrink:0">
        <input id="aiInput" type="text" placeholder="질문을 입력하세요..." style="flex:1;padding:10px 14px;border:1px solid #E5E7EB;border-radius:10px;font-size:13px;outline:none" onkeydown="if(event.key==='Enter')sendAI()">
        <button onclick="sendAI()" style="padding:10px 16px;border-radius:10px;border:none;background:#4285F4;color:#fff;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap">전송</button>
      </div>
    </div>`;
    document.body.appendChild(el);
    _aiOpen=true;
    $('aiInput').focus();
    return;
  }
  _aiOpen=!_aiOpen;
  panel.style.display=_aiOpen?'block':'none';
  if(_aiOpen)$('aiInput').focus();
}

function getAIContext(){
  var wo=DB.g('wo'),cli=DB.g('cli'),prod=DB.g('prod');
  var active=wo.filter(function(o){return o.status!=='출고완료'});
  var summary='현재 시스템 데이터:\n';
  summary+='- 전체 작업지시: '+wo.length+'건\n';
  summary+='- 진행중: '+wo.filter(function(o){return o.status==='진행중'}).length+'건\n';
  summary+='- 대기: '+wo.filter(function(o){return o.status==='대기'}).length+'건\n';
  summary+='- 완료: '+wo.filter(function(o){return o.status==='완료'||o.status==='출고완료'}).length+'건\n';
  summary+='- 등록 거래처: '+cli.length+'개\n';
  summary+='- 등록 품목: '+prod.length+'개\n\n';
  summary+='작업 상세:\n';
  active.forEach(function(o){
    var cp=typeof curP==='function'?curP(o):null;
    var dl=typeof dLeft==='function'?dLeft(o):999;
    summary+=o.cnm+' | '+o.pnm+' | '+o.fq+'매 | 현재공정:'+(cp?cp.nm+' ('+cp.st+')':'완료')+' | 납기:'+o.sd+' (D'+(dl>=0?'-':'+')+ Math.abs(dl)+')\n';
  });
  return summary;
}

async function sendAI(){
  var input=$('aiInput');
  var q=input.value.trim();
  if(!q)return;
  input.value='';
  var msgs=$('aiMessages');
  // 사용자 메시지
  msgs.innerHTML+='<div style="align-self:flex-end;background:#4285F4;color:#fff;padding:8px 12px;border-radius:12px;font-size:13px;max-width:80%">'+q+'</div>';
  // 로딩
  msgs.innerHTML+='<div id="aiLoading" style="align-self:flex-start;padding:8px 12px;font-size:12px;color:#9CA3AF">생각 중...</div>';
  msgs.scrollTop=msgs.scrollHeight;

  try{
    var aiKey=localStorage.getItem('gemini_key')||'';
    var context=getAIContext();
    var systemPrompt='당신은 패키지 제조업 MES(생산관리시스템)의 AI 어시스턴트입니다. 한국어로 답변하세요. 간결하고 실용적으로 답변하세요. 아래는 현재 시스템 데이터입니다:\n\n'+context;

    var resp=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key='+aiKey,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{parts:[{text:systemPrompt+'\n\n사용자 질문: '+q}]}],
        generationConfig:{maxOutputTokens:1024,temperature:0.7}
      })
    });
    var data=await resp.json();
    if(data.error){
      var loading=$('aiLoading');if(loading)loading.remove();
      var errMsg='API 오류';
      if(data.error.code===429)errMsg='API 한도 초과. 잠시 후 다시 시도하거나, 설정에서 새 API 키를 등록하세요.<br><br><button onclick="var k=prompt(\'Gemini API 키 입력:\');if(k){localStorage.setItem(\'gemini_key\',k);toast(\'API 키 저장\',\'ok\')}" style="padding:6px 12px;border-radius:6px;border:1px solid #3B82F6;background:#EFF6FF;color:#3B82F6;font-size:12px;cursor:pointer">API 키 변경</button>';
      else errMsg=data.error.message;
      msgs.innerHTML+='<div style="align-self:flex-start;background:#FEF2F2;padding:10px 12px;border-radius:12px;font-size:12px;color:#991B1B;max-width:90%">'+errMsg+'</div>';
      msgs.scrollTop=msgs.scrollHeight;
      return;
    }
    var answer=data.candidates&&data.candidates[0]&&data.candidates[0].content&&data.candidates[0].content.parts&&data.candidates[0].content.parts[0]?data.candidates[0].content.parts[0].text:'응답을 받지 못했습니다.';
    // 마크다운 간단 처리
    answer=answer.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
    var loading=$('aiLoading');if(loading)loading.remove();
    msgs.innerHTML+='<div style="align-self:flex-start;background:#F3F4F6;padding:10px 12px;border-radius:12px;font-size:13px;max-width:90%;line-height:1.5">'+answer+'</div>';
  }catch(e){
    var loading=$('aiLoading');if(loading)loading.remove();
    msgs.innerHTML+='<div style="align-self:flex-start;background:#FEF2F2;padding:10px 12px;border-radius:12px;font-size:13px;color:#DC2626">오류: '+e.message+'</div>';
  }
  msgs.scrollTop=msgs.scrollHeight;
}
