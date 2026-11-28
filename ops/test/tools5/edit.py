import sys; p=sys.argv[1]; s=open(p,encoding='utf-8').read()
old="""// Whole-row write (one call per row on the sheet); calculated columns get their formula again.
function uiPutRow_(db, t, o, patch) {"""
new="""// Whole-row write (one call per row on the sheet); calculated columns get their formula again.
// The row is rewritten from the cache, where Sheets has already dropped the text mark ', so text starting with = + - @ gets it back.
function uiCell_(v) { v = cellVal_(v); return typeof v === 'string' && /^[=+\\-@]/.test(v) ? "'" + v : v; }
function uiPutRow_(db, t, o, patch) {"""
o2="calc[k] ? resolveF(db, t, calc[k], o._r) : cellVal_(o[k]); })]);\n}\nfunction uiDelRows_"
n2="calc[k] ? resolveF(db, t, calc[k], o._r) : uiCell_(o[k]); })]);\n}\nfunction uiDelRows_"
assert s.count(old)==1 and s.count(o2)==1
open(p,'w',encoding='utf-8').write(s.replace(old,new).replace(o2,n2))
