// Pagination & debounce
var _cliPage=0,_prodPage=0,_moldPage=0;
var _dCli=debounce(function(){_cliPage=0;rCli()},200);
var _dProd=debounce(function(){_prodPage=0;rProd()},200);
var _dMold=debounce(function(){_moldPage=0;rMold()},200);

// CLIENT
var _cliView='table';
function setCliView(v,btn){_cliView=v;_cliPage=0;if(btn){btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}var t=$('cliTableView'),g=$('cliGalleryView');if(t)t.style.display=v==='table'?'':'none';if(g)g.style.display=v==='gallery'?'':'none';rCli()}
function _cliDormant(c){return !!(c&&c.isDormant)}
function _cliFavorite(c){return !!(c&&c.isFavorite)}
function _cliSort(a,b){
  if(_cliFavorite(a)!==_cliFavorite(b))return _cliFavorite(a)?-1:1;
  if(_cliDormant(a)!==_cliDormant(b))return _cliDormant(a)?1:-1;
  return (a.nm||'').localeCompare(b.nm||'','ko');
}
function _cliStats(c){
  var sales=DB.g('sales').filter(s=>s.cli===c.nm);
  var totalAmt=sales.reduce((s,r)=>s+(r.amt||0),0);
  var unpaid=sales.reduce((s,r)=>s+Math.max(0,(r.amt||0)-(r.paid||0)),0);
  var lastDt=sales.length?sales.sort((a,b)=>b.dt>a.dt?1:-1)[0].dt:'-';
  // 등급: 월 평균 매출 100만↑ A, 30만↑ B, 그 외 C
  var monthlyAvg=totalAmt/12;
  var grade=monthlyAvg>=1000000?'A':monthlyAvg>=300000?'B':'C';
  return {total:totalAmt,unpaid:unpaid,last:lastDt,grade:grade,count:sales.length};
}
function cTypeBadge(c){var t=c.cType||'sales';if(t==='both')return'<span class="bd bd-p">매출</span> <span class="bd bd-d">매입</span>';if(t==='purchase')return'<span class="bd bd-d">매입</span>';return'<span class="bd bd-p">매출</span>'}
function rCli(page){
  if(typeof page==='number')_cliPage=page;
  refreshFolderSelects();
  const s=($('cliSch')?.value||'').toLowerCase();
  var tf=$('cliTypeFilter')?$('cliTypeFilter').value:'';
  var ff=$('cliFolderFilter')?$('cliFolderFilter').value:'';
  var df=$('cliDormantFilter')?$('cliDormantFilter').value:'active';
  var cs;
  // 초성 검색 지원
  var matchFn = function(c){
    if(!s) return true;
    if(typeof SearchUtil !== 'undefined'){
      return SearchUtil.match(c.nm, s) || SearchUtil.match(c.biz||'', s) || SearchUtil.match(c.tel||'', s);
    }
    return c.nm.toLowerCase().includes(s) || ((c.biz||'').includes(s));
  };
  if(tf==='vendor'){
    cs=DB.g('cli').filter(function(c){return c.isVendor && matchFn(c)});
  }else{
    cs=DB.g('cli').filter(matchFn);
    if(tf==='sales')cs=cs.filter(c=>c.cType==='sales'||c.cType==='both'||!c.cType);
    else if(tf==='purchase')cs=cs.filter(c=>c.cType==='purchase'||c.cType==='both');
  }
  if(df==='active')cs=cs.filter(function(c){return !_cliDormant(c)});
  else if(df==='dormant')cs=cs.filter(function(c){return _cliDormant(c)});
  // 폴더 필터
  if(ff === '__none__') cs = cs.filter(function(c){return !c.folderId});
  else if(ff) cs = cs.filter(function(c){return c.folderId === ff});
  cs=cs.slice().sort(_cliSort);
  // KPI
  var allCli=DB.g('cli');
  var salesCnt=allCli.filter(c=>c.cType==='sales'||c.cType==='both'||!c.cType).length;
  var purchCnt=allCli.filter(c=>c.cType==='purchase'||c.cType==='both').length;
  var withSales=DB.g('sales').reduce((acc,r)=>{acc[r.cli]=true;return acc},{});
  var activeCnt=Object.keys(withSales).length;
  var dormantCnt=allCli.filter(_cliDormant).length;
  var k=$('cliKpi');if(k)k.innerHTML=
    `<div class="sb blue"><div class="l">전체 거래처</div><div class="v">${allCli.length}</div></div>`+
    `<div class="sb green"><div class="l">매출처</div><div class="v">${salesCnt}</div></div>`+
    `<div class="sb orange"><div class="l">매입처</div><div class="v">${purchCnt}</div></div>`+
    `<div class="sb purple"><div class="l">활성 거래처</div><div class="v">${activeCnt}</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">휴면 ${dormantCnt}개</div></div>`;
  var pg=paginate(cs,_cliPage);var vis=pg.items;
  if(_cliView==='table'){
    if(tf==='vendor'){
      $('cliTbl').querySelector('tbody').innerHTML=vis.length?vis.map(function(c){
        var badges='';
        if(_cliFavorite(c))badges+='<span class="bd bd-p">★</span> ';
        if(_cliDormant(c))badges+='<span class="bd bd-w">휴면</span> ';
        return `<tr class="${_cliDormant(c)?'cli-row-dormant':''}" onclick="openCliLedgerPanel('${c.id}')" oncontextmenu="return openCliContextMenu(event,'${c.id}')"><td style="font-weight:700">${c.nm||'-'} ${badges}</td><td><span class="bd bd-e">인쇄소</span></td><td>${c.biz||'-'}</td><td>${c.addr||'-'}</td><td>${c.tel||'-'}</td><td><button class="btn btn-sm btn-o" onclick="event.stopPropagation();eCli('${c.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="event.stopPropagation();dCli('${c.id}')">삭제</button></td></tr>`;
      }).join(''):'<tr><td colspan="6" class="empty-cell">인쇄소 없음</td></tr>';
    }else{
      $('cliTbl').querySelector('tbody').innerHTML=vis.length?vis.map(function(c){
        var badges='';
        if(_cliFavorite(c))badges+='<span class="bd bd-p">★</span> ';
        if(_cliDormant(c))badges+='<span class="bd bd-w">휴면</span> ';
        return `<tr class="${_cliDormant(c)?'cli-row-dormant':''}" onclick="openCliLedgerPanel('${c.id}')" oncontextmenu="return openCliContextMenu(event,'${c.id}')"><td style="font-weight:700">${c.nm} ${badges}</td><td>${cTypeBadge(c)}</td><td>${c.biz||'-'}</td><td>${c.addr||'-'}</td><td>${c.tel||'-'}</td><td><button class="btn btn-sm btn-o" onclick="event.stopPropagation();eCli('${c.id}')">수정</button> <button class="btn btn-sm btn-o" onclick="event.stopPropagation();showCliHist('${c.id}')">이력</button> <button class="btn btn-sm btn-s" onclick="event.stopPropagation();openProdMWithCli('${c.id}')">품목</button> <button class="btn btn-sm btn-d" onclick="event.stopPropagation();dCli('${c.id}')">삭제</button></td></tr>`;
      }).join(''):'<tr><td colspan="6" class="empty-cell">거래처 없음</td></tr>';
    }
  }else{
    var html=vis.length?'<div class="gal">'+vis.map(c=>{var st=_cliStats(c);var ini=c.nm.charAt(0);var av=st.grade==='A'?'':st.grade==='B'?'gold':'';
      return `<div class="gal-card ${_cliDormant(c)?'cli-row-dormant':''}" onclick="openCliLedgerPanel('${c.id}')" oncontextmenu="return openCliContextMenu(event,'${c.id}')">
        <div class="gal-hd"><div class="gal-avatar ${av}">${ini}</div><div class="gal-info"><div class="gal-nm">${c.nm}</div><div class="gal-sub">${cTypeBadge(c)}</div></div><div class="gal-grade ${st.grade}">${st.grade}</div></div>
        <div class="gal-stats">
          <div><div class="gal-stat-l">총 매출</div><div class="gal-stat-v pri">${(st.total/10000).toFixed(0)}만</div></div>
          <div><div class="gal-stat-l">미수금</div><div class="gal-stat-v ${st.unpaid>0?'dan':'suc'}">${st.unpaid>0?(st.unpaid/10000).toFixed(0)+'만':'완납'}</div></div>
        </div>
        <div style="font-size:11px;color:var(--txt3);font-weight:600;margin-top:8px">최근 거래 ${st.last} · ${st.count}건${_cliDormant(c)?' · 휴면':''}${_cliFavorite(c)?' · 즐겨찾기':''}</div>
      </div>`;
    }).join('')+'</div>':'<div class="empty-state"><div class="msg">거래처 없음</div></div>';
    $('cliGalleryArea').innerHTML=html;
  }
  renderPager('cliPager',pg,function(p){_cliPage=p;rCli()});
}
async function checkBizStatusInline(){
  var biz=$('qcBiz').value.replace(/\D/g,'');
  var res=$('qcBizResult');
  if(biz.length!==10){res.innerHTML='<span style="color:#EF4444">사업자번호 10자리를 입력하세요</span>';return}
  var apiKey=DB.g1('bizApiKey');
  if(!apiKey){res.innerHTML='<span style="color:#F59E0B">설정에서 국세청 API키를 먼저 등록하세요</span>';return}
  res.innerHTML='<span style="color:#94A3B8">조회 중...</span>';
  try{
    var r=await fetch('https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({b_no:[biz]})});
    var d=await r.json();
    var item=d.data&&d.data[0];
    if(!item){res.innerHTML='<span style="color:#EF4444">조회 실패</span>';return}
    var taxType={'01':'일반과세자','02':'간이과세자','03':'면세사업자'};
    var statusMap={'01':'계속사업자','02':'휴업자','03':'폐업자'};
    var type=taxType[item.tax_type]||item.tax_type||'-';
    var status=statusMap[item.b_stt_cd]||item.b_stt||'-';
    var color=item.b_stt_cd==='01'?'#059669':item.b_stt_cd==='03'?'#EF4444':'#F59E0B';
    res.innerHTML='<span style="color:'+color+';font-weight:600">'+status+'</span> · <span style="color:#475569">'+type+'</span>';
  }catch(e){res.innerHTML='<span style="color:#EF4444">조회 오류: '+e.message+'</span>'}
}
async function checkBizStatus(){
  var biz=$('cmBiz').value.replace(/\D/g,'');
  var res=$('cmBizResult');
  if(biz.length!==10){res.innerHTML='<span style="color:#EF4444">사업자번호 10자리를 입력하세요</span>';return}
  var apiKey=DB.g1('bizApiKey');
  if(!apiKey){res.innerHTML='<span style="color:#F59E0B">⚙ 설정 → 국세청 API키 미등록 · <a href="#" onclick="goMod(\'mes-queue\');cMo(\'cliMo\');return false" style="color:#1E3A5F">설정으로 이동</a></span>';return}
  res.innerHTML='<span style="color:#94A3B8">조회 중...</span>';
  try{
    var r=await fetch('https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey='+encodeURIComponent(apiKey),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({b_no:[biz]})});
    var d=await r.json();
    var item=d.data&&d.data[0];
    if(!item){res.innerHTML='<span style="color:#EF4444">조회 실패</span>';return}
    var taxType={'01':'일반과세자','02':'간이과세자','03':'면세사업자'};
    var statusMap={'01':'계속사업자','02':'휴업자','03':'폐업자'};
    var type=taxType[item.tax_type]||item.tax_type||'-';
    var status=statusMap[item.b_stt_cd]||item.b_stt||'-';
    var color=item.b_stt_cd==='01'?'#059669':item.b_stt_cd==='03'?'#EF4444':'#F59E0B';
    res.innerHTML='<span style="color:'+color+';font-weight:600">'+status+'</span> · <span style="color:#475569">'+type+'</span>';
  }catch(e){res.innerHTML='<span style="color:#EF4444">조회 오류: '+e.message+'</span>'}
}
function fmtBiz(el){var v=el.value.replace(/\D/g,'');if(v.length>10)v=v.slice(0,10);if(v.length>5)v=v.slice(0,3)+'-'+v.slice(3,5)+'-'+v.slice(5);else if(v.length>3)v=v.slice(0,3)+'-'+v.slice(3);el.value=v}
function openCliM(){
  ['cmId','cmNm','cmBiz','cmCeo','cmBizType','cmEmail','cmPs','cmAd','cmTl','cmFx','cmNt','cmCreditLimit'].forEach(x=>{if($(x))$(x).value=''});
  $('cmSales').checked=true;$('cmPurch').checked=false;
  refreshFolderSelects();
  if($('cmFolder'))$('cmFolder').value='';
  if($('cmPayTerm'))$('cmPayTerm').value='';
  _cliPriceList = [];
  renderPriceListEdit();
  $('cliMoT').textContent='거래처 등록';oMo('cliMo');
}
function eCli(id){
  const c=DB.g('cli').find(x=>x.id===id);if(!c)return;
  $('cmId').value=c.id;$('cmNm').value=c.nm;$('cmBiz').value=c.biz||'';$('cmCeo').value=c.ceo||'';
  $('cmBizType').value=c.bizType||'';$('cmEmail').value=c.email||'';$('cmPs').value=c.ps||'';
  $('cmAd').value=c.addr||'';$('cmTl').value=c.tel||'';$('cmFx').value=c.fax||'';$('cmNt').value=c.nt||'';
  $('cmSales').checked=(c.cType==='sales'||c.cType==='both'||!c.cType);
  $('cmPurch').checked=(c.cType==='purchase'||c.cType==='both');
  refreshFolderSelects();
  if($('cmFolder'))$('cmFolder').value=c.folderId||'';
  if($('cmPayTerm'))$('cmPayTerm').value=c.payTerm||'';
  if($('cmCreditLimit'))$('cmCreditLimit').value=c.creditLimit||'';
  _cliPriceList = (c.priceList||[]).map(function(p){return {prod:p.prod, price:p.price}});
  renderPriceListEdit();
  $('cliMoT').textContent='거래처 수정';oMo('cliMo');
}
function saveCli(){
  const nm=$('cmNm').value.trim();if(!nm){toast('거래처명 필요','err');return}
  var isSales=$('cmSales').checked,isPurch=$('cmPurch').checked;
  if(!isSales&&!isPurch){toast('매출처 또는 매입처를 선택해주세요','err');return}
  var cType=isSales&&isPurch?'both':isSales?'sales':'purchase';
  const id=$('cmId').value||gid();
  const cs=DB.g('cli');const ei=cs.findIndex(x=>x.id===id);
  const folderId = $('cmFolder') ? $('cmFolder').value : '';
  const payTerm = $('cmPayTerm') ? $('cmPayTerm').value : '';
  const creditLimit = $('cmCreditLimit') ? (+$('cmCreditLimit').value || 0) : 0;
  const cleanPriceList = (_cliPriceList || []).filter(function(p){return p.prod && p.prod.trim() && p.price});
  const c={id,nm,biz:$('cmBiz').value,ceo:$('cmCeo').value,bizType:$('cmBizType').value,
    email:$('cmEmail').value,cType:cType,ps:$('cmPs').value,addr:$('cmAd').value,
    tel:$('cmTl').value,fax:$('cmFx').value,nt:$('cmNt').value,
    folderId: folderId, payTerm: payTerm, creditLimit: creditLimit,
    priceList: cleanPriceList,
    isDormant:ei>=0?!!cs[ei].isDormant:false,
    dormantAt:ei>=0?(cs[ei].dormantAt||''):'',
    isFavorite:ei>=0?!!cs[ei].isFavorite:false,
    cat:ei>=0?cs[ei].cat:nw()};
  if(ei>=0)cs[ei]=c;else cs.push(c);
  DB.s('cli',cs);cMo('cliMo');rCli();toast('저장','ok');
}
function dCli(id){if(!confirm('삭제?'))return;DB.s('cli',DB.g('cli').filter(x=>x.id!==id));rCli();toast('삭제','ok')}
function ensureCliContextMenu(){
  if($('cliCtxMenu'))return;
  var el=document.createElement('div');
  el.id='cliCtxMenu';
  el.className='cli-ctx-menu hidden';
  document.body.appendChild(el);
  document.addEventListener('click',closeCliContextMenu);
  document.addEventListener('contextmenu',function(e){if(!e.target.closest('#cliCtxMenu'))closeCliContextMenu();});
  window.addEventListener('scroll',closeCliContextMenu,true);
}
function openCliContextMenu(e,id){
  e.preventDefault();
  ensureCliContextMenu();
  var c=(DB.g('cli')||[]).find(function(x){return x.id===id;});
  if(!c)return false;
  var box=$('cliCtxMenu');
  box.innerHTML=''
    +'<button onclick="openCliLedgerPanel(\''+id+'\');closeCliContextMenu()">상세 확인</button>'
    +'<button onclick="toggleCliFavorite(\''+id+'\');closeCliContextMenu()">'+(_cliFavorite(c)?'즐겨찾기 해제':'즐겨찾기')+'</button>'
    +'<button onclick="toggleCliDormant(\''+id+'\');closeCliContextMenu()">'+(_cliDormant(c)?'휴면 해제':'휴면 처리')+'</button>'
    +'<button onclick="eCli(\''+id+'\');closeCliContextMenu()">수정</button>'
    +'<button class="danger" onclick="dCli(\''+id+'\');closeCliContextMenu()">삭제</button>';
  box.style.left=Math.min(e.clientX,window.innerWidth-190)+'px';
  box.style.top=Math.min(e.clientY,window.innerHeight-220)+'px';
  box.classList.remove('hidden');
  return false;
}
function closeCliContextMenu(){if($('cliCtxMenu'))$('cliCtxMenu').classList.add('hidden')}
function toggleCliFavorite(id){
  var cs=DB.g('cli')||[];
  var idx=cs.findIndex(function(c){return c.id===id});
  if(idx<0)return;
  cs[idx].isFavorite=!cs[idx].isFavorite;
  DB.s('cli',cs);rCli();
  toast(cs[idx].isFavorite?'즐겨찾기 등록':'즐겨찾기 해제','ok');
}
function toggleCliDormant(id){
  var cs=DB.g('cli')||[];
  var idx=cs.findIndex(function(c){return c.id===id});
  if(idx<0)return;
  var next=!cs[idx].isDormant;
  cs[idx].isDormant=next;
  cs[idx].dormantAt=next?td():'';
  DB.s('cli',cs);rCli();
  toast(next?'휴면 거래처로 이동':'휴면 해제','ok');
}
function _getCliTradeRows(cliNm,mode){
  var rows=[];
  var orders=(typeof getOrders==='function'?getOrders():DB.g('orders')||[]).filter(function(o){return o.cli===cliNm});
  var ships=(DB.g('shipLog')||[]).filter(function(r){return r.cnm===cliNm});
  var sales=(DB.g('sales')||[]).filter(function(r){return (r.cli||r.cnm)===cliNm});
  var purchases=(DB.g('purchase')||[]).filter(function(r){return (r.cli||r.cnm)===cliNm});
  orders.forEach(function(o){rows.push({dt:o.dt||'',kind:'수주',cli:cliNm,item:(o.items&&o.items[0]&&o.items[0].nm)||o.pnm||'',qty:(o.items||[]).reduce(function(s,it){return s+(Number(it.qty)||0)},0),amt:o.totalAmt||0,status:o.status||''});});
  ships.forEach(function(r){rows.push({dt:r.dt||'',kind:'출고',cli:cliNm,item:r.pnm||'',qty:r.qty||0,amt:0,status:r.orderId?'수주연결':'직접출고'});});
  sales.forEach(function(r){rows.push({dt:r.dt||'',kind:'매출',cli:cliNm,item:r.prod||r.pnm||'',qty:r.qty||0,amt:r.amt||0,status:Math.max(0,(r.amt||0)-(r.paid||0))>0?'미수':'완납'});});
  purchases.forEach(function(r){rows.push({dt:r.dt||'',kind:'매입',cli:cliNm,item:r.prod||r.pnm||'',qty:r.qty||0,amt:r.amt||0,status:r.note||''});});
  var today=td(),from='';
  if(mode==='today')from=today;
  else if(mode==='7d'){var d=new Date(today+'T00:00:00');d.setDate(d.getDate()-6);from=d.toISOString().slice(0,10);}
  else if(mode==='30d'){var m=new Date(today+'T00:00:00');m.setDate(m.getDate()-29);from=m.toISOString().slice(0,10);}
  if(from)rows=rows.filter(function(r){return r.dt&&r.dt>=from&&r.dt<=today});
  return rows.sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'')});
}
function openCliLedgerPanel(cid,mode){
  var c=(DB.g('cli')||[]).find(function(x){return x.id===cid});if(!c)return;
  mode=mode||'30d';
  var orders=(typeof getOrders==='function'?getOrders():DB.g('orders')||[]).filter(function(o){return o.cli===c.nm});
  var ships=(DB.g('shipLog')||[]).filter(function(r){return r.cnm===c.nm});
  var sales=(DB.g('sales')||[]).filter(function(r){return (r.cli||r.cnm)===c.nm});
  var purchases=(DB.g('purchase')||[]).filter(function(r){return (r.cli||r.cnm)===c.nm});
  var unpaid=sales.reduce(function(s,r){return s+Math.max(0,(r.amt||0)-(r.paid||0))},0);
  var totalSales=sales.reduce(function(s,r){return s+(r.amt||0)},0);
  var totalPurchase=purchases.reduce(function(s,r){return s+(r.amt||0)},0);
  var repeatItems=[...new Set(orders.flatMap(function(o){return (o.items||[]).map(function(it){return it.nm}).filter(Boolean);}))].slice(0,6);
  var deliveries=(c.deliveries||[]).slice(0,4);
  var rows=_getCliTradeRows(c.nm,mode);
  var html=''
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">거래처</div><div class="ux-sp-field-v" style="font-size:18px;font-weight:800">'+c.nm+(_cliDormant(c)?' <span class="bd bd-w">휴면</span>':'')+(_cliFavorite(c)?' <span class="bd bd-p">★ 즐겨찾기</span>':'')+'</div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">'
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">담당자</div><div class="ux-sp-field-v">'+(c.ps||c.ceo||'-')+'</div></div>'
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">전화</div><div class="ux-sp-field-v">'+(c.tel||'-')+'</div></div>'
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">사업자번호</div><div class="ux-sp-field-v">'+(c.biz||'-')+'</div></div>'
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">휴면 전환</div><div class="ux-sp-field-v">'+(c.dormantAt||'-')+'</div></div>'
    +'</div>'
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">주소</div><div class="ux-sp-field-v">'+(c.addr||'-')+'</div></div>'
    +'<div class="ux-sp-section"><div class="ux-sp-section-t">거래 원장 요약</div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">'
    +'<div style="padding:12px;background:#EFF6FF;border-radius:10px"><div style="font-size:11px;color:#1D4ED8;font-weight:700">매출 합계</div><div style="font-size:18px;font-weight:800;color:#1E3A8A">'+fmt(totalSales)+'원</div></div>'
    +'<div style="padding:12px;background:#FEF2F2;border-radius:10px"><div style="font-size:11px;color:#B91C1C;font-weight:700">미수 잔액</div><div style="font-size:18px;font-weight:800;color:#DC2626">'+fmt(unpaid)+'원</div></div>'
    +'<div style="padding:12px;background:#F0FDF4;border-radius:10px"><div style="font-size:11px;color:#166534;font-weight:700">매입 합계</div><div style="font-size:18px;font-weight:800;color:#166534">'+fmt(totalPurchase)+'원</div></div>'
    +'<div style="padding:12px;background:#FFF7ED;border-radius:10px"><div style="font-size:11px;color:#C2410C;font-weight:700">수주/출고</div><div style="font-size:18px;font-weight:800;color:#C2410C">'+orders.length+' / '+ships.length+'건</div></div>'
    +'</div></div>'
    +'<div class="ux-sp-section"><div class="ux-sp-section-t">반복 품목 / 납품처</div>'
    +'<div class="pack-chip-row">'+(repeatItems.length?repeatItems.map(function(nm){return '<span class="pack-chip">'+nm+'</span>';}).join(''):'<span class="pack-chip">반복 품목 없음</span>')+'</div>'
    +(deliveries.length?'<div style="margin-top:10px;display:grid;gap:6px">'+deliveries.map(function(d){return '<div style="padding:8px 10px;background:#F8FAFC;border-radius:8px;font-size:12px"><b>'+(d.nm||'-')+'</b>'+(d.addr?' · '+d.addr:'')+(d.mgr?' · '+d.mgr:'')+'</div>';}).join('')+'</div>':'<div style="font-size:12px;color:#94A3B8;margin-top:8px">등록된 납품처 없음</div>')
    +'</div>'
    +'<div class="ux-sp-section"><div class="ux-sp-section-t">거래 확인</div>'
    +'<div class="pack-chip-row">'
    +'<button class="pack-search-tag" onclick="openCliLedgerPanel(\''+cid+'\',\'today\')">오늘</button>'
    +'<button class="pack-search-tag" onclick="openCliLedgerPanel(\''+cid+'\',\'7d\')">7일</button>'
    +'<button class="pack-search-tag" onclick="openCliLedgerPanel(\''+cid+'\',\'30d\')">30일</button>'
    +'<button class="pack-search-tag" onclick="openCliLedgerPanel(\''+cid+'\',\'all\')">전체</button>'
    +'</div>'
    +(rows.length?'<div style="margin-top:10px;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden"><table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr style="background:#F8FAFC"><th style="padding:8px 10px;text-align:left">일자</th><th style="padding:8px 10px;text-align:left">구분</th><th style="padding:8px 10px;text-align:left">품목</th><th style="padding:8px 10px;text-align:right">수량/금액</th></tr></thead><tbody>'+rows.slice(0,12).map(function(r){return '<tr><td style="padding:8px 10px;border-top:1px solid #F1F5F9">'+(r.dt||'-')+'</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9;font-weight:700">'+r.kind+'</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9">'+(r.item||'-')+'<div style="font-size:11px;color:#94A3B8">'+(r.status||'')+'</div></td><td style="padding:8px 10px;border-top:1px solid #F1F5F9;text-align:right">'+(r.amt?fmt(r.amt)+'원':fmt(r.qty||0)+'매')+'</td></tr>';}).join('')+'</tbody></table></div>':'<div style="font-size:12px;color:#94A3B8;margin-top:8px">선택 기간 거래 내역이 없습니다.</div>')
    +'</div>'
    +'<div class="ux-sp-section"><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">'
    +'<button class="btn btn-p" onclick="eCli(\''+cid+'\');if(window.UXAdv)UXAdv.closeSidePanel()">거래처 수정</button>'
    +'<button class="btn btn-o" onclick="showCliHist(\''+cid+'\');if(window.UXAdv)UXAdv.closeSidePanel()">이력 모달</button>'
    +'<button class="btn btn-o" onclick="openProdMWithCli(\''+cid+'\');if(window.UXAdv)UXAdv.closeSidePanel()">품목 등록</button>'
    +'<button class="btn btn-o" onclick="openTradeDigestPanel(\''+cid+'\')">전체 거래 확인</button>'
    +'</div></div>';
  if(window.UXAdv&&typeof UXAdv.openSidePanel==='function')UXAdv.openSidePanel(c.nm+' 원장',html);
  else showCliHist(cid);
}
var _tradeDigestState={mode:'today',cliId:''};
function _renderTradeDigestPanel(){
  var cliId=_tradeDigestState.cliId||'';
  var c=cliId?(DB.g('cli')||[]).find(function(x){return x.id===cliId;}):null;
  var cliNm=c?c.nm:'';
  var rows=cliNm?_getCliTradeRows(cliNm,_tradeDigestState.mode):[].concat(
    (DB.g('shipLog')||[]).map(function(r){return{dt:r.dt||'',kind:'출고',cli:r.cnm||'',item:r.pnm||'',qty:r.qty||0,amt:0,status:r.orderId?'수주연결':''};}),
    (DB.g('sales')||[]).map(function(r){return{dt:r.dt||'',kind:'매출',cli:r.cli||r.cnm||'',item:r.prod||r.pnm||'',qty:r.qty||0,amt:r.amt||0,status:Math.max(0,(r.amt||0)-(r.paid||0))>0?'미수':'완납'};}),
    (DB.g('purchase')||[]).map(function(r){return{dt:r.dt||'',kind:'매입',cli:r.cli||r.cnm||'',item:r.prod||r.pnm||'',qty:r.qty||0,amt:r.amt||0,status:r.note||''};}),
    ((typeof getOrders==='function'?getOrders():DB.g('orders')||[])).map(function(o){return{dt:o.dt||'',kind:'수주',cli:o.cli||'',item:(o.items&&o.items[0]&&o.items[0].nm)||'',qty:(o.items||[]).reduce(function(s,it){return s+(Number(it.qty)||0)},0),amt:o.totalAmt||0,status:o.status||''};})
  );
  if(!cliNm){
    var today=td(),from='';
    if(_tradeDigestState.mode==='today')from=today;
    else if(_tradeDigestState.mode==='7d'){var d=new Date(today+'T00:00:00');d.setDate(d.getDate()-6);from=d.toISOString().slice(0,10);}
    else if(_tradeDigestState.mode==='30d'){var m=new Date(today+'T00:00:00');m.setDate(m.getDate()-29);from=m.toISOString().slice(0,10);}
    if(from)rows=rows.filter(function(r){return r.dt&&r.dt>=from&&r.dt<=today});
    rows=rows.sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'')});
  }
  var totalAmt=rows.reduce(function(s,r){return s+(r.amt||0)},0);
  var html='<div class="ux-sp-field"><div class="ux-sp-field-l">조회 기준</div><div class="ux-sp-field-v">'+(cliNm?cliNm+' 거래 확인':'전체 거래 확인')+'</div></div>'
    +'<div class="pack-chip-row">'
    +'<button class="pack-search-tag" onclick="setTradeDigestMode(\'today\')">오늘</button>'
    +'<button class="pack-search-tag" onclick="setTradeDigestMode(\'7d\')">7일</button>'
    +'<button class="pack-search-tag" onclick="setTradeDigestMode(\'30d\')">30일</button>'
    +'<button class="pack-search-tag" onclick="setTradeDigestMode(\'all\')">전체</button>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px">'
    +'<div style="padding:12px;background:#EFF6FF;border-radius:10px"><div style="font-size:11px;color:#1D4ED8;font-weight:700">거래 건수</div><div style="font-size:18px;font-weight:800;color:#1E3A8A">'+rows.length+'건</div></div>'
    +'<div style="padding:12px;background:#F8FAFC;border-radius:10px"><div style="font-size:11px;color:#475569;font-weight:700">금액 합계</div><div style="font-size:18px;font-weight:800;color:#0F172A">'+fmt(totalAmt)+'원</div></div>'
    +'</div>'
    +(rows.length?'<div style="margin-top:12px;border:1px solid #E5E7EB;border-radius:10px;overflow:hidden"><table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr style="background:#F8FAFC"><th style="padding:8px 10px;text-align:left">일자</th><th style="padding:8px 10px;text-align:left">거래처</th><th style="padding:8px 10px;text-align:left">구분</th><th style="padding:8px 10px;text-align:left">품목</th><th style="padding:8px 10px;text-align:right">금액/수량</th></tr></thead><tbody>'+rows.slice(0,20).map(function(r){return '<tr><td style="padding:8px 10px;border-top:1px solid #F1F5F9">'+(r.dt||'-')+'</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9">'+(r.cli||cliNm||'-')+'</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9;font-weight:700">'+r.kind+'</td><td style="padding:8px 10px;border-top:1px solid #F1F5F9">'+(r.item||'-')+'<div style="font-size:11px;color:#94A3B8">'+(r.status||'')+'</div></td><td style="padding:8px 10px;border-top:1px solid #F1F5F9;text-align:right">'+(r.amt?fmt(r.amt)+'원':fmt(r.qty||0)+'매')+'</td></tr>';}).join('')+'</tbody></table></div>':'<div style="font-size:12px;color:#94A3B8;margin-top:10px">선택 기간 거래가 없습니다.</div>');
  if(window.UXAdv&&typeof UXAdv.openSidePanel==='function')UXAdv.openSidePanel(cliNm?cliNm+' 거래 확인':'전체 거래 확인',html);
}
function openTradeDigestPanel(cliId){
  _tradeDigestState={mode:'today',cliId:cliId||''};
  _renderTradeDigestPanel();
}
function setTradeDigestMode(mode){
  _tradeDigestState.mode=mode;
  _renderTradeDigestPanel();
}
// Client history + 납품처
function showCliHist(cid){
  const c=DB.g('cli').find(x=>x.id===cid);if(!c)return;
  const os=DB.g('wo').filter(o=>o.cid===cid||o.cnm===c.nm).sort((a,b)=>b.cat>a.cat?1:-1);
  $('cliHistT').textContent=c.nm+' 상세';

  // === 상단: 거래처 기본 정보 + 납품처 ===
  var headerHtml='<div style="background:#F8FAFC;border-radius:10px;padding:14px 16px;margin-bottom:14px">';
  headerHtml+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px">';
  headerHtml+='<div><span style="color:#64748B">담당자</span> <b>'+(c.contactNm||c.ceo||'-')+'</b></div>';
  headerHtml+='<div><span style="color:#64748B">전화</span> <b>'+(c.tel||'-')+'</b></div>';
  headerHtml+='<div style="grid-column:1/-1"><span style="color:#64748B">주소</span> <b>'+(c.addr||'-')+'</b></div>';
  headerHtml+='</div></div>';

  // === 상단: 납품처 리스트 ===
  var dlvHtml='';
  if(c.deliveries && c.deliveries.length>0){
    dlvHtml='<div style="margin-bottom:14px"><div class="card-t" style="font-size:13px;margin-bottom:8px">📦 납품처 ('+c.deliveries.length+'곳)</div>';
    dlvHtml+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">';
    c.deliveries.forEach(function(d){
      dlvHtml+='<div style="background:#fff;border:1px solid #E2E8F0;border-radius:8px;padding:12px;font-size:12px">';
      dlvHtml+='<div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#1E293B">'+(d.nm||'-')+'</div>';
      if(d.addr)dlvHtml+='<div style="color:#475569;margin-bottom:4px">📍 '+d.addr+'</div>';
      if(d.mgr)dlvHtml+='<div style="color:#64748B">👤 '+d.mgr+'</div>';
      if(d.tel)dlvHtml+='<div style="color:#64748B">📞 '+d.tel+'</div>';
      dlvHtml+='</div>';
    });
    dlvHtml+='</div></div>';
  }

  // === 작업 이력 ===
  var histHtml='<div class="card-t" style="font-size:13px;margin-bottom:8px">📋 작업 이력 ('+os.length+'건)</div>';
  histHtml+=os.length?
    '<table class="dt"><thead><tr><th>번호</th><th>제품</th><th>수량</th><th>출고일</th><th>진행</th><th>상태</th></tr></thead><tbody>'+
    os.map(function(o){return '<tr><td>'+o.wn+'</td><td>'+o.pnm+'</td><td>'+o.fq+'</td><td>'+o.sd+'</td><td>'+progBar(o)+'</td><td>'+badge(o.status)+'</td></tr>'}).join('')+
    '</tbody></table>'
    :'<div class="empty-state"><div class="msg">작업 이력 없음</div></div>';

  $('cliHistC').innerHTML=headerHtml+dlvHtml+histHtml;
  oMo('cliHistMo');
}

// PRODUCT
let pProcs=[];
function genProdCode(clientName){
  if(!clientName)return '';
  var prefix=clientName.replace(/\s/g,'').slice(0,2).toUpperCase();
  var prods=DB.g('prod').filter(function(p){return p.code&&p.code.startsWith(prefix+'-')});
  var maxNum=0;
  prods.forEach(function(p){var m=p.code.match(/-(\d+)$/);if(m){var n=parseInt(m[1],10);if(n>maxNum)maxNum=n}});
  return prefix+'-'+String(maxNum+1).padStart(3,'0');
}
var _prodView='table';
function setProdView(v,btn){_prodView=v;_prodPage=0;if(btn){btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}var t=$('prodTableView'),g=$('prodGalleryView');if(t)t.style.display=v==='table'?'':'none';if(g)g.style.display=v==='gallery'?'':'none';rProd()}
function rProd(page){
  if(typeof page==='number')_prodPage=page;
  const s=($('prodSch')?.value||'').toLowerCase();
  const ps=DB.g('prod').filter(p=>!s||p.nm.toLowerCase().includes(s)||p.cnm.toLowerCase().includes(s)||(p.code||'').toLowerCase().includes(s));
  // KPI
  var allProd=DB.g('prod');
  var withPrice=allProd.filter(p=>p.price>0).length;
  var clientCnt=Object.keys(allProd.reduce((a,p)=>{a[p.cnm]=true;return a},{})).length;
  var avgPrice=allProd.length?Math.round(allProd.reduce((s,p)=>s+(p.price||0),0)/allProd.length):0;
  var k=$('prodKpi');if(k)k.innerHTML=
    `<div class="sb blue"><div class="l">전체 품목</div><div class="v">${allProd.length}</div></div>`+
    `<div class="sb green"><div class="l">단가 등록</div><div class="v">${withPrice}</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">${allProd.length?Math.round(withPrice/allProd.length*100):0}%</div></div>`+
    `<div class="sb orange"><div class="l">평균 단가</div><div class="v">${avgPrice.toLocaleString()}<span style="font-size:14px">원</span></div></div>`+
    `<div class="sb purple"><div class="l">거래처 수</div><div class="v">${clientCnt}</div></div>`;
  var pg=paginate(ps,_prodPage);var vis=pg.items;
  if(_prodView==='table'){
    $('prodTbl').querySelector('tbody').innerHTML=vis.length?vis.map(p=>`<tr><td style="font-weight:700;color:var(--pri)">${p.code||'-'}</td><td style="font-weight:700">${p.nm}</td><td>${p.cnm}</td><td style="text-align:right">${p.price?p.price.toLocaleString()+'원':'-'}</td><td>${p.paper||'-'}</td><td>${p.spec||'-'}</td><td>${(p.procs||[]).map(x=>x.nm).join(' > ')}</td><td><button class="btn btn-sm btn-o" onclick="eProd('${p.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dProd('${p.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty-cell">품목 없음</td></tr>';
  }else{
    var woCounts=DB.g('wo').reduce(function(acc,w){acc[w.pnm]=(acc[w.pnm]||0)+1;return acc},{});
    var html=vis.length?'<div class="gal">'+vis.map(p=>{var ini=(p.code||p.nm).charAt(0);
      var orderCnt=woCounts[p.nm]||0;
      return `<div class="gal-card" onclick="eProd('${p.id}')">
        <div class="gal-hd"><div class="gal-avatar purple">${ini}</div><div class="gal-info"><div class="gal-nm">${p.nm}</div><div class="gal-sub">${p.cnm}</div></div></div>
        <div style="font-size:11px;color:var(--txt3);font-weight:600;margin-bottom:6px">${p.code||''}</div>
        <div class="gal-stats">
          <div><div class="gal-stat-l">단가</div><div class="gal-stat-v pri">${p.price?p.price.toLocaleString()+'원':'-'}</div></div>
          <div><div class="gal-stat-l">주문</div><div class="gal-stat-v">${orderCnt}건</div></div>
        </div>
        <div style="font-size:11px;color:var(--txt2);font-weight:600;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.paper||'-'}${p.spec?' / '+p.spec:''}</div>
      </div>`;
    }).join('')+'</div>':'<div class="empty-state"><div class="msg">품목 없음</div></div>';
    $('prodGalleryArea').innerHTML=html;
  }
  renderPager('prodPager',pg,function(p){_prodPage=p;rProd()});
}
function acPmCli(v){const l=$('acPmCliL');const cs=DB.g('cli').filter(c=>!v||!v.trim()||v.trim()===' '||c.nm.toLowerCase().includes(v.toLowerCase()));if(!cs.length){l.classList.add('hidden');return}l.innerHTML=cs.map(c=>{var sn=c.nm.replace(/'/g,"&#39;");return`<div class="ac-i" onclick="$('pmCli').value='${sn}';$('acPmCliL').classList.add('hidden');if(!$('pmCode').value||$('pmCode').value.indexOf('-')>0)$('pmCode').value=genProdCode('${sn}')">${c.nm}<span style="float:right;font-size:11px;color:var(--txt2)">${c.ps||''}</span></div>`}).join('');l.classList.remove('hidden')}
function openProdMWithCli(cid){const c=DB.g('cli').find(x=>x.id===cid);openProdM();if(c)$('pmCli').value=c.nm}
function openProdM(){['pmId','pmCode','pmPrice','pmCli','pmNm','pmPaper','pmSpec','pmFabric','pmFabricSpec','pmQM','pmQE','pmPrint','pmGold','pmMold','pmHand','pmNote','pmCaut'].forEach(x=>$(x).value='');pProcs=[];renPP();$('prodMoT').textContent='품목 등록';oMo('prodMo')}
function eProd(id){const p=DB.g('prod').find(x=>x.id===id);if(!p)return;$('pmId').value=p.id;$('pmCode').value=p.code||'';$('pmPrice').value=p.price||'';$('pmCli').value=p.cnm;$('pmNm').value=p.nm;$('pmPaper').value=p.paper||'';$('pmSpec').value=p.spec||'';$('pmFabric').value=p.fabric||'';$('pmFabricSpec').value=p.fabricSpec||'';$('pmQM').value=p.qm||'';$('pmQE').value=p.qe||'';$('pmPrint').value=p.ps||'';$('pmGold').value=p.gold||'';$('pmMold').value=p.mold||'';$('pmHand').value=p.hand||'';$('pmNote').value=p.nt||'';$('pmCaut').value=p.caut||'';pProcs=(p.procs||[]).map(x=>({...x}));renPP();$('prodMoT').textContent='품목 수정';oMo('prodMo')}
function addPP(nm){pProcs.push({nm,tp:'n',mt:'',vd:''});renPP()}
function renPP(){$('pmPL').innerHTML=pProcs.length===0?'<span style="color:var(--txt2);font-size:12px">공정 없음</span>':pProcs.map((p,i)=>`<span class="pt">${i+1}. ${p.nm}<span class="rm" onclick="pProcs.splice(${i},1);renPP()">&times;</span></span>`).join('')}
function saveProd(){const nm=$('pmNm').value.trim(),cn=$('pmCli').value.trim();if(!nm){toast('제품명 필요','err');return}if(!cn){toast('거래처명 필요','err');return}const id=$('pmId').value||gid();var autoCode=$('pmCode').value.trim();if(!autoCode)autoCode=genProdCode(cn);const ps=DB.g('prod');const ei=ps.findIndex(x=>x.id===id);const existing=ei>=0?ps[ei]:null;var newPaper=$('pmPaper').value.trim(),newSpec=$('pmSpec').value.trim(),newFabric=$('pmFabric').value.trim(),newFabricSpec=$('pmFabricSpec').value.trim();var keepPapers=existing&&existing.papers&&existing.papers.length>1&&!newPaper&&!newSpec;var keepFabrics=existing&&existing.fabrics&&existing.fabrics.length>1&&!newFabric&&!newFabricSpec;var papers=keepPapers?existing.papers:[{paper:newPaper,spec:newSpec,qm:+$('pmQM').value||0,qe:0}];var fabrics=keepFabrics?existing.fabrics:[{fabric:newFabric,fabricSpec:newFabricSpec,fabricQty:0,fabricExtra:0}];const p={id,code:autoCode,price:+$('pmPrice').value||0,cid:DB.g('cli').find(c=>c.nm===cn)?.id||'',cnm:cn,nm,paper:newPaper||(existing?existing.paper||'':''),spec:newSpec||(existing?existing.spec||'':''),fabric:newFabric||(existing?existing.fabric||'':''),fabricSpec:newFabricSpec||(existing?existing.fabricSpec||'':''),qm:+$('pmQM').value||0,qe:0,papers,fabrics,ps:$('pmPrint').value,procs:pProcs,gold:$('pmGold').value,mold:$('pmMold').value,hand:$('pmHand').value,nt:$('pmNote').value,caut:$('pmCaut').value};if(ei>=0)ps[ei]=p;else ps.push(p);DB.s('prod',ps);cMo('prodMo');rProd();toast('저장','ok')}
function dProd(id){if(!confirm('삭제?'))return;DB.s('prod',DB.g('prod').filter(x=>x.id!==id));rProd();toast('삭제','ok')}

// MOLD
function rMold(page){
  if(typeof page==='number')_moldPage=page;
  const s=($('moldSch')?.value||'').toLowerCase();
  const ms=DB.g('mold').filter(m=>!s||(m.no||'').toLowerCase().includes(s)||(m.pnm||'').toLowerCase().includes(s)||(m.cnm||'').toLowerCase().includes(s));
  var allMold=DB.g('mold');
  var inUse=allMold.filter(m=>m.st==='사용중').length;
  var idle=allMold.filter(m=>m.st==='보관중').length;
  var disposed=allMold.filter(m=>m.st==='폐기').length;
  var k=$('moldKpi');if(k)k.innerHTML=
    `<div class="sb blue"><div class="l">전체 목형</div><div class="v">${allMold.length}</div></div>`+
    `<div class="sb green"><div class="l">사용중</div><div class="v">${inUse}</div></div>`+
    `<div class="sb orange"><div class="l">보관중</div><div class="v">${idle}</div></div>`+
    `<div class="sb red"><div class="l">폐기</div><div class="v">${disposed}</div></div>`;
  var pg=paginate(ms,_moldPage);var vis=pg.items;
  $('moldTbl').querySelector('tbody').innerHTML=vis.length?vis.map(m=>`<tr><td style="font-weight:700">${m.no}</td><td>${m.pnm||'-'}</td><td>${m.cnm||'-'}</td><td>${m.loc||'-'}</td><td>${m.st}</td><td><button class="btn btn-sm btn-o" onclick="eMold('${m.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dMold('${m.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty-cell">목형 없음</td></tr>';
  renderPager('moldPager',pg,function(p){_moldPage=p;rMold()});
}
function openMoldM(){['mmId','mmNo','mmProd','mmCli','mmLoc','mmNt'].forEach(x=>$(x).value='');$('mmSt').value='사용중';$('moldMoT').textContent='목형 등록';oMo('moldMo')}
function eMold(id){const m=DB.g('mold').find(x=>x.id===id);if(!m)return;$('mmId').value=m.id;$('mmNo').value=m.no;$('mmProd').value=m.pnm||'';$('mmCli').value=m.cnm||'';$('mmLoc').value=m.loc||'';$('mmSt').value=m.st;$('mmNt').value=m.nt||'';$('moldMoT').textContent='목형 수정';oMo('moldMo')}
function saveMold(){const no=$('mmNo').value.trim();if(!no){toast('목형번호 필요','err');return}const id=$('mmId').value||gid();const ms=DB.g('mold');const ei=ms.findIndex(x=>x.id===id);const m={id,no,pnm:$('mmProd').value,cnm:$('mmCli').value,loc:$('mmLoc').value,st:$('mmSt').value,nt:$('mmNt').value,cat:ei>=0?ms[ei].cat:nw()};if(ei>=0)ms[ei]=m;else ms.push(m);DB.s('mold',ms);cMo('moldMo');rMold();toast('저장','ok')}
function dMold(id){if(!confirm('삭제?'))return;DB.s('mold',DB.g('mold').filter(x=>x.id!==id));rMold();toast('삭제','ok')}

// ===== 엑셀 업로드 (품목/목형) =====
var XLSX_FIELD_MAP={
  cli:{
    nm:['거래처명','거래처','업체명','업체','회사명','company','client','name'],
    biz:['사업자번호','사업자','사업자등록번호','bizno','business no'],
    ceo:['대표자','대표','ceo','representative'],
    tel:['전화','전화번호','연락처','tel','phone'],
    fax:['팩스','fax'],
    addr:['주소','address','사업장주소'],
    email:['이메일','email','e-mail'],
    cType:['유형','구분','type','거래유형'],
    note:['비고','메모','note','memo','설명']
  },
  prod:{
    code:['품목코드','코드','품번','자재코드','code','item code','품목번호'],
    nm:['품목명','품명','제품명','자재명','name','item','품목 이름','품목별칭'],
    cnm:['거래처','거래처명','업체','업체명','client','customer','매출처','매입처'],
    spec:['규격','사이즈','size','spec','치수'],
    paper:['종이','지종','용지','paper','재질'],
    price:['매출단가','매출단가1','판매가','단가','price','출고단가','매가'],
    cost:['매입단가','원가','cost','입고단가','매입가'],
    note:['비고','메모','note','memo','설명','description']
  },
  mold:{
    no:['목형번호','목형No','목형 번호','번호','no','mold no','코드'],
    pnm:['제품명','품목명','품명','name','item'],
    cnm:['거래처','거래처명','업체','client','customer'],
    loc:['보관위치','위치','location','보관'],
    st:['상태','status','state'],
    nt:['비고','메모','note','memo','설명']
  }
};
function _xlsxNorm(s){return String(s||'').toLowerCase().replace(/\s+/g,'').replace(/[._\-/()]/g,'')}
function _xlsxMapHeader(headers,fieldMap){
  var out={};
  Object.keys(fieldMap).forEach(function(k){
    var aliases=fieldMap[k].map(_xlsxNorm);
    for(var i=0;i<headers.length;i++){
      var h=_xlsxNorm(headers[i]);
      if(!h)continue;
      if(aliases.indexOf(h)>=0||aliases.some(function(a){return h===a||h.indexOf(a)>=0&&a.length>=2})){out[k]=i;break}
    }
  });
  return out;
}
function _xlsxReadFile(file,cb){
  if(typeof XLSX==='undefined'){toast('엑셀 라이브러리 로드 실패','err');return}
  var r=new FileReader();
  r.onload=function(e){
    try{
      var wb=XLSX.read(e.target.result,{type:'array'});
      var ws=wb.Sheets[wb.SheetNames[0]];
      var rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      cb(rows);
    }catch(err){toast('파일 읽기 실패: '+err.message,'err')}
  };
  r.readAsArrayBuffer(file);
}
function _xlsxFindHeaderRow(rows,fieldMap){
  // 상위 10행에서 가장 매핑이 많이 되는 행을 헤더로 본다
  var best={idx:0,score:0,map:{}};
  for(var i=0;i<Math.min(10,rows.length);i++){
    var m=_xlsxMapHeader(rows[i],fieldMap);
    var s=Object.keys(m).length;
    if(s>best.score){best={idx:i,score:s,map:m}}
  }
  return best;
}
function impProdXlsx(inp){
  var f=inp.files[0];if(!f)return;inp.value='';
  _xlsxReadFile(f,function(rows){
    if(!rows.length){toast('빈 파일','err');return}
    var hdr=_xlsxFindHeaderRow(rows,XLSX_FIELD_MAP.prod);
    if(!hdr.map.nm){toast('품목명 컬럼을 찾을 수 없음','err');return}
    var items=[];
    for(var i=hdr.idx+1;i<rows.length;i++){
      var r=rows[i];if(!r||!r.length)continue;
      var nm=String(r[hdr.map.nm]||'').trim();
      if(!nm)continue;
      var get=function(k){return hdr.map[k]!=null?r[hdr.map[k]]:''};
      var price=parseFloat(String(get('price')).replace(/[^\d.-]/g,''))||0;
      items.push({
        id:gid(),code:String(get('code')||'').trim()||genProdCode(String(get('cnm')||'미지정').trim()||'미지정'),
        nm:nm,cnm:String(get('cnm')||'').trim(),spec:String(get('spec')||'').trim(),
        paper:String(get('paper')||'').trim(),price:price,
        nt:String(get('note')||'').trim(),
        papers:[{paper:String(get('paper')||'').trim(),spec:String(get('spec')||'').trim(),qm:0,qe:0}],
        fabrics:[],procs:[]
      });
    }
    if(!items.length){toast('등록할 데이터가 없음','err');return}
    if(!confirm(items.length+'개 품목을 등록합니다. 계속할까요?\n(매핑 컬럼: '+Object.keys(hdr.map).join(', ')+')'))return;
    var ps=DB.g('prod');DB.s('prod',ps.concat(items));rProd();
    toast(items.length+'개 품목 등록 완료','ok');
  });
}
function impMoldXlsx(inp){
  var f=inp.files[0];if(!f)return;inp.value='';
  _xlsxReadFile(f,function(rows){
    if(!rows.length){toast('빈 파일','err');return}
    var hdr=_xlsxFindHeaderRow(rows,XLSX_FIELD_MAP.mold);
    if(!hdr.map.no){toast('목형번호 컬럼을 찾을 수 없음','err');return}
    var items=[];
    for(var i=hdr.idx+1;i<rows.length;i++){
      var r=rows[i];if(!r||!r.length)continue;
      var no=String(r[hdr.map.no]||'').trim();
      if(!no)continue;
      var get=function(k){return hdr.map[k]!=null?r[hdr.map[k]]:''};
      items.push({
        id:gid(),no:no,
        pnm:String(get('pnm')||'').trim(),
        cnm:String(get('cnm')||'').trim(),
        loc:String(get('loc')||'').trim(),
        st:String(get('st')||'사용중').trim()||'사용중',
        nt:String(get('nt')||'').trim(),
        cat:nw()
      });
    }
    if(!items.length){toast('등록할 데이터가 없음','err');return}
    if(!confirm(items.length+'개 목형을 등록합니다. 계속할까요?\n(매핑 컬럼: '+Object.keys(hdr.map).join(', ')+')'))return;
    var ms=DB.g('mold');DB.s('mold',ms.concat(items));rMold();
    toast(items.length+'개 목형 등록 완료','ok');
  });
}
// 거래처 엑셀 업로드
function impCliXlsx(inp){
  var f=inp.files[0];if(!f)return;inp.value='';
  _xlsxReadFile(f,function(rows){
    if(!rows.length){toast('빈 파일','err');return}
    var hdr=_xlsxFindHeaderRow(rows,XLSX_FIELD_MAP.cli);
    if(!hdr.map.nm){toast('거래처명 컬럼을 찾을 수 없음','err');return}
    var items=[];
    for(var i=hdr.idx+1;i<rows.length;i++){
      var r=rows[i];if(!r||!r.length)continue;
      var nm=String(r[hdr.map.nm]||'').trim();
      if(!nm)continue;
      var get=function(k){return hdr.map[k]!=null?r[hdr.map[k]]:''};
      var typeRaw=String(get('cType')||'').trim().toLowerCase();
      var cType='sales';
      if(typeRaw.indexOf('매입')>=0||typeRaw==='purchase')cType='purchase';
      else if(typeRaw.indexOf('양쪽')>=0||typeRaw==='both'||typeRaw.indexOf('매출매입')>=0)cType='both';
      items.push({
        id:gid(),nm:nm,
        biz:String(get('biz')||'').trim(),
        ceo:String(get('ceo')||'').trim(),
        tel:String(get('tel')||'').trim(),
        fax:String(get('fax')||'').trim(),
        addr:String(get('addr')||'').trim(),
        email:String(get('email')||'').trim(),
        cType:cType,
        note:String(get('note')||'').trim()
      });
    }
    if(!items.length){toast('등록할 데이터가 없음','err');return}
    // 중복 체크
    var existing=DB.g('cli');
    var existNames=existing.map(function(c){return c.nm});
    var dupes=items.filter(function(it){return existNames.indexOf(it.nm)>=0});
    var newItems=items.filter(function(it){return existNames.indexOf(it.nm)<0});
    var msg=newItems.length+'개 거래처를 등록합니다.';
    if(dupes.length)msg+='\n(중복 '+dupes.length+'개 제외: '+dupes.slice(0,3).map(function(d){return d.nm}).join(', ')+(dupes.length>3?' 외':'')+ ')';
    if(!newItems.length){toast('모두 중복 — 등록할 거래처 없음','err');return}
    if(!confirm(msg))return;
    DB.s('cli',existing.concat(newItems));rCli();
    toast(newItems.length+'개 거래처 등록 완료','ok');
  });
}
// 거래처 엑셀 양식 다운로드
function dlCliXlsxTemplate(){
  if(typeof XLSX==='undefined'){toast('엑셀 라이브러리 로드 실패','err');return}
  var headers=['거래처명','사업자번호','대표자','전화번호','팩스','주소','이메일','유형(매출/매입/양쪽)','비고'];
  var sample=['(주)샘플','123-45-67890','홍길동','02-1234-5678','02-1234-5679','서울시 강남구','sample@test.com','매출','기존거래처'];
  var ws=XLSX.utils.aoa_to_sheet([headers,sample]);
  ws['!cols']=headers.map(function(){return{wch:18}});
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'거래처');
  XLSX.writeFile(wb,'거래처_등록양식.xlsx');
  toast('양식 다운로드 완료','ok');
}

/* =======================================================
   거래처 폴더 관리 (얼마에요 BookFolder 패턴)
   ======================================================= */

function getCliFolders(){return DB.g('cliFolders') || []}
function saveCliFolders(list){DB.s('cliFolders', list)}

function openFolderMgr(){
  $('newFolderNm').value = '';
  $('newFolderColor').value = '#1E3A5F';
  renderFolderList();
  oMo('cliFolderMo');
}

function renderFolderList(){
  var folders = getCliFolders();
  var cs = DB.g('cli') || [];
  var html = '';
  if(folders.length === 0){
    html = '<div style="padding:20px;text-align:center;color:var(--txt3)">등록된 폴더가 없습니다</div>';
  } else {
    folders.forEach(function(f){
      var cnt = cs.filter(function(c){return c.folderId === f.id}).length;
      html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #E5E7EB">';
      html += '<span style="width:16px;height:16px;border-radius:4px;background:'+(f.color||'#1E3A5F')+'"></span>';
      html += '<input type="text" value="'+f.nm.replace(/"/g,'&quot;')+'" onchange="updateFolder(\''+f.id+'\', this.value)" style="flex:1;padding:4px 8px;border:1px solid #E5E7EB;border-radius:4px;font-size:13px">';
      html += '<span style="font-size:11px;color:var(--txt3);min-width:60px;text-align:right">'+cnt+'개 거래처</span>';
      html += '<button class="btn btn-sm btn-d" onclick="deleteFolder(\''+f.id+'\')" style="padding:3px 8px;font-size:11px">삭제</button>';
      html += '</div>';
    });
  }
  $('folderList').innerHTML = html;
}

function addFolder(){
  var nm = $('newFolderNm').value.trim();
  if(!nm){toast('폴더명 입력','err');return}
  var color = $('newFolderColor').value;
  var folders = getCliFolders();
  folders.push({id: gid(), nm: nm, color: color, cat: nw()});
  saveCliFolders(folders);
  $('newFolderNm').value = '';
  renderFolderList();
  refreshFolderSelects();
  toast('폴더 추가','ok');
}

function updateFolder(id, nm){
  var folders = getCliFolders();
  var idx = folders.findIndex(function(f){return f.id === id});
  if(idx < 0) return;
  folders[idx].nm = nm.trim();
  saveCliFolders(folders);
  refreshFolderSelects();
}

function deleteFolder(id){
  if(!confirm('이 폴더를 삭제합니다. 이 폴더에 속한 거래처는 미분류가 됩니다.')) return;
  var folders = getCliFolders().filter(function(f){return f.id !== id});
  saveCliFolders(folders);
  // 거래처 folderId 제거
  var cs = DB.g('cli');
  cs.forEach(function(c){if(c.folderId === id) delete c.folderId});
  DB.s('cli', cs);
  renderFolderList();
  refreshFolderSelects();
  if(typeof rCli === 'function') rCli();
  toast('폴더 삭제','ok');
}

// 모달, 필터의 폴더 select 옵션 업데이트
function refreshFolderSelects(){
  var folders = getCliFolders();
  var optsHtml = '<option value="">-- 미분류 --</option>' +
    folders.map(function(f){return '<option value="'+f.id+'">'+f.nm+'</option>'}).join('');
  var sel = $('cmFolder');
  if(sel){
    var prev = sel.value;
    sel.innerHTML = optsHtml;
    sel.value = prev;
  }
  var filter = $('cliFolderFilter');
  if(filter){
    var prevF = filter.value;
    filter.innerHTML = '<option value="">전체 폴더</option><option value="__none__">미분류</option>' +
      folders.map(function(f){return '<option value="'+f.id+'">'+f.nm+'</option>'}).join('');
    filter.value = prevF;
  }
}

/* =======================================================
   거래처별 단가표 (얼마에요 PriceList 패턴)
   ======================================================= */

var _cliPriceList = []; // 편집 중인 단가표

function renderPriceListEdit(){
  var html = '';
  if(_cliPriceList.length === 0){
    html = '<div style="padding:10px;text-align:center;color:var(--txt3);font-size:12px">등록된 품목별 단가가 없습니다</div>';
  } else {
    html = '<table style="width:100%;font-size:12px"><thead><tr>'
      + '<th style="padding:4px 6px;background:#F8FAFC;text-align:left;border-bottom:1px solid #E5E7EB">품목</th>'
      + '<th style="padding:4px 6px;background:#F8FAFC;text-align:right;border-bottom:1px solid #E5E7EB">단가</th>'
      + '<th style="padding:4px 6px;background:#F8FAFC;text-align:center;border-bottom:1px solid #E5E7EB">삭제</th>'
      + '</tr></thead><tbody>';
    _cliPriceList.forEach(function(p, i){
      html += '<tr>'
        + '<td style="padding:3px 6px"><input type="text" value="'+(p.prod||'').replace(/"/g,'&quot;')+'" oninput="_cliPriceList['+i+'].prod=this.value" style="width:100%;padding:3px 6px;border:1px solid #E5E7EB;border-radius:3px;font-size:12px" placeholder="품목명"></td>'
        + '<td style="padding:3px 6px"><input type="number" value="'+(p.price||0)+'" oninput="_cliPriceList['+i+'].price=+this.value" style="width:100px;padding:3px 6px;border:1px solid #E5E7EB;border-radius:3px;font-size:12px;text-align:right"></td>'
        + '<td style="padding:3px 6px;text-align:center"><button type="button" onclick="removeCliPriceRow('+i+')" style="padding:2px 6px;border:none;background:#FEE2E2;color:#DC2626;border-radius:3px;cursor:pointer;font-size:11px">×</button></td>'
        + '</tr>';
    });
    html += '</tbody></table>';
  }
  $('cmPriceList').innerHTML = html;
}

function addCliPriceRow(){
  _cliPriceList.push({prod:'', price:0});
  renderPriceListEdit();
}

function removeCliPriceRow(idx){
  _cliPriceList.splice(idx, 1);
  renderPriceListEdit();
}

/* 거래처 단가 조회 (매출 등록 시 자동 적용용) */
function getCliPrice(cliNm, prodNm){
  if(!cliNm || !prodNm) return null;
  var c = (DB.g('cli') || []).find(function(x){return x.nm === cliNm});
  if(!c || !c.priceList || !c.priceList.length) return null;
  var match = c.priceList.find(function(p){return p.prod === prodNm});
  return match ? match.price : null;
}
window.getCliPrice = getCliPrice;

/* =======================================================
   신용한도/여신 경고 (얼마에요 CreditLimit 패턴)
   ======================================================= */

function checkCreditLimit(cliNm, newAmt){
  if(!cliNm) return {ok: true};
  var c = (DB.g('cli') || []).find(function(x){return x.nm === cliNm});
  if(!c || !c.creditLimit || c.creditLimit <= 0) return {ok: true};

  // 현재 미수금
  var sales = DB.g('sales') || [];
  var unpaid = sales.filter(function(r){return r.cli === cliNm})
    .reduce(function(s,r){return s + Math.max(0, (r.amt||0) - (r.paid||0))}, 0);

  var total = unpaid + (newAmt || 0);
  var limit = c.creditLimit;
  var ratio = total / limit;

  if(total > limit){
    return {
      ok: false,
      overLimit: true,
      current: unpaid,
      newTotal: total,
      limit: limit,
      excess: total - limit,
      msg: '⚠ '+cliNm+' 신용한도 초과\n현재 미수: '+fmt(unpaid)+'원\n추가 후: '+fmt(total)+'원\n한도: '+fmt(limit)+'원\n초과액: '+fmt(total-limit)+'원'
    };
  } else if(ratio >= 0.9){
    return {
      ok: true,
      warn: true,
      ratio: ratio,
      msg: '⚠ 신용한도의 '+Math.round(ratio*100)+'% 도달'
    };
  }
  return {ok: true};
}
window.checkCreditLimit = checkCreditLimit;
