/**
 * Core Access Ops — reports + time-limit safety (stage O5) · 11 Nov 2026
 * Fourth script file: Apps Script › + › Script › name it CAE_Ops_Reports › paste this file › Save › reload the sheet.
 * File order must be Core, PDF, UI, Reports (this one LAST): Apps Script uses the last definition of a function, so
 * this file replaces, by name:
 *   onOpen          — same menu as O4 + Tools › Rebuild report tabs / Check set-up; sample set + numbering made safe
 *   onEdit          — batched: one read + one write per column (the old one did 2–3 calls per edited row and could
 *                     pass the 30-second limit of simple triggers when a whole column was pasted or cleared)
 *   runHireBilling  — stops before the 6-minute limit (says which jobs are left; running again is safe) and refuses
 *                     to create more than Settings MaxBillPeriods (24) monthly invoices for one job in one run
 * and patches UI_ACTIONS_.hireBilling (panel message). Core, PDF and UI files are unchanged.
 *
 * Reports (formula tabs, live, no script needed to update them): Dashboard · Receivables · Payables · Job P&L ·
 * Stock by location · On hire · Utilisation · Overdue returns · Mushak export. Dashboard!B3 = "as of" date (TODAY()),
 * Dashboard!B4 = Mushak export month. Rebuild any time with Tools › Rebuild report tabs (formulas are rewritten by
 * column name, so moved columns are picked up).
 */
var CAE_O5_VERSION = 'O5 · 11 Nov 2026';
var SAFE_MS_ = 270000; // stop work after 4.5 min: Apps Script stops any run at 6 min
function deadline_(ms) { return Date.now() + (ms == null ? SAFE_MS_ : ms); }
function timeUp_(dl) { return dl != null && Date.now() > dl; }

// ======================================================================= menu (replaces the O4 onOpen)
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
function menuGoDashboard() { var s = SpreadsheetApp.getActive().getSheetByName('Dashboard'); if (s) s.activate(); else menuBuildReports(); }

// ======================================================================= onEdit (replaces Core's)
// Typing / pasting rows by hand fills the calculated (teal) columns of those rows. One read of the edited block,
// then one setFormulas per run of rows per column — a few calls whatever the size of the edit.
function onEdit(e) {
  if (!e || !e.range) return;
  try { fillCalcRows_(e.range); } catch (err) { /* never block typing */ }
}
function fillCalcRows_(range, db) {
  var s = range.getSheet(), t = s.getName(), calc = CALC[t];
  if (!calc) return 0;
  var r0 = Math.max(range.getRow(), 2), r1 = Math.min(range.getLastRow(), s.getLastRow());
  if (r1 < r0) return 0;
  db = db || new SheetDb(s.getParent());
  var h = db.headers(t), n = r1 - r0 + 1, blk = s.getRange(r0, 1, n, h.length), vals = blk.getValues(), fs = blk.getFormulas(), cnt = 0;
  var has = vals.map(function (r) { return r.some(function (v, j) { return !calc[h[j]] && !blank(v); }); });
  Object.keys(calc).forEach(function (k) {
    var j = h.indexOf(k); if (j < 0) return;
    for (var i = 0; i < n;) {
      if (!has[i] || fs[i][j]) { i++; continue; }
      var a = i, out = [];
      while (i < n && has[i] && !fs[i][j]) { out.push([resolveF(db, t, calc[k], r0 + i)]); i++; }
      s.getRange(r0 + a, j + 1, out.length, 1).setFormulas(out);
      cnt += out.length;
    }
  });
  return cnt;
}

// ======================================================================= hire billing with a time budget (replaces Core's)
// o = { jobNo, deadline (ms timestamp) }. Jobs not reached before the deadline are listed in .left; billing is
// idempotent (already-billed periods are skipped), so running it again simply continues.
function runHireBilling(db, asOf, o) {
  o = o || {};
  var d = dayNum(asOf || today()), P = num(S(db, 'HirePeriodDays', 30)) || 30, rule = S(db, 'PartPeriodRule', 'Full period');
  if (d == null || isNaN(d)) throw new Error('"Bill up to" is not a date: ' + asOf);
  var maxP = num(S(db, 'MaxBillPeriods', 24)) || 24, made = [], warn = [], left = [];
  db.rows('Jobs').forEach(function (j) {
    if ((j.JobType !== 'Rental' && j.JobType !== 'Project') || j.Status === 'Closed' || blank(j.HireBasis)) return;
    if (o.jobNo && j.JobNo !== o.jobNo) return;
    if (timeUp_(o.deadline)) { left.push(j.JobNo); return; }
    var start = hireStartDay(db, j.JobNo);
    if (start != null) {
      var end = hireEndDay(db, j), lim = end != null ? Math.min(d, end) : d;
      var have = db.rows('Invoices').filter(function (i) { return i.JobNo === j.JobNo && i.Kind === 'Hire' && i.Status !== 'Cancelled'; }).length;
      var need = Math.floor((lim - start) / P) + 1 - have;
      if (!(start > 0) || need > maxP) {
        warn.push(j.JobNo + ': not billed — ' + (start > 0 ? need + ' monthly invoices would be made in one run (first delivery ' + fmtDay(start) + ')' : 'a posted delivery challan has no date') +
          '. Check the challan date, or bill in steps with an earlier "bill up to" date (limit: Settings MaxBillPeriods = ' + maxP + ').');
        return;
      }
    }
    try { made = made.concat(billJob_(db, j, d, P, rule)); } catch (e) { warn.push(e.message); }
  });
  log_(db, 'Hire billing', fmtDay(d), made.length + ' invoices' + (warn.length ? ' · ' + warn.length + ' warnings' : '') + (left.length ? ' · stopped for time, ' + left.length + ' jobs left' : ''));
  return { invoices: made, warnings: warn, left: left };
}
if (typeof UI_ACTIONS_ !== 'undefined') UI_ACTIONS_.hireBilling = function (db, a) {
  var r = runHireBilling(db, uiDate_(a.asOf), { jobNo: a.jobNo || '', deadline: deadline_() });
  var msg = r.invoices.length + ' hire invoice(s)' + (r.invoices.length ? ': ' + r.invoices.map(function (i) { return i.no + ' Tk ' + tk(i.total); }).join(', ') : '');
  if (r.left.length) msg += '\n\nStopped before the Google time limit — ' + r.left.length + ' job(s) not reached yet (' + r.left.join(', ') + '). Click "Run hire billing" again to continue; nothing is billed twice.';
  if (r.warnings.length) msg += '\n\nWarnings:\n' + r.warnings.join('\n');
  return { msg: msg, warn: r.warnings.length > 0 || r.left.length > 0, refs: r.invoices.map(function (i) { return i.no; }) };
};

// ======================================================================= "Number new rows" with a time budget
function assignIdsSafe_(db, dl) {
  var n = 0, left = 0;
  Object.keys(ID_SERIES).forEach(function (t) {
    if (db.hasTab && !db.hasTab(t)) return;
    var cfg = ID_SERIES[t], idc = cfg[0], h = db.headers(t), calc = CALC[t] || {};
    db.rows(t).forEach(function (r) {
      if (!blank(r[idc])) return;
      if (!h.some(function (k) { return k !== idc && !calc[k] && !blank(r[k]); })) return;
      if (timeUp_(dl)) { left++; return; }
      if (t === 'Payments' && PAY_METHODS.indexOf(r.Method) < 0) throw new Error('Payments row ' + r._r + ': method must be ' + PAY_METHODS.join(' / ') + ' (no cash)');
      var ser = typeof cfg[1] === 'function' ? cfg[1](r) : cfg[1], p = {};
      p[idc] = nextId(db, ser, cfg[2] && !blank(r[cfg[2]]) ? r[cfg[2]] : today());
      var d = defaults_(db, t, r); for (var k in d) p[k] = d[k];
      db.update(t, r, p); n++;
    });
  });
  if (!timeUp_(dl)) db.rows('Sites').forEach(function (s) { if (!blank(s.SiteID)) ensureSiteLoc(db, s); });
  Object.keys(CALC).forEach(function (t) { if (!db.hasTab || db.hasTab(t)) db.fillFormulas(t); });
  log_(db, 'Number new rows', '', n + ' rows' + (left ? ' · ' + left + ' left for the next run (time limit)' : ''));
  return { n: n, left: left };
}
function menuAssignIdsSafe() {
  ui_('Number new rows', function (db) {
    var r = assignIdsSafe_(db, deadline_());
    return r.n + ' rows numbered; formulas filled.' + (r.left ? '\n\n' + r.left + ' rows are still to number — stopped before the Google time limit. Run it again to finish.' : '');
  });
}

// ======================================================================= PDF sample set, one document per run
// The dialog asks the server for one PDF at a time, so each run stays far below the 6-minute limit.
function uiPdfSamples() {
  SpreadsheetApp.getUi().showModelessDialog(HtmlService.createHtmlOutput(SAMPLES_HTML_).setWidth(460).setHeight(440), 'PDF sample set');
}
function sampleDb_(sdb) {
  var db = pdfTestDb_();
  db.t.Settings = sdb.rows('Settings').map(function (r) { return Object.assign({}, r); });
  return { db: db, list: pdfSampleList_(db) };
}
function pdfSampleStep(i, sdb) {
  sdb = sdb || new SheetDb();
  var x = sampleDb_(sdb), n = x.list.length;
  if (i >= n) return { i: i, n: n, done: true };
  var folder = subFolder_(subFolder_(opsFolder_(sdb), 'PDF'), '_Samples');
  var r = makePdf(x.db, x.list[i][0], x.list[i][1], { folder: folder, noLink: true, noLog: true });
  if (i === n - 1) log_(sdb, 'PDF sample set', '', n + ' sample PDFs in PDF/_Samples');
  return { i: i, n: n, file: r.file, url: r.url, done: i === n - 1 };
}
var SAMPLES_HTML_ = '<!DOCTYPE html><html><head><base target="_blank"><style>' +
  'body{font:12px Arial,sans-serif;color:#2B3036;margin:10px}b{color:#17707D}#bar{height:8px;background:#D5D8DA;border-radius:4px;margin:8px 0}' +
  '#fill{height:8px;width:0;background:#17707D;border-radius:4px}li{margin:2px 0}a{color:#17707D}.err{color:#C62828;white-space:pre-wrap}' +
  'button{background:#17707D;color:#fff;border:0;border-radius:3px;padding:5px 10px;cursor:pointer}</style></head><body>' +
  '<div>Making the sample PDFs one at a time (about 8 seconds each). You can keep working in the sheet.</div>' +
  '<div id="bar"><div id="fill"></div></div><div id="st">Starting…</div><ol id="out"></ol><div id="err" class="err"></div><div id="btn"></div>' +
  '<script>var out=document.getElementById("out"),st=document.getElementById("st"),fill=document.getElementById("fill");' +
  'function step(i){google.script.run.withSuccessHandler(function(r){if(r.file){var li=document.createElement("li"),a=document.createElement("a");a.href=r.url;a.textContent=r.file;li.appendChild(a);out.appendChild(li);}' +
  'fill.style.width=Math.round(100*Math.min(r.i+1,r.n)/r.n)+"%";if(r.done){st.innerHTML="<b>Done:</b> "+r.n+" PDFs in Core Access Ops › PDF › _Samples.";return;}st.textContent=(r.i+1)+" of "+r.n+" done…";step(i+1);})' +
  '.withFailureHandler(function(e){st.textContent="Stopped at document "+(i+1)+".";document.getElementById("err").textContent=(e&&e.message)||String(e);' +
  'var b=document.createElement("button");b.textContent="Try again from document "+(i+1);b.onclick=function(){document.getElementById("err").textContent="";document.getElementById("btn").innerHTML="";step(i);};document.getElementById("btn").appendChild(b);}).pdfSampleStep(i);}' +
  'step(0);</script></body></html>';

// ======================================================================= set-up check
function setupCheck_(ss) {
  var out = [], sTz = ss.getSpreadsheetTimeZone(), pTz = Session.getScriptTimeZone();
  out.push((sTz === pTz ? 'ok   ' : 'FIX  ') + 'Time zone: sheet ' + sTz + ', script ' + pTz + (sTz === pTz ? '' : ' — make both Asia/Dhaka (File › Settings, and Apps Script › Project Settings), or dates written by the script show a day early.'));
  [['CAE_Ops_PDF', typeof makePdf === 'function'], ['CAE_Ops_UI', typeof uiInit === 'function']].forEach(function (f) { out.push((f[1] ? 'ok   ' : 'FIX  ') + 'Script file ' + f[0] + (f[1] ? '' : ' missing — paste it (file order: Core, PDF, UI, Reports)')); });
  var miss = REPORT_TABS_.filter(function (t) { return !ss.getSheetByName(t); });
  out.push((miss.length ? 'FIX  ' : 'ok   ') + 'Report tabs' + (miss.length ? ' missing: ' + miss.join(', ') + ' — Tools › Rebuild report tabs' : ''));
  return out;
}
function menuCheckSetup() { var ui = SpreadsheetApp.getUi(); ui.alert('Check set-up', setupCheck_(SpreadsheetApp.getActive()).join('\n'), ui.ButtonSet.OK); }

// ======================================================================= reports (formula tabs)
var REPORT_TABS_ = ['Dashboard', 'Receivables', 'Payables', 'Job P&L', 'Stock by location', 'On hire', 'Utilisation', 'Overdue returns', 'Mushak export'];
// [[Tab.Col]] → Tab!$X$2:$X · [[@Tab]] → Tab!$A:$<last> · [[#Tab.Col]] → column number in that range
function rptRes_(db, f) {
  return f.replace(/\[\[([#@]?)(\w+)(?:\.(\w+))?\]\]/g, function (_, k, T, C) {
    var h = db.headers(T);
    if (k === '@') return T + '!$A:$' + colL(db, T, h[h.length - 1]);
    var j = h.indexOf(C); if (j < 0) throw new Error('Report formula: column ' + T + '.' + C + ' not found');
    if (k === '#') return String(j + 1);
    var L = colL(db, T, C); return T + '!$' + L + '$2:$' + L;
  });
}
function between_(col, a, b) { return col + ',">="&' + a + ',' + col + ',"<="&' + b; }
function rptRevenue_(a, b) {
  return '(SUMIFS([[Invoices.Subtotal]],' + between_('[[Invoices.InvDate]]', a, b) + ',[[Invoices.Status]],"<>Cancelled")' +
    '+SUMIFS([[Notes.Amount]],' + between_('[[Notes.NoteDate]]', a, b) + ',[[Notes.Kind]],"DN",[[Notes.Status]],"<>Cancelled")' +
    '-SUMIFS([[Notes.Amount]],' + between_('[[Notes.NoteDate]]', a, b) + ',[[Notes.Kind]],"CN",[[Notes.Status]],"<>Cancelled"))';
}
function rptCosts_(a, b) { return '(SUMIFS([[Expenses.Amount]],' + between_('[[Expenses.ExpDate]]', a, b) + ')+SUMIFS([[Bills.Amount]],' + between_('[[Bills.BillDate]]', a, b) + ',[[Bills.Status]],"<>Cancelled"))'; }
function rptCash_(dir, a, b) {
  return '(SUMIFS([[Payments.Amount]],[[Payments.Direction]],"' + dir + '",' + between_('[[Payments.PayDate]]', a, b) + ',[[Payments.ChequeStatus]],"<>Dishonoured")' +
    (dir === 'Out' ? '+SUMIFS([[Expenses.Amount]],' + between_('[[Expenses.ExpDate]]', a, b) + ')' : '') + ')';
}
var ASOF_ = 'Dashboard!$B$3';
function AF_(x) { return 'ARRAYFORMULA(' + x + ')'; }
// LET(..., res, <table or error>, IF(ISERROR(ROWS(res)), <empty>, <output>)) — an explicit "anything to show?" test,
// array maths only inside ARRAYFORMULA(), so an empty list shows a message instead of #N/A.
function ifRows_(name, empty, out) { return 'IF(ISERROR(ROWS(' + name + ')),' + empty + ',' + out + ')'; }
// Ageing: detail list at J5 (8 columns J:Q), summary by party at A5 (A:H), totals in row 3.
function rptAgeing_(partyTab, detail) {
  return {
    detail: '=LET(asof,' + ASOF_ + ',' + detail + ',' + ifRows_('res', 'HSTACK("","Nothing open")',
      'SORT(HSTACK(CHOOSECOLS(res,1,2,3),' + AF_('IFERROR(VLOOKUP(INDEX(res,,3),[[@' + partyTab + ']],2,0),"")') + ',CHOOSECOLS(res,4,5,6),' + AF_('asof-INDEX(res,,5)') + '),6,TRUE)') + ')',
    summary: '=LET(pty,$L$5:$L,bal,$P$5:$P,dov,$Q$5:$Q,wl,FILTER(pty,pty<>""),' + ifRows_('wl', '""',
      'LET(who,SORT(UNIQUE(wl)),buck,LAMBDA(lo,hi,MAP(who,LAMBDA(x,SUMIFS(bal,pty,x,dov,">="&lo,dov,"<="&hi)))),' +
      'HSTACK(who,' + AF_('IFERROR(VLOOKUP(who,[[@' + partyTab + ']],2,0),"")') + ',buck(-99999,0),buck(1,30),buck(31,60),buck(61,90),buck(91,99999),MAP(who,LAMBDA(x,SUMIFS(bal,pty,x)))))') + ')',
  };
}
function reportSpec_(db) {
  var R = function (f) { return rptRes_(db, f); }, tabs = [];
  var title = function (t, note) { return [['A1', t], ['A2', note]]; };
  // ---------------- Dashboard
  var mS = 'EOMONTH($B$3,-1)+1', mE = 'EOMONTH($B$3,0)', fy = 'DATE(YEAR($B$3)-(MONTH($B$3)<7),7,1)';
  var dash = title('CORE ACCESS — DASHBOARD', 'Taka. Revenue and costs exclude VAT. Type a date in B3 to see another day (type =TODAY() to go back). Draft invoices count as revenue on their date.').concat([
    ['A3', 'As of'], ['B3', '=TODAY()'], ['A4', 'Mushak export month'], ['B4', '=EOMONTH(B3,-1)+1'],
    ['A6', 'SALES'], ['B6', ''], ['D6', 'MONEY'], ['E6', ''],
    ['A7', 'Revenue this month'], ['B7', '=' + rptRevenue_(mS, mE)],
    ['A8', 'Revenue this financial year (from 1 July)'], ['B8', '=' + rptRevenue_(fy, '$B$3')],
    ['A9', 'Costs this month (expenses + supplier bills)'], ['B9', '=' + rptCosts_(mS, mE)],
    ['A10', 'Margin this month'], ['B10', '=B7-B9'],
    ['A11', 'Open quotes (Draft / Sent), incl. VAT'], ['B11', '=SUMIFS([[Quotes.Total]],[[Quotes.Status]],"Draft")+SUMIFS([[Quotes.Total]],[[Quotes.Status]],"Sent")'],
    ['A12', 'Open quotes, number'], ['B12', '=COUNTIFS([[Quotes.Status]],"Draft")+COUNTIFS([[Quotes.Status]],"Sent")'],
    ['D7', 'Receivables open (invoices + debit notes)'], ['E7', '=Receivables!H3'],
    ['D8', 'of which overdue'], ['E8', '=Receivables!H3-Receivables!C3'],
    ['D9', 'Advances asked for, not paid (sent PIs)'], ['E9', '=SUMIFS([[Proformas.Balance]],[[Proformas.Status]],"Sent")+SUMIFS([[Proformas.Balance]],[[Proformas.Status]],"Part paid")'],
    ['D10', 'Payables open (supplier bills)'], ['E10', '=Payables!H3'],
    ['D11', 'Cash in this month'], ['E11', '=' + rptCash_('In', mS, mE)],
    ['D12', 'Cash out this month (payments + expenses)'], ['E12', '=' + rptCash_('Out', mS, mE)],
    ['D13', 'Cheques received, not cleared yet'], ['E13', '=SUMIFS([[Payments.Amount]],[[Payments.Direction]],"In",[[Payments.ChequeStatus]],"Pending")'],
    ['A14', 'OPERATIONS'], ['B14', ''],
    ['A15', 'Jobs on hire'], ['B15', '=COUNTIFS([[Jobs.Status]],"On hire")'],
    ['A16', 'Items on hire (all sites)'], ['B16', '=Utilisation!D3'],
    ['A17', 'Hire value on site per month (list rates)'], ['B17', '=Utilisation!J3'],
    ['A18', 'Overdue returns (jobs)'], ['B18', '=COUNTIF(\'Overdue returns\'!A5:A,"?*")'],
    ['A19', 'Damage / loss not charged yet'], ['B19', '=SUMIFS([[Damage.Charge]],[[Damage.Status]],"Open")'],
    ['A20', 'Draft invoices not sent'], ['B20', '=COUNTIFS([[Invoices.Status]],"Draft",[[Invoices.InvNo]],"<>")'],
    ['A22', 'LAST 12 MONTHS'], ['A23', 'Month'], ['B23', 'Revenue'], ['C23', 'Costs'], ['D23', 'Margin'], ['E23', 'Cash in'], ['F23', 'Cash out'],
    ['A24', '=ARRAYFORMULA(EDATE(EOMONTH($B$3,-1)+1,SEQUENCE(12,1,-11)))'],
    ['B24', '=MAP($A$24:$A$35,LAMBDA(m,' + rptRevenue_('m', 'EOMONTH(m,0)') + '))'],
    ['C24', '=MAP($A$24:$A$35,LAMBDA(m,' + rptCosts_('m', 'EOMONTH(m,0)') + '))'],
    ['D24', '=ARRAYFORMULA(B24:B35-C24:C35)'],
    ['E24', '=MAP($A$24:$A$35,LAMBDA(m,' + rptCash_('In', 'm', 'EOMONTH(m,0)') + '))'],
    ['F24', '=MAP($A$24:$A$35,LAMBDA(m,' + rptCash_('Out', 'm', 'EOMONTH(m,0)') + '))'],
  ]);
  tabs.push({ name: 'Dashboard', cells: dash, heads: ['A6:B6', 'D6:E6', 'A14:B14', 'A23:F23'], money: ['B7:B11', 'E7:E13', 'B17', 'B19', 'B24:F35'], dates: ['B3'], months: ['B4', 'A24:A35'],
    widths: [[1, 300], [2, 120], [3, 110], [4, 290], [5, 120], [6, 110]], freeze: 0, input: ['B3', 'B4'] });
  // ---------------- Receivables
  var z6 = '{"","","","","",""}';
  var rec = rptAgeing_('Customers', 'pd,IFERROR(1*INDEX(Settings!$B:$B,MATCH("PaymentDaysDefault",Settings!$A:$A,0)),7),' +
    'iv,IFERROR(FILTER(HSTACK(' + AF_('IF(LEN([[Invoices.InvNo]]),"Invoice","")') + ',[[Invoices.InvNo]],[[Invoices.CustID]],[[Invoices.InvDate]],[[Invoices.DueDate]],[[Invoices.Balance]]),[[Invoices.InvNo]]<>"",[[Invoices.Status]]<>"Cancelled",[[Invoices.Balance]]>0.005),' + z6 + '),' +
    'dno,' + AF_('[[Notes.Total]]-SUMIF([[Allocations.DocType]]&"|"&[[Allocations.DocNo]],"DN|"&[[Notes.NoteNo]],[[Allocations.Amount]])') + ',' +
    'dn,IFERROR(FILTER(HSTACK(' + AF_('IF(LEN([[Notes.NoteNo]]),"Debit note","")') + ',[[Notes.NoteNo]],[[Notes.CustID]],[[Notes.NoteDate]],' + AF_('[[Notes.NoteDate]]+pd') + ',dno),[[Notes.NoteNo]]<>"",[[Notes.Kind]]="DN",[[Notes.Status]]<>"Cancelled",dno>0.005),' + z6 + '),' +
    'every,VSTACK(iv,dn),res,FILTER(every,INDEX(every,,2)<>"")');
  tabs.push(ageTab_('Receivables', 'RECEIVABLES — AGEING BY CUSTOMER', 'Open invoices and debit notes as of Dashboard!B3, by days past the due date (debit notes: note date + PaymentDaysDefault). Advance PIs are not receivables and are not included.', 'Customer', 'Type', rec));
  // ---------------- Payables
  var pay = rptAgeing_('Suppliers', 'due,' + AF_('IF([[Bills.DueDate]]="",[[Bills.BillDate]],[[Bills.DueDate]])') + ',' +
    'res,FILTER(HSTACK(' + AF_('[[Bills.SupplierInvNo]]&""') + ',[[Bills.BillID]],[[Bills.SupID]],[[Bills.BillDate]],due,[[Bills.Balance]]),[[Bills.BillID]]<>"",[[Bills.Status]]<>"Cancelled",[[Bills.Balance]]>0.005)');
  tabs.push(ageTab_('Payables', 'PAYABLES — AGEING BY SUPPLIER', 'Open supplier bills as of Dashboard!B3, by days past the due date (blank due date = bill date).', 'Supplier', 'Their invoice', pay));
  // ---------------- Job P&L
  var jp = '=LET(jobs,FILTER([[Jobs.JobNo]],[[Jobs.JobNo]]<>""),' + ifRows_('jobs', 'HSTACK("","No jobs yet")', 'LET(cus,' + AF_('VLOOKUP(jobs,[[@Jobs]],[[#Jobs.CustID]],0)') + ',qno,' + AF_('VLOOKUP(jobs,[[@Jobs]],[[#Jobs.QuoteNo]],0)') + ',' +
    'qv,' + AF_('IFERROR(VLOOKUP(qno,[[@Quotes]],[[#Quotes.Subtotal]],0)*1,0)') + ',' +
    'vo,MAP(jobs,LAMBDA(x,SUMIFS([[Variations.Amount]],[[Variations.JobNo]],x,[[Variations.Status]],"Approved"))),' +
    'inv,MAP(jobs,LAMBDA(x,SUMIFS([[Invoices.Subtotal]],[[Invoices.JobNo]],x,[[Invoices.Status]],"<>Cancelled"))),' +
    'dn,MAP(jobs,LAMBDA(x,SUMIFS([[Notes.Amount]],[[Notes.JobNo]],x,[[Notes.Kind]],"DN",[[Notes.Status]],"<>Cancelled")-SUMIFS([[Notes.Amount]],[[Notes.JobNo]],x,[[Notes.Kind]],"CN",[[Notes.Status]],"<>Cancelled"))),' +
    'ex,MAP(jobs,LAMBDA(x,SUMIFS([[Expenses.Amount]],[[Expenses.JobNo]],x))),' +
    'bi,MAP(jobs,LAMBDA(x,SUMIFS([[Bills.Amount]],[[Bills.JobNo]],x,[[Bills.Status]],"<>Cancelled"))),' +
    'wo,MAP(jobs,LAMBDA(x,SUMIFS([[Damage.Charge]],[[Damage.JobNo]],x,[[Damage.Status]],"Waived"))),' +
    'op,MAP(jobs,LAMBDA(x,SUMIFS([[Damage.Charge]],[[Damage.JobNo]],x,[[Damage.Status]],"Open"))),' +
    'mg,' + AF_('inv+dn-ex-bi-wo') + ',' +
    'HSTACK(jobs,' + AF_('IFERROR(VLOOKUP(cus,[[@Customers]],2,0),cus)') + ',' + AF_('VLOOKUP(jobs,[[@Jobs]],[[#Jobs.JobType]],0)') + ',' + AF_('VLOOKUP(jobs,[[@Jobs]],[[#Jobs.Status]],0)') + ',qv,vo,inv,dn,ex,bi,wo,mg,' + AF_('IF(inv+dn=0,"",mg/(inv+dn))') + ',op))') + ')';
  tabs.push({ name: 'Job P&L', cells: title('JOB P&L', 'Excl. VAT. Margin = invoiced + debit notes (less credit notes) − expenses − supplier bills − damage written off (Damage status Waived). Damage not charged yet is shown on the right, not deducted.').concat([
    ['A3', 'Total'], ['E3', '=SUM(E5:E)'], ['F3', '=SUM(F5:F)'], ['G3', '=SUM(G5:G)'], ['H3', '=SUM(H5:H)'], ['I3', '=SUM(I5:I)'], ['J3', '=SUM(J5:J)'], ['K3', '=SUM(K5:K)'], ['L3', '=SUM(L5:L)'], ['M3', '=IF(G3+H3=0,"",L3/(G3+H3))'], ['N3', '=SUM(N5:N)'],
    ['A4', 'Job'], ['B4', 'Customer'], ['C4', 'Type'], ['D4', 'Status'], ['E4', 'Quote value'], ['F4', 'Approved VOs'], ['G4', 'Invoiced'], ['H4', 'Debit − credit notes'], ['I4', 'Expenses'], ['J4', 'Supplier bills'], ['K4', 'Damage written off'], ['L4', 'Margin'], ['M4', 'Margin %'], ['N4', 'Damage not charged'],
    ['A5', jp]]), heads: ['A4:N4'], totals: ['A3:N3'], money: ['E3:L', 'N3:N'], pct: ['M3:M'], widths: [[1, 130], [2, 200], [3, 70], [4, 90]], freeze: 4 });
  // ---------------- Stock by location
  var sm = function (c) { return '[[StockMoves.' + c + ']]'; };
  var lk = function (key, col, tab) { return 'IFERROR(VLOOKUP(' + key + ',[[@' + tab + ']],[[#' + tab + '.' + col + ']],0),"")'; };
  var stack = '{' + [sm('ItemCode'), lk(sm('ItemCode'), 'Name', 'Items'), lk(sm('ToLoc'), 'Name', 'Locations'), lk(sm('ToLoc'), 'Type', 'Locations'), sm('Qty') + '*1'].join(',') + ';' +
    [sm('ItemCode'), lk(sm('ItemCode'), 'Name', 'Items'), lk(sm('FromLoc'), 'Name', 'Locations'), lk(sm('FromLoc'), 'Type', 'Locations'), '-' + sm('Qty')].join(',') + '}';
  tabs.push({ name: 'Stock by location', cells: title('STOCK BY LOCATION', 'Quantity of each stock item at each location now (from StockMoves). Sold and supplier movements are left out. Blank = none.').concat([
    ['A4', '=IF(COUNTA(' + sm('MoveID') + ')=0,"No stock movements yet",QUERY(ARRAYFORMULA(' + stack + '),"select Col1, Col2, sum(Col5) where Col1 <> \'\' and Col4 <> \'\' and Col4 <> \'Supplier\' and Col4 <> \'Sold\' group by Col1, Col2 pivot Col3 label Col1 \'Item\', Col2 \'Name\'",0))']]),
    heads: ['A4:Z4'], widths: [[1, 110], [2, 220]], freeze: 4 });
  // ---------------- On hire
  var oh = '=LET(stk,' + AF_('{' + [sm('JobNo'), sm('ToLoc'), sm('ItemCode'), sm('Qty') + '*1'].join(',') + ';' + [sm('JobNo'), sm('FromLoc'), sm('ItemCode'), '-' + sm('Qty')].join(',') + '}') + ',' +
    'typ,' + AF_('IFERROR(VLOOKUP(INDEX(stk,,2),[[@Locations]],[[#Locations.Type]],0),"")') + ',onsite,FILTER(stk,typ="Site",INDEX(stk,,3)<>""),' +
    'grp,QUERY(onsite,"select Col1, Col2, Col3, sum(Col4) group by Col1, Col2, Col3 label Col1 \'\', Col2 \'\', Col3 \'\', sum(Col4) \'\'",0),res,FILTER(grp,ISNUMBER(INDEX(grp,,4)),INDEX(grp,,4)<>0),' +
    ifRows_('res', 'HSTACK("","Nothing on hire")', 'LET(lrate,' + AF_('IFERROR(VLOOKUP(INDEX(res,,3),[[@Items]],[[#Items.HireRateMonth]],0)*1,0)') + ',' +
    'HSTACK(INDEX(res,,1),' + AF_('IFERROR(VLOOKUP(VLOOKUP(INDEX(res,,1),[[@Jobs]],[[#Jobs.CustID]],0),[[@Customers]],2,0),"")') + ',' + AF_('IFERROR(VLOOKUP(INDEX(res,,2),[[@Locations]],[[#Locations.Name]],0),INDEX(res,,2))') + ',' +
    'INDEX(res,,3),' + AF_('IFERROR(VLOOKUP(INDEX(res,,3),[[@Items]],[[#Items.Name]],0),"")') + ',INDEX(res,,4),lrate,' + AF_('INDEX(res,,4)*lrate') + '))') + ')';
  tabs.push({ name: 'On hire', cells: title('EQUIPMENT ON HIRE BY SITE', 'Quantity on each site now, by job (from posted challans). Value at the Items list rate per month (the quote rate may differ).').concat([
    ['A3', 'Total'], ['F3', '=SUM(F5:F)'], ['H3', '=SUM(H5:H)'],
    ['A4', 'Job'], ['B4', 'Customer'], ['C4', 'Site'], ['D4', 'Item'], ['E4', 'Name'], ['F4', 'Qty on site'], ['G4', 'List rate / month'], ['H4', 'Hire value / month'], ['A5', oh]]),
    heads: ['A4:H4'], totals: ['A3:H3'], money: ['G3:H'], widths: [[1, 130], [2, 190], [3, 220], [4, 100], [5, 200]], freeze: 4 });
  // ---------------- Utilisation
  var ut = '=LET(itm,FILTER([[Items.ItemCode]],[[Items.ItemCode]]<>"",[[Items.StockTracked]]="Yes",[[Items.Status]]<>"Inactive"),' + ifRows_('itm', 'HSTACK("","No stock-tracked items")', 'LET(' +
    'lid,[[Locations.LocID]],lty,[[Locations.Type]],' +
    'qat,LAMBDA(x,t,SUMPRODUCT(' + sm('Qty') + '*(' + sm('ItemCode') + '=x)*ISNUMBER(MATCH(' + sm('ToLoc') + ',FILTER(lid,lty=t),0)))-SUMPRODUCT(' + sm('Qty') + '*(' + sm('ItemCode') + '=x)*ISNUMBER(MATCH(' + sm('FromLoc') + ',FILTER(lid,lty=t),0)))),' +
    'yrd,MAP(itm,LAMBDA(x,qat(x,"Yard"))),ste,MAP(itm,LAMBDA(x,qat(x,"Site"))),rep,MAP(itm,LAMBDA(x,qat(x,"Repair"))),lst,MAP(itm,LAMBDA(x,qat(x,"Lost"))),own,' + AF_('yrd+ste+rep') + ',' +
    'repl,' + AF_('IFERROR(VLOOKUP(itm,[[@Items]],[[#Items.ReplacementCost]],0)*1,0)') + ',hire,' + AF_('IFERROR(VLOOKUP(itm,[[@Items]],[[#Items.HireRateMonth]],0)*1,0)') + ',' +
    'HSTACK(itm,' + AF_('VLOOKUP(itm,[[@Items]],[[#Items.Name]],0)') + ',yrd,ste,rep,lst,own,' + AF_('IF(own=0,"",ste/own)') + ',' + AF_('ste*repl') + ',' + AF_('ste*hire') + '))') + ')';
  tabs.push({ name: 'Utilisation', cells: title('UTILISATION', 'Owned = in yard + on sites + in repair. Utilisation = on hire ÷ owned. Values at Items ReplacementCost and HireRateMonth (blank rates count as 0).').concat([
    ['A3', 'Total'], ['C3', '=SUM(C5:C)'], ['D3', '=SUM(D5:D)'], ['E3', '=SUM(E5:E)'], ['F3', '=SUM(F5:F)'], ['G3', '=SUM(G5:G)'], ['H3', '=IF(G3=0,"",D3/G3)'], ['I3', '=SUM(I5:I)'], ['J3', '=SUM(J5:J)'],
    ['A4', 'Item'], ['B4', 'Name'], ['C4', 'In yard'], ['D4', 'On hire'], ['E4', 'In repair'], ['F4', 'Lost'], ['G4', 'Owned'], ['H4', 'Utilisation'], ['I4', 'Replacement value on hire'], ['J4', 'Hire value / month'], ['A5', ut]]),
    heads: ['A4:J4'], totals: ['A3:J3'], money: ['I3:J'], pct: ['H3:H'], widths: [[1, 110], [2, 220], [9, 150], [10, 130]], freeze: 4 });
  // ---------------- Overdue returns
  var od = '=LET(asof,' + ASOF_ + ',nd,IFERROR(1*INDEX(Settings!$B:$B,MATCH("OffHireNoticeDays",Settings!$A:$A,0)),7),' +
    'jobs,FILTER([[Jobs.JobNo]],[[Jobs.JobNo]]<>"",([[Jobs.JobType]]="Rental")+([[Jobs.JobType]]="Project"),[[Jobs.Status]]<>"Closed"),' +
    'sloc,FILTER([[Locations.LocID]],[[Locations.Type]]="Site"),' +
    'offd,IFERROR(MAP(jobs,LAMBDA(x,IFERROR(MAX(FILTER(' + AF_('IF([[OffHire.OffHireDate]]="",[[OffHire.NoticeDate]]+nd,[[OffHire.OffHireDate]])') + ',[[OffHire.JobNo]]=x,[[OffHire.Scope]]="Full")),0))),0),' +
    'repl,' + AF_('IFERROR(VLOOKUP(' + sm('ItemCode') + ',[[@Items]],[[#Items.ReplacementCost]],0)*1,0)') + ',' +
    'net,' + AF_('ISNUMBER(MATCH(' + sm('ToLoc') + ',sloc,0))-ISNUMBER(MATCH(' + sm('FromLoc') + ',sloc,0))') + ',' +
    'qty,IFERROR(MAP(jobs,LAMBDA(x,SUMPRODUCT(' + sm('Qty') + '*(' + sm('JobNo') + '=x)*net))),0),val,IFERROR(MAP(jobs,LAMBDA(x,SUMPRODUCT(' + sm('Qty') + '*repl*(' + sm('JobNo') + '=x)*net))),0),' +
    'res,FILTER(HSTACK(jobs,offd,qty,val),offd>0,offd<asof,qty>0),' +
    ifRows_('res', 'HSTACK("","None — all off-hired equipment is back")', 'LET(cus,' + AF_('VLOOKUP(INDEX(res,,1),[[@Jobs]],[[#Jobs.CustID]],0)') + ',sid,' + AF_('VLOOKUP(INDEX(res,,1),[[@Jobs]],[[#Jobs.SiteID]],0)') + ',' +
    'HSTACK(INDEX(res,,1),' + AF_('IFERROR(VLOOKUP(cus,[[@Customers]],2,0),cus)') + ',' + AF_('IFERROR(VLOOKUP(sid,[[@Sites]],[[#Sites.Project]],0),sid)') + ',INDEX(res,,2),' + AF_('asof-INDEX(res,,2)') + ',INDEX(res,,3),INDEX(res,,4)))') + ')';
  tabs.push({ name: 'Overdue returns', cells: title('OVERDUE RETURNS', 'Rental / project jobs past their full off-hire date (or notice date + OffHireNoticeDays) with equipment still on site, as of Dashboard!B3.').concat([
    ['A4', 'Job'], ['B4', 'Customer'], ['C4', 'Site'], ['D4', 'Off-hire date'], ['E4', 'Days overdue'], ['F4', 'Qty still on site'], ['G4', 'Replacement value on site'], ['A5', od]]),
    heads: ['A4:G4'], money: ['G5:G'], dates: ['D5:D'], ints: ['E5:E'], widths: [[1, 130], [2, 200], [3, 200], [7, 170]], freeze: 4 });
  // ---------------- Mushak export
  var z11 = '{"","","","","","","","","","",""}', cn = function (key, col) { return 'IFERROR(VLOOKUP(' + key + ',[[@Customers]],[[#Customers.' + col + ']],0),"")'; };
  var mu = '=LET(mstart,Dashboard!$B$4,mend,EOMONTH(Dashboard!$B$4,0),' +
    'iv,IFERROR(FILTER(HSTACK([[Invoices.InvDate]],' + AF_('IF(LEN([[Invoices.InvNo]]),"Mushak-6.3 (invoice)","")') + ',[[Invoices.InvNo]],' + AF_('[[Invoices.Mushak63No]]&""') + ',' + AF_(cn('[[Invoices.CustID]]', 'Name')) + ',' + AF_(cn('[[Invoices.CustID]]', 'BIN')) + ',[[Invoices.Subtotal]],[[Invoices.VATPct]],[[Invoices.VAT]],[[Invoices.Total]],[[Invoices.Status]]),' +
    '[[Invoices.InvNo]]<>"",[[Invoices.Status]]<>"Cancelled",[[Invoices.Status]]<>"Draft",[[Invoices.InvDate]]>=mstart,[[Invoices.InvDate]]<=mend),' + z11 + '),' +
    'sgn,' + AF_('IF([[Notes.Kind]]="CN",-1,1)') + ',' +
    'nt,IFERROR(FILTER(HSTACK([[Notes.NoteDate]],' + AF_('IF([[Notes.Kind]]="CN","Mushak-6.7 (credit note)","Mushak-6.8 (debit note)")') + ',[[Notes.NoteNo]],' + AF_('[[Notes.InvNo]]&""') + ',' + AF_(cn('[[Notes.CustID]]', 'Name')) + ',' + AF_(cn('[[Notes.CustID]]', 'BIN')) + ',' + AF_('sgn*[[Notes.Amount]]') + ',[[Notes.VATPct]],' + AF_('sgn*[[Notes.VAT]]') + ',' + AF_('sgn*[[Notes.Total]]') + ',[[Notes.Status]]),' +
    '[[Notes.NoteNo]]<>"",[[Notes.Status]]<>"Cancelled",[[Notes.Status]]<>"Draft",[[Notes.NoteDate]]>=mstart,[[Notes.NoteDate]]<=mend),' + z11 + '),' +
    'every,VSTACK(iv,nt),res,FILTER(every,INDEX(every,,3)<>""),' + ifRows_('res', '""', 'SORT(res,1,TRUE,3,TRUE)') + ')';
  tabs.push({ name: 'Mushak export', cells: [['A1', 'Date'], ['B1', 'Document'], ['C1', 'Our no.'], ['D1', 'Mushak-6.3 no. / original invoice'], ['E1', 'Customer'], ['F1', 'Customer BIN'], ['G1', 'Value excl. VAT'], ['H1', 'VAT rate'], ['I1', 'VAT'], ['J1', 'Total incl. VAT'], ['K1', 'Status'],
    ['A2', mu], ['M1', 'Month: Dashboard!B4. Sent / paid / overdue documents only (not Draft or Cancelled); credit notes negative.'], ['M2', 'For the accountant: File › Download › Comma-separated values (.csv) while this tab is open.']],
    heads: ['A1:K1'], money: ['G2:G', 'I2:J'], pct: ['H2:H'], dates: ['A2:A'], widths: [[1, 95], [2, 170], [3, 140], [4, 180], [5, 200], [6, 130], [7, 110], [8, 70], [9, 100], [10, 110], [11, 80]], freeze: 1, plain: true });
  tabs.forEach(function (t) { t.cells = t.cells.map(function (c) { return [c[0], typeof c[1] === 'string' && c[1].charAt(0) === '=' ? R(c[1]) : c[1]]; }); });
  return tabs;
}
function ageTab_(name, head, note, party, firstCol, f) {
  var cells = [['A1', head], ['A2', note], ['A3', 'Total'], ['C3', '=SUM(C5:C)'], ['D3', '=SUM(D5:D)'], ['E3', '=SUM(E5:E)'], ['F3', '=SUM(F5:F)'], ['G3', '=SUM(G5:G)'], ['H3', '=SUM(H5:H)'],
    ['A4', party + ' ID'], ['B4', party], ['C4', 'Not yet due'], ['D4', '1–30 days'], ['E4', '31–60 days'], ['F4', '61–90 days'], ['G4', 'Over 90 days'], ['H4', 'Total'], ['A5', f.summary],
    ['J4', firstCol], ['K4', 'Doc no.'], ['L4', party + ' ID'], ['M4', party], ['N4', 'Date'], ['O4', 'Due'], ['P4', 'Balance'], ['Q4', 'Days overdue'], ['J5', f.detail]];
  return { name: name, cells: cells, heads: ['A4:H4', 'J4:Q4'], totals: ['A3:H3'], money: ['C3:H', 'P5:P'], dates: ['N5:O'], ints: ['Q5:Q'], widths: [[1, 95], [2, 200], [10, 110], [11, 130], [12, 95], [13, 200]], freeze: 4 };
}
// Writes the report tabs (after About). Existing report tabs are cleared and rewritten; data tabs are not touched.
function buildReports(ss) {
  ss = ss || SpreadsheetApp.getActive();
  var db = new SheetDb(ss), spec = reportSpec_(db), about = ss.getSheetByName('About'), base = about ? about.getIndex() : 0;
  spec.forEach(function (t, i) {
    var s = ss.getSheetByName(t.name) || ss.insertSheet(t.name, base + i);
    s.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (p) { p.remove(); });
    s.clear(); s.setFrozenRows(0);
    s.getRange(1, 1, s.getMaxRows(), Math.min(s.getMaxColumns(), 26)).setFontFamily('Arial').setFontSize(10).setFontColor('#2B3036');
    t.cells.forEach(function (c) { var r = s.getRange(c[0]); if (typeof c[1] === 'string' && c[1].charAt(0) === '=') r.setFormula(c[1]); else r.setValue(c[1]); });
    if (!t.plain) { s.getRange('A1').setFontSize(14).setFontWeight('bold'); s.getRange('A2').setFontColor('#5F676E').setFontStyle('italic'); }
    (t.heads || []).forEach(function (a) { s.getRange(a).setBackground('#000000').setFontColor('#FFFFFF').setFontWeight('bold'); });
    (t.totals || []).forEach(function (a) { s.getRange(a).setBackground('#EAF3F8').setFontWeight('bold'); });
    (t.input || []).forEach(function (a) { s.getRange(a).setBackground('#FFF2CC'); });
    (t.money || []).forEach(function (a) { s.getRange(a).setNumberFormat('#,##0.00'); });
    (t.pct || []).forEach(function (a) { s.getRange(a).setNumberFormat('0%'); });
    (t.dates || []).forEach(function (a) { s.getRange(a).setNumberFormat('dd-mmm-yyyy'); });
    (t.months || []).forEach(function (a) { s.getRange(a).setNumberFormat('mmm yyyy'); });
    (t.ints || []).forEach(function (a) { s.getRange(a).setNumberFormat('0'); });
    (t.widths || []).forEach(function (w) { s.setColumnWidth(w[0], w[1]); });
    if (t.freeze) s.setFrozenRows(t.freeze);
    s.setTabColor('#17707D');
    var p = s.protect().setDescription('Report formulas — rebuild with Tools › Rebuild report tabs'); p.setWarningOnly(true);
    if (t.input) p.setUnprotectedRanges(t.input.map(function (a) { return s.getRange(a); }));
  });
  log_(db, 'Reports built', '', spec.length + ' tabs');
  return spec.length;
}
function menuBuildReports() { ui_('Rebuild report tabs', function () { return buildReports() + ' report tabs written: ' + REPORT_TABS_.join(', ') + '.\nDashboard!B3 = as-of date, B4 = Mushak export month.'; }); }

// ======================================================================= self-test
function menuSelfTestAll() {
  var parts = [['core', selfTest()], ['PDF', typeof selfTestPdf === 'function' ? selfTestPdf() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_PDF.gs not installed'] }],
    ['panels', typeof selfTestUi === 'function' ? selfTestUi() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_UI.gs not installed'] }], ['O5', selfTestO5()]];
  var p = sum(parts, function (x) { return x[1].pass; }), f = sum(parts, function (x) { return x[1].fail; });
  var fails = [].concat.apply([], parts.map(function (x) { return x[1].log; })).filter(function (l) { return /^FAIL/.test(l); });
  var setup = setupCheck_(SpreadsheetApp.getActive()).filter(function (l) { return /^FIX/.test(l); });
  SpreadsheetApp.getUi().alert('Self-test', p + ' passed, ' + f + ' failed  (' + parts.map(function (x) { return x[0] + ' ' + x[1].pass; }).join(' · ') + ')\n\n' + fails.concat(setup).join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}
// In-memory sheet stand-in for the onEdit test: counts API calls.
function memSheet_(name, rows, calls) {
  var sh = { name: name, rows: rows, f: rows.map(function (r) { return r.map(function () { return ''; }); }) };
  var rng = function (r, c, nr, nc) {
    calls.n++;
    return {
      getValues: function () { return sh.rows.slice(r - 1, r - 1 + nr).map(function (x) { return x.slice(c - 1, c - 1 + nc); }); },
      getFormulas: function () { return sh.f.slice(r - 1, r - 1 + nr).map(function (x) { return x.slice(c - 1, c - 1 + nc); }); },
      setFormulas: function (v) { calls.w++; v.forEach(function (x, i) { x.forEach(function (y, j) { sh.f[r - 1 + i][c - 1 + j] = y; }); }); },
      getRow: function () { return r; }, getLastRow: function () { return r + nr - 1; }, getSheet: function () { return sh.api; },
    };
  };
  sh.api = { getName: function () { return name; }, getLastRow: function () { return sh.rows.length; }, getRange: rng };
  return sh;
}
function selfTestO5() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws;
  step('R reports spec', function () {
    var db = testSeed_('Full period'), spec = reportSpec_(db), all = JSON.stringify(spec);
    eq('R1 nine report tabs', spec.map(function (t) { return t.name; }).join(','), REPORT_TABS_.join(','));
    eq('R2 every column token resolved', /\[\[[#@]?[A-Z]/.test(JSON.stringify(spec.map(function (t) { return t.cells; }))), false);
    var bad = []; spec.forEach(function (t) { t.cells.forEach(function (c) {
      if (typeof c[1] !== 'string' || c[1].charAt(0) !== '=') return;
      var s = c[1].replace(/"[^"]*"/g, ''), d = 0; for (var i = 0; i < s.length; i++) { if (s[i] === '(') d++; if (s[i] === ')') d--; if (d < 0) break; }
      if (d !== 0) bad.push(t.name + '!' + c[0]);
    }); });
    eq('R3 brackets balanced in every formula', bad.join(' ') || 'none', 'none');
    var rec = find(spec.map(function (t) { return { name: t.name, f: t.cells.filter(function (c) { return c[0] === 'J5'; })[0] }; }), 'name', 'Receivables');
    eq('R4 receivables reads Invoices.Balance by column name', rec.f[1].indexOf('Invoices!$P$2:$P') >= 0, true);
    var names = []; spec.forEach(function (t) { t.cells.forEach(function (c) { if (typeof c[1] === 'string') (c[1].match(/LET\(([^)]*)/g) || []).forEach(function () {}); }); });
    var lets = all.match(/[,(]([a-z][a-z0-9]*),(?=[^,])/g) || [];
    eq('R5 no LET name looks like a cell (e.g. m1, s2)', lets.filter(function (x) { return /^[,(][a-z]{1,3}\d+,$/.test(x); }).join(' ') || 'none', 'none');
    throws('R6 unknown column refused', function () { rptRes_(db, '[[Invoices.Nope]]'); }, /not found/);
  });
  step('R onEdit batched', function () {
    var db = testSeed_('Full period'), h = db.headers('QuoteLines'), calls = { n: 0, w: 0 }, rows = [h];
    for (var i = 0; i < 6; i++) rows.push(h.map(function (k) { return k === 'QuoteNo' ? (i < 3 || i === 5 ? 'Q1' : '') : k === 'Qty' ? (i < 3 || i === 5 ? 2 : '') : ''; }));
    var sh = memSheet_('QuoteLines', rows, calls), j = h.indexOf('Amount');
    var n = fillCalcRows_(sh.api.getRange(2, 1, 999, 3), db);
    eq('R7 formulas only on rows with data (rows 2-4, 7)', n + ' ' + [2, 3, 4, 5, 6, 7].map(function (r) { return sh.f[r - 1][j] ? 1 : 0; }).join(''), '4 111001');
    eq('R8 a 999-row edit = 1 read + 2 writes', calls.n - 1 + ' ' + calls.w, '3 2');
    eq('R9 formula text', sh.f[1][j], resolveF(db, 'QuoteLines', CALC.QuoteLines.Amount, 2));
    calls.n = 0; calls.w = 0;
    eq('R10 second run writes nothing', fillCalcRows_(sh.api.getRange(2, 1, 6, 3), db) + ' ' + calls.w, '0 0');
    eq('R11 tab without calculated columns ignored', fillCalcRows_(memSheet_('Log', rows, calls).api.getRange(2, 1, 5, 1), db), 0);
  });
  step('R hire billing guards', function () {
    var db = testSeed_('Full period');
    testQuote_(db, 'CAE/Q/2026/001', 'Rental', [['RL-STD-20', 'Ringlock standard 2.0 m', 'pc', 10, 1, 100]], { AdvancePct: 0 });
    var job = quoteToJob(db, 'CAE/Q/2026/001');
    postOpeningStock(db, [{ ItemCode: 'RL-STD-20', Qty: 50 }], '01-Jan-2023');
    postChallan(db, createChallan(db, { jobNo: job, date: '01-Jan-2023', lines: [{ itemCode: 'RL-STD-20', qty: 10 }] }));
    var r = runHireBilling(db, '01-Dec-2026');
    eq('R12 47 months in one run refused with a clear warning', r.invoices.length + ' ' + /would be made in one run/.test(r.warnings[0]), '0 true');
    r = runHireBilling(db, '01-Jan-2023', { deadline: Date.now() - 1 });
    eq('R13 past deadline: job left for next run', r.invoices.length + ' ' + r.left.join(), '0 ' + job);
    r = runHireBilling(db, '01-Jan-2023');
    eq('R14 next run continues', r.invoices.length + ' ' + r.left.length, '1 0');
    eq('R15 then nothing billed twice', runHireBilling(db, '15-Jan-2023').invoices.length, 0);
    throws('R16 bad date refused', function () { runHireBilling(db, 'tomorrow'); }, /date/);
  });
  step('R numbering with a time budget', function () {
    var db = testSeed_('Full period');
    db.insert('Customers', [{ Name: 'A Ltd.' }, { Name: 'B Ltd.' }]);
    eq('R17 past deadline: nothing numbered, 2 left', JSON.stringify(assignIdsSafe_(db, Date.now() - 1)), '{"n":0,"left":2}');
    eq('R18 next run numbers them', JSON.stringify(assignIdsSafe_(db)), '{"n":2,"left":0}');
  });
  if (typeof pdfSampleList_ === 'function') step('R sample set', function () {
    var sdb = testSeed_('Full period'), x = sampleDb_(sdb);
    eq('R19 sample list (11 documents, built fresh for each step)', x.list.length, 11);
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
