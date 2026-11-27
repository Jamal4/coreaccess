        // ---- M3 CR run 14 (harness only): request id in the quote row (durable; a retry completes an unfinished save); an office PDF of a quote
        //      locked meanwhile keeps the stored one; the linked file's pending record promoted; low + list filters on raw balances
        (function () {
          var rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var EV = oEnv_(), dbf0 = EV.db, u0 = db.update, i0 = db.insert, up0 = uiPutRow_, tr = [], sm = QF5_STUB_.make, dv = QF5_STUB_.drive, dt0 = dv && dv.trash;
          var DA0 = typeof DriveApp === 'undefined' ? undefined : DriveApp, H0 = null;
          var nQ = function () { return db.rows('Quotes').length; }, Q = function (no) { return must(db, 'Quotes', 'QuoteNo', no); };
          var BQ = function (s, rid, o) { var x = base(Object.assign({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] }, o || {})); if (rid !== undefined) x.rid = rid; return x; };
          var lost = function () { var hit = false; db.insert = function (t) { var r = i0.apply(db, arguments); if (t === 'Quotes') hit = true; return r; }; EV.db = function () { if (hit) throw new Error('Service Spreadsheets timed out'); return dbf0.apply(EV, arguments); }; };
          var pfail = function (mode) { var n = 0; uiPutRow_ = function (d, t, r, p) { var k = p && p.ReqID != null ? String(p.ReqID) : ''; if (t === 'Quotes' && (/:ok$/.test(k) && !n++ || mode === 'both' && /~/.test(k))) { if (mode === 'in') up0.apply(this, arguments); throw new Error('write failed'); } return up0.apply(this, arguments); }; };
          var back = function () { db.insert = i0; db.update = u0; EV.db = dbf0; uiPutRow_ = up0; };
          var row = function (t, c) { return (t.rows || []).filter(function (x) { return x.code === c; })[0]; };
          var nm = 0, mv = function (it, q, to, from) { db.insert('StockMoves', { MoveID: 'MV-C14-' + (++nm), MoveDate: new Date(2026, 10, 2), ItemCode: it, Qty: q, FromLoc: from === undefined ? 'LOC-SUPPLIER' : from, ToLoc: to === undefined ? 'LOC-YARD' : to, RefType: 'Opening', RefNo: 'OPEN-C14' }); };
          var dj = function (no) { var j = find(db.rows('Jobs'), 'JobNo', no); if (j) uiDelRows_(db, 'Jobs', [j]); };
          try {
            DriveApp = { getFileById: function (id) { return { setTrashed: function (v) { tr.push(id + ':' + v); }, isTrashed: function () { return false }, getDateCreated: function () { throw new Error('no file'); } }; } };
            db.ensureColumn('Quotes', 'ReqID');
            // (1)-(5) r15 (#1 reverted to M2): the last row write fails -> an error, the quote as saved (no version, no ReqID); ReqID never touched
            var th = 0, vf = function () { th = 0; uiPutRow_ = function (d, t, r, p) { if (t === 'Quotes' && p && 'ValidityDays' in p && !th++) throw new Error('write failed'); return up0.apply(this, arguments); }; };
            vf(); rc(); var n1 = nQ(), e1; try { e1 = err(function () { officeQuoteSave(tS, BQ('CR14 days', 'cr14riddays1', { valid: '2026-12-05' })); }); } finally { back(); }
            var q1 = db.rows('Quotes').slice(-1)[0];
            eq('R15-1 (M2) committed, ValidityDays write failed: an error, one quote as saved (days blank), no ReqID', [e1 !== 'no error', th, nQ() - n1, String(q1.Subject).indexOf('CR14 days') >= 0, blank(q1.ValidityDays), blank(q1.ReqID)].join('|'), 'true|1|1|true|true|true');
            rc(); var s1 = officeQuoteSave(tS, BQ('CR14 days ok', 'cr14riddays1', { valid: '2026-12-05' }));
            eq('R15-1b (M2) the same request again: another quote (the id is ignored), 15 days, no again; the first one unchanged', [s1.no !== String(q1.QuoteNo), String(Q(s1.no).ValidityDays), 'again' in s1, nQ() - n1, blank(q1.ValidityDays)].join('|'), 'true|15|false|2|true');
            u0.call(db, 'Quotes', Q(s1.no), { ReqID: 'x~5' }); vf(); rc(); var e1c; try { e1c = err(function () { officeQuoteSave(tS, Object.assign(BQ('CR14 edit', undefined, { valid: '2026-12-09' }), { no: s1.no, ev: oQeEv_(db, Q(s1.no)) })); }); } finally { back(); }
            eq('R15-1c (M2) an edit whose last write fails: an error, ReqID left as it is (no version written)', [e1c !== 'no error', th, String(Q(s1.no).ReqID)].join('|'), 'true|1|x~5');
            u0.call(db, 'Quotes', Q(s1.no), { ReqID: '' }); rc(); officeQuoteSave(tS, Object.assign(BQ('CR14 same', undefined, { valid: '2026-12-05' }), { no: s1.no, ev: oQeEv_(db, Q(s1.no)) })); rc(); var s1d = officeQuoteSave(tS, Object.assign(BQ('CR14 same', undefined, { valid: '2026-12-05' }), { no: s1.no, ev: oQeEv_(db, Q(s1.no)) }));
            eq('R15-1d (M2) a save that changes nothing: no write, no again', [s1d.changed, 'again' in s1d, blank(Q(s1.no).ReqID)].join('|'), 'false|false|true');
            eq('R15-1e the r13/r14 retry code is gone (no oQeIns_, no ReqID / rid in the save)', [typeof oQeIns_, /ReqID|\brid\b|\.again\b|oQeIns_/.test(String(officeQuoteSave.officeRaw_ || officeQuoteSave))].join('|'), 'undefined|false');
            // (6) #4: the cell's file has only a pending record; the next make's write fails before it applies -> that file keeps its record (r13: trusted as a panel PDF)
            var Q7 = s1.no, v7 = oQPdfVer_(db, Q7).v, A = 'https://drive.google.com/file/d/CR14aaaaaaaaaaaaaaaa1/view', B = 'https://drive.google.com/file/d/CR14bbbbbbbbbbbbbbbb2/view';
            u0.call(db, 'Quotes', Q(Q7), { PDF: A }); e5.del('OQP:' + Q7); e5.put('OQPN:' + Q7, { v: v7, f: oQFid_(A) });
            db.update = function (t, r, p) { if (t === 'Quotes' && p && p.PDF === B) throw new Error('write failed'); return u0.apply(db, arguments); };
            var e8; try { e8 = err(function () { oQPdfLinkIf_(EV, db, Q7, { url: B, doc: '' }, v7, []); }); } finally { back(); }
            eq('CR14-6 failed link write over a pending-only file: the cell keeps A, still current for its own version only', [e8, String(Q(Q7).PDF) === A, oQPdfFresh_(EV, Q(Q7), v7) === A, oQPdfFresh_(EV, Q(Q7), 'other')].join('|'), 'write failed|true|true|');
            var C = 'https://drive.google.com/file/d/CR14cccccccccccccccc3/view'; e5.put('OQP:' + Q7, { v: v7, f: oQFid_(A) }); e5.put('OQPN:' + Q7, { v: 'x', f: oQFid_(C) });
            db.update = function (t, r, p) { if (t === 'Quotes' && p && p.PDF === B) throw new Error('write failed'); return u0.apply(db, arguments); };
            try { err(function () { oQPdfLinkIf_(EV, db, Q7, { url: B, doc: '' }, v7, []); }); } finally { back(); }
            eq('CR14-6b A has its own record, a stale pending one is for another file: A keeps its record (not replaced)', [e5.get('OQP:' + Q7).f === oQFid_(A), oQPdfFresh_(EV, Q(Q7), 'other'), oQPdfFresh_(EV, Q(Q7), v7) === A].join('|'), 'true||true');
            // (7) #8: a contract made after the click, before the lease read: the stored PDF is kept, nothing rendered
            rc(); var Q9 = officeQuoteSave(tS, BQ('CR14 lock', undefined)).no, S9 = 'https://x/cr14stored'; u0.call(db, 'Quotes', Q(Q9), { PDF: S9 }); e5.put('OQP:' + Q9, { v: 'stale', f: oQFid_(S9) });
            var nmk = 0; QF5_STUB_.make = function () { nmk++; return sm.apply(this, arguments); }; i0.call(db, 'Jobs', { JobNo: 'J/CR14/1', QuoteNo: Q9 });
            var m9; try { m9 = oQPdfMake_(EV, db, Q(Q9)); } catch (e) { m9 = { url: 'threw ' + e.message }; } finally { QF5_STUB_.make = sm; dj('J/CR14/1'); }
            eq('CR14-7 locked since the click: the stored PDF back, made false, no render, cell unchanged; a quote saved after a request-id save has no ReqID', [m9 && m9.url === S9, m9 && m9.made, nmk, String(Q(Q9).PDF) === S9, !e5.get('OQPB:' + Q9), blank(Q(Q9).ReqID)].join('|'), 'true|false|0|true|true|true');
            // (8) #8: the contract is made during the render: new files binned, the stored PDF kept and returned, the old one not binned
            var tt = 0; if (dv) dv.trash = function () { tt++; return dt0.apply(this, arguments); };
            QF5_STUB_.make = function () { nmk++; i0.call(db, 'Jobs', { JobNo: 'J/CR14/2', QuoteNo: Q9 }); var r = sm.apply(this, arguments); r.url = 'https://drive.google.com/file/d/CR14newfile' + nmk + 'abcdefgh/view'; return r; }; tr.length = 0;
            var m10; try { m10 = officeQuotePdf(tS, Q9); } catch (e) { m10 = { url: 'threw ' + e.message }; } finally { QF5_STUB_.make = sm; if (dv) dv.trash = dt0; dj('J/CR14/2'); }
            eq('CR14-8 locked during the render: stored PDF back, made false, one render, cell unchanged, nothing old binned, the new file binned', [m10.url === S9, m10.made, nmk, String(Q(Q9).PDF) === S9, tt, tr.some(function (x) { return /^CR14newfile\d+abcdefgh:true$/.test(x); }), !e5.get('OQPB:' + Q9)].join('|'), 'true|false|1|true|0|true|true');
            rc(); var Q11 = officeQuoteSave(tS, BQ('CR14 open', undefined)).no; u0.call(db, 'Quotes', Q(Q11), { PDF: '' }); var m11 = officeQuotePdf(tS, Q11);
            eq('CR14-8b an open quote: made and linked as before', [m11.made, String(Q(Q11).PDF) === m11.url && !!m11.url].join('|'), 'true|true');
            // (9) #2 #3: low on the raw yard; group presence from the raw balance
            db.insert('Items', [{ ItemCode: 'CR14-L1', Name: 'CR14 low', Unit: 'kg', StockTracked: 'Yes', IsSet: 'No', Status: 'Active', ReorderLevel: 1 }, { ItemCode: 'CR14-R1', Name: 'CR14 rep', Unit: 'kg', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: 'CR14-Y1', Name: 'CR14 yard', Unit: 'kg', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }]); mv('CR14-Y1', 0.004);
            mv('CR14-L1', 0.999); mv('CR14-R1', 2); mv('CR14-R1', 0.004, 'LOC-SUPPLIER', 'LOC-REPAIR');
            var L9 = officeStockList(tY), a9 = row(L9, 'CR14-L1'), b9 = row(L9, 'CR14-R1'), i9 = officeStockItem(tY, 'CR14-L1');
            eq('CR14-9 yard 0.999 (shown 1) vs reorder 1: low, list + item view (r13: not low); repair -0.004 (shown 0): present in Repair, absent in Lost',
              [a9.yard, a9.low, i9.low, b9.rep, b9.hz && b9.hz.rep, b9.hz && b9.hz.lost, b9.hz && b9.hz.yard, row(L9, 'CR14-Y1').yard, row(L9, 'CR14-Y1').hz.yard, b9.hz && b9.hz.site].join('|'), '1|true|true|0|true|false|true|0|true|false');
          } finally { back(); DriveApp = DA0; QF5_STUB_.make = sm; if (dv) dv.trash = dt0; }
        })();
