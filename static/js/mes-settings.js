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
function rUsers(){const us=DB.g('users');$('userTbl').querySelector('tbody').innerHTML=us.map(u=>`<tr><td style="font-weight:700">${u.nm}</td><td>${u.dept||'-'}</td><td>${u.position||'-'}</td><td>${u.un||'-'}</td><td><button class="btn btn-sm btn-o" onclick="eUser('${u.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dUser('${u.id}')">삭제</button></td></tr>`).join('');const co=DB.g1('co');if(co){$('sCo').value=co.nm||'';$('sAddr').value=co.addr||'';$('sTel').value=co.tel||'';$('sFax').value=co.fax||''}loadBizApiKey()}
function rLogs(){const logs=DB.g('logs');$('editLogList').innerHTML=logs.length?logs.slice(0,50).map(l=>`<div class="log-item">${l.t} | ${l.m}</div>`).join(''):'<div style="color:var(--txt2);text-align:center;padding:10px">이력 없음</div>'}
function openUserM(){['umId','umNm','umDept','umPosition','umUn','umPw'].forEach(x=>$(x).value='');$('umRole').value='admin';$('umPG').classList.add('hidden');toggleAllPerms(true);onRoleChange('admin');$('umTitle').textContent='사용자 등록';oMo('userMo')}
function saveUser(){const nm=$('umNm').value.trim();if(!nm){toast('이름 필요','err');return}
const editId=$('umId').value;const us=DB.g('users');var role=$('umRole').value;
var perms=role==='admin'?null:(role==='worker'?[]:getPermsFromUI());
if(editId){var u=us.find(x=>x.id===editId);if(u){u.nm=nm;u.dept=$('umDept').value.trim();u.position=$('umPosition').value.trim();u.role=role;u.proc=role==='worker'?$('umProc').value:'';u.perms=perms;u.un=$('umUn').value;if($('umPw').value.trim())u.pw=$('umPw').value.trim()}}
else{const u={id:gid(),nm,dept:$('umDept').value.trim(),position:$('umPosition').value.trim(),role:role,proc:role==='worker'?$('umProc').value:'',perms:perms,un:$('umUn').value,pw:$('umPw').value.trim()||'1234',cat:nw()};us.push(u)}
DB.s('users',us);cMo('userMo');rUsers();if(typeof refreshLoginUsers==='function')refreshLoginUsers();toast('저장','ok')}
function dUser(id){if(!confirm('삭제?'))return;DB.s('users',DB.g('users').filter(x=>x.id!==id));rUsers();if(typeof refreshLoginUsers==='function')refreshLoginUsers();toast('삭제','ok')}
function saveCo(){DB.s1('co',{nm:$('sCo').value,addr:$('sAddr').value,tel:$('sTel').value,fax:$('sFax').value});toast('저장','ok')}
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
var _todayShipped=DB.g('shipLog').filter(s=>s.dt===td()).length;
$('shipSum').innerHTML='<div class="sg">'+
  `<div class="sb blue" style="text-align:center"><div class="v">${totReady}</div><div class="l">출고대기</div></div>`+
  `<div class="sb ${overdue>0?'red':''}" style="text-align:center"><div class="v">${overdue}</div><div class="l">출고 지연</div></div>`+
  `<div class="sb orange" style="text-align:center"><div class="v">${todayShip}</div><div class="l">오늘 출고예정</div></div>`+
  `<div class="sb green" style="text-align:center"><div class="v">${_todayShipped}</div><div class="l">금일 출고완료</div></div>`+
'</div>';
// Table
$('shipReadyTbl').querySelector('tbody').innerHTML=ready.length?ready.sort((a,b)=>a.sd>b.sd?1:-1).map(o=>{const shipped=getShipped(o.id);const remain=o.fq-shipped;const late=o.sd&&o.sd<td();
var compQty=o.procs&&o.procs.length?o.procs[o.procs.length-1].qty||0:0;if(!compQty){for(var _pi=o.procs.length-1;_pi>=0;_pi--){if(o.procs[_pi].qty>0){compQty=o.procs[_pi].qty;break}}}
return`<tr ${late?'class="row-late"':''}><td>${o.wn}</td><td>${o.cnm}</td><td>${o.pnm}</td><td>${o.fq}</td><td style="color:var(--pri);font-weight:700">${compQty||'-'}</td><td style="color:var(--suc);font-weight:700">${shipped}</td><td style="color:${remain>0?'var(--dan)':'var(--suc)'};font-weight:700">${remain}</td><td ${late?'style="color:var(--dan);font-weight:700"':''}>${o.sd}</td><td>${o.dlv||'-'}</td><td>${remain<=0?badge('출고완료'):late?badge('지연'):badge('출고대기')}</td><td>${remain>0?`<button class="btn btn-sm btn-s" onclick="openShipM('${o.id}')">출고</button>`:''} <button class="btn btn-sm btn-o" onclick="showDet('${o.id}')">상세</button></td></tr>`}).join(''):'<tr><td colspan="11" class="empty-cell">출고 대기 없음</td></tr>'}
function openShipM(woId){const o=DB.g('wo').find(x=>x.id===woId);if(!o)return;$('smWoId').value=woId;$('smCli').textContent=o.cnm;$('smProd').textContent=o.pnm;$('smTotal').textContent=o.fq;const shipped=getShipped(woId);$('smShipped').textContent=shipped;$('smRemain').textContent=o.fq-shipped;$('smQty').value=o.fq-shipped;$('smDefect').value=0;$('smGood').textContent=o.fq-shipped;$('smInspNote').value='';$('smCar').value='';$('smDriver').value='';$('smDlv').value=o.dlv||'';$('smMemo').value='';$('shipMoT').textContent=shipped>0?'부분 출고':'출고 처리';oMo('shipMo')}
function calcDefect(){const q=+$('smQty').value||0,d=+$('smDefect').value||0;$('smGood').textContent=Math.max(0,q-d)}
function doShip(){const woId=$('smWoId').value,qty=+$('smQty').value,defect=+$('smDefect').value||0;if(!qty||qty<=0){toast('출고수량 필요','err');return}const o=DB.g('wo').find(x=>x.id===woId);if(!o)return;const shipped=getShipped(woId);const remain=o.fq-shipped;if(qty>remain&&!confirm(`잔량(${remain})보다 출고수량(${qty})이 많습니다. 계속?`))return;
const rec={id:gid(),woId,wn:o.wn,cnm:o.cnm,pnm:o.pnm,qty,defect,good:qty-defect,inspNote:$('smInspNote').value,car:$('smCar').value,driver:$('smDriver').value,dlv:$('smDlv').value,memo:$('smMemo').value,dt:td(),tm:nw(),mgr:CU?CU.nm:''};
const logs=DB.g('shipLog');logs.push(rec);DB.s('shipLog',logs);
if(shipped+qty>=o.fq){const all=DB.g('wo');const i=all.findIndex(x=>x.id===woId);if(i>=0){all[i].status='출고완료';DB.s('wo',all);
  // 수주 연동: WO 출고완료 → 수주도 출고완료
  if(o.ordId){var _ords=getOrders();var _ord=_ords.find(function(x){return x.id===o.ordId});if(_ord&&_ord.status!=='출고완료'){_ord.status='출고완료';saveOrders(_ords)}}
}}
/* === 데이터 연계: 출고 → 매출 자동 등록 === */
try{
  var unitPrice=o.price||(o.amt&&o.fq?Math.round(o.amt/o.fq):0);
  var salesAmt=Math.round(unitPrice*qty);
  if(salesAmt>0){
    var sb=DB.g('sales');
    sb.push({id:gid(),dt:td(),cli:o.cnm,prod:o.pnm,qty:qty,price:unitPrice,amt:salesAmt,paid:0,payType:'미수',note:'출고자동등록 ('+o.wn+')',woId:woId,shipId:rec.id});
    DB.s('sales',sb);
    addLog('매출자동등록: '+o.cnm+' '+o.pnm+' '+fmt(salesAmt)+'원');
  }
}catch(e){console.log('매출연계오류:',e)}
/* === 데이터 연계: 출고 → 품질검사 기록 === */
try{
  if(defect>0){
    var qcRecs=DB.g('qcRecords');
    qcRecs.push({id:gid(),dt:td(),prod:o.pnm,proc:'출고검수',sampleCnt:qty,defectCnt:defect,defectRate:((defect/qty)*100).toFixed(1),result:defect/qty>0.05?'불합격':'합격',action:rec.inspNote||'',mgr:CU?CU.nm:'',woId:woId});
    DB.s('qcRecords',qcRecs);
  }
}catch(e){console.log('품질연계오류:',e)}
addLog(`출고: ${o.pnm} ${qty}매 → ${o.cnm}`);cMo('shipMo');rShipReady();if(typeof rDash==='function')rDash();if(typeof rWOList==='function')rWOList();if(typeof rPlan==='function')rPlan();if(typeof updateShipBadge==='function')updateShipBadge();toast(shipped+qty>=o.fq?'출고 완료!':'부분 출고 완료','ok')}
