/**
 * Core Access Ops — side panels (stage O4) · 11 Nov 2026
 * D2 (18 Nov): Make a PDF has an optional Signed by pick (signer list from CAE_Ops_Office.gs).
 * Third script file in the same Apps Script project: + › Script › name it CAE_Ops_UI › paste this file › Save.
 * File order: Core, PDF, UI, then the later files; CAE_Ops_Office.gs must always stay the LAST .gs file (it wraps every public
 * function for the web app, adds the Web app menu and gives this panel its PDF signer list). This file's onOpen() replaces
 * Core's temporary prompt menu; later files may wrap it.
 * Reload the sheet → menu "Core Access" › Open panel (sidebar) or "Open panel in a wide window".
 *
 * Every form calls the same O2/O3 functions (quoteToPI, createChallan, postChallan, runHireBilling, makePdf …).
 * One click = one document lock + the core's Log row. Server side: uiInit · uiGet · uiDo (actions in UI_ACTIONS_).
 * Contents: menu · server API · new actions (customer, site, quote save/revise, job details, off-hire, variation,
 * PO, expense, status) · panel HTML · self-test.
 */
var CAE_UI_VERSION = 'O4 · 11 Nov 2026';

// ======================================================================= menu
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Core Access')
    .addItem('Open panel', 'uiOpenHome')
    .addItem('Open panel in a wide window', 'uiOpenWide')
    .addSeparator()
    .addItem('New quote', 'uiOpenQuote')
    .addItem('Quotes: edit · revise · PI · job', 'uiOpenQuotes')
    .addItem('Jobs: work order · off-hire · variations · milestones', 'uiOpenJob')
    .addItem('New customer / site', 'uiOpenCustomer')
    .addSeparator()
    .addItem('New challan', 'uiOpenChallan')
    .addItem('Return + damage', 'uiOpenReturn')
    .addItem('Post / cancel challans', 'uiOpenPost')
    .addSeparator()
    .addItem('Billing: hire · milestones · invoices · debit notes', 'uiOpenBilling')
    .addItem('Record payment + allocate', 'uiOpenPayment')
    .addSeparator()
    .addItem('New PO', 'uiOpenPO')
    .addItem('Receive goods', 'uiOpenReceive')
    .addItem('Expense', 'uiOpenExpense')
    .addSeparator()
    .addItem('PDF documents', 'uiOpenPdf')
    .addSubMenu(ui.createMenu('Tools')
      .addItem('Number new rows + fill formulas', 'menuAssignIds')
      .addItem('Post opening stock (OpeningStock tab)', 'menuOpeningStock')
      .addItem('Refresh statuses', 'menuRefresh')
      .addItem('PDF sample set (test data → PDF/_Samples)', 'menuPdfSamples')
      .addItem('Upgrade sheet for O3 (run once)', 'menuUpgradeO3')
      .addItem('Run self-test', 'uiMenuSelfTest'))
    .addToUi();
}
function uiOpen_(screen, wide) {
  var out = HtmlService.createHtmlOutput(uiHtml_(screen)).setTitle('Core Access');
  if (wide) SpreadsheetApp.getUi().showModelessDialog(out.setWidth(980).setHeight(700), 'Core Access');
  else SpreadsheetApp.getUi().showSidebar(out);
}
function uiOpenHome() { uiOpen_('home'); }
function uiOpenWide() { uiOpen_('home', true); }
function uiOpenQuote() { uiOpen_('quote'); }
function uiOpenQuotes() { uiOpen_('quotes'); }
function uiOpenJob() { uiOpen_('job'); }
function uiOpenCustomer() { uiOpen_('customer'); }
function uiOpenChallan() { uiOpen_('challan'); }
function uiOpenReturn() { uiOpen_('return'); }
function uiOpenPost() { uiOpen_('post'); }
function uiOpenBilling() { uiOpen_('billing'); }
function uiOpenPayment() { uiOpen_('payment'); }
function uiOpenPO() { uiOpen_('po'); }
function uiOpenReceive() { uiOpen_('receive'); }
function uiOpenExpense() { uiOpen_('expense'); }
function uiOpenPdf() { uiOpen_('pdf'); }
function uiMenuSelfTest() {
  var parts = [selfTest(), typeof selfTestPdf === 'function' ? selfTestPdf() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_PDF.gs not installed'] }, selfTestUi()];
  var p = sum(parts, function (x) { return x.pass; }), f = sum(parts, function (x) { return x.fail; });
  var fails = [].concat.apply([], parts.map(function (x) { return x.log; })).filter(function (l) { return /^FAIL/.test(l); });
  SpreadsheetApp.getUi().alert('Self-test', p + ' passed, ' + f + ' failed  (core ' + parts[0].pass + ' · PDF ' + parts[1].pass + ' · panels ' + parts[2].pass + ')\n\n' + fails.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}

// ======================================================================= server API (called from the panel)
function uiInit() { return uiRun_(function (db) { return uiInitDb_(db); }, true); }
function uiGet(kind, arg) { return uiRun_(function (db) { return uiGetDb_(db, kind, arg); }, true); }
function uiDo(action, args) { return uiRun_(function (db) { return uiDoDb_(db, action, args || {}); }); }
function uiRun_(fn, readOnly) {
  if (readOnly) return uiClean_(fn(new SheetDb()));
  return uiClean_(withLock(function () { var r = fn(new SheetDb()); SpreadsheetApp.flush(); return r; }));
}
// Dates → 'yyyy-mm-dd' (the panel cannot receive Date objects); row numbers dropped.
function uiClean_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.getFullYear() + '-' + pad(v.getMonth() + 1, 2) + '-' + pad(v.getDate(), 2);
  if (Array.isArray(v)) return v.map(uiClean_);
  if (v && typeof v === 'object') { var o = {}; Object.keys(v).forEach(function (k) { if (k !== '_r' && typeof v[k] !== 'function') o[k] = uiClean_(v[k]); }); return o; }
  return v === undefined ? '' : v;
}
function uiDate_(v) {
  if (blank(v)) return today();
  var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : toDate(v);
}
function uiPct_(v, def) {
  if (blank(v)) return num(def);
  var n = num(v);
  return String(v).indexOf('%') >= 0 ? n : (n > 1 ? n / 100 : n);
}
var UI_LISTS_DEFAULT_ = {
  QuoteType: ['Sale', 'Rental', 'Project', 'Service'], HireBasis: ['Item', 'm²', 'm³', 'Set', 'Lump sum'], JobStatus: ['Awaiting order', 'Mobilising', 'On hire', 'Off-hire', 'Closed'],
  VOStatus: ['Draft', 'Sent', 'Approved', 'Rejected'], OffHireScope: ['Full', 'Partial'], ChallanKind: ['Delivery', 'Return', 'Transfer', 'Sale'],
  PayMethod: PAY_METHODS, ExpenseCategory: ['Transport', 'Labour', 'Fuel', 'Site expenses', 'Repairs', 'Office', 'Utilities', 'Other'],
  Unit: ['pc', 'set', 'm', 'm²', 'm³', 'kg', 'trip', 'lot', 'visit', 'day'], SecDepStatus: ['None', 'Held', 'Returned'],
};
function uiLists_(db) {
  var out = {};
  Object.keys(UI_LISTS_DEFAULT_).forEach(function (k) { out[k] = UI_LISTS_DEFAULT_[k].slice(); });
  if (db.hasTab('Lists') && db.ss) {
    var v = db.sheet('Lists').getDataRange().getValues(), h = v[0];
    h.forEach(function (k, j) { if (out[k]) out[k] = v.slice(1).map(function (r) { return r[j]; }).filter(function (x) { return !blank(x); }).map(String); });
  }
  out.PayMethod = out.PayMethod.filter(function (m) { return PAY_METHODS.indexOf(m) >= 0; }); // no cash, ever
  return out;
}
function uiList_(db, k) { return uiLists_(db)[k] || []; }
function uiInList_(db, k, v, what) { if (!blank(v) && uiList_(db, k).indexOf(String(v)) < 0) throw new Error(what + ' "' + v + '" is not in Lists › ' + k); }
function uiStaff_(db, id) { if (!blank(id)) must(db, 'Staff', 'StaffID', id); return id || ''; }
// Whole-row write (one call per row on the sheet); calculated columns get their formula again.
// The row is rewritten from the cache, where Sheets has already dropped the text mark ', so text starting with = + - @ gets it back.
function uiCell_(v) { v = cellVal_(v); return typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v; }
function uiPutRow_(db, t, o, patch) {
  if (!db.ss) { db.update(t, o, patch); return; }
  var h = db.headers(t), calc = CALC[t] || {};
  Object.keys(patch).forEach(function (k) { if (h.indexOf(k) < 0) throw new Error(t + ': no column ' + k); o[k] = patch[k]; });
  db.sheet(t).getRange(o._r, 1, 1, h.length).setValues([h.map(function (k) { return calc[k] ? resolveF(db, t, calc[k], o._r) : uiCell_(o[k]); })]);
}
function uiDelRows_(db, t, rows) {
  if (!rows.length) return;
  if (db.ss) { var s = db.sheet(t); rows.map(function (r) { return r._r; }).sort(function (a, b) { return b - a; }).forEach(function (r) { s.deleteRow(r); }); db.c[t] = null; return; }
  var all = db.rows(t); rows.forEach(function (r) { var i = all.indexOf(r); if (i >= 0) all.splice(i, 1); });
}

function uiInitDb_(db) {
  var ok = function (k) { return function (r) { return !blank(r[k]); }; };
  var dmg = {}; db.rows('Damage').forEach(function (d) { if (d.Status === 'Open' && blank(d.DNNo)) dmg[d.JobNo] = (dmg[d.JobNo] || 0) + 1; });
  var ms = {}; db.rows('Milestones').forEach(function (m) { if (m.Status !== 'Cancelled') ms[m.QuoteNo] = 1; });
  var cust = {}; db.rows('Customers').forEach(function (c) { cust[c.CustID] = c.Name; });
  return {
    version: CAE_UI_VERSION, user: user_(), today: today(), lists: uiLists_(db),
    settings: { VATPct: num(S(db, 'VATPct', 0.15)), AdvancePct: num(S(db, 'AdvancePct', 0.5)), MinHireMonths: num(S(db, 'MinHireMonths', 1)), MilestoneStages: S(db, 'MilestoneStages', 'Erection complete:40|Mid-way:30|Dismantling complete:30') },
    customers: db.rows('Customers').filter(ok('CustID')).map(function (c) { return { id: c.CustID, name: c.Name, status: c.Status }; }),
    sites: db.rows('Sites').filter(ok('SiteID')).map(function (s) { return { id: s.SiteID, cust: s.CustID, name: s.Project || s.Address || s.SiteID, loc: s.LocID }; }),
    suppliers: db.rows('Suppliers').filter(ok('SupID')).map(function (s) { return { id: s.SupID, name: s.Name }; }),
    staff: db.rows('Staff').filter(ok('StaffID')).map(function (s) { return { id: s.StaffID, name: s.Name }; }),
    items: db.rows('Items').filter(ok('ItemCode')).filter(function (i) { return i.Status !== 'Inactive'; }).map(function (i) {
      return { code: i.ItemCode, name: i.Name, unit: i.Unit, stock: i.StockTracked === 'Yes', sale: num(i.SalePrice), hire: num(i.HireRateMonth), forHire: i.ForHire === 'Yes', kg: num(i.WeightKg) };
    }),
    locations: db.rows('Locations').filter(ok('LocID')).map(function (l) { return { id: l.LocID, name: l.Name, type: l.Type, site: l.SiteID }; }),
    quotes: db.rows('Quotes').filter(ok('QuoteNo')).map(function (q) {
      var t = quoteTotals(db, q.QuoteNo);
      return { no: q.QuoteNo, rev: num(q.Rev), type: q.QuoteType, date: q.QuoteDate, cust: q.CustID, custName: cust[q.CustID] || q.CustID, status: q.Status, total: t.total, ms: !!ms[q.QuoteNo] };
    }).reverse(),
    jobs: db.rows('Jobs').filter(ok('JobNo')).map(function (j) {
      return { no: j.JobNo, quote: j.QuoteNo, cust: j.CustID, custName: cust[j.CustID] || j.CustID, site: j.SiteID, type: j.JobType, basis: j.HireBasis, status: j.Status, dmg: dmg[j.JobNo] || 0, ms: !!ms[j.QuoteNo] };
    }).reverse(),
  };
}

function uiGetDb_(db, kind, a) {
  var items = db.rows('Items'), nm = function (code) { var i = find(items, 'ItemCode', code); return i ? i.Name : code; };
  if (kind === 'quote') {
    var q = must(db, 'Quotes', 'QuoteNo', a), job = find(db.rows('Jobs'), 'QuoteNo', a);
    var lines = db.rows('QuoteLines').filter(function (l) { return String(l.QuoteNo) === String(a); }).sort(function (x, y) { return num(x.LineNo) - num(y.LineNo); });
    var hasMs = lines.some(function (l) { return isMilestone(l) && l.Selected === 'Yes'; });
    return {
      header: q, lines: lines, totals: quoteTotals(db, a), job: job ? { no: job.JobNo, status: job.Status } : null,
      pis: db.rows('Proformas').filter(function (p) { return p.QuoteNo === a; }).map(function (p) { return { no: p.PINo, date: p.PIDate, amount: num(p.Amount), status: p.Status, balance: docInfo(db, 'PI', p.PINo).balance }; }),
      hasMs: hasMs, msBase: hasMs ? milestoneBase(db, a) : 0,
      milestones: milestoneAmounts(db, a).map(function (x) { return { stageNo: x.row.StageNo, stage: x.row.Stage, pct: num(x.row.Pct), amount: x.amount, status: x.row.Status }; }),
    };
  }
  if (kind === 'job') {
    var j = must(db, 'Jobs', 'JobNo', a), oh = onHire(db, a), q2 = find(db.rows('Quotes'), 'QuoteNo', j.QuoteNo);
    return {
      job: j, quote: q2 ? { no: q2.QuoteNo, total: quoteTotals(db, q2.QuoteNo).total, status: q2.Status } : null,
      onHire: Object.keys(oh).filter(function (k) { return oh[k] > 1e-9; }).map(function (k) { return { code: k, name: nm(k), qty: oh[k] }; }),
      challans: db.rows('Challans').filter(function (c) { return c.JobNo === a; }).map(function (c) { return { no: c.ChallanNo, kind: c.Kind, date: c.ChallanDate, status: c.Status }; }),
      invoices: db.rows('Invoices').filter(function (i) { return i.JobNo === a; }).map(function (i) { var x = i.Status === 'Cancelled' ? { total: 0, balance: 0 } : docInfo(db, 'INV', i.InvNo); return { no: i.InvNo, kind: i.Kind, date: i.InvDate, due: x.total, balance: x.balance, status: i.Status }; }),
      milestones: j.QuoteNo ? milestoneAmounts(db, j.QuoteNo).map(function (x) { return { stageNo: x.row.StageNo, stage: x.row.Stage, pct: num(x.row.Pct), amount: x.amount, status: x.row.Status, reached: x.row.ReachedDate, inv: x.row.InvNo }; }) : [],
      variations: db.rows('Variations').filter(function (v) { return v.JobNo === a; }).map(function (v) { return { no: v.VONo, date: v.VODate, desc: v.Description, amount: num(v.Amount), status: v.Status }; }),
      offHire: db.rows('OffHire').filter(function (o) { return o.JobNo === a; }).map(function (o) { return { no: o.OHNNo, notice: o.NoticeDate, date: o.OffHireDate, scope: o.Scope }; }),
      damage: db.rows('Damage').filter(function (d) { return d.JobNo === a && d.Status === 'Open' && blank(d.DNNo); }).map(function (d) { return { code: d.ItemCode, name: nm(d.ItemCode), damaged: num(d.QtyDamaged), lost: num(d.QtyLost), challan: d.ChallanNo }; }),
      advanceLeft: unadjustedAdvance(db, j),
      hireStart: (function () { var d = hireStartDay(db, a); return d == null ? '' : fromDay(d); })(),
    };
  }
  if (kind === 'stock') { // qty per item at one location
    var m = stockMap(db), out = {};
    Object.keys(m).forEach(function (k) { var p = k.split('|'); if (p[1] === a && Math.abs(m[k]) > 1e-9) out[p[0]] = m[k]; });
    return out;
  }
  if (kind === 'challans') {
    var cnt = {}; db.rows('ChallanLines').forEach(function (l) { cnt[l.ChallanNo] = (cnt[l.ChallanNo] || 0) + 1; });
    var all = db.rows('Challans').filter(function (c) { return !blank(c.ChallanNo); }).map(function (c) { return { no: c.ChallanNo, kind: c.Kind, date: c.ChallanDate, job: c.JobNo, status: c.Status, lines: cnt[c.ChallanNo] || 0, pdf: c.PDF || '' }; }).reverse();
    return { drafts: all.filter(function (c) { return c.status === 'Draft'; }), posted: all.filter(function (c) { return c.status === 'Posted'; }).slice(0, 15) };
  }
  if (kind === 'pos') {
    return db.rows('POs').filter(function (p) { return !blank(p.PONo) && ['Received', 'Closed', 'Cancelled'].indexOf(p.Status) < 0; }).map(function (p) {
      var s = find(db.rows('Suppliers'), 'SupID', p.SupID); return { no: p.PONo, sup: s ? s.Name : p.SupID, date: p.PODate, status: p.Status };
    }).reverse();
  }
  if (kind === 'po') {
    var po = must(db, 'POs', 'PONo', a), got = {};
    db.rows('StockMoves').forEach(function (v) { if (v.RefType === 'PO' && v.RefNo === a) got[v.ItemCode] = (got[v.ItemCode] || 0) + num(v.Qty); });
    var ord = {}; db.rows('POLines').forEach(function (l) { if (l.PONo !== a) return; var it = find(items, 'ItemCode', l.ItemCode); if (it && it.StockTracked === 'Yes') ord[l.ItemCode] = (ord[l.ItemCode] || 0) + num(l.Qty); });
    return { po: po, lines: Object.keys(ord).map(function (k) { return { code: k, name: nm(k), ordered: ord[k], received: got[k] || 0, open: Math.max(0, ord[k] - (got[k] || 0)) }; }) };
  }
  if (kind === 'open') { // a = { partyType, partyId }
    var pays = db.rows('Payments').filter(function (p) { return p.PartyID === a.partyId && !blank(p.PayID); }).map(function (p) {
      return { id: p.PayID, date: p.PayDate, method: p.Method, ref: p.RefNo, amount: num(p.Amount), avail: payAvailable(db, p), cheque: p.ChequeStatus };
    }).filter(function (p) { return p.avail > 0.005 || p.cheque === 'Pending'; }).reverse();
    return { docs: openDocs(db, a.partyType, a.partyId).map(function (d) { return { type: d.type, no: d.no, balance: d.balance, date: blank(d.date) ? '' : fromDay(d.date) }; }), payments: pays };
  }
  if (kind === 'docs') {
    var L = function (t, key, lab) { return db.rows(t).filter(function (r) { return !blank(r[key]); }).map(function (r) { return [r[key], lab(r), r.Status || '']; }).reverse().slice(0, 60); };
    var cn = function (id) { var c = find(db.rows('Customers'), 'CustID', id) || find(db.rows('Suppliers'), 'SupID', id); return c ? c.Name : (id || ''); };
    return {
      Quote: L('Quotes', 'QuoteNo', function (r) { return r.QuoteNo + (num(r.Rev) ? ' Rev ' + num(r.Rev) : '') + ' · ' + cn(r.CustID) + ' · ' + r.QuoteType; }),
      PI: L('Proformas', 'PINo', function (r) { return r.PINo + ' · ' + cn(r.CustID) + ' · Tk ' + num(r.Amount); }),
      Invoice: L('Invoices', 'InvNo', function (r) { return r.InvNo + ' · ' + cn(r.CustID) + ' · ' + r.Kind; }),
      Challan: L('Challans', 'ChallanNo', function (r) { return r.ChallanNo + ' · ' + r.Kind + ' · ' + r.JobNo; }),
      PO: L('POs', 'PONo', function (r) { return r.PONo + ' · ' + cn(r.SupID); }),
      Note: L('Notes', 'NoteNo', function (r) { return r.NoteNo + ' · ' + cn(r.CustID) + ' · ' + r.Kind; }),
    };
  }
  throw new Error('Unknown lookup ' + kind);
}

function uiDoDb_(db, action, a) {
  var f = UI_ACTIONS_[action];
  if (!f) throw new Error('Unknown action ' + action);
  var r = f(db, a);
  return typeof r === 'string' ? { msg: r } : r;
}
function uiPdfLinks_(r) { return [{ label: 'Open PDF', url: r.url }].concat(r.doc ? [{ label: 'Editable Google Doc', url: r.doc }] : []); }
var UI_ACTIONS_ = {
  saveCustomer: function (db, a) { return uiSaveCustomer_(db, a); },
  saveSite: function (db, a) { var id = uiSaveSite_(db, a); return { msg: 'Site ' + id + ' added.', ref: id }; },
  saveQuote: function (db, a) { return uiSaveQuote_(db, a); },
  reviseQuote: function (db, a) { return uiReviseQuote_(db, a); },
  setStatus: function (db, a) { return uiSetStatus_(db, a); },
  quoteToPI: function (db, a) { var no = quoteToPI(db, a.quoteNo, { amount: blank(a.amount) ? undefined : num(a.amount), date: uiDate_(a.date) }); return { msg: 'Proforma ' + no + ' created (Draft).', ref: no }; },
  quoteToJob: function (db, a) {
    var no = quoteToJob(db, a.quoteNo, { woNo: a.woNo, woDate: blank(a.woDate) ? '' : uiDate_(a.woDate), pm: uiStaff_(db, a.pm), hireBasis: a.hireBasis || '', date: uiDate_(a.date) });
    return { msg: 'Job ' + no + ' created; quote marked Accepted.', ref: no };
  },
  setMilestones: function (db, a) { return setMilestones(db, a.quoteNo, a.stages && a.stages.length ? a.stages : null) + ' stages saved for ' + a.quoteNo + '.'; },
  saveJob: function (db, a) { return uiSaveJob_(db, a); },
  offHire: function (db, a) { return uiOffHire_(db, a); },
  saveVariation: function (db, a) { return uiSaveVariation_(db, a); },
  setVariation: function (db, a) { var v = must(db, 'Variations', 'VONo', a.voNo); uiInList_(db, 'VOStatus', a.status, 'Status'); uiPutRow_(db, 'Variations', v, { Status: a.status }); log_(db, 'Variation ' + a.status, a.voNo, v.JobNo); return a.voNo + ' → ' + a.status + '.'; },
  saveChallan: function (db, a) { return uiSaveChallan_(db, a); },
  postChallan: function (db, a) { var r = postChallan(db, a.no); return { msg: a.no + ' posted: ' + r.moves + ' stock moves' + (r.damage ? ', ' + r.damage + ' damage/loss rows (raise the debit note under Billing)' : '') + '.', ref: a.no }; },
  cancelChallan: function (db, a) { cancelChallan(db, a.no); return a.no + ' cancelled (stock reversed if it was posted).'; },
  hireBilling: function (db, a) {
    var r = runHireBilling(db, uiDate_(a.asOf), { jobNo: a.jobNo || '' });
    return { msg: r.invoices.length + ' hire invoice(s)' + (r.invoices.length ? ': ' + r.invoices.map(function (i) { return i.no + ' Tk ' + tk(i.total); }).join(', ') : '') + (r.warnings.length ? '\n\nWarnings:\n' + r.warnings.join('\n') : ''), warn: r.warnings.length > 0, refs: r.invoices.map(function (i) { return i.no; }) };
  },
  invoiceFromQuote: function (db, a) { var r = invoiceFromQuote(db, a.jobNo, { date: uiDate_(a.date) }); return { msg: r.no + ' created: Tk ' + tk(r.total) + (r.advance ? ' (advance adjusted ' + tk(r.advance) + ')' : '') + '.', ref: r.no, refs: [r.no] }; },
  reachMilestone: function (db, a) { var s = reachMilestone(db, a.jobNo, num(a.stageNo), uiDate_(a.date)); return 'Stage ' + a.stageNo + ' (' + s + ') marked reached.'; },
  invoiceMilestones: function (db, a) { var r = invoiceMilestones(db, a.jobNo, { date: uiDate_(a.date) }); return { msg: r.no + ' created: Tk ' + tk(r.total) + (r.advance ? ' (advance adjusted ' + tk(r.advance) + ')' : '') + '.', ref: r.no, refs: [r.no] }; },
  damageDN: function (db, a) { var no = damageToDebitNote(db, a.jobNo, { date: uiDate_(a.date), invNo: a.invNo || '' }); return { msg: 'Debit note ' + no + ' created.', ref: no }; },
  recordPayment: function (db, a) { return uiRecordPayment_(db, a); },
  allocate: function (db, a) { var l = allocatePayment(db, a.payId, a.allocations && a.allocations.length ? a.allocations : null); return l.length ? a.payId + ' allocated: ' + l.map(function (x) { return x.no + ' ' + tk(x.amt); }).join(', ') : 'Nothing open to allocate.'; },
  chequeCleared: function (db, a) { chequeCleared(db, a.payId); return a.payId + ': cheque cleared.'; },
  chequeDishonoured: function (db, a) { chequeDishonoured(db, a.payId); return a.payId + ': dishonoured — allocations reversed, documents re-opened.'; },
  savePO: function (db, a) { return uiSavePO_(db, a); },
  receivePO: function (db, a) {
    var lines = (a.lines || []).filter(function (l) { return num(l.qty) > 0; }).map(function (l) { return { itemCode: l.itemCode, qty: num(l.qty) }; });
    if (!lines.length) throw new Error('Enter a quantity to receive');
    return a.poNo + ': ' + receivePO(db, a.poNo, lines, uiDate_(a.date)) + ' — ' + lines.map(function (l) { return l.itemCode + ' ' + l.qty; }).join(', ') + ' into stock.';
  },
  saveExpense: function (db, a) { return uiSaveExpense_(db, a); },
  pdf: function (db, a) {
    var r = makePdf(db, a.what, a.no);
    return { msg: r.file + ' saved.' + (r.placeholders ? '\n' + r.placeholders + ' [placeholder] text(s) still to fill (shown in teal).' : ''), warn: r.placeholders > 0, links: uiPdfLinks_(r) };
  },
};

// ======================================================================= actions added in O4
function uiSaveCustomer_(db, a) {
  var name = String(a.name || '').trim();
  if (!name) throw new Error('Customer name is needed');
  if (db.rows('Customers').some(function (c) { return String(c.Name).trim().toLowerCase() === name.toLowerCase(); })) throw new Error('A customer named "' + name + '" already exists');
  var id = nextId(db, 'CUST');
  db.insert('Customers', { CustID: id, Name: name, BIN: a.bin || '', Address: a.address || '', ContactPerson: a.contact || '', Phone: a.phone || '', Email: a.email || '', PaymentDays: blank(a.paymentDays) ? num(S(db, 'PaymentDaysDefault', 7)) : num(a.paymentDays), Status: 'Active', Notes: a.notes || '' });
  log_(db, 'Customer added', id, name);
  var site = blank(a.siteProject) ? '' : uiSaveSite_(db, { custId: id, project: a.siteProject, address: a.siteAddress });
  return { msg: 'Customer ' + id + ' added' + (site ? ' with site ' + site : '') + '.', ref: id, site: site };
}
function uiSaveSite_(db, a) {
  must(db, 'Customers', 'CustID', a.custId);
  if (blank(a.project)) throw new Error('Site / project name is needed');
  var id = nextId(db, 'SITE'), s = { SiteID: id, CustID: a.custId, Project: String(a.project).trim(), Address: a.address || '', SiteRep: a.siteRep || '', SiteRepPhone: a.siteRepPhone || '', Status: 'Planned' };
  db.insert('Sites', s);
  ensureSiteLoc(db, s);
  log_(db, 'Site added', id, a.custId + ' · ' + s.Project);
  return id;
}
var UI_BILLING_ = ['', 'One-off', 'Monthly', 'Milestone'];
function uiQuoteLines_(db, lines, type) {
  var units = uiList_(db, 'Unit');
  if (!lines || !lines.length) throw new Error('Add at least one line');
  return lines.map(function (l, i) {
    var n = 'Line ' + (i + 1) + ': ', it = blank(l.ItemCode) ? null : must(db, 'Items', 'ItemCode', l.ItemCode);
    var desc = String(l.Description || '').trim() || (it ? it.Name : ''), unit = blank(l.Unit) ? (it ? it.Unit : '') : l.Unit, bill = l.Billing || '';
    if (!desc) throw new Error(n + 'description is needed');
    if (unit && units.indexOf(String(unit)) < 0) throw new Error(n + 'unit "' + unit + '" is not in Lists › Unit');
    if (!(num(l.Qty) > 0)) throw new Error(n + 'quantity must be more than 0');
    if (num(l.Rate) < 0) throw new Error(n + 'rate cannot be negative');
    if (UI_BILLING_.indexOf(bill) < 0) throw new Error(n + 'billing must be One-off, Monthly or Milestone');
    if (bill === 'Monthly' && !(num(l.Months) > 0)) throw new Error(n + 'a Monthly line needs months');
    if (bill === 'Milestone' && num(l.Months) > 0) throw new Error(n + 'a Milestone line is a lump sum — leave months blank');
    if (bill === 'Milestone' && type === 'Sale') throw new Error(n + 'milestone billing is for Project / Service / Rental quotes');
    var opt = l.Optional === 'Yes' ? 'Yes' : 'No';
    return { LineNo: i + 1, ItemCode: l.ItemCode || '', Description: desc, Unit: unit || '', Qty: num(l.Qty), Months: blank(l.Months) || num(l.Months) === 0 ? '' : num(l.Months), Billing: bill, Rate: num(l.Rate), Optional: opt, Selected: opt === 'Yes' ? (l.Selected === 'Yes' ? 'Yes' : 'No') : 'Yes' };
  });
}
// a = { quoteNo (blank = new), header: { QuoteType, QuoteDate, CustID, SiteID, Attention, Subject, YourRef, HireMonths, MinMonths, AdvancePct, VATPct, PreparedBy, Notes }, lines: [...] }
function uiSaveQuote_(db, a) {
  var h = a.header || {}, type = h.QuoteType, hire = type === 'Rental' || type === 'Project';
  if (UI_LISTS_DEFAULT_.QuoteType.indexOf(type) < 0) throw new Error('Choose the quote type');
  must(db, 'Customers', 'CustID', h.CustID);
  if (!blank(h.SiteID) && must(db, 'Sites', 'SiteID', h.SiteID).CustID !== h.CustID) throw new Error('Site ' + h.SiteID + ' belongs to another customer');
  var lines = uiQuoteLines_(db, a.lines, type), date = uiDate_(h.QuoteDate), no = a.quoteNo;
  var hdr = {
    QuoteType: type, QuoteDate: date, CustID: h.CustID, SiteID: h.SiteID || '', Attention: h.Attention || '', Subject: h.Subject || '', YourRef: h.YourRef || '',
    HireMonths: blank(h.HireMonths) ? '' : num(h.HireMonths), MinMonths: hire ? (blank(h.MinMonths) ? num(S(db, 'MinHireMonths', 1)) : num(h.MinMonths)) : '',
    AdvancePct: uiPct_(h.AdvancePct, S(db, 'AdvancePct', 0.5)), VATPct: uiPct_(h.VATPct, S(db, 'VATPct', 0.15)), PreparedBy: uiStaff_(db, h.PreparedBy), Notes: h.Notes || '',
  };
  if (no) {
    var q = must(db, 'Quotes', 'QuoteNo', no), job = find(db.rows('Jobs'), 'QuoteNo', no);
    if (job) throw new Error(no + ' already has job ' + job.JobNo + ' — change it by a variation on the job');
    if (['Draft', 'Sent'].indexOf(q.Status) < 0) throw new Error(no + ' is ' + q.Status + ' — use Revise to reopen it');
    if (milestoneRows(db, no).some(function (m) { return m.Status !== 'Pending'; })) throw new Error(no + ': a milestone is already reached');
    uiPutRow_(db, 'Quotes', q, hdr);
  } else {
    no = nextId(db, 'Q', date); hdr.QuoteNo = no; hdr.Rev = 0; hdr.Status = 'Draft';
    db.insert('Quotes', hdr);
  }
  var old = db.rows('QuoteLines').filter(function (l) { return String(l.QuoteNo) === String(no); }).sort(function (x, y) { return num(x.LineNo) - num(y.LineNo); });
  var ids = lines.length > old.length ? nextIds(db, 'QL', lines.length - old.length) : [], add = [];
  lines.forEach(function (l, i) { if (i < old.length) uiPutRow_(db, 'QuoteLines', old[i], l); else { l.LineID = ids[i - old.length]; l.QuoteNo = no; add.push(l); } });
  if (add.length) db.insert('QuoteLines', add);
  uiDelRows_(db, 'QuoteLines', old.slice(lines.length));
  var t = quoteTotals(db, no);
  log_(db, a.quoteNo ? 'Quote saved' : 'Quote created', no, lines.length + ' lines · Tk ' + t.total);
  return { msg: no + (a.quoteNo ? ' saved' : ' created') + ': ' + lines.length + ' line(s), total Tk ' + tk(t.total) + (t.advance ? ', advance Tk ' + tk(t.advance) : '') + '.', ref: no, totals: t };
}
function uiReviseQuote_(db, a) {
  var q = must(db, 'Quotes', 'QuoteNo', a.quoteNo), job = find(db.rows('Jobs'), 'QuoteNo', a.quoteNo);
  if (job) throw new Error(a.quoteNo + ' already has job ' + job.JobNo + ' — use a variation instead');
  var rev = num(q.Rev) + 1;
  uiPutRow_(db, 'Quotes', q, { Rev: rev, Status: 'Draft', QuoteDate: uiDate_(a.date) });
  log_(db, 'Quote revised', a.quoteNo, 'Rev ' + rev);
  return { msg: a.quoteNo + ' is now Rev ' + rev + ' (Draft, dated today). Edit, save, then make the PDF — the old PDF stays as it was.', ref: a.quoteNo };
}
var UI_STATUS_ = { Quote: ['Quotes', 'QuoteNo', ['Sent', 'Lost']], PI: ['Proformas', 'PINo', ['Sent', 'Cancelled']], INV: ['Invoices', 'InvNo', ['Sent']], PO: ['POs', 'PONo', ['Sent', 'Cancelled', 'Closed']], Note: ['Notes', 'NoteNo', ['Sent']] };
function uiSetStatus_(db, a) {
  var c = UI_STATUS_[a.type]; if (!c) throw new Error('Unknown document type ' + a.type);
  if (c[2].indexOf(a.status) < 0) throw new Error(a.type + ' cannot be set to ' + a.status + ' here');
  var r = must(db, c[0], c[1], a.no), st = r.Status;
  if (a.status === 'Sent' && ['Draft', 'Sent', ''].indexOf(st) < 0) throw new Error(a.no + ' is ' + st);
  if (a.status === 'Cancelled') {
    if (a.type === 'PI' && docInfo(db, 'PI', a.no).paid > 0.005) throw new Error(a.no + ' has payments allocated');
    if (a.type === 'PO' && db.rows('StockMoves').some(function (v) { return v.RefType === 'PO' && v.RefNo === a.no; })) throw new Error(a.no + ' has goods received — close it instead');
  }
  if (a.type === 'Quote' && a.status === 'Lost' && find(db.rows('Jobs'), 'QuoteNo', a.no)) throw new Error(a.no + ' has a job');
  uiPutRow_(db, c[0], r, { Status: a.status });
  log_(db, 'Status ' + a.status, a.no, a.type + (st ? ' (was ' + st + ')' : ''));
  return a.no + ' → ' + a.status + '.';
}
function uiSaveJob_(db, a) {
  var j = must(db, 'Jobs', 'JobNo', a.jobNo), p = {};
  if (a.ClientWONo !== undefined) p.ClientWONo = a.ClientWONo || '';
  if (a.ClientWODate !== undefined) p.ClientWODate = blank(a.ClientWODate) ? '' : uiDate_(a.ClientWODate);
  if (a.PM !== undefined) p.PM = uiStaff_(db, a.PM);
  if (a.SecDepAmount !== undefined) p.SecDepAmount = blank(a.SecDepAmount) ? '' : num(a.SecDepAmount);
  if (a.SecDepChequeNo !== undefined) p.SecDepChequeNo = a.SecDepChequeNo || '';
  if (a.SecDepStatus !== undefined) { uiInList_(db, 'SecDepStatus', a.SecDepStatus, 'Security deposit status'); p.SecDepStatus = a.SecDepStatus || 'None'; }
  if (a.Status !== undefined && a.Status !== j.Status) { uiInList_(db, 'JobStatus', a.Status, 'Job status'); p.Status = a.Status; }
  if (a.Notes !== undefined) p.Notes = a.Notes || '';
  uiPutRow_(db, 'Jobs', j, p);
  log_(db, 'Job updated', a.jobNo, Object.keys(p).join(', '));
  return a.jobNo + ' saved.';
}
function uiOffHire_(db, a) {
  var j = must(db, 'Jobs', 'JobNo', a.jobNo), scope = a.scope || 'Full';
  if (['Full', 'Partial'].indexOf(scope) < 0) throw new Error('Scope must be Full or Partial');
  var nd = uiDate_(a.noticeDate), od = blank(a.offHireDate) ? '' : uiDate_(a.offHireDate);
  if (od && dayNum(od) < dayNum(nd)) throw new Error('Off-hire date is before the notice date');
  var no = nextId(db, 'OHN', nd);
  db.insert('OffHire', { OHNNo: no, JobNo: j.JobNo, NoticeDate: nd, OffHireDate: od, Scope: scope, Notes: a.notes || '' });
  log_(db, 'Off-hire notice', no, j.JobNo + ' · ' + scope);
  var hint = scope === 'Partial' ? (j.HireBasis === 'Item' ? ' Return the items on a Return challan; billing follows the challans.' : ' For a Project job, also raise a negative variation for the part taken off hire.')
    : (j.HireBasis === 'Item' ? ' Hire ends when the last Return challan is posted.' : ' Hire ends at the later of the off-hire date and notice + ' + num(S(db, 'OffHireNoticeDays', 7)) + ' days; then run hire billing for the final invoice.');
  return { msg: 'Off-hire notice ' + no + ' recorded.' + hint, ref: no };
}
function uiSaveVariation_(db, a) {
  must(db, 'Jobs', 'JobNo', a.jobNo);
  if (blank(a.description)) throw new Error('Describe the variation');
  if (!num(a.amount)) throw new Error('Amount is needed (negative for an omission)');
  var st = a.status || 'Draft'; uiInList_(db, 'VOStatus', st, 'Status');
  var d = uiDate_(a.date), no = nextId(db, 'VO', d);
  db.insert('Variations', { VONo: no, JobNo: a.jobNo, VODate: d, Description: a.description, Amount: num(a.amount), Status: st, ClientRef: a.clientRef || '' });
  log_(db, 'Variation', no, a.jobNo + ' · Tk ' + num(a.amount) + ' · ' + st);
  return { msg: 'Variation ' + no + ' saved (' + st + ')' + (st === 'Approved' ? ' — it goes on the next invoice for the job.' : '.'), ref: no };
}
// a = { kind, jobNo, date, fromLoc, toLoc, vehicle, driver, receivedBy, notes, post, lines: [{ itemCode, qty, qtyDamaged, qtyLost, remarks }] }
function uiSaveChallan_(db, a) {
  var lines = (a.lines || []).filter(function (l) { return !blank(l.itemCode) && num(l.qty) > 0; });
  if (!lines.length) throw new Error('Add at least one item with a quantity');
  lines.forEach(function (l) { must(db, 'Items', 'ItemCode', l.itemCode); if (num(l.qtyDamaged) + num(l.qtyLost) > num(l.qty)) throw new Error(l.itemCode + ': damaged + lost is more than the quantity'); });
  var no = createChallan(db, { kind: a.kind, jobNo: a.jobNo, date: uiDate_(a.date), fromLoc: a.fromLoc || '', toLoc: a.toLoc || '', vehicle: a.vehicle, driver: a.driver, receivedBy: a.receivedBy, notes: a.notes, lines: lines });
  if (!a.post) return { msg: no + ' saved as Draft (' + lines.length + ' line(s)). Post it when the goods leave / arrive.', ref: no };
  try { var r = postChallan(db, no); return { msg: no + ' saved and posted: ' + r.moves + ' stock moves' + (r.damage ? ', ' + r.damage + ' damage/loss rows' : '') + '.', ref: no, damage: r.damage }; }
  catch (e) { return { msg: no + ' saved as Draft but NOT posted:\n' + e.message, ref: no, warn: true }; }
}
// a = { Direction, PayDate, PartyType, PartyID, Method, RefNo, Bank, Amount, VDSDeducted, Mushak66Received, Notes, allocations: [{ type, no, amount }] (empty = oldest first) }
function uiRecordPayment_(db, a) {
  var al = (a.allocations || []).filter(function (x) { return num(x.amount) > 0; });
  if (PAY_METHODS.indexOf(a.Method) < 0) throw new Error('Payment method must be: ' + PAY_METHODS.join(', ') + ' (no cash)');
  var cap = num(a.Amount) + (a.Mushak66Received === 'Yes' ? num(a.VDSDeducted) : 0), tot = 0;
  al.forEach(function (x) {
    var d = docInfo(db, x.type, x.no);
    if (d.party !== a.PartyID) throw new Error(x.no + ' belongs to ' + d.party);
    if (num(x.amount) > d.balance + 0.005) throw new Error(x.no + ': only Tk ' + tk(d.balance) + ' open');
    tot += num(x.amount);
  });
  if (tot > cap + 0.005) throw new Error('Allocations Tk ' + tk(tot) + ' are more than the payment Tk ' + tk(cap));
  var id = recordPayment(db, {
    Direction: a.Direction || 'In', PayDate: uiDate_(a.PayDate), PartyType: a.PartyType || (a.Direction === 'Out' ? 'Supplier' : 'Customer'), PartyID: a.PartyID, Method: a.Method,
    RefNo: a.RefNo, Bank: a.Bank, Amount: num(a.Amount), VDSDeducted: num(a.VDSDeducted), Mushak66Received: num(a.VDSDeducted) ? (a.Mushak66Received || 'No') : '', Notes: a.Notes,
  }, { allocations: al.length ? al.map(function (x) { return { type: x.type, no: x.no, amount: num(x.amount) }; }) : undefined });
  var done = db.rows('Allocations').filter(function (x) { return x.PayID === id; }), left = payAvailable(db, must(db, 'Payments', 'PayID', id));
  return { msg: id + ' recorded: Tk ' + tk(num(a.Amount)) + '. ' + (done.length ? 'Allocated to ' + done.map(function (x) { return x.DocNo + ' ' + tk(num(x.Amount)); }).join(', ') + '.' : 'Nothing allocated.') + (left > 0.005 ? ' Tk ' + tk(left) + ' left unallocated.' : ''), ref: id };
}
// a = { SupID, PODate, JobNo, DeliverTo, VATPct, Notes, lines: [{ ItemCode, Description, Unit, Qty, Rate }] }
function uiSavePO_(db, a) {
  must(db, 'Suppliers', 'SupID', a.SupID);
  if (!blank(a.JobNo)) must(db, 'Jobs', 'JobNo', a.JobNo);
  var to = a.DeliverTo || LOC.YARD; if (!locType(db, to)) throw new Error('Unknown delivery location ' + to);
  var units = uiList_(db, 'Unit'), lines = (a.lines || []).filter(function (l) { return !blank(l.ItemCode) || !blank(l.Description); });
  if (!lines.length) throw new Error('Add at least one line');
  lines = lines.map(function (l, i) {
    var it = blank(l.ItemCode) ? null : must(db, 'Items', 'ItemCode', l.ItemCode), u = blank(l.Unit) ? (it ? it.Unit : '') : l.Unit;
    if (u && units.indexOf(String(u)) < 0) throw new Error('Line ' + (i + 1) + ': unit "' + u + '" is not in Lists › Unit');
    if (!(num(l.Qty) > 0)) throw new Error('Line ' + (i + 1) + ': quantity must be more than 0');
    return { ItemCode: l.ItemCode || '', Description: String(l.Description || '').trim() || (it ? it.Name : ''), Unit: u || '', Qty: num(l.Qty), Rate: num(l.Rate) };
  });
  var d = uiDate_(a.PODate), no = nextId(db, 'PO', d), ids = nextIds(db, 'POL', lines.length);
  db.insert('POs', { PONo: no, SupID: a.SupID, PODate: d, JobNo: a.JobNo || '', DeliverTo: to, Status: 'Draft', VATPct: uiPct_(a.VATPct, S(db, 'VATPct', 0.15)), Notes: a.Notes || '' });
  db.insert('POLines', lines.map(function (l, i) { l.LineID = ids[i]; l.PONo = no; return l; }));
  var sub = r2(sum(lines, function (l) { return r2(l.Qty * l.Rate); }));
  log_(db, 'PO created', no, a.SupID + ' · ' + lines.length + ' lines · Tk ' + sub + ' + VAT');
  return { msg: 'PO ' + no + ' created (Draft): ' + lines.length + ' line(s), Tk ' + tk(sub) + ' + VAT.', ref: no };
}
function uiSaveExpense_(db, a) {
  if (PAY_METHODS.indexOf(a.Method) < 0) throw new Error('Method must be: ' + PAY_METHODS.join(', ') + ' (no cash)');
  if (!(num(a.Amount) > 0)) throw new Error('Amount must be more than 0');
  uiInList_(db, 'ExpenseCategory', a.Category, 'Category'); if (blank(a.Category)) throw new Error('Choose a category');
  if (!blank(a.JobNo)) must(db, 'Jobs', 'JobNo', a.JobNo);
  if (blank(a.Payee)) throw new Error('Payee is needed');
  var id = nextId(db, 'EXP');
  db.insert('Expenses', { ExpID: id, ExpDate: uiDate_(a.ExpDate), Category: a.Category, JobNo: a.JobNo || '', Payee: a.Payee, Amount: num(a.Amount), Method: a.Method, RefNo: a.RefNo || '', ApprovedBy: uiStaff_(db, a.ApprovedBy), Notes: a.Notes || '' });
  log_(db, 'Expense', id, a.Category + ' · Tk ' + num(a.Amount) + (a.JobNo ? ' · ' + a.JobNo : ''));
  return { msg: 'Expense ' + id + ' saved: Tk ' + tk(num(a.Amount)) + (a.JobNo ? ' on ' + a.JobNo : '') + '.', ref: id };
}

// ======================================================================= panel HTML
function uiHtml_(screen, arg) {
  return UI_HTML_.replace('"__START__"', JSON.stringify(screen || 'home')).replace('"__ARG__"', JSON.stringify(arg || ''));
}
var UI_HTML_ = `<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8">
<style>
:root{--ink:#2B3036;--teal:#17707D;--line:#D5D8DA;--band:#F3F5F6;--sky:#EAF3F8;--orange:#F26B1D;--red:#C62828;--grey:#5F676E}
*{box-sizing:border-box}body{margin:0;font:12px/1.4 Inter,Arial,sans-serif;color:var(--ink);background:#fff}
header{background:#000;color:#fff;padding:8px 10px;display:flex;align-items:center;gap:8px;position:sticky;top:0;z-index:5}
header b{letter-spacing:.1em;font-size:12px}header .sub{color:#AEB5B9;font-size:11px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
header button{background:none;border:1px solid #666;color:#fff;border-radius:3px;padding:2px 8px;cursor:pointer;font:inherit;font-size:11px}
main{padding:10px 10px 40px}h2{font-size:14px;margin:2px 0 8px}
h3{font-size:11px;margin:14px 0 4px;color:var(--teal);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--line);padding-bottom:2px}
label{display:block;font-size:11px;color:var(--grey);margin:6px 0 2px}
input,select,textarea{width:100%;font:inherit;padding:5px 6px;border:1px solid var(--line);border-radius:3px;background:#fff;color:var(--ink)}
textarea{min-height:44px;resize:vertical}input:focus,select:focus,textarea:focus{outline:2px solid #17707D33;border-color:var(--teal)}
input:disabled,select:disabled{background:var(--band);color:var(--grey)}
.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:0 8px}
.btn{display:inline-block;background:var(--teal);color:#fff;border:1px solid var(--teal);border-radius:3px;padding:6px 10px;margin:8px 6px 0 0;cursor:pointer;font:inherit;font-weight:600}
.btn.s{background:#fff;color:var(--teal)}.btn.d{background:#fff;color:var(--red);border-color:var(--red)}.btn.d.arm{background:var(--red);color:#fff}
.btn.x{padding:2px 7px;margin:2px 4px 2px 0;font-weight:400;font-size:11px}.btn:disabled{opacity:.5;cursor:default}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:6px}
.tile{border:1px solid var(--line);border-left:3px solid var(--teal);border-radius:3px;padding:7px 8px;cursor:pointer;background:#fff}
.tile:hover{background:var(--sky)}.tile b{display:block;font-size:12px}.tile span{font-size:10.5px;color:var(--grey)}
.card{border:1px solid var(--line);border-radius:4px;padding:4px 8px 8px;margin:6px 0;background:var(--band)}
.card .top{display:flex;justify-content:space-between;align-items:center;font-weight:600;font-size:11px;color:var(--grey)}
table{width:100%;border-collapse:collapse;margin:4px 0;font-size:11.5px}th{background:#000;color:#fff;text-align:left;padding:4px;font-weight:600}
td{padding:4px;border-bottom:1px solid var(--line);vertical-align:top}td:has(.chip),td:has(button){white-space:nowrap}tr:nth-child(even) td{background:var(--band)}td input{padding:3px 4px}
.r{text-align:right}.muted{color:var(--grey);font-size:11px}
.chip{display:inline-block;padding:0 6px;border-radius:9px;font-size:10.5px;background:#E4E6E8;white-space:nowrap}
.chip.Sent,.chip.Mobilising,.chip.Reached{background:var(--sky)}.chip.Accepted,.chip.Paid,.chip.Posted,.chip.Received,.chip.Invoiced,.chip.Approved,.chip.On-hire{background:var(--teal);color:#fff}
.chip.Overdue,.chip.Part-paid,.chip.Part-received,.chip.Off-hire,.chip.Pending{background:#FDE7DA;color:#9A3C0B}.chip.Dishonoured,.chip.Lost,.chip.Cancelled,.chip.Rejected{background:#FBE3E3;color:var(--red)}
.ok,.err,.warn{padding:6px 8px;border-radius:3px;white-space:pre-wrap;margin-bottom:8px}.ok{border-left:4px solid var(--teal);background:var(--sky)}
.err{border-left:4px solid var(--red);background:#FDECEA}.warn{border-left:4px solid var(--orange);background:#FEF1E8}.ok a,.warn a{color:var(--teal);font-weight:600}
.tot{display:flex;justify-content:space-between;padding:2px 6px}.tot.big{background:var(--teal);color:#fff;font-weight:700;border-radius:3px;padding:4px 6px}
#busy{position:fixed;inset:0;background:#ffffffb0;display:none;align-items:center;justify-content:center;z-index:9;font-weight:700;color:var(--teal)}
.chk{display:inline-flex;align-items:center;gap:4px;margin:6px 12px 0 0;font-size:11px;color:var(--ink)}.chk input{width:auto;margin:0}
.kv{display:grid;grid-template-columns:96px 1fr;gap:2px 8px;font-size:11.5px}.kv span:nth-child(odd){color:var(--grey)}
</style></head><body>
<header><b>CORE ACCESS</b><span class="sub" id="ttl">Operations</span><button id="homeBtn" type="button">Home</button></header>
<div id="busy">Working…</div>
<main><div id="msg"></div><div id="main">Loading…</div></main>
<script>
var START = "__START__", ARG = "__ARG__", D = null, S = {}, CUR = null;
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function $(id){return document.getElementById(id);}
function add(e,c){if(c==null||c===false)return;if(Array.isArray(c)){c.forEach(function(x){add(e,x);});return;}e.appendChild(typeof c==='object'?c:document.createTextNode(String(c)));}
function el(t,p){var e=document.createElement(t);p=p||{};Object.keys(p).forEach(function(k){var v=p[k];if(v==null)return;
  if(k==='text')e.textContent=v;else if(k==='cls')e.className=v;else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);
  else if(k==='value')e.value=v;else if(k==='checked'||k==='disabled')e[k]=!!v;else e.setAttribute(k,v);});
  for(var i=2;i<arguments.length;i++)add(e,arguments[i]);return e;}
function busy(on){$('busy').style.display=on?'flex':'none';}
function call(fn){var args=[].slice.call(arguments,1);busy(true);return new Promise(function(res,rej){
  var r=google.script.run.withSuccessHandler(function(x){busy(false);res(x);}).withFailureHandler(function(e){busy(false);rej(e);});r[fn].apply(r,args);});}
function say(text,kind,links){var m=$('msg');m.innerHTML='';if(!text)return;var d=el('div',{cls:kind||'ok',text:text});
  (links||[]).forEach(function(l){if(l&&l.url)add(d,[el('br'),el('a',{href:l.url,target:'_blank',text:l.label})]);});m.appendChild(d);window.scrollTo(0,0);}
function fail(e){say((e&&e.message)||String(e),'err');}
function refresh(){return new Promise(function(res){google.script.run.withSuccessHandler(function(x){D=x;res(x);}).withFailureHandler(function(){res(D);}).uiInit();});}
// run an action; then() gets the result (with D already refreshed)
function act(action,args){return call('uiDo',action,args).then(function(r){say(r.msg,r.warn?'warn':'ok',r.links);return refresh().then(function(){return r;});},function(e){fail(e);throw e;});}
function go(s,arg,keep){if(!keep)say('');CUR=[s,arg];var m=$('main');m.innerHTML='';$('ttl').textContent=TITLES[s]||'';add(m,S[s](arg));}
function again(){go(CUR[0],CUR[1],true);}
var TITLES={home:'Operations',quote:'Quote',quotes:'Quotes',job:'Jobs',customer:'Customers & sites',challan:'New challan',ret:'Return + damage',post:'Post / cancel challans',billing:'Billing',payment:'Payment',po:'New PO',receive:'Receive goods',expense:'Expense',pdf:'PDF documents'};
// ---------- formatting
function tk(x){x=Math.round((+x||0)*100)/100;var neg=x<0,s=Math.abs(x).toFixed(2).split('.'),i=s[0],o='';
  if(i.length>3){o=','+i.slice(-3);i=i.slice(0,-3);while(i.length>2){o=','+i.slice(-2)+o;i=i.slice(0,-2);}}return (neg?'-':'')+(i+o).replace(/^,/,'')+'.'+s[1];}
function fd(iso){if(!iso)return '';var p=String(iso).split('-');return p.length===3?p[2]+'-'+MON[+p[1]-1]+'-'+p[0]:String(iso);}
function chip(s){return el('span',{cls:'chip '+String(s||'').replace(/\\s+/g,'-'),text:s||'—'});}
function pct(x){return Math.round((+x||0)*10000)/100;}
// ---------- inputs
function inp(v,type,ph){return el('input',{type:type||'text',value:v==null?'':v,placeholder:ph||null,step:type==='number'?'any':null});}
function dt(v){return inp(v||D.today,'date');}
function sel(opts,v,blankLabel){var s=el('select');if(blankLabel!=null)add(s,el('option',{value:'',text:blankLabel}));
  opts.forEach(function(o){var a=Array.isArray(o)?o:[o,o];add(s,el('option',{value:a[0],text:a[1]}));});if(v!=null)s.value=v;return s;}
function chk(v,label){var c=el('input',{type:'checkbox',checked:v});return {box:el('label',{cls:'chk'},c,label),input:c};}
function fld(label,input,wide){return el('div',{style:wide?'grid-column:1/-1':null},el('label',{text:label}),input);}
function vals(F){var o={};Object.keys(F).forEach(function(k){var e=F[k];o[k]=e.type==='checkbox'?e.checked:e.value;});return o;}
function btn(label,fn,cls){return el('button',{type:'button',cls:'btn '+(cls||''),text:label,onclick:fn});}
// two-click confirm for destructive buttons
function dbtn(label,fn){var b=btn(label,function(){if(!b.armed){b.armed=1;b.className='btn d arm x';b.textContent='Confirm: '+label;setTimeout(function(){if(b.armed){b.armed=0;b.className='btn d x';b.textContent=label;}},4000);return;}b.armed=0;fn();},'d x');return b;}
function pdfBtn(what,no,label){return btn(label||'PDF',function(){act('pdf',{what:what,no:no}).catch(function(){});},'s x');}
function tbl(head,rows){var t=el('table');add(t,el('tr',null,head.map(function(h){return el('th',{text:h});})));
  rows.forEach(function(r){add(t,el('tr',null,r.map(function(c){return el('td',typeof c==='object'&&c&&c.nodeType?null:{},c);})));});return el('div',{style:'overflow-x:auto;margin:4px 0'},t);}
// ---------- lookups
function custName(id){var c=D.customers.filter(function(x){return x.id===id;})[0];return c?c.name:id;}
function custOpts(){return D.customers.filter(function(c){return c.status!=='Inactive';}).map(function(c){return [c.id,c.name+' · '+c.id];});}
function siteOpts(cust){return D.sites.filter(function(s){return !cust||s.cust===cust;}).map(function(s){return [s.id,s.name+' · '+s.id];});}
function staffOpts(){return D.staff.map(function(s){return [s.id,s.name];});}
function itemOpts(stockOnly){return D.items.filter(function(i){return !stockOnly||i.stock;}).map(function(i){return [i.code,i.code+' — '+i.name];});}
function item(code){return D.items.filter(function(i){return i.code===code;})[0];}
function locOpts(){return D.locations.map(function(l){return [l.id,l.name+' ('+l.type+')'];});}
function jobOpts(f){return D.jobs.filter(f||function(){return true;}).map(function(j){return [j.no,j.no+' · '+j.custName+' · '+j.type+' · '+j.status];});}
function quoteOpts(){return D.quotes.map(function(q){return [q.no,q.no+(q.rev?' R'+q.rev:'')+' · '+q.custName+' · '+q.type+' · '+q.status];});}
function hireJob(j){return (j.type==='Rental'||j.type==='Project')&&j.status!=='Closed';}

// ================= home
S.home=function(){return el('div',null,
  el('h3',{text:'Sales'}),el('div',{cls:'tiles'},tile('New quote','Sale · Rental · Project · Service','quote'),tile('Quotes','Edit · revise · PI · job · stages','quotes'),tile('Customers & sites','Add a client or site','customer')),
  el('h3',{text:'Jobs & stock'}),el('div',{cls:'tiles'},tile('Jobs','Work order · off-hire · variations','job'),tile('New challan','Delivery · sale · transfer','challan'),tile('Return + damage','Back to yard, damaged, lost','ret'),tile('Post / cancel','Draft challans','post')),
  el('h3',{text:'Money'}),el('div',{cls:'tiles'},tile('Billing','Hire · milestones · invoices · DN','billing'),tile('Payment','Receive / pay + allocate','payment')),
  el('h3',{text:'Buying'}),el('div',{cls:'tiles'},tile('New PO','Order from a supplier','po'),tile('Receive goods','PO into stock','receive'),tile('Expense','Job or office cost','expense')),
  el('h3',{text:'Documents'}),el('div',{cls:'tiles'},tile('PDF','Quotes, PIs, invoices, challans, POs, notes','pdf')),
  el('p',{cls:'muted',text:D.version+' · '+D.user+' · bank / cheque / pay order only — no cash.'}));};
function tile(t,s,screen){return el('div',{cls:'tile',onclick:function(){go(screen);}},el('b',{text:t}),el('span',{text:s}));}

// ================= customers & sites
S.customer=function(){var F={name:inp(),address:inp(),bin:inp(),contact:inp(),phone:inp(),email:inp('', 'email'),paymentDays:inp('','number','default'),siteProject:inp('', 'text','optional'),siteAddress:inp()};
  var G={custId:sel(custOpts(),null,'— customer —'),project:inp(),address:inp(),siteRep:inp(),siteRepPhone:inp()};
  return el('div',null,el('h2',{text:'New customer'}),el('div',{cls:'g'},fld('Name',F.name,1),fld('Address',F.address,1),fld('Client BIN',F.bin),fld('Payment days',F.paymentDays),fld('Contact person',F.contact),fld('Phone',F.phone),fld('Email',F.email,1),fld('First site / project',F.siteProject),fld('Site address',F.siteAddress)),
    btn('Save customer',function(){act('saveCustomer',vals(F)).then(function(){again();}).catch(function(){});}),
    el('h2',{text:'New site for a customer',style:'margin-top:18px'}),el('div',{cls:'g'},fld('Customer',G.custId,1),fld('Site / project',G.project),fld('Address',G.address),fld('Site rep',G.siteRep),fld('Site rep phone',G.siteRepPhone)),
    btn('Save site',function(){act('saveSite',vals(G)).then(function(){again();}).catch(function(){});}));};

// ================= quote (new / edit)
S.quote=function(no){var box=el('div',null,'Loading…');
  if(no)call('uiGet','quote',no).then(function(r){box.innerHTML='';add(box,quoteForm(r));},fail);else{box.innerHTML='';add(box,quoteForm(null));}
  return box;};
function quoteForm(r){var h=r?r.header:{QuoteType:'Rental',QuoteDate:D.today,VATPct:D.settings.VATPct,AdvancePct:D.settings.AdvancePct,MinMonths:D.settings.MinHireMonths};
  var F={QuoteType:sel(D.lists.QuoteType,h.QuoteType),QuoteDate:dt(h.QuoteDate),CustID:sel(custOpts(),h.CustID,'— customer —'),SiteID:sel(siteOpts(h.CustID),h.SiteID,'— site (optional) —'),
    Attention:inp(h.Attention),Subject:inp(h.Subject,'text','blank = standard subject'),YourRef:inp(h.YourRef),HireMonths:inp(h.HireMonths,'number'),MinMonths:inp(h.MinMonths,'number'),
    AdvancePct:inp(pct(h.AdvancePct),'number'),VATPct:inp(pct(h.VATPct),'number'),PreparedBy:sel(staffOpts(),h.PreparedBy,'—'),Notes:el('textarea',{value:h.Notes||''})};
  F.CustID.onchange=function(){var s=F.SiteID;s.innerHTML='';add(s,el('option',{value:'',text:'— site (optional) —'}));siteOpts(F.CustID.value).forEach(function(o){add(s,el('option',{value:o[0],text:o[1]}));});};
  var hireF=el('div',{cls:'g'},fld('Hire months (default for lines)',F.HireMonths),fld('Minimum months',F.MinMonths));
  function typeChg(){var t=F.QuoteType.value;hireF.style.display=(t==='Rental'||t==='Project')?'':'none';upd();}
  F.QuoteType.onchange=typeChg;
  var L=[],list=el('div'),tots=el('div');
  function addLine(l){l=l||{Qty:1,Selected:'Yes',Optional:'No'};var c={};
    c.it=sel(itemOpts(),l.ItemCode||'','— no item (free text) —');c.ds=inp(l.Description);c.un=sel(D.lists.Unit,l.Unit||'','—');c.qt=inp(l.Qty,'number');c.mo=inp(l.Months,'number','—');
    c.bi=sel(['One-off','Monthly','Milestone'],l.Billing||'','auto');c.ra=inp(l.Rate,'number');var op=chk(l.Optional==='Yes','Optional'),se=chk(l.Selected!=='No','Included');c.op=op.input;c.se=se.input;c.amt=el('b');
    c.it.onchange=function(){var x=item(c.it.value),t=F.QuoteType.value;if(x){c.ds.value=x.name;c.un.value=x.unit||'';c.ra.value=(t==='Sale'?x.sale:x.hire)||'';
      if((t==='Rental'||t==='Project')&&x.hire&&!c.mo.value&&F.HireMonths.value)c.mo.value=F.HireMonths.value;}upd();};
    c.bi.onchange=function(){if(c.bi.value==='Milestone')c.mo.value='';upd();};
    [c.qt,c.mo,c.ra,c.op,c.se].forEach(function(e){e.oninput=upd;e.onchange=upd;});
    c.card=el('div',{cls:'card'},el('div',{cls:'top'},el('span',{cls:'no'}),btn('×',function(){L.splice(L.indexOf(c),1);c.card.remove();upd();},'d x')),
      el('div',{cls:'g'},fld('Item',c.it,1),fld('Description',c.ds,1),fld('Unit',c.un),fld('Qty',c.qt),fld('Months',c.mo),fld('Billing',c.bi),fld('Rate (BDT)',c.ra),fld('Amount',c.amt)),op.box,se.box);
    c.get=function(){return {ItemCode:c.it.value,Description:c.ds.value,Unit:c.un.value,Qty:c.qt.value,Months:c.mo.value,Billing:c.bi.value,Rate:c.ra.value,Optional:c.op.checked?'Yes':'No',Selected:(!c.op.checked||c.se.checked)?'Yes':'No'};};
    c.val=function(){return Math.round((+c.qt.value||0)*(c.mo.value===''?1:+c.mo.value)*(+c.ra.value||0)*100)/100;};
    L.push(c);add(list,c.card);upd();}
  function upd(){var sub=0;L.forEach(function(c,i){c.card.querySelector('.no').textContent='Line '+(i+1);var a=c.val(),inc=!c.op.checked||c.se.checked;c.amt.textContent=inc?tk(a):'('+tk(a)+')';if(inc)sub+=a;});
    var vat=Math.round(sub*(+F.VATPct.value||0))/100,tot=sub+vat,adv=Math.round(tot*(+F.AdvancePct.value||0))/100;tots.innerHTML='';
    add(tots,[el('div',{cls:'tot'},'Subtotal',el('span',{text:tk(sub)})),el('div',{cls:'tot'},'VAT '+(+F.VATPct.value||0)+'%',el('span',{text:tk(vat)})),el('div',{cls:'tot big'},'Total',el('span',{text:tk(tot)})),el('div',{cls:'tot'},'Advance '+(+F.AdvancePct.value||0)+'%',el('span',{text:tk(adv)}))]);}
  F.VATPct.oninput=upd;F.AdvancePct.oninput=upd;
  (r?r.lines:[]).forEach(addLine);if(!r)addLine();
  var no=r?r.header.QuoteNo:'';
  var head=r?el('p',null,el('b',{text:no+(r.header.Rev?' Rev '+r.header.Rev:'')+'  '}),chip(r.header.Status)):el('p',{cls:'muted',text:'Number is given on save (CAE/Q/YYYY/NNN).'});
  function save(){var hv=vals(F);hv.VATPct=hv.VATPct+'%';hv.AdvancePct=hv.AdvancePct+'%';
    act('saveQuote',{quoteNo:no,header:hv,lines:L.map(function(c){return c.get();})}).then(function(x){go('quotes',x.ref,true);}).catch(function(){});}
  var out=el('div',null,el('h2',{text:r?'Edit quote':'New quote'}),head,el('div',{cls:'g'},fld('Type',F.QuoteType),fld('Date',F.QuoteDate),fld('Customer',F.CustID,1),fld('Site',F.SiteID,1),fld('Attention',F.Attention,1),fld('Subject',F.Subject,1),fld('Your reference',F.YourRef),fld('Prepared by',F.PreparedBy)),
    hireF,el('div',{cls:'g'},fld('Advance %',F.AdvancePct),fld('VAT %',F.VATPct)),fld('Notes (internal)',F.Notes),
    el('h3',{text:'Lines'}),el('p',{cls:'muted',text:'Months blank = one-off. Billing "Milestone" = lump sum billed in stages (set the stages under Quotes).'}),list,btn('+ Add line',function(){addLine();},'s x'),
    el('h3',{text:'Totals'}),tots,btn(r?'Save changes':'Save quote',save),btn('Cancel',function(){go(r?'quotes':'home',no);},'s'));
  typeChg();return out;}

// ================= quotes (pick → actions)
S.quotes=function(no){var pick=sel(quoteOpts(),no||'','— choose a quote —'),box=el('div');
  pick.onchange=function(){show(pick.value);};
  function show(n){CUR[1]=n;box.innerHTML='';if(!n)return;add(box,'Loading…');call('uiGet','quote',n).then(function(r){box.innerHTML='';add(box,quoteView(r));},fail);}
  if(no)show(no);
  return el('div',null,el('div',{cls:'g'},fld('Quote',pick,1)),btn('+ New quote',function(){go('quote');},'s x'),box);};
function quoteView(r){var h=r.header,no=h.QuoteNo,t=r.totals,open=['Draft','Sent'].indexOf(h.Status)>=0&&!r.job;
  var info=el('div',{cls:'kv'},el('span',{text:'Customer'}),el('span',{text:custName(h.CustID)}),el('span',{text:'Type / rev'}),el('span',{text:h.QuoteType+' · Rev '+(h.Rev||0)}),
    el('span',{text:'Status'}),el('span',null,chip(h.Status)),el('span',{text:'Date'}),el('span',{text:fd(h.QuoteDate)}),el('span',{text:'Total'}),el('span',{text:'Tk '+tk(t.total)+' (VAT '+pct(h.VATPct)+'%)'}),
    el('span',{text:'Advance'}),el('span',{text:'Tk '+tk(t.advance)+' ('+pct(t.advancePct)+'%)'}),el('span',{text:'Job'}),el('span',{text:r.job?r.job.no+' · '+r.job.status:'—'}));
  var out=el('div',null,el('h3',{text:no}),info,
    el('div',null,open?btn('Edit',function(){go('quote',no);},'x'):null,!r.job?btn('Revise (Rev +1)',function(){act('reviseQuote',{quoteNo:no}).then(function(){go('quote',no,true);}).catch(function(){});},'s x'):null,
      pdfBtn('Quote',no,'Quotation PDF'),h.Status==='Draft'?btn('Mark sent',function(){act('setStatus',{type:'Quote',no:no,status:'Sent'}).then(again).catch(function(){});},'s x'):null,
      open?dbtn('Mark lost',function(){act('setStatus',{type:'Quote',no:no,status:'Lost'}).then(again).catch(function(){});}):null));
  add(out,tbl(['#','Description','Qty','Mo.','Rate','Amount'],r.lines.map(function(l){var a=Math.round((+l.Qty||0)*(l.Months===''?1:+l.Months)*(+l.Rate||0)*100)/100;
    return [String(l.LineNo),(l.Optional==='Yes'?'Optional: ':'')+l.Description+(l.Billing?' ['+l.Billing+']':''),String(l.Qty)+' '+(l.Unit||''),l.Months===''?'—':String(l.Months),tk(l.Rate),l.Selected==='Yes'?tk(a):'('+tk(a)+')'];})));
  // proforma
  add(out,el('h3',{text:'Proforma (advance)'}));
  r.pis.forEach(function(p){add(out,el('div',null,el('b',{text:p.no+'  '}),'Tk '+tk(p.amount)+'  ',chip(p.status),' ',pdfBtn('PI',p.no),p.status==='Draft'?btn('Mark sent',function(){act('setStatus',{type:'PI',no:p.no,status:'Sent'}).then(again).catch(function(){});},'s x'):null));});
  if(!r.pis.filter(function(p){return p.status!=='Cancelled';}).length&&h.Status!=='Lost'){var A={amount:inp(t.advance,'number'),date:dt()};
    add(out,[el('div',{cls:'g'},fld('Amount (default = advance)',A.amount),fld('PI date',A.date)),btn('Create proforma',function(){act('quoteToPI',{quoteNo:no,amount:A.amount.value,date:A.date.value}).then(again).catch(function(){});},'x')]);}
  // job
  add(out,el('h3',{text:'Job'}));
  if(r.job)add(out,el('div',null,el('b',{text:r.job.no+'  '}),chip(r.job.status),' ',btn('Open job',function(){go('job',r.job.no);},'s x')));
  else if(h.Status!=='Lost'){var hb=h.QuoteType==='Rental'?['Item']:h.QuoteType==='Project'?['m²','m³','Set','Lump sum']:[];
    var J={woNo:inp(),woDate:inp('','date'),pm:sel(staffOpts(),'','—'),hireBasis:sel(hb,'',hb.length?'auto':'—'),date:dt()};
    add(out,[el('div',{cls:'g'},fld('Client work order / PO no.',J.woNo),fld('WO date',J.woDate),fld('Project manager',J.pm),fld('Hire basis',J.hireBasis),fld('Job date',J.date)),
      btn('Create job (quote → Accepted)',function(){act('quoteToJob',Object.assign({quoteNo:no},vals(J))).then(function(x){go('job',x.ref,true);}).catch(function(){});},'x')]);}
  // milestones
  if(r.hasMs){add(out,el('h3',{text:'Payment stages (lump sum Tk '+tk(r.msBase)+')'}));
    var locked=r.milestones.some(function(m){return m.status!=='Pending';});
    var rows=r.milestones.length?r.milestones.map(function(m){return [m.stage,pct(m.pct)];}):D.settings.MilestoneStages.split('|').map(function(x){var p=x.split(':');return [p[0],+p[1]];});
    var SL=el('div'),sum=el('p',{cls:'muted'});
    function srow(n,p){var a=inp(n),b=inp(p,'number'),row=el('div',{cls:'g',style:'grid-template-columns:1fr 70px 30px;align-items:end'},fld('Stage',a),fld('%',b),locked?el('span'):btn('×',function(){row.remove();ssum();},'d x'));
      row.get=function(){return [a.value,+b.value];};a.disabled=b.disabled=locked;b.oninput=ssum;add(SL,row);}
    function ssum(){var s=0;[].forEach.call(SL.children,function(r){s+=r.get()[1]||0;});sum.textContent='Total '+s+'%'+(Math.abs(s-100)>0.001?' — must be 100%':'')+(r.milestones.length?'':' (defaults — not saved yet)');}
    rows.forEach(function(x){srow(x[0],x[1]);});ssum();add(out,[SL,sum]);
    if(!locked)add(out,[btn('+ Stage',function(){srow('',0);ssum();},'s x'),btn('Save stages',function(){act('setMilestones',{quoteNo:no,stages:[].map.call(SL.children,function(r){return r.get();})}).then(again).catch(function(){});},'x')]);
    else add(out,el('p',{cls:'muted',text:'A stage is reached — stages are locked. Use the job screen to mark stages and invoice.'}));}
  return out;}

// ================= jobs
S.job=function(no){var pick=sel(jobOpts(),no||'','— choose a job —'),box=el('div');pick.onchange=function(){show(pick.value);};
  function show(n){CUR[1]=n;box.innerHTML='';if(!n)return;add(box,'Loading…');call('uiGet','job',n).then(function(r){box.innerHTML='';add(box,jobView(r));},fail);}
  if(no)show(no);return el('div',null,el('div',{cls:'g'},fld('Job',pick,1)),box);};
function jobView(r){var j=r.job,no=j.JobNo,hire=j.JobType==='Rental'||j.JobType==='Project';
  var out=el('div',null,el('div',{cls:'kv'},el('span',{text:'Customer'}),el('span',{text:custName(j.CustID)}),el('span',{text:'Type / basis'}),el('span',{text:j.JobType+(j.HireBasis?' · '+j.HireBasis:'')}),
    el('span',{text:'Status'}),el('span',null,chip(j.Status)),el('span',{text:'Quote'}),el('span',{text:r.quote?r.quote.no+' · Tk '+tk(r.quote.total):'—'}),el('span',{text:'Billing'}),el('span',{text:j.BillingCycle||'—'}),
    el('span',{text:'Hire start'}),el('span',{text:fd(r.hireStart)||'—'}),el('span',{text:'Advance left'}),el('span',{text:'Tk '+tk(r.advanceLeft)})),
    el('div',null,btn(hire?'Delivery challan':'Sale / delivery challan',function(){go('challan',no);},'x'),hire?btn('Return challan',function(){go('ret',no);},'s x'):null,btn('Billing',function(){go('billing',no);},'s x')));
  if(r.onHire.length)add(out,[el('h3',{text:'On hire now'}),tbl(['Item','Name','Qty'],r.onHire.map(function(x){return [x.code,x.name,String(x.qty)];}))]);
  // details
  var F={ClientWONo:inp(j.ClientWONo),ClientWODate:inp(j.ClientWODate,'date'),PM:sel(staffOpts(),j.PM,'—'),Status:sel(D.lists.JobStatus,j.Status),SecDepAmount:inp(j.SecDepAmount,'number'),SecDepChequeNo:inp(j.SecDepChequeNo),SecDepStatus:sel(D.lists.SecDepStatus,j.SecDepStatus||'None'),Notes:el('textarea',{value:j.Notes||''})};
  add(out,[el('h3',{text:'Work order + security deposit'}),el('div',{cls:'g'},fld('Client WO no.',F.ClientWONo),fld('WO date',F.ClientWODate),fld('Project manager',F.PM),fld('Job status',F.Status),fld('Security deposit Tk',F.SecDepAmount),fld('Deposit cheque no.',F.SecDepChequeNo),fld('Deposit status',F.SecDepStatus),fld('Notes',F.Notes,1)),
    btn('Save job details',function(){act('saveJob',Object.assign({jobNo:no},vals(F))).then(again).catch(function(){});},'x')]);
  // milestones
  if(r.milestones.length){add(out,el('h3',{text:'Payment stages'}));
    add(out,tbl(['#','Stage','%','Amount','Status',''],r.milestones.map(function(m){var a=null;
      if(m.status==='Pending'){var d=inp(D.today,'date');d.style.width='118px';a=el('span',null,d,btn('Reached',function(){act('reachMilestone',{jobNo:no,stageNo:m.stageNo,date:d.value}).then(again).catch(function(){});},'x'));}
      else if(m.inv)a=pdfBtn('Invoice',m.inv,m.inv);
      return [String(m.stageNo),m.stage,pct(m.pct)+'%',tk(m.amount),chip(m.status),a];})));
    if(r.milestones.some(function(m){return m.status==='Reached';}))add(out,btn('Invoice reached stages',function(){act('invoiceMilestones',{jobNo:no}).then(again).catch(function(){});},'x'));}
  // variations
  add(out,el('h3',{text:'Variations'}));
  if(r.variations.length)add(out,tbl(['VO','Description','Tk','Status',''],r.variations.map(function(v){return [v.no,v.desc,tk(v.amount),chip(v.status),
    ['Draft','Sent'].indexOf(v.status)>=0?el('span',null,btn('Approve',function(){act('setVariation',{voNo:v.no,status:'Approved'}).then(again).catch(function(){});},'x'),dbtn('Reject',function(){act('setVariation',{voNo:v.no,status:'Rejected'}).then(again).catch(function(){});})):null];})));
  var V={description:inp(),amount:inp('','number','negative = omission'),status:sel(D.lists.VOStatus,'Draft'),clientRef:inp(),date:dt()};
  add(out,[el('div',{cls:'g'},fld('Description',V.description,1),fld('Amount Tk (excl. VAT)',V.amount),fld('Status',V.status),fld('Client ref',V.clientRef),fld('Date',V.date)),btn('Add variation',function(){act('saveVariation',Object.assign({jobNo:no},vals(V))).then(again).catch(function(){});},'s x')]);
  // off-hire
  if(hire){add(out,el('h3',{text:'Off-hire notice'}));
    if(r.offHire.length)add(out,tbl(['OHN','Notice','Off-hire','Scope'],r.offHire.map(function(o){return [o.no,fd(o.notice),fd(o.date)||'—',o.scope];})));
    var O={noticeDate:dt(),offHireDate:inp('','date'),scope:sel(D.lists.OffHireScope,'Full'),notes:inp()};
    add(out,[el('div',{cls:'g'},fld('Notice date',O.noticeDate),fld('Off-hire date',O.offHireDate),fld('Scope',O.scope),fld('Notes',O.notes)),btn('Record off-hire notice',function(){act('offHire',Object.assign({jobNo:no},vals(O))).then(again).catch(function(){});},'s x')]);}
  // documents
  if(r.challans.length)add(out,[el('h3',{text:'Challans'}),tbl(['Challan','Kind','Date','Status',''],r.challans.map(function(c){return [c.no,c.kind,fd(c.date),chip(c.status),pdfBtn('Challan',c.no)];}))]);
  if(r.invoices.length)add(out,[el('h3',{text:'Invoices'}),tbl(['Invoice','Kind','Date','Due','Balance',''],r.invoices.map(function(i){return [i.no,i.kind,fd(i.date),tk(i.due),el('span',null,tk(i.balance),' ',chip(i.status)),pdfBtn('Invoice',i.no)];}))]);
  if(r.damage.length)add(out,[el('h3',{text:'Open damage / loss'}),tbl(['Item','Damaged','Lost','Challan'],r.damage.map(function(d){return [d.name,String(d.damaged||''),String(d.lost||''),d.challan];})),btn('Raise debit note',function(){act('damageDN',{jobNo:no}).then(again).catch(function(){});},'x')]);
  return out;}

// ================= challans
S.challan=function(job){return challanForm(false,job);};
S.ret=function(job){return challanForm(true,job);};
function challanForm(ret,job){var kinds=ret?['Return']:['Delivery','Sale','Transfer'];
  var F={jobNo:sel(jobOpts(function(j){return j.status!=='Closed'&&(!ret||j.type==='Rental'||j.type==='Project');}),job||'','— job —'),kind:sel(kinds,kinds[0]),date:dt(),fromLoc:sel(locOpts(),'','auto'),toLoc:sel(locOpts(),'','auto'),vehicle:inp(),driver:inp(),receivedBy:inp(),notes:inp()};
  var L=[],list=el('div'),avail={},note=el('p',{cls:'muted'});
  function loadAvail(){var loc=F.fromLoc.value||(ret?'':'LOC-YARD');if(!loc){avail={};L.forEach(function(c){c.av.textContent='';});return;}
    call('uiGet','stock',loc).then(function(m){avail=m;L.forEach(function(c){c.showAv();});},fail);}
  function addLine(l){l=l||{};var c={it:sel(itemOpts(true),l.code||'','— item —'),qt:inp(l.qty,'number'),dm:inp('','number'),lo:inp('','number'),rm:inp(),av:el('span',{cls:'muted'})};
    c.showAv=function(){c.av.textContent=c.it.value&&!ret?'available '+(avail[c.it.value]||0):'';};c.it.onchange=c.showAv;
    c.card=el('div',{cls:'card'},el('div',{cls:'top'},c.av,btn('×',function(){L.splice(L.indexOf(c),1);c.card.remove();},'d x')),
      el('div',{cls:'g'},fld('Item',c.it,1),fld(ret?'Qty returned':'Qty',c.qt),ret?fld('of which damaged',c.dm):null,ret?fld('of which lost',c.lo):null,fld('Remarks',c.rm)));
    c.get=function(){return {itemCode:c.it.value,qty:c.qt.value,qtyDamaged:c.dm.value,qtyLost:c.lo.value,remarks:c.rm.value};};
    L.push(c);add(list,c.card);c.showAv();}
  function loadHire(){if(!F.jobNo.value){say('Choose the job first','err');return;}call('uiGet','job',F.jobNo.value).then(function(r){L.forEach(function(c){c.card.remove();});L=[];
    if(!r.onHire.length)note.textContent='Nothing on hire for this job.';else{note.textContent='Loaded what is on hire — adjust quantities, enter damaged / lost.';r.onHire.forEach(function(x){addLine({code:x.code,qty:x.qty});});}},fail);}
  F.fromLoc.onchange=loadAvail;
  function save(post){var v=vals(F);v.post=post;v.lines=L.map(function(c){return c.get();});act('saveChallan',v).then(function(x){go(ret?'ret':'challan',null,true);if(x.ref)add($('msg').firstChild,[el('br'),pdfBtn('Challan',x.ref,'Challan PDF')]);}).catch(function(){});}
  addLine();loadAvail();
  return el('div',null,el('h2',{text:ret?'Return challan':'New challan'}),el('div',{cls:'g'},fld('Job',F.jobNo,1),fld('Kind',F.kind),fld('Date',F.date),fld('From',F.fromLoc),fld('To',F.toLoc),fld('Vehicle no.',F.vehicle),fld('Driver',F.driver),fld('Received by',F.receivedBy),fld('Notes',F.notes,1)),
    el('p',{cls:'muted',text:ret?'From = the job site, To = yard (auto). Damaged items go to Repair, lost to Lost; both raise Damage rows for the debit note.':'Auto: Delivery = yard → job site (Sale job → Sold); Sale = yard → Sold. Transfer needs From and To.'}),
    el('h3',{text:'Items'}),ret?btn('Load items on hire',loadHire,'s x'):null,note,list,btn('+ Add item',function(){addLine();},'s x'),
    el('div',null,btn('Save + post',function(){save(true);}),btn('Save as draft',function(){save(false);},'s')));}
S.post=function(){var box=el('div',null,'Loading…');call('uiGet','challans').then(function(r){box.innerHTML='';
  add(box,[el('h3',{text:'Draft challans'}),r.drafts.length?tbl(['Challan','Kind','Job','Date',''],r.drafts.map(function(c){return [c.no,c.kind+' ('+c.lines+')',c.job,fd(c.date),el('span',null,
    btn('Post',function(){act('postChallan',{no:c.no}).then(again).catch(function(){});},'x'),pdfBtn('Challan',c.no),dbtn('Cancel',function(){act('cancelChallan',{no:c.no}).then(again).catch(function(){});}))];})):el('p',{cls:'muted',text:'No draft challans.'}),
    el('h3',{text:'Recently posted'}),r.posted.length?tbl(['Challan','Kind','Job','Date',''],r.posted.map(function(c){return [c.no,c.kind,c.job,fd(c.date),el('span',null,pdfBtn('Challan',c.no),dbtn('Cancel + reverse stock',function(){act('cancelChallan',{no:c.no}).then(again).catch(function(){});}))];})):el('p',{cls:'muted',text:'None yet.'})]);},fail);return box;};

// ================= billing
S.billing=function(job){var H={asOf:dt(),jobNo:sel(jobOpts(hireJob),job&&D.jobs.some(function(j){return j.no===job&&hireJob(j);})?job:'','all hire jobs')};
  var I={jobNo:sel(jobOpts(function(j){return j.type==='Sale'||j.type==='Service';}),job||'','— sale / service job —'),date:dt()};
  var M={jobNo:sel(jobOpts(function(j){return j.ms;}),job||'','— job with stages —')};
  var N={jobNo:sel(jobOpts(function(j){return j.dmg>0;}),job||'','— job with open damage —'),date:dt(),invNo:inp('','text','optional')};
  var res=el('div'),inv=el('div',null,'Loading…');
  function links(refs){res.innerHTML='';(refs||[]).forEach(function(n){add(res,el('div',null,el('b',{text:n+'  '}),pdfBtn('Invoice',n),btn('Mark sent',function(){act('setStatus',{type:'INV',no:n,status:'Sent'}).catch(function(){});},'s x')));});}
  call('uiGet','docs').then(function(d){inv.innerHTML='';var drafts=d.Invoice.filter(function(x){return x[2]==='Draft';});
    add(inv,drafts.length?tbl(['Draft invoice',''],drafts.map(function(x){return [x[1],el('span',null,pdfBtn('Invoice',x[0]),btn('Mark sent',function(){act('setStatus',{type:'INV',no:x[0],status:'Sent'}).then(again).catch(function(){});},'s x'))];})):el('p',{cls:'muted',text:'No draft invoices.'}));
    var dn=d.Note.filter(function(x){return x[2]==='Draft';});if(dn.length)add(inv,tbl(['Draft note',''],dn.map(function(x){return [x[1],el('span',null,pdfBtn('Note',x[0]),btn('Mark sent',function(){act('setStatus',{type:'Note',no:x[0],status:'Sent'}).then(again).catch(function(){});},'s x'))];})));},fail);
  return el('div',null,res,
    el('h3',{text:'Hire billing (monthly in advance)'}),el('div',{cls:'g'},fld('Bill up to',H.asOf),fld('Job',H.jobNo)),btn('Run hire billing',function(){act('hireBilling',vals(H)).then(function(x){links(x.refs);}).catch(function(){});}),
    el('h3',{text:'Sale / service invoice from quote'}),el('div',{cls:'g'},fld('Job',I.jobNo,1),fld('Invoice date',I.date)),btn('Create invoice',function(){act('invoiceFromQuote',vals(I)).then(function(x){links(x.refs);}).catch(function(){});},'x'),
    el('h3',{text:'Milestone (stage) invoices'}),el('div',{cls:'g'},fld('Job',M.jobNo,1)),btn('Open stages on the job',function(){if(M.jobNo.value)go('job',M.jobNo.value);},'s x'),
    el('h3',{text:'Damage / loss → debit note'}),el('div',{cls:'g'},fld('Job',N.jobNo,1),fld('Date',N.date),fld('Against invoice',N.invNo)),btn('Create debit note',function(){act('damageDN',vals(N)).then(function(x){res.innerHTML='';add(res,el('div',null,el('b',{text:x.ref+'  '}),pdfBtn('Note',x.ref)));}).catch(function(){});},'x'),
    el('h3',{text:'Drafts to send'}),inv);};

// ================= payments
S.payment=function(a0){var F={Direction:sel([['In','Received from customer'],['Out','Paid to supplier']],'In'),PartyID:sel([],null),PayDate:dt(),Method:sel(D.lists.PayMethod,'Bank transfer'),RefNo:inp('','text','cheque / transaction no.'),Bank:inp(),Amount:inp('','number'),VDSDeducted:inp('','number','VAT deducted at source'),Mushak66Received:sel(['No','Yes'],'No'),Notes:inp()};
  var auto=chk(true,'Allocate automatically, oldest first'),docs=el('div'),pays=el('div'),A=[],vdsBox=el('div',{cls:'g'},fld('VDS deducted Tk',F.VDSDeducted),fld('Mushak-6.6 received',F.Mushak66Received));
  function parties(){var s=F.PartyID,o=F.Direction.value==='Out'?D.suppliers.map(function(x){return [x.id,x.name+' · '+x.id];}):custOpts();s.innerHTML='';add(s,el('option',{value:'',text:'— choose —'}));o.forEach(function(x){add(s,el('option',{value:x[0],text:x[1]}));});vdsBox.style.display=F.Direction.value==='In'?'':'none';load();}
  function pt(){return F.Direction.value==='Out'?'Supplier':'Customer';}
  function load(){docs.innerHTML='';pays.innerHTML='';A=[];if(!F.PartyID.value)return;call('uiGet','open',{partyType:pt(),partyId:F.PartyID.value}).then(function(r){
    add(docs,r.docs.length?tbl(['Doc','Date','Open Tk','Allocate'],r.docs.map(function(d){var i=inp('','number');i.disabled=auto.input.checked;A.push({d:d,i:i});return [d.type+' '+d.no,fd(d.date),tk(d.balance),i];})):el('p',{cls:'muted',text:'Nothing open for this party.'}));
    if(r.payments.length)add(pays,[el('h3',{text:'Unallocated / cheques pending'}),tbl(['Payment','Tk','Free',''],r.payments.map(function(p){return [p.id+' · '+p.method+(p.ref?' '+p.ref:''),tk(p.amount),el('span',null,tk(p.avail),' ',p.cheque==='Pending'?chip('Pending'):''),el('span',null,
      p.avail>0.005?btn('Allocate',function(){act('allocate',{payId:p.id}).then(load).catch(function(){});},'x'):null,p.cheque==='Pending'?btn('Cleared',function(){act('chequeCleared',{payId:p.id}).then(load).catch(function(){});},'s x'):null,
      p.cheque!=='NA'&&p.cheque!=='Dishonoured'?dbtn('Dishonoured',function(){act('chequeDishonoured',{payId:p.id}).then(load).catch(function(){});}):null)];}))]);},fail);}
  F.Direction.onchange=parties;F.PartyID.onchange=load;auto.input.onchange=function(){A.forEach(function(a){a.i.disabled=auto.input.checked;if(auto.input.checked)a.i.value='';});};
  if(a0&&a0.dir)F.Direction.value=a0.dir;parties();if(a0&&a0.party){F.PartyID.value=a0.party;load();}
  function save(){var v=vals(F);v.PartyType=pt();v.allocations=auto.input.checked?[]:A.filter(function(a){return +a.i.value>0;}).map(function(a){return {type:a.d.type,no:a.d.no,amount:a.i.value};});
    if(!auto.input.checked&&!v.allocations.length){say('Manual allocation: enter at least one amount, or tick automatic.','err');return;}
    act('recordPayment',v).then(function(){go('payment',{dir:F.Direction.value,party:F.PartyID.value},true);}).catch(function(){});}
  return el('div',null,el('h2',{text:'Record payment'}),el('div',{cls:'g'},fld('Direction',F.Direction,1),fld('Party',F.PartyID,1),fld('Date',F.PayDate),fld('Method (no cash)',F.Method),fld('Reference',F.RefNo),fld('Bank',F.Bank),fld('Amount Tk',F.Amount),fld('Notes',F.Notes)),vdsBox,
    el('h3',{text:'Open documents'}),auto.box,docs,btn('Save payment',save),pays);};

// ================= purchasing + expenses
S.po=function(){var F={SupID:sel(D.suppliers.map(function(s){return [s.id,s.name+' · '+s.id];}),null,'— supplier —'),PODate:dt(),JobNo:sel(jobOpts(),'','— none (stock) —'),DeliverTo:sel(locOpts(),'LOC-YARD'),VATPct:inp(pct(D.settings.VATPct),'number'),Notes:inp()};
  var L=[],list=el('div'),tot=el('div');
  function upd(){var s=0;L.forEach(function(c){s+=(+c.qt.value||0)*(+c.ra.value||0);});var v=Math.round(s*(+F.VATPct.value||0))/100;tot.innerHTML='';add(tot,[el('div',{cls:'tot'},'Subtotal',el('span',{text:tk(s)})),el('div',{cls:'tot big'},'Total incl. VAT',el('span',{text:tk(s+v)}))]);}
  function addLine(){var c={it:sel(itemOpts(),'','— no item —'),ds:inp(),un:sel(D.lists.Unit,'','—'),qt:inp('','number'),ra:inp('','number')};
    c.it.onchange=function(){var x=item(c.it.value);if(x){c.ds.value=x.name;c.un.value=x.unit||'';}};c.qt.oninput=c.ra.oninput=upd;
    c.card=el('div',{cls:'card'},el('div',{cls:'top'},el('span'),btn('×',function(){L.splice(L.indexOf(c),1);c.card.remove();upd();},'d x')),el('div',{cls:'g'},fld('Item',c.it,1),fld('Description',c.ds,1),fld('Unit',c.un),fld('Qty',c.qt),fld('Rate Tk',c.ra)));
    c.get=function(){return {ItemCode:c.it.value,Description:c.ds.value,Unit:c.un.value,Qty:c.qt.value,Rate:c.ra.value};};L.push(c);add(list,c.card);}
  F.VATPct.oninput=upd;addLine();upd();
  return el('div',null,el('h2',{text:'New purchase order'}),el('div',{cls:'g'},fld('Supplier',F.SupID,1),fld('PO date',F.PODate),fld('VAT %',F.VATPct),fld('For job',F.JobNo,1),fld('Deliver to',F.DeliverTo,1),fld('Notes',F.Notes,1)),
    el('h3',{text:'Lines'}),list,btn('+ Add line',addLine,'s x'),tot,btn('Save PO',function(){var v=vals(F);v.VATPct=v.VATPct+'%';v.lines=L.map(function(c){return c.get();});
      act('savePO',v).then(function(x){go('po',null,true);add($('msg').firstChild,[el('br'),pdfBtn('PO',x.ref,'PO PDF'),btn('Mark sent',function(){act('setStatus',{type:'PO',no:x.ref,status:'Sent'}).catch(function(){});},'s x')]);}).catch(function(){});}));};
S.receive=function(){var box=el('div',null,'Loading…');call('uiGet','pos').then(function(list){box.innerHTML='';var pick=sel(list.map(function(p){return [p.no,p.no+' · '+p.sup+' · '+p.status];}),null,'— open PO —'),det=el('div'),date=dt();
  var pseq=0;pick.onchange=function(){var me=++pseq,po=pick.value;det.innerHTML='';if(!po)return;call('uiGet','po',po).then(function(r){if(me!==pseq)return;var Q=[];
    add(det,r.lines.length?[tbl(['Item','Ordered','Received','Receive now'],r.lines.map(function(l){var i=inp(l.open,'number');Q.push({code:l.code,i:i});return [l.code+' — '+l.name,String(l.ordered),String(l.received),i];})),fld('Date received',date),
      btn('Receive into stock',function(){if(pick.value!==po)return;act('receivePO',{poNo:po,date:date.value,lines:Q.map(function(q){return {itemCode:q.code,qty:q.i.value};})}).then(function(){go('receive',null,true);}).catch(function(){});})]:el('p',{cls:'muted',text:'No stock lines on this PO.'}));},fail);};
  add(box,[el('h2',{text:'Receive goods'}),list.length?fld('PO',pick):el('p',{cls:'muted',text:'No open POs.'}),det]);},fail);return box;};
S.expense=function(){var F={ExpDate:dt(),Category:sel(D.lists.ExpenseCategory,null,'— category —'),JobNo:sel(jobOpts(),'','— office / none —'),Payee:inp(),Amount:inp('','number'),Method:sel(D.lists.PayMethod,'Bank transfer'),RefNo:inp(),ApprovedBy:sel(staffOpts(),'','—'),Notes:inp()};
  return el('div',null,el('h2',{text:'Expense'}),el('div',{cls:'g'},fld('Date',F.ExpDate),fld('Category',F.Category),fld('Job',F.JobNo,1),fld('Payee',F.Payee,1),fld('Amount Tk',F.Amount),fld('Method (no cash)',F.Method),fld('Reference',F.RefNo),fld('Approved by',F.ApprovedBy),fld('Notes',F.Notes,1)),
    btn('Save expense',function(){act('saveExpense',vals(F)).then(function(){go('expense',null,true);}).catch(function(){});}),el('p',{cls:'muted',text:'Receipt photo: paste a Drive link into Expenses › ReceiptPhoto (AppSheet will take photos in O6).'}));};

// ================= PDF
S.pdf=function(){var box=el('div',null,'Loading…');call('uiGet','docs').then(function(d){box.innerHTML='';var names={Quote:'Quotation',PI:'Proforma invoice',Invoice:'Invoice',Challan:'Challan',PO:'Purchase order',Note:'Debit / credit note'};
  var what=sel(Object.keys(names).map(function(k){return [k,names[k]];}),'Quote'),no=sel([],null),sg=sel([['','— not signed —']].concat(Array.isArray(d._signers)?d._signers:[]),'');
  function fill(){no.innerHTML='';(d[what.value]||[]).forEach(function(x){add(no,el('option',{value:x[0],text:x[1]+(x[2]?' · '+x[2]:'')}));});}
  what.onchange=fill;fill();
  add(box,[el('h2',{text:'Make a PDF'}),el('div',{cls:'g'},fld('Document',what,1),fld('Number',no,1),fld('Signed by',sg,1)),btn('Make PDF',function(){if(!no.value){say('Nothing to print yet','err');return;}act('pdf',{what:what.value,no:no.value,signer:sg.value}).catch(function(){});}),
    el('p',{cls:'muted',text:'Saved in Core Access Ops › PDF › <type>; the editable Google Doc is kept in Editable. Making it again replaces the file. Teal [brackets] = text still to fill. Signed by: quotes and proformas are always signed by the person who prepared the quote; for the others pick a name or leave it unsigned. Every PDF gets the company stamp.'})]);},fail);return box;};

// ================= start
$('homeBtn').onclick=function(){go('home');};
refresh().then(function(d){if(!d){say('Could not load the sheet data. Reload the sheet and try again.','err');return;}var s=START==='return'?'ret':START;go(S[s]?s:'home',ARG||null);});
</script></body></html>`;

// ======================================================================= self-test (in memory, your data is not touched)
function selfTestUi() {
  var T = testKit_(), eq = T.eq, throws = T.throws, step = T.step;
  var db = testSeed_('Full period'), U = {}, run = function (a, x) { return uiDoDb_(db, a, x || {}); };
  step('U setup', function () {
    eq('U1 iso date parsed as local day', fmtDay(dayNum(uiDate_('2026-11-20'))), '20-Nov-2026');
    eq('U2 percent inputs', [uiPct_('15%'), uiPct_(50), uiPct_(0.5), uiPct_('', 0.15)].join(' '), '0.15 0.5 0.5 0.15');
    var c = uiClean_({ d: new Date(2026, 10, 5), _r: 7, a: [new Date(2027, 0, 1)], n: 3 });
    eq('U3 dates cleaned for the panel', JSON.stringify(c), '{"d":"2026-11-05","a":["2027-01-01"],"n":3}');
    eq('U4 init lists, no cash', uiInitDb_(db).lists.PayMethod.join('/'), 'Bank transfer/Cheque/Pay order');
    throws('U5 unknown action', function () { run('format'); }, /Unknown action/);
  });
  step('U customers + quote', function () {
    var r = run('saveCustomer', { name: 'Delta Builders Ltd.', address: 'Uttara, Dhaka', phone: '01711000000', siteProject: 'Tower 2' });
    eq('U6 customer + site + location', r.ref + ' ' + r.site + ' ' + must(db, 'Sites', 'SiteID', r.site).LocID, 'CUST-0002 SITE-0002 LOC-S0002');
    throws('U7 duplicate customer blocked', function () { run('saveCustomer', { name: 'delta builders ltd.' }); }, /already exists/);
    var lines = [{ ItemCode: 'RL-STD-20', Qty: 100, Months: 2, Rate: 90 }, { ItemCode: 'BD-ST-207', Qty: 40, Months: 2, Rate: 40 }, { ItemCode: 'SV-TRANS', Qty: 2, Rate: 4000 }, { Description: 'PE design', Unit: 'lot', Qty: 1, Rate: 25000, Optional: 'Yes', Selected: 'No' }];
    throws('U8 bad unit refused', function () { run('saveQuote', { header: { QuoteType: 'Rental', CustID: 'CUST-0002', QuoteDate: '2026-11-20' }, lines: [{ Description: 'x', Unit: 'bag', Qty: 1, Rate: 1 }] }); }, /not in Lists/);
    throws('U9 monthly line needs months', function () { run('saveQuote', { header: { QuoteType: 'Rental', CustID: 'CUST-0002' }, lines: [{ ItemCode: 'RL-STD-20', Qty: 1, Billing: 'Monthly', Rate: 1 }] }); }, /needs months/);
    throws('U10 site of another customer refused', function () { run('saveQuote', { header: { QuoteType: 'Rental', CustID: 'CUST-0002', SiteID: 'SITE-0001' }, lines: lines }); }, /another customer/);
    r = run('saveQuote', { header: { QuoteType: 'Rental', CustID: 'CUST-0002', SiteID: 'SITE-0002', QuoteDate: '2026-11-20', AdvancePct: '50%', VATPct: '15%' }, lines: lines });
    U.q = r.ref;
    eq('U11 quote number', U.q, 'CAE/Q/2026/001');
    eq('U12 totals (18000+3200+8000)×1.15, optional excluded', r.totals.total, 33580); eq('U13 advance 50%', r.totals.advance, 16790);
    var ql = quoteLines(db, U.q); eq('U14 lines + defaults from items', ql.length + ' ' + ql[0].Description + ' ' + ql[0].Unit + ' ' + ql[2].Months, '3 Ringlock standard 2.0 m pc ');
    eq('U15 min months default for Rental', must(db, 'Quotes', 'QuoteNo', U.q).MinMonths, 1);
    var ids = db.rows('QuoteLines').filter(function (l) { return l.QuoteNo === U.q; }).map(function (l) { return l.LineID; });
    r = run('saveQuote', { quoteNo: U.q, header: { QuoteType: 'Rental', CustID: 'CUST-0002', SiteID: 'SITE-0002', QuoteDate: '2026-11-20', AdvancePct: '50%', VATPct: '15%' }, lines: lines.slice(0, 2) });
    var all = db.rows('QuoteLines').filter(function (l) { return l.QuoteNo === U.q; });
    eq('U16 edit: surplus lines removed, IDs kept', all.length + ' ' + all.map(function (l) { return l.LineID; }).join(',') , '2 ' + ids.slice(0, 2).join(','));
    eq('U17 edited total', r.totals.total, 24380);
    eq('U18 revise → Rev 1, Draft', (run('reviseQuote', { quoteNo: U.q }), must(db, 'Quotes', 'QuoteNo', U.q).Rev), 1);
    eq('U19 mark sent', (run('setStatus', { type: 'Quote', no: U.q, status: 'Sent' }), must(db, 'Quotes', 'QuoteNo', U.q).Status), 'Sent');
    throws('U20 status not allowed', function () { run('setStatus', { type: 'Quote', no: U.q, status: 'Accepted' }); }, /cannot be set/);
  });
  step('U PI + job + challans', function () {
    U.pi = run('quoteToPI', { quoteNo: U.q, amount: '', date: '2026-11-21' }).ref;
    eq('U21 PI = advance', must(db, 'Proformas', 'PINo', U.pi).Amount, 12190);
    U.job = run('quoteToJob', { quoteNo: U.q, woNo: 'WO-55', woDate: '2026-11-22', date: '2026-11-22' }).ref;
    var j = must(db, 'Jobs', 'JobNo', U.job); eq('U22 job with WO', j.ClientWONo + ' ' + j.HireBasis + ' ' + fmtDay(dayNum(j.ClientWODate)), 'WO-55 Item 22-Nov-2026');
    throws('U23 quote with job cannot be edited', function () { run('saveQuote', { quoteNo: U.q, header: { QuoteType: 'Rental', CustID: 'CUST-0002' }, lines: [{ Description: 'x', Qty: 1, Rate: 1 }] }); }, /already has job/);
    throws('U24 nor revised', function () { run('reviseQuote', { quoteNo: U.q }); }, /already has job/);
    eq('U25 job details saved', (run('saveJob', { jobNo: U.job, SecDepAmount: '50000', SecDepChequeNo: '778899', SecDepStatus: 'Held', Status: 'Mobilising' }), j.SecDepStatus + ' ' + j.Status), 'Held Mobilising');
    throws('U26 job status must be in list', function () { run('saveJob', { jobNo: U.job, Status: 'Finished' }); }, /not in Lists/);
    postOpeningStock(db, [{ ItemCode: 'RL-STD-20', Qty: 80 }, { ItemCode: 'BD-ST-207', Qty: 40 }], '01-Nov-2026');
    var r = run('saveChallan', { kind: 'Delivery', jobNo: U.job, date: '2026-12-01', post: true, lines: [{ itemCode: 'RL-STD-20', qty: 100 }, { itemCode: 'BD-ST-207', qty: 40 }, { itemCode: '', qty: '' }] });
    eq('U27 over-delivery saved as draft, not posted', r.warn + ' ' + must(db, 'Challans', 'ChallanNo', r.ref).Status, 'true Draft');
    eq('U28 cancel draft', (run('cancelChallan', { no: r.ref }), must(db, 'Challans', 'ChallanNo', r.ref).Status), 'Cancelled');
    r = run('saveChallan', { kind: 'Delivery', jobNo: U.job, date: '2026-12-01', post: true, lines: [{ itemCode: 'RL-STD-20', qty: 80 }, { itemCode: 'BD-ST-207', qty: 40 }] });
    eq('U29 delivery posted, job on hire', must(db, 'Challans', 'ChallanNo', r.ref).Status + ' ' + must(db, 'Jobs', 'JobNo', U.job).Status, 'Posted On hire');
    eq('U30 job view: on hire', uiGetDb_(db, 'job', U.job).onHire.map(function (x) { return x.code + ' ' + x.qty; }).join(', '), 'RL-STD-20 80, BD-ST-207 40');
    eq('U31 yard stock lookup', JSON.stringify(uiGetDb_(db, 'stock', 'LOC-YARD')), '{}');
    throws('U32 damaged + lost > qty refused', function () { run('saveChallan', { kind: 'Return', jobNo: U.job, lines: [{ itemCode: 'BD-ST-207', qty: 2, qtyDamaged: 2, qtyLost: 1 }] }); }, /more than the quantity/);
    r = run('saveChallan', { kind: 'Return', jobNo: U.job, date: '2026-12-10', post: true, lines: [{ itemCode: 'BD-ST-207', qty: 40, qtyDamaged: 2, qtyLost: 1 }] });
    eq('U33 return with damage', r.damage, 1);
  });
  step('U billing + payments', function () {
    var h = run('hireBilling', { asOf: '2026-12-01', jobNo: U.job });
    eq('U34 hire invoice via panel ((80×90 + 40×40) × 1.15)', h.refs.length + ' ' + docInfo(db, 'INV', h.refs[0]).total, '1 10120');
    U.inv = h.refs[0];
    U.dn = run('damageDN', { jobNo: U.job, date: '2026-12-11', invNo: U.inv }).ref;
    eq('U35 debit note (2×200 + 1×1500)', must(db, 'Notes', 'NoteNo', U.dn).Amount, 1900);
    eq('U36 mark invoice sent', (run('setStatus', { type: 'INV', no: U.inv, status: 'Sent' }), must(db, 'Invoices', 'InvNo', U.inv).Status), 'Sent');
    var open = uiGetDb_(db, 'open', { partyType: 'Customer', partyId: 'CUST-0002' }).docs;
    eq('U37 open docs: PI dropped once invoiced', open.map(function (d) { return d.type + ' ' + d.balance; }).join(', '), 'INV 10120, DN 2185');
    throws('U38 cash refused', function () { run('recordPayment', { Direction: 'In', PartyID: 'CUST-0002', Method: 'Cash', Amount: 100 }); }, /no cash/);
    throws('U39 over-allocation refused before saving', function () { run('recordPayment', { Direction: 'In', PartyID: 'CUST-0002', Method: 'Cheque', Amount: 1000, allocations: [{ type: 'INV', no: U.inv, amount: 1500 }] }); }, /more than the payment/);
    eq('U40 nothing saved by the refused payment', db.rows('Payments').length, 0);
    var r = run('recordPayment', { Direction: 'In', PartyID: 'CUST-0002', PayDate: '2026-12-12', Method: 'Cheque', RefNo: '123456', Amount: 5000, allocations: [{ type: 'DN', no: U.dn, amount: 2185 }] });
    eq('U41 manual allocation to the DN only', docInfo(db, 'DN', U.dn).balance + ' ' + docInfo(db, 'INV', U.inv).balance, '0 10120');
    eq('U42 left unallocated', payAvailable(db, must(db, 'Payments', 'PayID', r.ref)), 2815);
    run('allocate', { payId: r.ref });
    eq('U43 rest allocated to the invoice', docInfo(db, 'INV', U.inv).balance, 7305);
    eq('U44 pending cheque listed', uiGetDb_(db, 'open', { partyType: 'Customer', partyId: 'CUST-0002' }).payments.map(function (p) { return p.id + ' ' + p.cheque; }).join(), r.ref + ' Pending');
  });
  step('U job extras', function () {
    var v = run('saveVariation', { jobNo: U.job, description: 'Extra lift', amount: '6000', status: 'Draft', date: '2026-12-05' }).ref;
    run('setVariation', { voNo: v, status: 'Approved' });
    eq('U45 variation approved', must(db, 'Variations', 'VONo', v).Status, 'Approved');
    throws('U46 variation needs amount', function () { run('saveVariation', { jobNo: U.job, description: 'x' }); }, /Amount/);
    var o = run('offHire', { jobNo: U.job, noticeDate: '2026-12-20', offHireDate: '2026-12-27', scope: 'Full' });
    eq('U47 off-hire notice', o.ref + ' ' + must(db, 'OffHire', 'OHNNo', o.ref).Scope, 'CAE/OHN/2026/001 Full');
    throws('U48 off-hire before notice refused', function () { run('offHire', { jobNo: U.job, noticeDate: '2026-12-20', offHireDate: '2026-12-01' }); }, /before the notice/);
    testQuote_(db, 'CAE/Q/2026/050', 'Project', [['', 'Lump sum works', 'lot', 1, '', 100000, 'Milestone']]);
    eq('U49 stages from panel', run('setMilestones', { quoteNo: 'CAE/Q/2026/050', stages: [['Start', 50], ['End', 50]] }).msg, '2 stages saved for CAE/Q/2026/050.');
    var q = uiGetDb_(db, 'quote', 'CAE/Q/2026/050');
    eq('U50 quote view: stage amounts', q.hasMs + ' ' + q.milestones.map(function (m) { return m.amount; }).join('/'), 'true 50000/50000');
  });
  step('U buying + expenses + lookups', function () {
    throws('U51 PO needs a supplier', function () { run('savePO', { SupID: 'SUP-9', lines: [] }); }, /not found/);
    var p = run('savePO', { SupID: 'SUP-0001', PODate: '2026-12-02', VATPct: '15%', lines: [{ ItemCode: 'TC-TUBE-3', Qty: 50, Rate: 900 }, { Description: 'Delivery', Unit: 'trip', Qty: 1, Rate: 2500 }, { ItemCode: '', Description: '' }] });
    var po = must(db, 'POs', 'PONo', p.ref), pl = db.rows('POLines').filter(function (l) { return l.PONo === p.ref; });
    eq('U52 PO + lines', p.ref + ' ' + po.Status + ' ' + po.DeliverTo + ' ' + pl.length + ' ' + pl[0].Description + ' ' + pl[0].Unit, 'CAE/PO/2026/001 Draft LOC-YARD 2 MS tube 3.0 m pc');
    eq('U53 PO open lines lookup', uiGetDb_(db, 'po', p.ref).lines.map(function (l) { return l.code + ' ' + l.open; }).join(), 'TC-TUBE-3 50');
    throws('U54 receive needs a qty', function () { run('receivePO', { poNo: p.ref, lines: [{ itemCode: 'TC-TUBE-3', qty: 0 }] }); }, /quantity/);
    run('receivePO', { poNo: p.ref, date: '2026-12-03', lines: [{ itemCode: 'TC-TUBE-3', qty: 30 }] });
    eq('U55 part received into yard', po.Status + ' ' + stockAt(db, 'TC-TUBE-3', 'LOC-YARD'), 'Part received 30');
    throws('U56 cancel PO with receipts blocked', function () { run('setStatus', { type: 'PO', no: p.ref, status: 'Cancelled' }); }, /goods received/);
    throws('U57 expense in cash refused', function () { run('saveExpense', { Category: 'Fuel', Payee: 'Pump', Amount: 500, Method: 'Cash' }); }, /no cash/);
    throws('U58 expense category must be in list', function () { run('saveExpense', { Category: 'Party', Payee: 'X', Amount: 500, Method: 'Cheque' }); }, /not in Lists/);
    var e = run('saveExpense', { ExpDate: '2026-12-04', Category: 'Transport', JobNo: U.job, Payee: 'Truck owner', Amount: '3500', Method: 'Bank transfer' });
    eq('U59 expense saved', e.ref + ' ' + must(db, 'Expenses', 'ExpID', e.ref).Amount, 'EXP-00001 3500');
    var d = uiGetDb_(db, 'docs');
    eq('U60 PDF pick lists', [d.Quote.length, d.PI.length, d.Invoice.length, d.Challan.length, d.PO.length, d.Note.length].join(' '), '2 1 1 3 1 1');
    var ch = uiGetDb_(db, 'challans'); eq('U61 challan lists', ch.drafts.length + ' ' + ch.posted.length, '0 2');
    var init = uiClean_(uiInitDb_(db));
    eq('U62 init data is panel-safe', JSON.stringify(init).indexOf('"_r"') < 0 && init.jobs[0].no === U.job && init.quotes.length === 2, true);
    eq('U63 log rows written', db.rows('Log').length > 20, true);
  });
  step('U panel html', function () {
    var html = uiHtml_('quotes', 'CAE/Q/2026/001');
    eq('U64 start screen injected', html.indexOf('var START = "quotes", ARG = "CAE/Q/2026/001"') >= 0, true);
    var used = {}, re = /act\('(\w+)'/g, m; while ((m = re.exec(UI_HTML_))) used[m[1]] = 1;
    var missing = Object.keys(used).filter(function (k) { return !UI_ACTIONS_[k]; });
    eq('U65 every panel action exists on the server', missing.join(',') || 'none', 'none');
    var gets = {}, rg = /call\('uiGet','(\w+)'/g; while ((m = rg.exec(UI_HTML_))) gets[m[1]] = 1;
    eq('U66 panel lookups', Object.keys(gets).sort().join(','), 'challans,docs,job,open,po,pos,quote,stock');
    var js = UI_HTML_.slice(UI_HTML_.indexOf('<script>') + 8, UI_HTML_.lastIndexOf('</script>'));
    eq('U67 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
