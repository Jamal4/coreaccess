        // ---- M3 CR run 5 (harness only): panel fix clears only its own link; KitParts read as the challan reads it; repeated codes; first row wins
        (function () {
          var J = JSON.stringify, rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var row = function (L, c) { return L.rows.filter(function (x) { return x.code === c; })[0] || null; };
          var lg = function (ref) { return db.rows('Log').filter(function (r) { return r.Action === 'PDF out of date' && r.Ref === ref; }); };
          var QP = function (n) { return String(must(db, 'Quotes', 'QuoteNo', n).PDF || ''); };
          // ---- (5) oPeFix_: clears the cell only while it still holds this run's link
          var Q = officeQuoteSave(tS, (rc(), base({ subject: 'CR5 pdf', lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] }))).no;
          var fx = function (cell, url) { db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q), { PDF: cell }); var n0 = oPeGet_(e5).n; oPeBump_(e5, [Q]); var k = OPE_RUN_, u0 = db.update, nu = 0, l0 = lg(Q).length;
            db.update = function (t, r, p) { if (t === 'Quotes' && p && p.PDF === '') nu++; return u0.apply(db, arguments); }; OPE_RUN_ = { n: n0, hit: [], made: [] };
            try { OPE_RUN_.made.push({ db: db, what: 'Quote', no: Q, r: { url: url } }); oPeCheck_(OPE_RUN_); return [QP(Q), nu, OPE_RUN_.hit.join(','), lg(Q).length - l0, /another link/.test((lg(Q).slice(-1)[0] || {}).Details || '')].join('|'); } finally { OPE_RUN_ = k; db.update = u0; } };
          var A = 'https://drive.google.com/file/d/CR5panelAabcdefghijklmn/view', B = 'https://drive.google.com/file/d/CR5officeBabcdefghijklm/view';
          eq('CR5-1 (CR run 9) a changed document: the panel never writes or clears its cell (whatever it holds stays), warned, logged', fx(A, A), A + '|0|' + Q + '|1|false');
          eq('CR5-2 the cell holds a newer link (an office PDF made after the change): kept, the panel still warned, logged', fx(B, A), B + '|0|' + Q + '|1|false');
          eq('CR5-3 the cell is blank (the office edit cleared it): nothing written, warned', fx('', A), '|0|' + Q + '|1|false');
          // the cell read fresh from the sheet (SheetDb): a cached read can still show this run's link after the office PDF replaced it
          var cell = { 3: B }, fu = [], lg0 = log_, qr = { QuoteNo: 'Q-C5F', PDF: A, _r: 3 };
          var FD = { ss: {}, hasTab: function () { return true; }, headers: function () { return ['QuoteNo', 'PDF']; }, sheet: function () { return { getRange: function (r, c) { return { getValue: function () { return c === 2 ? (cell[r] || '') : 'x'; } }; } }; },
            rows: function () { return [qr]; }, update: function (t, r, p) { fu.push(J(p)); r.PDF = p.PDF; cell[r._r] = p.PDF; } };
          var n11 = oPeGet_(e5).n, k11 = OPE_RUN_, h11; oPeBump_(e5, ['Q-C5F']); log_ = function () {};
          try { OPE_RUN_ = { n: n11, hit: [], made: [{ db: FD, what: 'Quote', no: 'Q-C5F', r: { url: A } }] }; oPeCheck_(OPE_RUN_); h11 = OPE_RUN_.hit.join(','); } finally { OPE_RUN_ = k11; log_ = lg0; }
          eq('CR5-11 the check reads the cell from the sheet (cached row still shows this run\'s link, the sheet holds the office link): office link kept, nothing written, warned', [cell[3] === B, fu.length, h11].join('|'), 'true|0|Q-C5F');
          // end to end: panel quotePdf; meanwhile an office edit and an office PDF of the same quote (separate executions in real life)
          var uR0 = uiRun_, q5k = QF5_STUB_, mk0 = OPE_makePdf0_, nU = 0, mid = null;
          uiRun_ = function (fn) { return uiClean_(withLock(function () { return fn(db); })); };
          QF5_STUB_ = { drive: { name: function () { return 'old.pdf'; }, trash: function () {} } };
          OPE_makePdf0_ = function (d, what, no, o) { var u = 'https://drive.google.com/file/d/CR5mk' + (++nU) + 'abcdefghijklmnop/view'; if (mid) { var f = mid; mid = null; f(); }
            var t = { Quote: ['Quotes', 'QuoteNo'], Challan: ['Challans', 'ChallanNo'] }[what], r = find(d.rows(t[0]), t[1], no); if (r && !(o && o.noLink)) d.update(t[0], r, { PDF: u }); return { url: u, file: no + '.pdf', placeholders: 0 }; };
          var P4, B4;
          try {
            db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q), { PDF: '' });
            mid = function () { var k = OPE_RUN_; OPE_RUN_ = null; try { rc(); var F = officeQuoteForm(tS, Q).quote; officeQuoteSave(tS, base({ no: Q, ev: F.ev, subject: 'CR5 pdf', lines: [{ code: 'RL-STD-20', desc: 'std', qty: 3, unit: 'pc / month', rate: 50 }] }));
              B4 = officeQuotePdf(tS, Q).url; } finally { OPE_RUN_ = k; } };
            // the office PDF is made inside the panel's make (mid), but its link must be written after the panel's: write it again at the end of the office make
            var mk1 = OPE_makePdf0_; OPE_makePdf0_ = function (d, what, no, o) { var r = mk1.apply(this, arguments); if (B4) d.update('Quotes', find(d.rows('Quotes'), 'QuoteNo', no), { PDF: B4 }); return r; };
            P4 = uiDo('quotePdf', { quoteNo: Q }); OPE_makePdf0_ = mk1;
          } finally { uiRun_ = uR0; QF5_STUB_ = q5k; OPE_makePdf0_ = mk0; OPE_RUN_ = null; mid = null; }
          eq('CR5-4 end to end: panel PDF from old data, then the office PDF (new data) in the cell: the office link is kept, the panel warns, its own link is not', [!!B4, QP(Q) === B4, !!P4.warn, /CR5mk1abc/.test(QP(Q))].join('|'), 'true|true|true|false');
          // ---- (3) KitParts: as the challan reads it
          db.insert('Items', [{ ItemCode: 'CR5-P1', Name: 'CR5 part 1', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CR5-P2', Name: 'CR5 part 2', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' },
            { ItemCode: 'CR5-UT', Name: 'CR5 untracked', Unit: 'pc', StockTracked: 'No', IsSet: 'No', Status: 'Active' }]);
          ['CR5-S1', 'CR5-S2', 'CR5-S3', 'CR5-S4', 'CR5-S5', 'CR5-S6', 'CR5-S7'].forEach(function (s) { db.insert('Items', { ItemCode: s, Name: s, Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' }); });
          db.insert('StockMoves', [{ MoveID: 'MV-C5A', MoveDate: new Date(2026, 10, 2), ItemCode: 'CR5-P1', FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', Qty: 8, RefType: 'Opening' }, { MoveID: 'MV-C5B', MoveDate: new Date(2026, 10, 2), ItemCode: 'CR5-P2', FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', Qty: 20, RefType: 'Opening' }]);
          db.insert('KitParts', [{ KitPartID: 'KP-C5A', SetCode: 'CR5-S1', ItemCode: 'CR5-P1', QtyPerSet: 3 }, { KitPartID: 'KP-C5B', SetCode: 'CR5-S1', ItemCode: 'CR5-P1', QtyPerSet: 4 }, { KitPartID: 'KP-C5C', SetCode: 'CR5-S1', ItemCode: 'CR5-P2', QtyPerSet: 2 },
            { KitPartID: 'KP-C5D', SetCode: 'CR5-S2', ItemCode: 'CR5-P2', QtyPerSet: 2 }, { KitPartID: 'KP-C5E', SetCode: 'CR5-S2', ItemCode: 'CR5-NONE', QtyPerSet: 1 },
            { KitPartID: 'KP-C5F', SetCode: 'CR5-S3', ItemCode: 'CR5-P2', QtyPerSet: 2 }, { KitPartID: 'KP-C5G', SetCode: 'CR5-S3', ItemCode: 'CR5-S1', QtyPerSet: 1 },
            { KitPartID: 'KP-C5H', SetCode: 'CR5-S4', ItemCode: 'CR5-P2', QtyPerSet: 2 }, { KitPartID: 'KP-C5I', SetCode: 'CR5-S4', ItemCode: 'CR5-UT', QtyPerSet: 1 },
            { KitPartID: 'KP-C5J', SetCode: 'CR5-S5', ItemCode: 'CR5-P2', QtyPerSet: 2 }, { KitPartID: 'KP-C5K', SetCode: 'CR5-S5', ItemCode: 'CR5-P1', QtyPerSet: -1 },
            { KitPartID: 'KP-C5L', SetCode: 'CR5-S6', ItemCode: 'CR5-P2', QtyPerSet: 2 }, { KitPartID: 'KP-C5M', SetCode: 'CR5-S6', ItemCode: '', QtyPerSet: 1 },
            { KitPartID: 'KP-C5N', SetCode: 'CR5-S7', ItemCode: 'CR5-P1', QtyPerSet: 0 }]);
          var L = officeStockList(tY), S1 = row(L, 'CR5-S1'), V1 = officeStockItem(tY, 'CR5-S1'), kp = kitParts_(db, 'CR5-S1'), VP = officeStockItem(tY, 'CR5-P1');
          eq('CR5-5 one part on two rows (3 + 4) is added up as the challan does (7 per set): 8 in the yard -> 1 set (not 2); one kit row; the part lists the set once with 7',
            [S1.make, S1.parts, !!S1.kitBad, J(V1.kit.map(function (p) { return [p.code, p.q, p.yard]; })), J(kp), J(VP.sets.map(function (s) { return [s.code, s.q]; }))].join('|'),
            '1|2|false|[["CR5-P1",7,8],["CR5-P2",2,20]]|[{"item":"CR5-P1","qty":7},{"item":"CR5-P2","qty":2}]|[["CR5-S1",7]]');
          var bad = ['CR5-S2', 'CR5-S3', 'CR5-S4', 'CR5-S5', 'CR5-S6', 'CR5-S7'].map(function (s) { var r = row(L, s), ch = err(function () { kitParts_(db, s); }); return [s, r.make, r.kitBad, ch !== 'no error', officeStockItem(tY, s).kitBad].join(','); });
          eq('CR5-6 a parts list the challan refuses (part not in Items / itself a set / not tracked / qty below or at 0 / blank part / only bad rows): can make 0, flagged; kitParts_ throws for each',
            bad.join(' ; '), 'CR5-S2,0,true,true,true ; CR5-S3,0,true,true,true ; CR5-S4,0,true,true,true ; CR5-S5,0,true,true,true ; CR5-S6,0,true,true,true ; CR5-S7,0,true,true,true');
          var good = L.rows.filter(function (x) { return x.isSet; }).filter(function (x) { var ok = true; try { kitParts_(db, x.code); } catch (e) { ok = false; } return ok === !!x.kitBad; }).map(function (x) { return x.code; });
          eq('CR5-7 every set in the list: flagged exactly when the challan would refuse it', good.join(','), '');
          // ---- repeated codes: the first row wins, as find() does everywhere else
          db.insert('Items', { ItemCode: 'CR5-P2', Name: 'CR5 duplicate row', Unit: 'kg', StockTracked: 'No', IsSet: 'No', Status: 'Active' });
          var L2 = officeStockList(tY), d2 = L2.rows.filter(function (x) { return x.code === 'CR5-P2'; });
          eq('CR5-8 an item code on two Items rows (the second untracked): listed once, the first row (as officeStockItem / find); the set using it read with the first row too (as kitParts_)', [d2.length, d2[0].name, d2[0].unit, officeStockItem(tY, 'CR5-P2').name, !!row(L2, 'CR5-S1').kitBad, err(function () { kitParts_(db, 'CR5-S1'); })].join('|'), '1|CR5 part 2|pc|CR5 part 2|false|no error');
          db.insert('Locations', { LocID: 'LOC-YARD', Name: 'Duplicate yard row', Type: 'Scrap', Status: 'Active' });
          var g9 = officeStockItem(tY, 'CR5-P2');
          eq('CR5-9 a LocID on two Locations rows: the first row wins (as find() in the challans): yard stock still counted as yard', [g9.yard, oStLocs_(db)['LOC-YARD'].Name === find(db.rows('Locations'), 'LocID', 'LOC-YARD').Name].join('|'), '20|true');
          db.rows('Locations').filter(function (l) { return l.Name === 'Duplicate yard row'; }).forEach(function (l) { db.update('Locations', l, { LocID: 'LOC-DUP-X' }); });
          db.rows('Items').filter(function (i) { return i.Name === 'CR5 duplicate row'; }).forEach(function (i) { db.update('Items', i, { ItemCode: 'CR5-DUPX' }); });
          // ---- the count date: the server is the only judge (the page no longer checks a cached day)
          var tY0 = oDayOf_(e5.now()), tm = new Date(e5.now() + 864e5), tom = oDayOf_(tm.getTime ? tm.getTime() : +tm);
          var ob = function (d) { rc(); return err(function () { officeStockOpening(add('ywh5@t.com', { YW: 3 }), { date: d, rows: [{ item: 'CR5-P2', loc: 'LOC-REPAIR', qty: 1 }] }); }); };
          eq('CR5-10 count date: tomorrow refused (BADINPUT|count date); today accepted', [ob(tom), ob(tY0)].join('|'), 'BADINPUT|count date|no error');
        })();
