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
V(`PD.insert('Quotes', { QuoteNo: 'CAE/Q/2026/951', Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0001', Status: 'Sent' });`);
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
  click($('[data-n="Delivery"]')); await wait(40);
  const opts = $$('#cej option').map(o => o.value);
  ok('F1a a quote with no job is offered', opts.includes('Q:CAE/Q/2026/951'), opts);
  pick($('#cej'), 'Q:CAE/Q/2026/951'); await wait(5);
  ok('F1b To shows the quote site', /CAE\/Q\/2026\/951/.test($('#cet').value), $('#cet').value);
  ok('F2a vendor fields hidden by default', $('#cevw').style.display === 'none' && $('#cevn').style.display === 'none' && $('#cevx').style.display === 'none');
  pick($('#cesrc'), 'Vendor'); await wait(5);
  ok('F2b vendor picker shown, From hidden', $('#cevw').style.display === '' && $('#cef').parentNode.style.display === 'none');
  pick($('#cevd'), '__new'); await wait(5);
  ok('F2c new-vendor fields shown', $('#cevn').style.display === '');
  type($('.ch-ol .li'), 'RL-STD-20'); type($('.ch-ol .lq'), '999'); await wait(5);
  ok('F2d line: vendor rental, no stock check', /vendor rental/.test($('.ch-av').innerHTML) && !/ch-neg/.test($('.ch-av').innerHTML), $('.ch-av').innerHTML);
  click($('#ces')); await wait(20);
  ok('F2e new vendor needs name, phone, address', /name, phone and address/.test($('#cem').textContent), $('#cem').textContent);
  type($('#cevnn'), 'Smoke Vendor'); type($('#cevnp'), '0171'); type($('#cevna'), 'Dhaka'); type($('#cevr'), 'VDO-7'); click($('#ces')); await wait(250);
  const no = V(`(function(){var c=PD.rows('Challans').filter(function(c){return c.MatSource==='Vendor';});return c.length?c[c.length-1].QuoteNo+'|'+c[c.length-1].SupID+'|'+c[c.length-1].SupplierRef:'';})()`);
  ok('F2f saved: quote + new vendor + DO on the challan', /^CAE\/Q\/2026\/951\|SUP-\d+\|VDO-7$/.test(no), no);
  ok('F2g view: vendor pill + Quote box', /vendor rental/.test($('#cv').textContent) && /Quote/.test($('#cv').textContent), $('#cv').textContent.slice(0, 300));
  click($('#cvo')); await wait(30); click($('#dyes')); await wait(300);
  const st = V(`(function(){var c=PD.rows('Challans').filter(function(c){return c.MatSource==='Vendor';}).pop();return c.Status+'|'+c.JobNo+'|'+PD.rows('StockMoves').filter(function(v){return v.RefNo===c.ChallanNo;}).length;})()`);
  ok('F2h posted with no vehicle no.: job made, 0 moves', /^Posted\|CAE\/J\/.+\|0$/.test(st), [st, (global.ERRS || []).slice(-2)]);
  ok('F2i vendor post toast says no stock moved (E3b-2)', /No stock moved/.test(toast()) && !/Stock moved/.test(toast()), toast());
  await wait(200);
  const cvc0 = $('#cvc') && $('#cvc').textContent;
  click($('#cvp'));
  ok('F3a PDF button shows its own busy state (E3b-4)', $('#cvp') && $('#cvp').disabled && /PDF|Opening/.test($('#cvp').textContent), $('#cvp') && $('#cvp').outerHTML.slice(0, 200));
  ok('F3b Cancel button untouched while the PDF is made (E3b-4)', !$('#cvc') || (!$('#cvc').disabled && $('#cvc').textContent === cvc0), $('#cvc') && $('#cvc').outerHTML.slice(0, 200));
  await wait(300);
  // r31 F3: item picture field (edit dialog) + card box
  V(`PD.ensureColumn('Items', 'PicID'); var PF = {}, PFN = 0; OIPIC_ADD_ = function (d, n, m, b) { var id = 'PGPIC' + (++PFN) + 'abcdef'; PF[id] = { b: b, m: m }; return id; };
    OSG_DRV_ = { file: function (id) { return PF[id] || null; }, info: function (id) { var f = PF[id]; return f ? { size: f.b.length, mime: f.m, name: 'x' } : null; }, blob: function () { return null; },
      b64: function (id) { return PF[id] ? Utilities.base64Encode(PF[id].b) : null; }, add: function () { throw new Error('no'); }, bin: function () { return true; }, decodes: function () { return true; } };`);
  await login('yard@p.com'); w.viewItem('RL-STD-20'); await wait(150);
  ok('P3a item card: Picture box, no picture yet', /Picture/.test($('#iv').textContent) && /No picture/.test($('#iv').textContent), $('#iv').textContent.slice(0, 200));
  click($('#ie')); await wait(30);
  ok('P3b edit dialog: picture field with Add picture', $('#xpic') && /Add picture/.test($('#xpic').textContent) && $('#xpf'), $('#xpic') && $('#xpic').innerHTML);
  const be = n => [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255], dd = [120, 1];
  const png = [137, 80, 78, 71, 13, 10, 26, 10].concat(be(13), [73, 72, 68, 82], be(400), be(300), [8, 6, 0, 0, 0], [1, 2, 3, 4], be(dd.length), [73, 68, 65, 84], dd, [5, 6, 7, 8], be(0), [73, 69, 78, 68], [174, 66, 96, 130]);
  const f = new w.File([new Uint8Array(png)], 'a.png', { type: 'image/png' }), inp = $('#xpf');
  Object.defineProperty(inp, 'files', { value: [f], configurable: true }); inp.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(200);
  ok('P3c upload: thumb + Change / Remove shown, Save free again', $('#xpic img') && /Change/.test($('#xpic').textContent) && $('#xpx') && !$('#dyes').disabled, [$('#xpic') && $('#xpic').innerHTML.slice(0, 200), toast()]);
  click($('#dyes')); await wait(300);
  const pid = V(`String(must(PD, 'Items', 'ItemCode', 'RL-STD-20').PicID || '')`);
  ok('P3d Save keeps the picture on the item', /^PGPIC\d+abcdef$/.test(pid), [pid, toast(), (global.ERRS || []).slice(-2)]);
  await wait(150);
  ok('P3e card shows the picture', $('#iv img.st-pic'), $('#iv') && $('#iv').innerHTML.slice(0, 300));
  click($('#ie')); await wait(30); click($('#xpx')); await wait(5); click($('#dyes')); await wait(300);
  ok('P3f Remove + Save clears it', V(`String(must(PD, 'Items', 'ItemCode', 'RL-STD-20').PicID || '')`) === '', toast());
  // r34 F5: picker shows the quote no. on its job (+ find), no direct-from-supplier, own stock short = from outside (Post allowed), vendor Return
  V(`PD.insert('Quotes', { QuoteNo: 'CAE/Q/2026/952', Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0001', Status: 'Accepted' });
    PD.insert('Jobs', { JobNo: 'CAE/J/2026/902', QuoteNo: 'CAE/Q/2026/952', CustID: 'CUST-0001', SiteID: 'SITE-0001', JobType: 'Rental', HireBasis: 'Item', Status: 'Awaiting order' });
    var SL5 = ensureSiteLoc(PD, find(PD.rows('Sites'), 'SiteID', 'SITE-0001'));
    PD.insert('Challans', { ChallanNo: 'CAE/DC/2026/952', Kind: 'Delivery', Status: 'Draft', ChallanDate: new Date(2026, 10, 20), JobNo: 'CAE/J/2026/902', FromLoc: 'LOC-SUPPLIER', ToLoc: SL5, SupID: 'SUP-0001', MatSource: 'Vendor', MadeBy: 'x' });
    PD.insert('ChallanLines', { LineID: 'CL-P5V', ChallanNo: 'CAE/DC/2026/952', ItemCode: 'BD-ST-207', Qty: 7 }); postChallan(PD, 'CAE/DC/2026/952');`);
  const y5 = V(`stockAt(PD, 'RL-STD-20', 'LOC-YARD')`);
  await login('ps2@p.com'); click(tile('dos')); await wait(120); click($('[data-n="Delivery"]')); await wait(40);
  const o5 = $$('#cej option'), j5 = o5.filter(o => o.value === 'CAE/J/2026/902')[0];
  ok('P5a job entry shows its quote no.; that quote is not listed twice', j5 && /CAE\/Q\/2026\/952/.test(j5.textContent) && !o5.some(o => o.value === 'Q:CAE/Q/2026/952'), o5.map(o => o.textContent));
  type($('#cejf'), '952'); await wait(5);
  ok('P5b find by quote no. narrows the list', $$('#cej option').map(o => o.value).join() === ',CAE/J/2026/902', $$('#cej option').map(o => o.value));
  ok('P5c From has no direct-from-supplier', !$('#cef option[value="LOC-SUPPLIER"]') && !!$('#cef option[value="LOC-YARD"]'));
  pick($('#cej'), 'CAE/J/2026/902'); type($('.ch-ol .li'), 'RL-STD-20'); type($('.ch-ol .lq'), String(y5 + 5)); await wait(5);
  ok('P5d line over our stock: "5 from outside", not red', /5 from outside/.test($('.ch-av').textContent) && !/ch-neg/.test($('.ch-av').innerHTML), $('.ch-av').innerHTML);
  type($('#cev'), 'V5'); click($('#ces')); await wait(250);
  ok('P5k usable cell amber (ch-out), not red', !!$('#cv td.ch-out') && !$('#cv td.ch-neg'), $('#cv .ltab') && $('#cv .ltab').innerHTML.slice(0, 400));
  ok('P5e draft view: from-outside note, no "Post refuses"', /from outside/.test($('#cv').textContent) && !/Post refuses/.test($('#cv').textContent), $('#cv').textContent.slice(0, 600));
  click($('#cvo')); await wait(30); click($('#dyes')); await wait(300);
  ok('P5l Post toast says 5 came from outside', /5 from outside/.test(toast()), toast());
  ok('P5f Post allowed: Posted, yard 0, view shows From outside RL-STD-20 5', /Posted/.test($('#cv .qhead').textContent) && V(`stockAt(PD, 'RL-STD-20', 'LOC-YARD')`) === 0 && /From outside[^]*RL-STD-20 5/.test($('#cv').textContent), [toast(), $('#cv').textContent.slice(0, 600)]);
  w.viewCh('returns'); await wait(150); click($('[data-n="Return"]')); await wait(40);
  pick($('#crj'), 'CAE/J/2026/902'); await wait(5);
  ok('P5g own return lists RL-STD-20 with the outside part', /outside 5/.test($('#crl').textContent), $('#crl').textContent.slice(0, 300));
  pick($('#crsrc'), 'Vendor'); await wait(5);
  ok('P5h vendor mode: vendor list has the job\'s vendor, Good-to hidden', !!$('#crvd option[value="SUP-0001"]') && $('#crt').parentNode.style.display === 'none' && $('#crvw').style.display === '');
  pick($('#crvd'), 'SUP-0001'); await wait(5);
  ok('P5i vendor items out: BD-ST-207 7', !!$('#crl tr[data-k="BD-ST-207"]') && $('#crl tr[data-k="BD-ST-207"]').getAttribute('data-o') === '7' && !$('#crl tr[data-k="RL-STD-20"]'), $('#crl').textContent.slice(0, 300));
  type($('#crl [data-f=g]'), '3'); type($('#crvr'), 'VRN-5'); click($('#crs')); await wait(250);
  const vr = V(`(function(){var c=PD.rows('Challans').filter(function(c){return c.Kind==='Return'&&c.MatSource==='Vendor';});return c.length?c[0].SupID+'|'+c[0].SupplierRef+'|'+c[0].ToLoc:'';})()`);
  ok('P5m vendor return draft says no stock moves; Return notes no longer mention Off-hire', /vendor rental: Post makes the PDF; no stock moves/.test($('#cv').textContent) && !/Off-hire\./.test(d.body.innerHTML), $('#cv').textContent.slice(0, 300));
  ok('P5j vendor return saved (vendor, ref, to the vendor) and the view route says vendor', vr === 'SUP-0001|VRN-5|LOC-SUPPLIER' && /vendor/.test($('#cv').textContent), [vr, $('#cv').textContent.slice(0, 300)]);
  ok('F no JS errors', !jsErr.length, jsErr);
  console.log('page-f ' + pass + '/' + (pass + fail));
})();
