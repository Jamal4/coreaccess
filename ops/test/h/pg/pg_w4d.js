// jsdom page wired to the REAL server (all 15 .gs in a vm): node pg.js <dir with .gs + Office.html>
process.env.GSDIR = process.argv[2];
const { ctx } = require('../h/run.js'), vm = require('vm'), fs = require('fs'), { JSDOM } = require('jsdom');
const html = fs.readFileSync(process.argv[2] + '/Office.html', 'utf8');
const V = s => vm.runInContext(s, ctx);
V(`var PE = oMemEnv_(); OFFICE_ENV_ = PE; OFFICE_CFG_.kdfIters = 3; OFFICE_CFG_.maxPerMin = 1e9;
  var PD = pdfTestDb_(); upgradeQT(PD); PD.ensureColumn('Quotes', 'PDF'); try { upgradeO7(PD); } catch (e) {}
  PE.clock.db = PD; PE.clock.now = Date.now();
  PD.insert('Staff', [{ StaffID: 'STF-0001', Name: 'Jamal Uddin' }, { StaffID: 'STF-0002', Name: 'Md. Junaid' }]);
  nextIds(PD, 'Q', 4, new Date());
  [['RL-STD-20', 'Ringlock', 'Yes', 'No'], ['BD-ST-207', 'Board', 'Yes', 'Yes'], ['TC-TUBE-3', 'Tube & coupler', 'Yes', 'Yes'], ['SV-TRANS', 'Service', 'No', 'No'], ['SV-AREA-M2', 'Service', 'No', 'No'], ['SV-ERECT', 'Service', 'No', 'No']].forEach(function (x) {
    PD.update('Items', must(PD, 'Items', 'ItemCode', x[0]), { Category: x[1], ForHire: x[2], ForSale: x[3], SalePrice: x[0] === 'TC-TUBE-3' ? 1250 : '' }); });
  oQeScopeAdd_(PD);
  ['dir@p.com|D', 'sales@p.com|SC2', 'view@p.com|SC1', 'yard@p.com|YW2'].forEach(function (x) { var p = x.split('|'), a = p[1] === 'D' ? oDir_() : p[1] === 'SC2' ? { SC: 2 } : p[1] === 'SC1' ? { SC: 1 } : { YW: 2, PS: 1 };
    oSaveLogin_(PE, { email: p[0], name: p[0].split('@')[0] + ' user', depts: a, password: 'GoodPass1' }); });
  var PMADE = 0; QF5_STUB_ = { make: function (d, w, n) { var u = 'https://drive.google.com/file/d/PG' + (++PMADE) + 'abcdefghijklmnopqrstuv/view'; d.update('Quotes', must(d, 'Quotes', 'QuoteNo', n), { PDF: u }); return { url: u, file: 'x.pdf', placeholders: 0 }; }, drive: { name: function () { return ''; }, trash: function () {} } };`);
let calls = [];
function makeDom() {
  const dom = new JSDOM(html.replace(/<script>/, '<script>window.__ok=1;'), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://x.test/exec',
    beforeParse(w) {
      w.google = { script: { get run() { let ok = () => {}, fail = () => {};
        const p = new Proxy({}, { get(_, k) {
          if (k === 'withSuccessHandler') return f => { ok = f; return p; };
          if (k === 'withFailureHandler') return f => { fail = f; return p; };
          return (...args) => { calls.push(k); setTimeout(() => {
            try { ctx.__a = JSON.parse(JSON.stringify(args)); const r = V(k + '.apply(null, __a)'); ok(r === undefined ? null : JSON.parse(JSON.stringify(r))); }
            catch (e) { (global.ERRS = global.ERRS || []).push(k + ':' + e.message); fail(new w.Error(e.message)); } }, 1); };
        } }); return p; } } };
      w.open = () => null; w.HTMLElement.prototype.scrollIntoView = function () {};
    } });
  return dom;
}
let pass = 0, fail = 0;
const ok = (n, c, extra) => { if (c) pass++; else { fail++; console.log('FAIL ' + n + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 300) : '')); } };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let dom = makeDom(), w = dom.window, d = w.document;
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const change = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const key = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  const focus = el => { el.focus(); el.dispatchEvent(new w.FocusEvent('focusin', { bubbles: true })); el.dispatchEvent(new w.FocusEvent('focus')); };
  const toast = () => $('#toast').textContent;
  const login = async em => { await wait(30); type($('#em'), em); type($('#pw'), 'GoodPass1'); click($('#go')); await wait(60); };
  const tile = k => $('.tile[data-k="' + k + '"]');
  const pickOp = txt => $$('#qepick .op').find(b => b.textContent.indexOf(txt) >= 0);
  const row = i => $('#qerows tr[data-r="' + i + '"]'), cell = (i, f) => row(i).querySelector('[data-f="' + f + '"]');
  const db = s => V(s);
  await login('sales@p.com');
  ok('P1 sales: New quote tile ready (no SOON)', tile('newquote') && !tile('newquote').querySelector('.soon'));
  click(tile('newquote')); await wait(60);
  ok('P2 new quote: type first', $$('.qe-type').length === 3 && !$('#qecu'));
  click($('.qe-type[data-t="Rental"]')); await wait(10);
  focus($('#qecu')); type($('#qecu'), 'test'); await wait(10);
  ok('P3 customer search lists Test Client + New customer', !!pickOp('Test Client') && !!pickOp('+ New customer'));
  click(pickOp('Test Client')); await wait(10);
  ok('P4 project enabled after customer', !$('#qesi').disabled);
  focus($('#qesi')); await wait(10); click(pickOp('Tower A')); await wait(10);
  ok('P5 project chosen', /Tower A/.test($('#qesi').value));
  focus(cell(0, 'desc')); await wait(10);
  const groups = $$('#qepick .gh').map(x => x.textContent);
  ok('P6 picker: hire items grouped by family, services not offered for rental', groups.indexOf('Ringlock') >= 0 && groups.indexOf('Aluminium mobile') >= 0 && !pickOp('Transport'), groups);
  click(pickOp('Ringlock standard')); await wait(10);
  ok('P7 picked item: unit pc / month, rate 90, size read-only', cell(0, 'unit').value === 'pc / month' && cell(0, 'rate').value === '90' && cell(0, 'size').readOnly, [cell(0, 'unit').value, cell(0, 'rate').value]);
  type(cell(0, 'qty'), '100');
  type(cell(1, 'desc'), 'Transport'); w.qePickClose(); type(cell(1, 'qty'), '2'); type(cell(1, 'unit'), 'trip'); type(cell(1, 'rate'), '5000');
  ok('P8 totals live: 21,850.00 + words', /21,850\.00/.test($('#qetot').textContent) && /Twenty-One Thousand Eight Hundred Fifty/.test($('#qewords').textContent), $('#qetot').textContent);
  type(cell(2, 'desc'), 'Bad unit line'); w.qePickClose(); type(cell(2, 'qty'), '1'); type(cell(2, 'unit'), 'bags'); type(cell(2, 'rate'), '1');
  let n0 = calls.length; click($('#qesave')); await wait(20);
  ok('P9 unit not in Lists refused on the page (no call)', /line 3: unit/.test($('#qeerr').textContent) && calls.length === n0);
  click(row(2).querySelector('[data-a="del"]')); await wait(10); click($('#dyes')); await wait(10);
  ok('P10 delete a used row asks first', $$('#qerows tr').length === 2);
  click($('#qesave')); await wait(80);
  let no = db("PD.rows('Quotes').slice(-1)[0].QuoteNo"), ql = db("JSON.stringify(PD.rows('QuoteLines').filter(function(l){return l.QuoteNo==='" + no + "'}).map(function(l){return [l.Unit,l.Billing,l.Months,l.Qty,l.Rate]}))");
  ok('P11 saved: quote view opens; lines stored with the monthly flag', /saved as Draft/.test(toast()) && $('#qv') && ql === '[["pc","Monthly",1,100,90],["trip","One-off","",2,5000]]', [toast(), ql]);
  await wait(40);
  ok('P12 quote view: 7 columns, pc / month, Edit quote button', $$('.ltab th').map(x => x.textContent).join(',') === '#,Description,Size,Qty,Unit,Rate,Amount' && /pc \/ month/.test($('.ltab').textContent) && !!$('#qedit'), [$$('.ltab th').map(x => x.textContent).join(','), ($('.ltab')||{}).textContent, !!$('#qedit')]);
  click($('#qedit')); await wait(60);
  ok('P13 edit opens with the lines', cell(0, 'unit').value === 'pc / month' && cell(1, 'desc').value === 'Transport' && $('.qe-type.on').getAttribute('data-t') === 'Rental');
  type(cell(0, 'qty'), '120'); click($('#qesave')); await wait(80);
  ok('P14 edit of a Draft saved (Rev 0)', db("must(PD,'QuoteLines','QuoteNo','" + no + "').Qty") === 120 && db("must(PD,'Quotes','QuoteNo','" + no + "').Rev") === 0);
  // STALE: someone else saves meanwhile
  await wait(40); click($('#qedit')); await wait(60);
  db("(function(){var t=officeLogin('dir@p.com','GoodPass1',false).token,F=officeQuoteForm(t,'" + no + "');officeQuoteSave(t,{no:F.quote.no,ev:F.quote.ev,type:'Rental',cust:F.quote.cust,site:F.quote.site,date:F.quote.date,valid:F.quote.valid,prep:'',adv:40,lines:F.quote.lines});})()");
  type(cell(0, 'qty'), '130'); click($('#qesave')); await wait(80);
  ok('P15 STALE: nothing saved, Open the latest', /changed/.test($('#qeerr').textContent) && !!$('#qereload') && db("must(PD,'QuoteLines','QuoteNo','" + no + "').Qty") === 120);
  click($('#qereload')); await wait(60);
  ok('P16 latest opens (advance 40 from the other save)', $('#qead').value === '40');
  // leave with changes asks
  type(cell(0, 'qty'), '7'); click($('#qeback')); await wait(10);
  ok('P17 leaving with changes asks', /Leave without saving/.test(($('#dlg') || {}).textContent || ''));
  click($('#dyes')); await wait(60);
  // Sent quote -> Rev 1 Draft
  w.viewQuoteEdit('CAE/Q/2026/002'); await wait(80);
  ok('P18 Sent quote: note says Rev 1 + Draft', /Rev 1/.test($('.qe-revn').textContent) && /Draft/.test($('.qe-revn').textContent) && $('.qe-type.on').getAttribute('data-t') === 'Sale');
  click($('#qesavep')); await wait(60);
  ok('P41 Sent quote, nothing changed: no save, no new Rev', /Nothing changed/.test(toast()) && db("must(PD,'Quotes','QuoteNo','CAE/Q/2026/002').Rev") === 0 && $('#qv'), toast());
  await wait(40); w.viewQuoteEdit('CAE/Q/2026/002'); await wait(80); type(cell(0, 'qty'), '25');
  const TT = [], t00 = w.toast; w.toast = function (m) { TT.push(String(m)); return t00.apply(this, arguments); };
  click($('#qesavep')); await wait(5); const busy0 = $('#qpdf') ? $('#qpdf').textContent : 'none';
  await wait(160);
  ok('P19 Save & make PDF (W4d): save toast first (Rev 1, making the PDF), then the PDF call: PDF made, Draft, button Open PDF',
    /Rev 1/.test(TT[0]) && /making the PDF/.test(TT[0]) && /^PDF of CAE\/Q\/2026\/002 made/.test(TT[TT.length - 1]) && db("must(PD,'Quotes','QuoteNo','CAE/Q/2026/002').Status") === 'Draft'
    && /drive\.google\.com/.test(db("String(must(PD,'Quotes','QuoteNo','CAE/Q/2026/002').PDF)")) && /Open PDF/.test($('#qpdf').textContent) && !$('#qpdf').disabled, JSON.stringify(TT) + ' ' + busy0);
  V("QF5_STUB_.mk0 = QF5_STUB_.make; PD.update('QuoteLines', PD.rows('QuoteLines').filter(function (l) { return l.QuoteNo === 'CAE/Q/2026/002'; })[0], { Qty: 27 }); QF5_STUB_.make = function () { throw new Error('PG no PDF'); };"); TT.length = 0;
  w.qPdfBg('CAE/Q/2026/002'); const busy1 = $('#qpdf').disabled + ':' + $('#qpdf').textContent + ':mail ' + ($('#qmail') ? $('#qmail').disabled : 'none'); console.log('B1', busy1); await wait(120);
  V("QF5_STUB_.make = QF5_STUB_.mk0;");
  ok('P19b PDF call fails after the save: saved toast, then "not made: use Make PDF", button free again', /^true:.*PDF being made.*:mail (true|none)$/.test(busy1) && (!$('#qmail') || !$('#qmail').disabled) && /saved, but the PDF was not made/.test(TT[TT.length - 1]) && $('#qpdf') && !$('#qpdf').disabled && true, JSON.stringify(TT) + ' ' + busy1);
  TT.length = 0; const nP = () => calls.filter(k => k === 'officeQuotePdf').length, p0 = nP();
  w.qPdfBg('CAE/Q/2026/002'); w.qPdfBg('CAE/Q/2026/002'); const p1 = nP() - p0, busy2 = $('#qpdf').disabled; await wait(150);
  ok('P19c (W4f CR) a second Save + PDF while the first PDF is being made: one call at a time, the second runs after the first, PDF made, progress kept until then',
    p1 === 1 && nP() - p0 === 2 && busy2 === true && TT.length === 1 && /^PDF of CAE\/Q\/2026\/002 made/.test(TT[0]) && !$('#qpdf').disabled && !w.QS.pdfRun['CAE/Q/2026/002'], JSON.stringify([p1, nP() - p0, busy2, TT]));
  TT.length = 0; const p2 = nP(); w.qPdfBg('CAE/Q/2026/002'); w.qPdfBg('CAE/Q/2026/002'); delete w.QS.pdfBg['CAE/Q/2026/002']; await wait(150);
  ok('P19d queued re-run dropped when a later save (no PDF) came meanwhile: no second call, no message', nP() - p2 === 1 && TT.length === 0 && !w.QS.pdfRun['CAE/Q/2026/002'], JSON.stringify([nP() - p2, TT]));
  const c0 = w.call, g0 = w.srvGate; let nG = 0; w.call = () => Promise.reject(new w.Error('NOSESSION')); w.srvGate = () => { nG++; return true; };
  w.qPdfBg('CAE/Q/2026/002'); w.qPdfBg('CAE/Q/2026/002'); await wait(60); w.call = c0; w.srvGate = g0;
  ok('P19e (review L2) queued PDF and the first call meets an ended sign-in: nothing left "being made", no re-run', nG === 1 && !w.QS.pdfBg['CAE/Q/2026/002'] && !w.QS.pdfRun['CAE/Q/2026/002'], JSON.stringify([nG, w.QS.pdfBg, w.QS.pdfRun]));
  w.toast = t00;
  // old format
  await wait(40); w.viewQuoteEdit('CAE/Q/2026/001'); await wait(80);
  ok('P20 old-format quote: back to the view, told why', $('#qv') && /old format/.test(toast()), toast());
  // new customer + dup
  await wait(40); w.viewQuoteEdit(); await wait(60); click($('.qe-type[data-t="Project"]')); await wait(10);
  focus($('#qecu')); type($('#qecu'), 'Acme'); await wait(10); click(pickOp('+ New customer')); await wait(10);
  ok('P21 new customer dialog takes the typed name', $('#ncn').value === 'Acme');
  type($('#ncp'), '01711-555666'); click($('#dyes')); await wait(80);
  ok('P22 customer added at once and chosen', /Acme added/.test(toast()) && /CUST-/.test($('#qecuc').textContent) && db("PD.rows('Customers').length") === 2);
  focus($('#qecu')); type($('#qecu'), 'zz'); await wait(10); click(pickOp('+ New customer')); await wait(10);
  type($('#ncn'), 'ACME Limited.'); click($('#dyes')); await wait(80);
  ok('P23 duplicate refused, offers the existing one', /already registered/.test($('#derr').textContent) && !!$('#dpick'), $('#derr').textContent);
  click($('#dpick')); await wait(10);
  ok('P24 Use picks it', /Acme/.test($('#qecu').value));
  focus($('#qesi')); await wait(10); click(pickOp('+ New project')); await wait(10);
  type($('#nsp'), 'Boiler house'); type($('#nsa'), 'Ghorashal'); click($('#dyes')); await wait(80);
  ok('P25 project added and chosen', /Boiler house/.test($('#qesi').value));
  focus($('#qesi')); await wait(10); click(pickOp('+ New project')); await wait(10);
  type($('#nsp'), 'boiler HOUSE'); type($('#nsa'), 'ghorashal'); click($('#dyes')); await wait(80);
  ok('P26 same project again: picks the existing one', /already registered/.test(toast()) && db("PD.rows('Sites').length") === 2, toast());
  // project line: scope + measure
  focus(cell(0, 'desc')); await wait(10);
  ok('P27 project picker: the 5 scopes first, then services', $$('#qepick .gh')[0].textContent === 'Project scope' && !!pickOp('Aluminium mobile scaffold') && !!pickOp('Transport'));
  click(pickOp('Transport')); await wait(5); type(cell(0, 'rate'), '777'); focus(cell(0, 'desc')); type(cell(0, 'desc'), 'external'); await wait(5);
  click(pickOp('External scaffold')); await wait(10);
  ok('P44 picking an item without a price clears the old rate', cell(0, 'rate').value === '');
  click(row(0).querySelector('[data-a="dim"]')); await wait(10);
  type($('#dl'), '20'); type($('#dh'), '12'); click($('#dyes')); await wait(10);
  ok('P28 measure: size text, qty 240 + unit read-only, m² / month', cell(0, 'size').value === 'L 20 m × H 12 m = 240 m²' && cell(0, 'qty').value === '240' && cell(0, 'qty').readOnly && cell(0, 'unit').readOnly && cell(0, 'unit').value === 'm² / month');
  type(cell(0, 'rate'), '95');
  type(cell(1, 'desc'), 'Design'); w.qePickClose(); click(row(1).querySelector('[data-a="menu"]')); await wait(10); click(pickOp('Lump sum')); await wait(10);
  ok('P29 lump sum: qty 1 lot, read-only', cell(1, 'qty').value === '1' && cell(1, 'unit').value === 'lot' && cell(1, 'qty').readOnly);
  type(cell(1, 'rate'), '25000');
  click($('#qesave')); await wait(100);
  let pn = db("PD.rows('Quotes').slice(-1)[0].QuoteNo"), pl = db("JSON.stringify(PD.rows('QuoteLines').filter(function(l){return l.QuoteNo==='" + pn + "'}).map(function(l){return [l.ItemCode,l.Qty,l.Unit,l.Months,l.DimL,l.DimH,l.RateBasis]}))");
  ok('P30 project saved: measure + lump sum stored', pl === '[["SV-EXT",240,"m²",1,20,12,"Per unit"],["",1,"lot","","","","Lump sum"]]', pl);
  // XSS
  db("(function(){var t=officeLogin('dir@p.com','GoodPass1',false).token;officeCustomerAdd(t,{name:'<img src=x onerror=window.__x=1>Evil'});})()");
  await wait(20); w.viewQuoteEdit(); await wait(60); click($('.qe-type[data-t="Sale"]')); await wait(10); focus($('#qecu')); type($('#qecu'), 'evil'); await wait(10);
  ok('P31 customer name with HTML shown as text', !$('#qepick img') && /<img/.test(pickOp('Evil').textContent) && !w.__x);
  // paste + kit (Rental)
  w.qePickClose(); click($('.qe-type[data-t="Rental"]')); await wait(10);
  click($('#qepaste')); await wait(10); type($('#pt'), 'RL-STD-20 5\nNOPE 3'); click($('#dyes')); await wait(10);
  ok('P32 paste: unknown code blocks the add', /Fix or remove/.test($('#derr').textContent));
  type($('#pt'), 'RL-STD-20 5\nBD-ST-207\t7\nTC-TUBE-3\t1,000\nRL-STD-20 1 2'); click($('#dyes')); await wait(10);
  ok('P42 paste: a third field is refused', /Fix or remove/.test($('#derr').textContent));
  type($('#pt'), 'RL-STD-20 5\nBD-ST-207\t7\nTC-TUBE-3\t1,000'); click($('#dyes')); await wait(10);
  ok('P43 paste: 1,000 = one thousand', cell(2, 'qty').value === '1000');
  ok('P33 paste: rows added with / month', cell(0, 'desc').value.indexOf('Ringlock') === 0 && cell(1, 'qty').value === '7' && cell(1, 'unit').value === 'pc / month');
  click($('#qekit')); await wait(10);
  ok('P34 kit dialog lists the real sets', $$('#ks option').length >= 2);
  type($('#kn'), '2'); click($$('#km button')[1]); click($('#dyes')); await wait(10);
  ok('P35 kit as parts: one line per part, qty × 2', $$('#qerows tr').length > 6 && /AM-/.test(row(3).textContent));
  // type change drops / month
  click($('.qe-type[data-t="Sale"]')); await wait(10); click($('#dyes')); await wait(10);
  ok('P36 type change asks; Sale drops "/ month"', cell(0, 'unit').value === 'pc');
  click($('#out')); await wait(10);
  ok('P45 sign out with unsaved changes asks first', /Sign out without saving/.test(($('#dlg') || {}).textContent || '') && !$('#em'));
  click($('#dno')); await wait(10);
  // viewer
  dom.window.close(); dom = makeDom(); w = dom.window; d = w.document; await wait(30);
  await login('view@p.com');
  ok('P37 SC View: no New quote tile', !tile('newquote') && !!tile('quotes'));
  click(tile('quotes')); await wait(60); click($('.qcard')); await wait(60);
  ok('P38 SC View: no Edit button', $('#qv') && !$('#qedit'));
  w.viewQuoteEdit(); await wait(60);
  ok('P39 forged open of the form -> Home + no access', !!tile('quotes') && /do not have access/.test(toast()));
  dom.window.close(); dom = makeDom(); w = dom.window; d = w.document; await wait(30);
  await login('sales@p.com'); click(tile('newquote')); await wait(60);
  V("Object.keys(PE.store).filter(function(k){return k.indexOf('OS:')===0}).forEach(function(k){PE.del(k)})");
  click($('.qe-type[data-t="Sale"]')); await wait(10); focus($('#qecu')); await wait(5); click(pickOp('Test Client')); await wait(5); focus($('#qesi')); await wait(5); click(pickOp('Tower A')); await wait(5);
  type(cell(0, 'desc'), 'x'); w.qePickClose(); type(cell(0, 'qty'), '1'); type(cell(0, 'unit'), 'pc'); type(cell(0, 'rate'), '1'); click($('#qesave')); await wait(80);
  ok('P40 session ended meanwhile: back to sign-in', !!$('#em') && /ended/.test($('#lmsg').textContent));
  console.log('page', pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(2); });
