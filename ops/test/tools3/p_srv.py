import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a)
    assert c==n,(a[:60],c)
    s=s.replace(a,b)
# 1) fast path in officeQuoteSave
rep("""    var r, rk = q ? 'OQRV:' + String(q.QuoteNo) : '';
""","""    if (q && oW4gSame_(db, q, x, ty0)) { // W4g: nothing would change -> no row write, no Log, no refetch; the view from this lock's batch
      var o5 = { no: String(q.QuoteNo), rev: num(q.Rev), status: String(q.Status || 'Draft'), was: was, changed: false, ev: d.ev };
      if (d.pdf !== true) try { var db5 = env.db() || db; o5.view = oQView_(db5, env, oQRow_(db5, q.QuoteNo), L); } catch (e) { delete o5.view; }
      return o5;
    }
    var r, rk = q ? 'OQRV:' + String(q.QuoteNo) : '';
""")
rep("""    var q3 = must(env.db() || d2, 'Quotes', 'QuoteNo', ref), out = { no: ref, rev: num(q3.Rev), status: String(q3.Status || 'Draft'), was: was, changed: changed };
""","""    var d3 = env.db() || d2, q3 = must(d3, 'Quotes', 'QuoteNo', ref), out = { no: ref, rev: num(q3.Rev), status: String(q3.Status || 'Draft'), was: was, changed: changed };
    try { out.ev = oQeEv_(d3, q3); } catch (e) { /* W4g: the page then opens the form again for the next save */ }
""")
# 2) helpers before officeQuoteSave
rep("""function officeQuoteSave(token, d) {
""","""// W4g: would this save change any cell? The same save (every wrapper of saveQuoteFull) runs on a copy-on-read shadow of the
// lock's batch (a tab's rows are copied when first read; writes stay in the copy). Any error, another type, other validity days,
// a new tab / column, another row count or any cell that would differ = changed -> the normal save runs as before. Log not compared.
function OW4gShadow_(db) { this.b = db; this.h = {}; this.t = {}; this.ow4gL_ = uiLists_(db); }
if (typeof MemDb === 'function') {
  OW4gShadow_.prototype = Object.create(MemDb.prototype);
  OW4gShadow_.prototype.hasTab = function (t) { return !!this.h[t] || this.b.hasTab(t); };
  OW4gShadow_.prototype.headers = function (t) { if (!this.h[t]) this.h[t] = this.b.headers(t).slice(); return this.h[t]; };
  OW4gShadow_.prototype.rows = function (t) { this.headers(t); if (!this.t[t]) this.t[t] = this.b.rows(t).map(function (r) { return Object.assign({}, r); }); return this.t[t]; };
  OW4gShadow_.prototype.insert = function (t, objs) { this.rows(t); return MemDb.prototype.insert.call(this, t, objs); };
  OW4gShadow_.prototype.ensureTab = function (t, headers) { if (this.hasTab(t)) return false; this.h[t] = headers.slice(); this.t[t] = []; return true; };
  OW4gShadow_.prototype.ensureColumn = function (t, col, after) { this.rows(t); return MemDb.prototype.ensureColumn.call(this, t, col, after); };
}
function oW4gEq_(a, b) { // a = the shadow's value, b = the sheet's (the sheet keeps a leading ' as text, not as a character)
  if (a == null) a = ''; if (b == null) b = '';
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  if (typeof a === 'string' && typeof b === 'string') return a === b || (a.charAt(0) === "'" && a.slice(1) === b);
  return a === b;
}
function oW4gSame_(db, q, x, ty0) {
  if (typeof MemDb !== 'function' || !(OW4gShadow_.prototype instanceof MemDb) || String(x.a.header.QuoteType) !== ty0) return false;
  try {
    if (db.headers('Quotes').indexOf('ValidityDays') >= 0) { var std = num(S(db, 'QuoteValidityDays', 30)), v = x.days === std ? '' : x.days; if (String(q.ValidityDays == null ? '' : q.ValidityDays) !== String(v)) return false; }
    var a = x.a, sh = new OW4gShadow_(db), cp = function (o) { return o && typeof o === 'object' ? Object.assign({}, o) : o; };
    UI_ACTIONS_.saveQuoteFull(sh, { quoteNo: a.quoteNo, header: cp(a.header), lines: a.lines.map(cp), customer: cp(a.customer), site: cp(a.site) });
    for (var t in sh.h) {
      if (t === 'Log') continue;
      if (!db.hasTab(t)) return false;
      var h1 = sh.h[t]; if (db.headers(t).length !== h1.length) return false;
      if (!sh.t[t]) continue;
      var r0 = db.rows(t), r1 = sh.t[t]; if (r0.length !== r1.length) return false;
      for (var i = 0; i < r1.length; i++) for (var k = 0; k < h1.length; k++) if (!oW4gEq_(r1[i][h1[k]], r0[i][h1[k]])) return false;
    }
    return true;
  } catch (e) { return false; }
}
function officeQuoteSave(token, d) {
""")
# 3) Lists for the shadow = the real ones
rep("""  uiLists_.ow4e_ = true;
}
""","""  uiLists_.ow4e_ = true;
}
if (typeof uiLists_ === 'function' && !uiLists_.ow4g_) { // W4g: the dry-run shadow sees the Lists of the batch it copies
  var OW4G_lists0_ = uiLists_;
  uiLists_ = function (db) { if (db && db instanceof OW4gShadow_ && db.ow4gL_) return JSON.parse(JSON.stringify(db.ow4gL_)); return OW4G_lists0_(db); };
  uiLists_.ow4e_ = true; uiLists_.ow4g_ = true;
}
""")
# 4) tests after O337
rep("""        eq('O337 W4c: the save returns the quote view = officeQuoteGet (no second call)', [!!sv.view, sv.view && sv.view.no === sv.no, j(sv.view) === j(gv), sv.view && sv.view.subject].join('|'), 'true|true|true|W4c view');
""","""        eq('O337 W4c: the save returns the quote view = officeQuoteGet (no second call)', [!!sv.view, sv.view && sv.view.no === sv.no, j(sv.view) === j(gv), sv.view && sv.view.subject].join('|'), 'true|true|true|W4c view');
        // W4g: a save that changes nothing writes nothing
        var fa = function (F, o) { return base(Object.assign({ no: qS, ev: F.ev, lines: F.lines, attention: F.attention, subject: F.subject, valid: F.valid, date: F.date }, o || {})); };
        e5.cdel('OQEW:sales4@t.com'); var FG = officeQuoteForm(tS, qS).quote, nU = 0, nI = 0, u0g = db.update, i0g = db.insert, lg0 = db.rows('Log').length, rG;
        db.update = function () { nU++; return u0g.apply(db, arguments); }; db.insert = function () { nI++; return i0g.apply(db, arguments); };
        try { rG = officeQuoteSave(tS, fa(FG)); } finally { db.update = u0g; db.insert = i0g; }
        eq('O371 W4g: a save that changes nothing writes nothing (no row, no Log), returns the view + the same ev + the status', [rG.changed, nU, nI, db.rows('Log').length === lg0, !!rG.view && rG.view.no === qS, rG.ev === FG.ev, rG.status === String(must(db, 'Quotes', 'QuoteNo', qS).Status), rG.rev === num(must(db, 'Quotes', 'QuoteNo', qS).Rev)].join('|'), 'false|0|0|true|true|true|true|true');
        var FH = officeQuoteForm(tS, qS).quote, rH = officeQuoteSave(tS, fa(FH, { attention: 'Changed W4g' })), FH2 = officeQuoteForm(tS, qS).quote, rH2 = officeQuoteSave(tS, fa(FH2, { ev: rH.ev, attention: 'Changed W4g 2' }));
        eq('O372 W4g: one changed field saves as before; the answer carries the new ev (= the form\\'s); the next save with it works', [rH.changed, rH.ev === FH2.ev, rH.ev !== FH.ev, rH2.changed, oUncell_(must(db, 'Quotes', 'QuoteNo', qS).Attention)].join('|'), 'true|true|true|true|Changed W4g 2');
        var FI = officeQuoteForm(tS, qS).quote, nL = ql(qS).length; e5.cdel('OQEW:sales4@t.com');
        var rI = officeQuoteSave(tS, fa(FI, { lines: FI.lines.slice(0, 1) })), FJ = officeQuoteForm(tS, qS).quote, rJ = officeQuoteSave(tS, fa(FJ, { valid: '2026-12-30' })), FK = officeQuoteForm(tS, qS).quote;
        eq('O373 W4g: a removed line / other valid-until date / a changed line are changes', [nL > 1, rI.changed, ql(qS).length, rJ.changed, FK.valid, officeQuoteSave(tS, fa(FK, { lines: [Object.assign({}, FK.lines[0], { rate: FK.lines[0].rate + 1 })] })).changed].join('|'), 'true|true|1|true|2026-12-30|true');
        var shT = new OW4gShadow_(db), lq = db.rows('Log').length, q0s = db.rows('Quotes')[0], s0 = q0s.Subject, hq = db.headers('Quotes').length;
        shT.rows('Quotes')[0].Subject = 'W4g shadow'; shT.insert('Log', { Action: 'x' }); shT.ensureColumn('Quotes', 'W4gX'); shT.rows('QuoteLines').splice(0, 1);
        eq('O374 W4g: the dry run works on copies (real rows, Log, headers, lines untouched)', [q0s.Subject === s0, db.rows('Log').length === lq, db.headers('Quotes').indexOf('W4gX'), db.headers('Quotes').length === hq, shT.rows('Log').length === lq + 1, shT.rows('QuoteLines').length === db.rows('QuoteLines').length - 1].join('|'), 'true|true|-1|true|true|true');
        eq('O375 W4g: cell compare (leading quote = the sheet\\'s text, dates by time, no type mix)', [oW4gEq_("'=x", '=x'), oW4gEq_(new Date(2026, 0, 1), new Date(2026, 0, 1)), oW4gEq_(null, ''), oW4gEq_(5, '5'), oW4gEq_('a', 'b'), oW4gEq_(new Date(1), 1), oW4gEq_('=x', "'=x"), oW4gEq_(0, '')].join(','), 'true,true,true,false,false,false,false,false');
        var kS = UI_ACTIONS_.saveQuoteFull, FL = officeQuoteForm(tS, qS).quote, lg1 = db.rows('Log').length, rL; e5.cdel('OQEW:sales4@t.com');
        UI_ACTIONS_.saveQuoteFull = function (dx, ax) { if (dx instanceof OW4gShadow_) throw new Error('shadow boom'); return kS(dx, ax); };
        try { rL = officeQuoteSave(tS, fa(FL)); } finally { UI_ACTIONS_.saveQuoteFull = kS; }
        eq('O376 W4g: a dry run that fails -> the normal save decides (writes + Log as before, still no change)', [rL.changed, db.rows('Log').length === lg1 + 1, rL.ev === FL.ev].join('|'), 'false|true|true');
        var FM = officeQuoteForm(tS, qS).quote, lg2 = db.rows('Log').length, rM = officeQuoteSave(tS, fa(FM, { pdf: true }));
        eq('O377 W4g: no-change save with Save & PDF: no write, the PDF step as before', [rM.changed, db.rows('Log').length === lg2, typeof rM.pdf === 'string'].join('|'), 'false|true|true');
""")
open(p,'w',encoding='utf-8').write(s)
print('ok')
