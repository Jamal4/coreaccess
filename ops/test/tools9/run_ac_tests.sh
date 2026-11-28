#!/bin/bash
# M3 tests (+ M2) live OUTSIDE production: inject W4g + M1 + M2 blocks into a temp copy of Office.gs, then run the harness.
# usage: tools7/run_m2_tests.sh <dir with the 16 sources> [expr] [tail] [head]   (run from the harness root)
set -e; T=$(mktemp -d ${TMPDIR:-/tmp}/m3t.XXXX); cp "${1:-..}"/*.gs "${1:-..}"/*.html "$T"/
python3 - "$T/CAE_Ops_Office.gs" tools3/w4g_selftests_block.js tools6/m1_block.js tools7/m2_block.js tools7/m2_full.js tools7/m2_cr4.js tools8/m3_block.js tools8/m3_cr2.js tools8/m3_cr3_r15.js tools8/m3_cr4.js tools8/m3_cr5.js tools8/m3_cr6_r15.js tools8/m3_cr7.js tools8/m3_cr8.js tools8/m3_cr9.js tools8/m3_cr10.js tools8/m3_cr11_r15.js tools8/m3_cr12_r17.js tools8/m3_cr13_r15.js tools8/m3_cr14_r15.js tools8/m3_cr15.js tools8/m3_cr16.js tools8/m3_cr17.js tools8/m3_cr17b.js tools8/ch_old_on.js tools8/ch_block.js tools8/ch_c5.js tools8/ch_e3.js tools8/ch_e3b.js tools8/ch_e3c.js tools8/ch_e3d.js tools8/ch_e3e.js tools8/ch_f.js tools8/ch_f3.js tools8/ch_old_off.js tools8/ch_f5.js tools9/ac_block.js <<'PY'
import sys; p=sys.argv[1]; s=open(p,encoding='utf-8').read(); k="      } finally { QF5_STUB_ = keepQ5; }"
assert s.count(k)==1; b=''.join(open(f,encoding='utf-8').read() for f in sys.argv[2:]); open(p,'w',encoding='utf-8').write(s.replace(k, b+k))
PY
python3 - "$T/CAE_Ops_Office.gs" <<'PY2'
import sys; p=sys.argv[1]; s=open(p,encoding='utf-8').read(); k="          var F7 = mk4(); OW4D_ON_ = false;"
assert s.count(k)==1
t="          var k9 = OW4D_TABS_; OW4D_TABS_ = ['Items', 'Customers']; var a9 = use(mk4(), true), c9 = use(mk4(), true), b9 = use(mk4(), false); a9.w4dX_ = ['Quotes']; var r9 = JSON.stringify(a9.rows('Quotes')) === JSON.stringify(b9.rows('Quotes')); c9.rows('Quotes'); OW4D_TABS_ = k9;\n          eq('O354b r35b a SheetDb with its own extra tabs reads them in the one batch (same rows as a tab read); without them not', [!!(a9.pl_ && a9.pl_.v.Quotes), r9, !!(c9.pl_ && c9.pl_.v.Quotes)].join('|'), 'true|true|false');\n"

open(p,'w',encoding='utf-8').write(s.replace(k,t+k))
PY2
node h/h/run.js "$T" "${2:-selfTestSummary_()}" | tail -${3:-2} | head -${4:-1}; rm -rf "$T"
