# M3 CR run 7 fix: sabotage only the new / changed lines. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr7.py <src dir>
import sys, os, runpy
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "  oScrLock_(function () { var r = find(db.rows(t), k, no);", "  (function (f) { var l = oLs_().getDocumentLock(); l.waitLock(60000); try { f(); } finally { l.releaseLock(); } })(function () { var r = find(db.rows(t), k, no);", 'K1 link write under the document lock (r6)'),
 (G, "  oScrLock_(function () { var r = find(db.rows(t), k, no);", "  (function (f) { f(); })(function () { var r = find(db.rows(t), k, no);", 'K2 link write with no lock'),
 (G, "if (r && db.headers(t).indexOf('PDF') >= 0) db.update(t, r, { PDF: url }); });", "if (r) db.update(t, r, { PDF: url }); });", 'K3 tab without PDF written'),
 (G, "var r0 = (st.make || makePdf)(d, w, n, { noLink: true });", "var r0 = (st.make || makePdf)(d, w, n);", 'K4 office make writes its own link'),
 (G, "oPdfLinkSet_(d, 'Quotes', 'QuoteNo', n, r0.url); return r0;", "return r0;", 'K5 office link never written'),
 (G, "  if (OLK_.s || (typeof LockService === 'undefined' && !OLK_.ls)) return fn();\n  var l = oLs_().getScriptLock(); try { l.waitLock(30000); } catch (e) { oFail_('BUSY'); }\n  OLK_.s++;", "  if (typeof LockService === 'undefined' && !OLK_.ls) return fn();\n  var l = oLs_().getScriptLock(); try { l.waitLock(30000); } catch (e) { oFail_('BUSY'); }\n  OLK_.s++;", 'S1 nested call takes the lock again'),
 (G, "  var l = oLs_().getScriptLock(); try { l.waitLock(30000); } catch (e) { oFail_('BUSY'); }\n  OLK_.s++; OLK_.g++; try { return fn(); }", "  var l = oLs_().getScriptLock(); try { l.waitLock(30000); } catch (e) { }\n  OLK_.s++; OLK_.g++; try { return fn(); }", 'S2 busy lock ignored'),
 (G, "OLK_.s++; OLK_.g++; try { return fn(); } finally { OLK_.s--; OLK_.g++; try { SpreadsheetApp.flush(); } finally { l.releaseLock(); } }\n}\n// CR run 6/7", "OLK_.s++; OLK_.g++; try { return fn(); } finally { OLK_.s--; OLK_.g++; l.releaseLock(); }\n}\n// CR run 6/7", 'S3 not flushed before release'),
 (G, "OLK_.s++; OLK_.g++; try { return fn(); } finally { OLK_.s--; OLK_.g++; try { SpreadsheetApp.flush(); } finally { l.releaseLock(); } }\n}\n// CR run 6/7", "OLK_.s++; OLK_.g++; var x = fn(); OLK_.s--; OLK_.g++; SpreadsheetApp.flush(); l.releaseLock(); return x;\n}\n// CR run 6/7", 'S4 lock kept on a failure'),
 (G, "  try { oScrLock_(run); } catch (e) {", "  try { run(); } catch (e) {", 'C1 check without the script lock'),
 (G, "if (String(e && e.message || e) !== 'BUSY') throw e; run(); }", "if (String(e && e.message || e) !== 'BUSY') throw e; }", 'C2 busy: not checked'),
 (G, "if (String(e && e.message || e) !== 'BUSY') throw e; run(); }", "throw e; }", 'C3 busy: error, not checked'),
 (G, "m = m.filter(function (x) { return oPeSince_(env, R.n, x.no); }); if (!m.length) return;", "", 'C4 always locks (no pre-check)'),
 (G, "m = m.filter(function (x) { return oPeSince_(env, R.n, x.no); });", "m = m.filter(function (x) { return !oPeSince_(env, R.n, x.no); });", 'C5 pre-check inverted'),
 (G, "  R.hit.push(no);\n  try { log_(db, 'PDF out of date', no,", "  if (mine) R.hit.push(no);\n  try { log_(db, 'PDF out of date', no,", 'C6 no warning unless own link cleared'),
 (G, "var mine = row ? oPdfNow_(db, t[0], row) === String(r.url) : false; // CR run 5", "var mine = !!row; // CR run 5", 'C7 clears a newer link'),
 (G, "if (OPE_RUN_ && !(o && o.noLink) && r && r.url) OPE_RUN_.made.push({ db: db, what: what, no: String(no), r: r }); return r; };", "return r; };", 'M1 made links not recorded'),
 (G, "if (OPE_RUN_ && !(o && o.noLink) && r && r.url) OPE_RUN_.made.push({ db: db, what: what, no: String(no), r: r }); return r; };", "if (OPE_RUN_ && !(o && o.noLink)) oPeFix_(OPE_RUN_, db, what, String(no), r); return r; };", 'M2 checked inside the document lock (r6)'),
 (G, "      if (!ok) { try { oPeCheck_(R); } catch (e) { /* a link written before the failure is checked too; the run's own error is reported */ } }\n", "", 'U1 failed run: link not checked'),
 (G, "      if (!ok) { try { oPeCheck_(R); } catch (e) { /* a link written before the failure is checked too; the run's own error is reported */ } }\n", "      if (!ok) oPeCheck_(R);\n", 'U2 failed run: check error hides the run error'),
 (G, "    oPeCheck_(R);\n    if (R.hit.length && r && typeof r === 'object') { r.warn = true;", "    if (R.hit.length && r && typeof r === 'object') { r.warn = true;", 'U3 success path not checked'),
 (G, "    oPeCheck_(R);\n    if (R.hit.length && r && typeof r === 'object') {", "    try { oPeCheck_(R); } catch (e) { }\n    if (R.hit.length && r && typeof r === 'object') {", 'U4 failed clear swallowed'),
 (G, "    try { r = OPE_uiDo0_.apply(this, arguments); ok = true; } finally {\n      OPE_RUN_ = k; // the run's document lock is let go here", "    try { r = OPE_uiDo0_.apply(this, arguments); ok = true; } finally {\n      // the run's document lock is let go here", 'U5 OPE_RUN_ left set'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
