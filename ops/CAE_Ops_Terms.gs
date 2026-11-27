/**
 * Core Access Ops — terms per quote (add-on QT1) · 15 Nov 2026
 * Eleventh script file, LAST: Apps Script › + › Script › name it CAE_Ops_Terms › paste › Save › reload the sheet.
 * File order: Core, PDF, UI, Reports, App, Sets, Order, QuoteReq, Site, Roles, Terms. No menu change.
 * Use: Core Access › Quotes › pick a quote › "Terms". After saving a quote the panel opens its Terms screen by itself.
 * First use: the Terms screen offers "Set up now" (one time): 5 columns at the END of Quotes + a QuoteTerms tab.
 *
 * Per quote, blank = standard (Settings / customer):
 *   Advance %, minimum hire months (same Quotes columns as the quote form) · PaymentDays · ValidityDays ·
 *   LateInterestPct · NoticeDays · PartPeriodRule. Clauses: keep / change wording / remove each standard clause,
 *   add extra clauses (into a section, or a new "Special Conditions" section at the end). QuoteTerms is written only
 *   by the panel (tab protected with a warning).
 * The values reach everything that depends on them, so the quote and the money agree:
 *   quote PDF ({{tokens}}, Valid until, clauses) · Quotes.ValidUntil formula + expiry (Refresh statuses) ·
 *   Invoices.DueDate formula + overdue + invoice PDF wording (payment days, late interest) for the job's invoices ·
 *   hire end of m² / m³ / set / lump-sum jobs (notice days) · hire billing part-month rule for the job.
 * Wraps: quoteTokens, termsFor, PDF_SPECS.Quote, PDF_SPECS.Invoice, hireEndDay, billJob_, resolveF, uiOffHire_,
 *   uiGetDb_ (quote → terms summary), selfTestAllParts_. Replaces: refreshStatuses (same + per-quote days).
 *   CALC: Quotes.ValidUntil, Invoices.DueDate (old formulas kept until the set-up has run).
 */
var CAE_QT_VERSION = 'QT1 · 15 Nov 2026';
var QT_COLS_ = ['ValidityDays', 'PaymentDays', 'NoticeDays', 'LateInterestPct', 'PartPeriodRule'];
var QT_HEAD_ = ['QuoteNo', 'ClauseID', 'Action', 'Section', 'SectionTitle', 'ClauseNo', 'Title', 'Text', 'SortOrder', 'UpdatedBy', 'UpdatedAt'];
var QT_RULES_ = ['Full period', 'Pro rata'];
var QT_SPECIAL_ = 'Special Conditions';

function qtReady_(db) { return db.hasTab('QuoteTerms') && QT_COLS_.every(function (c) { return db.headers('Quotes').indexOf(c) >= 0; }); }
function qtQuote_(db, no) { return blank(no) ? null : find(db.rows('Quotes'), 'QuoteNo', no); }
function qtJobQuote_(db, job) { return job ? qtQuote_(db, job.QuoteNo) : null; }
function qtHas_(q, k) { return !!q && (k in q) && !blank(q[k]); }
function qtRows_(db, no) { return db.hasTab('QuoteTerms') ? db.rows('QuoteTerms').filter(function (r) { return String(r.QuoteNo) === String(no); }) : []; }
function qtPh_(s) { return /\[(?!to fill in Settings\]|verify with accountant\])[^\]]*\]/.test(String(s)); }
function qtHire_(type) { return type === 'Rental' || type === 'Project'; }
function qtRuleTxt_(r) { return r === 'Pro rata' ? 'a part month is charged pro rata by days' : 'a part month is charged as a full month'; }

// ======================================================================= set-up (one time, safe to repeat)
function upgradeQT(db) {
  var done = [];
  QT_COLS_.forEach(function (c) { if (db.ensureColumn('Quotes', c)) done.push('Quotes + ' + c); });
  if (db.ensureTab('QuoteTerms', QT_HEAD_, [])) {
    done.push('QuoteTerms tab');
    if (db.ss) {
      var t = db.sheet('QuoteTerms');
      t.getRange(2, QT_HEAD_.indexOf('UpdatedAt') + 1, 999, 1).setNumberFormat('dd-mmm-yyyy hh:mm');
      try { t.protect().setDescription('Written by the panel: Quotes › Terms. Change terms there, not here.').setWarningOnly(true); } catch (e) { /* protection is a convenience */ }
    }
  }
  if (db.ss && done.length) {
    var s = db.sheet('Quotes'), h = db.headers('Quotes'), n = Math.max(s.getMaxRows() - 1, 1);
    s.getRange(2, h.indexOf('PartPeriodRule') + 1, n, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(QT_RULES_, true).setAllowInvalid(false).build());
    s.getRange(2, h.indexOf('LateInterestPct') + 1, n, 1).setNumberFormat('0.0%');
    db.fillFormulas('Quotes'); db.fillFormulas('Invoices');
  }
  log_(db, 'Upgrade QT', '', done.join('; ') || 'up to date');
  return done;
}

// ======================================================================= formulas: per-quote validity + payment days
var QT_VALID_OLD_ = CALC.Quotes.ValidUntil;
var QT_VALID_NEW_ = '=IF({QuoteDate}="","",{QuoteDate}+IF(N({ValidityDays})>0,{ValidityDays},INDEX([Settings.Value],MATCH("QuoteValidityDays",[Settings.Key],0))))';
var QT_DUE_OLD_ = CALC.Invoices.DueDate;
var QT_DUE_NEW_ = '=IF({InvDate}="","",{InvDate}+IFERROR(1/(1/INDEX([Quotes.PaymentDays],MATCH(INDEX([Jobs.QuoteNo],MATCH({JobNo},[Jobs.JobNo],0)),[Quotes.QuoteNo],0))),' +
  'IFERROR(1*INDEX([Customers.PaymentDays],MATCH({CustID},[Customers.CustID],0)),INDEX([Settings.Value],MATCH("PaymentDaysDefault",[Settings.Key],0))*1)))';
CALC.Quotes.ValidUntil = QT_VALID_NEW_;
CALC.Invoices.DueDate = QT_DUE_NEW_;
var QT_resolveF0_ = resolveF;
resolveF = function (db, t, tpl, r) {
  if ((tpl === QT_VALID_NEW_ || tpl === QT_DUE_NEW_) && db.headers('Quotes').indexOf('ValidityDays') < 0) tpl = tpl === QT_VALID_NEW_ ? QT_VALID_OLD_ : QT_DUE_OLD_;
  return QT_resolveF0_(db, t, tpl, r);
};

// ======================================================================= quote PDF: tokens + clauses
var QT_CUR_ = null; // quote whose PDF is being built (clause overrides apply only then)
var QT_tokens0_ = quoteTokens;
quoteTokens = function (db, q) {
  var t = QT_tokens0_(db, q);
  if (qtHas_(q, 'PaymentDays')) t.PaymentDays = String(num(q.PaymentDays));
  if (qtHas_(q, 'ValidityDays')) t.ValidityDays = String(num(q.ValidityDays));
  if (qtHas_(q, 'NoticeDays')) t.NoticeDays = String(num(q.NoticeDays));
  if (qtHas_(q, 'LateInterestPct')) t.LateInterest = pctTxt(q.LateInterestPct);
  if (qtHas_(q, 'PartPeriodRule')) t.PartPeriod = qtRuleTxt_(String(q.PartPeriodRule));
  return t;
};
function qtApply_(base, ov) {
  if (!ov.length) return base;
  var by = {}, out = [];
  ov.forEach(function (o) { if (o.Action !== 'Add' && !blank(o.ClauseID)) by[o.ClauseID] = o; });
  base.forEach(function (r) {
    var o = by[r.ClauseID];
    if (o && o.Action === 'Remove') return;
    out.push(o && o.Action === 'Replace' ? Object.assign({}, r, { Title: blank(o.Title) ? r.Title : o.Title, Text: o.Text }) : r);
  });
  ov.filter(function (o) { return o.Action === 'Add'; }).forEach(function (o) {
    out.push({ ClauseID: '', QuoteType: '', Section: o.Section, SectionTitle: o.SectionTitle, ClauseNo: o.ClauseNo, Title: o.Title, Text: o.Text, SortOrder: num(o.SortOrder), Active: 'Yes' });
  });
  return out.sort(function (a, b) { return num(a.SortOrder) - num(b.SortOrder); });
}
var QT_termsFor0_ = termsFor;
termsFor = function (db, type) {
  var base = QT_termsFor0_(db, type);
  return QT_CUR_ && type !== 'PO' ? qtApply_(base, qtRows_(db, QT_CUR_)) : base;
};
function qtSetPair_(spec, label, val) {
  spec.blocks.forEach(function (b) { if (b.t === 'pairs') b.rows.forEach(function (r) { if (r[0] === label) r[1] = val; if (r[2] === label) r[3] = val; }); });
}
var QT_specQuote0_ = PDF_SPECS.Quote;
PDF_SPECS.Quote = function (db, no) {
  var prev = QT_CUR_; QT_CUR_ = no;
  try {
    var spec = QT_specQuote0_(db, no), q = qtQuote_(db, no);
    if (qtHas_(q, 'ValidityDays') && dayNum(q.QuoteDate) != null) qtSetPair_(spec, 'Valid until', longDate(fromDay(dayNum(q.QuoteDate) + num(q.ValidityDays))));
    return spec;
  } finally { QT_CUR_ = prev; }
};
// Invoice PDF: payment days + late interest of the job's quote.
var QT_specInv0_ = PDF_SPECS.Invoice;
PDF_SPECS.Invoice = function (db, invNo) {
  var spec = QT_specInv0_(db, invNo), inv = find(db.rows('Invoices'), 'InvNo', invNo) || {};
  var q = qtJobQuote_(db, find(db.rows('Jobs'), 'JobNo', inv.JobNo));
  var pd = qtHas_(q, 'PaymentDays') ? num(q.PaymentDays) : null, li = qtHas_(q, 'LateInterestPct') ? pctTxt(q.LateInterestPct) : null;
  if (pd == null && !li) return spec;
  spec.blocks.forEach(function (b) {
    if (b.t !== 'p' || typeof b.text !== 'string') return;
    if (pd != null) b.text = b.text.replace(/Payable within \d+ days/, 'Payable within ' + pd + ' days');
    if (li) b.text = b.text.replace(/interest at [\d.]+% per month/, 'interest at ' + li + ' per month');
  });
  if (pd != null && blank(inv.DueDate) && dayNum(inv.InvDate) != null) qtSetPair_(spec, 'Due date', longDate(fromDay(dayNum(inv.InvDate) + pd)));
  return spec;
};

// ======================================================================= billing + statuses
var QT_hireEnd0_ = hireEndDay;
hireEndDay = function (db, job) {
  var q = job.HireBasis === 'Item' ? null : qtJobQuote_(db, job);
  if (!qtHas_(q, 'NoticeDays')) return QT_hireEnd0_(db, job);
  var oh = db.rows('OffHire').filter(function (x) { return x.JobNo === job.JobNo && x.Scope === 'Full'; }), nd = num(q.NoticeDays);
  if (!oh.length) return null;
  return Math.max.apply(null, oh.map(function (x) { return Math.max(dayNum(x.OffHireDate) || 0, (dayNum(x.NoticeDate) || 0) + nd); }));
};
var QT_billJob0_ = billJob_;
billJob_ = function (db, job, asOf, P, rule) {
  var q = qtJobQuote_(db, job);
  return QT_billJob0_(db, job, asOf, P, qtHas_(q, 'PartPeriodRule') ? String(q.PartPeriodRule) : rule);
};
var QT_offHire0_ = uiOffHire_;
uiOffHire_ = function (db, a) {
  var r = QT_offHire0_(db, a), q = qtJobQuote_(db, find(db.rows('Jobs'), 'JobNo', a.jobNo));
  if (r && r.msg && qtHas_(q, 'NoticeDays')) r.msg = r.msg.replace(/notice \+ \d+ days/, 'notice + ' + num(q.NoticeDays) + ' days');
  return r;
};
function refreshStatuses(db, asOf) {
  var d = dayNum(asOf || today()), vd = num(S(db, 'QuoteValidityDays', 30)), pd = num(S(db, 'PaymentDaysDefault', 7)), c = 0;
  db.rows('Quotes').forEach(function (q) {
    if (['Draft', 'Sent'].indexOf(q.Status) < 0 || dayNum(q.QuoteDate) == null) return;
    if (dayNum(q.QuoteDate) + (qtHas_(q, 'ValidityDays') ? num(q.ValidityDays) : vd) < d) { db.update('Quotes', q, { Status: 'Expired' }); c++; }
  });
  db.rows('Proformas').forEach(function (p) { if (!blank(p.PINo)) refreshDoc(db, 'PI', p.PINo); });
  db.rows('Bills').forEach(function (b) { if (!blank(b.BillID)) refreshDoc(db, 'Bill', b.BillID); });
  db.rows('Invoices').forEach(function (i) {
    if (blank(i.InvNo)) return;
    var st = refreshDoc(db, 'INV', i.InvNo), cu = find(db.rows('Customers'), 'CustID', i.CustID), q = qtJobQuote_(db, find(db.rows('Jobs'), 'JobNo', i.JobNo));
    var days = qtHas_(q, 'PaymentDays') ? num(q.PaymentDays) : (cu && !blank(cu.PaymentDays) ? num(cu.PaymentDays) : pd);
    if (['Sent', 'Part paid'].indexOf(st) >= 0 && dayNum(i.InvDate) + days < d && docInfo(db, 'INV', i.InvNo).balance > 0.005) { db.update('Invoices', i, { Status: 'Overdue' }); c++; }
  });
  return c;
}

// ======================================================================= Terms screen: data + save
function qtStd_(db, q) {
  var cu = find(db.rows('Customers'), 'CustID', q.CustID) || {}, own = !blank(cu.PaymentDays);
  return {
    AdvancePct: [num(S(db, 'AdvancePct', 0.5)), 'company default'], MinMonths: [num(S(db, 'MinHireMonths', 1)), 'company default'],
    PaymentDays: [own ? num(cu.PaymentDays) : num(S(db, 'PaymentDaysDefault', 7)), own ? 'customer ' + (cu.Name || q.CustID) : 'company default'],
    ValidityDays: [num(S(db, 'QuoteValidityDays', 30)), 'company default'], LateInterestPct: [num(S(db, 'LateInterestPctMonth', 0.02)), 'company default'],
    NoticeDays: [num(S(db, 'OffHireNoticeDays', 7)), 'company default'], PartPeriodRule: [String(S(db, 'PartPeriodRule', 'Full period')), 'company default'],
  };
}
// [key, label, unit, kind] — kind: pct (stored 0–1, shown 0–100), int, rule
var QT_FIELDS_ = [['AdvancePct', 'Advance with the order', '%', 'pct'], ['PaymentDays', 'Invoices payable within', 'days', 'int'], ['ValidityDays', 'Quotation valid for', 'days', 'int'],
  ['LateInterestPct', 'Late payment interest', '% a month', 'pct'], ['MinMonths', 'Minimum hire', 'months', 'int', 1], ['NoticeDays', 'Off-hire notice', 'days', 'int', 1], ['PartPeriodRule', 'Part month', '', 'rule', 1]];
function qtFieldsFor_(type) { return QT_FIELDS_.filter(function (f) { return !f[4] || qtHire_(type); }); }
function qtShow_(f, v) { return f[3] === 'pct' ? r2(num(v) * 100) : f[3] === 'rule' ? String(v) : num(v); }
function qtStdTxt_(f, v) { return f[3] === 'rule' ? (v === 'Pro rata' ? 'pro rata by days' : 'full month') : qtShow_(f, v) + (f[2] === '%' || f[2] === '% a month' ? f[2] : ' ' + f[2]); }
// value set for this quote, or '' when it is the standard
function qtCustom_(f, q, std) {
  var k = f[0], v = q[k];
  if (k === 'AdvancePct' || k === 'MinMonths') return blank(v) || Math.abs(num(v) - num(std[k][0])) < 1e-9 ? '' : qtShow_(f, v);
  return blank(v) ? '' : qtShow_(f, v);
}
function qtSections_(base, added) {
  var out = [], seen = {}, max = 0;
  base.forEach(function (r) { var s = String(r.Section); if (!seen[s]) { seen[s] = 1; out.push({ no: s, title: r.SectionTitle }); } if (/^\d+$/.test(s)) max = Math.max(max, num(s)); });
  return { list: out.concat([{ no: String(max + 1), title: QT_SPECIAL_ + ' (new section at the end)' }]), special: String(max + 1), seen: seen };
}
function qtSummary_(db, q) {
  if (!q) return '';
  var prev = QT_CUR_, ph = 0, n = 0;
  QT_CUR_ = q.QuoteNo;
  try { termsFor(db, q.QuoteType || 'Rental').forEach(function (t) { if (qtPh_(t.Text)) ph++; }); } finally { QT_CUR_ = prev; }
  if (qtReady_(db)) {
    var std = qtStd_(db, q);
    qtFieldsFor_(q.QuoteType || 'Rental').forEach(function (f) { if (qtCustom_(f, q, std) !== '') n++; });
    n += qtRows_(db, q.QuoteNo).length;
  }
  return (n ? n + ' change' + (n === 1 ? '' : 's') : 'standard') + (ph ? ' · ' + ph + ' to fill' : '');
}
function qtLock_(db, q) {
  var job = find(db.rows('Jobs'), 'QuoteNo', q.QuoteNo);
  if (job) return q.QuoteNo + ' already has job ' + job.JobNo + ' — the terms are fixed. Change them by a variation on the job.';
  if (['Draft', 'Sent'].indexOf(q.Status) < 0) return q.QuoteNo + ' is ' + q.Status + ' — use Revise on the quote to reopen it.';
  return '';
}
function qtView_(db, no) {
  var q = must(db, 'Quotes', 'QuoteNo', no), type = q.QuoteType || 'Rental', cu = find(db.rows('Customers'), 'CustID', q.CustID) || {};
  var std = qtStd_(db, q), ready = qtReady_(db), ov = qtRows_(db, no), base = QT_termsFor0_(db, type), by = {};
  ov.forEach(function (o) { if (o.Action !== 'Add') by[o.ClauseID] = o; });
  var sec = qtSections_(base, ov), lock = qtLock_(db, q);
  return {
    no: no, rev: num(q.Rev), type: type, status: q.Status, custName: cu.Name || q.CustID, ready: ready, locked: !!lock, lockMsg: lock, tokens: quoteTokens(db, q),
    fields: qtFieldsFor_(type).map(function (f) { return { key: f[0], label: f[1], unit: f[2], kind: f[3], value: ready || f[0] === 'AdvancePct' || f[0] === 'MinMonths' ? qtCustom_(f, q, std) : '', stdTxt: qtStdTxt_(f, std[f[0]][0]), src: std[f[0]][1] }; }),
    clauses: base.map(function (r) {
      var o = by[r.ClauseID], mode = !o ? 'std' : o.Action === 'Remove' ? 'remove' : 'edit', eff = mode === 'edit' ? o.Text : r.Text;
      return { id: r.ClauseID, sec: String(r.Section), secTitle: r.SectionTitle, no: String(r.ClauseNo), title: r.Title, std: String(r.Text), mode: mode, text: mode === 'edit' ? String(o.Text) : '', ph: mode !== 'remove' && qtPh_(eff) };
    }),
    added: ov.filter(function (o) { return o.Action === 'Add'; }).sort(function (a, b) { return num(a.SortOrder) - num(b.SortOrder); })
      .map(function (o) { return { sec: sec.seen[String(o.Section)] ? String(o.Section) : sec.special, no: String(o.ClauseNo), title: o.Title, text: String(o.Text) }; }),
    sections: sec.list,
  };
}
function uiTermsGet(no) { return uiRun_(function (db) { return qtView_(db, no); }, true); }
function qtNum_(v, kind, lo, hi, what) {
  if (blank(v) || String(v).trim() === '') return '';
  var n = num(String(v).replace('%', ''));
  if (!(n >= lo && n <= hi)) throw new Error(what + ' must be from ' + lo + ' to ' + hi);
  if (kind === 'int' && Math.abs(n - Math.round(n)) > 1e-9) throw new Error(what + ' must be a whole number');
  return kind === 'pct' ? r2(n) / 100 : n;
}
// a = { quoteNo, settings: { key: value shown in the panel ('' = standard) }, clauses: [{ id, mode: std|edit|remove, text }], added: [{ section, title, text }] }
function qtSave_(db, a) {
  var q = must(db, 'Quotes', 'QuoteNo', a.quoteNo), lock = qtLock_(db, q);
  if (lock) throw new Error(lock);
  if (!qtReady_(db)) { upgradeQT(db); q = must(db, 'Quotes', 'QuoteNo', a.quoteNo); }
  var type = q.QuoteType || 'Rental', std = qtStd_(db, q), s = a.settings || {}, p = {}, n = 0;
  var lim = { AdvancePct: [0, 100, 'Advance %'], PaymentDays: [1, 365, 'Payment days'], ValidityDays: [1, 365, 'Validity days'], LateInterestPct: [0, 10, 'Late interest % a month'], MinMonths: [1, 60, 'Minimum hire months'], NoticeDays: [0, 90, 'Off-hire notice days'] };
  qtFieldsFor_(type).forEach(function (f) {
    var k = f[0], v;
    if (f[3] === 'rule') { v = String(s[k] || ''); if (v && QT_RULES_.indexOf(v) < 0) throw new Error('Part month must be Full period or Pro rata'); if (v === std[k][0]) v = ''; }
    else { v = qtNum_(s[k], f[3], lim[k][0], lim[k][1], lim[k][2]); if (v !== '' && Math.abs(v - num(std[k][0])) < 1e-9) v = ''; }
    if (k === 'AdvancePct' || k === 'MinMonths') { p[k] = v === '' ? num(std[k][0]) : v; if (v !== '') n++; } else { p[k] = v; if (v !== '') n++; }
  });
  var base = QT_termsFor0_(db, type), byId = {}, rows = [];
  base.forEach(function (r) { byId[r.ClauseID] = r; });
  (a.clauses || []).forEach(function (c) {
    var b = byId[c.id]; if (!b) throw new Error('Clause ' + c.id + ' is not in the ' + type + ' terms');
    var r = { Section: b.Section, SectionTitle: b.SectionTitle, ClauseNo: b.ClauseNo, Title: b.Title, SortOrder: num(b.SortOrder), ClauseID: b.ClauseID };
    if (c.mode === 'remove') rows.push(Object.assign(r, { Action: 'Remove', Text: '' }));
    else if (c.mode === 'edit') {
      var t = String(c.text || '').trim();
      if (!t) throw new Error('Clause ' + b.ClauseNo + ': the wording is empty — choose Remove instead');
      if (t !== String(b.Text).trim()) rows.push(Object.assign(r, { Action: 'Replace', Text: t }));
    }
  });
  var sec = qtSections_(base, []), maxSort = base.reduce(function (m, r) { return Math.max(m, num(r.SortOrder)); }, 0), cnt = {};
  (a.added || []).forEach(function (x, i) {
    var t = String(x.text || '').trim(); if (!t) throw new Error('Extra clause ' + (i + 1) + ': the wording is empty');
    var sn = sec.seen[String(x.section)] ? String(x.section) : sec.special, inSec = base.filter(function (r) { return String(r.Section) === sn; });
    var last = inSec.reduce(function (m, r) { var p2 = String(r.ClauseNo).split('.'); return p2.length === 2 && p2[0] === sn ? Math.max(m, num(p2[1])) : m; }, 0);
    cnt[sn] = (cnt[sn] || 0) + 1;
    var so = inSec.length ? inSec.reduce(function (m, r) { return Math.max(m, num(r.SortOrder)); }, 0) : maxSort + 1;
    rows.push({ ClauseID: '', Action: 'Add', Section: sn, SectionTitle: inSec.length ? inSec[0].SectionTitle : QT_SPECIAL_, ClauseNo: (sn ? sn + '.' : '') + (last + cnt[sn]), Title: String(x.title || '').trim(), Text: t, SortOrder: r2(so + cnt[sn] / 100) });
  });
  // everything checked — now write (quote row, then this quote's clause rows)
  uiPutRow_(db, 'Quotes', q, p);
  uiDelRows_(db, 'QuoteTerms', qtRows_(db, q.QuoteNo));
  var who = user_(), now = new Date();
  if (rows.length) db.insert('QuoteTerms', rows.map(function (r) { r.QuoteNo = q.QuoteNo; r.UpdatedBy = who; r.UpdatedAt = now; return r; }));
  n += rows.length;
  log_(db, 'Quote terms', q.QuoteNo, n ? n + ' change(s) from standard' : 'all standard');
  var sum2 = qtSummary_(db, must(db, 'Quotes', 'QuoteNo', q.QuoteNo));
  return { msg: q.QuoteNo + ' terms saved: ' + sum2 + '. Make the quotation PDF to see them.', ref: q.QuoteNo, warn: / to fill/.test(sum2) };
}
UI_ACTIONS_.saveTerms = function (db, a) { return qtSave_(db, a); };
UI_ACTIONS_.setupTerms = function (db) { var d = upgradeQT(db); return d.length ? 'Set up: ' + d.join(', ') + '.' : 'Already set up.'; };
var QT_uiGet0_ = uiGetDb_;
uiGetDb_ = function (db, kind, a) {
  var r = QT_uiGet0_(db, kind, a);
  if (kind === 'quote' && r && r.header) r.termsInfo = qtSummary_(db, r.header);
  return r;
};

// ======================================================================= panel: Terms screen (injected into the main panel)
var QT_HTML_ = `
// ================= quote terms (QT1)
function fillT(s,tok){return String(s).replace(/\\{\\{(\\w+)\\}\\}/g,function(m,k){return tok[k]!=null?tok[k]:m;});}
S.terms=function(no){var box=el('div',null,'Loading…');call('uiTermsGet',no).then(function(r){box.innerHTML='';add(box,termsView(r));},fail);return box;};
function termsView(r){var lock=r.locked,back=function(){go('quotes',r.no);};
  var out=el('div',null,el('h2',{text:'Terms · '+r.no+(r.rev?' Rev '+r.rev:'')}),el('p',{cls:'muted',text:r.custName+' · '+r.type+' · '+r.status}));
  if(!r.ready){add(out,[el('div',{cls:'warn',text:'One-time set-up for terms per quote: adds 5 columns at the end of the Quotes tab and a QuoteTerms tab. Existing data is not changed.'}),
    btn('Set up now',function(){act('setupTerms',{}).then(function(){go('terms',r.no,true);}).catch(function(){});}),btn('Back to quote',back,'s')]);return out;}
  if(lock)add(out,el('div',{cls:'warn',text:r.lockMsg}));
  add(out,el('p',{cls:'muted',text:'Leave a box empty = standard. Fill only what is different for this client or job.'}));
  var F={};add(out,el('h3',{text:'Payment and hire'}));
  var g=el('div',{cls:'g'});
  r.fields.forEach(function(f){var x=f.kind==='rule'?sel([['','Standard ('+f.stdTxt+')'],['Full period','Full month'],['Pro rata','Pro rata by days']],f.value||''):inp(f.value,'number','standard '+f.stdTxt);
    x.disabled=lock;F[f.key]=x;add(g,el('div',null,el('label',{text:f.label+(f.unit?' ('+f.unit+')':'')}),x,el('span',{cls:'muted',text:'standard: '+f.stdTxt+' · '+f.src})));});
  add(out,g);
  var only=chk(false,'Show only clauses to fill or changed'),C=[],list=el('div');
  add(out,[el('h3',{text:'Clauses ('+r.type+')'}),el('p',{cls:'muted',text:'Teal [brackets] must be filled for this quote: choose Change wording, fill them, save. {{…}} fills in from the boxes above.'}),only.box,list]);
  var sec=null;
  r.clauses.forEach(function(c){var hd=null;
    if(c.sec!==sec){sec=c.sec;hd=el('div',{style:'font-weight:600;margin-top:10px',text:(c.sec?c.sec+'. ':'')+c.secTitle});add(list,hd);}
    var mode=sel([['std','Standard'],['edit','Change wording'],['remove','Remove from this quote']],c.mode),ta=el('textarea',{value:c.mode==='edit'?c.text:c.std,style:'min-height:70px'}),view=el('div',{style:'white-space:pre-wrap;margin-top:4px'});
    mode.disabled=lock;ta.disabled=lock;
    function sh(){var m=mode.value;ta.style.display=m==='edit'?'':'none';view.style.display=m==='edit'?'none':'';view.className=m==='remove'?'muted':'';view.textContent=m==='remove'?'(left out of this quote)':fillT(c.std,r.tokens);}
    mode.onchange=sh;sh();
    var tags=el('span',null,c.ph?el('span',{cls:'chip Pending',text:'fill in'}):null,' ',c.mode!=='std'?el('span',{cls:'chip Sent',text:c.mode==='remove'?'removed':'changed'}):null);
    var card=el('div',{cls:'card'},el('div',{cls:'top'},el('span',{text:(c.no?c.no+'  ':'')+(c.title||'')}),tags),mode,view,ta);
    add(list,card);C.push({id:c.id,mode:mode,ta:ta,card:card,hd:hd,keep:c.ph||c.mode!=='std'});});
  only.input.onchange=function(){var on=only.input.checked;C.forEach(function(c){c.card.style.display=on&&!c.keep&&c.mode.value==='std'?'none':'';if(c.hd)c.hd.style.display=on?'none':'';});};
  add(out,[el('h3',{text:'Extra clauses for this quote'}),el('p',{cls:'muted',text:'E.g. retention, special delivery or access conditions. Numbered at the end of the section you choose.'})]);
  var A=[],al=el('div');
  function addA(x){x=x||{};var s=sel(r.sections.map(function(z){return [z.no,(z.no?z.no+'. ':'')+z.title];}),x.sec||r.sections[r.sections.length-1].no),ti=inp(x.title,'text','optional'),te=el('textarea',{value:x.text||'',style:'min-height:60px'});
    s.disabled=ti.disabled=te.disabled=lock;var o={s:s,ti:ti,te:te};
    o.card=el('div',{cls:'card'},el('div',{cls:'top'},el('span',{text:x.no?'Clause '+x.no:'New clause'}),lock?null:btn('×',function(){A.splice(A.indexOf(o),1);o.card.remove();},'d x')),fld('Section',s),fld('Title',ti),fld('Wording',te));
    A.push(o);add(al,o.card);}
  r.added.forEach(addA);add(out,al);if(!lock)add(out,btn('+ Add clause',function(){addA();},'s x'));
  function save(reset){var v={quoteNo:r.no,settings:{},clauses:[],added:[]};
    if(!reset){Object.keys(F).forEach(function(k){v.settings[k]=F[k].value;});
      C.forEach(function(c){if(c.mode.value!=='std')v.clauses.push({id:c.id,mode:c.mode.value,text:c.ta.value});});
      A.forEach(function(o){if(o.te.value.trim()||o.ti.value.trim())v.added.push({section:o.s.value,title:o.ti.value,text:o.te.value});});}
    act('saveTerms',v).then(function(){go('quotes',r.no,true);}).catch(function(){});}
  add(out,el('div',{style:'margin-top:10px'},lock?null:btn('Save terms',function(){save(false);}),lock?null:dbtn('Reset all to standard',function(){save(true);}),btn('Back to quote',back,'s')));
  return out;}
`;
var QT_INJECT_ = [
  ["pdf:'PDF documents'};", "pdf:'PDF documents',terms:'Quote terms'};"],
  ["act('saveQuote',{quoteNo:no,header:hv,lines:L.map(function(c){return c.get();})}).then(function(x){go('quotes',x.ref,true);})",
    "act('saveQuote',{quoteNo:no,header:hv,lines:L.map(function(c){return c.get();})}).then(function(x){go('terms',x.ref,true);})"],
  ["pdfBtn('Quote',no,'Quotation PDF'),", "btn('Terms'+(r.termsInfo?' ('+r.termsInfo+')':''),function(){go('terms',no);},'s x'),pdfBtn('Quote',no,'Quotation PDF'),"],
  ['// ================= start', QT_HTML_ + '\n// ================= start'],
];
var QT_INJECTED_ = 0;
if (typeof UI_HTML_ === 'string') QT_INJECT_.forEach(function (x) {
  if (UI_HTML_.indexOf(x[0]) < 0) return;
  UI_HTML_ = UI_HTML_.replace(x[0], function () { return x[1]; }); QT_INJECTED_++;
});

// ======================================================================= self-test (in memory, your data is not touched)
if (typeof selfTestAllParts_ === 'function') {
  var QT_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return QT_parts0_().concat([['QT', selfTestQT()]]); };
}
function selfTestQT() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws;
  var db = pdfTestDb_(), Q1 = 'CAE/Q/2026/001', Q2 = 'CAE/Q/2026/002', Q3 = 'CAE/Q/2026/003', Q4 = 'CAE/Q/2026/004';
  var save = function (no, a) { return uiDoDb_(db, 'saveTerms', Object.assign({ quoteNo: no, settings: {}, clauses: [], added: [] }, a)); };
  var q = function (no) { return must(db, 'Quotes', 'QuoteNo', no); };
  var txt = function (no) { return JSON.stringify(PDF_SPECS.Quote(db, no).blocks); };
  var cl = function (type, no) { return find(QT_termsFor0_(db, type), 'ClauseNo', no); };
  step('T set-up', function () {
    upgradeO3(db, { docBaseId: 'X' });
    eq('T1 panel screen injected (4 places)', QT_INJECTED_, 4);
    eq('T2 not set up yet: view still works', qtView_(db, Q1).ready, false);
    eq('T3 set-up: 5 columns + tab', upgradeQT(db).length, 6);
    eq('T4 second run changes nothing', upgradeQT(db).length, 0);
    eq('T5 summary before any change (test quote has 2 months minimum)', qtSummary_(db, q(Q1)), '1 change · 1 to fill');
    var v = qtView_(db, Q1);
    eq('T6 Rental fields incl. hire terms', v.fields.map(function (f) { return f.key; }).join(','), 'AdvancePct,PaymentDays,ValidityDays,LateInterestPct,MinMonths,NoticeDays,PartPeriodRule');
    eq('T7 Sale fields: no hire terms', qtView_(db, Q2).fields.length, 4);
    eq('T8 standard shown from the customer', find(v.fields, 'key', 'PaymentDays').src + ' ' + find(v.fields, 'key', 'PaymentDays').stdTxt, 'customer Test Client 7 days');
  });
  step('T save + validation', function () {
    throws('T9 payment days 0 refused', function () { save(Q1, { settings: { PaymentDays: '0' } }); }, /from 1 to 365/);
    throws('T10 late interest 20% refused', function () { save(Q1, { settings: { LateInterestPct: '20' } }); }, /from 0 to 10/);
    throws('T11 part days refused', function () { save(Q1, { settings: { NoticeDays: '2.5' } }); }, /whole number/);
    throws('T12 unknown rule refused', function () { save(Q1, { settings: { PartPeriodRule: 'Weekly' } }); }, /Full period or Pro rata/);
    throws('T13 empty changed wording refused', function () { save(Q1, { settings: { MinMonths: '9' }, clauses: [{ id: cl('Rental', '3.3').ClauseID, mode: 'edit', text: ' ' }] }); }, /choose Remove/);
    eq('T13b a refused save writes nothing', q(Q1).MinMonths, 2);
    throws('T14 clause of another type refused', function () { save(Q1, { clauses: [{ id: cl('Sale', '5.4').ClauseID, mode: 'remove' }] }); }, /not in the Rental terms/);
    var r = save(Q1, {
      settings: { AdvancePct: '30', PaymentDays: '30', ValidityDays: '15', LateInterestPct: '3', MinMonths: '2', NoticeDays: '14', PartPeriodRule: 'Pro rata' },
      clauses: [{ id: cl('Rental', '3.3').ClauseID, mode: 'edit', text: 'The client shall give {{NoticeDays}} days written notice by email to off-hire.' },
        { id: cl('Rental', '7.1').ClauseID, mode: 'remove' }, { id: cl('Rental', '4.2').ClauseID, mode: 'edit', text: cl('Rental', '4.2').Text }],
      added: [{ section: '4', title: 'Retention', text: '10% of each invoice is retained until handover.' }, { section: '_new', title: 'Access', text: 'Site access road to be kept clear by the client.' }],
    });
    var x = q(Q1);
    eq('T15 saved on the quote', [x.AdvancePct, x.PaymentDays, x.ValidityDays, x.LateInterestPct, x.MinMonths, x.NoticeDays, x.PartPeriodRule].join(' '), '0.3 30 15 0.03 2 14 Pro rata');
    eq('T16 clause rows (same wording is not a change)', qtRows_(db, Q1).map(function (o) { return o.Action + ' ' + o.ClauseNo; }).join(', '), 'Replace 3.3, Remove 7.1, Add 4.5, Add 8.1');
    eq('T17 summary', r.msg, Q1 + ' terms saved: 11 changes · 1 to fill. Make the quotation PDF to see them.');
    save(Q2, { settings: { PaymentDays: '7', ValidityDays: '30' } });
    eq('T18 values equal to the standard stay standard', qtSummary_(db, q(Q2)) + ' ' + q(Q2).PaymentDays + '|' + q(Q2).ValidityDays, 'standard · 5 to fill |');
  });
  step('T quote PDF', function () {
    var t = txt(Q1);
    eq('T19 advance + payment days + interest', /30% advance with the work order/.test(t) && /within 30 days of the invoice date/.test(t) && /interest at 3% per month/.test(t), true);
    eq('T20 part month pro rata in 3.2', /a part month is charged pro rata by days/.test(t), true);
    eq('T21 changed 3.3 with token filled', /give 14 days written notice by email/.test(t), true);
    eq('T22 7.1 removed, valid until = 20 Nov + 15', !/This quotation is valid for/.test(t) && /5 December 2026/.test(t), true);
    eq('T23 extra clause in section 4 + special section 8, acceptance 9', /"4\.5","Retention"/.test(t) && /8\.  SPECIAL CONDITIONS/.test(t) && /9\.  ACCEPTANCE/.test(t), true);
    eq('T24 other quotes untouched', /Retention|SPECIAL CONDITIONS/.test(txt(Q2)), false);
    eq('T25 standard terms outside a quote unchanged', termsFor(db, 'Rental').length, QT_termsFor0_(db, 'Rental').length);
    var v = qtView_(db, Q1);
    eq('T26 view: modes + added', v.clauses.filter(function (c) { return c.mode !== 'std'; }).map(function (c) { return c.no + ' ' + c.mode; }).join(', ') + ' | ' + v.added.map(function (a) { return a.no + '@' + a.sec; }).join(', '), '3.3 edit, 7.1 remove | 4.5@4, 8.1@8');
    eq('T27 view: custom values shown, rest blank', v.fields.map(function (f) { return f.value === '' ? '-' : f.value; }).join(' '), '30 30 15 3 2 14 Pro rata');
  });
  step('T billing + invoices', function () {
    save(Q4, { settings: { ValidityDays: '60' } });
    save(Q3, { settings: { NoticeDays: '14' } });
    var job = quoteToJob(db, Q1, { date: '22-Nov-2026' });
    throws('T28 terms locked once the job exists', function () { save(Q1, {}); }, /already has job/);
    eq('T29 locked view', qtView_(db, Q1).locked, true);
    postOpeningStock(db, [{ ItemCode: 'RL-STD-20', Qty: 100 }, { ItemCode: 'BD-ST-207', Qty: 40 }], '01-Nov-2026');
    postChallan(db, createChallan(db, { jobNo: job, date: '01-Dec-2026', lines: [{ itemCode: 'RL-STD-20', qty: 50 }, { itemCode: 'BD-ST-207', qty: 20 }] }));
    var i1 = runHireBilling(db, '01-Dec-2026').invoices[0].no;
    postChallan(db, createChallan(db, { jobNo: job, date: '15-Dec-2026', lines: [{ itemCode: 'RL-STD-20', qty: 10 }] }));
    var i2 = runHireBilling(db, '31-Dec-2026').invoices[0];
    eq('T30 quote Pro rata used (Settings say Full period): 160 pc-days', (find(i2.lines.filter(function (l) { return l.ItemCode === 'RL-STD-20'; }), 'Unit', 'day') || {}).Qty, 160);
    var it = JSON.stringify(PDF_SPECS.Invoice(db, i1).blocks);
    eq('T31 invoice PDF: 30 days, 3%, due 31 Dec', /Payable within 30 days/.test(it) && /interest at 3% per month/.test(it) && /31 December 2026/.test(it), true);
    db.update('Invoices', must(db, 'Invoices', 'InvNo', i1), { Status: 'Sent' });
    refreshStatuses(db, '20-Dec-2026');
    eq('T32 not overdue at day 19 (customer standard 7 would be)', must(db, 'Invoices', 'InvNo', i1).Status, 'Sent');
    refreshStatuses(db, '05-Jan-2027');
    eq('T33 overdue after 30 days', must(db, 'Invoices', 'InvNo', i1).Status, 'Overdue');
    eq('T34 expiry per quote (002 standard 30 days expired, 004 60 days not)', q(Q2).Status + ' ' + q(Q4).Status, 'Expired Sent');
    var pj = quoteToJob(db, Q3, { date: '22-Nov-2026' });
    db.insert('OffHire', { OHNNo: 'CAE/OHN/2027/001', JobNo: pj, NoticeDate: toDate('10-Jan-2027'), OffHireDate: toDate('12-Jan-2027'), Scope: 'Full' });
    eq('T35 project hire end = notice + 14 days (quote)', fmtDay(hireEndDay(db, must(db, 'Jobs', 'JobNo', pj))), '24-Jan-2027');
  });
  step('T reset + panel', function () {
    db.update('Quotes', q(Q4), { Status: 'Sent' });
    save(Q4, { added: [{ section: '6', text: 'Extra visit on request.' }] });
    eq('T36 extra clause on a Service quote', qtRows_(db, Q4).length + ' ' + qtRows_(db, Q4)[0].ClauseNo, '1 6.11');
    save(Q4, {});
    eq('T37 reset to standard', qtRows_(db, Q4).length + ' ' + (q(Q4).ValidityDays || '-') + ' ' + qtSummary_(db, q(Q4)), '0 - standard · 7 to fill');
    eq('T38 quote view carries the terms summary', uiGetDb_(db, 'quote', Q2).termsInfo, 'standard · 5 to fill');
    var js = UI_HTML_.slice(UI_HTML_.indexOf('<script>') + 8, UI_HTML_.lastIndexOf('</script>'));
    eq('T39 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
    eq('T40 Terms screen + button + save flow in the panel', /S\.terms=/.test(UI_HTML_) && /go\('terms',x\.ref,true\)/.test(UI_HTML_) && /btn\('Terms'/.test(UI_HTML_), true);
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
