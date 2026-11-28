import sys
def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        n = s.count(a); assert n == 1, (p, n, a[:80]); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
ops = sys.argv[1]
ed(ops + '/Code.gs', [
 ("var PAY_METHODS = ['Bank transfer', 'Cheque', 'Pay order'];",
  "var PAY_METHODS = ['Bank transfer', 'Cheque', 'Pay order'];\nvar PAY_OUT_METHODS = PAY_METHODS.concat(['Cash']); // AC1 (28 Nov): cash only for payments out to suppliers; receipts stay no-cash\nfunction payMethodsFor_(dir) { return dir === 'Out' ? PAY_OUT_METHODS : PAY_METHODS; }\nfunction payVoid_(st) { return st === 'Dishonoured' || st === 'Cancelled'; } // AC1: a cancelled payment counts as nothing, like a dishonoured cheque"),
 ("Unallocated: '=IF({ChequeStatus}=\"Dishonoured\",0,",
  "Unallocated: '=IF(OR({ChequeStatus}=\"Dishonoured\",{ChequeStatus}=\"Cancelled\"),0,"),
 ("set('ChequeStatus', r.Method === 'Bank transfer' ? 'NA' : 'Pending'); }",
  "set('ChequeStatus', r.Method === 'Bank transfer' || r.Method === 'Cash' ? 'NA' : 'Pending'); }"),
 ("  if (p.ChequeStatus === 'Dishonoured') return 0;\n  var cap",
  "  if (payVoid_(p.ChequeStatus)) return 0;\n  var cap"),
 ("  if (PAY_METHODS.indexOf(p.Method) < 0) throw new Error('Payment method must be: ' + PAY_METHODS.join(', ') + ' (no cash)');",
  "  if (payMethodsFor_(p.Direction).indexOf(p.Method) < 0) throw new Error('Payment method must be: ' + payMethodsFor_(p.Direction).join(', ') + (p.Direction === 'Out' ? '' : ' (no cash)'));"),
 ("ChequeStatus: p.Method === 'Bank transfer' ? 'NA' : 'Pending', Notes: p.Notes || '',",
  "ChequeStatus: p.Method === 'Bank transfer' || p.Method === 'Cash' ? 'NA' : 'Pending', Notes: p.Notes || '',"),
 ("  if (p.ChequeStatus === 'Dishonoured') throw new Error(payId + ' is dishonoured');",
  "  if (payVoid_(p.ChequeStatus)) throw new Error(payId + ' is ' + String(p.ChequeStatus).toLowerCase());"),
 ("  if (ms) linkMilestones_(db, quoteNo, job.JobNo);\n",
  "  if (ms) linkMilestones_(db, quoteNo, job.JobNo);\n  billsToJob_(db, quoteNo, job.JobNo);\n"),
 ("function chequeCleared(db, payId)",
  "function billsToJob_(db, quoteNo, jobNo) { // AC1: supplier bills booked on a quote before its job existed now count on the job (job P/L)\n  if (!db.hasTab || !db.hasTab('Bills') || db.headers('Bills').indexOf('QuoteNo') < 0) return 0;\n  var n = 0; db.rows('Bills').forEach(function (b) { if (String(b.QuoteNo) === String(quoteNo) && blank(b.JobNo)) { db.update('Bills', b, { JobNo: jobNo }); n++; } }); return n;\n}\nfunction chequeCleared(db, payId)"),
])
s = open(ops + '/Code.gs', encoding='utf-8').read()
a = "if (t === 'Payments' && PAY_METHODS.indexOf(r.Method) < 0) throw new Error('Payments row ' + r._r + ': method must be ' + PAY_METHODS.join(' / ') + ' (no cash)');"
b = "if (t === 'Payments' && payMethodsFor_(r.Direction).indexOf(r.Method) < 0) throw new Error('Payments row ' + r._r + ': method must be ' + payMethodsFor_(r.Direction).join(' / ') + (r.Direction === 'Out' ? '' : ' (no cash)'));"
assert s.count(a) == 1; open(ops + '/Code.gs', 'w', encoding='utf-8').write(s.replace(a, b))
s = open(ops + '/CAE_Ops_Reports.gs', encoding='utf-8').read()
assert s.count(a) == 1; s = s.replace(a, b)
c = ",[[Payments.ChequeStatus]],\"<>Dishonoured\")' +"
assert s.count(c) == 1; s = s.replace(c, ",[[Payments.ChequeStatus]],\"<>Dishonoured\",[[Payments.ChequeStatus]],\"<>Cancelled\")' +")
open(ops + '/CAE_Ops_Reports.gs', 'w', encoding='utf-8').write(s)
print('ok')
