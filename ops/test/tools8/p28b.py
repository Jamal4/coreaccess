# r28 page: F1 job-or-quote pick, F2 material source + vendor (pick / new). Run from ops/: python3 test/tools8/p28b.py
import sys
f = 'Office.html'; s = open(f, encoding='utf-8').read()
P = [
 ("dn:cuS(c.dn),by:cuS(c.by)}", "dn:cuS(c.dn),by:cuS(c.by),quote:cuS(c.quote),src:cuS(c.src)}"),
 ("  o.sups=cuArr(r.sups)",
  "  o.quotes=cuArr(r.quotes).map(function(q){q=chObj(q);return {no:cuS(q.no),cust:cuS(q.cust),siteName:cuS(q.siteName),type:cuS(q.type),st:cuS(q.st)};}).filter(function(q){return q.no;});\n  o.sups=cuArr(r.sups)"),
 ("function chJob(n){var a=CH.d?CH.d.jobs:[];for(var i=0;i<a.length;i++)if(a[i].no===n)return a[i];return null;}",
  "function chJob(n){var a=CH.d?CH.d.jobs:[];for(var i=0;i<a.length;i++)if(a[i].no===n)return a[i];return null;}\nfunction chQuote(n){var a=CH.d&&CH.d.quotes||[];for(var i=0;i<a.length;i++)if(a[i].no===n)return a[i];return null;}"),
 ("{no:c0.no,ev:c0.ev,kind:kind,job:c0.job,from:", "{no:c0.no,ev:c0.ev,kind:kind,job:c0.job,quote:c0.job?'':c0.quote,src:c0.src,from:"),
 (":{kind:kind,job:'',from:", ":{kind:kind,job:'',quote:'',src:'',from:"),
 ("  var oj=D.jobs.filter(function(j){return kind==='Sale'?j.type==='Sale':j.type!=='Sale';});",
  "  var oj=D.jobs.filter(function(j){return kind==='Sale'?j.type==='Sale':j.type!=='Sale';}),isD=kind==='Delivery';\n"
  "  var oq=D.quotes.filter(function(q){return kind==='Sale'?q.type==='Sale':q.type!=='Sale';});\n"
  "  var vo=[{v:'',t:'— pick the vendor —'}].concat(D.sups.filter(function(s){return !s.off;}).map(function(s){return {v:s.id,t:s.name+' · '+s.id};})).concat([{v:'__new',t:'+ New vendor…'}]);"),
 ("chSel('cej','Job',[{v:'',t:'— pick an open job —'}].concat(oj.map(function(j){return {v:j.no,t:j.no+' · '+j.cust+' · '+j.type};})),c.job,",
  "chSel('cej','Job / quote',[{v:'',t:'— pick an open job or a quote —'}].concat(oj.map(function(j){return {v:j.no,t:j.no+' · '+j.cust+' · '+j.type+(j.ref?' · PO/WO '+j.ref:'')};}),oq.map(function(q){return {v:'Q:'+q.no,t:q.no+' · '+q.cust+' · quote, no PO yet'};})),c.job||(c.quote?'Q:'+c.quote:''),"),
 ("  h+='<div class=\"ch-f3\">';\n",
  "  if(isD)h+='<div class=\"f2\">'+chSel('cesrc','Material source',[{v:'',t:'Own stock (default)'},{v:'Vendor',t:'Vendor rental (not our stock)'}],c.src,'Vendor rental: no stock moves; the vendor prints on the challan for the rent owed.')+'<div id=\"cevw\">'+chSel('cevd','Vendor',vo,c.src?c.sup:'')+'</div></div>'+\n"
  "    '<div id=\"cevn\"><div class=\"f2\">'+chFld('cevnn','New vendor name','','e.g. Dhaka Scaffold Rental')+chFld('cevnp','Vendor phone','','e.g. 01700-000000')+'</div><div class=\"f2\">'+chFld('cevna','Vendor address','','')+'</div></div>'+\n"
  "    '<div class=\"f2\" id=\"cevx\">'+chFld('cevr','Vendor\\'s challan / DO no.',c.src?c.sref:'','e.g. VDO-1021','text','optional')+'</div>';\n"
  "  h+='<div class=\"ch-f3\">';\n"),
 ("var j=chJob(g('cej'));t.value=j?(kind==='Sale'?'Sold (leaves stock)':(j.site||'site')+(j.siteName?' · '+j.siteName:'')):'';",
  "var v=g('cej'),j=chJob(v),q=!j&&v.indexOf('Q:')===0?chQuote(v.slice(2)):null;t.value=j?(kind==='Sale'?'Sold (leaves stock)':(j.site||'site')+(j.siteName?' · '+j.siteName:'')):q?(kind==='Sale'?'Sold (leaves stock)':'site of '+q.no+(q.siteName?' · '+q.siteName:'')):'';"),
 ("  var fromV=function(){return isH?D.SUP:g('cef');};",
  "  var isV=function(){return isD&&g('cesrc')==='Vendor';},fromV=function(){return isH?D.SUP:isV()?'':g('cef');};"),
 ("var supShow=function(){document.getElementById('cesw')",
  "var supShow=function(){var V=isV(),f=document.getElementById('cef'),sh=function(i,on){var e=document.getElementById(i);if(e)e.style.display=on?'':'none';};sh('cevw',V);sh('cevx',V);sh('cevn',V&&g('cevd')==='__new');if(f)f.parentNode.style.display=V?'none':'';document.getElementById('cesw')"),
 ("var one=function(k){var n=need[k]||0;if(isH)", "var one=function(k){var n=need[k]||0;if(isV())return esc(k)+' '+stQ(n)+' · <i>vendor rental — not our stock</i>';if(isH)"),
 ("var e;if((e=document.getElementById('cef')))e.onchange=info;document.getElementById('cesu').onchange=info;",
  "var e;if((e=document.getElementById('cef')))e.onchange=info;document.getElementById('cesu').onchange=info;if((e=document.getElementById('cesrc')))e.onchange=info;if((e=document.getElementById('cevd')))e.onchange=info;"),
 ("    if(!yk&&!g('cej'))return chMsg('cem','Pick the job.');",
  "    if(!yk&&!g('cej'))return chMsg('cem','Pick the job or quote.');\n"
  "    if(isV()){if(!g('cevd'))return chMsg('cem','Pick the vendor (or + New vendor).');if(g('cevd')==='__new'&&(!g('cevnn')||!g('cevnp')||!g('cevna')))return chMsg('cem','New vendor: name, phone and address are needed.');}"),
 ("c.notes=g('cen');\n    c.lines=rs.map(function(r){return {it:r.it,q:+r.q};});",
  "c.notes=g('cen');\n"
  "    var jv=g('cej');if(!yk&&jv.indexOf('Q:')===0){c.job='';c.quote=jv.slice(2);}else c.quote='';c.src='';c.newSup=null;\n"
  "    if(isV()){var vd=g('cevd');c.src='Vendor';c.sup=vd==='__new'?'':vd;c.newSup=vd==='__new'?{name:g('cevnn'),phone:g('cevnp'),addr:g('cevna')}:null;c.sref=g('cevr');}\n"
  "    c.lines=rs.map(function(r){return {it:r.it,q:+r.q};});"),
 ("  if(c.no){p.no=c.no;p.ev=c.ev;}\n  busyBtn(btn,true,'Saving…');",
  "  if(c.quote)p.quote=c.quote;if(c.src){p.src=c.src;if(c.newSup)p.newSup=c.newSup;}\n  if(c.no){p.no=c.no;p.ev=c.ev;}\n  busyBtn(btn,true,'Saving…');"),
 ("+(direct?'<span class=\"pill ch-rent\">rented · direct from supplier</span>':'')",
  "+(c.src==='Vendor'?'<span class=\"pill ch-rent\">vendor rental · not our stock</span>':direct?'<span class=\"pill ch-rent\">rented · direct from supplier</span>':'')"),
 ("['Supplier',c.sup?esc((c.supName||c.sup)+' · '+c.sup):''],['Supplier\\'s DO / ref',c.sup?esc(c.sref||'—'):'']",
  "[c.src==='Vendor'?'Vendor (rent payable)':'Supplier',c.sup?esc((c.supName||c.sup)+' · '+c.sup):''],[c.src==='Vendor'?'Vendor\\'s DO / ref':'Supplier\\'s DO / ref',c.sup?esc(c.sref||'—'):'']"),
 ("  if(c.job)h+='<div class=\"box\"><h4>Job</h4>'+chKv([['Job',esc(c.job)],",
  "  if(!c.job&&c.quote)h+='<div class=\"box\"><h4>Quote</h4>'+chKv([['Quote',esc(c.quote)],['Customer',esc(c.cust)],['Site',esc(c.to)+(c.siteName?' · '+esc(c.siteName):'')],['PO / WO ref','— none yet (the job is made at Post)']])+'</div>';\n"
  "  if(c.job)h+='<div class=\"box\"><h4>Job</h4>'+chKv([['Job',esc(c.job)],['Quote',esc(c.quote||'—')],"),
]
for a, b in P:
    n = s.count(a)
    if n != 1: sys.exit('%d matches for %r' % (n, a[:90]))
    s = s.replace(a, b)
open(f, 'w', encoding='utf-8').write(s); print('page ok')
