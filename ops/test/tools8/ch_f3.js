        // ---- r31 F3 (harness only): CH-83 item picture (upload / save / card / refuse / keep / remove / quote PDFs marked old), CH-84 Rental quote PDF prints a picture per component
        (function () { var LAST = '', EQ = function (n) { LAST = n; return eq.apply(this, arguments); }, has = typeof OIPIC_ADD_ !== 'undefined', kd = OSG_DRV_, ka = has ? OIPIC_ADD_ : null; try {
          var tI = add('chf5@t.com', { YW: 2 }), tV = add('chf6@t.com', { YW: 1 }), rc = function () { ['chf5@t.com', 'chf6@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); e5.cdel('OSG_N:' + e); }); };
          var be = function (n) { return [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255]; };
          var png = function (w, h) { var d = [120, 1]; return [137, 80, 78, 71, 13, 10, 26, 10].concat(be(13), [73, 72, 68, 82], be(w), be(h), [8, 6, 0, 0, 0], [1, 2, 3, 4], be(d.length), [73, 68, 65, 84], d, [5, 6, 7, 8], be(0), [73, 69, 78, 68], [174, 66, 96, 130]); };
          var files = {}, nf = 0, B64 = function (b) { return Utilities.base64Encode(b); }, E = function (f) { return String(err(f)).split('|').slice(0, 2).join('|'); };
          OSG_DRV_ = { file: function (id) { return files[id] || null; }, info: function (id) { var f = files[id]; return f ? { size: f.b.length, mime: f.m, name: f.n } : null; }, blob: function (id) { return files[id] ? { id: id, w: 400, h: 300 } : null; },
            b64: function (id) { var f = files[id]; return f ? B64(f.b) : null; }, add: function () { throw new Error('not here'); }, bin: function () { return true; }, decodes: function () { return true; } };
          if (has) OIPIC_ADD_ = function (d, name, mime, bytes) { var id = 'IPIC' + ('00000' + (++nf)).slice(-5) + 'x'; files[id] = { b: bytes, m: mime, n: name }; return id; };
          files.FOREIGNpng3 = { b: png(10, 10), m: 'image/png', n: 'y.png' }; files.FOREIGNdoc3 = { b: [1, 2], m: 'application/pdf', n: 'x.pdf' };
          if (!has) { EQ('CH-83 item picture', 'no F3', 'F3'); return; }
          var CARD = function (c) { rc(); return officeStockItem(tI, c); }, PUT = function (t, b) { rc(); return officeItemPicPut(t, B64(b)); };
          var NI = function (c, o) { var k = CARD(c); return Object.assign({ code: c, name: k.name, cat: k.cat, size: k.size, unit: k.unit, kg: k.kg, reorder: k.reorder || '', status: k.status, tracked: k.tracked ? 'Yes' : 'No', isSet: k.isSet ? 'Yes' : 'No', forHire: k.forHire ? 'Yes' : 'No', forSale: k.forSale ? 'Yes' : 'No', ev: k.ev }, o || {}); };
          var IS = function (d) { rc(); return officeItemSave(tI, d); };
          db.insert('Items', [{ ItemCode: 'CHF-PA', Name: 'Pic standard', Category: 'Ringlock', Size: '2 m', Unit: 'pc', WeightKg: 10, StockTracked: 'Yes', IsSet: 'No', ForHire: 'Yes', ForSale: 'No', Status: 'Active' },
            { ItemCode: 'CHF-PB', Name: 'Pic ledger 1.8 m', Category: 'Ringlock', Size: '1.8 m', Unit: 'pc', WeightKg: 6, StockTracked: 'Yes', IsSet: 'No', ForHire: 'Yes', ForSale: 'No', Status: 'Active' },
            { ItemCode: 'CHF-PC', Name: 'No pic brace', Category: 'Ringlock', Unit: 'pc', WeightKg: 5, StockTracked: 'Yes', IsSet: 'No', ForHire: 'Yes', ForSale: 'No', Status: 'Active' }]);
          var QR = 'CAE/Q/2026/886', QS = 'CAE/Q/2026/887';
          db.insert('Quotes', [{ QuoteNo: QR, Rev: 0, QuoteType: 'Rental', CustID: 'CUST-0001', SiteID: 'SITE-0881', Status: 'Draft', QuoteDate: new Date(2026, 10, 20), VATPct: 0.15, PDF: 'https://x/qr' },
            { QuoteNo: QS, Rev: 0, QuoteType: 'Sale', CustID: 'CUST-0001', SiteID: 'SITE-0881', Status: 'Draft', QuoteDate: new Date(2026, 10, 20), VATPct: 0.15 }]);
          var ln = function (no, n, c) { return { LineID: 'QL-F3-' + no.slice(-3) + n, QuoteNo: no, LineNo: n, ItemCode: c, Description: c, Unit: 'pc / month', Qty: 2, Months: 1, Rate: 10, Optional: 'No', Selected: 'Yes' }; };
          db.insert('QuoteLines', [ln(QR, 1, 'CHF-PA'), ln(QR, 2, 'CHF-PC'), ln(QR, 3, 'CHF-PB'), ln(QR, 4, 'CHF-PA'), ln(QS, 1, 'CHF-PA')]);
          var pics = function (no) { var b = PDF_SPECS.Quote(db, no).blocks.filter(function (x) { return x.t === 'pics'; })[0]; return b ? b.items.map(function (x) { return x.f + '=' + x.cap; }).join(';') : 'none'; };
          // CH-84 part 1: no Items.PicID column yet -> no picture field, no pics block, a pic sent is refused
          (function () { var res = [], k = CARD('CHF-PA'); res.push(k.picOk === true ? 'picOk' : 'no col', pics(QR), E(function () { IS(NI('CHF-PA', { pic: 'IPIC00001x' })); }), E(function () { PUT(tI, png(400, 300)); }));
            EQ('CH-84a no PicID column: no picture field, no pictures printed, pic refused', res.join('|'), 'no col|none|BADINPUT|picture|NOACCESS'); })();
          db.ensureColumn('Items', 'PicID');
          // CH-83: upload (edit login only), save = PicID, card shows it, quote PDFs listing it marked old, foreign / non-picture refused, no pic = kept, blank = removed
          (function () { var res = [], k0 = CARD('CHF-PA'); res.push(k0.picOk === true, !k0.pic);
            res.push(E(function () { PUT(tV, png(400, 300)); }));
            var up = PUT(tI, png(400, 300)); res.push(typeof up.id);
            var s = IS(NI('CHF-PA', { pic: up.id })); res.push(String(must(db, 'Items', 'ItemCode', 'CHF-PA').PicID) === up.id, s.old >= 1 ? 'old' : 'old ' + s.old);
            var k1 = CARD('CHF-PA'); res.push(!!(k1.pic && k1.pic.id === up.id && /^data:image\/png;base64,/.test(k1.pic.img)), k1.ev !== k0.ev);
            res.push(E(function () { IS(NI('CHF-PA', { pic: 'FOREIGNpng3' })); }), E(function () { IS(NI('CHF-PA', { pic: 'FOREIGNdoc3' })); }), E(function () { IS(Object.assign(NI('CHF-PA'), { ev: k0.ev, pic: '' })); }));
            var s2 = IS(NI('CHF-PA', { name: 'Pic standard 2' })); res.push(String(must(db, 'Items', 'ItemCode', 'CHF-PA').PicID) === up.id ? 'kept' : 'lost');
            var s3 = IS(NI('CHF-PA', { pic: '' })); res.push(blank(must(db, 'Items', 'ItemCode', 'CHF-PA').PicID) ? 'removed' : 'still', !CARD('CHF-PA').pic, IS(NI('CHF-PA')).same === true);
            EQ('CH-83 item picture: edit login uploads, save / card / quote PDF old, refusals, kept, removed', res.join('|'), 'true|true|NOACCESS|string|true|old|true|true|BADINPUT|picture|BADINPUT|picture|STALE|kept|removed|true|true'); })();
          // CH-84: Rental quote PDF: a pics block after the prices, components in line order, each once with all its line nos., no picture = left out; Sale quote: none
          (function () { var res = [], a = PUT(tI, png(400, 300)), b = PUT(tI, png(300, 300));
            IS(NI('CHF-PA', { pic: a.id })); IS(NI('CHF-PB', { pic: b.id })); IS(NI('CHF-PC', { pic: '' }));
            res.push(pics(QR), pics(QS));
            var bl = PDF_SPECS.Quote(db, QR).blocks.map(function (x) { return x.t; }), gi = bl.indexOf('grid'), pi = bl.indexOf('pics'); res.push(gi >= 0 && pi > gi ? 'after prices' : bl.join(','));
            EQ('CH-84 Rental quote PDF: a picture per component, line order, once each; Sale none', res.join('|'), a.id + '=No. 1, 4 - Pic standard 2, 2 m;' + b.id + '=No. 3 - Pic ledger 1.8 m|none|after prices'); })();
        } catch (e) { eq('CH-F3 crashed after ' + LAST.slice(0, 6), String(e && e.stack || e).slice(0, 400), 'no crash'); } finally { OSG_DRV_ = kd; if (has) OIPIC_ADD_ = ka; } })();
