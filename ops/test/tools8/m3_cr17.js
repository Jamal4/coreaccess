        // ---- M3 CR run 17 (harness only): set part from the first Items row; terms rollback keeps stored whitespace
        (function () {
          var rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var i0 = db.insert, up0 = uiPutRow_, dr0 = uiDelRows_;
          var Q = function (no) { return must(db, 'Quotes', 'QuoteNo', no); }, nq = function (v) { return String(v == null ? '' : v).replace(/^'/, ''); };
          var BQ = function (s) { return base({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] }); };
          try {
            // (1) L2067: a repeated part code -> the set's part line shows the first row (as the stock list / the part button)
            i0.call(db, 'Items', [{ ItemCode: 'CR17-S1', Name: 'CR17 set', Unit: 'set', Status: 'Active', IsSet: 'Yes' }, { ItemCode: 'CR17-P1', Name: 'CR17 first', Size: '1 m', Unit: 'pc', Status: 'Active', StockTracked: 'Yes' }, { ItemCode: 'CR17-P1', Name: 'CR17 second', Size: '2 m', Unit: 'pc', Status: 'Active', StockTracked: 'Yes' }]);
            i0.call(db, 'KitParts', [{ KitPartID: 'KP-C17A', SetCode: 'CR17-S1', ItemCode: 'CR17-P1', QtyPerSet: 1 }]);
            var k1 = officeStockItem(tY, 'CR17-S1').kit[0], p1 = officeStockItem(tY, 'CR17-P1'), l1 = officeStockList(tY).rows.filter(function (o) { return o.code === 'CR17-P1'; });
            eq('CR17-1 repeated part code: set part line = first row (r16: the last), as the part view and the list', [k1.name, k1.size, p1.name, l1.length, l1[0].name].join('|'), 'CR17 first|1 m|CR17 first|1|CR17 first');
            // (2) L1322: a stored row with spaces, one row deleted then a failure -> put back exactly (r16: trimmed)
            rc(); var Q2 = officeQuoteSave(tS, BQ('CR17 terms')).no; rc(); officeQuoteTerm(tS, Q2, oQTv_(db, oQRow_(db, Q2)), { k: 'add', sec: -1, text: 'CR17 extra' });
            var cid = String(oQTerms_(db, Q(Q2)).base[0].ClauseID); i0.call(db, 'QuoteTerms', { QuoteNo: Q2, ClauseID: cid, Action: 'Replace', Section: '1', ClauseNo: '1.1', Title: ' T17 ', Text: 'Keep this.  ', SortOrder: 1 });
            var a2 = 0; uiDelRows_ = function (d, t, rows) { if (t === 'QuoteTerms' && rows.length === 2 && !a2++) { dr0(d, t, [rows[0]]); throw new Error('Service Spreadsheets timed out'); } return dr0.apply(this, arguments); };
            var wr2 = []; db.insert = function (t, r) { if (t === 'QuoteTerms' && a2) (Array.isArray(r) ? r : [r]).forEach(function (x) { wr2.push(x); }); return i0.apply(this, arguments); };
            rc(); var e2; try { e2 = err(function () { officeQuoteTerm(tS, Q2, oQTv_(db, oQRow_(db, Q2)), { k: 'add', sec: -1, text: 'CR17 two' }); }); } finally { uiDelRows_ = dr0; uiPutRow_ = up0; db.insert = i0; }
            var ww = wr2.filter(function (x) { return x.Action === 'Replace'; })[0] || {};
            eq('CR17-2c the put-back row is written as text (the sheet keeps it: no formula / number guess), spaces kept', [JSON.stringify(ww.Text), JSON.stringify(ww.Title)].join('|'), JSON.stringify("'Keep this.  ") + '|' + JSON.stringify("' T17 "));
            var r2 = qtRows_(db, Q2), w2 = r2.filter(function (r) { return r.Action === 'Replace'; })[0] || {};
            eq('CR17-2 one of two rows deleted then a failure: both back, stored spaces kept (r16: "Keep this." / "T17")', [e2, a2, r2.length, JSON.stringify(nq(w2.Text)), JSON.stringify(nq(w2.Title)), r2.some(function (r) { return /CR17 extra/.test(String(r.Text)); })].join('|'), 'BUSY|1|2|"Keep this.  "|" T17 "|true');
            eq('CR17-2b oQRaw_: text mark, no trim; blank stays blank', [oQRaw_(' a '), oQRaw_(''), oQRaw_(null), oQRaw_(0)].join('|'), "' a |||'0");
          } finally { uiDelRows_ = dr0; uiPutRow_ = up0; db.insert = i0; }
        })();
