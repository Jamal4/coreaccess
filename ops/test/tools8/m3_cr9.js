        // ---- M3 CR run 9 (harness only): lease inside the try; old same-named copies binned only after the link; link rows from the fresh read;
        //      OPE buckets; panel link written after the run under the script lock (never over a newer link), no Open PDF when not kept; PO on order
        (function () {
          var J = JSON.stringify, rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IS = function (t, d) { rc(); return officeItemSave(t, d); };
          var NI = function (o) { return Object.assign({ code: 'CR9-IT-1', name: 'CR9 item', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 4, reorder: 0, status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          var QP = function (n) { return String(must(db, 'Quotes', 'QuoteNo', n).PDF || ''); }, PD = function (n) { return String(must(db, 'Challans', 'ChallanNo', n).PDF || ''); };
          var EV = oEnv_(), q5k = QF5_STUB_, uR0 = uiRun_, mk0 = OPE_makePdf0_, lk0 = EV.lock, dbf0 = EV.db, u0 = db.update, i0 = db.insert, nU = 0, mid = null, tr = [];
          var DA0 = typeof DriveApp === 'undefined' ? undefined : DriveApp, drv = { name: function () { return 'old.pdf'; }, trash: function () {} };
          var NQ = function (s) { rc(); var no = officeQuoteSave(tS, base({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] })).no; db.update('Quotes', must(db, 'Quotes', 'QuoteNo', no), { PDF: '' }); return no; };
          var PDFQ = function (no) { rc(); return officeQuotePdf(tS, no); };
          var FF = function (id, name) { return { t: false, getId: function () { return id; }, getName: function () { return name; }, isTrashed: function () { return this.t; }, setTrashed: function (v) { this.t = v; tr.push(id + ':' + v); } }; };
          var FD = function (files) { return { getFilesByName: function (n) { var a = files.filter(function (f) { return f.getName() === n && !f.t; }), i = 0; return { hasNext: function () { return i < a.length; }, next: function () { return a[i++]; } }; } }; };
          var ln = function (n) { return db.rows('QuoteLines').filter(function (l) { return String(l.QuoteNo) === n; })[0]; };
          try {
            DriveApp = { getFileById: function (id) { return { setTrashed: function (v) { tr.push(id + ':' + v); } }; } };
            // (1) #5: the lease went in, then the lock exit (flush) fails -> the lease is let go
            var Q1 = NQ('CR9 lease'), arm = false;
            EV.lock = function (fn) { var r = lk0.apply(this, arguments); if (arm && EV.get('OQPB:' + Q1)) { arm = false; throw new Error('Flush failed'); } return r; };
            QF5_STUB_ = { drive: drv, make: function (d, w, n) { return { url: 'https://drive.google.com/file/d/CR9le' + (++nU) + 'abcdefghijklmnop/view', file: n + '.pdf', placeholders: 0 }; } };
            arm = true; var a1 = err(function () { PDFQ(Q1); }), l1 = EV.get('OQPB:' + Q1); EV.lock = lk0; var b1 = null, e1 = err(function () { b1 = PDFQ(Q1); });
            eq('CR9-1 the lock exit fails after the PDF lease went in: that error out, the lease let go -> the next try makes the PDF (no BUSY for 6 min)', [a1, l1 == null, e1, !!(b1 && b1.made), !!b1 && QP(Q1) === b1.url].join('|'), 'Flush failed|true|no error|true|true');
            // (2) #1: the old same-named PDF + Doc go to the bin only once the new link is in
            var Q2 = NQ('CR9 bin'), OLD = FF('CR9oldPdfAbcdefghijklmnop', Q2 + '.pdf'), OLDD = FF('CR9oldDocAbcdefghijklmnop', Q2), F2 = FD([OLD, OLDD]);
            db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q2), { PDF: 'https://drive.google.com/file/d/CR9oldPdfAbcdefghijklmnop/view' }); oQPdfStale_(EV, db, Q2);
            QF5_STUB_ = { drive: drv, make: function (d, w, n) { trashSame_(F2, n); trashSame_(F2, n + '.pdf'); if (mid) { var f = mid; mid = null; f(); } return { url: 'https://drive.google.com/file/d/CR9bn' + (++nU) + 'abcdefghijklmnop/view', doc: 'https://docs.google.com/document/d/CR9bd' + nU + 'abcdefghijklmnop/edit', file: n + '.pdf', placeholders: 0 }; } };
            tr.splice(0); mid = function () { db.update('QuoteLines', ln(Q2), { Qty: num(ln(Q2).Qty) + 1 }); };
            var a2 = err(function () { PDFQ(Q2); }), c2 = QP(Q2), t2 = tr.splice(0).join(','), nb = 'CR9bn' + nU + 'abcdefghijklmnop', nd = 'CR9bd' + nU + 'abcdefghijklmnop';
            eq('CR9-2 office PDF refused (the quote changed during the render): the old same-named PDF + Doc not binned (the cell\'s link still opens), only the new files binned',
              [a2, /CR9oldPdf/.test(c2), OLD.t, OLDD.t, t2].join('|'), 'BUSY|true|false|false|' + nb + ':true,' + nd + ':true');
            var b2 = PDFQ(Q2), t2b = tr.splice(0).join(',');
            eq('CR9-3 accepted: link in, then the old same-named copies binned (the new ones kept)', [!!b2.made, QP(Q2) === b2.url, OLD.t, OLDD.t, t2b].join('|'), 'true|true|true|true|CR9oldDocAbcdefghijklmnop:true,CR9oldPdfAbcdefghijklmnop:true');
            var k4 = OPDF_BIN_; OPDF_BIN_ = null; var OX = FF('CR9outAbcdefghijklmnopq', 'x.pdf'); trashSame_(FD([OX]), 'x.pdf'); var oo = [], ob = FF('CR9obAbcdefghijklmnopqr', 'y'); OPDF_BIN_ = oo; oBin_(ob); OPDF_BIN_ = null; oBin_(OX); OPDF_BIN_ = k4;
            var KP = FF('CR9keepAbcdefghijklmnopq', 'k'), BP = FF('CR9binAbcdefghijklmnopqr', 'k'), GP = FF('CR9goneAbcdefghijklmnopq', 'k'); GP.t = true; tr.splice(0); oBinNow_([KP, BP, GP], ['CR9keepAbcdefghijklmnopq']); oBinNow_(null, null);
            eq('CR9-4b oBinNow_: the files just made (keep) never binned, one already in the bin left, the rest binned; no list -> nothing', [KP.t, BP.t, tr.splice(0).join(',')].join('|'), 'false|true|CR9binAbcdefghijklmnopqr:true');
            eq('CR9-4 outside such a make trashSame_ / oBin_ bin at once (editor menus, field app: as before); inside one they only list', [OX.t, ob.t, oo.length, k4].join('|'), 'true|false|1|');
            // (3) #9: the office link goes in at the quote's row of the fresh read
            var Q3 = NQ('CR9 rows'), ups = [], ghost = Object.create(db), gq = null;
            ghost.rows = function (t) { var r = db.rows(t); return t !== 'Quotes' ? r : r.map(function (x) { if (String(x.QuoteNo) !== Q3) return x; gq = gq || Object.assign({}, x); return gq; }); };
            ghost.update = function (t, r, p) { if (t === 'Quotes' && p && 'PDF' in p) { ups.push(r === gq ? 'fresh' : 'cached'); r = must(db, 'Quotes', 'QuoteNo', String(r.QuoteNo)); } return u0.call(db, t, r, p); };
            QF5_STUB_ = { drive: drv, make: function (d, w, n) { if (mid) { var f = mid; mid = null; f(); } return { url: 'https://drive.google.com/file/d/CR9rw' + (++nU) + 'abcdefghijklmnop/view', file: n + '.pdf', placeholders: 0 }; } };
            var b3 = null; mid = function () { EV.db = function () { return ghost; }; };
            try { b3 = PDFQ(Q3); } finally { EV.db = dbf0; }
            eq('CR9-5 the office link is written at the quote\'s row of the fresh read (not a row read before the ~10 s render)', [ups.join(','), !!b3 && QP(Q3) === b3.url].join('|'), 'fresh|true');
            var Q3b = NQ('CR9 no url'); QF5_STUB_ = { drive: drv, make: function () { return { url: '', file: 'x.pdf', placeholders: 0 }; } }; var a3b = err(function () { PDFQ(Q3b); });
            eq('CR9-5b a make that returns no link: not written (BUSY, try again)', [a3b, QP(Q3b)].join('|'), 'BUSY|');
            // (4) #3: a change dropped from the list lives on in its bucket; another document's dropped change does not count (bar a bucket clash)
            EV.del('OPE'); EV.put('OPE', { n: 999000, d: [] }); oPeBump_(EV, ['CR9-A']); var nA = oPeGet_(EV).n, many = [];
            for (var i = 0; many.length < 121; i++) { var x = 'CAE/PO/2026/9' + ('0000' + i).slice(-4); if (oPeH_(x) !== oPeH_('DC-C9N') && oPeH_(x) !== oPeH_('CR9-Z')) many.push(x); }
            oPeBump_(EV, many); var rec = EV.get('OPE');
            eq('CR9-6 buckets: the list keeps 120, one property < 9 KB; CR9-A dropped but still counted as changed since before it; a document never changed is not counted (r8: counted); later entries exact',
              [rec.d.length, J(rec).length < 9000, rec.b.length, oPeSince_(EV, nA - 1, 'CR9-A'), oPeSince_(EV, nA, 'CR9-Z'), oPeSince_(EV, nA, many[120]), oPeSince_(EV, nA + 121, many[120])].join('|'), '120|true|256|true|false|true|false');
            var D = []; for (var j = 0; j < 120; j++) D.push(['OLD-' + j, 181 + j]); EV.put('OPE', { n: 300, d: D }); var o1 = oPeSince_(EV, 150, 'NEVER'), o2 = oPeSince_(EV, 250, 'NEVER');
            EV.put('OPE', { n: 50, d: D.slice(0, 50).map(function (x, k) { return [x[0], k + 1]; }) }); var o3 = oPeSince_(EV, 10, 'NEVER');
            EV.put('OPE', { n: 7, d: [], b: 'junk' }); var o4 = oPeSince_(EV, 3, 'NEVER'); oPeBump_(EV, ['CR9-J']); var o5 = EV.get('OPE');
            var bx = []; for (var q = 0; q < 256; q++) bx.push('x'); EV.put('OPE', { n: 9, d: [], b: bx }); var o6 = oPeSince_(EV, 3, 'NEVER');
            var b64 = []; for (var q2 = 0; q2 < 64; q2++) b64.push(0); EV.put('OPE', { n: 9, d: [['A', 9]], b: b64 }); var o7 = oPeSince_(EV, 3, 'NEVER'); oPeBump_(EV, ['CR9-K']); var o8 = EV.get('OPE').b.length;
            eq('CR9-7 a record from before run 9 (no buckets): a full list -> what it dropped still counts as changed, as it did; a short list -> exact; broken buckets -> safe side, rebuilt',
              [o1, o2, o3, o4, o5.b.length, o5.n, o6, o7, o8].join('|'), 'true|false|false|true|256|8|true|false|256');
            EV.del('OPE');
            // (5) #8 #6: the panel writes its link only after the run, holding the script lock, only for an unchanged document; never over a newer office link
            uiRun_ = function (fn) { return uiClean_(withLock(function () { return fn(db); })); }; QF5_STUB_ = { drive: drv };
            IS(tY, NI()); var nm = 0, edit = function () { IS(tY, ED(tY, 'CR9-IT-1', { name: 'CR9 renamed ' + (++nm) })); };
            var C9 = function (no) { db.insert('Challans', [{ ChallanNo: no, Kind: 'Delivery', Status: 'Draft', PDF: '' }]); db.insert('ChallanLines', [{ LineID: 'CL-' + no, ChallanNo: no, ItemCode: 'CR9-IT-1', Qty: 1 }]); };
            var pw = [], OLDC = FF('CR9oldChAbcdefghijklmnop', 'DC-C9B.pdf'), FC = FD([OLDC]), seenO = [], inS = [];
            OPE_makePdf0_ = function (d, what, no, o) { seenO.push(J(o || {})); trashSame_(FC, no + '.pdf'); if (mid) { var f = mid; mid = null; f(); } var u = 'https://drive.google.com/file/d/CR9pn' + (++nU) + 'abcdefghijklmnop/view', r = find(d.rows('Challans'), 'ChallanNo', no);
              if (r && !(o && o.noLink)) d.update('Challans', r, { PDF: u }); if (!(o && o.noLog)) log_(d, 'PDF', no, 'stub'); return { url: u, file: no + '.pdf', placeholders: 0 }; };
            db.update = function (t, r, p) { if (t === 'Challans' && p && 'PDF' in p) { pw.push(r.ChallanNo + '=' + (/CR9pn/.test(String(p.PDF)) ? 'panel' : p.PDF)); inS.push(OLK_.s); } return u0.apply(db, arguments); };
            C9('DC-C9B'); u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C9B'), { PDF: 'https://drive.google.com/file/d/CR9oldChAbcdefghijklmnop/view' });
            mid = function () { edit(); u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C9B'), { PDF: 'https://x/office-9' }); }; // the edit clears it; then a newer office link (another execution)
            tr.splice(0); var P8 = uiDo('pdf', { what: 'Challan', no: 'DC-C9B' }), t8 = tr.splice(0).join(','), pn8 = 'CR9pn' + nU + 'abcdefghijklmnop';
            eq('CR9-8 office edit + a newer office link during the panel render: the panel never writes its link (not even for a moment), the office link stays; warned, no Open PDF; its new file binned, the old same-named one left',
              [PD('DC-C9B'), pw.filter(function (x) { return /panel/.test(x); }).length, !!P8.warn, /DC-C9B was changed in the office app/.test(P8.msg), J(P8.links), OLDC.t, t8].join('|'), 'https://x/office-9|0|true|true|[]|false|' + pn8 + ':true');
            var mkS = OPE_makePdf0_, twice = true; OPE_makePdf0_ = function (d, what, no, o) { if (twice) { twice = false; makePdf(d, what, no); } return mkS.apply(this, arguments); };
            mid = edit; var P8b; try { P8b = uiDo('pdf', { what: 'Challan', no: 'DC-C9B' }); } finally { OPE_makePdf0_ = mkS; }
            eq('CR9-8b two makes of the same document in one run, both not kept: the warning names it once', ((/\n([^\n]*) was changed in the office app/.exec(String(P8b.msg)) || [])[1]) + '|' + !!P8b.warn, 'DC-C9B|true');
            pw.splice(0); inS.splice(0); var lP = db.rows('Log').filter(function (l) { return l.Action === 'PDF' && l.Ref === 'DC-C9B'; }).length; var P9 = uiDo('pdf', { what: 'Challan', no: 'DC-C9B' }), lP2 = db.rows('Log').filter(function (l) { return l.Action === 'PDF' && l.Ref === 'DC-C9B'; });
            eq('CR9-9 no change: link written once, after the run, holding the script lock; Open PDF given; then the old same-named copy binned; makePdf asked for noLink + noLog, the PDF log line written once by the wrapper',
              [pw.join(','), inS.join(','), /CR9pn/.test(PD('DC-C9B')), !!P9.warn, (P9.links || []).length > 0, OLDC.t, /"noLink":true/.test(seenO[seenO.length - 1]) && /"noLog":true/.test(seenO[seenO.length - 1]), lP2.length - lP, (lP2.slice(-1)[0] || {}).Details].join('|'), 'DC-C9B=panel|1|true|false|true|true|true|1|DC-C9B.pdf');
            var R9 = { n: oPeGet_(EV).n, hit: [], busy: [], made: [] }, lQ = db.rows('Log').filter(function (l) { return l.Action === 'PDF' && l.Ref === 'DC-C9B'; }).length; OPE_RUN_ = R9; try { makePdf(db, 'Challan', 'DC-C9B', { noLog: true }); } finally { OPE_RUN_ = null; }
            eq('CR9-9b a caller asking for noLog in a panel run: no PDF log line, the make still recorded for its link', [db.rows('Log').filter(function (l) { return l.Action === 'PDF' && l.Ref === 'DC-C9B'; }).length - lQ, R9.made.length].join('|'), '0|1');
            db.insert = function (t) { if (t === 'Log') throw new Error('Log down'); return i0.apply(db, arguments); }; var P10 = null, e10 = err(function () { P10 = uiDo('pdf', { what: 'Challan', no: 'DC-C9B' }); }); db.insert = i0;
            eq('CR9-10 the PDF log line fails: no error, the link still written', [e10, !!P10 && PD('DC-C9B') === String(P10.links && P10.links[0] && P10.links[0].url), !!P10 && !P10.warn].join('|'), 'no error|true|true');
            var ghost2 = Object.create(db), gc = null, ups2 = [];
            ghost2.rows = function (t) { var r = db.rows(t); return t !== 'Challans' ? r : r.map(function (x) { if (String(x.ChallanNo) !== 'DC-C9B') return x; gc = gc || Object.assign({}, x); return gc; }); };
            ghost2.update = function (t, r, p) { if (t === 'Challans' && p && 'PDF' in p) { ups2.push(r === gc ? 'fresh' : 'cached'); r = must(db, 'Challans', 'ChallanNo', String(r.ChallanNo)); } return db.update.call(db, t, r, p); };
            mid = function () { EV.db = function () { return ghost2; }; }; var P11; try { P11 = uiDo('pdf', { what: 'Challan', no: 'DC-C9B' }); } finally { EV.db = dbf0; }
            eq('CR9-11 the panel link goes in at the row of a fresh read (EV.db), not the run\'s cached row', [ups2.join(','), PD('DC-C9B') === P11.links[0].url].join('|'), 'fresh|true');
            var c11 = PD('DC-C9B'); db.update = function (t, r, p) { if (t === 'Challans' && p && p.PDF && OLK_.s) throw new Error('Sheets down'); return u0.apply(db, arguments); }; tr.splice(0);
            var e11 = err(function () { uiDo('pdf', { what: 'Challan', no: 'DC-C9B' }); }), pn11 = 'CR9pn' + nU + 'abcdefghijklmnop', t11 = tr.splice(0).join(','); db.update = u0;
            eq('CR9-11b the link write fails: plain error, the cell untouched, the new file not binned (its link might have gone in)', [/^The PDF was made, but its link could not be saved \(Sheets down\)/.test(e11), PD('DC-C9B') === c11, t11.indexOf(pn11) < 0].join('|'), 'true|true|true');
            var P12b = uiDo('pdf', { what: 'Challan', no: 'DC-NONE' });
            eq('CR9-12b no row to link (as makePdf): no warning, nothing written, Open PDF given', [!!P12b.warn, (P12b.links || []).length > 0].join('|'), 'false|true');
            // a panel PDF while 121 other documents change (an item on many draft POs): its link is kept (r8: the dropped entries counted as changed)
            C9('DC-C9N'); EV.del('OPE'); mid = function () { oPeBump_(EV, many); }; var P12 = uiDo('pdf', { what: 'Challan', no: 'DC-C9N' });
            eq('CR9-12 a panel PDF while 121 other documents are counted: link kept, no warning', [/CR9pn/.test(PD('DC-C9N')), !!P12.warn].join('|'), 'true|false');
            EV.del('OPE');
            // (6) #2: stock tracking off while an open PO still has the item to receive
            IS(tY, NI({ code: 'CR9-PO-1' })); IS(tY, NI({ code: 'CR9-PO-2' }));
            db.insert('POs', [{ PONo: 'PO-C9A', Status: 'Draft' }, { PONo: 'PO-C9X', Status: 'Cancelled' }, { PONo: 'PO-C9P', Status: 'Part received' }, { PONo: 'PO-C9R', Status: 'Received' }, { PONo: 'PO-C9C', Status: 'Closed' }, { PONo: 'PO-C9E', Status: '' }]);
            db.insert('POLines', [{ LineID: 'PL-C9A1', PONo: 'PO-C9A', ItemCode: ' cr9-po-1 ', Qty: 6 }, { LineID: 'PL-C9A2', PONo: 'PO-C9A', ItemCode: 'CR9-PO-1', Qty: 4 }, { LineID: 'PL-C9X', PONo: 'PO-C9X', ItemCode: 'CR9-PO-2', Qty: 50 },
              { LineID: 'PL-C9P1', PONo: 'PO-C9P', ItemCode: 'CR9-OO-1', Qty: 5 }, { LineID: 'PL-C9P2', PONo: 'PO-C9P', ItemCode: 'CR9-OO-2', Qty: 3 }, { LineID: 'PL-C9R', PONo: 'PO-C9R', ItemCode: 'CR9-OO-3', Qty: 3 }, { LineID: 'PL-C9C', PONo: 'PO-C9C', ItemCode: 'CR9-OO-3', Qty: 3 }, { LineID: 'PL-C9E', PONo: 'PO-C9E', ItemCode: 'CR9-OO-4', Qty: 1 }]);
            db.insert('StockMoves', [{ MoveID: 'MV-C9-1', ItemCode: 'CR9-OO-1', Qty: 2, FromLoc: 'SUPPLIER', ToLoc: 'LOC-YARD', RefType: 'PO', RefNo: 'PO-C9P' }, { MoveID: 'MV-C9-2', ItemCode: 'CR9-OO-2', Qty: 3, FromLoc: 'SUPPLIER', ToLoc: 'LOC-YARD', RefType: 'PO', RefNo: 'PO-C9P' }, { MoveID: 'MV-C9-3', ItemCode: 'CR9-OO-1', Qty: 3, FromLoc: 'LOC-YARD', ToLoc: 'LOC-YARD', RefType: 'Challan', RefNo: 'PO-C9P' }]);
            var a13 = err(function () { IS(tY, ED(tY, 'CR9-PO-1', { tracked: 'No' })); }), s13 = must(db, 'Items', 'ItemCode', 'CR9-PO-1').StockTracked;
            var b13 = err(function () { IS(tY, ED(tY, 'CR9-PO-2', { tracked: 'No' })); }), s13b = must(db, 'Items', 'ItemCode', 'CR9-PO-2').StockTracked;
            var oo13 = typeof oStOnOrder_ === 'function' ? ['CR9-OO-1', 'CR9-OO-2', 'CR9-OO-3', 'CR9-OO-4', 'cr9-oo-1 ', 'NONE'].map(function (c) { return oStOnOrder_(db, c) || '-'; }).join(',') : 'missing';
            var c13 = err(function () { IS(tY, ED(tY, 'CR9-PO-1', { name: 'CR9 po renamed' })); }), n13 = must(db, 'Items', 'ItemCode', 'CR9-PO-1').Name, h13 = typeof oStOnOrder_ === 'function' ? oStOnOrder_({ hasTab: function () { return false; } }, 'X') : 'missing';
            eq('CR9-13b another edit of the item on order (tracking kept): saved; a DB without POs / POLines tabs: none on order', [c13, n13, h13].join('|'), 'no error|CR9 po renamed|');
            eq('CR9-13 tracking off with an open PO still to receive (lines summed, code trimmed / any case): ONORDER|PO, nothing saved; only a cancelled PO -> allowed; part received counts what is left; Received / Closed POs not open; blank status = open',
              [a13, s13, b13, s13b, oo13].join('|'), 'ONORDER|PO-C9A|Yes|no error|No|PO-C9P,-,-,PO-C9E,PO-C9P,-');
            // (7) run 9 rerun: opening quantities are whole units (1.0000001 passed oQeNum_'s tolerance)
            var tO9 = add('ywh9@t.com', { YW: 3 }), OP9 = function (d) { e5.cdel('OQEW:ywh9@t.com'); return officeStockOpening(tO9, d); }; IS(tY, NI({ code: 'CR9-OP-1' }));
            var nM = db.rows('StockMoves').length, a14 = err(function () { OP9({ date: '2026-11-19', rows: [{ item: 'CR9-OP-1', loc: 'LOC-YARD', qty: 1.0000001 }] }); }), n14 = db.rows('StockMoves').length - nM;
            var b14 = OP9({ date: '2026-11-19', rows: [{ item: 'CR9-OP-1', loc: 'LOC-YARD', qty: 1 }, { item: 'CR9-OP-1', loc: 'LOC-REPAIR', qty: 1000000 }] }), q14 = db.rows('StockMoves').slice(nM).map(function (m) { return m.Qty; }).join(',');
            eq('CR9-14 opening qty 1.0000001: refused, nothing written; 1 and 1000000 still post as given', [a14, n14, b14.n, q14].join('|'), 'BADINPUT|line 1 qty|0|2|1,1000000');
          } finally { QF5_STUB_ = q5k; uiRun_ = uR0; OPE_makePdf0_ = mk0; OPE_RUN_ = null; EV.lock = lk0; EV.db = dbf0; db.update = u0; db.insert = i0; OPDF_BIN_ = null; mid = null;
            if (DA0 === undefined) { try { delete global.DriveApp; } catch (x) { DriveApp = undefined; } } else DriveApp = DA0; }
        })();
