/* ===== ERP:analysis ===== */

function printSection(id) {
  var el = $(id);
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>경영분석</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;font-size:11px;padding:15mm}' +
    'table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px 6px}' +
    'th{background:#E5E7EB;font-weight:700}@media print{@page{size:A4 landscape;margin:10mm}}</style></head>' +
    '<body><h2 style="text-align:center;margin-bottom:16px">팩플로우 경영분석</h2>' + el.innerHTML + '</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
}

/* ===== 매출/매입 추이 ===== */
function renderTrend() {
  var year = $('trY').value || new Date().getFullYear();
  var salesAll = DB.g('sales');
  var purchAll = DB.g('purchase');
  var maxVal = 1;
  var data = [];
  var yearSales = 0, yearPurch = 0;

  for (var m = 1; m <= 12; m++) {
    var mk = year + '-' + String(m).padStart(2, '0');
    var sAmt = salesAll.filter(function(r) { return r.dt && r.dt.startsWith(mk); })
      .reduce(function(s, r) { return s + (r.amt || 0); }, 0);
    var pAmt = purchAll.filter(function(r) { return r.dt && r.dt.startsWith(mk); })
      .reduce(function(s, r) { return s + (r.amt || 0); }, 0);
    data.push({ month: m, sales: sAmt, purch: pAmt });
    maxVal = Math.max(maxVal, sAmt, pAmt);
    yearSales += sAmt;
    yearPurch += pAmt;
  }

  var curMonth = new Date().getMonth();
  var prevSales = data[curMonth > 0 ? curMonth - 1 : 0].sales || 0;
  var curSales = data[curMonth].sales || 0;
  var monthChange = prevSales ? Math.round((curSales - prevSales) / prevSales * 100) : 0;
  var profitRate = yearSales ? Math.round((yearSales - yearPurch) / yearSales * 100) : 0;

  $('trendStats').innerHTML =
    '<div class="sb blue"><div class="l">' + year + '년 총 매출</div><div class="v">' + fmt(yearSales) + '원</div></div>' +
    '<div class="sb orange"><div class="l">' + year + '년 총 매입</div><div class="v">' + fmt(yearPurch) + '원</div></div>' +
    '<div class="sb ' + (yearSales - yearPurch >= 0 ? 'green' : 'red') + '"><div class="l">매출 - 매입</div><div class="v">' +
    fmt(yearSales - yearPurch) + '원</div>' +
    '<div class="sub">이익률 ' + profitRate + '%</div></div>' +
    '<div class="sb ' + (monthChange >= 0 ? 'green' : 'red') + '"><div class="l">금월 전월대비</div><div class="v">' +
    (monthChange >= 0 ? '+' : '') + monthChange + '%</div></div>';

  // 차트
  var chartHtml = '<div class="chart-area">';
  data.forEach(function(d) {
    var sh = Math.max(3, d.sales / maxVal * 200);
    var ph = Math.max(3, d.purch / maxVal * 200);
    chartHtml += '<div class="chart-bar-group"><div class="chart-bars">' +
      '<div class="chart-bar" style="height:' + sh + 'px;background:var(--pri);width:16px"><div class="tip">매출 ' + fmt(d.sales) + '</div></div>' +
      '<div class="chart-bar" style="height:' + ph + 'px;background:var(--wrn);width:16px"><div class="tip">매입 ' + fmt(d.purch) + '</div></div>' +
      '</div><div class="chart-label">' + d.month + '월</div></div>';
  });
  chartHtml += '</div><div class="chart-legend"><span><span class="legend-dot" style="background:var(--pri)"></span>매출</span><span><span class="legend-dot" style="background:var(--wrn)"></span>매입</span></div>';
  $('trendChart').innerHTML = (yearSales + yearPurch > 0) ? chartHtml :
    emptyHtml('', '매출/매입 데이터가 없습니다', '매입/매출 모듈에서 데이터를 등록하면 차트가 표시됩니다.');

  // 테이블
  var rows = '';
  data.forEach(function(d, i) {
    var diff = d.sales - d.purch;
    var prev = i > 0 ? data[i - 1].sales : 0;
    var sChg = prev ? Math.round((d.sales - prev) / prev * 100) : 0;
    var prevP = i > 0 ? data[i - 1].purch : 0;
    var pChg = prevP ? Math.round((d.purch - prevP) / prevP * 100) : 0;
    rows += '<tr><td style="font-weight:700">' + d.month + '월</td>' +
      '<td style="text-align:right">' + fmt(d.sales) + '</td>' +
      '<td style="text-align:right">' + fmt(d.purch) + '</td>' +
      '<td style="text-align:right;font-weight:700;color:' + (diff >= 0 ? 'var(--suc)' : 'var(--dan)') + '">' + fmt(diff) + '</td>' +
      '<td style="text-align:right;color:' + (sChg >= 0 ? 'var(--suc)' : 'var(--dan)') + '">' + (sChg >= 0 ? '+' : '') + sChg + '%</td>' +
      '<td style="text-align:right;color:' + (pChg >= 0 ? 'var(--wrn)' : 'var(--suc)') + '">' + (pChg >= 0 ? '+' : '') + pChg + '%</td></tr>';
  });
  $('trendTable').querySelector('tbody').innerHTML = rows;
}

/* ===== 거래처 순위 ===== */
function renderRank() {
  var period = $('rankPeriod').value;
  var type = $('rankType').value;
  var salesAll = DB.g('sales');
  var now = new Date();
  var y = now.getFullYear(), m = now.getMonth() + 1;
  var filtered;

  if (period === 'month') {
    filtered = salesAll.filter(function(r) { return r.dt && r.dt.startsWith(td().slice(0, 7)); });
  } else if (period === 'quarter') {
    var q = Math.ceil(m / 3);
    var months = [];
    for (var i = (q - 1) * 3 + 1; i <= q * 3; i++) months.push(y + '-' + String(i).padStart(2, '0'));
    filtered = salesAll.filter(function(r) { return months.some(function(mk) { return r.dt && r.dt.startsWith(mk); }); });
  } else if (period === 'year') {
    filtered = salesAll.filter(function(r) { return r.dt && r.dt.startsWith(String(y)); });
  } else {
    filtered = salesAll;
  }

  var byCli = {};
  filtered.forEach(function(r) {
    if (!r.cli) return;
    if (!byCli[r.cli]) byCli[r.cli] = { amt: 0, cnt: 0, unpaid: 0 };
    byCli[r.cli].amt += (r.amt || 0);
    byCli[r.cli].cnt++;
    byCli[r.cli].unpaid += Math.max(0, (r.amt || 0) - (r.paid || 0));
  });

  var sorted = Object.entries(byCli).sort(function(a, b) {
    return type === 'sales' ? b[1].amt - a[1].amt : b[1].cnt - a[1].cnt;
  }).slice(0, 10);

  var totalAmt = sorted.reduce(function(s, x) { return s + x[1].amt; }, 0);
  var maxAmt = sorted.length ? sorted[0][1].amt : 1;
  var colors = ['#0F2240', '#1E3A5F', '#1E3A5F', '#5A8FBF', '#7EB8E0', '#B0C9E0', '#DCE8F5', '#EFF6FF', '#F8FAFC', '#F8FAFC'];

  $('rankTitle').textContent = '거래처별 ' + (type === 'sales' ? '매출' : '건수') + ' Top ' + sorted.length;

  // Podium for Top 3
  var pod=$('rankPodium');if(pod){
    if(sorted.length>=1){
      var fmtV=function(v){return type==='sales'?(v/10000).toFixed(0)+'만':v+'건'};
      var podHtml='<div class="podium">';
      [1,0,2].forEach(function(idx){
        if(sorted[idx]){
          var x=sorted[idx];var rank=idx+1;
          podHtml+='<div class="pod r'+rank+'"><div class="pod-rank">'+(rank===1?'🥇 1ST':rank===2?'🥈 2ND':'🥉 3RD')+'</div><div class="pod-nm">'+x[0]+'</div><div class="pod-v">'+fmtV(type==='sales'?x[1].amt:x[1].cnt)+'</div><div class="pod-sub">'+x[1].cnt+'건 / '+(x[1].unpaid>0?'미수 '+(x[1].unpaid/10000).toFixed(0)+'만':'완납')+'</div></div>';
        }
      });
      podHtml+='</div>';pod.innerHTML=podHtml;
    }else{pod.innerHTML=''}
  }

  if (sorted.length === 0) {
    $('rankChart').innerHTML = emptyHtml('', '거래처 데이터가 없습니다', '매출 장부에 거래 내역을 등록하면 순위가 표시됩니다.');
  } else {
    var chartHtml = '';
    sorted.forEach(function(x, i) {
      var pct = Math.max(4, x[1].amt / maxAmt * 100);
      chartHtml += '<div class="rank-row">' +
        '<div class="rank-num ' + (i < 3 ? 'top' : 'normal') + '">' + (i + 1) + '</div>' +
        '<div class="rank-name">' + x[0] + '</div>' +
        '<div class="rank-bar-wrap"><div class="rank-bar-fill" style="width:' + pct + '%;background:' + colors[i] + '">' +
        (pct > 15 ? fmt(x[1].amt) + '원' : '') + '</div></div>' +
        '<div class="rank-amt">' + fmt(x[1].amt) + '원</div></div>';
    });
    $('rankChart').innerHTML = chartHtml;
  }

  // 테이블
  $('rankTable').querySelector('tbody').innerHTML = sorted.map(function(x, i) {
    var avg = x[1].cnt ? Math.round(x[1].amt / x[1].cnt) : 0;
    var share = totalAmt ? Math.round(x[1].amt / totalAmt * 100) : 0;
    return '<tr><td style="text-align:center;font-weight:800;color:' + (i < 3 ? 'var(--pri)' : 'var(--txt2)') + '">' + (i + 1) + '</td>' +
      '<td style="font-weight:700">' + x[0] + '</td>' +
      '<td style="text-align:right;font-weight:700">' + fmt(x[1].amt) + '원</td>' +
      '<td style="text-align:center">' + x[1].cnt + '건</td>' +
      '<td style="text-align:right">' + fmt(avg) + '원</td>' +
      '<td style="text-align:right">' + share + '%</td>' +
      '<td style="text-align:right;color:' + (x[1].unpaid > 0 ? 'var(--dan)' : 'var(--suc)') + '">' + fmt(x[1].unpaid) + '원</td></tr>';
  }).join('') || '<tr><td colspan="7" class="empty-cell">데이터 없음</td></tr>';
}

/* ===== 원가/이익률 ===== */
function renderCost() {
  var search = ($('costSearch').value || '').toLowerCase();
  var salesAll = DB.g('sales');
  var bomList = DB.g('bom');

  var byProd = {};
  salesAll.forEach(function(r) {
    if (!r.prod) return;
    if (!byProd[r.prod]) byProd[r.prod] = { cli: r.cli, totalAmt: 0, totalQty: 0, cnt: 0 };
    byProd[r.prod].totalAmt += (r.amt || 0);
    byProd[r.prod].totalQty += (r.qty || 0);
    byProd[r.prod].cnt++;
  });

  var rows = [];
  var totalProfit = 0, totalSales = 0;
  Object.entries(byProd).forEach(function(entry) {
    var prod = entry[0], data = entry[1];
    if (search && prod.toLowerCase().indexOf(search) === -1) return;
    var avgPrice = data.totalQty ? Math.round(data.totalAmt / data.totalQty) : 0;
    var bom = bomList.find(function(b) { return b.prod === prod; });
    var matCost = bom ? (bom.items || []).reduce(function(s, it) { return s + (it.qty || 0) * (it.price || 0); }, 0) : 0;
    var unitCost = bom && bom.baseQty ? Math.round(matCost / bom.baseQty) : 0;
    var profit = avgPrice - unitCost;
    var rate = avgPrice ? Math.round(profit / avgPrice * 100) : 0;
    totalSales += data.totalAmt;
    totalProfit += profit * data.totalQty;
    rows.push({ prod: prod, cli: data.cli, avgPrice: avgPrice, unitCost: unitCost, profit: profit, rate: rate, cnt: data.cnt, totalAmt: data.totalAmt, hasBom: !!bom });
  });
  rows.sort(function(a, b) { return b.rate - a.rate; });

  var bomCount = rows.filter(function(r) { return r.hasBom; }).length;
  var avgRate = totalSales ? Math.round(totalProfit / totalSales * 100) : 0;

  $('costStats').innerHTML =
    '<div class="sb blue"><div class="l">분석 제품수</div><div class="v">' + rows.length + '</div></div>' +
    '<div class="sb green"><div class="l">BOM 등록 제품</div><div class="v">' + bomCount + '/' + rows.length + '</div>' +
    '<div class="sub">BOM 있어야 원가분석 가능</div></div>' +
    '<div class="sb ' + (avgRate >= 0 ? 'green' : 'red') + '"><div class="l">평균 이익률</div><div class="v">' + avgRate + '%</div></div>';

  $('costTable').querySelector('tbody').innerHTML = rows.length ? rows.map(function(r) {
    return '<tr><td style="font-weight:700">' + r.prod + '</td>' +
      '<td>' + (r.cli || '-') + '</td>' +
      '<td style="text-align:right">' + fmt(r.avgPrice) + '원</td>' +
      '<td style="text-align:right">' + (r.hasBom ? fmt(r.unitCost) + '원' : '<span style="color:var(--txt2)">BOM 미등록</span>') + '</td>' +
      '<td style="text-align:right;font-weight:700;color:' + (r.profit >= 0 ? 'var(--suc)' : 'var(--dan)') + '">' +
      (r.hasBom ? fmt(r.profit) + '원' : '-') + '</td>' +
      '<td style="text-align:right"><span class="bd ' + (r.rate >= 20 ? 'bd-s' : 'bd-d') + '">' +
      (r.hasBom ? r.rate + '%' : '-') + '</span></td>' +
      '<td style="text-align:center">' + r.cnt + '</td>' +
      '<td style="text-align:right">' + fmt(r.totalAmt) + '원</td></tr>';
  }).join('') : '<tr><td colspan="8">' + emptyHtml('', '매출 데이터가 없습니다', '매출 장부에 등록하면 제품별 원가 분석이 가능합니다.').replace(/"/g, "'") + '</td></tr>';
}

/* ===== 생산성 분석 ===== */
function renderProductivity() {
  var month = $('prodMonth').value || td().slice(0, 7);
  if (!$('prodMonth').value) $('prodMonth').value = month;

  var histAll = DB.g('hist');
  var filtered = histAll.filter(function(h) { return h.doneAt && h.doneAt.startsWith(month); });

  var byProc = {};
  filtered.forEach(function(h) {
    if (!h.proc || !h.t1 || !h.t2) return;
    var startTime = new Date(h.t1.replace(' ', 'T'));
    var endTime = new Date(h.t2.replace(' ', 'T'));
    var mins = (endTime - startTime) / 60000;
    if (mins <= 0 || mins > 1440) return;
    if (!byProc[h.proc]) byProc[h.proc] = { cnt: 0, totalQty: 0, totalMin: 0 };
    byProc[h.proc].cnt++;
    byProc[h.proc].totalQty += (h.qty || 0);
    byProc[h.proc].totalMin += mins;
  });

  var procs = Object.entries(byProc);
  var totalCnt = procs.reduce(function(s, x) { return s + x[1].cnt; }, 0);
  var totalQty = procs.reduce(function(s, x) { return s + x[1].totalQty; }, 0);
  var maxQty = procs.length ? Math.max.apply(null, procs.map(function(x) { return x[1].totalQty; })) : 1;

  $('prodStats').innerHTML =
    '<div class="sb blue"><div class="l">총 처리건수</div><div class="v">' + totalCnt + '건</div></div>' +
    '<div class="sb green"><div class="l">총 생산수량</div><div class="v">' + fmt(totalQty) + '</div></div>' +
    '<div class="sb orange"><div class="l">활성 공정수</div><div class="v">' + procs.length + '</div></div>';

  var procColors = ['#1E3A5F', '#1E3A5F', '#1E3A5F', '#1E3A5F', '#1E3A5F', '#1E3A5F'];

  if (procs.length === 0) {
    $('prodChart').innerHTML = emptyHtml('', 'MES 작업 이력이 없습니다',
      month + ' 기간 완료된 작업이 없습니다. MES에서 작업을 완료하면 공정별 생산성이 분석됩니다.');
  } else {
    var chartHtml = '<div class="chart-area">';
    procs.forEach(function(x, i) {
      var h = Math.max(6, x[1].totalQty / maxQty * 200);
      chartHtml += '<div class="chart-bar-group"><div class="chart-bars">' +
        '<div class="chart-bar" style="height:' + h + 'px;background:' + procColors[i % 6] + ';width:48px">' +
        '<div class="tip">' + x[0] + ' ' + fmt(x[1].totalQty) + '</div></div>' +
        '</div><div class="chart-label"><strong>' + x[0] + '</strong><br>' + fmt(x[1].totalQty) + '</div></div>';
    });
    chartHtml += '</div>';
    $('prodChart').innerHTML = chartHtml;
  }

  $('prodTable').querySelector('tbody').innerHTML = procs.length ? procs.map(function(x) {
    var avgMin = x[1].cnt ? Math.round(x[1].totalMin / x[1].cnt) : 0;
    var totalHours = (x[1].totalMin / 60).toFixed(1);
    var perHour = x[1].totalMin ? Math.round(x[1].totalQty / (x[1].totalMin / 60)) : 0;
    return '<tr><td style="font-weight:700">' + x[0] + '</td>' +
      '<td style="text-align:center">' + x[1].cnt + '건</td>' +
      '<td style="text-align:right">' + fmt(x[1].totalQty) + '</td>' +
      '<td style="text-align:right">' + totalHours + '시간</td>' +
      '<td style="text-align:right">' + avgMin + '분/건</td>' +
      '<td style="text-align:right;font-weight:700">' + fmt(perHour) + '/h</td>' +
      '<td><span class="bd ' + (perHour > 100 ? 'bd-s' : 'bd-d') + '">' + (perHour > 100 ? '우수' : '보통') + '</span></td></tr>';
  }).join('') : '<tr><td colspan="7" class="empty-cell">데이터 없음</td></tr>';
}

// ===== 월간 경영보고서 =====
function rMonthlyReport(){
  var inp=$('monthlyRptMonth');
  if(!inp.value){var n=new Date();inp.value=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')}
  var month=inp.value;
  var ym=month.split('-');var y=parseInt(ym[0]),m=parseInt(ym[1]);
  var prevD=new Date(y,m-2,1);
  var prevM=prevD.getFullYear()+'-'+String(prevD.getMonth()+1).padStart(2,'0');
  var monthLabel=y+'년 '+m+'월';

  // 매출/매입 집계
  var sales=DB.g('sales'),purch=DB.g('purchase');
  var curSales=0,prevSales=0,curPurch=0,prevPurch=0;
  sales.forEach(function(s){if(s.dt&&s.dt.startsWith(month))curSales+=(s.amt||0);if(s.dt&&s.dt.startsWith(prevM))prevSales+=(s.amt||0)});
  purch.forEach(function(p){if(p.dt&&p.dt.startsWith(month))curPurch+=(p.amt||0);if(p.dt&&p.dt.startsWith(prevM))prevPurch+=(p.amt||0)});
  var curProfit=curSales-curPurch;
  var prevProfit=prevSales-prevPurch;
  var salesChg=prevSales>0?Math.round((curSales-prevSales)/prevSales*100):0;
  var profitRate=curSales>0?Math.round(curProfit/curSales*100):0;

  // 생산 집계
  var allHs=DB.g('hist'),wo=DB.g('wo');
  var curProdQty=0,prevProdQty=0;
  allHs.forEach(function(h){if(!h.doneAt)return;if(h.doneAt.startsWith(month))curProdQty+=(+h.qty||0);if(h.doneAt.startsWith(prevM))prevProdQty+=(+h.qty||0)});
  var prodChg=prevProdQty>0?Math.round((curProdQty-prevProdQty)/prevProdQty*100):0;

  // 납기준수율
  var monthWo=wo.filter(function(o){return o.cat&&o.cat.startsWith(month)&&o.status!=='취소'});
  var ontime=monthWo.filter(function(o){return o.status==='완료'||o.status==='출고완료'}).length;
  var lateWo=monthWo.filter(function(o){var d=o.dd;if(!d)return false;return new Date(d)<new Date()&&o.status!=='완료'&&o.status!=='출고완료'}).length;
  var ontimeRate=monthWo.length>0?Math.round((monthWo.length-lateWo)/monthWo.length*100):0;

  // 거래처별 매출 TOP5
  var cliSales={};
  sales.filter(function(s){return s.dt&&s.dt.startsWith(month)}).forEach(function(s){if(!cliSales[s.cli])cliSales[s.cli]=0;cliSales[s.cli]+=(s.amt||0)});
  var topCli=Object.keys(cliSales).sort(function(a,b){return cliSales[b]-cliSales[a]}).slice(0,5);

  // 미수금
  var totalUnpaid=0;
  sales.forEach(function(s){totalUnpaid+=Math.max(0,(s.amt||0)-(s.paid||0))});

  function fmt(n){return n.toLocaleString()}
  function chgBadge(v){if(v>0)return'<span style="color:#059669;font-weight:700">▲ '+v+'%</span>';if(v<0)return'<span style="color:#DC2626;font-weight:700">▼ '+Math.abs(v)+'%</span>';return'<span style="color:#64748B">—</span>'}

  var h='<div id="monthlyRptPrint">';
  h+='<div style="text-align:center;margin-bottom:24px;padding:20px;background:var(--bg2);border-radius:var(--r)">';
  h+='<div style="font-size:22px;font-weight:800;color:var(--txt);margin-bottom:4px">'+monthLabel+' 경영보고서</div>';
  h+='<div style="font-size:13px;color:var(--txt2)">생성일: '+new Date().toLocaleDateString('ko-KR')+'</div></div>';

  // KPI 요약
  h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">';
  h+='<div class="sb"><div class="l">매출액</div><div class="v" style="color:var(--pri)">'+fmt(curSales)+'</div><div style="font-size:13px;margin-top:6px">전월대비 '+chgBadge(salesChg)+'</div></div>';
  h+='<div class="sb"><div class="l">매입액</div><div class="v">'+fmt(curPurch)+'</div></div>';
  h+='<div class="sb"><div class="l">이익</div><div class="v" style="color:'+(curProfit>=0?'var(--suc)':'var(--dan)')+'">'+fmt(curProfit)+'</div><div style="font-size:13px;margin-top:6px">이익률 '+profitRate+'%</div></div>';
  h+='<div class="sb"><div class="l">생산량</div><div class="v">'+fmt(curProdQty)+'</div><div style="font-size:13px;margin-top:6px">전월대비 '+chgBadge(prodChg)+'</div></div>';
  h+='</div>';

  // 핵심 지표
  h+='<div class="card" style="margin-bottom:16px"><div class="card-t">핵심 지표</div>';
  h+='<table class="dt"><thead><tr><th>지표</th><th style="text-align:right">이번 달</th><th style="text-align:right">전월</th><th>변동</th></tr></thead><tbody>';
  h+='<tr><td>매출액</td><td style="text-align:right">'+fmt(curSales)+'원</td><td style="text-align:right">'+fmt(prevSales)+'원</td><td>'+chgBadge(salesChg)+'</td></tr>';
  h+='<tr><td>매입액</td><td style="text-align:right">'+fmt(curPurch)+'원</td><td style="text-align:right">'+fmt(prevPurch)+'원</td><td>'+chgBadge(prevPurch>0?Math.round((curPurch-prevPurch)/prevPurch*100):0)+'</td></tr>';
  h+='<tr><td>이익</td><td style="text-align:right">'+fmt(curProfit)+'원</td><td style="text-align:right">'+fmt(prevProfit)+'원</td><td>'+chgBadge(prevProfit>0?Math.round((curProfit-prevProfit)/prevProfit*100):0)+'</td></tr>';
  h+='<tr><td>생산량</td><td style="text-align:right">'+fmt(curProdQty)+'개</td><td style="text-align:right">'+fmt(prevProdQty)+'개</td><td>'+chgBadge(prodChg)+'</td></tr>';
  h+='<tr><td>납기준수율</td><td style="text-align:right">'+ontimeRate+'%</td><td style="text-align:right">-</td><td>'+(ontimeRate>=90?'<span class="bd bd-s">양호</span>':'<span class="bd bd-x">개선필요</span>')+'</td></tr>';
  h+='<tr><td>미수금 잔액</td><td style="text-align:right;color:var(--dan)">'+fmt(totalUnpaid)+'원</td><td></td><td></td></tr>';
  h+='</tbody></table></div>';

  // 거래처별 매출 TOP5
  h+='<div class="card" style="margin-bottom:16px"><div class="card-t">거래처별 매출 TOP 5</div>';
  if(topCli.length){
    h+='<table class="dt"><thead><tr><th>순위</th><th>거래처</th><th style="text-align:right">매출액</th><th style="text-align:right">비중</th></tr></thead><tbody>';
    topCli.forEach(function(c,i){
      var pct=curSales>0?Math.round(cliSales[c]/curSales*100):0;
      h+='<tr><td style="font-weight:700">'+(i+1)+'</td><td>'+c+'</td><td style="text-align:right">'+fmt(cliSales[c])+'원</td><td style="text-align:right">'+pct+'%</td></tr>';
    });
    h+='</tbody></table>';
  }else{h+='<div style="padding:20px;text-align:center;color:var(--txt3)">매출 데이터 없음</div>'}
  h+='</div>';

  // 12개월 추이 테이블
  h+='<div class="card" style="margin-bottom:16px"><div class="card-t">최근 12개월 추이</div>';
  h+='<div style="overflow-x:auto"><table class="dt"><thead><tr><th>월</th><th style="text-align:right">매출</th><th style="text-align:right">매입</th><th style="text-align:right">이익</th><th style="text-align:right">이익률</th></tr></thead><tbody>';
  for(var mi=11;mi>=0;mi--){
    var md=new Date(y,m-1-mi,1);
    var mk=md.getFullYear()+'-'+String(md.getMonth()+1).padStart(2,'0');
    var ms=0,mp=0;
    sales.forEach(function(s){if(s.dt&&s.dt.startsWith(mk))ms+=(s.amt||0)});
    purch.forEach(function(p){if(p.dt&&p.dt.startsWith(mk))mp+=(p.amt||0)});
    var mpr=ms-mp;var mr2=ms>0?Math.round(mpr/ms*100):0;
    var isCur=mk===month;
    h+='<tr style="'+(isCur?'background:var(--bg2);font-weight:700':'')+'"><td>'+mk+'</td><td style="text-align:right">'+fmt(ms)+'</td><td style="text-align:right">'+fmt(mp)+'</td><td style="text-align:right;color:'+(mpr>=0?'var(--suc)':'var(--dan)')+'">'+fmt(mpr)+'</td><td style="text-align:right">'+mr2+'%</td></tr>';
  }
  h+='</tbody></table></div></div>';

  // 거래처별 매입 내역
  var cliPurch={};
  purch.filter(function(p){return p.dt&&p.dt.startsWith(month)}).forEach(function(p){var cn=p.cli||'미지정';if(!cliPurch[cn])cliPurch[cn]=0;cliPurch[cn]+=(p.amt||0)});
  var topPurch=Object.keys(cliPurch).sort(function(a,b){return cliPurch[b]-cliPurch[a]}).slice(0,5);
  if(topPurch.length){
    h+='<div class="card" style="margin-bottom:16px"><div class="card-t">거래처별 매입 TOP 5</div>';
    h+='<table class="dt"><thead><tr><th>순위</th><th>거래처</th><th style="text-align:right">매입액</th><th style="text-align:right">비중</th></tr></thead><tbody>';
    topPurch.forEach(function(c,i){
      var pct=curPurch>0?Math.round(cliPurch[c]/curPurch*100):0;
      h+='<tr><td style="font-weight:700">'+(i+1)+'</td><td>'+c+'</td><td style="text-align:right">'+fmt(cliPurch[c])+'원</td><td style="text-align:right">'+pct+'%</td></tr>';
    });
    h+='</tbody></table></div>';
  }

  // 인사이트 코멘트
  h+='<div class="card"><div class="card-t">분석 코멘트</div><div style="padding:4px 0">';
  var comments=[];
  if(salesChg>10)comments.push('매출이 전월 대비 '+salesChg+'% 증가하여 성장세를 보이고 있습니다.');
  else if(salesChg<-10)comments.push('매출이 전월 대비 '+Math.abs(salesChg)+'% 감소하여 원인 분석이 필요합니다.');
  if(profitRate<10&&curSales>0)comments.push('이익률이 '+profitRate+'%로 낮습니다. 원가 절감 방안을 검토하세요.');
  if(ontimeRate<90)comments.push('납기준수율이 '+ontimeRate+'%입니다. 생산 일정 관리 강화가 필요합니다.');
  if(totalUnpaid>0)comments.push('미수금 잔액이 '+fmt(totalUnpaid)+'원입니다. 채권 회수에 주의하세요.');
  if(prodChg>20)comments.push('생산량이 '+prodChg+'% 급증하여 품질 관리에 주의가 필요합니다.');
  if(!comments.length)comments.push('전반적으로 안정적인 경영 상태입니다.');
  comments.forEach(function(c){
    h+='<div style="padding:8px 12px;margin-bottom:6px;background:var(--bg2);border-radius:8px;font-size:14px;color:var(--txt);border-left:3px solid var(--pri)">'+c+'</div>';
  });
  h+='</div></div>';
  h+='</div>';
  $('monthlyRptArea').innerHTML=h;
}

function dlMonthlyPdf(){
  var area=$('monthlyRptPrint');
  if(!area){rMonthlyReport();area=$('monthlyRptPrint')}
  if(!area){toast('보고서를 먼저 조회하세요','err');return}
  var w=window.open('','_blank');
  w.document.write('<html><head><title>월간 경영보고서</title>');
  w.document.write('<style>@page{size:A4;margin:20mm}body{font-family:-apple-system,sans-serif;color:#111827;font-size:14px}table{width:100%;border-collapse:collapse;margin-bottom:16px}th,td{padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:left;font-size:13px}th{background:#F9FAFB;font-weight:700}.card-t{font-size:16px;font-weight:700;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #1E3A5F}.sb{padding:16px;border:1px solid #E5E7EB;border-radius:10px;text-align:center}.sb .l{font-size:12px;color:#6B7280;margin-bottom:6px}.sb .v{font-size:22px;font-weight:800}</style>');
  w.document.write('</head><body>');
  w.document.write(area.innerHTML);
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(function(){w.print()},500);
}
