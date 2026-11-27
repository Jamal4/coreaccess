import sys
d=sys.argv[1]
def patch(f,pairs):
    p=d+'/'+f; s=open(p,encoding='utf-8').read()
    for a,b in pairs:
        c=s.count(a); assert c==1,(f,a[:80],c); s=s.replace(a,b)
    open(p,'w',encoding='utf-8').write(s)
patch('CAE_Ops_Office.gs',[
# CR minor: the shadow keeps what the sheet would store
("  OW4gShadow_.prototype.insert = function (t, objs) { if (t === 'Log' && !this.nt.Log) return objs; this.rows(t); return MemDb.prototype.insert.call(this, t, objs); };",
 "  OW4gShadow_.prototype.update = function (t, o, patch) { var h = this.headers(t); Object.keys(patch).forEach(function (k) { if (h.indexOf(k) < 0) throw new Error(t + ': no column ' + k); o[k] = oW4gStore_(patch[k]); }); }; // CR: the value the sheet keeps\n"
 "  OW4gShadow_.prototype.insert = function (t, objs) { if (t === 'Log' && !this.nt.Log) return objs; this.rows(t); var r = MemDb.prototype.insert.call(this, t, objs), h = this.headers(t); (Array.isArray(objs) ? objs : [objs]).forEach(function (o) { h.forEach(function (k) { o[k] = oW4gStore_(o[k]); }); }); return r; };"),
("function oW4gEq_(a, b) { // a = the shadow's value, b = the sheet's (the sheet keeps a leading ' as text, not as a character)\n  if (a == null) a = ''; if (b == null) b = '';\n  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();\n  if (typeof a === 'string' && typeof b === 'string') return a === b || (a.charAt(0) === \"'\" && a.slice(1) === b);\n  return a === b;\n}",
 "// what the sheet keeps for a written value: the write adds a leading ' (cellVal_ / oCell_) that the sheet takes as \"this is text\" and drops\nfunction oW4gStore_(v) { v = cellVal_(v); return typeof v === 'string' && v.charAt(0) === \"'\" ? v.slice(1) : v; }\nfunction oW4gEq_(a, b) { // a = what the save would store (oW4gStore_), b = the sheet's value now; strict (another type = a change)\n  if (a == null) a = ''; if (b == null) b = '';\n  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();\n  return a === b;\n}"),
])
print('ok')
