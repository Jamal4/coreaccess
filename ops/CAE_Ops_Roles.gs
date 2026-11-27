/**
 * Core Access Ops — app role Yard (add-on R1) · 13 Nov 2026
 * Tenth script file, LAST: Apps Script › + › Script › name it CAE_Ops_Roles › paste › Save › reload the sheet.
 * File order: Core, PDF, UI, Reports, App, Sets, Order, QuoteReq, Site, Roles.
 * Then Core Access › Tools › Upgrade sheet for inspections + claims (adds "Yard" to the Staff › AppRole dropdown; safe to repeat).
 *
 * App roles (Staff › AppRole, matched by Email): Admin · Field · Yard · Viewer.
 *   Yard = stock, challans (Delivery / Sale / Return), cut · repair · scrap, damage photos. No quote requests,
 *   inspections or expense claims (AppSheet hides those screens; the office panels refuse them too).
 * Replaces by name: appRoleCheck_ (Sets). Wraps: upgradeIE, quoteFromRequest, approveClaim, selfTestAllParts_.
 */
var CAE_R1_VERSION = 'R1 · 13 Nov 2026';
APP_ROLES_ = ['Admin', 'Viewer', 'Field', 'Yard'];
var R1_STOCK_ROLES_ = ['Admin', 'Field', 'Yard']; // challans + conversions (swept)
var R1_SITE_ROLES_ = ['Admin', 'Field'];          // quote requests, inspections, expense claims

// Swept app records (challans, conversions): Admin, Field or Yard.
function appRoleCheck_(db, email, allowed) {
  if (S(db, 'AppCheckRole', 'No') !== 'Yes') return;
  allowed = allowed || R1_STOCK_ROLES_;
  if (db.headers('Staff').indexOf('AppRole') < 0) throw new Error('Staff › AppRole is missing — run Upgrade sheet for O7');
  var e = String(email || '').trim().toLowerCase();
  var s = e && db.rows('Staff').filter(function (x) { return String(x.Email || '').trim().toLowerCase() === e && x.Status !== 'Inactive'; })[0];
  if (!s) throw new Error((email || 'Unknown user') + ' is not in the Staff tab (Email) — ask the office to add you');
  if (allowed.indexOf(String(s.AppRole)) < 0) throw new Error(email + ' has app role ' + (s.AppRole || 'none') + ' — only ' + allowed.slice(1).join(', ') + ' or Admin can submit');
}
// Office panels: a request / claim made by a Staff member whose role may not send it is refused (Drop / Reject still work).
function r1SiteRole_(db, id, staffId, what) {
  if (S(db, 'AppCheckRole', 'No') !== 'Yes' || blank(staffId)) return;
  var s = find(db.rows('Staff'), 'StaffID', staffId);
  if (s && R1_SITE_ROLES_.indexOf(String(s.AppRole)) < 0) throw new Error(id + ': ' + (s.Name || staffId) + ' has app role ' + (s.AppRole || 'none') + ' — ' + what + ' only from Field or Admin. Use ' + (what === 'expense claims' ? 'Reject' : 'Drop') + '.');
}
if (typeof quoteFromRequest === 'function') {
  var R1_qfr0_ = quoteFromRequest;
  quoteFromRequest = function (db, id, o) { r1SiteRole_(db, id, must(db, 'QuoteReqs', 'ReqID', id).StaffID, 'quote requests'); return R1_qfr0_(db, id, o); };
}
if (typeof approveClaim === 'function') {
  var R1_appr0_ = approveClaim;
  approveClaim = function (db, id, o) { r1SiteRole_(db, id, must(db, 'ExpenseClaims', 'ClaimID', id).StaffID, 'expense claims'); return R1_appr0_(db, id, o); };
}
if (typeof upgradeIE === 'function') {
  var R1_upIE0_ = upgradeIE;
  upgradeIE = function (db) {
    var d = R1_upIE0_(db);
    if (db.ss && db.hasTab('Staff') && db.headers('Staff').indexOf('AppRole') >= 0) {
      var a = ensureAllowed_(db, 'Staff', 'AppRole', ['Yard']);
      if (a.length) { d.push('Staff.AppRole dropdown + Yard'); log_(db, 'Upgrade R1', '', 'Staff.AppRole + Yard'); }
    }
    return d;
  };
}

// ======================================================================= self-test (in memory, your data is not touched)
if (typeof selfTestAllParts_ === 'function') {
  var R1_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return R1_parts0_().concat([['R1', selfTestR1()]]); };
}
function selfTestR1() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws;
  var db = testSeed_('Full period'), t0 = dayNum(today()), D = function (k) { return fromDay(t0 - k); }, yr = String(D(0).getFullYear()), JOB = 'CAE/J/2026/001';
  upgradeO6(db); upgradeO7(db); upgradeQR(db); upgradeIE(db);
  db.insert('Staff', [{ StaffID: 'STF-Y', Name: 'Yard', Email: 'Yard@Test', AppRole: 'Yard', Status: 'Active' }, { StaffID: 'STF-F', Name: 'Field', Email: 'field@test', AppRole: 'Field', Status: 'Active' },
    { StaffID: 'STF-V', Name: 'Viewer', Email: 'viewer@test', AppRole: 'Viewer', Status: 'Active' }]);
  step('Y roles', function () {
    eq('Y1 roles list', APP_ROLES_.join(','), 'Admin,Viewer,Field,Yard');
    eq('Y2 Yard may submit stock records', (function () { try { appRoleCheck_(db, 'yard@test'); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
    throws('Y3 Viewer still refused, message names Yard', function () { appRoleCheck_(db, 'viewer@test'); }, /only Field, Yard or Admin can submit/);
  });
  step('Y sweep', function () {
    db.insert('Jobs', { JobNo: JOB, CustID: 'CUST-0001', SiteID: 'SITE-0001', JobType: 'Rental', HireBasis: 'Item', Status: 'Awaiting order' });
    postOpeningStock(db, [{ ItemCode: 'RL-STD-20', Qty: 5 }], D(10));
    db.insert('Challans', { ChallanNo: 'APP-y0000001', Kind: 'Delivery', ChallanDate: D(1), JobNo: JOB, Status: 'Submitted', SubmittedBy: 'yard@test' });
    db.insert('ChallanLines', { LineID: 'APP-y01', ChallanNo: 'APP-y0000001', ItemCode: 'RL-STD-20', Qty: 2, QtyDamaged: 0, QtyLost: 0 });
    var r = appSweepRun_({ db: db, noPdf: true });
    eq('Y4 Yard challan posted by the sweep', r.posted + ' ' + (find(db.rows('Challans'), 'ChallanNo', 'CAE/DC/' + yr + '/001') || {}).Status, '1 Posted');
  });
  step('Y office panels', function () {
    var add = function (o) { db.insert('QuoteReqs', Object.assign({ ReqDate: toDate('13-Nov-2026'), Status: 'New', CustID: 'CUST-0001', WorkType: 'Rental', Details: 'Ringlock' }, o)); };
    add({ ReqID: 'QR-y1', StaffID: 'STF-Y' }); add({ ReqID: 'QR-f1', StaffID: 'STF-F' }); add({ ReqID: 'QR-o1' });
    throws('Y5 request from Yard staff refused', function () { quoteFromRequest(db, 'QR-y1'); }, /app role Yard — quote requests only from Field or Admin/);
    eq('Y6 Field + office requests still quoted', [quoteFromRequest(db, 'QR-f1', { date: '2026-11-13' }).ref, quoteFromRequest(db, 'QR-o1', { date: '2026-11-13' }).ref].join(' '), 'CAE/Q/2026/001 CAE/Q/2026/002');
    eq('Y7 Yard request can be dropped', dropRequest(db, 'QR-y1', 'yard'), 'QR-y1 dropped.');
    var cl = function (o) { db.insert('ExpenseClaims', Object.assign({ ClaimDate: toDate('12-Nov-2026'), Category: 'Transport', Payee: 'Truck', Amount: 100, ReceiptPhoto: 'a.jpg', Status: 'Submitted' }, o)); };
    cl({ ClaimID: 'CL-y', StaffID: 'STF-Y' }); cl({ ClaimID: 'CL-f', StaffID: 'STF-F' });
    throws('Y8 claim from Yard staff refused', function () { approveClaim(db, 'CL-y'); }, /expense claims only from Field or Admin/);
    eq('Y9 Field claim approved, Yard claim rejected', approveClaim(db, 'CL-f').ref + ' ' + rejectClaim(db, 'CL-y', 'yard'), 'EXP-00001 CL-y rejected.');
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
