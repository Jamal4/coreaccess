        // ---- M3 CR run 4 (harness only): (1) unit fixed once the item is in use; (2) quote edits counted (OPE) before their first write
        (function () {
          var J = JSON.stringify, rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IT = function (c) { return must(db, 'Items', 'ItemCode', c); }, IS = function (t, d) { rc(); return officeItemSave(t, d); };
          var NI = function (o) { return Object.assign({ code: 'CR4-U1', name: 'CR4 item', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 4, reorder: 0, status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          var nLog = function (ref, a) { return db.rows('Log').filter(function (r) { return r.Ref === ref && (!a || r.Action === a); }).length; };
          var UL = function (c) { return officeStockItem(tY, c).ulk; };
          // ---- (1) unit
          ['CR4-U1', 'CR4-U2', 'CR4-U3', 'CR4-U4', 'CR4-U5', 'CR4-U6', 'CR4-U7', 'CR4-U8'].forEach(function (c) { IS(tY, NI({ code: c })); });
          var u0 = UL('CR4-U1'), l1 = nLog('CR4-U1', 'Item updated'), a1 = IS(tY, ED(tY, 'CR4-U1', { unit: 'kg' }));
          eq('CR4-1 an unused item (no stock, moves, set parts or lines): the unit can change; logged; still not fixed', [u0, a1.code, IT('CR4-U1').Unit, nLog('CR4-U1', 'Item updated') - l1, UL('CR4-U1')].join('|'), 'false|CR4-U1|kg|1|false');
          db.insert('StockMoves', [{ MoveID: 'MV-C4A', MoveDate: new Date(2026, 10, 2), ItemCode: 'CR4-U2', FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', Qty: 100, RefType: 'Opening' },
            { MoveID: 'MV-C4B', MoveDate: new Date(2026, 10, 3), ItemCode: 'CR4-U3', FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', Qty: 5, RefType: 'Opening' },
            { MoveID: 'MV-C4C', MoveDate: new Date(2026, 10, 4), ItemCode: 'CR4-U3', FromLoc: 'LOC-YARD', ToLoc: 'LOC-SCRAP', Qty: 5, RefType: 'Adjust' }]);
          var n2 = oPeGet_(e5).n, l2 = nLog('CR4-U2'), g2 = officeStockItem(tY, 'CR4-U2'), b2 = err(function () { IS(tY, ED(tY, 'CR4-U2', { unit: 'kg', name: 'CR4 not saved' })); });
          eq('CR4-2 100 pc in stock (moves): unit change refused before any write (name with it not saved, no log, nothing counted); the view says fixed; owned still 100 pc',
            [g2.ulk, b2, IT('CR4-U2').Unit, IT('CR4-U2').Name, nLog('CR4-U2') - l2, oPeGet_(e5).n - n2, g2.own, g2.unit].join('|'), 'true|BADINPUT|unit|pc|CR4 item|0|0|100|pc');
          var c2 = IS(tY, ED(tY, 'CR4-U2', { name: 'CR4 renamed', unit: 'pc' }));
          eq('CR4-3 same item: other changes with the unit as it is still save', [c2.code, IT('CR4-U2').Name, IT('CR4-U2').Unit].join('|'), 'CR4-U2|CR4 renamed|pc');
          var b3 = err(function () { IS(tY, ED(tY, 'CR4-U3', { unit: 'kg' })); });
          eq('CR4-4 moves that net to 0 (no stock left) still fix the unit (the move history is in pc)', [officeStockItem(tY, 'CR4-U3').own, UL('CR4-U3'), b3, IT('CR4-U3').Unit].join('|'), '0|true|BADINPUT|unit|pc');
          db.insert('Challans', { ChallanNo: 'DC-C4A', Kind: 'Delivery', Status: 'Draft', PDF: 'https://x/c4a' });
          db.insert('ChallanLines', { LineID: 'CL-C4A', ChallanNo: 'DC-C4A', ItemCode: ' cr4-u4 ', Qty: 3 });
          db.insert('Damage', { DamageID: 'DMG-C4A', ChallanNo: 'DC-C4X', ItemCode: 'CR4-U5', QtyDamaged: 1, QtyLost: 0, Status: 'Open' });
          db.insert('POLines', { LineID: 'POL-C4A', PONo: 'PO-C4X', ItemCode: 'CR4-U6', Description: 'x', Unit: 'pc', Qty: 10, Rate: 1 });
          var n4 = oPeGet_(e5).n, r4 = ['CR4-U4', 'CR4-U5', 'CR4-U6'].map(function (c) { return [UL(c), err(function () { IS(tY, ED(tY, c, { unit: 'kg' })); }), IT(c).Unit].join(','); });
          eq('CR4-5 a draft challan line (code trimmed / any case), a damage line, a PO line: each fixes the unit; refused, nothing counted, the open challan PDF link kept',
            [r4.join(' / '), oPeGet_(e5).n - n4, String(must(db, 'Challans', 'ChallanNo', 'DC-C4A').PDF)].join('|'), 'true,BADINPUT|unit,pc / true,BADINPUT|unit,pc / true,BADINPUT|unit,pc|0|https://x/c4a');
          db.insert('Items', { ItemCode: 'CR4-SET', Name: 'CR4 set', Category: 'Set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active', ForHire: 'Yes', ForSale: 'No' });
          db.insert('KitParts', [{ KitPartID: 'KP-C4A', SetCode: 'CR4-SET', ItemCode: 'CR4-U7', QtyPerSet: 2 }]);
          var r5 = [UL('CR4-SET'), err(function () { IS(tY, ED(tY, 'CR4-SET', { unit: 'pc' })); }), IT('CR4-SET').Unit, UL('CR4-U7'), err(function () { IS(tY, ED(tY, 'CR4-U7', { unit: 'kg' })); }), IT('CR4-U7').Unit];
          eq('CR4-6 a set with parts and a part of a set: unit fixed (parts per set are counted in it)', r5.join('|'), 'true|BADINPUT|unit|set|true|BADINPUT|unit|pc');
          rc(); var QU = officeQuoteSave(tS, base({ subject: 'CR4 unit', lines: [{ code: 'CR4-U8', desc: 'CR4 item', qty: 4, unit: 'pc / month', rate: 50 }] })).no;
          var u8 = UL('CR4-U8'), a8 = IS(tY, ED(tY, 'CR4-U8', { unit: 'kg' })), ql8 = oQLines_(db, QU)[0], fi8 = officeQuoteForm(tS).items.filter(function (x) { return x.code === 'CR4-U8'; })[0];
          eq('CR4-7 only on a quote: the unit can change (the quote line keeps its own unit); the quote form then offers the new unit (end to end)',
            [u8, a8.code, IT('CR4-U8').Unit, ql8.Unit, fi8 && fi8.unit].join('|'), 'false|CR4-U8|kg|pc|kg');
          var V7 = officeStockItem(tY, 'CR4-U1'), V8 = officeStockItem(add('ps4c@t.com', { PS: 1 }), 'CR4-U2');
          eq('CR4-8 ulk sent with the item view (a boolean): worked out for a login that edits items; a view-only login gets false (no extra reads)', [typeof V7.ulk, V7.ulk, typeof V8.ulk, V8.ulk, officeStockItem(tY, 'CR4-U2').ulk].join('|'), 'boolean|false|boolean|false|true');
          var e9 = err(function () { IS(tY, ED(tY, 'CR4-U1', { unit: 'bag' })); });
          eq('CR4-9 a unit not in the list is still refused as before (unit check does not replace the list check)', [e9, IT('CR4-U1').Unit].join('|'), 'BADINPUT|unit|kg');
          // readers of Items.Unit (they show / print quantities in it): the refused item still reads pc everywhere, the changed unused one reads kg
          IS(tY, ED(tY, 'CR4-U2', { reorder: 200 })); IS(tY, ED(tY, 'CR4-U1', { reorder: 5 }));
          var rd = function (c) { var t = function (f) { try { return f(); } catch (e) { return 'ERR:' + (e && e.message || e); } };
            return [officeStockItem(tY, c).unit, (officeStockList(tY).rows.filter(function (x) { return x.code === c; })[0] || {}).unit, (officeQuoteForm(tS).items.filter(function (x) { return x.code === c; })[0] || {}).unit,
              t(function () { return (uiInitDb_(db).items.filter(function (x) { return x.code === c; })[0] || {}).unit; }), t(function () { return /· (pc|kg)$/.exec((qrLabelList_(db, 'Items').filter(function (x) { return x.code === c; })[0] || {}).sub || '')[1]; }),
              t(function () { return (reorderList(db).filter(function (x) { return x.code === c; })[0] || {}).unit; })].join(','); };
          eq('CR4-20 readers of the unit (stock list / item, quote form, sheet panel, QR labels, reorder list): refused item still pc, the changed unused one kg', [rd('CR4-U2'), rd('CR4-U1')].join(' / '), 'pc,pc,pc,pc,pc,pc / kg,kg,kg,kg,kg,kg');
          var g21 = ED(tY, 'CR4-U1', { unit: 'pc' }); db.insert('ChallanLines', { LineID: 'CL-C4S', ChallanNo: 'DC-C4S', ItemCode: 'CR4-U1', Qty: 2 }); db.insert('Challans', { ChallanNo: 'DC-C4S', Kind: 'Delivery', Status: 'Submitted', PDF: '' });
          var e21 = err(function () { IS(tY, g21); });
          eq('CR4-21 a field-app challan line (Submitted, not yet posted by the sweep) written after the dialog was read: the save reads the sheet in its lock and refuses', [e21, IT('CR4-U1').Unit, UL('CR4-U1')].join('|'), 'BADINPUT|unit|kg|true');
          // ---- (2) quote edits counted before the first write
          var uR0 = uiRun_, sf0 = UI_ACTIONS_.saveQuoteFull, qs0 = qtSave_, pr0 = uiPutRow_;
          var LK = 'https://drive.google.com/file/d/CR4panel', nP = 0;
          var QP = function (n) { return String(must(db, 'Quotes', 'QuoteNo', n).PDF || ''); };
          // the panel's after-make check (oPeFix_) run right after the office write, before the office call ends: n0 = the count the panel read before the edit
          var panel = function (no, n0) { var u = LK + (++nP) + 'abcdefghijklmnop/view', q = must(db, 'Quotes', 'QuoteNo', no); db.update('Quotes', q, { PDF: u }); var k = OPE_RUN_; OPE_RUN_ = { n: n0, hit: [], made: [] };
            try { OPE_RUN_.made.push({ db: db, what: 'Quote', no: no, r: { url: u } }); oPeCheck_(OPE_RUN_); return [QP(no) === '', OPE_RUN_.hit.join(',')].join(','); } finally { OPE_RUN_ = k; } };
          var cnt = function (no, n0) { return oPeGet_(e5).d.filter(function (x) { return x[0] === no && x[1] > n0; }).length; };
          var Q1 = officeQuoteSave(tS, (rc(), base({ subject: 'CR4 ope', lines: [{ code: 'CR4-U1', desc: 'CR4 item', qty: 2, unit: 'kg', rate: 50 }] }))).no;
          try {
            var at = null, n10 = oPeGet_(e5).n, out10 = null;
            UI_ACTIONS_.saveQuoteFull = function (d) { if (d === db) at = cnt(Q1, n10); var r = sf0.apply(this, arguments); if (d === db) out10 = panel(Q1, n10); return r; };
            rc(); var F1 = officeQuoteForm(tS, Q1).quote, S1 = officeQuoteSave(tS, base({ no: Q1, ev: F1.ev, subject: 'CR4 ope', lines: [{ code: 'CR4-U1', desc: 'CR4 item', qty: 3, unit: 'kg', rate: 50 }] }));
            UI_ACTIONS_.saveQuoteFull = sf0;
            eq('CR4-10 office quote save: counted before saveQuoteFull writes; a panel PDF checked right after the write (before the save ends) drops its link and warns; counted once',
              [at, out10, S1.changed !== false, cnt(Q1, n10), QP(Q1)].join('|'), '1|true,' + Q1 + '|true|1|');
            var n11 = oPeGet_(e5).n; db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q1), { PDF: 'https://drive.google.com/file/d/CR4keepABCDEFGHIJKLMNOP/view' }); e5.del('OQP:' + Q1);
            rc(); var F2 = officeQuoteForm(tS, Q1).quote, S2 = officeQuoteSave(tS, base({ no: Q1, ev: F2.ev, subject: 'CR4 ope', lines: [{ code: 'CR4-U1', desc: 'CR4 item', qty: 3, unit: 'kg', rate: 50 }] }));
            eq('CR4-11 a save that changes nothing (W4g): not counted, link and its record untouched', [S2.changed, oPeGet_(e5).n - n11, /CR4keep/.test(QP(Q1)), e5.get('OQP:' + Q1)].join('|'), 'false|0|true|');
            rc(); var F3 = officeQuoteForm(tS, Q1).quote, S3 = officeQuoteSave(tS, base({ no: Q1, ev: F3.ev, subject: 'CR4 ope 2', lines: [{ code: 'CR4-U1', desc: 'CR4 item', qty: 3, unit: 'kg', rate: 50 }] }));
            eq('CR4-12 a real change with a stored PDF (no panel): counted once, the PDF marked old (OQP v 0)', [cnt(Q1, n11), J(e5.get('OQP:' + Q1)) === J({ v: 0, f: oQFid_(QP(Q1)) }), /CR4keep/.test(QP(Q1))].join('|'), '1|true|true');
            var n13 = oPeGet_(e5).n; rc(); var QN = officeQuoteSave(tS, base({ subject: 'CR4 new', lines: [{ code: 'CR4-U1', desc: 'CR4 item', qty: 1, unit: 'kg', rate: 5 }] })).no;
            eq('CR4-13 a new quote (no PDF can exist yet): nothing counted', [!!QN, oPeGet_(e5).n - n13].join('|'), 'true|0');
            var n14 = oPeGet_(e5).n, pd14 = QP(Q1); UI_ACTIONS_.saveQuoteFull = function () { throw new Error('Service Spreadsheets timed out'); };
            rc(); var F4 = officeQuoteForm(tS, Q1).quote, X4 = err(function () { officeQuoteSave(tS, base({ no: Q1, ev: F4.ev, subject: 'CR4 fail', lines: [{ code: 'CR4-U1', desc: 'CR4 item', qty: 9, unit: 'kg', rate: 50 }] })); });
            UI_ACTIONS_.saveQuoteFull = sf0;
            eq('CR4-14 saveQuoteFull fails: counted anyway (safe side: a panel PDF made meanwhile is not kept), SAVEFAIL, the stored link untouched', [cnt(Q1, n14), /^SAVEFAIL\|/.test(X4), QP(Q1) === pd14].join('|'), '1|true|true');
            // officeQuoteTerm: qtSave_ writes the quote row + its terms
            var n15 = oPeGet_(e5).n, at15 = null, out15 = null;
            qtSave_ = function (d) { at15 = cnt(Q1, n15); var r = qs0.apply(this, arguments); out15 = panel(Q1, n15); return r; };
            rc(); var T1 = officeQuoteTerm(tS, Q1, oQTv_(db, oQRow_(db, Q1)), { k: 'resetAll' });
            qtSave_ = qs0;
            eq('CR4-15 office terms change: counted before qtSave_ writes; a panel PDF checked right after the write drops its link; counted once', [at15, out15, !!T1, cnt(Q1, n15), QP(Q1)].join('|'), '1|true,' + Q1 + '|true|1|');
            var n16 = oPeGet_(e5).n; qtSave_ = function () { throw new Error('Service Spreadsheets timed out'); };
            rc(); var X6 = err(function () { officeQuoteTerm(tS, Q1, oQTv_(db, oQRow_(db, Q1)), { k: 'resetAll' }); }); qtSave_ = qs0;
            eq('CR4-16 qtSave_ fails: counted anyway (safe side), BUSY', [cnt(Q1, n16), X6].join('|'), '1|BUSY');
            // oQRevFix_: a Sent quote whose Rev +1 / Draft was not written: completed (that write counted first)
            db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q1), { Status: 'Sent' }); var rv = num(must(db, 'Quotes', 'QuoteNo', Q1).Rev); e5.put('OQRV:' + Q1, { rev: rv + 1, at: e5.clock.now });
            var n17 = oPeGet_(e5).n, at17 = null, out17 = null;
            uiPutRow_ = function (d, t, r, p) { var hit = t === 'Quotes' && p && p.Status === 'Draft' && p.Rev != null && at17 === null; if (hit) at17 = cnt(Q1, n17); var x = pr0.apply(this, arguments); if (hit) out17 = panel(Q1, n17); return x; };
            oQRevFix_(e5, db, Q1);
            uiPutRow_ = pr0;
            eq('CR4-17 a half-saved revision completed (oQRevFix_): counted before the Rev / Draft write; a panel PDF checked right after it drops its link; counted once',
              [at17, out17, must(db, 'Quotes', 'QuoteNo', Q1).Status, num(must(db, 'Quotes', 'QuoteNo', Q1).Rev) === rv + 1, cnt(Q1, n17), e5.get('OQRV:' + Q1)].join('|'), '1|true,' + Q1 + '|Draft|true|1|');
            var n18 = oPeGet_(e5).n; oQRevFix_(e5, db, Q1);
            eq('CR4-18 nothing to complete: nothing counted', oPeGet_(e5).n - n18, 0);
          } finally { uiRun_ = uR0; UI_ACTIONS_.saveQuoteFull = sf0; qtSave_ = qs0; uiPutRow_ = pr0; OPE_RUN_ = null; }
          eq('CR4-19 no quote write left uncounted: every oQPdfStale_ call in the office code passes nb (counted by its caller first)',
            String(oQPdfStale_).indexOf('if (!nb)') > 0 && [officeQuoteSave, officeQuoteTerm, oQRevFix_, oStPdfOld_, oCuPdfOld_].every(function (f) { return (String(f).match(/oQPdfStale_\((?:[^()]|\([^()]*\))*\)/g) || []).every(function (c) { return /, true\)$/.test(c); }); }), true);
        })();
