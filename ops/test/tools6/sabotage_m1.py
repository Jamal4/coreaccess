# usage (harness root): python3 tools6/sabotage_m1.py <src dir>  -> each sabotage must make the M1 tests fail
import sys, os, shutil, subprocess, tempfile
src = sys.argv[1]
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "  'officeCustList', 'officeCustGet', 'officeCustomerSave', 'officeSiteSave',\n", '', 'S1 calls off the web API list'),
 (G, "(ex && String(r.CustID) === ex)", "false", 'S2 customer DUP does not skip itself'),
 (G, "(!ex || String(s.SiteID) !== ex)", "true", 'S3 project DUP does not skip itself'),
 (G, "    if (M) o.total = oCuQTot_(db, q, no);", "    o.total = oCuQTot_(db, q, no);", 'S4 totals without money'),
 (G, "    if (c.status !== 'Active' && c.status !== 'Inactive') oFail_('BADINPUT|status');\n", '', 'S5 no status check'),
 (G, "(oCuSt_(c) === 'Active' || (q && String(c.CustID) === String(q.CustID)))", "true", 'S6 Inactive offered on new quote'),
 (G, "if (!oDayOk_(s.startDate)) oFail_('BADINPUT|start date'); ", '', 'S7 no start date check'),
 (G, "pd < 0 || pd > 365", "pd < 0 || pd > 400", 'S8 payment days to 400'),
 (G, "o.money = M; o.can = oQCan_(a);", "o.money = M; o.can = true;", 'S9 view-only can'),
 (G, "nq[k] = (nq[k] || 0) + 1;", "nq[k] = 1;", 'S10 quote count'),
 (G, "    if (oCuSt_(row) !== c.status) cp.patch.Status = c.status;\n", '', 'S11 status not saved'),
 (G, "bin: oCell_(f.bin),", "bin: '',", 'S12 BIN dropped'),
 (G, "if (blank(s.SiteID)) return; var k = String(s.CustID); ns[k] = (ns[k] || 0) + 1;", "if (blank(s.SiteID)) return; var k = String(s.CustID); ns[k] = 1;", 'S13 project count'),
 (G, "if (!c || blank(c.CustID)) oFail_('NOTFOUND');", "if (!c) c = db.rows('Customers')[0];", 'S14 get falls back'),
 (H, "+c.projects.join(' ')", "", 'H1 search ignores projects'),
 (H, "CU.can=!!(r&&r.can===true);", "CU.can=true;", 'H2 list can always'),
 (H, "(c.status==='Active'?'<button type=\"button\" class=\"btn btn-primary btn-sm\" id=\"qnew\">'", "(1?'<button type=\"button\" class=\"btn btn-primary btn-sm\" id=\"qnew\">'", 'H3 New quote on Inactive'),
 (H, "if(pd&&(!/^\\d{1,3}$/.test(pd)||+pd>365)){dlgErr('Payment days: a whole number from 0 to 365 (empty = company default).');return;}", "", 'H4 no page payment-days check'),
 (H, "if(g)g.onclick=function(){closeDlg();viewCust(k[1]);};", "", 'H5 Open it dead'),
 (H, "var M=c.money,E=c.can,", "var M=c.money,E=true,", 'H6 view-only edits'),
 (H, "if(!x&&cu&&D.customers.some(function(c){return c.id===cu;}))QE.q.cust=cu;", "", 'H7 no pre-pick'),
 (H, "if(k[0]==='NOTFOUND'){closeDlg();viewCusts();toast('This customer no longer exists.');return;}", "", 'H8 NOTFOUND as error'),
 (H, "ic:'building',l:1,r:1}", "ic:'building',l:1}", 'H9 tile not ready'),
 (H, "if(!x&&cu&&D.customers.some(", "if(!x&&cu&&(1||D.customers).some(", 'H10 pre-pick ignores the offered list'),
 (G, "    if (c.ev !== oCuEv_(row, QF_CF_, ['Status'])) oFail_('STALE');\n", '', 'S15 customer STALE check gone'),
 (G, "    if (s.ev !== oCuEv_(row, QF_SF_)) oFail_('STALE');\n", '', 'S16 project STALE check gone'),
 (G, "oCuEv_(c, QF_CF_, ['Status']);", "oCuEv_(c, QF_CF_);", 'S17 get ev without Status'),
 (G, "if (Object.keys(cp.patch).some(function (k) { return k !== 'Status'; })) oCuPdfOld_(env, db, 'CustID', id);", "", 'S18 customer change keeps old PDFs'),
 (G, "if (Object.keys(sp.patch || {}).length) oCuPdfOld_(env, db, 'SiteID', id);", "", 'S19 project change keeps old PDFs'),
 (G, "String(q[key]) === id && !oQLocked_(db, q)", "String(q[key]) === id", 'S20 locked quotes marked too'),
 (G, "String(q[key]) === id && !oQLocked_(db, q)", "!oQLocked_(db, q)", 'S21 every quote marked'),
 (G, "if (Object.keys(cp.patch).some(function (k) { return k !== 'Status'; }))", "if (true)", 'S22 status-only change marks PDFs'),
 (H, "accX?'—':", "0?'—':", 'H11 missing total summed as 0'),
 (H, "d.status=st;d.ev=c.ev;", "d.status=st;", 'H12 customer ev not sent'),
 (H, "if(s){d.id=s.id;d.ev=s.ev;}", "if(s){d.id=s.id;}", 'H13 project ev not sent'),
 (H, "      if(k[0]==='STALE'){staleClose(function(){viewCust(c.id);});return;}\n      if(k[0]==='NOTFOUND'){closeDlg();viewCusts();", "      if(k[0]==='NOTFOUND'){closeDlg();viewCusts();", 'H14 customer STALE left in the dialog'),
 (H, "      if(k[0]==='STALE'){staleClose(function(){viewCust(c.id);});return;}\n      if(k[0]==='NOTFOUND'){closeDlg();viewCust(c.id);", "      if(k[0]==='NOTFOUND'){closeDlg();viewCust(c.id);", 'H15 project STALE left in the dialog'),
 (H, "o.ev=typeof r.ev==='number'?r.ev:0;", "", 'H16 page drops the customer ev'),
 (H, ",ev:typeof s.ev==='number'?s.ev:0};", "};", 'H17 page drops the project ev'),
]
SAB = SAB[int(os.environ.get('A', 0)):int(os.environ.get('B', 999))]  # optional slice (long runs)
os.environ['TMPDIR'] = '/tmp'; bad = 0
for f, a, b, name in SAB:
    t = tempfile.mkdtemp(dir='/tmp'); [shutil.copy(os.path.join(src, x), t) for x in os.listdir(src)]
    p = os.path.join(t, f); s = open(p, encoding='utf-8').read()
    if s.count(a) != 1: print('SKIP(not found x%d)' % s.count(a), name); bad += 1; shutil.rmtree(t); continue
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
    r1 = subprocess.run(['tools6/run_m1_tests.sh', t], capture_output=True, text=True).stdout.strip()
    r2 = subprocess.run(['node', 'h/pg/pg_m1.js', t], capture_output=True, text=True).stdout.strip().splitlines()
    r2 = r2[-1] if r2 else '?'; srv_ok = ' 0 failed' in r1 and 'passed' in r1; pg_ok = r2.startswith('page-m1') and r2.split()[-1].split('/')[0] == r2.split()[-1].split('/')[1]
    caught = not (srv_ok and pg_ok); bad += not caught
    print(('CAUGHT ' if caught else 'MISSED ') + name, '| srv:', r1.split('(')[0].strip(), '| page:', r2)
    shutil.rmtree(t)
print('sabotage', len(SAB) - bad, '/', len(SAB), 'caught')
