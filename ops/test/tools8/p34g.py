#!/usr/bin/env python3
# r34b (F5 live check 28 Nov): usable cell amber for a delivery, Post toast says how many came from outside, own Return shows "outside" even with none of ours
# on site, Return notes / vendor draft text current, vendor Return PDF tick box "Return to the vendor"
import sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '..'
def ed(f, pairs):
    p = os.path.join(D, f); s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        n = s.count(a); assert n == 1, (f, n, a[:90]); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
ed('CAE_Ops_Office.gs', [
("      oFail_('NOTPOSTED|' + String(e && e.message || e).replace(/^Not posted:\\s*/, '').replace(/\\|/g, '/').slice(0, 1500));\n    }\n    return { no: no };\n  });",
 "      oFail_('NOTPOSTED|' + String(e && e.message || e).replace(/^Not posted:\\s*/, '').replace(/\\|/g, '/').slice(0, 1500));\n    }\n"
 "    var ot = 0; try { oChLines_(env2.db() || db, no).forEach(function (l) { ot += num(l.QtyOut); }); } catch (x) { ot = 0; } /* r34b: the page says how many came from outside */\n"
 "    return ot > 1e-9 ? { no: no, out: r2(ot) } : { no: no };\n  });"),
])
ed('CAE_Ops_PDF.gs', [
("(ret ? '☒' : '☐') + ' Return to yard'", "(ret ? '☒' : '☐') + (ret && vend ? ' Return to the vendor' : ' Return to yard')"),
])
ed('Office.html', [
("(showU?(i.set?'<td class=\"r tag\">parts ↓</td>':'<td class=\"r'+(A.short[l.it]?' ch-neg':'')+'\">'",
 "(showU?(i.set?'<td class=\"r tag\">parts ↓</td>':'<td class=\"r'+(A.short[l.it]?(OUT?' ch-out':' ch-neg'):'')+'\">'"),
("(showU?'<td class=\"r'+(A.short[p.p]?' ch-neg':'')+'\">'",
 "(showU?'<td class=\"r'+(A.short[p.p]?(OUT?' ch-out':' ch-neg'):'')+'\">'"),
("  else if(dr)h+='<div class=\"msg warn\">'+ic('alert')+'<div>Draft — no stock has moved yet. <b>Post</b> moves stock and makes the PDF.</div></div>';",
 "  else if(dr)h+='<div class=\"msg warn\">'+ic('alert')+'<div>'+(c.src==='Vendor'?'Draft — vendor rental: <b>Post</b> makes the PDF; no stock moves.':'Draft — no stock has moved yet. <b>Post</b> moves stock and makes the PDF.')+'</div></div>';"),
("Rented items are taken back first and keep their owner, ready for Off-hire.</span>",
 "Our own items come back to stock; anything from outside or a vendor never enters our stock.</span>"),
("+(hp[k]?'<small>'+chSrc(hp[k])+(function(){var s=0;Object.keys(chObj(hp[k])).forEach(function(w){s+=chN(hp[k][w]);});return o-s>1e-9?' · <span class=\"ch-out\">outside '+stQ(o-s)+'</span>':'';})()+'</small>':'')",
 "+((hp[k]||(!V&&D.hpool[jn]))?'<small>'+chSrc(hp[k])+(function(){var s=0;Object.keys(chObj(hp[k])).forEach(function(w){s+=chN(hp[k][w]);});return o-s>1e-9?(hp[k]?' · ':'')+'<span class=\"ch-out\">outside '+stQ(o-s)+'</span>':'';})()+'</small>':'')"),
("toast('Posted. '+(vd?'No stock moved (vendor rental)':'Stock moved')",
 "toast('Posted. '+(vd?'No stock moved (vendor rental)':chN(r.out)>0?'Moved what our stock has; '+stQ(r.out)+' from outside (not our stock)':'Stock moved')"),
])
print('p34g ok')
