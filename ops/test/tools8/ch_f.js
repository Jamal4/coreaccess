        // ---- r28 F1 / F2 (harness only): CH-78 challan from a quote (no PO), CH-79 vendor-rental material source
        (function () { var LAST = '', EQ = function (n) { LAST = n; return eq.apply(this, arguments); }; try {
          var tF = add('chf2@t.com', { PS: 2 }), tFH = add('chf3@t.com', { PS: 3 }), rc = function () { ['chf2@t.com', 'chf3@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var SV = function (t, c) { rc(); return officeChallanSave(t, c); }, PO = function (t, no, veh) { rc(); return officeChallanPost(t, no, officeChallanGet(t, no).ev, veh); };
          var CX = function (t, no) { rc(); return officeChallanCancel(t, no, officeChallanGet(t, no).ev, 'test'); };
          var mvs = function (no) { return db.rows('StockMoves').filter(function (v) { return v.RefNo === no; }).length; }, E = function (f) { return String(err(f)).split('|').slice(0, 2).join('|'); };
          var spec = function (no) { return JSON.stringify(PDF_SPECS.Challan(db, no)); }, Y = 'CH-YARD', Q = 'CAE/Q/2026/881', QS = 'CAE/Q/2026/882', JV = 'CAE/J/2026/881';
          ['LOC-SUPPLIER|Supplier', 'CH-YARD|Yard'].forEach(function (x) { var p = x.split('|'); if (!find(db.rows('Locations'), 'LocID', p[0])) db.insert('Locations', { LocID: p[0], Name: p[0], Type: p[1], SiteID: '', Status: 'Active' }); });
          db.insert('Sites', { SiteID: 'SITE-0881', CustID: 'CUST-0001', Project: 'F1 quote site', Address: 'x' });
          db.insert('Items', { ItemCode: 'CHF-STD', Name: 'F standard', Unit: 'pc', WeightKg: 10, StockTracked: 'Yes', IsSet: 'No', Status: 'Active' });
          postOpeningStock(db, [{ ItemCode: 'CHF-STD', Qty: 50, LocID: Y }], new Date(2026, 10, 1));
          db.insert('Quotes', [{ QuoteNo: Q, Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0881', Status: 'Sent' }, { QuoteNo: QS, Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0881', Status: 'Lost' }]);
          // CH-78 (F1): a quoted customer with no job / PO shows in the list; a Delivery picks the quote (no hard block), carries the quote no. (view + PDF);
          // Post makes the job (Awaiting order -> On hire) and moves stock to the quote's site; a Sale can't take a Rental quote; a Lost quote isn't offered
          (function () { var res = [], L = officeChallanList(tF), qs = (L.quotes || []).map(function (q) { return q.no; });
            res.push(qs.indexOf(Q) >= 0 ? 'listed' : 'not listed', qs.indexOf(QS) >= 0 ? 'lost listed' : 'lost hidden');
            var s = null; try { s = SV(tF, { kind: 'Delivery', quote: Q, from: Y, date: '2026-11-20', veh: 'V1', lines: [{ it: 'CHF-STD', q: 5 }] }); res.push('saved'); } catch (e) { res.push('save ' + String(e.message || e).slice(0, 30)); }
            if (s) { var g = officeChallanGet(tF, s.no); res.push(g.quote === Q ? 'quote' : 'no quote', g.job ? 'job set' : 'no job', g.cust ? 'cust' : 'no cust', spec(s.no).indexOf(Q) >= 0 ? 'pdf quote' : 'pdf no quote');
              PO(tF, s.no); var c = find(db.rows('Challans'), 'ChallanNo', s.no), j = find(db.rows('Jobs'), 'QuoteNo', Q);
              res.push(String(c.Status), j && c.JobNo === j.JobNo ? 'job made' : 'no job', j ? String(j.Status) : '-', String(mvs(s.no))); }
            res.push(E(function () { SV(tF, { kind: 'Sale', quote: QS, from: Y, date: '2026-11-20', veh: 'V1', lines: [{ it: 'CHF-STD', q: 1 }] }); }));
            EQ('CH-78 challan from a quote, no PO: listed, saved with the quote no. (view + PDF), Post makes the job and moves stock', res.join('|'),
              'listed|lost hidden|saved|quote|no job|cust|pdf quote|Posted|job made|On hire|1|BADINPUT|quote'); })();
          // CH-79 (F2): material source Vendor rental: vendor made on the fly (once, by name), no stock check, Post / Cancel / sheet-panel post make no StockMoves,
          // own + rented stock and the job's on-hire unchanged; the vendor shows on the card, view and PDF; vehicle no. optional
          (function () { var res = [], n0 = db.rows('StockMoves').length, y0 = stockMap(db)['CHF-STD|' + Y] || 0, NV = { name: 'Vendor F2 Ltd', phone: '01700000000', addr: 'Dhaka' };
            db.insert('Jobs', { JobNo: JV, CustID: 'CUST-0001', SiteID: 'SITE-0881', JobType: 'Rental', HireBasis: 'Item', Status: 'Awaiting order' });
            var s = null, s2 = null; try { s = SV(tF, { kind: 'Delivery', job: JV, src: 'Vendor', newSup: NV, sref: 'VDO-1', date: '2026-11-20', lines: [{ it: 'CHF-STD', q: 500 }] });
              s2 = SV(tF, { kind: 'Delivery', job: JV, src: 'Vendor', newSup: { name: ' vendor  f2 LTD ', phone: '1', addr: 'y' }, date: '2026-11-20', lines: [{ it: 'CHF-STD', q: 3 }] }); res.push('saved'); } catch (e) { res.push('save ' + String(e.message || e).slice(0, 30)); }
            var vs = db.rows('Suppliers').filter(function (x) { return /vendor\s+f2/i.test(String(x.Name)); }); res.push(String(vs.length));
            if (s && s2) { var g = officeChallanGet(tF, s.no); res.push(g.src || 'own', g.supName || '-', g.sup === find(db.rows('Challans'), 'ChallanNo', s2.no).SupID ? 'same vendor' : 'two vendors');
              PO(tF, s.no); var c = find(db.rows('Challans'), 'ChallanNo', s.no); res.push(String(c.Status), String(mvs(s.no)), String(db.rows('StockMoves').length - n0), String((stockMap(db)['CHF-STD|' + Y] || 0) - y0), onHire(db, JV)['CHF-STD'] ? 'on hire' : 'none');
              res.push(spec(s.no).indexOf('Vendor F2 Ltd') >= 0 ? 'pdf vendor' : 'pdf no vendor', ((officeChallanList(tF).rows || []).filter(function (r) { return r.no === s.no; })[0] || {}).src || 'own');
              CX(tFH, s.no); res.push(String(find(db.rows('Challans'), 'ChallanNo', s.no).Status), String(mvs(s.no)));
              try { postChallan(db, s2.no); res.push('panel ' + mvs(s2.no)); } catch (e) { res.push('panel ' + String(e.message || e).slice(0, 30)); } }
            EQ('CH-79 vendor-rental challan: vendor made once, no StockMoves on post / cancel / panel post, stock + on-hire unchanged, vendor on card + PDF', res.join('|'),
              'saved|1|Vendor|Vendor F2 Ltd|same vendor|Posted|0|0|0|none|pdf no vendor|Vendor|Cancelled|0|panel 0'); })();
          // CH-80 (step R): a draft from a quote that is Lost before Post: Post refused, no job made, the quote stays Lost (quoteToJob would mark it Accepted)
          (function () { var res = [], QL = 'CAE/Q/2026/883'; db.insert('Quotes', { QuoteNo: QL, Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0881', Status: 'Sent' });
            var s = SV(tF, { kind: 'Delivery', quote: QL, from: Y, date: '2026-11-20', veh: 'V1', lines: [{ it: 'CHF-STD', q: 1 }] });
            db.update('Quotes', must(db, 'Quotes', 'QuoteNo', QL), { Status: 'Lost' }); res.push(E(function () { PO(tF, s.no); }).split('|')[0]);
            res.push(find(db.rows('Jobs'), 'QuoteNo', QL) ? 'job made' : 'no job', String(must(db, 'Quotes', 'QuoteNo', QL).Status), String(find(db.rows('Challans'), 'ChallanNo', s.no).Status), String(mvs(s.no)));
            EQ('CH-80 a draft from a quote marked Lost before Post: refused, no job, quote stays Lost', res.join('|'), 'NOTPOSTED|no job|Lost|Draft|0'); })();
          // CH-81 (E3b-4 live): a Return's "Related challan" lists only own-stock deliveries; a posted vendor-rental delivery on the same job is never on hire, so it is left out
          (function () { var res = [], vd = db.rows('Challans').filter(function (c) { return c.JobNo === JV && c.MatSource === 'Vendor' && c.Status === 'Posted'; }).map(function (c) { return String(c.ChallanNo); });
            var d = SV(tF, { kind: 'Delivery', job: JV, from: Y, date: '2026-11-20', veh: 'V3', lines: [{ it: 'CHF-STD', q: 1 }] }); PO(tF, d.no);
            var r = SV(tF, { kind: 'Return', job: JV, to: Y, date: '2026-11-20', lines: [{ it: 'CHF-STD', g: 1 }] });
            var rel = PDF_SPECS.Challan(db, r.no).blocks.filter(function (b) { return b.t === 'pairs'; })[0].rows.filter(function (x) { return x[2] === 'Related challan'; })[0][3];
            res.push(vd.length ? 'vendor posted' : 'no vendor', rel === d.no ? 'own only' : rel);
            EQ('CH-81 Return PDF Related challan: own-stock deliveries only, not vendor rental', res.join('|'), 'vendor posted|own only'); })();
          // CH-82 (E3b-4 live): a Sale / Delivery draft from a quote whose Post is refused for stock makes NO job and leaves the quote as it was; Post after stock arrives still makes the job
          (function () { var res = [], QA = 'CAE/Q/2026/884', QB = 'CAE/Q/2026/885';
            db.insert('Quotes', [{ QuoteNo: QA, Rev: 0, QuoteType: 'Sale', CustID: 'CUST-0001', SiteID: 'SITE-0881', Status: 'Sent' }, { QuoteNo: QB, Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0881', Status: 'Sent' }]);
            var sa = SV(tF, { kind: 'Sale', quote: QA, from: Y, date: '2026-11-20', veh: 'V4', lines: [{ it: 'CHF-STD', q: 99999 }] });
            var sb = SV(tF, { kind: 'Delivery', quote: QB, from: Y, date: '2026-11-20', veh: 'V5', lines: [{ it: 'CHF-STD', q: 99999 }] });
            [sa, sb].forEach(function (s, i) { var q = i ? QB : QA; res.push(E(function () { PO(tF, s.no); }).split('|')[0], find(db.rows('Jobs'), 'QuoteNo', q) ? 'job made' : 'no job', String(must(db, 'Quotes', 'QuoteNo', q).Status), String(find(db.rows('Challans'), 'ChallanNo', s.no).JobNo || '-')); });
            db.update('ChallanLines', db.rows('ChallanLines').filter(function (l) { return l.ChallanNo === sb.no; })[0], { Qty: 1 }); PO(tF, sb.no);
            var cb = find(db.rows('Challans'), 'ChallanNo', sb.no), jb = find(db.rows('Jobs'), 'QuoteNo', QB);
            res.push(String(cb.Status), jb && cb.JobNo === jb.JobNo ? 'job at post' : 'no job', String(must(db, 'Quotes', 'QuoteNo', QB).Status), db.rows('StockMoves').filter(function (v) { return v.RefNo === sb.no && v.JobNo === cb.JobNo; }).length ? 'moves on job' : 'moves no job');
            EQ('CH-82 refused Post from a quote: no job, quote unchanged; a good Post makes the job and its moves carry it', res.join('|'), 'NOTPOSTED|no job|Sent|-|NOTPOSTED|no job|Sent|-|Posted|job at post|Accepted|moves on job'); })();
        } catch (e) { eq('CH-F crashed after ' + LAST.slice(0, 6), String(e && e.stack || e).slice(0, 400), 'no crash'); } })();
