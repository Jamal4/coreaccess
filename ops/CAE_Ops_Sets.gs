/**
 * Core Access Ops — sets, cut / repair / scrap, damage charging, app roles, measured project billing (stage O7) · 11 Nov 2026
 * Sixth script file, LAST: Apps Script › + › Script › name it CAE_Ops_Sets › paste › Save › reload the sheet.
 * File order: Core, PDF, UI, Reports, App, Sets. Then Core Access › Tools › Upgrade sheet for O7 (run once, safe to repeat).
 * Replaces by name (last definition wins): postChallan, cancelChallan, jobEvents, hireUnits, oneOffLines_,
 * damageToDebitNote, uiSaveChallan_, appSweep, onOpen, menuSelfTestAll. Wraps: defaults_, uiInitDb_, uiGetDb_,
 * appProcessChallan_, appSweepRun_. Other files are unchanged.
 *
 * Sets (Items.IsSet = Yes + KitParts): a quote / challan line may use a set code (priced per set). Posting explodes the
 *   sets into part StockMoves (tagged StockMoves.SetCode). Sets on hire are counted from the set lines of posted challans,
 *   so hire is billed per set; loose parts are billed per part. A set comes back on a set line (whole sets); a damaged or
 *   lost part of those sets goes on a line for the part with Qty 0 and the damaged / lost count. Damage rows are per part.
 * Cut / repair / scrap (Conversions + ConvLines): from the yard or Repair; output of the same item = repaired → yard,
 *   other items = cut pieces → yard, the rest of the start quantity → LOC-SCRAP (write-off value logged).
 * Damage.Chargeable (Yes / No): Yes by default on Rental jobs, blank on others until the office decides; debit notes
 *   only from Yes; No → Waived when the debit note runs. Damage.Outcome = Repaired / Cut / Scrapped (physical state).
 * App: challan types Delivery / Sale / Return (Transfer office-only, Settings AppAllowTransfer); app challans and
 *   conversions are posted only for Staff with AppRole Field or Admin (Settings AppCheckRole).
 * Project monthly per-unit lines: Measures tab (job, quote line, date, measured qty) — billed qty follows the latest
 *   measurement; lines without measurements bill the quote qty (monthly lump sums: unit lot, qty 1).
 */
var CAE_O7_VERSION = 'O7 · 11 Nov 2026';
LOC.SCRAP = 'LOC-SCRAP';
var O7_SETTINGS_ = [
  ['AppCheckRole', 'Yes', 'Post app challans / conversions only for Staff with AppRole Field or Admin (matched by Email)'],
  ['AppAllowTransfer', 'No', 'Transfer challans from the app: No = office only (panel)'],
];
var APP_ROLES_ = ['Admin', 'Viewer', 'Field'];
var OUTCOMES_ = ['Repaired', 'Cut', 'Scrapped'];
ID_SERIES.KitParts = ['KitPartID', 'KP']; ID_SERIES.Conversions = ['ConvID', 'CV', 'ConvDate'];
ID_SERIES.ConvLines = ['ConvLineID', 'CVL']; ID_SERIES.Measures = ['MeasID', 'MEA'];
var O7_defaults0_ = defaults_;
defaults_ = function (db, t, r) {
  var p = O7_defaults0_(db, t, r);
  if (t === 'Conversions') { if (blank(r.Status)) p.Status = 'Draft'; if (blank(r.ConvDate)) p.ConvDate = today(); }
  if (t === 'ConvLines' && blank(r.Kind)) p.Kind = 'Output';
  if (t === 'Measures' && blank(r.MeasDate)) p.MeasDate = today();
  return p;
};
function o7Date_(v) { return blank(v) ? today() : (typeof uiDate_ === 'function' ? uiDate_(v) : toDate(v)); }

// ======================================================================= aluminium mobile sets (supplier lists 2 Nov 2026)
// [code, name, size / supplier code]
var ALU_PARTS_ = [
  ['AM-CT8', 'Alu mobile castor wheel 8 in', 'CT8'], ['AM-ALS', 'Alu mobile adjustable leg', 'ALS'],
  ['AM-HB-D', 'Alu mobile horizontal brace, double width', 'HB1'], ['AM-DB-D', 'Alu mobile diagonal brace, double width', 'DB1'],
  ['AM-FR4-D', 'Alu mobile frame 4-rung, double width 1.35 m', 'RD4'], ['AM-LF4-D', 'Alu mobile ladder frame 4-rung, double width 1.35 m', 'LRD4'],
  ['AM-FR5-D', 'Alu mobile frame 5-rung, double width 1.35 m', 'RD5'], ['AM-LF5-D', 'Alu mobile ladder frame 5-rung, double width 1.35 m', 'LRD5'],
  ['AM-GR-D', 'Alu mobile guardrail frame, double width', 'RD2'], ['AM-PB-D', 'Alu mobile platform board', 'PP1'],
  ['AM-PBT-D', 'Alu mobile trapdoor platform board', 'TP1'], ['AM-OR26', 'Alu mobile outrigger 2.6 m', 'STAB2'],
  ['AM-OR30', 'Alu mobile outrigger 3.0 m', 'S190'], ['AM-OR50', 'Alu mobile outrigger 5.0 m', '5 m'],
  ['AM-HB-S', 'Alu mobile horizontal brace, single width', 'HB2'], ['AM-DB-S', 'Alu mobile diagonal brace, single width', 'DB2'],
  ['AM-FR4-S', 'Alu mobile frame 4-rung, single width 0.75 m', 'RGD4'], ['AM-LF4-S', 'Alu mobile ladder frame 4-rung, single width 0.75 m', 'RD4 (single)'],
  ['AM-FR5-S', 'Alu mobile frame 5-rung, single width 0.75 m', 'RGD5'], ['AM-LF5-S', 'Alu mobile ladder frame 5-rung, single width 0.75 m', 'RD5 (single)'],
  ['AM-GR-S', 'Alu mobile guardrail frame, single width', 'RD2 (single)'], ['AM-PBT-S', 'Alu mobile trapdoor platform board, single width', 'PP1 (single)'],
];
var ALU_SETS_ = [
  ['AM-SET-S725', 'Alu mobile tower, single width 0.75 × 2.0 m, 7.25 m high', '0.75 × 2.0 × 7.25 m',
    [['AM-CT8', 4], ['AM-ALS', 4], ['AM-HB-S', 10], ['AM-DB-S', 10], ['AM-LF4-S', 2], ['AM-FR4-S', 2], ['AM-LF5-S', 1], ['AM-FR5-S', 1], ['AM-GR-S', 2], ['AM-PBT-S', 3], ['AM-OR30', 4]]],
  ['AM-SET-D725', 'Alu mobile tower, double width 1.35 × 2.0 m, 7.25 m high', '1.35 × 2.0 × 7.25 m',
    [['AM-CT8', 4], ['AM-ALS', 4], ['AM-HB-D', 10], ['AM-DB-D', 12], ['AM-FR4-D', 2], ['AM-LF4-D', 2], ['AM-FR5-D', 1], ['AM-LF5-D', 1], ['AM-GR-D', 2], ['AM-OR26', 4], ['AM-PB-D', 3], ['AM-PBT-D', 1]]],
  ['AM-SET-D114', 'Alu mobile tower, double width 1.35 × 2.0 m, 11.4 m high', '1.35 × 2.0 × 11.4 m',
    [['AM-CT8', 4], ['AM-ALS', 4], ['AM-HB-D', 14], ['AM-DB-D', 20], ['AM-FR5-D', 2], ['AM-LF5-D', 2], ['AM-FR4-D', 3], ['AM-LF4-D', 3], ['AM-GR-D', 2], ['AM-PB-D', 5], ['AM-PBT-D', 1], ['AM-OR50', 4]]],
];
function seedAluSets_(db) {
  var items = db.rows('Items'), add = [], kp = [];
  if (db.ss) { ensureAllowed_(db, 'Items', 'Category', ['Aluminium mobile']); ensureAllowed_(db, 'Items', 'Unit', ['pc', 'set']); }
  ALU_PARTS_.forEach(function (p) {
    if (!find(items, 'ItemCode', p[0])) add.push({ ItemCode: p[0], Name: p[1], Category: 'Aluminium mobile', Size: p[2], Unit: 'pc', StockTracked: 'Yes', ForHire: 'Yes', IsSet: 'No', Status: 'Active' });
  });
  ALU_SETS_.forEach(function (s) {
    if (!find(items, 'ItemCode', s[0])) add.push({ ItemCode: s[0], Name: s[1], Category: 'Aluminium mobile', Size: s[2], Unit: 'set', StockTracked: 'No', ForHire: 'Yes', IsSet: 'Yes', Status: 'Active' });
    if (!db.rows('KitParts').some(function (k) { return k.SetCode === s[0]; })) s[3].forEach(function (x) { kp.push({ SetCode: s[0], ItemCode: x[0], QtyPerSet: x[1] }); });
  });
  if (add.length) db.insert('Items', add);
  if (kp.length) { var ids = nextIds(db, 'KP', kp.length); kp.forEach(function (k, i) { k.KitPartID = ids[i]; }); db.insert('KitParts', kp); }
  return add.length || kp.length ? add.length + ' items + ' + kp.length + ' set parts (aluminium mobile)' : '';
}

// ======================================================================= upgrade (menu, run once, safe to repeat)
// Validation helpers (sheet only). rule = list of values, 'Tab!$A$2:$A' (dropdown, warning only), or null (none).
function o7Rule_(db, tab, col, rule) {
  var s = db.sheet(tab), c = db.headers(tab).indexOf(col) + 1; if (c < 1) return;
  var rng = s.getRange(2, c, Math.max(s.getMaxRows() - 1, 1), 1);
  if (!rule) { rng.clearDataValidations(); return; }
  var b = SpreadsheetApp.newDataValidation();
  b = Array.isArray(rule) ? b.requireValueInList(rule, true).setAllowInvalid(false) : b.requireValueInRange(db.ss.getRange(rule), true).setAllowInvalid(true);
  rng.setDataValidation(b.build());
}
// Makes values valid in a column's existing dropdown (list or Lists range, extended if full). Returns the values added.
function ensureAllowed_(db, tab, col, values) {
  var s = db.sheet(tab), c = db.headers(tab).indexOf(col) + 1; if (c < 1) return [];
  var dv = s.getRange(2, c).getDataValidation(); if (!dv) return [];
  var T = SpreadsheetApp.DataValidationCriteria, type = dv.getCriteriaType(), args = dv.getCriteriaValues(), added = [];
  var all = s.getRange(2, c, Math.max(s.getMaxRows() - 1, 1), 1);
  if (type === T.VALUE_IN_LIST) {
    var list = args[0].map(String);
    values.forEach(function (v) { if (list.indexOf(v) < 0) { list.push(v); added.push(v); } });
    if (added.length) all.setDataValidation(dv.copy().requireValueInList(list, args[1]).build());
  } else if (type === T.VALUE_IN_RANGE) {
    var r = args[0], vals = r.getValues().map(function (x) { return String(x[0]); }), miss = values.filter(function (v) { return vals.indexOf(v) < 0; });
    if (!miss.length) return [];
    var free = []; vals.forEach(function (v, i) { if (v === '') free.push(i); });
    var n = r.getNumRows(), sh = r.getSheet();
    miss.forEach(function (v) { var i = free.length ? free.shift() : n++; sh.getRange(r.getRow() + i, r.getColumn()).setValue(v); added.push(v); });
    if (n > r.getNumRows()) all.setDataValidation(dv.copy().requireValueInRange(sh.getRange(r.getRow(), r.getColumn(), n, 1), args[1]).build());
  }
  return added;
}
function o7Relax_(db, tab, col) {
  if (!db.hasTab(tab)) return;
  var s = db.sheet(tab), c = db.headers(tab).indexOf(col) + 1; if (c < 1) return;
  var dv = s.getRange(2, c).getDataValidation(); if (!dv || dv.getAllowInvalid()) return;
  s.getRange(2, c, Math.max(s.getMaxRows() - 1, 1), 1).setDataValidation(dv.copy().setAllowInvalid(true).build());
}
function upgradeO7(db) {
  var done = [], sh = !!db.ss;
  var col = function (t, c, after, rule) { if (db.ensureColumn(t, c, after)) { done.push(t + ' + ' + c); if (sh) o7Rule_(db, t, c, rule); } };
  col('Items', 'IsSet', 'StockTracked', ['Yes', 'No']);
  col('Damage', 'Chargeable', 'Charge', ['Yes', 'No']);
  col('Damage', 'Outcome', 'Status', OUTCOMES_);
  col('Staff', 'AppRole', 'Access', APP_ROLES_);
  col('StockMoves', 'SetCode', 'PostedAt', null);
  var tab = function (t, h, rules, dates) {
    if (!db.ensureTab(t, h, [])) return;
    done.push(t + ' tab');
    if (!sh) return;
    Object.keys(rules).forEach(function (k) { o7Rule_(db, t, k, rules[k]); });
    (dates || []).forEach(function (k) { db.sheet(t).getRange(2, h.indexOf(k) + 1, 999, 1).setNumberFormat('dd-mmm-yyyy'); });
  };
  tab('KitParts', ['KitPartID', 'SetCode', 'ItemCode', 'QtyPerSet'], { SetCode: 'Items!$A$2:$A', ItemCode: 'Items!$A$2:$A' });
  tab('Conversions', ['ConvID', 'ConvDate', 'LocID', 'FromItem', 'FromQty', 'DamageID', 'Status', 'SubmittedBy', 'AppMsg', 'Notes', 'WriteOff'],
    { LocID: [LOC.YARD, LOC.REPAIR], FromItem: 'Items!$A$2:$A', DamageID: 'Damage!$A$2:$A', Status: ['Draft', 'Submitted', 'Posted', 'Cancelled'] }, ['ConvDate']);
  tab('ConvLines', ['ConvLineID', 'ConvID', 'ToItem', 'Qty', 'Kind'], { ConvID: 'Conversions!$A$2:$A', ToItem: 'Items!$A$2:$A', Kind: ['Output', 'Scrap'] });
  tab('Measures', ['MeasID', 'JobNo', 'MeasDate', 'LineID', 'Qty', 'Notes'], { JobNo: 'Jobs!$A$2:$A', LineID: 'QuoteLines!$A$2:$A' }, ['MeasDate']);
  O7_SETTINGS_.forEach(function (s) {
    if (find(db.rows('Settings'), 'Key', s[0])) return;
    var row = { Key: s[0], Value: s[1] }; if (db.headers('Settings').indexOf('Notes') >= 0) row.Notes = s[2];
    db.insert('Settings', row); done.push('Settings ' + s[0]);
  });
  var yr = String(today().getFullYear()), seqs = db.rows('Sequences');
  [['CV', 'CAE/CV/', yr, 3], ['CVL', 'CVL-', '', 6], ['KP', 'KP-', '', 4], ['MEA', 'MEA-', '', 5]].forEach(function (s) {
    var key = s[2] ? s[0] + '-' + s[2] : s[0];
    if (seqs.some(function (x) { return x.SeqKey === s[0] || String(x.SeqKey).indexOf(s[0] + '-') === 0; })) return;
    db.insert('Sequences', { SeqKey: key, Prefix: s[1], Year: s[2], Pad: s[3], LastNo: 0 }); done.push('Sequences ' + key);
  });
  if (sh) {
    [['Locations', 'Type', ['Scrap']], ['StockMoves', 'RefType', ['Conversion', 'Conversion-Cancel']], ['Damage', 'Status', ['Waived']]].forEach(function (x) {
      var a = ensureAllowed_(db, x[0], x[1], x[2]); if (a.length) done.push(x[0] + '.' + x[1] + ' dropdown + ' + a.join(', '));
    });
    o7Relax_(db, 'ChallanLines', 'ChallanNo');
  }
  if (!find(db.rows('Locations'), 'LocID', LOC.SCRAP)) { db.insert('Locations', { LocID: LOC.SCRAP, Name: 'Scrap / write-off', Type: 'Scrap', SiteID: '', Status: 'Active' }); done.push('Location LOC-SCRAP'); }
  var seed = seedAluSets_(db); if (seed) done.push(seed);
  log_(db, 'Upgrade O7', '', done.join('; ') || 'up to date');
  return done;
}

// ======================================================================= sets
function isSet_(it) { return !!it && String(it.IsSet) === 'Yes'; }
function setMap_(db) { var m = {}; db.rows('Items').forEach(function (i) { if (isSet_(i)) m[i.ItemCode] = 1; }); return m; }
function kitParts_(db, code) {
  if (!db.hasTab('KitParts')) throw new Error(code + ' is a set but the KitParts tab is missing — run Upgrade sheet for O7');
  var items = db.rows('Items'), m = {}, order = [];
  db.rows('KitParts').forEach(function (k) {
    if (String(k.SetCode) !== String(code)) return;
    var p = String(k.ItemCode), it = find(items, 'ItemCode', p);
    if (!it) throw new Error(code + ': part ' + p + ' is not in Items');
    if (isSet_(it)) throw new Error(code + ': part ' + p + ' is itself a set');
    if (it.StockTracked !== 'Yes') throw new Error(code + ': part ' + p + ' is not stock-tracked');
    if (!(num(k.QtyPerSet) > 0)) throw new Error(code + ': part ' + p + ' needs QtyPerSet more than 0');
    if (!(p in m)) { m[p] = 0; order.push(p); }
    m[p] += num(k.QtyPerSet);
  });
  if (!order.length) throw new Error(code + ' is a set but has no parts in KitParts');
  return order.map(function (p) { return { item: p, qty: m[p] }; });
}
// Whole sets that can be made from the parts at a location.
function setAvail_(db, code, loc, bal) {
  var k; try { k = kitParts_(db, code); } catch (e) { return 0; }
  bal = bal || stockMap(db);
  return Math.max(0, Math.min.apply(null, k.map(function (p) { return Math.floor(((bal[p.item + '|' + loc] || 0) + 1e-9) / p.qty); })));
}

// ======================================================================= challans with sets (replaces Core's)
// M8 rent-in: StockMoves.Owner = '' (Core Access own stock) or the SupID of the supplier the items are rented from. Rows without the
// column / blank = own. Totals (stockMap) are unchanged; a post takes own first then rented (Delivery, Transfer), own only (Sale), that
// supplier only (Off-hire) and rented first (Return, from the job's own site balance); a cancel checks and reverses per owner.
var CH_YK_ = ['Transfer', 'Hire-in', 'Off-hire']; // kinds without a job
// r34 F5 (office post, o.outside): Delivery / Sale / Return post what our stock has (Return: what is ours on that job's site); the rest is from outside:
// no StockMoves, kept on the line as ChallanLines.QtyOut (loose items) so hire and billing still count the full qty. A Return does so on every path
// (sheet panel, field app): outside items never come into our yard.
var CH_CAP_ = ['Delivery', 'Sale', 'Return'];
function chOwnCol_(db) { return db.hasTab('StockMoves') && db.headers('StockMoves').indexOf('Owner') >= 0; }
function chOwnOf_(v) { return blank(v.Owner) ? '' : String(v.Owner); }
function chOwnMap_(db, jobNo) { // item|loc -> {owner: qty}; jobNo: only that job's moves
  var m = {}, add = function (k, o, q) { var x = m[k] = m[k] || {}; x[o] = (x[o] || 0) + q; };
  db.rows('StockMoves').forEach(function (v) {
    if (jobNo != null && v.JobNo !== jobNo) return;
    var q = num(v.Qty), o = chOwnOf_(v); if (!q) return;
    if (!blank(v.ToLoc)) add(v.ItemCode + '|' + v.ToLoc, o, q);
    if (!blank(v.FromLoc)) add(v.ItemCode + '|' + v.FromLoc, o, -q);
  });
  return m;
}
function chOwners_(kind, sup, pool) { // owners a post may take from, in order
  var rent = Object.keys(pool || {}).filter(function (o) { return o; }).sort();
  if (kind === 'Sale') return [''];
  if (kind === 'Off-hire') return [sup];
  if (kind === 'Return') return rent.concat(['']);
  return [''].concat(rent);
}
function chBal_(db, kind, sup) { // item|loc -> qty this kind may take (the checks below)
  if (kind !== 'Sale' && kind !== 'Off-hire') return stockMap(db);
  var om = chOwnCol_(db) ? chOwnMap_(db) : null, out = {};
  if (!om) return kind === 'Sale' ? stockMap(db) : out; // no Owner column: everything is own
  Object.keys(om).forEach(function (k) { out[k] = om[k][kind === 'Sale' ? '' : sup] || 0; });
  return out;
}
// mv = [[item, qty, from, to, set]] -> the same with the owner as [5], split where one move takes from two owners
function chSplit_(db, c, kind, sup, mv, jobNo, errs, outs) { // mv[i][5] = the line index (-1: a set part); outs: line index -> qty from outside
  var supIn = function (loc) { return locType(db, loc) === 'Supplier'; }, om = chOwnMap_(db), jm = kind === 'Return' ? chOwnMap_(db, jobNo) : null, out = [];
  mv.forEach(function (m) {
    // CR M8 run 4: a Sale takes own stock only, also from a Supplier location (no own stock there -> not posted)
    if (supIn(m[2]) && kind !== 'Sale') { out.push(m.slice(0, 5).concat([kind === 'Hire-in' || kind === 'Delivery' ? sup : ''])); return; }
    var k = m[0] + '|' + m[2], pool = (jm || om)[k] = (jm || om)[k] || {}, left = m[1];
    chOwners_(kind, sup, pool).forEach(function (o) {
      var have = Math.max(0, pool[o] || 0), t = Math.min(left, have); if (!(t > 1e-9)) return;
      out.push([m[0], t, m[2], m[3], m[4], o]); pool[o] = have - t; left -= t;
      if (jm && om[k]) om[k][o] = (om[k][o] || 0) - t;
    });
    if (left > 1e-9) { if (outs && CH_CAP_.indexOf(kind) >= 0) { if (m[5] >= 0) outs[m[5]] = (outs[m[5]] || 0) + left; } else if (kind === 'Return' || kind === 'Transfer' || kind === 'Delivery') out.push([m[0], left, m[2], m[3], m[4], '']); else errs.push(m[0] + ': only ' + (m[1] - left) + (kind === 'Sale' ? ' of our own stock' : ' of ' + sup + '\'s items') + ' at ' + m[2] + ', needs ' + m[1]); }
  });
  return out;
}
function postChallan(db, no, o) {
  o = o || {};
  var c = must(db, 'Challans', 'ChallanNo', no);
  if (c.Status !== 'Draft' && !blank(c.Status)) throw new Error(no + ' is ' + c.Status + ', only Draft challans can be posted');
  var fromQ = blank(c.JobNo) && !blank(c.QuoteNo) && CH_YK_.indexOf(c.Kind) < 0; // r28 F1: made from a quote: its job is made at Post (Awaiting order, no PO needed)
  if (String(c.MatSource || '') === 'Vendor') { // r28 F2: vendor rental, not our stock: no StockMoves (every post path: office, sheet panel)
    if (fromQ && !db.rows('ChallanLines').some(function (l) { return l.ChallanNo === no; })) throw new Error(no + ' has no lines');
    return chPostVendor_(db, fromQ ? chQuoteJob_(db, c) : c);
  }
  var kind = c.Kind, yk = CH_YK_.indexOf(kind) >= 0, job = fromQ || (yk && blank(c.JobNo)) ? null : must(db, 'Jobs', 'JobNo', c.JobNo), jn = job ? job.JobNo : ''; // E3b-4: a quote's job only after every check passed
  var date = c.ChallanDate ? toDate(c.ChallanDate) : today(), ret = kind === 'Return', sup = blank(c.SupID) ? '' : String(c.SupID), oc = chOwnCol_(db);
  var lines = db.rows('ChallanLines').filter(function (l) { return l.ChallanNo === no; });
  if (!lines.length) throw new Error(no + ' has no lines');
  ['FromLoc', 'ToLoc'].forEach(function (k) { if (!locType(db, c[k])) throw new Error(no + ': unknown location ' + c[k]); });
  if ((kind === 'Hire-in' || kind === 'Off-hire') && (!oc || !sup)) throw new Error(no + ': ' + kind + ' needs the supplier and the StockMoves Owner column');
  if (kind === 'Hire-in' && locType(db, c.FromLoc) !== 'Supplier') throw new Error(no + ': Hire-in comes from the supplier location');
  if (kind === 'Off-hire' && (locType(db, c.ToLoc) !== 'Supplier' || locType(db, c.FromLoc) === 'Supplier')) throw new Error(no + ': Off-hire goes from our location to the supplier location');
  var items = db.rows('Items'), bal = chBal_(db, kind, sup), hire = job ? onHire(db, jn) : {}, errs = [], mv = [], dmg = [];
  var fromSupplier = locType(db, c.FromLoc) === 'Supplier', cap = (kind === 'Return' || (!!o.outside && CH_CAP_.indexOf(kind) >= 0)) && !fromSupplier, tag = db.headers('StockMoves').indexOf('SetCode') >= 0;
  var exp = {}, order = [], loose = [], rc = {}, anySet = false;
  lines.forEach(function (l) {
    var it = find(items, 'ItemCode', l.ItemCode), q = num(l.Qty), d = num(l.QtyDamaged), lo = num(l.QtyLost);
    if (!it) { errs.push('Unknown item ' + l.ItemCode); return; }
    if (isSet_(it)) {
      anySet = true;
      if (!(q > 0) || Math.abs(q - Math.round(q)) > 1e-9) { errs.push(l.ItemCode + ': number of sets must be a whole number more than 0'); return; }
      if (ret && (d || lo || (!blank(l.QtyGood) && Math.abs(num(l.QtyGood) - q) > 1e-9))) { errs.push(l.ItemCode + ': a set line counts whole sets — put a damaged / lost part on its own line with Qty 0 (e.g. platform board: Qty 0, damaged 1)'); return; }
      if (ret) {
        if ((hire[l.ItemCode] || 0) < q - 1e-9) { errs.push(l.ItemCode + ': only ' + (hire[l.ItemCode] || 0) + ' set(s) on hire for ' + jn); return; }
        hire[l.ItemCode] -= q;
      }
      try { kitParts_(db, l.ItemCode).forEach(function (p) { if (!exp[p.item]) { exp[p.item] = []; order.push(p.item); } exp[p.item].push({ set: l.ItemCode, qty: q * p.qty }); }); }
      catch (e) { errs.push(e.message); }
      return;
    }
    if (it.StockTracked !== 'Yes') { if (!(q > 0)) errs.push(l.ItemCode + ': qty must be > 0'); return; } // services / non-stock lines: no stock movement
    if (ret && !(q > 0) && d + lo > 0) { var r = rc[l.ItemCode] = rc[l.ItemCode] || { d: 0, lo: 0 }; r.d += d; r.lo += lo; return; } // part of the sets above
    if (!(q > 0)) { errs.push(l.ItemCode + ': qty must be > 0'); return; }
    loose.push(l);
  });
  if (anySet && !tag) throw new Error('Run Core Access › Tools › Upgrade sheet for O7 before posting sets');
  Object.keys(rc).forEach(function (code) {
    var tot = sum(exp[code] || [], function (e) { return e.qty; });
    if (!exp[code]) errs.push(code + ': a Qty 0 line is for damaged / lost parts of the sets on this challan, but no set on it has ' + code);
    else if (rc[code].d + rc[code].lo > tot + 1e-9) errs.push(code + ': ' + (rc[code].d + rc[code].lo) + ' damaged / lost, but the sets on this challan have only ' + tot);
  });
  order.forEach(function (code) {
    var list = exp[code], tot = sum(list, function (e) { return e.qty; }), k = code + '|' + c.FromLoc, have = bal[k] || 0;
    var sets = list.map(function (e) { return e.set; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ');
    if (!fromSupplier && have < tot - 1e-9 && !o.allowNegative && !cap) { errs.push(code + ' (part of ' + sets + '): only ' + have + ' at ' + c.FromLoc + ', the sets need ' + tot); return; }
    bal[k] = have - tot;
    var d = ret && rc[code] ? rc[code].d : 0, lo = ret && rc[code] ? rc[code].lo : 0, d0 = d, lo0 = lo;
    list.forEach(function (e) {
      var a = Math.min(d, e.qty), b = Math.min(lo, e.qty - a), g = e.qty - a - b; d -= a; lo -= b;
      if (g > 1e-9) mv.push([code, g, c.FromLoc, c.ToLoc, e.set, -1]);
      if (a > 1e-9) mv.push([code, a, c.FromLoc, LOC.REPAIR, e.set, -1]);
      if (b > 1e-9) mv.push([code, b, c.FromLoc, LOC.LOST, e.set, -1]);
    });
  });
  var sets = setMap_(db), inSets = function (code) {
    return Object.keys(hire).some(function (S) { if (!sets[S] || !(hire[S] > 1e-9)) return false; try { return kitParts_(db, S).some(function (p) { return p.item === code; }); } catch (e) { return false; } });
  };
  loose.forEach(function (l) {
    var q = num(l.Qty), li = lines.indexOf(l);
    if (ret) {
      var d = num(l.QtyDamaged), lo = num(l.QtyLost), g = blank(l.QtyGood) ? q - d - lo : num(l.QtyGood);
      if (g < 0 || Math.abs(g + d + lo - q) > 1e-9) { errs.push(l.ItemCode + ': good + damaged + lost must equal qty ' + q); return; }
      if ((hire[l.ItemCode] || 0) < q - 1e-9) {
        errs.push(l.ItemCode + ': only ' + (hire[l.ItemCode] || 0) + ' on hire for ' + jn + (inSets(l.ItemCode) ? ' outside sets — parts of a set come back on the set line; a damaged / lost part goes on a line with Qty 0' : ''));
        return;
      }
      hire[l.ItemCode] -= q;
      if (g) mv.push([l.ItemCode, g, c.FromLoc, c.ToLoc, '', li]);
      if (d) mv.push([l.ItemCode, d, c.FromLoc, LOC.REPAIR, '', li]);
      if (lo) mv.push([l.ItemCode, lo, c.FromLoc, LOC.LOST, '', li]);
    } else {
      var k = l.ItemCode + '|' + c.FromLoc, have = bal[k] || 0;
      if (!fromSupplier && have < q - 1e-9 && !o.allowNegative && !cap) { errs.push(l.ItemCode + ': only ' + have + (kind === 'Sale' && oc ? ' of our own stock' : kind === 'Off-hire' ? ' of ' + sup + '\'s items' : '') + ' at ' + c.FromLoc + ', challan needs ' + q); return; }
      bal[k] = have - q;
      mv.push([l.ItemCode, q, c.FromLoc, c.ToLoc, '', li]);
    }
  });
  var outs = {}; if ((oc || cap) && !errs.length) mv = chSplit_(db, c, kind, sup, mv, jn, errs, cap ? outs : null);
  if (errs.length) throw new Error('Not posted:\n' + errs.join('\n'));
  if (fromQ) { c = chQuoteJob_(db, c); job = must(db, 'Jobs', 'JobNo', c.JobNo); jn = String(job.JobNo); } // E3b-4: a refused post made a job + accepted the quote
  chOutWrite_(db, lines, outs); // r34 F5: before the moves, so a retried post writes it again
  if (ret) dmg = chDmg_(mv.map(function (m) { return { ItemCode: m[0], Qty: m[1], ToLoc: m[3] }; }), no, jn); // r34 F5: damage / loss of our own items only (what moved)
  var now = new Date(), ids = nextIds(db, 'MV', mv.length);
  db.insert('StockMoves', mv.map(function (m, i) {
    var r = { MoveID: ids[i], MoveDate: date, ItemCode: m[0], Qty: m[1], FromLoc: m[2], ToLoc: m[3], RefType: 'Challan', RefNo: no, JobNo: jn, PostedBy: user_(), PostedAt: now };
    if (tag) r.SetCode = m[4] || ''; if (oc) r.Owner = m[5] || ''; return r;
  }));
  chPostTail_(db, c, job, dmg, now);
  log_(db, 'Challan posted', no, kind + ' · ' + mv.length + ' moves' + (dmg.length ? ' · ' + dmg.length + ' damage/loss' : ''));
  return { moves: mv.length, damage: dmg.length };
}
// CR M8 run 1: what a post writes after its moves (Damage rows, job status, then Posted last), so chFinishPost_ can run it alone.
function chQuoteJob_(db, c) { // r28 F1: the quote's job (made now if none; a retried post finds it by QuoteNo)
  var q = String(c.QuoteNo), j = find(db.rows('Jobs'), 'QuoteNo', q);
  if (j && String(j.Status) === 'Closed') throw new Error(c.ChallanNo + ': the job of ' + q + ' (' + j.JobNo + ') is closed');
  var qs = j ? '' : String((find(db.rows('Quotes'), 'QuoteNo', q) || {}).Status || ''); // step R r28: a quote Lost / Expired / Cancelled since the save makes no job (quoteToJob would mark it Accepted)
  if (['Lost', 'Expired', 'Cancelled'].indexOf(qs) >= 0) throw new Error(c.ChallanNo + ': quote ' + q + ' is ' + qs + ' now: no job is made from it');
  db.update('Challans', c, { JobNo: j ? String(j.JobNo) : quoteToJob(db, q) }); return must(db, 'Challans', 'ChallanNo', c.ChallanNo);
}
function chOutWrite_(db, lines, outs) { // r34 F5: ChallanLines.QtyOut = the qty from outside (blank = none); only lines that change are written
  var ch = lines.map(function (l, i) { var v = outs[i] > 1e-9 ? r2(outs[i]) : ''; return String(l.QtyOut == null ? '' : l.QtyOut) === String(v) ? null : [l, v]; }).filter(function (x) { return x; });
  if (!ch.length) return;
  if (db.headers('ChallanLines').indexOf('QtyOut') < 0) { if (!ch.some(function (x) { return x[1] !== ''; })) return; if (typeof db.ensureColumn !== 'function' || (db.ensureColumn('ChallanLines', 'QtyOut'), db.headers('ChallanLines').indexOf('QtyOut') < 0)) throw new Error('ChallanLines needs a QtyOut column'); }
  ch.forEach(function (x) { db.update('ChallanLines', x[0], { QtyOut: x[1] }); });
}
function chDmg_(mv, no, jn) { // r34 F5: Damage rows from the moves to repair / lost (per item, in order)
  var by = {}, out = [];
  mv.forEach(function (v) { var d = v.ToLoc === LOC.REPAIR, lo = v.ToLoc === LOC.LOST; if (!d && !lo) return;
    var x = by[v.ItemCode]; if (!x) { x = by[v.ItemCode] = { ChallanNo: no, JobNo: jn, ItemCode: v.ItemCode, QtyDamaged: 0, QtyLost: 0, Status: 'Open' }; out.push(x); }
    if (d) x.QtyDamaged += num(v.Qty); else x.QtyLost += num(v.Qty); });
  out.forEach(function (x) { x.QtyDamaged = r2(x.QtyDamaged) || ''; x.QtyLost = r2(x.QtyLost) || ''; });
  return out;
}
function chVendorOut_(db, jn, sup, except) { // r34 F5: item -> qty of that vendor's items still out on the job (posted vendor deliveries - vendor returns)
  return (chVendorAll_(db, except)[String(jn)] || {})[String(sup)] || {};
}
function chVendorAll_(db, except) { // r34 F5: job -> vendor -> item -> qty out, one pass (except: leave that challan out)
  var cs = {}, m = {}; db.rows('Challans').forEach(function (c) { if (c.Status === 'Posted' && String(c.MatSource || '') === 'Vendor' && !blank(c.JobNo) && !blank(c.SupID) && String(c.ChallanNo) !== String(except || '') && (c.Kind === 'Delivery' || c.Kind === 'Return')) cs[c.ChallanNo] = [String(c.JobNo), String(c.SupID), c.Kind === 'Delivery' ? 1 : -1]; });
  db.rows('ChallanLines').forEach(function (l) { var x = cs[l.ChallanNo]; if (!x) return; var j = m[x[0]] = m[x[0]] || {}, s = j[x[1]] = j[x[1]] || {}; s[l.ItemCode] = r2((s[l.ItemCode] || 0) + x[2] * num(l.Qty)); });
  return m;
}
function chPostVendor_(db, c) { // r28 F2: Posted with no StockMoves: own and rented-in stock untouched; the job goes on hire as for any delivery. r34 F5: a vendor Return too (job status unchanged)
  var no = c.ChallanNo, ls = db.rows('ChallanLines').filter(function (l) { return l.ChallanNo === no; }); if (!ls.length) throw new Error(no + ' has no lines');
  var ret = c.Kind === 'Return'; if ((c.Kind !== 'Delivery' && !ret) || blank(c.SupID)) throw new Error(no + ': a vendor rental challan is a Delivery or Return with its vendor');
  var job = blank(c.JobNo) ? null : must(db, 'Jobs', 'JobNo', c.JobNo); if (job && String(job.Status) === 'Closed') throw new Error(no + ': job ' + job.JobNo + ' is closed');
  if (ret) { if (!job) throw new Error(no + ': a return needs its job'); var vo = chVendorOut_(db, job.JobNo, c.SupID, no), errs = [];
    ls.forEach(function (l) { var q = num(l.Qty); if ((vo[l.ItemCode] || 0) < q - 1e-9) errs.push(l.ItemCode + ': only ' + (vo[l.ItemCode] || 0) + ' of ' + c.SupID + '\'s items out on ' + job.JobNo + ', return has ' + q); vo[l.ItemCode] = (vo[l.ItemCode] || 0) - q; });
    if (errs.length) throw new Error('Not posted:\n' + errs.join('\n')); }
  chPostTail_(db, c, ret ? null : job, [], new Date()); log_(db, 'Challan posted', no, c.Kind + ' · vendor rental ' + c.SupID + ' · no stock moves'); return { moves: 0, damage: 0 };
}
function chPostTail_(db, c, job, dmg, now) {
  var kind = c.Kind, ret = kind === 'Return';
  if (dmg.length) {
    var dids = nextIds(db, 'DMG', dmg.length), ch = db.headers('Damage').indexOf('Chargeable') >= 0;
    dmg.forEach(function (x, i) { x.DamageID = dids[i]; if (ch) x.Chargeable = job && job.JobType === 'Rental' ? 'Yes' : ''; });
    db.insert('Damage', dmg);
  }
  if (job && kind === 'Delivery' && (job.JobType === 'Rental' || job.JobType === 'Project') && ['Awaiting order', 'Mobilising', ''].indexOf(job.Status) >= 0) db.update('Jobs', job, { Status: 'On hire' });
  if (job && ret && job.Status === 'On hire') {
    var left = onHire(db, job.JobNo), sm = setMap_(db), lt = function (x) { return locType(db, x) === 'Site'; }, any; // CR M8 run 4: this challan's set lines count too (jobEvents reads Posted challans; Posted is written last)
    if (String(c.Status) !== 'Posted') db.rows('ChallanLines').forEach(function (l) { if (String(l.ChallanNo) !== String(c.ChallanNo)) return; var q = sm[l.ItemCode] ? num(l.Qty) : num(l.QtyOut); if (!q) return; /* r34 F5: and its loose qty from outside */ if (lt(c.FromLoc)) left[l.ItemCode] = (left[l.ItemCode] || 0) - q; if (lt(c.ToLoc)) left[l.ItemCode] = (left[l.ItemCode] || 0) + q; });
    any = Object.keys(left).some(function (k) { return left[k] > 0; });
    if (!any && find(db.rows('OffHire').filter(function (x) { return x.JobNo === job.JobNo; }), 'Scope', 'Full')) db.update('Jobs', job, { Status: 'Off-hire' });
  }
  db.update('Challans', c, { Status: 'Posted', PostedAt: now });
}
// CR M8 run 1: a post whose moves went in, then failed: the rest of it, never moving again. The Damage rows are counted from the lines
// as postChallan counts them (loose and Qty 0 set-part lines of stock items, per item) and written only if none of this challan's are in.
function chFinishPost_(db, no) {
  var c = must(db, 'Challans', 'ChallanNo', no), job = blank(c.JobNo) ? null : find(db.rows('Jobs'), 'JobNo', c.JobNo), jn = job ? job.JobNo : '', dmg = [];
  if (c.Kind === 'Return' && !db.rows('Damage').some(function (x) { return x.ChallanNo === no; })) // r34 F5: from its moves, as postChallan
    dmg = chDmg_(db.rows('StockMoves').filter(function (v) { return v.RefNo === no && v.RefType === 'Challan'; }), no, jn);
  chPostTail_(db, c, job, dmg, new Date());
  return { damage: dmg.length };
}
function chCancelOut_(db, c, errs) { // r34 F5: a posted delivery's outside / vendor items that already came back can't be un-delivered
  if (blank(c.JobNo) || locType(db, c.ToLoc) !== 'Site') return;
  var ls = db.rows('ChallanLines').filter(function (l) { return l.ChallanNo === c.ChallanNo; });
  if (String(c.MatSource || '') === 'Vendor') { var vo = chVendorOut_(db, c.JobNo, c.SupID); ls.forEach(function (l) { if ((vo[l.ItemCode] || 0) < num(l.Qty) - 1e-9) errs.push(l.ItemCode + ': only ' + (vo[l.ItemCode] || 0) + ' of the vendor\'s items still out (some came back)'); vo[l.ItemCode] = (vo[l.ItemCode] || 0) - num(l.Qty); }); return; }
  if (!ls.some(function (l) { return num(l.QtyOut) > 0; })) return;
  var h = onHire(db, c.JobNo); ls.forEach(function (l) { var q = num(l.QtyOut); if (!(q > 0)) return; if ((h[l.ItemCode] || 0) < q - 1e-9) errs.push(l.ItemCode + ': only ' + r2(h[l.ItemCode] || 0) + ' on hire, the ' + q + ' from outside already came back'); h[l.ItemCode] = (h[l.ItemCode] || 0) - q; });
}
function cancelChallan(db, no) {
  var c = must(db, 'Challans', 'ChallanNo', no);
  if (c.Status === 'Cancelled') throw new Error(no + ' is already cancelled');
  if (c.Status === 'Posted') {
    var dm = db.rows('Damage').filter(function (x) { return x.ChallanNo === no && x.Status !== 'Cancelled'; });
    if (dm.some(function (x) { return !blank(x.DNNo); })) throw new Error(no + ': damage already charged on a debit note — cancel the note first');
    var oc = chOwnCol_(db), mv = db.rows('StockMoves').filter(function (v) { return v.RefNo === no && v.RefType === 'Challan'; }), bal = oc ? {} : stockMap(db), errs = [];
    if (oc) { var om = chOwnMap_(db); Object.keys(om).forEach(function (k) { Object.keys(om[k]).forEach(function (o) { bal[k + '|' + o] = om[k][o]; }); }); }
    mv.forEach(function (v) {
      var k = v.ItemCode + '|' + v.ToLoc + (oc ? '|' + chOwnOf_(v) : ''), t = locType(db, v.ToLoc);
      if (t !== 'Sold' && t !== 'Supplier' && (bal[k] || 0) < num(v.Qty) - 1e-9) errs.push(v.ItemCode + (oc && chOwnOf_(v) ? ' (' + chOwnOf_(v) + ')' : '') + ': only ' + (bal[k] || 0) + ' left at ' + v.ToLoc);
      bal[k] = (bal[k] || 0) - num(v.Qty);
    });
    chCancelOut_(db, c, errs); // r34 F5
    if (errs.length) throw new Error('Cannot cancel:\n' + errs.join('\n'));
    var ids = nextIds(db, 'MV', mv.length), now = new Date(), tag = db.headers('StockMoves').indexOf('SetCode') >= 0;
    db.insert('StockMoves', mv.map(function (v, i) {
      var r = { MoveID: ids[i], MoveDate: v.MoveDate, ItemCode: v.ItemCode, Qty: num(v.Qty), FromLoc: v.ToLoc, ToLoc: v.FromLoc, RefType: 'Challan-Cancel', RefNo: no, JobNo: v.JobNo, PostedBy: user_(), PostedAt: now };
      if (tag) r.SetCode = v.SetCode || ''; if (oc) r.Owner = chOwnOf_(v); return r;
    }));
    dm.forEach(function (x) { db.update('Damage', x, { Status: 'Cancelled' }); });
  }
  var wasP = c.Status === 'Posted', pc = { Status: 'Cancelled' }; if (c.Status !== 'Posted' && db.headers('Challans').indexOf('PDF') >= 0 && !blank(c.PDF)) pc.PDF = ''; // CR M8 run 4: a discarded draft's DRAFT PDF is no longer linked
  db.update('Challans', c, pc);
  var jb = wasP && c.Kind === 'Return' && !blank(c.JobNo) ? find(db.rows('Jobs'), 'JobNo', c.JobNo) : null; /* CR M8 run 5: a cancelled final Return puts the job back on hire */
  if (jb && jb.Status === 'Off-hire') { var lf = onHire(db, jb.JobNo); if (Object.keys(lf).some(function (k) { return lf[k] > 0; })) db.update('Jobs', jb, { Status: 'On hire' }); }
  log_(db, 'Challan cancelled', no, '');
}
// Hire events: loose parts from StockMoves (moves tagged with a set are left out); sets from the set lines of posted challans.
function jobEvents(db, jobNo) {
  var sites = {}; db.rows('Locations').forEach(function (l) { if (l.Type === 'Site') sites[l.LocID] = 1; });
  var tag = db.headers('StockMoves').indexOf('SetCode') >= 0, ev = {};
  db.rows('StockMoves').forEach(function (v) {
    if (v.JobNo !== jobNo || (tag && !blank(v.SetCode))) return;
    var d = dayNum(v.MoveDate), q = num(v.Qty), e = ev[v.ItemCode] = ev[v.ItemCode] || [];
    if (sites[v.ToLoc]) e.push({ d: d, q: q });
    if (sites[v.FromLoc]) e.push({ d: d + 1, q: -q });
  });
  var sets = setMap_(db), oq = db.hasTab('ChallanLines') && db.headers('ChallanLines').indexOf('QtyOut') >= 0; if (!Object.keys(sets).length && !oq) return ev;
  var chs = {}; db.rows('Challans').forEach(function (c) { if (c.JobNo === jobNo && c.Status === 'Posted' && String(c.MatSource || '') !== 'Vendor') chs[c.ChallanNo] = c; }); // r28 F2: vendor sets are not ours on hire
  db.rows('ChallanLines').forEach(function (l) {
    var c = chs[l.ChallanNo]; if (!c) return; var st = !!sets[l.ItemCode]; if (!st && !(oq && num(l.QtyOut) > 0)) return; // r34 F5: + loose qty from outside
    var d = dayNum(c.ChallanDate), q = st ? num(l.Qty) : num(l.QtyOut), add = function (x) { (ev[l.ItemCode] = ev[l.ItemCode] || []).push(x); };
    if (sites[c.ToLoc]) add({ d: d, q: q });
    if (sites[c.FromLoc]) add({ d: d + 1, q: -q });
  });
  return ev;
}
function oneOffLines_(db, q, job) {
  if (!q) return [];
  var items = db.rows('Items');
  return quoteLines(db, q.QuoteNo).filter(function (l) {
    if (num(l.Months) > 0 || isMilestone(l)) return false;
    var it = find(items, 'ItemCode', l.ItemCode);
    return !(job.HireBasis === 'Item' && it && (it.StockTracked === 'Yes' || isSet_(it)));
  }).map(function (l) { return { ItemCode: l.ItemCode || '', Description: l.Description, Unit: l.Unit, Qty: num(l.Qty), Months: '', Rate: num(l.Rate) }; });
}
// Project (m² / m³ / set / lump sum) monthly lines: qty on day d = latest Measures row for that quote line on or before d,
// else the quote qty. Item basis unchanged (sets come from jobEvents).
function hireUnits(db, job, q, start, end) {
  var ql = q ? quoteLines(db, q.QuoteNo) : [], items = db.rows('Items'), units = [];
  if (job.HireBasis === 'Item') {
    var ev = jobEvents(db, job.JobNo);
    Object.keys(ev).forEach(function (code) {
      var it = find(items, 'ItemCode', code) || {}, l = find(ql, 'ItemCode', code), e = ev[code];
      units.push({
        code: code, name: it.Name || code, unit: it.Unit || 'pc', rate: l ? num(l.Rate) : num(it.HireRateMonth),
        q: function (d) { return qtyOnDay(e, d); },
        adv: function (k, a) { return k === 0 ? qtyOnDay(e, a) : sum(e, function (x) { return x.q > 0 ? (x.d <= a - 1 ? x.q : 0) : (x.d - 1 <= a - 1 ? x.q : 0); }); },
      });
    });
  } else {
    var ms = db.hasTab('Measures') ? db.rows('Measures').filter(function (m) { return m.JobNo === job.JobNo && !blank(m.LineID) && dayNum(m.MeasDate) != null; }) : [];
    ql.filter(function (l) { return num(l.Months) > 0 && !isMilestone(l); }).forEach(function (l) {
      var qq = num(l.Qty), lm = ms.filter(function (m) { return String(m.LineID) === String(l.LineID); })
        .map(function (m) { return { d: dayNum(m.MeasDate), q: num(m.Qty) }; }).sort(function (a, b) { return a.d - b.d; });
      var on = function (d) {
        if (d < start || (end != null && d > end)) return 0;
        var v = qq; for (var i = 0; i < lm.length && lm[i].d <= d; i++) v = lm[i].q;
        return v;
      };
      units.push({ code: l.ItemCode || '', name: l.Description, unit: l.Unit || 'lot', rate: num(l.Rate), q: on, adv: function (k, a) { return on(a); } });
    });
  }
  return units;
}
// Debit notes only from Damage rows with Chargeable = Yes; rows marked No become Waived (written off).
function damageToDebitNote(db, jobNo, o) {
  o = o || {};
  var job = must(db, 'Jobs', 'JobNo', jobNo), ch = db.headers('Damage').indexOf('Chargeable') >= 0;
  var open = db.rows('Damage').filter(function (d) { return d.JobNo === jobNo && d.Status === 'Open' && blank(d.DNNo); }), waived = 0;
  if (ch) open.forEach(function (d) { if (d.Chargeable === 'No') { db.update('Damage', d, { Status: 'Waived' }); waived++; } });
  if (waived) log_(db, 'Damage waived', jobNo, waived + ' row(s) with Chargeable = No');
  var dm = open.filter(function (d) { return !ch || d.Chargeable === 'Yes'; }), wait = ch ? open.filter(function (d) { return blank(d.Chargeable); }).length : 0;
  if (!dm.length) throw new Error(jobNo + ': no open damage / loss to charge' + (wait ? ' — ' + wait + ' row(s) wait for the office to set Damage › Chargeable (Yes / No)' : '') + (waived ? ' (' + waived + ' row(s) with Chargeable = No marked Waived)' : ''));
  var items = db.rows('Items'), miss = [];
  dm.forEach(function (d) { var it = find(items, 'ItemCode', d.ItemCode) || {}; if ((num(d.QtyDamaged) && !num(it.RepairRate)) || (num(d.QtyLost) && !num(it.ReplacementCost))) miss.push(d.ItemCode); });
  if (miss.length) throw new Error('Set RepairRate / ReplacementCost in Items for: ' + miss.join(', '));
  var date = o.date ? toDate(o.date) : today(), no = nextId(db, 'DN', date), amt = r2(sum(dm, function (d) { return damageCharge(db, d); }));
  var reason = 'Damage / loss on return: ' + dm.map(function (d) {
    var it = find(items, 'ItemCode', d.ItemCode); return (num(d.QtyDamaged) ? num(d.QtyDamaged) + ' damaged' : '') + (num(d.QtyDamaged) && num(d.QtyLost) ? ', ' : '') + (num(d.QtyLost) ? num(d.QtyLost) + ' lost' : '') + ' ' + it.Name + ' (' + d.ChallanNo + ')';
  }).join('; ');
  db.insert('Notes', { NoteNo: no, Kind: 'DN', NoteDate: date, InvNo: o.invNo || '', JobNo: jobNo, CustID: job.CustID, Reason: reason, Amount: amt, VATPct: jobVAT_(db, job), Status: 'Draft' });
  dm.forEach(function (d) { db.update('Damage', d, { DNNo: no, Status: 'Charged' }); });
  log_(db, 'Debit note', no, jobNo + ' · Tk ' + amt + (wait ? ' · ' + wait + ' row(s) not decided' : ''));
  return no;
}

// ======================================================================= cut / repair / scrap (Conversions)
function convLines_(db, id) { return db.rows('ConvLines').filter(function (l) { return String(l.ConvID) === String(id); }); }
function postConversion(db, id) {
  var cv = must(db, 'Conversions', 'ConvID', id);
  if (['Draft', 'Submitted', ''].indexOf(String(cv.Status)) < 0) throw new Error(id + ' is ' + cv.Status + ', only Draft conversions can be posted');
  var items = db.rows('Items'), loc = String(cv.LocID || ''), it = find(items, 'ItemCode', cv.FromItem), q = num(cv.FromQty), errs = [];
  var stockItem = function (x, code) { if (!x) return 'unknown item ' + code; if (isSet_(x)) return code + ' is a set, not a stock item'; if (x.StockTracked !== 'Yes') return code + ' is not stock-tracked'; return ''; };
  if ([LOC.YARD, LOC.REPAIR].indexOf(loc) < 0) errs.push('Location must be the yard (' + LOC.YARD + ') or Repair (' + LOC.REPAIR + ')');
  var bad = stockItem(it, cv.FromItem); if (bad) errs.push('From: ' + bad);
  if (!(q > 0)) errs.push('From qty must be more than 0');
  var lines = convLines_(db, id), R = 0, outs = [];
  if (!lines.length) errs.push('Add at least one line: what came out (Output → yard) or Scrap');
  lines.forEach(function (l, i) {
    var t = find(items, 'ItemCode', l.ToItem), n = num(l.Qty), k = blank(l.Kind) ? 'Output' : String(l.Kind), b = stockItem(t, l.ToItem), w = 'Line ' + (i + 1) + ': ';
    if (['Output', 'Scrap'].indexOf(k) < 0) errs.push(w + 'kind must be Output or Scrap');
    if (b) errs.push(w + b);
    if (!(n > 0)) errs.push(w + 'qty must be more than 0');
    if (k === 'Output' && !b) { if (t.ItemCode === cv.FromItem) R += n; else outs.push([t.ItemCode, n, num(t.ReplacementCost)]); }
  });
  if (R > q + 1e-9) errs.push('Output of ' + cv.FromItem + ' (' + R + ') is more than the start qty ' + q);
  if (R && loc === LOC.YARD) errs.push('Getting the same item back only works from Repair (repaired → yard)');
  var have = stockMap(db)[cv.FromItem + '|' + loc] || 0;
  if (q > 0 && have < q - 1e-9) errs.push(cv.FromItem + ': only ' + have + ' at ' + loc + ', conversion needs ' + q);
  var dm = null;
  if (!blank(cv.DamageID)) {
    dm = find(db.rows('Damage'), 'DamageID', cv.DamageID);
    if (!dm) errs.push('Damage row ' + cv.DamageID + ' not found');
    else {
      if (dm.ItemCode !== cv.FromItem) errs.push('Damage row ' + cv.DamageID + ' is for ' + dm.ItemCode + ' — does not match ' + cv.FromItem);
      if (loc !== LOC.REPAIR) errs.push('Damaged items are in Repair — choose ' + LOC.REPAIR);
      if (!blank(dm.Outcome)) errs.push('Damage row ' + cv.DamageID + ' is already ' + dm.Outcome);
      if (q > num(dm.QtyDamaged) + 1e-9) errs.push('Damage row ' + cv.DamageID + ' has only ' + num(dm.QtyDamaged) + ' damaged');
    }
  }
  if (errs.length) throw new Error('Not posted:\n' + errs.join('\n'));
  var mv = [];
  if (R) mv.push([cv.FromItem, R, loc, LOC.YARD]);
  if (q - R > 1e-9) mv.push([cv.FromItem, r2(q - R), loc, LOC.SCRAP]);
  outs.forEach(function (x) { mv.push([x[0], x[1], LOC.SUPPLIER, LOC.YARD]); });
  var date = blank(cv.ConvDate) ? today() : toDate(cv.ConvDate), now = new Date(), ids = nextIds(db, 'MV', mv.length);
  db.insert('StockMoves', mv.map(function (m, i) { return { MoveID: ids[i], MoveDate: date, ItemCode: m[0], Qty: m[1], FromLoc: m[2], ToLoc: m[3], RefType: 'Conversion', RefNo: id, JobNo: '', PostedBy: user_(), PostedAt: now }; }));
  var value = r2((q - R) * num(it.ReplacementCost) - sum(outs, function (x) { return x[1] * x[2]; }));
  var outcome = outs.length ? 'Cut' : R > 0 ? 'Repaired' : 'Scrapped';
  if (dm) db.update('Damage', dm, { Outcome: outcome });
  var p = { Status: 'Posted', AppMsg: '' }; if (db.headers('Conversions').indexOf('WriteOff') >= 0) p.WriteOff = value;
  db.update('Conversions', cv, p);
  log_(db, 'Conversion posted', id, outcome + ' · ' + q + ' ' + cv.FromItem + ' at ' + loc + ' · ' + mv.length + ' moves · written off Tk ' + value);
  return { moves: mv.length, value: value, outcome: outcome };
}
function cancelConversion(db, id) {
  var cv = must(db, 'Conversions', 'ConvID', id);
  if (cv.Status === 'Cancelled') throw new Error(id + ' is already cancelled');
  if (cv.Status === 'Posted') {
    var mv = db.rows('StockMoves').filter(function (v) { return v.RefNo === id && v.RefType === 'Conversion'; }), bal = stockMap(db), errs = [];
    mv.forEach(function (v) {
      var k = v.ItemCode + '|' + v.ToLoc;
      if (v.ToLoc !== LOC.SCRAP && (bal[k] || 0) < num(v.Qty) - 1e-9) errs.push(v.ItemCode + ': only ' + (bal[k] || 0) + ' left at ' + v.ToLoc);
      bal[k] = (bal[k] || 0) - num(v.Qty);
    });
    if (errs.length) throw new Error('Cannot cancel:\n' + errs.join('\n'));
    var ids = nextIds(db, 'MV', mv.length), now = new Date();
    db.insert('StockMoves', mv.map(function (v, i) { return { MoveID: ids[i], MoveDate: v.MoveDate, ItemCode: v.ItemCode, Qty: num(v.Qty), FromLoc: v.ToLoc, ToLoc: v.FromLoc, RefType: 'Conversion-Cancel', RefNo: id, JobNo: '', PostedBy: user_(), PostedAt: now }; }));
    var dm = blank(cv.DamageID) ? null : find(db.rows('Damage'), 'DamageID', cv.DamageID);
    if (dm && !blank(dm.Outcome)) db.update('Damage', dm, { Outcome: '' });
  }
  db.update('Conversions', cv, { Status: 'Cancelled' });
  log_(db, 'Conversion cancelled', id, '');
}
// Office panel: a = { date, locId, fromItem, fromQty, damageId, notes, post, lines: [{ toItem, qty, kind }] }
function saveConversion(db, a) {
  var lines = (a.lines || []).filter(function (l) { return !blank(l.toItem) && num(l.qty) > 0; });
  if (!lines.length) throw new Error('Add at least one line: what came out (Output → yard) or Scrap');
  must(db, 'Items', 'ItemCode', a.fromItem);
  if (!(num(a.fromQty) > 0)) throw new Error('From qty must be more than 0');
  var d = o7Date_(a.date), id = nextId(db, 'CV', d);
  db.insert('Conversions', { ConvID: id, ConvDate: d, LocID: a.locId || LOC.REPAIR, FromItem: a.fromItem, FromQty: num(a.fromQty), DamageID: a.damageId || '', Status: 'Draft', SubmittedBy: user_(), AppMsg: '', Notes: a.notes || '' });
  var ids = nextIds(db, 'CVL', lines.length);
  db.insert('ConvLines', lines.map(function (l, i) { return { ConvLineID: ids[i], ConvID: id, ToItem: l.toItem, Qty: num(l.qty), Kind: l.kind || 'Output' }; }));
  log_(db, 'Conversion created', id, a.fromItem + ' ' + num(a.fromQty) + ' · ' + lines.length + ' lines');
  if (!a.post) return { msg: id + ' saved as Draft.', ref: id };
  try { var r = postConversion(db, id); return { msg: id + ' posted: ' + r.outcome + ', ' + r.moves + ' stock moves, written off Tk ' + tk(r.value) + '.', ref: id }; }
  catch (e) { return { msg: id + ' saved as Draft but NOT posted:\n' + e.message, ref: id, warn: true }; }
}
// a = { jobNo, lineId, date, qty, notes } — measured quantity of a monthly Project line from that date on
function saveMeasure(db, a) {
  var job = must(db, 'Jobs', 'JobNo', a.jobNo);
  if (job.JobType !== 'Project') throw new Error(a.jobNo + ' is not a Project job');
  var l = find(quoteLines(db, job.QuoteNo), 'LineID', a.lineId);
  if (!l || !(num(l.Months) > 0) || isMilestone(l)) throw new Error('Choose a monthly line of quote ' + job.QuoteNo);
  if (blank(a.qty) || num(a.qty) < 0) throw new Error('Measured quantity must be 0 or more');
  var d = o7Date_(a.date), id = nextId(db, 'MEA');
  db.insert('Measures', { MeasID: id, JobNo: job.JobNo, MeasDate: d, LineID: l.LineID, Qty: num(a.qty), Notes: a.notes || '' });
  log_(db, 'Measurement', id, job.JobNo + ' · ' + l.Description + ' · ' + num(a.qty) + ' ' + (l.Unit || '') + ' from ' + fmtDay(dayNum(d)));
  return { msg: id + ': ' + num(a.qty) + ' ' + (l.Unit || '') + ' from ' + fmtDay(dayNum(d)) + ' — hire billing uses it from that date.', ref: id };
}

// ======================================================================= app: roles, transfer off, conversions in the sweep
function appRoleCheck_(db, email) {
  if (S(db, 'AppCheckRole', 'No') !== 'Yes') return;
  if (db.headers('Staff').indexOf('AppRole') < 0) throw new Error('Staff › AppRole is missing — run Upgrade sheet for O7');
  var e = String(email || '').trim().toLowerCase();
  var s = e && db.rows('Staff').filter(function (x) { return String(x.Email || '').trim().toLowerCase() === e && x.Status !== 'Inactive'; })[0];
  if (!s) throw new Error((email || 'Unknown user') + ' is not in the Staff tab (Email) — ask the office to add you');
  if (['Admin', 'Field'].indexOf(String(s.AppRole)) < 0) throw new Error(email + ' has app role ' + (s.AppRole || 'none') + ' — only Field or Admin can submit');
}
if (typeof appProcessChallan_ === 'function') {
  var O7_appChallan0_ = appProcessChallan_;
  appProcessChallan_ = function (db, c, o) {
    appRoleCheck_(db, c.SubmittedBy);
    if (String(c.Kind) === 'Transfer' && S(db, 'AppAllowTransfer', 'Yes') !== 'Yes') throw new Error('Transfer is office-only — use Delivery, Sale or Return in the app');
    return O7_appChallan0_(db, c, o);
  };
}
function appProcessConv_(db, cv, o) {
  o = o || {};
  var who = cv.SubmittedBy || 'app', d = cv.ConvDate;
  appRoleCheck_(db, cv.SubmittedBy);
  if (!(d instanceof Date)) throw new Error('Date "' + d + '" was not read as a date. In AppSheet set Data › Conversions › Locale = English (United Kingdom), then submit again.');
  var t = dayNum(today()), back = num(S(db, 'AppMaxBackDays', 31)) || 31;
  if (dayNum(d) > t) throw new Error('Date ' + fmtDay(dayNum(d)) + ' is in the future');
  if (dayNum(d) < t - back) throw new Error('Date ' + fmtDay(dayNum(d)) + ' is more than ' + back + ' days ago — enter it in the sheet panel');
  var lines = convLines_(db, cv.ConvID);
  if (!lines.length) throw new Error('Add at least one line (Output → yard, or Scrap)');
  var no = String(cv.ConvID);
  if (isAppNo_(no)) { no = nextId(db, 'CV', d); db.update('Conversions', cv, { ConvID: no }); lines.forEach(function (l) { db.update('ConvLines', l, { ConvID: no }); }); }
  var fresh = lines.filter(function (l) { return blank(l.ConvLineID) || isAppNo_(l.ConvLineID); });
  if (fresh.length) { var ids = nextIds(db, 'CVL', fresh.length); fresh.forEach(function (l, i) { db.update('ConvLines', l, { ConvLineID: ids[i] }); }); }
  db.update('Conversions', cv, { Status: 'Draft', AppMsg: '' });
  if (S(db, 'AppAutoPost', 'Yes') !== 'Yes') { db.update('Conversions', cv, { AppMsg: 'Numbered ' + no + ' — waiting for the office to post' }); log_(db, 'App conversion numbered', no, who); return { no: no, posted: false }; }
  try { var r = postConversion(db, no); }
  catch (e) {
    db.update('Conversions', cv, { AppMsg: String(e.message).replace(/^Not posted:\n/, 'Not posted: ').replace(/\n/g, '; ').slice(0, 480) });
    log_(db, 'App conversion not posted', no, who + ' · ' + e.message.replace(/\n/g, '; '));
    return { no: no, posted: false, error: e.message };
  }
  log_(db, 'App conversion posted', no, who + ' · ' + r.outcome);
  return { no: no, posted: true, moves: r.moves };
}
if (typeof appSweepRun_ === 'function') {
  var O7_sweep0_ = appSweepRun_;
  appSweepRun_ = function (o) {
    o = o || {}; o.db = o.db || new SheetDb();
    var out = O7_sweep0_(o), db = o.db;
    if (!db.hasTab('Conversions')) return out;
    db.rows('Conversions').filter(function (c) { return c.Status === 'Submitted'; })
      .sort(function (a, b) { var dn = function (v) { try { return dayNum(v) || 0; } catch (e) { return 0; } }; return dn(a.ConvDate) - dn(b.ConvDate) || a._r - b._r; })
      .forEach(function (cv) {
        if (timeUp_(o.deadline)) { out.left++; return; }
        var before = cv.ConvID, r;
        try { r = appProcessConv_(db, cv, o); }
        catch (e) {
          db.update('Conversions', cv, { Status: 'Draft', AppMsg: ('Not posted: ' + e.message).slice(0, 480) });
          log_(db, 'App conversion refused', before, (cv.SubmittedBy || 'app') + ' · ' + e.message);
          r = { no: before, posted: false, error: e.message };
        }
        out.done++; if (r.posted) out.posted++; else if (r.error) out.failed++;
        out.list.push(r);
      });
    return out;
  };
}
// Trigger handler (replaces O6's): cheap when idle — reads only the Status columns.
function appSweep() {
  var db = new SheetDb(), any = false;
  ['Challans', 'Conversions'].forEach(function (t) {
    if (any || !db.hasTab(t)) return;
    var s = db.sheet(t), j = db.headers(t).indexOf('Status') + 1, n = s.getLastRow();
    if (j > 0 && n > 1 && s.getRange(2, j, n - 1, 1).getValues().some(function (r) { return r[0] === 'Submitted'; })) any = true;
  });
  if (!any) return;
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) return;
  try { appSweepRun_({ db: db, deadline: deadline_() }); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
}

// ======================================================================= panel: sets in the challan forms, Qty 0 damage lines
if (typeof uiInitDb_ === 'function') {
  var O7_uiInit0_ = uiInitDb_;
  uiInitDb_ = function (db) {
    var r = O7_uiInit0_(db), sets = setMap_(db);
    r.items.forEach(function (i) { if (sets[i.code]) { i.stock = true; i.set = true; i.name += ' (set)'; } });
    return r;
  };
}
if (typeof uiGetDb_ === 'function') {
  var O7_uiGet0_ = uiGetDb_;
  uiGetDb_ = function (db, kind, a) {
    var r = O7_uiGet0_(db, kind, a);
    if (kind === 'stock') { var m = stockMap(db); Object.keys(setMap_(db)).forEach(function (code) { var n = setAvail_(db, code, a, m); if (n > 0) r[code] = n; }); }
    return r;
  };
}
if (typeof UI_HTML_ === 'string') UI_HTML_ = UI_HTML_.replace('Damaged items go to Repair, lost to Lost; both raise Damage rows for the debit note.',
  'Damaged items go to Repair, lost to Lost; both raise Damage rows for the debit note. Sets: whole sets on the set line; a damaged / lost part of them on its own line with Qty 0.');
function uiSaveChallan_(db, a) {
  var lines = (a.lines || []).filter(function (l) { return !blank(l.itemCode) && (num(l.qty) > 0 || (a.kind === 'Return' && num(l.qtyDamaged) + num(l.qtyLost) > 0)); });
  if (!lines.length) throw new Error('Add at least one item with a quantity');
  lines.forEach(function (l) { must(db, 'Items', 'ItemCode', l.itemCode); if (num(l.qty) > 0 && num(l.qtyDamaged) + num(l.qtyLost) > num(l.qty)) throw new Error(l.itemCode + ': damaged + lost is more than the quantity'); });
  var no = createChallan(db, { kind: a.kind, jobNo: a.jobNo, date: uiDate_(a.date), fromLoc: a.fromLoc || '', toLoc: a.toLoc || '', vehicle: a.vehicle, driver: a.driver, receivedBy: a.receivedBy, notes: a.notes, lines: lines });
  if (!a.post) return { msg: no + ' saved as Draft (' + lines.length + ' line(s)). Post it when the goods leave / arrive.', ref: no };
  try { var r = postChallan(db, no); return { msg: no + ' saved and posted: ' + r.moves + ' stock moves' + (r.damage ? ', ' + r.damage + ' damage/loss rows' : '') + '.', ref: no, damage: r.damage }; }
  catch (e) { return { msg: no + ' saved as Draft but NOT posted:\n' + e.message, ref: no, warn: true }; }
}

// ======================================================================= O7 panel: cut / repair / scrap + project measurements
function o7Open() { SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(O7_HTML_).setTitle('Stock: cut · repair · scrap')); }
function o7Init() { return uiClean_(o7InitDb_(new SheetDb())); }
function o7InitDb_(db) {
  var bal = stockMap(db), q = function (c, l) { return bal[c + '|' + l] || 0; }, items = db.rows('Items').filter(function (i) { return !blank(i.ItemCode) && i.Status !== 'Inactive' && i.StockTracked === 'Yes' && !isSet_(i); });
  var conv = db.hasTab('Conversions') ? db.rows('Conversions').filter(function (c) { return !blank(c.ConvID); }).map(function (c) { return { id: c.ConvID, date: c.ConvDate, loc: c.LocID, from: c.FromItem, qty: num(c.FromQty), status: c.Status, msg: c.AppMsg || '', wo: c.WriteOff }; }).reverse() : [];
  var meas = db.hasTab('Measures') ? db.rows('Measures') : [];
  return {
    today: today(),
    items: items.map(function (i) { return { code: i.ItemCode, name: i.Name, yard: q(i.ItemCode, LOC.YARD), repair: q(i.ItemCode, LOC.REPAIR) }; }),
    damage: db.rows('Damage').filter(function (d) { return d.Status !== 'Cancelled' && num(d.QtyDamaged) > 0 && blank(d.Outcome); }).map(function (d) { return { id: d.DamageID, code: d.ItemCode, qty: num(d.QtyDamaged), job: d.JobNo }; }),
    drafts: conv.filter(function (c) { return c.status === 'Draft' || c.status === 'Submitted'; }), posted: conv.filter(function (c) { return c.status === 'Posted'; }).slice(0, 15),
    projects: db.rows('Jobs').filter(function (j) { return j.JobType === 'Project' && j.Status !== 'Closed'; }).map(function (j) {
      return { no: j.JobNo, lines: quoteLines(db, j.QuoteNo).filter(function (l) { return num(l.Months) > 0 && !isMilestone(l); }).map(function (l) { return { id: l.LineID, desc: l.Description, unit: l.Unit, qty: num(l.Qty) }; }),
        meas: meas.filter(function (m) { return m.JobNo === j.JobNo; }).map(function (m) { return { id: m.MeasID, line: m.LineID, date: m.MeasDate, qty: num(m.Qty) }; }) };
    }),
  };
}
var O7_ACTIONS_ = {
  saveConv: function (db, a) { return saveConversion(db, a); },
  postConv: function (db, a) { var r = postConversion(db, a.id); return a.id + ' posted: ' + r.outcome + ', written off Tk ' + tk(r.value) + '.'; },
  cancelConv: function (db, a) { cancelConversion(db, a.id); return a.id + ' cancelled (stock reversed if it was posted).'; },
  saveMeasure: function (db, a) { return saveMeasure(db, a); },
};
function o7Do(action, args) {
  return uiClean_(withLock(function () {
    var f = O7_ACTIONS_[action]; if (!f) throw new Error('Unknown action ' + action);
    var r = f(new SheetDb(), args || {}); SpreadsheetApp.flush();
    return typeof r === 'string' ? { msg: r } : r;
  }));
}
var O7_HTML_ = '<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8"><style>' +
  'body{margin:0;font:12px/1.4 Arial,sans-serif;color:#2B3036}header{background:#000;color:#fff;padding:8px 10px;font-weight:700;letter-spacing:.08em}main{padding:10px}' +
  'h3{font-size:11px;color:#17707D;text-transform:uppercase;border-bottom:1px solid #D5D8DA;margin:14px 0 4px}label{display:block;font-size:11px;color:#5F676E;margin:6px 0 2px}' +
  'input,select{width:100%;box-sizing:border-box;font:inherit;padding:5px;border:1px solid #D5D8DA;border-radius:3px}.row{display:grid;grid-template-columns:1fr 60px 76px 22px;gap:4px;align-items:end}' +
  'button{background:#17707D;color:#fff;border:1px solid #17707D;border-radius:3px;padding:5px 9px;margin:6px 4px 0 0;cursor:pointer;font:inherit;font-weight:600}button.s{background:#fff;color:#17707D}button.x{padding:1px 6px;margin:0}' +
  '.msg{padding:6px 8px;border-left:4px solid #17707D;background:#EAF3F8;white-space:pre-wrap;margin-bottom:8px}.msg.e{border-color:#C62828;background:#FDECEA}.m{color:#5F676E;font-size:11px}' +
  'table{width:100%;border-collapse:collapse;font-size:11px}td{border-bottom:1px solid #D5D8DA;padding:3px}.tabs button{margin:0 4px 6px 0}</style></head><body>' +
  '<header>CORE ACCESS · STOCK</header><main><div id="msg"></div><div class="tabs"><button id="t1">Cut · repair · scrap</button><button id="t2" class="s">Project measurement</button></div><div id="v"></div></main><script>' +
  'var D=null,TAB=1;function $(i){return document.getElementById(i);}function h(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c];});}' +
  'function say(t,e){$("msg").innerHTML=t?"<div class=\\"msg"+(e?" e":"")+"\\">"+h(t)+"</div>":"";}' +
  'function load(){google.script.run.withSuccessHandler(function(d){D=d;draw();}).withFailureHandler(function(e){say(e.message,1);}).o7Init();}' +
  'function act(a,x){google.script.run.withSuccessHandler(function(r){say(r.msg,r.warn);load();}).withFailureHandler(function(e){say(e.message,1);}).o7Do(a,x);}' +
  'function opts(list,f,blank){return (blank?"<option value=\\"\\">"+blank+"</option>":"")+list.map(function(x){var o=f(x);return "<option value=\\""+h(o[0])+"\\">"+h(o[1])+"</option>";}).join("");}' +
  'function draw(){$("t1").className=TAB===1?"":"s";$("t2").className=TAB===2?"":"s";$("v").innerHTML=TAB===1?conv():meas();if(TAB===1)wire1();else wire2();}' +
  'function itemOpt(i){return [i.code,i.code+" — "+i.name+" (yard "+i.yard+", repair "+i.repair+")"];}' +
  'function conv(){var d=D.today;return "<label>Date</label><input id=cd type=date value=\\""+d+"\\"><label>Where</label><select id=cl><option value=LOC-REPAIR>Repair</option><option value=LOC-YARD>Yard</option></select>"+' +
  '"<label>Damage row (optional)</label><select id=cg>"+opts(D.damage,function(x){return [x.id,x.id+" · "+x.code+" · "+x.qty+" damaged · "+x.job];},"— none —")+"</select>"+' +
  '"<label>From item</label><select id=cf>"+opts(D.items,itemOpt,"— item —")+"</select><label>Qty</label><input id=cq type=number step=any>"+' +
  '"<h3>What came out</h3><div class=m>Output = goes to the yard (same item = repaired; other item = cut piece). Scrap = written off. Anything not output is written off.</div><div id=ls></div><button class=s id=al>+ line</button>"+' +
  '"<label>Notes</label><input id=cn><div><button id=sp>Save + post</button><button class=s id=sd>Save draft</button></div>"+' +
  '"<h3>Drafts</h3>"+(D.drafts.length?"<table>"+D.drafts.map(function(c){return "<tr><td>"+h(c.id)+"<br><span class=m>"+h(c.from)+" × "+c.qty+" · "+h(c.status)+(c.msg?"<br>"+h(c.msg):"")+"</span></td><td><button class=x data-p=\\""+h(c.id)+"\\">Post</button> <button class=\\"x s\\" data-c=\\""+h(c.id)+"\\">Cancel</button></td></tr>";}).join("")+"</table>":"<div class=m>None.</div>")+' +
  '"<h3>Recently posted</h3>"+(D.posted.length?"<table>"+D.posted.map(function(c){return "<tr><td>"+h(c.id)+"<br><span class=m>"+h(c.from)+" × "+c.qty+" · written off Tk "+h(c.wo)+"</span></td><td><button class=\\"x s\\" data-c=\\""+h(c.id)+"\\">Cancel</button></td></tr>";}).join("")+"</table>":"<div class=m>None.</div>");}' +
  'function addLine(){var r=document.createElement("div");r.className="row";r.innerHTML="<div><label>Item</label><select class=li>"+opts(D.items,function(i){return [i.code,i.code+" — "+i.name];},"— item —")+"</select></div><div><label>Qty</label><input class=lq type=number step=any></div><div><label>Kind</label><select class=lk><option>Output</option><option>Scrap</option></select></div><button class=\\"x s\\">×</button>";r.querySelector("button").onclick=function(){r.remove();};$("ls").appendChild(r);}' +
  'function wire1(){addLine();$("al").onclick=addLine;$("cg").onchange=function(){var g=D.damage.filter(function(x){return x.id===$("cg").value;})[0];if(g){$("cf").value=g.code;$("cl").value="LOC-REPAIR";$("cq").value=g.qty;}};' +
  'function save(p){act("saveConv",{date:$("cd").value,locId:$("cl").value,damageId:$("cg").value,fromItem:$("cf").value,fromQty:$("cq").value,notes:$("cn").value,post:p,lines:[].map.call(document.querySelectorAll("#ls .row"),function(r){return {toItem:r.querySelector(".li").value,qty:r.querySelector(".lq").value,kind:r.querySelector(".lk").value};})});}' +
  '$("sp").onclick=function(){save(true);};$("sd").onclick=function(){save(false);};' +
  '[].forEach.call(document.querySelectorAll("[data-p]"),function(b){b.onclick=function(){act("postConv",{id:b.getAttribute("data-p")});};});' +
  '[].forEach.call(document.querySelectorAll("[data-c]"),function(b){b.onclick=function(){if(b.textContent!=="Confirm"){b.textContent="Confirm";return;}act("cancelConv",{id:b.getAttribute("data-c")});};});}' +
  'function meas(){if(!D.projects.length)return "<div class=m>No open Project jobs.</div>";return "<label>Project job</label><select id=mj>"+opts(D.projects,function(j){return [j.no,j.no];})+"</select><label>Monthly line</label><select id=ml></select>"+' +
  '"<label>Measured from (date)</label><input id=md type=date value=\\""+D.today+"\\"><label>Measured qty</label><input id=mq type=number step=any><label>Notes</label><input id=mn><button id=ms>Save measurement</button>"+' +
  '"<div class=m>Hire billing uses the latest measurement on or before each day; lines without one bill the quote qty.</div><h3>Measurements</h3><div id=mt></div>";}' +
  'function wire2(){if(!D.projects.length)return;function fill(){var j=D.projects.filter(function(x){return x.no===$("mj").value;})[0];$("ml").innerHTML=opts(j.lines,function(l){return [l.id,l.desc+" ("+l.qty+" "+l.unit+" quoted)"];});' +
  '$("mt").innerHTML=j.meas.length?"<table>"+j.meas.map(function(m){var l=j.lines.filter(function(x){return x.id===m.line;})[0];return "<tr><td>"+h(m.date)+"</td><td>"+h(l?l.desc:m.line)+"</td><td>"+m.qty+"</td></tr>";}).join("")+"</table>":"<div class=m>None yet.</div>";}' +
  '$("mj").onchange=fill;fill();$("ms").onclick=function(){act("saveMeasure",{jobNo:$("mj").value,lineId:$("ml").value,date:$("md").value,qty:$("mq").value,notes:$("mn").value});};}' +
  '$("t1").onclick=function(){TAB=1;say("");draw();};$("t2").onclick=function(){TAB=2;say("");draw();};load();</script></body></html>';

// ======================================================================= menu (replaces the O6 onOpen)
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
      .addItem('Refresh statuses', 'menuRefresh')
      .addItem('PDF sample set (test data → PDF/_Samples)', 'uiPdfSamples')
      .addItem('Rebuild report tabs', 'menuBuildReports')
      .addItem('Check set-up (time zone, files)', 'menuCheckSetup')
      .addItem('Upgrade sheet for O3 (run once)', 'menuUpgradeO3')
      .addItem('Upgrade sheet for O7 (run once)', 'menuUpgradeO7')
      .addItem('Run self-test', 'menuSelfTestAll'))
    .addToUi();
}
function menuUpgradeO7() { ui_('Upgrade sheet for O7', function (db) { var d = upgradeO7(db); return d.length ? 'Done:\n' + d.join('\n') + '\n\nNext: Staff › AppRole + Email for each app user; Items › rates for the aluminium mobile sets and parts.' : 'Already up to date.'; }); }

// ======================================================================= self-test (in memory, your data is not touched)
function selfTestAllParts_() {
  return [['core', selfTest()], ['PDF', typeof selfTestPdf === 'function' ? selfTestPdf() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_PDF.gs not installed'] }],
    ['panels', typeof selfTestUi === 'function' ? selfTestUi() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_UI.gs not installed'] }],
    ['O5', typeof selfTestO5 === 'function' ? selfTestO5() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_Reports.gs not installed'] }],
    ['O6', typeof selfTestO6 === 'function' ? selfTestO6() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_App.gs not installed'] }], ['O7', selfTestO7()]];
}
function selfTestSummary_() {
  var parts = selfTestAllParts_(), p = sum(parts, function (x) { return x[1].pass; }), f = sum(parts, function (x) { return x[1].fail; });
  var fails = [].concat.apply([], parts.map(function (x) { return x[1].log; })).filter(function (l) { return /^FAIL/.test(l); });
  return p + ' passed, ' + f + ' failed  (' + parts.map(function (x) { return x[0] + ' ' + x[1].pass; }).join(' · ') + ')' + (fails.length ? '\n\n' + fails.join('\n') : '');
}
function menuSelfTestAll() {
  var s = selfTestSummary_(), setup = typeof setupCheck_ === 'function' ? setupCheck_(SpreadsheetApp.getActive()).filter(function (l) { return /^FIX/.test(l); }) : [];
  SpreadsheetApp.getUi().alert('Self-test', s + (setup.length ? '\n\n' + setup.join('\n') : ''), SpreadsheetApp.getUi().ButtonSet.OK);
}
function selfTestLog() { Logger.log(selfTestSummary_()); } // run from the Apps Script editor
function selfTestO7() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws;
  var fresh = function () { var d = testSeed_('Full period'); upgradeO6(d); upgradeO7(d); return d; };
  var item = function (d, code, p) { d.update('Items', must(d, 'Items', 'ItemCode', code), p); };
  var parts = function (d, list) { var m = {}; list.forEach(function (s) { kitParts_(d, s[0]).forEach(function (p) { m[p.item] = (m[p.item] || 0) + s[1] * p.qty; }); }); return m; };
  var ch = function (d, kind, job, date, lines) { return createChallan(d, { kind: kind, jobNo: job, date: date, lines: lines }); };
  var db = testSeed_('Full period');
  step('K upgrade + sets', function () {
    upgradeO6(db);
    var d = upgradeO7(db);
    eq('K1 columns, tabs, settings, numbering, scrap location, sets', ['Items + IsSet', 'Damage + Chargeable', 'Damage + Outcome', 'Staff + AppRole', 'StockMoves + SetCode', 'KitParts tab', 'Conversions tab', 'ConvLines tab', 'Measures tab',
      'Settings AppCheckRole', 'Settings AppAllowTransfer', 'Location LOC-SCRAP', '25 items + 35 set parts (aluminium mobile)'].every(function (x) { return d.indexOf(x) >= 0; }), true);
    eq('K2 second run changes nothing', upgradeO7(db).length, 0);
    eq('K3 parts per set 11 / 12 / 12', ['AM-SET-S725', 'AM-SET-D725', 'AM-SET-D114'].map(function (s) { return kitParts_(db, s).length; }).join(' / '), '11 / 12 / 12');
    eq('K4 11.4 m tower: 20 diagonals, 5 boards', find(kitParts_(db, 'AM-SET-D114'), 'item', 'AM-DB-D').qty + ' ' + find(kitParts_(db, 'AM-SET-D114'), 'item', 'AM-PB-D').qty, '20 5');
    eq('K5 sets are not stock-tracked, parts are', must(db, 'Items', 'ItemCode', 'AM-SET-D725').StockTracked + ' ' + must(db, 'Items', 'ItemCode', 'AM-CT8').StockTracked, 'No Yes');
  });
  var JOB = 'CAE/J/2026/001', need = {};
  step('S sets out + billing', function () {
    testQuote_(db, 'CAE/Q/2026/001', 'Rental', [['AM-SET-D725', 'Alu tower double 7.25 m', 'set', 2, 1, 9000], ['AM-SET-S725', 'Alu tower single 7.25 m', 'set', 1, 1, 6000]], { AdvancePct: 0 });
    eq('S0 job', quoteToJob(db, 'CAE/Q/2026/001', { date: '20-Nov-2026' }), JOB);
    need = parts(db, [['AM-SET-D725', 2], ['AM-SET-S725', 1]]);
    postOpeningStock(db, Object.keys(need).map(function (k) { return { ItemCode: k, Qty: need[k] }; }).concat([{ ItemCode: 'RL-STD-20', Qty: 20 }]), '01-Nov-2026');
    eq('S1 sets available in the yard (2 double, 1 single)', setAvail_(db, 'AM-SET-D725', 'LOC-YARD') + ' ' + setAvail_(db, 'AM-SET-S725', 'LOC-YARD'), '2 1');
    var big = ch(db, 'Delivery', JOB, '01-Dec-2026', [{ itemCode: 'AM-SET-D725', qty: 3 }]);
    throws('S2 three sets refused, names the short part', function () { postChallan(db, big); }, /AM-HB-D \(part of AM-SET-D725\): only 20 at LOC-YARD, the sets need 30/);
    var half = ch(db, 'Delivery', JOB, '01-Dec-2026', [{ itemCode: 'AM-SET-S725', qty: 1.5 }]);
    throws('S3 part sets refused', function () { postChallan(db, half); }, /whole number/);
    cancelChallan(db, big); cancelChallan(db, half);
    var dc = ch(db, 'Delivery', JOB, '01-Dec-2026', [{ itemCode: 'AM-SET-D725', qty: 2 }, { itemCode: 'AM-SET-S725', qty: 1 }, { itemCode: 'RL-STD-20', qty: 10 }]);
    eq('S4 delivery: 12 + 11 part moves + 1 loose', postChallan(db, dc).moves, 24);
    eq('S5 part moves tagged with the set', db.rows('StockMoves').filter(function (v) { return v.RefNo === dc && !blank(v.SetCode); }).length, 23);
    eq('S6 yard parts out (castors 0, ladder frames 0)', stockAt(db, 'AM-CT8', 'LOC-YARD') + ' ' + stockAt(db, 'AM-LF4-S', 'LOC-YARD'), '0 0');
    var oh = onHire(db, JOB);
    eq('S7 on hire = sets + loose items, no parts', Object.keys(oh).sort().map(function (k) { return k + ' ' + oh[k]; }).join(', '), 'AM-SET-D725 2, AM-SET-S725 1, RL-STD-20 10');
    eq('S8 job on hire', must(db, 'Jobs', 'JobNo', JOB).Status, 'On hire');
    var r = runHireBilling(db, '01-Dec-2026');
    eq('S9 hire per set (2×9000 + 6000) + loose 10×90', r.warnings.length + ' ' + (r.invoices[0] && r.invoices[0].subtotal), '0 24900');
  });
  step('S returns with sets', function () {
    var x = function (lines) { var no = ch(db, 'Return', JOB, '20-Dec-2026', lines); return function () { try { postChallan(db, no); } finally { if (must(db, 'Challans', 'ChallanNo', no).Status === 'Draft') cancelChallan(db, no); } }; };
    throws('S10 damage on a set line refused', x([{ itemCode: 'AM-SET-D725', qty: 1, qtyDamaged: 1 }]), /a set line counts whole sets/);
    throws('S11 loose return of a part that is out in sets refused', x([{ itemCode: 'AM-PB-D', qty: 1 }]), /only 0 on hire for CAE\/J\/2026\/001 outside sets/);
    throws('S12 Qty 0 line for a part not in the sets on the challan', x([{ itemCode: 'AM-SET-S725', qty: 1 }, { itemCode: 'AM-PB-D', qty: 0, qtyDamaged: 1 }]), /no set on it has AM-PB-D/);
    throws('S13 more damaged parts than the sets have', x([{ itemCode: 'AM-SET-D725', qty: 1 }, { itemCode: 'AM-PB-D', qty: 0, qtyDamaged: 4 }]), /have only 3/);
    throws('S14 more sets than on hire', x([{ itemCode: 'AM-SET-D725', qty: 3 }]), /only 2 set\(s\) on hire/);
    var rt = ch(db, 'Return', JOB, '20-Dec-2026', [{ itemCode: 'AM-SET-D725', qty: 1 }, { itemCode: 'AM-PB-D', qty: 0, qtyDamaged: 1, qtyLost: 1 }, { itemCode: 'AM-CT8', qty: 0, qtyDamaged: 1 }]);
    postChallan(db, rt);
    eq('S15 boards: yard / repair / lost', ['LOC-YARD', 'LOC-REPAIR', 'LOC-LOST'].map(function (l) { return stockAt(db, 'AM-PB-D', l); }).join(' '), '1 1 1');
    eq('S16 castors: yard / repair', stockAt(db, 'AM-CT8', 'LOC-YARD') + ' ' + stockAt(db, 'AM-CT8', 'LOC-REPAIR'), '3 1');
    var dm = db.rows('Damage').filter(function (d) { return d.ChallanNo === rt; });
    eq('S17 damage rows per part, Chargeable Yes on Rental', dm.map(function (d) { return d.ItemCode + ' ' + num(d.QtyDamaged) + '/' + num(d.QtyLost) + ' ' + d.Chargeable; }).join(', '), 'AM-CT8 1/0 Yes, AM-PB-D 1/1 Yes');
    eq('S18 one double set left on hire', onHire(db, JOB)['AM-SET-D725'], 1);
    cancelChallan(db, rt);
    eq('S19 cancel: parts back on site, set back on hire, damage cancelled', stockAt(db, 'AM-PB-D', 'LOC-REPAIR') + ' ' + onHire(db, JOB)['AM-SET-D725'] + ' ' + dm.map(function (d) { return d.Status; }).join('/'), '0 2 Cancelled/Cancelled');
    postChallan(db, ch(db, 'Return', JOB, '20-Dec-2026', [{ itemCode: 'AM-SET-D725', qty: 1 }, { itemCode: 'AM-PB-D', qty: 0, qtyDamaged: 1, qtyLost: 1 }, { itemCode: 'AM-CT8', qty: 0, qtyDamaged: 1 }]));
    var r = runHireBilling(db, '31-Dec-2026');
    eq('S20 next month: 1×9000 + 6000 + 900, no adjustment', r.invoices.length + ' ' + r.invoices[0].subtotal, '1 15900');
    throws('S21 debit note needs part rates', function () { damageToDebitNote(db, JOB); }, /AM-CT8, AM-PB-D/);
    item(db, 'AM-PB-D', { RepairRate: 500, ReplacementCost: 4000 }); item(db, 'AM-CT8', { RepairRate: 300 });
    eq('S22 debit note per part (500 + 4000 + 300)', must(db, 'Notes', 'NoteNo', damageToDebitNote(db, JOB, { date: '22-Dec-2026' })).Amount, 4800);
  });
  step('D damage charging on Project jobs', function () {
    testQuote_(db, 'CAE/Q/2026/002', 'Project', [['SV-AREA-M2', 'Façade scaffold hire', 'm²', 100, 1, 80]]);
    var pj = quoteToJob(db, 'CAE/Q/2026/002');
    postChallan(db, ch(db, 'Delivery', pj, '01-Dec-2026', [{ itemCode: 'RL-STD-20', qty: 10 }]));
    postChallan(db, ch(db, 'Return', pj, '10-Dec-2026', [{ itemCode: 'RL-STD-20', qty: 10, qtyDamaged: 2 }]));
    var d = db.rows('Damage').filter(function (x) { return x.JobNo === pj; })[0];
    eq('D1 Project damage: Chargeable left for the office', d.Chargeable, '');
    throws('D2 no debit note until decided', function () { damageToDebitNote(db, pj); }, /1 row\(s\) wait for the office/);
    db.update('Damage', d, { Chargeable: 'No' });
    throws('D3 Chargeable No: nothing to charge', function () { damageToDebitNote(db, pj); }, /marked Waived/);
    eq('D4 row written off (Waived)', d.Status, 'Waived');
  });
  step('C cut / repair / scrap', function () {
    db.insert('Items', [{ ItemCode: 'TC-TUBE-15', Name: 'MS tube 1.5 m', Unit: 'pc', StockTracked: 'Yes', ReplacementCost: 600, IsSet: 'No' }]);
    item(db, 'TC-TUBE-3', { ReplacementCost: 1200 });
    postOpeningStock(db, [{ ItemCode: 'TC-TUBE-3', Qty: 10 }, { ItemCode: 'TC-TUBE-3', Qty: 4, LocID: 'LOC-REPAIR' }], '01-Dec-2026');
    db.insert('Damage', [{ DamageID: 'DMG-09001', ItemCode: 'TC-TUBE-3', QtyDamaged: 2, Status: 'Open', JobNo: JOB }, { DamageID: 'DMG-09002', ItemCode: 'TC-TUBE-3', QtyDamaged: 1, Status: 'Open' }, { DamageID: 'DMG-09003', ItemCode: 'TC-TUBE-3', QtyDamaged: 1, Status: 'Open' }]);
    var cut = saveConversion(db, { date: '2026-12-22', locId: 'LOC-REPAIR', fromItem: 'TC-TUBE-3', fromQty: 1, damageId: 'DMG-09001', post: true, lines: [{ toItem: 'TC-TUBE-15', qty: 1, kind: 'Output' }, { toItem: 'TC-TUBE-3', qty: 1, kind: 'Scrap' }] });
    eq('C1 cut posted, number', cut.ref + ' ' + must(db, 'Conversions', 'ConvID', cut.ref).Status, 'CAE/CV/2026/001 Posted');
    eq('C2 3 m −1 in Repair, 1.5 m +1 in yard, 3 m +1 in scrap', [stockAt(db, 'TC-TUBE-3', 'LOC-REPAIR'), stockAt(db, 'TC-TUBE-15', 'LOC-YARD'), stockAt(db, 'TC-TUBE-3', 'LOC-SCRAP')].join(' '), '3 1 1');
    eq('C3 damage outcome Cut, write-off 1200 − 600', must(db, 'Damage', 'DamageID', 'DMG-09001').Outcome + ' ' + must(db, 'Conversions', 'ConvID', cut.ref).WriteOff, 'Cut 600');
    var rep = saveConversion(db, { date: '2026-12-22', locId: 'LOC-REPAIR', fromItem: 'TC-TUBE-3', fromQty: 1, damageId: 'DMG-09002', post: true, lines: [{ toItem: 'TC-TUBE-3', qty: 1 }] });
    eq('C4 repaired: Repair → yard, outcome Repaired, nothing written off', stockAt(db, 'TC-TUBE-3', 'LOC-YARD') + ' ' + must(db, 'Damage', 'DamageID', 'DMG-09002').Outcome + ' ' + must(db, 'Conversions', 'ConvID', rep.ref).WriteOff, '11 Repaired 0');
    saveConversion(db, { date: '2026-12-22', locId: 'LOC-REPAIR', fromItem: 'TC-TUBE-3', fromQty: 1, damageId: 'DMG-09003', post: true, lines: [{ toItem: 'TC-TUBE-3', qty: 1, kind: 'Scrap' }] });
    eq('C5 scrapped: outcome Scrapped, scrap 2', must(db, 'Damage', 'DamageID', 'DMG-09003').Outcome + ' ' + stockAt(db, 'TC-TUBE-3', 'LOC-SCRAP'), 'Scrapped 2');
    var f = function (a, re, name) { var r = saveConversion(db, Object.assign({ date: '2026-12-22', locId: 'LOC-REPAIR', fromItem: 'TC-TUBE-3', fromQty: 1, post: true, lines: [{ toItem: 'TC-TUBE-15', qty: 1 }] }, a));
      eq(name, !!r.warn + ' ' + must(db, 'Conversions', 'ConvID', r.ref).Status + ' ' + re.test(r.msg), 'true Draft true'); cancelConversion(db, r.ref); };
    f({ fromQty: 5 }, /only 1 at LOC-REPAIR/, 'C6 more than in Repair → Draft with the reason');
    f({ locId: 'LOC-S0001' }, /yard .* or Repair/, 'C7 only yard or Repair');
    f({ lines: [{ toItem: 'AM-SET-D725', qty: 1 }] }, /is a set/, 'C8 output cannot be a set');
    f({ fromItem: 'TC-TUBE-15', damageId: 'DMG-09001' }, /does not match/, 'C9 damage row for another item');
    f({ damageId: 'DMG-09001' }, /already Cut/, 'C10 damage row already done');
    f({ lines: [{ toItem: 'TC-TUBE-3', qty: 2 }], fromQty: 1 }, /more than the start qty/, 'C11 more back than started with');
    f({ locId: 'LOC-YARD', lines: [{ toItem: 'TC-TUBE-3', qty: 1 }] }, /only works from Repair/, 'C12 same item back from the yard refused');
    throws('C13 no lines refused', function () { saveConversion(db, { fromItem: 'TC-TUBE-3', fromQty: 1, lines: [] }); }, /at least one line/);
    cancelConversion(db, cut.ref);
    eq('C14 cancel cut: stock back, outcome cleared', [stockAt(db, 'TC-TUBE-3', 'LOC-REPAIR'), stockAt(db, 'TC-TUBE-15', 'LOC-YARD'), stockAt(db, 'TC-TUBE-3', 'LOC-SCRAP'), must(db, 'Damage', 'DamageID', 'DMG-09001').Outcome || '-'].join(' '), '2 0 1 -');
  });
  step('M measured project billing', function () {
    var dp = fresh();
    testQuote_(dp, 'CAE/Q/2026/001', 'Project', [['SV-AREA-M2', 'Façade scaffold hire', 'm²', 500, 3, 80], ['', 'Site supervision (monthly lump sum)', 'lot', 1, 3, 20000]], { AdvancePct: 0 });
    var pj = quoteToJob(dp, 'CAE/Q/2026/001'), ln = quoteLines(dp, 'CAE/Q/2026/001')[0].LineID;
    postOpeningStock(dp, [{ ItemCode: 'RL-STD-20', Qty: 50 }], '01-Nov-2026');
    postChallan(dp, ch(dp, 'Delivery', pj, '01-Dec-2026', [{ itemCode: 'RL-STD-20', qty: 30 }]));
    saveMeasure(dp, { jobNo: pj, lineId: ln, date: '2026-12-01', qty: 300 });
    saveMeasure(dp, { jobNo: pj, lineId: ln, date: '2026-12-15', qty: 450 });
    eq('M1 first month bills the measured 300 m² + lump sum', runHireBilling(dp, '01-Dec-2026').invoices[0].subtotal, 44000);
    eq('M2 next month: 450 m² + lump sum + 150 m² adjustment', runHireBilling(dp, '31-Dec-2026').invoices[0].subtotal, 68000);
    throws('M3 measurement only on Project jobs', function () { testQuote_(dp, 'CAE/Q/2026/002', 'Rental', [['RL-STD-20', 'x', 'pc', 1, 1, 90]]); saveMeasure(dp, { jobNo: quoteToJob(dp, 'CAE/Q/2026/002'), lineId: ln, qty: 1 }); }, /not a Project job/);
    throws('M4 negative measurement refused', function () { saveMeasure(dp, { jobNo: pj, lineId: ln, qty: -1 }); }, /0 or more/);
    throws('M5 line must be a monthly line of the job', function () { saveMeasure(dp, { jobNo: pj, lineId: 'QL-99999', qty: 1 }); }, /monthly line/);
    dp.insert('Items', { ItemCode: 'AM-SET-X', Name: 'Empty set', IsSet: 'Yes', StockTracked: 'No' });
    throws('K6 set without parts refused', function () { kitParts_(dp, 'AM-SET-X'); }, /no parts in KitParts/);
    dp.insert('KitParts', { KitPartID: 'KP-0999', SetCode: 'AM-SET-X', ItemCode: 'AM-SET-S725', QtyPerSet: 1 });
    throws('K7 set inside a set refused', function () { kitParts_(dp, 'AM-SET-X'); }, /itself a set/);
  });
  step('A app: roles, transfer, sets, conversions', function () {
    var da = fresh(), t0 = dayNum(today()), D = function (k) { return fromDay(t0 - k); }, yr = String(D(0).getFullYear());
    da.insert('Staff', [{ StaffID: 'STF-001', Name: 'Field', Email: 'Field@Test', AppRole: 'Field', Status: 'Active' }, { StaffID: 'STF-002', Name: 'Viewer', Email: 'viewer@test', AppRole: 'Viewer', Status: 'Active' }]);
    da.insert('Jobs', { JobNo: JOB, CustID: 'CUST-0001', SiteID: 'SITE-0001', JobType: 'Rental', HireBasis: 'Item', Status: 'Awaiting order' });
    var n1 = parts(da, [['AM-SET-S725', 1]]);
    postOpeningStock(da, Object.keys(n1).map(function (k) { return { ItemCode: k, Qty: n1[k] }; }).concat([{ ItemCode: 'TC-TUBE-3', Qty: 5 }]), D(20));
    eq('Q1 panel stock lookup shows whole sets available', uiGetDb_(da, 'stock', 'LOC-YARD')['AM-SET-S725'], 1);
    eq('Q2 panel item list offers sets as stock items', (find(uiInitDb_(da).items, 'code', 'AM-SET-S725') || {}).stock, true);
    var add = function (no, kind, by, lines, extra) {
      da.insert('Challans', Object.assign({ ChallanNo: no, Kind: kind, ChallanDate: D(2), JobNo: JOB, Status: 'Submitted', SubmittedBy: by }, extra || {}));
      da.insert('ChallanLines', lines.map(function (l, i) { return Object.assign({ LineID: 'APP-' + no.slice(4) + i, ChallanNo: no, QtyDamaged: 0, QtyLost: 0 }, l); }));
    };
    var run = function () { return appSweepRun_({ db: da, noPdf: true }); }, c = function (no) { return find(da.rows('Challans'), 'ChallanNo', no); };
    add('APP-a0000001', 'Delivery', 'nobody@test', [{ ItemCode: 'AM-SET-S725', Qty: 1 }]);
    add('APP-a0000002', 'Delivery', 'viewer@test', [{ ItemCode: 'AM-SET-S725', Qty: 1 }]);
    add('APP-a0000003', 'Transfer', 'field@test', [{ ItemCode: 'TC-TUBE-3', Qty: 1 }], { FromLoc: 'LOC-YARD', ToLoc: 'LOC-REPAIR' });
    run();
    eq('A1 unknown email refused, no number used', /not in the Staff tab/.test(c('APP-a0000001').AppMsg) + ' ' + c('APP-a0000001').Status, 'true Draft');
    eq('A2 Viewer refused', /app role Viewer/.test(c('APP-a0000002').AppMsg), true);
    eq('A3 transfer from the app refused (office-only)', /office-only/.test(c('APP-a0000003').AppMsg), true);
    add('APP-a0000004', 'Delivery', 'field@test', [{ ItemCode: 'AM-SET-S725', Qty: 1 }]);
    var r = run();
    eq('A4 Field user: set delivered from the app (email case ignored)', r.posted + ' ' + (c('CAE/DC/' + yr + '/001') || {}).Status, '1 Posted');
    eq('A5 app set delivery: parts moved, set on hire', stockAt(da, 'AM-OR30', 'LOC-S0001') + ' ' + onHire(da, JOB)['AM-SET-S725'], '4 1');
    var rt = uiSaveChallan_(da, { kind: 'Return', jobNo: JOB, date: fmtDay(dayNum(D(1))), post: true, lines: [{ itemCode: 'AM-SET-S725', qty: 1 }, { itemCode: 'AM-PBT-S', qty: '', qtyDamaged: 1 }] });
    eq('A6 panel return keeps the Qty 0 damage line', !rt.warn + ' ' + stockAt(da, 'AM-PBT-S', 'LOC-REPAIR') + ' ' + stockAt(da, 'AM-PBT-S', 'LOC-YARD'), 'true 1 2');
    var cvAdd = function (id, by, qty, lines, extra) {
      da.insert('Conversions', Object.assign({ ConvID: id, ConvDate: D(1), LocID: 'LOC-YARD', FromItem: 'TC-TUBE-3', FromQty: qty, Status: 'Submitted', SubmittedBy: by }, extra || {}));
      da.insert('ConvLines', lines.map(function (l, i) { return Object.assign({ ConvLineID: 'APP-' + id.slice(4) + i, ConvID: id, Kind: 'Output' }, l); }));
    };
    var cv = function (id) { return find(da.rows('Conversions'), 'ConvID', id); };
    cvAdd('APP-c0000001', 'field@test', 1, [{ ToItem: 'TC-TUBE-15', Qty: 2 }]);
    da.insert('Items', { ItemCode: 'TC-TUBE-15', Name: 'MS tube 1.5 m', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No' });
    cvAdd('APP-c0000002', 'field@test', 9, [{ ToItem: 'TC-TUBE-15', Qty: 2 }]);
    cvAdd('APP-c0000003', 'viewer@test', 1, [{ ToItem: 'TC-TUBE-15', Qty: 2 }]);
    cvAdd('APP-c0000004', 'field@test', 1, [{ ToItem: 'TC-TUBE-15', Qty: 2 }], { ConvDate: '22/12/2026' });
    r = run();
    var no1 = 'CAE/CV/' + yr + '/001', no2 = 'CAE/CV/' + yr + '/002';
    eq('A7 app conversion numbered + posted, lines renumbered', (cv(no1) || {}).Status + ' ' + convLines_(da, no1).map(function (l) { return /^CVL-/.test(l.ConvLineID); }).join(), 'Posted true');
    eq('A8 yard: 3 m −1, 1.5 m +2', stockAt(da, 'TC-TUBE-3', 'LOC-YARD') + ' ' + stockAt(da, 'TC-TUBE-15', 'LOC-YARD'), '4 2');
    eq('A9 not enough stock: numbered, back to Draft with the reason', (cv(no2) || {}).Status + ' ' + /only 4 at LOC-YARD/.test((cv(no2) || {}).AppMsg), 'Draft true');
    eq('A10 Viewer conversion refused, text date refused (locale)', /app role Viewer/.test(cv('APP-c0000003').AppMsg) + ' ' + /Locale = English \(United Kingdom\)/.test(cv('APP-c0000004').AppMsg), 'true true');
    da.update('Conversions', cv(no2), { FromQty: 1, Status: 'Submitted' });
    run();
    eq('A11 fixed + resubmitted: posted under the same number', cv(no2).Status + ' ' + (find(da.rows('Conversions'), 'ConvID', 'CAE/CV/' + yr + '/003') ? 'new no.' : 'same no.'), 'Posted same no.');
  });
  step('H panel html', function () {
    var js = O7_HTML_.slice(O7_HTML_.indexOf('<script>') + 8, O7_HTML_.lastIndexOf('</script>'));
    eq('H1 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
    var used = {}, re = /act\("(\w+)"/g, m; while ((m = re.exec(O7_HTML_))) used[m[1]] = 1;
    eq('H2 every panel action exists on the server', Object.keys(used).filter(function (k) { return !O7_ACTIONS_[k]; }).join(',') || 'none', 'none');
    var init = uiClean_(o7InitDb_(db));
    eq('H3 panel data: damage rows waiting, project jobs', init.damage.length >= 1 && init.projects.length === 1 && JSON.stringify(init).indexOf('"_r"') < 0, true);
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
