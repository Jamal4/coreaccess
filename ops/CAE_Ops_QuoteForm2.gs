/**
 * Core Access Ops — quote form 2: one "search · pick · add new" box + measured lines (QF1b) + "where am I" banner (QF2) · 15 Nov 2026
 * Thirteenth script file, LAST: Apps Script › + › Script › name it CAE_Ops_QuoteForm2 › paste › Save › reload the sheet.
 * File order: Code, PDF, UI, Reports, App, Sets, Order, QuoteReq, Site, Roles, Terms, QuoteForm, QuoteForm2. No menu change.
 *
 * Customer + project: ONE combobox each (qfCombo). Type to filter (name, contact, phone, email, address / project,
 *   address, client); pick = select; the last row is always "+ Add new …: '<typed text>'" → inline new form, name filled.
 *   Project list: this customer's projects first, then other clients' (marked "will be shared" → linked Sites row).
 *   Replaces QF1's qfPicker in the panel (a later declaration of the same name); server API unchanged (saveQuoteFull).
 * Quote types: "Service" is hidden for NEW quotes (= Project, decided 15 Nov). Old Service quotes keep it and work;
 *   nothing renamed in the sheet. Server refuses a new Service quote / a change to Service.
 * Measured lines: Measure (No. / L × H m² / L × W × H m³) × No. of sets → Qty + Unit (worked out again on the server),
 *   Rate basis (Per unit / Lump sum = 1 lot), Billing default Monthly for Project / Rental (One-off allowed), One-off for Sale.
 *   QuoteLines + DimL, DimW, DimH, DimN, RateBasis at the END (automatic on the first save). Quote PDF: the
 *   description gets "L 20 m × H 12 m = 240 m²". Amount = Qty × Months × Rate as before — totals / invoices unchanged.
 * QF2 banner: under the black CORE ACCESS header a full-width teal bar (#17707D, white caps) with the screen name and,
 *   on the right, the open record (e.g. "CAE/Q/2026/003 · Rev 1 · Draft", "CAE/J/… · Project · On hire"). Set in go()
 *   and refined when the record has loaded (quoteView, quoteForm, jobView, termsView). Sidebar / dialog title
 *   "Core Access · <screen>" (screen it was opened on). O7 / QR / IE panels unchanged (own small panels).
 * 15 Nov 2026 19:50: customer + project boxes show a ▾ arrow and a "+ New" button (easier to find).
 * Replaces by name: uiOpen_, qrOpenQuote (title only).
 * Wraps: qfReady_, upgradeQF, uiQuoteLines_, UI_ACTIONS_.saveQuoteFull, PDF_SPECS.Quote, selfTestAllParts_.
 *   Panel: 5 injections into UI_HTML_ (QF1b code, type dropdown, line hook, home tile; QF2 banner code).
 */
var CAE_QF1B_VERSION = 'QF1b · 15 Nov 2026';
var CAE_QF2_VERSION = 'QF2 · 15 Nov 2026';
var QF_DIM_COLS_ = ['DimL', 'DimW', 'DimH', 'DimN', 'RateBasis'];

// ======================================================================= set-up (automatic with QF1's, safe to repeat)
function qfDimReady_(db) { var h = db.headers('QuoteLines'); return QF_DIM_COLS_.every(function (c) { return h.indexOf(c) >= 0; }); }
var QF1B_ready0_ = qfReady_;
qfReady_ = function (db) { return QF1B_ready0_(db) && qfDimReady_(db); };
var QF1B_up0_ = upgradeQF;
upgradeQF = function (db) {
  var done = QF1B_up0_(db), add = [];
  QF_DIM_COLS_.forEach(function (c) { if (db.ensureColumn('QuoteLines', c)) add.push(c); });
  if (add.length) { done.push('QuoteLines + ' + add.join(', ')); log_(db, 'Upgrade QF1b', '', add.join(', ')); }
  // a new column copies the Yes/No list from Selected (insertColumnAfter) — clear it, or saving a size fails
  if (add.length && typeof SheetDb === 'function' && db instanceof SheetDb) { var qs = db.sheet('QuoteLines'), qh = db.headers('QuoteLines'); add.forEach(function (c) { qs.getRange(1, qh.indexOf(c) + 1, qs.getMaxRows(), 1).clearDataValidations(); }); }
  return done;
};

// ======================================================================= measured lines
function qfNumTxt_(v) { return String(Math.round(v * 1000) / 1000); }
// l = line from the panel → null (no measure) or { qty (null = typed), unit, basis, L, W, H, N, text }
function qfDim_(l, i) {
  var n = 'Line ' + (i + 1) + ': ', basis = qfStr_(l.RateBasis);
  if (basis && ['Per unit', 'Lump sum'].indexOf(basis) < 0) throw new Error(n + 'Rate basis must be Per unit or Lump sum');
  var dn = function (k, what) { var s = qfStr_(l[k]); if (!s) return ''; var v = Number(s); if (!(v > 0)) throw new Error(n + what + ' must be a number above 0'); return v; };
  var L = dn('DimL', 'length'), W = dn('DimW', 'width'), H = dn('DimH', 'height'), N = dn('DimN', 'no. of sets');
  if (N !== '' && Math.round(N) !== N) throw new Error(n + 'no. of sets must be a whole number');
  if (basis === 'Lump sum') return { qty: 1, unit: 'lot', basis: basis, L: '', W: '', H: '', N: '', text: '' };
  if (L === '' && W === '' && H === '' && N === '') return basis ? { qty: null, basis: basis, L: '', W: '', H: '', N: '', text: '' } : null;
  if (L === '' || H === '') throw new Error(n + 'give length and height (m²), or length, width and height (m³)');
  var k = N === '' ? 1 : N, q = Math.round(L * (W === '' ? 1 : W) * H * k * 1000) / 1000, u = W === '' ? 'm²' : 'm³';
  var text = 'L ' + qfNumTxt_(L) + ' m × ' + (W !== '' ? 'W ' + qfNumTxt_(W) + ' m × ' : '') + 'H ' + qfNumTxt_(H) + ' m' + (k > 1 ? ' × ' + k + ' sets' : '') + ' = ' + qfNumTxt_(q) + ' ' + u;
  return { qty: q, unit: u, basis: basis || 'Per unit', L: L, W: W, H: H, N: N, text: text };
}
function qfDimTxt_(l) { try { var d = qfDim_(l, 0); return d && d.text ? d.text : ''; } catch (e) { return ''; } }
var QF1B_lines0_ = uiQuoteLines_;
uiQuoteLines_ = function (db, lines, type) {
  if (!lines || !lines.length) return QF1B_lines0_(db, lines, type);
  var pre = lines.map(function (l, i) {
    var d = qfDim_(l, i), o = Object.assign({}, l);
    if (d && d.qty != null) { o.Qty = d.qty; o.Unit = d.unit; }
    return { o: o, d: d };
  });
  var out = QF1B_lines0_(db, pre.map(function (x) { return x.o; }), type);
  if (qfDimReady_(db)) out.forEach(function (r, i) {
    var d = pre[i].d || {};
    r.DimL = d.L || ''; r.DimW = d.W || ''; r.DimH = d.H || ''; r.DimN = d.N || ''; r.RateBasis = d.basis || '';
  });
  return out;
};
// Quote PDF: measurement under the description
var QF1B_specQ0_ = PDF_SPECS.Quote;
PDF_SPECS.Quote = function (db, no) {
  var spec = QF1B_specQ0_(db, no);
  if (!qfDimReady_(db)) return spec;
  var lines = db.rows('QuoteLines').filter(function (l) { return String(l.QuoteNo) === String(no) && (l.Selected === 'Yes' || l.Optional === 'Yes'); })
    .sort(function (a, b) { return num(a.LineNo) - num(b.LineNo); });
  var g = spec.blocks.filter(function (b) { return b.t === 'grid'; })[0];
  if (g) lines.forEach(function (l, i) { var t = qfDimTxt_(l); if (t && g.rows[i]) g.rows[i][1] = g.rows[i][1] + '\n' + t; });
  return spec;
};

// ======================================================================= quote type: Service = Project for new quotes
function qfTypeGuard_(db, a) {
  if ((a.header || {}).QuoteType !== 'Service') return;
  var old = a.quoteNo ? find(db.rows('Quotes'), 'QuoteNo', a.quoteNo) : null;
  if (!old || old.QuoteType !== 'Service') throw new Error('Service quotes are now Project quotes — choose Project');
}
var QF1B_sqf0_ = UI_ACTIONS_.saveQuoteFull;
UI_ACTIONS_.saveQuoteFull = function (db, a) { qfTypeGuard_(db, a); return QF1B_sqf0_(db, a); };

// ======================================================================= combobox filter (same code runs in the panel)
// rows filtered by every typed word (any field); own rows first; last entry = { add: typed text }
function qfComboList_(rows, q, fields, own, max) {
  var t = String(q == null ? '' : q).trim(), w = t.toLowerCase().split(/\s+/).filter(function (x) { return x; });
  var m = rows.filter(function (r) {
    var hay = fields.map(function (f) { return r[f] == null ? '' : String(r[f]); }).join(' ').toLowerCase();
    return w.every(function (x) { return hay.indexOf(x) >= 0; });
  });
  if (own) m = m.filter(own).concat(m.filter(function (r) { return !own(r); }));
  return m.slice(0, max || 12).map(function (r) { return { row: r }; }).concat([{ add: t }]);
}

// ======================================================================= panel (body of this function is injected)
function QF1B_PANEL_() {
document.head.appendChild(el('style',{text:'.qfc{position:relative}.qfl{display:none;position:absolute;left:0;right:0;top:100%;z-index:6;background:#fff;border:1px solid var(--line);border-radius:3px;max-height:240px;overflow:auto;box-shadow:0 2px 6px #0002}.qfi{padding:5px 7px;cursor:pointer;border-bottom:1px solid var(--band)}.qfi:hover,.qfi.on{background:var(--sky)}.qfi b{display:block;font-size:12px}.qfi span{font-size:10.5px;color:var(--grey)}.qfa{color:var(--teal);font-weight:600}.qfr{display:flex;gap:4px;align-items:center}.qfw{position:relative;flex:1;min-width:0}.qfw::after{content:"▾";position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none;color:#555;font-size:13px}.qfw input{width:100%;padding-right:22px;box-sizing:border-box;cursor:pointer}'}));
function qfTypes(cur){return D.lists.QuoteType.filter(function(t){return t!=='Service'||cur==='Service';});}
// o = { rows(), fields, own(r), label(r) → [main, sub], onPick(r|null), onAdd(text), ph, addWord }
function qfCombo(o){var x=inp('','text',o.ph),list=el('div',{cls:'qfl'}),cur=null;
  function set(r){cur=r||null;x.value=cur?o.label(cur)[0]:'';}
  function show(){list.innerHTML='';
    qfComboList_(o.rows(),cur?'':x.value,o.fields,o.own,12).forEach(function(it){var d;
      if(it.add!=null)d=el('div',{cls:'qfi qfa',text:'+ Add new '+o.addWord+(it.add?': “'+it.add+'”':'')});
      else{var lb=o.label(it.row);d=el('div',{cls:'qfi'+(cur&&cur.id===it.row.id?' on':'')},el('b',{text:lb[0]}),lb[1]?el('span',{text:lb[1]}):null);}
      d.addEventListener('mousedown',function(e){e.preventDefault();list.style.display='none';
        if(it.add!=null){var t=it.add;set(null);o.onAdd(t);}else{set(it.row);o.onPick(it.row);}});
      add(list,d);});
    list.style.display='block';}
  x.onfocus=show;
  x.oninput=function(){if(cur){cur=null;o.onPick(null);}show();};
  x.onblur=function(){setTimeout(function(){list.style.display='none';if(!cur)x.value='';},150);};
  x.onkeydown=function(e){if(e.key==='Escape')list.style.display='none';else if(e.key==='Enter'){e.preventDefault();if(list.firstChild)list.firstChild.dispatchEvent(new MouseEvent('mousedown'));}};
  var nb=btn('+ New',function(){},'s x');nb.title='Add a new '+o.addWord;
  nb.addEventListener('mousedown',function(e){e.preventDefault();var t=cur?'':x.value.trim();list.style.display='none';set(null);o.onAdd(t);});
  return {box:el('div',{cls:'qfc'},el('div',{cls:'qfr'},el('div',{cls:'qfw'},x),nb),list),set:set,input:x};}
function qfPicker(h,F){var st={cm:'pick',cid:h.CustID||'',ce:false,pm:'none',sid:'',src:'',pe:false},auto='',cf=null,pf=null,cArea=el('div'),pArea=el('div');
  var cc=qfCombo({ph:'Type name, phone or email — pick, or add new',addWord:'customer',fields:['name','contact','phone','email','address','id'],
    rows:function(){return D.customers.filter(function(c){return c.status!=='Inactive'||c.id===st.cid;});},
    label:function(c){return [c.name,[c.id,c.contact,c.phone].filter(function(v){return v;}).join(' · ')];},
    onPick:function(c){st.cm='pick';st.cid=c?c.id:'';st.ce=false;pReset(true);drawC();},
    onAdd:function(t){st.cm='new';st.cid='';st.ce=false;pReset(false);drawC({name:t});}});
  var pc=qfCombo({ph:'Type project name or address — pick, or add new',addWord:'project',fields:['project','address','id','custName'],
    rows:function(){return D.sites.map(function(s){return Object.assign({},s,{custName:custName(s.cust)});});},
    own:function(s){return !!st.cid&&s.cust===st.cid;},
    label:function(s){var own=st.cid&&s.cust===st.cid;return [s.project||s.name||s.id,[s.address,s.id,own?'':'client '+custName(s.cust)+' — will be shared'].filter(function(v){return v;}).join(' · ')];},
    onPick:function(s){st.pe=false;if(!s){st.pm='none';st.sid='';st.src='';drawP();return;}
      var own=st.cid&&s.cust===st.cid,dup=!own&&st.cid&&D.sites.filter(function(x){return x.cust===st.cid&&qfLow(x.project)===qfLow(s.project)&&qfLow(x.address)===qfLow(s.address);})[0];
      if(own||dup){st.pm='pick';st.sid=own?s.id:dup.id;if(dup)pc.set(qfSite(dup.id));}else{st.pm='link';st.src=s.id;}drawP();},
    onAdd:function(t){st.pm='new';st.pe=false;drawP({project:t});}});
  function att(){var c=st.cm==='new'||st.ce?(cf?cf.get():{}):(qfCust(st.cid)||{}),a=c.contact?c.contact+(c.designation?', '+c.designation:''):'';
    if(!F.Attention.value||F.Attention.value===auto)F.Attention.value=a;auto=a;}
  function pReset(one){st.pm='none';st.sid='';st.src='';st.pe=false;pc.set(null);
    var o=st.cid?D.sites.filter(function(s){return s.cust===st.cid;}):[];if(one&&o.length===1){st.pm='pick';st.sid=o[0].id;pc.set(o[0]);}drawP();}
  function drawC(pre){cArea.innerHTML='';cf=null;cc.box.style.display=st.cm==='new'?'none':'';
    if(st.cm==='new'){cf=qfForm(QF_CF,pre||{});var w=el('div');
      cf.F.name.oninput=function(){w.innerHTML='';var n=qfLow(cf.F.name.value),d=n&&D.customers.filter(function(c){return qfLow(c.name)===n;})[0];
        if(d)add(w,el('div',{cls:'warn'},'Already a customer: '+d.name+' · '+d.id+'  ',btn('Use it',function(){st.cm='pick';st.cid=d.id;cc.set(d);pReset(true);drawC();},'s x')));};
      cf.F.name.oninput();cf.F.contact.oninput=cf.F.designation.oninput=att;
      add(cArea,qfCard('New customer — only the name is needed now',['Cancel',function(){st.cm='pick';st.cid='';cc.set(null);pReset(false);drawC();}],[cf.box,w]));att();return;}
    var c=qfCust(st.cid);if(!c){att();return;}
    if(st.ce){cf=qfForm(QF_CF,c);cf.F.contact.oninput=cf.F.designation.oninput=att;add(cArea,qfCard('Edit '+c.id+' — saved with the quote',['Keep as it was',function(){st.ce=false;drawC();}],cf.box));}
    else add(cArea,[qfKv(QF_CF.slice(1),c),btn('Edit details',function(){st.ce=true;drawC();},'s x')]);att();}
  function drawP(pre){pArea.innerHTML='';pf=null;pc.box.style.display=st.pm==='new'?'none':'';
    if(st.pm==='new'){pf=qfForm(QF_SF,pre||{});add(pArea,qfCard('New project — only the name is needed now',['Cancel',function(){st.pm='none';pc.set(null);drawP();}],pf.box));return;}
    if(st.pm==='link'){var s=qfSite(st.src);pf=qfForm(QF_SF.slice(2),{});
      add(pArea,qfCard('Shared project: '+s.project+' (client '+custName(s.cust)+')',['Cancel',function(){st.pm='none';pc.set(null);drawP();}],[el('p',{cls:'muted',text:'On save it is added for this customer too: same name + address, its own site number and stock location. Site contact for this client (optional):'}),pf.box]));return;}
    if(st.pm!=='pick'){add(pArea,el('p',{cls:'muted',text:'Optional — leave blank, pick one, or add a new project.'}));return;}
    var s2=qfSite(st.sid);if(!s2)return;
    if(st.pe){pf=qfForm(QF_SF,s2);add(pArea,qfCard('Edit '+s2.id+' — saved with the quote',['Keep as it was',function(){st.pe=false;drawP();}],pf.box));}
    else add(pArea,[qfKv(QF_SF.slice(1),s2),btn('Edit details',function(){st.pe=true;drawP();},'s x')]);}
  if(st.cid)cc.set(qfCust(st.cid));
  if(h.SiteID&&qfSite(h.SiteID)){st.pm='pick';st.sid=h.SiteID;pc.set(qfSite(h.SiteID));}
  drawC();drawP();
  var box=el('div',{style:'grid-column:1/-1'},fld('Customer',cc.box),cArea,fld('Project / site (optional)',pc.box),pArea);
  return {box:box,get:function(){var c={mode:st.cm==='new'?'new':'existing',id:st.cm==='new'?'':st.cid};if(cf)c.fields=cf.get();
    var s={mode:st.pm==='new'?'new':st.pm==='link'?'link':st.pm==='pick'?'existing':'none',id:st.pm==='pick'?st.sid:'',src:st.pm==='link'?st.src:''};if(pf)s.fields=pf.get();
    return {customer:c,site:s};}};}
// measured line: added to every quote line card (c = line, l = saved line, F = quote fields)
function qfDim(c,l,F,upd){var t=F.QuoteType.value,fresh=!l.LineID&&!l.Description&&!l.ItemCode;
  var M=sel([['','No. — type the qty'],['A','Area: L × H (m²)'],['V','Volume: L × W × H (m³)']],l.DimW?'V':l.DimL?'A':(fresh&&t==='Project'?'A':''));
  var RB=sel(['Per unit','Lump sum'],l.RateBasis==='Lump sum'?'Lump sum':'Per unit'),dL=inp(l.DimL,'number','m'),dW=inp(l.DimW,'number','m'),dH=inp(l.DimH,'number','m'),dN=inp(l.DimN,'number','1'),txt=el('p',{cls:'muted'});
  var fW=fld('Width W (m)',dW),dims=el('div',{cls:'g'},fld('Length L (m)',dL),fW,fld('Height H (m)',dH),fld('No. of sets',dN));
  var box=el('div',null,el('div',{cls:'g'},fld('Measure',M),fld('Rate basis',RB)),dims,txt);
  function calc(){var ls=RB.value==='Lump sum',m=ls?'':M.value;M.disabled=ls;dims.style.display=m?'':'none';fW.style.display=m==='V'?'':'none';txt.textContent='';
    if(ls){c.qt.value=1;c.un.value='lot';c.qt.disabled=true;txt.textContent='Lump sum: 1 lot, amount = rate.';}
    else if(m){var L=+dL.value||0,W=m==='V'?(+dW.value||0):1,H=+dH.value||0,N=dN.value===''?1:(+dN.value||0),q=Math.round(L*W*H*N*1000)/1000;
      c.qt.value=q||'';c.qt.disabled=true;c.un.value=m==='A'?'m²':'m³';
      txt.textContent=q?'L '+L+' m × '+(m==='V'?'W '+W+' m × ':'')+'H '+H+' m'+(N>1?' × '+N+' sets':'')+' = '+q+' '+c.un.value:'Enter the sizes — Qty is worked out.';}
    else c.qt.disabled=false;upd();}
  [M,RB,c.it].forEach(function(e){e.addEventListener('change',calc);});[dL,dW,dH,dN].forEach(function(e){e.addEventListener('input',calc);});
  if(fresh){c.bi.value=t==='Sale'?'One-off':'Monthly';if(c.bi.value==='Monthly'&&!c.mo.value)c.mo.value=F.HireMonths.value||1;}
  c.bi.addEventListener('change',function(){if(c.bi.value==='One-off')c.mo.value='';else if(c.bi.value==='Monthly'&&!c.mo.value)c.mo.value=F.HireMonths.value||1;upd();});
  c.card.insertBefore(box,c.card.children[2]||null);
  var g0=c.get;c.get=function(){var o=g0(),m=RB.value==='Lump sum'?'':M.value;o.RateBasis=RB.value;o.DimL=m?dL.value:'';o.DimW=m==='V'?dW.value:'';o.DimH=m?dH.value:'';o.DimN=m?dN.value:'';return o;};
  calc();}
}
function qfPanelSrc_(fn) { var s = fn.toString(); return s.slice(s.indexOf('{') + 1, s.lastIndexOf('}')); }
var QF1B_HTML_ = '\n// ================= QF1b combobox + measured lines\n' + qfComboList_.toString() + '\n' + qfPanelSrc_(QF1B_PANEL_) + '\n';
var QF1B_INJECT_ = [
  ['// ================= start', QF1B_HTML_ + '\n// ================= start'],
  ['QuoteType:sel(D.lists.QuoteType,h.QuoteType)', 'QuoteType:sel(qfTypes(h.QuoteType),h.QuoteType)'],
  ['L.push(c);add(list,c.card);upd();}', 'qfDim(c,l,F,upd);L.push(c);add(list,c.card);upd();}'],
  ["tile('New quote','Sale · Rental · Project · Service','quote')", "tile('New quote','Sale · Rental · Project','quote')"],
];
var QF1B_INJECTED_ = 0;
if (typeof UI_HTML_ === 'string') QF1B_INJECT_.forEach(function (x) {
  if (UI_HTML_.indexOf(x[0]) < 0) return;
  UI_HTML_ = UI_HTML_.replace(x[0], function () { return x[1]; }); QF1B_INJECTED_++;
});

// ======================================================================= QF2 "where am I" banner (same helpers run in the panel)
// screen key → name (banner shows it in caps); unknown keys: the panel's TITLES, else the key itself
function qf2Screen_(s, titles) {
  var m = { home: 'Home', quote: 'Quote', quotes: 'Quotes', terms: 'Terms', job: 'Job', customer: 'Customers', challan: 'Challan', ret: 'Return', 'return': 'Return',
    post: 'Challans', billing: 'Billing', payment: 'Payment', po: 'PO', receive: 'Receive goods', expense: 'Expense', pdf: 'PDF' };
  var k = String(s == null || s === '' ? 'home' : s);
  return m[k] || String((titles && titles[k]) || k);
}
// open quote → "CAE/Q/2026/003 · Rev 1 · Draft"
function qf2Ref_(h) { return h && h.QuoteNo ? [h.QuoteNo, 'Rev ' + (Number(h.Rev) || 0), h.Status || 'Draft'].join(' · ') : ''; }
function qf2Title_(screen) { return 'Core Access · ' + qf2Screen_(screen); }
uiOpen_ = function (screen, wide) {
  var t = qf2Title_(screen), out = HtmlService.createHtmlOutput(uiHtml_(screen)).setTitle(t);
  if (wide) SpreadsheetApp.getUi().showModelessDialog(out.setWidth(980).setHeight(700), t);
  else SpreadsheetApp.getUi().showSidebar(out);
};
if (typeof qrOpenQuote === 'function') qrOpenQuote = function (no) { SpreadsheetApp.getUi().showSidebar(HtmlService.createHtmlOutput(uiHtml_('quotes', no)).setTitle(qf2Title_('quotes'))); };

function QF2_PANEL_() {
document.head.appendChild(el('style',{text:'#qfBan{position:sticky;top:34px;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:10px;background:#17707D;color:#fff;padding:4px 10px;min-height:24px;font-size:11px}#qfBanS{font-weight:700;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}#qfBanR{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}header #ttl{visibility:hidden}'}));
var qfBan=el('div',{id:'qfBan'},el('span',{id:'qfBanS'}),el('span',{id:'qfBanR'}));
(function(){var hd=document.querySelector('header');if(!hd)return;hd.parentNode.insertBefore(qfBan,hd.nextSibling);if(hd.offsetHeight)qfBan.style.top=hd.offsetHeight+'px';})();
function bannerRef(ref){var r=$('qfBanR');if(!r)return;r.textContent=ref||'';r.title=ref||'';}
function setBanner(s,ref){var n=$('qfBanS');if(n)n.textContent=qf2Screen_(s,TITLES);bannerRef(ref);}
var qf2Go0_=go;go=function(s,arg,keep){setBanner(s,typeof arg==='string'?arg:'');return qf2Go0_(s,arg,keep);};
var qf2QV0_=quoteView;quoteView=function(r){var o=qf2QV0_.apply(this,arguments);if(r&&r.header)bannerRef(qf2Ref_(r.header));return o;};
var qf2QF0_=quoteForm;quoteForm=function(r){var o=qf2QF0_.apply(this,arguments);bannerRef(r&&r.header?qf2Ref_(r.header):'New · number on save');return o;};
var qf2JV0_=jobView;jobView=function(r){var o=qf2JV0_.apply(this,arguments);if(r&&r.job)bannerRef([r.job.JobNo,r.job.JobType,r.job.Status].filter(function(v){return v;}).join(' · '));return o;};
if(typeof termsView==='function'){var qf2TV0_=termsView;termsView=function(r){var o=qf2TV0_.apply(this,arguments);if(r&&r.no)bannerRef(qf2Ref_({QuoteNo:r.no,Rev:r.rev,Status:r.status}));return o;};}
}
var QF2_HTML_ = '\n// ================= QF2 banner\n' + qf2Screen_.toString() + '\n' + qf2Ref_.toString() + '\n' + qfPanelSrc_(QF2_PANEL_) + '\n';
var QF2_INJECTED_ = 0;
if (typeof UI_HTML_ === 'string' && UI_HTML_.indexOf('// ================= start') >= 0) {
  UI_HTML_ = UI_HTML_.replace('// ================= start', function () { return QF2_HTML_ + '\n// ================= start'; }); QF2_INJECTED_++;
}

// ======================================================================= self-test (in memory, your data is not touched)
if (typeof selfTestAllParts_ === 'function') {
  var QF1B_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return QF1B_parts0_().concat([['QF1b', selfTestQF1b()], ['QF2', selfTestQF2()]]); };
}
function selfTestQF1b() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws, db = testSeed_('Full period');
  var run = function (x, a) { return uiDoDb_(db, x, a); };
  var H = function (o) { return Object.assign({ QuoteType: 'Project', QuoteDate: '2026-11-20', VATPct: '15%', AdvancePct: '50%', CustID: 'CUST-0001' }, o || {}); };
  var CU = { mode: 'existing', id: 'CUST-0001' }, NOS = { mode: 'none' };
  var save = function (no, h, lines) { return run('saveQuoteFull', { quoteNo: no || '', header: h, lines: lines, customer: CU, site: NOS }); };
  var ids = function (r) { return r.map(function (x) { return x.add != null ? '+' + x.add : x.row.id; }).join(); };
  step('G panel', function () {
    eq('G1 panel injected (4 places)', QF1B_INJECTED_, 4);
    var js = UI_HTML_.slice(UI_HTML_.indexOf('<script>') + 8, UI_HTML_.lastIndexOf('</script>'));
    eq('G2 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
    eq('G3 new picker replaces QF1 (declared later)', UI_HTML_.lastIndexOf('function qfPicker(') > UI_HTML_.indexOf('QF1b combobox') && UI_HTML_.indexOf('QF1b combobox') > UI_HTML_.indexOf('function qfPicker('), true);
    eq('G4 type list hides Service for new quotes + line hook', /QuoteType:sel\(qfTypes\(h\.QuoteType\)/.test(UI_HTML_) && /qfDim\(c,l,F,upd\);L\.push\(c\)/.test(UI_HTML_) && UI_HTML_.indexOf("'Sale · Rental · Project · Service'") < 0, true);
    eq('G35 customer + project boxes look like dropdowns (arrow) + New button', UI_HTML_.indexOf('.qfw::after{content:"▾"') > 0 && UI_HTML_.indexOf("nb=btn('+ New'") > 0, true);
  });
  step('G combobox filter + add new', function () {
    var C = [{ id: 'CUST-1', name: 'Delta Builders', contact: 'Karim', phone: '01711' }, { id: 'CUST-2', name: 'Echo Ltd', contact: 'Delta rep', phone: '029' }], F = ['name', 'contact', 'phone', 'id'];
    eq('G5 matches any field, add-new row last with the typed text', ids(qfComboList_(C, ' Delta ', F)), 'CUST-1,CUST-2,+Delta');
    eq('G6 every word must match', ids(qfComboList_(C, 'delta karim', F)), 'CUST-1,+delta karim');
    eq('G7 by phone', ids(qfComboList_(C, '029', F)), 'CUST-2,+029');
    eq('G8 empty = all + plain add', ids(qfComboList_(C, '', F)), 'CUST-1,CUST-2,+');
    eq('G9 nothing found = only add new', ids(qfComboList_(C, 'zzz', F)), '+zzz');
    var Sx = [{ id: 'S1', cust: 'A', project: 'Tower' }, { id: 'S2', cust: 'B', project: 'Tower 2' }, { id: 'S3', cust: 'B', project: 'Depot' }];
    eq('G10 this customer\'s projects first', ids(qfComboList_(Sx, 'tower', ['project'], function (s) { return s.cust === 'B'; })), 'S2,S1,+tower');
  });
  step('G dimensions → qty', function () {
    var d = qfDim_({ DimL: 20, DimH: 12 }, 0);
    eq('G11 m² = L × H', [d.qty, d.unit, d.text].join('|'), '240|m²|L 20 m × H 12 m = 240 m²');
    d = qfDim_({ DimL: '10', DimW: '1.2', DimH: '5' }, 0);
    eq('G12 m³ = L × W × H', [d.qty, d.unit, d.text].join('|'), '60|m³|L 10 m × W 1.2 m × H 5 m = 60 m³');
    d = qfDim_({ DimL: 20, DimH: 12, DimN: 3 }, 0);
    eq('G13 × no. of sets', [d.qty, d.text].join('|'), '720|L 20 m × H 12 m × 3 sets = 720 m²');
    d = qfDim_({ RateBasis: 'Lump sum', DimL: 5 }, 0);
    eq('G14 lump sum = 1 lot', [d.qty, d.unit, d.L].join('|'), '1|lot|');
    eq('G15 no sizes = qty typed', qfDim_({ Qty: 4 }, 0), null);
    throws('G16 length without height', function () { qfDim_({ DimL: 20 }, 1); }, /Line 2: give length and height/);
    throws('G17 sets must be whole', function () { qfDim_({ DimL: 2, DimH: 2, DimN: 1.5 }, 0); }, /whole number/);
    throws('G18 negative size', function () { qfDim_({ DimL: -2, DimH: 2 }, 0); }, /above 0/);
    throws('G19 rate basis list', function () { qfDim_({ RateBasis: 'Per day' }, 0); }, /Per unit or Lump sum/);
  });
  var Q1;
  step('G save measured lines', function () {
    var c0 = db.rows('Quotes').length;
    throws('G20 bad size: nothing saved', function () { save('', H(), [{ Description: 'x', DimL: 3, Rate: 1, Billing: 'One-off' }]); }, /length and height/);
    eq('G21 …no quote, no columns yet', db.rows('Quotes').length + ' ' + qfDimReady_(db), c0 + ' false');
    var r = save('', H(), [
      { Description: 'Scaffold erection', Qty: 1, DimL: '20', DimH: '12', RateBasis: 'Per unit', Billing: 'Monthly', Months: 2, Rate: 50 },
      { Description: 'Mobilisation', Qty: 7, RateBasis: 'Lump sum', Billing: 'One-off', Rate: 15000 },
      { ItemCode: 'RL-STD-20', Qty: 10, Billing: 'One-off', Rate: 90 }]);
    Q1 = r.ref;
    var L = quoteLines(db, Q1);
    eq('G22 qty + unit worked out on the server, sizes stored', [L[0].Qty, L[0].Unit, L[0].DimL, L[0].DimH, L[0].DimW, L[0].RateBasis].join(' '), '240 m² 20 12  Per unit');
    eq('G23 lump sum line', [L[1].Qty, L[1].Unit, L[1].RateBasis, L[1].Months].join(' '), '1 lot Lump sum ');
    eq('G24 totals as before: (240×2×50 + 15000 + 900) × 1.15', quoteTotals(db, Q1).total, 45885);
    eq('G25 new columns at the END of QuoteLines', db.headers('QuoteLines').slice(-5).join(), QF_DIM_COLS_.join());
    var g = PDF_SPECS.Quote(db, Q1).blocks.filter(function (b) { return b.t === 'grid'; })[0];
    eq('G26 PDF: measure under the description', g.rows[0][1], 'Scaffold erection\nL 20 m × H 12 m = 240 m²');
    eq('G27 PDF: line without sizes unchanged', g.rows[2][1], 'Ringlock standard 2.0 m');
    r = save('', H({ QuoteType: 'Rental' }), [{ ItemCode: 'RL-STD-20', Qty: 10, Months: 2, Billing: 'Monthly', Rate: 90 }, { Description: 'Transport', Unit: 'trip', Qty: 2, Billing: 'One-off', Rate: 4000 }]);
    eq('G28 one-off line on a Rental quote: (1800 + 8000) × 1.15', quoteTotals(db, r.ref).total, 11270);
    save(Q1, H(), [{ Description: 'Scaffold erection', Unit: 'm²', Qty: 5, Billing: 'Monthly', Months: 2, Rate: 50 }]);
    L = quoteLines(db, Q1);
    eq('G29 edit: sizes cleared, typed qty kept, extra lines gone', [L.length, L[0].Qty, L[0].DimL, L[0].RateBasis].join(' '), '1 5  ');
  });
  step('G Service = Project', function () {
    throws('G30 new Service quote refused', function () { save('', H({ QuoteType: 'Service' }), [{ Description: 'Inspection', Unit: 'visit', Qty: 1, Rate: 5000 }]); }, /now Project/);
    var r = save('', H({ QuoteType: 'Rental' }), [{ ItemCode: 'RL-STD-20', Qty: 1, Rate: 90 }]);
    throws('G31 changing a quote to Service refused', function () { save(r.ref, H({ QuoteType: 'Service' }), [{ ItemCode: 'RL-STD-20', Qty: 1, Rate: 90 }]); }, /now Project/);
    db.update('Quotes', must(db, 'Quotes', 'QuoteNo', r.ref), { QuoteType: 'Service' }); // an old Service quote
    eq('G32 old Service quote still saves', / saved: /.test(save(r.ref, H({ QuoteType: 'Service' }), [{ Description: 'Inspection', Unit: 'visit', Qty: 2, Rate: 5000 }]).msg), true);
    eq('G33 …keeps its type, totals and prints', must(db, 'Quotes', 'QuoteNo', r.ref).QuoteType + ' ' + quoteTotals(db, r.ref).total + ' ' + (PDF_SPECS.Quote(db, r.ref).blocks.length > 0), 'Service 11500 true');
    eq('G34 old path (saveQuote) without sizes still works', / created: /.test(run('saveQuote', { header: H({ QuoteType: 'Sale' }), lines: [{ ItemCode: 'RL-STD-20', Qty: 3, Rate: 100 }] }).msg), true);
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
function selfTestQF2() {
  var T = testKit_(), eq = T.eq, step = T.step;
  step('B banner', function () {
    eq('B1 banner code injected once', QF2_INJECTED_, 1);
    var js = UI_HTML_.slice(UI_HTML_.indexOf('<script>') + 8, UI_HTML_.lastIndexOf('</script>'));
    eq('B2 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
    var b = UI_HTML_.indexOf('QF2 banner'), st = UI_HTML_.lastIndexOf('// ================= start');
    eq('B3 after QF1b, before start; go() wrapped', b > UI_HTML_.indexOf('QF1b combobox') && b < st && UI_HTML_.indexOf('go=function(s,arg,keep){setBanner(s,') > b, true);
    eq('B4 teal bar under the black header, white caps', /#qfBan\{[^}]*background:#17707D;color:#fff/.test(UI_HTML_) && /#qfBanS\{[^}]*text-transform:uppercase/.test(UI_HTML_) && /header\{background:#000/.test(UI_HTML_), true);
    eq('B5 screen names', ['quote', 'quotes', 'terms', 'job', 'challan', 'ret', 'return', 'billing', 'payment', 'po', 'expense', 'pdf', 'customer', 'home', ''].map(function (s) { return qf2Screen_(s).toUpperCase(); }).join(' · '),
      'QUOTE · QUOTES · TERMS · JOB · CHALLAN · RETURN · RETURN · BILLING · PAYMENT · PO · EXPENSE · PDF · CUSTOMERS · HOME · HOME');
    eq('B6 unknown screen: panel title, else the key', qf2Screen_('stock', { stock: 'Stock count' }) + ' | ' + qf2Screen_('xyz'), 'Stock count | xyz');
    eq('B7 open quote ref', qf2Ref_({ QuoteNo: 'CAE/Q/2026/003', Rev: 1, Status: 'Draft' }) + ' | ' + qf2Ref_({ QuoteNo: 'CAE/Q/2026/001', Rev: '', Status: 'Sent' }) + ' | ' + qf2Ref_({}), 'CAE/Q/2026/003 · Rev 1 · Draft | CAE/Q/2026/001 · Rev 0 · Sent | ');
    eq('B8 sidebar / dialog title', qf2Title_('quotes') + ' | ' + qf2Title_('return') + ' | ' + qf2Title_(), 'Core Access · Quotes | Core Access · Return | Core Access · Home');
    eq('B9 menu opens with the screen title (uiOpen_ replaced)', /qf2Title_\(screen\)/.test(uiOpen_.toString()), true);
    eq('B10 record hooks in the panel', ['quoteView=function', 'quoteForm=function', 'jobView=function', 'termsView=function'].every(function (x) { return UI_HTML_.indexOf(x) > b; }), true);
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
