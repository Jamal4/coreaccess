import sys
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    c=s.count(a); assert c==n,(a[:70],c); s=s.replace(a,b)
# sign-out: background saves dropped
rep("QE.d=null;QE.q=null;QE.dirty=false;QE.saving=false;QE.seq++;qePickClose();}",
    "QE.d=null;QE.q=null;QE.dirty=false;QE.saving=false;QE.seq++;QE.job=null;QB.ep++;QB.pend={};qePickClose();}")
# quote view remembers which quote it shows
rep("""  document.title='Core Access · '+no;
  QS.cur=null;QS.only=false;""","""  document.title='Core Access · '+no;
  QS.cur=null;QS.only=false;QS.vno=String(no);""")
# list: new quotes still being saved
rep("""  if(!show.length){L.innerHTML='<div class="empty">'+(rows.length?'No quotes match.':'No quotes yet.')+'</div>';return;}
  L.innerHTML=show.map(function(r){""","""  var P=qePendHtml();
  if(!show.length&&!P){L.innerHTML='<div class="empty">'+(rows.length?'No quotes match.':'No quotes yet.')+'</div>';return;}
  L.innerHTML=P+show.map(function(r){""")
rep("""var QE={seq:0,d:null,q:null,dirty:false,pick:null,fam:'',saving:false};
""","""var QE={seq:0,d:null,q:null,dirty:false,pick:null,fam:'',saving:false,job:null};
var QB={ep:0,n:0,pend:{}}; /* W4g: background saves (ep = sign-in epoch; pend = new quotes still being saved, shown in the list) */
""")
# form shell shared by open + reopen
A="  QE.d=null;QE.q=null;QE.dirty=false;qePickClose();\n"; B="  var my=++QE.seq;QE.saving=false;\n"
i=s.index(A); j=s.index(B,i); assert s.count(A)==1 and j-i<1500
mid=s[i+len(A):j]
s=s[:i]+"  QE.d=null;QE.q=null;QE.dirty=false;QE.job=null;qePickClose();qeShell(no);\n"+s[j:]
rep("/* entry: no = quote number to edit, empty = new */\nfunction viewQuoteEdit(no){", "function qeShell(no){ /* W4g: the form's frame (open + reopen) */\n"+mid+"}\n/* entry: no = quote number to edit, empty = new */\nfunction viewQuoteEdit(no){")
# save
a=s.index("function qeSave(pdf){"); b=s.index("\n/* ======================= start ======================= */")
old=s[a:b]
assert "call('officeQuoteSave',S.token,d)" in old
dline=[l for l in old.split('\n') if l.startswith('  var d={no:q.no,')][0]
lline=[l for l in old.split('\n') if l.startswith('    lines:c.lines.map(')][0]
cline=[l for l in old.split('\n') if l.startswith('  if(c.e.length)')][0]
new="""/* W4g: Save shows "Saved" at once; the call runs in the background (one per form in flight; another Save meanwhile = one more run
   with the newest data, sent when the first answers, with its number + version). The data stays here until the server answers:
   a refusal shows the error on the form (the form opens again with the data if it was left). Sign-out drops the answers (QB.ep). */
function qeSave(pdf){
  var q=QE.q,c=qeCheck(),box=document.getElementById('qeerr'),J=QE.job;
  if(!QE.dirty&&J&&J.busy){if(pdf)J.pdf=true;box.innerHTML=qeSavedMsg(J.pdf);return;}
  if(q.no&&!QE.dirty){viewQuote(q.no);toast(pdf?'Nothing changed — use Open / Make PDF here.':'Nothing changed.');return;}
"""+cline+"""
  box.innerHTML='';
  var b1=document.getElementById('qesave');if(b1&&b1.disabled)return;
"""+dline+"\n"+lline+"""
  var cu=qeCust(),si=qeSite(),s={d:d,q:JSON.parse(JSON.stringify(q)),qd:QE.d,cust:cu?cu.name:'',project:si?si.project:'',type:q.type};
  if(!J)J=QE.job={id:++QB.n,busy:false,next:null,pdf:false,no:q.no||'',ev:q.ev};
  if(pdf)J.pdf=true;
  QE.dirty=false;box.innerHTML=qeSavedMsg(J.pdf);
  if(J.busy){J.next=s;return;}
  qeSend(J,s);
}
function qeSavedMsg(pdf){return '<div class="msg ok" role="status">'+ic('okc')+'<div>Saved'+(pdf?' — the PDF follows.':'.')+'</div></div>';}
function qePendHtml(){return Object.keys(QB.pend).map(function(k){var p=QB.pend[k];
  return '<div class="qcard" aria-busy="true"><div class="qrow"><span class="qno"><span class="spin"></span> Saving…</span><span class="sp"></span>'+(p.type?'<span class="pill ty">'+esc(p.type)+'</span>':'')+'</div>'+
    '<div class="qc">'+esc(p.cust)+'</div>'+(p.project?'<div class="qp">'+esc(p.project)+'</div>':'')+'</div>';}).join('');}
function qeSend(J,s){
  var d=s.d,ep=QB.ep,pk=J.no?'':'p'+J.id;J.busy=true;if(J.no){d.no=J.no;d.ev=J.ev;}
  if(pk){QB.pend[pk]={cust:s.cust,project:s.project,type:s.type};quotesDraw();}
  call('officeQuoteSave',S.token,d).then(function(r){
    if(ep!==QB.ep)return;r=r||{};if(pk)delete QB.pend[pk];
    var no=String(r.no||d.no),here=QE.job===J&&!!document.getElementById('qe');J.no=no;if(typeof r.ev==='number')J.ev=r.ev;
    if(here&&QE.q){QE.q.no=no;QE.q.ev=J.ev;QE.q.rev=+r.rev||0;QE.q.status=String(r.status||QE.q.status);}
    if(J.next){var n=J.next;J.next=null;qeSend(J,n);return;}
    J.busy=false;var pdf=J.pdf;J.pdf=false;
    toast((d.no?'Saved '+no+(r.rev?' · Rev '+r.rev:''):'Quote '+no+' saved as Draft')+(r.changed===false?' (nothing changed)':pdf?' — making the PDF…':'.'));
    if(QS.pdfBg)delete QS.pdfBg[no];
    if(here&&!QE.dirty){QE.job=null;viewQuote(no,r.view);}
    else if(!here){if(document.getElementById('qv')&&QS.vno===no)quoteLoad(no,r.view);else if(document.getElementById('qlist'))quotesLoad();}
    if(pdf)qPdfBg(no);
  },function(m){
    if(ep!==QB.ep)return;if(pk){delete QB.pend[pk];quotesDraw();}
    var n=J.next,here=QE.job===J&&!!document.getElementById('qe');J.next=null;J.busy=false;J.pdf=false;
    if(srvGate(m))return;
    if(here)QE.dirty=true;else qeReopen(J,n||s);
    qeErr(m,J.no||d.no,!here);
  });
}
/* the form again with the data of a refused background save (the person had left it) */
function qeReopen(J,s){
  var no=J.no||s.d.no||'';document.title='Core Access · '+(no?'Edit '+no:'New quote');qePickClose();QE.seq++;
  QE.d=s.qd;QE.q=s.q;if(J.no){QE.q.no=J.no;QE.q.ev=J.ev;}QE.dirty=true;QE.saving=false;QE.job=J;qeShell(no);qeDraw();
}
function qeErr(m,no,away){
  var k=code(m).split('|')[0];
  if(k==='QLOCKED'){QE.dirty=false;QE.job=null;viewQuote(no);toast(no+' is locked now — nothing saved.');return;}
  if(away)toast((no?no+' ':'The quote ')+'was not saved — the form is open again with your changes.');
  var box=document.getElementById('qeerr');if(!box)return;
  if(k==='STALE'){box.innerHTML='<div class="msg warn">'+ic('alert')+'<div>Someone changed '+esc(no)+' a moment ago — nothing saved. <button type="button" class="btn btn-ghost btn-sm" id="qereload">Open the latest</button></div></div>';
    document.getElementById('qereload').onclick=function(){QE.dirty=false;viewQuoteEdit(no);};return;}
  box.innerHTML='<div class="msg warn">'+ic('alert')+'<div>'+errText(m)+'</div></div>';
}
"""
s=s[:a]+new+s[b:]
open(p,'w',encoding='utf-8').write(s); print('ok')
