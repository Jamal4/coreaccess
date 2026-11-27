#!/bin/bash
# W4g tests live OUTSIDE production: inject the saved block into a temp copy of Office.gs, then run the harness.
# usage: tools3/run_w4g_tests.sh <dir with the 16 sources>   (run from the harness root)
set -e; T=$(mktemp -d /tmp/w4gt.XXXX); cp "${1:-..}"/*.gs "${1:-..}"/*.html "$T"/
python3 - "$T/CAE_Ops_Office.gs" tools3/w4g_selftests_block.js <<'PY'
import sys; p,b=sys.argv[1],sys.argv[2]; s=open(p,encoding='utf-8').read(); k="      } finally { QF5_STUB_ = keepQ5; }"
assert s.count(k)==1; open(p,'w',encoding='utf-8').write(s.replace(k, open(b,encoding='utf-8').read()+k))
PY
node h/h/run.js "$T" | tail -2 | head -1; rm -rf "$T"
