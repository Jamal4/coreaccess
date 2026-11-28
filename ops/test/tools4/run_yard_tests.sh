#!/bin/bash
# Yard-signature tests live OUTSIDE production: inject into a temp copy of CAE_Ops_QuoteApp.gs, then run the harness.
# usage: tools4/run_yard_tests.sh <dir with the 16 sources>   (run from the harness root)
set -e; T=$(mktemp -d /tmp/ydt.XXXX); cp "${1:-..}"/*.gs "${1:-..}"/*.html "$T"/
python3 - "$T/CAE_Ops_QuoteApp.gs" tools4/yard_block.js <<'PY'
import sys; p,b=sys.argv[1],sys.argv[2]; s=open(p,encoding='utf-8').read(); k="  } finally { QF3_STUB_ = null; QF5_STUB_ = null; }"
assert s.count(k)==1; open(p,'w',encoding='utf-8').write(s.replace(k, open(b,encoding='utf-8').read()+k))
PY
node h/h/run.js "$T" | grep -E "FAIL|✗|passed" | head -20; rm -rf "$T"
