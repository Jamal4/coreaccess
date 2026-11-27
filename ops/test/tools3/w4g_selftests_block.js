        // W4g: a save that changes nothing writes nothing
        var fa = function (F, o) { return base(Object.assign({ no: qS, ev: F.ev, type: F.type, cust: F.cust, site: F.site, prep: F.prep, adv: F.adv, lines: F.lines, attention: F.attention, subject: F.subject, valid: F.valid, date: F.date }, o || {})); }; // the whole fetched form
        e5.cdel('OQEW:sales4@t.com'); var FG = officeQuoteForm(tS, qS).quote, nU = 0, nI = 0, u0g = db.update, i0g = db.insert, lg0 = db.rows('Log').length, rG;
        db.update = function () { nU++; return u0g.apply(db, arguments); }; db.insert = function () { nI++; return i0g.apply(db, arguments); };
        try { rG = officeQuoteSave(tS, fa(FG)); } finally { db.update = u0g; db.insert = i0g; }
        eq('O371 W4g: a save that changes nothing writes nothing (no row, no Log), returns the view + the same ev + the status', [rG.changed, nU, nI, db.rows('Log').length === lg0, !!rG.view && rG.view.no === qS, rG.ev === FG.ev, rG.status === String(must(db, 'Quotes', 'QuoteNo', qS).Status), rG.rev === num(must(db, 'Quotes', 'QuoteNo', qS).Rev)].join('|'), 'false|0|0|true|true|true|true|true');
        var FH = officeQuoteForm(tS, qS).quote, rH = officeQuoteSave(tS, fa(FH, { attention: 'Changed W4g' })), FH2 = officeQuoteForm(tS, qS).quote, rH2 = officeQuoteSave(tS, fa(FH2, { ev: rH.ev, attention: 'Changed W4g 2' }));
        eq('O372 W4g: one changed field saves as before; the answer carries the new ev (= the form\'s); the next save with it works', [rH.changed, rH.ev === FH2.ev, rH.ev !== FH.ev, rH2.changed, oUncell_(must(db, 'Quotes', 'QuoteNo', qS).Attention)].join('|'), 'true|true|true|true|Changed W4g 2');
        var FI = officeQuoteForm(tS, qS).quote, nL = ql(qS).length; e5.cdel('OQEW:sales4@t.com');
        var rI = officeQuoteSave(tS, fa(FI, { lines: FI.lines.slice(0, 1) })), FJ = officeQuoteForm(tS, qS).quote, rJ = officeQuoteSave(tS, fa(FJ, { valid: '2026-12-30' })), FK = officeQuoteForm(tS, qS).quote;
        eq('O373 W4g: a removed line / other valid-until date / a changed line are changes', [nL > 1, rI.changed, ql(qS).length, rJ.changed, FK.valid, officeQuoteSave(tS, fa(FK, { lines: [Object.assign({}, FK.lines[0], { rate: FK.lines[0].rate + 1 })] })).changed].join('|'), 'true|true|1|true|2026-12-30|true');
        var shT = new OW4gShadow_(db), lq = db.rows('Log').length, q0s = db.rows('Quotes')[0], s0 = q0s.Subject, hq = db.headers('Quotes').length;
        shT.rows('Quotes')[0].Subject = 'W4g shadow'; shT.insert('Log', { Action: 'x' }); shT.ensureColumn('Quotes', 'W4gX'); shT.rows('QuoteLines').splice(0, 1);
        eq('O374 W4g: the dry run works on copies (real rows, Log, headers, lines untouched; a Log row is not even read)', [q0s.Subject === s0, db.rows('Log').length === lq, db.headers('Quotes').indexOf('W4gX'), db.headers('Quotes').length === hq, shT.t.Log === undefined, shT.rows('QuoteLines').length === db.rows('QuoteLines').length - 1].join('|'), 'true|true|-1|true|true|true');
        (function () { var shI = new OW4gShadow_(db), n0 = db.rows('QuoteLines').length, o9 = { QuoteNo: 'X9', Description: "''-Hire", Unit: '0123' }; shI.insert('QuoteLines', [o9]); var last = shI.rows('QuoteLines').slice(-1)[0], q9 = shI.rows('Quotes')[0]; shI.update('Quotes', q9, { Subject: "'-Hire" });
          eq('O379 W4g CR 2+3: shadow rows keep the raw value (as the SheetDb cache); the compare uses what the sheet keeps, for written cells only', [last.Description, oW4gCell_(last, 'Description'), oW4gCell_(last, 'Unit'), q9.Subject, oW4gCell_(q9, 'Subject'), oW4gCell_(q9, 'QuoteNo') === db.rows('Quotes')[0].QuoteNo, shI.rows('QuoteLines').length === n0 + 1, db.rows('QuoteLines').length === n0, db.rows('Quotes')[0].Subject !== "'-Hire"].join('|'), "''-Hire|'-Hire|0123|'-Hire|-Hire|true|true|true|true"); })();
        eq('O375 W4g: the stored value (the sheet drops the escape quote) + strict compare', [oW4gStore_("'=x"), oW4gStore_('0123'), oW4gStore_("''-Hire"), oW4gStore_(5), oW4gStore_(null), oW4gEq_('-Hire', "'-Hire"), oW4gEq_(new Date(1), new Date(1)), oW4gEq_(5, '5'), oW4gEq_(null, ''), oW4gEq_(0, ''), oW4gEq_(new Date(1), 1)].join(','), "=x,0123,'-Hire,5,,false,true,false,true,false,false");
        (function () { // W4g CR: over many edits the dry run's verdict = what the real save writes (db made sheet-like: a write keeps oW4gStore_(value))
          var u0 = db.update, i0 = db.insert, g0 = oW4gSame_, kS0 = UI_ACTIONS_.saveQuoteFull, seen = null, bad = [], noop = [], err = 0, rounds = 0, slow = 0, pend = [], lastDesc = null;
          db.update = function (t, o, p) { Object.keys(p).forEach(function (k) { pend.push([o, k, oW4gStore_(p[k])]); }); return u0.call(db, t, o, p); }; // like SheetDb: the cache keeps the raw value during the save
          db.insert = function (t, objs) { var n = Array.isArray(objs) ? objs.length : 1, r = i0.call(db, t, objs), h = db.headers(t); db.rows(t).slice(-n).forEach(function (o) { h.forEach(function (k) { pend.push([o, k, oW4gStore_(o[k]), t]); }); }); return r; }; // CR 4: the rows actually stored
          var miss = 0, settle = function () { pend.forEach(function (x) { if (x[3] && db.rows(x[3]).indexOf(x[0]) < 0) miss++; x[0][x[1]] = x[2]; }); pend = []; }; // the next save reads what the sheet kept; miss = a target not in its table
          var snap = function () { return j(['Quotes', 'QuoteLines', 'QuoteTerms', 'Customers', 'Sites', 'Settings', 'Sequences'].filter(function (t) { return db.hasTab(t); }).map(function (t) { var h = db.headers(t); return [t, h.length].concat(db.rows(t).map(function (r) { return h.map(function (k) { var v = r[k]; return v instanceof Date ? 'D' + v.getTime() : v == null ? '' : v; }); })); })); };
          var day = function (s, n) { var p = s.split('-'), x = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return x.toISOString().slice(0, 10); };
          var L = function (F, f) { return F.lines.map(function (l, i) { return f(Object.assign({}, l), i); }); };
          var M = [
            ['same', function () {}], ['-Hire', function (o) { o.subject = '-Hire'; }], ['apostrophe typed', function (o, F) { o.subject = "'" + F.subject.replace(/^'+/, ''); }], ['-Hire', function (o) { o.subject = '-Hire'; }], ['same', function () {}],
            ['=formula text', function (o) { o.attention = '=SUM(1)'; }], ['apostrophe attention', function (o, F) { o.attention = "'" + F.attention.replace(/^'+/, ''); }], ['=formula text', function (o) { o.attention = '=SUM(1)'; }], ['same', function () {}], ['spaces', function (o, F) { o.attention = '  ' + F.attention + '  '; }], ['adv', function (o, F) { o.adv = F.adv === 40 ? 45 : 40; }],
            ['date', function (o, F) { o.date = day(F.date, -1); }], ['valid', function (o, F) { o.valid = day(F.valid, 3); }], ['add line', function (o, F) { o.lines = F.lines.concat([{ code: '', desc: 'Extra ' + rounds, qty: 2, unit: 'pc', rate: 5 }]); }],
            ['add line apostrophe', function (o, F) { o.lines = F.lines.concat([{ code: '', desc: "'-Hire", qty: 1, unit: 'pc', rate: 3 }]); }], ['last desc -Hire', function (o, F) { o.lines = L(F, function (l, i) { if (i === F.lines.length - 1) l.desc = '-Hire'; return l; }); }], ['same', function () {}],
            ['reverse lines', function (o, F) { o.lines = F.lines.slice().reverse(); }], ['qty', function (o, F) { o.lines = L(F, function (l, i) { if (!i && l.basis !== 'lump') l.qty = +l.qty + 1; return l; }); }],
            ['rate', function (o, F) { o.lines = L(F, function (l, i) { if (i === F.lines.length - 1) l.rate = +l.rate + 0.5; return l; }); }], ['desc', function (o, F) { o.lines = L(F, function (l, i) { if (!i) l.desc = l.desc + ' y'; return l; }); }],
            ['desc =', function (o, F) { o.lines = L(F, function (l, i) { if (!i) l.desc = '+' + l.desc; return l; }); }], ['optional', function (o, F) { o.lines = L(F, function (l, i) { if (!i) { l.opt = !l.opt; l.chosen = false; } return l; }); }],
            ['chosen', function (o, F) { o.lines = L(F, function (l, i) { if (!i && l.opt) l.chosen = !l.chosen; return l; }); }], ['lump', function (o, F) { o.lines = L(F, function (l, i) { if (!i) l.basis = l.basis === 'lump' ? 'unit' : 'lump'; return l; }); }],
            ['size', function (o, F) { o.lines = L(F, function (l, i) { if (!i) { l.dim = { L: 2 + rounds, W: '', H: 3, N: '' }; l.unit = 'm²'; } return l; }); }], ['unit', function (o, F) { o.lines = L(F, function (l, i) { if (!i) { l.unit = l.unit === 'pc' ? 'set' : 'pc'; l.dim = null; } return l; }); }],
            ['type', function (o, F) { o.type = F.type === 'Sale' ? 'Project' : 'Sale'; o.lines = L(F, function (l) { l.unit = String(l.unit).replace(/\s*\/\s*month$/, ''); return l; }); }], ['one line', function (o, F) { o.lines = F.lines.slice(0, 1); }],
            ['trailing zeros', function (o, F) { o.lines = L(F, function (l) { l.rate = Number(l.rate); l.qty = Number(l.qty); return l; }); }], ['same', function () {}]
          ];
          var seed = 7, rnd = function (n) { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
          var plan = M.map(function (m) { return [m]; }); for (var z = 0; z < 26; z++) plan.push([M[rnd(M.length)], M[rnd(M.length)]]);
          var hostile = function (dx, ax) { var r = kS0(dx, ax), ls = dx.rows('QuoteLines').filter(function (l) { return String(l.QuoteNo) === String(r.ref); }), q = find(dx.rows('Quotes'), 'QuoteNo', r.ref);
            if (ls.length && q && dx.headers('Quotes').indexOf('Notes') >= 0) uiPutRow_(dx, 'Quotes', q, { Notes: ls[ls.length - 1].Description + '|' + q.Subject }); return r; }; // CR 3: re-reads values this save just wrote
          oW4gSame_ = function () { seen = g0.apply(this, arguments); return false; }; // the real save always runs; the dry run only gives its verdict
          try {
            [false, true].forEach(function (hz) { UI_ACTIONS_.saveQuoteFull = hz ? hostile : kS0;
            plan.forEach(function (P) {
              rounds++; e5.cdel('OQEW:sales4@t.com');
              var F = officeQuoteForm(tS, qS).quote, o = fa(F, {}); P.forEach(function (m) { m[1](o, F); });
              var s0 = snap(), r; seen = null;
              try { r = officeQuoteSave(tS, o); } catch (x) { err++; pend = []; return; }
              settle(); var s1 = snap(), name = P.map(function (m) { return m[0]; }).join('+');
              if (name === 'add line apostrophe' && lastDesc === null) { var lq9 = ql(qS); lastDesc = String(lq9[lq9.length - 1].Description); } // CR 4: the stored row holds the sheet value ("'-Hire" typed -> sheet keeps '-Hire)
              if (seen === true && s0 !== s1) bad.push(name);           // said "nothing changes" but the save changed data = would lose an edit
              if (seen === false && s0 === s1) slow++;                   // safe: only an extra write
              if (P.every(function (m) { return m[0] === 'same'; }) && s0 === s1 && seen !== true) noop.push(name); // nothing changed, yet the dry run said "changed"
              oW4gSame_ = g0; e5.cdel('OQEW:sales4@t.com');            // the same form again, fast path on: nothing written, nothing changes
              var F2 = officeQuoteForm(tS, qS).quote, o2 = fa(F2, {}); P.forEach(function (m) { m[1](o2, F); }); var s2 = snap(), r2 = officeQuoteSave(tS, fa(F2, {})); settle(); var s3 = snap();
              if (r2.changed !== false || s2 !== s3 || r2.ev !== F2.ev) bad.push(name + ' (again)');
              oW4gSame_ = function () { seen = g0.apply(this, arguments); return false; };
            }); });
          } finally { oW4gSame_ = g0; db.update = u0; db.insert = i0; UI_ACTIONS_.saveQuoteFull = kS0; }
          db.update('Quotes', must(db, 'Quotes', 'QuoteNo', qS), { Notes: '' }); e5.cdel('OQEW:sales4@t.com'); var Fz = officeQuoteForm(tS, qS).quote; officeQuoteSave(tS, fa(Fz, { attention: 'Mr W4g', subject: 'W4g subject', lines: [{ code: '', desc: 'Item', qty: 3, unit: 'pc', rate: 10 }, { code: '', desc: 'Item 2', qty: 1, unit: 'pc', rate: 4 }] })); // plain values again for the raw test store
          eq('O378 W4g: every single edit + 26 random pairs, plain and with a wrapper that re-reads freshly written values, on a store that behaves like the sheet (raw cache during a save, sheet values on the next read): never "unchanged" when the save changes data; a no-op is always caught; saving the fetched form again writes nothing', [bad.join(';') || 'none', noop.join(';') || 'none', rounds, err, Object.keys(e5.store || {}).filter(function (k) { return /^OQRV:/.test(k); }).length, miss, lastDesc].join('|'), 'none|none|' + (2 * plan.length) + "|0|0|0|'-Hire"); // CR 4: stored = the sheet value of a typed '-Hire (raw would be ''-Hire) // CR 3: every round must complete (no error allowed)
        })();
        var kS = UI_ACTIONS_.saveQuoteFull, FL = officeQuoteForm(tS, qS).quote, lg1 = db.rows('Log').length, rL; e5.cdel('OQEW:sales4@t.com');
        UI_ACTIONS_.saveQuoteFull = function (dx, ax) { if (dx instanceof OW4gShadow_) throw new Error('shadow boom'); return kS(dx, ax); };
        try { rL = officeQuoteSave(tS, fa(FL)); } finally { UI_ACTIONS_.saveQuoteFull = kS; }
        eq('O376 W4g: a dry run that fails -> the normal save decides (writes + Log as before, still no change)', [rL.changed, db.rows('Log').length === lg1 + 1, rL.ev === FL.ev].join('|'), 'false|true|true');
        var FM = officeQuoteForm(tS, qS).quote, lg2 = db.rows('Log').length, rM = officeQuoteSave(tS, fa(FM, { pdf: true }));
        eq('O377 W4g: no-change save with Save & PDF: no write, the PDF step as before', [rM.changed, db.rows('Log').length === lg2, typeof rM.pdf === 'string'].join('|'), 'false|true|true');
