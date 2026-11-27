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
  w.__hook = (fn, a) => { if (fn !== 'officeQuoteSave') return null; sent105.push(JSON.parse(JSON.stringify(a))); n105++; return n105 === 1 ? Promise.reject(new Error('Service Spreadsheets timed out')) : Promise.resolve({ no: QN105, rev: 1, status: 'Draft', was: '', changed: false, again: true, ev: 5 }); };
  w.eval("call=function(fn){var a=[].slice.call(arguments),h=window.__hook(fn,a[2]);return h||window.__q0.apply(null,a);};");
  w.QE.dirty = true; w.qeSave(false); await wait(100); const err105 = $('#qeerr') ? $('#qeerr').textContent : '';
  w.QE.dirty = true; w.qeSave(false); await wait(5); const t105 = toast(); await wait(150);
  w.eval('call=window.__q0;'); w.viewQuoteEdit('', 'CUST-0001'); await wait(150); click($('[data-t="Rental"]')); await wait(60); w.eval("window.__q0=call;call=function(fn){var a=[].slice.call(arguments),h=window.__hook(fn,a[2]);return h||window.__q0.apply(null,a);};");
  w.QE.dirty = true; w.qeSave(false); await wait(100); w.eval('call=window.__q0;');
  const r0 = sent105[0] && sent105[0].rid, r1 = sent105[1] && sent105[1].rid, r2 = sent105[2] && sent105[2].rid;
  ok('M3P105 a new quote sends a request id; its retry after a failure sends the same one (r12: none); a saved-already answer says so; another new form = another id',
    /^[a-z0-9]{8,40}$/.test(r0 || '') && r1 === r0 && !!r2 && r2 !== r0 && err105.trim().length > 0 && /had been saved already/.test(t105), [r0, r1, r2, err105.slice(0, 60), t105]);
