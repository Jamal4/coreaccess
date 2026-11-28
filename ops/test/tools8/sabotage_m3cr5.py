# M3 CR run 5 fix: sabotage only the new / changed lines. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr5.py <src dir>
import sys, os, runpy
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "oPdfNow_(db, t[0], row) === String(r.url) : false;", "true : false;", 'P1 fix clears whatever the cell holds'),
 (G, "oPdfNow_(db, t[0], row) === String(r.url) : false;", "String(row.PDF || '') === String(r.url) : false;", 'P2 fix compares the cached read'),
 (G, "  if (mine) { // cleared first", "  if (row) { // cleared first", 'P3 blank cell written again'),
 (G, "+ (mine ? '' : ' — the cell holds another link, left as it is')", "", 'P4 no note when kept'),
 (G, "  R.hit.push(no);\n  try { log_(db, 'PDF out of date'", "  if (mine) R.hit.push(no);\n  try { log_(db, 'PDF out of date'", 'P5 no warning when the newer link is kept'),
 (G, "    for (var i = 0; i < a.length; i++) if (a[i].p === p) { a[i].q += q; return; }\n", "", 'K1 rows of one part not added up'),
 (G, "if (a[i].p === p) { a[i].q += q; return; }", "if (a[i].p === p) { a[i].q = Math.max(a[i].q, q); return; }", 'K2 rows of one part: the larger kept'),
 (G, "if (!x || String(x.IsSet) === 'Yes' || x.StockTracked !== 'Yes' || !(q > 0)) { a.bad = true; return; }", "if (!x || !(q > 0)) { a.bad = true; return; }", 'K3 set / untracked parts not bad'),
 (G, "if (!x || String(x.IsSet) === 'Yes' || x.StockTracked !== 'Yes' || !(q > 0)) { a.bad = true; return; }", "if (!x || String(x.IsSet) === 'Yes' || x.StockTracked !== 'Yes' || !(q > 0)) { return; }", 'K4 bad rows skipped silently'),
 (G, "if (!x || String(x.IsSet) === 'Yes' || x.StockTracked !== 'Yes' || !(q > 0)) { a.bad = true; return; }", "if (String(x.IsSet) === 'Yes' || x.StockTracked !== 'Yes' || !(q > 0)) { a.bad = true; return; }", 'K5 missing part crashes'),
 (G, "if (!parts || !parts.length || parts.bad) return 0;", "if (!parts || !parts.length) return 0;", 'K6 bad kit still makes sets'),
 (G, "var kk = kit[o.code] || []; if (!kk.length || kk.bad) o.kitBad = true; }", "var kk = kit[o.code] || []; if (kk.bad) o.kitBad = true; }", 'K7 set with no parts not flagged'),
 (G, "var kk = kit[o.code] || []; if (!kk.length || kk.bad) o.kitBad = true; }", "}", 'K8 never flagged'),
 (G, "if (!blank(i.ItemCode) && !its[k]) its[k] = i; });", "if (!blank(i.ItemCode)) its[k] = i; });", 'K9 kit items: last row wins'),
 (G, "if (!blank(l.LocID) && !m[k]) m[k] = l; }); return m; }", "if (!blank(l.LocID)) m[k] = l; }); return m; }", 'D1 locations: last row wins'),
 (G, "if (!oStCode_(c) || seen[c]) return false; seen[c] = 1; return true; })", "if (!oStCode_(c)) return false; seen[c] = 1; return true; })", 'D2 repeated item listed twice'),
 (H, "function stKg(n){n=+n;return isFinite(n)?n.toLocaleString('en-IN',{maximumFractionDigits:3}):'—';}", "function stKg(n){return stQ(n);}", 'H1 weight at 2 decimals'),
 (H, "if(k[0]==='BADINPUT'&&k[1]==='count date'){", "if(false){", 'H2 no count-date message'),
 (H, "    if(!isDay(dd)){dlgErr('The count date is needed.');return;}\n", "    if(!isDay(dd)){dlgErr('The count date is needed.');return;}\n    if(ST.today&&dd>ST.today){dlgErr('The count date can\\'t be in the future.');return;}\n", 'H3 cached day check back'),
 (H, "(x.kitBad?'<span class=\"pill st-low\">Parts list problem</span>':'')+", "", 'H4 no pill'),
 (H, "kitBad:r.kitBad===true,", "", 'H5 kitBad not read'),
 (H, ".concat(o.kitBad?[['Parts list','<span class=\"pill st-low\">Problem</span>", ".concat(false?[['Parts list','<span class=\"pill st-low\">Problem</span>", 'H6 no Problem row'),
 (H, "seen[k]=1;rows.push({item:it,loc:l,qty:q});}", "if(ST.c&&ST.c.code===it&&ST.c.opened.indexOf(l)>=0){dlgErr('Line '+(i+1)+': already has an opening balance.');return;}seen[k]=1;rows.push({item:it,loc:l,qty:q});}", 'H7 cached opening check back'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
