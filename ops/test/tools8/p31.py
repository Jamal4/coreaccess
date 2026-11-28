# r31 F3: a picture per catalogue item, printed with the lines of a Rental quote
import sys
D = sys.argv[1] if len(sys.argv) > 1 else '..'
def ed(f, pairs):
    p = D + '/' + f; s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        assert s.count(a) == 1, (f, a[:70], s.count(a)); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
O = []
O.append(("var OST_EV_ = ['ItemCode', 'Name', 'Category', 'Size', 'Unit', 'WeightKg', 'StockTracked', 'IsSet', 'ForHire', 'ForSale', 'ReorderLevel', 'Status'];",
          "var OST_EV_ = ['ItemCode', 'Name', 'Category', 'Size', 'Unit', 'WeightKg', 'StockTracked', 'IsSet', 'ForHire', 'ForSale', 'ReorderLevel', 'Status', 'PicID']; // F3: + the picture"))
O.append(("var OST_PRINT_ = { Quotes: ['Size'],", "var OST_PRINT_ = { Quotes: ['Size', 'PicID'],"))
O.append(("    [['ForHire', fh], ['ForSale', fs]].forEach(function (f) { p[f[0]] = f[1]; if (!row || String(cur(f[0]) == null ? '' : cur(f[0])).trim() !== f[1]) ch.push(f[0]); }); // a blank cell becomes Yes / No\n",
          "    [['ForHire', fh], ['ForSale', fs]].forEach(function (f) { p[f[0]] = f[1]; if (!row || String(cur(f[0]) == null ? '' : cur(f[0])).trim() !== f[1]) ch.push(f[0]); }); // a blank cell becomes Yes / No\n"
          "    if (oIPicOk_(db)) { var pc = oIPicArg_(db, x, row, env); p.PicID = pc; if (!row || pc !== oIPicOf_(db, row)) ch.push('PicID'); } else if (x.pic) oFail_('BADINPUT|picture'); /* F3: the item's picture */\n"))
O.append(("  o.lists = { cats: oStLs_(db, 'ItemCategory'), units: oStLs_(db, 'Unit') };",
          "  o.picOk = oIPicOk_(db); var pv = oIPicView_(db, it); if (pv) o.pic = pv; /* F3 */\n  o.lists = { cats: oStLs_(db, 'ItemCategory'), units: oStLs_(db, 'Unit') };"))
O.append(("function officeQuoteSave(token, d) {\n",
"""// F3 (28 Nov): a picture per catalogue item (PNG / JPG, max 1 MB), printed with the lines of a Rental quote. Items.PicID = its Drive file (folder Item pictures).
// officeItemPicPut uploads it (-> id, recorded OIPIC:<id>); officeItemSave then carries pic: that id ('' = none; no pic = kept). Set-up: upgradeF3Live.
var OIPIC_ADD_ = null; // tests: function (db, name, mime, bytes) -> file id
function oIPicOk_(db) { return db.headers('Items').indexOf('PicID') >= 0; }
function oIPicOf_(db, it) { return it && oIPicOk_(db) && !blank(it.PicID) ? String(it.PicID).trim() : ''; }
function oIPicView_(db, it) {
  var id = oIPicOf_(db, it); if (!id) return null;
  var d = oSgDrv_(), i = d.info(id), b = i && /^image\\/(png|jpeg)$/.test(i.mime) ? d.b64(id) : null;
  return { id: id, img: b ? 'data:' + i.mime + ';base64,' + b : '' };
}
function oIPicArg_(db, x, row, env) {
  var cur = oIPicOf_(db, row);
  if (x.pic === undefined || x.pic === null) return cur;
  if (typeof x.pic !== 'string' || x.pic.length > 80) oFail_('BADINPUT|picture');
  if (x.pic === '' || x.pic === cur) return x.pic;
  var i = /^[\\w-]{6,80}$/.test(x.pic) && env.get('OIPIC:' + x.pic) ? oSgDrv_().info(x.pic) : null;
  if (!i || !/^image\\/(png|jpeg)$/.test(i.mime)) oFail_('BADINPUT|picture');
  return x.pic;
}
function officeItemPicPut(token, b64) {
  var L = officeGate_(token, null), env = oEnv_();
  if (!oStCan_(oAcc_(L))) oFail_('NOACCESS');
  oSgSlow_(env, L.email);
  var bytes = oB64Dec_(b64);
  if (!bytes) oFail_(typeof b64 === 'string' && b64.length > Math.ceil(OSG_MAX_ / 3) * 4 + 4 ? 'BADIMG|size' : 'BADIMG|type');
  var im = oSgImg_(bytes);
  if (!oSgDrv_().decodes(bytes, im.mime)) oFail_('BADIMG|broken');
  var db = env.db(); if (!db) oFail_('BUSY');
  if (!oIPicOk_(db)) oFail_('NOACCESS');
  var name = 'Item_picture_' + env.now() + (im.mime === 'image/png' ? '.png' : '.jpg');
  var id = OIPIC_ADD_ ? OIPIC_ADD_(db, name, im.mime, bytes)
    : subFolder_(opsFolder_(db), 'Item pictures').createFile(Utilities.newBlob(bytes.map(function (x) { return x << 24 >> 24; }), im.mime, name)).getId();
  env.put('OIPIC:' + id, { by: L.email, at: env.now() });
  return { id: id };
}
function upgradeF3Live() {
  var db = new SheetDb(), add = db.ensureColumn('Items', 'PicID');
  if (add) { var s = db.sheet('Items'), h = db.headers('Items'); s.getRange(1, h.indexOf('PicID') + 1, s.getMaxRows(), 1).clearDataValidations(); log_(db, 'Upgrade F3', '', 'Items + PicID'); }
  SpreadsheetApp.flush(); Logger.log(add ? 'Done: Items + PicID' : 'Already up to date.');
}
function officeQuoteSave(token, d) {
"""))
ed('CAE_Ops_Office.gs', O)
P = []
P.append(("  if (t.advance > 0) com.push({ t: 'p', text: [['Advance with order:  ', { bold: true }], [pctTxt(t.advancePct) + ' of the total = Tk ' + tk(t.advance), {}]], size: 9, after: 6 });\n",
          "  if (t.advance > 0) com.push({ t: 'p', text: [['Advance with order:  ', { bold: true }], [pctTxt(t.advancePct) + ' of the total = Tk ' + tk(t.advance), {}]], size: 9, after: 6 });\n"
          "  if (type === 'Rental') { var pics = quotePics_(db, lines); if (pics.length) com.push({ t: 'pics', items: pics, cap: 'Pictures for visual reference only - not to scale.' }); } // F3: a picture per component\n"))
P.append(("function specQuote(db, quoteNo) {\n",
"""function quotePics_(db, lines) { // F3: the printed lines' components that have a picture (Items.PicID), in line order, each once (with all its line nos.), at most 9
  if (typeof db.headers !== 'function' || db.headers('Items').indexOf('PicID') < 0) return [];
  var items = db.rows('Items'), seen = {}, out = [];
  lines.forEach(function (l, i) {
    var c = String(l.ItemCode == null ? '' : l.ItemCode).trim(); if (!c) return;
    if (seen[c]) { seen[c].no.push(i + 1); return; }
    var it = find(items, 'ItemCode', c); if (out.length >= 9 || !it || blank(it.PicID)) return;
    seen[c] = { f: String(it.PicID).trim(), name: dash(it.Name) + (blank(it.Size) ? '' : ', ' + it.Size), no: [i + 1] }; out.push(seen[c]);
  });
  return out.map(function (x) { return { f: x.f, cap: 'No. ' + x.no.join(', ') + ' - ' + x.name }; });
}
function specQuote(db, quoteNo) {
"""))
P.append(("  h: function (body, b) { para_(body, b.text, { size: 10.5, bold: true, color: 'teal', before: 15, after: 6 }); },\n",
"""  pics: function (body, b) { /* F3: component pictures, 3 to a row, each with its line no. + name; a file that can't be read = an empty cell (the PDF is still made) */
    var n = 3, w = Math.floor(BODY_W / n), rows = [], got = 0;
    for (var i = 0; i < b.items.length; i += n) rows.push(b.items.slice(i, i + n));
    para_(body, 'Component pictures', { size: 9, bold: true, before: 8, after: 3 });
    var tb = body.appendTable(rows.map(function () { var a = []; for (var k = 0; k < n; k++) a.push(''); return a; }));
    tb.setBorderWidth(0); for (var k = 0; k < n; k++) tb.setColumnWidth(k, w);
    rows.forEach(function (r, ri) { r.forEach(function (x, ci) {
      var cell = tb.getCell(ri, ci); cell.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(4).setPaddingRight(4);
      var p = styleP_(cell.getChild(0).asParagraph(), '', { align: 'C', after: 2, line: 1 });
      if (typeof oSgImgInto_ === 'function' && oSgImgInto_(p, x.f, w - 14, 110)) { got++; styleP_(cell.appendParagraph(x.cap), x.cap, { size: 7.5, color: 'grey', align: 'C', after: 0, line: 1 }); }
    }); });
    if (got) para_(body, b.cap, { size: 8, italic: true, color: 'grey', align: 'C', after: 8 });
  },
  h: function (body, b) { para_(body, b.text, { size: 10.5, bold: true, color: 'teal', before: 15, after: 6 }); },
"""))
ed('CAE_Ops_PDF.gs', P)
print('ok')
H = []
H.append((".st-f3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 12px}", ".st-f3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0 12px} .st-pic{max-height:120px;max-width:180px;border-radius:8px;background:#fff;padding:3px;display:block;margin-bottom:6px}"))
H.append(("o.lists={cats:stList(ls.cats),units:stList(ls.units)};o.ulk=r.ulk===true;",
          "o.lists={cats:stList(ls.cats),units:stList(ls.units)};o.ulk=r.ulk===true;o.picOk=r.picOk===true;o.pic=r.pic&&typeof r.pic.id==='string'&&r.pic.id?{id:r.pic.id,img:SG_IMG.test(String(r.pic.img||''))?r.pic.img:''}:null; /* F3 */"))
H.append(("  h+='</div>';\n  if(o.isSet)h+='<div class=\"box\"><h4>Parts per set</h4>'",
          "  if(o.picOk)h+='<div class=\"box\"><h4>Picture</h4>'+(o.pic?(o.pic.img?'<img class=\"st-pic\" alt=\"Item picture\" src=\"'+o.pic.img+'\">':'<span class=\"muted\">Picture on file</span>'):'<span class=\"muted\">No picture</span>')+'<div class=\"tag\">Printed with this item on Rental quotes.</div></div>'; /* F3 */\n  h+='</div>';\n  if(o.isSet)h+='<div class=\"box\"><h4>Parts per set</h4>'"))
H.append(("  var tr=o.tracked?'Yes':'No',st=o.isSet?'Yes':'No',pv=function(x){return x==null?'':x;};\n",
          "  var tr=o.tracked?'Yes':'No',st=o.isSet?'Yes':'No',pv=function(x){return x==null?'':x;};\n  var PK=!nw&&o.picOk===true,pic=PK&&o.pic?o.pic.id:'',picImg=PK&&o.pic?o.pic.img:'',pic0=pic; /* F3: the item's picture (edit only) */\n"))
H.append(("    (P?'<span class=\"lbl\">Prices &amp; cost (Directors)</span>",
          "    (PK?'<div class=\"fld\"><span>Picture · optional, printed with this item on Rental quotes</span><div class=\"qe-pic\" id=\"xpic\"></div></div>':'')+\n    (P?'<span class=\"lbl\">Prices &amp; cost (Directors)</span>"))
H.append(("  stSegOn('xtr',function(x){tr=x;});stSegOn('xst',function(x){st=x;});",
"""  var picDraw=function(){var b=document.getElementById('xpic');if(!b)return; /* F3: PNG / JPG, max 1 MB, uploaded at once, kept on the item by Save */
    b.innerHTML=(pic?(SG_IMG.test(picImg)?'<img alt="Item picture" src="'+picImg+'">':'<span class="muted">Picture on file</span>'):'<span class="muted">No picture</span>')+
      '<label class="btn btn-ghost btn-sm">'+(pic?'Change':'Add picture')+'<input type="file" id="xpf" accept="image/png,image/jpeg" hidden></label>'+(pic?'<button type="button" class="btn btn-ghost btn-sm" id="xpx">Remove</button>':'');
    var no=function(m){dlgErr(sgErr(m));};
    document.getElementById('xpf').onchange=function(){
      var f=this.files&&this.files[0];this.value='';if(!f||DLG.busy||my!==DLG.seq)return;
      if(!/^image\\/(png|jpeg)$/.test(f.type))return no('BADIMG|type');
      if(f.size>1048576)return no('BADIMG|size');
      var rd=new FileReader();
      rd.onload=function(){
        var d=String(rd.result||'').replace(/^data:image\\/jpg;/,'data:image/jpeg;');if(my!==DLG.seq||DLG.busy)return;if(!SG_IMG.test(d))return no('BADIMG|type');
        DLG.busy=true;ifz(true);busyBtn(yes,true,'Adding picture…');dlgErr('');
        call('officeItemPicPut',S.token,d.slice(d.indexOf(',')+1)).then(function(r){if(my!==DLG.seq)return;DLG.busy=false;ifz(false);busyBtn(yes,false);if(!r||typeof r.id!=='string')return;pic=r.id;picImg=d;picDraw();toast('Picture added. Save to keep it on the item.');},
          function(m){if(my!==DLG.seq)return;DLG.busy=false;ifz(false);busyBtn(yes,false);if(srvGate(m))return;no(m);});
      };
      rd.onerror=function(){no('BADIMG|broken');};
      rd.readAsDataURL(f);
    };
    var x=document.getElementById('xpx');if(x)x.onclick=function(){if(DLG.busy)return;pic='';picImg='';picDraw();};
  };
  stSegOn('xtr',function(x){tr=x;});stSegOn('xst',function(x){st=x;});"""))
H.append(("['xc','xn','xk','xs','xu','xw','xr','xt','xp1','xp2','xp3','xp4'].forEach(function(i){var e=document.getElementById(i);if(e)e.disabled=on;});};",
          "['xc','xn','xk','xs','xu','xw','xr','xt','xp1','xp2','xp3','xp4','xpf','xpx'].forEach(function(i){var e=document.getElementById(i);if(e)e.disabled=on;});};\n  picDraw();"))
H.append(("    if(!nw)d.ev=o.ev;\n", "    if(!nw)d.ev=o.ev;\n    if(PK&&pic!==pic0)d.pic=pic; /* F3: only a changed picture is sent (none = kept) */\n"))
H.append(("      if(k[0]==='BADINPUT'&&k[1]==='set tracked'){",
          "      if(k[0]==='BADINPUT'&&k[1]==='picture'){dlgErr('The picture could not be kept — add it again. Nothing saved.');return;}\n      if(k[0]==='BADINPUT'&&k[1]==='set tracked'){"))
ed('Office.html', H)
print('ok html')
# step R: no readable picture (or the no-image fallback) = no empty "Component pictures" table left in the PDF
ed('CAE_Ops_PDF.gs', [
 ("    var n = 3, w = Math.floor(BODY_W / n), rows = [], got = 0;\n", "    if (typeof OSG_NOIMG_ !== 'undefined' && OSG_NOIMG_) return;\n    var n = 3, w = Math.floor(BODY_W / n), rows = [], got = 0;\n"),
 ("    para_(body, 'Component pictures', { size: 9, bold: true, before: 8, after: 3 });\n", "    var hd = para_(body, 'Component pictures', { size: 9, bold: true, before: 8, after: 3 });\n"),
 ("    if (got) para_(body, b.cap, { size: 8, italic: true, color: 'grey', align: 'C', after: 8 });\n", "    if (got) para_(body, b.cap, { size: 8, italic: true, color: 'grey', align: 'C', after: 8 });\n    else { try { tb.removeFromParent(); hd.removeFromParent(); } catch (e) { /* kept: only an empty table */ } }\n")])
print('ok R')
