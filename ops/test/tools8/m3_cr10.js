        // ---- M3 CR run 10 (harness only): lock exits keep the operation's error; office PDF read under the lease; no PDF column; never over a newer
        //      link (office + panel); panel publish flush failure said plainly; item save logs first, links back when the write did not go in
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
            var DT = {}, TR = {}, IDN = function (p) { return 'CR10' + p + (++nU) + 'abcdefghijklmnop'; }, UR = function (id) { return 'https://drive.google.com/file/d/' + id + '/view'; };
            DriveApp = { getFileById: function (id) { return { setTrashed: function (v) { tr.push(id + ':' + v); TR[id] = v; }, isTrashed: function () { return !!TR[id]; }, getDateCreated: function () { if (!(id in DT)) throw new Error('no file'); return new Date(DT[id]); } }; } };
            // (1) #9: a flush failing at the lock's exit never hides the operation's own error; after a good operation it is the error
            var LS0 = LockService, ls0 = OLK_.ls, fl0 = SpreadsheetApp.flush, held = 0, fF = false, EVr = officeEnv_();
            var fk = { getScriptLock: function () { return { waitLock: function () { held++; }, releaseLock: function () { held--; } }; }, getDocumentLock: function () { return { waitLock: function () { held++; }, releaseLock: function () { held--; } }; } };
            var a1, a2, a3, b1, b2, b3, c1, c2, h1;
            OLK_.ls = fk; LockService = fk; SpreadsheetApp.flush = function () { if (fF) throw new Error('Flush failed'); };
            try {
              fF = true; a1 = err(function () { EVr.lock(function () { oFail_('BUSY'); }); }); a2 = err(function () { EVr.lock(function () { return 1; }); });
              b1 = err(function () { oScrLock_(function () { throw new Error('write failed'); }); }); b2 = err(function () { oScrLock_(function () { return 1; }); });
              c1 = err(function () { withLock(function () { throw new Error('panel failed'); }); }); c2 = err(function () { withLock(function () { return 1; }); });
              fF = false; a3 = EVr.lock(function () { return 7; }); b3 = oScrLock_(function () { return 8; }) + withLock(function () { return 1; }); h1 = [held, OLK_.s].join(',');
            } finally { OLK_.ls = ls0; LockService = LS0; SpreadsheetApp.flush = fl0; fF = false; }
            eq('CR10-1 lock exits (env.lock / oScrLock_ / withLock): the operation failed and the flush failed -> the operation\'s error; it worked and the flush failed -> the flush error; values returned; every lock let go',
              [a1, a2, b1, b2, c1, c2, a3, b3, h1].join('|'), 'BUSY|Flush failed|write failed|Flush failed|panel failed|Flush failed|7|9|0,0');
            // (2) #5: the office PDF is made from a read taken once the lease is held (an edit saved after the click: no needless BUSY)
            var Q5 = NQ('CR10 lease read'), lq = ln(Q5), gl = Object.assign({}, lq, { Qty: num(lq.Qty) + 1 }), gh5 = Object.create(db), seen5 = [], sw = false, g0 = EV.get;
            gh5.rows = function (t) { var r = db.rows(t); return t !== 'QuoteLines' ? r : r.map(function (x) { return x === lq ? gl : x; }); }; gh5.update = function () { return db.update.apply(db, arguments); };
            QF5_STUB_ = { drive: drv, make: function (d, w, n) { seen5.push(d === gh5); var id = IDN('le'); return { url: UR(id), file: n + '.pdf', placeholders: 0 }; } };
            EV.get = function (k) { if (k === 'OQPB:' + Q5 && !sw) { sw = true; EV.db = function () { return gh5; }; } return g0.apply(this, arguments); };
            var r5 = null, e5x; try { e5x = err(function () { r5 = PDFQ(Q5); }); } finally { EV.get = g0; EV.db = dbf0; }
            eq('CR10-2 an edit saved between the click and the lease: the PDF is made from the read under the lease, its fingerprint matches -> linked (r9: BUSY)', [e5x, !!(r5 && r5.made), !!r5 && QP(Q5) === r5.url, seen5.join(',')].join('|'), 'no error|true|true|true');
            // (3) #4: no PDF column: nothing linked, the old same-named copies kept, no BUSY
            var Q4 = NQ('CR10 no column'), O4 = FF(IDN('op'), Q4 + '.pdf'), O4d = FF(IDN('od'), Q4), F4 = FD([O4, O4d]), gh4 = Object.create(db);
            gh4.headers = function (t) { var h = db.headers(t); return t === 'Quotes' ? h.filter(function (x) { return x !== 'PDF'; }) : h; }; gh4.update = function () { return db.update.apply(db, arguments); };
            QF5_STUB_ = { drive: drv, make: function (d, w, n) { trashSame_(F4, n); trashSame_(F4, n + '.pdf'); var id = IDN('nc'); return { url: UR(id), file: n + '.pdf', placeholders: 0 }; } };
            tr.splice(0); var r4 = null, e4; EV.db = function () { return gh4; }; try { e4 = err(function () { r4 = PDFQ(Q4); }); } finally { EV.db = dbf0; }
            eq('CR10-3 no PDF column in Quotes: the PDF is given, nothing written, the old same-named PDF + Doc kept, nothing binned (r9: old ones binned)', [e4, !!(r4 && r4.url), QP(Q4), O4.t, O4d.t, tr.splice(0).length].join('|'), 'no error|true||false|false|0');
            // (4) #8 office: the cell already links a newer PDF (a later run published first) -> not over it
            var Q8 = NQ('CR10 newer'), O8 = FF(IDN('o8'), Q8 + '.pdf'), F8 = FD([O8]), NWid = IDN('nw'), own8 = '', mode8 = 'newer'; DT[NWid] = 9e12;
            QF5_STUB_ = { drive: drv, make: function (d, w, n) { trashSame_(F8, n + '.pdf'); own8 = IDN('of'); DT[own8] = 5e12; if (mode8 === 'newer') u0.call(db, 'Quotes', must(db, 'Quotes', 'QuoteNo', Q8), { PDF: UR(NWid) }); if (mode8 === 'trashed') TR[own8] = true; return { url: UR(own8), file: n + '.pdf', placeholders: 0 }; } };
            tr.splice(0); var e8 = err(function () { PDFQ(Q8); }), t8 = tr.splice(0).join(',');
            eq('CR10-4 office PDF: during its render another run linked a newer PDF -> BUSY, the newer link stays, its own file binned, the old same-named copy kept (r9: written over the newer link)', [e8, QP(Q8) === UR(NWid), O8.t, t8].join('|'), 'BUSY|true|false|' + own8 + ':true');
            mode8 = 'trashed'; u0.call(db, 'Quotes', must(db, 'Quotes', 'QuoteNo', Q8), { PDF: '' }); oQPdfStale_(EV, db, Q8); var e8b = err(function () { PDFQ(Q8); }), q8b = QP(Q8);
            mode8 = 'older'; var OLDid = IDN('ol'); DT[OLDid] = 1e12; u0.call(db, 'Quotes', must(db, 'Quotes', 'QuoteNo', Q8), { PDF: UR(OLDid) }); oQPdfStale_(EV, db, Q8); var r8c = null, e8c = err(function () { r8c = PDFQ(Q8); }), q8c = QP(Q8), o8c = O8.t;
            var NOid = IDN('nd'); mode8 = 'x'; u0.call(db, 'Quotes', must(db, 'Quotes', 'QuoteNo', Q8), { PDF: UR(NOid) }); oQPdfStale_(EV, db, Q8); var r8d = null, e8d = err(function () { r8d = PDFQ(Q8); });
            eq('CR10-4b its own file already in the bin -> BUSY, nothing linked; a cell with an older PDF -> linked, old copy binned; Drive can\'t read the cell\'s file -> linked (as before)',
              [e8b, q8b === '', e8c, !!r8c && q8c === r8c.url, o8c, e8d, !!r8d && QP(Q8) === r8d.url].join('|'), 'BUSY|true|no error|true|true|no error|true');
            // (5) #8 panel + #10: a newer PDF already linked -> not kept, said so; the publish flush fails -> plain error, both copies kept
            uiRun_ = function (fn) { return uiClean_(withLock(function () { return fn(db); })); }; QF5_STUB_ = { drive: drv };
            db.insert('Challans', [{ ChallanNo: 'DC-C10P', Kind: 'Delivery', Status: 'Draft', PDF: '' }]);
            var OC = FF(IDN('oc'), 'DC-C10P.pdf'), FC = FD([OC]), NWc = IDN('nc'), ownP = ''; DT[NWc] = 9e12;
            OPE_makePdf0_ = function (d, what, no, o) { trashSame_(FC, no + '.pdf'); if (mid) { var f = mid; mid = null; f(); } ownP = IDN('pn'); DT[ownP] = 5e12; var u = UR(ownP), r = find(d.rows('Challans'), 'ChallanNo', no);
              if (r && !(o && o.noLink)) d.update('Challans', r, { PDF: u }); return { url: u, file: no + '.pdf', placeholders: 0 }; };
            mid = function () { u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C10P'), { PDF: UR(NWc) }); };
            tr.splice(0); var P5 = uiDo('pdf', { what: 'Challan', no: 'DC-C10P' }), t5 = tr.splice(0).join(',');
            eq('CR10-5 panel PDF: another run linked a newer PDF during the render -> the newer link stays, warned, no Open PDF, its own file binned, the old same-named copy kept (r9: written over it)',
              [PD('DC-C10P') === UR(NWc), !!P5.warn, /DC-C10P: a newer PDF was made meanwhile/.test(P5.msg), J(P5.links), OC.t, t5].join('|'), 'true|true|true|[]|false|' + ownP + ':true');
            var mk10 = OPE_makePdf0_; OPE_makePdf0_ = function (d, what, no) { return { url: '', file: no + '.pdf', placeholders: 0 }; }; var P5b = null, e5b;
            try { e5b = err(function () { P5b = uiDo('pdf', { what: 'Challan', no: 'DC-C10P' }); }); } finally { OPE_makePdf0_ = mk10; }
            eq('CR10-5b a panel PDF run that makes no file: answered normally, no warning', [e5b, !!P5b && !P5b.warn].join('|'), 'no error|true');
            var pp0 = oPePub_, armF = false; SpreadsheetApp.flush = function () { if (armF) { armF = false; throw new Error('Flush failed'); } }; oPePub_ = function () { var r = pp0.apply(this, arguments); armF = true; return r; };
            DT[NWc] = 1; tr.splice(0); var e6; try { e6 = err(function () { uiDo('pdf', { what: 'Challan', no: 'DC-C10P' }); }); } finally { oPePub_ = pp0; SpreadsheetApp.flush = fl0; }
            eq('CR10-6 the flush after the panel link write fails: a plain "link may not have been saved" error; neither the new nor the old same-named copy binned (r9: the bare flush error)',
              [/^The PDF was made, but its link may not have been saved \(Flush failed\)\. Make the PDF again\.$/.test(e6), tr.splice(0).length, OC.t].join('|'), 'true|0|false');
            // (6) #12: item save -> every "PDF out of date" line first; a failed item write puts the cleared links back only when a fresh read shows the item unchanged
            IS(tY, NI({ code: 'CR10-IT-1' })); var LA = UR(IDN('la')), LB = UR(IDN('lb'));
            db.insert('Challans', [{ ChallanNo: 'DC-C10A', Kind: 'Delivery', Status: 'Draft', PDF: LA }, { ChallanNo: 'DC-C10B', Kind: 'Delivery', Status: 'Draft', PDF: LB }]);
            db.insert('ChallanLines', [{ LineID: 'CL-C10A', ChallanNo: 'DC-C10A', ItemCode: 'CR10-IT-1', Qty: 1 }, { LineID: 'CL-C10B', ChallanNo: 'DC-C10B', ItemCode: 'CR10-IT-1', Qty: 1 }]);
            var NMx = function () { return String(must(db, 'Items', 'ItemCode', 'CR10-IT-1').Name); }, BK = function () { u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C10A'), { PDF: LA }); u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C10B'), { PDF: LB }); };
            var nLog = 0; db.insert = function (t, r) { if (t === 'Log' && r && r.Action === 'PDF out of date' && ++nLog === 2) throw new Error('log down'); return i0.apply(db, arguments); };
            var e7, n7 = NMx(); try { e7 = err(function () { IS(tY, ED(tY, 'CR10-IT-1', { name: 'CR10 should not save' })); }); } finally { db.insert = i0; }
            eq('CR10-7 the second document\'s log line fails: nothing cleared (both links kept), the item not changed (r9: the first link cleared)', [e7, PD('DC-C10A') === LA, PD('DC-C10B') === LB, NMx() === n7].join('|'), 'log down|true|true|true');
            var k8 = db.rows('Log').filter(function (l) { return l.Action === 'PDF link kept'; }).length;
            db.update = function (t) { if (t === 'Items') throw new Error('sheet down'); return u0.apply(db, arguments); }; var e9; try { e9 = err(function () { IS(tY, ED(tY, 'CR10-IT-1', { name: 'CR10 fails' })); }); } finally { db.update = u0; }
            var k9 = db.rows('Log').filter(function (l) { return l.Action === 'PDF link kept'; }).length - k8;
            eq('CR10-8 the item write fails (nothing in): both links back, a "PDF link kept" line each', [e9, PD('DC-C10A') === LA, PD('DC-C10B') === LB, NMx() === n7, k9].join('|'), 'sheet down|true|true|true|2');
            var FW = function (bad) { var hit = false; db.update = function (t) { if (t === 'Items') { hit = true; throw new Error('sheet down'); } return u0.apply(db, arguments); }; EV.db = function () { return hit ? bad() : dbf0.apply(EV, arguments); }; }; // the fresh read breaks only after the item write failed
            var e10; FW(function () { throw new Error('read failed'); }); try { e10 = err(function () { IS(tY, ED(tY, 'CR10-IT-1', { name: 'CR10 fails 2' })); }); } finally { db.update = u0; EV.db = dbf0; }
            var c10 = [PD('DC-C10A'), PD('DC-C10B')].join(','); BK();
            var e10b; FW(function () { return null; }); try { e10b = err(function () { IS(tY, ED(tY, 'CR10-IT-1', { name: 'CR10 fails 3' })); }); } finally { db.update = u0; EV.db = dbf0; }
            var c10b = [PD('DC-C10A'), PD('DC-C10B')].join(','); BK();
            var gh11 = Object.create(db); gh11.rows = function (t) { var r = db.rows(t); return t !== 'Items' ? r : r.map(function (x) { return String(x.ItemCode) === 'CR10-IT-1' ? Object.assign({}, x, { Name: 'Someone else 11' }) : x; }); };
            var e11; FW(function () { return gh11; }); try { e11 = err(function () { IS(tY, ED(tY, 'CR10-IT-1', { name: 'CR10 fails 4' })); }); } finally { db.update = u0; EV.db = dbf0; }
            var c11 = [PD('DC-C10A'), PD('DC-C10B')].join(',');
            eq('CR10-9 the item write fails but the fresh read can\'t be made (throws / none) or shows the item changed: the links stay cleared (safe side)', [e10, c10, e10b, c10b, e11, c11].join('|'), 'sheet down|,|sheet down|,|sheet down|,');
            BK(); var r12 = IS(tY, ED(tY, 'CR10-IT-1', { name: 'CR10 saved' }));
            eq('CR10-10 a good save: both links cleared, counted, logged as before', [r12.old, PD('DC-C10A'), PD('DC-C10B'), NMx()].join('|'), '2|||CR10 saved');
          } finally { QF5_STUB_ = q5k; uiRun_ = uR0; OPE_makePdf0_ = mk0; OPE_RUN_ = null; EV.lock = lk0; EV.db = dbf0; db.update = u0; db.insert = i0; OPDF_BIN_ = null; mid = null;
            if (DA0 === undefined) { try { delete global.DriveApp; } catch (x) { DriveApp = undefined; } } else DriveApp = DA0; }
        })();
