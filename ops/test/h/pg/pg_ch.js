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
V(`['ywh@p.com|YW3', 'ps@p.com|PS1', 'hr@p.com|HR3'].forEach(function (x) { var p = x.split('|'), a = p[1] === 'YW3' ? { YW: 3 } : p[1] === 'PS1' ? { PS: 1 } : { HR: 3 };
    oSaveLogin_(PE, { email: p[0], name: p[0].split('@')[0] + ' user', depts: a, password: 'GoodPass1' }); });
  try { upgradeO7(PD); } catch (e) {}
  PD.insert('Locations', { LocID: 'LOC-SCRAP', Name: 'Scrap', Type: 'Scrap', SiteID: '', Status: 'Active' });
  PD.update('Items', must(PD, 'Items', 'ItemCode', 'RL-STD-20'), { ReorderLevel: 50, Size: '2.0 m' });
  postOpeningStock(PD, [{ ItemCode: 'RL-STD-20', LocID: 'LOC-YARD', Qty: 40 }, { ItemCode: 'BD-ST-207', LocID: 'LOC-YARD', Qty: 30 }], new Date(2026, 10, 1));
  PD.insert('Items', { ItemCode: 'XS-1', Name: '<img src=x onerror=window.__x=1>', Category: '<b>c</b>', Size: '"><i>s', Unit: 'pc', StockTracked: 'Yes', Status: 'Active' });
  PD.insert('Items', { ItemCode: 'SET-P1', Name: 'Page set', Category: 'Set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' });
  PD.insert('KitParts', [{ KitPartID: 'KP-P1', SetCode: 'SET-P1', ItemCode: 'RL-STD-20', QtyPerSet: 4 }, { KitPartID: 'KP-P2', SetCode: 'SET-P1', ItemCode: 'BD-ST-207', QtyPerSet: 10 }]);`);
V(`oSaveLogin_(PE, { email: 'ps2@p.com', name: 'ps2 user', depts: { PS: 2 }, password: 'GoodPass1' });
  oSaveLogin_(PE, { email: 'ps3@p.com', name: 'ps3 user', depts: { PS: 3 }, password: 'GoodPass1' });
  PD.insert('Jobs', { JobNo: 'CAE/J/2026/901', CustID: 'CUST-0001', SiteID: 'SITE-0001', JobType: 'Rental', HireBasis: 'Item', Status: 'Awaiting order' });
  ['LOC-SUPPLIER|Supplier', 'LOC-SOLD|Sold', 'LOC-REPAIR|Repair', 'LOC-LOST|Lost'].forEach(function (x) { var p = x.split('|'); if (!find(PD.rows('Locations'), 'LocID', p[0])) PD.insert('Locations', { LocID: p[0], Name: p[0], Type: p[1], SiteID: '', Status: 'Active' }); });`);
(async () => {
  let dom, w, d, jsErr = [];
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const pick = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  const toast = () => $('#toast').textContent;
  const login = async em => { dom = makeDom(); w = dom.window; d = w.document; w.addEventListener('error', e => jsErr.push(e.message)); await wait(30); type($('#em'), em); type($('#pw'), 'GoodPass1'); click($('#go')); await wait(60); };
  const tile = k => $('.tile[data-k="' + k + '"]');
  await login('ps2@p.com');
  ok('CHP1 Delivery orders + Returns tiles ready for PS Staff', tile('dos') && !tile('dos').querySelector('.soon') && tile('returns') && !tile('returns').querySelector('.soon'));
  click(tile('dos')); await wait(120);
  ok('CHP2 list loads, New delivery + New sale buttons, empty list', !!$('[data-n="Delivery"]') && !!$('[data-n="Sale"]') && /No challans match/.test($('#chl').textContent), $('#chl') && $('#chl').textContent);
  click($('[data-n="Delivery"]')); await wait(40);
  ok('CHP3 new delivery form: job list has the open rental job, From has the yard; no direct-from-supplier (r34 F5: Material source Vendor rental)', !!$('#cej option[value="CAE/J/2026/901"]') && !!$('#cef option[value="LOC-YARD"]') && !$('#cef option[value="LOC-SUPPLIER"]'));
  pick($('#cej'), 'CAE/J/2026/901'); type($('.ch-ol .li'), 'RL-STD-20'); type($('.ch-ol .lq'), '10'); await wait(10);
  ok('CHP4 line shows the yard balance (own 40, ok)', /need 10 · ok · own 40/.test($('.ch-av').textContent), $('.ch-av').textContent);
  click($('#ces')); await wait(150);
  ok('CHP5 saved: view of the new draft with Post / Edit / Discard', /^CAE\/DC\/\d{4}\/\d{3}$/.test(($('#cv h2') || {}).textContent) && !!$('#cvo') && !!$('#cve') && !!$('#cvc') && /Post will take/.test($('#cv').textContent), $('#cv') && $('#cv').textContent.slice(0, 300));
  const no1 = $('#cv h2').textContent;
  click($('#cvo')); await wait(30); click($('#dyes')); await wait(30);
  ok('CHP6 post without a vehicle no. is stopped on the page', /Vehicle no. is needed/.test(($('#derr') || {}).textContent || ''));
  type($('#cpv'), 'DM-TA 11-0001'); click($('#dyes')); await wait(200);
  ok('CHP7 posted: Posted pill, Taken from own 10, PDF button, no Post', /Posted/.test($('#cv .qhead').textContent) && /Taken from/.test($('#cv').textContent) && !$('#cvo') && !!$('#cvp'), $('#cv') && $('#cv').textContent.slice(0, 400));
  ok('CHP8 stock moved on the server', V(`stockAt(PD, 'RL-STD-20', 'LOC-YARD')`) === 30);
  click($('#cvb')); await wait(150);
  click(tile('returns') || $('#chb')); await wait(10);
  w.eval("viewHome()"); await wait(20); click(tile('returns')); await wait(150);
  click($('[data-n="Return"]')); await wait(40);
  pick($('#crj'), 'CAE/J/2026/901'); await wait(10);
  ok('CHP9 return form lists the on-hire item (10)', !!$('#crl tr[data-k="RL-STD-20"]') && $('#crl tr[data-k="RL-STD-20"]').getAttribute('data-o') === '10');
  type($('#crl [data-f=g]'), '12'); click($('#crs')); await wait(20);
  ok('CHP10 more than on hire is stopped on the page', /only 10 is on hire/.test($('#crm').textContent));
  type($('#crl [data-f=g]'), '8'); type($('#crl [data-f=dm]'), '2'); click($('#crs')); await wait(150);
  click($('#cvo')); await wait(30); click($('#dyes')); await wait(200);
  ok('CHP11 return posted: 8 back to the yard, 2 to repair', /Posted/.test($('#cv .qhead').textContent) && V(`stockAt(PD, 'RL-STD-20', 'LOC-YARD') + ',' + stockAt(PD, 'RL-STD-20', 'LOC-REPAIR')`) === '38,2', V(`stockAt(PD, 'RL-STD-20', 'LOC-YARD') + ',' + stockAt(PD, 'RL-STD-20', 'LOC-REPAIR')`));
  ok('CHP12 PS Staff sees no Cancel on a posted challan (head only)', !$('#cvc'));
  // ---- YW Staff: rent-in
  await login('yard@p.com');
  click(tile('stock')); await wait(120); click($('#str')); await wait(150);
  ok('CHP13 Transfers (r34 F5): New transfer only, no hire-in / off-hire, no rent-in register when nothing is rented in', $('#chrent').textContent === '' && !$('[data-n="Hire-in"]') && !$('[data-n="Off-hire"]') && !!$('[data-n="Transfer"]'), $('#chn').textContent);
  V(`PD.insert('Challans', { ChallanNo: 'CAE/DC/2026/940', Kind: 'Hire-in', Status: 'Draft', ChallanDate: new Date(2026, 10, 19), JobNo: '', FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', SupID: 'SUP-0001', SupplierRef: 'DO-1', MadeBy: 'old' });
    PD.insert('ChallanLines', { LineID: 'CL-P940', ChallanNo: 'CAE/DC/2026/940', ItemCode: 'RL-STD-20', Qty: 25 }); postChallan(PD, 'CAE/DC/2026/940');`);
  click($('#chb')); await wait(120); click($('#str')); await wait(150);
  ok('CHP14 an old posted hire-in still shows: the register lists 25 of SUP-0001 in the yard', /Steel Co/.test($('#chrent').textContent) && /25/.test($('#chrent').textContent), $('#chrent').textContent);
  ok('CHP15 the old hire-in is in the list (readable), still no New hire-in / off-hire', !!$('#chl [data-c="CAE/DC/2026/940"]') && !$('[data-n="Hire-in"]') && !$('[data-n="Off-hire"]'));
  await login('view@p.com'); w.eval("viewContract('CAE/J/2026/901')"); await wait(150);
  ok('CHP17 contract view (Sales View) lists the job\'s challans with status', /Challans \(\d+\)/.test($('#tv').textContent) && !!$('#tch [data-c="' + no1 + '"]') && /Posted/.test($('#tch [data-c="' + no1 + '"]').textContent), $('#tv') && $('#tv').textContent.slice(-400));
  click($('#tch [data-c="' + no1 + '"]')); await wait(200);
  ok('CHP18 a challan opens from the contract; back button says Contract', ($('#cv h2') || {}).textContent === no1 && /Contract CAE\/J\/2026\/901/.test($('#cvb').textContent), $('#cvb') && $('#cvb').textContent);
  click($('#cvb')); await wait(150);
  ok('CHP19 back returns to the contract', !!$('#tv') && /CAE\/J\/2026\/901/.test(($('#tv h2') || {}).textContent || ''));
  w.eval("viewItem('RL-STD-20')"); await wait(150);
  const lk = $('#iv [data-ch="' + no1 + '"]');
  ok('CHP20 item view: the challan no. in Last moves is a link', !!lk, $('#iv') && $('#iv').textContent.slice(-300));
  click(lk); await wait(200);
  ok('CHP21 it opens the challan; back returns to the item', ($('#cv h2') || {}).textContent === no1 && /Item RL-STD-20/.test($('#cvb').textContent) && (click($('#cvb')), true));
  await wait(150); ok('CHP22 back on the item page', !!$('#iv') && /RL-STD-20/.test($('#iv').textContent));
  w.eval("viewContract('CAE/J/2026/901')"); await wait(150); click($('#tch [data-c="' + no1 + '"]')); await wait(200); w.eval("viewCh('dos')"); await wait(150); click($('#chl [data-c="' + no1 + '"]')); await wait(200);
  ok('CHP23 opened from the list later, back says Challans again (no stale back target)', /Challans/.test($('#cvb').textContent) && !/Contract/.test($('#cvb').textContent), $('#cvb') && $('#cvb').textContent);
  V(`if (!PD.hasTab(ODOC_REG_)) oDocSetup_(PE, PD); var sT = find(PD.rows('Settings'), 'Key', 'ChallanTemplateID'); if (sT) PD.update('Settings', sT, { Value: '1BZcoTmLx7KidBg88iK05JaP-WXRnrBmHLdVc2X_3Pwk' }); else PD.insert('Settings', { Key: 'ChallanTemplateID', Value: '1BZcoTmLx7KidBg88iK05JaP-WXRnrBmHLdVc2X_3Pwk' });`);
  await login('dir@p.com'); w.eval('viewDocs()'); await wait(200);
  const bl = c => { const a = $('#dlist [data-c="' + c + '"] a'); return a ? a.getAttribute('href') + '|' + a.getAttribute('target') : ''; };
  ok('CHP24 register: Delivery / Return / Transfer forms link the blank template (new tab), the quote form doesn\'t', /\/document\/d\/1BZco.*\/edit\|_blank/.test(bl('CAE-PS-F01')) && bl('CAE-PS-F02') === bl('CAE-PS-F01') && bl('CAE-YW-F01') === bl('CAE-PS-F01') && !bl('CAE-SC-F01'), [bl('CAE-PS-F01'), bl('CAE-SC-F01')]);
  // ---- CR M8 run 1: part-posted draft, Qty 0 set-part return, inactive supplier with stock
  V(`var SL9 = ensureSiteLoc(PD, find(PD.rows('Sites'), 'SiteID', 'SITE-0001'));
    PD.insert('Challans', [{ ChallanNo: 'CAE/DC/2026/950', Kind: 'Delivery', Status: 'Draft', ChallanDate: new Date(2026, 10, 20), JobNo: 'CAE/J/2026/901', FromLoc: 'LOC-YARD', ToLoc: SL9, Vehicle: 'V9', MadeBy: 'ps2 user' },
      { ChallanNo: 'CAE/DC/2026/951', Kind: 'Return', Status: 'Draft', ChallanDate: new Date(2026, 10, 20), JobNo: 'CAE/J/2026/901', FromLoc: SL9, ToLoc: 'LOC-YARD', MadeBy: 'ps2 user' }]);
    PD.insert('ChallanLines', [{ LineID: 'CL-P950', ChallanNo: 'CAE/DC/2026/950', ItemCode: 'RL-STD-20', Qty: 1 }, { LineID: 'CL-P951', ChallanNo: 'CAE/DC/2026/951', ItemCode: 'RL-STD-20', Qty: 1, QtyGood: 1 },
      { LineID: 'CL-P952', ChallanNo: 'CAE/DC/2026/951', ItemCode: 'BD-ST-207', Qty: 0, QtyGood: '', QtyDamaged: 1, QtyLost: '' }]);
    PD.insert('StockMoves', { MoveID: 'MV-P950', MoveDate: new Date(2026, 10, 20), ItemCode: 'RL-STD-20', Qty: 1, FromLoc: 'LOC-YARD', ToLoc: SL9, RefType: 'Challan', RefNo: 'CAE/DC/2026/950', JobNo: 'CAE/J/2026/901', Owner: '' });`);
  await login('ps2@p.com'); w.eval("chView('CAE/DC/2026/950')"); await wait(250);
  ok('CHP25 part-posted draft: says the post did not finish, Post only (no Edit / Discard)', /post did not finish/.test($('#cv').textContent) && !!$('#cvo') && !$('#cve') && !$('#cvc'), $('#cv') && $('#cv').textContent.slice(0, 400));
  click($('#cvo')); await wait(30); click($('#dyes')); await wait(250);
  ok('CHP26 Post finishes it: Posted, moved once', /Posted/.test($('#cv .qhead').textContent) && V(`PD.rows('StockMoves').filter(function (v) { return v.RefNo === 'CAE/DC/2026/950'; }).length`) === 1, $('#cv') && $('#cv').textContent.slice(0, 300));
  w.eval("chView('CAE/DC/2026/951')"); await wait(250);
  ok('CHP27 return with a Qty 0 set-part damage line: no Edit, a note to edit it in the sheet panel; Post / Discard stay', !$('#cve') && /sheet panel/.test($('#cv').textContent) && !!$('#cvo') && !!$('#cvc'), $('#cv') && $('#cv').textContent.slice(0, 400));
  V(`PD.update('Suppliers', must(PD, 'Suppliers', 'SupID', 'SUP-0001'), { Status: 'Inactive' });`);
  await login('yard@p.com'); click(tile('stock')); await wait(120); click($('#str')); await wait(150);
  ok('CHP28 an inactive supplier still holding old rented items: still in the register; no hire-in / off-hire made', /Steel Co/.test($('#chrent').textContent) && !$('[data-n="Hire-in"]') && !$('[data-n="Off-hire"]'), $('#chrent').textContent);
  V(`PD.update('Suppliers', must(PD, 'Suppliers', 'SupID', 'SUP-0001'), { Status: 'Active' });`);
  ok('CHP16 no page script errors; only expected server refusals', !jsErr.length && (global.ERRS || []).every(e => /BADINPUT|NOTPOSTED/.test(e)), [jsErr, global.ERRS]);
  console.log('page-ch', pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(2); });
