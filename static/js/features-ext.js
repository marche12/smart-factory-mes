/* ================================================================
   features-ext.js  —  확장 기능 통합 모듈
   수주진행추적, 납기관리, 공정실적, 로트추적, 비가동, 불량, 외주,
   금형이력, OEE, 부분출고, 반품, 출하검사, 안전재고, MRP, 재고실사,
   단가이력, 전자세금계산서, 원가분석, 채권aging, 교대스케줄, 4대보험,
   실시간KPI, 수익성분석, 납기준수율, 클레임, 예방보전, 고장이력,
   검사성적서, 권한관리, 백업/복원, 감사로그, 공통코드
   ================================================================ */

/* ---------- 페이지 위치 보정 ---------- */
(function(){
  var mc=document.querySelector('.main-content');
  if(!mc)return;
  var orphans=document.querySelectorAll('.module-page');
  orphans.forEach(function(el){
    if(el.parentElement!==mc&&!mc.contains(el)){
      mc.appendChild(el);
    }
  });
})();

/* ---------- 유틸 ---------- */
function _woSelect(selId){
  var el=$(selId);if(!el||el.id==='__null__')return;
  var wos=DB.g('wo');
  el.innerHTML='<option value="">선택</option>'+wos.map(function(w){return'<option value="'+w.id+'">'+w.wn+' '+w.pnm+'</option>'}).join('');
}
function _cliSelect(selId){
  var el=$(selId);if(!el||el.id==='__null__')return;
  var cs=DB.g('cli');
  el.innerHTML='<option value="">선택</option>'+cs.map(function(c){return'<option value="'+c.nm+'">'+c.nm+'</option>'}).join('');
}
function _prodSelect(selId){
  var el=$(selId);if(!el||el.id==='__null__')return;
  var ps=DB.g('prod');
  el.innerHTML='<option value="">선택</option>'+ps.map(function(p){return'<option value="'+p.nm+'">'+p.nm+'</option>'}).join('');
}
function _equipSelect(selId){
  var el=$(selId);if(!el||el.id==='__null__')return;
  var eqs=DB.g('equip');
  el.innerHTML='<option value="">전체 설비</option>'+eqs.map(function(e){return'<option value="'+e.nm+'">'+e.nm+'</option>'}).join('');
}
function _vendorSelect(selId){
  var el=$(selId);if(!el||el.id==='__null__')return;
  var vs=DB.g('cli').filter(function(c){return c.tp==='vendor'||c.tp==='인쇄소'||c.tp==='협력사'||c.tp==='협력 인쇄소'});
  if(!vs.length)vs=DB.g('vendor');
  el.innerHTML='<option value="">전체</option>'+vs.map(function(v){return'<option value="'+(v.nm||v.name)+'">'+( v.nm||v.name)+'</option>'}).join('');
}

/* ================================================================
   1. 수주 진행 상태 추적
   ================================================================ */
function rOrderTrack(){
  var mo=$('otMonth').value||cm();
  var q=($('otSearch').value||'').toLowerCase();
  var st=$('otStatus').value;
  var orders=DB.g('orders');
  var wos=DB.g('wo');
  var ships=DB.g('shipLog')||[];
  var rows=orders.filter(function(o){
    if(q&&(o.cli||'').toLowerCase().indexOf(q)<0&&JSON.stringify(o.items||[]).toLowerCase().indexOf(q)<0)return false;
    if(st){
      var status=_getOrderStatus(o,wos,ships);
      if(status!==st)return false;
    }
    return true;
  });
  var h='<table class="dt"><thead><tr><th>수주번호</th><th>수주일</th><th>거래처</th><th>품목</th><th>수량</th><th>납기</th><th>진행상태</th><th>상세</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';
  rows.forEach(function(o){
    var status=_getOrderStatus(o,wos,ships);
    var items=o.items||[];
    var pnm=items.map(function(i){return i.nm||i.pnm}).join(', ')||'-';
    var qty=items.reduce(function(s,i){return s+(i.qty||0)},0);
    h+='<tr><td>'+(o.no||'-')+'</td><td>'+(o.dt||'-')+'</td><td>'+(o.cli||'-')+'</td><td>'+pnm+'</td><td>'+fmt(qty)+'</td><td>'+(o.shipDt||'-')+'</td><td>'+badge(status)+'</td>';
    h+='<td><div class="prog-bar"><div class="prog-fill" style="width:'+_getOrderProgress(o,wos,ships)+'%"></div></div></td></tr>';
  });
  h+='</tbody></table>';
  $('orderTrackArea').innerHTML=h;
}
function _getOrderStatus(o,wos,ships){
  if(o.status==='취소')return'취소';
  var oid=o.id;
  var _linkedWoIds=typeof orderWOIds==='function'?orderWOIds(o):[];
  if(!_linkedWoIds.length)_linkedWoIds=wos.filter(function(w){return w.ordId===oid}).map(function(w){return w.id});
  var hasShip=ships.some(function(s){return _linkedWoIds.indexOf(s.woId)>=0});
  if(hasShip)return'출고완료';
  var matchWO=function(w){return _linkedWoIds.indexOf(w.id)>=0||w.ordId===oid};
  var linkedWOs=wos.filter(matchWO);
  var hasWO=linkedWOs.length>0;
  if(hasWO){
    var allDone=linkedWOs.every(function(w){return w.status==='완료'||w.status==='완료대기'||w.status==='출고완료'});
    if(allDone)return'출고대기';
    return'생산중';
  }
  return o.status||'수주';
}
function _getOrderProgress(o,wos,ships){
  var st=_getOrderStatus(o,wos,ships);
  if(st==='수주'||st==='수주확정')return 10;
  if(st==='생산중')return 50;
  if(st==='출고대기'||st==='완료대기')return 80;
  if(st==='출고완료')return 100;
  return 0;
}

/* ================================================================
   2. 납기 관리
   ================================================================ */
function rDueManage(){
  var wos=DB.g('wo');
  var orders=typeof getOrders==='function'?getOrders():(DB.g('orders')||[]);
  var outsource=DB.g('outsource')||[];
  var today=td();
  var over=0,soon=0,active=0,done=0;
  var rows=[];
  function diffOf(ds){return Math.round((new Date(ds)-new Date(today))/864e5)}
  function ddayText(diff){return diff<0?'D+'+Math.abs(diff):diff===0?'D-Day':'D-'+diff}
  function currentProcLabel(w){
    var cur=(w.procs||[]).find(function(p){return p.st==='진행중'||p.st==='외주대기'||p.st==='외주진행중'});
    if(cur)return cur.nm+(cur.st==='외주대기'||cur.st==='외주진행중'?' / 외주':' / 진행중');
    var next=(w.procs||[]).find(function(p){return p.st==='대기'});
    if(next)return next.nm+' / 대기';
    return w.status||'대기';
  }
  function outsourceRisk(w){
    var items=outsource.filter(function(o){return o.woId===w.id&&o.st!=='완료'});
    if(!items.length)return '-';
    items.sort(function(a,b){return (a.due||'9999-12-31').localeCompare(b.due||'9999-12-31')});
    var os=items[0];
    if(os.due&&os.due<today)return (os.vendor||'협력사')+' / 외주 지연';
    if(os.due&&diffOf(os.due)<=1)return (os.vendor||'협력사')+' / 입고 임박';
    return (os.vendor||'협력사')+' / '+(os.proc||'외주공정');
  }
  wos.forEach(function(w){
    if(!w.sd)return;
    if(w.status==='출고완료'||w.status==='취소'){done++;return}
    var diff=diffOf(w.sd);
    if(diff<0)over++;
    else if(diff<=3)soon++;
    else active++;
    rows.push({
      type:'wo',
      no:w.wn||'-',
      cli:w.cnm||'-',
      prod:w.pnm||'-',
      qty:w.fq||0,
      due:w.sd,
      diff:diff,
      status:w.status||'대기',
      current:currentProcLabel(w),
      risk:outsourceRisk(w)
    });
  });
  orders.forEach(function(o){
    if(!o.shipDt||(typeof orderHasLinkedWO==='function'?orderHasLinkedWO(o):!!o.woId)||o.status==='출고완료'||o.status==='취소')return;
    var diff=diffOf(o.shipDt);
    if(diff<0)over++;
    else if(diff<=3)soon++;
    else active++;
    rows.push({
      type:'order',
      no:o.no||'-',
      cli:o.cli||'-',
      prod:(o.items&&o.items.length?o.items.map(function(it){return it.nm;}).join(', '):o.prodNm||'-'),
      qty:(o.items||[]).reduce(function(sum,it){return sum+(Number(it.qty)||0);},0),
      due:o.shipDt,
      diff:diff,
      status:o.status||'수주확정',
      current:'작업지시 미생성',
      risk:'수주만 등록'
    });
  });
  $('dueOver').textContent=over;
  $('dueSoon').textContent=soon;
  $('dueActive').textContent=active;
  $('dueDone').textContent=done;
  rows.sort(function(a,b){return a.diff-b.diff});
  var noWoCount=rows.filter(function(r){return r.type==='order'}).length;
  var osLate=outsource.filter(function(o){return o.st!=='완료'&&o.due&&o.due<today}).length;
  var h='';
  if(noWoCount||osLate){
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
    if(noWoCount)h+='<div style="padding:8px 12px;border-radius:10px;background:#FFF7ED;border:1px solid #FED7AA;color:#C2410C;font-size:12px;font-weight:700">작업지시 미생성 수주 '+noWoCount+'건</div>';
    if(osLate)h+='<div style="padding:8px 12px;border-radius:10px;background:#FEF2F2;border:1px solid #FECACA;color:#B91C1C;font-size:12px;font-weight:700">외주 지연 '+osLate+'건</div>';
    h+='</div>';
  }
  h+='<table class="dt"><thead><tr><th>D-Day</th><th>구분</th><th>거래처</th><th>품목</th><th>수량</th><th>현재 단계</th><th>외주/리스크</th><th>납기일</th><th>상태</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';
  rows.forEach(function(r){
    var cls=r.diff<0?'color:#EF4444;font-weight:700':r.diff<=3?'color:#F59E0B;font-weight:700':'';
    h+='<tr><td style="'+cls+'">'+ddayText(r.diff)+'</td><td>'+(r.type==='wo'?'<span class="bd bd-p">WO</span>':'<span class="bd bd-o">수주</span>')+' '+r.no+'</td><td>'+r.cli+'</td><td>'+r.prod+'</td><td>'+fmt(r.qty)+'</td><td>'+r.current+'</td><td>'+r.risk+'</td><td>'+r.due+'</td><td>'+badge(r.status||'대기')+'</td></tr>';
  });
  h+='</tbody></table>';
  $('dueArea').innerHTML=h;
}

/* ================================================================
   3. 공정별 실적 입력
   ================================================================ */
var _plEdit=null;
function rProcLog(){
  // 기간 필터 초기화
  if(!$('plPrdBar').innerHTML)$('plPrdBar').innerHTML=periodFilterHTML('pl');
  if(!_prdState['pl']){setPrd('pl','daily',null);if(!$('plDtVal').value)$('plDtVal').value=td()}
  var proc=$('plProc').value;
  var all=DB.g('procLog');
  var filtered=prdFilterData(all,'pl','dt');
  var logs=filtered.filter(function(l){
    if(proc&&proc!=='all'&&l.proc!==proc)return false;
    return true;
  });
  var tb=$('procLogTbl').querySelector('tbody');
  if(!logs.length){tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--txt3)">실적 없음</td></tr>';
    _prdExportData['pl']={headers:[],rows:[],sheetName:'공정실적',fileName:'공정실적'};return}
  tb.innerHTML=logs.map(function(l){
    return'<tr><td>'+l.dt+'</td><td>'+(l.woNm||'-')+'</td><td>'+l.proc+'</td><td>'+(l.worker||'-')+'</td><td>'+fmt(l.qty)+'</td><td>'+fmt(l.defect||0)+'</td><td>'+(l.time||0)+'분</td><td>'+(l.note||'')+'</td><td><button class="btn btn-sm btn-d" onclick="delProcLog(\''+l.id+'\')">삭제</button></td></tr>'
  }).join('');
  // 엑셀 내보내기 데이터
  _prdExportData['pl']={headers:['일자','작업지시','공정','작업자','생산수량','불량수량','작업시간(분)','비고'],rows:logs.map(function(l){return[l.dt,l.woNm||'',l.proc,l.worker||'',l.qty,l.defect||0,l.time||0,l.note||'']}),sheetName:'공정실적',fileName:'공정실적'};
}
window._prdCb_pl=rProcLog;
function openProcLogM(){
  _plEdit=null;
  _woSelect('plWO');fillProcSelect('plProcSel',false);
  $('plWorker').value='';$('plQty').value='';$('plDefect').value='0';$('plTime').value='';$('plNote').value='';
  oMo('procLogMo');
}
function fillPLProcs(){
  var woId=$('plWO').value;if(!woId)return;
  var wo=DB.g('wo').find(function(w){return w.id===woId});
  if(!wo||!wo.procs)return;
  var sel=$('plProcSel');
  sel.innerHTML=wo.procs.map(function(p){return'<option value="'+p.nm+'">'+p.nm+'</option>'}).join('');
}
function saveProcLog(){
  var woId=$('plWO').value;if(!woId){toast('패키지 작업지시를 선택하세요','err');return}
  var wo=DB.g('wo').find(function(w){return w.id===woId});
  var rec={id:_plEdit||gid(),dt:td(),woId:woId,woNm:wo?wo.wn:'',proc:$('plProcSel').value,worker:$('plWorker').value,qty:+$('plQty').value||0,defect:+$('plDefect').value||0,time:+$('plTime').value||0,note:$('plNote').value};
  var list=DB.g('procLog');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('procLog',list);cMo('procLogMo');rProcLog();toast('실적 저장','ok');
}
function delProcLog(id){if(!confirm('삭제?'))return;DB.s('procLog',DB.g('procLog').filter(function(x){return x.id!==id}));rProcLog()}

/* ================================================================
   4. 로트 추적
   ================================================================ */
var _lotEdit=null;
function rLotTrace(){
  var q=($('lotSearch').value||'').toLowerCase();
  var lots=DB.g('lots').filter(function(l){
    if(!q)return true;
    return(l.lotNo||'').toLowerCase().indexOf(q)>=0||(l.woNm||'').toLowerCase().indexOf(q)>=0||(l.matLot||'').toLowerCase().indexOf(q)>=0;
  });
  var h='<table class="dt"><thead><tr><th>로트번호</th><th>작업지시</th><th>원자재 로트</th><th>생산일</th><th>비고</th><th>관리</th></tr></thead><tbody>';
  if(!lots.length)h+='<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';
  lots.forEach(function(l){
    h+='<tr><td style="font-weight:700">'+l.lotNo+'</td><td>'+(l.woNm||'-')+'</td><td>'+(l.matLot||'-')+'</td><td>'+(l.dt||'-')+'</td><td>'+(l.note||'')+'</td><td><button class="btn btn-sm btn-d" onclick="delLot(\''+l.id+'\')">삭제</button></td></tr>';
  });
  h+='</tbody></table>';
  $('lotTraceArea').innerHTML=h;
}
function openLotM(){_lotEdit=null;_woSelect('lotWO');$('lotNo').value='LOT-'+Date.now().toString(36).toUpperCase();$('lotMat').value='';$('lotDt').value=td();$('lotNote').value='';oMo('lotMo')}
function saveLot(){
  var no=$('lotNo').value.trim();if(!no){toast('로트번호 필요','err');return}
  var woId=$('lotWO').value;var wo=woId?DB.g('wo').find(function(w){return w.id===woId}):null;
  var rec={id:_lotEdit||gid(),lotNo:no,woId:woId,woNm:wo?wo.wn:'',matLot:$('lotMat').value,dt:$('lotDt').value,note:$('lotNote').value};
  var list=DB.g('lots');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('lots',list);cMo('lotMo');rLotTrace();toast('로트 저장','ok');
}
function delLot(id){if(!confirm('삭제?'))return;DB.s('lots',DB.g('lots').filter(function(x){return x.id!==id}));rLotTrace()}

/* ================================================================
   5. 비가동 관리
   ================================================================ */
var _dtEdit=null;
function rDowntime(){
  var mo=$('dtMonth').value||cm();
  var eq=$('dtEquip').value;
  var list=DB.g('downtime').filter(function(d){
    if(d.start&&d.start.slice(0,7)!==mo)return false;
    if(eq&&d.equip!==eq)return false;
    return true;
  });
  var totalMin=0,reasons={};
  list.forEach(function(d){totalMin+=d.minutes||0;reasons[d.reason]=(reasons[d.reason]||0)+1});
  $('dtTotal').textContent=Math.round(totalMin/60*10)/10+'h';
  $('dtCount').textContent=list.length;
  var topR=Object.keys(reasons).sort(function(a,b){return reasons[b]-reasons[a]})[0];
  $('dtTopReason').textContent=topR||'-';
  var tb=$('dtTbl').querySelector('tbody');
  if(!list.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';return}
  tb.innerHTML=list.map(function(d){
    return'<tr><td>'+(d.start||'-')+'</td><td>'+(d.equip||'-')+'</td><td>'+badge(d.reason)+'</td><td>'+(d.detail||'-')+'</td><td>'+(d.minutes||0)+'분</td><td>'+(d.action||'-')+'</td><td><button class="btn btn-sm btn-d" onclick="delDowntime(\''+d.id+'\')">삭제</button></td></tr>'
  }).join('');
}
function openDtM(){_dtEdit=null;_equipSelect('dtEquipSel');$('dtDetail').value='';$('dtStart').value='';$('dtEnd').value='';$('dtAction').value='';oMo('dtMo')}
function saveDowntime(){
  var equip=$('dtEquipSel').value;if(!equip){toast('설비 선택','err');return}
  var s=$('dtStart').value,e=$('dtEnd').value;
  var minutes=0;if(s&&e)minutes=Math.round((new Date(e)-new Date(s))/60000);
  var rec={id:_dtEdit||gid(),equip:equip,reason:$('dtReason').value,detail:$('dtDetail').value,start:s,end:e,minutes:minutes,action:$('dtAction').value};
  var list=DB.g('downtime');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('downtime',list);cMo('dtMo');rDowntime();toast('비가동 등록','ok');
}
function delDowntime(id){if(!confirm('삭제?'))return;DB.s('downtime',DB.g('downtime').filter(function(x){return x.id!==id}));rDowntime()}

/* ================================================================
   6. 불량 관리
   ================================================================ */
var _dfEdit=null;
function rDefect(){
  var mo=$('dfMonth').value||cm();
  var tp=$('dfType').value;
  var list=DB.g('defects').filter(function(d){
    if(d.dt&&d.dt.slice(0,7)!==mo)return false;
    if(tp&&d.type!==tp)return false;
    return true;
  });
  var totalDf=0,totalProd=0,types={};
  list.forEach(function(d){totalDf+=d.qty||0;types[d.type]=(types[d.type]||0)+(d.qty||0)});
  // 해당 월 총 생산량 (공정실적 기반)
  DB.g('procLog').forEach(function(l){if(l.dt&&l.dt.slice(0,7)===mo)totalProd+=l.qty||0});
  $('dfTotal').textContent=fmt(totalDf);
  $('dfRate').textContent=totalProd>0?(totalDf/totalProd*100).toFixed(1)+'%':'0%';
  var topT=Object.keys(types).sort(function(a,b){return types[b]-types[a]})[0];
  $('dfTopType').textContent=topT||'-';
  var tb=$('dfTbl').querySelector('tbody');
  if(!list.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';return}
  tb.innerHTML=list.map(function(d){
    return'<tr><td>'+(d.dt||'-')+'</td><td>'+(d.woNm||'-')+'</td><td>'+(d.proc||'-')+'</td><td>'+badge(d.type)+'</td><td>'+fmt(d.qty)+'</td><td>'+(d.cause||'-')+'</td><td>'+(d.action||'-')+'</td><td><button class="btn btn-sm btn-d" onclick="delDefect(\''+d.id+'\')">삭제</button></td></tr>'
  }).join('');
}
function openDfM(){_dfEdit=null;_woSelect('dfWO');fillProcSelect('dfProc',false);$('dfQty').value='';$('dfCause').value='';$('dfActionTxt').value='';oMo('dfMo')}
function saveDefect(){
  var woId=$('dfWO').value;var wo=woId?DB.g('wo').find(function(w){return w.id===woId}):null;
  var rec={id:_dfEdit||gid(),dt:td(),woId:woId,woNm:wo?wo.wn:'',proc:$('dfProc').value,type:$('dfTypeSel').value,qty:+$('dfQty').value||0,cause:$('dfCause').value,action:$('dfActionTxt').value};
  var list=DB.g('defects');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('defects',list);cMo('dfMo');rDefect();toast('불량 등록','ok');
}
function delDefect(id){if(!confirm('삭제?'))return;DB.s('defects',DB.g('defects').filter(function(x){return x.id!==id}));rDefect()}

/* ================================================================
   7. 외주 공정 관리
   ================================================================ */
var _osEdit=null;
function _isAutoSyncOutsourceRow(row){
  return !!(row&&(row.source==='wo-sync'||row.note==='WO 자동 연동'));
}
function syncWOOutsourceRecords(wo){
  if(!wo||!wo.procs||!wo.procs.length)return;
  var list=DB.g('outsource')||[];
  var desired={};
  wo.procs.forEach(function(p){
    var isOut=p.tp==='out'||!!(p.vd&&p.vd.trim());
    if(!isOut)return;
    desired[p.nm]={
      dt:wo.dt||td(),
      woId:wo.id,
      woNm:wo.wn||'',
      proc:p.nm,
      vendor:p.vd||wo.vendor||'',
      qty:p.qty||wo.fq||0,
      due:wo.sd||'',
      st:(p.st==='외주완료')?'완료':'진행중'
    };
  });
  var next=[];
  var seen={};
  list.forEach(function(row){
    if(row.woId!==wo.id){next.push(row);return}
    var target=desired[row.proc];
    if(!target)return;
    seen[row.proc]=true;
    var price=+row.price||0;
    var merged=Object.assign({},row,target);
    if(!merged.vendor)merged.vendor=row.vendor||'';
    merged.qty=target.qty;
    merged.due=target.due;
    merged.st=target.st;
    merged.price=price;
    merged.amt=(merged.qty||0)*price;
    if(_isAutoSyncOutsourceRow(row)||!row.source){
      merged.source='wo-sync';
      if(!row.note||row.note==='WO 자동 연동')merged.note='WO 자동 연동';
    }
    next.push(merged);
  });
  Object.keys(desired).forEach(function(procNm){
    if(seen[procNm])return;
    var base=desired[procNm];
    next.push({
      id:gid(),
      dt:base.dt,
      woId:base.woId,
      woNm:base.woNm,
      proc:base.proc,
      vendor:base.vendor,
      qty:base.qty,
      price:0,
      amt:0,
      due:base.due,
      note:'WO 자동 연동',
      st:base.st,
      source:'wo-sync'
    });
  });
  DB.s('outsource',next);
}
function rOutsource(){
  var mo=$('osMonth').value||cm();
  var vd=$('osVendor').value;
  var list=DB.g('outsource').filter(function(o){
    if(o.dt&&o.dt.slice(0,7)!==mo)return false;
    if(vd&&o.vendor!==vd)return false;
    return true;
  });
  var activeN=0,doneN=0,costN=0;
  list.forEach(function(o){
    if(o.st==='완료'){doneN++;costN+=o.amt||0}
    else activeN++;
  });
  $('osActive').textContent=activeN;
  $('osDone').textContent=doneN;
  $('osCost').textContent=fmt(costN)+'원';
  var tb=$('osTbl').querySelector('tbody');
  if(!list.length){tb.innerHTML='<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';return}
  tb.innerHTML=list.map(function(o){
    var dueTxt=o.due||'-';
    if(o.st!=='완료'&&o.due){
      var dd=Math.round((new Date(o.due)-new Date(td()))/864e5);
      dueTxt+='<div style="font-size:11px;color:'+(dd<0?'#DC2626':dd<=1?'#EA580C':'#64748B')+';font-weight:700">'+(dd<0?'D+'+Math.abs(dd):dd===0?'D-Day':'D-'+dd)+'</div>';
    }
    return'<tr><td>'+(o.dt||'-')+'</td><td>'+(o.woNm||'-')+'</td><td>'+(o.proc||'-')+'</td><td>'+(o.vendor||'-')+(o.note?'<div style="font-size:11px;color:#64748B">'+o.note+'</div>':'')+'</td><td>'+fmt(o.qty)+'</td><td>'+fmt(o.price)+'</td><td>'+fmt(o.amt)+'</td><td>'+dueTxt+'</td><td>'+badge(o.st||'진행중')+'</td><td><button class="btn btn-sm btn-o" onclick="completeOS(\''+o.id+'\')">완료</button> <button class="btn btn-sm btn-d" onclick="delOS(\''+o.id+'\')">삭제</button></td></tr>'
  }).join('');
}
function openOsM(){_osEdit=null;_woSelect('osWO');fillProcSelect('osProc',false);_vendorSelect('osVendorSel');$('osQty').value='';$('osPrice').value='';$('osDue').value='';$('osNote').value='';oMo('osMo')}
function saveOutsource(){
  var woId=$('osWO').value;var wo=woId?DB.g('wo').find(function(w){return w.id===woId}):null;
  if(!wo){toast('작업지시를 선택하세요','err');return}
  if(!$('osProc').value){toast('외주 공정을 선택하세요','err');return}
  if(!$('osVendorSel').value){toast('외주업체를 선택하세요','err');return}
  var qty=+$('osQty').value||0,price=+$('osPrice').value||0;
  if(!qty)qty=wo.fq||0;
  var rec={id:_osEdit||gid(),dt:td(),woId:woId,woNm:wo?wo.wn:'',proc:$('osProc').value,vendor:$('osVendorSel').value,qty:qty,price:price,amt:qty*price,due:$('osDue').value,note:$('osNote').value,st:'진행중',source:'manual'};
  var list=DB.g('outsource');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('outsource',list);
  var wos=DB.g('wo');var wi=wos.findIndex(function(w){return w.id===woId});
  if(wi>=0&&wos[wi].procs){
    var pi=wos[wi].procs.findIndex(function(p){return p.nm===rec.proc});
    if(pi>=0){
      var p=wos[wi].procs[pi];
      p.tp='out';
      p.vd=rec.vendor;
      if(p.st==='대기'||!p.st)p.st='외주대기';
      if(!p.t1)p.t1=nw();
      if(wos[wi].status==='대기')wos[wi].status='진행중';
      DB.s('wo',wos);
    }
  }
  cMo('osMo');
  rOutsource();
  if(typeof rPlan==='function')rPlan();
  if(typeof rWOList==='function')rWOList();
  if(typeof rDueManage==='function')rDueManage();
  toast('외주 등록','ok');
}
function completeOS(id){
  var list=DB.g('outsource');
  var o=list.find(function(x){return x.id===id});
  if(!o)return;
  o.st='완료';
  o.doneDt=td();
  DB.s('outsource',list);
  var wos=DB.g('wo');var wi=wos.findIndex(function(w){return w.id===o.woId});
  if(wi>=0&&wos[wi].procs){
    var wo=wos[wi];
    var pi=wo.procs.findIndex(function(p){return p.nm===o.proc});
    if(pi>=0){
      var p=wo.procs[pi];
      p.tp='out';
      p.vd=o.vendor||p.vd||'';
      p.st='외주완료';
      p.t2=nw();
      if(o.qty)p.qty=o.qty;
      var nextIdx=-1;
      for(var ni=pi+1;ni<wo.procs.length;ni++){
        if(wo.procs[ni].st==='대기'){nextIdx=ni;break}
      }
      if(nextIdx>=0)wo.status='진행중';
      else if(wo.procs.every(function(x){return x.st==='완료'||x.st==='외주완료'||x.st==='스킵';})){wo.status='완료대기';wo.compDate=td()}
      DB.s('wo',wos);
    }
  }
  rOutsource();
  if(typeof rPlan==='function')rPlan();
  if(typeof rWOList==='function')rWOList();
  if(typeof rDueManage==='function')rDueManage();
  toast('외주 완료','ok');
}
function delOS(id){if(!confirm('삭제?'))return;DB.s('outsource',DB.g('outsource').filter(function(x){return x.id!==id}));rOutsource();if(typeof rPlan==='function')rPlan();if(typeof rDueManage==='function')rDueManage()}

/* ================================================================
   8. 금형/목형 사용 이력
   ================================================================ */
function rMoldHist(){
  var q=($('mhSearch').value||'').toLowerCase();
  var molds=DB.g('mold');
  var wos=DB.g('wo');
  // 목형별 사용 횟수 집계
  var usage={};
  wos.forEach(function(w){
    var key=w.moldNm||w.mold||'';
    if(!key)return;
    if(!usage[key])usage[key]={count:0,last:'',clients:{}};
    usage[key].count++;
    if(w.dt>usage[key].last)usage[key].last=w.dt;
    if(w.cnm)usage[key].clients[w.cnm]=true;
  });
  var rows=molds.filter(function(m){return!q||(m.nm||'').toLowerCase().indexOf(q)>=0});
  var h='<table class="dt"><thead><tr><th>목형명</th><th>규격</th><th>사용횟수</th><th>최근사용</th><th>사용 거래처</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';
  rows.forEach(function(m){
    var u=usage[m.nm]||{count:0,last:'-',clients:{}};
    h+='<tr><td style="font-weight:700">'+m.nm+'</td><td>'+(m.spec||'-')+'</td><td>'+u.count+'회</td><td>'+(u.last||'-')+'</td><td>'+Object.keys(u.clients).join(', ')+'</td></tr>';
  });
  h+='</tbody></table>';
  $('moldHistArea').innerHTML=h;
}

/* ================================================================
   9. OEE (설비종합효율)
   ================================================================ */
function rOEE(){
  var mo=$('oeeMonth').value||cm();
  var eq=$('oeeEquip').value;
  var equips=DB.g('equip');
  if(eq)equips=equips.filter(function(e){return e.nm===eq});
  var dts=DB.g('downtime').filter(function(d){return d.start&&d.start.slice(0,7)===mo});
  var logs=DB.g('procLog').filter(function(l){return l.dt&&l.dt.slice(0,7)===mo});
  var defects=DB.g('defects').filter(function(d){return d.dt&&d.dt.slice(0,7)===mo});
  // 해당 월 영업일수 (대략 22일)
  var workDays=22,workMin=workDays*8*60; // 22일 x 8시간 x 60분
  var h='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">';
  if(!equips.length)h+='<div style="text-align:center;padding:40px;color:var(--txt3)">설비 데이터 없음</div>';
  equips.forEach(function(e){
    var dtMin=0;dts.forEach(function(d){if(d.equip===e.nm)dtMin+=d.minutes||0});
    var prodQty=0,prodTime=0;logs.forEach(function(l){prodQty+=l.qty||0;prodTime+=l.time||0});
    var defQty=0;defects.forEach(function(d){defQty+=d.qty||0});
    var availability=workMin>0?((workMin-dtMin)/workMin*100):0;
    var performance=prodTime>0&&workMin>0?(prodTime/(workMin-dtMin)*100):0;
    var quality=prodQty>0?((prodQty-defQty)/prodQty*100):0;
    var oee=availability*performance*quality/10000;
    if(availability>100)availability=100;if(performance>100)performance=100;
    var oeeColor=oee>=85?'#10B981':oee>=60?'#F59E0B':'#EF4444';
    h+='<div class="card" style="padding:16px"><div style="font-weight:700;font-size:15px;margin-bottom:12px">'+e.nm+'</div>';
    h+='<div style="text-align:center;font-size:32px;font-weight:800;color:'+oeeColor+';margin:8px 0">'+oee.toFixed(1)+'%</div>';
    h+='<div style="font-size:11px;text-align:center;color:var(--txt3);margin-bottom:12px">OEE</div>';
    h+='<div style="display:flex;gap:8px;font-size:12px">';
    h+='<div style="flex:1;text-align:center"><div style="font-weight:600">가동률</div><div style="font-size:16px;font-weight:700;color:#1E3A5F">'+availability.toFixed(1)+'%</div></div>';
    h+='<div style="flex:1;text-align:center"><div style="font-weight:600">성능률</div><div style="font-size:16px;font-weight:700;color:#7B61FF">'+performance.toFixed(1)+'%</div></div>';
    h+='<div style="flex:1;text-align:center"><div style="font-weight:600">양품률</div><div style="font-size:16px;font-weight:700;color:#10B981">'+quality.toFixed(1)+'%</div></div>';
    h+='</div></div>';
  });
  h+='</div>';
  $('oeeArea').innerHTML=h;
}

/* ================================================================
   10. 부분출고 / 분할납품
   ================================================================ */
function rShipPartial(){
  var q=($('spSearch').value||'').toLowerCase();
  var orders=DB.g('orders');
  var ships=DB.g('shipLog')||[];
  var h='<table class="dt"><thead><tr><th>수주번호</th><th>거래처</th><th>품목</th><th>수주수량</th><th>출고수량</th><th>잔량</th><th>출고율</th></tr></thead><tbody>';
  var rows=orders.filter(function(o){return!q||(o.no||'').toLowerCase().indexOf(q)>=0||(o.cli||'').toLowerCase().indexOf(q)>=0});
  if(!rows.length)h+='<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';
  rows.forEach(function(o){
    var items=o.items||[];
    var totalOrd=items.reduce(function(s,i){return s+(i.qty||0)},0);
    var shipped=0;
    var linkedWoIds=typeof orderWOIds==='function'?orderWOIds(o):[];
    ships.forEach(function(s){if(s.orderId===o.id||linkedWoIds.indexOf(s.woId)>=0)shipped+=s.qty||0});
    var remain=totalOrd-shipped;if(remain<0)remain=0;
    var rate=totalOrd>0?(shipped/totalOrd*100):0;
    var pnm=items.map(function(i){return i.nm||i.pnm}).join(', ')||'-';
    h+='<tr><td>'+(o.no||'-')+'</td><td>'+(o.cli||'-')+'</td><td>'+pnm+'</td><td>'+fmt(totalOrd)+'</td><td>'+fmt(shipped)+'</td><td style="color:'+(remain>0?'#EF4444':'#10B981')+';font-weight:700">'+fmt(remain)+'</td><td><div class="prog-bar"><div class="prog-fill" style="width:'+Math.min(rate,100)+'%"></div></div> '+rate.toFixed(0)+'%</td></tr>';
  });
  h+='</tbody></table>';
  $('shipPartialArea').innerHTML=h;
}

/* ================================================================
   11. 반품 관리
   ================================================================ */
var _retEdit=null;
function rReturn(){
  var mo=$('retMonth').value||cm();
  var list=DB.g('returns').filter(function(r){return r.dt&&r.dt.slice(0,7)===mo});
  var cnt=list.length,amt=0;
  list.forEach(function(r){amt+=r.qty*(r.price||0)});
  $('retCount').textContent=cnt;
  $('retAmt').textContent=fmt(amt)+'원';
  var tb=$('retTbl').querySelector('tbody');
  if(!list.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';return}
  tb.innerHTML=list.map(function(r){
    return'<tr><td>'+r.dt+'</td><td>'+(r.cli||'-')+'</td><td>'+(r.prod||'-')+'</td><td>'+fmt(r.qty)+'</td><td>'+badge(r.reason)+'</td><td>'+badge(r.action||'미처리')+'</td><td><button class="btn btn-sm btn-d" onclick="delReturn(\''+r.id+'\')">삭제</button></td></tr>'
  }).join('');
}
function openRetM(){_retEdit=null;_cliSelect('retCli');_prodSelect('retProd');$('retQty').value='';$('retNote').value='';oMo('retMo')}
function saveReturn(){
  var rec={id:_retEdit||gid(),dt:td(),cli:$('retCli').value,prod:$('retProd').value,qty:+$('retQty').value||0,reason:$('retReason').value,action:$('retAction').value,note:$('retNote').value};
  var list=DB.g('returns');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('returns',list);cMo('retMo');rReturn();toast('반품 등록','ok');
}
function delReturn(id){if(!confirm('삭제?'))return;DB.s('returns',DB.g('returns').filter(function(x){return x.id!==id}));rReturn()}

/* ================================================================
   12. 출하 검사
   ================================================================ */
var _siEdit=null;
function rShipInspect(){
  var mo=$('siMonth').value||cm();
  var list=DB.g('shipInspect').filter(function(s){return s.dt&&s.dt.slice(0,7)===mo});
  var tb=$('siTbl').querySelector('tbody');
  if(!list.length){tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';return}
  tb.innerHTML=list.map(function(s){
    var rate=s.qty>0?(s.pass/s.qty*100).toFixed(1)+'%':'0%';
    return'<tr><td>'+s.dt+'</td><td>'+(s.woNm||'-')+'</td><td>'+(s.pnm||'-')+'</td><td>'+fmt(s.qty)+'</td><td>'+fmt(s.pass)+'</td><td>'+fmt(s.qty-s.pass)+'</td><td>'+rate+'</td><td>'+badge(s.result)+'</td><td><button class="btn btn-sm btn-d" onclick="delSI(\''+s.id+'\')">삭제</button></td></tr>'
  }).join('');
}
function openSiM(){_siEdit=null;_woSelect('siWO');$('siQty').value='';$('siPass').value='';$('siItems').value='';$('siNote').value='';oMo('siMo')}
function saveShipInspect(){
  var woId=$('siWO').value;var wo=woId?DB.g('wo').find(function(w){return w.id===woId}):null;
  var rec={id:_siEdit||gid(),dt:td(),woId:woId,woNm:wo?wo.wn:'',pnm:wo?wo.pnm:'',qty:+$('siQty').value||0,pass:+$('siPass').value||0,items:$('siItems').value,result:$('siResult').value,note:$('siNote').value};
  var list=DB.g('shipInspect');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('shipInspect',list);cMo('siMo');rShipInspect();toast('출하검사 저장','ok');
}
function delSI(id){if(!confirm('삭제?'))return;DB.s('shipInspect',DB.g('shipInspect').filter(function(x){return x.id!==id}));rShipInspect()}

/* ================================================================
   13. 안전재고 / 발주점 관리
   ================================================================ */
function rSafety(){
  var stock=DB.g('stock');
  var h='<table class="dt"><thead><tr><th>자재명</th><th>규격</th><th>현재고</th><th>안전재고</th><th>발주점</th><th>상태</th><th>설정</th></tr></thead><tbody>';
  if(!stock.length)h+='<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--txt3)">자재 데이터 없음</td></tr>';
  stock.forEach(function(s){
    var cur=s.qty||0,safe=s.safeQty||0,reorder=s.reorder||0;
    var st=cur<=0?'재고없음':cur<=safe?'부족':cur<=reorder?'발주필요':'정상';
    var cls=st==='재고없음'||st==='부족'?'color:#EF4444;font-weight:700':st==='발주필요'?'color:#F59E0B;font-weight:700':'color:#10B981';
    h+='<tr><td style="font-weight:600">'+s.nm+'</td><td>'+(s.spec||'-')+'</td><td>'+fmt(cur)+'</td>';
    h+='<td><input type="number" value="'+safe+'" style="width:70px;padding:4px;border:1px solid var(--bdr);border-radius:4px" onchange="updateSafety(\''+s.id+'\',\'safeQty\',+this.value)"></td>';
    h+='<td><input type="number" value="'+reorder+'" style="width:70px;padding:4px;border:1px solid var(--bdr);border-radius:4px" onchange="updateSafety(\''+s.id+'\',\'reorder\',+this.value)"></td>';
    h+='<td style="'+cls+'">'+st+'</td><td></td></tr>';
  });
  h+='</tbody></table>';
  $('safetyArea').innerHTML=h;
}
function updateSafety(id,field,val){
  var list=DB.g('stock');var s=list.find(function(x){return x.id===id});
  if(s){s[field]=val;DB.s('stock',list);toast('업데이트','ok')}
}

/* ================================================================
   14. MRP (자재소요량 계획)
   ================================================================ */
function rMRP(){
  var mo=$('mrpMonth').value||cm();
  $('mrpArea').innerHTML='<div style="text-align:center;padding:20px;color:var(--txt3)">MRP 실행 버튼을 눌러 자재 소요량을 계산하세요</div>';
}
function runMRP(){
  var mo=$('mrpMonth').value||cm();
  var wos=DB.g('wo').filter(function(w){return w.dt&&w.dt.slice(0,7)===mo&&w.status!=='취소'&&w.status!=='출고완료'});
  var boms=DB.g('bom');
  var stock=DB.g('stock');
  // 품목별 필요수량 집계
  var needs={};
  function matKey(cat,nm,spec){return [cat||'',nm||'',spec||''].join('|')}
  function addNeed(cat,nm,spec,qty){
    var key=matKey(cat,nm,spec);
    if(!needs[key])needs[key]={cat:cat||'',nm:nm||'',spec:spec||'',need:0,stock:0,order:0};
    needs[key].need+=qty||0;
  }
  wos.forEach(function(w){
    var bom=boms.find(function(b){return (b.prod||b.pnm)===w.pnm&&b.cli===w.cnm;})
      ||boms.find(function(b){return (b.prod||b.pnm)===w.pnm&&!b.cli;});
    if(bom&&bom.items){
      bom.items.forEach(function(item){
        addNeed(item.cat||'',item.matNm||item.nm,item.spec||'',(item.qty||1)*(w.fq||0));
      });
    }
    // 용지도 자재로 집계
    if(w.papers){w.papers.forEach(function(p){
      addNeed('종이',p.paper||'용지',p.spec||'',(p.qm||0)+(p.qe||0));
    })}
  });
  // 현재고 매칭
  stock.forEach(function(s){
    var key=matKey(s.cat||'',s.nm||'',s.spec||'');
    if(needs[key])needs[key].stock=s.qty||0;
  });
  var rows=Object.values(needs);
  rows.forEach(function(r){r.order=Math.max(0,r.need-r.stock)});
  var h='<table class="dt"><thead><tr><th>구분</th><th>자재명</th><th>규격</th><th>총소요량</th><th>현재고</th><th>부족량(발주필요)</th><th>상태</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--txt3)">BOM 연동 데이터 없음</td></tr>';
  rows.sort(function(a,b){return b.order-a.order});
  rows.forEach(function(r){
    var st=r.order>0?'발주필요':'충분';
    h+='<tr><td>'+(r.cat||'-')+'</td><td style="font-weight:600">'+r.nm+'</td><td>'+(r.spec||'-')+'</td><td>'+fmt(r.need)+'</td><td>'+fmt(r.stock)+'</td><td style="color:'+(r.order>0?'#EF4444':'#10B981')+';font-weight:700">'+fmt(r.order)+'</td><td>'+badge(st)+'</td></tr>';
  });
  h+='</tbody></table>';
  $('mrpArea').innerHTML=h;
  toast('MRP 산출 완료','ok');
}

/* ================================================================
   15. 재고 실사
   ================================================================ */
function rMatAudit(){
  var audits=DB.g('matAudit');
  var h='<table class="dt"><thead><tr><th>실사일</th><th>실사자</th><th>총 품목수</th><th>차이 품목</th><th>상태</th><th>관리</th></tr></thead><tbody>';
  if(!audits.length)h+='<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--txt3)">실사 내역 없음</td></tr>';
  audits.forEach(function(a){
    var diffCnt=(a.items||[]).filter(function(i){return i.actual!==i.system}).length;
    h+='<tr><td>'+a.dt+'</td><td>'+(a.auditor||'-')+'</td><td>'+(a.items||[]).length+'</td><td style="color:'+(diffCnt>0?'#EF4444':'#10B981')+';font-weight:700">'+diffCnt+'</td><td>'+badge(a.st||'완료')+'</td><td><button class="btn btn-sm btn-o" onclick="viewAuditDetail(\''+a.id+'\')">상세</button></td></tr>';
  });
  h+='</tbody></table>';
  $('matAuditArea').innerHTML=h;
}
function openAuditNew(){
  var stock=DB.g('stock');
  if(!stock.length){toast('자재가 없습니다','err');return}
  var items=stock.map(function(s){return{nm:s.nm,spec:s.spec||'',system:s.qty||0,actual:s.qty||0}});
  var audit={id:gid(),dt:td(),auditor:CU?CU.nm:'',items:items,st:'진행중'};
  var list=DB.g('matAudit');list.push(audit);DB.s('matAudit',list);
  rMatAudit();viewAuditDetail(audit.id);toast('실사 시작','ok');
}
function viewAuditDetail(id){
  var list=DB.g('matAudit');var a=list.find(function(x){return x.id===id});
  if(!a)return;
  var h='<h3 style="margin:12px 0">실사 상세 — '+a.dt+'</h3>';
  h+='<table class="dt"><thead><tr><th>자재명</th><th>규격</th><th>전산재고</th><th>실사재고</th><th>차이</th></tr></thead><tbody>';
  (a.items||[]).forEach(function(item,i){
    var diff=item.actual-item.system;
    h+='<tr><td>'+item.nm+'</td><td>'+(item.spec||'-')+'</td><td>'+fmt(item.system)+'</td>';
    h+='<td><input type="number" value="'+item.actual+'" style="width:80px;padding:4px;border:1px solid var(--bdr);border-radius:4px" onchange="updateAuditItem(\''+id+'\','+i+',+this.value)"></td>';
    h+='<td style="color:'+(diff!==0?'#EF4444':'#10B981')+';font-weight:700">'+(diff>0?'+':'')+diff+'</td></tr>';
  });
  h+='</tbody></table>';
  h+='<div style="margin-top:12px;display:flex;gap:8px"><button class="btn btn-p" onclick="applyAudit(\''+id+'\')">실사 반영 (재고 조정)</button><button class="btn btn-g" onclick="rMatAudit()">목록으로</button></div>';
  $('matAuditArea').innerHTML=h;
}
function updateAuditItem(auditId,idx,val){
  var list=DB.g('matAudit');var a=list.find(function(x){return x.id===auditId});
  if(a&&a.items[idx]){a.items[idx].actual=val;DB.s('matAudit',list)}
}
function applyAudit(id){
  if(!confirm('실사 결과를 재고에 반영하시겠습니까?'))return;
  var list=DB.g('matAudit');var a=list.find(function(x){return x.id===id});if(!a)return;
  var stock=DB.g('stock');
  (a.items||[]).forEach(function(item){
    var s=stock.find(function(x){return x.nm===item.nm});
    if(s)s.qty=item.actual;
  });
  DB.s('stock',stock);
  a.st='완료';DB.s('matAudit',list);
  rMatAudit();toast('재고 조정 완료','ok');
}

/* ================================================================
   16. 구매 단가 이력
   ================================================================ */
function rPriceHist(){
  var q=($('priceSearch').value||'').toLowerCase();
  var incomes=DB.g('income');
  // 자재별 단가 변동 추적
  var priceMap={};
  incomes.forEach(function(i){
    var key=i.matNm||i.nm||'';
    if(!key)return;
    if(q&&key.toLowerCase().indexOf(q)<0)return;
    if(!priceMap[key])priceMap[key]=[];
    priceMap[key].push({dt:i.dt,vendor:i.vendor||'-',price:i.price||0,qty:i.qty||0});
  });
  var h='';
  var keys=Object.keys(priceMap).sort();
  if(!keys.length)h='<div style="text-align:center;padding:40px;color:var(--txt3)">입고 데이터 없음</div>';
  keys.forEach(function(k){
    var items=priceMap[k].sort(function(a,b){return a.dt>b.dt?-1:1});
    var prevPrice=items.length>1?items[1].price:items[0].price;
    var curPrice=items[0].price;
    var change=prevPrice>0?((curPrice-prevPrice)/prevPrice*100).toFixed(1):'0';
    h+='<div class="card" style="padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    h+='<span style="font-weight:700">'+k+'</span>';
    h+='<span style="font-size:13px;color:'+(change>0?'#EF4444':change<0?'#10B981':'var(--txt3)')+';font-weight:600">'+(change>0?'▲':'▼')+change+'%</span>';
    h+='</div><table class="dt" style="font-size:12px"><thead><tr><th>일자</th><th>거래처</th><th>단가</th><th>수량</th></tr></thead><tbody>';
    items.slice(0,5).forEach(function(i){h+='<tr><td>'+i.dt+'</td><td>'+i.vendor+'</td><td>'+fmt(i.price)+'원</td><td>'+fmt(i.qty)+'</td></tr>'});
    h+='</tbody></table></div>';
  });
  $('priceHistArea').innerHTML=h;
}

/* ================================================================
   17. 전자세금계산서
   ================================================================ */
var _etaxEdit=null;
function rEtax(){
  var mo=$('etaxMonth').value||cm();
  var list=DB.g('etax').filter(function(e){return e.dt&&e.dt.slice(0,7)===mo});
  var cnt=list.length,amt=0,pend=0;
  list.forEach(function(e){amt+=e.total||0;if(e.st==='미발행')pend++});
  $('etaxCount').textContent=cnt;
  $('etaxAmt').textContent=fmt(amt)+'원';
  $('etaxPend').textContent=pend;
  var tb=$('etaxTbl').querySelector('tbody');
  if(!list.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';return}
  tb.innerHTML=list.map(function(e){
    return'<tr><td>'+e.dt+'</td><td>'+badge(e.type)+'</td><td>'+(e.cli||'-')+'</td><td>'+fmt(e.supply)+'</td><td>'+fmt(e.vat)+'</td><td style="font-weight:700">'+fmt(e.total)+'</td><td>'+badge(e.st||'발행')+'</td><td><button class="btn btn-sm btn-d" onclick="delEtax(\''+e.id+'\')">삭제</button></td></tr>'
  }).join('');
}
function openEtaxM(){_etaxEdit=null;_cliSelect('etaxCli');$('etaxSupply').value='';$('etaxVat').value='';$('etaxDt').value=td();$('etaxNote').value='';oMo('etaxMo')}
function autoGenEtax(){
  // 매출 데이터 기반 자동 발행
  var mo=$('etaxMonth').value||cm();
  var sales=DB.g('sales')||[];
  var ships=DB.g('shipLog')||[];
  var existing=DB.g('etax');
  var newCount=0;
  // 출고 완료 건 중 세금계산서 미발행 건 자동 생성
  ships.filter(function(s){return s.dt&&s.dt.slice(0,7)===mo}).forEach(function(s){
    var already=existing.some(function(e){return e.shipId===s.id});
    if(already)return;
    /* 매출 레코드 연결: shipId로 매칭 */
    var _matchSale=sales.find(function(sl){return sl.shipId===s.id});
    var supply=_matchSale?_matchSale.amt:(s.amt||s.totalAmt||0);
    var vat=Math.round(supply*(typeof SysCode!=='undefined'?SysCode.vatRate():0.1));
    var _etaxId=gid();
    existing.push({id:_etaxId,shipId:s.id,saleId:_matchSale?_matchSale.id:'',dt:s.dt,type:'매출',cli:s.cnm||'',supply:supply,vat:vat,total:supply+vat,st:'발행',note:'자동발행'});
    /* 매출 레코드에 세금계산서 ID 역참조 */
    if(_matchSale){_matchSale.etaxId=_etaxId;var _sl2=DB.g('sales');var _si2=_sl2.findIndex(function(x){return x.id===_matchSale.id});if(_si2>=0){_sl2[_si2].etaxId=_etaxId;DB.s('sales',_sl2)}}
    newCount++;
  });
  if(newCount>0){DB.s('etax',existing);rEtax();toast(newCount+'건 자동발행','ok')}
  else toast('발행 대상 없음','');
}
function saveEtax(){
  var supply=+$('etaxSupply').value||0;var vat=+$('etaxVat').value||Math.round(supply*(typeof SysCode!=='undefined'?SysCode.vatRate():0.1));
  var rec={id:_etaxEdit||gid(),dt:$('etaxDt').value||td(),type:$('etaxType').value,cli:$('etaxCli').value,supply:supply,vat:vat,total:supply+vat,st:'발행',note:$('etaxNote').value};
  var list=DB.g('etax');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('etax',list);cMo('etaxMo');rEtax();toast('세금계산서 저장','ok');
}
function delEtax(id){if(!confirm('삭제?'))return;DB.s('etax',DB.g('etax').filter(function(x){return x.id!==id}));rEtax()}

/* ================================================================
   18. 원가 분석
   ================================================================ */
function rCosting(){
  var mo=$('costMonth').value||cm();
  var q=($('costSearch').value||'').toLowerCase();
  var wos=DB.g('wo').filter(function(w){return w.dt&&w.dt.slice(0,7)===mo&&(!q||(w.pnm||'').toLowerCase().indexOf(q)>=0)});
  var outsource=DB.g('outsource');
  var procLogs=DB.g('procLog');
  var h='<table class="dt"><thead><tr><th>품목</th><th>거래처</th><th>수량</th><th>자재비</th><th>외주비</th><th>인건비(추정)</th><th>총원가</th><th>단가</th><th>매출단가</th><th>마진</th></tr></thead><tbody>';
  if(!wos.length)h+='<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';
  wos.forEach(function(w){
    var matCost=0;
    if(w.papers)w.papers.forEach(function(p){matCost+=(p.price||0)*(p.qm||0)});
    var osCost=0;outsource.forEach(function(o){if(o.woId===w.id)osCost+=o.amt||0});
    var laborTime=0;procLogs.forEach(function(l){if(l.woId===w.id)laborTime+=l.time||0});
    var laborCost=Math.round(laborTime/60*15000); // 시급 15000원 추정
    var totalCost=matCost+osCost+laborCost;
    var unitCost=w.fq>0?Math.round(totalCost/w.fq):0;
    var salePrice=w.price||0;
    var margin=salePrice>0?((salePrice-unitCost)/salePrice*100).toFixed(1):'-';
    var marginColor=margin!=='-'?(+margin>=20?'#10B981':+margin>=0?'#F59E0B':'#EF4444'):'var(--txt3)';
    h+='<tr><td style="font-weight:700">'+(w.pnm||'-')+'</td><td>'+(w.cnm||'-')+'</td><td>'+fmt(w.fq)+'</td><td>'+fmt(matCost)+'</td><td>'+fmt(osCost)+'</td><td>'+fmt(laborCost)+'</td><td style="font-weight:700">'+fmt(totalCost)+'</td><td>'+fmt(unitCost)+'</td><td>'+fmt(salePrice)+'</td><td style="color:'+marginColor+';font-weight:700">'+(margin!=='-'?margin+'%':'-')+'</td></tr>';
  });
  h+='</tbody></table>';
  $('costingArea').innerHTML=h;
}

/* ================================================================
   19. 채권 Aging 분석
   ================================================================ */
function rAging(){
  var orders=DB.g('orders');
  var ships=DB.g('shipLog')||[];
  var today=new Date(td());
  // 거래처별 미수금 계산
  var aging={};
  orders.forEach(function(o){
    var cname=o.cli||o.cnm||'';
    if(!cname)return;
    var totalAmt=(o.items||[]).reduce(function(s,i){return s+(i.amt||i.qty*i.price||0)},0);
    if(totalAmt<=0)return;
    // 출고일 기준 경과일 계산
    var shipDate=null;
    var linkedWoIds=typeof orderWOIds==='function'?orderWOIds(o):[];
    ships.forEach(function(s){if((s.orderId===o.id||linkedWoIds.indexOf(s.woId)>=0)&&s.dt)shipDate=s.dt});
    if(!shipDate)shipDate=o.dt;
    var days=Math.round((today-new Date(shipDate))/864e5);
    if(days<0)days=0;
    if(!aging[cname])aging[cname]={cli:cname,d30:0,d60:0,d90:0,d90p:0,total:0};
    if(days<=30)aging[cname].d30+=totalAmt;
    else if(days<=60)aging[cname].d60+=totalAmt;
    else if(days<=90)aging[cname].d90+=totalAmt;
    else aging[cname].d90p+=totalAmt;
    aging[cname].total+=totalAmt;
  });
  var rows=Object.values(aging).sort(function(a,b){return b.total-a.total});
  var h='<table class="dt"><thead><tr><th>거래처</th><th>30일 이내</th><th>31~60일</th><th>61~90일</th><th>90일 초과</th><th>합계</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';
  rows.forEach(function(r){
    h+='<tr><td style="font-weight:700">'+r.cli+'</td><td>'+fmt(r.d30)+'</td><td style="color:#F59E0B">'+fmt(r.d60)+'</td><td style="color:#EF4444">'+fmt(r.d90)+'</td><td style="color:#DC2626;font-weight:700">'+fmt(r.d90p)+'</td><td style="font-weight:700">'+fmt(r.total)+'</td></tr>';
  });
  h+='</tbody></table>';
  $('agingArea').innerHTML=h;
}

/* ================================================================
   20. 교대 스케줄
   ================================================================ */
function rShift(){
  var type=+$('shiftType').value||2;
  var emps=DB.g('emp');
  var shifts=DB.g('shifts')||[];
  var days=['월','화','수','목','금','토','일'];
  var shiftNames=type===2?['주간(06-18)','야간(18-06)']:['1조(06-14)','2조(14-22)','3조(22-06)'];
  var h='<table class="dt"><thead><tr><th>직원</th>';
  days.forEach(function(d){h+='<th>'+d+'</th>'});
  h+='</tr></thead><tbody>';
  if(!emps.length)h+='<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--txt3)">직원 데이터 없음</td></tr>';
  emps.forEach(function(e,ei){
    h+='<tr><td style="font-weight:600">'+e.nm+'</td>';
    days.forEach(function(d,di){
      var shift=shifts.find(function(s){return s.empId===e.id&&s.day===di});
      var val=shift?shift.shift:shiftNames[ei%type];
      h+='<td><select style="font-size:11px;padding:2px;border:1px solid var(--bdr);border-radius:4px" onchange="updateShift(\''+e.id+'\','+di+',this.value)">';
      shiftNames.forEach(function(sn){h+='<option value="'+sn+'"'+(val===sn?' selected':'')+'>'+sn+'</option>'});
      h+='<option value="휴무"'+(val==='휴무'?' selected':'')+'>휴무</option>';
      h+='</select></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table>';
  $('shiftArea').innerHTML=h;
}
function updateShift(empId,day,val){
  var list=DB.g('shifts');
  var idx=list.findIndex(function(s){return s.empId===empId&&s.day===day});
  if(idx>=0)list[idx].shift=val;
  else list.push({empId:empId,day:day,shift:val});
  DB.s('shifts',list);
}
function autoGenShift(){
  var type=+$('shiftType').value||2;
  var emps=DB.g('emp');
  var shiftNames=type===2?['주간(06-18)','야간(18-06)']:['1조(06-14)','2조(14-22)','3조(22-06)'];
  var list=[];
  emps.forEach(function(e,ei){
    for(var d=0;d<7;d++){
      if(d>=5&&type===2)list.push({empId:e.id,day:d,shift:'휴무'});
      else list.push({empId:e.id,day:d,shift:shiftNames[ei%type]});
    }
  });
  DB.s('shifts',list);rShift();toast('스케줄 자동 생성','ok');
}

/* ================================================================
   21. 4대보험
   ================================================================ */
function rInsurance(){
  var mo=$('insMonth').value||cm();
  var emps=DB.g('emp');
  var pays=DB.g('pay')||[];
  // 보험요율 (2024 기준 근사치)
  var rates={national:0.045,health:0.03545,longcare:0.1281,employ:0.009,injury:0.007};
  var h='<table class="dt"><thead><tr><th>직원</th><th>급여</th><th>국민연금</th><th>건강보험</th><th>장기요양</th><th>고용보험</th><th>산재보험</th><th>합계</th></tr></thead><tbody>';
  var gTotal={nat:0,hea:0,lon:0,emp:0,inj:0};
  emps.forEach(function(e){
    var pay=pays.find(function(p){return p.empId===e.id&&p.mo===mo});
    var salary=pay?pay.base||pay.salary||0:e.salary||0;
    var nat=Math.round(salary*rates.national);
    var hea=Math.round(salary*rates.health);
    var lon=Math.round(hea*rates.longcare);
    var emp2=Math.round(salary*rates.employ);
    var inj=Math.round(salary*rates.injury);
    gTotal.nat+=nat;gTotal.hea+=hea;gTotal.lon+=lon;gTotal.emp+=emp2;gTotal.inj+=inj;
    h+='<tr><td>'+e.nm+'</td><td>'+fmt(salary)+'</td><td>'+fmt(nat)+'</td><td>'+fmt(hea)+'</td><td>'+fmt(lon)+'</td><td>'+fmt(emp2)+'</td><td>'+fmt(inj)+'</td><td style="font-weight:700">'+fmt(nat+hea+lon+emp2+inj)+'</td></tr>';
  });
  h+='<tr style="font-weight:700;background:var(--bg2)"><td>합계</td><td></td><td>'+fmt(gTotal.nat)+'</td><td>'+fmt(gTotal.hea)+'</td><td>'+fmt(gTotal.lon)+'</td><td>'+fmt(gTotal.emp)+'</td><td>'+fmt(gTotal.inj)+'</td><td>'+fmt(gTotal.nat+gTotal.hea+gTotal.lon+gTotal.emp+gTotal.inj)+'</td></tr>';
  h+='</tbody></table>';
  $('insuranceArea').innerHTML=h;
}

/* ================================================================
   22. 실시간 KPI 대시보드
   ================================================================ */
function rKPI(){
  var today=td(),mo=cm();
  var wos=DB.g('wo');
  var orders=DB.g('orders');
  var ships=DB.g('shipLog')||[];
  var defects=DB.g('defects');
  var procLogs=DB.g('procLog');
  var downtime=DB.g('downtime');
  // KPI 계산
  var monthWOs=wos.filter(function(w){return w.dt&&w.dt.slice(0,7)===mo});
  var monthShips=ships.filter(function(s){return s.dt&&s.dt.slice(0,7)===mo});
  var monthDefects=defects.filter(function(d){return d.dt&&d.dt.slice(0,7)===mo});
  var monthLogs=procLogs.filter(function(l){return l.dt&&l.dt.slice(0,7)===mo});
  var totalProd=monthLogs.reduce(function(s,l){return s+(l.qty||0)},0);
  var totalDefect=monthDefects.reduce(function(s,d){return s+(d.qty||0)},0);
  var defectRate=totalProd>0?(totalDefect/totalProd*100).toFixed(2):'0';
  var monthDt=downtime.filter(function(d){return d.start&&d.start.slice(0,7)===mo});
  var dtMinutes=monthDt.reduce(function(s,d){return s+(d.minutes||0)},0);
  var activeWOs=wos.filter(function(w){return w.status==='진행중'||w.status==='대기'}).length;
  var doneWOs=monthWOs.filter(function(w){return w.status==='완료'||w.status==='출고완료'}).length;
  // 납기 준수율
  var dueTotal=0,dueOntime=0;
  monthShips.forEach(function(s){
    var wo=wos.find(function(w){return w.id===s.woId});
    if(wo&&wo.sd){dueTotal++;if(s.dt<=wo.sd)dueOntime++}
  });
  var ontimeRate=dueTotal>0?(dueOntime/dueTotal*100).toFixed(1):'100';
  // 매출
  var monthSales=monthShips.reduce(function(s,sh){return s+(sh.amt||sh.totalAmt||0)},0);
  var h='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px">';
  var kpis=[
    {label:'금월 생산량',value:fmt(totalProd),color:'#1E3A5F'},
    {label:'활성 작업지시',value:activeWOs,color:'#7B61FF'},
    {label:'금월 완료',value:doneWOs,color:'#10B981'},
    {label:'불량률',value:defectRate+'%',color:+defectRate>3?'#EF4444':'#10B981'},
    {label:'비가동시간',value:Math.round(dtMinutes/60*10)/10+'h',color:dtMinutes>480?'#EF4444':'#F59E0B'},
    {label:'납기 준수율',value:ontimeRate+'%',color:+ontimeRate>=90?'#10B981':'#EF4444'},
    {label:'금월 출고건수',value:monthShips.length,color:'#1E3A5F'},
    {label:'금월 매출',value:fmt(monthSales)+'원',color:'#10B981'}
  ];
  kpis.forEach(function(k){
    h+='<div class="card" style="padding:16px;text-align:center"><div style="font-size:12px;color:var(--txt3);margin-bottom:4px">'+k.label+'</div><div style="font-size:28px;font-weight:800;color:'+k.color+'">'+k.value+'</div></div>';
  });
  h+='</div>';
  $('kpiArea').innerHTML=h;
}

/* ================================================================
   23. 수익성 분석
   ================================================================ */
function rProfit(){
  var mo=$('profitMonth').value||cm();
  var view=$('profitView').value;
  var wos=DB.g('wo').filter(function(w){return w.dt&&w.dt.slice(0,7)===mo});
  var outsource=DB.g('outsource');
  var procLogs=DB.g('procLog');
  var groups={};
  wos.forEach(function(w){
    var key=view==='client'?(w.cnm||'기타'):(w.pnm||'기타');
    if(!groups[key])groups[key]={name:key,revenue:0,matCost:0,osCost:0,laborCost:0,qty:0};
    groups[key].revenue+=(w.price||0)*(w.fq||0);
    groups[key].qty+=w.fq||0;
    if(w.papers)w.papers.forEach(function(p){groups[key].matCost+=(p.price||0)*(p.qm||0)});
    outsource.forEach(function(o){if(o.woId===w.id)groups[key].osCost+=o.amt||0});
    var time=0;procLogs.forEach(function(l){if(l.woId===w.id)time+=l.time||0});
    groups[key].laborCost+=Math.round(time/60*15000);
  });
  var rows=Object.values(groups);
  rows.forEach(function(r){r.totalCost=r.matCost+r.osCost+r.laborCost;r.profit=r.revenue-r.totalCost;r.margin=r.revenue>0?(r.profit/r.revenue*100).toFixed(1):'0'});
  rows.sort(function(a,b){return b.profit-a.profit});
  var h='<table class="dt"><thead><tr><th>'+(view==='client'?'거래처':'제품')+'</th><th>수량</th><th>매출</th><th>자재비</th><th>외주비</th><th>인건비</th><th>총원가</th><th>이익</th><th>마진율</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';
  rows.forEach(function(r){
    var mc=+r.margin>=20?'#10B981':+r.margin>=0?'#F59E0B':'#EF4444';
    h+='<tr><td style="font-weight:700">'+r.name+'</td><td>'+fmt(r.qty)+'</td><td>'+fmt(r.revenue)+'</td><td>'+fmt(r.matCost)+'</td><td>'+fmt(r.osCost)+'</td><td>'+fmt(r.laborCost)+'</td><td>'+fmt(r.totalCost)+'</td><td style="font-weight:700;color:'+(r.profit>=0?'#10B981':'#EF4444')+'">'+fmt(r.profit)+'</td><td style="font-weight:700;color:'+mc+'">'+r.margin+'%</td></tr>';
  });
  h+='</tbody></table>';
  $('profitArea').innerHTML=h;
}

/* ================================================================
   24. 납기 준수율
   ================================================================ */
function rOntime(){
  var mo=$('ontimeMonth').value||cm();
  var wos=DB.g('wo');
  var ships=DB.g('shipLog')||[];
  var monthShips=ships.filter(function(s){return s.dt&&s.dt.slice(0,7)===mo});
  var total=0,ontime=0,late=0;
  var lateList=[];
  monthShips.forEach(function(s){
    var wo=wos.find(function(w){return w.id===s.woId||(w.cnm===s.cnm&&w.pnm===s.pnm)});
    if(!wo||!wo.sd)return;
    total++;
    var diff=Math.round((new Date(s.dt)-new Date(wo.sd))/864e5);
    if(diff<=0)ontime++;
    else{late++;lateList.push({wo:wo,ship:s,delay:diff})}
  });
  var rate=total>0?(ontime/total*100).toFixed(1):'100';
  var rateColor=+rate>=90?'#10B981':+rate>=70?'#F59E0B':'#EF4444';
  var h='<div style="text-align:center;margin:20px 0"><div style="font-size:48px;font-weight:800;color:'+rateColor+'">'+rate+'%</div><div style="color:var(--txt3);margin-top:4px">납기 준수율 ('+ontime+'/'+total+')</div></div>';
  h+='<div style="display:flex;gap:16px;justify-content:center;margin-bottom:20px">';
  h+='<div class="card" style="padding:12px;text-align:center;min-width:100px"><div style="color:#10B981;font-size:24px;font-weight:700">'+ontime+'</div><div style="font-size:12px;color:var(--txt3)">준수</div></div>';
  h+='<div class="card" style="padding:12px;text-align:center;min-width:100px"><div style="color:#EF4444;font-size:24px;font-weight:700">'+late+'</div><div style="font-size:12px;color:var(--txt3)">지연</div></div>';
  h+='</div>';
  if(lateList.length){
    h+='<h4 style="margin:12px 0">지연 상세</h4>';
    h+='<table class="dt"><thead><tr><th>작업번호</th><th>거래처</th><th>품목</th><th>납기일</th><th>출고일</th><th>지연일수</th></tr></thead><tbody>';
    lateList.sort(function(a,b){return b.delay-a.delay}).forEach(function(l){
      h+='<tr><td>'+(l.wo.wn||'-')+'</td><td>'+(l.wo.cnm||'-')+'</td><td>'+(l.wo.pnm||'-')+'</td><td>'+l.wo.sd+'</td><td>'+l.ship.dt+'</td><td style="color:#EF4444;font-weight:700">+'+l.delay+'일</td></tr>';
    });
    h+='</tbody></table>';
  }
  $('ontimeArea').innerHTML=h;
}

/* ================================================================
   25. 클레임 / 고객 불만 관리
   ================================================================ */
var _claimEdit=null;
function rClaims(){
  var mo=$('claimMonth').value||cm();
  var list=DB.g('claims2').filter(function(c){return c.dt&&c.dt.slice(0,7)===mo});
  var open=0,ing=0,done=0;
  list.forEach(function(c){if(c.st==='완료')done++;else if(c.st==='접수')open++;else ing++});
  $('claimOpen').textContent=open;
  $('claimIng').textContent=ing;
  $('claimDone').textContent=done;
  var tb=$('claimTbl').querySelector('tbody');
  if(!list.length){tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';return}
  tb.innerHTML=list.map(function(c){
    return'<tr><td>'+c.dt+'</td><td>'+(c.cli||'-')+'</td><td>'+(c.prod||'-')+'</td><td>'+badge(c.type)+'</td><td>'+(c.desc||'-').substring(0,30)+'</td><td>'+(c.cause||'-')+'</td><td>'+(c.action||'-')+'</td><td>'+badge(c.st)+'</td><td><button class="btn btn-sm btn-o" onclick="editClaim2(\''+c.id+'\')">수정</button> <button class="btn btn-sm btn-d" onclick="delClaim2(\''+c.id+'\')">삭제</button></td></tr>'
  }).join('');
}
function openClaimM(){_claimEdit=null;_cliSelect('claimCli');_prodSelect('claimProd');$('claimDesc').value='';$('claimCause').value='';$('claimAction').value='';$('claimSt').value='접수';oMo('claimMo')}
function editClaim2(id){
  var c=DB.g('claims2').find(function(x){return x.id===id});if(!c)return;
  _claimEdit=id;_cliSelect('claimCli');_prodSelect('claimProd');
  $('claimCli').value=c.cli||'';$('claimProd').value=c.prod||'';$('claimType').value=c.type||'';
  $('claimDesc').value=c.desc||'';$('claimCause').value=c.cause||'';$('claimAction').value=c.action||'';$('claimSt').value=c.st||'접수';
  oMo('claimMo');
}
function saveClaim2(){
  var rec={id:_claimEdit||gid(),dt:td(),cli:$('claimCli').value,prod:$('claimProd').value,type:$('claimType').value,desc:$('claimDesc').value,cause:$('claimCause').value,action:$('claimAction').value,st:$('claimSt').value};
  var list=DB.g('claims2');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0){rec.dt=list[idx].dt;list[idx]=rec}else list.push(rec);
  DB.s('claims2',list);cMo('claimMo');rClaims();toast('클레임 저장','ok');
}
function delClaim2(id){if(!confirm('삭제?'))return;DB.s('claims2',DB.g('claims2').filter(function(x){return x.id!==id}));rClaims()}

/* ================================================================
   26. 예방보전 (PM)
   ================================================================ */
var _pmEdit=null;
function rPM(){
  var eq=$('pmEquip').value;
  var list=DB.g('pm').filter(function(p){return!eq||p.equip===eq});
  var today=td();
  var overdue=0,thisWeek=0,done=0;
  list.forEach(function(p){
    if(!p.nextDt)return;
    var diff=Math.round((new Date(p.nextDt)-new Date(today))/864e5);
    if(diff<0)overdue++;
    else if(diff<=7)thisWeek++;
    if(p.lastDone&&p.lastDone.slice(0,7)===cm())done++;
  });
  $('pmOverdue').textContent=overdue;
  $('pmThisWeek').textContent=thisWeek;
  $('pmDone').textContent=done;
  var tb=$('pmTbl').querySelector('tbody');
  if(!list.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';return}
  tb.innerHTML=list.map(function(p){
    var diff=p.nextDt?Math.round((new Date(p.nextDt)-new Date(today))/864e5):999;
    var stBadge=diff<0?badge('지연'):diff<=7?badge('임박'):badge('정상');
    return'<tr><td>'+(p.equip||'-')+'</td><td>'+(p.item||'-')+'</td><td>'+(p.cycle||'-')+'일</td><td>'+(p.lastDt||'-')+'</td><td>'+(p.nextDt||'-')+'</td><td>'+stBadge+'</td><td><button class="btn btn-sm btn-p" onclick="doPM(\''+p.id+'\')">점검완료</button> <button class="btn btn-sm btn-d" onclick="delPM(\''+p.id+'\')">삭제</button></td></tr>'
  }).join('');
}
function openPmM(){_pmEdit=null;_equipSelect('pmEquipSel');$('pmItem').value='';$('pmLastDt').value=td();$('pmNote').value='';oMo('pmMo')}
function savePM(){
  var equip=$('pmEquipSel').value;if(!equip){toast('설비 선택','err');return}
  var cycle=+$('pmCycle').value||30;var lastDt=$('pmLastDt').value||td();
  var nextDt=addDays(lastDt,cycle);
  var rec={id:_pmEdit||gid(),equip:equip,item:$('pmItem').value,cycle:cycle,lastDt:lastDt,nextDt:nextDt,lastDone:null,note:$('pmNote').value};
  var list=DB.g('pm');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('pm',list);cMo('pmMo');rPM();toast('등록 완료','ok');
}
function doPM(id){
  var list=DB.g('pm');var p=list.find(function(x){return x.id===id});
  if(!p)return;
  p.lastDt=td();p.lastDone=td();p.nextDt=addDays(td(),p.cycle||30);
  DB.s('pm',list);rPM();toast('점검 완료','ok');
}
function delPM(id){if(!confirm('삭제?'))return;DB.s('pm',DB.g('pm').filter(function(x){return x.id!==id}));rPM()}

/* ================================================================
   27. 고장 이력
   ================================================================ */
var _bdEdit=null;
function rBreakdown(){
  var mo=$('bdMonth').value||cm();
  var eq=$('bdEquip').value;
  var list=DB.g('breakdown').filter(function(b){
    if(b.start&&b.start.slice(0,7)!==mo)return false;
    if(eq&&b.equip!==eq)return false;
    return true;
  });
  var tb=$('bdTbl').querySelector('tbody');
  if(!list.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';return}
  tb.innerHTML=list.map(function(b){
    var repairMin=0;
    if(b.start&&b.end)repairMin=Math.round((new Date(b.end)-new Date(b.start))/60000);
    var repairH=repairMin>0?(repairMin/60).toFixed(1)+'h':'-';
    return'<tr><td>'+(b.start||'-')+'</td><td>'+(b.equip||'-')+'</td><td>'+(b.symptom||'-')+'</td><td>'+(b.cause||'-')+'</td><td>'+(b.fix||'-')+'</td><td>'+repairH+'</td><td>'+fmt(b.cost||0)+'원</td><td><button class="btn btn-sm btn-d" onclick="delBD(\''+b.id+'\')">삭제</button></td></tr>'
  }).join('');
}
function openBdM(){_bdEdit=null;_equipSelect('bdEquipSel');$('bdStart').value='';$('bdEnd').value='';$('bdSymptom').value='';$('bdCause').value='';$('bdFix').value='';$('bdCost').value='0';oMo('bdMo')}
function saveBreakdown(){
  var equip=$('bdEquipSel').value;if(!equip){toast('설비 선택','err');return}
  var rec={id:_bdEdit||gid(),equip:equip,start:$('bdStart').value,end:$('bdEnd').value,symptom:$('bdSymptom').value,cause:$('bdCause').value,fix:$('bdFix').value,cost:+$('bdCost').value||0};
  var list=DB.g('breakdown');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('breakdown',list);cMo('bdMo');rBreakdown();toast('고장 등록','ok');
}
function delBD(id){if(!confirm('삭제?'))return;DB.s('breakdown',DB.g('breakdown').filter(function(x){return x.id!==id}));rBreakdown()}

/* ================================================================
   28. 검사 성적서
   ================================================================ */
var _certEdit=null;
function rCert(){
  var mo=$('certMonth').value||cm();
  var list=DB.g('certs').filter(function(c){return c.dt&&c.dt.slice(0,7)===mo});
  var tb=$('certTbl').querySelector('tbody');
  if(!list.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';return}
  tb.innerHTML=list.map(function(c){
    return'<tr><td>'+c.dt+'</td><td>'+(c.woNm||'-')+'</td><td>'+(c.pnm||'-')+'</td><td>'+(c.cnm||'-')+'</td><td>'+(c.items||'').substring(0,40)+'</td><td>'+badge(c.result)+'</td><td><button class="btn btn-sm btn-o" onclick="printCert(\''+c.id+'\')">출력</button> <button class="btn btn-sm btn-d" onclick="delCert(\''+c.id+'\')">삭제</button></td></tr>'
  }).join('');
}
function openCertM(){_certEdit=null;_woSelect('certWO');$('certItems').value='';$('certNote').value='';oMo('certMo')}
function saveCert(){
  var woId=$('certWO').value;var wo=woId?DB.g('wo').find(function(w){return w.id===woId}):null;
  var rec={id:_certEdit||gid(),dt:td(),woId:woId,woNm:wo?wo.wn:'',pnm:wo?wo.pnm:'',cnm:wo?wo.cnm:'',items:$('certItems').value,result:$('certResult').value,note:$('certNote').value};
  var list=DB.g('certs');var idx=list.findIndex(function(x){return x.id===rec.id});
  if(idx>=0)list[idx]=rec;else list.push(rec);
  DB.s('certs',list);cMo('certMo');rCert();toast('성적서 발행','ok');
}
function printCert(id){
  var c=DB.g('certs').find(function(x){return x.id===id});if(!c)return;
  var co=DB.g1('co')||{};
  var w=window.open('','_blank','width=800,height=600');
  w.document.write('<html><head><title>검사성적서</title><style>body{font-family:sans-serif;padding:40px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #333;padding:8px;text-align:left}th{background:#f0f0f0}.header{text-align:center;margin-bottom:30px}.result{font-size:24px;font-weight:bold;text-align:center;margin:20px 0}</style></head><body>');
  w.document.write('<div class="header"><h1>검사 성적서</h1><p>'+(co.nm||'회사명')+'</p></div>');
  w.document.write('<table><tr><th>발행일</th><td>'+c.dt+'</td><th>작업번호</th><td>'+(c.woNm||'-')+'</td></tr>');
  w.document.write('<tr><th>품목</th><td>'+(c.pnm||'-')+'</td><th>거래처</th><td>'+(c.cnm||'-')+'</td></tr></table>');
  w.document.write('<h3>검사 항목</h3><pre style="white-space:pre-wrap;border:1px solid #ccc;padding:12px">'+(c.items||'-')+'</pre>');
  w.document.write('<div class="result">종합판정: <span style="color:'+(c.result==='합격'?'green':'red')+'">'+c.result+'</span></div>');
  w.document.write('<p style="margin-top:40px">비고: '+(c.note||'-')+'</p>');
  w.document.write('</body></html>');
  w.document.close();w.print();
}
function delCert(id){if(!confirm('삭제?'))return;DB.s('certs',DB.g('certs').filter(function(x){return x.id!==id}));rCert()}

/* ================================================================
   29. 권한관리
   ================================================================ */
function rPerm(){
  var users=DB.g('users');
  var allMods=['mes-order','mes-wo','mes-order-track','mes-due','mes-dash','mes-plan','mes-worker','mes-proc-log','mes-lot','mes-downtime','mes-defect','mes-outsource','mes-mold-hist','mes-oee','mes-ship','ship-partial','ship-return','ship-inspect','mat-income','mat-stock','mat-po','mat-bom','mat-safety','mat-mrp','mat-audit','mat-price','acc-sales','acc-purchase','acc-tax','acc-recv','acc-cashflow','acc-closing','acc-etax','acc-costing','acc-aging','hr-emp','hr-att','hr-pay','hr-leave','hr-shift','hr-insurance','biz-trend','biz-rank','biz-cost','biz-kpi','biz-profit','biz-ontime','qc-inspect','qc-equip','qc-claim','qc-pm','qc-breakdown','qc-cert','qc-quote','qc-approval','mes-cli','mes-vendor','mes-prod','mes-mold','adm-perm','adm-backup','adm-audit','adm-code','mes-queue'];
  var modNames={'mes-order':'수주관리','mes-wo':'패키지 작업지시','mes-order-track':'납기추적','mes-due':'납기관리','mes-dash':'생산현황','mes-plan':'생산계획','mes-worker':'현장모니터','mes-proc-log':'공정실적','mes-lot':'로트추적','mes-downtime':'비가동','mes-defect':'불량관리','mes-outsource':'외주관리','mes-mold-hist':'금형이력','mes-oee':'OEE','mes-ship':'출고관리','ship-partial':'부분출고','ship-return':'반품','ship-inspect':'출하검사','mat-income':'원자재입고','mat-stock':'재고현황','mat-po':'구매발주','mat-bom':'BOM/MRP','mat-safety':'안전재고','mat-mrp':'MRP','mat-audit':'재고실사','mat-price':'단가이력','acc-sales':'매출장부','acc-purchase':'매입장부','acc-tax':'세금계산서','acc-recv':'채권관리','acc-cashflow':'자금흐름','acc-closing':'마감','acc-etax':'전자세금계산서','acc-costing':'원가분석','acc-aging':'채권노후화','hr-emp':'직원정보','hr-att':'출퇴근','hr-pay':'급여관리','hr-leave':'연차/휴가','hr-shift':'교대스케줄','hr-insurance':'4대보험','biz-trend':'매출추이','biz-rank':'거래처순위','biz-cost':'원가/이익률','biz-kpi':'실시간KPI','biz-profit':'수익성분석','biz-ontime':'납기준수율','qc-inspect':'품질검사','qc-equip':'설비관리','qc-claim':'클레임','qc-pm':'예방보전','qc-breakdown':'고장이력','qc-cert':'검사성적서','qc-quote':'패키지 견적','qc-approval':'전자결재','mes-cli':'거래처','mes-vendor':'협력사','mes-prod':'품목','mes-mold':'목형','adm-perm':'권한관리','adm-backup':'백업/복원','adm-audit':'감사로그','adm-code':'공통코드','mes-queue':'설정'};
  var h='<div style="overflow-x:auto"><table class="dt" style="font-size:11px"><thead><tr><th>사용자</th><th>역할</th>';
  allMods.forEach(function(m){h+='<th style="writing-mode:vertical-rl;text-orientation:mixed;padding:4px 2px;font-size:10px">'+(modNames[m]||m)+'</th>'});
  h+='</tr></thead><tbody>';
  users.forEach(function(u){
    var perms=u.perms||allMods;
    h+='<tr><td>'+u.nm+'</td><td>'+(u.role||'-')+'</td>';
    allMods.forEach(function(m){
      var checked=u.role==='admin'||perms.indexOf(m)>=0;
      h+='<td style="text-align:center"><input type="checkbox" '+(checked?'checked':'')+(u.role==='admin'?' disabled':'')+' onchange="togglePerm(\''+u.id+'\',\''+m+'\',this.checked)"></td>';
    });
    h+='</tr>';
  });
  h+='</tbody></table></div>';
  $('permArea').innerHTML=h;
}
function togglePerm(userId,mod,checked){
  var users=DB.g('users');var u=users.find(function(x){return x.id===userId});
  if(!u)return;
  if(!u.perms)u.perms=[];
  if(checked){if(u.perms.indexOf(mod)<0)u.perms.push(mod)}
  else{u.perms=u.perms.filter(function(m){return m!==mod})}
  DB.s('users',users);toast('권한 업데이트','ok');
}

/* ================================================================
   30. 백업/복원
   ================================================================ */
function rBackup(){
  authFetch('/api/backups').then(function(r){return r.json()}).then(function(files){
    var h='<table class="dt"><thead><tr><th>파일명</th><th>관리</th></tr></thead><tbody>';
    if(!files||!files.length)h+='<tr><td colspan="2" style="text-align:center;padding:20px;color:var(--txt3)">백업 없음</td></tr>';
    (files||[]).forEach(function(f){
      h+='<tr><td>'+f+'</td><td><button class="btn btn-sm btn-o" onclick="restoreBackup(\''+f+'\')">복원</button></td></tr>';
    });
    h+='</tbody></table>';
    $('backupArea').innerHTML=h;
  }).catch(function(){
    $('backupArea').innerHTML='<div style="text-align:center;padding:20px;color:var(--txt3)">서버 연결 불가</div>';
  });
}
function doBackupNow(){
  authFetch('/api/backups/now',{method:'POST'}).then(function(r){return r.json()}).then(function(){rBackup();toast('백업 완료','ok')}).catch(function(){toast('백업 실패','err')});
}
function downloadBackup(){
  authFetch('/api/backup').then(function(r){return r.blob()}).then(function(blob){
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mes_backup_'+td()+'.json';a.click();toast('다운로드 시작','ok');
  }).catch(function(){toast('다운로드 실패','err')});
}
function restoreBackup(f){
  if(!confirm(f+' 백업을 복원하시겠습니까?\n현재 데이터가 덮어쓰기됩니다.'))return;
  authFetch('/api/backups/restore/'+encodeURIComponent(f),{method:'POST'}).then(function(r){return r.json()}).then(function(){toast('복원 완료 — 새로고침합니다','ok');setTimeout(function(){location.reload()},1500)}).catch(function(){toast('복원 실패','err')});
}

/* ================================================================
   30-1. 인쇄 양식 — 거래명세서 / 작업지시서 / 견적서
   ================================================================ */
function _printStyle(){
  return 'body{font-family:"Malgun Gothic",sans-serif;padding:30px 40px;color:#222;font-size:13px;line-height:1.6}'
  +'table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #555;padding:6px 8px;text-align:left}'
  +'th{background:#f0f0f0;font-weight:700;font-size:12px}td{font-size:12px}'
  +'.hdr{text-align:center;margin-bottom:20px;border-bottom:3px double #333;padding-bottom:14px}'
  +'.hdr h1{font-size:22px;font-weight:900;letter-spacing:2px;margin:0 0 6px}'
  +'.hdr .co{font-size:14px;color:#555}'
  +'.hdr .dt{font-size:11px;color:#999;margin-top:4px}'
  +'.sig{display:flex;justify-content:flex-end;gap:40px;margin-top:40px}'
  +'.sig-box{text-align:center;width:120px}'
  +'.sig-box .label{font-size:11px;color:#888;margin-bottom:4px}'
  +'.sig-box .line{border-bottom:1px solid #333;height:50px}'
  +'.total{text-align:right;font-size:15px;font-weight:900;margin:16px 0}'
  +'.note{margin-top:20px;padding:10px;background:#fafafa;border:1px solid #ddd;border-radius:4px;font-size:12px}'
  +'@page{margin:15mm 12mm}'
  +'.footer{position:fixed;bottom:10mm;left:0;right:0;text-align:center;font-size:9px;color:#aaa}';
}
function _openPW(title,html){
  var w=window.open('','_blank','width=800,height=900');
  if(!w){
    // 팝업 차단 시 iframe 모달로 대체
    var pm=document.getElementById('printMo');
    if(!pm){pm=document.createElement('div');pm.id='printMo';pm.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center';pm.onclick=function(e){if(e.target===pm)pm.remove()};document.body.appendChild(pm)}
    pm.innerHTML='<div style="background:#fff;width:90vw;height:90vh;border-radius:12px;overflow:hidden;display:flex;flex-direction:column"><div style="padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd"><span style="font-weight:700">'+title+'</span><div style="display:flex;gap:8px"><button onclick="document.getElementById(\'pfIframe\').contentWindow.print()" style="padding:8px 20px;background:#1E3A5F;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer">인쇄</button><button onclick="document.getElementById(\'printMo\').remove()" style="padding:8px 16px;background:#E2E8F0;border:none;border-radius:8px;cursor:pointer">닫기</button></div></div><iframe id="pfIframe" style="flex:1;border:none"></iframe></div>';
    var pf=document.getElementById('pfIframe');
    pf.contentDocument.write('<html><head><title>'+title+'</title><style>'+_printStyle()+'</style></head><body>'+html+'</body></html>');
    pf.contentDocument.close();
    return;
  }
  w.document.write('<html><head><title>'+title+'</title><style>'+_printStyle()+'</style></head><body>'+html+'</body></html>');
  w.document.close();
  setTimeout(function(){w.print()},300);
}
function _co(){return DB.g1('co')||{nm:'InnoPackage',addr:'',tel:'',fax:''}}

/* 거래명세서 — 출고 기록 기반 (양식 3종) */
function printTransStatement(shipId,format){
  var logs=DB.g('shipLog');var s=logs.find(function(x){return x.id===shipId});
  if(!s){toast('출고 데이터 없음','err');return}
  if(!format){_showFormatPicker(shipId);return}
  var co=_co();var wo=DB.g('wo').find(function(w){return w.id===s.woId})||{};
  var prod=DB.g('prod').find(function(p){return p.nm===s.pnm})||{};
  var price=prod.price||0;var amt=price*(s.good||s.qty||0);
  var vr=typeof SysCode!=='undefined'?SysCode.vatRate():0.1;
  var vat=Math.round(amt*vr);
  var h='';
  if(format==='2'){h=_tradeFormat2(co,s,wo,prod,price,amt,vat)}
  else if(format==='3'){h=_tradeFormat3(co,s,wo,prod,price,amt,vat)}
  else{h=_tradeFormat1(co,s,wo,prod,price,amt,vat)}
  _openPW('거래명세서',h);
}
function _showFormatPicker(shipId){
  var h='<div class="mo-bg" id="fmtPickMo" onclick="if(event.target===this)this.remove()">';
  h+='<div class="mo" style="width:400px"><div class="mo-h">거래명세서 양식 선택<span class="mo-x" onclick="document.getElementById(\'fmtPickMo\').remove()">✕</span></div>';
  h+='<div class="mo-b" style="padding:16px;display:flex;flex-direction:column;gap:10px">';
  h+='<button class="btn btn-p" style="padding:12px" onclick="document.getElementById(\'fmtPickMo\').remove();printTransStatement(\''+shipId+'\',\'1\')">양식 1 — 기본형</button>';
  h+='<button class="btn btn-o" style="padding:12px" onclick="document.getElementById(\'fmtPickMo\').remove();printTransStatement(\''+shipId+'\',\'2\')">양식 2 — 컬러 헤더형</button>';
  h+='<button class="btn btn-s" style="padding:12px" onclick="document.getElementById(\'fmtPickMo\').remove();printTransStatement(\''+shipId+'\',\'3\')">양식 3 — 상세형 (결제/배송 포함)</button>';
  h+='</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}
function _tradeFormat1(co,s,wo,prod,price,amt,vat){
  var h='<div class="hdr"><h1>거 래 명 세 서</h1><div class="co">'+co.nm+'</div><div class="dt">발행일: '+s.dt+'</div></div>';
  h+='<table><tr><th style="width:90px">거래처</th><td colspan="3">'+(s.cnm||'-')+'</td></tr>';
  h+='<tr><th>주소</th><td colspan="3">'+(co.addr||'-')+'</td></tr>';
  h+='<tr><th>전화</th><td>'+(co.tel||'-')+'</td><th style="width:90px">팩스</th><td>'+(co.fax||'-')+'</td></tr></table>';
  h+='<table><thead><tr><th>품명</th><th>규격</th><th>수량</th><th>단가</th><th>공급가액</th><th>세액</th></tr></thead><tbody>';
  h+='<tr><td>'+(s.pnm||'-')+'</td><td>'+(wo.spec||'-')+'</td><td style="text-align:right">'+(s.good||s.qty||0).toLocaleString()+'</td>';
  h+='<td style="text-align:right">'+price.toLocaleString()+'</td><td style="text-align:right">'+amt.toLocaleString()+'</td><td style="text-align:right">'+vat.toLocaleString()+'</td></tr>';
  h+='</tbody></table>';
  h+='<div class="total">합계: ₩ '+(amt+vat).toLocaleString()+'</div>';
  h+='<table><tr><th style="width:90px">운송</th><td>'+(s.car||'-')+'</td><th style="width:90px">기사</th><td>'+(s.driver||'-')+'</td></tr>';
  h+='<tr><th>비고</th><td colspan="3">'+(s.memo||'-')+'</td></tr></table>';
  h+='<div class="sig"><div class="sig-box"><div class="label">공급자</div><div class="line"></div><div style="font-size:11px;margin-top:4px">(인)</div></div>';
  h+='<div class="sig-box"><div class="label">공급받는자</div><div class="line"></div><div style="font-size:11px;margin-top:4px">(인)</div></div></div>';
  h+='<div class="footer">'+co.nm+' · '+co.tel+'</div>';
  return h;
}
function _tradeFormat2(co,s,wo,prod,price,amt,vat){
  var h='<div style="background:linear-gradient(135deg,#1E3A5F,#3B82F6);color:#fff;padding:24px 30px;margin:-30px -40px 20px;display:flex;justify-content:space-between;align-items:center">';
  h+='<div><div style="font-size:24px;font-weight:900;letter-spacing:2px">거래명세서</div><div style="font-size:12px;opacity:0.8;margin-top:4px">'+co.nm+'</div></div>';
  h+='<div style="text-align:right"><div style="font-size:11px;opacity:0.7">발행일</div><div style="font-size:16px;font-weight:700">'+s.dt+'</div></div></div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">';
  h+='<div style="padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px"><div style="font-size:10px;color:#64748B;margin-bottom:4px">공급자</div><div style="font-weight:700">'+co.nm+'</div><div style="font-size:11px;color:#64748B">'+(co.addr||'')+'</div><div style="font-size:11px;color:#64748B">'+(co.tel||'')+'</div></div>';
  h+='<div style="padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px"><div style="font-size:10px;color:#64748B;margin-bottom:4px">공급받는자</div><div style="font-weight:700">'+(s.cnm||'-')+'</div></div></div>';
  h+='<table style="border:none"><thead><tr style="background:#1E3A5F;color:#fff"><th style="border-color:#1E3A5F;padding:10px">품명</th><th style="border-color:#1E3A5F">규격</th><th style="border-color:#1E3A5F">수량</th><th style="border-color:#1E3A5F">단가</th><th style="border-color:#1E3A5F">공급가액</th><th style="border-color:#1E3A5F">세액</th></tr></thead><tbody>';
  h+='<tr><td>'+(s.pnm||'-')+'</td><td>'+(wo.spec||'-')+'</td><td style="text-align:right">'+(s.good||s.qty||0).toLocaleString()+'</td>';
  h+='<td style="text-align:right">'+price.toLocaleString()+'</td><td style="text-align:right">'+amt.toLocaleString()+'</td><td style="text-align:right">'+vat.toLocaleString()+'</td></tr>';
  h+='</tbody></table>';
  h+='<div style="display:flex;justify-content:flex-end;gap:20px;margin:16px 0;padding:16px;background:#F0F9FF;border-radius:8px">';
  h+='<div><span style="color:#64748B;font-size:12px">공급가액</span> <span style="font-weight:700">₩'+amt.toLocaleString()+'</span></div>';
  h+='<div><span style="color:#64748B;font-size:12px">세액</span> <span style="font-weight:700">₩'+vat.toLocaleString()+'</span></div>';
  h+='<div><span style="color:#1E40AF;font-size:14px;font-weight:900">합계 ₩'+(amt+vat).toLocaleString()+'</span></div></div>';
  h+='<div class="footer" style="position:fixed;bottom:10mm;left:0;right:0;text-align:center;font-size:9px;color:#94A3B8">'+co.nm+' · '+co.tel+'</div>';
  return h;
}
function _tradeFormat3(co,s,wo,prod,price,amt,vat){
  var cli=DB.g('client').find(function(c){return c.nm===s.cnm})||{};
  var h='<div class="hdr"><h1>거 래 명 세 서</h1><div style="font-size:11px;color:#999">(상세형)</div><div class="co">'+co.nm+'</div><div class="dt">발행일: '+s.dt+'</div></div>';
  h+='<table><tr><th style="width:100px" rowspan="3">공급자</th><th style="width:80px">상호</th><td>'+co.nm+'</td><th style="width:80px">대표자</th><td></td></tr>';
  h+='<tr><th>주소</th><td colspan="3">'+(co.addr||'-')+'</td></tr>';
  h+='<tr><th>전화</th><td>'+(co.tel||'-')+'</td><th>팩스</th><td>'+(co.fax||'-')+'</td></tr></table>';
  h+='<table><tr><th style="width:100px" rowspan="3">공급받는자</th><th style="width:80px">상호</th><td>'+(s.cnm||'-')+'</td><th style="width:80px">대표자</th><td>'+(cli.ceo||'-')+'</td></tr>';
  h+='<tr><th>주소</th><td colspan="3">'+(cli.addr||'-')+'</td></tr>';
  h+='<tr><th>전화</th><td>'+(cli.tel||'-')+'</td><th>팩스</th><td>'+(cli.fax||'-')+'</td></tr></table>';
  h+='<table><thead><tr><th>No</th><th>품명</th><th>규격</th><th>수량</th><th>단가</th><th>공급가액</th><th>세액</th><th>합계</th></tr></thead><tbody>';
  h+='<tr><td>1</td><td>'+(s.pnm||'-')+'</td><td>'+(wo.spec||'-')+'</td><td style="text-align:right">'+(s.good||s.qty||0).toLocaleString()+'</td>';
  h+='<td style="text-align:right">'+price.toLocaleString()+'</td><td style="text-align:right">'+amt.toLocaleString()+'</td><td style="text-align:right">'+vat.toLocaleString()+'</td><td style="text-align:right;font-weight:700">'+(amt+vat).toLocaleString()+'</td></tr>';
  h+='</tbody></table>';
  h+='<div class="total">공급가액: ₩'+amt.toLocaleString()+' | 세액: ₩'+vat.toLocaleString()+' | 합계: ₩'+(amt+vat).toLocaleString()+'</div>';
  h+='<table><tr><th style="width:100px">결제조건</th><td>'+(cli.payMethod||cli.pay||'확인 후 결제')+'</td><th style="width:100px">결제예정일</th><td></td></tr>';
  h+='<tr><th>배송방법</th><td>'+(s.car?'차량 ('+s.car+')':'직접배송')+'</td><th>입고처</th><td>'+(s.dlv||wo.dlv||'-')+'</td></tr>';
  h+='<tr><th>운송기사</th><td>'+(s.driver||'-')+'</td><th>연락처</th><td></td></tr>';
  h+='<tr><th>비고</th><td colspan="3">'+(s.memo||'-')+'</td></tr></table>';
  h+='<div class="sig"><div class="sig-box"><div class="label">공급자</div><div class="line"></div><div style="font-size:11px;margin-top:4px">(인)</div></div>';
  h+='<div class="sig-box"><div class="label">공급받는자</div><div class="line"></div><div style="font-size:11px;margin-top:4px">(인)</div></div></div>';
  h+='<div class="footer">'+co.nm+' · '+co.tel+' · '+(co.addr||'')+'</div>';
  return h;
}

/* 작업지시서 인쇄 */
function printWorkOrder(woId){
  var wo=DB.g('wo').find(function(w){return w.id===woId});
  if(!wo){toast('패키지 작업지시 없음','err');return}
  var co=_co();
  var h='<div class="hdr"><h1>작 업 지 시 서</h1><div class="co">'+co.nm+'</div><div class="dt">발행일: '+(wo.dt||td())+'</div></div>';
  h+='<table><tr><th style="width:90px">지시번호</th><td>'+(wo.wn||'-')+'</td><th style="width:90px">상태</th><td>'+(wo.status||'-')+'</td></tr>';
  h+='<tr><th>거래처</th><td>'+(wo.cnm||'-')+'</td><th>납기일</th><td>'+(wo.sd||'-')+'</td></tr>';
  h+='<tr><th>품명</th><td>'+(wo.pnm||'-')+'</td><th>규격</th><td>'+(wo.spec||'-')+'</td></tr>';
  h+='<tr><th>지시수량</th><td style="font-weight:700;font-size:15px">'+(wo.fq||0).toLocaleString()+' 매</td><th>납품방법</th><td>'+(wo.dlv||'-')+'</td></tr></table>';
  // 공정표
  if(wo.procs&&wo.procs.length){
    h+='<h3 style="margin:20px 0 8px;font-size:14px">공정 상세</h3>';
    h+='<table><thead><tr><th>순서</th><th>공정명</th><th>유형</th><th>재료/방식</th><th>외주처</th><th>상태</th><th>수량</th></tr></thead><tbody>';
    wo.procs.forEach(function(p,i){
      h+='<tr><td style="text-align:center">'+(i+1)+'</td><td>'+p.nm+'</td><td>'+(p.tp==='out'?'외주':'내부')+'</td>';
      h+='<td>'+(p.mt||'-')+'</td><td>'+(p.vd||'-')+'</td><td>'+p.st+'</td><td style="text-align:right">'+(p.qty||0).toLocaleString()+'</td></tr>';
    });
    h+='</tbody></table>';
  }
  if(wo.note)h+='<div class="note"><b>비고:</b> '+wo.note+'</div>';
  h+='<div class="sig"><div class="sig-box"><div class="label">지시자</div><div class="line"></div></div>';
  h+='<div class="sig-box"><div class="label">확인자</div><div class="line"></div></div></div>';
  h+='<div class="footer">'+co.nm+' · 패키지 작업지시서</div>';
  _openPW('패키지 작업지시서 - '+wo.wn,h);
}

/* 견적서 인쇄 */
function printQuote(quoteId){
  var quotes=DB.g('quotes');var q=quotes.find(function(x){return x.id===quoteId});
  if(!q){toast('패키지 견적 없음','err');return}
  var co=_co();
  var h='<div class="hdr"><h1>견 적 서</h1><div class="co">'+co.nm+'</div><div class="dt">견적일: '+(q.dt||td())+'</div></div>';
  h+='<table><tr><th style="width:90px">견적번호</th><td>'+(q.num||q.no||q.id.slice(-6).toUpperCase())+'</td><th style="width:90px">유효기간</th><td>'+(q.valid||'발행일로부터 30일')+'</td></tr>';
  h+='<tr><th>거래처</th><td colspan="3">'+(q.cnm||q.cli||'-')+'</td></tr>';
  h+='<tr><th>담당자</th><td>'+(q.mgr||'-')+'</td><th>연락처</th><td>'+(q.tel||'-')+'</td></tr></table>';
  // 항목
  var items=q.items||[];var total=0;
  if(items.length){
    h+='<table><thead><tr><th>No</th><th>품명</th><th>규격</th><th>수량</th><th>단가</th><th>금액</th></tr></thead><tbody>';
    items.forEach(function(it,i){
      var amt=(it.qty||0)*(it.price||0);total+=amt;
      h+='<tr><td style="text-align:center">'+(i+1)+'</td><td>'+it.nm+'</td><td>'+(it.spec||'-')+'</td>';
      h+='<td style="text-align:right">'+(it.qty||0).toLocaleString()+'</td><td style="text-align:right">'+(it.price||0).toLocaleString()+'</td><td style="text-align:right">'+amt.toLocaleString()+'</td></tr>';
    });
    h+='</tbody></table>';
  } else {
    // 단일 품목
    var amt2=(q.qty||0)*(q.price||0);total=amt2;
    h+='<table><thead><tr><th>품명</th><th>규격</th><th>수량</th><th>단가</th><th>금액</th></tr></thead><tbody>';
    h+='<tr><td>'+(q.pnm||q.prod||'-')+'</td><td>'+(q.spec||'-')+'</td><td style="text-align:right">'+(q.qty||0).toLocaleString()+'</td>';
    h+='<td style="text-align:right">'+(q.price||0).toLocaleString()+'</td><td style="text-align:right">'+amt2.toLocaleString()+'</td></tr>';
    h+='</tbody></table>';
  }
  var vat=Math.round(total*(typeof SysCode!=='undefined'?SysCode.vatRate():0.1));
  h+='<div class="total">공급가액: ₩ '+total.toLocaleString()+' &nbsp;|&nbsp; 부가세: ₩ '+vat.toLocaleString()+' &nbsp;|&nbsp; <span style="color:#E53E3E">합계: ₩ '+(total+vat).toLocaleString()+'</span></div>';
  if(q.note)h+='<div class="note"><b>비고:</b> '+q.note+'</div>';
  h+='<div style="margin-top:30px;font-size:12px;color:#666;text-align:center">위 금액으로 견적을 제출합니다.</div>';
  h+='<div class="sig"><div class="sig-box"><div class="label">공급자</div><div class="line"></div><div style="font-size:11px;margin-top:4px">'+co.nm+'</div></div></div>';
  h+='<div class="footer">'+co.nm+' · '+(co.tel||'')+'</div>';
  _openPW('패키지 견적서',h);
}

/* ================================================================
   31. 감사 로그
   ================================================================ */
function rAuditLog(){
  var from=$('auditFrom').value||addDays(td(),-30);
  var to=$('auditTo').value||td();
  var user=($('auditUser').value||'').toLowerCase();
  authFetch('/api/audit-logs?from_dt='+from+'&to_dt='+to+(user?'&user_id='+user:'')+'&limit=100').then(function(r){return r.json()}).then(function(data){
    var logs=data.logs||[];
    var h='<table class="dt"><thead><tr><th>시각</th><th>사용자</th><th>액션</th><th>대상</th><th>상세</th></tr></thead><tbody>';
    if(!logs.length)h+='<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--txt3)">로그 없음</td></tr>';
    logs.forEach(function(l){
      h+='<tr><td style="font-size:11px">'+(l.ts||l.timestamp||'-')+'</td><td>'+(l.user_id||'-')+'</td><td>'+badge(l.action||'-')+'</td><td>'+(l.target||'-')+'</td><td style="font-size:11px;max-width:300px;overflow:hidden;text-overflow:ellipsis">'+(l.detail||'-')+'</td></tr>';
    });
    h+='</tbody></table>';
    $('auditLogArea').innerHTML=h;
  }).catch(function(){
    $('auditLogArea').innerHTML='<div style="text-align:center;padding:20px;color:var(--txt3)">서버 연결 불가</div>';
  });
}

/* ================================================================
   32. 공통코드 관리 (SysCode 기반)
   ================================================================ */
var _selCatId=null;
function rCodes(){
  _renderCatList();
  if(_selCatId)_renderCodeItems(_selCatId);
  else{$('codeItemList').innerHTML='<div style="text-align:center;padding:40px;color:var(--txt3)">좌측에서 카테고리를 선택하세요</div>';$('codeListTitle').textContent='카테고리를 선택하세요';$('btnAddCode').style.display='none'}
}
function _renderCatList(){
  var cats=SysCode.cats();
  var h='';
  cats.forEach(function(c){
    var sel=_selCatId===c.id;
    var cnt=SysCode.allItems(c.id).length;
    h+='<div onclick="selectCat(\''+c.id+'\')" style="padding:10px 12px;border-radius:8px;cursor:pointer;margin-bottom:4px;display:flex;justify-content:space-between;align-items:center;'+(sel?'background:var(--pri);color:#fff':'background:var(--bg2);color:var(--txt)')+'">';
    h+='<div><div style="font-weight:600;font-size:13px">'+c.name+'</div><div style="font-size:11px;opacity:0.7">'+c.id+'</div></div>';
    h+='<div style="display:flex;align-items:center;gap:6px"><span style="font-size:11px;padding:2px 6px;border-radius:10px;'+(sel?'background:rgba(255,255,255,0.2)':'background:var(--bg3)')+'">'+cnt+'</span>';
    if(c.is_system)h+='<span style="font-size:10px;padding:1px 5px;border-radius:4px;background:#F59E0B;color:#fff">시스템</span>';
    else h+='<button class="btn btn-sm btn-d" onclick="event.stopPropagation();delCat(\''+c.id+'\')" style="padding:2px 6px;font-size:10px">삭제</button>';
    h+='</div></div>';
  });
  $('codeCatList').innerHTML=h||'<div style="text-align:center;padding:20px;color:var(--txt3)">카테고리 없음</div>';
}
function selectCat(catId){_selCatId=catId;rCodes()}
function _renderCodeItems(catId){
  var cat=SysCode.cats().find(function(c){return c.id===catId});
  if(!cat){_selCatId=null;rCodes();return}
  $('codeListTitle').textContent=cat.name+' ('+catId+')';
  $('btnAddCode').style.display='';
  var items=SysCode.allItems(catId);
  if(!items.length){$('codeItemList').innerHTML='<div style="text-align:center;padding:40px;color:var(--txt3)">등록된 코드가 없습니다</div>';return}
  var h='<table class="dt"><thead><tr><th style="width:50px">순서</th><th>코드</th><th>표시명</th><th>값</th><th>색상</th><th>기본</th><th>활성</th><th style="width:120px">관리</th></tr></thead><tbody>';
  items.forEach(function(it,i){
    var colorPreview=it.color?(it.color.indexOf('bd-')===0?'<span class="bd '+it.color+'">'+it.name+'</span>':'<span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:'+it.color+';vertical-align:middle"></span>'):'<span style="color:var(--txt4)">-</span>';
    h+='<tr style="'+(it.is_active===0?'opacity:0.4':'')+'">';
    h+='<td><button class="btn btn-sm btn-o" onclick="moveCode(\''+it.id+'\',-1)" style="padding:1px 4px"'+(i===0?' disabled':'')+'>▲</button> '+(i+1)+' <button class="btn btn-sm btn-o" onclick="moveCode(\''+it.id+'\',1)" style="padding:1px 4px"'+(i===items.length-1?' disabled':'')+'>▼</button></td>';
    h+='<td style="font-family:monospace;font-weight:600">'+it.code+'</td>';
    h+='<td>'+it.name+'</td>';
    h+='<td style="font-size:12px;color:var(--txt3)">'+(it.value||'-')+'</td>';
    h+='<td>'+colorPreview+'</td>';
    h+='<td>'+(it.is_default?'<span style="color:#10B981;font-weight:700">●</span>':'')+'</td>';
    h+='<td><button class="btn btn-sm '+(it.is_active!==0?'btn-s':'btn-o')+'" onclick="toggleCodeActive(\''+it.id+'\')" style="padding:2px 8px;font-size:11px">'+(it.is_active!==0?'활성':'비활성')+'</button></td>';
    h+='<td><button class="btn btn-sm btn-o" onclick="editCode(\''+it.id+'\')">수정</button> <button class="btn btn-sm btn-d" onclick="delCode(\''+it.id+'\')">삭제</button></td>';
    h+='</tr>';
  });
  h+='</tbody></table>';
  $('codeItemList').innerHTML=h;
}
function openCatAddM(){
  var id=prompt('카테고리 ID (영문 대문자, 예: MY_CODES):');
  if(!id||!id.trim())return;
  id=id.trim().toUpperCase().replace(/[^A-Z0-9_]/g,'');
  if(!id){toast('영문/숫자/_ 만 사용 가능','err');return}
  var cats=SysCode.cats();
  if(cats.find(function(c){return c.id===id})){toast('이미 존재하는 ID','err');return}
  var name=prompt('카테고리명:');
  if(!name||!name.trim())return;
  cats.push({id:id,name:name.trim(),description:'',is_system:0,ord:cats.length+1});
  SysCode.saveCats(cats);rCodes();toast(name+' 카테고리 추가','ok');
}
function delCat(catId){
  var cat=SysCode.cats().find(function(c){return c.id===catId});
  if(!cat)return;
  if(cat.is_system){toast('시스템 카테고리는 삭제 불가','err');return}
  if(!confirm('"'+cat.name+'" 카테고리와 하위 코드를 모두 삭제하시겠습니까?'))return;
  var cats=SysCode.cats().filter(function(c){return c.id!==catId});
  var items=DB.g(SysCode._ITEMS_KEY).filter(function(x){return x.category_id!==catId});
  SysCode.saveCats(cats);SysCode.saveItems(items);
  if(_selCatId===catId)_selCatId=null;
  rCodes();toast(cat.name+' 삭제','ok');
}
function openCodeAddM(){
  if(!_selCatId){toast('카테고리를 선택하세요','err');return}
  _showCodeModal(null);
}
function editCode(codeId){
  var item=DB.g(SysCode._ITEMS_KEY).find(function(x){return x.id===codeId});
  if(!item)return;
  _showCodeModal(item);
}
function _showCodeModal(item){
  var isEdit=!!item;
  var h='<div class="mo-bg" id="codeEditMo" onclick="if(event.target===this)this.remove()">';
  h+='<div class="mo" style="width:420px"><div class="mo-h">'+(isEdit?'코드 수정':'코드 추가')+'<span class="mo-x" onclick="document.getElementById(\'codeEditMo\').remove()">✕</span></div>';
  h+='<div class="mo-b" style="padding:16px;display:flex;flex-direction:column;gap:12px">';
  h+='<div><label style="font-size:12px;font-weight:600;margin-bottom:4px;display:block">코드값</label><input id="ceCode" value="'+(item?item.code:'')+'" style="width:100%;padding:8px;border:1px solid var(--bdr);border-radius:6px" '+(isEdit?'readonly style="background:var(--bg2)"':'')+'></div>';
  h+='<div><label style="font-size:12px;font-weight:600;margin-bottom:4px;display:block">표시명</label><input id="ceName" value="'+(item?item.name:'')+'" style="width:100%;padding:8px;border:1px solid var(--bdr);border-radius:6px"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;margin-bottom:4px;display:block">추가값 (세율 등)</label><input id="ceValue" value="'+(item?item.value:'')+'" style="width:100%;padding:8px;border:1px solid var(--bdr);border-radius:6px"></div>';
  h+='<div style="display:flex;gap:12px"><div style="flex:1"><label style="font-size:12px;font-weight:600;margin-bottom:4px;display:block">색상 (CSS클래스 또는 HEX)</label><input id="ceColor" value="'+(item?item.color:'')+'" placeholder="bd-p 또는 #3B82F6" style="width:100%;padding:8px;border:1px solid var(--bdr);border-radius:6px"></div>';
  h+='<div><label style="font-size:12px;font-weight:600;margin-bottom:4px;display:block">기본값</label><select id="ceDefault" style="padding:8px;border:1px solid var(--bdr);border-radius:6px"><option value="0">아니오</option><option value="1" '+(item&&item.is_default?'selected':'')+'>예</option></select></div></div>';
  h+='<button class="btn btn-p" onclick="saveCodeItem(\''+(item?item.id:'')+'\')">저장</button>';
  h+='</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
  if(!isEdit)document.getElementById('ceCode').focus();
  else document.getElementById('ceName').focus();
}
function saveCodeItem(editId){
  var code=document.getElementById('ceCode').value.trim();
  var name=document.getElementById('ceName').value.trim();
  if(!code){toast('코드값 입력','err');return}
  if(!name){toast('표시명 입력','err');return}
  var items=DB.g(SysCode._ITEMS_KEY);
  if(editId){
    var idx=items.findIndex(function(x){return x.id===editId});
    if(idx>=0){
      items[idx].name=name;
      items[idx].value=document.getElementById('ceValue').value.trim();
      items[idx].color=document.getElementById('ceColor').value.trim();
      items[idx].is_default=+document.getElementById('ceDefault').value;
    }
  }else{
    if(items.find(function(x){return x.category_id===_selCatId&&x.code===code})){toast('이미 존재하는 코드','err');return}
    var catItems=items.filter(function(x){return x.category_id===_selCatId});
    items.push({id:gid(),category_id:_selCatId,code:code,name:name,value:document.getElementById('ceValue').value.trim(),color:document.getElementById('ceColor').value.trim(),is_default:+document.getElementById('ceDefault').value,is_active:1,ord:catItems.length+1});
  }
  SysCode.saveItems(items);
  var mo=document.getElementById('codeEditMo');if(mo)mo.remove();
  rCodes();toast('코드 저장','ok');
}
function delCode(codeId){
  if(!confirm('이 코드를 삭제하시겠습니까?'))return;
  var items=DB.g(SysCode._ITEMS_KEY).filter(function(x){return x.id!==codeId});
  SysCode.saveItems(items);rCodes();toast('삭제','ok');
}
function toggleCodeActive(codeId){
  var items=DB.g(SysCode._ITEMS_KEY);
  var it=items.find(function(x){return x.id===codeId});
  if(it){it.is_active=it.is_active===0?1:0;SysCode.saveItems(items);rCodes()}
}
function moveCode(codeId,dir){
  var items=DB.g(SysCode._ITEMS_KEY);
  var catItems=items.filter(function(x){return x.category_id===_selCatId}).sort(function(a,b){return(a.ord||0)-(b.ord||0)});
  var idx=catItems.findIndex(function(x){return x.id===codeId});
  if(idx<0)return;
  var newIdx=idx+dir;
  if(newIdx<0||newIdx>=catItems.length)return;
  var tmp=catItems[idx].ord;catItems[idx].ord=catItems[newIdx].ord;catItems[newIdx].ord=tmp;
  // write back
  catItems.forEach(function(ci){var fi=items.find(function(x){return x.id===ci.id});if(fi)fi.ord=ci.ord});
  SysCode.saveItems(items);rCodes();
}

/* ================================================================
   33. 미수미지급 Aging 보고서
   ================================================================ */
function rAging(){
  var mode=$('agingMode')?$('agingMode').value:'recv';
  var sales=DB.g('sales');var purchases=DB.g('purchase');
  var today=new Date();
  var data=mode==='recv'?sales.filter(function(r){return(r.amt||0)-(r.paid||0)>0}):purchases.filter(function(r){return(r.amt||0)-(r.paid||0)>0});
  var buckets={};
  data.forEach(function(r){
    var cli=r.cli||r.client||'미지정';
    if(!buckets[cli])buckets[cli]={name:cli,b0:0,b30:0,b60:0,b90:0,total:0};
    var dt=new Date(r.dt||r.date);
    var days=Math.floor((today-dt)/(1000*60*60*24));
    var unpaid=Math.max(0,(r.amt||0)-(r.paid||0));
    if(days<=30)buckets[cli].b0+=unpaid;
    else if(days<=60)buckets[cli].b30+=unpaid;
    else if(days<=90)buckets[cli].b60+=unpaid;
    else buckets[cli].b90+=unpaid;
    buckets[cli].total+=unpaid;
  });
  var rows=Object.values(buckets).sort(function(a,b){return b.total-a.total});
  var totals={b0:0,b30:0,b60:0,b90:0,total:0};
  rows.forEach(function(r){totals.b0+=r.b0;totals.b30+=r.b30;totals.b60+=r.b60;totals.b90+=r.b90;totals.total+=r.total});

  var h='<div style="display:flex;gap:8px;margin-bottom:12px"><select id="agingMode" onchange="rAging()" style="padding:6px 10px;border:1px solid var(--bdr);border-radius:6px"><option value="recv" '+(mode==='recv'?'selected':'')+'>미수금 (매출)</option><option value="pay" '+(mode==='pay'?'selected':'')+'>미지급 (매입)</option></select>';
  h+='<button class="btn btn-sm btn-o" onclick="exportAgingXls()">엑셀 내보내기</button>';
  h+='<button class="btn btn-sm btn-o" onclick="printAgingReport()">연령표 인쇄</button></div>';
  // Summary cards
  h+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px">';
  h+='<div style="padding:12px;background:#DBEAFE;border-radius:8px;text-align:center"><div style="font-size:11px;color:#1E40AF">0-30일</div><div style="font-size:18px;font-weight:700;color:#1E40AF">'+fmt(totals.b0)+'</div></div>';
  h+='<div style="padding:12px;background:#FEF3C7;border-radius:8px;text-align:center"><div style="font-size:11px;color:#92400E">31-60일</div><div style="font-size:18px;font-weight:700;color:#92400E">'+fmt(totals.b30)+'</div></div>';
  h+='<div style="padding:12px;background:#FED7AA;border-radius:8px;text-align:center"><div style="font-size:11px;color:#C2410C">61-90일</div><div style="font-size:18px;font-weight:700;color:#C2410C">'+fmt(totals.b60)+'</div></div>';
  h+='<div style="padding:12px;background:#FECACA;border-radius:8px;text-align:center"><div style="font-size:11px;color:#991B1B">90일+</div><div style="font-size:18px;font-weight:700;color:#991B1B">'+fmt(totals.b90)+'</div></div>';
  h+='<div style="padding:12px;background:var(--bg3);border-radius:8px;text-align:center"><div style="font-size:11px;color:var(--txt3)">합계</div><div style="font-size:18px;font-weight:700;color:var(--txt)">'+fmt(totals.total)+'</div></div>';
  h+='</div>';
  // Donut chart
  var colors=['#3B82F6','#F59E0B','#F97316','#EF4444'];
  var parts=[totals.b0,totals.b30,totals.b60,totals.b90];
  var sum=totals.total||1;
  h+='<div style="display:flex;gap:24px;margin-bottom:16px;align-items:center"><div style="position:relative;width:120px;height:120px">';
  var pct=0;var gradParts=[];
  parts.forEach(function(v,i){var p=v/sum*100;gradParts.push(colors[i]+' '+pct.toFixed(1)+'% '+(pct+p).toFixed(1)+'%');pct+=p});
  h+='<div style="width:120px;height:120px;border-radius:50%;background:conic-gradient('+gradParts.join(',')+');position:relative"><div style="position:absolute;top:20px;left:20px;width:80px;height:80px;border-radius:50%;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">'+rows.length+'개사</div></div>';
  h+='</div><div>';
  ['0-30일','31-60일','61-90일','90일+'].forEach(function(label,i){
    h+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><div style="width:10px;height:10px;border-radius:2px;background:'+colors[i]+'"></div><span style="font-size:12px">'+label+': '+fmt(parts[i])+' ('+(parts[i]/sum*100).toFixed(1)+'%)</span></div>';
  });
  h+='</div></div>';
  // Table
  h+='<table class="dt"><thead><tr><th>거래처</th><th style="text-align:right">0-30일</th><th style="text-align:right">31-60일</th><th style="text-align:right">61-90일</th><th style="text-align:right">90일+</th><th style="text-align:right">합계</th></tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--txt3)">'+(mode==='recv'?'미수금':'미지급금')+' 없음</td></tr>';
  rows.forEach(function(r){
    h+='<tr><td style="font-weight:600">'+r.name+'</td>';
    h+='<td style="text-align:right">'+fmt(r.b0)+'</td>';
    h+='<td style="text-align:right;'+(r.b30?'color:#92400E;font-weight:600':'')+'">'+fmt(r.b30)+'</td>';
    h+='<td style="text-align:right;'+(r.b60?'color:#C2410C;font-weight:600':'')+'">'+fmt(r.b60)+'</td>';
    h+='<td style="text-align:right;'+(r.b90?'color:#991B1B;font-weight:700':'')+'">'+fmt(r.b90)+'</td>';
    h+='<td style="text-align:right;font-weight:700">'+fmt(r.total)+'</td></tr>';
  });
  h+='<tr style="font-weight:700;background:var(--bg2)"><td>합계</td><td style="text-align:right">'+fmt(totals.b0)+'</td><td style="text-align:right">'+fmt(totals.b30)+'</td><td style="text-align:right">'+fmt(totals.b60)+'</td><td style="text-align:right">'+fmt(totals.b90)+'</td><td style="text-align:right">'+fmt(totals.total)+'</td></tr>';
  h+='</tbody></table>';
  $('recvArea').innerHTML=h;
}
function exportAgingXls(){
  var mode=$('agingMode')?$('agingMode').value:'recv';
  var sales=DB.g('sales');var purchases=DB.g('purchase');
  var today=new Date();
  var data=mode==='recv'?sales.filter(function(r){return(r.amt||0)-(r.paid||0)>0}):purchases.filter(function(r){return(r.amt||0)-(r.paid||0)>0});
  var buckets={};
  data.forEach(function(r){
    var cli=r.cli||r.client||'미지정';
    if(!buckets[cli])buckets[cli]={name:cli,b0:0,b30:0,b60:0,b90:0,total:0};
    var dt=new Date(r.dt||r.date);
    var days=Math.floor((today-dt)/(1000*60*60*24));
    var unpaid=Math.max(0,(r.amt||0)-(r.paid||0));
    if(days<=30)buckets[cli].b0+=unpaid;
    else if(days<=60)buckets[cli].b30+=unpaid;
    else if(days<=90)buckets[cli].b60+=unpaid;
    else buckets[cli].b90+=unpaid;
    buckets[cli].total+=unpaid;
  });
  var rows=Object.values(buckets).sort(function(a,b){return b.total-a.total});
  if(typeof XLSX!=='undefined'){
    var ws=XLSX.utils.aoa_to_sheet([['거래처','0-30일','31-60일','61-90일','90일+','합계']].concat(rows.map(function(r){return[r.name,r.b0,r.b30,r.b60,r.b90,r.total]})));
    var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,(mode==='recv'?'미수금':'미지급금')+'Aging');XLSX.writeFile(wb,(mode==='recv'?'미수금':'미지급금')+'_Aging_'+td()+'.xlsx');
  }
}

/* ================================================================
   34. 원가/이익 보고서 강화
   ================================================================ */
function rCosting(){
  var sales=DB.g('sales');var purchases=DB.g('purchase');
  var viewMode=$('costingView')?$('costingView').value:'product';
  // Build analysis by product or client
  var map={};
  sales.forEach(function(r){
    var key=viewMode==='product'?(r.prod||'미지정'):(r.cli||'미지정');
    if(!map[key])map[key]={name:key,revenue:0,cost:0,qty:0};
    map[key].revenue+=(r.amt||0);
    map[key].qty+=(r.qty||0);
  });
  purchases.forEach(function(r){
    var key=viewMode==='product'?(r.prod||'미지정'):(r.cli||'미지정');
    if(!map[key])map[key]={name:key,revenue:0,cost:0,qty:0};
    map[key].cost+=(r.amt||0);
  });
  var rows=Object.values(map).map(function(r){r.profit=r.revenue-r.cost;r.margin=r.revenue?Math.round(r.profit/r.revenue*1000)/10:0;return r});
  rows.sort(function(a,b){return b.profit-a.profit});

  var totalRev=0,totalCost=0;
  rows.forEach(function(r){totalRev+=r.revenue;totalCost+=r.cost});
  var totalProfit=totalRev-totalCost;
  var totalMargin=totalRev?Math.round(totalProfit/totalRev*1000)/10:0;

  var h='<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">';
  h+='<select id="costingView" onchange="rCosting()" style="padding:6px 10px;border:1px solid var(--bdr);border-radius:6px"><option value="product" '+(viewMode==='product'?'selected':'')+'>품목별</option><option value="client" '+(viewMode==='client'?'selected':'')+'>거래처별</option></select></div>';
  // Summary
  h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">';
  h+='<div style="padding:12px;background:#DBEAFE;border-radius:8px;text-align:center"><div style="font-size:11px;color:#1E40AF">매출</div><div style="font-size:18px;font-weight:700;color:#1E40AF">'+fmt(totalRev)+'</div></div>';
  h+='<div style="padding:12px;background:#FED7AA;border-radius:8px;text-align:center"><div style="font-size:11px;color:#C2410C">매입원가</div><div style="font-size:18px;font-weight:700;color:#C2410C">'+fmt(totalCost)+'</div></div>';
  h+='<div style="padding:12px;background:#DCFCE7;border-radius:8px;text-align:center"><div style="font-size:11px;color:#166534">이익</div><div style="font-size:18px;font-weight:700;color:#166534">'+fmt(totalProfit)+'</div></div>';
  h+='<div style="padding:12px;background:var(--bg3);border-radius:8px;text-align:center"><div style="font-size:11px;color:var(--txt3)">마진율</div><div style="font-size:18px;font-weight:700;color:var(--txt)">'+totalMargin+'%</div></div>';
  h+='</div>';
  // Bar chart
  var maxRev=Math.max.apply(null,rows.map(function(r){return r.revenue}))||1;
  h+='<div style="margin-bottom:16px">';
  rows.slice(0,10).forEach(function(r){
    var wRev=Math.round(r.revenue/maxRev*100);
    var wCost=Math.round(r.cost/maxRev*100);
    h+='<div style="margin-bottom:8px"><div style="font-size:12px;font-weight:600;margin-bottom:2px">'+r.name+' <span style="color:var(--txt3);font-weight:400">마진 '+r.margin+'%</span></div>';
    h+='<div style="display:flex;gap:2px;height:14px"><div style="width:'+wRev+'%;background:#3B82F6;border-radius:3px"></div></div>';
    h+='<div style="display:flex;gap:2px;height:10px;margin-top:1px"><div style="width:'+wCost+'%;background:#F59E0B;border-radius:3px;opacity:0.6"></div></div></div>';
  });
  h+='<div style="display:flex;gap:12px;font-size:11px;color:var(--txt3);margin-top:4px"><span><span style="display:inline-block;width:10px;height:10px;background:#3B82F6;border-radius:2px;vertical-align:middle"></span> 매출</span><span><span style="display:inline-block;width:10px;height:10px;background:#F59E0B;border-radius:2px;vertical-align:middle;opacity:0.6"></span> 매입원가</span></div>';
  h+='</div>';
  // Table
  h+='<table class="dt"><thead><tr><th>'+(viewMode==='product'?'품목':'거래처')+'</th><th style="text-align:right">매출</th><th style="text-align:right">매입원가</th><th style="text-align:right">이익</th><th style="text-align:right">마진율</th><th style="text-align:right">수량</th></tr></thead><tbody>';
  rows.forEach(function(r){
    var mc=r.margin>=20?'#166534':r.margin>=10?'#92400E':'#991B1B';
    h+='<tr><td style="font-weight:600">'+r.name+'</td><td style="text-align:right">'+fmt(r.revenue)+'</td><td style="text-align:right">'+fmt(r.cost)+'</td><td style="text-align:right;font-weight:600;color:'+(r.profit>=0?'#166534':'#991B1B')+'">'+fmt(r.profit)+'</td><td style="text-align:right;color:'+mc+'">'+r.margin+'%</td><td style="text-align:right">'+fmt(r.qty)+'</td></tr>';
  });
  h+='<tr style="font-weight:700;background:var(--bg2)"><td>합계</td><td style="text-align:right">'+fmt(totalRev)+'</td><td style="text-align:right">'+fmt(totalCost)+'</td><td style="text-align:right">'+fmt(totalProfit)+'</td><td style="text-align:right">'+totalMargin+'%</td><td></td></tr>';
  h+='</tbody></table>';

  var area=$('costingArea');
  if(area)area.innerHTML=h;
}

/* ================================================================
   35. 품목별 수불장
   ================================================================ */
function rProductLedger(){
  var incomes=DB.g('income');var ships=DB.g('shipLog');
  // Collect all product names
  var prodSet={};
  incomes.forEach(function(r){if(r.prod)prodSet[r.prod]=1});
  ships.forEach(function(r){if(r.prod)prodSet[r.prod]=1});
  var products=Object.keys(prodSet).sort();
  var selProd=$('ledgerProd')?$('ledgerProd').value:'';

  var h='<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">';
  h+='<select id="ledgerProd" onchange="rProductLedger()" style="padding:6px 10px;border:1px solid var(--bdr);border-radius:6px"><option value="">품목 선택</option>';
  products.forEach(function(p){h+='<option value="'+p+'" '+(p===selProd?'selected':'')+'>'+p+'</option>'});
  h+='</select>';
  h+='<input type="month" id="ledgerMonth" onchange="rProductLedger()" style="padding:6px 10px;border:1px solid var(--bdr);border-radius:6px">';
  h+='</div>';

  if(!selProd){h+='<div style="text-align:center;padding:40px;color:var(--txt3)">품목을 선택하세요</div>';$('ledgerArea').innerHTML=h;return}

  var month=$('ledgerMonth')?$('ledgerMonth').value:'';
  var inList=incomes.filter(function(r){return r.prod===selProd&&(!month||r.dt&&r.dt.indexOf(month)===0)});
  var outList=ships.filter(function(r){return r.prod===selProd&&(!month||r.dt&&r.dt.indexOf(month)===0)});
  // Merge and sort by date
  var entries=[];
  inList.forEach(function(r){entries.push({dt:r.dt||'',type:'입고',ref:r.ref||r.id||'',qty:r.qty||0,note:r.note||''})});
  outList.forEach(function(r){entries.push({dt:r.dt||'',type:'출고',ref:r.wo||r.id||'',qty:r.qty||0,note:r.cli||''})});
  entries.sort(function(a,b){return a.dt<b.dt?-1:a.dt>b.dt?1:0});

  var balance=0;
  h+='<table class="dt"><thead><tr><th>일자</th><th>유형</th><th>참조</th><th style="text-align:right">입고</th><th style="text-align:right">출고</th><th style="text-align:right">잔량</th><th>비고</th></tr></thead><tbody>';
  if(!entries.length)h+='<tr><td colspan="7" style="text-align:center;padding:20px;color:var(--txt3)">데이터 없음</td></tr>';
  entries.forEach(function(e){
    var inQty=e.type==='입고'?e.qty:0;
    var outQty=e.type==='출고'?e.qty:0;
    balance+=inQty-outQty;
    h+='<tr><td>'+e.dt+'</td><td>'+badge(e.type==='입고'?'수주':'출고완료')+'</td><td style="font-size:12px">'+e.ref+'</td><td style="text-align:right;color:#166534">'+(inQty?fmt(inQty):'')+'</td><td style="text-align:right;color:#991B1B">'+(outQty?fmt(outQty):'')+'</td><td style="text-align:right;font-weight:600">'+fmt(balance)+'</td><td style="font-size:12px">'+e.note+'</td></tr>';
  });
  h+='</tbody></table>';
  $('ledgerArea').innerHTML=h;
}

/* ================================================================
   36. 문서 흐름 뷰
   ================================================================ */
function rDocFlow(){
  var type=$('dfDocType')?$('dfDocType').value:'';
  var search=$('dfSearch')?$('dfSearch').value.trim().toLowerCase():'';
  var links=DB.g(DocTrace._LINKS_KEY);
  if(!links.length&&!type){$('docFlowArea').innerHTML='<div style="text-align:center;padding:40px;color:var(--txt3)">연결된 문서가 없습니다</div>';return}

  // Get all unique document nodes
  var nodes={};
  links.forEach(function(l){
    nodes[l.ft+'_'+l.fi]={type:l.ft,id:l.fi,no:l.fn};
    nodes[l.tt+'_'+l.ti]={type:l.tt,id:l.ti,no:l.tn};
  });
  var allNodes=Object.values(nodes);
  if(type)allNodes=allNodes.filter(function(n){return n.type===type});
  if(search)allNodes=allNodes.filter(function(n){return(n.no||'').toLowerCase().indexOf(search)>=0});

  // Group by chain root
  var chains=[];var visited={};
  allNodes.forEach(function(n){
    var key=n.type+'_'+n.id;
    if(visited[key])return;
    var chain=DocTrace.fullChain(n.type,n.id);
    chain.forEach(function(c){visited[c.type+'_'+c.id]=true});
    if(chain.length>0)chains.push(chain);
  });

  var typeColors={QUOTE:'#6366F1',ORDER:'#3B82F6',WO:'#F59E0B',SHIP:'#10B981',STATEMENT:'#8B5CF6',TAX_INV:'#EC4899',SALE:'#14B8A6',PAYMENT:'#F97316'};
  var typeNames={QUOTE:'견적',ORDER:'수주',WO:'작업지시',SHIP:'출고',STATEMENT:'거래명세표',TAX_INV:'세금계산서',SALE:'매출전표',PAYMENT:'입금'};

  var h='<div style="font-size:12px;color:var(--txt3);margin-bottom:8px">'+chains.length+'건의 문서 흐름</div>';
  if(!chains.length)h+='<div style="text-align:center;padding:40px;color:var(--txt3)">조건에 맞는 문서 흐름이 없습니다</div>';

  chains.slice(0,50).forEach(function(chain){
    h+='<div style="display:flex;align-items:center;gap:4px;padding:10px 12px;background:var(--bg2);border-radius:8px;margin-bottom:6px;overflow-x:auto">';
    chain.forEach(function(n,i){
      var color=typeColors[n.type]||'#6B7280';
      if(i>0)h+='<span style="color:var(--txt4);font-size:16px">→</span>';
      h+='<div style="padding:6px 12px;background:'+color+';color:#fff;border-radius:6px;font-size:12px;white-space:nowrap;cursor:pointer" onclick="DocTrace._goDoc(\''+n.type+'\',\''+n.id+'\')">';
      h+='<div style="font-weight:700">'+(typeNames[n.type]||n.type)+'</div>';
      if(n.no)h+='<div style="font-size:10px;opacity:0.8">'+n.no+'</div>';
      h+='</div>';
    });
    h+='</div>';
  });
  $('docFlowArea').innerHTML=h;
}

/* ================================================================
   37. 거래처 외상매출 연령표 (A4 인쇄)
   ================================================================ */
function printAgingReport(){
  var sales=DB.g('sales');var today=new Date();
  var buckets={};
  sales.filter(function(r){return(r.amt||0)-(r.paid||0)>0}).forEach(function(r){
    var cli=r.cli||'미지정';
    if(!buckets[cli])buckets[cli]={name:cli,b0:0,b30:0,b60:0,b90:0,total:0};
    var dt=new Date(r.dt||r.date);var days=Math.floor((today-dt)/(1000*60*60*24));
    var unpaid=Math.max(0,(r.amt||0)-(r.paid||0));
    if(days<=30)buckets[cli].b0+=unpaid;else if(days<=60)buckets[cli].b30+=unpaid;else if(days<=90)buckets[cli].b60+=unpaid;else buckets[cli].b90+=unpaid;
    buckets[cli].total+=unpaid;
  });
  var rows=Object.values(buckets).sort(function(a,b){return b.total-a.total});
  var totals={b0:0,b30:0,b60:0,b90:0,total:0};
  rows.forEach(function(r){totals.b0+=r.b0;totals.b30+=r.b30;totals.b60+=r.b60;totals.b90+=r.b90;totals.total+=r.total});

  var co=_co();
  var h='<div style="text-align:center;margin-bottom:20px">';
  h+='<div style="font-size:14px;color:#555">'+co.nm+'</div>';
  h+='<div style="font-size:22px;font-weight:900;letter-spacing:2px;margin:8px 0">외상매출 연령표</div>';
  h+='<div style="font-size:12px;color:#999">기준일: '+td()+' | '+co.addr+'</div></div>';
  h+='<table><thead><tr style="background:#1E3A5F;color:#fff"><th>거래처</th><th style="text-align:right">0-30일</th><th style="text-align:right">31-60일</th><th style="text-align:right">61-90일</th><th style="text-align:right">90일 초과</th><th style="text-align:right">합계</th></tr></thead><tbody>';
  rows.forEach(function(r){
    h+='<tr><td style="font-weight:600">'+r.name+'</td>';
    h+='<td style="text-align:right">'+r.b0.toLocaleString()+'</td>';
    h+='<td style="text-align:right;'+(r.b30?'color:#92400E':'')+'">'+r.b30.toLocaleString()+'</td>';
    h+='<td style="text-align:right;'+(r.b60?'color:#C2410C;font-weight:600':'')+'">'+r.b60.toLocaleString()+'</td>';
    h+='<td style="text-align:right;'+(r.b90?'color:#991B1B;font-weight:700':'')+'">'+r.b90.toLocaleString()+'</td>';
    h+='<td style="text-align:right;font-weight:700">'+r.total.toLocaleString()+'</td></tr>';
  });
  h+='<tr style="font-weight:700;background:#f0f0f0"><td>합계</td><td style="text-align:right">'+totals.b0.toLocaleString()+'</td><td style="text-align:right">'+totals.b30.toLocaleString()+'</td><td style="text-align:right">'+totals.b60.toLocaleString()+'</td><td style="text-align:right">'+totals.b90.toLocaleString()+'</td><td style="text-align:right;font-size:14px">'+totals.total.toLocaleString()+'</td></tr>';
  h+='</tbody></table>';
  h+='<div style="margin-top:24px;font-size:11px;color:#999">';
  h+='<div>· 0-30일: 정상 채권 | 31-60일: 주의 | 61-90일: 경고 | 90일+: 위험</div>';
  h+='<div>· 총 '+rows.length+'개 거래처 | 미수 합계: ₩'+totals.total.toLocaleString()+'</div></div>';
  _openPW('외상매출 연령표',h);
}

/* ================================================================
   CSS: 프로그레스바
   ================================================================ */
(function(){
  var st=document.createElement('style');
  st.textContent='.prog-bar{width:100%;height:8px;background:var(--bg3,#E5E7EB);border-radius:4px;overflow:hidden}.prog-fill{height:100%;background:var(--pri,#1E3A5F);border-radius:4px;transition:width .3s}';
  document.head.appendChild(st);
})();
