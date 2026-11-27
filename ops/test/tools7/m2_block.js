        // ---- M2 contracts (harness only) — smoke (step 3)
        e5.cdel('OQEW:sales4@t.com'); e5.cdel('OQEW:dir4@t.com');
        var q2m = officeQuoteSave(tS, base({ cust: c1.id, site: s1.id, subject: 'M2 smoke' })).no; pq(q2m, 'Sent');
        var L2 = officeContractList(tS), fr2 = L2.free.filter(function (x) { return x.no === q2m; })[0];
        eq('M2-s1 list: Sent quote without a job offered', [!!fr2, L2.can, typeof fr2.total, L2.staff.length > 0].join(','), 'true,true,number,true');
        var mk = officeContractMake(tS, { quote: q2m, qv: fr2.qv, kind: 'PO', no: 'NB-PO-1', date: '2026-11-20', adv: 40, pm: '' }), J2 = must(db, 'Jobs', 'JobNo', mk.job);
        eq('M2-s2 make: job, quote Accepted, kind, pct, value; again -> EXISTS', [/^CAE\/J\//.test(mk.job), must(db, 'Quotes', 'QuoteNo', q2m).Status, J2.OrderKind, J2.AdvancePct, J2.ContractValue > 0, err(function () { officeContractMake(tS, { quote: q2m, kind: 'PO' }); })].join(','), 'true,Accepted,PO,0.4,true,EXISTS|' + mk.job);
        var G2 = officeContractGet(tS, mk.job);
        eq('M2-s3 get', [G2.kind, G2.no, G2.date, G2.advPct, Math.abs(G2.adv - G2.value * 0.4) < 0.006, G2.lines.length > 0, typeof G2.ev, G2.can, G2.pi].join(','), 'PO,NB-PO-1,2026-11-20,0.4,true,true,number,true,');
        var sv2 = officeContractSave(tS, { job: mk.job, ev: G2.ev, kind: 'WO', no: 'NB-WO-2', date: '2026-11-21', pm: '', status: 'Mobilising', notes: 'n1', adv: 40, sdAmount: 1000, sdCheque: '12', sdStatus: 'Held' });
        eq('M2-s4 save + stale', [sv2.ok, must(db, 'Jobs', 'JobNo', mk.job).ClientWONo, must(db, 'Jobs', 'JobNo', mk.job).Status, must(db, 'Jobs', 'JobNo', mk.job).OrderKind, err(function () { officeContractSave(tS, { job: mk.job, ev: G2.ev, kind: 'WO', status: 'Mobilising', adv: 40, sdStatus: 'None' }); })].join(','), 'true,NB-WO-2,Mobilising,WO,STALE');
        var ln = G2.lines[0].id; officeContractFab(tS, { job: mk.job, line: ln, fab: true });
        eq('M2-s5 fab', [must(db, 'QuoteLines', 'LineID', ln).NeedsFab, officeContractGet(tS, mk.job).fab, officeContractList(tS).rows.filter(function (r) { return r.job === mk.job; })[0].fab].join(','), 'Yes,1,1');
        var G3 = officeContractGet(tS, mk.job), pv = officeContractAdvance(tS, { job: mk.job, ev: G3.ev, amount: G3.adv, date: '2026-11-21' });
        eq('M2-s6 advance PI; second -> PIMADE; % change after PI -> PIMADE', [/^CAE\/PI\//.test(pv.pi), officeContractGet(tS, mk.job).pi.status, err(function () { officeContractAdvance(tS, { job: mk.job, ev: G3.ev, amount: 1, date: '' }); }), err(function () { officeContractSave(tS, { job: mk.job, ev: G3.ev, kind: 'WO', no: 'NB-WO-2', date: '2026-11-21', status: 'Mobilising', notes: 'n1', adv: 50, sdAmount: 1000, sdCheque: '12', sdStatus: 'Held' }); })].join(','), 'true,Draft,PIMADE,PIMADE');
        eq('M2-s7 viewer reads, cannot write; Yard no access', [officeContractList(tV).can, 'free' in officeContractList(tV), officeContractGet(tV, mk.job).can, err(function () { officeContractFab(tV, { job: mk.job, line: ln, fab: false }); }), err(function () { officeContractList(tY); })].join(','), 'false,false,false,NOACCESS,NOACCESS');
