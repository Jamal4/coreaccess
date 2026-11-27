# M3 CR run 12 fix: sabotage only the new / changed lines. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr12.py <src dir>
import sys, os
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "if (t) g[t] += q[l]; });", "if (t) g[t] = r2(g[t] + q[l]); });", 'S1 rounded per add (r11)'),
 (G, "g.own = r2(g.yard + g.site + g.rep); g.yard = r2(g.yard);", "g.yard = r2(g.yard); g.own = r2(g.yard + g.site + g.rep);", 'S2 own from rounded parts'),
 (G, "g.yard = r2(g.yard); g.site = r2(g.site);", "g.site = r2(g.site);", 'S3 yard not rounded'),
 (G, "g.site = r2(g.site); g.rep = r2(g.rep);", "g.site = r2(g.site);", 'S4 repair not rounded'),
 (G, "x.mk = oStMake_([p], Q, locs); return x;", "x.mk = Math.floor(x.yard / p.q + 1e-9); return x;", 'S5 mk from the rounded yard'),
 (G, "x.mk = oStMake_([p], Q, locs); return x;", "return x;", 'S6 no mk'),
 (H, "yard:stN(p.yard),mk:stN(p.mk)};};", "yard:stN(p.yard)};};", 'S7 page drops mk'),
 (H, "stQ(p.mk)+' sets</td>", "stQ(p.q>0?Math.max(0,Math.floor(p.yard/p.q+1e-9)):0)+' sets</td>", 'S8 page counts from the rounded yard (r11)'),
 (H, "if(d0===DLG.seq)stOpenDlg(pre,true);}", "stOpenDlg(pre,true);}", 'S9 late load opens over a dialog (r11)'),
 (H, "if(d0===DLG.seq)stOpenDlg(pre,true);} /*", "} /*", 'S12 the form never opens'),
 (G, "return x === y || (OST_NUMF_.indexOf(k) >= 0 && x !== ''", "return x === y || (x !== ''", 'S13 numeric match for text (r11)'),
 (G, "return x === y || (OST_NUMF_.indexOf(k) >= 0 && x !== ''", "return x === y || (false && x !== ''", 'S14 no numeric match at all'),
 (G, "return !same(k, r[k], prev[k]); })) return;", "return !same(r[k], r[k], prev[k]); })) return;", 'S15 field name lost'),
 (G, "var OST_NUMF_ = ['WeightKg', 'ReorderLevel',", "var OST_NUMF_ = ['ReorderLevel',", 'S16 WeightKg not numeric'),
 (G, "  } catch (e) { if (!wr) drop(); throw e; }", "  } catch (e) { throw e; }", 'S17 lock refused: new files left (r11)'),
 (G, "  } catch (e) { if (!wr) drop(); throw e; }", "  } catch (e) { drop(); throw e; }", 'S18 binned though the link may be in'),
 (G, "  } catch (e) { if (!wr) drop(); throw e; }", "  } catch (e) { if (!wr) drop(); }", 'S19 error swallowed'),
 (G, "else { wr = true; d1.update('Quotes', r, { PDF: url }); pub = true; }", "else { d1.update('Quotes', r, { PDF: url }); wr = true; pub = true; }", 'S20 write flag after the write'),
 (G, "  drop();\n  oFail_('BUSY');", "  oFail_('BUSY');", 'S21 refused: not binned'),
 (G, "if (x.st === 'in') { oBinNow_(x.bin, ids); oPeAfter_(x); return; }", "if (x.st === 'in') { oBinNow_(x.bin, ids); return; }", 'S22 old PDF never binned'),
 (G, "    oPeKeep_(R, x); // CR run 12", "    oPeAfter_(x); // CR run 12", 'S23 binned though not linked'),
 (G, "    oPeKeep_(R, x); // CR run 12", "    // CR run 12", 'S24 kept not reported'),
 (G, "if (x) (x.after = x.after || []).push(a); else (R.kept = R.kept || []).push(nm); }", "d0.trash(u, b); }", 'S25 trash right away (r11)'),
 (G, "if (x) (x.after = x.after || []).push(a); else", "if (x) a.d.trash(u, b); else", 'S26 trash right away when made'),
 (G, "name: function (u) { nm = d0.name(u); return nm; }", "name: function (u) { return d0.name(u); }", 'S27 name not kept'),
 (G, "function oPeAfter_(x) { (x.after || []).forEach(function (a) { try { a.d.trash(a.u, a.b); }", "function oPeAfter_(x) { (x.after || []).forEach(function (a) { try { a.d.trash(a.u); }", 'S28 base lost'),
 (G, "if (dv) QF5_DRIVE_ = oPeDrive_(R, dv.officePe_ || dv); // CR run 12", "// CR run 12", 'S29 drive not wrapped'),
 (G, "      if (dv) QF5_DRIVE_ = dv;\n", "", 'S30 drive not put back'),
 (G, "R.kept.forEach(function (n) { r.msg = r.msg.split(' (the old ' + n + ' went to the bin)').join(' (the old ' + n + ' was kept)'); });", "", 'S31 message still says binned'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
