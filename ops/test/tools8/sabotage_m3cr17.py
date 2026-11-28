# M3 CR run 17 (r17): sabotage every changed line. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr16.py <src dir>
import sys, os
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "if (!blank(x.ItemCode) && !items[k]) items[k] = x; });", "if (!blank(x.ItemCode)) items[k] = x; });", 'S1 set part from the last row (r16)'),
 (G, "x.Title = oQRaw_(o.Title); x.Text = oQRaw_(o.Text); return x; });", "x.Title = oQCell_(o.Title); x.Text = oQCell_(o.Text); return x; });", 'S2 snapshot trimmed (r16)'),
 (G, "x.Title = oQRaw_(o.Title); x.Text = oQRaw_(o.Text); return x; });", "x.Title = oQRaw_(o.Title); x.Text = oQCell_(o.Text); return x; });", 'S3 Text trimmed only'),
 (G, "x.Title = oQRaw_(o.Title); x.Text = oQRaw_(o.Text); return x; });", "x.Title = o.Title; x.Text = o.Text; return x; });", 'S4 no text mark'),
 (G, "function oQRaw_(v) { var s = oUncell_(v); return s ? \"'\" + s : ''; }", "function oQRaw_(v) { var s = oUncell_(v).trim(); return s ? \"'\" + s : ''; }", 'S5 oQRaw_ trims'),
 (G, "var x = blank(a) ? '' : String(a), y = blank(b) ? '' : String(b); if (x === y) return true; x = x.trim(); y = y.trim(); return OST_NUMF_", "var x = blank(a) ? '' : String(a).trim(), y = blank(b) ? '' : String(b).trim(); if (x === y) return true; return OST_NUMF_", 'S6 text trimmed (r16)'),
 (G, "if (x === y) return true; x = x.trim(); y = y.trim(); return OST_NUMF_", "if (x === y) return true; return OST_NUMF_", 'S7 number fields not trimmed'),
 (G, "if (x === y) return true; x = x.trim(); y = y.trim(); return OST_NUMF_", "if (x.trim() === y.trim()) return true; x = x.trim(); y = y.trim(); return OST_NUMF_", 'S8 trimmed equality'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
src = src.replace("os.environ['TMPDIR'] = '/tmp'", "os.environ['TMPDIR'] = os.path.expanduser('~/t')").replace("tempfile.mkdtemp(dir='/tmp')", "tempfile.mkdtemp(dir=os.path.expanduser('~/t'))")
src = src.replace("'tools8/run_m3_tests.sh'", "'tools8/run_m3_tests_r17.sh'").replace("'h/pg/pg_m3.js'", "'h/pg/pg_m3_r16.js'")
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
