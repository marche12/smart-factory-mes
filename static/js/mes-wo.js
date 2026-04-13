let cProcs=[],cPapers=[],cFabrics=[],editId=null,lastSavedId=null,detId=null;
function renPapers(){
  var area=$('woPapersArea');if(!area)return;
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:12px;font-weight:600;color:var(--txt2)">종이</span><button type="button" class="btn btn-o btn-sm" onclick="addPaperRow()" style="padding:3px 8px;font-size:11px">+ 추가</button></div>';
  cPapers.forEach(function(p,i){
    h+='<div style="display:grid;grid-template-columns:2fr 2fr 1fr 1fr auto;gap:4px;margin-bottom:4px;align-items:end">';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">종류'+(cPapers.length>1?' '+(i+1):'')+'</label><input value="'+(p.paper||'')+'" placeholder="" onchange="cPapers['+i+'].paper=this.value" style="padding:5px 6px;font-size:12px"></div>';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">규격</label><input value="'+(p.spec||'')+'" placeholder="" onchange="cPapers['+i+'].spec=this.value" style="padding:5px 6px;font-size:12px"></div>';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">'+(i===0?'<span class="req">정매</span>':'정매')+'</label><input type="number" value="'+(p.qm||'')+'" min="0" onchange="cPapers['+i+'].qm=+this.value" style="padding:5px 4px;font-size:12px;width:100%;box-sizing:border-box"></div>';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">여분</label><input type="number" value="'+(p.qe||'')+'" min="0" onchange="cPapers['+i+'].qe=+this.value" style="padding:5px 4px;font-size:12px;width:100%;box-sizing:border-box"></div>';
    h+='<button type="button" onclick="rmPaperRow('+i+')" style="background:none;border:none;color:#EF4444;font-size:16px;cursor:pointer;padding:0 2px;align-self:center"'+(cPapers.length===1?' disabled style="opacity:0.3;cursor:default"':'')+'>×</button>';
    h+='</div>';
  });
  area.innerHTML=h;
}
function addPaperRow(){cPapers.push({paper:'',spec:'',qm:0,qe:0});renPapers();}
function rmPaperRow(i){if(cPapers.length===1)return;cPapers.splice(i,1);renPapers();}
function renFabrics(){
  var area=$('woFabricsArea');if(!area)return;
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:12px;font-weight:600;color:var(--txt2)">원단</span><button type="button" class="btn btn-o btn-sm" onclick="addFabricRow()" style="padding:3px 8px;font-size:11px">+ 추가</button></div>';
  cFabrics.forEach(function(f,i){
    h+='<div style="display:grid;grid-template-columns:2fr 2fr 1fr 1fr auto;gap:4px;margin-bottom:4px;align-items:end">';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">종류'+(cFabrics.length>1?' '+(i+1):'')+'</label><input value="'+(f.fabric||'')+'" placeholder="" onchange="cFabrics['+i+'].fabric=this.value" style="padding:5px 6px;font-size:12px"></div>';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">원단규격</label><input value="'+(f.fabricSpec||'')+'" placeholder="" onchange="cFabrics['+i+'].fabricSpec=this.value" style="padding:5px 6px;font-size:12px"></div>';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">수량</label><input type="number" value="'+(f.fabricQty||'')+'" min="0" onchange="cFabrics['+i+'].fabricQty=+this.value" style="padding:5px 4px;font-size:12px;width:100%;box-sizing:border-box"></div>';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">여분</label><input type="number" value="'+(f.fabricExtra||'')+'" min="0" onchange="cFabrics['+i+'].fabricExtra=+this.value" style="padding:5px 4px;font-size:12px;width:100%;box-sizing:border-box"></div>';
    h+='<button type="button" onclick="rmFabricRow('+i+')" style="background:none;border:none;color:#EF4444;font-size:16px;cursor:pointer;padding:0 2px;align-self:center"'+(cFabrics.length===1?' disabled style="opacity:0.3;cursor:default"':'')+'>×</button>';
    h+='</div>';
  });
  area.innerHTML=h;
}
function addFabricRow(){cFabrics.push({fabric:'',fabricSpec:'',fabricQty:0,fabricExtra:0});renFabrics();}
function rmFabricRow(i){if(cFabrics.length===1)return;cFabrics.splice(i,1);renFabrics();}
// 작업 기준 수량: 종이 정매 우선, 없으면 완제품 수량
function getWQ(o){return(o.papers&&o.papers[0]&&o.papers[0].qm>0)?o.papers[0].qm:(o.qm||o.fq||0);}
function setWOFilter(f,b){woFilter=f;document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('on'));if(b)b.classList.add('on');rWOList()}
function fillWOMgr(defaultVal){
  var sel=$('woMgr');if(!sel)return;
  var us=DB.g('users');
  var opts='';
  us.forEach(function(u){opts+='<option value="'+u.nm+'">'+u.nm+'</option>'});
  sel.innerHTML=opts;
  var defNm=defaultVal||(CU?CU.nm:'');
  if(defNm)sel.value=defNm;
  if(!sel.value&&us.length)sel.value=us[0].nm;
}
function _initPapersFabrics(){cPapers=[{paper:'',spec:'',qm:0,qe:0}];cFabrics=[{fabric:'',fabricSpec:'',fabricQty:0,fabricExtra:0}];renPapers();renFabrics();}
function resetWO(){editId=null;cProcs=[];cColors=[];['woNum','woDt','woCli','woAddr','woTel','woFax','woProd','woPaper','woSpec','woQM','woQE','woFabric','woFabricSpec','woFabricQty','woFabricExtra','woPrint','woGold','woMold','woHand','woFQ','woShip','woDlv','woNote','woCaut','woPrice'].forEach(x=>{if($(x))$(x).value=''});if($('woOrdId'))$('woOrdId').value='';$('woNum').value=gWN();$('woDt').value=td();fillWOMgr();_initPapersFabrics();renColors();$('selP').innerHTML='<span style="color:var(--txt2);font-size:13px">공정 버튼을 클릭하여 추가</span>';$('pDet').innerHTML='';$('woImgP').innerHTML='';$('woFormTitle').textContent='작업지시서 등록';$('woWarnBox').innerHTML='';_updateWoAmt();}
function _updateWoAmt(){var fq=+($('woFQ')?$('woFQ').value:0)||0;var pr=+($('woPrice')?$('woPrice').value:0)||0;var box=$('woAmtDisplay');if(box)box.textContent=(fq&&pr)?''+fq*pr+'원':'-';}
function addP(nm,tp='n'){cProcs.push({nm,tp,mt:'',vd:'',st:'대기',qty:0,t1:'',t2:''});renP();checkProcWarn()}
function rmP(i){cProcs.splice(i,1);renP();checkProcWarn()}
// Process arrow reorder
function pMove(i,dir){
  var newI=i+dir;
  if(newI<0||newI>=cProcs.length)return;
  var item=cProcs.splice(i,1)[0];
  cProcs.splice(newI,0,item);
  renP();
}
function renP(){
$('selP').innerHTML=cProcs.length===0?'<span style="color:var(--txt2);font-size:13px">공정 버튼을 클릭하여 추가</span>':cProcs.map((p,i)=>`<span class="pt ${p.tp==='out'?'out':p.tp==='exc'?'exc':''}" style="display:inline-flex;align-items:center;gap:3px"><span style="display:inline-flex;flex-direction:column;gap:1px"><button onclick="pMove(${i},-1)" style="border:none;background:${i===0?'#E5E7EB':'#DCE8F5'};color:${i===0?'#D1D5DB':'#1E3A5F'};font-size:8px;line-height:1;padding:1px 3px;border-radius:2px;cursor:${i===0?'default':'pointer'}" ${i===0?'disabled':''}>▲</button><button onclick="pMove(${i},1)" style="border:none;background:${i===cProcs.length-1?'#E5E7EB':'#DCE8F5'};color:${i===cProcs.length-1?'#D1D5DB':'#1E3A5F'};font-size:8px;line-height:1;padding:1px 3px;border-radius:2px;cursor:${i===cProcs.length-1?'default':'pointer'}" ${i===cProcs.length-1?'disabled':''}>▼</button></span>${i+1}. ${p.nm}<span class="rm" onclick="rmP(${i})">&times;</span></span>`).join('');
$('pDet').innerHTML=cProcs.length===0?'':'<div style="font-size:13px;font-weight:700;margin-bottom:7px">공정별 상세</div>'+cProcs.map((p,i)=>{
var bg=p.tp==='out'?'var(--out-l)':p.tp==='exc'?'var(--exc-l)':'var(--bg2)';
var h='<div style="margin-bottom:7px;padding:10px;background:'+bg+';border-radius:10px"><div class="fr">';
h+='<div class="fg"><label>'+( i+1)+'. '+p.nm+' - 방식</label><input value="'+(p.mt||'')+'" onchange="cProcs['+i+'].mt=this.value" placeholder=""></div>';
h+='<div class="fg"><label>'+(p.tp!=='n'?'외주업체':'업체명')+'</label><div class="ac-w"><input value="'+(p.vd||'')+'" onchange="cProcs['+i+'].vd=this.value" oninput="cProcs['+i+'].vd=this.value;acVendorInProc(this.value,'+i+')" onfocus="acVendorInProc(this.value,'+i+')" onkeydown="acVdKeydown(event,'+i+')" onblur="setTimeout(function(){var l=$(\'acVdP'+i+'\');if(l)l.classList.add(\'hidden\')},200)" placeholder="업체명 입력 또는 검색" autocomplete="off"><div id="acVdP'+i+'" class="ac-l hidden" style="max-height:160px"></div></div></div>';
h+='</div>';
if(p.nm==='인쇄'){
  h+='<div style="margin-top:4px;padding:4px 0"><label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600"><input type="checkbox" id="mechCoat'+i+'" '+(p.mechCoat?'checked':'')+' onchange="toggleMechCoat('+i+',this.checked)" style="width:16px;height:16px;accent-color:var(--pri)"> 기계코팅 포함 <span style="font-size:11px;color:var(--txt2);font-weight:400">(인쇄소에서 일괄 처리)</span></label></div>';
}
if(p.nm==='톰슨'){
  h+='<div class="fg" style="margin-top:6px"><label>목형번호</label><div style="display:flex;gap:6px;align-items:center"><div class="ac-w"><input id="moldProcInp'+i+'" value="'+(p.moldNo||'')+'" onchange="cProcs['+i+'].moldNo=this.value;$(\'woMold\').value=this.value" oninput="acMoldInProc(this.value,'+i+')" placeholder="목형번호 입력" autocomplete="off"><div id="acMoldP'+i+'" class="ac-l hidden" style="max-height:160px"></div></div><button type="button" class="btn btn-o btn-sm" onclick="openMoldSearchForProc('+i+')">🔍 검색</button></div></div>';
}
if(p.nm==='외주가공'){
h+='<div class="fr" style="margin-top:6px"><div class="fg"><label>가공 종류</label><select onchange="cProcs['+i+'].mt=this.value" style="padding:6px 8px;border:1px solid var(--bdr);border-radius:8px;font-size:12px"><option value="">선택</option><option'+(p.mt==='금박'?' selected':'')+'>금박</option><option'+(p.mt==='형압'?' selected':'')+'>형압</option><option'+(p.mt==='실크'?' selected':'')+'>실크</option><option'+(p.mt==='박'?' selected':'')+'>박</option><option'+(p.mt==='에폭시'?' selected':'')+'>에폭시</option><option'+(p.mt==='후가공'?' selected':'')+'>후가공</option><option'+(p.mt==='기타'?' selected':'')+'>기타</option></select></div><div class="fg"><label>외주 업체</label><div class="ac-w"><input value="'+(p.vd||'')+'" onchange="cProcs['+i+'].vd=this.value" oninput="cProcs['+i+'].vd=this.value;acVendorInProc(this.value,'+i+')" onfocus="acVendorInProc(this.value,'+i+')" onkeydown="acVdKeydown(event,'+i+')" onblur="setTimeout(function(){var l=$(\'acVdP'+i+'\');if(l)l.classList.add(\'hidden\')},200)" placeholder="업체명 입력 또는 검색" autocomplete="off"><div id="acVdP'+i+'" class="ac-l hidden" style="max-height:160px"></div></div></div></div>';
}
h+='</div>';
return h;
}).join('')}
// 기계코팅 토글: 인쇄 공정에서 체크 시 코팅 공정 방식/업체 자동 세팅
function toggleMechCoat(printIdx,checked){
  cProcs[printIdx].mechCoat=checked;
  var vendor=$('woVendor')?$('woVendor').value:'';
  var coatProc=cProcs.find(function(p){return p.nm==='코팅'});
  if(checked){
    if(coatProc){coatProc.mt='기계코팅';coatProc.vd=vendor||cProcs[printIdx].vd||''}
  }else{
    if(coatProc&&coatProc.mt==='기계코팅'){coatProc.mt='';coatProc.vd=''}
  }
  renP();
}

// Process comparison warning
function checkProcWarn(){
  const pn=$('woProd').value.trim();
  if(!pn){$('woWarnBox').innerHTML='';return}
  const prev=DB.g('wo').filter(o=>o.pnm===pn&&o.id!==editId);
  var warns=[];
  if(prev.length){
    const lastWo=prev[prev.length-1];
    const lastNames=lastWo.procs.map(p=>p.nm);
    const curNames=cProcs.map(p=>p.nm);
    const missing=lastNames.filter(n=>!curNames.includes(n));
    if(missing.length)warns.push(`<div class="al wrn">이전 동일 제품(${lastWo.wn})에는 [${missing.join(', ')}] 공정이 있었습니다. 누락이 아닌지 확인해주세요.</div>`);
  }
  // 불량 이력 경고
  var dfLogs=DB.g('defectLog').filter(function(d){return d.pnm===pn&&d.defect>0});
  if(dfLogs.length){
    var byProc={};
    dfLogs.forEach(function(d){if(!byProc[d.proc])byProc[d.proc]=[];byProc[d.proc].push(d)});
    var dfHtml=Object.entries(byProc).map(function(e){
      var proc=e[0],logs=e[1];
      var reasons=[...new Set(logs.map(function(d){return d.reason}).filter(Boolean))];
      var total=logs.reduce(function(s,d){return s+d.defect},0);
      return'<b>'+proc+'</b>: 총 '+total+'매 불량'+(reasons.length?' ('+reasons.slice(0,2).join(', ')+')':'');
    }).join(' · ');
    warns.push('<div class="al wrn" style="border-left-color:#EF4444;background:#FEF2F2">⚠ 이전 불량 이력 있음 — '+dfHtml+'</div>');
  }
  $('woWarnBox').innerHTML=warns.join('');
}

/* ===== 상단 빠른 검색 모달 (페이지 이동 없이) ===== */
function openQuickCli(){
  var cs=DB.g('cli');
  var h='<div class="mb" style="width:600px;max-height:85vh;display:flex;flex-direction:column"><div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">거래처 조회<button class="mo-x" onclick="cMo(\'qCliMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button></div>';
  h+='<div style="padding:12px 20px 0"><input id="qCliSch" placeholder="거래처명 검색..." oninput="filterQCli()" style="width:100%;padding:10px 14px;font-size:14px;border:1px solid var(--bdr);border-radius:10px;background:var(--bg2)"></div>';
  h+='<div id="qCliList" style="padding:12px 20px;flex:1;overflow-y:auto"></div></div>';
  var el=document.createElement('div');el.id='qCliMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('qCliMo')};
  document.body.appendChild(el);filterQCli();
  setTimeout(function(){$('qCliSch').focus()},100);
}
function filterQCli(){
  var v=($('qCliSch')?$('qCliSch').value:'').toLowerCase();
  var cs=DB.g('cli').filter(function(c){return !v||c.nm.toLowerCase().includes(v)});
  var wos=DB.g('wo'),prods=DB.g('prod');
  var h='<table class="dt" style="font-size:12px"><thead><tr><th>거래처명</th><th>주소</th><th>전화</th><th>품목수</th><th>작업수</th></tr></thead><tbody>';
  cs.forEach(function(c){
    var pc=prods.filter(function(p){return p.cnm===c.nm}).length;
    var wc=wos.filter(function(o){return o.cnm===c.nm}).length;
    h+='<tr style="cursor:pointer" onclick="cMo(\'qCliMo\')" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'\'"><td style="font-weight:600">'+c.nm+'</td><td>'+(c.addr||'-')+'</td><td>'+(c.tel||'-')+'</td><td><span style="background:var(--pri-l);color:var(--pri);padding:2px 8px;border-radius:10px;font-size:11px">'+pc+'</span></td><td>'+wc+'</td></tr>';
  });
  h+='</tbody></table>';
  $('qCliList').innerHTML=cs.length?h:'<div style="padding:20px;text-align:center;color:var(--txt3)">검색 결과 없음</div>';
}
function openQuickProd(){
  var h='<div class="mb" style="width:700px;max-height:85vh;display:flex;flex-direction:column"><div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">품목 조회<button class="mo-x" onclick="cMo(\'qProdMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button></div>';
  h+='<div style="padding:12px 20px 0;display:flex;gap:8px"><input id="qProdSch" placeholder="품목명 검색..." oninput="filterQProd()" style="flex:1;padding:10px 14px;font-size:14px;border:1px solid var(--bdr);border-radius:10px;background:var(--bg2)">';
  h+='<select id="qProdCli" onchange="filterQProd()" style="padding:8px;border:1px solid var(--bdr);border-radius:10px;font-size:13px"><option value="">전체 거래처</option>';
  DB.g('cli').forEach(function(c){h+='<option>'+c.nm+'</option>'});
  h+='</select></div>';
  h+='<div id="qProdList" style="padding:12px 20px;flex:1;overflow-y:auto"></div></div>';
  var el=document.createElement('div');el.id='qProdMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('qProdMo')};
  document.body.appendChild(el);filterQProd();
  setTimeout(function(){$('qProdSch').focus()},100);
}
function filterQProd(){
  var v=($('qProdSch')?$('qProdSch').value:'').toLowerCase();
  var cn=$('qProdCli')?$('qProdCli').value:'';
  var ps=DB.g('prod');
  if(cn)ps=ps.filter(function(p){return p.cnm===cn});
  if(v)ps=ps.filter(function(p){return p.nm.toLowerCase().includes(v)});
  var wos=DB.g('wo');
  var h='<table class="dt" style="font-size:12px"><thead><tr><th>품목명</th><th>거래처</th><th>종이</th><th>규격</th><th>공정</th><th>작업이력</th></tr></thead><tbody>';
  ps.forEach(function(p){
    var wc=wos.filter(function(o){return o.pnm===p.nm}).length;
    var proc=(p.procs||[]).map(function(x){return x.nm}).join('→');
    h+='<tr style="cursor:pointer" onclick="cMo(\'qProdMo\')" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'\'"><td style="font-weight:600">'+p.nm+'</td><td>'+p.cnm+'</td><td>'+(p.paper||'-')+'</td><td>'+(p.spec||'-')+'</td><td style="font-size:11px;color:var(--txt3)">'+(proc||'-')+'</td><td>'+(wc>0?'<span style="background:#FFF5E6;color:#FF9500;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">'+wc+'건</span>':'-')+'</td></tr>';
  });
  h+='</tbody></table>';
  $('qProdList').innerHTML=ps.length?h:'<div style="padding:20px;text-align:center;color:var(--txt3)">검색 결과 없음</div>';
}
function openQuickMold(){
  var h='<div class="mb" style="width:600px;max-height:85vh;display:flex;flex-direction:column"><div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">목형 조회<button class="mo-x" onclick="cMo(\'qMoldMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button></div>';
  h+='<div style="padding:12px 20px 0"><input id="qMoldSch" placeholder="목형번호 또는 제품명 검색..." oninput="filterQMold()" style="width:100%;padding:10px 14px;font-size:14px;border:1px solid var(--bdr);border-radius:10px;background:var(--bg2)"></div>';
  h+='<div id="qMoldList" style="padding:12px 20px;flex:1;overflow-y:auto"></div></div>';
  var el=document.createElement('div');el.id='qMoldMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('qMoldMo')};
  document.body.appendChild(el);filterQMold();
  setTimeout(function(){$('qMoldSch').focus()},100);
}
function filterQMold(){
  var v=($('qMoldSch')?$('qMoldSch').value:'').toLowerCase();
  var ms=DB.g('mold').filter(function(m){return !v||m.no.toLowerCase().includes(v)||(m.pnm||'').toLowerCase().includes(v)});
  var h='<table class="dt" style="font-size:12px"><thead><tr><th>목형번호</th><th>제품명</th><th>거래처</th><th>규격</th><th>상태</th></tr></thead><tbody>';
  ms.forEach(function(m){
    h+='<tr style="cursor:pointer" onclick="cMo(\'qMoldMo\')" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'\'"><td style="font-weight:600">'+m.no+'</td><td>'+(m.pnm||'-')+'</td><td>'+(m.cnm||'-')+'</td><td>'+(m.loc||'-')+'</td><td>'+(m.st==='폐기'?'<span style="color:var(--dan)">폐기</span>':'<span style="color:var(--suc)">사용중</span>')+'</td></tr>';
  });
  h+='</tbody></table>';
  $('qMoldList').innerHTML=ms.length?h:'<div style="padding:20px;text-align:center;color:var(--txt3)">검색 결과 없음</div>';
}

/* ===== 거래처 검색 모달 (작업지시서용) ===== */
/* ===== 인쇄소/외주업체 검색 모달 ===== */
function openVendorSearch(){
  var h='<div class="mb" style="width:520px"><div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">인쇄소 / 외주업체 검색<button class="mo-x" onclick="cMo(\'vendorSearchMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">×</button></div>';
  h+='<div style="padding:16px 20px 8px;display:flex;gap:8px">';
  h+='<input id="vdSchInput" placeholder="업체명 검색..." oninput="filterVendorSearch()" style="flex:1;padding:12px 14px;font-size:15px;border:1px solid var(--bdr);border-radius:12px;background:var(--bg2)">';
  h+='<button class="btn btn-p btn-sm" onclick="showQuickVendorForm()" style="white-space:nowrap;align-self:center">+ 신규 등록</button>';
  h+='</div>';
  h+='<div id="vdSchList" style="padding:0 20px 12px;max-height:400px;overflow-y:auto"></div></div>';
  var el=document.createElement('div');el.id='vendorSearchMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('vendorSearchMo')};
  document.body.appendChild(el);
  filterVendorSearch();
  setTimeout(function(){$('vdSchInput').focus()},100);
}
function filterVendorSearch(){
  var v=($('vdSchInput')?$('vdSchInput').value:'').toLowerCase();
  // 매입처에서 검색 (인쇄소 태그된 업체 우선)
  var cs=DB.g('cli').filter(function(c){
    var isPurch=c.cType==='purchase'||c.cType==='both';
    var isVd=c.isVendor;
    return (isPurch||isVd)&&(!v||(c.nm||'').toLowerCase().includes(v));
  });
  // 인쇄소 태그된 업체를 상단에 정렬
  cs.sort(function(a,b){return (b.isVendor?1:0)-(a.isVendor?1:0)});
  var h='';
  if(!cs.length){
    h='<div style="padding:20px;text-align:center;color:var(--txt3)">검색 결과 없음</div>';
  } else {
    cs.forEach(function(c){
      var badge=c.isVendor?'<span style="font-size:11px;padding:3px 10px;background:#DBEAFE;color:#2563EB;border-radius:20px;font-weight:600">인쇄소</span>':'<span style="font-size:11px;padding:3px 10px;background:#F3F4F6;color:#6B7280;border-radius:20px;font-weight:600">매입처</span>';
      h+='<div onclick="pickVendor(\''+c.id+'\')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:12px;margin-bottom:4px;cursor:pointer;transition:background .1s" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">';
      h+='<div><div style="font-weight:700;font-size:14px">'+c.nm+'</div>';
      h+='<div style="font-size:12px;color:var(--txt3);margin-top:2px">'+(c.tel||'')+(c.addr?' | '+c.addr.slice(0,25):'')+'</div></div>';
      h+=badge;
      h+='</div>';
    });
  }
  $('vdSchList').innerHTML=h;
}
function pickVendor(id){
  var cs=DB.g('cli');
  var c=cs.find(function(x){return x.id===id});if(!c)return;
  // 인쇄소로 자동 태깅
  if(!c.isVendor){c.isVendor=true;DB.s('cli',cs)}
  var sel=$('woVendor');
  if(sel){
    if(!Array.from(sel.options).find(function(o){return o.value===c.nm})){
      var opt=document.createElement('option');opt.value=c.nm;opt.textContent=c.nm;sel.appendChild(opt);
    }
    sel.value=c.nm;
  }
  cMo('vendorSearchMo');
  toast(c.nm+' 인쇄소로 선택됨','ok');
}
function showQuickVendorForm(){
  var nm=($('vdSchInput')?$('vdSchInput').value.trim():'');
  var h='<div style="border:1.5px solid var(--pri);border-radius:14px;padding:16px;background:var(--bg2)">';
  h+='<div style="font-weight:700;font-size:14px;margin-bottom:12px;color:var(--pri)">신규 업체 등록</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">업체명 <span style="color:#EF4444">*</span></label><input id="qvNm" value="'+nm.replace(/"/g,'&quot;')+'" placeholder="업체명" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">담당자</label><input id="qvMgr" placeholder="담당자명" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">전화</label><input id="qvTel" placeholder="031-000-0000" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">주소</label><input id="qvAddr" placeholder="주소" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='</div>';
  h+='<div style="margin-bottom:12px;display:flex;align-items:center;gap:14px"><label style="font-size:12px;font-weight:600">유형:</label>';
  h+='<label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="qvType" value="print" checked style="accent-color:var(--pri)"> 인쇄소</label>';
  h+='<label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="qvType" value="out" style="accent-color:var(--pri)"> 외주가공</label>';
  h+='<label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="qvType" value="both" style="accent-color:var(--pri)"> 인쇄+외주</label></div>';
  h+='<div style="display:flex;gap:8px;justify-content:flex-end">';
  h+='<button class="btn btn-o btn-sm" onclick="filterVendorSearch()">취소</button>';
  h+='<button class="btn btn-p btn-sm" onclick="saveQuickVendor()">저장 후 선택</button>';
  h+='</div></div>';
  $('vdSchList').innerHTML=h;
  setTimeout(function(){if($('qvNm'))$('qvNm').focus()},50);
}
function saveQuickVendor(){
  var nm=($('qvNm')?$('qvNm').value.trim():'');
  if(!nm){toast('업체명을 입력하세요','err');return}
  var exists=DB.g('vendors').find(function(v){return v.nm===nm});
  if(exists){toast('이미 등록된 업체입니다. 아래 목록에서 선택하세요','wrn');filterVendorSearch();return}
  var typeEl=document.querySelector('input[name="qvType"]:checked');
  var vType=typeEl?typeEl.value:'print';
  var nv={id:gid(),nm:nm,type:vType,mgr:$('qvMgr')?$('qvMgr').value.trim():'',tel:$('qvTel')?$('qvTel').value.trim():'',addr:$('qvAddr')?$('qvAddr').value.trim():'',note:'',cat:nw()};
  var vs=DB.g('vendors');vs.push(nv);DB.s('vendors',vs);
  if(typeof rVendors==='function')rVendors();
  if(typeof populateVendorDropdowns==='function')populateVendorDropdowns();
  pickVendor(nv.id);
  toast(nm+' 등록 및 선택됨','ok');
}

function openCliSearch(){
  var h='<div class="mb" style="width:520px"><div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">거래처 검색<button class="mo-x" onclick="cMo(\'cliSearchMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">×</button></div>';
  h+='<div style="padding:16px 20px 8px;display:flex;gap:8px">';
  h+='<input id="cliSchInput" placeholder="거래처명 검색..." oninput="filterCliSearch()" style="flex:1;padding:12px 14px;font-size:15px;border:1px solid var(--bdr);border-radius:12px;background:var(--bg2)">';
  h+='<button class="btn btn-p btn-sm" onclick="showQuickCliForm()" style="white-space:nowrap;align-self:center">+ 신규 등록</button>';
  h+='</div>';
  h+='<div id="cliSchList" style="padding:0 20px 12px;max-height:420px;overflow-y:auto"></div></div>';
  var el=document.createElement('div');el.id='cliSearchMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('cliSearchMo')};
  document.body.appendChild(el);
  filterCliSearch();
  setTimeout(function(){$('cliSchInput').focus()},100);
}
function filterCliSearch(){
  var v=($('cliSchInput')?$('cliSchInput').value:'').toLowerCase();
  var cs=DB.g('cli').filter(function(c){var typeOk=!c.cType||c.cType==='sales'||c.cType==='both';return typeOk&&(!v||c.nm.toLowerCase().includes(v))});
  var h='';
  if(!cs.length){h='<div style="padding:20px;text-align:center;color:var(--txt3)">검색 결과 없음 — 위의 <b>신규 등록</b> 버튼으로 추가하세요</div>';}
  else{cs.forEach(function(c){
    var prodCount=DB.g('prod').filter(function(p){return p.cnm===c.nm}).length;
    h+='<div onclick="pickCli(\''+c.id+'\')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:12px;margin-bottom:4px;cursor:pointer;transition:background .1s" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">';
    h+='<div><div style="font-weight:600;font-size:14px">'+c.nm+'</div>';
    h+='<div style="font-size:12px;color:var(--txt3);margin-top:2px">'+(c.addr||'')+(c.tel?' | '+c.tel:'')+'</div></div>';
    h+='<div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;padding:3px 10px;background:var(--pri-l);color:var(--pri);border-radius:20px;font-weight:600">품목 '+prodCount+'</span></div>';
    h+='</div>';
  })}
  $('cliSchList').innerHTML=h;
}
function showQuickCliForm(){
  var nm=($('cliSchInput')?$('cliSchInput').value.trim():'');
  var h='<div style="border:1.5px solid var(--pri);border-radius:14px;padding:16px;background:var(--bg2)">';
  h+='<div style="font-weight:700;font-size:14px;margin-bottom:12px;color:var(--pri)">신규 거래처 등록</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">거래처명 <span style="color:#EF4444">*</span></label><input id="qcNm" value="'+nm.replace(/"/g,'&quot;')+'" placeholder="거래처명" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">사업자등록번호</label><div style="display:flex;gap:4px"><input id="qcBiz" placeholder="000-00-00000" oninput="fmtBiz(this)" style="flex:1;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"><button type="button" class="btn btn-o btn-sm" onclick="checkBizStatusInline()" style="white-space:nowrap;padding:6px 8px;font-size:12px">조회</button></div><div id="qcBizResult" style="font-size:11px;margin-top:3px;min-height:14px"></div></div>';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">담당자</label><input id="qcPs" placeholder="담당자명" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">전화</label><input id="qcTl" placeholder="031-000-0000" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">팩스</label><input id="qcFx" placeholder="031-000-0000" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='</div>';
  h+='<div style="margin-bottom:8px"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">주소</label><input id="qcAd" placeholder="주소" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='<div style="margin-bottom:12px;display:flex;align-items:center;gap:14px"><label style="font-size:12px;font-weight:600">유형:</label><label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="qcSales" checked style="width:15px;height:15px;accent-color:#1E3A5F"> 매출처</label><label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="qcPurch" style="width:15px;height:15px;accent-color:#EF4444"> 매입처</label></div>';
  h+='<div style="display:flex;gap:8px;justify-content:flex-end">';
  h+='<button class="btn btn-o btn-sm" onclick="filterCliSearch()">취소</button>';
  h+='<button class="btn btn-p btn-sm" onclick="saveQuickCli()">저장 후 선택</button>';
  h+='</div></div>';
  $('cliSchList').innerHTML=h;
  setTimeout(function(){if($('qcNm'))$('qcNm').focus()},50);
}
function saveQuickCli(){
  var nm=($('qcNm')?$('qcNm').value.trim():'');
  if(!nm){toast('거래처명을 입력하세요','err');return}
  var exists=DB.g('cli').find(function(c){return c.nm===nm});
  if(exists){toast('이미 등록된 거래처입니다. 아래 목록에서 선택하세요','wrn');filterCliSearch();return}
  var qSales=$('qcSales')?$('qcSales').checked:true,qPurch=$('qcPurch')?$('qcPurch').checked:false;
  if(!qSales&&!qPurch){toast('매출처 또는 매입처를 선택해주세요','err');return}
  var qcType=qSales&&qPurch?'both':qSales?'sales':'purchase';
  var c={id:gid(),nm:nm,biz:$('qcBiz')?$('qcBiz').value.trim():'',cType:qcType,ps:$('qcPs')?$('qcPs').value.trim():'',addr:$('qcAd')?$('qcAd').value.trim():'',tel:$('qcTl')?$('qcTl').value.trim():'',fax:$('qcFx')?$('qcFx').value.trim():'',nt:'',cat:nw()};
  var cs=DB.g('cli');cs.push(c);DB.s('cli',cs);
  if(typeof rCli==='function')rCli();
  $('woCli').value=c.nm;$('woAddr').value=c.addr||'';$('woTel').value=c.tel||'';$('woFax').value=c.fax||'';
  cMo('cliSearchMo');
  toast(c.nm+' 등록 및 선택됨','ok');
  $('woProd').value='';
  setTimeout(function(){if(typeof openProdSearch==='function')openProdSearch()},200);
}
function pickCli(id){
  var c=DB.g('cli').find(function(x){return x.id===id});if(!c)return;
  $('woCli').value=c.nm;$('woAddr').value=c.addr||'';$('woTel').value=c.tel||'';$('woFax').value=c.fax||'';
  cMo('cliSearchMo');
  $('woProd').value='';
  toast(c.nm+' 선택됨','ok');
}

/* ===== 목형 검색 모달 ===== */
function openMoldSearch(){
  if(_moldPickTarget===undefined||_moldPickTarget===null)_moldPickTarget=null;
  var h='<div class="mb" style="width:580px"><div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">목형 검색<button class="mo-x" onclick="cMo(\'moldSearchMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button></div>';
  h+='<div style="padding:16px 20px 8px"><input id="moldSchInput" placeholder="목형번호, 제품명 또는 거래처 검색..." oninput="filterMoldSearch()" style="width:100%;padding:12px 14px;font-size:15px;border:1px solid var(--bdr);border-radius:12px;background:var(--bg2);box-sizing:border-box"></div>';
  h+='<div id="moldSchList" style="padding:0 20px 12px;max-height:420px;overflow-y:auto"></div></div>';
  var el=document.createElement('div');el.id='moldSearchMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('moldSearchMo')};
  document.body.appendChild(el);
  filterMoldSearch();
  setTimeout(function(){$('moldSchInput').focus()},100);
}
function filterMoldSearch(){
  var v=($('moldSchInput')?$('moldSchInput').value:'').toLowerCase();
  var ms=DB.g('mold').filter(function(m){return !v||(m.no||'').toLowerCase().includes(v)||(m.pnm||'').toLowerCase().includes(v)||(m.cnm||'').toLowerCase().includes(v)});
  var h='';
  if(!ms.length){h='<div style="padding:20px;text-align:center;color:var(--txt3)">검색 결과 없음</div>';}
  else{ms.slice(0,50).forEach(function(m){
    var stColor=m.st==='사용중'?'var(--suc)':m.st==='폐기'?'var(--dan)':'var(--wrn)';
    h+='<div onclick="pickMold(\''+m.id+'\')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:12px;margin-bottom:4px;cursor:pointer;transition:background .1s" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">';
    h+='<div><div style="font-weight:700;font-size:14px">'+m.no+'</div>';
    h+='<div style="font-size:12px;color:var(--txt3);margin-top:2px">'+(m.pnm||'-')+' | '+(m.cnm||'-')+'</div></div>';
    h+='<div style="display:flex;align-items:center;gap:8px">';
    if(m.loc)h+='<span style="font-size:11px;color:var(--txt2)">'+m.loc+'</span>';
    h+='<span style="font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600;color:'+stColor+';background:rgba(0,0,0,.05)">'+m.st+'</span>';
    h+='</div></div>';
  })}
  $('moldSchList').innerHTML=h;
}
var _moldPickTarget=null; // null=WO header, number=proc index
function pickMold(id){
  var m=DB.g('mold').find(function(x){return x.id===id});if(!m)return;
  if(_moldPickTarget!==null&&typeof _moldPickTarget==='number'){
    cProcs[_moldPickTarget].moldNo=m.no;
    var inp=$('moldProcInp'+_moldPickTarget);if(inp)inp.value=m.no;
    $('woMold').value=m.no;
  }else{
    $('woMold').value=m.no;
    if($('woMoldDisplay'))$('woMoldDisplay').value=m.no+(m.pnm?' ('+m.pnm+')':'');
  }
  _moldPickTarget=null;
  cMo('moldSearchMo');
  toast(m.no+' 선택됨','ok');
}
function openMoldSearchForProc(idx){
  _moldPickTarget=idx;
  openMoldSearch();
}

/* ===== 품목 검색 모달 ===== */
function openProdSearch(){
  var cn=$('woCli').value.trim();
  var h='<div class="mb" style="width:620px"><div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">품목 검색'+(cn?' <span style="font-size:13px;color:var(--pri);font-weight:500;margin-left:8px">'+cn+'</span>':'')+'<button class="mo-x" onclick="cMo(\'prodSearchMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">×</button></div>';
  h+='<div style="padding:16px 20px 8px;display:flex;gap:8px">';
  h+='<input id="prodSchInput" placeholder="제품명 또는 코드번호 검색..." oninput="filterProdSearch()" style="flex:1;padding:12px 14px;font-size:15px;border:1px solid var(--bdr);border-radius:12px;background:var(--bg2)">';
  if(cn)h+='<button class="btn btn-sm btn-o" onclick="$(\'prodSchToggle\').checked=!$(\'prodSchToggle\').checked;filterProdSearch()" style="white-space:nowrap;align-self:center"><input type="checkbox" id="prodSchToggle" checked onchange="filterProdSearch()" style="margin-right:4px">'+cn+'만</button>';
  h+='<button class="btn btn-p btn-sm" onclick="showQuickProdForm()" style="white-space:nowrap;align-self:center">+ 신규 등록</button>';
  h+='</div>';
  h+='<div id="prodSchList" style="padding:0 20px 12px;max-height:420px;overflow-y:auto"></div></div>';
  var el=document.createElement('div');el.id='prodSearchMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('prodSearchMo')};
  document.body.appendChild(el);
  filterProdSearch();
  setTimeout(function(){$('prodSchInput').focus()},100);
}
function filterProdSearch(){
  var v=($('prodSchInput')?$('prodSchInput').value:'').toLowerCase();
  var cn=$('woCli').value.trim();
  var onlyCli=$('prodSchToggle')&&$('prodSchToggle').checked;
  var ps=DB.g('prod');
  if(cn&&onlyCli)ps=ps.filter(function(p){return p.cnm===cn});
  if(v)ps=ps.filter(function(p){return p.nm.toLowerCase().includes(v)||(p.code||'').toLowerCase().includes(v)});
  var h='';
  if(!ps.length){h='<div style="padding:20px;text-align:center;color:var(--txt3)">검색 결과 없음 — 위의 <b>신규 등록</b> 버튼으로 추가하세요</div>';}
  else{
    // 이전 작업지시 건수도 표시
    var wos=DB.g('wo');
    ps.forEach(function(p){
      var woCount=wos.filter(function(o){return o.pnm===p.nm}).length;
      var procStr=(p.procs||[]).map(function(x){return x.nm}).join(' → ');
      h+='<div onclick="pickProd(\''+p.id+'\')" style="padding:12px 14px;border-radius:12px;margin-bottom:4px;cursor:pointer;transition:background .1s" onmouseover="this.style.background=\'var(--bg2)\'" onmouseout="this.style.background=\'transparent\'">';
      h+='<div style="display:flex;justify-content:space-between;align-items:flex-start">';
      h+='<div><div style="font-weight:600;font-size:14px">'+p.nm+(p.code?' <span style="font-size:11px;color:#1E3A5F;font-weight:500">['+p.code+']</span>':'')+'</div>';
      h+='<div style="font-size:12px;color:var(--txt3);margin-top:2px">'+p.cnm+(p.spec?' | '+p.spec:'')+(p.paper?' | '+p.paper:'')+'</div>';
      if(procStr)h+='<div style="font-size:11px;color:var(--txt3);margin-top:3px">공정: '+procStr+'</div>';
      h+='</div>';
      h+='<div style="display:flex;gap:6px;align-items:center;flex-shrink:0">';
      if(woCount>0)h+='<span style="font-size:11px;padding:3px 8px;background:#FFF5E6;color:#FF9500;border-radius:20px;font-weight:600">이력 '+woCount+'</span>';
      h+='<span style="font-size:12px;color:var(--pri);font-weight:600">선택</span>';
      h+='</div></div></div>';
    });
  }
  $('prodSchList').innerHTML=h;
}
function pickProd(id){
  selProd(id);
  cMo('prodSearchMo');
  toast($('woProd').value+' 선택됨','ok');
}
function showQuickProdForm(){
  var cn=$('woCli')?$('woCli').value.trim():'';
  var pnm=($('prodSchInput')?$('prodSchInput').value.trim():'');
  var h='<div style="border:1.5px solid var(--pri);border-radius:14px;padding:16px;background:var(--bg2)">';
  h+='<div style="font-weight:700;font-size:14px;margin-bottom:12px;color:var(--pri)">신규 품목 등록</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">거래처 <span style="color:#EF4444">*</span></label><input id="qpCli" value="'+cn.replace(/"/g,'&quot;')+'" placeholder="거래처명" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">제품명 <span style="color:#EF4444">*</span></label><input id="qpNm" value="'+pnm.replace(/"/g,'&quot;')+'" placeholder="제품명" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">종이</label><input id="qpPaper" placeholder="" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">규격</label><input id="qpSpec" placeholder="" style="width:100%;padding:8px 10px;border:1px solid var(--bdr);border-radius:8px;font-size:13px;box-sizing:border-box"></div>';
  h+='</div>';
  h+='<div style="font-size:11px;color:var(--txt3);margin-bottom:10px">※ 공정은 나중에 품목 관리에서 추가할 수 있습니다.</div>';
  h+='<div style="display:flex;gap:8px;justify-content:flex-end">';
  h+='<button class="btn btn-o btn-sm" onclick="filterProdSearch()">취소</button>';
  h+='<button class="btn btn-p btn-sm" onclick="saveQuickProd()">저장 후 선택</button>';
  h+='</div></div>';
  $('prodSchList').innerHTML=h;
  setTimeout(function(){if($('qpNm'))$('qpNm').focus()},50);
}
function saveQuickProd(){
  var cn=($('qpCli')?$('qpCli').value.trim():'');
  var nm=($('qpNm')?$('qpNm').value.trim():'');
  if(!nm){toast('제품명을 입력하세요','err');return}
  if(!cn){toast('거래처명을 입력하세요','err');return}
  // 거래처가 없으면 자동 생성
  var cliList=DB.g('cli');
  if(!cliList.find(function(c){return c.nm===cn})){
    var nc={id:gid(),nm:cn,cType:'sales',ps:'',addr:'',tel:'',fax:'',nt:'',cat:nw()};
    cliList.push(nc);DB.s('cli',cliList);
    if(typeof rCli==='function')rCli();
    $('woCli').value=cn;$('woAddr').value='';$('woTel').value='';$('woFax').value='';
  }
  var p={id:gid(),nm:nm,cnm:cn,cid:DB.g('cli').find(function(c){return c.nm===cn})?.id||'',code:genProdCode(cn),price:0,paper:$('qpPaper')?$('qpPaper').value.trim():'',spec:$('qpSpec')?$('qpSpec').value.trim():'',fabric:'',fabricSpec:'',qm:0,qe:0,ps:'',procs:[],gold:'',mold:'',hand:'',nt:'',caut:''};
  var ps=DB.g('prod');ps.push(p);DB.s('prod',ps);
  if(typeof rProd==='function')rProd();
  // WO 폼에 자동 입력
  $('woProd').value=p.nm||'';$('woPaper').value=p.paper||'';$('woSpec').value=p.spec||'';
  var _dh=getDefectHistory(p.nm);if(_dh)$('woCaut').value=_dh;
  if(!$('woCli').value){$('woCli').value=cn;$('woAddr').value='';$('woTel').value='';$('woFax').value=''}
  cMo('prodSearchMo');
  toast(p.nm+' 등록 및 선택됨','ok');
}

function acCli(v,listId,inputId){var lid=listId||'acCliL';var l=$(lid);if(!l)return;const cs=DB.g('cli').filter(c=>!v||!v.trim()||c.nm.toLowerCase().includes(v.toLowerCase()));if(!cs.length){l.classList.add('hidden');return}var iid=inputId||'woCli';l.innerHTML=cs.map(c=>`<div class="ac-i" onclick="$('${iid}').value='${c.nm.replace(/'/g,"\\'")}';$('${lid}').classList.add('hidden')"><span style="font-weight:600">${c.nm}</span><span style="float:right;font-size:11px;color:var(--txt3)">${c.ps||''} ${c.tel||''}</span></div>`).join('');l.classList.remove('hidden')}
function acProd(v){const l=$('acProdL');const cn=$('woCli').value.trim();let ps=DB.g('prod');
// 거래처가 선택되어 있으면 해당 거래처 품목만 필터
var cliFiltered=false;
if(cn){var matched=ps.filter(p=>p.cnm===cn);if(matched.length){ps=matched;cliFiltered=true}}
// 검색어 필터
if(v&&v.trim()&&v.trim()!==' ')ps=ps.filter(p=>p.nm.toLowerCase().includes(v.toLowerCase()));
if(!ps.length&&cliFiltered){
  // 거래처 품목에 검색 결과 없으면 전체에서 검색
  ps=DB.g('prod');
  if(v&&v.trim()&&v.trim()!==' ')ps=ps.filter(p=>p.nm.toLowerCase().includes(v.toLowerCase()));
  cliFiltered=false;
}
if(!ps.length){l.innerHTML='<div style="padding:14px;text-align:center;color:var(--txt3);font-size:13px">등록된 품목이 없습니다</div>';l.classList.remove('hidden');return}
let h='';
if(cliFiltered){
  h+='<div style="padding:8px 12px;font-size:12px;font-weight:600;background:#EFF6FF;color:#1E3A5F;border-bottom:1px solid var(--bdr);position:sticky;top:0">'+cn+' 품목 ('+ps.length+'건)</div>';
  ps.forEach(p=>{h+=`<div class="ac-i" onclick="selProd('${p.id}')" style="font-weight:600"><span>${p.nm}</span><span style="float:right;font-size:11px;color:var(--txt2)">${p.spec||''}</span></div>`});
  // 다른 거래처 품목도 보기 버튼
  h+='<div style="padding:8px 12px;text-align:center;border-top:1px solid var(--bdr)"><button class="btn btn-sm btn-o" onclick="$(\'woCli\').value=\'\';acProd($(\'woProd\').value||\' \')" style="font-size:12px">전체 품목 보기</button></div>';
}else{
  // 업체별 그룹핑
  const groups={};ps.forEach(p=>{const key=p.cnm||'(미지정)';if(!groups[key])groups[key]=[];groups[key].push(p)});
  const keys=Object.keys(groups).sort((a,b)=>a>b?1:-1);
  keys.forEach(k=>{h+=`<div style="padding:6px 10px;font-size:11px;font-weight:600;background:var(--bg2);color:var(--txt2);border-bottom:1px solid var(--bdr);position:sticky;top:0">${k}</div>`;groups[k].forEach(p=>{h+=`<div class="ac-i" onclick="selProd('${p.id}')"><span>${p.nm}</span><span style="float:right;font-size:11px;color:var(--txt3)">${p.spec||''}</span></div>`})});
}
l.innerHTML=h;l.classList.remove('hidden')}
function getDefectHistory(pnm){
  var dfLog=DB.g('defectLog');
  var matches=dfLog.filter(function(d){return d.pnm===pnm}).sort(function(a,b){return b.tm>a.tm?1:-1});
  if(!matches.length)return '';
  // 최근 5건까지
  var recent=matches.slice(0,5);
  var lines=recent.map(function(d){return '['+d.dt+'] '+d.proc+' - '+d.reason+' (불량 '+d.defect+'매, '+d.worker+')'});
  return '이전 불량 이력\n'+lines.join('\n');
}
function selProd(id){const p=DB.g('prod').find(x=>x.id===id);if(!p)return;$('woProd').value=p.nm;$('woPrint').value=p.ps||'';$('woGold').value=p.gold||'';$('woMold').value=p.mold||'';$('woHand').value=p.hand||'';$('woNote').value=p.nt||'';_loadPapersFabrics(p);
  // 불량 이력 자동 삽입
  var defHist=getDefectHistory(p.nm);
  $('woCaut').value=defHist?(defHist+(p.caut?'\n\n'+p.caut:'')):(p.caut||'');
if(p.cnm&&!$('woCli').value){$('woCli').value=p.cnm;const c=DB.g('cli').find(x=>x.nm===p.cnm);if(c){$('woAddr').value=c.addr||'';$('woTel').value=c.tel||'';$('woFax').value=c.fax||''}}
if(p.procs&&p.procs.length){cProcs=p.procs.map(x=>({nm:x.nm,tp:x.tp||'n',mt:x.mt||'',vd:x.vd||'',st:'대기',qty:0,t1:'',t2:''}));renP();checkProcWarn()}cMo('prodSearchMo');
showPastWOPanel(p.nm,p.cnm)}

function showPastWOPanel(pnm,cnm){
  var box=$('woPastPanel');
  if(!box)return;
  var os=DB.g('wo').filter(function(o){return o.pnm===pnm||(cnm&&o.cnm===cnm&&o.pnm===pnm)}).sort(function(a,b){return b.cat>a.cat?1:-1});
  if(!os.length){box.innerHTML='';box.style.display='none';return}
  var h='<div style="padding:12px;background:#EFF6FF;border-radius:12px;margin-top:10px">';
  h+='<div style="font-size:13px;font-weight:600;color:#1E3A5F;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">이 품목의 이전 작업지시 ('+os.length+'건)<button class="btn btn-sm btn-o" onclick="$(\'woPastPanel\').style.display=\'none\'" style="font-size:11px;padding:3px 8px">닫기</button></div>';
  h+='<div style="max-height:180px;overflow-y:auto">';
  os.slice(0,10).forEach(function(o){
    var procStr=o.procs?o.procs.map(function(p){return p.nm}).join(' → '):'';
    h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#fff;border-radius:8px;margin-bottom:4px;font-size:13px;cursor:pointer;transition:background .1s" onmouseover="this.style.background=\'#F4F5F7\'" onmouseout="this.style.background=\'#fff\'" onclick="loadPastWO(\''+o.id+'\')">';
    h+='<div><div style="font-weight:600">'+o.wn+' <span style="color:var(--txt3);font-weight:400">'+o.dt+'</span></div>';
    h+='<div style="font-size:11px;color:var(--txt2)">'+o.cnm+' | '+o.fq+'매 | '+(o.vendor||'자체')+'</div>';
    h+='<div style="font-size:11px;color:var(--txt3);margin-top:2px">'+procStr+'</div></div>';
    h+='<div style="font-size:12px;color:#1E3A5F;font-weight:600;white-space:nowrap;padding-left:10px">불러오기</div>';
    h+='</div>';
  });
  h+='</div></div>';
  box.innerHTML=h;box.style.display='block';
}

function loadPastWO(woId){
  var o=DB.g('wo').find(function(x){return x.id===woId});
  if(!o)return;
  if(!confirm(o.wn+' 작업지시의 정보를 불러옵니다.\n수량과 출고일만 새로 입력하면 됩니다.'))return;
  editId=null;
  $('woNum').value=gWN();
  $('woDt').value=td();
  fillWOMgr();
  $('woCli').value=o.cnm;$('woAddr').value=o.addr||'';$('woTel').value=o.tel||'';$('woFax').value=o.fax||'';
  $('woProd').value=o.pnm;$('woPaper').value=o.paper||'';$('woSpec').value=o.spec||'';
  $('woQM').value=o.qm||'';$('woQE').value=o.qe||'';
  $('woFabric').value=o.fabric||'';$('woFabricSpec').value=o.fabricSpec||'';$('woFabricQty').value=o.fabricQty||'';$('woFabricExtra').value=o.fabricExtra||'';
  $('woPrint').value=o.ps||'';
  $('woGold').value=o.gold||'';$('woMold').value=o.mold||'';$('woHand').value=o.hand||'';
  $('woFQ').value='';$('woShip').value='';
  $('woDlv').value=o.dlv||'';$('woNote').value=o.nt||'';$('woCaut').value=o.caut||'';
  if(o.vendor&&$('woVendor'))$('woVendor').value=o.vendor;
  cProcs=o.procs.map(function(p){return{nm:p.nm,tp:p.tp,mt:p.mt||'',vd:p.vd||'',st:'대기',qty:0,t1:'',t2:''}});
  renP();checkProcWarn();
  $('woPastPanel').style.display='none';
  toast('이전 작업지시 불러옴. 수량/출고일을 입력하세요.','ok');
}
var _acVdIdx=-1;
function acVendorInProc(v,idx){
  _acVdIdx=-1;
  var l=$('acVdP'+idx);if(!l)return;
  var allRaw=DB.g('vendors').map(function(x){return x.nm}).concat(DB.g('cli').filter(function(c){return c.cType==='purchase'||c.cType==='both'||c.isVendor}).map(function(c){return c.nm}));
  var all=allRaw.filter(function(nm,i){return allRaw.indexOf(nm)===i});
  var filtered=v?all.filter(function(nm){return nm.toLowerCase().includes(v.toLowerCase())}):all;
  if(!filtered.length){l.classList.add('hidden');return}
  l.innerHTML=filtered.map(function(nm,i){var safe=nm.replace(/'/g,"&#39;");return'<div class="ac-i" data-ac-idx="'+i+'" onclick="pickAcVd(this,'+idx+')">'+nm+'</div>'}).join('');
  l.classList.remove('hidden');
}
function pickAcVd(el,idx){
  var nm=el.textContent;
  cProcs[idx].vd=nm;
  el.closest('.ac-w').querySelector('input').value=nm;
  $('acVdP'+idx).classList.add('hidden');
  _acVdIdx=-1;
}
function acVdKeydown(e,idx){
  var l=$('acVdP'+idx);if(!l||l.classList.contains('hidden'))return;
  var items=l.querySelectorAll('.ac-i');if(!items.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();_acVdIdx=Math.min(_acVdIdx+1,items.length-1);_hlAcVd(items)}
  else if(e.key==='ArrowUp'){e.preventDefault();_acVdIdx=Math.max(_acVdIdx-1,0);_hlAcVd(items)}
  else if(e.key==='Enter'){e.preventDefault();if(_acVdIdx>=0&&items[_acVdIdx])pickAcVd(items[_acVdIdx],idx);else if(items.length===1)pickAcVd(items[0],idx)}
  else if(e.key==='Escape'){l.classList.add('hidden');_acVdIdx=-1}
}
function _hlAcVd(items){
  items.forEach(function(el,i){el.style.background=i===_acVdIdx?'var(--pri-l)':'';el.style.fontWeight=i===_acVdIdx?'700':''});
  if(_acVdIdx>=0&&items[_acVdIdx])items[_acVdIdx].scrollIntoView({block:'nearest'});
}
function acMoldInProc(v,idx){var l=$('acMoldP'+idx);if(!l)return;if(!v){l.classList.add('hidden');return}var ms=DB.g('mold').filter(function(m){return m.no.includes(v)||m.pnm.includes(v)});if(!ms.length){l.classList.add('hidden');return}l.innerHTML=ms.map(function(m){return'<div class="ac-i" onclick="cProcs['+idx+'].moldNo=\''+m.no+'\';this.closest(\'.ac-w\').querySelector(\'input\').value=\''+m.no+'\';$(\'acMoldP'+idx+'\').classList.add(\'hidden\');$(\'woMold\').value=\''+m.no+'\'">'+m.no+' ('+m.pnm+')</div>'}).join('');l.classList.remove('hidden')}
function _setWoImg(file){if(!file||!file.type.startsWith('image/'))return;var r=new FileReader();r.onload=function(e){var pv=$('woImgP');var hint=$('woImgHint');var zone=$('woImgZone');if(pv)pv.innerHTML='<img src="'+e.target.result+'" style="max-width:200px;max-height:130px;border-radius:6px;border:1px solid var(--bdr);cursor:pointer" onclick="window.open(this.src)" title="클릭하면 원본 보기"><button onclick="event.stopPropagation();woImgClear()" style="display:block;margin:4px auto 0;font-size:10px;color:var(--txt2);background:none;border:none;cursor:pointer">× 제거</button>';if(hint)hint.style.display='none';if(zone)zone.style.borderColor='var(--pri)'};r.readAsDataURL(file)}
function prevImg(inp){if(inp.files&&inp.files[0])_setWoImg(inp.files[0])}
function woImgDrop(e){e.preventDefault();var zone=$('woImgZone');if(zone)zone.style.borderColor='var(--bdr)';var file=e.dataTransfer.files[0];if(file)_setWoImg(file)}
function woImgClear(){var pv=$('woImgP');var hint=$('woImgHint');var zone=$('woImgZone');if(pv)pv.innerHTML='';if(hint)hint.style.display='';if(zone)zone.style.borderColor='var(--bdr)';var inp=$('woImg');if(inp)inp.value=''}
// 클립보드 붙여넣기 (모달이 열려 있을 때만)
document.addEventListener('paste',function(e){if(!document.getElementById('woMo')||document.getElementById('woMo').style.display==='none')return;var items=e.clipboardData&&e.clipboardData.items;if(!items)return;for(var i=0;i<items.length;i++){if(items[i].type.startsWith('image/')){_setWoImg(items[i].getAsFile());toast('이미지 붙여넣기 완료','ok');break}}});
function saveWO(){
const cn=$('woCli').value.trim(),pn=$('woProd').value.trim(),fq=$('woFQ').value,sd=$('woShip').value;
var _p0=cPapers[0]||{};var qm=_p0.qm||0;
if(!cn){toast('거래처명 필요','err');$('woCli').focus();return false}
if(!pn){toast('제품명 필요','err');$('woProd').focus();return false}
if(!qm||+qm<=0){toast('정매수량 필요','err');return false}
if(!cProcs.length){toast('공정 추가 필요','err');return false}
if(!fq||+fq<=0){toast('완제품 수량 필요','err');$('woFQ').focus();return false}
if(!sd){toast('출고일정 필요','err');$('woShip').focus();return false}
if(sd<td()&&!confirm('출고일이 오늘 이전입니다. 계속?'))return false;

// ===== 마스터 자동 등록 =====
// 1. 거래처 자동 등록
var _cliList=DB.g('cli');
if(!_cliList.find(function(c){return c.nm===cn})){
  var _nc={id:gid(),nm:cn,cType:'sales',ps:'',addr:$('woAddr').value.trim(),tel:$('woTel').value.trim(),fax:$('woFax').value.trim(),nt:'',cat:nw()};
  _cliList.push(_nc);DB.s('cli',_cliList);
  if(typeof rCli==='function')rCli();
  toast(cn+' 거래처 자동 등록','ok');
}
// 2. 품목 자동 등록
var _prodList=DB.g('prod');
var _existProd=_prodList.find(function(p){return p.nm===pn&&p.cnm===cn});
if(!_existProd){
  var _cid=DB.g('cli').find(function(c){return c.nm===cn});
  var _p0=cPapers[0]||{};
  var _np={id:gid(),nm:pn,cnm:cn,cid:_cid?_cid.id:'',code:typeof genProdCode==='function'?genProdCode(cn):'',price:0,paper:_p0.paper||'',spec:_p0.spec||'',fabric:(cFabrics[0]||{}).fabric||'',fabricSpec:(cFabrics[0]||{}).fabricSpec||'',qm:_p0.qm||0,qe:_p0.qe||0,papers:cPapers.map(function(x){return Object.assign({},x)}),fabrics:cFabrics.map(function(x){return Object.assign({},x)}),ps:'',procs:cProcs.map(function(p){return{nm:p.nm,tp:p.tp,mt:''}}),gold:'',mold:'',hand:'',nt:'',caut:''};
  _prodList.push(_np);DB.s('prod',_prodList);
  if(typeof rProd==='function')rProd();
  toast(pn+' 품목 자동 등록','ok');
} else {
  // 기존 품목 - papers/fabrics 배열 업데이트. 단일 종이 폼 필드는 첫 행과 동기화
  var _hasData=cPapers.some(function(x){return x.paper||x.spec||x.qm});
  if(_hasData){
    _existProd.papers=cPapers.map(function(x){return Object.assign({},x)});
    _existProd.fabrics=cFabrics.map(function(x){return Object.assign({},x)});
    var _p0=cPapers[0]||{};
    if(_p0.paper)_existProd.paper=_p0.paper;
    if(_p0.spec)_existProd.spec=_p0.spec;
    if(_p0.qm)_existProd.qm=_p0.qm;
  }
  DB.s('prod',_prodList);
}
// 3. 인쇄소/외주업체 자동 등록
var _vdList=DB.g('vendors'),_vdChanged=false;
cProcs.forEach(function(p){
  var _vNm=p.vd?p.vd.trim():'';
  if(_vNm&&!_vdList.find(function(v){return v.nm===_vNm})){
    _vdList.push({id:gid(),nm:_vNm,type:p.nm==='인쇄'?'print':'out',cat:nw()});_vdChanged=true;
  }
});
var _woVdNm=$('woVendor')?$('woVendor').value.trim():'';
if(_woVdNm&&!_vdList.find(function(v){return v.nm===_woVdNm})){
  _vdList.push({id:gid(),nm:_woVdNm,type:'print',cat:nw()});_vdChanged=true;
}
if(_vdChanged){DB.s('vendors',_vdList);if(typeof rVendors==='function')rVendors();}
// ==========================

let img='';const ie=document.querySelector('#woImgP img');if(ie)img=ie.src;
var _woPrice=+($('woPrice')?$('woPrice').value:0)||0;
var _f0=cFabrics[0]||{};
const wo={id:editId||gid(),wn:$('woNum').value,cid:DB.g('cli').find(c=>c.nm===cn)?.id||'',cnm:cn,addr:$('woAddr').value,tel:$('woTel').value,fax:$('woFax').value,pid:DB.g('prod').find(p=>p.nm===pn)?.id||'',pnm:pn,paper:_p0.paper||'',spec:_p0.spec||'',qm:+qm||0,qe:+(_p0.qe)||0,papers:cPapers.filter(function(p){return p.paper||p.qm}),fabric:_f0.fabric||'',fabricSpec:_f0.fabricSpec||'',fabricQty:+(_f0.fabricQty)||0,fabricExtra:+(_f0.fabricExtra)||0,fabrics:cFabrics.filter(function(f){return f.fabric||f.fabricQty}),ps:$('woPrint').value,procs:cProcs,gold:$('woGold').value,mold:$('woMold').value,hand:$('woHand').value,fq:+fq||0,sd,dlv:$('woDlv').value,nt:$('woNote').value,caut:$('woCaut').value,img,status:'대기',pri:0,cat:nw(),mgr:$('woMgr').value,vendor:$('woVendor')?$('woVendor').value:'',dt:$('woDt').value,price:_woPrice,amt:_woPrice*(+fq||0),colors:cColors.filter(function(c){return c.code})};
const os=DB.g('wo');if(editId){const i=os.findIndex(o=>o.id===editId);if(i>=0){wo.status=os[i].status;wo.pri=os[i].pri;os[i]=wo;addLog(`수정: ${wo.wn} ${wo.pnm}`)}}else{wo.pri=os.length+1;os.push(wo);addLog(`등록: ${wo.wn} ${wo.pnm}`)}
// 인쇄 공정: 외주 인쇄인 경우만 자동 진행중 처리
if(!editId){
  wo.procs.forEach(function(p){
    if(p.nm==='인쇄'&&p.st==='대기'){p.st='진행중';p.t1=nw();if(wo.vendor){p.tp='out';if(!p.vd)p.vd=wo.vendor}}
  });
  if(wo.procs.some(function(p){return p.st==='진행중'}))wo.status='진행중';
}
DB.s('wo',os);lastSavedId=wo.id;
// 수주 연동: WO 저장 시 order 레코드 자동 생성/연결
if(!editId){
  var _ordId=$('woOrdId')?$('woOrdId').value:'';
  var _orders=getOrders();
  if(_ordId){
    // 기존 수주와 연결
    var _ord=_orders.find(function(x){return x.id===_ordId});
    if(_ord){_ord.woNo=wo.wn;_ord.woId=wo.id;_ord.status='수주확정';if(wo.price)_ord.price=wo.price;if(wo.amt)_ord.amt=wo.amt;saveOrders(_orders)}
    if($('woOrdId'))$('woOrdId').value='';
  } else {
    // 수주 없이 WO 직접 등록 → order 레코드 자동 생성
    var _newOrd={id:gid(),no:'ORD-'+wo.wn,dt:wo.dt,cli:wo.cnm,items:[{nm:wo.pnm,qty:wo.fq,price:wo.price||0}],price:wo.price||0,amt:wo.amt||0,due:wo.sd,status:'수주확정',woNo:wo.wn,woId:wo.id};
    _orders.push(_newOrd);saveOrders(_orders);
  }
}
toast('저장 완료','ok');editId=null;
cMo('woFormOv');rWOList();
try{if(typeof rDash==='function')rDash();if(typeof rPlan==='function')rPlan();if(typeof rWQ==='function')rWQ();if(typeof updateShipBadge==='function')updateShipBadge();}catch(e){}
return true}
function rWOList(){
const os=DB.g('wo'),s=($('woSch')?.value||'').toLowerCase();
let f=os.filter(o=>!s||o.cnm.toLowerCase().includes(s)||o.pnm.toLowerCase().includes(s));
// 상태 건수 계산 → 필터 버튼 뱃지 갱신
var _cnt={all:os.length,'대기':0,'진행중':0,'완료':0,'지연':0,'보류':0,'취소':0};
os.forEach(function(o){
  if(o.status==='대기')_cnt['대기']++;
  else if(o.status==='진행중')_cnt['진행중']++;
  else if(o.status==='완료'||o.status==='완료대기')_cnt['완료']++;
  else if(o.status==='보류')_cnt['보류']++;
  else if(o.status==='취소')_cnt['취소']++;
  if(isLate(o))_cnt['지연']++;
});
var _labels={all:'전체','대기':'대기','진행중':'진행','완료':'완료','지연':'지연','보류':'보류','취소':'취소'};
document.querySelectorAll('#t-wo .filter-btn').forEach(function(btn){
  var f2=btn.getAttribute('data-f');
  if(f2&&_cnt[f2]!==undefined)btn.textContent=_labels[f2]+'('+_cnt[f2]+')';
});
if(woFilter==='지연')f=f.filter(o=>isLate(o));
else if(woFilter==='완료')f=f.filter(o=>o.status==='완료'||o.status==='완료대기');
else if(woFilter!=='all')f=f.filter(o=>o.status===woFilter);
var _vf=$('woVendorFilter')?$('woVendorFilter').value:'';
if(_vf==='__self__')f=f.filter(function(o){return !o.vendor});
else if(_vf)f=f.filter(function(o){return o.vendor===_vf});
var _cf=$('woCliFilter')?$('woCliFilter').value:'';
if(_cf)f=f.filter(function(o){return o.cnm===_cf});
// 거래처 드롭다운 동적 갱신
var cliSel=$('woCliFilter');
if(cliSel){var curVal=cliSel.value;var cliNames=[...new Set(os.map(function(o){return o.cnm}))].sort();
var ch='<option value="">전체 거래처</option>';cliNames.forEach(function(c){ch+='<option value="'+c+'"'+(c===curVal?' selected':'')+'>'+c+'</option>'});cliSel.innerHTML=ch}
f.sort((a,b)=>b.cat>a.cat?1:-1);
$('woTbl').querySelector('tbody').innerHTML=f.map(o=>{
var acts='<button class="btn btn-sm btn-o" onclick="editWO(\''+o.id+'\')">수정</button> <button class="btn btn-sm btn-p" onclick="printWO(\''+o.id+'\')">출력</button> <button class="btn btn-sm btn-o" onclick="copyWO(\''+o.id+'\')">복사</button> <button class="btn btn-sm btn-o" onclick="saveAsTpl(\''+o.id+'\')">템플릿</button>';
if(o.status==='취소')acts+=' <button class="btn btn-sm btn-blue" onclick="restoreWO(\''+o.id+'\')">복원</button> <button class="btn btn-sm btn-d" onclick="delWO(\''+o.id+'\')">삭제</button>';
else if(o.status==='보류')acts+=' <button class="btn btn-sm btn-blue" onclick="restoreWO(\''+o.id+'\')">복원</button>';
else if(o.status!=='완료'&&o.status!=='출고완료'){acts+=' <button class="btn btn-sm btn-wrn" onclick="holdWO(\''+o.id+'\')">보류</button>';acts+=' <button class="btn btn-sm btn-gray" onclick="cancelWO(\''+o.id+'\')">취소</button>'}
var _amtStr=o.amt?(o.amt).toLocaleString()+'원':(o.price&&o.fq?(o.price*o.fq).toLocaleString()+'원':'-');
var _dl=dLeft(o);var _sdDisp=o.sd;
if(o.status!=='완료'&&o.status!=='출고완료'&&o.sd){
  if(isLate(o)){_sdDisp='<span style="color:var(--dan);font-weight:700">'+o.sd+'</span><br><span class="tag tag-red" style="font-size:10px;padding:0 5px">'+Math.abs(_dl)+'일 초과</span>';}
  else if(_dl<=3){_sdDisp='<span style="color:var(--wrn);font-weight:700">'+o.sd+'</span><br><span class="tag tag-orange" style="font-size:10px;padding:0 5px">D-'+_dl+'</span>';}
}
var _rowCls=isLate(o)?'class="row-late"':'';
return '<tr '+_rowCls+'><td><a href="#" onclick="showDet(\''+o.id+'\');return false" style="color:var(--pri);font-weight:700">'+o.wn+'</a></td><td>'+o.dt+'</td><td>'+o.cnm+'</td><td>'+o.pnm+'</td><td>'+o.fq+'</td><td style="color:var(--pri);font-weight:700">'+_amtStr+'</td><td>'+_sdDisp+'</td><td>'+(o.vendor||'자체')+'</td><td>'+progBar(o)+'</td><td>'+(isLate(o)?badge('지연'):badge(o.status))+'</td><td>'+acts+'</td></tr>'}).join('')||'<tr><td colspan="11" class="empty-cell">작업지시 없음</td></tr>'}
function _loadPapersFabrics(o){cPapers=o.papers&&o.papers.length?o.papers.map(function(p){return Object.assign({paper:'',spec:'',qm:0,qe:0},p)}):[{paper:o.paper||'',spec:o.spec||'',qm:o.qm||0,qe:o.qe||0}];cFabrics=o.fabrics&&o.fabrics.length?o.fabrics.map(function(f){return Object.assign({fabric:'',fabricSpec:'',fabricQty:0,fabricExtra:0},f)}):[{fabric:o.fabric||'',fabricSpec:o.fabricSpec||'',fabricQty:o.fabricQty||0,fabricExtra:o.fabricExtra||0}];renPapers();renFabrics();}
function editWO(id){const o=DB.g('wo').find(x=>x.id===id);if(!o)return;editId=id;$('woNum').value=o.wn||'';$('woDt').value=o.dt||'';fillWOMgr(o.mgr);$('woCli').value=o.cnm||'';$('woAddr').value=o.addr||'';$('woTel').value=o.tel||'';$('woFax').value=o.fax||'';$('woProd').value=o.pnm||'';$('woPrint').value=o.ps||'';$('woGold').value=o.gold||'';$('woMold').value=o.mold||'';$('woHand').value=o.hand||'';$('woFQ').value=o.fq||'';$('woShip').value=o.sd||'';$('woDlv').value=o.dlv||'';$('woNote').value=o.nt||'';$('woCaut').value=o.caut||'';if($('woPrice'))$('woPrice').value=o.price||'';_updateWoAmt();if(o.img)$('woImgP').innerHTML=`<img src="${o.img}" style="max-width:180px;max-height:120px;border:1px solid var(--bdr)">`;else $('woImgP').innerHTML='';_loadPapersFabrics(o);cColors=o.colors&&o.colors.length?o.colors.map(function(c){return Object.assign({},c)}):[];renColors();cProcs=o.procs.map(p=>({...p}));renP();checkProcWarn();$('woFormTitle').textContent='작업지시서 수정';var ov=$('woFormOv');if(ov)ov.classList.remove('hidden');}
// Copy work order
function copyWO(id){const o=DB.g('wo').find(x=>x.id===id);if(!o)return;if(!confirm(`${o.pnm} 작업지시를 복사합니다. 수량과 출고일만 변경하세요.`))return;editId=null;$('woNum').value=gWN();$('woDt').value=td();fillWOMgr();$('woCli').value=o.cnm||'';$('woAddr').value=o.addr||'';$('woTel').value=o.tel||'';$('woFax').value=o.fax||'';$('woProd').value=o.pnm||'';$('woPrint').value=o.ps||'';$('woGold').value=o.gold||'';$('woMold').value=o.mold||'';$('woHand').value=o.hand||'';$('woFQ').value=o.fq||'';$('woShip').value='';$('woDlv').value=o.dlv||'';$('woNote').value=o.nt||'';$('woCaut').value=o.caut||'';if($('woPrice'))$('woPrice').value=o.price||'';_updateWoAmt();$('woImgP').innerHTML='';_loadPapersFabrics(o);cColors=o.colors&&o.colors.length?o.colors.map(function(c){return Object.assign({},c)}):[];renColors();cProcs=o.procs.map(p=>({nm:p.nm,tp:p.tp,mt:p.mt,vd:p.vd,st:'대기',qty:0,t1:'',t2:''}));renP();$('woFormTitle').textContent='작업지시서 복사 등록';var ov=$('woFormOv');if(ov)ov.classList.remove('hidden');toast('복사됨. 출고일 설정 후 저장','ok')}
function delWO(id){const o=DB.g('wo').find(x=>x.id===id);if(!o)return;if(o.status!=='대기'&&o.status!=='취소'){toast('대기/취소 상태만 삭제 가능','err');return}if(!confirm(`삭제: ${o.cnm} - ${o.pnm}`))return;if(!confirm('복구 불가. 최종 확인?'))return;DB.s('wo',DB.g('wo').filter(x=>x.id!==id));addLog(`삭제: ${o.wn} ${o.pnm}`);rWOList();if(typeof rDash==='function')rDash();if(typeof rPlan==='function')rPlan();toast('삭제','ok')}
function chgProcSt(woId,pi,newSt){
var wos=DB.g('wo');var oi=wos.findIndex(function(x){return x.id===woId});if(oi<0)return;
var o=wos[oi],p=o.procs[pi],now=new Date().toISOString();
// 완료/외주완료는 수량 입력 모달로 처리
if(newSt==='완료'||newSt==='외주완료'){
  compItem={woId:woId,pIdx:pi,newSt:newSt};
  $('compNm').textContent=o.pnm;
  $('compInf').textContent=o.cnm+' | '+p.nm+' | '+(newSt==='외주완료'?'외주업체: '+(p.vd||'-'):'내부공정');
  $('compQty').value=getWQ(o)||'';
  $('compMo').classList.remove('hidden');
  $('compQty').focus();
  $('compQty').select();
  return;
}
if(newSt==='진행중'){p.st='진행중';p.t1=now;o.status='진행중'}
else if(newSt==='외주대기'){p.st='외주대기';p.t1=now;o.status='진행중'}
else if(newSt==='보류'){p.st='보류';o.status='보류';var reason=prompt('보류 사유:');if(reason)p.holdReason=reason}
else if(newSt==='재작업'){p.st='대기';p.t1='';p.t2='';p.qty=0;o.status='진행중'}
DB.s('wo',wos);addLog('공정상태변경: '+o.pnm+' '+p.nm+'→'+newSt);
cMo('woDetMo');showDet(woId);toast(p.nm+' → '+newSt,'ok');
if(typeof rDash==='function')rDash();
if(typeof rWQ==='function')rWQ();
if(typeof rPlan==='function')rPlan();
if(typeof rPlanList==='function')rPlanList();
if(typeof rWOList==='function')rWOList();
if(typeof updateShipBadge==='function')updateShipBadge();
}
function showDet(id){var wos=DB.g('wo');var o=wos.find(x=>x.id===id);if(!o){o=wos.find(x=>x.pnm===id)}if(!o){o=wos.find(x=>x.pnm&&x.pnm.indexOf(id)>=0)}if(!o){var q=id.toLowerCase();o=wos.find(x=>x.pnm&&x.pnm.toLowerCase().indexOf(q)>=0)}if(!o){toast('작업지시서를 찾을 수 없습니다','err');return}detId=o.id;
function fmtDate(iso){if(!iso)return'-';try{var d=new Date(iso);return d.getFullYear()+'.'+(String(d.getMonth()+1).padStart(2,'0'))+'.'+(String(d.getDate()).padStart(2,'0'))}catch(e){return'-'}}
let ph=o.procs.map((p,i)=>{
var isExt=(p.nm==='인쇄'||p.nm==='외주가공'||p.tp==='out'||p.tp==='exc');
var doneDate=fmtDate(p.t2);
var defTd=p.df>0?`<td style="color:var(--dan);font-weight:700;font-size:12px">${p.df}<br><span style="font-weight:400;font-size:10px">${p.dfReason||''}</span></td>`:'<td style="color:var(--txt3)">-</td>';
var actBtn='<td>';
if(isExt&&p.st==='진행중'){
  actBtn+='<button class="btn btn-sm btn-wrn" onclick="chgProcSt(\''+o.id+'\','+i+',\'외주완료\')">입고 확인</button>';
}else if(!isExt&&(p.st==='대기'||p.st==='진행중')){
  var lbl=p.st==='대기'?'시작':'완료';
  var nst=p.st==='대기'?'진행중':'완료';
  var btnCls=p.st==='대기'?'btn-blue':'btn-s';
  actBtn+='<button class="btn btn-sm '+btnCls+'" onclick="chgProcSt(\''+o.id+'\','+i+',\''+nst+'\')">'+lbl+'</button>';
}
actBtn+='</td>';
var dateCls=p.t2?'style="font-size:11px;color:var(--suc);font-weight:600"':'style="font-size:11px;color:var(--txt3)"';
return `<tr><td>${i+1}</td><td><span class="bd ${p.tp==='out'?'bd-o':p.tp==='exc'?'bd-e':'bd-w'}">${p.nm}</span></td><td>${p.mt||'-'}</td><td>${p.vd||'-'}</td><td>${badge(p.st)}</td><td>${p.qty||'-'}</td>${defTd}<td ${dateCls}>${doneDate}</td>${actBtn}</tr>`;
}).join('');
// 불량 이력 섹션
var _dfLogs=DB.g('defectLog').filter(function(d){return d.woId===o.id});
var _dfSection='';
if(_dfLogs.length>0){
  _dfSection='<div style="margin-top:14px;background:var(--dan-l);border:1px solid #FECACA;border-radius:var(--r-sm);padding:12px"><div style="font-weight:700;color:var(--dan);font-size:13px;margin-bottom:8px">불량 이력 ('+_dfLogs.length+'건)</div>';
  _dfSection+=_dfLogs.map(function(d){return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #FEE2E2"><span class="tag tag-red">'+d.proc+'</span><span style="font-size:12px;color:var(--dan);font-weight:700">불량 '+d.defect+'개</span><span style="font-size:12px;color:var(--txt)">'+d.reason+'</span><span style="font-size:11px;color:var(--txt3);margin-left:auto">'+d.dt+' '+d.worker+'</span></div>'}).join('');
  _dfSection+='</div>';
}
$('woDetC').innerHTML=`<div class="fr"><div class="fg"><label>지시번호</label><div style="font-weight:700">${o.wn}</div></div><div class="fg"><label>작성일</label><div>${o.dt}</div></div><div class="fg"><label>담당자</label><div>${o.mgr}</div></div></div><div class="fr"><div class="fg"><label>거래처</label><div style="font-weight:700">${o.cnm}</div></div><div class="fg"><label>제품명</label><div style="font-weight:700">${o.pnm}</div></div></div><div class="fr"><div class="fg"><label>종이</label><div>${o.paper||'-'}</div></div><div class="fg"><label>규격</label><div>${o.spec||'-'}</div></div><div class="fg"><label>정매</label><div>${o.qm}</div></div><div class="fg"><label>여분</label><div>${o.qe}</div></div></div>${o.fabric?`<div class="fr"><div class="fg"><label>원단</label><div>${o.fabric}</div></div><div class="fg"><label>원단규격</label><div>${o.fabricSpec||'-'}</div></div><div class="fg"><label>원단수량</label><div>${o.fabricQty||'-'}</div></div><div class="fg"><label>원단여분</label><div>${o.fabricExtra||'-'}</div></div></div>`:''}<div class="fg" style="margin-top:10px"><label>인쇄사양</label><div>${o.ps||'-'}</div></div>${o.colors&&o.colors.length?'<div class="fg" style="margin-top:8px"><label>색상</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">'+o.colors.map(function(c){return'<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:var(--bg2);border-radius:6px;font-size:12px;border:1px solid var(--bdr)"><span style="width:14px;height:14px;border-radius:3px;background:'+(c.hex||'#ccc')+';border:1px solid #ddd;display:inline-block"></span><b>'+c.code+'</b> '+c.name+' <span style="color:var(--txt3)">('+c.type+')</span></span>'}).join('')+'</div></div>':''}<div style="margin-top:10px"><label style="font-size:12px;font-weight:700">진행률: ${progBar(o)}</label></div><div style="margin-top:10px;overflow-x:auto"><table class="dt"><thead><tr><th>#</th><th>공정</th><th>방식</th><th>업체</th><th>상태</th><th>수량</th><th>불량</th><th>완료일</th></tr></thead><tbody>${ph}</tbody></table></div>${_dfSection}<div class="fr" style="margin-top:10px"><div class="fg"><label>금박</label><div>${o.gold||'-'}</div></div><div class="fg"><label>목형</label><div>${o.mold||'-'}</div></div><div class="fg"><label>손잡이</label><div>${o.hand||'-'}</div></div></div><div class="fr"><div class="fg"><label>완제품</label><div style="font-weight:700;font-size:16px">${o.fq}</div></div><div class="fg"><label>출고일</label><div style="font-weight:700;${isLate(o)?'color:var(--dan)':''}">${o.sd}</div></div><div class="fg"><label>입고처</label><div>${o.dlv||'-'}</div></div></div>${o.nt?`<div class="fg" style="margin-top:10px"><label>특이사항</label><div style="background:var(--bg2);padding:7px">${o.nt}</div></div>`:''}${o.caut?`<div class="fg" style="margin-top:10px"><label>주의사항</label><div style="background:var(--dan-l);padding:7px;color:var(--dan);font-weight:700">${o.caut}</div></div>`:''}`;
try{
$('woDetPr').onclick=function(){printWO(detId)};
if($('woDetEd'))$('woDetEd').onclick=function(){cMo('woDetMo');editWO(detId)};
if($('woDetCp'))$('woDetCp').onclick=function(){cMo('woDetMo');copyWO(detId)};
$('woDetCancel').onclick=function(){cancelWO(detId)};
$('woDetDel').onclick=function(){deleteWO(detId)};
// 완료/출고 상태면 취소/삭제 숨기기
if(o.status==='출고완료'){$('woDetCancel').style.display='none';$('woDetDel').style.display='none'}
else{$('woDetCancel').style.display='';$('woDetDel').style.display=''}
}catch(e){}oMo('woDetMo')}
// 작업 보류
function holdWO(id){
var reason=prompt('보류 사유를 입력해주세요:');
if(reason===null)return;
var os=DB.g('wo');var o=os.find(x=>x.id===id);if(!o)return;
o.prevStatus=o.status;o.status='보류';o.holdReason=reason||'';o.holdDate=new Date().toISOString();
DB.s('wo',os);
if(typeof rDash==='function')rDash();
if(typeof rWOList==='function')rWOList();
if(typeof rPlan==='function')rPlan();
toast('보류 처리됨','ok');
}
// 작업 복원
function restoreWO(id){
if(!confirm('이 작업을 복원하시겠습니까?'))return;
var os=DB.g('wo');var o=os.find(x=>x.id===id);if(!o)return;
o.status=o.prevStatus||'진행중';delete o.prevStatus;delete o.holdReason;delete o.holdDate;
o.procs.forEach(function(p){if(p.st==='취소')p.st='대기'});
DB.s('wo',os);
if(typeof rDash==='function')rDash();
if(typeof rWOList==='function')rWOList();
if(typeof rPlan==='function')rPlan();
toast('복원됨','ok');
}
// 작업 취소
function cancelWO(id){
if(!confirm('이 작업지시서를 취소하시겠습니까?\n취소된 작업은 현황판에서 사라집니다.'))return;
var os=DB.g('wo');var o=os.find(x=>x.id===id);if(!o)return;
o.status='취소';o.procs.forEach(function(p){p.st='취소'});
DB.s('wo',os);cMo('woDetMo');
if(typeof rDash==='function')rDash();
if(typeof rWOList==='function')rWOList();
if(typeof rPlan==='function')rPlan();
toast('작업지시서 취소됨','ok');
}
// 작업 삭제
function deleteWO(id){
if(!confirm('이 작업지시서를 완전히 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.'))return;
if(!confirm('정말 삭제하시겠습니까? (최종 확인)'))return;
var _dwo=DB.g('wo').find(x=>x.id===id);
DB.s('wo',DB.g('wo').filter(x=>x.id!==id));
if(_dwo)addLog('삭제: '+(_dwo.wn||_dwo.id)+' '+(_dwo.pnm||''));
cMo('woDetMo');
if(typeof rDash==='function')rDash();
if(typeof rWOList==='function')rWOList();
if(typeof rPlan==='function')rPlan();
toast('작업지시서 삭제됨','ok');
}
// CSV Export
function exportCSV(){const os=DB.g('wo');let csv='\\uFEFF지시번호,작성일,거래처,제품명,정매,완제품,출고일,상태,진행률\\n';os.forEach(o=>{const t=o.procs.length,d=o.procs.filter(p=>p.st==='완료'||p.st==='외주완료').length;csv+=`${o.wn},${o.dt},${o.cnm},${o.pnm},${o.qm},${o.fq},${o.sd},${o.status},${d}/${t}\\n`});const b=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='작업지시목록_'+td()+'.csv';a.click();toast('엑셀 내보내기 완료','ok')}

// A4 PRINT
function printWO(id){const o=DB.g('wo').find(x=>x.id===id);if(!o)return;const co=DB.g1('co')||{nm:'팩플로우',addr:'파주시 월롱산로89',tel:'031-957-5921',fax:'031-957-5925'};
function pVal(nm){const p=o.procs.find(x=>x.nm===nm);return p?{mt:p.mt||'',vd:p.vd||'',tp:p.tp}:{mt:'',vd:'',tp:'n'}}
const pi=pVal('인쇄'),pk=pVal('코팅'),psk=pVal('실크코팅'),pg=pVal('금박'),ph=pVal('합지'),pt=pVal('톰슨'),pj=pVal('접착'),phg=pVal('후가공'),pe=pVal('기타');
const h=`
<div style="text-align:center;font-size:24px;font-weight:900;letter-spacing:6px;padding:16px 0;border:3px solid #000;margin-bottom:12px">${co.nm||'팩플로우'} 작업지시서</div>
<table>
<tr><td colspan="4" style="border:none;padding:4px 8px;font-size:11px">&nbsp;&nbsp;수신: <b>${o.vendor||''}</b></td><td colspan="6" style="border:none;padding:4px 8px;font-size:11px;text-align:right">주소 : ${co.addr}</td></tr>
<tr><td colspan="4" style="border:none;padding:4px 8px;font-size:11px">&nbsp;&nbsp;전화 : ${o.tel||''} &nbsp; 팩스 : ${o.fax||''}</td><td colspan="6" style="border:none;padding:4px 8px;font-size:11px;text-align:right">전화 : ${co.tel}</td></tr>
<tr><td colspan="4" style="border:none;padding:4px 8px;font-size:11px"></td><td colspan="6" style="border:none;padding:4px 8px;font-size:11px;text-align:right">팩스 : ${co.fax}</td></tr>
<tr><td colspan="4" style="border:none;padding:4px 8px;font-size:11px">&nbsp;&nbsp;날짜 : ${o.dt}</td><td colspan="6" style="border:none;padding:4px 8px;font-size:11px;text-align:right">담당자 : ${o.mgr}</td></tr>
</table>
<table style="margin-top:6px">
<tr><th class="lbl">거래처</th><td colspan="3" class="val" style="font-weight:700">${o.cnm}</td><th class="lbl">품명</th><td colspan="5" class="val" style="font-weight:700">${o.pnm}</td></tr>
<tr><th class="lbl">종이</th><td colspan="3" class="val">${o.paper||''} ${o.spec||''}</td><th class="lbl">정매수량</th><td colspan="2" class="val">${fmt(o.qm)}</td><th class="lbl">여분수량</th><td colspan="2" class="val">${fmt(o.qe)}</td></tr>
<tr><th class="lbl">원단</th><td colspan="3" class="val">${o.fabric||''} ${o.fabricSpec||''}</td><th class="lbl">정매수량</th><td colspan="2" class="val">${fmt(o.fabricQty)}</td><th class="lbl">여분수량</th><td colspan="2" class="val">${fmt(o.fabricExtra)}</td></tr>
<tr><th class="lbl">인쇄</th><td colspan="3" class="val">${o.ps||''}</td><th class="lbl">업체</th><td colspan="2" class="val">${pi.vd}</td><th class="lbl">CTP</th><td colspan="2" class="val">${pi.mt}</td></tr>
<tr><th class="lbl">코팅</th><td colspan="3" class="val">${pk.mt}</td><th class="lbl">업체</th><td colspan="5" class="val">${pk.vd}</td></tr>
<tr><th class="lbl">실크코팅</th><td colspan="3" class="val">${psk.mt}</td><th class="lbl">업체</th><td colspan="5" class="val">${psk.vd}</td></tr>
<tr><th class="lbl">금박(형압)</th><td colspan="3" class="val">${pg.mt}</td><th class="lbl">업체</th><td colspan="5" class="val">${pg.vd}</td></tr>
<tr><th class="lbl">합지</th><td colspan="3" class="val">${ph.mt}</td><th class="lbl">업체</th><td colspan="5" class="val">${ph.vd}</td></tr>
<tr><th class="lbl">톰슨</th><td colspan="3" class="val">${pt.mt}</td><th class="lbl">업체</th><td colspan="2" class="val">${pt.vd}</td><th class="lbl">목형번호</th><td colspan="2" class="val">${o.mold||''}</td></tr>
<tr><th class="lbl">접착</th><td colspan="3" class="val">${pj.mt}</td><th class="lbl">업체</th><td colspan="5" class="val">${pj.vd}</td></tr>
<tr><th class="lbl">후가공</th><td colspan="3" class="val">${phg.mt}</td><th class="lbl">업체</th><td colspan="5" class="val">${phg.vd}</td></tr>
<tr><th class="lbl">기타</th><td colspan="3" class="val">${pe.mt||o.hand||''}</td><th class="lbl">업체</th><td colspan="5" class="val">${pe.vd}</td></tr>
<tr><th class="lbl">완제품수량</th><td colspan="3" class="val" style="font-weight:700;font-size:13px">${fmt(o.fq)}</td><th class="lbl">납기일</th><td colspan="5" class="val" style="font-weight:700;font-size:13px;color:#C00">${o.sd}</td></tr>
</table>
<table style="margin-top:6px"><tr><td colspan="10" style="font-weight:700;padding:6px 8px">&nbsp;&nbsp;&lt; 특이사항 &gt;</td></tr>
<tr><td colspan="10" style="padding:6px 8px;min-height:30px;border:none;border-left:1px solid #333;border-right:1px solid #333">${o.nt||''}</td></tr>
<tr><td colspan="10" style="border:none;border-left:1px solid #333;border-right:1px solid #333;border-bottom:1px solid #333;padding:4px">${o.caut?'<span style="color:#C00;font-weight:700">※ '+o.caut+'</span>':''}</td></tr>
</table>
<table style="margin-top:6px"><tr><td colspan="10" style="font-weight:700;padding:6px 8px">&nbsp;&nbsp;&lt; 제품 이미지 &gt;</td></tr>
<tr><td colspan="10" style="height:180px;text-align:center;vertical-align:middle">${o.img?'<img src="'+o.img+'" style="max-height:170px;max-width:100%">':''}</td></tr>
</table>
<div style="margin-top:10px;text-align:center;font-size:10px;color:#666">* 본 작업의뢰서는 인쇄후 같이 보내주셔야 합니다.</div>`;
var w=window.open('','_blank');
if(!w){
  // 팝업 차단 시 모달로 대체
  var pm=document.getElementById('printMo');
  if(!pm){pm=document.createElement('div');pm.id='printMo';pm.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center';pm.onclick=function(e){if(e.target===pm)pm.remove()};document.body.appendChild(pm)}
  pm.innerHTML='<div style="background:#fff;width:90vw;height:90vh;border-radius:12px;overflow:hidden;display:flex;flex-direction:column"><div style="padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd"><span style="font-weight:700">작업지시서 미리보기</span><div style="display:flex;gap:8px"><button onclick="document.getElementById(\'printFrame\').contentWindow.print()" style="padding:8px 20px;background:#1E3A5F;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">인쇄</button><button onclick="document.getElementById(\'printMo\').remove()" style="padding:8px 16px;background:#E2E8F0;border:none;border-radius:8px;cursor:pointer">닫기</button></div></div><iframe id="printFrame" style="flex:1;border:none"></iframe></div>';
  var pf=document.getElementById('printFrame');
  pf.contentDocument.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${o.wn}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Malgun Gothic','Nanum Gothic',sans-serif;font-size:11px;line-height:1.4;width:210mm;padding:10mm 15mm}table{width:100%;border-collapse:collapse}th.lbl,td.val{border:1px solid #333;padding:5px 8px;font-size:11px;text-align:left;vertical-align:middle}th.lbl{background:#F0F0F0;font-weight:700;white-space:nowrap;text-align:center;width:75px}td.val{font-size:11px}@media print{@page{size:A4;margin:0}body{padding:10mm 15mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>${h}</body></html>`);
  pf.contentDocument.close();
  return;
}
w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${o.wn}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Malgun Gothic','Nanum Gothic',sans-serif;font-size:11px;line-height:1.4;width:210mm;height:297mm;padding:10mm 15mm;position:relative}
table{width:100%;border-collapse:collapse}
th.lbl,td.val{border:1px solid #333;padding:5px 8px;font-size:11px;text-align:left;vertical-align:middle}
th.lbl{background:#F0F0F0;font-weight:700;white-space:nowrap;text-align:center;width:75px}
td.val{font-size:11px}
@media print{@page{size:A4;margin:0}body{padding:10mm 15mm;-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}}
</style></head><body>
<div class="no-print" style="position:fixed;top:10px;right:10px;display:flex;gap:8px;z-index:9999">
<button onclick="window.print()" style="padding:10px 24px;font-size:14px;font-weight:700;background:#1E3A5F;color:#fff;border:none;border-radius:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2)">인쇄</button>
<button onclick="window.close()" style="padding:10px 16px;font-size:14px;font-weight:600;background:#E2E8F0;color:#475569;border:none;border-radius:8px;cursor:pointer">닫기</button>
</div>
${h}</body></html>`);w.document.close()}



// 작업지시서 팝업
function openWoListPopup(filter){
  var all=window._woListData||[];
  var woList=all;
  var titleMap={all:'전체 작업지시서',ing:'진행중',wait:'대기',late:'납기임박',urgent:'긴급'};
  var title=titleMap[filter]||'전체 작업지시서';
  if(filter==='ing')woList=all.filter(function(x){return x.curSt==='진행중'});
  else if(filter==='wait')woList=all.filter(function(x){return x.curSt!=='진행중'});
  else if(filter==='late')woList=all.filter(function(x){return x.dday<0});
  else if(filter==='urgent')woList=all.filter(function(x){return x.dday>=0&&x.dday<=3});
  var h='<div class="cmb" style="width:700px;max-height:85vh;display:flex;flex-direction:column">';
  h+='<div class="mh" style="flex-shrink:0"><h3>'+title+' ('+woList.length+'건)</h3><button class="mc" onclick="cMo(\'woListPopMo\')">&times;</button></div>';
  h+='<div style="padding:12px;overflow-y:auto;flex:1">';
  h+='<table class="dt" style="font-size:12px"><thead><tr><th>D-day</th><th>거래처</th><th>품목</th><th>현재 공정</th><th>수량</th><th>출고일</th></tr></thead><tbody>';
  woList.forEach(function(it){
    var ddS=it.dday===0?'<b style="color:#DC2626">D-DAY</b>':(it.dday<0?'<b style="color:#DC2626">D'+it.dday+'</b>':'<span style="color:'+(it.dday<=2?'#EA580C':'#6B7280')+'">D-'+it.dday+'</span>');
    var urgB=it.urgent?'':'';
    var rowBg=it.dday<0?'background:#FEF2F2;':it.dday===0?'background:#FFF7ED;':'';
    var procFlow='';
    var curColor=it.curSt==='진행중'?'#1D4ED8':'#B45309';
    var curBg=it.curSt==='진행중'?'#DCE8F5':'#FEF3C7';
    var curLabel=it.curSt==='진행중'?'진행중':'대기';
    if(it.prevNm)procFlow='<span style="color:#059669;font-size:10px">'+it.prevNm+'</span> → ';
    procFlow+='<span style="padding:2px 8px;border-radius:4px;background:'+curBg+';color:'+curColor+';font-size:11px;font-weight:600">'+it.curNm+' '+curLabel+'</span>';
    h+='<tr style="'+rowBg+'cursor:pointer" onclick="cMo(\'woListPopMo\');showDet(\''+it.wid+'\')">';
    h+='<td style="text-align:center;font-weight:700">'+ddS+urgB+'</td>';
    h+='<td>'+it.cnm+'</td>';
    h+='<td style="font-weight:600">'+it.pnm+'</td>';
    h+='<td>'+procFlow+'</td>';
    h+='<td style="text-align:right">'+fmt(it.qty)+'</td>';
    h+='<td style="font-size:11px">'+(it.sd||'-')+'</td>';
    h+='</tr>';
  });
  h+='</tbody></table>';
  if(!woList.length)h+='<div style="text-align:center;padding:24px;color:#9CA3AF">배정된 작업이 없습니다</div>';
  h+='</div></div>';
  var old=document.getElementById('woListPopMo');if(old)old.remove();
  var el=document.createElement('div');el.id='woListPopMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('woListPopMo')};
  document.body.appendChild(el);
}
// 생산완료 리스트 팝업
function openCompPopup(){
  var items=window._compItems||[];
  var compWait=items.filter(function(x){return x.st==='완료대기'});
  var compDone=items.filter(function(x){return x.st==='완료'});
  var totalQty=0;items.forEach(function(x){totalQty+=x.qty||0});
  var h='<div class="cmb" style="width:500px;max-height:80vh;display:flex;flex-direction:column">';
  h+='<div class="mh" style="background:#059669;color:#fff;flex-shrink:0"><h3 style="color:#fff">생산완료 ('+items.length+'건 / '+fmt(totalQty)+'매)</h3><button class="mc" onclick="cMo(\'compPopMo\')" style="color:#fff">&times;</button></div>';
  h+='<div style="padding:16px;overflow-y:auto;flex:1">';
  if(compWait.length){
    h+='<div style="font-size:12px;font-weight:700;color:#D97706;padding:6px 0;border-bottom:2px solid #F59E0B;margin-bottom:8px">확인대기 ('+compWait.length+')</div>';
    compWait.forEach(function(it){
      h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;margin-bottom:4px;background:#FFFBEB;border-radius:8px;border-left:3px solid #F59E0B">';
      h+='<div><span style="font-weight:700;font-size:13px">'+it.pnm+'</span> <span style="font-size:12px;color:#64748B">'+it.cnm+'</span></div>';
      h+='<div style="display:flex;gap:6px;align-items:center"><span style="font-size:11px;color:#6B7280">'+fmt(it.qty)+'매</span>';
      h+='<button onclick="event.stopPropagation();cMo(\'compPopMo\');confirmComplete(\''+it.wid+'\')" style="padding:4px 10px;font-size:11px;font-weight:700;background:#059669;color:#fff;border:none;border-radius:6px;cursor:pointer">확인</button></div>';
      h+='</div>';
    });
  }
  if(compDone.length){
    h+='<div style="font-size:12px;font-weight:700;color:#059669;padding:6px 0;border-bottom:2px solid #22C55E;margin-bottom:8px;margin-top:12px">완료 ('+compDone.length+')</div>';
    compDone.forEach(function(it){
      h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;margin-bottom:3px;background:#F0FDF4;border-radius:8px;border-left:3px solid #22C55E">';
      h+='<div><span style="font-weight:600;font-size:13px">'+it.pnm+'</span> <span style="font-size:11px;color:#64748B">'+it.cnm+'</span></div>';
      h+='<span style="font-size:11px;color:#059669;font-weight:600">'+fmt(it.qty)+'매</span>';
      h+='</div>';
    });
  }
  if(!items.length)h+='<div style="text-align:center;padding:30px;color:#9CA3AF">완료 건 없음</div>';
  h+='</div></div>';
  var old=document.getElementById('compPopMo');if(old)old.remove();
  var el=document.createElement('div');el.id='compPopMo';el.className='mo-bg';el.innerHTML=h;
  el.onclick=function(e){if(e.target===el)cMo('compPopMo')};
  document.body.appendChild(el);
}
function confirmComplete(woId){
var os=DB.g('wo');var o=os.find(function(x){return x.id===woId});if(!o)return;
var lastQty=0;for(var _i=o.procs.length-1;_i>=0;_i--){if(o.procs[_i].qty>0){lastQty=o.procs[_i].qty;break}}
var h='<div class="mb" style="width:450px"><div class="mo-t" style="display:flex;justify-content:space-between;align-items:center">완료 확인<button class="mo-x" onclick="cMo(\'compConfMo\')" style="background:none;font-size:20px;cursor:pointer;border:none">&times;</button></div>';
h+='<div style="padding:16px 20px">';
h+='<div style="background:#F0FDF4;padding:12px;border-radius:10px;margin-bottom:12px">';
h+='<div style="font-weight:700;font-size:15px;color:#1E293B">'+o.pnm+'</div>';
h+='<div style="font-size:13px;color:#64748B;margin-top:4px">'+o.cnm+' | '+o.wn+'</div>';
h+='</div>';
h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">';
h+='<div style="background:#F8FAFC;padding:10px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#64748B">완제품 수량</div><div style="font-size:20px;font-weight:800;color:#1E293B">'+o.fq+'</div></div>';
h+='<div style="background:#F8FAFC;padding:10px;border-radius:8px;text-align:center"><div style="font-size:11px;color:#64748B">공정 완료 수량</div><div style="font-size:20px;font-weight:800;color:#1E3A5F">'+lastQty+'</div></div>';
h+='</div>';
h+='<div class="fg" style="margin-bottom:8px"><label>최종 확인 수량</label><input type="number" id="compConfQty" value="'+lastQty+'" style="padding:10px;font-size:15px;font-weight:700;border:2px solid #10B981;border-radius:10px"></div>';
h+='<div class="fg" style="margin-bottom:12px"><label>비고</label><input type="text" id="compConfNote" placeholder="특이사항 입력" style="padding:8px 10px;font-size:13px"></div>';
h+='<button onclick="doConfirmComplete(\''+woId+'\')" style="width:100%;padding:12px;font-size:14px;font-weight:700;background:#059669;color:#fff;border:none;border-radius:10px;cursor:pointer">완료 확인 → 출고관리 이동</button>';
h+='</div></div>';
var el=document.createElement('div');el.id='compConfMo';el.className='mo-bg';el.innerHTML=h;
el.onclick=function(e){if(e.target===el)cMo('compConfMo')};
document.body.appendChild(el);
}
function doConfirmComplete(woId){
var qty=+$('compConfQty').value;if(!qty||qty<=0){toast('수량을 입력해주세요','err');return}
var note=$('compConfNote').value;
var os=DB.g('wo');var oi=os.findIndex(function(x){return x.id===woId});if(oi<0)return;
os[oi].status='완료';os[oi].compDate=td();os[oi].compQty=qty;os[oi].compNote=note||'';
DB.s('wo',os);
addLog('완료확인: '+os[oi].pnm+' 수량:'+qty+' by '+(CU?CU.nm:'관리자'));
cMo('compConfMo');
toast('완료 확인! 출고관리에서 출고 처리하세요.','ok');
if(typeof rDash==='function')rDash();
if(typeof rPlan==='function')rPlan();
if(typeof rWOList==='function')rWOList();
if(typeof rShipReady==='function')rShipReady();
if(typeof updateShipBadge==='function')updateShipBadge();
}
function openComp(woId){const o=DB.g('wo').find(x=>x.id===woId);if(!o)return;
var proc=CU?CU.proc:'';
var pi=-1;
o.procs.forEach(function(p,i){if(p.nm===proc&&(p.st==='진행중'||p.st==='외주대기'))pi=i});
if(pi<0){var cp=curP(o);if(cp&&cp.st==='진행중')pi=o.procs.indexOf(cp)}
if(pi<0)return;
compItem={woId,pIdx:pi};$('compNm').textContent=o.pnm;$('compInf').textContent=`${o.cnm} | ${o.procs[pi].nm} | 시작: ${o.procs[pi].t1}`;
var _isLastProc=(pi===o.procs.length-1)||o.procs.slice(pi+1).every(function(x){return x.st==='완료'||x.st==='외주완료'||x.st==='스킵'});
$('compQty').value=_isLastProc?(o.fq||getWQ(o)):(getWQ(o)||'');if($('compDefect'))$('compDefect').value='0';if($('compDefectReason'))$('compDefectReason').value='';
// 이전 불량 이력 표시
var hw=$('compHistWarn');if(hw){
  var procNm=o.procs[pi].nm;
  var prevDf=DB.g('defectLog').filter(function(d){return d.pnm===o.pnm&&d.proc===procNm&&d.defect>0});
  if(prevDf.length){
    var recent=prevDf.slice().sort(function(a,b){return b.dt>a.dt?1:-1}).slice(0,3);
    hw.innerHTML='<div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:8px 10px;margin-bottom:10px;font-size:12px">'
      +'<div style="font-weight:700;color:#92400E;margin-bottom:4px">⚠ 이 공정 이전 불량 이력</div>'
      +recent.map(function(d){return'<div style="color:#78350F;margin-bottom:2px">'+d.dt+' · '+d.defect+'매 · <b>'+( d.reason||'사유없음')+'</b></div>'}).join('')
      +'</div>';
  }else{hw.innerHTML=''}
}
$('compMo').classList.remove('hidden');$('compQty').focus();$('compQty').select()}
function doComp(){if(!compItem)return;const qty=+$('compQty').value;if(!qty||qty<=0){toast('수량을 입력해주세요','err');$('compQty').focus();return}
var defect=+($('compDefect')?$('compDefect').value:0)||0;
var defReason=($('compDefectReason')?$('compDefectReason').value.trim():'');
const os=DB.g('wo');const oi=os.findIndex(o=>o.id===compItem.woId);if(oi<0)return;
const o=os[oi];const p=o.procs[compItem.pIdx];
var finalSt=compItem.newSt||'완료';
p.st=finalSt;p.qty=qty;p.df=defect;p.dfReason=defReason;p.t2=nw();
// 불량 기록 저장 (품목별 이력)
if(defect>0&&defReason){
  var dfLog=DB.g('defectLog');
  dfLog.push({id:gid(),woId:o.id,wn:o.wn||'',pnm:o.pnm,cnm:o.cnm,proc:p.nm,defect:defect,reason:defReason,worker:CU?CU.nm:'',dt:new Date().toISOString().slice(0,10),tm:nw()});
  DB.s('defectLog',dfLog);
}
// 기계코팅: 인쇄 완료 시 코팅 공정도 자동 완료
if(p.nm==='인쇄'&&p.mechCoat){
  var _coatP=o.procs.find(function(x){return x.nm==='코팅'&&x.mt==='기계코팅'&&(x.st==='대기'||x.st==='진행중')});
  if(_coatP){_coatP.st='완료';_coatP.qty=qty;_coatP.t1=p.t1;_coatP.t2=nw();addLog('기계코팅 자동완료: '+o.pnm)}
}
// 다음 공정 대기열로 이동
var _nextIdx=-1;
for(var _ni=compItem.pIdx+1;_ni<o.procs.length;_ni++){
  if(o.procs[_ni].st==='대기'){_nextIdx=_ni;break}
}
if(_nextIdx>=0){o.status='진행중'}
const allDone=o.procs.every(x=>x.st==='완료'||x.st==='외주완료'||x.st==='스킵');
if(allDone){o.status='완료대기';o.compDate=new Date().toISOString().slice(0,10)}
const hs=DB.g('hist');
// 세팅시간 계산: 같은 작업자의 직전 완료 공정 t2 → 현재 공정 t1
var _worker=CU?CU.nm:'관리자';
var _setupMin=0;
var _prevHist=hs.filter(function(h){return h.worker===_worker&&h.t2}).sort(function(a,b){return a.t2>b.t2?1:-1});
if(_prevHist.length>0){
  var _lastT2=_prevHist[_prevHist.length-1].t2;
  if(p.t1&&_lastT2){_setupMin=calcMins(_lastT2,p.t1);if(_setupMin<0||_setupMin>480)_setupMin=0;}
}
hs.push({id:gid(),woId:o.id,pnm:o.pnm,cnm:o.cnm,proc:p.nm,worker:_worker,qty,t1:p.t1,t2:p.t2,setupMin:_setupMin,doneAt:nw()});DB.s('hist',hs);
os[oi]=o;DB.s('wo',os);
addLog('공정완료: '+o.pnm+' '+p.nm+' 수량:'+qty+' by '+(CU?CU.nm:'관리자'));
$('compMo').classList.add('hidden');
// 상세보기 모달이 열려있으면 갱신
var detMo=$('woDetMo');if(detMo&&!detMo.classList.contains('hidden')){cMo('woDetMo');showDet(compItem.woId)}
compItem=null;
toast(allDone?'전체 완료!':'공정 완료','ok');
if(typeof rWQ==='function')rWQ();
if(typeof rDash==='function')rDash();
if(typeof rPlan==='function')rPlan();
if(typeof rWOList==='function')rWOList();
if(typeof rWorkerMonitor==='function')rWorkerMonitor();
if(typeof rShipReady==='function'&&allDone)rShipReady();
if(typeof updateShipBadge==='function')updateShipBadge();
}
// Worker detail view
function showWkDet(woId){const o=DB.g('wo').find(x=>x.id===woId);if(!o)return;$('wkDetC').innerHTML=`<div class="fr"><div class="fg"><label>지시번호</label><div style="font-weight:700">${o.wn}</div></div><div class="fg"><label>거래처</label><div>${o.cnm}</div></div></div><div class="fg" style="margin-top:10px"><label>제품명</label><div style="font-weight:700;font-size:18px">${o.pnm}</div></div><div class="fr" style="margin-top:10px"><div class="fg"><label>종이</label><div style="font-size:16px">${o.paper||'-'}</div></div><div class="fg"><label>규격</label><div style="font-size:16px">${o.spec||'-'}</div></div></div><div class="fr"><div class="fg"><label>정매수량</label><div style="font-size:16px;font-weight:700">${o.qm}</div></div><div class="fg"><label>완제품</label><div style="font-size:16px;font-weight:700">${o.fq}</div></div></div><div class="fg" style="margin-top:10px"><label>인쇄사양</label><div style="font-size:16px">${o.ps||'-'}</div></div>${o.gold?`<div class="fg" style="margin-top:10px"><label>금박</label><div>${o.gold}</div></div>`:''}${o.mold?`<div class="fg" style="margin-top:10px"><label>목형번호</label><div>${o.mold}</div></div>`:''}${o.nt?`<div class="fg" style="margin-top:10px"><label>특이사항</label><div style="background:var(--bg2);padding:10px;font-size:16px">${o.nt}</div></div>`:''}${o.caut?`<div class="fg" style="margin-top:10px"><label>주의사항</label><div style="background:var(--dan-l);padding:10px;font-size:18px;font-weight:700;color:var(--dan)">${o.caut}</div></div>`:''}`;oMo('wkDetMo')}

// REPORT
// 시간 계산 유틸
function calcMins(t1,t2){if(!t1||!t2)return 0;var d1=new Date(t1.replace(' ','T')),d2=new Date(t2.replace(' ','T'));var m=(d2-d1)/60000;return m>0?m:0}
function fmtTime(mins){if(!mins||mins<=0)return '-';if(mins<60)return Math.round(mins)+'분';return (mins/60).toFixed(1)+'h'}

function genRpt(type){const os=DB.g('wo'),hs=DB.g('hist');

if(type==='day'){
  const d=$('rptDD').value;if(!d)return;
  const dH=hs.filter(h=>h.doneAt&&h.doneAt.startsWith(d));
  const tQ=dH.reduce((s,h)=>s+h.qty,0);
  const dO=os.filter(o=>o.dt===d||(o.cat&&o.cat.startsWith(d)));
  // 건별 세팅/작업시간 계산
  var totalSetup=0,totalWork=0,effItems=[];
  dH.forEach(function(h){
    var workMin=calcMins(h.t1,h.t2);
    var setupMin=h.setupMin||0; // 세팅시간 (이전완료→시작)
    totalSetup+=setupMin;totalWork+=workMin;
    effItems.push({woId:h.woId,proc:h.proc,worker:h.worker,pnm:h.pnm||'-',qty:h.qty,setupMin:setupMin,workMin:workMin,eff:workMin>0?Math.round(h.qty/(workMin/60)):0});
  });
  var avgSetup=dH.length?totalSetup/dH.length:0;
  var avgWork=dH.length?totalWork/dH.length:0;
  var avgEff=totalWork>0?Math.round(tQ/(totalWork/60)):0;
  var h='<div class="sg" style="grid-template-columns:repeat(5,1fr);margin-bottom:12px">';
  h+='<div class="sb blue" style="text-align:center"><div class="v">'+dO.length+'</div><div class="l">작업지시</div></div>';
  h+='<div class="sb green" style="text-align:center"><div class="v">'+dH.length+'</div><div class="l">완료공정</div></div>';
  h+='<div class="sb orange" style="text-align:center"><div class="v">'+tQ.toLocaleString()+'</div><div class="l">생산수량</div></div>';
  h+='<div class="sb purple" style="text-align:center"><div class="v">'+fmtTime(avgSetup)+'</div><div class="l">평균 세팅</div></div>';
  h+='<div class="sb blue" style="text-align:center"><div class="v">'+avgEff.toLocaleString()+'</div><div class="l">평균 능률(매/h)</div></div>';
  h+='</div>';
  h+='<div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>공정</th><th>작업자</th><th>제품</th><th>수량</th><th>세팅시간</th><th>작업시간</th><th>능률(매/h)</th></tr></thead><tbody>';
  if(effItems.length){
    effItems.forEach(function(it){
      var effColor=it.eff>=1500?'#16A34A':it.eff>=800?'#1E3A5F':'#DC2626';
      h+='<tr><td>'+it.proc+'</td><td>'+it.worker+'</td><td style="color:var(--pri);cursor:pointer;text-decoration:underline" onclick="showDet(&quot;'+it.woId+'&quot;)">'+it.pnm+'</td><td style="text-align:right">'+it.qty.toLocaleString()+'</td><td style="text-align:center;color:#8B5CF6">'+fmtTime(it.setupMin)+'</td><td style="text-align:center">'+fmtTime(it.workMin)+'</td><td style="text-align:right;font-weight:700;color:'+effColor+'">'+it.eff.toLocaleString()+'</td></tr>';
    });
    h+='<tr style="background:#F9FAFB;font-weight:700"><td colspan="3">일일 합계/평균</td><td style="text-align:right">'+tQ.toLocaleString()+'</td><td style="text-align:center;color:#8B5CF6">평균 '+fmtTime(avgSetup)+'</td><td style="text-align:center">평균 '+fmtTime(avgWork)+'</td><td style="text-align:right;color:var(--pri)">'+avgEff.toLocaleString()+'</td></tr>';
  } else {
    h+='<tr><td colspan="7" class="empty-cell">해당 날짜 완료 작업 없음</td></tr>';
  }
  h+='</tbody></table></div>';
  // 작업자별 효율
  var byW={};
  dH.forEach(function(hh){
    var w=hh.worker||'미지정';
    if(!byW[w])byW[w]={qty:0,workMin:0,setupMin:0,cnt:0,procs:{}};
    byW[w].qty+=hh.qty;byW[w].workMin+=calcMins(hh.t1,hh.t2);byW[w].setupMin+=(hh.setupMin||0);byW[w].cnt++;
    byW[w].procs[hh.proc]=(byW[w].procs[hh.proc]||0)+1;
  });
  if(Object.keys(byW).length){
    h+='<div style="margin-top:16px;font-weight:700;font-size:14px;color:#1E293B;margin-bottom:8px">작업자별 효율</div>';
    h+='<div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>작업자</th><th>담당공정</th><th>완료건수</th><th>생산수량</th><th>작업시간</th><th>세팅시간</th><th>가동률</th><th>능률(매/h)</th></tr></thead><tbody>';
    Object.entries(byW).forEach(function(e){
      var w=e[0],v=e[1];
      var eff=v.workMin>0?Math.round(v.qty/(v.workMin/60)):0;
      var util=v.workMin+v.setupMin>0?Math.round(v.workMin/(v.workMin+v.setupMin)*100):0;
      var utilColor=util>=90?'#16A34A':util>=70?'#1E3A5F':'#DC2626';
      var effColor=eff>=1500?'#16A34A':eff>=800?'#1E3A5F':'#DC2626';
      var procStr=Object.keys(v.procs).join(', ');
      h+='<tr><td style="font-weight:700">'+w+'</td><td style="font-size:11px;color:#64748B">'+procStr+'</td><td style="text-align:center">'+v.cnt+'</td><td style="text-align:right">'+v.qty.toLocaleString()+'</td><td style="text-align:center">'+fmtTime(v.workMin)+'</td><td style="text-align:center;color:#8B5CF6">'+fmtTime(v.setupMin)+'</td><td style="text-align:center;font-weight:700;color:'+utilColor+'">'+util+'%</td><td style="text-align:right;font-weight:700;color:'+effColor+'">'+eff.toLocaleString()+'</td></tr>';
    });
    h+='</tbody></table></div>';
  }
  $('rptDC').innerHTML=h;
}

else if(type==='week'){
  const w=$('rptWD').value;if(!w)return;
  const[y,wk]=w.split('-W');const jan4=new Date(+y,0,4);
  const start=new Date(jan4.getTime()+((+wk-1)*7-(jan4.getDay()+6)%7)*864e5);
  const end=new Date(start.getTime()+6*864e5);
  const sd=start.toISOString().slice(0,10),ed=end.toISOString().slice(0,10);
  const wH=hs.filter(h=>{if(!h.doneAt)return false;const d=h.doneAt.slice(0,10);return d>=sd&&d<=ed});
  var byP={};
  wH.forEach(function(h){
    if(!byP[h.proc])byP[h.proc]={c:0,q:0,setupMin:0,workMin:0};
    byP[h.proc].c++;byP[h.proc].q+=h.qty;
    byP[h.proc].workMin+=calcMins(h.t1,h.t2);
    byP[h.proc].setupMin+=(h.setupMin||15);
  });
  var totalQ=wH.reduce(function(s,h){return s+h.qty},0);
  var totalWork=0,totalSetup=0;Object.values(byP).forEach(function(v){totalWork+=v.workMin;totalSetup+=v.setupMin});
  var avgEff=totalWork>0?Math.round(totalQ/(totalWork/60)):0;
  var wh='<div class="sec-t">'+sd+' ~ '+ed+'</div>';
  wh+='<div class="sg" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">';
  wh+='<div class="sb green" style="text-align:center"><div class="v">'+wH.length+'</div><div class="l">완료 건수</div></div>';
  wh+='<div class="sb orange" style="text-align:center"><div class="v">'+totalQ.toLocaleString()+'</div><div class="l">총 생산량</div></div>';
  wh+='<div class="sb purple" style="text-align:center"><div class="v">'+fmtTime(wH.length?totalSetup/wH.length:0)+'</div><div class="l">평균 세팅</div></div>';
  wh+='<div class="sb blue" style="text-align:center"><div class="v">'+avgEff.toLocaleString()+'</div><div class="l">평균 능률(매/h)</div></div>';
  wh+='</div>';
  wh+='<div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>공정</th><th>건수</th><th>총수량</th><th>평균 세팅</th><th>평균 작업</th><th>평균 능률(매/h)</th><th>가동률</th></tr></thead><tbody>';
  if(Object.keys(byP).length){
    Object.entries(byP).forEach(function(e){var k=e[0],v=e[1];
      var avgS=v.c?v.setupMin/v.c:0;var avgW=v.c?v.workMin/v.c:0;
      var eff=v.workMin>0?Math.round(v.q/(v.workMin/60)):0;
      var util=v.workMin+v.setupMin>0?Math.round(v.workMin/(v.workMin+v.setupMin)*100):0;
      var utilColor=util>=90?'#16A34A':util>=75?'#1E3A5F':'#DC2626';
      wh+='<tr><td>'+k+'</td><td style="text-align:center">'+v.c+'</td><td style="text-align:right">'+v.q.toLocaleString()+'</td><td style="text-align:center;color:#8B5CF6">'+fmtTime(avgS)+'</td><td style="text-align:center">'+fmtTime(avgW)+'</td><td style="text-align:right;font-weight:700;color:var(--pri)">'+eff.toLocaleString()+'</td><td style="text-align:center;font-weight:700;color:'+utilColor+'">'+util+'%</td></tr>';
    });
  } else {wh+='<tr><td colspan="7" class="empty-cell">해당 주 데이터 없음</td></tr>';}
  wh+='</tbody></table></div>';
  // 작업자별 효율
  var byWW={};
  wH.forEach(function(hh){
    var w=hh.worker||'미지정';
    if(!byWW[w])byWW[w]={qty:0,workMin:0,setupMin:0,cnt:0,procs:{}};
    byWW[w].qty+=hh.qty;byWW[w].workMin+=calcMins(hh.t1,hh.t2);byWW[w].setupMin+=(hh.setupMin||0);byWW[w].cnt++;
    byWW[w].procs[hh.proc]=(byWW[w].procs[hh.proc]||0)+1;
  });
  if(Object.keys(byWW).length){
    wh+='<div style="margin-top:16px;font-weight:700;font-size:14px;color:#1E293B;margin-bottom:8px">작업자별 효율</div>';
    wh+='<div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>작업자</th><th>담당공정</th><th>완료건수</th><th>생산수량</th><th>작업시간</th><th>세팅시간</th><th>가동률</th><th>능률(매/h)</th></tr></thead><tbody>';
    Object.entries(byWW).forEach(function(e){
      var w=e[0],v=e[1];
      var eff=v.workMin>0?Math.round(v.qty/(v.workMin/60)):0;
      var util=v.workMin+v.setupMin>0?Math.round(v.workMin/(v.workMin+v.setupMin)*100):0;
      var utilColor=util>=90?'#16A34A':util>=70?'#1E3A5F':'#DC2626';
      var effColor=eff>=1500?'#16A34A':eff>=800?'#1E3A5F':'#DC2626';
      wh+='<tr><td style="font-weight:700">'+w+'</td><td style="font-size:11px;color:#64748B">'+Object.keys(v.procs).join(', ')+'</td><td style="text-align:center">'+v.cnt+'</td><td style="text-align:right">'+v.qty.toLocaleString()+'</td><td style="text-align:center">'+fmtTime(v.workMin)+'</td><td style="text-align:center;color:#8B5CF6">'+fmtTime(v.setupMin)+'</td><td style="text-align:center;font-weight:700;color:'+utilColor+'">'+util+'%</td><td style="text-align:right;font-weight:700;color:'+effColor+'">'+eff.toLocaleString()+'</td></tr>';
    });
    wh+='</tbody></table></div>';
  }
  $('rptWC').innerHTML=wh;
}

else if(type==='month'){
  const m=$('rptMD').value;if(!m)return;
  const mH=hs.filter(h=>h.doneAt&&h.doneAt.startsWith(m));
  const mO=os.filter(o=>o.dt&&o.dt.startsWith(m));
  // 전월 비교
  var mdt=new Date(m+'-01');mdt.setMonth(mdt.getMonth()-1);
  var prevM=mdt.toISOString().slice(0,7);
  var prevH=hs.filter(h=>h.doneAt&&h.doneAt.startsWith(prevM));
  var byP={},prevByP={};
  mH.forEach(function(h){
    if(!byP[h.proc])byP[h.proc]={c:0,q:0,setupMin:0,workMin:0};
    byP[h.proc].c++;byP[h.proc].q+=h.qty;
    byP[h.proc].workMin+=calcMins(h.t1,h.t2);byP[h.proc].setupMin+=(h.setupMin||15);
  });
  prevH.forEach(function(h){
    if(!prevByP[h.proc])prevByP[h.proc]={c:0,q:0,workMin:0};
    prevByP[h.proc].c++;prevByP[h.proc].q+=h.qty;prevByP[h.proc].workMin+=calcMins(h.t1,h.t2);
  });
  var totalQ=mH.reduce(function(s,h){return s+h.qty},0);
  var totalWork=0,totalSetup=0;Object.values(byP).forEach(function(v){totalWork+=v.workMin;totalSetup+=v.setupMin});
  var avgEff=totalWork>0?Math.round(totalQ/(totalWork/60)):0;
  var mh='<div class="sg" style="grid-template-columns:repeat(5,1fr);margin-bottom:12px">';
  mh+='<div class="sb blue" style="text-align:center"><div class="v">'+mO.length+'</div><div class="l">작업지시</div></div>';
  mh+='<div class="sb green" style="text-align:center"><div class="v">'+mH.length+'</div><div class="l">완료공정</div></div>';
  mh+='<div class="sb orange" style="text-align:center"><div class="v">'+totalQ.toLocaleString()+'</div><div class="l">총생산</div></div>';
  mh+='<div class="sb purple" style="text-align:center"><div class="v">'+fmtTime(mH.length?totalSetup/mH.length:0)+'</div><div class="l">평균 세팅</div></div>';
  mh+='<div class="sb blue" style="text-align:center"><div class="v">'+avgEff.toLocaleString()+'</div><div class="l">평균 능률(매/h)</div></div>';
  mh+='</div>';
  mh+='<div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>공정</th><th>건수</th><th>총수량</th><th>평균 세팅</th><th>평균 작업</th><th>평균 능률(매/h)</th><th>가동률</th><th>전월비교</th></tr></thead><tbody>';
  if(Object.keys(byP).length){
    Object.entries(byP).forEach(function(e){var k=e[0],v=e[1];
      var avgS=v.c?v.setupMin/v.c:0;var avgW=v.c?v.workMin/v.c:0;
      var eff=v.workMin>0?Math.round(v.q/(v.workMin/60)):0;
      var util=v.workMin+v.setupMin>0?Math.round(v.workMin/(v.workMin+v.setupMin)*100):0;
      var utilColor=util>=90?'#16A34A':util>=75?'#1E3A5F':'#DC2626';
      // 전월 비교
      var prevEff=0;if(prevByP[k]&&prevByP[k].workMin>0)prevEff=Math.round(prevByP[k].q/(prevByP[k].workMin/60));
      var diff=prevEff>0?Math.round((eff-prevEff)/prevEff*100):0;
      var diffTag=prevEff===0?'<span style="color:#9CA3AF">-</span>':diff>0?'<span style="color:#16A34A;font-weight:700">↑'+diff+'%</span>':diff<0?'<span style="color:#DC2626;font-weight:700">↓'+Math.abs(diff)+'%</span>':'<span style="color:#9CA3AF">→0%</span>';
      mh+='<tr><td>'+k+'</td><td style="text-align:center">'+v.c+'</td><td style="text-align:right">'+v.q.toLocaleString()+'</td><td style="text-align:center;color:#8B5CF6">'+fmtTime(avgS)+'</td><td style="text-align:center">'+fmtTime(avgW)+'</td><td style="text-align:right;font-weight:700;color:var(--pri)">'+eff.toLocaleString()+'</td><td style="text-align:center;font-weight:700;color:'+utilColor+'">'+util+'%</td><td style="text-align:center">'+diffTag+'</td></tr>';
    });
  } else {mh+='<tr><td colspan="8" class="empty-cell">해당 월 데이터 없음</td></tr>';}
  mh+='</tbody></table></div>';
  // 작업자별 효율
  var byWM={};
  mH.forEach(function(hh){
    var w=hh.worker||'미지정';
    if(!byWM[w])byWM[w]={qty:0,workMin:0,setupMin:0,cnt:0,procs:{}};
    byWM[w].qty+=hh.qty;byWM[w].workMin+=calcMins(hh.t1,hh.t2);byWM[w].setupMin+=(hh.setupMin||0);byWM[w].cnt++;
    byWM[w].procs[hh.proc]=(byWM[w].procs[hh.proc]||0)+1;
  });
  if(Object.keys(byWM).length){
    mh+='<div style="margin-top:16px;font-weight:700;font-size:14px;color:#1E293B;margin-bottom:8px">작업자별 효율</div>';
    mh+='<div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>작업자</th><th>담당공정</th><th>완료건수</th><th>생산수량</th><th>작업시간</th><th>세팅시간</th><th>가동률</th><th>능률(매/h)</th><th>전월비교</th></tr></thead><tbody>';
    // 전월 작업자별 데이터
    var prevByWM={};
    prevH.forEach(function(hh){
      var w=hh.worker||'미지정';
      if(!prevByWM[w])prevByWM[w]={qty:0,workMin:0};
      prevByWM[w].qty+=hh.qty;prevByWM[w].workMin+=calcMins(hh.t1,hh.t2);
    });
    Object.entries(byWM).forEach(function(e){
      var w=e[0],v=e[1];
      var eff=v.workMin>0?Math.round(v.qty/(v.workMin/60)):0;
      var util=v.workMin+v.setupMin>0?Math.round(v.workMin/(v.workMin+v.setupMin)*100):0;
      var utilColor=util>=90?'#16A34A':util>=70?'#1E3A5F':'#DC2626';
      var effColor=eff>=1500?'#16A34A':eff>=800?'#1E3A5F':'#DC2626';
      var prevEff=prevByWM[w]&&prevByWM[w].workMin>0?Math.round(prevByWM[w].qty/(prevByWM[w].workMin/60)):0;
      var diff=prevEff>0?Math.round((eff-prevEff)/prevEff*100):0;
      var diffTag=prevEff===0?'<span style="color:#9CA3AF">-</span>':diff>0?'<span style="color:#16A34A;font-weight:700">↑'+diff+'%</span>':diff<0?'<span style="color:#DC2626;font-weight:700">↓'+Math.abs(diff)+'%</span>':'<span style="color:#9CA3AF">→0%</span>';
      mh+='<tr><td style="font-weight:700">'+w+'</td><td style="font-size:11px;color:#64748B">'+Object.keys(v.procs).join(', ')+'</td><td style="text-align:center">'+v.cnt+'</td><td style="text-align:right">'+v.qty.toLocaleString()+'</td><td style="text-align:center">'+fmtTime(v.workMin)+'</td><td style="text-align:center;color:#8B5CF6">'+fmtTime(v.setupMin)+'</td><td style="text-align:center;font-weight:700;color:'+utilColor+'">'+util+'%</td><td style="text-align:right;font-weight:700;color:'+effColor+'">'+eff.toLocaleString()+'</td><td style="text-align:center">'+diffTag+'</td></tr>';
    });
    mh+='</tbody></table></div>';
  }
  $('rptMC').innerHTML=mh;
}}

// 불량 분석 보고서
function genDefectRpt(){
  var m=$('rptDefectM')?$('rptDefectM').value:'';
  var logs=DB.g('defectLog')||[];
  if(m)logs=logs.filter(function(d){return d.dt&&d.dt.startsWith(m)});
  if(!logs.length){$('rptDefectC').innerHTML='<div class="empty-state"><div class="msg">해당 기간 불량 데이터 없음</div></div>';return}
  var totalQty=logs.reduce(function(s,d){return s+d.defect},0);
  var byProc={},byReason={};
  logs.forEach(function(d){
    if(!byProc[d.proc])byProc[d.proc]={cnt:0,qty:0};
    byProc[d.proc].cnt++;byProc[d.proc].qty+=d.defect;
    if(!byReason[d.reason])byReason[d.reason]={cnt:0,qty:0};
    byReason[d.reason].cnt++;byReason[d.reason].qty+=d.defect;
  });
  var h='<div class="sg" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">';
  h+='<div class="sb red" style="text-align:center"><div class="v">'+logs.length+'</div><div class="l">불량 발생 건수</div></div>';
  h+='<div class="sb red" style="text-align:center"><div class="v">'+totalQty.toLocaleString()+'</div><div class="l">총 불량 수량</div></div>';
  h+='<div class="sb orange" style="text-align:center"><div class="v">'+Object.keys(byProc).length+'</div><div class="l">불량 발생 공정</div></div>';
  h+='<div class="sb purple" style="text-align:center"><div class="v">'+Object.keys(byReason).length+'</div><div class="l">불량 사유 종류</div></div>';
  h+='</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">';
  h+='<div class="card" style="margin:0"><div class="card-t">공정별 불량 현황</div><div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>공정</th><th>건수</th><th>불량 수량</th><th>비율</th></tr></thead><tbody>';
  Object.entries(byProc).sort(function(a,b){return b[1].qty-a[1].qty}).forEach(function(e){
    var pct=totalQty>0?Math.round(e[1].qty/totalQty*100):0;
    var col=pct>=30?'#DC2626':pct>=15?'#D97706':'#16A34A';
    h+='<tr><td>'+e[0]+'</td><td style="text-align:center">'+e[1].cnt+'</td><td style="text-align:right;font-weight:700;color:'+col+'">'+e[1].qty.toLocaleString()+'</td><td style="text-align:center;font-weight:700;color:'+col+'">'+pct+'%</td></tr>';
  });
  h+='</tbody></table></div></div>';
  h+='<div class="card" style="margin:0"><div class="card-t">불량 사유별 분석</div><div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>불량 사유</th><th>건수</th><th>수량</th><th>비율</th></tr></thead><tbody>';
  Object.entries(byReason).sort(function(a,b){return b[1].qty-a[1].qty}).forEach(function(e){
    var pct=totalQty>0?Math.round(e[1].qty/totalQty*100):0;
    h+='<tr><td style="font-weight:600">'+e[0]+'</td><td style="text-align:center">'+e[1].cnt+'</td><td style="text-align:right">'+e[1].qty.toLocaleString()+'</td><td style="text-align:center;color:#DC2626;font-weight:700">'+pct+'%</td></tr>';
  });
  h+='</tbody></table></div></div>';
  h+='</div>';
  h+='<div class="card" style="margin:0"><div class="card-t">불량 상세 이력</div><div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>날짜</th><th>거래처</th><th>제품</th><th>공정</th><th>불량 수량</th><th>사유</th><th>작업자</th></tr></thead><tbody>';
  logs.slice().sort(function(a,b){return b.dt>a.dt?1:-1}).forEach(function(d){
    h+='<tr><td>'+d.dt+'</td><td>'+d.cnm+'</td><td style="cursor:pointer;color:var(--pri);text-decoration:underline" onclick="showDet(\''+d.woId+'\')">'+d.pnm+'</td><td>'+d.proc+'</td><td style="text-align:right;font-weight:700;color:#DC2626">'+d.defect.toLocaleString()+'</td><td>'+d.reason+'</td><td>'+d.worker+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  $('rptDefectC').innerHTML=h;
}

// 출고 실적 보고서
function genShipRpt(){
  var m=$('rptShipM')?$('rptShipM').value:'';
  var logs=DB.g('shipLog')||[];
  if(m)logs=logs.filter(function(s){return s.dt&&s.dt.startsWith(m)});
  if(!logs.length){$('rptShipC').innerHTML='<div class="empty-state"><div class="msg">해당 기간 출고 데이터 없음</div></div>';return}
  var totalQty=logs.reduce(function(s,r){return s+r.qty},0);
  var totalGood=logs.reduce(function(s,r){return s+(r.good||r.qty)},0);
  var totalDefect=logs.reduce(function(s,r){return s+(r.defect||0)},0);
  var byCli={},byDay={};
  logs.forEach(function(r){
    if(!byCli[r.cnm])byCli[r.cnm]={cnt:0,qty:0,defect:0};
    byCli[r.cnm].cnt++;byCli[r.cnm].qty+=r.qty;byCli[r.cnm].defect+=(r.defect||0);
    if(!byDay[r.dt])byDay[r.dt]={cnt:0,qty:0};
    byDay[r.dt].cnt++;byDay[r.dt].qty+=r.qty;
  });
  var h='<div class="sg" style="grid-template-columns:repeat(4,1fr);margin-bottom:14px">';
  h+='<div class="sb blue" style="text-align:center"><div class="v">'+logs.length+'</div><div class="l">출고 건수</div></div>';
  h+='<div class="sb green" style="text-align:center"><div class="v">'+totalQty.toLocaleString()+'</div><div class="l">총 출고 수량</div></div>';
  h+='<div class="sb green" style="text-align:center"><div class="v">'+totalGood.toLocaleString()+'</div><div class="l">양품 수량</div></div>';
  h+='<div class="sb red" style="text-align:center"><div class="v">'+totalDefect.toLocaleString()+'</div><div class="l">불량 수량</div></div>';
  h+='</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">';
  h+='<div class="card" style="margin:0"><div class="card-t">거래처별 출고 현황</div><div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>거래처</th><th>건수</th><th>출고량</th><th>양품률</th></tr></thead><tbody>';
  Object.entries(byCli).sort(function(a,b){return b[1].qty-a[1].qty}).forEach(function(e){
    var rate=e[1].qty>0?Math.round((e[1].qty-e[1].defect)/e[1].qty*100):100;
    var rc=rate>=99?'#16A34A':rate>=95?'#D97706':'#DC2626';
    h+='<tr><td style="font-weight:600">'+e[0]+'</td><td style="text-align:center">'+e[1].cnt+'</td><td style="text-align:right;font-weight:700">'+e[1].qty.toLocaleString()+'</td><td style="text-align:center;font-weight:700;color:'+rc+'">'+rate+'%</td></tr>';
  });
  h+='</tbody></table></div></div>';
  h+='<div class="card" style="margin:0"><div class="card-t">일별 출고 현황</div><div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>날짜</th><th>건수</th><th>출고량</th></tr></thead><tbody>';
  Object.entries(byDay).sort(function(a,b){return b[0]>a[0]?1:-1}).forEach(function(e){
    h+='<tr><td>'+e[0]+'</td><td style="text-align:center">'+e[1].cnt+'</td><td style="text-align:right;font-weight:700">'+e[1].qty.toLocaleString()+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  h+='</div>';
  h+='<div class="card" style="margin:0"><div class="card-t">출고 상세 이력</div><div style="overflow-x:auto"><table class="dt" style="font-size:12px"><thead><tr><th>출고일</th><th>거래처</th><th>제품</th><th>출고량</th><th>양품</th><th>불량</th><th>차량</th><th>기사</th></tr></thead><tbody>';
  logs.slice().sort(function(a,b){return b.dt>a.dt?1:-1}).forEach(function(r){
    h+='<tr><td>'+r.dt+'</td><td>'+r.cnm+'</td><td>'+r.pnm+'</td><td style="text-align:right;font-weight:700">'+r.qty.toLocaleString()+'</td><td style="text-align:right;color:#16A34A">'+((r.good||r.qty)).toLocaleString()+'</td><td style="text-align:right;color:#DC2626">'+(r.defect||0)+'</td><td>'+(r.car||'-')+'</td><td>'+(r.driver||'-')+'</td></tr>';
  });
  h+='</tbody></table></div></div>';
  $('rptShipC').innerHTML=h;
}

// 인쇄
function printRpt(type){
  var titleMap={day:'일일',week:'주간',month:'월간',perf:'작업자 성과',prodstat:'생산 분석',ordmonthly:'월별 수주',ordstat:'수주 현황',defect:'불량 분석',ship:'출고 실적'};
  var c='';
  if(type==='day')c=$('rptDC').innerHTML;
  else if(type==='week')c=$('rptWC').innerHTML;
  else if(type==='month')c=$('rptMC').innerHTML;
  else if(type==='perf')c=($('perfSummary')?$('perfSummary').innerHTML:'')+($('perfGrid')?$('perfGrid').innerHTML:'');
  else if(type==='prodstat')c=$('rpt-prodstat')?$('rpt-prodstat').innerHTML:'';
  else if(type==='ordmonthly')c=$('rptOrdMonthlyWrap')?$('rptOrdMonthlyWrap').innerHTML:'';
  else if(type==='ordstat')c=$('rptOrdStatWrap')?$('rptOrdStatWrap').innerHTML:'';
  else if(type==='defect')c=$('rptDefectC')?$('rptDefectC').innerHTML:'';
  else if(type==='ship')c=$('rptShipC')?$('rptShipC').innerHTML:'';
  if(!c){toast('먼저 보고서를 생성해주세요','err');return}
  var w=window.open('','_blank','width=1000,height=700');
  if(!w){toast('팝업이 차단되었습니다','err');return}
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>팩플로우 '+(titleMap[type]||'')+'보고서</title>');
  w.document.write('<style>*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body{font-family:"Nanum Gothic","Malgun Gothic",sans-serif;font-size:11px;padding:15mm}h2{text-align:center;margin-bottom:14px;font-size:16px;letter-spacing:2px}table{width:100%;border-collapse:collapse;margin-bottom:12px}th,td{border:1px solid #CBD5E1;padding:4px 6px;font-size:10px}th{background:#F1F5F9;font-weight:700}.card{border:1px solid #E2E8F0;border-radius:8px;padding:12px;margin-bottom:12px}.card-t{font-weight:700;font-size:13px;margin-bottom:8px;color:#1E293B}@media print{@page{size:A4;margin:10mm}button{display:none}}</style>');
  w.document.write('</head><body>');
  w.document.write('<h2>팩플로우 '+(titleMap[type]||'')+' 보고서</h2>');
  w.document.write('<div style="text-align:right;font-size:10px;color:#64748B;margin-bottom:12px">출력일시: '+nw()+'</div>');
  w.document.write(c);
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function(){w.print()},400);
}

// CSV 내보내기
function csvRpt(type){
  var csv='\uFEFF',filename='',rows=[];
  if(type==='day'||type==='week'||type==='month'){
    var hs=DB.g('hist')||[];
    var d='',label='';
    if(type==='day'){d=$('rptDD')?$('rptDD').value:'';label=d;hs=d?hs.filter(function(h){return h.doneAt&&h.doneAt.startsWith(d)}):hs}
    else if(type==='week'){
      var wv=$('rptWD')?$('rptWD').value:'';label=wv;
      if(wv){var parts=wv.split('-W'),jan4=new Date(+parts[0],0,4),start=new Date(jan4.getTime()+((+parts[1]-1)*7-(jan4.getDay()+6)%7)*864e5),end=new Date(start.getTime()+6*864e5);var sd=start.toISOString().slice(0,10),ed=end.toISOString().slice(0,10);hs=hs.filter(function(h){if(!h.doneAt)return false;var hd=h.doneAt.slice(0,10);return hd>=sd&&hd<=ed})}
    }
    else{d=$('rptMD')?$('rptMD').value:'';label=d;hs=d?hs.filter(function(h){return h.doneAt&&h.doneAt.startsWith(d)}):hs}
    csv+='공정,작업자,제품,거래처,수량,세팅시간(분),작업시간(분),능률(매/h),완료일시\n';
    hs.forEach(function(h){var wm=calcMins(h.t1,h.t2);var eff=wm>0?Math.round(h.qty/(wm/60)):0;csv+=h.proc+','+h.worker+','+h.pnm+','+h.cnm+','+h.qty+','+(h.setupMin||0)+','+Math.round(wm)+','+eff+','+h.doneAt+'\n'});
    filename=(type==='day'?'일일':type==='week'?'주간':'월간')+'보고서_'+label;
  }
  else if(type==='defect'){
    var dlogs=DB.g('defectLog')||[];
    var dm=$('rptDefectM')?$('rptDefectM').value:'';
    if(dm)dlogs=dlogs.filter(function(d){return d.dt&&d.dt.startsWith(dm)});
    csv+='날짜,거래처,제품,지시번호,공정,불량수량,사유,작업자\n';
    dlogs.forEach(function(d){csv+=d.dt+','+d.cnm+','+d.pnm+','+d.wn+','+d.proc+','+d.defect+','+d.reason+','+d.worker+'\n'});
    filename='불량분석_'+(dm||td());
  }
  else if(type==='ship'){
    var slogs=DB.g('shipLog')||[];
    var sm=$('rptShipM')?$('rptShipM').value:'';
    if(sm)slogs=slogs.filter(function(s){return s.dt&&s.dt.startsWith(sm)});
    csv+='출고일,거래처,제품,지시번호,출고량,양품,불량,차량,기사,입고처,담당자\n';
    slogs.forEach(function(r){csv+=r.dt+','+r.cnm+','+r.pnm+','+(r.wn||'')+','+r.qty+','+(r.good||r.qty)+','+(r.defect||0)+','+(r.car||'')+','+(r.driver||'')+','+(r.dlv||'')+','+(r.mgr||'')+'\n'});
    filename='출고실적_'+(sm||td());
  }
  else if(type==='perf'){
    var os=DB.g('wo')||[];var allHs=DB.g('hist')||[];
    csv+='작업자,공정,완료건수,생산수량,작업시간(분),가동률(%),능률(매/h)\n';
    var byW={};allHs.forEach(function(h){var w=h.worker||'미지정';if(!byW[w])byW[w]={qty:0,workMin:0,setupMin:0,cnt:0,proc:h.proc};byW[w].qty+=h.qty;byW[w].workMin+=calcMins(h.t1,h.t2);byW[w].setupMin+=(h.setupMin||0);byW[w].cnt++});
    Object.entries(byW).forEach(function(e){var v=e[1];var eff=v.workMin>0?Math.round(v.qty/(v.workMin/60)):0;var util=v.workMin+v.setupMin>0?Math.round(v.workMin/(v.workMin+v.setupMin)*100):0;csv+=e[0]+','+v.proc+','+v.cnt+','+v.qty+','+Math.round(v.workMin)+','+util+','+eff+'\n'});
    filename='작업자성과_'+td();
  }
  else if(type==='ordmonthly'||type==='ordstat'){
    var ords=DB.g('wo')||[];
    csv+='지시번호,거래처,제품,수량,납기일,상태,등록일\n';
    ords.forEach(function(o){csv+=(o.wn||'')+','+o.cnm+','+o.pnm+','+o.fq+','+(o.sd||'')+','+o.status+','+(o.dt||'')+'\n'});
    filename=(type==='ordmonthly'?'월별수주':'수주현황')+'_'+td();
  }
  if(!csv.includes('\n')||csv.split('\n').length<2){toast('내보낼 데이터가 없습니다','err');return}
  var b=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=filename+'.csv';a.click();
  toast('CSV 내보내기 완료','ok');
}

/* ===== 반복 주문 템플릿 ===== */
function openTplList(){
  var tpls=DB.g('woTemplates');
  var h='<div style="max-height:500px;overflow-y:auto">';
  if(!tpls.length){
    h+='<div class="empty-state"><div class="msg">등록된 템플릿이 없습니다.<br>작업지시서 목록에서 "템플릿 저장"을 이용하세요.</div></div>';
  } else {
    h+='<table class="dt"><thead><tr><th>템플릿명</th><th>거래처</th><th>제품</th><th>수량</th><th>주기</th><th>사용</th><th>관리</th></tr></thead><tbody>';
    tpls.forEach(function(t){
      var cycleNm={'monthly':'월간','weekly':'주간','biweekly':'격주','quarterly':'분기'};
      h+='<tr><td style="font-weight:700">'+t.name+'</td><td>'+t.cnm+'</td><td>'+t.pnm+'</td>';
      h+='<td>'+fmt(t.fq)+'</td><td>'+(cycleNm[t.cycle]||t.cycle)+'</td>';
      h+='<td>'+(t.useCount||0)+'회</td>';
      h+='<td><button class="btn btn-sm btn-p" onclick="loadTpl(\''+t.id+'\')">불러오기</button> ';
      h+='<button class="btn btn-sm btn-o" onclick="editTpl(\''+t.id+'\')">수정</button> ';
      h+='<button class="btn btn-sm btn-d" onclick="delTpl(\''+t.id+'\')">삭제</button></td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div>';
  $('tplListBody').innerHTML=h;
  oMo('tplListMo');
}

function saveAsTpl(woId){
  var o=DB.g('wo').find(function(x){return x.id===woId});
  if(!o){toast('작업지시서를 찾을 수 없습니다','err');return}
  var name=prompt('템플릿 이름을 입력하세요:', o.cnm+' - '+o.pnm+' 반복주문');
  if(!name)return;
  var cycle=prompt('반복 주기를 입력하세요 (monthly/weekly/biweekly/quarterly):','monthly');
  if(!cycle)cycle='monthly';
  var tpls=DB.g('woTemplates');
  var tpl={
    id:gid(),name:name,cnm:o.cnm,pnm:o.pnm,
    papers:o.papers?o.papers.map(function(p){return Object.assign({},p)}):[],
    fabrics:o.fabrics?o.fabrics.map(function(f){return Object.assign({},f)}):[],
    procs:o.procs?o.procs.map(function(p){return{nm:p.nm,tp:p.tp,mt:p.mt||'',vd:p.vd||''}}):[],
    fq:o.fq,ps:o.ps||'',gold:o.gold||'',mold:o.mold||'',hand:o.hand||'',
    nt:o.nt||'',caut:o.caut||'',price:o.price||0,
    vendor:o.vendor||'',dlv:o.dlv||'',
    colors:o.colors?o.colors.map(function(c){return Object.assign({},c)}):[],
    addr:o.addr||'',tel:o.tel||'',fax:o.fax||'',
    cycle:cycle,lastUsed:'',useCount:0,cat:nw()
  };
  tpls.push(tpl);
  DB.s('woTemplates',tpls);
  toast('템플릿 "'+name+'" 저장 완료','ok');
}

function loadTpl(tplId){
  var tpls=DB.g('woTemplates');
  var t=tpls.find(function(x){return x.id===tplId});
  if(!t){toast('템플릿을 찾을 수 없습니다','err');return}
  cMo('tplListMo');
  // Reset and populate WO form
  editId=null;
  $('woNum').value=gWN();$('woDt').value=td();fillWOMgr();
  $('woCli').value=t.cnm||'';$('woAddr').value=t.addr||'';$('woTel').value=t.tel||'';$('woFax').value=t.fax||'';
  $('woProd').value=t.pnm||'';$('woPrint').value=t.ps||'';$('woGold').value=t.gold||'';$('woMold').value=t.mold||'';$('woHand').value=t.hand||'';
  $('woFQ').value=t.fq||'';$('woShip').value='';$('woDlv').value=t.dlv||'';$('woNote').value=t.nt||'';$('woCaut').value=t.caut||'';
  if($('woPrice'))$('woPrice').value=t.price||'';
  if($('woVendor'))$('woVendor').value=t.vendor||'';
  _updateWoAmt();
  // Load papers & fabrics
  cPapers=t.papers&&t.papers.length?t.papers.map(function(p){return Object.assign({paper:'',spec:'',qm:0,qe:0},p)}):[{paper:'',spec:'',qm:0,qe:0}];
  cFabrics=t.fabrics&&t.fabrics.length?t.fabrics.map(function(f){return Object.assign({fabric:'',fabricSpec:'',fabricQty:0,fabricExtra:0},f)}):[{fabric:'',fabricSpec:'',fabricQty:0,fabricExtra:0}];
  renPapers();renFabrics();
  // Load colors
  if(typeof cColors!=='undefined'){
    cColors=t.colors&&t.colors.length?t.colors.map(function(c){return Object.assign({},c)}):[];
    if(typeof renColors==='function')renColors();
  }
  // Load procs
  cProcs=t.procs&&t.procs.length?t.procs.map(function(p){return{nm:p.nm,tp:p.tp||'n',mt:p.mt||'',vd:p.vd||'',st:'대기',qty:0,t1:'',t2:''}}):[];
  renP();
  $('woImgP').innerHTML='';
  $('woFormTitle').textContent='템플릿: '+t.name;
  var ov=$('woFormOv');if(ov)ov.classList.remove('hidden');
  // Update usage
  t.lastUsed=td();t.useCount=(t.useCount||0)+1;
  DB.s('woTemplates',tpls);
  toast('템플릿 "'+t.name+'" 불러옴. 출고일을 설정하세요.','ok');
}

function editTpl(tplId){
  var tpls=DB.g('woTemplates');
  var t=tpls.find(function(x){return x.id===tplId});
  if(!t)return;
  $('tplEditId').value=t.id;$('tplEditName').value=t.name;$('tplEditCycle').value=t.cycle||'monthly';
  $('tplEditFQ').value=t.fq||'';$('tplEditPrice').value=t.price||'';$('tplEditNote').value=t.nt||'';
  $('tplEditInfo').textContent=t.cnm+' / '+t.pnm;
  oMo('tplEditMo');
}

function saveTplEdit(){
  var tpls=DB.g('woTemplates');
  var id=$('tplEditId').value;
  var t=tpls.find(function(x){return x.id===id});
  if(!t){toast('템플릿 없음','err');return}
  t.name=$('tplEditName').value.trim()||t.name;
  t.cycle=$('tplEditCycle').value;
  t.fq=+$('tplEditFQ').value||t.fq;
  t.price=+$('tplEditPrice').value||t.price;
  t.nt=$('tplEditNote').value;
  DB.s('woTemplates',tpls);
  cMo('tplEditMo');openTplList();toast('템플릿 수정 완료','ok');
}

function delTpl(id){
  if(!confirm('이 템플릿을 삭제하시겠습니까?'))return;
  DB.s('woTemplates',DB.g('woTemplates').filter(function(x){return x.id!==id}));
  openTplList();toast('삭제','ok');
}

/* ===== 색상(별색/팬톤) 관리 ===== */
var cColors=[];

function renColors(){
  var area=$('woColorsArea');if(!area)return;
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:12px;font-weight:600;color:var(--txt2)">색상</span><div><button type="button" class="btn btn-o btn-sm" onclick="openColorMaster()" style="padding:3px 6px;font-size:10px;margin-right:4px">마스터</button><button type="button" class="btn btn-o btn-sm" onclick="addColorRow()" style="padding:3px 8px;font-size:11px">+ 추가</button></div></div>';
  cColors.forEach(function(c,i){
    h+='<div style="display:grid;grid-template-columns:auto 1fr 1fr 1fr auto;gap:4px;margin-bottom:4px;align-items:end">';
    h+='<div style="width:28px;height:28px;border-radius:6px;border:1px solid var(--bdr);background:'+(c.hex||'#ccc')+';align-self:center;cursor:pointer" onclick="pickColorHex('+i+')" title="색상 선택"></div>';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">색상코드</label><div style="position:relative"><input value="'+(c.code||'')+'" placeholder="PMS 186C" oninput="cColors['+i+'].code=this.value;acColor(this.value,'+i+')" onfocus="acColor(this.value,'+i+')" style="padding:6px 8px;font-size:12px"><div id="acClr'+i+'" class="ac-l hidden" style="position:absolute;top:100%;left:0;right:0;z-index:99;background:#fff;border:1px solid var(--bdr);border-radius:6px;max-height:150px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div></div></div>';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">색상명</label><input value="'+(c.name||'')+'" placeholder="빨강" onchange="cColors['+i+'].name=this.value" style="padding:6px 8px;font-size:12px"></div>';
    h+='<div class="fg" style="margin:0"><label style="font-size:11px">구분</label><select onchange="cColors['+i+'].type=this.value" style="padding:6px 8px;font-size:12px;border:1px solid var(--bdr);border-radius:8px"><option value="별색"'+(c.type==='별색'?' selected':'')+'>별색</option><option value="일반"'+(c.type==='일반'?' selected':'')+'>일반(CMYK)</option><option value="팬톤"'+(c.type==='팬톤'?' selected':'')+'>팬톤</option><option value="금박"'+(c.type==='금박'?' selected':'')+'>금박</option><option value="은박"'+(c.type==='은박'?' selected':'')+'>은박</option></select></div>';
    h+='<button type="button" onclick="rmColorRow('+i+')" style="background:none;border:none;color:#EF4444;font-size:16px;cursor:pointer;padding:0 4px;align-self:center">x</button>';
    h+='</div>';
  });
  if(!cColors.length) h+='<div style="font-size:11px;color:var(--txt3);padding:6px;text-align:center">색상 추가 버튼을 클릭하세요</div>';
  area.innerHTML=h;
}
function addColorRow(){cColors.push({code:'',name:'',type:'별색',hex:'#999999',recipe:'',note:''});renColors()}
function rmColorRow(i){cColors.splice(i,1);renColors()}
function pickColorHex(i){
  var inp=document.createElement('input');inp.type='color';inp.value=cColors[i].hex||'#999999';
  inp.addEventListener('input',function(){cColors[i].hex=inp.value;renColors()});
  inp.click();
}
function acColor(v,idx){
  var l=$('acClr'+idx);if(!l)return;
  var all=DB.g('colors');
  var filtered=v?all.filter(function(c){return c.code.toLowerCase().includes(v.toLowerCase())||c.name.toLowerCase().includes(v.toLowerCase())}):all;
  if(!filtered.length){l.classList.add('hidden');return}
  l.innerHTML=filtered.slice(0,10).map(function(c){
    var safe=c.code.replace(/'/g,"&#39;");
    return '<div class="ac-i" style="display:flex;align-items:center;gap:6px;padding:6px 8px;cursor:pointer" onclick="selColor('+idx+',\''+safe+'\',\''+c.name.replace(/'/g,"&#39;")+'\',\''+c.type+'\',\''+(c.hex||'#999')+'\')"><div style="width:16px;height:16px;border-radius:3px;background:'+(c.hex||'#ccc')+';border:1px solid #ddd"></div><span style="font-weight:600;font-size:12px">'+c.code+'</span><span style="color:var(--txt3);font-size:11px">'+c.name+' ('+c.type+')</span></div>';
  }).join('');
  l.classList.remove('hidden');
}
function selColor(idx,code,name,type,hex){
  cColors[idx]={code:code,name:name,type:type,hex:hex,recipe:'',note:''};
  renColors();
}

// 색상 마스터 관리
function openColorMaster(){
  var all=DB.g('colors');
  var h='<div style="max-height:400px;overflow-y:auto"><table class="dt"><thead><tr><th>색상</th><th>코드</th><th>이름</th><th>구분</th><th>배합비</th><th>관리</th></tr></thead><tbody>';
  if(!all.length) h+='<tr><td colspan="6" class="empty-cell">등록된 색상 없음</td></tr>';
  all.forEach(function(c){
    h+='<tr><td><div style="width:20px;height:20px;border-radius:4px;background:'+(c.hex||'#ccc')+';border:1px solid #ddd;margin:0 auto"></div></td>';
    h+='<td style="font-weight:700">'+c.code+'</td><td>'+c.name+'</td><td>'+c.type+'</td><td style="font-size:11px;color:var(--txt2)">'+(c.recipe||'-')+'</td>';
    h+='<td><button class="btn btn-sm btn-o" onclick="editColorM(\''+c.id+'\')">수정</button> <button class="btn btn-sm btn-d" onclick="delColorM(\''+c.id+'\')">삭제</button></td></tr>';
  });
  h+='</tbody></table></div>';
  $('colorMasterBody').innerHTML=h;
  oMo('colorMasterMo');
}
function openNewColorM(){
  $('cmId').value='';$('cmCode').value='';$('cmName').value='';$('cmType').value='별색';$('cmHex').value='#999999';$('cmRecipe').value='';$('cmNote').value='';
  oMo('colorEditMo');
}
function editColorM(id){
  var c=DB.g('colors').find(function(x){return x.id===id});if(!c)return;
  $('cmId').value=c.id;$('cmCode').value=c.code;$('cmName').value=c.name;$('cmType').value=c.type;$('cmHex').value=c.hex||'#999999';$('cmRecipe').value=c.recipe||'';$('cmNote').value=c.note||'';
  oMo('colorEditMo');
}
function saveColorM(){
  var code=$('cmCode').value.trim(),name=$('cmName').value.trim();
  if(!code){toast('색상코드 필요','err');return}
  if(!name){toast('색상명 필요','err');return}
  var all=DB.g('colors'),id=$('cmId').value;
  var rec={id:id||gid(),code:code,name:name,type:$('cmType').value,hex:$('cmHex').value,recipe:$('cmRecipe').value,note:$('cmNote').value,cat:nw()};
  if(id){var idx=all.findIndex(function(x){return x.id===id});if(idx>=0)all[idx]=rec;else all.push(rec)}
  else all.push(rec);
  DB.s('colors',all);cMo('colorEditMo');openColorMaster();toast('색상 저장','ok');
}
function delColorM(id){
  if(!confirm('이 색상을 삭제하시겠습니까?'))return;
  DB.s('colors',DB.g('colors').filter(function(x){return x.id!==id}));
  openColorMaster();toast('삭제','ok');
}

// 기본 색상 시드 데이터
function _seedColors(){
  var existing=DB.g('colors');
  if(existing.length)return;
  var defaults=[
    {code:'PMS 186C',name:'빨강',type:'팬톤',hex:'#CE1126'},
    {code:'PMS 021C',name:'주황',type:'팬톤',hex:'#FE5000'},
    {code:'PMS 116C',name:'노랑',type:'팬톤',hex:'#FFCD00'},
    {code:'PMS 347C',name:'초록',type:'팬톤',hex:'#009A44'},
    {code:'PMS 286C',name:'파랑',type:'팬톤',hex:'#0033A0'},
    {code:'PMS 2685C',name:'보라',type:'팬톤',hex:'#56368A'},
    {code:'PMS Black C',name:'먹',type:'팬톤',hex:'#2D2926'},
    {code:'금박',name:'금박',type:'금박',hex:'#D4AF37'},
    {code:'은박',name:'은박',type:'은박',hex:'#C0C0C0'},
    {code:'CMYK-C',name:'시안',type:'일반',hex:'#00AEEF'},
    {code:'CMYK-M',name:'마젠타',type:'일반',hex:'#EC008C'},
    {code:'CMYK-Y',name:'옐로우',type:'일반',hex:'#FFF200'},
    {code:'CMYK-K',name:'블랙',type:'일반',hex:'#000000'},
    {code:'별색1',name:'별색1',type:'별색',hex:'#8B0000'},
    {code:'별색2',name:'별색2',type:'별색',hex:'#006400'}
  ];
  defaults.forEach(function(d){d.id=gid();d.recipe='';d.note='';d.cat=nw()});
  DB.s('colors',defaults);
}
try{_seedColors()}catch(e){}
