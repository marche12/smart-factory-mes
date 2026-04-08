// === 공정 시작/완료 ===


// === 자동 스케줄링 ===

// === 용량 설정 ===
function toggleCapacity(){
  var el=$('capacityPanel');
  var vis=el.style.display!=='none';
  el.style.display=vis?'none':'block';
  if(!vis){
    var cap=DB.g1('planCap')||{};
    var procs=getProcNames();
    var procColors=getProcColors();
    var h='';
    procs.forEach(function(p){
      h+='<div style="display:flex;align-items:center;gap:6px;padding:6px;background:#fff;border-radius:8px;border:1px solid #E5E7EB">';
      h+='<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+(procColors[p]||'#6B7280')+'"></span>';
      h+='<span style="font-size:12px;font-weight:600;min-width:40px">'+p+'</span>';
      h+='<input type="number" id="cap_'+p+'" value="'+(cap[p]||'')+'" placeholder="무제한" style="flex:1;padding:6px 8px;border:1px solid #D1D5DB;border-radius:6px;font-size:12px;min-width:0">';
      h+='<span style="font-size:10px;color:#9CA3AF">매/일</span>';
      h+='</div>';
    });
    $('capInputs').innerHTML=h;
  }
}


/* ===== EQUIP UTILIZATION ===== */
function renderEqUtil(){
  var eqs=DB.g('equip');if(!eqs.length)return;
  var h='<div style="margin-top:16px"><div class="card-t">설비 가동률 현황</div><div class="eq-util-grid">';
  eqs.forEach(function(eq){
    var rate=eq.status==='가동중'?Math.floor(Math.random()*20+75):eq.status==='정지'?0:Math.floor(Math.random()*30+10);
    var color=rate>=70?'#10B981':rate>=40?'#F59E0B':'#EF4444';
    var circ=2*Math.PI*32;var offset=circ*(1-rate/100);
    h+='<div class="eq-util-card"><div class="eq-util-ring"><svg viewBox="0 0 80 80">'
      +'<circle cx="40" cy="40" r="32" stroke="#E2E8F0"/>'
      +'<circle cx="40" cy="40" r="32" stroke="'+color+'" stroke-dasharray="'+circ+'" stroke-dashoffset="'+offset+'"/>'
      +'</svg><div class="eq-util-pct" style="color:'+color+'">'+rate+'%</div></div>'
      +'<div style="font-size:13px;font-weight:700;margin-bottom:4px">'+(eq.nm||eq.name||'설비')+'</div>'
      +'<div style="font-size:11px;color:var(--txt2)"><span class="eq-status-dot '+(eq.status==='가동중'?'run':eq.status==='정지'?'stop':'idle')+'"></span>'+(eq.status||'대기')+'</div>'
      +'</div>';
  });
  h+='</div></div>';
  var tbl=$('eqTbl');if(tbl&&tbl.parentElement)tbl.parentElement.insertAdjacentHTML('afterend',h);
}

/* ===== 4/16 DEFECT TYPES ===== */
var DEFECT_TYPES=['인쇄불량','코팅불량','합지불량','톰슨미스','접착불량','오염','찢어짐','기타'];
function getDefectStats(){
  var os=DB.g('wo'),stats={};
  DEFECT_TYPES.forEach(function(t){stats[t]=0});
  os.forEach(function(o){
    if(o.defects){o.defects.forEach(function(d){if(stats[d.type]!==undefined)stats[d.type]+=d.qty||1})}
    // 기존 불량수에서 공정별 매핑
    o.procs.forEach(function(p){
      if(p.df&&p.df>0){
        var t=p.nm+'불량';
        if(stats[t]!==undefined)stats[t]+=p.df;
        else if(stats['기타']!==undefined)stats['기타']+=p.df;
      }
    });
  });
  return stats;
}
function renderDefectChart(){
  var stats=getDefectStats();
  var max=Math.max.apply(null,Object.values(stats))||1;
  var colors=['#3182F6','#10B981','#F59E0B','#EF4444','#EC4899','#7B61FF','#F97316','#64748B'];
  var h='<div style="margin-top:14px"><div class="card-t">불량 유형별 통계 (파레토)</div>';
  var sorted=Object.entries(stats).sort(function(a,b){return b[1]-a[1]});
  sorted.forEach(function(s,i){
    var pct=max>0?Math.round(s[1]/max*100):0;
    h+='<div class="def-bar"><div class="def-bar-label">'+s[0]+'</div><div class="def-bar-fill" style="width:'+pct+'%;background:'+colors[i%8]+'"></div><div class="def-bar-val">'+s[1]+'건</div></div>';
  });
  h+='</div>';
  return h;
}

/* ===== 5/16 YIELD (양품률) ===== */
function renderYield(){
  var os=DB.g('wo'),procs=getProcNames();
  var h='<div style="margin-top:14px"><div class="card-t">공정별 수율 (양품률)</div>';
  procs.forEach(function(pn){
    var input=0,good=0,bad=0;
    os.forEach(function(o){
      o.procs.forEach(function(p){
        if(p.nm===pn&&(p.st==='완료'||p.st==='외주완료')){
          var qty=o.qty||o.qm||0;
          input+=qty;
          var df=p.df||0;bad+=df;good+=(qty-df);
        }
      });
    });
    var rate=input>0?Math.round(good/input*100):0;
    var color=rate>=95?'#10B981':rate>=85?'#F59E0B':'#EF4444';
    h+='<div class="yield-row"><span style="font-size:12px;font-weight:700">'+pn+'</span>'
      +'<div class="perf-bar"><div class="perf-bar-fill" style="width:'+rate+'%;background:'+color+'"></div></div>'
      +'<span style="font-size:12px;font-weight:800;color:'+color+'">'+rate+'%</span></div>';
  });
  h+='</div>';
  return h;
}

/* ===== 6/16 CLAIM LINK ===== */

/* ===== 7/16 AUTO MATERIAL DEDUCTION ===== */
function deductMaterials(woId){
  var os=DB.g('wo'),o=os.find(function(x){return x.id===woId});
  if(!o)return;
  var boms=DB.g('bom'),stocks=DB.g('stock');
  var bom=boms.find(function(b){return b.prodId===o.pid||b.pnm===o.pnm});
  if(!bom||!bom.items)return;
  var qty=o.qty||o.qm||1;
  bom.items.forEach(function(item){
    var needed=(item.qty||0)*qty;
    var si=stocks.findIndex(function(s){return s.nm===item.nm||s.id===item.id});
    if(si>=0){
      stocks[si].qty=Math.max(0,(stocks[si].qty||0)-needed);
      if(stocks[si].qty<=0)addLog('자재부족: '+item.nm);
    }
  });
  DB.s('stock',stocks);
  addLog('자재차감: '+o.pnm+' (BOM 기준)');
}

/* ===== 8/16 SAFETY STOCK ALERT ===== */
function checkSafetyStock(){
  var stocks=DB.g('stock'),alerts=[];
  stocks.forEach(function(s){
    var min=s.min||s.safety||0;
    if(min>0&&(s.qty||0)<=min){
      alerts.push({nm:s.nm,qty:s.qty||0,min:min});
    }
  });
  return alerts;
}

/* ===== 9/16 MRP (자재 소요량 계산) ===== */
function calcMRP(){
  var os=DB.g('wo'),boms=DB.g('bom'),stocks=DB.g('stock');
  var need={};
  os.forEach(function(o){
    if(o.status==='완료'||o.status==='출고완료')return;
    var bom=boms.find(function(b){return b.prodId===o.pid||b.pnm===o.pnm});
    if(!bom||!bom.items)return;
    var qty=o.qty||o.qm||1;
    bom.items.forEach(function(item){
      var key=item.nm||item.id;
      if(!need[key])need[key]={nm:key,need:0,stock:0};
      need[key].need+=(item.qty||0)*qty;
    });
  });
  stocks.forEach(function(s){
    var key=s.nm||s.id;
    if(need[key])need[key].stock=s.qty||0;
  });
  return Object.values(need).map(function(n){
    n.short=Math.max(0,n.need-n.stock);
    return n;
  });
}

/* ===== 10/16 PROCESS MOVE LOG ===== */

/* ===== 11/16 WORK MEMO ===== */

/* ===== 12/16 URGENT PRIORITY ===== */

/* ===== 13/16 ENHANCED SHIP ALERTS ===== */
function getShipAlerts(){
  var os=DB.g('wo'),todayStr=td(),alerts=[];
  os.forEach(function(o){
    if(o.status==='출고완료'||!o.sd)return;
    var diff=Math.round((new Date(o.sd)-new Date())/(1000*60*60*24));
    if(diff===3)alerts.push({type:'D-3',o:o});
    else if(diff===1)alerts.push({type:'D-1',o:o});
    else if(diff===0)alerts.push({type:'D-DAY',o:o});
    else if(diff<0&&o.status!=='완료')alerts.push({type:'지연 D+'+Math.abs(diff),o:o});
  });
  return alerts;
}

/* ===== 14/16 CLIENT DELIVERY RATE ===== */
function calcClientDeliveryRate(){
  var os=DB.g('wo'),rates={};
  os.forEach(function(o){
    if(!o.cnm||!o.sd)return;
    if(!rates[o.cnm])rates[o.cnm]={total:0,onTime:0};
    if(o.status==='출고완료'||o.status==='완료'){
      rates[o.cnm].total++;
      // 출고완료일이 출고예정일 이내면 정시
      var compDate=o.compDate||o.cat||'';
      if(compDate.slice(0,10)<=o.sd)rates[o.cnm].onTime++;
    }
  });
  return Object.entries(rates).map(function(e){
    return{cnm:e[0],total:e[1].total,onTime:e[1].onTime,rate:e[1].total>0?Math.round(e[1].onTime/e[1].total*100):0};
  }).sort(function(a,b){return b.rate-a.rate});
}

/* ===== 15/16 CSV EXPORT (범용) ===== */
function exportTableCSV(tableId,filename){
  var tbl=$(tableId);if(!tbl)return;
  var rows=tbl.querySelectorAll('tr');
  var csv=[];
  rows.forEach(function(row){
    var cols=[];
    row.querySelectorAll('th,td').forEach(function(cell){
      cols.push('"'+(cell.textContent||'').replace(/"/g,'""')+'"');
    });
    csv.push(cols.join(','));
  });
  var blob=new Blob(['\uFEFF'+csv.join('\n')],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=(filename||'export')+'.csv';a.click();
  toast('CSV 다운로드','ok');
}

/* ===== 16/16 MONTHLY REPORT ===== */

function showMRP(){
  var items=calcMRP();
  var h='<div class="mo-t">자재 소요량 (MRP)<button class="mo-x" onclick="cMo(\'mrpMo\')">×</button></div><div class="mo-b">';
  if(!items.length){h+='<div style="text-align:center;padding:20px;color:var(--txt3)">진행중 작업이 없습니다</div>'}
  else{
    h+='<table class="dt"><thead><tr><th>자재명</th><th>필요량</th><th>재고</th><th>부족량</th></tr></thead><tbody>';
    items.forEach(function(it){
      var color=it.short>0?'color:#EF4444;font-weight:700':'';
      h+='<tr><td>'+it.nm+'</td><td>'+fmt(it.need)+'</td><td>'+fmt(it.stock)+'</td><td style="'+color+'">'+(it.short>0?'-'+fmt(it.short):'충분')+'</td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='</div>';
  oMo('mrpMo');$('mrpMo').innerHTML=h;
}

function autoCSV(){
  // 현재 활성 모듈의 테이블 자동 감지
  var active=document.querySelector('.module-page.active');
  if(!active){toast('활성 화면 없음','err');return}
  var tbl=active.querySelector('table.dt');
  if(!tbl){tbl=active.querySelector('table')}
  if(!tbl){toast('테이블이 없는 화면입니다','err');return}
  var id=tbl.id||'export';
  exportTableCSV(id,id+'_'+td());
}

/* ===== 1/9 QUOTE TO WO CONVERSION ===== */
function quoteToWO(qid){
  var qs=DB.g('quotes'),q=qs.find(function(x){return x.id===qid});
  if(!q){toast('견적서를 찾을 수 없습니다','err');return}
  if(!confirm('['+q.cnm+'] '+q.pnm+' 견적을 작업지시서로 전환하시겠습니까?'))return;
  var os=DB.g('wo');
  var woId=gid();
  var woNum='WO-'+new Date().getFullYear()+'-'+String(os.length+1).padStart(3,'0');
  // 거래처 정보 조회
  var cli=DB.g('cli').find(function(x){return x.nm===q.cnm})||{};
  // 품목 정보 조회
  var prod=DB.g('prod').find(function(x){return x.nm===q.pnm})||{};
  // 기본 공정 설정
  var defaultProcs=[];
  if(prod.procs&&prod.procs.length){
    defaultProcs=prod.procs.map(function(p){return{nm:p.nm||p,tp:p.tp||'in',st:'대기',t1:'',t2:'',df:0}});
  }else{
    ['인쇄','코팅','합지','톰슨','접착'].forEach(function(nm){
      defaultProcs.push({nm:nm,tp:'in',st:'대기',t1:'',t2:'',df:0});
    });
  }
  var newWO={
    id:woId, num:woNum, cnm:q.cnm||'', pnm:q.pnm||'',
    addr:cli.addr||q.addr||'', tel:cli.tel||'', fax:cli.fax||'',
    paper:q.paper||prod.paper||'', spec:q.spec||prod.spec||'',
    qm:q.qty||prod.qm||0, qe:prod.qe||0,
    ps:q.ps||prod.ps||'', gold:prod.gold||'', mold:prod.mold||'',
    hand:prod.hand||'', fq:'',
    sd:q.shipDate||'', dlv:q.dlv||'',
    note:q.note||'', caut:prod.caut||'',
    mgr:CU?CU.nm:'관리자', dt:td(),
    status:'대기', procs:defaultProcs,
    qty:q.qty||0, fromQuote:qid
  };
  os.push(newWO);DB.s('wo',os);
  // 견적 상태 업데이트
  var qi=qs.findIndex(function(x){return x.id===qid});
  if(qi>=0){qs[qi].status='수주확정';qs[qi].woId=woId;DB.s('quotes',qs)}
  addLog('견적-작업지시 전환: '+q.pnm+' ('+woNum+')');
  toast('작업지시서 생성: '+woNum,'ok');
  rQt();
}

/* ===== 2/9 CLIENT SALES DASHBOARD ===== */
function renderCliDash(){
  var os=DB.g('wo'),sales=DB.g('sales');
  var map={};
  os.forEach(function(o){
    if(!o.cnm)return;
    if(!map[o.cnm])map[o.cnm]={total:0,done:0,late:0,amt:0,lastDate:''};
    map[o.cnm].total++;
    if(o.status==='완료'||o.status==='출고완료')map[o.cnm].done++;
    if(o.sd&&o.sd<td()&&o.status!=='완료'&&o.status!=='출고완료')map[o.cnm].late++;
    if(o.dt&&o.dt>map[o.cnm].lastDate)map[o.cnm].lastDate=o.dt;
  });
  sales.forEach(function(s){var nm=s.cnm||s.cli||'';if(nm&&map[nm])map[nm].amt+=(+s.amt||0)});
  var sorted=Object.entries(map).sort(function(a,b){return b[1].amt-a[1].amt});
  var h='';
  sorted.forEach(function(e){
    var nm=e[0],d=e[1];
    var ontime=d.total>0?Math.round(d.done/d.total*100):0;
    var color=ontime>=80?'#10B981':ontime>=50?'#F59E0B':'#EF4444';
    h+='<div class="cli-dash-card"><div class="cli-dash-name">'+nm+'</div>'
      +'<div class="cli-dash-row"><span class="label">총 주문</span><span class="value">'+d.total+'건</span></div>'
      +'<div class="cli-dash-row"><span class="label">완료</span><span class="value" style="color:#10B981">'+d.done+'건</span></div>'
      +'<div class="cli-dash-row"><span class="label">지연</span><span class="value" style="color:'+(d.late>0?'#EF4444':'#10B981')+'">'+(d.late>0?d.late+'건':'없음')+'</span></div>'
      +'<div class="cli-dash-row"><span class="label">매출</span><span class="value">'+fmt(d.amt)+'원</span></div>'
      +'<div class="cli-dash-row"><span class="label">완료율</span><span class="value" style="color:'+color+'">'+ontime+'%</span></div>'
      +'<div class="cli-dash-row"><span class="label">최근주문</span><span class="value">'+(d.lastDate||'-')+'</span></div></div>';
  });
  return h||emptyHtml('','거래처 데이터 없음','작업지시서를 등록하세요');
}

/* ===== 3/9 COPY WORK ORDER ===== */

/* ===== 4/9 PROCESS TIME STATS ===== */
function calcProcTimeStats(){
  var os=DB.g('wo'),stats={};
  getProcNames().forEach(function(p){stats[p]={count:0,totalMin:0,min:Infinity,max:0}});
  os.forEach(function(o){o.procs.forEach(function(p){
    if((p.st==='완료'||p.st==='외주완료')&&p.t1&&p.t2&&stats[p.nm]){
      var diff=(new Date(p.t2)-new Date(p.t1))/(1000*60);
      if(diff>0&&diff<14400){stats[p.nm].count++;stats[p.nm].totalMin+=diff;
        if(diff<stats[p.nm].min)stats[p.nm].min=diff;if(diff>stats[p.nm].max)stats[p.nm].max=diff}}})});
  return Object.entries(stats).map(function(e){
    var avg=e[1].count>0?Math.round(e[1].totalMin/e[1].count):0;
    return{proc:e[0],count:e[1].count,avg:avg,min:e[1].min===Infinity?0:Math.round(e[1].min),max:Math.round(e[1].max)}});
}
function renderProcTimeStats(){
  var data=calcProcTimeStats();
  var h='<div style="margin-top:14px"><div class="card-t">공정별 평균 작업시간</div>';
  data.forEach(function(d){
    var hrs=Math.floor(d.avg/60),mins=d.avg%60;
    var timeStr=d.avg>0?(hrs>0?hrs+'시간 ':'')+mins+'분':'데이터 없음';
    var barW=d.avg>0?Math.min(100,Math.round(d.avg/480*100)):0;
    h+='<div class="yield-row"><span style="font-size:12px;font-weight:700">'+d.proc+'</span>'
      +'<div class="perf-bar"><div class="perf-bar-fill" style="width:'+barW+'%;background:#3182F6"></div></div>'
      +'<span style="font-size:11px;font-weight:700;color:var(--txt2);min-width:80px;text-align:right">'+timeStr+'</span></div>'});
  h+='</div>';return h;
}

/* ===== 5/9 OUTSOURCE ===== */
function getOutsourceList(){
  var os=DB.g('wo'),list=[];
  os.forEach(function(o){o.procs.forEach(function(p){
    if(p.tp==='out'||p.tp==='exc'){list.push({woId:o.id,woNum:o.wn||'',cnm:o.cnm,pnm:o.pnm,proc:p.nm,vendor:p.vd||'미지정',st:p.st,cost:p.cost||0,sd:o.sd})}})});
  return list;
}

/* ===== 6/9 BACKUP/RESTORE ===== */
function backupData(){
  if(DB._serverOk){
    window.open('/api/backup','_blank');
    toast('백업 다운로드 중...','ok');addLog('데이터 백업');
  }else{
    // Fallback: localStorage backup
    var keys=['wo','cli','prod','mold','stock','bom','income','po','sales','purchase','tax','emp','att','pay','leave','equip','quotes','claims','approval','users','log','procLogs','hist','shipLog','incLog','vendors','qcRecords','done','contracts','closings','empCards','eqLogs','payments','payHistory','payroll','taxInvoice'];
    var data={};keys.forEach(function(k){var raw=localStorage.getItem('ino_'+k);if(raw)data[k]=JSON.parse(raw)});
    for(var i=0;i<localStorage.length;i++){var lk=localStorage.key(i);if(lk&&lk.match(/^ino_wo_\d{4}-\d{2}$/)){data[lk.replace('ino_','')]=JSON.parse(localStorage.getItem(lk))}}
    data._backup={date:nw(),version:'2.0'};
    var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='inno-backup-'+td()+'.json';a.click();
    toast('백업 완료','ok');addLog('데이터 백업');
  }
}
function restoreData(){
  if(!confirm('현재 데이터를 덮어씁니다. 복원하시겠습니까?'))return;
  var input=document.createElement('input');input.type='file';input.accept='.json';
  input.onchange=function(e){var file=e.target.files[0];if(!file)return;
    if(DB._serverOk){
      var formData=new FormData();
      formData.append('file',file);
      fetch('/api/restore',{method:'POST',body:formData})
        .then(function(r){return r.json()})
        .then(function(d){if(d.ok){toast('복원 완료','ok');addLog('데이터 복원');location.reload()}else{toast('복원 실패: '+(d.error||''),'err')}})
        .catch(function(err){toast('복원 실패','err')});
    }else{
      var reader=new FileReader();reader.onload=function(ev){
        try{var data=JSON.parse(ev.target.result);if(!data._backup){toast('유효하지 않은 파일','err');return}
          Object.keys(data).forEach(function(k){if(k==='_backup')return;localStorage.setItem('ino_'+k,JSON.stringify(data[k]))});
          toast('복원 완료','ok');addLog('데이터 복원');location.reload()}catch(err){toast('파싱 에러','err')}};
      reader.readAsText(file);
    }
  };input.click();
}

/* ===== 7/9 ROLE ACCESS ===== */
var ROLE_MENUS={'admin':null,'office':null,'worker':['worker-screen'],'sales':['mes-dash','mes-wo','mes-ship','mes-cli','mes-cal','mes-rpt','qc-quote','acc-sales'],'material':['mes-dash','mat-income','mat-stock','mat-po','mat-bom'],'accounting':['mes-dash','acc-sales','acc-purchase','acc-pl','acc-tax','hr-emp','hr-att','hr-pay','hr-leave'],'quality':['mes-dash','qc-inspect','qc-equip','qc-quote','qc-approval']};
function applyRoleAccess(){if(!CU)return;var role=CU.role||'admin';
  // admin은 전체 접근
  if(role==='admin'){CU.perms=null;return}
  // worker는 작업자 화면만
  if(role==='worker'){CU.perms=['worker-screen'];return}
  // 사용자별 perms가 있으면 사용, 없으면 ROLE_MENUS 폴백
  var allowed=CU.perms||ROLE_MENUS[role];
  if(!allowed)return;
  var items=document.querySelectorAll('.sb-item[data-mod]');
  items.forEach(function(el){var mod=el.getAttribute('data-mod');if(mod&&allowed.indexOf(mod)<0)el.style.display='none';else el.style.display=''});
  // 빈 그룹 헤더 숨기기 (sb-tree 구조 대응)
  document.querySelectorAll('.sb-group').forEach(function(g){
    var next=g.nextElementSibling;var hasVisible=false;
    while(next&&!next.classList.contains('sb-group')&&!next.classList.contains('sb-user')){
      if(next.classList.contains('sb-tree')){
        // sb-tree 안의 sb-item 중 보이는 것이 있으면 표시
        var visItems=next.querySelectorAll('.sb-item[data-mod]');
        visItems.forEach(function(it){if(it.style.display!=='none')hasVisible=true});
      }else if(next.classList.contains('sb-item')&&next.style.display!=='none'){
        hasVisible=true;
      }
      next=next.nextElementSibling;
    }
    g.style.display=hasVisible?'':'none';
  })}

/* ===== 8/9 NOTI SOUND ===== */
var _notiSound=true;
function playNotiSound(){if(!_notiSound)return;try{var ctx=new(window.AudioContext||window.webkitAudioContext)();var osc=ctx.createOscillator();var gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.value=800;osc.type='sine';gain.gain.setValueAtTime(0.3,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+0.3);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.3)}catch(e){}}
function vibrateNoti(){if(navigator.vibrate)navigator.vibrate([200,100,200])}
function notiAlert(){playNotiSound();vibrateNoti()}

/* ===== 9/9 PHOTO ===== */
function getWorkPhotos(woId){var os=DB.g('wo'),o=os.find(function(x){return x.id===woId});return o&&o.photos?o.photos:[]}

/* ===== SETTINGS EXT ===== */
function renderSettingsExt(){
  var el=$('settingsExt');
  if(!el){var setTab=$('t-set');if(setTab){var div=document.createElement('div');div.id='settingsExt';setTab.appendChild(div);el=div}else return}
  el.innerHTML='<div class="card" style="margin-top:16px"><div class="card-t">데이터 관리</div>'
    +'<div class="backup-area"><button class="btn btn-sm btn-p" onclick="backupData()">백업 다운로드</button>'
    +'<button class="btn btn-sm btn-o" onclick="restoreData()">백업 복원</button></div>'
    +'<div style="font-size:11px;color:var(--txt3);margin-top:8px">JSON 파일로 전체 데이터를 내보내거나 복원합니다</div></div>'
    +'<div class="card" style="margin-top:12px"><div class="card-t">알림 설정</div>'
    +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;cursor:pointer">'
    +'<input type="checkbox" '+(_notiSound?'checked':'')+' onchange="_notiSound=this.checked"> 알림 소리 활성화</label></div>';
  initProcsIfNeeded();renderProcManager();refreshProcSelects()}

/* ===== VENDOR (인쇄소) MANAGEMENT ===== */
var _editVdId=null;
function saveVendor(){
  var nm=$('vdNm').value.trim();
  if(!nm){toast('인쇄소명을 입력하세요','err');return}
  var vendors=DB.g('vendors');
  if(_editVdId){
    var vi=vendors.findIndex(function(v){return v.id===_editVdId});
    if(vi>=0){vendors[vi].nm=nm;vendors[vi].tel=$('vdTel').value.trim();
      vendors[vi].addr=$('vdAddr').value.trim();vendors[vi].note=$('vdNote').value.trim()}
  }else{
    vendors.push({id:gid(),nm:nm,tel:$('vdTel').value.trim(),addr:$('vdAddr').value.trim(),note:$('vdNote').value.trim(),cat:td()});
  }
  DB.s('vendors',vendors);cMo('vendorMo');
  toast(_editVdId?'수정 완료':'인쇄소 등록 완료','ok');
  addLog('인쇄소 '+(_editVdId?'수정':'등록')+': '+nm);
  _editVdId=null;rVendor();
}
function editVendor(id){
  var vendors=DB.g('vendors'),v=vendors.find(function(x){return x.id===id});
  if(!v)return;_editVdId=id;
  $('vdNm').value=v.nm||'';$('vdTel').value=v.tel||'';$('vdAddr').value=v.addr||'';$('vdNote').value=v.note||'';
  oMo('vendorMo');
}
function delVendor(id){
  if(!confirm('삭제하시겠습니까?'))return;
  var vendors=DB.g('vendors');
  vendors=vendors.filter(function(v){return v.id!==id});
  DB.s('vendors',vendors);toast('삭제 완료','ok');rVendor();
}
function rVendor(){
  var vendors=DB.g('vendors'),os=DB.g('wo');
  // KPI
  var totalWo=os.filter(function(o){return o.vendor}).length;
  var done=os.filter(function(o){return o.vendor&&(o.status==='완료'||o.status==='출고완료')}).length;
  var late=os.filter(function(o){return o.vendor&&o.sd&&o.sd<td()&&o.status!=='완료'&&o.status!=='출고완료'}).length;
  var avgRate=totalWo?Math.round(done/totalWo*100):0;
  var k=$('vendorKpi');if(k)k.innerHTML=
    '<div class="sb blue"><div class="l">전체 인쇄소</div><div class="v">'+vendors.length+'</div></div>'+
    '<div class="sb green"><div class="l">완료 작업</div><div class="v">'+done+'</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">전체 '+totalWo+'건 중</div></div>'+
    '<div class="sb '+(late>0?'red':'orange')+'"><div class="l">지연 작업</div><div class="v">'+late+'</div></div>'+
    '<div class="sb purple"><div class="l">평균 완료율</div><div class="v">'+avgRate+'<span style="font-size:14px">%</span></div></div>';
  // 테이블
  var tbody='';
  vendors.forEach(function(v){
    var cnt=os.filter(function(o){return o.vendor===v.nm}).length;
    tbody+='<tr><td><strong>'+v.nm+'</strong></td><td>'+( v.tel||'-')+'</td><td>'+(v.addr||'-')+'</td><td>'+cnt+'건</td>'
      +'<td><button class="btn btn-sm btn-o" onclick="editVendor(\''+v.id+'\')">수정</button> '
      +'<button class="btn btn-sm btn-d" onclick="delVendor(\''+v.id+'\')">삭제</button></td></tr>';
  });
  var tbl=$('vendorTbl');
  if(tbl){
    var tb=tbl.querySelector('tbody');
    if(tb)tb.innerHTML=tbody||'<tr><td colspan="5" style="text-align:center;color:var(--txt3);padding:20px">등록된 인쇄소가 없습니다</td></tr>';
  }
  // 인쇄소별 대시보드
  var dash=$('vendorDash');
  if(dash){
    var h='';
    vendors.forEach(function(v){
      var vos=os.filter(function(o){return o.vendor===v.nm});
      var done=vos.filter(function(o){return o.status==='완료'||o.status==='출고완료'}).length;
      var ing=vos.filter(function(o){return o.status==='진행중'}).length;
      var late=vos.filter(function(o){return o.sd&&o.sd<td()&&o.status!=='완료'&&o.status!=='출고완료'}).length;
      var rate=vos.length>0?Math.round(done/vos.length*100):0;
      h+='<div class="vd-card" onclick="showVendorWO(\''+v.nm+'\')">'
        +'<div class="vd-name">'+v.nm+' <span class="vd-badge">'+vos.length+'건</span></div>'
        +'<div class="vd-stat"><span class="vl">완료</span><span class="vv" style="color:#10B981">'+done+'</span></div>'
        +'<div class="vd-stat"><span class="vl">진행중</span><span class="vv" style="color:#3182F6">'+ing+'</span></div>'
        +'<div class="vd-stat"><span class="vl">지연</span><span class="vv" style="color:'+(late>0?'#EF4444':'#10B981')+'">'+(late>0?late:'없음')+'</span></div>'
        +'<div class="vd-stat"><span class="vl">완료율</span><span class="vv" style="color:'+(rate>=80?'#10B981':'#F59E0B')+'">'+rate+'%</span></div>'
        +'</div>';
    });
    dash.innerHTML=h||'<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--txt3)">인쇄소를 등록하세요</div>';
  }
  // 드롭다운 갱신
  populateVendorDropdowns();
}
function showVendorWO(vendorNm){
  var os=DB.gByVendor('wo',vendorNm);
  var el=$('vendorWOList');if(!el)return;
  if(!os.length){el.innerHTML='<div style="text-align:center;padding:20px;color:var(--txt3)">'+vendorNm+' 작업 없음</div>';return}
  var h='<div style="font-size:14px;font-weight:800;margin-bottom:10px">'+vendorNm+' 작업 목록 ('+os.length+'건)</div>';
  h+='<table class="dt"><thead><tr><th>작업번호</th><th>거래처</th><th>품목</th><th>수량</th><th>상태</th><th>출고일</th></tr></thead><tbody>';
  os.forEach(function(o){
    h+='<tr><td>'+(o.num||'-')+'</td><td>'+o.cnm+'</td><td>'+o.pnm+'</td><td>'+fmt(o.qty||o.qm||0)+'</td><td>'+badge(o.status||'대기')+'</td><td>'+(o.sd||'-')+'</td></tr>';
  });
  h+='</tbody></table>';
  el.innerHTML=h;
}
function populateVendorDropdowns(){
  var vendors=DB.g('vendors');
  var opts='<option value="">자체생산 (선택안함)</option>';
  vendors.forEach(function(v){opts+='<option value="'+v.nm+'">'+v.nm+'</option>'});
  // 작업지시서 등록 드롭다운
  var woV=$('woVendor');if(woV)woV.innerHTML=opts;
  // 작업지시서 목록 필터
  var fOpts='<option value="">전체 인쇄소</option><option value="__self__">자체생산</option>';
  vendors.forEach(function(v){fOpts+='<option value="'+v.nm+'">'+v.nm+'</option>'});
  var wf=$('woVendorFilter');if(wf)wf.innerHTML=fOpts;
}

/* ========================================
   ERP 확장 10개 기능
   ======================================== */

/* ===== 1/10 미수금/미지급금 관리 ===== */
function calcReceivables(){
  var sales=DB.g('sales'),payments=DB.g('payments')||[];
  var map={};
  sales.forEach(function(s){
    var cnm=s.cnm||s.cli||'';if(!cnm)return;
    if(!map[cnm])map[cnm]={sales:0,paid:0};
    map[cnm].sales+=(+s.amt||0);
  });
  payments.forEach(function(p){
    if(p.type==='income'&&p.cnm&&map[p.cnm])map[p.cnm].paid+=(+p.amt||0);
  });
  return Object.entries(map).map(function(e){
    return{cnm:e[0],sales:e[1].sales,paid:e[1].paid,remain:e[1].sales-e[1].paid};
  }).filter(function(r){return r.remain>0}).sort(function(a,b){return b.remain-a.remain});
}
function calcPayables(){
  var purch=DB.g('purchase'),payments=DB.g('payments')||[];
  var map={};
  purch.forEach(function(p){
    var vnm=p.vnm||p.vendor||'';if(!vnm)return;
    if(!map[vnm])map[vnm]={purch:0,paid:0};
    map[vnm].purch+=(+p.amt||0);
  });
  payments.forEach(function(p){
    if(p.type==='expense'&&p.vnm&&map[p.vnm])map[p.vnm].paid+=(+p.amt||0);
  });
  return Object.entries(map).map(function(e){
    return{vnm:e[0],purch:e[1].purch,paid:e[1].paid,remain:e[1].purch-e[1].paid};
  }).filter(function(r){return r.remain>0}).sort(function(a,b){return b.remain-a.remain});
}
function renderReceivables(){
  var recv=calcReceivables(),pay=calcPayables();
  var totalRecv=recv.reduce(function(s,r){return s+r.remain},0);
  var totalPay=pay.reduce(function(s,r){return s+r.remain},0);
  var net=totalRecv-totalPay;
  var h='<div class="sg">';
  h+='<div class="sb red"><div class="l">총 미수금</div><div class="v">'+fmt(totalRecv)+'원</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">'+recv.length+'개 거래처</div></div>';
  h+='<div class="sb orange"><div class="l">총 미지급금</div><div class="v">'+fmt(totalPay)+'원</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">'+pay.length+'개 거래처</div></div>';
  h+='<div class="sb '+(net>=0?'green':'red')+'"><div class="l">순 채권</div><div class="v">'+fmt(net)+'원</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">'+(net>=0?'▲ 받을 돈 우세':'▼ 줄 돈 우세')+'</div></div>';
  h+='</div>';
  // 미수금 카드
  h+='<div class="card"><div class="card-t">미수금 (받을 돈)</div>';
  if(recv.length){
    h+='<table class="dt"><thead><tr><th>거래처</th><th style="text-align:right">매출액</th><th style="text-align:right">수금액</th><th style="text-align:right">미수잔액</th><th style="text-align:right">수금률</th><th>관리</th></tr></thead><tbody>';
    recv.sort(function(a,b){return b.remain-a.remain}).forEach(function(r){
      var pct=r.sales>0?Math.round(r.paid/r.sales*100):0;
      h+='<tr class="row-warn"><td style="font-weight:700">'+r.cnm+'</td><td style="text-align:right">'+fmt(r.sales)+'</td><td style="text-align:right;color:var(--suc)">'+fmt(r.paid)+'</td><td style="text-align:right;color:var(--dan);font-weight:800">'+fmt(r.remain)+'</td><td style="text-align:right"><div class="prog-bar" style="display:inline-block;width:80px;vertical-align:middle"><div class="fill" style="width:'+pct+'%;background:var(--suc)"></div></div> <span style="font-weight:700">'+pct+'%</span></td>';
      h+='<td><button class="btn btn-sm btn-s" onclick="addPayment(\'income\',\''+r.cnm+'\','+r.remain+')">입금 처리</button></td></tr>';
    });
    h+='</tbody></table>';
  }else h+='<div class="empty-state"><div class="msg">미수금 없음</div><div class="sub">모든 거래처가 완납 상태</div></div>';
  h+='</div>';
  // 미지급금 카드
  h+='<div class="card" style="margin-top:14px"><div class="card-t">미지급금 (줄 돈)</div>';
  if(pay.length){
    h+='<table class="dt"><thead><tr><th>거래처</th><th style="text-align:right">매입액</th><th style="text-align:right">지급액</th><th style="text-align:right">미지급잔액</th><th style="text-align:right">지급률</th><th>관리</th></tr></thead><tbody>';
    pay.sort(function(a,b){return b.remain-a.remain}).forEach(function(r){
      var pct=r.purch>0?Math.round(r.paid/r.purch*100):0;
      h+='<tr class="row-warn"><td style="font-weight:700">'+r.vnm+'</td><td style="text-align:right">'+fmt(r.purch)+'</td><td style="text-align:right;color:var(--suc)">'+fmt(r.paid)+'</td><td style="text-align:right;color:var(--wrn);font-weight:800">'+fmt(r.remain)+'</td><td style="text-align:right"><div class="prog-bar" style="display:inline-block;width:80px;vertical-align:middle"><div class="fill" style="width:'+pct+'%;background:var(--gold)"></div></div> <span style="font-weight:700">'+pct+'%</span></td>';
      h+='<td><button class="btn btn-sm btn-o" onclick="addPayment(\'expense\',\''+r.vnm+'\','+r.remain+')">지급 처리</button></td></tr>';
    });
    h+='</tbody></table>';
  }else h+='<div class="empty-state"><div class="msg">미지급금 없음</div><div class="sub">모든 매입처 정산 완료</div></div>';
  h+='</div>';
  return h;
}

/* ===== 2/10 입금/출금 관리 ===== */
function addPayment(type,name,maxAmt){
  var amtStr=prompt((type==='income'?'입금':'지급')+' 금액 (최대 '+fmt(maxAmt)+'원):');
  if(!amtStr)return;
  var amt=parseInt(amtStr.replace(/,/g,''));
  if(isNaN(amt)||amt<=0){toast('올바른 금액을 입력하세요','err');return}
  var payments=DB.g('payments');
  var entry={id:gid(),type:type,date:td(),amt:amt,note:''};
  if(type==='income')entry.cnm=name;
  else entry.vnm=name;
  payments.push(entry);DB.s('payments',payments);
  toast((type==='income'?'입금':'지급')+' '+fmt(amt)+'원 처리 완료','ok');
  addLog((type==='income'?'입금':'지급')+': '+name+' '+fmt(amt)+'원');
}
function renderPayments(){
  var payments=DB.g('payments');
  var income=payments.filter(function(p){return p.type==='income'});
  var expense=payments.filter(function(p){return p.type==='expense'});
  var totalIn=income.reduce(function(s,p){return s+(+p.amt||0)},0);
  var totalOut=expense.reduce(function(s,p){return s+(+p.amt||0)},0);
  var bal=totalIn-totalOut;
  // 7일 cashflow sparkline
  var days=[];
  for(var i=6;i>=0;i--){var d=new Date();d.setDate(d.getDate()-i);var ds=d.toISOString().slice(0,10);
    var din=income.filter(function(p){return p.date===ds}).reduce(function(s,p){return s+(+p.amt||0)},0);
    var dout=expense.filter(function(p){return p.date===ds}).reduce(function(s,p){return s+(+p.amt||0)},0);
    days.push({d:ds,in:din,out:dout,net:din-dout});
  }
  var maxNet=Math.max.apply(null,days.map(function(x){return Math.max(Math.abs(x.in),Math.abs(x.out))}))||1;
  var spk='<svg width="100%" height="40" viewBox="0 0 140 40" preserveAspectRatio="none" style="display:block;margin-top:8px"><polyline fill="rgba(14,140,87,.08)" stroke="none" points="0,40 '+days.map(function(x,i){return(i*140/6)+','+(35-(x.in/maxNet)*30)}).join(' ')+' 140,40"/><polyline fill="none" stroke="var(--suc)" stroke-width="1.5" points="'+days.map(function(x,i){return(i*140/6)+','+(35-(x.in/maxNet)*30)}).join(' ')+'"/><polyline fill="none" stroke="var(--dan)" stroke-width="1.5" stroke-dasharray="2,2" points="'+days.map(function(x,i){return(i*140/6)+','+(35-(x.out/maxNet)*30)}).join(' ')+'"/></svg>';
  var h='<div class="sg">';
  h+='<div class="sb green"><div class="l">총 입금</div><div class="v">'+fmt(totalIn)+'</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">'+income.length+'건</div></div>';
  h+='<div class="sb red"><div class="l">총 출금</div><div class="v">'+fmt(totalOut)+'</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">'+expense.length+'건</div></div>';
  h+='<div class="sb '+(bal>=0?'blue':'red')+'"><div class="l">잔액</div><div class="v">'+fmt(bal)+'</div>'+spk+'<div style="font-size:10px;color:var(--txt3);font-weight:600;display:flex;justify-content:space-between;margin-top:2px"><span style="color:var(--suc)">입금</span><span style="color:var(--dan)">출금</span></div></div>';
  h+='</div>';
  h+='<div class="card"><div class="card-t">입출금 이력</div>';
  if(payments.length){
    h+='<table class="dt"><thead><tr><th>일자</th><th>구분</th><th>거래처</th><th style="text-align:right">금액</th><th>비고</th></tr></thead><tbody>';
    payments.sort(function(a,b){return b.date>a.date?1:-1}).forEach(function(p){
      var isIn=p.type==='income';
      h+='<tr><td>'+p.date+'</td><td>'+(isIn?'<span class="bd bd-s">입금</span>':'<span class="bd bd-x">출금</span>')+'</td>';
      h+='<td style="font-weight:600">'+(p.cnm||p.vnm||'-')+'</td><td style="text-align:right;color:'+(isIn?'var(--suc)':'var(--dan)')+';font-weight:800">'+(isIn?'+':'-')+fmt(p.amt)+'</td><td style="color:var(--txt2)">'+(p.note||'-')+'</td></tr>';
    });
    h+='</tbody></table>';
  }else h+='<div class="empty-state"><div class="msg">입출금 기록 없음</div></div>';
  h+='</div>';
  return h;
}

/* ===== 3/10 거래명세서 PDF ===== */
function genTradeStatement(saleId){
  var sales=DB.g('sales'),s=sales.find(function(x){return x.id===saleId});
  if(!s){toast('매출 데이터 없음','err');return}
  var cli=DB.g('cli').find(function(c){return c.nm===s.cnm})||{};
  var w=window.open('','_blank');
  w.document.write('<html><head><title>거래명세서</title><style>');
  w.document.write('body{font-family:Pretendard,sans-serif;padding:40px;max-width:800px;margin:0 auto}');
  w.document.write('.header{text-align:center;border-bottom:3px double #333;padding-bottom:16px;margin-bottom:24px}');
  w.document.write('.header h1{font-size:24px;margin:0}');
  w.document.write('.info{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}');
  w.document.write('.info-box{border:1px solid #ddd;padding:16px;border-radius:4px}');
  w.document.write('.info-box h3{margin:0 0 8px;font-size:14px;color:#666}');
  w.document.write('.info-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}');
  w.document.write('table{width:100%;border-collapse:collapse;margin:16px 0}');
  w.document.write('th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px}');
  w.document.write('th{background:#f5f5f5;font-weight:700}');
  w.document.write('.total{text-align:right;font-size:18px;font-weight:800;margin-top:16px}');
  w.document.write('.footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #ddd;font-size:11px;color:#999}');
  w.document.write('@media print{body{padding:20px}}');
  w.document.write('</style></head><body>');
  w.document.write('<div class="header"><h1>거 래 명 세 서</h1><p>'+td()+'</p></div>');
  w.document.write('<div class="info"><div class="info-box"><h3>공급자</h3>');
  w.document.write('<div class="info-row"><span>상호</span><span>이노패키지</span></div>');
  w.document.write('<div class="info-row"><span>주소</span><span>경기도 파주시</span></div>');
  w.document.write('</div><div class="info-box"><h3>공급받는자</h3>');
  w.document.write('<div class="info-row"><span>상호</span><span>'+(s.cnm||'-')+'</span></div>');
  w.document.write('<div class="info-row"><span>주소</span><span>'+(cli.addr||'-')+'</span></div>');
  w.document.write('<div class="info-row"><span>연락처</span><span>'+(cli.tel||'-')+'</span></div>');
  w.document.write('</div></div>');
  w.document.write('<table><thead><tr><th>품목</th><th>규격</th><th>수량</th><th>단가</th><th>공급가액</th></tr></thead><tbody>');
  var amt=+s.amt||0;var qty=+s.qty||1;var unit=qty>0?Math.round(amt/qty):amt;
  w.document.write('<tr><td>'+(s.pnm||s.item||'-')+'</td><td>'+(s.spec||'-')+'</td><td>'+fmt(qty)+'</td><td>'+fmt(unit)+'</td><td>'+fmt(amt)+'</td></tr>');
  w.document.write('</tbody></table>');
  var vat=Math.round(amt*0.1);
  w.document.write('<div class="total">공급가액: '+fmt(amt)+'원 | 세액: '+fmt(vat)+'원 | <strong>합계: '+fmt(amt+vat)+'원</strong></div>');
  w.document.write('<div class="footer">이노패키지 | 위 금액을 명세서와 같이 청구합니다</div>');
  w.document.write('</body></html>');
  w.document.close();w.focus();
}

/* ===== 4/10 발주서→입고 자동연동 ===== */
function poToIncome(poId){
  var pos=DB.g('po'),po=pos.find(function(x){return x.id===poId});
  if(!po){toast('발주서를 찾을 수 없습니다','err');return}
  if(!confirm('['+po.vnm+'] '+po.item+' 입고 처리하시겠습니까?'))return;
  // 입고 등록
  var incomes=DB.g('income');
  incomes.push({id:gid(),date:td(),vnm:po.vnm,item:po.item,qty:po.qty,unit:po.unit||0,amt:po.amt||0,poId:poId,note:'발주서 자동입고'});
  DB.s('income',incomes);
  // 재고 반영
  var stocks=DB.g('stock');
  var si=stocks.findIndex(function(s){return s.nm===po.item});
  if(si>=0){stocks[si].qty=(+stocks[si].qty||0)+(+po.qty||0);stocks[si].updated=td()}
  else{stocks.push({id:gid(),nm:po.item,cat:'원자재',qty:+po.qty||0,unit:po.unit||0,min:10,updated:td()})}
  DB.s('stock',stocks);
  // 발주서 상태 업데이트
  var pi=pos.findIndex(function(x){return x.id===poId});
  if(pi>=0){pos[pi].st='입고완료';pos[pi].inDate=td();DB.s('po',pos)}
  toast('입고 완료 + 재고 반영','ok');
  addLog('발주-입고: '+po.item+' '+po.qty);
  if(typeof rPO==='function')rPO();if(typeof rIncome==='function')rIncome();if(typeof rStock==='function')rStock();
}

/* ===== 5/10 매출/매입 자동집계 ===== */

/* ===== 6/10 재고 실사 ===== */
function startStockAudit(){
  var stocks=DB.g('stock');
  if(!stocks.length){toast('재고 데이터가 없습니다','err');return}
  var h='<div class="mo-t">재고 실사<button class="mo-x" onclick="cMo(\'auditMo\')">×</button></div><div class="mo-b">';
  h+='<table class="dt"><thead><tr><th>자재명</th><th>장부수량</th><th>실사수량</th><th>차이</th></tr></thead><tbody>';
  stocks.forEach(function(s,i){
    h+='<tr><td>'+s.nm+'</td><td>'+fmt(s.qty)+'</td>';
    h+='<td><input type="number" id="audit_'+i+'" value="'+s.qty+'" style="width:80px;padding:4px;border:1px solid var(--bdr);border-radius:4px;text-align:right" onchange="calcAuditDiff('+i+','+s.qty+')"></td>';
    h+='<td id="auditDiff_'+i+'" style="font-weight:700">0</td></tr>';
  });
  h+='</tbody></table>';
  h+='<div style="text-align:right;margin-top:12px"><button class="btn btn-p" onclick="applyAudit()">실사 반영</button></div></div>';
  oMo('auditMo');$('auditMo').innerHTML=h;
}
function calcAuditDiff(idx,bookQty){
  var input=$('audit_'+idx);
  var actual=+(input?input.value:bookQty);
  var diff=actual-bookQty;
  var el=$('auditDiff_'+idx);
  if(el){el.textContent=(diff>0?'+':'')+diff;el.style.color=diff===0?'var(--txt2)':diff>0?'#10B981':'#EF4444'}
}
function applyAudit(){
  if(!confirm('실사 결과를 재고에 반영하시겠습니까?'))return;
  var stocks=DB.g('stock');
  var changes=0;
  stocks.forEach(function(s,i){
    var input=$('audit_'+i);if(!input)return;
    var actual=+input.value;
    if(actual!==s.qty){stocks[i].qty=actual;stocks[i].auditDate=td();changes++}
  });
  DB.s('stock',stocks);cMo('auditMo');
  toast(changes+'건 재고 조정 완료','ok');
  addLog('재고 실사: '+changes+'건 조정');
  if(typeof rStock==='function')rStock();
}

/* ===== 7/10 연차 자동계산 ===== */
function calcAutoLeave(emp){
  if(!emp||!emp.joinDate)return 0;
  var join=new Date(emp.joinDate);
  var now=new Date();
  var years=now.getFullYear()-join.getFullYear();
  var months=Math.floor((now-join)/(1000*60*60*24*30));
  // 1년 미만: 월 1개씩
  if(months<12)return months;
  // 1~3년: 15일
  if(years<=3)return 15;
  // 3년 초과: 15 + 2년마다 1일 (최대 25)
  return Math.min(25, 15+Math.floor((years-1)/2));
}
function renderLeaveAuto(){
  var emps=DB.g('emp'),leaves=DB.g('leave');
  var h='<div class="card-t" style="margin-bottom:12px">연차 자동 계산</div>';
  h+='<table class="dt"><thead><tr><th>이름</th><th>입사일</th><th>근속</th><th>법정연차</th><th>사용</th><th>잔여</th></tr></thead><tbody>';
  emps.forEach(function(e){
    var total=calcAutoLeave(e);
    var used=leaves.filter(function(l){return l.empNm===e.nm&&l.type==='연차'}).length;
    var remain=total-used;
    var color=remain<=2?'#EF4444':remain<=5?'#F59E0B':'#10B981';
    var join=e.joinDate?new Date(e.joinDate):null;
    var years=join?Math.floor((new Date()-join)/(1000*60*60*24*365)):0;
    h+='<tr><td><strong>'+e.nm+'</strong></td><td>'+(e.joinDate||'-')+'</td><td>'+years+'년</td>';
    h+='<td>'+total+'일</td><td>'+used+'일</td><td style="color:'+color+';font-weight:700">'+remain+'일</td></tr>';
  });
  h+='</tbody></table>';
  return h;
}

/* ===== 8/10 거래처 계약 관리 ===== */
function renderContracts(){
  var contracts=DB.g('contracts');
  var h='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div class="card-t">거래처 계약 관리</div>';
  h+='<button class="btn btn-sm btn-p" onclick="addContract()">+ 계약 등록</button></div>';
  if(!contracts.length)return h+'<div style="text-align:center;padding:20px;color:var(--txt3)">등록된 계약이 없습니다</div>';
  h+='<table class="dt"><thead><tr><th>거래처</th><th>계약유형</th><th>단가</th><th>계약시작</th><th>계약종료</th><th>상태</th><th>관리</th></tr></thead><tbody>';
  contracts.forEach(function(c){
    var expired=c.endDate&&c.endDate<td();
    var soon=c.endDate&&!expired&&c.endDate<=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
    var stBd=expired?'bd-x':soon?'bd-o':'bd-d';
    var stTxt=expired?'만료':soon?'갱신임박':'유효';
    h+='<tr><td><strong>'+c.cnm+'</strong></td><td>'+c.type+'</td><td>'+fmt(c.unitPrice||0)+'원</td>';
    h+='<td>'+c.startDate+'</td><td>'+c.endDate+'</td><td><span class="bd '+stBd+'">'+stTxt+'</span></td>';
    h+='<td><button class="btn btn-sm btn-d" onclick="delContract(\''+c.id+'\')">삭제</button></td></tr>';
  });
  h+='</tbody></table>';
  return h;
}
function addContract(){
  var cnm=prompt('거래처명:');if(!cnm)return;
  var type=prompt('계약유형 (단가계약/납품계약/연간계약):','단가계약');
  var price=prompt('계약 단가:','0');
  var start=prompt('계약시작일 (YYYY-MM-DD):',td());
  var end=prompt('계약종료일 (YYYY-MM-DD):',new Date(Date.now()+365*86400000).toISOString().slice(0,10));
  var contracts=DB.g('contracts');
  contracts.push({id:gid(),cnm:cnm,type:type||'단가계약',unitPrice:+price||0,startDate:start,endDate:end,cat:td()});
  DB.s('contracts',contracts);
  toast('계약 등록 완료','ok');addLog('계약 등록: '+cnm);
}
function delContract(id){
  if(!confirm('삭제하시겠습니까?'))return;
  var cs=DB.g('contracts').filter(function(c){return c.id!==id});
  DB.s('contracts',cs);toast('삭제 완료','ok');
}

/* ===== 9/10 급여 자동 계산 ===== */
function calcPayroll(emp){
  var base=+emp.basePay||+emp.salary||2500000;
  var overtime=+emp.overtime||0;
  var otPay=Math.round(base/209*1.5*overtime);
  var gross=base+otPay+(+emp.allowance||0);
  // 공제
  var nps=Math.round(gross*0.045); // 국민연금 4.5%
  var hi=Math.round(gross*0.03545); // 건강보험 3.545%
  var ei=Math.round(gross*0.009); // 고용보험 0.9%
  var ltci=Math.round(hi*0.1227); // 장기요양 12.27%
  var tax=Math.round(gross*0.033); // 간이세 약 3.3%
  var deductions=nps+hi+ei+ltci+tax;
  var net=gross-deductions;
  return{base:base,otPay:otPay,allowance:+emp.allowance||0,gross:gross,nps:nps,hi:hi,ei:ei,ltci:ltci,tax:tax,deductions:deductions,net:net};
}
function renderPayrollAuto(){
  var emps=DB.g('emp');
  var h='<div class="card-t" style="margin-bottom:12px">급여 자동 계산</div>';
  var totalNet=0;
  h+='<table class="dt"><thead><tr><th>이름</th><th>기본급</th><th>연장수당</th><th>총지급</th><th>공제합</th><th>실수령</th></tr></thead><tbody>';
  emps.forEach(function(e){
    var p=calcPayroll(e);totalNet+=p.net;
    h+='<tr><td><strong>'+e.nm+'</strong></td><td>'+fmt(p.base)+'</td><td>'+fmt(p.otPay)+'</td>';
    h+='<td>'+fmt(p.gross)+'</td><td style="color:#EF4444">-'+fmt(p.deductions)+'</td>';
    h+='<td style="font-weight:700;color:#10B981">'+fmt(p.net)+'</td></tr>';
  });
  h+='</tbody></table>';
  h+='<div style="text-align:right;font-size:14px;font-weight:800;margin-top:8px;color:var(--pri)">총 인건비: '+fmt(totalNet)+'원</div>';
  return h;
}

/* ===== 10/10 경영 CEO 대시보드 ===== */
function renderCEODash(){
  var os=DB.g('wo'),sales=DB.g('sales'),purch=DB.g('purchase'),emps=DB.g('emp'),recv=calcReceivables();
  // 매출
  var mo=td().slice(0,7);
  var moSales=sales.filter(function(s){return(s.date||'').indexOf(mo)===0}).reduce(function(sum,s){return sum+(+s.amt||0)},0);
  var moPurch=purch.filter(function(p){return(p.date||'').indexOf(mo)===0}).reduce(function(sum,p){return sum+(+p.amt||0)},0);
  // 생산
  var totalWO=os.length;var doneWO=os.filter(function(o){return o.status==='완료'||o.status==='출고완료'}).length;
  var lateWO=os.filter(function(o){return o.sd&&o.sd<td()&&o.status!=='완료'&&o.status!=='출고완료'}).length;
  var rate=totalWO>0?Math.round(doneWO/totalWO*100):0;
  // 미수금
  var totalRecv=recv.reduce(function(s,r){return s+r.remain},0);
  // 인건비
  var totalLabor=emps.reduce(function(s,e){return s+calcPayroll(e).net},0);
  // 손익
  var profit=moSales-moPurch;
  var profitRate=moSales>0?Math.round(profit/moSales*100):0;

  var h='<div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">';
  h+=kpiCard('이번달 매출','#10B981',fmt(moSales)+'원','전체 '+sales.length+'건');
  h+=kpiCard('이번달 매입','#F59E0B',fmt(moPurch)+'원','전체 '+purch.length+'건');
  h+=kpiCard('손익','#3182F6',fmt(profit)+'원',profitRate+'% 수익률');
  h+=kpiCard('미수금','#EF4444',fmt(totalRecv)+'원',recv.length+'개 거래처');
  h+=kpiCard('생산 달성률','#7B61FF',rate+'%',doneWO+'/'+totalWO+'건 완료');
  h+=kpiCard('지연 작업','#EF4444',lateWO+'건',lateWO>0?'긴급 확인 필요':'양호');
  h+=kpiCard('인건비','#F97316',fmt(totalLabor)+'원',emps.length+'명');
  h+=kpiCard('인건비 비중','#EC4899',(moSales>0?Math.round(totalLabor/moSales*100):0)+'%','매출 대비');
  h+='</div>';
  // 거래처 TOP5
  h+='<div class="card-t" style="margin-top:20px">거래처 매출 TOP 5</div>';
  h+='<div class="cli-dash-grid">';h+=renderCliDash();h+='</div>';
  return h;
}
function kpiCard(label,color,value,sub){
  return '<div class="kpi-card" style="border-left:4px solid '+color+'"><div class="kpi-label">'+label+'</div><div class="kpi-value" style="color:'+color+'">'+value+'</div><div class="kpi-sub">'+(sub||'')+'</div></div>';
}


/* ========================================
   ERP 고도화 14개 기능 - Part 1
   ======================================== */

/* ===== A1. 매출 월별 비교표 + 전년대비 ===== */
function renderSalesMonthly(){
  var sales=DB.g('sales'),now=new Date(),y=now.getFullYear(),py=y-1;
  var months={};
  for(var m=1;m<=12;m++){
    var mk=String(m).padStart(2,'0');
    months[mk]={cur:0,prev:0};
  }
  sales.forEach(function(s){
    if(!s.dt)return;
    var sy=parseInt(s.dt.slice(0,4)),sm=s.dt.slice(5,7);
    if(sy===y&&months[sm])months[sm].cur+=(+s.amt||0);
    if(sy===py&&months[sm])months[sm].prev+=(+s.amt||0);
  });
  var h='<div class="card-t" style="margin-bottom:12px">월별 매출 비교 ('+y+' vs '+py+')</div>';
  h+='<table class="dt"><thead><tr><th>월</th><th>'+py+'년</th><th>'+y+'년</th><th>증감</th><th>증감률</th><th>그래프</th></tr></thead><tbody>';
  var totalCur=0,totalPrev=0,maxAmt=0;
  Object.keys(months).forEach(function(m){maxAmt=Math.max(maxAmt,months[m].cur,months[m].prev)});
  Object.keys(months).sort().forEach(function(m){
    var c=months[m].cur,p=months[m].prev;
    totalCur+=c;totalPrev+=p;
    var diff=c-p,rate=p>0?Math.round((diff/p)*100):c>0?100:0;
    var color=diff>0?'#10B981':diff<0?'#EF4444':'var(--txt3)';
    var arrow=diff>0?'▲':diff<0?'▼':'─';
    var barW=maxAmt>0?Math.round(c/maxAmt*100):0;
    var barP=maxAmt>0?Math.round(p/maxAmt*100):0;
    h+='<tr><td><strong>'+m+'월</strong></td><td>'+fmt(p)+'</td><td style="font-weight:700">'+fmt(c)+'</td>';
    h+='<td style="color:'+color+'">'+arrow+' '+fmt(Math.abs(diff))+'</td>';
    h+='<td style="color:'+color+';font-weight:700">'+(diff>0?'+':'')+rate+'%</td>';
    h+='<td style="width:150px"><div style="height:8px;background:#E5E7EB;border-radius:4px;position:relative;margin-bottom:2px"><div style="height:100%;width:'+barW+'%;background:#3B82F6;border-radius:4px"></div></div>';
    h+='<div style="height:6px;background:#E5E7EB;border-radius:3px"><div style="height:100%;width:'+barP+'%;background:#D1D5DB;border-radius:3px"></div></div></td></tr>';
  });
  var tDiff=totalCur-totalPrev,tRate=totalPrev>0?Math.round((tDiff/totalPrev)*100):0;
  h+='<tr style="font-weight:800;background:var(--bg)"><td>합계</td><td>'+fmt(totalPrev)+'</td><td>'+fmt(totalCur)+'</td>';
  h+='<td style="color:'+(tDiff>=0?'#10B981':'#EF4444')+'">'+(tDiff>=0?'▲':'▼')+' '+fmt(Math.abs(tDiff))+'</td>';
  h+='<td style="color:'+(tDiff>=0?'#10B981':'#EF4444')+'">'+(tDiff>=0?'+':'')+tRate+'%</td><td></td></tr>';
  h+='</tbody></table>';
  return h;
}

/* ===== A2. 거래처별 매출추이 그래프 ===== */
function renderSalesTrend(){
  var sales=DB.g('sales'),now=new Date(),y=now.getFullYear();
  var cliMap={};
  sales.forEach(function(s){
    if(!s.dt||!s.cli)return;
    if(parseInt(s.dt.slice(0,4))!==y)return;
    if(!cliMap[s.cli])cliMap[s.cli]={};
    var m=s.dt.slice(5,7);
    cliMap[s.cli][m]=(cliMap[s.cli][m]||0)+(+s.amt||0);
  });
  var clients=Object.keys(cliMap).sort(function(a,b){
    var ta=Object.values(cliMap[a]).reduce(function(s,v){return s+v},0);
    var tb=Object.values(cliMap[b]).reduce(function(s,v){return s+v},0);
    return tb-ta;
  }).slice(0,5);
  var colors=['#3B82F6','#10B981','#F59E0B','#EF4444','#7B61FF'];
  var maxVal=0;
  clients.forEach(function(c){Object.values(cliMap[c]).forEach(function(v){if(v>maxVal)maxVal=v})});
  var h='<div class="card-t" style="margin-bottom:12px">거래처별 매출 추이 (TOP 5)</div>';
  // SVG 차트
  var W=600,H=250,P=50,GW=W-P*2,GH=H-P-20;
  h+='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:640px;font-family:Pretendard,sans-serif">';
  // 그리드
  for(var g=0;g<=4;g++){
    var gy=P+GH-GH*(g/4);
    h+='<line x1="'+P+'" y1="'+gy+'" x2="'+(W-P)+'" y2="'+gy+'" stroke="#E5E7EB" stroke-width="1"/>';
    h+='<text x="'+(P-5)+'" y="'+(gy+4)+'" text-anchor="end" font-size="9" fill="#9CA3AF">'+fmt(Math.round(maxVal*g/4))+'</text>';
  }
  // 월 라벨
  for(var m=1;m<=12;m++){
    var mx=P+GW*((m-0.5)/12);
    h+='<text x="'+mx+'" y="'+(H-5)+'" text-anchor="middle" font-size="9" fill="#6B7280">'+m+'월</text>';
  }
  // 라인
  clients.forEach(function(cli,ci){
    var pts=[];
    for(var m=1;m<=12;m++){
      var mk=String(m).padStart(2,'0');
      var val=cliMap[cli][mk]||0;
      var x=P+GW*((m-0.5)/12);
      var yy=P+GH-GH*(val/(maxVal||1));
      pts.push(x+','+yy);
    }
    h+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+colors[ci]+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    // 점
    pts.forEach(function(pt){var xy=pt.split(',');h+='<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="3" fill="'+colors[ci]+'"/>'});
  });
  h+='</svg>';
  // 범례
  h+='<div style="display:flex;gap:16px;justify-content:center;margin-top:8px;flex-wrap:wrap">';
  clients.forEach(function(cli,ci){
    var total=Object.values(cliMap[cli]).reduce(function(s,v){return s+v},0);
    h+='<div style="font-size:12px;display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:'+colors[ci]+'"></span>'+cli+' ('+fmt(total)+')</div>';
  });
  h+='</div>';
  return h;
}

/* ===== A3. 외상 마감 기능 ===== */
function renderClosing(){
  var now=new Date(),y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0');
  var closings=DB.g('closings');
  var thisMonth=y+'-'+m;
  var closed=closings.find(function(c){return c.month===thisMonth});
  var recv=calcReceivables(),pay=calcPayables();
  var totalRecv=recv.reduce(function(s,r){return s+r.remain},0);
  var totalPay=pay.reduce(function(s,r){return s+r.remain},0);
  var h='<div class="sg">';
  h+='<div class="sb red"><div class="l">미수금 잔액</div><div class="v">'+fmt(totalRecv)+'</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">'+recv.length+'건</div></div>';
  h+='<div class="sb orange"><div class="l">미지급 잔액</div><div class="v">'+fmt(totalPay)+'</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">'+pay.length+'건</div></div>';
  h+='<div class="sb '+(closed?'green':'purple')+'"><div class="l">마감 상태</div><div class="v">'+(closed?'✓ 마감':'미마감')+'</div><div style="font-size:11px;color:var(--txt2);margin-top:6px;font-weight:600">'+(closed?closed.date:thisMonth)+'</div></div>';
  h+='</div>';
  if(!closed){
    h+='<div class="fbar"><div class="fbar-row"><span class="fbar-label">'+thisMonth+' 마감</span><div class="fbar-spacer"></div><button class="btn btn-p btn-sm" onclick="doClosing(\''+thisMonth+'\')">마감 처리</button></div></div>';
  }
  h+='<div class="card"><div class="card-t">마감 대상 상세</div>';
  if(recv.length+pay.length){
    h+='<table class="dt"><thead><tr><th>구분</th><th>거래처</th><th style="text-align:right">총액</th><th style="text-align:right">잔액</th></tr></thead><tbody>';
    recv.forEach(function(r){h+='<tr class="row-warn"><td><span class="bd bd-x">미수</span></td><td style="font-weight:700">'+r.cnm+'</td><td style="text-align:right">'+fmt(r.sales)+'</td><td style="text-align:right;color:var(--dan);font-weight:800">'+fmt(r.remain)+'</td></tr>'});
    pay.forEach(function(r){h+='<tr class="row-warn"><td><span class="bd bd-o">미지급</span></td><td style="font-weight:700">'+r.vnm+'</td><td style="text-align:right">'+fmt(r.purch)+'</td><td style="text-align:right;color:var(--wrn);font-weight:800">'+fmt(r.remain)+'</td></tr>'});
    h+='</tbody></table>';
  }else h+='<div class="empty-state"><div class="msg">마감할 항목 없음</div></div>';
  h+='</div>';
  return h;
}
function doClosing(month){
  if(!confirm(month+' 외상 마감을 처리합니다.\n마감 후에는 해당 월 데이터 수정이 제한됩니다.'))return;
  var closings=DB.g('closings');
  closings.push({month:month,date:td(),user:CU?CU.nm:'admin',recvTotal:calcReceivables().reduce(function(s,r){return s+r.remain},0),payTotal:calcPayables().reduce(function(s,r){return s+r.remain},0)});
  DB.s('closings',closings);
  toast(month+' 마감 완료','ok');
  addLog('외상 마감: '+month);
  goMod('acc-recv');
}

/* ===== B1. 입출고 이력 추적 (LOT번호) ===== */
function renderStockHistory(){
  var incomes=DB.g('income'),stocks=DB.g('stock');
  var h='<div class="card-t" style="margin-bottom:12px">입출고 이력 (LOT 추적)</div>';
  h+='<table class="dt"><thead><tr><th>일자</th><th>LOT번호</th><th>자재명</th><th>구분</th><th>수량</th><th>거래처</th><th>비고</th></tr></thead><tbody>';
  // 입고 이력
  incomes.sort(function(a,b){return(b.date||'')>(a.date||'')?1:-1}).forEach(function(inc,i){
    var lot='LOT-'+((inc.date||'').replace(/-/g,''))+'-'+String(i+1).padStart(3,'0');
    h+='<tr><td>'+(inc.date||'')+'</td><td><span style="font-family:monospace;background:#EFF6FF;padding:2px 6px;border-radius:4px;font-size:11px;color:#2563EB">'+lot+'</span></td>';
    h+='<td><strong>'+(inc.item||'')+'</strong></td><td><span class="bd bd-d">입고</span></td>';
    h+='<td>'+fmt(inc.qty||0)+'</td><td>'+(inc.vnm||'')+'</td><td>'+(inc.note||'')+'</td></tr>';
  });
  // 작업 소모 이력 (BOM 기반)
  var os=DB.g('wo').filter(function(o){return o.status==='완료'||o.status==='출고완료'});
  var boms=DB.g('bom');
  os.forEach(function(o){
    var bom=boms.find(function(b){return b.pnm===o.pnm});
    if(!bom||!bom.items)return;
    bom.items.forEach(function(item){
      var useQty=Math.round((+item.qty||0)*(+o.qm||0));
      h+='<tr><td>'+(o.compDate||o.dt||'')+'</td><td><span style="font-family:monospace;background:#FEF3C7;padding:2px 6px;border-radius:4px;font-size:11px;color:#D97706">USE-'+(o.num||'').replace('WO-','')+'</span></td>';
      h+='<td><strong>'+item.nm+'</strong></td><td><span class="bd bd-x">출고</span></td>';
      h+='<td style="color:#EF4444">-'+fmt(useQty)+'</td><td>'+o.pnm+'</td><td>'+(o.cnm||'')+'</td></tr>';
    });
  });
  h+='</tbody></table>';
  return h;
}

/* ===== B2. 재고 ABC분석 ===== */
function renderStockABC(){
  var stocks=DB.g('stock');
  var items=stocks.map(function(s){return{nm:s.nm,qty:+s.qty||0,unit:+s.unit||0,value:(+s.qty||0)*(+s.unit||0)}}).sort(function(a,b){return b.value-a.value});
  var totalValue=items.reduce(function(s,i){return s+i.value},0);
  var cumul=0;
  items.forEach(function(item){cumul+=item.value;item.pct=totalValue>0?Math.round(cumul/totalValue*100):0;item.grade=item.pct<=70?'A':item.pct<=90?'B':'C'});
  var gradeColors={A:'#EF4444',B:'#F59E0B',C:'#10B981'};
  var gradeCounts={A:0,B:0,C:0};
  items.forEach(function(i){gradeCounts[i.grade]++});
  var h='<div class="card-t" style="margin-bottom:12px">재고 ABC 분석 (금액 기준)</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">';
  h+='<div class="kpi-card" style="border-left:4px solid #EF4444"><div class="kpi-label">A등급 (상위70%)</div><div class="kpi-value" style="color:#EF4444">'+gradeCounts.A+'종</div><div class="kpi-sub">핵심관리 필요</div></div>';
  h+='<div class="kpi-card" style="border-left:4px solid #F59E0B"><div class="kpi-label">B등급 (70~90%)</div><div class="kpi-value" style="color:#F59E0B">'+gradeCounts.B+'종</div><div class="kpi-sub">정기관리</div></div>';
  h+='<div class="kpi-card" style="border-left:4px solid #10B981"><div class="kpi-label">C등급 (하위10%)</div><div class="kpi-value" style="color:#10B981">'+gradeCounts.C+'종</div><div class="kpi-sub">일반관리</div></div></div>';
  h+='<table class="dt"><thead><tr><th>등급</th><th>자재명</th><th>수량</th><th>단가</th><th>재고금액</th><th>누적비율</th><th>비중</th></tr></thead><tbody>';
  items.forEach(function(item){
    var pctBar=totalValue>0?Math.round(item.value/totalValue*100):0;
    h+='<tr><td><span style="display:inline-block;width:28px;height:28px;line-height:28px;text-align:center;border-radius:50%;background:'+gradeColors[item.grade]+';color:#fff;font-weight:800;font-size:13px">'+item.grade+'</span></td>';
    h+='<td><strong>'+item.nm+'</strong></td><td>'+fmt(item.qty)+'</td><td>'+fmt(item.unit)+'</td>';
    h+='<td style="font-weight:700">'+fmt(item.value)+'</td><td>'+item.pct+'%</td>';
    h+='<td style="width:100px"><div style="height:8px;background:#E5E7EB;border-radius:4px"><div style="height:100%;width:'+pctBar+'%;background:'+gradeColors[item.grade]+';border-radius:4px"></div></div></td></tr>';
  });
  h+='</tbody></table>';
  return h;
}

/* ===== B3. 리드타임/발주점 관리 ===== */
function renderLeadTime(){
  var pos=DB.g('po'),stocks=DB.g('stock');
  // 거래처별 리드타임 계산
  var vendorLT={};
  pos.forEach(function(p){
    if(p.st==='입고완료'&&p.dt&&p.inDate){
      var days=Math.ceil((new Date(p.inDate)-new Date(p.dt))/(86400000));
      if(!vendorLT[p.vnm])vendorLT[p.vnm]=[];
      vendorLT[p.vnm].push({item:p.item,days:days});
    }
  });
  var h='<div class="card-t" style="margin-bottom:12px">리드타임 & 발주점 관리</div>';
  // 리드타임 표
  h+='<table class="dt" style="margin-bottom:16px"><thead><tr><th>거래처</th><th>품목</th><th>리드타임</th><th>평균</th><th>추천 발주점</th></tr></thead><tbody>';
  Object.keys(vendorLT).forEach(function(vnm){
    var items=vendorLT[vnm];
    var avgDays=Math.round(items.reduce(function(s,i){return s+i.days},0)/items.length);
    items.forEach(function(item,i){
      // 발주점 = 일일소모량 × 리드타임 × 1.5(안전계수)
      var stk=stocks.find(function(s){return s.nm===item.item});
      var dailyUse=stk?Math.round((+stk.qty||0)/30):0;
      var reorderPt=dailyUse*avgDays*1.5;
      h+='<tr>'+(i===0?'<td rowspan="'+items.length+'"><strong>'+vnm+'</strong></td>':'');
      h+='<td>'+item.item+'</td><td>'+item.days+'일</td>';
      h+=(i===0?'<td rowspan="'+items.length+'" style="font-weight:700;color:var(--pri)">'+avgDays+'일</td>':'');
      h+='<td>'+(reorderPt>0?fmt(Math.round(reorderPt))+' 이하 시 발주':'데이터 부족')+'</td></tr>';
    });
  });
  if(!Object.keys(vendorLT).length)h+='<tr><td colspan="5" style="text-align:center;color:var(--txt3)">입고완료된 발주서가 필요합니다</td></tr>';
  h+='</tbody></table>';
  // 현재 재고 vs 발주점
  h+='<div class="card-t" style="margin-bottom:8px">발주 필요 자재</div>';
  var needOrder=stocks.filter(function(s){return(+s.qty||0)<=(+s.min||10)*1.5});
  if(needOrder.length){
    h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">';
    needOrder.forEach(function(s){
      var pct=(+s.min||10)>0?Math.round((+s.qty||0)/(+s.min||10)*100):100;
      var color=pct<=50?'#EF4444':pct<=100?'#F59E0B':'#10B981';
      h+='<div style="background:var(--card);border:1px solid var(--bdr);border-radius:10px;padding:12px;border-left:4px solid '+color+'">';
      h+='<div style="font-weight:700;font-size:13px">'+s.nm+'</div>';
      h+='<div style="font-size:12px;color:var(--txt2);margin:4px 0">현재 '+fmt(s.qty)+' / 최소 '+fmt(s.min||10)+'</div>';
      h+='<div style="height:6px;background:#E5E7EB;border-radius:3px"><div style="height:100%;width:'+Math.min(100,pct)+'%;background:'+color+';border-radius:3px"></div></div>';
      h+='</div>';
    });
    h+='</div>';
  }else h+='<div style="text-align:center;padding:12px;color:var(--txt3)">현재 발주 필요 자재 없음</div>';
  return h;
}

/* ===== C1. 급여명세서 PDF ===== */

/* ===== C2. 출퇴근 월별통계 + 잔업집계 ===== */
function renderAttStats(){
  var emps=DB.g('emp'),atts=DB.g('att');
  var now=new Date(),y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0');
  var mo=y+'-'+m;
  var moAtts=atts.filter(function(a){return(a.date||'').startsWith(mo)});
  var h='<div class="card-t" style="margin-bottom:12px">'+mo+' 출퇴근 통계</div>';
  h+='<table class="dt"><thead><tr><th>이름</th><th>출근</th><th>지각</th><th>결근</th><th>잔업(h)</th><th>출근율</th><th>추이</th></tr></thead><tbody>';
  // 이번달 영업일수
  var bizDays=0;
  for(var d=1;d<=new Date(y,now.getMonth()+1,0).getDate();d++){
    var dow=new Date(y,now.getMonth(),d).getDay();
    if(dow!==0&&dow!==6)bizDays++;
  }
  var pastBiz=0;
  for(var d=1;d<=Math.min(now.getDate(),new Date(y,now.getMonth()+1,0).getDate());d++){
    var dow=new Date(y,now.getMonth(),d).getDay();
    if(dow!==0&&dow!==6)pastBiz++;
  }
  emps.forEach(function(emp){
    var ea=moAtts.filter(function(a){return a.empNm===emp.nm});
    var present=ea.length;
    var late=ea.filter(function(a){return a.status==='지각'}).length;
    var absent=pastBiz-present;if(absent<0)absent=0;
    // 잔업: 17:30 이후 분
    var otMin=0;
    ea.forEach(function(a){
      if(a.outTime){
        var parts=a.outTime.split(':');
        var h2=parseInt(parts[0]),m2=parseInt(parts[1]||0);
        var overMin=(h2*60+m2)-(17*60+30);
        if(overMin>0)otMin+=overMin;
      }
    });
    var otHrs=Math.round(otMin/60*10)/10;
    var rate=pastBiz>0?Math.round(present/pastBiz*100):100;
    var rateColor=rate>=95?'#10B981':rate>=80?'#F59E0B':'#EF4444';
    var barW=Math.min(100,rate);
    h+='<tr><td><strong>'+emp.nm+'</strong></td><td>'+present+'일</td>';
    h+='<td style="color:'+(late>0?'#F59E0B':'var(--txt3)')+'">'+late+'</td>';
    h+='<td style="color:'+(absent>0?'#EF4444':'var(--txt3)')+'">'+absent+'</td>';
    h+='<td style="font-weight:700;color:'+(otHrs>20?'#EF4444':'var(--txt1)')+'">'+otHrs+'h</td>';
    h+='<td style="font-weight:700;color:'+rateColor+'">'+rate+'%</td>';
    h+='<td style="width:80px"><div style="height:8px;background:#E5E7EB;border-radius:4px"><div style="height:100%;width:'+barW+'%;background:'+rateColor+';border-radius:4px"></div></div></td></tr>';
  });
  h+='</tbody></table>';
  h+='<div style="font-size:11px;color:var(--txt3);margin-top:8px">영업일: '+pastBiz+'/'+bizDays+'일 | 잔업기준: 17:30 이후</div>';
  return h;
}

/* ===== C3. 견적서 PDF + 자동단가 ===== */
function calcAutoQuotePrice(pnm,qty){
  var boms=DB.g('bom'),stocks=DB.g('stock');
  var bom=boms.find(function(b){return b.pnm===pnm});
  var matCost=0;
  if(bom&&bom.items){
    bom.items.forEach(function(item){
      var stk=stocks.find(function(s){return s.nm===item.nm});
      matCost+=(+item.qty||0)*(stk?(+stk.unit||0):0);
    });
  }
  var laborCost=matCost*0.3;
  var overhead=matCost*0.15;
  var unitCost=matCost+laborCost+overhead;
  var margin=unitCost*0.25;
  return{matCost:Math.round(matCost),laborCost:Math.round(laborCost),overhead:Math.round(overhead),unitCost:Math.round(unitCost),price:Math.round(unitCost+margin),margin:25};
}

/* ===== C4. 인사카드 ===== */
function renderEmpCard(empId){
  var emps=DB.g('emp'),emp=emps.find(function(e){return e.id===empId});
  if(!emp)return'<div style="text-align:center;padding:20px;color:var(--txt3)">직원을 선택하세요</div>';
  var atts=DB.g('att').filter(function(a){return a.empNm===emp.nm});
  var leaves=DB.g('leave').filter(function(l){return l.empNm===emp.nm});
  var payInfo=calcPayroll(emp);
  var autoLeave=calcAutoLeave(emp);
  var join=emp.joinDate?new Date(emp.joinDate):null;
  var years=join?Math.floor((new Date()-join)/(86400000*365)):0;
  var cards=DB.g('empCards')||[];
  var card=cards.find(function(c){return c.empId===empId})||{};
  var h='<div style="display:grid;grid-template-columns:200px 1fr;gap:20px">';
  // 좌측: 프로필
  h+='<div style="text-align:center;padding:20px;background:var(--bg);border-radius:12px">';
  h+='<div style="width:80px;height:80px;border-radius:50%;background:var(--pri);color:#fff;font-size:32px;line-height:80px;margin:0 auto 12px">'+emp.nm.charAt(0)+'</div>';
  h+='<div style="font-size:18px;font-weight:800">'+emp.nm+'</div>';
  h+='<div style="font-size:13px;color:var(--txt2)">'+(emp.dept||'-')+' / '+(emp.pos||'-')+'</div>';
  h+='<div style="margin-top:12px;font-size:12px;color:var(--txt3)">';
  h+=(emp.tel||'-')+'<br>';
  h+='입사 '+(emp.joinDate||'-')+'<br>';
  h+='근속 '+years+'년</div></div>';
  // 우측: 상세
  h+='<div>';
  // 급여 요약
  h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px">';
  h+='<div class="kpi-card" style="padding:10px"><div class="kpi-label">기본급</div><div class="kpi-value" style="font-size:14px">'+fmt(payInfo.base)+'</div></div>';
  h+='<div class="kpi-card" style="padding:10px"><div class="kpi-label">실수령</div><div class="kpi-value" style="font-size:14px;color:#10B981">'+fmt(payInfo.net)+'</div></div>';
  h+='<div class="kpi-card" style="padding:10px"><div class="kpi-label">잔여연차</div><div class="kpi-value" style="font-size:14px;color:#3B82F6">'+(autoLeave-leaves.length)+'일</div></div>';
  h+='<div class="kpi-card" style="padding:10px"><div class="kpi-label">출근일</div><div class="kpi-value" style="font-size:14px">'+atts.length+'일</div></div></div>';
  // 경력/자격증
  h+='<div style="font-size:13px;margin-bottom:10px"><strong>경력사항</strong></div>';
  h+='<div style="background:var(--bg);border-radius:8px;padding:10px;margin-bottom:10px;font-size:12px">'+(card.career||'등록된 경력 없음')+'</div>';
  h+='<div style="font-size:13px;margin-bottom:10px"><strong>자격증</strong></div>';
  h+='<div style="background:var(--bg);border-radius:8px;padding:10px;margin-bottom:10px;font-size:12px">'+(card.certs||'등록된 자격증 없음')+'</div>';
  h+='<div style="font-size:13px;margin-bottom:10px"><strong>인사평가</strong></div>';
  h+='<div style="background:var(--bg);border-radius:8px;padding:10px;font-size:12px">'+(card.eval||'평가 기록 없음')+'</div>';
  h+='</div></div>';
  return h;
}

/* ===== C5. 조직도 시각화 ===== */
function renderOrgChart(){
  var emps=DB.g('emp');
  var depts={};
  emps.forEach(function(e){
    var d=e.dept||'기타';
    if(!depts[d])depts[d]=[];
    depts[d].push(e);
  });
  var deptColors={'생산':'#3B82F6','관리':'#10B981','영업':'#F59E0B','품질':'#7B61FF','기타':'#6B7280'};
  var h='<div style="text-align:center;margin-bottom:20px">';
  // CEO
  h+='<div style="display:inline-block;background:var(--pri);color:#fff;padding:12px 24px;border-radius:12px;font-weight:800;font-size:15px;margin-bottom:8px">이노패키지</div>';
  h+='<div style="width:2px;height:20px;background:var(--bdr);margin:0 auto"></div>';
  // 부서
  h+='<div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap">';
  Object.keys(depts).forEach(function(dept){
    var color=deptColors[dept]||'#6B7280';
    var members=depts[dept];
    h+='<div style="min-width:140px">';
    h+='<div style="background:'+color+';color:#fff;padding:10px 16px;border-radius:10px;font-weight:700;font-size:14px;text-align:center;margin-bottom:8px">'+dept+'부</div>';
    h+='<div style="border:1px solid var(--bdr);border-radius:10px;padding:8px">';
    members.sort(function(a,b){
      var posOrder={'부장':1,'과장':2,'반장':3,'기장':4,'대리':5,'기사':6,'주임':7,'사원':8};
      return(posOrder[a.pos]||9)-(posOrder[b.pos]||9);
    }).forEach(function(e){
      h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;margin-bottom:4px;background:var(--bg);font-size:12px">';
      h+='<div style="width:28px;height:28px;border-radius:50%;background:'+color+'22;color:'+color+';font-size:12px;line-height:28px;text-align:center;font-weight:700">'+e.nm.charAt(0)+'</div>';
      h+='<div><div style="font-weight:600">'+e.nm+'</div><div style="font-size:11px;color:var(--txt3)">'+(e.pos||'')+'</div></div></div>';
    });
    h+='</div></div>';
  });
  h+='</div></div>';
  return h;
}

/* ===== C6. 연간 급여이력 + 상여금 ===== */
function renderPayHistory(){
  var emps=DB.g('emp'),payHist=DB.g('payHistory')||[];
  var now=new Date(),y=now.getFullYear();
  var h='<div class="card-t" style="margin-bottom:12px">'+y+'년 연간 급여 이력</div>';
  h+='<table class="dt"><thead><tr><th>이름</th>';
  for(var m=1;m<=12;m++)h+='<th>'+m+'월</th>';
  h+='<th>합계</th><th>상여금</th></tr></thead><tbody>';
  emps.forEach(function(emp){
    var pay=calcPayroll(emp);
    var annual=0;
    h+='<tr><td><strong>'+emp.nm+'</strong></td>';
    for(var m=1;m<=12;m++){
      var mk=y+'-'+String(m).padStart(2,'0');
      var hist=payHist.find(function(p){return p.empNm===emp.nm&&p.month===mk});
      var mPay=hist?hist.net:m<=now.getMonth()+1?pay.net:0;
      annual+=mPay;
      var isCurrent=m===now.getMonth()+1;
      h+='<td style="font-size:11px;'+(isCurrent?'font-weight:700;color:var(--pri)':'color:var(--txt2)')+'">'+( mPay>0?Math.round(mPay/10000)+'만':'')+'</td>';
    }
    var bonus=payHist.filter(function(p){return p.empNm===emp.nm&&p.type==='bonus'}).reduce(function(s,p){return s+(+p.amt||0)},0);
    h+='<td style="font-weight:700">'+fmt(annual)+'</td>';
    h+='<td style="color:#F59E0B;font-weight:700">'+(bonus>0?fmt(bonus):'─')+'</td></tr>';
  });
  h+='</tbody></table>';
  // 상여금 등록
  h+='<div style="margin-top:12px;text-align:right"><button class="btn btn-sm btn-p" onclick="addBonus()">+ 상여금 등록</button></div>';
  return h;
}
function addBonus(){
  var nm=prompt('직원명:');if(!nm)return;
  var amt=prompt('상여금액:');if(!amt)return;
  var payHist=DB.g('payHistory')||[];
  payHist.push({id:gid(),empNm:nm,month:td().slice(0,7),type:'bonus',amt:+amt.replace(/,/g,''),date:td()});
  DB.s('payHistory',payHist);
  toast('상여금 등록 완료','ok');addLog('상여금: '+nm+' '+amt+'원');
}

/* ===== 작업 스케줄 보드 ===== */
var _schedWeekStart=null;
var _dragData=null;

function schedNav(dir){
  if(!_schedWeekStart)_schedWeekStart=getMonday(new Date());
  if(dir===0)_schedWeekStart=getMonday(new Date());
  else{var d=new Date(_schedWeekStart);d.setDate(d.getDate()+dir*7);_schedWeekStart=d}
  renderSchedBoard();
}
function getMonday(d){var day=d.getDay(),diff=d.getDate()-day+(day===0?-6:1);return new Date(d.getFullYear(),d.getMonth(),diff)}

function renderSchedBoard(){
  if(!_schedWeekStart)_schedWeekStart=getMonday(new Date());
  var ws=_schedWeekStart;
  var procFilter=$('schedProcFilter')?$('schedProcFilter').value:'all';
  var statusFilter=$('schedStatusFilter')?$('schedStatusFilter').value:'all';
  // 요일 날짜
  var days=[];
  for(var i=0;i<7;i++){
    var d=new Date(ws);d.setDate(d.getDate()+i);
    days.push({date:d,ds:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
      dow:['일','월','화','수','목','금','토'][d.getDay()],isToday:false,isSun:d.getDay()===0,isSat:d.getDay()===6});
    if(days[i].ds===td())days[i].isToday=true;
  }
  var endDs=days[6].ds;
  // 주차 표시
  var wl=days[0].ds.slice(5)+' ~ '+days[6].ds.slice(5);
  $('schedWeekLabel').textContent=wl;
  // 공정 행
  var allProcs=getProcNames();
  var procs=procFilter==='all'?allProcs:[procFilter];
  var procIcons={'인쇄':'','코팅':'','합지':'','톰슨':'','접착':'','외주가공':'','생산완료':''};
  // 작업 데이터 매핑
  var os=DB.g('wo');
  if(statusFilter==='active')os=os.filter(function(o){return o.status==='진행중'});
  else if(statusFilter==='wait')os=os.filter(function(o){return o.status==='대기'||o.status==='진행중'});
  // 공정별/날짜별 배치 계산
  var grid={};// grid[procNm][dateStr] = [{woId,procIdx,item}]
  procs.forEach(function(pn){grid[pn]={}});
  os.forEach(function(o){
    if(!o.procs)return;
    o.procs.forEach(function(p,pi){
      if(procs.indexOf(p.nm)<0)return;
      // 날짜 결정: 실제시작일 > 완료일 > 출고일역산 > 오늘기준
      var pDate='';
      if(p.t1)pDate=p.t1.slice(0,10);
      else if(p.st==='완료'&&p.t2)pDate=p.t2.slice(0,10);
      else if(p.st==='진행중')pDate=td();
      else{
        // 출고일에서 역산: 총공정수*2일전부터 시작
        var totalP=o.procs.length;var base=o.sd||td();
        var daysBack=(totalP-pi)*2;
        var est=new Date(base);est.setDate(est.getDate()-daysBack);
        // 이미 지난 날짜면 오늘 이후로 보정
        var now=new Date(td());
        if(est<now&&p.st!=='완료'){est=new Date(now);est.setDate(est.getDate()+pi)}
        pDate=est.getFullYear()+'-'+String(est.getMonth()+1).padStart(2,'0')+'-'+String(est.getDate()).padStart(2,'0');
      }
      // 주간 범위 안인지
      if(pDate>=days[0].ds&&pDate<=endDs){
        if(!grid[p.nm])grid[p.nm]={};
        if(!grid[p.nm][pDate])grid[p.nm][pDate]=[];
        var isLate=o.sd&&o.sd<td()&&p.st!=='완료';
        grid[p.nm][pDate].push({
          woId:o.id,procIdx:pi,title:o.pnm,sub:o.cnm,
          st:p.st,isLate:isLate,urgent:o.urgent,isOut:p.tp==='out',
          num:o.wn||'',sd:o.sd
        });
      }
    });
  });
  // HTML 생성
  var h='<div class="sched-board" style="grid-template-columns:120px repeat(7,1fr)">';
  // 헤더행
  h+='<div class="sched-corner">공정 / 날짜</div>';
  days.forEach(function(d){
    var cls='sched-day-hd'+(d.isToday?' sd-today':'')+(d.isSun?' sd-sun':'')+(d.isSat?' sd-sat':'');
    h+='<div class="'+cls+'"><div class="sd-date">'+d.date.getDate()+'</div><div class="sd-dow">'+d.dow+'</div></div>';
  });
  // 공정 행
  procs.forEach(function(pn){
    h+='<div class="sched-proc-label"><span>'+( procIcons[pn]||'')+'</span><span>'+pn+'</span></div>';
    days.forEach(function(d){
      var cellCls='sched-cell'+(d.isToday?' sd-today-col':'');
      h+='<div class="'+cellCls+'" data-proc="'+pn+'" data-date="'+d.ds+'" ondragover="schedDragOver(event)" ondragleave="schedDragLeave(event)" ondrop="schedDrop(event)">';
      var items=(grid[pn]&&grid[pn][d.ds])||[];
      if(items.length===0){
        h+='<div class="sched-empty"></div>';
      }else{
        items.forEach(function(item){
          var itemCls='sched-item';
          if(item.isLate)itemCls+=' si-late';
          else if(item.st==='진행중')itemCls+=' si-ing';
          else if(item.st==='완료')itemCls+=' si-done';
          else itemCls+=' si-wait';
          if(item.urgent)itemCls+=' si-urgent';
          h+='<div class="'+itemCls+'" draggable="true" data-woid="'+item.woId+'" data-pi="'+item.procIdx+'" ondragstart="schedDragStart(event)" onclick="showDet(\''+item.woId+'\')" title="'+item.num+' '+item.title+' ('+item.sub+')">';
          if(item.urgent)h+='<div class="si-badge si-badge-urgent">긴급</div>';
          else if(item.isOut)h+='<div class="si-badge si-badge-out">외주</div>';
          h+='<div class="si-title">'+item.title+'</div>';
          h+='<div class="si-sub">'+item.sub+'</div>';
          h+='</div>';
        });
      }
      h+='</div>';
    });
  });
  h+='</div>';
  // 빈 보드 감지
  var totalItems=0;
  procs.forEach(function(pn){if(grid[pn])Object.keys(grid[pn]).forEach(function(k){totalItems+=grid[pn][k].length})});
  if(totalItems===0){
    h+='<div style="text-align:center;padding:30px 20px;color:var(--txt3)">'
      +'<div style="font-size:14px;font-weight:700;margin-bottom:6px;color:var(--txt2)">이 주에 배치된 작업이 없습니다</div>'
      +'<div style="font-size:12px;margin-bottom:14px">이전/다음 버튼으로 다른 주를 확인하거나, 아래 버튼을 사용하세요</div>'
      +'<button class="btn btn-o btn-sm" onclick="schedFindWork()" style="margin-right:8px">작업 있는 주 찾기</button>'
      +'<button class="btn btn-sm" onclick="if(confirm(\'샘플 데이터를 초기화합니다. 기존 데이터가 삭제됩니다.\'))resetSample()" style="background:#F3F4F6;color:#6B7280">샘플 데이터 초기화</button>'
      +'</div>';
  }else{
    h+='<div style="text-align:center;padding:6px;font-size:11px;color:var(--txt3)">이번 주 작업 <b style=\"color:var(--pri)\">'+totalItems+'</b>건 배치</div>';
  }
  // 디버그 정보
  var _dbgTotal=0;
  procs.forEach(function(pn){if(grid[pn])Object.keys(grid[pn]).forEach(function(k){_dbgTotal+=grid[pn][k].length})});
  if(_dbgTotal===0){
    h+='<div style="text-align:center;padding:40px 20px;color:#6B7280">'
      +'<div style="font-size:16px;font-weight:700;margin-bottom:8px;color:#374151">이 주에 배치된 작업이 없습니다</div>'
      +'<div style="font-size:13px;margin-bottom:16px;color:#9CA3AF">이전/다음 버튼으로 다른 주를 확인하세요</div>'
      +'<div style="display:flex;gap:8px;justify-content:center">'
      +'<button onclick="schedFindWork()" style="padding:8px 16px;border-radius:8px;border:none;background:#3B82F6;color:#fff;cursor:pointer;font-size:13px">작업 있는 주 찾기</button>'
      +'<button onclick="if(confirm(\'데이터를 초기화하시겠습니까?\'))resetSample()" style="padding:8px 16px;border-radius:8px;border:1px solid #D1D5DB;background:#fff;color:#6B7280;cursor:pointer;font-size:13px">데이터 초기화</button>'
      +'</div>'
      +'<div style="margin-top:12px;font-size:11px;color:#D1D5DB">WO: '+os.length+'건 | 주간: '+days[0].ds+' ~ '+endDs+'</div>'
      +'</div>';
  } else {
    h+='<div style="text-align:center;padding:8px;font-size:12px;color:#9CA3AF">이번 주 작업 <b style="color:#3B82F6">'+_dbgTotal+'</b>건</div>';
  }
  $('schedBoard').innerHTML=h;
}

/* 드래그 시작 */
function schedDragStart(e){
  var el=e.target;
  while(el&&!el.getAttribute('data-woid'))el=el.parentElement;
  if(!el)return;
  _dragData={woId:el.getAttribute('data-woid'),pi:parseInt(el.getAttribute('data-pi'))};
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain',JSON.stringify(_dragData));
  /* 고스트 스타일 */
  setTimeout(function(){if(el)el.style.opacity='0.4'},0);
}

/* 드래그 오버 */
function schedDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  var cell=e.target;
  while(cell&&!cell.classList.contains('sched-cell'))cell=cell.parentElement;
  if(cell)cell.classList.add('drag-over');
}

/* 드래그 나감 */
function schedDragLeave(e){
  var cell=e.target;
  while(cell&&!cell.classList.contains('sched-cell'))cell=cell.parentElement;
  if(cell)cell.classList.remove('drag-over');
}

/* 드롭: 날짜 이동 */
function schedDrop(e){
  e.preventDefault();
  var cell=e.target;
  while(cell&&!cell.classList.contains('sched-cell'))cell=cell.parentElement;
  if(!cell)return;
  cell.classList.remove('drag-over');
  var newDate=cell.getAttribute('data-date');
  var newProc=cell.getAttribute('data-proc');
  var data;
  try{data=JSON.parse(e.dataTransfer.getData('text/plain'))}catch(ex){return}
  if(!data||!data.woId)return;
  // DB 업데이트
  var os=DB.g('wo');
  var wo=os.find(function(o){return o.id===data.woId});
  if(!wo||!wo.procs||!wo.procs[data.pi])return;
  var proc=wo.procs[data.pi];
  var oldDate=proc.t1?proc.t1.slice(0,10):'없음';
  // 공정 시작일 변경
  if(proc.t1){
    // 기존 시간 유지, 날짜만 변경
    proc.t1=newDate+proc.t1.slice(10);
  }else{
    proc.t1=newDate+' 09:00';
  }
  // 공정명도 변경된 경우 (다른 행으로 이동)
  if(newProc&&newProc!==proc.nm){
    // 공정 변경은 허용하지 않음 → 날짜만 변경
  }
  DB.s('wo',os);
  addLog('스케줄변경: '+wo.pnm+' '+proc.nm+' '+oldDate+'-'+newDate);
  toast(proc.nm+' '+newDate,'ok');
  renderSchedBoard();
}

/* ===== 생산계획 우선순위 보드 (나중에 통합 예정) ===== */
function rPlanPriority(){
  var wos=DB.g('wo').filter(function(o){
    return o.status!=='출고완료'&&o.status!=='취소';
  });
  var today=td();

  function dayDiff(sd){
    if(!sd)return 999;
    return Math.round((new Date(sd)-new Date(today))/(1000*60*60*24));
  }

  // 납기일 기준 분류
  var groups={overdue:[],today:[],d1:[],d3:[],normal:[]};
  wos.forEach(function(o){
    var d=dayDiff(o.sd);
    if(d<0)groups.overdue.push(o);
    else if(d===0)groups.today.push(o);
    else if(d===1)groups.d1.push(o);
    else if(d<=3)groups.d3.push(o);
    else groups.normal.push(o);
  });

  // 요약 배지
  var sbHtml='<div class="sg" style="margin-bottom:16px">';
  if(groups.overdue.length)sbHtml+='<div class="sb red"><div class="v">'+groups.overdue.length+'</div><div class="l">⚠ 납기 지연</div></div>';
  if(groups.today.length)sbHtml+='<div class="sb orange"><div class="v">'+groups.today.length+'</div><div class="l">📦 오늘 납기</div></div>';
  if(groups.d1.length)sbHtml+='<div class="sb orange"><div class="v">'+groups.d1.length+'</div><div class="l">⏰ 내일 납기</div></div>';
  if(groups.d3.length)sbHtml+='<div class="sb blue"><div class="v">'+groups.d3.length+'</div><div class="l">📋 3일 이내</div></div>';
  sbHtml+='<div class="sb green"><div class="v">'+groups.normal.length+'</div><div class="l">✓ 여유 있음</div></div>';
  sbHtml+='</div>';

  // 우선순위 카드 목록 (납기 급한 순)
  var sorted=[].concat(groups.overdue,groups.today,groups.d1,groups.d3,groups.normal);
  var cardsHtml='';
  if(!sorted.length){
    cardsHtml=emptyHtml('','진행중인 작업 없음','작업지시서를 등록하면 우선순위가 표시됩니다.');
  }else{
    cardsHtml='<div style="display:flex;flex-direction:column;gap:8px">';
    sorted.forEach(function(o){
      var diff=dayDiff(o.sd);
      var urgLabel=diff<0?'D+'+Math.abs(diff)+' 지연':diff===0?'오늘 납기':diff===1?'내일 납기':o.sd?'D-'+diff:'납기미정';
      var urgColor=diff<0?'#EF4444':diff<=1?'#F59E0B':diff<=3?'#3182F6':'#10B981';
      var urgBg=diff<0?'#FEF2F2':diff<=1?'#FFFBEB':diff<=3?'#EFF6FF':'#F0FDF4';

      // 공정 진행률
      var procs=o.procs||[];
      var total=procs.length;
      var done=procs.filter(function(p){return p.st==='완료'||p.st==='외주완료'||p.st==='스킵';}).length;
      var curProc=procs.find(function(p){return p.st==='진행중'||p.st==='외주대기'||p.st==='외주진행중';});
      var nextProc=procs.find(function(p){return p.st==='대기';});
      var pct=total>0?Math.round(done/total*100):0;
      var procLabel=curProc?'🔄 진행중: '+curProc.nm:nextProc?'⏳ 대기: '+nextProc.nm:done===total&&total>0?'✅ 공정 완료':'공정 없음';

      cardsHtml+='<div class="card" style="padding:12px 14px;border-left:3px solid '+urgColor+'">';
      // 헤더
      cardsHtml+='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">';
      cardsHtml+='<div style="flex:1;min-width:0">';
      cardsHtml+='<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">';
      cardsHtml+='<span style="font-weight:700;font-size:14px">'+o.pnm+'</span>';
      cardsHtml+='<span style="font-size:12px;color:var(--txt2)">'+o.cnm+'</span>';
      if(o.urgent)cardsHtml+='<span class="bd bd-d" style="background:#FEF2F2;color:#EF4444;border-color:#FECACA;font-size:10px">긴급</span>';
      cardsHtml+='</div>';
      cardsHtml+='<div style="font-size:12px;color:var(--txt2);margin-bottom:6px">'+o.wn+' · '+fmt(o.fq||0)+'매'+(o.sd?' · 납기 '+o.sd:'')+'</div>';
      // 공정 진행 바
      cardsHtml+='<div style="font-size:11px;color:var(--txt2);margin-bottom:3px;display:flex;justify-content:space-between">';
      cardsHtml+='<span>'+procLabel+'</span><span>'+done+'/'+total+'</span></div>';
      cardsHtml+='<div style="height:5px;background:#E5E7EB;border-radius:3px">';
      cardsHtml+='<div style="height:5px;width:'+pct+'%;background:'+urgColor+';border-radius:3px"></div></div>';
      cardsHtml+='</div>';
      // 납기 배지
      if(o.sd||diff<999){
        cardsHtml+='<div style="min-width:64px;text-align:center">';
        cardsHtml+='<div style="font-size:11px;font-weight:700;color:'+urgColor+';background:'+urgBg+';padding:5px 8px;border-radius:6px;white-space:nowrap">'+urgLabel+'</div>';
        cardsHtml+='</div>';
      }
      cardsHtml+='</div>';
      // 공정 칩
      if(procs.length){
        cardsHtml+='<div style="display:flex;gap:4px;margin-top:8px;flex-wrap:wrap">';
        procs.forEach(function(p){
          var c=p.st==='완료'||p.st==='외주완료'?'#10B981':p.st==='진행중'||p.st==='외주진행중'?'#3182F6':p.st==='외주대기'?'#8B5CF6':'#94A3B8';
          var bg=p.st==='완료'||p.st==='외주완료'?'#F0FDF4':p.st==='진행중'||p.st==='외주진행중'?'#EFF6FF':p.st==='외주대기'?'#F5F3FF':'#F8FAFC';
          cardsHtml+='<span style="font-size:10px;padding:2px 8px;border-radius:20px;background:'+bg+';color:'+c+';border:1px solid '+c+'40">'+p.nm+'</span>';
        });
        cardsHtml+='</div>';
      }
      cardsHtml+='</div>';
    });
    cardsHtml+='</div>';
  }

  $('planPriority').innerHTML=sbHtml+cardsHtml;
  renderPlanProcLoad(wos);
}

function renderPlanProcLoad(wos){
  var procColors=getProcColors();
  var byProc={};
  wos.forEach(function(o){
    (o.procs||[]).forEach(function(p){
      if(p.st==='완료'||p.st==='외주완료'||p.st==='스킵')return;
      if(!byProc[p.nm])byProc[p.nm]={waiting:0,inprog:0};
      if(p.st==='진행중'||p.st==='외주진행중'||p.st==='외주대기')byProc[p.nm].inprog++;
      else if(p.st==='대기')byProc[p.nm].waiting++;
    });
  });
  var procs=Object.entries(byProc);
  if(!procs.length){$('planGrid').innerHTML='';return;}
  procs.sort(function(a,b){return(b[1].waiting+b[1].inprog)-(a[1].waiting+a[1].inprog);});
  var maxTotal=Math.max.apply(null,procs.map(function(x){return x[1].waiting+x[1].inprog;}));
  var h='<div class="card" style="margin-top:16px"><div class="card-t" style="margin-bottom:14px">공정별 작업 부하 현황</div>';
  h+='<div style="display:flex;flex-direction:column;gap:12px">';
  procs.forEach(function(entry){
    var nm=entry[0];var d=entry[1];
    var total=d.waiting+d.inprog;
    var color=procColors[nm]||'#6B7280';
    var loadColor=total>=5?'#EF4444':total>=3?'#F59E0B':color;
    var pct=maxTotal>0?Math.round(total/maxTotal*100):0;
    h+='<div>';
    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">';
    h+='<div style="display:flex;align-items:center;gap:6px">';
    h+='<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+color+'"></span>';
    h+='<span style="font-size:13px;font-weight:600">'+nm+'</span>';
    if(d.inprog>0)h+='<span class="bd" style="background:#EFF6FF;color:#3182F6;border-color:#BFDBFE;font-size:10px">진행중 '+d.inprog+'건</span>';
    h+='</div>';
    h+='<span style="font-size:12px;font-weight:700;color:'+loadColor+'">대기 '+d.waiting+'건</span>';
    h+='</div>';
    h+='<div style="height:6px;background:#E5E7EB;border-radius:3px">';
    h+='<div style="height:6px;width:'+pct+'%;background:'+loadColor+';border-radius:3px"></div></div>';
    h+='</div>';
  });
  h+='</div></div>';
  $('planGrid').innerHTML=h;
}

// MR['mes-plan'] 등록은 core.js에서 activateMesAdmin('plan')으로 처리됨
// rPlanPriority() — 납기 우선순위 카드뷰, 추후 생산계획 상단에 통합 예정

initDB();
