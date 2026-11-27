# M3 CR run 16 (r16): sabotage every changed line. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr16.py <src dir>
import sys, os
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "if (oQtSig_(left) !== oQtSig_(raw)) {", "if (oQtSig_(left) !== oQtSig_(T.ov)) {", 'T1 compare with the shown rows (r15)'),
 (G, "var raw = qtRows_(db, q.QuoteNo), keep = raw.map(function (o) {", "var raw = qtRows_(db, q.QuoteNo), keep = T.ov.map(function (o) {", 'T2 restore the shown rows only'),
 (G, "      if (r && oQLocked_(d1, r)) { ok = false; if (blank(r.PDF)) lk = true;", "      if (ok && r && oQLocked_(d1, r)) { ok = false; if (blank(r.PDF)) lk = true;", 'T3 lock rule after the print check (r15)'),
 (G, "} else if (ok && r && d1.headers('Quotes').indexOf('PDF') >= 0) {", "} else if (r && d1.headers('Quotes').indexOf('PDF') >= 0) {", 'T4 link published when the print changed'),
 (G, "return !!(locs[l] && OST_GRP_[String(locs[l].Type)]) && Math.abs(q[l]) > 1e-9;", "return Math.abs(q[l]) > 1e-9;", 'T5 Supplier / Sold counted (r15)'),
 (G, "return !!(locs[l] && OST_GRP_[String(locs[l].Type)]) && Math.abs(q[l]) > 1e-9;", "return !!locs[l] && Math.abs(q[l]) > 1e-9;", 'T6 any known location counted'),
 (G, "has = oStHas_(q, oStLocs_(db));", "has = oStHas_(q, {});", 'T7 item save sees no stock'),
 (H, "s.value=v&&op.indexOf(v)<0&&locs.some(", "s.value=v&&locs.some(", 'T8 opened location kept on an item change (r15)'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
src = src.replace("os.environ['TMPDIR'] = '/tmp'", "os.environ['TMPDIR'] = os.path.expanduser('~/t')").replace("tempfile.mkdtemp(dir='/tmp')", "tempfile.mkdtemp(dir=os.path.expanduser('~/t'))")
src = src.replace("'tools8/run_m3_tests.sh'", "'tools8/run_m3_tests_r16.sh'").replace("'h/pg/pg_m3.js'", "'h/pg/pg_m3_r16.js'")
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
