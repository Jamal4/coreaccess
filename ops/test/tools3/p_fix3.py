import sys
d=sys.argv[1]
def patch(f,pairs):
    p=d+'/'+f; s=open(p,encoding='utf-8').read()
    for a,b in pairs:
        c=s.count(a); assert c==1,(f,a[:80],c); s=s.replace(a,b)
    open(p,'w',encoding='utf-8').write(s)
s=open(d+'/CAE_Ops_Office.gs',encoding='utf-8').read()
i=s.index("        eq('O375 W4g: cell compare"); j=s.index("\n",i)
old=s[i:j+1]
new=r"""        eq('O375 W4g: the stored value (the sheet drops the escape quote) + strict compare', [oW4gStore_("'=x"), oW4gStore_('0123'), oW4gStore_("''-Hire"), oW4gStore_(5), oW4gStore_(null), oW4gEq_('-Hire', "'-Hire"), oW4gEq_(new Date(1), new Date(1)), oW4gEq_(5, '5'), oW4gEq_(null, ''), oW4gEq_(0, ''), oW4gEq_(new Date(1), 1)].join(','), "=x,0123,'-Hire,5,,false,true,false,true,false,false");
        (function () { // W4g CR: over many edits the dry run's verdict = what the real save writes (db made sheet-like: a write keeps oW4gStore_(value))
          var u0 = db.update, i0 = db.insert, g0 = oW4gSame_, seen = null, bad = [], noop = [], err = 0, rounds = 0, slow = 0;
          db.update = function (t, o, p) { var q = {}; Object.keys(p).forEach(function (k) { q[k] = oW4gStore_(p[k]); }); return u0.call(db, t, o, q); };
          db.insert = function (t, objs) { var r = i0.call(db, t, objs), h = db.headers(t); (Array.isArray(objs) ? objs : [objs]).forEach(function (o) { h.forEach(function (k) { o[k] = oW4gStore_(o[k]); }); }); return r; };
          var snap = function () { return j(['Quotes', 'QuoteLines', 'QuoteTerms', 'Customers', 'Sites', 'Settings', 'Sequences'].filter(function (t) { return db.hasTab(t); }).map(function (t) { var h = db.headers(t); return [t, h.length].concat(db.rows(t).map(function (r) { return h.map(function (k) { var v = r[k]; return v instanceof Date ? 'D' + v.getTime() : v == null ? '' : v; }); })); })); };
          var day = function (s, n) { var p = s.split('-'), x = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)); return x.toISOString().slice(0, 10); };
          var L = function (F, f) { return F.lines.map(function (l, i) { return f(Object.assign({}, l), i); }); };
          var M = [
            ['same', function () {}], ['apostrophe typed', function (o, F) { o.subject = "'" + F.subject.replace(/^'+/, ''); }], ['-Hire', function (o) { o.subject = '-Hire'; }], ['same', function () {}],
            ['=formula text', function (o) { o.attention = '=SUM(1)'; }], ['spaces', function (o, F) { o.attention = '  ' + F.attention + '  '; }], ['adv', function (o, F) { o.adv = F.adv === 40 ? 45 : 40; }],
            ['date', function (o, F) { o.date = day(F.date, -1); }], ['valid', function (o, F) { o.valid = day(F.valid, 3); }], ['add line', function (o, F) { o.lines = F.lines.concat([{ code: '', desc: 'Extra ' + rounds, qty: 2, unit: 'pc', rate: 5 }]); }],
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
          oW4gSame_ = function () { seen = g0.apply(this, arguments); return false; }; // the real save always runs; the dry run only gives its verdict
          try {
            plan.forEach(function (P) {
              rounds++; e5.cdel('OQEW:sales4@t.com');
              var F = officeQuoteForm(tS, qS).quote, o = fa(F, {}); P.forEach(function (m) { m[1](o, F); });
              var s0 = snap(), r; seen = null;
              try { r = officeQuoteSave(tS, o); } catch (x) { err++; return; }
              var s1 = snap(), name = P.map(function (m) { return m[0]; }).join('+');
              if (seen === true && s0 !== s1) bad.push(name);           // said "nothing changes" but the save changed data = would lose an edit
              if (seen === false && s0 === s1) slow++;                   // safe: only an extra write
              if (P.every(function (m) { return m[0] === 'same'; }) && seen !== true) noop.push(name);
              oW4gSame_ = g0; e5.cdel('OQEW:sales4@t.com');            // the same form again, fast path on: nothing written, nothing changes
              var F2 = officeQuoteForm(tS, qS).quote, o2 = fa(F2, {}); P.forEach(function (m) { m[1](o2, F); }); var s2 = snap(), r2 = officeQuoteSave(tS, fa(F2, {})), s3 = snap();
              if (r2.changed !== false || s2 !== s3 || r2.ev !== F2.ev) bad.push(name + ' (again)');
              oW4gSame_ = function () { seen = g0.apply(this, arguments); return false; };
            });
          } finally { oW4gSame_ = g0; db.update = u0; db.insert = i0; }
          eq('O378 W4g: 50 edit rounds (single + paired edits) on a sheet-like store: never "unchanged" when the save changes data; a no-op is always caught; saving the fetched form again writes nothing', [bad.join(';') || 'none', noop.join(';') || 'none', rounds, err < rounds / 2, Object.keys(e5.store || {}).filter(function (k) { return /^OQRV:/.test(k); }).length].join('|'), 'none|none|' + plan.length + '|true|0');
        })();
"""
s=s[:i]+new+s[j+1:]
open(d+'/CAE_Ops_Office.gs','w',encoding='utf-8').write(s)
print('ok')
