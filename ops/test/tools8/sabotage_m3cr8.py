# M3 CR run 8 fix: sabotage only the new / changed lines. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr8.py <src dir>
import sys, os, runpy
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "oQRevFix_(env, db, q.QuoteNo); env.put(key, { t: tok, u: env.now() + 360000 }); });", "env.put(key, { t: tok, u: env.now() + 360000 }); oQRevFix_(env, db, q.QuoteNo); });", 'L1 lease before the revision fix (r7)'),
 (G, "    ok = oQPdfVer_(env.db() || d, no).v === v;", "    ok = true;", 'V1 no version check'),
 (G, "    ok = oQPdfVer_(env.db() || d, no).v === v;", "    ok = oQPdfVer_(d, no).v === v;", 'V2 compared with this request\'s rows, not a fresh read'),
 (G, "  oScrLock_(function () {\n    ok = oQPdfVer_(env.db() || d, no).v === v;", "  ok = oQPdfVer_(env.db() || d, no).v === v;\n  oScrLock_(function () {", 'V3 check outside the script lock'),
 (G, "  oFail_('BUSY');\n}\nfunction oQPdfUse_", "}\nfunction oQPdfUse_", 'V4 mismatch not reported'),
 (G, "r0 && r0.doc].forEach(function (u) { var id = oPdfIdOf_(u); if (id) try { DriveApp.getFileById(id).setTrashed(true); }", "r0 && r0.doc].forEach(function (u) { var id = oPdfIdOf_(u); if (id) try { }", 'V5 unlinked PDF not binned'),
 (G, "    if (ok) { var r = find(d.rows('Quotes'), 'QuoteNo', no);", "    { var r = find(d.rows('Quotes'), 'QuoteNo', no);", 'V6 link written on a mismatch'),
 (G, "d.update('Quotes', r, { PDF: r0.url }); }", "void 0; }", 'V7 link never written'),
 (G, "kitN = oStSetRef_(db, code);", "kitN = (oStKit_(db)[code] || []).length;", 'K1 set guard on the valid kit only (r7)'),
 (G, "  if (oStSetRef_(db, code) || oStPart_(db, code)) return true;", "  if ((oStKit_(db)[code] || []).length || oStPart_(db, code)) return true;", 'K2 unit guard on the valid kit only (r7)'),
 (G, "return String(k.SetCode == null ? '' : k.SetCode).trim().toUpperCase() === cu; });", "return String(k.SetCode) === cu; });", 'K3 set code not trimmed / upper-cased'),
 (G, "catch (e) { if (mine) R.made.push({ db: db, what: what, no: String(no), r: { url: mine } }); throw e; }", "catch (e) { throw e; }", 'P1 failed make: its link not checked (r7)'),
 (G, "    if (on && r && r.url) R.made.push(", "    if (false) R.made.push(", 'P5 success path not recorded'),
 (G, "R.hit.filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ')", "R.hit.join(', ')", 'P6 warning names a document twice'),
 (G, "      QF5_STUB_ = { make: function (d, w, n, o) { var u = 'https://x/' + (++made); if (!(o && o.noLink)) d.update(", "      QF5_STUB_ = { make: function (d, w, n, o) { var u = 'https://x/' + (++made); if (true) d.update(", 'O1 self-test stub writes the link on noLink'),
 (H, "(x.isSet||!(Math.abs(+x[ST.f]||0)>1e-9))", "(x.isSet||!(x[ST.f]>0))", 'H1 negative balance hidden (r7)'),
 (H, "  if(!fr||!locs.length||!items.length){\n    if(!fr){var my=", "  if(!locs.length||!items.length){\n    if(!ST.loaded){var my=", 'H2 opening form uses cached lists (r7)'),
 (H, "if(document.getElementById('slist'))stsDraw();stOpenDlg(pre,true);}", "stOpenDlg(pre,true);}", 'H3 list not redrawn after the fresh read'),
 (H, "ST.rows.sort(function(a,b){return a.code.localeCompare(b.code);});ST.loaded=true;if(document.getElementById('slist'))stsDraw();", "ST.loaded=true;if(document.getElementById('slist'))stsDraw();", 'H9 refreshed list not in code order'),
 (H, "  document.addEventListener('keydown',function(e){var k=e.key,", "  0&&document.addEventListener('keydown',function(e){var k=e.key,", 'H4 no arrow keys'),
 (H, "  if(document.body)go();else document.addEventListener('DOMContentLoaded',go);", "", 'H5 no single Tab stop'),
 (H, "(i+d+r.length)%r.length", "Math.min(r.length-1,Math.max(0,i+d))", 'H6 arrows do not wrap'),
 (H, "var j=d===-2?0:d===2?r.length-1:", "var j=d===-2?i:d===2?i:", 'H7 Home / End do nothing'),
 (H, "all(document.body);new MutationObserver(", "all(document.body);0&&new MutationObserver(", 'H8 Tab stop not moved after a change'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
