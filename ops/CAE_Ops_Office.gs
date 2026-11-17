// ============================================================================
// CAE_Ops_Office.gs — 15th .gs file, appended LAST.
// Order: Code, PDF, UI, Reports, App, Sets, Order, QuoteReq, Site, Roles, Terms,
//        QuoteForm, QuoteForm2, QuoteApp, Office.  + HTML file "Office" (the web app page).
// W1 (16 Nov 2026): web app entry (doGet) + own login for office AND site staff.
//   - Logins are pre-registered by the admin: any email (personal ones allowed), a role, a password.
//   - Only the admin sets / resets passwords; users cannot change them. Block = all sessions end at once.
//   - 5 wrong passwords -> that email is locked 15 min. Sessions 8 h, or 30 days with "keep me signed in".
//   - Stored in Script Properties only (never in the sheet):
//       OL:<email>  login {email,name,role,status,alg,iters,salt,hash,epoch,created,last}
//       OS:<token>  session {email,epoch,exp}
//   - Failed tries {n,until,at}: registered logins keep them in their own OL: record (durable, bounded by
//     the number of logins); unknown addresses keep OF:<email> in CacheService (cannot fill the property store).
//   - Password hash = PBKDF2-HMAC-SHA256 (alg + iters stored per login; old 'v1' hashes upgrade on sign-in).
// Fixes after CodeRabbit review (PR #7, 16 Nov): KDF, cache fail counters, max password length on save,
//   onOpen fallback.  Round 2: lock state durable for registered logins; each try is booked under a short
//   lock and the slow password check runs outside it; max 5 sessions per login; sweep drops revoked sessions.
//   - Every later web-app server call starts with officeGate_(token, roles).
// Fail pass (16 Nov, before deploy): with "execute as me + access Anyone", google.script.run on the /exec page can
//   call ANY public function of the whole project (uiInit, uiDo, ieDo, o8Do ...), not only the login. So, as the
//   LAST file, this one wraps every public function: a call that starts an execution runs only if it is on
//   OFFICE_WEB_API_ (they gate themselves with officeSession_), on OFFICE_OPEN_ (triggers), or the caller is the
//   signed-in Google user the script runs as (sheet menus, panels, editor). Anonymous web callers get NOACCESS.
//   Also: huge email input cut before the regex, keep = true only, "Name, Role" split on the last comma.
//   This file must stay LAST: functions of a file after it would not be wrapped (self-test O72 catches it;
//   the web API then refuses everything and the sheet shows a warning on open = fails closed).
// Independent review (16 Nov 22:30): open handlers now need a real event (onOpen/onEdit: a Spreadsheet event
//   object with methods; appSweep: the triggerUid of one of this project's triggers) or the owner; constructors
//   are wrapped too (new still works); wrappers keep their names; at most 30 password checks a minute in total
//   (BUSY) so a flood cannot eat the owner's executions.
// CodeRabbit CLI review (16 Nov 22:55): the 30-a-minute total is one {m, n} record in Script Properties, read,
//   checked and counted under the script lock (the cache could drop it early; two parallel calls could both pass).
//   Known limit: a public function in a file AFTER this one is not wrapped, and a page that is already open could
//   call it directly. Code only goes live with a new deployment version, so: never make a new deployment version
//   unless selfTestLog shows 0 failed (O72 fails for any file after this one).
// W2 (17 Nov): access by department + level instead of one role. A login has depts = {SC:1, AC:2, ...}
//   (1 View, 2 Staff, 3 Head); Director = every department at 4. Old role logins are read through
//   OFFICE_ROLEMAP_ and moved to depts by officeMigrateLogins (editor or menu, run once, old sessions end).
//   officeGate_(token, {dept, level, money}). Prices / amounts only for SC, PR, AC (any level) and Directors.
//   HR > Users & access (Directors): officeUsersList, officeStaffList, officeUserSave, officeUserReset,
//   officeUserBlock, officeUserSignOutAll. Codes: DUP, SELF (own access / self-block), LASTDIR (never zero
//   enabled Directors), BADINPUT|field, NOTFOUND. Every admin change runs with the gate inside the script lock.
// D1 (17 Nov): QHSE > Document register. Tabs DocRegister + DocHistory (add-only), set up by officeDocSetup (editor
//   or menu, safe to repeat) with the 10 documents the system already prints. officeDocList (any QH level; non-Directors
//   see only their own departments' documents), officeDocSave / officeDocRevise / officeDocStatus (QH Head or Director,
//   gate in the lock). Codes: STALE, WITHDRAWN, SYSDOC, NOREG.
// D1 (c) (17 Nov): shared PDF footer. CAE Doc Base footers get {{DocCtl}} + {{DocRec}}: code, Rev, issue date (from
//   DocRegister), page x / y, record no. on every system PDF. Wraps every PDF_SPECS entry (spec.docCtl) and renderInto.
// D1 (c2) (17 Nov): Drive folders. Every system PDF goes to PDF > <type> > <year> (quotes, proformas, invoices, notes, POs),
//   PDF > Projects > Active > <JobNo> - <Client> - <Site> > Challans, or PDF > Yard > Transfers > <year>; Editable inside.
//   Wraps makePdf. One-time move of the older PDFs: officePdfMoveDry (plan) then officePdfMoveApply (editor or menu).
// CodeRabbit CLI review (17 Nov, W2 + D1): register writes go history first (oDocTx_: a failed register write adds a
//   "Not applied" entry, so no change is ever left without its history); detail edits send the old title / owner (STALE
//   if someone changed them meanwhile); a remade PDF never bins the new PDF / Doc itself.
// Replaces: doGet (if an earlier file had one — check before install).
// Wraps: onOpen (adds the "Web app" menu), selfTestAllParts_ (adds 'OF'), every PDF_SPECS entry + renderInto (D1 c footer), makePdf (D1 c2 folders).
// ============================================================================

var OFFICE_ROLES_ = ['Admin', 'Accounts', 'Viewer', 'Yard', 'Field']; // old W1 roles (read + menu only)
var OFFICE_DEPTS_ = ['SC', 'PS', 'YW', 'PR', 'AC', 'HR', 'QH'];
var OFFICE_LVL_ = { 1: 'View', 2: 'Staff', 3: 'Head', 4: 'Director' };
var OFFICE_ROLEMAP_ = { Admin: 'D', Accounts: { AC: 2, PR: 2, SC: 1 }, Viewer: { SC: 1, PS: 1, AC: 1 }, Yard: { YW: 2, PS: 1 }, Field: { PS: 2, YW: 1 } };
var OFFICE_MONEY_ = ['SC', 'PR', 'AC']; // departments that see prices / amounts (PS, YW never)
var OFFICE_DB_ID_ = '130OrVMdQ2tjCa_FQac2ebbWcbWzgW6l4VX5sfNWrKCw';
var OFFICE_CFG_ = { maxFails: 5, lockMin: 15, shortH: 8, keepD: 30, iters: 300, kdfIters: 20000, minPw: 8, maxPw: 200, maxSess: 5, maxPerMin: 30 };
var OFFICE_KDF_ = 'pbkdf2-sha256';
var OFFICE_ENV_ = null; // self-tests put an in-memory env here

function officeEnv_() {
  var P = PropertiesService.getScriptProperties();
  var hex = function () { return Utilities.getUuid().replace(/-/g, ''); };
  return {
    get: function (k) { var v = P.getProperty(k); if (!v) return null; try { return JSON.parse(v); } catch (e) { return null; } }, // a broken record reads as none
    put: function (k, o) { P.setProperty(k, JSON.stringify(o)); },
    del: function (k) { P.deleteProperty(k); },
    keys: function () { return P.getKeys(); },
    now: function () { return Date.now(); },
    rand: function () { return hex() + hex(); }, // 64 hex chars
    sha: function (s) {
      return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8));
    },
    bytes: function (s) { return Utilities.newBlob(String(s)).getBytes(); },
    hmac: oHmacJs_, // plain JS: Utilities.computeHmacSha256Signature costs ~1 ms a call, too slow for a KDF
    b64: function (b) { return Utilities.base64Encode(b.map(function (x) { return x << 24 >> 24; })); },
    cget: function (k) { var v = CacheService.getScriptCache().get(k); return v ? JSON.parse(v) : null; },
    cput: function (k, o, sec) { CacheService.getScriptCache().put(k, JSON.stringify(o), Math.max(1, Math.min(21600, Math.ceil(sec)))); },
    cdel: function (k) { CacheService.getScriptCache().remove(k); },
    lock: function (fn) { var l = LockService.getScriptLock(); l.waitLock(10000); try { return fn(); } finally { l.releaseLock(); } },
    who: function () { return { active: Session.getActiveUser().getEmail() || '', effective: Session.getEffectiveUser().getEmail() || '' }; },
    triggerIds: function () { return ScriptApp.getProjectTriggers().map(function (x) { return String(x.getUniqueId()); }); },
    db: function () { // the CAE Ops DB (the bound sheet; by id if a web call has no active sheet)
      var ss = null; try { ss = SpreadsheetApp.getActive(); } catch (e) { ss = null; }
      return typeof SheetDb === 'function' ? new SheetDb(ss || SpreadsheetApp.openById(OFFICE_DB_ID_)) : null;
    }
  };
}
function oEnv_() { return OFFICE_ENV_ || officeEnv_(); }
function oEmail_(e) { var s = typeof e === 'string' ? e : ''; return s.length > 254 ? '' : s.trim().toLowerCase(); } // strings only; huge input never reaches the regex
function oEmailOk_(e) { return e.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function oHash_(env, salt, pw) { var h = salt + '|' + pw; for (var i = 0; i < OFFICE_CFG_.iters; i++) h = env.sha(salt + h); return h; } // old v1, verify only
// SHA-256 + HMAC in plain JS (FIPS 180-4 / RFC 2104). In: byte arrays (signed or not). Out: 32 bytes 0..255.
var OSHA_ = (function () {
  var K = [], H = [], n = 2, f = function (x) { return (x - Math.floor(x)) * 4294967296 | 0; };
  while (K.length < 64) { for (var d = 2; d * d <= n && n % d; d++); if (d * d > n) { if (H.length < 8) H.push(f(Math.sqrt(n))); K.push(f(Math.cbrt(n))); } n++; }
  return { K: K, H: H };
})();
function oSha256_(m) {
  var K = OSHA_.K, h = OSHA_.H.slice(), l = m.length, b = [], w = new Array(64), i, j;
  for (i = 0; i < l; i++) b.push(m[i] & 255);
  b.push(128); while (b.length % 64 !== 56) b.push(0);
  b.push(0, 0, 0, (l >>> 29) & 255, (l >>> 21) & 255, (l >>> 13) & 255, (l >>> 5) & 255, (l << 3) & 255);
  for (j = 0; j < b.length; j += 64) {
    for (i = 0; i < 16; i++) w[i] = b[j + 4 * i] << 24 | b[j + 4 * i + 1] << 16 | b[j + 4 * i + 2] << 8 | b[j + 4 * i + 3];
    for (i = 16; i < 64; i++) {
      var x = w[i - 15], y = w[i - 2];
      w[i] = (((x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)) + w[i - 16] + ((y >>> 17 | y << 15) ^ (y >>> 19 | y << 13) ^ (y >>> 10)) + w[i - 7]) | 0;
    }
    var a = h[0], c = h[1], e = h[2], g = h[3], p = h[4], q = h[5], r = h[6], s = h[7];
    for (i = 0; i < 64; i++) {
      var t1 = (s + ((p >>> 6 | p << 26) ^ (p >>> 11 | p << 21) ^ (p >>> 25 | p << 7)) + ((p & q) ^ (~p & r)) + K[i] + w[i]) | 0;
      var t2 = (((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)) + ((a & c) ^ (a & e) ^ (c & e))) | 0;
      s = r; r = q; q = p; p = (g + t1) | 0; g = e; e = c; c = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + c) | 0; h[2] = (h[2] + e) | 0; h[3] = (h[3] + g) | 0;
    h[4] = (h[4] + p) | 0; h[5] = (h[5] + q) | 0; h[6] = (h[6] + r) | 0; h[7] = (h[7] + s) | 0;
  }
  var out = []; for (i = 0; i < 8; i++) out.push(h[i] >>> 24 & 255, h[i] >>> 16 & 255, h[i] >>> 8 & 255, h[i] & 255);
  return out;
}
function oHmacJs_(v, k) {
  if (k.length > 64) k = oSha256_(k);
  var ip = [], op = [], i;
  for (i = 0; i < 64; i++) { var x = (k[i] || 0) & 255; ip.push(x ^ 54); op.push(x ^ 92); }
  return oSha256_(op.concat(oSha256_(ip.concat(v))));
}
// PBKDF2-HMAC-SHA256, one 32-byte block (RFC 8018).
function oPbkdf2_(env, pw, salt, iters) {
  var P = env.bytes(pw), u = env.hmac(env.bytes(salt).concat([0, 0, 0, 1]), P), t = u.slice();
  for (var i = 1; i < iters; i++) { u = env.hmac(u, P); for (var j = 0; j < t.length; j++) t[j] ^= u[j]; }
  return env.b64(t);
}
function oSetPw_(env, L, pw) { L.alg = OFFICE_KDF_; L.iters = OFFICE_CFG_.kdfIters; L.salt = env.rand().slice(0, 32); L.hash = oPbkdf2_(env, pw, L.salt, L.iters); }
function oPwOk_(env, L, pw) {
  if (!L || !L.hash) return false;
  if (L.alg === OFFICE_KDF_) return oSame_(oPbkdf2_(env, pw, L.salt, L.iters), L.hash);
  return oSame_(oHash_(env, L.salt, pw), L.hash);
}
function oSame_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
// ----------------------------------------------------------------- access = {dept: level}
function oHas_(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
function oDir_() { var o = {}; OFFICE_DEPTS_.forEach(function (d) { o[d] = 4; }); return o; }
function oIsDir_(a) { return !!a && OFFICE_DEPTS_.every(function (d) { return a[d] === 4; }); }
// Valid: Director (all 7 at 4) or levels 1-3 per department (0 = none). Anything else (unknown key, 4 on only
// some, text, 1.5, array, empty) -> null.
function oAccClean_(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
  var ks = Object.keys(m), o = {}, n = 0, four = 0;
  if (ks.length > OFFICE_DEPTS_.length) return null;
  for (var i = 0; i < ks.length; i++) {
    var d = ks[i], v = m[d];
    if (OFFICE_DEPTS_.indexOf(d) < 0 || typeof v !== 'number' || v !== Math.floor(v) || v < 0 || v > 4) return null;
    if (v) { o[d] = v; n++; if (v === 4) four++; }
  }
  if (!n || (four && four !== OFFICE_DEPTS_.length)) return null;
  return o;
}
function oRoleAcc_(r) { var m = typeof r === 'string' && oHas_(OFFICE_ROLEMAP_, r) ? OFFICE_ROLEMAP_[r] : null; return m === 'D' ? oDir_() : m ? JSON.parse(JSON.stringify(m)) : null; }
// Stored: Director = L.dir true (so a department added later is theirs too), else L.depts; old logins: L.role.
function oAcc_(L) { return L ? (L.dir === true ? oDir_() : oAccClean_(L.depts) || oRoleAcc_(L.role) || {}) : {}; } // a copy
function oSetAcc_(L, a) { if (oIsDir_(a)) { L.dir = true; delete L.depts; } else { delete L.dir; L.depts = a; } delete L.role; }
function oHasAcc_(L) { return L.dir === true || !!oAccClean_(L.depts); }
function oSameAcc_(a, b) { return OFFICE_DEPTS_.every(function (d) { return (a[d] || 0) === (b[d] || 0); }); }
function oLevel_(a) { if (oIsDir_(a)) return 4; var t = 0; OFFICE_DEPTS_.forEach(function (d) { if ((a[d] || 0) > t) t = a[d]; }); return Math.min(t, 3); }
function oCanSeeMoney_(a) { return oIsDir_(a) || OFFICE_MONEY_.some(function (d) { return (a && a[d] || 0) >= 1; }); }
function oAccText_(a) {
  if (oIsDir_(a)) return 'Director';
  return OFFICE_DEPTS_.filter(function (d) { return a[d]; }).map(function (d) { return d + ' ' + OFFICE_LVL_[a[d]]; }).join(', ') || 'none';
}
// Menu text -> access: "Director", an old role name, or "AC Staff, PR Staff, SC View" / "ac2 sc:1".
// Strict: every word must be understood, each department once.
function oParseAccess_(s) {
  s = String(s || '').trim(); var low = s.toLowerCase(), o = {}, re = /\b([A-Za-z]{2})\s*[:=]?\s*([1-3]|view|staff|head)\b/gi, m, bad;
  if (low === 'director' || low === 'l4') return oDir_();
  var r = OFFICE_ROLES_.filter(function (x) { return x.toLowerCase() === low; })[0];
  if (r) return oRoleAcc_(r);
  var help = '. Write Director, or departments ' + OFFICE_DEPTS_.join(' ') + ' each with View / Staff / Head, e.g. AC Staff, SC View';
  if (s.length > 200) throw new Error('Access text is too long' + help);
  var rest = s.replace(re, ' ').replace(/[\s,;]+/g, '');
  if (rest) throw new Error('Not understood: "' + rest.slice(0, 30) + '"' + help);
  while ((m = re.exec(s))) {
    var d = m[1].toUpperCase();
    if (OFFICE_DEPTS_.indexOf(d) < 0) bad = 'Not understood: "' + m[1] + '"';
    else if (o[d]) bad = d + ' is given twice';
    else o[d] = { view: 1, staff: 2, head: 3 }[m[2].toLowerCase()] || +m[2];
  }
  if (bad) throw new Error(bad + help);
  if (!Object.keys(o).length) throw new Error('Access is empty' + help);
  return o;
}
function oPublic_(L) { var a = oAcc_(L); return { email: L.email, name: L.name, depts: a, level: OFFICE_LVL_[oLevel_(a)] || '', money: oCanSeeMoney_(a) }; }
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
function oFGet_(env, email, L) { var f = L ? L.fails : env.cget('OF:' + email); return f && f.n != null ? f : { n: 0, until: 0, at: 0 }; }
function oFPut_(env, email, L, f) {
  if (L) { if (f.n || f.until) L.fails = f; else delete L.fails; env.put('OL:' + email, L); }
  else if (f.n || f.until) env.cput('OF:' + email, f, OFFICE_CFG_.lockMin * 60); else env.cdel('OF:' + email);
}
function officeLogin(email, pw, keep) {
  var env = oEnv_(), C = OFFICE_CFG_, win = C.lockMin * 6e4;
  email = oEmail_(email); pw = typeof pw === 'string' ? pw : ''; keep = keep === true;
  if (!oEmailOk_(email) || !pw || pw.length > C.maxPw) oFail_('BAD|' + C.maxFails);
  // 1) short lock: 0) all addresses together at most maxPerMin password checks a minute (a flood cannot eat the owner's
  //    executions; one {m, n} record in Script Properties, the cache may drop it early); then refuse while locked,
  //    else book this try first (parallel guesses still count: max 5 per window)
  var snap = env.lock(function () {
    var now = env.now(), m = Math.floor(now / 6e4), t = env.get('OT') || {};
    if (t.m === m && t.n >= C.maxPerMin) oFail_('BUSY|1');
    env.put('OT', { m: m, n: t.m === m ? (+t.n || 0) + 1 : 1 });
    var L = env.get('OL:' + email), f = oFGet_(env, email, L);
    if (f.until > now) oFail_('LOCKED|' + Math.ceil((f.until - now) / 6e4));
    if (f.until || (f.at && now - f.at >= win)) f = { n: 0, until: 0, at: 0 };
    f.n++; f.at = now; if (f.n >= C.maxFails) f.until = now + win;
    oFPut_(env, email, L, f);
    return L;
  });
  // 2) slow password check outside the lock (same work for unknown emails)
  var ok = snap ? oPwOk_(env, snap, pw) : (oPbkdf2_(env, pw, 'x', C.kdfIters), false), up = null;
  if (ok && (snap.alg !== OFFICE_KDF_ || snap.iters !== C.kdfIters)) { up = {}; oSetPw_(env, up, pw); } // upgrade old hash, same password
  // 3) short lock: apply the result to the record as it is now
  return env.lock(function () {
    var now = env.now(), L = env.get('OL:' + email);
    if (ok && (!L || L.hash !== snap.hash || L.salt !== snap.salt)) ok = false; // password changed meanwhile
    if (!ok) {
      var f = oFGet_(env, email, snap ? L : null); // the try is already counted
      if (f.until > now) oFail_('LOCKED|' + Math.ceil((f.until - now) / 6e4));
      oFail_('BAD|' + Math.max(0, C.maxFails - f.n));
    }
    delete L.fails; env.cdel('OF:' + email);
    if (up) { L.alg = up.alg; L.iters = up.iters; L.salt = up.salt; L.hash = up.hash; }
    if (L.status !== 'Active') { env.put('OL:' + email, L); oFail_('BLOCKED'); } // only told after a correct password
    oSweep_(env, now);
    oCapSessions_(env, email, C.maxSess - 1);
    var token = env.rand();
    env.put('OS:' + token, { email: email, epoch: L.epoch || 0, at: now, exp: now + (keep ? C.keepD * 864e5 : C.shortH * 36e5) });
    L.last = now; env.put('OL:' + email, L);
    return { token: token, user: oPublic_(L) };
  });
}
function officeSession_(token) {
  var env = oEnv_(); token = typeof token === 'string' ? token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) oFail_('NOSESSION');
  var s = env.get('OS:' + token), now = env.now();
  if (!s || s.exp <= now) { if (s) env.del('OS:' + token); oFail_('NOSESSION'); }
  var L = env.get('OL:' + s.email);
  if (!L || L.status !== 'Active' || (L.epoch || 0) !== s.epoch) oFail_('NOSESSION'); // refused; the sweep (under the lock) removes it
  return L;
}
// need = {dept, level, money}: the login needs at least that level in that department (no dept: in any one),
// money: true = must be cleared for prices / amounts. Directors pass everything.
function officeGate_(token, need) {
  var L = officeSession_(token);
  if (need) {
    var a = oAcc_(L), lv = typeof need.level === 'number' ? need.level : 1;
    if ((need.dept ? (a[need.dept] || 0) : oLevel_(a)) < lv || lv < 1) oFail_('NOACCESS');
    if (need.money && !oCanSeeMoney_(a)) oFail_('NOACCESS');
  }
  return L;
}
function officeMe(token) { return oPublic_(officeSession_(token)); }
function officeLogout(token) {
  token = typeof token === 'string' ? token : '';
  if (/^[a-f0-9]{64}$/.test(token)) oEnv_().del('OS:' + token);
  return true;
}
// Drops expired sessions and revoked ones (login gone / blocked / epoch changed).
function oSweep_(env, now) {
  var seen = Object.create(null);
  env.keys().forEach(function (k) {
    if (k.indexOf('OS:') !== 0) return;
    var s = env.get(k), L = null;
    if (s) { if (!(s.email in seen)) seen[s.email] = env.get('OL:' + s.email); L = seen[s.email]; }
    if (!s || s.exp <= now || !L || L.status !== 'Active' || (L.epoch || 0) !== s.epoch) env.del(k);
  });
}
// Keeps at most 'keep' sessions of one login (the newest).
function oCapSessions_(env, email, keep) {
  env.keys().filter(function (k) { return k.indexOf('OS:') === 0; })
    .map(function (k) { return { k: k, s: env.get(k) }; })
    .filter(function (x) { return x.s && x.s.email === email; })
    .sort(function (x, y) { return (y.s.at || 0) - (x.s.at || 0); })
    .slice(Math.max(0, keep)).forEach(function (x) { env.del(x.k); });
}

// ----------------------------------------------------------------- admin: logins (sheet menu; the web screen is below)
// o = {email, name, depts | access (menu text) | role (old), password, status}. Blank values keep the old ones.
// An access change, a password change or Block ends all sessions of that login.
function oSaveLogin_(env, o) {
  var email = oEmail_(o.email);
  if (!oEmailOk_(email)) throw new Error('Not a valid email: ' + (typeof o.email === 'string' ? o.email.slice(0, 60) : '?'));
  var acc = null;
  if (o.depts != null) { acc = oAccClean_(o.depts); if (!acc) throw new Error('Access is not valid.'); }
  else if (o.access != null && String(o.access).trim()) acc = oParseAccess_(o.access);
  else if (o.role != null && String(o.role).trim()) {
    var r = OFFICE_ROLES_.filter(function (x) { return x.toLowerCase() === String(o.role).trim().toLowerCase(); })[0];
    if (!r) throw new Error('Role must be one of: ' + OFFICE_ROLES_.join(', '));
    acc = oRoleAcc_(r);
  }
  return env.lock(function () {
    var L = env.get('OL:' + email), isNew = !L;
    L = L || { email: email, name: '', status: 'Active', salt: '', hash: '', epoch: 0, created: env.now(), last: 0 };
    var ep0 = L.epoch;
    if (o.name != null && String(o.name).trim()) { L.name = oName_(String(o.name)); if (!L.name) throw new Error('Name is not valid (letters or digits, at most 80 characters).'); }
    var wasDir = !isNew && L.status === 'Active' && oIsDir_(oAcc_(L));
    if (acc) { if (isNew || !oSameAcc_(oAcc_(L), acc)) L.epoch++; oSetAcc_(L, acc); }
    if (!L.name) throw new Error('Name is needed for a new login.');
    if (!oHasAcc_(L) && !oRoleAcc_(L.role)) throw new Error('Access is needed for a new login.');
    if (o.password != null && o.password !== '') {
      var pw = String(o.password);
      if (pw.length < OFFICE_CFG_.minPw) throw new Error('Password must be at least ' + OFFICE_CFG_.minPw + ' characters.');
      if (pw.length > OFFICE_CFG_.maxPw) throw new Error('Password must be at most ' + OFFICE_CFG_.maxPw + ' characters.');
      oSetPw_(env, L, pw); L.epoch++;
      delete L.fails; env.cdel('OF:' + email);
    }
    if (isNew && !L.hash) throw new Error('A password is needed for a new login.');
    if (o.status != null && o.status !== L.status) {
      if (o.status !== 'Active' && o.status !== 'Blocked') throw new Error('Status must be Active or Blocked.');
      L.status = o.status; L.epoch++;
    }
    if (wasDir && !(L.status === 'Active' && oIsDir_(oAcc_(L))) && !oOtherDir_(env, email)) throw new Error('There must always be at least one enabled Director. Make another Director first.');
    if (isNew) { L.epoch = env.now(); oCapSessions_(env, email, 0); } // a re-added email never revives old sessions
    env.put('OL:' + email, L);
    if (L.epoch !== ep0) oSweep_(env, env.now()); // revoked sessions go at once
    return oPublic_(L);
  });
}
function oListLogins_(env) {
  var live = oLive_(env, env.now());
  return env.keys().filter(function (k) { return k.indexOf('OL:') === 0; }).map(function (k) { return env.get(k); }).filter(function (L) { return L && L.email; }).map(function (L) {
    return { email: L.email, name: L.name, access: oAccText_(oAcc_(L)), status: L.status, last: L.last || 0, sessions: live[L.email] || 0 };
  }).sort(function (a, b) { return a.email < b.email ? -1 : 1; });
}
// 10 characters, no look-alikes (0 O 1 l I), no bias: random bytes from the hex of env.rand() (the fixed
// version / variant digits of each UUID are skipped), a byte is used only if < 216 = 4 x 54.
function oMakePassword_(env) {
  var cs = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', out = '', guard = 0;
  while (out.length < 10 && guard++ < 50) {
    var h = String(env.rand()).replace(/[^0-9a-f]/gi, ''), d = '';
    for (var i = 0; i < h.length; i++) if (i % 32 !== 12 && i % 32 !== 16) d += h.charAt(i);
    for (var j = 0; j + 1 < d.length && out.length < 10; j += 2) { var b = parseInt(d.substr(j, 2), 16); if (b < 216) out += cs.charAt(b % 54); }
  }
  if (out.length < 10) throw new Error('No random source');
  return out;
}

// ----------------------------------------------------------------- HR > Users & access (web screen, Directors only)
var OFFICE_ADMIN_ = { dept: 'HR', level: 4 };
// Name: no control, zero-width, text-direction or blank-looking characters (name spoofing), at most 2
// combining marks in a row, at least one letter or digit, at most 80 characters. Else ''.
function oName_(v) {
  if (typeof v !== 'string' || v.length > 400) return '';
  var s = v.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ')
    .replace(/[\u00ad\u034f\u061c\u115f\u1160\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2069\u2800\u3164\ufeff\uffa0]/g, '')
    .replace(/(\p{M}{2})\p{M}+/gu, '$1').replace(/\s+/g, ' ').trim();
  return s.length <= 80 && /[\p{L}\p{N}]/u.test(s) ? s : '';
}
function oStaffId_(v) { if (v == null || v === '') return ''; return typeof v === 'string' && /^[A-Za-z0-9._-]{1,40}$/.test(v.trim()) ? v.trim() : null; }
// Open sessions per login, by the same rules as officeSession_ (not expired, login Active, same epoch).
function oLive_(env, now) {
  var n = Object.create(null), seen = Object.create(null);
  env.keys().forEach(function (k) {
    if (k.indexOf('OS:') !== 0) return;
    var s = env.get(k); if (!s || !(s.exp > now) || typeof s.email !== 'string') return;
    if (!(s.email in seen)) seen[s.email] = env.get('OL:' + s.email);
    var L = seen[s.email]; if (L && L.status === 'Active' && (L.epoch || 0) === s.epoch) n[s.email] = (n[s.email] || 0) + 1;
  });
  return n;
}
function oOtherDir_(env, email) { // another enabled Director than this email?
  return env.keys().some(function (k) { if (k.indexOf('OL:') !== 0) return false; var L = env.get(k); return !!L && L.email !== email && L.status === 'Active' && oIsDir_(oAcc_(L)); });
}
// The caller's session + Director check run INSIDE the script lock, so two Directors acting at once see each
// other's changes (a Director demoted a moment ago is refused). read = true: no lock (list only).
function oAdmin_(token, fn, read) {
  var env = oEnv_(), run = function () { var me = officeGate_(token, OFFICE_ADMIN_); return fn(env, me, env.now()); };
  if (read) return run();
  officeGate_(token, OFFICE_ADMIN_); // first without the lock: strangers and non-Directors never wait for it
  return env.lock(run);
}
function oTarget_(env, email) { var e = oEmail_(email), L = oEmailOk_(e) ? env.get('OL:' + e) : null; if (!L) oFail_('NOTFOUND'); return L; }
// After an epoch change: this caller's own session (if it is that login) is kept, all others end.
function oEndOthers_(env, L, token, now) {
  if (token) { var s = env.get('OS:' + token); if (s && s.email === L.email) { s.epoch = L.epoch; env.put('OS:' + token, s); } }
  oSweep_(env, now);
}
function officeUsersList(token) {
  return oAdmin_(token, function (env, me, now) {
    var live = oLive_(env, now);
    var rows = env.keys().filter(function (k) { return k.indexOf('OL:') === 0; }).map(function (k) { return env.get(k); })
      .filter(function (L) { return L && typeof L.email === 'string'; }).map(function (L) {
        var on = L.status === 'Active';
        return { name: String(L.name || ''), email: L.email, depts: oAcc_(L), status: on ? 'Enabled' : 'Blocked', last: +L.last || 0, sessions: on ? (live[L.email] || 0) : 0, staff: String(L.staff || '') };
      }).sort(function (a, b) { return a.email < b.email ? -1 : 1; });
    return { me: me.email, rows: rows };
  }, true);
}
function officeStaffList(token) {
  officeGate_(token, OFFICE_ADMIN_);
  var db = oEnv_().db();
  if (!db || !db.hasTab('Staff')) return [];
  var seen = {};
  var out = [];
  db.rows('Staff').forEach(function (r) { // only rows the save accepts: a plain id (oStaffId_) and a clean name
    var id = oStaffId_(String(r.StaffID == null ? '' : r.StaffID)), name = oName_(String(r.Name == null ? '' : r.Name));
    if (!id || !name || seen[id] || String(r.Status || '') === 'Inactive' || out.length >= 1000) return;
    seen[id] = true; out.push({ id: id, name: name });
  });
  return out;
}
// r = {email, name, depts, staff, isNew}. New -> {password} (shown once). Edit -> {ok, ended}.
function officeUserSave(token, r) {
  return oAdmin_(token, function (env, me, now) {
    r = r && typeof r === 'object' && !Array.isArray(r) ? r : {};
    var name = oName_(r.name), email = oEmail_(r.email), acc = oAccClean_(r.depts), staff = oStaffId_(r.staff);
    if (!name) oFail_('BADINPUT|name');
    if (!oEmailOk_(email) || (r.isNew === true && !/^[a-z0-9._%+'-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(email))) oFail_('BADINPUT|email'); // new logins: plain addresses only
    if (!acc) oFail_('BADINPUT|departments');
    if (staff === null) oFail_('BADINPUT|staff');
    var L = env.get('OL:' + email);
    if (r.staff === undefined) staff = L && L.staff || ''; // not sent: keep the link
    if (r.isNew === true) {
      if (L) oFail_('DUP');
      var pw = oMakePassword_(env);
      L = { email: email, name: name, staff: staff, status: 'Active', salt: '', hash: '', epoch: now, created: now, last: 0, by: me.email }; // epoch = now: a re-added email never revives old sessions
      oSetAcc_(L, acc); oSetPw_(env, L, pw); oCapSessions_(env, email, 0);
      env.put('OL:' + email, L);
      return { password: pw };
    }
    if (!L) oFail_('NOTFOUND');
    var cur = oAcc_(L), same = oSameAcc_(cur, acc), ended = 0;
    if (!same && email === me.email) oFail_('SELF');
    if (!same && L.status === 'Active' && oIsDir_(cur) && !oIsDir_(acc) && !oOtherDir_(env, email)) oFail_('LASTDIR');
    if (!same) ended = oLive_(env, now)[email] || 0;
    L.name = name; L.staff = staff; oSetAcc_(L, acc);
    if (!same) L.epoch = (L.epoch || 0) + 1;
    env.put('OL:' + email, L);
    if (!same) oSweep_(env, now);
    return { ok: true, ended: ended };
  });
}
// New password (shown once); the old one stops at once; all sign-ins end (own reset: this one is kept).
function officeUserReset(token, email) {
  return oAdmin_(token, function (env, me, now) {
    var L = oTarget_(env, email), self = L.email === me.email;
    var ended = Math.max(0, (oLive_(env, now)[L.email] || 0) - (self ? 1 : 0)), pw = oMakePassword_(env);
    oSetPw_(env, L, pw); L.epoch = (L.epoch || 0) + 1; delete L.fails; env.cdel('OF:' + L.email);
    env.put('OL:' + L.email, L);
    oEndOthers_(env, L, self ? token : '', now);
    return { password: pw, ended: ended };
  });
}
function officeUserBlock(token, email, block) {
  return oAdmin_(token, function (env, me, now) {
    if (block !== true && block !== false) oFail_('BADINPUT|block');
    var L = oTarget_(env, email), to = block ? 'Blocked' : 'Active';
    if (L.email === me.email) oFail_('SELF');
    if (L.status === to) return { ok: true, ended: 0 };
    if (block && L.status === 'Active' && oIsDir_(oAcc_(L)) && !oOtherDir_(env, L.email)) oFail_('LASTDIR');
    var ended = block ? (oLive_(env, now)[L.email] || 0) : 0;
    L.status = to; L.epoch = (L.epoch || 0) + 1;
    env.put('OL:' + L.email, L);
    oSweep_(env, now);
    return { ok: true, ended: ended };
  });
}
function officeUserSignOutAll(token, email) {
  return oAdmin_(token, function (env, me, now) {
    var L = oTarget_(env, email), self = L.email === me.email;
    var ended = Math.max(0, (oLive_(env, now)[L.email] || 0) - (self ? 1 : 0));
    L.epoch = (L.epoch || 0) + 1; env.put('OL:' + L.email, L);
    oEndOthers_(env, L, self ? token : '', now);
    return { ended: ended };
  });
}
// Old role logins -> depts by the role map; epoch +1 so their old sessions end. Safe to repeat.
function oMigrate_(env) {
  return env.lock(function () {
    var n = 0;
    env.keys().forEach(function (k) {
      if (k.indexOf('OL:') !== 0) return;
      var L = env.get(k), a = L && !oHasAcc_(L) && oRoleAcc_(L.role);
      if (!a) return;
      oSetAcc_(L, a); L.epoch = (L.epoch || 0) + 1; env.put(k, L); n++;
    });
    if (n) oSweep_(env, env.now());
    return n;
  });
}
// Editor (or menu) > run once after installing W2.
function officeMigrateLogins() { var n = oMigrate_(oEnv_()); Logger.log('Logins moved to departments + level: ' + n); return n; }

// Sheet menu "Web app" (admin only — the sheet itself is admin-only).
if (typeof onOpen === 'function') {
  var OF_onOpen0_ = onOpen;
  onOpen = function (e) { OF_onOpen0_(e); officeMenu_(); };
} else {
  onOpen = function (e) { officeMenu_(); }; // no earlier onOpen: still add the menu
}
function officeMenu_() {
  var late = oUnguarded_(OFFICE_G_);
  if (late.length) SpreadsheetApp.getActive().toast('Not protected: ' + late.slice(0, 8).join(', ') + '. Move CAE_Ops_Office.gs to the end of the file list. The web app refuses all sign-ins until then.', 'Web app guard', 60);
  SpreadsheetApp.getUi().createMenu('Web app')
    .addItem('Add / change a login', 'menuOfficeLogin')
    .addItem('Block / unblock a login', 'menuOfficeBlock')
    .addItem('List logins', 'menuOfficeList')
    .addItem('Move old logins to departments (run once)', 'menuOfficeMigrate')
    .addItem('Set up document register (safe to repeat)', 'menuOfficeDocSetup')
    .addItem('PDF folders: plan the move (nothing changes)', 'menuOfficePdfDry')
    .addItem('PDF folders: move the older PDFs now', 'menuOfficePdfApply')
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
  var nm = oAsk_(ui, 'Web app login', (old ? 'Now: ' + old.name + '. Leave blank to keep.\n' : '') + 'Name (e.g. Jamal Uddin):'); if (nm == null) return;
  var ac = oAsk_(ui, 'Web app login', (old ? 'Now: ' + oAccText_(oAcc_(old)) + '. Leave blank to keep.\n' : '') +
    'Access: Director, or departments with a level, e.g.  AC Staff, PR Staff, SC View\nDepartments: ' + OFFICE_DEPTS_.join(' ') + '   Levels: View, Staff, Head'); if (ac == null) return;
  var pw = oAsk_(ui, 'Web app login', (old ? 'New password (blank = keep the old one, type NEW to make one):' : 'Password (blank = make one for me):'));
  if (pw == null) return;
  var made = '';
  if (!old && !pw || /^new$/i.test(pw)) { made = oMakePassword_(env); pw = made; }
  try {
    var u = oSaveLogin_(env, { email: email, name: nm, access: ac, password: pw });
    ui.alert('Saved', u.email + ' · ' + u.name + ' · ' + oAccText_(u.depts) + (made ? '\n\nPassword: ' + made + '\n(shown once — give it to the person)' : (pw ? '\n\nPassword changed. Old sign-ins have ended.' : '')), ui.ButtonSet.OK);
  } catch (err) { ui.alert('Not saved', err.message, ui.ButtonSet.OK); }
}
function menuOfficeBlock() {
  var ui = SpreadsheetApp.getUi(), env = oEnv_();
  var email = oAsk_(ui, 'Block / unblock', 'Email of the login:'); if (email == null) return;
  var L = env.get('OL:' + oEmail_(email));
  if (!L) { ui.alert('No login for ' + email); return; }
  var on = L.status === 'Active', to = on ? 'Blocked' : 'Active';
  if (ui.alert(L.name + ' is ' + (on ? 'Enabled' : 'Blocked'), 'Change to ' + (on ? 'Blocked' : 'Enabled') + '?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  oSaveLogin_(env, { email: L.email, status: to });
  ui.alert(L.email + ' is now ' + (on ? 'Blocked. All sign-ins have ended.' : 'Enabled.'));
}
function menuOfficeList() {
  var rows = oListLogins_(oEnv_()).map(function (x) {
    return x.email + ' · ' + x.name + ' · ' + x.access + ' · ' + (x.status === 'Active' ? 'Enabled' : 'Blocked') + ' · signed in now: ' + (x.sessions ? 'yes (' + x.sessions + ')' : 'no') +
      ' · last sign-in ' + (x.last ? Utilities.formatDate(new Date(x.last), Session.getScriptTimeZone(), 'd MMM yyyy HH:mm') : 'never');
  });
  SpreadsheetApp.getUi().alert('Web app logins (' + rows.length + ')', (rows.join('\n') || 'None yet.') + '\n\nThe web app has a screen for this: HR › Users & access (Directors).', SpreadsheetApp.getUi().ButtonSet.OK);
}
function menuOfficeMigrate() {
  var ui = SpreadsheetApp.getUi(), n = oMigrate_(oEnv_());
  ui.alert('Logins moved to departments + level: ' + n + (n ? '. Those logins sign in again once.' : ' (all done already).'));
}
function menuOfficeLink() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert('Web app link', url || 'Not deployed yet: Deploy › New deployment › Web app (execute as me, access Anyone).', SpreadsheetApp.getUi().ButtonSet.OK);
}

// Editor › run officeKdfBench: time of one password check at the current work factor (aim ≈ 0.5–1 s).
function officeKdfBench() {
  var t = Date.now(); oPbkdf2_(officeEnv_(), 'bench-password', 'bench-salt', OFFICE_CFG_.kdfIters);
  var ms = Date.now() - t; Logger.log('PBKDF2 ' + OFFICE_CFG_.kdfIters + ' iterations: ' + ms + ' ms'); return ms;
}

// ----------------------------------------------------------------- D1 QHSE > Document register (ISO 9001 7.5)
// Tabs (made at the end of the sheet by officeDocSetup, safe to repeat): DocRegister (one row per document) and
// DocHistory (add-only: every add, edit, revise, approve, withdraw). Only this file writes them.
// Read: any QH level; a non-Director sees only documents of their own departments. Write: QH Head (L3) or Director,
// only documents they can see; a new document only in one of their departments. Every write checks the gate before
// and again inside the script lock. Codes: STALE (Rev changed meanwhile), WITHDRAWN, SYSDOC, BADINPUT|field,
// NOTFOUND, NOREG (tabs not set up yet).
var ODOC_REG_ = 'DocRegister', ODOC_HIST_ = 'DocHistory';
var ODOC_H_ = ['Code', 'Title', 'Dept', 'Type', 'Rev', 'RevDate', 'Owner', 'Status', 'Sys', 'ByHand', 'Notes'];
var ODOC_HH_ = ['At', 'Code', 'Rev', 'Date', 'By', 'Note'];
var ODOC_TYPES_ = { Form: 'F', Procedure: 'P', Record: 'R' };
var ODOC_STAT_ = ['Active', 'Draft', 'Withdrawn'];
var ODOC_SYS_ = ['Quote', 'PI', 'Invoice', 'Note', 'Challan', 'PO']; // PDF_SPECS kinds the system prints
var ODOC_NEED_ = { dept: 'QH', level: 1 };
var ODOC_START_ = '2026-11-17';
// [code, title, dept, type, owner, status, sys, by-hand record numbers]
var ODOC_SEED_ = [
  ['CAE-QH-P01', 'Control of documents and records', 'QH', 'Procedure', 'QHSE Head', 'Draft', '', ''],
  ['CAE-SC-F01', 'Quotation (Rental / Project / Service / Sale)', 'SC', 'Form', 'Head of Sales', 'Active', 'Quote', ''],
  ['CAE-AC-F01', 'Proforma invoice', 'AC', 'Form', 'Accounts Head', 'Active', 'PI', ''],
  ['CAE-AC-F02', 'Invoice (Mushak-6.3)', 'AC', 'Form', 'Accounts Head', 'Active', 'Invoice', ''],
  ['CAE-AC-F03', 'Debit note', 'AC', 'Form', 'Accounts Head', 'Active', 'Note', ''],
  ['CAE-AC-F04', 'Credit note', 'AC', 'Form', 'Accounts Head', 'Active', 'Note', ''],
  ['CAE-PS-F01', 'Delivery challan', 'PS', 'Form', 'Projects Head', 'Active', 'Challan', ''],
  ['CAE-PS-F02', 'Return challan', 'PS', 'Form', 'Projects Head', 'Active', 'Challan', ''],
  ['CAE-YW-F01', 'Stock transfer note', 'YW', 'Form', 'Yard Head', 'Active', 'Challan', ''],
  ['CAE-PR-F01', 'Purchase order', 'PR', 'Form', 'Procurement Head', 'Active', 'PO', 'CAE/PO/2026/001'] // first PO to Robi, made by hand (user OK, 17 Nov)
];
// Issued count = record numbers in the source tab that have a PDF link, plus the by-hand numbers (no double count).
var ODOC_SRC_ = {
  'CAE-SC-F01': ['Quotes', 'QuoteNo'], 'CAE-AC-F01': ['Proformas', 'PINo'], 'CAE-AC-F02': ['Invoices', 'InvNo'],
  'CAE-AC-F03': ['Notes', 'NoteNo', function (r) { return String(r.Kind) !== 'CN'; }], 'CAE-AC-F04': ['Notes', 'NoteNo', function (r) { return String(r.Kind) === 'CN'; }],
  'CAE-PS-F01': ['Challans', 'ChallanNo', function (r) { return r.Kind === 'Delivery' || r.Kind === 'Sale'; }],
  'CAE-PS-F02': ['Challans', 'ChallanNo', function (r) { return r.Kind === 'Return'; }],
  'CAE-YW-F01': ['Challans', 'ChallanNo', function (r) { return r.Kind === 'Transfer'; }],
  'CAE-PR-F01': ['POs', 'PONo']
};
// Text for a cell: no control / zero-width / text-direction characters, spaces collapsed; a leading = + - @ is kept
// as text (no formula). '' if empty, too long or without a letter / digit.
function oText_(v, max) {
  if (typeof v !== 'string' || v.length > 4 * max) return '';
  var s = v.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ')
    .replace(/[\u00ad\u034f\u061c\u115f\u1160\u180e\u200b-\u200f\u202a-\u202e\u2060-\u2069\u2800\u3164\ufeff\uffa0]/g, '')
    .replace(/\p{Cf}/gu, '').replace(/(\p{M}{2})\p{M}+/gu, '$1').replace(/\s+/g, ' ').trim();
  return s.length <= max && /[\p{L}\p{N}]/u.test(s) ? s : '';
}
function oCell_(s) { s = String(s == null ? '' : s); return /^[=+\-@']/.test(s) ? "'" + s : s; }
function oUncell_(v) { return String(v == null ? '' : v); } // the sheet drops the leading quote itself (tests: oSheetLike_)
var ODOC_TEXT_ = { DocRegister: ['Title', 'Owner', 'ByHand', 'Notes'], DocHistory: ['By', 'Note'] };
function oTextCols_(db) { // free-text columns as plain text, so 1/2, TRUE, 1e5, 50 % or a date-like title stay text
  if (!db.ss || typeof db.sheet !== 'function') return;
  Object.keys(ODOC_TEXT_).forEach(function (t) { var s = db.sheet(t), h = db.headers(t);
    ODOC_TEXT_[t].forEach(function (k) { var j = h.indexOf(k); if (j >= 0) s.getRange(2, j + 1, Math.max(1, s.getMaxRows() - 1), 1).setNumberFormat('@'); }); });
}
function oTz_() { try { return Session.getScriptTimeZone() || 'Asia/Dhaka'; } catch (e) { return 'Asia/Dhaka'; } }
function oDayOf_(ms) {
  try { if (typeof Utilities !== 'undefined') return Utilities.formatDate(new Date(ms), oTz_(), 'yyyy-MM-dd'); } catch (e) { /* below */ }
  return new Date(ms + 6 * 36e5).toISOString().slice(0, 10); // Dhaka, UTC+6 all year
}
function oDayOk_(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var p = s.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  return d.getUTCFullYear() === p[0] && d.getUTCMonth() === p[1] - 1 && d.getUTCDate() === p[2];
}
function oDay_(v) { // a cell (Date or yyyy-mm-dd text) -> yyyy-mm-dd or ''
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.getFullYear() + '-' + pad(v.getMonth() + 1, 2) + '-' + pad(v.getDate(), 2); // sheet + script both on Dhaka time
  var s = oUncell_(v).slice(0, 10); return oDayOk_(s) ? s : '';
}
function oDayCell_(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); } // a real date in the sheet
function oDocSee_(a, dept) { return oIsDir_(a) || (a[dept] || 0) >= 1; }
function oDocCan_(a) { return oIsDir_(a) || (a.QH || 0) >= 3; }
function oDocDb_(env) { var db = env.db(); if (!db || !db.hasTab(ODOC_REG_) || !db.hasTab(ODOC_HIST_)) oFail_('NOREG'); return db; }
function oDocHist_(db, env, code, rev, date, by, note) { db.insert(ODOC_HIST_, { At: new Date(env.now()), Code: code, Rev: rev, Date: oDayCell_(date), By: oCell_(by), Note: oCell_(note) }); }
// History first, then the register (DocHistory is add-only): if the register write fails, a correcting "Not applied"
// entry follows, so a register change can never stand without its history entry.
function oDocTx_(db, env, code, rev, date, by, note, write) {
  oDocHist_(db, env, code, rev, date, by, note);
  try { return write(); } catch (e) { try { oDocHist_(db, env, code, rev, date, by, 'Not applied (save failed): ' + note); } catch (x) { /* sheet down */ } throw e; }
}
function oDocRow_(db, code) { var c = typeof code === 'string' ? code : ''; return /^CAE-[A-Z]{2}-[FPR]\d{2,3}$/.test(c) ? find(db.rows(ODOC_REG_), 'Code', c) : null; }
function oDocIssued_(db, code, byHand) {
  var seen = {}, n = 0, add = function (x) { x = String(x == null ? '' : x).trim(); if (x && !seen[x]) { seen[x] = 1; n++; } };
  var src = oHas_(ODOC_SRC_, code) ? ODOC_SRC_[code] : null;
  if (src && db.hasTab(src[0]) && db.headers(src[0]).indexOf('PDF') >= 0) db.rows(src[0]).forEach(function (r) { if (!blank(r.PDF) && (!src[2] || src[2](r))) add(r[src[1]]); });
  oUncell_(byHand).split(/[,;]/).forEach(add);
  return n;
}
// Set-up: both tabs at the end of the sheet + any seed row not there yet. Safe to repeat; never changes a row.
function oDocSetup_(env, db) {
  db.ensureTab(ODOC_REG_, ODOC_H_); db.ensureTab(ODOC_HIST_, ODOC_HH_); oTextCols_(db);
  var have = {}, n = 0;
  db.rows(ODOC_REG_).forEach(function (r) { have[String(r.Code)] = 1; });
  ODOC_SEED_.forEach(function (x) {
    if (have[x[0]]) return;
    oDocTx_(db, env, x[0], 0, ODOC_START_, 'System', x[6] ? 'Registered (document the system already makes)' + (x[7] ? '; issued by hand before: ' + x[7] : '') : 'Added as draft', function () {
      db.insert(ODOC_REG_, { Code: x[0], Title: x[1], Dept: x[2], Type: x[3], Rev: 0, RevDate: oDayCell_(ODOC_START_), Owner: x[4], Status: x[5], Sys: x[6], ByHand: x[7], Notes: '' }); });
    n++;
  });
  return n;
}
// Editor (or menu) > run once after installing D1; safe to repeat.
function officeDocSetup() { var env = oEnv_(), n = env.lock(function () { return oDocSetup_(env, env.db()); }); Logger.log('Document register rows added: ' + n); return n; }
function menuOfficeDocSetup() { var n = officeDocSetup(); SpreadsheetApp.getUi().alert('Document register: ' + n + ' row' + (n === 1 ? '' : 's') + ' added' + (n ? '.' : ' (all there already).')); }
function oDocPub_(db, r, hist) {
  return { code: String(r.Code), title: oUncell_(r.Title), dept: String(r.Dept), type: String(r.Type), rev: +r.Rev || 0, revDate: oDay_(r.RevDate),
    owner: oUncell_(r.Owner), status: String(r.Status), sys: String(r.Sys || ''), issued: r.Sys ? oDocIssued_(db, String(r.Code), r.ByHand) : 0, hist: hist || [] };
}
function officeDocList(token) {
  var L = officeGate_(token, ODOC_NEED_), a = oAcc_(L), env = oEnv_(), db = env.db();
  var depts = OFFICE_DEPTS_.filter(function (d) { return oDocSee_(a, d); }), out = { can: oDocCan_(a), today: oDayOf_(env.now()), depts: depts, setup: true, rows: [] };
  if (!db || !db.hasTab(ODOC_REG_) || !db.hasTab(ODOC_HIST_)) { out.setup = false; return out; }
  var H = Object.create(null);
  db.rows(ODOC_HIST_).forEach(function (h) { var c = String(h.Code); (H[c] = H[c] || []).push({ rev: +h.Rev || 0, date: oDay_(h.Date), by: oUncell_(h.By), note: oUncell_(h.Note), at: h.At instanceof Date ? h.At.getTime() : 0 }); });
  out.rows = db.rows(ODOC_REG_).filter(function (r) { return r.Code && oDocSee_(a, String(r.Dept)); }).map(function (r) {
    var h = (H[String(r.Code)] || []).sort(function (x, y) { return x.at - y.at; }).map(function (x) { return { rev: x.rev, date: x.date, by: x.by, note: x.note }; });
    return oDocPub_(db, r, h);
  });
  return out;
}
// Write: gate before (no wait for strangers / readers) and again inside the lock; fresh sheet read inside the lock.
function oDocW_(token, fn) {
  var env = oEnv_(), pre = officeGate_(token, ODOC_NEED_);
  if (!oDocCan_(oAcc_(pre))) oFail_('NOACCESS');
  return env.lock(function () {
    var L = officeGate_(token, ODOC_NEED_), a = oAcc_(L);
    if (!oDocCan_(a)) oFail_('NOACCESS');
    return fn(env, oDocDb_(env), L, a, oDayOf_(env.now()));
  });
}
function oDocMine_(db, a, code) { var d = oDocRow_(db, code); if (!d || !oDocSee_(a, String(d.Dept))) oFail_('NOTFOUND'); return d; } // not seen = not there
// r = {isNew, dept, type, title, owner, status} -> {code} \u00b7 r = {code, rev, was, title, owner} -> {ok, same?} (rev / was as shown, else STALE)
function officeDocSave(token, r) {
  officeGate_(token, ODOC_NEED_);
  return oDocW_(token, function (env, db, L, a, day) {
    r = r && typeof r === 'object' && !Array.isArray(r) ? r : {};
    var title = oText_(r.title, 120), owner = r.owner == null || r.owner === '' ? '' : oText_(r.owner, 60);
    if (!title) oFail_('BADINPUT|title');
    if (owner === '' && r.owner != null && r.owner !== '' ) oFail_('BADINPUT|owner');
    if (r.isNew === true) {
      if (typeof r.dept !== 'string' || OFFICE_DEPTS_.indexOf(r.dept) < 0 || !oDocSee_(a, r.dept)) oFail_('BADINPUT|department');
      if (typeof r.type !== 'string' || !oHas_(ODOC_TYPES_, r.type)) oFail_('BADINPUT|type');
      if (r.status !== 'Draft' && r.status !== 'Active') oFail_('BADINPUT|status');
      var p = 'CAE-' + r.dept + '-' + ODOC_TYPES_[r.type], n = 0;
      db.rows(ODOC_REG_).forEach(function (x) { var c = String(x.Code); if (c.indexOf(p) === 0 && /^\d{2,3}$/.test(c.slice(p.length))) n = Math.max(n, +c.slice(p.length)); });
      if (n >= 999) oFail_('BADINPUT|type');
      var code = p + pad(n + 1, 2);
      oDocTx_(db, env, code, 0, day, L.name, 'Added' + (r.status === 'Active' ? ' and approved' : ' as draft'), function () {
        db.insert(ODOC_REG_, { Code: code, Title: oCell_(title), Dept: r.dept, Type: r.type, Rev: 0, RevDate: oDayCell_(day), Owner: oCell_(owner), Status: r.status, Sys: '', ByHand: '', Notes: '' }); });
      return { code: code };
    }
    var d = oDocMine_(db, a, r.code), ch = [], q = function (x) { x = String(x); return '"' + (x.length > 60 ? x.slice(0, 57) + '...' : x) + '"'; };
    if (r.rev !== (+d.Rev || 0) || (r.was !== undefined && r.was !== String(d.Status))) oFail_('STALE');
    if (r.old !== undefined && (!r.old || typeof r.old !== 'object' || r.old.title !== oUncell_(d.Title) || (r.old.owner == null ? '' : r.old.owner) !== oUncell_(d.Owner))) oFail_('STALE'); // details changed meanwhile
    if (oUncell_(d.Title) !== title) ch.push('title ' + q(oUncell_(d.Title)) + ' -> ' + q(title));
    if (oUncell_(d.Owner) !== owner) ch.push('owner ' + q(oUncell_(d.Owner)) + ' -> ' + q(owner));
    if (!ch.length) return { ok: true, same: true };
    oDocTx_(db, env, d.Code, +d.Rev || 0, day, L.name, 'Details changed: ' + ch.join('; '), function () { db.update(ODOC_REG_, d, { Title: oCell_(title), Owner: oCell_(owner) }); });
    return { ok: true };
  });
}
// Rev +1 with what changed + issue date (from 2020 up to 30 days ahead). rev = the Rev the page showed.
function officeDocRevise(token, code, rev, note, date) {
  officeGate_(token, ODOC_NEED_);
  return oDocW_(token, function (env, db, L, a, day) {
    var d = oDocMine_(db, a, code), cur = +d.Rev || 0;
    if (rev !== cur) oFail_('STALE');
    if (d.Status !== 'Active' && d.Status !== 'Draft') oFail_('WITHDRAWN'); // Withdrawn or anything typed by hand
    note = oText_(note, 300); if (!note) oFail_('BADINPUT|what changed');
    var max = oDayOf_(env.now() + 30 * 864e5);
    if (!oDayOk_(date) || date < '2020-01-01' || date > max || date < oDay_(d.RevDate)) oFail_('BADINPUT|date'); // never before the current Rev
    oDocTx_(db, env, d.Code, cur + 1, date, L.name, note, function () { db.update(ODOC_REG_, d, { Rev: cur + 1, RevDate: oDayCell_(date) }); });
    return { rev: cur + 1 };
  });
}
// status Active (approve a Draft / make a Withdrawn one active again) or Withdrawn (not for system documents).
// rev + was = the Rev and status the page showed; anything else -> STALE (a late click never undoes a newer change).
function officeDocStatus(token, code, status, rev, was) {
  officeGate_(token, ODOC_NEED_);
  return oDocW_(token, function (env, db, L, a, day) {
    var d = oDocMine_(db, a, code), cur = +d.Rev || 0;
    if (rev !== cur || was !== String(d.Status)) oFail_('STALE'); // was = the status the page showed
    if (status !== 'Active' && status !== 'Withdrawn') oFail_('BADINPUT|status');
    if (status === 'Withdrawn' && d.Sys) oFail_('SYSDOC');
    if (d.Status === status) return { ok: true, same: true };
    var from = String(d.Status);
    oDocTx_(db, env, d.Code, cur, day, L.name, status === 'Active' ? (from === 'Draft' ? 'Approved' : 'Made active again') : 'Withdrawn', function () { db.update(ODOC_REG_, d, { Status: status }); });
    return { ok: true };
  });
}

// ----------------------------------------------------------------- D1 (c) shared PDF footer (ISO 9001 7.5)
// CAE Doc Base footers carry {{DocCtl}} and {{DocRec}}: every system PDF prints
//   <code> · Rev <n> · <issue date> · Page x / y · <record no.>   (line 1)
// Code by document kind (challan / note by their Kind); Rev + issue date from DocRegister as it is when the PDF is made
// (register not set up yet: the seed, Rev 0, 17 Nov 2026; row deleted / unknown kind: no code part, the page and
// record no. still print). Old PDFs keep their old footer (nothing is made again).
// Wraps: every PDF_SPECS entry (adds spec.docCtl; a register error never stops a PDF) and renderInto (fills the tokens).
var ODOC_PDF_ = {
  Quote: 'CAE-SC-F01', PI: 'CAE-AC-F01', Invoice: 'CAE-AC-F02', PO: 'CAE-PR-F01',
  Note: function (r) { return String(r.Kind) === 'CN' ? 'CAE-AC-F04' : 'CAE-AC-F03'; }, // r = the record's row (missing row: no code)
  Challan: function (r) { return r.Kind === 'Delivery' || r.Kind === 'Sale' ? 'CAE-PS-F01' : r.Kind === 'Return' ? 'CAE-PS-F02' : r.Kind === 'Transfer' ? 'CAE-YW-F01' : ''; }
}; // same split as ODOC_SRC_ (issued counts)
var ODOC_MON_ = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function oDayTxt_(s) { if (!oDayOk_(s)) return ''; var p = s.split('-').map(Number); return p[2] + ' ' + ODOC_MON_[p[1] - 1] + ' ' + p[0]; }
// -> {code, rev, date, text} or null. text ends with ' · ' (the footer goes on with 'Page x / y'). Rev only if a whole
// number 0-999 (else left out); several rows with the code: the Active one, else the first.
function oDocCtlFor_(db, what, spec) {
  var m = typeof what === 'string' && oHas_(ODOC_PDF_, what) ? ODOC_PDF_[what] : null;
  if (!m || !spec || typeof spec !== 'object') return null;
  var row = typeof m === 'function' ? find(db.rows(spec.kind), spec.key, spec.id) : null, code = typeof m === 'function' ? (row ? m(row) : '') : m;
  if (!code) return null;
  var rev, day, has = typeof db.hasTab === 'function' && db.hasTab(ODOC_REG_);
  if (has) {
    var rs = db.rows(ODOC_REG_).filter(function (x) { return String(x.Code) === code; }), r = rs.filter(function (x) { return x.Status === 'Active'; })[0] || rs[0];
    if (!r) return null;
    var rv = typeof r.Rev === 'number' ? r.Rev : /^\s*\d{1,3}\s*$/.test(oUncell_(r.Rev)) ? +oUncell_(r.Rev) : NaN;
    rev = rv === Math.floor(rv) && rv >= 0 && rv <= 999 ? rv : null; day = oDay_(r.RevDate);
  }
  else { var s = ODOC_SEED_.filter(function (x) { return x[0] === code; })[0]; if (!s) return null; rev = 0; day = ODOC_START_; }
  return { code: code, rev: rev, date: day, text: code + (rev == null ? '' : ' · Rev ' + rev) + (day ? ' · ' + oDayTxt_(day) : '') + ' · ' };
}
function oCtlWrap_(what, f) {
  if (typeof f !== 'function' || f.officeCtl_) return f;
  var w = function (db) {
    var s = f.apply(this, arguments);
    if (s && typeof s === 'object') { try { s.docCtl = oDocCtlFor_(db, what, s); } catch (e) { s.docCtl = null; } }
    return s;
  };
  w.officeCtl_ = f;
  return w;
}
// Fills {{DocCtl}} / {{DocRec}} in every header and footer section (replacement text escaped for replaceText).
// Never stops a PDF: an error here is logged and the PDF is made anyway.
function oFootFill_(doc, spec) {
  try { return oFootFill0_(doc, spec); } catch (e) { try { Logger.log('PDF footer: ' + e.message); } catch (x) { /* no logger */ } return doc; }
}
function oFootFill0_(doc, spec) {
  var c = spec && spec.docCtl && typeof spec.docCtl.text === 'string' ? spec.docCtl.text : '';
  var no = spec && spec.docNo != null && String(spec.docNo) !== '' ? ' · ' + String(spec.docNo) : '';
  var tok = { DocCtl: c, DocRec: no }, parent = doc.getBody().getParent(), T = DocumentApp.ElementType;
  for (var i = 0; i < parent.getNumChildren(); i++) {
    var ch = parent.getChild(i), ty = ch.getType(), sec = ty === T.HEADER_SECTION ? ch.asHeaderSection() : ty === T.FOOTER_SECTION ? ch.asFooterSection() : null;
    if (sec) Object.keys(tok).forEach(function (k) { sec.replaceText('\\{\\{' + k + '\\}\\}', tok[k].replace(/\\/g, '\\\\').replace(/\$/g, '\\$')); });
  }
  return doc;
}
if (typeof PDF_SPECS === 'object' && PDF_SPECS) Object.keys(PDF_SPECS).forEach(function (k) { PDF_SPECS[k] = oCtlWrap_(k, PDF_SPECS[k]); });
if (typeof renderInto === 'function') {
  var OF_render0_ = renderInto;
  renderInto = function (doc, spec, co) { var d = OF_render0_.apply(this, arguments); oFootFill_(doc, spec); return d; };
}

// ----------------------------------------------------------------- D1 (c2) Drive folders for every system PDF
// Under Core Access Ops > PDF (Decisions > Drive folder structure, user 17 Nov):
//   by year   Quotes / Proformas / Invoices / Notes / POs > <year>; stock transfers (no job) Yard > Transfers > <year>
//   by job    Projects > Active > <JobNo> - <Client> - <Site> > Challans (delivery + return); a job folder already moved to
//             Projects > Archive > <year> (G2) is found there. Editable Docs: an Editable folder inside each.
// Year = the year in the record number (numbers restart each year), else the record date, else this year.
// Folder names are made here only, cleaned (no / \ : * ? " < > |, no control / format characters). A job folder is
// found by its JobNo part, so a renamed client or site never makes a second folder.
// Wraps: makePdf (o.folder = the new folder; o.folder given by the caller, e.g. the sample set, is left alone; any
// error working out the folder -> the old folder, the PDF is still made).
// One-time move of the PDFs + Editable Docs made before (officePdfMoveDry, then officePdfMoveApply): PDFs
// directly in PDF > <type> and Google Docs in PDF > <type> > Editable go to the new folders (one that fails is listed, the rest go on); a Drive move keeps the file id, so the
// PDF links in the sheet keep working (checked after); safe to repeat. Other folders (_Samples, Labels, Templates,
// year folders) are not touched.
var OPDF_ = { // what: [tab, key, date column, folder under PDF]
  Quote: ['Quotes', 'QuoteNo', 'QuoteDate', 'Quotes'], PI: ['Proformas', 'PINo', 'PIDate', 'Proformas'],
  Invoice: ['Invoices', 'InvNo', 'InvDate', 'Invoices'], Note: ['Notes', 'NoteNo', 'NoteDate', 'Notes'],
  PO: ['POs', 'PONo', 'PODate', 'POs'], Challan: ['Challans', 'ChallanNo', 'ChallanDate', 'Challans']
};
var OPDF_DASH_ = ' – '; // " – " between the parts of a job folder name
function oFolderName_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').replace(/\p{Cf}/gu, '')
    .replace(/[\\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
  s = s.slice(0, max || 60).trim();
  return /^\.+$/.test(s) ? '' : s;
}
function oPdfYear_(no, row, dateKey, now) {
  var m = String(no == null ? '' : no).match(/(?:^|[\/-])(20\d\d)(?=[\/-]|$)/);
  if (m) return m[1];
  var d = row && dateKey ? row[dateKey] : null;
  if (d instanceof Date && !isNaN(d.getTime())) return String(d.getFullYear());
  if (d && typeof toDate === 'function') { try { var t = toDate(d); if (t instanceof Date && !isNaN(t.getTime())) return String(t.getFullYear()); } catch (e) { /* below */ } }
  return oDayOf_(now == null ? Date.now() : now).slice(0, 4);
}
// Job folder name + the part it is found by.
function oJobFolder_(db, jobNo) {
  var key = oFolderName_(jobNo, 40); if (!key) return null;
  var job = (db.hasTab('Jobs') ? find(db.rows('Jobs'), 'JobNo', jobNo) : null) || {}, cu = db.hasTab('Customers') ? find(db.rows('Customers'), 'CustID', job.CustID) : null;
  var si = db.hasTab('Sites') ? find(db.rows('Sites'), 'SiteID', job.SiteID) : null;
  var name = [key, oFolderName_(cu && cu.Name, 50), oFolderName_(si && (blank(si.Project) ? si.Address : si.Project), 50)].filter(function (x) { return x; }).join(OPDF_DASH_);
  return { job: true, n: name, key: key };
}
// -> list of folder steps under the Core Access Ops folder ({n} or the job step), or null = keep the old folder.
function oPdfPath_(db, what, no, now) {
  var m = typeof what === 'string' && oHas_(OPDF_, what) ? OPDF_[what] : null;
  if (!m || no == null || String(no) === '') return null;
  var row = db.hasTab(m[0]) ? find(db.rows(m[0]), m[1], no) : null, y = oPdfYear_(no, row, m[2], now);
  if (what !== 'Challan') return [{ n: 'PDF' }, { n: m[3] }, { n: y }];
  if (!row) return null;
  if (row.Kind === 'Transfer' || blank(row.JobNo)) return [{ n: 'PDF' }, { n: 'Yard' }, { n: 'Transfers' }, { n: y }];
  var jf = oJobFolder_(db, row.JobNo);
  return jf ? [{ n: 'PDF' }, { n: 'Projects' }, { n: 'Active' }, jf, { n: 'Challans' }] : null;
}
function oPathText_(path) { return path.map(function (p) { return p.n; }).join(' › '); }
function oIt_(it) { var a = []; while (it.hasNext()) a.push(it.next()); return a; }
function oAlive_(f) { try { return !f.isTrashed(); } catch (e) { return true; } }
// One folder by name (job step: by its JobNo part). make = false: find only (null if missing).
// After making a folder, a second one of that name made at the same moment by another run -> both use the oldest.
function oOldest_(a) { return a.sort(function (x, y) { return x.getDateCreated() - y.getDateCreated(); })[0] || null; } // Drive lists in no fixed order
function oSubAll_(parent, step) {
  if (!step.job) return oIt_(parent.getFoldersByName(step.n)).filter(oAlive_);
  return oIt_(parent.getFolders()).filter(function (f) { var n = f.getName(); return oAlive_(f) && (n === step.key || n.indexOf(step.key + OPDF_DASH_) === 0); });
}
function oSubFind_(parent, step) { return oOldest_(oSubAll_(parent, step)); }
function oSub_(parent, step, make) {
  var f = oSubFind_(parent, step);
  if (f || !make) return f;
  var made = parent.createFolder(step.n);
  return oSubFind_(parent, step) || made; // two made at the same moment: both use the oldest; the list can lag behind a new folder
}
function oPdfDir_(base, path, make) {
  var f = base;
  for (var i = 0; i < path.length; i++) {
    var st = path[i], nx = path[i + 1];
    if (st.n === 'Active' && nx && nx.job) { // a job folder moved to Projects > Archive > <year> (G2) stays there
      var act = oSubFind_(f, st), g = act ? oSubFind_(act, nx) : null, arc = g ? null : oSubFind_(f, { n: 'Archive' });
      if (arc && !g) g = oOldest_(oIt_(arc.getFolders()).filter(oAlive_).map(function (yr) { return oSubFind_(yr, nx); }).filter(function (x) { return x; }));
      if (g) { f = g; i++; continue; }
    }
    f = oSub_(f, st, make);
    if (!f) return null;
  }
  return f;
}
// makePdf, new folders. make0 = the original makePdf, base() = the Core Access Ops folder.
function oPdfMake_(db, what, no, o, make0, base, self) {
  var args = [db, what, no, o];
  if ((o && o.folder) || typeof what !== 'string' || !oHas_(OPDF_, what)) return make0.apply(self, args);
  var dir = null;
  try { var p = oPdfPath_(db, what, no); dir = p ? oPdfDir_(base(), p, true) : null; } catch (e) { try { Logger.log('PDF folder: ' + e.message); } catch (x) { /* no logger */ } dir = null; }
  if (!dir) return make0.apply(self, args);
  var o2 = {}; if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { o2[k] = o[k]; });
  o2.folder = dir;
  var r = make0.call(self, db, what, no, o2);
  try { oPdfOldBin_(base(), what, r && r.file, dir, [oPdfIdOf_(r && r.url), oPdfIdOf_(r && r.doc)]); } catch (e) { /* the new PDF is made; an old copy may stay */ }
  return r;
}
// A remade document: the same-named PDF + Doc made before the change (PDF > <type>, PDF > <type> > Editable) go to the bin.
function oPdfOldBin_(root, what, file, dir, mine) { // mine = ids of the PDF + Doc just made: never binned
  if (typeof file !== 'string' || !/\.pdf$/i.test(file)) return;
  var keep = (mine || []).filter(function (x) { return x; }), ok = function (f) { return oAlive_(f) && keep.indexOf(f.getId()) < 0; };
  var pdf = oSubFind_(root, { n: 'PDF' }), old = pdf ? oSubFind_(pdf, { n: OPDF_[what][3] }) : null;
  if (!old || old.getId() === dir.getId()) return;
  var ed = oSubFind_(old, { n: 'Editable' }), doc = file.replace(/\.pdf$/i, '');
  oIt_(old.getFiles()).forEach(function (f) { if (ok(f) && f.getName() === file) f.setTrashed(true); });
  if (ed) oIt_(ed.getFiles()).forEach(function (f) { if (ok(f) && f.getName() === doc) f.setTrashed(true); });
}
if (typeof makePdf === 'function' && !makePdf.officePdf_) {
  var OF_makePdf0_ = makePdf;
  makePdf = function (db, what, no, o) { return oPdfMake_(db, what, no, o, OF_makePdf0_, function () { return opsFolder_(db); }, this); };
  makePdf.officePdf_ = OF_makePdf0_;
}
// ---- one-time move. drive = {base: Core Access Ops folder, file: id -> file}. apply false = plan only, nothing changes.
function oPdfIdOf_(url) { var m = String(url || '').match(/\/d\/([\w-]{20,})/) || String(url || '').match(/[?&]id=([\w-]{20,})/); return m ? m[1] : ''; }
function oPdfMove_(db, drive, apply, now) {
  var out = { moves: [], left: [], links: { ok: 0, bad: [] }, apply: !!apply };
  var pdf = oSubFind_(drive.base, { n: 'PDF' });
  if (!pdf) { out.left.push('No PDF folder'); return out; }
  var made = {}; // path text -> folder (apply) so each new folder is looked up once
  var dirFor = function (path) { var t = oPathText_(path); if (!(t in made)) made[t] = apply ? oPdfDir_(drive.base, path, true) : oPdfDir_(drive.base, path, false); return made[t]; };
  var expect = {}; // file id -> folder path text (for the link check)
  Object.keys(OPDF_).forEach(function (what) {
    var m = OPDF_[what], old = oSubFind_(pdf, { n: m[3] }); if (!old) return;
    var ed = oSubFind_(old, { n: 'Editable' });
    var recs = db.hasTab(m[0]) ? db.rows(m[0]).filter(function (r) { return !blank(r[m[1]]); }).map(function (r) { return { no: r[m[1]], pre: fileName_(r[m[1]]) }; })
      .sort(function (a, b) { return b.pre.length - a.pre.length; }) : [];
    var plan = function (f, isDoc) {
      var base = f.getName().replace(/\.pdf$/i, ''), r = recs.filter(function (x) { return base === x.pre || base.indexOf(x.pre + ' ') === 0; })[0], path = null;
      if (r) path = oPdfPath_(db, what, r.no, now);
      else if (what !== 'Challan') { var y = base.match(/^[A-Za-z]+-[A-Za-z]+-(20\d\d)-/); if (y) path = [{ n: 'PDF' }, { n: m[3] }, { n: y[1] }]; }
      if (!path) { out.left.push(m[3] + (isDoc ? ' \u203a Editable' : '') + ' \u203a ' + f.getName() + ' (no record found)'); return; }
      var full = isDoc ? path.concat([{ n: 'Editable' }]) : path, to = oPathText_(full), dest = apply ? dirFor(full) : oPdfDir_(drive.base, full, false);
      if (dest && oIt_(dest.getFiles()).some(function (x) { return oAlive_(x) && x.getName() === f.getName() && x.getId() !== f.getId(); })) {
        out.left.push(m[3] + (isDoc ? ' \u203a Editable' : '') + ' \u203a ' + f.getName() + ' (a newer copy is already in ' + to + ')'); return; }
      if (apply) f.moveTo(dest);
      if (!isDoc) expect[f.getId()] = { to: to, id: dest ? dest.getId() : '' };
      out.moves.push((isDoc ? 'Doc ' : 'PDF ') + f.getName() + '  ->  ' + to);
    };
    var safe = function (f, isDoc) { try { plan(f, isDoc); } catch (e) { out.left.push(m[3] + ' \u203a ' + f.getName() + ' (not moved: ' + String(e && e.message || e).slice(0, 80) + ')'); } };
    var mime = function (f) { try { return typeof f.getMimeType === 'function' ? String(f.getMimeType()) : ''; } catch (e) { return ''; } };
    oIt_(old.getFiles()).filter(oAlive_).filter(function (f) { return /\.pdf$/i.test(f.getName()); }).forEach(function (f) { safe(f, false); }); // PDFs only
    if (ed) oIt_(ed.getFiles()).filter(oAlive_).filter(function (f) { var t = mime(f); return !t || t === 'application/vnd.google-apps.document'; }).forEach(function (f) { safe(f, true); }); // Google Docs only
  }); // the emptied old folders stay (a fallback PDF may still be written there; an empty folder costs nothing)
  // links in the sheet: every PDF link still opens a file that is not in the bin (after apply: and is in its new folder)
  Object.keys(OPDF_).forEach(function (what) {
    var m = OPDF_[what]; if (!db.hasTab(m[0]) || db.headers(m[0]).indexOf('PDF') < 0) return;
    db.rows(m[0]).forEach(function (r) {
      if (blank(r.PDF)) return;
      var id = oPdfIdOf_(r.PDF), f = null, why = '';
      try { f = id ? drive.file(id) : null; } catch (e) { f = null; }
      if (!f) why = 'link does not open'; else if (!oAlive_(f)) why = 'file is in the bin';
      else if (apply && expect[id]) { var ps = oIt_(f.getParents()).map(function (x) { return x.getId(); });
        if (!expect[id].id || ps.indexOf(expect[id].id) < 0) why = 'not in ' + expect[id].to; }
      if (why) out.links.bad.push(String(r[m[1]]) + ': ' + why); else out.links.ok++;
    });
  });
  return out;
}
function oPdfMoveRun_(apply) {
  var db = oEnv_().db(); // no script lock: a long Drive job must not hold up sign-ins and the sweep
  return (function () {
    var r = oPdfMove_(db, { base: opsFolder_(db), file: function (id) { return DriveApp.getFileById(id); } }, apply);
    var txt = (apply ? 'PDF folders: moved ' : 'PDF folders, plan only (nothing changed): ') + r.moves.length + ' file(s)\n' + r.moves.join('\n') +
      (r.left.length ? '\nLeft where they are: ' + r.left.length + '\n' + r.left.join('\n') : '') +       '\nSheet PDF links OK: ' + r.links.ok + (r.links.bad.length ? '\nLinks to check: ' + r.links.bad.length + '\n' + r.links.bad.join('\n') : '');
    if (apply) log_(db, 'PDF folders', '', r.moves.length + ' moved · ' + r.left.length + ' left · links OK ' + r.links.ok + (r.links.bad.length ? ' · ' + r.links.bad.length + ' to check' : ''));
    Logger.log(txt);
    return r;
  })();
}
// Editor: first officePdfMoveDry (the list), then officePdfMoveApply. Both safe to repeat.
function officePdfMoveDry() { return oPdfMoveRun_(false); }
function officePdfMoveApply() { return oPdfMoveRun_(true); }
// Editor: live check without touching a real record: one TEST quote PDF from the self-test data (in memory, real
// Settings) is made in its new folder (Quotes > <year>), checked, then both files go to the bin.
function officePdfFolderCheck() {
  var sdb = oEnv_().db(), db = pdfTestDb_();
  db.t.Settings = sdb.rows('Settings').map(function (r) { return Object.assign({}, r); });
  var q = find(db.rows('Quotes'), 'QuoteNo', 'CAE/Q/2026/001'), c = find(db.rows('Customers'), 'CustID', q.CustID);
  c.Name = 'TEST – folder check'; q.QuoteNo = 'CAE/Q/2026/T01'; db.rows('QuoteLines').forEach(function (l) { if (l.QuoteNo === 'CAE/Q/2026/001') l.QuoteNo = 'CAE/Q/2026/T01'; });
  var r = makePdf(db, 'Quote', 'CAE/Q/2026/T01', { noLink: true, noLog: true }), ids = [oPdfIdOf_(r.url), r.doc ? oPdfIdOf_(r.doc) : ''], txt = 'NOT OK', ok = false;
  try {
    var pdf = DriveApp.getFileById(ids[0]), par = oIt_(pdf.getParents())[0], gp = oIt_(par.getParents())[0];
    var doc = ids[1] ? DriveApp.getFileById(ids[1]) : null, dpar = doc ? oIt_(doc.getParents())[0] : null;
    ok = par.getName() === oPdfYear_('CAE/Q/2026/T01') && gp.getName() === 'Quotes' && (!doc || (dpar.getName() === 'Editable' && oIt_(dpar.getParents())[0].getId() === par.getId()));
    txt = (ok ? 'OK' : 'NOT OK') + ': ' + r.file + ' in ' + gp.getName() + ' \u203a ' + par.getName() + (doc ? '; Doc in ' + par.getName() + ' \u203a ' + dpar.getName() : '');
  } finally { ids.forEach(function (id) { if (id) try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* already gone */ } }); }
  Logger.log(txt + ' (both TEST files are in the bin now)');
  return ok;
}
function menuOfficePdfDry() { var r = officePdfMoveDry(); SpreadsheetApp.getUi().alert('PDF folders (plan, nothing changed)', r.moves.length + ' file(s) to move, ' + r.left.length + ' left, ' + r.links.ok + ' links OK' + (r.links.bad.length ? ', ' + r.links.bad.length + ' to check' : '') + '.\nFull list: Extensions › Apps Script › Executions.', SpreadsheetApp.getUi().ButtonSet.OK); }
function menuOfficePdfApply() { var ui = SpreadsheetApp.getUi(); if (ui.alert('Move the PDFs into the new folders?', 'Year folders + job folders. Links in the sheet stay the same. Safe to repeat.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var r = officePdfMoveApply(); ui.alert('PDF folders', r.moves.length + ' moved, ' + r.left.length + ' left, ' + r.links.ok + ' links OK' + (r.links.bad.length ? ', ' + r.links.bad.length + ' to check' : '') + '.', ui.ButtonSet.OK); }

// ----------------------------------------------------------------- project-wide gate (web app = execute as me, access Anyone)
var OFFICE_WEB_API_ = ['doGet', 'officeLogin', 'officeMe', 'officeLogout', // later screens add theirs (each starts with officeGate_)
  'officeUsersList', 'officeStaffList', 'officeUserSave', 'officeUserReset', 'officeUserBlock', 'officeUserSignOutAll',
  'officeDocList', 'officeDocSave', 'officeDocRevise', 'officeDocStatus'];
var OFFICE_OPEN_ = { // triggers: run without a signed-in user only with a real event (JSON from a web page carries no methods)
  onOpen: function (e) { return !!(e && e.source && typeof e.source.getId === 'function'); },
  onEdit: function (e) { return !!(e && e.range && typeof e.range.getSheet === 'function'); },
  appSweep: function (e) { var u = e && e.triggerUid; return (typeof u === 'string' || typeof u === 'number') && String(u).length > 3 && oEnv_().triggerIds().indexOf(String(u)) >= 0; }
};
var OFFICE_DEPTH_ = 0;
var OFFICE_G_ = (function () { return this; })();
function oCallerOk_() { // the Google user at the keyboard is the user the script runs as (anonymous web callers: active = '')
  var w; try { w = oEnv_().who(); } catch (e) { return false; }
  var a = String(w && w.active || '').toLowerCase();
  return !!a && a === String(w.effective || '').toLowerCase();
}
function oTry_(fn, x) { try { return fn(x); } catch (e) { return false; } }
function oSkip_(k, f) { return typeof f !== 'function' || /_$/.test(k) || !!f.officeRaw_; } // private (not callable from a page) or already wrapped
function oWrap_(name, f) {
  var web = OFFICE_WEB_API_.indexOf(name) >= 0, trig = Object.prototype.hasOwnProperty.call(OFFICE_OPEN_, name) ? OFFICE_OPEN_[name] : null;
  var w = function () {
    if (OFFICE_DEPTH_ === 0) {
      if (web) { if (oUnguarded_(OFFICE_G_).length) throw new Error('NOACCESS'); } // a file after this one: fail closed
      else if (!(trig && oTry_(trig, arguments[0])) && !oCallerOk_()) throw new Error('NOACCESS');
    }
    OFFICE_DEPTH_++;
    try { return new.target ? Reflect.construct(f, arguments, new.target) : f.apply(this, arguments); } finally { OFFICE_DEPTH_--; }
  };
  w.prototype = f.prototype; // new + instanceof keep working for constructors (SheetDb, MemDb)
  try { Object.defineProperty(w, 'name', { value: name }); } catch (e) { /* keep going */ }
  w.officeRaw_ = f;
  return w;
}
function oGuardAll_(G) {
  var n = 0;
  Object.keys(G).forEach(function (k) { var f = G[k]; if (!oSkip_(k, f)) { G[k] = oWrap_(k, f); n++; } });
  return n;
}
function oUnguarded_(G) { return Object.keys(G).filter(function (k) { return !oSkip_(k, G[k]); }); }

// ----------------------------------------------------------------- self-test (in memory; real logins untouched)
if (typeof selfTestAllParts_ === 'function') {
  var OF_parts0_ = selfTestAllParts_;
  selfTestAllParts_ = function () { return OF_parts0_().concat([['OF', selfTestOffice()]]); };
}
function oMemEnv_() {
  var store = {}, cache = {}, t = { now: 1.8e12 }, seq = 0;
  return {
    store: store, clock: t,
    get: function (k) { try { return store[k] ? JSON.parse(store[k]) : null; } catch (e) { return null; } },
    put: function (k, o) { store[k] = JSON.stringify(o); },
    del: function (k) { delete store[k]; },
    keys: function () { return Object.keys(store); },
    now: function () { return t.now; },
    rand: function () { seq++; var s = ''; while (s.length < 64) s += ((seq * 2654435761 + s.length * 40503) >>> 0).toString(16); return s.slice(0, 64); },
    sha: function (s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; return 'h' + h.toString(36); },
    bytes: function (s) { s = String(s); var b = []; for (var i = 0; i < s.length; i++) b.push((s.charCodeAt(i) & 255) << 24 >> 24); return b; },
    hmac: function (v, k) { var h = 5381, out = []; var a = k.concat([7]).concat(v); for (var i = 0; i < a.length; i++) h = ((h * 33) ^ (a[i] & 255)) >>> 0;
      for (var j = 0; j < 32; j++) { h = (h * 1103515245 + 12345) >>> 0; out.push((h >>> 16 & 255) << 24 >> 24); } return out; },
    b64: function (b) { return 'b' + b.map(function (x) { return (x & 255).toString(16); }).join(''); },
    cache: cache,
    cget: function (k) { var c = cache[k]; return c && c.exp > t.now ? JSON.parse(c.v) : null; },
    cput: function (k, o, sec) { cache[k] = { v: JSON.stringify(o), exp: t.now + sec * 1000 }; },
    cdel: function (k) { delete cache[k]; },
    lock: function (fn) { return fn(); },
    who: function () { return t.who || { active: 'owner@test.com', effective: 'owner@test.com' }; },
    triggerIds: function () { return t.trig || ['7654321']; },
    db: function () { return t.db || null; }
  };
}
function selfTestOffice() {
  var pass = 0, fail = 0, log = [];
  var eq = function (n, got, want) { if (got === want) pass++; else { fail++; log.push('FAIL ' + n + ': got ' + JSON.stringify(got) + ', want ' + JSON.stringify(want)); } };
  var err = function (fn) { try { fn(); return 'no error'; } catch (e) { return e.message; } };
  var keep = OFFICE_ENV_, keepIt = OFFICE_CFG_.kdfIters, keepPm = OFFICE_CFG_.maxPerMin, env = oMemEnv_(); OFFICE_ENV_ = env; OFFICE_CFG_.kdfIters = 3; OFFICE_CFG_.maxPerMin = 1e9;
  try {
    var H = 36e5, D = 864e5, M = 60000;
    eq('O1 add login', oSaveLogin_(env, { email: ' Jamal@Test.com ', name: 'Jamal Uddin', role: 'admin', password: 'GoodPass1' }).level, 'Director');
    eq('O2 bad role refused', /Role must be/.test(err(function () { oSaveLogin_(env, { email: 'x@test.com', name: 'X', role: 'Boss', password: 'GoodPass1' }); })), true);
    eq('O3 short password refused', /at least 8/.test(err(function () { oSaveLogin_(env, { email: 'x@test.com', name: 'X', role: 'Field', password: 'short' }); })), true);
    eq('O4 bad email refused', /valid email/.test(err(function () { oSaveLogin_(env, { email: 'nope', name: 'X', role: 'Field', password: 'GoodPass1' }); })), true);
    eq('O5 new login needs a password', /password is needed/.test(err(function () { oSaveLogin_(env, { email: 'y@test.com', name: 'Y', role: 'Field' }); })), true);
    oSaveLogin_(env, { email: 'site1@test.com', name: 'Site One', role: 'Field', password: 'SitePass1' });
    var r = officeLogin('JAMAL@test.com ', 'GoodPass1', false);
    eq('O6 sign in (case / spaces ignored)', /^[a-f0-9]{64}$/.test(r.token) && r.user.level === 'Director', true);
    eq('O7 public user has no secrets', JSON.stringify(r.user).indexOf('hash') < 0 && JSON.stringify(r.user).indexOf('salt') < 0, true);
    eq('O8 password not stored as text', JSON.stringify(env.store).indexOf('GoodPass1') < 0, true);
    eq('O9 me', officeMe(r.token).email, 'jamal@test.com');
    eq('O10 wrong password', err(function () { officeLogin('jamal@test.com', 'nope', false); }), 'BAD|4');
    eq('O11 unknown email looks the same', err(function () { officeLogin('ghost@test.com', 'whatever1', false); }), 'BAD|4');
    eq('O12 good sign-in clears the count', !!officeLogin('jamal@test.com', 'GoodPass1', false).token && !env.cget('OF:jamal@test.com'), true);
    for (var i = 0; i < 4; i++) err(function () { officeLogin('site1@test.com', 'bad', false); });
    eq('O13 5th wrong locks 15 min', err(function () { officeLogin('site1@test.com', 'bad', false); }), 'LOCKED|15');
    eq('O14 right password while locked', err(function () { officeLogin('site1@test.com', 'SitePass1', false); }), 'LOCKED|15');
    env.clock.now += 14 * M;
    eq('O15 minutes left counts down', err(function () { officeLogin('site1@test.com', 'SitePass1', false); }), 'LOCKED|1');
    env.clock.now += 2 * M;
    eq('O16 lock ends after 15 min', oAccText_(officeLogin('site1@test.com', 'SitePass1', false).user.depts), 'PS Staff, YW View');
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
    env.clock.now += 8 * H - 1000; eq('O24 short session alive at 8 h', officeMe(a).level, 'Director');
    env.clock.now += 2000; eq('O25 short session ends after 8 h', err(function () { officeMe(a); }), 'NOSESSION');
    env.clock.now += 29 * D - 8 * H; eq('O26 keep session alive at 29 days', officeMe(k).level, 'Director');
    env.clock.now += 2 * D; eq('O27 keep session ends after 30 days', err(function () { officeMe(k); }), 'NOSESSION');
    var g = officeLogin('site1@test.com', 'NewPass12', false).token;
    eq('O28 gate lets the right department + level in', officeGate_(g, { dept: 'PS', level: 2 }).email + ':' + officeGate_(g, { dept: 'YW' }).email, 'site1@test.com:site1@test.com');
    eq('O29 gate keeps others out (other dept, higher level, money)', [err(function () { officeGate_(g, { dept: 'AC' }); }), err(function () { officeGate_(g, { dept: 'YW', level: 2 }); }), err(function () { officeGate_(g, { dept: 'PS', money: true }); })].join(','), 'NOACCESS,NOACCESS,NOACCESS');
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
    // --- CodeRabbit fixes (PR #7)
    var J = env.get('OL:jamal@test.com');
    eq('O41 hash is PBKDF2 with its params stored', J.alg === 'pbkdf2-sha256' && J.iters === 3 && J.hash === oPbkdf2_(env, 'GoodPass1', J.salt, 3), true);
    var old = { email: 'old@test.com', name: 'Old', role: 'Viewer', status: 'Active', salt: 's1', epoch: 0, created: 0, last: 0 };
    old.hash = oHash_(env, 's1', 'OldPass12'); env.put('OL:old@test.com', old);
    eq('O42 old v1 hash still signs in', officeLogin('old@test.com', 'OldPass12', false).user.email, 'old@test.com');
    eq('O43 ... and is upgraded to PBKDF2', env.get('OL:old@test.com').alg === 'pbkdf2-sha256' && officeLogin('old@test.com', 'OldPass12', false).user.level === 'View', true);
    for (var u = 0; u < 30; u++) err(function () { officeLogin('nobody' + u + '@test.com', 'whatever1', false); });
    eq('O44 unknown addresses leave nothing in the property store', env.keys().filter(function (x) { return x.indexOf('OF:') === 0; }).length, 0);
    for (var w = 0; w < 3; w++) err(function () { officeLogin('twin@test.com', 'bad', false); });
    env.clock.now += 16 * M;
    eq('O45 wrong-try count expires after 15 min', err(function () { officeLogin('twin@test.com', 'bad', false); }), 'BAD|4');
    eq('O46 password over 200 chars refused on save', /at most 200/.test(err(function () { oSaveLogin_(env, { email: 'twin@test.com', password: new Array(202).join('a') }); })), true);
    eq('O47 password of 200 chars saves and signs in', (oSaveLogin_(env, { email: 'twin@test.com', password: new Array(201).join('b') }), officeLogin('twin@test.com', new Array(201).join('b'), false).user.name), 'Twin');
    eq('O48 unknown email does the same hashing work', (function () { var n = 0, h0 = env.hmac; env.hmac = function (v, k) { n++; return h0(v, k); };
      try { err(function () { officeLogin('ghost2@test.com', 'whatever1', false); }); var a = n; n = 0; err(function () { officeLogin('jamal@test.com', 'whatever1', false); }); return a === n && a === 3; } finally { env.hmac = h0; } })(), true);
    // --- CodeRabbit round 2 (PR #7)
    for (var x5 = 0; x5 < 5; x5++) err(function () { officeLogin('twin@test.com', 'bad', false); });
    for (var ck in env.cache) delete env.cache[ck]; // cache evicted
    eq('O53 lock of a registered login survives cache loss', err(function () { officeLogin('twin@test.com', new Array(201).join('b'), false); }), 'LOCKED|15');
    eq('O54 ... kept in its own login record', !!(env.get('OL:twin@test.com').fails || {}).until && env.keys().filter(function (q) { return q.indexOf('OF:') === 0; }).length === 0, true);
    oSaveLogin_(env, { email: 'twin@test.com', password: 'TwinPass12' });
    eq('O55 password reset clears the lock', officeLogin('twin@test.com', 'TwinPass12', false).user.name, 'Twin');
    env.clock.now += 16 * M; // jamal's wrong try from O48 expires
    eq('O56 parallel guesses: at most 5 password checks', (function () { var n = 0, h0 = env.hmac, inner = false, res = [];
      env.hmac = function (v, k) { n++; if (!inner) { inner = true; for (var p = 0; p < 6; p++) res.push(err(function () { officeLogin('jamal@test.com', 'guess' + p, false); })); } return h0(v, k); };
      try { res.unshift(err(function () { officeLogin('jamal@test.com', 'guess', false); })); } finally { env.hmac = h0; }
      return n / 3 + ':' + res.join(','); })(), '5:LOCKED|15,BAD|3,BAD|2,BAD|1,LOCKED|15,LOCKED|15,LOCKED|15');
    env.clock.now += 16 * M;
    eq('O57 password check runs outside the lock', (function () { var held = false, bad = 0, l0 = env.lock, h0 = env.hmac;
      env.lock = function (fn) { held = true; try { return fn(); } finally { held = false; } };
      env.hmac = function (v, k) { if (held) bad++; return h0(v, k); };
      try { officeLogin('jamal@test.com', 'GoodPass1', false); err(function () { officeLogin('ghost3@test.com', 'whatever1', false); }); } finally { env.lock = l0; env.hmac = h0; }
      return bad; })(), 0);
    eq('O58 password changed during the check is refused', (function () { var h0 = env.hmac, done = false;
      env.hmac = function (v, k) { if (!done) { done = true; oSaveLogin_(env, { email: 'old@test.com', password: 'Changed123' }); } return h0(v, k); };
      try { return err(function () { officeLogin('old@test.com', 'OldPass12', false); }); } finally { env.hmac = h0; } })(), 'BAD|5');
    var tk = [];
    for (var y = 0; y < 7; y++) { env.clock.now += 1000; tk.push(officeLogin('old@test.com', 'Changed123', true).token); }
    eq('O59 at most 5 sessions per login, newest kept', env.keys().filter(function (q) { var o = q.indexOf('OS:') === 0 && env.get(q); return o && o.email === 'old@test.com'; }).length + ':' + err(function () { officeMe(tk[1]); }) + ':' + officeMe(tk[6]).email, '5:NOSESSION:old@test.com');
    oSaveLogin_(env, { email: 'old@test.com', role: 'Field' });
    eq('O60 role change removes its sessions from the store', env.keys().filter(function (q) { var o = q.indexOf('OS:') === 0 && env.get(q); return o && o.email === 'old@test.com'; }).length, 0);
    // --- own fail pass (16 Nov, before deploy)
    var d0 = OFFICE_DEPTH_, ran = 0, G = {
      uiInit: function () { ran++; return 'all customers'; }, uiDo: function (a) { ran++; return a; }, appSweep: function () { ran++; return 'swept'; },
      officeMe: function (t) { return officeSession_(t); }, outer: function () { return G.uiInit(); }, boom: function () { throw new Error('x'); },
      helper_: function () { ran++; }, Db: function () { this.k = 1; }
    };
    G.Db.prototype.rows = function () { return 1; };
    G.officeLogin = function () { return G.uiInit(); }; // a web API that calls on (depth > 0)
    var who0 = env.who, nW = oGuardAll_(G), anon = { active: '', effective: 'owner@test.com' };
    OFFICE_DEPTH_ = 0;
    try {
      env.clock.who = anon;
      eq('O61 anonymous web caller cannot run a sheet function', err(function () { G.uiInit(); }) + ':' + err(function () { G.uiDo({ action: 'chequeDishonoured' }); }) + ':' + ran, 'NOACCESS:NOACCESS:0');
      eq('O62 web API stays open (its own session check answers)', err(function () { G.officeMe('junk'); }), 'NOSESSION');
      eq('O63 calls made inside a web API call are not blocked', G.officeLogin() + ':' + ran, 'all customers:1');
      eq('O64 trigger handler: anonymous / forged triggerUid refused, real trigger event runs', [err(function () { G.appSweep(); }), err(function () { G.appSweep({ triggerUid: '1234567' }); }), G.appSweep({ triggerUid: '7654321', authMode: 'FULL' })].join(','), 'NOACCESS,NOACCESS,swept');
      eq('O65 depth back to 0 after an error', (err(function () { env.clock.who = null; G.boom(); }), OFFICE_DEPTH_), 0);
      env.clock.who = { active: 'other@gmail.com', effective: 'owner@test.com' };
      eq('O66 another Google account is refused too', err(function () { G.uiInit(); }), 'NOACCESS');
      env.clock.who = { active: 'Owner@Test.com', effective: 'owner@test.com' };
      eq('O67 the owner (sheet menu / panel / editor) passes', G.uiInit(), 'all customers');
      env.clock.who = { active: 'ed@test.com', effective: 'ed@test.com' };
      eq('O68 a sheet editor running the script as themself passes', G.uiDo(5), 5);
      env.clock.who = { active: '', effective: '' };
      eq('O69 blank on both sides is refused', err(function () { G.uiInit(); }), 'NOACCESS');
      env.who = function () { throw new Error('no Session'); };
      eq('O70 Session error = refused', err(function () { G.uiInit(); }), 'NOACCESS');
      env.who = who0; env.clock.who = null;
      env.clock.who = anon;
      eq('O71 constructor wrapped: plain anonymous call refused', err(function () { G.Db(); }), 'NOACCESS');
      env.clock.who = null;
      var c = new G.Db();
      eq('O80 ... new still works (prototype, instanceof); private left alone; wrapped once', nW + ':' + !G.helper_.officeRaw_ + ':' + c.rows() + ':' + (c instanceof G.Db) + ':' + c.k + ':' + oGuardAll_(G), '8:true:1:true:1:0');
      eq('O81 wrappers keep their names', G.appSweep.name + ',' + G.uiInit.name, 'appSweep,uiInit');
      var G2 = { onOpen: function (e) { ran++; return 'menu'; }, onEdit: function (e) { ran++; return 'edit'; } }; oGuardAll_(G2); env.clock.who = anon;
      var fakeSs = { getId: function () { return 'x'; } }, fakeRange = { getSheet: function () { return {}; } };
      eq('O82 onOpen / onEdit from a web page (JSON event) refused; real event objects run', [err(function () { G2.onOpen({ source: { getId: 'x' } }); }), err(function () { G2.onEdit({ range: 'A1', value: 'x' }); }), G2.onOpen({ source: fakeSs }), G2.onEdit({ range: fakeRange })].join(','), 'NOACCESS,NOACCESS,menu,edit');
      env.clock.who = null;
    } finally { OFFICE_DEPTH_ = d0; env.clock.who = null; }
    eq('O72 every public function of this project is guarded (this file is last)', oUnguarded_(OFFICE_G_).join(',') || 'all', 'all');
    eq('O73 each web API (except doGet / login / logout) checks the session first (officeGate_ / officeSession_, or oAdmin_ = gate in the lock)', OFFICE_WEB_API_.filter(function (k) {
      var f = OFFICE_G_[k]; f = f && (f.officeRaw_ || f); return ['doGet', 'officeLogin', 'officeLogout'].indexOf(k) < 0 && !/^function \w+\(token[^)]*\) \{\s*(return oAdmin_\(token,|(var L = )?officeGate_\(token,|return oPublic_\(officeSession_\(token\)\))/.test(String(f)); }).join(',') || 'ok', 'ok');
    eq('O124 oAdmin_ runs the Director gate first', /^function oAdmin_\(token, fn, read\) \{\s*var env = oEnv_\(\), run = function \(\) \{ var me = officeGate_\(token, OFFICE_ADMIN_\);/.test(String(oAdmin_.officeRaw_ || oAdmin_)) && OFFICE_ADMIN_.dept === 'HR' && OFFICE_ADMIN_.level === 4, true);
    eq('O79 the guard really took (names resolve to the wrappers)', [doGet, officeMe, officeLogin, selfTestOffice, typeof uiInit === 'function' ? uiInit : doGet, typeof uiDo === 'function' ? uiDo : doGet].every(function (f) { return !!f.officeRaw_; }), true);
    (function () { var d1 = OFFICE_DEPTH_; OFFICE_DEPTH_ = 0; OFFICE_G_.zzLateFile = function () { return 1; };
      try { eq('O83 a public function after this file: web API fails closed', err(function () { officeMe('x'); }), 'NOACCESS'); }
      finally { delete OFFICE_G_.zzLateFile; OFFICE_DEPTH_ = d1; }
      eq('O84 ... and opens again once it is gone', (OFFICE_DEPTH_ = 0, err(function () { officeMe('x'); })) + (OFFICE_DEPTH_ = d1, ''), 'NOSESSION'); })();
    OFFICE_CFG_.maxPerMin = 3; env.clock.now = Math.ceil(env.clock.now / 6e4) * 6e4 + 1000;
    eq('O85 at most 3 (test limit) password checks a minute in total, then BUSY; next minute open again', [err(function () { officeLogin('a1@test.com', 'x1', false); }), err(function () { officeLogin('a2@test.com', 'x1', false); }), err(function () { officeLogin('a3@test.com', 'x1', false); }),
      err(function () { officeLogin('jamal@test.com', 'GoodPass1', false); }), (env.clock.now += 6e4, officeLogin('jamal@test.com', 'GoodPass1', false).user.name)].join(','), 'BAD|4,BAD|4,BAD|4,BUSY|1,Jamal Uddin');
    eq('O86 the total counter is one Script Properties record (none in the cache)', JSON.stringify(env.get('OT')) + ':' + Object.keys(env.store).filter(function (q) { return q.indexOf('OT') === 0; }).length + ':' + (env.cget('OT:' + Math.floor(env.clock.now / 6e4)) == null), '{"m":' + Math.floor(env.clock.now / 6e4) + ',"n":1}:1:true');
    eq('O87 counter read, BUSY check and +1 happen inside the lock', (function () { var held = false, bad = 0, l0 = env.lock, g0 = env.get, p0 = env.put;
      env.lock = function (fn) { held = true; try { return fn(); } finally { held = false; } };
      env.get = function (k) { if (k === 'OT' && !held) bad++; return g0(k); }; env.put = function (k, o) { if (k === 'OT' && !held) bad++; return p0(k, o); };
      try { err(function () { officeLogin('a4@test.com', 'x1', false); }); err(function () { officeLogin('a5@test.com', 'x1', false); }); } finally { env.lock = l0; env.get = g0; env.put = p0; }
      return bad + ':' + env.get('OT').n; })(), '0:3');
    eq('O88 a broken counter record resets instead of blocking', (env.put('OT', 'junk'), officeLogin('jamal@test.com', 'GoodPass1', false).user.name + ':' + env.get('OT').n), 'Jamal Uddin:1');
    OFFICE_CFG_.maxPerMin = 1e9;
    // --- W2 Users & access (department + level), fresh store
    (function () {
      var e2 = oMemEnv_(); OFFICE_ENV_ = e2; var D = oDir_(), j = JSON.stringify;
      var add = function (em, nm, acc) { oSaveLogin_(e2, { email: em, name: nm, depts: acc, password: 'GoodPass1' }); return officeLogin(em, 'GoodPass1', false).token; };
      var live = function (em) { return oLive_(e2, e2.now())[em] || 0; };
      eq('O89 access check: valid / invalid', [j(oAccClean_({ SC: 1, AC: 2, PS: 0 })), oIsDir_(oAccClean_(D)), oAccClean_({ SC: 4 }), oAccClean_({ SC: 5 }), oAccClean_({ SC: 1.5 }), oAccClean_({ SC: '2' }), oAccClean_({ XX: 1 }),
        oAccClean_([1]), oAccClean_({}), oAccClean_({ SC: 0 }), oAccClean_(JSON.parse('{"__proto__":{"SC":1}}')), oAccClean_(JSON.parse('{"constructor":1}')), oAccClean_(null), oAccClean_('SC')].join('|'),
        '{"SC":1,"AC":2}|true||||||||||||');
      eq('O90 old roles map exactly', OFFICE_ROLES_.map(function (r) { return r + '=' + oAccText_(oAcc_({ role: r })); }).join(';') + ';' + j(oAcc_({ role: '__proto__' })) + j(oAcc_({ role: 'constructor' })) + j(oAcc_(null)),
        'Admin=Director;Accounts=SC View, PR Staff, AC Staff;Viewer=SC View, PS View, AC View;Yard=PS View, YW Staff;Field=PS Staff, YW View;{}{}{}');
      eq('O91 prices / amounts only for SC, PR, AC and Directors', [oCanSeeMoney_({ SC: 1 }), oCanSeeMoney_({ PR: 1 }), oCanSeeMoney_({ AC: 3 }), oCanSeeMoney_(D), oCanSeeMoney_({ PS: 3, YW: 3, HR: 3, QH: 3 }), oCanSeeMoney_({})].join(','), 'true,true,true,true,false,false');
      var tJ = add('jamal@t.com', 'Jamal Uddin', D), tA = add('acc@t.com', 'Accounts', { AC: 2, PR: 2, SC: 1 }), tH = add('hr@t.com', 'HR Head', { HR: 3, QH: 3 }), tS = add('site@t.com', 'Site', { PS: 2, YW: 1 });
      var me = officeMe(tS);
      eq('O92 me: departments, level, money; no secrets', j(me.depts) + ':' + me.level + ':' + me.money + ':' + (j(me).indexOf('hash') < 0 && j(me).indexOf('salt') < 0 && j(me).indexOf('epoch') < 0), '{"PS":2,"YW":1}:Staff:false:true');
      var API = ['officeUsersList', 'officeStaffList', 'officeUserSave', 'officeUserReset', 'officeUserBlock', 'officeUserSignOutAll'], call = function (fn, t) { var f = OFFICE_G_[fn]; f = f.officeRaw_ || f; return err(function () { f(t, 'acc@t.com', true); }); };
      eq('O93 the 6 admin calls: no / junk / forged token -> NOSESSION', API.map(function (f) { return call(f) + call(f, 'x') + call(f, new Array(65).join('b')); }).join(','), API.map(function () { return 'NOSESSIONNOSESSIONNOSESSION'; }).join(','));
      eq('O94 ... Head of HR, Accounts, Site -> NOACCESS (Directors only)', API.map(function (f) { return call(f, tH) + call(f, tA) + call(f, tS); }).join(','), API.map(function () { return 'NOACCESSNOACCESSNOACCESS'; }).join(','));
      eq('O95 ... and on the web API list', API.every(function (f) { return OFFICE_WEB_API_.indexOf(f) >= 0; }), true);
      var L0 = officeUsersList(tJ), rS = L0.rows.filter(function (x) { return x.email === 'site@t.com'; })[0];
      eq('O96 list: me, rows, Enabled, sessions, depts, nothing secret', L0.me + ':' + L0.rows.length + ':' + rS.status + ':' + rS.sessions + ':' + j(rS.depts) + ':' + rS.last + ':' + /hash|salt|fails|epoch|"pw/.test(j(L0)), 'jamal@t.com:4:Enabled:1:{"PS":2,"YW":1}:' + e2.now() + ':false');
      var n1 = officeUserSave(tJ, { email: ' New@T.com ', name: '  New   Person ', depts: { SC: 2, PS: 1 }, staff: 'STF-003', isNew: true });
      eq('O97 add: password 10 readable chars, shown once (not stored as text), signs in', /^[A-HJ-NP-Za-km-z2-9]{10}$/.test(n1.password) + ':' + (j(e2.store).indexOf(n1.password) < 0) + ':' + officeLogin('new@t.com', n1.password, false).user.name + ':' + e2.get('OL:new@t.com').staff + ':' + e2.get('OL:new@t.com').by, 'true:true:New Person:STF-003:jamal@t.com');
      eq('O98 add same email again (other case) -> DUP; edit unknown -> NOTFOUND', err(function () { officeUserSave(tJ, { email: 'NEW@t.com', name: 'X', depts: { SC: 1 }, isNew: true }); }) + ',' + err(function () { officeUserSave(tJ, { email: 'ghost@t.com', name: 'X', depts: { SC: 1 } }); }), 'DUP,NOTFOUND');
      var bad = function (o) { return err(function () { officeUserSave(tJ, Object.assign({ email: 'b@t.com', name: 'B', depts: { SC: 1 }, isNew: true }, o)); }); };
      eq('O99 bad input -> BADINPUT|field', [bad({ name: '' }), bad({ name: '   ' }), bad({ name: new Array(82).join('n') }), bad({ name: { a: 1 } }), bad({ name: new Array(1 << 20).join('n') }), bad({ email: 'nope' }), bad({ email: new Array(1 << 20).join('e') + '@x.com' }),
        bad({ depts: {} }), bad({ depts: { SC: 4 } }), bad({ depts: { SC: '1' } }), bad({ depts: [1] }), bad({ depts: JSON.parse('{"__proto__":{"SC":1}}') }), bad({ staff: '<b>' }), bad({ staff: 5 }), err(function () { officeUserSave(tJ, null); }), err(function () { officeUserSave(tJ, 'x'); })].join(','),
        'BADINPUT|name,BADINPUT|name,BADINPUT|name,BADINPUT|name,BADINPUT|name,BADINPUT|email,BADINPUT|email,BADINPUT|departments,BADINPUT|departments,BADINPUT|departments,BADINPUT|departments,BADINPUT|departments,BADINPUT|staff,BADINPUT|staff,BADINPUT|name,BADINPUT|name');
      eq('O100 ... nothing was saved', !e2.get('OL:b@t.com'), true);
      var tS2 = officeLogin('site@t.com', 'GoodPass1', true).token;
      eq('O101 edit name only: sessions stay', j(officeUserSave(tJ, { email: 'site@t.com', name: 'Site Team', depts: { PS: 2, YW: 1 } })) + ':' + officeMe(tS).name + ':' + live('site@t.com'), '{"ok":true,"ended":0}:Site Team:2');
      eq('O102 access change: both sessions end; new access on next sign-in', j(officeUserSave(tJ, { email: 'site@t.com', name: 'Site Team', depts: { PS: 3 } })) + ':' + err(function () { officeMe(tS); }) + err(function () { officeMe(tS2); }) + ':' + j(officeLogin('site@t.com', 'GoodPass1', false).user.depts), '{"ok":true,"ended":2}:NOSESSIONNOSESSION:{"PS":3}');
      eq('O103 own name change OK; own access change / Director tick off -> SELF; own access unchanged after', officeUserSave(tJ, { email: 'jamal@t.com', name: 'Jamal U', depts: D }).ok + ':' + err(function () { officeUserSave(tJ, { email: 'jamal@t.com', name: 'Jamal U', depts: { HR: 3 } }); }) + ':' + officeMe(tJ).level, 'true:SELF:Director');
      eq('O104 self-block -> SELF; block non-boolean -> BADINPUT; unknown -> NOTFOUND', [err(function () { officeUserBlock(tJ, 'jamal@t.com', true); }), err(function () { officeUserBlock(tJ, 'acc@t.com', 'true'); }), err(function () { officeUserBlock(tJ, 'acc@t.com'); }), err(function () { officeUserBlock(tJ, 'ghost@t.com', true); }), err(function () { officeUserBlock(tJ, { e: 1 }, true); })].join(','), 'SELF,BADINPUT|block,BADINPUT|block,NOTFOUND,NOTFOUND');
      eq('O105 block: sessions end, BLOCKED at sign-in, list says Blocked + 0 sessions; unblock: same password works', j(officeUserBlock(tJ, 'acc@t.com', true)) + ':' + err(function () { officeMe(tA); }) + ':' + err(function () { officeLogin('acc@t.com', 'GoodPass1', false); }) + ':' +
        officeUsersList(tJ).rows.filter(function (x) { return x.email === 'acc@t.com'; }).map(function (x) { return x.status + x.sessions; })[0] + ':' + j(officeUserBlock(tJ, 'acc@t.com', false)) + ':' + officeLogin('acc@t.com', 'GoodPass1', false).user.name, '{"ok":true,"ended":1}:NOSESSION:BLOCKED:Blocked0:{"ok":true,"ended":0}:Accounts');
      eq('O106 block twice = no change', j(officeUserBlock(tJ, 'hr@t.com', true)) + j(officeUserBlock(tJ, 'hr@t.com', true)) + j(officeUserBlock(tJ, 'hr@t.com', false)), '{"ok":true,"ended":1}{"ok":true,"ended":0}{"ok":true,"ended":0}');
      for (var q = 0; q < 3; q++) err(function () { officeLogin('acc@t.com', 'bad', false); });
      var tA2 = officeLogin('acc@t.com', 'GoodPass1', false).token; for (q = 0; q < 4; q++) err(function () { officeLogin('acc@t.com', 'bad', false); });
      var rs = officeUserReset(tJ, 'ACC@t.com');
      eq('O107 reset: new password shown once, old one + sessions end, lock cleared', /^[A-HJ-NP-Za-km-z2-9]{10}$/.test(rs.password) + ':' + rs.ended + ':' + err(function () { officeMe(tA2); }) + ':' + err(function () { officeLogin('acc@t.com', 'GoodPass1', false); }) + ':' + officeLogin('acc@t.com', rs.password, false).user.name, 'true:2:NOSESSION:BAD|4:Accounts');
      var tJ2 = officeLogin('jamal@t.com', 'GoodPass1', true).token, rj = officeUserReset(tJ, 'jamal@t.com');
      eq('O108 own reset: this sign-in stays, other devices end', rj.ended + ':' + officeMe(tJ).email + ':' + err(function () { officeMe(tJ2); }) + ':' + !!officeLogin('jamal@t.com', rj.password, false).token, '1:jamal@t.com:NOSESSION:true');
      var tN = officeLogin('new@t.com', n1.password, false).token, tN2 = officeLogin('new@t.com', n1.password, true).token;
      eq('O109 sign out everywhere: other login all end, login + password still work', j(officeUserSignOutAll(tJ, 'new@t.com')) + ':' + err(function () { officeMe(tN); }) + err(function () { officeMe(tN2); }) + ':' + officeLogin('new@t.com', n1.password, false).user.name, '{"ended":3}:NOSESSIONNOSESSION:New Person');
      var tJ3 = officeLogin('jamal@t.com', rj.password, false).token;
      eq('O110 own sign out everywhere: this one stays', officeUserSignOutAll(tJ, 'jamal@t.com').ended + ':' + officeMe(tJ).email + ':' + err(function () { officeMe(tJ3); }), '2:jamal@t.com:NOSESSION');
      var tK = add('k@t.com', 'Second Director', D);
      eq('O111 Director demotes another Director (2 exist) -> OK, their sessions end; LASTDIR guard counts others', officeUserSave(tJ, { email: 'k@t.com', name: 'K', depts: { HR: 3 } }).ended + ':' + err(function () { officeMe(tK); }) + ':' + oOtherDir_(e2, 'jamal@t.com') + ':' + oOtherDir_(e2, 'nobody@t.com'), '1:NOSESSION:false:true');
      e2.put('OL:jamal2@t.com', { email: 'jamal2@t.com', name: 'J2', depts: D, status: 'Active', epoch: 0 });
      eq('O112 never zero enabled Directors (LASTDIR, guard run directly)', (function () { var me0 = e2.get('OL:jamal@t.com'); me0.status = 'Blocked'; e2.put('OL:jamal@t.com', me0);
        var g0 = officeGate_; officeGate_ = function () { return { email: 'jamal@t.com' }; };
        try { return [err(function () { officeUserSave('t', { email: 'jamal2@t.com', name: 'J2', depts: { SC: 1 } }); }), err(function () { officeUserBlock('t', 'jamal2@t.com', true); })].join(','); }
        finally { officeGate_ = g0; me0.status = 'Active'; e2.put('OL:jamal@t.com', me0); } })(), 'LASTDIR,LASTDIR');
      eq('O113 the Director check runs again inside the lock: a Director demoted just before it is refused, nothing changes', (function () {
        var tM = add('m@t.com', 'M Dir', D), l0 = e2.lock, inLock = 0, g0 = e2.get, held = false;
        e2.lock = function (fn) { var x = e2.get('OL:m@t.com'); oSetAcc_(x, { SC: 1 }); x.epoch++; e2.put('OL:m@t.com', x); e2.lock = l0; held = true; try { return fn(); } finally { held = false; } }; // another Director's change lands first
        try { var r1 = err(function () { officeUserBlock(tM, 'acc@t.com', true); }); } finally { e2.lock = l0; }
        e2.get = function (k) { if (held && k.indexOf('OS:') === 0) inLock++; return g0(k); };
        e2.lock = function (fn) { held = true; try { return fn(); } finally { held = false; } };
        try { officeUserSignOutAll(tJ, 'k@t.com'); officeUserBlock(tJ, 'k@t.com', true); officeUserBlock(tJ, 'k@t.com', false); officeUserReset(tJ, 'k@t.com'); officeUserSave(tJ, { email: 'k@t.com', name: 'K', depts: { HR: 2 } }); } finally { e2.lock = l0; e2.get = g0; }
        return r1 + ':' + e2.get('OL:acc@t.com').status + ':' + (inLock >= 5); })(), 'NOSESSION:Active:true');
      eq('O127 strangers and non-Directors are refused before the lock', (function () { var n = 0, l0 = e2.lock; e2.lock = function (fn) { n++; return l0(fn); };
        try { ['officeUserSave', 'officeUserReset', 'officeUserBlock', 'officeUserSignOutAll'].forEach(function (f) { err(function () { OFFICE_G_[f]('junk', 'acc@t.com', true); }); err(function () { OFFICE_G_[f](tS, 'acc@t.com', true); }); }); } finally { e2.lock = l0; }
        return n; })(), 0);
      eq('O128 menu path: the only enabled Director cannot be blocked or demoted', (function () { var keep = {}; e2.keys().forEach(function (k) { if (k.indexOf('OL:') === 0) keep[k] = e2.store[k]; });
        e2.keys().forEach(function (k) { var x = k.indexOf('OL:') === 0 && e2.get(k); if (x && x.email !== 'jamal@t.com' && oIsDir_(oAcc_(x))) { x.status = 'Blocked'; e2.put(k, x); } });
        try { return [err(function () { oSaveLogin_(e2, { email: 'jamal@t.com', status: 'Blocked' }); }), err(function () { oSaveLogin_(e2, { email: 'jamal@t.com', access: 'SC View' }); })].map(function (x) { return /at least one enabled Director/.test(x); }).join(',') + ':' + e2.get('OL:jamal@t.com').status; }
        finally { Object.keys(keep).forEach(function (k) { e2.store[k] = keep[k]; }); } })(), 'true,true:Active');
      e2.clock.db = { hasTab: function (t) { return t === 'Staff'; }, rows: function () { return [{ StaffID: 'STF-001', Name: 'Jamal Uddin', Status: 'Active' }, { StaffID: 'STF-002', Name: 'Old', Status: 'Inactive' }, { StaffID: '', Name: 'No id' },
        { StaffID: 'STF-003', Name: '<img src=x onerror=1>' }, { StaffID: 'STF-001', Name: 'Dup id' }, { StaffID: 7, Name: 'Number id' }, { StaffID: 'STF-9', Name: '' }, { StaffID: 'ST/001', Name: 'Slash' }, { StaffID: new Array(42).join('x'), Name: 'Long id' }, { StaffID: 'STF-8', Name: '\u3164' }]; } };
      eq('O114 staff list: active, with id + name, no duplicates (page escapes names)', j(officeStaffList(tJ)), '[{"id":"STF-001","name":"Jamal Uddin"},{"id":"STF-003","name":"<img src=x onerror=1>"},{"id":"7","name":"Number id"}]');
      e2.clock.db = { hasTab: function () { return false; } };
      eq('O115 ... no Staff tab -> empty list; no db -> empty list', j(officeStaffList(tJ)) + (e2.clock.db = null, j(officeStaffList(tJ))), '[][]');
      e2.put('OL:old1@t.com', { email: 'old1@t.com', name: 'Old Admin', role: 'Admin', status: 'Active', epoch: 2 });
      e2.put('OL:old2@t.com', { email: 'old2@t.com', name: 'Old Field', role: 'Field', status: 'Active', epoch: 0 });
      e2.put('OL:old3@t.com', { email: 'old3@t.com', name: 'Odd', role: 'Boss', status: 'Active', epoch: 0 });
      var o2 = e2.get('OL:old2@t.com'); oSetPw_(e2, o2, 'GoodPass1'); e2.put('OL:old2@t.com', o2);
      var tO = officeLogin('old2@t.com', 'GoodPass1', false).token;
      eq('O116 old role login still works before the move (role map)', officeMe(tO).level + ':' + j(officeMe(tO).depts), 'Staff:{"PS":2,"YW":1}');
      eq('O117 move old logins: 2 moved (unknown role left), role gone, epoch +1, old sessions end; second run 0', oMigrate_(e2) + ':' + oAccText_(oAcc_(e2.get('OL:old1@t.com'))) + ':' + ('role' in e2.get('OL:old1@t.com')) + ':' + e2.get('OL:old1@t.com').epoch + ':' + err(function () { officeMe(tO); }) + ':' + e2.get('OL:old3@t.com').role + ':' + oMigrate_(e2), '2:Director:false:3:NOSESSION:Boss:0');
      eq('O118 menu access text', [j(oParseAccess_('Director')), j(oParseAccess_('AC Staff, PR Staff, SC View')), j(oParseAccess_('ac2 sc:1')), j(oParseAccess_('Accounts')), j(oParseAccess_('QH head'))].join('|'), j(D) + '|{"AC":2,"PR":2,"SC":1}|{"AC":2,"SC":1}|{"AC":2,"PR":2,"SC":1}|{"QH":3}');
      eq('O119 ... nonsense refused', [err(function () { oParseAccess_('Boss'); }), err(function () { oParseAccess_('XX Staff'); }), err(function () { oParseAccess_('SC 4'); }), err(function () { oParseAccess_(''); })].map(function (x) { return /^Not understood|^Access is empty/.test(x); }).join(','), 'true,true,true,true');
      eq('O120 menu save with access text: access change ends sessions; list shows text + sessions', (function () { var t = officeLogin('new@t.com', n1.password, false).token; oSaveLogin_(e2, { email: 'new@t.com', access: 'SC Head' });
        return err(function () { officeMe(t); }) + ':' + oListLogins_(e2).filter(function (x) { return x.email === 'new@t.com'; }).map(function (x) { return x.access + '/' + x.sessions; })[0]; })(), 'NOSESSION:SC Head/0');
      eq('O121 menu: new login needs access', /Access is needed/.test(err(function () { oSaveLogin_(e2, { email: 'na@t.com', name: 'NA', password: 'GoodPass1' }); })), true);
      eq('O122 made passwords: all 54 symbols, none other, no fixed digit from the UUID shape', (function () { var r0 = e2.rand, cnt = {}, tot = 0;
        e2.rand = function () { var u = function () { var h = ''; for (var i = 0; i < 32; i++) h += '0123456789abcdef'.charAt(Math.floor(Math.random() * 16)); return h.slice(0, 12) + '4' + h.slice(13, 16) + '8' + h.slice(17); }; return u() + u(); };
        try { for (var p = 0; p < 3000; p++) oMakePassword_(e2).split('').forEach(function (c) { cnt[c] = (cnt[c] || 0) + 1; tot++; }); } finally { e2.rand = r0; }
        var ks = Object.keys(cnt), lo = Math.min.apply(null, ks.map(function (k) { return cnt[k]; })), hi = Math.max.apply(null, ks.map(function (k) { return cnt[k]; }));
        return ks.length + ':' + /^[A-HJ-NP-Za-km-z2-9]+$/.test(ks.join('')) + ':' + (lo > tot / 54 * 0.8 && hi < tot / 54 * 1.2); })(), '54:true:true');
      eq('O125 names: control / zero-width / text-direction marks removed; only marks -> BADINPUT', officeUserSave(tJ, { email: 'z1@t.com', name: 'A\u202eB\u200bC\tD\nE', depts: { SC: 1 }, isNew: true }) && e2.get('OL:z1@t.com').name + ':' + err(function () { officeUserSave(tJ, { email: 'z2@t.com', name: '\u200b\u202e', depts: { SC: 1 }, isNew: true }); }), 'ABC D E:BADINPUT|name');
      eq('O126 new login email: plain address only (no quotes, brackets, spaces)', [err(function () { officeUserSave(tJ, { email: '<x>@t.com', name: 'X', depts: { SC: 1 }, isNew: true }); }), err(function () { officeUserSave(tJ, { email: 'a"b@t.com', name: 'X', depts: { SC: 1 }, isNew: true }); }), err(function () { officeUserSave(tJ, { email: 'a@t..com', name: 'X', depts: { SC: 1 }, isNew: true }); }), !!officeUserSave(tJ, { email: "o'brien.x+1@mail-x.co.uk", name: 'X', depts: { SC: 1 }, isNew: true }).password].join(','), 'BADINPUT|email,BADINPUT|email,BADINPUT|email,true');
      eq('O129 Director is a flag: a department added later is theirs too; others do not get it', (function () { OFFICE_DEPTS_.push('ZZ');
        try { return officeMe(tJ).level + ':' + officeMe(tJ).depts.ZZ + ':' + (officeUsersList(tJ).me === 'jamal@t.com') + ':' + (officeMe(officeLogin('site@t.com', 'GoodPass1', false).token).depts.ZZ === undefined); } finally { OFFICE_DEPTS_.pop(); } })(), 'Director:4:true:true');
      eq('O130 a re-added email never revives an old session', (function () {
        var x = officeUserSave(tJ, { email: 'ra@t.com', name: 'RA', depts: { PS: 1 }, isNew: true }), t1 = officeLogin('ra@t.com', x.password, false).token;
        delete e2.store['OL:ra@t.com']; // record removed by hand, its session left behind
        officeUserSave(tJ, { email: 'ra@t.com', name: 'RA2', depts: { AC: 3 }, isNew: true });
        return err(function () { officeMe(t1); }) + ':' + !e2.get('OS:' + t1); })(), 'NOSESSION:true');
      eq('O131 edit without staff keeps the Staff link; empty staff unlinks', (function () { officeUserSave(tJ, { email: 'new@t.com', name: 'New Person', depts: { SC: 3 } }); var a1 = e2.get('OL:new@t.com').staff;
        officeUserSave(tJ, { email: 'new@t.com', name: 'New Person', depts: { SC: 3 }, staff: '' }); return a1 + ':' + (e2.get('OL:new@t.com').staff || '-'); })(), 'STF-003:-');
      eq('O132 menu access text is strict (leftover words, repeats, unknown departments refused)', ['AC Staff PR', 'Director AC Staff', 'Ops Head', 'Blac 3', 'SC View SC Head', 'SC View; junk', new Array(300).join('a')].map(function (x) { return /^Not understood|given twice|too long/.test(err(function () { oParseAccess_(x); })); }).join(','), 'true,true,true,true,true,true,true');
      eq('O133 a broken record does not break the list or the sign-in of others', (e2.store['OL:junk@t.com'] = '{not json', e2.store['OS:' + new Array(65).join('c')] = '{x', officeUsersList(tJ).rows.length > 3 && officeMe(tJ).email === 'jamal@t.com' && !!officeLogin('new@t.com', n1.password, false).token), true);
      eq('O134 a revoked session is refused but only the sweep (under the lock) removes it', (function () { var t = officeLogin('new@t.com', n1.password, false).token, x = e2.get('OL:new@t.com'); x.epoch++; e2.put('OL:new@t.com', x);
        var r1 = err(function () { officeMe(t); }), kept = !!e2.get('OS:' + t); oSweep_(e2, e2.now()); return r1 + ':' + kept + ':' + !e2.get('OS:' + t); })(), 'NOSESSION:true:true');
      eq('O135 names: bidi isolates, fillers, soft hyphen removed; blank-looking / mark floods refused or cut', [oName_('Ali⁧ffo⁩'), oName_('ㅤ'), oName_('⠀ᅟ'), oName_('a­b'), oName_('é́́́x').length, oName_('---'), oName_('١')].join('|'), 'Aliffo|||ab|4||١');
      eq('O123 HR Head is not a Director: Users screen refused, Home level Head', (tH = officeLogin('hr@t.com', 'GoodPass1', false).token, officeMe(tH).level) + ':' + err(function () { officeUsersList(tH); }), 'Head:NOACCESS');
    })();
    // --- D1 Document register (QHSE), fresh store + in-memory sheet
    if (typeof MemDb === 'function') (function () {
      var e3 = oMemEnv_(); OFFICE_ENV_ = e3; var j = JSON.stringify;
      var add = function (em, acc) { oSaveLogin_(e3, { email: em, name: em.split('@')[0], depts: acc, password: 'GoodPass1' }); return officeLogin(em, 'GoodPass1', false).token; };
      var db = new MemDb({ Quotes: { h: ['QuoteNo', 'PDF'], rows: [{ QuoteNo: 'CAE/Q/2026/001', PDF: 'u1' }, { QuoteNo: 'CAE/Q/2026/002', PDF: 'u2' }, { QuoteNo: 'CAE/Q/2026/003', PDF: '' }, { QuoteNo: 'CAE/Q/2026/002', PDF: 'u2b' }] },
        Notes: { h: ['NoteNo', 'Kind', 'PDF'], rows: [{ NoteNo: 'CAE/DN/2026/001', Kind: 'DN', PDF: 'x' }, { NoteNo: 'CAE/CN/2026/001', Kind: 'CN', PDF: 'x' }, { NoteNo: 'CAE/CN/2026/002', Kind: 'CN', PDF: 'x' }] },
        Challans: { h: ['ChallanNo', 'Kind', 'PDF'], rows: [{ ChallanNo: 'D1', Kind: 'Delivery', PDF: 'x' }, { ChallanNo: 'D2', Kind: 'Sale', PDF: 'x' }, { ChallanNo: 'R1', Kind: 'Return', PDF: 'x' }, { ChallanNo: 'T1', Kind: 'Transfer', PDF: '' }] },
        POs: { h: ['PONo', 'PDF'], rows: [{ PONo: 'CAE/PO/2026/001', PDF: 'x' }, { PONo: 'CAE/PO/2026/002', PDF: 'y' }] } });
      var sheetLike = function (x) { var i0 = x.insert, u0 = x.update, cut = function (o) { Object.keys(o).forEach(function (k) { if (typeof o[k] === 'string' && o[k].charAt(0) === "'") o[k] = o[k].slice(1); }); return o; }; // a sheet drops one leading quote
        x.writes = []; x.insert = function (t, o) { x.writes.push(JSON.parse(JSON.stringify(o))); return i0.call(x, t, cut(o)); }; x.update = function (t, o, p) { x.writes.push(JSON.parse(JSON.stringify(p))); return u0.call(x, t, o, cut(p)); }; return x; };
      sheetLike(db); e3.clock.db = db; e3.clock.now = Date.UTC(2026, 10, 17, 6, 0, 0);
      var tD = add('dir@t.com', oDir_()), tQ = add('qh@t.com', { QH: 3, PS: 1 }), tV = add('sv@t.com', { QH: 1, PS: 2 }), tA = add('ac@t.com', { AC: 3, SC: 2 });
      eq('O136 list before set-up: NOREG for writes, list says not set up', err(function () { officeDocSave(tD, { isNew: true, dept: 'QH', type: 'Form', title: 'X', status: 'Draft' }); }) + ':' + officeDocList(tD).setup, 'NOREG:false');
      eq('O137 set-up: 2 tabs + 10 rows + 10 history rows; repeat adds nothing', oDocSetup_(e3, db) + ':' + db.rows(ODOC_REG_).length + ':' + db.rows(ODOC_HIST_).length + ':' + oDocSetup_(e3, db) + ':' + db.rows(ODOC_HIST_).length + ':' + j(db.headers(ODOC_REG_)), '10:10:10:0:10:' + j(ODOC_H_));
      var codes = function (t) { return officeDocList(t).rows.map(function (r) { return r.code; }).join(','); };
      eq('O138 Director sees all 10, can write; QH Head + PS View sees only QH + PS documents, can write; QH View + PS Staff the same, read only', [officeDocList(tD).rows.length, officeDocList(tD).can, codes(tQ), officeDocList(tQ).can, j(officeDocList(tQ).depts), codes(tV), officeDocList(tV).can].join('|'),
        '10|true|CAE-QH-P01,CAE-PS-F01,CAE-PS-F02|true|["PS","QH"]|CAE-QH-P01,CAE-PS-F01,CAE-PS-F02|false');
      eq('O139 list: no / junk token NOSESSION, no QH NOACCESS', [err(function () { officeDocList(); }), err(function () { officeDocList('x'); }), err(function () { officeDocList(tA); })].join(','), 'NOSESSION,NOSESSION,NOACCESS');
      var byC = function (c) { return officeDocList(tD).rows.filter(function (r) { return r.code === c; })[0]; };
      eq('O140 issued = numbers with a PDF (once each) + by-hand numbers, no double count; by kind', ['CAE-SC-F01', 'CAE-AC-F01', 'CAE-AC-F03', 'CAE-AC-F04', 'CAE-PS-F01', 'CAE-PS-F02', 'CAE-YW-F01', 'CAE-PR-F01', 'CAE-QH-P01'].map(function (c) { return byC(c).issued; }).join(','), '2,0,1,2,2,1,0,2,0');
      var p01 = byC('CAE-QH-P01');
      eq('O141 row shape: Rev 0, 17 Nov, Draft, history entry, no sheet row numbers', [p01.rev, p01.revDate, p01.status, p01.sys, p01.hist.length, p01.hist[0].by, p01.hist[0].note, j(p01).indexOf('_r') < 0].join('|'), '0|2026-11-17|Draft||1|System|Added as draft|true');
      var W = [function (t) { return officeDocSave(t, { isNew: true, dept: 'QH', type: 'Form', title: 'T', status: 'Draft' }); }, function (t) { return officeDocRevise(t, 'CAE-QH-P01', 0, 'x', '2026-11-17'); }, function (t) { return officeDocStatus(t, 'CAE-QH-P01', 'Active', 0, 'Draft'); }];
      eq('O142 writes: QH View / no QH -> NOACCESS, strangers NOSESSION; none of them waits for the lock or writes', (function () { var n = 0, l0 = e3.lock, h0 = db.rows(ODOC_HIST_).length; e3.lock = function (fn) { n++; return l0(fn); };
        try { return W.map(function (f) { return [err(function () { f(tV); }), err(function () { f(tA); }), err(function () { f('junk'); }), err(function () { f(); })].join(','); }).join('/') + ':' + n + ':' + (db.rows(ODOC_HIST_).length - h0); } finally { e3.lock = l0; } })(),
        'NOACCESS,NOACCESS,NOSESSION,NOSESSION/NOACCESS,NOACCESS,NOSESSION,NOSESSION/NOACCESS,NOACCESS,NOSESSION,NOSESSION:0:0');
      var r1 = officeDocSave(tQ, { isNew: true, dept: 'QH', type: 'Form', title: '  Scaffold   inspection checklist ', owner: 'QHSE Head', status: 'Draft' }), r2 = officeDocSave(tQ, { isNew: true, dept: 'PS', type: 'Record', title: 'Toolbox talk record', owner: '', status: 'Active' });
      eq('O143 add: next code per department + type, title cleaned, by = name, Draft / Active', r1.code + ':' + r2.code + ':' + byC(r1.code).title + ':' + byC(r1.code).hist[0].by + ':' + byC(r1.code).status + ':' + byC(r2.code).hist[0].note + ':' + officeDocSave(tQ, { isNew: true, dept: 'QH', type: 'Form', title: 'Second', status: 'Draft' }).code, 'CAE-QH-F01:CAE-PS-R01:Scaffold inspection checklist:qh:Draft:Added and approved:CAE-QH-F02');
      var badA = function (o) { return err(function () { officeDocSave(tQ, Object.assign({ isNew: true, dept: 'QH', type: 'Form', title: 'Ok', status: 'Draft' }, o)); }); };
      eq('O144 add: bad input -> BADINPUT|field (department not own / unknown, type, status, title, owner)', [badA({ dept: 'SC' }), badA({ dept: 'XX' }), badA({ dept: ['QH'] }), badA({ type: 'Memo' }), badA({ type: 'constructor' }), badA({ status: 'Withdrawn' }), badA({ title: '' }), badA({ title: '\u200b\u202e' }), badA({ title: new Array(122).join('t') }), badA({ title: { a: 1 } }),
        badA({ owner: new Array(62).join('o') }), badA({ owner: 5 }), err(function () { officeDocSave(tQ, null); }), err(function () { officeDocSave(tQ, 'x'); })].join(','),
        'BADINPUT|department,BADINPUT|department,BADINPUT|department,BADINPUT|type,BADINPUT|type,BADINPUT|status,BADINPUT|title,BADINPUT|title,BADINPUT|title,BADINPUT|title,BADINPUT|owner,BADINPUT|owner,BADINPUT|title,BADINPUT|title');
      eq('O145 Director can add in any department; QH Head cannot see or touch an SC document', officeDocSave(tD, { isNew: true, dept: 'SC', type: 'Procedure', title: 'Tender review', status: 'Draft' }).code + ':' + [err(function () { officeDocSave(tQ, { code: 'CAE-SC-F01', title: 'X' }); }), err(function () { officeDocRevise(tQ, 'CAE-SC-F01', 0, 'x', '2026-11-17'); }), err(function () { officeDocStatus(tQ, 'CAE-SC-P01', 'Active', 0); })].join(','), 'CAE-SC-P01:NOTFOUND,NOTFOUND,NOTFOUND');
      eq('O146 edit: same -> no entry; title + owner changed -> one entry; unknown / odd code NOTFOUND', j(officeDocSave(tQ, { code: r1.code, rev: 0, was: 'Draft', title: 'Scaffold inspection checklist', owner: 'QHSE Head' })) + ':' + j(officeDocSave(tQ, { code: r1.code, rev: 0, title: 'Scaffold inspection checklist (weekly)', owner: 'Safety Officer' })) + ':' + byC(r1.code).hist.map(function (h) { return h.note; }).join('/') + ':' +
        [err(function () { officeDocSave(tQ, { code: 'CAE-QH-F99', title: 'X' }); }), err(function () { officeDocSave(tQ, { code: { toString: 1 }, title: 'X' }); }), err(function () { officeDocSave(tQ, { code: '__proto__', title: 'X' }); })].join(','), '{"ok":true,"same":true}:{"ok":true}:Added as draft/Details changed: title "Scaffold inspection checklist" -> "Scaffold inspection checklist (weekly)"; owner "QHSE Head" -> "Safety Officer":NOTFOUND,NOTFOUND,NOTFOUND');
      db.writes = []; officeDocSave(tQ, { code: r1.code, rev: 0, title: '=HYPERLINK("http://x","y")', owner: '+SUM(1)' });
      var wr = db.writes.filter(function (w) { return 'Title' in w; })[0] || {}; // history is written first
      eq('O147 a title / owner starting with = + - @ is written with a leading quote (text, no formula), shown back unchanged; saving it again = no change', wr.Title.charAt(0) + wr.Owner.charAt(0) + ':' + byC(r1.code).title + ':' + byC(r1.code).owner + ':' + officeDocSave(tQ, { code: r1.code, rev: 0, title: '=HYPERLINK("http://x","y")', owner: '+SUM(1)' }).same, "'':=HYPERLINK(\"http://x\",\"y\"):+SUM(1):true");
      var bd = function (rev, note, date) { return err(function () { officeDocRevise(tQ, r1.code, rev, note, date); }); };
      eq('O148 revise: wrong Rev STALE, empty note, bad / far / old / fake dates refused', [bd(1, 'x', '2026-11-17'), bd('0', 'x', '2026-11-17'), bd(0, '', '2026-11-17'), bd(0, '\u200b', '2026-11-17'), bd(0, new Array(302).join('n'), '2026-11-17'), bd(0, 'x', '2026-02-30'), bd(0, 'x', '2019-12-31'), bd(0, 'x', '2026-12-18'), bd(0, 'x', '17-11-2026'), bd(0, 'x', 20261117), bd(0, 'x', null)].join(','),
        'STALE,STALE,BADINPUT|what changed,BADINPUT|what changed,BADINPUT|what changed,BADINPUT|date,BADINPUT|date,BADINPUT|date,BADINPUT|date,BADINPUT|date,BADINPUT|date');
      eq('O149 revise: Rev +1, new issue date, history entry; 30 days ahead is the limit; the old Rev is now STALE', j(officeDocRevise(tQ, r1.code, 0, 'Clause 4: weekly not daily', '2026-12-17')) + ':' + byC(r1.code).rev + ':' + byC(r1.code).revDate + ':' + byC(r1.code).hist.slice(-1)[0].rev + ' ' + byC(r1.code).hist.slice(-1)[0].note + ':' + bd(0, 'again', '2026-11-17'), '{"rev":1}:1:2026-12-17:1 Clause 4: weekly not daily:STALE');
      var st = function (c, s, rev, was) { return err(function () { return j(officeDocStatus(tQ, c, s, rev, was)); }); };
      eq('O150 status: approve a Draft; same again = no entry; system document cannot be withdrawn; bad status; wrong Rev STALE', [st('CAE-QH-P01', 'Active', 0, 'Draft'), st('CAE-QH-P01', 'Active', 0, 'Active'), st('CAE-PS-F01', 'Withdrawn', 0, 'Active'), st('CAE-QH-P01', 'Draft', 0, 'Active'), st('CAE-QH-P01', 'Withdrawn', 1, 'Active')].join(',') + ':' + byC('CAE-QH-P01').hist.map(function (h) { return h.note; }).join('/'),
        'no error,no error,SYSDOC,BADINPUT|status,STALE:Added as draft/Approved');
      eq('O151 withdraw -> revise refused (WITHDRAWN) -> make active again -> revise works', [st(r2.code, 'Withdrawn', 0, 'Active'), err(function () { officeDocRevise(tQ, r2.code, 0, 'x', '2026-11-17'); }), st(r2.code, 'Active', 0, 'Withdrawn'), j(officeDocRevise(tQ, r2.code, 0, 'x', '2026-11-17'))].join(',') + ':' + byC(r2.code).hist.map(function (h) { return h.note; }).join('/'), 'no error,WITHDRAWN,no error,{"rev":1}:Added and approved/Withdrawn/Made active again/x');
      eq('O152 the gate runs again inside the lock: a Head demoted just before it is refused, nothing written', (function () { var l0 = e3.lock, h0 = db.rows(ODOC_HIST_).length;
        e3.lock = function (fn) { var x = e3.get('OL:qh@t.com'); oSetAcc_(x, { QH: 1, PS: 1 }); e3.put('OL:qh@t.com', x); e3.lock = l0; return fn(); };
        try { var r = err(function () { officeDocRevise(tQ, r2.code, 1, 'late', '2026-11-17'); }); } finally { e3.lock = l0; var y = e3.get('OL:qh@t.com'); oSetAcc_(y, { QH: 3, PS: 1 }); e3.put('OL:qh@t.com', y); }
        return r + ':' + (db.rows(ODOC_HIST_).length - h0) + ':' + byC(r2.code).rev; })(), 'NOACCESS:0:1');
      eq('O153 history is add-only: every action added exactly one row, none changed', db.rows(ODOC_HIST_).length + ':' + db.rows(ODOC_HIST_).every(function (h) { return h.Code && h.At instanceof Date; }), '21:true');
      eq('O154 names with marks / XSS come back as text (the page escapes them); control characters removed', (officeDocSave(tD, { isNew: true, dept: 'HR', type: 'Form', title: '<img src=x onerror=alert(1)>\tA\u202eB', status: 'Draft' }), byC('CAE-HR-F01').title), '<img src=x onerror=alert(1)> AB');
      eq('O155 the 4 calls are on the web API list and check the session first', ['officeDocList', 'officeDocSave', 'officeDocRevise', 'officeDocStatus'].every(function (f) { return OFFICE_WEB_API_.indexOf(f) >= 0; }) + ':' + /^function oDocW_\(token, fn\) \{\s*var env = oEnv_\(\), pre = officeGate_\(token, ODOC_NEED_\);/.test(String(oDocW_.officeRaw_ || oDocW_)), 'true:true');
      eq('O157 a Rev cannot be dated before the current one', err(function () { officeDocRevise(tQ, r1.code, 1, 'back', '2026-12-16'); }) + ':' + officeDocRevise(tQ, r1.code, 1, 'same day', '2026-12-17').rev, 'BADINPUT|date:2');
      var r3 = officeDocSave(tQ, { isNew: true, dept: 'QH', type: 'Record', title: 'Race', status: 'Draft' }).code;
      eq('O158 a late Approve (page showed Draft) after approve + withdraw elsewhere -> STALE, stays Withdrawn; late edit (old Rev) -> STALE', (st(r3, 'Active', 0, 'Draft'), st(r3, 'Withdrawn', 0, 'Active'), st(r3, 'Active', 0, 'Draft')) + ':' + byC(r3).status + ':' + err(function () { officeDocSave(tQ, { code: r1.code, rev: 1, title: 'Old view' }); }) + ':' + err(function () { officeDocSave(tQ, { code: r3, rev: 0, was: 'Draft', title: 'Old view' }); }), 'STALE:Withdrawn:STALE:STALE');
      find(db.rows(ODOC_REG_), 'Code', r1.code).Status = 'withdrawn'; db.rows(ODOC_HIST_).push({ At: 'x', Code: '__proto__', Rev: 0, Note: 'x' }, { At: 'x', Code: 'constructor', Rev: 0, Note: 'x' });
      eq('O159 hand-typed status / odd history codes: revise refused (WITHDRAWN), list still works', err(function () { officeDocRevise(tQ, r1.code, 2, 'x', '2026-12-17'); }) + ':' + (officeDocList(tD).rows.length > 10), 'WITHDRAWN:true');
      find(db.rows(ODOC_REG_), 'Code', r1.code).Status = 'Active';
      eq('O160 invisible format characters removed from titles (incl. U+206A, U+FFF9, tag characters)', oText_('A\u206aB\ufff9C\udb40\udc41D\u2066E', 120), 'ABCDE');
      // --- D1 (c) shared PDF footer
      var sp = function (kind, key, id) { return { kind: kind, key: key, id: id, docNo: id }; };
      var ct = function (what, s, d) { var c = oDocCtlFor_(d || db, what, s); return c ? c.text : '-'; };
      eq('O161 footer code by document kind (challan / note by their Kind)', [ct('Quote', sp('Quotes', 'QuoteNo', 'CAE/Q/2026/001')), ct('PI', sp('Proformas', 'PINo', 'X')), ct('Invoice', sp('Invoices', 'InvNo', 'X')), ct('PO', sp('POs', 'PONo', 'CAE/PO/2026/001')),
        ct('Note', sp('Notes', 'NoteNo', 'CAE/DN/2026/001')), ct('Note', sp('Notes', 'NoteNo', 'CAE/CN/2026/001')), ct('Challan', sp('Challans', 'ChallanNo', 'D1')), ct('Challan', sp('Challans', 'ChallanNo', 'D2')), ct('Challan', sp('Challans', 'ChallanNo', 'R1')), ct('Challan', sp('Challans', 'ChallanNo', 'T1'))]
        .map(function (x) { return x.split(' · ')[0]; }).join(','), 'CAE-SC-F01,CAE-AC-F01,CAE-AC-F02,CAE-PR-F01,CAE-AC-F03,CAE-AC-F04,CAE-PS-F01,CAE-PS-F01,CAE-PS-F02,CAE-YW-F01');
      eq('O162 footer text: code, Rev and issue date from the register; a revise shows on the next PDF', ct('Challan', sp('Challans', 'ChallanNo', 'R1')) + '|' + (officeDocRevise(tD, 'CAE-PS-F02', 0, 'Return count wording', '2026-11-20'), ct('Challan', sp('Challans', 'ChallanNo', 'R1'))),
        'CAE-PS-F02 · Rev 0 · 17 Nov 2026 · |CAE-PS-F02 · Rev 1 · 20 Nov 2026 · ');
      eq('O163 unknown document / odd challan kind / missing challan or note row / bad spec -> no code part', (function () { var t1 = find(db.rows('Challans'), 'ChallanNo', 'T1'); t1.Kind = 'Odd';
        try { return [ct('Letter', sp('X', 'Y', 'Z')), ct('Challan', sp('Challans', 'ChallanNo', 'T1')), ct('Challan', sp('Challans', 'ChallanNo', 'NOPE')), ct('Note', sp('Notes', 'NoteNo', 'NOPE')), ct('Quote', null), ct('Quote', 'x'), ct('__proto__', {}), ct('constructor', {}), ct({ toString: 1 }, {})].join(','); } finally { t1.Kind = 'Transfer'; } })(), '-,-,-,-,-,-,-,-,-');
      eq('O164 register row deleted -> no code part; register not set up -> the seed (Rev 0, 17 Nov 2026)', (function () { var rows = db.rows(ODOC_REG_), i = rows.indexOf(find(rows, 'Code', 'CAE-PR-F01')), x = rows.splice(i, 1)[0];
        try { return ct('PO', sp('POs', 'PONo', 'CAE/PO/2026/002')); } finally { rows.splice(i, 0, x); } })() + '|' + ct('PO', sp('POs', 'PONo', 'P'), { hasTab: function () { return false; } }) + '|' + ct('PO', sp('POs', 'PONo', 'P')).split(' · ')[0],
        '-|CAE-PR-F01 · Rev 0 · 17 Nov 2026 · |CAE-PR-F01');
      eq('O165 spec wrapper adds docCtl, wraps once, keeps the spec when the register fails', (function () { var f = function (d, n) { return sp('POs', 'PONo', n); }, w = oCtlWrap_('PO', f);
        return w(db, 'CAE/PO/2026/009').docCtl.code + ':' + (oCtlWrap_('PO', w) === w) + ':' + (w.officeCtl_ === f) + ':' + w({ hasTab: function () { throw new Error('x'); } }, 'N').docNo + ':' + w({ hasTab: function () { throw new Error('x'); } }, 'N').docCtl + ':' + oCtlWrap_('PO', 5) + ':' + oCtlWrap_('PO', function () { return null; })(db); })(), 'CAE-PR-F01:true:true:N:null:5:null');
      eq('O166 every system PDF kind is wrapped; renderInto runs the footer fill', (typeof PDF_SPECS !== 'object' || ODOC_SYS_.every(function (k) { return !!(PDF_SPECS[k] && PDF_SPECS[k].officeCtl_); })) + ':' + (typeof renderInto !== 'function' || /oFootFill_/.test(String(renderInto.officeRaw_ || renderInto))), 'true:true');
      if (typeof DocumentApp !== 'undefined') eq('O167 footer fill: both tokens in every header / footer section only, $ and \\ escaped; no control / no number -> empty', (function () {
        var T = DocumentApp.ElementType, calls = [], sec = function (tag) { return { replaceText: function (p, r) { calls.push(tag + ' ' + p + ' ' + r); } }; };
        var kids = [{ getType: function () { return 'BODY'; } }, { getType: function () { return T.FOOTER_SECTION; }, asFooterSection: function () { return sec('F'); } }, { getType: function () { return T.HEADER_SECTION; }, asHeaderSection: function () { return sec('H'); } }];
        var doc = { getBody: function () { return { getParent: function () { return { getNumChildren: function () { return kids.length; }, getChild: function (i) { return kids[i]; } }; } }; } };
        oFootFill_(doc, { docNo: 'A$1\\B', docCtl: { text: 'CAE-SC-F01 · Rev 0 · 17 Nov 2026 · ' } }); var a = calls.join('|'); calls = [];
        oFootFill_(doc, { docNo: '', docCtl: null }); oFootFill_(doc, null);
        return a + '#' + calls.join('|'); })(), 'F \\{\\{DocCtl\\}\\} CAE-SC-F01 · Rev 0 · 17 Nov 2026 · |F \\{\\{DocRec\\}\\}  · A\\$1\\\\B|H \\{\\{DocCtl\\}\\} CAE-SC-F01 · Rev 0 · 17 Nov 2026 · |H \\{\\{DocRec\\}\\}  · A\\$1\\\\B#' +
        'F \\{\\{DocCtl\\}\\} |F \\{\\{DocRec\\}\\} |H \\{\\{DocCtl\\}\\} |H \\{\\{DocRec\\}\\} |F \\{\\{DocCtl\\}\\} |F \\{\\{DocRec\\}\\} |H \\{\\{DocCtl\\}\\} |H \\{\\{DocRec\\}\\} ');
      eq('O168 issue date text', [oDayTxt_('2026-01-05'), oDayTxt_('2026-12-31'), oDayTxt_('2026-02-30'), oDayTxt_(''), oDayTxt_(null)].join(','), '5 Jan 2026,31 Dec 2026,,,');
      eq('O169 register cells: Rev only a whole number 0-999 (text \"2\" ok), else left out; duplicate code -> the Active row', (function () { var r = find(db.rows(ODOC_REG_), 'Code', 'CAE-SC-F01'), k = r.Rev, out = [], rows = db.rows(ODOC_REG_);
        try { [3, ' 2 ', -1, 1.5, 1e21, 'x', new Date(2026, 0, 1), '', null].forEach(function (v) { r.Rev = v; out.push(ct('Quote', sp('Quotes', 'QuoteNo', 'Q')).split(' · ').slice(0, 2).join(' ')); }); } finally { r.Rev = k; }
        rows.unshift({ Code: 'CAE-SC-F01', Rev: 9, RevDate: new Date(2020, 0, 1), Status: 'Withdrawn' });
        try { out.push(ct('Quote', sp('Quotes', 'QuoteNo', 'Q')).split(' · ')[1]); } finally { rows.shift(); }
        return out.join(','); })(), 'CAE-SC-F01 Rev 3,CAE-SC-F01 Rev 2,CAE-SC-F01 17 Nov 2026,CAE-SC-F01 17 Nov 2026,CAE-SC-F01 17 Nov 2026,CAE-SC-F01 17 Nov 2026,CAE-SC-F01 17 Nov 2026,CAE-SC-F01 17 Nov 2026,CAE-SC-F01 17 Nov 2026,Rev 0');
      eq('O170 a broken document never stops the PDF in the footer fill', oFootFill_({ getBody: function () { throw new Error('no body'); } }, {}).getBody ? 'kept' : 'lost', 'kept');
      if (typeof pdfTestDb_ === 'function' && typeof pdfSampleList_ === 'function' && typeof PDF_SPECS === 'object') eq('O171 real document specs (sample set, no register -> seed): every PDF gets its code', (function () {
        try { var pd = pdfTestDb_(); return pdfSampleList_(pd).map(function (x) { var s = PDF_SPECS[x[0]](pd, x[1]); return s.docCtl ? s.docCtl.code : '-'; }).join(','); } catch (e) { return 'crash: ' + e.message; } })(),
        'CAE-SC-F01,CAE-SC-F01,CAE-SC-F01,CAE-SC-F01,CAE-AC-F01,CAE-AC-F02,CAE-AC-F02,CAE-PS-F01,CAE-PS-F02,CAE-PR-F01,CAE-AC-F03');
      // --- D1 (c2) Drive folders for every system PDF (fake Drive, in memory)
      var fd = (function () { var seq = 0, files = {};
        var it = function (a) { var i = 0; return { hasNext: function () { return i < a.length; }, next: function () { return a[i++]; } }; };
        var file = function (name, par) { var f = { mime: /\.pdf$/i.test(name) ? 'application/pdf' : /\./.test(name) ? 'text/plain' : 'application/vnd.google-apps.document', getMimeType: function () { return f.mime; }, id: 'f' + new Array(22).join('0') + (++seq), name: name, par: par, gone: false, moves: 0,
          getId: function () { return f.id; }, getName: function () { return f.name; }, isTrashed: function () { return f.gone; }, setTrashed: function (v) { f.gone = v; },
          getParents: function () { return it([f.par]); }, moveTo: function (t) { f.par.fs.splice(f.par.fs.indexOf(f), 1); t.fs.push(f); f.par = t; f.moves++; return f; },
          getUrl: function () { return 'https://drive.google.com/file/d/' + f.id + '/view'; } }; par.fs.push(f); files[f.id] = f; return f; };
        var folder = function (name, par) { var d = { id: 'd' + (++seq), name: name, par: par, ks: [], fs: [], gone: false, at: seq,
          getId: function () { return d.id; }, getName: function () { return d.name; }, isTrashed: function () { return d.gone; }, setTrashed: function (v) { d.gone = v; },
          getDateCreated: function () { return new Date(d.at); }, getParents: function () { return it(d.par ? [d.par] : []); },
          getFolders: function () { return it(d.ks.slice()); }, getFoldersByName: function (n) { return it(d.ks.filter(function (k) { return k.name === n; })); },
          getFiles: function () { return it(d.fs.slice()); }, createFolder: function (n) { var k = folder(n, d); d.ks.push(k); return k; } }; return d; };
        var root = folder('Core Access Ops', null);
        var at = function (p) { return p.split(' > ').reduce(function (d, n) { return d && d.ks.filter(function (k) { return k.name === n && !k.gone; })[0]; }, root); };
        return { root: root, file: file, folder: folder, at: at, files: files, count: function () { var n = 0, w = function (d) { n++; d.ks.forEach(w); }; w(root); return n; } }; })();
      var db2 = new MemDb({ Quotes: { h: ['QuoteNo', 'QuoteDate', 'PDF'], rows: [{ QuoteNo: 'CAE/Q/2026/001', PDF: '' }, { QuoteNo: 'CAE/Q/2026/002', PDF: '' }, { QuoteNo: 'Q-OLD', QuoteDate: new Date(2025, 5, 1), PDF: '' }] },
        Proformas: { h: ['PINo', 'PIDate', 'PDF'], rows: [{ PINo: 'CAE/PI/2026/001', PDF: '' }] }, Invoices: { h: ['InvNo', 'InvDate', 'PDF'], rows: [] },
        Notes: { h: ['NoteNo', 'Kind', 'NoteDate', 'PDF'], rows: [{ NoteNo: 'CAE/CN/2027/004', Kind: 'CN', PDF: '' }] }, POs: { h: ['PONo', 'PODate', 'PDF'], rows: [{ PONo: 'CAE/PO/2026/001', PDF: '' }] },
        Challans: { h: ['ChallanNo', 'Kind', 'ChallanDate', 'JobNo', 'PDF'], rows: [{ ChallanNo: 'CAE/DC/2026/001', Kind: 'Delivery', JobNo: 'CAE/J/2026/001', PDF: '' }, { ChallanNo: 'CAE/DC/2026/002', Kind: 'Return', JobNo: 'CAE/J/2026/001', PDF: '' },
          { ChallanNo: 'CAE/DC/2026/003', Kind: 'Transfer', JobNo: '', PDF: '' }, { ChallanNo: 'CAE/DC/2026/004', Kind: 'Delivery', JobNo: 'CAE/J/2026/002', PDF: '' }] },
        Jobs: { h: ['JobNo', 'CustID', 'SiteID'], rows: [{ JobNo: 'CAE/J/2026/001', CustID: 'C1', SiteID: 'S1' }, { JobNo: 'CAE/J/2026/002', CustID: 'C2', SiteID: 'S2' }] },
        Customers: { h: ['CustID', 'Name'], rows: [{ CustID: 'C1', Name: 'Aziz / Sons: "Ltd"' }, { CustID: 'C2', Name: 'Robi‮ Axiata' }] },
        Sites: { h: ['SiteID', 'Project', 'Address'], rows: [{ SiteID: 'S1', Project: 'Boiler house', Address: 'Ghorashal' }, { SiteID: 'S2', Project: '', Address: 'Gulshan*2' }] } });
      var NOW = Date.UTC(2026, 10, 17, 6), pt = function (w, n) { var p = oPdfPath_(db2, w, n, NOW); return p ? oPathText_(p) : '-'; };
      eq('O172 year from the number, else the record date, else today; folder names cleaned', [oPdfYear_('CAE/Q/2027/001'), oPdfYear_('CAE-Q-2026-001'), oPdfYear_('Q-OLD', { D: new Date(2025, 5, 1) }, 'D'), oPdfYear_('X12026', {}, 'D', NOW), oPdfYear_(null, null, null, NOW),
        oFolderName_('a/b\\c:d*e?f"g<h>i|j'), oFolderName_('\u0007 x\u200b y  '), oFolderName_('..'), oFolderName_(new Array(80).join('z')).length].join('|'), '2027|2026|2025|2026|2026|a-b-c-d-e-f-g-h-i-j|x y||60');
      eq('O173 folder per document: year folders; challans in the job folder; transfers + challans without a job in Yard; unknown -> none', [pt('Quote', 'CAE/Q/2026/001'), pt('Quote', 'Q-OLD'), pt('PI', 'CAE/PI/2026/001'), pt('Invoice', 'CAE/INV/2026/009'), pt('Note', 'CAE/CN/2027/004'), pt('PO', 'CAE/PO/2026/001'),
        pt('Challan', 'CAE/DC/2026/001'), pt('Challan', 'CAE/DC/2026/002'), pt('Challan', 'CAE/DC/2026/003'), pt('Challan', 'CAE/DC/2026/004'), pt('Challan', 'NOPE'), pt('Letter', 'X'), pt('__proto__', 'X'), pt('Quote', '')].join('|'),
        'PDF › Quotes › 2026|PDF › Quotes › 2025|PDF › Proformas › 2026|PDF › Invoices › 2026|PDF › Notes › 2027|PDF › POs › 2026|PDF › Projects › Active › CAE-J-2026-001 – Aziz - Sons- -Ltd- – Boiler house › Challans|PDF › Projects › Active › CAE-J-2026-001 – Aziz - Sons- -Ltd- – Boiler house › Challans|PDF › Yard › Transfers › 2026|PDF › Projects › Active › CAE-J-2026-002 – Robi Axiata – Gulshan-2 › Challans|-|-|-|-');
      var P1 = oPdfPath_(db2, 'Quote', 'CAE/Q/2026/001', NOW), n0 = fd.count(), d1 = oPdfDir_(fd.root, P1, true), n1 = fd.count(), d2 = oPdfDir_(fd.root, P1, true);
      eq('O174 folders made once and reused; find-only never makes one', (n1 - n0) + ':' + (d1 === d2) + ':' + (fd.count() === n1) + ':' + oPdfDir_(fd.root, oPdfPath_(db2, 'PI', 'CAE/PI/2026/001', NOW), false) + ':' + (fd.count() === n1), '3:true:true:null:true');
      var J1 = oPdfDir_(fd.root, oPdfPath_(db2, 'Challan', 'CAE/DC/2026/001', NOW), true);
      find(db2.rows('Customers'), 'CustID', 'C1').Name = 'Aziz Group';
      var J2 = oPdfDir_(fd.root, oPdfPath_(db2, 'Challan', 'CAE/DC/2026/002', NOW), true), act = fd.at('PDF > Projects > Active');
      eq('O175 job folder found by its job number: a renamed client makes no second folder', (J1 === J2) + ':' + act.ks.length + ':' + J1.name, 'true:1:Challans');
      var jf = act.ks[0]; act.ks.splice(0, 1); var arc = fd.at('PDF > Projects').createFolder('Archive').createFolder('2026'); arc.ks.push(jf); jf.par = arc;
      eq('O176 a job folder moved to Projects › Archive › <year> is used there', (oPdfDir_(fd.root, oPdfPath_(db2, 'Challan', 'CAE/DC/2026/001', NOW), true) === J1) + ':' + act.ks.length, 'true:0');
      arc.ks.splice(0, 1); act.ks.push(jf); jf.par = act;
      eq('O177 two folders of one name (made at the same moment): both runs use the oldest', (function () { var p = fd.at('PDF > Quotes'), c0 = p.createFolder;
        p.createFolder = function (n) { var a = c0(n); c0(n); return a; }; var y = oPdfDir_(fd.root, oPdfPath_(db2, 'Quote', 'Q-OLD', NOW), true); p.createFolder = c0;
        var two = p.ks.filter(function (k) { return k.name === '2025'; }); return two.length + ':' + (y === two[0]) + ':' + (oPdfDir_(fd.root, oPdfPath_(db2, 'Quote', 'Q-OLD', NOW), true) === two[0]); })(), '2:true:true');
      var calls = [], mk = function (d, w, n, o) { calls.push(o); return 'made'; }, base = function () { return fd.root; };
      var so = { noLink: true }, samp = { folder: 'SAMPLES' };
      eq('O178 makePdf wrapper: new folder passed on, other options kept, caller options not changed; given folder / unknown kind / bad data -> as before', [oPdfMake_(db2, 'Quote', 'CAE/Q/2026/001', so, mk, base), calls[0].folder === d1, calls[0].noLink, so.folder === undefined,
        (oPdfMake_(db2, 'Quote', 'CAE/Q/2026/001', samp, mk, base), calls[1] === samp), (oPdfMake_(db2, 'Letter', 'X', undefined, mk, base), calls[2] === undefined),
        (oPdfMake_(db2, 'Challan', 'NOPE', undefined, mk, base), calls[3] === undefined), (oPdfMake_(db2, 'Quote', 'Q1', undefined, mk, function () { throw new Error('no Drive'); }), calls[4] === undefined),
        (oPdfMake_({ hasTab: function () { throw new Error('x'); } }, 'Quote', 'Q1', null, mk, base), calls[5] === null)].join(','), 'made,true,true,true,true,true,true,true,true');
      eq('O179 the live makePdf is wrapped (sample set still uses its own folder)', typeof makePdf !== 'function' || !!((makePdf.officeRaw_ || makePdf).officePdf_), true);
      // one-time move: old layout PDF > <type> (+ Editable)
      var pdfF = fd.at('PDF'), mkOld = function (t) { return fd.at('PDF > ' + t) || pdfF.createFolder(t); }, edOld = function (t) { var o = mkOld(t); return o.ks.filter(function (k) { return k.name === 'Editable'; })[0] || o.createFolder('Editable'); };
      var q1 = fd.file('CAE-Q-2026-001 Aziz.pdf', mkOld('Quotes')), q1d = fd.file('CAE-Q-2026-001 Aziz', edOld('Quotes')), q2 = fd.file('CAE-Q-2026-002 Rev 1 Adrian.pdf', mkOld('Quotes')), q9 = fd.file('CAE-Q-2026-009 Old one.pdf', mkOld('Quotes')), qx = fd.file('notes.txt', mkOld('Quotes'));
      var po = fd.file('CAE-PO-2026-001 Robi Axiata PLC.pdf', mkOld('POs')), pod = fd.file('CAE-PO-2026-001 Robi Axiata PLC', edOld('POs')), c1 = fd.file('CAE-DC-2026-001 Delivery.pdf', mkOld('Challans')), c1d = fd.file('CAE-DC-2026-001 Delivery', edOld('Challans'));
      var c3 = fd.file('CAE-DC-2026-003 Transfer.pdf', mkOld('Challans')), cx = fd.file('CAE-DC-2026-099 Lost.pdf', mkOld('Challans')), gone = fd.file('CAE-PI-2026-001 X.pdf', mkOld('Proformas')); gone.setTrashed(true);
      var smp = fd.file('CAE-Q-2026-001 Test Client.pdf', mkOld('_Samples')), lab = fd.file('CAE QR labels.pdf', mkOld('Labels'));
      var pin = fd.file('CAE-Q-2026-002 Rev 2 Adrian.pdf', d1); // already in its year folder (a PDF made after the change)
      find(db2.rows('Quotes'), 'QuoteNo', 'CAE/Q/2026/001').PDF = q1.getUrl(); find(db2.rows('Quotes'), 'QuoteNo', 'CAE/Q/2026/002').PDF = pin.getUrl(); find(db2.rows('POs'), 'PONo', 'CAE/PO/2026/001').PDF = po.getUrl();
      find(db2.rows('Challans'), 'ChallanNo', 'CAE/DC/2026/001').PDF = 'https://drive.google.com/open?id=' + c1.id; find(db2.rows('Proformas'), 'PINo', 'CAE/PI/2026/001').PDF = gone.getUrl(); find(db2.rows('Challans'), 'ChallanNo', 'CAE/DC/2026/004').PDF = 'not a link';
      var drv = { base: fd.root, file: function (id) { if (!fd.files[id]) throw new Error('not found'); return fd.files[id]; } }, cnt0 = fd.count();
      var dry = oPdfMove_(db2, drv, false, NOW);
      eq('O180 plan only: lists the moves, changes nothing, makes no folder; links checked', dry.moves.length + ':' + [q1, q1d, q2, po, c1, c3].every(function (f) { return f.moves === 0; }) + ':' + (fd.count() === cnt0) + ':' + dry.links.ok + ':' + dry.links.bad.join('; '),
        '9:true:true:4:CAE/PI/2026/001: file is in the bin; CAE/DC/2026/004: link does not open');
      var run = oPdfMove_(db2, drv, true, NOW), pp = function (f) { var a = [], d = f.par; while (d && d !== fd.root) { a.unshift(d.name); d = d.par; } return a.join(' > '); };
      eq('O181 move: PDFs to the year / job / Yard folders, Editable Docs into Editable there, file ids kept', [pp(q1), pp(q1d), pp(q2), pp(q9), pp(po), pp(pod), pp(c1).replace(/ – .*? >/, ' >'), pp(c1d).replace(/ – .*? >/, ' >'), pp(c3), q1.id === q1.getId()].join('|'),
        'PDF > Quotes > 2026|PDF > Quotes > 2026 > Editable|PDF > Quotes > 2026|PDF > Quotes > 2026|PDF > POs > 2026|PDF > POs > 2026 > Editable|PDF > Projects > Active > CAE-J-2026-001 > Challans|PDF > Projects > Active > CAE-J-2026-001 > Challans > Editable|PDF > Yard > Transfers > 2026|true');
      eq('O182 left where they are: not a PDF (txt), unknown challan, files in the bin, _Samples, Labels; the emptied old folders stay (not binned)', [pp(qx), pp(cx), pp(gone), pp(smp), pp(lab), run.left.join(';'), !!fd.at('PDF > Quotes > Editable'), !!fd.at('PDF > Challans > Editable'), mkOld('Quotes').gone].join('|'),
        'PDF > Quotes|PDF > Challans|PDF > Proformas|PDF > _Samples|PDF > Labels|Challans › CAE-DC-2026-099 Lost.pdf (no record found)|true|true|false');
      eq('O183 after the move every working link still opens and sits in its new folder; the 2 broken ones are reported', run.links.ok + ':' + run.links.bad.length, '4:2');
      var again = oPdfMove_(db2, drv, true, NOW);
      eq('O184 second run: nothing moves (safe to repeat); the PDFs made after the change are never moved', again.moves.length + ':' + pin.moves + ':' + again.links.ok, '0:0:4');
      eq('O186 one file that cannot be moved is listed, the others still move; missing Jobs tab does not stop it', (function () {
        var a1 = fd.file('CAE-Q-2026-001 Again.pdf', mkOld('Quotes')), a2 = fd.file('CAE-PO-2026-001 Robi copy.pdf', mkOld('POs')); a1.moveTo = function () { throw new Error('Access denied'); };
        var r = oPdfMove_(db2, drv, true, NOW), jt = db2.h.Jobs; delete db2.h.Jobs; var p = pt('Challan', 'CAE/DC/2026/001'); db2.h.Jobs = jt;
        return r.left.filter(function (x) { return /Access denied/.test(x); }).length + ':' + pp(a2) + ':' + p.split(' › ').slice(3).join(' > '); })(), '1:PDF > POs > 2026:CAE-J-2026-001 > Challans');
      eq('O187 an older copy with the same name as one already in the new folder is not moved next to it (listed)', (function () { var y = fd.at('PDF > Invoices > 2026') || oPdfDir_(fd.root, [{ n: 'PDF' }, { n: 'Invoices' }, { n: '2026' }], true);
        fd.file('CAE-INV-2026-001 Aziz.pdf', y); var st = fd.file('CAE-INV-2026-001 Aziz.pdf', mkOld('Invoices')), r = oPdfMove_(db2, drv, true, NOW);
        return st.moves + ':' + r.left.filter(function (x) { return /newer copy is already in PDF › Invoices › 2026/.test(x); }).length; })(), '0:1');
      eq('O188 a remade document bins its same-named PDF + Doc made before the change (old type folder only)', (function () { var p1 = fd.file('CAE-PI-2026-001 Remade.pdf', mkOld('Proformas')), p2 = fd.file('CAE-PI-2026-001 Remade', edOld('Proformas')), p3 = fd.file('CAE-PI-2026-001 Other.pdf', mkOld('Proformas'));
        oPdfMake_(db2, 'PI', 'CAE/PI/2026/001', {}, function () { return { file: 'CAE-PI-2026-001 Remade.pdf' }; }, base);
        return [p1.gone, p2.gone, p3.gone].join(','); })(), 'true,true,false');
      eq('O189 two folders of one name already there: always the oldest, whatever order Drive lists them in', (function () { var p = fd.folder('P', null), a = p.createFolder('2026'), b = p.createFolder('2026'); p.ks.reverse();
        return (oSubFind_(p, { n: '2026' }) === a) + ':' + (oSub_(p, { n: '2026' }, true) === a); })(), 'true:true');
      eq('O190 an archived job folder is found even when Projects › Active does not exist (plan + link check), no Active made', (function () { var r0 = fd.folder('R', null), pr = r0.createFolder('PDF').createFolder('Projects'), j = pr.createFolder('Archive').createFolder('2026').createFolder('CAE-J-2026-001 – Old name');
        var path = oPdfPath_(db2, 'Challan', 'CAE/DC/2026/001', NOW), g = oPdfDir_(r0, path.slice(0, 4), false);
        return (g === j) + ':' + !pr.ks.some(function (k) { return k.name === 'Active'; }) + ':' + (oPdfDir_(r0, path, true).par === j); })(), 'true:true:true');
      // --- CodeRabbit CLI review (17 Nov): concurrent detail edits, history-first writes, new PDF never binned
      eq('O191 detail edit with the old title / owner: changed meanwhile by someone else -> STALE, nothing written; not an object -> STALE', (function () { var t0 = byC(r1.code), h0 = db.rows(ODOC_HIST_).length;
        var a1 = officeDocSave(tD, { code: r1.code, rev: 2, was: 'Active', title: 'Changed by Director', owner: t0.owner, old: { title: t0.title, owner: t0.owner } }).ok;
        var a2 = err(function () { officeDocSave(tQ, { code: r1.code, rev: 2, was: 'Active', title: t0.title, owner: 'New owner', old: { title: t0.title, owner: t0.owner } }); });
        var a3 = err(function () { officeDocSave(tQ, { code: r1.code, rev: 2, was: 'Active', title: 'X', owner: 'Y', old: 'x' }); });
        var a4 = officeDocSave(tQ, { code: r1.code, rev: 2, was: 'Active', title: 'Changed by Director', owner: 'QHSE Head', old: { title: 'Changed by Director', owner: t0.owner } }).ok;
        return [a1, a2, a3, byC(r1.code).title, a4, byC(r1.code).owner, db.rows(ODOC_HIST_).length - h0].join(','); })(), 'true,STALE,STALE,Changed by Director,true,QHSE Head,2');
      eq('O192 register write fails -> the register is unchanged, history has the entry + a \"Not applied\" entry', (function () { var u0 = db.update, h0 = db.rows(ODOC_HIST_).length; db.update = function () { throw new Error('sheet busy'); };
        try { var e1 = err(function () { officeDocRevise(tQ, r2.code, 1, 'tx test', '2026-11-17'); }); } finally { db.update = u0; }
        return e1 + ':' + byC(r2.code).rev + ':' + db.rows(ODOC_HIST_).slice(h0).map(function (h) { return h.Note; }).join('/'); })(), 'sheet busy:1:tx test/Not applied (save failed): tx test');
      eq('O193 history write fails -> nothing changes in the register (history goes first)', (function () { var i0 = db.insert; db.insert = function (t) { if (t === ODOC_HIST_) throw new Error('hist down'); return i0.apply(db, arguments); };
        try { var e1 = err(function () { officeDocStatus(tQ, r2.code, 'Withdrawn', 1, 'Active'); }), e2 = err(function () { officeDocSave(tQ, { code: r2.code, rev: 1, was: 'Active', title: 'New title' }); }); } finally { db.insert = i0; }
        return e1 + ',' + e2 + ':' + byC(r2.code).status + ':' + byC(r2.code).title; })(), 'hist down,hist down:Active:Toolbox talk record');
      eq('O194 add: register row fails -> no row, history says Not applied', (function () { var i0 = db.insert, n0 = db.rows(ODOC_REG_).length; db.insert = function (t) { if (t === ODOC_REG_) throw new Error('reg down'); return i0.apply(db, arguments); };
        try { var e1 = err(function () { officeDocSave(tQ, { isNew: true, dept: 'QH', type: 'Form', title: 'Tx', status: 'Draft' }); }); } finally { db.insert = i0; }
        return e1 + ':' + (db.rows(ODOC_REG_).length - n0) + ':' + db.rows(ODOC_HIST_).slice(-1)[0].Note; })(), 'reg down:0:Not applied (save failed): Added as draft');
      eq('O195 a remade PDF written into the old folder is never binned by its own clean-up; older same-named copies are', (function () { var oq = mkOld('Quotes'), nf = fd.file('CAE-Q-2026-001 Fresh.pdf', oq), nd = fd.file('CAE-Q-2026-001 Fresh', edOld('Quotes')), st = fd.file('CAE-Q-2026-001 Fresh.pdf', oq);
        oPdfMake_(db2, 'Quote', 'CAE/Q/2026/001', {}, function () { return { file: 'CAE-Q-2026-001 Fresh.pdf', url: nf.getUrl(), doc: 'https://docs.google.com/document/d/' + nd.id + '/edit' }; }, base);
        return [nf.gone, nd.gone, st.gone].join(','); })(), 'false,false,true');
      eq('O185 no PDF folder at all -> nothing done', oPdfMove_(db2, { base: fd.folder('Empty', null), file: drv.file }, true, NOW).left.join(), 'No PDF folder');
      e3.clock.db = null;
      eq('O156 no sheet: list says not set up, writes NOREG', officeDocList(tD).setup + ':' + err(function () { officeDocStatus(tD, 'CAE-QH-P01', 'Active', 0); }), 'false:NOREG');
    })();
    OFFICE_ENV_ = env;
    var big = new Array(1 << 20).join('a') + '@x', t0 = Date.now();
    eq('O74 1 MB email refused at once', err(function () { officeLogin(big, 'GoodPass1', false); }) + ':' + (Date.now() - t0 < 1000), 'BAD|5:true');
    eq('O75 near-miss email (no dot) refused quickly', (t0 = Date.now(), err(function () { officeLogin('a@' + new Array(118).join('b'), 'GoodPass1', false); })) + ':' + (Date.now() - t0 < 1000), 'BAD|5:true');
    var kp = officeLogin('jamal@test.com', 'GoodPass1', 'false').token;
    eq('O76 keep only when exactly true ("false" string = 8 h)', env.get('OS:' + kp).exp - env.clock.now, 8 * H);
    eq('O77 error text never echoes a huge email', err(function () { oSaveLogin_(env, { email: new Array(5000).join('z'), name: 'Z', role: 'Field', password: 'GoodPass1' }); }).length < 100, true);
    eq('O78 object / number inputs do not crash', [err(function () { officeLogin({ a: 1 }, ['x'], 1); }), err(function () { officeMe({ toString: null }); }), String(officeLogout(12345))].join(','), 'BAD|5,NOSESSION,true');
    if (typeof Utilities !== 'undefined') {
      var R = officeEnv_();
      eq('O49 PBKDF2 RFC vector c=1', oPbkdf2_(R, 'password', 'salt', 1), 'Eg+2z/z4syxD5yJSVsT4N6hlSMkszDVICAWYfLcL4Xs=');
      eq('O50 PBKDF2 RFC vector c=4096', oPbkdf2_(R, 'password', 'salt', 4096), 'xeR41ZKIyEGqUw22hFxMjZYok6ABzk4RpJY4c6qYE0o=');
      var kk = R.bytes(new Array(81).join('k') + 'é'), vv = R.bytes('message ' + new Array(70).join('v'));
      eq('O51 JS HMAC = Utilities HMAC (long key, 2 blocks)', R.b64(oHmacJs_(vv, kk)), Utilities.base64Encode(Utilities.computeHmacSha256Signature(vv, kk)));
      eq('O52 SHA-256 of "abc"', R.b64(oSha256_(R.bytes('abc'))), 'ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0=');
    }
  } catch (e) { fail++; log.push('FAIL OF crashed: ' + e.message); }
  finally { OFFICE_ENV_ = keep; OFFICE_CFG_.kdfIters = keepIt; OFFICE_CFG_.maxPerMin = keepPm; }
  log.unshift('OF ' + pass + ' passed, ' + fail + ' failed');
  return { pass: pass, fail: fail, log: log };
}

// LAST statement of the LAST file: guard every public function of the project (see header).
oGuardAll_(OFFICE_G_);
