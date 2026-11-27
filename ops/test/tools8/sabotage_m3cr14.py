# M3 CR run 14 fix: sabotage only the new / changed lines. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr14.py <src dir>
import sys, os
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "if (q1 && !blank(q1.PDF) && oQLocked_(d0, q1)) { hold.keep", "if (false) { hold.keep", 'S1 no lock check on the lease read (r13)'),
 (G, "    if (hold.keep) return { url: hold.keep, made: false };\n", "    if (hold.keep) return { url: hold.keep, made: true };\n", 'S2 kept said made'),
 (G, "if (r && !blank(r.PDF) && oQLocked_(d1, r)) { ok = false; if (hold) hold.keep = String(r.PDF); } else ", "", 'S3 no lock check under the publish lock (r13)'),
 (G, "catch (e) { if (hold.keep) return { url: hold.keep, made: false }; throw e; }", "catch (e) { throw e; }", 'S4 locked render -> error, not the kept PDF'),
 (G, "oQPdfLinkIf_(env, d, n, r0, v, bin, hold); return r0;", "oQPdfLinkIf_(env, d, n, r0, v, bin); return r0;", 'S5 hold not passed'),
 (G, "if (r && !blank(r.PDF) && oQLocked_(d1, r)) { ok = false; if (hold) hold.keep = String(r.PDF); }", "if (r && !blank(r.PDF) && oQLocked_(d1, r)) { if (hold) hold.keep = String(r.PDF); }", 'S6 locked yet published'),
 (G, "oQPnUp_(env, no, r.PDF); env.put('OQPN:'", "env.put('OQPN:'", 'S7 pending not promoted (r13)'),
 (G, "if (pn && pn.f && pn.f === oQFid_(cur)) env.put('OQP:' + no, pn); }", "if (pn) env.put('OQP:' + no, pn); }", 'S8 any pending promoted'),
 (G, "  try { return oQPdfMake_(env, db, q); } finally { OQ_ACT_ = prev; }", "  try { return { url: oQPdfMake_(env, db, q).url, made: true }; } finally { OQ_ACT_ = prev; }", 'S9 made always true'),
 (G, "? d.rid + '.' + oQHash_(String(L.email).toLowerCase()) : ''", "? d.rid : ''", 'S10 id shared across logins'),
 (G, "find(db.rows('Quotes'), 'ReqID', rq) || find(db.rows('Quotes'), 'ReqID', rq + ':ok') : null;", "find(db.rows('Quotes'), 'ReqID', rq) : null;", 'S11 done quote not found'),
 (G, "if (q0 && (String(q0.ReqID) !== rq || String(q0.Status", "if (q0 && (String(q0.Status", 'S12 done quote edited by a late retry'),
 (G, "|| String(q0.Status || 'Draft') !== 'Draft' || oQLocked_(db, q0))) {", "|| oQLocked_(db, q0))) {", 'S13 Sent quote edited by the retry'),
 (G, "!== 'Draft' || oQLocked_(db, q0))) {", "!== 'Draft')) {", 'S14 locked quote edited by the retry'),
 (G, "if (q0) { no = String(q0.QuoteNo); q = q0; ag = true; rq = ''; }", "if (q0) { no = String(q0.QuoteNo); q = q0; rq = ''; }", 'S15 resume checks ev (STALE)'),
 (G, "if (q0) { no = String(q0.QuoteNo); q = q0; ag = true; rq = ''; }", "if (q0) { ag = true; rq = ''; }", 'S16 retry saves a second quote'),
 (G, "if (!ag && (typeof d.ev !== 'number' || d.ev !== oQeEv_(db, q))) oFail_('STALE');", "if (typeof d.ev !== 'number' || d.ev !== oQeEv_(db, q)) oFail_('STALE');", 'S17 ev check on resume'),
 (G, "if (!ag && (typeof d.ev !== 'number' || d.ev !== oQeEv_(db, q))) oFail_('STALE');", "if (false) oFail_('STALE');", 'S18 no ev check at all'),
 (G, "      if (ag) { o5.again = true; try {", "      if (ag) { try {", 'S19 again not said (same)'),
 (G, "try { o5.ev = oQeEv_(db, q); } catch (e) { delete o5.ev; }", "", 'S20 no ev on a resumed same'),
 (G, " uiPutRow_(db, 'Quotes', q, { ReqID: String(q.ReqID) + ':ok' }); } // CR run 14: complete -> done", " } // CR run 14", 'S21 resumed same not marked done'),
 (G, "    try { r = oQeIns_(db, rq, function () { return UI_ACTIONS_.saveQuoteFull(db, x.a); }); }", "    try { r = UI_ACTIONS_.saveQuoteFull(db, x.a); }", 'S22 id not in the row (r13)'),
 (G, "  try { return f(); } finally { if (own) db.insert = i1; else delete db.insert; }", "  try { return f(); } finally { if (own) db.insert = i1; }", 'S23 insert wrapper left on the db'),
 (G, "db.insert = function (t, objs) { if (t === 'Quotes')", "db.insert = function (t, objs) { if (t === 'QuoteLines')", 'S24 id on the wrong table'),
 (G, "if (o && typeof o === 'object' && blank(o.ReqID)) o.ReqID = rq;", "if (o && typeof o === 'object' && !blank(o.ReqID)) o.ReqID = rq;", 'S25 id never stamped'),
 (G, "    if (rc0 && !blank(q2.ReqID) && !/:ok$/.test(String(q2.ReqID))) p.ReqID = String(q2.ReqID) + ':ok';", "", 'S26 never marked done'),
 (G, "    if (rc0 && !blank(q2.ReqID) && !/:ok$/.test(String(q2.ReqID))) p.ReqID", "    if (rc0 && !blank(q2.ReqID)) p.ReqID", 'S27 marked done twice'),
 (G, "  g.ry = g.yard; g.hz", "  g.ry = r2(g.yard); g.hz", 'S28 low on the rounded yard (r13)'),
 (G, "rep: Math.abs(g.rep) > 1e-9,", "rep: g.rep > 1e-9,", 'S29 negative repair hidden'),
 (G, "g.hz = { yard: Math.abs(g.yard) > 1e-9,", "g.hz = { yard: r2(g.yard) !== 0,", 'S30 yard presence from rounded'),
 (G, "lost: Math.abs(g.lost) > 1e-9 };", "lost: true };", 'S31 lost always present'),
 (G, "site: Math.abs(g.site) > 1e-9,", "site: true,", 'S32 site always present'),
 (G, "r != null && r > 0 && (g.ry != null ? g.ry : g.yard) < r; }", "r != null && r > 0 && g.yard < r; }", 'S33 low on the rounded yard'),
 (G, "low: oStLow_(it, g), hz: g.hz };", "low: oStLow_(it, g) };", 'S34 card without hz'),
 (H, "val:ctNum(r.val),hz:stHz(r.hz)};}", "val:ctNum(r.val)};}", 'S35 page drops hz (r13)'),
 (H, "(x.isSet||!(x.hz?x.hz[ST.f]===true:", "(x.isSet||!(false?x.hz[ST.f]===true:", 'S36 filter on rounded values (r13)'),
 (H, "o[k]=z[k]===true;", "o[k]=!!z;", 'S37 every group present'),
 (H, "    DLG.busy=true;ifz(true);busyBtn(yes,true,'Saving…');", "    DLG.busy=true;busyBtn(yes,true,'Saving…');", 'S38 fields editable while pending (r13)'),
 (H, "DLG.busy=false;ifz(false);if(srvGate(m))return;busyBtn(yes,false);\n      var k=code(m).split('|');\n      if(k[0]==='STALE'){staleClose(function(){viewItem(c);});return;}\n      if(k[0]==='EXISTS'){dlgErr('Code", "DLG.busy=false;if(srvGate(m))return;busyBtn(yes,false);\n      var k=code(m).split('|');\n      if(k[0]==='STALE'){staleClose(function(){viewItem(c);});return;}\n      if(k[0]==='EXISTS'){dlgErr('Code", 'S39 fields stay locked after a refusal'),
 (H, "var e=document.getElementById(i);if(e)e.disabled=on;});}; /* CR run 14", "var e=document.getElementById(i);if(e)e.disabled=true;});}; /* CR run 14", 'S40 never unlocked'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
src = src.replace("os.environ['TMPDIR'] = '/tmp'", "os.environ['TMPDIR'] = os.path.expanduser('~/t')").replace("tempfile.mkdtemp(dir='/tmp')", "tempfile.mkdtemp(dir=os.path.expanduser('~/t'))")
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
