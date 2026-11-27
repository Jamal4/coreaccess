        // ---- M8 CodeRabbit run 2 (harness only): CH-48 ... CH-58
        (function () { var LAST = '', EQ = function (n) { LAST = n; return eq.apply(this, arguments); }; try {
          var tP = add('che3bps@t.com', { PS: 2 }), tW = add('che3byw@t.com', { YW: 2 }), rc = function () { ['che3bps@t.com', 'che3byw@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var SV = function (t, c) { rc(); return officeChallanSave(t, c); }, G = function (t, no) { rc(); return officeChallanGet(t, no); };
          var PO = function (t, no, veh) { rc(); return officeChallanPost(t, no, officeChallanGet(t, no).ev, veh); }, CX = function (t, no) { rc(); return officeChallanCancel(t, no, officeChallanGet(t, no).ev, 'test'); };
          var mvs = function (no) { return db.rows('StockMoves').filter(function (v) { return v.RefNo === no && v.RefType === 'Challan'; }); };
          var row = function (no) { return find(db.rows('Challans'), 'ChallanNo', no); }, lns = function (no) { return oChLines_(db, no).map(function (l) { return l.ItemCode + ':' + l.Qty; }).sort().join(','); };
          var J = 'CAE/J/2026/801', Y = 'CH-YARD', SUP = 'SUP-0001', D = '2026-11-20', env = oEnv_();
          postOpeningStock(db, [{ ItemCode: 'CH-STD', Qty: 30, LocID: Y }, { ItemCode: 'CH-BRD', Qty: 30, LocID: Y }], new Date(2026, 10, 4));
          // (1) + (6): the timed sweep
          (function () { var L0 = LockService, SD = SheetDb, R0 = appSweepRun_, SA0 = SpreadsheetApp, U0 = uiDo, MK = makePdf, lg = [], held = [], out = [], fl = null, rb = null, scan = true, made = [];
            var lk = function (n) { return { tryLock: function () { lg.push(n); held.push(n); return true; }, waitLock: function () { lg.push('w' + n); held.push(n); }, releaseLock: function () { lg.push('-' + n); held.splice(held.lastIndexOf(n), 1); } }; };
            var fake = { hasTab: function () { return true; }, headers: function () { return ['Status', 'AppPdf']; }, sheet: function () { return { getLastRow: function () { return 2; }, getRange: function () { return { getValues: function () { return [['Submitted']]; } }; } }; } };
            LockService = { getScriptLock: function () { return lk('script'); }, getDocumentLock: function () { return lk('doc'); } };
            SheetDb = function () { return scan ? fake : db; };
            SpreadsheetApp = Object.assign({}, SA0, { flush: function () { lg.push('flush:' + held.join('+')); if (fl) throw new Error(fl); } });
            makePdf = function (d, w, n) { made.push(w + ' ' + n); return { url: 'u', doc: '', file: n }; };
            [['Challans', 'AppMsg'], ['Quotes', 'AppPdf'], ['Quotes', 'AppPdfBy']].forEach(function (x) { db.ensureColumn(x[0], x[1]); });
            var ch = db.rows('Challans')[0], qn = String(db.rows('Quotes')[0].QuoteNo), msg0 = ch.AppMsg;
            try {
              appSweepRun_ = function () { lg.push('run'); throw new Error('sweep boom'); };
              var e1 = err(function () { appSweep(); }); out.push(e1, lg.join(','), held.length, OLK_.s); lg = [];
              fl = 'flush boom'; var e2 = err(function () { appSweep(); }); out.push(e2, held.length); lg = [];
              appSweepRun_ = function () { lg.push('run'); }; var e3 = err(function () { appSweep(); }); out.push(e3, held.length); fl = null; lg = [];
              EQ('CH-48 the sweep flushes holding both locks, also when it throws (its error kept, also if the flush fails too); a good run whose flush fails reports the flush',
                out.join('|'), 'sweep boom|script,doc,run,flush:script+doc,-doc,-script|0|0|sweep boom|0|flush boom|0');
              out = []; var seen = [];
              appSweepRun_ = function (o) { lg.push('run'); o.later.push({ k: 'q', no: qn, by: 'che3bps@t.com' }); makePdf(db, 'Challan', String(ch.ChallanNo)); makePdf(db, 'Invoice', 'INV-X'); scan = false; };
              uiDo = function (a, x) { seen.push(a + ':' + (x.quoteNo || x.no) + ':held=' + held.join('+') + ':s=' + OLK_.s); lg.push('pdf'); return a === 'quotePdf' ? { msg: 'ok', links: [{ url: 'u' }] } : { msg: 'x saved.\n' + x.no + ' was changed in the office app while this PDF was being made, so its link was not kept. Make the PDF again.', links: [] }; };
              appSweep(); scan = true;
              var qq = find(db.rows('Quotes'), 'QuoteNo', qn);
              out.push(made.join(','), seen.join(','), lg.join(','), /^Made /.test(String(qq.AppPdf)), /^Posted; PDF not made: .*changed in the office app/.test(String(row(ch.ChallanNo).AppMsg)));
              EQ('CH-49 the sweep makes no PDF inside its locks: a challan PDF is queued (other makePdf calls run), quote + challan PDFs made after both locks are let go (panel PDF run), results written holding script + document lock',
                out.join('|'), 'Invoice INV-X|quotePdf:' + qn + ':held=:s=0,pdf:' + ch.ChallanNo + ':held=:s=0|script,doc,run,flush:script+doc,-doc,-script,pdf,wscript,wdoc,-doc,flush:script,-script,pdf,wscript,wdoc,-doc,flush:script,-script|true|true');
              // out of time: a quote is left as it is (Requested: the next run), a challan says so
              out = []; seen = []; db.update('Quotes', qq, { AppPdf: 'Requested' }); scan = false;
              qaLater_([{ k: 'q', no: qn, by: 'x' }, { k: 'ch', no: String(ch.ChallanNo) }], Date.now() - 1);
              out.push(seen.length, String(qq.AppPdf), String(row(ch.ChallanNo).AppMsg));
              var a0 = appRoleCheck_, Lq = []; appRoleCheck_ = function () {};
              try { var rq = qaPdf_(db, qq, { later: Lq }); out.push(rq.posted, JSON.stringify(Lq.map(function (x) { return { k: x.k, no: x.no, by: x.by }; })), String(qq.AppPdf).replace(/^Queued .*/, 'Queued')); } finally { appRoleCheck_ = a0; }
              EQ('CH-50 out of time: the quote stays Requested (no PDF run), the challan notes it; a requested quote PDF in the sweep is queued, not made (still Requested)',
                out.join('|'), '0|Requested|Posted; PDF not made: out of time|false|[{"k":"q","no":"' + qn + '","by":"app"}]|Queued');
            } finally { LockService = L0; SheetDb = SD; appSweepRun_ = R0; SpreadsheetApp = SA0; uiDo = U0; makePdf = MK; db.update('Challans', ch, { AppMsg: msg0 == null ? '' : msg0 }); } })();
          // step R: one sweep at a time (user lock); a failed phase 1 still makes the PDFs it queued
          (function () { var L0 = LockService, SD = SheetDb, R0 = appSweepRun_, U0 = uiDo, lg = [], ub = false, out = [];
            var lk = function (n) { return { tryLock: function () { if (n === 'user' && ub) return false; lg.push(n); return true; }, waitLock: function () { lg.push('w' + n); }, releaseLock: function () { lg.push('-' + n); } }; };
            var fake = { hasTab: function () { return true; }, headers: function () { return ['Status', 'AppPdf']; }, sheet: function () { return { getLastRow: function () { return 2; }, getRange: function () { return { getValues: function () { return [['Submitted']]; } }; } }; } };
            LockService = { getScriptLock: function () { return lk('script'); }, getDocumentLock: function () { return lk('doc'); }, getUserLock: function () { return lk('user'); } };
            SheetDb = function () { return fake; };
            var ch = db.rows('Challans')[0];
            try {
              ub = true; appSweepRun_ = function () { lg.push('run'); }; appSweep(); out.push(lg.join(',') || 'nothing'); ub = false; lg = [];
              appSweepRun_ = function (o) { lg.push('run'); makePdf(db, 'Challan', String(ch.ChallanNo)); throw new Error('sweep boom'); };
              uiDo = function (a, x) { lg.push('pdf:' + x.no); return { msg: 'ok', links: [{ url: 'u' }] }; };
              out.push(err(function () { appSweep(); }), lg.filter(function (x) { return !/^w|^-doc$|^-script$|^doc$|^script$/.test(x); }).join(','), lg[0], lg[lg.length - 1]);
            } finally { LockService = L0; SheetDb = SD; appSweepRun_ = R0; uiDo = U0; }
            EQ('CH-59 sweep: another sweep running (user lock busy) -> nothing runs; phase 1 fails after posting a challan -> its PDF is still made after the locks, then the error; the user lock is taken first, let go last',
              out.join('|'), 'nothing|sweep boom|user,run,pdf:' + ch.ChallanNo + ',-user|user|-user'); })();
          // (2): save / post / cancel count the challan (OPE) before they write
          (function () { var s = SV(tP, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', q: 2 }] }), I0 = db.insert, U0 = db.update, at = [], n0;
            var spy = function (no) { n0 = oPeGet_(env).n; at = []; db.insert = function (t) { if (!at.length) at.push(String(oPeSince_(env, n0, no))); return I0.apply(this, arguments); }; db.update = function (t) { if (!at.length) at.push(String(oPeSince_(env, n0, no))); return U0.apply(this, arguments); }; };
            var res = [];
            try {
              spy(s.no); rc(); officeChallanSave(tP, { no: s.no, ev: G(tP, s.no).ev, kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', q: 3 }] }); res.push(at[0]);
              spy(s.no); PO(tP, s.no, 'V2'); res.push(at[0]);
              var s2 = SV(tP, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', q: 1 }] }); spy(s2.no); CX(tP, s2.no); res.push(at[0]);
            } finally { db.insert = I0; db.update = U0; }
            EQ('CH-51 challan edit / post / cancel count it in the OPE change list before their first write (a sheet-panel PDF of it being made meanwhile does not keep its link)',
              res.join('|'), 'true|true|true'); })();
          // (3): set availability counts Active yards only
          var lc = { Y1: { Type: 'Yard', Status: 'Inactive' }, Y2: { Type: 'Yard', Status: 'Active' }, Y3: { Type: 'Yard', Status: '' } }, pp = [{ p: 'A', q: 1 }, { p: 'B', q: 2 }];
          EQ('CH-52 sets on the stock card: an Inactive yard (the challan refuses it as From) is not counted; blank status = Active',
            [oStMake_(pp, { A: { Y1: 6, Y2: 2 }, B: { Y1: 12, Y2: 4 } }, lc), oStMake_(pp, { A: { Y1: 6, Y3: 3 }, B: { Y1: 12, Y3: 6 } }, lc), oStMake_(pp, { A: { Y1: 6 }, B: { Y1: 12 } }, lc)].join('|'), '2|3|0');
          // (4): tracking stays on while rented-in items are held
          (function () { var c = 'CH-R52', mk = function (o) { rc(); var g = officeStockItem(tW, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); }, res = [];
            if (!find(db.rows('Items'), 'ItemCode', c)) { rc(); officeItemSave(tW, { code: c, name: 'CH rented only', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 1, reorder: '', status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }); }
            var h = SV(tW, { kind: 'Hire-in', sup: SUP, sref: 'DO-R52', to: Y, date: D, lines: [{ it: c, q: 3 }] }); PO(tW, h.no);
            res.push(JSON.stringify(oStQty_(db)[c] || {}), err(function () { rc(); officeItemSave(tW, mk({ tracked: 'No' })); }), find(db.rows('Items'), 'ItemCode', c).StockTracked);
            try { var o = SV(tW, { kind: 'Off-hire', sup: SUP, from: Y, date: D, lines: [{ it: c, q: 3 }] }); PO(tW, o.no);
              rc(); officeItemSave(tW, mk({ tracked: 'No' })); res.push(find(db.rows('Items'), 'ItemCode', c).StockTracked); } catch (x) { res.push('ERR ' + (x && x.message || x)); }
            EQ('CH-53 item with only rented-in units held (own balance empty): tracking off refused; all off-hired -> allowed', res.join('|'), '{}|BADINPUT|stock tracked|Yes|No'); })();
          // (5): the line insert of an edit wrote, then threw
          (function () { var s = SV(tP, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', q: 10 }] }), I0 = db.insert, e, l1, h1;
            db.insert = function (t) { var v = I0.apply(this, arguments); if (t === 'ChallanLines') throw new Error('Service Spreadsheets timed out'); return v; };
            try { e = err(function () { rc(); officeChallanSave(tP, { no: s.no, ev: G(tP, s.no).ev, kind: 'Delivery', job: J, from: Y, date: D, veh: 'V9', lines: [{ it: 'CH-STD', q: 20 }] }); }); } finally { db.insert = I0; }
            l1 = lns(s.no); h1 = String(row(s.no).Vehicle);
            rc(); officeChallanSave(tP, { no: s.no, ev: G(tP, s.no).ev, kind: 'Delivery', job: J, from: Y, date: D, veh: 'V9', lines: [{ it: 'CH-STD', q: 20 }] });
            EQ('CH-54 edit whose new-line insert reached the sheet, then threw: BUSY, rolled back (old line only, old header); a later edit saves as normal (never 10 + 20)',
              [e, l1, h1, lns(s.no), String(row(s.no).Vehicle)].join('|'), 'BUSY|CH-STD:10|V|CH-STD:20|V9'); CX(tP, s.no); })();
          // (7): an unchanged-name quote remake must not bin its own new editable Doc
          (function () { var DA0 = typeof DriveApp === 'undefined' ? undefined : DriveApp, q = db.rows('Quotes')[0], no = String(q.QuoteNo), pdf0 = q.PDF, base = fileName_(no), F = {}, res = [];
            var mkF = function (id, nm) { return F[id] = { id: id, nm: nm, t: false }; }, it = function (a) { var i = 0; return { hasNext: function () { return i < a.length; }, next: function () { return a[i++]; } }; };
            var wrap = function (f) { return { getId: function () { return f.id; }, getName: function () { return f.nm; }, isTrashed: function () { return f.t; }, setTrashed: function (v) { f.t = v; }, getParents: function () { return it([fold]); } }; };
            var ed = { getFilesByName: function (n) { return it(Object.keys(F).filter(function (k) { return F[k].nm === n && F[k].doc && !F[k].t; }).map(function (k) { return wrap(F[k]); })); } };
            var fold = { getFoldersByName: function (n) { return it(n === 'Editable' ? [ed] : []); } };
            DriveApp = { getFileById: function (id) { if (!F[id]) throw new Error('no file'); return wrap(F[id]); } };
            var U = function (id) { return 'https://drive.google.com/file/d/' + id + '/view'; }, DU = function (id) { return 'https://docs.google.com/document/d/' + id + '/edit'; };
            var run = function (dr, after) { F = {}; mkF('CHE3BOLDPabcdefghijklmnop', base + '.pdf'); mkF('CHE3BOLDDabcdefghijklmnop', base).doc = 1;
              db.update('Quotes', q, { PDF: U('CHE3BOLDPabcdefghijklmnop') });
              var r = qf5Pdf_(db, no, { drive: dr, make: function () { mkF('CHE3BNEWPabcdefghijklmnop', base + '.pdf'); mkF('CHE3BNEWDabcdefghijklmnop', base).doc = 1; return { url: U('CHE3BNEWPabcdefghijklmnop'), doc: DU('CHE3BNEWDabcdefghijklmnop'), file: base + '.pdf' }; } });
              if (after) after(r);
              return ['OLDP', 'OLDD', 'NEWP', 'NEWD'].map(function (k) { return k + '=' + F['CHE3B' + k + 'abcdefghijklmnop'].t; }).join(' '); };
            try {
              res.push(run(QF5_DRIVE_));
              var R = { made: [], kept: [] }, dv = oPeDrive_(R, QF5_DRIVE_);
              res.push(run({ name: dv.name, trash: function (u, b, k) { R.made.push({ r: { url: U('CHE3BNEWPabcdefghijklmnop'), doc: DU('CHE3BNEWDabcdefghijklmnop') } }); dv.trash(u, b, k); } }, function () { res.push('deferred:' + F.CHE3BOLDPabcdefghijklmnop.t); oPeAfter_(R.made[0]); }));
            } finally { if (DA0 === undefined) DriveApp = {}; else DriveApp = DA0; db.update('Quotes', q, { PDF: pdf0 == null ? '' : pdf0 }); }
            EQ('CH-55 quote PDF remade under the same name: the old PDF + old editable Doc go to the bin, the new PDF + new Doc stay (direct and deferred panel run)',
              res.join('|'), 'OLDP=true OLDD=true NEWP=false NEWD=false|deferred:false|OLDP=true OLDD=true NEWP=false NEWD=false'); })();
          // (8): a Sale takes own stock only
          (function () { var YS = 'CH-Y55', js = db.rows('Jobs').filter(function (j) { return String(j.JobType) === 'Sale' && String(j.Status) !== 'Closed'; })[0], res = [];
            if (!find(db.rows('Locations'), 'LocID', YS)) db.insert('Locations', { LocID: YS, Name: YS, Type: 'Yard', SiteID: '', Status: 'Active' });
            postOpeningStock(db, [{ ItemCode: 'CH-BRD', Qty: 2, LocID: YS }], new Date(2026, 10, 4));
            var h = SV(tW, { kind: 'Hire-in', sup: SUP, sref: 'DO-Y55', to: YS, date: D, lines: [{ it: 'CH-BRD', q: 10 }] }); PO(tW, h.no);
            var s5 = SV(tP, { kind: 'Sale', job: String(js.JobNo), from: YS, date: D, veh: 'V', lines: [{ it: 'CH-BRD', q: 5 }] }), e5x = err(function () { PO(tP, s5.no, 'V'); });
            res.push(String(e5x).split('|')[0], /only 2 of our own stock/.test(String(e5x)), mvs(s5.no).length, row(s5.no).Status);
            var s2 = SV(tP, { kind: 'Sale', job: String(js.JobNo), from: YS, date: D, veh: 'V', lines: [{ it: 'CH-BRD', q: 2 }] }); PO(tP, s2.no, 'V');
            res.push(row(s2.no).Status, mvs(s2.no).map(function (v) { return v.Qty + ':' + (v.Owner || 'own'); }).join(','), JSON.stringify(chOwnMap_(db)['CH-BRD|' + YS]));
            EQ('CH-56 Sale from a yard with 2 own + 10 rented: 5 refused (nothing moves, still Draft); 2 posts from own stock only, the rented 10 untouched',
              res.join('|'), 'NOTPOSTED|true|0|Draft|Posted|2:own|{"":0,"' + SUP + '":10}'); CX(tP, s5.no); })();
          // (9) + (10): the office PDF link: OCHP names its PDF and what it printed
          (function () { var q5 = QF5_STUB_, DA0 = typeof DriveApp === 'undefined' ? undefined : DriveApp, nU = 0, res = [], TR = {};
            var IDN = function () { return 'CHE3BX' + (++nU) + 'abcdefghijklmnopqrs'; }, UR = function (id) { return 'https://drive.google.com/file/d/' + id + '/view'; };
            var DT = {}, act = null; DriveApp = { getFileById: function (id) { return { setTrashed: function (v) { TR[id] = v; }, isTrashed: function () { return !!TR[id]; }, getDateCreated: function () { return new Date(DT[id] || 1e12); } }; } };
            QF5_STUB_ = { make: function (d, w, n) { var id = IDN(); if (act) act(); return { url: UR(id), doc: 'https://docs.google.com/document/d/' + id + 'D/edit', file: n + '.pdf', placeholders: 0 }; } };
            var s = SV(tP, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', q: 1 }] }), cu = null, nm0;
            try {
              var a = (rc(), officeChallanPdf(tP, s.no)), p = env.get('OCHP:' + s.no), b = (rc(), officeChallanPdf(tP, s.no)), g = G(tP, s.no);
              res.push(p.p === oPdfIdOf_(a.url), p.f === oChFp_(db, s.no), b.url === a.url && b.doc === a.doc, g.pdfOk, g.doc === a.doc);
              var other = IDN(); db.update('Challans', row(s.no), { PDF: UR(other) }); // the sheet panel remade it (OCHP not touched)
              g = G(tP, s.no); res.push(g.pdfOk, g.doc); var c2 = (rc(), officeChallanPdf(tP, s.no)); res.push(c2.url !== UR(other) && c2.url === String(row(s.no).PDF), c2.doc !== a.doc);
              var jb = must(db, 'Jobs', 'JobNo', J); cu = find(db.rows('Customers'), 'CustID', jb.CustID); nm0 = cu.Name; db.update('Customers', cu, { Name: 'Renamed E3B Ltd' }); // prints differently, same ev
              var ev1 = G(tP, s.no).ev; g = G(tP, s.no); res.push(ev1 === oChEv_(db, row(s.no)), g.pdfOk); var c3 = (rc(), officeChallanPdf(tP, s.no)); res.push(c3.url !== c2.url && c3.url === String(row(s.no).PDF), G(tP, s.no).pdfOk);
              var nw = IDN(); DT[nw] = 2e12; db.update('Challans', row(s.no), { PDF: '' }); act = function () { db.update('Challans', row(s.no), { PDF: UR(nw) }); }; // a newer panel PDF linked meanwhile (OCHP still the office's)
              var c4 = (rc(), officeChallanPdf(tP, s.no)); act = null; res.push(c4.url === UR(nw), c4.doc);
            } finally { QF5_STUB_ = q5; if (DA0 === undefined) DriveApp = {}; else DriveApp = DA0; if (cu) db.update('Customers', cu, { Name: nm0 }); }
            EQ('CH-57 office challan PDF: OCHP keeps the PDF id + printed fingerprint; reused while both match; a panel remake (other PDF linked) -> not current, no old Doc, made again; customer renamed (same ev) -> not current, made again',
              res.join('|'), 'true|true|true|true|true|false||true|true|true|false|true|true|true|'); CX(tP, s.no); })();
          // (11): a part-posted challan whose job closed meanwhile
          (function () { var pc0 = postChallan, jb = must(db, 'Jobs', 'JobNo', J), st0 = jb.Status, res = [];
            var sR = SV(tP, { kind: 'Return', job: J, to: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', g: 1, dm: 1 }] }), sN = SV(tP, { kind: 'Return', job: J, to: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', g: 1 }] });
            postChallan = function (d, no) { pc0.apply(this, arguments); uiDelRows_(d, 'Damage', d.rows('Damage').filter(function (x) { return x.ChallanNo === no; })); d.update('Challans', must(d, 'Challans', 'ChallanNo', no), { Status: 'Draft' }); throw new Error('Service Spreadsheets timed out'); };
            try { res.push(err(function () { PO(tP, sR.no, 'V'); })); } finally { postChallan = pc0; }
            var n1 = mvs(sR.no).length; db.update('Jobs', jb, { Status: 'Closed' });
            try { res.push(err(function () { PO(tP, sR.no, 'V'); })); res.push(row(sR.no).Status, mvs(sR.no).length === n1, db.rows('Damage').filter(function (x) { return x.ChallanNo === sR.no; }).length, String(jb.Status));
              res.push(err(function () { PO(tP, sN.no, 'V'); }), mvs(sN.no).length);
            } finally { db.update('Jobs', jb, { Status: st0 == null ? '' : st0 }); }
            EQ('CH-58 part-posted return, job closed meanwhile: Post finishes it (Posted, no 2nd move, damage row, job stays Closed); a draft with no moves on the closed job is still refused',
              res.join('|'), 'POSTUNSURE|no error|Posted|true|1|Closed|BADINPUT|job|0'); CX(tP, sN.no); })();
        } catch (e) { eq('CH-E3B crashed after ' + LAST.slice(0, 6), String(e && e.stack || e).slice(0, 400), 'no crash'); } })();
