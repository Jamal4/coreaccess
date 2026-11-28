#!/usr/bin/env python3
# r34 (F5): vendor / own-stock rules. Exact-match edits (each old string must occur once). usage: python3 tools8/p34.py <ops dir>
import sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '..'
def ed(f, pairs):
    p = os.path.join(D, f); s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        n = s.count(a)
        assert n == 1, (f, n, a[:90])
        s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)

# ------------------------------------------------------------------ Sets.gs
ed('CAE_Ops_Sets.gs', [
("var CH_YK_ = ['Transfer', 'Hire-in', 'Off-hire']; // kinds without a job\n",
 "var CH_YK_ = ['Transfer', 'Hire-in', 'Off-hire']; // kinds without a job\n"
 "// r34 F5: Delivery / Sale / Return post what our stock has (Return: what is ours on that job's site); the rest is from outside:\n"
 "// no StockMoves, kept on the line as ChallanLines.QtyOut (loose items) so hire and billing still count the full qty.\n"
 "var CH_CAP_ = ['Delivery', 'Sale', 'Return'];\n"),
# chSplit_: leftover of a capped kind = outside (per line), not a negative own move
("function chSplit_(db, c, kind, sup, mv, jobNo, errs) {\n  var supIn",
 "function chSplit_(db, c, kind, sup, mv, jobNo, errs, outs) { // mv[i][5] = the line index (-1: a set part); outs: line index -> qty from outside\n  var supIn"),
("    if (left > 1e-9) { if (kind === 'Return' || kind === 'Transfer' || kind === 'Delivery') out.push([m[0], left, m[2], m[3], m[4], '']); else errs.push(",
 "    if (left > 1e-9) { if (CH_CAP_.indexOf(kind) >= 0) { if (outs && m[5] >= 0) outs[m[5]] = (outs[m[5]] || 0) + left; } else if (kind === 'Transfer') out.push([m[0], left, m[2], m[3], m[4], '']); else errs.push("),
# set parts: no stock refusal for capped kinds
("    if (!fromSupplier && have < tot - 1e-9 && !o.allowNegative) { errs.push(code + ' (part of '",
 "    if (!fromSupplier && have < tot - 1e-9 && !o.allowNegative && !cap) { errs.push(code + ' (part of '"),
("      if (g > 1e-9) mv.push([code, g, c.FromLoc, c.ToLoc, e.set]);\n      if (a > 1e-9) mv.push([code, a, c.FromLoc, LOC.REPAIR, e.set]);\n      if (b > 1e-9) mv.push([code, b, c.FromLoc, LOC.LOST, e.set]);\n    });\n    if (d0 || lo0) dmg.push({ ChallanNo: no, JobNo: jn, ItemCode: code, QtyDamaged: d0 || '', QtyLost: lo0 || '', Status: 'Open' });\n",
 "      if (g > 1e-9) mv.push([code, g, c.FromLoc, c.ToLoc, e.set, -1]);\n      if (a > 1e-9) mv.push([code, a, c.FromLoc, LOC.REPAIR, e.set, -1]);\n      if (b > 1e-9) mv.push([code, b, c.FromLoc, LOC.LOST, e.set, -1]);\n    });\n"),
("  var date = c.ChallanDate ? toDate(c.ChallanDate) : today(), ret = kind === 'Return',",
 "  var date = c.ChallanDate ? toDate(c.ChallanDate) : today(), ret = kind === 'Return', cap = CH_CAP_.indexOf(kind) >= 0,"),
("  loose.forEach(function (l) {\n    var q = num(l.Qty);\n",
 "  loose.forEach(function (l) {\n    var q = num(l.Qty), li = lines.indexOf(l);\n"),
("      if (g) mv.push([l.ItemCode, g, c.FromLoc, c.ToLoc, '']);\n      if (d) mv.push([l.ItemCode, d, c.FromLoc, LOC.REPAIR, '']);\n      if (lo) mv.push([l.ItemCode, lo, c.FromLoc, LOC.LOST, '']);\n      if (d || lo) dmg.push({ ChallanNo: no, JobNo: jn, ItemCode: l.ItemCode, QtyDamaged: d || '', QtyLost: lo || '', Status: 'Open' });\n",
 "      if (g) mv.push([l.ItemCode, g, c.FromLoc, c.ToLoc, '', li]);\n      if (d) mv.push([l.ItemCode, d, c.FromLoc, LOC.REPAIR, '', li]);\n      if (lo) mv.push([l.ItemCode, lo, c.FromLoc, LOC.LOST, '', li]);\n"),
("      if (!fromSupplier && have < q - 1e-9 && !o.allowNegative) { errs.push(l.ItemCode + ': only ' + have",
 "      if (!fromSupplier && have < q - 1e-9 && !o.allowNegative && !cap) { errs.push(l.ItemCode + ': only ' + have"),
("      mv.push([l.ItemCode, q, c.FromLoc, c.ToLoc, '']);\n    }\n  });\n  if (oc && !errs.length) mv = chSplit_(db, c, kind, sup, mv, jn, errs);\n",
 "      mv.push([l.ItemCode, q, c.FromLoc, c.ToLoc, '', li]);\n    }\n  });\n"
 "  var outs = {}; if ((oc || (cap && !fromSupplier)) && !errs.length) mv = chSplit_(db, c, kind, sup, mv, jn, errs, outs);\n"),
("  if (fromQ) { c = chQuoteJob_(db, c); job = must(db, 'Jobs', 'JobNo', c.JobNo); jn = String(job.JobNo); } // E3b-4: a refused post made a job + accepted the quote\n",
 "  if (fromQ) { c = chQuoteJob_(db, c); job = must(db, 'Jobs', 'JobNo', c.JobNo); jn = String(job.JobNo); } // E3b-4: a refused post made a job + accepted the quote\n"
 "  chOutWrite_(db, lines, outs); // r34 F5: before the moves, so a retried post writes it again\n"
 "  if (ret) dmg = chDmg_(mv.map(function (m) { return { ItemCode: m[0], Qty: m[1], ToLoc: m[3] }; }), no, jn); // r34 F5: damage / loss of our own items only (what moved)\n"),
# helpers after chQuoteJob_
("function chPostVendor_(db, c) { // r28 F2: Posted with no StockMoves: own and rented-in stock untouched; the job goes on hire as for any delivery\n  var no = c.ChallanNo; if (!db.rows('ChallanLines').some(function (l) { return l.ChallanNo === no; })) throw new Error(no + ' has no lines');\n  if (c.Kind !== 'Delivery' || blank(c.SupID)) throw new Error(no + ': a vendor rental challan is a Delivery with its vendor');\n  var job = blank(c.JobNo) ? null : must(db, 'Jobs', 'JobNo', c.JobNo); if (job && String(job.Status) === 'Closed') throw new Error(no + ': job ' + job.JobNo + ' is closed');\n  chPostTail_(db, c, job, [], new Date()); log_(db, 'Challan posted', no, 'Delivery · vendor rental ' + c.SupID + ' · no stock moves'); return { moves: 0, damage: 0 };\n}\n",
 "function chOutWrite_(db, lines, outs) { // r34 F5: ChallanLines.QtyOut = the qty from outside (blank = none); only lines that change are written\n"
 "  var ch = lines.map(function (l, i) { var v = outs[i] > 1e-9 ? r2(outs[i]) : ''; return String(l.QtyOut == null ? '' : l.QtyOut) === String(v) ? null : [l, v]; }).filter(function (x) { return x; });\n"
 "  if (!ch.length) return;\n"
 "  if (db.headers('ChallanLines').indexOf('QtyOut') < 0) { if (!ch.some(function (x) { return x[1] !== ''; })) return; if (typeof db.ensureColumn !== 'function' || (db.ensureColumn('ChallanLines', 'QtyOut'), db.headers('ChallanLines').indexOf('QtyOut') < 0)) throw new Error('ChallanLines needs a QtyOut column'); }\n"
 "  ch.forEach(function (x) { db.update('ChallanLines', x[0], { QtyOut: x[1] }); });\n"
 "}\n"
 "function chDmg_(mv, no, jn) { // r34 F5: Damage rows from the moves to repair / lost (per item, in order)\n"
 "  var by = {}, out = [];\n"
 "  mv.forEach(function (v) { var d = v.ToLoc === LOC.REPAIR, lo = v.ToLoc === LOC.LOST; if (!d && !lo) return;\n"
 "    var x = by[v.ItemCode]; if (!x) { x = by[v.ItemCode] = { ChallanNo: no, JobNo: jn, ItemCode: v.ItemCode, QtyDamaged: 0, QtyLost: 0, Status: 'Open' }; out.push(x); }\n"
 "    if (d) x.QtyDamaged += num(v.Qty); else x.QtyLost += num(v.Qty); });\n"
 "  out.forEach(function (x) { x.QtyDamaged = r2(x.QtyDamaged) || ''; x.QtyLost = r2(x.QtyLost) || ''; });\n"
 "  return out;\n"
 "}\n"
 "function chVendorOut_(db, jn, sup, except) { // r34 F5: item -> qty of that vendor's items still out on the job (posted vendor deliveries - vendor returns)\n"
 "  var cs = {}, m = {}; db.rows('Challans').forEach(function (c) { if (String(c.JobNo) === String(jn) && String(c.SupID) === String(sup) && c.Status === 'Posted' && String(c.MatSource || '') === 'Vendor' && String(c.ChallanNo) !== String(except || '') && (c.Kind === 'Delivery' || c.Kind === 'Return')) cs[c.ChallanNo] = c.Kind === 'Delivery' ? 1 : -1; });\n"
 "  db.rows('ChallanLines').forEach(function (l) { var s = cs[l.ChallanNo]; if (s) m[l.ItemCode] = r2((m[l.ItemCode] || 0) + s * num(l.Qty)); });\n"
 "  return m;\n"
 "}\n"
 "function chPostVendor_(db, c) { // r28 F2: Posted with no StockMoves: own and rented-in stock untouched; the job goes on hire as for any delivery. r34 F5: a vendor Return too (job status unchanged)\n"
 "  var no = c.ChallanNo, ls = db.rows('ChallanLines').filter(function (l) { return l.ChallanNo === no; }); if (!ls.length) throw new Error(no + ' has no lines');\n"
 "  var ret = c.Kind === 'Return'; if ((c.Kind !== 'Delivery' && !ret) || blank(c.SupID)) throw new Error(no + ': a vendor rental challan is a Delivery or Return with its vendor');\n"
 "  var job = blank(c.JobNo) ? null : must(db, 'Jobs', 'JobNo', c.JobNo); if (job && String(job.Status) === 'Closed') throw new Error(no + ': job ' + job.JobNo + ' is closed');\n"
 "  if (ret) { if (!job) throw new Error(no + ': a return needs its job'); var vo = chVendorOut_(db, job.JobNo, c.SupID, no), errs = [];\n"
 "    ls.forEach(function (l) { var q = num(l.Qty); if ((vo[l.ItemCode] || 0) < q - 1e-9) errs.push(l.ItemCode + ': only ' + (vo[l.ItemCode] || 0) + ' of ' + c.SupID + '\\'s items out on ' + job.JobNo + ', return has ' + q); vo[l.ItemCode] = (vo[l.ItemCode] || 0) - q; });\n"
 "    if (errs.length) throw new Error('Not posted:\\n' + errs.join('\\n')); }\n"
 "  chPostTail_(db, c, ret ? null : job, [], new Date()); log_(db, 'Challan posted', no, c.Kind + ' · vendor rental ' + c.SupID + ' · no stock moves'); return { moves: 0, damage: 0 };\n"
 "}\n"),
# tail: this challan's QtyOut counts while it is not Posted yet
("    if (String(c.Status) !== 'Posted') db.rows('ChallanLines').forEach(function (l) { if (String(l.ChallanNo) !== String(c.ChallanNo) || !sm[l.ItemCode]) return; var q = num(l.Qty);",
 "    if (String(c.Status) !== 'Posted') db.rows('ChallanLines').forEach(function (l) { if (String(l.ChallanNo) !== String(c.ChallanNo)) return; var q = sm[l.ItemCode] ? num(l.Qty) : num(l.QtyOut); if (!q) return; /* r34 F5: and its loose qty from outside */"),
# chFinishPost_: damage from the moves
("  if (c.Kind === 'Return' && !db.rows('Damage').some(function (x) { return x.ChallanNo === no; })) {\n    var items = db.rows('Items'), by = {};\n    db.rows('ChallanLines').forEach(function (l) {\n      if (l.ChallanNo !== no) return;\n      var it = find(items, 'ItemCode', l.ItemCode), d = num(l.QtyDamaged), lo = num(l.QtyLost);\n      if (!it || isSet_(it) || it.StockTracked !== 'Yes' || !(d || lo)) return;\n      var x = by[l.ItemCode]; if (!x) { x = by[l.ItemCode] = { ChallanNo: no, JobNo: jn, ItemCode: l.ItemCode, QtyDamaged: 0, QtyLost: 0, Status: 'Open' }; dmg.push(x); }\n      x.QtyDamaged += d; x.QtyLost += lo;\n    });\n    dmg.forEach(function (x) { x.QtyDamaged = x.QtyDamaged || ''; x.QtyLost = x.QtyLost || ''; });\n  }\n",
 "  if (c.Kind === 'Return' && !db.rows('Damage').some(function (x) { return x.ChallanNo === no; })) // r34 F5: from its moves, as postChallan\n"
 "    dmg = chDmg_(db.rows('StockMoves').filter(function (v) { return v.RefNo === no && v.RefType === 'Challan'; }), no, jn);\n"),
# cancel: outside qty already returned / vendor items already returned
("    if (errs.length) throw new Error('Cannot cancel:\\n' + errs.join('\\n'));\n    var ids = nextIds(db, 'MV', mv.length), now = new Date(), tag",
 "    chCancelOut_(db, c, errs); // r34 F5\n"
 "    if (errs.length) throw new Error('Cannot cancel:\\n' + errs.join('\\n'));\n    var ids = nextIds(db, 'MV', mv.length), now = new Date(), tag"),
("function cancelChallan(db, no) {\n",
 "function chCancelOut_(db, c, errs) { // r34 F5: a posted delivery's outside / vendor items that already came back can't be un-delivered\n"
 "  if (blank(c.JobNo) || locType(db, c.ToLoc) !== 'Site') return;\n"
 "  var ls = db.rows('ChallanLines').filter(function (l) { return l.ChallanNo === c.ChallanNo; });\n"
 "  if (String(c.MatSource || '') === 'Vendor') { var vo = chVendorOut_(db, c.JobNo, c.SupID); ls.forEach(function (l) { if ((vo[l.ItemCode] || 0) < num(l.Qty) - 1e-9) errs.push(l.ItemCode + ': only ' + (vo[l.ItemCode] || 0) + ' of the vendor\\'s items still out (some came back)'); vo[l.ItemCode] = (vo[l.ItemCode] || 0) - num(l.Qty); }); return; }\n"
 "  if (!ls.some(function (l) { return num(l.QtyOut) > 0; })) return;\n"
 "  var h = onHire(db, c.JobNo); ls.forEach(function (l) { var q = num(l.QtyOut); if (!(q > 0)) return; if ((h[l.ItemCode] || 0) < q - 1e-9) errs.push(l.ItemCode + ': only ' + r2(h[l.ItemCode] || 0) + ' on hire, the ' + q + ' from outside already came back'); h[l.ItemCode] = (h[l.ItemCode] || 0) - q; });\n"
 "}\n"
 "function cancelChallan(db, no) {\n"),
# jobEvents: outside qty (loose lines) of posted own-stock challans counts on hire
("  var sets = setMap_(db); if (!Object.keys(sets).length) return ev;\n  var chs = {}; db.rows('Challans').forEach(function (c) { if (c.JobNo === jobNo && c.Status === 'Posted' && String(c.MatSource || '') !== 'Vendor') chs[c.ChallanNo] = c; }); // r28 F2: vendor sets are not ours on hire\n  db.rows('ChallanLines').forEach(function (l) {\n    var c = chs[l.ChallanNo]; if (!c || !sets[l.ItemCode]) return;\n    var d = dayNum(c.ChallanDate), q = num(l.Qty),",
 "  var sets = setMap_(db), oq = db.hasTab('ChallanLines') && db.headers('ChallanLines').indexOf('QtyOut') >= 0; if (!Object.keys(sets).length && !oq) return ev;\n  var chs = {}; db.rows('Challans').forEach(function (c) { if (c.JobNo === jobNo && c.Status === 'Posted' && String(c.MatSource || '') !== 'Vendor') chs[c.ChallanNo] = c; }); // r28 F2: vendor sets are not ours on hire\n  db.rows('ChallanLines').forEach(function (l) {\n    var c = chs[l.ChallanNo]; if (!c) return; var st = !!sets[l.ItemCode]; if (!st && !(oq && num(l.QtyOut) > 0)) return; // r34 F5: + loose qty from outside\n    var d = dayNum(c.ChallanDate), q = st ? num(l.Qty) : num(l.QtyOut),"),
])
print('Sets.gs ok')

# ------------------------------------------------------------------ Office.gs
ed('CAE_Ops_Office.gs', [
("var OCH_YW_ = ['Transfer', 'Hire-in', 'Off-hire'];\n",
 "var OCH_YW_ = ['Transfer', 'Hire-in', 'Off-hire'];\n"
 "var OCH_NEW_ = ['Delivery', 'Sale', 'Return', 'Transfer']; // r34 F5: Hire-in / Off-hire are no longer made (vendor items never enter our stock); old ones stay readable / cancellable\n"),
("['Challans', 'QuoteNo'], ['Challans', 'MatSource']]; // MadeByID",
 "['Challans', 'QuoteNo'], ['Challans', 'MatSource'], ['ChallanLines', 'QtyOut']]; // r34 F5: QtyOut = qty from outside (not our stock); MadeByID"),
# card: vendor return route
("    quote: !blank(c.QuoteNo) ? String(c.QuoteNo) : job && !blank(job.QuoteNo) ? String(job.QuoteNo) : '', src: String(c.MatSource || '') === 'Vendor' ? 'Vendor' : '' }; // r28 F1 / F2",
 "    quote: !blank(c.QuoteNo) ? String(c.QuoteNo) : job && !blank(job.QuoteNo) ? String(job.QuoteNo) : '', src: String(c.MatSource || '') === 'Vendor' ? 'Vendor' : '' }; // r28 F1 / F2; r34 F5: a vendor Return too"),
# list: jobs carry their quote; all quotes (with their job); vendor items out per job
("    jobs.push({ no: n, cust: X.cust(j), site: sl, siteName: oUncell_(si.Project || si.Address || ''), type: String(j.JobType || ''), ref: oUncell_(j.ClientWONo), st: String(j.Status || '') });",
 "    jobs.push({ no: n, cust: X.cust(j), site: sl, siteName: oUncell_(si.Project || si.Address || ''), type: String(j.JobType || ''), ref: oUncell_(j.ClientWONo), st: String(j.Status || ''), quote: blank(j.QuoteNo) ? '' : String(j.QuoteNo) }); // r34 F5-a: + quote no."),
("  var qj = oStMap_(); db.rows('Jobs').forEach(function (j) { if (!blank(j.QuoteNo)) qj[String(j.QuoteNo)] = 1; }); // r28 F1: quotes with no job yet (no PO needed)\n  var quotes = Object.keys(X.quotes).filter(function (n) { return !qj[n] && oChQOk_(X.quotes[n]); }).sort().map(function (n) { var q = X.quotes[n], si = X.sites[String(q.SiteID)] || {};\n    return { no: n, cust: X.cust(q), siteName: oUncell_(si.Project || si.Address || ''), type: String(q.QuoteType || ''), st: String(q.Status || '') }; });",
 "  var qj = oStMap_(); db.rows('Jobs').forEach(function (j) { if (!blank(j.QuoteNo) && !qj[String(j.QuoteNo)]) qj[String(j.QuoteNo)] = j; }); // r28 F1: no PO needed; r34 F5-a: every open quote, with its job if it has one\n  var quotes = Object.keys(X.quotes).filter(function (n) { return oChQOk_(X.quotes[n]) && !(qj[n] && String(qj[n].Status) === 'Closed'); }).sort().map(function (n) { var q = X.quotes[n], si = X.sites[String(q.SiteID)] || {};\n    return { no: n, cust: X.cust(q), siteName: oUncell_(si.Project || si.Address || ''), type: String(q.QuoteType || ''), st: String(q.Status || ''), job: qj[n] ? String(qj[n].JobNo) : '' }; });\n"
 "  var vout = {}; Object.keys(X.jobs).forEach(function (n) { if (String(X.jobs[n].Status) === 'Closed') return; var by = {}; // r34 F5-b: vendor items still out per job (vendor returns)\n"
 "    db.rows('Challans').forEach(function (c) { if (String(c.JobNo) === n && c.Status === 'Posted' && String(c.MatSource || '') === 'Vendor' && !blank(c.SupID)) by[String(c.SupID)] = 1; });\n"
 "    Object.keys(by).forEach(function (s) { var m = chVendorOut_(db, n, s), o = {}; Object.keys(m).forEach(function (k) { if (m[k] > 1e-9) o[k] = m[k]; }); if (Object.keys(o).length) (vout[n] = vout[n] || {})[s] = o; }); });"),
("  return { can: { PS: oChCan_(a, 'Delivery'), YW: oChCan_(a, 'Transfer'), psH: oChHead_(a, 'Delivery'), ywH: oChHead_(a, 'Transfer') }, rows: rows, jobs: jobs, quotes: quotes, hire: hire,",
 "  return { can: { PS: oChCan_(a, 'Delivery'), YW: oChCan_(a, 'Transfer'), psH: oChHead_(a, 'Delivery'), ywH: oChHead_(a, 'Transfer') }, rows: rows, jobs: jobs, quotes: quotes, vout: vout, hire: hire,"),
# view: own / outside split of a posted own-stock challan
("    o.al = al; }\n  var p = env.get('OCHP:' + no);",
 "    o.al = al;\n"
 "    if (String(c.MatSource || '') !== 'Vendor' && OCH_NEW_.indexOf(k) >= 0 && k !== 'Transfer') { var ex = {}, mv = {}, sm = setMap_(db); // r34 F5-c: per item, the qty not from our stock (outside)\n"
 "      lines.forEach(function (l) { var i = String(l.ItemCode); if (sm[i]) { try { kitParts_(db, i).forEach(function (pp) { ex[pp.item] = (ex[pp.item] || 0) + pp.qty * num(l.Qty); }); } catch (e) { /* a broken kit: nothing shown */ } } else if (num(l.QtyOut) > 0) o.out = o.out || {}, o.out[i] = r2((o.out[i] || 0) + num(l.QtyOut)); });\n"
 "      mine.forEach(function (v) { if (!blank(v.SetCode)) mv[String(v.ItemCode)] = (mv[String(v.ItemCode)] || 0) + num(v.Qty); });\n"
 "      Object.keys(ex).forEach(function (i) { var d = r2(ex[i] - (mv[i] || 0)); if (d > 1e-9) { o.out = o.out || {}; o.out[i] = r2((o.out[i] || 0) + d); } }); } }\n"
 "  var p = env.get('OCHP:' + no);"),
# header: vendor source on Return; no direct-from-supplier own Delivery any more
("  var src = x.src == null || x.src === '' || x.src === 'Own' ? '' : x.src === 'Vendor' && k === 'Delivery' ? 'Vendor' : oFail_('BADINPUT|material source'); // r28 F2",
 "  var src = x.src == null || x.src === '' || x.src === 'Own' ? '' : x.src === 'Vendor' && (k === 'Delivery' || k === 'Return') ? 'Vendor' : oFail_('BADINPUT|material source'); // r28 F2; r34 F5-b: a vendor Return (no stock moves)"),
("  if (src) { // r28 F2: vendor rental straight to site: not our stock (no StockMoves); the vendor is on the challan + PDF for the rent owed\n    if (locType(db, LOC.SUPPLIER) !== 'Supplier') oFail_('BADINPUT|vendor');\n    o.FromLoc = LOC.SUPPLIER; o.ToLoc = sl;",
 "  if (src && k === 'Return') { // r34 F5-b: vendor items back from site to their vendor: no StockMoves, the vendor's own DO / ref optional\n"
 "    if (locType(db, LOC.SUPPLIER) !== 'Supplier') oFail_('BADINPUT|vendor');\n"
 "    var rv = typeof x.sup === 'string' && x.sup && db.hasTab('Suppliers') ? find(db.rows('Suppliers'), 'SupID', x.sup) : null; if (!rv || blank(rv.SupID)) oFail_('BADINPUT|vendor');\n"
 "    o.FromLoc = sl; o.ToLoc = LOC.SUPPLIER; o.MatSource = 'Vendor'; o.SupID = String(rv.SupID); o.SupplierRef = oCell_(oQeTxt_(x.sref, 40, 'vendor\\'s DO no.'));\n"
 "  }\n"
 "  else if (src) { // r28 F2: vendor rental straight to site: not our stock (no StockMoves); the vendor is on the challan + PDF for the rent owed\n    if (locType(db, LOC.SUPPLIER) !== 'Supplier') oFail_('BADINPUT|vendor');\n    o.FromLoc = LOC.SUPPLIER; o.ToLoc = sl;"),
("  else if (k === 'Delivery') { if (x.from === LOC.SUPPLIER && locType(db, LOC.SUPPLIER) === 'Supplier') { o.FromLoc = LOC.SUPPLIER; supNeed = true; } else o.FromLoc = pick(x.from, ['Yard'], 'from'); o.ToLoc = sl; }",
 "  else if (k === 'Delivery') { o.FromLoc = pick(x.from, ['Yard'], 'from'); o.ToLoc = sl; } // r34 F5-b: no 'direct from a rental supplier' (that is Material source: Vendor rental)"),
# save: new kinds only
("      var a = oAcc_(L), k = oChKind_(x.kind); if (!oChCan_(a, k)) oFail_('NOACCESS');\n      oChSetup_(env, db);\n      var old = null;",
 "      var a = oAcc_(L), k = oChKind_(x.kind); if (!oChCan_(a, k)) oFail_('NOACCESS');\n      if (OCH_NEW_.indexOf(k) < 0) oFail_('BADINPUT|kind'); // r34 F5-b\n      oChSetup_(env, db);\n      var old = null;"),
# post: an old Hire-in / Off-hire draft is not posted
("    var IT = oChItems_(db), skip = oChLines_(db, no)",
 "    if (OCH_NEW_.indexOf(k) < 0) oFail_('NOTPOSTED|' + k + ' is no longer used: vendor items never enter our stock. Discard this draft.'); // r34 F5-b\n    var IT = oChItems_(db), skip = oChLines_(db, no)"),
])
print('Office.gs ok')
