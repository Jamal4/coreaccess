// uiPutRow_ text-mark tests (harness only). usage: node tools5/test_putrow.js <src dir>
const { ctx } = require('../h/h/run.js'); const vm = require('vm');
let pass = 0, fail = 0; const eq = (n, a, b) => { const ok = JSON.stringify(a) === JSON.stringify(b); ok ? pass++ : fail++; if (!ok) console.log('FAIL', n, JSON.stringify(a), '≠', JSON.stringify(b)); };
vm.runInContext('CALC.ZT = { Amt: "={Qty}*2" };', ctx);
const H = ['ID', 'Qty', 'Amt', 'Note', 'A', 'B', 'C', 'D', 'Phone', 'N', 'Dt'];
const isF = v => typeof v === 'string' && /^[=+\-@]/.test(v) && !/^[+\-]?\d+(\.\d+)?$/.test(v);  // Sheets would parse as formula
const read = v => typeof v === 'string' && v[0] === "'" ? v.slice(1) : (isF(v) ? '#FORMULA' : v);               // what getValues gives back
function mk(row) { const w = []; const db = { ss: {}, headers: () => H, sheet: () => ({ getRange: (r, c, nr, nc) => ({ setValues: v => { w.push(v[0]); } }) }), update: () => { throw new Error('no'); } }; return { db, w }; }
const dt = new Date(2026, 10, 20);
const base = () => ({ _r: 5, ID: 'X1', Qty: 3, Amt: 6, Note: 'plain', A: '=HYPERLINK("x")', B: '+abc', C: '-foo', D: '@bob', Phone: '+8801711', N: -5, Dt: dt });
let { db, w } = mk(); let o = base(); ctx.uiPutRow_(db, 'ZT', o, { Note: 'hi' }); const r = w[0];
eq('P1 cached = + - @ text gets the mark', [r[4], r[5], r[6], r[7]], ["'=HYPERLINK(\"x\")", "'+abc", "'-foo", "'@bob"]);
eq('P2 phone marked once', r[8], "'+8801711");
eq('P3 plain / numbers / date / calc unchanged', [r[0], r[1], r[3], r[9], r[10] === dt, r[2]], ['X1', 3, 'hi', -5, true, '=B5*2']);
eq('P4 no written cell parses as formula except calc', r.filter((v, j) => j !== 2 && isF(v)).length, 0);
({ db, w } = mk()); o = base(); ctx.uiPutRow_(db, 'ZT', o, { Note: "'=x" });
eq('P5 already-marked patch value not marked twice', w[0][3], "'=x");
({ db, w } = mk()); o = base(); ctx.uiPutRow_(db, 'ZT', o, { Note: '=1+1' });
eq('P6 patch value = … gets the mark', w[0][3], "'=1+1"); eq('P7 cache keeps patch value', o.Note, '=1+1');
// round trip: sheet → cache → rewrite twice: text stays identical
({ db, w } = mk()); o = base(); ctx.uiPutRow_(db, 'ZT', o, { Note: 'a' });
const o2 = { _r: 5 }; H.forEach((k, j) => { o2[k] = read(w[0][j]); }); ctx.uiPutRow_(db, 'ZT', o2, { Qty: 4 });
eq('P8 round trip keeps the text', [read(w[1][4]), read(w[1][5]), read(w[1][6]), read(w[1][7]), read(w[1][8]), w[1][1]], ['=HYPERLINK("x")', '+abc', '-foo', '@bob', '+8801711', 4]);
eq('P9 null / undefined → empty', (() => { const m = mk(); const x = { _r: 2, ID: null }; ctx.uiPutRow_(m.db, 'ZT', x, { Note: undefined }); return [m.w[0][0], m.w[0][3], m.w[0][4]]; })(), ['', '', '']);
let thrown = ''; try { ({ db, w } = mk()); ctx.uiPutRow_(db, 'ZT', base(), { Zz: 1 }); } catch (e) { thrown = e.message; } eq('P10 unknown column still throws, nothing written', [thrown, w.length], ['ZT: no column Zz', 0]);
const mem = { ss: null, u: [], update(t, o, p) { this.u.push([t, p]); } }; ctx.uiPutRow_(mem, 'ZT', { _r: 2 }, { Note: '=x' });
eq('P11 memory db path unchanged', mem.u, [['ZT', { Note: '=x' }]]);
console.log('putrow', pass, 'passed,', fail, 'failed');
