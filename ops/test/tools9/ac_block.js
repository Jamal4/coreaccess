        // ---- AC1 (28 Nov, harness only): supplier bills + payments to suppliers. AC-1 access, AC-2 bill + new vendor + quote link + retry,
        // AC-3 refused saves change nothing, AC-4 edit / stale, AC-5 pay oldest first (cash), AC-6 overpay / paid bill locked, AC-7 direct payment + retry,
        // AC-8 cancel payment, AC-9 quote -> job moves its bills, AC-10 cash only out, AC-11 a half-done payment finishes once, AC-12 bill cancel, AC-13 picked bills
        (function () { var LAST = '', EQ = function (n) { LAST = n; return eq.apply(this, arguments); }; try {
          var em = ['acd@t.com', 'ac2@t.com', 'ac1@t.com', 'pr2@t.com', 'ach@t.com', 'scx@t.com'], rc = function () { em.forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var tD = add(em[0], oDir_()), tA = add(em[1], { AC: 2 }), tV = add(em[2], { AC: 1 }), tP = add(em[3], { PR: 2 }), tH = add(em[4], { AC: 3 }), tX = add(em[5], { SC: 2, PS: 2 });
          var R2 = function (v) { return Math.round(v * 100) / 100; }, E = function (f) { return String(err(f)).split('|').slice(0, 2).join('|'); }, N = 0, nn = function () { return 'acnonce' + (100000000000 + (++N)); };
          var BS = function (t, x) { rc(); return officeBillSave(t, x); }, PS = function (t, x) { rc(); return officePaySave(t, x); }, LI = function (t) { return officeAcList(t || tA); };
          var bill = function (id) { return find(db.rows('Bills'), 'BillID', id); }, pay = function (id) { return find(db.rows('Payments'), 'PayID', id); }, B = function (id) { return LI().bills.filter(function (b) { return b.id === id; })[0]; };
          var T = function (f) { var n = LAST; try { f(); } catch (e) { eq('AC crash after ' + (n || 'start').slice(0, 6), String(e && e.message || e).slice(0, 160), 'no crash'); } };
          var S0 = 'SUP-0001', D = '2026-11-18', QA = 'CAE/Q/2026/951', QB = 'CAE/Q/2026/952';
          db.insert('Sites', { SiteID: 'SITE-0951', CustID: 'CUST-0001', Project: 'AC site', Address: 'x' });
          db.insert('Quotes', [{ QuoteNo: QA, Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0951', Status: 'Sent' }, { QuoteNo: QB, Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0951', Status: 'Lost' }]);
          var nb = function () { return db.rows('Bills').length; }, np = function () { return db.rows('Payments').length; }, ns = function () { return db.rows('Suppliers').length; };
          // AC-1 access: see = AC / PR 1+; bill = AC / PR 2+; pay = AC 2+; cancel a payment = AC head / Director; others nothing
          T(function () {
            EQ('AC-1a SC / PS login cannot see', E(function () { LI(tX); }), 'NOACCESS');
            EQ('AC-1b AC view sees, cannot write', [LI(tV).can.bill, LI(tV).can.pay, E(function () { BS(tV, { nonce: nn(), sup: S0, date: D, amt: 5 }); })].join(), 'false,false,NOACCESS');
            EQ('AC-1c PR staff: bills yes, pay no', [LI(tP).can.bill, LI(tP).can.pay, E(function () { PS(tP, { nonce: nn(), mode: 'direct', sup: S0, date: D, method: 'Cash', amt: 5, notes: 'x' }); })].join(), 'true,false,NOACCESS');
            EQ('AC-1d AC staff cannot cancel a payment', [LI(tA).can.head, LI(tH).can.head, E(function () { officePayCancel(tA, 'CAE/PV/2026/001', 'x'); })].join(), 'false,true,NOACCESS');
          });
          // AC-2 a bill: new vendor (made at save), quote with no job (QuoteNo, no JobNo), invoice / DO no. optional; a retried save = the same bill
          var b1, V1, k2 = nn();
          T(function () {
            var s0 = ns(), r = BS(tP, { nonce: k2, newSup: { name: 'AC Vendor One', phone: '01700-111', addr: 'Dhaka' }, date: D, quote: QA, amt: 10000, vat: 1500, notes: 'Rent 40 ledgers Nov' });
            b1 = r.id; var b = bill(b1); V1 = String(b.SupID);
            EQ('AC-2a bill + new vendor', [/^BILL-\d{5}$/.test(b1), ns() - s0, b.QuoteNo, b.JobNo, b.Status, b.SupplierInvNo, b.MadeBy].join(), 'true,1,' + QA + ',,Unpaid,,pr2');
            var o = B(b1); EQ('AC-2b list: total / balance / owed', [o.tot, o.bal, o.paid, LI().sups.filter(function (s) { return s.id === V1; })[0].owed].join(), '11500,11500,0,11500');
            var n0 = nb(), r2_ = BS(tP, { nonce: k2, newSup: { name: 'AC Vendor One', phone: '01700-111', addr: 'Dhaka' }, date: D, quote: QA, amt: 10000, vat: 1500 });
            EQ('AC-2c retry same nonce = same bill', [r2_.id === b1, r2_.again, nb() - n0].join(), 'true,true,0');
            var r3 = BS(tP, { nonce: nn(), newSup: { name: '  ac vendor   ONE ', phone: '1', addr: 'y' }, date: D, inv: 'AV-7', amt: 200 });
            EQ('AC-2d same vendor name = that vendor', [bill(r3.id).SupID === V1, ns() - s0].join(), 'true,1');
          });
          // AC-3 refused saves: nothing written, no vendor made
          T(function () {
            var s0 = ns(), n0 = nb(), x = function (o) { return E(function () { BS(tA, Object.assign({ nonce: nn(), sup: S0, date: D, amt: 100 }, o)); }); };
            EQ('AC-3a bad inputs', [x({ amt: 0 }), x({ amt: 1.234 }), x({ vat: -1 }), x({ date: '' }), x({ due: '2026-11-01' }), x({ sup: 'SUP-9999' }), x({ quote: QB }), x({ job: 'CAE/J/2026/999' }), x({ po: 'CAE/PO/2026/999' }), x({ nonce: 'bad' })].join(),
              'BADINPUT|amount,BADINPUT|amount,BADINPUT|VAT,BADINPUT|bill date,BADINPUT|due date,BADINPUT|supplier,BADINPUT|quote,BADINPUT|job,BADINPUT|PO,BADINPUT|nonce');
            EQ('AC-3b refused new vendor not made', [x({ sup: '', newSup: { name: 'Ghost Vendor', phone: '1', addr: 'a' }, amt: -5 }), ns() - s0, nb() - n0].join(), 'BADINPUT|amount,0,0');
            EQ('AC-3c same invoice no. twice', E(function () { BS(tA, { nonce: nn(), sup: V1, date: D, inv: 'av-7', amt: 9 }); }), 'DUP|' + find(db.rows('Bills'), 'SupplierInvNo', 'AV-7').BillID);
          });
          // AC-4 edit with ev; stale ev refused
          T(function () {
            var o = B(b1), r = BS(tA, { id: b1, ev: o.ev, sup: V1, date: D, inv: 'AV-1', dono: 'VDO-11', quote: QA, amt: 10000, vat: 0, notes: 'Rent Nov' });
            EQ('AC-4a edited', [bill(b1).SupplierInvNo, bill(b1).DONo, num(bill(b1).VAT), r.ev !== o.ev].join(), 'AV-1,VDO-11,0,true');
            EQ('AC-4b stale ev', E(function () { BS(tA, { id: b1, ev: o.ev, sup: V1, date: D, amt: 1 }); }), 'STALE');
          });
          // AC-5 pay against bills, oldest first, cash (no cheque status), PV numbering
          var p1;
          T(function () {
            var bA = BS(tA, { nonce: nn(), sup: S0, date: '2026-11-10', amt: 3000 }).id, bB = BS(tA, { nonce: nn(), sup: S0, date: '2026-11-12', amt: 2000 }).id;
            var r = PS(tA, { nonce: nn(), mode: 'bills', sup: S0, date: D, method: 'Cash', amt: 4000 }); p1 = r.id;
            EQ('AC-5a PV + cash', [/^CAE\/PV\/2026\/\d{3}$/.test(p1), pay(p1).Method, pay(p1).ChequeStatus, pay(p1).Direction, pay(p1).PartyType, pay(p1).MadeBy].join(), 'true,Cash,NA,Out,Supplier,ac2');
            EQ('AC-5b oldest first', [bill(bA).Status, bill(bB).Status, B(bB).bal].join(), 'Paid,Part paid,1000');
            var pl = LI().pays.filter(function (p) { return p.id === p1; })[0]; EQ('AC-5c list allocations', JSON.stringify(pl.al.map(function (a) { return a.amt; })) + pl.free, '[3000,1000]0');
            var c = PS(tA, { nonce: nn(), mode: 'bills', sup: S0, date: D, method: 'Cheque', ref: 'CHQ-1', bank: 'City Bank', amt: 1000 });
            EQ('AC-5d cheque = pending', [pay(c.id).ChequeStatus, bill(bB).Status].join(), 'Pending,Paid');
            EQ('AC-5e cheque needs its no.', E(function () { PS(tA, { nonce: nn(), mode: 'bills', sup: V1, date: D, method: 'Cheque', amt: 1 }); }), 'BADINPUT|reference no.');
            EQ('AC-5f future date refused', E(function () { PS(tA, { nonce: nn(), mode: 'bills', sup: V1, date: '2026-12-25', method: 'Cash', amt: 1 }); }), 'BADINPUT|date');
          });
          // AC-6 more than the open bills refused (no payment row); a paid / part-paid bill can't be edited or cancelled
          T(function () {
            var n0 = np(), open = LI().sups.filter(function (s) { return s.id === V1; })[0].owed;
            EQ('AC-6a overpay', [E(function () { PS(tA, { nonce: nn(), mode: 'bills', sup: V1, date: D, method: 'Cash', amt: open + 1 }); }), np() - n0].join(), 'OVERPAY|' + open + ',0');
            PS(tA, { nonce: nn(), mode: 'bills', sup: V1, date: D, method: 'Bank transfer', amt: 100 });
            var o = B(b1); EQ('AC-6b part paid locked', [o.st, E(function () { BS(tA, { id: b1, ev: o.ev, sup: V1, date: D, amt: 5 }); }), E(function () { rc(); officeBillCancel(tA, b1, o.ev, 'x'); })].join(), 'Part paid,BILLPAID|100,BILLPAID|100');
          });
          // AC-7 direct payment (no bill): makes its paid bill (job link), retry = same PV; that bill is locked
          var pD, bD, kD = nn(), J = 'CAE/J/2026/951';
          T(function () {
            db.insert('Jobs', { JobNo: J, QuoteNo: 'CAE/Q/2026/950', CustID: 'CUST-0001', SiteID: 'SITE-0951', JobType: 'Rental', Status: 'On hire' });
            var b0 = nb(), p0 = np(), r = PS(tA, { nonce: kD, mode: 'direct', sup: S0, date: D, method: 'Cash', amt: 750, job: J, notes: 'Van hire, cash' }); pD = r.id; bD = r.bill;
            EQ('AC-7a bill + payment', [nb() - b0, np() - p0, bill(bD).PayID === pD, bill(bD).JobNo, bill(bD).Status, num(bill(bD).Amount), bill(bD).Notes].join(), '1,1,true,' + J + ',Paid,750,Van hire, cash');
            var r2_ = PS(tA, { nonce: kD, mode: 'direct', sup: S0, date: D, method: 'Cash', amt: 750, job: J, notes: 'Van hire, cash' });
            EQ('AC-7b retry same nonce', [r2_.id === pD, nb() - b0, np() - p0, db.rows('Allocations').filter(function (a) { return a.PayID === pD; }).length].join(), 'true,1,1,1');
            var o = B(bD); EQ('AC-7c direct bill locked', E(function () { BS(tA, { id: bD, ev: o.ev, sup: S0, date: D, amt: 1 }); }), 'BILLDIRECT|' + pD);
            EQ('AC-7d direct needs a note', E(function () { PS(tA, { nonce: nn(), mode: 'direct', sup: S0, date: D, method: 'Cash', amt: 5 }); }), 'BADINPUT|note');
            var s0 = ns(), r3 = PS(tA, { nonce: nn(), mode: 'direct', newSup: { name: 'Cash Vendor', phone: '1', addr: 'a' }, date: D, method: 'Cash', amt: 60, quote: QA, notes: 'tea' });
            EQ('AC-7e new vendor on a direct payment', [ns() - s0, bill(r3.bill).QuoteNo, bill(r3.bill).Status].join(), '1,' + QA + ',Paid');
            EQ('AC-7f a new vendor has no bills to pay', E(function () { PS(tA, { nonce: nn(), mode: 'bills', newSup: { name: 'Brand New V', phone: '1', addr: 'a' }, date: D, method: 'Cash', amt: 5 }); }), 'BADINPUT|supplier');
          });
          // AC-8 cancel a payment: allocations reversed, bills re-opened, a direct bill cancelled with it; twice = refused
          T(function () {
            rc(); officePayCancel(tH, p1, 'wrong supplier');
            var bA = db.rows('Allocations').filter(function (a) { return a.PayID === p1; }), net = R2(bA.reduce(function (s, a) { return s + num(a.Amount); }, 0));
            EQ('AC-8a reversed', [pay(p1).ChequeStatus, pay(p1).CancelReason, net, bA.length].join(), 'Cancelled,wrong supplier,0,4');
            EQ('AC-8b bills re-opened', LI().bills.filter(function (b) { return b.sup === S0 && !b.pv; }).map(function (b) { return b.st; }).join(), 'Unpaid,Part paid');
            rc(); officePayCancel(tD, pD, 'test');
            EQ('AC-8c direct bill cancelled', [bill(bD).Status, B(bD).bal, pay(pD).ChequeStatus].join(), 'Cancelled,0,Cancelled');
            var lp = LI().pays, pd = lp.filter(function (p) { return p.id === pD; })[0], pp = lp.filter(function (p) { return p.id === p1; })[0];
            EQ('AC-8h list: a cancelled payment keeps what it paid (was) + its direct bill', [pd.dbill === bD, pd.al.length, pd.was.length, pp.dbill, pp.was.map(function (w) { return w.amt; }).join('+')].join(), 'true,0,1,,3000+1000');
            EQ('AC-8d twice', E(function () { rc(); officePayCancel(tH, p1, 'again'); }), 'PAYSTATE|Cancelled');
            EQ('AC-8e cancelled payment = nothing', [payAvailable(db, pay(p1)), E(function () { allocatePayment(db, p1); })].join(), '0,' + p1 + ' is cancelled');
            EQ('AC-8g sheet panel dishonour of a cancelled payment refused', [E(function () { chequeDishonoured(db, p1); }), pay(p1).ChequeStatus].join(), p1 + ' is already cancelled,Cancelled');
            EQ('AC-8f reason needed', E(function () { rc(); officePayCancel(tH, LI().pays.filter(function (p) { return p.st !== 'Cancelled'; })[0].id, ''); }), 'BADINPUT|reason');
          });
          // AC-9 a quote's job made later: its bills move onto the job
          T(function () { quoteToJob(db, QA, { date: '2026-11-20' }); var j = find(db.rows('Jobs'), 'QuoteNo', QA).JobNo;
            EQ('AC-9 bills to job', db.rows('Bills').filter(function (b) { return b.QuoteNo === QA; }).map(function (b) { return b.JobNo === j; }).join(), 'true,true'); });
          // AC-10 cash: out to suppliers only; customer receipts keep no-cash
          T(function () {
            EQ('AC-10a receipt in cash refused', E(function () { recordPayment(db, { Direction: 'In', PartyType: 'Customer', PartyID: 'CUST-0001', Method: 'Cash', Amount: 5 }); }).indexOf('(no cash)') > 0, true);
            EQ('AC-10b bad method', E(function () { PS(tA, { nonce: nn(), mode: 'bills', sup: S0, date: D, method: 'Bitcoin', amt: 1 }); }), 'BADINPUT|method');
          });
          // AC-11 step R: the first try stopped after the cache record (no rows) -> the retry writes each row once; after a payment row with no allocations -> allocated once
          T(function () {
            var k = nn(), bx = BS(tA, { nonce: nn(), sup: S0, date: D, amt: 400 }).id, keep = db.insert, n0 = np(), boom = true;
            db.insert = function (t, o) { if (boom && t === 'Payments') { boom = false; throw new Error('Sheets is down'); } return keep.apply(db, arguments); };
            var e1; try { e1 = E(function () { PS(tA, { nonce: k, mode: 'bills', sup: S0, date: D, method: 'Cash', alloc: [{ no: bx, amt: 400 }], amt: 400 }); }); } finally { db.insert = keep; }
            var r = PS(tA, { nonce: k, mode: 'bills', sup: S0, date: D, method: 'Cash', alloc: [{ no: bx, amt: 400 }], amt: 400 }), r3 = PS(tA, { nonce: k, mode: 'bills', sup: S0, date: D, method: 'Cash', amt: 400 });
            EQ('AC-11a retry finishes once', [e1, np() - n0, r.id === r3.id, bill(bx).Status, db.rows('Allocations').filter(function (a) { return a.PayID === r.id; }).length].join(), 'Sheets is down,1,true,Paid,1');
          });
          // AC-12 cancel an unpaid bill: not owed, not offered to pay; a reason is needed
          T(function () {
            var bx = BS(tA, { nonce: nn(), sup: V1, date: D, amt: 77 }).id, o = B(bx);
            EQ('AC-12a reason needed', E(function () { rc(); officeBillCancel(tA, bx, o.ev, ' '); }), 'BADINPUT|reason');
            var w = LI().sups.filter(function (s) { return s.id === V1; })[0].owed; rc(); officeBillCancel(tA, bx, o.ev, 'duplicate');
            EQ('AC-12b cancelled', [bill(bx).Status, bill(bx).CancelReason, R2(w - LI().sups.filter(function (s) { return s.id === V1; })[0].owed)].join(), 'Cancelled,duplicate,77');
            EQ('AC-12c not payable', E(function () { PS(tA, { nonce: nn(), mode: 'bills', sup: V1, date: D, method: 'Cash', alloc: [{ no: bx, amt: 77 }], amt: 77 }); }), 'BADINPUT|bill 1');
          });
          // AC-13 picked bills: each up to its balance, the sum = the amount
          T(function () {
            var x = BS(tA, { nonce: nn(), sup: S0, date: '2026-11-01', amt: 500 }).id, y = BS(tA, { nonce: nn(), sup: S0, date: '2026-11-02', amt: 300 }).id;
            EQ('AC-13a sum must match', E(function () { PS(tA, { nonce: nn(), mode: 'bills', sup: S0, date: D, method: 'Cash', alloc: [{ no: y, amt: 300 }], amt: 350 }); }), 'BADINPUT|amount (≠ bills ticked)');
            EQ('AC-13b over a bill', E(function () { PS(tA, { nonce: nn(), mode: 'bills', sup: S0, date: D, method: 'Cash', alloc: [{ no: y, amt: 301 }], amt: 301 }); }), 'OVERPAY|300');
            PS(tA, { nonce: nn(), mode: 'bills', sup: S0, date: D, method: 'Pay order', ref: 'PO-9', alloc: [{ no: y, amt: 300 }], amt: 300 });
            EQ('AC-13c newer bill paid, older open', [bill(y).Status, bill(x).Status].join(), 'Paid,Unpaid');
          });
          // AC-14 list: vendor challans (rent payable) + pos + jobs / quotes for the pickers; no nonce kept in the list
          T(function () {
            db.ensureColumn('Challans', 'MatSource'); db.ensureColumn('Challans', 'SupID'); db.ensureColumn('Challans', 'SupplierRef');
            db.insert('Challans', { ChallanNo: 'CAE/DC/2026/951', Kind: 'Delivery', Status: 'Posted', ChallanDate: new Date(2026, 10, 15), JobNo: J, MatSource: 'Vendor', SupID: V1, SupplierRef: 'VDO-11' });
            var l = LI(), v = l.vch.filter(function (c) { return c.no === 'CAE/DC/2026/951'; })[0];
            EQ('AC-14a vendor challan', [v.sup === V1, v.job, v.sref, v.d].join(), 'true,' + J + ',VDO-11,2026-11-15');
            EQ('AC-14b pickers', [l.jobs.some(function (j) { return j.no === J; }), l.quotes.some(function (q) { return q.no === QA; }), l.quotes.some(function (q) { return q.no === QB; }), l.methods.join('/')].join(), 'true,false,false,Bank transfer/Cheque/Pay order/Cash');
          });
        } catch (e) { eq('AC block crash after ' + (LAST || 'start').slice(0, 8), String(e && e.message || e).slice(0, 200), 'no crash'); } })();
