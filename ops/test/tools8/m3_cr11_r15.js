        // ---- M3 CR run 11 (harness only): sets made from the raw yard balance (challan tolerance); item / contract PDF clears undone on a throw
        //      part way or a failed write (OQP markers too), never over a cell written since
        (function () {
          var J = JSON.stringify, rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IS = function (t, d) { rc(); return officeItemSave(t, d); };
          var NI = function (o) { return Object.assign({ code: 'CR11-IT-1', name: 'CR11 item', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 4, reorder: 0, status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          var K = { Challans: 'ChallanNo', Invoices: 'InvNo', Notes: 'NoteNo', Quotes: 'QuoteNo' }, PD = function (t, n) { return String(must(db, t, K[t], n).PDF || ''); };
          var KEPT = function (ref) { return db.rows('Log').filter(function (l) { return l.Action === 'PDF link kept' && l.Ref === ref; }).length; };
          var EV = oEnv_(), dbf0 = EV.db, u0 = db.update, i0 = db.insert, nU = 0;
          var UR = function (p) { return 'https://drive.google.com/file/d/CR11' + p + (++nU) + 'abcdefghijklmnop/view'; };
          var row = function (t, c) { return (t.rows || []).filter(function (x) { return x.code === c; })[0]; };
          var nm = 0, mv = function (it, q, to) { db.insert('StockMoves', { MoveID: 'MV-C11-' + (++nm), MoveDate: new Date(2026, 10, 2), ItemCode: it, Qty: q, FromLoc: 'LOC-SUPPLIER', ToLoc: to || 'LOC-YARD', RefType: 'Opening', RefNo: 'OPEN-C11' }); };
          var CHG = { name: 'CR11 no', size: '2 m' }; // prints on the quote (Size) and the challans (Name)
          try {
            // (1) #1: can make = the challan's own count (raw balance, have >= need - 1e-9), not the 2-place yard total
            db.insert('Items', [{ ItemCode: 'CR11-P1', Name: 'CR11 part', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CR11-S1', Name: 'CR11 set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' },
              { ItemCode: 'CR11-P2', Name: 'CR11 part 2', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CR11-S2', Name: 'CR11 set 2', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' }]);
            db.insert('KitParts', [{ KitPartID: 'KP-C11A', SetCode: 'CR11-S1', ItemCode: 'CR11-P1', QtyPerSet: 1 }, { KitPartID: 'KP-C11B', SetCode: 'CR11-S2', ItemCode: 'CR11-P2', QtyPerSet: 0.1 }]);
            mv('CR11-P1', 0.999);
            var L1 = officeStockList(tY), S1 = row(L1, 'CR11-S1'), V1 = officeStockItem(tY, 'CR11-S1');
            var jb = db.rows('Jobs').filter(function (j) { return String(j.Status) !== 'Closed' && !blank(j.SiteID) && String(j.JobType) !== 'Sale'; })[0];
            var dc1 = createChallan(db, { jobNo: jb.JobNo, lines: [{ itemCode: 'CR11-S1', qty: 1 }] }), e1 = err(function () { postChallan(db, dc1); });
            eq('CR11-1 ledger 0.999 of a 1-per-set part: the card says 0 sets (r10: 1), the challan refuses 1 set; the yard shown rounded (1)',
              [S1.make, V1.make, /only 0\.999/.test(e1), V1.kit[0].yard, setAvail_(db, 'CR11-S1', 'LOC-YARD')].join('|'), '0|0|true|1|0');
            mv('CR11-P1', 0.001); var S1b = row(officeStockList(tY), 'CR11-S1'), p1b = postChallan(db, dc1);
            eq('CR11-2 0.999 + 0.001: 1 set on the card and the same challan now posts', [S1b.make, !!p1b, must(db, 'Challans', 'ChallanNo', dc1).Status].join('|'), '1|true|Posted');
            var cmp = [], vals = [[0.1, 0.2], [0.3], [0.295], [0.2999999999], [0.29999999999], [0.7, 0.1, 0.1], [0.995 - 0.7], [1e-10, 0.1]];
            vals.forEach(function (vs) {
              db.rows('StockMoves').filter(function (v) { return v.ItemCode === 'CR11-P2'; }).forEach(function (v) { u0.call(db, 'StockMoves', v, { Qty: 0 }); });
              vs.forEach(function (q) { mv('CR11-P2', q); });
              var mk = row(officeStockList(tY), 'CR11-S2').make, ch = setAvail_(db, 'CR11-S2', 'LOC-YARD'), bal = stockMap(db)['CR11-P2|LOC-YARD'] || 0, okCh = bal >= mk * 0.1 - 1e-9, notMore = !(bal >= (mk + 1) * 0.1 - 1e-9);
              cmp.push([mk, ch, okCh, notMore].join(','));
            });
            eq('CR11-3 a part of 0.1 per set, sums with float error: the card = setAvail_ (the challan\'s count) every time; the challan accepts that many and refuses one more',
              cmp.every(function (c) { var a = c.split(','); return a[0] === a[1] && a[2] === 'true' && a[3] === 'true'; }) + '|' + cmp.map(function (c) { return c.split(',')[0]; }).join(','), 'true|3,3,2,3,3,9,2,1');
            db.insert('Locations', { LocID: 'LOC-C11Y2', Name: 'CR11 rack 2', Type: 'Yard', SiteID: '', Status: 'Active' });
            db.rows('StockMoves').filter(function (v) { return v.ItemCode === 'CR11-P2'; }).forEach(function (v) { u0.call(db, 'StockMoves', v, { Qty: 0 }); });
            mv('CR11-P2', 0.15); mv('CR11-P2', 0.149, 'LOC-C11Y2'); mv('CR11-P2', 0.0015, 'LOC-REPAIR');
            var m11a = row(officeStockList(tY), 'CR11-S2').make; mv('CR11-P2', 0.049); /* 0.199 raw on one rack (2 places: 0.2) */
            eq('CR11-4 (r15) two yard racks 0.15 + 0.149: 1 set (one challan takes one rack; r14b summed: 2); 0.199 on one rack: 1 (raw, not the 2-place 0.2); repair stock not counted', m11a + '|' + row(officeStockList(tY), 'CR11-S2').make, '1|1');
            // (2) #5 item save: a clear that throws part way puts back what was done (links + OQP marker); a cell written since is not overwritten
            IS(tY, NI()); var LA = UR('a'), LB = UR('b'), LQ = UR('q');
            db.insert('Challans', [{ ChallanNo: 'DC-C11A', Kind: 'Delivery', Status: 'Draft', PDF: LA }, { ChallanNo: 'DC-C11B', Kind: 'Delivery', Status: 'Draft', PDF: LB }]);
            db.insert('ChallanLines', [{ LineID: 'CL-C11A', ChallanNo: 'DC-C11A', ItemCode: 'CR11-IT-1', Qty: 1 }, { LineID: 'CL-C11B', ChallanNo: 'DC-C11B', ItemCode: 'CR11-IT-1', Qty: 1 }]);
            rc(); var QN = officeQuoteSave(tS, base({ subject: 'CR11 quote', lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] })).no;
            db.insert('QuoteLines', { LineID: 'QL-C11X', QuoteNo: QN, LineNo: 9, ItemCode: 'CR11-IT-1', Description: 'CR11', Qty: 1 });
            var QK = 'OQP:' + QN, QR = function () { return must(db, 'Quotes', 'QuoteNo', QN); }, FR = function () { return oQPdfFresh_(EV, QR(), oQPdfVer_(db, QN).v); };
            var BK = function () { u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C11A'), { PDF: LA }); u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C11B'), { PDF: LB }); u0.call(db, 'Quotes', QR(), { PDF: LQ }); EV.del(QK); };
            var NMx = function () { return String(must(db, 'Items', 'ItemCode', 'CR11-IT-1').Name) + '/' + String(must(db, 'Items', 'ItemCode', 'CR11-IT-1').Size); };
            BK(); var fr0 = FR() === LQ, n0 = NMx();
            var F2 = function (applied) { db.update = function (t, r, p) { if (t === 'Challans' && r.ChallanNo === 'DC-C11B' && p && p.PDF === '') { if (applied) u0.apply(db, arguments); throw new Error('cell down'); } return u0.apply(db, arguments); }; };
            var e5a, kA = KEPT('DC-C11A'); F2(false); try { e5a = err(function () { IS(tY, ED(tY, 'CR11-IT-1', CHG)); }); } finally { db.update = u0; }
            var r5a = [e5a, PD('Challans', 'DC-C11A') === LA, PD('Challans', 'DC-C11B') === LB, KEPT('DC-C11A') - kA, J(EV.get(QK)), FR() === LQ, NMx() === n0].join('|');
            eq('CR11-5 the 2nd challan clear throws (not applied): the 1st link back + "PDF link kept", the 2nd untouched, the quote marker gone (PDF current again), item unchanged (r10: 1st lost, quote "old")',
              [fr0, r5a].join('|'), 'true|cell down|true|true|1|null|true|true');
            BK(); var e5b, kB = KEPT('DC-C11B'); F2(true); try { e5b = err(function () { IS(tY, ED(tY, 'CR11-IT-1', CHG)); }); } finally { db.update = u0; }
            eq('CR11-6 the 2nd clear went in and then threw (outcome unknown): both links back, each logged kept', [e5b, PD('Challans', 'DC-C11A') === LA, PD('Challans', 'DC-C11B') === LB, KEPT('DC-C11B') - kB, NMx() === n0].join('|'), 'cell down|true|true|1|true');
            BK(); var LN = UR('n'), e5c; db.update = function (t, r, p) { if (t === 'Challans' && r.ChallanNo === 'DC-C11B' && p && p.PDF === '') { u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C11A'), { PDF: LN }); throw new Error('cell down'); } return u0.apply(db, arguments); };
            try { e5c = err(function () { IS(tY, ED(tY, 'CR11-IT-1', CHG)); }); } finally { db.update = u0; }
            eq('CR11-7 a link written into the 1st cell since its clear is not overwritten by the put-back', [e5c, PD('Challans', 'DC-C11A') === LN, PD('Challans', 'DC-C11B') === LB].join('|'), 'cell down|true|true');
            BK(); var e5d; EV.put(QK, { v: 7, f: 'CR11other' }); F2(false); try { e5d = err(function () { IS(tY, ED(tY, 'CR11-IT-1', CHG)); }); } finally { db.update = u0; }
            eq('CR11-8 a quote marker that was there before (made here, other file) is put back as it was', [e5d, J(EV.get(QK))].join('|'), 'cell down|{"v":7,"f":"CR11other"}');
            // (3) #2 item write fails: OQP marker put back only when the item is unchanged and the marker is still the one written
            var FI = function (pre) { var hit = false; db.update = function (t) { if (t === 'Items') { hit = true; if (pre) pre(); throw new Error('sheet down'); } return u0.apply(db, arguments); }; return function () { return hit; }; };
            BK(); var e9; FI(); try { e9 = err(function () { IS(tY, ED(tY, 'CR11-IT-1', CHG)); }); } finally { db.update = u0; }
            eq('CR11-9 a Name + Size edit whose item write fails: the panel quote PDF is current again (no marker), challan links back, item unchanged (r10: quote left "old")',
              [e9, J(EV.get(QK)), FR() === LQ, PD('Challans', 'DC-C11A') === LA, PD('Challans', 'DC-C11B') === LB, NMx() === n0].join('|'), 'sheet down|null|true|true|true|true');
            BK(); var e9b; FI(); try { e9b = err(function () { IS(tY, ED(tY, 'CR11-IT-1', { size: '2 m' })); }); } finally { db.update = u0; }
            eq('CR11-9b a Size-only edit (only the quote prints it: no link cleared) whose item write fails: the quote marker gone, PDF current', [e9b, J(EV.get(QK)), FR() === LQ, NMx() === n0].join('|'), 'sheet down|null|true|true');
            BK(); var e10; FI(function () { EV.put(QK, { v: 3, f: 'CR11mid' }); }); try { e10 = err(function () { IS(tY, ED(tY, 'CR11-IT-1', CHG)); }); } finally { db.update = u0; }
            eq('CR11-10 a marker changed meanwhile is left as it is (links still back)', [e10, J(EV.get(QK)), PD('Challans', 'DC-C11A') === LA].join('|'), 'sheet down|{"v":3,"f":"CR11mid"}|true');
            var gh = Object.create(db); gh.rows = function (t) { var r = db.rows(t); return t !== 'Items' ? r : r.map(function (x) { return String(x.ItemCode) === 'CR11-IT-1' ? Object.assign({}, x, { Size: '2 m' }) : x; }); };
            BK(); var e11, h11 = FI(); EV.db = function () { return h11() ? gh : dbf0.apply(EV, arguments); }; try { e11 = err(function () { IS(tY, ED(tY, 'CR11-IT-1', CHG)); }); } finally { db.update = u0; EV.db = dbf0; }
            var m11 = EV.get(QK), c11 = PD('Challans', 'DC-C11A') + PD('Challans', 'DC-C11B');
            BK(); var e11b, h11b = FI(); EV.db = function () { if (h11b()) throw new Error('read failed'); return dbf0.apply(EV, arguments); }; try { e11b = err(function () { IS(tY, ED(tY, 'CR11-IT-1', CHG)); }); } finally { db.update = u0; EV.db = dbf0; }
            eq('CR11-11 write failed but the fresh read shows the item changed / can\'t be made: marker stays (quote PDF old), links stay cleared',
              [e11, !!m11 && m11.v === 0, c11, e11b, !!EV.get(QK) && EV.get(QK).v === 0, FR(), PD('Challans', 'DC-C11A')].join('|'), 'sheet down|true||sheet down|true||');
            BK(); var r12 = IS(tY, ED(tY, 'CR11-IT-1', { name: 'CR11 item 2', size: '2 m' }));
            eq('CR11-12 a good Name + Size save: quote marked old, challan links cleared, counted 3', [r12.old, EV.get(QK).v, FR(), PD('Challans', 'DC-C11A'), PD('Challans', 'DC-C11B'), NMx()].join('|'), '3|0||||CR11 item 2/2 m');
            // (4) #4 contract WO change: undo on a throw part way / a failed contract write; links stay cleared once it is saved
            var cW = mkC({ no: 'CR11-WO-1' }), I1 = UR('i'), C1 = UR('c'), WO = function () { return String(must(db, 'Jobs', 'JobNo', cW.job).ClientWONo); };
            db.insert('Invoices', { InvNo: 'INV-C11A', JobNo: cW.job, Status: 'Draft', PDF: I1 }); db.insert('Challans', { ChallanNo: 'DC-C11W', Kind: 'Delivery', JobNo: cW.job, Status: 'Draft', PDF: C1 });
            var CB = function () { u0.call(db, 'Invoices', must(db, 'Invoices', 'InvNo', 'INV-C11A'), { PDF: I1 }); u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C11W'), { PDF: C1 }); };
            var SV = function (no) { return err(function () { cSave(tS, FF(officeContractGet(tS, cW.job), { no: no })); }); };
            var kI = KEPT('INV-C11A'), e13; db.update = function (t, r, p) { if (t === 'Challans' && p && p.PDF === '') throw new Error('cell down'); return u0.apply(db, arguments); }; try { e13 = SV('CR11-WO-2'); } finally { db.update = u0; }
            eq('CR11-13 WO change, the 2nd document\'s clear throws: the invoice link back + kept line, the challan untouched, WO not changed (r10: invoice link lost)',
              [e13, PD('Invoices', 'INV-C11A') === I1, PD('Challans', 'DC-C11W') === C1, KEPT('INV-C11A') - kI, WO()].join('|'), 'cell down|true|true|1|CR11-WO-1');
            CB(); var nl = 0, e14; db.insert = function (t, r) { if (t === 'Log' && r && r.Action === 'PDF out of date' && ++nl === 2) throw new Error('log down'); return i0.apply(db, arguments); }; try { e14 = SV('CR11-WO-2'); } finally { db.insert = i0; }
            eq('CR11-14 the 2nd "PDF out of date" log line fails: the invoice link back, challan untouched, WO not changed', [e14, PD('Invoices', 'INV-C11A') === I1, PD('Challans', 'DC-C11W') === C1, WO()].join('|'), 'log down|true|true|CR11-WO-1');
            CB(); var e15, kI2 = KEPT('DC-C11W'); db.update = function (t) { if (t === 'Jobs') throw new Error('sheet down'); return u0.apply(db, arguments); }; try { e15 = SV('CR11-WO-2'); } finally { db.update = u0; }
            eq('CR11-15 the contract write fails (WO as it was on a fresh read): both links back, logged kept', [e15, PD('Invoices', 'INV-C11A') === I1, PD('Challans', 'DC-C11W') === C1, KEPT('DC-C11W') - kI2, WO()].join('|'), 'sheet down|true|true|1|CR11-WO-1');
            var gj = Object.create(db); gj.rows = function (t) { var r = db.rows(t); return t !== 'Jobs' ? r : r.map(function (x) { return String(x.JobNo) === cW.job ? Object.assign({}, x, { ClientWONo: 'CR11-WO-2' }) : x; }); };
            var FJ = function (fr) { var hit = false; db.update = function (t) { if (t === 'Jobs') { hit = true; throw new Error('sheet down'); } return u0.apply(db, arguments); }; EV.db = function () { return hit ? fr() : dbf0.apply(EV, arguments); }; };
            var out = [];
            [function () { return gj; }, function () { return null; }, function () { throw new Error('read failed'); }].forEach(function (fr) { CB(); FJ(fr); try { out.push(SV('CR11-WO-2')); } finally { db.update = u0; EV.db = dbf0; } out.push(PD('Invoices', 'INV-C11A') + PD('Challans', 'DC-C11W')); });
            eq('CR11-16 contract write failed but the fresh read shows the new WO / none / throws: links stay cleared (safe side)', out.join('|'), 'sheet down||sheet down||sheet down|');
            CB(); var LN2 = UR('n2'), e17; db.update = function (t) { if (t === 'Jobs') { u0.call(db, 'Invoices', must(db, 'Invoices', 'InvNo', 'INV-C11A'), { PDF: LN2 }); throw new Error('sheet down'); } return u0.apply(db, arguments); }; try { e17 = SV('CR11-WO-2'); } finally { db.update = u0; }
            eq('CR11-17 a link written since the clear is not overwritten; the other link back', [e17, PD('Invoices', 'INV-C11A') === LN2, PD('Challans', 'DC-C11W') === C1].join('|'), 'sheet down|true|true');
            CB(); var e18 = SV('CR11-WO-3');
            eq('CR11-18 a good WO change: saved, both links cleared (no put-back)', [e18, WO(), PD('Invoices', 'INV-C11A'), PD('Challans', 'DC-C11W')].join('|'), 'no error|CR11-WO-3||');
          } finally { db.update = u0; db.insert = i0; EV.db = dbf0; }
        })();
