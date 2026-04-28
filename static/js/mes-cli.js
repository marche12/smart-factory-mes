// Pagination & debounce
var _cliPage=0,_prodPage=0,_moldPage=0;
var _dCli=debounce(function(){_cliPage=0;rCli()},200);
var _dProd=debounce(function(){_prodPage=0;rProd()},200);
var _dMold=debounce(function(){_moldPage=0;rMold()},200);

// 일괄 선택/삭제 공통 도구
var _bulkSel={cli:{},prod:{},mold:{}};
var _bulkVisible={cli:[],prod:[],mold:[]};
function _bulkAttr(v){
  return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function _bulkLabel(kind){
  return kind==='cli'?'거래처':kind==='prod'?'품목':'목형';
}
function _bulkIds(kind){
  var m=_bulkSel[kind]||{};
  return Object.keys(m).filter(function(id){return !!m[id];});
}
function _bulkIsChecked(kind,id){
  return !!((_bulkSel[kind]||{})[id]);
}
function _bulkHead(kind){
  var ids=_bulkVisible[kind]||[];
  var checked=ids.length&&ids.every(function(id){return _bulkIsChecked(kind,id);});
  return '<input type="checkbox" data-bulk-head="'+kind+'" '+(checked?'checked':'')+' onchange="toggleBulkVisible(\''+kind+'\',this.checked)" onclick="event.stopPropagation()" title="현재 페이지 전체 선택">';
}
function _bulkCell(kind,id){
  return '<td class="bulk-cell" onclick="event.stopPropagation()" style="text-align:center">'+
    '<input type="checkbox" data-bulk-kind="'+kind+'" data-bulk-id="'+_bulkAttr(id)+'" '+(_bulkIsChecked(kind,id)?'checked':'')+' onchange="toggleBulkFromBox(this)" onclick="event.stopPropagation()">'+
    '</td>';
}
function _syncBulkBoxes(kind){
  var ids=_bulkVisible[kind]||[];
  var selected=ids.filter(function(id){return _bulkIsChecked(kind,id);}).length;
  document.querySelectorAll('input[data-bulk-kind="'+kind+'"]').forEach(function(box){
    box.checked=_bulkIsChecked(kind,box.dataset.bulkId);
  });
  document.querySelectorAll('input[data-bulk-head="'+kind+'"]').forEach(function(box){
    box.checked=!!(ids.length&&selected===ids.length);
    box.indeterminate=!!(selected&&selected<ids.length);
  });
}
function renderBulkBar(kind){
  var ids=_bulkIds(kind);
  /* 헤더 액션 영역의 "선택 삭제 (N)" 버튼 카운트·활성·표시 동기화
     0건이면 버튼 자체를 숨겨 위험 액션 시각 노이즈 제거. 선택 시에만 노출. */
  var btn=$(kind+'BulkDelBtn'), cnt=$(kind+'BulkCount');
  if(cnt) cnt.textContent = ids.length;
  if(btn){
    btn.disabled = !ids.length;
    btn.style.display = ids.length ? '' : 'none';
  }
  /* 인라인 BulkBar (테이블 위) */
  var el=$(kind+'BulkBar');
  if(el){
    if(!ids.length){
      el.classList.add('hidden');
      el.innerHTML='';
    } else {
      el.classList.remove('hidden');
      var actions='';
      if(kind==='cli'){
        var mergeBtn='<button class="btn btn-sm btn-p" '+(ids.length===2?'':'disabled')+' onclick="cliBulkMerge()" title="2건 선택 시 활성">선택 → 병합</button>';
        actions=
          '<button class="btn btn-sm btn-o" onclick="cliBulkSetStatus(\'dormant\')">선택 → 휴면 처리</button>'+
          '<button class="btn btn-sm btn-s" onclick="cliBulkSetStatus(\'archived\')">선택 → 보관 (잔액 0)</button>'+
          mergeBtn+
          '<button class="btn btn-sm btn-d" onclick="bulkDelete(\'cli\')" title="삭제는 보관보다 위험: 가능하면 보관을 사용하세요">선택 삭제 ⚠</button>'+
          '<button class="btn btn-sm btn-o" onclick="clearBulk(\'cli\')">선택 해제</button>';
      } else {
        actions=
          '<button class="btn btn-sm btn-d" onclick="bulkDelete(\''+kind+'\')">선택 삭제</button>'+
          '<button class="btn btn-sm btn-o" onclick="clearBulk(\''+kind+'\')">선택 해제</button>';
      }
      el.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:10px 0;padding:10px 12px;border:1px solid var(--bdr);border-radius:12px;background:var(--card);box-shadow:var(--shadow-sm)">'+
        '<div style="font-size:13px;font-weight:700;color:var(--txt)">'+_bulkLabel(kind)+' '+ids.length+'개 선택됨</div>'+
        '<div style="display:flex;gap:6px;flex-wrap:wrap">'+actions+'</div></div>';
    }
  }
  _syncBulkBoxes(kind);
}
function toggleBulkFromBox(box){
  if(!box)return;
  toggleBulk(box.dataset.bulkKind,box.dataset.bulkId,box.checked);
}
function toggleBulk(kind,id,checked){
  if(!_bulkSel[kind])_bulkSel[kind]={};
  if(checked)_bulkSel[kind][id]=true;
  else delete _bulkSel[kind][id];
  renderBulkBar(kind);
}
function toggleBulkVisible(kind,checked){
  if(!_bulkSel[kind])_bulkSel[kind]={};
  (_bulkVisible[kind]||[]).forEach(function(id){
    if(checked)_bulkSel[kind][id]=true;
    else delete _bulkSel[kind][id];
  });
  renderBulkBar(kind);
}
function _renderBulkTarget(kind){
  if(kind==='cli')rCli();
  else if(kind==='prod')rProd();
  else if(kind==='mold')rMold();
}
function clearBulk(kind,skipRender){
  _bulkSel[kind]={};
  renderBulkBar(kind);
  if(!skipRender)_renderBulkTarget(kind);
}
function _bulkIdMap(ids){
  return ids.reduce(function(m,id){m[id]=true;return m;},{});
}
function _bulkDeleteCli(ids){
  var cs=DB.g('cli')||[];
  var linked=[], deletable=[];
  ids.forEach(function(id){
    if(!cs.some(function(c){return c.id===id;}))return;
    var usage=_getCliDeleteUsage(id);
    if(usage.total)linked.push(id);
    else deletable.push(id);
  });
  if(!deletable.length&&!linked.length){toast('선택 항목을 찾을 수 없습니다','err');return}
  if(deletable.length){
    var msg='선택한 거래처 '+ids.length+'개 중 삭제 가능 '+deletable.length+'개, 연결되어 삭제 불가 '+linked.length+'개입니다.\n\n삭제 가능한 거래처를 삭제할까요?';
    if(!confirm(msg))return;
    var delMap=_bulkIdMap(deletable);
    DB.s('cli',cs.filter(function(c){return !delMap[c.id];}));
  }
  var dormant=0;
  if(linked.length){
    var ask='연결된 거래처 '+linked.length+'개는 삭제할 수 없습니다.\n대신 휴면 거래처로 전환할까요?';
    if(confirm(ask)){
      var linkMap=_bulkIdMap(linked);
      var latest=DB.g('cli')||[];
      latest.forEach(function(c){
        if(linkMap[c.id]&&!c.isDormant){
          c.isDormant=true;
          c.dormantAt=td();
          dormant++;
        }
      });
      DB.s('cli',latest);
    }
  }
  clearBulk('cli',true);
  rCli();
  toast('거래처 정리 완료: 삭제 '+deletable.length+'건'+(linked.length?' / 연결 '+linked.length+'건':'')+(dormant?' / 휴면 '+dormant+'건':''),'ok');
}
function _bulkDeleteLinked(kind,ids,usageFn,key,renderFn){
  var rows=DB.g(key)||[];
  var linked=[], deletable=[];
  ids.forEach(function(id){
    if(!rows.some(function(r){return r.id===id;}))return;
    var usage=usageFn(id);
    if(usage.total)linked.push({id:id,text:usage.text});
    else deletable.push(id);
  });
  if(!deletable.length&&!linked.length){toast('선택 항목을 찾을 수 없습니다','err');return}
  var msg='선택한 '+_bulkLabel(kind)+' '+ids.length+'개 중 삭제 가능 '+deletable.length+'개, 연결되어 삭제 불가 '+linked.length+'개입니다.';
  if(linked.length)msg+='\n\n연결된 항목은 삭제하지 않고 유지합니다.';
  if(deletable.length&&!confirm(msg+'\n\n삭제 가능한 항목을 삭제할까요?'))return;
  if(deletable.length){
    var delMap=_bulkIdMap(deletable);
    DB.s(key,rows.filter(function(r){return !delMap[r.id];}));
  }else if(linked.length){
    alert(msg);
  }
  clearBulk(kind,true);
  renderFn();
  toast(_bulkLabel(kind)+' 정리 완료: 삭제 '+deletable.length+'건'+(linked.length?' / 차단 '+linked.length+'건':''),'ok');
}
function bulkDelete(kind){
  var ids=_bulkIds(kind);
  if(!ids.length){toast('선택된 항목이 없습니다','err');return}
  if(kind==='cli')return _bulkDeleteCli(ids);
  if(kind==='prod')return _bulkDeleteLinked('prod',ids,_getProdDeleteUsage,'prod',rProd);
  if(kind==='mold')return _bulkDeleteLinked('mold',ids,_getMoldDeleteUsage,'mold',rMold);
}

// CLIENT
var _cliView='table';
/* ============================================================
   거래처 정리 — 상태(active/dormant/archived/dup) 필터 + 일괄 액션
   - status 는 migrate/05_classify_cli.py 가 채워주는 값을 우선 신뢰
   - 값이 없으면 isDormant 기준으로 active/dormant 추론
   - dup(중복의심) 은 화면에서 사업자번호·정규화이름 기준 즉시 계산
   ============================================================ */
var _cliStatusFilter='default'; /* default = active+dormant 만 노출 */
function _cliComputedStatus(c){
  if(!c) return 'active';
  if(c.status==='merged') return 'merged';
  if(c.status==='archived') return 'archived';
  if(c.status==='archive_candidate') return 'archive_candidate';
  if(c.status==='dormant' || c.isDormant) return 'dormant';
  if(c.status==='active') return 'active';
  return c.isDormant?'dormant':'active';
}
function _cliStatusBadge2(c){
  var s=_cliComputedStatus(c);
  if(s==='merged') return '<span class="bd bd-w" title="병합됨">병합</span>';
  if(s==='archived') return '<span class="bd bd-w" title="보관됨">보관</span>';
  if(s==='archive_candidate') return '<span class="bd bd-w" title="보관 후보">보관후보</span>';
  if(s==='dormant') return '<span class="bd bd-w">휴면</span>';
  return '<span class="bd bd-s">사용중</span>';
}
function _cliNormForDup(nm){
  var s=String(nm||'');
  ['주식회사','(주)','㈜','유한회사','(유)','합자회사','합명회사'].forEach(function(t){s=s.split(t).join('');});
  return s.replace(/[\s\(\)\[\]\.\-_\/·~・]/g,'').toLowerCase();
}
function _cliNormBiz(b){return String(b||'').replace(/\D/g,'');}
var _cliDupCache={at:0, set:null};
function cliComputeDupSet(){
  if(_cliDupCache.set && (Date.now()-_cliDupCache.at)<3000) return _cliDupCache.set;
  var cs=DB.g('cli')||[];
  var byBiz={}, byNm={};
  cs.forEach(function(c){
    if(_cliComputedStatus(c)==='merged') return;
    var b=_cliNormBiz(c.biz||c.bizNo);
    if(b && b.length>=9){(byBiz[b]=byBiz[b]||[]).push(c.id);}
    var n=_cliNormForDup(c.nm);
    if(n){(byNm[n]=byNm[n]||[]).push(c.id);}
  });
  var out={};
  Object.keys(byBiz).forEach(function(k){if(byBiz[k].length>1)byBiz[k].forEach(function(id){out[id]=true;});});
  Object.keys(byNm).forEach(function(k){if(byNm[k].length>1)byNm[k].forEach(function(id){out[id]=true;});});
  _cliDupCache={at:Date.now(), set:out};
  return out;
}
function setCliStatusFilter(v,btn){
  _cliStatusFilter=v;
  _cliPage=0;
  if(btn){
    var bar=btn.parentElement;
    if(bar) bar.querySelectorAll('button[data-cli-status]').forEach(function(b){b.classList.remove('on');});
    btn.classList.add('on');
  }
  rCli();
}
function _cliRenderStatusBar(counts){
  var el=$('cliStatusBar');if(!el)return;
  var defs=[
    {v:'default',  label:'활성+휴면', cnt:counts.active+counts.dormant},
    {v:'all',      label:'전체',      cnt:counts.total},
    {v:'active',   label:'활성',      cnt:counts.active},
    {v:'dormant',  label:'휴면',      cnt:counts.dormant},
    {v:'archive',  label:'보관',      cnt:counts.archive},
    {v:'dup',      label:'중복의심',  cnt:counts.dup}
  ];
  el.innerHTML=defs.map(function(d){
    var on=(_cliStatusFilter===d.v)?'on':'';
    return '<button class="btn btn-sm btn-o '+on+'" data-cli-status="'+d.v+'" onclick="setCliStatusFilter(\''+d.v+'\',this)">'+
      d.label+' <span style="opacity:.7">'+d.cnt+'</span></button>';
  }).join('');
}
function _cliApplyStatusFilter(cs, dupSet){
  var f=_cliStatusFilter||'default';
  if(f==='all') return cs.filter(function(c){return _cliComputedStatus(c)!=='merged';});
  if(f==='active') return cs.filter(function(c){return _cliComputedStatus(c)==='active';});
  if(f==='dormant') return cs.filter(function(c){return _cliComputedStatus(c)==='dormant';});
  if(f==='archive') return cs.filter(function(c){var s=_cliComputedStatus(c);return s==='archived'||s==='archive_candidate';});
  if(f==='dup') return cs.filter(function(c){return dupSet[c.id];});
  /* default: 활성+휴면. 보관/병합/보관후보 제외 */
  return cs.filter(function(c){var s=_cliComputedStatus(c);return s==='active'||s==='dormant';});
}
function _cliBalanceZero(c){
  var r=+c.receivable||0, p=+c.payable||0;
  return r===0 && p===0;
}
function cliBulkSetStatus(targetStatus){
  var ids=_bulkIds('cli');
  if(!ids.length){toast('선택된 거래처가 없습니다','err');return}
  var cs=DB.g('cli')||[];
  var idMap=ids.reduce(function(m,id){m[id]=true;return m;},{});
  var changed=0, blockedBalance=0;
  var label = targetStatus==='dormant' ? '휴면' : targetStatus==='archived' ? '보관' : targetStatus;
  var msg='선택한 거래처 '+ids.length+'건을 "'+label+'" 상태로 전환합니다.';
  if(targetStatus==='archived') msg+='\n잔액(미수/미지급)이 있는 거래처는 안전을 위해 제외됩니다.';
  if(!confirm(msg+'\n\n계속할까요?')) return;
  cs.forEach(function(c){
    if(!idMap[c.id]) return;
    if(targetStatus==='archived' && !_cliBalanceZero(c)){blockedBalance++;return;}
    c.status=targetStatus;
    if(targetStatus==='dormant'){c.isDormant=true; c.dormantAt=c.dormantAt||td();}
    if(targetStatus==='archived'){c.isDormant=true; c.archivedAt=nw();}
    c.statusAt=nw();
    changed++;
  });
  DB.s('cli',cs);
  clearBulk('cli',true);
  rCli();
  var t='상태 변경: '+changed+'건';
  if(blockedBalance) t+=' / 잔액 보유로 제외 '+blockedBalance+'건';
  toast(t,'ok');
}
function _cliMergeRefs(losersNm, targetNm){
  /* sales/purchase/wo/orders/quotes/shipLog/income/po/priceHistory 의 거래처명 갱신 */
  var keysFields={
    sales:['cli','cnm','customerNm','client'],
    purchase:['cli','cnm','vendor','customerNm'],
    wo:['cli','cnm','customerNm'],
    orders:['cli','cnm','customerNm'],
    quotes:['cli','cnm','customerNm'],
    shipLog:['cnm','cli','customerNm'],
    income:['cli','cnm','vendor'],
    po:['vendor','cli','cnm'],
    priceHistory:['cliNm','customerNm','cli']
  };
  var summary={};
  var loserSet={}; losersNm.forEach(function(n){loserSet[String(n||'').trim()]=true;});
  Object.keys(keysFields).forEach(function(k){
    var rows=DB.g(k);
    if(!Array.isArray(rows) || !rows.length){summary[k]=0;return;}
    var touched=0;
    rows.forEach(function(r){
      for(var i=0;i<keysFields[k].length;i++){
        var f=keysFields[k][i];
        var v=r[f];
        if(v && loserSet[String(v).trim()]){
          if(v!==targetNm){r[f]=targetNm; touched++;}
          break;
        }
      }
    });
    if(touched){DB.s(k,rows);}
    summary[k]=touched;
  });
  return summary;
}
function cliBulkMerge(){
  var ids=_bulkIds('cli');
  if(ids.length!==2){toast('정확히 2건을 선택해야 병합할 수 있습니다','err');return}
  var cs=DB.g('cli')||[];
  var a=cs.find(function(x){return x.id===ids[0];});
  var b=cs.find(function(x){return x.id===ids[1];});
  if(!a||!b){toast('선택 거래처를 찾을 수 없습니다','err');return}
  /* 기본 보존측 추천: 사업자번호 보유 → 거래이력 더 많은 쪽 → 더 오래된 cat */
  function refCount(nm){
    var n=0;
    ['sales','purchase','wo','orders','quotes','shipLog','income','po'].forEach(function(k){
      (DB.g(k)||[]).forEach(function(r){
        if((r.cli||r.cnm||r.customerNm||r.vendor||r.client)===nm) n++;
      });
    });
    return n;
  }
  function score(c){
    var s=0;
    if(_cliNormBiz(c.biz||c.bizNo)) s+=100;
    s+=refCount(c.nm)*10;
    return s;
  }
  var preferA = score(a) >= score(b);
  var target = preferA ? a : b;
  var loser  = preferA ? b : a;
  /* 모달 대신 confirm 두 단계: 미리보기 + 최종 확인 */
  var preview='병합 미리보기\n'
    +'──────────────────\n'
    +'보존측 (target):\n'
    +'  '+target.nm+'  ['+(_cliNormBiz(target.biz||target.bizNo)||'사업자번호 없음')+']  참조 '+refCount(target.nm)+'건\n'
    +'흡수측 (loser):\n'
    +'  '+loser.nm+'  ['+(_cliNormBiz(loser.biz||loser.bizNo)||'사업자번호 없음')+']  참조 '+refCount(loser.nm)+'건\n'
    +'──────────────────\n'
    +'동작:\n'
    +'  1) loser 의 빈 필드 → target 으로 보충 (기존값 유지)\n'
    +'  2) sales/purchase/wo/orders/quotes/shipLog/income/po/priceHistory 의\n'
    +'     "'+loser.nm+'" 참조를 "'+target.nm+'" 로 일괄 치환\n'
    +'  3) loser 는 status="merged" 로 마킹 (삭제하지 않음)\n\n'
    +'보존측을 바꾸려면 [취소] 후 다시 시도하세요. 진행할까요?';
  if(!confirm(preview)) return;
  if(!confirm('병합은 비가역적입니다. 정말 진행할까요?')) return;
  /* 빈 필드 보충 */
  Object.keys(loser).forEach(function(k){
    if(['id','nm','cat','status','mergedTo','_src','isDormant','isFavorite'].indexOf(k)>=0) return;
    var v=loser[k];
    if(v==null||v==='') return;
    if(!target[k]) target[k]=v;
  });
  ['receivable','payable'].forEach(function(k){
    var tv=+target[k]||0, lv=+loser[k]||0;
    if(tv||lv) target[k]=tv+lv;
  });
  loser.status='merged';
  loser.mergedTo=target.id;
  loser.mergedAt=nw();
  DB.s('cli',cs);
  var sum=_cliMergeRefs([loser.nm], target.nm);
  _cliDupCache={at:0,set:null};
  clearBulk('cli',true);
  rCli();
  var refTxt=Object.keys(sum).filter(function(k){return sum[k];}).map(function(k){return k+' '+sum[k];}).join(', ');
  toast('병합 완료: target='+target.nm+(refTxt?' / 참조갱신 '+refTxt:''),'ok');
}
function setCliView(v,btn){_cliView=v;_cliPage=0;if(btn){btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}var t=$('cliTableView'),g=$('cliGalleryView');if(t)t.style.display=v==='table'?'':'none';if(g)g.style.display=v==='gallery'?'':'none';rCli()}
function _cliDormant(c){return !!(c&&c.isDormant)}
function _cliFavorite(c){return !!(c&&c.isFavorite)}
function _cliNormName(v){return String(v||'').trim();}
function _cliSameName(a,b){return _cliNormName(a)===_cliNormName(b)}
function _cliParseTypeText(raw){
  var s=String(raw||'').toLowerCase().replace(/\s+/g,'');
  if(!s)return '';
  var hasSales=s.indexOf('매출')>=0||s.indexOf('판매')>=0||s.indexOf('수금')>=0||s.indexOf('받을')>=0||s.indexOf('customer')>=0||s.indexOf('sales')>=0;
  var hasPurchase=s.indexOf('매입')>=0||s.indexOf('구매')>=0||s.indexOf('외주')>=0||s.indexOf('협력')>=0||s.indexOf('공급')>=0||s.indexOf('지급')>=0||s.indexOf('줄돈')>=0||s.indexOf('vendor')>=0||s.indexOf('purchase')>=0;
  if(s.indexOf('both')>=0||s.indexOf('양쪽')>=0||s.indexOf('겸')>=0||s.indexOf('공통')>=0||s.indexOf('매출매입')>=0||s.indexOf('매입매출')>=0||(hasSales&&hasPurchase))return 'both';
  if(hasPurchase)return 'purchase';
  if(hasSales)return 'sales';
  return '';
}
function _cliNameSet(rows){
  var m={};
  (rows||[]).forEach(function(r){
    var nm=_cliNormName(r&&((r.cli||r.cnm||r.nm||r.client||r.vendor||r.vd||r.cusNm||r.customerNm)));
    if(nm)m[nm]=true;
  });
  return m;
}
function _inferCliType(c,sets){
  if(!c)return {type:'sales',reason:'기본값'};
  var textType=_cliParseTypeText([c.cTypeRaw,c.customerType,c.type,c.kind,c.gubun,c.folderNm,c.nt,c.note,c.memo].filter(Boolean).join(' '));
  var nm=_cliNormName(c.nm);
  var salesHit=!!(sets.sales[nm]||sets.ship[nm]||sets.order[nm]||sets.quote[nm]||sets.wo[nm]||sets.prod[nm]||(+c.receivable>0));
  var purchaseHit=!!(sets.purchase[nm]||sets.income[nm]||sets.po[nm]||sets.vendor[nm]||(+c.payable>0));
  if(textType==='both')return {type:'both',reason:'유형문구'};
  if(textType==='purchase')purchaseHit=true;
  if(textType==='sales')salesHit=true;
  if(c.isVendor)purchaseHit=true;
  if(purchaseHit&&salesHit)return {type:'both',reason:'매입+매출 이력'};
  if(purchaseHit)return {type:'purchase',reason:textType==='purchase'?'유형문구':'매입/외주 이력'};
  if(salesHit)return {type:'sales',reason:textType==='sales'?'유형문구':'매출/작업 이력'};
  var current=c.cType||'sales';
  if(current==='purchase'||current==='both')return {type:current,reason:'기존구분'};
  return {type:'sales',reason:'기본값'};
}
function buildCliTypeSets(){
  return {
    sales:_cliNameSet(DB.g('sales')),
    purchase:_cliNameSet(DB.g('purchase')),
    ship:_cliNameSet(DB.g('shipLog')),
    income:_cliNameSet(DB.g('income')),
    po:_cliNameSet(DB.g('po')),
    vendor:_cliNameSet(DB.g('vendors')),
    prod:_cliNameSet(DB.g('prod')),
    order:_cliNameSet(typeof getOrders==='function'?getOrders():DB.g('orders')),
    quote:_cliNameSet(DB.g('quotes')),
    wo:_cliNameSet(DB.g('wo'))
  };
}
function reclassifyCliTypes(){
  var cs=DB.g('cli')||[];
  if(!cs.length){toast('거래처 데이터가 없습니다','err');return}
  if(!confirm('거래처를 매출처/매입처/겸용으로 자동 분류합니다.\n기준: 얼마에요 유형 문구, 매출/매입 장부, 작업/출고/입고/발주/외주 이력, 미수/미지급 잔액\n\n계속할까요?'))return;
  var sets=buildCliTypeSets();
  var changed=0, sales=0, purchase=0, both=0;
  cs.forEach(function(c){
    var old=c.cType||'sales';
    var inf=_inferCliType(c,sets);
    c.cType=inf.type;
    c.cTypeAutoReason=inf.reason;
    c.cTypeAutoAt=nw();
    if(c.cType==='purchase'||c.cType==='both'){
      var t=_cliParseTypeText([c.cTypeRaw,c.customerType,c.type,c.kind,c.gubun,c.nt,c.note].filter(Boolean).join(' '));
      if(t==='purchase'||t==='both'||c.cTypeAutoReason.indexOf('외주')>=0)c.isVendor=!!c.isVendor;
    }
    if(old!==c.cType)changed++;
    if(c.cType==='both')both++;
    else if(c.cType==='purchase')purchase++;
    else sales++;
  });
  DB.s('cli',cs);
  _cliPage=0;
  rCli();
  toast('자동분류 완료: 변경 '+changed+'건 / 매출 '+sales+' · 매입 '+purchase+' · 겸용 '+both,'ok');
}
var _cliTypeAutoChecked=false;
function autoReclassifyCliTypesIfNeeded(){
  if(_cliTypeAutoChecked)return;
  _cliTypeAutoChecked=true;
  var cs=DB.g('cli')||[];
  if(!cs.length)return;
  var sets=buildCliTypeSets();
  var changed=0;
  cs.forEach(function(c){
    var old=c.cType||'sales';
    var inf=_inferCliType(c,sets);
    if(inf.reason==='기본값'||inf.reason==='기존구분')return;
    if(old!==inf.type){
      c.cType=inf.type;
      c.cTypeAutoReason=inf.reason;
      c.cTypeAutoAt=nw();
      changed++;
    }
  });
  if(changed){
    DB.s('cli',cs);
    if(typeof toast==='function')toast('거래처 매입/매출 자동 보정 '+changed+'건','ok');
  }
}
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
function cliStatusBadge(c){return _cliDormant(c)?'<span class="bd bd-w">휴면</span>':'<span class="bd bd-s">사용중</span>'}
function _cliLastTrade(c){
  var nm=c.nm||'';
  var dates=[];
  (DB.g('sales')||[]).forEach(function(r){if((r.cli||r.cnm)===nm&&r.dt)dates.push(r.dt);});
  (DB.g('purchase')||[]).forEach(function(r){if((r.cli||r.cnm)===nm&&r.dt)dates.push(r.dt);});
  (DB.g('shipLog')||[]).forEach(function(r){if((r.cnm||r.cli)===nm&&r.dt)dates.push(r.dt);});
  ((typeof getOrders==='function'?getOrders():DB.g('orders')||[])).forEach(function(o){if(o.cli===nm&&o.dt)dates.push(o.dt);});
  if(!dates.length)return {dt:'-',prod:''};
  dates.sort();
  var last=dates[dates.length-1];
  // 최근 품목
  var recentProd='';
  var ord=((typeof getOrders==='function'?getOrders():DB.g('orders')||[])).filter(function(o){return o.cli===nm;}).sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');})[0];
  if(ord){
    if(ord.items&&ord.items[0])recentProd=ord.items[0].nm||'';
    else if(ord.pnm)recentProd=ord.pnm;
  }
  if(!recentProd){
    var s=(DB.g('sales')||[]).filter(function(r){return (r.cli||r.cnm)===nm;}).sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');})[0];
    if(s)recentProd=s.prod||s.pnm||'';
  }
  return {dt:last, prod:recentProd};
}
function rCli(page){
  if(typeof page==='number')_cliPage=page;
  autoReclassifyCliTypesIfNeeded();
  refreshFolderSelects();
  const s=($('cliSch')?.value||'').toLowerCase();
  var tf=$('cliTypeFilter')?$('cliTypeFilter').value:'';
  var ff=$('cliFolderFilter')?$('cliFolderFilter').value:'';
  var df=$('cliDormantFilter')?$('cliDormantFilter').value:'active';
  var cs;
  // 초성 검색 + 다중 필드 (bizNo/biz/handphone 모두 지원)
  var matchFn = function(c){
    if(!s) return true;
    var biz = (c.bizNo||c.biz||'');
    var hp  = (c.telHandphone||c.handphone||'');
    if(typeof SearchUtil !== 'undefined'){
      return SearchUtil.match(c.nm, s)
        || SearchUtil.match(biz, s)
        || SearchUtil.match(c.tel||'', s)
        || SearchUtil.match(hp, s)
        || SearchUtil.match(c.ceo||'', s);
    }
    var lo = s;
    return (c.nm||'').toLowerCase().includes(lo)
      || biz.includes(lo)
      || (c.tel||'').includes(lo)
      || hp.includes(lo)
      || (c.ceo||'').toLowerCase().includes(lo);
  };
  if(tf==='vendor'){
    /* 협력사(인쇄소): isVendor 표식 또는 cType=purchase/both — 검색어 있을 땐 cType 무시 */
    cs=DB.g('cli').filter(function(c){
      if(!matchFn(c)) return false;
      if(s) return true;
      return c.isVendor || c.cType==='purchase' || c.cType==='both';
    });
  }else{
    cs=DB.g('cli').filter(matchFn);
    /* 검색어가 있으면 cType 필터 무시 — 매입처/매출처/협력사 전부 검색 */
    if(!s){
      // "매출처" = sales + both (매출 성격 있는 전체)
      // "매입처" = purchase + both
      // "매출+매입" = both 만 (교차 거래처)
      if(tf==='sales')cs=cs.filter(c=>c.cType==='sales'||c.cType==='both'||!c.cType);
      else if(tf==='purchase')cs=cs.filter(c=>c.cType==='purchase'||c.cType==='both');
      else if(tf==='both')cs=cs.filter(c=>c.cType==='both');
    }
  }
  if(df==='active')cs=cs.filter(function(c){return !_cliDormant(c)});
  else if(df==='dormant')cs=cs.filter(function(c){return _cliDormant(c)});
  // 폴더 필터
  if(ff === '__none__') cs = cs.filter(function(c){return !c.folderId});
  else if(ff) cs = cs.filter(function(c){return c.folderId === ff});
  // 상태 필터 (active/dormant/archive/dup) + 상단 필터바 렌더
  var dupSet=cliComputeDupSet();
  var allCli=DB.g('cli')||[];
  var counts={total:0,active:0,dormant:0,archive:0,dup:0};
  allCli.forEach(function(c){
    var s=_cliComputedStatus(c);
    if(s==='merged') return;
    counts.total++;
    if(s==='active') counts.active++;
    else if(s==='dormant') counts.dormant++;
    else if(s==='archived'||s==='archive_candidate') counts.archive++;
    if(dupSet[c.id]) counts.dup++;
  });
  _cliRenderStatusBar(counts);
  cs=_cliApplyStatusFilter(cs, dupSet);
  cs=cs.slice().sort(_cliSort);
  // KPI
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
  _bulkVisible.cli=vis.map(function(c){return c.id;});
  if(_cliView==='table'){
    $('cliTbl').querySelector('thead').innerHTML='<tr><th style="width:36px;text-align:center">'+_bulkHead('cli')+'</th><th style="min-width:160px">거래처명</th><th style="width:90px">거래구분</th><th style="width:110px">담당자</th><th style="width:130px">연락처</th><th style="width:100px">최근거래</th><th style="width:80px">상태</th><th style="width:90px">관리</th></tr>';
    if(tf==='vendor'){
      $('cliTbl').querySelector('tbody').innerHTML=vis.length?vis.map(function(c){
        var favBadge=_cliFavorite(c)?'<span class="bd bd-p">★</span> ':'';
        var last=_cliLastTrade(c);
        var recentCell=last.dt==='-'?'<span style="color:var(--txt3)">거래 없음</span>':('<b>'+last.dt+'</b>');
        return `<tr class="${_cliDormant(c)?'cli-row-dormant':''}" onclick="openCliLedgerPanel('${c.id}')" oncontextmenu="return openCliContextMenu(event,'${c.id}')">${_bulkCell('cli',c.id)}<td style="font-weight:700">${favBadge}${c.nm||'-'}</td><td><span class="bd bd-e">인쇄소</span></td><td>${c.ps||c.ceo||'-'}</td><td>${c.tel||'-'}</td><td>${recentCell}</td><td>${_cliStatusBadge2(c)}${dupSet[c.id]?' <span class="bd bd-w" title="중복 의심">중복</span>':''}</td><td><button class="btn btn-sm btn-o" onclick="event.stopPropagation();eCli('${c.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="event.stopPropagation();dCli('${c.id}')">삭제</button></td></tr>`;
      }).join(''):'<tr><td colspan="8" class="empty-cell">인쇄소 없음</td></tr>';
    }else{
      $('cliTbl').querySelector('tbody').innerHTML=vis.length?vis.map(function(c){
        var favBadge=_cliFavorite(c)?'<span class="bd bd-p">★</span> ':'';
        var last=_cliLastTrade(c);
        var recentCell=last.dt==='-'?'<span style="color:var(--txt3)">거래 없음</span>':('<b>'+last.dt+'</b>'+(last.prod?'<div style="font-size:11px;color:var(--txt2);margin-top:2px">'+last.prod+'</div>':''));
        var contact=(c.tel||'')+(c.ps?'<div style="font-size:11px;color:var(--txt2);margin-top:2px">'+c.ps+'</div>':'');
        return `<tr class="${_cliDormant(c)?'cli-row-dormant':''}" onclick="openCliLedgerPanel('${c.id}')" oncontextmenu="return openCliContextMenu(event,'${c.id}')">${_bulkCell('cli',c.id)}<td style="font-weight:700">${favBadge}${c.nm}</td><td>${cTypeBadge(c)}</td><td>${c.ps||c.ceo||'-'}</td><td>${contact||'-'}</td><td>${recentCell}</td><td>${_cliStatusBadge2(c)}${dupSet[c.id]?' <span class="bd bd-w" title="중복 의심">중복</span>':''}</td><td><button class="btn btn-sm btn-o" onclick="event.stopPropagation();eCli('${c.id}')">수정</button> <button class="btn btn-sm btn-o" onclick="event.stopPropagation();showCliHist('${c.id}')">이력</button> <button class="btn btn-sm btn-s" onclick="event.stopPropagation();openProdMWithCli('${c.id}')">품목</button> <button class="btn btn-sm btn-d" onclick="event.stopPropagation();dCli('${c.id}')">삭제</button></td></tr>`;
      }).join(''):'<tr><td colspan="8" class="empty-cell">거래처 없음</td></tr>';
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
  renderBulkBar('cli');
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
  $('cmId').value=c.id;$('cmNm').value=c.nm;$('cmBiz').value=c.bizNo||c.biz||'';$('cmCeo').value=c.ceo||'';
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
function _summarizeLinkedRecords(map){
  return Object.keys(map).filter(function(k){return map[k]>0;}).map(function(k){return k+' '+map[k]+'건';}).join(', ');
}
function _getCliDeleteUsage(id){
  var c=(DB.g('cli')||[]).find(function(x){return x.id===id;});
  if(!c)return {total:0, counts:{}, text:''};
  var cliNm=c.nm||'';
  var cliId=c.id||id;
  var counts={
    수주:(typeof getOrders==='function'?getOrders():DB.g('orders')||[]).filter(function(o){
      return o && (o.cid===cliId || o.cliId===cliId || (o.cli||'')===cliNm || (o.cnm||'')===cliNm);
    }).length,
    작업지시:(DB.g('wo')||[]).filter(function(w){
      return w && (w.cid===cliId || w.cliId===cliId || (w.cnm||'')===cliNm);
    }).length,
    견적:(DB.g('quotes')||[]).filter(function(q){
      return q && (q.cid===cliId || q.cliId===cliId || (q.cli||q.cnm||'')===cliNm);
    }).length,
    출고:(DB.g('shipLog')||[]).filter(function(r){
      return r && (r.cid===cliId || r.cliId===cliId || (r.cli||r.cnm||'')===cliNm);
    }).length,
    매출:(DB.g('sales')||[]).filter(function(r){
      return r && (r.cid===cliId || r.cliId===cliId || (r.cli||r.cnm||'')===cliNm);
    }).length,
    매입:(DB.g('purchase')||[]).filter(function(r){
      return r && (r.cid===cliId || r.cliId===cliId || (r.cli||r.cnm||'')===cliNm);
    }).length,
    BOM:(DB.g('bom')||[]).filter(function(r){
      return r && (r.cid===cliId || r.cliId===cliId || (r.cli||r.cnm||'')===cliNm);
    }).length
  };
  var total=Object.keys(counts).reduce(function(sum,key){return sum+(counts[key]||0);},0);
  return {total:total, counts:counts, text:_summarizeLinkedRecords(counts)};
}
function dCli(id){
  var cs=DB.g('cli')||[];
  var idx=cs.findIndex(function(x){return x.id===id;});
  if(idx<0)return;
  var usage=_getCliDeleteUsage(id);
  if(usage.total){
    var msg='이 거래처는 연결된 데이터가 있어 바로 삭제할 수 없습니다.\n\n'
      +usage.text
      +'\n\n';
    if(!cs[idx].isDormant){
      if(confirm(msg+'하드 삭제 대신 휴면 거래처로 전환할까요?')){
        cs[idx].isDormant=true;
        cs[idx].dormantAt=td();
        DB.s('cli',cs);
        rCli();
        toast('휴면 거래처로 이동','ok');
      }
    }else{
      alert(msg+'휴면 상태로 유지한 뒤 거래 원장에서 이력을 확인하세요.');
    }
    return;
  }
  if(!confirm('연결된 거래 데이터가 없습니다.\n정말 삭제할까요?'))return;
  DB.s('cli',cs.filter(function(x){return x.id!==id;}));
  rCli();
  toast('삭제','ok');
}
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
  var isDormant=_cliDormant(c);
  var html=''
    +'<button onclick="openCliLedgerPanel(\''+id+'\');closeCliContextMenu()">상세 확인</button>'
    +'<button onclick="eCli(\''+id+'\');closeCliContextMenu()">수정</button>'
    +'<button onclick="toggleCliFavorite(\''+id+'\');closeCliContextMenu()">'+(_cliFavorite(c)?'즐겨찾기 해제':'즐겨찾기')+'</button>'
    +'<button onclick="openCliLedgerPanel(\''+id+'\');closeCliContextMenu()">거래원장 보기</button>';
  if(!isDormant){
    html+=''
      +'<button onclick="openCliLedgerPanel(\''+id+'\',\'today\');closeCliContextMenu()">오늘 거래 보기</button>'
      +'<button onclick="openCliLedgerPanel(\''+id+'\',\'7d\');closeCliContextMenu()">7일 거래 보기</button>'
      +'<button onclick="openCliLedgerPanel(\''+id+'\',\'30d\');closeCliContextMenu()">30일 거래 보기</button>'
      +'<button onclick="openCliMemoPrompt(\''+id+'\');closeCliContextMenu()">메모</button>'
      +'<button onclick="toggleCliDormant(\''+id+'\');closeCliContextMenu()">휴면 처리</button>';
  }else{
    html+=''
      +'<button onclick="openCliLedgerPanel(\''+id+'\',\'all\');closeCliContextMenu()">전체 거래 보기</button>'
      +'<button onclick="openCliMemoPrompt(\''+id+'\');closeCliContextMenu()">메모</button>'
      +'<button onclick="toggleCliDormant(\''+id+'\');closeCliContextMenu()">복원 (사용중으로)</button>';
  }
  html+='<button class="danger" onclick="dCli(\''+id+'\');closeCliContextMenu()">삭제</button>';
  box.innerHTML=html;
  box.style.left=Math.min(e.clientX,window.innerWidth-190)+'px';
  box.style.top=Math.min(e.clientY,window.innerHeight-260)+'px';
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
  toast(next?'휴면 거래처로 이동':'사용중으로 복원','ok');
}
function openCliMemoPrompt(id){
  var cs=DB.g('cli')||[];
  var idx=cs.findIndex(function(c){return c.id===id});
  if(idx<0)return;
  var cur=cs[idx].nt||'';
  var v=prompt('['+cs[idx].nm+'] 메모', cur);
  if(v===null)return;
  cs[idx].nt=v;
  DB.s('cli',cs);
  toast('메모 저장','ok');
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
    +'<div class="ux-sp-field"><div class="ux-sp-field-l">사업자번호</div><div class="ux-sp-field-v">'+(c.bizNo||c.biz||'-')+'</div></div>'
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
    +(window.PriceHistory?(function(){
        var ph=PriceHistory.getByCli(c.nm, 6);
        if(!ph.length) return '';
        return '<div class="ux-sp-section"><div class="ux-sp-section-t">단가 적용 이력 ('+ph.length+'건)</div>'
          +'<table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr style="background:#F8FAFC"><th style="padding:6px 8px;text-align:left">일자</th><th style="padding:6px 8px;text-align:left">품목</th><th style="padding:6px 8px;text-align:right">단가</th><th style="padding:6px 8px;text-align:left">출처</th><th style="padding:6px 8px;text-align:left">문서</th></tr></thead><tbody>'
          +ph.map(function(h){return '<tr><td style="padding:6px 8px;border-top:1px solid #F1F5F9">'+(h.dt||'-')+'</td><td style="padding:6px 8px;border-top:1px solid #F1F5F9">'+(h.prodNm||'-')+'</td><td style="padding:6px 8px;border-top:1px solid #F1F5F9;text-align:right;font-weight:700">'+(h.unitPrice||0).toLocaleString()+'원</td><td style="padding:6px 8px;border-top:1px solid #F1F5F9"><span class="bd bd-w">'+PriceHistory.sourceLabel(h.source)+'</span></td><td style="padding:6px 8px;border-top:1px solid #F1F5F9;color:#64748B">'+(h.refType||'-')+(h.note?' · '+h.note:'')+'</td></tr>';}).join('')
          +'</tbody></table></div>';
      })():'')
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
var _tradeDigestState={mode:(typeof SearchUtil!=='undefined'?SearchUtil.getPref('trade-digest','mode','today'):'today'),cliId:''};
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
  _tradeDigestState={mode:(typeof SearchUtil!=='undefined'?SearchUtil.getPref('trade-digest','mode',_tradeDigestState.mode||'today'):(_tradeDigestState.mode||'today')),cliId:cliId||''};
  _renderTradeDigestPanel();
}
function setTradeDigestMode(mode){
  _tradeDigestState.mode=mode;
  if(typeof SearchUtil!=='undefined'&&SearchUtil.savePref)SearchUtil.savePref('trade-digest','mode',mode);
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
var _prodDetailView=(typeof SearchUtil!=='undefined'?SearchUtil.getPref('prod-list','detailView','summary'):'summary');
function setProdView(v,btn){_prodView=v;_prodPage=0;if(btn){btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}var t=$('prodTableView'),g=$('prodGalleryView');if(t)t.style.display=v==='table'?'':'none';if(g)g.style.display=v==='gallery'?'':'none';rProd()}
function setProdDetailView(v,btn){
  _prodDetailView=v||'summary';
  if(typeof SearchUtil!=='undefined')SearchUtil.savePref('prod-list','detailView',_prodDetailView);
  var root=$('prodDetailPills');
  if(root)root.querySelectorAll('button').forEach(function(b){
    b.classList.toggle('on',b.dataset.mode===_prodDetailView);
  });
  rProd();
}
function _prodFavorite(p){return !!(p&&p.isFavorite)}
function _prodSort(a,b){
  if(_prodFavorite(a)!==_prodFavorite(b))return _prodFavorite(a)?-1:1;
  return (a.nm||'').localeCompare(b.nm||'','ko');
}
function _prodUsageStats(p){
  var nm=p&&p.nm||'';
  var wos=(DB.g('wo')||[]).filter(function(w){return w.pnm===nm;});
  var orders=(getOrders?getOrders():DB.g('orders')||[]).filter(function(o){
    return (o.items||[]).some(function(it){return it&&it.nm===nm;});
  });
  var ships=(DB.g('shipLog')||[]).filter(function(s){return s.pnm===nm;});
  var lastDt='';
  orders.forEach(function(o){if(o.dt&&(!lastDt||o.dt>lastDt))lastDt=o.dt;});
  wos.forEach(function(w){if(w.dt&&(!lastDt||w.dt>lastDt))lastDt=w.dt;});
  ships.forEach(function(s){if(s.dt&&(!lastDt||s.dt>lastDt))lastDt=s.dt;});
  return {
    woCount:wos.length,
    orderCount:orders.length,
    shipCount:ships.length,
    lastDt:lastDt||'-'
  };
}
function rProd(page){
  if(typeof page==='number')_prodPage=page;
  var detailPills=$('prodDetailPills');
  if(detailPills)detailPills.querySelectorAll('button').forEach(function(b){
    b.classList.toggle('on',b.dataset.mode===_prodDetailView);
  });
  const s=($('prodSch')?.value||'').toLowerCase();
  const ps=DB.g('prod').filter(function(p){
    if(!s)return true;
    if(typeof SearchUtil!=='undefined'){
      return SearchUtil.match(p.nm||'',s)||SearchUtil.match(p.cnm||'',s)||SearchUtil.match(p.code||'',s)||SearchUtil.match(p.spec||'',s);
    }
    return (p.nm||'').toLowerCase().includes(s)||(p.cnm||'').toLowerCase().includes(s)||(p.code||'').toLowerCase().includes(s);
  }).slice().sort(_prodSort);
  // KPI
  var allProd=DB.g('prod');
  var withPrice=allProd.filter(p=>p.price>0).length;
  var clientCnt=Object.keys(allProd.reduce((a,p)=>{a[p.cnm]=true;return a},{})).length;
  var avgPrice=allProd.length?Math.round(allProd.reduce((s,p)=>s+(p.price||0),0)/allProd.length):0;
  var favCnt=allProd.filter(_prodFavorite).length;
  var k=$('prodKpi');if(k)k.innerHTML=
    `<div class="sb blue"><div class="l">전체 품목</div><div class="v">${allProd.length}</div></div>`+
    `<div class="sb green"><div class="l">단가 등록</div><div class="v">${withPrice}</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">${allProd.length?Math.round(withPrice/allProd.length*100):0}%</div></div>`+
    `<div class="sb orange"><div class="l">평균 단가</div><div class="v">${avgPrice.toLocaleString()}<span style="font-size:14px">원</span></div></div>`+
    `<div class="sb purple"><div class="l">거래처 수</div><div class="v">${clientCnt}</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">즐겨찾기 ${favCnt}개</div></div>`;
  var pg=paginate(ps,_prodPage);var vis=pg.items;
  _bulkVisible.prod=vis.map(function(p){return p.id;});
  if(_prodView==='table'){
    $('prodTbl').querySelector('thead').innerHTML=_prodDetailView==='detail'
      ?'<tr><th style="width:36px;text-align:center">'+_bulkHead('prod')+'</th><th style="width:90px">코드</th><th style="min-width:180px">제품명</th><th style="width:140px">거래처</th><th style="width:90px;text-align:right">단가</th><th style="width:90px">종이</th><th style="width:110px">규격</th><th style="min-width:120px">공정</th><th style="width:110px">최근</th><th style="width:90px">관리</th></tr>'
      :'<tr><th style="width:36px;text-align:center">'+_bulkHead('prod')+'</th><th style="width:90px">코드</th><th style="min-width:180px">제품명</th><th style="width:140px">거래처</th><th style="width:90px;text-align:right">단가</th><th style="width:130px">최근 작업</th><th style="width:90px">관리</th></tr>';
    $('prodTbl').querySelector('tbody').innerHTML=vis.length?vis.map(function(p){
      var st=_prodUsageStats(p);
      var nm='<span style="font-weight:700">'+p.nm+'</span>'+(_prodFavorite(p)?' <span class="bd bd-p">★</span>':'');
      if(_prodDetailView==='detail'){
        return `<tr oncontextmenu="return openProdContextMenu(event,'${p.id}')" onclick="openProdLedgerPanel('${p.id}')">${_bulkCell('prod',p.id)}<td style="font-weight:700;color:var(--pri)">${p.code||'-'}</td><td>${nm}</td><td>${p.cnm}</td><td style="text-align:right">${p.price?p.price.toLocaleString()+'원':'-'}</td><td>${p.paper||'-'}</td><td>${p.spec||'-'}</td><td>${(p.procs||[]).map(x=>x.nm).join(' > ')}</td><td>${st.lastDt}${st.woCount?(' · '+st.woCount+'건'):''}</td><td><button class="btn btn-sm btn-o" onclick="event.stopPropagation();eProd('${p.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="event.stopPropagation();dProd('${p.id}')">삭제</button></td></tr>`;
      }
      return `<tr oncontextmenu="return openProdContextMenu(event,'${p.id}')" onclick="openProdLedgerPanel('${p.id}')">${_bulkCell('prod',p.id)}<td style="font-weight:700;color:var(--pri)">${p.code||'-'}</td><td>${nm}<div style="font-size:11px;color:var(--txt2);margin-top:3px">${p.spec||p.paper||'-'}</div></td><td>${p.cnm}</td><td style="text-align:right">${p.price?p.price.toLocaleString()+'원':'-'}</td><td>${st.woCount?st.woCount+'건':'이력 없음'}<div style="font-size:11px;color:var(--txt2);margin-top:3px">${st.lastDt}</div></td><td><button class="btn btn-sm btn-o" onclick="event.stopPropagation();eProd('${p.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="event.stopPropagation();dProd('${p.id}')">삭제</button></td></tr>`;
    }).join(''):'<tr><td colspan="'+(_prodDetailView==='detail'?10:7)+'" class="empty-cell">품목 없음</td></tr>';
  }else{
    var html=vis.length?'<div class="gal">'+vis.map(function(p){var ini=(p.code||p.nm).charAt(0);
      var st=_prodUsageStats(p);
      return `<div class="gal-card" onclick="openProdLedgerPanel('${p.id}')" oncontextmenu="return openProdContextMenu(event,'${p.id}')">
        <div class="gal-hd"><div class="gal-avatar purple">${ini}</div><div class="gal-info"><div class="gal-nm">${p.nm}</div><div class="gal-sub">${p.cnm}</div></div></div>
        <div style="font-size:11px;color:var(--txt3);font-weight:600;margin-bottom:6px">${p.code||''}${_prodFavorite(p)?' · 즐겨찾기':''}</div>
        <div class="gal-stats">
          <div><div class="gal-stat-l">단가</div><div class="gal-stat-v pri">${p.price?p.price.toLocaleString()+'원':'-'}</div></div>
          <div><div class="gal-stat-l">작업</div><div class="gal-stat-v">${st.woCount}건</div></div>
        </div>
        <div style="font-size:11px;color:var(--txt2);font-weight:600;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.paper||'-'}${p.spec?' / '+p.spec:''}</div>
        <div style="font-size:11px;color:var(--txt3);margin-top:6px">${st.lastDt!=='-'?('최근 '+st.lastDt):'최근 이력 없음'}</div>
      </div>`;
    }).join('')+'</div>':'<div class="empty-state"><div class="msg">품목 없음</div></div>';
    $('prodGalleryArea').innerHTML=html;
  }
  renderBulkBar('prod');
  renderPager('prodPager',pg,function(p){_prodPage=p;rProd()});
}
function acPmCli(v){const l=$('acPmCliL');const cs=DB.g('cli').filter(c=>!v||!v.trim()||v.trim()===' '||c.nm.toLowerCase().includes(v.toLowerCase()));if(!cs.length){l.classList.add('hidden');return}l.innerHTML=cs.map(c=>{var sn=c.nm.replace(/'/g,"&#39;");return`<div class="ac-i" onclick="$('pmCli').value='${sn}';$('acPmCliL').classList.add('hidden');if(!$('pmCode').value||$('pmCode').value.indexOf('-')>0)$('pmCode').value=genProdCode('${sn}')">${c.nm}<span style="float:right;font-size:11px;color:var(--txt2)">${c.ps||''}</span></div>`}).join('');l.classList.remove('hidden')}
function openProdMWithCli(cid){const c=DB.g('cli').find(x=>x.id===cid);openProdM();if(c)$('pmCli').value=c.nm}
function openProdM(){['pmId','pmCode','pmPrice','pmCli','pmNm','pmPaper','pmSpec','pmFabric','pmFabricSpec','pmQM','pmQE','pmPrint','pmGold','pmMold','pmHand','pmNote','pmCaut'].forEach(x=>$(x).value='');pProcs=[];renPP();$('prodMoT').textContent='품목 등록';oMo('prodMo')}
function eProd(id){const p=DB.g('prod').find(x=>x.id===id);if(!p)return;$('pmId').value=p.id;$('pmCode').value=p.code||'';$('pmPrice').value=p.price||'';$('pmCli').value=p.cnm;$('pmNm').value=p.nm;$('pmPaper').value=p.paper||'';$('pmSpec').value=p.spec||'';$('pmFabric').value=p.fabric||'';$('pmFabricSpec').value=p.fabricSpec||'';$('pmQM').value=p.qm||'';$('pmQE').value=p.qe||'';$('pmPrint').value=p.ps||'';$('pmGold').value=p.gold||'';$('pmMold').value=p.mold||'';$('pmHand').value=p.hand||'';$('pmNote').value=p.nt||'';$('pmCaut').value=p.caut||'';pProcs=(p.procs||[]).map(x=>({...x}));renPP();$('prodMoT').textContent='품목 수정';oMo('prodMo')}
function addPP(nm){pProcs.push({nm,tp:'n',mt:'',vd:''});renPP()}
function renPP(){$('pmPL').innerHTML=pProcs.length===0?'<span style="color:var(--txt2);font-size:12px">공정 없음</span>':pProcs.map((p,i)=>`<span class="pt">${i+1}. ${p.nm}<span class="rm" onclick="pProcs.splice(${i},1);renPP()">&times;</span></span>`).join('')}
function saveProd(){const nm=$('pmNm').value.trim(),cn=$('pmCli').value.trim();if(!nm){toast('제품명 필요','err');return}if(!cn){toast('거래처명 필요','err');return}const id=$('pmId').value||gid();var autoCode=$('pmCode').value.trim();if(!autoCode)autoCode=genProdCode(cn);const ps=DB.g('prod');const ei=ps.findIndex(x=>x.id===id);const existing=ei>=0?ps[ei]:null;var newPaper=$('pmPaper').value.trim(),newSpec=$('pmSpec').value.trim(),newFabric=$('pmFabric').value.trim(),newFabricSpec=$('pmFabricSpec').value.trim();var keepPapers=existing&&existing.papers&&existing.papers.length>1&&!newPaper&&!newSpec;var keepFabrics=existing&&existing.fabrics&&existing.fabrics.length>1&&!newFabric&&!newFabricSpec;var papers=keepPapers?existing.papers:[{paper:newPaper,spec:newSpec,qm:+$('pmQM').value||0,qe:0}];var fabrics=keepFabrics?existing.fabrics:[{fabric:newFabric,fabricSpec:newFabricSpec,fabricQty:0,fabricExtra:0}];const p={id,code:autoCode,price:+$('pmPrice').value||0,cid:DB.g('cli').find(c=>c.nm===cn)?.id||'',cnm:cn,nm,paper:newPaper||(existing?existing.paper||'':''),spec:newSpec||(existing?existing.spec||'':''),fabric:newFabric||(existing?existing.fabric||'':''),fabricSpec:newFabricSpec||(existing?existing.fabricSpec||'':''),qm:+$('pmQM').value||0,qe:0,papers,fabrics,ps:$('pmPrint').value,procs:pProcs,gold:$('pmGold').value,mold:$('pmMold').value,hand:$('pmHand').value,nt:$('pmNote').value,caut:$('pmCaut').value,isFavorite:existing?!!existing.isFavorite:false};if(ei>=0)ps[ei]=p;else ps.push(p);DB.s('prod',ps);cMo('prodMo');rProd();toast('저장','ok')}
function _getProdDeleteUsage(id){
  var p=(DB.g('prod')||[]).find(function(x){return x.id===id;});
  if(!p)return {total:0, counts:{}, text:''};
  var prodNm=p.nm||'';
  var prodId=p.id||id;
  var prodCode=p.code||'';
  var counts={
    견적:(DB.g('quotes')||[]).filter(function(q){
      return q && (q.prodId===prodId || (q.prod||q.pnm||'')===prodNm || ((q.quoteSnapshot||{}).item||{}).nm===prodNm);
    }).length,
    수주:(typeof getOrders==='function'?getOrders():DB.g('orders')||[]).filter(function(o){
      return o && (o.prodId===prodId || (o.pnm||'')===prodNm || (o.items||[]).some(function(it){
        return it && (it.prodId===prodId || (it.nm||'')===prodNm || (it.code||'')===prodCode);
      }));
    }).length,
    작업지시:(DB.g('wo')||[]).filter(function(w){
      return w && (w.pid===prodId || w.prodId===prodId || (w.pnm||'')===prodNm);
    }).length,
    출고:(DB.g('shipLog')||[]).filter(function(r){
      return r && (r.pid===prodId || r.prodId===prodId || (r.prod||r.pnm||'')===prodNm);
    }).length,
    매출:(DB.g('sales')||[]).filter(function(r){
      return r && (r.pid===prodId || r.prodId===prodId || (r.prod||r.pnm||'')===prodNm);
    }).length,
    매입:(DB.g('purchase')||[]).filter(function(r){
      return r && (r.pid===prodId || r.prodId===prodId || (r.prod||r.pnm||'')===prodNm);
    }).length,
    BOM:(DB.g('bom')||[]).filter(function(r){
      return r && (r.prodId===prodId || (r.prod||'')===prodNm);
    }).length,
    클레임:(DB.g('claims')||[]).filter(function(r){
      return r && (r.prodId===prodId || (r.prod||r.pnm||'')===prodNm);
    }).length
  };
  var total=Object.keys(counts).reduce(function(sum,key){return sum+(counts[key]||0);},0);
  return {total:total, counts:counts, text:_summarizeLinkedRecords(counts)};
}
function dProd(id){
  var usage=_getProdDeleteUsage(id);
  if(usage.total){
    alert('이 품목은 연결된 데이터가 있어 삭제할 수 없습니다.\n\n'+usage.text+'\n\n먼저 새 품목으로 전환하거나 기존 문서 이력을 유지하세요.');
    return;
  }
  if(!confirm('연결된 거래 데이터가 없습니다.\n정말 삭제할까요?'))return;
  DB.s('prod',DB.g('prod').filter(function(x){return x.id!==id;}));
  rProd();
  toast('삭제','ok');
}
function ensureProdContextMenu(){
  if($('prodCtxMenu'))return;
  var el=document.createElement('div');
  el.id='prodCtxMenu';
  el.className='cli-ctx-menu hidden';
  document.body.appendChild(el);
  document.addEventListener('click',closeProdContextMenu);
  document.addEventListener('contextmenu',function(e){if(!e.target.closest('#prodCtxMenu'))closeProdContextMenu();});
  window.addEventListener('scroll',closeProdContextMenu,true);
}
function openProdContextMenu(e,id){
  e.preventDefault();
  ensureProdContextMenu();
  var p=(DB.g('prod')||[]).find(function(x){return x.id===id;});
  if(!p)return false;
  var box=$('prodCtxMenu');
  box.innerHTML=''
    +'<button onclick="openProdLedgerPanel(\''+id+'\');closeProdContextMenu()">상세 확인</button>'
    +'<button onclick="toggleProdFavorite(\''+id+'\');closeProdContextMenu()">'+(_prodFavorite(p)?'즐겨찾기 해제':'즐겨찾기')+'</button>'
    +'<button onclick="eProd(\''+id+'\');closeProdContextMenu()">수정</button>'
    +'<button onclick="openProdLedgerPanel(\''+id+'\',\'recent\');closeProdContextMenu()">최근 작업 보기</button>'
    +'<button class="danger" onclick="dProd(\''+id+'\');closeProdContextMenu()">삭제</button>';
  box.style.left=Math.min(e.clientX,window.innerWidth-190)+'px';
  box.style.top=Math.min(e.clientY,window.innerHeight-220)+'px';
  box.classList.remove('hidden');
  return false;
}
function closeProdContextMenu(){if($('prodCtxMenu'))$('prodCtxMenu').classList.add('hidden')}
function toggleProdFavorite(id){
  var ps=DB.g('prod')||[];
  var idx=ps.findIndex(function(x){return x.id===id;});
  if(idx<0)return;
  ps[idx].isFavorite=!ps[idx].isFavorite;
  DB.s('prod',ps);rProd();
  toast(ps[idx].isFavorite?'품목 즐겨찾기 등록':'품목 즐겨찾기 해제','ok');
}
function openProdLedgerPanel(id,mode){
  var p=(DB.g('prod')||[]).find(function(x){return x.id===id;});
  if(!p||!window.UXAdv||!UXAdv.openSidePanel)return;
  var st=_prodUsageStats(p);
  var recentOrders=(getOrders?getOrders():DB.g('orders')||[]).filter(function(o){
    return (o.items||[]).some(function(it){return it&&it.nm===p.nm;});
  }).slice().sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');}).slice(0,8);
  var recentWos=(DB.g('wo')||[]).filter(function(w){return w.pnm===p.nm;}).slice().sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');}).slice(0,8);
  var recentShips=(DB.g('shipLog')||[]).filter(function(s){return s.pnm===p.nm;}).slice().sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');}).slice(0,8);
  var rows=(mode==='recent'?recentWos:recentOrders).map(function(row){
    if(mode==='recent')return '<tr><td>'+(row.dt||'-')+'</td><td>'+(row.wn||'-')+'</td><td>'+(row.cnm||'-')+'</td><td>'+(row.status||'-')+'</td></tr>';
    return '<tr><td>'+(row.dt||'-')+'</td><td>'+(row.ordNo||'-')+'</td><td>'+(row.cli||'-')+'</td><td>'+((row.items||[]).filter(function(it){return it&&it.nm===p.nm;}).length||1)+'건</td></tr>';
  }).join('');
  var shipRows=recentShips.map(function(row){
    return '<tr><td>'+(row.dt||'-')+'</td><td>'+(row.woNo||'-')+'</td><td>'+(row.cli||'-')+'</td><td style="text-align:right">'+fmt(row.qty||0)+'</td></tr>';
  }).join('');
  UXAdv.openSidePanel(
    '<div class="ux-sp-sec">'
      +'<div class="ux-sp-field"><div class="ux-sp-field-l">품목</div><div class="ux-sp-field-v" style="font-size:18px;font-weight:800">'+p.nm+(_prodFavorite(p)?' <span class="bd bd-p">★ 즐겨찾기</span>':'')+'</div></div>'
      +'<div class="ux-sp-grid">'
        +'<div class="ux-sp-card"><div class="ux-sp-k">거래처</div><div class="ux-sp-v">'+(p.cnm||'-')+'</div></div>'
        +'<div class="ux-sp-card"><div class="ux-sp-k">단가</div><div class="ux-sp-v">'+(p.price?fmt(p.price)+'원':'-')+'</div></div>'
        +'<div class="ux-sp-card"><div class="ux-sp-k">최근 작업</div><div class="ux-sp-v">'+st.woCount+'건</div></div>'
        +'<div class="ux-sp-card"><div class="ux-sp-k">최근 출고</div><div class="ux-sp-v">'+st.shipCount+'건</div></div>'
      +'</div>'
      +'<div class="ux-sp-note" style="margin-top:10px">'+[(p.code||''),(p.paper||''),(p.spec||'')].filter(Boolean).join(' · ')+'</div>'
    +'</div>'
    +'<div class="ux-sp-sec"><div class="ux-sp-sec-t">최근 수주</div><div class="u-scroll-x"><table class="dt"><thead><tr><th>일자</th><th>수주번호</th><th>거래처</th><th>건수</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4" class="empty-cell">이력 없음</td></tr>')+'</tbody></table></div></div>'
    +'<div class="ux-sp-sec"><div class="ux-sp-sec-t">최근 출고</div><div class="u-scroll-x"><table class="dt"><thead><tr><th>일자</th><th>WO</th><th>거래처</th><th>수량</th></tr></thead><tbody>'+(shipRows||'<tr><td colspan="4" class="empty-cell">이력 없음</td></tr>')+'</tbody></table></div></div>'
    +(window.PriceHistory?(function(){
        var ph=PriceHistory.getByProd(p.nm, 8);
        if(!ph.length) return '';
        return '<div class="ux-sp-sec"><div class="ux-sp-sec-t">단가 적용 이력 ('+ph.length+'건)</div><div class="u-scroll-x"><table class="dt"><thead><tr><th>일자</th><th>거래처</th><th style="text-align:right">단가</th><th>출처</th><th>문서</th></tr></thead><tbody>'
          +ph.map(function(h){return '<tr><td>'+(h.dt||'-')+'</td><td>'+(h.cliNm||'-')+'</td><td style="text-align:right;font-weight:700">'+(h.unitPrice||0).toLocaleString()+'원</td><td><span class="bd bd-w">'+PriceHistory.sourceLabel(h.source)+'</span></td><td style="color:#64748B">'+(h.refType||'-')+(h.note?' · '+h.note:'')+'</td></tr>';}).join('')
          +'</tbody></table></div></div>';
      })():''),
    {
      title:'품목 확인',
      width:560,
      footer:'<button class="btn btn-o" onclick="eProd(\''+id+'\');if(window.UXAdv)UXAdv.closeSidePanel()">수정</button>'
        +'<button class="btn btn-o" onclick="toggleProdFavorite(\''+id+'\')">'+(_prodFavorite(p)?'즐겨찾기 해제':'즐겨찾기')+'</button>'
    }
  );
}

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
  _bulkVisible.mold=vis.map(function(m){return m.id;});
  $('moldTbl').querySelector('thead').innerHTML='<tr><th style="width:36px;text-align:center">'+_bulkHead('mold')+'</th><th style="width:120px">목형번호</th><th style="min-width:180px">제품명</th><th style="width:140px">거래처</th><th style="width:130px">보관위치</th><th style="width:80px">상태</th><th style="width:100px">관리</th></tr>';
  $('moldTbl').querySelector('tbody').innerHTML=vis.length?vis.map(m=>`<tr>${_bulkCell('mold',m.id)}<td style="font-weight:700">${m.no}</td><td>${m.pnm||'-'}</td><td>${m.cnm||'-'}</td><td>${m.loc||'-'}</td><td>${m.st}</td><td><button class="btn btn-sm btn-o" onclick="eMold('${m.id}')">수정</button> <button class="btn btn-sm btn-d" onclick="dMold('${m.id}')">삭제</button></td></tr>`).join(''):'<tr><td colspan="7" class="empty-cell">목형 없음</td></tr>';
  renderBulkBar('mold');
  renderPager('moldPager',pg,function(p){_moldPage=p;rMold()});
}
function openMoldM(){['mmId','mmNo','mmProd','mmCli','mmLoc','mmNt'].forEach(x=>$(x).value='');$('mmSt').value='사용중';$('moldMoT').textContent='목형 등록';oMo('moldMo')}
function eMold(id){const m=DB.g('mold').find(x=>x.id===id);if(!m)return;$('mmId').value=m.id;$('mmNo').value=m.no;$('mmProd').value=m.pnm||'';$('mmCli').value=m.cnm||'';$('mmLoc').value=m.loc||'';$('mmSt').value=m.st;$('mmNt').value=m.nt||'';$('moldMoT').textContent='목형 수정';oMo('moldMo')}
function saveMold(){const no=$('mmNo').value.trim();if(!no){toast('목형번호 필요','err');return}const id=$('mmId').value||gid();const ms=DB.g('mold');const ei=ms.findIndex(x=>x.id===id);const m={id,no,pnm:$('mmProd').value,cnm:$('mmCli').value,loc:$('mmLoc').value,st:$('mmSt').value,nt:$('mmNt').value,cat:ei>=0?ms[ei].cat:nw()};if(ei>=0)ms[ei]=m;else ms.push(m);DB.s('mold',ms);cMo('moldMo');rMold();toast('저장','ok')}
function _getMoldDeleteUsage(id){
  var m=(DB.g('mold')||[]).find(function(x){return x.id===id;});
  if(!m)return {total:0, counts:{}, text:''};
  var mid=m.id||id;
  var no=m.no||'';
  var pnm=m.pnm||'';
  var matches=function(v){return !!v&&(v===mid||v===no);};
  var counts={
    품목:(DB.g('prod')||[]).filter(function(p){
      return p&&(p.moldId===mid||p.moldNo===no||matches(p.mold)||matches(p.moldNm));
    }).length,
    작업지시:(DB.g('wo')||[]).filter(function(w){
      if(!w)return false;
      if(w.moldId===mid||w.moldNo===no||matches(w.mold)||matches(w.moldNm))return true;
      if(pnm&&w.pnm===pnm&&no&&(w.mold===no||w.moldNo===no))return true;
      return (w.procs||[]).some(function(p){return p&&(p.moldId===mid||p.moldNo===no||matches(p.mold)||matches(p.moldNm));});
    }).length,
    이력:(DB.g('moldHist')||[]).filter(function(h){
      return h&&(h.moldId===mid||h.moldNo===no||matches(h.mold)||matches(h.no));
    }).length
  };
  var total=Object.keys(counts).reduce(function(sum,key){return sum+(counts[key]||0);},0);
  return {total:total, counts:counts, text:_summarizeLinkedRecords(counts)};
}
function dMold(id){
  var usage=_getMoldDeleteUsage(id);
  if(usage.total){
    alert('이 목형은 연결된 데이터가 있어 삭제할 수 없습니다.\n\n'+usage.text+'\n\n품목/작업지시 이력을 유지하려면 목형 상태를 보관중 또는 폐기로 변경하세요.');
    return;
  }
  if(!confirm('연결된 데이터가 없습니다.\n정말 삭제할까요?'))return;
  DB.s('mold',DB.g('mold').filter(x=>x.id!==id));
  rMold();
  toast('삭제','ok');
}

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
    cType:['유형','구분','type','거래유형','거래처구분','분류','customerType'],
    receivable:['미수','미수금','받을돈','매출잔액','외상매출금','receivable'],
    payable:['미지급','미지급금','줄돈','매입잔액','외상매입금','payable'],
    balance:['잔액','현재잔액','balance'],
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
      var typeRaw=String(get('cType')||'').trim();
      var receivable=Number(String(get('receivable')||'').replace(/[^\d.-]/g,''))||0;
      var payable=Number(String(get('payable')||'').replace(/[^\d.-]/g,''))||0;
      var balance=Number(String(get('balance')||'').replace(/[^\d.-]/g,''))||0;
      if(balance>0)receivable=receivable||balance;
      if(balance<0)payable=payable||Math.abs(balance);
      var tmp={nm:nm,cTypeRaw:typeRaw,customerType:typeRaw,receivable:receivable,payable:payable,note:String(get('note')||'').trim()};
      var cType=_inferCliType(tmp,{sales:{},purchase:{},ship:{},income:{},po:{},vendor:{},prod:{},order:{},quote:{},wo:{}}).type;
      items.push({
        id:gid(),nm:nm,
        biz:String(get('biz')||'').trim(),
        ceo:String(get('ceo')||'').trim(),
        tel:String(get('tel')||'').trim(),
        fax:String(get('fax')||'').trim(),
        addr:String(get('addr')||'').trim(),
        email:String(get('email')||'').trim(),
        cType:cType,
        cTypeRaw:typeRaw,
        customerType:typeRaw,
        receivable:receivable,
        payable:payable,
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
    var merged=existing.concat(newItems);
    var sets=buildCliTypeSets();
    merged.forEach(function(c){
      var inf=_inferCliType(c,sets);
      c.cType=inf.type;
      c.cTypeAutoReason=inf.reason;
    });
    DB.s('cli',merged);rCli();
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
