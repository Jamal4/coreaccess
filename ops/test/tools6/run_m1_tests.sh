#!/bin/bash
# M1 tests live OUTSIDE production: inject W4g + M1 blocks into a temp copy of Office.gs, then run the harness.
# usage: tools6/run_m1_tests.sh <dir with the 16 sources>   (run from the harness root)
set -e; T=$(mktemp -d /tmp/m1t.XXXX); cp "${1:-..}"/*.gs "${1:-..}"/*.html "$T"/
python3 - "$T/CAE_Ops_Office.gs" tools3/w4g_selftests_block.js tools6/m1_block.js <<'PY'
import sys; p=sys.argv[1]; s=open(p,encoding='utf-8').read(); k="      } finally { QF5_STUB_ = keepQ5; }"
assert s.count(k)==1; b=''.join(open(f,encoding='utf-8').read() for f in sys.argv[2:]); open(p,'w',encoding='utf-8').write(s.replace(k, b+k))
PY
node h/h/run.js "$T" "${2:-selfTestSummary_()}" | tail -${3:-2} | head -${4:-1}; rm -rf "$T"
