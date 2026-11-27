# M3 CR run 11 fix: sabotage only the new / changed lines. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr11.py <src dir>
import sys, os
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "return Math.floor((oStYard_(Q[p.p], locs) + 1e-9) / p.q);", "return Math.floor(oStGroups_(Q[p.p], locs).yard / p.q + 1e-9);", 'S1 rounded yard (r10)'),
 (G, "return Math.floor((oStYard_(Q[p.p], locs) + 1e-9) / p.q);", "return Math.floor(oStYard_(Q[p.p], locs) / p.q);", 'S2 no tolerance'),
 (G, "return Math.floor((oStYard_(Q[p.p], locs) + 1e-9) / p.q);", "return Math.floor((oStYard_(Q[p.p], locs) + 1e-3) / p.q);", 'S3 loose tolerance'),
 (G, "OST_GRP_[String(locs[l].Type)] === 'yard') y += q[l];", "OST_GRP_[String(locs[l].Type)]) y += q[l];", 'S4 every location counted'),
 (G, "OST_GRP_[String(locs[l].Type)] === 'yard') y += q[l];", "OST_GRP_[String(locs[l].Type)] === 'yard') y = r2(y + q[l]);", 'S5 rounded sum'),
 (G, "if (JSON.stringify(p1) !== JSON.stringify(p0)) po.oqp.push([k, p0, p1]);", "", 'S6 OQP not recorded'),
 (G, "cl.forEach(function (x) { if (x[1]) po.undo.push([x[0][0], x[0][1], x[0][2], x[1]]); db.update(x[0][0], x[0][1], { PDF: '' }); if (x[1]) n++; });",
     "cl.forEach(function (x) { db.update(x[0][0], x[0][1], { PDF: '' }); if (x[1]) po.undo.push([x[0][0], x[0][1], x[0][2], x[1]]); if (x[1]) n++; });", 'S8 undo after the clear'),
 (G, "if (x[1]) po.undo.push([x[0][0], x[0][1], x[0][2], x[1]]); db.update(", "db.update(", 'S9 no link undo'),
 (G, "  } catch (e) { oStUndo_(env, db, po, code); throw e; }\n  po.n = n; return po;", "  } catch (e) { throw e; }\n  po.n = n; return po;", 'S10 no put-back on a throw part way (r10)'),
 (G, "  } catch (e) { oStUndo_(env, db, po, code); throw e; }\n  po.n = n; return po;", "  } catch (e) { oStUndo_(env, db, po, code); }\n  po.n = n; return po;", 'S11 throw swallowed'),
 (G, "  po.n = n; return po;", "  return po;", 'S12 count lost'),
 (G, "if (!po || !(po.undo.length || po.oqp.length)) return;", "if (!po || !po.undo.length) return;", 'S13 OQP only with links'),
 (G, "if (JSON.stringify(env.get(x[0])) !== JSON.stringify(x[2])) return; if (x[1] == null)", "if (x[1] == null)", 'S14 OQP over a newer marker'),
 (G, "if (x[1] == null) env.del(x[0]); else env.put(x[0], x[1]);", "if (x[1] == null) env.del(x[0]);", 'S16 old marker not put back'),
 (G, "  oStUndo_(env, db, po, code);\n}\n// CR run 11: put back", "}\n// CR run 11: put back", 'S17 back after a failed write does nothing'),
 (G, "try { if (oPdfNow_(db, x[0], x[1])) return; db.update(x[0], x[1], { PDF: x[3] });", "try { db.update(x[0], x[1], { PDF: x[3] });", 'S18 put back over a newer link'),
 (G, "log_(db, 'PDF link kept', x[2], why + '; PDF ' + x[3]);", "", 'S19 put back not logged'),
 (G, "catch (e) { oStPdfBack_(env, db, po, code, prev); throw e; }", "catch (e) { throw e; }", 'S20 no back after a failed item write'),
 (G, "if (was) { log_(db, 'PDF out of date', no, 'WO no. of ' + jn + ' changed; old PDF ' + was); u.push([t, c[1], no, was]); }", "if (was) { log_(db, 'PDF out of date', no, 'WO no. of ' + jn + ' changed; old PDF ' + was); }", 'S21 contract: no undo'),
 (G, "if (was) { log_(db, 'PDF out of date', no, 'WO no. of ' + jn + ' changed; old PDF ' + was); u.push(", "if (was) { u.push(", 'S22 contract: not logged'),
 (G, "db.update(t, c[1], { PDF: '' }); if (was) n++; });", "db.update(t, c[1], { PDF: '' }); n++; });", 'S23 contract: blanks counted'),
 (G, "db.update(t, c[1], { PDF: '' }); if (was) n++; });", "if (was) n++; });", 'S24 contract: nothing cleared'),
 (G, "  } catch (e) { oPdfUndo_(db, u, 'WO no. of ' + jn + ' not saved'); throw e; }", "  } catch (e) { throw e; }", 'S25 contract: no put-back part way (r10)'),
 (G, "if (!r || s(r.ClientWONo) !== s(wo0)) return;", "if (!r) return;", 'S26 contract: put back over a WO that went in'),
 (G, "if (!r || s(r.ClientWONo) !== s(wo0)) return; } catch (e) { return; }", "if (!r || s(r.ClientWONo) !== s(wo0)) return; } catch (e) { }", 'S27 contract: unreadable -> put back'),
 (G, "var d = env.db(); if (!d) return; var r = find(d.rows('Jobs')", "var d = env.db() || db; var r = find(d.rows('Jobs')", 'S28 contract: no fresh read -> cached'),
 (G, "try { uiPutRow_(db, 'Jobs', j, patch); } catch (e) { oCtPdfBack_(env, db, cu, jn, wo0); throw e; }", "uiPutRow_(db, 'Jobs', j, patch);", 'S29 contract: no back on a failed write'),
 (G, "var cu = [], wo0 = j.ClientWONo, old = ch.indexOf('ClientWONo') >= 0 ? oCtPdfOld_(db, jn, cu) : 0;", "var cu = [], wo0 = j.ClientWONo, old = ch.indexOf('ClientWONo') >= 0 ? oCtPdfOld_(db, jn) : 0;", 'S30 contract: undo list not passed'),
 (G, "  if (!u.length) return;\n  var s = function", "  if (u.length) return;\n  var s = function", 'S31 contract: back inverted'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
