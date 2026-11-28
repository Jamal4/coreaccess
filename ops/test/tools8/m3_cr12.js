        // ---- M3 CR run 12 (harness only): balances rounded once; per-part "enough for" from the raw balance; put-back compares text as text;
        //      office PDF lock refused -> new files binned; panel quote PDF: the previous PDF binned only once the new link is in
        (function () {
          var J = JSON.stringify, rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IS = function (t, d) { rc(); return officeItemSave(t, d); };
          var NI = function (o) { return Object.assign({ code: 'CR12-IT-1', name: 'CR12 item', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 4, reorder: 0, status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          var QP = function (n) { return String(must(db, 'Quotes', 'QuoteNo', n).PDF || ''); }, PD = function (n) { return String(must(db, 'Challans', 'ChallanNo', n).PDF || ''); };
          var NQ = function (s) { rc(); var no = officeQuoteSave(tS, base({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] })).no; db.update('Quotes', must(db, 'Quotes', 'QuoteNo', no), { PDF: '' }); return no; };
          var row = function (t, c) { return (t.rows || []).filter(function (x) { return x.code === c; })[0]; };
          var nm = 0, mv = function (it, q, to) { db.insert('StockMoves', { MoveID: 'MV-C12-' + (++nm), MoveDate: new Date(2026, 10, 2), ItemCode: it, Qty: q, FromLoc: 'LOC-SUPPLIER', ToLoc: to || 'LOC-YARD', RefType: 'Opening', RefNo: 'OPEN-C12' }); };
          var EV = oEnv_(), dbf0 = EV.db, u0 = db.update, i0 = db.insert, nI = 0, tr = [];
          var ID = function (p) { return 'CR12' + p + (++nI) + 'abcdefghijklmnop'; }, UR = function (id) { return 'https://drive.google.com/file/d/' + id + '/view'; };
          var DA0 = typeof DriveApp === 'undefined' ? undefined : DriveApp, LS0 = LockService, ls0 = OLK_.ls, fl0 = SpreadsheetApp.flush;
          var q5k = QF5_STUB_, qd0 = QF5_DRIVE_, uR0 = uiRun_, mk0 = OPE_makePdf0_;
          var FF = function (id, name) { return { t: false, getId: function () { return id; }, getName: function () { return name; }, isTrashed: function () { return this.t; }, setTrashed: function (v) { this.t = v; tr.push(id + ':' + v); } }; };
          var BZ = false, LK = function (busy, flushBad) { BZ = !!busy; var fk = { getScriptLock: function () { return { waitLock: function () { if (BZ) throw new Error('timeout'); }, releaseLock: function () {} }; }, getDocumentLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
            OLK_.ls = fk; LockService = fk; SpreadsheetApp.flush = function () { if (flushBad) throw new Error('Flush failed'); }; };
          var UL = function () { BZ = false; OLK_.ls = ls0; LockService = LS0; SpreadsheetApp.flush = fl0; };
          try {
            DriveApp = { getFileById: function (id) { return { setTrashed: function (v) { tr.push(id + ':' + v); }, isTrashed: function () { return false; }, getDateCreated: function () { throw new Error('no file'); } }; } };
            // (1) #1: balances summed at full precision, rounded once
            db.insert('Items', [{ ItemCode: 'CR12-P1', Name: 'CR12 part', Unit: 'kg', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CR12-P2', Name: 'CR12 part 2', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' },
              { ItemCode: 'CR12-P3', Name: 'CR12 part 3', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CR12-S1', Name: 'CR12 set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' }]);
            db.insert('Locations', { LocID: 'LOC-C12Y2', Name: 'CR12 rack 2', Type: 'Yard', SiteID: '', Status: 'Active' });
            mv('CR12-P1', 0.004); mv('CR12-P1', 0.004, 'LOC-C12Y2'); mv('CR12-P1', 0.004, 'LOC-REPAIR'); mv('CR12-P1', 0.004, 'LOC-REPAIR');
            var r1 = row(officeStockList(tY), 'CR12-P1'), v1 = officeStockItem(tY, 'CR12-P1');
            eq('CR12-1 two yard racks of 0.004: yard 0.01 (r11: 0), repair 0.004 x 2 = 0.01, owned 0.02 (raw sum rounded once); item view the same',
              [r1.yard, r1.rep, r1.own, v1.yard, v1.rep, v1.own].join('|'), '0.01|0.01|0.02|0.01|0.01|0.02');
            mv('CR12-P2', 0.004);
            eq('CR12-1b one location of 0.004 still shows 0 (as before)', [row(officeStockList(tY), 'CR12-P2').yard].join('|'), '0');
            db.insert('Items', { ItemCode: 'CR12-P4', Name: 'CR12 part 4', Unit: 'kg', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }); mv('CR12-P4', 0.004); mv('CR12-P4', 0.004, 'LOC-REPAIR');
            var r1c = row(officeStockList(tY), 'CR12-P4');
            eq('CR12-1c yard 0.004 + repair 0.004: each shows 0, owned 0.01 (the raw total rounded once, not 0 + 0)', [r1c.yard, r1c.rep, r1c.own].join('|'), '0|0|0.01');
            // (2) #9: per-part "enough for" from the server (raw balance, challan tolerance), the shown yard still rounded
            db.insert('KitParts', [{ KitPartID: 'KP-C12A', SetCode: 'CR12-S1', ItemCode: 'CR12-P2', QtyPerSet: 1 }, { KitPartID: 'KP-C12B', SetCode: 'CR12-S1', ItemCode: 'CR12-P3', QtyPerSet: 0.5 }]);
            mv('CR12-P2', 0.995); mv('CR12-P3', 1.4999);
            var k2 = officeStockItem(tY, 'CR12-S1').kit.map(function (p) { return p.code + ':' + p.yard + ':' + p.mk; }).join(',');
            eq('CR12-2 part 0.999 of 1 per set -> enough for 0 (shown yard 1); 1.4999 of 0.5 -> 2; set total 0', k2 + '|' + officeStockItem(tY, 'CR12-S1').make, 'CR12-P2:1:0,CR12-P3:1.5:2|0');
            mv('CR12-P2', 0.001); mv('CR12-P3', -3);
            var k2b = officeStockItem(tY, 'CR12-S1').kit.map(function (p) { return p.code + ':' + p.mk; }).join(',');
            eq('CR12-2b 0.999 + 0.001 -> 1; a negative balance -> 0 (not negative)', k2b + '|' + setAvail_(db, 'CR12-S1', 'LOC-YARD'), 'CR12-P2:1,CR12-P3:0|0');
            // (3) #5: the put-back check compares text fields as text, number fields as numbers
            IS(tY, NI()); var IT = function () { return must(db, 'Items', 'ItemCode', 'CR12-IT-1'); };
            u0.call(db, 'Items', IT(), { Name: '10', WeightKg: '2.50' });
            var LA = UR(ID('a')); db.insert('Challans', { ChallanNo: 'DC-C12A', Kind: 'Delivery', Status: 'Draft', PDF: LA }); db.insert('ChallanLines', { LineID: 'CL-C12A', ChallanNo: 'DC-C12A', ItemCode: 'CR12-IT-1', Qty: 1 });
            var BK = function () { u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C12A'), { PDF: LA }); u0.call(db, 'Items', IT(), { Name: '10', WeightKg: '2.50' }); };
            var FI = function () { var hit = false; db.update = function (t) { if (t === 'Items') { hit = true; throw new Error('sheet down'); } return u0.apply(db, arguments); }; return function () { return hit; }; };
            var VW = function (f) { var v = Object.create(db); v.rows = function (t) { var r = db.rows(t); return t !== 'Items' ? r : r.map(function (x) { return String(x.ItemCode) === 'CR12-IT-1' ? Object.assign({}, x, f) : x; }); }; return v; };
            var out3 = [];
            [[{ name: '11' }, { Name: '+010' }], [{ name: '11' }, { Name: '1e1' }], [{ name: '11' }, { Name: ' 10 ' }], [{ name: '11' }, {}], [{ kg: 3 }, { WeightKg: 2.5 }], [{ kg: 3 }, { WeightKg: '2.5' }], [{ kg: 3 }, { WeightKg: 3 }]].forEach(function (c) {
              BK(); var h = FI(), e; EV.db = function () { return h() ? VW(c[1]) : dbf0.apply(EV, arguments); };
              try { e = err(function () { IS(tY, ED(tY, 'CR12-IT-1', c[0])); }); } finally { db.update = u0; EV.db = dbf0; }
              out3.push(e + ':' + (PD('DC-C12A') === LA ? 'back' : PD('DC-C12A') === '' ? 'clear' : 'x'));
            });
            eq('CR12-3 item write failed; fresh read shows Name "+010" / "1e1" -> cleared (r11: back, numeric match), " 10 " / as before -> back; WeightKg 2.5 or "2.5" for "2.50" -> back, 3 -> cleared',
              out3.join(','), 'sheet down:clear,sheet down:clear,sheet down:back,sheet down:back,sheet down:back,sheet down:back,sheet down:clear');
            BK(); var e3e; db.update = function (t, r, p) { if (t === 'Items') { u0.apply(db, arguments); throw new Error('sheet down'); } return u0.apply(db, arguments); };
            try { e3e = err(function () { IS(tY, ED(tY, 'CR12-IT-1', { name: '+010' })); }); } finally { db.update = u0; }
            eq('CR12-3b end to end: Name "10" -> "+010" written then threw: the challan link stays cleared (prints the new name)', [e3e, String(IT().Name), PD('DC-C12A')].join('|'), 'sheet down|\'+010|'); // the app writes text as \'+010 (kept as text in the sheet)
            // (4) #2: office PDF publish: the script lock refused / the fresh read failed -> the new PDF + Doc binned; the write / flush threw -> both kept
            var Q4 = NQ('CR12 office pdf'), v4 = oQPdfVer_(db, Q4).v;
            var R4 = function (mode) {
              var a = ID('p'), b = ID('d'), r0 = { url: UR(a), doc: UR(b) }, old = FF(ID('o'), 'old.pdf'), e; tr = [];
              u0.call(db, 'Quotes', must(db, 'Quotes', 'QuoteNo', Q4), { PDF: '' });
              LK(mode === 'busy', mode === 'flush');
              if (mode === 'read') EV.db = function () { throw new Error('read failed'); };
              if (mode === 'write') db.update = function (t, r, p) { if (t === 'Quotes' && p && p.PDF === r0.url) throw new Error('write failed'); return u0.apply(db, arguments); };
              if (mode === 'wrote') db.update = function (t, r, p) { if (t === 'Quotes' && p && p.PDF === r0.url) { u0.apply(db, arguments); throw new Error('write failed'); } return u0.apply(db, arguments); };
              try { e = err(function () { oQPdfLinkIf_(EV, db, Q4, r0, mode === 'ver' ? 'other' : v4, [old]); }); } finally { UL(); EV.db = dbf0; db.update = u0; }
              var nb = tr.filter(function (t) { return t === a + ':true' || t === b + ':true'; }).length;
              return [mode, e, QP(Q4) === r0.url ? 'new' : QP(Q4) || 'blank', nb, old.t].join(':');
            };
            var o4 = ['ok', 'busy', 'read', 'ver', 'write', 'wrote', 'flush'].map(R4);
            eq('CR12-4 office PDF link: ok -> linked, old copy binned; lock busy / read failed -> error, the 2 new files binned (r11: left); version changed -> BUSY, binned; write failed (in or not) / flush failed -> error, nothing binned',
              o4.join(','), 'ok:no error:new:0:true,busy:BUSY:blank:2:false,read:read failed:blank:2:false,ver:BUSY:blank:2:false,write:write failed:blank:0:false,wrote:write failed:new:0:false,flush:Flush failed:new:0:false');
            eq('CR12-4b no lock left held / counted', [OLK_.s].join('|'), '0');
            // (5) #6: panel quote PDF: qf5Pdf_'s bin of the previous PDF only after the new link is in
            var Q5 = NQ('CR12 panel pdf'), OLD = UR(ID('old')), seen = [], mid = null, base5 = fileName_(Q5) + ' Aziz.pdf';
            uiRun_ = function (fn) { return uiClean_(withLock(function () { return fn(db); })); };
            QF5_STUB_ = {};
            var FDv = { name: function (u) { return u === OLD ? base5 : ''; }, trash: function (u, b) { seen.push([u === OLD, b === qf5Base_(base5) && 'b', QP(Q5) !== OLD && QP(Q5) !== '' ? 'linked' : 'old-in-cell'].join(',')); } };
            OPE_makePdf0_ = function (d, what, no, o) { if (mid) { var f = mid; mid = null; f(); } var r = { url: UR(ID('mk')), doc: UR(ID('dc')), file: no + '.pdf', placeholders: 0 };
              if (!(o && o.noLink)) d.update('Quotes', find(d.rows('Quotes'), 'QuoteNo', no), { PDF: r.url }); return r; };
            var P5 = function (act, busy) { u0.call(db, 'Quotes', must(db, 'Quotes', 'QuoteNo', Q5), { PDF: OLD }); seen = []; tr = []; QF5_DRIVE_ = FDv; LK(false, false); var p;
              try { p = act === 'pdf' ? uiDo('pdf', { what: 'Quote', no: Q5 }) : uiDo('quotePdf', { quoteNo: Q5 }); } finally { UL(); }
              var same = QF5_DRIVE_ === FDv; QF5_DRIVE_ = qd0; return [seen.join(';') || 'none', QP(Q5) === OLD ? 'OLD' : /CR12mk/.test(QP(Q5)) ? 'new' : QP(Q5), !!p.warn, /went to the bin/.test(p.msg), /was kept/.test(p.msg), tr.length, same].join('|'); };
            var a5 = P5('quotePdf'), b5 = P5('pdf'); mid = function () { BZ = true; }; var c5 = P5('quotePdf');
            mid = function () { oPeBump_(EV, [Q5]); }; var d5 = P5('quotePdf');
            eq('CR12-5 panel quote PDF: the previous PDF binned after the new link is in (both actions); script lock busy / office edit meanwhile -> link not kept, the previous PDF kept (r11: binned with the cell still on it), message says kept; drive put back',
              [a5, b5, c5, d5].join(' / '), 'true,b,linked|new|false|true|false|0|true / true,b,linked|new|false|true|false|0|true / none|OLD|true|false|true|2|true / none|OLD|true|false|true|2|true');
            // a run whose make fails: no deferred bin left behind, drive put back
            OPE_makePdf0_ = function () { throw new Error('render failed'); }; u0.call(db, 'Quotes', must(db, 'Quotes', 'QuoteNo', Q5), { PDF: OLD }); seen = []; QF5_DRIVE_ = FDv; var e5f;
            try { e5f = err(function () { uiDo('quotePdf', { quoteNo: Q5 }); }); } finally { var same5 = QF5_DRIVE_ === FDv; QF5_DRIVE_ = qd0; }
            eq('CR12-6 the render fails: nothing binned, cell still on the previous PDF, drive put back', [/render failed/.test(e5f), seen.length, QP(Q5) === OLD, same5].join('|'), 'true|0|true|true');
          } finally { db.update = u0; db.insert = i0; EV.db = dbf0; UL(); QF5_STUB_ = q5k; QF5_DRIVE_ = qd0; uiRun_ = uR0; OPE_makePdf0_ = mk0; OPE_RUN_ = null; DriveApp = DA0; }
        })();
