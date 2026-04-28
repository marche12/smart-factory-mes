#!/usr/bin/env node

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const ROOT = '/Users/shoon/Documents/팩플로우';
const FILES = [
  `${ROOT}/static/js/core.js`,
  `${ROOT}/static/js/mes-ship.js`,
  `${ROOT}/static/js/erp-quality.js`,
  `${ROOT}/static/js/mes-wo.js`,
  `${ROOT}/static/js/erp-purchase.js`,
  `${ROOT}/static/js/mes-settings.js`,
  `${ROOT}/static/js/features-ext.js`,
];

function createHarness() {
  const elements = {};
  function makeEl(id) {
    if (elements[id]) return elements[id];
    const classes = new Set();
    elements[id] = {
      id,
      value: '',
      innerHTML: '',
      textContent: '',
      checked: false,
      disabled: false,
      style: { display: '', opacity: '' },
      dataset: {},
      files: [],
      className: '',
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        toggle(name, force) {
          if (force === true) { classes.add(name); return true; }
          if (force === false) { classes.delete(name); return false; }
          if (classes.has(name)) { classes.delete(name); return false; }
          classes.add(name);
          return true;
        },
        contains(name) { return classes.has(name); },
      },
      querySelector(sel) { return makeEl(`${id} ${sel}`); },
      querySelectorAll() { return []; },
      appendChild() {},
      remove() {},
      focus() {},
      setAttribute() {},
      getAttribute() { return null; },
      removeAttribute() {},
      closest() { return null; },
    };
    return elements[id];
  }

  const storage = new Map();
  const localStorage = {
    getItem: key => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    key: i => Array.from(storage.keys())[i] || null,
    get length() { return storage.size; },
  };

  const document = {
    getElementById: id => makeEl(id),
    querySelector: sel => makeEl(sel),
    querySelectorAll() { return []; },
    createElement: tag => makeEl(`created:${tag}:${Math.random()}`),
    body: { appendChild() {}, removeChild() {} },
    head: { appendChild() {} },
    addEventListener() {},
  };

  const toasts = [];
  const ctx = {
    console,
    document,
    localStorage,
    window: {
      document,
      localStorage,
      dispatchEvent() {},
      addEventListener() {},
      removeEventListener() {},
    },
    CustomEvent: function CustomEvent(name, opts) {
      return { name, detail: opts && opts.detail };
    },
    setTimeout: fn => { fn(); return 0; },
    clearTimeout() {},
    setInterval() { return 0; },
    clearInterval() {},
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ updated_at: 'ts' }) }),
    confirm: () => true,
    alert() {},
    prompt: () => '',
    Blob: function Blob() {},
    URL: { createObjectURL: () => '', revokeObjectURL() {} },
    navigator: { clipboard: { writeText: async () => {} } },
    location: { reload() {}, href: '' },
    Image: function Image() {},
    FileReader: function FileReader() {
      this.readAsDataURL = function readAsDataURL() {};
      this.readAsText = function readAsText() {};
    },
    MutationObserver: function MutationObserver() {
      this.observe = function observe() {};
      this.disconnect = function disconnect() {};
    },
    performance: { now: () => 0 },
    addEventListener() {},
    removeEventListener() {},
    initDB() {},
    toast(msg, type) { toasts.push({ msg, type }); },
    oMo() {},
    cMo() {},
    goMod() {},
    woSub() {},
    orderSub() {},
    rQt() {},
    rIncome() {},
    rWOList() {},
    rCli() {},
    rProd() {},
    rStock() {},
    rPr() {},
    rOrderList() {},
    rShipReady() {},
    rDash() {},
    rPlan() {},
    updateShipBadge() {},
    addLog() {},
    loadBizApiKey() {},
    loadPopbillConfig() {},
    initBackupCard() {},
    initAuditCard() {},
    toggleTxMethod() {},
    periodFilterHTML() { return ''; },
    setPrd() {},
    prdFilterData(list) { return list; },
    _prdState: {},
    _prdExportData: {},
    SysCode: { vatRate() { return 0.1; } },
    CU: { nm: '테스터', role: 'admin' },
    _currentGroupId: '',
    _idSeq: 1,
    gid() { return `gid_${this._idSeq++}`; },
    td() { return '2026-04-19'; },
    nw() { return '2026-04-19T10:00:00'; },
    fmt(n) { return String(Number(n) || 0); },
  };

  ctx.window.window = ctx.window;
  ctx.global = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  FILES.forEach(file => {
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  });
  ctx.DB._serverOk = false;
  vm.runInContext(
    [
      'goMod=function(){};',
      'CU={nm:"테스터",role:"admin"};',
      'woSub=function(){};',
      'orderSub=function(){};',
      'updateShipBadge=function(){};',
      'rShipReady=function(){};',
      'rShipHist=function(){};',
      'rShipStat=function(){};',
      'rDash=function(){};',
      'rPlan=function(){};',
      'renderProcQueue=function(){};',
      'rWorkerMonitor=function(){};',
      'rTx=function(){};',
      'rEtax=function(){};',
      'rWOList=function(){};',
      'rQt=function(){};',
      'rIncome=function(){};',
      'rStock=function(){};',
      'rPr=function(){};',
      'rOrderList=function(){};',
    ].join(''),
    ctx
  );

  function setVals(map) {
    Object.entries(map).forEach(([key, value]) => {
      makeEl(key).value = value;
    });
  }

  function getDB(key) {
    return JSON.parse(localStorage.getItem(`ino_${key}`) || '[]');
  }

  function seed(keys) {
    keys.forEach(key => ctx.DB.s(key, []));
  }

  return { ctx, setVals, getDB, seed, toasts };
}

function runProductionAccountingReportSuite() {
  const { ctx, setVals, getDB, seed } = createHarness();
  ctx.document.getElementById('woDetMo').classList.add('hidden');
  ctx.document.getElementById('compMo').classList.add('hidden');
  seed([
    'orders', 'wo', 'cli', 'prod', 'vendors', 'income', 'stock', 'purchase',
    'shipLog', 'sales', 'taxInvoice', 'etax', 'qcRecords', 'hist', 'defectLog',
    'changeLog', 'logs', 'users', 'stockLog', 'co',
  ]);

  ctx.DB.s('users', [{ id: 'admin', nm: '관리자', role: 'admin' }]);
  ctx.DB.s('co', [{ id: 'co1', nm: '팩플로우', bizNo: '999-99-99999' }]);
  ctx.DB.s('cli', [
    { id: 'cli_sales', nm: '연속검증거래처', cType: 'sales', bizNo: '123-45-67890', ceo: '홍길동', addr: '서울' },
    { id: 'cli_purchase', nm: '연속검증매입처', cType: 'purchase', bizNo: '222-22-22222', ceo: '매입대표', addr: '인천' },
  ]);

  ctx.saveOrders([{
    id: 'ord_e2e',
    no: 'SO-E2E-001',
    dt: '2026-04-19',
    cli: '연속검증거래처',
    items: [{ nm: '연속검증 패키지', spec: '200x150x80', qty: 1000, price: 1200 }],
    status: '생산중',
    woIds: ['wo_e2e'],
    woLinks: [{ woId: 'wo_e2e', itemIdx: 0, qty: 1000 }],
    shipDt: '2026-04-22',
  }]);

  ctx.DB.s('wo', [{
    id: 'wo_e2e',
    wn: 'WO-E2E-001',
    ordId: 'ord_e2e',
    dt: '2026-04-19',
    cnm: '연속검증거래처',
    pnm: '연속검증 패키지',
    spec: '200x150x80',
    fq: 1000,
    qm: 1050,
    qe: 50,
    price: 1200,
    amt: 1200000,
    sd: '2026-04-22',
    dlv: '본사',
    mgr: '관리자',
    status: '대기',
    procs: [
      { nm: '코팅', tp: 'n', mt: '무광', vd: '', st: '대기', qty: 0, t1: '', t2: '' },
      { nm: '톰슨', tp: 'n', mt: '', vd: '', st: '대기', qty: 0, t1: '', t2: '' },
      { nm: '접착', tp: 'n', mt: '', vd: '', st: '대기', qty: 0, t1: '', t2: '' },
    ],
  }]);

  function completeProc(index, qty, defect, reason) {
    ctx.pqStart('wo_e2e', index);
    let wo = ctx.DB.g('wo')[0];
    assert.equal(wo.procs[index].st, '진행중', `proc ${index} should start`);
    ctx.pqComplete('wo_e2e', index);
    setVals({
      compQty: String(qty),
      compDefect: String(defect || 0),
      compDefectReason: reason || '',
    });
    ctx.doComp();
    wo = ctx.DB.g('wo')[0];
    assert.equal(wo.procs[index].st, '완료', `proc ${index} should complete`);
    assert.equal(wo.procs[index].qty, qty, `proc ${index} qty should persist`);
    return wo;
  }

  let wo = completeProc(0, 1050, 0, '');
  assert.equal(wo.status, '진행중', 'WO stays production after first proc');
  wo = completeProc(1, 1030, 5, '칼선 위치 보정');
  assert.equal(wo.status, '진행중', 'WO stays production before last proc');
  wo = completeProc(2, 1000, 0, '');
  assert.equal(wo.status, '완료대기', 'WO enters production-complete wait after all procs');

  let hist = getDB('hist');
  let defectLog = getDB('defectLog');
  assert.equal(hist.length, 3, 'three process history rows should be created');
  assert.deepEqual(hist.map(h => h.proc), ['코팅', '톰슨', '접착'], 'process history preserves sequence');
  assert.equal(defectLog.length, 1, 'process defect should be recorded');
  assert.equal(defectLog[0].proc, '톰슨', 'defect should point to the exact process');

  setVals({ compConfQty: '1000', compConfNote: '전 공정 완료 확인' });
  ctx.doConfirmComplete('wo_e2e');
  wo = ctx.DB.g('wo')[0];
  assert.equal(wo.status, '완료', 'WO should be production-complete after confirmation');

  setVals({
    smWoId: 'wo_e2e',
    smQty: '1000',
    smDefect: '12',
    smCliOverride: '',
    smInspNote: '출고검수 12매 불량',
    smCar: '33가3333',
    smDriver: '배송기사',
    smDlv: '본사',
    smMemo: '연속검증 출고',
  });
  ctx.doShip();

  const shipLog = getDB('shipLog');
  const sales = getDB('sales');
  const taxInvoice = getDB('taxInvoice');
  const etax = getDB('etax');
  const qcRecords = getDB('qcRecords');
  wo = ctx.DB.g('wo')[0];
  const orders = getDB('orders');

  assert.equal(shipLog.length, 1, 'ship log should be created after production completion');
  assert.equal(shipLog[0].qty, 1000, 'ship qty should match final product qty');
  assert.equal(shipLog[0].good, 988, 'ship good qty should subtract defect');
  assert.equal(sales.length, 1, 'sales should be auto-created from ship');
  assert.equal(sales[0].amt, 1200000, 'sales amount should be unit price x qty');
  assert.equal(sales[0].shipId, shipLog[0].id, 'sales should link to ship');
  assert.equal(taxInvoice.length, 1, 'tax invoice should be auto-created from ship');
  assert.equal(taxInvoice[0].method, '전자대기', 'biz client should create e-tax waiting invoice');
  assert.equal(taxInvoice[0].saleId, sales[0].id, 'tax invoice should link to sale');
  assert.equal(etax.length, 1, 'e-tax waiting row should be auto-created');
  assert.equal(etax[0].shipId, shipLog[0].id, 'e-tax should link to ship');
  assert.equal(qcRecords.length, 1, 'ship defect should create QC record');
  assert.equal(wo.status, '출고완료', 'WO should become shipped complete');
  assert.equal(orders[0].status, '출고완료', 'linked order should become shipped complete');

  const runtimeDate = vm.runInContext('td()', ctx);
  setVals({
    rptDD: runtimeDate,
    rptShipM: runtimeDate.slice(0, 7),
  });
  ctx.genRpt('day');
  ctx.genShipRpt();
  assert.ok((ctx.document.getElementById('rptDC').innerHTML || '').includes('완료공정'), 'daily report should render process summary');
  assert.ok((ctx.document.getElementById('rptDC').innerHTML || '').includes('연속검증 패키지'), 'daily report should include product');
  assert.ok((ctx.document.getElementById('rptShipC').innerHTML || '').includes('출고 건수'), 'ship report should render summary');
  assert.ok((ctx.document.getElementById('rptShipC').innerHTML || '').includes('연속검증거래처'), 'ship report should include client');

  setVals({
    incId: '',
    incDt: '2026-04-19',
    incCatSel: '원지',
    incVd: '연속검증매입처',
    incNm: 'SC마닐라 300g',
    incSpec: '788x1091',
    incUnit: '매',
    incQty: '200',
    incPrice: '450',
    incNote: '연속검증 매입',
  });
  ctx.saveIncome();
  const income = getDB('income');
  const stock = getDB('stock');
  const purchase = getDB('purchase');
  const linkedPurchase = purchase.find(p => p.incId === income[0].id);
  assert.equal(income.length, 1, 'income should be created for purchase vendor');
  assert.equal(stock.length, 1, 'stock should be created from income');
  assert.equal(stock[0].qty, 200, 'stock qty should match income qty');
  assert.ok(linkedPurchase, 'purchase should be auto-created from income');
  assert.equal(linkedPurchase.cli, '연속검증매입처', 'purchase should use purchase vendor');
  assert.equal(linkedPurchase.amt, 90000, 'purchase amount should be qty x price');

  return {
    suite: 'production-accounting-report-e2e',
    verified: [
      'WO process sequence 코팅->톰슨->접착 starts and completes in order',
      'process completion creates hist rows and process defect log',
      'all procs done -> 완료대기 -> 생산완료 확인',
      'ship creates shipLog/sales/taxInvoice/etax/qcRecords',
      'WO and linked order move to 출고완료',
      'daily process report and ship report render generated records',
      'purchase vendor income creates stock and purchase ledger row',
    ],
    counts: {
      hist: getDB('hist').length,
      defectLog: getDB('defectLog').length,
      shipLog: getDB('shipLog').length,
      sales: getDB('sales').length,
      taxInvoice: getDB('taxInvoice').length,
      etax: getDB('etax').length,
      qcRecords: getDB('qcRecords').length,
      income: getDB('income').length,
      stock: getDB('stock').length,
      purchase: getDB('purchase').length,
    },
  };
}

function runCoreFlowSuite() {
  const { ctx, setVals, getDB, seed, toasts } = createHarness();
  seed(['quotes', 'orders', 'wo', 'cli', 'prod', 'vendors', 'income', 'stock', 'purchase', 'shipLog', 'sales', 'taxInvoice', 'etax', 'qcRecords', 'changeLog', 'logs', 'users', 'stockLog']);

  setVals({
    qtId: '',
    qtNum: 'QT20260419001',
    qtDt: '2026-04-19',
    qtCli: '테스트거래처',
    qtProd: '테스트박스',
    qtSpec: '120x80x60',
    qtPackType: '단상자',
    qtQty: '5000',
    qtPaperCost: '400000',
    qtPrintCost: '120000',
    qtPostCost: '80000',
    qtOutCost: '0',
    qtMoldCost: '50000',
    qtMargin: '20',
    qtContent: '',
    qtNote: '테스트 견적',
    qtSt: '작성중',
    qtPrice: '',
  });
  ctx.qtToOrder();

  let quotes = getDB('quotes');
  let orders = getDB('orders');
  assert.equal(quotes.length, 1, 'quote should be created');
  assert.equal(orders.length, 1, 'order should be created');
  assert.equal(quotes[0].orderId, orders[0].id, 'quote should link order');
  assert.equal(orders[0].quoteId, quotes[0].id, 'order should link quote');
  assert.equal(orders[0].status, '수주확정', 'quote conversion should confirm order');

  ctx.orderToWO(orders[0].id);
  vm.runInContext(
    "cPapers=[{paper:'아트지 250g',spec:'545x788',qm:5500,qe:500}]; cFabrics=[]; cColors=[]; cProcs=[{nm:'인쇄',tp:'out',mt:'4도',vd:'테스트인쇄',st:'대기',qty:0,t1:'',t2:''},{nm:'접착',tp:'n',mt:'단면',vd:'',st:'대기',qty:0,t1:'',t2:''}]; editId=null;",
    ctx
  );
  setVals({
    woNum: 'WO-TEST-001',
    woDt: '2026-04-19',
    woAddr: '서울',
    woTel: '02-1111-2222',
    woFax: '',
    woPrint: '4도',
    woGold: '',
    woMold: 'M-01',
    woHand: '',
    woMgr: '관리자',
    woVendor: '테스트인쇄',
    woCaut: '',
    woShip: '2026-04-22',
    woDlv: '본사',
    woPrice: '156',
  });
  assert.equal(ctx.saveWO(), true, 'WO save should succeed');

  let wos = ctx.DB.g('wo');
  orders = getDB('orders');
  let cli = getDB('cli');
  let prod = getDB('prod');
  let vendors = getDB('vendors');
  assert.equal(wos.length, 1, 'WO should be created');
  assert.equal(orders[0].status, '생산중', 'order should move to production');
  assert.ok(Array.isArray(orders[0].woIds) && orders[0].woIds.includes(wos[0].id), 'order should retain woIds');
  assert.ok(Array.isArray(orders[0].woLinks) && orders[0].woLinks.length === 1, 'order should retain woLinks');
  assert.equal(wos[0].ordId, orders[0].id, 'WO should point back to order');
  assert.equal(cli.length, 1, 'client master should auto-create');
  assert.equal(prod.length, 1, 'product master should auto-create');
  assert.equal(vendors.length, 1, 'vendor master should auto-create');

  setVals({
    incId: '',
    incDt: '2026-04-19',
    incCatSel: '원지',
    incVd: '원지상사',
    incNm: '아트지 250g',
    incSpec: '1091x788',
    incUnit: '매',
    incQty: '100',
    incPrice: '500',
    incNote: '초기입고',
  });
  ctx.saveIncome();
  let income = getDB('income');
  let stock = getDB('stock');
  let purchase = getDB('purchase');
  assert.equal(income.length, 1, 'income should be created');
  assert.equal(stock.length, 1, 'stock should be created');
  assert.equal(stock[0].qty, 100, 'stock qty should reflect intake');
  assert.equal(purchase.length, 1, 'purchase should be created');
  assert.equal(purchase[0].incId, income[0].id, 'purchase should link income');

  setVals({
    incId: income[0].id,
    incDt: '2026-04-19',
    incCatSel: '원지',
    incVd: '원지상사',
    incNm: '아트지 250g',
    incSpec: '1091x788',
    incUnit: '매',
    incQty: '130',
    incPrice: '550',
    incNote: '수정입고',
  });
  ctx.saveIncome();
  stock = getDB('stock');
  purchase = getDB('purchase');
  assert.equal(stock[0].qty, 130, 'stock qty should refresh on edit');
  assert.equal(purchase[0].qty, 130, 'purchase qty should refresh on edit');
  assert.equal(purchase[0].price, 550, 'purchase price should refresh on edit');

  cli = getDB('cli');
  cli[0].bizNo = '123-45-67890';
  cli[0].ceo = '홍길동';
  cli[0].addr = '서울';
  ctx.DB.s('cli', cli);

  setVals({
    smWoId: wos[0].id,
    smQty: String(wos[0].fq),
    smDefect: '50',
    smCliOverride: '',
    smInspNote: '검수완료',
    smCar: '12가3456',
    smDriver: '기사',
    smDlv: '본사',
    smMemo: '없음',
  });
  ctx.doShip();

  const shipLog = getDB('shipLog');
  const sales = getDB('sales');
  const taxInvoice = getDB('taxInvoice');
  const etax = getDB('etax');
  const qcRecords = getDB('qcRecords');
  wos = ctx.DB.g('wo');
  orders = getDB('orders');
  assert.equal(shipLog.length, 1, 'ship log should be created');
  assert.equal(sales.length, 1, 'sales should auto-create');
  assert.equal(taxInvoice.length, 1, 'tax invoice should auto-create');
  assert.equal(etax.length, 1, 'etax should auto-create');
  assert.equal(qcRecords.length, 1, 'qc record should auto-create');
  assert.equal(wos[0].status, '출고완료', 'WO should complete after full shipment');
  assert.equal(orders[0].status, '출고완료', 'order should complete after full shipment');
  assert.equal(sales[0].shipId, shipLog[0].id, 'sales should link ship');
  assert.equal(sales[0].orderId, orders[0].id, 'sales should link order');
  assert.equal(taxInvoice[0].saleId, sales[0].id, 'tax invoice should link sale');
  assert.equal(taxInvoice[0].orderId, orders[0].id, 'tax invoice should link order');
  assert.equal(taxInvoice[0].method, '전자대기', 'tax invoice should wait for e-tax issue');
  assert.equal(etax[0].saleId, sales[0].id, 'etax should link sale');
  assert.equal(qcRecords[0].shipId, shipLog[0].id, 'qc record should link ship');

  // 원장 연결 검증: 취소 전 sales 행이 거래처(cli) 미수금 합계로 누적되는가
  const salesBeforeCancel = getDB('sales');
  const cliNmBeforeCancel = orders[0].cli;
  const ledgerUnpaid = salesBeforeCancel
    .filter(function (r) { return r.cli === cliNmBeforeCancel; })
    .reduce(function (s, r) { return s + Math.max(0, (r.amt || 0) - (r.paid || 0)); }, 0);
  assert.equal(salesBeforeCancel[0].cli, cliNmBeforeCancel, 'sales row should attribute to order cli');
  assert.equal(salesBeforeCancel[0].amt, sales[0].amt, 'sales amt should match unit price x qty');
  assert.ok(ledgerUnpaid > 0, 'cli receivable ledger should accumulate unpaid sales');
  assert.equal(ledgerUnpaid, salesBeforeCancel[0].amt, 'unpaid receivable equals sales amt when paid=0');

  // 매입 원장 연결 검증: 거래처별 미지급금 합계
  const purchaseLedger = getDB('purchase')
    .filter(function (r) { return r.cli === income[0].vd; })
    .reduce(function (s, r) { return s + Math.max(0, (r.amt || 0) - (r.paid || 0)); }, 0);
  assert.equal(purchaseLedger, purchase[0].amt, 'purchase payable ledger should equal income-linked purchase amt');

  ctx.cancelShipById(shipLog[0].id, true);
  const shipLogAfterCancel = getDB('shipLog');
  const salesAfterCancel = getDB('sales');
  const taxAfterCancel = getDB('taxInvoice');
  const etaxAfterCancel = getDB('etax');
  const qcAfterCancel = getDB('qcRecords');
  wos = ctx.DB.g('wo');
  orders = getDB('orders');
  assert.equal(shipLogAfterCancel.length, 0, 'ship log should be removed on cancel');
  assert.equal(salesAfterCancel.length, 0, 'sales should be removed on cancel');
  assert.equal(taxAfterCancel.length, 0, 'tax invoice should be removed on cancel');
  assert.equal(etaxAfterCancel.length, 0, 'etax should be removed on cancel');
  assert.equal(qcAfterCancel.length, 0, 'qc record should be removed on cancel');
  assert.equal(wos[0].status, '진행중', 'WO should revert to production state after cancel');
  assert.equal(orders[0].status, '생산중', 'order should revert to production state after cancel');

  // 취소 후 원장도 0으로 복귀
  const ledgerUnpaidAfterCancel = salesAfterCancel
    .filter(function (r) { return r.cli === cliNmBeforeCancel; })
    .reduce(function (s, r) { return s + Math.max(0, (r.amt || 0) - (r.paid || 0)); }, 0);
  assert.equal(ledgerUnpaidAfterCancel, 0, 'cli receivable ledger should drop to 0 after ship cancel');

  return {
    suite: 'core-flows',
    verified: [
      'quote->order',
      'order->wo',
      'income->stock/purchase',
      'income edit sync',
      'ship->sales/tax/etax/qc',
      'ship cancel reverse-sync',
      'sales->cli receivable ledger sum',
      'purchase->vendor payable ledger sum',
      'ledger drops to 0 after ship cancel',
    ],
    counts: {
      quotes: getDB('quotes').length,
      orders: getDB('orders').length,
      wo: ctx.DB.g('wo').length,
      income: getDB('income').length,
      stock: getDB('stock').length,
      purchase: getDB('purchase').length,
      shipLog: shipLogAfterCancel.length,
      sales: salesAfterCancel.length,
      taxInvoice: taxAfterCancel.length,
      etax: etaxAfterCancel.length,
    },
    lastToasts: toasts.slice(-6),
  };
}

function runIntegritySuite() {
  const { ctx, setVals, getDB, seed } = createHarness();

  seed(['quotes', 'orders']);
  setVals({
    qtId: '',
    qtNum: 'QT-A',
    qtDt: '2026-04-19',
    qtCli: 'A사',
    qtProd: '제품A',
    qtSpec: 'S',
    qtPackType: '단상자',
    qtQty: '100',
    qtPaperCost: '1000',
    qtPrintCost: '0',
    qtPostCost: '0',
    qtOutCost: '0',
    qtMoldCost: '0',
    qtMargin: '10',
    qtContent: '',
    qtNote: '',
    qtSt: '작성중',
    qtPrice: '',
  });
  ctx.qtToOrder();
  let quotes = getDB('quotes');
  let orders = getDB('orders');
  orders[0].status = '출고완료';
  ctx.saveOrders(orders);
  quotes[0].status = '출고완료';
  quotes[0].st = '출고완료';
  ctx.DB.s('quotes', quotes);
  ctx._makeOrderFromQuote(getDB('quotes')[0]);
  quotes = getDB('quotes');
  assert.equal(quotes[0].status, '출고완료', 're-convert should not regress quote status');
  assert.equal(quotes[0].st, '출고완료', 're-convert should not regress quote st');

  seed(['orders', 'wo', 'cli', 'prod', 'vendors', 'users']);
  ctx.DB.s('users', [{ id: 'u1', nm: '관리자' }]);
  ctx.saveOrders([{
    id: 'ord_multi',
    no: 'SO-MULTI',
    dt: '2026-04-19',
    cli: 'B사',
    items: [
      { nm: '품목1', spec: 'A', qty: 100, price: 10 },
      { nm: '품목2', spec: 'B', qty: 200, price: 20 },
    ],
    status: '수주',
  }]);

  function saveWoFromItem(idx, prodName, qty) {
    const order = getDB('orders')[0];
    ctx._fillWOFromOrder(order, order.items[idx], idx);
    vm.runInContext(
      `cPapers=[{paper:'아트지',spec:'788x1091',qm:${qty + 10},qe:10}]; cFabrics=[]; cColors=[]; cProcs=[{nm:'인쇄',tp:'out',mt:'4도',vd:'협력사',st:'대기',qty:0,t1:'',t2:''}]; editId=null;`,
      ctx
    );
    setVals({
      woNum: `WO-${idx}`,
      woDt: '2026-04-19',
      woCli: 'B사',
      woProd: prodName,
      woAddr: '',
      woTel: '',
      woFax: '',
      woPrint: '4도',
      woGold: '',
      woMold: '',
      woHand: '',
      woFQ: String(qty),
      woShip: '2026-04-22',
      woDlv: '본사',
      woNote: '',
      woCaut: '',
      woMgr: '관리자',
      woVendor: '협력사',
      woPrice: '10',
    });
    assert.equal(ctx.saveWO(), true, 'WO save should succeed for each item');
  }

  saveWoFromItem(0, '품목1', 100);
  saveWoFromItem(1, '품목2', 200);
  orders = getDB('orders');
  assert.equal(orders[0].woIds.length, 2, 'multi-line order should retain both woIds');
  assert.equal(orders[0].woLinks.length, 2, 'multi-line order should retain both woLinks');
  assert.deepEqual(orders[0].woLinks.map(link => link.itemIdx).sort(), [0, 1], 'woLinks should keep item indexes');

  const unrelatedStatus = ctx._getOrderStatus(
    { id: 'ord_target', cli: '같은거래처', status: '수주' },
    [{ id: 'wo_other', ordId: 'different_order', cnm: '같은거래처', status: '진행중' }],
    []
  );
  assert.equal(unrelatedStatus, '수주', 'order status should ignore unrelated same-client WO');

  seed(['outsource']);
  ctx.DB.s('outsource', [
    { id: 'os1', woId: 'wo1', woNm: 'WO-1', proc: '인쇄', vendor: 'A업체', qty: 50, price: 100, amt: 5000, due: '2026-04-20', note: 'WO 자동 연동', st: '진행중', source: 'wo-sync' },
    { id: 'os2', woId: 'wo1', woNm: 'WO-1', proc: '톰슨', vendor: 'B업체', qty: 20, price: 0, amt: 0, due: '2026-04-20', note: 'WO 자동 연동', st: '진행중', source: 'wo-sync' },
  ]);
  ctx.syncWOOutsourceRecords({
    id: 'wo1',
    wn: 'WO-1',
    dt: '2026-04-19',
    fq: 120,
    sd: '2026-04-25',
    vendor: 'A업체',
    procs: [{ nm: '인쇄', tp: 'out', vd: 'A업체', qty: 120, st: '외주완료' }],
  });
  const outsource = getDB('outsource');
  assert.equal(outsource.length, 1, 'stale outsource rows should be removed');
  assert.equal(outsource[0].proc, '인쇄', 'current outsource row should stay');
  assert.equal(outsource[0].qty, 120, 'outsource qty should refresh');
  assert.equal(outsource[0].due, '2026-04-25', 'outsource due should refresh');
  assert.equal(outsource[0].price, 100, 'manual price should be preserved');
  assert.equal(outsource[0].st, '완료', 'external completion should map to done');

  return {
    suite: 'integrity-fixes',
    verified: [
      'quote reconvert preserves later status',
      'multi-line order keeps two WO links',
      'order status ignores unrelated same-client WO',
      'outsource sync refreshes current row and removes stale rows',
    ],
  };
}

function runPartialShipCliChangeSuite() {
  /* 시나리오: WO 100매 → 1차 40매 출고(원본 거래처) → 거래처 변경 후 2차 60매 출고
     → 2차 출고 취소 → 1차 출고는 살아있고 재고/매출/세금 일관 */
  const { ctx, setVals, getDB, seed } = createHarness();
  seed(['wo', 'cli', 'prod', 'users', 'orders', 'shipLog', 'sales', 'taxInvoice', 'etax', 'qcRecords']);
  ctx.DB.s('users', [{ id: 'u1', nm: '관리자' }]);
  ctx.DB.s('cli', [
    { id: 'c1', nm: 'A사', bizNo: '111-11-11111', addr: '서울', ceo: 'A' },
    { id: 'c2', nm: 'B사', bizNo: '222-22-22222', addr: '부산', ceo: 'B' },
  ]);
  const wo = {
    id: 'wo_psc', wn: 'WO-PSC-1', ordId: 'ord_psc',
    dt: '2026-04-19', cnm: 'A사', pnm: '상자X', fq: 100, price: 1000, amt: 100000,
    status: '완료', procs: [{ nm: '인쇄', tp: 'n', st: '완료', qty: 100 }],
    paper: '', spec: '', mgr: '관리자',
  };
  ctx.DB.s('wo', [wo]);
  ctx.saveOrders([{ id: 'ord_psc', no: 'SO-PSC', dt: '2026-04-19', cli: 'A사', items: [{ nm: '상자X', qty: 100, price: 1000 }], status: '수주', woIds: [wo.id] }]);

  // 1차 출고 40매 (원본 거래처 A사)
  setVals({
    smWoId: wo.id, smQty: '40', smDefect: '0', smCliOverride: '',
    smInspNote: '1차', smCar: '11가1111', smDriver: '기사1', smDlv: 'A본사', smMemo: '',
  });
  ctx.doShip();
  let shipLog = getDB('shipLog');
  let sales = getDB('sales');
  assert.equal(shipLog.length, 1, 'first ship should be created');
  assert.equal(shipLog[0].cnm, 'A사', 'first ship cnm stays A사');
  assert.equal(shipLog[0].isCliChanged, false, 'first ship not cli-changed');
  assert.equal(sales.length, 1, 'first sales created');
  assert.equal(sales[0].cnm || sales[0].cli, 'A사', 'first sales attributed to A사');

  // 2차 출고 60매 — 거래처를 B사로 변경
  setVals({
    smWoId: wo.id, smQty: '60', smDefect: '0',
    smCliOverride: JSON.stringify({ id: 'c2', nm: 'B사', amendedKindCode: 4, reason: '기재사항 착오 정정', changedAt: '2026-04-19', changedBy: '관리자' }),
    smInspNote: '2차', smCar: '22가2222', smDriver: '기사2', smDlv: 'B본사', smMemo: '',
  });
  ctx.doShip();
  shipLog = getDB('shipLog');
  sales = getDB('sales');
  let wos = ctx.DB.g('wo');
  assert.equal(shipLog.length, 2, 'second ship added');
  const ship2 = shipLog.find(function (s) { return s.cnm === 'B사'; });
  assert.ok(ship2, 'second ship goes to B사');
  assert.equal(ship2.origCnm, 'A사', 'second ship origCnm preserved as A사');
  assert.equal(ship2.isCliChanged, true, 'second ship marked cli-changed');
  assert.equal(ship2.amendedKindCode, 4, 'second ship carries amendedKindCode');
  assert.equal(sales.length, 2, 'two sales entries');
  assert.equal(wos[0].status, '출고완료', 'WO complete after 40+60=100');

  // 2차 출고만 취소
  ctx.cancelShipById(ship2.id, true);
  shipLog = getDB('shipLog');
  sales = getDB('sales');
  wos = ctx.DB.g('wo');
  assert.equal(shipLog.length, 1, 'only first ship remains after 2nd cancel');
  assert.equal(shipLog[0].cnm, 'A사', 'remaining ship is A사');
  assert.equal(sales.length, 1, 'only first sales remains');
  assert.equal(wos[0].status, '출고대기', 'WO reverts to waiting after partial cancel');

  return {
    suite: 'partial-ship-x-cli-change',
    verified: [
      'first partial ship attributes to original cli',
      'second ship with cli override records origCnm + amendedKindCode',
      'WO reaches 출고완료 when sum hits fq',
      'cancelling only the cli-changed ship keeps first ship intact',
      'WO reverts to 출고대기 after partial cancel',
    ],
  };
}

function runIncomeDeleteSuite() {
  /* 시나리오: 같은 자재 A의 입고 2건 누적 → 1건 삭제 → 재고/매입 양쪽 정확 정리
     별도 자재 B 입고 1건 → 삭제 → stock/purchase 행 모두 사라지는지 */
  const { ctx, setVals, getDB, seed } = createHarness();
  seed(['income', 'stock', 'purchase', 'cli']);

  function saveIncomeRow(opts) {
    setVals({
      incId: opts.id || '',
      incDt: opts.dt || '2026-04-19',
      incCatSel: opts.cat || '원지',
      incVd: opts.vd || '원지상사',
      incNm: opts.nm,
      incSpec: opts.spec || '788x1091',
      incUnit: opts.unit || '매',
      incQty: String(opts.qty),
      incPrice: String(opts.price),
      incNote: opts.note || '',
    });
    ctx.saveIncome();
  }

  // 자재 A: 입고1 100매 + 입고2 60매 = 재고 160매 누적
  saveIncomeRow({ nm: '아트지 250g', qty: 100, price: 500, note: '1차' });
  let income = getDB('income');
  let stock = getDB('stock');
  let purchase = getDB('purchase');
  assert.equal(income.length, 1, 'first income created');
  assert.equal(stock.length, 1, 'stock row created for material A');
  assert.equal(stock[0].qty, 100, 'stock qty matches first income');
  assert.equal(purchase.length, 1, 'purchase auto-created for first income');
  const incA1Id = income[0].id;

  saveIncomeRow({ nm: '아트지 250g', qty: 60, price: 520, note: '2차 추가' });
  income = getDB('income');
  stock = getDB('stock');
  purchase = getDB('purchase');
  assert.equal(income.length, 2, 'second income created (different id)');
  assert.equal(stock.length, 1, 'same material should keep single stock row');
  assert.equal(stock[0].qty, 160, 'stock qty should accumulate (100+60)');
  assert.equal(purchase.length, 2, 'each income creates its own purchase row');
  const incA2 = income.find(r => r.id !== incA1Id);

  // 자재 B: 별도 자재 입고 1건 → 별도 stock/purchase 행
  saveIncomeRow({ nm: 'SC마닐라 300g', qty: 200, price: 450, vd: '제지상사2', note: '자재B' });
  stock = getDB('stock');
  purchase = getDB('purchase');
  assert.equal(stock.length, 2, 'different material should create new stock row');
  assert.equal(purchase.length, 3, 'three purchase rows after three incomes');
  const incBId = getDB('income').find(r => r.nm === 'SC마닐라 300g').id;

  // 자재 A의 1차 입고만 삭제 → 재고는 60매 잔존, 매입은 1건만 사라져야 함
  ctx.dIncome(incA1Id);
  income = getDB('income');
  stock = getDB('stock');
  purchase = getDB('purchase');
  assert.equal(income.length, 2, 'only first A income removed');
  assert.equal(income.find(r => r.id === incA1Id), undefined, 'A1 income removed');
  const stockA = stock.find(s => s.nm === '아트지 250g');
  assert.ok(stockA, 'A stock row should still exist');
  assert.equal(stockA.qty, 60, 'A stock qty should drop to 60 after A1 delete');
  assert.equal(purchase.find(p => p.incId === incA1Id), undefined, 'A1 purchase removed');
  assert.equal(purchase.length, 2, 'remaining: A2 + B purchase rows');

  // 자재 B 입고 삭제 → stock B는 0이 되어 행 자체는 남되 qty=0, purchase B 삭제
  ctx.dIncome(incBId);
  stock = getDB('stock');
  purchase = getDB('purchase');
  const stockB = stock.find(s => s.nm === 'SC마닐라 300g');
  assert.ok(stockB, 'B stock row remains as zero (history kept)');
  assert.equal(stockB.qty, 0, 'B stock qty drops to 0 after delete');
  assert.equal(purchase.find(p => p.incId === incBId), undefined, 'B purchase removed');
  assert.equal(purchase.length, 1, 'only A2 purchase remains');

  // 자재 A의 2차 입고도 삭제 → A stock qty=0
  ctx.dIncome(incA2.id);
  income = getDB('income');
  stock = getDB('stock');
  purchase = getDB('purchase');
  assert.equal(income.length, 0, 'all income rows removed');
  const stockAFinal = stock.find(s => s.nm === '아트지 250g');
  assert.equal(stockAFinal.qty, 0, 'A stock qty=0 after all incomes deleted');
  assert.equal(purchase.length, 0, 'no purchase rows left');

  return {
    suite: 'income-delete-sync',
    verified: [
      'multiple incomes for same material accumulate stock',
      'each income creates its own purchase row (incId-linked)',
      'deleting one of multiple incomes for a material decrements stock by exactly that qty',
      'deleting an income removes only its purchase row',
      'sole income delete leaves stock row at qty=0 (history preserved)',
    ],
  };
}

function runMultiItemPartialShipSuite() {
  /* 시나리오: 다품목 수주(2 품목) → WO 2개 → WO-1만 출고 → order.status='생산중' 유지
     → WO-2도 출고 → order.status='출고완료' */
  const { ctx, setVals, getDB, seed } = createHarness();
  seed(['orders', 'wo', 'cli', 'prod', 'users', 'shipLog', 'sales', 'taxInvoice', 'etax', 'qcRecords']);
  ctx.DB.s('users', [{ id: 'u1', nm: '관리자' }]);
  ctx.DB.s('cli', [{ id: 'c1', nm: 'C사', bizNo: '333-33-33333', addr: '대전', ceo: 'C' }]);

  ctx.saveOrders([{
    id: 'ord_multi2',
    no: 'SO-MULTI2',
    dt: '2026-04-19',
    cli: 'C사',
    items: [
      { nm: '품목X', spec: '100x100', qty: 50, price: 200 },
      { nm: '품목Y', spec: '200x200', qty: 80, price: 300 },
    ],
    status: '수주확정',
    woIds: ['wo_mp1', 'wo_mp2'],
    woLinks: [
      { woId: 'wo_mp1', itemIdx: 0, itemNm: '품목X', qty: 50 },
      { woId: 'wo_mp2', itemIdx: 1, itemNm: '품목Y', qty: 80 },
    ],
  }]);

  ctx.DB.s('wo', [
    {
      id: 'wo_mp1', wn: 'WO-MP-1', ordId: 'ord_multi2',
      dt: '2026-04-19', cnm: 'C사', pnm: '품목X', spec: '100x100',
      fq: 50, price: 200, amt: 10000, sd: '2026-04-22', dlv: '본사', mgr: '관리자',
      status: '완료', procs: [{ nm: '인쇄', tp: 'n', st: '완료', qty: 50 }],
    },
    {
      id: 'wo_mp2', wn: 'WO-MP-2', ordId: 'ord_multi2',
      dt: '2026-04-19', cnm: 'C사', pnm: '품목Y', spec: '200x200',
      fq: 80, price: 300, amt: 24000, sd: '2026-04-22', dlv: '본사', mgr: '관리자',
      status: '완료', procs: [{ nm: '인쇄', tp: 'n', st: '완료', qty: 80 }],
    },
  ]);

  // WO-1 전량 출고 → order.status는 '생산중' 또는 '출고대기' 유지 (전체 완료 아님)
  setVals({
    smWoId: 'wo_mp1', smQty: '50', smDefect: '0', smCliOverride: '',
    smInspNote: 'X출고', smCar: '11가1111', smDriver: '기사', smDlv: '본사', smMemo: '',
  });
  ctx.doShip();
  let orders = getDB('orders');
  let wos = ctx.DB.g('wo');
  const wo1 = wos.find(w => w.id === 'wo_mp1');
  const wo2 = wos.find(w => w.id === 'wo_mp2');
  assert.equal(wo1.status, '출고완료', 'WO-1 should be shipped complete');
  assert.equal(wo2.status, '완료', 'WO-2 should still be production-complete waiting to ship');
  assert.notEqual(orders[0].status, '출고완료', 'order should NOT be 출고완료 while one WO unshipped');
  assert.equal(getDB('shipLog').length, 1, 'one shipLog after first WO ship');
  assert.equal(getDB('sales').length, 1, 'one sales after first WO ship');

  // WO-2도 출고 → 모두 완료 → order.status='출고완료'
  setVals({
    smWoId: 'wo_mp2', smQty: '80', smDefect: '0', smCliOverride: '',
    smInspNote: 'Y출고', smCar: '22가2222', smDriver: '기사', smDlv: '본사', smMemo: '',
  });
  ctx.doShip();
  orders = getDB('orders');
  wos = ctx.DB.g('wo');
  assert.equal(wos.find(w => w.id === 'wo_mp2').status, '출고완료', 'WO-2 should ship complete');
  assert.equal(orders[0].status, '출고완료', 'order should be 출고완료 after both WOs ship');
  assert.equal(getDB('shipLog').length, 2, 'two shipLog rows');
  assert.equal(getDB('sales').length, 2, 'two sales rows');
  assert.equal(getDB('taxInvoice').length, 2, 'two tax invoices');

  // WO-1 출고만 취소 → order.status는 출고완료에서 다시 후퇴
  const ship1Id = getDB('shipLog').find(s => s.woId === 'wo_mp1').id;
  ctx.cancelShipById(ship1Id, true);
  orders = getDB('orders');
  wos = ctx.DB.g('wo');
  assert.equal(wos.find(w => w.id === 'wo_mp1').status, '완료', 'WO-1 reverts to 완료 after cancel');
  assert.equal(wos.find(w => w.id === 'wo_mp2').status, '출고완료', 'WO-2 stays shipped complete');
  assert.notEqual(orders[0].status, '출고완료', 'order should NOT be 출고완료 after partial cancel');
  assert.equal(getDB('shipLog').length, 1, 'only WO-2 shipLog remains');
  assert.equal(getDB('sales').length, 1, 'only WO-2 sales remains');

  // 다시 WO-1 재출고 → shipLog/sales/taxInvoice 정확히 2세트로 복귀, 중복 없음
  setVals({
    smWoId: 'wo_mp1', smQty: '50', smDefect: '0', smCliOverride: '',
    smInspNote: 'X재출고', smCar: '11가1111', smDriver: '기사', smDlv: '본사', smMemo: '',
  });
  ctx.doShip();
  orders = getDB('orders');
  wos = ctx.DB.g('wo');
  const ship2 = getDB('shipLog');
  const sales2 = getDB('sales');
  const tax2 = getDB('taxInvoice');
  const etax2 = getDB('etax');
  const qc2 = getDB('qcRecords');
  assert.equal(ship2.length, 2, 're-ship should bring shipLog back to 2 (no duplicates)');
  assert.equal(sales2.length, 2, 'sales should be 2 after re-ship');
  assert.equal(tax2.length, 2, 'taxInvoice should be 2 after re-ship');
  assert.equal(etax2.length, 2, 'etax should be 2 after re-ship');
  // qcRecords는 defect>0일 때만 생성 — 본 시나리오는 defect=0이므로 항상 0
  assert.equal(qc2.length, 0, 'qcRecords stays 0 when no defect (created only on defect>0)');
  // 각 woId 당 정확히 1개씩
  assert.equal(ship2.filter(s => s.woId === 'wo_mp1').length, 1, 'exactly one ship per WO-1');
  assert.equal(ship2.filter(s => s.woId === 'wo_mp2').length, 1, 'exactly one ship per WO-2');
  assert.equal(sales2.filter(s => s.woId === 'wo_mp1').length, 1, 'exactly one sales per WO-1');
  assert.equal(sales2.filter(s => s.woId === 'wo_mp2').length, 1, 'exactly one sales per WO-2');
  // 매출 합계가 두 WO 금액 합과 일치 (10000 + 24000)
  const totalSales = sales2.reduce(function (s, r) { return s + (r.amt || 0); }, 0);
  assert.equal(totalSales, 10000 + 24000, 'sum of sales should equal both WO amounts');
  assert.equal(wos.find(w => w.id === 'wo_mp1').status, '출고완료', 'WO-1 ship complete after re-ship');
  assert.equal(orders[0].status, '출고완료', 'order back to 출고완료 after re-ship');

  return {
    suite: 'multi-item-partial-ship',
    verified: [
      'multi-item order with 2 WOs: shipping only one keeps order out of 출고완료',
      'order reaches 출고완료 only when all linked WOs ship',
      'cancelling one WO ship from a fully-shipped order rolls order back from 출고완료',
      '5 documents (shipLog/sales/taxInvoice/etax/qcRecords) tracked per WO ship',
      're-shipping a cancelled WO restores documents to exactly one set (no duplicates)',
      'sales sum after re-ship matches both WO amounts',
    ],
  };
}

function runIncomeNegativeStockSuite() {
  /* 시나리오: 입고 1건(qty=10) → stock=10 → 출고 시뮬레이션으로 stock=2까지 차감
     → 입고 수정(qty=5) → stock 음수 방지 (Math.max(0,…) 가드)
     → 입고 삭제 → stock 음수 방지 + purchase 정리 */
  const { ctx, setVals, getDB, seed } = createHarness();
  seed(['income', 'stock', 'purchase', 'cli']);

  // 입고 1건 qty=10
  setVals({
    incId: '', incDt: '2026-04-19', incCatSel: '원지', incVd: '원지상사',
    incNm: '아트지 200g', incSpec: '788x1091', incUnit: '매',
    incQty: '10', incPrice: '500', incNote: '초기',
  });
  ctx.saveIncome();
  let income = getDB('income');
  let stock = getDB('stock');
  assert.equal(income.length, 1, 'income created');
  assert.equal(stock.length, 1, 'stock created');
  assert.equal(stock[0].qty, 10, 'stock qty=10 after first income');
  const incId = income[0].id;

  // BOM 자동 차감 시뮬레이션: 출고로 stock 8 차감 → stock=2
  stock = ctx.DB.g('stock');
  stock[0].qty = 2;
  ctx.DB.s('stock', stock);
  assert.equal(getDB('stock')[0].qty, 2, 'stock manually drops to 2 (simulated consumption)');

  // 입고 수정: qty 10→5
  // saveIncome 흐름: prev(qty=10) -1 적용 → 2-10 = -8 → guard → 0
  //                  rec(qty=5)  +1 적용 → 0+5 = 5
  // ⇒ 음수 가드가 중간에 작동해 최종 stock=5 (음수가 아니라 5로 회복)
  setVals({
    incId: incId, incDt: '2026-04-19', incCatSel: '원지', incVd: '원지상사',
    incNm: '아트지 200g', incSpec: '788x1091', incUnit: '매',
    incQty: '5', incPrice: '500', incNote: '수정',
  });
  ctx.saveIncome();
  stock = getDB('stock');
  let purchase = getDB('purchase');
  assert.ok(stock[0].qty >= 0, 'stock qty must NOT be negative after destructive edit');
  assert.equal(stock[0].qty, 5, 'stock recovers to 5 (prev -10 guarded to 0, then rec +5)');
  assert.equal(purchase.length, 1, 'purchase row stays linked to income');
  assert.equal(purchase[0].qty, 5, 'purchase qty refreshes to edited qty');
  assert.equal(purchase[0].amt, 5 * 500, 'purchase amt refreshes to edited qty x price');

  // 다시 시뮬레이션 stock=3으로 세팅 → 입고 삭제 시 -5 적용 → 음수 위험
  stock = ctx.DB.g('stock');
  stock[0].qty = 3;
  ctx.DB.s('stock', stock);
  ctx.dIncome(incId);
  stock = getDB('stock');
  purchase = getDB('purchase');
  income = getDB('income');
  assert.equal(income.length, 0, 'income deleted');
  assert.equal(purchase.length, 0, 'purchase removed via removePurchaseFromIncome');
  assert.ok(stock[0].qty >= 0, 'stock qty must NOT be negative after delete');
  assert.equal(stock[0].qty, 0, 'stock guarded to 0 when delete would underflow (3 - 5 → 0)');

  // 정상 케이스: 입고 후 부분 차감만 한 뒤 삭제 → 정확히 그 차이만 남아야 함
  setVals({
    incId: '', incDt: '2026-04-20', incCatSel: '원지', incVd: '원지상사',
    incNm: 'SC마닐라 250g', incSpec: '788x1091', incUnit: '매',
    incQty: '20', incPrice: '400', incNote: '두번째자재',
  });
  ctx.saveIncome();
  let stock2 = getDB('stock');
  const sB = stock2.find(s => s.nm === 'SC마닐라 250g');
  // 외부에서 7매 차감
  sB.qty = 13;
  ctx.DB.s('stock', stock2);
  const inc2 = getDB('income').find(r => r.nm === 'SC마닐라 250g');
  ctx.dIncome(inc2.id);
  stock2 = getDB('stock');
  const sBAfter = stock2.find(s => s.nm === 'SC마닐라 250g');
  // 13 - 20 = -7 → guard → 0
  assert.equal(sBAfter.qty, 0, 'consumed-then-deleted material guards to 0 (no negative)');

  return {
    suite: 'income-negative-stock-guard',
    verified: [
      'saveIncome edit cannot drive stock negative (Math.max(0,…) guard at applyIncomeToStock)',
      'dIncome cannot drive stock negative when material was already consumed',
      'purchase row qty/amt refresh on edit, removed on delete',
      'stock floor at 0 holds even when consumption exceeds remaining income',
    ],
  };
}

function main() {
  const results = [
    runCoreFlowSuite(),
    runProductionAccountingReportSuite(),
    runIntegritySuite(),
    runPartialShipCliChangeSuite(),
    runIncomeDeleteSuite(),
    runMultiItemPartialShipSuite(),
    runIncomeNegativeStockSuite(),
  ];
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main();
