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

  return {
    suite: 'core-flows',
    verified: [
      'quote->order',
      'order->wo',
      'income->stock/purchase',
      'income edit sync',
      'ship->sales/tax/etax/qc',
      'ship cancel reverse-sync',
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

function main() {
  const results = [
    runCoreFlowSuite(),
    runProductionAccountingReportSuite(),
    runIntegritySuite(),
    runPartialShipCliChangeSuite(),
  ];
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main();
