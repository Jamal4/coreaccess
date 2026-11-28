        // ---- M8 challans + rent-in (harness only)
        (function () { var LAST = '', EQ = function (n) { LAST = n; return eq.apply(this, arguments); }; try {
          var tP = add('chps2@t.com', { PS: 2 }), tPH = add('chps3@t.com', { PS: 3 }), tPV = add('chps1@t.com', { PS: 1 }), tW = add('chyw2@t.com', { YW: 2 }), tWH = add('chyw3@t.com', { YW: 3 }), tH = add('chhr@t.com', { HR: 3 });
          var EM = ['chps2@t.com', 'chps3@t.com', 'chps1@t.com', 'chyw2@t.com', 'chyw3@t.com', 'dir4@t.com'], rc = function () { EM.forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var SV = function (t, c) { rc(); return officeChallanSave(t, c); }, PO = function (t, no, veh) { rc(); return officeChallanPost(t, no, officeChallanGet(t, no).ev, veh); };
          var CX = function (t, no, why) { rc(); return officeChallanCancel(t, no, officeChallanGet(t, no).ev, why || 'test'); };
          var mvs = function (no) { return db.rows('StockMoves').filter(function (v) { return v.RefNo === no; }); };
          var own = function (it, loc, o) { var m = chOwnMap_(db)[it + '|' + loc] || {}; return Math.round((m[o || ''] || 0) * 100) / 100; };
          var J = 'CAE/J/2026/801', JS = 'CAE/J/2026/802', Y = 'CH-YARD', R = 'CH-REP', SUP = 'SUP-0001';
          ['LOC-SUPPLIER|Supplier', 'LOC-SOLD|Sold', 'LOC-REPAIR|Repair', 'LOC-LOST|Lost', 'CH-YARD|Yard', 'CH-REP|Repair'].forEach(function (x) { var p = x.split('|'); if (!find(db.rows('Locations'), 'LocID', p[0])) db.insert('Locations', { LocID: p[0], Name: p[0], Type: p[1], SiteID: '', Status: 'Active' }); });
          db.insert('Sites', { SiteID: 'SITE-0801', CustID: 'CUST-0001', Project: 'CH test site', Address: 'x', LocID: 'LOC-CH-S1' });
          db.insert('Locations', { LocID: 'LOC-CH-S1', Name: 'Site: CH', Type: 'Site', SiteID: 'SITE-0801', Status: 'Active' });
          db.insert('Jobs', { JobNo: J, CustID: 'CUST-0001', SiteID: 'SITE-0801', JobType: 'Rental', HireBasis: 'Item', Status: 'Awaiting order' });
          db.insert('Jobs', { JobNo: JS, CustID: 'CUST-0001', SiteID: 'SITE-0801', JobType: 'Sale', Status: 'Awaiting order' });
          db.insert('Items', [{ ItemCode: 'CH-STD', Name: 'CH standard', Unit: 'pc', WeightKg: 10, StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CH-BRD', Name: 'CH board', Unit: 'pc', WeightKg: 5, StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }]);
          postOpeningStock(db, [{ ItemCode: 'CH-STD', Qty: 70, LocID: Y }, { ItemCode: 'CH-BRD', Qty: 40, LocID: Y }], new Date(2026, 10, 1));
          var API = ['officeChallanList', 'officeChallanGet', 'officeChallanSave', 'officeChallanPost', 'officeChallanCancel', 'officeChallanPdf'];
          EQ('CH-1 the 6 challan calls are on the web API list and check the session first', API.map(function (n) { return OFFICE_WEB_API_.indexOf(n) >= 0 && /^function \w+\(token[^)]*\) \{\s*(var L = )?officeGate_\(token/.test(String(this[n] && this[n].officeRaw_ || this[n])); }, this).join(','), 'true,true,true,true,true,true');
          EQ('CH-2 no session -> NOSESSION; HR only -> NOACCESS', API.map(function (n) { var f = this[n]; return err(function () { f('nope', 'CAE/DC/2026/001'); }) + '/' + err(function () { f(tH, 'CAE/DC/2026/001'); }); }, this).join(','), API.map(function () { return 'NOSESSION/NOACCESS'; }).join(','));
          var D1 = { kind: 'Delivery', job: J, from: Y, date: '2026-11-20', lines: [{ it: 'CH-STD', q: 30 }] };
          EQ('CH-3 PS View / YW Staff cannot make a delivery; PS Staff cannot make a hire-in', [err(function () { SV(tPV, D1); }), err(function () { SV(tW, D1); }), err(function () { SV(tP, { kind: 'Hire-in', sup: SUP, sref: 'X', to: Y, date: '2026-11-20', lines: [{ it: 'CH-STD', q: 1 }] }); })].join('|'), 'NOACCESS|NOACCESS|NOACCESS');
          var s1 = SV(tP, D1), c1 = find(db.rows('Challans'), 'ChallanNo', s1.no);
          EQ('CH-4 new delivery: a DC number, Draft, yard -> job site, Owner column + new Challans columns added, ev a number', [/^CAE\/DC\/2026\/\d{3}$/.test(s1.no), c1.Status, c1.FromLoc, !blank(c1.ToLoc) && locType(db, c1.ToLoc), chOwnCol_(db), db.headers('Challans').indexOf('SupplierRef') >= 0, typeof s1.ev].join('|'), 'true|Draft|CH-YARD|Site|true|true|number');
          EQ('CH-5 edit: stale ev -> STALE; right ev -> lines replaced (one line, qty 35)', [err(function () { SV(tP, Object.assign({}, D1, { no: s1.no, ev: s1.ev + 1 })); }), (SV(tP, Object.assign({}, D1, { no: s1.no, ev: s1.ev, lines: [{ it: 'CH-STD', q: 35 }] })), oChLines_(db, s1.no).map(function (l) { return l.Qty; }).join(','))].join('|'), 'STALE|35');
          EQ('CH-6 bad input: unknown item / twice / qty 1.5 / Sale kind on a rental job / Transfer from = to', [err(function () { SV(tP, Object.assign({}, D1, { lines: [{ it: 'NOPE-1', q: 1 }] })); }), err(function () { SV(tP, Object.assign({}, D1, { lines: [{ it: 'CH-STD', q: 1 }, { it: 'CH-STD', q: 2 }] })); }),
            err(function () { SV(tP, Object.assign({}, D1, { lines: [{ it: 'CH-STD', q: 1.5 }] })); }), err(function () { SV(tP, Object.assign({}, D1, { kind: 'Sale' })); }), err(function () { SV(tW, { kind: 'Transfer', from: Y, to: Y, date: '2026-11-20', lines: [{ it: 'CH-STD', q: 1 }] }); })].join('|'),
            'BADINPUT|line 1 item|BADINPUT|line 2 (twice)|BADINPUT|line 1 qty|BADINPUT|job|BADINPUT|to');
          EQ('CH-7 post needs the vehicle no. (Delivery); then posted: yard 70 -> 35, site 35, own stock, job On hire', [err(function () { PO(tP, s1.no); }), (PO(tP, s1.no, 'DM-TA 11-1'), find(db.rows('Challans'), 'ChallanNo', s1.no).Status), stockAt(db, 'CH-STD', Y), own('CH-STD', c1.ToLoc), must(db, 'Jobs', 'JobNo', J).Status].join('|'), 'BADINPUT|vehicle no.|Posted|35|35|On hire');
          var SL = c1.ToLoc;
          var H1 = { kind: 'Hire-in', sup: SUP, sref: 'DO-77', to: Y, date: '2026-11-20', lines: [{ it: 'CH-STD', q: 50 }] };
          EQ('CH-8 hire-in: supplier DO no. needed; posted -> 50 of SUP-0001 in the yard; the stock screen still shows own 35 only', [err(function () { SV(tW, Object.assign({}, H1, { sref: '' })); }), (function () { var s = SV(tW, H1); PO(tW, s.no); return own('CH-STD', Y, SUP) + ',' + own('CH-STD', Y); })(),
            (officeStockList(tWH).rows.filter(function (r) { return r.code === 'CH-STD'; })[0] || {}).yard].join('|'), 'BADINPUT|supplier\'s DO no.|50,35|35');
          var s2 = SV(tP, Object.assign({}, D1, { lines: [{ it: 'CH-STD', q: 60 }] }));
          var g2 = officeChallanGet(tP, s2.no); PO(tP, s2.no, 'DM-TA 11-2');
          EQ('CH-9 delivery of 60: own first (35), then rented (25); moves carry the owner', mvs(s2.no).map(function (v) { return v.Qty + ':' + (v.Owner || 'own'); }).join(',') + '|' + own('CH-STD', Y) + ',' + own('CH-STD', Y, SUP), '35:own,25:SUP-0001|0,25');
          var sS = SV(tP, { kind: 'Sale', job: JS, from: Y, date: '2026-11-20', veh: 'V1', lines: [{ it: 'CH-STD', q: 5 }] });
          EQ('CH-10 sale: only our own stock (none left) -> NOTPOSTED, nothing moved; the draft stays', [String(err(function () { PO(tP, sS.no, 'V1'); })).split('|')[0], mvs(sS.no).length, find(db.rows('Challans'), 'ChallanNo', sS.no).Status].join('|'), 'NOTPOSTED|0|Draft');
          var sR = SV(tP, { kind: 'Return', job: J, to: Y, date: '2026-11-20', veh: 'V2', lines: [{ it: 'CH-STD', g: 30, dm: 5, l: 0 }] }); PO(tP, sR.no);
          EQ('CH-11 return 30 good + 5 damaged: rented first (25 to the yard as SUP-0001), then own; damaged to repair; a Damage row', [mvs(sR.no).map(function (v) { return v.Qty + ':' + v.ToLoc + ':' + (v.Owner || 'own'); }).join(','), db.rows('Damage').filter(function (d) { return d.ChallanNo === sR.no; }).length].join('|'),
            '25:CH-YARD:SUP-0001,5:CH-YARD:own,5:LOC-REPAIR:own|1');
          EQ('CH-12 return more than on hire -> NOTPOSTED', String(err(function () { var s = SV(tP, { kind: 'Return', job: J, date: '2026-11-20', lines: [{ it: 'CH-STD', g: 999 }] }); PO(tP, s.no); })).split('|')[0], 'NOTPOSTED');
          var O1 = { kind: 'Off-hire', sup: SUP, from: Y, date: '2026-11-20', lines: [{ it: 'CH-STD', q: 51 }] }, so1 = SV(tW, O1);
          EQ('CH-13 off-hire: only that supplier\'s items (50 in the yard after the return): 51 refused; 50 posted -> the rent register has none left in the yard', [String(err(function () { PO(tW, so1.no); })).split('|')[0],
            (function () { rc(); var g = officeChallanGet(tW, so1.no); SV(tW, Object.assign({}, O1, { no: so1.no, ev: g.ev, lines: [{ it: 'CH-STD', q: 50 }] })); PO(tW, so1.no); return own('CH-STD', Y, SUP); })(),
            officeChallanList(tW).rent.filter(function (r) { return r.sup === SUP && r.it === 'CH-STD' && r.yard; }).length].join('|'), 'NOTPOSTED|0|0');
          var hi = db.rows('Challans').filter(function (c) { return c.Kind === 'Hire-in' && c.Status === 'Posted'; })[0].ChallanNo;
          EQ('CH-14 a hire-in whose items went out can\'t be cancelled (per owner); YW Staff can\'t cancel a posted one', [err(function () { CX(tW, hi); }), String(err(function () { CX(tWH, hi); })).split('|')[0]].join('|'), 'NOACCESS|NOCANCEL');
          var sT = SV(tW, { kind: 'Transfer', from: Y, to: R, date: '2026-11-20', lines: [{ it: 'CH-BRD', q: 4 }] }); PO(tW, sT.no);
          EQ('CH-15 transfer without a job: yard -> repair, moves have no job', [stockAt(db, 'CH-BRD', R), mvs(sT.no).map(function (v) { return v.JobNo === '' ? 'nojob' : v.JobNo; }).join(',')].join('|'), '4|nojob');
          var sD = SV(tP, { kind: 'Delivery', job: J, from: 'LOC-SUPPLIER', sup: SUP, sref: 'DSR-9', date: '2026-11-20', veh: 'V3', lines: [{ it: 'CH-BRD', q: 500 }] }); PO(tP, sD.no);
          EQ('CH-16 delivery direct from a rental supplier: no stock check, site gets SUP-0001\'s 500; the PDF says Direct to site, not the supplier', [own('CH-BRD', SL, SUP), (function () { var p = specChallan(db, sD.no), t = JSON.stringify(p.blocks); return /Direct to site/.test(t) + ',' + /Steel Co/.test(t); })()].join('|'), '500|true,false');
          var sC = SV(tP, Object.assign({}, D1, { lines: [{ it: 'CH-BRD', q: 2 }] })); PO(tP, sC.no, 'V4');
          EQ('CH-17 cancel: PS Staff no; PS Head yes -> moves reversed per owner, Cancelled + reason; again -> CHSTATE', [err(function () { CX(tP, sC.no); }), (CX(tPH, sC.no, 'wrong job'), find(db.rows('Challans'), 'ChallanNo', sC.no).Status + ':' + find(db.rows('Challans'), 'ChallanNo', sC.no).CancelReason), mvs(sC.no).filter(function (v) { return v.RefType === 'Challan-Cancel'; }).length,
            err(function () { CX(tPH, sC.no); })].join('|'), 'NOACCESS|Cancelled:wrong job|1|CHSTATE|Cancelled');
          var sX = SV(tP, Object.assign({}, D1, { lines: [{ it: 'CH-BRD', q: 1 }] })), gX = officeChallanGet(tP, sX.no); rc(); SV(tPH, Object.assign({}, D1, { no: sX.no, ev: gX.ev, lines: [{ it: 'CH-BRD', q: 2 }] }));
          EQ('CH-18 two users: a post with the version from before the other\'s edit -> STALE, nothing moved', [err(function () { rc(); officeChallanPost(tP, sX.no, gX.ev, 'V'); }), mvs(sX.no).length].join('|'), 'STALE|0');
          EQ('CH-19 post dated in the future -> CHDATE', err(function () { var s = SV(tP, Object.assign({}, D1, { date: '2026-11-28', lines: [{ it: 'CH-BRD', q: 1 }] })); PO(tP, s.no, 'V'); }), 'CHDATE');
          (function () { var lk0 = e5.lock, nC = db.rows('Challans').length, ea; rc(); e5.lock = function (fn) { fn(); throw new Error('Flush failed'); };
            try { ea = err(function () { officeChallanSave(tP, Object.assign({}, D1, { lines: [{ it: 'CH-BRD', q: 3 }] })); }); } finally { e5.lock = lk0; }
            var p = String(ea).split('|'), r2_ = SV(tP, Object.assign({}, D1, { no: p[1], ev: +p[2], lines: [{ it: 'CH-BRD', q: 3 }] }));
            EQ('CH-20 new challan, the lock-exit flush failed: SAVEUNSURE|no|ev; Save again with them = the same challan, no second Draft', [p[0], r2_.no === p[1], db.rows('Challans').length - nC].join('|'), 'SAVEUNSURE|true|1'); })();
          (function () { var s = SV(tP, Object.assign({}, D1, { veh: 'V', lines: [{ it: 'CH-BRD', q: 1 }] })), pc0 = postChallan, ins = 0, e1, n1;
            postChallan = function (d, no) { pc0.apply(this, arguments); d.update('Challans', must(d, 'Challans', 'ChallanNo', no), { Status: 'Draft' }); throw new Error('Service Spreadsheets timed out'); }; // moves in, status not
            try { e1 = err(function () { PO(tP, s.no, 'V'); }); } finally { postChallan = pc0; }
            n1 = mvs(s.no).length; PO(tP, s.no, 'V');
            EQ('CH-21 a post that wrote its moves then failed -> POSTUNSURE; Post again finishes it (Posted), never moves twice', [e1, n1, mvs(s.no).length, find(db.rows('Challans'), 'ChallanNo', s.no).Status].join('|'), 'POSTUNSURE|1|1|Posted'); })();
          var L = officeChallanList(tPV), Ls = JSON.stringify(L);
          EQ('CH-22 list for PS View: sees challans, can make nothing, no money keys; jobs open only; hire per job', [L.rows.length > 10, L.can.PS, L.can.YW, /Rate|Price|Cost|Amount/.test(Ls), L.jobs.some(function (j) { return j.no === J; }), !!L.hire[J]].join('|'), 'true|false|false|false|true|true');
          var sK = (function () { var ks = Object.keys(oStKit_(db)).filter(function (k) { return !oStKit_(db)[k].bad; }); return ks[0]; })();
          if (sK) { var kp = oStKit_(db)[sK]; postOpeningStock(db, kp.map(function (p) { return { ItemCode: p.p, Qty: p.q * 2, LocID: Y }; }), new Date(2026, 10, 2));
            var sk = SV(tP, Object.assign({}, D1, { veh: 'V', lines: [{ it: sK, q: 2 }] })); PO(tP, sk.no, 'V');
            EQ('CH-23 a set expands into its parts on post (each part moved, tagged with the set)', mvs(sk.no).length === kp.length && mvs(sk.no).every(function (v) { return v.SetCode === sK; }), true); }
          var g24 = officeChallanGet(tP, s2.no);
          EQ('CH-24 posted view: taken from own 35 + SUP-0001 25; PDF made on post and current', [JSON.stringify(g24.al), !!g24.pdf, g24.pdfOk].join('|'), '{"CH-STD":{"":35,"SUP-0001":25}}|true|true');
          EQ('CH-25 old StockMoves rows without an Owner count as own; a sale can take own stock again after an opening count', (function () { postOpeningStock(db, [{ ItemCode: 'CH-STD', Qty: 5, LocID: Y }], new Date(2026, 10, 3)); rc(); var g = officeChallanGet(tP, sS.no); rc(); officeChallanPost(tP, sS.no, g.ev, 'V1'); return find(db.rows('Challans'), 'ChallanNo', sS.no).Status + ':' + own('CH-STD', 'LOC-SOLD'); })(), 'Posted:5');
                  EQ('CH-26 cancel of a direct-from-supplier delivery: checked against SUP-0001\'s balance at the site, reversed with that owner', [(CX(tPH, sD.no, 'test'), find(db.rows('Challans'), 'ChallanNo', sD.no).Status), own('CH-BRD', SL, SUP), mvs(sD.no).filter(function (v) { return v.RefType === 'Challan-Cancel'; }).map(function (v) { return v.Owner; }).join(',')].join('|'), 'Cancelled|0|SUP-0001');
                  (function () { var sq = find(db.rows('Sequences'), 'SeqKey', 'DC-2026'), cl = find(db.rows('Sequences'), 'SeqKey', 'CL'), last = sq.LastNo; db.update('Sequences', sq, { LastNo: num(sq.LastNo) - 2 }); db.update('Sequences', cl, { LastNo: num(cl.LastNo) - 3 });
            var s = SV(tP, Object.assign({}, D1, { lines: [{ it: 'CH-BRD', q: 1 }, { it: 'CH-STD', q: 1 }] })), ids = db.rows('ChallanLines').map(function (l) { return l.LineID; });
            EQ('CH-27 counters behind the sheet: the new challan and its lines never take a number already used (live 26 Nov: a hire-in got DC/004)', [db.rows('Challans').filter(function (c) { return c.ChallanNo === s.no; }).length, s.no === sq.ChallanNo, num(s.no.split('/').pop()) > num(last), ids.length === ids.filter(function (x, i) { return ids.indexOf(x) === i; }).length].join('|'), '1|false|true|true'); })();
        } catch (e) { eq('CH crashed after ' + LAST.slice(0, 6), String(e && e.message || e), 'no crash'); } })();
