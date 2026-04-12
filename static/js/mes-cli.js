// Pagination & debounce
var _cliPage=0,_prodPage=0,_moldPage=0;
var _dCli=debounce(function(){_cliPage=0;rCli()},200);
var _dProd=debounce(function(){_prodPage=0;rProd()},200);
var _dMold=debounce(function(){_moldPage=0;rMold()},200);

// CLIENT
var _cliView='table';
function setCliView(v,btn){_cliView=v;_cliPage=0;if(btn){btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}var t=$('cliTableView'),g=$('cliGalleryView');if(t)t.style.display=v==='table'?'':'none';if(g)g.style.display=v==='gallery'?'':'none';rCli()}
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
  const s=($('cliSch')?.value||'').toLowerCase();var tf=$('cliTypeFilter')?$('cliTypeFilter').value:'';
  var cs;
  if(tf==='vendor'){
    cs=DB.g('vendors').filter(v=>!s||(v.nm||'').toLowerCase().includes(s)||(v.tel||'').includes(s));
  }else{
    cs=DB.g('cli').filter(c=>!s||c.nm.toLowerCase().includes(s)||((c.biz||'').includes(s)));
    if(tf==='sales')cs=cs.filter(c=>c.cType==='sales'||c.cType==='both'||!c.cType);
    else if(tf==='purchase')cs=cs.filter(c=>c.cType==='purchase'||c.cType==='both');
  }
  // KPI
  var allCli=DB.g('cli');
  var salesCnt=allCli.filter(c=>c.cType==='sales'||c.cType==='both'||!c.cType).length;
  var purchCnt=allCli.filter(c=>c.cType==='purchase'||c.cType==='both').length;
  var withSales=DB.g('sales').reduce((acc,r)=>{acc[r.cli]=true;return acc},{});
  var activeCnt=Object.keys(withSales).length;
  var k=$('cliKpi');if(k)k.innerHTML=
    `<div class="sb blue"><div class="l">전체 거래처</div><div class="v">${allCli.length}</div></div>`+
    `<div class="sb green"><div class="l">매출처</div><div class="v">${salesCnt}</div></div>`+
    `<div class="sb orange"><div class="l">매입처</div><div class="v">${purchCnt}</div></div>`+
    `<div class="sb purple"><div class="l">활성 거래처</div><div class="v">${activeCnt}</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">최근 매출 발생</div></div>`;
  var pg=paginate(cs,_cliPage);var vis=pg.items;
  if(_cliView==='table'){
    if(tf==='vendor'){
      $('cliTbl').querySelector('tbody').innerHTML=vis.length?vis.map(c=>`<tr><td style="font-weight:700">${c.nm||'-'}</td><td><span class="bd bd-e">인쇄소</span></td><td>-</td><td>${c.addr||'-'}</td><td>${c.tel||'-'}</td><td>${c.note||'-'}</td></tr>`).join(''):'<tr><td colspan="6" class="empty-cell">인쇄소 없음</td></tr>';
    }else{
      $('cliTbl').querySelector('tbody').innerHTML=vis.length?vis.map(c=>`<tr><td style="font-weight:700">${c.nm}</td><td>${cTypeBadge(c)}</td><td>${c.biz||'-'}</td><td>${c.addr||'-'}</td><td>${c.tel||'-'}</td><td><button class="btn btn-sm btn-o" onclick="eCli('${c.id}')">수정</button> <button class="btn btn-sm btn-o" onclick="showCliHist('${c.id}')">이력</button> <button class="btn btn-sm btn-s" onclick="openProdMWithCli('${c.id}')">품목</button> <button class="btn btn-sm btn-d" onclick="dCli('${c.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty-cell">거래처 없음</td></tr>';
    }
  }else{
    var html=vis.length?'<div class="gal">'+vis.map(c=>{var st=_cliStats(c);var ini=c.nm.charAt(0);var av=st.grade==='A'?'':st.grade==='B'?'gold':'';
      return `<div class="gal-card" onclick="showCliHist('${c.id}')">
        <div class="gal-hd"><div class="gal-avatar ${av}">${ini}</div><div class="gal-info"><div class="gal-nm">${c.nm}</div><div class="gal-sub">${cTypeBadge(c)}</div></div><div class="gal-grade ${st.grade}">${st.grade}</div></div>
        <div class="gal-stats">
          <div><div class="gal-stat-l">총 매출</div><div class="gal-stat-v pri">${(st.total/10000).toFixed(0)}만</div></div>
          <div><div class="gal-stat-l">미수금</div><div class="gal-stat-v ${st.unpaid>0?'dan':'suc'}">${st.unpaid>0?(st.unpaid/10000).toFixed(0)+'만':'완납'}</div></div>
        </div>
        <div style="font-size:11px;color:var(--txt3);font-weight:600;margin-top:8px">최근 거래 ${st.last} · ${st.count}건</div>
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
function openCliM(){['cmId','cmNm','cmBiz','cmCeo','cmBizType','cmEmail','cmPs','cmAd','cmTl','cmFx','cmNt'].forEach(x=>$(x).value='');$('cmSales').checked=true;$('cmPurch').checked=false;$('cliMoT').textContent='거래처 등록';oMo('cliMo')}
function eCli(id){const c=DB.g('cli').find(x=>x.id===id);if(!c)return;$('cmId').value=c.id;$('cmNm').value=c.nm;$('cmBiz').value=c.biz||'';$('cmCeo').value=c.ceo||'';$('cmBizType').value=c.bizType||'';$('cmEmail').value=c.email||'';$('cmPs').value=c.ps||'';$('cmAd').value=c.addr||'';$('cmTl').value=c.tel||'';$('cmFx').value=c.fax||'';$('cmNt').value=c.nt||'';$('cmSales').checked=(c.cType==='sales'||c.cType==='both'||!c.cType);$('cmPurch').checked=(c.cType==='purchase'||c.cType==='both');$('cliMoT').textContent='거래처 수정';oMo('cliMo')}
function saveCli(){const nm=$('cmNm').value.trim();if(!nm){toast('거래처명 필요','err');return}var isSales=$('cmSales').checked,isPurch=$('cmPurch').checked;if(!isSales&&!isPurch){toast('매출처 또는 매입처를 선택해주세요','err');return}var cType=isSales&&isPurch?'both':isSales?'sales':'purchase';const id=$('cmId').value||gid();const cs=DB.g('cli');const ei=cs.findIndex(x=>x.id===id);const c={id,nm,biz:$('cmBiz').value,ceo:$('cmCeo').value,bizType:$('cmBizType').value,email:$('cmEmail').value,cType:cType,ps:$('cmPs').value,addr:$('cmAd').value,tel:$('cmTl').value,fax:$('cmFx').value,nt:$('cmNt').value,cat:ei>=0?cs[ei].cat:nw()};if(ei>=0)cs[ei]=c;else cs.push(c);DB.s('cli',cs);cMo('cliMo');rCli();toast('저장','ok')}
function dCli(id){if(!confirm('삭제?'))return;DB.s('cli',DB.g('cli').filter(x=>x.id!==id));rCli();toast('삭제','ok')}
// Client history
function showCliHist(cid){const c=DB.g('cli').find(x=>x.id===cid);if(!c)return;const os=DB.g('wo').filter(o=>o.cid===cid||o.cnm===c.nm).sort((a,b)=>b.cat>a.cat?1:-1);$('cliHistT').textContent=c.nm+' 작업이력';$('cliHistC').innerHTML=os.length?`<table class="dt"><thead><tr><th>번호</th><th>제품</th><th>수량</th><th>출고일</th><th>진행</th><th>상태</th></tr></thead><tbody>${os.map(o=>`<tr><td>${o.wn}</td><td>${o.pnm}</td><td>${o.fq}</td><td>${o.sd}</td><td>${progBar(o)}</td><td>${badge(o.status)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-state"><div class="msg">작업 이력 없음</div></div>';oMo('cliHistMo')}

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
