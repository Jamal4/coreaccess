import sys
d=sys.argv[1]
def patch(f,pairs):
    p=d+'/'+f; s=open(p,encoding='utf-8').read()
    for a,b in pairs:
        c=s.count(a); assert c==1,(f,a[:70],c); s=s.replace(a,b)
    open(p,'w',encoding='utf-8').write(s)
patch('CAE_Ops_Office.gs',[
("function OW4gShadow_(db) { this.b = db; this.h = {}; this.t = {}; this.ow4gL_ = uiLists_(db); }",
 "function OW4gShadow_(db) { this.b = db; this.h = {}; this.t = {}; this.nt = {}; this.ow4gL_ = uiLists_(db); }"),
("  OW4gShadow_.prototype.insert = function (t, objs) { this.rows(t); return MemDb.prototype.insert.call(this, t, objs); };\n  OW4gShadow_.prototype.ensureTab = function (t, headers) { if (this.hasTab(t)) return false; this.h[t] = headers.slice(); this.t[t] = []; return true; };",
 "  OW4gShadow_.prototype.insert = function (t, objs) { if (t === 'Log' && !this.nt.Log) return objs; this.rows(t); return MemDb.prototype.insert.call(this, t, objs); }; // review M5: a Log row is not compared -> the Log tab is never read\n  OW4gShadow_.prototype.ensureTab = function (t, headers) { if (this.hasTab(t)) return false; this.h[t] = headers.slice(); this.t[t] = []; this.nt[t] = 1; return true; };"),
("      if (!db.hasTab(t)) return false;\n", "      if (sh.nt[t]) return false; // a new tab (the shadow read every other one from the batch)\n"),
])
patch('Office.html',[
# sign-out: ask while a save is still being sent
("  document.getElementById('out').onclick=function(){var t=S.token,all;S={token:null,user:null};all=tokClear();if(t&&all.indexOf(t)<0)all.push(t);tokEnd(all);viewLogin('<div class=\"msg ok\">'+ic('alert')+'<div>You are signed out.</div></div>');};",
 "  document.getElementById('out').onclick=function(){var go=function(){var t=S.token,all;S={token:null,user:null};all=tokClear();if(t&&all.indexOf(t)<0)all.push(t);tokEnd(all);viewLogin('<div class=\"msg ok\">'+ic('alert')+'<div>You are signed out.</div></div>');};\n    if(qeBusyN())return askDlg('Sign out now?','A quote save is still being sent. Signing out now can lose your last changes.','Sign out',true,function(){return Promise.resolve();},go);go();};"),
("window.addEventListener('beforeunload',function(e){if(QE.dirty&&document.getElementById('qe')){e.preventDefault();e.returnValue='';}});",
 "window.addEventListener('beforeunload',function(e){if(QE.dirty&&document.getElementById('qe')||qeBusyN()){e.preventDefault();e.returnValue='';}});"),
("QE.job=null;QB.ep++;QB.pend={};qePickClose();}", "QE.job=null;QB.ep++;QB.pend={};QB.jobs={};QB.lost={};qePickClose();}"),
("var QB={ep:0,n:0,pend:{}}; /* W4g: background saves (ep = sign-in epoch; pend = new quotes still being saved, shown in the list) */",
 "var QB={ep:0,n:0,pend:{},jobs:{},lost:{}}; /* W4g: background saves (ep = sign-in epoch; pend = new quotes still being saved; jobs = saves in flight; lost = refused saves kept for the person, shown in the list) */\nfunction qeBusyN(){return Object.keys(QB.jobs).length;}"),
# list click: a kept (refused) save opens its form
("    var no=b.getAttribute('data-q'),ok=QS.rows.some(function(r){return r.no===no;});if(ok)viewQuote(no);};",
 "    var lk=b.getAttribute('data-lost');if(lk&&QB.lost[lk]){qeUnpark(lk);return;}\n    var no=b.getAttribute('data-q'),ok=QS.rows.some(function(r){return r.no===no;});if(ok)viewQuote(no);};"),
# opening a quote whose save runs / was refused
("  QE.d=null;QE.q=null;QE.dirty=false;QE.job=null;qePickClose();qeShell(no);\n  var my=++QE.seq;QE.saving=false;\n",
 "  if(no&&QB.lost[no])return qeUnpark(no); /* its last save was refused: the person's data + the reason */\n  QE.d=null;QE.q=null;QE.dirty=false;QE.job=null;qePickClose();qeShell(no);\n  var my=++QE.seq;QE.saving=false;\n  var bj=no?qeJobOf(no):null;if(bj){bj.wait=function(){if(my===QE.seq&&document.getElementById('qe')&&!QE.q)viewQuoteEdit(no);};return;} /* review M4: its save is still running: open it when that lands */\n"),
# pending + kept rows
("function qePendHtml(){return Object.keys(QB.pend).map(function(k){var p=QB.pend[k];",
 "function qeJobOf(no){var o=null;Object.keys(QB.jobs).forEach(function(k){if(QB.jobs[k].no===no)o=QB.jobs[k];});return o;}\nfunction qePendHtml(){return Object.keys(QB.lost).map(function(k){var x=QB.lost[k],s=x.s;\n  return '<button type=\"button\" class=\"qcard\" data-lost=\"'+esc(k)+'\"><div class=\"qrow\"><span class=\"qno\">'+ic('alert')+' '+esc(x.J.no||'New quote')+' — not saved</span><span class=\"sp\"></span>'+(s.type?'<span class=\"pill ty\">'+esc(s.type)+'</span>':'')+'</div>'+\n    '<div class=\"qc\">'+esc(s.cust)+'</div><div class=\"qp\">Open to see why and save again</div></button>';}).join('')+Object.keys(QB.pend).map(function(k){var p=QB.pend[k];"),
# send: bookkeeping
("  var d=s.d,ep=QB.ep,pk=J.no?'':'p'+J.id;J.busy=true;if(J.no){d.no=J.no;d.ev=J.ev;}",
 "  var d=s.d,ep=QB.ep,pk=J.no?'':'p'+J.id;J.busy=true;QB.jobs[J.id]=J;if(J.no){d.no=J.no;d.ev=J.ev;}"),
("    if(here&&QE.q){QE.q.no=no;QE.q.ev=J.ev;QE.q.rev=+r.rev||0;QE.q.status=String(r.status||QE.q.status);}\n    if(J.next){var n=J.next;J.next=null;qeSend(J,n);return;}\n    J.busy=false;var pdf=J.pdf;J.pdf=false;\n    toast((d.no?'Saved '+no+(r.rev?' · Rev '+r.rev:''):'Quote '+no+' saved as Draft')+(r.changed===false?' (nothing changed)':pdf?' — making the PDF…':'.'));\n    if(QS.pdfBg)delete QS.pdfBg[no];\n    if(here&&!QE.dirty){QE.job=null;viewQuote(no,r.view);}",
 "    if(here&&QE.q){QE.q.no=no;QE.q.ev=J.ev;QE.q.rev=+r.rev||0;QE.q.status=String(r.status||QE.q.status);}\n    if(!d.no)J.made=true;if(r.changed!==false)J.chg=true;\n    if(J.next){var n=J.next;J.next=null;qeSend(J,n);return;}\n    J.busy=false;delete QB.jobs[J.id];var pdf=J.pdf,made=J.made,chg=J.chg;J.pdf=J.made=J.chg=false;\n    toast((made?'Quote '+no+' saved as Draft':'Saved '+no+(r.rev?' · Rev '+r.rev:''))+(!chg?' (nothing changed)':pdf?' — making the PDF…':'.'));\n    if(QS.pdfBg)delete QS.pdfBg[no];\n    qeWake(J);\n    if(here&&!QE.dirty&&!document.getElementById('dlg')){QE.job=null;viewQuote(no,r.view);} /* review L8: an open dialog stays */"),
("    var n=J.next,here=QE.job===J&&!!document.getElementById('qe');J.next=null;J.busy=false;J.pdf=false;\n    if(srvGate(m))return;\n    if(here)QE.dirty=true;else qeReopen(J,n||s);\n    qeErr(m,J.no||d.no,!here);\n",
 "    var n=J.next||s,here=QE.job===J&&!!document.getElementById('qe'),no=J.no||d.no,k=code(m).split('|')[0];J.next=null;J.busy=false;J.pdf=J.made=J.chg=false;delete QB.jobs[J.id];\n    if(srvGate(m)){toast((no||'The new quote')+' was not saved — sign in and enter the changes again.');return;} /* review M3 */\n    if(k==='QLOCKED'){if(here){QE.dirty=false;QE.job=null;viewQuote(no);}toast(no+' is locked now — nothing saved.');qeWake(J);return;}\n    if(here){QE.dirty=true;qeErr(m,no,false);qeWake(J);return;}\n    if(qeFree()){qeReopen(J,n);qeErr(m,no,true);return;}\n    qePark(J,n,m);qeWake(J); /* review H1: the person is busy on another form: keep this one for them */\n"),
# helpers
("/* the form again with the data of a refused background save (the person had left it) */",
 "function qeWake(J){if(J.wait){var f=J.wait;J.wait=null;setTimeout(f,0);}}\n/* a refused save can take over the screen only when nothing unsaved / in flight / no dialog is there */\nfunction qeFree(){return !document.getElementById('dlg')&&!(document.getElementById('qe')&&(QE.dirty||(QE.job&&QE.job.busy)));}\nfunction qePark(J,s,m){var k=J.no||'p'+J.id;QB.lost[k]={J:J,s:s,m:m};quotesDraw();\n  toast((J.no||'The new quote')+' was not saved ('+code(m).split('|')[0].toLowerCase()+') — your changes are kept: open it from Quotes.');}\nfunction qeUnpark(k){var x=QB.lost[k];delete QB.lost[k];qeReopen(x.J,x.s);qeErr(x.m,x.J.no||x.s.d.no,false);}\n/* the form again with the data of a refused background save (the person had left it) */"),
])
print('ok')
