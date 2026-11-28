#!/usr/bin/env python3
# r34 (F5) part 2: the outside rule is the office's (postChallan(db, no, {outside: true})); sheet panel + field app keep the strict check
import sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '..'
def ed(f, pairs):
    p = os.path.join(D, f); s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        n = s.count(a); assert n == 1, (f, n, a[:90]); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
ed('CAE_Ops_Sets.gs', [
("// r34 F5: Delivery / Sale / Return post what our stock has",
 "// r34 F5 (office post, o.outside): Delivery / Sale / Return post what our stock has"),
("    if (left > 1e-9) { if (CH_CAP_.indexOf(kind) >= 0) { if (outs && m[5] >= 0) outs[m[5]] = (outs[m[5]] || 0) + left; } else if (kind === 'Transfer') out.push(",
 "    if (left > 1e-9) { if (outs && CH_CAP_.indexOf(kind) >= 0) { if (m[5] >= 0) outs[m[5]] = (outs[m[5]] || 0) + left; } else if (kind === 'Return' || kind === 'Transfer' || kind === 'Delivery') out.push("),
(", ret = kind === 'Return', cap = CH_CAP_.indexOf(kind) >= 0,", ", ret = kind === 'Return',"),
("  var fromSupplier = locType(db, c.FromLoc) === 'Supplier', tag",
 "  var fromSupplier = locType(db, c.FromLoc) === 'Supplier', cap = !!o.outside && CH_CAP_.indexOf(kind) >= 0 && !fromSupplier, tag"),
("  var outs = {}; if ((oc || (cap && !fromSupplier)) && !errs.length) mv = chSplit_(db, c, kind, sup, mv, jn, errs, outs);",
 "  var outs = {}; if ((oc || cap) && !errs.length) mv = chSplit_(db, c, kind, sup, mv, jn, errs, cap ? outs : null);"),
])
ed('CAE_Ops_Office.gs', [
("    try { postChallan(db, no); }\n    catch (e) {\n      if (oChCode_(e)) throw e;",
 "    try { postChallan(db, no, { outside: true }); } // r34 F5-c: qty above our stock = from outside (no moves)\n    catch (e) {\n      if (oChCode_(e)) throw e;"),
])
ed('CAE_Ops_Office.gs', [("  else if (k === 'Delivery') { o.FromLoc = pick(x.from, ['Yard'], 'from'); o.ToLoc = sl; } // r34 F5-b: no 'direct from a rental supplier' (that is Material source: Vendor rental)",
 "  else if (k === 'Delivery') { if (OCH_NEW_.indexOf('Hire-in') >= 0 && x.from === LOC.SUPPLIER && locType(db, LOC.SUPPLIER) === 'Supplier') { o.FromLoc = LOC.SUPPLIER; supNeed = true; } else o.FromLoc = pick(x.from, ['Yard'], 'from'); o.ToLoc = sl; } // r34 F5-b: 'direct from a rental supplier' only in the old rent-in mode (OCH_NEW_ with Hire-in); now Material source: Vendor rental")])
ed('CAE_Ops_Office.gs', [("var OCH_NEW_ = ['Delivery', 'Sale', 'Return', 'Transfer'];", "var OCH_NEW_ = ['Delivery', 'Sale', 'Return', 'Transfer'], OCH_OUT_ = true;"), ('// r34 F5: Hire-in / Off-hire are no longer made (vendor items never enter our stock); old ones stay readable / cancellable', '// r34 F5: Hire-in / Off-hire are no longer made (vendor items never enter our stock); old ones stay readable / cancellable. OCH_OUT_: an office Post takes what our stock has, the rest is from outside'), ('    try { postChallan(db, no, { outside: true }); }', '    try { postChallan(db, no, { outside: OCH_OUT_ }); }')])
print('p34b ok')
