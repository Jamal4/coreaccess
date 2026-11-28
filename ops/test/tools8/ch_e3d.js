        // ---- M8 CodeRabbit run 4 (harness only): CH-63 ... CH-73
        (function () { var LAST = '', EQ = function (n) { LAST = n; return eq.apply(this, arguments); }; try {
          var tP = add('che3dps@t.com', { PS: 2 }), tW = add('che3dyw@t.com', { YW: 2 }), rc = function () { ['che3dps@t.com', 'che3dyw@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var SV = function (t, c) { rc(); return officeChallanSave(t, c); }, G = function (t, no) { rc(); return officeChallanGet(t, no); };
          var CX = function (t, no) { rc(); return officeChallanCancel(t, no, officeChallanGet(t, no).ev, 'test'); };
          var row = function (no) { return find(db.rows('Challans'), 'ChallanNo', no); }, lns = function (no) { return oChLines_(db, no).map(function (l) { return l.ItemCode + ':' + l.Qty; }).sort().join(','); };
          var mvs = function (no) { return db.rows('StockMoves').filter(function (v) { return v.RefNo === no && v.RefType === 'Challan'; }); };
          var J = 'CAE/J/2026/801', Y = 'CH-YARD', SUP = 'SUP-0001', D = '2026-11-20', JN = 'CAE/J/2026/E3D', UR = 'https://drive.google.com/file/d/CHE3DPDFabcdefghijklmnop/view';
          if (!find(db.rows('Jobs'), 'JobNo', JN)) { var j0 = must(db, 'Jobs', 'JobNo', J), jr = {}; Object.keys(j0).forEach(function (k) { if (k !== '_r') jr[k] = j0[k]; }); jr.JobNo = JN; jr.JobType = 'Rental'; jr.Status = 'On hire'; db.insert('Jobs', jr); }
          // CH-63 (#1): LOI prints as LOI
          (function () { var jb = must(db, 'Jobs', 'JobNo', JN), k0 = jb.OrderKind, w0 = jb.ClientWONo, res = [];
            db.ensureColumn('Jobs', 'OrderKind'); var s = SV(tP, { kind: 'Delivery', job: JN, from: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', q: 1 }] });
            try { ['LOI', 'PO', 'WO', ''].forEach(function (k) { db.update('Jobs', jb, { OrderKind: k, ClientWONo: 'L-17' }); var t = JSON.stringify(PDF_SPECS.Challan(db, s.no)); res.push(k + '=' + (/LOI L-17/.test(t) ? 'LOI' : /PO L-17/.test(t) ? 'PO' : /WO L-17/.test(t) ? 'WO' : '?')); }); }
            finally { db.update('Jobs', jb, { OrderKind: k0 == null ? '' : k0, ClientWONo: w0 == null ? '' : w0 }); }
            EQ('CH-63 challan PDF order line: LOI / PO / WO as saved, blank = WO', res.join('|'), 'LOI=LOI|PO=PO|WO=WO|=WO'); CX(tP, s.no); })();
          // CH-64 (#3): an item Size edit unlinks an open challan's PDF
          (function () { var c = 'CH-STD', s = SV(tP, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: c, q: 1 }] }), it = find(db.rows('Items'), 'ItemCode', c), z0 = it.Size;
            var mk = function (o) { rc(); var g = officeStockItem(tW, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat || 'Ringlock', size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire === false ? 'No' : 'Yes', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
            db.update('Challans', row(s.no), { PDF: UR });
            try { rc(); officeItemSave(tW, mk({ size: 'E3D size' })); } finally { var e1 = String(row(s.no).PDF); rc(); officeItemSave(tW, mk({ size: z0 == null ? '' : String(z0) })); }
            EQ('CH-64 item Size changed: the open challan PDF that prints it is unlinked', e1, ''); CX(tP, s.no); })();
          // CH-65 (#2): the PDF queue write fails after the app quote is posted
          (function () { var qn = String(db.rows('Quotes')[0].QuoteNo), a0 = appRoleCheck_, sq = UI_ACTIONS_.saveQuoteFull, ag = qaArgs_, u0 = db.update, res;
            if (!db.hasTab('AppQuotes')) db.ensureTab('AppQuotes', QA_H_, []); ['AppPdf', 'AppPdfBy'].forEach(function (k) { db.ensureColumn('Quotes', k); });
            db.insert('AppQuotes', { AQID: 'AQ-E3D1', Status: 'Submitted', SubmittedBy: 'x@t.com', AppMsg: '' }); var aq = find(db.rows('AppQuotes'), 'AQID', 'AQ-E3D1');
            appRoleCheck_ = function () {}; qaArgs_ = function () { return {}; }; UI_ACTIONS_.saveQuoteFull = function () { return { ref: qn }; };
            db.update = function (t, r, p) { if (t === 'Quotes' && p && p.AppPdf === 'Requested') throw new Error('sheet down'); return u0.apply(this, arguments); };
            try { res = err(function () { var r = qaProcess_(db, aq, { later: [] }); if (!r.posted) throw new Error('not posted'); }); }
            finally { db.update = u0; appRoleCheck_ = a0; qaArgs_ = ag; UI_ACTIONS_.saveQuoteFull = sq; }
            var a = find(db.rows('AppQuotes'), 'AQID', 'AQ-E3D1');
            EQ('CH-65 app quote posted, then the PDF queue write fails: still Posted with its number, told to use Make PDF (never "Not posted")',
              [res, a.Status, String(a.QuoteNo) === qn, / · PDF not queued: sheet down \(use Make PDF\)$/.test(String(a.AppMsg))].join('|'), 'no error|Posted|true|true'); })();
          // CH-66 (#4): no Staff ID on an office-made challan -> the name only, never a same-name Staff signature
          (function () { var s = SV(tP, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', q: 1 }] }), c = row(s.no), by = oUncell_(c.MadeBy).trim(), res = [];
            db.insert('Staff', { StaffID: 'ST-E3D', Name: by, Role: 'Yard', Status: 'Active' }); var st = find(db.rows('Staff'), 'StaffID', 'ST-E3D');
            var S = function () { var o = oSgApply_(db, 'Challan', { id: s.no, blocks: [] }), g = (o.blocks.filter(function (b) { return b.t === 'osign'; })[0] || {}).s || {}; return (g.id || '-') + ':' + (g.name === by); };
            try { db.update('Challans', c, { MadeByID: '' }); res.push(S()); db.update('Challans', c, { MadeByID: 'ST-E3D' }); res.push(S()); }
            finally { db.update('Challans', c, { MadeByID: '' }); uiDelRows_(db, 'Staff', [st]); }
            EQ('CH-66 challan made in the office with no Staff ID: the maker\'s name, no Staff match (no signature); with the Staff ID: that Staff signs', res.join('|'), '-:true|ST-E3D:true'); CX(tP, s.no); })();
          // CH-67 (#5): the header insert went in, then threw
          (function () { var I0 = db.insert, e, n0 = db.rows('Challans').length;
            db.insert = function (t) { var v = I0.apply(this, arguments); if (t === 'Challans') throw new Error('Service Spreadsheets timed out'); return v; };
            try { e = err(function () { SV(tP, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', q: 1 }] }); }); } finally { db.insert = I0; }
            var nw = db.rows('Challans').slice(n0).map(function (c) { return String(c.ChallanNo); });
            EQ('CH-67 new challan header went in, then the insert threw: SAVEUNSURE with that number (Save again edits it, no second draft)', [nw.length, e === 'SAVEUNSURE|' + nw[0] + '|'].join('|'), '1|true');
            if (nw[0]) CX(tP, nw[0]); })();
          // CH-68 (#6): a Sent quote's save wrote, then threw: the pending revision is kept
          (function () { if (typeof base !== 'function' || typeof L1 !== 'function' || typeof tS === 'undefined') { EQ('CH-68 helpers', 'missing', 'there'); return; }
            var res = [], sq = UI_ACTIONS_.saveQuoteFull, l2 = [{ code: '', desc: 'Item', qty: 2, unit: 'pc', rate: 10 }];
            [true, false].forEach(function (wr) { rc(); var qR = officeQuoteSave(tS, L1()).no; db.update('Quotes', must(db, 'Quotes', 'QuoteNo', qR), { Status: 'Sent' }); var FR = officeQuoteForm(tS, qR).quote;
              UI_ACTIONS_.saveQuoteFull = function () { if (wr) sq.apply(this, arguments); throw new Error('Service Spreadsheets timed out'); };
              try { err(function () { officeQuoteSave(tS, base({ no: qR, ev: FR.ev, lines: l2 })); }); } finally { UI_ACTIONS_.saveQuoteFull = sq; }
              res.push((wr ? 'wrote' : 'nothing') + ':' + (e5.get('OQRV:' + qR) ? 'kept' : 'gone')); e5.del('OQRV:' + qR); });
            EQ('CH-68 Sent quote save threw: lines written -> the pending revision is kept (finished next action); nothing written -> dropped', res.join('|'), 'wrote:kept|nothing:gone'); })();
          // CH-69 (#9): a discarded draft's PDF is unlinked
          (function () { var s = SV(tP, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', q: 1 }] }); db.update('Challans', row(s.no), { PDF: UR }); CX(tP, s.no);
            EQ('CH-69 draft discarded: its DRAFT PDF is no longer linked', [row(s.no).Status, String(row(s.no).PDF)].join('|'), 'Cancelled|'); })();
          // CH-70 (#10): a Sale from a Supplier location through the core (sheet / app) post
          (function () { var js = db.rows('Jobs').filter(function (j) { return String(j.JobType) === 'Sale' && String(j.Status) !== 'Closed'; })[0];
            var no = createChallan(db, { kind: 'Sale', jobNo: String(js.JobNo), fromLoc: LOC.SUPPLIER, toLoc: LOC.SOLD, lines: [{ itemCode: 'CH-BRD', qty: 1 }] });
            var e = err(function () { postChallan(db, no); }), out = [e !== 'no error', mvs(no).length, String(row(no).Status || 'Draft')];
            try { cancelChallan(db, no); } catch (x) { /* posted: left */ }
            EQ('CH-70 Sale from a Supplier location (sheet / app post): refused, nothing moves, still Draft', out.join('|'), 'true|0|Draft'); })();
          // CH-71 (#13): a loose off-hire line of 0.5 (a part left from a set)
          (function () { var res = [], s = null;
            try { s = SV(tW, { kind: 'Off-hire', sup: SUP, from: Y, date: D, lines: [{ it: 'CH-STD', q: 0.5 }] }); res.push(lns(s.no)); } catch (x) { res.push(String(x && x.message || x)); }
            res.push(err(function () { SV(tW, { kind: 'Off-hire', sup: SUP, from: Y, date: D, lines: [{ it: 'CH-STD', q: 0.555 }] }); }).split('|')[0], err(function () { SV(tP, { kind: 'Delivery', job: J, from: Y, date: D, veh: 'V', lines: [{ it: 'CH-STD', q: 0.5 }] }); }).split('|')[0]);
            if (s) CX(tW, s.no);
            EQ('CH-71 off-hire loose line 0.5 saves (2 decimals at most); a delivery still needs a whole number', res.join('|'), 'CH-STD:0.5|BADINPUT|BADINPUT'); })();
          // CH-72 (#15): the last set comes back on a full off-hire job
          (function () { var JS = 'CAE/J/2026/E3DS', res = [];
            if (!find(db.rows('Items'), 'ItemCode', 'SET-E3D')) { db.insert('Items', { ItemCode: 'SET-E3D', Name: 'E3D set', Category: 'Set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' }); db.insert('KitParts', { KitPartID: 'KP-E3D', SetCode: 'SET-E3D', ItemCode: 'CH-STD', QtyPerSet: 2 }); }
            if (!find(db.rows('Jobs'), 'JobNo', JS)) { var j0 = must(db, 'Jobs', 'JobNo', J), jr = {}; Object.keys(j0).forEach(function (k) { if (k !== '_r') jr[k] = j0[k]; }); jr.JobNo = JS; jr.JobType = 'Rental'; jr.Status = 'On hire'; db.insert('Jobs', jr); }
            var d1 = createChallan(db, { kind: 'Delivery', jobNo: JS, fromLoc: Y, lines: [{ itemCode: 'SET-E3D', qty: 1 }] }); postChallan(db, d1);
            db.update('Jobs', must(db, 'Jobs', 'JobNo', JS), { Status: 'On hire' }); db.insert('OffHire', { OffHireID: 'OH-E3D', JobNo: JS, Scope: 'Full' });
            var r1 = createChallan(db, { kind: 'Return', jobNo: JS, toLoc: Y, lines: [{ itemCode: 'SET-E3D', qty: 1, qtyGood: 1 }] }); res.push(err(function () { postChallan(db, r1); }));
            res.push(String(row(r1).Status), String(must(db, 'Jobs', 'JobNo', JS).Status));
            EQ('CH-72 full off-hire job, its only set comes back: the job goes Off-hire', res.join('|'), 'no error|Posted|Off-hire'); })();
          // CH-73 (#4b): the sweep's result is written only for the request it made
          (function () { var qq = db.rows('Quotes')[1] || db.rows('Quotes')[0], qn = String(qq.QuoteNo), U0 = uiDo, SD = SheetDb, a0 = appRoleCheck_, L = [], res = [];
            appRoleCheck_ = function () {}; SheetDb = function () { return db; };
            try {
              db.update('Quotes', qq, { AppPdf: 'Requested', AppPdfBy: 'x@t.com' }); qaPdf_(db, qq, { later: L });
              res.push(/^Queued /.test(String(qq.AppPdf)), L.length === 1 && L[0].m === String(qq.AppPdf), qaWant_(String(qq.AppPdf)), qaWant_('Made x'));
              uiDo = function () { db.update('Quotes', qq, { AppPdf: 'Requested' }); return { msg: 'ok', links: [{ url: 'u' }] }; }; qaLater_(L, Date.now() + 60000); res.push(String(qq.AppPdf));
              L = []; qaPdf_(db, qq, { later: L }); uiDo = function () { return { msg: 'ok', links: [{ url: 'u' }] }; }; qaLater_(L, Date.now() + 60000); res.push(/^Made /.test(String(qq.AppPdf)));
            } finally { uiDo = U0; SheetDb = SD; appRoleCheck_ = a0; db.update('Quotes', qq, { AppPdf: '' }); }
            EQ('CH-73 sweep quote PDF: marked Queued; a new request while it is made (Requested) is kept for the next run; a leftover Queued is picked up; no new request -> Made',
              res.join('|'), 'true|true|true|false|Requested|true'); })();
        } catch (e) { eq('CH-E3D crashed after ' + LAST.slice(0, 6), String(e && e.stack || e).slice(0, 400), 'no crash'); } })();
