        // ---- M3 CR run 8 (harness only): lease after the revision fix; office PDF link only if the quote still prints as made;
        //      raw KitParts references guard the set / unit; a panel PDF that fails after its link went in is checked too
        (function () {
          var rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IS = function (t, d) { rc(); return officeItemSave(t, d); };
          var NI = function (o) { return Object.assign({ code: 'CR8-IT-1', name: 'CR8 item', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 4, reorder: 0, status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          var QP = function (n) { return String(must(db, 'Quotes', 'QuoteNo', n).PDF || ''); }, PD = function (n) { return String(must(db, 'Challans', 'ChallanNo', n).PDF || ''); };
          var lg = function (ref) { return db.rows('Log').filter(function (r) { return r.Action === 'PDF out of date' && r.Ref === ref && /while this PDF was made/.test(r.Details); }); }; // the check's own lines
          var EV = oEnv_(), q5k = QF5_STUB_, rf0 = oQRevFix_, uR0 = uiRun_, mk0 = OPE_makePdf0_, nU = 0, mid = null, boom = null, early = false;
          var drv = { name: function () { return 'old.pdf'; }, trash: function () {} };
          var NQ = function (s) { rc(); var no = officeQuoteSave(tS, base({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] })).no; db.update('Quotes', must(db, 'Quotes', 'QuoteNo', no), { PDF: '' }); return no; };
          var PDFQ = function (no) { rc(); return officeQuotePdf(tS, no); };
          try {
            QF5_STUB_ = { drive: drv, make: function (d, w, n, o) { if (mid) { var f = mid; mid = null; f(d, n); } return { url: 'https://drive.google.com/file/d/CR8web' + (++nU) + 'abcdefghijklmnop/view', file: n + '.pdf', placeholders: 0 }; } };
            // (1) #3: the revision fix at the start of an office PDF fails -> no lease left behind
            var Q1 = NQ('CR8 lease'); oQRevFix_ = function () { throw new Error('Sheets down'); };
            var a1; try { a1 = err(function () { PDFQ(Q1); }); } finally { oQRevFix_ = rf0; } var l1 = EV.get('OQPB:' + Q1), b1 = PDFQ(Q1);
            eq('CR8-1 the revision fix fails at the start of an office PDF: its error out, no lease left -> the next try makes the PDF (no BUSY for 6 min)', [a1, l1 == null, !!b1.made, QP(Q1) === b1.url].join('|'), 'Sheets down|true|true|true');
            // (2) #9: the quote changes during the render -> no link (BUSY), lease let go, no OQP record; the next try makes + links it
            var Q2 = NQ('CR8 race'), ln = function (n) { return db.rows('QuoteLines').filter(function (l) { return String(l.QuoteNo) === n; })[0]; };
            mid = function () { db.update('QuoteLines', ln(Q2), { Qty: num(ln(Q2).Qty) + 1 }); };
            var a2 = err(function () { PDFQ(Q2); }), c2 = QP(Q2), l2 = EV.get('OQPB:' + Q2), p2 = EV.get('OQP:' + Q2), b2 = PDFQ(Q2), p2b = EV.get('OQP:' + Q2);
            eq('CR8-2 the quote changed during the office render: no link written (BUSY = try again), lease let go, no OQP record; the next try makes it from the new data and links it',
              [a2, c2, l2 == null, p2 == null, !!b2.made, QP(Q2) === b2.url, !!(p2b && p2b.v === oQPdfVer_(db, Q2).v)].join('|'), 'BUSY||true|true|true|true|true');
            var Q2g = NQ('CR8 fresh'), dbf0 = EV.db, vr0 = oQPdfVer_, inL = [], tr = [], DA0 = typeof DriveApp === 'undefined' ? undefined : DriveApp;
            var ghost = Object.create(db); ghost.rows = function (t) { var r = db.rows(t); return t !== 'QuoteLines' ? r : r.map(function (x) { return String(x.QuoteNo) === Q2g ? Object.assign({}, x, { Qty: num(x.Qty) + 5 }) : x; }); };
            var a2g, c2g, nt;
            try { mid = function () { EV.db = function () { return ghost; }; }; /* the other execution's save lands during the render */ oQPdfVer_ = function () { inL.push(OLK_.s); return vr0.apply(this, arguments); };
              DriveApp = { getFileById: function (id) { return { setTrashed: function (v) { tr.push(id + ':' + v); } }; } };
              a2g = err(function () { PDFQ(Q2g); }); c2g = QP(Q2g); nt = 'CR8web' + nU + 'abcdefghijklmnop';
            } finally { EV.db = dbf0; oQPdfVer_ = vr0; if (DA0 === undefined) { try { delete global.DriveApp; } catch (x) { DriveApp = undefined; } } else DriveApp = DA0; }
            eq('CR8-2b the check reads the sheet again (another execution\'s save not in this request\'s rows): BUSY, no link; the check runs holding the script lock; the unlinked PDF goes to the bin',
              [a2g, c2g, inL.length >= 2 && inL[inL.length - 2] === 0 && inL[inL.length - 1] > 0, tr.join(',')].join('|'), 'BUSY||true|' + nt + ':true');
            // (2b) an older link in the cell + a change during the render: the old link is not replaced by the old-data PDF
            db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q2), { PDF: '' }); EV.del('OQP:' + Q2); var Q2u = PDFQ(Q2).url; mid = function () { db.update('QuoteLines', ln(Q2), { Qty: num(ln(Q2).Qty) + 1 }); };
            db.update('QuoteLines', ln(Q2), { Qty: num(ln(Q2).Qty) + 1 }); oQPdfStale_(EV, db, Q2); var a2c = err(function () { PDFQ(Q2); }), c2c = QP(Q2);
            eq('CR8-3 a stale link in the cell + a change during the remake: BUSY, the cell keeps the earlier link (marked old by the save), not the old-data PDF', [a2c, c2c === Q2u, c2c.indexOf('CR8web' + nU + 'abc') < 0].join('|'), 'BUSY|true|true');
            // (3) #5: a set whose KitParts row names a part that is gone still counts as in use (set flag / unit fixed)
            db.insert('Items', [{ ItemCode: 'CR8-SET', Name: 'CR8 set', Category: 'Ringlock', Size: '', Unit: 'pc', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' }, { ItemCode: 'CR8-SET2', Name: 'CR8 set 2', Category: 'Ringlock', Size: '', Unit: 'pc', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' }]);
            db.insert('KitParts', [{ KitPartID: 'KP-CR8', SetCode: ' cr8-set ', ItemCode: 'CR8-GONE', QtyPerSet: 2 }]);
            var g3 = officeStockItem(tY, 'CR8-SET'), u3 = (g3.lists && g3.lists.units || []).filter(function (u) { return u !== g3.unit; })[0];
            var a3 = err(function () { IS(tY, ED(tY, 'CR8-SET', { isSet: 'No' })); }), b3 = err(function () { IS(tY, ED(tY, 'CR8-SET', { unit: u3 })); }), c3 = err(function () { IS(tY, ED(tY, 'CR8-SET2', { isSet: 'No' })); });
            eq('CR8-4 set with a KitParts row whose part is gone: still a set in use -> set flag and unit stay (BADINPUT), unit shown fixed; a set with no KitParts row can change; the challan still refuses its parts list',
              [a3, b3, g3.ulk, !!u3, c3, must(db, 'Items', 'ItemCode', 'CR8-SET').IsSet, oStYes_(must(db, 'Items', 'ItemCode', 'CR8-SET2').IsSet), oStMake_(oStKit_(db)[' cr8-set '], {}, {})].join('|'), 'BADINPUT|set|BADINPUT|unit|true|true|no error|Yes|false|0');
            // (4) #11: a panel PDF that fails after its link went in (the log line after it), the challan changed in the office app meanwhile
            uiRun_ = function (fn) { return uiClean_(withLock(function () { return fn(db); })); }; QF5_STUB_ = { drive: drv };
            OPE_makePdf0_ = function (d, what, no, o) { var u = 'https://drive.google.com/file/d/CR8pn' + (++nU) + 'abcdefghijklmnop/view', r = find(d.rows('Challans'), 'ChallanNo', no);
              if (mid) { var f = mid; mid = null; f(); } if (early) { early = false; throw new Error('Drive down'); } if (r && !(o && o.noLink)) d.update('Challans', r, { PDF: u }); if (boom) { var b = boom; boom = null; throw new Error(b); } return { url: u, file: no + '.pdf', placeholders: 0 }; };
            IS(tY, NI()); var nm = 0, edit = function () { IS(tY, ED(tY, 'CR8-IT-1', { name: 'CR8 renamed ' + (++nm) })); };
            db.insert('Challans', [{ ChallanNo: 'DC-C8A', Kind: 'Delivery', Status: 'Draft', PDF: '' }]); db.insert('ChallanLines', [{ LineID: 'CL-C8A', ChallanNo: 'DC-C8A', ItemCode: 'CR8-IT-1', Qty: 1 }]);
            var PDF = function () { return uiDo('pdf', { what: 'Challan', no: 'DC-C8A' }); }, rawUp = db.update; // rawUp = another execution's write (not through this run's db)
            mid = edit; boom = 'Log down'; var l5 = lg('DC-C8A').length, a5 = err(PDF), c5 = PD('DC-C8A'), x5 = lg('DC-C8A').length - l5;
            boom = 'Log down 2'; var a6 = err(PDF), c6 = PD('DC-C8A');
            mid = function () { edit(); rawUp.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C8A'), { PDF: 'https://x/office-8' }); }; early = true; var l7 = lg('DC-C8A').length, a7 = err(PDF), c7 = PD('DC-C8A'), x7 = lg('DC-C8A').length - l7;
            eq('CR8-5 panel PDF fails after its link went in while the challan changed in the office app: that link cleared + logged, the run\'s own error reported; no change -> the link stays; failed before its link -> nothing checked: a newer office link written meanwhile stays',
              [a5, c5, x5, a6, /CR8pn\d+/.test(c6), a7, x7, c7, String(OPE_RUN_)].join('|'), 'Log down||1|Log down 2|true|Drive down|0|https://x/office-8|null');
            var att = 0; OPE_makePdf0_ = function (d, what, no, o) { var u = 'https://drive.google.com/file/d/CR8os' + (++nU) + 'abcdefghijklmnop/view', r = find(d.rows('Challans'), 'ChallanNo', no);
              if (mid) { var f = mid; mid = null; f(); } d.update('Challans', r, { PDF: u }); if (++att === 1) { OSG_IMGUSED_ = true; throw new Error('Export refused the image'); } return { url: u, file: no + '.pdf', placeholders: 0 }; };
            mid = edit; var P7 = PDF(), c7b = PD('DC-C8A'), nm7 = (/\n([^\n]*) was changed in the office app/.exec(String(P7.msg)) || [])[1];
            eq('CR8-7 the image fallback makes it twice in one run (first try failed after its link): both links checked, the cell cleared, the warning names the challan once', [att, c7b, !!P7.warn, nm7].join('|'), '2||true|DC-C8A');
            eq('CR8-6 the failure-path check reads the cell, names no document lock', /getDocumentLock/.test(String(makePdf.officePe_ ? makePdf : '')), false);
          } finally { QF5_STUB_ = q5k; oQRevFix_ = rf0; uiRun_ = uR0; OPE_makePdf0_ = mk0; OPE_RUN_ = null; mid = null; boom = null; early = false; }
        })();
