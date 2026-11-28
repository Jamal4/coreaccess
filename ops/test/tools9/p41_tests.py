import sys
def ed(p, pairs):
    s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        n = s.count(a); assert n == 1, (p, n, a[:70]); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
ed('tools8/ch_block.js', [("the PDF says Direct to site, not the supplier', [own('CH-BRD', SL, SUP), (function () { var p = specChallan(db, sD.no), t = JSON.stringify(p.blocks); return /Direct to site/.test(t)",
  "the PDF prints no From / source (AC1 round, user 28 Nov), not the supplier', [own('CH-BRD', SL, SUP), (function () { var p = specChallan(db, sD.no), t = JSON.stringify(p.blocks); return !/Direct to site|\"From\"/.test(t)")])
ed('tools8/ch_c5.js', [("[/☒ Delivery to site.*☐ Return to yard/.test(T(pd))", "[/☒ Delivery to site.*☐ Return from site/.test(T(pd)) && !/\"From\"|\"To\"/.test(T(pd))"),
  ("[/☐ Delivery to site.*☒ Return to yard/.test(T(pr))", "[/☐ Delivery to site.*☒ Return from site/.test(T(pr)) && !/\"From\"|\"To\"/.test(T(pr))")])
ed('tools8/ch_f.js', [("'saved|1|Vendor|Vendor F2 Ltd|same vendor|Posted|0|0|0|none|pdf vendor|Vendor|Cancelled|0|panel 0'", "'saved|1|Vendor|Vendor F2 Ltd|same vendor|Posted|0|0|0|none|pdf no vendor|Vendor|Cancelled|0|panel 0'")])
ed('tools8/ch_f5.js', [
 ("to = pr.filter(function (x) { return x[0] === 'To'; })[0];\n            res.push(/F5 Vendor/.test(to[1]) && /collected from site/.test(to[1]) && /VRN-1/.test(to[1]) ? 'pdf to vendor' : to[1], to[3] === d.no ? 'related vendor DO' : to[3]);",
  "to = pr[pr.length - 1];\n            res.push(!pr.some(function (x) { return x[0] === 'To' || x[0] === 'From'; }) && !/F5 Vendor|VRN-1/.test(JSON.stringify(pr)) ? 'pdf no source' : 'pdf shows source', to[3] === d.no ? 'related vendor DO' : to[3]); // AC1 round (user 28 Nov): no From / To / source on the client's copy"),
 ("return t ? /Return to the vendor/.test(JSON.stringify(t.text)) ? 'vendor' : /Return to yard/.test(JSON.stringify(t.text)) ? 'yard' : '?' : 'none'; };",
  "return t ? /Return to the vendor|Return to yard/.test(JSON.stringify(t.text)) ? 'names where' : /Return from site/.test(JSON.stringify(t.text)) ? 'site' : '?' : 'none'; }; // AC1 round: the tick no longer names the vendor / yard"),
 ("res.join('|'), 'out 4|vendor|yard'); });", "res.join('|'), 'out 4|site|site'); });")])
print('ok')
