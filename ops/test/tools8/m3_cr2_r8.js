        // ---- M3 CR run 2 (harness only): For hire / For sale on items + no stale link from a sheet-panel PDF made during an office edit
        (function () {
          var J = JSON.stringify, rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IT = function (c) { return must(db, 'Items', 'ItemCode', c); }, IS = function (t, d) { rc(); return officeItemSave(t, d); };
          var NI = function (o) { return Object.assign({ code: 'CR2-IT-1', name: 'CR2 item', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 4, reorder: 0, status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          var nIt = db.rows('Items').length;
          var bad = function (o) { return err(function () { IS(tY, NI(o)); }); };
          eq('CR2-1 new item: For hire / For sale must be exactly Yes or No (missing, blank, yes, true, 1 refused); nothing written',
            [bad({ forHire: undefined }), bad({ forSale: undefined }), bad({ forHire: '' }), bad({ forHire: 'yes' }), bad({ forSale: true }), bad({ forSale: 1 }), bad({ forHire: ['Yes'] }), db.rows('Items').length - nIt].join('|'),
            'BADINPUT|for hire|BADINPUT|for sale|BADINPUT|for hire|BADINPUT|for hire|BADINPUT|for sale|BADINPUT|for sale|BADINPUT|for hire|0');
          var A1 = IS(tY, NI()), A2 = IS(tY, NI({ code: 'CR2-IT-2', forHire: 'No', forSale: 'Yes', cat: 'Board' })), G1 = officeStockItem(tY, 'CR2-IT-1'), G2 = officeStockItem(tV, 'CR2-IT-2');
          eq('CR2-2 YW Staff writes them (not a money field); the item view shows them', [A1.code, A2.code, IT('CR2-IT-1').ForHire, IT('CR2-IT-1').ForSale, IT('CR2-IT-2').ForHire, IT('CR2-IT-2').ForSale, G1.forHire, G1.forSale, G2.forHire, G2.forSale].join('|'), 'CR2-IT-1|CR2-IT-2|Yes|No|No|Yes|true|false|false|true');
          // end to end: quote form -> quote save -> sheet panel item list
          var QF = officeQuoteForm(tS), qi = function (F, c) { return F.items.filter(function (x) { return x.code === c; })[0] || null; };
          eq('CR2-3 the quote form offers them by the flags (Rental picker = forHire, Sale = forSale)', J([qi(QF, 'CR2-IT-1') && [qi(QF, 'CR2-IT-1').forHire, qi(QF, 'CR2-IT-1').forSale, qi(QF, 'CR2-IT-1').cat], qi(QF, 'CR2-IT-2') && [qi(QF, 'CR2-IT-2').forHire, qi(QF, 'CR2-IT-2').forSale]]), '[[true,false,"Ringlock"],[false,true]]');
          rc(); var QR = officeQuoteSave(tS, base({ subject: 'CR2 rental', lines: [{ code: 'CR2-IT-1', desc: 'CR2 item', qty: 10, unit: 'pc / month', rate: 50 }] }));
          rc(); var QS = officeQuoteSave(tS, base({ type: 'Sale', subject: 'CR2 sale', lines: [{ code: 'CR2-IT-2', desc: 'CR2 item 2', qty: 3, unit: 'pc', rate: 700 }] }));
          var ln = function (n) { return db.rows('QuoteLines').filter(function (l) { return l.QuoteNo === n; }).map(function (l) { return l.ItemCode + ' ' + l.Qty; }).join(','); };
          var UI = uiInitDb_(db).items, ui = function (c) { var x = UI.filter(function (i) { return i.code === c; })[0]; return x ? x.forHire : 'none'; };
          eq('CR2-4 a Rental quote with the hire item and a Sale quote with the sale item save; the sheet panel lists them with forHire', [!!QR.no, ln(QR.no), !!QS.no, ln(QS.no), ui('CR2-IT-1'), ui('CR2-IT-2')].join('|'), 'true|CR2-IT-1 10|true|CR2-IT-2 3|true|false');
          // edits: flags in the edit hash, flip, blank cell, no PDF marked old
          var E0 = ED(tY, 'CR2-IT-1'); db.update('Items', IT('CR2-IT-1'), { ForSale: 'Yes' });
          eq('CR2-5 a For sale change in the sheet makes an open edit STALE (in the edit hash, for every login)', [err(function () { IS(tY, E0); }), E0.ev !== officeStockItem(tY, 'CR2-IT-1').ev, officeStockItem(tD, 'CR2-IT-1').ev !== E0.ev].join('|'), 'STALE|true|true');
          db.update('Items', IT('CR2-IT-1'), { ForSale: 'No' });
          var F1 = IS(tY, ED(tY, 'CR2-IT-1', { forSale: 'Yes' })), F2 = IS(tY, ED(tY, 'CR2-IT-1')), qf2 = qi(officeQuoteForm(tS), 'CR2-IT-1');
          eq('CR2-6 flip For sale: saved, logged, no PDF marked old; the same form again = nothing changed; the quote form now offers it for sale too', [F1.old, IT('CR2-IT-1').ForSale, db.rows('Log').filter(function (r) { return r.Action === 'Item updated' && r.Ref === 'CR2-IT-1' && /ForSale/.test(r.Details); }).length, J(F2), qf2.forHire, qf2.forSale].join('|'), '0|Yes|1|{"code":"CR2-IT-1","same":true}|true|true');
          db.update('Items', IT('RL-STD-20'), { ForHire: '', ForSale: '' });
          var GB = officeStockItem(tY, 'RL-STD-20'), B1 = IS(tY, ED(tY, 'RL-STD-20'));
          eq('CR2-7 blank cells read No / No and are written as No when the item is saved', [GB.forHire, GB.forSale, IT('RL-STD-20').ForHire, IT('RL-STD-20').ForSale, !B1.same].join('|'), 'false|false|No|No|true');
          db.update('Items', IT('RL-STD-20'), { ForHire: 'Yes', ForSale: 'No' });
          // defaults for a new item: what most items of its category have
          db.insert('Items', [{ ItemCode: 'CR2-D1', Name: 'd', Category: 'CatX', ForHire: 'No', ForSale: 'Yes' }, { ItemCode: 'CR2-D2', Name: 'd', Category: 'CatX', ForHire: 'No', ForSale: 'No' }, { ItemCode: 'CR2-D3', Name: 'd', Category: 'CatX', ForHire: 'Yes', ForSale: 'yes' },
            { ItemCode: 'CR2-D4', Name: 'd', Category: 'CatB' }, { ItemCode: 'CR2-D5', Name: 'd', Category: '__proto__', ForHire: 'No', ForSale: 'Yes' }, { ItemCode: '', Name: 'd', Category: 'CatE', ForHire: 'No', ForSale: 'Yes' }]);
          var DF = officeStockList(tY).defs, df = function (k) { var x = DF.filter(function (r) { return r[0] === k; })[0]; return x ? x.slice(1).join('/') : 'none'; };
          eq('CR2-8 defs per category: majority (hire 1 Yes / 2 No -> No; sale 1 Yes / 1 No, "yes" not counted -> No); none -> Yes / No; __proto__ is a plain row; rows with no code ignored; plain arrays',
            [df('CatX'), df('CatB'), df('__proto__'), df('CatE'), Array.isArray(DF) && DF.every(function (r) { return Array.isArray(r) && r.length === 3; }), ({}).forHire === undefined].join('|'), 'No/No|Yes/No|No/Yes|none|true|true');
          // ---- (2) panel PDF made while an office edit changes the document
          var uR0 = uiRun_, q5k = QF5_STUB_, mk0 = OPE_makePdf0_, mid = null, trashed = [];
          uiRun_ = function (fn) { return uiClean_(withLock(function () { return fn(db); })); }; // the panel action on the test sheet
          QF5_STUB_ = { drive: { name: function (u) { return 'old.pdf'; }, trash: function (u) { trashed.push(u); } } }; // the real makePdf path (no make stub)
          var nU = 0, T = { Quote: ['Quotes', 'QuoteNo'], Challan: ['Challans', 'ChallanNo'], Invoice: ['Invoices', 'InvNo'], PO: ['POs', 'PONo'], Note: ['Notes', 'NoteNo'] };
          OPE_makePdf0_ = function (d, what, no, o) { // export stub: reads the sheet, runs the edit "meanwhile", then writes its link as PDF.gs does
            var u = 'https://drive.google.com/file/d/CR2pdf' + (++nU) + 'abcdefghijklmnop/view', t = T[what];
            if (mid) mid();
            var r = find(d.rows(t[0]), t[1], no); if (r && !(o && o.noLink)) d.update(t[0], r, { PDF: u });
            return { url: u, file: no + '.pdf', placeholders: 0 };
          };
          var PD = function (t, n) { return String(must(db, T[t][0], T[t][1], n).PDF || ''); }, nOld = function () { return db.rows('Log').filter(function (r) { return r.Action === 'PDF out of date'; }).length; };
          db.insert('Challans', [{ ChallanNo: 'DC-R1', Kind: 'Delivery', Status: 'Draft', PDF: 'https://x/r1' }, { ChallanNo: 'DC-R2', Kind: 'Delivery', Status: 'Draft', PDF: '' }, { ChallanNo: 'DC-R3', Kind: 'Delivery', Status: 'Draft', PDF: '' }]);
          db.insert('ChallanLines', [{ LineID: 'CL-R1', ChallanNo: 'DC-R1', ItemCode: 'CR2-IT-1', Qty: 1 }, { LineID: 'CL-R2', ChallanNo: 'DC-R2', ItemCode: 'CR2-IT-1', Qty: 1 }, { LineID: 'CL-R3', ChallanNo: 'DC-R3', ItemCode: 'CR2-IT-2', Qty: 1 }]);
          var nm = 0, edit = function (c) { return function () { IS(tY, ED(tY, c || 'CR2-IT-1', { name: 'CR2 renamed ' + (++nm) })); }; };
          try {
            mid = edit(); var lo1 = nOld(), P1 = uiDo('pdf', { what: 'Challan', no: 'DC-R1' });
            eq('CR2-9 Draft challan with a link, item renamed while its panel PDF is made: the new link is cleared again, logged, the panel says to make it again', [PD('Challan', 'DC-R1'), nOld() - lo1, P1.warn, /DC-R1 was changed in the office app while this PDF was being made/.test(P1.msg), /Make the PDF again/.test(P1.msg), String(OPE_RUN_)].join('|'), '|2|true|true|true|null');
            mid = edit(); var P2 = uiDo('pdf', { what: 'Challan', no: 'DC-R2' });
            eq('CR2-10 a first PDF (no link before): an edit meanwhile is caught too (the edit counts documents with no PDF)', [PD('Challan', 'DC-R2'), P2.warn, db.rows('Log').filter(function (r) { return r.Ref === 'DC-R2' && r.Action === 'PDF out of date'; }).length].join('|'), '|true|1');
            mid = null; var P3 = uiDo('pdf', { what: 'Challan', no: 'DC-R2' });
            eq('CR2-11 no edit meanwhile: link kept, no warning, message as before', [/CR2pdf\d+/.test(PD('Challan', 'DC-R2')), !!P3.warn, /changed in the office app/.test(P3.msg)].join('|'), 'true|false|false');
            mid = edit('CR2-IT-1'); var P4 = uiDo('pdf', { what: 'Challan', no: 'DC-R3' });
            eq('CR2-12 an edit of another item (not on this challan) meanwhile: link kept (per document)', [/CR2pdf\d+/.test(PD('Challan', 'DC-R3')), !!P4.warn].join('|'), 'true|false');
            mid = null; edit()(); var P5 = uiDo('pdf', { what: 'Challan', no: 'DC-R1' });
            eq('CR2-13 an edit finished before the panel PDF started: the new PDF is current, link kept', [/CR2pdf\d+/.test(PD('Challan', 'DC-R1')), !!P5.warn].join('|'), 'true|false');
            // quote (quotePdf + pdf What=Quote), item size on its line
            var Q = QR.no; db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q), { PDF: 'https://drive.google.com/file/d/CR2qOLDabcdefghijklmnop/view' });
            mid = function () { IS(tY, ED(tY, 'CR2-IT-1', { size: '1.5 m' })); }; var P6 = uiDo('quotePdf', { quoteNo: Q });
            var Q2r = must(db, 'Quotes', 'QuoteNo', Q), fr6 = oQPdfFresh_(e5, Q2r, oQPdfVer_(db, Q).v);
            eq('CR2-14 panel quote PDF while the item size changes: link cleared (the office makes a new one), warning', [String(Q2r.PDF || ''), fr6, P6.warn, /was changed in the office app/.test(P6.msg)].join('|'), '||true|true');
            mid = function () { IS(tY, ED(tY, 'CR2-IT-1', { size: '2 m' })); }; var P7 = uiDo('pdf', { what: 'Quote', no: Q });
            eq('CR2-15 the same through the PDF action with What = Quote', [String(must(db, 'Quotes', 'QuoteNo', Q).PDF || ''), P7.warn].join('|'), '|true');
            mid = null; var P8 = uiDo('quotePdf', { quoteNo: Q });
            eq('CR2-16 quote PDF with no edit meanwhile: link kept', [/CR2pdf\d+/.test(String(must(db, 'Quotes', 'QuoteNo', Q).PDF)), !!P8.warn].join('|'), 'true|false');
            // M2: WO no. change (oCtPdfOld_) through officeContractSave
            var cR = mkC({ no: 'CR2-WO-1' });
            db.insert('Invoices', [{ InvNo: 'INV-R1', JobNo: cR.job, Status: 'Draft', PDF: 'https://u/r1' }, { InvNo: 'INV-R2', JobNo: cR.job, Status: 'Draft', PDF: '' }]);
            db.insert('Notes', { NoteNo: 'N-R1', JobNo: cR.job, Status: 'Draft', PDF: '' });
            var wo = 1; mid = function () { cSave(tS, FF(officeContractGet(tS, cR.job), { no: 'CR2-WO-' + (++wo) })); };
            var P9 = uiDo('pdf', { what: 'Invoice', no: 'INV-R1' }), P10 = uiDo('pdf', { what: 'Invoice', no: 'INV-R2' }), P11 = uiDo('pdf', { what: 'Note', no: 'N-R1' });
            mid = function () { cSave(tS, FF(officeContractGet(tS, cR.job), { notes: 'only notes ' + (++wo) })); }; var P12 = uiDo('pdf', { what: 'Invoice', no: 'INV-R2' });
            eq('CR2-17 WO no. changed while the panel makes the job\'s Draft invoice / note PDF (with or without a link): cleared, warned; a notes-only save meanwhile keeps the link',
              [PD('Invoice', 'INV-R1'), PD('Invoice', 'INV-R2') !== '', PD('Note', 'N-R1'), P9.warn, P10.warn, P11.warn, !!P12.warn, must(db, 'Jobs', 'JobNo', cR.job).ClientWONo].join('|'), '|true||true|true|true|false|CR2-WO-4');
            // failures / limits
            mid = function () { throw new Error('export down'); }; var X1 = err(function () { uiDo('pdf', { what: 'Challan', no: 'DC-R3' }); });
            eq('CR2-18 a failed export: error passed on, nothing held (OPE_RUN_ cleared)', [X1, String(OPE_RUN_)].join('|'), 'export down|null');
            mid = null; var lk = String(PD('Challan', 'DC-R3')), n0 = oPeGet_(e5).n; edit('CR2-IT-2')(); OPE_RUN_ = null; var r0 = makePdf(db, 'Challan', 'DC-R3');
            eq('CR2-19 makePdf outside a panel PDF action (office / field app / editor) is unchanged: link written, no check', [PD('Challan', 'DC-R3') === r0.url, oPeGet_(e5).n > n0].join('|'), 'true|true');
            var nB = oPeGet_(e5).n, many = []; for (var i = 0; i < 130; i++) many.push('DOC-M' + i); oPeBump_(e5, many.concat(['DOC-M1', '', null]));
            var rec = e5.get('OPE');
            eq('CR2-20 the change list keeps the last 120 (one property, < 9 KB); unique numbers; older than the list = counted as changed; later ones exact',
              [rec.d.length, rec.n - nB, J(rec).length < 9000, oPeSince_(e5, nB, 'DOC-M0'), oPeSince_(e5, nB + 20, 'DOC-M129'), oPeSince_(e5, nB + 20, 'NOT-THERE'), oPeSince_(e5, rec.n, 'DOC-M129'), oPeSince_(e5, nB + 9, 'DOC-M5'), oPeSince_(e5, nB + 9, 'DOC-M9'), oPeSince_(e5, nB + 129, 'DOC-M128'), oPeSince_(e5, nB + 129, 'DOC-M129'), oPeSince_(e5, nB + 128, 'DOC-M128')].join('|'), '120|130|true|true|true|false|false|true|true|false|true|true');
            // the edit counts its documents before it clears anything / even when its write fails
            db.update('Challans', must(db, 'Challans', 'ChallanNo', 'DC-R1'), { PDF: 'https://x/r1b' });
            var i0 = db.insert, n1 = oPeGet_(e5).n; db.insert = function (t) { if (t === 'Log') throw new Error('log down'); return i0.apply(db, arguments); };
            var LE; try { LE = err(function () { IS(tY, ED(tY, 'CR2-IT-1', { name: 'not saved' })); }); } finally { db.insert = i0; }
            var d1 = e5.get('OPE').d.slice(-2).map(function (x) { return x[0]; }).sort().join(',');
            eq('CR2-21 item edit whose old-PDF log fails: link kept, item kept, but DC-R1 / DC-R2 already counted (safe side: a panel PDF meanwhile is not kept)', [LE, PD('Challan', 'DC-R1'), oPeGet_(e5).n - n1, d1].join('|'), 'log down|https://x/r1b|2|DC-R1,DC-R2');
            var cn = oPeGet_(e5).n; db.update('Challans', must(db, 'Challans', 'ChallanNo', 'DC-R2'), { Status: 'Posted' }); IS(tY, ED(tY, 'CR2-IT-1', { kg: 5.5 }));
            eq('CR2-22 posted challans are not counted (the CR7 rule: only open documents); a field that no document prints counts nothing', [J(e5.get('OPE').d.slice(oPeGet_(e5).n - cn > 0 ? -(oPeGet_(e5).n - cn) : 0).map(function (x) { return x[0]; })), (function () { var c2 = oPeGet_(e5).n; IS(tY, ED(tY, 'CR2-IT-1', { reorder: 9 })); return oPeGet_(e5).n - c2; })()].join('|'), '["DC-R1"]|0');
            var oc = oPeGet_(e5).n, cq = db.rows('Quotes').filter(function (q) { return oQNo_(String(q.QuoteNo)) && q.CustID === 'CUST-0001' && !oQLocked_(db, q); }).length; oCuPdfOld_(e5, db, 'CustID', 'CUST-0001');
            eq('CR2-23 a customer edit counts its open quotes in one write (oCuPdfOld_)', [cq > 0, oPeGet_(e5).n - oc === cq].join('|'), 'true|true');
            // a quote save meanwhile (oQPdfStale_ counts it), a noLink make, the fix's log failing
            db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q), { PDF: 'https://drive.google.com/file/d/CR2qOLD2abcdefghijklmnop/view' });
            mid = function () { rc(); var F = officeQuoteForm(tS, Q).quote; officeQuoteSave(tS, base({ no: Q, ev: F.ev, subject: 'CR2 rental', lines: [{ code: 'CR2-IT-1', desc: 'CR2 item', qty: 11, unit: 'pc / month', rate: 50 }] })); };
            var P13 = uiDo('quotePdf', { quoteNo: Q });
            eq('CR2-26 an office quote save while the panel makes that quote\'s PDF: link cleared, warned', [String(must(db, 'Quotes', 'QuoteNo', Q).PDF || ''), P13.warn, ln(Q)].join('|'), '|true|CR2-IT-1 11');
            mid = null; db.update('Challans', must(db, 'Challans', 'ChallanNo', 'DC-R3'), { PDF: 'https://x/r3' }); OPE_RUN_ = { n: oPeGet_(e5).n, hit: [] }; oPeBump_(e5, ['DC-R3']);
            var r27 = makePdf(db, 'Challan', 'DC-R3', { noLink: true }), h27 = OPE_RUN_.hit.length; OPE_RUN_ = null;
            eq('CR2-27 a make with noLink (no link written) never clears the stored link', [PD('Challan', 'DC-R3'), h27, !!r27.url].join('|'), 'https://x/r3|0|true');
            var i1 = db.insert; mid = edit('CR2-IT-2'); db.insert = function (t) { if (t === 'Log' && !mid) throw new Error('log down'); return i1.apply(db, arguments); };
            var mk1 = OPE_makePdf0_, P14; OPE_makePdf0_ = function () { var r = mk1.apply(this, arguments); mid = null; return r; };
            try { P14 = uiDo('pdf', { what: 'Challan', no: 'DC-R3' }); } finally { db.insert = i1; OPE_makePdf0_ = mk1; mid = null; }
            eq('CR2-28 the fix\'s log line failing: the link is still cleared and the panel still warns', [PD('Challan', 'DC-R3'), P14.warn].join('|'), '|true');
            e5.put('OPE', 'junk'); var j1 = oPeGet_(e5); oPeBump_(e5, ['DOC-J']); var j3 = e5.get('OPE'); e5.put('OPE', { n: 'x', d: 'y' }); var j2 = oPeGet_(e5);
            eq('CR2-24 a broken record reads as empty (no crash) and is rebuilt', [j1.n, j1.d.length, j3.n, J(j3.d), j2.n, j2.d.length].join('|'), '0|0|1|[["DOC-J",1]]|0|0');
            e5.del('OPE');
          } finally { uiRun_ = uR0; QF5_STUB_ = q5k; OPE_makePdf0_ = mk0; OPE_RUN_ = null; }
          eq('CR2-25 wrappers in place once: makePdf (keeps officePdf_ / officeSg_), uiDo (keeps officeLk_)', [!!(makePdf.officeRaw_ || makePdf).officeSg_, !!(makePdf.officeRaw_ || makePdf).officePdf_, typeof OSG_makePdf0_.officePe_, !!(uiDo.officeRaw_ || uiDo).officePe_, typeof (uiDo.officeRaw_ || uiDo).officeLk_].join('|'), 'true|true|function|true|function');
        })();
