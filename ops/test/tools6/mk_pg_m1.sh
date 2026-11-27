#!/bin/bash
# builds h/pg/pg_m1.js = setup of pg_w4g.js (up to its async body) + tools6/pg_m1_body.js; run: node h/pg/pg_m1.js <dir>
python3 - <<'PY'
s=open('h/pg/pg_w4g.js',encoding='utf-8').read(); i=s.index('(async () => {'); open('h/pg/pg_m1.js','w',encoding='utf-8').write(s[:i]+open('tools6/pg_m1_body.js',encoding='utf-8').read())
PY
