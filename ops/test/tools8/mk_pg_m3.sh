#!/bin/bash
# builds h/pg/pg_m3.js = page setup of tools7/pg_m2s_full.js (up to "let pass") + tools8/pg_m3_body.js; run: node h/pg/pg_m3.js <dir>
python3 - <<'PY'
s=open('tools7/pg_m2s_full.js',encoding='utf-8').read(); i=s.index('let pass = 0'); open('h/pg/pg_m3.js','w',encoding='utf-8').write(s[:i]+open('tools8/pg_m3_body.js',encoding='utf-8').read())
PY
