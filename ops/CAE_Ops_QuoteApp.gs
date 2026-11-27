/**
 * Core Access Ops — quotes from the CAE Field app (add-on QA1) · 15 Nov 2026
 * Fourteenth script file, LAST: Apps Script › + › Script › name it CAE_Ops_QuoteApp › paste › Save › reload the sheet.
 * File order: Code, PDF, UI, Reports, App, Sets, Order, QuoteReq, Site, Roles, Terms, QuoteForm, QuoteForm2, QuoteApp.
 * Then run upgradeQALive once from the editor (or it runs by itself on the first sweep; safe to repeat).
 *
 * Who: app roles Admin (Jamal + directors) and Accounts (new role) — Staff › AppRole, matched by Email. Others refused.
 * App writes only the staging tabs (same pattern as app challans):
 *   AppQuotes     AQID (UNIQUEID) · QuoteDate · QuoteType (Project / Rental / Sale) · CustID or NewCust* · SiteID or
 *                 NewProject + NewAddress · Subject · HireMonths · Notes · Status (Draft → Submitted → Posted / Error)
 *                 · SubmittedBy · QuoteNo · AppMsg
 *   AppQuoteLines AQLID · AQID · ItemCode or Description · Unit · DimL/W/H/N (→ qty, as the panel) · Qty · RateBasis ·
 *                 Billing (One-off / Monthly / Milestone) · Months · Rate
 * Sweep (the existing 5-minute auto-posting trigger): Submitted → checks → saveQuoteFull (same rules as the panel:
 *   new customer / project / shared project, measured lines, Service refused) → real CAE/Q number written back, Status
 *   Posted; else Status Error + reason in AppMsg (fix in the app, submit again). No direct app writes to Customers / Sites.
 * Quote PDF from the app: action sets Quotes.AppPdf = Requested (+ AppPdfBy = email) → sweep makes the PDF (link in
 *   Quotes.PDF) → AppPdf = "Made dd-Mon-yyyy hh:mm" or "Error: …".
 * Set-up: tabs AppQuotes + AppQuoteLines, Quotes + AppPdf, AppPdfBy (END of the tab, inherited validation cleared),
 *   Staff.AppRole dropdown + Accounts.
 * Replaces by name: appSweep (also wakes for AppQuotes / AppPdf). Wraps: appSweepRun_, selfTestAllParts_.
 *
 * QF5 (15 Nov 2026, this file): the quote PDF is made + saved in Drive automatically.
 *   Panel: after Save quote (new / edit / after Revise) and after Save terms, a second call (no wait screen, you can
 *   carry on) makes the PDF → link in Quotes.PDF, shown on the quote view; if it fails the quote stays saved and
 *   the error is shown. App: the sweep makes the PDF right after posting (Quotes.AppPdf "Made …"); Make PDF = remake.
 *   Drive keeps ONE file per quote: a re-save or a Revise replaces it — the old PDF + its editable Doc go to the bin
 *   (also when the file name changed, e.g. customer renamed or "Rev n" added) — user, 15 Nov 2026.
 *   Adds UI_ACTIONS_.quotePdf; wraps UI_ACTIONS_.pdf (Quote → same rule); panel: 1 injection (act + quoteView wrapped).
 *
 * QF4 (15 Nov 2026, this file): taxes on the quote + amount in words. Quotes + ATPct, AITPct (END, validation cleared,
 *   set up by itself on the first quote save); Settings ATPct = 0, AITPct = 0. Each tax = rate × subtotal, added to the
 *   total payable; advance + words on the total payable [verify with accountant]. Panel: AT % / AIT % boxes, live
 *   totals with the amount in words, quote view shows the rates + words. PDF: Subtotal · VAT · Total incl. VAT · AT ·
 *   AIT · Total payable + rule note. Invoices are NOT changed (subtotal + VAT as before).
 *   Wraps: quoteTotals, resolveF (Quotes.Total formula), UI_ACTIONS_.saveQuoteFull, uiInitDb_, PDF_SPECS.Quote,
 *   PDF_SPECS.PI, selfTestAllParts_; panel: 6 injections (quoteForm fields / totals / save, quoteView, start chunk).
 *
 * QF3 (15 Nov 2026, this file, at the end): email the quote to the client. Quote view › Email to client: To (customer
 *   email, editable, comma list), Cc, Subject, message (editable) + company signature, attachment = the quotation PDF
 *   (made first if missing) → Review (exactly what goes out) → Send now. GmailApp from the script account; from:
 *   info@coreaccesseng.com when that Gmail send-as alias exists, else reply-to it. After sending: Draft → Sent, Quotes.SentAt
 *   (END, validation cleared — run upgradeQF3Live once, then regenerate the Quotes table in AppSheet), Log row.
 *   Refused, nothing sent or written: no To, a bad address, > 20 recipients, empty subject / message, Lost quote, Gmail error.
 *   Adds UI_ACTIONS_.emailQuote, uiQuoteEmail (top-level, the draft); wraps selfTestAllParts_; panel: 1 injection.
 * QF3b (15 Nov 2026): director signatures. Staff + WorkEmail (END; the public address mohosin@ / junait@ / jamal@ / junaid@ —
 *   logins stay in Staff.Email). Email form › Signed by: Company (info@) or any active Staff row with a WorkEmail; default =
 *   the quote's PreparedBy, else the signed-in user's Staff row, else Company. Personal signature = Name (a trailing
 *   "(…)" dropped), Role as title, then the company block with the person's phone + WorkEmail. From = the WorkEmail when it
 *   is a Gmail send-as alias, else info@ (alias) with reply-to the WorkEmail. upgradeQF3 adds the column (regenerate Staff in AppSheet).
 */
var CAE_QA1_VERSION = 'QA1 · 15 Nov 2026';
var CAE_QF5_VERSION = 'QF5 · 15 Nov 2026';
var QA_ROLES_ = ['Admin', 'Accounts']; // Admin first (appRoleCheck_ message)
var QA_H_ = ['AQID', 'QuoteDate', 'QuoteType', 'CustID', 'NewCustName', 'NewCustContact', 'NewCustPhone', 'NewCustEmail', 'SiteID', 'NewProject', 'NewAddress',
  'Subject', 'HireMonths', 'Notes', 'Status', 'SubmittedBy', 'QuoteNo', 'AppMsg'];
var QAL_H_ = ['AQLID', 'AQID', 'ItemCode', 'Description', 'Unit', 'DimL', 'DimW', 'DimH', 'DimN', 'Qty', 'RateBasis', 'Billing', 'Months', 'Rate'];

// ======================================================================= set-up (safe to repeat)
function qaReady_(db) { return db.hasTab('AppQuotes') && db.hasTab('AppQuoteLines') && db.headers('Quotes').indexOf('AppPdfBy') >= 0; }
function upgradeQA(db) {
  var done = [], sh = typeof SheetDb === 'function' && db instanceof SheetDb;
  if (db.ensureTab('AppQuotes', QA_H_, [])) { done.push('AppQuotes tab'); if (sh) db.sheet('AppQuotes').getRange(2, 2, 999, 1).setNumberFormat('dd-mmm-yyyy'); }
  if (db.ensureTab('AppQuoteLines', QAL_H_, [])) done.push('AppQuoteLines tab');
  var add = [];
  ['AppPdf', 'AppPdfBy'].forEach(function (c) { if (db.ensureColumn('Quotes', c)) add.push(c); });
  if (add.length) {
    done.push('Quotes + ' + add.join(', '));
    // a new column copies the validation of the column before it (insertColumnAfter) — clear it
    if (sh) { var qs = db.sheet('Quotes'), qh = db.headers('Quotes'); add.forEach(function (c) { qs.getRange(1, qh.indexOf(c) + 1, qs.getMaxRows(), 1).clearDataValidations(); }); }
  }
  if (sh && db.hasTab('Staff') && db.headers('Staff').indexOf('AppRole') >= 0 && typeof ensureAllowed_ === 'function') {
    if (ensureAllowed_(db, 'Staff', 'AppRole', ['Accounts']).length) done.push('Staff.AppRole dropdown + Accounts');
  }
  if (done.length) log_(db, 'Upgrade QA1', '', done.join('; '));
  return done;
}
function upgradeQALive() { var db = new SheetDb(), d = upgradeQA(db); SpreadsheetApp.flush(); Logger.log(d.length ? 'Done: ' + d.join('; ') : 'Already up to date.'); }

// ======================================================================= one app quote
function qaLines_(db, id) { return db.rows('AppQuoteLines').filter(function (l) { return String(l.AQID) === String(id); }).sort(function (a, b) { return a._r - b._r; }); }
function qaStaffId_(db, email) {
  var e = qfStr_(email).toLowerCase(), s = e && db.rows('Staff').filter(function (x) { return qfStr_(x.Email).toLowerCase() === e && x.Status !== 'Inactive'; })[0];
  return s ? s.StaffID : '';
}
// AppQuotes row → saveQuoteFull arguments (checks only, nothing written)
function qaArgs_(db, aq) {
  var d = aq.QuoteDate;
  if (!blank(d) && !(d instanceof Date)) throw new Error('Quote date "' + d + '" was not read as a date. In AppSheet set Data › AppQuotes › Locale = English (United Kingdom), then submit again.');
  var type = qfStr_(aq.QuoteType) || 'Project', months = num(aq.HireMonths) > 0 ? num(aq.HireMonths) : 1;
  var lines = qaLines_(db, aq.AQID);
  if (!lines.length) throw new Error('The quote has no lines');
  var cust;
  if (!blank(aq.CustID)) cust = { mode: 'existing', id: qfStr_(aq.CustID) };
  else if (!blank(aq.NewCustName)) cust = { mode: 'new', fields: { name: aq.NewCustName, contact: aq.NewCustContact, phone: aq.NewCustPhone, email: aq.NewCustEmail } };
  else throw new Error('Choose the customer or type a new customer name');
  var site = { mode: 'none' };
  if (!blank(aq.SiteID)) {
    var s = must(db, 'Sites', 'SiteID', qfStr_(aq.SiteID));
    site = cust.mode === 'existing' && s.CustID === cust.id ? { mode: 'existing', id: s.SiteID } : { mode: 'link', src: s.SiteID };
  } else if (!blank(aq.NewProject)) site = { mode: 'new', fields: { project: aq.NewProject, address: aq.NewAddress } };
  return {
    quoteNo: '', customer: cust, site: site,
    header: { QuoteType: type, QuoteDate: blank(d) ? today() : d, Subject: qfStr_(aq.Subject), HireMonths: blank(aq.HireMonths) ? '' : num(aq.HireMonths), Notes: qfStr_(aq.Notes), PreparedBy: qaStaffId_(db, aq.SubmittedBy) },
    lines: lines.map(function (l) {
      var bill = qfStr_(l.Billing) || (type === 'Sale' ? 'One-off' : 'Monthly');
      return { ItemCode: qfStr_(l.ItemCode), Description: qfStr_(l.Description), Unit: qfStr_(l.Unit), Qty: l.Qty, Billing: bill,
        Months: bill === 'Monthly' ? (num(l.Months) > 0 ? num(l.Months) : months) : '', Rate: blank(l.Rate) ? 0 : l.Rate,
        DimL: l.DimL, DimW: l.DimW, DimH: l.DimH, DimN: l.DimN, RateBasis: qfStr_(l.RateBasis) };
    }),
  };
}
function qaProcess_(db, aq, o) {
  var who = aq.SubmittedBy || 'app';
  if (!blank(aq.QuoteNo)) {
    db.update('AppQuotes', aq, { Status: 'Posted', AppMsg: 'Already posted as ' + aq.QuoteNo + ' — change it in the sheet panel (Quotes › Edit)' });
    return { no: aq.QuoteNo, posted: false };
  }
  appRoleCheck_(db, aq.SubmittedBy, QA_ROLES_);
  var r = UI_ACTIONS_.saveQuoteFull(db, qaArgs_(db, aq)), t = quoteTotals(db, r.ref);
  db.update('AppQuotes', aq, { Status: 'Posted', QuoteNo: r.ref, AppMsg: ('Posted ' + r.ref + ' · total Tk ' + tk(t.total) + (r.cust ? ' · ' + r.cust : '') + (r.site ? ' · ' + r.site : '')).slice(0, 480) });
  log_(db, 'App quote posted', r.ref, who + ' · ' + aq.AQID + ' · Tk ' + t.total);
  if (o && o.later) { // CR M8 run 2: the timed sweep makes PDFs after it lets the locks go: queued as an app PDF request (the next run retries it)
    var pq = { AppPdf: 'Requested' }; if (db.headers('Quotes').indexOf('AppPdfBy') >= 0) pq.AppPdfBy = aq.SubmittedBy || ''; // step R: as qaReady_ (both columns come with the set-up)
    db.update('Quotes', must(db, 'Quotes', 'QuoteNo', r.ref), pq);
    var a3 = must(db, 'AppQuotes', 'AQID', aq.AQID); db.update('AppQuotes', a3, { AppMsg: (String(a3.AppMsg) + ' · PDF being made').slice(0, 480) });
  } else if (!(o && o.noPdf && !o.pdf)) { // QF5: PDF right away (the quote stays posted if it fails)
    var p = qaPdfMake_(db, r.ref, o), a2 = must(db, 'AppQuotes', 'AQID', aq.AQID);
    db.update('AppQuotes', a2, { AppMsg: (String(a2.AppMsg) + (p.error ? ' · PDF not made: ' + p.error + ' (use Make PDF)' : ' · PDF made')).slice(0, 480) });
  }
  return { no: r.ref, posted: true };
}
function qaStamp_() { var n = new Date(); return fmtDay(dayNum(n)) + ' ' + ('0' + n.getHours()).slice(-2) + ':' + ('0' + n.getMinutes()).slice(-2); }
// makes the quote PDF now (QF5 rule) → Quotes.AppPdf = "Made …" or "Error: …" (o.pdf = test stub)
function qaPdfMake_(db, no, o) {
  try {
    if (o && o.pdf) o.pdf(db, no); else qf5Pdf_(db, no);
    db.update('Quotes', must(db, 'Quotes', 'QuoteNo', no), { AppPdf: 'Made ' + qaStamp_() });
    return {};
  } catch (e) {
    db.update('Quotes', must(db, 'Quotes', 'QuoteNo', no), { AppPdf: ('Error: ' + e.message).slice(0, 480) });
    return { error: e.message };
  }
}
// Quotes.AppPdf = Requested → PDF again (remake after changes)
function qaPdf_(db, q, o) {
  var no = q.QuoteNo, p;
  try { appRoleCheck_(db, q.AppPdfBy, QA_ROLES_); } catch (e) {
    db.update('Quotes', must(db, 'Quotes', 'QuoteNo', no), { AppPdf: ('Error: ' + e.message).slice(0, 480) });
    p = { error: e.message };
  }
  if (!p && o && o.later) { o.later.push({ k: 'q', no: String(no), by: q.AppPdfBy || 'app' }); return { no: no + ' PDF', posted: false }; } // CR M8 run 2: made after the locks (qaLater_)
  if (!p) p = qaPdfMake_(db, no, o);
  if (p.error) { log_(db, 'App quote PDF refused', no, (q.AppPdfBy || 'app') + ' · ' + p.error); return { no: no + ' PDF', posted: false, error: p.error }; }
  log_(db, 'App quote PDF', no, q.AppPdfBy || 'app');
  return { no: no + ' PDF', posted: true };
}

// ======================================================================= sweep (wraps the challan + conversion sweep)
if (typeof appSweepRun_ === 'function') {
  var QA_sweep0_ = appSweepRun_;
  appSweepRun_ = function (o) {
    o = o || {}; o.db = o.db || new SheetDb();
    var out = QA_sweep0_(o), db = o.db;
    if (!db.hasTab('AppQuotes')) return out;
    if (!qaReady_(db)) upgradeQA(db);
    db.rows('AppQuotes').filter(function (q) { return q.Status === 'Submitted'; }).sort(function (a, b) { return a._r - b._r; }).forEach(function (aq) {
      if (timeUp_(o.deadline)) { out.left++; return; }
      var r;
      try { r = qaProcess_(db, aq, o); }
      catch (e) {
        db.update('AppQuotes', aq, { Status: 'Error', AppMsg: ('Not posted: ' + e.message).replace(/\n/g, '; ').slice(0, 480) });
        log_(db, 'App quote refused', aq.AQID, (aq.SubmittedBy || 'app') + ' · ' + e.message);
        r = { no: 'App quote ' + aq.AQID, posted: false, error: e.message };
      }
      out.done++; if (r.posted) out.posted++; else if (r.error) out.failed++;
      out.list.push(r);
    });
    db.rows('Quotes').filter(function (q) { return q.AppPdf === 'Requested'; }).forEach(function (q) {
      if (timeUp_(o.deadline)) { out.left++; return; }
      var r = o.noPdf && !o.pdf ? { no: q.QuoteNo + ' PDF', posted: false } : qaPdf_(db, q, o);
      out.done++; if (r.posted) out.posted++; else if (r.error) out.failed++;
      out.list.push(r);
    });
    return out;
  };
}
// Trigger handler (replaces O7's): cheap when idle — reads only the Status / AppPdf columns.
function appSweep() {
  var db = new SheetDb(), any = false;
  [['Challans', 'Status', 'Submitted'], ['Conversions', 'Status', 'Submitted'], ['AppQuotes', 'Status', 'Submitted'], ['Quotes', 'AppPdf', 'Requested']].forEach(function (x) {
    if (any || !db.hasTab(x[0])) return;
    var s = db.sheet(x[0]), j = db.headers(x[0]).indexOf(x[1]) + 1, n = s.getLastRow();
    if (j > 0 && n > 1 && s.getRange(2, j, n - 1, 1).getValues().some(function (r) { return r[0] === x[2]; })) any = true;
  });
  if (!any) return;
  // CR M8 run 2 (step R): phase 2 holds no lock, so two timed runs could overlap (the same quote PDF twice): one sweep at a time (nothing else takes the user lock)
  var ul = typeof LockService.getUserLock === 'function' ? LockService.getUserLock() : null;
  if (ul && !ul.tryLock(0)) return;
  try {
    var sl = LockService.getScriptLock(); // CR M8 run 1: the office posts holding the script lock -> the sweep takes it first, then the document lock (as the panel)
    if (!sl.tryLock(20000)) return;
    var ol = typeof OLK_ === 'object' && OLK_ ? OLK_ : null; if (ol) ol.s++; // held: a nested office write runs inside it
    var later = [], dl = deadline_(), mk0 = makePdf, e1 = null;
    try {
      var lock = LockService.getDocumentLock();
      if (!lock.tryLock(20000)) return;
      // CR M8 run 2: no PDF export (10-30 s each) inside the script lock (an office save waits 30 s at most): queued, made below
      makePdf = function (d, what, no) { if (what !== 'Challan') return mk0.apply(this, arguments); later.push({ k: 'ch', no: String(no) }); return { url: '', doc: '', file: '', placeholders: 0 }; };
      var ok = false;
      try { appSweepRun_({ db: db, deadline: dl, later: later }); ok = true; }
      finally { makePdf = mk0; try { SpreadsheetApp.flush(); } catch (e) { if (ok) throw e; } finally { lock.releaseLock(); } } // CR M8 run 2: flushed holding both locks, also after a failure (its error kept)
    } catch (e) { e1 = e; } finally { makePdf = mk0; if (ol) ol.s--; sl.releaseLock(); }
    qaLater_(later, dl); // CR M8 run 2 (step R): also after a failure: a challan posted before it still gets its PDF (or the note)
    if (e1) throw e1;
  } finally { if (ul) ul.releaseLock(); }
}
// CR M8 run 2: the sweep's PDFs, after both locks are let go, each as a sheet-panel PDF run (uiDo: document lock only while it renders;
// the link goes in under the script lock only if the office app did not change it meanwhile); then the result, holding both locks.
// Out of time: a quote stays Requested (the next run makes it); a challan says so in AppMsg (Make PDF in the office app or the panel).
function qaLater_(L, dl) {
  (L || []).forEach(function (j) {
    var er = '', r = null, q = j.k === 'q';
    if (timeUp_(dl)) { if (q) return; er = 'out of time'; }
    else { try { r = uiDo(q ? 'quotePdf' : 'pdf', q ? { quoteNo: j.no } : { what: 'Challan', no: j.no }); } catch (e) { er = String(e && e.message || e); } }
    if (!er && !(r && Array.isArray(r.links) && r.links.length)) er = String(r && r.msg || '').split('\n').slice(1).join(' ') || 'the PDF link was not kept';
    try {
      withLock(function () {
        var d = new SheetDb();
        if (q) {
          var x = find(d.rows('Quotes'), 'QuoteNo', j.no); if (x) d.update('Quotes', x, { AppPdf: er ? ('Error: ' + er).slice(0, 480) : 'Made ' + qaStamp_() });
          log_(d, er ? 'App quote PDF refused' : 'App quote PDF', j.no, j.by + (er ? ' · ' + er : ''));
        } else if (er) { var c = find(d.rows('Challans'), 'ChallanNo', j.no); if (c) d.update('Challans', c, { AppMsg: ('Posted; PDF not made: ' + er).slice(0, 480) }); }
      });
    } catch (e) { /* a quote stays Requested: the next run makes it again */ }
  });
}

// ======================================================================= self-test (in memory, your data is not touched)
if (typeof selfTestAllParts_ === 'function') {
  var QA_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return QA_parts0_().concat([['QA', selfTestQA()]]); };
}
function selfTestQA() {
  var T = testKit_(), eq = T.eq, step = T.step, db = testSeed_('Full period');
  upgradeO6(db); upgradeO7(db);
  db.insert('Staff', [{ StaffID: 'STF-A', Name: 'Admin', Email: 'admin@test', AppRole: 'Admin', Status: 'Active' }, { StaffID: 'STF-C', Name: 'Accounts', Email: 'Acc@Test', AppRole: 'Accounts', Status: 'Active' },
    { StaffID: 'STF-Y', Name: 'Yard', Email: 'yard@test', AppRole: 'Yard', Status: 'Active' }]);
  var D = new Date(2026, 10, 20), n = 0, pdfs = [];
  var run = function (o) { return appSweepRun_(Object.assign({ db: db, noPdf: true }, o || {})); };
  var aq = function (id) { return find(db.rows('AppQuotes'), 'AQID', id); };
  var add = function (head, lines) {
    var id = 'aq' + (++n);
    db.insert('AppQuotes', Object.assign({ AQID: id, QuoteDate: D, QuoteType: 'Project', Status: 'Submitted', SubmittedBy: 'acc@test' }, head));
    db.insert('AppQuoteLines', (lines || []).map(function (l, i) { return Object.assign({ AQLID: id + 'l' + i, AQID: id }, l); }));
    return id;
  };
  var seq = function () { return find(db.rows('Sequences'), 'SeqKey', 'Q-2026') ? find(db.rows('Sequences'), 'SeqKey', 'Q-2026').LastNo : 0; };
  var cnt = function () { return ['Customers', 'Sites', 'Quotes', 'QuoteLines'].map(function (t) { return db.rows(t).length; }).join(' ') + ' ' + seq(); };
  var L2 = [{ Description: 'Façade scaffold', DimL: 20, DimH: 12, Billing: 'Monthly', Months: 2, Rate: 50 }, { ItemCode: 'RL-STD-20', Qty: 10, Billing: 'One-off', Rate: 90 }];
  step('QA set-up', function () {
    eq('QA1 tabs + Quotes columns at the end', upgradeQA(db).join('; ') + ' | ' + db.headers('Quotes').slice(-2).join(), 'AppQuotes tab; AppQuoteLines tab; Quotes + AppPdf, AppPdfBy | AppPdf,AppPdfBy');
    eq('QA2 second run changes nothing', upgradeQA(db).length, 0);
    eq('QA3 quote roles', QA_ROLES_.join(), 'Admin,Accounts');
    eq('QA4 nothing waiting → nothing done', run().done, 0);
  });
  step('QA post from the app', function () {
    var a = add({ NewCustName: 'Zeta Ltd', NewCustContact: 'Mr. Z', NewCustPhone: '01712000000', NewProject: 'Depot 9', NewAddress: 'Tongi', Subject: 'Façade scaffold' }, L2);
    add({ Status: 'Draft', CustID: 'CUST-0001' }, L2);
    var r = run(), q = aq(a), Q = find(db.rows('Quotes'), 'QuoteNo', q.QuoteNo);
    eq('QA5 one posted, drafts left alone', r.done + ' ' + r.posted + ' ' + aq('aq2').Status, '1 1 Draft');
    eq('QA6 real number + Posted + message', [q.QuoteNo, q.Status, /^Posted CAE\/Q\/2026\/001 · total Tk 28,635.00 · CUST-0002 · SITE-0002$/.test(q.AppMsg)].join(' '), 'CAE/Q/2026/001 Posted true');
    eq('QA7 new customer + project + own location', [Q.CustID, Q.SiteID, must(db, 'Sites', 'SiteID', 'SITE-0002').LocID, must(db, 'Customers', 'CustID', 'CUST-0002').Name, Q.Attention].join('|'), 'CUST-0002|SITE-0002|LOC-S0002|Zeta Ltd|Mr. Z');
    var L = quoteLines(db, q.QuoteNo);
    eq('QA8 measured line worked out on the server', [L.length, L[0].Qty, L[0].Unit, L[0].DimL, L[0].RateBasis, L[1].Description].join('|'), '2|240|m²|20|Per unit|Ringlock standard 2.0 m');
    eq('QA9 totals as the panel: (240×2×50 + 900) × 1.15', quoteTotals(db, q.QuoteNo).total, 28635);
    eq('QA10 Draft, type, date, prepared by the submitter', [Q.Status, Q.QuoteType, fmtDay(dayNum(Q.QuoteDate)), Q.PreparedBy, Q.Subject].join('|'), 'Draft|Project|20-Nov-2026|STF-C|Façade scaffold');
    var b = add({ CustID: 'CUST-0001', SiteID: 'SITE-0001', QuoteType: 'Rental', HireMonths: 3, SubmittedBy: 'admin@test' }, [{ ItemCode: 'RL-STD-20', Qty: 10, Rate: 90 }]);
    run();
    eq('QA11 existing customer + project; blank billing = Monthly × HireMonths', [aq(b).QuoteNo, find(db.rows('Quotes'), 'QuoteNo', aq(b).QuoteNo).SiteID, quoteLines(db, aq(b).QuoteNo)[0].Billing, quoteTotals(db, aq(b).QuoteNo).total].join(' '), 'CAE/Q/2026/002 SITE-0001 Monthly 3105');
    var c = add({ CustID: 'CUST-0002', SiteID: 'SITE-0001' }, [{ Description: 'Lump sum works', RateBasis: 'Lump sum', Billing: 'One-off', Rate: 5000 }]);
    run();
    var s3 = must(db, 'Sites', 'SiteID', find(db.rows('Quotes'), 'QuoteNo', aq(c).QuoteNo).SiteID);
    eq('QA12 another client\'s project → shared (own Sites row + location)', [s3.SiteID, s3.CustID, s3.Project === must(db, 'Sites', 'SiteID', 'SITE-0001').Project, s3.LocID].join(' '), 'SITE-0003 CUST-0002 true LOC-S0003');
    eq('QA13 lump sum: 1 lot', quoteLines(db, aq(c).QuoteNo)[0].Qty + ' ' + quoteLines(db, aq(c).QuoteNo)[0].Unit, '1 lot');
  });
  step('QA refused: nothing written, no number used', function () {
    var c0 = cnt();
    var ids = [add({ CustID: 'CUST-0001', SubmittedBy: 'yard@test' }, L2), add({ CustID: 'CUST-0001', SubmittedBy: 'nobody@test' }, L2), add({ NewCustName: ' test  client ' }, L2),
      add({ CustID: 'CUST-0001' }, []), add({ CustID: 'CUST-0001', QuoteDate: '20/11/2026' }, L2), add({ CustID: 'CUST-0001', QuoteType: 'Service' }, L2), add({}, L2),
      add({ CustID: 'CUST-0001' }, [{ Description: 'x', DimL: 5, Billing: 'One-off', Rate: 1 }]), add({ CustID: 'CUST-0001' }, [{ Description: 'x', Qty: 0, Billing: 'One-off', Rate: 1 }])];
    var r = run(), m = function (i) { var x = aq(ids[i]); return x.Status + ': ' + x.AppMsg; };
    eq('QA14 nine refused', r.done + ' ' + r.failed + ' ' + r.posted, '9 9 0');
    eq('QA15 Yard role refused', /^Error: Not posted: .*app role Yard — only Accounts or Admin can submit/.test(m(0)), true);
    eq('QA16 unknown email refused', /not in the Staff tab/.test(m(1)), true);
    eq('QA17 duplicate customer name → pick it', /already exists \(CUST-0001\)/.test(m(2)), true);
    eq('QA18 no lines', /no lines/.test(m(3)), true);
    eq('QA19 text date → locale hint', /Locale = English \(United Kingdom\)/.test(m(4)), true);
    eq('QA20 Service refused (= Project)', /now Project/.test(m(5)), true);
    eq('QA21 no customer', /Choose the customer/.test(m(6)), true);
    eq('QA22 size without height / qty 0', /length and height/.test(m(7)) + ' ' + /quantity/.test(m(8)), 'true true');
    eq('QA23 nothing written, no number used', cnt(), c0);
    db.update('AppQuotes', aq(ids[2]), { NewCustName: '', CustID: 'CUST-0001', Status: 'Submitted' });
    run();
    eq('QA24 fixed in the app + resubmitted → posted', aq(ids[2]).Status + ' ' + aq(ids[2]).QuoteNo, 'Posted CAE/Q/2026/004');
    db.update('AppQuotes', aq(ids[2]), { Status: 'Submitted' });
    var c1 = cnt(); run();
    eq('QA25 posted row submitted again: no second quote', aq(ids[2]).Status + ' ' + /Already posted as CAE\/Q\/2026\/004/.test(aq(ids[2]).AppMsg) + ' ' + (cnt() === c1), 'Posted true true');
  });
  step('QA PDF from the app + time limit', function () {
    var stub = function (d, no) { pdfs.push(no); };
    db.update('Quotes', must(db, 'Quotes', 'QuoteNo', 'CAE/Q/2026/001'), { AppPdf: 'Requested', AppPdfBy: 'acc@test' });
    db.update('Quotes', must(db, 'Quotes', 'QuoteNo', 'CAE/Q/2026/002'), { AppPdf: 'Requested', AppPdfBy: 'yard@test' });
    var r = run({ pdf: stub }), a1 = must(db, 'Quotes', 'QuoteNo', 'CAE/Q/2026/001').AppPdf, a2 = must(db, 'Quotes', 'QuoteNo', 'CAE/Q/2026/002').AppPdf;
    eq('QA26 Accounts: PDF made; Yard: refused', [r.posted, r.failed, pdfs.join(), /^Made \d\d-\w{3}-2026 \d\d:\d\d$/.test(a1), /^Error: .*app role Yard/.test(a2)].join(' '), '1 1 CAE/Q/2026/001 true true');
    eq('QA27 done once (not Requested any more)', run({ pdf: stub }).done + ' ' + pdfs.length, '0 1');
    add({ CustID: 'CUST-0001' }, L2);
    r = run({ deadline: Date.now() - 1 });
    eq('QA28 past the time limit: left for the next run', r.done + ' ' + r.left + ' ' + aq('aq' + n).Status, '0 1 Submitted');
    eq('QA29 menu line', sweepLine_({ no: 'App quote aq9', posted: false, error: 'Not posted: x' }), 'App quote aq9 — Not posted: x');
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}

// ======================================================================= QF5 quote PDF saved automatically (panel + app)
var QF5_STUB_ = null; // self-test only: { make(db, what, no) → makePdf-like result, drive: { name(url), trash(url, base) } }
function qf5Base_(name) { return String(name == null ? '' : name).replace(/\.pdf$/i, ''); }
// is an earlier PDF file name the same quote (any revision)? ("CAE-Q-2026-003 Aziz.pdf", "CAE-Q-2026-003 Rev 1 Aziz.pdf")
function qf5SameQuote_(oldName, no) {
  var b = qf5Base_(oldName), head = fileName_(no);
  return !!b && (b === head || b.indexOf(head + ' ') === 0);
}
function qf5Id_(url) { var m = String(url || '').match(/\/d\/([\w-]{20,})/) || String(url || '').match(/[?&]id=([\w-]{20,})/); return m ? m[1] : ''; }
var QF5_DRIVE_ = {
  name: function (url) { var id = qf5Id_(url), f = id ? DriveApp.getFileById(id) : null; return f && !f.isTrashed() ? f.getName() : ''; },
  trash: function (url, base, keep) { // the PDF + its editable Doc (PDF/Quotes/Editable, same name); CR M8 run 2: keep = the new PDF + Doc ids (same name when unchanged)
    var k = Array.isArray(keep) ? keep : [], f = DriveApp.getFileById(qf5Id_(url)), ps = f.getParents();
    if (k.indexOf(f.getId()) < 0) f.setTrashed(true);
    while (ps.hasNext()) { var e = ps.next().getFoldersByName('Editable'); if (e.hasNext()) trashSame_(e.next(), base, k); }
  },
};
// makes the quotation PDF (makePdf: same file name is replaced) and bins the previous PDF of the same quote (any revision) when its name differs
function qf5Pdf_(db, no, o) {
  o = o || QF5_STUB_ || {};
  var q = must(db, 'Quotes', 'QuoteNo', no), old = qfStr_(q.PDF), dr = o.drive || QF5_DRIVE_, gone = '';
  var r = (o.make || makePdf)(db, 'Quote', no);
  if (old && old !== r.url) {
    try { var nm = dr.name(old); if (nm && qf5SameQuote_(nm, no)) { dr.trash(old, qf5Base_(nm), [qf5Id_(r.url), qf5Id_(r.doc)].filter(function (x) { return x; })); gone = nm; } } catch (e) { /* already gone or no access: keep going */ }
  }
  return { url: r.url, doc: r.doc || '', file: r.file, placeholders: r.placeholders || 0, trashed: gone };
}
UI_ACTIONS_.quotePdf = function (db, a) {
  var r = qf5Pdf_(db, a.quoteNo);
  return { msg: r.file + ' saved in Drive' + (r.trashed ? ' (the old ' + r.trashed + ' went to the bin)' : '') + '.' + (r.placeholders ? ' ' + r.placeholders + ' [placeholder] text(s) still to fill (teal).' : ''),
    warn: r.placeholders > 0, links: uiPdfLinks_(r), ref: a.quoteNo };
};
var QF5_pdf0_ = UI_ACTIONS_.pdf;
UI_ACTIONS_.pdf = function (db, a) { return a && a.what === 'Quote' ? UI_ACTIONS_.quotePdf(db, { quoteNo: a.no }) : QF5_pdf0_(db, a); };
var QF5_rev0_ = UI_ACTIONS_.reviseQuote;
if (QF5_rev0_) UI_ACTIONS_.reviseQuote = function (db, a) {
  var r = QF5_rev0_(db, a);
  if (r && r.msg) r.msg = r.msg.replace('Edit, save, then make the PDF — the old PDF stays as it was', 'Edit and save — the new PDF is made automatically and replaces the old one in Drive');
  return r;
};

function QF5_PANEL_() {
function qf5MakePdf(no){var m=$('msg'),d=m.firstChild;if(!d){d=el('div',{cls:'ok'});m.appendChild(d);}
  var n=el('div',{cls:'muted',text:'Making the quotation PDF for '+no+'… (you can carry on)'});add(d,[el('br'),n]);
  google.script.run.withSuccessHandler(function(r){n.textContent='';add(n,[r.msg+'  ',r.links&&r.links[0]?el('a',{href:r.links[0].url,target:'_blank',text:'Open PDF'}):null]);})
    .withFailureHandler(function(e){n.className='err';n.textContent='The quote is saved, but the PDF was not made: '+((e&&e.message)||e)+' — try Quotation PDF on the quote.';})
    .uiDo('quotePdf',{quoteNo:no});}
var qf5Act0_=act;act=function(a,args){var p=qf5Act0_(a,args);if(a==='saveQuoteFull'||a==='saveTerms')p.then(function(x){if(x&&x.ref)qf5MakePdf(x.ref);},function(){});return p;};
var qf5QV0_=quoteView;quoteView=function(r){var o=qf5QV0_.apply(this,arguments),h=r&&r.header;
  if(h&&h.PDF)o.insertBefore(el('p',{cls:'muted'},'Quotation PDF (saved automatically, Rev '+(h.Rev||0)+'): ',el('a',{href:h.PDF,target:'_blank',text:'open'})),o.children[2]||null);return o;};
}
var QF5_HTML_ = '\n// ================= QF5 quote PDF on save\n' + qfPanelSrc_(QF5_PANEL_) + '\n';
var QF5_INJECTED_ = 0;
if (typeof UI_HTML_ === 'string' && UI_HTML_.indexOf('// ================= start') >= 0) {
  UI_HTML_ = UI_HTML_.replace('// ================= start', function () { return QF5_HTML_ + '\n// ================= start'; }); QF5_INJECTED_++;
}

if (typeof selfTestAllParts_ === 'function') {
  var QF5_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return QF5_parts0_().concat([['QF5', selfTestQF5()]]); };
}
function selfTestQF5() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws, db = testSeed_('Full period');
  var files = [], made = 0, boom = false;
  var live = function (no) { var p = fileName_(no); return files.filter(function (f) { return !f.trashed && f.pdf && f.name.indexOf(p) === 0; }).map(function (f) { return f.name; }).sort(); };
  var stub = {
    make: function (d, w, n) { // like makePdf: same name replaced, new file, link written
      if (boom) throw new Error('Drive is busy');
      var sp = PDF_SPECS.Quote(d, n), u = 'https://drive.google.com/file/d/QF5TEST' + (++made) + 'abcdefghijklmnopqrst/view';
      files.forEach(function (f) { if (f.name === sp.file + '.pdf' || f.name === sp.file) f.trashed = true; });
      files.push({ url: u, name: sp.file + '.pdf', pdf: true }, { url: u + '#doc', name: sp.file });
      d.update('Quotes', must(d, 'Quotes', 'QuoteNo', n), { PDF: u });
      return { url: u, doc: u + '#doc', file: sp.file + '.pdf', placeholders: 0 };
    },
    drive: { name: function (u) { var f = files.filter(function (x) { return x.url === u && !x.trashed; })[0]; return f ? f.name : ''; },
      trash: function (u, base) { files.forEach(function (f) { if (f.url === u || f.name === base) f.trashed = true; }); } },
  };
  var run = function (x, a) { return uiDoDb_(db, x, a); };
  var H = function (o) { return Object.assign({ QuoteType: 'Rental', QuoteDate: '2026-11-20', VATPct: '15%', AdvancePct: '50%', CustID: 'CUST-0001' }, o || {}); };
  var LN = [{ ItemCode: 'RL-STD-20', Qty: 10, Months: 2, Billing: 'Monthly', Rate: 90 }];
  var save = function (no) { return run('saveQuoteFull', { quoteNo: no || '', header: H(), lines: LN, customer: { mode: 'existing', id: 'CUST-0001' }, site: { mode: 'none' } }); };
  db.ensureColumn('Quotes', 'PDF');
  QF5_STUB_ = stub;
  try {
    step('K names', function () {
      eq('K1 same quote, any rev', [qf5SameQuote_('CAE-Q-2026-003 Aziz.pdf', 'CAE/Q/2026/003'), qf5SameQuote_('CAE-Q-2026-003.pdf', 'CAE/Q/2026/003'), qf5SameQuote_('CAE-Q-2026-003 Rev 1 Aziz.pdf', 'CAE/Q/2026/003')].join(), 'true,true,true');
      eq('K2 other quote / no name', [qf5SameQuote_('CAE-Q-2026-0031 A.pdf', 'CAE/Q/2026/003'), qf5SameQuote_('CAE-Q-2026-004 Rev 1 A.pdf', 'CAE/Q/2026/003'), qf5SameQuote_('', 'CAE/Q/2026/003')].join(), 'false,false,false');
      eq('K3 file id from a Drive link', qf5Id_('https://drive.google.com/file/d/1AbC_dEf-123456789012345/view?usp=drivesdk'), '1AbC_dEf-123456789012345');
    });
    var Q;
    step('K panel save → PDF', function () {
      Q = save().ref;
      var r = run('quotePdf', { quoteNo: Q }), q = must(db, 'Quotes', 'QuoteNo', Q);
      eq('K4 save + PDF: 1 file, link in Quotes.PDF + reply', live(Q).length + ' ' + (q.PDF === r.links[0].url) + ' ' + /^CAE-Q-2026-001 Test Client\.pdf saved in Drive\.$/.test(r.msg), '1 true true');
      save(Q); run('quotePdf', { quoteNo: Q });
      eq('K5 saved again, same Rev: still 1 file', live(Q).join(), 'CAE-Q-2026-001 Test Client.pdf');
      db.update('Customers', must(db, 'Customers', 'CustID', 'CUST-0001'), { Name: 'Test Client Ltd' });
      r = run('quotePdf', { quoteNo: Q });
      eq('K6 name changed, same Rev: old PDF + Doc binned', live(Q).join() + ' | ' + /the old CAE-Q-2026-001 Test Client\.pdf went to the bin/.test(r.msg) + ' ' + files.filter(function (f) { return !f.trashed; }).length, 'CAE-Q-2026-001 Test Client Ltd.pdf | true 2');
      run('reviseQuote', { quoteNo: Q }); save(Q); run('quotePdf', { quoteNo: Q });
      eq('K7 Revise → new file replaces Rev 0 (PDF + Doc binned)', live(Q).join() + ' ' + files.filter(function (f) { return !f.trashed; }).length, 'CAE-Q-2026-001 Rev 1 Test Client Ltd.pdf 2');
      save(Q); run('pdf', { what: 'Quote', no: Q });
      eq('K8 Rev 1 again (also the Quotation PDF button): still 1', live(Q).length, 1);
      boom = true; var t0 = quoteTotals(db, Q).total;
      throws('K9 PDF error is shown', function () { run('quotePdf', { quoteNo: Q }); }, /Drive is busy/);
      eq('K10 …and the quote stays saved', must(db, 'Quotes', 'QuoteNo', Q).Rev + ' ' + quoteTotals(db, Q).total + ' ' + (t0 > 0), '1 ' + t0 + ' true');
      boom = false;
      eq('K17 Revise message: PDF made automatically, replaces the old one', /replaces the old one in Drive/.test(run('reviseQuote', { quoteNo: Q }).msg), true);
    });
    step('K app sweep makes the PDF', function () {
      upgradeO6(db); upgradeO7(db); upgradeQA(db);
      db.insert('Staff', { StaffID: 'STF-C', Name: 'Accounts', Email: 'acc@test', AppRole: 'Accounts', Status: 'Active' });
      var pd = [], ok = function (d, no) { pd.push(no); }, bad = function () { throw new Error('no Doc base'); };
      var sub = function (id) { db.insert('AppQuotes', { AQID: id, QuoteDate: new Date(2026, 10, 20), QuoteType: 'Rental', CustID: 'CUST-0001', Status: 'Submitted', SubmittedBy: 'acc@test' });
        db.insert('AppQuoteLines', { AQLID: id + 'l', AQID: id, ItemCode: 'RL-STD-20', Qty: 5, Billing: 'One-off', Rate: 90 }); };
      sub('k1'); appSweepRun_({ db: db, pdf: ok });
      var a = find(db.rows('AppQuotes'), 'AQID', 'k1'), q = find(db.rows('Quotes'), 'QuoteNo', a.QuoteNo);
      eq('K11 posted + PDF made at once', [a.Status, pd.join(), /^Made \d\d-\w{3}-2026 \d\d:\d\d$/.test(q.AppPdf), / · PDF made$/.test(a.AppMsg)].join(' '), 'Posted ' + a.QuoteNo + ' true true');
      sub('k2'); appSweepRun_({ db: db, pdf: bad });
      a = find(db.rows('AppQuotes'), 'AQID', 'k2'); q = find(db.rows('Quotes'), 'QuoteNo', a.QuoteNo);
      eq('K12 PDF error: quote still posted, error shown', [a.Status, !!a.QuoteNo, /^Error: no Doc base/.test(q.AppPdf), /PDF not made: no Doc base \(use Make PDF\)$/.test(a.AppMsg)].join(' '), 'Posted true true true');
      sub('k3'); appSweepRun_({ db: db, noPdf: true });
      eq('K13 no PDF asked (noPdf): none made', find(db.rows('Quotes'), 'QuoteNo', find(db.rows('AppQuotes'), 'AQID', 'k3').QuoteNo).AppPdf || '-', '-');
    });
    step('K panel', function () {
      eq('K14 panel code injected once, after QF2, before start', QF5_INJECTED_ + ' ' + (UI_HTML_.indexOf('QF5 quote PDF on save') > UI_HTML_.indexOf('QF2 banner') && UI_HTML_.indexOf('QF5 quote PDF on save') < UI_HTML_.lastIndexOf('// ================= start')), '1 true');
      var js = UI_HTML_.slice(UI_HTML_.indexOf('<script>') + 8, UI_HTML_.lastIndexOf('</script>'));
      eq('K15 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
      eq('K16 save + terms trigger the PDF; quote view shows the link; server action exists', /a==='saveQuoteFull'\|\|a==='saveTerms'/.test(UI_HTML_) && /uiDo\('quotePdf'/.test(UI_HTML_) && /saved automatically, Rev/.test(UI_HTML_) && typeof UI_ACTIONS_.quotePdf === 'function', true);
    });
  } finally { QF5_STUB_ = null; }
  return { pass: T.pass, fail: T.fail, log: T.log };
}

// ======================================================================= QF4 taxes on the quote + amount in words (15 Nov 2026)
// Each quote carries VAT % (as before), AT % and AIT % (new Quotes columns ATPct, AITPct at the END; default from
// Settings ATPct / AITPct = 0). Rule: each tax = rate × subtotal (selected lines), added to the total payable when > 0;
// advance % and amount in words follow the total payable [verify with accountant]. Shown in the panel (live, with the
// amount in words), on the quote view and on the quotation PDF (rows present at 0 %). Quotes.Total formula includes them,
// so PI advance and Jobs.ContractValue agree. NOT carried to hire / sale / milestone invoices (they stay subtotal + VAT).
var QF4_COLS_ = ['ATPct', 'AITPct'];
var QF4_NAME_ = { ATPct: 'AT', AITPct: 'AIT' };
function qf4Pct_(db, q, k) { return q && !blank(q[k]) ? num(q[k]) : num(S(db, k, 0)); }
var QF4_qt0_ = quoteTotals;
quoteTotals = function (db, quoteNo) {
  var t = QF4_qt0_(db, quoteNo), q = must(db, 'Quotes', 'QuoteNo', quoteNo);
  t.vatPct = num(q.VATPct); t.atPct = qf4Pct_(db, q, 'ATPct'); t.aitPct = qf4Pct_(db, q, 'AITPct');
  t.at = r2(t.subtotal * t.atPct); t.ait = r2(t.subtotal * t.aitPct);
  t.total = r2(t.subtotal + t.vat + t.at + t.ait); t.advance = r2(t.total * t.advancePct);
  return t;
};
// sheet formula: Total = Subtotal + VAT + AT + AIT (old formula while the columns are not there yet)
var QF4_T0_ = CALC.Quotes.Total, QF4_T1_ = QF4_T0_ + '+ROUND({Subtotal}*N({ATPct}),2)+ROUND({Subtotal}*N({AITPct}),2)';
CALC.Quotes.Total = QF4_T1_;
var QF4_rf0_ = resolveF;
resolveF = function (db, t, tpl, r) { if (tpl === QF4_T1_ && db.headers('Quotes').indexOf('AITPct') < 0) tpl = QF4_T0_; return QF4_rf0_(db, t, tpl, r); };
// set-up (by itself on the first quote save; safe to repeat; writes no Log row)
function upgradeQF4(db) {
  var done = [];
  QF4_COLS_.forEach(function (c) { if (db.ensureColumn('Quotes', c)) done.push('Quotes + ' + c); });
  [['ATPct', 'Advance tax (AT) % on quotes: default for new quotes, editable per quote [verify with accountant]'],
    ['AITPct', 'Advance income tax (AIT) % on quotes: default for new quotes, editable per quote [verify with accountant]']].forEach(function (r) {
    if (!find(db.rows('Settings'), 'Key', r[0])) { db.insert('Settings', { Key: r[0], Value: 0, Notes: r[1] }); done.push('Settings.' + r[0]); }
  });
  if (done.some(function (x) { return /^Quotes/.test(x); })) {
    db.rows('Quotes').forEach(function (q) { if (blank(q.QuoteNo)) return; var p = {}; QF4_COLS_.forEach(function (c) { if (blank(q[c])) p[c] = 0; }); if (Object.keys(p).length) db.update('Quotes', q, p); });
    if (db.ss) {
      var s = db.sheet('Quotes'), h = db.headers('Quotes'), n = Math.max(s.getMaxRows() - 1, 1);
      QF4_COLS_.forEach(function (c) { var g = s.getRange(2, h.indexOf(c) + 1, n, 1); g.clearDataValidations(); g.setNumberFormat('0.##%'); });
      db.fillFormulas('Quotes');
    }
  }
  return done;
}
// save: rates checked first (a refused save writes nothing), then the quote, then the rates on the row
var QF4_sqf0_ = UI_ACTIONS_.saveQuoteFull;
UI_ACTIONS_.saveQuoteFull = function (db, a) {
  var h = (a && a.header) || {}, p = {};
  QF4_COLS_.forEach(function (k) {
    if (!(k in h)) return;
    var v = uiPct_(h[k], S(db, k, 0));
    if (!(v >= 0 && v <= 1)) throw new Error(QF4_NAME_[k] + ' % must be 0 to 100');
    p[k] = Math.round(v * 1e6) / 1e6;
  });
  var r = QF4_sqf0_(db, a);
  if (!r || !r.ref) return r;
  var t0 = quoteTotals(db, r.ref);
  upgradeQF4(db);
  var q = find(db.rows('Quotes'), 'QuoteNo', r.ref);
  QF4_COLS_.forEach(function (k) { if (!(k in p) && blank(q[k])) p[k] = num(S(db, k, 0)); });
  if (Object.keys(p).length) uiPutRow_(db, 'Quotes', q, p);
  var t = quoteTotals(db, r.ref);
  if (typeof r.msg === 'string') {
    if (t0.total !== t.total) r.msg = r.msg.replace('Tk ' + tk(t0.total), 'Tk ' + tk(t.total));
    if (t0.advance !== t.advance) r.msg = r.msg.replace('Tk ' + tk(t0.advance), 'Tk ' + tk(t.advance));
  }
  r.totals = t;
  return r;
};
var QF4_init0_ = uiInitDb_;
uiInitDb_ = function (db) { var r = QF4_init0_(db); r.settings.ATPct = num(S(db, 'ATPct', 0)); r.settings.AITPct = num(S(db, 'AITPct', 0)); return r; };
// quotation PDF: Subtotal · VAT · Total incl. VAT · AT · AIT · Total payable, + the rule note
var QF4_NOTE_ = 'VAT, AT (advance tax) and AIT (advance income tax) are each charged at the rate shown on the subtotal and added to the total payable when above 0%. The advance and the amount in words are on the total payable [verify with accountant].';
var QF4_spec0_ = PDF_SPECS.Quote;
PDF_SPECS.Quote = function (db, quoteNo) {
  var sp = QF4_spec0_(db, quoteNo), t = quoteTotals(db, quoteNo), b = sp.blocks;
  var s = b.filter(function (x) { return x.t === 'sums'; })[0];
  if (s && s.rows.length >= 3) s.rows = [s.rows[0], s.rows[1], ['Total incl. VAT', tk(r2(t.subtotal + t.vat))], ['AT @ ' + pctTxt(t.atPct), tk(t.at)], ['AIT @ ' + pctTxt(t.aitPct), tk(t.ait)], ['Total payable (BDT)', tk(t.total), true]];
  var at = -1;
  b.forEach(function (x, i) {
    if (x.t !== 'p') return;
    if (typeof x.text === 'string' && /^Amount = Quantity/.test(x.text)) x.text = x.text.replace('Prices exclude VAT.', 'Prices exclude VAT, AT and AIT (added below).');
    var h = Array.isArray(x.text) && x.text[0] ? x.text[0][0] : '';
    if (h === 'Amount in words:  ' || (h === 'Advance with order:  ' && at >= 0)) at = i;
  });
  if (at >= 0) b.splice(at + 1, 0, { t: 'p', text: QF4_NOTE_, size: 8.5, italic: true, color: 'grey', after: 6 });
  return sp;
};
var QF4_pi0_ = PDF_SPECS.PI;
PDF_SPECS.PI = function (db, piNo) {
  var sp = QF4_pi0_(db, piNo), p = find(db.rows('Proformas'), 'PINo', piNo), t = p && p.QuoteNo && find(db.rows('Quotes'), 'QuoteNo', p.QuoteNo) ? quoteTotals(db, p.QuoteNo) : null;
  if (t && (t.at || t.ait)) sp.blocks.forEach(function (x) { if (x.t === 'p' && typeof x.text === 'string') x.text = x.text.replace(' including VAT.', ' including VAT' + (t.at ? ', AT' : '') + (t.ait ? ', AIT' : '') + '.'); });
  return sp;
};
// amount in words — self-contained copy of takaWords (same output; the panel runs this same code)
function qf4Words_(x) {
  var O = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var T = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function w99(n) { return n < 20 ? O[n] : T[Math.floor(n / 10)] + (n % 10 ? '-' + O[n % 10] : ''); }
  function w999(n) { var h = Math.floor(n / 100), r = n % 100; return (h ? O[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? w99(r) : ''); }
  function iw(n) {
    if (n === 0) return 'Zero';
    var p = [], c = Math.floor(n / 1e7); n %= 1e7; if (c) p.push((c >= 1000 ? iw(c) : w999(c)) + ' Crore');
    var l = Math.floor(n / 1e5); n %= 1e5; if (l) p.push(w99(l) + ' Lakh');
    var t = Math.floor(n / 1000); n %= 1000; if (t) p.push(w99(t) + ' Thousand');
    if (n) p.push(w999(n)); return p.join(' ');
  }
  var x0 = +x || 0, v = Math.round(Math.abs(x0) * 100 + 1e-7) / 100, t = Math.floor(v + 1e-9), ps = Math.round((v - t) * 100);
  return (x0 < 0 ? 'Minus ' : '') + 'Taka ' + iw(t) + (ps ? ' and Paisa ' + w99(ps) : '') + ' only';
}
function QF4_PANEL_() {
function qf4P(h,k){var v=h?h[k]:null;return v===''||v==null?(D.settings[k]||0):+v;}
function qf4Fields(F,h,upd){F.ATPct=inp(pct(qf4P(h,'ATPct')),'number');F.AITPct=inp(pct(qf4P(h,'AITPct')),'number');F.ATPct.oninput=upd;F.AITPct.oninput=upd;}
function qf4Tots(tots,sub,F){var p=function(e){return e?(+e.value||0):0;},rd=function(x){return Math.round(x)/100;};
  var vp=p(F.VATPct),ap=p(F.ATPct),ip=p(F.AITPct),dp=p(F.AdvancePct),vat=rd(sub*vp),at=rd(sub*ap),ait=rd(sub*ip),tot=Math.round((sub+vat+at+ait)*100)/100,adv=rd(tot*dp);
  var row=function(l,v,c){return el('div',{cls:'tot'+(c?' '+c:'')},l,el('span',{text:tk(v)}));};tots.innerHTML='';
  add(tots,[row('Subtotal',sub),row('VAT '+vp+'%',vat),row('AT '+ap+'%',at),row('AIT '+ip+'%',ait),row('Total',tot,'big'),row('Advance '+dp+'%',adv),
    el('p',{cls:'muted',style:'margin:4px 6px'},el('b',{text:'In words: '}),qf4Words_(tot)+'.')]);}
}
var QF4_HTML_ = '\n// ================= QF4 taxes + amount in words\n' + qf4Words_.toString() + '\n' + qfPanelSrc_(QF4_PANEL_) + '\n';
var QF4_INJECTED_ = 0;
if (typeof UI_HTML_ === 'string') (function () {
  var rep = function (a, b) { if (UI_HTML_.indexOf(a) < 0) return; UI_HTML_ = UI_HTML_.replace(a, function () { return b; }); QF4_INJECTED_++; };
  rep('F.VATPct.oninput=upd;F.AdvancePct.oninput=upd;', 'F.VATPct.oninput=upd;F.AdvancePct.oninput=upd;qf4Fields(F,h,upd);');
  rep("fld('Advance %',F.AdvancePct),fld('VAT %',F.VATPct))", "fld('Advance %',F.AdvancePct),fld('VAT %',F.VATPct),fld('AT %',F.ATPct),fld('AIT %',F.AITPct))");
  var a = UI_HTML_.indexOf('var vat=Math.round(sub*(+F.VATPct.value||0))/100'), z = a < 0 ? -1 : UI_HTML_.indexOf("el('span',{text:tk(adv)}))]);}", a);
  if (a >= 0 && z > a) { UI_HTML_ = UI_HTML_.slice(0, a) + 'qf4Tots(tots,sub,F);}' + UI_HTML_.slice(z + "el('span',{text:tk(adv)}))]);}".length); QF4_INJECTED_++; }
  rep("hv.VATPct=hv.VATPct+'%';hv.AdvancePct=hv.AdvancePct+'%';", "hv.VATPct=hv.VATPct+'%';hv.AdvancePct=hv.AdvancePct+'%';hv.ATPct=hv.ATPct+'%';hv.AITPct=hv.AITPct+'%';");
  rep("el('span',{text:'Tk '+tk(t.total)+' (VAT '+pct(h.VATPct)+'%)'})", "el('span',{text:'Tk '+tk(t.total)+' (VAT '+pct(h.VATPct)+'% · AT '+pct(t.atPct)+'% · AIT '+pct(t.aitPct)+'%)'}),el('span',{text:'In words'}),el('span',{text:qf4Words_(t.total)})");
  rep('// ================= start', QF4_HTML_ + '\n// ================= start');
})();

if (typeof selfTestAllParts_ === 'function') {
  var QF4_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return QF4_parts0_().concat([['QF4', selfTestQF4()]]); };
}
function selfTestQF4() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws, db = testSeed_('Full period');
  var run = function (x, a) { return uiDoDb_(db, x, a); };
  var H = function (o) { return Object.assign({ QuoteType: 'Rental', QuoteDate: '2026-11-20', VATPct: '15%', AdvancePct: '50%' }, o || {}); };
  var LN = [{ ItemCode: 'RL-STD-20', Qty: 10, Months: 1, Rate: 90 }];
  var save = function (no, h) { return run('saveQuoteFull', { quoteNo: no || '', header: h, lines: LN, customer: { mode: 'existing', id: 'CUST-0001' }, site: { mode: 'none' } }); };
  var sums = function (no) { return PDF_SPECS.Quote(db, no).blocks.filter(function (b) { return b.t === 'sums'; })[0].rows; };
  var txt = function (no) { return JSON.stringify(PDF_SPECS.Quote(db, no).blocks); };
  step('Q words', function () {
    var v = [0, 5, 19.5, 100, 999.99, 174000, 190865.5, 1062, 45885, 123456789, 12345678901.07, -2500.25, '1,74,000'];
    eq('Q1 panel words = PDF words (13 amounts)', v.filter(function (x) { return qf4Words_(num(x)) !== takaWords(x); }).join(' ') || 'same', 'same');
    eq('Q2 example', qf4Words_(1062), 'Taka One Thousand Sixty-Two only');
  });
  step('Q totals at 15/0/0 unchanged', function () {
    testQuote_(db, 'CAE/Q/2026/050', 'Rental', [['RL-STD-20', 'Ringlock standard 2.0 m', 'pc', 50, 2, 100], ['SV-TRANS', 'Transport', 'trip', 1, '', 5000]]);
    var t = quoteTotals(db, 'CAE/Q/2026/050');
    eq('Q3 old quote, no columns: 15000 × 1.15, advance 50%', [t.total, t.advance, t.at, t.ait].join(' '), '17250 8625 0 0');
    eq('Q4 formula falls back while the columns are missing', resolveF(db, 'Quotes', CALC.Quotes.Total, 2).indexOf('N(') < 0, true);
    var s = sums('CAE/Q/2026/050');
    eq('Q5 PDF rows at 0 %', s.map(function (r) { return r[0] + '=' + r[1]; }).join(' | '), 'Subtotal=15,000.00 | VAT @ 15%=2,250.00 | Total incl. VAT=17,250.00 | AT @ 0%=0.00 | AIT @ 0%=0.00 | Total payable (BDT)=17,250.00');
    eq('Q6 rule note + words on the total', /added to the total payable when above 0%/.test(txt('CAE/Q/2026/050')) && /Taka Seventeen Thousand Two Hundred Fifty only/.test(txt('CAE/Q/2026/050')), true);
  });
  step('Q save with AIT 3 %', function () {
    var c0 = db.headers('Quotes').length + ' ' + db.rows('Quotes').length;
    throws('Q7 AIT 120 % refused', function () { save('', H({ ATPct: '0%', AITPct: '120%' })); }, /AIT % must be 0 to 100/);
    throws('Q8 negative AT refused', function () { save('', H({ ATPct: '-1%', AITPct: '0%' })); }, /AT % must be 0 to 100/);
    eq('Q9 refused saves write nothing', db.headers('Quotes').length + ' ' + db.rows('Quotes').length, c0);
    var r = save('', H({ ATPct: '0%', AITPct: '3%' })), q = must(db, 'Quotes', 'QuoteNo', r.ref);
    eq('Q10 columns at the END + Settings keys', db.headers('Quotes').slice(-2).join() + ' ' + S(db, 'ATPct', 'x') + ' ' + S(db, 'AITPct', 'x'), 'ATPct,AITPct 0 0');
    eq('Q11 old quote set to 0 explicitly', must(db, 'Quotes', 'QuoteNo', 'CAE/Q/2026/050').AITPct, 0);
    eq('Q12 rates on the row', q.ATPct + ' ' + q.AITPct, '0 0.03');
    var t = r.totals;
    eq('Q13 900 + VAT 135 + AT 0 + AIT 27 = 1062; advance 531', [t.subtotal, t.vat, t.at, t.ait, t.total, t.advance].join(' '), '900 135 0 27 1062 531');
    eq('Q14 save message shows the new total', /Tk 1,062\.00/.test(r.msg) && r.msg.indexOf('1,035.00') < 0, true);
    var s = sums(r.ref);
    eq('Q15 PDF: AIT line + total', [s[3][0], s[4][0], s[4][1], s[5][1]].join(' | '), 'AT @ 0% | AIT @ 3% | 27.00 | 1,062.00');
    eq('Q16 PDF words + advance on the grand total', /Taka One Thousand Sixty-Two only/.test(txt(r.ref)) && /= Tk 531\.00/.test(txt(r.ref)), true);
    eq('Q17 sheet formula includes AT + AIT', /ROUND\(\w+\d+\*N\(\w+\d+\),2\)\+ROUND/.test(resolveF(db, 'Quotes', CALC.Quotes.Total, 5)), true);
    r = save(r.ref, H({ QuoteType: 'Rental' }));
    eq('Q18 save without AT/AIT keys (app) keeps the rates', must(db, 'Quotes', 'QuoteNo', r.ref).AITPct + ' ' + r.totals.total, '0.03 1062');
    var r2_ = save('', H());
    eq('Q19 new quote without keys = Settings defaults', must(db, 'Quotes', 'QuoteNo', r2_.ref).ATPct + ' ' + r2_.totals.total, '0 1035');
    var pi = quoteToPI(db, r.ref, { date: '2026-11-21' });
    eq('Q20 PI = advance on the grand total; PDF says AIT', must(db, 'Proformas', 'PINo', pi).Amount + ' ' + /including VAT, AIT\./.test(JSON.stringify(PDF_SPECS.PI(db, pi).blocks)), '531 true');
    eq('Q21 panel defaults carry AT / AIT', JSON.stringify([uiInitDb_(db).settings.ATPct, uiInitDb_(db).settings.AITPct]), '[0,0]');
  });
  step('Q panel', function () {
    eq('Q22 panel injected (6 places)', QF4_INJECTED_, 6);
    var js = UI_HTML_.slice(UI_HTML_.indexOf('<script>') + 8, UI_HTML_.lastIndexOf('</script>'));
    eq('Q23 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
    eq('Q24 live totals + words + save + view', [/qf4Tots\(tots,sub,F\);\}/.test(js), /hv\.AITPct=hv\.AITPct\+'%'/.test(js), /fld\('AIT %',F\.AITPct\)/.test(js), /% · AIT '\+pct\(t\.aitPct\)/.test(js), js.indexOf('Math.round(sub*(+F.VATPct.value||0))') < 0].map(Number).join(''), '11111');
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}

// ======================================================================= QF3 email the quote to the client (15 Nov 2026)
var CAE_QF3_VERSION = 'QF3 · 15 Nov 2026';
var QF3_ALIAS_ = 'info@coreaccesseng.com';
var QF3_RE_ = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
var QF3_STUB_ = null; // self-test only: { mail: { like QF3_MAIL_ }, now() }
var QF3_MAIL_ = {
  aliases: function () { return GmailApp.getAliases(); },
  me: function () { return Session.getEffectiveUser().getEmail(); },
  user: function () { return Session.getActiveUser().getEmail(); },
  name: function (url) { return QF5_DRIVE_.name(url); },
  blob: function (url) { var f = DriveApp.getFileById(qf5Id_(url)); if (f.isTrashed()) throw new Error('the PDF is in the bin'); return f.getBlob(); },
  send: function (to, subject, body, opts) { GmailApp.sendEmail(to, subject, body, opts); },
};
function qf3Mail_() { return (QF3_STUB_ && QF3_STUB_.mail) || QF3_MAIL_; }
function qf3List_(s) { return String(s == null ? '' : s).split(/[,;\s]+/).filter(function (x) { return x; }); }
function qf3From_(m, p) {
  var a = [], me = '', rt = p ? p.email : QF3_ALIAS_;
  try { a = (m.aliases() || []).map(function (x) { return String(x).toLowerCase(); }); } catch (e) { a = []; }
  if (p && a.indexOf(p.email) >= 0) return { from: p.email, label: p.email };
  if (a.indexOf(QF3_ALIAS_) >= 0) return p ? { from: QF3_ALIAS_, replyTo: rt, label: QF3_ALIAS_ + ' (replies go to ' + rt + ')' } : { from: QF3_ALIAS_, label: QF3_ALIAS_ };
  try { me = m.me(); } catch (e) { me = ''; }
  return { from: '', replyTo: rt, label: (me || 'the script account') + ' (replies go to ' + rt + ')' };
}
// QF3b signers: active Staff rows with a WorkEmail (none until upgradeQF3 adds the column)
function qf3Signers_(db) {
  if (db.headers('Staff').indexOf('WorkEmail') < 0) return [];
  return db.rows('Staff').filter(function (s) { return s.Status !== 'Inactive' && QF3_RE_.test(qfStr_(s.WorkEmail)); }).map(function (s) {
    return { id: qfStr_(s.StaffID), name: qfStr_(s.Name).replace(/\s*\([^)]*\)\s*$/, ''), title: qfStr_(s.Role), phone: qfStr_(s.Phone), email: qfStr_(s.WorkEmail).toLowerCase() };
  });
}
function qf3DefSigner_(db, q, m) {
  var all = qf3Signers_(db), by = function (id) { return all.filter(function (s) { return s.id === id; })[0]; }, u = '';
  if (!blank(q.PreparedBy) && by(qfStr_(q.PreparedBy))) return qfStr_(q.PreparedBy);
  try { u = String(m.user() || '').trim().toLowerCase(); } catch (e) { u = ''; }
  var st = u && db.rows('Staff').filter(function (x) { return String(x.Email || '').trim().toLowerCase() === u; })[0];
  return st && by(qfStr_(st.StaffID)) ? qfStr_(st.StaffID) : 'CO';
}
function qf3Stamp_(d) { return d instanceof Date && !isNaN(d.getTime()) ? fmtDay(dayNum(d)) + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : ''; }
function qf3Sig_(db, p) {
  var co = co_(db), web = String(co.CoWeb || '').replace(/^https?:\/\//, '').replace(/\/$/, ''), reg = S(db, 'RegNo', ''), tl = S(db, 'TradeLicenceNo', '');
  var ph = p ? p.phone : co.CoPhone, ml = p ? p.email : QF3_ALIAS_, of = String(S(db, 'OfficeAddress', '')).trim(), yd = String(S(db, 'YardAddress', '')).trim();
  return (p ? [p.name, p.title] : []).concat([co.name, 'Safety by design, not by chance', (blank(ph) ? '' : 'Tel/WhatsApp ' + ph + ' · ') + ml, web, blank(of) ? '' : (blank(yd) ? '' : 'Office: ') + of, blank(yd) ? '' : 'Yard: ' + yd,
    [blank(reg) ? '' : 'Reg. No. ' + reg, blank(tl) ? '' : 'Trade Licence ' + tl].filter(function (x) { return x; }).join(' · ')]).filter(function (x) { return !blank(x); }).join('\n');
}
// the email as proposed (panel: Email to client) — nothing is written
function qf3Draft_(db, no) {
  var q = must(db, 'Quotes', 'QuoteNo', no), c = find(db.rows('Customers'), 'CustID', q.CustID) || {}, s = blank(q.SiteID) ? null : find(db.rows('Sites'), 'SiteID', q.SiteID);
  var t = quoteTotals(db, no), rev = num(q.Rev), ref = no + (rev ? ' Rev ' + rev : ''), proj = s && !blank(s.Project) ? qfStr_(s.Project) : qfStr_(q.Subject);
  var who = qfStr_(q.Attention) || qfStr_(c.ContactPerson), m = qf3Mail_(), url = qfStr_(q.PDF), nm = '';
  var ps = qf3Signers_(db), def = qf3DefSigner_(db, q, m), sigs = { CO: qf3Sig_(db) }, froms = { CO: qf3From_(m).label };
  ps.forEach(function (p) { sigs[p.id] = qf3Sig_(db, p); froms[p.id] = qf3From_(m, p).label; });
  if (url) { try { nm = m.name(url); } catch (e) { nm = ''; } }
  var tax = 'VAT ' + pctTxt(t.vatPct) + (t.at ? ', AT ' + pctTxt(t.atPct) : '') + (t.ait ? ', AIT ' + pctTxt(t.aitPct) : '');
  return {
    quoteNo: no, status: q.Status, to: qf3List_(c.Email).join(', '), cc: '', subject: 'Quotation ' + ref + (proj ? ' — ' + proj : ''),
    body: 'Dear ' + (who || 'Sir / Madam') + ',\n\nPlease find attached our quotation ' + ref + (proj ? ' for ' + proj : '') + '.\nTotal payable: Tk ' + tk(t.total) + ' (including ' + tax + ').\n\n' +
      'The quotation is valid for ' + num(S(db, 'QuoteValidityDays', 30)) + ' days. Please let us know if you have any questions.\n\nBest regards,',
    signers: [{ id: 'CO', label: 'Company (' + QF3_ALIAS_ + ')' }].concat(ps.map(function (p) { return { id: p.id, label: p.name + (p.title ? ' — ' + p.title : '') + ' (' + p.email + ')' }; })),
    signAs: def, sigs: sigs, froms: froms, signature: sigs[def], from: froms[def], attach: nm || 'Quotation PDF — made first (none saved yet)', sentAt: qf3Stamp_(q.SentAt),
  };
}
function uiQuoteEmail(no) { return uiRun_(function (db) { return qf3Draft_(db, no); }, true); }
// set-up: Quotes.SentAt at the END (inherited validation cleared); safe to repeat
function upgradeQF3(db) {
  var out = [];
  if (db.ensureColumn('Quotes', 'SentAt')) {
    out.push('Quotes + SentAt');
    if (db.ss) {
      var s = db.sheet('Quotes'), j = db.headers('Quotes').indexOf('SentAt') + 1;
      s.getRange(1, j, s.getMaxRows(), 1).clearDataValidations();
      s.getRange(2, j, Math.max(s.getMaxRows() - 1, 1), 1).setNumberFormat('dd-mmm-yyyy hh:mm');
    }
  }
  if (db.ensureColumn('Staff', 'WorkEmail')) {
    out.push('Staff + WorkEmail');
    if (db.ss) { var t = db.sheet('Staff'), k = db.headers('Staff').indexOf('WorkEmail') + 1; t.getRange(1, k, t.getMaxRows(), 1).clearDataValidations(); }
  }
  return out;
}
function upgradeQF3Live() { var db = new SheetDb(), d = upgradeQF3(db); SpreadsheetApp.flush(); Logger.log(d.length ? 'Done: ' + d.join('; ') + ' — now regenerate the Quotes / Staff tables in AppSheet' : 'Already up to date.'); }
// send: everything checked first (a refused send writes nothing), PDF made if missing, then Gmail, then Status / SentAt / Log
UI_ACTIONS_.emailQuote = function (db, a) {
  a = a || {};
  var no = a.quoteNo, q = must(db, 'Quotes', 'QuoteNo', no), m = qf3Mail_(), to = qf3List_(a.to), cc = qf3List_(a.cc);
  var subj = qfStr_(a.subject), body = String(a.body == null ? '' : a.body).replace(/\s+$/, ''), stop = ' — nothing was sent';
  if (['Lost', 'Cancelled'].indexOf(q.Status) >= 0) throw new Error(no + ' is ' + q.Status + stop);
  var sid = blank(a.signAs) ? qf3DefSigner_(db, q, m) : qfStr_(a.signAs), sg = sid === 'CO' ? null : qf3Signers_(db).filter(function (x) { return x.id === sid; })[0];
  if (sid !== 'CO' && !sg) throw new Error('Signed by ' + sid + ': not an active Staff row with a WorkEmail' + stop);
  if (!to.length) throw new Error('Type the client email (To)' + stop);
  var bad = to.concat(cc).filter(function (e) { return !QF3_RE_.test(e); });
  if (bad.length) throw new Error('Not an email address: ' + bad.join(', ') + stop);
  if (to.length + cc.length > 20) throw new Error('At most 20 recipients' + stop);
  if (!subj) throw new Error('Subject is needed' + stop);
  if (!body.trim()) throw new Error('The message is empty' + stop);
  var url = qfStr_(q.PDF), blob = null, made = '';
  if (url) { try { blob = m.blob(url); } catch (e) { blob = null; } }
  if (!blob) { var p = qf5Pdf_(db, no); url = p.url; made = p.file; blob = m.blob(url); }
  var fr = qf3From_(m, sg), opts = { attachments: [blob], name: sg ? sg.name + ' · ' + co_(db).name : co_(db).name };
  if (cc.length) opts.cc = cc.join(',');
  if (fr.from) opts.from = fr.from;
  if (fr.replyTo) opts.replyTo = fr.replyTo;
  upgradeQF3(db);
  try { m.send(to.join(','), subj, body + '\n\n' + qf3Sig_(db, sg), opts); }
  catch (e) { throw new Error('Gmail did not send it: ' + e.message + stop + (made ? ' (the PDF was made: ' + made + ')' : '')); }
  var q2 = must(db, 'Quotes', 'QuoteNo', no), st = q2.Status, p2 = { SentAt: QF3_STUB_ && QF3_STUB_.now ? QF3_STUB_.now() : new Date() };
  if (blank(st) || st === 'Draft') p2.Status = 'Sent';
  uiPutRow_(db, 'Quotes', q2, p2);
  var fn = ''; try { fn = blob.getName(); } catch (e) { fn = made || 'the PDF'; }
  log_(db, 'Quote emailed', no, ('To ' + to.join(', ') + (cc.length ? ' · Cc ' + cc.join(', ') : '') + ' · ' + fn + (p2.Status ? ' · Draft → Sent' : '') + (sg ? ' · signed ' + sg.name : '')).slice(0, 480));
  return { msg: no + ' emailed to ' + to.join(', ') + (cc.length ? ' (cc ' + cc.join(', ') + ')' : '') + ' with ' + fn + (made ? ' (PDF made first)' : '') + '.' + (p2.Status ? ' Status → Sent.' : ''),
    ref: no, links: [{ label: 'Open PDF', url: url }] };
};

function QF3_PANEL_() {
function qf3Pre(t){return el('pre',{style:'white-space:pre-wrap;font:inherit;margin:2px 0;padding:6px;border:1px solid var(--line);border-radius:3px;background:#fff',text:t});}
function qf3Form(box,no,d,v){box.innerHTML='';v=v||d;
  var F={to:inp(v.to,'text','client@company.com, …'),cc:inp(v.cc,'text','optional'),subject:inp(v.subject),body:el('textarea',{value:v.body,style:'min-height:130px'}),
    signAs:sel((d.signers||[]).map(function(s){return [s.id,s.label];}),v.signAs||d.signAs)},sp=qf3Pre(d.sigs[F.signAs.value]||d.signature);
  F.signAs.onchange=function(){sp.textContent=d.sigs[F.signAs.value]||d.signature;};
  add(box,[el('div',{cls:'top'},el('span',{text:'EMAIL TO CLIENT'}),btn('×',function(){box.remove();},'d x')),d.sentAt?el('p',{cls:'muted',text:'Last emailed '+d.sentAt+'.'}):null,
    el('div',{cls:'g'},fld('To (comma list)',F.to,1),fld('Cc',F.cc,1),fld('Subject',F.subject,1),fld('Message',F.body,1),fld('Signed by',F.signAs,1)),
    el('label',{text:'Signature (added under the message)'}),sp,el('p',{cls:'muted',text:'Attachment: '+d.attach}),
    btn('Review email',function(){var x=vals(F);if(!x.to.trim()){say('Type the client email (To) first.','err');return;}qf3Review(box,no,d,x);},'x')]);}
function qf3Review(box,no,d,x){box.innerHTML='';
  var kv=el('div',{cls:'kv'},el('span',{text:'From'}),el('span',{text:d.froms[x.signAs]||d.from}),el('span',{text:'To'}),el('span',{text:x.to}),el('span',{text:'Cc'}),el('span',{text:x.cc||'—'}),
    el('span',{text:'Subject'}),el('span',{text:x.subject}),el('span',{text:'Attachment'}),el('span',{text:d.attach}));
  add(box,[el('div',{cls:'top'},el('span',{text:'CHECK — THIS IS EXACTLY WHAT GOES OUT'})),kv,qf3Pre(x.body.replace(/\s+$/,'')+'\n\n'+(d.sigs[x.signAs]||d.signature)),
    btn('Send now',function(){act('emailQuote',{quoteNo:no,to:x.to,cc:x.cc,subject:x.subject,body:x.body,signAs:x.signAs}).then(function(){go('quotes',no,true);}).catch(function(){});}),
    btn('Back',function(){qf3Form(box,no,d,x);},'s')]);}
function qf3Open(slot,no){slot.innerHTML='';add(slot,el('div',{cls:'card'},'Loading the email…'));
  call('uiQuoteEmail',no).then(function(d){var c=el('div',{cls:'card'});slot.innerHTML='';add(slot,c);qf3Form(c,no,d);},function(e){slot.innerHTML='';fail(e);});}
var qf3QV0_=quoteView;quoteView=function(r){var o=qf3QV0_.apply(this,arguments),h=r&&r.header;
  if(!h||h.Status==='Lost'||h.Status==='Cancelled')return o;
  var slot=el('div'),b=btn('Email to client',function(){qf3Open(slot,h.QuoteNo);},'x');
  var pb=[].filter.call(o.querySelectorAll('button'),function(x){return x.textContent==='Quotation PDF';})[0];
  if(pb){pb.parentNode.appendChild(b);pb.parentNode.parentNode.insertBefore(slot,pb.parentNode.nextSibling);}else add(o,[b,slot]);
  if(h.SentAt)slot.parentNode.insertBefore(el('p',{cls:'muted',text:'Emailed to the client '+fd(h.SentAt)+'.'}),slot);
  return o;};
}
var QF3_HTML_ = '\n// ================= QF3 email the quote\n' + qfPanelSrc_(QF3_PANEL_) + '\n';
var QF3_INJECTED_ = 0;
if (typeof UI_HTML_ === 'string' && UI_HTML_.indexOf('// ================= start') >= 0) {
  UI_HTML_ = UI_HTML_.replace('// ================= start', function () { return QF3_HTML_ + '\n// ================= start'; }); QF3_INJECTED_++;
}

if (typeof selfTestAllParts_ === 'function') {
  var QF3_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return QF3_parts0_().concat([['QF3', selfTestQF3()]]); };
}
function selfTestQF3() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws, db = testSeed_('Full period');
  var sent = [], made = 0, aliases = [], boom = false, who = '', clock = new Date(2026, 10, 20, 9, 5);
  var mail = {
    aliases: function () { return aliases; }, me: function () { return 'ops@test'; }, user: function () { return who; },
    name: function (u) { return /^https:\/\/x\/\d+$/.test(u) ? 'PDF ' + u.slice(10) + '.pdf' : ''; },
    blob: function (u) { if (!/^https:\/\/x\/\d+$/.test(u)) throw new Error('gone'); return { url: u, getName: function () { return 'PDF ' + u.slice(10) + '.pdf'; } }; },
    send: function (to, s, b, o) { if (boom) throw new Error('Service invoked too many times'); sent.push({ to: to, s: s, b: b, o: o }); },
  };
  var pdf = { make: function (d, w, n) { var u = 'https://x/' + (++made); d.update('Quotes', must(d, 'Quotes', 'QuoteNo', n), { PDF: u }); return { url: u, file: 'PDF ' + made + '.pdf', placeholders: 0 }; },
    drive: { name: function () { return ''; }, trash: function () {} } };
  var run = function (x, a) { return uiDoDb_(db, x, a); };
  var LN = [{ ItemCode: 'RL-STD-20', Qty: 10, Months: 1, Billing: 'Monthly', Rate: 90 }];
  var Q = function (no) { return must(db, 'Quotes', 'QuoteNo', no); };
  var save = function () {
    var no = run('saveQuoteFull', { quoteNo: '', header: { QuoteType: 'Rental', QuoteDate: '2026-11-20', VATPct: '15%', AdvancePct: '50%' }, lines: LN, customer: { mode: 'existing', id: 'CUST-0001' }, site: { mode: 'existing', id: 'SITE-0001' } }).ref;
    db.update('Quotes', Q(no), { Attention: 'Mr. Rahman' }); return no;
  };
  var A = function (no, o) { return Object.assign({ quoteNo: no, to: 'buyer@client.com', cc: '', subject: 'Quotation ' + no, body: 'Dear Sir,\n\nPlease find attached.\n\nBest regards,' }, o || {}); };
  db.ensureColumn('Quotes', 'PDF');
  db.update('Customers', must(db, 'Customers', 'CustID', 'CUST-0001'), { Email: 'buyer@client.com; boss@client.com' });
  QF3_STUB_ = { mail: mail, now: function () { return clock; } }; QF5_STUB_ = pdf;
  try {
    var q1 = save(), proj = qfStr_(must(db, 'Sites', 'SiteID', 'SITE-0001').Project);
    step('E draft', function () {
      var d = qf3Draft_(db, q1);
      eq('E1 To from the customer, Cc blank', d.to + ' | ' + d.cc, 'buyer@client.com, boss@client.com | ');
      eq('E2 subject = Quotation no — project', d.subject, 'Quotation ' + q1 + (proj ? ' — ' + proj : ''));
      eq('E3 body: Dear attention, quote no, total payable incl. VAT', /^Dear Mr\. Rahman,\n\nPlease find attached our quotation CAE\/Q\/2026\/001/.test(d.body) && /Total payable: Tk 1,035\.00 \(including VAT 15%\)/.test(d.body), true);
      eq('E4 signature: company + info@', /^Core Access Engineering Ltd\.\nSafety by design, not by chance\n/.test(d.signature) && d.signature.indexOf('info@coreaccesseng.com') > 0, true);
      eq('E5 no alias → script account + reply-to info@', d.from, 'ops@test (replies go to info@coreaccesseng.com)');
      eq('E6 no PDF yet → made first', /made first/.test(d.attach) + ' ' + d.sentAt, 'true ');
      aliases = ['Info@CoreAccessEng.com'];
      eq('E7 alias exists → from info@', qf3Draft_(db, q1).from, 'info@coreaccesseng.com');
      aliases = [];
      eq('E29 no WorkEmail column → only Company, signed as Company', d.signers.length + ' ' + d.signAs + ' ' + (d.sigs.CO === d.signature), '1 CO true');
    });
    step('E refused: nothing sent, nothing written', function () {
      throws('E8 no To', function () { run('emailQuote', A(q1, { to: ' , ' })); }, /Type the client email \(To\) — nothing was sent/);
      throws('E9 bad address', function () { run('emailQuote', A(q1, { cc: 'boss@client' })); }, /Not an email address: boss@client — nothing was sent/);
      throws('E10 empty subject', function () { run('emailQuote', A(q1, { subject: ' ' })); }, /Subject is needed/);
      throws('E11 empty message', function () { run('emailQuote', A(q1, { body: ' \n ' })); }, /message is empty/);
      boom = true;
      throws('E12 Gmail error shown', function () { run('emailQuote', A(q1)); }, /Gmail did not send it: Service invoked too many times — nothing was sent \(the PDF was made: PDF 1\.pdf\)/);
      boom = false;
      var lg = db.rows('Log').filter(function (l) { return JSON.stringify(l).indexOf('Quote emailed') >= 0; }).length;
      eq('E13 nothing sent; status, SentAt, Log unchanged', sent.length + ' ' + Q(q1).Status + ' ' + (Q(q1).SentAt || '-') + ' ' + lg, '0 Draft - 0');
    });
    step('E send', function () {
      var r = run('emailQuote', A(q1, { to: 'buyer@client.com, boss@client.com', cc: 'jamal@test.com' })), m = sent[0], q = Q(q1);
      eq('E14 one email: to list, cc, reply-to, sender name', [sent.length, m.to, m.o.cc, m.o.replyTo, m.o.from || '-', m.o.name].join(' | '), '1 | buyer@client.com,boss@client.com | jamal@test.com | info@coreaccesseng.com | - | Core Access Engineering Ltd.');
      eq('E15 attachment = the saved PDF (not made again)', m.o.attachments.length + ' ' + m.o.attachments[0].url + ' ' + made, '1 https://x/1 1');
      eq('E16 body = message + signature', m.b, A(q1).body + '\n\n' + qf3Sig_(db));
      eq('E17 Draft → Sent + SentAt (column at the END)', q.Status + ' ' + qf3Stamp_(q.SentAt) + ' ' + db.headers('Quotes').slice(-1)[0], 'Sent 20-Nov-2026 09:05 SentAt');
      eq('E18 reply message + PDF link', /^CAE\/Q\/2026\/001 emailed to buyer@client\.com, boss@client\.com \(cc jamal@test\.com\) with PDF 1\.pdf\. Status → Sent\.$/.test(r.msg) + ' ' + r.links[0].url, 'true https://x/1');
      var lg = db.rows('Log').filter(function (l) { return JSON.stringify(l).indexOf('Quote emailed') >= 0; });
      eq('E19 Log row', lg.length + ' ' + /To buyer@client\.com, boss@client\.com · Cc jamal@test\.com · PDF 1\.pdf · Draft → Sent/.test(JSON.stringify(lg[0])), '1 true');
      eq('E20 set-up second run: nothing', upgradeQF3(db).length, 0);
      clock = new Date(2026, 10, 21, 14, 30); aliases = ['info@coreaccesseng.com'];
      run('emailQuote', A(q1));
      eq('E21 sent again: stays Sent, new time, from the alias', Q(q1).Status + ' ' + qf3Stamp_(Q(q1).SentAt) + ' ' + sent[1].o.from + ' ' + (sent[1].o.replyTo || '-'), 'Sent 21-Nov-2026 14:30 info@coreaccesseng.com -');
      aliases = [];
      eq('E22 draft shows when it was last emailed', qf3Draft_(db, q1).sentAt, '21-Nov-2026 14:30');
      db.update('Quotes', Q(q1), { PDF: 'https://gone' });
      run('emailQuote', A(q1));
      eq('E23 PDF missing in Drive → made first, then sent', made + ' ' + sent[2].o.attachments[0].url, '2 https://x/2');
      var q2 = save(); db.update('Quotes', Q(q2), { Status: 'Accepted' }); run('emailQuote', A(q2));
      eq('E24 Accepted stays Accepted', Q(q2).Status + ' ' + sent.length, 'Accepted 4');
      var q3 = save(); run('setStatus', { type: 'Quote', no: q3, status: 'Lost' });
      throws('E25 Lost quote refused', function () { run('emailQuote', A(q3)); }, /is Lost — nothing was sent/);
    });
    step('E signatures (QF3b)', function () {
      eq('E30 Staff + WorkEmail at the END', db.headers('Staff').slice(-1)[0] + ' ' + upgradeQF3(db).length, 'WorkEmail 0');
      db.insert('Staff', [{ StaffID: 'STF-J', Name: 'Jamal Uddin (admin)', Role: 'Contracts & Technical Director', Phone: '+880 1805-834812', Email: 'Jamal.Login@Test', WorkEmail: 'Jamal@CoreAccessEng.com', AppRole: 'Admin', Status: 'Active' },
        { StaffID: 'STF-M', Name: 'Md. Mohosin Miah', Role: 'Managing Director', Phone: '+880 1805-834810', Email: 'director1@test', WorkEmail: 'mohosin@coreaccesseng.com', AppRole: 'Admin', Status: 'Active' },
        { StaffID: 'STF-X', Name: 'Old', Email: 'old@test', WorkEmail: 'old@coreaccesseng.com', Status: 'Inactive' }, { StaffID: 'STF-Z', Name: 'No mail', Email: 'z@test', Status: 'Active' }]);
      var q4 = save(), d = qf3Draft_(db, q4);
      eq('E31 signers: Company + active staff with a WorkEmail, "(admin)" dropped', d.signers.map(function (s) { return s.id; }).join(',') + ' | ' + d.signers[1].label, 'CO,STF-J,STF-M | Jamal Uddin — Contracts & Technical Director (jamal@coreaccesseng.com)');
      eq('E32 default: unknown user → Company', d.signAs, 'CO');
      who = 'jamal.login@test'; eq('E33 default: signed-in user → their Staff row', qf3Draft_(db, q4).signAs, 'STF-J');
      db.update('Quotes', Q(q4), { PreparedBy: 'STF-M' }); eq('E34 default: PreparedBy wins', qf3Draft_(db, q4).signAs, 'STF-M');
      d = qf3Draft_(db, q4);
      eq('E35 personal signature', d.sigs['STF-J'].split('\n').slice(0, 5).join('|'), 'Jamal Uddin|Contracts & Technical Director|Core Access Engineering Ltd.|Safety by design, not by chance|Tel/WhatsApp +880 1805-834812 · jamal@coreaccesseng.com');
      eq('E36 company signature unchanged + from labels', (d.sigs.CO === qf3Sig_(db)) + ' | ' + d.froms['STF-J'], 'true | ops@test (replies go to jamal@coreaccesseng.com)');
      var n0 = sent.length; run('emailQuote', A(q4, { signAs: 'STF-J' })); var m = sent[n0];
      eq('E37 signed by Jamal, no alias: reply-to jamal@, sender name, body', [m.o.from || '-', m.o.replyTo, m.o.name, m.b === A(q4).body + '\n\n' + d.sigs['STF-J']].join(' | '), '- | jamal@coreaccesseng.com | Jamal Uddin · Core Access Engineering Ltd. | true');
      var lg = db.rows('Log').filter(function (l) { return JSON.stringify(l).indexOf('signed Jamal Uddin') >= 0; }).length;
      aliases = ['info@coreaccesseng.com']; run('emailQuote', A(q4, { signAs: 'STF-J' }));
      aliases = ['info@coreaccesseng.com', 'jamal@coreaccesseng.com']; run('emailQuote', A(q4, { signAs: 'STF-J' }));
      aliases = []; run('emailQuote', A(q4));
      eq('E38 Log + from info@ (reply jamal@) + from jamal@ alias + default PreparedBy', [lg, sent[n0 + 1].o.from + ' ' + sent[n0 + 1].o.replyTo, sent[n0 + 2].o.from + ' ' + (sent[n0 + 2].o.replyTo || '-'), sent[n0 + 3].o.replyTo].join(' | '),
        '1 | info@coreaccesseng.com jamal@coreaccesseng.com | jamal@coreaccesseng.com - | mohosin@coreaccesseng.com');
      throws('E39 inactive / unknown signer refused', function () { run('emailQuote', A(q4, { signAs: 'STF-X' })); }, /Signed by STF-X: not an active Staff row with a WorkEmail — nothing was sent/);
      eq('E40 Company chosen → company signature', (run('emailQuote', A(q4, { signAs: 'CO' })), sent[sent.length - 1].b === A(q4).body + '\n\n' + qf3Sig_(db)) + ' ' + sent.length, 'true ' + (n0 + 5));
      who = '';
    });
    step('E panel', function () {
      var js = UI_HTML_.slice(UI_HTML_.indexOf('<script>') + 8, UI_HTML_.lastIndexOf('</script>'));
      eq('E26 panel code injected once, after QF4, before start', QF3_INJECTED_ + ' ' + (js.indexOf('QF3 email the quote') > js.indexOf('QF4 taxes') && js.indexOf('QF3 email the quote') < js.lastIndexOf('// ================= start')), '1 true');
      eq('E27 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
      eq('E28 button + review + send; draft is its own server function', [/'Email to client'/.test(js), /EXACTLY WHAT GOES OUT/.test(js), /act\('emailQuote'/.test(js), /call\('uiQuoteEmail',no\)/.test(js), typeof uiQuoteEmail === 'function', typeof UI_ACTIONS_.emailQuote === 'function'].map(Number).join(''), '111111');
      eq('E41 Signed by picker + signAs sent', [/fld\('Signed by',F\.signAs,1\)/.test(js), /signAs:x\.signAs\}/.test(js), /d\.froms\[x\.signAs\]/.test(js)].map(Number).join(''), '111');
    });
  } finally { QF3_STUB_ = null; QF5_STUB_ = null; }
  return { pass: T.pass, fail: T.fail, log: T.log };
}
