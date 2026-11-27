    step('Y yard address in signature', function () {
      var setK = function (k, v) { var r = find(db.rows('Settings'), 'Key', k); if (r) db.update('Settings', r, { Value: v }); else db.insert('Settings', { Key: k, Value: v }); };
      var getK = function (k) { var r = find(db.rows('Settings'), 'Key', k); return r ? r.Value : ''; };
      var o0 = getK('OfficeAddress'), y0 = getK('YardAddress'), OF = 'H/39, Block-E, Mohammadpur, Dhaka-1207', YD = 'Dag No. 2307, Gobindapur, Uttarkhan, Dhaka';
      try {
        setK('OfficeAddress', OF); setK('YardAddress', YD);
        var L = qf3Sig_(db).split('\n'), io = L.indexOf('Office: ' + OF), iy = L.indexOf('Yard: ' + YD);
        eq('Y1 both set: Office line then Yard line, once each, last address line before Reg/TL', [io > 0, iy === io + 1, L.filter(function (x) { return /^Yard: /.test(x); }).length, L.indexOf(OF)].join('|'), 'true|true|1|-1');
        var pj = qf3Signers_(db).filter(function (p) { return p.id === 'STF-J'; })[0], LP = qf3Sig_(db, pj).split('\n');
        eq('Y2 personal signature carries both too', [LP[0], LP.indexOf('Office: ' + OF) > 0, LP.indexOf('Yard: ' + YD) === LP.indexOf('Office: ' + OF) + 1].join('|'), 'Jamal Uddin|true|true');
        var d = qf3Draft_(db, q1);
        eq('Y3 draft shows it (company + personal)', [d.signature.indexOf('\nYard: ' + YD) > 0, d.sigs['STF-J'].indexOf('\nYard: ' + YD) > 0].join('|'), 'true|true');
        var n0 = sent.length; run('emailQuote', A(q1, { signAs: 'CO' }));
        eq('Y4 sent email body ends with the yard-bearing signature', [sent.length === n0 + 1, sent[sent.length - 1].b === A(q1).body + '\n\n' + qf3Sig_(db), sent[sent.length - 1].b.indexOf('\nYard: ' + YD) > 0].join('|'), 'true|true|true');
        setK('YardAddress', '');
        var L2 = qf3Sig_(db).split('\n');
        eq('Y5 no yard: office line unlabelled as before, no Yard line', [L2.indexOf(OF) > 0, L2.some(function (x) { return /^(Yard|Office): /.test(x); })].join('|'), 'true|false');
        setK('YardAddress', '   ');
        eq('Y6 blank-ish yard (spaces) = no yard', qf3Sig_(db).split('\n').some(function (x) { return /^Yard:|^Office: /.test(x); }), false);
        setK('OfficeAddress', ''); setK('YardAddress', YD);
        var L3 = qf3Sig_(db).split('\n');
        eq('Y7 yard only: Yard line, no empty/Office line', [L3.indexOf('Yard: ' + YD) > 0, L3.some(function (x) { return /^Office/.test(x) || x === ''; })].join('|'), 'true|false');
        setK('OfficeAddress', '  ' + OF + '  '); setK('YardAddress', ' ' + YD + ' ');
        var s8 = qf3Sig_(db), k8 = '\nOffice: ' + OF + '\nYard: ' + YD, i8 = s8.indexOf(k8);
        eq('Y8 addresses trimmed', i8 > 0 && (s8.length === i8 + k8.length || s8.charAt(i8 + k8.length) === '\n'), true);
      } finally { setK('OfficeAddress', o0); setK('YardAddress', y0); }
      eq('Y9 settings restored', [getK('OfficeAddress') === o0, getK('YardAddress') === y0].join('|'), 'true|true');
    });
