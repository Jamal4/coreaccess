# M3 CR run 15 (r15): sabotage every changed line. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr15.py <src dir>
import sys, os
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "    if (q) oPeBump_(env, [String(q.QuoteNo)]); // CR run 4/6", "    // CR run 4/6", 'S1a quote save: no office count before the writes'),
 (G, "    try { r = UI_ACTIONS_.saveQuoteFull(db, x.a); }\n    catch (e) { if (rk) env.del(rk);", "    try { if (typeof d.rid === 'string') { var q9 = find(db.rows('Quotes'), 'Subject', \"'\" + d.subject); if (q9) return { no: String(q9.QuoteNo), rev: 0, status: 'Draft', was: '', changed: false, again: true }; } r = UI_ACTIONS_.saveQuoteFull(db, x.a); }\n    catch (e) { if (rk) env.del(rk);", 'S1b a retry dedupe put back'),
 (H, "  if(!J)J=QE.job={id:++QB.n,busy:false,next:null,pdf:false,no:q.no||'',ev:q.ev};", "  if(!J)J=QE.job={id:++QB.n,busy:false,next:null,pdf:false,no:q.no||'',ev:q.ev,rid:'abcdefgh12'};", 'S1c page request id put back'),
 (H, "d.no=J.no||d.no;if(J.no)d.ev=J.ev;", "d.no=J.no||d.no;if(J.no)d.ev=J.ev;else d.rid='abcdefgh12';", 'S1d page sends an id'),
 (G, "if (hold) hold.pub = JSON.stringify(env.get('OQP:' + no) || null);", "", 'S2a record never made final'),
 (G, "pn && pn.f === f && JSON.stringify(env.get('OQP:' + q.QuoteNo) || null) === hold.pub)", "pn && pn.f === f)", 'S2b record compare dropped'),
 (G, "pn && pn.f === f && JSON.stringify(env.get('OQP:' + q.QuoteNo) || null) === hold.pub)", "JSON.stringify(env.get('OQP:' + q.QuoteNo) || null) === hold.pub)", 'S2c pending-file check dropped'),
 (G, "env.put('OQP:' + q.QuoteNo, oQPdfRec_(env, q.QuoteNo, v, f)); env.del('OQPN:' + q.QuoteNo); } });", "env.put('OQP:' + q.QuoteNo, oQPdfRec_(env, q.QuoteNo, v, f)); } });", 'S2d pending not dropped'),
 (G, "    if (hold.pub != null) try { oScrLock_(function () {", "    if (hold.pub != null) try { (function (fn) { return fn(); })(function () {", 'S2e record write without the lock (and errors thrown)'),
 (G, "} }); } catch (e) { /* the pending record stands for this file (oQPdfFresh_) */ }", "} }); } catch (e) { throw e; }", 'S2f lock busy -> error'),
 (G, "if (q1 && oQLocked_(d0, q1)) { if (blank(q1.PDF)) oFail_('PDFLOCK');", "if (q1 && oQLocked_(d0, q1)) { if (blank(q1.PDF)) return;", 'S3a lease read: locked, no PDF -> made'),
 (G, "if (r && oQLocked_(d1, r)) { ok = false; if (blank(r.PDF)) lk = true;", "if (r && !blank(r.PDF) && oQLocked_(d1, r)) { ok = false; if (blank(r.PDF)) lk = true;", 'S3b publication: empty cell published'),
 (G, "  oFail_(lk ? 'PDFLOCK' : 'BUSY');", "  oFail_('BUSY');", 'S3c locked during render said BUSY'),
 (G, "if (blank(r.PDF)) lk = true; else if (hold) hold.keep = String(r.PDF);", "if (hold) hold.keep = String(r.PDF);", 'S3d locked empty kept as ""'),
 (H, "    case 'PDFLOCK': return", "    case 'PDFLOCKX': return", 'S3e page message missing'),
 (G, "if (oQtSig_(left) !== oQtSig_(T.ov)) {", "if (!left.length) {", 'S9a rollback only when none left (r14b)'),
 (G, "if (oQtSig_(left) !== oQtSig_(T.ov)) {", "if (true) {", 'S9b rollback always rewrites'),
 (G, "if (oQtSig_(left) !== oQtSig_(T.ov)) {", "if (false) {", 'S9c rollback never'),
 (G, "uiDelRows_(d3, 'QuoteTerms', left); if (keep.length)", "if (keep.length)", 'S9d leftovers not deleted'),
 (G, "'ClauseID', 'Action', 'Section', 'ClauseNo', 'Title', 'Text', 'SortOrder'].map(function (k) { return oUncell_(o[k]); }));", "'ClauseID', 'Action', 'Section'].map(function (k) { return oUncell_(o[k]); }));", 'S9e signature ignores the wording'),
 (G, "var x = (Q[p.p] || {})[l] || 0; return Math.floor((x + 1e-9) / p.q);", "var x = oStYard_(Q[p.p], locs); return Math.floor((x + 1e-9) / p.q);", 'S6a summed over racks (r14b)'),
 (G, "if (n > best) best = n; });", "best = n; });", 'S6b last rack, not the best'),
 (G, "Object.keys(locs).forEach(function (l) { if (OST_GRP_[String(locs[l].Type)] !== 'yard') return;", "Object.keys(locs).forEach(function (l) { if (!OST_GRP_[String(locs[l].Type)]) return;", 'S6c repair / site racks counted'),
 (G, "return Math.floor((x + 1e-9) / p.q);", "return Math.floor(x / p.q);", 'S6d no tolerance'),
 (G, "low: oStLow_(it, g) && (oStYes_(it.StockTracked) || oStHas_(Q[String(it.ItemCode)])), hz", "low: oStLow_(it, g), hz", 'S4a catalogue-only low (r14b)'),
 (G, "low: oStLow_(it, g) && (oStYes_(it.StockTracked) || oStHas_(Q[String(it.ItemCode)])), hz", "low: oStLow_(it, g) && oStYes_(it.StockTracked), hz", 'S4b untracked with stock not low'),
 (G, "    if (st === 'Yes' && tr === 'Yes') oFail_('BADINPUT|set tracked');", "    if (false) oFail_('BADINPUT|set tracked');", 'S5a set + tracked accepted'),
 (G, "    if (st === 'Yes' && tr === 'Yes') oFail_('BADINPUT|set tracked');", "    if (st === 'Yes' && tr === 'Yes' && !row) oFail_('BADINPUT|set tracked');", 'S5b only new items checked'),
 (H, "    if(st==='Yes'&&tr==='Yes'){dlgErr(", "    if(false){dlgErr(", 'S5c page lets set + tracked go'),
 (H, "      if(k[0]==='BADINPUT'&&k[1]==='set tracked'){", "      if(k[0]==='BADINPUT'&&k[1]==='set trackedX'){", 'S5d page server message missing'),
 (G, "rows.forEach(function (o) { if (op[o.code]) o.op = op[o.code]; }); }", "}", 'S7a opened locations not sent'),
 (G, "  if (H) { var op = oStMap_();", "  if (true) { var op = oStMap_();", 'S7b sent to every login'),
 (G, "if (a.indexOf(String(v.ToLoc)) < 0) a.push(String(v.ToLoc));", "a.push(String(v.ToLoc));", 'S7c duplicates'),
 (G, "if (String(v.RefType) !== 'Opening' || blank(v.ToLoc)) return;", "if (blank(v.ToLoc)) return;", 'S7d any move counted as an opening'),
 (H, "+(op.indexOf(l.code)>=0?' (opened)':'')+'</option>'", "+'</option>'", 'S7e no flag'),
 (H, "s.value=v&&locs.some(function(l){return l.code===v;})?v:(f||locs[0]).code;", "s.value=v&&locs.some(function(l){return l.code===v;})?v:locs[0].code;", 'S7f new line on the first location'),
 (H, "s.value=v&&locs.some(function(l){return l.code===v;})?v:(f||locs[0]).code;", "s.value=(f||locs[0]).code;", 'S7g item change moves the chosen location'),
 (H, ",hz:stHz(r.hz),op:cuArr(r.op).map(cuS)};}", ",hz:stHz(r.hz)};}", 'S7h page drops op'),
 (H, "d.querySelector('.oi').addEventListener('change',function(){olf(d);});olf(d);", "olf(d);", 'S7i flags not redrawn on item change'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
src = src.replace("os.environ['TMPDIR'] = '/tmp'", "os.environ['TMPDIR'] = os.path.expanduser('~/t')").replace("tempfile.mkdtemp(dir='/tmp')", "tempfile.mkdtemp(dir=os.path.expanduser('~/t'))")
src = src.replace("'tools8/run_m3_tests.sh'", "'tools8/run_m3_tests_r15.sh'").replace("'h/pg/pg_m3.js'", "'h/pg/pg_m3_r15.js'")
assert 'run_m3_tests_r15.sh' in src and 'pg_m3_r15.js' in src
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
