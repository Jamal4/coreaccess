/**
 * Core Access Ops — quote form: customer + project picker (add-on QF1) · 15 Nov 2026
 * Twelfth script file, LAST: Apps Script › + › Script › name it CAE_Ops_QuoteForm › paste › Save › reload the sheet.
 * File order: Code, PDF, UI, Reports, App, Sets, Order, QuoteReq, Site, Roles, Terms, QuoteForm. No menu change.
 *
 * Quote form (New quote / Edit):
 *   Customer — dropdown, or "+ New customer" inline (name needed; address, contact person, designation, phone, email,
 *     BIN, payment days optional). Picked customer: details shown, "Edit details" changes them with the quote.
 *   Project  — 1. shortlist = this customer's projects (exactly one → preselected on a new quote) · 2. search all
 *     projects (2+ letters, name or address, every client): another client's project → a linked Sites row for this
 *     customer (same Project + Address, own SiteID + stock location) · 3. "+ New project" inline (name needed; address,
 *     site contact, phone, start date optional). Picked project: "Edit details".
 *   One click = one lock: customer → project → quote, everything checked before anything is written.
 *   Attention defaults from the contact person (+ designation) when blank.
 * Customers & projects screen (home tile + menu "New customer / site"): find → edit every field, the projects
 *   (edit, add) and the customer's quotes. Replaces typing in the Customers / Sites tabs.
 * Set-up: automatic on the first save (Customers.Designation, and Sites.StartDate if missing, at the END of the tabs).
 * New: actions saveQuoteFull, saveCustomerFull, saveSiteFull · lookups uiCustomerGet(id), uiSiteSearch(q, custId).
 * Wraps: uiInitDb_ (customer + project details for the panel), selfTestAllParts_. Panel: 5 injections into UI_HTML_
 *   (picker in quoteForm, save → saveQuoteFull, home tile, screen code); S.customer replaced by the new screen.
 */
var CAE_QF_VERSION = 'QF1 · 15 Nov 2026';
// [panel key, column]
var QF_CF_ = [['name', 'Name'], ['address', 'Address'], ['contact', 'ContactPerson'], ['designation', 'Designation'], ['phone', 'Phone'], ['email', 'Email'], ['bin', 'BIN'], ['paymentDays', 'PaymentDays']];
var QF_SF_ = [['project', 'Project'], ['address', 'Address'], ['siteRep', 'SiteRep'], ['siteRepPhone', 'SiteRepPhone'], ['startDate', 'StartDate']];

// ======================================================================= set-up (automatic, safe to repeat)
function qfReady_(db) { return db.headers('Customers').indexOf('Designation') >= 0 && db.headers('Sites').indexOf('StartDate') >= 0; }
function upgradeQF(db) {
  var done = [];
  if (db.ensureColumn('Customers', 'Designation')) done.push('Customers + Designation');
  if (db.ensureColumn('Sites', 'StartDate')) {
    done.push('Sites + StartDate');
    if (db.ss) db.sheet('Sites').getRange(2, db.headers('Sites').indexOf('StartDate') + 1, Math.max(db.sheet('Sites').getMaxRows() - 1, 1), 1).setNumberFormat('dd-mmm-yyyy');
  }
  if (done.length) log_(db, 'Upgrade QF', '', done.join('; '));
  return done;
}
function qfReadyUp_(db) { if (!qfReady_(db)) upgradeQF(db); }

// ======================================================================= field checks
function qfStr_(v) { return blank(v) ? '' : String(v).trim(); }
function qfKey_(v) { return qfStr_(v).toLowerCase().replace(/\s+/g, ' '); }
function qfEmail_(v) {
  var a = qfStr_(v).split(/[,;]/).map(function (x) { return x.trim(); }).filter(function (x) { return x; });
  a.forEach(function (e) { if (!/^[^\s@,;<>()]+@[^\s@,;<>()]+\.[A-Za-z]{2,}$/.test(e)) throw new Error('Email "' + e + '" is not a valid address'); });
  return a.join(', ');
}
function qfPhone_(v, what) {
  var s = qfStr_(v);
  if (s && (!/\d/.test(s) || /[^\d\s+\-\/,().]/.test(s))) throw new Error(what + ' "' + s + '": use digits, spaces and + - / , ( ) only');
  return s; // text: the sheet keeps leading 0 / + (cellVal_)
}
function qfVal_(db, col, v) {
  if (col === 'Email') return qfEmail_(v);
  if (col === 'Phone') return qfPhone_(v, 'Phone');
  if (col === 'SiteRepPhone') return qfPhone_(v, 'Site contact phone');
  if (col === 'PaymentDays') {
    var s = qfStr_(v); if (!s) return num(S(db, 'PaymentDaysDefault', 7));
    var n = Number(s); if (!(n >= 0 && n <= 365) || Math.round(n) !== n) throw new Error('Payment days must be a whole number from 0 to 365');
    return n;
  }
  if (col === 'StartDate') return qfStr_(v) ? uiDate_(qfStr_(v)) : '';
  return qfStr_(v);
}
function qfSame_(col, a, b) {
  if (col === 'StartDate') return (blank(a) ? null : dayNum(a)) === (blank(b) ? null : dayNum(b));
  if (col === 'PaymentDays') return !blank(a) && !blank(b) && num(a) === num(b);
  return qfStr_(a) === qfStr_(b);
}
// f = panel fields → { column: value }; for an edit (old row) only the columns that change
function qfPatch_(db, defs, f, old, need, what) {
  var p = {};
  defs.forEach(function (d) {
    if (f[d[0]] === undefined) return;
    var v = qfVal_(db, d[1], f[d[0]]);
    if (old && qfSame_(d[1], old[d[1]], v)) return;
    p[d[1]] = v;
  });
  if (need && !old && blank(p[need])) throw new Error(what + ' name is needed');
  if (need && old && (need in p) && p[need] === '') throw new Error(what + ' name cannot be empty');
  return p;
}
function qfDupCust_(db, name, except) {
  var k = qfKey_(name);
  return db.rows('Customers').filter(function (c) { return !blank(c.CustID) && c.CustID !== except && qfKey_(c.Name) === k; })[0] || null;
}
function qfDupSite_(db, cust, project, address, except) {
  return db.rows('Sites').filter(function (s) { return !blank(s.SiteID) && s.SiteID !== except && s.CustID === cust && qfKey_(s.Project) === qfKey_(project) && qfKey_(s.Address) === qfKey_(address); })[0] || null;
}
function qfDupSiteErr_(db, cust, d) { return new Error(((find(db.rows('Customers'), 'CustID', cust) || {}).Name || cust) + ' already has this project (' + d.SiteID + ' · ' + d.Project + ') — pick it from the list'); }

// ======================================================================= plans (checks only) + writes
// c = { mode: new | existing, id, fields } → { row (null = new), patch }
function qfCustPlan_(db, c, fallbackId) {
  c = c || {};
  if (c.mode === 'new') {
    var p = qfPatch_(db, QF_CF_, c.fields || {}, null, 'Name', 'Customer'), d = qfDupCust_(db, p.Name);
    if (d) throw new Error('A customer named "' + d.Name + '" already exists (' + d.CustID + ') — pick it from the list');
    return { row: null, patch: p };
  }
  var id = c.id || fallbackId;
  if (blank(id)) throw new Error('Choose the customer or add a new one');
  var row = must(db, 'Customers', 'CustID', id), p2 = c.fields ? qfPatch_(db, QF_CF_, c.fields, row, 'Name', 'Customer') : {};
  if (p2.Name) { var d2 = qfDupCust_(db, p2.Name, id); if (d2) throw new Error('A customer named "' + d2.Name + '" already exists (' + d2.CustID + ')'); }
  return { row: row, patch: p2 };
}
// s = { mode: none | existing | link | new, id, src, fields }
function qfSitePlan_(db, s, cp) {
  s = s || {};
  var mode = s.mode || (blank(s.id) ? 'none' : 'existing'), cid = cp.row ? cp.row.CustID : '';
  if (mode === 'none') return { mode: 'none' };
  if (mode === 'existing') {
    var row = must(db, 'Sites', 'SiteID', s.id);
    if (row.CustID !== cid) throw new Error('Project ' + s.id + ' belongs to another customer — find it with Search to add it for this customer');
    var p = s.fields ? qfPatch_(db, QF_SF_, s.fields, row, 'Project', 'Project') : {};
    if (('Project' in p) || ('Address' in p)) {
      var d = qfDupSite_(db, cid, 'Project' in p ? p.Project : row.Project, 'Address' in p ? p.Address : row.Address, row.SiteID);
      if (d) throw qfDupSiteErr_(db, cid, d);
    }
    return { mode: mode, row: row, patch: p };
  }
  if (mode === 'link') {
    var src = must(db, 'Sites', 'SiteID', s.src);
    if (src.CustID === cid) return qfSitePlan_(db, { mode: 'existing', id: src.SiteID }, cp);
    var f = Object.assign({}, s.fields || {}); delete f.project; delete f.address;
    var p2 = qfPatch_(db, QF_SF_, f, null, null);
    p2.Project = qfStr_(src.Project); p2.Address = qfStr_(src.Address);
    var d2 = cid ? qfDupSite_(db, cid, p2.Project, p2.Address) : null;
    if (d2) throw qfDupSiteErr_(db, cid, d2);
    return { mode: mode, src: src, patch: p2 };
  }
  if (mode === 'new') {
    var p3 = qfPatch_(db, QF_SF_, s.fields || {}, null, 'Project', 'Project'), d3 = cid ? qfDupSite_(db, cid, p3.Project, p3.Address) : null;
    if (d3) throw qfDupSiteErr_(db, cid, d3);
    return { mode: mode, patch: p3 };
  }
  throw new Error('Unknown project choice ' + mode);
}
function qfCustWrite_(db, cp) {
  if (cp.row) {
    var keys = Object.keys(cp.patch);
    if (keys.length) { uiPutRow_(db, 'Customers', must(db, 'Customers', 'CustID', cp.row.CustID), cp.patch); log_(db, 'Customer updated', cp.row.CustID, keys.join(', ')); }
    return { id: cp.row.CustID, changed: keys };
  }
  var id = nextId(db, 'CUST'), r = Object.assign({ CustID: id, Status: 'Active', PaymentDays: num(S(db, 'PaymentDaysDefault', 7)) }, cp.patch);
  db.insert('Customers', r);
  log_(db, 'Customer added', id, r.Name);
  return { id: id, added: true, changed: [] };
}
function qfSiteWrite_(db, sp, custId) {
  if (sp.mode === 'none') return { id: '', changed: [] };
  if (sp.row) {
    var keys = Object.keys(sp.patch);
    if (keys.length) { uiPutRow_(db, 'Sites', must(db, 'Sites', 'SiteID', sp.row.SiteID), sp.patch); log_(db, 'Site updated', sp.row.SiteID, keys.join(', ')); }
    return { id: sp.row.SiteID, changed: keys };
  }
  var id = nextId(db, 'SITE'), r = Object.assign({ SiteID: id, CustID: custId, Status: 'Planned' }, sp.patch);
  db.insert('Sites', r);
  ensureSiteLoc(db, r);
  log_(db, sp.mode === 'link' ? 'Site linked' : 'Site added', id, custId + ' · ' + r.Project + (sp.src ? ' (same project as ' + sp.src.SiteID + ' of ' + sp.src.CustID + ')' : ''));
  return { id: id, added: sp.mode, changed: [] };
}
// the checks uiSaveQuote_ makes, without writing (so a bad line stops the new customer / project too)
function qfQuoteCheck_(db, a) {
  var h = a.header || {}, type = h.QuoteType;
  if (UI_LISTS_DEFAULT_.QuoteType.indexOf(type) < 0) throw new Error('Choose the quote type');
  uiQuoteLines_(db, a.lines, type); uiDate_(h.QuoteDate); uiStaff_(db, h.PreparedBy);
  if (!a.quoteNo) return;
  var no = a.quoteNo, q = must(db, 'Quotes', 'QuoteNo', no), job = find(db.rows('Jobs'), 'QuoteNo', no);
  if (job) throw new Error(no + ' already has job ' + job.JobNo + ' — change it by a variation on the job');
  if (['Draft', 'Sent'].indexOf(q.Status) < 0) throw new Error(no + ' is ' + q.Status + ' — use Revise to reopen it');
  if (milestoneRows(db, no).some(function (m) { return m.Status !== 'Pending'; })) throw new Error(no + ': a milestone is already reached');
}
// a = { quoteNo, header, lines, customer: { mode, id, fields }, site: { mode, id, src, fields } }
function qfSaveQuoteFull_(db, a) {
  var h = Object.assign({}, a.header || {}), cp = qfCustPlan_(db, a.customer, h.CustID);
  var sp = qfSitePlan_(db, a.site || { mode: blank(h.SiteID) ? 'none' : 'existing', id: h.SiteID }, cp);
  qfQuoteCheck_(db, { quoteNo: a.quoteNo, header: h, lines: a.lines });
  // everything checked — now write: customer, project, quote
  qfReadyUp_(db);
  var cw = qfCustWrite_(db, cp), sw = qfSiteWrite_(db, sp, cw.id), cu = must(db, 'Customers', 'CustID', cw.id);
  h.CustID = cw.id; h.SiteID = sw.id;
  if (blank(h.Attention) && !blank(cu.ContactPerson)) h.Attention = qfStr_(cu.ContactPerson) + (blank(cu.Designation) ? '' : ', ' + qfStr_(cu.Designation));
  var r = uiSaveQuote_(db, { quoteNo: a.quoteNo, header: h, lines: a.lines }), pre = [];
  if (cw.added) pre.push('New customer ' + cw.id + '.'); else if (cw.changed.length) pre.push(cw.id + ' details updated (' + cw.changed.join(', ') + ').');
  if (sw.added) pre.push((sw.added === 'link' ? 'Shared project added for this customer: ' : 'New project ') + sw.id + '.'); else if (sw.changed.length) pre.push(sw.id + ' details updated (' + sw.changed.join(', ') + ').');
  r.msg = (pre.length ? pre.join(' ') + '\n' : '') + r.msg; r.cust = cw.id; r.site = sw.id;
  return r;
}
function qfSaveCustomer_(db, a) {
  var cp = qfCustPlan_(db, a.id ? { mode: 'existing', id: a.id, fields: a.fields || {} } : { mode: 'new', fields: a.fields || {} });
  qfReadyUp_(db);
  var w = qfCustWrite_(db, cp);
  return { msg: w.added ? 'Customer ' + w.id + ' added.' : w.changed.length ? w.id + ' saved: ' + w.changed.join(', ') + '.' : 'No changes.', ref: w.id };
}
function qfSaveSite_(db, a) {
  var row = a.id ? must(db, 'Sites', 'SiteID', a.id) : null, cp = { row: must(db, 'Customers', 'CustID', row ? row.CustID : a.custId), patch: {} };
  var sp = qfSitePlan_(db, row ? { mode: 'existing', id: a.id, fields: a.fields || {} } : { mode: 'new', fields: a.fields || {} }, cp);
  qfReadyUp_(db);
  var w = qfSiteWrite_(db, sp, cp.row.CustID);
  return { msg: w.added ? 'Project ' + w.id + ' added.' : w.changed.length ? w.id + ' saved: ' + w.changed.join(', ') + '.' : 'No changes.', ref: w.id };
}
UI_ACTIONS_.saveQuoteFull = function (db, a) { return qfSaveQuoteFull_(db, a); };
UI_ACTIONS_.saveCustomerFull = function (db, a) { return qfSaveCustomer_(db, a); };
UI_ACTIONS_.saveSiteFull = function (db, a) { return qfSaveSite_(db, a); };

// ======================================================================= lookups (read-only)
function qfCustOut_(c) {
  return { id: c.CustID, name: c.Name, status: c.Status || '', address: qfStr_(c.Address), contact: qfStr_(c.ContactPerson), designation: qfStr_(c.Designation), phone: qfStr_(c.Phone),
    email: qfStr_(c.Email), bin: qfStr_(c.BIN), paymentDays: blank(c.PaymentDays) ? '' : num(c.PaymentDays) };
}
function qfSiteOut_(s) {
  return { id: s.SiteID, cust: s.CustID, project: qfStr_(s.Project), address: qfStr_(s.Address), siteRep: qfStr_(s.SiteRep), siteRepPhone: qfStr_(s.SiteRepPhone),
    startDate: blank(s.StartDate) ? '' : toDate(s.StartDate), status: s.Status || '', loc: s.LocID || '' };
}
function qfCustomerView_(db, id) {
  var c = must(db, 'Customers', 'CustID', id), names = {}, sites = db.rows('Sites').filter(function (s) { return !blank(s.SiteID); });
  db.rows('Customers').forEach(function (x) { names[x.CustID] = x.Name; });
  return {
    cust: qfCustOut_(c),
    projects: sites.filter(function (s) { return s.CustID === id; }).map(function (s) {
      var o = qfSiteOut_(s);
      o.shared = sites.filter(function (x) { return x.CustID !== id && qfKey_(x.Project) === qfKey_(s.Project) && qfKey_(x.Address) === qfKey_(s.Address); }).map(function (x) { return names[x.CustID] || x.CustID; });
      return o;
    }),
    quotes: db.rows('Quotes').filter(function (q) { return q.CustID === id && !blank(q.QuoteNo); }).map(function (q) {
      var s = find(sites, 'SiteID', q.SiteID);
      return { no: q.QuoteNo, rev: num(q.Rev), type: q.QuoteType, date: q.QuoteDate, status: q.Status, site: s ? s.Project : '', total: quoteTotals(db, q.QuoteNo).total };
    }).reverse(),
  };
}
// 2+ letters, project name or address, every client; this customer's own projects first
function qfSiteSearch_(db, q, custId) {
  var k = qfKey_(q), names = {};
  if (k.length < 2) return [];
  db.rows('Customers').forEach(function (x) { names[x.CustID] = x.Name; });
  return db.rows('Sites').filter(function (s) { return !blank(s.SiteID) && (qfKey_(s.Project) + ' ' + qfKey_(s.Address)).indexOf(k) >= 0; })
    .sort(function (a, b) { return (a.CustID === custId ? 0 : 1) - (b.CustID === custId ? 0 : 1); }).slice(0, 20)
    .map(function (s) { var o = qfSiteOut_(s); o.custName = names[s.CustID] || s.CustID; return o; });
}
function uiCustomerGet(id) { return uiRun_(function (db) { return qfCustomerView_(db, id); }, true); }
function uiSiteSearch(q, custId) { return uiRun_(function (db) { return qfSiteSearch_(db, q, custId); }, true); }
var QF_init0_ = uiInitDb_;
uiInitDb_ = function (db) {
  var r = QF_init0_(db), cu = {}, si = {};
  db.rows('Customers').forEach(function (c) { cu[c.CustID] = c; });
  db.rows('Sites').forEach(function (s) { si[s.SiteID] = s; });
  r.customers.forEach(function (c) { if (cu[c.id]) Object.assign(c, qfCustOut_(cu[c.id])); });
  r.sites.forEach(function (s) { if (si[s.id]) Object.assign(s, qfSiteOut_(si[s.id])); });
  return r;
};

// ======================================================================= panel (injected into the main panel)
var QF_HTML_ = `
// ================= customer + project picker, Customers & projects (QF1)
var QF_CF=[['name','Name'],['contact','Contact person'],['designation','Designation'],['phone','Phone'],['email','Email'],['address','Address',1],['bin','Client BIN'],['paymentDays','Payment days']];
var QF_SF=[['project','Project name'],['address','Address',1],['siteRep','Site contact'],['siteRepPhone','Site contact phone'],['startDate','Start date']];
function qfCust(id){return D.customers.filter(function(c){return c.id===id;})[0]||null;}
function qfSite(id){return D.sites.filter(function(s){return s.id===id;})[0]||null;}
function qfLow(s){return String(s==null?'':s).trim().toLowerCase();}
function qfForm(defs,v){var F={},g=el('div',{cls:'g'});v=v||{};
  defs.forEach(function(d){var k=d[0],x=k==='startDate'?inp(v[k]||'','date'):k==='paymentDays'?inp(v[k],'number','default'):inp(v[k],k==='phone'||k==='siteRepPhone'?'tel':'text',k==='email'?'one or more, comma separated':(k==='name'||k==='project'?'needed':'optional'));F[k]=x;add(g,fld(d[1],x,d[2]));});
  return {box:g,F:F,get:function(){var o={};Object.keys(F).forEach(function(k){o[k]=F[k].value.trim();});return o;}};}
function qfKv(defs,v){var b=el('div',{cls:'kv'});defs.forEach(function(d){var x=v[d[0]];if(x===''||x==null)return;add(b,[el('span',{text:d[1]}),el('span',{text:d[0]==='startDate'?fd(x):String(x)})]);});
  return b.children.length?b:el('p',{cls:'muted',text:'No details yet — Edit details to add them (all optional).'});}
function qfCard(title,cancel,body){return el('div',{cls:'card'},el('div',{cls:'top'},el('span',{text:title}),cancel?btn(cancel[0],cancel[1],'s x'):null),body);}
function qfPicker(h,F){var st={cm:'pick',ce:false,pm:'pick',pe:false,src:''},auto='',cf=null,pf=null,isNew=!h.QuoteNo;
  var cSel=sel(custOpts(),h.CustID||'','— choose customer —'),cPick=fld('Customer',cSel),newC=btn('+ New customer',function(){st.cm='new';st.ce=false;if(st.pm==='pick')pSel.value='';cChg(false);},'s x');
  var cArea=el('div'),pSel=sel([],null),pRow=fld('Project (this customer)',pSel),pArea=el('div'),q=inp('','text','2+ letters: project name or address'),res=el('div');
  var newP=btn('+ New project',function(){st.pm='new';st.pe=false;drawP();},'s x');
  function cid(){return st.cm==='new'?'':cSel.value;}
  function att(){var c=st.cm==='new'||st.ce?(cf?cf.get():{}):(qfCust(cSel.value)||{}),a=c.contact?c.contact+(c.designation?', '+c.designation:''):'';
    if(!F.Attention.value||F.Attention.value===auto)F.Attention.value=a;auto=a;}
  function drawC(){cArea.innerHTML='';cf=null;cPick.style.display=newC.style.display=st.cm==='new'?'none':'';
    if(st.cm==='new'){cf=qfForm(QF_CF,{});var w=el('div');
      cf.F.name.oninput=function(){w.innerHTML='';var n=qfLow(cf.F.name.value),d=n&&D.customers.filter(function(c){return qfLow(c.name)===n;})[0];
        if(d)add(w,el('div',{cls:'warn'},'Already a customer: '+d.name+' · '+d.id+'  ',btn('Use it',function(){st.cm='pick';cSel.value=d.id;cChg(true);},'s x')));};
      cf.F.contact.oninput=cf.F.designation.oninput=att;
      add(cArea,qfCard('New customer — only the name is needed now',['Cancel',function(){st.cm='pick';cChg(true);}],[cf.box,w]));return;}
    var c=qfCust(cSel.value);if(!c)return;
    if(st.ce){cf=qfForm(QF_CF,c);cf.F.contact.oninput=cf.F.designation.oninput=att;add(cArea,qfCard('Edit '+c.id+' — saved with the quote',['Keep as it was',function(){st.ce=false;drawC();att();}],cf.box));}
    else add(cArea,[qfKv(QF_CF.slice(1),c),btn('Edit details',function(){st.ce=true;drawC();},'s x')]);}
  function fillP(pre,one){var o=cid()?siteOpts(cid()):[];pSel.innerHTML='';add(pSel,el('option',{value:'',text:o.length?'— choose project (optional) —':'— no projects yet —'}));o.forEach(function(x){add(pSel,el('option',{value:x[0],text:x[1]}));});
    if(pre&&o.some(function(x){return x[0]===pre;}))pSel.value=pre;else if(one&&o.length===1)pSel.value=o[0][0];}
  function drawP(){pArea.innerHTML='';pf=null;pRow.style.display=st.pm==='pick'?'':'none';
    if(st.pm==='new'){pf=qfForm(QF_SF,{});add(pArea,qfCard('New project — only the name is needed now',['Cancel',function(){st.pm='pick';drawP();}],pf.box));return;}
    if(st.pm==='link'){var s=qfSite(st.src);pf=qfForm(QF_SF.slice(2),{});
      add(pArea,qfCard('Shared project: '+s.project+' (client '+custName(s.cust)+')',['Cancel',function(){st.pm='pick';drawP();}],[el('p',{cls:'muted',text:'On save it is added for this customer too: same name + address, its own site number and stock location. Site contact for this client (optional):'}),pf.box]));return;}
    var s2=qfSite(pSel.value);if(!s2)return;
    if(st.pe){pf=qfForm(QF_SF,s2);add(pArea,qfCard('Edit '+s2.id+' — saved with the quote',['Keep as it was',function(){st.pe=false;drawP();}],pf.box));}
    else add(pArea,[qfKv(QF_SF.slice(1),s2),btn('Edit details',function(){st.pe=true;drawP();},'s x')]);}
  function cChg(one){st.ce=false;if(st.pm==='link')st.pm='pick';drawC();fillP(one?'':h.SiteID,one);if(st.pm==='pick')st.pe=false;drawP();att();q.oninput();}
  q.oninput=function(){res.innerHTML='';var c=cid(),t=qfLow(q.value);if(t.length<2)return;
    var m=D.sites.filter(function(s){return (qfLow(s.project)+' '+qfLow(s.address)).indexOf(t)>=0;}).sort(function(a,b){return (a.cust===c?0:1)-(b.cust===c?0:1);}).slice(0,10);
    if(!m.length){add(res,el('p',{cls:'muted',text:'No project found — use + New project.'}));return;}
    m.forEach(function(s){var own=c&&s.cust===c,dup=!own&&c&&D.sites.filter(function(x){return x.cust===c&&qfLow(x.project)===qfLow(s.project)&&qfLow(x.address)===qfLow(s.address);})[0];
      add(res,el('div',{cls:'tile',style:'margin:3px 0',onclick:function(){q.value='';res.innerHTML='';var pick=own?s.id:dup?dup.id:'';
        if(pick){st.pm='pick';st.pe=false;pSel.value=pick;}else{st.pm='link';st.src=s.id;}drawP();}},
        el('b',{text:s.project||s.id}),el('span',{text:[s.address,custName(s.cust)+(own||dup?' (this customer)':'')].filter(function(x){return x;}).join(' · ')})));});};
  cSel.onchange=function(){cChg(true);};pSel.onchange=function(){st.pe=false;drawP();};
  var box=el('div',{style:'grid-column:1/-1'},el('div',{cls:'g'},cPick),newC,cArea,el('div',{cls:'g'},pRow,fld('…or search all projects',q)),res,newP,pArea);
  cChg(isNew);
  return {box:box,get:function(){var c={mode:st.cm==='new'?'new':'existing',id:cid()};if(cf)c.fields=cf.get();
    var s={mode:st.pm==='new'?'new':st.pm==='link'?'link':(pSel.value?'existing':'none'),id:st.pm==='pick'?pSel.value:'',src:st.pm==='link'?st.src:''};if(pf)s.fields=pf.get();
    return {customer:c,site:s};}};}
function qfCustScreen(id){var f=inp('','text','name, contact, phone or email'),list=el('div'),box=el('div');
  function draw(){list.innerHTML='';var t=qfLow(f.value),rows=D.customers.filter(function(c){return !t||qfLow([c.name,c.contact,c.phone,c.email,c.id].join(' ')).indexOf(t)>=0;});
    add(list,rows.length?tbl(['Customer','Contact','Phone',''],rows.slice(0,40).map(function(c){return [c.name+' · '+c.id+(c.status==='Inactive'?' (inactive)':''),c.contact||'',c.phone||'',btn('Open',function(){open(c.id);},'s x')];})):el('p',{cls:'muted',text:'No customer found.'}));}
  function open(cid){CUR[1]=cid;box.innerHTML='';add(box,'Loading…');call('uiCustomerGet',cid).then(function(r){box.innerHTML='';add(box,qfCustView(r));},fail);}
  f.oninput=draw;draw();if(id)open(id);
  return el('div',null,el('h2',{text:'Customers & projects'}),btn('+ New customer',function(){CUR[1]=null;box.innerHTML='';var cf=qfForm(QF_CF,{});
    add(box,[el('h3',{text:'New customer'}),cf.box,btn('Save customer',function(){act('saveCustomerFull',{fields:cf.get()}).then(function(x){go('customer',x.ref,true);}).catch(function(){});})]);},'x'),fld('Find',f),list,box);}
function qfCustView(r){var c=r.cust,cf=qfForm(QF_CF,c),back=function(){go('customer',c.id,true);};
  var out=el('div',null,el('h3',{text:c.name+' · '+c.id}),cf.box,btn('Save customer details',function(){act('saveCustomerFull',{id:c.id,fields:cf.get()}).then(back).catch(function(){});}));
  add(out,el('h3',{text:'Projects ('+r.projects.length+')'}));
  r.projects.forEach(function(p){var pf=qfForm(QF_SF,p);add(out,qfCard(p.id+' · '+(p.status||'—')+(p.loc?' · '+p.loc:'')+(p.shared.length?' · shared with '+p.shared.join(', '):''),null,[pf.box,
    btn('Save project',function(){act('saveSiteFull',{id:p.id,fields:pf.get()}).then(back).catch(function(){});},'s x')]));});
  var nf=qfForm(QF_SF,{});add(out,qfCard('+ New project for '+c.name,null,[nf.box,btn('Add project',function(){act('saveSiteFull',{custId:c.id,fields:nf.get()}).then(back).catch(function(){});},'s x')]));
  add(out,el('h3',{text:'Quotes ('+r.quotes.length+')'}));
  add(out,r.quotes.length?tbl(['Quote','Project','Status','Total',''],r.quotes.map(function(q){return [q.no+(q.rev?' R'+q.rev:'')+' · '+q.type+' · '+fd(q.date),q.site||'—',chip(q.status),tk(q.total),btn('Open',function(){go('quotes',q.no);},'s x')];})):el('p',{cls:'muted',text:'No quotes yet.'}));
  return out;}
S.customer=qfCustScreen;TITLES.customer='Customers & projects';
`;
var QF_INJECT_ = [
  ["F.CustID.onchange=function(){var s=F.SiteID;s.innerHTML='';add(s,el('option',{value:'',text:'— site (optional) —'}));siteOpts(F.CustID.value).forEach(function(o){add(s,el('option',{value:o[0],text:o[1]}));});};",
    "var QFP=qfPicker(h,F);"],
  ["fld('Customer',F.CustID,1),fld('Site',F.SiteID,1),", "QFP.box,"],
  ["act('saveQuote',{quoteNo:no,header:hv,lines:L.map(function(c){return c.get();})})",
    "act('saveQuoteFull',Object.assign({quoteNo:no,header:hv,lines:L.map(function(c){return c.get();})},QFP.get()))"],
  ["tile('Customers & sites','Add a client or site','customer')", "tile('Customers & projects','Find · edit · projects · quotes','customer')"],
  ['// ================= start', QF_HTML_ + '\n// ================= start'],
];
var QF_INJECTED_ = 0;
if (typeof UI_HTML_ === 'string') QF_INJECT_.forEach(function (x) {
  if (UI_HTML_.indexOf(x[0]) < 0) return;
  UI_HTML_ = UI_HTML_.replace(x[0], function () { return x[1]; }); QF_INJECTED_++;
});

// ======================================================================= self-test (in memory, your data is not touched)
if (typeof selfTestAllParts_ === 'function') {
  var QF_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return QF_parts0_().concat([['QF', selfTestQF()]]); };
}
function selfTestQF() {
  var T = testKit_(), eq = T.eq, step = T.step, throws = T.throws, db = testSeed_('Full period');
  var run = function (x, a) { return uiDoDb_(db, x, a); }, row = function (t, k, id) { return must(db, t, k, id); };
  var L1 = [{ ItemCode: 'RL-STD-20', Qty: 10, Months: 1, Rate: 90 }];
  var H = function (o) { return Object.assign({ QuoteType: 'Rental', QuoteDate: '2026-11-20', VATPct: '15%', AdvancePct: '50%' }, o || {}); };
  var cnt = function () { return ['Customers', 'Sites', 'Locations', 'Quotes', 'QuoteLines', 'Log'].map(function (t) { return db.rows(t).length; }).join(' ') + ' | ' + db.headers('Customers').length + ' ' + row('Sequences', 'SeqKey', 'CUST').LastNo; };
  var lastLog = function (a) { var l = db.rows('Log').filter(function (x) { return x.Action === a; }).pop(); return l ? l.Ref + ' ' + l.Details : '-'; };
  var full = function (o) { return Object.assign({ header: H(), lines: L1 }, o); };
  var NEW = {
    customer: { mode: 'new', fields: { name: 'Delta Builders Ltd.', contact: 'Mr. Karim', designation: 'Project Manager', phone: '01711000000', email: 'karim@delta.com; accounts@delta.com', address: 'Uttara, Dhaka', bin: '000123456-0101', paymentDays: '' } },
    site: { mode: 'new', fields: { project: 'Tower 2', address: 'Plot 5, Uttara', siteRep: 'Rahim', siteRepPhone: '+8801811000000', startDate: '2026-12-01' } },
  };
  var nc = function (f) { return { mode: 'new', fields: f }; };
  step('F refused saves write nothing', function () {
    eq('F1 panel injected (5 places)', QF_INJECTED_, 5);
    var c0 = cnt();
    throws('F2 bad line: customer + project + quote all refused', function () { run('saveQuoteFull', Object.assign({ header: H(), lines: [{ ItemCode: 'RL-STD-20', Qty: 0, Rate: 1 }] }, NEW)); }, /quantity/);
    throws('F3 bad email', function () { run('saveQuoteFull', full({ customer: nc({ name: 'X Ltd', email: 'x@' }) })); }, /not a valid address/);
    throws('F4 bad phone', function () { run('saveQuoteFull', full({ customer: nc({ name: 'X Ltd', phone: 'call me' }) })); }, /digits/);
    throws('F5 payment days 400', function () { run('saveQuoteFull', full({ customer: nc({ name: 'X Ltd', paymentDays: '400' }) })); }, /0 to 365/);
    throws('F6 new customer needs a name', function () { run('saveQuoteFull', full({ customer: nc({ name: '  ' }) })); }, /name is needed/);
    throws('F7 duplicate name offers the existing one', function () { run('saveQuoteFull', full({ customer: nc({ name: ' test  client ' }) })); }, /already exists \(CUST-0001\) — pick it/);
    throws('F8 another client\'s project picked directly', function () { run('saveQuoteFull', full({ customer: nc({ name: 'X Ltd' }), site: { mode: 'existing', id: 'SITE-0001' } })); }, /belongs to another customer/);
    throws('F9 no customer chosen', function () { run('saveQuoteFull', full({ customer: { mode: 'existing', id: '' } })); }, /Choose the customer/);
    throws('F10 new project needs a name', function () { run('saveQuoteFull', full({ customer: { mode: 'existing', id: 'CUST-0001' }, site: { mode: 'new', fields: { address: 'x' } } })); }, /Project name is needed/);
    eq('F11 nothing written (rows, columns, numbers)', cnt(), c0);
  });
  step('F new customer + new project + quote in one save', function () {
    var r = run('saveQuoteFull', Object.assign({ header: H({ Attention: '' }), lines: L1 }, NEW)), q = row('Quotes', 'QuoteNo', r.ref), c = row('Customers', 'CustID', r.cust), s = row('Sites', 'SiteID', r.site);
    eq('F12 numbers + own stock location', [r.ref, r.cust, r.site, s.LocID].join(' '), 'CAE/Q/2026/001 CUST-0002 SITE-0002 LOC-S0002');
    eq('F13 quote linked to both', q.CustID + ' ' + q.SiteID, r.cust + ' ' + r.site);
    eq('F14 Attention from contact + designation', q.Attention, 'Mr. Karim, Project Manager');
    eq('F15 customer fields', [c.Name, c.Address, c.Designation, c.Phone, c.Email, c.BIN, c.PaymentDays, c.Status].join('|'), 'Delta Builders Ltd.|Uttara, Dhaka|Project Manager|01711000000|karim@delta.com, accounts@delta.com|000123456-0101|7|Active');
    eq('F16 phones kept as text', typeof c.Phone + ' ' + typeof s.SiteRepPhone, 'string string');
    eq('F17 project fields', [s.Project, s.Address, s.SiteRep, s.SiteRepPhone, fmtDay(dayNum(s.StartDate)), s.CustID, s.Status].join('|'), 'Tower 2|Plot 5, Uttara|Rahim|+8801811000000|01-Dec-2026|CUST-0002|Planned');
    eq('F18 set-up done by the first save, once', db.headers('Customers').indexOf('Designation') >= 0 && upgradeQF(db).length === 0, true);
    eq('F19 message', r.msg.split('\n')[0], 'New customer CUST-0002. New project SITE-0002.');
  });
  step('F edit customer + project through the quote', function () {
    var r = run('saveQuoteFull', {
      quoteNo: 'CAE/Q/2026/001', header: H({ Attention: 'Mr. Karim, Project Manager' }), lines: L1,
      customer: { mode: 'existing', id: 'CUST-0002', fields: { name: 'Delta Builders Ltd.', contact: 'Mr. Karim', designation: 'Director', phone: '01711000000', email: 'karim@delta.com, accounts@delta.com', address: 'Uttara, Dhaka', bin: '000123456-0101', paymentDays: '15' } },
      site: { mode: 'existing', id: 'SITE-0002', fields: { project: 'Tower 2', address: 'Plot 5, Uttara', siteRep: 'Rahim Uddin', siteRepPhone: '+8801811000000', startDate: '2026-12-01' } },
    });
    eq('F20 only changed fields written + logged', lastLog('Customer updated') + ' / ' + lastLog('Site updated'), 'CUST-0002 Designation, PaymentDays / SITE-0002 SiteRep');
    eq('F21 values', [row('Customers', 'CustID', 'CUST-0002').Designation, row('Customers', 'CustID', 'CUST-0002').PaymentDays, row('Sites', 'SiteID', 'SITE-0002').SiteRep].join(' '), 'Director 15 Rahim Uddin');
    eq('F22 no new rows', [db.rows('Customers').length, db.rows('Sites').length, db.rows('Quotes').length].join(' '), '2 2 1');
    eq('F23 message', r.msg.split('\n')[0], 'CUST-0002 details updated (Designation, PaymentDays). SITE-0002 details updated (SiteRep).');
    throws('F24 rename to an existing name refused', function () { run('saveQuoteFull', { quoteNo: 'CAE/Q/2026/001', header: H(), lines: L1, customer: { mode: 'existing', id: 'CUST-0002', fields: { name: 'Test Client' } } }); }, /already exists \(CUST-0001\)/);
    throws('F25 empty name refused', function () { run('saveCustomerFull', { id: 'CUST-0002', fields: { name: '' } }); }, /cannot be empty/);
    eq('F26 refused edits left it', row('Customers', 'CustID', 'CUST-0002').Name, 'Delta Builders Ltd.');
  });
  step('F shortlist + search + shared project', function () {
    eq('F27 shortlist = this customer\'s projects', qfCustomerView_(db, 'CUST-0001').projects.map(function (p) { return p.id; }).join(), 'SITE-0001');
    eq('F28 search needs 2 letters', qfSiteSearch_(db, 't', '').length, 0);
    eq('F29 search all clients, own first', qfSiteSearch_(db, 'TOWER', 'CUST-0002').map(function (s) { return s.id + ' ' + s.custName; }).join(', '), 'SITE-0002 Delta Builders Ltd., SITE-0001 Test Client');
    eq('F30 search by address', qfSiteSearch_(db, 'plot 5', 'CUST-0001').map(function (s) { return s.id; }).join(), 'SITE-0002');
    db.update('Sites', row('Sites', 'SiteID', 'SITE-0001'), { Address: 'Gazipur' });
    var r = run('saveQuoteFull', full({ customer: { mode: 'existing', id: 'CUST-0002' }, site: { mode: 'link', src: 'SITE-0001', fields: { project: 'ignored', siteRep: 'Kamal' } } })), s = row('Sites', 'SiteID', r.site);
    eq('F31 shared project: new SiteID, same name + address, own LOC', [r.site, s.CustID, s.Project, s.Address, s.SiteRep, s.LocID].join('|'), 'SITE-0003|CUST-0002|Tower A|Gazipur|Kamal|LOC-S0003');
    eq('F32 the other client sees it shared', qfCustomerView_(db, 'CUST-0001').projects[0].shared.join(), 'Delta Builders Ltd.');
    eq('F33 log', lastLog('Site linked'), 'SITE-0003 CUST-0002 · Tower A (same project as SITE-0001 of CUST-0001)');
    throws('F34 linking twice refused', function () { run('saveQuoteFull', full({ customer: { mode: 'existing', id: 'CUST-0002' }, site: { mode: 'link', src: 'SITE-0001' } })); }, /already has this project \(SITE-0003/);
    throws('F35 same new project twice refused', function () { run('saveQuoteFull', full({ customer: { mode: 'existing', id: 'CUST-0002' }, site: { mode: 'new', fields: { project: 'tower 2', address: 'Plot 5,  Uttara' } } })); }, /already has this project \(SITE-0002/);
    var r2 = run('saveQuoteFull', full({ customer: { mode: 'existing', id: 'CUST-0002' }, site: { mode: 'link', src: 'SITE-0002' } }));
    eq('F36 own project via search = picked, no new row', r2.site + ' ' + db.rows('Sites').length, 'SITE-0002 3');
  });
  step('F Customers & projects screen', function () {
    eq('F37 new customer', run('saveCustomerFull', { fields: { name: 'Echo Ltd', phone: '029' } }).msg, 'Customer CUST-0003 added.');
    eq('F38 edit saves only the change', run('saveCustomerFull', { id: 'CUST-0003', fields: { name: 'Echo Ltd', phone: '029', email: 'a@echo.com', paymentDays: '7' } }).msg, 'CUST-0003 saved: Email.');
    eq('F39 nothing changed', run('saveCustomerFull', { id: 'CUST-0003', fields: { name: 'Echo Ltd', email: 'a@echo.com' } }).msg, 'No changes.');
    var p = run('saveSiteFull', { custId: 'CUST-0003', fields: { project: 'Depot' } });
    eq('F40 new project + location', p.msg + ' ' + row('Sites', 'SiteID', p.ref).LocID, 'Project SITE-0004 added. LOC-S0004');
    eq('F41 project edit', run('saveSiteFull', { id: 'SITE-0004', fields: { project: 'Depot', address: 'Tejgaon', startDate: '2027-01-05' } }).msg, 'SITE-0004 saved: Address, StartDate.');
    throws('F42 project name cannot be emptied', function () { run('saveSiteFull', { id: 'SITE-0004', fields: { project: '' } }); }, /cannot be empty/);
    var v = qfCustomerView_(db, 'CUST-0002');
    eq('F43 customer view: projects + quotes', v.projects.length + ' ' + v.quotes.length + ' ' + v.quotes[0].no + ' ' + v.cust.designation, '2 3 CAE/Q/2026/003 Director');
    var init = uiClean_(uiInitDb_(db)), ci = find(init.customers, 'id', 'CUST-0002'), si = find(init.sites, 'id', 'SITE-0004');
    eq('F44 panel data carries the details', [ci.contact, ci.designation, ci.phone, si.project, si.address, si.startDate, si.name].join('|'), 'Mr. Karim|Director|01711000000|Depot|Tejgaon|2027-01-05|Depot');
    quoteToJob(db, 'CAE/Q/2026/001', { date: '22-Nov-2026' });
    throws('F45 quote with a job: refused', function () { run('saveQuoteFull', { quoteNo: 'CAE/Q/2026/001', header: H(), lines: L1, customer: { mode: 'existing', id: 'CUST-0002', fields: { designation: 'MD' } } }); }, /already has job/);
    eq('F46 …and the customer edit was not written', row('Customers', 'CustID', 'CUST-0002').Designation, 'Director');
  });
  step('F panel', function () {
    var js = UI_HTML_.slice(UI_HTML_.indexOf('<script>') + 8, UI_HTML_.lastIndexOf('</script>'));
    eq('F47 panel script compiles', (function () { try { new Function(js); return 'ok'; } catch (e) { return e.message; } })(), 'ok');
    var used = {}, re = /act\('(\w+)'/g, m; while ((m = re.exec(UI_HTML_))) used[m[1]] = 1;
    eq('F48 every panel action exists', Object.keys(used).filter(function (k) { return !UI_ACTIONS_[k]; }).join(',') || 'none', 'none');
    var gets = {}, rg = /call\('uiGet','(\w+)'/g; while ((m = rg.exec(UI_HTML_))) gets[m[1]] = 1;
    eq('F49 no new uiGet lookups', Object.keys(gets).sort().join(','), 'challans,docs,job,open,po,pos,quote,stock');
    eq('F50 picker + save + Terms flow + screen', /var QFP=qfPicker\(h,F\)/.test(UI_HTML_) && /act\('saveQuoteFull'/.test(UI_HTML_) && /QFP\.get\(\)\)\)\.then\(function\(x\)\{go\('terms',x\.ref,true\);\}\)/.test(UI_HTML_) && /S\.customer=qfCustScreen/.test(UI_HTML_) && !/fld\('Customer',F\.CustID/.test(UI_HTML_), true);
  });
  return { pass: T.pass, fail: T.fail, log: T.log };
}
