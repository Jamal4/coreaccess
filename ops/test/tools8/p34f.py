#!/usr/bin/env python3
# r34 (F5) part 6, step R: an old Hire-in / Off-hire draft offers no Edit / Post (both refused); Discard stays
import sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '..'
p = os.path.join(D, 'CAE_Ops_Office.gs'); s = open(p, encoding='utf-8').read()
a = "  o.canEdit = can && !o.unfin && !o.sheet; o.canPost = can;"
b = "  var nk = OCH_NEW_.indexOf(k) >= 0; o.canEdit = can && nk && !o.unfin && !o.sheet; o.canPost = can && (nk || o.unfin); /* r34 F5-b: an old Hire-in / Off-hire draft: Discard only */"
assert s.count(a) == 1; open(p, 'w', encoding='utf-8').write(s.replace(a, b)); print('p34f ok')
