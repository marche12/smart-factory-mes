/* ===== ERP:analysis ===== */

function printSection(id) {
  var el = $(id);
  var w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>경영분석</title>' +
    '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;font-size:11px;padding:15mm}' +
    'table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:4px 6px}' +
    'th{background:#E5E7EB;font-weight:700}@media print{@page{size:A4 landscape;margin:10mm}}</style></head>' +
    '<body><h2 style="text-align:center;margin-bottom:16px">이노패키지 경영분석</h2>' + el.innerHTML + '</body></html>');
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
    emptyHtml('', '매출/매입 데이터가 없습니다', '매출/회계 모듈에서 데이터를 등록하면 차트가 표시됩니다.');

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
  var colors = ['#1E40AF', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE', '#EFF6FF', '#F8FAFC', '#F8FAFC'];

  $('rankTitle').textContent = '거래처별 ' + (type === 'sales' ? '매출' : '건수') + ' Top ' + sorted.length;

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

  var procColors = ['#1E40AF', '#16A34A', '#EA580C', '#DC2626', '#7B61FF', '#EC4899'];

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

