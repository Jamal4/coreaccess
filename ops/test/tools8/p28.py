# r28 = r27 + F1 (challan from a quote, no PO) + F2 (vendor-rental material source). Run from ops/: python3 test/tools8/p28.py
import sys
def R(f, pairs):
    s = open(f, encoding='utf-8').read()
    for a, b in pairs:
        n = s.count(a)
        if n != 1: sys.exit('%s: %d matches for %r' % (f, n, a[:80]))
        s = s.replace(a, b)
    open(f, 'w', encoding='utf-8').write(s)

R('CAE_Ops_Office.gs', [
 ("['Challans', 'MadeByID']]; // MadeByID: the maker's StaffID (signs the PDF)",
  "['Challans', 'MadeByID'], ['Challans', 'QuoteNo'], ['Challans', 'MatSource']]; // MadeByID: the maker's StaffID (signs the PDF); r28: QuoteNo (F1, no job yet), MatSource (F2, 'Vendor' = vendor rental)"),
 ("  var h = OCH_EVF_.map(function (k) { var x = c[k]; return x instanceof Date ? x.getTime() : String(x == null ? '' : x); });\n",
  "  var h = OCH_EVF_.map(function (k) { var x = c[k]; return x instanceof Date ? x.getTime() : String(x == null ? '' : x); });\n"
  "  if (!blank(c.QuoteNo) || !blank(c.MatSource)) h.push('F~' + String(c.QuoteNo == null ? '' : c.QuoteNo) + '~' + String(c.MatSource == null ? '' : c.MatSource)); // r28: only when set (older challans keep their ev)\n"),
 ("  var k = String(c.Kind), job = X.jobs[String(c.JobNo)] || null, sup = blank(c.SupID) ? '' : String(c.SupID), q = 0, kg = 0;",
  "  var k = String(c.Kind), job = X.jobs[String(c.JobNo)] || null, qt = !job && !blank(c.QuoteNo) ? X.quotes[String(c.QuoteNo)] || null : null, sup = blank(c.SupID) ? '' : String(c.SupID), q = 0, kg = 0;"),
 ("job: job ? String(job.JobNo) : '', cust: job ? X.cust(job) : '',",
  "job: job ? String(job.JobNo) : '', cust: job ? X.cust(job) : qt ? X.cust(qt) : '',"),
 ("dn: X.dn[String(c.ChallanNo)] || '', by: oUncell_(c.MadeBy) };",
  "dn: X.dn[String(c.ChallanNo)] || '', by: oUncell_(c.MadeBy),\n"
  "    quote: !blank(c.QuoteNo) ? String(c.QuoteNo) : job && !blank(job.QuoteNo) ? String(job.QuoteNo) : '', src: String(c.MatSource || '') === 'Vendor' ? 'Vendor' : '' }; // r28 F1 / F2"),
 ("  var X = { items: oChItems_(db), kit: oStKit_(db), jobs: oStMap_(), sups: oStMap_(), dn: oStMap_(), cus: oStMap_(), sites: oStMap_() };\n",
  "  var X = { items: oChItems_(db), kit: oStKit_(db), jobs: oStMap_(), sups: oStMap_(), dn: oStMap_(), cus: oStMap_(), sites: oStMap_(), quotes: oStMap_() };\n"
  "  if (db.hasTab('Quotes')) db.rows('Quotes').forEach(function (q) { if (!blank(q.QuoteNo) && !X.quotes[String(q.QuoteNo)]) X.quotes[String(q.QuoteNo)] = q; }); // r28 F1\n"),
 ("  var pool = {}, rent = oStMap_();\n",
  "  var qj = oStMap_(); db.rows('Jobs').forEach(function (j) { if (!blank(j.QuoteNo)) qj[String(j.QuoteNo)] = 1; }); // r28 F1: quotes with no job yet (no PO needed)\n"
  "  var quotes = Object.keys(X.quotes).filter(function (n) { return !qj[n] && oChQOk_(X.quotes[n]); }).sort().map(function (n) { var q = X.quotes[n], si = X.sites[String(q.SiteID)] || {};\n"
  "    return { no: n, cust: X.cust(q), siteName: oUncell_(si.Project || si.Address || ''), type: String(q.QuoteType || ''), st: String(q.Status || '') }; });\n"
  "  var pool = {}, rent = oStMap_();\n"),
 ("rows: rows, jobs: jobs, hire: hire,", "rows: rows, jobs: jobs, quotes: quotes, hire: hire,"),
 ("  if (job) { o.ref = oUncell_(job.ClientWONo); o.siteName = oUncell_(si.Project || si.Address || ''); o.jst = String(job.Status || ''); o.jtype = String(job.JobType || ''); }\n",
  "  if (job) { o.ref = oUncell_(job.ClientWONo); o.siteName = oUncell_(si.Project || si.Address || ''); o.jst = String(job.Status || ''); o.jtype = String(job.JobType || ''); }\n"
  "  else if (!blank(c.QuoteNo)) { var qv = X.quotes[String(c.QuoteNo)] || {}, sq = X.sites[String(qv.SiteID)] || {}; o.siteName = oUncell_(sq.Project || sq.Address || ''); o.jtype = String(qv.QuoteType || ''); } // r28 F1\n"),
 ("SupID: '', SupplierRef: '' }, sl = '', supNeed = false;\n  if (OCH_YW_.indexOf(k) < 0) {\n"
  "    var job = typeof x.job === 'string' && x.job ? find(db.rows('Jobs'), 'JobNo', x.job) : null;\n"
  "    if (!job || blank(job.JobNo) || String(job.Status) === 'Closed' || (k === 'Sale') !== (String(job.JobType) === 'Sale')) oFail_('BADINPUT|job');\n"
  "    o.JobNo = String(job.JobNo);\n"
  "    if (k !== 'Sale') { var si = find(db.rows('Sites'), 'SiteID', job.SiteID); if (!si) oFail_('BADINPUT|job'); sl = ensureSiteLoc(db, si); }\n  }\n"
  "  if (k === 'Delivery') { if (x.from === LOC.SUPPLIER",
  "SupID: '', SupplierRef: '', QuoteNo: '', MatSource: '' }, sl = '', supNeed = false;\n"
  "  var src = x.src == null || x.src === '' || x.src === 'Own' ? '' : x.src === 'Vendor' && k === 'Delivery' ? 'Vendor' : oFail_('BADINPUT|material source'); // r28 F2\n"
  "  if (OCH_YW_.indexOf(k) < 0) { // r28 F1: a job, or a quote with no job yet (no PO needed: Post makes its job)\n"
  "    var job = typeof x.job === 'string' && x.job ? find(db.rows('Jobs'), 'JobNo', x.job) : null, qt = null;\n"
  "    if (!job && k !== 'Return' && typeof x.quote === 'string' && x.quote) {\n"
  "      qt = find(db.rows('Quotes'), 'QuoteNo', x.quote); if (!oChQOk_(qt)) oFail_('BADINPUT|quote');\n"
  "      job = find(db.rows('Jobs'), 'QuoteNo', qt.QuoteNo); if (job) qt = null; else if ((k === 'Sale') !== (String(qt.QuoteType) === 'Sale')) oFail_('BADINPUT|quote');\n    }\n"
  "    if (!qt && (!job || blank(job.JobNo) || String(job.Status) === 'Closed' || (k === 'Sale') !== (String(job.JobType) === 'Sale'))) oFail_('BADINPUT|job');\n"
  "    if (qt) o.QuoteNo = String(qt.QuoteNo); else o.JobNo = String(job.JobNo);\n"
  "    if (k !== 'Sale') { var si = find(db.rows('Sites'), 'SiteID', qt ? qt.SiteID : job.SiteID); if (!si) oFail_('BADINPUT|' + (qt ? 'quote' : 'job')); sl = ensureSiteLoc(db, si); }\n  }\n"
  "  if (src) { // r28 F2: vendor rental straight to site: not our stock (no StockMoves); the vendor is on the challan + PDF for the rent owed\n"
  "    if (locType(db, LOC.SUPPLIER) !== 'Supplier') oFail_('BADINPUT|vendor');\n"
  "    o.FromLoc = LOC.SUPPLIER; o.ToLoc = sl; o.MatSource = 'Vendor'; o.SupplierRef = oCell_(oQeTxt_(x.sref, 40, 'vendor\\'s DO no.'));\n"
  "    if (typeof x.sup === 'string' && x.sup) { var vs = db.hasTab('Suppliers') ? find(db.rows('Suppliers'), 'SupID', x.sup) : null; if (!vs || blank(vs.SupID) || String(vs.Status) === 'Inactive') oFail_('BADINPUT|vendor'); o.SupID = String(vs.SupID); }\n"
  "    else o._vendor = oChVendorIn_(x.newSup);\n  }\n"
  "  else if (k === 'Delivery') { if (x.from === LOC.SUPPLIER"),
 ("function oChHeld_(db, sup) {",
  "function oChQOk_(q) { return !!q && !blank(q.QuoteNo) && !blank(q.CustID) && OQ_CLOSED_.indexOf(String(q.Status)) < 0; } // r28 F1: a quote a challan may pick (any not Lost / Expired / Cancelled)\n"
  "function oChVendorIn_(v) { v = v && typeof v === 'object' && !Array.isArray(v) ? v : {}; // r28 F2: a new vendor: name, phone, address needed\n"
  "  return { Name: oCell_(oQeTxt_(v.name, 80, 'vendor name', true)), Phone: oCell_(oQeTxt_(v.phone, 30, 'vendor phone', true)), Address: oCell_(oQeTxt_(v.addr, 200, 'vendor address', true)) }; }\n"
  "function oChVendorMake_(db, v) { // r28 F2: the same name (any case / spacing) = that vendor again, so a retried save never makes a second one\n"
  "  if (!db.hasTab('Suppliers')) oFail_('BADINPUT|vendor');\n"
  "  var key = function (s) { return oUncell_(s).toLowerCase().replace(/\\s+/g, ' ').trim(); }, ex = db.rows('Suppliers').filter(function (s) { return !blank(s.SupID) && key(s.Name) === key(v.Name); })[0];\n"
  "  if (ex) { if (String(ex.Status) === 'Inactive') oFail_('BADINPUT|vendor (inactive)'); return String(ex.SupID); }\n"
  "  var id = oChFree_(db, 'Suppliers', 'SupID', function () { return nextId(db, 'SUP'); });\n"
  "  db.insert('Suppliers', { SupID: id, Name: v.Name, Phone: v.Phone, Address: v.Address, Status: 'Active' }); oCtLog_(db, 'Vendor added', id, oUncell_(v.Name)); return id;\n}\n"
  "function oChHeld_(db, sup) {"),
 ("      var h = oChHdr_(env, db, k, x), ls = oChLinesIn_(db, k, x.lines), no;\n      oQeRate_(env, L);\n",
  "      var h = oChHdr_(env, db, k, x), ls = oChLinesIn_(db, k, x.lines), no, nv = h._vendor;\n      oQeRate_(env, L);\n"
  "      delete h._vendor; if (nv) h.SupID = oChVendorMake_(db, nv); // r28 F2: after every check, so a refused save makes no vendor\n"),
 ("'Challan edited' : 'Challan made', no, k + (h.JobNo ? ' · ' + h.JobNo : '') + ' · ' + ls.length + ' lines');",
  "'Challan edited' : 'Challan made', no, k + (h.JobNo ? ' · ' + h.JobNo : h.QuoteNo ? ' · ' + h.QuoteNo : '') + (h.MatSource ? ' · vendor ' + h.SupID : '') + ' · ' + ls.length + ' lines');"),
 ("    if ((k === 'Delivery' || k === 'Sale') && !v) oFail_('BADINPUT|vehicle no.');",
  "    if ((k === 'Sale' || (k === 'Delivery' && String(c.MatSource || '') !== 'Vendor')) && !v) oFail_('BADINPUT|vehicle no.'); // r28 F2: the vendor's vehicle: optional"),
])

R('CAE_Ops_Sets.gs', [
 ("  if (c.Status !== 'Draft' && !blank(c.Status)) throw new Error(no + ' is ' + c.Status + ', only Draft challans can be posted');\n  var kind = c.Kind, yk",
  "  if (c.Status !== 'Draft' && !blank(c.Status)) throw new Error(no + ' is ' + c.Status + ', only Draft challans can be posted');\n"
  "  if (blank(c.JobNo) && !blank(c.QuoteNo) && CH_YK_.indexOf(c.Kind) < 0) c = chQuoteJob_(db, c); // r28 F1: made from a quote: its job now (Awaiting order, no PO needed)\n"
  "  if (String(c.MatSource || '') === 'Vendor') return chPostVendor_(db, c); // r28 F2: vendor rental, not our stock: no StockMoves (every post path: office, sheet panel)\n"
  "  var kind = c.Kind, yk"),
 ("function chPostTail_(db, c, job, dmg, now) {",
  "function chQuoteJob_(db, c) { // r28 F1: the quote's job (made now if none; a retried post finds it by QuoteNo)\n"
  "  var q = String(c.QuoteNo), j = find(db.rows('Jobs'), 'QuoteNo', q);\n"
  "  if (j && String(j.Status) === 'Closed') throw new Error(c.ChallanNo + ': the job of ' + q + ' (' + j.JobNo + ') is closed');\n"
  "  db.update('Challans', c, { JobNo: j ? String(j.JobNo) : quoteToJob(db, q) }); return must(db, 'Challans', 'ChallanNo', c.ChallanNo);\n}\n"
  "function chPostVendor_(db, c) { // r28 F2: Posted with no StockMoves: own and rented-in stock untouched; the job goes on hire as for any delivery\n"
  "  var no = c.ChallanNo; if (!db.rows('ChallanLines').some(function (l) { return l.ChallanNo === no; })) throw new Error(no + ' has no lines');\n"
  "  if (c.Kind !== 'Delivery' || blank(c.SupID)) throw new Error(no + ': a vendor rental challan is a Delivery with its vendor');\n"
  "  var job = blank(c.JobNo) ? null : must(db, 'Jobs', 'JobNo', c.JobNo); if (job && String(job.Status) === 'Closed') throw new Error(no + ': job ' + job.JobNo + ' is closed');\n"
  "  chPostTail_(db, c, job, [], new Date()); log_(db, 'Challan posted', no, 'Delivery · vendor rental ' + c.SupID + ' · no stock moves'); return { moves: 0, damage: 0 };\n}\n"
  "function chPostTail_(db, c, job, dmg, now) {"),
 ("  var chs = {}; db.rows('Challans').forEach(function (c) { if (c.JobNo === jobNo && c.Status === 'Posted') chs[c.ChallanNo] = c; });",
  "  var chs = {}; db.rows('Challans').forEach(function (c) { if (c.JobNo === jobNo && c.Status === 'Posted' && String(c.MatSource || '') !== 'Vendor') chs[c.ChallanNo] = c; }); // r28 F2: vendor sets are not ours on hire"),
])

R('CAE_Ops_PDF.gs', [
 ("  var c = must(db, 'Challans', 'ChallanNo', no), job = find(db.rows('Jobs'), 'JobNo', c.JobNo) || {},",
  "  var c = must(db, 'Challans', 'ChallanNo', no), job = (blank(c.JobNo) ? null : find(db.rows('Jobs'), 'JobNo', c.JobNo)) || specChQuote_(db, c) || {},"),
 ("function specChallan(db, no) {",
  "function specChQuote_(db, c) { // r28 F1: a challan made from a quote before its job: customer / site / quote no. from the quote\n"
  "  var q = blank(c.QuoteNo) ? null : find(db.rows('Quotes'), 'QuoteNo', c.QuoteNo); return q ? { QuoteNo: q.QuoteNo, CustID: q.CustID, SiteID: q.SiteID, JobType: q.QuoteType } : null;\n}\n"
  "function specChallan(db, no) {"),
 ("['From', direct ? 'Direct to site' : loc(c.FromLoc), 'Driver', c.Driver]",
  "['From', vend ? 'Vendor rental · ' + dash(vn.Name) + (blank(c.SupplierRef) ? '' : ' (DO ' + c.SupplierRef + ')') + ' · direct to site' : direct ? 'Direct to site' : loc(c.FromLoc), 'Driver', c.Driver]"),
 ("direct = c.Kind === 'Delivery' && locType(db, c.FromLoc) === 'Supplier';",
  "direct = c.Kind === 'Delivery' && locType(db, c.FromLoc) === 'Supplier', vend = String(c.MatSource || '') === 'Vendor', vn = vend && !blank(c.SupID) ? party_(db, c.SupID) : {};"),
])
print('server ok')
