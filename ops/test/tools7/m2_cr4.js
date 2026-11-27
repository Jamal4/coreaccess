        // ---- M2 CodeRabbit run 4 (harness only): Code.gs 'Quote → Job' / 'Quote → PI' audit log failing after the insert
        var qX = mkQ('Sent'), fX = officeContractList(tS).free.filter(function (x) { return x.no === qX; })[0], mX, aX, eX2, nPX;
        dropLog('Quote → Job'); try { rc(); mX = officeContractMake(tS, { quote: qX, qv: fX.qv, kind: 'WO', no: 'X-1', date: '', adv: '', pm: '' }); } finally { db.insert = i0W; }
        eX2 = err(function () { cMake(tS, { quote: qX, kind: 'WO', no: 'X-2', date: '', adv: '', pm: '' }); });
        var gX = officeContractGet(tS, mX.job);
        dropLog('Quote → PI'); try { aX = cAdv(tS, { job: mX.job, ev: gX.ev, amount: 1, date: '' }); } finally { db.insert = i0W; }
        nPX = db.rows('Proformas').filter(function (p) { return p.QuoteNo === qX; }).length;
        eq('CR4-M2-1 Code.gs Quote -> Job / Quote -> PI log failing after the insert: make + advance still answer OK, one job / PI, quote Accepted, retry = EXISTS, no such log rows', [/^CAE\/J\//.test(mX.job), db.rows('Jobs').filter(function (j) { return j.QuoteNo === qX; }).length, QR(qX).Status, JR(mX.job).OrderKind, eX2 === 'EXISTS|' + mX.job, !!(aX && aX.pi), nPX, nLog(mX.job) >= 1, db.rows('Log').filter(function (r) { return (r.Action === 'Quote → Job' && r.Ref === mX.job) || (r.Action === 'Quote → PI' && r.Ref === aX.pi); }).length].map(String).join('|'), 'true|1|Accepted|WO|true|true|1|true|0');
        var qY = mkQ('Sent'), jY = quoteToJob(db, qY), pY = quoteToPI(db, qY, { amount: 1 });
        eq('CR4-M2-2 normal path still writes both audit rows', [db.rows('Log').filter(function (r) { return (r.Action === 'Quote → Job' && r.Ref === jY) || (r.Action === 'Quote → PI' && r.Ref === pY); }).length].join('|'), '2');
