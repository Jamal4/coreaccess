# M3 CR run 6 fix: sabotage only the new / changed lines. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr6.py <src dir>
import sys, os, runpy
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "      if (tr === 'No' && oStYes_(row.StockTracked) && oStPart_(db, code)) oFail_('BADINPUT|part tracked');", "", 'T1 part can stop being tracked'),
 (G, "if (tr === 'No' && oStYes_(row.StockTracked) && oStPart_(db, code)) oFail_", "if (tr === 'No' && oStPart_(db, code)) oFail_", 'T2 legacy untracked part blocks every edit'),
 (G, "    if (!row && tr === 'No' && oStPart_(db, code)) oFail_('BADINPUT|part tracked');", "", 'T3 new untracked part allowed'),
 (G, "    if (q) oPeBump_(env, [String(q.QuoteNo)]); // CR run 4/6: counted before anything is written (the pending-revision record too; a new quote has no PDF yet)\n    var r, rk = q ? 'OQRV:' + String(q.QuoteNo) : '';\n    if (q && was === 'Sent') env.put(rk, { rev: num(q.Rev) + 1, at: env.now() });", "    var r, rk = q ? 'OQRV:' + String(q.QuoteNo) : '';\n    if (q && was === 'Sent') env.put(rk, { rev: num(q.Rev) + 1, at: env.now() });\n    if (q) oPeBump_(env, [String(q.QuoteNo)]);", 'R1 counted after the pending-revision record'),
 (G, "var r0 = (st.make || makePdf)(d, w, n, { noLink: true });", "var r0 = (st.make || makePdf)(d, w, n);", 'L1 office make writes its own link (no lock)'),
 (G, "oPdfLinkSet_(d, 'Quotes', 'QuoteNo', n, r0.url); return r0;", "return r0;", 'L2 office link never written'),
 (G, "  var l = oLs_().getDocumentLock(); try { l.waitLock(60000); } catch (e) { oFail_('BUSY'); }", "  var l = oLs_().getScriptLock(); try { l.waitLock(60000); } catch (e) { oFail_('BUSY'); }", 'L3 script lock instead of document lock'),
 (G, "try { l.waitLock(60000); } catch (e) { oFail_('BUSY'); } // a panel", "try { l.waitLock(60000); } catch (e) { } // a panel", 'L4 busy lock ignored'),
 (G, "  try { put(); SpreadsheetApp.flush(); } finally { l.releaseLock(); }", "  put(); SpreadsheetApp.flush(); l.releaseLock();", 'L5 lock kept on a failed write'),
 (G, "  var l = oLs_().getDocumentLock(); try { l.waitLock(60000)", "  put(); var l = oLs_().getDocumentLock(); try { l.waitLock(60000)", 'L6 written before the lock'),
 (G, "if (r && db.headers(t).indexOf('PDF') >= 0) db.update(t, r, { PDF: url }); };", "if (r) db.update(t, r, { PDF: url }); };", 'L7 tab without PDF written'),
 (G, "drive: st.drive, make:", "drive: undefined, make:", 'L8 drive stub dropped'),
 (H, "      if(k[0]==='BADINPUT'&&k[1]==='part tracked'){", "      if(false){", 'H1 no part message'),
 (H, "after that stock only moves by challans and receipts.", "after that stock only moves by challans.", 'H2 receipts not named'),
 (H, "    DLG.busy=true;frz(true);", "    DLG.busy=true;", 'H3 not frozen'),
 (H, "busyBtn(yes,false);frz(false);", "busyBtn(yes,false);", 'H4 not thawed after a refusal'),
 (H, "document.querySelectorAll('#od,#ols select,#ols input,#ols button,#oadd')", "document.querySelectorAll('#ols select,#ols input')", 'H5 date / buttons not frozen'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
