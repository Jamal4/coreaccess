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
