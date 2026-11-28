/**
 * Core Access Ops — AppSheet support (stage O6) · 11 Nov 2026
 * Fifth script file, LAST: Apps Script › + › Script › name it CAE_Ops_App › paste › Save › reload the sheet.
 * File order: Core, PDF, UI, Reports, App. This file replaces, by name (last definition wins):
 *   onOpen          — the O5 menu + submenu "AppSheet (mobile)"
 *   menuSelfTestAll — core + PDF + panels + O5 + O6
 * Core, PDF, UI and Reports files are unchanged.
 *
 * How the mobile app works (guide: claude/ops/APPSHEET_GUIDE.md):
 *   The AppSheet app adds challans with a temporary number "APP-xxxxxxxx" and lines, then "Submit for posting" sets
 *   Status = Submitted. A timed trigger (every 5 min, Settings AppSweepMinutes) runs appSweep(): it checks the challan,
 *   gives it the real number (CAE/DC/yyyy/nnn), fills From/To, posts it with the same postChallan() as the panel,
 *   copies damage photos to the Damage rows and makes the challan PDF. A challan that cannot be posted goes back to
 *   Draft with the reason in AppMsg, so the storekeeper sees it in the app.
 *   AppSheet only calls standalone scripts, so no AppSheet bot is needed or used — this works on any AppSheet plan.
 * Also: QR labels (items, locations) as a printable PDF, and the AppStock tab (stock per item × location for the app).
 */
var CAE_O6_VERSION = 'O6 · 11 Nov 2026';
var APP_PREFIX_ = 'APP-';
var QR_URL_ = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=4&data={data}';
var O6_SETTINGS_ = [
  ['AppAutoPost', 'Yes', 'AppSheet challans: Yes = post automatically; No = only number them, the office posts in the panel'],
  ['AppMakePdf', 'Yes', 'Make the challan PDF after an app challan is posted'],
  ['AppSweepMinutes', '5', 'How often app challans are picked up: 1, 5, 10, 15 or 30 minutes'],
  ['AppMaxBackDays', '31', 'App challans dated more than this many days ago are refused (enter old challans in the panel)'],
  ['QrUrl', QR_URL_, 'QR image service for labels; {data} = item or location code'],
];
function isAppNo_(v) { return String(v || '').indexOf(APP_PREFIX_) === 0; }
function colLetter_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

// ======================================================================= upgrade (menu, run once, safe to repeat)
function upgradeO6(db) {
  var done = [];
  if (db.ensureColumn('Challans', 'SubmittedBy', 'Notes')) done.push('Challans + SubmittedBy');
  if (db.ensureColumn('Challans', 'AppMsg', 'SubmittedBy')) done.push('Challans + AppMsg');
  if (db.ensureColumn('ChallanLines', 'Photo', 'Remarks')) done.push('ChallanLines + Photo');
  O6_SETTINGS_.forEach(function (s) {
    if (find(db.rows('Settings'), 'Key', s[0])) return;
    var row = { Key: s[0], Value: s[1] }; if (db.headers('Settings').indexOf('Notes') >= 0) row.Notes = s[2];
    db.insert('Settings', row); done.push('Settings ' + s[0]);
  });
  if (db.ss) {
    if (ensureListValue_(db, 'PostStatus', 'Submitted', 'Challans', 'Status')) done.push('Lists PostStatus + Submitted');
    if (buildAppStock_(db)) done.push('AppStock tab');
  }
  log_(db, 'Upgrade O6', '', done.join('; ') || 'up to date');
  return done;
}
// Adds a value to a Lists column and points the tab's dropdown at Lists rows 2–20 (strictness kept as it was).
function ensureListValue_(db, list, value, tab, col) {
  var ls = db.sheet('Lists'), h = ls.getRange(1, 1, 1, ls.getLastColumn()).getValues()[0].map(String), j = h.indexOf(list);
  if (j < 0) throw new Error('Lists: no column ' + list);
  var vals = ls.getRange(2, j + 1, Math.max(ls.getLastRow() - 1, 1), 1).getValues().map(function (r) { return String(r[0]); }).filter(String);
  var added = vals.indexOf(value) < 0;
  if (added) ls.getRange(vals.length + 2, j + 1).setValue(value);
  var L = colLetter_(j + 1), s = db.sheet(tab), c = db.headers(tab).indexOf(col) + 1;
  if (c < 1) throw new Error(tab + ': no column ' + col);
  var rng = s.getRange(2, c, Math.max(s.getMaxRows() - 1, 1), 1), old = s.getRange(2, c).getDataValidation();
  rng.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(ls.getRange('$' + L + '$2:$' + L + '$20'), true).setAllowInvalid(old ? old.getAllowInvalid() : false).build());
  return added;
}
// AppStock: one row per item × location with the quantity there now (live formula from StockMoves). Read-only in the app.
function appStockFormula_(db) {
  var c = function (k) { var L = colL(db, 'StockMoves', k); return 'StockMoves!$' + L + '$2:$' + L; };
  var it = c('ItemCode'), q = c('Qty'), fr = c('FromLoc'), to = c('ToLoc');
  return '=IFERROR(QUERY(ARRAYFORMULA({' + it + '&"|"&' + to + ',' + it + ',' + to + ',' + q + '*1;' + it + '&"|"&' + fr + ',' + it + ',' + fr + ',-' + q + '}),' +
    '"select Col1, Col2, Col3, sum(Col4) where Col2 <> \'\' and Col3 <> \'\' group by Col1, Col2, Col3 label sum(Col4) \'\'",0),"")';
}
function buildAppStock_(db) {
  var ss = db.ss, s = ss.getSheetByName('AppStock'), isNew = !s;
  if (!s) s = ss.insertSheet('AppStock', ss.getSheets().length);
  s.getRange(1, 1, 1, 4).setValues([['StockKey', 'ItemCode', 'LocID', 'Qty']]).setBackground('#17707D').setFontColor('#FFFFFF').setFontWeight('bold');
  s.getRange('A2').setFormula(appStockFormula_(db));
  s.getRange('D2:D').setNumberFormat('0.##');
  s.setFrozenRows(1); s.setTabColor('#17707D');
  if (!s.getProtections(SpreadsheetApp.ProtectionType.SHEET).length) s.protect().setDescription('AppStock — formula for the AppSheet app (O6)').setWarningOnly(true);
  return isNew;
}

// ======================================================================= one app challan
// c = Challans row with Status Submitted. Checks → real number → From/To → post (Settings AppAutoPost) → photos → PDF.
function appChallanDefaults_(db, c, job) {
  var kind = String(c.Kind || ''), sl = kind === 'Transfer' ? '' : siteLoc(db, job.SiteID);
  var d = { Delivery: [LOC.YARD, job.JobType === 'Sale' ? LOC.SOLD : sl], Sale: [LOC.YARD, LOC.SOLD], Return: [sl, LOC.YARD], Transfer: ['', ''] }[kind];
  if (!d) throw new Error('Kind must be Delivery, Return, Transfer or Sale');
  return { FromLoc: blank(c.FromLoc) ? d[0] : String(c.FromLoc), ToLoc: blank(c.ToLoc) ? d[1] : String(c.ToLoc) };
}
function appProcessChallan_(db, c, o) {
  o = o || {};
  var who = c.SubmittedBy || 'app', d = c.ChallanDate;
  if (!(d instanceof Date)) throw new Error('Challan date "' + d + '" was not read as a date. In AppSheet set Data › Challans › Locale = English (United Kingdom), then submit again.');
  var t = dayNum(today()), back = num(S(db, 'AppMaxBackDays', 31)) || 31;
  if (dayNum(d) > t) throw new Error('Challan date ' + fmtDay(dayNum(d)) + ' is in the future');
  if (dayNum(d) < t - back) throw new Error('Challan date ' + fmtDay(dayNum(d)) + ' is more than ' + back + ' days ago — enter old challans in the sheet panel');
  if (blank(c.JobNo)) throw new Error('Choose the job');
  var job = must(db, 'Jobs', 'JobNo', c.JobNo);
  if (job.Status === 'Closed') throw new Error(job.JobNo + ' is Closed');
  var lines = db.rows('ChallanLines').filter(function (l) { return String(l.ChallanNo) === String(c.ChallanNo); });
  if (!lines.length) throw new Error('The challan has no lines');
  var loc = appChallanDefaults_(db, c, job);
  if (!loc.FromLoc || !loc.ToLoc) throw new Error('Transfer: choose From and To locations');
  if (loc.FromLoc === loc.ToLoc) throw new Error('From and To are the same location');
  // numbering (only once: a challan already numbered keeps its number when it is submitted again)
  var no = String(c.ChallanNo), patch = { FromLoc: loc.FromLoc, ToLoc: loc.ToLoc, Status: 'Draft', AppMsg: '' };
  if (isAppNo_(no)) {
    no = nextId(db, 'DC', d); patch.ChallanNo = no;
    lines.forEach(function (l) { db.update('ChallanLines', l, { ChallanNo: no }); });
  }
  var fresh = lines.filter(function (l) { return blank(l.LineID) || isAppNo_(l.LineID); });
  if (fresh.length) { var ids = nextIds(db, 'CL', fresh.length); fresh.forEach(function (l, i) { db.update('ChallanLines', l, { LineID: ids[i] }); }); }
  db.update('Challans', c, patch);
  if (S(db, 'AppAutoPost', 'Yes') !== 'Yes') {
    db.update('Challans', c, { AppMsg: 'Numbered ' + no + ' — waiting for the office to post' });
    log_(db, 'App challan numbered', no, who);
    return { no: no, posted: false };
  }
  try { var r = postChallan(db, no); }
  catch (e) {
    db.update('Challans', c, { AppMsg: String(e.message).replace(/^Not posted:\n/, 'Not posted: ').replace(/\n/g, '; ').slice(0, 480) });
    log_(db, 'App challan not posted', no, who + ' · ' + e.message.replace(/\n/g, '; '));
    return { no: no, posted: false, error: e.message };
  }
  var hasPhoto = db.headers('ChallanLines').indexOf('Photo') >= 0, ph = 0;
  if (hasPhoto) db.rows('Damage').forEach(function (x) {
    if (x.ChallanNo !== no || !blank(x.Photo)) return;
    var l = lines.filter(function (y) { return y.ItemCode === x.ItemCode && !blank(y.Photo); })[0];
    if (l) { db.update('Damage', x, { Photo: l.Photo }); ph++; }
  });
  var msg = '';
  if (!o.noPdf && S(db, 'AppMakePdf', 'Yes') === 'Yes' && typeof makePdf === 'function') {
    try { makePdf(db, 'Challan', no); } catch (e) { msg = 'Posted; PDF not made: ' + e.message; }
  }
  if (msg) db.update('Challans', c, { AppMsg: msg.slice(0, 480) });
  log_(db, 'App challan posted', no, who + ' · ' + r.moves + ' moves' + (r.damage ? ' · ' + r.damage + ' damage/loss' + (ph ? ', ' + ph + ' photos' : '') : ''));
  return { no: no, posted: true, moves: r.moves, damage: r.damage, photos: ph };
}

// ======================================================================= sweep (timed trigger)
// o = { db, noPdf, deadline }. Returns { done, posted, failed, left, list }.
function appSweepRun_(o) {
  o = o || {};
  var db = o.db || new SheetDb(), out = { done: 0, posted: 0, failed: 0, left: 0, list: [] };
  var subs = db.rows('Challans').filter(function (c) { return c.Status === 'Submitted'; })
    .sort(function (a, b) { return (dayNum(a.ChallanDate) || 0) - (dayNum(b.ChallanDate) || 0) || a._r - b._r; });
  subs.forEach(function (c) {
    if (timeUp_(o.deadline)) { out.left++; return; }
    var before = c.ChallanNo, r;
    try { r = appProcessChallan_(db, c, o); }
    catch (e) {
      db.update('Challans', c, { Status: 'Draft', AppMsg: ('Not posted: ' + e.message).slice(0, 480) });
      log_(db, 'App challan refused', before, (c.SubmittedBy || 'app') + ' · ' + e.message);
      r = { no: before, posted: false, error: e.message };
    }
    out.done++; if (r.posted) out.posted++; else if (r.error) out.failed++;
    out.list.push(r);
  });
  return out;
}
// Trigger handler (Tools › AppSheet › Start auto-posting). Cheap when idle: reads only the Status column.
function appSweep() {
  var db = new SheetDb(), s = db.sheet('Challans'), j = db.headers('Challans').indexOf('Status') + 1, n = s.getLastRow();
  if (j < 1 || n < 2) return;
  if (!s.getRange(2, j, n - 1, 1).getValues().some(function (r) { return r[0] === 'Submitted'; })) return;
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) return; // the office is posting something; the next run picks it up
  try { appSweepRun_({ db: db, deadline: deadline_() }); SpreadsheetApp.flush(); } finally { lock.releaseLock(); }
}
function appTriggers_() { return ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'appSweep'; }); }
function appTriggerOn_(db) {
  appTriggers_().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  var m = num(S(db, 'AppSweepMinutes', 5)); if ([1, 5, 10, 15, 30].indexOf(m) < 0) m = 5;
  ScriptApp.newTrigger('appSweep').timeBased().everyMinutes(m).create();
  return m;
}

// ======================================================================= QR labels (items / locations → PDF/Labels)
function qrLabelList_(db, kind) {
  if (kind === 'Locations') return db.rows('Locations').filter(function (l) { return !blank(l.LocID) && l.Status !== 'Inactive' && ['Yard', 'Site', 'Repair'].indexOf(l.Type) >= 0; })
    .map(function (l) { return { code: String(l.LocID), name: String(l.Name || ''), sub: String(l.Type || '') }; });
  return db.rows('Items').filter(function (i) { return !blank(i.ItemCode) && i.StockTracked === 'Yes' && i.Status !== 'Inactive'; })
    .map(function (i) { return { code: String(i.ItemCode), name: String(i.Name || ''), sub: [i.Size, i.Unit].filter(function (x) { return !blank(x); }).join(' · ') }; });
}
function qrUrl_(db, code) { return String(S(db, 'QrUrl', QR_URL_)).replace('{data}', encodeURIComponent(code)); }
function makeQrLabels(db, kind) {
  var list = qrLabelList_(db, kind);
  if (!list.length) throw new Error(kind === 'Locations' ? 'No active Yard / Site / Repair locations' : 'No active stock-tracked items (Items › StockTracked = Yes)');
  var res = UrlFetchApp.fetchAll(list.map(function (x) { return { url: qrUrl_(db, x.code), muteHttpExceptions: true }; })), bad = [];
  var name = 'CAE QR labels · ' + kind + ' · ' + fmtDay(dayNum(today()));
  var folder = subFolder_(subFolder_(opsFolder_(db), 'PDF'), 'Labels');
  trashSame_(folder, name); trashSame_(folder, name + '.pdf');
  var doc = DocumentApp.create(name), body = doc.getBody(), cols = 3, rows = [];
  body.setPageWidth(595.28).setPageHeight(841.89).setMarginTop(28).setMarginBottom(28).setMarginLeft(28).setMarginRight(28);
  var hd = body.getChild(0).asParagraph(); hd.setText('Core Access Engineering Ltd. · QR labels · ' + kind + ' · ' + list.length + ' labels · cut along the lines'); hd.editAsText().setFontFamily('Arial').setFontSize(8).setForegroundColor('#5F676E');
  for (var i = 0; i < list.length; i += cols) { var r = list.slice(i, i + cols).map(function () { return ''; }); while (r.length < cols) r.push(''); rows.push(r); }
  var t = body.appendTable(rows); t.setBorderColor('#D5D8DA');
  list.forEach(function (x, k) {
    var cell = t.getCell(Math.floor(k / cols), k % cols), p = cell.getChild(0).asParagraph();
    cell.setPaddingTop(8).setPaddingBottom(8);
    p.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    var resp = res[k];
    if (resp.getResponseCode() === 200) p.appendInlineImage(resp.getBlob()).setWidth(110).setHeight(110);
    else { p.setText('[QR not loaded]'); bad.push(x.code); }
    [[x.code, 13, true, '#000000'], [x.name, 8, false, '#2B3036'], [x.sub, 7, false, '#5F676E']].forEach(function (z) {
      if (!z[0]) return;
      var q = cell.appendParagraph(z[0]); q.setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingBefore(0).setSpacingAfter(0);
      q.editAsText().setFontFamily('Arial').setFontSize(z[1]).setBold(z[2]).setForegroundColor(z[3]);
    });
  });
  doc.saveAndClose();
  var f = DriveApp.getFileById(doc.getId()); f.moveTo(folder);
  var pdf = folder.createFile(f.getAs(MimeType.PDF).setName(name + '.pdf'));
  if (S(db, 'KeepPdfDocs', 'Yes') !== 'Yes') f.setTrashed(true);
  log_(db, 'QR labels', kind, list.length + ' labels' + (bad.length ? ' · ' + bad.length + ' QR images not loaded' : ''));
  return { url: pdf.getUrl(), n: list.length, bad: bad };
}

// ======================================================================= set-up check
function appCheck_(db) {
  var out = [], ok = function (c, t, fix) { out.push((c ? 'ok   ' : 'FIX  ') + t + (c ? '' : ' — ' + fix)); };
  ok(db.headers('Challans').indexOf('AppMsg') >= 0 && db.headers('ChallanLines').indexOf('Photo') >= 0, 'O6 columns', 'run AppSheet › Upgrade sheet for O6');
  var ls = db.ss.getSheetByName('Lists'), h = ls.getRange(1, 1, 1, ls.getLastColumn()).getValues()[0].map(String), j = h.indexOf('PostStatus');
  ok(j >= 0 && ls.getRange(2, j + 1, 19, 1).getValues().some(function (r) { return r[0] === 'Submitted'; }), 'Lists PostStatus has Submitted', 'run AppSheet › Upgrade sheet for O6');
  ok(!!db.ss.getSheetByName('AppStock'), 'AppStock tab', 'run AppSheet › Upgrade sheet for O6');
  ok(appTriggers_().length === 1, 'Auto-posting trigger (' + appTriggers_().length + ')', 'AppSheet › Start auto-posting');
  ok(db.ss.getSpreadsheetLocale() === 'en_GB', 'Sheet locale ' + db.ss.getSpreadsheetLocale(), 'File › Settings › Locale = United Kingdom (matches the AppSheet table locale)');
  var noLoc = db.rows('Sites').filter(function (s) { return !blank(s.SiteID) && blank(s.LocID); }).length;
  ok(!noLoc, 'Every site has a location', noLoc + ' site(s) without LocID: Tools › Number new rows');
  var wait = db.rows('Challans').filter(function (c) { return c.Status === 'Submitted'; }).length, msg = db.rows('Challans').filter(function (c) { return c.Status === 'Draft' && !blank(c.AppMsg); }).length;
  out.push('info ' + wait + ' app challan(s) waiting · ' + msg + ' draft(s) with an app message');
  return out;
}

// ======================================================================= menu (replaces the O5 onOpen)
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
    .addItem('Dashboard', 'menuGoDashboard')
    .addSubMenu(ui.createMenu('AppSheet (mobile)')
      .addItem('Post app challans now', 'menuAppSweep')
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
      .addItem('Run self-test', 'menuSelfTestAll'))
    .addToUi();
}
function menuUpgradeO6() { ui_('Upgrade sheet for O6', function (db) { var d = upgradeO6(db); return d.length ? 'Done:\n' + d.join('\n') + '\n\nNext: AppSheet › Start auto-posting.' : 'Already up to date.'; }); }
function menuAppSweep() {
  ui_('Post app challans', function (db) {
    var r = appSweepRun_({ db: db, deadline: deadline_() });
    if (!r.done) return 'No app challans waiting (Status = Submitted).';
    return r.done + ' app challan(s): ' + r.posted + ' posted, ' + r.failed + ' sent back to Draft (reason in AppMsg)' + (r.left ? ', ' + r.left + ' left for the next run' : '') + '.\n\n' +
      r.list.map(function (x) { return x.no + (x.posted ? ' posted' : x.error ? ' — ' + x.error.replace(/\n/g, '; ') : ' numbered'); }).join('\n');
  });
}
function menuAppTriggerOn() { ui_('Auto-posting', function (db) { return 'On: app challans are picked up every ' + appTriggerOn_(db) + ' minutes (Settings AppSweepMinutes).'; }); }
function menuAppTriggerOff() { ui_('Auto-posting', function () { var n = appTriggers_().length; appTriggers_().forEach(function (t) { ScriptApp.deleteTrigger(t); }); return n ? 'Off. Use "Post app challans now" when needed.' : 'It was not on.'; }); }
function menuAppCheck() { var ui = SpreadsheetApp.getUi(); ui.alert('AppSheet set-up', appCheck_(new SheetDb()).join('\n'), ui.ButtonSet.OK); }
function qrMenu_(kind) {
  ui_('QR labels', function (db) { var r = makeQrLabels(db, kind); return r.n + ' labels: ' + r.url + (r.bad.length ? '\n\nQR images not loaded for: ' + r.bad.join(', ') + ' — run again, or change Settings QrUrl.' : ''); });
}
function menuQrItems() { qrMenu_('Items'); }
function menuQrLocations() { qrMenu_('Locations'); }

// ======================================================================= self-test (in memory, your data is not touched)
function menuSelfTestAll() {
  var parts = [['core', selfTest()], ['PDF', typeof selfTestPdf === 'function' ? selfTestPdf() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_PDF.gs not installed'] }],
    ['panels', typeof selfTestUi === 'function' ? selfTestUi() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_UI.gs not installed'] }],
    ['O5', typeof selfTestO5 === 'function' ? selfTestO5() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_Reports.gs not installed'] }], ['O6', selfTestO6()]];
  var p = sum(parts, function (x) { return x[1].pass; }), f = sum(parts, function (x) { return x[1].fail; });
  var fails = [].concat.apply([], parts.map(function (x) { return x[1].log; })).filter(function (l) { return /^FAIL/.test(l); });
  var setup = typeof setupCheck_ === 'function' ? setupCheck_(SpreadsheetApp.getActive()).filter(function (l) { return /^FIX/.test(l); }) : [];
  SpreadsheetApp.getUi().alert('Self-test', p + ' passed, ' + f + ' failed  (' + parts.map(function (x) { return x[0] + ' ' + x[1].pass; }).join(' · ') + ')\n\n' + fails.concat(setup).join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}
function selfTestO6() {
  var T = testKit_(), eq = T.eq, step = T.step;
  var db = testSeed_('Full period'), t0 = dayNum(today()), D = function (k) { return fromDay(t0 - k); }, yr = String(D(0).getFullYear());
  var dc = function (n) { return 'CAE/DC/' + yr + '/' + pad(n, 3); }, JOB = 'CAE/J/2026/001', run = function (o) { return appSweepRun_(Object.assign({ db: db, noPdf: true }, o || {})); };
  var ch = function (no) { return find(db.rows('Challans'), 'ChallanNo', no); };
  var add = function (no, kind, date, lines, extra) {
    db.insert('Challans', Object.assign({ ChallanNo: no, Kind: kind, ChallanDate: date, JobNo: JOB, Status: 'Submitted', SubmittedBy: 'store@test' }, extra || {}));
    db.insert('ChallanLines', lines.map(function (l, i) { return Object.assign({ LineID: 'APP-' + no.slice(4) + i, ChallanNo: no, QtyDamaged: 0, QtyLost: 0 }, l); }));
  };
  step('U upgrade', function () {
    var d = upgradeO6(db);
    eq('U1 columns + settings added', d.join('; '), 'Challans + SubmittedBy; Challans + AppMsg; ChallanLines + Photo; Settings AppAutoPost; Settings AppMakePdf; Settings AppSweepMinutes; Settings AppMaxBackDays; Settings QrUrl');
    eq('U2 second run changes nothing', upgradeO6(db).length, 0);
    eq('U3 AppStock formula reads StockMoves by column name', appStockFormula_(db).indexOf('StockMoves!$C$2:$C&"|"&StockMoves!$F$2:$F') > 0 && appStockFormula_(db).indexOf('-StockMoves!$D$2:$D') > 0, true);
  });
  step('V app delivery', function () {
    db.insert('Jobs', { JobNo: JOB, CustID: 'CUST-0001', SiteID: 'SITE-0001', JobType: 'Rental', HireBasis: 'Item', Status: 'Awaiting order' });
    postOpeningStock(db, [{ ItemCode: 'RL-STD-20', Qty: 100 }, { ItemCode: 'BD-ST-207', Qty: 40 }], D(20));
    add('APP-aaaa0001', 'Delivery', D(5), [{ ItemCode: 'RL-STD-20', Qty: 50 }, { ItemCode: 'BD-ST-207', Qty: 20 }]);
    db.insert('Challans', { ChallanNo: 'APP-draft001', Kind: 'Delivery', ChallanDate: D(5), JobNo: JOB, Status: 'Draft' });
    var r = run();
    eq('V1 one challan done, posted', r.done + ' ' + r.posted, '1 1');
    var c = ch(dc(1));
    eq('V2 real number + yard → site', c && c.FromLoc + ' → ' + c.ToLoc + ' ' + c.Status, 'LOC-YARD → LOC-S0001 Posted');
    eq('V3 lines renumbered with the challan', db.rows('ChallanLines').filter(function (l) { return l.ChallanNo === dc(1) && /^CL-/.test(l.LineID); }).length, 2);
    eq('V4 stock moved', stockAt(db, 'RL-STD-20', 'LOC-S0001') + ' ' + stockAt(db, 'RL-STD-20', 'LOC-YARD'), '50 50');
    eq('V5 job on hire', must(db, 'Jobs', 'JobNo', JOB).Status, 'On hire');
    eq('V6 app drafts are left alone', ch('APP-draft001').Status, 'Draft');
    eq('V7 nothing waiting → nothing done', run().done, 0);
  });
  step('W refused + fixed', function () {
    add('APP-bbbb0002', 'Delivery', D(4), [{ ItemCode: 'RL-STD-20', Qty: 80 }]);
    var r = run(), c = ch(dc(2));
    eq('W1 too much: numbered, back to Draft with the reason', r.failed + ' ' + (c && c.Status) + ' ' + /only 50 at LOC-YARD/.test(c && c.AppMsg), '1 Draft true');
    eq('W2 no stock moved', stockAt(db, 'RL-STD-20', 'LOC-YARD'), 50);
    db.update('ChallanLines', find(db.rows('ChallanLines'), 'ChallanNo', dc(2)), { Qty: 30 });
    db.update('Challans', c, { Status: 'Submitted', AppMsg: '' });
    r = run();
    eq('W3 resubmitted: posted under the same number', r.posted + ' ' + ch(dc(2)).Status + ' ' + (ch(dc(3)) ? 'new no.' : 'same no.'), '1 Posted same no.');
    eq('W4 yard now 20', stockAt(db, 'RL-STD-20', 'LOC-YARD'), 20);
  });
  step('X return + damage photo', function () {
    add('APP-cccc0003', 'Return', D(1), [{ ItemCode: 'BD-ST-207', Qty: 10, QtyDamaged: 2, QtyLost: 1, Photo: 'Photos/Damage/x1.Photo.123.jpg' }, { ItemCode: 'RL-STD-20', Qty: 5 }]);
    var r = run(), c = ch(dc(3)), dm = db.rows('Damage').filter(function (x) { return x.ChallanNo === dc(3); });
    eq('X1 return posted site → yard', r.posted + ' ' + c.FromLoc + ' → ' + c.ToLoc, '1 LOC-S0001 → LOC-YARD');
    eq('X2 good / repair / lost', [stockAt(db, 'BD-ST-207', 'LOC-YARD'), stockAt(db, 'BD-ST-207', 'LOC-REPAIR'), stockAt(db, 'BD-ST-207', 'LOC-LOST')].join(' '), '27 2 1');
    eq('X3 damage row has the photo', dm.length + ' ' + dm[0].Photo, '1 Photos/Damage/x1.Photo.123.jpg');
    add('APP-dddd0004', 'Return', D(1), [{ ItemCode: 'BD-ST-207', Qty: 50 }]);
    run();
    eq('X4 return more than on hire refused', /on hire/.test(ch(dc(4)).AppMsg) && ch(dc(4)).Status, 'Draft');
  });
  step('Y checks before numbering', function () {
    var n0 = find(db.rows('Sequences'), 'SeqKey', 'DC-' + yr).LastNo;
    add('APP-eeee0005', 'Delivery', '11/12/2026', [{ ItemCode: 'RL-STD-20', Qty: 1 }]);
    add('APP-ffff0006', 'Delivery', D(-3), [{ ItemCode: 'RL-STD-20', Qty: 1 }]);
    add('APP-gggg0007', 'Delivery', D(40), [{ ItemCode: 'RL-STD-20', Qty: 1 }]);
    add('APP-hhhh0008', 'Transfer', D(1), [{ ItemCode: 'RL-STD-20', Qty: 1 }]);
    add('APP-iiii0009', 'Delivery', D(1), [{ ItemCode: 'RL-STD-20', Qty: 1 }], { JobNo: '' });
    db.insert('Challans', { ChallanNo: 'APP-jjjj0010', Kind: 'Delivery', ChallanDate: D(1), JobNo: JOB, Status: 'Submitted' });
    var r = run();
    eq('Y1 six refused', r.done + ' ' + r.failed + ' ' + r.posted, '6 6 0');
    var m = function (no) { var c = ch(no); return c.Status + ': ' + c.AppMsg; };
    eq('Y2 text date → locale hint', /Locale = English \(United Kingdom\)/.test(m('APP-eeee0005')), true);
    eq('Y3 future date', /in the future/.test(m('APP-ffff0006')), true);
    eq('Y4 too old', /more than 31 days ago/.test(m('APP-gggg0007')), true);
    eq('Y5 transfer needs From/To', /Transfer: choose From and To/.test(m('APP-hhhh0008')), true);
    eq('Y6 job needed', /Choose the job/.test(m('APP-iiii0009')), true);
    eq('Y7 no lines', /no lines/.test(m('APP-jjjj0010')), true);
    eq('Y8 refused challans keep their APP number (no number used)', find(db.rows('Sequences'), 'SeqKey', 'DC-' + yr).LastNo, n0);
  });
  step('Z transfer, manual mode, time limit, labels', function () {
    add('APP-kkkk0011', 'Transfer', D(0), [{ ItemCode: 'BD-ST-207', Qty: 2 }], { FromLoc: 'LOC-REPAIR', ToLoc: 'LOC-YARD' });
    eq('Z1 transfer repair → yard posted', run().posted + ' ' + stockAt(db, 'BD-ST-207', 'LOC-REPAIR'), '1 0');
    db.update('Settings', find(db.rows('Settings'), 'Key', 'AppAutoPost'), { Value: 'No' });
    add('APP-llll0012', 'Delivery', D(0), [{ ItemCode: 'RL-STD-20', Qty: 1 }]);
    var r = run(), c = db.rows('Challans').filter(function (x) { return /waiting for the office/.test(x.AppMsg); })[0];
    eq('Z2 AppAutoPost No: numbered, left Draft for the office', r.posted + ' ' + (c && c.Status) + ' ' + isAppNo_(c && c.ChallanNo), '0 Draft false');
    eq('Z3 office can post it', postChallan(db, c.ChallanNo).moves, 1);
    add('APP-mmmm0013', 'Delivery', D(0), [{ ItemCode: 'RL-STD-20', Qty: 1 }]);
    r = run({ deadline: Date.now() - 1 });
    eq('Z4 past the time limit: left for the next run', r.done + ' ' + r.left + ' ' + ch('APP-mmmm0013').Status, '0 1 Submitted');
    eq('Z5 item labels = stock-tracked items', qrLabelList_(db, 'Items').map(function (x) { return x.code; }).join(','), 'RL-STD-20,BD-ST-207,TC-TUBE-3');
    eq('Z6 location labels = yard, repair, sites', qrLabelList_(db, 'Locations').map(function (x) { return x.code; }).join(','), 'LOC-YARD,LOC-REPAIR,LOC-S0001');
    eq('Z7 QR link encodes the code', qrUrl_(db, 'A/B 1'), QR_URL_.replace('{data}', 'A%2FB%201'));
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
