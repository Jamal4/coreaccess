# CR M8 run 1 fixes: undo one fix at a time in a copy of <dir>; its test must fail. usage: python3 tools8/sabotage_e3.py <dir> i,j,...  (from the harness root; runs them in parallel)
import sys, os, shutil, subprocess, tempfile
S = [
 ('CAE_Ops_Office.gs', "var f; try { f = chFinishPost_(db, no); } catch (e) { if (oChCode_(e)) throw e; oFail_('POSTUNSURE'); }", "var f = { damage: 0 }; db.update('Challans', c, { Status: 'Posted', PostedAt: new Date(env2.now()) });", 'CH-37'),
 ('CAE_Ops_Sets.gs', "if (c.Kind === 'Return' && !db.rows('Damage').some(", "if (false && !db.rows('Damage').some(", 'CH-37'),
 ('CAE_Ops_Sets.gs', "  db.update('Challans', c, { Status: 'Posted', PostedAt: now });\n}", "}", 'CH-39'),
 ('CAE_Ops_Office.gs', "        if (oChMoved_(db, String(old.ChallanNo), 'Challan')) oFail_('CHPART');", "        if (false) oFail_('CHPART');", 'CH-36'),
 ('CAE_Ops_Office.gs', "    if (st === 'Draft' && oChMoved_(db, no, 'Challan')) oFail_('CHPART');", "    if (false) oFail_('CHPART');", 'CH-36'),
 ('CAE_Ops_Office.gs', "o.canEdit = can && !o.unfin && !o.sheet;", "o.canEdit = can;", 'CH-36'),
 ('CAE_Ops_Office.gs', "            else if (left.length) uiDelRows_(d2, 'ChallanLines', left); }", "            }", 'CH-40'),
 ('CAE_Ops_PDF.gs', "sub: sub + (blank(c.Status) || c.Status === 'Draft' ?", "sub: sub + (c.Status === 'Draft' ?", 'CH-41'),
 ('CAE_Ops_Office.gs', " || oChFp_(d1, no) !== fp) return;", ") return;", 'CH-42'),
 ('CAE_Ops_Office.gs', "      if (oPdfNewer_(c1.PDF, url)) {", "      if (false) {", 'CH-42'),
 ('CAE_Ops_Office.gs', "    if (skip.length) oFail_('NOTPOSTED|'", "    if (false) oFail_('NOTPOSTED|'", 'CH-43'),
 ('CAE_Ops_Office.gs', "some(function (l) { return !(num(l.Qty) > 0); })) oFail_('CHSHEET');", "some(function (l) { return false; })) oFail_('CHSHEET');", 'CH-44'),
 ('CAE_Ops_Office.gs', "if (nq.length === 1) made = { no: String(nq[0].QuoteNo) };", "", 'CH-46'),
 ('CAE_Ops_Office.gs', "(String(s.Status) === 'Inactive' && !(k === 'Off-hire' && oChHeld_(db, String(s.SupID))))", "String(s.Status) === 'Inactive'", 'CH-45'),
 ('CAE_Ops_Office.gs', "return String(X.sups[s].Status) !== 'Inactive' || Object.keys(rent)", "return String(X.sups[s].Status) !== 'Inactive' || false && Object.keys(rent)", 'CH-45'),
 ('CAE_Ops_QuoteApp.gs', "  var sl = LockService.getScriptLock();", "  var sl = { tryLock: function () { return true; }, releaseLock: function () {} };", 'CH-47'),
 # CR M8 run 2 (r23)
 ('CAE_Ops_QuoteApp.gs', "try { SpreadsheetApp.flush(); } catch (e) { if (ok) throw e; } finally { lock.releaseLock(); }", "if (ok) SpreadsheetApp.flush(); lock.releaseLock();", 'CH-48'),
 ('CAE_Ops_QuoteApp.gs', "try { SpreadsheetApp.flush(); } catch (e) { if (ok) throw e; }", "try { SpreadsheetApp.flush(); } catch (e) { throw e; }", 'CH-48'),
 ('CAE_Ops_QuoteApp.gs', "if (what !== 'Challan') return mk0.apply(this, arguments); later.push", "return mk0.apply(this, arguments); later.push", 'CH-49'),
 ('CAE_Ops_QuoteApp.gs', "  if (!p && o && o.later) {", "  if (false) {", 'CH-50'),
 ('CAE_Ops_QuoteApp.gs', "    } catch (e) { e1 = e; } finally { makePdf = mk0; if (ol) ol.s--; sl.releaseLock(); }\n    qaLater_(later, dl);", "      qaLater_(later, dl);\n    } catch (e) { e1 = e; } finally { makePdf = mk0; if (ol) ol.s--; sl.releaseLock(); }\n    void 0;", 'CH-49'),
 ('CAE_Ops_QuoteApp.gs', "  if (ul && !ul.tryLock(0)) return;", "", 'CH-59'),
 ('CAE_Ops_QuoteApp.gs', "    } catch (e) { e1 = e; } finally {", "    } finally {", 'CH-59'),
 ('CAE_Ops_Office.gs', "        oPeBump_(env, [no]); // CR M8 run 2", "        // CR M8 run 2", 'CH-51'),
 ('CAE_Ops_Office.gs', "    oPeBump_(env2, [no]); // CR M8 run 2: counted before the post writes", "    // x", 'CH-51'),
 ('CAE_Ops_Office.gs', "    oPeBump_(env2, [no]); // CR M8 run 2: counted before the cancel writes", "    // x", 'CH-51'),
 ('CAE_Ops_Office.gs', " || String(locs[l].Status || 'Active') !== 'Active') return; // CR M8 run 2", ") return; // CR M8 run 2", 'CH-52'),
 ('CAE_Ops_Office.gs', "&& oStRentHas_(db, code)) oFail_(", "&& false) oFail_(", 'CH-53'),
 ('CAE_Ops_Office.gs', "        try { db.insert('ChallanLines', ls.map(function (l, i) { l.LineID = nids[i]; l.ChallanNo = no; return l; }));", "        db.insert('ChallanLines', ls.map(function (l, i) { l.LineID = nids[i]; l.ChallanNo = no; return l; })); try {", 'CH-54'),
 ('CAE_Ops_PDF.gs', "if (!keep || keep.indexOf(f.getId()) < 0) f.setTrashed(true); } }", "f.setTrashed(true); } }", 'CH-55'),
 ('CAE_Ops_QuoteApp.gs', "trashSame_(e.next(), base, k);", "trashSame_(e.next(), base);", 'CH-55'),
 ('CAE_Ops_Office.gs', "a = { u: u, b: b, k: k, nm: nm, d: d0 };", "a = { u: u, b: b, nm: nm, d: d0 };", 'CH-55'),
 ('CAE_Ops_Office.gs', "p.p === oPdfIdOf_(c.PDF) && p.f", "p.f", 'CH-57'),
 ('CAE_Ops_Office.gs', " && p.f === oChFp_(db, String(c.ChallanNo)); }", "; }", 'CH-57'),
 ('CAE_Ops_Office.gs', "&& p1.p === oPdfIdOf_(c1.PDF) ? p1.d : ''", "? p1.d : ''", 'CH-57'),
 ('CAE_Ops_Office.gs', "      oPeBump_(env2, [no]); // CR M8 run 2: counted before it writes", "      if (!blank(c.JobNo)) { var j0 = find(db.rows('Jobs'), 'JobNo', c.JobNo); if (!j0 || String(j0.Status) === 'Closed') oFail_('BADINPUT|job'); } oPeBump_(env2, [no]); // x", 'CH-58'),
 ('CAE_Ops_Office.gs', ", p: oPdfIdOf_(url), f: fp });", " });", 'CH-57'),
 # CR M8 run 3 (r24)
 ('CAE_Ops_QuoteApp.gs', "if (d.hasTab('AppQuotes')) d.rows('AppQuotes').forEach(", "if (false) d.rows('AppQuotes').forEach(", 'CH-60'),
 ('CAE_Ops_QuoteApp.gs', "String(a.QuoteNo) !== j.no || ", "", 'CH-60'),
 ('CAE_Ops_QuoteApp.gs', ".replace(' · PDF being made', function () { return t; })", ".replace(' · PDF being made', t)", 'CH-60'),
 ('CAE_Ops_Office.gs', "      r.warn = true; r.links = []; // CR run 9", "      r.warn = true; // CR run 9", 'CH-61'),
 ('CAE_Ops_QuoteApp.gs', "        if (q) {\n          if (d.hasTab('AppQuotes'))", "        if (q) {\n          var x0 = find(d.rows('Quotes'), 'QuoteNo', j.no); if (x0) d.update('Quotes', x0, { AppPdf: er ? ('Error: ' + er).slice(0, 480) : 'Made ' + qaStamp_() });\n          if (d.hasTab('AppQuotes'))", 'CH-62'),
]
d, idx = sys.argv[1], [int(x) for x in sys.argv[2].split(',')]
procs = []
for i in idx:
    f, a, b, t = S[i]; T = tempfile.mkdtemp(prefix='e3s'); [shutil.copy(os.path.join(d, x), T) for x in os.listdir(d)]
    p = os.path.join(T, f); s = open(p, encoding='utf-8').read(); assert s.count(a) == 1, (i, s.count(a)); open(p, 'w', encoding='utf-8').write(s.replace(a, b))
    procs.append((i, t, T, subprocess.Popen(['bash', 'tools8/run_ch_tests.sh', T, 'selfTestSummary_()', '40', '40'], stdout=subprocess.PIPE, text=True)))
for i, t, T, pr in procs:
    out = pr.communicate()[0]; fails = [l[5:11] for l in out.splitlines() if l.startswith('FAIL')]
    print(i, 'CAUGHT' if any(t in l for l in fails) else 'MISSED', t, fails); shutil.rmtree(T)
