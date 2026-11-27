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
(async () => {
  let dom, w, d;
  const $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
  const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const type = (el, v) => { el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const toast = () => $('#toast').textContent;
  const login = async em => { dom = makeDom(); w = dom.window; d = w.document; await wait(30); type($('#em'), em); type($('#pw'), 'GoodPass1'); click($('#go')); await wait(60); };
  const tile = k => $('.tile[data-k="' + k + '"]');
  const card = c => $('.qcard[data-i="' + c + '"]');
  const P = s => V(s);
  // ---- YW Staff
  await login('yard@p.com');
  ok('M3P1 Stock tile ready for YW Staff', tile('stock') && !tile('stock').querySelector('.soon'));
  click(tile('stock')); await wait(80);
  ok('M3P2 list: count line, New item, no opening / locations buttons, cards with 4 groups, no money', /^\d+ items · 1 below reorder level · \d+ shown$/.test($('#scnt').textContent) && !!$('#sn') && !$('#so') && !$('#sl') && card('RL-STD-20') && card('RL-STD-20').querySelectorAll('.st-grp div').length === 4 && !/value Tk/.test($('#slist').textContent), $('#scnt').textContent);
  ok('M3P3 low card marked, set card shows can-make', card('RL-STD-20').classList.contains('st-lc') && /Low/.test(card('RL-STD-20').textContent) && /Can make from yard: 3/.test(card('SET-P1').textContent), card('SET-P1') && card('SET-P1').textContent);
  ok('M3P42 names / categories / sizes are shown as text (no HTML)', !!card('XS-1') && !card('XS-1').querySelector('img,i') && card('XS-1').querySelector('.qc').textContent === '<img src=x onerror=window.__x=1>' && /<b>c<\/b>/.test(card('XS-1').querySelector('.qp').textContent) && !w.__x);
  click(card('XS-1')); await wait(80);
  ok('M3P43 item view shows them as text too', $('#iv h2') && !$('#iv').querySelector('img,i') && /<img src=x/.test($('#iv .sub').textContent) && /<b>c<\/b>/.test($('#iv .pill.ty').textContent) && !w.__x);
  click($('#ib')); await wait(80);
  type($('#sq'), 'bd-st'); await wait(20);
  ok('M3P4 search', $$('.qcard').length === 1 && !!card('BD-ST-207'), $$('.qcard').length);
  type($('#sq'), ''); click($('#slw')); await wait(20);
  ok('M3P5 low-stock chip', $$('.qcard').length === 1 && !!card('RL-STD-20') && $('#slw').getAttribute('aria-pressed') === 'true');
  click($('#slw')); click($('.chip[data-f="site"]')); await wait(20);
  ok('M3P6 "On sites" chip: nothing there yet', $$('.qcard').length === 0 && /No items match/.test($('#slist').textContent));
  click($('.chip[data-f="all"]')); await wait(20);
  click($('#sn')); await wait(30);
  type($('#xc'), 'bad code'); type($('#xn'), 'X'); const nc = calls.length; click($('#dyes')); await wait(30);
  ok('M3P7 new item: bad code stopped on the page (no call)', /Item code/.test($('#derr').textContent) && calls.length === nc, $('#derr').textContent);
  ok('M3P8 YW Staff: no price fields, lock note', !$('#xp1') && /not shown to your login/.test($('#dlg').textContent));
  type($('#xc'), 'pg-new-1'); type($('#xn'), 'Page item'); type($('#xk'), 'Ringlock'); type($('#xw'), '2.5'); type($('#xr'), '7'); click($('#dyes')); await wait(120);
  ok('M3P9 added: item view opens, toast, sheet row', $('#iv h2') && $('#iv h2').textContent === 'PG-NEW-1' && /PG-NEW-1 added/.test(toast()) && P("must(PD,'Items','ItemCode','PG-NEW-1').ReorderLevel") === 7, [toast(), $('#iv h2') && $('#iv h2').textContent]);
  ok('M3P10 item view: quantity box, prices hidden, edit button, no opening button (YW Staff)', /In yard/.test($('#iv').textContent) && /Hidden for your login/.test($('#iv').textContent) && !!$('#ie') && !$('#io'));
  click($('#ie')); await wait(30);
  ok('M3P11 edit dialog: code read-only', $('#xc').readOnly && $('#xc').value === 'PG-NEW-1');
  type($('#xn'), 'Page item 2'); click($('#dyes')); await wait(120);
  ok('M3P12 edit saved', /Saved/.test(toast()) && P("String(must(PD,'Items','ItemCode','PG-NEW-1').Name)") === 'Page item 2', toast());
  click($('#ie')); await wait(30); P("(function(){PD.update('Items',must(PD,'Items','ItemCode','PG-NEW-1'),{Size:'other user'});return 1;})()");
  type($('#xn'), 'Page item 3'); click($('#dyes')); await wait(120);
  ok('M3P13 stale edit: closed, reloaded, not saved', !$('#dlg') && /Someone changed/.test(toast()) && P("String(must(PD,'Items','ItemCode','PG-NEW-1').Name)") === 'Page item 2', toast());
  await wait(60); click($('#ie')); await wait(30); click($$('#xst button')[1]); const nc14 = calls.length; click($('#dyes')); await wait(60);
  ok('M3P14b r15: set + stock tracked is stopped on the page (a set is not tracked itself), nothing sent', !!$('#dlg') && /not stock-tracked itself/.test($('#derr').textContent) && calls.length === nc14, $('#derr') && $('#derr').textContent);
  click($$('#xtr button')[1]); click($('#dyes')); await wait(120);
  ok('M3P14 an item with no moves may become a set (r15: with Stock tracked No)', P("String(must(PD,'Items','ItemCode','PG-NEW-1').IsSet)") === 'Yes' && P("String(must(PD,'Items','ItemCode','PG-NEW-1').StockTracked)") === 'No', toast());
  click($('#ie')); await wait(30); w.eval("window.__q1=call;call=function(fn){if(fn==='officeItemSave')return Promise.reject(new Error('BADINPUT|set tracked'));return window.__q1.apply(null,arguments);};");
  click($('#dyes')); await wait(60); const m14c = $('#derr') ? $('#derr').textContent : ''; w.eval('call=window.__q1;'); click($('#dno')); await wait(20);
  ok('M3P14c r15: the server\'s set + tracked refusal is told in the dialog', /not stock-tracked itself/.test(m14c) && /Nothing saved/.test(m14c), m14c);
  ok('M3P110 r15: PDFLOCK (a locked quote with no PDF) has its own message', /locked quote .*no new PDF/.test(w.errText(new Error('PDFLOCK'))), w.errText(new Error('PDFLOCK')));
  click($('#ib')); await wait(80); click(card('RL-STD-20')); await wait(80);
  click($('#ie')); await wait(30); click($$('#xtr button')[1]); click($('#dyes')); await wait(120);
  ok('M3P15 tracking off with stock: refused, message in the dialog', !!$('#dlg') && /can't be switched off/.test($('#derr').textContent), $('#derr') && $('#derr').textContent);
  click($('#dno')); await wait(20);
  ok('M3P16 where-it-is + moves table', /LOC-YARD/.test($('#iv').textContent) && /Last moves \(1\)/.test($('#iv').textContent) && /Part of sets/.test($('#iv').textContent));
  click($('#iv tr.go')); await wait(100);
  ok('M3P17 a set row opens the set: parts table', $('#iv h2') && $('#iv h2').textContent === 'SET-P1' && /Parts per set/.test($('#iv').textContent) && /3 sets/.test($('#iv').textContent), $('#iv').textContent.slice(0, 200));
  // ---- CR run 2: For hire / For sale in the item dialog (YW Staff)
  P("(function(){PD.insert('Items',[{ItemCode:'PG-T1',Name:'t1',Category:'Tube',ForHire:'No',ForSale:'Yes'},{ItemCode:'PG-T2',Name:'t2',Category:'Tube',ForHire:'No',ForSale:'Yes'}]);return 1;})()");
  click($('#ib')); await wait(100); click($('#sn')); await wait(30);
  const seg = id => ($$('#' + id + ' button').filter(b => b.getAttribute('aria-checked') === 'true')[0] || {}).textContent;
  ok('M3P50 new item: For hire / For sale segments; no known category -> Yes / No', !!$('#xfh') && !!$('#xfs') && seg('xfh') === 'Yes' && seg('xfs') === 'No', [seg('xfh'), seg('xfs')]);
  type($('#xk'), 'Tube'); await wait(10);
  ok('M3P51 category Tube -> what its items have (No / Yes)', seg('xfh') === 'No' && seg('xfs') === 'Yes', [seg('xfh'), seg('xfs')]);
  type($('#xk'), 'Nothing'); await wait(10); const a52 = [seg('xfh'), seg('xfs')];
  click($$('#xfs button')[0]); type($('#xk'), 'Ringlock'); await wait(10);
  ok('M3P52 unknown category back to Yes / No; once picked by hand a category change keeps the choice', a52.join('/') === 'Yes/No' && seg('xfs') === 'Yes', [a52, seg('xfs')]);
  click($$('#xfs button')[1]); type($('#xk'), 'Tube'); type($('#xc'), 'pg-fl-1'); type($('#xn'), 'Flag item'); const nc53 = calls.length; click($('#dyes')); await wait(120);
  ok('M3P53 saved with the picked flags; item view shows them', P("must(PD,'Items','ItemCode','PG-FL-1').ForHire+'/'+must(PD,'Items','ItemCode','PG-FL-1').ForSale") === 'Yes/No' && /For hireYes/.test($('#iv').textContent) && /For saleNo/.test($('#iv').textContent) && calls.length > nc53, [P("must(PD,'Items','ItemCode','PG-FL-1').ForHire"), $('#iv') && $('#iv').textContent.slice(0, 400)]);
  click($('#ie')); await wait(30);
  ok('M3P54 edit dialog starts from the item (Yes / No)', seg('xfh') === 'Yes' && seg('xfs') === 'No', [seg('xfh'), seg('xfs')]);
  type($('#xk'), 'Tube'); await wait(10); const a55 = [seg('xfh'), seg('xfs')].join('/');
  click($$('#xfh button')[1]); click($$('#xfs button')[0]); click($('#dyes')); await wait(120);
  ok('M3P55 an edit\'s category change does not reset them; Yes / No saved', a55 === 'Yes/No' && P("must(PD,'Items','ItemCode','PG-FL-1').ForHire+'/'+must(PD,'Items','ItemCode','PG-FL-1').ForSale") === 'No/Yes' && /For hireNo/.test($('#iv').textContent), [a55, toast()]);
  // ---- PS View
  await login('ps@p.com');
  ok('M3P18 PS View sees the Stock tile (YW section, View)', !!tile('stock') && /View/.test(tile('stock').closest('.dsec').querySelector('.lv').textContent));
  click(tile('stock')); await wait(80);
  ok('M3P19 PS: list, no New / Opening / Locations', !!card('RL-STD-20') && !$('#sn') && !$('#so') && !$('#sl'));
  click(card('RL-STD-20')); await wait(80);
  ok('M3P20 PS: item view, no edit, prices hidden', !$('#ie') && /Hidden for your login/.test($('#iv').textContent));
  // ---- SC View (money)
  await login('view@p.com');
  click(tile('stock')); await wait(80);
  ok('M3P21 SC View: value shown on cards, no New', /value Tk/.test(card('RL-STD-20').textContent) && !$('#sn'), card('RL-STD-20').textContent);
  click(card('RL-STD-20')); await wait(80);
  ok('M3P22 SC View: prices box with Tk, no edit', /Replacement cost/.test($('#iv').textContent) && /Tk 3,000\.00/.test($('#iv').textContent) && !$('#ie'), $('#iv').textContent.slice(0, 300));
  // ---- HR: no tile
  await login('hr@p.com');
  ok('M3P23 HR only: no Stock tile', !tile('stock'));
  // ---- YW Head: opening + locations
  await login('ywh@p.com');
  click(tile('stock')); await wait(80);
  ok('M3P24 head: Opening + Locations buttons', !!$('#so') && !!$('#sl'));
  click($('#sl')); await wait(80);
  ok('M3P25 locations dialog lists yard / repair / site / lost / scrap, no supplier / sold', /LOC-YARD/.test($('#lt').textContent) && /LOC-SCRAP/.test($('#lt').textContent) && !/LOC-SUPPLIER|LOC-SOLD/.test($('#lt').textContent), $('#lt').textContent);
  type($('#lc'), 'yr-p1'); type($('#ln'), 'Rack P1'); click($$('#lty button')[1]); click($('#dyes')); await wait(150);
  ok('M3P26 location added (Repair), table refreshed, sheet row', /YR-P1 added/.test(toast()) && /YR-P1/.test($('#lt').textContent) && P("String(must(PD,'Locations','LocID','YR-P1').Type)") === 'Repair', toast());
  type($('#lc'), 'LOC-YARD'); type($('#ln'), 'x'); const nl = calls.length; click($('#dyes')); await wait(40);
  ok('M3P27 an existing code is stopped on the page', /already exists/.test($('#derr').textContent) && calls.length === nl);
  click($('#dno')); await wait(20); click($('#so')); await wait(40);
  ok('M3P28 opening dialog: 1 line, new location offered, date = server today', $$('#ols .st-ol').length === 1 && $$('#ols .oloc option').some(o => o.value === 'YR-P1') && $('#od').value === P('oDayOf_(PE.now())'), $('#od').value);
  click($('#oadd')); await wait(10);
  const L = $$('#ols .st-ol');
  L[0].querySelector('.oloc').value = 'LOC-YARD'; L[0].querySelector('.oi').value = 'BD-ST-207'; L[0].querySelector('.oi').dispatchEvent(new w.Event('change')); await wait(5);
  const op28 = [...L[0].querySelectorAll('.oloc option')].filter(o => /\(opened\)/.test(o.textContent)).map(o => o.value).join(','), sel28 = L[0].querySelector('.oloc').value;
  ok('M3P28b r15: BD-ST-207 flags LOC-YARD as opened (not YR-P1); the location chosen stays as it was; nothing disabled (the post decides, CR run 5)', op28 === 'LOC-YARD' && sel28 === 'LOC-YARD' && [...L[0].querySelectorAll('.oloc option')].every(o => !o.disabled), [op28, sel28]);
  ok('M3P28c r15: a new line starts on a location its item is not opened at', (function () { const x = L[1].querySelector('.oi').value, o = (w.ST.rows.filter(r => r.code === x)[0] || {}).op || []; return o.indexOf(L[1].querySelector('.oloc').value) < 0; })(), L[1].querySelector('.oloc').value); L[0].querySelector('.oi').value = 'BD-ST-207'; L[0].querySelector('.oloc').value = 'YR-P1'; type(L[0].querySelector('.oq'), '12');
  L[1].querySelector('.oi').value = 'BD-ST-207'; L[1].querySelector('.oloc').value = 'YR-P1'; type(L[1].querySelector('.oq'), '3');
  const no = calls.length; click($('#dyes')); await wait(30);
  ok('M3P29 the same item + location twice is stopped on the page', /on two lines/.test($('#derr').textContent) && calls.length === no, $('#derr').textContent);
  L[1].querySelector('.oloc').value = 'LOC-YARD'; type(L[1].querySelector('.oq'), '1.5'); click($('#dyes')); await wait(30);
  ok('M3P30 a part quantity is stopped, the field marked', /whole number/.test($('#derr').textContent) && L[1].querySelector('.oq').classList.contains('bad'));
  type(L[1].querySelector('.oq'), '3'); click($('#dyes')); await wait(150);
  ok('M3P31 BD-ST-207 at LOC-YARD has an opening: server EXISTS shown, nothing posted', /already has an opening balance/.test($('#derr').textContent) && P("PD.rows('StockMoves').filter(function(m){return m.ToLoc==='YR-P1';}).length") === 0, $('#derr').textContent);
  click(L[1].querySelector('.st-mini')); await wait(10); click($('#dyes')); await wait(150);
  ok('M3P32 posted: toast, list refreshed, moves in', /1 opening line posted/.test(toast()) && P("PD.rows('StockMoves').filter(function(m){return m.ToLoc==='YR-P1'&&m.RefType==='Opening';}).length") === 1 && !!card('BD-ST-207'), toast());
  ok('M3P33 repair group counts the new repair location', /REPAIR12/.test(card('BD-ST-207').querySelector('.st-grp').textContent.replace(/\s/g, '')), card('BD-ST-207').querySelector('.st-grp').textContent);
  click(card('RL-STD-20')); await wait(80);
  ok('M3P34 head item view: Opening button', !!$('#io'));
  click($('#io')); await wait(40); const def35 = $$('#ols .oloc')[0].value; $$('#ols .oloc')[0].value = 'LOC-YARD'; type($$('#ols .oq')[0], '5'); const nop = calls.length; click($('#dyes')); await wait(40);
  const op35 = ((w.ST.rows.filter(r => r.code === 'RL-STD-20')[0] || {}).op || []);
  ok('M3P35b r15: from the item view the line starts on a location RL-STD-20 is not opened at (it is opened at LOC-YARD)', op35.indexOf('LOC-YARD') >= 0 && op35.indexOf(def35) < 0 && !!def35, [def35, op35]);
  await wait(120); ok('M3P35 opening at a location that already has one: the server refuses (EXISTS; no cached check on the page, CR run 5), plain message, nothing saved', /already has an opening balance/.test($('#derr').textContent) && calls.length === nop + 1 && !!$('#dlg'), [$('#derr').textContent, calls.length - nop]);
  click($('#dno')); await wait(20);
  // ---- Director: prices
  await login('dir@p.com');
  click(tile('stock')); await wait(80); click(card('PG-NEW-1')); await wait(80); click($('#ie')); await wait(30);
  ok('M3P36 Director: price fields', !!$('#xp1') && !!$('#xp4'));
  type($('#xp3'), '1,250.5'); type($('#xp1'), 'abc'); click($('#dyes')); await wait(30);
  ok('M3P37 bad price stopped on the page', /Hire rate/.test($('#derr').textContent));
  type($('#xp1'), ''); click($('#dyes')); await wait(120);
  ok('M3P38 price saved (commas ok)', P("must(PD,'Items','ItemCode','PG-NEW-1').ReplacementCost") === 1250.5 && /Saved/.test(toast()), toast());
  P("(function(){PD.insert('Challans',{ChallanNo:'DC-PG1',Kind:'Delivery',Status:'Draft',PDF:'https://x/pg1'});PD.insert('ChallanLines',{LineID:'CL-PG1',ChallanNo:'DC-PG1',ItemCode:'PG-NEW-1',Qty:1});PD.insert('Notes',{NoteNo:'DN-PG1',Kind:'DN',Status:'Draft',PDF:'https://x/pgn'});PD.insert('Damage',{DamageID:'DMG-PG1',ItemCode:'PG-NEW-1',QtyDamaged:1,DNNo:'DN-PG1'});return 1;})()");
  await wait(60); click($('#ie')); await wait(30); type($('#xn'), 'Page item renamed'); click($('#dyes')); await wait(150);
  ok('M3P44 a name change says how many open PDFs were marked old; links cleared', /2 open PDFs printing this item marked old/.test(toast()) && P("String(must(PD,'Challans','ChallanNo','DC-PG1').PDF)") === '' && P("String(must(PD,'Notes','NoteNo','DN-PG1').PDF)") === '', toast());
  await wait(60); click($('#ie')); await wait(30); type($('#xp3'), '999'); click($('#dyes')); await wait(150);
  ok('M3P45 a replacement-cost change with a Draft debit note: explained in the dialog, not saved', !!$('#dlg') && /Debit note DN-PG1 \(Draft\)/.test($('#derr').textContent) && P("must(PD,'Items','ItemCode','PG-NEW-1').ReplacementCost") === 1250.5, $('#derr') && $('#derr').textContent);
  click($('#dno')); await wait(20);
  click($('#ib')); await wait(80); click($('#sn')); await wait(30); type($('#xc'), 'BD-ST-207'); type($('#xn'), 'dup'); type($('#xk'), 'Board'); click($('#dyes')); await wait(120);
  ok('M3P39 duplicate code: server EXISTS shown in the dialog', /already exists/.test($('#derr').textContent), $('#derr').textContent);
  click($('#dno')); await wait(10);
  // ---- CR run 3 (page): comma input, All items (catalogue) chip, late opening-stock answer after leaving the screen
  await login('ywh@p.com'); click(tile('stock')); await wait(100);
  const nums = w.eval("[stNumIn('1,5',0),stNumIn('1,500',0),stNumIn('1,00,000',0),stNumIn('12,345.5',2),stNumIn('1,500.5,0',2),stNumIn(',500',0),stNumIn('1500,',0),stNumIn('1,5000',0),stNumIn('15,00',0),stNumIn('1,23,45,678',0),stNumIn(' 2.5 ',1),stNumIn('',0),stNumIn('1,500.25',1),stNumIn('1.500,5',2)].map(String).join('|')");
  ok('M3P60 numbers: commas only as thousands groups (1,500 · 1,00,000); 1,5 / ,500 / 1500, / 1,5000 / 15,00 / commas after the point refused', nums === 'null|1500|100000|12345.5|null|null|null|null|null|12345678|2.5||null|null', nums);
  const cnt0 = $('#scnt').textContent;
  ok('M3P61 All: catalogue-only items (not tracked, no stock) not listed or counted', !card('SV-TRANS') && /^\d+ items · /.test(cnt0), cnt0);
  click($('.chip[data-f="items"]')); await wait(30);
  const cnt1 = $('#scnt').textContent, tot = s => s.split(' · ').slice(0, 2).join(' · ');
  ok('M3P62 All items: they are listed, marked "Not tracked"; the item / low totals unchanged; only one chip on', !!card('SV-TRANS') && /Not tracked/.test(card('SV-TRANS').textContent) && tot(cnt1) === tot(cnt0) && !!card('RL-STD-20') && $$('#sf .chip.on').length === 1, [cnt0, cnt1]);
  click(card('SV-TRANS')); await wait(100);
  ok('M3P63 a catalogue item opens', $('#iv h2') && $('#iv h2').textContent === 'SV-TRANS' && /Not tracked/.test($('#iv').textContent));
  click($('#ib')); await wait(100); click($('#sn')); await wait(40);
  type($('#xc'), 'PG-UT-1'); type($('#xn'), 'Untracked add'); type($('#xk'), 'Board'); click($$('#xtr button').filter(b => b.textContent === 'No')[0]); type($('#xr'), '1,5'); click($('#dyes')); await wait(60);
  ok('M3P64 reorder 1,5 refused in the dialog, nothing sent', !!$('#dlg') && /Reorder level: a whole number/.test($('#derr').textContent) && !P("!!find(PD.rows('Items'),'ItemCode','PG-UT-1')"), $('#derr') && $('#derr').textContent);
  type($('#xr'), '1,500'); click($('#dyes')); await wait(150);
  ok('M3P65 1,500 saved as 1500; the new untracked item opens', P("must(PD,'Items','ItemCode','PG-UT-1').ReorderLevel") === 1500 && P("must(PD,'Items','ItemCode','PG-UT-1').StockTracked") === 'No' && $('#iv h2') && $('#iv h2').textContent === 'PG-UT-1');
  click($('#ib')); await wait(100);
  ok('M3P66 back on the list: under All it is not shown, under All items it is (reachable after add)', !card('PG-UT-1') && (click($('.chip[data-f="items"]')), !!card('PG-UT-1')));
  // late answers: the opening-stock fallback load (stock list not loaded) after the user left the item
  const slow = () => w.eval("window.__c0=window.__c0||call;call=function(){var a=arguments,t=this;return new Promise(function(res,rej){setTimeout(function(){window.__c0.apply(t,a).then(res,rej);},150);});};");
  const fast = () => w.eval("if(window.__c0)call=window.__c0;");
  const toItem = async c => { fast(); w.eval("viewItem('" + c + "')"); await wait(120); w.eval('ST.loaded=false;ST.rows=[];ST.locs=[];'); }; // as when the stock list was never loaded: the dialog loads it first
  await toItem('RL-STD-20'); slow(); click($('#io')); await wait(10); click($('#ib')); await wait(400); fast();
  ok('M3P67 opening stock asked, then back to the list before the answer: no dialog opens', !$('#dlg') && !!$('#slist'));
  await toItem('RL-STD-20'); slow(); click($('#io')); await wait(10); fast(); w.eval("viewItem('BD-ST-207')"); await wait(400);
  ok('M3P68 ... or another item opened meanwhile: no dialog over it', !$('#dlg') && $('#iv h2') && $('#iv h2').textContent === 'BD-ST-207');
  await toItem('RL-STD-20'); slow(); click($('#io')); await wait(10); fast(); w.eval('viewHome()'); await wait(400);
  ok('M3P73 ... or the home screen opened meanwhile (no stock request in between): no dialog', !$('#dlg') && !!tile('stock'));
  await toItem('RL-STD-20'); slow(); click($('#io')); await wait(400); fast();
  ok('M3P69 still on the item: the dialog opens for it after the load', !!$('#dlg') && /Opening stock/.test($('#dlgt').textContent) && $('.oi') && $('.oi').value === 'RL-STD-20');
  click($('#dno')); await wait(20);
  await toItem('RL-STD-20'); w.__cnt = 0; w.eval("window.__od0_=openDlg;openDlg=function(){window.__cnt++;return window.__od0_.apply(this,arguments);};"); slow(); click($('#io')); click($('#io')); await wait(450); fast();
  ok('M3P72 asked twice quickly: one dialog opens (the earlier answer is dropped)', w.__cnt === 1 && !!$('#dlg'), w.__cnt);
  w.eval('openDlg=window.__od0_;');
  V("var __sl_ = oStDefs_; oStDefs_ = function () { throw new Error('BUSY'); };"); // officeStockList only (a replaced web call would fail every call closed)
  try {
    await toItem('RL-STD-20'); const t0 = toast(); slow(); click($('#io')); await wait(10); click($('#ib')); await wait(400); fast();
    ok('M3P70 a late failure after leaving: no message popped over the other screen', toast() === t0 && !$('#dlg'), [t0, toast()]);
    await toItem('RL-STD-20'); click($('#io')); await wait(80);
    ok('M3P71 a failure while still there: told', /Could not load the stock: BUSY/.test(toast()), toast());
  } finally { V('oStDefs_ = __sl_;'); global.ERRS = (global.ERRS || []).filter(e => !/^officeStockList:BUSY$/.test(e)); }
  // ---- CR run 4 (page): the unit is fixed once the item is in use
  fast(); w.eval("viewItem('RL-STD-20')"); await wait(150); click($('#ie')); await wait(40);
  const u20 = P("must(PD,'Items','ItemCode','RL-STD-20').Unit");
  ok('M3P74 item in use (stock / moves): the unit shows fixed, read-only, not a list', !!$('#xu') && $('#xu').tagName === 'INPUT' && $('#xu').readOnly && $('#xu').value === u20 && /in use: fixed/.test($('#dlg').textContent), $('#xu') && $('#xu').outerHTML);
  type($('#xs'), '2.0 m'); click($('#dyes')); await wait(150);
  ok('M3P75 ... other fields still save with it (unit sent as it is)', !$('#dlg') && P("must(PD,'Items','ItemCode','RL-STD-20').Size") === '2.0 m' && P("must(PD,'Items','ItemCode','RL-STD-20').Unit") === u20);
  w.eval("viewItem('PG-UT-1')"); await wait(150); click($('#ie')); await wait(40);
  ok('M3P76 an unused item: the unit is a list', !!$('#xu') && $('#xu').tagName === 'SELECT' && !/in use: fixed/.test($('#dlg').textContent));
  type($('#xu'), 'kg'); click($('#dyes')); await wait(150);
  ok('M3P77 ... and changes', !$('#dlg') && P("must(PD,'Items','ItemCode','PG-UT-1').Unit") === 'kg');
  w.eval("viewItem('PG-UT-1')"); await wait(150); click($('#ie')); await wait(40);
  V("PD.insert('StockMoves', { MoveID: 'MV-PG4', MoveDate: new Date(2026, 10, 2), ItemCode: 'PG-UT-1', FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', Qty: 1, RefType: 'Opening' });");
  type($('#xu'), 'pc'); click($('#dyes')); await wait(150);
  ok('M3P78 used after the dialog opened: the server refuses, a plain message, nothing saved, the dialog stays', !!$('#dlg') && /The unit can't change: stock, moves, set parts or challan \/ damage \/ PO lines already count this item in kg\. Nothing saved\./.test($('#derr').textContent) && P("must(PD,'Items','ItemCode','PG-UT-1').Unit") === 'kg', $('#derr') && $('#derr').textContent);
  click($('#dno')); await wait(20);
  // ---- CR run 5 (page): count date judged by the server only; weight to 3 decimals; a set the challan would refuse is flagged
  fast(); w.eval("viewItem('TC-TUBE-3')"); await wait(150); w.eval("ST.today='2020-06-01'"); click($('#io')); await wait(60);
  const L5 = $$('#ols .st-ol'); L5[0].querySelector('.oi').value = 'TC-TUBE-3'; L5[0].querySelector('.oloc').value = 'YR-P1'; type(L5[0].querySelector('.oq'), '2');
  const has5 = () => P("PD.rows('StockMoves').some(function(v){return v.ItemCode==='TC-TUBE-3'&&v.ToLoc==='YR-P1'&&v.RefType==='Opening';})");
  type($('#od'), '2099-01-01'); let c5 = calls.length; click($('#dyes')); await wait(150);
  ok('M3P79 a future count date: the server refuses it, plain message, nothing saved, the dialog stays', !!$('#dlg') && /can't be in the future/.test($('#derr').textContent) && calls.length === c5 + 1 && !has5(), $('#derr') && $('#derr').textContent);
  type($('#od'), P('oDayOf_(PE.now())')); c5 = calls.length; click($('#dyes')); await wait(200);
  ok('M3P80 today with a stale cached day on the page (list loaded "yesterday"): not refused on the page; posted', !$('#dlg') && calls[c5] === 'officeStockOpening' && has5(), [calls.length - c5, $('#derr') && $('#derr').textContent]);
  V("PD.update('Items', must(PD,'Items','ItemCode','PG-UT-1'), { WeightKg: 0.001 }); PD.insert('Items', { ItemCode: 'PG-S5', Name: 'PG bad set', Category: 'Set', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' }); PD.insert('KitParts', { KitPartID: 'KP-PG5', SetCode: 'PG-S5', ItemCode: 'PG-UT-1', QtyPerSet: 1 });");
  w.eval("viewItem('PG-UT-1')"); await wait(150);
  ok('M3P81 weight shown to 3 decimals (0.001 kg, not 0)', /0\.001 kg/.test($('#iv').textContent), $('#iv').textContent.slice(0, 400));
  w.eval("viewItem('PG-S5')"); await wait(150);
  ok('M3P82 a set the challan would refuse (part not tracked): "Problem" in the set box, can make 0', /Parts list\s*Problem/.test($('#iv').textContent) && /Can make from yard\s*0 sets/.test($('#iv').textContent), $('#iv').textContent.slice(0, 400));
  w.eval('viewStock()'); await wait(200);
  ok('M3P83 ... and its card in the list carries the "Parts list problem" pill; a good set does not', !!card('PG-S5') && /Parts list problem/.test(card('PG-S5').textContent) && $$('.qcard').filter(c => /Parts list problem/.test(c.textContent)).length >= 1, card('PG-S5') && card('PG-S5').textContent);
  // ---- CR run 6 (page): a part of a set stays tracked; the opening dialog is frozen while its post is on its way; text names receipts
  V("PD.insert('Items', { ItemCode: 'PG-P6', Name: 'PG part 6', Category: 'Board', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active', ForHire: 'Yes', ForSale: 'No' }); PD.insert('KitParts', { KitPartID: 'KP-PG6', SetCode: 'PG-S5', ItemCode: 'PG-P6', QtyPerSet: 2 });");
  fast(); w.eval("viewItem('PG-P6')"); await wait(150); click($('#ie')); await wait(40); click($$('#xtr button').filter(b => b.textContent === 'No')[0]); click($('#dyes')); await wait(150);
  ok('M3P84 a part of a set switched to not tracked: refused with a plain message, nothing saved', !!$('#dlg') && /part of a set \(KitParts\): it must stay stock-tracked/.test($('#derr').textContent) && P("must(PD,'Items','ItemCode','PG-P6').StockTracked") === 'Yes', $('#derr') && $('#derr').textContent);
  click($('#dno')); await wait(20);
  w.eval("viewItem('TC-TUBE-3')"); await wait(150); click($('#io')); await wait(60);
  ok('M3P86 the opening dialog says stock then moves by challans and receipts', /moves by challans and receipts/.test($('#dlg').textContent));
  const L6 = $$('#ols .st-ol'); L6[0].querySelector('.oi').value = 'TC-TUBE-3'; L6[0].querySelector('.oloc').value = 'LOC-YARD'; type(L6[0].querySelector('.oq'), '4'); type($('#od'), '2099-01-01');
  slow(); click($('#dyes')); await wait(20);
  const fz = () => [$('#od').disabled, $('#ols select').disabled, $('#ols input').disabled, $('#ols button').disabled, $('#oadd').disabled].join(',');
  const f1 = fz(); await wait(450); fast(); const f2 = fz();
  ok('M3P85 while the post is on its way: date, item, location, qty, remove and add are disabled; after a refusal they are back', f1 === 'true,true,true,true,true' && f2 === 'false,false,false,false,false' && /can't be in the future/.test($('#derr').textContent), [f1, f2]);
  click($('#dno')); await wait(20);
  // ---- CR run 8 (page): fresh lists for the opening form; negative balances in the location filters; radio groups by keyboard
  fast(); w.eval("viewItem('RL-STD-20')"); await wait(150); click($('#ib')); await wait(200);
  V("PD.insert('Locations', { LocID: 'YR-P8', Name: 'Repair 8', Type: 'Repair', SiteID: '', Status: 'Active' }); PD.insert('Items', { ItemCode: 'NEW-P8', Name: 'New page item', Category: 'Ringlock', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' })");
  const c86 = calls.length; click($('#so')); await wait(200);
  ok('M3P86 a location added elsewhere after Stock was loaded: the opening form reads the lists again and offers it (and a new item), the list behind is redrawn in code order', !!$('#dlg') && $$('#ols .oloc option').some(o => o.value === 'YR-P8') && $$('#ols .oi option').some(o => o.value === 'NEW-P8') && calls.length > c86 && !!card('NEW-P8') && (cs => cs.join() === cs.slice().sort((x, y) => x.localeCompare(y)).join())($$('#slist .qcard').map(c => c.getAttribute('data-i'))), calls.slice(c86));
  click($('#dno')); await wait(20);
  w.eval("(function(){var b=ST.rows.filter(function(x){return !x.isSet&&!x.cata;})[0];var n=JSON.parse(JSON.stringify(b));n.code='NEG-P8';n.yard=-3;n.hz={yard:true,site:false,rep:false,lost:false};var z=JSON.parse(JSON.stringify(b));z.code='ZERO-P8';z.yard=0;z.hz={yard:false,site:false,rep:false,lost:false};ST.rows.push(n,z);ST.f='yard';stsDraw();})()");
  const neg8 = !!card('NEG-P8'), zero8 = !!card('ZERO-P8'); w.eval("ST.rows=ST.rows.filter(function(x){return x.code!=='NEG-P8'&&x.code!=='ZERO-P8';});ST.f='all';stsDraw();");
  ok('M3P87 Yard filter: a negative yard balance is shown (a discrepancy to see), a zero one is not', neg8 && !zero8, [neg8, zero8]);
  click($('#sn')); await wait(60);
  const g8 = $('#xtr'), rb8 = () => [...g8.querySelectorAll('[role=radio]')], st8 = () => rb8().map(b => b.getAttribute('aria-checked') + ':' + b.getAttribute('tabindex')).join(',');
  const s80 = st8(); const key8 = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  rb8()[0].focus(); key8(rb8()[0], 'ArrowRight'); await wait(10); const s81 = st8(), f81 = d.activeElement === rb8()[1];
  key8(rb8()[1], 'ArrowRight'); await wait(10); const s82 = st8(), f82 = d.activeElement === rb8()[0];
  key8(rb8()[0], 'End'); await wait(10); const s83 = st8(); key8(rb8()[1], 'Home'); await wait(10); const s84 = st8();
  const allG8 = $$('#dlg [role=radiogroup]').every(gg => [...gg.querySelectorAll('[role=radio]')].filter(b => b.getAttribute('tabindex') === '0').length === 1);
  ok('M3P88 radio groups: one Tab stop (the checked choice), arrow keys move + select (wrapping), Home / End; every group in the dialog has one Tab stop',
    s80 === 'true:0,false:-1' && s81 === 'false:-1,true:0' && f81 && s82 === 'true:0,false:-1' && f82 && s83 === 'false:-1,true:0' && s84 === 'true:0,false:-1' && allG8, [s80, s81, f81, s82, f82, s83, s84, allG8]);
  click($('#dno')); await wait(20);
  // ---- CR run 9 (page): kit / set rows open by a named button; the opening form does not put back an item the fresh list excludes; PO still to receive
  w.eval("viewItem('PG-S5')"); await wait(150);
  const kr9 = $$('#iv tr.go'), kb9 = kr9.map(r => r.querySelector('td button.st-lnk'));
  ok('M3P89 a set\'s part rows: no Tab stop on the row; the code cell is a named button (Open part ...)', kr9.length >= 1 && kr9.every(r => !r.hasAttribute('tabindex')) && kb9.every(b => b && b.getAttribute('type') === 'button' && /^Open part PG-/.test(b.getAttribute('aria-label'))), kr9.map(r => r.outerHTML.slice(0, 160)));
  const pc9 = kr9[0].getAttribute('data-i'); click(kb9[0]); await wait(150);
  const o9 = !!$('#iv') && w.eval('ST.c&&ST.c.code') === pc9;
  w.eval("viewItem('PG-P6')"); await wait(150);
  const sb9 = $$('#iv tr.go td button.st-lnk')[0];
  sb9 && sb9.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await wait(150);
  ok('M3P90 the button opens the part (click) / the set (Enter); a part\'s "Part of sets" row is a button named Open set ...', o9 && !!sb9 && sb9.getAttribute('aria-label') === 'Open set PG-S5' && w.eval('ST.c&&ST.c.code') === 'PG-S5', [o9, sb9 && sb9.getAttribute('aria-label'), w.eval('ST.c&&ST.c.code')]);
  fast(); w.eval("viewItem('TC-TUBE-3')"); await wait(150);
  V("PD.update('Items', must(PD,'Items','ItemCode','TC-TUBE-3'), { Status: 'Inactive' })");
  click($('#io')); await wait(200);
  const op9 = $$('#ols .oi option').map(o => o.value), tt9 = $('#toast').textContent;
  ok('M3P91 the item went inactive elsewhere: no opening form opens for another item in its place (r12: opened with the first item), it says so', !$('#dlg') && op9.length === 0 && /TC-TUBE-3 can't take opening stock now/.test(tt9), [op9.slice(0, 5), tt9]);
  click($('#dno')); await wait(20); V("PD.update('Items', must(PD,'Items','ItemCode','TC-TUBE-3'), { Status: 'Active' })");
  V("PD.insert('Items', { ItemCode: 'PG-PO9', Name: 'PG on order', Category: 'Board', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active', ForHire: 'Yes', ForSale: 'No' }); PD.insert('POs', { PONo: 'PO-PG9', Status: 'Draft' }); PD.insert('POLines', { LineID: 'PL-PG9', PONo: 'PO-PG9', ItemCode: 'PG-PO9', Qty: 10 });");
  fast(); w.eval("viewItem('PG-PO9')"); await wait(150); click($('#ie')); await wait(40); click($$('#xtr button').filter(b => b.textContent === 'No')[0]); click($('#dyes')); await wait(150);
  ok('M3P92 tracking off while an open PO still has the item to receive: refused, the PO named, nothing saved', !!$('#dlg') && /PO PO-PG9 still has this item to receive/.test($('#derr').textContent) && P("must(PD,'Items','ItemCode','PG-PO9').StockTracked") === 'Yes', $('#derr') && $('#derr').textContent);
  click($('#dno')); await wait(20);
  // ---- CR run 9 rerun (page): no negative "Enough for"; an older location-list answer is not drawn over a newer one
  V("PD.insert('StockMoves', { MoveID: 'MV-PG93', ItemCode: 'PG-P6', Qty: 1, FromLoc: 'LOC-YARD', ToLoc: 'LOC-LOST', RefType: 'Adjust', RefNo: 'PG93' })");
  w.eval("viewItem('PG-S5')"); await wait(150);
  const kt93 = $$('#iv tr.go').map(r => [...r.querySelectorAll('td')].slice(2).map(td => td.textContent.trim()).join('|'));
  ok('M3P93 a part with a negative yard balance: "Enough for" shows 0 sets (the negative balance still shown)', kt93.indexOf('-1|0 sets') >= 0 && kt93.every(t => !/\|-\d/.test(t)), kt93);
  const rq94 = [], c094 = w.call; w.call = function (fn) { if (fn === 'officeLocList') return new w.Promise(function (res) { rq94.push(res); }); return c094.apply(this, arguments); };
  let t94 = '';
  try {
    w.eval('viewStock()'); await wait(200); click($('#sl')); await wait(60);
    type($('#lc'), 'YR-P94'); type($('#ln'), 'Rack 94'); click($('#dyes')); await wait(200);
    const L = n => ({ rows: [{ code: 'LOC-YARD', name: 'Yard', type: 'Yard', status: 'Active' }].concat(n ? [{ code: 'YR-P94', name: 'Rack 94', type: 'Yard', status: 'Active' }] : []) });
    const n94 = rq94.length; if (rq94[1]) rq94[1](L(true)); await wait(30); if (rq94[0]) rq94[0](L(false)); await wait(30); t94 = $('#lt') ? $('#lt').textContent : '';
    ok('M3P94 locations dialog: the first list answer arriving after the one asked for after the add is ignored (the new location stays shown)', n94 === 2 && /YR-P94/.test(t94), [n94, t94]);
  } finally { w.call = c094; }
  click($('#dno')); await wait(20);
  // ---- CR run 10 (page): list / fixed values sent as they are (not trimmed); a removed / disabled checked radio moves the Tab stop
  V("PD.update('Items', must(PD,'Items','ItemCode','RL-STD-20'), { Unit: 'pc ' })");
  fast(); w.eval("viewItem('RL-STD-20')"); await wait(150); click($('#ie')); await wait(40);
  const ro95 = !!$('#xu') && $('#xu').readOnly && $('#xu').value === 'pc ', n95 = P("must(PD,'Items','ItemCode','RL-STD-20').Name");
  type($('#xn'), 'PG renamed 95'); click($('#dyes')); await wait(150);
  ok('M3P95 a fixed unit "pc " (trailing space in the sheet): an unrelated edit saves, the unit sent as it is (r9: trimmed -> refused as a unit change)', ro95 && !$('#dlg') && P("must(PD,'Items','ItemCode','RL-STD-20').Name") === 'PG renamed 95' && P("must(PD,'Items','ItemCode','RL-STD-20').Unit") === 'pc ', [ro95, $('#derr') && $('#derr').textContent]);
  V("PD.update('Items', must(PD,'Items','ItemCode','RL-STD-20'), { Unit: 'pc' })"); fast(); w.eval("viewItem('RL-STD-20')"); await wait(150); click($('#ie')); await wait(40); type($('#xn'), n95); click($('#dyes')); await wait(150);
  w.eval('viewStock()'); await wait(200); w.eval("ST.cats=['Ringlock','Board ']"); click($('#sn')); await wait(40);
  const sel96 = $('#xk') && $('#xk').tagName === 'SELECT'; const c096 = w.call; let sent96 = null;
  w.call = function (fn, t, d) { if (fn === 'officeItemSave') { sent96 = d; return w.Promise.reject(new Error('BADINPUT|probe')); } return c096.apply(this, arguments); };
  try { $('#xk').value = 'Board '; $('#xk').dispatchEvent(new w.Event('change', { bubbles: true })); type($('#xc'), 'pg-cat-96'); type($('#xn'), 'Cat 96'); click($('#dyes')); await wait(60); } finally { w.call = c096; }
  global.ERRS = (global.ERRS || []).filter(e => !/probe/.test(e));
  ok('M3P96 a category picked from the list ("Board " with a space) is sent as offered, free-text name still trimmed', sel96 && !!sent96 && sent96.cat === 'Board ' && sent96.name === 'Cat 96', [sel96, sent96 && JSON.stringify([sent96.cat, sent96.name])]);
  const g97 = $('#xtr'), tb97 = () => [...g97.querySelectorAll('[role=radio]')].map(b => b.getAttribute('tabindex')).join(',');
  const on97 = [...g97.children].filter(b => b.getAttribute('aria-checked') === 'true')[0], t0 = tb97();
  const a0 = on97.getAttribute('tabindex'); on97.disabled = true; await wait(15); const t1 = tb97(), a1 = on97.getAttribute('tabindex'); on97.disabled = false; await wait(15); const t2 = tb97();
  on97.remove(); await wait(15); const t3 = tb97();
  ok('M3P97 radio group: the checked choice disabled -> the other takes the Tab stop; enabled again -> back; removed -> the one left has it', a0 === '0' && a1 === '-1' && t0.split(',').filter(x => x === '0').length === 1 && t1.split(',').filter(x => x === '0').length === 1 && t2 === t0 && t3 === '0', [a0, a1, t0, t1, t2, t3]);
  click($('#dno')); await wait(20);
  // ---- CR run 12 (page): a late opening-stock load does not open over a dialog opened / closed meanwhile; per-part "enough for" from the server
  await toItem('RL-STD-20'); slow(); click($('#io')); await wait(10); fast(); w.eval("openDlg('<h3 id=\"dlgt\">Other 98</h3><button type=\"button\" id=\"dno\">x</button>')"); await wait(400);
  ok('M3P98 opening stock asked, another dialog opened before the answer: that dialog stays (r11: replaced by Opening stock)', !!$('#dlg') && $('#dlgt').textContent === 'Other 98', $('#dlgt') && $('#dlgt').textContent);
  w.eval('closeDlg()'); await wait(20);
  await toItem('RL-STD-20'); slow(); click($('#io')); await wait(10); fast(); w.eval("openDlg('<h3 id=\"dlgt\">Other 99</h3>')"); w.eval('closeDlg()'); await wait(400);
  ok('M3P99 ... a dialog opened and closed meanwhile: no dialog pops up afterwards; the stock list was still refreshed', !$('#dlg') && w.eval('ST.loaded===true&&ST.rows.length>0'));
  V("PD.insert('Items', [{ ItemCode: 'PG-P12', Name: 'PG part 12', Unit: 'pc', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }, { ItemCode: 'PG-S12', Name: 'PG set 12', Unit: 'set', StockTracked: 'No', IsSet: 'Yes', Status: 'Active' }]);" +
    "PD.insert('KitParts', { KitPartID: 'KP-PG12', SetCode: 'PG-S12', ItemCode: 'PG-P12', QtyPerSet: 1 });" +
    "PD.insert('StockMoves', { MoveID: 'MV-PG12', MoveDate: new Date(2026, 10, 2), ItemCode: 'PG-P12', Qty: 0.999, FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', RefType: 'Opening', RefNo: 'PG12' });");
  w.eval("viewItem('PG-S12')"); await wait(150);
  const kt100 = $$('#iv tr.go').map(r => [...r.querySelectorAll('td')].slice(2).map(td => td.textContent.trim()).join('|'));
  ok('M3P100 a part 0.999 in the yard, 1 per set: shown "1" in yard but "Enough for 0 sets" (r11: 1 set), as "Can make from yard 0"', kt100.join(',') === '1|0 sets' && /Can make from yard\s*0 sets/.test($('#iv').textContent), kt100);
  // ---- CR run 13 (page): opening form for an item only; legacy blank unit editable; location add locked while pending; owned value from the server; new-quote request id
  await login('ywh@p.com'); click(tile('stock')); await wait(100);
  await toItem('RL-STD-20'); click($('#io')); await wait(200);
  ok('M3P101 an eligible item: the opening form opens with that item selected', !!$('#dlg') && $('#ols .oi').value === 'RL-STD-20', $('#ols .oi') && $('#ols .oi').value);
  w.eval('closeDlg()'); await wait(20);
  V("PD.insert('Items', { ItemCode: 'PG-LU13', Name: 'PG legacy 13', Category: String(must(PD,'Items','ItemCode','RL-STD-20').Category), Unit: '', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' });" +
    "PD.insert('StockMoves', { MoveID: 'MV-PG13', MoveDate: new Date(2026, 10, 2), ItemCode: 'PG-LU13', Qty: 2, FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', RefType: 'Opening', RefNo: 'PG13' });");
  fast(); w.eval("viewItem('PG-LU13')"); await wait(150); click($('#ie')); await wait(60);
  const ro103 = !!$('#xu') && $('#xu').readOnly && $('#xu').value === ''; type($('#xn'), 'PG legacy 13 renamed'); click($('#dyes')); await wait(150);
  ok('M3P103 a legacy item with a blank unit in use: an edit saves (r12: "The category and the unit are needed."), unit still blank',
    ro103 && !$('#dlg') && P("oUncell_(must(PD,'Items','ItemCode','PG-LU13').Name)") === 'PG legacy 13 renamed' && P("String(must(PD,'Items','ItemCode','PG-LU13').Unit)") === '', [ro103, $('#derr') && $('#derr').textContent]);
  w.eval('closeDlg()'); await wait(20);
  await login('ywh@p.com'); click(tile('stock')); await wait(100); w.eval('ST.units=[]'); click($('#sn')); await wait(60); /* no unit list: the form starts blank */
  type($('#xc'), 'PG-NU13'); type($('#xn'), 'No unit'); if ($('#xk').tagName === 'INPUT') type($('#xk'), 'Ringlock'); $('#xu').value = ''; const nc106 = calls.length; click($('#dyes')); await wait(80);
  ok('M3P106 a new item with no unit: refused on the page (the unit is needed), nothing sent', !!$('#dlg') && /category and the unit are needed/.test($('#derr').textContent) && calls.length === nc106 && P("!find(PD.rows('Items'),'ItemCode','PG-NU13')") === true, $('#derr') && $('#derr').textContent);
  w.eval('closeDlg()'); await wait(20);
  fast(); w.eval('stLocDlg()'); await wait(120); slow();
  type($('#lc'), 'yr-p13'); type($('#ln'), 'Rack P13'); click($('#dyes')); await wait(20);
  const lk102 = $('#lc').disabled && $('#ln').disabled; await wait(400);
  ok('M3P102 location add: Code / Name locked while it is on its way; cleared and unlocked after it went in', lk102 && !$('#lc').disabled && !$('#ln').disabled && $('#lc').value === '' && /YR-P13 added/.test(toast()), [lk102, toast()]);
  V("PD.insert('Locations', { LocID: 'YR-P13X', Name: 'Other', Type: 'Yard', SiteID: '', Status: 'Active' })");
  type($('#lc'), 'YR-P13X'); type($('#ln'), 'Mine'); click($('#dyes')); await wait(20); const lk102b = $('#lc').disabled; await wait(400);
  ok('M3P102b refused (EXISTS from the server): unlocked again, what was typed kept', lk102b && !$('#lc').disabled && $('#lc').value === 'YR-P13X' && $('#ln').value === 'Mine' && /already exists/.test($('#derr').textContent), [lk102b, $('#lc').value, $('#derr').textContent]);
  fast(); w.eval('closeDlg()'); await wait(20);
  V("PD.insert('Items', { ItemCode: 'PG-V13', Name: 'PG value 13', Category: 'x', Unit: 'kg', StockTracked: 'Yes', IsSet: 'No', Status: 'Active', ReplacementCost: 1000 });" +
    "PD.insert('StockMoves', [{ MoveID: 'MV-PG13b', MoveDate: new Date(2026, 10, 2), ItemCode: 'PG-V13', Qty: 0.004, FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', RefType: 'Opening', RefNo: 'PG13' }, { MoveID: 'MV-PG13c', MoveDate: new Date(2026, 10, 2), ItemCode: 'PG-V13', Qty: 0.004, FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-REPAIR', RefType: 'Opening', RefNo: 'PG13' }]);");
  await login('dir@p.com'); click(tile('stock')); await wait(150);
  const cv104 = card('PG-V13') ? card('PG-V13').textContent : ''; fast(); w.eval("viewItem('PG-V13')"); await wait(150); const iv104 = $('#iv') ? $('#iv').textContent : '';
  ok('M3P104 owned 0.01 (0.004 yard + 0.004 repair) at Tk 1,000: value Tk 8.00 from the server (r12: Tk 10.00), card and item view', /Owned 0\.01/.test(cv104) && /value Tk 8\.00/.test(cv104) && /Owned value\s*Tk 8\.00/.test(iv104), [cv104.slice(-60), (iv104.match(/Owned value.{0,14}/) || [''])[0]]);
  w.viewQuoteEdit('', 'CUST-0001'); await wait(150); click($('[data-t="Rental"]')); await wait(60);
  const sent105 = []; let n105 = 0; const QN105 = P("String(PD.rows('Quotes')[0].QuoteNo)");
  w.eval("window.__q0=call;window.qeCheck=function(){return {e:[],lines:[]};};");
  w.__hook = (fn, a) => { if (fn !== 'officeQuoteSave') return null; sent105.push(JSON.parse(JSON.stringify(a))); n105++; return n105 === 1 ? Promise.reject(new Error('Service Spreadsheets timed out')) : Promise.resolve({ no: QN105, rev: 1, status: 'Draft', was: '', changed: true, again: true, part: true, ev: 5 }); };
  w.eval("call=function(fn){var a=[].slice.call(arguments),h=window.__hook(fn,a[2]);return h||window.__q0.apply(null,a);};");
  w.QE.dirty = true; w.qeSave(false); await wait(100); const err105 = $('#qeerr') ? $('#qeerr').textContent : '';
  w.QE.dirty = true; w.qeSave(false); await wait(5); const t105 = toast(); await wait(150); w.eval('call=window.__q0;');
  ok('M3P105 r15 (M2 save): a new quote sends no request id, also on the retry after a failure; the error is shown; an answer is told as a plain save (no again / part text)',
    sent105.length === 2 && sent105.every(x => !('rid' in x)) && err105.trim().length > 0 && /saved as Draft/.test(t105) && !/saved already|only in part/.test(t105), [sent105.map(x => 'rid' in x), err105.slice(0, 60), t105]);
  ok('M3P109 r15: the page has no request-id / retry code left', !/qeRid|J\.rid|r\.again===true|r\.part===true/.test(w.document.documentElement.innerHTML + Array.from(w.document.scripts).map(x => x.textContent).join('')), '');
  // ---- CR run 14 (page): item form frozen while Save is pending; Low and the list group filters on raw balances (server flags)
  fast(); await login('ywh@p.com'); click(tile('stock')); await wait(100); fast(); w.eval("viewItem('RL-STD-20')"); await wait(150); click($('#ie')); await wait(60);
  const ids107 = ['xn', 'xk', 'xs', 'xu', 'xw', 'xr', 'xt'].filter(i => $('#' + i)), pre107 = ids107.map(i => $('#' + i).disabled), xc107 = $('#xc') ? $('#xc').disabled : null;
  w.eval("window.__i0=call;call=function(fn){var a=[].slice.call(arguments);if(fn==='officeItemSave')return new Promise(function(res,rej){setTimeout(function(){rej(new Error('DNOPEN|DN-PG14'));},150);});return window.__i0.apply(null,a);};");
  click($('#dyes')); await wait(20); const fz107 = ids107.every(i => $('#' + i).disabled) && (!$('#xc') || $('#xc').disabled); await wait(300);
  const back107 = ids107.every((i, k) => $('#' + i).disabled === pre107[k]) && (!$('#xc') || $('#xc').disabled === xc107) && /Debit note/.test($('#derr') ? $('#derr').textContent : '');
  w.eval('call=window.__i0;');
  ok('M3P107 item edit: every field locked while Save is on its way (r13: editable); after a refusal unlocked again, the ones locked before stay locked', ids107.length >= 5 && pre107[0] === false && fz107 && back107, [fz107, back107, ids107, pre107]);
  w.eval('closeDlg()'); await wait(20);
  V("PD.insert('Items', [{ ItemCode: 'PG-L14', Name: 'PG low 14', Category: 'x', Unit: 'kg', StockTracked: 'Yes', IsSet: 'No', Status: 'Active', ReorderLevel: 1 }, { ItemCode: 'PG-R14', Name: 'PG rep 14', Category: 'x', Unit: 'kg', StockTracked: 'Yes', IsSet: 'No', Status: 'Active' }]);" +
    "PD.insert('StockMoves', [{ MoveID: 'MV-PG14a', MoveDate: new Date(2026, 10, 2), ItemCode: 'PG-L14', Qty: 0.999, FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', RefType: 'Opening', RefNo: 'PG14' }, { MoveID: 'MV-PG14b', MoveDate: new Date(2026, 10, 2), ItemCode: 'PG-R14', Qty: 2, FromLoc: 'LOC-SUPPLIER', ToLoc: 'LOC-YARD', RefType: 'Opening', RefNo: 'PG14' }, { MoveID: 'MV-PG14c', MoveDate: new Date(2026, 10, 2), ItemCode: 'PG-R14', Qty: 0.004, FromLoc: 'LOC-REPAIR', ToLoc: 'LOC-SUPPLIER', RefType: 'Opening', RefNo: 'PG14' }]);");
  await login('ywh@p.com'); click(tile('stock')); await wait(150);
  const low108 = card('PG-L14') ? /Low/.test(card('PG-L14').textContent) : 'none';
  click($('#sf [data-f="rep"]')); await wait(30); const rep108 = !!card('PG-R14'); click($('#sf [data-f="lost"]')); await wait(30); const lost108 = !!card('PG-R14'); click($('#sf [data-f="all"]')); await wait(30);
  ok('M3P108 yard 0.999 vs reorder 1: Low (r13: not low); repair -0.004 (shown 0): listed under Repair (r13: hidden), not under Lost', low108 === true && rep108 && !lost108, [low108, rep108, lost108]);
  // ---- sign-out clears
  click($('#out')); await wait(60); type($('#em'), 'ps@p.com'); type($('#pw'), 'GoodPass1'); click($('#go')); await wait(80);
  ok('M3P40 after sign-out / in: stock cache empty', w.eval('ST.rows.length===0&&!ST.loaded&&ST.c===null&&ST.defs.length===0'));
  ok('M3P41 no server errors other than the expected refusals', (global.ERRS || []).every(e => /EXISTS|BADINPUT\|stock tracked|BADINPUT\|unit|BADINPUT\|count date|BADINPUT\|part tracked|STALE|DNOPEN|ONORDER/.test(e)), global.ERRS);
  console.log('page-m3 r15', pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(2); });
