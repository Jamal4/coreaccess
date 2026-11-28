/**
 * Core Access Ops — core script (stages O2 + O3) · 10 Nov 2026
 * Install: open the "CAE Ops DB" sheet › Extensions › Apps Script › replace Code.gs with this file › Save.
 * O3 adds a second file: + › Script › name it CAE_Ops_PDF › paste CAE_Ops_PDF.gs › Save.
 * Project Settings › Time zone: (GMT+06:00) Dhaka. Reload the sheet → menu "Core Access".
 * Run "Upgrade sheet for O3" once, then "Run self-test" (works in memory; your data is not touched).
 *
 * Contents: helpers · calculated columns · data layer (sheet + memory) · numbering · quote → PI → job ·
 * challans + stock · hire billing · milestone billing · sale/service invoices · payments + allocations · PO receiving ·
 * damage → debit note · statuses · temporary menu (side panels come in O4) · self-test.
 */
var CAE_VERSION = 'O3 · 10 Nov 2026';

// ======================================================================= helpers
var MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function blank(v) { return v === '' || v === null || v === undefined; }
function num(v) {
  if (typeof v === 'number') return v;
  if (blank(v) || v instanceof Date || typeof v === 'boolean') return 0;
  var s = String(v).replace(/[,\s]/g, ''), pc = /%$/.test(s), n = parseFloat(s.replace(/%$/, ''));
  return isNaN(n) ? 0 : (pc ? n / 100 : n);
}
function r2(x) { var s = x < 0 ? -1 : 1; return s * Math.round(Math.abs(x) * 100 + 1e-7) / 100; } // = Sheets ROUND(x,2)
function lineAmt(l) { return r2(num(l.Qty) * (blank(l.Months) ? 1 : num(l.Months)) * num(l.Rate)); }
function isMilestone(l) { return String(l.Billing || '') === 'Milestone'; }
function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
function toDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return fromDay(v);
  if (blank(v)) return null;
  var m = String(v).match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) return new Date(+m[3], MONS.map(function (x) { return x.toLowerCase(); }).indexOf(m[2].toLowerCase()), +m[1]);
  var d = new Date(v);
  if (isNaN(d.getTime())) throw new Error('Not a date: ' + v);
  return d;
}
function dayNum(v) { var d = toDate(v); return d ? Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) : null; }
function fromDay(n) { var u = new Date(n * 864e5); return new Date(u.getUTCFullYear(), u.getUTCMonth(), u.getUTCDate()); }
function fmtDay(n) { var d = fromDay(n); return pad(d.getDate(), 2) + '-' + MONS[d.getMonth()] + '-' + d.getFullYear(); }
function today() { return fromDay(dayNum(new Date())); }
function find(rows, col, val) { for (var i = 0; i < rows.length; i++) if (String(rows[i][col]) === String(val)) return rows[i]; return null; }
function must(db, t, col, val) { var r = find(db.rows(t), col, val); if (!r) throw new Error(t + ': ' + val + ' not found'); return r; }
function sum(a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); }
function S(db, k, def) { var r = find(db.rows('Settings'), 'Key', k); return r && !blank(r.Value) ? r.Value : def; }
function user_() { try { return Session.getActiveUser().getEmail() || 'user'; } catch (e) { return 'script'; } }
function log_(db, action, ref, details) { db.insert('Log', { Timestamp: new Date(), User: user_(), Action: action, Ref: ref, Details: details || '' }); }
function withLock(fn) {
  if (typeof LockService === 'undefined') return fn();
  var l = LockService.getDocumentLock(); l.waitLock(30000);
  try { return fn(); } finally { l.releaseLock(); }
}
var PAY_METHODS = ['Bank transfer', 'Cheque', 'Pay order'];
var PAY_OUT_METHODS = PAY_METHODS.concat(['Cash']); // AC1 (28 Nov): cash only for payments out to suppliers; receipts stay no-cash
function payMethodsFor_(dir) { return dir === 'Out' ? PAY_OUT_METHODS : PAY_METHODS; }
function payVoid_(st) { return st === 'Dishonoured' || st === 'Cancelled'; } // AC1: a cancelled payment counts as nothing, like a dishonoured cheque
var LOC = { YARD: 'LOC-YARD', REPAIR: 'LOC-REPAIR', LOST: 'LOC-LOST', SOLD: 'LOC-SOLD', SUPPLIER: 'LOC-SUPPLIER' };

// ======================================================================= calculated columns
// {Col} = same row of this tab · [Tab.Col] = whole column of a tab. Resolved by header name, so column moves are safe.
var CALC = {
  Sequences: { NextID: '=IF({Year}="",{Prefix}&TEXT({LastNo}+1,REPT("0",{Pad})),{Prefix}&{Year}&"/"&TEXT({LastNo}+1,REPT("0",{Pad})))' },
  Items: { AvgCost: '=IFERROR(SUMIFS([POLines.Amount],[POLines.ItemCode],{ItemCode})/SUMIFS([POLines.Qty],[POLines.ItemCode],{ItemCode}),"")' },
  Quotes: {
    ValidUntil: '=IF({QuoteDate}="","",{QuoteDate}+INDEX([Settings.Value],MATCH("QuoteValidityDays",[Settings.Key],0)))',
    Subtotal: '=SUMIFS([QuoteLines.Amount],[QuoteLines.QuoteNo],{QuoteNo},[QuoteLines.Selected],"Yes")',
    VAT: '=ROUND({Subtotal}*{VATPct},2)', Total: '={Subtotal}+{VAT}', Advance: '=ROUND({Total}*{AdvancePct},2)',
  },
  QuoteLines: { Amount: '=ROUND({Qty}*IF({Months}="",1,{Months})*{Rate},2)' },
  Milestones: { Amount: '=ROUND({Pct}*SUMIFS([QuoteLines.Amount],[QuoteLines.QuoteNo],{QuoteNo},[QuoteLines.Billing],"Milestone",[QuoteLines.Selected],"Yes"),2)' },
  Proformas: {
    Paid: '=SUMIFS([Allocations.Amount],[Allocations.DocType],"PI",[Allocations.DocNo],{PINo})',
    Balance: '={Amount}-{Paid}',
  },
  Jobs: {
    ContractValue: '=IFERROR(INDEX([Quotes.Total],MATCH({QuoteNo},[Quotes.QuoteNo],0)),0)+SUMIFS([Variations.Amount],[Variations.JobNo],{JobNo},[Variations.Status],"Approved")',
    HireStart: '=IF(COUNTIFS([Challans.JobNo],{JobNo},[Challans.Kind],"Delivery",[Challans.Status],"Posted")=0,"",MINIFS([Challans.ChallanDate],[Challans.JobNo],{JobNo},[Challans.Kind],"Delivery",[Challans.Status],"Posted"))',
  },
  Damage: { Charge: '=ROUND(N({QtyDamaged})*IFERROR(INDEX([Items.RepairRate],MATCH({ItemCode},[Items.ItemCode],0))*1,0)+N({QtyLost})*IFERROR(INDEX([Items.ReplacementCost],MATCH({ItemCode},[Items.ItemCode],0))*1,0),2)' },
  Invoices: {
    DueDate: '=IF({InvDate}="","",{InvDate}+IFERROR(1*INDEX([Customers.PaymentDays],MATCH({CustID},[Customers.CustID],0)),INDEX([Settings.Value],MATCH("PaymentDaysDefault",[Settings.Key],0))*1))',
    Subtotal: '=SUMIFS([InvoiceLines.Amount],[InvoiceLines.InvNo],{InvNo})',
    VAT: '=ROUND({Subtotal}*{VATPct},2)', Total: '={Subtotal}+{VAT}', AmountDue: '={Total}-N({AdvanceAdjusted})',
    Paid: '=SUMIFS([Allocations.Amount],[Allocations.DocType],"INV",[Allocations.DocNo],{InvNo})',
    Balance: '={AmountDue}-{Paid}',
  },
  InvoiceLines: { Amount: '=ROUND({Qty}*IF({Months}="",1,{Months})*{Rate},2)' },
  Notes: { VAT: '=ROUND({Amount}*{VATPct},2)', Total: '={Amount}+{VAT}' },
  Payments: {
    Allocated: '=SUMIFS([Allocations.Amount],[Allocations.PayID],{PayID})',
    Unallocated: '=IF(OR({ChequeStatus}="Dishonoured",{ChequeStatus}="Cancelled"),0,{Amount}+IF({Mushak66Received}="Yes",N({VDSDeducted}),0)-{Allocated})',
  },
  POs: { Subtotal: '=SUMIFS([POLines.Amount],[POLines.PONo],{PONo})', VAT: '=ROUND({Subtotal}*{VATPct},2)', Total: '={Subtotal}+{VAT}' },
  POLines: {
    Amount: '=ROUND({Qty}*{Rate},2)',
    QtyReceived: '=SUMIFS([StockMoves.Qty],[StockMoves.RefType],"PO",[StockMoves.RefNo],{PONo},[StockMoves.ItemCode],{ItemCode})',
  },
  Bills: {
    Total: '={Amount}+N({VAT})',
    Paid: '=SUMIFS([Allocations.Amount],[Allocations.DocType],"Bill",[Allocations.DocNo],{BillID})',
    Balance: '={Total}-{Paid}',
  },
};
function colL(db, t, c) {
  var j = db.headers(t).indexOf(c);
  if (j < 0) throw new Error('Column ' + t + '.' + c + ' not found');
  var s = '', n = j + 1;
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
function resolveF(db, t, tpl, r) {
  return tpl.replace(/\[(\w+)\.(\w+)\]/g, function (_, T, C) { var L = colL(db, T, C); return T + '!$' + L + ':$' + L; })
    .replace(/\{(\w+)\}/g, function (_, C) { return colL(db, t, C) + r; });
}

// ======================================================================= data layer
// Sheet-backed: rows are read once per action and cached; writes go straight to the sheet.
function SheetDb(ss) { this.ss = ss || SpreadsheetApp.getActive(); this.c = {}; this.hc = {}; }
SheetDb.prototype.sheet = function (t) { var s = this.ss.getSheetByName(t); if (!s) throw new Error('Missing tab ' + t); return s; };
SheetDb.prototype.hasTab = function (t) { return !!this.ss.getSheetByName(t); };
SheetDb.prototype.headers = function (t) {
  if (!this.hc[t]) { var s = this.sheet(t); this.hc[t] = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0].map(String); }
  return this.hc[t];
};
SheetDb.prototype.rows = function (t) {
  if (!this.c[t]) {
    var s = this.sheet(t), h = this.headers(t), n = s.getLastRow(), out = [];
    if (n > 1) s.getRange(2, 1, n - 1, h.length).getValues().forEach(function (r, i) {
      if (r.every(blank)) return;
      var o = { _r: i + 2 }; h.forEach(function (k, j) { o[k] = r[j]; }); out.push(o);
    });
    this.c[t] = out;
  }
  return this.c[t];
};
function cellVal_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' && /^(0\d+|\+\d)/.test(v)) return "'" + v; // keep leading zeros / phone numbers as text
  return v;
}
SheetDb.prototype.insert = function (t, objs) {
  var arr = Array.isArray(objs) ? objs : [objs];
  if (!arr.length) return objs;
  var s = this.sheet(t), h = this.headers(t), rows = this.rows(t), calc = CALC[t] || {}, self = this;
  var start = Math.max(s.getLastRow(), 1) + 1;
  var vals = arr.map(function (o, i) {
    o._r = start + i;
    return h.map(function (k) { return calc[k] ? resolveF(self, t, calc[k], o._r) : cellVal_(o[k]); });
  });
  s.getRange(start, 1, arr.length, h.length).setValues(vals);
  arr.forEach(function (o) { rows.push(o); });
  return objs;
};
SheetDb.prototype.update = function (t, o, patch) {
  var s = this.sheet(t), h = this.headers(t);
  Object.keys(patch).forEach(function (k) {
    var j = h.indexOf(k);
    if (j < 0) throw new Error(t + ': no column ' + k);
    o[k] = patch[k];
    s.getRange(o._r, j + 1).setValue(cellVal_(patch[k]));
  });
};
SheetDb.prototype.fillFormulas = function (t) {
  var calc = CALC[t]; if (!calc) return 0;
  var s = this.sheet(t), h = this.headers(t), n = s.getLastRow(), self = this, cnt = 0;
  if (n < 2) return 0;
  var vals = s.getRange(2, 1, n - 1, h.length).getValues();
  var has = vals.map(function (r) { return r.some(function (v, j) { return !calc[h[j]] && !blank(v); }); });
  Object.keys(calc).forEach(function (k) {
    var j = h.indexOf(k); if (j < 0) return;
    s.getRange(2, j + 1, n - 1, 1).setFormulas(has.map(function (x, i) { return [x ? resolveF(self, t, calc[k], i + 2) : '']; }));
    cnt++;
  });
  return cnt;
};
// Schema upgrades (used by "Upgrade sheet"): header style copied from column A; calculated columns teal.
SheetDb.prototype.styleHeader_ = function (s, c, n) {
  var src = s.getRange(1, 1), dst = s.getRange(1, c, 1, n || 1);
  src.copyTo(dst, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
};
SheetDb.prototype.ensureTab = function (t, headers, calcCols) {
  if (this.hasTab(t)) return false;
  var s = this.ss.insertSheet(t), ref = this.ss.getSheetByName('Variations') || this.ss.getSheets()[0];
  s.getRange(1, 1, 1, headers.length).setValues([headers]);
  ref.getRange(1, 1).copyTo(s.getRange(1, 1, 1, headers.length), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  s.setFrozenRows(1);
  (calcCols || []).forEach(function (k) { var j = headers.indexOf(k); if (j >= 0) s.getRange(1, j + 1).setBackground('#17707D'); });
  this.hc[t] = headers.slice(); this.c[t] = [];
  return true;
};
SheetDb.prototype.ensureColumn = function (t, col, after) {
  var h = this.headers(t); if (h.indexOf(col) >= 0) return false;
  var s = this.sheet(t), j = after ? h.indexOf(after) : -1, at = j >= 0 ? j + 2 : h.length + 1;
  if (j >= 0) s.insertColumnAfter(j + 1); else s.insertColumnAfter(h.length);
  s.getRange(1, at).setValue(col);
  s.getRange(1, 1).copyTo(s.getRange(1, at), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  this.hc[t] = null; this.c[t] = null;
  return true;
};

// In-memory: same interface, used by the self-test (calculated columns are computed in JS instead).
function MemDb(seed) {
  this.h = {}; this.t = {};
  for (var k in seed) { this.h[k] = seed[k].h; this.t[k] = []; this.insert(k, (seed[k].rows || []).slice()); }
}
MemDb.prototype.hasTab = function (t) { return !!this.h[t]; };
MemDb.prototype.headers = function (t) { if (!this.h[t]) throw new Error('Missing tab ' + t); return this.h[t]; };
MemDb.prototype.rows = function (t) { this.headers(t); return this.t[t]; };
MemDb.prototype.insert = function (t, objs) {
  var arr = Array.isArray(objs) ? objs : [objs], h = this.headers(t), rows = this.t[t];
  arr.forEach(function (o) {
    h.forEach(function (k) { if (o[k] === undefined) o[k] = ''; });
    o._r = rows.length + 2; rows.push(o);
  });
  return objs;
};
MemDb.prototype.update = function (t, o, patch) {
  var h = this.headers(t);
  Object.keys(patch).forEach(function (k) { if (h.indexOf(k) < 0) throw new Error(t + ': no column ' + k); o[k] = patch[k]; });
};
MemDb.prototype.fillFormulas = function () { return 0; };
MemDb.prototype.ensureTab = function (t, headers) { if (this.h[t]) return false; this.h[t] = headers.slice(); this.t[t] = []; return true; };
MemDb.prototype.ensureColumn = function (t, col, after) {
  var h = this.headers(t); if (h.indexOf(col) >= 0) return false;
  var j = after ? h.indexOf(after) : -1; h.splice(j >= 0 ? j + 1 : h.length, 0, col);
  this.t[t].forEach(function (r) { r[col] = ''; });
  return true;
};

// ======================================================================= numbering
// Yearly document series (Q, PI, J, VO, OHN, DC, INV, CN, DN, PO, MR, PV) get a new Sequences row each year automatically.
function nextIds(db, series, n, date) {
  var seqs = db.rows('Sequences');
  var yearly = seqs.some(function (s) { return String(s.SeqKey).indexOf(series + '-') === 0; });
  var key = series, year = '';
  if (yearly) { year = String(toDate(date || today()).getFullYear()); key = series + '-' + year; }
  var row = find(seqs, 'SeqKey', key);
  if (!row) {
    if (!yearly) throw new Error('Unknown number series ' + series);
    var tpl = seqs.filter(function (s) { return String(s.SeqKey).indexOf(series + '-') === 0; }).pop();
    row = { SeqKey: key, Prefix: tpl.Prefix, Year: year, Pad: num(tpl.Pad) || 3, LastNo: 0 };
    db.insert('Sequences', row);
  }
  var first = num(row.LastNo) + 1, out = [];
  for (var i = 0; i < n; i++) out.push(row.Prefix + (blank(row.Year) ? '' : String(row.Year) + '/') + pad(first + i, num(row.Pad)));
  db.update('Sequences', row, { LastNo: first + n - 1 });
  return out;
}
function nextId(db, series, date) { return nextIds(db, series, 1, date)[0]; }

// ======================================================================= quotes → PI → job
function quoteLines(db, quoteNo) {
  return db.rows('QuoteLines').filter(function (l) { return String(l.QuoteNo) === String(quoteNo) && l.Selected === 'Yes'; });
}
function quoteTotals(db, quoteNo) {
  var q = must(db, 'Quotes', 'QuoteNo', quoteNo);
  var sub = r2(sum(quoteLines(db, quoteNo), lineAmt)), vat = r2(sub * num(q.VATPct)), total = r2(sub + vat);
  var adv = blank(q.AdvancePct) ? num(S(db, 'AdvancePct', 0.5)) : num(q.AdvancePct);
  return { subtotal: sub, vat: vat, total: total, advance: r2(total * adv), advancePct: adv };
}
function quoteToPI(db, quoteNo, o) {
  o = o || {};
  var q = must(db, 'Quotes', 'QuoteNo', quoteNo);
  var ex = db.rows('Proformas').filter(function (p) { return p.QuoteNo === quoteNo && p.Status !== 'Cancelled'; });
  if (ex.length && !o.force) throw new Error('Quote ' + quoteNo + ' already has ' + ex[0].PINo);
  var t = quoteTotals(db, quoteNo), amt = o.amount != null ? r2(num(o.amount)) : t.advance;
  if (!(amt > 0)) throw new Error('Advance is zero — check the quote lines and AdvancePct');
  var date = o.date ? toDate(o.date) : today();
  var pi = {
    PINo: nextId(db, 'PI', date), QuoteNo: quoteNo, PIDate: date, CustID: q.CustID,
    Description: 'Advance payable on order: ' + Math.round(t.advancePct * 100) + '% of quotation total',
    Amount: amt, DueTerms: q.QuoteType === 'Sale' ? 'Before delivery' : 'Before mobilisation', Status: 'Draft',
  };
  if (o.description) pi.Description = String(o.description); // M2: contract advance text in the same row write
  db.insert('Proformas', pi);
  try { log_(db, 'Quote → PI', pi.PINo, quoteNo + ', Tk ' + amt); } catch (e) { } // audit only: PI row already written
  return pi.PINo;
}
function quoteToJob(db, quoteNo, o) {
  o = o || {};
  var q = must(db, 'Quotes', 'QuoteNo', quoteNo);
  var ex = find(db.rows('Jobs'), 'QuoteNo', quoteNo);
  if (ex && !o.force) throw new Error('Quote ' + quoteNo + ' already has job ' + ex.JobNo);
  var type = q.QuoteType || 'Rental', hire = type === 'Rental' || type === 'Project', basis = '';
  var ql = quoteLines(db, quoteNo), ms = ql.some(isMilestone), monthly = ql.some(function (l) { return !isMilestone(l) && num(l.Months) > 0; });
  if (type === 'Rental') basis = 'Item';
  if (type === 'Project') {
    var units = ql.filter(function (l) { return !isMilestone(l); }).map(function (l) { return l.Unit; });
    basis = units.indexOf('m²') >= 0 ? 'm²' : units.indexOf('m³') >= 0 ? 'm³' : units.indexOf('set') >= 0 ? 'Set' : 'Lump sum';
  }
  if (o.hireBasis) basis = o.hireBasis;
  var date = o.date ? toDate(o.date) : today();
  var cycle = hire ? 'Monthly in advance' : type === 'Sale' ? 'One-off (sale)' : 'One-off';
  if (ms) cycle = 'Milestones' + (hire && (monthly || type === 'Rental') ? ' + monthly in advance' : '');
  var job = {
    JobNo: nextId(db, 'J', date), QuoteNo: quoteNo, CustID: q.CustID, SiteID: q.SiteID,
    ClientWONo: o.woNo || '', ClientWODate: o.woDate ? toDate(o.woDate) : '', JobType: type, HireBasis: basis,
    MinMonths: hire ? (num(q.MinMonths) || num(S(db, 'MinHireMonths', 1))) : '',
    BillingCycle: cycle, SecDepStatus: 'None', PM: o.pm || '', Status: 'Awaiting order',
  };
  if (o.extra) Object.keys(o.extra).forEach(function (k) { job[k] = o.extra[k]; }); // M2: contract fields in the same row write
  db.insert('Jobs', job);
  if (ms) linkMilestones_(db, quoteNo, job.JobNo);
  billsToJob_(db, quoteNo, job.JobNo);
  if (q.Status !== 'Accepted') db.update('Quotes', q, { Status: 'Accepted' });
  try { log_(db, 'Quote → Job', job.JobNo, quoteNo + ' (' + type + (basis ? ', ' + basis : '') + (ms ? ', milestones' : '') + ')'); } catch (e) { } // audit only: job row already written
  return job.JobNo;
}

// ======================================================================= locations + stock
function locType(db, id) { var l = find(db.rows('Locations'), 'LocID', id); return l ? l.Type : ''; }
function ensureSiteLoc(db, site) {
  if (!blank(site.LocID)) return site.LocID;
  var l = find(db.rows('Locations'), 'SiteID', site.SiteID);
  if (!l) { l = { LocID: nextId(db, 'LOC'), Name: 'Site: ' + (site.Project || site.SiteID), Type: 'Site', SiteID: site.SiteID, Status: 'Active' }; db.insert('Locations', l); }
  db.update('Sites', site, { LocID: l.LocID });
  return l.LocID;
}
function siteLoc(db, siteId) { return ensureSiteLoc(db, must(db, 'Sites', 'SiteID', siteId)); }
function stockMap(db) {
  var m = {};
  db.rows('StockMoves').forEach(function (v) {
    var q = num(v.Qty);
    if (!blank(v.ToLoc)) m[v.ItemCode + '|' + v.ToLoc] = (m[v.ItemCode + '|' + v.ToLoc] || 0) + q;
    if (!blank(v.FromLoc)) m[v.ItemCode + '|' + v.FromLoc] = (m[v.ItemCode + '|' + v.FromLoc] || 0) - q;
  });
  return m;
}
function stockAt(db, item, loc) { return stockMap(db)[item + '|' + loc] || 0; }
// Hire events for one job: deliveries count from their date, returns stop counting the day after (both days inclusive).
function jobEvents(db, jobNo) {
  var sites = {}; db.rows('Locations').forEach(function (l) { if (l.Type === 'Site') sites[l.LocID] = 1; });
  var ev = {};
  db.rows('StockMoves').forEach(function (v) {
    if (v.JobNo !== jobNo) return;
    var d = dayNum(v.MoveDate), q = num(v.Qty), e = ev[v.ItemCode] = ev[v.ItemCode] || [];
    if (sites[v.ToLoc]) e.push({ d: d, q: q });
    if (sites[v.FromLoc]) e.push({ d: d + 1, q: -q });
  });
  return ev;
}
function onHire(db, jobNo) {
  var ev = jobEvents(db, jobNo), m = {};
  Object.keys(ev).forEach(function (k) { m[k] = sum(ev[k], function (e) { return e.q; }); });
  return m;
}
function qtyOnDay(evs, d) { return sum(evs, function (e) { return e.d <= d ? e.q : 0; }); }

function postOpeningStock(db, rows, date) {
  if (!rows.length) return 0;
  var items = db.rows('Items'), d = date ? toDate(date) : today(), ids = nextIds(db, 'MV', rows.length);
  db.insert('StockMoves', rows.map(function (r, i) {
    if (!find(items, 'ItemCode', r.ItemCode)) throw new Error('Unknown item ' + r.ItemCode);
    if (!(num(r.Qty) > 0)) throw new Error('Qty must be > 0 for ' + r.ItemCode);
    return { MoveID: ids[i], MoveDate: d, ItemCode: r.ItemCode, Qty: num(r.Qty), FromLoc: LOC.SUPPLIER, ToLoc: r.LocID || LOC.YARD, RefType: 'Opening', RefNo: 'Opening stock', JobNo: '', PostedBy: user_(), PostedAt: new Date() };
  }));
  log_(db, 'Opening stock', '', rows.length + ' lines');
  return rows.length;
}

// ======================================================================= challans
// c = { kind, jobNo, date, fromLoc, toLoc, vehicle, driver, receivedBy, notes, lines: [{ itemCode, qty, qtyGood, qtyDamaged, qtyLost, remarks }] }
function createChallan(db, c) {
  var job = must(db, 'Jobs', 'JobNo', c.jobNo), kind = c.kind || 'Delivery', sl = siteLoc(db, job.SiteID);
  var dflt = {
    Delivery: [LOC.YARD, job.JobType === 'Sale' ? LOC.SOLD : sl], Sale: [LOC.YARD, LOC.SOLD], Return: [sl, LOC.YARD], Transfer: ['', ''],
  }[kind];
  if (!dflt) throw new Error('Unknown challan kind ' + kind);
  var from = c.fromLoc || dflt[0], to = c.toLoc || dflt[1];
  if (!from || !to) throw new Error('From and To locations are needed');
  var date = c.date ? toDate(c.date) : today(), no = nextId(db, 'DC', date);
  db.insert('Challans', { ChallanNo: no, Kind: kind, ChallanDate: date, JobNo: job.JobNo, FromLoc: from, ToLoc: to, Vehicle: c.vehicle || '', Driver: c.driver || '', ReceivedBy: c.receivedBy || '', Status: 'Draft', Notes: c.notes || '' });
  var ids = nextIds(db, 'CL', c.lines.length);
  db.insert('ChallanLines', c.lines.map(function (l, i) {
    return { LineID: ids[i], ChallanNo: no, ItemCode: l.itemCode, Qty: num(l.qty), QtyGood: blank(l.qtyGood) ? '' : num(l.qtyGood), QtyDamaged: num(l.qtyDamaged) || '', QtyLost: num(l.qtyLost) || '', Remarks: l.remarks || '' };
  }));
  log_(db, 'Challan created', no, kind + ' · ' + job.JobNo);
  return no;
}
function postChallan(db, no, o) {
  o = o || {};
  var c = must(db, 'Challans', 'ChallanNo', no);
  if (c.Status !== 'Draft' && !blank(c.Status)) throw new Error(no + ' is ' + c.Status + ', only Draft challans can be posted');
  var job = must(db, 'Jobs', 'JobNo', c.JobNo), kind = c.Kind, date = c.ChallanDate ? toDate(c.ChallanDate) : today();
  var lines = db.rows('ChallanLines').filter(function (l) { return l.ChallanNo === no; });
  if (!lines.length) throw new Error(no + ' has no lines');
  ['FromLoc', 'ToLoc'].forEach(function (k) { if (!locType(db, c[k])) throw new Error(no + ': unknown location ' + c[k]); });
  var items = db.rows('Items'), bal = stockMap(db), hire = onHire(db, job.JobNo), errs = [], mv = [], dmg = [];
  var fromSupplier = locType(db, c.FromLoc) === 'Supplier';
  lines.forEach(function (l) {
    var it = find(items, 'ItemCode', l.ItemCode), q = num(l.Qty);
    if (!it) { errs.push('Unknown item ' + l.ItemCode); return; }
    if (!(q > 0)) { errs.push(l.ItemCode + ': qty must be > 0'); return; }
    if (it.StockTracked !== 'Yes') return; // services / non-stock lines: no stock movement
    if (kind === 'Return') {
      var d = num(l.QtyDamaged), lo = num(l.QtyLost), g = blank(l.QtyGood) ? q - d - lo : num(l.QtyGood);
      if (g < 0 || Math.abs(g + d + lo - q) > 1e-9) { errs.push(l.ItemCode + ': good + damaged + lost must equal qty ' + q); return; }
      if ((hire[l.ItemCode] || 0) < q - 1e-9) { errs.push(l.ItemCode + ': only ' + (hire[l.ItemCode] || 0) + ' on hire for ' + job.JobNo); return; }
      hire[l.ItemCode] -= q;
      if (g) mv.push([l.ItemCode, g, c.FromLoc, c.ToLoc]);
      if (d) mv.push([l.ItemCode, d, c.FromLoc, LOC.REPAIR]);
      if (lo) mv.push([l.ItemCode, lo, c.FromLoc, LOC.LOST]);
      if (d || lo) dmg.push({ ChallanNo: no, JobNo: job.JobNo, ItemCode: l.ItemCode, QtyDamaged: d || '', QtyLost: lo || '', Status: 'Open' });
    } else {
      var k = l.ItemCode + '|' + c.FromLoc, have = bal[k] || 0;
      if (!fromSupplier && have < q - 1e-9 && !o.allowNegative) { errs.push(l.ItemCode + ': only ' + have + ' at ' + c.FromLoc + ', challan needs ' + q); return; }
      bal[k] = have - q;
      mv.push([l.ItemCode, q, c.FromLoc, c.ToLoc]);
    }
  });
  if (errs.length) throw new Error('Not posted:\n' + errs.join('\n'));
  var now = new Date(), ids = nextIds(db, 'MV', mv.length);
  db.insert('StockMoves', mv.map(function (m, i) { return { MoveID: ids[i], MoveDate: date, ItemCode: m[0], Qty: m[1], FromLoc: m[2], ToLoc: m[3], RefType: 'Challan', RefNo: no, JobNo: job.JobNo, PostedBy: user_(), PostedAt: now }; }));
  if (dmg.length) { var dids = nextIds(db, 'DMG', dmg.length); dmg.forEach(function (x, i) { x.DamageID = dids[i]; }); db.insert('Damage', dmg); }
  db.update('Challans', c, { Status: 'Posted', PostedAt: now });
  if (kind === 'Delivery' && (job.JobType === 'Rental' || job.JobType === 'Project') && ['Awaiting order', 'Mobilising', ''].indexOf(job.Status) >= 0) db.update('Jobs', job, { Status: 'On hire' });
  if (kind === 'Return' && job.Status === 'On hire') {
    var left = onHire(db, job.JobNo), any = Object.keys(left).some(function (k) { return left[k] > 0; });
    if (!any && find(db.rows('OffHire').filter(function (x) { return x.JobNo === job.JobNo; }), 'Scope', 'Full')) db.update('Jobs', job, { Status: 'Off-hire' });
  }
  log_(db, 'Challan posted', no, kind + ' · ' + mv.length + ' moves' + (dmg.length ? ' · ' + dmg.length + ' damage/loss' : ''));
  return { moves: mv.length, damage: dmg.length };
}
function cancelChallan(db, no) {
  var c = must(db, 'Challans', 'ChallanNo', no);
  if (c.Status === 'Cancelled') throw new Error(no + ' is already cancelled');
  if (c.Status === 'Posted') {
    var dm = db.rows('Damage').filter(function (x) { return x.ChallanNo === no && x.Status !== 'Cancelled'; });
    if (dm.some(function (x) { return !blank(x.DNNo); })) throw new Error(no + ': damage already charged on a debit note — cancel the note first');
    var mv = db.rows('StockMoves').filter(function (v) { return v.RefNo === no && v.RefType === 'Challan'; }), bal = stockMap(db), errs = [];
    mv.forEach(function (v) {
      var k = v.ItemCode + '|' + v.ToLoc;
      if (locType(db, v.ToLoc) !== 'Sold' && (bal[k] || 0) < num(v.Qty) - 1e-9) errs.push(v.ItemCode + ': only ' + (bal[k] || 0) + ' left at ' + v.ToLoc);
      bal[k] = (bal[k] || 0) - num(v.Qty);
    });
    if (errs.length) throw new Error('Cannot cancel:\n' + errs.join('\n'));
    var ids = nextIds(db, 'MV', mv.length), now = new Date();
    db.insert('StockMoves', mv.map(function (v, i) { return { MoveID: ids[i], MoveDate: v.MoveDate, ItemCode: v.ItemCode, Qty: num(v.Qty), FromLoc: v.ToLoc, ToLoc: v.FromLoc, RefType: 'Challan-Cancel', RefNo: no, JobNo: v.JobNo, PostedBy: user_(), PostedAt: now }; }));
    dm.forEach(function (x) { db.update('Damage', x, { Status: 'Cancelled' }); });
  }
  db.update('Challans', c, { Status: 'Cancelled' });
  log_(db, 'Challan cancelled', no, '');
}

// ======================================================================= hire billing
// Monthly in advance. Each period invoice = advance for the new period (qty on hire going in) + adjustment for the
// period just ended (PartPeriodRule "Full period": peak qty × 1 month; "Pro rata": unit-days ÷ HirePeriodDays).
// When a job ends: Final invoice with the last adjustment and a minimum-hire top-up (peak qty × MinMonths).
// Quote lines with Billing = "Milestone" are never billed here (see milestone billing).
function hireStartDay(db, jobNo) {
  var d = db.rows('Challans').filter(function (c) { return c.JobNo === jobNo && c.Kind === 'Delivery' && c.Status === 'Posted'; })
    .map(function (c) { return dayNum(c.ChallanDate); });
  return d.length ? Math.min.apply(null, d) : null;
}
function hireEndDay(db, job) {
  var oh = db.rows('OffHire').filter(function (x) { return x.JobNo === job.JobNo && x.Scope === 'Full'; });
  if (job.HireBasis === 'Item') {
    var ev = jobEvents(db, job.JobNo), left = 0, last = null;
    Object.keys(ev).forEach(function (k) { ev[k].forEach(function (e) { left += e.q; if (e.q < 0) last = Math.max(last == null ? -1e9 : last, e.d - 1); }); });
    if (left > 1e-9 || last == null) return null;
    if (!oh.length && ['Off-hire', 'Closed'].indexOf(job.Status) < 0) return null;
    return last;
  }
  if (!oh.length) return null;
  var nd = num(S(db, 'OffHireNoticeDays', 7));
  return Math.max.apply(null, oh.map(function (x) { return Math.max(dayNum(x.OffHireDate) || 0, (dayNum(x.NoticeDate) || 0) + nd); }));
}
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
    ql.filter(function (l) { return num(l.Months) > 0 && !isMilestone(l); }).forEach(function (l) {
      var qq = num(l.Qty), on = function (d) { return d >= start && (end == null || d <= end) ? qq : 0; };
      units.push({ code: l.ItemCode || '', name: l.Description, unit: l.Unit || 'lot', rate: num(l.Rate), q: on, adv: function (k, a) { return on(a); } });
    });
  }
  return units;
}
function tag_(a, b) { return fmtDay(a) + ' to ' + fmtDay(b); }
function lineName_(l) { return String(l.Description).split(' · ')[0]; }
function chargedMonths_(u, lines, t) {
  return sum(lines.filter(function (l) { return String(l.ItemCode) === String(u.code) && lineName_(l) === u.name && (!t || String(l.Description).indexOf(t) >= 0); }),
    function (l) { return lineAmt(l) / u.rate; });
}
function hireLine_(u, dm, label, P) {
  if (Math.abs(dm) < 1e-6) return null;
  if (Math.abs(dm - Math.round(dm)) < 1e-6) return { ItemCode: u.code, Description: u.name + ' · ' + label, Unit: u.unit, Qty: Math.round(dm), Months: 1, Rate: u.rate };
  var days = Math.round(dm * P);
  if (!days) return null;
  return { ItemCode: u.code, Description: u.name + ' · ' + label + ' (' + days + ' ' + u.unit + '-days)', Unit: 'day', Qty: days, Months: '', Rate: u.rate / P };
}
function adjLines_(units, a, b, lines, rule, P) {
  var t = tag_(a, b), out = [];
  units.forEach(function (u) {
    var target = 0;
    for (var d = a; d <= b; d++) { var x = u.q(d); target = rule === 'Pro rata' ? target + x / P : Math.max(target, x); }
    var l = hireLine_(u, target - chargedMonths_(u, lines, t), 'adj. ' + t, P);
    if (l) out.push(l);
  });
  return out;
}
function oneOffLines_(db, q, job) {
  if (!q) return [];
  var items = db.rows('Items');
  return quoteLines(db, q.QuoteNo).filter(function (l) {
    if (num(l.Months) > 0 || isMilestone(l)) return false;
    var it = find(items, 'ItemCode', l.ItemCode);
    return !(job.HireBasis === 'Item' && it && it.StockTracked === 'Yes');
  }).map(function (l) { return { ItemCode: l.ItemCode || '', Description: l.Description, Unit: l.Unit, Qty: num(l.Qty), Months: '', Rate: num(l.Rate) }; });
}
function voLines_(db, job) {
  var invs = db.rows('Invoices').filter(function (i) { return i.JobNo === job.JobNo && i.Status !== 'Cancelled'; }).map(function (i) { return i.InvNo; });
  var done = db.rows('InvoiceLines').filter(function (l) { return invs.indexOf(l.InvNo) >= 0; }).map(function (l) { return String(l.Description); });
  return db.rows('Variations').filter(function (v) {
    return v.JobNo === job.JobNo && v.Status === 'Approved' && !done.some(function (d) { return d.indexOf('Variation ' + v.VONo + ':') === 0; });
  }).map(function (v) { return { ItemCode: '', Description: 'Variation ' + v.VONo + ': ' + v.Description, Unit: 'lot', Qty: 1, Months: '', Rate: num(v.Amount) }; });
}
function jobVAT_(db, job) { var q = find(db.rows('Quotes'), 'QuoteNo', job.QuoteNo); return q && !blank(q.VATPct) ? num(q.VATPct) : num(S(db, 'VATPct', 0.15)); }
function unadjustedAdvance(db, job) {
  var pis = db.rows('Proformas').filter(function (p) { return p.QuoteNo === job.QuoteNo && p.Status !== 'Cancelled'; }).map(function (p) { return p.PINo; });
  var paid = sum(db.rows('Allocations').filter(function (a) { return a.DocType === 'PI' && pis.indexOf(a.DocNo) >= 0; }), function (a) { return num(a.Amount); });
  var used = sum(db.rows('Invoices').filter(function (i) { return i.JobNo === job.JobNo && i.Status !== 'Cancelled'; }), function (i) { return num(i.AdvanceAdjusted); });
  return Math.max(0, r2(paid - used));
}
function makeInvoice_(db, job, kind, date, a, b, lines) {
  var vatPct = jobVAT_(db, job), sub = r2(sum(lines, lineAmt)), tot = r2(sub + r2(sub * vatPct));
  var adv = Math.min(Math.max(tot, 0), unadjustedAdvance(db, job));
  var inv = {
    InvNo: nextId(db, 'INV', date), Kind: kind, InvDate: toDate(date), CustID: job.CustID, JobNo: job.JobNo,
    PeriodFrom: a != null ? fromDay(a) : '', PeriodTo: b != null ? fromDay(b) : '', VATPct: vatPct, AdvanceAdjusted: adv, Status: 'Draft',
  };
  db.insert('Invoices', inv);
  var ids = nextIds(db, 'IL', lines.length);
  lines.forEach(function (l, i) { l.LineID = ids[i]; l.InvNo = inv.InvNo; });
  db.insert('InvoiceLines', lines);
  log_(db, 'Invoice created', inv.InvNo, kind + ' · ' + job.JobNo + ' · Tk ' + tot + (adv ? ' (advance adjusted ' + adv + ')' : ''));
  return { no: inv.InvNo, subtotal: sub, total: tot, advance: adv, lines: lines };
}
function billJob_(db, job, asOf, P, rule) {
  var start = hireStartDay(db, job.JobNo); if (start == null) return [];
  var q = find(db.rows('Quotes'), 'QuoteNo', job.QuoteNo), end = hireEndDay(db, job);
  var invs = db.rows('Invoices').filter(function (i) { return i.JobNo === job.JobNo && i.Status !== 'Cancelled' && (i.Kind === 'Hire' || i.Kind === 'Final'); });
  if (invs.some(function (i) { return i.Kind === 'Final'; })) return [];
  var nos = invs.map(function (i) { return i.InvNo; });
  var jl = db.rows('InvoiceLines').filter(function (l) { return nos.indexOf(l.InvNo) >= 0; });
  var ks = invs.filter(function (i) { return i.Kind === 'Hire' && !blank(i.PeriodFrom); }).map(function (i) { return Math.round((dayNum(i.PeriodFrom) - start) / P); });
  var k = ks.length ? Math.max.apply(null, ks) + 1 : 0;
  var units = hireUnits(db, job, q, start, end);
  var noRate = units.filter(function (u) { return !(u.rate > 0); }).map(function (u) { return u.name; });
  if (noRate.length) throw new Error(job.JobNo + ': no hire rate for ' + noRate.join(', ') + ' (quote line or Items.HireRateMonth)');
  var out = [];
  for (; ; k++) {
    var a = start + k * P, b = a + P - 1;
    if (a > asOf || (end != null && a > end)) break;
    var lines = k === 0 ? oneOffLines_(db, q, job) : [];
    units.forEach(function (u) { var qa = u.adv(k, a); if (qa > 0) lines.push({ ItemCode: u.code, Description: u.name + ' · hire ' + tag_(a, b), Unit: u.unit, Qty: qa, Months: 1, Rate: u.rate }); });
    if (k > 0) lines = lines.concat(adjLines_(units, a - P, a - 1, jl, rule, P));
    lines = lines.concat(voLines_(db, job));
    if (!lines.length) continue;
    var inv = makeInvoice_(db, job, 'Hire', fromDay(a), a, b, lines);
    jl = jl.concat(inv.lines); out.push(inv);
  }
  if (end != null && end <= asOf && k > 0) {
    var la = start + (k - 1) * P, lb = la + P - 1, fl = adjLines_(units, la, lb, jl, rule, P), all = jl.concat(fl);
    var minM = num(job.MinMonths) || num(S(db, 'MinHireMonths', 0));
    if (minM > 0) units.forEach(function (u) {
      var peak = 0; for (var d = start; d <= end; d++) peak = Math.max(peak, u.q(d));
      var l = hireLine_(u, peak * minM - chargedMonths_(u, all, null), 'min. hire top-up (' + minM + ' month' + (minM > 1 ? 's' : '') + ')', P);
      if (l && l.Qty > 0) fl.push(l);
    });
    fl = fl.concat(voLines_(db, job));
    if (fl.length) out.push(makeInvoice_(db, job, 'Final', fromDay(asOf), la, lb, fl));
    if (job.Status === 'On hire') db.update('Jobs', job, { Status: 'Off-hire' });
  }
  return out;
}
function runHireBilling(db, asOf, o) {
  o = o || {};
  var d = dayNum(asOf || today()), P = num(S(db, 'HirePeriodDays', 30)) || 30, rule = S(db, 'PartPeriodRule', 'Full period');
  var made = [], warn = [];
  db.rows('Jobs').forEach(function (j) {
    if ((j.JobType !== 'Rental' && j.JobType !== 'Project') || j.Status === 'Closed' || blank(j.HireBasis)) return;
    if (o.jobNo && j.JobNo !== o.jobNo) return;
    try { made = made.concat(billJob_(db, j, d, P, rule)); } catch (e) { warn.push(e.message); }
  });
  log_(db, 'Hire billing', fmtDay(d), made.length + ' invoices' + (warn.length ? ' · ' + warn.length + ' warnings' : ''));
  return { invoices: made, warnings: warn };
}

// ======================================================================= milestone (stage) billing
// Quote lines with Billing = "Milestone" form one lump sum, billed in stages (Milestones tab: % per stage, total 100 %).
// Stage amounts = % × milestone subtotal; the last stage takes the rounding remainder. Works alongside monthly
// (Months > 0) and one-off lines on the same quote. Invoices have Kind "Milestone"; any unused advance is set off.
function milestoneBase(db, quoteNo) { return r2(sum(quoteLines(db, quoteNo).filter(isMilestone), lineAmt)); }
function milestoneRows(db, quoteNo) {
  return db.rows('Milestones').filter(function (m) { return String(m.QuoteNo) === String(quoteNo) && m.Status !== 'Cancelled'; })
    .sort(function (a, b) { return num(a.StageNo) - num(b.StageNo); });
}
function parseStages_(s) {
  return String(s).split('|').map(function (x) { var p = x.split(':'); return [p[0].trim(), num(p[1]) / (num(p[1]) > 1 ? 100 : 1)]; })
    .filter(function (p) { return p[0] && p[1] > 0; });
}
// stages = [[name, pct], ...] (pct as 0.4 or 40); omitted = Settings MilestoneStages
function setMilestones(db, quoteNo, stages) {
  var q = must(db, 'Quotes', 'QuoteNo', quoteNo);
  if (!quoteLines(db, quoteNo).some(isMilestone)) throw new Error(quoteNo + ': no quote line has Billing = Milestone');
  stages = (stages || parseStages_(S(db, 'MilestoneStages', 'Erection complete:40|Mid-way:30|Dismantling complete:30')))
    .map(function (s) { return [s[0], num(s[1]) > 1 ? num(s[1]) / 100 : num(s[1])]; });
  var tot = sum(stages, function (s) { return s[1]; });
  if (Math.abs(tot - 1) > 1e-6) throw new Error('Stage percentages add up to ' + r2(tot * 100) + ' %, not 100 %');
  var old = milestoneRows(db, quoteNo);
  if (old.some(function (m) { return m.Status !== 'Pending'; })) throw new Error(quoteNo + ': a stage is already reached or invoiced — change stages by variation instead');
  old.forEach(function (m) { db.update('Milestones', m, { Status: 'Cancelled' }); });
  var job = find(db.rows('Jobs'), 'QuoteNo', quoteNo), ids = nextIds(db, 'MS', stages.length);
  db.insert('Milestones', stages.map(function (s, i) { return { MilestoneID: ids[i], QuoteNo: q.QuoteNo, JobNo: job ? job.JobNo : '', StageNo: i + 1, Stage: s[0], Pct: s[1], Status: 'Pending' }; }));
  log_(db, 'Milestones set', quoteNo, stages.map(function (s) { return s[0] + ' ' + r2(s[1] * 100) + '%'; }).join('; '));
  return stages.length;
}
function linkMilestones_(db, quoteNo, jobNo) {
  if (!milestoneRows(db, quoteNo).length) setMilestones(db, quoteNo);
  milestoneRows(db, quoteNo).forEach(function (m) { if (blank(m.JobNo)) db.update('Milestones', m, { JobNo: jobNo }); });
}
function milestoneAmounts(db, quoteNo) {
  var base = milestoneBase(db, quoteNo), ms = milestoneRows(db, quoteNo), done = 0;
  return ms.map(function (m, i) {
    var amt = i === ms.length - 1 ? r2(base - done) : r2(base * num(m.Pct)); done = r2(done + amt);
    return { row: m, amount: amt };
  });
}
function reachMilestone(db, jobNo, stageNo, date) {
  var job = must(db, 'Jobs', 'JobNo', jobNo), m = find(milestoneRows(db, job.QuoteNo), 'StageNo', stageNo);
  if (!m) throw new Error(jobNo + ': no stage ' + stageNo);
  if (m.Status !== 'Pending') throw new Error(jobNo + ' stage ' + stageNo + ' is already ' + m.Status);
  db.update('Milestones', m, { Status: 'Reached', ReachedDate: date ? toDate(date) : today() });
  log_(db, 'Milestone reached', jobNo, 'Stage ' + stageNo + ' ' + m.Stage);
  return m.Stage;
}
function invoiceMilestones(db, jobNo, o) {
  o = o || {};
  var job = must(db, 'Jobs', 'JobNo', jobNo), list = milestoneAmounts(db, job.QuoteNo);
  if (!list.length) throw new Error(jobNo + ': no milestones');
  var tot = sum(list, function (x) { return num(x.row.Pct); });
  if (Math.abs(tot - 1) > 1e-6) throw new Error(jobNo + ': stage percentages add up to ' + r2(tot * 100) + ' %, not 100 %');
  var due = list.filter(function (x) { return x.row.Status === 'Reached'; });
  if (!due.length) throw new Error(jobNo + ': no stage reached and not yet invoiced');
  var what = quoteLines(db, job.QuoteNo).filter(isMilestone).map(function (l) { return l.Description; }).join('; ');
  var lines = due.map(function (x) {
    return { ItemCode: '', Description: 'Stage ' + x.row.StageNo + ': ' + x.row.Stage + ' · ' + r2(num(x.row.Pct) * 100) + '% of ' + what, Unit: 'lot', Qty: 1, Months: '', Rate: x.amount };
  });
  var inv = makeInvoice_(db, job, 'Milestone', o.date ? toDate(o.date) : today(), null, null, lines.concat(voLines_(db, job)));
  due.forEach(function (x) { db.update('Milestones', x.row, { Status: 'Invoiced', InvNo: inv.no }); });
  return inv;
}

// Sale / Service jobs (and one-off extras): invoice the selected quote lines + approved variations (milestone lines excluded).
function invoiceFromQuote(db, jobNo, o) {
  o = o || {};
  var job = must(db, 'Jobs', 'JobNo', jobNo), q = must(db, 'Quotes', 'QuoteNo', job.QuoteNo);
  var ex = db.rows('Invoices').filter(function (i) { return i.JobNo === jobNo && i.Status !== 'Cancelled' && (i.Kind === 'Sale' || i.Kind === 'Service'); });
  if (ex.length && !o.force) throw new Error(jobNo + ' already invoiced: ' + ex[0].InvNo);
  var lines = quoteLines(db, q.QuoteNo).filter(function (l) { return !isMilestone(l); }).map(function (l) { return { ItemCode: l.ItemCode || '', Description: l.Description, Unit: l.Unit, Qty: num(l.Qty), Months: blank(l.Months) ? '' : num(l.Months), Rate: num(l.Rate) }; });
  lines = lines.concat(voLines_(db, job));
  if (!lines.length) throw new Error(q.QuoteNo + ' has no selected lines outside milestones');
  return makeInvoice_(db, job, job.JobType === 'Sale' ? 'Sale' : 'Service', o.date ? toDate(o.date) : today(), null, null, lines);
}

// ======================================================================= payments + allocations (no cash)
function allocSum_(db, type, no, payId) {
  return sum(db.rows('Allocations').filter(function (a) { return a.DocType === type && a.DocNo === no && (!payId || a.PayID === payId); }), function (a) { return num(a.Amount); });
}
function invTotal(db, invNo) {
  var i = must(db, 'Invoices', 'InvNo', invNo), sub = r2(sum(db.rows('InvoiceLines').filter(function (l) { return l.InvNo === invNo; }), lineAmt));
  return r2(sub + r2(sub * num(i.VATPct)));
}
function docInfo(db, type, no) {
  var r, total, date, party;
  if (type === 'PI') { r = must(db, 'Proformas', 'PINo', no); total = num(r.Amount); date = r.PIDate; party = r.CustID; }
  else if (type === 'INV') { r = must(db, 'Invoices', 'InvNo', no); total = r2(invTotal(db, no) - num(r.AdvanceAdjusted)); date = r.InvDate; party = r.CustID; }
  else if (type === 'DN') { r = must(db, 'Notes', 'NoteNo', no); total = r2(num(r.Amount) + r2(num(r.Amount) * num(r.VATPct))); date = r.NoteDate; party = r.CustID; }
  else if (type === 'Bill') { r = must(db, 'Bills', 'BillID', no); total = r2(num(r.Amount) + num(r.VAT)); date = r.BillDate; party = r.SupID; }
  else throw new Error('Unknown document type ' + type);
  var paid = r2(allocSum_(db, type, no));
  return { row: r, total: total, paid: paid, balance: r2(total - paid), date: dayNum(date) || 0, party: party };
}
function refreshDoc(db, type, no) {
  var x = docInfo(db, type, no), r = x.row, st = r.Status;
  if (st === 'Cancelled') return st;
  var done = x.balance <= 0.005 && (x.paid > 0.005 || (type === 'INV' && num(r.AdvanceAdjusted) > 0));
  if (type === 'Bill') st = done ? 'Paid' : x.paid > 0.005 ? 'Part paid' : 'Unpaid';
  else if (type !== 'DN') st = done ? 'Paid' : x.paid > 0.005 ? 'Part paid' : (['Paid', 'Part paid'].indexOf(st) >= 0 ? 'Sent' : st);
  var t = { PI: 'Proformas', INV: 'Invoices', Bill: 'Bills' }[type];
  if (t && st !== r.Status) db.update(t, r, { Status: st });
  return st;
}
function openDocs(db, partyType, partyId) {
  var out = [];
  if (partyType === 'Supplier') {
    db.rows('Bills').forEach(function (b) { if (b.SupID === partyId && b.Status !== 'Cancelled') out.push(['Bill', b.BillID]); });
  } else {
    var invoicedJobs = {}; db.rows('Invoices').forEach(function (i) { if (i.Status !== 'Cancelled') invoicedJobs[i.JobNo] = 1; });
    db.rows('Proformas').forEach(function (p) {
      if (p.CustID !== partyId || p.Status === 'Cancelled') return;
      var j = find(db.rows('Jobs'), 'QuoteNo', p.QuoteNo);
      if (j && invoicedJobs[j.JobNo]) return; // advance stage over; money now goes to invoices
      out.push(['PI', p.PINo]);
    });
    db.rows('Invoices').forEach(function (i) { if (i.CustID === partyId && i.Status !== 'Cancelled') out.push(['INV', i.InvNo]); });
    db.rows('Notes').forEach(function (n) { if (n.CustID === partyId && n.Kind === 'DN' && n.Status !== 'Cancelled') out.push(['DN', n.NoteNo]); });
  }
  var order = { PI: 0, INV: 1, DN: 2, Bill: 3 };
  return out.map(function (d) { var x = docInfo(db, d[0], d[1]); return { type: d[0], no: d[1], balance: x.balance, date: x.date }; })
    .filter(function (d) { return d.balance > 0.005; })
    .sort(function (a, b) { return a.date - b.date || order[a.type] - order[b.type] || (a.no < b.no ? -1 : 1); });
}
function payAvailable(db, p) {
  if (payVoid_(p.ChequeStatus)) return 0;
  var cap = num(p.Amount) + (p.Mushak66Received === 'Yes' ? num(p.VDSDeducted) : 0);
  return r2(cap - sum(db.rows('Allocations').filter(function (a) { return a.PayID === p.PayID; }), function (a) { return num(a.Amount); }));
}
// p = { Direction, PayDate, PartyType, PartyID, Method, RefNo, Bank, Amount, VDSDeducted, Mushak66Received, Notes }
function recordPayment(db, p, o) {
  o = o || {};
  if (payMethodsFor_(p.Direction).indexOf(p.Method) < 0) throw new Error('Payment method must be: ' + payMethodsFor_(p.Direction).join(', ') + (p.Direction === 'Out' ? '' : ' (no cash)'));
  if (!(num(p.Amount) > 0)) throw new Error('Amount must be > 0');
  var party = p.PartyType === 'Supplier' ? ['Suppliers', 'SupID'] : ['Customers', 'CustID'];
  must(db, party[0], party[1], p.PartyID);
  var date = p.PayDate ? toDate(p.PayDate) : today();
  var row = {
    PayID: nextId(db, p.Direction === 'Out' ? 'PV' : 'MR', date), Direction: p.Direction || 'In', PayDate: date, PartyType: p.PartyType || 'Customer',
    PartyID: p.PartyID, Method: p.Method, RefNo: p.RefNo || '', Bank: p.Bank || '', Amount: num(p.Amount), VDSDeducted: num(p.VDSDeducted) || '',
    Mushak66Received: p.Mushak66Received || (num(p.VDSDeducted) ? 'No' : 'NA'), ChequeStatus: p.Method === 'Bank transfer' || p.Method === 'Cash' ? 'NA' : 'Pending', Notes: p.Notes || '',
  };
  db.insert('Payments', row);
  log_(db, 'Payment recorded', row.PayID, row.Direction + ' · ' + row.PartyID + ' · Tk ' + row.Amount);
  if (o.allocate !== false) allocatePayment(db, row.PayID, o.allocations);
  return row.PayID;
}
// allocations = [{ type, no, amount }] or omitted for oldest-first automatic allocation
function allocatePayment(db, payId, allocations) {
  var p = must(db, 'Payments', 'PayID', payId);
  if (payVoid_(p.ChequeStatus)) throw new Error(payId + ' is ' + String(p.ChequeStatus).toLowerCase());
  var avail = payAvailable(db, p), list = [];
  if (allocations && allocations.length) {
    allocations.forEach(function (a) {
      var x = docInfo(db, a.type, a.no);
      if (x.party !== p.PartyID) throw new Error(a.no + ' belongs to ' + x.party + ', not ' + p.PartyID);
      if (num(a.amount) > x.balance + 0.005) throw new Error(a.no + ': only ' + x.balance + ' open');
      list.push({ type: a.type, no: a.no, amt: r2(num(a.amount)) });
    });
    if (sum(list, function (a) { return a.amt; }) > avail + 0.005) throw new Error(payId + ': only ' + avail + ' unallocated');
  } else {
    openDocs(db, p.PartyType, p.PartyID).forEach(function (d) {
      if (avail <= 0.005) return;
      var amt = r2(Math.min(avail, d.balance)); list.push({ type: d.type, no: d.no, amt: amt }); avail = r2(avail - amt);
    });
  }
  if (!list.length) return [];
  var ids = nextIds(db, 'AL', list.length);
  db.insert('Allocations', list.map(function (a, i) { return { AllocID: ids[i], PayID: payId, DocType: a.type, DocNo: a.no, Amount: a.amt }; }));
  list.forEach(function (a) { refreshDoc(db, a.type, a.no); });
  log_(db, 'Payment allocated', payId, list.map(function (a) { return a.no + ' ' + a.amt; }).join('; '));
  return list;
}
function billsToJob_(db, quoteNo, jobNo) { // AC1: supplier bills booked on a quote before its job existed now count on the job (job P/L)
  if (!db.hasTab || !db.hasTab('Bills') || db.headers('Bills').indexOf('QuoteNo') < 0) return 0;
  var n = 0; db.rows('Bills').forEach(function (b) { if (String(b.QuoteNo) === String(quoteNo) && blank(b.JobNo)) { db.update('Bills', b, { JobNo: jobNo }); n++; } }); return n;
}
function chequeCleared(db, payId) { db.update('Payments', must(db, 'Payments', 'PayID', payId), { ChequeStatus: 'Cleared' }); log_(db, 'Cheque cleared', payId, ''); }
function chequeDishonoured(db, payId) {
  var p = must(db, 'Payments', 'PayID', payId), net = {};
  if (payVoid_(p.ChequeStatus)) throw new Error(payId + ' is already ' + String(p.ChequeStatus).toLowerCase()); // AC1 step R: a cancelled payment is never turned into a dishonoured one (and the reverse)
  db.rows('Allocations').forEach(function (a) { if (a.PayID === payId) { var k = a.DocType + '|' + a.DocNo; net[k] = (net[k] || 0) + num(a.Amount); } });
  var rev = Object.keys(net).filter(function (k) { return net[k] > 0.005; });
  if (rev.length) {
    var ids = nextIds(db, 'AL', rev.length);
    db.insert('Allocations', rev.map(function (k, i) { var s = k.split('|'); return { AllocID: ids[i], PayID: payId, DocType: s[0], DocNo: s[1], Amount: -r2(net[k]) }; }));
    rev.forEach(function (k) { var s = k.split('|'); refreshDoc(db, s[0], s[1]); });
  }
  db.update('Payments', p, { ChequeStatus: 'Dishonoured' });
  log_(db, 'Cheque dishonoured', payId, rev.length + ' allocations reversed');
}

// ======================================================================= purchasing
function receivePO(db, poNo, lines, date) {
  var po = must(db, 'POs', 'PONo', poNo), items = db.rows('Items');
  if (['Cancelled', 'Closed'].indexOf(po.Status) >= 0) throw new Error(poNo + ' is ' + po.Status);
  var pl = db.rows('POLines').filter(function (l) { return l.PONo === poNo; });
  var got = {}; db.rows('StockMoves').forEach(function (v) { if (v.RefType === 'PO' && v.RefNo === poNo) got[v.ItemCode] = (got[v.ItemCode] || 0) + num(v.Qty); });
  var ord = {}; pl.forEach(function (l) { var it = find(items, 'ItemCode', l.ItemCode); if (it && it.StockTracked === 'Yes') ord[l.ItemCode] = (ord[l.ItemCode] || 0) + num(l.Qty); });
  if (!lines) lines = Object.keys(ord).map(function (k) { return { itemCode: k, qty: ord[k] - (got[k] || 0) }; }).filter(function (l) { return l.qty > 0; });
  var errs = [];
  lines.forEach(function (l) { if (!(ord[l.itemCode] > 0)) errs.push(l.itemCode + ' is not a stock line on ' + poNo); else if ((got[l.itemCode] || 0) + num(l.qty) > ord[l.itemCode] + 1e-9) errs.push(l.itemCode + ': receiving more than ordered'); });
  if (errs.length) throw new Error(errs.join('\n'));
  if (!lines.length) throw new Error(poNo + ': nothing outstanding');
  var to = locType(db, po.DeliverTo) ? po.DeliverTo : LOC.YARD, d = date ? toDate(date) : today(), ids = nextIds(db, 'MV', lines.length), now = new Date();
  db.insert('StockMoves', lines.map(function (l, i) { got[l.itemCode] = (got[l.itemCode] || 0) + num(l.qty); return { MoveID: ids[i], MoveDate: d, ItemCode: l.itemCode, Qty: num(l.qty), FromLoc: LOC.SUPPLIER, ToLoc: to, RefType: 'PO', RefNo: poNo, JobNo: po.JobNo || '', PostedBy: user_(), PostedAt: now }; }));
  var all = Object.keys(ord).every(function (k) { return (got[k] || 0) >= ord[k] - 1e-9; });
  db.update('POs', po, { Status: all ? 'Received' : 'Part received' });
  log_(db, 'PO received', poNo, lines.map(function (l) { return l.itemCode + ' ' + l.qty; }).join('; '));
  return all ? 'Received' : 'Part received';
}

// ======================================================================= damage → debit note
function damageCharge(db, d) {
  var it = must(db, 'Items', 'ItemCode', d.ItemCode);
  return r2(num(d.QtyDamaged) * num(it.RepairRate) + num(d.QtyLost) * num(it.ReplacementCost));
}
function damageToDebitNote(db, jobNo, o) {
  o = o || {};
  var job = must(db, 'Jobs', 'JobNo', jobNo);
  var dm = db.rows('Damage').filter(function (d) { return d.JobNo === jobNo && d.Status === 'Open' && blank(d.DNNo); });
  if (!dm.length) throw new Error(jobNo + ': no open damage / loss');
  var items = db.rows('Items'), miss = [];
  dm.forEach(function (d) { var it = find(items, 'ItemCode', d.ItemCode); if ((num(d.QtyDamaged) && !num(it.RepairRate)) || (num(d.QtyLost) && !num(it.ReplacementCost))) miss.push(d.ItemCode); });
  if (miss.length) throw new Error('Set RepairRate / ReplacementCost in Items for: ' + miss.join(', '));
  var date = o.date ? toDate(o.date) : today(), no = nextId(db, 'DN', date), amt = r2(sum(dm, function (d) { return damageCharge(db, d); }));
  var reason = 'Damage / loss on return: ' + dm.map(function (d) {
    var it = find(items, 'ItemCode', d.ItemCode); return (num(d.QtyDamaged) ? num(d.QtyDamaged) + ' damaged' : '') + (num(d.QtyDamaged) && num(d.QtyLost) ? ', ' : '') + (num(d.QtyLost) ? num(d.QtyLost) + ' lost' : '') + ' ' + it.Name + ' (' + d.ChallanNo + ')';
  }).join('; ');
  db.insert('Notes', { NoteNo: no, Kind: 'DN', NoteDate: date, InvNo: o.invNo || '', JobNo: jobNo, CustID: job.CustID, Reason: reason, Amount: amt, VATPct: jobVAT_(db, job), Status: 'Draft' });
  dm.forEach(function (d) { db.update('Damage', d, { DNNo: no, Status: 'Charged' }); });
  log_(db, 'Debit note', no, jobNo + ' · Tk ' + amt);
  return no;
}

// ======================================================================= new rows, defaults, statuses
var ID_SERIES = {
  Staff: ['StaffID', 'STF'], Customers: ['CustID', 'CUST'], Sites: ['SiteID', 'SITE'], Suppliers: ['SupID', 'SUP'], Terms: ['ClauseID', 'TC'],
  Quotes: ['QuoteNo', 'Q', 'QuoteDate'], QuoteLines: ['LineID', 'QL'], Milestones: ['MilestoneID', 'MS'], Proformas: ['PINo', 'PI', 'PIDate'], Jobs: ['JobNo', 'J'],
  Variations: ['VONo', 'VO', 'VODate'], OffHire: ['OHNNo', 'OHN', 'NoticeDate'], Challans: ['ChallanNo', 'DC', 'ChallanDate'], ChallanLines: ['LineID', 'CL'],
  Damage: ['DamageID', 'DMG'], Invoices: ['InvNo', 'INV', 'InvDate'], InvoiceLines: ['LineID', 'IL'],
  Notes: ['NoteNo', function (r) { return r.Kind === 'CN' ? 'CN' : 'DN'; }, 'NoteDate'],
  Payments: ['PayID', function (r) { return r.Direction === 'Out' ? 'PV' : 'MR'; }, 'PayDate'],
  Allocations: ['AllocID', 'AL'], POs: ['PONo', 'PO', 'PODate'], POLines: ['LineID', 'POL'], Bills: ['BillID', 'BILL'], Expenses: ['ExpID', 'EXP'],
};
function defaults_(db, t, r) {
  var p = {}, set = function (k, v) { if (blank(r[k]) && !blank(v)) p[k] = v; };
  var st = { Customers: 'Active', Suppliers: 'Active', Staff: 'Active', Sites: 'Active', Quotes: 'Draft', Proformas: 'Draft', Jobs: 'Awaiting order', Variations: 'Draft', Challans: 'Draft', Invoices: 'Draft', Notes: 'Draft', POs: 'Draft', Bills: 'Unpaid', Damage: 'Open', Milestones: 'Pending' }[t];
  if (st) set('Status', st);
  if (t === 'Customers') set('PaymentDays', num(S(db, 'PaymentDaysDefault', 7)));
  if (t === 'Quotes') { set('Rev', 0); set('QuoteDate', today()); set('VATPct', num(S(db, 'VATPct', 0.15))); set('AdvancePct', num(S(db, 'AdvancePct', 0.5))); if (r.QuoteType === 'Rental' || r.QuoteType === 'Project') set('MinMonths', num(S(db, 'MinHireMonths', 1))); }
  if (t === 'Invoices' || t === 'POs' || t === 'Notes') set('VATPct', num(S(db, 'VATPct', 0.15)));
  if (t === 'QuoteLines') {
    set('Selected', 'Yes'); set('Optional', 'No');
    set('LineNo', db.rows('QuoteLines').filter(function (l) { return l.QuoteNo === r.QuoteNo && !blank(l.LineID); }).length + 1);
    var it = find(db.rows('Items'), 'ItemCode', r.ItemCode), q = find(db.rows('Quotes'), 'QuoteNo', r.QuoteNo);
    if (it) { set('Description', it.Name); set('Unit', it.Unit); set('Rate', q && q.QuoteType === 'Sale' ? num(it.SalePrice) || '' : num(it.HireRateMonth) || ''); }
  }
  if (t === 'Milestones') { var j = find(db.rows('Jobs'), 'QuoteNo', r.QuoteNo); if (j) set('JobNo', j.JobNo); }
  if (t === 'Payments') { set('Direction', 'In'); set('PartyType', r.Direction === 'Out' ? 'Supplier' : 'Customer'); set('ChequeStatus', r.Method === 'Bank transfer' || r.Method === 'Cash' ? 'NA' : 'Pending'); }
  return p;
}
function assignIds(db) {
  var n = 0;
  Object.keys(ID_SERIES).forEach(function (t) {
    if (db.hasTab && !db.hasTab(t)) return;
    var cfg = ID_SERIES[t], idc = cfg[0], h = db.headers(t), calc = CALC[t] || {};
    db.rows(t).forEach(function (r) {
      if (!blank(r[idc])) return;
      if (!h.some(function (k) { return k !== idc && !calc[k] && !blank(r[k]); })) return;
      if (t === 'Payments' && payMethodsFor_(r.Direction).indexOf(r.Method) < 0) throw new Error('Payments row ' + r._r + ': method must be ' + payMethodsFor_(r.Direction).join(' / ') + (r.Direction === 'Out' ? '' : ' (no cash)'));
      var ser = typeof cfg[1] === 'function' ? cfg[1](r) : cfg[1], p = {};
      p[idc] = nextId(db, ser, cfg[2] && !blank(r[cfg[2]]) ? r[cfg[2]] : today());
      var d = defaults_(db, t, r); for (var k in d) p[k] = d[k];
      db.update(t, r, p); n++;
    });
  });
  db.rows('Sites').forEach(function (s) { if (!blank(s.SiteID)) ensureSiteLoc(db, s); });
  Object.keys(CALC).forEach(function (t) { if (!db.hasTab || db.hasTab(t)) db.fillFormulas(t); });
  log_(db, 'Number new rows', '', n + ' rows');
  return n;
}
function refreshStatuses(db, asOf) {
  var d = dayNum(asOf || today()), vd = num(S(db, 'QuoteValidityDays', 30)), pd = num(S(db, 'PaymentDaysDefault', 7)), c = 0;
  db.rows('Quotes').forEach(function (q) {
    if (['Draft', 'Sent'].indexOf(q.Status) >= 0 && dayNum(q.QuoteDate) != null && dayNum(q.QuoteDate) + vd < d) { db.update('Quotes', q, { Status: 'Expired' }); c++; }
  });
  db.rows('Proformas').forEach(function (p) { if (!blank(p.PINo)) refreshDoc(db, 'PI', p.PINo); });
  db.rows('Bills').forEach(function (b) { if (!blank(b.BillID)) refreshDoc(db, 'Bill', b.BillID); });
  db.rows('Invoices').forEach(function (i) {
    if (blank(i.InvNo)) return;
    var st = refreshDoc(db, 'INV', i.InvNo), cu = find(db.rows('Customers'), 'CustID', i.CustID);
    var due = dayNum(i.InvDate) + (cu && !blank(cu.PaymentDays) ? num(cu.PaymentDays) : pd);
    if (['Sent', 'Part paid'].indexOf(st) >= 0 && due < d && docInfo(db, 'INV', i.InvNo).balance > 0.005) { db.update('Invoices', i, { Status: 'Overdue' }); c++; }
  });
  return c;
}

// ======================================================================= temporary menu (side panels in O4)
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Core Access')
    .addItem('Number new rows + fill formulas', 'menuAssignIds')
    .addSeparator()
    .addItem('Quote → Proforma (advance)', 'menuQuoteToPI')
    .addItem('Quote → Job', 'menuQuoteToJob')
    .addSeparator()
    .addItem('Post challan', 'menuPostChallan')
    .addItem('Cancel challan', 'menuCancelChallan')
    .addItem('Post opening stock (OpeningStock tab)', 'menuOpeningStock')
    .addSeparator()
    .addItem('Run hire billing', 'menuHireBilling')
    .addItem('Milestones: set stages for a quote', 'menuSetMilestones')
    .addItem('Milestones: stage reached', 'menuReachMilestone')
    .addItem('Milestones: invoice reached stages', 'menuInvoiceMilestones')
    .addItem('Sale / service invoice from quote', 'menuInvoiceFromQuote')
    .addItem('Damage → debit note', 'menuDamageDN')
    .addSeparator()
    .addItem('Allocate payment', 'menuAllocate')
    .addItem('Cheque cleared', 'menuChequeCleared')
    .addItem('Cheque dishonoured', 'menuChequeDishonoured')
    .addItem('Receive PO (all outstanding)', 'menuReceivePO')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('PDF')
      .addItem('Quotation', 'menuPdfQuote').addItem('Proforma invoice', 'menuPdfPI').addItem('Invoice', 'menuPdfInvoice')
      .addItem('Challan', 'menuPdfChallan').addItem('Purchase order', 'menuPdfPO').addItem('Debit / credit note', 'menuPdfNote')
      .addSeparator().addItem('Sample set (test data → PDF/_Samples)', 'menuPdfSamples'))
    .addSeparator()
    .addItem('Refresh statuses', 'menuRefresh')
    .addItem('Upgrade sheet for O3 (run once)', 'menuUpgradeO3')
    .addItem('Run self-test', 'menuSelfTest')
    .addToUi();
}
// Simple trigger: typing a row by hand fills that row's calculated columns.
function onEdit(e) {
  try {
    var s = e.range.getSheet(), t = s.getName(), calc = CALC[t];
    if (!calc || e.range.getRow() < 2) return;
    var db = new SheetDb(s.getParent()), h = db.headers(t);
    for (var r = e.range.getRow(); r <= e.range.getLastRow(); r++) {
      var vals = s.getRange(r, 1, 1, h.length).getValues()[0], f = s.getRange(r, 1, 1, h.length).getFormulas()[0];
      if (!vals.some(function (v, j) { return !calc[h[j]] && !blank(v); })) continue;
      h.forEach(function (k, j) { if (calc[k] && !f[j]) s.getRange(r, j + 1).setFormula(resolveF(db, t, calc[k], r)); });
    }
  } catch (err) { /* never block typing */ }
}
function ui_(title, fn) {
  var ui = SpreadsheetApp.getUi();
  try {
    var msg = withLock(function () { return fn(new SheetDb()); });
    SpreadsheetApp.flush();
    ui.alert(title, String(msg), ui.ButtonSet.OK);
  } catch (e) { ui.alert(title + ' — not done', e.message, ui.ButtonSet.OK); }
}
function ask_(q) {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt(q, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) throw new Error('Cancelled');
  return r.getResponseText().trim();
}
function menuAssignIds() { ui_('Number new rows', function (db) { return assignIds(db) + ' rows numbered; formulas filled.'; }); }
function menuQuoteToPI() { var n = ask_('Quote no. (e.g. CAE/Q/2026/003)'); ui_('Quote → Proforma', function (db) { return 'Created ' + quoteToPI(db, n); }); }
function menuQuoteToJob() { var n = ask_('Quote no.'); ui_('Quote → Job', function (db) { return 'Created ' + quoteToJob(db, n); }); }
function menuPostChallan() { var n = ask_('Challan no. (Draft, with lines in ChallanLines)'); ui_('Post challan', function (db) { var r = postChallan(db, n); return n + ' posted: ' + r.moves + ' stock moves, ' + r.damage + ' damage/loss rows.'; }); }
function menuCancelChallan() { var n = ask_('Challan no. to cancel'); ui_('Cancel challan', function (db) { cancelChallan(db, n); return n + ' cancelled (stock reversed if it was posted).'; }); }
function menuOpeningStock() {
  ui_('Opening stock', function (db) {
    var ss = db.ss, s = ss.getSheetByName('OpeningStock');
    if (!s) { s = ss.insertSheet('OpeningStock'); s.getRange(1, 1, 1, 4).setValues([['ItemCode', 'LocID', 'Qty', 'PostedAt']]); return 'Tab OpeningStock created: fill ItemCode, LocID (blank = yard), Qty, then run again.'; }
    var v = s.getDataRange().getValues(), rows = [], idx = [];
    for (var i = 1; i < v.length; i++) if (!blank(v[i][0]) && blank(v[i][3])) { rows.push({ ItemCode: v[i][0], LocID: v[i][1], Qty: v[i][2] }); idx.push(i + 1); }
    postOpeningStock(db, rows);
    idx.forEach(function (r) { s.getRange(r, 4).setValue(new Date()); });
    return rows.length + ' lines posted.';
  });
}
function menuHireBilling() {
  var d = ask_('Bill up to date (dd-mmm-yyyy, blank = today)');
  ui_('Hire billing', function (db) {
    var r = runHireBilling(db, d || today());
    return r.invoices.length + ' invoice(s): ' + r.invoices.map(function (i) { return i.no + ' Tk ' + i.total; }).join(', ') + (r.warnings.length ? '\n\nWarnings:\n' + r.warnings.join('\n') : '');
  });
}
function menuSetMilestones() {
  var n = ask_('Quote no. (its lump-sum lines must have Billing = Milestone)');
  var s = ask_('Stages as name:% separated by | — blank = Settings MilestoneStages\n(e.g. Erection complete:40|Mid-way:30|Dismantling complete:30)');
  ui_('Milestones', function (db) { return setMilestones(db, n, s ? parseStages_(s) : null) + ' stages set for ' + n; });
}
function menuReachMilestone() {
  var j = ask_('Job no.'), s = ask_('Stage no. reached (1, 2, 3 …)'), d = ask_('Date reached (dd-mmm-yyyy, blank = today)');
  ui_('Milestone reached', function (db) { return 'Stage ' + s + ' (' + reachMilestone(db, j, num(s), d || today()) + ') marked reached. Now run "Invoice reached stages".'; });
}
function menuInvoiceMilestones() { var j = ask_('Job no.'); ui_('Milestone invoice', function (db) { var r = invoiceMilestones(db, j); return r.no + ' Tk ' + r.total + (r.advance ? ' (advance adjusted ' + r.advance + ')' : ''); }); }
function menuInvoiceFromQuote() { var n = ask_('Job no.'); ui_('Invoice from quote', function (db) { var r = invoiceFromQuote(db, n); return r.no + ' Tk ' + r.total; }); }
function menuDamageDN() { var n = ask_('Job no.'); ui_('Damage → debit note', function (db) { return 'Created ' + damageToDebitNote(db, n); }); }
function menuAllocate() { var n = ask_('Payment ID (MR/PV no.) — allocates oldest open documents first'); ui_('Allocate payment', function (db) { var l = allocatePayment(db, n); return l.length ? l.map(function (a) { return a.no + ': ' + a.amt; }).join('\n') : 'Nothing to allocate.'; }); }
function menuChequeCleared() { var n = ask_('Payment ID'); ui_('Cheque cleared', function (db) { chequeCleared(db, n); return 'Done'; }); }
function menuChequeDishonoured() { var n = ask_('Payment ID'); ui_('Cheque dishonoured', function (db) { chequeDishonoured(db, n); return 'Allocations reversed; documents re-opened.'; }); }
function menuReceivePO() { var n = ask_('PO no.'); ui_('Receive PO', function (db) { return n + ': ' + receivePO(db, n); }); }
function menuRefresh() { ui_('Refresh statuses', function (db) { return refreshStatuses(db) + ' status changes (expired quotes, overdue invoices).'; }); }
function menuSelfTest() {
  var a = selfTest(), b = typeof selfTestPdf === 'function' ? selfTestPdf() : { pass: 0, fail: 1, log: ['FAIL CAE_Ops_PDF.gs not installed'] };
  var fails = a.log.concat(b.log).filter(function (l) { return /^FAIL/.test(l); });
  SpreadsheetApp.getUi().alert('Self-test', (a.pass + b.pass) + ' passed, ' + (a.fail + b.fail) + ' failed\n\n' + fails.join('\n'), SpreadsheetApp.getUi().ButtonSet.OK);
}

// ======================================================================= self-test (in memory, your data is not touched)
function testSeed_(rule) {
  var H = function (s) { return s.split(','); };
  var seed = {
    Settings: { h: H('Key,Value,Notes'), rows: [['VATPct', '0.15'], ['AdvancePct', '0.5'], ['HirePeriodDays', '30'], ['PartPeriodRule', rule], ['MinHireMonths', '1'], ['QuoteValidityDays', '30'], ['OffHireNoticeDays', '7'], ['PaymentDaysDefault', '7'], ['LateInterestPctMonth', '0.02']].map(function (r) { return { Key: r[0], Value: r[1] }; }) },
    Sequences: { h: H('SeqKey,Prefix,Year,Pad,LastNo,NextID'), rows: [] },
    Staff: { h: H('StaffID,Name,Role,Phone,Email,Access,Status') },
    Customers: { h: H('CustID,Name,BIN,Address,ContactPerson,Phone,Email,PaymentDays,CreditLimit,Status,Notes'), rows: [{ CustID: 'CUST-0001', Name: 'Test Client', PaymentDays: 7, Status: 'Active' }] },
    Sites: { h: H('SiteID,CustID,Project,Address,SiteRep,SiteRepPhone,Status,StartDate,EndDate,LocID'), rows: [{ SiteID: 'SITE-0001', CustID: 'CUST-0001', Project: 'Tower A', LocID: 'LOC-S0001' }] },
    Suppliers: { h: H('SupID,Name,BIN,Address,ContactPerson,Phone,Email,Terms,BankDetails,Status'), rows: [{ SupID: 'SUP-0001', Name: 'Steel Co', Status: 'Active' }] },
    Items: {
      h: H('ItemCode,Name,Category,Size,Unit,WeightKg,StockTracked,ForSale,ForHire,SalePrice,HireRateMonth,ReplacementCost,RepairRate,AvgCost,ReorderLevel,Photo,Status'), rows: [
        { ItemCode: 'RL-STD-20', Name: 'Ringlock standard 2.0 m', Unit: 'pc', WeightKg: 10.5, StockTracked: 'Yes', HireRateMonth: 90, ReplacementCost: 3000, RepairRate: 300 },
        { ItemCode: 'BD-ST-207', Name: 'Steel board 2.07 m', Unit: 'pc', WeightKg: 15, StockTracked: 'Yes', HireRateMonth: 40, ReplacementCost: 1500, RepairRate: 200 },
        { ItemCode: 'TC-TUBE-3', Name: 'MS tube 3.0 m', Unit: 'pc', StockTracked: 'Yes', SalePrice: 1250 },
        { ItemCode: 'SV-TRANS', Name: 'Transport, per trip', Unit: 'trip', StockTracked: 'No' },
        { ItemCode: 'SV-AREA-M2', Name: 'Scaffold per m² per month', Unit: 'm²', StockTracked: 'No' },
        { ItemCode: 'SV-ERECT', Name: 'Erection labour', Unit: 'm²', StockTracked: 'No' },
      ],
    },
    Locations: { h: H('LocID,Name,Type,SiteID,Status'), rows: [['LOC-YARD', 'Yard'], ['LOC-REPAIR', 'Repair'], ['LOC-LOST', 'Lost'], ['LOC-SOLD', 'Sold'], ['LOC-SUPPLIER', 'Supplier'], ['LOC-S0001', 'Site', 'SITE-0001']].map(function (r) { return { LocID: r[0], Name: r[0], Type: r[1], SiteID: r[2] || '', Status: 'Active' }; }) },
    Terms: { h: H('ClauseID,QuoteType,Section,SectionTitle,ClauseNo,Title,Text,SortOrder,Active') },
    Quotes: { h: H('QuoteNo,Rev,QuoteType,QuoteDate,ValidUntil,CustID,SiteID,Attention,Subject,YourRef,HireMonths,MinMonths,AdvancePct,VATPct,Subtotal,VAT,Total,Advance,Status,PreparedBy,PDF,Notes') },
    QuoteLines: { h: H('LineID,QuoteNo,LineNo,ItemCode,Description,Unit,Qty,Months,Billing,Rate,Amount,Optional,Selected') },
    Milestones: { h: H('MilestoneID,QuoteNo,JobNo,StageNo,Stage,Pct,Amount,Status,ReachedDate,InvNo,Notes') },
    Proformas: { h: H('PINo,QuoteNo,PIDate,CustID,Description,Amount,DueTerms,DueDate,Paid,Balance,Status,PDF') },
    Jobs: { h: H('JobNo,QuoteNo,CustID,SiteID,ClientWONo,ClientWODate,WOARef,JobType,HireBasis,ContractValue,HireStart,MinMonths,BillingCycle,SecDepAmount,SecDepChequeNo,SecDepStatus,PM,Status,Notes') },
    Variations: { h: H('VONo,JobNo,VODate,Description,Amount,Status,ClientRef') },
    OffHire: { h: H('OHNNo,JobNo,NoticeDate,OffHireDate,Scope,Notes') },
    Challans: { h: H('ChallanNo,Kind,ChallanDate,JobNo,FromLoc,ToLoc,Vehicle,Driver,ReceivedBy,Status,PostedAt,SignedPhoto,PDF,Notes') },
    ChallanLines: { h: H('LineID,ChallanNo,ItemCode,Qty,QtyGood,QtyDamaged,QtyLost,Remarks') },
    StockMoves: { h: H('MoveID,MoveDate,ItemCode,Qty,FromLoc,ToLoc,RefType,RefNo,JobNo,PostedBy,PostedAt') },
    Damage: { h: H('DamageID,ChallanNo,JobNo,ItemCode,QtyDamaged,QtyLost,Charge,Photo,DNNo,Status') },
    Invoices: { h: H('InvNo,Kind,InvDate,DueDate,CustID,JobNo,PeriodFrom,PeriodTo,Subtotal,VATPct,VAT,Total,AdvanceAdjusted,AmountDue,Paid,Balance,Mushak63No,Status,PDF') },
    InvoiceLines: { h: H('LineID,InvNo,ItemCode,Description,Unit,Qty,Months,Rate,Amount') },
    Notes: { h: H('NoteNo,Kind,NoteDate,InvNo,JobNo,CustID,Reason,Amount,VATPct,VAT,Total,Status,PDF') },
    Payments: { h: H('PayID,Direction,PayDate,PartyType,PartyID,Method,RefNo,Bank,Amount,VDSDeducted,Mushak66Received,ChequeStatus,Allocated,Unallocated,Notes') },
    Allocations: { h: H('AllocID,PayID,DocType,DocNo,Amount') },
    POs: { h: H('PONo,SupID,PODate,JobNo,DeliverTo,Status,Subtotal,VATPct,VAT,Total,PDF,Notes') },
    POLines: { h: H('LineID,PONo,ItemCode,Description,Unit,Qty,Rate,Amount,QtyReceived') },
    Bills: { h: H('BillID,SupID,SupplierInvNo,BillDate,DueDate,PONo,JobNo,Amount,VAT,Total,Paid,Balance,Status') },
    Expenses: { h: H('ExpID,ExpDate,Category,JobNo,Payee,Amount,Method,RefNo,ReceiptPhoto,ApprovedBy,Notes') },
    Log: { h: H('Timestamp,User,Action,Ref,Details') },
  };
  ['Q', 'PI', 'J', 'VO', 'OHN', 'DC', 'INV', 'CN', 'DN', 'PO', 'MR', 'PV'].forEach(function (s) { seed.Sequences.rows.push({ SeqKey: s + '-2026', Prefix: 'CAE/' + s + '/', Year: '2026', Pad: 3, LastNo: 0 }); });
  [['CUST', 'CUST-', 4, 1], ['SITE', 'SITE-', 4, 1], ['SUP', 'SUP-', 4, 1], ['LOC', 'LOC-S', 4, 1], ['STF', 'STF-', 3, 0], ['QL', 'QL-', 5, 0], ['MS', 'MS-', 5, 0], ['CL', 'CL-', 6, 0], ['MV', 'MV-', 6, 0], ['DMG', 'DMG-', 5, 0], ['IL', 'IL-', 5, 0], ['AL', 'AL-', 5, 0], ['POL', 'POL-', 5, 0], ['BILL', 'BILL-', 5, 0], ['EXP', 'EXP-', 5, 0], ['TC', 'TC-', 4, 0]]
    .forEach(function (r) { seed.Sequences.rows.push({ SeqKey: r[0], Prefix: r[1], Year: '', Pad: r[2], LastNo: r[3] }); });
  return new MemDb(seed);
}
function testQuote_(db, no, type, lines, extra) {
  db.insert('Quotes', Object.assign({ QuoteNo: no, Rev: 0, QuoteType: type, QuoteDate: toDate('20-Nov-2026'), CustID: 'CUST-0001', SiteID: 'SITE-0001', AdvancePct: 0.5, VATPct: 0.15, Status: 'Sent' }, extra || {}));
  var ids = nextIds(db, 'QL', lines.length);
  db.insert('QuoteLines', lines.map(function (l, i) { return { LineID: ids[i], QuoteNo: no, LineNo: i + 1, ItemCode: l[0], Description: l[1], Unit: l[2], Qty: l[3], Months: l[4], Rate: l[5], Billing: l[6] || '', Optional: l[7] || 'No', Selected: l[8] || 'Yes' }; }));
}
function testKit_() {
  var log = [], res = { pass: 0, fail: 0, log: log };
  res.eq = function (name, got, want) {
    var ok = typeof want === 'number' ? Math.abs(num(got) - want) < 0.006 : String(got) === String(want);
    if (ok) res.pass++; else res.fail++;
    log.push((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : ' — got ' + got + ', want ' + want));
  };
  res.throws = function (name, fn, re) { try { fn(); res.fail++; log.push('FAIL ' + name + ' — no error'); } catch (e) { var ok = !re || re.test(e.message); if (ok) res.pass++; else res.fail++; log.push((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : ' — ' + e.message)); } };
  res.step = function (name, fn) { try { fn(); } catch (e) { res.fail++; log.push('FAIL ' + name + ' crashed — ' + e.message); } };
  return res;
}
function selfTest(o) {
  o = o || {};
  var T = testKit_(), eq = T.eq, throws = T.throws, step = T.step, Q = testQuote_;
  var inv = function (db, no) { var x = docInfo(db, 'INV', no); return x; };

  // ---------- A. Rental, Full period ----------
  var db = testSeed_('Full period'), A = {};
  step('A numbering', function () {
    eq('A1 first quote number', nextId(db, 'Q', '20-Nov-2026'), 'CAE/Q/2026/001');
    eq('A2 new year adds a row', nextId(db, 'Q', '05-Jan-2027'), 'CAE/Q/2027/001');
    eq('A3 internal series', nextId(db, 'CUST'), 'CUST-0002');
  });
  step('A quote → PI → job', function () {
    Q(db, 'CAE/Q/2026/001', 'Rental', [['RL-STD-20', 'Ringlock standard 2.0 m', 'pc', 50, 2, 100], ['BD-ST-207', 'Steel board 2.07 m', 'pc', 20, 2, 50], ['SV-TRANS', 'Transport: delivery', 'trip', 1, '', 5000]], { MinMonths: 2 });
    var t = quoteTotals(db, 'CAE/Q/2026/001');
    eq('A4 quote total', t.total, 19550); eq('A5 advance', t.advance, 9775);
    A.pi = quoteToPI(db, 'CAE/Q/2026/001', { date: '20-Nov-2026' }); eq('A6 PI number', A.pi, 'CAE/PI/2026/001');
    throws('A7 duplicate PI blocked', function () { quoteToPI(db, 'CAE/Q/2026/001'); }, /already has/);
    A.job = quoteToJob(db, 'CAE/Q/2026/001', { date: '22-Nov-2026' });
    var j = must(db, 'Jobs', 'JobNo', A.job);
    eq('A8 job basis', j.HireBasis, 'Item'); eq('A9 min months from quote', j.MinMonths, 2); eq('A10 quote accepted', must(db, 'Quotes', 'QuoteNo', 'CAE/Q/2026/001').Status, 'Accepted');
    throws('A11 cash refused', function () { recordPayment(db, { Direction: 'In', PartyType: 'Customer', PartyID: 'CUST-0001', Method: 'Cash', Amount: 100 }); }, /no cash/);
    A.p1 = recordPayment(db, { Direction: 'In', PayDate: '25-Nov-2026', PartyType: 'Customer', PartyID: 'CUST-0001', Method: 'Cheque', RefNo: '004512', Amount: 9775 });
    eq('A12 advance PI paid', must(db, 'Proformas', 'PINo', A.pi).Status, 'Paid'); eq('A13 receipt number', A.p1, 'CAE/MR/2026/001');
  });
  step('A stock + challans', function () {
    postOpeningStock(db, [{ ItemCode: 'RL-STD-20', Qty: 100 }, { ItemCode: 'BD-ST-207', Qty: 40 }], '01-Nov-2026');
    A.dc1 = createChallan(db, { kind: 'Delivery', jobNo: A.job, date: '01-Dec-2026', lines: [{ itemCode: 'RL-STD-20', qty: 50 }, { itemCode: 'BD-ST-207', qty: 20 }, { itemCode: 'SV-TRANS', qty: 1 }] });
    postChallan(db, A.dc1);
    eq('A14 yard after delivery', stockAt(db, 'RL-STD-20', 'LOC-YARD'), 50); eq('A15 on site', stockAt(db, 'RL-STD-20', 'LOC-S0001'), 50);
    eq('A16 job on hire', must(db, 'Jobs', 'JobNo', A.job).Status, 'On hire');
    var big = createChallan(db, { kind: 'Delivery', jobNo: A.job, date: '02-Dec-2026', lines: [{ itemCode: 'RL-STD-20', qty: 60 }] });
    throws('A17 over-delivery blocked', function () { postChallan(db, big); }, /only 50/);
    cancelChallan(db, big); eq('A18 draft cancelled', must(db, 'Challans', 'ChallanNo', big).Status, 'Cancelled');
    throws('A19 posted twice blocked', function () { postChallan(db, A.dc1); }, /only Draft/);
  });
  step('A first hire invoice', function () {
    var r = runHireBilling(db, '01-Dec-2026');
    eq('A20 one invoice', r.invoices.length, 1);
    var i1 = r.invoices[0]; A.i1 = i1.no;
    eq('A21 subtotal (advance 50×100 + 20×50 + transport)', i1.subtotal, 11000); eq('A22 total incl VAT', i1.total, 12650); eq('A23 advance adjusted', i1.advance, 9775);
    eq('A24 balance due', inv(db, A.i1).balance, 2875);
    eq('A25 billing again adds nothing', runHireBilling(db, '15-Dec-2026').invoices.length, 0);
  });
  step('A mid-period moves', function () {
    postChallan(db, createChallan(db, { kind: 'Delivery', jobNo: A.job, date: '15-Dec-2026', lines: [{ itemCode: 'RL-STD-20', qty: 10 }] }));
    A.ret1 = createChallan(db, { kind: 'Return', jobNo: A.job, date: '20-Dec-2026', lines: [{ itemCode: 'BD-ST-207', qty: 20, qtyDamaged: 1, qtyLost: 1 }] });
    var bad = createChallan(db, { kind: 'Return', jobNo: A.job, date: '20-Dec-2026', lines: [{ itemCode: 'BD-ST-207', qty: 25 }] });
    throws('A26 return more than on hire blocked', function () { postChallan(db, bad); }, /on hire/);
    postChallan(db, A.ret1);
    eq('A27 boards yard', stockAt(db, 'BD-ST-207', 'LOC-YARD'), 38); eq('A28 repair', stockAt(db, 'BD-ST-207', 'LOC-REPAIR'), 1); eq('A29 lost', stockAt(db, 'BD-ST-207', 'LOC-LOST'), 1);
    eq('A30 damage rows', db.rows('Damage').length, 1);
  });
  step('A second period', function () {
    var r = runHireBilling(db, '31-Dec-2026'), i2 = r.invoices[0]; A.i2 = i2.no;
    eq('A31 one invoice', r.invoices.length, 1);
    eq('A32 subtotal (60×100 advance + 10×100 adj.)', i2.subtotal, 7000); eq('A33 no advance left', i2.advance, 0);
    eq('A34 period from', fmtDay(dayNum(must(db, 'Invoices', 'InvNo', A.i2).PeriodFrom)), '31-Dec-2026');
  });
  step('A damage → DN', function () {
    A.dn = damageToDebitNote(db, A.job, { date: '22-Dec-2026' });
    var n = must(db, 'Notes', 'NoteNo', A.dn); eq('A35 DN amount (200 + 1500)', n.Amount, 1700); eq('A36 DN total', docInfo(db, 'DN', A.dn).total, 1955);
    throws('A37 no double charge', function () { damageToDebitNote(db, A.job); }, /no open/);
  });
  step('A off-hire + final', function () {
    db.insert('OffHire', { OHNNo: nextId(db, 'OHN', '10-Jan-2027'), JobNo: A.job, NoticeDate: toDate('10-Jan-2027'), OffHireDate: toDate('15-Jan-2027'), Scope: 'Full' });
    postChallan(db, createChallan(db, { kind: 'Return', jobNo: A.job, date: '15-Jan-2027', lines: [{ itemCode: 'RL-STD-20', qty: 60 }] }));
    eq('A38 job off-hire after last return', must(db, 'Jobs', 'JobNo', A.job).Status, 'Off-hire');
    var r = runHireBilling(db, '20-Jan-2027'), f = r.invoices[0];
    eq('A39 final invoice only', r.invoices.length, 1); eq('A40 final number in 2027', f.no, 'CAE/INV/2027/001');
    eq('A41 min-hire top-up boards 20×50', f.subtotal, 1000); eq('A42 kind', must(db, 'Invoices', 'InvNo', f.no).Kind, 'Final');
    eq('A43 nothing after final', runHireBilling(db, '28-Feb-2027').invoices.length, 0);
    eq('A44 yard standards back', stockAt(db, 'RL-STD-20', 'LOC-YARD'), 100);
  });
  step('A payments FIFO + dishonour', function () {
    var p = recordPayment(db, { Direction: 'In', PayDate: '02-Jan-2027', PartyType: 'Customer', PartyID: 'CUST-0001', Method: 'Bank transfer', Amount: 5000 });
    eq('A45 2027 receipt no.', p, 'CAE/MR/2027/001');
    eq('A46 INV1 paid', must(db, 'Invoices', 'InvNo', A.i1).Status, 'Paid'); eq('A47 INV2 part paid', must(db, 'Invoices', 'InvNo', A.i2).Status, 'Part paid');
    eq('A48 FIFO: INV1 2875, DN 1955, INV2 170', inv(db, A.i2).balance, 7880); eq('A48b DN settled', docInfo(db, 'DN', A.dn).balance, 0);
    var v = recordPayment(db, { Direction: 'In', PayDate: '05-Jan-2027', PartyType: 'Customer', PartyID: 'CUST-0001', Method: 'Cheque', Amount: 7000, VDSDeducted: 880, Mushak66Received: 'Yes' });
    eq('A49 VDS counts with Mushak-6.6', payAvailable(db, must(db, 'Payments', 'PayID', v)), 0);
    eq('A50 INV2 now paid', must(db, 'Invoices', 'InvNo', A.i2).Status, 'Paid');
    chequeDishonoured(db, v);
    eq('A51 dishonour re-opens INV2', must(db, 'Invoices', 'InvNo', A.i2).Status, 'Part paid'); eq('A52 INV2 balance back', inv(db, A.i2).balance, 7880); eq('A52b dishonoured leaves no credit', payAvailable(db, must(db, 'Payments', 'PayID', v)), 0);
    throws('A53 dishonoured cannot allocate', function () { allocatePayment(db, v); }, /dishonoured/);
    eq('A54 overdue flagged', refreshStatuses(db, '01-Mar-2027') >= 1, true);
    eq('A55 INV2 overdue', must(db, 'Invoices', 'InvNo', A.i2).Status, 'Overdue');
  });

  // ---------- B. Rental, Pro rata adjustments ----------
  var dbB = testSeed_('Pro rata');
  step('B pro rata', function () {
    Q(dbB, 'CAE/Q/2026/001', 'Rental', [['RL-STD-20', 'Ringlock standard 2.0 m', 'pc', 50, 1, 100], ['BD-ST-207', 'Steel board 2.07 m', 'pc', 20, 1, 50]], { AdvancePct: 0 });
    var job = quoteToJob(dbB, 'CAE/Q/2026/001');
    postOpeningStock(dbB, [{ ItemCode: 'RL-STD-20', Qty: 100 }, { ItemCode: 'BD-ST-207', Qty: 40 }]);
    postChallan(dbB, createChallan(dbB, { jobNo: job, date: '01-Dec-2026', lines: [{ itemCode: 'RL-STD-20', qty: 50 }, { itemCode: 'BD-ST-207', qty: 20 }] }));
    runHireBilling(dbB, '01-Dec-2026');
    postChallan(dbB, createChallan(dbB, { jobNo: job, date: '15-Dec-2026', lines: [{ itemCode: 'RL-STD-20', qty: 10 }] }));
    postChallan(dbB, createChallan(dbB, { kind: 'Return', jobNo: job, date: '20-Dec-2026', lines: [{ itemCode: 'BD-ST-207', qty: 20 }] }));
    var r = runHireBilling(dbB, '31-Dec-2026'), i = r.invoices[0], ls = i.lines;
    var adjStd = find(ls.filter(function (l) { return l.ItemCode === 'RL-STD-20'; }), 'Unit', 'day'), adjBd = find(ls.filter(function (l) { return l.ItemCode === 'BD-ST-207'; }), 'Unit', 'day');
    eq('B1 standards +160 pc-days', adjStd.Qty, 160); eq('B2 standards adj. amount', lineAmt(adjStd), 533.33);
    eq('B3 boards −200 pc-days (returned day 20)', adjBd.Qty, -200); eq('B4 boards adj. amount', lineAmt(adjBd), -333.33);
    eq('B5 subtotal 6000 + 533.33 − 333.33', i.subtotal, 6200);
  });

  // ---------- C. Project (m²), Sale, PO, supplier payment, new rows ----------
  var dbC = testSeed_('Full period');
  step('C project', function () {
    Q(dbC, 'CAE/Q/2026/001', 'Project', [['SV-AREA-M2', 'Façade scaffold, supply + erect + hire', 'm²', 500, 3, 80], ['SV-ERECT', 'Erection and dismantling', 'm²', 500, '', 20]], { MinMonths: 1, VATPct: 0.15 });
    var job = quoteToJob(dbC, 'CAE/Q/2026/001'); eq('C1 basis m²', must(dbC, 'Jobs', 'JobNo', job).HireBasis, 'm²');
    postOpeningStock(dbC, [{ ItemCode: 'RL-STD-20', Qty: 100 }]);
    postChallan(dbC, createChallan(dbC, { jobNo: job, date: '01-Feb-2027', lines: [{ itemCode: 'RL-STD-20', qty: 30 }] }));
    var r1 = runHireBilling(dbC, '01-Feb-2027');
    eq('C2 first invoice 40000 + 10000', r1.invoices[0].subtotal, 50000);
    dbC.insert('Variations', { VONo: nextId(dbC, 'VO', '10-Feb-2027'), JobNo: job, VODate: toDate('10-Feb-2027'), Description: 'Extra bay', Amount: 4000, Status: 'Approved' });
    dbC.insert('OffHire', { OHNNo: nextId(dbC, 'OHN', '20-Feb-2027'), JobNo: job, NoticeDate: toDate('20-Feb-2027'), OffHireDate: toDate('25-Feb-2027'), Scope: 'Full' });
    eq('C3 hire end = notice + 7 days', fmtDay(hireEndDay(dbC, must(dbC, 'Jobs', 'JobNo', job))), '27-Feb-2027');
    var r2 = runHireBilling(dbC, '05-Mar-2027');
    eq('C4 final carries the VO only', r2.invoices.length === 1 && r2.invoices[0].subtotal, 4000);
    eq('C5 project job off-hire', must(dbC, 'Jobs', 'JobNo', job).Status, 'Off-hire');
  });
  step('C sale', function () {
    Q(dbC, 'CAE/Q/2026/002', 'Sale', [['TC-TUBE-3', 'MS tube 3.0 m', 'pc', 24, '', 1250], ['SV-TRANS', 'Transport', 'trip', 1, '', 3000]]);
    var job = quoteToJob(dbC, 'CAE/Q/2026/002'); eq('C6 sale basis blank', must(dbC, 'Jobs', 'JobNo', job).HireBasis, '');
    var pi = quoteToPI(dbC, 'CAE/Q/2026/002'); eq('C7 sale PI due before delivery', must(dbC, 'Proformas', 'PINo', pi).DueTerms, 'Before delivery');
    dbC.insert('POs', { PONo: 'CAE/PO/2026/001', SupID: 'SUP-0001', PODate: toDate('01-Feb-2027'), DeliverTo: 'LOC-YARD', Status: 'Sent', VATPct: 0 });
    dbC.insert('POLines', [{ LineID: 'POL-00001', PONo: 'CAE/PO/2026/001', ItemCode: 'TC-TUBE-3', Qty: 30, Rate: 900 }, { LineID: 'POL-00002', PONo: 'CAE/PO/2026/001', ItemCode: 'SV-TRANS', Qty: 1, Rate: 2000 }]);
    eq('C8 part receipt', receivePO(dbC, 'CAE/PO/2026/001', [{ itemCode: 'TC-TUBE-3', qty: 20 }], '02-Feb-2027'), 'Part received');
    throws('C9 over-receipt blocked', function () { receivePO(dbC, 'CAE/PO/2026/001', [{ itemCode: 'TC-TUBE-3', qty: 20 }]); }, /more than ordered/);
    eq('C10 rest received', receivePO(dbC, 'CAE/PO/2026/001'), 'Received');
    eq('C11 tubes in yard', stockAt(dbC, 'TC-TUBE-3', 'LOC-YARD'), 30);
    postChallan(dbC, createChallan(dbC, { kind: 'Sale', jobNo: job, date: '03-Feb-2027', lines: [{ itemCode: 'TC-TUBE-3', qty: 24 }] }));
    eq('C12 sold out of yard', stockAt(dbC, 'TC-TUBE-3', 'LOC-YARD'), 6); eq('C13 sold location', stockAt(dbC, 'TC-TUBE-3', 'LOC-SOLD'), 24);
    var i = invoiceFromQuote(dbC, job, { date: '03-Feb-2027' });
    eq('C14 sale invoice subtotal', i.subtotal, 33000); eq('C15 sale invoice total', i.total, 37950);
    throws('C16 double sale invoice blocked', function () { invoiceFromQuote(dbC, job); }, /already invoiced/);
    dbC.insert('Bills', { BillID: nextId(dbC, 'BILL'), SupID: 'SUP-0001', SupplierInvNo: 'SC-77', BillDate: toDate('02-Feb-2027'), PONo: 'CAE/PO/2026/001', Amount: 29000, VAT: 0, Status: 'Unpaid' });
    var pv = recordPayment(dbC, { Direction: 'Out', PayDate: '05-Feb-2027', PartyType: 'Supplier', PartyID: 'SUP-0001', Method: 'Bank transfer', Amount: 10000 });
    eq('C17 payment voucher no.', pv, 'CAE/PV/2027/001'); eq('C18 bill part paid', dbC.rows('Bills')[0].Status, 'Part paid');
  });
  step('C new rows', function () {
    dbC.insert('Customers', { Name: 'New Client Ltd.' });
    dbC.insert('Sites', { CustID: 'CUST-0002', Project: 'Plant B' });
    dbC.insert('Quotes', { QuoteType: 'Rental', QuoteDate: toDate('09-Mar-2027'), CustID: 'CUST-0002' });
    eq('C19 rows numbered', assignIds(dbC), 3);
    eq('C20 customer id', dbC.rows('Customers')[1].CustID, 'CUST-0002'); eq('C21 customer days', dbC.rows('Customers')[1].PaymentDays, 7);
    var s = dbC.rows('Sites')[1]; eq('C22 site id + location', s.SiteID + ' ' + s.LocID, 'SITE-0002 LOC-S0002');
    var q = dbC.rows('Quotes')[2]; eq('C23 quote no. + defaults', q.QuoteNo + ' ' + q.Status + ' ' + q.VATPct + ' ' + q.MinMonths, 'CAE/Q/2027/001 Draft 0.15 1');
  });

  // ---------- D. Project with milestone (stage) billing + monthly + one-off lines ----------
  var dbD = testSeed_('Full period'), D = {};
  step('D milestones', function () {
    testQuote_(dbD, 'CAE/Q/2026/001', 'Project', [
      ['', 'Scaffold to boiler house, design + supply + erect + dismantle (lump sum)', 'lot', 1, '', 200000, 'Milestone'],
      ['SV-AREA-M2', 'Façade scaffold hire', 'm²', 500, 2, 80],
      ['SV-TRANS', 'Transport: delivery and collection', 'trip', 1, '', 5000]], { AdvancePct: 0.2 });
    eq('D1 quote total incl. VAT', quoteTotals(dbD, 'CAE/Q/2026/001').total, 327750);
    D.pi = quoteToPI(dbD, 'CAE/Q/2026/001');
    D.job = quoteToJob(dbD, 'CAE/Q/2026/001');
    var j = must(dbD, 'Jobs', 'JobNo', D.job);
    eq('D2 basis from non-milestone lines', j.HireBasis, 'm²'); eq('D3 billing cycle', j.BillingCycle, 'Milestones + monthly in advance');
    var ms = milestoneRows(dbD, 'CAE/Q/2026/001');
    eq('D4 default stages 40/30/30', ms.map(function (m) { return m.Stage + ' ' + r2(m.Pct * 100); }).join('; '), 'Erection complete 40; Mid-way 30; Dismantling complete 30');
    eq('D5 stages linked to job', ms[0].JobNo, D.job);
    recordPayment(dbD, { Direction: 'In', PayDate: '25-Nov-2026', PartyType: 'Customer', PartyID: 'CUST-0001', Method: 'Bank transfer', Amount: 65550 });
    postOpeningStock(dbD, [{ ItemCode: 'RL-STD-20', Qty: 100 }]);
    postChallan(dbD, createChallan(dbD, { jobNo: D.job, date: '01-Dec-2026', lines: [{ itemCode: 'RL-STD-20', qty: 40 }] }));
    var h = runHireBilling(dbD, '01-Dec-2026').invoices[0];
    eq('D6 hire invoice excludes the lump sum (40000 + 5000)', h.subtotal, 45000);
    eq('D7 advance set off first (51750 of 65550)', h.advance, 51750);
    throws('D8 nothing reached yet', function () { invoiceMilestones(dbD, D.job); }, /no stage reached/);
    reachMilestone(dbD, D.job, 1, '05-Dec-2026');
    throws('D9 stage reached twice blocked', function () { reachMilestone(dbD, D.job, 1); }, /already Reached/);
    var m1 = invoiceMilestones(dbD, D.job, { date: '05-Dec-2026' });
    eq('D10 stage 1 = 40% of 200000', m1.subtotal, 80000); eq('D11 rest of advance used', m1.advance, 13800);
    eq('D12 kind', must(dbD, 'Invoices', 'InvNo', m1.no).Kind, 'Milestone'); eq('D13 stage invoiced', milestoneRows(dbD, 'CAE/Q/2026/001')[0].InvNo, m1.no);
    throws('D14 changing stages after invoicing blocked', function () { setMilestones(dbD, 'CAE/Q/2026/001', [['A', 50], ['B', 50]]); }, /already reached or invoiced/);
    reachMilestone(dbD, D.job, 2); reachMilestone(dbD, D.job, 3);
    var m2 = invoiceMilestones(dbD, D.job);
    eq('D15 stages 2 + 3 on one invoice', m2.lines.length + ' · ' + m2.subtotal, '2 · 120000');
    throws('D16 no double milestone invoice', function () { invoiceMilestones(dbD, D.job); }, /no stage reached/);
    eq('D17 milestones total = lump sum', sum(dbD.rows('InvoiceLines').filter(function (l) { return /^Stage /.test(l.Description); }), lineAmt), 200000);
  });
  step('D rounding + checks', function () {
    testQuote_(dbD, 'CAE/Q/2026/002', 'Service', [['', 'Design and inspection (lump sum)', 'lot', 1, '', 1000, 'Milestone'], ['', 'Site visit', 'visit', 2, '', 1500]]);
    throws('D18 stages must total 100%', function () { setMilestones(dbD, 'CAE/Q/2026/002', [['A', 50], ['B', 40]]); }, /not 100/);
    setMilestones(dbD, 'CAE/Q/2026/002', [['Design issued', 1 / 3], ['Inspection 1', 1 / 3], ['Final inspection', 1 / 3]]);
    var job = quoteToJob(dbD, 'CAE/Q/2026/002');
    eq('D19 service job billing', must(dbD, 'Jobs', 'JobNo', job).BillingCycle, 'Milestones');
    eq('D20 amounts 333.33 / 333.33 / 333.34', milestoneAmounts(dbD, 'CAE/Q/2026/002').map(function (x) { return x.amount; }).join(' / '), '333.33 / 333.33 / 333.34');
    eq('D21 service invoice excludes the lump sum', invoiceFromQuote(dbD, job).subtotal, 3000);
    testQuote_(dbD, 'CAE/Q/2026/003', 'Project', [['', 'Lump sum', 'lot', 1, '', 5000]]);
    throws('D22 stages need a milestone line', function () { setMilestones(dbD, 'CAE/Q/2026/003'); }, /Billing = Milestone/);
  });
  if (o.dbs) o.dbs.push(db, dbB, dbC, dbD);
  return { pass: T.pass, fail: T.fail, log: T.log };
}
