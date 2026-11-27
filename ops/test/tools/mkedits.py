# usage: mkedits.py old new out.js [extra_tail_len]  -> top-level-await JS for the Apps Script Monaco editor
import sys, json, hashlib, difflib
old = open(sys.argv[1], encoding='utf-8').read(); new = open(sys.argv[2], encoding='utf-8').read()
a = old.splitlines(keepends=True); b = new.splitlines(keepends=True)
off = [0]
U = lambda z: len(z.encode('utf-16-le')) // 2
for l in a: off.append(off[-1] + U(l))
ed = []
for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
    if op != 'equal': ed.append([off[i1], off[i2], ''.join(b[j1:j2])])
# check
t = old.encode('utf-16-le')
for s, e, x in sorted(ed, key=lambda z: -z[0]): t = t[:2*s] + x.encode('utf-16-le') + t[2*e:]
assert t.decode('utf-16-le') == new
h = lambda s: hashlib.sha256(s.encode('utf-8')).hexdigest()
tail = int(sys.argv[4]) if len(sys.argv) > 4 else 0
js = """const E=%s, OLDP=%s, NEWH=%s, PLEN=%d, TAIL=%d;
const H=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
let m=null;for(const x of monaco.editor.getModels()){const v=x.getValue();if(v.length===PLEN+TAIL&&await H(v.slice(0,PLEN))===OLDP){m=x;break;}}
if(!m)return 'no model';
const ops=E.slice().sort((p,q)=>q[0]-p[0]).map(e=>({range:monaco.Range.fromPositions(m.getPositionAt(e[0]),m.getPositionAt(e[1])),text:e[2]}));
if(TAIL)ops.unshift({range:monaco.Range.fromPositions(m.getPositionAt(PLEN),m.getPositionAt(PLEN+TAIL)),text:''});
m.pushEditOperations([],ops,()=>null);const v=m.getValue();return v.length+' '+((await H(v))===NEWH?'OK':'BAD');""" % (json.dumps(ed, ensure_ascii=False), json.dumps(h(old)), json.dumps(h(new)), U(old), tail)
open(sys.argv[3], 'w', encoding='utf-8').write(js)
print(len(ed), 'edits', len(js), 'chars js', h(old)[:8], '->', h(new)[:8], U(new))
