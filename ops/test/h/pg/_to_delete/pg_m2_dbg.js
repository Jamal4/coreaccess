// jsdom page wired to the REAL server (all 15 .gs in a vm): node pg.js <dir with .gs + Office.html>
process.env.GSDIR = process.argv[2];
const { ctx } = require('../h/run.js'), vm = require('vm'), fs = require('fs'), { JSDOM } = require('jsdom');
const html = fs.readFileSync(process.argv[2] + '/Office.html', 'utf8');
const V = s => vm.runInContext(s, ctx);
V(`var KD = null; var PE = oMemEnv_(); OFFICE_ENV_ = PE; OFFICE_CFG_.kdfIters = 3; OFFICE_CFG_.maxPerMin = 1e9;
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
  const tile = k => $('.tile[data-k="' + k + '"]');
  const QN = V("(function(){var js={};PD.rows('Jobs').forEach(function(j){js[String(j.QuoteNo)]=1;});var q=PD.rows('Quotes').filter(function(q){return oQNo_(String(q.QuoteNo))&&!js[String(q.QuoteNo)]&&quoteLines(PD,q.QuoteNo).length;})[0];PD.update('Quotes',q,{Status:'Sent'});return String(q.QuoteNo);})()");
  await login('sales@p.com');
  ok('M2P1 Contracts tile ready', tile('contracts') && !tile('contracts').querySelector('.soon'));
  click(tile('contracts')); await wait(80);
  ok('M2P2 list + count line + New button', /^\d+ contracts? · \d+ open · \d+ closed$/.test($('#tcnt').textContent) && !!$('#tadd'), $('#tcnt').textContent);
  click($('#tadd')); await wait(80);
  const pk = $('.qpk[data-q="' + QN + '"]');
  ok('M2P3 picker offers the Sent quote; advance % filled', !!pk && $('#ta') && $('#ta').value !== '', [QN, $('#ta') && $('#ta').value]);
  click(pk); type($('#tn'), 'PG-WO-1'); click($('#dyes')); await wait(120);
  const J = V("String(find(PD.rows('Jobs'),'QuoteNo','" + QN + "').JobNo)");
  ok('M2P4 made: view opens, toast says Accepted', $('#tv h2') && $('#tv h2').textContent === J && /now Accepted/.test(toast()), [toast(), J]);
  ok('M2P5 view: client order + value boxes + fab buttons', /PG-WO-1/.test($('#tv').textContent) && /Value & advance/.test($('#tv').textContent) && $$('#tv button.fab[data-l]').length > 0);
  click($$('#tv button.fab[data-l]')[0]); await wait(80);
  ok('M2P6 fab toggle saved', V("PD.rows('QuoteLines').filter(function(l){return String(l.QuoteNo)==='" + QN + "'&&l.NeedsFab==='Yes';}).length") === 1 && /needs fabrication/.test(toast()), toast());
  click($('#tedit')); await wait(40); type($('#tn'), 'PG-WO-2'); click($('#dyes')); await wait(100);
  ok('M2P7 edit saved', V("String(find(PD.rows('Jobs'),'JobNo','" + J + "').ClientWONo)") === 'PG-WO-2' && /Saved/.test(toast()), toast());
  click($('#tedit')); await wait(40); V("(function(){PD.update('Jobs',find(PD.rows('Jobs'),'JobNo','" + J + "'),{Notes:'other user'});return 1;})()");
  type($('#tn'), 'PG-WO-3'); click($('#dyes')); await wait(100);
  ok('M2P8 stale edit: dialog closed, reloaded, not saved', !$('#dlg') && /Someone changed/.test(toast()) && V("String(find(PD.rows('Jobs'),'JobNo','" + J + "').ClientWONo)") === 'PG-WO-2', toast());
  await wait(80); click($('#tadv')); await wait(40); click($('#dyes')); await wait(100);
  ok('M2P9 advance PI made (Draft), button gone', /made \(Draft\)/.test(toast()) && !$('#tadv'), toast());
  click($('#tquote')); await wait(100);
  ok('M2P10 quote view links back to the contract', !!$('#qjob') && !$('#qct'));
  click($('#qjob')); await wait(100);
  ok('M2P11 contract opens from the quote', $('#tv h2') && $('#tv h2').textContent === J);
  // ---- M2 step 4 page tests
  ok('M2P12 normaliser keeps ev / kind / advPct / PI / deposit / fab / can', (function () { const o = w.nctFull({ job: 'CAE/J/2026/009', ev: 77, kind: 'PO', advPct: 0.125, pi: { no: 'P1', status: 'Draft', amount: 5 }, sd: { amount: 3, cheque: 'c', status: 'Held' }, money: true, can: true, lines: [{ id: 'L1', fab: true }] });
    return o.ev === 77 && o.kind === 'PO' && o.advPct === 0.125 && o.pi && o.pi.no === 'P1' && o.sd && o.sd.status === 'Held' && o.fab === 1 && o.can === true; })());
  const QN2 = V("(function(){var js={};PD.rows('Jobs').forEach(function(j){js[String(j.QuoteNo)]=1;});var q=PD.rows('Quotes').filter(function(q){return oQNo_(String(q.QuoteNo))&&!js[String(q.QuoteNo)]&&quoteLines(PD,q.QuoteNo).length;})[0];PD.update('Quotes',q,{Status:'Sent'});return String(q.QuoteNo);})()");
  const J2 = V("quoteToJob(PD,'" + QN2 + "',{})");
  w.viewContract(J2); await wait(120); click($('#tadv')); await wait(40);
  V("(function(){PD.update('Jobs',find(PD.rows('Jobs'),'JobNo','" + J2 + "'),{Notes:'other user 2'});return 1;})()"); click($('#dyes')); await wait(120);
  ok('M2P13 advance from a view another user changed meanwhile: dialog closed, reloaded, no PI', !$('#dlg') && /Someone changed/.test(toast()) && V("oCtPis_(PD,'" + QN2 + "').length") === 0, toast());
  V("(function(){PD.ensureColumn('Jobs','AdvancePct');PD.update('Jobs',find(PD.rows('Jobs'),'JobNo','" + J2 + "'),{AdvancePct:0.125});return 1;})()");
  w.viewContract(J2); await wait(120); const t14 = $('#tv').textContent; click($('#tedit')); await wait(40);
  ok('M2P14 a 12.5 % advance shows as 12.5 (view + edit form)', /12\.5 %/.test(t14) && $('#ta') && $('#ta').value === '12.5', [$('#ta') && $('#ta').value]);
  click($('#dno')); await wait(40);
  V("(function(){PD.insert('Jobs',{JobNo:'CAE/J/2026/091',QuoteNo:'',CustID:'CUST-0001',SiteID:'',Status:'On hire'});return 1;})()"); const e0 = (global.ERRS || []).length;
  w.viewContract('CAE/J/2026/091'); await wait(120);
  ok('M2P15 a job without a quote / value opens: value —, no PI button, no error', $('#tv h2') && $('#tv h2').textContent === 'CAE/J/2026/091' && !$('#tadv') && /—/.test($('#tv').textContent) && (global.ERRS || []).length === e0, global.ERRS);
  w.viewContracts(); await wait(120);
  ok('M2P16 the list still renders with it', /CAE\/J\/2026\/091/.test(d.body.textContent) && /^\d+ contracts? · \d+ open · \d+ closed$/.test($('#tcnt').textContent), $('#tcnt') && $('#tcnt').textContent);
  w.viewContract(J); await wait(120); click($$('#tv button.fab[data-l]')[0]); await wait(100);
  ok('M2P17 fab toggle back to stock saved', V("PD.rows('QuoteLines').filter(function(l){return String(l.QuoteNo)==='" + QN + "'&&l.NeedsFab==='Yes';}).length") === 0, toast());
  // ---- M2 CodeRabbit run 1 page tests
  const freeQ = () => V("(function(){var js={};PD.rows('Jobs').forEach(function(j){js[String(j.QuoteNo)]=1;});var q=PD.rows('Quotes').filter(function(q){return oQNo_(String(q.QuoteNo))&&!js[String(q.QuoteNo)]&&quoteLines(PD,q.QuoteNo).length;})[0];PD.update('Quotes',q,{Status:'Sent'});return String(q.QuoteNo);})()");
  const QF = freeQ();
  w.viewContracts(); await wait(120); click($('#tadd')); click($('#back')); await wait(150);
  ok('M2P18 New contract, then Home before the answer: no dialog on Home', !$('#dlg') && !$('.qpk'), !!$('#dlg'));
  w.viewQuote(QF); await wait(150); w.ctNew('CAE/Q/2026/999'); await wait(150);
  ok('M2P19 Make contract for a quote that is no longer free: nothing preselected, note shown', !!$('#dlg') && $$('.qpk').length > 0 && !$('.qpk.on') && !!$('#tpre'), [$$('.qpk').length, !!$('.qpk.on'), !!$('#tpre')]);
  click($('#dno')); await wait(40);
  V("(function(){var j=find(PD.rows('Jobs'),'JobNo','" + J + "'),p=PD.rows('Proformas').filter(function(p){return String(p.QuoteNo)==='" + QN + "';})[0];PD.update('Proformas',p,{Amount:num(p.Amount)+300});PD.insert('Allocations',{AllocID:'AL-PG1',PayID:'P-PG1',DocType:'PI',DocNo:p.PINo,Amount:num(p.Amount)-300});return 1;})()");
  w.viewContract(J); await wait(150); const t20 = $('#tv').textContent;
  w.viewContracts(); await wait(150); const card = [...d.querySelectorAll('.qcard')].find(b => b.getAttribute('data-j') === J);
  ok('M2P20 a PI above the advance, advance paid: Tk 300 left (detail + card), not "paid"', /Left to pay\s*Tk 300\.00/.test(t20) && card && /Advance due Tk 300\.00/.test(card.textContent), [t20.match(/Left to pay.{0,20}/), card && card.textContent.slice(-60)]);
  V("(function(){PD.insert('Jobs',{JobNo:'CAE/J/2026/092',QuoteNo:'',CustID:'CUST-0001',SiteID:'',Status:'On hire',ContractValue:5000});return 1;})()");
  w.viewContract('CAE/J/2026/092'); await wait(150);
  ok('M2P21 a job with a value but no quote: no PI button', $('#tv h2') && $('#tv h2').textContent === 'CAE/J/2026/092' && !$('#tadv') && $('#tedit'));
  w.viewContract(J); await wait(150); const a22 = /\(Accepted, locked\)/.test($('#tv').textContent);
  V("(function(){PD.update('Quotes',find(PD.rows('Quotes'),'QuoteNo','" + QN + "'),{Status:'Sent'});return 1;})()"); w.viewContract(J); await wait(150);
  ok('M2P22 the quote\'s real status is shown (Accepted / Sent)', a22 && /\(Sent, locked\)/.test($('#tv').textContent));
  V("(function(){PD.update('Quotes',find(PD.rows('Quotes'),'QuoteNo','" + QN + "'),{Status:'Accepted'});return 1;})()");
  w.viewContracts(); await wait(150); click($('#tadd')); await wait(150); const d23 = $('#td') && $('#td').value; console.log('DBG', !!$('#dlg'), !!$('#tadd'), toast(), (global.ERRS||[]).slice(-2), $('#dlg') && $('#dlg').innerHTML.slice(0,300)); click($('#dno')); await wait(40);
  V("(function(){oDayOf_=KD;return 1;})()");
  ok('M2P23 order date defaults to the office date (server), not the browser\'s', d23 === '2026-12-31', [d23]);
  console.log('page-m2', pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('CRASH', e.stack); process.exit(2); });
