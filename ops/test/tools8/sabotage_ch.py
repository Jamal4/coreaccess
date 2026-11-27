import os,sys,subprocess,shutil,tempfile
src=sys.argv[1]; A=int(os.environ.get('A',0)); B=int(os.environ.get('B',99))
S=[('CAE_Ops_Sets.gs',"  if (kind === 'Return') return rent.concat(['']);","  if (kind === 'Return') return [''].concat(rent);",'CH-11'),
 ('CAE_Ops_Sets.gs',"  if (kind !== 'Sale' && kind !== 'Off-hire') return stockMap(db);","  if (kind !== 'Off-hire') return stockMap(db);",'CH-10'),
 ('CAE_Ops_Sets.gs',"var k = v.ItemCode + '|' + v.ToLoc + (oc ? '|' + chOwnOf_(v) : '')","var k = v.ItemCode + '|' + v.ToLoc + (oc ? '|' : '')",'CH-26'),
 ('CAE_Ops_Office.gs',"  oChLines_(db, String(c.ChallanNo)).forEach(function (l) { h.push(","  [].forEach(function (l) { h.push(",'CH-18'),
 ('CAE_Ops_Office.gs',"    if (oChMoved_(db, no, 'Challan')) { db.update('Challans', c, { Status: 'Posted'","    if (false) { db.update('Challans', c, { Status: 'Posted'",'CH-21'),
 ('CAE_Ops_Office.gs',"  } catch (e) { if (made) oFail_('SAVEUNSURE|' + made.no","  } catch (e) { if (false) oFail_('SAVEUNSURE|' + made.no",'CH-20'),
 ('CAE_Ops_Office.gs',"    if (blank(v.ItemCode) || !blank(v.Owner)) return;","    if (blank(v.ItemCode)) return;",'CH-8'),
 ('CAE_Ops_Sets.gs',"job = yk && blank(c.JobNo) ? null : must(db, 'Jobs', 'JobNo', c.JobNo)","job = must(db, 'Jobs', 'JobNo', c.JobNo)",'CH-15'),
 ('CAE_Ops_Office.gs',"if (st === 'Posted' ? !oChHead_(a, k) : !oChCan_(a, k)) oFail_('NOACCESS');","if (!oChCan_(a, k)) oFail_('NOACCESS');",'CH-14'),
('CAE_Ops_Office.gs',"for (var i = 0; i < 200; i++) { var v = next(); if (!find(db.rows(t), col, v)) return v; }","for (var i = 0; i < 200; i++) { var v = next(); return v; }",'CH-27'),
]
for i,(f,a,b,want) in enumerate(S):
    if i<A or i>=B: continue
    t=tempfile.mkdtemp(dir=os.environ.get('TMPDIR')); [shutil.copy(os.path.join(src,x),t) for x in os.listdir(src)]
    p=os.path.join(t,f); s=open(p,encoding='utf-8').read(); assert s.count(a)==1,(i,a); open(p,'w',encoding='utf-8').write(s.replace(a,b))
    o=subprocess.run(['bash','tools8/run_ch_tests.sh',t,'selfTestSummary_()','400','400'],capture_output=True,text=True).stdout
    fails=[l for l in o.splitlines() if l.startswith('FAIL')]
    print('S%d'%(i+1), 'CAUGHT' if any(want in l for l in fails) else 'MISSED', want, len(fails), [l[:60] for l in fails[:2]] if not any(want in l for l in fails) else '')
    shutil.rmtree(t)
