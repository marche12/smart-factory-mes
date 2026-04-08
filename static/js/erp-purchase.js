try{populateVendorDropdowns();}catch(e){}
try{var _rptEl=$('rptDD');if(_rptEl)_rptEl.value=td();}catch(e){}

/* ===== ERP:purchase ===== */
/* ========== Utilities ========== */

/* ========== Navigation ========== */
function goTab(t,b){
  var parent=b?b.closest('.module-page')||document:document;
  parent.querySelectorAll('.hd-tab').forEach(x=>x.classList.remove('on'));
  if(b)b.classList.add('on');
  parent.querySelectorAll('.tc').forEach(c=>c.classList.remove('on'));
  var tab=$('t-'+t);if(tab)tab.classList.add('on');
  var tabFn={
    'income':typeof rIncome==='function'?rIncome:null,
    'stock':typeof rStock==='function'?rStock:null,
    'po':typeof rPO==='function'?rPO:null,
    'bom':typeof rBOM==='function'?rBOM:null,
    'sales':typeof rSl==='function'?rSl:null,
    'purchase':typeof rPr==='function'?rPr:null,
    'pl':typeof rPl==='function'?rPl:null,
    'tax':typeof rTx==='function'?rTx:null,
    'emp':typeof rEmp==='function'?rEmp:null,
    'att':typeof rAtt==='function'?rAtt:null,
    'pay':typeof rPay==='function'?rPay:null,
    'leave':typeof rLeave==='function'?rLeave:null,
    'trend':typeof renderTrend==='function'?renderTrend:null,
    'rank':typeof renderRank==='function'?renderRank:null,
    'cost':typeof renderCost==='function'?renderCost:null,
    'productivity':typeof renderProductivity==='function'?renderProductivity:null,
    'qc':typeof rQc==='function'?rQc:null,
    'equip':typeof rEq==='function'?rEq:null,
    'quote':typeof rQt==='function'?rQt:null,
    'approval':typeof rAp==='function'?rAp:null
  };
  if(tabFn[t])tabFn[t]();
}

/* ========== 1. 원자재 입고 ========== */
function rIncome(){
  const month=$('incMonth').value||td().slice(0,7);
  if(!$('incMonth').value)$('incMonth').value=month;
  const sch=($('incSch').value||'').toLowerCase();
  const all=DB.g('income');
  const filtered=all.filter(r=>{
    if(!r.dt.startsWith(month))return false;
    if(sch&&!r.vd.toLowerCase().includes(sch)&&!r.nm.toLowerCase().includes(sch))return false;
    return true;
  }).sort((a,b)=>b.dt>a.dt?1:-1);

  // Stats
  const monthAll=all.filter(r=>r.dt.startsWith(month));
  $('incCnt').textContent=monthAll.length;
  $('incAmt').textContent=fmt(monthAll.reduce((s,r)=>s+(r.qty*r.price||0),0))+'원';
  $('incLast').textContent=monthAll.length?monthAll.sort((a,b)=>b.dt>a.dt?1:-1)[0].dt:'-';
  $('incPend').textContent=monthAll.filter(r=>r.st==='미확인').length;

  $('incTbl').querySelector('tbody').innerHTML=filtered.map(r=>`<tr>
    <td>${r.dt}</td><td style="font-weight:700">${r.vd}</td><td>${bdCat(r.cat)}</td><td>${r.nm}</td><td>${r.spec||'-'}</td>
    <td style="text-align:right">${fmt(r.qty)} ${r.unit||''}</td><td style="text-align:right">${fmt(r.price)}</td>
    <td style="text-align:right;font-weight:700">${fmt(r.qty*r.price)}</td>
    <td>${r.st==='확인'?'<span class="bd bd-s">확인</span>':'<span class="bd bd-o">미확인</span>'}</td>
    <td><button class="btn btn-sm btn-o" onclick="eIncome('${r.id}')">수정</button>
    ${r.st!=='확인'?`<button class="btn btn-sm btn-s" onclick="confirmInc('${r.id}')">확인</button>`:''}
    <button class="btn btn-sm btn-d" onclick="dIncome('${r.id}')">삭제</button></td>
  </tr>`).join('')||'<tr><td colspan="10" class="empty-cell">입고 내역 없음</td></tr>';
}

function bdCat(c){
  const m={'종이':'bd-p','원단':'bd-o','잉크':'bd-s','접착제':'bd-w','박지':'bd-d','부자재':'bd-w'};
  return `<span class="bd ${m[c]||'bd-w'}">${c}</span>`;
}

function openIncM(){
  ['incId','incSpec','incNote'].forEach(x=>$(x).value='');
  $('incDt').value=td();$('incQty').value='';$('incPrice').value='';$('incAmount').value='';
  $('incVd').value='';$('incNm').value='';$('incCatSel').value='종이';$('incUnit').value='매';
  $('incMoT').textContent='입고 등록';oMo('incMo');
}

function eIncome(id){
  const r=DB.g('income').find(x=>x.id===id);if(!r)return;
  $('incId').value=r.id;$('incDt').value=r.dt;$('incCatSel').value=r.cat;
  $('incVd').value=r.vd;$('incNm').value=r.nm;$('incSpec').value=r.spec||'';
  $('incUnit').value=r.unit||'매';$('incQty').value=r.qty;$('incPrice').value=r.price;
  $('incAmount').value=fmt(r.qty*r.price);$('incNote').value=r.note||'';
  $('incMoT').textContent='입고 수정';oMo('incMo');
}

function calcIncAmt(){
  const q=+$('incQty').value||0,p=+$('incPrice').value||0;
  $('incAmount').value=fmt(q*p)+'원';
}

function saveIncome(){
  const dt=$('incDt').value,vd=$('incVd').value.trim(),nm=$('incNm').value.trim();
  const qty=+$('incQty').value,price=+$('incPrice').value;
  if(!dt){toast('입고일 필요','err');return}
  if(!vd){toast('거래처 필요','err');return}
  if(!nm){toast('품명 필요','err');return}
  if(!qty||qty<=0){toast('수량 필요','err');return}
  if(!price||price<0){toast('단가 필요','err');return}

  const id=$('incId').value||gid();
  const rec={id,dt,cat:$('incCatSel').value,vd,nm,spec:$('incSpec').value,
    unit:$('incUnit').value,qty,price,note:$('incNote').value,st:'미확인',cat_at:nw()};

  const list=DB.g('income');
  const idx=list.findIndex(x=>x.id===id);
  if(idx>=0){rec.st=list[idx].st;list[idx]=rec}else list.push(rec);
  DB.s('income',list);

  // 재고에 자동 반영 (입고 시 재고 증가)
  if(idx<0) autoUpdateStock(rec);

  cMo('incMo');rIncome();toast('저장 완료','ok');
}

function autoUpdateStock(rec){
  const stocks=DB.g('stock');
  const exist=stocks.find(s=>s.cat===rec.cat&&s.nm===rec.nm&&s.spec===(rec.spec||''));
  if(exist){
    exist.qty=(exist.qty||0)+rec.qty;
    exist.price=rec.price;
    exist.vd=rec.vd;
    exist.updated=nw();
  }else{
    stocks.push({id:gid(),cat:rec.cat,nm:rec.nm,spec:rec.spec||'',unit:rec.unit||'매',
      qty:rec.qty,safe:0,price:rec.price,vd:rec.vd,loc:'',note:'',updated:nw()});
  }
  DB.s('stock',stocks);
}

function confirmInc(id){
  const list=DB.g('income');
  const idx=list.findIndex(x=>x.id===id);
  if(idx>=0){list[idx].st='확인';DB.s('income',list);rIncome();toast('확인 완료','ok')}
}

function dIncome(id){
  if(!confirm('삭제하시겠습니까?'))return;
  DB.s('income',DB.g('income').filter(x=>x.id!==id));rIncome();toast('삭제','ok');
}

function exportIncCSV(){
  const all=DB.g('income');
  let csv='\uFEFF입고일,거래처,구분,품명,규격,수량,단위,단가,금액,상태\n';
  all.forEach(r=>{csv+=`${r.dt},${r.vd},${r.cat},${r.nm},${r.spec||''},${r.qty},${r.unit||''},${r.price},${r.qty*r.price},${r.st}\n`});
  const b=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='입고내역_'+td()+'.csv';a.click();toast('내보내기 완료','ok');
}

// 입고 자동완성
function acIncVd(v){
  const l=$('acIncVdL');
  if(!v||v.length<1){l.classList.add('hidden');return}
  // MES 거래처 + 입고 거래처 통합
  const clis=DB.g('cli').map(c=>c.nm);
  const incVds=[...new Set(DB.g('income').map(r=>r.vd))];
  const all=[...new Set([...clis,...incVds])].filter(n=>n.toLowerCase().includes(v.toLowerCase()));
  if(!all.length){l.classList.add('hidden');return}
  l.innerHTML=all.slice(0,8).map(n=>{var sn=n.replace(/'/g,"&#39;");return`<div class="ac-i" onclick="$('incVd').value='${sn}';$('acIncVdL').classList.add('hidden')">${n}</div>`}).join('');
  l.classList.remove('hidden');
}

function acIncNm(v){
  const l=$('acIncNmL');
  if(!v||v.length<1){l.classList.add('hidden');return}
  const stocks=DB.g('stock').filter(s=>s.nm.toLowerCase().includes(v.toLowerCase()));
  if(!stocks.length){l.classList.add('hidden');return}
  l.innerHTML=stocks.slice(0,8).map(s=>`<div class="ac-i" onclick="selIncMat('${s.id}')">${s.nm} <span style="color:var(--txt2);font-size:11px">${s.spec||''} (${s.cat})</span></div>`).join('');
  l.classList.remove('hidden');
}

function selIncMat(id){
  const s=DB.g('stock').find(x=>x.id===id);if(!s)return;
  $('incNm').value=s.nm;$('incSpec').value=s.spec||'';$('incCatSel').value=s.cat;
  $('incUnit').value=s.unit||'매';$('incPrice').value=s.price||'';
  if(s.vd)$('incVd').value=s.vd;
  calcIncAmt();$('acIncNmL').classList.add('hidden');
}

/* ========== 2. 재고 현황 ========== */
function rStock(){
  const cat=$('stkCat').value;
  const sch=($('stkSch').value||'').toLowerCase();
  const lowOnly=$('stkLowOnly').checked;
  const all=DB.g('stock');
  const filtered=all.filter(s=>{
    if(cat&&s.cat!==cat)return false;
    if(sch&&!s.nm.toLowerCase().includes(sch))return false;
    if(lowOnly&&!(s.safe>0&&s.qty<=s.safe))return false;
    return true;
  });

  const lowCnt=all.filter(s=>s.safe>0&&s.qty<=s.safe).length;
  const dangerCnt=all.filter(s=>s.safe>0&&s.qty<=s.safe*0.5).length;
  const idleCnt=all.filter(s=>s.safe>0&&s.qty>s.safe*5).length;
  $('stkTotal').textContent=all.length;
  $('stkLow').textContent=lowCnt;
  $('stkValue').textContent=fmt(all.reduce((s,r)=>s+(r.qty||0)*(r.price||0),0))+'원';
  $('stkUpdate').textContent=all.length?all.sort((a,b)=>(b.updated||'')>(a.updated||'')?1:-1)[0].updated||'-':'-';
  // Risk alerts
  var ra=$('stkRiskAlerts');if(ra){
    if(dangerCnt+lowCnt+idleCnt===0){ra.innerHTML=''}
    else{
      ra.innerHTML='<div class="risk-grid">'+
        (dangerCnt>0?'<div class="risk-card danger"><div class="risk-l">⚠ 즉시 발주 필요</div><div class="risk-cnt">'+dangerCnt+'</div><div class="risk-foot">안전재고의 50% 미만</div></div>':'')+
        (lowCnt-dangerCnt>0?'<div class="risk-card warn"><div class="risk-l">⚡ 부족 임박</div><div class="risk-cnt">'+(lowCnt-dangerCnt)+'</div><div class="risk-foot">안전재고 이하</div></div>':'')+
        (idleCnt>0?'<div class="risk-card ok"><div class="risk-l">📦 과잉 재고</div><div class="risk-cnt">'+idleCnt+'</div><div class="risk-foot">안전재고의 5배 초과</div></div>':'')+
        '</div>';
    }
  }

  $('stkTbl').querySelector('tbody').innerHTML=filtered.map(s=>{
    const isLow=s.safe>0&&s.qty<=s.safe;
    const pct=s.safe>0?Math.min(100,Math.round(s.qty/s.safe*100)):100;
    const color=pct<=50?'var(--dan)':pct<=100?'var(--wrn)':'var(--suc)';
    return `<tr style="${isLow?'background:var(--dan-l)':''}">
      <td>${bdCat(s.cat)}</td><td style="font-weight:700">${s.nm}</td><td>${s.spec||'-'}</td><td>${s.unit||'-'}</td>
      <td style="text-align:right"><div style="font-weight:700;font-size:14px;${isLow?'color:var(--dan)':''}">${fmt(s.qty)}</div>
        <div class="stk-bar" style="margin-top:3px"><div class="fill" style="width:${Math.min(pct,100)}%;background:${color}"></div></div>
      </td>
      <td style="text-align:right">${s.safe>0?fmt(s.safe):'-'}</td>
      <td>${isLow?'<span class="bd bd-d">부족</span>':s.safe>0?'<span class="bd bd-s">정상</span>':'<span class="bd bd-w">미설정</span>'}</td>
      <td style="text-align:right">${fmt(s.price)}</td><td>${s.vd||'-'}</td>
      <td><button class="btn btn-sm btn-o" onclick="eStock('${s.id}')">수정</button>
        <button class="btn btn-sm btn-d" onclick="dStock('${s.id}')">삭제</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="10" class="empty-cell">자재 없음</td></tr>';
}

function openStkM(){
  ['stkId','stkNm','stkSpec','stkQty','stkSafe','stkPrice','stkVd','stkLoc','stkNote'].forEach(x=>$(x).value='');
  $('stkCatSel').value='종이';$('stkUnitSel').value='매';
  $('stkMoT').textContent='자재 등록';oMo('stkMo');
}

function eStock(id){
  const s=DB.g('stock').find(x=>x.id===id);if(!s)return;
  $('stkId').value=s.id;$('stkCatSel').value=s.cat;$('stkNm').value=s.nm;
  $('stkSpec').value=s.spec||'';$('stkUnitSel').value=s.unit||'매';
  $('stkQty').value=s.qty;$('stkSafe').value=s.safe||'';$('stkPrice').value=s.price||'';
  $('stkVd').value=s.vd||'';$('stkLoc').value=s.loc||'';$('stkNote').value=s.note||'';
  $('stkMoT').textContent='자재 수정';oMo('stkMo');
}

function saveStock(){
  const nm=$('stkNm').value.trim();
  if(!nm){toast('자재명 필요','err');return}
  const id=$('stkId').value||gid();
  const rec={id,cat:$('stkCatSel').value,nm,spec:$('stkSpec').value,unit:$('stkUnitSel').value,
    qty:+$('stkQty').value||0,safe:+$('stkSafe').value||0,price:+$('stkPrice').value||0,
    vd:$('stkVd').value,loc:$('stkLoc').value,note:$('stkNote').value,updated:nw()};
  const list=DB.g('stock');
  const idx=list.findIndex(x=>x.id===id);
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('stock',list);cMo('stkMo');rStock();toast('저장 완료','ok');
}

function dStock(id){if(!confirm('삭제?'))return;DB.s('stock',DB.g('stock').filter(x=>x.id!==id));rStock();toast('삭제','ok')}

function acStkVd(v){
  const l=$('acStkVdL');
  if(!v){l.classList.add('hidden');return}
  const clis=DB.g('cli').map(c=>c.nm);
  const vds=[...new Set(DB.g('income').map(r=>r.vd))];
  const all=[...new Set([...clis,...vds])].filter(n=>n.toLowerCase().includes(v.toLowerCase()));
  if(!all.length){l.classList.add('hidden');return}
  l.innerHTML=all.slice(0,8).map(n=>{var sn=n.replace(/'/g,"&#39;");return`<div class="ac-i" onclick="$('stkVd').value='${sn}';$('acStkVdL').classList.add('hidden')">${n}</div>`}).join('');
  l.classList.remove('hidden');
}

/* ========== 3. 구매 발주서 ========== */
let poItemList=[];

function rPO(){
  const month=$('poMonth').value||td().slice(0,7);
  if(!$('poMonth').value)$('poMonth').value=month;
  const st=$('poSt').value;
  const all=DB.g('po');
  const filtered=all.filter(r=>{
    if(!r.dt.startsWith(month))return false;
    if(st&&r.st!==st)return false;
    return true;
  }).sort((a,b)=>b.dt>a.dt?1:-1);

  const monthAll=all.filter(r=>r.dt.startsWith(month));
  $('poCnt').textContent=monthAll.length;
  $('poAmt').textContent=fmt(monthAll.reduce((s,r)=>s+(r.total||0),0))+'원';
  $('poPend').textContent=monthAll.filter(r=>r.st==='발주완료'||r.st==='부분입고').length;
  $('poDone').textContent=monthAll.filter(r=>r.st==='입고완료').length;

  $('poTbl').querySelector('tbody').innerHTML=filtered.map(r=>{
    const stBd=r.st==='입고완료'?'bd-s':r.st==='작성중'?'bd-w':r.st==='부분입고'?'bd-o':'bd-p';
    return `<tr>
      <td style="font-weight:700">${r.num}</td><td>${r.dt}</td><td style="font-weight:700">${r.vd}</td>
      <td style="text-align:center">${(r.items||[]).length}</td>
      <td style="text-align:right;font-weight:700">${fmt(r.total)}</td><td>${r.due||'-'}</td>
      <td><span class="bd ${stBd}">${r.st}</span></td>
      <td><button class="btn btn-sm btn-p" onclick="viewPO('${r.id}')">보기</button>
        <button class="btn btn-sm btn-o" onclick="poToIncome('${r.id}')" title="입고">입고</button> <button class="btn btn-sm btn-o" onclick="ePO('${r.id}')">수정</button>
        <button class="btn btn-sm btn-d" onclick="dPO('${r.id}')">삭제</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="8" class="empty-cell">발주 내역 없음</td></tr>';
}

function genPoNum(){
  const d=td().replace(/-/g,'');
  const cnt=DB.g('po').filter(r=>r.num&&r.num.startsWith('PO'+d)).length;
  return 'PO'+d+String(cnt+1).padStart(3,'0');
}

function openPoM(){
  $('poId').value='';$('poNum').value=genPoNum();$('poDt').value=td();$('poDue').value='';
  $('poVd').value='';$('poMgr').value='';$('poNote').value='';$('poStSel').value='작성중';
  poItemList=[{nm:'',spec:'',unit:'매',qty:0,price:0}];
  renPoItems();$('poMoT').textContent='구매 발주서 작성';oMo('poMo');
}

function ePO(id){
  const r=DB.g('po').find(x=>x.id===id);if(!r)return;
  $('poId').value=r.id;$('poNum').value=r.num;$('poDt').value=r.dt;$('poDue').value=r.due||'';
  $('poVd').value=r.vd;$('poMgr').value=r.mgr||'';$('poNote').value=r.note||'';$('poStSel').value=r.st;
  poItemList=(r.items||[]).map(x=>({...x}));
  renPoItems();$('poMoT').textContent='발주서 수정';oMo('poMo');
}

function addPoItem(){poItemList.push({nm:'',spec:'',unit:'매',qty:0,price:0});renPoItems()}

function renPoItems(){
  $('poItems').innerHTML=poItemList.map((it,i)=>`<tr>
    <td><input type="text" value="${it.nm}" onchange="poItemList[${i}].nm=this.value" style="width:100%;padding:5px;border:1px solid var(--bdr);font-size:12px"></td>
    <td><input type="text" value="${it.spec||''}" onchange="poItemList[${i}].spec=this.value" style="width:80px;padding:5px;border:1px solid var(--bdr);font-size:12px"></td>
    <td><select onchange="poItemList[${i}].unit=this.value" style="padding:5px;border:1px solid var(--bdr);font-size:12px">
      ${['매','R','kg','L','EA','Box'].map(u=>`<option ${it.unit===u?'selected':''}>${u}</option>`).join('')}</select></td>
    <td><input type="number" value="${it.qty||''}" onchange="poItemList[${i}].qty=+this.value;renPoItems()" style="width:70px;padding:5px;border:1px solid var(--bdr);font-size:12px;text-align:right"></td>
    <td><input type="number" value="${it.price||''}" onchange="poItemList[${i}].price=+this.value;renPoItems()" style="width:80px;padding:5px;border:1px solid var(--bdr);font-size:12px;text-align:right"></td>
    <td style="text-align:right;font-weight:700;font-size:12px">${fmt((it.qty||0)*(it.price||0))}</td>
    <td><button class="btn btn-sm btn-d" onclick="poItemList.splice(${i},1);renPoItems()">×</button></td>
  </tr>`).join('');
  const total=poItemList.reduce((s,it)=>s+(it.qty||0)*(it.price||0),0);
  $('poTotal').value=fmt(total)+'원';
}

function savePO(){
  const vd=$('poVd').value.trim();
  if(!vd){toast('거래처 필요','err');return}
  if(!poItemList.some(it=>it.nm)){toast('품목 1개 이상 필요','err');return}

  const id=$('poId').value||gid();
  const total=poItemList.reduce((s,it)=>s+(it.qty||0)*(it.price||0),0);
  const rec={id,num:$('poNum').value,dt:$('poDt').value,due:$('poDue').value,
    vd,mgr:$('poMgr').value,items:poItemList.filter(it=>it.nm),total,
    st:$('poStSel').value,note:$('poNote').value,cat:nw()};

  const list=DB.g('po');
  const idx=list.findIndex(x=>x.id===id);
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('po',list);cMo('poMo');rPO();toast('저장 완료','ok');
}

function dPO(id){if(!confirm('삭제?'))return;DB.s('po',DB.g('po').filter(x=>x.id!==id));rPO();toast('삭제','ok')}

function viewPO(id){
  const r=DB.g('po').find(x=>x.id===id);if(!r)return;
  printPODoc(r);
}

function printPO(){
  const vd=$('poVd').value.trim();
  if(!vd){toast('거래처 먼저 입력','err');return}
  const total=poItemList.reduce((s,it)=>s+(it.qty||0)*(it.price||0),0);
  const r={num:$('poNum').value,dt:$('poDt').value,due:$('poDue').value,vd,mgr:$('poMgr').value,items:poItemList.filter(it=>it.nm),total,note:$('poNote').value};
  printPODoc(r);
}

function printPODoc(r){
  const co=DB.g1('ino_co')||DB.g1('co')||{nm:'이노패키지',addr:'',tel:'',fax:''};
  let rows=r.items.map((it,i)=>`<tr><td>${i+1}</td><td>${it.nm}</td><td>${it.spec||''}</td><td>${it.unit||''}</td><td style="text-align:right">${fmt(it.qty)}</td><td style="text-align:right">${fmt(it.price)}</td><td style="text-align:right;font-weight:700">${fmt((it.qty||0)*(it.price||0))}</td></tr>`).join('');
  const w=window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>발주서</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Nanum Gothic','Malgun Gothic',sans-serif;font-size:12px;padding:20mm}
  table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:6px 8px;font-size:11px}th{background:#E5E7EB;font-weight:700}
  .title{text-align:center;font-size:22px;font-weight:800;margin-bottom:20px;letter-spacing:4px}
  .info{display:flex;justify-content:space-between;margin-bottom:16px;font-size:12px}
  .info div{line-height:1.8}
  .total{text-align:right;font-size:16px;font-weight:800;margin-top:12px}
  @media print{@page{size:A4;margin:15mm}}</style></head><body>
  <div class="title">구 매 발 주 서</div>
  <div class="info">
    <div><b>수신:</b> ${r.vd}<br><b>발주번호:</b> ${r.num}<br><b>발주일:</b> ${r.dt}<br><b>납기:</b> ${r.due||'협의'}</div>
    <div style="text-align:right"><b>${co.nm}</b><br>${co.addr||''}<br>TEL: ${co.tel||''} / FAX: ${co.fax||''}<br>담당: ${r.mgr||''}</div>
  </div>
  <table><thead><tr><th>No</th><th>품명</th><th>규격</th><th>단위</th><th>수량</th><th>단가</th><th>금액</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="total">합계: ${fmt(r.total)} 원</div>
  ${r.note?`<div style="margin-top:16px;padding:10px;border:1px solid #ccc"><b>비고:</b> ${r.note}</div>`:''}
  <div style="margin-top:40px;text-align:center;font-size:11px;color:#666">상기와 같이 발주합니다.</div>
  </body></html>`);
  w.document.close();setTimeout(()=>w.print(),300);
}

function acPoVd(v){
  const l=$('acPoVdL');
  if(!v){l.classList.add('hidden');return}
  const clis=DB.g('cli').map(c=>c.nm);
  const all=[...new Set(clis)].filter(n=>n.toLowerCase().includes(v.toLowerCase()));
  if(!all.length){l.classList.add('hidden');return}
  l.innerHTML=all.slice(0,8).map(n=>{var sn=n.replace(/'/g,"&#39;");return`<div class="ac-i" onclick="$('poVd').value='${sn}';$('acPoVdL').classList.add('hidden')">${n}</div>`}).join('');
  l.classList.remove('hidden');
}

function exportPoCSV(){
  const all=DB.g('po');
  let csv='\uFEFF발주번호,발주일,거래처,품목수,총금액,납기,상태\n';
  all.forEach(r=>{csv+=`${r.num},${r.dt},${r.vd},${(r.items||[]).length},${r.total},${r.due||''},${r.st}\n`});
  const b=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='발주내역_'+td()+'.csv';a.click();toast('내보내기 완료','ok');
}

/* ========== 4. BOM 관리 ========== */
let bomItemList=[];

function rBOM(){
  const sch=($('bomSch').value||'').toLowerCase();
  const all=DB.g('bom');
  const filtered=all.filter(r=>!sch||r.prod.toLowerCase().includes(sch));

  $('bomCnt').textContent=all.length;
  const allPrices=all.map(r=>(r.items||[]).reduce((s,it)=>s+(it.qty||0)*(it.price||0),0));
  $('bomAvg').textContent=all.length?fmt(Math.round(allPrices.reduce((s,v)=>s+v,0)/all.length))+'원':'0원';
  $('bomCalc').textContent=all.filter(r=>(r.items||[]).length>0).length;

  $('bomTbl').querySelector('tbody').innerHTML=filtered.map(r=>{
    const matCost=(r.items||[]).reduce((s,it)=>s+(it.qty||0)*(it.price||0),0);
    const unitCost=r.baseQty?Math.round(matCost/r.baseQty):0;
    return `<tr>
      <td style="font-weight:700">${r.prod}</td><td>${r.cli||'-'}</td>
      <td style="text-align:center">${(r.items||[]).length}</td>
      <td style="text-align:right;font-weight:700">${fmt(matCost)}원</td>
      <td style="text-align:right">${fmt(unitCost)}원 / 개</td>
      <td>${r.updated||'-'}</td>
      <td><button class="btn btn-sm btn-p" onclick="viewBOM('${r.id}')">상세</button>
        <button class="btn btn-sm btn-o" onclick="eBOM('${r.id}')">수정</button>
        <button class="btn btn-sm btn-d" onclick="dBOM('${r.id}')">삭제</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="7" class="empty-cell">BOM 없음</td></tr>';
}

function openBomM(){
  $('bomId').value='';$('bomProd').value='';$('bomCli').value='';$('bomBaseQty').value=1000;$('bomNote').value='';
  bomItemList=[{cat:'종이',nm:'',spec:'',qty:0,unit:'매',price:0}];
  renBomItems();$('bomMoT').textContent='BOM 등록';oMo('bomMo');
}

function eBOM(id){
  const r=DB.g('bom').find(x=>x.id===id);if(!r)return;
  $('bomId').value=r.id;$('bomProd').value=r.prod;$('bomCli').value=r.cli||'';
  $('bomBaseQty').value=r.baseQty||1000;$('bomNote').value=r.note||'';
  bomItemList=(r.items||[]).map(x=>({...x}));
  renBomItems();$('bomMoT').textContent='BOM 수정';oMo('bomMo');
}

function addBomItem(){bomItemList.push({cat:'종이',nm:'',spec:'',qty:0,unit:'매',price:0});renBomItems()}

function renBomItems(){
  $('bomItems').innerHTML=bomItemList.map((it,i)=>`<tr>
    <td><select onchange="bomItemList[${i}].cat=this.value" style="padding:4px;border:1px solid var(--bdr);font-size:11px">
      ${['종이','원단','잉크','접착제','박지','부자재'].map(c=>`<option ${it.cat===c?'selected':''}>${c}</option>`).join('')}</select></td>
    <td><input type="text" value="${it.nm}" onchange="bomItemList[${i}].nm=this.value" style="width:100%;padding:4px;border:1px solid var(--bdr);font-size:11px"></td>
    <td><input type="text" value="${it.spec||''}" onchange="bomItemList[${i}].spec=this.value" style="width:70px;padding:4px;border:1px solid var(--bdr);font-size:11px"></td>
    <td><input type="number" value="${it.qty||''}" onchange="bomItemList[${i}].qty=+this.value;calcBomTotal()" style="width:60px;padding:4px;border:1px solid var(--bdr);font-size:11px;text-align:right"></td>
    <td><select onchange="bomItemList[${i}].unit=this.value" style="padding:4px;border:1px solid var(--bdr);font-size:11px">
      ${['매','R','kg','L','EA','Box'].map(u=>`<option ${it.unit===u?'selected':''}>${u}</option>`).join('')}</select></td>
    <td><input type="number" value="${it.price||''}" onchange="bomItemList[${i}].price=+this.value;calcBomTotal()" style="width:70px;padding:4px;border:1px solid var(--bdr);font-size:11px;text-align:right"></td>
    <td style="text-align:right;font-size:11px;font-weight:700">${fmt((it.qty||0)*(it.price||0))}</td>
    <td><button class="btn btn-sm btn-d" onclick="bomItemList.splice(${i},1);renBomItems()">×</button></td>
  </tr>`).join('');
  calcBomTotal();
}

function calcBomTotal(){
  const total=bomItemList.reduce((s,it)=>s+(it.qty||0)*(it.price||0),0);
  $('bomTotal').value=fmt(total)+'원';
}

function saveBOM(){
  const prod=$('bomProd').value.trim();
  if(!prod){toast('제품명 필요','err');return}
  if(!bomItemList.some(it=>it.nm)){toast('자재 1개 이상 필요','err');return}

  const id=$('bomId').value||gid();
  const rec={id,prod,cli:$('bomCli').value,baseQty:+$('bomBaseQty').value||1000,
    items:bomItemList.filter(it=>it.nm),note:$('bomNote').value,updated:nw()};

  const list=DB.g('bom');
  const idx=list.findIndex(x=>x.id===id);
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('bom',list);cMo('bomMo');rBOM();toast('저장 완료','ok');
}

function dBOM(id){if(!confirm('삭제?'))return;DB.s('bom',DB.g('bom').filter(x=>x.id!==id));rBOM();toast('삭제','ok')}

function viewBOM(id){
  const r=DB.g('bom').find(x=>x.id===id);if(!r)return;
  const matCost=(r.items||[]).reduce((s,it)=>s+(it.qty||0)*(it.price||0),0);
  const unitCost=r.baseQty?Math.round(matCost/r.baseQty):0;
  $('bomDetT').textContent=r.prod+' BOM 상세';
  $('bomDetC').innerHTML=`
    <div class="fr">
      <div class="fg"><label>제품명</label><div style="font-weight:700;font-size:16px">${r.prod}</div></div>
      <div class="fg"><label>거래처</label><div>${r.cli||'-'}</div></div>
      <div class="fg"><label>기준수량</label><div>${fmt(r.baseQty||1000)}</div></div>
    </div>
    <table class="dt" style="margin:12px 0">
      <thead><tr><th>구분</th><th>자재명</th><th>규격</th><th>소요량</th><th>단위</th><th>단가</th><th>비용</th></tr></thead>
      <tbody>${r.items.map(it=>`<tr><td>${bdCat(it.cat)}</td><td style="font-weight:700">${it.nm}</td><td>${it.spec||'-'}</td>
        <td style="text-align:right">${fmt(it.qty)}</td><td>${it.unit}</td><td style="text-align:right">${fmt(it.price)}</td>
        <td style="text-align:right;font-weight:700">${fmt((it.qty||0)*(it.price||0))}</td></tr>`).join('')}</tbody>
    </table>
    <div style="display:flex;gap:20px;justify-content:flex-end;font-size:14px">
      <div>자재비 합계: <b>${fmt(matCost)}원</b></div>
      <div>단위당 원가: <b>${fmt(unitCost)}원/개</b></div>
    </div>
    ${r.note?`<div style="margin-top:12px;padding:10px;background:var(--bg2);font-size:13px"><b>비고:</b> ${r.note}</div>`:''}`;
  oMo('bomDetMo');
}

function acBomProd(v){
  const l=$('acBomProdL');
  if(!v){l.classList.add('hidden');return}
  const prods=DB.g('prod').filter(p=>p.nm.toLowerCase().includes(v.toLowerCase()));
  if(!prods.length){l.classList.add('hidden');return}
  l.innerHTML=prods.slice(0,8).map(p=>{var sn=p.nm.replace(/'/g,"&#39;"),sc=(p.cnm||'').replace(/'/g,"&#39;");return`<div class="ac-i" onclick="$('bomProd').value='${sn}';$('bomCli').value='${sc}';$('acBomProdL').classList.add('hidden')">${p.nm} <span style="color:var(--txt2);font-size:11px">${p.cnm}</span></div>`}).join('');
  l.classList.remove('hidden');
}

/* ========== Init ========== */

