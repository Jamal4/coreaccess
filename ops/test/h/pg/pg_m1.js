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
  const toast = () => $('#toast').textContent;
  const login = async em => { await wait(30); type($('#em'), em); type($('#pw'), 'GoodPass1'); click($('#go')); await wait(60); };
  const fresh = async em => { dom.window.close(); dom = makeDom(); w = dom.window; d = w.document; await login(em); };
  const tile = k => $('.tile[data-k="' + k + '"]'), cards = () => $$('#clist .ccard'), card = id => $('#clist .ccard[data-c="' + id + '"]');
  const S1 = V("JSON.stringify(PD.rows('Sites').filter(function (s) { return s.CustID === 'CUST-0001'; }).map(function (s) { return [s.SiteID, oUncell_(s.Project), oUncell_(s.Address)]; }))"), sites = JSON.parse(S1);
  const nCu = () => V("PD.rows('Customers').filter(function (c) { return !blank(c.CustID); }).length");
  await login('sales@p.com');
  ok('M1P1 Customers tile is ready (no SOON)', tile('customers') && !tile('customers').querySelector('.soon'));
  click(tile('customers')); await wait(60);
  ok('M1P2 list: every customer as a card + count line + New customer for SC Staff', cards().length === nCu() && /^\d+ customers? · \d+ active · \d+ inactive$/.test($('#ccnt').textContent) && !!$('#cadd'), [cards().length, $('#ccnt').textContent]);
  type($('#cq'), 'zzzz'); ok('M1P3 search with no hit: "No customers match."', cards().length === 0 && /No customers match/.test($('#clist').textContent));
  type($('#cq'), 'test cl'); ok('M1P4 search finds Test Client', cards().length === 1 && !!card('CUST-0001'));
  type($('#cq'), sites[0][1].toLowerCase().slice(0, 6)); ok('M1P5 search by project name', !!card('CUST-0001'), sites[0]);
  type($('#cq'), ''); click($('#cst [data-s="Inactive"]')); ok('M1P6 Inactive chip: only inactive ones', cards().every(c => /Inactive/.test(c.textContent)) && $('#cst [data-s="Inactive"]').getAttribute('aria-pressed') === 'true');
  click($('#cst [data-s=""]')); ok('M1P7 All chip back', cards().length === nCu());
  click(card('CUST-0001')); await wait(60);
  const hist = () => $$('#cv tr.go');
  ok('M1P8 view: name, Active pill, projects table, quote history with totals (SC sees money)', $('#cv h2').textContent === 'Test Client' && /Active/.test($('#cv .qhead').textContent) && $$('#cv [data-se]').length === sites.length && hist().length > 0 && /Total/.test($('#cv').textContent) && /Tk /.test(hist()[0].textContent), [hist().length]);
  ok('M1P9 view: Edit / New project / New quote buttons', !!$('#cedit') && !!$('#snew') && !!$('#qnew'));
  // new customer: client check, add, DUP + open it
  click($('#cback')); await wait(60); click($('#cadd')); await wait(40);
  type($('#fn'), 'Page Co'); type($('#fy'), '400'); let n0 = calls.length; click($('#dyes')); await wait(30);
  ok('M1P10 payment days 400 refused on the page, nothing sent', /Payment days/.test($('#derr').textContent) && calls.length === n0);
  type($('#fy'), '30'); type($('#fp'), '01999-000111'); click($('#dyes')); await wait(80);
  const pid = V("String(find(PD.rows('Customers'), 'Name', 'Page Co').CustID)");
  ok('M1P11 added: toast + its view opens; payment days written', /Page Co added/.test(toast()) && $('#cv h2') && $('#cv h2').textContent === 'Page Co' && V("num(find(PD.rows('Customers'), 'Name', 'Page Co').PaymentDays)") === 30, [toast()]);
  click($('#cback')); await wait(60); click($('#cadd')); await wait(40); type($('#fn'), 'the test client'); click($('#dyes')); await wait(80);
  ok('M1P12 duplicate name: told with the id + "Open it", nothing added', /Same name as customer CUST-0001/.test($('#derr').textContent) && !!$('#dgo') && V("PD.rows('Customers').filter(function (c) { return /test client/i.test(c.Name); }).length") === 1, [$('#derr').textContent]);
  click($('#dgo')); await wait(80); ok('M1P13 "Open it" opens that customer', !$('#dlg') && $('#cv h2') && $('#cv h2').textContent === 'Test Client');
  // edit: status Inactive hides New quote, list shows it
  V("void 0"); click($('#cback')); await wait(60); click(card(pid)); await wait(60); click($('#cedit')); await wait(40);
  ok('M1P14 edit dialog filled', $('#fn').value === 'Page Co' && $('#fy').value === '30' && $('#fs .on').getAttribute('data-v') === 'Active');
  type($('#fp'), V("oUncell_(must(PD, 'Customers', 'CustID', 'CUST-0001').Phone)") || '01999-000111'); click($('#dyes')); await wait(80);
  const ph1 = V("oUncell_(must(PD, 'Customers', 'CustID', 'CUST-0001').Phone)");
  ok('M1P15 edit to another customer\'s phone: DUP, not saved', !ph1 || (/Same phone as customer CUST-0001/.test($('#derr').textContent) && V("oUncell_(find(PD.rows('Customers'), 'Name', 'Page Co').Phone)") === '01999-000111'), [ph1, $('#derr') && $('#derr').textContent]);
  type($('#fp'), '01999-000111'); click($('#fs [data-v="Inactive"]')); click($('#dyes')); await wait(80);
  ok('M1P16 saved Inactive: toast, pill, no New quote; sheet Status', toast() === 'Saved.' && /Inactive/.test($('#cv .qhead').textContent) && !$('#qnew') && V("String(find(PD.rows('Customers'), 'Name', 'Page Co').Status)") === 'Inactive', [toast()]);
  // projects: DUP, add, edit
  click($('#snew')); await wait(40); type($('#sp'), 'P Tower'); type($('#sa'), 'Road 1'); type($('#sd'), '2026-12-05'); click($('#dyes')); await wait(80);
  ok('M1P17 new project added + listed with its start date', /P Tower added/.test(toast()) && $$('#cv [data-se]').length === 1 && /P Tower/.test($('#cv .ltab').textContent), [toast()]);
  click($('#snew')); await wait(40); type($('#sp'), 'p tower'); type($('#sa'), 'ROAD 1'); click($('#dyes')); await wait(80);
  ok('M1P18 same project + address again: DUP told, not saved', /already has that project/.test($('#derr').textContent) && V("PD.rows('Sites').filter(function (s) { return /p tower/i.test(s.Project); }).length") === 1);
  click($('#dno')); await wait(10); click($('#cv [data-se]')); await wait(40);
  ok('M1P19 edit project dialog filled', $('#sp').value === 'P Tower' && $('#sd').value === '2026-12-05');
  type($('#sr'), 'Rafiq'); type($('#sh'), 'abc'); click($('#dyes')); await wait(80);
  ok('M1P20 bad rep phone: server refusal shown, dialog stays', !!$('#dlg') && $('#derr').textContent.length > 0, [$('#derr').textContent]);
  type($('#sh'), '01700-123456'); click($('#dyes')); await wait(80);
  ok('M1P21 project saved: rep + phone in the table', toast() === 'Saved.' && /Rafiq · 01700-123456/.test($('#cv .ltab').textContent), [toast()]);
  // gone records
  V("PD.update('Customers', find(PD.rows('Customers'), 'Name', 'Page Co'), { CustID: 'GONE-1' })"); click($('#cedit')); await wait(40); click($('#dyes')); await wait(80);
  ok('M1P22 customer gone while editing: back to the list + told', !$('#dlg') && !!$('#clist') && /no longer exists/.test(toast()), [toast()]);
  V("PD.update('Customers', find(PD.rows('Customers'), 'CustID', 'GONE-1'), { CustID: '" + pid + "' })"); await wait(60);
  w.viewCust('CUST-9999'); await wait(80); ok('M1P23 opening a missing customer: list + told', !!$('#clist') && /CUST-9999 no longer exists/.test(toast()), [toast()]);
  // new quote pre-picks the customer; quote row opens the quote
  w.viewCust('CUST-0001'); await wait(80); const qno = hist()[0].getAttribute('data-q'); click($('#qnew')); await wait(120);
  ok('M1P24 New quote from the customer: editor opens with it picked', !!$('#qe') && w.QE.q && w.QE.q.cust === 'CUST-0001', [w.QE.q && w.QE.q.cust]);
  w.viewCust('CUST-0001'); await wait(80); click(hist()[0]); await wait(80);
  ok('M1P25 a quote row opens that quote', d.title.indexOf(qno) >= 0, [d.title]);
  w.viewCust(pid); await wait(80); w.viewQuoteEdit('', pid); await wait(120);
  ok('M1P26 an Inactive customer is not pre-picked on a new quote', !!$('#qe') && w.QE.q && w.QE.q.cust === '', [w.QE.q && w.QE.q.cust]);
  // CR-M1: someone saved meanwhile (STALE) -> dialog closed, reloaded, nothing overwritten; accepted value with a missing total
  w.viewCust('CUST-0001'); await wait(80); const ad0 = V("String(must(PD, 'Customers', 'CustID', 'CUST-0001').Address)"); click($('#cedit')); await wait(40);
  V("PD.update('Customers', must(PD, 'Customers', 'CustID', 'CUST-0001'), { Address: 'Changed elsewhere' })"); type($('#fc'), 'Late Person'); click($('#dyes')); await wait(80);
  ok('M1P31 customer saved by someone else meanwhile: dialog closed, told, reloaded, their change kept', !$('#dlg') && /Someone changed this/.test(toast()) && V("String(must(PD, 'Customers', 'CustID', 'CUST-0001').Address)") === 'Changed elsewhere' && V("oUncell_(must(PD, 'Customers', 'CustID', 'CUST-0001').ContactPerson)") !== 'Late Person', [toast()]);
  await wait(60); click($('#cedit')); await wait(40); type($('#fa'), ad0); click($('#dyes')); await wait(80);
  ok('M1P32 the reloaded form saves fine', toast() === 'Saved.' && V("String(must(PD, 'Customers', 'CustID', 'CUST-0001').Address)") === ad0, [toast()]);
  click($('#cv [data-se]')); await wait(40); const sid0 = $('#dlg') ? $$('#cv [data-se]')[0].getAttribute('data-se') : '';
  V("PD.update('Sites', must(PD, 'Sites', 'SiteID', '" + sid0 + "'), { SiteRep: 'Other Rep' })"); type($('#sr'), 'Late Rep'); click($('#dyes')); await wait(80);
  ok('M1P33 project saved by someone else meanwhile: dialog closed, told, their change kept', !$('#dlg') && /Someone changed this/.test(toast()) && V("oUncell_(must(PD, 'Sites', 'SiteID', '" + sid0 + "').SiteRep)") === 'Other Rep', [toast(), sid0]);
  await wait(60); const q1 = { no: 'Q-A', date: '2026-01-02', project: 'p', type: 'Sale', status: 'Accepted', job: '', total: 100 };
  const accV = () => { const m = $$('#cv .meta span').filter(s => s.textContent === 'Accepted value')[0]; return m ? m.nextSibling.textContent : ''; };
  w.CU.c = Object.assign({}, w.CU.c, { money: true, quotes: [q1, Object.assign({}, q1, { no: 'Q-B', total: 50 })] }); w.custDraw(); const v1 = accV();
  w.CU.c = Object.assign({}, w.CU.c, { quotes: [q1, Object.assign({}, q1, { no: 'Q-B', total: null })] }); w.custDraw(); const v2 = accV();
  w.CU.c = Object.assign({}, w.CU.c, { quotes: [q1, Object.assign({}, q1, { no: 'Q-B' }, { total: undefined })] }); delete w.CU.c.quotes[1].total; w.custDraw(); const v3 = accV();
  ok('M1P34 accepted value: summed when all totals are there; "—" when an accepted total is missing', /^Tk 150/.test(v1) && v2 === '—' && v3 === '—', [v1, v2, v3]);
  w.viewCust('CUST-0001'); await wait(80);
  // view-only + yard
  await fresh('view@p.com'); click(tile('customers')); await wait(60);
  ok('M1P27 SC View: list, no New customer', cards().length > 0 && !$('#cadd'));
  click(card('CUST-0001')); await wait(60); ok('M1P28 SC View: view without Edit / New project / New quote / project edit', $('#cv h2') && !$('#cedit') && !$('#snew') && !$('#qnew') && !$('#cv [data-se]'));
  await fresh('yard@p.com'); ok('M1P29 Yard login: no ready Customers tile', !tile('customers') || !!tile('customers').querySelector('.soon') || tile('customers').classList.contains('off') || tile('customers').disabled, [tile('customers') && tile('customers').outerHTML.slice(0, 200)]);
  w.viewCusts && w.viewCusts(); await wait(80); ok('M1P30 Yard forcing the list: refused, no customer shown', cards().length === 0, [$('#clist') && $('#clist').textContent]);
  console.log('page-m1', pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(2); });
