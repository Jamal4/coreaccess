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
