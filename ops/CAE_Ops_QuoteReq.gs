/**
 * Core Access Ops — site quote requests (add-on QR1) · 13 Nov 2026
 * Eighth script file, LAST: Apps Script › + › Script › name it CAE_Ops_QuoteReq › paste › Save › reload the sheet.
 * File order: Core, PDF, UI, Reports, App, Sets, Order, QuoteReq. Then Core Access › Tools › Upgrade sheet for quote requests (run once).
 * Replaces by name: onOpen (adds "Quote requests from site" + the upgrade item). Wraps: selfTestAllParts_ (adds the QR self-test).
 *
 * Field staff add requests in the CAE Field app (tab QuoteReqs, Status New). Office: Core Access › Quote requests from site:
 *   Make draft quote = customer (added if the request names a new one), site (added if new), quote type = work type,
 *   one line with the request details (rate 0) → Draft quote; request → Quoted + QuoteNo. Then price the lines in Quotes › Edit.
 *   Drop = request → Dropped with the office note.
 */
var CAE_QR_VERSION = 'QR1 · 13 Nov 2026';
var QR_HEAD_ = ['ReqID', 'ReqDate', 'StaffID', 'CustID', 'NewCustomer', 'SiteID', 'NewSite', 'Contact', 'Phone', 'WorkType', 'Details', 'LengthM', 'WidthM', 'HeightM', 'Photo', 'NeededBy', 'Status', 'QuoteNo', 'OfficeNote'];
var QR_STATUS_ = ['New', 'Quoted', 'Dropped'];

// ======================================================================= upgrade (run once, safe to repeat)
function upgradeQR(db) {
  var done = [];
  if (db.ensureTab('QuoteReqs', QR_HEAD_, [])) {
    done.push('QuoteReqs tab');
    if (db.ss) {
      var s = db.sheet('QuoteReqs'), col = function (c) { return s.getRange(2, QR_HEAD_.indexOf(c) + 1, 998, 1); };
      var list = function (v) { return SpreadsheetApp.newDataValidation().setAllowInvalid(false).requireValueInList(v, true).build(); };
      col('WorkType').setDataValidation(list(UI_LISTS_DEFAULT_.QuoteType));
      col('Status').setDataValidation(list(QR_STATUS_));
      [['CustID', 'Customers'], ['SiteID', 'Sites'], ['StaffID', 'Staff']].forEach(function (x) {
        col(x[0]).setDataValidation(SpreadsheetApp.newDataValidation().setAllowInvalid(true).requireValueInRange(db.sheet(x[1]).getRange('A2:A'), true).build());
      });
      col('ReqDate').setNumberFormat('dd-mmm-yyyy'); col('NeededBy').setNumberFormat('dd-mmm-yyyy'); col('Phone').setNumberFormat('@');
    }
  }
  log_(db, 'Upgrade QR', '', done.join('; ') || 'up to date');
  return done;
}
function menuUpgradeQR() { ui_('Upgrade sheet for quote requests', function (db) { var d = upgradeQR(db); return d.length ? 'Done: ' + d.join(', ') + '.\n\nNext: add the QuoteReqs table to the CAE Field app.' : 'Already up to date.'; }); }

// ======================================================================= requests
function qrDims_(r) { var d = [['L', 'LengthM'], ['W', 'WidthM'], ['H', 'HeightM']].filter(function (k) { return num(r[k[1]]) > 0; }).map(function (k) { return k[0] + ' ' + num(r[k[1]]); }); return d.length ? d.join(' × ') + ' m' : ''; }
function qrList(db) {
  var get = function (t, k, id) { return blank(id) ? null : find(db.rows(t), k, id); };
  return db.rows('QuoteReqs').filter(function (r) { return !blank(r.ReqID); }).map(function (r) {
    var c = get('Customers', 'CustID', r.CustID), s = get('Sites', 'SiteID', r.SiteID), st = get('Staff', 'StaffID', r.StaffID);
    return { id: r.ReqID, date: blank(r.ReqDate) ? '' : fmtDay(dayNum(r.ReqDate)), by: st ? st.Name : (r.StaffID || ''),
      cust: c ? c.Name : (blank(r.NewCustomer) ? '' : 'New: ' + r.NewCustomer), site: s ? (s.Project || s.Address) : (blank(r.NewSite) ? '' : 'New: ' + r.NewSite),
      contact: [r.Contact, r.Phone].filter(function (x) { return !blank(x); }).join(' · '), type: r.WorkType || '', details: r.Details || '', dims: qrDims_(r), photo: !blank(r.Photo),
      needed: blank(r.NeededBy) ? '' : fmtDay(dayNum(r.NeededBy)), status: r.Status || 'New', quote: r.QuoteNo || '', note: r.OfficeNote || '' };
  }).reverse();
}
function qrNew_(db, id) {
  var r = must(db, 'QuoteReqs', 'ReqID', id), st = r.Status || 'New';
  if (st !== 'New') throw new Error(id + ' is ' + st + (r.QuoteNo ? ' (' + r.QuoteNo + ')' : ''));
  return r;
}
// o = { date } → Draft quote; new customer / site added first and written back to the request
function quoteFromRequest(db, id, o) {
  o = o || {};
  var r = qrNew_(db, id), cust = r.CustID, site = r.SiteID, added = [];
  if (UI_LISTS_DEFAULT_.QuoteType.indexOf(String(r.WorkType)) < 0) throw new Error(id + ': work type must be ' + UI_LISTS_DEFAULT_.QuoteType.join(' / '));
  if (blank(r.Details)) throw new Error(id + ': no details — what is needed?');
  if (blank(cust) && blank(r.NewCustomer)) throw new Error(id + ': no customer — pick one or type a new customer name');
  if (blank(cust) && !blank(site)) throw new Error(id + ': site ' + site + ' is picked but the customer is new — pick the customer too');
  if (!blank(cust)) must(db, 'Customers', 'CustID', cust);
  if (!blank(site) && must(db, 'Sites', 'SiteID', site).CustID !== cust) throw new Error(id + ': site ' + site + ' belongs to another customer');
  if (blank(cust)) {
    try { cust = uiSaveCustomer_(db, { name: r.NewCustomer, contact: r.Contact, phone: r.Phone }).ref; }
    catch (e) { throw new Error(id + ': ' + e.message + ' — pick it as the customer on the request'); }
    added.push('customer ' + cust);
  }
  if (blank(site) && !blank(r.NewSite)) { site = uiSaveSite_(db, { custId: cust, project: r.NewSite, address: r.NewSite, siteRep: r.Contact, siteRepPhone: r.Phone }); added.push('site ' + site); }
  var dims = qrDims_(r), st = blank(r.StaffID) ? null : find(db.rows('Staff'), 'StaffID', r.StaffID);
  var q = uiSaveQuote_(db, {
    header: { QuoteType: r.WorkType, QuoteDate: o.date || '', CustID: cust, SiteID: site || '', Attention: r.Contact || '',
      Notes: 'From site request ' + id + (st ? ' by ' + st.Name : '') + (blank(r.NeededBy) ? '' : ' · needed by ' + fmtDay(dayNum(r.NeededBy))) },
    lines: [{ Description: 'Site request ' + id + ': ' + String(r.Details).trim() + (dims ? ' (' + dims + ')' : ''), Qty: 1, Rate: 0 }],
  });
  uiPutRow_(db, 'QuoteReqs', r, { CustID: cust, SiteID: site || '', Status: 'Quoted', QuoteNo: q.ref });
  log_(db, 'Request → quote', id, q.ref + (added.length ? ' · added ' + added.join(', ') : ''));
  return { msg: q.ref + ' created as Draft from ' + id + (added.length ? ' (added ' + added.join(', ') + ')' : '') + '. Open it in Quotes › Edit to add the priced lines.', ref: q.ref };
}
function dropRequest(db, id, note) {
  var r = qrNew_(db, id);
  uiPutRow_(db, 'QuoteReqs', r, { Status: 'Dropped', OfficeNote: note || '' });
  log_(db, 'Request dropped', id, note || '');
  return id + ' dropped.';
}

// ======================================================================= panel
function qrOpen() { SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(QR_HTML_).setTitle('Quote requests')); }
function qrOpenQuote(no) { SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(uiHtml_('quotes', no)).setTitle('Core Access')); }
function qrInit() { return uiClean_(qrInitDb_(new SheetDb())); }
function qrInitDb_(db) {
  if (!db.hasTab('QuoteReqs')) return { rows: [], tab: false };
  var all = qrList(db);
  return { tab: true, rows: all.filter(function (r) { return r.status === 'New'; }).concat(all.filter(function (r) { return r.status !== 'New'; }).slice(0, 15)) };
}
var QR_ACTIONS_ = {
  makeQuote: function (db, a) { return quoteFromRequest(db, a.id, {}); },
  drop: function (db, a) { return dropRequest(db, a.id, a.note); },
};
function qrDo(action, args) {
  return uiClean_(withLock(function () {
    var f = QR_ACTIONS_[action]; if (!f) throw new Error('Unknown action ' + action);
    var r = f(new SheetDb(), args || {}); SpreadsheetApp.flush();
    return typeof r === 'string' ? { msg: r } : r;
  }));
}
var QR_HTML_ = `<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8"><style>
body{margin:0;font:12px/1.4 Arial,sans-serif;color:#2B3036}header{background:#000;color:#fff;padding:8px 10px;font-weight:700;letter-spacing:.08em}main{padding:10px}
.card{border:1px solid #D5D8DA;border-radius:4px;padding:6px 8px;margin:6px 0;background:#F3F5F6}.card b{display:block}.m{color:#5F676E;font-size:11px}.d{margin:3px 0}
.st{float:right;font-weight:400;font-size:11px;color:#17707D}h4{margin:12px 0 2px;color:#17707D}
input{width:100%;box-sizing:border-box;font:inherit;padding:4px;border:1px solid #D5D8DA;border-radius:3px;margin-top:6px}
button{background:#17707D;color:#fff;border:1px solid #17707D;border-radius:3px;padding:5px 9px;margin:6px 4px 0 0;cursor:pointer;font:inherit;font-weight:600}button.s{background:#fff;color:#C62828;border-color:#C62828}
.msg{padding:6px 8px;border-left:4px solid #17707D;background:#EAF3F8;white-space:pre-wrap;margin-bottom:8px}.msg.e{border-color:#C62828;background:#FDECEA}</style></head><body>
<header>CORE ACCESS · QUOTE REQUESTS</header><main><div id="msg"></div><div id="v">Loading…</div></main><script>
var D=null;function $(i){return document.getElementById(i);}function h(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function say(t,e,ref){$('msg').innerHTML=t?'<div class="msg'+(e?' e':'')+'">'+h(t)+(ref?'<br><button id=oq>Open '+h(ref)+' in Quotes</button>':'')+'</div>':'';if(ref)$('oq').onclick=function(){google.script.run.qrOpenQuote(ref);};}
function load(){google.script.run.withSuccessHandler(function(d){D=d;draw();}).withFailureHandler(function(e){say(e.message,1);}).qrInit();}
function act(a,x){google.script.run.withSuccessHandler(function(r){say(r.msg,r.warn,r.ref);load();}).withFailureHandler(function(e){say(e.message,1);}).qrDo(a,x);}
function card(r){var n=r.status==='New';return '<div class=card><b>'+h(r.id)+' · '+h(r.type)+'<span class=st>'+h(r.status)+'</span></b><div class=m>'+h(r.date)+(r.by?' · by '+h(r.by):'')+(r.needed?' · needed by '+h(r.needed):'')+'</div>'+
 '<div>'+h(r.cust||'— no customer —')+(r.site?' · '+h(r.site):'')+'</div>'+(r.contact?'<div class=m>'+h(r.contact)+'</div>':'')+'<div class=d>'+h(r.details)+(r.dims?' ('+h(r.dims)+')':'')+(r.photo?' · photo in the app':'')+'</div>'+
 (r.quote?'<div class=m>Quote '+h(r.quote)+'</div>':'')+(r.note?'<div class=m>Note: '+h(r.note)+'</div>':'')+
 (n?'<button data-q="'+h(r.id)+'">Make draft quote</button><input class=nt placeholder="reason (for Drop)"><button class=s data-d="'+h(r.id)+'">Drop</button>':'')+'</div>';}
function draw(){if(!D.tab){$('v').innerHTML='<p class=m>Run Core Access › Tools › Upgrade sheet for quote requests first.</p>';return;}
 var nw=D.rows.filter(function(r){return r.status==='New';}),old=D.rows.filter(function(r){return r.status!=='New';});
 $('v').innerHTML=(nw.length?nw.map(card).join(''):'<p class=m>No new requests. Field staff add them in the CAE Field app › Quote requests.</p>')+(old.length?'<h4>Done</h4>'+old.map(card).join(''):'');
 [].forEach.call(document.querySelectorAll('[data-q]'),function(b){b.onclick=function(){act('makeQuote',{id:b.getAttribute('data-q')});};});
 [].forEach.call(document.querySelectorAll('[data-d]'),function(b){b.onclick=function(){if(!b.armed){b.armed=1;b.textContent='Confirm drop';setTimeout(function(){b.armed=0;b.textContent='Drop';},4000);return;}act('drop',{id:b.getAttribute('data-d'),note:b.previousSibling.value});};});}
load();</script></body></html>`;

// ======================================================================= menu (replaces the O8 onOpen)
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Core Access')
    .addItem('Open panel', 'uiOpenHome')
    .addItem('Open panel in a wide window', 'uiOpenWide')
    .addSeparator()
    .addItem('Quote requests from site', 'qrOpen')
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
      .addItem('Run self-test', 'menuSelfTestAll'))
    .addToUi();
}

// ======================================================================= self-test (in memory, your data is not touched)
if (typeof selfTestAllParts_ === 'function') {
  var QR_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return QR_parts0_().concat([['QR', selfTestQR()]]); };
}
function selfTestQR() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws;
  var db = testSeed_('Full period'), add = function (o) { db.insert('QuoteReqs', Object.assign({ ReqDate: toDate('13-Nov-2026'), Status: 'New' }, o)); };
  var req = function (id) { return must(db, 'QuoteReqs', 'ReqID', id); };
  step('R upgrade', function () {
    eq('R1 tab added', upgradeQR(db).join(), 'QuoteReqs tab');
    eq('R2 second run changes nothing', upgradeQR(db).length, 0);
    eq('R3 columns', db.headers('QuoteReqs').join(','), QR_HEAD_.join(','));
  });
  step('R make quote', function () {
    add({ ReqID: 'QR-a1', CustID: 'CUST-0001', SiteID: 'SITE-0001', Contact: 'Mr Karim', Phone: '01711000000', WorkType: 'Rental', Details: 'Ringlock for tank 12 m dia', LengthM: 12, WidthM: 12, HeightM: 9.5, NeededBy: toDate('20-Nov-2026') });
    add({ ReqID: 'QR-b2', NewCustomer: 'Delta Builders Ltd.', NewSite: 'Tongi plant', Contact: 'Engr Rahim', Phone: '01811000000', WorkType: 'Project', Details: 'Facade scaffold 40 m x 20 m' });
    add({ ReqID: 'QR-c3', CustID: 'CUST-0001', WorkType: 'Painting', Details: 'Paint the tank' });
    add({ ReqID: 'QR-d4', WorkType: 'Sale', Details: 'Tubes' });
    add({ ReqID: 'QR-e5', NewCustomer: 'test client', WorkType: 'Sale', Details: 'Tubes' });
    add({ ReqID: 'QR-f6', NewCustomer: 'Zeta Ltd.', SiteID: 'SITE-0001', WorkType: 'Sale', Details: 'Tubes' });
    var r = quoteFromRequest(db, 'QR-a1', { date: '2026-11-13' }), q = must(db, 'Quotes', 'QuoteNo', r.ref), l = db.rows('QuoteLines').filter(function (x) { return x.QuoteNo === r.ref; });
    eq('R4 draft quote from the request', [r.ref, q.Status, q.QuoteType, q.CustID, q.SiteID, q.Attention, q.MinMonths].join(' '), 'CAE/Q/2026/001 Draft Rental CUST-0001 SITE-0001 Mr Karim 1');
    eq('R5 one line with the details, rate 0', l.length + ' | ' + l[0].Description + ' | ' + l[0].Qty + ' ' + l[0].Rate, '1 | Site request QR-a1: Ringlock for tank 12 m dia (L 12 × W 12 × H 9.5 m) | 1 0');
    eq('R6 quote note', q.Notes, 'From site request QR-a1 · needed by 20-Nov-2026');
    eq('R7 request marked Quoted', req('QR-a1').Status + ' ' + req('QR-a1').QuoteNo, 'Quoted CAE/Q/2026/001');
    throws('R8 second quote refused', function () { quoteFromRequest(db, 'QR-a1'); }, /is Quoted \(CAE\/Q\/2026\/001\)/);
    r = quoteFromRequest(db, 'QR-b2', { date: '2026-11-13' });
    var b2 = req('QR-b2'), c = must(db, 'Customers', 'CustID', b2.CustID), s = must(db, 'Sites', 'SiteID', b2.SiteID);
    eq('R9 new customer + site added and written back', [b2.CustID, c.Name, c.Phone, s.Project, s.CustID, s.LocID].join(' | '), 'CUST-0002 | Delta Builders Ltd. | 01811000000 | Tongi plant | CUST-0002 | LOC-S0002');
    eq('R10 project quote for the new customer', must(db, 'Quotes', 'QuoteNo', r.ref).QuoteType + ' ' + must(db, 'Quotes', 'QuoteNo', r.ref).CustID + ' ' + r.ref, 'Project CUST-0002 CAE/Q/2026/002');
    throws('R11 unknown work type refused', function () { quoteFromRequest(db, 'QR-c3'); }, /work type must be/);
    throws('R12 no customer refused', function () { quoteFromRequest(db, 'QR-d4'); }, /no customer/);
    throws('R13 existing customer name refused with a hint', function () { quoteFromRequest(db, 'QR-e5'); }, /already exists — pick it/);
    throws('R14 picked site with a new customer refused', function () { quoteFromRequest(db, 'QR-f6'); }, /customer is new/);
    eq('R15 refused requests made nothing', db.rows('Quotes').length + ' ' + db.rows('Customers').length + ' ' + db.rows('Sites').length, '2 2 2');
  });
  step('R drop + panel', function () {
    eq('R16 drop', dropRequest(db, 'QR-c3', 'Painting is not our work'), 'QR-c3 dropped.');
    eq('R17 dropped with the note', req('QR-c3').Status + ' | ' + req('QR-c3').OfficeNote, 'Dropped | Painting is not our work');
    throws('R18 dropped cannot be quoted', function () { quoteFromRequest(db, 'QR-c3'); }, /is Dropped/);
    var L = qrList(db), a = find(L, 'id', 'QR-a1');
    eq('R19 list newest first, names + dims', L[0].id + ' ' + L.length + ' | ' + a.cust + ' | ' + a.site + ' | ' + a.dims + ' | ' + a.needed, 'QR-f6 6 | Test Client | Tower A | L 12 × W 12 × H 9.5 m | 20-Nov-2026');
    var js = QR_HTML_.slice(QR_HTML_.indexOf('<script>') + 8, QR_HTML_.lastIndexOf('</script>'));
    eq('R20 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
    var used = {}, re = /act\('(\w+)'/g, m; while ((m = re.exec(QR_HTML_))) used[m[1]] = 1;
    eq('R21 every panel action exists on the server', Object.keys(used).sort().join(',') + ' ' + (Object.keys(used).filter(function (k) { return !QR_ACTIONS_[k]; }).join(',') || 'none'), 'drop,makeQuote none');
    var init = uiClean_(qrInitDb_(db));
    eq('R22 panel data: new first, safe for the panel', init.rows.map(function (x) { return x.status[0]; }).join('') + ' ' + (JSON.stringify(init).indexOf('"_r"') < 0), 'NNNDQQ true');
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
