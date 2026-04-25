/* ================================================================
   mes-closing.js — 월말 마감 점검 (프로토타입)
   기능:
   - 출고됐는데 매출 미등록
   - 매출 있는데 세금계산서 미발행
   - 매출 vs 세금계산서 금액 불일치
   - 매출 vs 출고수량 불일치
   - 단가 이상치 (평균 ±30%)
   - 거래처별 마감 진행률
   ================================================================ */
(function(){
'use strict';

function fmt(n){ try{return (Number(n)||0).toLocaleString('ko-KR');}catch(e){return n;} }
function ymOf(d){ return (d||'').slice(0,7); }
function curMonth(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }

function getMonth(){
  var sel = document.getElementById('clsMonth');
  return sel && sel.value ? sel.value : curMonth();
}

/* 데이터 추출 (월 필터) */
function loadData(ym){
  var inMonth = function(o){ return ymOf(o.dt) === ym; };
  return {
    sales: (DB.g('sales')||[]).filter(inMonth),
    purchase: (DB.g('purchase')||[]).filter(inMonth),
    taxInvoice: (DB.g('taxInvoice')||[]).filter(inMonth),
    shipLog: (DB.g('shipLog')||[]).filter(inMonth),
    income: (DB.g('income')||[]).filter(inMonth),
    wo: (DB.g('wo')||[])
  };
}

/* === 검출 로직 === */

/* 1) 출고됐는데 매출 미등록 */
function checkShipNoSales(d){
  var salesByShip = {};
  d.sales.forEach(function(s){ if(s.shipId) salesByShip[s.shipId] = s; });
  var miss = [];
  d.shipLog.forEach(function(sh){
    if(!salesByShip[sh.id]){
      // 반품·취소 제외
      if(sh.type === '반품' || sh.status === '취소') return;
      miss.push({
        id: sh.id, dt: sh.dt, cnm: sh.cnm, pnm: sh.pnm,
        qty: sh.qty, amt: '-', issue: '출고O / 매출X'
      });
    }
  });
  return miss;
}

/* 2) 매출 있는데 세금계산서 미발행 */
function checkSalesNoTax(d){
  var taxByShip = {}, taxBySalesId = {};
  d.taxInvoice.forEach(function(t){
    if(t.shipId) taxByShip[t.shipId] = t;
    if(t.salesId) taxBySalesId[t.salesId] = t;
  });
  var miss = [];
  d.sales.forEach(function(s){
    if(s.qty < 0 || s.type === '반품') return; // 반품 제외
    var hasTax = (s.shipId && taxByShip[s.shipId]) || taxBySalesId[s.id];
    if(!hasTax){
      miss.push({
        id: s.id, dt: s.dt, cnm: s.cnm, pnm: s.pnm,
        qty: s.qty, amt: s.amt, issue: '매출O / 세금계산서X'
      });
    }
  });
  return miss;
}

/* 3) 매출 vs 세금계산서 금액 불일치 */
function checkAmountMismatch(d){
  var taxByShip = {};
  d.taxInvoice.forEach(function(t){ if(t.shipId) taxByShip[t.shipId] = t; });
  var miss = [];
  d.sales.forEach(function(s){
    if(!s.shipId) return;
    var t = taxByShip[s.shipId];
    if(!t) return;
    var sAmt = Math.abs(Number(s.amt)||0);
    var tAmt = Math.abs(Number(t.amt)||Number(t.supAmt)||0);
    if(sAmt !== tAmt && Math.abs(sAmt - tAmt) > 1){
      miss.push({
        id: s.id, dt: s.dt, cnm: s.cnm, pnm: s.pnm,
        qty: s.qty, amt: s.amt,
        issue: '금액불일치: 매출 '+fmt(sAmt)+' / 세금 '+fmt(tAmt)+' (차 '+fmt(sAmt-tAmt)+')'
      });
    }
  });
  return miss;
}

/* 4) 매출 vs 출고수량 불일치 */
function checkQtyMismatch(d){
  var shipById = {};
  d.shipLog.forEach(function(sh){ shipById[sh.id] = sh; });
  var miss = [];
  d.sales.forEach(function(s){
    if(!s.shipId) return;
    var sh = shipById[s.shipId];
    if(!sh) return;
    var sQty = Math.abs(Number(s.qty)||0);
    var hQty = Math.abs(Number(sh.qty)||0);
    if(sQty !== hQty){
      miss.push({
        id: s.id, dt: s.dt, cnm: s.cnm, pnm: s.pnm,
        qty: s.qty, amt: s.amt,
        issue: '수량불일치: 매출 '+sQty+' / 출고 '+hQty
      });
    }
  });
  return miss;
}

/* 5) 단가 이상치 (품목별 평균 ±30%) */
function checkPriceAnomaly(d){
  var byProd = {};
  d.sales.forEach(function(s){
    if(!s.pnm || !s.qty || !s.amt) return;
    var unit = Math.abs(s.amt) / Math.abs(s.qty);
    if(!byProd[s.pnm]) byProd[s.pnm] = [];
    byProd[s.pnm].push({s: s, unit: unit});
  });
  var miss = [];
  Object.keys(byProd).forEach(function(pnm){
    var arr = byProd[pnm];
    if(arr.length < 2) return; // 단일 건은 비교 불가
    var avg = arr.reduce(function(a,b){return a+b.unit;},0) / arr.length;
    arr.forEach(function(x){
      var pct = (x.unit - avg) / avg;
      if(Math.abs(pct) > 0.30){
        miss.push({
          id: x.s.id, dt: x.s.dt, cnm: x.s.cnm, pnm: x.s.pnm,
          qty: x.s.qty, amt: x.s.amt,
          issue: '단가 이상치: '+fmt(Math.round(x.unit))+' (평균 '+fmt(Math.round(avg))+', '+(pct>0?'+':'')+(pct*100).toFixed(0)+'%)'
        });
      }
    });
  });
  return miss;
}

/* 6) 매입 누락 (입고 있는데 매입 없음) */
function checkIncomeNoPurchase(d){
  if(!d.income.length) return [];
  var purByRef = {};
  d.purchase.forEach(function(p){ if(p.incomeId) purByRef[p.incomeId] = p; });
  var miss = [];
  d.income.forEach(function(i){
    if(!purByRef[i.id]){
      miss.push({
        id: i.id, dt: i.dt, cnm: i.vnm||i.cnm, pnm: i.pnm,
        qty: i.qty, amt: i.amt||'-', issue: '입고O / 매입X'
      });
    }
  });
  return miss;
}

/* === 화면 렌더 === */

function rowsHtml(rows, emptyMsg){
  if(!rows.length) return '<tr><td colspan="6" style="text-align:center;padding:20px;color:#10B981;font-weight:700">✓ '+emptyMsg+'</td></tr>';
  return rows.map(function(r){
    return '<tr>'
      + '<td>'+(r.dt||'-')+'</td>'
      + '<td>'+(r.cnm||'-')+'</td>'
      + '<td>'+(r.pnm||'-')+'</td>'
      + '<td style="text-align:right">'+fmt(r.qty)+'</td>'
      + '<td style="text-align:right">'+(typeof r.amt==='number'?fmt(r.amt):r.amt)+'</td>'
      + '<td style="color:#DC2626;font-weight:600">'+r.issue+'</td>'
      + '</tr>';
  }).join('');
}

function kpiCard(label, value, color, sub){
  return '<div style="background:#fff;border:1px solid #E5E7EB;border-left:4px solid '+color+';border-radius:8px;padding:14px 18px;min-width:140px">'
    + '<div style="font-size:11px;color:#6B7280;font-weight:700">'+label+'</div>'
    + '<div style="font-size:24px;font-weight:800;color:'+color+';margin-top:4px">'+value+'</div>'
    + (sub?'<div style="font-size:11px;color:#9CA3AF;margin-top:2px">'+sub+'</div>':'')
    + '</div>';
}

window.rClosing = function(){
  var pg = document.getElementById('pg-mes-closing');
  if(!pg) return;

  var ym = getMonth();
  var d = loadData(ym);

  // 검출
  var r1 = checkShipNoSales(d);
  var r2 = checkSalesNoTax(d);
  var r3 = checkAmountMismatch(d);
  var r4 = checkQtyMismatch(d);
  var r5 = checkPriceAnomaly(d);
  var r6 = checkIncomeNoPurchase(d);
  var totalIssues = r1.length + r2.length + r3.length + r4.length + r5.length + r6.length;

  // KPI
  var salesAmt = d.sales.reduce(function(a,b){return a+(Number(b.amt)||0);},0);
  var taxAmt = d.taxInvoice.reduce(function(a,b){return a+(Number(b.amt)||Number(b.supAmt)||0);},0);
  var taxRate = d.sales.length ? Math.round(d.taxInvoice.length/d.sales.length*100) : 0;
  var shipCnt = d.shipLog.length;
  var salesShipMatch = d.sales.filter(function(s){return s.shipId;}).length;
  var shipRate = shipCnt ? Math.round(salesShipMatch/shipCnt*100) : 0;

  var html =
    '<div style="padding:18px;max-width:1400px;margin:0 auto">'
    + '<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;flex-wrap:wrap">'
    +   '<h2 style="margin:0;font-size:22px;font-weight:800;color:#0F172A">📋 월말 마감 점검</h2>'
    +   '<input type="month" id="clsMonth" value="'+ym+'" onchange="rClosing()" style="padding:8px 12px;border:1px solid #D1D5DB;border-radius:6px;font-size:14px;font-weight:700">'
    +   '<button onclick="rClosing()" style="padding:8px 16px;background:#E8913A;color:#fff;border:0;border-radius:6px;font-weight:700;cursor:pointer">🔄 새로고침</button>'
    +   '<div style="margin-left:auto;font-size:13px;color:#6B7280">기준: '+ym+' · 검출 '+totalIssues+'건</div>'
    + '</div>'

    /* KPI 카드 */
    + '<div style="display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap">'
    +   kpiCard('출고건수', fmt(shipCnt), '#3B82F6')
    +   kpiCard('매출건수', fmt(d.sales.length), '#10B981', '금액 '+fmt(salesAmt))
    +   kpiCard('세금계산서', fmt(d.taxInvoice.length), '#8B5CF6', '발행률 '+taxRate+'%')
    +   kpiCard('매출↔출고 매칭', shipRate+'%', shipRate>=90?'#10B981':'#F59E0B', salesShipMatch+'/'+shipCnt)
    +   kpiCard('이슈 합계', fmt(totalIssues), totalIssues===0?'#10B981':'#DC2626', totalIssues===0?'마감 가능':'점검 필요')
    + '</div>'

    /* 검출 결과 섹션 */
    + section('① 출고됐는데 매출 미등록', r1, '모든 출고 건이 매출에 반영됨', '#DC2626')
    + section('② 매출 있는데 세금계산서 미발행', r2, '모든 매출에 세금계산서 발행됨', '#F59E0B')
    + section('③ 매출 vs 세금계산서 금액 불일치', r3, '금액 일치', '#DC2626')
    + section('④ 매출 vs 출고수량 불일치', r4, '수량 일치', '#F59E0B')
    + section('⑤ 단가 이상치 (평균 ±30%)', r5, '단가 이상 없음', '#8B5CF6')
    + section('⑥ 입고됐는데 매입 미등록', r6, '모든 입고 건이 매입에 반영됨', '#DC2626')

    /* 안내 */
    + '<div style="margin-top:24px;padding:14px;background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;font-size:13px;color:#92400E">'
    +   '💡 <b>마감 점검 프로토타입</b>: 이슈 항목 클릭 시 해당 화면으로 이동 (개발 예정). 현재는 점검 결과만 표시합니다.'
    + '</div>'
    + '</div>';

  pg.innerHTML = html;
};

function section(title, rows, emptyMsg, color){
  var ctOk = rows.length === 0;
  return '<div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:14px;overflow:hidden">'
    + '<div style="padding:12px 16px;background:'+(ctOk?'#F0FDF4':'#FEF2F2')+';border-bottom:1px solid #E5E7EB;display:flex;align-items:center;gap:10px">'
    +   '<span style="font-size:14px;font-weight:800;color:'+(ctOk?'#15803D':color)+'">'+title+'</span>'
    +   '<span style="background:'+(ctOk?'#10B981':color)+';color:#fff;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:800">'+rows.length+'건</span>'
    + '</div>'
    + '<table class="dt" style="width:100%;font-size:12px">'
    +   '<thead><tr><th>일자</th><th>거래처</th><th>품명</th><th style="text-align:right">수량</th><th style="text-align:right">금액</th><th>이슈</th></tr></thead>'
    +   '<tbody>'+rowsHtml(rows, emptyMsg)+'</tbody>'
    + '</table>'
    + '</div>';
}

/* MR 등록 */
if(typeof window.MR === 'object'){
  window.MR['mes-closing'] = function(){ window.rClosing(); };
}

console.log('[mes-closing] loaded — 월말 마감 점검');
})();
