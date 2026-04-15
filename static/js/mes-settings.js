// SETTINGS
// === 권한 체크박스 유틸 ===
var ALL_PERMS=['mes-dash','mes-plan','mes-wo','mes-cli','mes-vendor','mes-prod','mes-mold','mes-ship','mes-rpt','mes-worker','mes-queue','mat-income','mat-stock','mat-po','mat-bom','acc-sales','acc-purchase','acc-pl','acc-tax','acc-recv','acc-cashflow','acc-monthly','acc-closing','hr-emp','hr-att','hr-pay','hr-leave','biz-trend','biz-rank','biz-cost','qc-inspect','qc-equip','qc-quote','qc-approval'];
function toggleAllPerms(on){document.querySelectorAll('.perm-cb').forEach(function(cb){cb.checked=on})}
function getPermsFromUI(){var perms=[];document.querySelectorAll('.perm-cb:checked').forEach(function(cb){perms.push(cb.value)});return perms}
function setPermsUI(perms){document.querySelectorAll('.perm-cb').forEach(function(cb){cb.checked=perms?perms.indexOf(cb.value)>=0:false})}
function onRoleChange(role){
  $('umPG').classList.toggle('hidden',role!=='worker');
  var pa=$('umPermsArea');
  if(role==='admin'){toggleAllPerms(true);document.querySelectorAll('.perm-cb').forEach(function(cb){cb.disabled=true});if(pa)pa.style.opacity='0.5'}
  else if(role==='worker'){if(pa)pa.style.display='none'}
  else{document.querySelectorAll('.perm-cb').forEach(function(cb){cb.disabled=false});if(pa){pa.style.display='';pa.style.opacity='1'}}
}
function eUser(id){
var us=DB.g('users');var u=us.find(x=>x.id===id);if(!u)return;
$('umId').value=u.id;$('umNm').value=u.nm||'';$('umDept').value=u.dept||'';$('umPosition').value=u.position||'';$('umRole').value=u.role||'admin';$('umUn').value=u.un||'';$('umPw').value='';
$('umPG').classList.toggle('hidden',u.role!=='worker');
if(u.role==='worker'&&u.proc)$('umProc').value=u.proc;
// 권한 체크박스 복원
if(u.perms)setPermsUI(u.perms);
else if(u.role==='admin')toggleAllPerms(true);
else setPermsUI(ALL_PERMS);
onRoleChange(u.role||'admin');
$('umTitle').textContent='사용자 수정';oMo('userMo');
}
function rUsers(){const us=DB.g('users');$('userTbl').querySelector('tbody').innerHTML=us.map(u=>`<tr><td style="font-weight:700">${u.nm}</td><td>${u.dept||'-'}</td><td>${u.position||'-'}</td><td>${u.un||'-'}</td><td><button class="btn btn-sm btn-o" onclick="eUser('${u.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dUser('${u.id}')">삭제</button></td></tr>`).join('');const co=DB.g1('co');if(co){$('sCo').value=co.nm||'';$('sAddr').value=co.addr||'';$('sTel').value=co.tel||'';$('sFax').value=co.fax||'';if($('sCeo'))$('sCeo').value=co.ceo||'';if($('sBizNo'))$('sBizNo').value=co.bizNo||'';if($('sBizType'))$('sBizType').value=co.bizType||'';if($('sBizClass'))$('sBizClass').value=co.bizClass||''}loadBizApiKey();if(typeof loadPopbillConfig==='function')loadPopbillConfig();if(typeof initBackupCard==='function')initBackupCard();if(typeof initAuditCard==='function')initAuditCard()}
function rLogs(){const logs=DB.g('logs');$('editLogList').innerHTML=logs.length?logs.slice(0,50).map(l=>`<div class="log-item">${l.t} | ${l.m}</div>`).join(''):'<div style="color:var(--txt2);text-align:center;padding:10px">이력 없음</div>'}
function openUserM(){['umId','umNm','umDept','umPosition','umUn','umPw'].forEach(x=>$(x).value='');$('umRole').value='admin';$('umPG').classList.add('hidden');toggleAllPerms(true);onRoleChange('admin');$('umTitle').textContent='사용자 등록';oMo('userMo')}
function saveUser(){const nm=$('umNm').value.trim();if(!nm){toast('이름 필요','err');return}
const editId=$('umId').value;const us=DB.g('users');var role=$('umRole').value;
var perms=role==='admin'?null:(role==='worker'?[]:getPermsFromUI());
if(editId){var u=us.find(x=>x.id===editId);if(u){u.nm=nm;u.dept=$('umDept').value.trim();u.position=$('umPosition').value.trim();u.role=role;u.proc=role==='worker'?$('umProc').value:'';u.perms=perms;u.un=$('umUn').value;if($('umPw').value.trim())u.pw=$('umPw').value.trim()}}
else{const u={id:gid(),nm,dept:$('umDept').value.trim(),position:$('umPosition').value.trim(),role:role,proc:role==='worker'?$('umProc').value:'',perms:perms,un:$('umUn').value,pw:$('umPw').value.trim()||'1234',cat:nw()};us.push(u)}
DB.s('users',us);cMo('userMo');rUsers();if(typeof refreshLoginUsers==='function')refreshLoginUsers();toast('저장','ok')}
function dUser(id){if(!confirm('삭제?'))return;DB.s('users',DB.g('users').filter(x=>x.id!==id));rUsers();if(typeof refreshLoginUsers==='function')refreshLoginUsers();toast('삭제','ok')}
function saveCo(){DB.s1('co',{nm:$('sCo').value,ceo:$('sCeo')?$('sCeo').value:'',bizNo:$('sBizNo')?$('sBizNo').value:'',addr:$('sAddr').value,tel:$('sTel').value,fax:$('sFax').value,bizType:$('sBizType')?$('sBizType').value:'',bizClass:$('sBizClass')?$('sBizClass').value:''});toast('저장','ok')}
function saveBizApiKey(){var k=$('sBizApiKey').value.trim();if(!k){toast('API 키를 입력하세요','err');return}DB.s1('bizApiKey',k);toast('API 키 저장 완료','ok')}
function loadBizApiKey(){var k=DB.g1('bizApiKey');if(k&&$('sBizApiKey'))$('sBizApiKey').value=k;}
function impData(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=e=>{try{const d=JSON.parse(e.target.result);['wo','cli','prod','mold','users','done','hist','logs','shipLog','claims','incLog','vendors','qcRecords','stock','bom','income','po','sales','purchase'].forEach(k=>{if(d[k])DB.s(k,d[k])});if(d.co)DB.s1('co',d.co);toast('가져오기 완료','ok');location.reload()}catch{toast('파일 오류','err')}};r.readAsText(f)}
function genSim(){
  if(!confirm('테스트용 거래처/품목/목형/인쇄소/작업지시서를 생성합니까? 기존 데이터는 유지됩니다.'))return;
  // 거래처 마스터
  var clis=DB.g('cli');
  var simClis=[
    {id:'sim-cli-1',nm:'동서음료',tel:'02-1234-5678',addr:'서울시 강남구 테헤란로 123',email:'order@dongseo.co.kr',mgr:'김철수',pay:'월말정산',note:''},
    {id:'sim-cli-2',nm:'미래푸드',tel:'031-987-6543',addr:'경기도 성남시 분당구 판교로 56',email:'buy@miraefood.com',mgr:'이영희',pay:'30일어음',note:''},
    {id:'sim-cli-3',nm:'대한제과',tel:'02-5678-9012',addr:'서울시 송파구 올림픽로 300',email:'package@daehan.co.kr',mgr:'박민준',pay:'선불',note:''},
    {id:'sim-cli-4',nm:'한국화장품',tel:'032-345-6789',addr:'인천시 남동구 논현로 88',email:'supply@hkcos.com',mgr:'최지은',pay:'월말정산',note:''}
  ];
  simClis.forEach(function(c){if(!clis.find(function(x){return x.id===c.id}))clis.push(c)});
  DB.s('cli',clis);
  // 품목 마스터
  var prods=DB.g('prod');
  var simProds=[
    {id:'sim-prod-1',nm:'캔 홀더 박스',cnm:'동서음료',spec:'350×250×120mm',paper:'아트지 250g',price:58,note:'음료 캔 6입용',procs:['인쇄','코팅','타발']},
    {id:'sim-prod-2',nm:'영양제 패키지',cnm:'미래푸드',spec:'200×150×80mm',paper:'백판지 300g',price:45,note:'건강기능식품용',procs:['인쇄','접착']},
    {id:'sim-prod-3',nm:'케이크 상자',cnm:'대한제과',spec:'400×400×200mm',paper:'아트지 350g',price:120,note:'제과용 고급형',procs:['인쇄','코팅','타발']},
    {id:'sim-prod-4',nm:'약품 박스',cnm:'한국화장품',spec:'180×120×60mm',paper:'백판지 250g',price:32,note:'의약품 외포장',procs:['인쇄','코팅','타발']}
  ];
  simProds.forEach(function(p){if(!prods.find(function(x){return x.id===p.id}))prods.push(p)});
  DB.s('prod',prods);
  // 목형 마스터
  var molds=DB.g('mold');
  var simMolds=[
    {id:'sim-mold-1',no:'M-001',pnm:'캔 홀더 박스',cnm:'동서음료',loc:'A선반-1',st:'사용중',nt:'동서음료 전용'},
    {id:'sim-mold-2',no:'M-002',pnm:'영양제 패키지',cnm:'미래푸드',loc:'A선반-2',st:'사용중',nt:'공용'},
    {id:'sim-mold-3',no:'M-003',pnm:'케이크 상자',cnm:'대한제과',loc:'B선반-1',st:'사용중',nt:'대한제과 전용'},
    {id:'sim-mold-4',no:'M-004',pnm:'약품 박스',cnm:'한국화장품',loc:'B선반-2',st:'보관중',nt:'공용'}
  ];
  simMolds.forEach(function(m){if(!molds.find(function(x){return x.id===m.id}))molds.push(m)});
  DB.s('mold',molds);
  // 인쇄소(vendor) 마스터
  var vendors=DB.g('vendors');
  var simVendors=[
    {id:'sim-vd-1',nm:'서울인쇄',tel:'02-111-2222',addr:'서울시 중구 을지로 50',mgr:'정인쇄',type:'offset',note:'4도 오프셋 전문'},
    {id:'sim-vd-2',nm:'경기디지털프린트',tel:'031-333-4444',addr:'경기도 파주시 출판단지 15',mgr:'강디지',type:'digital',note:'디지털 단납기'}
  ];
  simVendors.forEach(function(v){if(!vendors.find(function(x){return x.id===v.id}))vendors.push(v)});
  DB.s('vendors',vendors);
  // 작업지시서
  var wo=DB.g('wo');
  var today=td();
  var simWO=[
    {id:'sim-wo-1',wn:'WO-SIM-001',dt:today,cnm:'동서음료',pnm:'캔 홀더 박스',spec:'350×250×120mm',fq:5000,sd:today,dlv:'직납',status:'진행중',procs:[{nm:'인쇄',tp:'n',mt:'4도',vd:'서울인쇄',st:'완료',qty:5000,t1:'',t2:''},{nm:'코팅',tp:'n',mt:'유광',vd:'',st:'완료',qty:5000,t1:'',t2:''},{nm:'타발',tp:'n',mt:'',vd:'',st:'완료',qty:5000,t1:'',t2:''}],note:'시뮬용'},
    {id:'sim-wo-2',wn:'WO-SIM-002',dt:today,cnm:'미래푸드',pnm:'영양제 패키지',spec:'200×150×80mm',fq:10000,sd:today,dlv:'퀵배송',status:'진행중',procs:[{nm:'인쇄',tp:'n',mt:'2도',vd:'경기디지털프린트',st:'완료',qty:10000,t1:'',t2:''},{nm:'접착',tp:'n',mt:'',vd:'',st:'대기',qty:0,t1:'',t2:''}],note:'시뮬용'},
    {id:'sim-wo-3',wn:'WO-SIM-003',dt:today,cnm:'대한제과',pnm:'케이크 상자',spec:'400×400×200mm',fq:2000,sd:today,dlv:'직납',status:'대기',procs:[{nm:'인쇄',tp:'n',mt:'4도',vd:'서울인쇄',st:'대기',qty:0,t1:'',t2:''}],note:'시뮬용'},
    {id:'sim-wo-4',wn:'WO-SIM-004',dt:today,cnm:'한국화장품',pnm:'약품 박스',spec:'180×120×60mm',fq:20000,sd:today,dlv:'화물',status:'완료',procs:[{nm:'인쇄',tp:'n',mt:'4도',vd:'서울인쇄',st:'완료',qty:20000,t1:'',t2:''},{nm:'코팅',tp:'n',mt:'무광',vd:'',st:'완료',qty:20000,t1:'',t2:''},{nm:'타발',tp:'n',mt:'',vd:'',st:'외주완료',qty:20000,t1:'',t2:''}],note:'시뮬용'}
  ];
  simWO.forEach(function(w){if(!wo.find(function(x){return x.id===w.id}))wo.push(w)});
  DB.s('wo',wo);
  toast('시뮬레이션 데이터 생성 완료 (거래처 4, 품목 4, 목형 4, 인쇄소 2, WO 4)','ok');
  if(typeof rWOList==='function')rWOList();
  if(typeof rCli==='function')rCli();
  if(typeof rProd==='function')rProd();
}

/* ===== 테스트 데이터 초기화 ===== */
function resetAllData(){
  if(!confirm('⚠️ 모든 업무 데이터를 삭제합니다.\n(사용자 계정, 회사정보는 유지됩니다)\n\n정말 진행하시겠습니까?'))return;
  if(!confirm('최종 확인: 거래처, 품목, 작업지시서, 출고, 매출, 재고 등\n모든 업무 데이터가 영구 삭제됩니다.\n\n정말 삭제하시겠습니까?'))return;
  // 먼저 백업 생성
  authFetch('/api/backups/now',{method:'POST'}).then(function(r){return r.json()}).then(function(){
    toast('안전 백업 완료','ok');
    // 초기화할 키 목록 (사용자/회사정보 제외)
    var resetKeys=['wo','cli','prod','mold','done','hist','logs','shipLog','claims','incLog',
      'vendors','qcRecords','stock','bom','income','po','sales','purchase','defectLog',
      'certs','quotes','approval','outsource','moldHist','downtime','equipments',
      'pmSchedule','breakdownLog','safetyStock','mrp','matAudit','matPrice',
      'payroll','attendance','leave','shift','insurance','cashflow','aging','etax'];
    var promises=resetKeys.map(function(k){
      return authFetch('/api/data/ino_'+k,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:'[]'})});
    });
    Promise.all(promises).then(function(){
      toast('데이터 초기화 완료 — 새로고침합니다','ok');
      setTimeout(function(){location.reload()},1500);
    }).catch(function(){toast('초기화 중 오류 발생','err')});
  }).catch(function(){toast('안전 백업 실패 — 초기화를 취소합니다','err')});
}

// ===== SHIPPING MANAGEMENT =====
function getShipped(woId){return DB.g('shipLog').filter(s=>s.woId===woId).reduce((sum,s)=>sum+s.qty,0)}
function isAllProcsDone(o){
  return o.procs&&o.procs.length>0&&o.procs.every(function(p){
    return p.st==='완료'||p.st==='외주완료'||p.tp==='out'||p.tp==='exc';
  });
}
function rShipReady(){
// Fix status: 진행중이지만 모든 공정 완료된 WO → 완료로 자동 변경
var _allWo=DB.g('wo');var _changed=false;
_allWo.forEach(function(o){if(o.status==='진행중'&&isAllProcsDone(o)){o.status='완료';_changed=true;}});
if(_changed)DB.s('wo',_allWo);
// 출고대기: 모든 공정 완료이고 출고잔량 있는 것 (status='출고완료'는 제외)
const ready=DB.g('wo').filter(function(o){
  if(o.status==='취소')return false;
  if(o.status==='출고완료')return false;
  return isAllProcsDone(o)&&getShipped(o.id)<o.fq;
});
$('shipAlerts').innerHTML='';
// Summary
const totReady=ready.length,overdue=ready.filter(o=>o.sd&&o.sd<td()).length,todayShip=ready.filter(o=>o.sd===td()).length;
var _shipLog=DB.g('shipLog');
var _todayShipped=_shipLog.filter(s=>s.dt===td()).length;
// 어제 대비 — yesterday's shipLog 건수
var _yd=new Date();_yd.setDate(_yd.getDate()-1);var _ydStr=_yd.toISOString().slice(0,10);
var _ydShipped=_shipLog.filter(s=>s.dt===_ydStr).length;
var _delta=_todayShipped-_ydShipped;
var _deltaTxt=_delta>0?`<span style="color:var(--suc)">▲ ${_delta}</span>`:_delta<0?`<span style="color:var(--dan)">▼ ${Math.abs(_delta)}</span>`:`<span style="color:var(--txt3)">변동 없음</span>`;
// 7일 sparkline (출고 건수 기준)
var _spk=[];for(var _i=6;_i>=0;_i--){var _d=new Date();_d.setDate(_d.getDate()-_i);var _ds=_d.toISOString().slice(0,10);_spk.push(_shipLog.filter(s=>s.dt===_ds).length)}
var _spkMax=Math.max.apply(null,_spk)||1;
var _spkSvg='<svg width="100%" height="32" viewBox="0 0 100 32" preserveAspectRatio="none" style="display:block;margin-top:6px"><polyline fill="none" stroke="var(--suc)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="'+_spk.map((v,i)=>(i*100/6)+','+(28-(v/_spkMax)*24)).join(' ')+'"/><polyline fill="rgba(14,140,87,.08)" stroke="none" points="0,32 '+_spk.map((v,i)=>(i*100/6)+','+(28-(v/_spkMax)*24)).join(' ')+' 100,32"/></svg>';
// 가장 큰 출고예정 건
var _bigShip=ready.filter(o=>o.sd===td()).sort((a,b)=>(b.fq||0)-(a.fq||0))[0];
var _bigTxt=_bigShip?`최대: <strong style="color:var(--txt)">${_bigShip.cnm}</strong> ${(_bigShip.fq||0).toLocaleString()}`:'예정 없음';
$('shipSum').innerHTML=
  `<div class="sb blue"><div class="l">출고대기</div><div class="v">${totReady}</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">총 잔량 ${ready.reduce((s,o)=>s+(o.fq-getShipped(o.id)),0).toLocaleString()}개</div></div>`+
  `<div class="sb ${overdue>0?'red':'orange'}"><div class="l">출고 지연</div><div class="v">${overdue}</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">${overdue>0?'⚠ 즉시 처리 필요':'지연 없음'}</div></div>`+
  `<div class="sb orange"><div class="l">오늘 출고예정</div><div class="v">${todayShip}</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_bigTxt}</div></div>`+
  `<div class="sb green"><div class="l">금일 출고완료</div><div class="v">${_todayShipped}</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">${_deltaTxt} <span style="color:var(--txt3);margin-left:4px">vs 어제</span></div>${_spkSvg}</div>`;
// Table
$('shipReadyTbl').querySelector('tbody').innerHTML=ready.length?ready.sort((a,b)=>a.sd>b.sd?1:-1).map(o=>{const shipped=getShipped(o.id);const remain=o.fq-shipped;const late=o.sd&&o.sd<td();
var compQty=o.procs&&o.procs.length?o.procs[o.procs.length-1].qty||0:0;if(!compQty){for(var _pi=o.procs.length-1;_pi>=0;_pi--){if(o.procs[_pi].qty>0){compQty=o.procs[_pi].qty;break}}}
return`<tr ${late?'class="row-late"':''}><td>${o.wn}</td><td>${o.cnm}</td><td>${o.pnm}</td><td>${o.fq}</td><td style="color:var(--pri);font-weight:700">${compQty||'-'}</td><td style="color:var(--suc);font-weight:700">${shipped}</td><td style="color:${remain>0?'var(--dan)':'var(--suc)'};font-weight:700">${remain}</td><td ${late?'style="color:var(--dan);font-weight:700"':''}>${o.sd}</td><td>${o.dlv||'-'}</td><td>${remain<=0?badge('출고완료'):late?badge('지연'):badge('출고대기')}</td><td>${remain>0?`<button class="btn btn-sm btn-s" onclick="openShipM('${o.id}')">출고</button>`:''} <button class="btn btn-sm btn-o" onclick="showDet('${o.id}')">상세</button></td></tr>`}).join(''):'<tr><td colspan="11" class="empty-cell">출고 대기 없음</td></tr>'}
function openShipM(woId){const o=DB.g('wo').find(x=>x.id===woId);if(!o)return;$('smWoId').value=woId;$('smCli').innerHTML='<span id="smCliName">'+o.cnm+'</span>';$('smCliOverride').value='';$('smProd').textContent=o.pnm;$('smTotal').textContent=o.fq;const shipped=getShipped(woId);$('smShipped').textContent=shipped;$('smRemain').textContent=o.fq-shipped;$('smQty').value=o.fq-shipped;$('smDefect').value=0;$('smGood').textContent=o.fq-shipped;$('smInspNote').value='';$('smCar').value='';$('smDriver').value='';$('smDlv').value=o.dlv||'';$('smMemo').value='';$('shipMoT').textContent=shipped>0?'부분 출고':'출고 처리';
  // 얼마에요 GroupId — 매출 귀속회사 라디오 렌더링
  if(typeof renderGrpRadio==='function'){
    var _cg=typeof _currentGroupId!=='undefined'?_currentGroupId:'ALL';
    renderGrpRadio('smGrpSel',_cg==='ALL'?'':_cg);
  }
  oMo('shipMo')}
/* === 출고 시 거래처 변경 (방안 A) === */
function changeShipCli(){
  var woId=$('smWoId').value;
  var o=DB.g('wo').find(function(x){return x.id===woId});if(!o)return;
  var h='<div class="mb" style="width:560px"><div class="mo-t">납품 거래처 변경<button class="mo-x" onclick="cMo(\'shipCliMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button></div>';
  h+='<div style="padding:14px 18px"><div style="font-size:13px;color:var(--txt2);margin-bottom:8px">원래 거래처: <b>'+o.cnm+'</b></div>';
  h+='<div style="background:#FFFBEB;border-left:3px solid #F59E0B;padding:10px;margin-bottom:12px;font-size:12px;color:#92400E">⚠ 변경된 거래처는 매출/세금계산서/거래명세표에 반영됩니다</div>';
  h+='<input id="shipCliSch" placeholder="거래처명 검색..." oninput="filterShipCliSch()" style="width:100%;padding:10px 12px;border:1px solid var(--bdr);border-radius:8px;margin-bottom:8px">';
  // 얼마에요 CodeCategory 203 - 수정세금계산서 종류 6가지
  h+='<select id="shipCliReason" style="width:100%;padding:10px;border:1px solid var(--bdr);border-radius:8px;margin-bottom:8px;font-size:13px">';
  h+='<option value="4|기재사항의 착오 정정">4. 기재사항의 착오 정정 (잘못 입력)</option>';
  h+='<option value="6|착오에 의한 이중 발급">6. 착오에 의한 이중 발급</option>';
  h+='<option value="3|공급가액의 변동">3. 공급가액의 변동</option>';
  h+='<option value="2|계약의 해제">2. 계약의 해제</option>';
  h+='<option value="1|환입">1. 환입</option>';
  h+='<option value="5|내국신용장 사후 개설">5. 내국신용장 사후 개설</option>';
  h+='</select>';
  h+='<div id="shipCliList" style="max-height:300px;overflow-y:auto;border:1px solid var(--bdr);border-radius:8px;padding:6px"></div></div></div>';
  var el=document.createElement('div');el.id='shipCliMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('shipCliMo')};
  document.body.appendChild(el);
  filterShipCliSch();
  setTimeout(function(){$('shipCliSch').focus()},100);
}
function filterShipCliSch(){
  var v=($('shipCliSch')?$('shipCliSch').value:'').toLowerCase();
  var cs=DB.g('cli').filter(function(c){return !v||(c.nm||'').toLowerCase().includes(v)||(c.tel||'').includes(v)});
  if(cs.length>50)cs=cs.slice(0,50);
  var h='';
  if(!cs.length){h='<div style="padding:18px;text-align:center;color:var(--txt3)">검색 결과 없음</div>';}
  else{cs.forEach(function(c){
    h+='<div onclick="pickShipCli(\''+c.id+'\')" style="padding:10px 12px;border-radius:6px;cursor:pointer;font-size:13px" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">';
    h+='<div style="font-weight:700">'+c.nm+'</div>';
    h+='<div style="font-size:11px;color:var(--txt3);margin-top:2px">'+(c.bizNo||'')+(c.addr?' | '+c.addr.slice(0,30):'')+'</div>';
    h+='</div>';
  })}
  $('shipCliList').innerHTML=h;
}
function pickShipCli(cid){
  var c=DB.g('cli').find(function(x){return x.id===cid});if(!c)return;
  var reasonVal=$('shipCliReason').value;
  // "4|기재사항의 착오 정정" → 코드와 사유명 분리
  var parts=reasonVal.split('|');
  var kindCode=parseInt(parts[0]);
  var kindName=parts[1]||reasonVal;
  $('smCliName').textContent=c.nm;
  // 얼마에요 패턴 (AmendedKindCode + 거래처 변경 메타)
  $('smCliOverride').value=JSON.stringify({
    id:c.id, nm:c.nm,
    amendedKindCode:kindCode,
    reason:kindName,
    changedAt:nw(),
    changedBy:CU?CU.nm:''
  });
  $('smCli').innerHTML='<span id="smCliName" style="color:#D97706">'+c.nm+'</span> <span style="font-size:10px;background:#FEF3C7;color:#92400E;padding:2px 6px;border-radius:4px" title="'+kindCode+'. '+kindName+'">변경 ('+kindCode+')</span>';
  cMo('shipCliMo');
  toast('거래처 변경: '+c.nm+' ('+kindCode+'. '+kindName+')','ok');
}
function calcDefect(){const q=+$('smQty').value||0,d=+$('smDefect').value||0;$('smGood').textContent=Math.max(0,q-d)}
function doShip(){const woId=$('smWoId').value,qty=+$('smQty').value,defect=+$('smDefect').value||0;if(!qty||qty<=0){toast('출고수량 필요','err');return}const o=DB.g('wo').find(x=>x.id===woId);if(!o)return;const shipped=getShipped(woId);const remain=o.fq-shipped;if(qty>remain&&!confirm(`잔량(${remain})보다 출고수량(${qty})이 많습니다. 계속?`))return;
/* 거래처 변경 적용 (방안 A) — 얼마에요 BookId 변경 패턴 */
var _override=$('smCliOverride').value;
var _shipCnm=o.cnm, _shipCid='', _changeMeta=null;
if(_override){
  try{var _ov=JSON.parse(_override);_shipCnm=_ov.nm;_shipCid=_ov.id;_changeMeta=_ov;}catch(e){}
}
const rec={
  id:gid(),woId,wn:o.wn,
  cnm:_shipCnm, origCnm:o.cnm,        // 얼마에요 BookId(변경) + OrigBookId(원본)
  isCliChanged: !!_changeMeta,         // 거래처 변경 표시
  amendedKindCode: _changeMeta?_changeMeta.amendedKindCode:0,  // 얼마에요 AmendedKindCode
  pnm:o.pnm,qty,defect,good:qty-defect,
  inspNote:$('smInspNote').value,car:$('smCar').value,
  driver:$('smDriver').value,dlv:$('smDlv').value,
  memo:$('smMemo').value,dt:td(),tm:nw(),mgr:CU?CU.nm:'',
  changeMeta:_changeMeta
};
/* 거래처 변경 이력 기록 (얼마에요 EntityLog 패턴) */
if(_changeMeta){
  var _chgLog=DB.g('changeLog');
  _chgLog.push({
    id:gid(),dt:td(),tm:nw(),
    type:'출고거래처변경',
    target:'WO:'+o.wn,
    amendedKindCode:_changeMeta.amendedKindCode,
    amendedKindName:_changeMeta.reason,
    from:o.cnm,to:_shipCnm,
    by:CU?CU.nm:'',ref:rec.id
  });
  DB.s('changeLog',_chgLog);
}
const logs=DB.g('shipLog');logs.push(rec);DB.s('shipLog',logs);
if(typeof DocTrace!=='undefined')DocTrace.link('WO',woId,'SHIP',rec.id,o.wn,'');
if(shipped+qty>=o.fq){const all=DB.g('wo');const i=all.findIndex(x=>x.id===woId);if(i>=0){all[i].status='출고완료';DB.s('wo',all);
  // 수주 연동: WO 출고완료 → 수주도 출고완료
  if(o.ordId){var _ords=getOrders();var _ord=_ords.find(function(x){return x.id===o.ordId});if(_ord&&_ord.status!=='출고완료'){_ord.status='출고완료';saveOrders(_ords)}}
}}
/* === 데이터 연계: 출고 → 매출 자동 등록 === */
try{
  var unitPrice=o.price||(o.amt&&o.fq?Math.round(o.amt/o.fq):0);
  var salesAmt=Math.round(unitPrice*qty);
  var sb=DB.g('sales');
  var _saleId=gid();
  // 얼마에요 GroupId — 출고 모달에서 선택된 귀속회사
  var _shipGrpId='';
  if(typeof getSelectedGrpId==='function')_shipGrpId=getSelectedGrpId('smGrpSel')||'';
  else if(typeof _currentGroupId!=='undefined'&&_currentGroupId!=='ALL')_shipGrpId=_currentGroupId;
  sb.push({id:_saleId,dt:td(),cli:_shipCnm,prod:o.pnm,qty:qty,price:unitPrice,amt:salesAmt,paid:0,payType:'미수',note:'출고자동등록 ('+o.wn+')',woId:woId,shipId:rec.id,groupId:_shipGrpId});
  DB.s('sales',sb);
  if(typeof DocTrace!=='undefined')DocTrace.link('SHIP',rec.id,'SALE',_saleId,'','');
  addLog('매출자동등록: '+o.cnm+' '+o.pnm+' '+(salesAmt?fmt(salesAmt)+'원':'단가미입력'));
}catch(e){console.warn('매출연계오류:',e);toast('⚠ 매출 자동등록 실패 — 매출관리에서 수동 등록 필요','err')}
/* === 데이터 연계: 출고 → 품질검사 기록 === */
try{
  if(defect>0){
    var qcRecs=DB.g('qcRecords');
    qcRecs.push({id:gid(),dt:td(),prod:o.pnm,proc:'출고검수',sampleCnt:qty,defectCnt:defect,defectRate:((defect/qty)*100).toFixed(1),result:defect/qty>0.05?'불합격':'합격',action:rec.inspNote||'',mgr:CU?CU.nm:'',woId:woId});
    DB.s('qcRecords',qcRecs);
  }
}catch(e){console.warn('품질연계오류:',e);toast('⚠ 품질검사 기록 실패','err')}
/* === 데이터 연계: 출고 → 재고 자동 차감 (첫 출고 시 BOM 기반) === */
try{
  if(shipped===0){
    if(typeof deductMaterialsWithLog==='function'){deductMaterialsWithLog(woId)}
    else if(typeof deductMaterials==='function'){deductMaterials(woId)}
    addLog('자재차감(출고연동): '+o.pnm);
  }
  if(typeof addStockLog==='function')addStockLog(o.pnm,'출고',qty,'WO:'+o.wn,'출고→'+o.cnm);
}catch(e){console.warn('재고연계오류:',e)}
addLog(`출고: ${o.pnm} ${qty}매 → ${o.cnm}`);cMo('shipMo');rShipReady();if(typeof rDash==='function')rDash();if(typeof rWOList==='function')rWOList();if(typeof rPlan==='function')rPlan();if(typeof updateShipBadge==='function')updateShipBadge();toast(shipped+qty>=o.fq?'출고 완료!':'부분 출고 완료','ok')}

// ===== 백업 관리 UI =====
function initBackupCard(){
  if(!CU||CU.role!=='admin'){if($('backupCard'))$('backupCard').style.display='none';return}
  $('backupCard').style.display='';
  loadBackups();
}
function loadBackups(){
  authFetch('/api/backups').then(r=>r.json()).then(d=>{
    $('backupTbody').innerHTML=d.backups.length?d.backups.map(b=>
      '<tr><td style="font-weight:600;font-size:12px">'+b.filename+'</td><td>'+b.size_str+'</td><td>'+
      '<button class="btn btn-sm btn-o" onclick="restoreBackup(\''+b.filename+'\')">복원</button> '+
      '<button class="btn btn-sm btn-d" onclick="deleteBackup(\''+b.filename+'\')">삭제</button></td></tr>'
    ).join(''):'<tr><td colspan="3" class="empty-cell">백업 없음</td></tr>';
  }).catch(()=>{$('backupTbody').innerHTML='<tr><td colspan="3" class="empty-cell">조회 실패</td></tr>'});
}
function createBackupNow(){
  authFetch('/api/backups/now',{method:'POST'}).then(r=>r.json()).then(d=>{
    if(d.ok){toast('백업 완료: '+d.filename,'ok');loadBackups()}
  }).catch(()=>toast('백업 실패','err'));
}
function restoreBackup(fn){
  if(!confirm('⚠️ "'+fn+'" 으로 복원합니다.\n현재 데이터는 자동 백업 후 교체됩니다.\n\n계속할까요?'))return;
  authFetch('/api/backups/restore/'+encodeURIComponent(fn),{method:'POST'}).then(r=>r.json()).then(d=>{
    if(d.ok){toast(d.keys_restored+'개 키 복원 완료','ok');loadBackups();location.reload()}
    else toast('복원 실패: '+(d.error||''),'err');
  }).catch(()=>toast('복원 실패','err'));
}
function deleteBackup(fn){
  if(!confirm('"'+fn+'" 삭제?'))return;
  authFetch('/api/backups/'+encodeURIComponent(fn),{method:'DELETE'}).then(r=>r.json()).then(d=>{
    if(d.ok){toast('삭제','ok');loadBackups()}
  }).catch(()=>toast('삭제 실패','err'));
}

// ===== 감사 로그 UI =====
var _auditPage=0;
function initAuditCard(){
  if(!CU||CU.role!=='admin'){if($('auditLogCard'))$('auditLogCard').style.display='none';return}
  $('auditLogCard').style.display='';
  var sel=$('alUser');sel.innerHTML='<option value="">전체 사용자</option>';
  DB.g('users').forEach(function(u){var o=document.createElement('option');o.value=u.id||u.un||u.nm;o.textContent=u.nm;sel.appendChild(o)});
  loadAuditLogs();
}
function loadAuditLogs(page){
  if(typeof page!=='number')page=0;_auditPage=page;
  var params=new URLSearchParams();
  var u=$('alUser').value;if(u)params.set('user_id',u);
  var a=$('alAction').value;if(a)params.set('action',a);
  var f=$('alFrom').value;if(f)params.set('from_dt',f);
  var t=$('alTo').value;if(t)params.set('to_dt',t);
  params.set('limit','30');params.set('offset',String(page*30));
  authFetch('/api/audit-logs?'+params.toString()).then(function(r){return r.json()}).then(function(d){
    var actionNames={'login':'로그인','logout':'로그아웃','login_failed':'로그인실패','update':'수정','delete':'삭제','backup':'백업','restore':'복원'};
    var actionColors={'login':'var(--suc)','logout':'var(--txt2)','login_failed':'var(--dan)','update':'var(--pri)','delete':'var(--dan)','backup':'var(--wrn)','restore':'var(--wrn)'};
    $('auditTbody').innerHTML=d.logs.length?d.logs.map(function(l){
      var dt=(l.created_at||'').replace('T',' ').slice(0,19);
      var ac=actionNames[l.action]||l.action;
      var col=actionColors[l.action]||'var(--txt)';
      return '<tr><td style="font-size:11px;white-space:nowrap">'+dt+'</td><td style="font-weight:600">'+
        (l.user_name||'-')+'</td><td><span style="color:'+col+';font-weight:700;font-size:11px">'+ac+'</span></td><td>'+
        (l.target||'-')+'</td><td style="font-size:11px;color:var(--txt2)">'+
        (l.detail||l.target_id||'-')+'</td><td style="font-size:11px">'+
        (l.ip||'-')+'</td></tr>';
    }).join(''):'<tr><td colspan="6" class="empty-cell">감사 로그 없음</td></tr>';
    var total=d.total||0;var pages=Math.ceil(total/30);
    var pg='<span style="color:var(--txt2)">총 '+total+'건</span> ';
    if(pages>1){for(var i=0;i<pages&&i<10;i++){pg+=page===i?'<strong style="margin:0 3px">'+(i+1)+'</strong>':'<a href="#" onclick="loadAuditLogs('+i+');return false" style="margin:0 3px">'+(i+1)+'</a>'}}
    $('auditPaging').innerHTML=pg;
  }).catch(function(e){$('auditTbody').innerHTML='<tr><td colspan="6" class="empty-cell">조회 실패</td></tr>'});
}
