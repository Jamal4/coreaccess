/* ======================= AC › supplier bills & payments (AC1, 28 Nov) ======================= */
/* No PDF, no paperwork: a vendor invoice (invoice / DO no. optional) is recorded as a bill linked to a job / quote / our PO; payments go against bills,
   or as a direct payment (no bill: a paid bill line is made with it). Cash is allowed for payments to suppliers only. */
var AC={d:null,seq:0,vs:0,tab:'bills',q:'',st:'open',sup:''};
function acNorm(r){r=chObj(r);var o={},c=chObj(r.can);o.can={bill:c.bill===true,pay:c.pay===true,head:c.head===true};o.today=isDay(r.today)?r.today:'';
  o.bills=cuArr(r.bills).map(function(b){b=chObj(b);return {id:cuS(b.id),sup:cuS(b.sup),inv:cuS(b.inv),dono:cuS(b.dono),d:isDay(b.d)?b.d:'',due:isDay(b.due)?b.due:'',po:cuS(b.po),job:cuS(b.job),quote:cuS(b.quote),
    amt:chN(b.amt),vat:chN(b.vat),tot:chN(b.tot),paid:chN(b.paid),bal:chN(b.bal),st:cuS(b.st)||'Unpaid',notes:cuS(b.notes),pv:cuS(b.pv),by:cuS(b.by),reason:cuS(b.reason),ev:typeof b.ev==='number'?b.ev:null};}).filter(function(b){return b.id;});
  o.pays=cuArr(r.pays).map(function(p){p=chObj(p);return {id:cuS(p.id),d:isDay(p.d)?p.d:'',sup:cuS(p.sup),method:cuS(p.method),ref:cuS(p.ref),bank:cuS(p.bank),amt:chN(p.amt),st:cuS(p.st),notes:cuS(p.notes),by:cuS(p.by),reason:cuS(p.reason),free:chN(p.free),
    al:cuArr(p.al).map(function(a){a=chObj(a);return {no:cuS(a.no),amt:chN(a.amt)};}).filter(function(a){return a.no;})};}).filter(function(p){return p.id;});
  o.sups=cuArr(r.sups).map(function(s){s=chObj(s);return {id:cuS(s.id),name:cuS(s.name)||cuS(s.id),phone:cuS(s.phone),owed:chN(s.owed),off:s.off===true};}).filter(function(s){return s.id;});
  o.jobs=cuArr(r.jobs).map(function(j){j=chObj(j);return {no:cuS(j.no),quote:cuS(j.quote),cust:cuS(j.cust),st:cuS(j.st)};}).filter(function(j){return j.no;});
  o.quotes=cuArr(r.quotes).map(function(q){q=chObj(q);return {no:cuS(q.no),cust:cuS(q.cust)};}).filter(function(q){return q.no;});
  o.pos=cuArr(r.pos).map(function(p){p=chObj(p);return {no:cuS(p.no),sup:cuS(p.sup)};}).filter(function(p){return p.no;});
  o.vch=cuArr(r.vch).map(function(c){c=chObj(c);return {no:cuS(c.no),kind:cuS(c.kind),sup:cuS(c.sup),job:cuS(c.job),quote:cuS(c.quote),d:isDay(c.d)?c.d:'',sref:cuS(c.sref)};}).filter(function(c){return c.no;});
  o.methods=cuArr(r.methods).map(cuS).filter(Boolean);if(!o.methods.length)o.methods=['Bank transfer','Cheque','Pay order','Cash'];
  return o;}
function acSup(id){var a=AC.d?AC.d.sups:[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return {id:id,name:id,owed:0};}
function acBill(id){var a=AC.d?AC.d.bills:[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}
function acPayOf(id){var a=AC.d?AC.d.pays:[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}
function acNonce(){var s='',c=window.crypto;try{if(c&&c.getRandomValues){var a=new Uint32Array(4);c.getRandomValues(a);for(var i=0;i<4;i++)s+=a[i].toString(36);}}catch(x){}while(s.length<24)s+=Math.random().toString(36).slice(2);return s.replace(/[^a-z0-9]/g,'').slice(0,32);}
function acVoid(p){return p.st==='Cancelled'||p.st==='Dishonoured';}
function acLink(b){return b.job?esc(b.job):b.quote?esc(b.quote)+' <small class="tag">(quote, no job yet)</small>':'<span class="tag">no job (overhead)</span>';}
function acPill(st){var k=st==='Part paid'?'Part':st;return '<span class="pill ac-s-'+esc(k)+'">'+esc(st)+'</span>';}
function acErr(m){var k=code(m).split('|');
  switch(k[0]){
    case 'OVERPAY': return 'More than is owed on the open bills (Tk '+tk(k[1])+'). Pay the rest as a <b>Direct payment</b> (no bill), or record the vendor\'s bill first.';
    case 'DUP': return 'This vendor invoice no. is already on bill <b>'+esc(k[1]||'')+'</b>.';
    case 'BILLPAID': return 'Tk '+tk(k[1])+' is already paid on this bill, so it can\'t be changed or cancelled. Cancel that payment first (Accounts head).';
    case 'BILLDIRECT': return 'This bill was made by direct payment <b>'+esc(k[1]||'')+'</b>. Cancel that payment instead.';
    case 'BILLSTATE': return 'This bill is <b>'+esc(k[1]||'closed')+'</b>. It has been reloaded.';
    case 'PAYSTATE': return 'This payment is already <b>'+esc(k[1]||'cancelled')+'</b>.';
    case 'NOTFOUND': return 'This no longer exists. The list has been refreshed.';
    default: return errText(m);
  }}
function viewAc(tab){
  AC.tab=tab||AC.tab||'bills';AC.q='';AC.st='open';AC.d=null;document.title='Core Access · Supplier bills & payments';
  shell('Accounts · Supplier bills & payments','<div class="bar"><button type="button" class="btn btn-ghost btn-sm" id="acb">'+ic('back')+' Home</button>'+
    '<div class="inwrap grow">'+ic('search')+'<input class="inp sm" id="acq" type="search" placeholder="Search bill, PV, vendor, invoice / DO no., job or quote" autocomplete="off" aria-label="Search"></div><span id="acn"></span></div>'+
    '<div id="acsum"></div><div class="chips" id="actb"></div><div class="chips" id="acst"></div><p class="cnt" id="acc">&nbsp;</p><div id="acl" class="qlist"><div class="empty">Loading…</div></div>');
  document.getElementById('acb').onclick=function(){viewHome();};
  document.getElementById('acq').oninput=function(){AC.q=this.value.trim().toLowerCase();acDraw();};
  document.getElementById('acl').onclick=function(e){var b=e.target.closest?e.target.closest('.qcard'):null;if(!b)return;var k=b.getAttribute('data-t'),v=b.getAttribute('data-c');if(k==='b')acBillView(v);else if(k==='p')acPayView(v);else acSupView(v);};
  acLoad(acListUi);
}
function acLoad(then,fail){var my=++AC.seq;
  call('officeAcList',S.token).then(function(r){if(my!==AC.seq)return;AC.d=acNorm(r);then();},function(m){if(my!==AC.seq)return;if(srvGate(m))return;if(fail)return fail(m);
    var L=document.getElementById('acl');if(L){L.innerHTML='<div class="empty">Could not load: '+esc(code(m))+' <button type="button" class="btn btn-ghost btn-sm" id="acr">Try again</button></div>';document.getElementById('acr').onclick=function(){acLoad(then);};}});}
function acListUi(){
  if(!document.getElementById('acl')||!AC.d)return;var D=AC.d,n=document.getElementById('acn');
  n.innerHTML=(D.can.bill?'<button type="button" class="btn btn-ghost btn-sm" id="acnb">'+ic('plus')+' Record bill</button> ':'')+(D.can.pay?'<button type="button" class="btn btn-primary btn-sm" id="acnp">'+ic('cash')+' Pay supplier</button>':'');
  var e;if((e=document.getElementById('acnb')))e.onclick=function(){acBillEdit(null,'');};if((e=document.getElementById('acnp')))e.onclick=function(){acPay('','');};
  var owed=D.bills.reduce(function(s,b){return s+(b.st!=='Cancelled'?b.bal:0);},0),due=D.bills.filter(function(b){return b.bal>0.005&&b.due&&b.due<D.today;}).length;
  document.getElementById('acsum').innerHTML='<div class="box" style="margin-bottom:12px"><div class="meta"><span>We owe suppliers</span><b>Tk '+tk(owed)+'</b><span>Open bills</span><b>'+D.bills.filter(function(b){return b.bal>0.005;}).length+(due?' · <span style="color:var(--orange)">'+due+' past due</span>':'')+'</b></div></div>';
  var tb=document.getElementById('actb');tb.innerHTML=[['bills','Bills'],['pays','Payments'],['sups','Suppliers']].map(function(x){return '<button type="button" class="chip'+(AC.tab===x[0]?' on':'')+'" data-k="'+x[0]+'" aria-pressed="'+(AC.tab===x[0])+'">'+x[1]+'</button>';}).join('');
  tb.onclick=function(ev){var b=ev.target.closest?ev.target.closest('.chip'):null;if(!b)return;AC.tab=b.getAttribute('data-k');AC.st=AC.tab==='bills'?'open':'all';acListUi();};
  document.getElementById('acst').onclick=function(ev){var b=ev.target.closest?ev.target.closest('.chip'):null;if(!b)return;AC.st=b.getAttribute('data-s');acDraw();};
  acDraw();
}
function acDraw(){
  var L=document.getElementById('acl');if(!L||!AC.d)return;var D=AC.d,t=AC.q,sh=[],cnt={},S0=document.getElementById('acst');
  var has=function(s){return !t||s.toLowerCase().indexOf(t)>=0;};
  if(AC.tab==='bills'){
    var bs=D.bills.filter(function(b){return has([b.id,b.sup,acSup(b.sup).name,b.inv,b.dono,b.job,b.quote,b.po,b.pv,b.notes].join(' '));}),grp=function(b){return b.st==='Cancelled'?'Cancelled':b.bal>0.005?'open':'Paid';};
    cnt={all:bs.length,open:0,Paid:0,Cancelled:0};bs.forEach(function(b){cnt[grp(b)]++;});
    S0.innerHTML=[['open','Open'],['Paid','Paid'],['Cancelled','Cancelled'],['all','All']].map(function(x){return '<button type="button" class="chip'+(AC.st===x[0]?' on':'')+'" data-s="'+x[0]+'">'+x[1]+' <b>'+cnt[x[0]]+'</b></button>';}).join('');
    sh=bs.filter(function(b){return AC.st==='all'||grp(b)===AC.st;}).sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:a.id<b.id?1:-1;});
    document.getElementById('acc').textContent=sh.length+' bill'+(sh.length===1?'':'s')+' shown · newest first';
    L.innerHTML=sh.length?sh.map(function(b){return '<button type="button" class="qcard'+(b.st==='Cancelled'?' ch-cx':'')+'" data-t="b" data-c="'+esc(b.id)+'"><div class="qrow"><span class="qno">'+esc(b.id)+'</span><span class="sp"></span>'+(b.pv?'<span class="pill ch-rent">direct</span>':'')+acPill(b.st)+'</div>'+
      '<div class="qc">'+esc(acSup(b.sup).name)+'</div><div class="qp">'+[b.inv?'Inv '+esc(b.inv):'',b.dono?'DO '+esc(b.dono):'',acLink(b)].filter(Boolean).join(' · ')+(b.notes?' · '+esc(b.notes):'')+'</div>'+
      '<div class="qrow"><span class="tag">'+fmtDay(b.d)+(b.due?' · due '+fmtDay(b.due):'')+'</span><span class="sp"></span><span class="tag">Tk '+tk(b.tot)+'</span>'+(b.bal>0.005&&b.st!=='Cancelled'?'<b style="color:var(--orange)">owe Tk '+tk(b.bal)+'</b>':'')+'</div></button>';}).join(''):'<div class="empty">No bills match.</div>';
  }else if(AC.tab==='pays'){
    var ps=D.pays.filter(function(p){return has([p.id,p.sup,acSup(p.sup).name,p.method,p.ref,p.notes].concat(p.al.map(function(a){return a.no;})).join(' '));});
    cnt={all:ps.length,ok:0,Cancelled:0};ps.forEach(function(p){cnt[acVoid(p)?'Cancelled':'ok']++;});
    S0.innerHTML=[['all','All'],['ok','Live'],['Cancelled','Cancelled']].map(function(x){return '<button type="button" class="chip'+(AC.st===x[0]?' on':'')+'" data-s="'+x[0]+'">'+x[1]+' <b>'+cnt[x[0]]+'</b></button>';}).join('');
    sh=ps.filter(function(p){return AC.st==='all'||(acVoid(p)?'Cancelled':'ok')===AC.st;}).sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:a.id<b.id?1:-1;});
    document.getElementById('acc').textContent=sh.length+' payment'+(sh.length===1?'':'s')+' shown · newest first';
    L.innerHTML=sh.length?sh.map(function(p){return '<button type="button" class="qcard'+(acVoid(p)?' ch-cx':'')+'" data-t="p" data-c="'+esc(p.id)+'"><div class="qrow"><span class="qno">'+esc(p.id)+'</span><span class="sp"></span><span class="pill ty">'+esc(p.method)+'</span>'+(acVoid(p)?acPill('Cancelled'):p.st==='Pending'?'<span class="pill ch-s-Draft">cheque pending</span>':'')+'</div>'+
      '<div class="qc">'+esc(acSup(p.sup).name)+'</div><div class="qp">'+(p.al.length?'Bills: '+p.al.map(function(a){return esc(a.no)+' '+tk(a.amt);}).join(' · '):'no bill')+(p.notes?' · '+esc(p.notes):'')+'</div>'+
      '<div class="qrow"><span class="tag">'+fmtDay(p.d)+(p.ref?' · '+esc(p.ref):'')+'</span><span class="sp"></span><b>Tk '+tk(p.amt)+'</b></div></button>';}).join(''):'<div class="empty">No payments match.</div>';
  }else{
    var ss=D.sups.filter(function(s){return has(s.id+' '+s.name+' '+s.phone);});
    cnt={all:ss.length,owe:0};ss.forEach(function(s){if(s.owed>0.005)cnt.owe++;});
    S0.innerHTML=[['all','All'],['owe','We owe']].map(function(x){return '<button type="button" class="chip'+(AC.st===x[0]?' on':'')+'" data-s="'+x[0]+'">'+x[1]+' <b>'+cnt[x[0]]+'</b></button>';}).join('');
    sh=ss.filter(function(s){return AC.st!=='owe'||s.owed>0.005;}).sort(function(a,b){return b.owed-a.owed||(a.name<b.name?-1:1);});
    document.getElementById('acc').textContent=sh.length+' supplier'+(sh.length===1?'':'s')+' shown';
    L.innerHTML=sh.length?sh.map(function(s){var nv=D.vch.filter(function(c){return c.sup===s.id;}).length;return '<button type="button" class="qcard" data-t="s" data-c="'+esc(s.id)+'"><div class="qrow"><span class="qno">'+esc(s.id)+'</span><span class="sp"></span>'+(s.off?'<span class="pill ch-s-Cancelled">inactive</span>':'')+'</div>'+
      '<div class="qc">'+esc(s.name)+'</div><div class="qrow"><span class="tag">'+(s.phone?esc(s.phone)+' · ':'')+nv+' vendor challan'+(nv===1?'':'s')+'</span><span class="sp"></span>'+(s.owed>0.005?'<b style="color:var(--orange)">owe Tk '+tk(s.owed)+'</b>':'<span class="tag">nothing owed</span>')+'</div></button>';}).join(''):'<div class="empty">No suppliers match.</div>';
  }
}
function acShell(title,body){shell('Accounts · '+title,'<div class="bar"><button type="button" class="btn btn-ghost btn-sm" id="acvb">'+ic('back')+' Supplier bills & payments</button></div><div id="acv">'+body+'</div>');document.getElementById('acvb').onclick=function(){viewAc(AC.tab);};}
function acFresh(fn){AC.d=null;acLoad(fn,function(m){var v=document.getElementById('acv');if(v)v.innerHTML='<div class="empty">Could not load: '+esc(code(m))+'</div>';});}
function acBillView(id){
  var b=acBill(id);if(!b){viewAc('bills');toast(id+' no longer exists.');return;}var D=AC.d,s=acSup(b.sup),lock=b.st==='Cancelled'||!!b.pv||b.paid>0.005;
  var ps=D.pays.filter(function(p){return p.al.some(function(a){return a.no===b.id;});});
  var h='<div class="qhead"><div><h2>'+esc(b.id)+'</h2><div class="sub">'+esc(s.name)+' · '+esc(b.sup)+'</div><div class="qrow" style="margin-top:8px">'+acPill(b.st)+(b.pv?'<span class="pill ch-rent">direct payment '+esc(b.pv)+'</span>':'')+'</div></div><div class="qacts">';
  if(D.can.bill&&!lock)h+='<button type="button" class="btn btn-ghost btn-sm" id="abe">'+ic('edit')+'Edit</button>';
  if(D.can.pay&&b.bal>0.005&&b.st!=='Cancelled')h+='<button type="button" class="btn btn-primary btn-sm" id="abp">'+ic('cash')+'Pay this bill</button>';
  if(D.can.bill&&!lock)h+='<button type="button" class="btn btn-danger btn-sm" id="abc">'+ic('ban')+'Cancel bill</button>';
  h+='</div></div><div class="qgrid"><div class="box"><h4>Vendor bill</h4>'+chKv([['Vendor invoice no.',esc(b.inv||'—')],['Vendor DO no.',esc(b.dono||'—')],['Bill date',fmtDay(b.d)],['Due',b.due?fmtDay(b.due):'—'],['Job / quote',acLink(b)],['Our PO',esc(b.po||'—')],['Note',esc(b.notes)],['Recorded by',esc(b.by)]])+'</div>'+
    '<div class="box"><h4>Money</h4>'+chKv([['Amount','Tk '+tk(b.amt)],['VAT','Tk '+tk(b.vat)],['Total','<b>Tk '+tk(b.tot)+'</b>'],['Paid','Tk '+tk(b.paid)],['Still owed',b.st==='Cancelled'?'—':'<b style="color:var(--orange)">Tk '+tk(b.bal)+'</b>']])+'</div></div>';
  if(b.st==='Cancelled')h+='<div class="msg warn">'+ic('alert')+'<div>Cancelled'+(b.reason?' — '+esc(b.reason):'')+'. Not owed; the number is kept.</div></div>';
  if(ps.length)h+='<div class="box"><h4>Payments</h4><div class="tblw"><table class="ltab"><thead><tr><th>Payment</th><th>Date</th><th>Method</th><th class="r">On this bill</th></tr></thead><tbody>'+ps.map(function(p){var a=p.al.filter(function(x){return x.no===b.id;})[0];
    return '<tr class="go" data-p="'+esc(p.id)+'"><td><span class="qno">'+esc(p.id)+'</span>'+(acVoid(p)?' '+acPill('Cancelled'):'')+'</td><td>'+fmtDay(p.d)+'</td><td>'+esc(p.method)+(p.ref?'<small>'+esc(p.ref)+'</small>':'')+'</td><td class="r">'+tk(a?a.amt:0)+'</td></tr>';}).join('')+'</tbody></table></div></div>';
  if(lock&&b.st!=='Cancelled'&&D.can.bill)h+='<div class="lockn">'+ic('lock')+'<span>'+(b.pv?'Made by a direct payment: cancel that payment to undo it.':'Money is paid on it: it can\'t be edited or cancelled. Cancel the payment first (Accounts head).')+'</span></div>';
  acShell('Bill '+b.id,h);
  var e;if((e=document.getElementById('abe')))e.onclick=function(){acBillEdit(b,'');};if((e=document.getElementById('abp')))e.onclick=function(){acPay(b.sup,b.id);};
  if((e=document.getElementById('abc')))e.onclick=function(){acCancelDlg('b',b);};
  [].forEach.call(document.querySelectorAll('tr[data-p]'),function(r){r.onclick=function(){acPayView(r.getAttribute('data-p'));};});
}
function acPayView(id){
  var p=acPayOf(id);if(!p){viewAc('pays');toast(id+' no longer exists.');return;}var D=AC.d,s=acSup(p.sup);
  var h='<div class="qhead"><div><h2>'+esc(p.id)+'</h2><div class="sub">Paid to '+esc(s.name)+' · '+esc(p.sup)+'</div><div class="qrow" style="margin-top:8px"><span class="pill ty">'+esc(p.method)+'</span>'+(acVoid(p)?acPill(p.st):p.st==='Pending'?'<span class="pill ch-s-Draft">cheque pending</span>':'')+'</div></div><div class="qacts">';
  if(D.can.head&&!acVoid(p))h+='<button type="button" class="btn btn-danger btn-sm" id="apc">'+ic('ban')+'Cancel payment</button>';
  h+='</div></div><div class="qgrid"><div class="box"><h4>Payment voucher</h4>'+chKv([['Date',fmtDay(p.d)],['Amount','<b>Tk '+tk(p.amt)+'</b>'],['Method',esc(p.method)],['Ref / cheque no.',esc(p.ref||'—')],['Bank',p.method==='Cash'?'':esc(p.bank||'—')],['Note',esc(p.notes)],['Recorded by',esc(p.by)]])+'</div>'+
    '<div class="box"><h4>Bills paid</h4>'+(p.al.length?'<div class="tblw"><table class="ltab"><tbody>'+p.al.map(function(a){var b=acBill(a.no);return '<tr class="go" data-b="'+esc(a.no)+'"><td><span class="qno">'+esc(a.no)+'</span>'+(b?'<small>'+esc([b.inv?'Inv '+b.inv:'',b.job||b.quote,b.notes].filter(Boolean).join(' · '))+'</small>':'')+'</td><td class="r">'+tk(a.amt)+'</td></tr>';}).join('')+'</tbody></table></div>':'<p class="tag">No bill on it'+(p.free>0.005?' · Tk '+tk(p.free)+' not set against a bill':'')+'.</p>')+'</div></div>';
  if(acVoid(p))h+='<div class="msg warn">'+ic('alert')+'<div>'+esc(p.st)+(p.reason?' — '+esc(p.reason):'')+'. It counts as nothing; the bills it paid were re-opened'+(p.st==='Cancelled'?' (a direct payment\'s own bill was cancelled with it)':'')+'.</div></div>';
  acShell('Payment '+p.id,h);
  var e;if((e=document.getElementById('apc')))e.onclick=function(){acCancelDlg('p',p);};
  [].forEach.call(document.querySelectorAll('tr[data-b]'),function(r){r.onclick=function(){acBillView(r.getAttribute('data-b'));};});
}
function acSupView(id){
  var D=AC.d,s=acSup(id),bs=D.bills.filter(function(b){return b.sup===id;}).sort(function(a,b){return a.d<b.d?1:-1;}),ps=D.pays.filter(function(p){return p.sup===id;}).sort(function(a,b){return a.d<b.d?1:-1;}),vc=D.vch.filter(function(c){return c.sup===id;});
  var h='<div class="qhead"><div><h2>'+esc(s.name)+'</h2><div class="sub">'+esc(id)+(s.phone?' · '+esc(s.phone):'')+'</div></div><div class="qacts">'+(D.can.bill&&!s.off?'<button type="button" class="btn btn-ghost btn-sm" id="asb">'+ic('plus')+'Record bill</button>':'')+(D.can.pay&&!s.off?'<button type="button" class="btn btn-primary btn-sm" id="asp">'+ic('cash')+'Pay</button>':'')+'</div></div>'+
    '<div class="box" style="margin-bottom:12px"><div class="meta"><span>We owe</span><b'+(s.owed>0.005?' style="color:var(--orange)"':'')+'>Tk '+tk(s.owed)+'</b><span>Bills · payments</span><b>'+bs.length+' · '+ps.length+'</b></div></div>';
  if(vc.length)h+='<div class="box" style="margin-bottom:12px"><h4>Vendor-rental challans (rent payable)</h4><div class="tblw"><table class="ltab"><thead><tr><th>Challan</th><th>Date</th><th>Job / quote</th><th>Vendor DO</th></tr></thead><tbody>'+vc.map(function(c){return '<tr><td><span class="qno">'+esc(c.no)+'</span><small>'+esc(c.kind)+'</small></td><td>'+fmtDay(c.d)+'</td><td>'+esc(c.job||c.quote||'—')+'</td><td>'+esc(c.sref||'—')+'</td></tr>';}).join('')+'</tbody></table></div></div>';
  h+='<div class="box" style="margin-bottom:12px"><h4>Bills</h4>'+(bs.length?'<div class="tblw"><table class="ltab"><thead><tr><th>Bill</th><th>Date</th><th>Job / quote</th><th class="r">Total</th><th class="r">Owed</th></tr></thead><tbody>'+bs.map(function(b){return '<tr class="go" data-b="'+esc(b.id)+'"><td><span class="qno">'+esc(b.id)+'</span> '+acPill(b.st)+'<small>'+esc([b.inv?'Inv '+b.inv:'',b.dono?'DO '+b.dono:'',b.notes].filter(Boolean).join(' · '))+'</small></td><td>'+fmtDay(b.d)+'</td><td>'+esc(b.job||b.quote||'—')+'</td><td class="r">'+tk(b.tot)+'</td><td class="r">'+(b.bal>0.005?tk(b.bal):'—')+'</td></tr>';}).join('')+'</tbody></table></div>':'<p class="tag">No bills yet.</p>')+'</div>';
  h+='<div class="box"><h4>Payments</h4>'+(ps.length?'<div class="tblw"><table class="ltab"><thead><tr><th>Payment</th><th>Date</th><th>Method</th><th class="r">Amount</th></tr></thead><tbody>'+ps.map(function(p){return '<tr class="go" data-p="'+esc(p.id)+'"><td><span class="qno">'+esc(p.id)+'</span>'+(acVoid(p)?' '+acPill(p.st):'')+'</td><td>'+fmtDay(p.d)+'</td><td>'+esc(p.method)+(p.ref?'<small>'+esc(p.ref)+'</small>':'')+'</td><td class="r">'+tk(p.amt)+'</td></tr>';}).join('')+'</tbody></table></div>':'<p class="tag">No payments yet.</p>')+'</div>';
  acShell(s.name,h);
  var e;if((e=document.getElementById('asb')))e.onclick=function(){acBillEdit(null,id);};if((e=document.getElementById('asp')))e.onclick=function(){acPay(id,'');};
  [].forEach.call(document.querySelectorAll('tr[data-b]'),function(r){r.onclick=function(){acBillView(r.getAttribute('data-b'));};});
  [].forEach.call(document.querySelectorAll('tr[data-p]'),function(r){r.onclick=function(){acPayView(r.getAttribute('data-p'));};});
}
function acLinkOpts(){var D=AC.d;return [{v:'',t:'— none (overhead, e.g. office rent) —'}].concat(D.jobs.map(function(j){return {v:j.no,t:j.no+(j.quote?' · '+j.quote:'')+' · '+j.cust+(j.st==='Closed'?' (closed)':'')};}),D.quotes.map(function(q){return {v:'Q:'+q.no,t:q.no+' · '+q.cust+' · quote, no job yet'};}));}
function acSupOpts(newOk){return [{v:'',t:'— pick the vendor —'}].concat(AC.d.sups.filter(function(s){return !s.off;}).map(function(s){return {v:s.id,t:s.name+' · '+s.id};})).concat(newOk?[{v:'__new',t:'+ New vendor…'}]:[]);}
function acFind(fid,sid,opts){var f=document.getElementById(fid);if(!f)return;f.oninput=function(){var t=this.value.trim().toLowerCase(),s=document.getElementById(sid),cur=s.value;
  s.innerHTML=opts.filter(function(o,i){return !i||o.v===cur||!t||(o.v+' '+o.t).toLowerCase().indexOf(t)>=0;}).map(function(o){return '<option value="'+esc(o.v)+'"'+(o.v===cur?' selected':'')+'>'+esc(o.t)+'</option>';}).join('');};}
function acVendorBox(sup){var vc=sup&&AC.d?AC.d.vch.filter(function(c){return c.sup===sup;}):[];if(!vc.length)return '';
  return '<div class="note">'+ic('alert')+'<span>Vendor-rental challans of this vendor: '+vc.map(function(c){return esc(c.no)+' · '+esc(c.job||c.quote||'—')+(c.sref?' · DO '+esc(c.sref):'');}).join(' | ')+'</span></div>';}
function acNum(v){v=String(v==null?'':v).replace(/,/g,'').trim();return v===''?NaN:+v;}
function acMoneyOk(v,zero){return isFinite(v)&&(zero?v>=0:v>0)&&Math.abs(Math.round(v*100)-v*100)<1e-6;}
function acBillEdit(b0,sup0){
  var D=AC.d;if(!D){acLoad(function(){acBillEdit(b0,sup0);});return;}var isNew=!b0,nonce=acNonce();
  var b=b0||{sup:sup0||'',inv:'',dono:'',d:D.today,due:'',job:'',quote:'',po:'',amt:'',vat:'',notes:''},lo=acLinkOpts();
  var h='<div class="qhead"><div><h2>'+(isNew?'Record a vendor bill':'Edit '+esc(b.id))+'</h2><div class="sub">The vendor\'s own invoice / DO — we make no document. Invoice and DO no. are optional.</div></div></div><div id="abm"></div><div class="box">'+
    '<div class="f2">'+chSel('abs','Vendor',acSupOpts(true),b.sup)+'<span id="abvh"></span></div>'+
    '<div id="abnv"><div class="f2">'+chFld('abnn','New vendor name','','e.g. Dhaka Scaffold Rental')+chFld('abnp','Vendor phone','','e.g. 01700-000000')+'</div><div class="f2">'+chFld('abna','Vendor address','','')+'<span></span></div></div>'+
    '<div class="f2">'+chFld('abi','Vendor invoice no.',b.inv,'e.g. DSR-INV-221','text','optional')+chFld('abdo','Vendor DO / challan no.',b.dono,'e.g. VDO-1021','text','optional')+'</div>'+
    '<div class="f2">'+chFld('abd','Bill date',b.d,'','date')+chFld('abdu','Due date',b.due,'','date','optional')+'</div>'+
    '<div class="f2">'+chFld('abjf','Find job / quote','','job no., quote no. or customer','search')+chSel('abj','Job / quote',lo,b.job||(b.quote?'Q:'+b.quote:''),'Job P/L counts it. A quote\'s bills move onto its job when the job is made.')+'</div>'+
    '<div class="f2">'+chSel('abpo','Our PO',[{v:'',t:'— none —'}].concat(D.pos.map(function(p){return {v:p.no,t:p.no+(p.sup?' · '+acSup(p.sup).name:'')};})),b.po,'optional')+chFld('abn','Note (what it is for)',b.notes,'e.g. Rent of 40 ledgers, Nov')+'</div>'+
    '<div class="ch-f3">'+chFld('aba',isNew?'Amount (before VAT)':'Amount (before VAT)',b.amt===''?'':String(b.amt),'Tk','text')+chFld('abv','VAT',b.vat===''?'':String(b.vat),'Tk, 0 if none','text','optional')+chFld('abt','Total','','','text','',true)+'</div></div>'+
    '<div class="dfoot"><button type="button" class="btn btn-ghost" id="abx">Cancel</button><button type="button" class="btn btn-primary" id="abs2">'+ic('check')+(isNew?'Save bill':'Save changes')+'</button></div>';
  shell('Accounts · '+(isNew?'Record bill':'Edit bill'),h);
  var g=function(i){var x=document.getElementById(i);return x?x.value.trim():'';};
  var upd=function(){var nv=g('abs')==='__new';document.getElementById('abnv').style.display=nv?'':'none';document.getElementById('abvh').innerHTML=nv?'':acVendorBox(g('abs'));
    var a=acNum(g('aba')),v=g('abv')===''?0:acNum(g('abv'));document.getElementById('abt').value=isFinite(a)&&isFinite(v)?'Tk '+tk(a+v):'';};
  document.getElementById('abs').onchange=upd;document.getElementById('aba').oninput=upd;document.getElementById('abv').oninput=upd;acFind('abjf','abj',lo);upd();
  document.getElementById('abx').onclick=function(){if(isNew)viewAc('bills');else acBillView(b.id);};
  var btn=document.getElementById('abs2');btn.onclick=function(){chMsg('abm','');
    var sv=g('abs'),a=acNum(g('aba')),v=g('abv')===''?0:acNum(g('abv')),jv=g('abj');
    if(!sv)return chMsg('abm','Pick the vendor (or + New vendor).');
    if(sv==='__new'&&(!g('abnn')||!g('abnp')||!g('abna')))return chMsg('abm','New vendor: name, phone and address are needed.');
    if(!isDay(g('abd')))return chMsg('abm','Bill date is needed.');
    if(g('abdu')&&(!isDay(g('abdu'))||g('abdu')<g('abd')))return chMsg('abm','Due date can\'t be before the bill date.');
    if(!acMoneyOk(a))return chMsg('abm','Amount: a number above 0 (2 decimals at most).');
    if(!acMoneyOk(v,true))return chMsg('abm','VAT: 0 or more (2 decimals at most).');
    var p={sup:sv==='__new'?'':sv,inv:g('abi'),dono:g('abdo'),date:g('abd'),due:g('abdu'),po:g('abpo'),amt:a,vat:v,notes:g('abn')};
    if(sv==='__new')p.newSup={name:g('abnn'),phone:g('abnp'),addr:g('abna')};
    if(jv.indexOf('Q:')===0)p.quote=jv.slice(2);else if(jv)p.job=jv;
    if(isNew)p.nonce=nonce;else{p.id=b.id;p.ev=b.ev;}
    busyBtn(btn,true,'Saving…');
    call('officeBillSave',S.token,p).then(function(r){busyBtn(btn,false);r=chObj(r);var id=cuS(r.id);acFresh(function(){acBillView(id);toast((isNew?'Bill '+id+' recorded.':'Bill saved.')+(r.warn?' (The log line could not be written.)':''));});},
      function(m){busyBtn(btn,false);if(srvGate(m))return;var k=code(m).split('|')[0];
        if(!isNew&&(k==='STALE'||k==='NOTFOUND'||k==='BILLSTATE'||k==='BILLPAID'||k==='BILLDIRECT')){acFresh(function(){if(acBill(b.id))acBillView(b.id);else viewAc('bills');toast(acErr(m).replace(/<[^>]+>/g,''));});return;}
        chMsg('abm',acErr(m));});};
}
function acPay(sup0,bill0){
  var D=AC.d;if(!D){acLoad(function(){acPay(sup0,bill0);});return;}var nonce=acNonce(),lo=acLinkOpts();
  var mo=D.methods.map(function(m){return {v:m,t:m};});
  var h='<div class="qhead"><div><h2>Pay a supplier</h2><div class="sub">Against their open bills, or a direct payment with no bill (cash is fine). A payment voucher no. is given on save.</div></div></div><div id="apm"></div><div class="box" style="margin-bottom:12px">'+
    '<div class="f2">'+chSel('apmode','Pay',[{v:'bills',t:'Against open bills'},{v:'direct',t:'Direct payment (no bill / invoice)'}],bill0||!sup0||acSup(sup0).owed>0.005?'bills':'direct')+chSel('aps','Vendor',acSupOpts(false),sup0)+'</div>'+
    '<div id="apnv"><div class="f2">'+chFld('apnn','New vendor name','','e.g. Local transport')+chFld('apnp','Vendor phone','','e.g. 01700-000000')+'</div><div class="f2">'+chFld('apna','Vendor address','','')+'<span></span></div></div>'+
    '<div id="apbw"></div><div id="apdw"><div class="f2">'+chFld('apjf','Find job / quote','','job no., quote no. or customer','search')+chSel('apj','Job / quote',lo,'','Job P/L counts it.')+'</div>'+
    '<div class="f2">'+chFld('api','Vendor invoice / memo no.','','','text','optional')+chFld('apdo','Vendor DO no.','','','text','optional')+'</div><div class="f2">'+chSel('appo','Our PO',[{v:'',t:'— none —'}].concat(D.pos.map(function(p){return {v:p.no,t:p.no};})),'','optional')+'<span></span></div></div>'+
    '<div class="ch-f3">'+chFld('apd','Date',D.today,'','date')+chSel('apme','Method',mo,'Bank transfer')+chFld('apa','Amount','','Tk','text')+'</div>'+
    '<div class="f2" id="aprw">'+chFld('apr','Ref / cheque no.','','e.g. CHQ-102345','text','')+chFld('apbk','Bank','','e.g. City Bank, Gulshan','text','optional')+'</div>'+
    '<div class="f2">'+chFld('apn','Note','','','text','')+'<span></span></div></div>'+
    '<div class="dfoot"><button type="button" class="btn btn-ghost" id="apx">Cancel</button><button type="button" class="btn btn-primary" id="apsv">'+ic('check')+'Save payment</button></div>';
  shell('Accounts · Pay supplier',h);
  var g=function(i){var x=document.getElementById(i);return x?x.value.trim():'';},sel=bill0?[bill0]:null;
  var open=function(){var s=g('aps');return D.bills.filter(function(b){return b.sup===s&&b.st!=='Cancelled'&&b.bal>0.005;}).sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:a.id<b.id?-1:1;});};
  var bills=function(){var w=document.getElementById('apbw'),ob=open();if(!g('aps')){w.innerHTML='';return;}
    if(!ob.length){w.innerHTML='<div class="note">'+ic('alert')+'<span>No open bills for this vendor. Record their bill first, or use <b>Direct payment</b>.</span></div>';return;}
    w.innerHTML='<div class="tblw"><table class="ltab"><thead><tr><th></th><th>Bill</th><th>Date</th><th class="r">Owed</th><th class="r">Pay now</th></tr></thead><tbody>'+ob.map(function(b){var on=!sel||sel.indexOf(b.id)>=0;
      return '<tr><td><input type="checkbox" class="apck" data-b="'+esc(b.id)+'"'+(on?' checked':'')+' aria-label="Pay '+esc(b.id)+'"></td><td><span class="qno">'+esc(b.id)+'</span><small>'+esc([b.inv?'Inv '+b.inv:'',b.job||b.quote,b.notes].filter(Boolean).join(' · '))+'</small></td><td>'+fmtDay(b.d)+'</td><td class="r">'+tk(b.bal)+'</td><td class="r"><input class="inp np apba" data-b="'+esc(b.id)+'" style="width:120px;text-align:right" value="'+(on?num(b.bal):'')+'"'+(on?'':' disabled')+' aria-label="Amount for '+esc(b.id)+'"></td></tr>';}).join('')+'</tbody></table></div>';
    [].forEach.call(w.querySelectorAll('.apck'),function(c){c.onchange=function(){var i=w.querySelector('.apba[data-b="'+c.getAttribute('data-b')+'"]'),b=acBill(c.getAttribute('data-b'));i.disabled=!c.checked;i.value=c.checked?num(b.bal):'';sum();};});
    [].forEach.call(w.querySelectorAll('.apba'),function(i){i.oninput=sum;});sum();};
  var picks=function(){return [].map.call(document.querySelectorAll('.apck:checked'),function(c){var i=document.querySelector('.apba[data-b="'+c.getAttribute('data-b')+'"]');return {no:c.getAttribute('data-b'),amt:acNum(i.value),el:i};});};
  var sum=function(){if(g('apmode')!=='bills')return;var t=picks().reduce(function(s,p){return s+(isFinite(p.amt)?p.amt:0);},0);document.getElementById('apa').value=t?num(t):'';};
  var upd=function(){var dir=g('apmode')==='direct',sv=document.getElementById('aps'),cur=sv.value;
    sv.innerHTML=acSupOpts(dir).map(function(o){return '<option value="'+esc(o.v)+'"'+(o.v===cur?' selected':'')+'>'+esc(o.t)+'</option>';}).join('');if(!dir&&cur==='__new')sv.value='';
    document.getElementById('apnv').style.display=dir&&g('aps')==='__new'?'':'none';document.getElementById('apdw').style.display=dir?'':'none';document.getElementById('apbw').style.display=dir?'none':'';
    var a=document.getElementById('apa');a.readOnly=!dir;if(dir)a.removeAttribute('readonly');
    var cash=g('apme')==='Cash';document.getElementById('apbk').parentNode.style.display=cash?'none':'';document.getElementById('apr').parentNode.querySelector('small').textContent=g('apme')==='Cheque'||g('apme')==='Pay order'?'needed':'optional';
    document.getElementById('apn').parentNode.querySelector('span').textContent=dir?'What it is for (needed)':'Note';
    if(!dir)bills();};
  document.getElementById('apmode').onchange=function(){sel=null;upd();};document.getElementById('aps').onchange=function(){sel=null;upd();};document.getElementById('apme').onchange=upd;acFind('apjf','apj',lo);upd();
  document.getElementById('apx').onclick=function(){if(bill0)acBillView(bill0);else if(sup0)acSupView(sup0);else viewAc('pays');};
  var btn=document.getElementById('apsv');btn.onclick=function(){chMsg('apm','');var dir=g('apmode')==='direct',sv=g('aps'),me=g('apme'),a=acNum(g('apa'));
    [].forEach.call(document.querySelectorAll('.apba'),function(i){i.classList.remove('bad');});
    if(!sv)return chMsg('apm','Pick the vendor'+(dir?' (or + New vendor).':'.'));
    if(sv==='__new'&&(!g('apnn')||!g('apnp')||!g('apna')))return chMsg('apm','New vendor: name, phone and address are needed.');
    if(!isDay(g('apd'))||g('apd')>D.today)return chMsg('apm','Date: today or earlier.');
    if((me==='Cheque'||me==='Pay order')&&!g('apr'))return chMsg('apm','Enter the '+(me==='Cheque'?'cheque':'pay order')+' no.');
    var p={nonce:nonce,mode:dir?'direct':'bills',sup:sv==='__new'?'':sv,date:g('apd'),method:me,ref:g('apr'),bank:me==='Cash'?'':g('apbk'),notes:g('apn')};
    if(sv==='__new')p.newSup={name:g('apnn'),phone:g('apnp'),addr:g('apna')};
    if(dir){if(!acMoneyOk(a))return chMsg('apm','Amount: a number above 0 (2 decimals at most).');if(!g('apn'))return chMsg('apm','Say what the direct payment is for (Note).');
      var jv=g('apj');if(jv.indexOf('Q:')===0)p.quote=jv.slice(2);else if(jv)p.job=jv;p.inv=g('api');p.dono=g('apdo');p.po=g('appo');p.amt=a;}
    else{var ps=picks();if(!ps.length)return chMsg('apm','Tick at least one bill (or use Direct payment).');
      for(var i=0;i<ps.length;i++){var b=acBill(ps[i].no);if(!acMoneyOk(ps[i].amt)||ps[i].amt>b.bal+0.005){ps[i].el.classList.add('bad');return chMsg('apm',esc(ps[i].no)+': pay above 0 and at most Tk '+tk(b.bal)+'.');}}
      p.alloc=ps.map(function(x){return {no:x.no,amt:Math.round(x.amt*100)/100};});p.amt=Math.round(ps.reduce(function(s,x){return s+x.amt;},0)*100)/100;}
    busyBtn(btn,true,'Saving…');
    call('officePaySave',S.token,p).then(function(r){busyBtn(btn,false);r=chObj(r);var id=cuS(r.id);acFresh(function(){acPayView(id);toast('Payment '+id+' saved'+(r.bill?' (bill '+r.bill+' made, paid).':'.')+(r.warn==='ALLOC'?' A bill changed meanwhile: the payment is not set against it — check it.':''));});},
      function(m){busyBtn(btn,false);if(srvGate(m))return;chMsg('apm',acErr(m)+(/^(BADINPUT|OVERPAY|DUP)/.test(code(m))?'':' Press <b>Save payment</b> again to retry — it never pays twice.'));});};
}
function acCancelDlg(k,x){
  var isB=k==='b',my=openDlg('<h3 id="dlgt">Cancel '+(isB?'bill ':'payment ')+esc(x.id)+'?</h3><p class="sub">'+(isB?'It is no longer owed. The number is kept, not reused.':'Its allocations are reversed, so the bills it paid are owed again'+(x.al.some(function(a){var b=acBill(a.no);return b&&b.pv===x.id;})?' (its own direct-payment bill is cancelled with it)':'')+'. The voucher stays on record as Cancelled.')+'</p><div id="derr"></div><label class="fld"><span>Reason</span><textarea class="inp np" id="acr" placeholder="e.g. entered twice" style="height:70px"></textarea></label>'+
    '<div class="dfoot"><button type="button" class="btn btn-ghost" id="dno">Back</button><button type="button" class="btn btn-danger" id="dyes">'+ic('ban')+'Cancel '+(isB?'bill':'payment')+'</button></div>');
  var yes=document.getElementById('dyes');document.getElementById('dno').onclick=function(){if(!DLG.busy)closeDlg();};
  yes.onclick=function(){if(DLG.busy)return;var r=document.getElementById('acr').value.replace(/\s+/g,' ').trim();dlgErr('');if(!r)return dlgErr('Give a reason.');DLG.busy=true;busyBtn(yes,true,'Working…');
    var pr=isB?call('officeBillCancel',S.token,x.id,x.ev,r):call('officePayCancel',S.token,x.id,r);
    pr.then(function(){if(my!==DLG.seq)return;DLG.busy=false;closeDlg();acFresh(function(){if(isB)acBillView(x.id);else acPayView(x.id);toast(x.id+' cancelled.');});},
      function(m){if(my!==DLG.seq)return;DLG.busy=false;if(srvGate(m))return;busyBtn(yes,false);var c=code(m).split('|')[0];
        if(c==='STALE'||c==='NOTFOUND'||c==='BILLPAID'||c==='BILLDIRECT'||c==='BILLSTATE'||c==='PAYSTATE'){closeDlg();acFresh(function(){if(isB?acBill(x.id):acPayOf(x.id)){if(isB)acBillView(x.id);else acPayView(x.id);}else viewAc();toast(acErr(m).replace(/<[^>]+>/g,''));});return;}dlgErr(acErr(m));});};
}
