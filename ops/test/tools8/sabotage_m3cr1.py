# M3 CR run 1 fix: sabotage only the new lines. usage (harness root): python3 tools8/sabotage_m3cr1.py <src dir>
import sys, os, runpy
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "old = oStPdfOld_(env, db, code, ch); ", "", 'C1 no old-PDF marking'),
 (G, "if (qs[no] && oQNo_(no) && !blank(q.PDF) && !oQLocked_(db, q))", "if (qs[no] && oQNo_(no) && !blank(q.PDF))", 'C2 locked quotes marked'),
 (G, "if (!nos[String(r[t[1]])] || blank(r.PDF) || !oStOpen_(r)) return;", "if (!nos[String(r[t[1]])] || blank(r.PDF)) return;", 'C3 issued documents cleared'),
 (G, "Quotes: ['Size'], Challans", "Quotes: [], Challans", 'C4 size does not touch quotes'),
 (G, "Challans: ['Name', 'Unit', 'WeightKg']", "Challans: ['Name', 'Unit']", 'C5 weight does not touch challans'),
 (G, "POs: ['Name', 'Unit']", "POs: ['Name']", 'C6 unit does not touch POs'),
 (G, "Notes: ['Name'] };", "Notes: [] };", 'C7 name does not touch notes'),
 (G, "var u = String(r.PDF); log_(db, 'PDF out of date', String(r[t[1]]), 'Item ' + code + ' changed; old PDF ' + u); // logged first: a failed log stops before the link is cleared\n      uiPutRow_(db, t[0], r, { PDF: '' }); n++;", "var u = String(r.PDF); uiPutRow_(db, t[0], r, { PDF: '' }); n++; log_(db, 'PDF out of date', String(r[t[1]]), 'Item ' + code + ' changed; old PDF ' + u);", 'C8 link cleared before the log'),
 (G, "    if (dn) oFail_('DNOPEN|' + dn);", "", 'C9 no DNOPEN'),
 (G, "return dn[String(x.NoteNo)] && oStOpen_(x); })[0];", "return dn[String(x.NoteNo)]; })[0];", 'C10 issued notes block rates'),
 (G, "(ch.indexOf('RepairRate') >= 0 || ch.indexOf('ReplacementCost') >= 0)", "(ch.indexOf('RepairRate') >= 0)", 'C11 replacement cost not checked'),
 (G, "old = oStPdfOld_(env, db, code, ch); uiPutRow_(db, 'Items', row, patch);", "uiPutRow_(db, 'Items', row, patch); old = oStPdfOld_(env, db, code, ch);", 'C12 marked after the write'),
 (G, "db.rows(t[2]).forEach(function (l) { if (String(l.ItemCode) === code && !blank(l[t[3]])) nos", "db.rows(t[2]).forEach(function (l) { if (!blank(l[t[3]])) nos", 'C13 any item clears documents'),
 (G, "db.rows('QuoteLines').forEach(function (l) { if (String(l.ItemCode) === code) qs[String(l.QuoteNo)] = 1; });", "db.rows('QuoteLines').forEach(function (l) { qs[String(l.QuoteNo)] = 1; });", 'C14 any quote marked'),
 (G, "if (!row || oStSt_(row) !== x.status) ch.push('Status');", "if (!row || oStSt_(row) !== x.status) ch.push('Status', 'Name');", 'C15 status change marks name PDFs'),
 (G, "function oStMap_() { return Object.create(null); }", "function oStMap_() { return {}; }", 'C16 plain objects as maps'),
 (H, "(od?' '+od+' open PDF'+(od===1?'':'s')+' printing this item marked old.':'')", "''", 'H1 toast hides the count'),
 (H, "      if(k[0]==='DNOPEN'){", "      if(k[0]==='DNOPENX'){", 'H2 DNOPEN not explained'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
