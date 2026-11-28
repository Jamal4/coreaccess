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
V(`['ac2@p.com|AC2', 'ac1@p.com|AC1', 'pr2@p.com|PR2', 'ach@p.com|AC3'].forEach(function (x) { var p = x.split('|'), a = p[1] === 'AC2' ? { AC: 2 } : p[1] === 'AC1' ? { AC: 1 } : p[1] === 'PR2' ? { PR: 2 } : { AC: 3 };
    oSaveLogin_(PE, { email: p[0], name: p[0].split('@')[0] + ' user', depts: a, password: 'GoodPass1' }); });
  PD.insert('Quotes', { QuoteNo: 'CAE/Q/2026/961', Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0001', Status: 'Sent' });
  PD.insert('Jobs', { JobNo: 'CAE/J/2026/961', CustID: 'CUST-0001', SiteID: 'SITE-0001', JobType: 'Rental', HireBasis: 'Item', Status: 'On hire' });
  PD.insert('Suppliers', { SupID: 'SUP-0961', Name: '<img src=x onerror=window.__x=1>', Phone: '1', Status: 'Active' });`);
(async () => {
  let dom, w, d, jsErr = [];
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const pick = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const toast = () => $('#toast').textContent;
  const login = async em => { dom = makeDom(); w = dom.window; d = w.document; w.addEventListener('error', e => jsErr.push(e.message)); await wait(30); type($('#em'), em); type($('#pw'), 'GoodPass1'); click($('#go')); await wait(60); };
  const tile = k => $('.tile[data-k="' + k + '"]');
  const DB = s => V(s);
  // AP1 tiles: AC staff + PR staff see it ready; AC view sees it with no buttons; others not
  await login('yard@p.com'); ok('AP1a yard login: no bills tile', !tile('bills'));
  await login('ac1@p.com'); click(tile('bills')); await wait(120);
  ok('AP1b AC view: list, no Record / Pay buttons', !!$('#acl') && !$('#acnb') && !$('#acnp'), $('#acn') && $('#acn').innerHTML);
  await login('pr2@p.com'); ok('AP1c PR staff sees the tile ready', tile('bills') && !tile('bills').querySelector('.soon'));
  click(tile('bills')); await wait(120); ok('AP1d PR staff: Record bill, no Pay', !!$('#acnb') && !$('#acnp'));
  // AP2 record a bill: new vendor, quote link (Find box), VAT total
  await login('ac2@p.com'); click(tile('bills')); await wait(120);
  ok('AP2a AC staff: both buttons; owed Tk 0', !!$('#acnb') && !!$('#acnp') && /0\.00/.test($('#acsum').textContent));
  click($('#acnb')); await wait(20);
  ok('AP2b new vendor fields hidden first', $('#abnv').style.display === 'none');
  pick($('#abs'), '__new'); ok('AP2c + New vendor shows its fields', $('#abnv').style.display === '');
  type($('#abnn'), 'Page Vendor'); type($('#abnp'), '017'); type($('#abna'), 'Dhaka');
  type($('#abjf'), '961'); ok('AP2d Find narrows to the 961 job + quote', $$('#abj option').length === 3, $$('#abj option').map(o => o.value));
  pick($('#abj'), 'Q:CAE/Q/2026/961'); type($('#abi'), 'PV-INV-1'); type($('#aba'), '1,000'); type($('#abv'), '150');
  ok('AP2e total shown', /1,150\.00/.test($('#abt').value), $('#abt').value);
  click($('#abs2')); await wait(200);
  const B1 = DB(`PD.rows('Bills').filter(function (b) { return b.SupplierInvNo === 'PV-INV-1'; }).map(function (b) { return b.BillID + '|' + b.QuoteNo + '|' + b.Amount + '|' + b.VAT + '|' + b.Status; }).join()`);
  ok('AP2f bill saved: quote, amount, VAT, Unpaid', /^BILL-\d{5}\|CAE\/Q\/2026\/961\|1000\|150\|Unpaid$/.test(B1), B1);
  const bid = B1.split('|')[0];
  ok('AP2g bill view opened with Pay + Edit + Cancel', /recorded/.test(toast()) && !!$('#abp') && !!$('#abe') && !!$('#abc'), toast());
  // AP3 pay this bill partly, cash
  click($('#abp')); await wait(30);
  ok('AP3a pay screen: bill ticked, amount = balance', $('.apck[data-b="' + bid + '"]').checked && $('#apa').value === '1150', $('#apa').value);
  type($('.apba[data-b="' + bid + '"]'), '400'); pick($('#apme'), 'Cash');
  ok('AP3b cash hides bank; amount follows the ticked bills', $('#apbk').parentNode.style.display === 'none' && $('#apa').value === '400');
  click($('#apsv')); await wait(200);
  const P1 = DB(`PD.rows('Payments').map(function (p) { return p.PayID + '|' + p.Method + '|' + p.Amount + '|' + p.ChequeStatus; }).join()`);
  ok('AP3c payment saved: cash 400 NA', /^CAE\/PV\/\d{4}\/\d{3}\|Cash\|400\|NA$/.test(P1), P1);
  ok('AP3d payment view shows the bill; no Cancel for AC staff', /Payment .* saved/.test(toast()) && $('#acv').textContent.indexOf(bid) >= 0 && !$('#apc'), toast());
  ok('AP3e bill now Part paid', DB(`find(PD.rows('Bills'), 'BillID', '${bid}').Status`) === 'Part paid');
  // AP4 direct payment, no bill: note needed; job link; makes its paid bill
  click($('#acvb')); await wait(120); click($('#acnp')); await wait(20); pick($('#apmode'), 'direct'); await wait(5);
  ok('AP4a direct: job / quote shown, bills hidden, amount editable', $('#apdw').style.display === '' && $('#apbw').style.display === 'none' && !$('#apa').readOnly);
  ok('AP4b + New vendor offered on direct', $$('#aps option').some(o => o.value === '__new'));
  pick($('#aps'), 'SUP-0001'); pick($('#apme'), 'Cash'); type($('#apa'), '250'); click($('#apsv')); await wait(80);
  ok('AP4c a note is needed', /what the direct payment is for/i.test($('#apm').textContent), $('#apm').textContent);
  type($('#apn'), 'Van hire'); pick($('#apj'), 'CAE/J/2026/961'); click($('#apsv')); await wait(200);
  const D1 = DB(`PD.rows('Bills').filter(function (b) { return b.Notes === 'Van hire'; }).map(function (b) { return b.JobNo + '|' + b.Status + '|' + (b.PayID ? 'pv' : '-'); }).join()`);
  ok('AP4d direct bill made, paid, on the job', D1 === 'CAE/J/2026/961|Paid|pv', D1);
  // AP5 overpay message; XSS vendor name escaped
  click($('#acvb')); await wait(120); click($('#acnp')); await wait(20); pick($('#aps'), 'SUP-0961'); await wait(5);
  ok('AP5a no open bills note', /No open bills/.test($('#apbw').textContent));
  click($$('#actb .chip')[2] || $('#acvb')); await wait(20);
  ok('AP5b nothing injected', !w.__x && !$$('img').length);
  // AP6 head cancels the cash payment: bill owed again
  await login('ach@p.com'); click(tile('bills')); await wait(120); click($$('#actb .chip').filter(c => c.getAttribute('data-k') === 'pays')[0]); await wait(20);
  const pv1 = P1.split('|')[0]; click($('.qcard[data-c="' + pv1 + '"]')); await wait(20);
  ok('AP6a head sees Cancel payment', !!$('#apc')); click($('#apc')); await wait(10); click($('#dyes')); await wait(20);
  ok('AP6b reason needed', /Give a reason/.test($('#derr').textContent)); $('#acr').value = 'test'; click($('#dyes')); await wait(200);
  ok('AP6c cancelled; bill Unpaid again', DB(`find(PD.rows('Payments'), 'PayID', '${pv1}').ChequeStatus + '|' + find(PD.rows('Bills'), 'BillID', '${bid}').Status`) === 'Cancelled|Unpaid' && /cancelled/.test(toast()), toast());
  // AP7 suppliers tab: owed + vendor view; cancel the unpaid bill (AC staff)
  click($('#acvb')); await wait(120); click($$('#actb .chip').filter(c => c.getAttribute('data-k') === 'sups')[0]); await wait(20);
  const vid = DB(`find(PD.rows('Suppliers'), 'Name', 'Page Vendor').SupID`);
  ok('AP7a vendor owes 1,150', /1,150\.00/.test($('.qcard[data-c="' + vid + '"]').textContent));
  click($('.qcard[data-c="' + vid + '"]')); await wait(20); click($('tr[data-b="' + bid + '"]')); await wait(20); click($('#abc')); await wait(10);
  $('#acr').value = 'dup'; click($('#dyes')); await wait(200);
  ok('AP7b bill cancelled', DB(`find(PD.rows('Bills'), 'BillID', '${bid}').Status`) === 'Cancelled' && !$('#abe'));
  ok('AP no JS errors', !jsErr.length && !(global.ERRS || []).length, [jsErr, global.ERRS]);
  console.log('page-ac ' + pass + '/' + (pass + fail));
})();
