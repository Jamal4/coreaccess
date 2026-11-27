#!/bin/bash
# M3 tests (+ M2) live OUTSIDE production: inject W4g + M1 + M2 blocks into a temp copy of Office.gs, then run the harness.
# usage: tools7/run_m2_tests.sh <dir with the 16 sources> [expr] [tail] [head]   (run from the harness root)
set -e; T=$(mktemp -d ${TMPDIR:-/tmp}/m3t.XXXX); cp "${1:-..}"/*.gs "${1:-..}"/*.html "$T"/
python3 - "$T/CAE_Ops_Office.gs" tools3/w4g_selftests_block.js tools6/m1_block.js tools7/m2_block.js tools7/m2_full.js tools7/m2_cr4.js tools8/m3_block.js tools8/m3_cr2.js tools8/m3_cr3_r15.js tools8/m3_cr4.js tools8/m3_cr5.js tools8/m3_cr6_r15.js tools8/m3_cr7.js tools8/m3_cr8.js tools8/m3_cr9.js tools8/m3_cr10.js tools8/m3_cr11_r15.js tools8/m3_cr12_r17.js tools8/m3_cr13_r15.js tools8/m3_cr14_r15.js tools8/m3_cr15.js tools8/m3_cr16.js tools8/m3_cr17.js tools8/m3_cr17b.js tools8/ch_block.js tools8/ch_c5.js tools8/ch_e3.js tools8/ch_e3b.js tools8/ch_e3c.js tools8/ch_e3d.js tools8/ch_e3e.js <<'PY'
import sys; p=sys.argv[1]; s=open(p,encoding='utf-8').read(); k="      } finally { QF5_STUB_ = keepQ5; }"
assert s.count(k)==1; b=''.join(open(f,encoding='utf-8').read() for f in sys.argv[2:]); open(p,'w',encoding='utf-8').write(s.replace(k, b+k))
PY
node h/h/run.js "$T" "${2:-selfTestSummary_()}" | tail -${3:-2} | head -${4:-1}; rm -rf "$T"
