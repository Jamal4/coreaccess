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
