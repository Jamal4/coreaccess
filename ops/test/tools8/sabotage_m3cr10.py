# M3 CR run 10 fix: sabotage only the new / changed lines. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr10.py <src dir>
import sys, os
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, 'catch (e) { if (ok) throw e; } finally { l.releaseLock(); } }', 'catch (e) { throw e; } finally { l.releaseLock(); } }', 'S1 flush error hides the operation error (r9)'),
 (G, 'catch (e) { if (ok) throw e; } finally { l.releaseLock(); } }', 'catch (e) { } finally { l.releaseLock(); } }', 'S2 flush error swallowed'),
 (G, 'catch (e) { if (ok) throw e; } finally { l.releaseLock(); } }', 'catch (e) { if (ok) throw e; } l.releaseLock(); }', 'S6 lock kept on a flush failure'),
 (G, "var ok = false; try { var v = fn(); ok = true; return v; } finally { oLkEnd_(l, ok); } }, // flushed first", "var ok = false; try { var v = fn(); return v; } finally { oLkEnd_(l, ok); } }, // flushed first", 'S3 env.lock: ok never set'),
 (G, 'var ok = false; try { var v = OLK_withLock0_(fn); ok = true; return v; }', 'var ok = false; try { var v = OLK_withLock0_(fn); return v; }', 'S4 withLock: ok never set'),
 (G, "  OLK_.s++; OLK_.g++; var ok = false; try { var v = fn(); ok = true; return v; } finally { oLkEnd_(l, ok); }\n}", "  OLK_.s++; OLK_.g++; var ok = false; try { var v = fn(); return v; } finally { oLkEnd_(l, ok); }\n}", 'S5 oScrLock_: ok never set'),
 (G, 'd0 = env.db() || db; oQRevFix_(env, d0,', 'oQRevFix_(env, d0,', 'S7 no read under the lease (r9)'),
 (G, 'var v = oQPdfVer_(d0, q.QuoteNo).v;', 'var v = oQPdfVer_(db, q.QuoteNo).v;', 'S8 fingerprint from the click read'),
 (G, 'r = qf5Pdf_(d0, q.QuoteNo,', 'r = qf5Pdf_(db, q.QuoteNo,', 'S9 render from the click read'),
 (G, '  if (ok) return; // no PDF column / no row', '  // removed', 'S10 no column -> BUSY'),
 (G, "d1.update('Quotes', r, { PDF: url }); pub = true;", "d1.update('Quotes', r, { PDF: url });", 'S11 pub never set'),
 (G, '  if (pub) { oBinNow_(bin, ids); return; }', '  if (ok) { oBinNow_(bin, ids); return; }', 'S12 old copies binned with no link (r9)'),
 (G, 'if (oPdfNewer_(r.PDF, url)) ok = false; else {', 'if (false) ok = false; else {', 'S13 office over a newer link (r9)'),
 (G, '  try { var B = DriveApp.getFileById(b); if (B.isTrashed() === true) return true; return', '  try { var B = DriveApp.getFileById(b); return', 'S14 own binned file linked'),
 (G, 'DriveApp.getFileById(a).getDateCreated().getTime() > B.getDateCreated().getTime(); } catch (e) { return false; }', 'DriveApp.getFileById(a).getDateCreated().getTime() < B.getDateCreated().getTime(); } catch (e) { return false; }', 'S15 date order reversed'),
 (G, 'DriveApp.getFileById(a).getDateCreated().getTime() > B.getDateCreated().getTime(); } catch (e) { return false; }', 'DriveApp.getFileById(a).getDateCreated().getTime() > B.getDateCreated().getTime(); } catch (e) { return true; }', 'S17 Drive unreadable -> refused'),
 (G, "  if (oPdfNewer_(row.PDF, x.r.url)) return 'newer'; // CR run 10\n", '', 'S18 panel over a newer link (r9)'),
 (G, "x.st = p === 'newer' ? 'newer' : p ? 'in' : 'none';", "x.st = p ? 'in' : 'none';", 'S19 newer read as in'),
 (G, "if (x.st === 'newer') { R.newer.push(x.no); ids.forEach(", "if (x.st === 'newer') { ids.forEach(", 'S20 newer not reported'),
 (G, "if (x.st === 'newer') { R.newer.push(x.no); ids.forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* an unlinked copy may stay */ } }); return; }", "if (x.st === 'newer') { R.newer.push(x.no); return; }", 'S21 own unkept file left'),
 (G, 'if ((R.hit.length || R.busy.length || R.newer.length) && r', 'if ((R.hit.length || R.busy.length) && r', 'S22 newer: no warn / links kept'),
 (G, "(R.newer.length ? '\\n' + U(R.newer) + ': a newer PDF was made meanwhile and is the one linked; this one was not kept.' : '')", "''", 'S23 newer not said'),
 (G, "R = { n: oPeN_(), hit: [], busy: [], newer: [], made: [] }", "R = { n: oPeN_(), hit: [], busy: [], made: [] }", 'S36 newer list missing'),
 (G, "if (em !== 'BUSY') throw new Error('The PDF was made, but its link may not have been saved (' + em + '). Make the PDF again.');", "if (em !== 'BUSY') throw e;", 'S24 raw flush error (r9)'),
 (G, "  cl.forEach(function (x) { if (x[1]) log_(db, 'PDF out of date', x[0][2], 'Item ' + code + ' changed; old PDF ' + x[1]); });\n", '', 'S25 no out-of-date log'),
 (G, "  cl.forEach(function (x) { if (x[1]) log_(db, 'PDF out of date',", "  cl.forEach(function (x) { db.update(x[0][0], x[0][1], { PDF: '' }); if (x[1]) log_(db, 'PDF out of date',", 'S26 clears between the logs (r9)'),
 (G, 'if (x[1]) { n++; undo.push(x); }', 'if (x[1]) { n++; }', 'S27 nothing to put back'),
 (G, 'catch (e) { oStPdfBack_(env, db, po.undo, code, prev); throw e; }', 'catch (e) { throw e; }', 'S28 links not put back (r9)'),
 (G, "if (!r || Object.keys(prev).some(function (k) { return !same(r[k], prev[k]); })) return;", 'if (!r) return;', 'S29 put back over a write that went in'),
 (G, "if (!r || Object.keys(prev).some(function (k) { return !same(r[k], prev[k]); })) return; } catch (e) { return; }", "if (!r || Object.keys(prev).some(function (k) { return !same(r[k], prev[k]); })) return; } catch (e) { }", 'S30 unreadable -> put back'),
 (G, 'ch.forEach(function (k) { prev[k] = row[k]; });', 'ch.forEach(function (k) { prev[k] = p[k]; });', 'S33 prev = the new values'),
 (G, "log_(db, 'PDF link kept', x[0][2], 'Item ' + code + ' not saved; PDF ' + x[1]);", '', 'S34 put back not logged'),
 (G, '  return { n: n, undo: undo };', '  return { n: 0, undo: undo };', 'S35 count lost'),
 (H, "return e.tagName==='SELECT'||e.readOnly?e.value:e.value.trim();", 'return e.value.trim();', 'H1 list values trimmed (r9)'),
 (H, "cat:vl('xk'),", "cat:v('xk'),", 'H2 category trimmed'),
 (H, "unit:vl('xu')", "unit:v('xu')", 'H3 unit trimmed'),
 (H, "var g2=m.target.closest&&m.target.closest('[role=radiogroup]');if(g2)fix(g2);", '', 'H6 removal not seen'),
 (H, "attributeFilter:['aria-checked','disabled']", "attributeFilter:['aria-checked']", 'H7 disabling not seen'),
 (H, 'a.forEach(function(x){var t=x===c?', 'r.forEach(function(x){var t=x===c?', 'H8 disabled radio keeps its Tab stop'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
