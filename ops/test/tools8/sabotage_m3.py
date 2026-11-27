# usage (harness root): python3 tools8/sabotage_m3.py <src dir>  -> each sabotage must make the M3 tests fail (server or page)
import sys, os, shutil, subprocess, tempfile
src = sys.argv[1]
G = 'CAE_Ops_Office.gs'; H = 'Office.html'
SAB = [
 (G, "  'officeStockList', 'officeStockItem', 'officeItemSave', 'officeStockOpening', 'officeLocList', 'officeLocSave',\n", '', 'S1 calls off the web API list'),
 (G, "var OST_SEE_ = ['YW', 'PS', 'SC', 'PR', 'AC'];", "var OST_SEE_ = ['YW', 'PS', 'SC', 'PR', 'AC', 'HR'];", 'S2 HR sees stock'),
 (G, "function oStCan_(a) { return oIsDir_(a) || (a.YW || 0) >= 2; }", "function oStCan_(a) { return oIsDir_(a) || (a.YW || 0) >= 1 || (a.SC || 0) >= 1; }", 'S3 viewers edit items'),
 (G, "function oStHead_(a) { return oIsDir_(a) || (a.YW || 0) >= 3; }", "function oStHead_(a) { return oIsDir_(a) || (a.YW || 0) >= 2; }", 'S4 YW Staff posts opening'),
 (G, "    var L = officeGate_(token, null);\n    if (!can(oAcc_(L))) oFail_('NOACCESS');\n    var db = env.db(); if (!db) oFail_('BUSY');\n    var prev = OQ_ACT_; OQ_ACT_ = 'office:' + L.email;", "    var L = pre;\n    var db = env.db(); if (!db) oFail_('BUSY');\n    var prev = OQ_ACT_; OQ_ACT_ = 'office:' + L.email;", 'S5 no re-check in the lock'),
 (G, "    try { return fn(env, db, L); } finally { OQ_ACT_ = prev; }\n  });\n}\nfunction oStCode_", "    try { return fn(env, db, L); } finally { }\n  });\n}\nfunction oStCode_", 'S6 acting user not reset'),
 (G, "var OST_GRP_ = { Yard: 'yard', Site: 'site', Repair: 'rep', Lost: 'lost', Scrap: 'lost' };", "var OST_GRP_ = { Yard: 'yard', Site: 'site', Repair: 'rep', Lost: 'lost', Scrap: 'lost', Sold: 'lost' };", 'S7 sold counted as lost'),
 (G, "  g.own = r2(g.yard + g.site + g.rep);", "  g.own = r2(g.yard + g.site + g.rep + g.lost);", 'S8 lost counted as owned'),
 (G, "    if (!isFinite(q) || !q) return;", "    if (!q) return;", 'S9 bad qty breaks sums'),
 (G, "if (!blank(v.FromLoc)) x[String(v.FromLoc)] = (x[String(v.FromLoc)] || 0) - q;", "", 'S10 moves out not subtracted'),
 (G, "return !oStYes_(it.IsSet) && oStSt_(it) === 'Active' && r != null && r > 0 && g.yard < r;", "return !oStYes_(it.IsSet) && r != null && r > 0 && g.yard <= r;", 'S11 low: equal / inactive'),
 (G, "Math.floor(oStGroups_(Q[p.p], locs).yard / p.q + 1e-9)", "Math.round(oStGroups_(Q[p.p], locs).yard / p.q)", 'S12 can-make rounded'),
 (G, "if (!s || blank(k.ItemCode) || !(q > 0)) return;", "if (!s || blank(k.ItemCode)) return;", 'S13 kit part qty 0 kept'),
 (G, "  if (M) o.cost = oStN_(it.ReplacementCost);", "  o.cost = oStN_(it.ReplacementCost);", 'S14 cost to everyone'),
 (G, "  if (M) { o.hire = oStN_(it.HireRateMonth);", "  if (true) { o.hire = oStN_(it.HireRateMonth);", 'S15 prices to everyone'),
 (G, "  if (H) out.locs = ", "  out.locs = ", 'S16 locs to everyone'),
 (G, "(oStYes_(it.StockTracked) || oStYes_(it.IsSet) || Q[String(it.ItemCode)])", "true", 'S17 services listed'),
 (G, "return Q[c][l] && locs[l] && OST_GRP_[String(locs[l].Type)];", "return Q[c][l] && locs[l];", 'S18 where shows supplier / sold'),
 (G, "(x.id < y.id ? 1 : x.id > y.id ? -1 : 0)", "0", 'S19 moves: no id order'),
 (G, "o.moves = mv.slice(0, OST_MOVES_)", "o.moves = mv", 'S20 all moves sent'),
 (G, "if (s && !blank(j.JobNo) && String(j.Status) !== 'Closed') s.jobs.push", "if (s && !blank(j.JobNo)) s.jobs.push", 'S21 closed jobs shown'),
 (G, "var OST_CODE_ = /^[A-Z0-9][A-Z0-9.-]{1,23}$/;", "var OST_CODE_ = /^[A-Za-z0-9][A-Za-z0-9. -]{1,30}$/;", 'S22 loose code check'),
 (G, "if (db.rows('Items').some(function (r) { return String(r.ItemCode == null ? '' : r.ItemCode).trim().toUpperCase() === code; })) oFail_('EXISTS|' + code);", "if (find(db.rows('Items'), 'ItemCode', code)) oFail_('EXISTS|' + code);", 'S23 EXISTS case-sensitive'),
 (G, "if (typeof x.ev !== 'number' || x.ev !== oStEv_(row, oCanSeeMoney_(oAcc_(L)))) oFail_('STALE');", "", 'S24 item: no STALE'),
 (G, "M ? OST_EV_.concat(['HireRateMonth', 'SalePrice', 'ReplacementCost', 'RepairRate']) : OST_EV_", "OST_EV_.concat(['HireRateMonth', 'SalePrice', 'ReplacementCost', 'RepairRate'])", 'S25 prices in the YW hash'),
 (G, "  if (typeof v === 'string' && cur != null && v === String(cur) && v !== '') return v;\n", "", 'S26 own old category refused'),
 (G, "  if (typeof v !== 'string' || Ls.indexOf(v) < 0) oFail_('BADINPUT|' + what);\n", "", 'S27 any category'),
 (G, "if (x.status !== 'Active' && x.status !== 'Inactive') oFail_('BADINPUT|status');", "", 'S28 any status'),
 (G, "    if (oIsDir_(oAcc_(L))) Object.keys(OST_PRICE_)", "    if (oCanSeeMoney_(oAcc_(L)) || true) Object.keys(OST_PRICE_)", 'S29 YW writes prices'),
 (G, "if ((st === 'Yes') !== oStYes_(row.IsSet) && (moved || kitN)) oFail_('BADINPUT|set');", "", 'S30 set flag flips with stock'),
 (G, "if (tr === 'No' && oStYes_(row.StockTracked) && has) oFail_('BADINPUT|stock tracked');", "", 'S31 tracking off with stock'),
 (G, "Object.keys(t).forEach(function (k) { p[k] = oCell_(t[k]);", "Object.keys(t).forEach(function (k) { p[k] = t[k];", 'S32 formula text stored raw'),
 (G, "(n[k] || 0) !== (blank(a) ? 0 : num(a))", "n[k] !== a", 'S33 reorder blank vs 0 is a change'),
 (G, "    if (row && !ch.length) return { code: code, same: true };\n", "", 'S34 unchanged still writes'),
 (G, "if (d.date > oDayOf_(env.now())) oFail_('BADINPUT|count date');", "", 'S35 future count date'),
 (G, "!d.rows.length || d.rows.length > OST_LINES_", "d.rows.length > 999", 'S36 empty / huge post'),
 (G, "if (!it || oStYes_(it.IsSet) || !oStYes_(it.StockTracked) || oStSt_(it) !== 'Active') oFail_", "if (!it) oFail_", 'S37 opening for set / service / inactive'),
 (G, "if (!l || ['Yard', 'Repair'].indexOf(String(l.Type)) < 0 || String(l.Status || 'Active') !== 'Active') oFail_", "if (!l) oFail_", 'S38 opening at site / lost / inactive'),
 (G, "var q = oQeNum_(r.qty, 1, 1e6, 0, n + ' qty')", "var q = num(r.qty)", 'S39 any qty'),
 (G, "      if (seen[k]) oFail_('BADINPUT|' + n + ' (twice)');\n", "", 'S40 same line twice'),
 (G, "      if (done[k]) oFail_('EXISTS|' + c + '|' + r.loc);\n", "", 'S41 second opening'),
 (G, "catch (e) { if (db.rows('StockMoves').length >= n0 + rows.length) return { n: rows.length, warn: 'LOG' }; throw e; }", "catch (e) { throw e; }", 'S42 log failure reported as failure'),
 (G, "catch (e) { if (db.rows('StockMoves').length >= n0 + rows.length) return { n: rows.length, warn: 'LOG' }; throw e; }", "catch (e) { return { n: rows.length, warn: 'LOG' }; }", 'S43 any failure reported as OK'),
 (G, "if (!code || /^LOC-S\\d+$/.test(code)) oFail_('BADINPUT|location code');", "if (!code) oFail_('BADINPUT|location code');", 'S44 site-style location code'),
 (G, "if (x.type !== 'Yard' && x.type !== 'Repair') oFail_('BADINPUT|location type');", "", 'S45 any location type'),
 (G, "db.insert('Locations', { LocID: code, Name: oCell_(name),", "db.insert('Locations', { LocID: code, Name: name,", 'S46 location name raw'),
 (G, "return String(l.LocID == null ? '' : l.LocID).trim().toUpperCase() === up; })) oFail_('EXISTS|' + code);", "return String(l.LocID) === code; })) oFail_('EXISTS|' + code);", 'S47 location EXISTS case-sensitive'),
 (G, "    oQeRate_(env, L);\n    var n0 = db.rows('StockMoves').length;", "    var n0 = db.rows('StockMoves').length;", 'S48 opening not rate-limited'),
 (G, "return !blank(l.LocID) && oHas_(ord, String(l.Type)); })", "return !blank(l.LocID); })", 'S49 loc list shows supplier / sold'),
 (G, "q: isFinite(num(v.Qty)) ? num(v.Qty) : 0, ref:", "q: num(v.Qty), ref:", 'S50 a bad qty in the moves list'),
 (G, "  if (row && !ch.length) return", "  if (false) return", 'S51 unchanged still writes (2)'),
 (H, "  return TILES.filter(function(t){return (a[t.d]||0)>=t.l||(t.o||[]).some(function(d){return (a[d]||0)>=1;});});", "  return TILES.filter(function(t){return (a[t.d]||0)>=t.l;});", 'H1 PS / SC cannot open stock'),
 (H, "    if(k==='stock') return viewStock();\n", "", 'H2 tile not wired'),
 (H, "    if(ST.f!=='all'&&(x.isSet||!(x[ST.f]>0)))return false;", "", 'H3 chips do nothing'),
 (H, "    if(ST.low&&!x.low)return false;", "", 'H4 low chip does nothing'),
 (H, "    if(nw&&!ST_CODE.test(c)){dlgErr(", "    if(false){dlgErr(", 'H5 page: no code check'),
 (H, "      if(seen[k]){dlgErr('Line '+(i+1)+': '+esc(it)+' at '+esc(l)+' is on two lines.');return;}", "", 'H6 page: two lines allowed'),
 (H, "      if(ST.c&&ST.c.code===it&&ST.c.opened.indexOf(l)>=0){", "      if(false){", 'H7 page: opened not checked'),
 (H, "if(k[0]==='STALE'){staleClose(function(){viewItem(c);});return;}", "", 'H8 page: stale not handled'),
 (H, "  ST.rows=[];ST.loaded=false;ST.locs=[];ST.c=null;ST.seq++;\n", "", 'H9 sign-out keeps stock'),
 (H, "(ST.money&&x.cost?'<span class=\"tag\">· value '+stTk(x.own*x.cost)+'</span>':'')", "''", 'H10 no value on cards'),
 (H, "if(k[0]==='EXISTS'){dlgErr(esc(k[1]||'')+' at '+esc(k[2]||'')+' already has an opening balance.", "if(k[0]==='EXISTSX'){dlgErr(esc(k[1]||'')+' at '+esc(k[2]||'')+' already has an opening balance.", 'H11 page: EXISTS on opening not explained'),
 (H, "if(k[0]==='BADINPUT'&&k[1]==='stock tracked'){", "if(false){", 'H12 page: tracking refusal not explained'),
 (H, "      for(var i=0;i<ks.length;i++){var n=stNumIn(v(ks[i][0]),2);if(n===null||n>1e9){dlgErr(", "      for(var i=0;i<ks.length;i++){var n=stNumIn(v(ks[i][0]),2);if(false){dlgErr(", 'H13 page: bad price sent'),
 (H, "function stNumIn(s,dp){s=String(s).trim().replace(/,/g,'');", "function stNumIn(s,dp){s=String(s).trim();", 'H14 commas refused'),
 (H, "<div class=\"qc\">'+esc(x.name)+'</div>", "<div class=\"qc\">'+x.name+'</div>", 'H15 card name as HTML'),
 (H, "<div class=\"sub\">'+esc([o.name,o.size].filter(Boolean).join(' · '))+'</div>", "<div class=\"sub\">'+[o.name,o.size].filter(Boolean).join(' · ')+'</div>", 'H16 item name as HTML'),
]
SAB = SAB[int(os.environ.get('A', 0)):int(os.environ.get('B', 999))]  # optional slice (long runs)
os.environ['TMPDIR'] = '/tmp'; bad = 0
for f, a, b, name in SAB:
    t = tempfile.mkdtemp(dir='/tmp'); [shutil.copy(os.path.join(src, x), t) for x in os.listdir(src)]
    p = os.path.join(t, f); s = open(p, encoding='utf-8').read()
    if s.count(a) != 1: print('SKIP(not found x%d)' % s.count(a), name, flush=True); bad += 1; shutil.rmtree(t); continue
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
    srv_ok = True; r1 = 'not run'
    if f == G:
        r1 = subprocess.run(['bash', 'tools8/run_m3_tests.sh', t], capture_output=True, text=True).stdout.strip()
        srv_ok = ' 0 failed' in r1 and 'passed' in r1
    r2 = 'not run'; pg_ok = True
    if srv_ok:
        r2 = subprocess.run(['node', 'h/pg/pg_m3.js', t], capture_output=True, text=True).stdout.strip().splitlines()
        r2 = r2[-1] if r2 else '?'; pg_ok = r2.startswith('page-m3') and r2.split()[-1].split('/')[0] == r2.split()[-1].split('/')[1]
    caught = not (srv_ok and pg_ok); bad += not caught
    print(('CAUGHT ' if caught else 'MISSED ') + name, '| srv:', r1.split('(')[0].strip(), '| page:', r2, flush=True)
    shutil.rmtree(t)
print('sabotage', len(SAB) - bad, '/', len(SAB), 'caught', flush=True)
