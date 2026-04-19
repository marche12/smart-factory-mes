const _nullEl=(function(){
  var d=document.createElement('div');d.id='__null__';
  d.querySelector=function(){return d};
  d.querySelectorAll=function(){return[]};
  return d;
})();
const $=id=>{var e=document.getElementById(id);if(!e){return _nullEl}return e};
function badge(s){
  // SysCode 기반 badge 우선 탐색
  if(typeof SysCode!=='undefined'){
    var cats=['PROC_STATUS','WO_STATUS'];
    for(var ci=0;ci<cats.length;ci++){
      try{var items=DB.g(SysCode._ITEMS_KEY);var found=items.find(function(x){return x.category_id===cats[ci]&&(x.code===s||x.name===s)&&x.is_active!==0});
      if(found&&found.color){var cls=found.color;if(cls.indexOf('bd-')===0)return '<span class="bd '+cls+'">'+s+'</span>';return '<span class="bd" style="background:'+cls+';color:#fff">'+s+'</span>'}}catch(e){}
    }
  }
  // fallback: 하드코딩 맵
  const m={'대기':'bd-w','진행중':'bd-p','완료':'bd-d','지연':'bd-x','임박':'bd-x','출고대기':'bd-o','출고완료':'bd-s','외주대기':'bd-o','외주진행':'bd-o','외주완료':'bd-o','완료대기':'bd-o','보류':'bd-hold','재작업':'bd-rework','LOT분할':'bd-o','외주진행중':'bd-e','입고확인대기':'bd-p','스킵':'bd-w','수주':'bd-o','수주확정':'bd-s','생산중':'bd-p','취소':'bd-cancel'};return '<span class="bd '+(m[s]||'bd-w')+'">'+s+'</span>';
}

function uniqVals(list){
  var out=[];
  (list||[]).forEach(function(v){
    if(v===undefined||v===null||v==='')return;
    if(out.indexOf(v)<0)out.push(v);
  });
  return out;
}

function orderWOIds(order){
  if(!order)return [];
  var ids=[];
  if(Array.isArray(order.woIds))ids=ids.concat(order.woIds);
  else if(order.woId)ids.push(order.woId);
  if(Array.isArray(order.woLinks)){
    order.woLinks.forEach(function(link){
      if(link&&link.woId)ids.push(link.woId);
    });
  }
  return uniqVals(ids);
}

function orderWONos(order){
  if(!order)return [];
  var nos=[];
  if(Array.isArray(order.woNos))nos=nos.concat(order.woNos);
  else if(order.woNo)nos.push(order.woNo);
  if(Array.isArray(order.woLinks)){
    order.woLinks.forEach(function(link){
      if(link&&link.woNo)nos.push(link.woNo);
    });
  }
  return uniqVals(nos);
}

function orderHasLinkedWO(order){
  return orderWOIds(order).length>0;
}

function isCompletedWOStatus(status){
  return status==='완료'||status==='완료대기'||status==='출고완료';
}

function orderTotalQty(order){
  if(!order||!Array.isArray(order.items))return 0;
  return order.items.reduce(function(sum,it){
    return sum+(Number(it&&it.qty)||0);
  },0);
}

function getOrderLinkedWOs(order,wos){
  if(!order)return [];
  var all=wos||[];
  var linkedIds=orderWOIds(order);
  var seen={};
  return all.filter(function(wo){
    if(!wo)return false;
    var match=linkedIds.indexOf(wo.id)>=0||(order.id&&wo.ordId===order.id);
    if(!match||seen[wo.id])return false;
    seen[wo.id]=true;
    return true;
  });
}

function getOrderShipLogs(order,wos,ships){
  if(!order)return [];
  var linkedWOs=getOrderLinkedWOs(order,wos||[]);
  var linkedIds=linkedWOs.map(function(wo){return wo.id});
  return (ships||[]).filter(function(ship){
    return !!ship&&((order.id&&ship.orderId===order.id)||linkedIds.indexOf(ship.woId)>=0);
  });
}

function summarizeOrderFlow(order,wos,ships){
  var linkedWOs=getOrderLinkedWOs(order,wos||[]);
  var shipLogs=getOrderShipLogs(order,linkedWOs,ships||[]);
  var shippedQty=shipLogs.reduce(function(sum,ship){return sum+(Number(ship&&ship.qty)||0);},0);
  var totalQty=orderTotalQty(order);
  var remainQty=Math.max(0,totalQty-shippedQty);
  var allDone=linkedWOs.length>0&&linkedWOs.every(function(wo){return isCompletedWOStatus(wo.status);});
  var lastShipDt='';
  shipLogs.forEach(function(ship){
    if(ship&&ship.dt&&(!lastShipDt||ship.dt>lastShipDt))lastShipDt=ship.dt;
  });
  return {
    totalQty:totalQty,
    shippedQty:shippedQty,
    remainQty:remainQty,
    shipCount:shipLogs.length,
    lastShipDt:lastShipDt,
    woIds:uniqVals(linkedWOs.map(function(wo){return wo.id;})),
    woNos:uniqVals(linkedWOs.map(function(wo){return wo.wn;})),
    linkedWOs:linkedWOs,
    shipLogs:shipLogs,
    allDone:allDone
  };
}

function applyOrderFlowState(order,wos,ships){
  if(!order)return order;
  var summary=summarizeOrderFlow(order,wos||[],ships||[]);
  order.woIds=summary.woIds;
  order.woNos=summary.woNos;
  if(summary.woIds.length){
    order.woId=summary.woIds[0]||'';
    order.woNo=summary.woNos[0]||'';
  }else{
    order.woId='';
    order.woNo='';
  }
  order.shipCount=summary.shipCount;
  order.shippedQty=summary.shippedQty;
  order.remainQty=summary.remainQty;
  order.lastShipDt=summary.lastShipDt||'';
  if(order.status!=='취소'){
    if(summary.totalQty>0&&summary.shippedQty>=summary.totalQty)order.status='출고완료';
    else if(summary.shippedQty>0||summary.allDone)order.status='출고대기';
    else if(summary.woIds.length)order.status='생산중';
    else if(order.status!=='수주확정')order.status='수주';
  }
  return order;
}

function syncOrderFlowState(orderId,orders,wos,ships){
  if(!orderId)return null;
  var ownOrders=orders||(typeof getOrders==='function'?getOrders():[]);
  var idx=ownOrders.findIndex(function(order){return order&&order.id===orderId;});
  if(idx<0)return null;
  var updated=applyOrderFlowState(ownOrders[idx],wos||(typeof DB!=='undefined'?DB.g('wo'):[]),ships||(typeof DB!=='undefined'?DB.g('shipLog'):[]));
  if(!orders&&typeof saveOrders==='function')saveOrders(ownOrders);
  return updated;
}

function orderPendingItemEntries(order){
  if(!order||!Array.isArray(order.items))return [];
  var linked={};
  if(Array.isArray(order.woLinks)){
    order.woLinks.forEach(function(link){
      if(link&&link.itemIdx!==undefined&&link.itemIdx!==null)linked[String(link.itemIdx)]=true;
    });
  }
  return order.items.map(function(it,idx){
    return {it:it,idx:idx};
  }).filter(function(entry){
    return entry.it&&entry.it.nm&&!linked[String(entry.idx)];
  });
}

/* ===== 공정 관리 시스템 ===== */
var DEFAULT_PROCS=[
  {id:'pr1',nm:'인쇄',tp:'external',icon:'',color:'#1E3A5F',ord:1},
  {id:'pr2',nm:'코팅',tp:'internal',icon:'',color:'#1E3A5F',ord:2},
  {id:'pr3',nm:'합지',tp:'internal',icon:'',color:'#1E3A5F',ord:3},
  {id:'pr4',nm:'톰슨',tp:'internal',icon:'',color:'#1E3A5F',ord:4},
  {id:'pr5',nm:'접착',tp:'internal',icon:'',color:'#1E3A5F',ord:5},
  {id:'pr6',nm:'외주가공',tp:'external',icon:'',color:'#1E3A5F',ord:6},
  {id:'pr7',nm:'생산완료',tp:'status',icon:'',color:'#059669',ord:7}
];
function getProcs(){var p=null;try{p=JSON.parse(localStorage.getItem('ino_procList'))}catch(e){}if(!p||!p.length)p=DEFAULT_PROCS;return p.sort(function(a,b){return(a.ord||0)-(b.ord||0)})}
function getProcNames(){return getProcs().map(function(p){return p.nm})}
function getProcIcons(){var m={};getProcs().forEach(function(p){m[p.nm]=''});return m}
function getProcColors(){var m={};getProcs().forEach(function(p){m[p.nm]=p.color||'#1E3A5F'});return m}
function saveProcs(list){localStorage.setItem('ino_procList',JSON.stringify(list))}
function initProcsIfNeeded(){saveProcs(DEFAULT_PROCS)}

/* 공정 관련 동적 select 채우기 */
function fillProcSelect(selId,includeAll){
  var el=document.getElementById(selId);if(!el)return;
  var val=el.value;
  var opts=includeAll?'<option value="all">전체 공정</option>':'<option value="">공정 선택</option>';
  getProcs().forEach(function(p){opts+='<option value="'+p.nm+'">'+p.nm+(p.tp==='external'?' (외주)':'')+'</option>'});
  el.innerHTML=opts;
  if(val)el.value=val;
}
function fillProcButtons(containerId){
  var el=document.getElementById(containerId);if(!el)return;
  el.innerHTML=getProcs().map(function(p){
    var cls=p.tp==='external'?'pb out':'pb';
    return '<button type="button" class="'+cls+'" onclick="addPP(\''+p.nm+'\')">'+p.nm+(p.tp==='external'?' (외)':'')+'</button>'
  }).join('');
}
/* 공정 관리 UI 렌더링 */
function renderProcManager(){
  var el=document.getElementById('procManagerArea');if(!el)return;
  var procs=getProcs();
  el.innerHTML='<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'+
    '<button class="btn btn-p" onclick="openProcAddM(\'internal\')">+ 내부 공정 추가</button>'+
    '<button class="btn btn-o" onclick="openProcAddM(\'external\')">+ 외주 공정 추가</button>'+
    '</div>'+
    '<table class="dt"><thead><tr><th>순서</th><th>공정명</th><th>구분</th><th>아이콘</th><th>색상</th><th>관리</th></tr></thead><tbody>'+
    procs.map(function(p,i){
      var tpBadge=p.tp==='external'?'<span class="bd bd-o">외주</span>':'<span class="bd bd-d">내부</span>';
      return '<tr><td><button class="btn btn-sm btn-o" onclick="moveProcOrd('+i+',-1)" '+(i===0?'disabled':'')+'>▲</button> '+(i+1)+' <button class="btn btn-sm btn-o" onclick="moveProcOrd('+i+',1)" '+(i===procs.length-1?'disabled':'')+'>▼</button></td>'+
        '<td style="font-weight:700">'+p.nm+'</td><td>'+tpBadge+'</td>'+
        '<td><input value="'+(p.icon||'')+'" style="width:40px;text-align:center;font-size:18px;border:1px solid var(--bdr);border-radius:4px" onchange="updateProcField(\''+p.id+'\',\'icon\',this.value)"></td>'+
        '<td><input type="color" value="'+(p.color||'#1E3A5F')+'" style="width:40px;height:30px;border:none;cursor:pointer" onchange="updateProcField(\''+p.id+'\',\'color\',this.value)"></td>'+
        '<td><button class="btn btn-sm btn-d" onclick="deleteProc(\''+p.id+'\')">삭제</button></td></tr>'
    }).join('')+'</tbody></table>';
}
function openProcAddM(tp){
  var nm=prompt((tp==='external'?'외주':'내부')+' 공정명을 입력하세요:');
  if(!nm||!nm.trim())return;
  nm=nm.trim();
  var procs=getProcs();
  if(procs.find(function(p){return p.nm===nm})){toast('이미 존재하는 공정명','err');return}
  var icons=['','','','','','','','','',''];
  var colors=['#1E3A5F','#1E3A5F','#7B61FF','#F59E0B','#EF4444','#10B981','#EC4899','#14B8A6','#F97316','#06B6D4'];
  procs.push({id:'pr_'+Date.now(),nm:nm,tp:tp,icon:icons[procs.length%icons.length],color:colors[procs.length%colors.length],ord:procs.length+1});
  saveProcs(procs);renderProcManager();refreshProcSelects();toast(nm+' 공정 추가','ok');
}
function deleteProc(id){
  var procs=getProcs();var p=procs.find(function(x){return x.id===id});
  if(!p)return;
  if(!confirm('"'+p.nm+'" 공정을 삭제하시겠습니까?'))return;
  procs=procs.filter(function(x){return x.id!==id});
  procs.forEach(function(x,i){x.ord=i+1});
  saveProcs(procs);renderProcManager();refreshProcSelects();toast(p.nm+' 삭제','ok');
}
function moveProcOrd(idx,dir){
  var procs=getProcs();var newIdx=idx+dir;
  if(newIdx<0||newIdx>=procs.length)return;
  var tmp=procs[idx];procs[idx]=procs[newIdx];procs[newIdx]=tmp;
  procs.forEach(function(x,i){x.ord=i+1});
  saveProcs(procs);renderProcManager();refreshProcSelects();
}
function updateProcField(id,field,val){
  var procs=getProcs();var p=procs.find(function(x){return x.id===id});
  if(p){p[field]=val;saveProcs(procs)}
}
function refreshProcSelects(){
  fillProcSelect('wkProc',false);fillProcSelect('schedProcFilter',true);
  fillProcSelect('qcProc',false);fillProcSelect('eqProc',false);
  fillProcSelect('umProc',false);
  var ppg=document.querySelector('#prodMo .pb-g');if(ppg)ppg.id='procBtnArea';
  fillProcButtons('procBtnArea');
  fillProcSelect('eProc',false);
}

/* ===== Auth Token Management ===== */
var _authTokens={access:null,refresh:null};
var _refreshing=null;
async function authFetch(url,opts){
  opts=opts||{};if(!opts.headers)opts.headers={};
  if(_authTokens.access)opts.headers['Authorization']='Bearer '+_authTokens.access;
  var res=await fetch(url,opts);
  if(res.status===401&&_authTokens.refresh){
    await _doRefresh();
    if(_authTokens.access){opts.headers['Authorization']='Bearer '+_authTokens.access;res=await fetch(url,opts)}
  }
  if(res.status===401){unifiedLogout();throw new Error('Session expired')}
  return res;
}
async function _doRefresh(){
  if(_refreshing)return _refreshing;
  _refreshing=fetch('/api/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:_authTokens.refresh})})
  .then(function(r){if(!r.ok){_authTokens.access=null;_authTokens.refresh=null;return}return r.json()})
  .then(function(d){if(d&&d.access_token)_authTokens.access=d.access_token})
  .catch(function(){_authTokens.access=null;_authTokens.refresh=null})
  .finally(function(){_refreshing=null});
  return _refreshing;
}

var _cache={};
var _meta={};
var _conflicts={};
var _syncState={};
var DB={
  _prefix:'ino_',
  _loaded:false,
  _serverOk:true,
  init:async function(){
    try{
      var res=await authFetch('/api/data');
      var keys=await res.json();
      for(var i=0;i<keys.length;i++){
        var r=await authFetch('/api/data/'+encodeURIComponent(keys[i]));
        var d=await r.json();
        if(d.value!==null)_cache[keys[i]]=d.value;
        _meta[keys[i]]=d.updated_at||null;
      }
      DB._loaded=true;
      DB._serverOk=true;
      console.log('DB loaded from server:',keys.length,'keys');
    }catch(e){
      console.warn('Server unavailable, using localStorage fallback');
      DB._serverOk=false;
    }
  },
  _handleConflict:function(storeKey,localJson,data){
    _conflicts[storeKey]={
      localValue:localJson,
      serverValue:data&&data.current_value!==undefined?data.current_value:null,
      updatedAt:data&&data.current_updated_at?data.current_updated_at:null,
      at:new Date().toISOString()
    };
    if(data&&data.current_value!==undefined&&data.current_value!==null){
      _cache[storeKey]=data.current_value;
      localStorage.setItem(storeKey,data.current_value);
    }else{
      delete _cache[storeKey];
      localStorage.removeItem(storeKey);
    }
    _meta[storeKey]=data&&data.current_updated_at?data.current_updated_at:null;
    if(typeof window!=='undefined'&&window.dispatchEvent&&typeof CustomEvent!=='undefined'){
      window.dispatchEvent(new CustomEvent('packflow-db-conflict',{detail:{key:storeKey}}));
    }
    if(typeof toast==='function')toast('다른 사용자가 먼저 수정했습니다. 최신 데이터로 다시 확인해주세요: '+storeKey,'err');
  },
  _syncToServer:function(storeKey,json){
    if(!DB._serverOk)return;
    var state=_syncState[storeKey]||(_syncState[storeKey]={inFlight:false,pendingJson:null});
    state.pendingJson=json;
    if(state.inFlight)return;
    var _maxRetry=2;
    var _pump=function(){
      if(state.pendingJson===null||state.pendingJson===undefined){state.inFlight=false;return}
      state.inFlight=true;
      var jsonToSend=state.pendingJson;
      state.pendingJson=null;
      var expectedUpdatedAt=_meta[storeKey]!==undefined?_meta[storeKey]:null;
      var _retries=0;
      var _doSync=function(){
        authFetch('/api/data/'+encodeURIComponent(storeKey),{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({value:jsonToSend,expected_updated_at:expectedUpdatedAt})
        }).then(function(res){
          if(res.status===409){
            return res.json().then(function(data){
              state.inFlight=false;
              state.pendingJson=null;
              DB._handleConflict(storeKey,jsonToSend,data||{});
            });
          }
          if(!res.ok)throw new Error('sync failed');
          return res.json().then(function(data){
            if(data&&data.updated_at)_meta[storeKey]=data.updated_at;
            state.inFlight=false;
            if(state.pendingJson!==null&&state.pendingJson!==undefined)_pump();
          });
        }).catch(function(e){
          _retries++;
          if(_retries<=_maxRetry){
            console.warn('Sync retry '+_retries+'/'+_maxRetry+':',storeKey);
            setTimeout(_doSync,2000*_retries);
          }else{
            state.inFlight=false;
            console.error('Sync failed after retries:',storeKey);
            if(typeof toast==='function')toast('서버 동기화 실패: '+storeKey,'err');
          }
        });
      };
      _doSync();
    };
    _pump();
  },
  _deleteFromServer:function(storeKey){
    if(!DB._serverOk)return;
    authFetch('/api/data/'+encodeURIComponent(storeKey),{method:'DELETE'}).catch(function(e){console.warn('Delete failed:',storeKey)});
  },
  g:function(k,mo){
    if(k==='wo'){return DB._gWO(mo)}
    var storeKey='ino_'+k;
    if(_cache[storeKey]!==undefined){try{return JSON.parse(_cache[storeKey])||[]}catch(e){return[]}}
    try{return JSON.parse(localStorage.getItem(storeKey))||[]}catch(e){return[]}
  },
  s:function(k,d){
    try{
      if(k==='wo'){DB._sWO(d);return}
      var json=JSON.stringify(d);
      var storeKey='ino_'+k;
      _cache[storeKey]=json;
      localStorage.setItem(storeKey,json);
      DB._syncToServer(storeKey,json);
    }catch(e){console.error('DB.s error:',k,e.message)}
  },
  g1:function(k){
    var storeKey='ino_'+k;
    if(_cache[storeKey]!==undefined){try{return JSON.parse(_cache[storeKey])}catch(e){return null}}
    try{return JSON.parse(localStorage.getItem(storeKey))}catch(e){return null}
  },
  s1:function(k,d){
    try{
      var json=JSON.stringify(d);
      var storeKey='ino_'+k;
      _cache[storeKey]=json;
      localStorage.setItem(storeKey,json);
      DB._syncToServer(storeKey,json);
    }catch(e){console.error('DB.s1 error:',k,e.message)}
  },
  _getWOKeys:function(){
    var keys=[];
    // Check cache first (server-loaded keys)
    var cacheKeys=Object.keys(_cache);
    for(var i=0;i<cacheKeys.length;i++){
      if(cacheKeys[i].indexOf('ino_wo_')===0)keys.push(cacheKeys[i]);
    }
    if(keys.length>0)return keys;
    // Fallback to localStorage
    for(var j=0;j<localStorage.length;j++){
      var lk=localStorage.key(j);
      if(lk&&lk.indexOf('ino_wo_')===0)keys.push(lk);
    }
    return keys;
  },
  _gWO:function(mo){
    // Migration: if old ino_wo exists, split by month
    var oldVal=_cache['ino_wo']||localStorage.getItem('ino_wo');
    if(oldVal){
      try{
        var arr=JSON.parse(oldVal);
        if(Array.isArray(arr)&&arr.length>0){
          DB._migrateWO(arr);
          delete _cache['ino_wo'];
          localStorage.removeItem('ino_wo');
          DB._deleteFromServer('ino_wo');
        }
      }catch(e){}
    }
    if(mo){
      var storeKey='ino_wo_'+mo;
      if(_cache[storeKey]!==undefined){try{return JSON.parse(_cache[storeKey])||[]}catch(e){return[]}}
      try{return JSON.parse(localStorage.getItem(storeKey))||[]}catch(e){return[]}
    }
    var all=[];
    var keys=DB._getWOKeys();
    keys.forEach(function(k){
      var val=_cache[k]!==undefined?_cache[k]:localStorage.getItem(k);
      try{var arr=JSON.parse(val);if(Array.isArray(arr))all=all.concat(arr)}catch(e){}
    });
    return all;
  },
  _sWO:function(d){
    var byMonth={};
    d.forEach(function(o){
      var dt=o.dt||'';
      var mo=dt.length>=7?dt.slice(0,7):'unknown';
      if(!byMonth[mo])byMonth[mo]=[];
      byMonth[mo].push(o);
    });
    // Delete old monthly keys
    var oldKeys=DB._getWOKeys();
    oldKeys.forEach(function(k){
      delete _cache[k];
      localStorage.removeItem(k);
      DB._deleteFromServer(k);
    });
    // Save new monthly keys
    Object.keys(byMonth).forEach(function(mo){
      var storeKey='ino_wo_'+mo;
      var json=JSON.stringify(byMonth[mo]);
      _cache[storeKey]=json;
      localStorage.setItem(storeKey,json);
      DB._syncToServer(storeKey,json);
    });
  },
  _migrateWO:function(arr){
    var byMonth={};
    arr.forEach(function(o){
      var dt=o.dt||'';
      var mo=dt.length>=7?dt.slice(0,7):'unknown';
      if(!byMonth[mo])byMonth[mo]=[];
      byMonth[mo].push(o);
    });
    Object.keys(byMonth).forEach(function(mo){
      var storeKey='ino_wo_'+mo;
      var json=JSON.stringify(byMonth[mo]);
      _cache[storeKey]=json;
      localStorage.setItem(storeKey,json);
      DB._syncToServer(storeKey,json);
    });
  },
  gByVendor:function(k,vendor){
    var all=DB.g(k);
    if(!vendor)return all;
    return all.filter(function(o){return o.vendor===vendor});
  },
  getWOMonths:function(){
    var keys=DB._getWOKeys();
    return keys.map(function(k){return k.replace('ino_wo_','')}).sort().reverse();
  }
}
var gid=()=>Date.now().toString(36)+Math.random().toString(36).substr(2,5);
const td=()=>new Date().toISOString().slice(0,10);
const nw=()=>new Date().toISOString().slice(0,16).replace('T',' ');

/* ===== SysCode: 공통코드 체계 ===== */
var SysCode={
  _CATS_KEY:'codeCats',
  _ITEMS_KEY:'codeItems',
  _SEED_CATS:[
    {id:'PROC_TYPE',name:'공정구분',description:'내부/외주/기타',is_system:1,ord:1},
    {id:'PROC_STATUS',name:'공정상태',description:'대기/진행/완료 등',is_system:1,ord:2},
    {id:'WO_STATUS',name:'작업지시 상태',description:'작업지시서 진행 상태',is_system:1,ord:3},
    {id:'CLIENT_TYPE',name:'거래처유형',description:'매출/매입/겸용',is_system:1,ord:4},
    {id:'PAY_METHOD',name:'결제조건',description:'현금/어음/카드 등',is_system:1,ord:5},
    {id:'VAT_CONFIG',name:'부가세설정',description:'세율 등 세금 설정',is_system:1,ord:6},
    {id:'PRINT_METHOD',name:'인쇄방식',description:'옵셋/디지털/실크 등',is_system:1,ord:7},
    {id:'COATING_METHOD',name:'코팅방식',description:'유광/무광/기계코팅 등',is_system:1,ord:8},
    {id:'PAPER_TYPE',name:'종이종류',description:'아트/스노우/크라프트 등',is_system:1,ord:9},
    {id:'UNIT',name:'단위',description:'EA/BOX/ROLL 등',is_system:0,ord:10},
    {id:'DEFECT_TYPE',name:'불량유형',description:'인쇄불량/파손 등',is_system:0,ord:11},
    {id:'CLAIM_TYPE',name:'클레임유형',description:'납기지연/품질 등',is_system:0,ord:12},
    {id:'DOWNTIME_REASON',name:'비가동사유',description:'고장/자재대기 등',is_system:0,ord:13},
    {id:'RETURN_REASON',name:'반품사유',description:'오배송/불량 등',is_system:0,ord:14},
    {id:'MATERIAL_CAT',name:'자재구분',description:'종이/원단/부자재 등',is_system:0,ord:15},
    {id:'DOC_TYPE',name:'문서유형',description:'견적/수주/WO 등',is_system:1,ord:16},
    {id:'SHIP_METHOD',name:'배송방법',description:'직접배송/택배/화물 등',is_system:0,ord:17}
  ],
  _SEED_ITEMS:[
    // VAT_CONFIG
    {id:'vc_rate',category_id:'VAT_CONFIG',code:'VAT_RATE',name:'부가세율',value:'0.1',color:'',is_default:1,is_active:1,ord:1},
    // PROC_TYPE
    {id:'pt_n',category_id:'PROC_TYPE',code:'n',name:'일반(내부)',value:'',color:'#1E3A5F',is_default:1,is_active:1,ord:1},
    {id:'pt_out',category_id:'PROC_TYPE',code:'out',name:'외주',value:'',color:'#F59E0B',is_default:0,is_active:1,ord:2},
    {id:'pt_exc',category_id:'PROC_TYPE',code:'exc',name:'기타',value:'',color:'#6B7280',is_default:0,is_active:1,ord:3},
    // PROC_STATUS
    {id:'ps_wait',category_id:'PROC_STATUS',code:'대기',name:'대기',value:'',color:'bd-w',is_default:1,is_active:1,ord:1},
    {id:'ps_run',category_id:'PROC_STATUS',code:'진행중',name:'진행중',value:'',color:'bd-p',is_default:0,is_active:1,ord:2},
    {id:'ps_done',category_id:'PROC_STATUS',code:'완료',name:'완료',value:'',color:'bd-d',is_default:0,is_active:1,ord:3},
    {id:'ps_owait',category_id:'PROC_STATUS',code:'외주대기',name:'외주대기',value:'',color:'bd-o',is_default:0,is_active:1,ord:4},
    {id:'ps_orun',category_id:'PROC_STATUS',code:'외주진행중',name:'외주진행중',value:'',color:'bd-e',is_default:0,is_active:1,ord:5},
    {id:'ps_odone',category_id:'PROC_STATUS',code:'외주완료',name:'외주완료',value:'',color:'bd-o',is_default:0,is_active:1,ord:6},
    {id:'ps_skip',category_id:'PROC_STATUS',code:'스킵',name:'스킵',value:'',color:'bd-w',is_default:0,is_active:1,ord:7},
    {id:'ps_cancel',category_id:'PROC_STATUS',code:'취소',name:'취소',value:'',color:'bd-cancel',is_default:0,is_active:1,ord:8},
    // WO_STATUS
    {id:'ws_wait',category_id:'WO_STATUS',code:'대기',name:'대기',value:'',color:'bd-w',is_default:1,is_active:1,ord:1},
    {id:'ws_run',category_id:'WO_STATUS',code:'진행중',name:'진행중',value:'',color:'bd-p',is_default:0,is_active:1,ord:2},
    {id:'ws_cwait',category_id:'WO_STATUS',code:'완료대기',name:'완료대기',value:'',color:'bd-o',is_default:0,is_active:1,ord:3},
    {id:'ws_done',category_id:'WO_STATUS',code:'완료',name:'완료',value:'',color:'bd-d',is_default:0,is_active:1,ord:4},
    {id:'ws_ship',category_id:'WO_STATUS',code:'출고완료',name:'출고완료',value:'',color:'bd-s',is_default:0,is_active:1,ord:5},
    {id:'ws_hold',category_id:'WO_STATUS',code:'보류',name:'보류',value:'',color:'bd-hold',is_default:0,is_active:1,ord:6},
    {id:'ws_cancel',category_id:'WO_STATUS',code:'취소',name:'취소',value:'',color:'bd-cancel',is_default:0,is_active:1,ord:7},
    // CLIENT_TYPE
    {id:'ct_sales',category_id:'CLIENT_TYPE',code:'sales',name:'매출처',value:'',color:'#3B82F6',is_default:1,is_active:1,ord:1},
    {id:'ct_purchase',category_id:'CLIENT_TYPE',code:'purchase',name:'매입처',value:'',color:'#F59E0B',is_default:0,is_active:1,ord:2},
    {id:'ct_both',category_id:'CLIENT_TYPE',code:'both',name:'겸용',value:'',color:'#8B5CF6',is_default:0,is_active:1,ord:3},
    // PAY_METHOD
    {id:'pm_cash',category_id:'PAY_METHOD',code:'cash',name:'현금',value:'',color:'#10B981',is_default:1,is_active:1,ord:1},
    {id:'pm_bill',category_id:'PAY_METHOD',code:'bill',name:'어음',value:'',color:'#F59E0B',is_default:0,is_active:1,ord:2},
    {id:'pm_card',category_id:'PAY_METHOD',code:'card',name:'카드',value:'',color:'#3B82F6',is_default:0,is_active:1,ord:3},
    {id:'pm_transfer',category_id:'PAY_METHOD',code:'transfer',name:'계좌이체',value:'',color:'#6366F1',is_default:0,is_active:1,ord:4},
    {id:'pm_credit',category_id:'PAY_METHOD',code:'credit',name:'외상',value:'',color:'#EF4444',is_default:0,is_active:1,ord:5},
    // PRINT_METHOD
    {id:'prm_offset',category_id:'PRINT_METHOD',code:'offset',name:'옵셋',value:'',color:'',is_default:1,is_active:1,ord:1},
    {id:'prm_digital',category_id:'PRINT_METHOD',code:'digital',name:'디지털',value:'',color:'',is_default:0,is_active:1,ord:2},
    {id:'prm_silk',category_id:'PRINT_METHOD',code:'silk',name:'실크',value:'',color:'',is_default:0,is_active:1,ord:3},
    {id:'prm_flexo',category_id:'PRINT_METHOD',code:'flexo',name:'플렉소',value:'',color:'',is_default:0,is_active:1,ord:4},
    // COATING_METHOD
    {id:'cm_uv',category_id:'COATING_METHOD',code:'uv',name:'유광(UV)',value:'',color:'',is_default:0,is_active:1,ord:1},
    {id:'cm_matt',category_id:'COATING_METHOD',code:'matt',name:'무광',value:'',color:'',is_default:0,is_active:1,ord:2},
    {id:'cm_mech',category_id:'COATING_METHOD',code:'mech',name:'기계코팅',value:'',color:'',is_default:0,is_active:1,ord:3},
    {id:'cm_lami',category_id:'COATING_METHOD',code:'lami',name:'합지',value:'',color:'',is_default:0,is_active:1,ord:4},
    // PAPER_TYPE
    {id:'ppt_art',category_id:'PAPER_TYPE',code:'art',name:'아트지',value:'',color:'',is_default:0,is_active:1,ord:1},
    {id:'ppt_snow',category_id:'PAPER_TYPE',code:'snow',name:'스노우지',value:'',color:'',is_default:0,is_active:1,ord:2},
    {id:'ppt_kraft',category_id:'PAPER_TYPE',code:'kraft',name:'크라프트지',value:'',color:'',is_default:0,is_active:1,ord:3},
    {id:'ppt_ivory',category_id:'PAPER_TYPE',code:'ivory',name:'아이보리',value:'',color:'',is_default:0,is_active:1,ord:4},
    {id:'ppt_ccp',category_id:'PAPER_TYPE',code:'ccp',name:'CCP',value:'',color:'',is_default:0,is_active:1,ord:5},
    // UNIT
    {id:'u_ea',category_id:'UNIT',code:'EA',name:'개',value:'',color:'',is_default:1,is_active:1,ord:1},
    {id:'u_box',category_id:'UNIT',code:'BOX',name:'박스',value:'',color:'',is_default:0,is_active:1,ord:2},
    {id:'u_roll',category_id:'UNIT',code:'ROLL',name:'롤',value:'',color:'',is_default:0,is_active:1,ord:3},
    {id:'u_kg',category_id:'UNIT',code:'KG',name:'킬로그램',value:'',color:'',is_default:0,is_active:1,ord:4},
    {id:'u_m',category_id:'UNIT',code:'M',name:'미터',value:'',color:'',is_default:0,is_active:1,ord:5},
    // SHIP_METHOD
    {id:'sm_direct',category_id:'SHIP_METHOD',code:'direct',name:'직접배송',value:'',color:'',is_default:1,is_active:1,ord:1},
    {id:'sm_parcel',category_id:'SHIP_METHOD',code:'parcel',name:'택배',value:'',color:'',is_default:0,is_active:1,ord:2},
    {id:'sm_freight',category_id:'SHIP_METHOD',code:'freight',name:'화물',value:'',color:'',is_default:0,is_active:1,ord:3},
    {id:'sm_pickup',category_id:'SHIP_METHOD',code:'pickup',name:'직접수령',value:'',color:'',is_default:0,is_active:1,ord:4},
    // DOC_TYPE
    {id:'dt_quote',category_id:'DOC_TYPE',code:'QUOTE',name:'견적서',value:'Q',color:'#6366F1',is_default:0,is_active:1,ord:1},
    {id:'dt_order',category_id:'DOC_TYPE',code:'ORDER',name:'수주',value:'SO',color:'#3B82F6',is_default:0,is_active:1,ord:2},
    {id:'dt_wo',category_id:'DOC_TYPE',code:'WO',name:'작업지시',value:'WO',color:'#F59E0B',is_default:0,is_active:1,ord:3},
    {id:'dt_ship',category_id:'DOC_TYPE',code:'SHIP',name:'출고',value:'SH',color:'#10B981',is_default:0,is_active:1,ord:4},
    {id:'dt_statement',category_id:'DOC_TYPE',code:'STATEMENT',name:'거래명세표',value:'ST',color:'#8B5CF6',is_default:0,is_active:1,ord:5},
    {id:'dt_taxinv',category_id:'DOC_TYPE',code:'TAX_INV',name:'세금계산서',value:'TX',color:'#EC4899',is_default:0,is_active:1,ord:6},
    {id:'dt_sale',category_id:'DOC_TYPE',code:'SALE',name:'매출전표',value:'SL',color:'#14B8A6',is_default:0,is_active:1,ord:7},
    {id:'dt_payment',category_id:'DOC_TYPE',code:'PAYMENT',name:'입금',value:'PM',color:'#F97316',is_default:0,is_active:1,ord:8}
  ],
  cats:function(){
    var c=DB.g(SysCode._CATS_KEY);
    return c.sort(function(a,b){return(a.ord||0)-(b.ord||0)});
  },
  items:function(catId){
    var all=DB.g(SysCode._ITEMS_KEY);
    if(catId)all=all.filter(function(x){return x.category_id===catId&&x.is_active!==0});
    return all.sort(function(a,b){return(a.ord||0)-(b.ord||0)});
  },
  allItems:function(catId){
    var all=DB.g(SysCode._ITEMS_KEY);
    if(catId)all=all.filter(function(x){return x.category_id===catId});
    return all.sort(function(a,b){return(a.ord||0)-(b.ord||0)});
  },
  val:function(catId,code){
    var items=DB.g(SysCode._ITEMS_KEY);
    var found=items.find(function(x){return x.category_id===catId&&x.code===code&&x.is_active!==0});
    return found?found.value:'';
  },
  name:function(catId,code){
    var items=DB.g(SysCode._ITEMS_KEY);
    var found=items.find(function(x){return x.category_id===catId&&x.code===code});
    return found?found.name:code;
  },
  select:function(selId,catId,opts){
    opts=opts||{};
    var el=document.getElementById(selId);if(!el)return;
    var val=el.value;
    var items=SysCode.items(catId);
    var html=opts.allOption?'<option value="all">'+(opts.allLabel||'전체')+'</option>'
             :opts.placeholder?'<option value="">'+(opts.placeholder)+'</option>'
             :'<option value="">선택</option>';
    items.forEach(function(it){
      html+='<option value="'+it.code+'">'+it.name+'</option>';
    });
    el.innerHTML=html;
    if(val)el.value=val;
    if(opts.defaultVal&&!val)el.value=opts.defaultVal;
  },
  badge:function(catId,code){
    var items=DB.g(SysCode._ITEMS_KEY);
    var found=items.find(function(x){return x.category_id===catId&&x.code===code});
    if(!found)return badge(code);
    var cls=found.color||'bd-w';
    if(cls.indexOf('bd-')===0)return '<span class="bd '+cls+'">'+found.name+'</span>';
    return '<span class="bd" style="background:'+cls+';color:#fff">'+found.name+'</span>';
  },
  vatRate:function(){
    var v=SysCode.val('VAT_CONFIG','VAT_RATE');
    return v?parseFloat(v):0.1;
  },
  saveCats:function(list){DB.s(SysCode._CATS_KEY,list)},
  saveItems:function(list){DB.s(SysCode._ITEMS_KEY,list)},
  init:function(){
    var cats=DB.g(SysCode._CATS_KEY);
    if(!cats||!cats.length){
      DB.s(SysCode._CATS_KEY,SysCode._SEED_CATS);
      DB.s(SysCode._ITEMS_KEY,SysCode._SEED_ITEMS);
      console.log('SysCode: seed data initialized ('+SysCode._SEED_CATS.length+' categories, '+SysCode._SEED_ITEMS.length+' items)');
    }
  }
};

/* ===== DocNo: 문서번호 체계 ===== */
var DocNo={
  _COUNTER_KEY:'docCounters',
  next:function(type,date){
    date=date||td();
    var ym=date.slice(0,7).replace('-','');
    var counters=DB.g1(DocNo._COUNTER_KEY)||{};
    var key=type+'_'+ym;
    var seq=(counters[key]||0)+1;
    counters[key]=seq;
    DB.s1(DocNo._COUNTER_KEY,counters);
    var items=DB.g(SysCode._ITEMS_KEY);
    var dt=items.find(function(x){return x.category_id==='DOC_TYPE'&&x.code===type});
    var prefix=dt?dt.value:type.slice(0,2);
    return prefix+ym+'-'+String(seq).padStart(4,'0');
  },
  current:function(type,date){
    date=date||td();
    var ym=date.slice(0,7).replace('-','');
    var counters=DB.g1(DocNo._COUNTER_KEY)||{};
    return counters[type+'_'+ym]||0;
  }
};

/* ===== DocTrace: 문서 추적/연결 ===== */
var DocTrace={
  _LINKS_KEY:'docLinks',
  link:function(fromType,fromId,toType,toId,fromNo,toNo){
    var links=DB.g(DocTrace._LINKS_KEY);
    var exists=links.find(function(l){return l.ft===fromType&&l.fi===fromId&&l.tt===toType&&l.ti===toId});
    if(exists)return;
    links.push({id:gid(),ft:fromType,fi:fromId,fn:fromNo||'',tt:toType,ti:toId,tn:toNo||'',at:nw()});
    DB.s(DocTrace._LINKS_KEY,links);
  },
  forward:function(type,id){
    return DB.g(DocTrace._LINKS_KEY).filter(function(l){return l.ft===type&&l.fi===id});
  },
  backward:function(type,id){
    return DB.g(DocTrace._LINKS_KEY).filter(function(l){return l.tt===type&&l.ti===id});
  },
  chain:function(type,id){
    var visited={};var result=[];
    var _walk=function(t,i,dir){
      var key=t+'_'+i;
      if(visited[key])return;
      visited[key]=true;
      result.push({type:t,id:i});
      var links=dir==='fwd'?DocTrace.forward(t,i):DocTrace.backward(t,i);
      links.forEach(function(l){
        if(dir==='fwd')_walk(l.tt,l.ti,'fwd');
        else _walk(l.ft,l.fi,'back');
      });
    };
    _walk(type,id,'back');
    result=[];visited={};
    // rebuild from earliest
    var earliest=result.length?result[result.length-1]:{type:type,id:id};
    result=[];visited={};
    _walk(earliest.type,earliest.id,'fwd');
    return result;
  },
  fullChain:function(type,id){
    var visited={};var result=[];
    // go backward to find root
    var _back=function(t,i){
      var key=t+'_'+i;
      if(visited[key])return{type:t,id:i};
      visited[key]=true;
      var links=DocTrace.backward(t,i);
      if(!links.length)return{type:t,id:i};
      return _back(links[0].ft,links[0].fi);
    };
    var root=_back(type,id);
    // go forward from root
    visited={};
    var _fwd=function(t,i){
      var key=t+'_'+i;
      if(visited[key])return;
      visited[key]=true;
      var links=DB.g(DocTrace._LINKS_KEY);
      var node=links.find(function(l){return l.ft===t&&l.fi===i})||links.find(function(l){return l.tt===t&&l.ti===i});
      var no=node?(node.ft===t?node.fn:node.tn):'';
      result.push({type:t,id:i,no:no});
      DocTrace.forward(t,i).forEach(function(l){_fwd(l.tt,l.ti)});
    };
    _fwd(root.type,root.id);
    return result;
  },
  renderBreadcrumb:function(type,id){
    var chain=DocTrace.fullChain(type,id);
    if(!chain.length)return '';
    var typeNames={QUOTE:'견적',ORDER:'수주',WO:'작업지시',SHIP:'출고',STATEMENT:'거래명세표',TAX_INV:'세금계산서',SALE:'매출전표',PAYMENT:'입금'};
    return '<div class="doc-breadcrumb" style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:8px 12px;background:var(--bg2);border-radius:8px;font-size:12px;color:var(--txt3)">'+
      chain.map(function(n,i){
        var isCurrent=(n.type===type&&n.id===id);
        var label=(typeNames[n.type]||n.type)+(n.no?' '+n.no:'');
        var style=isCurrent?'font-weight:700;color:var(--pri)':'cursor:pointer;color:var(--txt2)';
        var click=isCurrent?'':'onclick="DocTrace._goDoc(\''+n.type+'\',\''+n.id+'\')"';
        return (i>0?'<span style="color:var(--txt4)">›</span>':'')+
          '<span style="'+style+'" '+click+'>'+label+'</span>';
      }).join('')+'</div>';
  },
  _goDoc:function(type,id){
    // Navigate to the document detail
    var modMap={QUOTE:'qc-quote',ORDER:'mes-plan',WO:'mes-wo',SHIP:'mes-ship',SALE:'acc-sales',STATEMENT:'acc-tax',TAX_INV:'acc-tax',PAYMENT:'acc-sales'};
    if(modMap[type])goMod(modMap[type]);
  }
};

// ===== 범용 기간 필터 + 엑셀 내보내기 =====
function periodFilterHTML(prefix){
  return '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px">'
    +'<div class="filter-btns" id="'+prefix+'PrdBtns">'
    +'<button class="filter-btn on" onclick="setPrd(\''+prefix+'\',\'daily\',this)">일별</button>'
    +'<button class="filter-btn" onclick="setPrd(\''+prefix+'\',\'monthly\',this)">월별</button>'
    +'<button class="filter-btn" onclick="setPrd(\''+prefix+'\',\'yearly\',this)">년별</button>'
    +'<button class="filter-btn" onclick="setPrd(\''+prefix+'\',\'all\',this)">전체</button>'
    +'<button class="filter-btn" onclick="setPrd(\''+prefix+'\',\'range\',this)">기간설정</button>'
    +'</div>'
    +'<div id="'+prefix+'DtCtrl" style="display:flex;gap:4px;align-items:center">'
    +'<button class="btn btn-sm btn-o" onclick="prdNav(\''+prefix+'\',-1)" style="padding:3px 8px">◀</button>'
    +'<input type="date" id="'+prefix+'DtVal" onchange="if(window._prdCb_'+prefix+')window._prdCb_'+prefix+'()" style="padding:5px 8px;border:1px solid var(--bdr);border-radius:6px;font-size:13px">'
    +'<button class="btn btn-sm btn-o" onclick="prdNav(\''+prefix+'\',1)" style="padding:3px 8px">▶</button>'
    +'</div>'
    +'<div id="'+prefix+'RngCtrl" style="display:none;gap:4px;align-items:center">'
    +'<input type="date" id="'+prefix+'From" onchange="if(window._prdCb_'+prefix+')window._prdCb_'+prefix+'()" style="padding:5px 8px;border:1px solid var(--bdr);border-radius:6px;font-size:13px">'
    +'<span style="color:var(--txt3)">~</span>'
    +'<input type="date" id="'+prefix+'To" onchange="if(window._prdCb_'+prefix+')window._prdCb_'+prefix+'()" style="padding:5px 8px;border:1px solid var(--bdr);border-radius:6px;font-size:13px">'
    +'</div>'
    +'<span id="'+prefix+'PrdLabel" style="font-size:13px;font-weight:600;color:var(--txt2)"></span>'
    +'<button class="btn btn-o btn-sm" onclick="prdExport(\''+prefix+'\')">📥 엑셀 저장</button>'
    +'</div>';
}
var _prdState={};
function setPrd(prefix,mode,btn){
  if(!_prdState[prefix])_prdState[prefix]={mode:'daily'};
  _prdState[prefix].mode=mode;
  var btns=$(prefix+'PrdBtns');if(btns)btns.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('on')});
  if(btn)btn.classList.add('on');
  var dtCtrl=$(prefix+'DtCtrl'),rngCtrl=$(prefix+'RngCtrl');
  if(mode==='range'){dtCtrl.style.display='none';rngCtrl.style.display='flex'}
  else if(mode==='all'){dtCtrl.style.display='none';rngCtrl.style.display='none'}
  else{dtCtrl.style.display='flex';rngCtrl.style.display='none';
    var inp=$(prefix+'DtVal');
    if(mode==='monthly')inp.type='month';
    else if(mode==='yearly'){inp.type='number';inp.min='2020';inp.max='2030';if(!inp.value||inp.value.length>4)inp.value=new Date().getFullYear()}
    else{inp.type='date';if(!inp.value)inp.value=td()}
  }
  if(window['_prdCb_'+prefix])window['_prdCb_'+prefix]();
}
function prdNav(prefix,dir){
  var st=_prdState[prefix]||{mode:'daily'};
  var inp=$(prefix+'DtVal');
  if(st.mode==='daily'){var d=new Date(inp.value||td());d.setDate(d.getDate()+dir);inp.value=d.toISOString().slice(0,10)}
  else if(st.mode==='monthly'){var p=inp.value.split('-');var d2=new Date(+p[0],+p[1]-1+dir,1);inp.value=d2.getFullYear()+'-'+String(d2.getMonth()+1).padStart(2,'0')}
  else if(st.mode==='yearly'){inp.value=parseInt(inp.value||new Date().getFullYear())+dir}
  if(window['_prdCb_'+prefix])window['_prdCb_'+prefix]();
}
function getPrdRange(prefix){
  var st=_prdState[prefix]||{mode:'daily'};
  var now=new Date();
  if(st.mode==='all')return{from:null,to:null,label:'전체'};
  if(st.mode==='range'){
    var f=$(prefix+'From').value,t=$(prefix+'To').value;
    return{from:f||null,to:t||null,label:(f||'?')+' ~ '+(t||'?')};
  }
  var v=$(prefix+'DtVal').value;
  if(st.mode==='daily'){return{from:v,to:v,label:v}}
  if(st.mode==='monthly'){return{from:v+'-01',to:v+'-31',label:v}}
  if(st.mode==='yearly'){var y=v||now.getFullYear();return{from:y+'-01-01',to:y+'-12-31',label:y+'년'}}
  return{from:null,to:null,label:''};
}
function prdFilterData(data,prefix,dtField){
  var rng=getPrdRange(prefix);
  var lbl=$(prefix+'PrdLabel');if(lbl)lbl.textContent=rng.label;
  if(!rng.from&&!rng.to)return data;
  return data.filter(function(d){
    var v=d[dtField]||d.dt||d.cat||d.doneAt||'';if(!v)return false;
    var ds=v.slice(0,10);
    if(rng.from&&ds<rng.from)return false;
    if(rng.to&&ds>rng.to)return false;
    return true;
  });
}
// 범용 엑셀 내보내기
var _prdExportData={};
function prdExport(prefix){
  var ed=_prdExportData[prefix];
  if(!ed||!ed.rows||!ed.rows.length){toast('내보낼 데이터가 없습니다','err');return}
  if(typeof XLSX==='undefined'){toast('엑셀 라이브러리 로드 실패','err');return}
  var ws=XLSX.utils.aoa_to_sheet([ed.headers].concat(ed.rows));
  ws['!cols']=ed.headers.map(function(){return{wch:16}});
  var wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,ed.sheetName||'데이터');
  var rng=getPrdRange(prefix);
  var fn=(ed.fileName||prefix)+'_'+(rng.label||td()).replace(/[\/\s]/g,'_')+'.xlsx';
  XLSX.writeFile(wb,fn);
  toast('엑셀 저장 완료','ok');
}
function toast(m,t){t=t||'';var e=$('toast');e.textContent=m;e.className='toast '+t+' show';setTimeout(function(){e.classList.remove('show')},2400)}
function cMo(id){var e=$(id);if(e){e.classList.add('hidden');if(e.classList.contains('mo-bg')&&e.parentElement===document.body)e.remove()}}
function oMo(id){var e=$(id);if(e)e.classList.remove('hidden')}
function emptyHtml(icon,msg,sub){return '<div style="text-align:center;padding:40px;color:#9CA3AF"><div style="font-size:40px">'+icon+'</div><div style="font-size:15px;font-weight:700;margin:8px 0">'+msg+'</div><div style="font-size:13px">'+sub+'</div></div>'}
function cm(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}

// 공정별 대기/진행/완료 통일 집계 함수
// 외주 공정 여부 (인쇄, 외주가공 등 tp=external)
function isExternalProc(nm){var p=getProcs().find(function(x){return x.nm===nm});return !!(p&&p.tp==='external')}
function getProcQueue(proc){
  var os=DB.g('wo');
  var wait=[],ing=[],done=[];
  var ext=isExternalProc(proc);
  os.forEach(function(o){
    if(o.status==='취소')return;
    if(!o.procs)return;
    var cp=curP(o);
    o.procs.forEach(function(p,pi){
      if(p.nm!==proc)return;
      // 기계코팅은 대기열에 넣지 않음 (인쇄 완료 시 자동 처리)
      if(p.nm==='코팅'&&p.mt==='기계코팅'&&p.st==='대기')return;
      var dl=o.sd?Math.round((new Date(o.sd)-new Date(td()))/864e5):999;
      var item={wid:o.id,pi:pi,pnm:o.pnm,cnm:o.cnm,qty:p.qty||o.fq||0,sd:o.sd,dday:dl,st:p.st,vd:p.vd||'',df:p.df||0,pri:o.pri||999,tp:p.tp,t1:p.t1,t2:p.t2,machine:p.machine||''};
      // 완료된 공정: 당일 완료분만
      if(p.st==='완료'||p.st==='외주완료'){if(p.t2&&p.t2.slice(0,10)===td())done.push(item);return}
      // 출고완료/완료/완료대기 WO의 미완료 공정은 제외
      if(o.status==='출고완료'||o.status==='완료'||o.status==='완료대기')return;
      // 현재 공정인 경우만 대기/진행에 표시
      if(cp&&cp.nm===proc){
        if(p.st==='진행중'||p.st==='외주대기')ing.push(item);
        else if(p.st==='대기'&&!ext)wait.push(item); // 외주공정은 대기 없음
      }
    });
  });
  wait.sort(function(a,b){return a.pri-b.pri||a.dday-b.dday});
  return {wait:wait,ing:ing,done:done,isExt:ext};
}
function fmt(n){return Number(n||0).toLocaleString()}
/* 로컬 날짜 포맷 (timezone 안전) */
function localDate(d){var y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return y+'-'+m+'-'+day}
function addDays(dateStr,n){var d=new Date(dateStr+'T00:00:00');d.setDate(d.getDate()+n);return localDate(d)}
function weekStart(dateStr){var d=new Date(dateStr+'T00:00:00');var day=d.getDay();var diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return localDate(d)}
function weekEnd(dateStr){var d=new Date(weekStart(dateStr)+'T00:00:00');d.setDate(d.getDate()+6);return localDate(d)}
function monthStart(dateStr){return dateStr.slice(0,7)+'-01'}
function monthEnd(dateStr){var d=new Date(dateStr+'T00:00:00');var last=new Date(d.getFullYear(),d.getMonth()+1,0);return localDate(last)}

var currentUser=null,CU=null,MR={},ER={},woFilter='all';
async function unifiedLogin(){var user=$('loginUser').value,pw=$('loginPw').value;if(!user){$('loginErr').textContent='사용자를 선택하세요';return}
  // Server auth
  var serverAuth=false;
  try{
    var res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:user,password:pw})});
    var data=await res.json();
    if(!res.ok){$('loginErr').textContent=data.detail||'로그인 실패';return}
    _authTokens.access=data.access_token;_authTokens.refresh=data.refresh_token;
    serverAuth=true;
    await DB.init();
    SysCode.init();
  }catch(e){
    // Offline fallback
    var us=DB.g('users');var uObj=us.find(function(u){return u.nm===user||u.un===user||u.id===user});
    var userPw=uObj&&uObj.pw?uObj.pw:'1234';
    if(userPw.startsWith('$2b$')||userPw.startsWith('$2a$')){$('loginErr').textContent='오프라인에서는 로그인 불가';return}
    if(pw!==userPw){$('loginErr').textContent='비밀번호가 틀립니다';return}
  }
  var us=DB.g('users');var uObj=us.find(function(u){return u.nm===user||u.un===user||u.id===user});
  var isAdmin=user==='admin'||(uObj&&uObj.role==='admin');var isOffice=uObj&&(uObj.role==='office'||uObj.role==='sales'||uObj.role==='material'||uObj.role==='accounting'||uObj.role==='quality');
  var proc=uObj?uObj.proc:'';var userRole=isAdmin?'admin':(isOffice?(uObj.role):(proc?'worker':'admin'));
  currentUser={id:user,name:isAdmin?'관리자':user,role:userRole,proc:proc};CU={nm:currentUser.name,role:currentUser.role,proc:currentUser.proc,perms:uObj&&uObj.perms?uObj.perms:null};
  $('loginOverlay').style.display='none';var now=new Date(),days=['일','월','화','수','목','금','토'],ds=now.getFullYear()+'.'+String(now.getMonth()+1).padStart(2,'0')+'.'+String(now.getDate()).padStart(2,'0')+' ('+days[now.getDay()]+')';
  if(currentUser.role==='worker'&&currentUser.proc){$('workerApp').style.display='flex';$('adminApp').style.display='none';$('wProcTitle').textContent=currentUser.proc;$('wNameDisp').textContent=currentUser.name;$('wDateDisp').textContent=ds;rWQ();}else{$('workerApp').style.display='none';$('adminApp').style.display='flex';$('sbUserName').textContent=currentUser.name;$('sbAvatar').textContent=currentUser.name.charAt(0);var roleNames={'admin':'관리자','office':'사무실','sales':'영업','material':'자재','accounting':'회계','quality':'품질'};$('sbUserRole').textContent=roleNames[currentUser.role]||currentUser.role;$('sbDate').textContent=ds;SysCode.init();initProcsIfNeeded();refreshProcSelects();fillProcButtons('procBtnArea');document.querySelectorAll('.sb-group').forEach(function(g){g.classList.remove('open')});goMod('mes-dash');genNotifications();applyRoleAccess();}
  /* 기본 비밀번호 1234 사용 시 경고 (외부 노출 환경 대응) */
  if(pw==='1234'&&isAdmin){setTimeout(function(){
    if(confirm('⚠ 보안 경고\n\n관리자 계정이 기본 비밀번호(1234)를 사용 중입니다.\n외부에서도 접속 가능한 상태이므로 즉시 변경하세요.\n\n지금 비밀번호 변경 화면으로 이동하시겠습니까?')){
      if(typeof goMod==='function')goMod('mes-queue');
    }
  },1500)}
}
function unifiedLogout(){
  if(_authTokens.refresh){fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:_authTokens.refresh})}).catch(function(){})}
  _authTokens={access:null,refresh:null};currentUser=null;CU=null;$('loginOverlay').style.display='flex';$('adminApp').style.display='none';$('workerApp').style.display='none';if(typeof refreshLoginUsers==='function')refreshLoginUsers()}
function toggleSbGroup(g){var willOpen=!g.classList.contains('open');g.classList.toggle('open');g.setAttribute('aria-expanded', g.classList.contains('open'));if(!willOpen)return;var tree=g.nextElementSibling;if(!tree)return;setTimeout(function(){var sc=g.parentElement;while(sc&&sc!==document.body){var cs=getComputedStyle(sc);if(cs.overflowY==='auto'||cs.overflowY==='scroll')break;sc=sc.parentElement}if(!sc||sc===document.body)return;var scR=sc.getBoundingClientRect(),trR=tree.getBoundingClientRect();var overflow=trR.bottom-scR.bottom;if(overflow>0)sc.scrollTo({top:sc.scrollTop+overflow+10,behavior:'smooth'})},300)}
function wrapTablesForScroll(){
  document.querySelectorAll('table.dt').forEach(function(t){
    var p=t.parentElement;if(!p)return;
    if(p.classList.contains('dt-scroll'))return;
    if(p.tagName==='DIV'&&(p.style.overflowX==='auto'||p.style.overflow==='auto'))return;
    var w=document.createElement('div');w.className='dt-scroll';
    p.insertBefore(w,t);w.appendChild(t);
  });
}
/* ===== Summary Grid Toggle (접기/펼치기) ===== */
function initSgToggles(){
  var sgs=document.querySelectorAll('.sg');
  sgs.forEach(function(sg){
    if(sg.closest('#t-dash'))return;
    if(sg.previousElementSibling&&sg.previousElementSibling.classList.contains('sg-toggle'))return;
    var btn=document.createElement('button');
    btn.className='sg-toggle';
    btn.innerHTML='<span class="sg-arrow">▶</span> 요약';
    btn.onclick=function(){
      var open=sg.classList.toggle('sg-hidden');
      if(open){btn.classList.remove('sg-open');btn.querySelector('.sg-arrow').textContent='▶'}
      else{btn.classList.add('sg-open');btn.querySelector('.sg-arrow').textContent='▼'}
    };
    sg.parentNode.insertBefore(btn,sg);
    sg.classList.add('sg-hidden');
  });
}
document.addEventListener('DOMContentLoaded',function(){setTimeout(wrapTablesForScroll,100);setTimeout(initSgToggles,150);setTimeout(function(){if(typeof ContrastCheck!=='undefined')ContrastCheck.audit()},2000)});
var _resizeTimer=null;
function _onWindowResize(){
  if(_resizeTimer)clearTimeout(_resizeTimer);
  _resizeTimer=setTimeout(function(){
    var active=document.querySelector('.sb-item.active');
    if(!active)return;
    var mod=active.getAttribute('data-mod');
    if(!mod)return;
    // 캔버스/SVG 차트가 있는 모듈만 재렌더
    if(['mes-dash','biz-trend','biz-rank','biz-cost','mes-rpt','mes-ship','mes-wo','acc-cashflow'].indexOf(mod)>-1){
      try{
        if(typeof MR!=='undefined'&&MR[mod])MR[mod]();
        if(typeof ER!=='undefined'&&ER[mod])ER[mod]();
      }catch(e){}
    }
  },250);
}
window.addEventListener('resize',_onWindowResize);
window.addEventListener('orientationchange',_onWindowResize);
// 미디어쿼리 변경도 감지(viewport meta 시뮬 대응)
if(window.matchMedia){
  ['(max-width:767px)','(max-width:1023px)','(max-width:1279px)'].forEach(function(q){
    var m=window.matchMedia(q);
    if(m.addEventListener)m.addEventListener('change',_onWindowResize);
    else if(m.addListener)m.addListener(_onWindowResize);
  });
}

var PG={'mes-order':'mes-admin','mes-shiplog':'mes-admin','mes-dash':'mes-admin','mes-wo':'mes-admin','mes-ship':'mes-admin','mes-cli':'mes-admin','mes-prod':'mes-admin','mes-vendor':'mes-admin','mes-mold':'mes-admin','mes-rpt':'mes-admin','mes-plan':'mes-admin','mes-queue':'mes-admin','mes-worker':'mes-admin','mes-perf':'mes-admin','mes-cal':'mes-admin','mat-stock':'mat-income','mat-po':'mat-income','mat-bom':'mat-income','acc-purchase':'acc-sales','acc-tax':'acc-sales','hr-att':'hr-emp','hr-pay':'hr-emp','hr-leave':'hr-emp','biz-rank':'biz-trend','biz-cost':'biz-trend','qc-equip':'qc-inspect','qc-quote':'qc-inspect','qc-approval':'qc-inspect'};
var TAB_MAP={'mat-income':'income','mat-stock':'stock','mat-po':'po','mat-bom':'bom','acc-sales':'sales','acc-purchase':'purchase','acc-tax':'tax','hr-emp':'emp','hr-att':'att','hr-pay':'pay','hr-leave':'leave','biz-trend':'trend','biz-rank':'rank','biz-cost':'cost','qc-inspect':'qc','qc-equip':'equip','qc-quote':'quote','qc-approval':'approval'};
var GROUPS={
'mes-order':{tabs:[{id:'mes-order',l:'수주목록'},{id:'mes-order-track',l:'납기추적'}]},
'mes-ship':{tabs:[{id:'mes-ship',l:'출고'},{id:'ship-partial',l:'부분출고'},{id:'ship-return',l:'반품'},{id:'qc-claim',l:'클레임'}]},
'mes-dash':{tabs:[{id:'mes-dash',l:'운영판'},{id:'mes-worker',l:'작업자현황'}]},
'mes-proc-log':{tabs:[{id:'mes-proc-log',l:'실적입력'}]},
'qc-inspect':{tabs:[{id:'qc-inspect',l:'수입검사'},{id:'ship-inspect',l:'출하검사'},{id:'qc-cert',l:'검사성적서'},{id:'mes-defect',l:'불량등록'}]},
'qc-equip':{tabs:[{id:'qc-equip',l:'설비대장'}]},
'mat-stock':{tabs:[{id:'mat-stock',l:'재고현황'},{id:'mat-income',l:'입고'},{id:'mat-safety',l:'안전재고'}]},
'mat-po':{tabs:[{id:'mat-po',l:'발주서'}]},
'mat-bom':{tabs:[{id:'mat-bom',l:'BOM'}]},
'acc-sales':{tabs:[{id:'acc-sales',l:'매출'},{id:'acc-purchase',l:'매입'},{id:'acc-costing',l:'원가분석'}]},
'acc-tax':{tabs:[{id:'acc-tax',l:'세금계산서'},{id:'acc-etax',l:'전자세금계산서'}]},
'acc-recv':{tabs:[{id:'acc-recv',l:'미수미지급'},{id:'acc-cashflow',l:'입출금'}]},
'hr-emp':{tabs:[{id:'hr-emp',l:'직원'},{id:'hr-att',l:'출퇴근'},{id:'hr-leave',l:'연차'}]},
'hr-pay':{tabs:[{id:'hr-pay',l:'급여'},{id:'hr-shift',l:'교대스케줄'},{id:'hr-insurance',l:'4대보험'}]},
'mes-cli':{tabs:[{id:'mes-cli',l:'거래처'},{id:'mes-vendor',l:'협력사'},{id:'mes-prod',l:'패키지 품목'},{id:'mes-mold',l:'목형'},{id:'adm-code',l:'공통코드'}]},
'adm-backup':{tabs:[{id:'adm-backup',l:'백업/복원'},{id:'adm-audit',l:'감사로그'},{id:'mes-queue',l:'설정'}]},
'biz-kpi':{tabs:[{id:'biz-kpi',l:'KPI'},{id:'biz-trend',l:'추이'},{id:'biz-rank',l:'순위'},{id:'biz-profit',l:'수익성'},{id:'biz-ontime',l:'납기준수율'},{id:'biz-monthly',l:'월간보고서'},{id:'mes-rpt',l:'생산보고'}]}
};
var PARENT_MAP={};Object.keys(GROUPS).forEach(function(gid){GROUPS[gid].tabs.forEach(function(t){if(t.id!==gid)PARENT_MAP[t.id]=gid})});
function updateShipBadge(){try{var _shipReady=DB.g('wo').filter(function(o){return o.status==='완료'||o.status==='완료대기'}).length;var _sb=$('sbShipBadge');if(_sb){if(_shipReady>0){_sb.textContent=_shipReady;_sb.style.display='flex'}else{_sb.style.display='none'}}}catch(e){}}
function goMod(id){if(CU&&CU.perms&&CU.perms.indexOf(id)<0&&CU.role!=='admin'){toast('접근 권한이 없습니다','err');return}var sbEl=document.querySelector('.sb-item[data-mod="'+id+'"]');if(sbEl&&sbEl.getAttribute('data-ready')==='false'){toast('🔒 준비중인 기능입니다','err');return}updateShipBadge();document.querySelectorAll('.sb-item').forEach(function(e){e.classList.remove('active');e.removeAttribute('aria-current')});var _sbId=PARENT_MAP[id]||id;var el=document.querySelector('.sb-item[data-mod="'+_sbId+'"]');if(el){el.classList.add('active');el.setAttribute('aria-current','page');var tree=el.closest('.sb-tree');if(tree){var grp=tree.previousElementSibling;if(grp&&grp.classList.contains('sb-group'))grp.classList.add('open')}}document.querySelectorAll('.module-page').forEach(function(p){p.classList.remove('active')});var pgId=PG[id]||id;var pg=$('pg-'+pgId);if(pg)pg.classList.add('active');$('sidebar').classList.remove('open');
var tabId=TAB_MAP[id];if(tabId){var parentPg=$('pg-'+pgId);if(parentPg){parentPg.querySelectorAll('.tc').forEach(function(c){c.classList.remove('on')});var tab=$('t-'+tabId);if(tab)tab.classList.add('on');parentPg.querySelectorAll('.hd-tab').forEach(function(b){b.classList.remove('on');if(b.getAttribute('data-tab')===tabId)b.classList.add('on');b.setAttribute('aria-selected',b.classList.contains('on'))})}}
var titleMap={'mes-order':'수주관리','mes-shiplog':'출고내역','mes-dash':'패키지 운영판','mes-wo':'패키지 작업지시','mes-ship':'출고','mes-cli':'거래처','mes-prod':'패키지 품목','mes-mold':'목형','mes-rpt':'생산보고','mes-cal':'캘린더','mes-sched':'스케줄 보드','mes-perf':'성과분석','mes-plan':'생산계획','mes-vendor':'협력사','mes-queue':'시스템설정','mes-worker':'작업자 현황','mat-income':'입고','mat-stock':'자재 재고','mat-po':'발주서','mat-bom':'BOM','acc-sales':'매출','acc-purchase':'매입','acc-tax':'세금계산서','acc-recv':'미수/미지급','acc-cashflow':'입출금','acc-closing':'외상 마감','acc-vat':'부가세 신고','acc-bill':'어음 관리','acc-bank':'통장 관리','acc-expense':'지출결의서','hr-emp':'직원','hr-att':'출퇴근','hr-pay':'급여','hr-leave':'연차','biz-trend':'추이','biz-rank':'순위','biz-cost':'원가','qc-inspect':'품질검사','qc-equip':'설비','qc-quote':'패키지 견적','qc-approval':'전자결재','mes-order-track':'납기추적','mes-due':'납기관리','mes-proc-log':'공정실적','mes-lot':'로트추적','mes-downtime':'비가동관리','mes-defect':'불량관리','mes-outsource':'외주진행','mes-mold-hist':'금형이력','mes-oee':'OEE','ship-partial':'부분출고','ship-return':'반품관리','ship-inspect':'출하검사','mat-safety':'안전재고','mat-mrp':'MRP','mat-audit':'재고실사','mat-price':'단가이력','acc-etax':'전자세금계산서','acc-costing':'원가분석','acc-aging':'채권Aging','hr-shift':'교대스케줄','hr-insurance':'4대보험','biz-kpi':'실시간KPI','biz-profit':'수익성분석','biz-ontime':'납기준수율','biz-monthly':'월간보고서','qc-claim':'클레임','qc-pm':'예방보전','qc-breakdown':'고장이력','qc-cert':'검사성적서','adm-perm':'권한관리','adm-backup':'백업/복원','adm-audit':'감사로그','adm-code':'공통코드','mes-monitor':'현장모니터'};
if(titleMap[id]){var mt=$('mainTitle');if(mt)mt.textContent=titleMap[id];var bc=$('mainBreadcrumb');if(bc){var bcMap={'mes-order':'견적·수주','mes-order-track':'견적·수주','qc-quote':'견적·수주','qc-claim':'출고·정산','mes-wo':'생산·공정','mes-dash':'패키지 제조','mes-plan':'생산·공정','mes-worker':'생산·공정','mes-proc-log':'생산·공정','mes-lot':'생산·공정','mes-outsource':'생산·공정','mes-monitor':'생산·공정','mat-stock':'자재·외주','mat-income':'자재·외주','mat-safety':'자재·외주','mat-audit':'자재·외주','mat-po':'자재·외주','mat-price':'자재·외주','mat-bom':'자재·외주','mat-mrp':'자재·외주','mes-ship':'출고·정산','ship-partial':'출고·정산','ship-return':'출고·정산','ship-inspect':'출고·정산','qc-inspect':'기준정보','qc-cert':'출고·정산','mes-defect':'출고·정산','acc-sales':'출고·정산','acc-purchase':'출고·정산','acc-tax':'출고·정산','acc-costing':'출고·정산','acc-etax':'출고·정산','acc-pl':'보고·분석','acc-recv':'출고·정산','acc-cashflow':'출고·정산','acc-closing':'보고·분석','acc-aging':'출고·정산','acc-monthly':'보고·분석','hr-emp':'시스템','hr-att':'시스템','hr-leave':'시스템','hr-pay':'시스템','hr-shift':'시스템','hr-insurance':'시스템','biz-trend':'보고·분석','biz-rank':'보고·분석','biz-cost':'보고·분석','biz-kpi':'보고·분석','biz-profit':'보고·분석','biz-ontime':'보고·분석','biz-monthly':'보고·분석','mes-rpt':'보고·분석','mes-cli':'기준정보','mes-vendor':'자재·외주','mes-prod':'기준정보','mes-mold':'기준정보','qc-equip':'기준정보','qc-pm':'기준정보','qc-breakdown':'기준정보','mes-downtime':'기준정보','mes-oee':'기준정보','mes-mold-hist':'기준정보','adm-code':'시스템','qc-approval':'시스템','adm-perm':'시스템','adm-backup':'시스템','adm-audit':'시스템','mes-queue':'시스템'};if(bcMap[id])bc.textContent=bcMap[id];else bc.textContent='패키지 제조'}}
var _gid=PARENT_MAP[id]||id;var _gtb=$('groupTabBar');if(GROUPS[_gid]){var _grp=GROUPS[_gid];_gtb.innerHTML=_grp.tabs.map(function(t){return'<button style="padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;border:1px solid '+(t.id===id?'var(--pri)':'var(--bdr)')+';background:'+(t.id===id?'var(--pri)':'var(--bg1)')+';color:'+(t.id===id?'#fff':'var(--txt2)')+';transition:all .15s" onclick="goMod(\''+t.id+'\')">'+t.l+'</button>'}).join('');_gtb.style.display='flex'}else{_gtb.style.display='none';_gtb.innerHTML=''}
if(MR[id])MR[id]();if(ER[id])ER[id]();}
var _mesInited=false;
function initMesInAdmin(){if(_mesInited)return;var t=$('pg-mes-admin'),admin=$('adminScreen'),ab=document.querySelector('#adminScreen .a-body');if(t&&admin){var h=document.createElement('div');h.id='mesTabBar';h.style.cssText='display:none';h.innerHTML='';t.appendChild(h);if(ab){while(ab.firstChild)t.appendChild(ab.firstChild);}// .a-body 밖에 남은 adminScreen 직접 자식들도 이동 (t-ship, t-plan 등)
Array.from(admin.children).forEach(function(c){if(c!==ab)t.appendChild(c);});// Move modals out of adminScreen(display:none) so position:fixed works
// .mo-ov/.cm 안의 내부 .mo는 제외 — 래퍼(mo-ov/cm)만 이동해야 내부 구조가 유지됨
document.querySelectorAll('#adminScreen .mo-ov,#adminScreen .cm,#adminScreen .caut-popup').forEach(function(el){document.body.appendChild(el);});
// .mo-ov/.cm 없이 직접 .mo 클래스인 최상위 모달만 추가 이동 (id 있는 것만)
document.querySelectorAll('#adminScreen .mo[id]').forEach(function(el){if(!el.closest('.mo-ov')&&!el.closest('.cm'))document.body.appendChild(el);});_mesInited=true;}}
function mesGoTab(tab,btn){if(btn){var p=btn.parentElement;if(p)p.querySelectorAll('.s-tab').forEach(function(t){t.classList.remove('on')});btn.classList.add('on')}document.querySelectorAll('#pg-mes-admin .tc').forEach(function(t){t.classList.remove('on')});var el=$('t-'+tab);if(el)el.classList.add('on');var fn={'order':function(){if(typeof rOrder==='function')rOrder()},'shiplog':function(){if(typeof shipSub==='function')shipSub('hist')},'dash':function(){if(typeof rDash==='function')rDash()},'wo':function(){if(typeof woSub==='function')woSub('list')},'ship':function(){if(typeof shipSub==='function')shipSub('ready')},'cli':function(){if(typeof rCli==='function')rCli()},'prod':function(){if(typeof rProd==='function')rProd()},'mold':function(){if(typeof rMold==='function')rMold()},'rpt':function(){if(typeof rptSub==='function')rptSub('day')},'cal':function(){if(typeof rCal==='function')rCal()},'perf':function(){if(typeof rPerf==='function')rPerf()},'plan':function(){if(typeof rPlan==='function')rPlan()},'vendor':function(){if(typeof rVendor==='function')rVendor()},'set':function(){if(typeof rUsers==='function')rUsers();if(typeof rLogs==='function')rLogs();if(typeof renderSettingsExt==='function')renderSettingsExt()},'worker':function(){if(typeof rWorkerMonitor==='function')rWorkerMonitor()}};if(fn[tab])fn[tab]();}
function activateMesAdmin(tab){initMesInAdmin();document.querySelectorAll('.module-page').forEach(function(p){p.classList.remove('active')});var pg=$('pg-mes-admin');if(pg)pg.classList.add('active');mesGoTab(tab);}
MR['mes-order']=function(){activateMesAdmin('order')};MR['mes-shiplog']=function(){activateMesAdmin('ship');setTimeout(function(){if(typeof shipSub==='function')shipSub('hist')},50)};MR['mes-dash']=function(){activateMesAdmin('dash')};MR['mes-wo']=function(){activateMesAdmin('wo')};MR['mes-ship']=function(){activateMesAdmin('ship')};MR['mes-cli']=function(){activateMesAdmin('cli')};MR['mes-prod']=function(){activateMesAdmin('prod')};MR['mes-mold']=function(){activateMesAdmin('mold')};MR['mes-rpt']=function(){activateMesAdmin('rpt')};MR['mes-plan']=function(){activateMesAdmin('plan')};MR['mes-vendor']=function(){activateMesAdmin('vendor')};MR['mes-queue']=function(){activateMesAdmin('set')};MR['mes-perf']=function(){activateMesAdmin('perf')};MR['mes-cal']=function(){activateMesAdmin('cal')};MR['mes-worker']=function(){activateMesAdmin('worker')};

MR['acc-closing']=function(){$('closingArea').innerHTML=renderClosing()};
MR['acc-vat']=function(){if(typeof renderVatReport==='function')renderVatReport()};
MR['acc-bill']=function(){if(typeof rBill==='function')rBill()};
MR['acc-bank']=function(){if(typeof rBank==='function')rBank()};
MR['acc-expense']=function(){if(typeof rExpense==='function')rExpense()};
MR['mat-lot']=function(){$('lotArea').innerHTML=renderStockHistory()};
MR['mat-abc']=function(){$('abcArea').innerHTML=renderStockABC()};
MR['mat-lead']=function(){$('leadArea').innerHTML=renderLeadTime()};
MR['hr-attstats']=function(){$('attStatsArea').innerHTML=renderAttStats()};
MR['hr-card']=function(){
  var sel=$('empCardSel');var emps=DB.g('emp');
  sel.innerHTML='<option value="">직원 선택</option>'+emps.map(function(e){return'<option value="'+e.id+'">'+e.nm+' ('+( e.dept||'')+')'+' </option>'}).join('');
  $('empCardArea').innerHTML='<div style="text-align:center;padding:20px;color:var(--txt3)">직원을 선택하세요</div>';
};
MR['hr-org']=function(){$('orgArea').innerHTML=renderOrgChart()};
MR['hr-payhist']=function(){$('payHistArea').innerHTML=renderPayHistory()};

MR['mes-sched']=function(){renderSchedBoard()};
/* ===== 확장 모듈 라우팅 ===== */
MR['mes-order-track']=function(){if(typeof rOrderTrack==='function')rOrderTrack()};
MR['mes-proc-log']=function(){if(typeof rProcLog==='function'){fillProcSelect('plProc',true);rProcLog()}};
MR['mes-lot']=function(){if(typeof rLotTrace==='function')rLotTrace()};
MR['mes-downtime']=function(){if(typeof rDowntime==='function'){_equipSelect('dtEquip');rDowntime()}};
MR['mes-defect']=function(){if(typeof rDefect==='function')rDefect()};
MR['mes-outsource']=function(){if(typeof rOutsource==='function'){_vendorSelect('osVendor');rOutsource()}};
MR['mes-mold-hist']=function(){if(typeof rMoldHist==='function')rMoldHist()};
MR['mes-oee']=function(){if(typeof rOEE==='function'){_equipSelect('oeeEquip');rOEE()}};
MR['mes-monitor']=function(){if(typeof rMonitor==='function')rMonitor()};
MR['ship-partial']=function(){if(typeof rShipPartial==='function')rShipPartial()};
MR['ship-return']=function(){if(typeof rReturn==='function')rReturn()};
MR['ship-inspect']=function(){if(typeof rShipInspect==='function')rShipInspect()};
MR['mat-safety']=function(){if(typeof rSafety==='function')rSafety()};
MR['mat-mrp']=function(){if(typeof rMRP==='function')rMRP()};
MR['mat-audit']=function(){if(typeof rMatAudit==='function')rMatAudit()};
MR['mat-price']=function(){if(typeof rPriceHist==='function')rPriceHist()};
MR['acc-etax']=function(){if(typeof rEtax==='function')rEtax()};
MR['acc-costing']=function(){if(typeof rCosting==='function')rCosting()};
MR['acc-aging']=function(){if(typeof rAging==='function')rAging()};
MR['hr-shift']=function(){if(typeof rShift==='function')rShift()};
MR['hr-insurance']=function(){if(typeof rInsurance==='function')rInsurance()};
MR['biz-kpi']=function(){if(typeof rKPI==='function')rKPI()};
MR['biz-profit']=function(){if(typeof rProfit==='function')rProfit()};
MR['biz-ontime']=function(){if(typeof rOntime==='function')rOntime()};
MR['biz-monthly']=function(){if(typeof rMonthlyReport==='function')rMonthlyReport()};
MR['qc-claim']=function(){if(typeof rClaims==='function')rClaims()};
MR['qc-pm']=function(){if(typeof rPM==='function'){_equipSelect('pmEquip');rPM()}};
MR['qc-breakdown']=function(){if(typeof rBreakdown==='function'){_equipSelect('bdEquip');rBreakdown()}};
MR['qc-cert']=function(){if(typeof rCert==='function')rCert()};
MR['adm-perm']=function(){if(typeof rPerm==='function')rPerm()};
MR['adm-backup']=function(){if(typeof rBackup==='function')rBackup()};
MR['adm-audit']=function(){if(typeof rAuditLog==='function')rAuditLog()};
MR['adm-code']=function(){if(typeof rCodes==='function')rCodes()};
MR['adm-docflow']=function(){if(typeof rDocFlow==='function')rDocFlow()};
MR['mat-ledger']=function(){if(typeof rProductLedger==='function')rProductLedger()};
MR['acc-recv']=function(){if(typeof rAging==='function')rAging();else $('recvArea').innerHTML=renderReceivables()};
MR['acc-cashflow']=function(){$('cashflowArea').innerHTML=renderPayments()};
MR['biz-contract']=function(){$('contractArea').innerHTML=renderContracts()};
MR['biz-ceo']=function(){$('ceoArea').innerHTML=renderCEODash()};
ER['mat-income']=function(){if(typeof rIncome==='function')rIncome()};ER['mat-stock']=function(){if(typeof rStock==='function')rStock()};ER['mat-po']=function(){if(typeof rPO==='function')rPO()};ER['mat-bom']=function(){if(typeof rBOM==='function')rBOM()};
ER['acc-sales']=function(){if(typeof rSl==='function')rSl()};ER['acc-purchase']=function(){if(typeof rPr==='function')rPr()};ER['acc-pl']=function(){if(typeof rPl==='function')rPl()};ER['acc-tax']=function(){if(typeof rTx==='function')rTx()};
ER['hr-emp']=function(){if(typeof rEmp==='function')rEmp()};ER['hr-att']=function(){if(typeof rAtt==='function')rAtt()};ER['hr-pay']=function(){if(typeof rPay==='function')rPay();var _prEl=$('payrollAutoArea');if(_prEl&&typeof renderPayrollAuto==='function')_prEl.innerHTML=renderPayrollAuto()};ER['hr-leave']=function(){if(typeof rLeave==='function')rLeave();var _laEl=$('leaveAutoArea');if(_laEl&&typeof renderLeaveAuto==='function')_laEl.innerHTML=renderLeaveAuto()};
ER['biz-trend']=function(){var y=$('trY');if(y&&!y.options.length){var yr=new Date().getFullYear();for(var i=yr;i>=yr-3;i--){var o=document.createElement('option');o.value=i;o.textContent=i+'년';y.appendChild(o)}}if(typeof renderTrend==='function')renderTrend();var mA=$('monthlyArea');if(mA&&typeof renderSalesMonthly==='function')mA.innerHTML=renderSalesMonthly();var sA=$('salesTrendArea');if(sA&&typeof renderSalesTrend==='function')sA.innerHTML=renderSalesTrend()};
ER['biz-rank']=function(){if(typeof renderRank==='function')renderRank()};ER['biz-cost']=function(){if(typeof renderCost==='function')renderCost()};
ER['qc-inspect']=function(){if(typeof rQc==='function')rQc()};ER['qc-equip']=function(){if(typeof rEq==='function'){rEq();renderEqUtil()}};ER['qc-quote']=function(){if(typeof rQt==='function')rQt()};ER['qc-approval']=function(){if(typeof rAp==='function')rAp()};


// ===== LOGIN USER SELECT =====
function refreshLoginUsers(){
  var sel=document.getElementById('loginUser');
  var curVal=sel.value;
  sel.innerHTML='<option value="">-- 선택 --</option>';
  fetch('/api/users/public').then(function(r){
    if(!r.ok) throw new Error('users');
    return r.json();
  }).then(function(us){
    if(!Array.isArray(us)||!us.length)us=[{nm:'관리자',un:'admin',role:'admin',proc:''}];
    us.forEach(function(u){
      var opt=document.createElement('option');
      opt.value=u.un||u.nm;
      opt.textContent=u.nm+(u.proc?' ('+u.proc+')':u.role==='admin'?' (관리자)':u.role==='office'?' (사무실)':'');
      sel.appendChild(opt);
    });
    if(curVal)sel.value=curVal;
  }).catch(function(){
    var us;
    try{us=DB.g('users')}catch(e){us=JSON.parse(localStorage.getItem('ino_users')||'[]')}
    if(!us||!us.length)us=[{nm:'관리자',un:'admin',role:'admin',proc:'',pw:'1234'}];
    us.forEach(function(u){
      var opt=document.createElement('option');
      opt.value=u.un||u.nm;
      opt.textContent=u.nm+(u.proc?' ('+u.proc+')':u.role==='admin'?' (관리자)':u.role==='office'?' (사무실)':'');
      sel.appendChild(opt);
    });
    if(curVal)sel.value=curVal;
  });
}

/* ===== EVENT DELEGATION ===== */
document.addEventListener('DOMContentLoaded',function(){
  // 1. Sidebar: goMod delegation
  var sidebar=document.getElementById('sidebar');
  if(sidebar){
    sidebar.addEventListener('click',function(e){
      var item=e.target.closest('.sb-item[data-mod]');
      if(item){goMod(item.getAttribute('data-mod'));return}
      var grp=e.target.closest('.sb-group');
      if(grp){toggleSbGroup(grp);return}
    });
  }

  // 2. Tab navigation delegation
  document.addEventListener('click',function(e){
    var tab=e.target.closest('.hd-tab[data-tab]');
    if(tab){goTab(tab.getAttribute('data-tab'),tab);return}
  });

  // 3. Filter buttons delegation
  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-period]');
    if(btn){
      var fn=btn.getAttribute('data-period-fn');
      if(fn==='setOrderPeriod')setOrderPeriod(btn.getAttribute('data-period'),btn);
      return;
    }
    var fbtn=e.target.closest('[data-filter-fn]');
    if(fbtn){
      var ffn=fbtn.getAttribute('data-filter-fn');
      var fv=fbtn.getAttribute('data-f');
      if(ffn==='setOrderFilter')setOrderFilter(fv,fbtn);
      else if(ffn==='setWOFilter')setWOFilter(fv,fbtn);
      return;
    }
  });

  // 4. Modal backdrop close delegation
  document.addEventListener('click',function(e){
    if(e.target.classList.contains('mo-bg')&&e.target===e.target){
      var mid=e.target.id;
      if(mid)cMo(mid);
    }
  });
});

/* ===== 디바운스 & 페이지네이션 ===== */
function debounce(fn,ms){var t;return function(){var a=arguments,c=this;clearTimeout(t);t=setTimeout(function(){fn.apply(c,a)},ms)}}
var PAGE_SIZE=50;
function paginate(arr,page){var s=page*PAGE_SIZE,e=s+PAGE_SIZE;return{items:arr.slice(s,e),page:page,total:arr.length,totalPages:Math.ceil(arr.length/PAGE_SIZE),hasMore:e<arr.length}}
function renderPager(containerId,pg,onPage){
  var el=$(containerId);if(!el||el.id==='__null__')return;
  if(pg.totalPages<=1){el.innerHTML='';return}
  var h='<div class="pager">';
  if(pg.page>0)h+='<button class="btn btn-sm btn-o" data-pg="'+(pg.page-1)+'">◀ 이전</button>';
  h+='<span class="pager-info">'+(pg.page+1)+' / '+pg.totalPages+' ('+pg.total+'건)</span>';
  if(pg.hasMore)h+='<button class="btn btn-sm btn-o" data-pg="'+(pg.page+1)+'">다음 ▶</button>';
  h+='</div>';
  el.innerHTML=h;
  el.querySelectorAll('[data-pg]').forEach(function(b){b.addEventListener('click',function(){onPage(+b.getAttribute('data-pg'))})});
}

/* ===== WCAG 대비 자동 점검 ===== */
var ContrastCheck=(function(){
  function luminance(r,g,b){
    var a=[r,g,b].map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});
    return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
  }
  function parseColor(str){
    if(!str||str==='transparent')return null;
    var d=document.createElement('div');d.style.color=str;document.body.appendChild(d);
    var c=getComputedStyle(d).color;document.body.removeChild(d);
    var m=c.match(/(\d+)/g);if(!m||m.length<3)return null;
    return[+m[0],+m[1],+m[2]];
  }
  function ratio(fg,bg){
    var l1=luminance(fg[0],fg[1],fg[2])+0.05;
    var l2=luminance(bg[0],bg[1],bg[2])+0.05;
    return l1>l2?l1/l2:l2/l1;
  }
  function check(el){
    var cs=getComputedStyle(el);
    var fg=parseColor(cs.color);
    var bg=parseColor(cs.backgroundColor);
    if(!fg||!bg)return null;
    var r=ratio(fg,bg);
    var size=parseFloat(cs.fontSize);
    var bold=parseInt(cs.fontWeight)>=700;
    var threshold=(size>=18||(size>=14&&bold))?3:4.5;
    return{ratio:Math.round(r*100)/100,threshold:threshold,pass:r>=threshold};
  }
  function audit(selector){
    var els=document.querySelectorAll(selector||'.bd,.btn,.filter-btn,.wb,.det-btn');
    var fails=[];
    els.forEach(function(el){
      if(el.offsetParent===null)return;
      var result=check(el);
      if(result&&!result.pass){
        fails.push({el:el,text:el.textContent.trim(),ratio:result.ratio,threshold:result.threshold});
      }
    });
    if(fails.length){
      console.warn('[대비 점검] '+fails.length+'개 요소가 WCAG AA 기준 미달:');
      fails.forEach(function(f){console.warn('  "'+f.text+'" — '+f.ratio+':1 (필요: '+f.threshold+':1)',f.el)});
    }else{
      console.info('[대비 점검] 모든 요소가 WCAG AA 기준 충족');
    }
    return fails;
  }
  return{check:check,audit:audit,ratio:function(c1,c2){var a=parseColor(c1),b=parseColor(c2);return a&&b?ratio(a,b):null}};
})();
