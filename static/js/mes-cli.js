// CLIENT
function rCli(){const s=($('cliSch')?.value||'').toLowerCase();var tf=$('cliTypeFilter')?$('cliTypeFilter').value:'';var cs=DB.g('cli').filter(c=>!s||c.nm.toLowerCase().includes(s)||((c.biz||'').includes(s)));if(tf==='sales')cs=cs.filter(c=>c.cType==='sales'||c.cType==='both'||!c.cType);else if(tf==='purchase')cs=cs.filter(c=>c.cType==='purchase'||c.cType==='both');
function cTypeBadge(c){var t=c.cType||'sales';if(t==='both')return'<span class="bd bd-p">매출</span> <span class="bd bd-d">매입</span>';if(t==='purchase')return'<span class="bd bd-d">매입</span>';return'<span class="bd bd-p">매출</span>'}
$('cliTbl').querySelector('tbody').innerHTML=cs.map(c=>`<tr><td style="font-weight:700">${c.nm}</td><td>${cTypeBadge(c)}</td><td style="font-size:12px;color:#64748B">${c.biz||'-'}</td><td>${c.addr||'-'}</td><td>${c.tel||'-'}</td><td><button class="btn btn-sm btn-o" onclick="eCli('${c.id}')">수정</button> <button class="btn btn-sm btn-p" onclick="showCliHist('${c.id}')">이력</button> <button class="btn btn-sm btn-s" onclick="openProdMWithCli('${c.id}')">품목등록</button> <button class="btn btn-sm btn-d" onclick="dCli('${c.id}')">삭제</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty-cell">거래처 없음</td></tr>'}
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
  if(!apiKey){res.innerHTML='<span style="color:#F59E0B">⚙ 설정 → 국세청 API키 미등록 · <a href="#" onclick="goMod(\'mes-queue\');cMo(\'cliMo\');return false" style="color:#3B82F6">설정으로 이동</a></span>';return}
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
function openCliM(){['cmId','cmNm','cmBiz','cmPs','cmAd','cmTl','cmFx','cmNt'].forEach(x=>$(x).value='');$('cmSales').checked=true;$('cmPurch').checked=false;$('cliMoT').textContent='거래처 등록';oMo('cliMo')}
function eCli(id){const c=DB.g('cli').find(x=>x.id===id);if(!c)return;$('cmId').value=c.id;$('cmNm').value=c.nm;$('cmBiz').value=c.biz||'';$('cmPs').value=c.ps||'';$('cmAd').value=c.addr||'';$('cmTl').value=c.tel||'';$('cmFx').value=c.fax||'';$('cmNt').value=c.nt||'';$('cmSales').checked=(c.cType==='sales'||c.cType==='both'||!c.cType);$('cmPurch').checked=(c.cType==='purchase'||c.cType==='both');$('cliMoT').textContent='거래처 수정';oMo('cliMo')}
function saveCli(){const nm=$('cmNm').value.trim();if(!nm){toast('거래처명 필요','err');return}var isSales=$('cmSales').checked,isPurch=$('cmPurch').checked;if(!isSales&&!isPurch){toast('매출처 또는 매입처를 선택해주세요','err');return}var cType=isSales&&isPurch?'both':isSales?'sales':'purchase';const id=$('cmId').value||gid();const cs=DB.g('cli');const ei=cs.findIndex(x=>x.id===id);const c={id,nm,biz:$('cmBiz').value,cType:cType,ps:$('cmPs').value,addr:$('cmAd').value,tel:$('cmTl').value,fax:$('cmFx').value,nt:$('cmNt').value,cat:ei>=0?cs[ei].cat:nw()};if(ei>=0)cs[ei]=c;else cs.push(c);DB.s('cli',cs);cMo('cliMo');rCli();toast('저장','ok')}
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
function rProd(){const s=($('prodSch')?.value||'').toLowerCase();const ps=DB.g('prod').filter(p=>!s||p.nm.toLowerCase().includes(s)||p.cnm.toLowerCase().includes(s)||(p.code||'').toLowerCase().includes(s));$('prodTbl').querySelector('tbody').innerHTML=ps.map(p=>`<tr><td style="font-weight:600;color:#3B82F6">${p.code||'-'}</td><td style="font-weight:700">${p.nm}</td><td>${p.cnm}</td><td style="text-align:right">${p.price?p.price.toLocaleString()+'원':'-'}</td><td>${p.paper||'-'}</td><td>${p.spec||'-'}</td><td>${(p.procs||[]).map(x=>x.nm).join(' > ')}</td><td><button class="btn btn-sm btn-o" onclick="eProd('${p.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dProd('${p.id}')">삭제</button></td></tr>`).join('')||'<tr><td colspan="8" class="empty-cell">품목 없음</td></tr>'}
function acPmCli(v){const l=$('acPmCliL');const cs=DB.g('cli').filter(c=>!v||!v.trim()||v.trim()===' '||c.nm.toLowerCase().includes(v.toLowerCase()));if(!cs.length){l.classList.add('hidden');return}l.innerHTML=cs.map(c=>{var sn=c.nm.replace(/'/g,"&#39;");return`<div class="ac-i" onclick="$('pmCli').value='${sn}';$('acPmCliL').classList.add('hidden');if(!$('pmCode').value||$('pmCode').value.indexOf('-')>0)$('pmCode').value=genProdCode('${sn}')">${c.nm}<span style="float:right;font-size:11px;color:var(--txt2)">${c.ps||''}</span></div>`}).join('');l.classList.remove('hidden')}
function openProdMWithCli(cid){const c=DB.g('cli').find(x=>x.id===cid);openProdM();if(c)$('pmCli').value=c.nm}
function openProdM(){['pmId','pmCode','pmPrice','pmCli','pmNm','pmPaper','pmSpec','pmFabric','pmFabricSpec','pmQM','pmQE','pmPrint','pmGold','pmMold','pmHand','pmNote','pmCaut'].forEach(x=>$(x).value='');pProcs=[];renPP();$('prodMoT').textContent='품목 등록';oMo('prodMo')}
function eProd(id){const p=DB.g('prod').find(x=>x.id===id);if(!p)return;$('pmId').value=p.id;$('pmCode').value=p.code||'';$('pmPrice').value=p.price||'';$('pmCli').value=p.cnm;$('pmNm').value=p.nm;$('pmPaper').value=p.paper||'';$('pmSpec').value=p.spec||'';$('pmFabric').value=p.fabric||'';$('pmFabricSpec').value=p.fabricSpec||'';$('pmQM').value=p.qm||'';$('pmQE').value=p.qe||'';$('pmPrint').value=p.ps||'';$('pmGold').value=p.gold||'';$('pmMold').value=p.mold||'';$('pmHand').value=p.hand||'';$('pmNote').value=p.nt||'';$('pmCaut').value=p.caut||'';pProcs=(p.procs||[]).map(x=>({...x}));renPP();$('prodMoT').textContent='품목 수정';oMo('prodMo')}
function addPP(nm){pProcs.push({nm,tp:'n',mt:'',vd:''});renPP()}
function renPP(){$('pmPL').innerHTML=pProcs.length===0?'<span style="color:var(--txt2);font-size:12px">공정 없음</span>':pProcs.map((p,i)=>`<span class="pt">${i+1}. ${p.nm}<span class="rm" onclick="pProcs.splice(${i},1);renPP()">&times;</span></span>`).join('')}
function saveProd(){const nm=$('pmNm').value.trim(),cn=$('pmCli').value.trim();if(!nm){toast('제품명 필요','err');return}if(!cn){toast('거래처명 필요','err');return}const id=$('pmId').value||gid();var autoCode=$('pmCode').value.trim();if(!autoCode)autoCode=genProdCode(cn);const ps=DB.g('prod');const ei=ps.findIndex(x=>x.id===id);const existing=ei>=0?ps[ei]:null;var newPaper=$('pmPaper').value.trim(),newSpec=$('pmSpec').value.trim(),newFabric=$('pmFabric').value.trim(),newFabricSpec=$('pmFabricSpec').value.trim();var keepPapers=existing&&existing.papers&&existing.papers.length>1&&!newPaper&&!newSpec;var keepFabrics=existing&&existing.fabrics&&existing.fabrics.length>1&&!newFabric&&!newFabricSpec;var papers=keepPapers?existing.papers:[{paper:newPaper,spec:newSpec,qm:+$('pmQM').value||0,qe:0}];var fabrics=keepFabrics?existing.fabrics:[{fabric:newFabric,fabricSpec:newFabricSpec,fabricQty:0,fabricExtra:0}];const p={id,code:autoCode,price:+$('pmPrice').value||0,cid:DB.g('cli').find(c=>c.nm===cn)?.id||'',cnm:cn,nm,paper:newPaper||(existing?existing.paper||'':''),spec:newSpec||(existing?existing.spec||'':''),fabric:newFabric||(existing?existing.fabric||'':''),fabricSpec:newFabricSpec||(existing?existing.fabricSpec||'':''),qm:+$('pmQM').value||0,qe:0,papers,fabrics,ps:$('pmPrint').value,procs:pProcs,gold:$('pmGold').value,mold:$('pmMold').value,hand:$('pmHand').value,nt:$('pmNote').value,caut:$('pmCaut').value};if(ei>=0)ps[ei]=p;else ps.push(p);DB.s('prod',ps);cMo('prodMo');rProd();toast('저장','ok')}
function dProd(id){if(!confirm('삭제?'))return;DB.s('prod',DB.g('prod').filter(x=>x.id!==id));rProd();toast('삭제','ok')}

// MOLD
function rMold(){const s=($('moldSch')?.value||'').toLowerCase();const ms=DB.g('mold').filter(m=>!s||m.no.toLowerCase().includes(s)||m.pnm.toLowerCase().includes(s));$('moldTbl').querySelector('tbody').innerHTML=ms.map(m=>`<tr><td style="font-weight:700">${m.no}</td><td>${m.pnm||'-'}</td><td>${m.cnm||'-'}</td><td>${m.loc||'-'}</td><td>${m.st}</td><td><button class="btn btn-sm btn-o" onclick="eMold('${m.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dMold('${m.id}')">삭제</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty-cell">목형 없음</td></tr>'}
function openMoldM(){['mmId','mmNo','mmProd','mmCli','mmLoc','mmNt'].forEach(x=>$(x).value='');$('mmSt').value='사용중';$('moldMoT').textContent='목형 등록';oMo('moldMo')}
function eMold(id){const m=DB.g('mold').find(x=>x.id===id);if(!m)return;$('mmId').value=m.id;$('mmNo').value=m.no;$('mmProd').value=m.pnm||'';$('mmCli').value=m.cnm||'';$('mmLoc').value=m.loc||'';$('mmSt').value=m.st;$('mmNt').value=m.nt||'';$('moldMoT').textContent='목형 수정';oMo('moldMo')}
function saveMold(){const no=$('mmNo').value.trim();if(!no){toast('목형번호 필요','err');return}const id=$('mmId').value||gid();const ms=DB.g('mold');const ei=ms.findIndex(x=>x.id===id);const m={id,no,pnm:$('mmProd').value,cnm:$('mmCli').value,loc:$('mmLoc').value,st:$('mmSt').value,nt:$('mmNt').value,cat:ei>=0?ms[ei].cat:nw()};if(ei>=0)ms[ei]=m;else ms.push(m);DB.s('mold',ms);cMo('moldMo');rMold();toast('저장','ok')}
function dMold(id){if(!confirm('삭제?'))return;DB.s('mold',DB.g('mold').filter(x=>x.id!==id));rMold();toast('삭제','ok')}

