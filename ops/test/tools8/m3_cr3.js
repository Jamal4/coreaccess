        // ---- M3 CR run 3 (harness only): flush before unlock, panel count under the lock, every open doc cleared, set parts, fix retry, catalogue rows
        (function () {
          var J = JSON.stringify, rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var IT = function (c) { return must(db, 'Items', 'ItemCode', c); }, IS = function (t, d) { rc(); return officeItemSave(t, d); };
          var NI = function (o) { return Object.assign({ code: 'CR3-IT-1', name: 'CR3 item', cat: 'Ringlock', size: '1 m', unit: 'pc', kg: 4, reorder: 0, status: 'Active', tracked: 'Yes', isSet: 'No', forHire: 'Yes', forSale: 'No' }, o || {}); };
          var ED = function (t, c, o) { var g = officeStockItem(t, c); return Object.assign({ code: c, ev: g.ev, name: g.name, cat: g.cat, size: g.size, unit: g.unit, kg: g.kg == null ? '' : g.kg, reorder: g.reorder || '', status: g.status, tracked: g.tracked ? 'Yes' : 'No', isSet: g.isSet ? 'Yes' : 'No', forHire: g.forHire ? 'Yes' : 'No', forSale: g.forSale ? 'Yes' : 'No' }, o || {}); };
          var PD = function (t, n) { return String(must(db, t, { Challans: 'ChallanNo', Invoices: 'InvNo', Notes: 'NoteNo', Quotes: 'QuoteNo' }[t], n).PDF || ''); };
          var lg = function (ref) { return db.rows('Log').filter(function (r) { return r.Action === 'PDF out of date' && r.Ref === ref; }); };
          // ---- (2) env.lock / panel withLock flush before the script lock is let go
          var lk = [], held = 0, onWait = null, busy = false;
          var fk = { getScriptLock: function () { return { waitLock: function () { if (busy) throw new Error('Lock timeout'); if (onWait) { var f = onWait; onWait = null; f(); } held++; lk.push('s+'); }, releaseLock: function () { held--; lk.push('s-'); } }; },
            getDocumentLock: function () { return { waitLock: function () { lk.push('d+'); }, releaseLock: function () { lk.push('d-'); } }; } };
          var ls0 = OLK_.ls, LS0 = LockService, fl0 = SpreadsheetApp.flush, fl = function () { lk.push('F'); };
          var r1, e1, e2, s1, s2, s3, s4;
          try {
            OLK_.ls = fk; LockService = fk; SpreadsheetApp.flush = fl;
            r1 = officeEnv_().lock(function () { lk.push('w'); return 7; }); s1 = lk.splice(0).join(' ');
            e1 = err(function () { officeEnv_().lock(function () { lk.push('x'); throw new Error('write failed'); }); }); s2 = lk.splice(0).join(' ');
            SpreadsheetApp.flush = function () { lk.push('F!'); throw new Error('flush failed'); };
            e2 = err(function () { officeEnv_().lock(function () { lk.push('y'); }); }); s3 = lk.splice(0).join(' '); SpreadsheetApp.flush = fl;
            withLock(function () { lk.push('p'); }); s4 = lk.splice(0).join(' ');
          } finally { OLK_.ls = ls0; LockService = LS0; SpreadsheetApp.flush = fl0; }
          eq('CR3-1 env.lock flushes after the write, before the lock is let go; on a failed write too; a failed flush still lets the lock go and is reported', [r1, s1, e1, s2, e2, s3, OLK_.s].join('|'), '7|s+ w F s-|write failed|s+ x F s-|flush failed|s+ y F! s-|0');
          eq('CR3-2 a panel locked write: script lock, document lock, write, document lock off, flush, script lock off', s4, 's+ d+ p d- F s-');
          // ---- (3) panel PDF: count read under the script lock, before the document lock
          var uR0 = uiRun_, q5k = QF5_STUB_, mk0 = OPE_makePdf0_, g0 = e5.get, mid = null, nU = 0, made = 0;
          var T = { Challan: ['Challans', 'ChallanNo'], Invoice: ['Invoices', 'InvNo'], Note: ['Notes', 'NoteNo'], Quote: ['Quotes', 'QuoteNo'] };
          uiRun_ = function (fn) { return uiClean_(withLock(function () { return fn(db); })); };
          QF5_STUB_ = { drive: { name: function () { return 'old.pdf'; }, trash: function () {} } };
          OPE_makePdf0_ = function (d, what, no, o) { made++; var u = 'https://drive.google.com/file/d/CR3pdf' + (++nU) + 'abcdefghijklmnop/view', t = T[what]; if (mid) mid();
            var r = find(d.rows(t[0]), t[1], no); if (r && !(o && o.noLink)) d.update(t[0], r, { PDF: u }); return { url: u, file: no + '.pdf', placeholders: 0 }; };
          IS(tY, NI()); var nm = 0, edit = function (c) { return function () { IS(tY, ED(tY, c || 'CR3-IT-1', { name: 'CR3 renamed ' + (++nm) })); }; };
          db.insert('Challans', [{ ChallanNo: 'DC-C3A', Kind: 'Delivery', Status: 'Draft', PDF: '' }, { ChallanNo: 'DC-C3B', Kind: 'Delivery', Status: 'Draft', PDF: 'https://x/c3b' }, { ChallanNo: 'DC-C3P', Kind: 'Delivery', Status: 'Posted', PDF: 'https://x/c3p' }]);
          db.insert('ChallanLines', [{ LineID: 'CL-C3A', ChallanNo: 'DC-C3A', ItemCode: 'CR3-IT-1', Qty: 1 }, { LineID: 'CL-C3B', ChallanNo: 'DC-C3B', ItemCode: 'CR3-IT-1', Qty: 1 }, { LineID: 'CL-C3P', ChallanNo: 'DC-C3P', ItemCode: 'CR3-IT-1', Qty: 1 }]);
          var P1, P2, P3, s5, s6, X3, mk3;
          try {
            OLK_.ls = fk; LockService = fk; SpreadsheetApp.flush = fl;
            e5.get = function (k) { if (k === 'OPE') lk.push('R' + held); return g0.apply(e5, arguments); };
            P1 = uiDo('pdf', { what: 'Challan', no: 'DC-C3A' }); s5 = lk.splice(0).join(' ');
            onWait = edit(); P2 = uiDo('pdf', { what: 'Challan', no: 'DC-C3A' }); s6 = lk.splice(0).join(' ');
            busy = true; mk3 = made; var lk3 = PD('Challans', 'DC-C3A'); X3 = err(function () { uiDo('pdf', { what: 'Challan', no: 'DC-C3A' }); }); busy = false; lk.splice(0);
            P3 = [made - mk3, PD('Challans', 'DC-C3A') === lk3, String(OPE_RUN_)].join('|');
          } finally { OLK_.ls = ls0; LockService = LS0; SpreadsheetApp.flush = fl0; e5.get = g0; onWait = null; busy = false; }
          eq('CR3-3 panel PDF: the change count is read holding the script lock, let go before the document lock (no lock-order deadlock); the link is written after the document lock is let go, under a later script lock (CR run 9)',
            [/^s\+ R1 s- d\+ d- s\+ R1 F s-$/.test(s5), s5.indexOf('R1') !== s5.lastIndexOf('R1'), /CR3pdf\d+/.test(PD('Challans', 'DC-C3A')), !!P1.warn].join('|'), 'true|true|true|false');
          eq('CR3-4 an office edit that held the lock finishes before the count is read: it is wholly before -> the PDF is made from the new data and kept (no false warning)',
            [/^(R0 )+s\+ R1 s- d\+/.test(s6), !!P2.warn, /CR3pdf\d+/.test(PD('Challans', 'DC-C3A')), IT('CR3-IT-1').Name].join('|'), 'true|false|true|CR3 renamed 1');
          eq('CR3-5 script lock busy: clear message, no PDF made, link untouched, nothing held', [/busy saving a change/.test(X3), P3].join('|'), 'true|0|true|null');
          // ---- (11) CR run 9: the link write after the run failing: a plain error (the PDF was made, its link not saved); the next try links it
          var u0 = db.update, armed = 0, nf = 0, want = 0, F1, X2, arm = function () { nf = 0; armed = want; };
          db.update = function (t, r, p) { if (armed && t === 'Challans' && p && p.PDF && nf < armed) { nf++; throw new Error('Service Spreadsheets timed out'); } return u0.apply(db, arguments); };
          var mk1 = OPE_makePdf0_; OPE_makePdf0_ = function () { var r = mk1.apply(this, arguments); arm(); return r; };
          try {
            var c6 = PD('Challans', 'DC-C3A'); want = 1; X2 = err(function () { uiDo('pdf', { what: 'Challan', no: 'DC-C3A' }); });
            eq('CR3-6 the link write after the run fails: a plain error (PDF made, link not saved, make it again); the cell untouched; nothing held', [/^The PDF was made, but its link could not be saved \(Service Spreadsheets timed out\)\. Make the PDF again\.$/.test(X2), PD('Challans', 'DC-C3A') === c6, nf, String(OPE_RUN_)].join('|'), 'true|true|1|null');
            want = 0; F1 = uiDo('pdf', { what: 'Challan', no: 'DC-C3A' });
            eq('CR3-7 the next try links it', [/CR3pdf\d+/.test(PD('Challans', 'DC-C3A')) && PD('Challans', 'DC-C3A') !== c6, !!F1.warn].join('|'), 'true|false');
          } finally { db.update = u0; OPE_makePdf0_ = mk1; mid = null; armed = 0; }
          // ---- (5) every open document is cleared; only real links logged / counted
          db.update('Challans', must(db, 'Challans', 'ChallanNo', 'DC-C3A'), { PDF: '' }); db.update('Challans', must(db, 'Challans', 'ChallanNo', 'DC-C3B'), { PDF: 'https://x/c3b' });
          var ups = [], u1 = db.update; db.update = function (t, r, p) { if (t === 'Challans' && p && 'PDF' in p) ups.push(r.ChallanNo + '=' + p.PDF); return u1.apply(db, arguments); };
          var la = lg('DC-C3A').length, lb = lg('DC-C3B').length, O5;
          try { O5 = IS(tY, ED(tY, 'CR3-IT-1', { name: 'CR3 renamed again' })); } finally { db.update = u1; }
          eq('CR3-8 item edit: every open challan that prints it gets its PDF cell cleared (also one this read showed blank); only the real link is logged and counted; posted untouched',
            [ups.sort().join(','), lg('DC-C3A').length - la, lg('DC-C3B').length - lb, O5.old, PD('Challans', 'DC-C3P')].join('|'), 'DC-C3A=,DC-C3B=|0|1|1|https://x/c3p');
          // a link this execution's read shows blank but the sheet holds now (a panel PDF wrote it meanwhile): found, logged, cleared / quote marked old
          rc(); var QX = officeQuoteSave(tS, base({ subject: 'CR3 live', lines: [{ code: 'CR3-IT-1', desc: 'CR3 item', qty: 2, unit: 'pc / month', rate: 50 }] })).no;
          rc(); var QY = officeQuoteSave(tS, base({ subject: 'CR3 none', lines: [{ code: 'CR3-IT-1', desc: 'CR3 item', qty: 3, unit: 'pc / month', rate: 50 }] })).no;
          db.update('Quotes', must(db, 'Quotes', 'QuoteNo', QX), { PDF: '' }); db.update('Quotes', must(db, 'Quotes', 'QuoteNo', QY), { PDF: '' });
          var np0 = oPdfNow_, live = { 'DC-C3A': 'https://live/c3a' }; live[QX] = 'https://drive.google.com/file/d/CR3qLIVE2abcdefghij/view';
          oPdfNow_ = function (d, t, r) { var k = r && (r.ChallanNo || r.QuoteNo); if (k && live[k] && blank(r.PDF)) { r.PDF = live[k]; delete live[k]; } return np0.apply(this, arguments); };
          e5.del('OQP:' + QX); e5.del('OQP:' + QY); var l19 = lg('DC-C3A').length, O19;
          try { O19 = IS(tY, ED(tY, 'CR3-IT-1', { name: 'CR3 live edit', size: '3 m' })); } finally { oPdfNow_ = np0; }
          eq('CR3-19 item edit while the cached read shows no link but the sheet has one now: the challan link is logged and cleared, the quote is marked old from it; a quote with no PDF is not counted',
            [O19.old, PD('Challans', 'DC-C3A'), lg('DC-C3A').length - l19, /live\/c3a/.test(lg('DC-C3A').slice(-1)[0].Details), J(e5.get('OQP:' + QX)), e5.get('OQP:' + QY), PD('Quotes', QX)].join('|'),
            '2||1|true|{"v":0,"f":"CR3qLIVE2abcdefghij"}||https://drive.google.com/file/d/CR3qLIVE2abcdefghij/view');
          e5.del('OQP:' + QX);
          // sheet-backed db: the cell as the sheet holds it now (a panel PDF wrote it after this read)
          var cell = { 'Challans:5': 'https://live/link5', 'Quotes:3': 'https://drive.google.com/file/d/CR3qLIVEabcdefghij/view' }, fu = [], fl2 = [], lg0 = log_;
          var FD = { ss: {}, headers: function (t) { return t === 'Quotes' ? ['QuoteNo', 'PDF'] : ['ChallanNo', 'PDF']; }, sheet: function (t) { return { getRange: function (r, c) { return { getValue: function () { return c === 2 ? (cell[t + ':' + r] || '') : 'x'; } }; } }; },
            rows: function (t) { return t === 'Quotes' ? [{ QuoteNo: 'Q-C3F', PDF: '', _r: 3 }] : []; }, update: function (t, r, p) { fu.push(t + ':' + r._r + ':' + J(p)); r.PDF = p.PDF; cell[t + ':' + r._r] = p.PDF; } };
          var ra = { _r: 5, ChallanNo: 'DC-F5', PDF: '' }, rb = { _r: 6, ChallanNo: 'DC-F6', PDF: 'https://cached/old6' }, ok5, ok6, q1, qn;
          log_ = function (d, a, ref, x) { fl2.push(ref + ':' + x); };
          try { ok5 = oPdfClr_(FD, 'Challans', ra, 'DC-F5', 'Item Z changed'); ok6 = oPdfClr_(FD, 'Challans', rb, 'DC-F6', 'Item Z changed'); e5.del('OQP:Q-C3F'); q1 = oQPdfStale_(e5, FD, 'Q-C3F', true); qn = oQPdfStale_(e5, FD, 'NOPE', true); }
          finally { log_ = lg0; }
          eq('CR3-9 sheet-backed: a link the cached read missed is found in the cell, logged, cleared; a cached link already gone from the cell is cleared, not logged; one cell written each',
            [ok5, ok6, fl2.join(' ; '), fu.join(' ; '), ra.PDF, cell['Challans:5']].join('|'), 'true|false|DC-F5:Item Z changed; old PDF https://live/link5|Challans:5:{"PDF":""} ; Challans:6:{"PDF":""}||');
          eq('CR3-10 quote: marked old from the cell as it is now (cached read blank); a missing quote = no PDF', [q1, J(e5.get('OQP:Q-C3F')), qn, oPdfNow_({ ss: null }, 'Quotes', { PDF: null }), oPdfNow_(FD, 'Quotes', null)].join('|'), 'true|{"v":0,"f":"CR3qLIVEabcdefghij"}|false||');
          e5.del('OQP:Q-C3F');
          // WO no. change: every Draft doc of the job cleared, only links counted / logged
          var cW = mkC({ no: 'CR3-WO-1' });
          db.insert('Invoices', [{ InvNo: 'INV-C3A', JobNo: cW.job, Status: 'Draft', PDF: '' }, { InvNo: 'INV-C3B', JobNo: cW.job, Status: 'Draft', PDF: 'https://u/c3b' }, { InvNo: 'INV-C3S', JobNo: cW.job, Status: 'Sent', PDF: 'https://u/c3s' }]);
          var iu = [], u2 = db.update; db.update = function (t, r, p) { if (t === 'Invoices' && p && 'PDF' in p) iu.push(r.InvNo + '=' + p.PDF); return u2.apply(db, arguments); };
          var nOldW; try { nOldW = oCtPdfOld_(db, cW.job); } finally { db.update = u2; }
          eq('CR3-11 WO no. change: every Draft invoice of the job cleared (also the one with no link), only the link logged / counted; others untouched',
            [iu.sort().join(','), nOldW, lg('INV-C3A').length, lg('INV-C3B').length, PD('Invoices', 'INV-C3S')].join('|'), 'INV-C3A=,INV-C3B=|1|0|1|https://u/c3s');
          db.update('Invoices', must(db, 'Invoices', 'InvNo', 'INV-C3B'), { PDF: 'https://u/c3b2' });
          var cs = cSave(tS, FF(officeContractGet(tS, cW.job), { no: 'CR3-WO-2' }));
          eq('CR3-12 end to end: the contract save with a WO change runs it (job saved, WO stored, link cleared and logged)', [!!cs, must(db, 'Jobs', 'JobNo', cW.job).ClientWONo, PD('Invoices', 'INV-C3B'), lg('INV-C3B').length].join('|'), 'true|CR3-WO-2||2');
          // ---- (8) "Is a set" can't change for an item that is a part of a set
          IS(tY, NI({ code: 'CR3-P1' })); IS(tY, NI({ code: 'CR3-P2' }));
          db.insert('KitParts', [{ KitPartID: 'KP-C3A', SetCode: 'SET-C3', ItemCode: ' cr3-p1 ', QtyPerSet: 2 }, { KitPartID: 'KP-C3B', SetCode: '', ItemCode: 'CR3-P2', QtyPerSet: 2 }, { KitPartID: 'KP-C3C', SetCode: 'SET-C3', ItemCode: 'CR3-P3', QtyPerSet: 0 }]);
          var a8 = err(function () { IS(tY, ED(tY, 'CR3-P1', { isSet: 'Yes' })); }), b8 = IS(tY, ED(tY, 'CR3-P2', { isSet: 'Yes' }));
          eq('CR3-13 a part of a set (KitParts, code matched trimmed / any case) can\'t become a set; nothing written; a row with no set code does not count', [a8, IT('CR3-P1').IsSet, b8.code, IT('CR3-P2').IsSet].join('|'), 'BADINPUT|set||CR3-P2|Yes');
          var c8 = err(function () { IS(tY, NI({ code: 'CR3-P3', isSet: 'Yes' })); }), d8 = IS(tY, NI({ code: 'CR3-P3', isSet: 'No' })), e8 = err(function () { IS(tY, ED(tY, 'CR3-P3', { isSet: 'Yes' })); }), f8 = IS(tY, ED(tY, 'CR3-P3', { name: 'still a part' }));
          eq('CR3-14 a new item already listed as a part: as a set refused, as a plain item added; then it can\'t flip; other edits still save', [c8, d8.code, e8, f8.code, IT('CR3-P3').Name, IT('CR3-P3').IsSet].join('|'), 'BADINPUT|set|CR3-P3|BADINPUT|set|CR3-P3|still a part|');
          db.update('Items', IT('CR3-P2'), { IsSet: '' }); db.update('KitParts', must(db, 'KitParts', 'KitPartID', 'KP-C3B'), { SetCode: 'SET-C3' });
          var g8 = err(function () { IS(tY, ED(tY, 'CR3-P2', { isSet: 'Yes' })); });
          db.insert('Items', { ItemCode: 'SET-C3', Name: 'C3 set', Category: 'Set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active', ForHire: 'Yes', ForSale: 'No' });
          var h8 = IS(tY, ED(tY, 'SET-C3', { name: 'C3 set renamed' })), i8 = err(function () { IS(tY, ED(tY, 'SET-C3', { isSet: 'No' })); });
          eq('CR3-15 the set itself: other edits save; turning it into a plain item still refused (it has parts)', [g8, h8.code, i8].join('|'), 'BADINPUT|set|SET-C3|BADINPUT|set');
          // ---- (1) catalogue rows: untracked non-set items stay reachable after they are added
          var U1 = IS(tY, NI({ code: 'CR3-UT-1', tracked: 'No', forHire: 'Yes' })); IS(tY, NI({ code: 'CR3-UT-2', tracked: 'No', status: 'Inactive' }));
          var LL = officeStockList(tY), rw = function (c) { return LL.rows.filter(function (x) { return x.code === c; })[0] || null; };
          eq('CR3-16 an added untracked item is in the list as a catalogue row (cata), active or not; tracked items / sets / items with stock are not cata; bad codes still left out',
            [U1.code, !!rw('CR3-UT-1'), rw('CR3-UT-1').cata, rw('CR3-UT-1').tracked, rw('CR3-UT-2').cata, rw('CR3-UT-2').status, !!rw('CR3-IT-1').cata, !!rw('SET-C3').cata, LL.rows.every(function (x) { return !!oStCode_(x.code); })].join('|'), 'CR3-UT-1|true|true|false|true|Inactive|false|false|true');
          db.insert('StockMoves', { MoveID: 'MV-C3U', MoveDate: new Date(2026, 10, 2), ItemCode: 'CR3-UT-2', FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', Qty: 3, RefType: 'Opening' });
          var LL2 = officeStockList(tY), r2u = LL2.rows.filter(function (x) { return x.code === 'CR3-UT-2'; })[0];
          eq('CR3-17 untracked but holding stock: a normal stock row (not cata), its quantities shown', [!!r2u.cata, r2u.yard].join('|'), 'false|3');
          var V1 = officeStockItem(tY, 'CR3-UT-1'), E1 = IS(tY, ED(tY, 'CR3-UT-1', { name: 'Transport job' })), QF = officeQuoteForm(tS), qi = QF.items.filter(function (x) { return x.code === 'CR3-UT-1'; })[0];
          rc(); var QS = officeQuoteSave(tS, base({ subject: 'CR3 catalogue', lines: [{ code: 'CR3-UT-1', desc: 'Transport job', qty: 1, unit: 'pc', rate: 900 }] }));
          eq('CR3-18 end to end: the catalogue item opens, edits, is offered by the quote form and saves on a quote', [V1.code, V1.tracked, E1.code, IT('CR3-UT-1').Name, !!qi, qi && qi.forHire, !!QS.no].join('|'), 'CR3-UT-1|false|CR3-UT-1|Transport job|true|true|true');
          uiRun_ = uR0; QF5_STUB_ = q5k; OPE_makePdf0_ = mk0; OPE_RUN_ = null;
        })();
