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
