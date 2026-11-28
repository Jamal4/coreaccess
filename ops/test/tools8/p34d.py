#!/usr/bin/env python3
# r34 (F5) part 4: Office.html — picker shows quote nos (+ find), no Hire-in / Off-hire / direct-from-supplier for new challans,
# own / outside wording (Post never refused for stock), vendor Return
import sys, os
D = sys.argv[1] if len(sys.argv) > 1 else '..'
def ed(f, pairs):
    p = os.path.join(D, f); s = open(p, encoding='utf-8').read()
    for a, b in pairs:
        n = s.count(a); assert n == 1, (f, n, a[:90]); s = s.replace(a, b)
    open(p, 'w', encoding='utf-8').write(s)
ed('Office.html', [
(".ch-src{font-size:12px;color:#a3e635}.ch-src.own{color:var(--muted)}.ch-neg{color:#fb7185}",
 ".ch-src{font-size:12px;color:#a3e635}.ch-src.own{color:var(--muted)}.ch-neg{color:#fb7185}.ch-out{color:#fbbf24}"),
("var CH_YK=['Transfer','Hire-in','Off-hire'],CH_NO=/^CAE\\/DC\\/20\\d\\d\\/\\d{3,6}$/;",
 "var CH_YK=['Transfer','Hire-in','Off-hire'],CH_NEWK=['Delivery','Sale','Return','Transfer'],CH_NO=/^CAE\\/DC\\/20\\d\\d\\/\\d{3,6}$/; /* r34 F5: Hire-in / Off-hire are no longer made (old ones stay listed) */"),
("type:cuS(j.type),ref:cuS(j.ref),st:cuS(j.st)};}).filter(function(j){return j.no;});",
 "type:cuS(j.type),ref:cuS(j.ref),st:cuS(j.st),quote:cuS(j.quote)};}).filter(function(j){return j.no;});"),
("type:cuS(q.type),st:cuS(q.st)};}).filter(function(q){return q.no;});",
 "type:cuS(q.type),st:cuS(q.st),job:cuS(q.job)};}).filter(function(q){return q.no;});o.vout=chObj(r.vout);"),
("o.canEdit=r.canEdit===true;o.canPost=r.canPost===true;",
 "o.out=chObj(r.out);o.canEdit=r.canEdit===true;o.canPost=r.canPost===true;"),
("function chTitle(){return CH.tile==='dos'?'Projects & sites · Delivery orders':CH.tile==='returns'?'Projects & sites · Returns':'Yard · Transfers & rent-in';}",
 "function chTitle(){return CH.tile==='dos'?'Projects & sites · Delivery orders':CH.tile==='returns'?'Projects & sites · Returns':'Yard · Transfers';}"),
("function chRoute(c){if(c.kind==='Return')return esc(c.from)+' → '+esc(c.to)+' / repair / lost';",
 "function chRoute(c){if(c.kind==='Return')return c.src==='Vendor'?esc(c.from)+' → vendor '+esc(c.supName||c.sup):esc(c.from)+' → '+esc(c.to)+' / repair / lost';"),
("  n.innerHTML=ks.filter(chCanNew).map(",
 "  n.innerHTML=ks.filter(function(k){return CH_NEWK.indexOf(k)>=0&&chCanNew(k);}).map("),
("  var R=CH.d.rent;if(!R.length)return '<div class=\"box\" style=\"margin-bottom:12px\"><h4>Rented in now</h4><div class=\"tag\">Nothing rented in.</div></div>';",
 "  var R=CH.d.rent;if(!R.length)return ''; /* r34 F5: rented-in stock only from old Hire-in challans */"),
("    if(!t)return true;return (c.no+' '+c.job+' '+c.cust+' '+c.veh+' '+c.supName+' '+c.sup+' '+c.sref+' '+c.from+' '+c.to).toLowerCase().indexOf(t)>=0;});",
 "    if(!t)return true;return (c.no+' '+c.job+' '+c.quote+' '+c.cust+' '+c.veh+' '+c.supName+' '+c.sup+' '+c.sref+' '+c.from+' '+c.to).toLowerCase().indexOf(t)>=0;});"),
# view: outside notes
("  var A=dr&&!isR&&!isH?chAlloc(c):null,showU=!!A&&!direct;",
 "  var A=dr&&!isR&&!isH&&c.src!=='Vendor'?chAlloc(c):null,showU=!!A&&!direct,OUT=c.kind==='Delivery'||c.kind==='Sale';"),
("(A&&A.short[k]?' <span class=\"ch-neg\">short '+stQ(A.short[k])+'</span>':'');}).join(' · ')+'</span></div>';",
 "(A&&A.short[k]?' <span class=\"'+(OUT?'ch-out\">from outside ':'ch-neg\">short ')+stQ(A.short[k])+'</span>':'');}).join(' · ')+'</span></div>';"),
("    if(A&&Object.keys(A.short).length)h+='<div class=\"note ch-neg\">'+ic('alert')+'<span>'+(c.kind==='Sale'",
 "    if(A&&OUT&&Object.keys(A.short).length)h+='<div class=\"note\">'+ic('alert')+'<span class=\"ch-out\">More than our usable stock at '+esc(c.from)+': Post moves only what we have; the rest is from outside (not recorded in our stock) — '+Object.keys(A.short).map(function(k){return esc(k)+' '+stQ(A.short[k]);}).join(' · ')+'.</span></div>';\n"
 "    else if(A&&Object.keys(A.short).length)h+='<div class=\"note ch-neg\">'+ic('alert')+'<span>'+(c.kind==='Sale'"),
("  if(isR&&c.job){var hr=chObj(CH.d.hire[c.job]),lf=Object.keys(hr);",
 "  var ok=Object.keys(c.out).filter(function(k){return chN(c.out[k])>0;});if(!dr&&ok.length)h+='<div class=\"note\">'+ic('alert')+'<span class=\"ch-out\"><b>From outside</b> (not our stock, no stock moves; still on hire for billing): '+ok.sort().map(function(k){return esc(k)+' '+stQ(c.out[k]);}).join(' · ')+'</span></div>';\n"
 "  if(isR&&c.job&&c.src!=='Vendor'){var hr=chObj(CH.d.hire[c.job]),lf=Object.keys(hr);"),
# editor
("kind==='Sale'?'Sale jobs only, from our own stock (rented items can\\'t be sold).':'Open jobs only. From the yard takes own stock first, then rented; or pick “Direct from a rental supplier”.';",
 "kind==='Sale'?'Sale jobs or quotes, from our own stock; qty above it is from outside (not recorded).':'Open jobs or quotes (no PO needed). From the yard: own stock first; qty above our stock is from outside (not recorded). Vendor items: Material source.';"),
("  if(!yk)h+='<div class=\"f2\">'+chSel('cej','Job / quote',[{v:'',t:'— pick an open job or a quote —'}].concat(oj.map(function(j){return {v:j.no,t:j.no+' · '+j.cust+' · '+j.type+(j.ref?' · PO/WO '+j.ref:'')};}),oq.map(function(q){return {v:'Q:'+q.no,t:q.no+' · '+q.cust+' · quote, no PO yet'};})),c.job||(c.quote?'Q:'+c.quote:''),kind==='Sale'?'Goods leave stock (sold).':'Sale jobs use “New sale”.')+chFld('cet','To (job site)','','picked from the job','text','',true)+'</div>';",
 "  var jopts=[{v:'',t:'— pick an open job or a quote —'}].concat(oj.map(function(j){return {v:j.no,t:j.no+(j.quote?' · '+j.quote:'')+' · '+j.cust+' · '+j.type+(j.ref?' · PO/WO '+j.ref:'')};}),oq.filter(function(q){return !q.job;}).map(function(q){return {v:'Q:'+q.no,t:q.no+' · '+q.cust+' · quote, no job yet'};})); /* r34 F5-a: a quote with a job shows on its job */\n"
 "  if(!yk)h+='<div class=\"f2\">'+chFld('cejf','Find job / quote','','job no., quote no. or customer','search')+'<span></span></div><div class=\"f2\">'+chSel('cej','Job / quote',jopts,c.job||(c.quote?'Q:'+c.quote:''),kind==='Sale'?'Goods leave stock (sold).':'Sale jobs use “New sale”.')+chFld('cet','To (job site)','','picked from the job','text','',true)+'</div>';"),
("  if(isH)h+=chSel('ceto','Received into',yl,c.to);else h+=chSel('cef','From',kind==='Delivery'?yl.concat([{v:D.SUP,t:'Direct from a rental supplier → site'}]):yl,c.from);",
 "  if(isH)h+=chSel('ceto','Received into',yl,c.to);else h+=chSel('cef','From',yl,c.from); /* r34 F5-b: no direct-from-supplier (Material source: Vendor rental) */"),
("        return (u<n-1e-9?'<span class=\"ch-neg\">'+esc(k)+' need '+stQ(n)+', usable '+stQ(u)+'</span>':",
 "        return (u<n-1e-9?(kind==='Delivery'||kind==='Sale'?'<span class=\"ch-out\">'+esc(k)+' need '+stQ(n)+' · '+stQ(Math.max(0,u))+' from our stock, '+stQ(n-Math.max(0,u))+' from outside</span>':'<span class=\"ch-neg\">'+esc(k)+' need '+stQ(n)+', usable '+stQ(u)+'</span>'):"),
("(isH?'A set can be received as a set (it becomes its parts). No stock check — it\\'s coming in.':'Sets expand into parts; stock is checked on the parts. Short lines show in red and can still be saved as a draft.')",
 "(isH?'A set can be received as a set (it becomes its parts). No stock check — it\\'s coming in.':kind==='Delivery'||kind==='Sale'?'Sets expand into parts. Post is never refused for stock: it moves what we have, the rest is from outside (no stock moves; still on hire for billing).':'Sets expand into parts; stock is checked on the parts. Short lines show in red and can still be saved as a draft.')"),
("if((e=document.getElementById('cej')))e.onchange=jobTo;",
 "if((e=document.getElementById('cej')))e.onchange=jobTo;\n"
 "  if((e=document.getElementById('cejf')))e.oninput=function(){var t=this.value.trim().toLowerCase(),s=document.getElementById('cej'),cur=s.value;s.innerHTML=jopts.filter(function(o,i){return !i||o.v===cur||!t||(o.v+' '+o.t).toLowerCase().indexOf(t)>=0;}).map(function(o){return '<option value=\"'+esc(o.v)+'\"'+(o.v===cur?' selected':'')+'>'+esc(o.t)+'</option>';}).join('');jobTo();};"),
# Return: material source + vendor
("  var isNew=!c0,c=c0?{no:c0.no,ev:c0.ev,kind:'Return',job:c0.job,to:c0.to||'LOC-YARD',d:c0.d,veh:c0.veh,notes:c0.notes,lines:c0.lines.slice()}:{kind:'Return',job:'',to:'LOC-YARD',d:D.today,veh:'',notes:'',lines:[]};\n  var jobs=D.jobs.filter(function(j){return Object.keys(chObj(D.hire[j.no])).length||j.no===c.job;}),",
 "  var isNew=!c0,c=c0?{no:c0.no,ev:c0.ev,kind:'Return',job:c0.job,to:c0.src==='Vendor'?'LOC-YARD':c0.to||'LOC-YARD',src:c0.src,sup:c0.src==='Vendor'?c0.sup:'',sref:c0.src==='Vendor'?c0.sref:'',d:c0.d,veh:c0.veh,notes:c0.notes,lines:c0.lines.slice()}:{kind:'Return',job:'',to:'LOC-YARD',src:'',sup:'',sref:'',d:D.today,veh:'',notes:'',lines:[]};\n  var jobs=D.jobs.filter(function(j){return Object.keys(chObj(D.hire[j.no])).length||Object.keys(chObj(D.vout[j.no])).length||j.no===c.job;}),"),
("'<div class=\"f2\">'+chFld('crv','Vehicle no.',c.veh,'e.g. DM-TA 11-4821')+chFld('crn','Note (prints on the challan)',c.notes,'optional')+'</div></div>'+",
 "'<div class=\"f2\">'+chSel('crsrc','Material source',[{v:'',t:'Own stock (default)'},{v:'Vendor',t:'Vendor rental (back to the vendor)'}],c.src||'','Vendor rental: no stock moves; the vendor\\'s items go back to them.')+'<div id=\"crvw\">'+chSel('crvd','Vendor',[{v:'',t:'— pick the vendor —'}],c.sup)+'</div></div><div class=\"f2\" id=\"crvx\">'+chFld('crvr','Vendor\\'s DO / ref',c.sref,'e.g. VRN-221','text','optional')+'<span></span></div>'+\n"
 "    '<div class=\"f2\">'+chFld('crv','Vehicle no.',c.veh,'e.g. DM-TA 11-4821')+chFld('crn','Note (prints on the challan)',c.notes,'optional')+'</div></div>'+"),
("  function load(){var jn=document.getElementById('crj').value;if(!jn){rl.innerHTML='<div class=\"tag\">Pick a job to load its on-hire items.</div>';return;}\n    var hire=chObj(D.hire[jn]),hp=chObj(D.hpool[jn]),pre={};",
 "  var isVr=function(){return document.getElementById('crsrc').value==='Vendor';};\n"
 "  function vend(){var jn=document.getElementById('crj').value,s=document.getElementById('crvd'),cur=s.value||c.sup,vo=chObj(D.vout[jn]),ids=Object.keys(vo).sort();if(c.sup&&ids.indexOf(c.sup)<0&&jn===c.job)ids.push(c.sup);\n"
 "    s.innerHTML='<option value=\"\">— pick the vendor —</option>'+ids.map(function(id){return '<option value=\"'+esc(id)+'\"'+(id===cur?' selected':'')+'>'+esc(chSup(id).name+' · '+id)+'</option>';}).join('');\n"
 "    var V=isVr();document.getElementById('crvw').style.display=V?'':'none';document.getElementById('crvx').style.display=V?'':'none';document.getElementById('crt').parentNode.style.display=V?'none':'';}\n"
 "  function load(){vend();var jn=document.getElementById('crj').value,V=isVr();if(!jn){rl.innerHTML='<div class=\"tag\">Pick a job to load its on-hire items.</div>';return;}\n"
 "    if(V&&!document.getElementById('crvd').value){rl.innerHTML='<div class=\"tag\">Pick the vendor to load their items out on this job.</div>';return;}\n"
 "    var hire=V?chObj(chObj(D.vout[jn])[document.getElementById('crvd').value]):chObj(D.hire[jn]),hp=V?{}:chObj(D.hpool[jn]),pre={};"),
("    if(!ks.length){rl.innerHTML='<div class=\"tag\">Nothing is on hire for this job.</div>';return;}",
 "    if(!ks.length){rl.innerHTML='<div class=\"tag\">'+(V?'None of this vendor\\'s items are out on this job.':'Nothing is on hire for this job.')+'</div>';return;}"),
("+(hp[k]?'<small>'+chSrc(hp[k])+'</small>':'')+'</td><td class=\"r\">'+stQ(o)+'</td>'+",
 "+(hp[k]?'<small>'+chSrc(hp[k])+(function(){var s=0;Object.keys(chObj(hp[k])).forEach(function(w){s+=chN(hp[k][w]);});return o-s>1e-9?' · <span class=\"ch-out\">outside '+stQ(o-s)+'</span>':'';})()+'</small>':'')+(V?'<small class=\"ch-src\">vendor rental</small>':'')+'</td><td class=\"r\">'+stQ(o)+'</td>'+"),
("  document.getElementById('crj').onchange=function(){c.lines=[];load();};load();",
 "  document.getElementById('crj').onchange=function(){c.lines=[];load();};document.getElementById('crsrc').onchange=function(){c.lines=[];load();};document.getElementById('crvd').onchange=function(){c.lines=[];load();};load();"),
("    if(bad)return chMsg('crm',bad);if(!ls.length)return chMsg('crm','Count at least one item.');",
 "    if(bad)return chMsg('crm',bad);if(!ls.length)return chMsg('crm','Count at least one item.');\n"
 "    c.src='';c.sup='';c.sref='';if(isVr()){if(!document.getElementById('crvd').value)return chMsg('crm','Pick the vendor.');c.src='Vendor';c.sup=document.getElementById('crvd').value;c.sref=document.getElementById('crvr').value.trim();}"),
])
print('p34d ok')
