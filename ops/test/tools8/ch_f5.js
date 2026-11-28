        // ---- r34 F5 (harness only, real rules): CH-86 picker shows every quote, CH-87 no Hire-in / Off-hire / direct-from-supplier, CH-88 vendor Return,
        // CH-89 / CH-90 own stock short = from outside (Post never refused), CH-91 step R (cancel / retry)
        (function () { var LAST = '', EQ = function (n) { LAST = n; return eq.apply(this, arguments); }; try {
          var tA = add('chf5a@t.com', { PS: 2, YW: 2 }), tH = add('chf5h@t.com', { PS: 3, YW: 3 }), rc = function () { ['chf5a@t.com', 'chf5h@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var SV = function (t, c) { rc(); return officeChallanSave(t, c); }, PO = function (t, no, veh) { rc(); return officeChallanPost(t, no, officeChallanGet(t, no).ev, veh); };
          var CX = function (t, no) { rc(); return officeChallanCancel(t, no, officeChallanGet(t, no).ev, 'test'); }, E = function (f) { return String(err(f)).split('|').slice(0, 2).join('|'); };
          var mv = function (no) { return db.rows('StockMoves').filter(function (v) { return v.RefNo === no && v.RefType === 'Challan'; }); }, sq = function (a) { return a.reduce(function (s, v) { return s + num(v.Qty); }, 0); };
          var T = function (f) { var n = LAST; try { f(); } catch (e) { eq('CH-F5 crash after ' + (n || 'start').slice(0, 6), String(e && e.message || e).slice(0, 160), 'no crash'); } }; // each test on its own
          var Y = 'CH5-YARD', J = 'CAE/J/2026/891', JQ = 'CAE/Q/2026/891', QN = 'CAE/Q/2026/892', QL = 'CAE/Q/2026/893', I = 'CH5-STD', K = 'CH5-SET', P = 'CH5-PRT';
          ['LOC-SUPPLIER|Supplier', 'LOC-SOLD|Sold', 'LOC-REPAIR|Repair', 'LOC-LOST|Lost', Y + '|Yard'].forEach(function (x) { var p = x.split('|'); if (!find(db.rows('Locations'), 'LocID', p[0])) db.insert('Locations', { LocID: p[0], Name: p[0], Type: p[1], SiteID: '', Status: 'Active' }); });
          db.insert('Sites', { SiteID: 'SITE-0891', CustID: 'CUST-0001', Project: 'F5 site', Address: 'x' });
          db.insert('Items', [{ ItemCode: I, Name: 'F5 standard', Unit: 'pc', WeightKg: 10, StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: P, Name: 'F5 part', Unit: 'pc', WeightKg: 1, StockTracked: 'Yes', IsSet: 'No', Status: 'Active' },
            { ItemCode: K, Name: 'F5 set', Category: 'Set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' }]);
          db.insert('KitParts', { KitPartID: 'KP-F5', SetCode: K, ItemCode: P, QtyPerSet: 4 });
          db.insert('Quotes', [{ QuoteNo: JQ, Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0891', Status: 'Accepted' }, { QuoteNo: QN, Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0891', Status: 'Sent' },
            { QuoteNo: QL, Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0891', Status: 'Lost' }]);
          db.insert('Jobs', { JobNo: J, QuoteNo: JQ, CustID: 'CUST-0001', SiteID: 'SITE-0891', JobType: 'Rental', HireBasis: 'Item', Status: 'Awaiting order' });
          postOpeningStock(db, [{ ItemCode: I, Qty: 19, LocID: Y }, { ItemCode: P, Qty: 6, LocID: Y }], new Date(2026, 10, 1));
          var yard = function (c) { return stockAt(db, c, Y); }, hire = function (c) { return Math.round((onHire(db, J)[c] || 0) * 100) / 100; }, D = '2026-11-20';
          // CH-86 (F5-a): every open quote is in the picker (with its job if it has one); the job entry carries its quote no.; a Lost quote is not; picking a job's quote saves on that job
          T(function () { var res = [], L = officeChallanList(tA), q = function (n) { return (L.quotes || []).filter(function (x) { return x.no === n; })[0]; }, j = (L.jobs || []).filter(function (x) { return x.no === J; })[0];
            res.push(q(JQ) ? 'job quote listed:' + q(JQ).job : 'job quote hidden', q(QN) ? 'new quote listed:' + (q(QN).job || 'no job') : 'new quote hidden', q(QL) ? 'lost listed' : 'lost hidden', j ? 'job quote ' + j.quote : 'no job');
            var s = SV(tA, { kind: 'Delivery', quote: JQ, from: Y, date: D, veh: 'V', lines: [{ it: I, q: 1 }] }), c = find(db.rows('Challans'), 'ChallanNo', s.no); res.push(c.JobNo === J && blank(c.QuoteNo) ? 'on the job' : 'not on the job');
            CX(tA, s.no);
            EQ('CH-86 picker: every open quote (with its job), job entries carry the quote no., Lost hidden; a job\'s quote saves on the job', res.join('|'), 'job quote listed:' + J + '|new quote listed:no job|lost hidden|job quote ' + JQ + '|on the job'); });
          // CH-87 (F5-b): Hire-in / Off-hire no longer made; Delivery 'direct from a rental supplier' refused (Material source: Vendor rental instead); an old Hire-in draft is not posted
          T(function () { var res = [];
            res.push(E(function () { SV(tH, { kind: 'Hire-in', sup: 'SUP-0001', sref: 'X', to: Y, date: D, lines: [{ it: I, q: 1 }] }); }), E(function () { SV(tH, { kind: 'Off-hire', sup: 'SUP-0001', from: Y, date: D, lines: [{ it: I, q: 1 }] }); }));
            res.push(E(function () { SV(tA, { kind: 'Delivery', job: J, from: 'LOC-SUPPLIER', sup: 'SUP-0001', sref: 'X', date: D, veh: 'V', lines: [{ it: I, q: 1 }] }); }));
            db.insert('Challans', { ChallanNo: 'CAE/DC/2026/891', Kind: 'Hire-in', Status: 'Draft', ChallanDate: new Date(2026, 10, 20), FromLoc: 'LOC-SUPPLIER', ToLoc: Y, SupID: 'SUP-0001', SupplierRef: 'X' });
            db.insert('ChallanLines', { LineID: 'CL-F5H', ChallanNo: 'CAE/DC/2026/891', ItemCode: I, Qty: 1 });
            res.push(E(function () { PO(tH, 'CAE/DC/2026/891'); }).split('|')[0], String(find(db.rows('Challans'), 'ChallanNo', 'CAE/DC/2026/891').Status), String(mv('CAE/DC/2026/891').length));
            var gh = officeChallanGet(tH, 'CAE/DC/2026/891'); res.push(gh.canEdit || gh.canPost ? 'edit/post offered' : 'discard only', gh.canCancel ? 'discard' : 'no discard');
            CX(tH, 'CAE/DC/2026/891'); res.push(String(find(db.rows('Challans'), 'ChallanNo', 'CAE/DC/2026/891').Status));
            EQ('CH-87 no new Hire-in / Off-hire / direct-from-supplier; an old Hire-in draft: Post refused, Discard works', res.join('|'), 'BADINPUT|kind|BADINPUT|kind|BADINPUT|from|NOTPOSTED|Draft|0|discard only|discard|Cancelled'); });
          // CH-88 (F5-b): vendor Delivery 10 + vendor Return 6: no StockMoves either way, our stock / on hire unchanged; list shows 4 still out; a Return of 5 more refused;
          // cancel of the vendor Delivery refused (6 came back); Return PDF: To = the vendor (collected from site), related = that vendor delivery
          T(function () { var res = [], y0 = yard(I), h0 = hire(I);
            var d = SV(tA, { kind: 'Delivery', job: J, src: 'Vendor', newSup: { name: 'F5 Vendor (test)', phone: '1', addr: 'a' }, sref: 'VDO-1', date: D, lines: [{ it: I, q: 10 }] }); PO(tA, d.no);
            var sup = String(find(db.rows('Challans'), 'ChallanNo', d.no).SupID);
            var r = SV(tA, { kind: 'Return', job: J, src: 'Vendor', sup: sup, sref: 'VRN-1', date: D, lines: [{ it: I, g: 5, dm: 1 }] }), rc0 = find(db.rows('Challans'), 'ChallanNo', r.no);
            res.push(String(rc0.MatSource) + ':' + (rc0.ToLoc === LOC.SUPPLIER ? 'to vendor' : rc0.ToLoc));
            PO(tA, r.no); res.push(String(find(db.rows('Challans'), 'ChallanNo', r.no).Status), String(mv(d.no).length + mv(r.no).length), yard(I) === y0 && hire(I) === h0 ? 'stock same' : 'stock changed', db.rows('Damage').some(function (x) { return x.ChallanNo === r.no; }) ? 'damage row' : 'no damage row');
            var vo = (officeChallanList(tA).vout || {})[J] || {}; res.push('out ' + ((vo[sup] || {})[I] || 0));
            var r2_ = SV(tA, { kind: 'Return', job: J, src: 'Vendor', sup: sup, date: D, lines: [{ it: I, g: 5 }] }); res.push(E(function () { PO(tA, r2_.no); }).split('|')[0]);
            res.push(E(function () { CX(tH, d.no); }).split('|')[0], String(find(db.rows('Challans'), 'ChallanNo', d.no).Status));
            var pr = PDF_SPECS.Challan(db, r.no).blocks.filter(function (b) { return b.t === 'pairs'; })[0].rows, to = pr.filter(function (x) { return x[0] === 'To'; })[0];
            res.push(/F5 Vendor/.test(to[1]) && /collected from site/.test(to[1]) && /VRN-1/.test(to[1]) ? 'pdf to vendor' : to[1], to[3] === d.no ? 'related vendor DO' : to[3]);
            CX(tA, r2_.no);
            EQ('CH-88 vendor Return: no moves / damage rows, stock + on hire unchanged, 4 still out, over-return refused, delivery cancel refused, PDF To = vendor', res.join('|'),
              'Vendor:to vendor|Posted|0|stock same|no damage row|out 4|NOTPOSTED|NOCANCEL|Posted|pdf to vendor|related vendor DO'); });
          // CH-89 (F5-c): yard 19, Delivery 29: Post allowed, 19 move (yard 0), 10 from outside (QtyOut, no moves), 29 on hire; view shows outside 10;
          // Return 29 good: 19 back to the yard, 10 outside (no moves), 0 on hire; returning more than on hire still refused
          T(function () { var res = [], d = SV(tA, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: I, q: 29 }] }); PO(tA, d.no);
            var l = db.rows('ChallanLines').filter(function (x) { return x.ChallanNo === d.no; })[0], g = officeChallanGet(tA, d.no);
            res.push(String(find(db.rows('Challans'), 'ChallanNo', d.no).Status), 'moved ' + sq(mv(d.no)), 'out ' + l.QtyOut, 'yard ' + yard(I), 'hire ' + hire(I), 'view out ' + ((g.out || {})[I] || 0));
            res.push(E(function () { var x = SV(tA, { kind: 'Return', job: J, to: Y, date: D, lines: [{ it: I, g: 30 }] }); try { PO(tA, x.no); } finally { CX(tA, x.no); } }).split('|')[0]);
            var r = SV(tA, { kind: 'Return', job: J, to: Y, date: D, lines: [{ it: I, g: 29 }] }); PO(tA, r.no);
            var rl = db.rows('ChallanLines').filter(function (x) { return x.ChallanNo === r.no; })[0];
            res.push(String(find(db.rows('Challans'), 'ChallanNo', r.no).Status), 'back ' + sq(mv(r.no)), 'out ' + rl.QtyOut, 'yard ' + yard(I), 'hire ' + hire(I), 'view out ' + ((officeChallanGet(tA, r.no).out || {})[I] || 0));
            EQ('CH-89 own stock short: Delivery 29 from 19 posts (19 moved, 10 outside, 29 on hire); Return 29: 19 back, 10 outside, 0 on hire; over-return refused', res.join('|'),
              'Posted|moved 19|out 10|yard 0|hire 29|view out 10|NOTPOSTED|Posted|back 19|out 10|yard 19|hire 0|view out 10'); });
          // CH-90 (F5-c): a Sale and a set short too: Sale of 25 from 19 own moves 19 (rest outside); 2 sets need 8 parts, the yard has 6: 6 move, 2 outside, 2 sets on hire;
          // a Return with damage on outside items: only our own part makes Damage rows (none here: 0 own left on site)
          T(function () { var res = [], JS = 'CAE/J/2026/892';
            db.insert('Jobs', { JobNo: JS, CustID: 'CUST-0001', SiteID: 'SITE-0891', JobType: 'Sale', HireBasis: 'Item', Status: 'Awaiting order' });
            var s = SV(tA, { kind: 'Sale', job: JS, from: Y, date: D, veh: 'V', lines: [{ it: I, q: 25 }] }); PO(tA, s.no);
            res.push(String(find(db.rows('Challans'), 'ChallanNo', s.no).Status), 'sold ' + sq(mv(s.no)), 'yard ' + yard(I));
            var k = SV(tA, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: K, q: 2 }] }); PO(tA, k.no);
            res.push(String(find(db.rows('Challans'), 'ChallanNo', k.no).Status), 'parts ' + sq(mv(k.no)), 'sets on hire ' + hire(K), 'view out ' + ((officeChallanGet(tA, k.no).out || {})[P] || 0));
            var d = SV(tA, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: I, q: 5 }] }); PO(tA, d.no);
            var r = SV(tA, { kind: 'Return', job: J, to: Y, date: D, lines: [{ it: I, g: 3, dm: 2 }] }); PO(tA, r.no);
            res.push('ret moves ' + mv(r.no).length, db.rows('Damage').filter(function (x) { return x.ChallanNo === r.no; }).length + ' damage rows', 'hire ' + hire(I));
            EQ('CH-90 Sale short posts own only; a set short posts the parts we have (sets on hire in full); outside damaged items make no Damage row', res.join('|'),
              'Posted|sold 19|yard 0|Posted|parts 6|sets on hire 2|view out 2|ret moves 0|0 damage rows|hire 0'); });
          // CH-91 (step R): cancel a posted Delivery whose outside qty already came back: refused; with it still out: cancelled, on hire back;
          // a post whose moves insert throws after QtyOut was written: still a Draft, the next Post moves once
          T(function () { var res = [];
            postOpeningStock(db, [{ ItemCode: I, Qty: 2, LocID: Y }], new Date(2026, 10, 2));
            var d = SV(tA, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: I, q: 4 }] }); PO(tA, d.no);
            var r = SV(tA, { kind: 'Return', job: J, to: Y, date: D, lines: [{ it: I, g: 4 }] }); PO(tA, r.no);
            res.push(E(function () { CX(tH, d.no); }).split('|')[0], String(find(db.rows('Challans'), 'ChallanNo', d.no).Status));
            CX(tH, r.no); res.push('hire ' + hire(I)); CX(tH, d.no); res.push(String(find(db.rows('Challans'), 'ChallanNo', d.no).Status), 'hire ' + hire(I), 'yard ' + yard(I));
            var f = SV(tA, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: I, q: 5 }] }), ins = db.insert, n = 0;
            db.insert = function (t) { if (t === 'StockMoves' && !n++) throw new Error('sheet busy'); return ins.apply(this, arguments); };
            try { res.push(E(function () { PO(tA, f.no); }).split('|')[0]); } finally { db.insert = ins; }
            var fl = db.rows('ChallanLines').filter(function (x) { return x.ChallanNo === f.no; })[0];
            res.push(String(find(db.rows('Challans'), 'ChallanNo', f.no).Status), 'out ' + fl.QtyOut); PO(tA, f.no);
            res.push(String(find(db.rows('Challans'), 'ChallanNo', f.no).Status), 'moved ' + sq(mv(f.no)), 'out ' + db.rows('ChallanLines').filter(function (x) { return x.ChallanNo === f.no; })[0].QtyOut, 'hire ' + hire(I));
            EQ('CH-91 step R: cancel refused once outside items came back, fine while out; a failed moves insert leaves a Draft, the next Post moves once', res.join('|'),
              'NOCANCEL|Posted|hire 4|Cancelled|hire 0|yard 2|NOTPOSTED|Draft|out 3|Posted|moved 2|out 3|hire 5'); });
          // CH-92 (step R): a Return posted on the sheet-panel / field-app path (postChallan, no office option) brings back only our own items: outside ones never enter the yard
          T(function () { var res = [], y0 = yard(I);
            var d = SV(tA, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: I, q: y0 + 3 }] }); PO(tA, d.no);
            var r = SV(tA, { kind: 'Return', job: J, to: Y, date: D, lines: [{ it: I, g: y0 + 3 }] }); postChallan(db, r.no);
            res.push(String(find(db.rows('Challans'), 'ChallanNo', r.no).Status), 'yard ' + (yard(I) - y0), 'site own ' + Math.round(chOwnMap_(db, J)[I + '|' + String(must(db, 'Challans', 'ChallanNo', d.no).ToLoc)][''] || 0) * 100 / 100, 'out ' + db.rows('ChallanLines').filter(function (x) { return x.ChallanNo === r.no; })[0].QtyOut, 'hire ' + hire(I));
            EQ('CH-92 strict-path Return (own 2 on site + 3 outside out): posted, only our 2 back to the yard, site own 0 (not -1), 1 outside, 5 still on hire', res.join('|'), 'Posted|yard 2|site own 0|out 1|hire 5'); });
        } catch (e) { eq('CH-F5 crashed after ' + LAST.slice(0, 6), String(e && e.stack || e).slice(0, 400), 'no crash'); } })();
