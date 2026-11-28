/**
 * Core Access Ops — site inspections + expense claims with photos (add-on IE1) · 13 Nov 2026
 * Ninth script file, LAST: Apps Script › + › Script › name it CAE_Ops_Site › paste › Save › reload the sheet.
 * File order: Core, PDF, UI, Reports, App, Sets, Order, QuoteReq, Site. Then Core Access › Tools › Upgrade sheet for inspections + claims (run once).
 * Replaces by name: onOpen (adds "Site inspections + expense claims" + the upgrade item). Wraps: selfTestAllParts_ (adds the IE self-test).
 *
 * Field staff, in the CAE Field app:
 *   Inspections   — scaffold inspection on a job (Weekly / Handover / After bad weather / After change), result Safe / Fixed on site / Unsafe, up to 2 photos.
 *   ExpenseClaims — money spent for a job or the office, with a receipt photo (required). Status Submitted.
 * Office: Core Access › Site inspections + expense claims:
 *   Unsafe inspections (open until the office closes them with a note) · jobs on hire with no inspection in the last InspectionDays (Settings, default 7) ·
 *   claims: Approve = picks the payment method (no cash) → new Expenses row (EXP-, receipt photo copied, ApprovedBy = office staff), claim Approved + ExpID; Reject + note.
 *   Only approved claims reach Expenses, so the reports never count a claim that is still waiting.
 */
var CAE_IE_VERSION = 'IE1 · 13 Nov 2026';
var IN_HEAD_ = ['InspID', 'InspDate', 'StaffID', 'JobNo', 'Kind', 'Area', 'Result', 'Findings', 'Photo', 'Photo2', 'ClosedDate', 'OfficeNote'];
var IN_KIND_ = ['Weekly', 'Handover', 'After bad weather', 'After change', 'Dismantle'];
var IN_RESULT_ = ['Safe', 'Fixed on site', 'Unsafe'];
var CL_HEAD_ = ['ClaimID', 'ClaimDate', 'StaffID', 'JobNo', 'Category', 'Payee', 'Amount', 'Details', 'ReceiptPhoto', 'Status', 'ExpID', 'OfficeNote'];
var CL_STATUS_ = ['Submitted', 'Approved', 'Rejected'];
var IE_CATS_ = ['Transport', 'Labour', 'Fuel', 'Site expenses', 'Repairs', 'Office', 'Utilities', 'Other'];

// ======================================================================= upgrade (run once, safe to repeat)
function upgradeIE(db) {
  var done = [];
  var list = function (v) { return SpreadsheetApp.newDataValidation().setAllowInvalid(false).requireValueInList(v, true).build(); };
  var ref = function (t) { return SpreadsheetApp.newDataValidation().setAllowInvalid(true).requireValueInRange(db.sheet(t).getRange('A2:A'), true).build(); };
  var cols = function (t, head) { var s = db.sheet(t); return function (c) { return s.getRange(2, head.indexOf(c) + 1, 998, 1); }; };
  if (db.ensureTab('Inspections', IN_HEAD_, [])) {
    done.push('Inspections tab');
    if (db.ss) {
      var c = cols('Inspections', IN_HEAD_);
      c('Kind').setDataValidation(list(IN_KIND_)); c('Result').setDataValidation(list(IN_RESULT_));
      c('JobNo').setDataValidation(ref('Jobs')); c('StaffID').setDataValidation(ref('Staff'));
      c('InspDate').setNumberFormat('dd-mmm-yyyy'); c('ClosedDate').setNumberFormat('dd-mmm-yyyy');
    }
  }
  if (db.ensureTab('ExpenseClaims', CL_HEAD_, [])) {
    done.push('ExpenseClaims tab');
    if (db.ss) {
      var e = cols('ExpenseClaims', CL_HEAD_);
      e('Category').setDataValidation(list(IE_CATS_)); e('Status').setDataValidation(list(CL_STATUS_));
      e('JobNo').setDataValidation(ref('Jobs')); e('StaffID').setDataValidation(ref('Staff'));
      e('ClaimDate').setNumberFormat('dd-mmm-yyyy'); e('Amount').setNumberFormat('#,##0.00');
    }
  }
  if (!find(db.rows('Settings'), 'Key', 'InspectionDays')) {
    db.insert('Settings', { Key: 'InspectionDays', Value: 7, Notes: 'Scaffold on hire: inspection due after this many days (site app › Inspections)' });
    done.push('Settings InspectionDays 7');
  }
  log_(db, 'Upgrade IE', '', done.join('; ') || 'up to date');
  return done;
}
function menuUpgradeIE() { ui_('Upgrade sheet for inspections + claims', function (db) { var d = upgradeIE(db); return d.length ? 'Done: ' + d.join(', ') + '.\n\nNext: add the Inspections and ExpenseClaims tables to the CAE Field app.' : 'Already up to date.'; }); }

// ======================================================================= helpers
function ieDay_(v) { return blank(v) ? '' : fmtDay(dayNum(v)); }
function ieStaff_(db, id) { var s = blank(id) ? null : find(db.rows('Staff'), 'StaffID', id); return s ? s.Name : (id || ''); }
function ieJob_(db, no) {
  var j = blank(no) ? null : find(db.rows('Jobs'), 'JobNo', no); if (!j) return no || '';
  var c = find(db.rows('Customers'), 'CustID', j.CustID), s = find(db.rows('Sites'), 'SiteID', j.SiteID);
  return j.JobNo + (c ? ' · ' + c.Name : '') + (s ? ' · ' + (s.Project || s.Address) : '');
}
function ieMe_(db, by) {
  if (!blank(by)) return must(db, 'Staff', 'StaffID', by).StaffID;
  var me = String(user_()).toLowerCase(), s = db.rows('Staff').filter(function (x) { return String(x.Email || '').toLowerCase() === me; })[0];
  return s ? s.StaffID : '';
}

// ======================================================================= inspections
function inspIsOpen_(r) { return r.Result === 'Unsafe' && blank(r.ClosedDate); }
function inspList(db) {
  return db.rows('Inspections').filter(function (r) { return !blank(r.InspID); }).map(function (r) {
    return { id: r.InspID, date: ieDay_(r.InspDate), d: dayNum(r.InspDate) || 0, by: ieStaff_(db, r.StaffID), job: ieJob_(db, r.JobNo), jobNo: r.JobNo || '', kind: r.Kind || '', area: r.Area || '',
      result: r.Result || '', findings: r.Findings || '', photos: [r.Photo, r.Photo2].filter(function (x) { return !blank(x); }).length,
      open: inspIsOpen_(r), closed: ieDay_(r.ClosedDate), note: r.OfficeNote || '' };
  }).sort(function (a, b) { return b.d - a.d || (a.id < b.id ? 1 : -1); });
}
// Jobs with scaffold on site (Rental / Project, On hire) and no inspection within InspectionDays (Unsafe ones count as inspected; they show in the open list).
function inspDue(db, asOf) {
  var d = dayNum(asOf || today()), every = num(S(db, 'InspectionDays', 7)) || 7, last = {};
  db.rows('Inspections').forEach(function (r) { var x = dayNum(r.InspDate); if (x != null && !blank(r.JobNo)) last[r.JobNo] = Math.max(last[r.JobNo] || -1e9, x); });
  return db.rows('Jobs').filter(function (j) { return j.Status === 'On hire' && (j.JobType === 'Rental' || j.JobType === 'Project'); }).map(function (j) {
    var l = last[j.JobNo], since = hireStartDay(db, j.JobNo), from = l != null ? l : since;
    return { jobNo: j.JobNo, job: ieJob_(db, j.JobNo), last: l != null ? fmtDay(l) : '', days: from != null ? d - from : null };
  }).filter(function (x) { return x.days == null || x.days >= every; }).sort(function (a, b) { return (b.days || 0) - (a.days || 0); });
}
function closeInspection(db, id, note, date) {
  var r = must(db, 'Inspections', 'InspID', id);
  if (r.Result !== 'Unsafe') throw new Error(id + ' is ' + (r.Result || 'not marked') + ' — only Unsafe inspections need closing');
  if (!blank(r.ClosedDate)) throw new Error(id + ' is already closed (' + ieDay_(r.ClosedDate) + ')');
  if (blank(note)) throw new Error('Say what was done (note) before closing ' + id);
  db.update('Inspections', r, { ClosedDate: date ? toDate(date) : today(), OfficeNote: note });
  log_(db, 'Inspection closed', id, (r.JobNo || '') + ' · ' + note);
  return id + ' closed.';
}

// ======================================================================= expense claims
function claimList(db) {
  return db.rows('ExpenseClaims').filter(function (r) { return !blank(r.ClaimID); }).map(function (r) {
    return { id: r.ClaimID, date: ieDay_(r.ClaimDate), d: dayNum(r.ClaimDate) || 0, by: ieStaff_(db, r.StaffID), job: r.JobNo ? ieJob_(db, r.JobNo) : 'Office / no job',
      cat: r.Category || '', payee: r.Payee || '', amount: num(r.Amount), details: r.Details || '', photo: !blank(r.ReceiptPhoto),
      status: r.Status || 'Submitted', exp: r.ExpID || '', note: r.OfficeNote || '' };
  }).sort(function (a, b) { return b.d - a.d || (a.id < b.id ? 1 : -1); });
}
function claimNew_(db, id) {
  var r = must(db, 'ExpenseClaims', 'ClaimID', id), st = r.Status || 'Submitted';
  if (st !== 'Submitted') throw new Error(id + ' is ' + st + (r.ExpID ? ' (' + r.ExpID + ')' : ''));
  return r;
}
// o = { method, refNo, date, by } → Expenses row; the claim keeps the link (ExpID)
function approveClaim(db, id, o) {
  o = o || {};
  var r = claimNew_(db, id), method = o.method || 'Bank transfer';
  if (PAY_METHODS.indexOf(method) < 0) throw new Error('Method must be: ' + PAY_METHODS.join(', ') + ' (no cash)');
  if (!(num(r.Amount) > 0)) throw new Error(id + ': amount must be more than 0');
  if (IE_CATS_.indexOf(String(r.Category)) < 0) throw new Error(id + ': category must be ' + IE_CATS_.join(' / '));
  if (blank(r.Payee)) throw new Error(id + ': payee is missing');
  if (blank(r.ReceiptPhoto)) throw new Error(id + ': no receipt photo');
  if (!blank(r.JobNo)) must(db, 'Jobs', 'JobNo', r.JobNo);
  var exp = nextId(db, 'EXP'), by = ieMe_(db, o.by), who = ieStaff_(db, r.StaffID);
  db.insert('Expenses', { ExpID: exp, ExpDate: o.date ? toDate(o.date) : (blank(r.ClaimDate) ? today() : toDate(r.ClaimDate)), Category: r.Category, JobNo: r.JobNo || '', Payee: r.Payee,
    Amount: num(r.Amount), Method: method, RefNo: o.refNo || '', ReceiptPhoto: r.ReceiptPhoto, ApprovedBy: by,
    Notes: 'Site claim ' + id + (who ? ' by ' + who : '') + (blank(r.Details) ? '' : ': ' + r.Details) });
  db.update('ExpenseClaims', r, { Status: 'Approved', ExpID: exp, OfficeNote: o.note || r.OfficeNote || '' });
  log_(db, 'Claim approved', id, exp + ' · Tk ' + num(r.Amount) + (r.JobNo ? ' · ' + r.JobNo : ''));
  return { msg: id + ' approved → ' + exp + ' (Tk ' + num(r.Amount) + ', ' + method + ').', ref: exp };
}
function rejectClaim(db, id, note) {
  var r = claimNew_(db, id);
  if (blank(note)) throw new Error('Give a reason before rejecting ' + id);
  db.update('ExpenseClaims', r, { Status: 'Rejected', OfficeNote: note });
  log_(db, 'Claim rejected', id, note);
  return id + ' rejected.';
}

// ======================================================================= panel
function ieOpen() { SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(IE_HTML_).setTitle('Inspections + claims')); }
function ieClean_(x) { return JSON.parse(JSON.stringify(x)); }
function ieInit() { return ieClean_(ieInitDb_(new SheetDb())); }
function ieInitDb_(db, asOf) {
  if (!db.hasTab('Inspections') || !db.hasTab('ExpenseClaims')) return { tab: false };
  var ins = inspList(db), cl = claimList(db);
  return { tab: true, methods: PAY_METHODS.slice(), every: num(S(db, 'InspectionDays', 7)) || 7,
    open: ins.filter(function (r) { return r.open; }), due: inspDue(db, asOf), recent: ins.filter(function (r) { return !r.open; }).slice(0, 10),
    claims: cl.filter(function (r) { return r.status === 'Submitted'; }), done: cl.filter(function (r) { return r.status !== 'Submitted'; }).slice(0, 10) };
}
var IE_ACTIONS_ = {
  closeInsp: function (db, a) { return closeInspection(db, a.id, a.note); },
  approve: function (db, a) { return approveClaim(db, a.id, { method: a.method, refNo: a.refNo }); },
  reject: function (db, a) { return rejectClaim(db, a.id, a.note); },
};
function ieDo(action, args) {
  return ieClean_(withLock(function () {
    var f = IE_ACTIONS_[action]; if (!f) throw new Error('Unknown action ' + action);
    var r = f(new SheetDb(), args || {}); SpreadsheetApp.flush();
    return typeof r === 'string' ? { msg: r } : r;
  }));
}
var IE_HTML_ = `<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8"><style>
body{margin:0;font:12px/1.4 Arial,sans-serif;color:#2B3036}header{background:#000;color:#fff;padding:8px 10px;font-weight:700;letter-spacing:.08em}main{padding:10px}
.card{border:1px solid #D5D8DA;border-radius:4px;padding:6px 8px;margin:6px 0;background:#F3F5F6}.card b{display:block}.m{color:#5F676E;font-size:11px}.d{margin:3px 0}
.card.r{border-left:4px solid #C62828}.st{float:right;font-weight:400;font-size:11px;color:#17707D}h4{margin:14px 0 2px;color:#17707D;text-transform:uppercase;font-size:11px;letter-spacing:.05em}
input,select{width:100%;box-sizing:border-box;font:inherit;padding:4px;border:1px solid #D5D8DA;border-radius:3px;margin-top:6px}
button{background:#17707D;color:#fff;border:1px solid #17707D;border-radius:3px;padding:5px 9px;margin:6px 4px 0 0;cursor:pointer;font:inherit;font-weight:600}button.s{background:#fff;color:#C62828;border-color:#C62828}
.msg{padding:6px 8px;border-left:4px solid #17707D;background:#EAF3F8;white-space:pre-wrap;margin-bottom:8px}.msg.e{border-color:#C62828;background:#FDECEA}</style></head><body>
<header>CORE ACCESS · SITE INSPECTIONS + CLAIMS</header><main><div id="msg"></div><div id="v">Loading…</div></main><script>
var D=null;function $(i){return document.getElementById(i);}function h(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function tk(n){return Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
function say(t,e){$('msg').innerHTML=t?'<div class="msg'+(e?' e':'')+'">'+h(t)+'</div>':'';}
function load(){google.script.run.withSuccessHandler(function(d){D=d;draw();}).withFailureHandler(function(e){say(e.message,1);}).ieInit();}
function act(a,x){google.script.run.withSuccessHandler(function(r){say(r.msg);load();}).withFailureHandler(function(e){say(e.message,1);}).ieDo(a,x);}
function insp(r){return '<div class="card'+(r.open?' r':'')+'"><b>'+h(r.id)+' · '+h(r.result)+'<span class=st>'+h(r.kind)+'</span></b><div class=m>'+h(r.date)+(r.by?' · by '+h(r.by):'')+(r.photos?' · '+r.photos+' photo(s) in the app':'')+'</div>'+
 '<div>'+h(r.job)+'</div>'+(r.area?'<div class=m>Area: '+h(r.area)+'</div>':'')+(r.findings?'<div class=d>'+h(r.findings)+'</div>':'')+
 (r.closed?'<div class=m>Closed '+h(r.closed)+(r.note?': '+h(r.note):'')+'</div>':'')+
 (r.open?'<input class=nt placeholder="what was done (needed to close)"><button data-c="'+h(r.id)+'">Close</button>':'')+'</div>';}
function claim(r){var n=r.status==='Submitted',o=D.methods.map(function(m){return '<option>'+h(m)+'</option>';}).join('');
 return '<div class=card><b>'+h(r.id)+' · Tk '+tk(r.amount)+'<span class=st>'+h(r.status)+'</span></b><div class=m>'+h(r.date)+(r.by?' · by '+h(r.by):'')+' · '+h(r.cat)+(r.photo?' · receipt photo in the app':' · NO PHOTO')+'</div>'+
 '<div>'+h(r.payee)+' · '+h(r.job)+'</div>'+(r.details?'<div class=d>'+h(r.details)+'</div>':'')+(r.exp?'<div class=m>Expense '+h(r.exp)+'</div>':'')+(r.note?'<div class=m>Note: '+h(r.note)+'</div>':'')+
 (n?'<select class=me>'+o+'</select><input class=rf placeholder="payment reference (optional)"><button data-a="'+h(r.id)+'">Approve → Expenses</button><input class=nt placeholder="reason (for Reject)"><button class=s data-r="'+h(r.id)+'">Reject</button>':'')+'</div>';}
function draw(){if(!D.tab){$('v').innerHTML='<p class=m>Run Core Access › Tools › Upgrade sheet for inspections + claims first.</p>';return;}
 var due=D.due.map(function(x){return '<div class=card><b>'+h(x.job)+'</b><div class=m>'+(x.last?'Last inspected '+h(x.last)+' · '+x.days+' days ago':(x.days==null?'Not inspected yet':'Not inspected yet · on hire '+x.days+' days'))+'</div></div>';}).join('');
 $('v').innerHTML='<h4>Unsafe — open</h4>'+(D.open.length?D.open.map(insp).join(''):'<p class=m>None.</p>')+
  '<h4>Inspection due (every '+D.every+' days)</h4>'+(due||'<p class=m>All scaffold on hire inspected in time.</p>')+
  '<h4>Expense claims to approve</h4>'+(D.claims.length?D.claims.map(claim).join(''):'<p class=m>None. Field staff add them in the CAE Field app › Expense claims.</p>')+
  (D.done.length?'<h4>Claims done</h4>'+D.done.map(claim).join(''):'')+(D.recent.length?'<h4>Recent inspections</h4>'+D.recent.map(insp).join(''):'');
 [].forEach.call(document.querySelectorAll('[data-c]'),function(b){b.onclick=function(){act('closeInsp',{id:b.getAttribute('data-c'),note:b.previousSibling.value});};});
 [].forEach.call(document.querySelectorAll('[data-a]'),function(b){b.onclick=function(){var c=b.parentNode;act('approve',{id:b.getAttribute('data-a'),method:c.querySelector('.me').value,refNo:c.querySelector('.rf').value});};});
 [].forEach.call(document.querySelectorAll('[data-r]'),function(b){b.onclick=function(){if(!b.armed){b.armed=1;b.textContent='Confirm reject';setTimeout(function(){b.armed=0;b.textContent='Reject';},4000);return;}act('reject',{id:b.getAttribute('data-r'),note:b.previousSibling.value});};});}
load();</script></body></html>`;

// ======================================================================= menu (replaces the QR1 onOpen)
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Core Access')
    .addItem('Open panel', 'uiOpenHome')
    .addItem('Open panel in a wide window', 'uiOpenWide')
    .addSeparator()
    .addItem('Quote requests from site', 'qrOpen')
    .addItem('Site inspections + expense claims', 'ieOpen')
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
      .addItem('Upgrade sheet for quote requests (run once)', 'menuUpgradeQR')
      .addItem('Upgrade sheet for inspections + claims (run once)', 'menuUpgradeIE')
      .addItem('Run self-test', 'menuSelfTestAll'))
    .addToUi();
}

// ======================================================================= self-test (in memory, your data is not touched)
if (typeof selfTestAllParts_ === 'function') {
  var IE_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return IE_parts0_().concat([['IE', selfTestIE()]]); };
}
function selfTestIE() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws;
  var db = testSeed_('Full period'), job = '';
  var ins = function (o) { db.insert('Inspections', Object.assign({ StaffID: 'STF-001', Kind: 'Weekly' }, o)); };
  var cl = function (o) { db.insert('ExpenseClaims', Object.assign({ ClaimDate: toDate('12-Nov-2026'), StaffID: 'STF-001', Category: 'Transport', Payee: 'Truck owner', Amount: 3500, ReceiptPhoto: 'ExpenseClaims_Images/a.jpg', Status: 'Submitted' }, o)); };
  var get = function (t, k, id) { return must(db, t, k, id); };
  step('E upgrade', function () {
    eq('E1 tabs + setting added', upgradeIE(db).join(), 'Inspections tab,ExpenseClaims tab,Settings InspectionDays 7');
    eq('E2 second run changes nothing', upgradeIE(db).length, 0);
    eq('E3 columns', db.headers('Inspections').join(',') + ' | ' + db.headers('ExpenseClaims').join(','), IN_HEAD_.join(',') + ' | ' + CL_HEAD_.join(','));
    db.insert('Staff', [{ StaffID: 'STF-001', Name: 'Core Access office', Email: 'info@x', Status: 'Active' }, { StaffID: 'STF-002', Name: 'Rahim (site)', Status: 'Active' }]);
    testQuote_(db, 'CAE/Q/2026/001', 'Rental', [['RL-STD-20', 'Ringlock standard 2.0 m', 'pc', 10, 1, 100]]);
    job = quoteToJob(db, 'CAE/Q/2026/001', { date: '01-Nov-2026' });
    postOpeningStock(db, [{ ItemCode: 'RL-STD-20', Qty: 10 }], '01-Nov-2026');
    postChallan(db, createChallan(db, { jobNo: job, date: '02-Nov-2026', lines: [{ itemCode: 'RL-STD-20', qty: 10 }] }));
    eq('E4 test job on hire', get('Jobs', 'JobNo', job).Status, 'On hire');
  });
  step('E inspections', function () {
    var due = inspDue(db, '13-Nov-2026');
    eq('E5 never inspected → due, days on hire', due.length + ' ' + due[0].jobNo + ' ' + due[0].last + '|' + due[0].days, '1 ' + job + ' |11');
    ins({ InspID: 'IN-a', InspDate: toDate('10-Nov-2026'), JobNo: job, Area: 'Tank east', Result: 'Safe' });
    eq('E6 inspected 3 days ago → not due', inspDue(db, '13-Nov-2026').length, 0);
    eq('E7 due again after 7 days', inspDue(db, '17-Nov-2026').map(function (x) { return x.last + ' ' + x.days; }).join(), '10-Nov-2026 7');
    ins({ InspID: 'IN-b', InspDate: toDate('12-Nov-2026'), StaffID: 'STF-002', JobNo: job, Kind: 'After bad weather', Area: 'Lift 3', Result: 'Unsafe', Findings: 'Two ties missing', Photo: 'p1.jpg', Photo2: 'p2.jpg' });
    var L = inspList(db), b = find(L, 'id', 'IN-b');
    eq('E8 list newest first, open flag, names', L[0].id + ' ' + b.open + ' ' + b.by + ' ' + b.photos + ' ' + find(L, 'id', 'IN-a').open + ' | ' + b.job, 'IN-b true Rahim (site) 2 false | ' + job + ' · Test Client · Tower A');
    throws('E9 safe one cannot be closed', function () { closeInspection(db, 'IN-a', 'x'); }, /only Unsafe/);
    throws('E10 close needs a note', function () { closeInspection(db, 'IN-b', ''); }, /note/);
    eq('E11 close', closeInspection(db, 'IN-b', 'Ties fixed 13 Nov', '13-Nov-2026'), 'IN-b closed.');
    eq('E12 closed date + note', ieDay_(get('Inspections', 'InspID', 'IN-b').ClosedDate) + ' ' + get('Inspections', 'InspID', 'IN-b').OfficeNote, '13-Nov-2026 Ties fixed 13 Nov');
    throws('E13 closed twice refused', function () { closeInspection(db, 'IN-b', 'again'); }, /already closed/);
    db.update('Jobs', get('Jobs', 'JobNo', job), { Status: 'Off-hire' });
    eq('E14 off-hire jobs never due', inspDue(db, '30-Nov-2026').length, 0);
    db.update('Jobs', get('Jobs', 'JobNo', job), { Status: 'On hire' });
  });
  step('E claims', function () {
    cl({ ClaimID: 'CL-a', JobNo: job, Details: 'Trip to site with ties' });
    cl({ ClaimID: 'CL-b', Category: 'Office', Payee: 'Stationers', Amount: 800 });
    cl({ ClaimID: 'CL-c', Category: 'Party' });
    cl({ ClaimID: 'CL-d', ReceiptPhoto: '' });
    cl({ ClaimID: 'CL-e', Amount: 0 });
    throws('E15 cash refused', function () { approveClaim(db, 'CL-a', { method: 'Cash' }); }, /no cash/);
    var r = approveClaim(db, 'CL-a', { method: 'Bank transfer', refNo: 'BT-77', by: 'STF-001' }), e = get('Expenses', 'ExpID', r.ref), c = get('ExpenseClaims', 'ClaimID', 'CL-a');
    eq('E16 expense row from the claim', [r.ref, fmtDay(dayNum(e.ExpDate)), e.Category, e.JobNo, e.Payee, e.Amount, e.Method, e.RefNo, e.ReceiptPhoto, e.ApprovedBy].join(' | '), 'EXP-00001 | 12-Nov-2026 | Transport | ' + job + ' | Truck owner | 3500 | Bank transfer | BT-77 | ExpenseClaims_Images/a.jpg | STF-001');
    eq('E17 expense note names the claim', e.Notes, 'Site claim CL-a by Core Access office: Trip to site with ties');
    eq('E18 claim approved + linked', c.Status + ' ' + c.ExpID, 'Approved EXP-00001');
    throws('E19 approved twice refused', function () { approveClaim(db, 'CL-a'); }, /is Approved \(EXP-00001\)/);
    eq('E20 office claim, default method', approveClaim(db, 'CL-b').ref + ' ' + get('Expenses', 'ExpID', 'EXP-00002').Method + ' ' + get('Expenses', 'ExpID', 'EXP-00002').JobNo + '|', 'EXP-00002 Bank transfer |');
    throws('E21 unknown category refused', function () { approveClaim(db, 'CL-c'); }, /category must be/);
    throws('E22 no photo refused', function () { approveClaim(db, 'CL-d'); }, /no receipt photo/);
    throws('E23 zero amount refused', function () { approveClaim(db, 'CL-e'); }, /more than 0/);
    eq('E24 refused claims made no expense', db.rows('Expenses').length, 2);
    throws('E25 reject needs a reason', function () { rejectClaim(db, 'CL-c', ''); }, /reason/);
    eq('E26 reject', rejectClaim(db, 'CL-c', 'Not a business cost') + ' ' + get('ExpenseClaims', 'ClaimID', 'CL-c').Status, 'CL-c rejected. Rejected');
    throws('E27 rejected cannot be approved', function () { approveClaim(db, 'CL-c'); }, /is Rejected/);
  });
  step('E panel', function () {
    var js = IE_HTML_.slice(IE_HTML_.indexOf('<script>') + 8, IE_HTML_.lastIndexOf('</script>'));
    eq('E28 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
    var used = {}, re = /act\('(\w+)'/g, m; while ((m = re.exec(IE_HTML_))) used[m[1]] = 1;
    eq('E29 every panel action exists on the server', Object.keys(used).sort().join(',') + ' ' + (Object.keys(used).filter(function (k) { return !IE_ACTIONS_[k]; }).join(',') || 'none'), 'approve,closeInsp,reject none');
    var init = ieClean_(ieInitDb_(db, '13-Nov-2026'));
    eq('E30 panel data', [init.open.length, init.due.length, init.recent.length, init.claims.map(function (x) { return x.id; }).join('+'), init.done.length, init.methods.join('/')].join(' '), '0 0 2 CL-e+CL-d 3 Bank transfer/Cheque/Pay order');
    eq('E31 panel data has no row numbers', JSON.stringify(init).indexOf('"_r"') < 0, true);
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
