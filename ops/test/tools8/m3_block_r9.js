        // ---- M3 stock (harness only) — step 3
        (function () {
          var tYH = add('ywh3@t.com', { YW: 3 }), tPS = add('ps3@t.com', { PS: 1 }), tYA = add('ywac3@t.com', { YW: 2, AC: 1 }), tHR = add('hr3@t.com', { HR: 3, QH: 3 });
          var J = JSON.stringify, rc = function () { ['ywh3@t.com', 'ps3@t.com', 'ywac3@t.com', 'yard4@t.com', 'dir4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IT = function (c) { return must(db, 'Items', 'ItemCode', c); }, nMv = function () { return db.rows('StockMoves').length; };
          var mv = function (it, q, f, t, k, ref, job, d) { db.insert('StockMoves', { MoveID: 'MV-T' + (1e5 + nMv()), MoveDate: d || new Date(2026, 10, 18), ItemCode: it, Qty: q, FromLoc: f, ToLoc: t, RefType: k || 'Challan', RefNo: ref || 'DC-T', JobNo: job || '', PostedBy: 't', PostedAt: new Date() }); };
          var row = function (t, c) { return (t.rows || []).filter(function (x) { return x.code === c; })[0]; };
          var OP = function (t, d) { rc(); return officeStockOpening(t, d); }, IS = function (t, d) { rc(); return officeItemSave(t, d); }, LS = function (t, d) { rc(); return officeLocSave(t, d); };
          var ok1 = function (o) { return Object.assign({ item: 'RL-STD-20', loc: 'LOC-YARD', qty: 1 }, o || {}); };
          var NI = function (o) { return Object.assign({ code: 'M3-NEW-1', name: 'M3 new', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 4.5, reorder: 10, status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          if (!find(db.rows('Locations'), 'LocID', 'LOC-SCRAP')) db.insert('Locations', { LocID: 'LOC-SCRAP', Name: 'Scrap', Type: 'Scrap', SiteID: '', Status: 'Active' });
          db.insert('Locations', { LocID: 'LOC-OLDBAY', Name: 'Old bay', Type: 'Repair', SiteID: '', Status: 'Inactive' });
          db.update('Items', IT('RL-STD-20'), { Category: 'Ringlock', Size: '2.0 m', ReorderLevel: '' });
          var API = ['officeStockList', 'officeStockItem', 'officeItemSave', 'officeStockOpening', 'officeLocList', 'officeLocSave'];
          eq('M3-1 the 6 M3 calls are on the web API list and check the session first', API.map(function (n) { return OFFICE_WEB_API_.indexOf(n) >= 0 && /^function \w+\(token[^)]*\) \{\s*(var L = )?officeGate_\(token/.test(String(this[n] && this[n].officeRaw_ || this[n])); }, this).join(','), 'true,true,true,true,true,true');
          eq('M3-2 no session -> NOSESSION, HR / QH only -> NOACCESS on all 6', API.map(function (n) { var f = this[n]; return err(function () { f('nope', 'RL-STD-20'); }) + '/' + err(function () { f(tHR, 'RL-STD-20'); }); }, this).join(','), API.map(function () { return 'NOSESSION/NOACCESS'; }).join(','));
          var n0 = nMv(), lg0 = db.rows('Log').length;
          eq('M3-3 PS View / SC View / YW Staff cannot post opening stock or add locations; nothing written', [err(function () { OP(tPS, { date: '2026-11-19', rows: [ok1()] }); }), err(function () { OP(tV, { date: '2026-11-19', rows: [ok1()] }); }), err(function () { OP(tY, { date: '2026-11-19', rows: [ok1()] }); }),
            err(function () { LS(tY, { code: 'YR-9', name: 'x', type: 'Yard' }); }), err(function () { LS(tA, { code: 'YR-9', name: 'x', type: 'Yard' }); }), err(function () { IS(tPS, NI()); }), err(function () { IS(tV, NI()); }), err(function () { IS(tA, NI()); }), nMv() - n0, db.rows('Log').length - lg0].join('|'),
            'NOACCESS|NOACCESS|NOACCESS|NOACCESS|NOACCESS|NOACCESS|NOACCESS|NOACCESS|0|0');
          var LP = officeStockList(tPS), LV = officeStockList(tV), LY = officeStockList(tY), LH = officeStockList(tYH), LD = officeStockList(tD), LA = officeStockList(tYA);
          eq('M3-4 list flags: PS (view) / SC View (money) / YW Staff (edit) / YW Head (opening) / Director (prices) / YW + AC (money, no prices); locs only for heads', [LP, LV, LY, LH, LD, LA].map(function (L) { return [L.can, L.head, L.money, L.price, 'locs' in L].map(Number).join(''); }).join(','), '00000,00100,10000,11001,11111,10100');
          eq('M3-5 money only for money logins: no cost key for PS / YW, a number for SC / AC', ['cost' in row(LP, 'RL-STD-20'), 'cost' in row(LY, 'RL-STD-20'), row(LV, 'RL-STD-20').cost, row(LA, 'RL-STD-20').cost].join('|'), 'false|false|3000|3000');
          var GY = officeStockItem(tY, 'RL-STD-20'), GV = officeStockItem(tV, 'RL-STD-20');
          eq('M3-6 item: prices hidden for YW, shown for SC View', [['hire', 'sale', 'repl', 'repair', 'avg'].some(function (k) { return k in GY; }), GV.hire, GV.repl, GV.repair, GY.can, GV.can, GY.money, GV.money].join('|'), 'false|90|3000|300|true|false|false|true');
          eq('M3-7 stock items in the list; services only as catalogue rows (cata: "All items", not counted - CR run 3); no stock = zeros', [!!row(LY, 'RL-STD-20'), !!row(LY, 'RL-STD-20').cata, !!row(LY, 'SV-TRANS'), row(LY, 'SV-TRANS').cata, J([row(LY, 'BD-ST-207').yard, row(LY, 'BD-ST-207').own, row(LY, 'BD-ST-207').low])].join('|'), 'true|false|true|true|[0,0,false]');
          // ---- opening stock
          var nb = nMv(), ob = function (o, r) { return err(function () { OP(tYH, Object.assign({ date: '2026-11-19', rows: r || [ok1()] }, o)); }); };
          db.update('Items', IT('TC-TUBE-3'), { Status: 'Inactive' });
          eq('M3-8 opening refused: date, lines, item, location, qty; nothing written', [ob({ date: '' }), ob({ date: '19-11-2026' }), ob({ date: '2026-11-21' }), ob({ date: '2019-12-31' }), ob({}, []), ob({ rows: 'x' }),
            ob({}, Array.apply(null, Array(201)).map(function (x, i) { return ok1({ qty: i + 1 }); })), ob({}, [ok1({ item: 'NOPE-1' })]), ob({}, [ok1({ item: 'SV-TRANS' })]), ob({}, [ok1({ item: 'TC-TUBE-3' })]), ob({}, [ok1({ item: 5 })]), ob({}, ['x']),
            ob({}, [ok1({ loc: 'LOC-S0001' })]), ob({}, [ok1({ loc: 'LOC-LOST' })]), ob({}, [ok1({ loc: 'LOC-NONE' })]), ob({}, [ok1({ loc: 'LOC-OLDBAY' })]), ob({}, [ok1({ loc: null })]),
            ob({}, [ok1({ qty: 0 })]), ob({}, [ok1({ qty: 1.5 })]), ob({}, [ok1({ qty: '5' })]), ob({}, [ok1({ qty: 1e6 + 1 })]), ob({}, [ok1({ qty: -3 })]), nMv() - nb].join('|'),
            'BADINPUT|count date|BADINPUT|count date|BADINPUT|count date|BADINPUT|count date|BADINPUT|lines|BADINPUT|lines|BADINPUT|lines|BADINPUT|line 1 item|BADINPUT|line 1 item|BADINPUT|line 1 item|BADINPUT|line 1 item|BADINPUT|line 1 item|' +
            'BADINPUT|line 1 location|BADINPUT|line 1 location|BADINPUT|line 1 location|BADINPUT|line 1 location|BADINPUT|line 1 location|BADINPUT|line 1 qty|BADINPUT|line 1 qty|BADINPUT|line 1 qty|BADINPUT|line 1 qty|BADINPUT|line 1 qty|0');
          db.update('Items', IT('TC-TUBE-3'), { Status: 'Active' });
          eq('M3-9 a bad line 2 / the same item + location twice refuses the whole post', [ob({}, [ok1({ qty: 100 }), ok1({ loc: 'LOC-REPAIR', qty: 0 })]), ob({}, [ok1({ qty: 100 }), ok1({ qty: 3 })]), nMv() - nb].join('|'), 'BADINPUT|line 2 qty|BADINPUT|line 2 (twice)|0');
          var P1 = OP(tYH, { date: '2026-11-19', rows: [ok1({ qty: 100 }), ok1({ loc: 'LOC-REPAIR', qty: 5 }), ok1({ item: 'BD-ST-207', qty: 10 })] }), om = db.rows('StockMoves').slice(nb);
          eq('M3-10 opening posted: 3 moves Supplier -> loc, RefType Opening, date, by the office login, logged', [P1.n, om.length, om.map(function (m) { return [m.ItemCode, m.FromLoc, m.ToLoc, m.Qty, m.RefType, oDay_(m.MoveDate), m.PostedBy].join(' '); }).join(';'), db.rows('Log').filter(function (r) { return r.Action === 'Opening stock'; }).slice(-1)[0].User].join('|'),
            '3|3|RL-STD-20 LOC-SUPPLIER LOC-YARD 100 Opening 2026-11-19 office:ywh3@t.com;RL-STD-20 LOC-SUPPLIER LOC-REPAIR 5 Opening 2026-11-19 office:ywh3@t.com;BD-ST-207 LOC-SUPPLIER LOC-YARD 10 Opening 2026-11-19 office:ywh3@t.com|office:ywh3@t.com');
          var nb2 = nMv();
          eq('M3-11 once per item + location: again -> EXISTS (also mixed with a new line), Director too; nothing written', [ob({}, [ok1({ qty: 7 })]), ob({}, [ok1({ item: 'TC-TUBE-3', qty: 2 }), ok1({ loc: 'LOC-REPAIR', qty: 1 })]), err(function () { OP(tD, { date: '2026-11-19', rows: [ok1()] }); }), nMv() - nb2].join('|'), 'EXISTS|RL-STD-20|LOC-YARD|EXISTS|RL-STD-20|LOC-REPAIR|EXISTS|RL-STD-20|LOC-YARD|0');
          var i0 = db.insert; db.insert = function (t) { if (t === 'Log') throw new Error('log down'); return i0.apply(db, arguments); };
          var PL; try { PL = OP(tYH, { date: '2026-11-19', rows: [ok1({ item: 'TC-TUBE-3', qty: 4 })] }); } finally { db.insert = i0; }
          var mb = db.insert; db.insert = function (t) { if (t === 'StockMoves') throw new Error('sheet down'); return mb.apply(db, arguments); };
          var PF; try { PF = err(function () { OP(tYH, { date: '2026-11-19', rows: [ok1({ item: 'BD-ST-207', loc: 'LOC-REPAIR', qty: 4 })] }); }); } finally { db.insert = mb; }
          eq('M3-12 Log failing after the moves: OK with warn LOG, moves in, retry EXISTS; moves failing -> error, nothing in', [J(PL), db.rows('StockMoves').filter(function (m) { return m.ItemCode === 'TC-TUBE-3' && m.RefType === 'Opening'; }).length, ob({}, [ok1({ item: 'TC-TUBE-3', qty: 4 })]), PF,
            db.rows('StockMoves').filter(function (m) { return m.ItemCode === 'BD-ST-207' && m.ToLoc === 'LOC-REPAIR'; }).length].join('|'), '{"n":1,"warn":"LOG"}|1|EXISTS|TC-TUBE-3|LOC-YARD|sheet down|0');
          // ---- groups, owned, low, where, moves
          db.insert('Jobs', { JobNo: 'CAE/J/2026/9CL', CustID: 'CUST-0001', SiteID: 'SITE-0001', Status: 'Closed' });
          var jb = db.rows('Jobs').filter(function (j) { return j.SiteID === 'SITE-0001' && j.Status !== 'Closed' && !blank(j.JobNo); }).map(function (j) { return String(j.JobNo); }).sort().join(', ');
          mv('RL-STD-20', 30, 'LOC-YARD', 'LOC-S0001', 'Challan', 'DC-1', 'J-1'); mv('RL-STD-20', 2, 'LOC-S0001', 'LOC-LOST', 'Challan', 'DC-2', 'J-1'); mv('RL-STD-20', 1, 'LOC-REPAIR', 'LOC-SCRAP', 'Challan', 'DC-3');
          mv('RL-STD-20', 3, 'LOC-YARD', 'LOC-SOLD', 'Challan', 'DC-4'); mv('RL-STD-20', 'x', 'LOC-YARD', 'LOC-S0001'); mv('RL-STD-20', NaN, 'LOC-YARD', 'LOC-S0001'); mv('RL-STD-20', Infinity, 'LOC-REPAIR', 'LOC-LOST'); mv('RL-STD-20', 4, '', 'LOC-YARD', 'Adjust', 'ADJ-1');
          var R = row(officeStockList(tY), 'RL-STD-20');
          eq('M3-13 groups: yard / sites / repair / lost + scrap; owned = yard + sites + repair; Sold, Supplier and a bad qty ignored', J([R.yard, R.site, R.rep, R.lost, R.own]), J([71, 28, 4, 3, 103]));
          db.update('Items', IT('RL-STD-20'), { ReorderLevel: 80 }); var lw1 = row(officeStockList(tY), 'RL-STD-20').low;
          db.update('Items', IT('RL-STD-20'), { ReorderLevel: 71 }); var lw2 = row(officeStockList(tY), 'RL-STD-20').low;
          db.update('Items', IT('RL-STD-20'), { ReorderLevel: 80, Status: 'Inactive' }); var lw3 = row(officeStockList(tY), 'RL-STD-20');
          db.update('Items', IT('RL-STD-20'), { ReorderLevel: 0, Status: 'Active' }); var lw4 = row(officeStockList(tY), 'RL-STD-20').low;
          eq('M3-14 low = yard below reorder level (equal is not low, inactive / 0 never low)', [lw1, lw2, lw3.low, lw3.status, lw4].join('|'), 'true|false|false|Inactive|false');
          var G = officeStockItem(tY, 'RL-STD-20');
          eq('M3-15 where: Yard, Site (open jobs + customer), Repair, Lost, Scrap; no Sold / Supplier', J(G.where.map(function (w) { return [w.code, w.type, w.qty, w.job || '', w.cust || '']; })),
            J([['LOC-YARD', 'Yard', 71, '', ''], ['LOC-S0001', 'Site', 28, jb, 'Test Client'], ['LOC-REPAIR', 'Repair', 4, '', ''], ['LOC-LOST', 'Lost', 2, '', ''], ['LOC-SCRAP', 'Scrap', 1, '', '']]));
          eq('M3-16 moves newest first (date, then id), fields; opened = locations with an opening', [G.nMoves - 2, G.moves.length - 2, G.moves.every(function (m) { return isFinite(m.q); }), G.moves[0].d, G.moves[G.moves.length - 1].k, J(G.moves.filter(function (m) { return m.ref === 'DC-2'; })[0]), J(G.opened.sort())].join('|'),
            '8|8|true|2026-11-19|Challan|{"d":"2026-11-18","f":"LOC-S0001","t":"LOC-LOST","q":2,"ref":"DC-2","k":"Challan","job":"J-1"}|["LOC-REPAIR","LOC-YARD"]');
          for (var z = 0; z < 60; z++) mv('BD-ST-207', 1, 'LOC-YARD', 'LOC-REPAIR', 'Challan', 'DC-B' + z, '', new Date(2026, 10, 1 + (z % 17)));
          var GB = officeStockItem(tPS, 'BD-ST-207');
          eq('M3-17 at most 50 moves, newest first; count of all; PS reads it', [GB.nMoves, GB.moves.length, GB.moves.every(function (m, i) { return !i || GB.moves[i - 1].d >= m.d; }), GB.yard, GB.rep].join('|'), '61|50|true|-50|60');
          eq('M3-18 item NOTFOUND: unknown / bad shapes', [err(function () { officeStockItem(tY, 'NOPE-9'); }), err(function () { officeStockItem(tY, 5); }), err(function () { officeStockItem(tY, 'rl-std-20'); }), err(function () { officeStockItem(tY, { x: 1 }); }), err(function () { officeStockItem(tY, ''); })].join('|'), 'NOTFOUND|NOTFOUND|NOTFOUND|NOTFOUND|NOTFOUND');
          // ---- sets
          db.insert('Items', { ItemCode: 'SET-T1', Name: 'Test tower set', Category: 'Set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' });
          db.insert('KitParts', [{ KitPartID: 'KP-T1', SetCode: 'SET-T1', ItemCode: 'RL-STD-20', QtyPerSet: 4 }, { KitPartID: 'KP-T2', SetCode: 'SET-T1', ItemCode: 'TC-TUBE-3', QtyPerSet: 2 }, { KitPartID: 'KP-T3', SetCode: 'SET-T1', ItemCode: 'BD-ST-207', QtyPerSet: 0 }]);
          var RS = row(officeStockList(tY), 'SET-T1'), GS = officeStockItem(tY, 'SET-T1'), GP = officeStockItem(tY, 'RL-STD-20');
          eq('M3-19 set with a qty 0 part row: the challan refuses it (kitParts_) -> can make 0, flagged kitBad (CR run 5); the valid parts listed; the part lists its set', [RS.isSet, RS.parts, RS.make, RS.kitBad, GS.kitBad, J(GS.kit.map(function (p) { return [p.code, p.q, p.yard]; })), J(GP.sets.map(function (s) { return [s.code, s.q]; })), 'sets' in GS, 'kit' in GP].join('|'),
            'true|2|0|true|true|[["RL-STD-20",4,71],["TC-TUBE-3",2,4]]|[["SET-T1",4]]|false|false');
          db.update('KitParts', must(db, 'KitParts', 'KitPartID', 'KP-T3'), { SetCode: '' }); var RS2 = row(officeStockList(tY), 'SET-T1');
          eq('M3-19a the bad row taken off the set: can make = min(71/4, 4/2) = 2, no flag', [RS2.make, !!RS2.kitBad].join('|'), '2|false');
          db.update('KitParts', must(db, 'KitParts', 'KitPartID', 'KP-T2'), { QtyPerSet: 2.5 });
          eq('M3-19b can make = whole sets only (4 / 2.5 = 1.6 -> 1)', row(officeStockList(tY), 'SET-T1').make, 1);
          eq('M3-20 opening refused for a set', ob({}, [ok1({ item: 'SET-T1', loc: 'LOC-REPAIR' })]), 'BADINPUT|line 1 item');
          // ---- item save
          var ib = function (t, o) { return err(function () { IS(t, NI(o)); }); }, nI = db.rows('Items').length;
          eq('M3-21 new item refused: code, EXISTS, name, unit not in Lists, status, tracked, set, weight, reorder, bad shapes; nothing added', [ib(tY, { code: '' }), ib(tY, { code: 'ab-1' }), ib(tY, { code: 'AB 1' }), ib(tY, { code: 'A123456789012345678901234' }), ib(tY, { code: '-AB' }), ib(tY, { code: 'RL-STD-20' }),
            ib(tY, { name: '' }), ib(tY, { name: '   ' }), ib(tY, { name: 5 }), ib(tY, { unit: 'pcs' }), ib(tY, { status: 'Gone' }), ib(tY, { tracked: true }), ib(tY, { isSet: 'yes' }), ib(tY, { kg: -1 }), ib(tY, { kg: '4' }), ib(tY, { kg: 10001 }), ib(tY, { kg: 1.2345 }), ib(tY, { reorder: 1.5 }), ib(tY, { reorder: -1 }),
            err(function () { IS(tY, 'x'); }), err(function () { IS(tY, [1]); }), db.rows('Items').length - nI].join('|'),
            'BADINPUT|item code|BADINPUT|item code|BADINPUT|item code|BADINPUT|item code|BADINPUT|item code|EXISTS|RL-STD-20|BADINPUT|name|BADINPUT|name|BADINPUT|name|BADINPUT|unit|BADINPUT|status|BADINPUT|stock tracked|BADINPUT|set|BADINPUT|weight|BADINPUT|weight|BADINPUT|weight|BADINPUT|weight|BADINPUT|reorder level|BADINPUT|reorder level|BADINPUT|item code|BADINPUT|item code|0');
          var A1 = IS(tY, NI({ code: 'M3-NEW-1', name: '=HYPERLINK("x")', hire: 9, sale: 9, repl: 9, repair: 9 })), I1 = IT('M3-NEW-1');
          eq('M3-22 YW Staff adds an item: text cells safe, prices ignored (blank), logged; it is listed', [A1.code, I1.Name, I1.Category, I1.Unit, I1.WeightKg, I1.ReorderLevel, I1.StockTracked, I1.IsSet, I1.Status, [I1.HireRateMonth, I1.SalePrice, I1.ReplacementCost, I1.RepairRate].join('/'),
            db.rows('Log').filter(function (r) { return r.Action === 'Item added' && r.Ref === 'M3-NEW-1'; }).length, !!row(officeStockList(tY), 'M3-NEW-1'), officeStockItem(tY, 'M3-NEW-1').name].join('|'), 'M3-NEW-1|\'=HYPERLINK("x")|Ringlock|pc|4.5|10|Yes||Active|///|1|true|\'=HYPERLINK("x")');
          var A2 = IS(tD, NI({ code: 'M3-NEW-2', kg: '', reorder: '', hire: 100, sale: 2000.5, repl: 1500, repair: '' })), I2 = IT('M3-NEW-2');
          eq('M3-23 a Director adds with prices; blanks stay blank; prices checked', [A2.code, I2.HireRateMonth, I2.SalePrice, I2.ReplacementCost, I2.RepairRate, I2.WeightKg, I2.ReorderLevel, ib(tD, { code: 'M3-NEW-2' }), ib(tD, { hire: -1, code: 'M3-NEW-3' }), ib(tD, { sale: '5', code: 'M3-NEW-3' }), ib(tD, { repl: 1.005, code: 'M3-NEW-3' }), ib(tD, { repair: 2e9, code: 'M3-NEW-3' })].join('|'),
            'M3-NEW-2|100|2000.5|1500||||EXISTS|M3-NEW-2|BADINPUT|hire rate|BADINPUT|sale price|BADINPUT|replacement cost|BADINPUT|repair rate');
          db.insert('Items', { ItemCode: 'm3-low-1', Name: 'lower', Unit: 'pc', StockTracked: 'Yes', Status: 'Active' });
          eq('M3-24 a code that only differs in case from a sheet code is EXISTS', ib(tY, { code: 'M3-LOW-1' }), 'EXISTS|M3-LOW-1');
          var E0 = ED(tY, 'M3-NEW-1'), lgU = db.rows('Log').length, S0 = IS(tY, E0);
          eq('M3-25 edit with nothing changed (blank reorder = 0 too) -> same, no write, no log', [S0.same, db.rows('Log').length - lgU, IS(tY, ED(tY, 'M3-NEW-2')).same, (db.update('Items', IT('M3-NEW-2'), { ReorderLevel: 0 }), IS(tY, ED(tY, 'M3-NEW-2', { reorder: '' })).same), (db.update('Items', IT('M3-NEW-2'), { ReorderLevel: '' }), IS(tY, ED(tY, 'M3-NEW-2', { reorder: 0 })).same), IS(tD, ED(tD, 'M3-NEW-2', { hire: 100, sale: 2000.5, repl: 1500, repair: '' })).same].join('|'), 'true|0|true|true|true|true');
          var E1 = ED(tY, 'M3-NEW-1', { name: 'M3 renamed', reorder: 12, kg: '', hire: 5 }), S1 = IS(tY, E1), I1b = IT('M3-NEW-1');
          eq('M3-26 YW edit: name / reorder / weight changed, prices kept, logged with the changed columns; old ev -> STALE', [S1.code, I1b.Name, I1b.ReorderLevel, I1b.WeightKg, I1b.HireRateMonth, db.rows('Log').slice(-1)[0].Details, err(function () { IS(tY, E1); })].join('|'), 'M3-NEW-1|M3 renamed|12|||Name, WeightKg, ReorderLevel|STALE');
          var E2 = ED(tY, 'M3-NEW-2', { name: 'YW after price' }), D2 = ED(tD, 'M3-NEW-2', { hire: 120, sale: 2000.5, repl: 1500, repair: '' }), evY = E2.ev; IS(tD, D2);
          var D3 = ED(tD, 'M3-NEW-2', { hire: 130, sale: 2000.5, repl: 1500, repair: '' }), evY2 = officeStockItem(tY, 'M3-NEW-2').ev, S2 = IS(tY, E2);
          eq('M3-27 no prices in the YW hash (a Director price change does not stale a YW edit, which keeps the price); the YW change stales the Director; Director clears a price', [evY === evY2, evY !== D2.ev, S2.code, IT('M3-NEW-2').Name, IT('M3-NEW-2').HireRateMonth, err(function () { IS(tD, D3); }),
            (IS(tD, ED(tD, 'M3-NEW-2', { hire: '', sale: 2000.5, repl: 1500, repair: '' })), IT('M3-NEW-2').HireRateMonth)].join('|'), 'true|true|M3-NEW-2|YW after price|120|STALE|');
          eq('M3-28 edit refused: unknown code / bad ev / set flag on an item with moves or with parts / tracking off with stock', [err(function () { IS(tY, ED(tY, 'M3-NEW-1', { code: 'NOPE-1' })); }), err(function () { IS(tY, ED(tY, 'M3-NEW-1', { ev: 'x' })); }), err(function () { IS(tY, ED(tY, 'M3-NEW-1', { ev: 1 })); }),
            err(function () { IS(tY, ED(tY, 'RL-STD-20', { isSet: 'Yes' })); }), err(function () { IS(tY, ED(tY, 'SET-T1', { isSet: 'No' })); }), err(function () { IS(tY, ED(tY, 'RL-STD-20', { tracked: 'No' })); })].join('|'),
            'NOTFOUND|STALE|STALE|BADINPUT|set|BADINPUT|set|BADINPUT|stock tracked');
          IS(tY, ED(tY, 'M3-NEW-1', { tracked: 'No', isSet: 'Yes' }));
          eq('M3-29 an item with no moves / parts may become an untracked set', [IT('M3-NEW-1').StockTracked, IT('M3-NEW-1').IsSet, row(officeStockList(tY), 'M3-NEW-1').isSet].join('|'), 'No|Yes|true');
          db.update('Items', IT('M3-NEW-2'), { Category: 'Old cat', Unit: 'pcs' });
          if (!db.hasTab('Lists')) db.ensureTab('Lists', ['ItemCategory', 'Unit']); else db.ensureColumn('Lists', 'ItemCategory');
          db.insert('Lists', [{ ItemCategory: 'Ringlock' }, { ItemCategory: 'Board' }, { ItemCategory: 'Ringlock' }]);
          eq('M3-30 categories from Lists: new item must use one; an item keeps its own old category / unit; list sent once each', [ib(tY, { code: 'M3-NEW-4', cat: 'Foo' }), IS(tY, NI({ code: 'M3-NEW-4', cat: 'Board' })).code, IS(tD, ED(tD, 'M3-NEW-2', { name: 'kept cat', hire: '', sale: 2000.5, repl: 1500, repair: '' })).code, IT('M3-NEW-2').Category, IT('M3-NEW-2').Unit,
            err(function () { IS(tY, ED(tY, 'M3-NEW-2', { cat: 'Other new' })); }), J(officeStockList(tY).cats)].join('|'), 'BADINPUT|category|M3-NEW-4|M3-NEW-2|Old cat|pcs|BADINPUT|category|["Ringlock","Board"]');
          // ---- locations
          var LL = officeLocList(tPS);
          eq('M3-31 location list: Yard, Repair, Site (job / customer), Lost, Scrap; no Supplier / Sold; PS reads, only heads add', [LL.can, officeLocList(tYH).can, LL.rows.map(function (l) { return l.type; }).filter(function (x, i, A) { return A.indexOf(x) === i; }).join(','), LL.rows.some(function (l) { return l.type === 'Supplier' || l.type === 'Sold'; }), J(LL.rows.filter(function (l) { return l.code === 'LOC-S0001'; })[0])].join('|'),
            'false|true|Yard,Repair,Site,Lost,Scrap|false|' + J({ code: 'LOC-S0001', name: 'LOC-S0001', type: 'Site', status: 'Active', cust: 'Test Client', job: jb }));
          var lb = function (o) { return err(function () { LS(tYH, Object.assign({ code: 'YR-1', name: 'Rack 1', type: 'Yard' }, o)); }); }, nL = db.rows('Locations').length;
          eq('M3-32 add location refused: code, name, type, EXISTS, bad shape; nothing added', [lb({ code: 'yr-1' }), lb({ code: '' }), lb({ name: '' }), lb({ name: 7 }), lb({ type: 'Site' }), lb({ type: 'Lost' }), lb({ type: '' }), lb({ code: 'LOC-YARD' }), lb({ code: 'LOC-S0099' }), err(function () { LS(tYH, 'x'); }), db.rows('Locations').length - nL].join('|'),
            'BADINPUT|location code|BADINPUT|location code|BADINPUT|location name|BADINPUT|location name|BADINPUT|location type|BADINPUT|location type|BADINPUT|location type|EXISTS|LOC-YARD|BADINPUT|location code|BADINPUT|location code|0');
          var LA1 = LS(tYH, { code: 'YR-1', name: '+Rack 1', type: 'Yard' }), LA2 = LS(tD, { code: 'RB-2', name: 'Bay 2', type: 'Repair' }), YR = must(db, 'Locations', 'LocID', 'YR-1');
          db.insert('Locations', { LocID: 'loc-yd2', Name: 'lower', Type: 'Yard', SiteID: '', Status: 'Active' });
          eq('M3-33 locations added (text safe, Active), logged, offered for opening stock, usable; EXISTS in any case', [LA1.code, LA2.code, YR.Type, YR.Name, YR.Status, YR.SiteID, db.rows('Log').filter(function (r) { return r.Action === 'Location added'; }).length, officeStockList(tYH).locs.map(function (l) { return l.code; }).sort().join(','),
            OP(tYH, { date: '2026-11-20', rows: [ok1({ loc: 'YR-1', qty: 6 })] }).n, row(officeStockList(tY), 'RL-STD-20').yard, err(function () { LS(tYH, { code: 'YR-1', name: 'x', type: 'Yard' }); }), err(function () { LS(tYH, { code: 'LOC-YD2', name: 'x', type: 'Yard' }); })].join('|'),
            'YR-1|RB-2|Yard|\'+Rack 1|Active||2|LOC-REPAIR,LOC-YARD,RB-2,YR-1,loc-yd2|1|77|EXISTS|YR-1|EXISTS|LOC-YD2');
          // ---- rate, revoked login, big data
          e5.cput('OQEW:ywh3@t.com', { t: e5.now(), n: OQE_RATE_.n }, 600);
          var sl = [err(function () { officeLocSave(tYH, { code: 'YR-2', name: 'x', type: 'Yard' }); }), err(function () { officeStockOpening(tYH, { date: '2026-11-19', rows: [ok1({ item: 'BD-ST-207', loc: 'YR-1' })] }); })];
          e5.cput('OQEW:yard4@t.com', { t: e5.now(), n: OQE_RATE_.n }, 600); sl.push(err(function () { officeItemSave(tY, NI({ code: 'M3-NEW-9' })); }));
          eq('M3-34 many writes from one login -> SLOW (nothing written)', [sl.join('|'), !find(db.rows('Locations'), 'LocID', 'YR-2'), !find(db.rows('Items'), 'ItemCode', 'M3-NEW-9'), !db.rows('StockMoves').some(function (m) { return m.ToLoc === 'YR-1' && m.ItemCode === 'BD-ST-207'; })].join('|'), 'SLOW|SLOW|SLOW|true|true|true');
          var LB = e5.get('OL:ps3@t.com'); LB.status = 'Blocked'; e5.put('OL:ps3@t.com', LB);
          eq('M3-35 a blocked login is refused at once', [err(function () { officeStockList(tPS); }), err(function () { officeLocList(tPS); })].join('|'), 'NOSESSION|NOSESSION');
          var big = []; for (var b = 0; b < 30000; b++) big.push({ MoveID: 'MV-B' + b, MoveDate: new Date(2026, 9, 1 + (b % 28)), ItemCode: b % 3 ? 'RL-STD-20' : 'BD-ST-207', Qty: 1, FromLoc: 'LOC-YARD', ToLoc: b % 2 ? 'LOC-S0001' : 'LOC-REPAIR', RefType: 'Challan', RefNo: 'DC-BIG', JobNo: '', PostedBy: 't', PostedAt: new Date() });
          db.insert('StockMoves', big);
          var t0 = Date.now(), LG = officeStockList(tY), t1 = Date.now(), GG = officeStockItem(tY, 'RL-STD-20'), t2 = Date.now();
          eq('M3-36 30 000 moves: list < 1.5 s, item < 1.5 s, sums right, 50 moves sent', [t1 - t0 < 1500, t2 - t1 < 1500, row(LG, 'RL-STD-20').yard, row(LG, 'RL-STD-20').site + row(LG, 'RL-STD-20').rep, GG.moves.length, GG.nMoves].join('|'), 'true|true|' + (77 - 20000) + '|' + (32 + 20000) + '|50|' + (11 + 20000));
          var LK = e5.lock, nI9 = db.rows('Items').length;
          e5.lock = function (f) { var B = e5.get('OL:ywac3@t.com'); B.status = 'Blocked'; e5.put('OL:ywac3@t.com', B); return LK.call(e5, f); };
          var bl1; try { rc(); bl1 = err(function () { officeItemSave(tYA, NI({ code: 'M3-LK-1' })); }); } finally { e5.lock = LK; }
          var tYD = add('ywdn3@t.com', { YW: 3 }); e5.lock = function (f) { var B = e5.get('OL:ywdn3@t.com'); B.depts = { YW: 1 }; e5.put('OL:ywdn3@t.com', B); return LK.call(e5, f); };
          var bl2; try { bl2 = err(function () { officeLocSave(tYD, { code: 'YR-LK', name: 'x', type: 'Yard' }); }); } finally { e5.lock = LK; }
          eq('M3-37 checked again inside the lock: blocked meanwhile -> NOSESSION, level lowered meanwhile -> NOACCESS; nothing written', [bl1, bl2, db.rows('Items').length - nI9, !find(db.rows('Locations'), 'LocID', 'YR-LK')].join('|'), 'NOSESSION|NOACCESS|0|true');
          var tYE = add('ywe3@t.com', { YW: 3 }), ac1 = (officeLocSave(tYE, { code: 'YR-AC', name: 'x', type: 'Yard' }), OQ_ACT_), ac2 = (err(function () { officeLocSave(tYE, { code: 'YR-AC', name: 'x', type: 'Yard' }); }), OQ_ACT_);
          eq('M3-38 the acting office login is cleared after a write and after a refused one; the row is logged under it', [ac1, ac2, db.rows('Log').filter(function (r) { return r.Ref === 'YR-AC'; })[0].User].join('|'), '||office:ywe3@t.com');
          // ---- CR run 1: an item edit marks the open documents that print it as old
          var qD9 = mkQ(''), qL9 = mkQ('Sent'); quoteToJob(db, qL9); db.update('Quotes', must(db, 'Quotes', 'QuoteNo', qD9), { PDF: 'https://drive.google.com/file/d/Q9Dabcdefghijklmnopqrstuv/view' }); db.update('Quotes', must(db, 'Quotes', 'QuoteNo', qL9), { PDF: 'https://drive.google.com/file/d/Q9Labcdefghijklmnopqrstuv/view' });
          var QP = function (n) { return J(e5.get('OQP:' + n) || null); }, PD9 = function (t, k, n) { return String(must(db, t, k, n).PDF || ''); };
          var docs9 = function () { db.insert('Challans', [{ ChallanNo: 'DC-T1', Kind: 'Delivery', Status: 'Draft', PDF: 'https://x/c1' }, { ChallanNo: 'DC-T2', Kind: 'Delivery', Status: 'Posted', PDF: 'https://x/c2' }, { ChallanNo: 'DC-T3', Kind: 'Delivery', Status: '', PDF: 'https://x/c3' }]);
            db.insert('ChallanLines', [{ LineID: 'CL-T1', ChallanNo: 'DC-T1', ItemCode: 'RL-STD-20', Qty: 1 }, { LineID: 'CL-T2', ChallanNo: 'DC-T2', ItemCode: 'RL-STD-20', Qty: 1 }, { LineID: 'CL-T3', ChallanNo: 'DC-T3', ItemCode: 'BD-ST-207', Qty: 1 }]);
            db.insert('POs', [{ PONo: 'PO-T1', Status: 'Draft', PDF: 'https://x/p1' }, { PONo: 'PO-T2', Status: 'Sent', PDF: 'https://x/p2' }]);
            db.insert('POLines', [{ LineID: 'POL-T1', PONo: 'PO-T1', ItemCode: 'RL-STD-20', Qty: 1 }, { LineID: 'POL-T2', PONo: 'PO-T2', ItemCode: 'RL-STD-20', Qty: 1 }]);
            db.insert('Notes', [{ NoteNo: 'DN-T1', Kind: 'DN', Status: 'Draft', PDF: 'https://x/n1' }, { NoteNo: 'DN-T2', Kind: 'DN', Status: 'Issued', PDF: 'https://x/n2' }]);
            db.insert('Damage', [{ DamageID: 'DMG-T1', ItemCode: 'RL-STD-20', QtyDamaged: 1, DNNo: 'DN-T1' }, { DamageID: 'DMG-T2', ItemCode: 'BD-ST-207', QtyLost: 1, DNNo: 'DN-T2' }, { DamageID: 'DMG-T3', ItemCode: 'RL-STD-20', QtyDamaged: 2, DNNo: '' }]); };
          docs9();
          var reset9 = function () { [['Challans', 'ChallanNo', 'DC-T1', 'c1'], ['Challans', 'ChallanNo', 'DC-T2', 'c2'], ['Challans', 'ChallanNo', 'DC-T3', 'c3'], ['POs', 'PONo', 'PO-T1', 'p1'], ['POs', 'PONo', 'PO-T2', 'p2'], ['Notes', 'NoteNo', 'DN-T1', 'n1'], ['Notes', 'NoteNo', 'DN-T2', 'n2']].forEach(function (x) { db.update(x[0], must(db, x[0], x[1], x[2]), { PDF: 'https://x/' + x[3] }); }); e5.del('OQP:' + qD9); e5.del('OQP:' + qL9); };
          var all9 = function () { return [PD9('Challans', 'ChallanNo', 'DC-T1'), PD9('Challans', 'ChallanNo', 'DC-T2'), PD9('Challans', 'ChallanNo', 'DC-T3'), PD9('POs', 'PONo', 'PO-T1'), PD9('POs', 'PONo', 'PO-T2'), PD9('Notes', 'NoteNo', 'DN-T1'), PD9('Notes', 'NoteNo', 'DN-T2')].map(function (u) { return u ? u.slice(-2) : '-'; }).join(','); };
          var nOld = function () { return db.rows('Log').filter(function (r) { return r.Action === 'PDF out of date'; }).length; };
          var ex9 = function (fs) { var n = 0; [['Challans', 'ChallanNo', 'ChallanLines', 'ChallanNo', ['Name', 'Unit', 'WeightKg']], ['POs', 'PONo', 'POLines', 'PONo', ['Name', 'Unit']], ['Notes', 'NoteNo', 'Damage', 'DNNo', ['Name']]].forEach(function (t) { if (!t[4].some(function (f) { return fs.indexOf(f) >= 0; })) return; var nos = {}; db.rows(t[2]).forEach(function (l) { if (l.ItemCode === 'RL-STD-20' && l[t[3]]) nos[l[t[3]]] = 1; }); db.rows(t[0]).forEach(function (r) { if (nos[r[t[1]]] && r.PDF && (!r.Status || r.Status === 'Draft')) n++; }); }); return n; }; // counted here, the other blocks' documents included
          reset9(); var x1 = ex9(['Name']), lo0 = nOld(), N1 = IS(tY, ED(tY, 'RL-STD-20', { name: 'Ringlock standard 2.0 m (new)' }));
          eq('M3-39 name change: Draft challan / Draft PO / Draft debit note PDF links cleared + logged; posted / sent / issued / other items kept; quotes not touched (they print the line text)', [x1 >= 3, N1.old === x1, all9(), nOld() - lo0 === x1, QP(qD9), QP(qL9)].join('|'), 'true|true|-,c2,c3,-,p2,-,n2|true|null|null');
          var exQ = function () { var ql = {}, js = {}; db.rows('QuoteLines').forEach(function (l) { if (l.ItemCode === 'RL-STD-20') ql[l.QuoteNo] = 1; }); db.rows('Jobs').forEach(function (j) { if (j.QuoteNo) js[j.QuoteNo] = 1; }); return db.rows('Quotes').filter(function (q) { return ql[q.QuoteNo] && q.PDF && !js[q.QuoteNo] && (q.Status === 'Draft' || q.Status === 'Sent'); }).length; };
          reset9(); var x2 = exQ(), N2 = IS(tY, ED(tY, 'RL-STD-20', { size: '2.07 m' }));
          eq('M3-40 size change: the open quote with the item marked old (OQP v 0); the quote with a job untouched; challans / POs / notes kept', [x2 >= 1, N2.old === x2, JSON.parse(QP(qD9) || '{}').v, QP(qL9), all9()].join('|'), 'true|true|0|null|c1,c2,c3,p1,p2,n1,n2');
          reset9(); var x3 = ex9(['WeightKg']), N3 = IS(tY, ED(tY, 'RL-STD-20', { kg: 10.75 }));
          eq('M3-41 weight change: only the Draft challan (it prints the total kg)', [x3 >= 1, N3.old === x3, all9(), QP(qD9)].join('|'), 'true|true|-,c2,c3,p1,p2,n1,n2|null');
          reset9(); var it42 = J(IT('RL-STD-20')), x4 = err(function () { IS(tY, ED(tY, 'RL-STD-20', { unit: 'set' })); }); // CR run 4: an item in use keeps its unit
          eq('M3-42 unit change of an item in use refused (BADINPUT|unit: nothing written, no PDF touched); reorder / status-free fields change nothing', [x4, J(IT('RL-STD-20')) === it42, all9(), IS(tY, ED(tY, 'RL-STD-20', { reorder: 33 })).old, (reset9(), IS(tY, ED(tY, 'RL-STD-20', { status: 'Inactive' })).old), IS(tY, ED(tY, 'RL-STD-20', { status: 'Active', cat: 'Board' })).old, all9()].join('|'), 'BADINPUT|unit|true|c1,c2,c3,p1,p2,n1,n2|0|0|0|c1,c2,c3,p1,p2,n1,n2');
          reset9(); var it9 = J(IT('RL-STD-20')), dE = err(function () { IS(tD, ED(tD, 'RL-STD-20', { hire: 90, sale: '', repl: 3000, repair: 350 })); }), dE2 = err(function () { IS(tD, ED(tD, 'RL-STD-20', { hire: 90, sale: '', repl: 3100, repair: 300 })); });
          eq('M3-43 a repair / replacement rate change waits while a Draft debit note has the item (DNOPEN); nothing written', [dE, dE2, J(IT('RL-STD-20')) === it9, all9()].join('|'), 'DNOPEN|DN-T1|DNOPEN|DN-T1|true|c1,c2,c3,p1,p2,n1,n2');
          var N5 = IS(tD, ED(tD, 'RL-STD-20', { hire: 95, sale: '', repl: 3000, repair: 300 }));
          db.update('Notes', must(db, 'Notes', 'NoteNo', 'DN-T1'), { Status: 'Issued' }); var N6 = IS(tD, ED(tD, 'RL-STD-20', { hire: 95, sale: '', repl: 3000, repair: 350 }));
          db.update('Notes', must(db, 'Notes', 'NoteNo', 'DN-T1'), { Status: 'Draft' }); db.update('Damage', must(db, 'Damage', 'DamageID', 'DMG-T1'), { DNNo: 'DN-T2' });
          var N7 = IS(tD, ED(tD, 'RL-STD-20', { hire: 95, sale: '', repl: 3200, repair: 350 }));
          eq('M3-44 hire rate alone is free; once the note is issued (or the damage is on an issued note) the rate changes, no PDF touched', [N5.old, IT('RL-STD-20').HireRateMonth, N6.old, IT('RL-STD-20').RepairRate, N7.old, IT('RL-STD-20').ReplacementCost, all9()].join('|'), '0|95|0|350|0|3200|c1,c2,c3,p1,p2,n1,n2');
          reset9(); var i09 = db.insert, nm9 = String(IT('RL-STD-20').Name); db.insert = function (t) { if (t === 'Log') throw new Error('log down'); return i09.apply(db, arguments); };
          var LE; try { LE = err(function () { IS(tY, ED(tY, 'RL-STD-20', { name: 'Should not save' })); }); } finally { db.insert = i09; }
          eq('M3-45 the old-PDF log failing stops the save: link kept, item not changed', [LE, all9(), String(IT('RL-STD-20').Name) === nm9].join('|'), 'log down|c1,c2,c3,p1,p2,n1,n2|true');
          reset9(); var u09 = db.update, nm10 = String(IT('RL-STD-20').Name); db.update = function (t) { if (t === 'Items') throw new Error('sheet down'); return u09.apply(db, arguments); };
          var UE; try { UE = err(function () { IS(tY, ED(tY, 'RL-STD-20', { name: 'Write fails' })); }); } finally { db.update = u09; }
          eq('M3-47 PDFs are marked old before the item write (a failed write leaves them marked: safe side, as the M1 / M2 rule)', [UE, String(IT('RL-STD-20').Name) === nm10, all9()].join('|'), 'sheet down|true|-,c2,c3,-,p2,n1,n2'); // DMG-T1 moved to the issued DN-T2 in M3-44
          reset9();
          eq('M3-46 a new item marks nothing old', [J(IS(tY, NI({ code: 'M3-NEW-7' }))), all9()].join('|'), '{"code":"M3-NEW-7"}|c1,c2,c3,p1,p2,n1,n2');
          mv('__proto__', 5, '', '__proto__'); mv('RL-STD-20', 1, 'constructor', 'toString'); db.insert('KitParts', { KitPartID: 'KP-PX', SetCode: '__proto__', ItemCode: 'RL-STD-20', QtyPerSet: 1 });
          var PX = officeStockList(tYH), PX2 = officeStockItem(tY, 'RL-STD-20'), pol = ({}).yard === undefined && ({}).toString === Object.prototype.toString && typeof ({}).constructor === 'function';
          eq('M3-48 sheet text like __proto__ / constructor in moves, kit parts or a posted location is plain data (no prototype change); such a location is refused for opening', [pol, !!row(PX, 'RL-STD-20'), PX2.where.every(function (w) { return w.code !== 'toString'; }), PX2.sets.some(function (x) { return x.code === '__proto__'; }), err(function () { OP(tYH, { date: '2026-11-19', rows: [ok1({ loc: '__proto__', item: 'BD-ST-207' })] }); }), err(function () { OP(tYH, { date: '2026-11-19', rows: [ok1({ loc: 'toString', item: 'BD-ST-207' })] }); })].join('|'),
            'true|true|true|true|BADINPUT|line 1 location|BADINPUT|line 1 location');
        })();
