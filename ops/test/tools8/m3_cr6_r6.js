        // ---- M3 CR run 6 (harness only): parts stay tracked; quote save counted before the pending-revision record; office PDF link under the document lock
        (function () {
          var J = JSON.stringify, rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IT = function (c) { return must(db, 'Items', 'ItemCode', c); }, IS = function (t, d) { rc(); return officeItemSave(t, d); };
          var NI = function (o) { return Object.assign({ code: 'CR6-P1', name: 'CR6 part', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 1, reorder: 0, status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          // ---- (2) a part of a set stays stock-tracked
          IS(tY, NI()); IS(tY, NI({ code: 'CR6-P2' })); IS(tY, NI({ code: 'CR6-P4' }));
          db.insert('Items', { ItemCode: 'CR6-SET', Name: 'CR6 set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' });
          db.insert('KitParts', [{ KitPartID: 'KP-C6A', SetCode: 'CR6-SET', ItemCode: 'CR6-P1', QtyPerSet: 2 }, { KitPartID: 'KP-C6X', SetCode: 'CR6-SETX', ItemCode: ' cr6-p4 ', QtyPerSet: 2 }, { KitPartID: 'KP-C6B', SetCode: 'CR6-SET', ItemCode: 'CR6-P3', QtyPerSet: 1 }]);
          var l1 = db.rows('Log').length, a1 = err(function () { IS(tY, ED(tY, 'CR6-P1', { tracked: 'No' })); }), a1b = err(function () { IS(tY, ED(tY, 'CR6-P4', { tracked: 'No' })); }), b1 = IS(tY, ED(tY, 'CR6-P2', { tracked: 'No' }));
          eq('CR6-1 a part of a set (no stock, code trimmed / any case) can\'t stop being tracked: refused, nothing written; an item that is no part can', [a1, IT('CR6-P1').StockTracked, a1b, IT('CR6-P4').StockTracked, db.rows('Log').length - l1, b1.code, IT('CR6-P2').StockTracked].join('|'), 'BADINPUT|part tracked|Yes|BADINPUT|part tracked|Yes|1|CR6-P2|No');
          var c1 = err(function () { IS(tY, NI({ code: 'CR6-P3', tracked: 'No' })); }), d1 = IS(tY, NI({ code: 'CR6-P3', tracked: 'Yes' }));
          eq('CR6-2 a new item already listed as a part: refused untracked, added tracked; the set it is in is then valid', [c1, d1.code, !!officeStockItem(tY, 'CR6-SET').kitBad, err(function () { kitParts_(db, 'CR6-SET'); })].join('|'), 'BADINPUT|part tracked|CR6-P3|false|no error');
          db.update('Items', IT('CR6-P2'), { StockTracked: 'No' }); db.insert('KitParts', { KitPartID: 'KP-C6C', SetCode: 'CR6-SET', ItemCode: 'CR6-P2', QtyPerSet: 1 });
          var e3 = IS(tY, ED(tY, 'CR6-P2', { name: 'CR6 legacy untracked part' }));
          eq('CR6-3 a part that is already untracked (old sheet data): other edits still save (no switch-off happens); the set shows the problem', [e3.code, IT('CR6-P2').Name, !!officeStockItem(tY, 'CR6-SET').kitBad].join('|'), 'CR6-P2|CR6 legacy untracked part|true');
          // ---- (4) officeQuoteSave: the change counter is written before the pending-revision record
          var Q = officeQuoteSave(tS, (rc(), base({ subject: 'CR6 rev', lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] }))).no;
          db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q), { Status: 'Sent' }); var rv = num(must(db, 'Quotes', 'QuoteNo', Q).Rev), p0 = e5.put, ord = [];
          e5.put = function (k) { if (k === 'OPE' || /^OQRV:/.test(k)) ord.push(k.split(':')[0]); if (k === 'OPE' && ord.filter(function (x) { return x === 'OPE'; }).length === 1) throw new Error('Properties down'); return p0.apply(e5, arguments); };
          var X4; try { rc(); var F4 = officeQuoteForm(tS, Q).quote; X4 = err(function () { officeQuoteSave(tS, base({ no: Q, ev: F4.ev, subject: 'CR6 rev', lines: [{ code: 'RL-STD-20', desc: 'std', qty: 3, unit: 'pc / month', rate: 50 }] })); }); } finally { e5.put = p0; }
          var q4 = must(db, 'Quotes', 'QuoteNo', Q);
          eq('CR6-4 the counter write fails: the save stops before the pending-revision record (none left), the quote untouched (Sent, same Rev)', [/Properties down/.test(X4), ord.join(','), e5.get('OQRV:' + Q) == null, q4.Status, num(q4.Rev) === rv].join('|'), 'true|OPE|true|Sent|true');
          rc(); var F5 = officeQuoteForm(tS, Q).quote, S5 = officeQuoteSave(tS, base({ no: Q, ev: F5.ev, subject: 'CR6 rev', lines: [{ code: 'RL-STD-20', desc: 'std', qty: 3, unit: 'pc / month', rate: 50 }] })), q5 = must(db, 'Quotes', 'QuoteNo', Q);
          eq('CR6-5 the retry: one revision (Rev +1, Draft), not two; record gone', [q5.Status, num(q5.Rev) - rv, e5.get('OQRV:' + Q) == null, S5.no === Q].join('|'), 'Draft|1|true|true');
          // ---- (7) the office quote PDF: made without a link, the link written holding the document lock (no script lock meanwhile)
          var lk = [], busy = false, fk = { getScriptLock: function () { return { waitLock: function () { lk.push('s+'); }, releaseLock: function () { lk.push('s-'); } }; },
            getDocumentLock: function () { return { waitLock: function () { if (busy) throw new Error('Lock timeout'); lk.push('d+'); }, releaseLock: function () { lk.push('d-'); } }; } };
          var ls0 = OLK_.ls, LS0 = LockService, q5k = QF5_STUB_, nl = [], u0 = db.update, nU = 0;
          db.update = function (t, r, p) { if (t === 'Quotes' && p && 'PDF' in p) lk.push('W'); return u0.apply(db, arguments); };
          QF5_STUB_ = { drive: { name: function () { return 'old.pdf'; }, trash: function () {} }, make: function (d, w, n, o) { nl.push(!!(o && o.noLink)); var u = 'https://drive.google.com/file/d/CR6off' + (++nU) + 'abcdefghijklmnop/view'; var r = find(d.rows('Quotes'), 'QuoteNo', n); if (r && !(o && o.noLink)) d.update('Quotes', r, { PDF: u }); return { url: u, file: n + '.pdf', placeholders: 0 }; } };
          var U6, s6, X7, c7, k7;
          try {
            OLK_.ls = fk; LockService = fk; rc(); db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q), { PDF: '' }); lk.splice(0);
            U6 = officeQuotePdf(tS, Q); s6 = lk.join(' ');
            var dI = s6.lastIndexOf('d+'), dO = s6.indexOf('d-', dI), mid6 = s6.slice(dI, dO);
            eq('CR6-6 office quote PDF: made with noLink; its link written between d+ and d- (document lock), no script lock taken while it is held; the cell = the returned link',
              [nl.join(','), /^d\+ W$/.test(mid6.trim()), mid6.indexOf('s+') < 0, String(must(db, 'Quotes', 'QuoteNo', Q).PDF) === U6.url, U6.made].join('|'), 'true|true|true|true|true');
            busy = true; c7 = String(must(db, 'Quotes', 'QuoteNo', Q).PDF); e5.del('OQP:' + Q); db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q), { Rev: num(q5.Rev) }); oPeBump_(e5, [Q]); oQPdfStale_(e5, db, Q, true);
            rc(); X7 = err(function () { officeQuotePdf(tS, Q); }); k7 = e5.get('OQPB:' + Q);
          } finally { OLK_.ls = ls0; LockService = LS0; QF5_STUB_ = q5k; db.update = u0; busy = false; }
          eq('CR6-7 the document lock busy (a panel PDF of 30 s+): BUSY, the cell untouched, the make lease let go', [X7, String(must(db, 'Quotes', 'QuoteNo', Q).PDF) === c7, k7 == null].join('|'), 'BUSY|true|true');
          eq('CR6-8 oPdfLinkSet_ with no lock service (harness / panel already holding it) just writes; a missing row or a tab without PDF writes nothing', (function () {
            var r = must(db, 'Quotes', 'QuoteNo', Q); oPdfLinkSet_(db, 'Quotes', 'QuoteNo', Q, 'https://x/c6'); var a = String(must(db, 'Quotes', 'QuoteNo', Q).PDF);
            var n0 = db.rows('Quotes').length; oPdfLinkSet_(db, 'Quotes', 'QuoteNo', 'NOPE', 'https://x/no'); oPdfLinkSet_(db, 'Log', 'Ref', Q, 'https://x/log');
            return [a, db.rows('Quotes').length === n0, db.rows('Log').every(function (l) { return l.PDF == null || l.PDF === ''; })].join('|'); })(), 'https://x/c6|true|true');
          eq('CR6-9 the link write fails: the error reaches the caller and the document lock is still let go', (function () {
            var lk2 = [], fk2 = { getDocumentLock: function () { return { waitLock: function () { lk2.push('d+'); }, releaseLock: function () { lk2.push('d-'); } }; }, getScriptLock: fk.getScriptLock };
            var ls1 = OLK_.ls, LS1 = LockService, u1 = db.update, e9;
            try { OLK_.ls = fk2; LockService = fk2; db.update = function (t, r, p) { if (t === 'Quotes' && p && 'PDF' in p) throw new Error('Sheets down'); return u1.apply(db, arguments); };
              e9 = err(function () { oPdfLinkSet_(db, 'Quotes', 'QuoteNo', Q, 'https://x/c69'); }); } finally { OLK_.ls = ls1; LockService = LS1; db.update = u1; }
            return [e9, lk2.join(' ')].join('|'); })(), 'Sheets down|d+ d-');
          eq('CR6-10 the office make keeps the QF5 drive: the old PDF of the same quote goes to the bin (name check + trash through the given drive)', (function () {
            var tr = [], q5 = QF5_STUB_, old = 'https://drive.google.com/file/d/CR6OLDabcdefghijklmnopq/view', nm = fileName_(Q) + ' Old.pdf', n10 = 0;
            QF5_STUB_ = { drive: { name: function (u) { return u === old ? nm : ''; }, trash: function (u) { tr.push(u); } }, make: function (d, w, n, o) { return { url: 'https://drive.google.com/file/d/CR6new' + (++n10) + 'abcdefghijklmnop/view', file: n + '.pdf', placeholders: 0 }; } };
            try { db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q), { PDF: old }); e5.del('OQP:' + Q); oPeBump_(e5, [Q]); oQPdfStale_(e5, db, Q, true); rc(); var u = officeQuotePdf(tS, Q); return [tr.join(','), String(must(db, 'Quotes', 'QuoteNo', Q).PDF) === u.url, u.made].join('|'); } finally { QF5_STUB_ = q5; } })(), 'https://drive.google.com/file/d/CR6OLDabcdefghijklmnopq/view|true|true');
        })();
