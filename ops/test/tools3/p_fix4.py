import sys
d=sys.argv[1]
def patch(f,pairs):
    p=d+'/'+f; s=open(p,encoding='utf-8').read()
    for a,b in pairs:
        c=s.count(a); assert c==1,(f,a[:90],c); s=s.replace(a,b)
    open(p,'w',encoding='utf-8').write(s)
patch('Office.html',[
# shell sign-out: one ask covering saves in flight + kept refused saves; .go = the plain sign-out
("    if(qeBusyN())return askDlg('Sign out now?','A quote save is still being sent. Signing out now can lose your last changes.','Sign out',true,function(){return Promise.resolve();},go);go();};",
 "    if(qeRiskN())return askDlg('Sign out now?',qeRiskTxt()+' Signing out now loses them.','Sign out',true,function(){return Promise.resolve();},go);go();};\n  document.getElementById('out').onclick.go=go;"),
("  document.getElementById('out').onclick=function(){var go=function(){",
 "  document.getElementById('out').onclick=function(){var go=document.getElementById('out').onclick.go;go();};\n  document.getElementById('out').onclick=function(){var go=function(){"),
("window.addEventListener('beforeunload',function(e){if(QE.dirty&&document.getElementById('qe')||qeBusyN()){e.preventDefault();e.returnValue='';}});",
 "window.addEventListener('beforeunload',function(e){if(QE.dirty&&document.getElementById('qe')||qeRiskN()){e.preventDefault();e.returnValue='';}}); /* CR: also kept (refused) saves */"),
("function qeBusyN(){return Object.keys(QB.jobs).length;}",
 "function qeBusyN(){return Object.keys(QB.jobs).length;}\nfunction qeRiskN(){return qeBusyN()+Object.keys(QB.lost).length;} /* CR: saves in flight + refused saves kept for the person */\n"
 "function qeRiskTxt(){var b=qeBusyN(),l=Object.keys(QB.lost).length;return (b?'A quote save is still being sent.':'')+(b&&l?' ':'')+(l?l+' quote change'+(l===1?' was':'s were')+' not saved (see Quotes).':'');}"),
])
s=open(d+'/Office.html',encoding='utf-8').read()
# remove the helper line I inserted above by mistake-proofing: keep only one onclick assignment (the real one)
bad="  document.getElementById('out').onclick=function(){var go=document.getElementById('out').onclick.go;go();};\n"
assert s.count(bad)==1; s=s.replace(bad,'')
open(d+'/Office.html','w',encoding='utf-8').write(s)
patch('Office.html',[
# qeShell: one confirmation; dirty cleared only when sign-out really goes ahead (CR major)
("  if(out0)out.onclick=function(){if(!QE.dirty)return out0.call(out);askDlg('Sign out without saving?','Your changes to '+(no?esc(no):'this new quote')+' are not saved yet.','Sign out',true,function(){return Promise.resolve();},function(){QE.dirty=false;out0.call(out);});};",
 "  if(out0)out.onclick=function(){if(!QE.dirty&&!qeRiskN())return out0.call(out);\n    askDlg('Sign out without saving?',(QE.dirty?'Your changes to '+(no?esc(no):'this new quote')+' are not saved yet. ':'')+esc(qeRiskTxt()),'Sign out',true,function(){return Promise.resolve();},function(){QE.dirty=false;(out0.go||out0).call(out);});}; /* CR: one ask; dirty cleared only when it goes ahead */"),
# CR minor: never send on an unconfirmed version
("function qeSend(J,s){\n  var d=s.d,ep=QB.ep,pk=J.no?'':'p'+J.id;J.busy=true;QB.jobs[J.id]=J;if(J.no){d.no=J.no;d.ev=J.ev;}\n  if(pk){QB.pend[pk]={cust:s.cust,project:s.project,type:s.type};quotesDraw();}\n  call('officeQuoteSave',S.token,d).then(function(r){",
 "function qeSend(J,s){\n  var d=s.d,ep=QB.ep,pk=J.no?'':'p'+J.id;J.busy=true;QB.jobs[J.id]=J;\n  var fail=function(m){\n    if(ep!==QB.ep)return;if(pk){delete QB.pend[pk];quotesDraw();}\n    var n=J.next||s,here=QE.job===J&&!!document.getElementById('qe'),no=J.no||d.no,k=code(m).split('|')[0];J.next=null;J.busy=false;J.pdf=J.made=J.chg=false;delete QB.jobs[J.id];\n    if(srvGate(m)){toast((no||'The new quote')+' was not saved — sign in and enter the changes again.');return;} /* review M3 */\n    if(k==='QLOCKED'){if(here){QE.dirty=false;QE.job=null;viewQuote(no);}toast(no+' is locked now — nothing saved.');qeWake(J);return;}\n    if(here){QE.dirty=true;qeErr(m,no,false);qeWake(J);return;}\n    if(qeFree()){qeReopen(J,n);qeErr(m,no,true);return;}\n    qePark(J,n,m);qeWake(J); /* review H1: the person is busy on another form: keep this one for them */\n  };\n  if(J.no&&typeof J.ev!=='number'){setTimeout(function(){fail('NOEV');},0);return;} /* CR: the last answer had no version: never send on an unconfirmed one */\n  d.no=J.no||d.no;if(J.no)d.ev=J.ev;\n  if(pk){QB.pend[pk]={cust:s.cust,project:s.project,type:s.type};quotesDraw();}\n  call('officeQuoteSave',S.token,d).then(function(r){"),
("J.no=no;if(typeof r.ev==='number')J.ev=r.ev;", "J.no=no;J.ev=typeof r.ev==='number'?r.ev:null;"),
("  },function(m){\n    if(ep!==QB.ep)return;if(pk){delete QB.pend[pk];quotesDraw();}\n    var n=J.next||s,here=QE.job===J&&!!document.getElementById('qe'),no=J.no||d.no,k=code(m).split('|')[0];J.next=null;J.busy=false;J.pdf=J.made=J.chg=false;delete QB.jobs[J.id];\n    if(srvGate(m)){toast((no||'The new quote')+' was not saved — sign in and enter the changes again.');return;} /* review M3 */\n    if(k==='QLOCKED'){if(here){QE.dirty=false;QE.job=null;viewQuote(no);}toast(no+' is locked now — nothing saved.');qeWake(J);return;}\n    if(here){QE.dirty=true;qeErr(m,no,false);qeWake(J);return;}\n    if(qeFree()){qeReopen(J,n);qeErr(m,no,true);return;}\n    qePark(J,n,m);qeWake(J); /* review H1: the person is busy on another form: keep this one for them */\n  });",
 "  },fail);"),
# NOEV message + reasons in plain words
("  if(k==='STALE'){box.innerHTML='<div class=\"msg warn\">'+ic('alert')+'<div>Someone changed '+esc(no)+' a moment ago — nothing saved. <button type=\"button\" class=\"btn btn-ghost btn-sm\" id=\"qereload\">Open the latest</button></div></div>';",
 "  if(k==='STALE'||k==='NOEV'){box.innerHTML='<div class=\"msg warn\">'+ic('alert')+'<div>'+(k==='NOEV'?esc(no)+' was saved, but your newest changes were not sent: the saved version could not be confirmed. Open the latest and enter them again.':'Someone changed '+esc(no)+' a moment ago — nothing saved.')+' <button type=\"button\" class=\"btn btn-ghost btn-sm\" id=\"qereload\">Open the latest</button></div></div>';"),
("  toast((J.no||'The new quote')+' was not saved ('+code(m).split('|')[0].toLowerCase()+') — your changes are kept: open it from Quotes.');}",
 "  var k=code(m).split('|')[0],why={STALE:'changed by someone meanwhile',NOEV:'version not confirmed',BUSY:'the system was busy'}[k]||k.toLowerCase();\n  toast((J.no||'The new quote')+' was not saved ('+why+') — your changes are kept: open it from Quotes.');}"),
])
print('ok')
