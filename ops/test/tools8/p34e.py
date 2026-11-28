#!/usr/bin/env python3
# r34 (F5) part 5, step R: a Return on any path (sheet panel / field app too) brings back only what is ours on that site; vendor-out map in one pass
import sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '..'
def ed(f, pairs):
    p = os.path.join(D, f); s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        n = s.count(a); assert n == 1, (f, n, a[:90]); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
ed('CAE_Ops_Sets.gs', [
("cap = !!o.outside && CH_CAP_.indexOf(kind) >= 0 && !fromSupplier, tag",
 "cap = (kind === 'Return' || (!!o.outside && CH_CAP_.indexOf(kind) >= 0)) && !fromSupplier, tag"),
("// no StockMoves, kept on the line as ChallanLines.QtyOut (loose items) so hire and billing still count the full qty.\n",
 "// no StockMoves, kept on the line as ChallanLines.QtyOut (loose items) so hire and billing still count the full qty. A Return does so on every path\n// (sheet panel, field app): outside items never come into our yard.\n"),
("function chVendorOut_(db, jn, sup, except) { // r34 F5: item -> qty of that vendor's items still out on the job (posted vendor deliveries - vendor returns)\n"
 "  var cs = {}, m = {}; db.rows('Challans').forEach(function (c) { if (String(c.JobNo) === String(jn) && String(c.SupID) === String(sup) && c.Status === 'Posted' && String(c.MatSource || '') === 'Vendor' && String(c.ChallanNo) !== String(except || '') && (c.Kind === 'Delivery' || c.Kind === 'Return')) cs[c.ChallanNo] = c.Kind === 'Delivery' ? 1 : -1; });\n"
 "  db.rows('ChallanLines').forEach(function (l) { var s = cs[l.ChallanNo]; if (s) m[l.ItemCode] = r2((m[l.ItemCode] || 0) + s * num(l.Qty)); });\n"
 "  return m;\n}\n",
 "function chVendorOut_(db, jn, sup, except) { // r34 F5: item -> qty of that vendor's items still out on the job (posted vendor deliveries - vendor returns)\n"
 "  return (chVendorAll_(db, except)[String(jn)] || {})[String(sup)] || {};\n}\n"
 "function chVendorAll_(db, except) { // r34 F5: job -> vendor -> item -> qty out, one pass (except: leave that challan out)\n"
 "  var cs = {}, m = {}; db.rows('Challans').forEach(function (c) { if (c.Status === 'Posted' && String(c.MatSource || '') === 'Vendor' && !blank(c.JobNo) && !blank(c.SupID) && String(c.ChallanNo) !== String(except || '') && (c.Kind === 'Delivery' || c.Kind === 'Return')) cs[c.ChallanNo] = [String(c.JobNo), String(c.SupID), c.Kind === 'Delivery' ? 1 : -1]; });\n"
 "  db.rows('ChallanLines').forEach(function (l) { var x = cs[l.ChallanNo]; if (!x) return; var j = m[x[0]] = m[x[0]] || {}, s = j[x[1]] = j[x[1]] || {}; s[l.ItemCode] = r2((s[l.ItemCode] || 0) + x[2] * num(l.Qty)); });\n"
 "  return m;\n}\n"),
])
ed('CAE_Ops_Office.gs', [
("  var vout = {}; Object.keys(X.jobs).forEach(function (n) { if (String(X.jobs[n].Status) === 'Closed') return; var by = {}; // r34 F5-b: vendor items still out per job (vendor returns)\n"
 "    db.rows('Challans').forEach(function (c) { if (String(c.JobNo) === n && c.Status === 'Posted' && String(c.MatSource || '') === 'Vendor' && !blank(c.SupID)) by[String(c.SupID)] = 1; });\n"
 "    Object.keys(by).forEach(function (s) { var m = chVendorOut_(db, n, s), o = {}; Object.keys(m).forEach(function (k) { if (m[k] > 1e-9) o[k] = m[k]; }); if (Object.keys(o).length) (vout[n] = vout[n] || {})[s] = o; }); });",
 "  var vout = {}, VA = chVendorAll_(db); Object.keys(VA).forEach(function (n) { if (!X.jobs[n] || String(X.jobs[n].Status) === 'Closed') return; // r34 F5-b: vendor items still out per open job (vendor returns)\n"
 "    Object.keys(VA[n]).forEach(function (s) { var m = VA[n][s], o = {}; Object.keys(m).forEach(function (k) { if (m[k] > 1e-9) o[k] = m[k]; }); if (Object.keys(o).length) (vout[n] = vout[n] || {})[s] = o; }); });"),
])
print('p34e ok')
