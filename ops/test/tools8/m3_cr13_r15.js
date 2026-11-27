        // ---- M3 CR run 13 (harness only): catalogue-only by balance; owned value from the raw balance; legacy blank unit editable; Log appended
        //      atomically; office PDF pending fingerprint; a new quote retried with its request id returns the saved quote
        (function () {
          var CAT = must(db, 'Items', 'ItemCode', 'RL-STD-20').Category, J = JSON.stringify, rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IS = function (t, d) { rc(); return officeItemSave(t, d); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          var QP = function (n) { return String(must(db, 'Quotes', 'QuoteNo', n).PDF || ''); };
          var NQ = function (s) { rc(); var no = officeQuoteSave(tS, base({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] })).no; db.update('Quotes', must(db, 'Quotes', 'QuoteNo', no), { PDF: '' }); return no; };
          var row = function (t, c) { return (t.rows || []).filter(function (x) { return x.code === c; })[0]; };
          var nm = 0, mv = function (it, q, to, from) { db.insert('StockMoves', { MoveID: 'MV-C13-' + (++nm), MoveDate: new Date(2026, 10, 2), ItemCode: it, Qty: q, FromLoc: from === undefined ? 'LOC-SUPPLIER' : from, ToLoc: to === undefined ? 'LOC-YARD' : to, RefType: 'Opening', RefNo: 'OPEN-C13' }); };
          var EV = oEnv_(), dbf0 = EV.db, u0 = db.update, i0 = db.insert, nI = 0, tr = [];
          var ID = function (p) { return 'CR13' + p + (++nI) + 'abcdefghijklmnop'; }, UR = function (id) { return 'https://drive.google.com/file/d/' + id + '/view'; };
          var DA0 = typeof DriveApp === 'undefined' ? undefined : DriveApp, LS0 = LockService, ls0 = OLK_.ls, fl0 = SpreadsheetApp.flush;
          var LK = function (flushBad) { var fk = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; }, getDocumentLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
            OLK_.ls = fk; LockService = fk; SpreadsheetApp.flush = function () { if (flushBad) throw new Error('Flush failed'); }; };
          var UL = function () { OLK_.ls = ls0; LockService = LS0; SpreadsheetApp.flush = fl0; };
          try {
            DriveApp = { getFileById: function (id) { return { setTrashed: function (v) { tr.push(id + ':' + v); }, isTrashed: function () { return false; }, getDateCreated: function () { throw new Error('no file'); } }; } };
            // (1) #2: catalogue-only by balance (untracked, stock in then out = 0 -> only under All items); a negative balance stays listed
            db.insert('Items', [{ ItemCode: 'CR13-U1', Name: 'CR13 untracked', Category: CAT, Unit: 'pc', StockTracked: 'No', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CR13-U2', Name: 'CR13 untracked 2', Category: CAT, Unit: 'pc', StockTracked: 'No', IsSet: 'No', Status: 'Active' },
              { ItemCode: 'CR13-U3', Name: 'CR13 untracked 3', Unit: 'pc', StockTracked: 'No', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CR13-U4', Name: 'CR13 untracked 4', Unit: 'pc', StockTracked: 'No', IsSet: 'No', Status: 'Active' }]);
            mv('CR13-U1', 5); mv('CR13-U1', 5, 'LOC-SUPPLIER', 'LOC-YARD'); mv('CR13-U2', 2, '', 'LOC-YARD'); mv('CR13-U3', 0.3); mv('CR13-U3', 0.1, 'LOC-SUPPLIER', 'LOC-YARD'); mv('CR13-U3', 0.2, 'LOC-SUPPLIER', 'LOC-YARD');
            var L1 = officeStockList(tY), c1 = ['CR13-U1', 'CR13-U2', 'CR13-U3', 'CR13-U4'].map(function (c) { var r = row(L1, c); return r ? !!r.cata : 'none'; });
            eq('CR13-1 untracked: in 5 + out 5 -> catalogue only (r12: kept in the Stock list); yard -2 -> listed; 0.3 - 0.1 - 0.2 (float rest) -> catalogue; no moves -> catalogue', c1.join('|'), 'true|false|true|true');
            var e1 = err(function () { IS(tY, ED(tY, 'CR13-U2', { tracked: 'Yes' })); }); var e1b = err(function () { var x = ED(tY, 'CR13-U2', { tracked: 'Yes' }); IS(tY, x); IS(tY, ED(tY, 'CR13-U2', { tracked: 'No' })); });
            eq('CR13-1b the tracking off-switch uses the same rule: a yard balance of -2 refuses it', [e1, /stock tracked/.test(e1b)].join('|'), 'no error|true');
            // (2) #12: owned value = raw balance x cost, made on the server, only for a money login
            db.insert('Items', [{ ItemCode: 'CR13-V1', Name: 'CR13 value', Unit: 'kg', StockTracked: 'Yes', IsSet: 'No', Status: 'Active', ReplacementCost: 1000 }, { ItemCode: 'CR13-V2', Name: 'CR13 value 2', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active', ReplacementCost: 12.5 },
              { ItemCode: 'CR13-V3', Name: 'CR13 value 3', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CR13-S1', Name: 'CR13 set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active', ReplacementCost: 100 }]);
            mv('CR13-V1', 0.004); mv('CR13-V1', 0.004, 'LOC-REPAIR'); mv('CR13-V2', 3); mv('CR13-V2', 1, 'LOC-LOST'); mv('CR13-V3', 4);
            var LD = officeStockList(tD), LV = officeStockList(tY), v1 = row(LD, 'CR13-V1'), iv1 = officeStockItem(tD, 'CR13-V1'), iv2 = officeStockItem(tY, 'CR13-V1');
            eq('CR13-2 0.004 yard + 0.004 repair at Tk 1000: owned 0.01 shown, value Tk 8 (r12 page: 0.01 x 1000 = 10); list + item view', [v1.own, v1.val, iv1.own, iv1.val].join('|'), '0.01|8|0.01|8');
            eq('CR13-2b 3 in yard + 1 lost at 12.5 -> 37.5 (lost not owned); no cost -> no value; a set -> no value; no-money login: no cost, no value',
              [row(LD, 'CR13-V2').val, 'val' in row(LD, 'CR13-V3'), 'val' in row(LD, 'CR13-S1'), 'val' in row(LV, 'CR13-V1'), 'cost' in row(LV, 'CR13-V1'), 'val' in iv2, LV.money].join('|'), '37.5|false|false|false|false|false|false');
            // (3) #9: a legacy item with a blank unit and stock moves can be edited (unit stays blank); a new item still needs one; a used unit still can't change
            db.insert('Items', { ItemCode: 'CR13-LU1', Name: 'CR13 legacy', Category: must(db, 'Items', 'ItemCode', 'RL-STD-20').Category, Unit: '', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }); mv('CR13-LU1', 3);
            var e3 = err(function () { IS(tY, ED(tY, 'CR13-LU1', { name: 'CR13 legacy renamed' })); }), r3 = must(db, 'Items', 'ItemCode', 'CR13-LU1');
            var e3b = err(function () { IS(tY, ED(tY, 'CR13-LU1', { unit: 'pc' })); }), e3c = err(function () { IS(tY, { code: 'CR13-NEW1', name: 'n', cat: r3.Category, size: '', unit: '', kg: '', reorder: '', status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }); });
            eq('CR13-3 legacy blank unit: a name edit saves (r12: BADINPUT|unit), unit still blank; giving it a unit while in use refused; a new item with no unit refused',
              [e3, oUncell_(r3.Name), String(r3.Unit), e3b, e3c].join('|'), 'no error|CR13 legacy renamed||BADINPUT|unit|BADINPUT|unit');
            // (4) #8: Log rows appended atomically: another writer appending between "last row" and the write is not overwritten
            var mkS = function (hook) { var D = [['Timestamp', 'User', 'Action', 'Ref', 'Details']], calls = [];
              var rng = function (r, c, nr, nc) { return { getValues: function () { var o = []; for (var i = 0; i < nr; i++) { var w = D[r - 1 + i] || [], x = []; for (var k = 0; k < nc; k++) x.push(w[c - 1 + k] === undefined ? '' : w[c - 1 + k]); o.push(x); } return o; },
                setValues: function (v) { calls.push('set'); v.forEach(function (w, i) { D[r - 1 + i] = w.slice(); }); } }; };
              var sh = { getLastRow: function () { calls.push('last'); var n = D.length; if (hook) hook(D); return n; }, getLastColumn: function () { return 5; }, getRange: function (r, c, nr, nc) { return rng(r, c, nr || 1, nc || 1); },
                getDataRange: function () { return rng(1, 1, D.length, 5); }, appendRow: function (w) { calls.push('append'); if (hook) hook(D); D.push(w.slice()); } };
              return { D: D, calls: calls, ss: { getSheetByName: function (t) { return t === 'Log' ? sh : null; } } }; };
            var one = function (D) { if (!one.d) { one.d = 1; D.push(['t', 'other', 'Other writer', 'X', '']); } };
            var S1 = mkS(one), d4 = new SheetDb(S1.ss); log_(d4, 'CR13 log', 'R1', 'mine');
            var acts = S1.D.slice(1).map(function (w) { return w[2]; });
            eq('CR13-4 log_ on a sheet: another writer\'s row stays, mine appended after it (r12: overwritten); no "last row" read', [acts.join(','), S1.calls.join(',')].join('|'), 'Other writer,CR13 log|append');
            var S2 = mkS(null), d5 = new SheetDb(S2.ss), n5 = d5.rows('Log').length; d5.insert('Log', [{ Action: 'a1', Ref: "'x" }, { Action: 'a2', Ref: '0123' }]);
            eq('CR13-4b two rows: two appends in order; text marks as before (cellVal_); a read cache gets the rows', [S2.D.slice(1).map(function (w) { return w[2] + ':' + w[3]; }).join(','), d5.rows('Log').length - n5, S2.calls.join(',')].join('|'), "a1:'x,a2:'0123|2|append,append");
            var S3 = mkS(null), d6 = new SheetDb(S3.ss), k6 = OW4C_ON_; OW4C_ON_ = false; try { d6.insert('Log', { Action: 'off' }); } finally { OW4C_ON_ = k6; }
            eq('CR13-4c W4c off: the old insert (last row + write, no append)', [S3.calls.indexOf('append') < 0, S3.calls.slice(-1)[0], S3.D.length].join('|'), 'true|set|2');
            // (5) #7: the office PDF link write threw yet went in -> its fingerprint (pending) still makes it current only for its own version
            var Q5 = NQ('CR13 office pdf'), v5 = oQPdfVer_(db, Q5).v, a5 = ID('p'), b5 = ID('d'), r5 = { url: UR(a5), doc: UR(b5) };
            e5.del('OQP:' + Q5); e5.del('OQPN:' + Q5); LK(true);
            var e5w; try { e5w = err(function () { oQPdfLinkIf_(EV, db, Q5, r5, v5, []); }); } finally { UL(); }
            var q5 = must(db, 'Quotes', 'QuoteNo', Q5);
            eq('CR13-5 link went in, then the flush threw: error, cell on the new PDF; current for its version, out of date for another (r12: trusted as a panel PDF)',
              [e5w, QP(Q5) === r5.url, oQPdfFresh_(EV, q5, v5) === r5.url, oQPdfFresh_(EV, q5, 'other')].join('|'), 'Flush failed|true|true|');
            var OLD = UR(ID('o')); u0.call(db, 'Quotes', q5, { PDF: OLD }); e5.put('OQP:' + Q5, { v: v5, f: oQFid_(OLD) }); var a6 = ID('p'), r6 = { url: UR(a6), doc: UR(ID('d')) };
            db.update = function (t, r, p) { if (t === 'Quotes' && p && p.PDF === r6.url) throw new Error('write failed'); return u0.apply(db, arguments); };
            var e6; try { e6 = err(function () { oQPdfLinkIf_(EV, db, Q5, r6, v5, []); }); } finally { db.update = u0; }
            eq('CR13-5b the write did not go in: the cell keeps the old office PDF, still judged by its own record (the pending one is not used for it)', [e6, QP(Q5) === OLD, oQPdfFresh_(EV, q5, v5) === OLD, oQPdfFresh_(EV, q5, 'other')].join('|'), 'write failed|true|true|');
            var PAN = UR(ID('x')); u0.call(db, 'Quotes', q5, { PDF: PAN });
            eq('CR13-5c a panel PDF in the cell (no record of it): trusted as before', oQPdfFresh_(EV, q5, 'other') === PAN, true);
            u0.call(db, 'Quotes', q5, { PDF: '' }); e5.put('OQPN:' + Q5, { v: 'x', f: 'y' }); var m5 = officeQuotePdf(tS, Q5);
            eq('CR13-5d a normal office make writes OQP and drops the pending record', [m5.made, e5.get('OQPN:' + Q5) == null, !!e5.get('OQP:' + Q5)].join('|'), 'true|true|true');
            db.ensureColumn('Quotes', 'ReqID'); // r15: the live sheet keeps this column (r14b); the M2 save never reads or writes it
            // (6) r15 (#1 reverted): the new-quote save is M2's again: a request id sent by an older page is ignored
            var nQ = function () { return db.rows('Quotes').length; }, BQ = function (s, rid) { var o = base({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] }); if (rid !== undefined) o.rid = rid; return o; };
            var QQ = function (no) { return must(db, 'Quotes', 'QuoteNo', no); };
            rc(); var n6 = nQ(), s1 = officeQuoteSave(tS, BQ('CR13 rid', 'cr13ridaaaa1')); rc(); var s2 = officeQuoteSave(tS, BQ('CR13 rid', 'cr13ridaaaa1'));
            eq('R15-6 (M2) a request id is ignored: two saves = two quotes, no again / part, ReqID never written', [s2.no !== s1.no, 'again' in s2, 'part' in s2, nQ() - n6, blank(QQ(s1.no).ReqID), blank(QQ(s2.no).ReqID), typeof s2.ev].join('|'), 'true|false|false|2|true|true|number');
            var hit = false; db.insert = function (t) { var r = i0.apply(db, arguments); if (t === 'Quotes') hit = true; return r; };
            EV.db = function () { if (hit) throw new Error('Service Spreadsheets timed out'); return dbf0.apply(EV, arguments); };
            rc(); var n6b = nQ(), e6b; try { e6b = err(function () { officeQuoteSave(tS, BQ('CR13 rid b', 'cr13ridbbbb2')); }); } finally { db.insert = i0; EV.db = dbf0; }
            var qb6 = db.rows('Quotes').slice(-1)[0];
            eq('R15-6b (M2) committed, then a read failed: an error; that quote stays as saved (nothing overwritten), no ReqID', [e6b !== 'no error', nQ() - n6b, String(qb6.Subject).indexOf('CR13 rid b') >= 0, blank(qb6.ReqID)].join('|'), 'true|1|true|true');
            db.update('Quotes', QQ(s1.no), { ReqID: 'REQ-001' }); rc(); var s9 = officeQuoteSave(tS, Object.assign(BQ('CR13 rid g', 'cr13ridaaaa1'), { no: s1.no, ev: oQeEv_(db, QQ(s1.no)) }));
            eq('R15-6c (M2) an edit carrying an id: a normal edit; a ReqID value of another workflow stays as it is (run 15 L2569)', [s9.no === s1.no, 'again' in s9, s9.changed, String(QQ(s1.no).ReqID), String(QQ(s1.no).Subject).indexOf('CR13 rid g') >= 0].join('|'), 'true|false|true|REQ-001|true');
            rc(); var s10 = officeQuoteSave(tS, Object.assign(BQ('CR13 rid h'), { pdf: true }));
            eq('R15-6d (M2) a new quote with Save & make PDF: saved and its PDF made, no again', [!!s10.no, 'again' in s10, !!s10.pdf].join('|'), 'true|false|true');
          } finally { db.update = u0; db.insert = i0; EV.db = dbf0; UL(); DriveApp = DA0; }
        })();
