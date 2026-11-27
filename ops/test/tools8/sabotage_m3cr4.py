# M3 CR run 4 fix: sabotage only the new / changed lines. usage (harness root): [A= B=] python3 tools8/sabotage_m3cr4.py <src dir>
import sys, os, runpy
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "function oStUnitUsed_(db, code) {\n", "function oStUnitUsed_(db, code) { return false;\n", 'U1 never in use'),
 (G, "if ((oStKit_(db)[code] || []).length || oStPart_(db, code)) return true;", "if (oStPart_(db, code)) return true;", 'U3 set with parts not checked'),
 (G, "if ((oStKit_(db)[code] || []).length || oStPart_(db, code)) return true;", "if ((oStKit_(db)[code] || []).length) return true;", 'U4 part of a set not checked'),
 (G, "String(r.ItemCode == null ? '' : r.ItemCode).trim().toUpperCase() === cu; };", "String(r.ItemCode) === code; };", 'U5 line codes not trimmed / upper-cased'),
 (G, "return ['StockMoves', 'ChallanLines', 'Damage', 'POLines'].some(", "return ['ChallanLines', 'Damage', 'POLines'].some(", 'U6 moves not checked'),
 (G, "return ['StockMoves', 'ChallanLines', 'Damage', 'POLines'].some(", "return ['StockMoves', 'Damage', 'POLines'].some(", 'U7 challan lines not checked'),
 (G, "return ['StockMoves', 'ChallanLines', 'Damage', 'POLines'].some(", "return ['StockMoves', 'ChallanLines', 'POLines'].some(", 'U8 damage lines not checked'),
 (G, "return ['StockMoves', 'ChallanLines', 'Damage', 'POLines'].some(", "return ['StockMoves', 'ChallanLines', 'Damage'].some(", 'U9 PO lines not checked'),
 (G, "    if (row && ch.indexOf('Unit') >= 0 && oStUnitUsed_(db, code)) oFail_('BADINPUT|unit'); // CR run 4: before any write\n", "", 'U10 save not checked'),
 (G, "if (row && ch.indexOf('Unit') >= 0 && oStUnitUsed_(db, code)) oFail_", "if (row && oStUnitUsed_(db, code)) oFail_", 'U11 any edit of an item in use refused'),
 (G, "o.ulk = o.can && oStUnitUsed_(db, c);", "o.ulk = false;", 'U12 ulk never sent'),
 (G, "o.ulk = o.can && oStUnitUsed_(db, c);", "o.ulk = oStUnitUsed_(db, c);", 'U13 ulk worked out for view-only logins'),
 (G, "oPeBump_(env, [no]); uiPutRow_(db, 'Quotes', q, { Rev", "uiPutRow_(db, 'Quotes', q, { Rev", 'Q1 revision fix not counted'),
 (G, "oPeBump_(env, [no]); uiPutRow_(db, 'Quotes', q, { Rev: num(p.rev), Status: 'Draft' }); oQPdfStale_(env, db, no, true);", "uiPutRow_(db, 'Quotes', q, { Rev: num(p.rev), Status: 'Draft' }); oQPdfStale_(env, db, no);", 'Q2 revision fix counted after the write'),
 (G, "oQPdfStale_(env, db, no, true); // CR run 4", "oQPdfStale_(env, db, no); // CR run 4", 'Q3 revision fix counted twice'),
 (G, "    oPeBump_(env, [String(q.QuoteNo)]); // CR run 4: counted before qtSave_", "    // CR run 4: counted before qtSave_", 'Q4 terms change not counted first'),
 (G, "oQPdfStale_(env, env.db() || db, q.QuoteNo, true);", "oQPdfStale_(env, env.db() || db, q.QuoteNo);", 'Q5 terms change counted twice'),
 (G, "    if (q) oPeBump_(env, [String(q.QuoteNo)]); // CR run 4", "    if (false) oPeBump_(env, [String(q.QuoteNo)]); // CR run 4", 'Q6 quote save not counted first'),
 (G, "    if (q) oPeBump_(env, [String(q.QuoteNo)]); // CR run 4", "    oPeBump_(env, [String(q ? q.QuoteNo : 'NEW')]); // CR run 4", 'Q7 new quote counted'),
 (G, "if (q && changed) oQPdfStale_(env, d2, ref, true); else", "if (q && changed) oQPdfStale_(env, d2, ref); else", 'Q8 quote save counted twice'),
 (G, "if (q && changed) oQPdfStale_(env, d2, ref, true); else", "if (q && changed) {} else", 'Q9 quote save: PDF not marked old'),
 (G, "if (q) oPeBump_(env, [String(q.QuoteNo)]); // CR run 4: counted before saveQuoteFull writes (a new quote has no PDF yet)\n    try { r = UI_ACTIONS_.saveQuoteFull(db, x.a); }", "try { r = UI_ACTIONS_.saveQuoteFull(db, x.a); if (q) oPeBump_(env, [String(q.QuoteNo)]); }", 'Q10 quote save counted after the write'),
 (H, "o.ulk=r.ulk===true;", "", 'H1 ulk not read'),
 (H, "(o.ulk?'<label class=\"fld\"><span>Unit (in use: fixed)", "(!o.ulk?'<label class=\"fld\"><span>Unit (in use: fixed)", 'H2 ulk inverted'),
 (H, "id=\"xu\" value=\"'+esc(o.unit)+'\" readonly>", "id=\"xu\" value=\"'+esc(o.unit)+'\">", 'H3 fixed unit editable'),
 (H, "if(k[0]==='BADINPUT'&&k[1]==='unit'){", "if(false){", 'H4 no unit message'),
 (H, "already count this item in '+esc(o.unit)+'.", "already count this item in '+esc(v('xu'))+'.", 'H5 message names the unit asked for'),
]
sys.argv = ['x', sys.argv[1]]
src = open('tools8/sabotage_m3.py', encoding='utf-8').read()
src = src.replace(src[src.index('SAB = ['):src.index("SAB = SAB[int(")], '')
exec(compile(src.replace("import sys, os, shutil, subprocess, tempfile", "import sys, os, shutil, subprocess, tempfile\nSAB = __SAB__").replace("SAB = SAB[int(", "SAB = __SAB__[int("), 'sab', 'exec'), {'__SAB__': SAB, '__name__': '__main__'})
