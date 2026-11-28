        // ---- M3 CR run 7 (harness only): no document lock in a web app; office link write + panel after-check under the script lock
        (function () {
          var rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IT = function (c) { return must(db, 'Items', 'ItemCode', c); }, IS = function (t, d) { rc(); return officeItemSave(t, d); };
          var NI = function (o) { return Object.assign({ code: 'CR7-IT-1', name: 'CR7 item', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 4, reorder: 0, status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          var PD = function (n) { return String(must(db, 'Challans', 'ChallanNo', n).PDF || ''); }, QP = function (n) { return String(must(db, 'Quotes', 'QuoteNo', n).PDF || ''); };
          var lg = function (ref) { return db.rows('Log').filter(function (r) { return r.Action === 'PDF out of date' && r.Ref === ref; }); };
          // a lock fake with mutual exclusion: a waitLock while that lock is held = another execution holds it (this one never waits on its own)
          var lk = [], sC = 0, dC = 0, both = 0, sBusy = false;
          var fk = { getScriptLock: function () { return { waitLock: function () { if (sBusy || sC) throw new Error('Lock timeout'); if (dC) both++; sC++; lk.push('s+'); }, releaseLock: function () { sC--; lk.push('s-'); } }; },
            getDocumentLock: function () { return { waitLock: function () { if (dC) throw new Error('Lock timeout'); if (sC) both++; dC++; lk.push('d+'); }, releaseLock: function () { dC--; lk.push('d-'); } }; } };
          var ls0 = OLK_.ls, LS0 = LockService, fl0 = SpreadsheetApp.flush, uR0 = uiRun_, q5k = QF5_STUB_, mk0 = OPE_makePdf0_, u0 = db.update, nw0 = oPdfNow_;
          var nU = 0, mid = null, after = null, later = null;
          var on = function () { OLK_.ls = fk; LockService = fk; SpreadsheetApp.flush = function () { lk.push('F'); }; lk.splice(0); };
          var off = function () { OLK_.ls = ls0; LockService = LS0; SpreadsheetApp.flush = fl0; };
          db.update = function (t, r, p) { if ((t === 'Challans' || t === 'Quotes') && p && 'PDF' in p) lk.push(p.PDF === '' ? 'C' : 'W'); return u0.apply(db, arguments); };
          uiRun_ = function (fn) { return uiClean_(withLock(function () { var r = fn(db); if (later) { var x = later; later = null; x(); } return r; })); };
          QF5_STUB_ = { drive: { name: function () { return 'old.pdf'; }, trash: function () {} } };
          OPE_makePdf0_ = function (d, what, no, o) { var u = 'https://drive.google.com/file/d/CR7pdf' + (++nU) + 'abcdefghijklmnop/view', t = { Challan: ['Challans', 'ChallanNo'], Quote: ['Quotes', 'QuoteNo'] }[what];
            if (mid) { var f = mid; mid = null; f(); } var r = find(d.rows(t[0]), t[1], no); if (r && !(o && o.noLink)) d.update(t[0], r, { PDF: u }); if (after) { var a = after; after = null; a(u); } return { url: u, file: no + '.pdf', placeholders: 0 }; };
          IS(tY, NI()); var nm = 0, edit = function () { IS(tY, ED(tY, 'CR7-IT-1', { name: 'CR7 renamed ' + (++nm) })); };
          db.insert('Challans', [{ ChallanNo: 'DC-C7A', Kind: 'Delivery', Status: 'Draft', PDF: '' }]); db.insert('ChallanLines', [{ LineID: 'CL-C7A', ChallanNo: 'DC-C7A', ItemCode: 'CR7-IT-1', Qty: 1 }]);
          var PDF = function () { return uiDo('pdf', { what: 'Challan', no: 'DC-C7A' }); };
          try {
            // (1) the harness itself: during a web-API call the document lock is null (as a deployed web app), the script lock is there
            var Q = officeQuoteSave(tS, (rc(), base({ subject: 'CR7 web', lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] }))).no, seen = [];
            QF5_STUB_ = { drive: QF5_STUB_.drive, make: function (d, w, n, o) { seen.push([LockService.getDocumentLock() === null, oLs_().getDocumentLock() === null, !!oLs_().getScriptLock()].join(',')); return { url: 'https://drive.google.com/file/d/CR7web' + (++nU) + 'abcdefghijklmnop/view', file: n + '.pdf', placeholders: 0 }; } };
            db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q), { PDF: '' }); rc(); var W1 = officeQuotePdf(tS, Q);
            eq('CR7-1 web call (harness lock stub, document lock null as deployed): the office quote PDF gets its link; the stub gave null for the document lock inside the call, not after',
              [seen.join(';'), QP(Q) === W1.url, W1.made, LockService.getDocumentLock() !== null].join('|'), 'true,true,true|true|true|true');
            on(); db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q), { PDF: '' }); seen.splice(0); rc(); var W2 = officeQuotePdf(tS, Q), s2 = lk.join(' '); off();
            eq('CR7-2 web call with a test fake: the fake\'s document lock is null inside too; the link written under the script lock only, flushed before it is let go',
              [seen.join(';'), / s\+ W F s- /.test(' ' + s2 + ' '), s2.indexOf('d+') < 0, QP(Q) === W2.url, both].join('|'), 'true,true,true|true|true|true|0');
            QF5_STUB_ = { drive: QF5_STUB_.drive };
            // (2) oScrLock_: held already -> no second lock; a failure lets it go (flushed); busy -> BUSY, nothing run
            on(); OLK_.s++; var n3 = 0; try { oScrLock_(function () { n3++; }); } finally { OLK_.s--; } var a3 = lk.splice(0).join(' ');
            var e3 = err(function () { oScrLock_(function () { lk.push('x'); throw new Error('write failed'); }); }), b3 = lk.splice(0).join(' ');
            sBusy = true; var r3 = 0, c3 = err(function () { oScrLock_(function () { r3++; }); }); sBusy = false; off();
            eq('CR7-3 oScrLock_: nested -> runs, no lock; a failed write -> error out, flushed, let go; busy 30 s -> BUSY, not run; nothing held', [n3, a3, e3, b3, c3, r3, OLK_.s, sC].join('|'), '1||write failed|s+ x F s-|BUSY|0|0|0');
            // (3) panel PDF, office change during the make: count under s (before d), check after d- under s: compare + clear inside it; never both locks
            on(); mid = edit; var P3 = PDF(), s4 = lk.join(' '), cI = s4.lastIndexOf('s+'); off();
            eq('CR7-4 panel PDF changed meanwhile: count s+..s- before d+; link written inside d+..d-; the check\'s clear inside a later s+..s- after d-; never both locks; warned after the check; logged',
              [/^s\+ s- d\+ .*W.* d- /.test(s4), cI > s4.indexOf('d-'), /^s\+ F C F s-$/.test(s4.slice(cI)), both, PD('DC-C7A'), !!P3.warn, /DC-C7A was changed in the office app/.test(P3.msg), lg('DC-C7A').length, String(OPE_RUN_)].join('|'), 'true|true|true|0||true|true|1|null');
            // (4) no change: the check takes no lock at all, the link stays, no warning
            on(); var P4 = PDF(), s5 = lk.join(' '); off();
            eq('CR7-5 panel PDF, no change: no lock after the document lock is let go; link kept; no warning', [s5.slice(s5.indexOf('d-')).indexOf('s+') < 0, /CR7pdf\d+/.test(PD('DC-C7A')), !!P4.warn].join('|'), 'true|true|false');
            // (5) race: an office link write tried while the panel's check holds the script lock (between its compare and its clear) can't get in
            var raced = null; oPdfNow_ = function (d, t, r) { var v = nw0.apply(this, arguments); if (raced === null && sC && t === 'Challans') { var k = OLK_.s; OLK_.s = 0; try { raced = err(function () { oPdfLinkSet_(db, 'Challans', 'ChallanNo', 'DC-C7A', 'https://x/office-new'); }); } finally { OLK_.s = k; } } return v; };
            on(); mid = edit; var P5 = PDF(), c5 = PD('DC-C7A'); oPdfNow_ = nw0; oPdfLinkSet_(db, 'Challans', 'ChallanNo', 'DC-C7A', 'https://x/office-new'); off();
            eq('CR7-6 race: an office link write during the panel\'s compare-and-clear waits for the script lock (BUSY here), the panel clears its own link; the office write after it stays',
              [raced, c5, !!P5.warn, PD('DC-C7A'), both].join('|'), 'BUSY||true|https://x/office-new|0');
            // (6) the check's script lock busy for 30 s (another execution): checked without it -- clears only this run's own link, a newer link stays
            on(); mid = edit; after = function () { sBusy = true; }; var l6 = lg('DC-C7A').length, P6 = PDF(); sBusy = false; var c6 = PD('DC-C7A'), x6 = lg('DC-C7A').slice(l6).filter(function (l) { return /while this PDF was made/.test(l.Details); }).length;
            mid = edit; after = function () { sBusy = true; u0.call(db, 'Challans', must(db, 'Challans', 'ChallanNo', 'DC-C7A'), { PDF: 'https://x/office-newer' }); }; var P7 = PDF(); sBusy = false; off();
            eq('CR7-7 the check\'s script lock busy: own link still cleared + warned; a newer office link in the cell kept (warned, logged with a note); nothing held',
              [c6, !!P6.warn, x6, PD('DC-C7A'), !!P7.warn, /another link/.test((lg('DC-C7A').slice(-1)[0] || {}).Details || ''), sC, dC, OLK_.s].join('|'), '|true|1|https://x/office-newer|true|true|0|0|0');
            // (7) the run fails after its link was written: the link is checked too, the run's own error is reported; a failing check doesn't hide it
            on(); mid = edit; later = function () { throw new Error('Later step failed'); }; var e8 = err(PDF), c8 = PD('DC-C7A');
            mid = edit; later = function () { throw new Error('Later step failed 2'); }; var ck = 0; db.update = function (t, r, p) { if (t === 'Challans' && p && p.PDF === '' && sC) { ck++; throw new Error('Sheets down'); } return u0.apply(db, arguments); };
            var e9 = err(PDF); db.update = u0; off();
            eq('CR7-8 run fails after the link: own link cleared, the run\'s error reported; the check failing too -> still the run\'s own error; nothing held',
              [e8, c8, e9, ck, String(OPE_RUN_), sC, dC].join('|'), 'Later step failed||Later step failed 2|2|null|0|0');
            // (8) the check's clear fails twice on the success path: the panel gets the plain old-data error (not a silent stale link)
            on(); mid = edit; db.update = function (t, r, p) { if (t === 'Challans' && p && p.PDF === '' && sC) throw new Error('Sheets down'); return u0.apply(db, arguments); };
            var e10 = err(PDF); db.update = u0; off();
            eq('CR7-9 the clear fails twice: plain error says the PDF is from old data; script lock let go', [/^PDF made from old data — make it again\. DC-C7A was changed/.test(e10), sC, OLK_.s].join('|'), 'true|0|0');
            eq('CR7-10 the web-app paths name no document lock: oPdfLinkSet_, oScrLock_, oPeCheck_, oPeFix_, oPeN_, env.lock', [oPdfLinkSet_, oScrLock_, oPeCheck_, oPeFix_, oPeN_, officeEnv_].map(function (f) { return /getDocumentLock/.test(String(f.officeRaw_ || f)); }).join(','), 'false,false,false,false,false,false');
          } finally { off(); uiRun_ = uR0; QF5_STUB_ = q5k; OPE_makePdf0_ = mk0; db.update = u0; oPdfNow_ = nw0; OPE_RUN_ = null; mid = null; after = null; later = null; sBusy = false; }
        })();
