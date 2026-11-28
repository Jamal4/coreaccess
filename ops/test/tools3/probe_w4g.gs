
// W4g probe — TEMPORARY (removed after the run). Unchanged saves of TEST quote CAE/Q/2026/004: bound sheet x3, forced openById x3 (web-like).
function officeW4gProbe() {
  var env = oEnv_(), keys = PropertiesService.getScriptProperties().getKeys().filter(function (k) { return /^OL:/.test(k); }), L = null;
  keys.forEach(function (k) { var x = env.get(k); if (!L && x && x.status === 'Active' && x.dir === true) L = x; });
  if (!L) throw new Error('no Director login');
  var s0 = officeSession_, e0 = oEnv_, g0 = oW4gSame_, tok = new Array(65).join('a'), out = [], dry = 0, dryN = 0;
  officeSession_ = function () { return L; };
  oW4gSame_ = function () { var t = Date.now(); try { return g0.apply(this, arguments); } finally { dry += Date.now() - t; dryN++; } };
  try {
    ['bound', 'openById'].forEach(function (mode) {
      oEnv_ = mode === 'bound' ? e0 : function () { var e = e0(); e.db = function () { return oW4dOn_(new SheetDb(SpreadsheetApp.openById(OFFICE_DB_ID_))); }; return e; };
      for (var i = 1; i <= 3; i++) {
        var q = officeQuoteForm(tok, 'CAE/Q/2026/004').quote, lg = SpreadsheetApp.openById(OFFICE_DB_ID_).getSheetByName('Log').getLastRow();
        var d = { no: q.no, ev: q.ev, type: q.type, cust: q.cust, site: q.site, attention: q.attention, subject: q.subject, date: q.date, valid: q.valid, prep: q.prep, adv: q.adv, pdf: false,
          lines: q.lines.map(function (l) { return { code: l.code, desc: l.desc, qty: l.qty, unit: l.unit, rate: l.rate, opt: l.opt, chosen: l.chosen, basis: l.basis, dim: l.dim }; }) };
        dry = 0; dryN = 0; var t0 = Date.now(), r = officeQuoteSave(tok, d), tt = Date.now() - t0;
        var lg2 = SpreadsheetApp.openById(OFFICE_DB_ID_).getSheetByName('Log').getLastRow();
        out.push('W4G ' + mode + ' ' + i + ' total ' + tt + ' ms dry ' + dry + ' ms x' + dryN + ' changed ' + r.changed + ' view ' + !!r.view + ' sameEv ' + (r.ev === q.ev) + ' logRows ' + (lg2 - lg) + ' rev ' + r.rev + ' ' + r.status);
      }
    });
  } finally { officeSession_ = s0; oEnv_ = e0; oW4gSame_ = g0; }
  out.forEach(function (x) { Logger.log(x); });
  return out;
}
