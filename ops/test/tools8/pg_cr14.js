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
