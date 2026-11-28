// ----------------------------------------------------------------- AC1 (28 Nov): supplier bills + payments to suppliers (no PDF, no paperwork)
// User 28 Nov: the vendor's DO / invoice come from them; Accounts records the vendor invoice for payment (invoice / DO no. optional),
// linked to our quote / job / PO; a cash payment to a supplier needs no invoice / PO (direct payment = a paid bill line made with it).
// See: AC / PR level 1+, Directors. Bill write: AC or PR level 2+. Pay: AC 2+. Cancel a payment: AC head (3) or a Director.
// officeAcList(token)                 -> {can, today, bills, pays, sups, jobs, quotes, pos, vch}
// officeBillSave(token, x)            x = {id + ev (edit) | nonce (new), sup | newSup {name, phone, addr}, inv, dono, date, due, job | quote, po, amt, vat, notes} -> {id, ev}
// officeBillCancel(token, id, ev, why) -> {id}
// officePaySave(token, x)             x = {nonce, sup | newSup, date, method, ref, bank, amt, notes, mode 'bills' (alloc [{no, amt}] | none = oldest first) | 'direct' (job | quote, po, inv, dono)} -> {id, bill}
// officePayCancel(token, id, why)     -> {id}
// Codes: NOACCESS, BUSY, BADINPUT|field, NOTFOUND, STALE, DUP|bill, BILLSTATE|status, BILLPAID|amount, BILLDIRECT|PV, OVERPAY|open, PAYSTATE|status, SLOW.
var OAC_BILL_COLS_ = ['DONo', 'QuoteNo', 'Notes', 'MadeBy', 'CancelReason', 'PayID'], OAC_PAY_COLS_ = ['MadeBy', 'CancelReason'];
var OAC_METHODS_ = ['Bank transfer', 'Cheque', 'Pay order', 'Cash'];
var OAC_ID_ = /^BILL-\d{5,7}$/, OAC_PV_ = /^CAE\/PV\/20\d\d\/\d{3,6}$/, OAC_NONCE_ = /^[a-z0-9]{16,40}$/, OAC_MAX_ = 1e10;
function oAcSee_(a) { return oIsDir_(a) || (a.AC || 0) >= 1 || (a.PR || 0) >= 1; }
function oAcBillCan_(a) { return oIsDir_(a) || (a.AC || 0) >= 2 || (a.PR || 0) >= 2; }
function oAcPayCan_(a) { return oIsDir_(a) || (a.AC || 0) >= 2; }
function oAcHead_(a) { return oIsDir_(a) || (a.AC || 0) >= 3; }
function oAcObj_(x) { return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; }
function oAcSetup_(env, db) { // new columns at the end (no dropdown copied from the column before) + Cash / Cancelled valid in the dropdowns (once)
  var ok = OAC_BILL_COLS_.every(function (c) { return db.headers('Bills').indexOf(c) >= 0; }) && OAC_PAY_COLS_.every(function (c) { return db.headers('Payments').indexOf(c) >= 0; });
  if (ok && env.get('OACSET') === 1) return;
  var add = function (t, c) { if (db.ensureColumn(t, c) && db.ss) { var s = db.sheet(t), j = db.headers(t).indexOf(c) + 1; s.getRange(2, j, Math.max(s.getMaxRows() - 1, 1), 1).clearDataValidations(); } };
  OAC_BILL_COLS_.forEach(function (c) { add('Bills', c); }); OAC_PAY_COLS_.forEach(function (c) { add('Payments', c); });
  if (db.ss && typeof ensureAllowed_ === 'function') { ensureAllowed_(db, 'Payments', 'Method', OAC_METHODS_); ensureAllowed_(db, 'Payments', 'ChequeStatus', ['NA', 'Pending', 'Cleared', 'Dishonoured', 'Cancelled']); ensureAllowed_(db, 'Bills', 'Status', ['Unpaid', 'Part paid', 'Paid', 'Cancelled']); }
  env.put('OACSET', 1);
}
function oAcPaid_(db) { var m = oStMap_(); db.rows('Allocations').forEach(function (x) { if (String(x.DocType) === 'Bill') { var k = String(x.DocNo); m[k] = r2((m[k] || 0) + num(x.Amount)); } }); return m; } // bill -> paid (net of reversals)
function oAcBillEv_(b) { return oQHash_(JSON.stringify(['SupID', 'SupplierInvNo', 'DONo', 'BillDate', 'DueDate', 'PONo', 'JobNo', 'QuoteNo', 'Amount', 'VAT', 'Notes', 'Status', 'PayID'].map(function (k) { var v = b[k]; return v instanceof Date ? v.getTime() : String(v == null ? '' : v); }))); }
function oAcBill_(db, id) { var b = typeof id === 'string' && OAC_ID_.test(id) ? find(db.rows('Bills'), 'BillID', id) : null; if (!b) oFail_('NOTFOUND'); return b; }
function oAcBillOut_(b, P) {
  var id = String(b.BillID), tot = r2(num(b.Amount) + num(b.VAT)), paid = r2(P[id] || 0);
  return { id: id, sup: String(b.SupID || ''), inv: oUncell_(b.SupplierInvNo), dono: oUncell_(b.DONo), d: oDay_(b.BillDate), due: oDay_(b.DueDate), po: oUncell_(b.PONo), job: oUncell_(b.JobNo), quote: oUncell_(b.QuoteNo),
    amt: r2(num(b.Amount)), vat: r2(num(b.VAT)), tot: tot, paid: paid, bal: String(b.Status) === 'Cancelled' ? 0 : r2(tot - paid), st: String(b.Status || 'Unpaid'), notes: oUncell_(b.Notes), pv: oUncell_(b.PayID),
    by: oUncell_(b.MadeBy), reason: oUncell_(b.CancelReason), ev: oAcBillEv_(b) };
}
function oAcOpen_(db, sup, P) { // that supplier's bills with money still owed, oldest first
  return db.rows('Bills').filter(function (b) { return String(b.SupID) === sup && OAC_ID_.test(String(b.BillID)) && String(b.Status) !== 'Cancelled'; })
    .map(function (b) { var o = oAcBillOut_(b, P); o.dn = oQDn_(b.BillDate) || 0; return o; }).filter(function (o) { return o.bal > 0.005; })
    .sort(function (x, y) { return x.dn - y.dn || (x.id < y.id ? -1 : 1); });
}
function oAcVendorKey_(s) { return oUncell_(s).toLowerCase().replace(/\s+/g, ' ').trim(); }
function oAcSupIn_(db, x) { // an active supplier, or a new vendor (made only after every check: oChVendorMake_)
  if (x.newSup != null) { var v = oChVendorIn_(x.newSup), ex = db.rows('Suppliers').filter(function (s) { return !blank(s.SupID) && oAcVendorKey_(s.Name) === oAcVendorKey_(v.Name); })[0];
    if (ex && String(ex.Status) === 'Inactive') oFail_('BADINPUT|vendor (inactive)'); return ex ? { id: String(ex.SupID) } : { nv: v }; }
  var s = typeof x.sup === 'string' && x.sup ? find(db.rows('Suppliers'), 'SupID', x.sup) : null;
  if (!s || blank(s.SupID) || String(s.Status) === 'Inactive') oFail_('BADINPUT|supplier'); return { id: String(s.SupID) };
}
function oAcLinkIn_(db, x) { // optional: a job (any, closed too: late bills) or a quote (a quote that has a job books on the job); optional our PO
  var o = { JobNo: '', QuoteNo: '', PONo: '' };
  if (typeof x.job === 'string' && x.job) { var j = find(db.rows('Jobs'), 'JobNo', x.job); if (!j || blank(j.JobNo)) oFail_('BADINPUT|job'); o.JobNo = String(j.JobNo); }
  else if (typeof x.quote === 'string' && x.quote) { var q = find(db.rows('Quotes'), 'QuoteNo', x.quote); if (!q || blank(q.QuoteNo)) oFail_('BADINPUT|quote');
    var qj = find(db.rows('Jobs'), 'QuoteNo', q.QuoteNo); if (qj) o.JobNo = String(qj.JobNo); else if (oChQOk_(q)) o.QuoteNo = String(q.QuoteNo); else oFail_('BADINPUT|quote'); }
  else if (x.job != null && x.job !== '' || x.quote != null && x.quote !== '') oFail_('BADINPUT|job');
  if (typeof x.po === 'string' && x.po) { if (!db.hasTab('POs') || !find(db.rows('POs'), 'PONo', x.po)) oFail_('BADINPUT|PO'); o.PONo = x.po; } else if (x.po != null && x.po !== '') oFail_('BADINPUT|PO');
  return o;
}
function oAcDup_(db, sup, inv, id) { // the same vendor invoice no. twice (not cancelled)
  if (!sup || !inv) return; var k = oAcVendorKey_(inv);
  db.rows('Bills').forEach(function (b) { if (String(b.SupID) === sup && String(b.BillID) !== id && String(b.Status) !== 'Cancelled' && oAcVendorKey_(b.SupplierInvNo) === k) oFail_('DUP|' + String(b.BillID)); });
}
function oAcBillLocked_(b, P) { // a bill that can no longer be edited / cancelled from here
  if (String(b.Status) === 'Cancelled') oFail_('BILLSTATE|Cancelled');
  if (!blank(b.PayID)) oFail_('BILLDIRECT|' + String(b.PayID));
  var p = r2(P[String(b.BillID)] || 0); if (p > 0.005) oFail_('BILLPAID|' + p);
}
function officeAcList(token) {
  var L = officeGate_(token, null), a = oAcc_(L); if (!oAcSee_(a)) oFail_('NOACCESS');
  var env = oEnv_(), db = env.db(); if (!db) oFail_('BUSY');
  var X = oChCtx_(db), P = oAcPaid_(db), seen = oStMap_(), owed = oStMap_();
  var bills = db.rows('Bills').filter(function (b) { var n = String(b.BillID); if (!OAC_ID_.test(n) || seen[n]) return false; seen[n] = 1; return true; }).map(function (b) { return oAcBillOut_(b, P); });
  bills.forEach(function (b) { if (b.bal > 0.005) owed[b.sup] = r2((owed[b.sup] || 0) + b.bal); });
  var al = oStMap_(); db.rows('Allocations').forEach(function (x) { if (String(x.DocType) !== 'Bill') return; var p = String(x.PayID), m = al[p] = al[p] || oStMap_(); m[String(x.DocNo)] = r2((m[String(x.DocNo)] || 0) + num(x.Amount)); });
  var ps = oStMap_(), pays = db.rows('Payments').filter(function (p) { var n = String(p.PayID); if (!OAC_PV_.test(n) || ps[n] || String(p.Direction) !== 'Out' || String(p.PartyType) !== 'Supplier') return false; ps[n] = 1; return true; })
    .map(function (p) { var m = al[String(p.PayID)] || {}; return { id: String(p.PayID), d: oDay_(p.PayDate), sup: String(p.PartyID || ''), method: String(p.Method || ''), ref: oUncell_(p.RefNo), bank: oUncell_(p.Bank), amt: r2(num(p.Amount)),
      st: String(p.ChequeStatus || ''), notes: oUncell_(p.Notes), by: oUncell_(p.MadeBy), reason: oUncell_(p.CancelReason), free: r2(payAvailable(db, p)),
      al: Object.keys(m).filter(function (k) { return Math.abs(m[k]) > 0.005; }).sort().map(function (k) { return { no: k, amt: m[k] }; }) }; });
  var sups = Object.keys(X.sups).map(function (s) { var r = X.sups[s], o = { id: s, name: oUncell_(r.Name || s), phone: oUncell_(r.Phone), owed: owed[s] || 0 }; if (String(r.Status) === 'Inactive') o.off = true; return o; });
  var jobs = Object.keys(X.jobs).sort().map(function (n) { var j = X.jobs[n]; return { no: n, quote: blank(j.QuoteNo) ? '' : String(j.QuoteNo), cust: X.cust(j), st: String(j.Status || '') }; });
  var qj = oStMap_(); Object.keys(X.jobs).forEach(function (n) { var q = X.jobs[n].QuoteNo; if (!blank(q)) qj[String(q)] = n; });
  var quotes = Object.keys(X.quotes).filter(function (n) { return oChQOk_(X.quotes[n]) && !qj[n]; }).sort().map(function (n) { return { no: n, cust: X.cust(X.quotes[n]) }; });
  var pos = db.hasTab('POs') ? db.rows('POs').filter(function (p) { return !blank(p.PONo) && String(p.Status) !== 'Cancelled'; }).map(function (p) { return { no: String(p.PONo), sup: String(p.SupID || '') }; }) : [];
  var vch = db.rows('Challans').filter(function (c) { return String(c.MatSource || '') === 'Vendor' && String(c.Status) === 'Posted' && !blank(c.SupID); }) // vendor-rental challans: rent payable to that vendor
    .map(function (c) { var j = X.jobs[String(c.JobNo)]; return { no: String(c.ChallanNo), kind: String(c.Kind), sup: String(c.SupID), job: oUncell_(c.JobNo), quote: !blank(c.QuoteNo) ? String(c.QuoteNo) : j && !blank(j.QuoteNo) ? String(j.QuoteNo) : '', d: oDay_(c.ChallanDate), sref: oUncell_(c.SupplierRef) }; });
  return { can: { bill: oAcBillCan_(a), pay: oAcPayCan_(a), head: oAcHead_(a) }, today: oDayOf_(env.now()), bills: bills, pays: pays, sups: sups, jobs: jobs, quotes: quotes, pos: pos, vch: vch, methods: OAC_METHODS_.slice() };
}
function officeBillSave(token, x) {
  officeGate_(token, null);
  return oStW_(token, oAcBillCan_, function (env, db, L) {
    x = oAcObj_(x); oAcSetup_(env, db);
    var b = null, K = '';
    if (x.id != null && x.id !== '') { b = oAcBill_(db, x.id); if (typeof x.ev !== 'number' || x.ev !== oAcBillEv_(b)) oFail_('STALE'); oAcBillLocked_(b, oAcPaid_(db)); }
    else { if (typeof x.nonce !== 'string' || !OAC_NONCE_.test(x.nonce)) oFail_('BADINPUT|nonce'); K = 'OACB:' + x.nonce;
      var was = env.cget(K), w0 = was ? find(db.rows('Bills'), 'BillID', was) : null; if (w0) return { id: String(w0.BillID), ev: oAcBillEv_(w0), again: true }; } // a retried save of a new bill: that bill, never a second
    oQeRate_(env, L);
    var sup = oAcSupIn_(db, x), date = oCtDay_(x.date, env, 'bill date'); if (!date) oFail_('BADINPUT|bill date');
    var due = oCtDay_(x.due, env, 'due date'); if (due && oQDn_(due) < oQDn_(date)) oFail_('BADINPUT|due date');
    var inv = oQeTxt_(x.inv, 40, 'invoice no.'), dono = oQeTxt_(x.dono, 40, 'DO no.'), notes = oQeTxt_(x.notes, 200, 'note');
    var amt = oQeNum_(x.amt, 0.01, OAC_MAX_, 2, 'amount'), vat = x.vat == null || x.vat === '' ? 0 : oQeNum_(x.vat, 0, OAC_MAX_, 2, 'VAT'), lk = oAcLinkIn_(db, x);
    oAcDup_(db, sup.id, inv, b ? String(b.BillID) : '');
    if (sup.nv) sup.id = oChVendorMake_(db, sup.nv); // after every check: a refused save makes no vendor
    var row = { SupID: sup.id, SupplierInvNo: oCell_(inv), DONo: oCell_(dono), BillDate: date, DueDate: due, PONo: lk.PONo, JobNo: lk.JobNo, QuoteNo: lk.QuoteNo, Amount: amt, VAT: vat, Notes: oCell_(notes) }, id;
    if (b) { id = String(b.BillID); db.update('Bills', b, row); }
    else { id = oChFree_(db, 'Bills', 'BillID', function () { return nextId(db, 'BILL'); }); env.cput(K, id, 21600); row.BillID = id; row.Status = 'Unpaid'; row.MadeBy = oCell_(String(L.name || L.email)); db.insert('Bills', row); }
    var w = oCtLog_(db, b ? 'Bill edited' : 'Bill recorded', id, sup.id + (inv ? ' · ' + inv : '') + ' · Tk ' + r2(amt + vat)), o = { id: id, ev: oAcBillEv_(find(db.rows('Bills'), 'BillID', id)) };
    if (w) o.warn = w; return o;
  });
}
function officeBillCancel(token, id, ev, why) {
  officeGate_(token, null);
  return oStW_(token, oAcBillCan_, function (env, db, L) {
    oAcSetup_(env, db);
    var b = oAcBill_(db, id); if (typeof ev !== 'number' || ev !== oAcBillEv_(b)) oFail_('STALE');
    oAcBillLocked_(b, oAcPaid_(db)); var r = oQeTxt_(why, 200, 'reason', true); oQeRate_(env, L);
    db.update('Bills', b, { Status: 'Cancelled', CancelReason: oCell_(r) });
    var w = oCtLog_(db, 'Bill cancelled', String(b.BillID), r); return w ? { id: String(b.BillID), warn: w } : { id: String(b.BillID) };
  });
}
function officePaySave(token, x) {
  officeGate_(token, null);
  return oStW_(token, oAcPayCan_, function (env, db, L) {
    x = oAcObj_(x); oAcSetup_(env, db);
    if (typeof x.nonce !== 'string' || !OAC_NONCE_.test(x.nonce)) oFail_('BADINPUT|nonce');
    var K = 'OACP:' + x.nonce, R0 = env.cget(K); if (R0) return oAcPayDo_(env, db, R0); // a retry: finish what the first try started, never a second payment
    oQeRate_(env, L);
    var mode = x.mode === 'direct' || x.mode === 'bills' ? x.mode : oFail_('BADINPUT|mode');
    var date = oCtDay_(x.date, env, 'date'); if (!date || oQDn_(date) > oQDn_(new Date(env.now()))) oFail_('BADINPUT|date');
    var method = OAC_METHODS_.indexOf(x.method) >= 0 ? x.method : oFail_('BADINPUT|method');
    var ref = oQeTxt_(x.ref, 40, 'reference no.', method === 'Cheque' || method === 'Pay order'), bank = method === 'Cash' ? '' : oQeTxt_(x.bank, 60, 'bank');
    var amt = oQeNum_(x.amt, 0.01, OAC_MAX_, 2, 'amount'), notes = oQeTxt_(x.notes, 200, 'note', mode === 'direct'), sup = oAcSupIn_(db, x), als = [], bill = null;
    if (mode === 'bills') {
      if (!sup.id) oFail_('BADINPUT|supplier'); // a new vendor has no bills yet
      var open = oAcOpen_(db, sup.id, oAcPaid_(db)), tot = r2(open.reduce(function (s, o) { return s + o.bal; }, 0));
      if (Array.isArray(x.alloc) && x.alloc.length) {
        var seen = oStMap_();
        x.alloc.forEach(function (a, i) { a = oAcObj_(a); var o = open.filter(function (b) { return b.id === a.no; })[0]; if (!o || seen[o.id]) oFail_('BADINPUT|bill ' + (i + 1)); seen[o.id] = 1;
          var v = oQeNum_(a.amt, 0.01, OAC_MAX_, 2, 'bill ' + (i + 1) + ' amount'); if (v > o.bal + 0.005) oFail_('OVERPAY|' + o.bal); als.push({ no: o.id, amt: v }); });
        if (Math.abs(r2(als.reduce(function (s, a) { return s + a.amt; }, 0)) - amt) > 0.005) oFail_('BADINPUT|amount (≠ bills ticked)');
      } else {
        if (amt > tot + 0.005) oFail_('OVERPAY|' + tot);
        var left = amt; open.forEach(function (o) { if (left <= 0.005) return; var v = r2(Math.min(left, o.bal)); als.push({ no: o.id, amt: v }); left = r2(left - v); });
      }
    } else {
      var lk = oAcLinkIn_(db, x), inv = oQeTxt_(x.inv, 40, 'invoice no.'), dono = oQeTxt_(x.dono, 40, 'DO no.');
      oAcDup_(db, sup.id, inv, '');
      bill = { SupplierInvNo: oCell_(inv), DONo: oCell_(dono), PONo: lk.PONo, JobNo: lk.JobNo, QuoteNo: lk.QuoteNo, Amount: amt, VAT: 0, Notes: oCell_(notes), Status: 'Unpaid', MadeBy: oCell_(String(L.name || L.email)) };
    }
    if (sup.nv) sup.id = oChVendorMake_(db, sup.nv); // after every check
    var dc = date, pv = oChFree_(db, 'Payments', 'PayID', function () { return nextId(db, 'PV', dc); });
    if (bill) { bill.BillID = oChFree_(db, 'Bills', 'BillID', function () { return nextId(db, 'BILL'); }); bill.SupID = sup.id; bill.PayID = pv; als = [{ no: bill.BillID, amt: amt }]; }
    var R = { day: x.date, bill: bill, als: als, pay: { PayID: pv, Direction: 'Out', PartyType: 'Supplier', PartyID: sup.id, Method: method, RefNo: oCell_(ref), Bank: oCell_(bank), Amount: amt, VDSDeducted: '', Mushak66Received: 'NA',
      ChequeStatus: method === 'Bank transfer' || method === 'Cash' ? 'NA' : 'Pending', Notes: oCell_(notes), MadeBy: oCell_(String(L.name || L.email)) } };
    env.cput(K, R, 21600); // before any row: a retry with this nonce finishes these rows (same numbers)
    return oAcPayDo_(env, db, R);
  });
}
function oAcPayDo_(env, db, R) { // write what is missing: the direct bill, the payment, its allocations (each step once)
  var d = oDayCell_(R.day), b = R.bill, pv = R.pay.PayID;
  if (b && !find(db.rows('Bills'), 'BillID', b.BillID)) { var br = {}; Object.keys(b).forEach(function (k) { br[k] = b[k]; }); br.BillDate = d; db.insert('Bills', br); }
  var p = find(db.rows('Payments'), 'PayID', pv);
  if (!p) { var pr = {}; Object.keys(R.pay).forEach(function (k) { pr[k] = R.pay[k]; }); pr.PayDate = d; db.insert('Payments', pr); p = find(db.rows('Payments'), 'PayID', pv); oCtLog_(db, 'Payment recorded', pv, 'Out · ' + pr.PartyID + ' · ' + pr.Method + ' · Tk ' + pr.Amount); }
  var o = { id: pv, bill: b ? b.BillID : '' };
  if (payVoid_(String(p.ChequeStatus)) || db.rows('Allocations').some(function (a) { return String(a.PayID) === pv; })) return o;
  try { allocatePayment(db, pv, R.als.map(function (a) { return { type: 'Bill', no: a.no, amount: a.amt }; })); }
  catch (e) { o.warn = 'ALLOC'; } // a bill paid by someone else in between: the payment stays unallocated (shown; cancel it if wrong)
  return o;
}
function officePayCancel(token, id, why) {
  officeGate_(token, null);
  return oStW_(token, oAcHead_, function (env, db, L) {
    oAcSetup_(env, db);
    var p = typeof id === 'string' && OAC_PV_.test(id) ? find(db.rows('Payments'), 'PayID', id) : null;
    if (!p || String(p.Direction) !== 'Out' || String(p.PartyType) !== 'Supplier') oFail_('NOTFOUND');
    if (payVoid_(String(p.ChequeStatus))) oFail_('PAYSTATE|' + String(p.ChequeStatus));
    var r = oQeTxt_(why, 200, 'reason', true); oQeRate_(env, L);
    var net = oStMap_(); db.rows('Allocations').forEach(function (a) { if (String(a.PayID) === id) { var k = a.DocType + '|' + a.DocNo; net[k] = r2((net[k] || 0) + num(a.Amount)); } });
    var rev = Object.keys(net).filter(function (k) { return net[k] > 0.005; });
    if (rev.length) { var ids = nextIds(db, 'AL', rev.length); // reversals first: a retry after a failure finds nothing left to reverse, then marks it
      db.insert('Allocations', rev.map(function (k, i) { var s = k.split('|'); return { AllocID: ids[i], PayID: id, DocType: s[0], DocNo: s[1], Amount: -net[k] }; }));
      rev.forEach(function (k) { var s = k.split('|'); refreshDoc(db, s[0], s[1]); }); }
    db.update('Payments', p, { ChequeStatus: 'Cancelled', CancelReason: oCell_(r) });
    db.rows('Bills').forEach(function (b) { if (String(b.PayID) === id && String(b.Status) !== 'Cancelled') db.update('Bills', b, { Status: 'Cancelled', CancelReason: oCell_('Payment ' + id + ' cancelled') }); }); // its direct bill goes with it
    var w = oCtLog_(db, 'Payment cancelled', id, rev.length + ' allocations reversed · ' + r); return w ? { id: id, warn: w } : { id: id };
  });
}
