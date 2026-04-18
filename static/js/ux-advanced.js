/* ==========================================
   팩플로우 UX 고급 기능
   - 테이블 정렬 + 일괄 작업
   - KPI 미니 스파크라인
   - 드래그앤드롭 파일 업로드
   - 사이드 패널 상세 뷰
   ========================================== */

var UXAdv = (function(){

  /* ========== 1. 테이블 컬럼 정렬 ========== */

  var _sortState = {};  // {tableId: {col: 2, dir: 'asc'}}

  function initTableSort(){
    document.addEventListener('click', function(e){
      var th = e.target.closest('.dt thead th');
      if(!th || th.classList.contains('no-sort')) return;
      var table = th.closest('table');
      if(!table || !table.tBodies[0]) return;
      var tableId = table.id || 'tbl';
      var colIdx = Array.from(th.parentNode.children).indexOf(th);

      var state = _sortState[tableId] || {col: -1, dir: 'asc'};
      if(state.col === colIdx){
        state.dir = state.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.col = colIdx;
        state.dir = 'asc';
      }
      _sortState[tableId] = state;

      // 정렬 수행
      var tbody = table.tBodies[0];
      var rows = Array.from(tbody.rows);
      rows.sort(function(a, b){
        var ta = (a.cells[colIdx]?.innerText || '').trim();
        var tb = (b.cells[colIdx]?.innerText || '').trim();
        // 숫자 추출 시도
        var na = parseFloat(ta.replace(/[,원%]/g, ''));
        var nb = parseFloat(tb.replace(/[,원%]/g, ''));
        if(!isNaN(na) && !isNaN(nb)){
          return state.dir === 'asc' ? na - nb : nb - na;
        }
        // 날짜 패턴 (YYYY-MM-DD)
        var dateRe = /^\d{4}[-.\/]\d{1,2}[-.\/]\d{1,2}/;
        if(dateRe.test(ta) && dateRe.test(tb)){
          return state.dir === 'asc' ? ta.localeCompare(tb) : tb.localeCompare(ta);
        }
        return state.dir === 'asc' ? ta.localeCompare(tb, 'ko') : tb.localeCompare(ta, 'ko');
      });
      rows.forEach(function(r){tbody.appendChild(r)});

      // 표시
      table.querySelectorAll('thead th').forEach(function(t){
        t.classList.remove('sort-asc', 'sort-desc');
      });
      th.classList.add(state.dir === 'asc' ? 'sort-asc' : 'sort-desc');
    });

    // 헤더 커서 스타일
    var style = document.createElement('style');
    style.textContent = `
      .dt thead th:not(.no-sort){cursor:pointer;user-select:none;position:relative;padding-right:18px!important}
      .dt thead th:not(.no-sort):hover{background:rgba(30,58,95,0.08)}
      .dt thead th.sort-asc::after{content:'▲';position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:9px;color:var(--pri)}
      .dt thead th.sort-desc::after{content:'▼';position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:9px;color:var(--pri)}
    `;
    document.head.appendChild(style);
  }

  /* ========== 2. 일괄 작업 체크박스 ========== */

  function initBulkActions(){
    // 체크박스 자동 추가 비활성화 (기존 테이블 구조 보존)
    // 대신 유틸 함수 제공: UXAdv.enableBulkOn('tableId', onBulkAction)
  }

  function enableBulkOn(tableId, handlers){
    var table = document.getElementById(tableId);
    if(!table || !table.tHead) return;

    // 헤더에 전체 선택 체크박스
    var firstTh = document.createElement('th');
    firstTh.className = 'bulk-th no-sort';
    firstTh.style.width = '32px';
    firstTh.innerHTML = '<input type="checkbox" class="bulk-all" onchange="UXAdv.toggleBulkAll(this)">';
    table.tHead.rows[0].insertBefore(firstTh, table.tHead.rows[0].firstChild);

    // 행마다 체크박스
    Array.from(table.tBodies[0].rows).forEach(function(tr){
      var td = document.createElement('td');
      td.innerHTML = '<input type="checkbox" class="bulk-row">';
      tr.insertBefore(td, tr.firstChild);
    });
  }

  function toggleBulkAll(chk){
    var table = chk.closest('table');
    table.querySelectorAll('tbody .bulk-row').forEach(function(c){c.checked = chk.checked});
    updateBulkToolbar(table);
  }

  function updateBulkToolbar(table){
    var checked = table.querySelectorAll('tbody .bulk-row:checked').length;
    // TODO: 플로팅 툴바 표시
  }

  /* ========== 3. KPI 미니 스파크라인 ========== */

  // .sb 박스에 data-sparkline="1,3,5,2,8,6" 속성이 있으면 렌더
  function initSparklines(){
    document.querySelectorAll('.sb[data-sparkline]').forEach(function(sb){
      var data = sb.dataset.sparkline.split(',').map(Number);
      var color = sb.dataset.sparkColor || '#1E3A5F';
      renderSparklineIn(sb, data, color);
    });
  }

  function renderSparklineIn(container, data, color){
    if(!data || data.length < 2) return;
    var W = 100, H = 28;
    var max = Math.max(...data), min = Math.min(...data);
    var range = max - min || 1;
    var pts = data.map(function(v, i){
      var x = (i / (data.length - 1)) * W;
      var y = H - ((v - min) / range) * (H - 4) - 2;
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');

    var areaPts = '0,' + H + ' ' + pts + ' ' + W + ',' + H;
    var existing = container.querySelector('.sparkline');
    if(existing) existing.remove();

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'sparkline');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.width = '100%';
    svg.style.height = H + 'px';
    svg.style.marginTop = '6px';
    svg.innerHTML =
        '<polygon points="'+areaPts+'" fill="'+color+'" opacity="0.1"/>'
      + '<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.5"/>';
    container.appendChild(svg);
  }

  // KPI 자동 데이터 추출 (매출/매입에서 지난 7일 합계)
  function autoAttachSparklines(){
    var sales = typeof DB !== 'undefined' ? (DB.g('sales')||[]) : [];
    var purchase = typeof DB !== 'undefined' ? (DB.g('purchase')||[]) : [];
    var wo = typeof DB !== 'undefined' ? (DB.g('wo')||[]) : [];

    var today = new Date();
    var last7 = [];
    for(var i = 6; i >= 0; i--){
      var d = new Date(today); d.setDate(d.getDate() - i);
      last7.push(d.toISOString().slice(0, 10));
    }

    // 매출 지난 7일
    var salesDaily = last7.map(function(dt){
      return sales.filter(function(s){return s.dt === dt}).reduce(function(sum, s){return sum + (s.amt||0)}, 0);
    });
    // 매입 지난 7일
    var purchaseDaily = last7.map(function(dt){
      return purchase.filter(function(p){return p.dt === dt}).reduce(function(sum, p){return sum + (p.amt||0)}, 0);
    });
    // WO 생성 지난 7일
    var woDaily = last7.map(function(dt){
      return wo.filter(function(w){return w.cat && w.cat.indexOf(dt) === 0}).length;
    });

    // .sb 박스들에 자동 적용 (클래스나 텍스트로 판별)
    document.querySelectorAll('.sb').forEach(function(sb){
      var label = (sb.querySelector('.l')?.innerText || '').trim();
      var data = null, color = null;
      if(label.includes('매출') && !label.includes('미수')){data = salesDaily; color = '#1E40AF'}
      else if(label.includes('매입') && !label.includes('미지급')){data = purchaseDaily; color = '#DC2626'}
      else if(label.includes('미수') || label.includes('미지급')){
        // 누적 추세 만들기
        var daily = label.includes('미수') ? salesDaily : purchaseDaily;
        var cumul = 0;
        data = daily.map(function(v){ cumul += v; return cumul });
        color = '#DC2626';
      }
      if(data && data.some(function(v){return v > 0})){
        renderSparklineIn(sb, data, color);
      }
    });
  }

  /* ========== 4. 드래그앤드롭 파일 업로드 ========== */

  var _dropHandlers = {};

  function initDragDrop(){
    var overlay = document.createElement('div');
    overlay.id = 'uxDropOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(30,58,95,0.85);z-index:9998;display:none;align-items:center;justify-content:center;pointer-events:none;backdrop-filter:blur(8px)';
    overlay.innerHTML = '<div style="color:#fff;text-align:center;padding:40px;border:3px dashed #fff;border-radius:20px;max-width:500px"><div style="font-size:60px;margin-bottom:16px">📥</div><div style="font-size:22px;font-weight:900">여기에 파일을 놓으세요</div><div style="font-size:14px;margin-top:8px;opacity:0.9">엑셀(.xlsx, .csv) / 이미지 자동 인식</div></div>';
    document.body.appendChild(overlay);

    var dragCounter = 0;

    window.addEventListener('dragenter', function(e){
      e.preventDefault();
      if(e.dataTransfer && Array.from(e.dataTransfer.items||[]).some(function(i){return i.kind === 'file'})){
        dragCounter++;
        overlay.style.display = 'flex';
      }
    });
    window.addEventListener('dragleave', function(e){
      e.preventDefault();
      dragCounter--;
      if(dragCounter <= 0){
        dragCounter = 0;
        overlay.style.display = 'none';
      }
    });
    window.addEventListener('dragover', function(e){e.preventDefault()});
    window.addEventListener('drop', function(e){
      e.preventDefault();
      dragCounter = 0;
      overlay.style.display = 'none';
      var files = e.dataTransfer.files;
      if(!files || !files.length) return;
      handleDroppedFiles(files);
    });
  }

  function handleDroppedFiles(files){
    for(var i = 0; i < files.length; i++){
      var f = files[i];
      var name = f.name.toLowerCase();
      if(name.endsWith('.xlsx') || name.endsWith('.xls')){
        routeExcel(f);
      } else if(name.endsWith('.csv')){
        routeCSV(f);
      } else if(f.type.startsWith('image/')){
        routeImage(f);
      } else {
        if(typeof toast === 'function') toast('지원하지 않는 파일: ' + f.name, 'err');
      }
    }
  }

  function routeExcel(file){
    // 현재 활성 페이지에 따라 처리
    var active = document.querySelector('.module-page.active');
    var modId = active ? active.id.replace('pg-', '') : '';
    if(typeof toast === 'function') toast('엑셀 파일 로드 중: ' + file.name, '');

    // 거래처 페이지면 거래처 업로드
    if(modId === 'mes-cli' && typeof impCliXlsx === 'function'){
      var fakeInput = {files: [file]};
      impCliXlsx(fakeInput);
      return;
    }
    // 그 외: 홈택스 엑셀 파서로
    if(typeof parseHometaxExcel === 'function' && confirm(file.name + ' 을(를) 매입 세금계산서 엑셀로 처리하시겠습니까?')){
      var inp = document.getElementById('htxFile');
      var dt = new DataTransfer();
      dt.items.add(file);
      if(inp){
        inp.files = dt.files;
        if(typeof openHometaxUpload === 'function') openHometaxUpload();
        setTimeout(function(){parseHometaxExcel()}, 500);
      }
    }
  }

  function routeCSV(file){routeExcel(file)}

  function routeImage(file){
    // 이미지는 현재 WO 모달이 열려있으면 첨부
    if(typeof toast === 'function') toast('이미지 파일: ' + file.name, '');
    // TODO: WO 모달에 자동 첨부
  }

  /* ========== 5. 사이드 패널 상세 뷰 ========== */

  function initSidePanel(){
    var panel = document.createElement('div');
    panel.id = 'uxSidePanel';
    panel.className = 'ux-side-panel';
    panel.innerHTML =
        '<div class="ux-sp-hdr"><span id="uxSpTitle" style="font-weight:700;font-size:16px">상세</span>'
      + '<button onclick="UXAdv.closeSidePanel()" style="border:none;background:transparent;font-size:20px;cursor:pointer;color:#94A3B8">×</button></div>'
      + '<div id="uxSpBody" class="ux-sp-body"></div>';
    document.body.appendChild(panel);

    // 스타일
    var style = document.createElement('style');
    style.textContent = `
      .ux-side-panel{position:fixed;top:0;right:0;bottom:0;width:min(480px, 90vw);background:#fff;box-shadow:-10px 0 30px rgba(0,0,0,.1);z-index:90;transform:translateX(100%);transition:transform .3s cubic-bezier(.22,.61,.36,1);display:flex;flex-direction:column;overflow:hidden}
      .ux-side-panel.open{transform:translateX(0)}
      .ux-sp-hdr{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #E5E7EB;background:#F9FAFB}
      .ux-sp-body{flex:1;overflow-y:auto;padding:20px}
      .ux-sp-field{margin-bottom:14px}
      .ux-sp-field-l{font-size:11px;color:#94A3B8;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
      .ux-sp-field-v{font-size:14px;color:#111827;font-weight:500}
      .ux-sp-section{border-top:1px solid #E5E7EB;padding-top:14px;margin-top:14px}
      .ux-sp-section-t{font-size:13px;font-weight:700;color:#1E3A5F;margin-bottom:10px}
    `;
    document.head.appendChild(style);
  }

  function openSidePanel(title, bodyHtml){
    document.getElementById('uxSpTitle').textContent = title || '상세';
    document.getElementById('uxSpBody').innerHTML = bodyHtml || '';
    document.getElementById('uxSidePanel').classList.add('open');
  }

  function closeSidePanel(){
    var p = document.getElementById('uxSidePanel');
    if(p) p.classList.remove('open');
  }

  // 거래처/매출/WO 등 클릭 시 사이드 패널로 전환
  function showCliInSide(cid){
    var c = (typeof DB !== 'undefined' ? DB.g('cli') : []).find(function(x){return x.id === cid});
    if(!c) return;
    var sales = (DB.g('sales')||[]).filter(function(s){return s.cli === c.nm});
    var unpaid = sales.reduce(function(sum, s){return sum + Math.max(0, (s.amt||0)-(s.paid||0))}, 0);
    var total = sales.reduce(function(sum, s){return sum + (s.amt||0)}, 0);

    var html = '';
    html += '<div class="ux-sp-field"><div class="ux-sp-field-l">거래처명</div><div class="ux-sp-field-v" style="font-size:18px;font-weight:700">'+(c.nm||'-')+'</div></div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    html += '<div class="ux-sp-field"><div class="ux-sp-field-l">사업자번호</div><div class="ux-sp-field-v">'+(c.biz||'-')+'</div></div>';
    html += '<div class="ux-sp-field"><div class="ux-sp-field-l">대표자</div><div class="ux-sp-field-v">'+(c.ceo||'-')+'</div></div>';
    html += '<div class="ux-sp-field"><div class="ux-sp-field-l">전화</div><div class="ux-sp-field-v">'+(c.tel||'-')+'</div></div>';
    html += '<div class="ux-sp-field"><div class="ux-sp-field-l">담당자</div><div class="ux-sp-field-v">'+(c.ps||'-')+'</div></div>';
    html += '</div>';
    html += '<div class="ux-sp-field"><div class="ux-sp-field-l">주소</div><div class="ux-sp-field-v">'+(c.addr||'-')+'</div></div>';

    html += '<div class="ux-sp-section"><div class="ux-sp-section-t">거래 현황</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
    html += '<div style="padding:12px;background:#EFF6FF;border-radius:8px"><div style="font-size:11px;color:#1E40AF;font-weight:600">총 매출</div><div style="font-size:18px;font-weight:700;color:#1E40AF">'+(typeof fmt==='function'?fmt(total):total)+'원</div></div>';
    html += '<div style="padding:12px;background:#FEF2F2;border-radius:8px"><div style="font-size:11px;color:#DC2626;font-weight:600">미수금</div><div style="font-size:18px;font-weight:700;color:#DC2626">'+(typeof fmt==='function'?fmt(unpaid):unpaid)+'원</div></div>';
    html += '</div></div>';

    if(c.creditLimit > 0){
      var ratio = Math.round(unpaid / c.creditLimit * 100);
      var barColor = ratio >= 100 ? '#DC2626' : ratio >= 80 ? '#F59E0B' : '#16A34A';
      html += '<div class="ux-sp-section"><div class="ux-sp-section-t">신용한도</div>';
      html += '<div style="font-size:13px;margin-bottom:6px">한도: '+(typeof fmt==='function'?fmt(c.creditLimit):c.creditLimit)+'원 ('+ratio+'% 사용)</div>';
      html += '<div style="height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,ratio)+'%;background:'+barColor+'"></div></div></div>';
    }

    // 최근 거래 5건
    var recent = sales.slice(-5).reverse();
    if(recent.length > 0){
      html += '<div class="ux-sp-section"><div class="ux-sp-section-t">최근 거래 5건</div>';
      recent.forEach(function(r){
        var u = Math.max(0, (r.amt||0) - (r.paid||0));
        html += '<div style="padding:8px 10px;background:#F9FAFB;border-radius:6px;margin-bottom:6px;font-size:12px">';
        html += '<div style="display:flex;justify-content:space-between"><span>'+r.dt+' '+(r.prod||'-')+'</span><span style="font-weight:700">'+(typeof fmt==='function'?fmt(r.amt||0):r.amt)+'</span></div>';
        if(u > 0) html += '<div style="color:#DC2626;font-size:11px;margin-top:2px">미수 '+(typeof fmt==='function'?fmt(u):u)+'원</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    html += '<div class="ux-sp-section">';
    html += '<button class="btn btn-p" style="width:100%;margin-bottom:6px" onclick="if(typeof eCli===\'function\')eCli(\''+cid+'\');UXAdv.closeSidePanel()">거래처 수정</button>';
    html += '<button class="btn btn-o" style="width:100%" onclick="if(typeof showCliHist===\'function\')showCliHist(\''+cid+'\');UXAdv.closeSidePanel()">전체 이력 보기</button>';
    html += '</div>';

    openSidePanel(c.nm, html);
  }

  /* ========== 초기화 ========== */

  function init(){
    initTableSort();
    initDragDrop();
    initSidePanel();
    // 스파크라인은 화면 렌더 후 자동 적용
    setTimeout(autoAttachSparklines, 1500);
    // 주기적 갱신
    setInterval(autoAttachSparklines, 60000);
  }

  return {
    init: init,
    enableBulkOn: enableBulkOn,
    toggleBulkAll: toggleBulkAll,
    autoAttachSparklines: autoAttachSparklines,
    renderSparkline: renderSparklineIn,
    openSidePanel: openSidePanel,
    closeSidePanel: closeSidePanel,
    showCliInSide: showCliInSide
  };
})();

// 로그인 후 자동 초기화
window.addEventListener('DOMContentLoaded', function(){
  var interval = setInterval(function(){
    var adminApp = document.getElementById('adminApp');
    if(adminApp && adminApp.style.display !== 'none'){
      UXAdv.init();
      clearInterval(interval);
    }
  }, 500);
});
