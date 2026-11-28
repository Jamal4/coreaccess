        // ---- M3 CR run 16 (harness only): terms rollback on the stored rows; the lock rule before the print check; Supplier / Sold are not stock
        (function () {
          var rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var EV = oEnv_(), u0 = db.update, i0 = db.insert, up0 = uiPutRow_, sm = QF5_STUB_.make, q5k = qf5Pdf_, tr = [], DA0 = typeof DriveApp === 'undefined' ? undefined : DriveApp;
          var Q = function (no) { return must(db, 'Quotes', 'QuoteNo', no); }, row = function (t, c) { return (t.rows || []).filter(function (x) { return x.code === c; })[0]; };
          var BQ = function (s) { return base({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] }); };
          var dj = function (no) { var j = find(db.rows('Jobs'), 'JobNo', no); if (j) uiDelRows_(db, 'Jobs', [j]); };
          var back = function () { db.update = u0; db.insert = i0; uiPutRow_ = up0; QF5_STUB_.make = sm; qf5Pdf_ = q5k; };
          try {
            DriveApp = { getFileById: function (id) { return { setTrashed: function (v) { tr.push(id + ':' + v); }, isTrashed: function () { return false; }, getDateCreated: function () { throw new Error('no file'); } }; } };
            // (1) L1329: a blank-wording Replace row (shown as standard) survives a save that fails before any row went
            rc(); var Q1 = officeQuoteSave(tS, BQ('CR16 terms')).no; rc(); officeQuoteTerm(tS, Q1, oQTv_(db, oQRow_(db, Q1)), { k: 'add', sec: -1, text: 'CR16 extra' });
            var cid = String(oQTerms_(db, Q(Q1)).base[0].ClauseID); i0.call(db, 'QuoteTerms', { QuoteNo: Q1, ClauseID: cid, Action: 'Replace', Section: '1', ClauseNo: '1.1', Title: '', Text: '', SortOrder: 1 });
            var r0 = qtRows_(db, Q1).slice(), a1 = 0; uiPutRow_ = function (d, t) { if (t === 'Quotes' && !a1++) throw new Error('Service Spreadsheets timed out'); return up0.apply(this, arguments); };
            rc(); var e1; try { e1 = err(function () { officeQuoteTerm(tS, Q1, oQTv_(db, oQRow_(db, Q1)), { k: 'add', sec: -1, text: 'CR16 two' }); }); } finally { back(); }
            var r1 = qtRows_(db, Q1);
            eq('CR16-1 failed before any row went: BUSY, every stored row left as it was, the blank-wording row too (r15: rewritten without it)', [e1, r1.length, r0.length, r1.every(function (r, i) { return r === r0[i]; }), r1.some(function (r) { return r.Action === 'Replace' && blank(r.Text); })].join('|'), 'BUSY|2|2|true|true');
            var dr0 = uiDelRows_, a1b = 0; uiDelRows_ = function (d, t, rows) { if (t === 'QuoteTerms' && rows.length === 2 && !a1b++) { dr0(d, t, [rows[0]]); throw new Error('Service Spreadsheets timed out'); } return dr0.apply(this, arguments); };
            rc(); var e1b; try { e1b = err(function () { officeQuoteTerm(tS, Q1, oQTv_(db, oQRow_(db, Q1)), { k: 'add', sec: -1, text: 'CR16 three' }); }); } finally { uiDelRows_ = dr0; back(); }
            var r1b = qtRows_(db, Q1);
            eq('CR16-1b one of the two rows deleted, then a failure: both back, the blank-wording row too', [e1b, a1b, r1b.length, r1b.some(function (r) { return r.Action === 'Replace' && blank(r.Text); }), r1b.some(function (r) { return /CR16 extra/.test(String(r.Text)); })].join('|'), 'BUSY|1|2|true|true');
            // (4) L1374: the print changed AND the quote got locked during the render -> the lock rule (stored PDF / PDFLOCK), not BUSY
            rc(); var Q4 = officeQuoteSave(tS, BQ('CR16 lock')).no, S4 = 'https://x/cr16stored'; u0.call(db, 'Quotes', Q(Q4), { PDF: S4 }); e5.put('OQP:' + Q4, { v: 'stale', f: oQFid_(S4) });
            var nmk = 0; QF5_STUB_.make = function () { nmk++; i0.call(db, 'Jobs', { JobNo: 'J/CR16/1', QuoteNo: Q4 }); u0.call(db, 'Quotes', Q(Q4), { Attention: 'CR16 changed during render' }); var r = sm.apply(this, arguments); r.url = 'https://drive.google.com/file/d/CR16newfile' + nmk + 'abcdefgh/view'; return r; };
            var m4; try { m4 = officeQuotePdf(tS, Q4); } catch (e) { m4 = { url: 'threw ' + e.message }; } finally { back(); dj('J/CR16/1'); }
            eq('CR16-4a changed + locked during the render, a PDF stored: the stored one back, made false, cell unchanged, the new file binned (r15: BUSY)', [m4.url === S4, m4.made, String(Q(Q4).PDF) === S4, tr.some(function (x) { return /CR16newfile/.test(x) && /:true$/.test(x); })].join('|'), 'true|false|true|true');
            u0.call(db, 'Quotes', Q(Q4), { PDF: '' }); QF5_STUB_.make = function () { nmk++; i0.call(db, 'Jobs', { JobNo: 'J/CR16/2', QuoteNo: Q4 }); u0.call(db, 'Quotes', Q(Q4), { Attention: 'CR16 changed again' }); var r = sm.apply(this, arguments); r.url = 'https://drive.google.com/file/d/CR16newfile' + nmk + 'abcdefgh/view'; return r; };
            var e4b; try { e4b = err(function () { officeQuotePdf(tS, Q4); }); } finally { back(); dj('J/CR16/2'); }
            eq('CR16-4b changed + locked during the render, no PDF: PDFLOCK, cell empty (r15: BUSY)', [e4b, blank(Q(Q4).PDF)].join('|'), 'PDFLOCK|true');
            // (3) L2022: Supplier / Sold balances are not stock
            db.insert('Items', [{ ItemCode: 'CR16-U1', Name: 'CR16 sold out', Unit: 'pc', StockTracked: 'No', IsSet: 'No', Status: 'Active', ReorderLevel: 3 }, { ItemCode: 'CR16-T1', Name: 'CR16 tracked sold out', Unit: 'pc', Category: 'Ringlock', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }]);
            var mv = function (id, it, q, f, t) { db.insert('StockMoves', { MoveID: id, MoveDate: new Date(2026, 10, 4), ItemCode: it, Qty: q, FromLoc: f, ToLoc: t, RefType: 'Challan', RefNo: 'C16' }); };
            ['U1', 'T1'].forEach(function (k, i) { mv('MV-C16-' + i + 'a', 'CR16-' + k, 10, 'LOC-SUPPLIER', 'LOC-YARD'); mv('MV-C16-' + i + 'b', 'CR16-' + k, 10, 'LOC-YARD', 'LOC-SOLD'); });
            var L3 = officeStockList(tY), u3 = row(L3, 'CR16-U1');
            var g3 = officeStockItem(tY, 'CR16-T1'), s3; rc(); s3 = err(function () { officeItemSave(tY, { code: 'CR16-T1', ev: g3.ev, name: g3.name, cat: g3.cat, size: g3.size, unit: g3.unit, kg: '', reorder: '', status: 'Active', tracked: 'No', isSet: 'No', forHire: g3.forHire ? 'Yes' : 'No', forSale: g3.forSale ? 'Yes' : 'No' }); });
            eq('CR16-3 10 in from Supplier, all 10 sold: untracked -> catalogue only, not low; tracked -> tracking can go off (r15: -10 Supplier / +10 Sold counted as stock)', [u3.cata, u3.low, s3, must(db, 'Items', 'ItemCode', 'CR16-T1').StockTracked].join('|'), 'true|false|no error|No');
            mv('MV-C16-9', 'CR16-T1', 1, 'LOC-SUPPLIER', 'LOC-REPAIR'); var g3b = officeStockItem(tY, 'CR16-T1');
            db.update('Items', must(db, 'Items', 'ItemCode', 'CR16-T1'), { StockTracked: 'Yes' }); var g3c = officeStockItem(tY, 'CR16-T1');
            rc(); var s3b = err(function () { officeItemSave(tY, { code: 'CR16-T1', ev: g3c.ev, name: g3c.name, cat: g3c.cat, size: g3c.size, unit: g3c.unit, kg: '', reorder: '', status: 'Active', tracked: 'No', isSet: 'No', forHire: g3c.forHire ? 'Yes' : 'No', forSale: g3c.forSale ? 'Yes' : 'No' }); });
            eq('CR16-3b 1 in Repair: stock -> tracking stays on', s3b, 'BADINPUT|stock tracked');
          } finally { back(); DriveApp = DA0; }
        })();
