# M3 CR run 14 gap fix (r14b): sabotage only the new / changed lines. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr14b.py <src dir>
import sys, os
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "if (k === rq || k === rq + ':ok' || k.indexOf(rq + '~') === 0)", "if (k === rq + ':ok' || k.indexOf(rq + '~') === 0)", 'B1 unstamped quote not found'),
 (G, "if (k === rq || k === rq + ':ok' || k.indexOf(rq + '~') === 0)", "if (k === rq || k.indexOf(rq + '~') === 0)", 'B2 done quote not found'),
 (G, "if (k === rq || k === rq + ':ok' || k.indexOf(rq + '~') === 0)", "if (k === rq || k === rq + ':ok')", 'B3 stamped quote not found'),
 (G, "ok0 = k0 === rq + '~' + oQeEv_(db, q0); //", "ok0 = true; //", 'B4 version not compared'),
 (G, "if (q0 && k0.indexOf(rq + '~') === 0) ok0 =", "if (q0) ok0 =", 'B5 compare on an unstamped id (equivalent: never equal)'),
 (G, "if (q0 && (!ok0 || String(q0.Status", "if (q0 && (String(q0.Status", 'B6 mismatch resumes'),
 (G, "      if (!/:ok$/.test(k0)) o0.part = true;\n", "", 'B7 part not said'),
 (G, "      if (!/:ok$/.test(k0)) o0.part = true;\n", "      o0.part = true;\n", 'B8 part said for a done quote'),
 (G, "{ ReqID: rs + '~' + oQeEv_(d2, q2) }", "{ ReqID: rs + '~0' }", 'B9 wrong version recorded'),
 (G, "      if (rs) try { uiPutRow_(d2, 'Quotes', q2, { ReqID: rs", "      if (false) try { uiPutRow_(d2, 'Quotes', q2, { ReqID: rs", 'B10 no version recorded'),
 (G, "/* no version: returned as it is */ }\n      throw e; } }", "/* no version: returned as it is */ }\n      } }", 'B11 failure swallowed'),
 (G, "var rs = rq, q0 = null,", "var rs = '', q0 = null,", 'B12 no id for the version'),
 (G, "q = q0; ag = true; rq = ''; }", "q = q0; ag = true; rq = ''; rs = ''; }", 'B13 resume records no version'),
 (G, "p.ReqID = String(q2.ReqID).split('~')[0] + ':ok';", "p.ReqID = String(q2.ReqID) + ':ok';", 'B14 done marker keeps the version'),
 (G, "{ ReqID: String(q.ReqID).split('~')[0] + ':ok' }); } // CR run 14", "{ ReqID: String(q.ReqID) + ':ok' }); } // CR run 14", 'B15 same-data done marker keeps the version'),
 (G, "      if (rs) try { uiPutRow_(d2, 'Quotes', q2, { ReqID: rs", "      if (true) try { uiPutRow_(d2, 'Quotes', q2, { ReqID: rs", 'B16 version written on any edit'),
 (G, "{ ReqID: rs + '~' + oQeEv_(d2, q2) }", "{ ReqID: rs + '~' + oQeEv_(d2, q2), Subject: '' }", 'B17 version write changes the quote'),
 (G, "    if (rc0 && !blank(q2.ReqID) && !/:ok$/.test(String(q2.ReqID))) p.ReqID = String(q2.ReqID).split('~')[0] + ':ok';", "    if (false) p.ReqID = '';", 'B19 never marked done'),
 (H, "(r.part===true?' was saved only in part':' had been saved already')", "(false?' was saved only in part':' had been saved already')", 'B18 page ignores part'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
src = src.replace("os.environ['TMPDIR'] = '/tmp'", "os.environ['TMPDIR'] = os.path.expanduser('~/t')").replace("tempfile.mkdtemp(dir='/tmp')", "tempfile.mkdtemp(dir=os.path.expanduser('~/t'))")
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
