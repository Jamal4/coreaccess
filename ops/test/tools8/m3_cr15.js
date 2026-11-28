        // ---- M3 CR run 15 (harness only): office PDF record made final only while the cell links it and nothing marked it since; a locked
        //      quote with no PDF gets none; catalogue-only items not low; a set is not stock-tracked; set count per single yard location;
        //      opened locations sent to the opening form; terms rollback after a part delete / part write / failed log
        (function () {
          var rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var EV = oEnv_(), u0 = db.update, i0 = db.insert, up0 = uiPutRow_, dr0 = uiDelRows_, lg0 = log_, q5k = qf5Pdf_, sm = QF5_STUB_.make, tr = [];
          var DA0 = typeof DriveApp === 'undefined' ? undefined : DriveApp;
          var Q = function (no) { return must(db, 'Quotes', 'QuoteNo', no); }, row = function (t, c) { return (t.rows || []).filter(function (x) { return x.code === c; })[0]; };
          var BQ = function (s) { return base({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] }); };
          var nm = 0, mv = function (it, q, to) { db.insert('StockMoves', { MoveID: 'MV-C15-' + (++nm), MoveDate: new Date(2026, 10, 2), ItemCode: it, Qty: q, FromLoc: 'LOC-SUPPLIER', ToLoc: to || 'LOC-YARD', RefType: 'Opening', RefNo: 'OPEN-C15' }); };
          var dj = function (no) { var j = find(db.rows('Jobs'), 'JobNo', no); if (j) dr0(db, 'Jobs', [j]); };
          var back = function () { db.update = u0; db.insert = i0; uiPutRow_ = up0; uiDelRows_ = dr0; log_ = lg0; qf5Pdf_ = q5k; QF5_STUB_.make = sm; };
          try {
            DriveApp = { getFileById: function (id) { return { setTrashed: function (v) { tr.push(id + ':' + v); }, isTrashed: function () { return false; }, getDateCreated: function () { throw new Error('no file'); } }; } };
            // (2) run 15 L1351: the record is final only while the cell links this run's file and its record is as the publication left it
            rc(); var Q1 = officeQuoteSave(tS, BQ('CR15 rec')).no; var m1 = officeQuotePdf(tS, Q1), v1 = oQPdfVer_(db, Q1).v;
            eq('CR15-2a a normal office make: the record is final (OQP = the linked file, this version), no pending one left', [m1.made, e5.get('OQP:' + Q1).f === oQFid_(Q(Q1).PDF), e5.get('OQP:' + Q1).v === v1, e5.get('OQPN:' + Q1) == null].join('|'), 'true|true|true|true');
            var B = 'https://drive.google.com/file/d/CR15bbbbbbbbbbbbbbbb2/view';
            u0.call(db, 'Quotes', Q(Q1), { PDF: '' }); qf5Pdf_ = function () { var r = q5k.apply(this, arguments); u0.call(db, 'Quotes', Q(Q1), { PDF: B }); oQPdfStale_(EV, db, Q1, true); return r; }; // after the publication: a panel PDF B linked, then marked out of date
            var m2; try { m2 = officeQuotePdf(tS, Q1); } finally { back(); }
            eq('CR15-2b a newer panel PDF linked and marked out of date after this make published: its mark kept, B judged out of date (r14b: replaced -> B trusted)', [m2.made, String(Q(Q1).PDF) === B, e5.get('OQP:' + Q1).f === oQFid_(B), e5.get('OQP:' + Q1).v, oQPdfFresh_(EV, Q(Q1), oQPdfVer_(db, Q1).v)].join('|'), 'true|true|true|0|');
            u0.call(db, 'Quotes', Q(Q1), { PDF: '' }); qf5Pdf_ = function () { var r = q5k.apply(this, arguments); oQPdfStale_(EV, db, Q1, true); return r; }; // this run's own file marked out of date (e.g. a stamp change) right after it published
            var m3; try { m3 = officeQuotePdf(tS, Q1); } finally { back(); }
            eq('CR15-2c this run\'s file marked out of date right after it published: the mark stays (r14b: replaced by this run\'s record = current)', [m3.made, e5.get('OQP:' + Q1).v, oQPdfFresh_(EV, Q(Q1), oQPdfVer_(db, Q1).v)].join('|'), 'true|0|');
            u0.call(db, 'Quotes', Q(Q1), { PDF: '' }); qf5Pdf_ = function () { var r = q5k.apply(this, arguments); u0.call(db, 'Quotes', Q(Q1), { PDF: B }); return r; };
            var m4, p4 = null; try { m4 = officeQuotePdf(tS, Q1); } finally { back(); }
            var f2d = oQPdfFresh_(EV, Q(Q1), oQPdfVer_(db, Q1).v) === B; oQPdfStale_(EV, db, Q1, true);
            eq('CR15-2d a newer panel PDF linked (no mark): B trusted as a panel PDF (as before; the office record is per file); marked later: out of date', [m4.made, f2d, oQPdfFresh_(EV, Q(Q1), oQPdfVer_(db, Q1).v)].join('|'), 'true|true|');
            u0.call(db, 'Quotes', Q(Q1), { PDF: '' }); var C = 'https://drive.google.com/file/d/CR15cccccccccccccccc3/view';
            qf5Pdf_ = function () { var r = q5k.apply(this, arguments); u0.call(db, 'Quotes', Q(Q1), { PDF: B }); oQPdfLinkIf_(EV, db, Q1, { url: C, doc: '' }, oQPdfVer_(db, Q1).v, [], {}); return r; }; // after this run published: a panel link, then another office PDF C
            var m6; try { m6 = officeQuotePdf(tS, Q1); } finally { back(); }
            eq('CR15-2f after this make published: a panel link, then another office PDF C: C keeps its pending record (judged by its version), this run writes no record', [m6.made, String(Q(Q1).PDF) === C, oQPdfFresh_(EV, Q(Q1), oQPdfVer_(db, Q1).v) === C, oQPdfFresh_(EV, Q(Q1), 'other')].join('|'), 'true|true|true|');
            u0.call(db, 'Quotes', Q(Q1), { PDF: '' }); var lk0 = EV.lock, n5 = 0; EV.lock = function (f) { return lk0.call(EV, f); };
            var sl0 = oScrLock_, k5 = 0; oScrLock_ = function (f) { if (++k5 === 2) throw new Error('BUSY'); return sl0.apply(this, arguments); }; // the second script lock (the final record) refused
            var m5; try { m5 = officeQuotePdf(tS, Q1); } finally { oScrLock_ = sl0; EV.lock = lk0; back(); }
            eq('CR15-2e the final-record lock busy: the PDF stands, its pending record judges it (current for its version, out of date for another)', [m5.made, e5.get('OQPN:' + Q1) && e5.get('OQPN:' + Q1).f === oQFid_(m5.url), oQPdfFresh_(EV, Q(Q1), oQPdfVer_(db, Q1).v) === m5.url, oQPdfFresh_(EV, Q(Q1), 'other')].join('|'), 'true|true|true|');
            // (3) run 15 L1372: a locked quote with an empty PDF cell gets no PDF (before the render, in the lease read, during the render)
            rc(); var Q3 = officeQuoteSave(tS, BQ('CR15 lock')).no, nmk = 0; u0.call(db, 'Quotes', Q(Q3), { PDF: '' }); i0.call(db, 'Jobs', { JobNo: 'J/CR15/1', QuoteNo: Q3 });
            QF5_STUB_.make = function () { nmk++; return sm.apply(this, arguments); };
            var e3a = err(function () { officeQuotePdf(tS, Q3); }), e3b = err(function () { oQPdfMake_(EV, db, Q(Q3)); }); back(); dj('J/CR15/1');
            eq('CR15-3a locked (job), no PDF: PDFLOCK from the request and from the lease read; nothing rendered, cell empty, no lease left', [e3a, e3b, nmk, blank(Q(Q3).PDF), !e5.get('OQPB:' + Q3)].join('|'), 'PDFLOCK|PDFLOCK|0|true|true');
            tr.length = 0; QF5_STUB_.make = function () { nmk++; i0.call(db, 'Jobs', { JobNo: 'J/CR15/2', QuoteNo: Q3 }); var r = sm.apply(this, arguments); r.url = 'https://drive.google.com/file/d/CR15newfile' + nmk + 'abcdefgh/view'; return r; };
            var e3c; try { e3c = err(function () { officeQuotePdf(tS, Q3); }); } finally { back(); dj('J/CR15/2'); }
            eq('CR15-3b locked during the render, no PDF: PDFLOCK, the new file binned, cell empty, no lease left', [e3c, nmk, blank(Q(Q3).PDF), tr.some(function (x) { return /CR15newfile/.test(x) && /:true$/.test(x); }), !e5.get('OQPB:' + Q3)].join('|'), 'PDFLOCK|1|true|true|true');
            u0.call(db, 'Quotes', Q(Q3), { Status: 'Accepted' }); var e3d = err(function () { officeQuotePdf(tS, Q3); }); u0.call(db, 'Quotes', Q(Q3), { Status: 'Draft' }); var m3e = officeQuotePdf(tS, Q3);
            eq('CR15-3c Accepted (locked by status), no PDF: PDFLOCK; open again: made as before', [e3d, m3e.made, String(Q(Q3).PDF) === m3e.url].join('|'), 'PDFLOCK|true|true');
            // (4) run 15 L2018: low = the same rule as the list count
            db.insert('Items', [{ ItemCode: 'CR15-C1', Name: 'CR15 cat', Unit: 'pc', StockTracked: 'No', IsSet: 'No', Status: 'Active', ReorderLevel: 5 }, { ItemCode: 'CR15-T1', Name: 'CR15 tracked', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active', ReorderLevel: 5 },
              { ItemCode: 'CR15-U1', Name: 'CR15 untracked held', Unit: 'pc', StockTracked: 'No', IsSet: 'No', Status: 'Active', ReorderLevel: 5 }]);
            mv('CR15-U1', 1);
            var L4 = officeStockList(tY), c4 = row(L4, 'CR15-C1'), t4 = row(L4, 'CR15-T1'), u4 = row(L4, 'CR15-U1');
            eq('CR15-4 catalogue-only (untracked, no stock): not low (list + item view); tracked at 0: low; untracked holding 1 < 5: low and counted',
              [c4.cata, c4.low, officeStockItem(tY, 'CR15-C1').low, !!t4.cata, t4.low, officeStockItem(tY, 'CR15-T1').low, !!u4.cata, u4.low].join('|'), 'true|false|false|false|true|true|false|true');
            // (5) run 15 L2198: a set is never stock-tracked itself
            var NI = function (o) { return Object.assign({ code: 'CR15-S1', name: 'CR15 set', cat: 'Ringlock', size: '', unit: 'set', kg: '', reorder: '', status: 'Active', tracked: 'No', isSet: 'Yes', forHire: 'Yes', forSale: 'No' }, o || {}); };
            var ni0 = db.rows('Items').length; rc(); var e5a = err(function () { officeItemSave(tY, NI({ tracked: 'Yes' })); }), n5a = db.rows('Items').length - ni0; rc(); var s5 = officeItemSave(tY, NI());
            var g5 = officeStockItem(tY, 'CR15-S1'), ED5 = function (o) { return Object.assign(NI(), { ev: officeStockItem(tY, 'CR15-S1').ev }, o); };
            rc(); var e5b = err(function () { officeItemSave(tY, ED5({ tracked: 'Yes' })); });
            db.insert('Items', { ItemCode: 'CR15-S2', Name: 'CR15 legacy set', Unit: 'set', StockTracked: 'Yes', IsSet: 'Yes', Status: 'Active', ForHire: 'Yes', ForSale: 'No' });
            var ED6 = function (o) { var g = officeStockItem(tY, 'CR15-S2'); return Object.assign(NI({ code: 'CR15-S2', name: 'CR15 legacy set' }), { ev: g.ev }, o); };
            rc(); var e5c = err(function () { officeItemSave(tY, ED6({ tracked: 'Yes', name: 'renamed' })); }); rc(); var s5d = officeItemSave(tY, ED6({ tracked: 'No' }));
            eq('CR15-5 set + tracked refused (new: nothing written; edit of a set; a legacy tracked set); untracked set saved; the legacy one saved once untracked',
              [e5a, n5a, s5.code, g5.tracked, e5b, e5c, !!s5d.code, must(db, 'Items', 'ItemCode', 'CR15-S2').StockTracked].join('|'), 'BADINPUT|set tracked|0|CR15-S1|false|BADINPUT|set tracked|BADINPUT|set tracked|true|No');
            // (6) run 15 L2014: sets one challan can issue = the best single yard location (Sets.gs checks part|FromLoc)
            db.insert('Locations', { LocID: 'LOC-C15A', Name: 'CR15 rack A', Type: 'Yard', Status: 'Active' });
            db.insert('Items', [{ ItemCode: 'CR15-P', Name: 'CR15 part', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CR15-Q', Name: 'CR15 part 2', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' },
              { ItemCode: 'CR15-K', Name: 'CR15 kit', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' }]);
            db.insert('KitParts', [{ KitPartID: 'KP-C15A', SetCode: 'CR15-K', ItemCode: 'CR15-P', QtyPerSet: 5 }, { KitPartID: 'KP-C15B', SetCode: 'CR15-K', ItemCode: 'CR15-Q', QtyPerSet: 1 }]);
            mv('CR15-P', 3); mv('CR15-P', 3, 'LOC-C15A'); mv('CR15-Q', 1); mv('CR15-Q', 1, 'LOC-C15A');
            var k6a = row(officeStockList(tY), 'CR15-K').make, kv6 = officeStockItem(tY, 'CR15-K').kit.map(function (p) { return p.code + ':' + p.yard + ':' + p.mk; }).join(',');
            mv('CR15-P', 2); var k6b = row(officeStockList(tY), 'CR15-K').make; mv('CR15-P', 5, 'LOC-C15A'); var k6c = row(officeStockList(tY), 'CR15-K').make; mv('CR15-Q', 1, 'LOC-C15A'); var k6d = row(officeStockList(tY), 'CR15-K').make; db.insert('StockMoves', [{ MoveID: 'MV-C15-R1', MoveDate: new Date(2026, 10, 3), ItemCode: 'CR15-P', Qty: 20, FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-REPAIR', RefType: 'Challan', RefNo: 'C15-R' }, { MoveID: 'MV-C15-R2', MoveDate: new Date(2026, 10, 3), ItemCode: 'CR15-Q', Qty: 9, FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-REPAIR', RefType: 'Challan', RefNo: 'C15-R' }]); var k6e = row(officeStockList(tY), 'CR15-K').make;
            eq('CR15-6 5 per set, 3 + 3 on two racks: 0 sets (r14b: 1); 5 on one rack: 1; 8 on the other with 1 / 2 of part 2: still 1 / then 1 (min per rack, max over racks); repair stock (4 sets\' worth) not counted; part view: total + best rack',
              [k6a, kv6, k6b, k6c, k6d, k6e].join('|'), '0|CR15-P:6:0,CR15-Q:2:1|1|1|1|1');
            // (7) run 15 Office.html L1492: the opening form gets the pairs opened already (head logins only)
            var L7 = officeStockList(tD), L7y = officeStockList(tY);
            eq('CR15-7 the list carries each item\'s opened locations (Opening moves only, once each) for a head login (not for others)', [(row(L7, 'CR15-P').op || []).join(','), (row(L7, 'CR15-C1').op || []).length, 'op' in row(L7y, 'CR15-P')].join('|'), 'LOC-YARD,LOC-C15A|0|false');
            // (9) run 15 L1325: terms save failing after a part delete / after its writes: the quote's old override rows back, other quotes untouched
            rc(); var Q9 = officeQuoteSave(tS, BQ('CR15 terms')).no, Q9b = officeQuoteSave(tS, BQ('CR15 terms other')).no;
            var TV = function (no) { return oQTv_(db, oQRow_(db, no)); }, OV = function (no) { return qtRows_(db, no).map(function (o) { return JSON.stringify(['ClauseID', 'Action', 'Section', 'ClauseNo', 'Title', 'Text', 'SortOrder'].map(function (k) { return String(o[k] == null ? '' : o[k]).replace(/^'+/, ''); })); }).sort().join('\n'); }; // MemDb keeps the text marks the sheet drops
            rc(); officeQuoteTerm(tS, Q9, TV(Q9), { k: 'add', sec: -1, text: 'CR15 extra one' }); rc(); officeQuoteTerm(tS, Q9b, TV(Q9b), { k: 'add', sec: -1, text: 'CR15 other quote' }); rc(); officeQuoteTerm(tS, Q9, TV(Q9), { k: 'add', sec: -1, text: 'CR15 extra two' });
            var o9 = OV(Q9), o9b = OV(Q9b), n9 = qtRows_(db, Q9).length, h9 = String(Q(Q9).PaymentDays == null ? '' : Q(Q9).PaymentDays);
            var a9 = 0; uiDelRows_ = function (d, t, rows) { if (t === 'QuoteTerms' && rows.length === 2 && !a9++) { dr0(d, t, [rows[0]]); throw new Error('Service Spreadsheets timed out'); } return dr0.apply(this, arguments); };
            rc(); var e9a; try { e9a = err(function () { officeQuoteTerm(tS, Q9, TV(Q9), { k: 'add', sec: -1, text: 'CR15 extra three' }); }); } finally { back(); }
            eq('CR15-9a 2 overrides (another quote\'s row between): the save deletes one, then fails -> BUSY, both back, the other quote untouched (r14b: one missing)', [e9a, a9, n9, qtRows_(db, Q9).length, OV(Q9) === o9, OV(Q9b) === o9b].join('|'), 'BUSY|1|2|2|true|true');
            var a9b = 0; log_ = function (d, act) { if (act === 'Quote terms' && !a9b++) throw new Error('Service Spreadsheets timed out'); return lg0.apply(this, arguments); };
            rc(); var e9b; try { e9b = err(function () { officeQuoteTerm(tS, Q9, TV(Q9), { k: 'add', sec: -1, text: 'CR15 extra four' }); }); } finally { back(); }
            eq('CR15-9b written, then its log failed -> BUSY: the old rows back (not the new set), the other quote untouched', [e9b, a9b, qtRows_(db, Q9).length, OV(Q9) === o9, OV(Q9b) === o9b].join('|'), 'BUSY|1|2|true|true');
            var keepR = qtRows_(db, Q9).slice(), a9c = 0; uiPutRow_ = function (d, t, r, p) { if (t === 'Quotes' && !a9c++) throw new Error('Service Spreadsheets timed out'); return up0.apply(this, arguments); };
            rc(); var e9c; try { e9c = err(function () { officeQuoteTerm(tS, Q9, TV(Q9), { k: 'add', sec: -1, text: 'CR15 extra five' }); }); } finally { back(); }
            eq('CR15-9c failed before any row went: BUSY, the same rows left in place (not rewritten)', [e9c, qtRows_(db, Q9).every(function (r, i) { return r === keepR[i]; }), OV(Q9) === o9].join('|'), 'BUSY|true|true');
            var a9e = 0; log_ = function (d, act) { if (act === 'Quote terms' && !a9e++) throw new Error('Service Spreadsheets timed out'); return lg0.apply(this, arguments); };
            rc(); var e9e; try { e9e = err(function () { officeQuoteTerm(tS, Q9, TV(Q9), { k: 'clause', id: 'A0', text: 'CR15 extra one reworded' }); }); } finally { back(); }
            eq('CR15-9e only a wording changed, then the log failed -> BUSY: the old wording back (same rows, same ids)', [e9e, a9e, qtRows_(db, Q9).length, OV(Q9) === o9, /reworded/.test(JSON.stringify(qtRows_(db, Q9)))].join('|'), 'BUSY|1|2|true|false');
            rc(); officeQuoteTerm(tS, Q9, TV(Q9), { k: 'add', sec: -1, text: 'CR15 extra six' });
            eq('CR15-9d a normal terms save after these: 3 overrides', qtRows_(db, Q9).length, 3);
          } finally { back(); DriveApp = DA0; }
        })();
