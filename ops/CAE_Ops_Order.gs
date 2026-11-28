/**
 * Core Access Ops — inventory ordering (stage O8) · 13 Nov 2026
 * Seventh script file, LAST: Apps Script › + › Script › name it CAE_Ops_Order › paste › Save › reload the sheet.
 * File order: Core, PDF, UI, Reports, App, Sets, Order. Then Core Access › Tools › Upgrade sheet for O8 (run once).
 * Replaces by name: onOpen (adds "Reorder" + upgrade item), menuAppSweep (Fix 6: no ":;" in the dialog).
 * Wraps: selfTestAllParts_ (adds the O8 self-test). Other files are unchanged.
 *
 * Reorder rule, per stock item with Items.ReorderLevel > 0 (sets are left out — order their parts):
 *   short = ReorderLevel − in yard − on order   (Repair does not count as available)
 *   on order = PO lines not yet received, on POs that are Draft / Sent / Part received
 *   suggest = short rounded up, at least Items.ReorderQty (minimum order) when set
 * Panel "Reorder": tick lines, adjust qty / supplier / rate → one Draft PO per supplier (yard delivery).
 * Supplier default = Items.PrefSupID; rate default = the item's last PO rate. The Reorder tab is a snapshot for
 * the office and the app (refreshed by the panel, the menu and every PO made from it).
 */
var CAE_O8_VERSION = 'O8 · 13 Nov 2026';
var REORDER_HEAD_ = ['ItemCode', 'Name', 'Unit', 'InYard', 'InRepair', 'OnOrder', 'ReorderLevel', 'Suggest', 'PrefSupID', 'LastRate', 'Updated'];

// ======================================================================= upgrade (run once, safe to repeat)
function upgradeO8(db) {
  var done = [], sh = !!db.ss;
  if (db.ensureColumn('Items', 'ReorderQty', 'ReorderLevel')) done.push('Items + ReorderQty');
  if (db.ensureColumn('Items', 'PrefSupID', 'ReorderQty')) { done.push('Items + PrefSupID'); if (sh) o7Rule_(db, 'Items', 'PrefSupID', 'Suppliers!$A$2:$A'); }
  if (db.ensureTab('Reorder', REORDER_HEAD_, [])) {
    done.push('Reorder tab');
    if (sh) db.sheet('Reorder').getRange(2, REORDER_HEAD_.length, 999, 1).setNumberFormat('dd-mmm-yyyy hh:mm');
  }
  log_(db, 'Upgrade O8', '', done.join('; ') || 'up to date');
  return done;
}
function menuUpgradeO8() { ui_('Upgrade sheet for O8', function (db) { var d = upgradeO8(db); return d.length ? 'Done:\n' + d.join('\n') + '\n\nNext: Items › ReorderLevel (and ReorderQty, PrefSupID) for the items you keep in stock.' : 'Already up to date.'; }); }

// ======================================================================= reorder list
function onOrder_(db) {
  var open = {}, got = {}, m = {};
  db.rows('POs').forEach(function (p) { if (['Draft', 'Sent', 'Part received', ''].indexOf(String(p.Status)) >= 0 && !blank(p.PONo)) open[p.PONo] = 1; });
  db.rows('StockMoves').forEach(function (v) { if (v.RefType === 'PO' && open[v.RefNo]) { var k = v.RefNo + '|' + v.ItemCode; got[k] = (got[k] || 0) + num(v.Qty); } });
  var ord = {};
  db.rows('POLines').forEach(function (l) { if (open[l.PONo] && !blank(l.ItemCode)) { var k = l.PONo + '|' + l.ItemCode; ord[k] = (ord[k] || 0) + num(l.Qty); } });
  Object.keys(ord).forEach(function (k) { var c = k.split('|')[1]; m[c] = (m[c] || 0) + Math.max(0, ord[k] - (got[k] || 0)); });
  return m;
}
function lastRates_(db) {
  var d = {}; db.rows('POs').forEach(function (p) { if (p.Status !== 'Cancelled') d[p.PONo] = dayNum(p.PODate) || 0; });
  var best = {};
  db.rows('POLines').forEach(function (l) {
    if (!(l.PONo in d) || !(num(l.Rate) > 0) || blank(l.ItemCode)) return;
    var b = best[l.ItemCode]; if (!b || d[l.PONo] >= b.d) best[l.ItemCode] = { d: d[l.PONo], r: num(l.Rate) };
  });
  var out = {}; Object.keys(best).forEach(function (k) { out[k] = best[k].r; }); return out;
}
function reorderList(db) {
  var bal = stockMap(db), oo = onOrder_(db), lr = lastRates_(db);
  return db.rows('Items').filter(function (i) {
    return !blank(i.ItemCode) && i.StockTracked === 'Yes' && !isSet_(i) && i.Status !== 'Inactive' && num(i.ReorderLevel) > 0;
  }).map(function (i) {
    var c = i.ItemCode, y = bal[c + '|' + LOC.YARD] || 0, rp = bal[c + '|' + LOC.REPAIR] || 0, o = oo[c] || 0, short = num(i.ReorderLevel) - y - o;
    return { code: c, name: i.Name, unit: i.Unit || '', yard: y, repair: rp, onOrder: o, level: num(i.ReorderLevel), short: short,
      suggest: short > 1e-9 ? Math.max(Math.ceil(short - 1e-9), num(i.ReorderQty)) : 0, sup: i.PrefSupID || '', rate: lr[c] || 0 };
  }).filter(function (x) { return x.suggest > 0; }).sort(function (a, b) { return a.code < b.code ? -1 : 1; });
}
function writeReorderTab(db, list) {
  list = list || reorderList(db);
  var now = new Date(), rows = list.map(function (x) { return [x.code, x.name, x.unit, x.yard, x.repair, x.onOrder, x.level, x.suggest, x.sup, x.rate || '', now]; });
  if (!db.ss) { db.t.Reorder = []; db.insert('Reorder', rows.map(function (r) { var o = {}; REORDER_HEAD_.forEach(function (k, j) { o[k] = r[j]; }); return o; })); return rows.length; }
  var s = db.sheet('Reorder'), n = s.getLastRow();
  if (n > 1) s.getRange(2, 1, n - 1, REORDER_HEAD_.length).clearContent();
  if (rows.length) s.getRange(2, 1, rows.length, REORDER_HEAD_.length).setValues(rows);
  db.c.Reorder = null;
  return rows.length;
}
// a = { date, lines: [{ code, qty, supId, rate }] } → one Draft PO per supplier, delivered to the yard
function makeReorderPOs(db, a) {
  var lines = (a.lines || []).filter(function (l) { return !blank(l.code) && num(l.qty) > 0; });
  if (!lines.length) throw new Error('Tick at least one item with a quantity');
  var miss = lines.filter(function (l) { return blank(l.supId); }).map(function (l) { return l.code; });
  if (miss.length) throw new Error('Choose a supplier for: ' + miss.join(', ') + ' (or set Items › PrefSupID)');
  var by = {}, order = [];
  lines.forEach(function (l) {
    var it = must(db, 'Items', 'ItemCode', l.code);
    if (it.StockTracked !== 'Yes' || isSet_(it)) throw new Error(l.code + ' is not a stock item (sets: order the parts)');
    if (num(l.rate) < 0) throw new Error(l.code + ': rate cannot be negative');
    must(db, 'Suppliers', 'SupID', l.supId);
    if (!by[l.supId]) { by[l.supId] = []; order.push(l.supId); }
    by[l.supId].push({ ItemCode: l.code, Qty: num(l.qty), Rate: num(l.rate) });
  });
  var refs = order.map(function (sup) { return uiSavePO_(db, { SupID: sup, PODate: a.date, DeliverTo: LOC.YARD, Notes: 'From reorder list', lines: by[sup] }).ref; });
  if (db.hasTab('Reorder')) writeReorderTab(db);
  log_(db, 'Reorder → POs', refs.join(', '), lines.length + ' lines');
  return { msg: refs.length + ' draft PO(s): ' + refs.join(', ') + '. Check rates, then make the PO PDF (PDF documents) and mark sent.', refs: refs };
}

// ======================================================================= panel
function o8Open() { SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(O8_HTML_).setTitle('Reorder')); }
function o8Init() { return uiClean_(o8InitDb_(new SheetDb())); }
function o8InitDb_(db) {
  return { today: today(), rows: reorderList(db), tab: db.hasTab('Reorder'),
    suppliers: db.rows('Suppliers').filter(function (s) { return !blank(s.SupID) && s.Status !== 'Inactive'; }).map(function (s) { return { id: s.SupID, name: s.Name }; }) };
}
var O8_ACTIONS_ = {
  makePOs: function (db, a) { return makeReorderPOs(db, a); },
  writeTab: function (db) { if (!db.hasTab('Reorder')) throw new Error('Run Tools › Upgrade sheet for O8 first'); return writeReorderTab(db) + ' item(s) written to the Reorder tab.'; },
};
function o8Do(action, args) {
  return uiClean_(withLock(function () {
    var f = O8_ACTIONS_[action]; if (!f) throw new Error('Unknown action ' + action);
    var r = f(new SheetDb(), args || {}); SpreadsheetApp.flush();
    return typeof r === 'string' ? { msg: r } : r;
  }));
}
function menuReorderTab() { ui_('Reorder list', function (db) { if (!db.hasTab('Reorder')) return 'Run Tools › Upgrade sheet for O8 first.'; var n = writeReorderTab(db); return n ? n + ' item(s) below their reorder level — see the Reorder tab, or open Core Access › Reorder to make POs.' : 'Nothing to order: every item with a ReorderLevel is covered by yard stock + open POs.'; }); }
var O8_HTML_ = `<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8"><style>
body{margin:0;font:12px/1.4 Arial,sans-serif;color:#2B3036}header{background:#000;color:#fff;padding:8px 10px;font-weight:700;letter-spacing:.08em}main{padding:10px}
.card{border:1px solid #D5D8DA;border-radius:4px;padding:6px 8px;margin:6px 0;background:#F3F5F6}.card b{display:block}.m{color:#5F676E;font-size:11px}
.g{display:grid;grid-template-columns:70px 1fr 76px;gap:4px;margin-top:4px}input,select{width:100%;box-sizing:border-box;font:inherit;padding:4px;border:1px solid #D5D8DA;border-radius:3px}
label.c{display:flex;gap:6px;align-items:flex-start;cursor:pointer}label.c input{width:auto;margin-top:2px}
button{background:#17707D;color:#fff;border:1px solid #17707D;border-radius:3px;padding:5px 9px;margin:8px 4px 0 0;cursor:pointer;font:inherit;font-weight:600}button.s{background:#fff;color:#17707D}
.msg{padding:6px 8px;border-left:4px solid #17707D;background:#EAF3F8;white-space:pre-wrap;margin-bottom:8px}.msg.e{border-color:#C62828;background:#FDECEA}</style></head><body>
<header>CORE ACCESS · REORDER</header><main><div id="msg"></div><div id="v">Loading…</div></main><script>
var D=null;function $(i){return document.getElementById(i);}function h(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function say(t,e){$('msg').innerHTML=t?'<div class="msg'+(e?' e':'')+'">'+h(t)+'</div>':'';}
function load(){google.script.run.withSuccessHandler(function(d){D=d;draw();}).withFailureHandler(function(e){say(e.message,1);}).o8Init();}
function act(a,x){google.script.run.withSuccessHandler(function(r){say(r.msg,r.warn);load();}).withFailureHandler(function(e){say(e.message,1);}).o8Do(a,x);}
function sup(v){return '<option value="">— supplier —</option>'+D.suppliers.map(function(s){return '<option value="'+h(s.id)+'"'+(s.id===v?' selected':'')+'>'+h(s.name)+'</option>';}).join('');}
function draw(){if(!D.rows.length){$('v').innerHTML='<p class=m>Nothing to order: every item with a ReorderLevel is covered by yard stock + open POs. Set levels in Items › ReorderLevel.</p>'+(D.tab?'<button class=s id=wt>Update Reorder tab</button>':'');if(D.tab)$('wt').onclick=function(){act('writeTab',{});};return;}
 $('v').innerHTML='<label>PO date</label><input id=dt type=date value="'+D.today+'"><p class=m>Short = reorder level − yard − on order (Repair not counted). One draft PO per supplier, delivered to the yard.</p>'+
 D.rows.map(function(r,i){return '<div class=card><label class=c><input type=checkbox class=k data-i='+i+' checked><span><b>'+h(r.code)+' — '+h(r.name)+'</b><span class=m>yard '+r.yard+' · repair '+r.repair+' · on order '+r.onOrder+' · level '+r.level+'</span></span></label>'+
 '<div class=g><input class=q type=number step=any value="'+r.suggest+'" title="Qty"><select class=s>'+sup(r.sup)+'</select><input class=r type=number step=any value="'+(r.rate||'')+'" placeholder="rate"></div></div>';}).join('')+
 '<button id=mk>Make draft PO(s)</button>'+(D.tab?'<button class=s id=wt>Update Reorder tab</button>':'');
 $('mk').onclick=function(){var cards=document.querySelectorAll('.card'),L=[];[].forEach.call(cards,function(c,i){if(c.querySelector('.k').checked)L.push({code:D.rows[i].code,qty:c.querySelector('.q').value,supId:c.querySelector('.s').value,rate:c.querySelector('.r').value});});act('makePOs',{date:$('dt').value,lines:L});};
 if(D.tab)$('wt').onclick=function(){act('writeTab',{});};}
load();</script></body></html>`;

// ======================================================================= Fix 6: sweep dialog without ":;"
function sweepLine_(x) { return x.no + (x.posted ? ' posted' : x.error ? ' — ' + String(x.error).replace(/:\s*\n/g, ': ').replace(/\n/g, '; ') : ' numbered'); }
function menuAppSweep() {
  ui_('Post app challans + conversions', function (db) {
    var r = appSweepRun_({ db: db, deadline: deadline_() });
    if (!r.done) return 'Nothing waiting from the app (Status = Submitted).';
    return r.done + ' from the app: ' + r.posted + ' posted, ' + r.failed + ' sent back to Draft (reason in AppMsg)' + (r.left ? ', ' + r.left + ' left for the next run' : '') + '.\n\n' + r.list.map(sweepLine_).join('\n');
  });
}

// ======================================================================= menu (replaces the O7 onOpen)
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
    .addItem('Stock: cut · repair · scrap · project measurement', 'o7Open')
    .addSeparator()
    .addItem('Billing: hire · milestones · invoices · debit notes', 'uiOpenBilling')
    .addItem('Record payment + allocate', 'uiOpenPayment')
    .addSeparator()
    .addItem('Reorder: low stock → draft POs', 'o8Open')
    .addItem('New PO', 'uiOpenPO')
    .addItem('Receive goods', 'uiOpenReceive')
    .addItem('Expense', 'uiOpenExpense')
    .addSeparator()
    .addItem('PDF documents', 'uiOpenPdf')
    .addItem('Dashboard', 'menuGoDashboard')
    .addSubMenu(ui.createMenu('AppSheet (mobile)')
      .addItem('Post app challans + conversions now', 'menuAppSweep')
      .addItem('QR labels: items', 'menuQrItems')
      .addItem('QR labels: locations', 'menuQrLocations')
      .addSeparator()
      .addItem('Start auto-posting (timed)', 'menuAppTriggerOn')
      .addItem('Stop auto-posting', 'menuAppTriggerOff')
      .addItem('Check AppSheet set-up', 'menuAppCheck')
      .addItem('Upgrade sheet for O6 (run once)', 'menuUpgradeO6'))
    .addSubMenu(ui.createMenu('Tools')
      .addItem('Number new rows + fill formulas', 'menuAssignIdsSafe')
      .addItem('Post opening stock (OpeningStock tab)', 'menuOpeningStock')
      .addItem('Update Reorder tab', 'menuReorderTab')
      .addItem('Refresh statuses', 'menuRefresh')
      .addItem('PDF sample set (test data → PDF/_Samples)', 'uiPdfSamples')
      .addItem('Rebuild report tabs', 'menuBuildReports')
      .addItem('Check set-up (time zone, files)', 'menuCheckSetup')
      .addItem('Upgrade sheet for O3 (run once)', 'menuUpgradeO3')
      .addItem('Upgrade sheet for O7 (run once)', 'menuUpgradeO7')
      .addItem('Upgrade sheet for O8 (run once)', 'menuUpgradeO8')
      .addItem('Run self-test', 'menuSelfTestAll'))
    .addToUi();
}

// ======================================================================= self-test (in memory, your data is not touched)
if (typeof selfTestAllParts_ === 'function') {
  var O8_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return O8_parts0_().concat([['O8', selfTestO8()]]); };
}
function selfTestO8() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws;
  var db = testSeed_('Full period');
  var item = function (code, p) { db.update('Items', must(db, 'Items', 'ItemCode', code), p); };
  var list = function () { return reorderList(db).map(function (x) { return x.code + ' ' + x.suggest; }).join(', ') || 'none'; };
  step('N upgrade', function () {
    upgradeO6(db); upgradeO7(db);
    eq('N1 columns + tab', upgradeO8(db).join(', '), 'Items + ReorderQty, Items + PrefSupID, Reorder tab');
    eq('N2 second run changes nothing', upgradeO8(db).length, 0);
    eq('N3 columns in order', db.headers('Items').slice(db.headers('Items').indexOf('ReorderLevel'), db.headers('Items').indexOf('ReorderLevel') + 3).join(','), 'ReorderLevel,ReorderQty,PrefSupID');
  });
  step('N reorder list', function () {
    eq('N4 no levels = nothing to order', list(), 'none');
    item('RL-STD-20', { ReorderLevel: 50, ReorderQty: 100, PrefSupID: 'SUP-0001' }); item('BD-ST-207', { ReorderLevel: 30 }); item('TC-TUBE-3', { ReorderLevel: 10 });
    item('SV-TRANS', { ReorderLevel: 5 }); item('AM-SET-D725', { ReorderLevel: 2 });
    postOpeningStock(db, [{ ItemCode: 'RL-STD-20', Qty: 20 }, { ItemCode: 'RL-STD-20', Qty: 5, LocID: 'LOC-REPAIR' }, { ItemCode: 'BD-ST-207', Qty: 40 }], '01-Nov-2026');
    eq('N5 short items only; min order qty; repair, services and sets not counted', list(), 'RL-STD-20 100, TC-TUBE-3 10');
    var r = reorderList(db)[0];
    eq('N6 row detail', [r.yard, r.repair, r.onOrder, r.level, r.short, r.sup].join(' '), '20 5 0 50 30 SUP-0001');
    item('TC-TUBE-3', { ReorderLevel: 10.5 });
    eq('N7 part quantities rounded up', reorderList(db)[1].suggest, 11);
    item('TC-TUBE-3', { ReorderLevel: 10 });
  });
  step('N on order + POs', function () {
    db.insert('POs', [{ PONo: 'CAE/PO/2026/090', SupID: 'SUP-0001', PODate: toDate('01-Nov-2026'), DeliverTo: 'LOC-YARD', Status: 'Sent', VATPct: 0 },
      { PONo: 'CAE/PO/2026/091', SupID: 'SUP-0001', PODate: toDate('02-Nov-2026'), DeliverTo: 'LOC-YARD', Status: 'Cancelled', VATPct: 0 }]);
    db.insert('POLines', [{ LineID: 'POL-09001', PONo: 'CAE/PO/2026/090', ItemCode: 'TC-TUBE-3', Qty: 6, Rate: 900 }, { LineID: 'POL-09002', PONo: 'CAE/PO/2026/091', ItemCode: 'TC-TUBE-3', Qty: 50, Rate: 950 }]);
    eq('N8 open PO counts as on order, cancelled PO ignored', list(), 'RL-STD-20 100, TC-TUBE-3 4');
    eq('N9 last rate from a live PO (cancelled skipped)', reorderList(db)[1].rate, 900);
    receivePO(db, 'CAE/PO/2026/090', [{ itemCode: 'TC-TUBE-3', qty: 2 }], '05-Nov-2026');
    eq('N10 part received: 2 in yard + 4 still on order', reorderList(db)[1].yard + ' ' + reorderList(db)[1].onOrder + ' ' + reorderList(db)[1].suggest, '2 4 4');
    throws('N11 no supplier refused, names the item', function () { makeReorderPOs(db, { date: '2026-11-13', lines: [{ code: 'TC-TUBE-3', qty: 4, supId: '' }] }); }, /supplier for: TC-TUBE-3/);
    throws('N12 nothing ticked refused', function () { makeReorderPOs(db, { lines: [{ code: 'TC-TUBE-3', qty: 0, supId: 'SUP-0001' }] }); }, /at least one/);
    throws('N13 set refused', function () { makeReorderPOs(db, { lines: [{ code: 'AM-SET-D725', qty: 1, supId: 'SUP-0001' }] }); }, /not a stock item/);
    throws('N14 unknown supplier refused', function () { makeReorderPOs(db, { lines: [{ code: 'TC-TUBE-3', qty: 1, supId: 'SUP-9' }] }); }, /not found/);
    eq('N15 refused calls made no PO', db.rows('POs').length, 2);
    db.insert('Suppliers', { SupID: 'SUP-0002', Name: 'Tube Mills', Status: 'Active' });
    var r = makeReorderPOs(db, { date: '2026-11-13', lines: [{ code: 'RL-STD-20', qty: 100, supId: 'SUP-0001', rate: 2500 }, { code: 'TC-TUBE-3', qty: 4, supId: 'SUP-0002', rate: '' }] });
    eq('N16 one draft PO per supplier', r.refs.join(' '), 'CAE/PO/2026/001 CAE/PO/2026/002');
    var p1 = must(db, 'POs', 'PONo', r.refs[0]), l1 = db.rows('POLines').filter(function (l) { return l.PONo === r.refs[0]; });
    eq('N17 PO header + line', [p1.Status, p1.DeliverTo, p1.SupID, l1.length, l1[0].ItemCode, l1[0].Qty, l1[0].Rate, l1[0].Unit].join(' '), 'Draft LOC-YARD SUP-0001 1 RL-STD-20 100 2500 pc');
    eq('N18 draft POs cover the shortfall: nothing left to order', list(), 'none');
    eq('N19 Reorder tab rewritten (empty now)', db.rows('Reorder').length, 0);
    db.update('POs', p1, { Status: 'Cancelled' });
    eq('N20 cancelling the PO brings the item back', list(), 'RL-STD-20 100');
    eq('N21 Reorder tab snapshot', writeReorderTab(db) + ' ' + db.rows('Reorder')[0].ItemCode + ' ' + db.rows('Reorder')[0].Suggest, '1 RL-STD-20 100');
  });
  step('N fix 6 + panel', function () {
    eq('N22 sweep dialog line has no ":;"', sweepLine_({ no: 'CAE/DC/2026/009', error: 'Not posted:\nRL-STD-20: only 0 at LOC-YARD\nBD-ST-207: qty must be > 0' }),
      'CAE/DC/2026/009 — Not posted: RL-STD-20: only 0 at LOC-YARD; BD-ST-207: qty must be > 0');
    var js = O8_HTML_.slice(O8_HTML_.indexOf('<script>') + 8, O8_HTML_.lastIndexOf('</script>'));
    eq('N23 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
    var used = {}, re = /act\('(\w+)'/g, m; while ((m = re.exec(O8_HTML_))) used[m[1]] = 1;
    eq('N24 every panel action exists on the server', Object.keys(used).filter(function (k) { return !O8_ACTIONS_[k]; }).join(',') || 'none', 'none');
    var init = uiClean_(o8InitDb_(db));
    eq('N25 panel data', init.rows.length + ' ' + init.suppliers.length + ' ' + init.tab + ' ' + (JSON.stringify(init).indexOf('"_r"') < 0), '1 2 true true');
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}

