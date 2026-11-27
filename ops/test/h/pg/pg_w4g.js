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
let calls = [], TT0 = '';
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
  ok('P28 measure: size text, qty 240 read-only, unit m² / month (picked from the dropdown, not fixed)', cell(0, 'size').value === 'L 20 m × H 12 m = 240 m²' && cell(0, 'qty').value === '240' && cell(0, 'qty').readOnly && cell(0, 'unit').tagName === 'SELECT' && cell(0, 'unit').value === 'm² / month');
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
  // ---- W4g: "Saved" at once, queued re-run, refusal restores the form, pending row, sign-out
  dom.window.close(); dom = makeDom(); w = dom.window; d = w.document; await wait(30);
  await login('sales@p.com');
  const slow = (ms, before) => { const c0 = w.call; let n = 0; const seen = [];
    w.call = function (fn) { const a = [].slice.call(arguments); if (fn !== 'officeQuoteSave') return c0.apply(null, a); n++; seen.push(JSON.parse(JSON.stringify(a[2])));
      return new w.Promise((res, rej) => setTimeout(() => { if (before) before(n); c0.apply(null, a).then(res, rej); }, ms)); };
    return { n: () => n, seen, off: () => { w.call = c0; } }; };
  const qty = () => db("must(PD,'QuoteLines','QuoteNo','" + no + "').Qty");
  w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '140');
  const q0 = qty(), S1 = slow(120); let t0 = Date.now(); click($('#qesave')); const dt = Date.now() - t0;
  console.log('W4g Saved shown after ' + dt + ' ms');
  ok('P50 Save: "Saved" at once (< 0.2 s), call in the background, form not locked', /Saved/.test($('#qeerr').textContent) && dt < 200 && S1.n() === 1 && !$('#qe').hasAttribute('inert') && !$('#qesave').disabled && qty() === q0 && !w.QE.dirty, [dt, $('#qeerr').textContent, S1.n(), qty()]);
  type(cell(0, 'qty'), '150'); click($('#qesave'));
  const n1 = S1.n(); await wait(450); S1.off();
  ok('P51 a second Save while one runs = one queued re-run with the new version: both land, no STALE, view opens', n1 === 1 && S1.n() === 2 && S1.seen[1].no === no && typeof S1.seen[1].ev === 'number' && S1.seen[1].ev !== S1.seen[0].ev && qty() === 150 && !!$('#qv') && /Saved/.test(toast()) && !/changed/.test(($('#qeerr') || {}).textContent || ''), [n1, S1.n(), S1.seen.map(x => x.ev), qty(), toast()]);
  await wait(40); w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '160');
  const S2 = slow(100, () => db("(function(){var t=officeLogin('dir@p.com','GoodPass1',false).token,F=officeQuoteForm(t,'" + no + "');officeQuoteSave(t,{no:F.quote.no,ev:F.quote.ev,type:'Rental',cust:F.quote.cust,site:F.quote.site,date:F.quote.date,valid:F.quote.valid,prep:'',adv:30,lines:F.quote.lines});})()"));
  click($('#qesave')); click($('#qeback')); await wait(20); const left = !!$('#qv') && !$('#qe');
  await wait(300); S2.off();
  ok('P52 refused after leaving: the form opens again with the typed data + the error, still unsaved', left && !!$('#qe') && cell(0, 'qty').value === '160' && /changed/.test($('#qeerr').textContent) && !!$('#qereload') && /not saved/.test(toast()) && w.QE.dirty === true && qty() === 150, [left, !!$('#qe'), $('#qe') && cell(0, 'qty').value, toast(), qty()]);
  click($('#qereload')); await wait(80);
  ok('P53 Open the latest after the refusal: the other save is there', $('#qead').value === '30' && !w.QE.dirty);
  const S3 = slow(250); w.viewQuoteEdit(); await wait(60);
  click($('.qe-type[data-t="Sale"]')); await wait(10); focus($('#qecu')); await wait(5); click(pickOp('Test Client')); await wait(5); focus($('#qesi')); await wait(5); click(pickOp('Tower A')); await wait(5);
  type(cell(0, 'desc'), 'W4g pending'); w.qePickClose(); type(cell(0, 'qty'), '1'); type(cell(0, 'unit'), 'pc'); type(cell(0, 'rate'), '1');
  const nq0 = db("PD.rows('Quotes').length"); click($('#qesave')); w.viewQuotes(); await wait(80);
  const pend = ($('#qlist') || {}).textContent || '';
  await wait(350); S3.off(); const nn = db("PD.rows('Quotes').slice(-1)[0].QuoteNo"), lt = ($('#qlist') || {}).textContent || '';
  ok('P54 new quote, list opened meanwhile: "Saving…" row until the number comes, then the list has it', /Saving…/.test(pend) && /Test Client/.test(pend) && db("PD.rows('Quotes').length") === nq0 + 1 && !/Saving…/.test(lt) && lt.indexOf(nn) >= 0, [pend.slice(0, 120), lt.slice(0, 160), nn]);
  w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '170'); const S4 = slow(150);
  click($('#qesave')); click($('#out')); await wait(10);
  const ask = /still being sent/.test(($('#dlg') || {}).textContent || ''); click($('#dno')); await wait(10); const stay = !$('#em');
  click($('#out')); await wait(10); click($('#dyes')); await wait(350); S4.off();
  ok('P55 sign-out while a save runs asks first; once confirmed the answer is dropped (sign-in stays, no save toast, nothing kept)', ask && stay && !!$('#em') && !/Saved/.test(toast()) && w.QE.job === null && Object.keys(w.QB.pend).length === 0 && w.qeBusyN() === 0, [ask, stay, toast(), !!$('#em')]);
  await login('sales@p.com'); await wait(20);
  // P56: refused while the person is busy on another (unsaved) form -> that form stays; the refused one is kept in the list
  w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '180');
  const S5 = slow(120, () => db("(function(){var t=officeLogin('dir@p.com','GoodPass1',false).token,F=officeQuoteForm(t,'" + no + "');officeQuoteSave(t,{no:F.quote.no,ev:F.quote.ev,type:'Rental',cust:F.quote.cust,site:F.quote.site,date:F.quote.date,valid:F.quote.valid,prep:'',adv:35,lines:F.quote.lines});})()"));
  click($('#qesave')); click($('#qeback')); await wait(20); w.viewQuoteEdit(); await wait(60); click($('.qe-type[data-t="Sale"]')); await wait(10); type($('#qesu'), 'busy elsewhere'); 
  const dirty0 = w.QE.dirty; await wait(300); S5.off();
  const kept = !!$('#qe') && w.QE.dirty === true && w.QE.q && !w.QE.q.no && /not saved/.test(toast()) && !!w.QB.lost[no];
  w.QE.dirty = false; w.viewQuotes(); await wait(80); const lr = $('#qlist [data-lost]');
  ok('P56 refused while another form has unsaved work: that form stays, the refused save is kept as a "not saved" row', dirty0 && kept && !!lr && /not saved/.test(lr.textContent), [dirty0, kept, toast(), !!lr]);
  click(lr); await wait(30);
  ok('P57 the kept row opens the refused data + the reason (Open the latest)', !!$('#qe') && cell(0, 'qty').value === '180' && /changed/.test($('#qeerr').textContent) && !!$('#qereload') && !w.QB.lost[no] && w.QE.dirty === true, [!!$('#qe'), $('#qe') && cell(0, 'qty').value]);
  click($('#qereload')); await wait(80);
  // P58: open the same quote again while its save still runs -> it waits and opens the saved version (next save is not STALE)
  type(cell(0, 'qty'), '190'); const S6 = slow(150); click($('#qesave')); click($('#qeback')); await wait(20); w.viewQuoteEdit(no); await wait(40);
  const waiting = !!$('#qe') && !w.QE.q; await wait(300); S6.off();
  const shown = $('#qe') && w.QE.q ? cell(0, 'qty').value : ''; type(cell(0, 'qty'), '191'); click($('#qesave')); await wait(150);
  ok('P58 the same quote opened while its save runs waits, then shows the saved data; the next save works (no STALE)', waiting && shown === '190' && qty() === 191 && !!$('#qv'), [waiting, shown, qty(), (($('#qeerr') || {}).textContent || '')]);
  // P59: the session ends while a save runs (the person left the form) -> sign-in + the save is reported as not saved
  w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '200'); const S7 = slow(100, () => V("Object.keys(PE.store).filter(function(k){return k.indexOf('OS:')===0}).forEach(function(k){PE.del(k)})"));
  click($('#qesave')); click($('#qeback')); await wait(300); S7.off();
  ok('P59 session ended on a background save: sign-in + "not saved" told', !!$('#em') && /not saved/.test(toast()) && qty() === 191, [toast(), qty()]);
  await login('sales@p.com'); await wait(20);
  // P60: the answer lands while a dialog is open on the clean form -> stays on the form
  w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '210'); const S8 = slow(100); click($('#qesave')); click($('#qepaste')); await wait(300); S8.off();
  ok('P60 an open dialog is not closed by the answer (stays on the form; saved)', !!$('#dlg') && !!$('#qe') && qty() === 210, [!!$('#dlg'), !!$('#qe'), qty()]);
  // ---- W4g round 2 (CodeRabbit + every way to fail)
  const S2x = (o) => { const c0 = w.call; let n = 0; const seen = [];   // o: { ms, before(n), fail(n) -> message|null, post(n, r) -> r }
    w.call = function (fn) { const a = [].slice.call(arguments); if (fn !== 'officeQuoteSave' && !(o.all && fn === o.all)) return c0.apply(null, a); n++; const k = n; seen.push(fn === 'officeQuoteSave' ? JSON.parse(JSON.stringify(a[2])) : fn);
      return new w.Promise((res, rej) => setTimeout(() => { if (o.before) o.before(k); const f = o.fail && o.fail(k); if (f) { rej(new w.Error(f)); return; }
        c0.apply(null, a).then(r => res(o.post ? o.post(k, r) : r), rej); }, o.ms || 60)); };
    return { n: () => n, seen, off: () => { w.call = c0; } }; };
  const other = (adv) => db("(function(){var t=officeLogin('dir@p.com','GoodPass1',false).token,F=officeQuoteForm(t,'" + no + "');officeQuoteSave(t,{no:F.quote.no,ev:F.quote.ev,type:'Rental',cust:F.quote.cust,site:F.quote.site,date:F.quote.date,valid:F.quote.valid,prep:'',adv:" + adv + ",lines:F.quote.lines});})()");
  const unload = () => { const e = new w.Event('beforeunload', { cancelable: true }); w.dispatchEvent(e); return e.defaultPrevented; };
  const nq = () => db("PD.rows('Quotes').length");
  await wait(30); if (!$('#out')) await login('sales@p.com');
  // P61 + P62: a kept (refused) save protects sign-out and closing the tab
  w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '220'); let X = S2x({ ms: 80, before: () => other(31) });
  click($('#qesave')); click($('#qeback')); await wait(20); w.viewQuoteEdit(); await wait(60); click($('.qe-type[data-t="Sale"]')); await wait(10); type($('#qesu'), 'other form');
  await wait(250); X.off(); const kept61 = !!w.QB.lost[no]; w.QE.dirty = false; w.viewQuotes(); await wait(80);
  const ul1 = unload(); click($('#out')); await wait(10); const ask61 = /not saved/.test(($('#dlg') || {}).textContent || ''); click($('#dno')); await wait(10);
  ok('P61 a refused save kept in Quotes: sign-out asks (names it), Cancel keeps it + stays signed in', kept61 && ask61 && !$('#em') && !!w.QB.lost[no], [kept61, ask61]);
  ok('P62 closing the tab warns while a refused save is kept; not when nothing is at risk', ul1 === true && (function () { const k = w.QB.lost; w.QB.lost = {}; const r = unload(); w.QB.lost = k; return r === false; })());
  click($('#qlist [data-lost]')); await wait(30); click($('#qereload')); await wait(80);
  // P63: dirty form + a save still running -> ONE question; Cancel keeps the form dirty and the landing save does not navigate away
  type(cell(0, 'qty'), '230'); X = S2x({ ms: 150 }); click($('#qesave')); type(cell(0, 'qty'), '231');
  click($('#out')); await wait(10); const nd = $$('#dlg').length, txt63 = ($('#dlg') || {}).textContent || ''; click($('#dno')); await wait(300); X.off();
  ok('P63 sign-out with unsaved edits while a save runs: one question; Cancel keeps the edits (dirty), the answer does not leave the form', nd === 1 && /not saved yet/.test(txt63) && /still being sent/.test(txt63) && w.QE.dirty === true && !!$('#qe') && cell(0, 'qty').value === '231' && qty() === 230, [nd, txt63.slice(0, 120), w.QE.dirty, !!$('#qe'), qty()]);
  // P64: an answer without ev + a queued run: the queued one is NOT sent; form keeps the data + says why (Open the latest)
  click($('#qesave')); await wait(150); w.viewQuoteEdit(no); await wait(80);
  type(cell(0, 'qty'), '240'); X = S2x({ ms: 100, post: (k, r) => { if (k === 1 && r) delete r.ev; return r; } }); click($('#qesave')); type(cell(0, 'qty'), '241'); click($('#qesave')); await wait(350); X.off();
  ok('P64 answer without a version: the queued save is not sent, the form keeps 241 + "Open the latest"; 240 saved', X.n() === 1 && qty() === 240 && !!$('#qe') && cell(0, 'qty').value === '241' && /not sent/.test($('#qeerr').textContent) && !!$('#qereload') && w.QE.dirty === true, [X.n(), qty(), $('#qeerr') && $('#qeerr').textContent]);
  click($('#qereload')); await wait(80);
  // P65: new quote, Save twice fast (2nd with a change) -> exactly ONE new quote, carrying the 2nd change
  w.viewQuoteEdit(); await wait(60); click($('.qe-type[data-t="Sale"]')); await wait(10); focus($('#qecu')); await wait(5); click(pickOp('Test Client')); await wait(5); focus($('#qesi')); await wait(5); click(pickOp('Tower A')); await wait(5);
  type(cell(0, 'desc'), 'Double'); w.qePickClose(); type(cell(0, 'qty'), '1'); type(cell(0, 'unit'), 'pc'); type(cell(0, 'rate'), '1');
  let n65 = nq(); X = S2x({ ms: 80 }); click($('#qesave')); click($('#qesave')); type(cell(0, 'qty'), '2'); click($('#qesave')); click($('#qesave')); await wait(400); X.off();
  const q65 = db("PD.rows('Quotes').slice(-1)[0].QuoteNo"), l65 = db("must(PD,'QuoteLines','QuoteNo','" + q65 + "').Qty");
  ok('P65 new quote saved 4x fast (a change in between): one quote, 2 calls, 2nd as an edit of it, qty 2', nq() === n65 + 1 && X.n() === 2 && !X.seen[0].no && X.seen[1].no === q65 && l65 === 2 && !!$('#qv'), [nq() - n65, X.n(), X.seen.map(x => x.no), l65]);
  // P66: new quote refused after leaving -> the new form opens again with its data; saving it then makes ONE quote
  w.viewQuoteEdit(); await wait(60); click($('.qe-type[data-t="Sale"]')); await wait(10); focus($('#qecu')); await wait(5); click(pickOp('Test Client')); await wait(5); focus($('#qesi')); await wait(5); click(pickOp('Tower A')); await wait(5);
  type(cell(0, 'desc'), 'Refused new'); w.qePickClose(); type(cell(0, 'qty'), '3'); type(cell(0, 'unit'), 'pc'); type(cell(0, 'rate'), '1');
  let n66 = nq(); X = S2x({ ms: 60, fail: k => k === 1 ? 'BUSY' : null }); click($('#qesave')); w.viewQuotes(); await wait(250);
  const re66 = !!$('#qe') && cell(0, 'desc').value === 'Refused new' && w.QE.dirty === true && nq() === n66; click($('#qesave')); await wait(250); X.off();
  ok('P66 new quote refused (BUSY) after leaving: form back with the data; Save again = one quote', re66 && nq() === n66 + 1 && !!$('#qv'), [re66, nq() - n66]);
  // P67: two quotes saving at the same time both land
  const q2 = q65; w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '250'); X = S2x({ ms: 150 }); click($('#qesave')); click($('#qeback')); await wait(10);
  w.viewQuoteEdit(q2); await wait(80); type(cell(0, 'qty'), '9'); click($('#qesave')); await wait(400); X.off();
  ok('P67 two quotes saved in parallel: both stored', qty() === 250 && db("must(PD,'QuoteLines','QuoteNo','" + q2 + "').Qty") === 9 && X.n() === 2, [qty(), X.n()]);
  // P68: QLOCKED after leaving while another form has edits: toast only, the form stays
  w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '260'); X = S2x({ ms: 80, before: () => db("PD.update('Quotes', must(PD,'Quotes','QuoteNo','" + no + "'), {Status:'Accepted'})") });
  click($('#qesave')); click($('#qeback')); await wait(10); w.viewQuoteEdit(q2); await wait(80); type(cell(0, 'qty'), '10'); await wait(250); X.off();
  ok('P68 locked meanwhile, person busy on another form: told by toast, the other form + its edits stay', /locked/.test(toast()) && !!$('#qe') && cell(0, 'qty').value === '10' && w.QE.dirty === true && qty() === 250, [toast(), qty()]);
  db("PD.update('Quotes', must(PD,'Quotes','QuoteNo','" + no + "'), {Status:'Draft'})"); w.QE.dirty = false;
  // P69: names with HTML in the "Saving…" / "not saved" rows are text
  w.QB.pend.px = { cust: '<img src=x onerror=window.__x9=1>', project: '<b>p</b>', type: '<i>T' }; w.QB.lost.lx = { J: { no: '<img src=x>' }, s: { cust: '<img src=y onerror=window.__x9=1>', type: 'Sale', d: {} }, m: 'STALE' };
  w.viewQuotes(); await wait(80); const x69 = $$('#qlist img').length; delete w.QB.pend.px; delete w.QB.lost.lx; w.quotesDraw();
  ok('P69 HTML in names on the pending / kept rows is shown as text', x69 === 0 && !w.__x9, x69);
  // P70: Save & PDF, then a queued Save -> ONE PDF call after the last save
  w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '270'); X = S2x({ ms: 80, all: 'officeQuotePdf' }); click($('#qesavep')); type(cell(0, 'qty'), '271'); click($('#qesave')); await wait(500); X.off();
  const pdfs = X.seen.filter(x => x === 'officeQuotePdf').length, saves = X.seen.filter(x => typeof x === 'object').length;
  ok('P70 Save & PDF + a queued Save: 2 saves, then exactly 1 PDF (of the last version)', saves === 2 && pdfs === 1 && X.seen[X.seen.length - 1] === 'officeQuotePdf' && qty() === 271, [X.seen.map(x => typeof x === 'object' ? 'save' : x), qty()]);
  await wait(100);
  // P71: refused (BUSY) while staying on the form: edits kept, Save again works on the same version
  w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '280'); X = S2x({ ms: 60, fail: k => k === 1 ? 'BUSY' : null }); click($('#qesave')); await wait(150);
  const k71 = w.QE.dirty === true && !!$('#qe') && cell(0, 'qty').value === '280' && qty() === 271; click($('#qesave')); await wait(200); X.off();
  ok('P71 BUSY while on the form: edits kept + dirty; Save again saves (no STALE)', k71 && qty() === 280 && !!$('#qv'), [k71, qty()]);
  // P72: the session ends during the queued run
  w.viewQuoteEdit(no); await wait(80); type(cell(0, 'qty'), '290'); X = S2x({ ms: 80, before: k => { if (k === 2) V("Object.keys(PE.store).filter(function(k){return k.indexOf('OS:')===0}).forEach(function(k){PE.del(k)})"); } });
  click($('#qesave')); type(cell(0, 'qty'), '291'); click($('#qesave')); await wait(400); X.off();
  ok('P72 session ends between a save and its queued re-run: first saved, then sign-in + "not saved" told, nothing left running', qty() === 290 && !!$('#em') && /not saved/.test(toast()) && w.qeBusyN() === 0, [qty(), !!$('#em'), toast()]);
  // P73 (QP): the unit is picked from a dropdown list (the line's own unit selected); picking one updates the line
  await login('sales@p.com'); w.viewQuoteEdit(no); await wait(80);
  const u73 = cell(0, 'unit'), o73 = u73 && u73.options ? [...u73.options].map(o => o.value) : [], was73 = u73 ? u73.value : '';
  if (u73 && o73.length) type(u73, o73.find(v => v && v !== was73));
  ok('P73 unit = dropdown of the list, current unit selected; picking one updates the line', !!u73 && u73.tagName === 'SELECT' && o73.length > 3 && o73.includes(was73) && w.QE.q.lines[0].unit === u73.value && u73.value !== was73, [u73 && u73.tagName, o73.length, was73, w.QE.q.lines[0].unit]);
  w.QE.dirty = false;
  // P74 (QP): Add picture uploads it, Save keeps it (PicID), the reopened form shows it, Remove + Save clears it
  db(`PD.ensureColumn('Quotes', 'PicID'); var QPF = {}; OSG_DRV_ = { info: function (id) { var f = QPF[id]; return f ? { size: f.b.length, mime: f.m, name: 'p' } : null; }, b64: function (id) { return QPF[id] ? Utilities.base64Encode(QPF[id].b) : null; },
    blob: function () { return null; }, decodes: function () { return true; }, bin: function () { return true; }, add: function () { throw new Error('x'); } };
    if (typeof OQPIC_ADD_ !== 'undefined') OQPIC_ADD_ = function (d, n, m, b) { var id = 'QPICPG' + Object.keys(QPF).length + 'x'; QPF[id] = { b: b, m: m }; return id; };`);
  w.viewQuoteEdit(no); await wait(80);
  const be74 = n => [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255];
  const png74 = [137, 80, 78, 71, 13, 10, 26, 10, ...be74(13), 73, 72, 68, 82, ...be74(40), ...be74(30), 8, 6, 0, 0, 0, 1, 2, 3, 4, ...be74(2), 73, 68, 65, 84, 120, 1, 5, 6, 7, 8, ...be74(0), 73, 69, 78, 68, 174, 66, 96, 130];
  const fi74 = $('#qepf'); let id74 = '', img74 = false, pic1 = '', back74 = false, pic2 = 'x';
  if (fi74) {
    Object.defineProperty(fi74, 'files', { value: [new w.File([new Uint8Array(png74)], 'p.png', { type: 'image/png' })], configurable: true }); fi74.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(200);
    id74 = w.QE.q.pic; img74 = !!$('#qepic img'); click($('#qesave')); await wait(300);
    pic1 = db("String(must(PD,'Quotes','QuoteNo','" + no + "').PicID)");
    w.viewQuoteEdit(no); await wait(80); back74 = !!$('#qepic img'); click($('#qepx')); click($('#qesave')); await wait(300);
    pic2 = db("String(must(PD,'Quotes','QuoteNo','" + no + "').PicID||'')");
  }
  ok('P74 picture: Add uploads it, Save keeps it (PicID), reopened form shows it, Remove + Save clears it', /^QPICPG/.test(id74) && img74 && pic1 === id74 && back74 && pic2 === '', [id74, img74, pic1, back74, pic2, toast()]);
  // P75 (QP): every line has the unit dropdown; another unit on a measured line drops the measure (qty typed), on a lump-sum line ends lump sum
  w.viewQuoteEdit(no); await wait(80); w.QE.q.lines[0].dim = { L: 10, W: '', H: 5, N: '' }; w.QE.q.lines[0].unit = 'm²'; w.QE.q.lines[0].qty = 50; w.QE.q.lines[0].size = '10 × 5 m';
  w.QE.q.lines.push(Object.assign(w.qeLine(), { desc: 'Lump', basis: 'lump', unit: 'lot', qty: 1 })); w.qeRedrawRows();
  const s75 = [cell(0, 'unit'), cell(1, 'unit')].map(e => e && e.tagName).join(); if (cell(0, 'unit') && cell(0, 'unit').tagName === 'SELECT') type(cell(0, 'unit'), 'set');
  if (cell(1, 'unit') && cell(1, 'unit').tagName === 'SELECT') type(cell(1, 'unit'), 'm²');
  const l75 = w.QE.q.lines;
  ok('P75 unit dropdown on measured + lump lines; set on a measured line -> no measure, qty typed; m² on a lump line -> per unit', s75 === 'SELECT,SELECT' && l75[0].unit === 'set' && !l75[0].dim && !cell(0, 'qty').readOnly && l75[1].basis === 'unit' && l75[1].unit === 'm²', [s75, l75[0].unit, !!l75[0].dim, l75[1].basis, l75[1].unit]);
  w.QE.dirty = false;
  console.log('page', pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(2); });
