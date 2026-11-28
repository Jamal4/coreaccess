import sys,subprocess,shutil,tempfile,os
src=sys.argv[1]
S=[('S1 job filter','CAE_Ops_Office.gs',"if (String(c.JobNo) !== jn || ","if ("),
 ('S2 sort','CAE_Ops_Office.gs',"X); }).sort(function (x, y) { return x.no < y.no ? 1 : x.no > y.no ? -1 : 0; });","X); });"),
 ('S3 role','CAE_Ops_Office.gs',"sg.role = 'Received by';","0;"),
 ('S4 blank regex','CAE_Ops_Office.gs',"return /^[A-Za-z0-9_-]{25,80}$/.test(id) ?","return id ?"),
 ('S5 ticks','CAE_Ops_PDF.gs',"(ret ? '☒' : '☐') + ' Return to yard'","'☐ Return to yard'"),
 ('S6 back reset','Office.html',"CH.tile=tile||'dos';CH.back=null;","CH.tile=tile||'dos';"),
 ('S7 move link','Office.html',"(CH_NO.test(m.ref)?","(false?"),
 ('S9 maker signs','CAE_Ops_Office.gs',"var who = comm || what === 'Challan' ?","var who = comm ?"),
 ('S10 stamp width','CAE_Ops_Office.gs',"tb.setColumnWidth(1, 80);","tb.setColumnWidth(1, BODY_W - 160);"),
 ('S8 copy line','CAE_Ops_PDF.gs',"Copy 1: client  ·","Copy 1: customer  ·")]
for n,f,a,b in [S[int(i)] for i in sys.argv[2].split(",")]:
  d=tempfile.mkdtemp(); [shutil.copy(os.path.join(src,x),d) for x in os.listdir(src)]
  p=os.path.join(d,f); t=open(p,encoding='utf-8').read(); assert t.count(a)==1,n; open(p,'w',encoding='utf-8').write(t.replace(a,b))
  if f=='Office.html': r=subprocess.run(['node','h/pg/pg_ch.js',d],capture_output=True,text=True).stdout.strip().split('\n')[-1]
  else: r=subprocess.run(['bash','tools8/run_ch_tests.sh',d],capture_output=True,text=True).stdout.strip().split('\n')[-1][:70]
  print(n,'->',r); shutil.rmtree(d)
