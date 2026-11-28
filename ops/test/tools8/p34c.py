#!/usr/bin/env python3
# r34 (F5) part 3: PDF of a vendor Return (From = site, To = the vendor; related = that vendor's deliveries)
import sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '..'
def ed(f, pairs):
    p = os.path.join(D, f); s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        n = s.count(a); assert n == 1, (f, n, a[:90]); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
ed('CAE_Ops_PDF.gs', [
("x.Kind === 'Delivery' && x.Status === 'Posted' && String(x.MatSource || '') !== 'Vendor'; }).map(",
 "x.Kind === 'Delivery' && x.Status === 'Posted' && (vend ? String(x.MatSource || '') === 'Vendor' && String(x.SupID) === String(c.SupID) : String(x.MatSource || '') !== 'Vendor'); }).map("),
("['From', vend ? 'Vendor rental · '", "['From', vend && !ret ? 'Vendor rental · '"),
("ret ? ['To', loc(c.ToLoc), 'Related challan', rel]",
 "ret ? ['To', vend ? 'Vendor rental · ' + dash(vn.Name) + (blank(c.SupplierRef) ? '' : ' (DO ' + c.SupplierRef + ')') + ' · collected from site' : loc(c.ToLoc), 'Related challan', rel]"),
])
print('p34c ok')
