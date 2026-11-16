// ============================================================================
// CAE_Ops_Office.gs — 15th .gs file, appended LAST.
// Order: Code, PDF, UI, Reports, App, Sets, Order, QuoteReq, Site, Roles, Terms,
//        QuoteForm, QuoteForm2, QuoteApp, Office.  + HTML file "Office" (the web app page).
// W1 (16 Nov 2026): web app entry (doGet) + own login for office AND site staff.
//   - Logins are pre-registered by the admin: any email (personal ones allowed), a role, a password.
//   - Only the admin sets / resets passwords; users cannot change them. Block = all sessions end at once.
//   - 5 wrong passwords -> that email is locked 15 min. Sessions 8 h, or 30 days with "keep me signed in".
//   - Stored in Script Properties only (never in the sheet):
//       OL:<email>  login {email,name,role,status,salt,hash,epoch,created,last}
//       OS:<token>  session {email,epoch,exp}
//       OF:<email>  failed tries {n,until}
//   - Every later web-app server call starts with officeGate_(token, roles).
// Replaces: doGet (if an earlier file had one — check before install).
// Wraps: onOpen (adds the "Web app" menu), selfTestAllParts_ (adds 'OF').
// ============================================================================

var OFFICE_ROLES_ = ['Admin', 'Accounts', 'Viewer', 'Yard', 'Field'];
var OFFICE_CFG_ = { maxFails: 5, lockMin: 15, shortH: 8, keepD: 30, iters: 300, minPw: 8 };
var OFFICE_ENV_ = null; // self-tests put an in-memory env here

function officeEnv_() {
  var P = PropertiesService.getScriptProperties();
  var hex = function () { return Utilities.getUuid().replace(/-/g, ''); };
  return {
    get: function (k) { var v = P.getProperty(k); return v ? JSON.parse(v) : null; },
    put: function (k, o) { P.setProperty(k, JSON.stringify(o)); },
    del: function (k) { P.deleteProperty(k); },
    keys: function () { return P.getKeys(); },
    now: function () { return Date.now(); },
    rand: function () { return hex() + hex(); }, // 64 hex chars
    sha: function (s) {
      return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
    },
    lock: function (fn) { var l = LockService.getScriptLock(); l.waitLock(10000); try { return fn(); } finally { l.releaseLock(); } }
  };
}
function oEnv_() { return OFFICE_ENV_ || officeEnv_(); }
function oEmail_(e) { return String(e == null ? '' : e).trim().toLowerCase(); }
function oEmailOk_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 120; }
function oHash_(env, salt, pw) { var h = salt + '|' + pw; for (var i = 0; i < OFFICE_CFG_.iters; i++) h = env.sha(salt + h); return h; }
function oSame_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
function oPublic_(L) { return { email: L.email, name: L.name, role: L.role }; }
function oFail_(code) { throw new Error(code); }

// ----------------------------------------------------------------- web app entry
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Office')
    .setTitle('Core Access · Office')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('mobile-web-app-capable', 'yes');
}

// ----------------------------------------------------------------- sign in / session
// Errors reach the page as message codes: BAD|<tries left>, LOCKED|<minutes>, BLOCKED, NOSESSION, NOACCESS.
function officeLogin(email, pw, keep) {
  var env = oEnv_();
  email = oEmail_(email); pw = String(pw == null ? '' : pw);
  if (!oEmailOk_(email) || !pw || pw.length > 200) oFail_('BAD|' + OFFICE_CFG_.maxFails);
  return env.lock(function () {
    var now = env.now(), fk = 'OF:' + email, f = env.get(fk) || { n: 0, until: 0 };
    if (f.until > now) oFail_('LOCKED|' + Math.ceil((f.until - now) / 60000));
    if (f.until && f.until <= now) f = { n: 0, until: 0 };
    var L = env.get('OL:' + email);
    var ok = !!(L && L.hash && oSame_(oHash_(env, L.salt, pw), L.hash));
    if (!ok) {
      f.n++;
      if (f.n >= OFFICE_CFG_.maxFails) { env.put(fk, { n: 0, until: now + OFFICE_CFG_.lockMin * 60000 }); oFail_('LOCKED|' + OFFICE_CFG_.lockMin); }
      env.put(fk, f); oFail_('BAD|' + (OFFICE_CFG_.maxFails - f.n));
    }
    env.del(fk);
    if (L.status !== 'Active') oFail_('BLOCKED'); // only told after a correct password
    oSweep_(env, now);
    var token = env.rand();
    env.put('OS:' + token, { email: email, epoch: L.epoch || 0, exp: now + (keep ? OFFICE_CFG_.keepD * 864e5 : OFFICE_CFG_.shortH * 36e5) });
    L.last = now; env.put('OL:' + email, L);
    return { token: token, user: oPublic_(L) };
  });
}
function officeSession_(token) {
  var env = oEnv_(); token = String(token == null ? '' : token);
  if (!/^[a-f0-9]{64}$/.test(token)) oFail_('NOSESSION');
  var s = env.get('OS:' + token), now = env.now();
  if (!s || s.exp <= now) { if (s) env.del('OS:' + token); oFail_('NOSESSION'); }
  var L = env.get('OL:' + s.email);
  if (!L || L.status !== 'Active' || (L.epoch || 0) !== s.epoch) { env.del('OS:' + token); oFail_('NOSESSION'); }
  return L;
}
function officeGate_(token, roles) {
  var L = officeSession_(token);
  if (roles && roles.indexOf(L.role) < 0) oFail_('NOACCESS');
  return L;
}
function officeMe(token) { return oPublic_(officeSession_(token)); }
function officeLogout(token) {
  token = String(token == null ? '' : token);
  if (/^[a-f0-9]{64}$/.test(token)) oEnv_().del('OS:' + token);
  return true;
}
function oSweep_(env, now) {
  env.keys().forEach(function (k) {
    if (k.indexOf('OS:') !== 0) return;
    var s = env.get(k); if (!s || s.exp <= now) env.del(k);
  });
}

// ----------------------------------------------------------------- admin: logins (menu now, W2 screen later)
// o = {email, name, role, password, status}. Blank name/role keep the old values. Password change or Block ends all sessions.
function oSaveLogin_(env, o) {
  var email = oEmail_(o.email);
  if (!oEmailOk_(email)) throw new Error('Not a valid email: ' + o.email);
  return env.lock(function () {
    var L = env.get('OL:' + email), isNew = !L;
    L = L || { email: email, name: '', role: '', status: 'Active', salt: '', hash: '', epoch: 0, created: env.now(), last: 0 };
    if (o.name != null && String(o.name).trim()) L.name = String(o.name).trim().slice(0, 80);
    if (o.role != null && String(o.role).trim()) {
      var r = OFFICE_ROLES_.filter(function (x) { return x.toLowerCase() === String(o.role).trim().toLowerCase(); })[0];
      if (!r) throw new Error('Role must be one of: ' + OFFICE_ROLES_.join(', '));
      if (r !== L.role) L.epoch++;
      L.role = r;
    }
    if (!L.name) throw new Error('Name is needed for a new login.');
    if (!L.role) throw new Error('Role is needed for a new login.');
    if (o.password != null && o.password !== '') {
      var pw = String(o.password);
      if (pw.length < OFFICE_CFG_.minPw) throw new Error('Password must be at least ' + OFFICE_CFG_.minPw + ' characters.');
      L.salt = env.rand().slice(0, 32); L.hash = oHash_(env, L.salt, pw); L.epoch++;
      env.del('OF:' + email);
    }
    if (isNew && !L.hash) throw new Error('A password is needed for a new login.');
    if (o.status != null && o.status !== L.status) {
      if (o.status !== 'Active' && o.status !== 'Blocked') throw new Error('Status must be Active or Blocked.');
      L.status = o.status; L.epoch++;
    }
    env.put('OL:' + email, L);
    return oPublic_(L);
  });
}
function oListLogins_(env) {
  return env.keys().filter(function (k) { return k.indexOf('OL:') === 0; }).map(function (k) {
    var L = env.get(k); return { email: L.email, name: L.name, role: L.role, status: L.status, last: L.last || 0 };
  }).sort(function (a, b) { return a.email < b.email ? -1 : 1; });
}
function oMakePassword_(env) {
  var cs = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', h = env.rand(), out = '';
  for (var i = 0; i < 10; i++) out += cs.charAt(parseInt(h.substr(i * 2, 2), 16) % cs.length);
  return out;
}

// Sheet menu "Web app" (admin only — the sheet itself is admin-only).
if (typeof onOpen === 'function') {
  var OF_onOpen0_ = onOpen;
  onOpen = function (e) { OF_onOpen0_(e); officeMenu_(); };
}
function officeMenu_() {
  SpreadsheetApp.getUi().createMenu('Web app')
    .addItem('Add / change a login', 'menuOfficeLogin')
    .addItem('Block / unblock a login', 'menuOfficeBlock')
    .addItem('List logins', 'menuOfficeList')
    .addItem('Web app link', 'menuOfficeLink')
    .addToUi();
}
function oAsk_(ui, title, text) {
  var r = ui.prompt(title, text, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return null;
  return r.getResponseText().trim();
}
function menuOfficeLogin() {
  var ui = SpreadsheetApp.getUi(), env = oEnv_();
  var email = oAsk_(ui, 'Web app login', 'Email of the person (personal email is fine):'); if (email == null) return;
  var old = env.get('OL:' + oEmail_(email));
  var nr = oAsk_(ui, 'Web app login', (old ? 'Now: ' + old.name + ', ' + old.role + '. Leave blank to keep.\n' : '') +
    'Name, role  (e.g.  Jamal Uddin, Admin)\nRoles: ' + OFFICE_ROLES_.join(', ')); if (nr == null) return;
  var pw = oAsk_(ui, 'Web app login', (old ? 'New password (blank = keep the old one, type NEW to make one):' : 'Password (blank = make one for me):'));
  if (pw == null) return;
  var parts = nr ? nr.split(',') : [], made = '';
  if (!old && !pw || /^new$/i.test(pw)) { made = oMakePassword_(env); pw = made; }
  try {
    var u = oSaveLogin_(env, { email: email, name: parts[0], role: parts[1], password: pw });
    ui.alert('Saved', u.email + ' · ' + u.name + ' · ' + u.role + (made ? '\n\nPassword: ' + made + '\n(shown once — give it to the person)' : (pw ? '\n\nPassword changed. Old sign-ins have ended.' : '')), ui.ButtonSet.OK);
  } catch (err) { ui.alert('Not saved', err.message, ui.ButtonSet.OK); }
}
function menuOfficeBlock() {
  var ui = SpreadsheetApp.getUi(), env = oEnv_();
  var email = oAsk_(ui, 'Block / unblock', 'Email of the login:'); if (email == null) return;
  var L = env.get('OL:' + oEmail_(email));
  if (!L) { ui.alert('No login for ' + email); return; }
  var to = L.status === 'Active' ? 'Blocked' : 'Active';
  if (ui.alert(L.name + ' is ' + L.status, 'Change to ' + to + '?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  oSaveLogin_(env, { email: L.email, status: to });
  ui.alert(L.email + ' is now ' + to + (to === 'Blocked' ? '. All sign-ins have ended.' : '.'));
}
function menuOfficeList() {
  var rows = oListLogins_(oEnv_()).map(function (x) {
    return x.email + ' · ' + x.name + ' · ' + x.role + ' · ' + x.status + ' · last ' + (x.last ? Utilities.formatDate(new Date(x.last), Session.getScriptTimeZone(), 'd MMM yyyy HH:mm') : 'never');
  });
  SpreadsheetApp.getUi().alert('Web app logins (' + rows.length + ')', rows.join('\n') || 'None yet.', SpreadsheetApp.getUi().ButtonSet.OK);
}
function menuOfficeLink() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert('Web app link', url || 'Not deployed yet: Deploy › New deployment › Web app (execute as me, access Anyone).', SpreadsheetApp.getUi().ButtonSet.OK);
}

// ----------------------------------------------------------------- self-test (in memory; real logins untouched)
if (typeof selfTestAllParts_ === 'function') {
  var OF_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return OF_parts0_().concat([['OF', selfTestOffice()]]); };
}
function oMemEnv_() {
  var store = {}, t = { now: 1.8e12 }, seq = 0;
  return {
    store: store, clock: t,
    get: function (k) { return store[k] ? JSON.parse(store[k]) : null; },
    put: function (k, o) { store[k] = JSON.stringify(o); },
    del: function (k) { delete store[k]; },
    keys: function () { return Object.keys(store); },
    now: function () { return t.now; },
    rand: function () { seq++; var s = ''; while (s.length < 64) s += ((seq * 2654435761 + s.length * 40503) >>> 0).toString(16); return s.slice(0, 64); },
    sha: function (s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return 'h' + h.toString(36); },
    lock: function (fn) { return fn(); }
  };
}
function selfTestOffice() {
  var pass = 0, fail = 0, log = [];
  var eq = function (n, got, want) { if (got === want) pass++; else { fail++; log.push('FAIL ' + n + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); } };
  var err = function (fn) { try { fn(); return 'no error'; } catch (e) { return e.message; } };
  var keep = OFFICE_ENV_, env = oMemEnv_(); OFFICE_ENV_ = env;
  try {
    var H = 36e5, D = 864e5, M = 60000;
    eq('O1 add login', oSaveLogin_(env, { email: ' Jamal@Test.com ', name: 'Jamal Uddin', role: 'admin', password: 'GoodPass1' }).role, 'Admin');
    eq('O2 bad role refused', /Role must be/.test(err(function () { oSaveLogin_(env, { email: 'x@test.com', name: 'X', role: 'Boss', password: 'GoodPass1' }); })), true);
    eq('O3 short password refused', /at least 8/.test(err(function () { oSaveLogin_(env, { email: 'x@test.com', name: 'X', role: 'Field', password: 'short' }); })), true);
    eq('O4 bad email refused', /valid email/.test(err(function () { oSaveLogin_(env, { email: 'nope', name: 'X', role: 'Field', password: 'GoodPass1' }); })), true);
    eq('O5 new login needs a password', /password is needed/.test(err(function () { oSaveLogin_(env, { email: 'y@test.com', name: 'Y', role: 'Field' }); })), true);
    oSaveLogin_(env, { email: 'site1@test.com', name: 'Site One', role: 'Field', password: 'SitePass1' });
    var r = officeLogin('JAMAL@test.com ', 'GoodPass1', false);
    eq('O6 sign in (case / spaces ignored)', /^[a-f0-9]{64}$/.test(r.token) && r.user.role === 'Admin', true);
    eq('O7 public user has no secrets', JSON.stringify(r.user).indexOf('hash') < 0 && JSON.stringify(r.user).indexOf('salt') < 0, true);
    eq('O8 password not stored as text', JSON.stringify(env.store).indexOf('GoodPass1') < 0, true);
    eq('O9 me', officeMe(r.token).email, 'jamal@test.com');
    eq('O10 wrong password', err(function () { officeLogin('jamal@test.com', 'nope', false); }), 'BAD|4');
    eq('O11 unknown email looks the same', err(function () { officeLogin('ghost@test.com', 'whatever1', false); }), 'BAD|4');
    eq('O12 good sign-in clears the count', !!officeLogin('jamal@test.com', 'GoodPass1', false).token && !env.get('OF:jamal@test.com'), true);
    for (var i = 0; i < 4; i++) err(function () { officeLogin('site1@test.com', 'bad', false); });
    eq('O13 5th wrong locks 15 min', err(function () { officeLogin('site1@test.com', 'bad', false); }), 'LOCKED|15');
    eq('O14 right password while locked', err(function () { officeLogin('site1@test.com', 'SitePass1', false); }), 'LOCKED|15');
    env.clock.now += 14 * M;
    eq('O15 minutes left counts down', err(function () { officeLogin('site1@test.com', 'SitePass1', false); }), 'LOCKED|1');
    env.clock.now += 2 * M;
    eq('O16 lock ends after 15 min', officeLogin('site1@test.com', 'SitePass1', false).user.role, 'Field');
    var s1 = officeLogin('site1@test.com', 'SitePass1', true).token;
    oSaveLogin_(env, { email: 'site1@test.com', status: 'Blocked' });
    eq('O17 block ends sessions', err(function () { officeMe(s1); }), 'NOSESSION');
    eq('O18 blocked + right password', err(function () { officeLogin('site1@test.com', 'SitePass1', false); }), 'BLOCKED');
    eq('O19 blocked + wrong password says nothing', err(function () { officeLogin('site1@test.com', 'wrongpass', false); }), 'BAD|4');
    oSaveLogin_(env, { email: 'site1@test.com', status: 'Active' });
    eq('O20 unblock does not revive old session', err(function () { officeMe(s1); }), 'NOSESSION');
    var s2 = officeLogin('site1@test.com', 'SitePass1', false).token;
    oSaveLogin_(env, { email: 'site1@test.com', password: 'NewPass12' });
    eq('O21 password reset ends sessions', err(function () { officeMe(s2); }), 'NOSESSION');
    eq('O22 old password no longer works', err(function () { officeLogin('site1@test.com', 'SitePass1', false); }), 'BAD|4');
    eq('O23 new password works', officeLogin('site1@test.com', 'NewPass12', false).user.email, 'site1@test.com');
    var a = officeLogin('jamal@test.com', 'GoodPass1', false).token, k = officeLogin('jamal@test.com', 'GoodPass1', true).token;
    env.clock.now += 8 * H - 1000; eq('O24 short session alive at 8 h', officeMe(a).role, 'Admin');
    env.clock.now += 2000; eq('O25 short session ends after 8 h', err(function () { officeMe(a); }), 'NOSESSION');
    env.clock.now += 29 * D - 8 * H; eq('O26 keep session alive at 29 days', officeMe(k).role, 'Admin');
    env.clock.now += 2 * D; eq('O27 keep session ends after 30 days', err(function () { officeMe(k); }), 'NOSESSION');
    var g = officeLogin('site1@test.com', 'NewPass12', false).token;
    eq('O28 gate lets the right role in', officeGate_(g, ['Yard', 'Field']).role, 'Field');
    eq('O29 gate keeps others out', err(function () { officeGate_(g, ['Admin', 'Accounts']); }), 'NOACCESS');
    oSaveLogin_(env, { email: 'site1@test.com', role: 'Yard' });
    eq('O30 role change ends sessions', err(function () { officeMe(g); }), 'NOSESSION');
    eq('O31 junk token', err(function () { officeMe('abc'); }), 'NOSESSION');
    eq('O32 made-up token', err(function () { officeMe(new Array(65).join('a')); }), 'NOSESSION');
    var lo = officeLogin('jamal@test.com', 'GoodPass1', false).token; officeLogout(lo);
    eq('O33 sign out ends session', err(function () { officeMe(lo); }), 'NOSESSION');
    oSaveLogin_(env, { email: 'twin@test.com', name: 'Twin', role: 'Viewer', password: 'GoodPass1' });
    eq('O34 same password, different hash', env.get('OL:twin@test.com').hash !== env.get('OL:jamal@test.com').hash, true);
    env.clock.now += 40 * D; officeLogin('jamal@test.com', 'GoodPass1', false);
    eq('O35 old sessions swept on sign-in', env.keys().filter(function (x) { return x.indexOf('OS:') === 0; }).length, 1);
    eq('O36 list logins', oListLogins_(env).map(function (x) { return x.email + ':' + x.status; }).join(','), 'jamal@test.com:Active,site1@test.com:Active,twin@test.com:Active');
    var pw = oMakePassword_(env);
    eq('O37 made password 10 readable chars', /^[A-HJ-NP-Za-km-z2-9]{10}$/.test(pw), true);
    eq('O38 empty password refused', err(function () { officeLogin('jamal@test.com', '', false); }), 'BAD|5');
    eq('O39 bad status refused', /Active or Blocked/.test(err(function () { oSaveLogin_(env, { email: 'jamal@test.com', status: 'Gone' }); })), true);
    eq('O40 name kept when blank', oSaveLogin_(env, { email: 'jamal@test.com', name: '', role: '' }).name, 'Jamal Uddin');
  } catch (e) { fail++; log.push('FAIL OF crashed: ' + e.message); }
  finally { OFFICE_ENV_ = keep; }
  log.unshift('OF ' + pass + ' passed, ' + fail + ' failed');
  return { pass: pass, fail: fail, log: log };
}
