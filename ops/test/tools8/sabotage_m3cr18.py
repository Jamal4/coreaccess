# M3 CR run 17 L2334 (r18): sabotage every changed line. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr18.py <src dir>
import sys, os
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "var ref = String(r.ref); if (!q) made = { no: ref };", "var ref = String(r.ref);", 'S1 number never kept'),
 (G, "var ref = String(r.ref); if (!q) made = { no: ref };", "var ref = String(r.ref); made = { no: ref };", 'S2 kept for an edit too'),
 (G, "var ref = String(r.ref); if (!q) made = { no: ref };\n    var d2 = env.db() || db, q2 = must(d2, 'Quotes', 'QuoteNo', ref), p = {};", "var ref = String(r.ref);\n    var d2 = env.db() || db, q2 = must(d2, 'Quotes', 'QuoteNo', ref), p = {}; if (!q) made = { no: ref };", 'S3 kept only after the re-read'),
 (G, "    if (made) made.ev = out.ev;\n", "", 'S4 no version'),
 (G, "} catch (e) { if (made) oFail_('SAVEUNSURE|' + made.no + '|' + (typeof made.ev === 'number' ? made.ev : '')); throw e; }", "} catch (e) { throw e; }", 'S5 error not rewritten (r17)'),
 (G, "oFail_('SAVEUNSURE|' + made.no + '|' + (typeof made.ev === 'number' ? made.ev : ''));", "oFail_('SAVEUNSURE|' + made.no + '|');", 'S6 version dropped'),
 (H, "if(u[0]==='SAVEUNSURE'&&!J.no&&u[1]){", "if(false){", 'S7 page ignores the number'),
 (H, "J.ev=/^\\d+$/.test(u[2]||'')?+u[2]:null;", "J.ev=null;", 'S8 page drops the version'),
 (H, "J.ev=/^\\d+$/.test(u[2]||'')?+u[2]:null;", "J.ev=+u[2];", 'S9 blank version read as 0'),
 (H, "if(QE.job===J&&QE.q){QE.q.no=J.no;QE.q.ev=J.ev;}} /* CR run 17 L2334", "} /* CR run 17 L2334", 'S10 form record not updated'),
 (H, "    case 'SAVEUNSURE': return", "    case 'SAVEUNSURE_': return", 'S11 no message'),
 (H, "why={SAVEUNSURE:'the save could not be confirmed',", "why={", 'S12 parked toast text'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
src = src.replace("os.environ['TMPDIR'] = '/tmp'", "os.environ['TMPDIR'] = os.path.expanduser('~/t')").replace("tempfile.mkdtemp(dir='/tmp')", "tempfile.mkdtemp(dir=os.path.expanduser('~/t'))")
src = src.replace("'tools8/run_m3_tests.sh'", "'tools8/run_m3_tests_r18.sh'").replace("'h/pg/pg_m3.js'", "'h/pg/pg_m3_r18.js'")
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
