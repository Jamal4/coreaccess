/**
 * Core Access Ops — PDF documents (stage O3) · 10 Nov 2026
 * Second script file in the same Apps Script project as CAE_Ops_Core.gs (+ › Script › CAE_Ops_PDF).
 *
 * How it works: each document is first described as a plain "spec" (title, particulars, tables, clauses) built from
 * the sheet, then drawn into a copy of the Google Doc "CAE Doc Base" (Templates folder: letterhead on page 1,
 * running header, footer with page x of y), exported as PDF to Core Access Ops/PDF/<type>/, and the PDF link is
 * written to the row's PDF column. The editable Google Doc is kept in PDF/<type>/Editable (Settings KeepPdfDocs).
 * Text in [square brackets] prints teal: it is a placeholder to fill in the Terms tab or in the editable Doc.
 *
 * Contents: formatting · terms + tokens · document specs (quote ×4 types, PI, invoice, challan, PO, debit/credit
 * note) · Google Docs renderer · Drive files · sheet upgrade for O3 (+ T&C drafts) · menu · self-test.
 */

// ======================================================================= formatting
var MONTHS_ = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function longDate(v) { var d = blank(v) ? null : toDate(v); return d ? d.getDate() + ' ' + MONTHS_[d.getMonth()] + ' ' + d.getFullYear() : ''; }
// Bangladesh grouping: 1,74,000.00
function tk(x, dp) {
  dp = dp == null ? 2 : dp;
  var neg = x < 0, s = Math.abs(r2(x)).toFixed(dp), p = s.split('.'), i = p[0], out = '';
  if (i.length > 3) { out = ',' + i.slice(-3); i = i.slice(0, -3); while (i.length > 2) { out = ',' + i.slice(-2) + out; i = i.slice(0, -2); } }
  out = i + (out || '');
  if (out.charAt(0) === ',') out = out.slice(1);
  return (neg ? '-' : '') + out + (dp ? '.' + p[1] : '');
}
function qtyTxt(x) { var n = num(x); return Math.abs(n - Math.round(n)) < 1e-9 ? tk(n, 0) : String(r2(n)); }
function pctTxt(x) { var n = r2(num(x) * 100); return (Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : n) + '%'; }
var ONES_ = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
var TENS_ = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function w99_(n) { return n < 20 ? ONES_[n] : TENS_[Math.floor(n / 10)] + (n % 10 ? '-' + ONES_[n % 10] : ''); }
function w999_(n) { var h = Math.floor(n / 100), r = n % 100; return (h ? ONES_[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? w99_(r) : ''); }
function intWords(n) {
  if (n === 0) return 'Zero';
  var parts = [], crore = Math.floor(n / 1e7); n %= 1e7;
  if (crore) parts.push((crore >= 1000 ? intWords(crore) : w999_(crore)) + ' Crore');
  var lakh = Math.floor(n / 1e5); n %= 1e5; if (lakh) parts.push(w99_(lakh) + ' Lakh');
  var th = Math.floor(n / 1000); n %= 1000; if (th) parts.push(w99_(th) + ' Thousand');
  if (n) parts.push(w999_(n));
  return parts.join(' ');
}
function takaWords(x) {
  var v = Math.abs(r2(num(x))), t = Math.floor(v + 1e-9), p = Math.round((v - t) * 100);
  return (num(x) < 0 ? 'Minus ' : '') + 'Taka ' + intWords(t) + (p ? ' and Paisa ' + w99_(p) : '') + ' only';
}
function dash(v) { return blank(v) ? '—' : String(v); }

// ======================================================================= terms + tokens
function termsFor(db, type) {
  return db.rows('Terms').filter(function (t) {
    if (String(t.Active) === 'No') return false;
    var types = String(t.QuoteType).split(',').map(function (x) { return x.trim(); });
    return types.indexOf(type) >= 0 || types.indexOf('All') >= 0;
  }).sort(function (a, b) { return num(a.SortOrder) - num(b.SortOrder); });
}
function quoteTokens(db, q) {
  var cu = find(db.rows('Customers'), 'CustID', q.CustID) || {}, ql = quoteLines(db, q.QuoteNo);
  var mm = num(q.MinMonths) || num(S(db, 'MinHireMonths', 1)), monthly = ql.some(function (l) { return !isMilestone(l) && num(l.Months) > 0; });
  var ms = ql.some(isMilestone), bill = [];
  if (monthly || q.QuoteType === 'Rental') bill.push('Monthly charges are invoiced monthly in advance.');
  if (ms) bill.push('Lump-sum items are invoiced in stages as set out in the payment schedule in Section 2.');
  if (!bill.length) bill.push(q.QuoteType === 'Sale' ? 'The balance is invoiced on delivery.' : 'The balance is invoiced on completion.');
  return {
    AdvancePct: pctTxt(blank(q.AdvancePct) ? S(db, 'AdvancePct', 0.5) : q.AdvancePct), MinMonths: mm + ' month' + (mm === 1 ? '' : 's'),
    PeriodDays: String(num(S(db, 'HirePeriodDays', 30))), PartPeriod: S(db, 'PartPeriodRule', 'Full period') === 'Pro rata' ? 'a part month is charged pro rata by days' : 'a part month is charged as a full month',
    PaymentDays: String(!blank(cu.PaymentDays) ? num(cu.PaymentDays) : num(S(db, 'PaymentDaysDefault', 7))), ValidityDays: String(num(S(db, 'QuoteValidityDays', 30))),
    NoticeDays: String(num(S(db, 'OffHireNoticeDays', 7))), LateInterest: pctTxt(S(db, 'LateInterestPctMonth', 0.02)), BillingSchedule: bill.join(' '),
  };
}
function fillTokens(s, tok) { return String(s).replace(/\{\{(\w+)\}\}/g, function (m, k) { return tok[k] != null ? tok[k] : m; }); }

// ======================================================================= document specs
// A spec is plain data: { folder, file, docTitle, docNo, blocks: [...] }. Block types: title, pairs, p, h, grid, sums, clauses, kv, sig, seal, page.
function co_(db) {
  var reg = [['BIN', S(db, 'BIN', '')], ['e-TIN', S(db, 'eTIN', '')], ['Trade Licence No.', S(db, 'TradeLicenceNo', '')]]
    .map(function (x) { return x[0] + ': ' + (blank(x[1]) ? '__________' : x[1]); }).join('   |   ');
  var a = String(S(db, 'OfficeAddress', '')), parts = a.split(', '), cut = Math.ceil(parts.length / 2);
  return {
    CoAddr1: parts.slice(0, cut).join(', '), CoAddr2: parts.slice(cut).join(', '), CoPhone: S(db, 'Phone', ''), CoEmail: S(db, 'Email', ''),
    CoWeb: S(db, 'Website', ''), CoReg: reg, name: S(db, 'CompanyName', 'Core Access Engineering Ltd.'),
  };
}
function party_(db, id) { return find(db.rows('Customers'), 'CustID', id) || find(db.rows('Suppliers'), 'SupID', id) || {}; }
function siteTxt_(db, siteId) { var s = find(db.rows('Sites'), 'SiteID', siteId); return s ? [s.Project, s.Address].filter(function (x) { return !blank(x); }).join(', ') : ''; }
function phoneMail_(p) { return [p.Phone, p.Email].filter(function (x) { return !blank(x); }).join('  /  '); }
function fileName_(no, extra) { return String(no).replace(/\//g, '-') + (extra ? ' ' + String(extra).replace(/[\\\/:*?"<>|]/g, '').slice(0, 60) : ''); }
function bank_(db) {
  return { t: 'kv', head: 'Payment details', rows: [['Account name', S(db, 'BankAccountName', '')], ['Bank', S(db, 'BankName', '')], ['Branch', S(db, 'BankBranch', '')], ['Account no.', S(db, 'BankAccountNo', '')], ['Routing no.', S(db, 'BankRoutingNo', '')]]
    .map(function (r) { return [r[0], blank(r[1]) ? '[to fill in Settings]' : String(r[1])]; }) };
}
var NO_CASH_ = 'Payment by account payee cheque, pay order or bank transfer in the name of Core Access Engineering Ltd. only. We do not accept cash.';
function ourSig_(db, who) {
  var st = who ? (find(db.rows('Staff'), 'StaffID', who) || find(db.rows('Staff'), 'Name', who)) : null;
  return { t: 'sig', cols: [{ head: 'For and on behalf of Core Access Engineering Ltd.', rows: [['Signature', ''], ['Name', st ? st.Name : (who || '')], ['Designation', st ? st.Role : ''], ['Date', '']] }] };
}
// Price table columns: with or without a Duration column.
function priceCols_(withDur) {
  return withDur
    ? [{ h: 'No.', w: 28, al: 'C' }, { h: 'Description', w: 169 }, { h: 'Unit', w: 38 }, { h: 'Qty', w: 35, al: 'R' }, { h: 'Duration', w: 55 }, { h: 'Rate (BDT)', w: 72, al: 'R' }, { h: 'Amount (BDT)', w: 85, al: 'R' }]
    : [{ h: 'No.', w: 28, al: 'C' }, { h: 'Description', w: 224 }, { h: 'Unit', w: 38 }, { h: 'Qty', w: 45, al: 'R' }, { h: 'Rate (BDT)', w: 62, al: 'R' }, { h: 'Amount (BDT)', w: 85, al: 'R' }];
}
function durTxt_(l) { if (isMilestone(l)) return 'Stages'; var m = num(l.Months); return m > 0 ? qtyTxt(m) + ' month' + (m === 1 ? '' : 's') : '—'; }
function sums_(sub, vatPct, extra) {
  var vat = r2(sub * num(vatPct)), tot = r2(sub + vat), rows = [['Subtotal', tk(sub)], ['VAT @ ' + pctTxt(vatPct), tk(vat)]];
  (extra || []).forEach(function (x) { rows.push(x); });
  return { vat: vat, total: tot, rows: rows };
}

function quotePics_(db, lines) { // F3: the printed lines' components that have a picture (Items.PicID), in line order, each once (with all its line nos.), at most 9
  if (typeof db.headers !== 'function' || db.headers('Items').indexOf('PicID') < 0) return [];
  var items = db.rows('Items'), seen = {}, out = [];
  lines.forEach(function (l, i) {
    var c = String(l.ItemCode == null ? '' : l.ItemCode).trim(); if (!c) return;
    if (seen[c]) { seen[c].no.push(i + 1); return; }
    var it = find(items, 'ItemCode', c); if (out.length >= 9 || !it || blank(it.PicID)) return;
    seen[c] = { f: String(it.PicID).trim(), name: dash(it.Name) + (blank(it.Size) || String(it.Name).indexOf(String(it.Size).trim()) >= 0 ? '' : ', ' + it.Size), no: [i + 1] }; /* a size already in the name is not repeated (live r31) */ out.push(seen[c]);
  });
  return out.map(function (x) { return { f: x.f, cap: 'No. ' + x.no.join(', ') + ' - ' + x.name }; });
}
function specQuote(db, quoteNo) {
  var q = must(db, 'Quotes', 'QuoteNo', quoteNo), type = q.QuoteType || 'Rental', cu = party_(db, q.CustID), tok = quoteTokens(db, q);
  var lines = db.rows('QuoteLines').filter(function (l) { return String(l.QuoteNo) === String(quoteNo) && (l.Selected === 'Yes' || l.Optional === 'Yes'); })
    .sort(function (a, b) { return num(a.LineNo) - num(b.LineNo); });
  if (!lines.length) throw new Error(quoteNo + ' has no lines');
  var t = quoteTotals(db, quoteNo), no = q.QuoteNo + (num(q.Rev) > 0 ? ' Rev ' + num(q.Rev) : '');
  var hireType = type === 'Rental' || type === 'Project', withDur = hireType || lines.some(function (l) { return num(l.Months) > 0 || isMilestone(l); });
  var cols = priceCols_(withDur), unsel = false;
  var rows = lines.map(function (l, i) {
    var amt = lineAmt(l), off = l.Selected !== 'Yes'; if (off) unsel = true;
    var d = (l.Optional === 'Yes' ? 'Optional: ' : '') + dash(l.Description);
    var r = [String(i + 1), d, dash(l.Unit), qtyTxt(l.Qty)];
    if (withDur) r.push(durTxt_(l));
    r.push(tk(l.Rate), off ? '(' + tk(amt) + ')' : tk(amt));
    return r;
  });
  var valid = !blank(q.ValidUntil) ? q.ValidUntil : (dayNum(q.QuoteDate) != null ? fromDay(dayNum(q.QuoteDate) + num(S(db, 'QuoteValidityDays', 30))) : '');
  var typeTxt = { Sale: 'supply of scaffolding materials', Rental: 'hire of scaffolding / access equipment', Project: 'scaffolding / access works', Service: 'engineering services' }[type] || 'scaffolding';
  var site = siteTxt_(db, q.SiteID), b = [];
  b.push({ t: 'title', text: 'QUOTATION', sub: type === 'Rental' ? 'Hire' : type });
  b.push({ t: 'pairs', rows: [['To', cu.Name, 'Quotation No.', no], ['Attention', q.Attention, 'Date', longDate(q.QuoteDate)], ['Address', cu.Address, 'Valid until', longDate(valid)],
    ['Phone / Email', phoneMail_(cu), 'Your reference', q.YourRef], ['Client BIN', cu.BIN, 'Project / Site', site]] });
  b.push({ t: 'p', text: [['Subject:  ', { bold: true }], [blank(q.Subject) ? 'Quotation for ' + typeTxt + (site ? ' at ' + site : '') : String(q.Subject), { bold: true }]], before: 12, after: 9 });
  if (type === 'Project' && !blank(q.PicID)) b.push({ t: 'pic', f: String(q.PicID).trim(), w: 220, h: 165, cap: 'Picture for visual reference only - not to scale.' }); // QP
  b.push({ t: 'p', text: 'Dear Sir / Madam,', after: 6 });
  b.push({ t: 'p', text: type === 'Sale'
    ? 'Thank you for your enquiry. We are pleased to submit our offer for the supply of the goods below. This quotation, once accepted, forms a binding contract on the terms set out in it.'
    : 'Thank you for your enquiry. Our first advice is always whether work at height can be avoided or done by a safer method; scaffolding is engineered only where it cannot. We are pleased to submit our offer below. This quotation, once accepted, forms a binding contract on the terms set out in it.', after: 2 });
  // commercial block
  var com = [{ t: 'p', text: 'Amount = Quantity × ' + (withDur ? 'Duration × ' : '') + 'Rate. Prices exclude VAT.' + (unsel ? ' Optional items in brackets are not included in the total.' : ''), size: 8.5, italic: true, color: 'grey', after: 6 },
    { t: 'grid', cols: cols, rows: rows },
    { t: 'sums', width: cols[cols.length - 1].w, rows: sums_(t.subtotal, q.VATPct).rows.concat([['Total payable (BDT)', tk(t.total), true]]) },
    { t: 'p', text: [['Amount in words:  ', { bold: true }], [takaWords(t.total) + '.', {}]], size: 9, before: 8, after: 4 }];
  if (t.advance > 0) com.push({ t: 'p', text: [['Advance with order:  ', { bold: true }], [pctTxt(t.advancePct) + ' of the total = Tk ' + tk(t.advance), {}]], size: 9, after: 6 });
  if (type === 'Rental' || type === 'Sale') { var pics = quotePics_(db, lines); if (pics.length) com.push({ t: 'pics', items: pics, cap: 'Pictures for visual reference only - not to scale.' }); } // F3: a picture per component
  if (lines.some(function (l) { return isMilestone(l) && l.Selected === 'Yes'; })) {
    var ms = milestoneRows(db, quoteNo), base = milestoneBase(db, quoteNo), list;
    if (ms.length) list = milestoneAmounts(db, quoteNo).map(function (x) { return [x.row.StageNo, x.row.Stage, num(x.row.Pct), x.amount]; });
    else { var st = parseStages_(S(db, 'MilestoneStages', 'Erection complete:40|Mid-way:30|Dismantling complete:30')), done = 0;
      list = st.map(function (s, i) { var a = i === st.length - 1 ? r2(base - done) : r2(base * s[1]); done = r2(done + a); return [i + 1, s[0], s[1], a]; }); }
    com.push({ t: 'p', text: 'Payment schedule for lump-sum items (Duration "Stages"):', bold: true, size: 9, before: 6, after: 4 });
    com.push({ t: 'grid', cols: [{ h: 'Stage', w: 40, al: 'C' }, { h: 'Payable on', w: 272 }, { h: 'Share', w: 70, al: 'R' }, { h: 'Amount (BDT)', w: 100, al: 'R' }],
      rows: list.map(function (x) { return [String(x[0]), x[1], pctTxt(x[2]), tk(x[3])]; }).concat([['', 'Total lump sum (VAT is added to each stage invoice)', '100%', tk(base)]]), boldLast: true });
  }
  // sections from the Terms tab
  var terms = termsFor(db, type), secs = [], by = {};
  terms.forEach(function (r) { var k = String(r.Section); if (!by[k]) { by[k] = { no: k, title: r.SectionTitle, items: [] }; secs.push(by[k]); } by[k].items.push([String(r.ClauseNo), r.Title, fillTokens(r.Text, tok)]); });
  var comIdx = -1; secs.forEach(function (s, i) { if (comIdx < 0 && /commercial|price|fee/i.test(s.title)) comIdx = i; });
  if (comIdx < 0) { secs.splice(Math.min(1, secs.length), 0, { no: '', title: 'Commercial Offer', items: [] }); comIdx = Math.min(1, secs.length - 1); }
  secs.forEach(function (s, i) {
    b.push({ t: 'h', text: (s.no ? s.no + '.  ' : '') + String(s.title).toUpperCase() });
    if (i === comIdx) b = b.concat(com);
    if (s.items.length) b.push({ t: 'clauses', items: s.items });
  });
  b.push({ t: 'p', text: 'We trust this offer meets your requirements and look forward to working with you.', before: 14, after: 9 });
  b.push({ t: 'p', text: 'Yours faithfully,', after: 2 });
  b.push(ourSig_(db, q.PreparedBy));
  // acceptance page
  var accNo = secs.length && /^\d+$/.test(secs[secs.length - 1].no) ? (num(secs[secs.length - 1].no) + 1) + '.  ' : '';
  var encl = type === 'Sale' ? 'Our purchase order and advance payment are enclosed.' : type === 'Service' ? 'Our work order and advance payment are enclosed.' : 'Our work order, advance payment and security deposit are enclosed.';
  b.push({ t: 'page' });
  b.push({ t: 'h', text: accNo + 'ACCEPTANCE' });
  b.push({ t: 'p', text: 'We accept Quotation No. ' + no + ' dated ' + longDate(q.QuoteDate) + ', including all its terms and conditions, and authorise Core Access Engineering Ltd. to proceed. ' + encl, size: 9, after: 6 });
  if (hireType) b.push({ t: 'p', text: 'Optional engineering services selected (tick):   ☐ Design calculations and certified drawings (Singapore PE firm)     ☐ On-site PE verification (Bangladesh-registered PE)     ☐ None', size: 8.5, after: 8 });
  b.push({ t: 'sig', cols: [{ head: 'For the client', rows: [['Company', ''], ['Signature', ''], ['Name', ''], ['Designation', '']] }, { head: ' ', rows: [['Date', ''], [type === 'Sale' ? 'PO no.' : 'Work order no.', ''], ['Client BIN', ''], ['Phone', '']] }] });
  b.push({ t: 'p', text: 'Company seal', size: 8.5, color: 'grey', before: 16, after: 4 });
  b.push({ t: 'seal' });
  b.push({ t: 'p', text: 'Please return the signed acceptance to ' + S(db, 'Email', '') + ' or to our office address.', size: 8, italic: true, color: 'grey', before: 14 });
  return { kind: 'Quotes', key: 'QuoteNo', id: quoteNo, folder: 'Quotes', file: fileName_(no, cu.Name), docTitle: 'Quotation', docNo: no, blocks: b };
}

function specPI(db, piNo) {
  var p = must(db, 'Proformas', 'PINo', piNo), q = find(db.rows('Quotes'), 'QuoteNo', p.QuoteNo) || {}, cu = party_(db, p.CustID);
  var t = q.QuoteNo ? quoteTotals(db, q.QuoteNo) : null, b = [];
  b.push({ t: 'title', text: 'PROFORMA INVOICE', sub: 'Advance payment request' });
  b.push({ t: 'pairs', rows: [['To', cu.Name, 'PI No.', p.PINo], ['Attention', q.Attention, 'Date', longDate(p.PIDate)], ['Address', cu.Address, 'Quotation ref.', q.QuoteNo ? q.QuoteNo + ' dated ' + longDate(q.QuoteDate) : ''],
    ['Client BIN', cu.BIN, 'Payable', [p.DueTerms, longDate(p.DueDate)].filter(function (x) { return !blank(x); }).join(', ')], ['Phone / Email', phoneMail_(cu), 'Project / Site', siteTxt_(db, q.SiteID)]] });
  var rows = [['1', dash(p.Description) + (blank(q.Subject) ? '' : ' — ' + q.Subject), tk(p.Amount)]];
  b.push({ t: 'p', text: '', after: 6 });
  b.push({ t: 'grid', cols: [{ h: 'No.', w: 28, al: 'C' }, { h: 'Description', w: 369 }, { h: 'Amount (BDT)', w: 85, al: 'R' }], rows: rows });
  b.push({ t: 'sums', width: 85, rows: [['Amount payable (BDT)', tk(p.Amount), true]] });
  b.push({ t: 'p', text: [['Amount in words:  ', { bold: true }], [takaWords(p.Amount) + '.', {}]], size: 9, before: 8, after: 6 });
  if (t) b.push({ t: 'p', text: 'Quotation total Tk ' + tk(t.total) + ' including VAT. This advance is set off against our first invoice(s) for the job.', size: 9, after: 8 });
  b.push(bank_(db));
  b.push({ t: 'p', text: NO_CASH_ + ' Please quote the PI number with your payment.', size: 8.5, before: 8, after: 2 });
  b.push({ t: 'p', text: 'This proforma invoice is a request for advance payment and is not a tax invoice. VAT is accounted for on our Mushak-6.3 invoice.', size: 8.5, italic: true, color: 'grey', after: 10 });
  b.push(ourSig_(db, q.PreparedBy));
  return { kind: 'Proformas', key: 'PINo', id: piNo, folder: 'Proformas', file: fileName_(p.PINo, cu.Name), docTitle: 'Proforma Invoice', docNo: p.PINo, blocks: b };
}

function specInvoice(db, invNo) {
  var inv = must(db, 'Invoices', 'InvNo', invNo), cu = party_(db, inv.CustID), job = find(db.rows('Jobs'), 'JobNo', inv.JobNo) || {};
  var lines = db.rows('InvoiceLines').filter(function (l) { return l.InvNo === invNo; });
  if (!lines.length) throw new Error(invNo + ' has no lines');
  var withDur = lines.some(function (l) { return num(l.Months) > 0; }), cols = priceCols_(withDur);
  var rows = lines.map(function (l, i) {
    var r = [String(i + 1), dash(l.Description), dash(l.Unit), qtyTxt(l.Qty)];
    if (withDur) r.push(num(l.Months) > 0 ? qtyTxt(l.Months) + ' month' + (num(l.Months) === 1 ? '' : 's') : '—');
    r.push(tk(l.Rate), tk(lineAmt(l))); return r;
  });
  var sub = r2(sum(lines, lineAmt)), adv = num(inv.AdvanceAdjusted), s = sums_(sub, inv.VATPct, [['Total (BDT)', '']]);
  s.rows[2][1] = tk(s.total);
  if (adv) s.rows.push(['Less: advance adjusted', '(' + tk(adv) + ')']);
  var due = r2(s.total - adv); s.rows.push(['Amount due (BDT)', tk(due), true]);
  var pd = !blank(cu.PaymentDays) ? num(cu.PaymentDays) : num(S(db, 'PaymentDaysDefault', 7));
  var dueDate = !blank(inv.DueDate) ? inv.DueDate : (dayNum(inv.InvDate) != null ? fromDay(dayNum(inv.InvDate) + pd) : '');
  var sub2 = { Hire: 'Hire charges', Final: 'Final account', Milestone: 'Stage payment', Sale: 'Sale of goods', Service: 'Services' }[inv.Kind] || '';
  var period = !blank(inv.PeriodFrom) ? longDate(inv.PeriodFrom) + ' to ' + longDate(inv.PeriodTo) : '';
  var b = [{ t: 'title', text: 'INVOICE', sub: sub2 },
    { t: 'pairs', rows: [['To', cu.Name, 'Invoice No.', inv.InvNo], ['Address', cu.Address, 'Date', longDate(inv.InvDate)], ['Client BIN', cu.BIN, 'Due date', longDate(dueDate)],
      ['Job / work order', [inv.JobNo, job.ClientWONo].filter(function (x) { return !blank(x); }).join('  /  '), period ? 'Period' : 'Mushak-6.3 No.', period || inv.Mushak63No],
      ['Project / Site', siteTxt_(db, job.SiteID), period ? 'Mushak-6.3 No.' : 'Quotation ref.', period ? inv.Mushak63No : job.QuoteNo]] },
    { t: 'p', text: '', after: 6 }, { t: 'grid', cols: cols, rows: rows }, { t: 'sums', width: cols[cols.length - 1].w, rows: s.rows },
    { t: 'p', text: [['Amount due in words:  ', { bold: true }], [takaWords(due) + '.', {}]], size: 9, before: 8, after: 8 }, bank_(db),
    { t: 'p', text: NO_CASH_ + ' Please quote the invoice number with your payment. Payable within ' + pd + ' days of the invoice date; late payment carries interest at ' + pctTxt(S(db, 'LateInterestPctMonth', 0.02)) + ' per month.', size: 8.5, before: 8, after: 2 },
    { t: 'p', text: 'Where VAT is deducted at source, it counts as paid only when we receive the Mushak-6.6 certificate.', size: 8.5, italic: true, color: 'grey', after: 10 },
    ourSig_(db, '')];
  return { kind: 'Invoices', key: 'InvNo', id: invNo, folder: 'Invoices', file: fileName_(inv.InvNo, cu.Name), docTitle: 'Invoice', docNo: inv.InvNo, blocks: b };
}

function specChQuote_(db, c) { // r28 F1: a challan made from a quote before its job: customer / site / quote no. from the quote
  var q = blank(c.QuoteNo) ? null : find(db.rows('Quotes'), 'QuoteNo', c.QuoteNo); return q ? { QuoteNo: q.QuoteNo, CustID: q.CustID, SiteID: q.SiteID, JobType: q.QuoteType } : null;
}
function specChallan(db, no) {
  var c = must(db, 'Challans', 'ChallanNo', no), job = (blank(c.JobNo) ? null : find(db.rows('Jobs'), 'JobNo', c.JobNo)) || specChQuote_(db, c) || {}, cu = party_(db, job.CustID), items = db.rows('Items');
  var lines = db.rows('ChallanLines').filter(function (l) { return l.ChallanNo === no; });
  if (!lines.length) throw new Error(no + ' has no lines');
  var ret = c.Kind === 'Return', loc = function (id) { var l = find(db.rows('Locations'), 'LocID', id); return l ? l.Name : dash(id); };
  var cols = ret
    ? [{ h: 'No.', w: 26, al: 'C' }, { h: 'Item code', w: 70 }, { h: 'Description', w: 150 }, { h: 'Unit', w: 32 }, { h: 'Qty', w: 38, al: 'R' }, { h: 'Good', w: 38, al: 'R' }, { h: 'Damaged', w: 44, al: 'R' }, { h: 'Lost', w: 34, al: 'R' }, { h: 'Remarks', w: 50 }]
    : [{ h: 'No.', w: 26, al: 'C' }, { h: 'Item code', w: 72 }, { h: 'Description', w: 150 }, { h: 'Size / spec.', w: 66 }, { h: 'Unit', w: 32 }, { h: 'Qty', w: 44, al: 'R' }, { h: 'Condition / remarks', w: 92 }]; // D1: as the 31 Oct template
  var kg = 0, qty = 0;
  var rows = lines.map(function (l, i) {
    var it = find(items, 'ItemCode', l.ItemCode) || {}; qty += num(l.Qty); kg += num(l.Qty) * num(it.WeightKg);
    var r = ret ? [String(i + 1), dash(l.ItemCode), dash(it.Name) + (blank(it.Size) ? '' : ', ' + it.Size), dash(it.Unit), qtyTxt(l.Qty)] : [String(i + 1), dash(l.ItemCode), dash(it.Name), dash(it.Size), dash(it.Unit), qtyTxt(l.Qty)];
    if (ret) { var d = num(l.QtyDamaged), lo = num(l.QtyLost); r.push(qtyTxt(blank(l.QtyGood) ? num(l.Qty) - d - lo : l.QtyGood), d ? qtyTxt(d) : '—', lo ? qtyTxt(lo) : '—'); }
    r.push(blank(l.Remarks) ? '' : String(l.Remarks)); return r;
  });
  var title = { Delivery: 'DELIVERY CHALLAN', Return: 'RETURN CHALLAN', Sale: 'DELIVERY CHALLAN', Transfer: 'TRANSFER NOTE', 'Hire-in': 'RENT-IN RECEIPT', 'Off-hire': 'OFF-HIRE NOTE' }[c.Kind] || 'CHALLAN';
  var sub = { Delivery: job.JobType === 'Sale' ? 'Delivery Note · Sale' : 'Delivery Note · Hire', Return: 'Equipment returned', Sale: 'Delivery Note · Sale', Transfer: 'Stock transfer', 'Hire-in': 'Goods received on hire from a rental supplier', 'Off-hire': 'Rented goods returned to the supplier' }[c.Kind] || '';
  var rk = c.Kind === 'Hire-in' || c.Kind === 'Off-hire', su = rk && !blank(c.SupID) ? party_(db, c.SupID) : {}, direct = c.Kind === 'Delivery' && locType(db, c.FromLoc) === 'Supplier', vend = String(c.MatSource || '') === 'Vendor', vn = vend && !blank(c.SupID) ? party_(db, c.SupID) : {}; // M8 rent-in
  var si = find(db.rows('Sites'), 'SiteID', job.SiteID) || {}, ok = ['PO', 'WO', 'LOI'].indexOf(String(job.OrderKind || '')) >= 0 ? String(job.OrderKind) : 'WO', sale = job.JobType === 'Sale' || c.Kind === 'Sale', client = ['Delivery', 'Sale', 'Return'].indexOf(c.Kind) >= 0; // D1
  var qwo = [job.QuoteNo, blank(job.ClientWONo) ? '' : ok + ' ' + job.ClientWONo].filter(function (x) { return !blank(x); }).join('  /  ');
  var rel = ''; if (ret) { var dl = db.rows('Challans').filter(function (x) { return x.JobNo === c.JobNo && x.Kind === 'Delivery' && x.Status === 'Posted' && String(x.MatSource || '') !== 'Vendor'; }).map(function (x) { return String(x.ChallanNo); }).sort();
    rel = dl.slice(0, 3).join(', ') + (dl.length > 3 ? ' +' + (dl.length - 3) + ' more' : ''); }
  var pr = rk ? [['Supplier', su.Name, 'Challan No.', c.ChallanNo], ['Supplier\'s DO / ref', c.SupplierRef, 'Date', longDate(c.ChallanDate)], ['From', loc(c.FromLoc) + (c.Kind === 'Hire-in' ? ' (' + dash(su.Name) + ')' : ''), 'Vehicle no.', c.Vehicle],
      ['To', c.Kind === 'Off-hire' ? dash(su.Name) : loc(c.ToLoc), 'Driver', c.Driver]]
    : c.Kind === 'Transfer' && blank(c.JobNo) ? [['From', loc(c.FromLoc), 'Challan No.', c.ChallanNo], ['To', loc(c.ToLoc), 'Date', longDate(c.ChallanDate)], ['Vehicle no.', c.Vehicle, 'Driver', c.Driver]]
    : [['Customer', cu.Name, 'Challan No.', c.ChallanNo], ['Project / Site', siteTxt_(db, job.SiteID), 'Date', longDate(c.ChallanDate)], ['Site contact', [si.SiteRep, si.SiteRepPhone].filter(function (x) { return !blank(x); }).join(', '), 'Quotation / ' + ok, qwo],
      ['Job no.', c.JobNo, 'Vehicle no.', c.Vehicle], ['From', vend ? 'Vendor rental · ' + dash(vn.Name) + (blank(c.SupplierRef) ? '' : ' (DO ' + c.SupplierRef + ')') + ' · direct to site' : direct ? 'Direct to site' : loc(c.FromLoc), 'Driver', c.Driver], ret ? ['To', loc(c.ToLoc), 'Related challan', rel] : ['To', loc(c.ToLoc), 'Received by', c.ReceivedBy]]; // a direct delivery never prints the rental supplier on the client's copy
  var b = [{ t: 'title', text: title, sub: sub + (blank(c.Status) || c.Status === 'Draft' ? '   ·   DRAFT — not posted' : c.Status === 'Cancelled' ? '   ·   CANCELLED' : '') }];
  if (client) b.push({ t: 'p', text: [[(ret ? '☐' : '☒') + ' Delivery to site' + (sale ? ' (sale)' : '') + '          ', { bold: true }], [(ret ? '☒' : '☐') + ' Return to yard', { bold: true }]], size: 10, after: 4 });
  b = b.concat([
    { t: 'pairs', rows: pr },
    { t: 'p', text: '', size: 2, after: 0 }, { t: 'grid', cols: cols, rows: rows },
    { t: 'p', text: [['Total quantity:  ', { bold: true }], [qtyTxt(qty) + (kg ? '      Approx. weight:  ' + tk(kg, 0) + ' kg' : ''), {}]], size: 9, before: 4, after: 2 }]);
  if (!blank(c.Notes)) b.push({ t: 'p', text: [[client ? 'Remarks:  ' : 'Notes:  ', { bold: true }], [String(c.Notes), {}]], size: 9, after: 4 });
  if (client) { // D1: notes 1–4 of the 31 Oct template (hire / sale / return wording; no supplier is ever named)
    var qn = blank(job.QuoteNo) ? 'the agreed order' : 'Quotation No. ' + job.QuoteNo;
    var ck = 'Count and check before signing. Note any shortage or damage under remarks; otherwise the above is accepted as correct.'; // one line each: the challan stays on one page
    var nt = sale ? ['Sold under ' + qn + '. Items pass to the client on payment in full.', ck, 'Sold items are at the client\'s risk from delivery.']
      : ret ? ['Items returned from hire under ' + qn + '.', 'Return count and condition as recorded above are final unless disputed in writing within 48 hours.', 'Damaged and lost items are charged as set out in the quotation terms.']
        : ['Supplied on hire under ' + qn + '. Hired equipment never becomes the client\'s property.', ck,
          'The client is responsible for the equipment on site until collection. Loss or damage is charged under the quotation terms.', 'Do not alter, remove or move any part of an erected scaffold; report any change needed to our scaffold supervisor.'];
    b.push({ t: 'p', text: [['Notes', { bold: true }]], size: 9, before: 2, after: 1 });
    nt.forEach(function (x, i) { b.push({ t: 'p', text: (i + 1) + '. ' + x, size: 8.5, after: i === nt.length - 1 ? 6 : 1 }); });
  } else b.push({ t: 'p', text: rk
    ? (c.Kind === 'Hire-in' ? 'Goods received on hire from the supplier above, counted and checked at our gate. They remain the supplier\'s property; hire terms and charges are as agreed with the supplier.' : 'Rented goods returned to the supplier above. Quantities as counted at handover; any difference is noted on this note before signing.')
    : ret ? 'Return count and condition as recorded above are final unless disputed in writing within 48 hours. Damaged and lost items are charged at our current repair or replacement rates.'
    : (job.JobType === 'Sale' || c.Kind === 'Sale') ? 'Received the above goods in good condition and correct quantity. Goods remain our property until paid for in full.'
      : 'Received the above equipment in good condition and correct quantity. The equipment remains the property of Core Access Engineering Ltd. and is at the client’s risk until collected.', size: 8.5, italic: true, color: 'grey', before: 4, after: 12 });
  var three = [['Name', ''], ['Signature', ''], ['Date / time', '']];
  b.push({ t: 'sig', cols: c.Kind === 'Hire-in' ? [{ head: 'Received by (Core Access)', rows: three }, { head: 'Driver', rows: three }, { head: 'Delivered by (supplier)', rows: three }] // Core Access first: the office signature goes there
    : c.Kind === 'Off-hire' ? [{ head: 'Issued by (Core Access)', rows: three }, { head: 'Driver', rows: three }, { head: 'Received by (supplier)', rows: three }]
      : c.Kind === 'Transfer' ? [{ head: 'Issued by', rows: three }, { head: 'Driver / carrier', rows: three }, { head: 'Received by', rows: three }]
        : ret ? [{ head: 'Received by (Core Access)', rows: three }, { head: 'Transporter / driver', rows: three }, { head: 'Handed over by (client)', rows: three }]
          : [{ head: 'Issued by (Core Access)', rows: three }, { head: 'Transporter / driver', rows: three }, { head: 'Received by (client, with seal)', rows: three }] });
  b.push({ t: 'p', text: client ? 'Copy 1: client  ·  Copy 2: Core Access store  ·  Copy 3: accounts (attach to invoice)' : rk ? 'Copy 1: supplier  ·  Copy 2: Core Access store  ·  Copy 3: accounts' : 'Copy 1: issuing store  ·  Copy 2: receiving store',
    size: 7.5, italic: true, color: 'grey', before: 4, after: 0 }); // D1: copy distribution
  return { kind: 'Challans', key: 'ChallanNo', id: no, folder: 'Challans', file: fileName_(c.ChallanNo, c.Kind), docTitle: title.charAt(0) + title.slice(1).toLowerCase(), docNo: c.ChallanNo, blocks: b };
}

function specPO(db, poNo) {
  var po = must(db, 'POs', 'PONo', poNo), su = party_(db, po.SupID);
  var lines = db.rows('POLines').filter(function (l) { return l.PONo === poNo; });
  if (!lines.length) throw new Error(poNo + ' has no lines');
  var items = db.rows('Items'), cols = [{ h: 'No.', w: 28, al: 'C' }, { h: 'Item', w: 62 }, { h: 'Description', w: 162 }, { h: 'Unit', w: 38 }, { h: 'Qty', w: 45, al: 'R' }, { h: 'Rate (BDT)', w: 62, al: 'R' }, { h: 'Amount (BDT)', w: 85, al: 'R' }];
  var rows = lines.map(function (l, i) { var it = find(items, 'ItemCode', l.ItemCode) || {}; var a = r2(num(l.Qty) * num(l.Rate)); return [String(i + 1), dash(l.ItemCode), blank(l.Description) ? dash(it.Name) : String(l.Description), blank(l.Unit) ? dash(it.Unit) : String(l.Unit), qtyTxt(l.Qty), tk(l.Rate), tk(a)]; });
  var sub = r2(sum(lines, function (l) { return r2(num(l.Qty) * num(l.Rate)); })), s = sums_(sub, po.VATPct);
  var dl = find(db.rows('Locations'), 'LocID', po.DeliverTo), to = dl ? (dl.LocID === LOC.YARD ? 'Our yard: ' + S(db, 'YardAddress', '') : dl.Type === 'Site' ? 'Site: ' + siteTxt_(db, dl.SiteID) : dl.Name) : dash(po.DeliverTo);
  var b = [{ t: 'title', text: 'PURCHASE ORDER' },
    { t: 'pairs', rows: [['Supplier', su.Name, 'PO No.', po.PONo], ['Address', su.Address, 'Date', longDate(po.PODate)], ['Contact', su.ContactPerson, 'Job ref.', po.JobNo],
      ['Phone / Email', phoneMail_(su), 'Supplier BIN', su.BIN], ['Deliver to', to, 'Payment terms', su.Terms]] },
    { t: 'p', text: '', after: 6 }, { t: 'grid', cols: cols, rows: rows },
    { t: 'sums', width: 85, rows: s.rows.concat([['Total (BDT)', tk(s.total), true]]) },
    { t: 'p', text: [['Amount in words:  ', { bold: true }], [takaWords(s.total) + '.', {}]], size: 9, before: 8, after: 4 }];
  if (!blank(po.Notes)) b.push({ t: 'p', text: [['Notes:  ', { bold: true }], [String(po.Notes), {}]], size: 9, after: 4 });
  var terms = termsFor(db, 'PO');
  if (terms.length) { b.push({ t: 'h', text: 'TERMS AND CONDITIONS' }); b.push({ t: 'clauses', items: terms.map(function (r) { return [String(r.ClauseNo), r.Title, String(r.Text)]; }) }); }
  b.push({ t: 'sig', cols: [{ head: 'For Core Access Engineering Ltd.', rows: [['Prepared by', ''], ['Approved by', ''], ['Signature', ''], ['Date', '']] }, { head: 'Supplier acceptance', rows: [['Name', ''], ['Signature', ''], ['Delivery date', ''], ['Date', '']] }] });
  return { kind: 'POs', key: 'PONo', id: poNo, folder: 'POs', file: fileName_(po.PONo, su.Name), docTitle: 'Purchase Order', docNo: po.PONo, blocks: b };
}

function specNote(db, noteNo) {
  var n = must(db, 'Notes', 'NoteNo', noteNo), cu = party_(db, n.CustID), job = find(db.rows('Jobs'), 'JobNo', n.JobNo) || {}, cn = n.Kind === 'CN';
  var dm = cn ? [] : db.rows('Damage').filter(function (d) { return d.DNNo === noteNo; }), items = db.rows('Items'), cols, rows, sub;
  if (dm.length) {
    cols = [{ h: 'No.', w: 28, al: 'C' }, { h: 'Item', w: 160 }, { h: 'Return challan', w: 90 }, { h: 'Damaged / lost', w: 70, al: 'R' }, { h: 'Rate (BDT)', w: 49, al: 'R' }, { h: 'Amount (BDT)', w: 85, al: 'R' }];
    rows = []; dm.forEach(function (d) {
      var it = find(items, 'ItemCode', d.ItemCode) || {};
      if (num(d.QtyDamaged)) rows.push(['', dash(it.Name) + ' — repair', dash(d.ChallanNo), qtyTxt(d.QtyDamaged) + ' damaged', tk(it.RepairRate), tk(num(d.QtyDamaged) * num(it.RepairRate))]);
      if (num(d.QtyLost)) rows.push(['', dash(it.Name) + ' — replacement', dash(d.ChallanNo), qtyTxt(d.QtyLost) + ' lost', tk(it.ReplacementCost), tk(num(d.QtyLost) * num(it.ReplacementCost))]);
    });
    rows.forEach(function (r, i) { r[0] = String(i + 1); });
  } else {
    cols = [{ h: 'No.', w: 28, al: 'C' }, { h: 'Description', w: 369 }, { h: 'Amount (BDT)', w: 85, al: 'R' }];
    rows = [['1', dash(n.Reason), tk(n.Amount)]];
  }
  sub = r2(num(n.Amount));
  var s = sums_(sub, n.VATPct);
  var title = cn ? 'CREDIT NOTE' : 'DEBIT NOTE', b = [{ t: 'title', text: title, sub: cn ? 'Amount credited to your account' : 'Additional amount payable' },
    { t: 'pairs', rows: [['To', cu.Name, 'Note No.', n.NoteNo], ['Address', cu.Address, 'Date', longDate(n.NoteDate)], ['Client BIN', cu.BIN, 'Original invoice', n.InvNo],
      ['Job / work order', [n.JobNo, job.ClientWONo].filter(function (x) { return !blank(x); }).join('  /  '), 'Project / Site', siteTxt_(db, job.SiteID)]] },
    { t: 'p', text: [['Reason:  ', { bold: true }], [dash(n.Reason), {}]], size: 9, before: 10, after: 6 },
    { t: 'grid', cols: cols, rows: rows },
    { t: 'sums', width: 85, rows: s.rows.concat([[cn ? 'Total credit (BDT)' : 'Total payable (BDT)', tk(s.total), true]]) },
    { t: 'p', text: [['Amount in words:  ', { bold: true }], [takaWords(s.total) + '.', {}]], size: 9, before: 8, after: 6 },
    { t: 'p', text: 'VAT adjustment by Mushak-' + (cn ? '6.7 (credit note)' : '6.8 (debit note)') + ' against the original Mushak-6.3 invoice, where applicable [verify with accountant].', size: 8.5, italic: true, color: 'grey', after: 6 }];
  if (!cn) { b.push(bank_(db)); b.push({ t: 'p', text: NO_CASH_, size: 8.5, before: 8, after: 10 }); }
  b.push(ourSig_(db, ''));
  return { kind: 'Notes', key: 'NoteNo', id: noteNo, folder: 'Notes', file: fileName_(n.NoteNo, cu.Name), docTitle: cn ? 'Credit Note' : 'Debit Note', docNo: n.NoteNo, blocks: b };
}
var PDF_SPECS = { Quote: specQuote, PI: specPI, Invoice: specInvoice, Challan: specChallan, PO: specPO, Note: specNote };

// ======================================================================= Google Docs renderer
var PDF_C = { ink: '#2B3036', teal: '#1E7F8C', accent: '#2FB3C6', grey: '#5F676E', line: '#C9CED2', band: '#F3F5F6', sky: '#EAF3F8', white: '#FFFFFF' };
var BODY_W = 482; // A4 width minus 2 cm margins, in points
function col_(c) { return PDF_C[c] || c; }
function segs_(v) { return Array.isArray(v) ? v : [[blank(v) ? '' : String(v), {}]]; }
function styleP_(p, v, o) {
  o = o || {};
  var segs = segs_(v), full = segs.map(function (s) { return s[0]; }).join('');
  var HA = DocumentApp.HorizontalAlignment;
  p.setSpacingBefore(o.before || 0).setSpacingAfter(o.after == null ? 4 : o.after).setLineSpacing(o.line || 1.15);
  p.setAlignment(o.align === 'R' ? HA.RIGHT : o.align === 'C' ? HA.CENTER : HA.LEFT);
  if (o.indent) { p.setIndentStart(o.indent); p.setIndentFirstLine(0); }
  if (!full) return p;
  var t = p.editAsText();
  t.setFontFamily('Arial'); t.setFontSize(o.size || 9.5); t.setForegroundColor(col_(o.color || 'ink')); t.setBold(!!o.bold); t.setItalic(!!o.italic);
  var pos = 0;
  segs.forEach(function (s) {
    var n = s[0].length, st = s[1] || {}, e = pos + n - 1;
    if (n) { if (st.bold != null) t.setBold(pos, e, st.bold); if (st.color) t.setForegroundColor(pos, e, col_(st.color)); if (st.size) t.setFontSize(pos, e, st.size); }
    pos += n;
  });
  var re = /\[[^\]]*\]/g, m;
  while ((m = re.exec(full))) t.setForegroundColor(m.index, m.index + m[0].length - 1, PDF_C.teal);
  return p;
}
function para_(body, v, o) { return styleP_(body.appendParagraph(segs_(v).map(function (s) { return s[0]; }).join('')), v, o); }
function table_(body, cells, widths, o) {
  o = o || {};
  var tb = body.appendTable(cells.map(function (r) { return r.map(function (c) { return segs_(c.v).map(function (s) { return s[0]; }).join(''); }); }));
  tb.setBorderWidth(o.border == null ? 0.5 : o.border); tb.setBorderColor(PDF_C.line);
  widths.forEach(function (w, i) { tb.setColumnWidth(i, w); });
  cells.forEach(function (r, i) {
    r.forEach(function (c, j) {
      var cell = tb.getCell(i, j), pd = c.pad || o.pad || [4, 4, 6, 6];
      cell.setPaddingTop(pd[0]).setPaddingBottom(pd[1]).setPaddingLeft(pd[2]).setPaddingRight(pd[3]);
      cell.setVerticalAlignment(c.top ? DocumentApp.VerticalAlignment.TOP : DocumentApp.VerticalAlignment.CENTER);
      if (c.fill) cell.setBackgroundColor(col_(c.fill));
      styleP_(cell.getChild(0).asParagraph(), c.v, { size: c.size || 8.5, bold: c.bold, italic: c.italic, color: c.color, align: c.align, after: 0, indent: c.indent, line: 1.1 });
    });
  });
  return tb;
}
var BLOCKS_ = {
  title: function (body, b) {
    para_(body, b.text, { size: 20, bold: true, after: b.sub ? 0 : 9 });
    if (b.sub) para_(body, b.sub, { size: 10, color: 'teal', bold: true, after: 9 });
  },
  pairs: function (body, b) {
    var L = function (s) { return { v: s, fill: 'band', bold: true, color: 'grey' }; };
    table_(body, b.rows.map(function (r) { return [L(r[0]), { v: dash(r[1]) }, L(r[2]), { v: dash(r[3]) }]; }), [80, 161, 80, 161]);
  },
  p: function (body, b) { para_(body, b.text, b); },
  pic: function (body, b) { /* QP: the quote's picture; a file that can't be read = no picture (the PDF is still made) */
    var p = styleP_(body.appendParagraph(''), '', { align: 'C', before: 2, after: 2, line: 1 });
    if (typeof oSgImgInto_ === 'function' && oSgImgInto_(p, b.f, b.w, b.h)) para_(body, b.cap, { size: 8, italic: true, color: 'grey', align: 'C', after: 8 });
  },
  pics: function (body, b) { /* F3: component pictures, 3 to a row, each with its line no. + name; a file that can't be read = an empty cell (the PDF is still made) */
    if (typeof OSG_NOIMG_ !== 'undefined' && OSG_NOIMG_) return;
    var n = 3, w = Math.floor(BODY_W / n), rows = [], got = 0;
    for (var i = 0; i < b.items.length; i += n) rows.push(b.items.slice(i, i + n));
    var hd = para_(body, 'Component pictures', { size: 9, bold: true, before: 8, after: 3 });
    var tb = body.appendTable(rows.map(function () { var a = []; for (var k = 0; k < n; k++) a.push(''); return a; }));
    tb.setBorderWidth(0); for (var k = 0; k < n; k++) tb.setColumnWidth(k, w);
    rows.forEach(function (r, ri) { r.forEach(function (x, ci) {
      var cell = tb.getCell(ri, ci); cell.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(4).setPaddingRight(4);
      var p = styleP_(cell.getChild(0).asParagraph(), '', { align: 'C', after: 2, line: 1 });
      if (typeof oSgImgInto_ === 'function' && oSgImgInto_(p, x.f, w - 14, 110)) { got++; styleP_(cell.appendParagraph(x.cap), x.cap, { size: 7.5, color: 'grey', align: 'C', after: 0, line: 1 }); }
    }); });
    if (got) para_(body, b.cap, { size: 8, italic: true, color: 'grey', align: 'C', after: 8 });
    else { try { tb.removeFromParent(); hd.removeFromParent(); } catch (e) { /* kept: only an empty table */ } }
  },
  h: function (body, b) { para_(body, b.text, { size: 10.5, bold: true, color: 'teal', before: 15, after: 6 }); },
  grid: function (body, b) {
    var head = b.cols.map(function (c) { return { v: c.h, fill: 'ink', color: 'white', bold: true, align: c.al }; });
    var rows = b.rows.map(function (r, i) {
      var last = b.boldLast && i === b.rows.length - 1;
      return r.map(function (v, j) { return { v: v, align: b.cols[j].al, fill: last ? 'sky' : (i % 2 ? 'band' : null), bold: last }; });
    });
    table_(body, [head].concat(rows), b.cols.map(function (c) { return c.w; }));
  },
  sums: function (body, b) {
    var vw = b.width || 85, lw = 160;
    table_(body, b.rows.map(function (r) {
      var strong = r[2];
      return [{ v: '' }, { v: r[0], fill: strong ? 'teal' : 'sky', bold: true, color: strong ? 'white' : 'ink', align: 'R', size: strong ? 9 : 8.5 },
        { v: r[1], fill: strong ? 'teal' : 'sky', bold: !!strong, color: strong ? 'white' : 'ink', align: 'R', size: strong ? 9 : 8.5 }];
    }), [BODY_W - lw - vw, lw, vw], { border: 0, pad: [3, 3, 6, 6] });
  },
  clauses: function (body, b) {
    table_(body, b.items.map(function (it) {
      var n = it[0], sub = /^[a-z]$/.test(n), text = sub ? [['(' + n + ')  ', { color: 'grey' }], [String(it[2]), {}]]
        : (it[1] ? [[String(it[1]) + '. ', { bold: true }], [String(it[2]), {}]] : [[String(it[2]), {}]]);
      return [{ v: sub ? '' : n, bold: true, color: 'teal', size: 9, top: true }, { v: text, size: 9, top: true, indent: sub ? 18 : 0 }];
    }), [36, BODY_W - 36], { border: 0, pad: [1.5, 3.5, 0, 3] });
  },
  kv: function (body, b) {
    if (b.head) para_(body, b.head, { size: 9, bold: true, color: 'teal', before: 4, after: 3 });
    table_(body, b.rows.map(function (r) { return [{ v: r[0], fill: 'band', bold: true, color: 'grey' }, { v: r[1] }]; }), [110, BODY_W - 110], { pad: [3, 3, 6, 6] });
  },
  sig: function (body, b) {
    var n = b.cols.length, cw = BODY_W / n, lab = n > 2 ? 52 : 70, widths = [], rows = [], max = 0;
    b.cols.forEach(function (c) { widths.push(lab, cw - lab); max = Math.max(max, c.rows.length); });
    if (n === 1) para_(body, b.cols[0].head, { size: 9, bold: true, color: 'teal', before: 4, after: 0 });
    else table_(body, [b.cols.map(function (c) { return { v: c.head, bold: true, color: 'teal', size: 9 }; })], b.cols.map(function () { return cw; }), { border: 0, pad: [4, 0, 0, 4] });
    for (var i = 0; i < max; i++) rows.push([].concat.apply([], b.cols.map(function (c) {
      var r = c.rows[i] || ['', '']; return [{ v: r[0], color: 'grey', size: 8.5, pad: [14, 2, 0, 4] }, { v: blank(r[1]) ? (r[0] ? '______________________________'.slice(0, n > 2 ? 18 : 30) : '') : r[1], size: 9, pad: [14, 2, 0, 8] }];
    })));
    table_(body, rows, widths, { border: 0 });
  },
  seal: function (body) { table_(body, [[{ v: '', pad: [60, 0, 0, 0] }]], [140], { border: 0.75 }); },
  page: function (body) { body.appendPageBreak(); },
};
function renderInto(doc, spec, co) {
  var body = doc.getBody(), parent = body.getParent(), T = DocumentApp.ElementType;
  var tok = { CoAddr1: co.CoAddr1, CoAddr2: co.CoAddr2, CoPhone: co.CoPhone, CoEmail: co.CoEmail, CoWeb: co.CoWeb, CoReg: co.CoReg, DocTitle: spec.docTitle, DocNo: spec.docNo };
  for (var i = 0; i < parent.getNumChildren(); i++) {
    var ch = parent.getChild(i), ty = ch.getType(), sec = ty === T.HEADER_SECTION ? ch.asHeaderSection() : ty === T.FOOTER_SECTION ? ch.asFooterSection() : null;
    if (sec) Object.keys(tok).forEach(function (k) { sec.replaceText('\\{\\{' + k + '\\}\\}', String(tok[k] == null ? '' : tok[k]).replace(/\\/g, '\\\\').replace(/\$/g, '\\$')); });
  }
  spec.blocks.forEach(function (b) { if (!BLOCKS_[b.t]) throw new Error('Unknown block ' + b.t); BLOCKS_[b.t](body, b); });
  var first = body.getChild(0);
  if (body.getNumChildren() > 1 && first.getType() === T.PARAGRAPH && first.asParagraph().getText() === '') first.removeFromParent();
  return doc;
}

// ======================================================================= Drive files
function subFolder_(parent, name) { var it = parent.getFoldersByName(name); return it.hasNext() ? it.next() : parent.createFolder(name); }
function opsFolder_(db) {
  var id = S(db, 'DriveFolderID', '');
  if (blank(id)) throw new Error('Settings › DriveFolderID is empty (Core Access Ops folder id)');
  return DriveApp.getFolderById(id);
}
function baseDocId_(db) {
  var id = S(db, 'DocBaseID', '');
  if (!blank(id)) return id;
  var it = subFolder_(opsFolder_(db), 'Templates').getFilesByName('CAE Doc Base');
  if (!it.hasNext()) throw new Error('Google Doc "CAE Doc Base" not found in Templates (or set Settings › DocBaseID)');
  return it.next().getId();
}
function trashSame_(folder, name, keep) { var it = folder.getFilesByName(name); while (it.hasNext()) { var f = it.next(); if (!keep || keep.indexOf(f.getId()) < 0) f.setTrashed(true); } } // CR M8 run 2: keep = ids not to bin (the new copy of the same name)
// Builds the document, saves the PDF and writes its link to the row (when the tab has a PDF column).
function makePdf(db, what, no, o) {
  o = o || {};
  if (!PDF_SPECS[what]) throw new Error('Unknown document ' + what);
  var spec = PDF_SPECS[what](db, no), co = co_(db);
  var root = o.folder || subFolder_(subFolder_(opsFolder_(db), 'PDF'), spec.folder), keep = S(db, 'KeepPdfDocs', 'Yes') === 'Yes';
  var docDir = keep ? subFolder_(root, 'Editable') : root;
  trashSame_(docDir, spec.file); trashSame_(root, spec.file + '.pdf');
  var copy = DriveApp.getFileById(baseDocId_(db)).makeCopy(spec.file, docDir), doc = DocumentApp.openById(copy.getId());
  renderInto(doc, spec, co); doc.saveAndClose();
  var pdf = root.createFile(copy.getAs(MimeType.PDF).setName(spec.file + '.pdf'));
  if (!keep) copy.setTrashed(true);
  var row = find(db.rows(spec.kind), spec.key, no);
  if (row && db.headers(spec.kind).indexOf('PDF') >= 0 && !o.noLink) db.update(spec.kind, row, { PDF: pdf.getUrl() });
  var left = (JSON.stringify(spec.blocks).match(/\[[^\]"]*\]/g) || []).filter(function (x) { return !/^\[(to fill in Settings|verify with accountant)\]$/.test(x); }).length;
  if (!o.noLog) log_(db, 'PDF', no, spec.file + '.pdf' + (left ? ' · ' + left + ' placeholders' : ''));
  return { url: pdf.getUrl(), doc: keep ? copy.getUrl() : '', file: spec.file + '.pdf', placeholders: left };
}

// ======================================================================= sheet upgrade for O3 (run once; safe to repeat)
var RENTAL_REWORD_ = [
  ['2.2', 'Hire beyond the quoted period is charged at BDT [rate] per [m² / set / pc] per week.', 'Hire beyond the quoted period continues at the monthly rates in Section 2 and is charged as set out in clause 3.2.'],
  ['3.2', 'Hire starts on the date of delivery and ends on the date of collection, as recorded on our delivery and return challans. Minimum hire is [__] weeks; part weeks are charged as full weeks.', 'Hire is charged per month of {{PeriodDays}} days. It starts on the date of delivery and ends on the date of collection, as recorded on our delivery and return challans, and is invoiced monthly in advance. Minimum hire is {{MinMonths}}; {{PartPeriod}}.'],
  ['3.3', 'The client shall give at least [7] days’ written notice to off-hire. Hire continues until the equipment is available for collection.', 'The client shall give at least {{NoticeDays}} days’ written notice to off-hire. Hire continues until the equipment is available for collection.'],
  ['4.1', '[__]% advance with the work order. Hire charges are invoiced monthly in advance. All other invoices are payable within [7] days of the invoice date.', '{{AdvancePct}} advance with the work order, set off against our first hire invoice. Hire charges are invoiced monthly in advance. All other invoices are payable within {{PaymentDays}} days of the invoice date.'],
  ['4.2', 'By account payee cheque, pay order or bank transfer in the name of Core Access Engineering Ltd. only. Cash payments are valid only against our official money receipt.', 'By account payee cheque, pay order or bank transfer in the name of Core Access Engineering Ltd. only. We do not accept cash.'],
  ['4.4', 'Any amount not paid by its due date carries interest at [2]% per month from the due date until paid in full.', 'Any amount not paid by its due date carries interest at {{LateInterest}} per month from the due date until paid in full.'],
  ['7.1', 'This quotation is valid for 30 days from its date. Prices may be revised after that date.', 'This quotation is valid for {{ValidityDays}} days from its date. Prices may be revised after that date.'],
];
var LAW_ = 'This contract is governed by the laws of Bangladesh, including the Contract Act, 1872. Any dispute shall first be negotiated in good faith for 30 days and, failing settlement, referred to a sole arbitrator in Dhaka under the Arbitration Act, 2001, in English. The award is final and binding. This does not prevent us from seeking recovery of undisputed amounts or urgent relief from the courts of Dhaka.';
var SEVER_ = 'If any clause is found unenforceable, the remaining clauses continue in full force. A delay in enforcing any right is not a waiver of it.';
var CHEQUE_ = 'A dishonoured cheque is treated as non-payment. We reserve the right to take action under the Negotiable Instruments Act, 1881, in addition to all other remedies.';
var ACCEPT_ = 'This quotation is accepted by signature, by issue of a work order or purchase order, or by allowing us to proceed. It then forms the entire agreement and prevails over any terms in the client\'s order or other documents. Any amendment must be in writing and signed by both parties.';
var STAGES_ = 'Lump-sum items shown with the duration "Stages" are invoiced in the stages and percentages set out in the payment schedule. A stage is due when that stage of the works is complete, as recorded in our site report, handover certificate or challan, whether or not the client has started to use the works.';
// [section, section title, clause no., title, text]
var TC_PROJECT_ = {
  replace: {
    '1.1': 'Works|[Description of the project works, e.g. design, supply, erection, inspection and dismantling of access scaffolding to the boiler house, approx. [area] m² / [volume] m³.]',
    '3.2': 'Charge period|Charges with a duration run per month of {{PeriodDays}} days from the date of first delivery until the off-hire date or the end of the notice period in clause 3.3, whichever is later; {{PartPeriod}}. The minimum charge period is {{MinMonths}}. Extension beyond the quoted duration is charged at the monthly rates in Section 2.',
    '4.1': 'Schedule|{{AdvancePct}} advance with the work order, set off against our first invoices. {{BillingSchedule}} All other invoices are payable within {{PaymentDays}} days of the invoice date.',
  },
  section2: [
    ['2', 'Commercial Offer', '2.1', 'Prices', 'All prices are in Bangladeshi Taka and exclusive of VAT. VAT is added at the rate in force on the invoice date.'],
    ['2', 'Commercial Offer', '2.2', 'Measurement', 'Area (m²) is measured on the scaffold face and volume (m³) as length × width × height of the scaffold, from the approved layout drawing. Set prices are per complete set as described in Section 2. The final account is based on the quantities actually erected, measured jointly with the client\'s representative.'],
    ['2', 'Commercial Offer', '2.3', 'Stage payments', STAGES_],
    ['2', 'Commercial Offer', '2.4', 'Lump sums', 'Lump-sum prices cover the scope, layout and programme described in this quotation only. Any change is a variation (clause 7.3).'],
  ],
};
var TC_SERVICE_ = [
  ['1', 'Scope of Services', '1.1', 'Services', '[Description, e.g. scaffold design, inspection and tagging of client-owned scaffolds, or work-at-height risk assessment at [site].]'],
  ['1', 'Scope of Services', '1.2', 'Standard', 'Our services are carried out in accordance with Singapore standards and Codes of Practice adopted as Core Access company standard, and in compliance with applicable Bangladesh law, including the Bangladesh National Building Code (BNBC) 2020 and the Bangladesh Labour Act, 2006.'],
  ['1', 'Scope of Services', '1.3', 'Deliverables', 'We shall provide:'],
  ['1', 'Scope of Services', 'a', '', '[drawings / calculations / inspection reports / tags / training records] as listed in Section 2; and'],
  ['1', 'Scope of Services', 'b', '', 'a short written record of findings after each site visit.'],
  ['1', 'Scope of Services', '1.4', 'Basis', 'This offer is based on [drawings / site visit on date / client information]. Any change to that information is a variation (clause 6.3).'],
  ['2', 'Fees', '2.1', 'Prices', 'All fees are in Bangladeshi Taka and exclusive of VAT. VAT is added at the rate in force on the invoice date.'],
  ['2', 'Fees', '2.2', 'Visits and time', 'A fee per visit or per day covers one engineer for up to [8] hours on site. Extra time, extra visits, and night or holiday work are charged at the rates in Section 2 or as agreed in writing.'],
  ['2', 'Fees', '2.3', 'Stage payments', 'Lump-sum items shown with the duration "Stages" are invoiced in the stages and percentages set out in the payment schedule. A stage is due when the related deliverable is issued or the related visit is completed.'],
  ['3', 'Programme', '3.1', 'Start', 'Within [__] working days of receipt of the signed work order and advance payment, subject to site access.'],
  ['3', 'Programme', '3.2', 'Client delay', 'Time lost because the site, information or access is not ready is charged at our day rate.'],
  ['4', 'Payment Terms', '4.1', 'Schedule', '{{AdvancePct}} advance with the work order, set off against our first invoices. {{BillingSchedule}} All invoices are payable within {{PaymentDays}} days of the invoice date.'],
  ['4', 'Payment Terms', '4.2', 'Method', 'By account payee cheque, pay order or bank transfer in the name of Core Access Engineering Ltd. only. We do not accept cash.'],
  ['4', 'Payment Terms', '4.3', 'Late payment', 'Any amount not paid by its due date carries interest at {{LateInterest}} per month from the due date until paid in full.'],
  ['4', 'Payment Terms', '4.4', 'Suspension', 'If any amount remains unpaid [7] days after its due date, we may suspend the services on written notice. We are not liable for any delay caused by a suspension under this clause.'],
  ['4', 'Payment Terms', '4.5', 'Dishonoured cheques', CHEQUE_],
  ['4', 'Payment Terms', '4.6', 'VAT', 'VAT is charged on our Mushak-6.3 tax invoice. Where the client deducts VAT at source, the deducted amount counts as paid only when we receive the Mushak-6.6 certificate, which the client shall provide within [15] days of payment.'],
  ['5', 'Client Obligations', '', '', 'The client shall, at its own cost:'],
  ['5', 'Client Obligations', 'a', '', 'provide safe access to the work areas and a site safety induction for our engineers;'],
  ['5', 'Client Obligations', 'b', '', 'provide drawings and information we reasonably request, in good time;'],
  ['5', 'Client Obligations', 'c', '', 'stop the use of any scaffold we report as unsafe until it has been made safe; and'],
  ['5', 'Client Obligations', 'd', '', 'name a site representative to receive our reports and tags.'],
  ['6', 'General Terms and Conditions', '6.1', 'Validity', 'This quotation is valid for {{ValidityDays}} days from its date.'],
  ['6', 'General Terms and Conditions', '6.2', 'Acceptance and entire agreement', ACCEPT_],
  ['6', 'General Terms and Conditions', '6.3', 'Variations', 'Any change in scope or programme requires a written variation and is charged at the rates in Section 2 or as agreed in writing.'],
  ['6', 'General Terms and Conditions', '6.4', 'Scope of responsibility', 'Our reports and tags record the condition of a scaffold at the time of inspection only. The client remains responsible for the safe use, alteration and maintenance of scaffolds it owns or controls. We do not accept responsibility for scaffolds erected or altered by others unless we have inspected and accepted them in writing.'],
  ['6', 'General Terms and Conditions', '6.5', 'Engineering certification', 'Design calculations and certified drawings are provided only where priced in Section 2. Certification by a Bangladesh-registered Professional Engineer, where required, is a separate priced item.'],
  ['6', 'General Terms and Conditions', '6.6', 'Drawings and confidentiality', 'Our drawings, calculations, reports and design documents remain our property, may be used only for this project, and shall not be copied or disclosed without our written consent.'],
  ['6', 'General Terms and Conditions', '6.7', 'Limitation of liability', 'Our total liability under this contract shall not exceed the fees paid for the services. We are not liable for any indirect or consequential loss, including loss of profit or delay damages under the client\'s main contract.'],
  ['6', 'General Terms and Conditions', '6.8', 'Force majeure', 'Neither party is liable for delay caused by events beyond its reasonable control, including natural disaster, severe weather, hartal, blockade, civil unrest or government restriction.'],
  ['6', 'General Terms and Conditions', '6.9', 'Governing law and disputes', LAW_],
  ['6', 'General Terms and Conditions', '6.10', 'Severability and waiver', SEVER_],
];
var TC_SALE_ = [
  ['1', 'Supply', '1.1', 'Goods', 'The goods listed in Section 2, new unless stated otherwise, to the description given there.'],
  ['1', 'Supply', '1.2', 'Standards and certificates', 'Goods are supplied to the manufacturer\'s specification [and the standard stated in Section 2]. Test or mill certificates are provided only where stated.'],
  ['2', 'Commercial Offer', '2.1', 'Prices', 'All prices are in Bangladeshi Taka and exclusive of VAT. VAT is added at the rate in force on the invoice date.'],
  ['2', 'Commercial Offer', '2.2', 'Transport', 'Prices are ex our yard at Uttarkhan, Dhaka, unless transport is priced in Section 2. Unloading at site is by the client.'],
  ['2', 'Commercial Offer', '2.3', 'Quantities', 'Goods are counted at loading. The delivery challan is conclusive unless a shortage is noted on it at delivery.'],
  ['3', 'Delivery', '3.1', 'Delivery time', 'Within [__] working days of receipt of the purchase order and advance payment, subject to stock.'],
  ['3', 'Delivery', '3.2', 'Inspection', 'The client shall inspect the goods on delivery and note any shortage or visible damage on the delivery challan. Other defects must be notified in writing within 7 days of delivery.'],
  ['3', 'Delivery', '3.3', 'Risk', 'Risk in the goods passes to the client on delivery.'],
  ['4', 'Payment Terms', '4.1', 'Schedule', '{{AdvancePct}} advance with the purchase order. {{BillingSchedule}} Invoices are payable within {{PaymentDays}} days of the invoice date.'],
  ['4', 'Payment Terms', '4.2', 'Method', 'By account payee cheque, pay order or bank transfer in the name of Core Access Engineering Ltd. only. We do not accept cash.'],
  ['4', 'Payment Terms', '4.3', 'Late payment', 'Any amount not paid by its due date carries interest at {{LateInterest}} per month from the due date until paid in full.'],
  ['4', 'Payment Terms', '4.4', 'Dishonoured cheques', CHEQUE_],
  ['4', 'Payment Terms', '4.5', 'VAT and tax at source', 'VAT is charged on our Mushak-6.3 tax invoice. Where the client deducts VAT or income tax at source, the deducted amount counts as paid only when we receive the Mushak-6.6 or tax deduction certificate, which the client shall provide within [15] days of payment.'],
  ['5', 'General Terms and Conditions', '5.1', 'Validity', 'This quotation is valid for {{ValidityDays}} days from its date, subject to stock remaining unsold.'],
  ['5', 'General Terms and Conditions', '5.2', 'Acceptance and entire agreement', ACCEPT_],
  ['5', 'General Terms and Conditions', '5.3', 'Ownership', 'Goods remain our property until paid for in full.'],
  ['5', 'General Terms and Conditions', '5.4', 'Warranty', 'Goods are covered against manufacturing defects for [3] months from delivery. Our liability is limited to repair or replacement of the defective goods. The warranty does not cover wear, misuse, overloading, alteration or use contrary to the manufacturer\'s instructions.'],
  ['5', 'General Terms and Conditions', '5.5', 'Returns', 'Goods supplied to order cannot be returned. Other goods may be returned only with our written consent, unused and in their original condition, subject to a handling charge of [__]%.'],
  ['5', 'General Terms and Conditions', '5.6', 'Safe use', 'Scaffold components must be erected, used and inspected by competent persons in accordance with the applicable codes of practice. We are not responsible for structures erected by others using goods we supply.'],
  ['5', 'General Terms and Conditions', '5.7', 'Limitation of liability', 'Our total liability shall not exceed the price of the goods concerned. We are not liable for any indirect or consequential loss.'],
  ['5', 'General Terms and Conditions', '5.8', 'Force majeure', 'Neither party is liable for delay caused by events beyond its reasonable control, including natural disaster, severe weather, hartal, blockade, civil unrest or government restriction.'],
  ['5', 'General Terms and Conditions', '5.9', 'Governing law and disputes', LAW_],
];
var TC_PO_ = [
  ['1', 'Terms and Conditions', '1.1', 'Acceptance', 'Please confirm this order in writing within 2 working days, with the delivery date.'],
  ['1', 'Terms and Conditions', '1.2', 'Delivery', 'Deliver to the address above, Saturday to Thursday, 9 am to 5 pm, with a delivery challan quoting this PO number. Part deliveries only with our consent.'],
  ['1', 'Terms and Conditions', '1.3', 'Quality and certificates', 'Goods must be new, to the specification stated, and come with mill or test certificates where applicable. We may reject goods that do not conform.'],
  ['1', 'Terms and Conditions', '1.4', 'Quantities and prices', 'We pay only for quantities received in good condition, at the rates in this order. Rates are fixed for this order.'],
  ['1', 'Terms and Conditions', '1.5', 'Invoice and VAT', 'Submit your invoice with Mushak-6.3 quoting this PO number. VAT and income tax are deducted at source where the law requires, and the certificates are provided to you [verify with accountant].'],
  ['1', 'Terms and Conditions', '1.6', 'Payment', 'Within [30] days of receipt of the goods and a correct invoice, by account payee cheque or bank transfer. We do not pay in cash.'],
  ['1', 'Terms and Conditions', '1.7', 'Warranty', 'The supplier warrants the goods against defects for [12] months from delivery and shall replace defective goods at its own cost.'],
  ['1', 'Terms and Conditions', '1.8', 'Cancellation', 'We may cancel any part of this order not delivered by the agreed date without liability.'],
];
function insertTerms_(db, type, rows, start) {
  var ids = nextIds(db, 'TC', rows.length);
  db.insert('Terms', rows.map(function (r, i) { return { ClauseID: ids[i], QuoteType: type, Section: r[0], SectionTitle: r[1], ClauseNo: r[2], Title: r[3], Text: r[4], SortOrder: start + (i + 1) * 10, Active: 'Yes' }; }));
  return rows.length;
}
function upgradeO3(db, o) {
  o = o || {};
  var done = [];
  if (db.ensureColumn('QuoteLines', 'Billing', 'Months')) done.push('QuoteLines.Billing');
  if (db.ensureColumn('Challans', 'PDF', 'SignedPhoto')) done.push('Challans.PDF');
  if (db.ensureTab('Milestones', ['MilestoneID', 'QuoteNo', 'JobNo', 'StageNo', 'Stage', 'Pct', 'Amount', 'Status', 'ReachedDate', 'InvNo', 'Notes'], ['Amount'])) done.push('Milestones tab');
  if (db.ss) {
    var s = db.sheet('QuoteLines'), j = db.headers('QuoteLines').indexOf('Billing') + 1;
    s.getRange(2, j, Math.max(s.getMaxRows() - 1, 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['One-off', 'Monthly', 'Milestone'], true).setAllowInvalid(false).build());
    var m = db.sheet('Milestones'), mh = db.headers('Milestones');
    m.getRange(2, mh.indexOf('Pct') + 1, 999, 1).setNumberFormat('0%');
    m.getRange(2, mh.indexOf('Amount') + 1, 999, 1).setNumberFormat('#,##0.00');
    m.getRange(2, mh.indexOf('ReachedDate') + 1, 999, 1).setNumberFormat('dd-mmm-yyyy');
    m.getRange(2, mh.indexOf('Status') + 1, 999, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Pending', 'Reached', 'Invoiced', 'Cancelled'], true).build());
  }
  var setRows = [['MilestoneStages', 'Erection complete:40|Mid-way:30|Dismantling complete:30', 'Default stages (name:% | …) for lump-sum lines with Billing = Milestone. To confirm.'],
    ['DocBaseID', o.docBaseId || '', 'Google Doc "CAE Doc Base" in Templates (letterhead, header, footer)'], ['KeepPdfDocs', 'Yes', 'Keep the editable Google Doc next to each PDF (PDF/<type>/Editable)']];
  setRows.forEach(function (r) { var x = find(db.rows('Settings'), 'Key', r[0]); if (!x) { db.insert('Settings', { Key: r[0], Value: r[1], Notes: r[2] }); done.push('Settings.' + r[0]); } else if (blank(x.Value) && r[1]) db.update('Settings', x, { Value: r[1] }); });
  if (!find(db.rows('Sequences'), 'SeqKey', 'MS')) { db.insert('Sequences', { SeqKey: 'MS', Prefix: 'MS-', Year: '', Pad: 5, LastNo: 0 }); done.push('Sequences.MS'); }
  // Terms: reword Rental (only where the text is still the original), then add Project / Service / Sale / PO sets once.
  var rental = db.rows('Terms').filter(function (t) { return t.QuoteType === 'Rental'; }), rw = 0;
  RENTAL_REWORD_.forEach(function (x) { var t = find(rental, 'ClauseNo', x[0]); if (t && String(t.Text).trim() === x[1]) { db.update('Terms', t, { Text: x[2] }); rw++; } });
  if (rw) done.push(rw + ' Rental clauses reworded');
  var has = function (type) { return db.rows('Terms').some(function (t) { return String(t.QuoteType).split(',').map(function (x) { return x.trim(); }).indexOf(type) >= 0; }); };
  if (!has('Project') && rental.length) {
    var rows = [], r2s = TC_PROJECT_.section2;
    rental.slice().sort(function (a, b) { return num(a.SortOrder) - num(b.SortOrder); }).forEach(function (t) {
      if (String(t.Section) === '2') { if (r2s) { rows = rows.concat(r2s); r2s = null; } return; }
      var rep = /^\d+\.\d+$/.test(String(t.ClauseNo)) ? TC_PROJECT_.replace[String(t.ClauseNo)] : null, p = rep ? rep.split('|') : null;
      rows.push([String(t.Section), t.SectionTitle, String(t.ClauseNo), p ? p[0] : t.Title, p ? p[1] : t.Text]);
    });
    done.push(insertTerms_(db, 'Project', rows, 1000) + ' Project clauses');
  }
  if (!has('Service')) done.push(insertTerms_(db, 'Service', TC_SERVICE_, 2000) + ' Service clauses');
  if (!has('Sale')) done.push(insertTerms_(db, 'Sale', TC_SALE_, 3000) + ' Sale clauses');
  if (!has('PO')) done.push(insertTerms_(db, 'PO', TC_PO_, 4000) + ' PO clauses');
  var v = find(db.rows('Settings'), 'Key', 'DBVersion'); if (v) db.update('Settings', v, { Value: 'O3 (10 Nov 2026)' });
  log_(db, 'Upgrade O3', '', done.join('; ') || 'nothing to do');
  return done;
}

// ======================================================================= menu
function pdfMenu_(what, label, prompt) {
  var n = ask_(prompt);
  ui_(label + ' PDF', function (db) {
    var r = makePdf(db, what, n);
    return r.file + ' saved in Core Access Ops › PDF.\n\nPDF: ' + r.url + (r.doc ? '\nEditable Doc: ' + r.doc : '') + (r.placeholders ? '\n\n' + r.placeholders + ' [placeholder] text(s) still to fill — shown in teal. Edit the Terms tab (or the Doc) before sending.' : '');
  });
}
function menuPdfQuote() { pdfMenu_('Quote', 'Quotation', 'Quote no. (e.g. CAE/Q/2026/002)'); }
function menuPdfPI() { pdfMenu_('PI', 'Proforma', 'PI no.'); }
function menuPdfInvoice() { pdfMenu_('Invoice', 'Invoice', 'Invoice no.'); }
function menuPdfChallan() { pdfMenu_('Challan', 'Challan', 'Challan no.'); }
function menuPdfPO() { pdfMenu_('PO', 'Purchase order', 'PO no.'); }
function menuPdfNote() { pdfMenu_('Note', 'Note', 'Debit / credit note no.'); }
var DOC_BASE_ID_ = '1piDTE_BrviHUAbB72fjt0bxI27Y_0FR_v-YFBP_Wqks'; // Templates › CAE Doc Base (uploaded 10 Nov 2026)
function menuUpgradeO3() { ui_('Upgrade sheet for O3', function (db) { var d = upgradeO3(db, { docBaseId: DOC_BASE_ID_ }); assignIds(db); return d.length ? 'Done:\n' + d.join('\n') : 'Already up to date.'; }); }
// Sample set: builds every document type from the self-test data into PDF/_Samples (your data is not touched).
function menuPdfSamples() {
  ui_('PDF sample set', function (sdb) {
    var db = pdfTestDb_(), folder = subFolder_(subFolder_(opsFolder_(sdb), 'PDF'), '_Samples'), out = [];
    ['Settings'].forEach(function (t) { db.t[t] = sdb.rows(t).map(function (r) { return Object.assign({}, r); }); });
    pdfSampleList_(db).forEach(function (x) { var r = makePdf(db, x[0], x[1], { folder: folder, noLink: true, noLog: true }); out.push(r.file); });
    return out.length + ' sample PDFs in PDF › _Samples:\n' + out.join('\n');
  });
}

// ======================================================================= self-test (in memory)
function pdfTestDb_() {
  var db = testSeed_('Full period');
  db.rows('Settings').push({ Key: 'DriveFolderID', Value: 'x' }, { Key: 'OfficeAddress', Value: 'H/39, Block-E, Zakir Hussain Road, Mohammadpur, Dhaka-1207, Bangladesh' }, { Key: 'YardAddress', Value: 'Dag No. 2307, Gobindapur, Uttarkhan, Dhaka' }, { Key: 'Email', Value: 'info.coreaccess@gmail.com' });
  db.insert('Terms', [{ ClauseID: 'TC-0001', QuoteType: 'Rental', Section: '1', SectionTitle: 'Scope of Work', ClauseNo: '1.1', Title: 'Works', Text: '[Description]', SortOrder: 10, Active: 'Yes' }]);
  RENTAL_REWORD_.forEach(function (x, i) { var sec = x[0].split('.')[0], ti = { 2: 'Commercial Offer', 3: 'Programme', 4: 'Payment Terms', 7: 'General Terms and Conditions' }[sec];
    db.insert('Terms', { ClauseID: 'TC-' + pad(i + 2, 4), QuoteType: 'Rental', Section: sec, SectionTitle: ti, ClauseNo: x[0], Title: 'T' + x[0], Text: x[1], SortOrder: 100 + num(x[0]) * 100, Active: 'Yes' }); });
  db.update('Sequences', find(db.rows('Sequences'), 'SeqKey', 'TC'), { LastNo: 8 });
  var c = db.rows('Customers')[0]; c.Address = 'Ghorashal, Narsingdi'; c.BIN = '000123456-0101'; c.Phone = '+880 1711-000000';
  testQuote_(db, 'CAE/Q/2026/001', 'Rental', [['RL-STD-20', 'Ringlock standard 2.0 m', 'pc', 50, 2, 100], ['BD-ST-207', 'Steel board 2.07 m', 'pc', 20, 2, 50], ['SV-TRANS', 'Transport: delivery and collection', 'trip', 1, '', 5000], ['', 'Design calculations (Singapore PE firm)', 'lot', 1, '', 25000, '', 'Yes', 'No']], { MinMonths: 2, Attention: 'Mr. A. Karim, Project Manager' });
  testQuote_(db, 'CAE/Q/2026/002', 'Sale', [['TC-TUBE-3', 'MS tube 3.0 m', 'pc', 24, '', 1250], ['SV-TRANS', 'Transport', 'trip', 1, '', 3000]], { Notes: 'Include AIT' });
  testQuote_(db, 'CAE/Q/2026/003', 'Project', [['', 'Scaffold to boiler house, design + supply + erect + dismantle', 'lot', 1, '', 174000, 'Milestone'], ['SV-AREA-M2', 'Façade scaffold hire', 'm²', 500, 2, 80]], { AdvancePct: 0.5 });
  testQuote_(db, 'CAE/Q/2026/004', 'Service', [['', 'Inspection and tagging, per visit', 'visit', 4, '', 6000]]);
  return db;
}
function pdfSampleList_(db) {
  var job = quoteToJob(db, 'CAE/Q/2026/001', { date: '22-Nov-2026' }), pi = quoteToPI(db, 'CAE/Q/2026/001', { date: '20-Nov-2026' });
  postOpeningStock(db, [{ ItemCode: 'RL-STD-20', Qty: 100 }, { ItemCode: 'BD-ST-207', Qty: 40 }], '01-Nov-2026');
  var dc = createChallan(db, { jobNo: job, date: '01-Dec-2026', vehicle: 'Dhaka Metro-Ta 11-2233', driver: 'Rahim', lines: [{ itemCode: 'RL-STD-20', qty: 50 }, { itemCode: 'BD-ST-207', qty: 20 }] });
  postChallan(db, dc);
  var inv = runHireBilling(db, '01-Dec-2026').invoices[0].no;
  var rt = createChallan(db, { kind: 'Return', jobNo: job, date: '20-Dec-2026', lines: [{ itemCode: 'BD-ST-207', qty: 20, qtyDamaged: 1, qtyLost: 1, remarks: 'bent' }] });
  postChallan(db, rt);
  var dn = damageToDebitNote(db, job, { date: '22-Dec-2026', invNo: inv });
  db.insert('POs', { PONo: 'CAE/PO/2026/001', SupID: 'SUP-0001', PODate: toDate('01-Dec-2026'), DeliverTo: 'LOC-YARD', Status: 'Draft', VATPct: 0.15 });
  db.insert('POLines', [{ LineID: 'POL-00001', PONo: 'CAE/PO/2026/001', ItemCode: 'TC-TUBE-3', Qty: 30, Rate: 900 }]);
  var j3 = quoteToJob(db, 'CAE/Q/2026/003', { date: '22-Nov-2026' });
  reachMilestone(db, j3, 1, '05-Dec-2026');
  var mi = invoiceMilestones(db, j3, { date: '05-Dec-2026' }).no;
  return [['Quote', 'CAE/Q/2026/001'], ['Quote', 'CAE/Q/2026/002'], ['Quote', 'CAE/Q/2026/003'], ['Quote', 'CAE/Q/2026/004'], ['PI', pi], ['Invoice', inv], ['Invoice', mi], ['Challan', dc], ['Challan', rt], ['PO', 'CAE/PO/2026/001'], ['Note', dn]];
}
function selfTestPdf() {
  var T = testKit_(), eq = T.eq, throws = T.throws, step = T.step;
  step('P formatting', function () {
    eq('P1 BD grouping', tk(17400000.5), '1,74,00,000.50'); eq('P2 small', tk(950), '950.00'); eq('P3 negative', tk(-123456.789), '-1,23,456.79');
    eq('P4 words lakh', takaWords(174000), 'Taka One Lakh Seventy-Four Thousand only');
    eq('P5 words paisa', takaWords(190865.5), 'Taka One Lakh Ninety Thousand Eight Hundred Sixty-Five and Paisa Fifty only');
    eq('P6 words crore', takaWords(123456789), 'Taka Twelve Crore Thirty-Four Lakh Fifty-Six Thousand Seven Hundred Eighty-Nine only');
    eq('P7 pct', pctTxt(0.15) + ' ' + pctTxt(1 / 3), '15% 33.33%'); eq('P8 long date', longDate('05-Jan-2027'), '5 January 2027');
  });
  var db = pdfTestDb_(), list;
  step('P upgrade', function () {
    db.h.QuoteLines = db.h.QuoteLines.filter(function (h) { return h !== 'Billing'; }); delete db.h.Milestones; delete db.t.Milestones;
    db.t.Sequences = db.t.Sequences.filter(function (r) { return r.SeqKey !== 'MS'; });
    var d = upgradeO3(db, { docBaseId: 'DOCID' });
    eq('P9 adds column, tab, settings, MS', ['QuoteLines.Billing', 'Milestones tab', 'Settings.MilestoneStages', 'Settings.DocBaseID', 'Sequences.MS'].every(function (x) { return d.indexOf(x) >= 0; }), true);
    eq('P10 Rental clauses reworded', d.indexOf('7 Rental clauses reworded') >= 0, true);
    eq('P11 second run does nothing', upgradeO3(db).length, 0);
    eq('P12 no weeks left in Rental', termsFor(db, 'Rental').some(function (t) { return /week/i.test(t.Text); }), false);
    eq('P13 no cash wording', termsFor(db, 'Rental').some(function (t) { return /cash payments are valid/i.test(t.Text); }), false);
    eq('P14 Project set: own 2.x + Rental rest', termsFor(db, 'Project').map(function (t) { return t.ClauseNo; }).join(' '), '1.1 2.1 2.2 2.3 2.4 3.2 3.3 4.1 4.2 4.4 7.1');
    eq('P15 Service / Sale / PO sets', [termsFor(db, 'Service').length, termsFor(db, 'Sale').length, termsFor(db, 'PO').length].join('/'), TC_SERVICE_.length + '/' + TC_SALE_.length + '/' + TC_PO_.length);
    eq('P16 DocBaseID stored', S(db, 'DocBaseID', ''), 'DOCID');
    db.rows('QuoteLines').forEach(function (l) { if (l.QuoteNo === 'CAE/Q/2026/003' && l.LineNo === 1) l.Billing = 'Milestone'; }); // re-seed after column re-add
  });
  step('P specs', function () {
    list = pdfSampleList_(db);
    var specs = list.map(function (x) { return PDF_SPECS[x[0]](db, x[1]); });
    var all = JSON.stringify(specs);
    eq('P17 eleven documents', specs.length, 11);
    eq('P18 tokens all resolved', /\{\{/.test(all), false);
    var rq = specs[0], txt = JSON.stringify(rq.blocks);
    eq('P19 rental 3.2 in months', /per month of 30 days/.test(txt) && /Minimum hire is 2 months; a part month is charged as a full month/.test(txt), true);
    eq('P20 rental advance 50%', /50% advance with the work order/.test(txt), true);
    var g = rq.blocks.filter(function (b) { return b.t === 'grid'; })[0];
    eq('P21 price table rows + duration col', g.rows.length + ' ' + g.cols.length, '4 7');
    eq('P22 optional unselected in brackets', g.rows[3][6], '(25,000.00)');
    var sm = rq.blocks.filter(function (b) { return b.t === 'sums'; })[0].rows;
    eq('P23 quote total excl. optional', sm[2][1], '19,550.00');
    eq('P24 sale has no duration column', specs[1].blocks.filter(function (b) { return b.t === 'grid'; })[0].cols.length, 6);
    eq('P25 sale clauses from Sale set', /Goods remain our property until paid/.test(JSON.stringify(specs[1].blocks)), true);
    var pg = specs[2].blocks.filter(function (b) { return b.t === 'grid'; });
    eq('P26 project payment schedule', pg.length === 2 && pg[1].rows.map(function (r) { return r[3]; }).join(' '), '69,600.00 52,200.00 52,200.00 1,74,000.00');
    eq('P27 project 4.1 mentions stages', /invoiced in stages as set out in the payment schedule/.test(JSON.stringify(specs[2].blocks)), true);
    eq('P28 PI amount', specs[4].blocks.filter(function (b) { return b.t === 'sums'; })[0].rows[0][1], '9,775.00');
    var is = specs[5].blocks.filter(function (b) { return b.t === 'sums'; })[0].rows;
    eq('P29 invoice: total, no advance (unpaid PI), due', is.map(function (r) { return r[1]; }).join(' '), '11,000.00 1,650.00 12,650.00 12,650.00');
    eq('P30 milestone invoice line', /Stage 1: Erection complete · 40% of/.test(JSON.stringify(specs[6].blocks)), true);
    eq('P31 challan weight 50×10.5 + 20×15', /Approx\. weight:  825 kg/.test(JSON.stringify(specs[7].blocks)), true);
    var rg = specs[8].blocks.filter(function (b) { return b.t === 'grid'; })[0].rows[0];
    eq('P32 return challan good/damaged/lost', rg.slice(4, 8).join(' '), '20 18 1 1');
    eq('P33 PO total words', /Taka Thirty-One Thousand Fifty only/.test(JSON.stringify(specs[9].blocks)), true);
    var dg = specs[10].blocks.filter(function (b) { return b.t === 'grid'; })[0].rows;
    eq('P34 debit note damage lines', dg.map(function (r) { return r[5]; }).join(' '), '200.00 1,500.00');
    eq('P35 file names', specs[0].file + ' | ' + specs[7].file, 'CAE-Q-2026-001 Test Client | CAE-DC-2026-001 Delivery');
    throws('P36 unknown document', function () { makePdf(db, 'Letter', 'x'); }, /Unknown document/);
    throws('P37 quote without lines', function () { db.insert('Quotes', { QuoteNo: 'CAE/Q/2026/009', QuoteType: 'Sale', CustID: 'CUST-0001' }); specQuote(db, 'CAE/Q/2026/009'); }, /no lines/);
    throws('P38 unknown block type', function () { renderInto({ getBody: function () { return { getParent: function () { return { getNumChildren: function () { return 0; } }; } }; } }, { blocks: [{ t: 'x' }] }, {}); }, /Unknown block/);
  });
  if (T.fail === 0) T.log.push('ok   (Docs rendering itself is checked with Core Access › PDF › Sample set)');
  return { pass: T.pass, fail: T.fail, log: T.log };
}
