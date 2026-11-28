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
