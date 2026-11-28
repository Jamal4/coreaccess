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
            // (1) #13: the quote went in, then its ValidityDays write failed: the retry completes it (r13: the unfinished quote came back as saved)
            var th = 0; uiPutRow_ = function (d, t, r, p) { if (t === 'Quotes' && p && 'ValidityDays' in p && !th++) throw new Error('write failed'); return up0.apply(this, arguments); };
            rc(); var n1 = nQ(), e1; try { e1 = err(function () { officeQuoteSave(tS, BQ('CR14 days', 'cr14riddays1', { valid: '2026-12-05' })); }); } finally { back(); }
            rc(); var s1 = officeQuoteSave(tS, BQ('CR14 days', 'cr14riddays1', { valid: '2026-12-05' })), q1 = Q(s1.no);
            eq('CR14-1 committed, ValidityDays write failed: version recorded; the retry completes that quote (15 days), says again, one quote, done marker without the version (r13: ValidityDays blank)', [e1 !== 'no error', th, s1.again, String(q1.ValidityDays), nQ() - n1, typeof s1.ev, /^cr14riddays1\.\d+:ok$/.test(String(q1.ReqID)), !!s1.part].join('|'), 'true|1|true|15|1|number|true|false');
            // (2) #9: the answer was lost and the cache let go: the id is in the quote row, so the retry still finds it (r13: a second quote)
            rc(); var n2 = nQ(), e2; lost(); try { e2 = err(function () { officeQuoteSave(tS, BQ('CR14 evict', 'cr14ridevict2')); }); } finally { back(); }
            e5.cdel('OQRID:sales4@t.com:cr14ridevict2'); rc(); var s2 = officeQuoteSave(tS, BQ('CR14 evict', 'cr14ridevict2'));
            eq('CR14-2 committed, answer lost before any version was recorded: the retry gets that quote as it is (part), one quote', [e2 !== 'no error', s2.again, nQ() - n2, String(Q(s2.no).Subject), String(Q(s2.no).ReqID).indexOf('cr14ridevict2.') === 0, /:ok$/.test(String(Q(s2.no).ReqID)), typeof s2.ev, s2.part, s2.changed].join('|'), 'true|true|1|CR14 evict|true|false|number|true|false');
            // (3) the retry carries what the user changed after the failure: that quote gets it (r13: the first data kept)
            rc(); var n3 = nQ(); lost(); try { err(function () { officeQuoteSave(tS, BQ('CR14 first', 'cr14ridedit03')); }); } finally { back(); }
            rc(); var s3 = officeQuoteSave(tS, BQ('CR14 second', 'cr14ridedit03'));
            eq('CR14-3 no version recorded, the retry with changed data: the same quote as it is (not overwritten), part, one quote', [s3.again, s3.changed, String(Q(s3.no).Subject), nQ() - n3, Q(s3.no).Status, s3.part].join('|'), 'true|false|CR14 first|1|Draft|true');
            rc(); var s3b = officeQuoteSave(tS, BQ('CR14 second', 'cr14ridedit03'));
            eq('CR14-3b the same retry again: nothing changed, again, same quote', [s3b.no === s3.no, s3b.again, s3b.changed, nQ() - n3].join('|'), 'true|true|false|1');
            // (4) the quote is no longer Draft (sent meanwhile) or has a contract: returned as it is, not edited
            u0.call(db, 'Quotes', Q(s3.no), { Status: 'Sent' }); rc(); var s4 = officeQuoteSave(tS, BQ('CR14 third', 'cr14ridedit03'));
            u0.call(db, 'Quotes', Q(s3.no), { Status: 'Draft' }); i0.call(db, 'Jobs', { JobNo: 'J/CR14/0', QuoteNo: s3.no }); rc(); var s4b = officeQuoteSave(tS, BQ('CR14 fourth', 'cr14ridedit03')); dj('J/CR14/0');
            eq('CR14-4 the retry finds it Sent / with a contract: that quote back unchanged (no edit), one quote', [s4.no === s3.no, s4.again, s4.changed, s4b.no === s3.no, s4b.again, String(Q(s3.no).Subject), nQ() - n3].join('|'), 'true|true|false|true|true|CR14 first|1');
            rc(); var n4c = nQ(); pfail(); try { err(function () { officeQuoteSave(tS, BQ('CR14 sent', 'cr14ridsent04')); }); } finally { back(); }
            var q4c = db.rows('Quotes').slice(-1)[0], no4c = String(q4c.QuoteNo); u0.call(db, 'Quotes', q4c, { Status: 'Sent' }); rc(); var s4c = officeQuoteSave(tS, BQ('CR14 sent changed', 'cr14ridsent04'));
            rc(); pfail(); try { err(function () { officeQuoteSave(tS, BQ('CR14 job', 'cr14ridjob004')); }); } finally { back(); }
            var q4d = db.rows('Quotes').slice(-1)[0], no4d = String(q4d.QuoteNo); i0.call(db, 'Jobs', { JobNo: 'J/CR14/3', QuoteNo: no4d }); rc(); var e4d = err(function () { s4d = officeQuoteSave(tS, BQ('CR14 job changed', 'cr14ridjob004')); }), s4d; dj('J/CR14/3');
            eq('CR14-4c unfinished (version recorded), then Sent / given a contract elsewhere: the retry returns it unchanged (not edited, not done-marked by an edit)',
              [/~\d+$/.test(String(q4c.ReqID)) && /~\d+$/.test(String(q4d.ReqID)), s4c.no === no4c, s4c.again, s4c.changed, String(Q(no4c).Subject), Q(no4c).Status, e4d, s4d && s4d.no === no4d, s4d && s4d.again, String(Q(no4d).Subject), nQ() - n4c].join('|'),
              'true|true|true|false|CR14 sent|Sent|no error|true|true|CR14 job|2');
            // (5) login scope; another id = another quote; an edit carrying an id = a normal edit; no ReqID column = saved as before
            rc(); var s5 = officeQuoteSave(tD, BQ('CR14 other login', 'cr14ridedit03')); rc(); var s5b = officeQuoteSave(tS, BQ('CR14 second', 'cr14ridother5'));
            eq('CR14-5 same id, another login: its own quote; another id: another quote', [s5.no !== s3.no, !s5.again, s5b.no !== s3.no, !s5b.again].join('|'), 'true|true|true|true');
            H0 = db.h && db.h.Quotes; var kq = H0 ? H0.indexOf('ReqID') : -1; if (kq >= 0) H0.splice(kq, 1);
            rc(); var n6 = nQ(), s6 = officeQuoteSave(tS, BQ('CR14 nocol', 'cr14ridnocol6')); rc(); var s7 = officeQuoteSave(tS, BQ('CR14 nocol', 'cr14ridnocol6'));
            if (kq >= 0) H0.splice(kq, 0, 'ReqID'); H0 = null;
            eq('CR14-5b no ReqID column: saved as before (two saves = two quotes), no error', [kq >= 0, s6.no !== s7.no, nQ() - n6, !!Q(s6.no).ReqID].join('|'), 'true|true|2|false');
            // (5c) done marker: a finished save, then a retry with other data -> returned, not edited; an unfinished one edited here first (other tab) -> the late retry does not overwrite it
            rc(); var n5c = nQ(), s8 = officeQuoteSave(tS, BQ('CR14 done', 'cr14riddone07')); rc(); var s9 = officeQuoteSave(tS, BQ('CR14 done changed', 'cr14riddone07'));
            eq('CR14-5c finished save: ReqID marked done; a late retry with other data gets it back unchanged', [/:ok$/.test(String(Q(s8.no).ReqID)), s9.no === s8.no, s9.again, s9.changed, String(Q(s8.no).Subject), nQ() - n5c].join('|'), 'true|true|true|false|CR14 done|1');
            rc(); lost(); try { err(function () { officeQuoteSave(tS, BQ('CR14 tab', 'cr14ridtab008')); }); } finally { back(); }
            var qt = db.rows('Quotes').slice(-1)[0], nt = String(qt.QuoteNo), evt = oQeEv_(db, qt); rc(); var st1 = officeQuoteSave(tS, Object.assign(BQ('CR14 tab edited'), { no: nt, ev: evt }));
            rc(); var st2 = officeQuoteSave(tS, BQ('CR14 tab', 'cr14ridtab008'));
            eq('CR14-5d unfinished, then edited in another tab: that edit marks it done; the late retry returns it, the edit kept', [st1.no === nt, /:ok$/.test(String(Q(nt).ReqID)), st2.no === nt, st2.again, String(Q(nt).Subject)].join('|'), 'true|true|true|true|CR14 tab edited');
            rc(); var s8e = officeQuoteSave(tS, Object.assign(BQ('CR14 done edited'), { no: s8.no, ev: oQeEv_(db, Q(s8.no)) })); rc(); var s8f = officeQuoteSave(tS, BQ('CR14 done', 'cr14riddone07'));
            eq('CR14-5e a done quote edited here, then a late retry: still that quote (marked once), the edit kept (2 = this one + the tab quote of 5d)', [s8e.changed, String(Q(s8.no).ReqID).split(':ok').length, s8f.no === s8.no, s8f.again, String(Q(s8.no).Subject), nQ() - n5c].join('|'), 'true|2|true|true|CR14 done edited|2');
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
            // (11) the last row write fails: the version goes into ReqID; the retry completes it only while the quote is still at that version
            var last = function () { return db.rows('Quotes').slice(-1)[0]; }, rid = function (x) { return String(x.ReqID); };
            rc(); var n11 = nQ(); pfail(); try { err(function () { officeQuoteSave(tS, BQ('CR14 v1', 'cr14ridver011')); }); } finally { back(); }
            var qa = last(), ka = rid(qa), eva = String(oQeEv_(db, qa)); rc(); var sa = officeQuoteSave(tS, BQ('CR14 v1 changed', 'cr14ridver011'));
            eq('CR14-11a version recorded (id~ev = the quote as it is); untouched -> the retry completes it with its data, done, one quote', [/^cr14ridver011\.\d+~\d+$/.test(ka), ka.split('~')[1] === eva, sa.no === String(qa.QuoteNo), sa.again, sa.changed, !!sa.part, String(Q(sa.no).Subject), /^cr14ridver011\.\d+:ok$/.test(rid(Q(sa.no))), nQ() - n11].join('|'), 'true|true|true|true|true|false|CR14 v1 changed|true|1');
            rc(); pfail(); try { err(function () { officeQuoteSave(tS, BQ('CR14 v2', 'cr14ridver012')); }); } finally { back(); }
            var qb = last(), kb = rid(qb), evb = oQeEv_(db, qb); u0.call(db, 'Quotes', qb, { Subject: 'CR14 panel edit' }); rc(); var sb = officeQuoteSave(tS, BQ('CR14 v2 changed', 'cr14ridver012'));
            eq('CR14-11b recorded version, then edited in the panel / sheet: the retry returns it as it is (part), the edit kept, still not done', [kb === String(qb.ReqID) && kb.split('~')[1] === String(evb), sb.no === String(qb.QuoteNo), sb.again, sb.changed, sb.part, String(Q(sb.no).Subject), /~\d+$/.test(rid(Q(sb.no)))].join('|'), 'true|true|true|false|true|CR14 panel edit|true');
            rc(); pfail(); try { err(function () { officeQuoteSave(tS, BQ('CR14 v3', 'cr14ridver013')); }); } finally { back(); }
            var qc = last(), lc = db.rows('QuoteLines').filter(function (l) { return String(l.QuoteNo) === String(qc.QuoteNo); })[0]; u0.call(db, 'QuoteLines', lc, { Qty: 7 }); rc(); var sc = officeQuoteSave(tS, BQ('CR14 v3 changed', 'cr14ridver013'));
            eq('CR14-11c recorded version, then only a line changed elsewhere: returned as it is, the line kept', [sc.again, sc.changed, sc.part, String(Q(sc.no).Subject), num(lc.Qty)].join('|'), 'true|false|true|CR14 v3|7');
            rc(); pfail('both'); try { err(function () { officeQuoteSave(tS, BQ('CR14 v4', 'cr14ridver014')); }); } finally { back(); }
            var qd = last(), kd = rid(qd); rc(); var sd = officeQuoteSave(tS, BQ('CR14 v4 changed', 'cr14ridver014'));
            eq('CR14-11d the version write fails too: no version -> the retry returns it as it is (part)', [/^cr14ridver014\.\d+$/.test(kd), sd.again, sd.changed, sd.part, String(Q(sd.no).Subject)].join('|'), 'true|true|false|true|CR14 v4');
            rc(); var n11e = nQ(); pfail('in'); try { err(function () { officeQuoteSave(tS, BQ('CR14 v5', 'cr14ridver015', { valid: '2026-12-05' })); }); } finally { back(); }
            var qe = last(), ke = rid(qe); rc(); var se = officeQuoteSave(tS, BQ('CR14 v5 changed', 'cr14ridver015', { valid: '2026-12-05' }));
            eq('CR14-11e the last write went in, then threw: the version replaces the done marker; the retry completes it, one quote', [/~\d+$/.test(ke), String(qe.ValidityDays), se.again, se.changed, !!se.part, String(Q(se.no).Subject), /:ok$/.test(rid(Q(se.no))), nQ() - n11e].join('|'), 'true|15|true|true|false|CR14 v5 changed|true|1');
            rc(); pfail(); try { err(function () { officeQuoteSave(tS, BQ('CR14 v6', 'cr14ridver016')); }); } finally { back(); }
            var qf = last(); rc(); pfail(); try { err(function () { officeQuoteSave(tS, BQ('CR14 v6 resumed', 'cr14ridver016')); }); } finally { back(); }
            var kf = rid(qf); rc(); var sf = officeQuoteSave(tS, BQ('CR14 v6 resumed', 'cr14ridver016'));
            eq('CR14-11f the resume fails at its last write too: its own version recorded; the next retry (same data) finishes it', [/~\d+$/.test(kf), String(qf.Subject), sf.again, !!sf.part, String(Q(sf.no).Subject), /^cr14ridver016\.\d+:ok$/.test(rid(Q(sf.no))), typeof sf.ev, sf.ev === oQeEv_(db, Q(sf.no))].join('|'), 'true|CR14 v6 resumed|true|false|CR14 v6 resumed|true|number|true');
            rc(); pfail(); try { err(function () { officeQuoteSave(tS, BQ('CR14 v7', 'cr14ridver017')); }); } finally { back(); }
            var qg = last(); rc(); var sg0 = officeQuoteSave(tS, Object.assign(BQ('CR14 v7 tab'), { no: String(qg.QuoteNo), ev: oQeEv_(db, qg) })); rc(); var sg = officeQuoteSave(tS, BQ('CR14 v7 late', 'cr14ridver017'));
            eq('CR14-11g recorded version, then edited here in another tab: done-marked (no version left); the late retry gets it as it is', [sg0.changed, /^cr14ridver017\.\d+:ok$/.test(rid(qg)), sg.again, !!sg.part, String(Q(sg.no).Subject)].join('|'), 'true|true|true|false|CR14 v7 tab');
            var vf = function () { var n = 0; uiPutRow_ = function (d, t, r, p) { if (t === 'Quotes' && p && 'ValidityDays' in p && !n++) throw new Error('write failed'); return up0.apply(this, arguments); }; };
            var qh = Q(sg.no), kh = rid(qh); rc(); vf(); var eh; try { eh = err(function () { officeQuoteSave(tS, Object.assign(BQ('CR14 v7 tab', undefined, { valid: '2026-12-09' }), { no: String(qh.QuoteNo), ev: oQeEv_(db, qh) })); }); } finally { back(); }
            var qh2 = Q(s6.no), kh2 = rid(qh2); rc(); vf(); var eh2; try { eh2 = err(function () { officeQuoteSave(tS, Object.assign(BQ('CR14 nocol', undefined, { valid: '2026-12-09' }), { no: String(qh2.QuoteNo), ev: oQeEv_(db, qh2) })); }); } finally { back(); }
            eq('CR14-11h an ordinary edit whose last write fails: no version written (a done quote keeps its marker, a quote without an id stays without)', [eh !== 'no error', rid(Q(sg.no)) === kh, eh2 !== 'no error', rid(Q(s6.no)) === kh2, blank(Q(s6.no).ReqID)].join('|'), 'true|true|true|true|true');
            // (10) the request-id insert wrapper comes off again, also after a throw (a SheetDb's insert is a prototype method; the db stubs above set an own one)
            var md = new MemDb({ Quotes: { h: ['QuoteNo', 'ReqID'] } }), th = false, f0 = function (t, o) { return MemDb.prototype.insert.apply(this, arguments); };
            oQeIns_(md, 'R1.x', function () { md.insert('Quotes', { QuoteNo: 'A' }); });
            try { oQeIns_(md, 'R2.x', function () { md.insert('Quotes', { QuoteNo: 'B' }); throw new Error('x'); }); } catch (e) { th = true; }
            md.insert('Quotes', { QuoteNo: 'C' });
            var md2 = new MemDb({ Quotes: { h: ['QuoteNo', 'ReqID'] } }); md2.insert = f0; oQeIns_(md2, 'R3.x', function () { md2.insert('Quotes', { QuoteNo: 'D' }); }); md2.insert('Quotes', { QuoteNo: 'E' });
            eq('CR14-10 insert wrapper removed (prototype insert: no own property left; own insert: put back), also after a throw; later rows unstamped',
              [Object.prototype.hasOwnProperty.call(md, 'insert'), md.insert === MemDb.prototype.insert, th, md.t.Quotes.map(function (r) { return r.ReqID; }).join(','), md2.insert === f0, md2.t.Quotes.map(function (r) { return r.ReqID; }).join(',')].join('|'), 'false|true|true|R1.x,R2.x,|true|R3.x,');
          } finally { back(); DriveApp = DA0; QF5_STUB_.make = sm; if (dv) dv.trash = dt0; }
        })();
