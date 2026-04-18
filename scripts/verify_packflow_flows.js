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
        add() {},
        remove() {},
        toggle() {},
        contains() { return false; },
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
      'woSub=function(){};',
      'orderSub=function(){};',
      'updateShipBadge=function(){};',
      'rShipReady=function(){};',
      'rDash=function(){};',
      'rPlan=function(){};',
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

function main() {
  const results = [runCoreFlowSuite(), runIntegritySuite()];
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main();
