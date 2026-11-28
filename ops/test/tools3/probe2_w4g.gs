

// W4g round-2 probe — TEMPORARY (removed after the run). End to end on the REAL sheet, TEST quote CAE/Q/2026/004 only:
// unchanged / change / unchanged … incl. the leading-apostrophe cases; restores Attention + Subject at the end.
function officeW4gProbe2() {
  var env = oEnv_(), keys = PropertiesService.getScriptProperties().getKeys().filter(function (k) { return /^OL:/.test(k); }), L = null;
  keys.forEach(function (k) { var x = env.get(k); if (!L && x && x.status === 'Active' && x.dir === true) L = x; });
  if (!L) throw new Error('no Director login');
  var s0 = officeSession_, e0 = oEnv_, tok = new Array(65).join('a'), out = [], NO = 'CAE/Q/2026/004', lg = function () { return SpreadsheetApp.openById(OFFICE_DB_ID_).getSheetByName('Log').getLastRow(); };
  officeSession_ = function () { return L; };
  oEnv_ = function () { var e = e0(); e.db = function () { return oW4dOn_(new SheetDb(SpreadsheetApp.openById(OFFICE_DB_ID_))); }; return e; }; // web-like
  var F0 = officeQuoteForm(tok, NO).quote, keepA = F0.attention, keepS = F0.subject, step = 0;
  var save = function (lab, ch, want) {
    var q = officeQuoteForm(tok, NO).quote, d = { no: q.no, ev: q.ev, type: q.type, cust: q.cust, site: q.site, attention: q.attention, subject: q.subject, date: q.date, valid: q.valid, prep: q.prep, adv: q.adv, pdf: false,
      lines: q.lines.map(function (l) { return { code: l.code, desc: l.desc, qty: l.qty, unit: l.unit, rate: l.rate, opt: l.opt, chosen: l.chosen, basis: l.basis, dim: l.dim }; }) };
    for (var k in ch) d[k] = ch[k];
    var n0 = lg(), t0 = Date.now(), r = officeQuoteSave(tok, d), tt = Date.now() - t0, q2 = officeQuoteForm(tok, NO).quote, n1 = lg();
    var cell = SpreadsheetApp.openById(OFFICE_DB_ID_).getSheetByName('Quotes'), hd = cell.getRange(1, 1, 1, cell.getLastColumn()).getValues()[0], rr = cell.getDataRange().getValues().filter(function (x) { return x[hd.indexOf('QuoteNo')] === NO; })[0];
    var stored = { att: rr[hd.indexOf('Attention')], sub: rr[hd.indexOf('Subject')] }, ok = r.changed === want.changed && (want.sub === undefined || stored.sub === want.sub) && (want.att === undefined || stored.att === want.att) && (n1 - n0) === (want.changed ? 1 : 0) && r.ev === q2.ev;
    out.push('W4G2 ' + (++step) + ' ' + lab + ' ' + (ok ? 'OK' : 'BAD') + ' changed ' + r.changed + ' log ' + (n1 - n0) + ' ms ' + tt + ' sub ' + JSON.stringify(stored.sub).replace(/[^A-Za-z0-9 '-]/g, '') + ' att ' + JSON.stringify(stored.att).replace(/[^A-Za-z0-9 '-]/g, ''));
  };
  try {
    save('unchanged', {}, { changed: false });
    save('attention', { attention: 'TEST probe' }, { changed: true, att: 'TEST probe' });
    save('unchanged', {}, { changed: false });
    save('subject -Hire', { subject: '-Hire' }, { changed: true, sub: '-Hire' });
    save('unchanged', {}, { changed: false });
    save('subject literal apostrophe', { subject: "'-Hire" }, { changed: true, sub: "'-Hire" });
    save('unchanged', {}, { changed: false });
    save('back to -Hire (CR case)', { subject: '-Hire' }, { changed: true, sub: '-Hire' });
    save('restore', { attention: keepA, subject: keepS }, { changed: true, att: keepA, sub: keepS });
    save('unchanged', {}, { changed: false });
  } finally { officeSession_ = s0; oEnv_ = e0; }
  out.forEach(function (x) { Logger.log(x); });
  return out;
}
