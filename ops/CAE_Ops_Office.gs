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
// W3 (17 Nov): SC > Quotes. officeQuoteList / officeQuoteGet (any SC level), officeQuoteTerm + officeQuoteEmail (SC Staff+ or
//   Director, gate in the lock), officeQuotePdf. Reuses QT1 qtSave_ (terms), QF5 qf5Pdf_ (PDF), QF3 emailQuote. tv = terms version
//   (hash) -> STALE; PDF reused only when made here for the same tv (OQP:<no> in Script Properties). Wraps user_ (log = office login).
// W4 (18 Nov): SC > New / edit quote. officeQuoteForm, officeCustomerAdd, officeSiteAdd, officeQuoteSave (SC Staff+ or Director,
//   gate in the lock; the panel's saveQuoteFull reused). 7 columns, "/ month" unit = Unit + Billing Monthly + Months 1 (no new
//   column). Codes: DUP|id|what, QOLD|n (old-format lines), SLOW, SAVEFAIL|text. officeScopeItemsAdd (editor, run once).
// D2 (18 Nov): signatures + company stamp. officeSigGet / officeSigSave / officeSigRemove (own Staff record or a Director),
//   officeStampGet / officeStampSave (Directors). Every system PDF: sign block (preparer, signature image, stamp) + the line
//   "Digitally generated ...". Records OSG:<StaffID> / OSG_STAMP in Script Properties, images in the private Drive folder.
//   officeSigSeed (editor, run once). Codes: NOSTAFF, BADIMG|type/size/pixels/broken, SLOW.
// Replaces: doGet (if an earlier file had one — check before install).
// Wraps: onOpen (adds the "Web app" menu), selfTestAllParts_ (adds 'OF'), every PDF_SPECS entry + renderInto (D1 c footer), makePdf (D1 c2 folders),
//   PDF_SPECS.Quote again (W4: price grid in the 7 columns), every PDF_SPECS entry + makePdf + uiGetDb_ + UI_ACTIONS_.pdf again (D2),
//   BLOCKS_ (adds osign).
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
var OLK_ = { s: 0, g: 0, ls: null, np: false }; // s = script lock held by this execution (depth); g = lock taken / let go count (W4d); ls = tests' LockService; np = panel PDF action
function oLs_() { return OLK_.ls || LockService; }

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
    lock: function (fn) { if (OLK_.s) return fn(); var l = oLs_().getScriptLock(); try { l.waitLock(30000); } catch (e) { oFail_('BUSY'); } OLK_.s++; OLK_.g++; var ok = false; try { var v = fn(); ok = true; return v; } finally { oLkEnd_(l, ok); } }, // flushed first: the next locked call reads these writes
    who: function () { return { active: Session.getActiveUser().getEmail() || '', effective: Session.getEffectiveUser().getEmail() || '' }; },
    triggerIds: function () { return ScriptApp.getProjectTriggers().map(function (x) { return String(x.getUniqueId()); }); },
    db: function () { // the CAE Ops DB (the bound sheet; by id if a web call has no active sheet)
      var ss = null; try { ss = SpreadsheetApp.getActive(); } catch (e) { ss = null; }
      return typeof SheetDb === 'function' ? oW4dOn_(new SheetDb(ss || SpreadsheetApp.openById(OFFICE_DB_ID_))) : null; // W4d: one batch read
    }
  };
}
function oEnv_() { return OFFICE_ENV_ || officeEnv_(); }
// CR14: the sheet panel's withLock (document lock) also takes the script lock first, so a panel write (e.g. job from a quote)
// and a web-app write (script lock; a web call has no document lock) never run at the same time. Order: script, then document.
if (typeof withLock === 'function' && !withLock.officeLk_) {
  var OLK_withLock0_ = withLock;
  withLock = function (fn) {
    if (OLK_.s || OLK_.np || (typeof LockService === 'undefined' && !OLK_.ls)) return OLK_withLock0_(fn); // a PDF (10-30 s) does not block the web app
    var l = oLs_().getScriptLock(); l.waitLock(30000); OLK_.s++; OLK_.g++;
    var ok = false; try { var v = OLK_withLock0_(fn); ok = true; return v; } finally { oLkEnd_(l, ok); } // flushed before the script lock is let go
  };
  withLock.officeLk_ = OLK_withLock0_;
}
if (typeof uiDo === 'function' && !uiDo.officeLk_) {
  var OLK_uiDo0_ = uiDo;
  uiDo = function (action, args) { var k = OLK_.np; OLK_.np = action === 'pdf' || action === 'quotePdf'; try { return OLK_uiDo0_(action, args); } finally { OLK_.np = k; } };
  uiDo.officeLk_ = OLK_uiDo0_;
}
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
function oPublic_(L) { var a = oAcc_(L); return { email: L.email, name: L.name, depts: a, level: OFFICE_LVL_[oLevel_(a)] || '', money: oCanSeeMoney_(a), staff: String(L.staff || '') }; }
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
        return { name: String(L.name || ''), email: L.email, depts: oAcc_(L), status: on ? 'Enabled' : 'Blocked', last: +L.last || 0, sessions: on ? (live[L.email] || 0) : 0, staff: String(L.staff || ''), sig: !!L.staff && !!oSgRec_(env, 'OSG:' + String(L.staff)) };
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
// the live web app (deployment edited in place, same link). ScriptApp.getService().getUrl() gave an old, dead deployment link.
var OFFICE_EXEC_URL_ = 'https://script.google.com/macros/s/AKfycbzuf7yk0kLHC7sN_QISNnn58ioXMHIZzss_BPAoOM5VahN0E0UG645NLcGsAlkUvBfrag/exec';
function menuOfficeLink() {
  var u = OFFICE_EXEC_URL_, h = HtmlService.createHtmlOutput('<div style="font:14px Arial,sans-serif">' +
    '<p><a href="' + u + '" target="_blank" rel="noopener" style="font-size:16px;font-weight:bold">Open the Core Access web app</a></p>' +
    '<p style="font-size:12px;color:#555">If Google says it cannot open the file: open the link in an Incognito / Private window (several Google accounts signed in).</p>' +
    '<p style="font-size:11px;color:#777;word-break:break-all">' + u + '</p></div>').setWidth(480).setHeight(190);
  SpreadsheetApp.getUi().showModalDialog(h, 'Web app');
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
  ['CAE-YW-F02', 'Rent-in receipt (goods in from a rental supplier)', 'YW', 'Form', 'Yard Head', 'Active', 'Challan', ''],
  ['CAE-YW-F03', 'Off-hire note (return to a rental supplier)', 'YW', 'Form', 'Yard Head', 'Active', 'Challan', ''],
  ['CAE-PR-F01', 'Purchase order', 'PR', 'Form', 'Procurement Head', 'Active', 'PO', 'CAE/PO/2026/001'] // first PO to Robi, made by hand (user OK, 17 Nov)
];
// Issued count = record numbers in the source tab that have a PDF link, plus the by-hand numbers (no double count).
var ODOC_SRC_ = {
  'CAE-SC-F01': ['Quotes', 'QuoteNo'], 'CAE-AC-F01': ['Proformas', 'PINo'], 'CAE-AC-F02': ['Invoices', 'InvNo'],
  'CAE-AC-F03': ['Notes', 'NoteNo', function (r) { return String(r.Kind) !== 'CN'; }], 'CAE-AC-F04': ['Notes', 'NoteNo', function (r) { return String(r.Kind) === 'CN'; }],
  'CAE-PS-F01': ['Challans', 'ChallanNo', function (r) { return r.Kind === 'Delivery' || r.Kind === 'Sale'; }],
  'CAE-PS-F02': ['Challans', 'ChallanNo', function (r) { return r.Kind === 'Return'; }],
  'CAE-YW-F01': ['Challans', 'ChallanNo', function (r) { return r.Kind === 'Transfer'; }],
  'CAE-YW-F02': ['Challans', 'ChallanNo', function (r) { return r.Kind === 'Hire-in'; }],
  'CAE-YW-F03': ['Challans', 'ChallanNo', function (r) { return r.Kind === 'Off-hire'; }],
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
    owner: oUncell_(r.Owner), status: String(r.Status), sys: String(r.Sys || ''), issued: r.Sys ? oDocIssued_(db, String(r.Code), r.ByHand) : 0, hist: hist || [], blank: oDocBlank_(db, String(r.Code)) };
}
var ODOC_BLANK_ = { 'CAE-PS-F01': 'ChallanTemplateID', 'CAE-PS-F02': 'ChallanTemplateID', 'CAE-YW-F01': 'ChallanTemplateID' }; // D2: blank forms for hand use (Settings key -> Google Doc id)
function oDocBlank_(db, code) {
  var k = Object.prototype.hasOwnProperty.call(ODOC_BLANK_, code) && db.hasTab('Settings') ? ODOC_BLANK_[code] : '', id = k ? String(S(db, k, '')).trim() : '';
  return /^[A-Za-z0-9_-]{25,80}$/.test(id) ? 'https://docs.google.com/document/d/' + id + '/edit' : '';
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
  Challan: function (r) { return r.Kind === 'Delivery' || r.Kind === 'Sale' ? 'CAE-PS-F01' : r.Kind === 'Return' ? 'CAE-PS-F02' : r.Kind === 'Transfer' ? 'CAE-YW-F01' : r.Kind === 'Hire-in' ? 'CAE-YW-F02' : r.Kind === 'Off-hire' ? 'CAE-YW-F03' : ''; }
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
  oIt_(old.getFiles()).forEach(function (f) { if (ok(f) && f.getName() === file) oBin_(f); });
  if (ed) oIt_(ed.getFiles()).forEach(function (f) { if (ok(f) && f.getName() === doc) oBin_(f); });
}
// CR run 9: while a PDF is made whose link is written only afterwards (office app: oQPdfMake_; sheet panel: oPeCheck_), the old same-named
// copies (makePdf's trashSame_, oPdfOldBin_) are only listed in OPDF_BIN_; oBinNow_ bins them once the new link is in. Refused -> they stay.
var OPDF_BIN_ = null;
function oBin_(f) { if (OPDF_BIN_) OPDF_BIN_.push(f); else f.setTrashed(true); }
function oBinNow_(a, keep) { (Array.isArray(a) ? a : []).forEach(function (f) { try { if ((keep || []).indexOf(f.getId()) < 0 && oAlive_(f)) f.setTrashed(true); } catch (e) { /* an old copy may stay */ } }); }
function oPdfIds_(r) { return [r && r.url, r && r.doc].map(function (u) { return oPdfIdOf_(u); }).filter(function (x) { return x; }); }
if (typeof trashSame_ === 'function' && !trashSame_.officeBin_) {
  var OF_trashSame0_ = trashSame_;
  trashSame_ = function (folder, name) { if (!OPDF_BIN_) return OF_trashSame0_.apply(this, arguments); var it = folder.getFilesByName(name); while (it.hasNext()) OPDF_BIN_.push(it.next()); };
  trashSame_.officeBin_ = OF_trashSame0_;
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

// ----------------------------------------------------------------- W3 (17 Nov): SC > Quotes (list, view, terms, PDF, email)
// Reuses QT1 (terms: Terms tab by QuoteType + per-quote QuoteTerms rows, saved by qtSave_), QF5 (quote PDF, one file per quote)
// and QF3 (email). Any SC level reads; SC Staff (L2) / Head or Director changes the terms and emails. tv = a terms
// version (hash of everything the terms view shows) -> STALE when it changed meanwhile. Clause text: {{Token}} in the sheet
// = {Token} on the page. Codes: QLOCKED (job / not Draft-Sent), QSTATE|status, TOFILL|n, STALE, NOTFOUND, BADINPUT|field, BUSY.
var OQ_NEED_ = { dept: 'SC', level: 1 }, OQ_WRITE_ = { dept: 'SC', level: 2 };
var OQ_TOK_ = { AdvancePct: 'AdvancePct', PaymentDays: 'PaymentDays', ValidityDays: 'ValidityDays', LateInterestPct: 'LateInterest', MinMonths: 'MinMonths', NoticeDays: 'NoticeDays', PartPeriodRule: 'PartPeriod' };
var OQ_LIM_ = { AdvancePct: [0, 100], PaymentDays: [1, 365], ValidityDays: [1, 365], LateInterestPct: [0, 10], MinMonths: [1, 60], NoticeDays: [0, 90] };
var OQ_FIXED_ = { PeriodDays: 'Hire month (days)', BillingSchedule: 'Billing schedule' };
var OQ_PH_ = /\[(?!to fill in Settings\]|verify with accountant\])[^\]"]*\]/g; // as makePdf counts them (any length, newlines, empty too)
var OQ_CLOSED_ = ['Lost', 'Expired', 'Cancelled'];
var OQ_ACT_ = ''; // the office login acting now (log + UpdatedBy), else the Google user
var OQ_user0_ = user_;
user_ = function () { return OQ_ACT_ || OQ_user0_(); };
function oQNo_(v) { return typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9\/._-]{0,39}$/.test(v) ? v : ''; }
function oQRow_(db, no) { var n = oQNo_(no); var q = n ? find(db.rows('Quotes'), 'QuoteNo', n) : null; if (!q) oFail_('NOTFOUND'); return q; }
function oQDn_(v) { try { return dayNum(v); } catch (e) { return null; } }
function oQDay_(n) { return n == null ? '' : oDay_(fromDay(n)); }
function oQHash_(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h + 1; }
function oQType_(q) { return String(q.QuoteType || 'Rental'); }
function oQOv_(db, no) { return qtRows_(db, no).slice().sort(function (a, b) { return num(a.SortOrder) - num(b.SortOrder); }); }
function oQJob_(db, no) { return find(db.rows('Jobs'), 'QuoteNo', no); }
function oQLocked_(db, q) { return oQJob_(db, q.QuoteNo) ? 'JOB' : ['Draft', 'Sent'].indexOf(String(q.Status)) < 0 ? 'STATUS' : ''; }
function oQLines_(db, no) { return db.rows('QuoteLines').filter(function (l) { return String(l.QuoteNo) === String(no); }).sort(function (a, b) { return num(a.LineNo) - num(b.LineNo); }); }
function oQTv_(db, q) { // everything the terms view + email depend on (not the PDF link)
  var no = q.QuoteNo, cu = find(db.rows('Customers'), 'CustID', q.CustID) || {}, type = oQType_(q), j = oQJob_(db, no);
  var st = ['AdvancePct', 'MinHireMonths', 'PaymentDaysDefault', 'QuoteValidityDays', 'LateInterestPctMonth', 'OffHireNoticeDays', 'PartPeriodRule', 'HirePeriodDays'].map(function (k) { return String(S(db, k, '')); });
  var f = ['Rev', 'Status', 'QuoteType', 'CustID', 'SiteID', 'QuoteDate', 'PreparedBy', 'AdvancePct', 'MinMonths', 'PaymentDays', 'ValidityDays', 'NoticeDays', 'LateInterestPct', 'PartPeriodRule', 'VATPct', 'ATPct', 'AITPct'].map(function (k) { var v = q[k]; return v instanceof Date ? v.getTime() : String(v == null ? '' : v); });
  var ov = oQOv_(db, no).map(function (o) { return [o.Action, o.ClauseID, o.Section, o.ClauseNo, o.Title, o.Text, o.SortOrder].map(String).join('\u0001'); });
  var base = QT_termsFor0_(db, type).map(function (r) { return [r.ClauseID, r.Section, r.ClauseNo, r.Title, r.Text, r.SortOrder].map(String).join('\u0001'); });
  var ln = oQLines_(db, no).map(function (l) { return [l.LineNo, l.ItemCode, l.Description, l.Unit, l.Qty, l.Months, l.Billing, l.Rate, l.Optional, l.Selected].map(String).join('\u0001'); });
  return oQHash_(JSON.stringify([f, String(cu.PaymentDays == null ? '' : cu.PaymentDays), j ? String(j.JobNo) : '', st, ov, base, ln]));
}
function oQTok_(s) { return String(s == null ? '' : s).replace(/\{\{(\w{1,31})\}\}/g, '{$1}'); } // sheet -> page
function oQUntok_(s, keys) { // page -> sheet; any other { } is refused
  var bad = false, out = String(s).replace(/\{([A-Za-z]\w{0,30})\}/g, function (m, k) { if (keys.indexOf(k) < 0) { bad = true; return m; } return '{{' + k + '}}'; });
  if (bad || /[{}]/.test(out.replace(/\{\{[A-Za-z]\w{0,30}\}\}/g, ''))) return null;
  return out;
}
function oQClauseText_(v) { // one clause: 1..1000 chars, no control chars, at least one letter / digit; newlines kept as spaces
  if (typeof v !== 'string' || v.length > 4000) return '';
  var s = v.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, '').replace(/\p{Cf}/gu, '').replace(/(\p{M}{2})\p{M}+/gu, '$1').replace(/[ \t]+/g, ' ').trim();
  return s.length <= 1000 && /[\p{L}\p{N}]/u.test(s) ? s : '';
}
function oQRaw_(v) { var s = oUncell_(v); return s ? "'" + s : ''; } // CR run 17: a stored cell put back as it was (text mark, no trim)
function oQCell_(v) { var s = String(v == null ? '' : v).trim(); return s ? "'" + s : ''; } // always text in the sheet (no formula, no date / number guess)
function oQFill_(s) { var m = String(s).match(OQ_PH_); return m ? m.length : 0; }
// the terms as the page shows them + what qtSave_ needs to write them back
function oQTerms_(db, q, C) { // C (list only): {base: {type: rows}, ov: {no: rows}} read once for all quotes, no tokens
  var no = q.QuoteNo, type = oQType_(q), std = qtStd_(db, q), tok = C ? {} : quoteTokens(db, q), by = {};
  var base = C ? (C.base[type] = C.base[type] || QT_termsFor0_(db, type)) : QT_termsFor0_(db, type);
  var ov = C ? (C.ov[String(no)] || []).slice().sort(function (a, b) { return num(a.SortOrder) - num(b.SortOrder); }) : oQOv_(db, no);
  ov = ov.filter(function (o) { return o.Action === 'Remove' || !blank(o.Text) && String(o.Text).trim() !== ''; }); // a blank Replace / Add row = standard (QT1 refuses empty wording)
  ov.forEach(function (o) { if (o.Action !== 'Add' && !blank(o.ClauseID)) by[String(o.ClauseID)] = o; });
  var vars = qtFieldsFor_(type).map(function (f) {
    var k = f[0], cur = qtCustom_(f, q, std), lim = OQ_LIM_[k];
    var v = { k: OQ_TOK_[k], field: k, label: f[1], unit: f[3] === 'rule' ? '' : f[2].trim(), kind: f[3] === 'rule' ? 'pick' : 'num', std: qtShow_(f, std[k][0]),
      from: /^customer/.test(std[k][1]) ? 'Customer' : 'Company settings', value: cur === '' ? null : cur, tok: String(tok[OQ_TOK_[k]] == null ? '' : tok[OQ_TOK_[k]]) };
    if (v.kind === 'pick') v.opts = QT_RULES_.slice(); else { v.min = lim[0]; v.max = lim[1]; }
    return v;
  });
  var keys = vars.map(function (v) { return v.k; }), seen = {};
  Object.keys(tok).forEach(function (k) { if (keys.indexOf(k) < 0 && /^[A-Za-z]\w{0,30}$/.test(k)) { vars.push({ k: k, label: OQ_FIXED_[k] || k, unit: '', kind: 'fixed', std: '', from: 'Company settings', value: null, tok: String(tok[k]) }); keys.push(k); } });
  if (!C) base.concat(ov).forEach(function (r) { String(r.Text || '').replace(/\{\{([A-Za-z]\w{0,30})\}\}/g, function (m, k) { // a token the PDF does not know stays as it is
    if (keys.indexOf(k) < 0) { vars.push({ k: k, label: k, unit: '', kind: 'fixed', std: '', from: 'Company settings', value: null, tok: m }); keys.push(k); } return m; }); });
  var secs = [], sOf = {}, special = qtSections_(base, []).special;
  base.forEach(function (r) {
    var s = String(r.Section);
    if (!seen[s]) { seen[s] = 1; sOf[s] = secs.length; secs.push({ no: s, t: String(r.SectionTitle || ''), cl: [] }); }
    var o = by[String(r.ClauseID)], st = !o ? 'std' : o.Action === 'Remove' ? 'removed' : 'changed';
    secs[sOf[s]].cl.push({ id: String(r.ClauseID), no: String(r.ClauseNo), title: String(r.Title || ''), text: oQTok_(st === 'changed' ? o.Text : r.Text), std: oQTok_(r.Text), st: st });
  });
  var nBase = secs.length, added = ov.filter(function (o) { return o.Action === 'Add'; });
  added.forEach(function (o, i) {
    var s = seen[String(o.Section)] ? String(o.Section) : special;
    if (sOf[s] == null) { sOf[s] = secs.length; secs.push({ no: s, t: QT_SPECIAL_, cl: [], special: true }); }
    secs[sOf[s]].cl.push({ id: 'A' + i, no: String(o.ClauseNo), title: String(o.Title || ''), text: oQTok_(o.Text), std: '', st: 'added' });
  });
  var fill = 0, changed = ov.length;
  vars.forEach(function (v) { if (v.kind !== 'fixed' && v.value !== null) changed++; });
  secs.forEach(function (s) { s.cl.forEach(function (c) { if (c.st !== 'removed') fill += oQFill_(c.text); }); });
  return { view: { set: type, vars: vars, secs: secs }, fill: fill, changed: changed, keys: keys, nBase: nBase, base: base, by: by, added: added, special: special, std: std, ov: ov };
}
// PDF version = hash of the quote PDF spec (everything printed: lines, terms, customer, site, company, footer) + [ ] left in it
function oQPdfVer_(db, no) {
  var sp = PDF_SPECS.Quote(db, no), j = JSON.stringify({ b: sp.blocks, c: sp.docCtl || '', f: sp.file || '' });
  var left = (JSON.stringify(sp.blocks).match(/\[[^\]"]*\]/g) || []).filter(function (x) { return !/^\[(to fill in Settings|verify with accountant)\]$/.test(x); }).length;
  return { v: oQHash_(j), left: left };
}
function oQFid_(u) { var m = String(u || '').match(/\/d\/([\w-]{6,})/) || String(u || '').match(/[?&]id=([\w-]{6,})/); return m ? m[1] : String(u || ''); }
// the stored PDF is current unless it was made here (OQP:<no> = {v, f}) and the quote changed since. A PDF made elsewhere
// (sheet panel: QF5 remakes it on every save) is trusted.
function oQPdfFresh_(env, q, ver, okNi) { // okNi: a PDF made without the images (export fallback) counts as current
  if (blank(q.PDF)) return '';
  var p = env.get('OQP:' + q.QuoteNo), fid = oQFid_(q.PDF);
  if (!p || p.f !== fid) { var pn = env.get('OQPN:' + q.QuoteNo); if (pn && pn.f === fid) p = pn; } // CR run 13: an office PDF whose link write threw yet went in
  if (!p || p.f !== fid) return String(q.PDF);
  if (p.v !== ver) return '';
  return p.ni && !okNi && env.now() - (+p.at || 0) > 600000 * Math.pow(2, Math.min(+p.k || 0, 7)) ? '' : String(q.PDF); // CR4: tried again with images after 10 min, 20, 40 ... (max ~21 h)
}
// CR7: an edit here makes a PDF from elsewhere (panel, no OQP record) out of date: the next Open / Save & make PDF makes a new one
var OQ_SENT_ = false; // CR15: set once Gmail has taken the message (QF3 send)
if (typeof qf3Mail_ === 'function' && !qf3Mail_.officeMk_) {
  var OQ_mail0_ = qf3Mail_;
  qf3Mail_ = function () {
    var m = OQ_mail0_.apply(this, arguments); if (!m || typeof m.send !== 'function') return m;
    var w = Object.create(m); w.send = function () { var r = m.send.apply(m, arguments); OQ_SENT_ = true; return r; }; return w;
  };
  qf3Mail_.officeMk_ = OQ_mail0_;
}
function oQPdfStale_(env, db, no, nb) { // nb: the caller counted the change already (oPeBump_). true = it has a PDF (marked old)
  if (!nb) oPeBump_(env, [no]);
  var q = find(db.rows('Quotes'), 'QuoteNo', no), u = oPdfNow_(db, 'Quotes', q); if (!u) return false; // the cell as it is now (CR run 3)
  var p = env.get('OQP:' + no); if (!p || p.f !== oQFid_(u)) env.put('OQP:' + no, { v: 0, f: oQFid_(u) });
  return true;
}
// CR10: a Sent quote whose edited lines were saved but whose Rev +1 / Draft was not written: completed on the next action
// CR15: an email that went out while its recording failed (OQES nr) is recorded here: Sent + SentAt + Log.
function oQRevFix_(env, db, no) {
  var k = 'OQRV:' + no, p = env.get(k), rk = 'OQES:' + no, rc = env.get(rk), q = (p || rc) ? find(db.rows('Quotes'), 'QuoteNo', no) : null;
  if (p) {
    if (q && String(q.Status) === 'Sent' && num(q.Rev) < num(p.rev) && env.now() - (+p.at || 0) < 864e5) {
      oPeBump_(env, [no]); uiPutRow_(db, 'Quotes', q, { Rev: num(p.rev), Status: 'Draft' }); oQPdfStale_(env, db, no, true); // CR run 4: counted before the write
      try { log_(db, 'Quote revised', no, 'Rev ' + num(p.rev) + ' (edited in the web app; completed)'); } catch (e) { /* log only */ }
    }
    env.del(k);
  }
  if (rc && rc.nr && !rc.done) {
    if (q && (blank(q.Status) || String(q.Status) === 'Draft')) {
      var pt = { Status: 'Sent' }; if (db.headers('Quotes').indexOf('SentAt') >= 0) pt.SentAt = new Date(+rc.at || env.now());
      uiPutRow_(db, 'Quotes', q, pt);
      try { log_(db, 'Quote emailed', no, 'recorded later (the send went out, its recording had failed)' + (rc.by ? ' · ' + rc.by : '')); } catch (e) { /* log only */ }
    }
    rc.done = 1; env.put(rk, rc);
  }
  if (rc && env.now() - (+rc.at || 0) > 600000 && (!rc.nr || rc.done)) env.del(rk); // receipts are kept 10 min only
}
function oQView_(db, env, q, L) {
  var a = oAcc_(L), M = oCanSeeMoney_(a), no = q.QuoteNo, cu = find(db.rows('Customers'), 'CustID', q.CustID) || {}, site = blank(q.SiteID) ? null : find(db.rows('Sites'), 'SiteID', q.SiteID);
  var T = oQTerms_(db, q), tv = oQTv_(db, q), job = oQJob_(db, no), items = {}, t = M ? quoteTotals(db, no) : null, pv = oQPdfVer_(db, no);
  db.rows('Items').forEach(function (i) { items[String(i.ItemCode)] = i; });
  var stf = blank(q.PreparedBy) ? null : find(db.rows('Staff'), 'StaffID', q.PreparedBy), d0 = oQDn_(q.QuoteDate);
  var vd = qtHas_(q, 'ValidityDays') ? num(q.ValidityDays) : num(S(db, 'QuoteValidityDays', 30));
  var lines = oQLines_(db, no).map(function (l, i) {
    var it = items[String(l.ItemCode)] || {}, dim = typeof qfDimTxt_ === 'function' ? qfDimTxt_(l) : '';
    var o = { n: num(l.LineNo) || i + 1, desc: String(l.Description || it.Name || ''), size: dim || String(it.Size == null ? '' : it.Size), unit: String(l.Unit || ''), qty: num(l.Qty),
      months: blank(l.Months) ? '' : num(l.Months), billing: String(l.Billing || ''), optional: l.Optional === 'Yes', selected: l.Selected === 'Yes' };
    if (M) { o.rate = num(l.Rate); o.amount = lineAmt(l); }
    return o;
  });
  return {
    no: no, rev: num(q.Rev), date: oQDay_(d0), type: oQType_(q), status: String(q.Status || 'Draft'),
    cust: String(cu.Name || q.CustID || ''), contact: String(q.Attention || cu.ContactPerson || ''), phone: String(cu.Phone || ''), email: String(cu.Email || ''),
    project: site && !blank(site.Project) ? String(site.Project) : String(q.Subject || ''), site: site ? String(site.Address || '') : '', subject: String(q.Subject || ''),
    job: job ? String(job.JobNo) : '', preparedBy: stf ? String(stf.Name || '') : String(q.PreparedBy || ''), valid: d0 == null ? '' : oQDay_(d0 + vd),
    pdf: oQPdfFresh_(env, q, pv.v, true) || (oQLocked_(db, q) ? String(q.PDF || '') : ''), myEmail: String(L.email), tv: tv, money: M, can: oQCan_(a), locked: oQLocked_(db, q), lines: lines,
    tot: t ? { sub: t.subtotal, vatPct: r2(num(t.vatPct) * 100), vat: t.vat, atPct: r2(num(t.atPct) * 100), at: t.at || 0, aitPct: r2(num(t.aitPct) * 100), ait: t.ait || 0,
      total: t.total, advPct: r2(num(t.advancePct) * 100), advance: t.advance, words: typeof qf4Words_ === 'function' ? qf4Words_(t.total) : takaWords(t.total) } : null,
    terms: T.view, fill: T.fill, changed: T.changed
  };
}
function oQCan_(a) { return oIsDir_(a) || (a.SC || 0) >= 2; }
function officeQuoteList(token) {
  var L = officeGate_(token, OQ_NEED_), a = oAcc_(L), M = oCanSeeMoney_(a), env = oEnv_(), db = env.db();
  if (!db) oFail_('BUSY');
  var cus = {}, sites = {}, jobs = {};
  db.rows('Customers').forEach(function (c) { cus[String(c.CustID)] = c; });
  db.rows('Sites').forEach(function (s) { sites[String(s.SiteID)] = s; });
  db.rows('Jobs').forEach(function (j) { if (!blank(j.QuoteNo) && !jobs[String(j.QuoteNo)]) jobs[String(j.QuoteNo)] = String(j.JobNo); });
  var C = { base: {}, ov: {} };
  if (db.hasTab('QuoteTerms')) db.rows('QuoteTerms').forEach(function (o) { var k = String(o.QuoteNo); (C.ov[k] = C.ov[k] || []).push(o); });
  var rows = db.rows('Quotes').filter(function (q) { return oQNo_(String(q.QuoteNo)); }).map(function (q) {
    var no = String(q.QuoteNo), s = blank(q.SiteID) ? null : sites[String(q.SiteID)], d0 = oQDn_(q.QuoteDate), T = null;
    try { T = oQTerms_(db, q, C); } catch (e) { T = { fill: 0, changed: 0 }; }
    var vd = qtHas_(q, 'ValidityDays') ? num(q.ValidityDays) : num(S(db, 'QuoteValidityDays', 30)), o = {
      no: no, rev: num(q.Rev), date: oQDay_(d0), type: oQType_(q), status: String(q.Status || 'Draft'),
      cust: String((cus[String(q.CustID)] || {}).Name || q.CustID || ''), project: s && !blank(s.Project) ? String(s.Project) : String(q.Subject || ''),
      valid: d0 == null ? '' : oQDay_(d0 + vd), job: jobs[no] || '', pdf: !blank(q.PDF), fill: T.fill, changed: T.changed };
    if (M) { try { o.total = typeof q.Total === 'number' && isFinite(q.Total) ? q.Total : quoteTotals(db, no).total; } catch (e) { o.total = null; } } // Total = sheet formula
    return o;
  });
  return { can: oQCan_(a), money: M, rows: rows };
}
function officeQuoteGet(token, no) {
  var L = officeGate_(token, OQ_NEED_), env = oEnv_(), db = env.db();
  if (!db) oFail_('BUSY');
  return oQView_(db, env, oQRow_(db, no), L);
}
// write: gate before (strangers / viewers never wait) and again inside the lock; the sheet is read fresh inside the lock
function oQW_(token, fn) {
  var env = oEnv_(), pre = officeGate_(token, OQ_NEED_);
  if (!oQCan_(oAcc_(pre))) oFail_('NOACCESS');
  return env.lock(function () {
    var L = officeGate_(token, OQ_NEED_);
    if (!oQCan_(oAcc_(L))) oFail_('NOACCESS');
    var db = env.db(); if (!db) oFail_('BUSY');
    var prev = OQ_ACT_; OQ_ACT_ = 'office:' + L.email;
    try { return fn(env, db, L); } finally { OQ_ACT_ = prev; }
  });
}
// op = {k:'var', key, value|null} | {k:'clause', id, text | reset | remove | back} | {k:'add', sec (index, -1 = special), text} | {k:'resetAll'}
function officeQuoteTerm(token, no, tv, op) {
  officeGate_(token, OQ_NEED_);
  return oQW_(token, function (env, db, L) {
    var q = oQRow_(db, no); oQRevFix_(env, db, q.QuoteNo); q = oQRow_(db, no);
    if (oQLocked_(db, q)) oFail_('QLOCKED');
    if (typeof tv !== 'number' || tv !== oQTv_(db, q)) oFail_('STALE');
    var pb = oUncell_(q.PreparedBy).trim(); // D2: the preparer signs the PDF -> only they (or a Director) change the terms
    if (pb && !oIsDir_(oAcc_(L)) && pb !== String(L.staff || '')) oFail_('QPREP');
    if (!op || typeof op !== 'object' || Array.isArray(op)) oFail_('BADINPUT|change');
    var T = oQTerms_(db, q), type = oQType_(q), fields = qtFieldsFor_(type), set = {}, cls = [], add = [];
    fields.forEach(function (f) { set[f[0]] = qtCustom_(f, q, T.std); });
    // qtSave_ writes every row of the quote again: texts read back from the sheet get their text mark again (no formula ever)
    T.base.forEach(function (r) { var o = T.by[String(r.ClauseID)]; if (o) cls.push(o.Action === 'Remove' ? { id: String(r.ClauseID), mode: 'remove' } : { id: String(r.ClauseID), mode: 'edit', text: oQCell_(o.Text) }); });
    T.ov.filter(function (o) { return o.Action === 'Add'; }).forEach(function (o) { add.push({ section: String(o.Section), title: oQCell_(o.Title), text: oQCell_(o.Text) }); });
    var stdOf = function (id) { var r = T.base.filter(function (x) { return String(x.ClauseID) === id; })[0]; return r ? String(r.Text).trim() : null; };
    var txt = function (s) { var c = oQClauseText_(s); if (!c) oFail_('BADINPUT|wording'); var u = oQUntok_(c, T.keys); if (u === null) oFail_('BADINPUT|wording'); return u; };
    var cid = function () { var id = typeof op.id === 'string' ? op.id : ''; if (/^A\d{1,3}$/.test(id) && +id.slice(1) < add.length) return { added: +id.slice(1) };
      if (id && T.base.some(function (r) { return String(r.ClauseID) === id; })) return { base: id }; oFail_('NOTFOUND'); };
    var mine = function (id) { for (var i = 0; i < cls.length; i++) if (cls[i].id === id) return i; return -1; };
    if (op.k === 'var') {
      var f = fields.filter(function (x) { return OQ_TOK_[x[0]] === op.key; })[0]; if (!f) oFail_('BADINPUT|field');
      if (op.value === null) set[f[0]] = '';
      else if (f[3] === 'rule') { if (QT_RULES_.indexOf(op.value) < 0) oFail_('BADINPUT|' + f[1]); set[f[0]] = op.value; }
      else { var lim = OQ_LIM_[f[0]], n = op.value; if (typeof n !== 'number' || !isFinite(n) || n < lim[0] || n > lim[1] || (f[3] === 'int' && n !== Math.floor(n)) || Math.abs(Math.round(n * 100) - n * 100) > 1e-6) oFail_('BADINPUT|' + f[1]); set[f[0]] = String(n); }
    } else if (op.k === 'clause') {
      var w = cid(), i = w.base ? mine(w.base) : -1, cur = w.base ? (i < 0 ? 'std' : cls[i].mode) : 'added';
      if (op.reset === true) { if (w.added != null) oFail_('BADINPUT|clause'); if (i >= 0) cls.splice(i, 1); }
      else if (op.remove === true) { if (w.added != null) add.splice(w.added, 1); else if (i >= 0) cls[i] = { id: w.base, mode: 'remove' }; else cls.push({ id: w.base, mode: 'remove' }); }
      else if (op.back === true) { if (cur !== 'remove') oFail_('BADINPUT|clause'); cls.splice(i, 1); }
      else { if (cur === 'remove') oFail_('BADINPUT|clause'); var t2 = txt(op.text);
        if (w.added != null) add[w.added].text = oQCell_(t2);
        else if (t2 === stdOf(w.base)) { if (i >= 0) cls.splice(i, 1); } // same as the standard = standard
        else if (i >= 0) cls[i].text = oQCell_(t2); else cls.push({ id: w.base, mode: 'edit', text: oQCell_(t2) }); }
    } else if (op.k === 'add') {
      if (add.length >= 40) oFail_('BADINPUT|clause');
      var si = op.sec, sec = si === -1 ? T.special : (typeof si === 'number' && si >= 0 && si === Math.floor(si) && si < T.view.secs.length ? T.view.secs[si].no : null);
      if (sec === null) oFail_('BADINPUT|section');
      add.push({ section: sec, title: '', text: oQCell_(txt(op.text)) });
    } else if (op.k === 'resetAll') { Object.keys(set).forEach(function (k) { set[k] = ''; }); cls = []; add = []; }
    else oFail_('BADINPUT|change');
    // qtSave_ deletes this quote's QuoteTerms rows and writes them again: if the sheet fails in between, the old rows go back
    var raw = qtRows_(db, q.QuoteNo), keep = raw.map(function (o) { /* CR run 16: all stored rows (T.ov leaves out blank ones) */ var x = {}; QT_HEAD_.forEach(function (k) { x[k] = o[k]; }); x.Title = oQRaw_(o.Title); x.Text = oQRaw_(o.Text); return x; });
    var hd = db.headers('Quotes'), h0 = {}; // CR16: qtSave_ writes the quote row first; on a failure it goes back too
    qtFieldsFor_(oQType_(q)).forEach(function (f) { if (hd.indexOf(f[0]) >= 0) h0[f[0]] = q[f[0]] == null ? '' : q[f[0]]; });
    oPeBump_(env, [String(q.QuoteNo)]); // CR run 4: counted before qtSave_ writes (a sheet-panel PDF made meanwhile does not keep its link)
    try { qtSave_(db, { quoteNo: q.QuoteNo, settings: set, clauses: cls, added: add }); }
    catch (e) {
      try { var d2 = env.db() || db; uiPutRow_(d2, 'Quotes', oQRow_(d2, q.QuoteNo), h0); } catch (e1) { /* the error below says try again */ }
      try { var d3 = env.db() || db, left = qtRows_(d3, q.QuoteNo); if (oQtSig_(left) !== oQtSig_(raw)) { uiDelRows_(d3, 'QuoteTerms', left); if (keep.length) d3.insert('QuoteTerms', keep); } } catch (e2) { /* the error below says try again */ } // CR run 15: also a part delete / part write
      oFail_('BUSY');
    }
    oQPdfStale_(env, env.db() || db, q.QuoteNo, true);
    var fresh = env.db() || db; // the sheet as it is now (a row cache can still hold the text marks)
    return oQView_(fresh, env, oQRow_(fresh, no), L);
  });
}
// PDF: the stored one while it is current; a locked quote (job, Accepted / Lost ...) never gets a new one; only SC Staff+ make one.
// Made outside the script lock (a PDF takes ~10 s); one make per quote at a time (BUSY, flag set under the lock).
function oQPdfMake_(env, db, q) { // -> {url, made}
  var key = 'OQPB:' + q.QuoteNo, tok = env.rand().slice(0, 24), hold = {}; // CR12: a lease in Script Properties with an owner token
  try { // CR run 9: the lease is taken inside the try: a failure after it went in (the flush when the lock is let go) lets it go again (owner token checked)
    var d0 = db; // CR run 10: read again once the lease is held (an edit saved after the click is in the render and its fingerprint: no needless BUSY)
    env.lock(function () { var l = env.get(key); if (l && +l.u > env.now()) oFail_('BUSY'); d0 = env.db() || db; oQRevFix_(env, d0, q.QuoteNo); // CR run 8: the revision fix before the lease: a failing fix leaves no lease (no BUSY for 6 min)
      var q1 = find(d0.rows('Quotes'), 'QuoteNo', q.QuoteNo); if (q1 && oQLocked_(d0, q1)) { if (blank(q1.PDF)) oFail_('PDFLOCK'); /* CR run 15: locked with no PDF: none made */ hold.keep = String(q1.PDF); return; } // CR run 14: locked since the click: its PDF stays
      env.put(key, { t: tok, u: env.now() + 360000 }); });
    if (hold.keep) return { url: hold.keep, made: false };
    var v = oQPdfVer_(d0, q.QuoteNo).v, st = QF5_STUB_ || {}, r; OSG_FELL_ = false; // CR8: the fingerprint of the spec this PDF is made from
    try { r = qf5Pdf_(d0, q.QuoteNo, { drive: st.drive, make: function (d, w, n) { var k0 = OPDF_BIN_, bin = OPDF_BIN_ = [], r0; try { r0 = (st.make || makePdf)(d, w, n, { noLink: true }); } finally { OPDF_BIN_ = k0; } oQPdfLinkIf_(env, d, n, r0, v, bin, hold); return r0; } }); }
    catch (e) { if (hold.keep) return { url: hold.keep, made: false }; throw e; } // CR run 14: locked during the render (oQPdfLinkIf_: new files binned, BUSY): qf5Pdf_ binned nothing
    var f = oQFid_(r.url); // CR run 15: the record becomes final holding the script lock, only while it is as this run's publication
    // left it (an out-of-date mark or another office PDF since keeps its own; records are per file, so a newer panel link is not affected)
    if (hold.pub != null) try { oScrLock_(function () { var pn = env.get('OQPN:' + q.QuoteNo);
      if (pn && pn.f === f && JSON.stringify(env.get('OQP:' + q.QuoteNo) || null) === hold.pub) { env.put('OQP:' + q.QuoteNo, oQPdfRec_(env, q.QuoteNo, v, f)); env.del('OQPN:' + q.QuoteNo); } }); } catch (e) { /* the pending record stands for this file (oQPdfFresh_) */ }
    return { url: String(r.url), made: true };
  } finally {
    OSG_FELL_ = false;
    var rel = function () { var l = env.get(key); if (l && l.t === tok) env.del(key); };
    try { env.lock(rel); } catch (e) { try { rel(); } catch (e2) { /* the lease runs out by itself */ } }
  }
}
// CR run 8: the link goes in only if the quote still prints as this PDF was made (read again from the sheet, holding the script lock: a save
// during the ~10 s render found no new link to mark old). Otherwise no link, the new file to the bin, BUSY (try again: made from the new data).
// CR run 9: the row is found again in that fresh read (rows can move during the render); bin = the old same-named copies makePdf listed
// (OPDF_BIN_): they go to the bin only once the new link is in, so a refused PDF leaves the cell's link still opening.
function oQtSig_(a) { return a.map(function (o) { return JSON.stringify(['ClauseID', 'Action', 'Section', 'ClauseNo', 'Title', 'Text', 'SortOrder'].map(function (k) { return oUncell_(o[k]); })); }).sort().join('\n'); } // CR run 15: a quote's override rows, order-free
function oQPdfRec_(env, no, v, f) { var p0 = env.get('OQP:' + no), k = p0 && p0.ni ? (+p0.k || 0) + 1 : 0; return OSG_FELL_ ? { v: v, f: f, ni: 1, at: env.now(), k: k } : { v: v, f: f }; } // CR4: made without the images
function oQPnUp_(env, no, cur) { var pn = env.get('OQPN:' + no); if (pn && pn.f && pn.f === oQFid_(cur)) env.put('OQP:' + no, pn); } // CR run 14: the cell's file keeps its record before the next pending one
function oQPdfLinkIf_(env, d, no, r0, v, bin, hold) { // hold.keep: the quote got locked (its PDF stays)
  var ok = false, pub = false, wr = false, lk = false, url = String(r0 && r0.url || ''), ids = oPdfIds_(r0); // CR run 10: pub = the link went in (only then the old copies go)
  var drop = function () { ids.forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* an unlinked copy may stay */ } }); };
  try {
    oScrLock_(function () {
      var d1 = env.db() || d, r = find(d1.rows('Quotes'), 'QuoteNo', no); ok = !!url && oQPdfVer_(d1, no).v === v; // CR run 16: the lock rule first (also when the print changed)
      if (r && oQLocked_(d1, r)) { ok = false; if (blank(r.PDF)) lk = true; else if (hold) hold.keep = String(r.PDF); } else if (ok && r && d1.headers('Quotes').indexOf('PDF') >= 0) { if (oPdfNewer_(r.PDF, url)) ok = false; else { oQPnUp_(env, no, r.PDF); env.put('OQPN:' + no, oQPdfRec_(env, no, v, oQFid_(url))); wr = true; d1.update('Quotes', r, { PDF: url }); pub = true; if (hold) hold.pub = JSON.stringify(env.get('OQP:' + no) || null); } } // CR run 13: pending fingerprint first (a write that threw yet went in)
    });
  } catch (e) { if (!wr) drop(); throw e; } // CR run 12: lock refused (BUSY) / the fresh read failed: nothing linked -> the new files go; the write or the flush threw (the link may be in) -> both kept
  if (pub) { oBinNow_(bin, ids); return; }
  if (ok) return; // no PDF column / no row: nothing to link, the old same-named copies kept
  drop();
  oFail_(lk ? 'PDFLOCK' : 'BUSY'); // CR run 15: locked during the render, no PDF to keep
}
function oQPdfUse_(env, db, q, L) { // -> {url, made}
  var stored = String(q.PDF || ''), fresh = oQPdfFresh_(env, q, oQPdfVer_(db, q.QuoteNo).v);
  if (fresh) return { url: fresh, made: false };
  if (stored && (oQLocked_(db, q) || !oQCan_(oAcc_(L)))) return { url: stored, made: false };
  if (!oQCan_(oAcc_(L))) oFail_('NOPDF');
  var prev = OQ_ACT_; OQ_ACT_ = 'office:' + L.email;
  try { return oQPdfMake_(env, db, q); } finally { OQ_ACT_ = prev; }
}
function officeQuotePdf(token, no) {
  var L = officeGate_(token, OQ_NEED_), env = oEnv_(), db = env.db();
  if (!db) oFail_('BUSY');
  return oQPdfUse_(env, db, oQRow_(db, no), L);
}
// o = {to, cc, note}. Checks first (nothing sent on a refusal), a fresh PDF, then QF3 sends + Draft -> Sent + Log.
function officeQuoteEmail(token, no, tv, o) {
  var L = officeGate_(token, OQ_NEED_), env = oEnv_(), L0 = L;
  if (!oQCan_(oAcc_(L0))) oFail_('NOACCESS');
  o = o && typeof o === 'object' && !Array.isArray(o) ? o : {};
  var list = function (s, what) { if (s != null && typeof s !== 'string') oFail_('BADINPUT|' + what); var a = qf3List_(String(s || '').slice(0, 2000)).map(function (x) { return x.toLowerCase(); });
    if (a.length > 10 || !a.every(function (x) { return x.length <= 120 && QF3_RE_.test(x); })) oFail_('BADINPUT|' + what); return a; };
  var to = list(o.to, 'to'), cc = list(o.cc, 'cc'), note = o.note == null ? '' : o.note;
  if (!to.length) oFail_('BADINPUT|to');
  if (typeof note !== 'string' || note.length > 2000) oFail_('BADINPUT|message');
  note = note.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim();
  var check = function (db, env3) {
    var q = oQRow_(db, no);
    if (env3) { // CR15: durable receipt when the recording of a send failed (10 min); then pending fixes
      var rc = env3.get('OQES:' + q.QuoteNo);
      var held = env3.cget('OQE:' + q.QuoteNo) || (rc && env3.now() - (+rc.at || 0) < 600000);
      oQRevFix_(env3, db, q.QuoteNo); q = oQRow_(db, no);
      if (held) oFail_('SENTNOW'); // a second click / another person a moment ago (an unrecorded send is recorded first)
    }
    if (OQ_CLOSED_.indexOf(String(q.Status)) >= 0) oFail_('QSTATE|' + String(q.Status));
    if (typeof tv !== 'number' || tv !== oQTv_(db, q)) oFail_('STALE');
    var n = oQPdfVer_(db, q.QuoteNo).left; if (n && q.Status !== 'Accepted') oFail_('TOFILL|' + n); // as the PDF counts them
    return q;
  };
  var db0 = env.db(); if (!db0) oFail_('BUSY');
  oQPdfUse_(env, db0, check(db0, null), L0);
  return oQW_(token, function (env2, db, L) {
    var q = check(db, env2), d = qf3Draft_(db, q.QuoteNo), sid = 'CO', ss = qf3Signers_(db).map(function (s) { return s.id; });
    var day = Math.floor((env2.now() + 216e5) / 864e5), mk = 'OQM:' + L.email, sent = env2.get(mk); // CR18: Dhaka day, Script Properties
    if (!sent || sent.d !== day) sent = { d: day, n: 0 };
    if (!oQPdfFresh_(env2, q, oQPdfVer_(db, q.QuoteNo).v, true) && !(oQLocked_(db, q) && !blank(q.PDF))) oFail_('STALE'); // changed while the PDF was made
    if (sent.n >= 30) oFail_('LIMIT'); // per login per day (Gmail quota)
    if (!blank(q.PreparedBy) && ss.indexOf(String(q.PreparedBy)) >= 0) sid = String(q.PreparedBy); else if (L.staff && ss.indexOf(String(L.staff)) >= 0) sid = String(L.staff);
    var body = d.body, cut = body.indexOf('\n\n');
    if (qtHas_(q, 'ValidityDays')) body = body.replace(/valid for \d+ days/, 'valid for ' + num(q.ValidityDays) + ' days'); // QF3 says the company default
    if (note) body = cut > 0 ? body.slice(0, cut) + '\n\n' + note + body.slice(cut) : note + '\n\n' + body;
    var was = String(q.Status || 'Draft');
    OQ_SENT_ = false;
    try { UI_ACTIONS_.emailQuote(db, { quoteNo: q.QuoteNo, to: to.join(', '), cc: cc.join(', '), subject: d.subject, body: body, signAs: sid }); }
    catch (e) {
      if (!OQ_SENT_) throw e; // Gmail did not take it: nothing went out
      env2.put('OQES:' + q.QuoteNo, { at: env2.now(), nr: 1, by: L.email }); env2.cput('OQE:' + q.QuoteNo, 1, 60); env2.put(mk, { d: day, n: sent.n + 1 });
      try { Logger.log('Quote ' + q.QuoteNo + ' emailed, recording failed: ' + (e && e.message)); } catch (x) { /* no log */ }
      oFail_('SENTNOREC');
    } finally { OQ_SENT_ = false; }
    env2.cput('OQE:' + q.QuoteNo, 1, 60); env2.put(mk, { d: day, n: sent.n + 1 });
    var d3 = env2.db() || db, q2 = oQRow_(d3, no);
    return { to: to, status: String(q2.Status), was: was };
  });
}

// ----------------------------------------------------------------- W4 new / edit quote (SC Staff+ or Director)
// officeQuoteForm(token, no)   everything the screen needs in one read: customers, projects, items (rates only with money
//                              clearance), sets (KitParts), staff, company rates, today and, for an edit, the quote + ev
//                              (= hash of the quote row + lines the form shows; officeQuoteSave says STALE when it changed).
// officeCustomerAdd(token, c)  registered at once. Same name (case, spaces, punctuation, Ltd / Co / PLC ... ignored), same
//                              phone (last 10 digits) or same email as a customer already there -> DUP|<CustID>|name|phone|email.
// officeSiteAdd(token, s)      same customer + project name + address as one already there -> DUP|<SiteID>|project.
// officeQuoteSave(token, d)    everything checked first, then the panel's own save (UI_ACTIONS_.saveQuoteFull: QF1b measures,
//                              QF4 rates, type guard) inside the script lock. The 7 columns: # Description Size Qty Unit Rate
//                              Amount; Amount = Qty x Rate. No new column: a "<unit> / month" line is stored as Unit (in Lists >
//                              Unit) + Billing Monthly + Months 1 (= one month's hire, as Months > 0 is the monthly flag
//                              everywhere and hire billing counts the months from the job dates); every other line One-off,
//                              Months blank. Lump sum = Qty 1, lot. Lines of the old format (Months other than 1, Milestone,
//                              stages) -> QOLD (edit those in the sheet panel). A Sent quote edited here becomes Rev n+1 and
//                              Draft (as Revise in the panel); its next PDF replaces the old one (QF5). Kept from the quote
//                              row on an edit: VAT / AT / AIT, YourRef, Notes, hire months. PDF (if asked) after the lock.
// Quote PDF: the price grid prints the same 7 columns; Size = the QF1b measure, else Items.Size.
// officeScopeItemsAdd (editor only, run once after install): the 5 Project scope Items rows (user OK 18 Nov).
var OQE_TYPES_ = ['Rental', 'Sale', 'Project'];
var OQE_MAXL_ = 200; // lines on one quote
var OQE_SCOPES_ = [['SV-EXT', 'External scaffold'], ['SV-INT', 'Internal scaffold'], ['SV-MOB', 'Mobile scaffold'], ['SV-ALU', 'Aluminium mobile scaffold'], ['SV-TWR', 'Tower scaffold']];
var OQE_SCOPE_CAT_ = 'Project scope';
var OQE_RATE_ = { n: 60, sec: 600 }; // writes per login per 10 min (customers, projects, quotes)
function oQeYes_(v) { return String(v) === 'Yes'; }
function oQeActive_(it) { var s = String(it.Status == null ? '' : it.Status).trim(); return s === '' || s === 'Active'; }
function oQeUnit_(u) { var s = String(u == null ? '' : u).trim(), m = s.match(/^(.*?)\s*\/\s*month$/i); return m ? { u: m[1].trim(), mo: true } : { u: s, mo: false }; }
function oQeKey_(v) {
  var s = oUncell_(v).normalize('NFC').toLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ').trim();
  var k = (' ' + s + ' ').replace(/ (the|ltd|limited|co|company|plc|pvt|private|inc|llc|corp|corporation)(?= )/g, ' ').replace(/\s+/g, '');
  return k || s.replace(/\s+/g, '');
}
function oQePhones_(v) { return oUncell_(v).split(/[,;\/]/).map(function (p) { var d = p.replace(/\D/g, ''); return d.length >= 7 ? d.slice(-10) : ''; }).filter(function (x) { return x; }); }
function oQeMails_(v) { return oUncell_(v).toLowerCase().split(/[,;\s]+/).filter(function (x) { return /^[^@]+@[^@]+$/.test(x); }); }
function oQeTxt_(v, max, what, need) { // one line of text: '' allowed unless need; any other shape / no letter or digit / too long -> BADINPUT
  if (v == null || (typeof v === 'string' && !v.trim())) { if (need) oFail_('BADINPUT|' + what); return ''; }
  if (typeof v !== 'string') oFail_('BADINPUT|' + what);
  var s = oText_(v, max); if (!s) oFail_('BADINPUT|' + what); return s;
}
function oQeDesc_(v, what) { // description: up to 500 chars, newlines kept (max 12 lines), each line cleaned like oText_
  if (typeof v !== 'string' || v.length > 2000) oFail_('BADINPUT|' + what);
  var parts = v.replace(/\r\n?/g, '\n').split('\n').map(function (x) { return x.trim() ? oText_(x, 500) : ''; });
  if (v.replace(/\r\n?/g, '\n').split('\n').some(function (x, i) { return x.trim() && !parts[i]; })) oFail_('BADINPUT|' + what);
  var s = parts.join('\n').replace(/\n{2,}/g, '\n').trim();
  if (!s || s.length > 500 || s.split('\n').length > 12) oFail_('BADINPUT|' + what);
  return s;
}
function oQeNum_(v, lo, hi, dp, what) { if (typeof v !== 'number' || !isFinite(v) || v < lo || v > hi || Math.abs(Math.round(v * Math.pow(10, dp)) - v * Math.pow(10, dp)) > 1e-6) oFail_('BADINPUT|' + what); return v; }
function oQeRate_(env, L) { // a flood of writes from one login is refused (SLOW); counted under the script lock
  var k = 'OQEW:' + L.email, c = env.cget(k), now = env.now();
  if (!c || now - c.t > OQE_RATE_.sec * 1000) c = { t: now, n: 0 };
  if (c.n >= OQE_RATE_.n) oFail_('SLOW');
  c.n++; env.cput(k, c, OQE_RATE_.sec);
}
function oQeCustOut_(c) { return { id: String(c.CustID), name: oUncell_(c.Name), contact: oUncell_(c.ContactPerson), phone: oUncell_(c.Phone), email: oUncell_(c.Email), address: oUncell_(c.Address) }; }
function oQeSiteOut_(s) { return { id: String(s.SiteID), cust: String(s.CustID), project: oUncell_(s.Project), address: oUncell_(s.Address) }; }
function oQeDupCust_(db, f, ex) { // -> [row, 'name' | 'phone' | 'email'] or null; ex = own CustID (an edit)
  var k = oQeKey_(f.name), ph = oQePhones_(f.phone), em = oQeMails_(f.email), hit = null;
  db.rows('Customers').some(function (r) {
    if (blank(r.CustID) || (ex && String(r.CustID) === ex)) return false;
    var w = k && oQeKey_(r.Name) === k ? 'name' : ph.length && oQePhones_(r.Phone).some(function (p) { return ph.indexOf(p) >= 0; }) ? 'phone'
      : em.length && oQeMails_(r.Email).some(function (e) { return em.indexOf(e) >= 0; }) ? 'email' : '';
    if (w) hit = [r, w];
    return !!w;
  });
  return hit;
}
function oQeDupSite_(db, cust, project, address, ex) { // ex = own SiteID (an edit)
  var p = oQeKey_(project), a = oQeKey_(address);
  return db.rows('Sites').filter(function (s) { return !blank(s.SiteID) && (!ex || String(s.SiteID) !== ex) && String(s.CustID) === cust && oQeKey_(s.Project) === p && oQeKey_(s.Address) === a; })[0] || null;
}
function oQeOldLine_(l) { var m = blank(l.Months) ? 0 : num(l.Months); return String(l.Billing) === 'Milestone' || (m !== 0 && m !== 1); }
function oQeOld_(db, no) { // lines the 7 columns can't show without changing the total -> edit in the sheet panel
  var n = oQLines_(db, no).filter(oQeOldLine_).length;
  if (!n && typeof milestoneRows === 'function' && milestoneRows(db, no).length) n = 1;
  if (n) oFail_('QOLD|' + n);
}
function oQeEv_(db, q) {
  var L = oQLines_(db, q.QuoteNo).map(function (l) { return [l.ItemCode, l.Description, l.Unit, l.Qty, l.Months, l.Billing, l.Rate, l.Optional, l.Selected, l.DimL, l.DimW, l.DimH, l.DimN, l.RateBasis].map(function (x) { return x instanceof Date ? x.getTime() : String(x == null ? '' : x); }); });
  var h = ['Rev', 'Status', 'QuoteType', 'CustID', 'SiteID', 'QuoteDate', 'AdvancePct', 'VATPct', 'Attention', 'Subject', 'PreparedBy', 'ValidityDays', 'YourRef', 'Notes'].map(function (k) { var x = q[k]; return x instanceof Date ? x.getTime() : String(x == null ? '' : x); });
  return oQHash_(JSON.stringify([h, L]));
}
function oQeSizeOf_(l, items) { var d = typeof qfDimTxt_ === 'function' ? qfDimTxt_(l) : '', it = items[String(l.ItemCode)]; return d || (it && !blank(it.Size) ? String(it.Size) : ''); }
function oQeSet_(db, q) { // company rates (a new quote) or the quote's own (an edit), in %
  var p = function (k, d) { return r2(num(q && !blank(q[k]) ? q[k] : S(db, k, d)) * 100); };
  return { vat: p('VATPct', 0.15), at: p('ATPct', 0), ait: p('AITPct', 0), adv: r2(num(S(db, 'AdvancePct', 0.5)) * 100), validDays: num(S(db, 'QuoteValidityDays', 30)) };
}
function officeQuoteForm(token, no) {
  var L = officeGate_(token, OQ_NEED_), a = oAcc_(L);
  if (!oQCan_(a)) oFail_('NOACCESS');
  var env = oEnv_(), db = env.db(); if (!db) oFail_('BUSY');
  var M = oCanSeeMoney_(a), q = null, items = {};
  if (no != null && no !== '') { q = oQRow_(db, no); if (oQLocked_(db, q)) oFail_('QLOCKED'); oQeOld_(db, q.QuoteNo); }
  db.rows('Items').forEach(function (i) { items[String(i.ItemCode)] = i; });
  var list = db.rows('Items').filter(function (i) { return !blank(i.ItemCode) && oQeActive_(i); }).map(function (i) {
    var o = { code: String(i.ItemCode), name: oUncell_(i.Name || i.ItemCode), cat: String(i.Category == null ? '' : i.Category).trim() || 'Other', size: blank(i.Size) ? '' : String(i.Size),
      unit: String(i.Unit || 'pc'), forSale: oQeYes_(i.ForSale), forHire: oQeYes_(i.ForHire), isSet: oQeYes_(i.IsSet) };
    if (M) { o.sale = num(i.SalePrice) > 0 ? num(i.SalePrice) : null; o.hire = num(i.HireRateMonth) > 0 ? num(i.HireRateMonth) : null; }
    return o;
  });
  var kits = {};
  list.forEach(function (i) { if (i.isSet && typeof kitParts_ === 'function') { try { kits[i.code] = kitParts_(db, i.code).map(function (p) { return [p.item, p.qty]; }); } catch (e) { /* a set without parts: no kit */ } } });
  var units = uiList_(db, 'Unit').map(String);
  var out = { money: M, today: oDayOf_(env.now()), myStaff: String(L.staff || ''), set: oQeSet_(db, q), units: units, items: list, kits: kits,
    customers: db.rows('Customers').filter(function (c) { return !blank(c.CustID) && (oCuSt_(c) === 'Active' || (q && String(c.CustID) === String(q.CustID))); }).map(oQeCustOut_), // M1: Inactive ones are not offered (an edit keeps its own)
    sites: db.rows('Sites').filter(function (s) { return !blank(s.SiteID); }).map(oQeSiteOut_),
    staff: db.rows('Staff').filter(function (s) { return !blank(s.StaffID) && !blank(s.Name); }).map(function (s) { return { id: String(s.StaffID), name: oUncell_(s.Name) }; }), quote: null };
  if (q) {
    var d0 = oQDn_(q.QuoteDate), vd = qtHas_(q, 'ValidityDays') ? num(q.ValidityDays) : out.set.validDays;
    out.quote = { no: String(q.QuoteNo), rev: num(q.Rev), status: String(q.Status || 'Draft'), type: oQType_(q) === 'Service' ? 'Project' : oQType_(q), cust: String(q.CustID || ''), site: String(q.SiteID || ''),
      attention: oUncell_(q.Attention), subject: oUncell_(q.Subject), date: oQDay_(d0), valid: d0 == null ? '' : oQDay_(d0 + vd), prep: String(q.PreparedBy || ''), adv: r2(num(q.AdvancePct) * 100), ev: oQeEv_(db, q), svc: oQType_(q) === 'Service',
      lines: oQLines_(db, q.QuoteNo).map(function (l) {
        var mo = num(l.Months) > 0, lump = String(l.RateBasis) === 'Lump sum', dim = !blank(l.DimL) || !blank(l.DimH);
        var o = { code: String(l.ItemCode || ''), desc: oUncell_(l.Description), size: oQeSizeOf_(l, items), qty: num(l.Qty), unit: String(l.Unit || '') + (mo ? ' / month' : ''),
          opt: l.Optional === 'Yes', chosen: l.Optional === 'Yes' && l.Selected === 'Yes', basis: lump ? 'lump' : 'unit', dim: dim && !lump ? { L: blank(l.DimL) ? '' : num(l.DimL), W: blank(l.DimW) ? '' : num(l.DimW), H: blank(l.DimH) ? '' : num(l.DimH), N: blank(l.DimN) ? '' : num(l.DimN) } : null };
        if (M) o.rate = num(l.Rate);
        return o;
      }) };
  }
  return out;
}
function officeCustomerAdd(token, c) {
  officeGate_(token, OQ_NEED_);
  return oQW_(token, function (env, db, L) {
    c = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
    var f = oCuF_(c);
    oQeRate_(env, L); // every try counts (a flood of refused tries too)
    oCuChk_(f);
    var dup = oQeDupCust_(db, f); if (dup) oFail_('DUP|' + dup[0].CustID + '|' + dup[1]);
    var cp; try { cp = qfCustPlan_(db, { mode: 'new', fields: oCuPatch_(f) }); }
    catch (e) { oFail_('BADINPUT|details'); }
    qfReadyUp_(db);
    var w = qfCustWrite_(db, cp);
    return oQeCustOut_(must(env.db() || db, 'Customers', 'CustID', w.id));
  });
}
function officeSiteAdd(token, s) {
  officeGate_(token, OQ_NEED_);
  return oQW_(token, function (env, db, L) {
    s = s && typeof s === 'object' && !Array.isArray(s) ? s : {};
    var cust = typeof s.cust === 'string' && s.cust ? find(db.rows('Customers'), 'CustID', s.cust) : null;
    if (!cust) oFail_('BADINPUT|customer');
    oQeRate_(env, L);
    var f = oSiF_(s);
    var dup = oQeDupSite_(db, String(cust.CustID), f.project, f.address); if (dup) oFail_('DUP|' + dup.SiteID + '|project');
    var sp; try { sp = qfSitePlan_(db, { mode: 'new', fields: oSiPatch_(f) }, { row: cust, patch: {} }); }
    catch (e) { oFail_('BADINPUT|details'); }
    qfReadyUp_(db);
    var w = qfSiteWrite_(db, sp, String(cust.CustID));
    return oQeSiteOut_(must(env.db() || db, 'Sites', 'SiteID', w.id));
  });
}
// ======================================================================= M1 customers & projects (SC)
function oCuSt_(c) { return String(c && c.Status == null ? '' : c.Status).trim() === 'Inactive' ? 'Inactive' : 'Active'; }
function oCuF_(c) { // the customer fields of the web forms, checked; absent = ''
  var f = { name: oQeTxt_(c.name, 120, 'name', true), contact: oQeTxt_(c.contact, 80, 'contact'), designation: oQeTxt_(c.designation, 80, 'designation'), phone: oQeTxt_(c.phone, 40, 'phone'),
    email: oQeTxt_(c.email, 160, 'email'), address: oQeTxt_(c.address, 200, 'address'), bin: oQeTxt_(c.bin, 40, 'BIN'), paymentDays: '' };
  var pd = c.paymentDays;
  if (pd != null && pd !== '') { if (typeof pd !== 'number' || !isFinite(pd) || pd < 0 || pd > 365 || Math.round(pd) !== pd) oFail_('BADINPUT|payment days'); f.paymentDays = pd; }
  return f;
}
function oCuChk_(f) {
  if (f.phone && (!/\d/.test(f.phone) || /[^\d\s+\-\/,().]/.test(f.phone) || !/^[\d+(]/.test(f.phone))) oFail_('BADINPUT|phone'); // +880... is kept as text by cellVal_
  if (f.email) { if (/(^|[,;]\s*)[=+\-@]/.test(f.email)) oFail_('BADINPUT|email'); try { f.email = qfEmail_(f.email); } catch (e) { oFail_('BADINPUT|email'); } if (f.email.length > 160) oFail_('BADINPUT|email'); }
}
function oCuPatch_(f) { // -> QF_CF_ keys (payment days '' = company default)
  return { name: oCell_(f.name), contact: oCell_(f.contact), designation: oCell_(f.designation), phone: f.phone, email: f.email, address: oCell_(f.address), bin: oCell_(f.bin), paymentDays: f.paymentDays === '' ? '' : String(f.paymentDays) };
}
function oSiF_(s) { // the project fields of the web forms, checked; absent = ''
  var f = { project: oQeTxt_(s.project, 120, 'project', true), address: oQeTxt_(s.address, 200, 'address'), siteRep: oQeTxt_(s.siteRep, 80, 'site rep'), siteRepPhone: oQeTxt_(s.siteRepPhone, 40, 'site rep phone'), startDate: '' };
  if (f.siteRepPhone && (!/\d/.test(f.siteRepPhone) || /[^\d\s+\-\/,().]/.test(f.siteRepPhone) || !/^[\d+(]/.test(f.siteRepPhone))) oFail_('BADINPUT|site rep phone');
  if (s.startDate != null && s.startDate !== '') { if (!oDayOk_(s.startDate)) oFail_('BADINPUT|start date'); f.startDate = s.startDate; }
  return f;
}
function oSiPatch_(f) { return { project: oCell_(f.project), address: oCell_(f.address), siteRep: oCell_(f.siteRep), siteRepPhone: f.siteRepPhone, startDate: f.startDate }; }
// CR-M1: ev = hash of the row as the form was opened (STALE when someone saved meanwhile); old panel PDFs of open quotes marked out of date
function oCuEv_(r, defs, ex) { return oQHash_(JSON.stringify(defs.map(function (d) { return d[1]; }).concat(ex || []).map(function (k) { var x = r[k]; return x instanceof Date ? x.getTime() : String(x == null ? '' : x); }))); }
function oCuPdfOld_(env, db, key, id) {
  var nos = db.rows('Quotes').filter(function (q) { return oQNo_(String(q.QuoteNo)) && String(q[key]) === id && !oQLocked_(db, q); }).map(function (q) { return String(q.QuoteNo); });
  oPeBump_(env, nos); nos.forEach(function (no) { oQPdfStale_(env, db, no, true); });
}
function oCuQTot_(db, q, no) { try { return typeof q.Total === 'number' && isFinite(q.Total) ? q.Total : quoteTotals(db, no).total; } catch (e) { return null; } } // Total = sheet formula
function officeCustList(token) {
  var L = officeGate_(token, OQ_NEED_), env = oEnv_(), db = env.db();
  if (!db) oFail_('BUSY');
  var ns = {}, pj = {}, nq = {}, lq = {};
  db.rows('Sites').forEach(function (s) { if (blank(s.SiteID)) return; var k = String(s.CustID); ns[k] = (ns[k] || 0) + 1; (pj[k] = pj[k] || []).push(oUncell_(s.Project)); });
  db.rows('Quotes').forEach(function (q) { if (!oQNo_(String(q.QuoteNo))) return; var k = String(q.CustID), d = oQDn_(q.QuoteDate); nq[k] = (nq[k] || 0) + 1; if (d != null && (lq[k] == null || d > lq[k])) lq[k] = d; });
  var rows = db.rows('Customers').filter(function (c) { return !blank(c.CustID); }).map(function (c) {
    var k = String(c.CustID), o = oQeCustOut_(c);
    o.status = oCuSt_(c); o.projects = pj[k] || []; o.sites = ns[k] || 0; o.quotes = nq[k] || 0; o.last = lq[k] == null ? '' : oQDay_(lq[k]);
    return o;
  });
  return { can: oQCan_(oAcc_(L)), rows: rows };
}
function officeCustGet(token, id) {
  var L = officeGate_(token, OQ_NEED_), a = oAcc_(L), M = oCanSeeMoney_(a), env = oEnv_(), db = env.db();
  if (!db) oFail_('BUSY');
  var c = typeof id === 'string' && id ? find(db.rows('Customers'), 'CustID', id) : null;
  if (!c || blank(c.CustID)) oFail_('NOTFOUND');
  var k = String(c.CustID), jobs = {}, sites = {}, sq = {};
  db.rows('Jobs').forEach(function (j) { if (!blank(j.QuoteNo) && !jobs[String(j.QuoteNo)]) jobs[String(j.QuoteNo)] = String(j.JobNo); });
  var ss = db.rows('Sites').filter(function (s) { return !blank(s.SiteID) && String(s.CustID) === k; });
  ss.forEach(function (s) { sites[String(s.SiteID)] = s; });
  var quotes = db.rows('Quotes').filter(function (q) { return oQNo_(String(q.QuoteNo)) && String(q.CustID) === k; }).map(function (q) {
    var no = String(q.QuoteNo), sid = blank(q.SiteID) ? '' : String(q.SiteID), s = sites[sid] || null;
    if (sid) sq[sid] = (sq[sid] || 0) + 1;
    var o = { no: no, date: oQDay_(oQDn_(q.QuoteDate)), project: s && !blank(s.Project) ? oUncell_(s.Project) : oUncell_(q.Subject), type: oQType_(q), status: String(q.Status || 'Draft'), job: jobs[no] || '' };
    if (M) o.total = oCuQTot_(db, q, no);
    return o;
  });
  var o = oQeCustOut_(c);
  o.designation = oUncell_(c.Designation); o.bin = oUncell_(c.BIN); o.paymentDays = blank(c.PaymentDays) ? '' : num(c.PaymentDays); o.status = oCuSt_(c);
  o.money = M; o.can = oQCan_(a); o.quotes = quotes; o.ev = oCuEv_(c, QF_CF_, ['Status']);
  o.sites = ss.map(function (s) {
    var x = oQeSiteOut_(s);
    x.siteRep = oUncell_(s.SiteRep); x.siteRepPhone = oUncell_(s.SiteRepPhone); x.start = oDay_(s.StartDate); x.status = String(s.Status || 'Planned'); x.quotes = sq[x.id] || 0; x.ev = oCuEv_(s, QF_SF_);
    return x;
  });
  return o;
}
// c = {id, ev, name, contact, designation, phone, email, address, bin, paymentDays, status: Active | Inactive}
function officeCustomerSave(token, c) {
  officeGate_(token, OQ_NEED_);
  return oQW_(token, function (env, db, L) {
    c = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
    var row = typeof c.id === 'string' && c.id ? find(db.rows('Customers'), 'CustID', c.id) : null;
    if (!row || blank(row.CustID)) oFail_('NOTFOUND');
    if (c.ev !== oCuEv_(row, QF_CF_, ['Status'])) oFail_('STALE');
    var f = oCuF_(c);
    if (c.status !== 'Active' && c.status !== 'Inactive') oFail_('BADINPUT|status');
    oQeRate_(env, L);
    oCuChk_(f);
    var id = String(row.CustID), dup = oQeDupCust_(db, f, id); if (dup) oFail_('DUP|' + dup[0].CustID + '|' + dup[1]);
    var cp; try { cp = qfCustPlan_(db, { mode: 'existing', id: id, fields: oCuPatch_(f) }); }
    catch (e) { oFail_('BADINPUT|details'); }
    if (oCuSt_(row) !== c.status) cp.patch.Status = c.status;
    qfReadyUp_(db);
    if (Object.keys(cp.patch).some(function (k) { return k !== 'Status'; })) oCuPdfOld_(env, db, 'CustID', id); // CR7 rule: before the write
    qfCustWrite_(db, cp);
    var r = must(env.db() || db, 'Customers', 'CustID', id), o = oQeCustOut_(r); o.status = oCuSt_(r);
    return o;
  });
}
// s = {id, ev, project, address, siteRep, siteRepPhone, startDate: yyyy-mm-dd | ''}
function officeSiteSave(token, s) {
  officeGate_(token, OQ_NEED_);
  return oQW_(token, function (env, db, L) {
    s = s && typeof s === 'object' && !Array.isArray(s) ? s : {};
    var row = typeof s.id === 'string' && s.id ? find(db.rows('Sites'), 'SiteID', s.id) : null;
    if (!row || blank(row.SiteID)) oFail_('NOTFOUND');
    var cust = find(db.rows('Customers'), 'CustID', row.CustID);
    if (!cust) oFail_('NOTFOUND');
    if (s.ev !== oCuEv_(row, QF_SF_)) oFail_('STALE');
    oQeRate_(env, L);
    var f = oSiF_(s), id = String(row.SiteID);
    var dup = oQeDupSite_(db, String(cust.CustID), f.project, f.address, id); if (dup) oFail_('DUP|' + dup.SiteID + '|project');
    var sp; try { sp = qfSitePlan_(db, { mode: 'existing', id: id, fields: oSiPatch_(f) }, { row: cust, patch: {} }); }
    catch (e) { oFail_('BADINPUT|details'); }
    qfReadyUp_(db);
    if (Object.keys(sp.patch || {}).length) oCuPdfOld_(env, db, 'SiteID', id); // CR7 rule: before the write
    qfSiteWrite_(db, sp, String(cust.CustID));
    return oQeSiteOut_(must(env.db() || db, 'Sites', 'SiteID', id));
  });
}
// ----------------------------------------------------------------- M2 (21 Nov): SC > Contracts (PO / WO) = Jobs rows made from a quote
// Reuses quoteToJob / quoteTotals / quoteToPI (Code.gs). New columns (added in the lock on the first write, safe to repeat):
// Jobs.OrderKind (PO / WO / LOI), Jobs.AdvancePct (blank = the quote's), QuoteLines.NeedsFab (Yes / blank; never printed).
// officeContractList(token)          -> {can, money, rows: [contract card], free: [Sent quotes without a job] (writers only), staff}
// officeContractGet(token, job)      -> one contract (+ ev = hash of the row as shown; money only for money logins)
// officeContractMake(token, d)       d = {quote, kind, no, date, adv (%), pm} -> {job}; quote must be Sent, no job (else EXISTS|job)
// officeContractSave(token, d)       d = {job, ev, kind, no, date, pm, status, notes, adv, sdAmount, sdCheque, sdStatus} (ev old -> STALE)
// officeContractFab(token, d)        d = {job, line, fab: true | false} -> sets QuoteLines.NeedsFab (planning only, no PDF change)
// officeContractAdvance(token, d)    d = {job, amount, date} -> {pi} Draft advance PI (one per contract, else PIMADE)
// Codes: NOTFOUND, EXISTS|job, QSTATE|status, CLOSED, PIMADE, NOTOTAL, STALE, BADINPUT|field, NOACCESS, BUSY.
var OCT_KINDS_ = ['PO', 'WO', 'LOI'];
var OCT_EV_ = ['ClientWONo', 'ClientWODate', 'OrderKind', 'AdvancePct', 'PM', 'Status', 'Notes', 'SecDepAmount', 'SecDepChequeNo', 'SecDepStatus', 'ContractValue'];
function oCtUp_(db) { // idempotent; columns at the end (formulas / panels find columns by name)
  var done = [];
  if (db.ensureColumn('Jobs', 'OrderKind')) done.push('Jobs + OrderKind');
  if (db.ensureColumn('Jobs', 'AdvancePct')) done.push('Jobs + AdvancePct');
  if (db.ensureColumn('QuoteLines', 'NeedsFab')) done.push('QuoteLines + NeedsFab');
  if (done.length) log_(db, 'Upgrade M2', '', done.join('; '));
}
function oCtEv_(j) { return oCuEv_(j, [], OCT_EV_); }
function oCtEvX_(db, j) { // ev = the row + the effective advance % and value (they can follow the quote / Settings)
  var qn = String(j.QuoteNo == null ? '' : j.QuoteNo), q = qn ? find(db.rows('Quotes'), 'QuoteNo', qn) : null;
  return oQHash_(oCtEv_(j) + '|' + oCtPct_(db, j, q) + '|' + oCtValue_(db, j, q));
}
function oCtKind_(j) { var k = String(j.OrderKind == null ? '' : j.OrderKind); return OCT_KINDS_.indexOf(k) >= 0 ? k : 'WO'; }
function oCtClosed_(j) { return String(j.Status) === 'Closed'; }
function oCtRow_(db, no) { var n = oQNo_(no), j = n ? find(db.rows('Jobs'), 'JobNo', n) : null; if (!j || blank(j.JobNo)) oFail_('NOTFOUND'); return j; }
function oCtDay_(v, env, what) { // '' or yyyy-mm-dd from 2020 to a year ahead -> a sheet date
  if (v == null || v === '') return '';
  var d = oDayOk_(v) ? oQDn_(oDayCell_(v)) : null, now = oQDn_(new Date(env.now()));
  if (d == null || d < oQDn_(new Date(2020, 0, 1)) || (now != null && d > now + 366)) oFail_('BADINPUT|' + what);
  return oDayCell_(v);
}
function oCtNotes_(v) { return v == null || (typeof v === 'string' && !v.trim()) ? '' : oQeDesc_(v, 'notes'); }
function oCtValue_(db, j, q) { // contract value = ContractValue, else the quote total (incl. VAT); null when unknown
  if (typeof j.ContractValue === 'number' && isFinite(j.ContractValue)) return j.ContractValue;
  if (!blank(j.ContractValue) && isFinite(num(j.ContractValue))) return num(j.ContractValue);
  return q ? oCuQTot_(db, q, String(q.QuoteNo)) : null;
}
function oCtPct_(db, j, q) { // advance share 0-1: the contract's, else the quote's, else Settings 50 %
  if (!blank(j.AdvancePct) && isFinite(num(j.AdvancePct))) return num(j.AdvancePct);
  return q && !blank(q.AdvancePct) ? num(q.AdvancePct) : num(S(db, 'AdvancePct', 0.5));
}
function oCtPis_(db, qno) { return db.rows('Proformas').filter(function (p) { return !blank(p.PINo) && String(p.QuoteNo) === qno && p.Status !== 'Cancelled'; }); }
function oCtMoney_(db, j, q, pis) { // value, advance, PI, paid, set off (all numbers or null)
  var v = oCtValue_(db, j, q), pct = oCtPct_(db, j, q), no = pis.map(function (p) { return String(p.PINo); });
  var paid = r2(sum(db.rows('Allocations').filter(function (a) { return a.DocType === 'PI' && no.indexOf(String(a.DocNo)) >= 0; }), function (a) { return num(a.Amount); }));
  var set = r2(sum(db.rows('Invoices').filter(function (i) { return String(i.JobNo) === String(j.JobNo) && i.Status !== 'Cancelled'; }), function (i) { return num(i.AdvanceAdjusted); }));
  var p = pis[0] || null;
  return { value: v, advPct: pct, adv: v == null ? null : r2(v * pct), paid: paid, set: set, pi: p ? { no: String(p.PINo), status: String(p.Status || 'Draft'), amount: num(p.Amount) } : null };
}
function oCtLines_(db, qno, M) {
  var items = {}; db.rows('Items').forEach(function (i) { items[String(i.ItemCode)] = i; });
  return oQLines_(db, qno).filter(function (l) { return l.Selected === 'Yes'; }).map(function (l, i) {
    var it = items[String(l.ItemCode)] || {}, dim = typeof qfDimTxt_ === 'function' ? qfDimTxt_(l) : '';
    var o = { id: String(l.LineID), n: num(l.LineNo) || i + 1, desc: oUncell_(l.Description || it.Name || ''), size: dim || String(it.Size == null ? '' : it.Size), unit: String(l.Unit || ''), qty: num(l.Qty),
      months: blank(l.Months) ? '' : num(l.Months), fab: String(l.NeedsFab) === 'Yes' };
    if (M) { o.rate = num(l.Rate); o.amount = lineAmt(l); }
    return o;
  });
}
function oCtQv_(db, q) { // version of a quote as offered in the picker: a revision / resend / other total or terms -> another number
  var n = String(q.QuoteNo);
  return oQHash_([q.Rev, q.Status, oCuQTot_(db, q, n), q.AdvancePct, q.CustID, q.SiteID, q.QuoteType].map(function (x) { return String(x == null ? '' : x); }).join('|'));
}
function oCt4_(x) { return Math.round(num(x) * 1e4); } // shares compared at the 2-decimal % shown in the form
function oCtLog_(db, a, r, t) { try { log_(db, a, r, t); return ''; } catch (e) { return 'LOG'; } } // audit line after a committed write: a failure is reported, not thrown
function oCtStaff_(db) { return db.rows('Staff').filter(function (s) { return !blank(s.StaffID) && !blank(s.Name); }).map(function (s) { return { id: String(s.StaffID), name: oUncell_(s.Name) }; }); }
function officeContractList(token) {
  var L = officeGate_(token, OQ_NEED_), a = oAcc_(L), M = oCanSeeMoney_(a), C = oQCan_(a), env = oEnv_(), db = env.db();
  if (!db) oFail_('BUSY');
  var cus = {}, sites = {}, qs = {}, stf = {}, fab = {}, has = {};
  db.rows('Customers').forEach(function (c) { cus[String(c.CustID)] = c; });
  db.rows('Sites').forEach(function (s) { sites[String(s.SiteID)] = s; });
  db.rows('Quotes').forEach(function (q) { if (oQNo_(String(q.QuoteNo))) qs[String(q.QuoteNo)] = q; });
  db.rows('Staff').forEach(function (s) { stf[String(s.StaffID)] = s; });
  db.rows('QuoteLines').forEach(function (l) { if (l.Selected === 'Yes' && String(l.NeedsFab) === 'Yes') fab[String(l.QuoteNo)] = (fab[String(l.QuoteNo)] || 0) + 1; });
  var rows = db.rows('Jobs').filter(function (j) { return !blank(j.JobNo); }).map(function (j) {
    var qn = String(j.QuoteNo == null ? '' : j.QuoteNo), q = qs[qn] || null, s = sites[String(j.SiteID)] || null, pm = stf[String(j.PM)];
    if (qn) has[qn] = 1;
    var o = { job: String(j.JobNo), quote: qn, custId: String(j.CustID), cust: oUncell_((cus[String(j.CustID)] || {}).Name || j.CustID), project: s && !blank(s.Project) ? oUncell_(s.Project) : q ? oUncell_(q.Subject) : '',
      type: String(j.JobType || (q ? oQType_(q) : '')), kind: oCtKind_(j), no: oUncell_(j.ClientWONo), date: oDay_(j.ClientWODate), pm: pm ? oUncell_(pm.Name) : '', status: String(j.Status || 'Awaiting order'), fab: fab[qn] || 0 };
    if (M) { try { var m = oCtMoney_(db, j, q, oCtPis_(db, qn)); o.value = m.value; o.adv = m.adv; o.paid = m.paid; o.pi = m.pi ? m.pi.amount : null; } catch (e) { o.value = null; o.adv = null; o.paid = 0; o.pi = null; } }
    return o;
  });
  var out = { can: C, money: M, rows: rows, today: oDayOf_(env.now()) };
  if (C) {
    out.free = Object.keys(qs).filter(function (n) { return !has[n] && String(qs[n].Status) === 'Sent'; }).map(function (n) {
      var q = qs[n], s = sites[String(q.SiteID)] || null, x = { no: n, cust: oUncell_((cus[String(q.CustID)] || {}).Name || q.CustID), project: s && !blank(s.Project) ? oUncell_(s.Project) : oUncell_(q.Subject), type: oQType_(q),
        advPct: !blank(q.AdvancePct) ? num(q.AdvancePct) : num(S(db, 'AdvancePct', 0.5)), qv: oCtQv_(db, q) };
      if (M) x.total = oCuQTot_(db, q, n);
      return x;
    });
    out.staff = oCtStaff_(db);
  }
  return out;
}
function officeContractGet(token, no) {
  var L = officeGate_(token, OQ_NEED_), a = oAcc_(L), M = oCanSeeMoney_(a), env = oEnv_(), db = env.db();
  if (!db) oFail_('BUSY');
  var j = oCtRow_(db, no), qn = String(j.QuoteNo == null ? '' : j.QuoteNo), q = qn ? find(db.rows('Quotes'), 'QuoteNo', qn) : null;
  var cu = find(db.rows('Customers'), 'CustID', j.CustID) || {}, s = find(db.rows('Sites'), 'SiteID', j.SiteID) || null, pm = blank(j.PM) ? null : find(db.rows('Staff'), 'StaffID', j.PM);
  var cl = oCtClosed_(j), lines = q ? oCtLines_(db, qn, M) : [];
  var o = { job: String(j.JobNo), quote: qn, custId: String(j.CustID), cust: oUncell_(cu.Name || j.CustID), project: s && !blank(s.Project) ? oUncell_(s.Project) : q ? oUncell_(q.Subject) : '', site: s ? oUncell_(s.Address) : '',
    type: String(j.JobType || (q ? oQType_(q) : '')), kind: oCtKind_(j), no: oUncell_(j.ClientWONo), date: oDay_(j.ClientWODate), pm: blank(j.PM) ? '' : String(j.PM), pmName: pm ? oUncell_(pm.Name) : '',
    status: String(j.Status || 'Awaiting order'), notes: oUncell_(j.Notes), closed: cl, ev: oCtEvX_(db, j), money: M, can: oQCan_(a) && !cl, lines: lines, qStatus: q ? String(q.Status || '') : '', today: oDayOf_(env.now()),
    fab: lines.filter(function (l) { return l.fab; }).length, lists: { status: uiList_(db, 'JobStatus'), sd: uiList_(db, 'SecDepStatus') }, staff: oCtStaff_(db) };
  if (oStSee_(a)) o.ch = oChOfJob_(db, o.job); // C5: this job's challans (no prices), for logins that see Stock
  if (M) {
    var m = oCtMoney_(db, j, q, qn ? oCtPis_(db, qn) : []);
    o.value = m.value; o.advPct = m.advPct; o.adv = m.adv; o.paid = m.paid; o.set = m.set; o.pi = m.pi;
    o.sd = { amount: blank(j.SecDepAmount) ? 0 : num(j.SecDepAmount), cheque: oUncell_(j.SecDepChequeNo), status: String(j.SecDepStatus || 'None') };
  }
  return o;
}
function officeContractMake(token, d) {
  officeGate_(token, OQ_NEED_);
  return oQW_(token, function (env, db, L) {
    d = d && typeof d === 'object' && !Array.isArray(d) ? d : {};
    oQRevFix_(env, db, String(oQRow_(db, d.quote).QuoteNo)); // CR10: a half-saved revision is completed (-> Draft) before the Sent check
    var q = oQRow_(db, d.quote), qn = String(q.QuoteNo), ex = oQJob_(db, qn);
    if (ex) oFail_('EXISTS|' + ex.JobNo);
    if (String(q.Status) !== 'Sent') oFail_('QSTATE|' + String(q.Status || 'Draft'));
    if (typeof d.qv !== 'number' || d.qv !== oCtQv_(db, q)) oFail_('STALE'); // the quote changed since the picker was shown
    if (OCT_KINDS_.indexOf(d.kind) < 0) oFail_('BADINPUT|order kind');
    var wo = oQeTxt_(d.no, 60, 'order no.'), wd = oCtDay_(d.date, env, 'order date');
    var pm = d.pm == null || d.pm === '' ? '' : (typeof d.pm === 'string' && find(db.rows('Staff'), 'StaffID', d.pm) ? d.pm : oFail_('BADINPUT|project manager'));
    var qp = !blank(q.AdvancePct) ? num(q.AdvancePct) : num(S(db, 'AdvancePct', 0.5)), pct = '';
    if (oCanSeeMoney_(oAcc_(L)) && d.adv != null && d.adv !== '') { var p = Math.round(oQeNum_(d.adv, 0, 100, 2, 'advance') * 100) / 1e4; if (oCt4_(p) !== oCt4_(qp)) pct = p; }
    var tot = oCuQTot_(db, q, qn); if (typeof tot !== 'number' || !isFinite(tot) || tot <= 0) oFail_('NOTOTAL');
    oQeRate_(env, L);
    oCtUp_(db);
    var jn = quoteToJob(db, qn, { woNo: oCell_(wo), woDate: wd || '', pm: pm, extra: { ContractValue: tot, OrderKind: d.kind, AdvancePct: pct } }); // one row write (ContractValue stays the sheet formula live)
    var w = oCtLog_(db, 'Contract made', jn, qn + ' · ' + d.kind + (wo ? ' ' + wo : '') + (pct !== '' ? ' · advance ' + r2(pct * 100) + ' %' : ''));
    return w ? { job: jn, warn: w } : { job: jn };
  });
}
function oCtPdfOld_(db, jn, und) { // und: undo list filled as it goes (CR run 11). Documents of the job still open (Draft) that print the WO no.: their PDF link is cleared (old URL kept in the Log)
  var n = 0, nos = [], clr = [];
  [['Invoices', 'InvNo'], ['Challans', 'ChallanNo'], ['Notes', 'NoteNo']].forEach(function (t) {
    if (!db.hasTab(t[0]) || db.headers(t[0]).indexOf('PDF') < 0) return;
    db.rows(t[0]).forEach(function (r) {
      if (String(r.JobNo) !== jn || !(blank(r.Status) || String(r.Status) === 'Draft')) return;
      nos.push(String(r[t[1]])); clr.push([t, r]); // CR run 3: all of them, not only those this read showed with a link
    });
  });
  oPeBump_(oEnv_(), nos); // first: a sheet-panel PDF of one of them being made right now does not keep its link (also those with no PDF yet)
  // CR run 11: undo kept as it goes; a throw part way puts back the links cleared so far (the contract is not written yet) and rethrows
  var u = und || [];
  try {
    clr.forEach(function (c) { var t = c[0][0], no = String(c[1][c[0][1]]), was = oPdfNow_(db, t, c[1]); if (was) { log_(db, 'PDF out of date', no, 'WO no. of ' + jn + ' changed; old PDF ' + was); u.push([t, c[1], no, was]); } db.update(t, c[1], { PDF: '' }); if (was) n++; });
  } catch (e) { oPdfUndo_(db, u, 'WO no. of ' + jn + ' not saved'); throw e; }
  return n;
}
// CR run 11: the contract write threw -> the links cleared for the WO change go back, only when a fresh read shows the WO no. as it was
function oCtPdfBack_(env, db, u, jn, wo0) {
  if (!u.length) return;
  var s = function (x) { return blank(x) ? '' : String(x); };
  try { var d = env.db(); if (!d) return; var r = find(d.rows('Jobs'), 'JobNo', jn); if (!r || s(r.ClientWONo) !== s(wo0)) return; } catch (e) { return; }
  oPdfUndo_(db, u, 'WO no. of ' + jn + ' not saved');
}
function officeContractSave(token, d) {
  officeGate_(token, OQ_NEED_);
  return oQW_(token, function (env, db, L) {
    d = d && typeof d === 'object' && !Array.isArray(d) ? d : {};
    var j = oCtRow_(db, d.job), jn = String(j.JobNo), M = oCanSeeMoney_(oAcc_(L));
    if (typeof d.ev !== 'number' || d.ev !== oCtEvX_(db, j)) oFail_('STALE');
    if (oCtClosed_(j)) oFail_('CLOSED');
    if (OCT_KINDS_.indexOf(d.kind) < 0) oFail_('BADINPUT|order kind');
    var wo = oQeTxt_(d.no, 60, 'order no.'), wd = oCtDay_(d.date, env, 'order date'), notes = oCtNotes_(d.notes);
    var pm = d.pm == null || d.pm === '' ? '' : (typeof d.pm === 'string' && (d.pm === String(j.PM == null ? '' : j.PM) || find(db.rows('Staff'), 'StaffID', d.pm)) ? d.pm : oFail_('BADINPUT|project manager')); // the PM already on the contract stays even if its Staff row is gone
    if (typeof d.status !== 'string' || (d.status !== String(j.Status || '') && uiList_(db, 'JobStatus').indexOf(d.status) < 0)) oFail_('BADINPUT|status'); // an unchanged status stays even if no longer listed
    var p = { ClientWONo: oCell_(wo), ClientWODate: wd, PM: pm, Status: d.status, Notes: oCell_(notes) }, lg = { ClientWONo: wo, Notes: notes };
    if (db.headers('Jobs').indexOf('OrderKind') >= 0 || d.kind !== 'WO') p.OrderKind = d.kind;
    if (M) {
      var qn = String(j.QuoteNo == null ? '' : j.QuoteNo), q = qn ? find(db.rows('Quotes'), 'QuoteNo', qn) : null;
      var cur = oCtPct_(db, j, q), pct = Math.round(oQeNum_(d.adv, 0, 100, 2, 'advance') * 100) / 1e4;
      if (oCt4_(pct) !== oCt4_(cur)) { if (qn && oCtPis_(db, qn).length) oFail_('PIMADE'); var qp = q && !blank(q.AdvancePct) ? num(q.AdvancePct) : num(S(db, 'AdvancePct', 0.5)); p.AdvancePct = oCt4_(pct) !== oCt4_(qp) ? pct : ''; }
      var sa = d.sdAmount == null || d.sdAmount === '' ? '' : oQeNum_(d.sdAmount, 0, 1e9, 2, 'deposit amount');
      if (typeof d.sdStatus !== 'string' || (d.sdStatus !== String(j.SecDepStatus || 'None') && uiList_(db, 'SecDepStatus').indexOf(d.sdStatus) < 0)) oFail_('BADINPUT|deposit status');
      if (d.sdStatus !== 'None' && !(sa > 0)) oFail_('BADINPUT|deposit amount');
      p.SecDepAmount = sa === 0 ? '' : sa; lg.SecDepChequeNo = oQeTxt_(d.sdCheque, 40, 'cheque no.'); p.SecDepChequeNo = oCell_(lg.SecDepChequeNo); p.SecDepStatus = d.sdStatus;
    }
    var nv = function (k, x) { return k === 'ClientWODate' ? oDay_(x) : String(x == null ? '' : x).replace(/^'/, ''); };
    var cur = function (k) { return String(j[k] == null ? '' : j[k]); }; // text fields: compared as text, a literal leading apostrophe counts
    var ch = Object.keys(p).filter(function (k) { return k in lg ? !(cur(k) === String(lg[k]) || cur(k) === p[k]) : nv(k, p[k]) !== nv(k, j[k]); });
    if (!ch.length) return { ok: true, same: true, old: 0 };
    oQeRate_(env, L);
    oCtUp_(db); j = must(db, 'Jobs', 'JobNo', jn);
    var patch = {}; ch.forEach(function (k) { patch[k] = p[k]; });
    var cu = [], wo0 = j.ClientWONo, old = ch.indexOf('ClientWONo') >= 0 ? oCtPdfOld_(db, jn, cu) : 0; // CR7 rule: before the write
    try { uiPutRow_(db, 'Jobs', j, patch); } catch (e) { oCtPdfBack_(env, db, cu, jn, wo0); throw e; } // CR run 11
    var w = oCtLog_(db, 'Contract updated', jn, ch.join(', '));
    return w ? { ok: true, old: old, warn: w } : { ok: true, old: old };
  });
}
function officeContractFab(token, d) {
  officeGate_(token, OQ_NEED_);
  return oQW_(token, function (env, db, L) {
    d = d && typeof d === 'object' && !Array.isArray(d) ? d : {};
    var j = oCtRow_(db, d.job); if (oCtClosed_(j)) oFail_('CLOSED');
    if (typeof d.fab !== 'boolean') oFail_('BADINPUT|fabrication');
    var l = typeof d.line === 'string' && d.line ? find(db.rows('QuoteLines'), 'LineID', d.line) : null;
    if (!l || blank(j.QuoteNo) || String(l.QuoteNo) !== String(j.QuoteNo) || l.Selected !== 'Yes') oFail_('NOTFOUND');
    var v = d.fab ? 'Yes' : '';
    if (String(l.NeedsFab == null ? '' : l.NeedsFab) === v) return { ok: true, same: true };
    oQeRate_(env, L);
    oCtUp_(db);
    l = find(db.rows('QuoteLines'), 'LineID', d.line);
    uiPutRow_(db, 'QuoteLines', l, { NeedsFab: v });
    var w = oCtLog_(db, 'Contract line', String(j.JobNo), 'Line ' + num(l.LineNo) + (d.fab ? ': needs fabrication' : ': from stock'));
    return w ? { ok: true, warn: w } : { ok: true };
  });
}
function officeContractAdvance(token, d) {
  officeGate_(token, OQ_NEED_);
  return oQW_(token, function (env, db, L) {
    if (!oCanSeeMoney_(oAcc_(L))) oFail_('NOACCESS');
    d = d && typeof d === 'object' && !Array.isArray(d) ? d : {};
    var j = oCtRow_(db, d.job), qn = String(j.QuoteNo == null ? '' : j.QuoteNo), q = qn ? find(db.rows('Quotes'), 'QuoteNo', qn) : null;
    if (!q) oFail_('NOTFOUND');
    if (typeof d.ev !== 'number' || d.ev !== oCtEvX_(db, j)) oFail_('STALE');
    if (oCtClosed_(j)) oFail_('CLOSED');
    if (oCtPis_(db, qn).length) oFail_('PIMADE');
    var v = oCtValue_(db, j, q); if (typeof v !== 'number' || !isFinite(v) || v <= 0) oFail_('NOTOTAL');
    var amt = oQeNum_(d.amount, 0.01, v, 2, 'amount'), dt = oCtDay_(d.date, env, 'PI date') || new Date(env.now());
    oQeRate_(env, L);
    var pct = oCtPct_(db, j, q);
    var ds = Math.abs(amt - r2(v * pct)) < 0.005 ? 'Advance payable on order: ' + r2(pct * 100) + '% of contract value (' + String(j.JobNo) + ')' : 'Advance payable on order (' + String(j.JobNo) + ')';
    var pi = quoteToPI(db, qn, { amount: amt, date: dt, description: ds }); // one row write
    return { pi: pi };
  });
}
// ----------------------------------------------------------------- M3 (22 Nov): YW > Stock = Items + Locations + StockMoves (stock = running sum of the moves; never reset)
// Moves are written only by posts (challans, POs, opening stock). Owned = Yard + Sites + Repair; Lost / Scrap outside owned; Supplier / Sold not shown.
// See: YW, PS, SC, PR, AC (level 1+) and Directors. Prices / cost only for money logins (oCanSeeMoney_); written only by Directors.
// officeStockList(token)            -> {can, head, money, price, rows: [item card], cats, units, defs: [[category, for hire, for sale]], locs (Yard / Repair, head only), today}
// officeStockItem(token, code)      -> one item: groups, where (location -> job / customer), last 50 moves, parts (set) or sets it is in, ev
// officeItemSave(token, it)         it = {code, ev (none = new), name, cat, size, unit, kg, reorder, status, tracked, isSet, forHire, forSale (Yes / No), hire, sale, repl, repair} (YW 2+) -> {code, old (edits: PDFs marked old)}
// officeStockOpening(token, d)      d = {date, rows: [{item, loc, qty}]} -> {n}; once per item + location (YW 3+)
// officeLocList(token)              -> {can, rows: [location]};  officeLocSave(token, l)  l = {code, name, type: Yard | Repair} (YW 3+)
// An item edit marks the open documents that print a changed field as old (oStPdfOld_); a repair / replacement rate change waits for a Draft debit note of the item (DNOPEN|note).
// Codes: NOTFOUND, EXISTS|..., STALE, BADINPUT|field, DNOPEN|note, ONORDER|po, NOACCESS, SLOW, BUSY.
var OST_SEE_ = ['YW', 'PS', 'SC', 'PR', 'AC'];
var OST_GRP_ = { Yard: 'yard', Site: 'site', Repair: 'rep', Lost: 'lost', Scrap: 'lost' };
var OST_PRICE_ = { hire: 'HireRateMonth', sale: 'SalePrice', repl: 'ReplacementCost', repair: 'RepairRate' };
var OST_EV_ = ['ItemCode', 'Name', 'Category', 'Size', 'Unit', 'WeightKg', 'StockTracked', 'IsSet', 'ForHire', 'ForSale', 'ReorderLevel', 'Status'];
var OST_CODE_ = /^[A-Z0-9][A-Z0-9.-]{1,23}$/; // as the live codes (TC-TUBE-0.5)
var OST_MOVES_ = 50, OST_LINES_ = 200;
function oStSee_(a) { return oIsDir_(a) || OST_SEE_.some(function (d) { return (a[d] || 0) >= 1; }); }
function oStCan_(a) { return oIsDir_(a) || (a.YW || 0) >= 2; }
function oStHead_(a) { return oIsDir_(a) || (a.YW || 0) >= 3; }
function oStW_(token, can, fn) { // a write: checked before and again inside the script lock
  var env = oEnv_(), pre = officeGate_(token, null);
  if (!can(oAcc_(pre))) oFail_('NOACCESS');
  return env.lock(function () {
    var L = officeGate_(token, null);
    if (!can(oAcc_(L))) oFail_('NOACCESS');
    var db = env.db(); if (!db) oFail_('BUSY');
    var prev = OQ_ACT_; OQ_ACT_ = 'office:' + L.email;
    try { return fn(env, db, L); } finally { OQ_ACT_ = prev; }
  });
}
function oStCode_(v) { return typeof v === 'string' && OST_CODE_.test(v) ? v : ''; }
function oStItem_(db, code) { var c = oStCode_(code), it = c ? find(db.rows('Items'), 'ItemCode', c) : null; if (!it || blank(it.ItemCode)) oFail_('NOTFOUND'); return it; }
function oStYes_(v) { return String(v == null ? '' : v).trim() === 'Yes'; }
function oStSt_(it) { var s = String(it.Status == null ? '' : it.Status).trim(); return s || 'Active'; }
function oStN_(v) { return blank(v) || !isFinite(num(v)) ? null : num(v); }
function oStMap_() { return Object.create(null); } // maps keyed by sheet / page text: no prototype keys (__proto__, constructor)
function oStLocs_(db) { var m = oStMap_(); db.rows('Locations').forEach(function (l) { var k = String(l.LocID == null ? '' : l.LocID); if (!blank(l.LocID) && !m[k]) m[k] = l; }); return m; } // a repeated LocID: the first row wins (as find() in the challans)
function oStQty_(db) { // item -> loc -> qty, one read of StockMoves
  var m = oStMap_();
  db.rows('StockMoves').forEach(function (v) {
    if (blank(v.ItemCode) || !blank(v.Owner)) return; // M8: rented-in items (Owner = SupID) are not our stock
    var k = String(v.ItemCode), q = num(v.Qty), x = m[k] = m[k] || oStMap_();
    if (!isFinite(q) || !q) return;
    if (!blank(v.ToLoc)) x[String(v.ToLoc)] = (x[String(v.ToLoc)] || 0) + q;
    if (!blank(v.FromLoc)) x[String(v.FromLoc)] = (x[String(v.FromLoc)] || 0) - q;
  });
  return m;
}
function oStGroups_(q, locs) {
  var g = { yard: 0, site: 0, rep: 0, lost: 0 };
  // CR run 12: summed at full precision and rounded once, for the total shown (two racks of 0.004 = 0.01, not 0 + 0)
  Object.keys(q || {}).forEach(function (l) { var t = locs[l] ? OST_GRP_[String(locs[l].Type)] : ''; if (t) g[t] += q[l]; });
  g.raw = g.yard + g.site + g.rep; // CR run 13: owned value = raw balance x cost (not the rounded total)
  g.ry = g.yard; g.hz = { yard: Math.abs(g.yard) > 1e-9, site: Math.abs(g.site) > 1e-9, rep: Math.abs(g.rep) > 1e-9, lost: Math.abs(g.lost) > 1e-9 }; // CR run 14: raw (low, list filters)
  g.own = r2(g.raw); g.yard = r2(g.yard); g.site = r2(g.site); g.rep = r2(g.rep); g.lost = r2(g.lost);
  return g;
}
// set -> [{p, q}] (KitParts), empty when the tab is missing. CR run 5: read as the challan reads it (kitParts_, Sets.gs): rows of one part
// are added up; a row the challan refuses (part missing / blank, itself a set, not stock-tracked, qty not above 0) marks the set bad (.bad).
function oStKit_(db) {
  var m = oStMap_(); if (!db.hasTab('KitParts')) return m;
  var its = oStMap_(); db.rows('Items').forEach(function (i) { var k = String(i.ItemCode == null ? '' : i.ItemCode); if (!blank(i.ItemCode) && !its[k]) its[k] = i; });
  db.rows('KitParts').forEach(function (k) {
    var s = String(k.SetCode == null ? '' : k.SetCode); if (!s) return;
    var a = m[s] = m[s] || [], p = String(k.ItemCode == null ? '' : k.ItemCode), q = num(k.QtyPerSet), x = its[p];
    if (!x || String(x.IsSet) === 'Yes' || x.StockTracked !== 'Yes' || !(q > 0)) { a.bad = true; return; }
    for (var i = 0; i < a.length; i++) if (a[i].p === p) { a[i].q += q; return; }
    a.push({ p: p, q: q });
  });
  return m;
}
// CR run 11: counted from the raw yard balance (not the 2-place total shown) with the challan's own tolerance (Sets.gs: have >= need - 1e-9)
function oStMake_(parts, Q, locs) { // sets one challan can issue from the yard: max over yard locations of min over parts of floor(qty there / per set)
  if (!parts || !parts.length || parts.bad) return 0; // a parts list the challan refuses: none can go out
  var best = 0; // CR run 15: the challan checks each part at its one From location (Sets.gs: part|FromLoc), never summed over racks
  Object.keys(locs).forEach(function (l) { if (OST_GRP_[String(locs[l].Type)] !== 'yard') return;
    var n = Math.min.apply(null, parts.map(function (p) { var x = (Q[p.p] || {})[l] || 0; return Math.floor((x + 1e-9) / p.q); })); if (n > best) best = n; });
  return best;
}
function oStYard_(q, locs) { var y = 0; Object.keys(q || {}).forEach(function (l) { if (locs[l] && OST_GRP_[String(locs[l].Type)] === 'yard') y += q[l]; }); return y; }
function oStHas_(q, locs) { return Object.keys(q || {}).some(function (l) { return !!(locs[l] && OST_GRP_[String(locs[l].Type)]) && Math.abs(q[l]) > 1e-9; }); } // CR run 16: Supplier / Sold are not stock // CR run 13: stock (or a shortfall) somewhere
function oStLow_(it, g) { var r = oStN_(it.ReorderLevel); return !oStYes_(it.IsSet) && oStSt_(it) === 'Active' && r != null && r > 0 && (g.ry != null ? g.ry : g.yard) < r; }
function oStEv_(it, M) { return oCuEv_(it, [], M ? OST_EV_.concat(['HireRateMonth', 'SalePrice', 'ReplacementCost', 'RepairRate']) : OST_EV_); } // no prices in a hash sent to a login that may not see them (a guess could be checked against it)
function oStCard_(it, g, kit, Q, locs, M) {
  var set = oStYes_(it.IsSet), o = { code: String(it.ItemCode), name: oUncell_(it.Name), cat: oUncell_(it.Category), size: oUncell_(it.Size), unit: oUncell_(it.Unit), isSet: set, status: oStSt_(it),
    reorder: oStN_(it.ReorderLevel) || 0, tracked: oStYes_(it.StockTracked), yard: g.yard, site: g.site, rep: g.rep, lost: g.lost, own: g.own, low: oStLow_(it, g) && (oStYes_(it.StockTracked) || oStHas_(Q[String(it.ItemCode)], locs)), hz: g.hz }; // CR run 15: a catalogue-only item (untracked, no stock) is not low
  if (set) { o.parts = (kit[o.code] || []).length; o.make = oStMake_(kit[o.code], Q, locs); var kk = kit[o.code] || []; if (!kk.length || kk.bad) o.kitBad = true; } // kitBad: the challan refuses this set (no valid parts / a bad row)
  if (M) { o.cost = oStN_(it.ReplacementCost); if (o.cost != null && !set) o.val = r2(g.raw * o.cost); } // CR run 13: val only to a money login
  return o;
}
function oStSites_(db) { // SiteID -> {cust, jobs: open job nos.}
  var cus = oStMap_(), m = oStMap_();
  db.rows('Customers').forEach(function (c) { cus[String(c.CustID)] = c; });
  db.rows('Sites').forEach(function (s) { if (!blank(s.SiteID)) m[String(s.SiteID)] = { cust: oUncell_((cus[String(s.CustID)] || {}).Name || s.CustID || ''), project: oUncell_(s.Project), jobs: [] }; });
  db.rows('Jobs').forEach(function (j) { var s = m[String(j.SiteID)]; if (s && !blank(j.JobNo) && String(j.Status) !== 'Closed') s.jobs.push(String(j.JobNo)); });
  return m;
}
function oStLocOut_(l, sites) {
  var o = { code: String(l.LocID), name: oUncell_(l.Name), type: String(l.Type || ''), status: String(l.Status || 'Active') }, s = o.type === 'Site' && !blank(l.SiteID) ? sites[String(l.SiteID)] : null;
  if (s) { o.cust = s.cust; o.job = s.jobs.sort().join(', '); }
  return o;
}
function officeStockList(token) {
  var L = officeGate_(token, null), a = oAcc_(L); if (!oStSee_(a)) oFail_('NOACCESS');
  var M = oCanSeeMoney_(a), H = oStHead_(a), env = oEnv_(), db = env.db();
  if (!db) oFail_('BUSY');
  var locs = oStLocs_(db), Q = oStQty_(db), kit = oStKit_(db);
  var seen = oStMap_(), rows = db.rows('Items').filter(function (it) { var c = String(it.ItemCode == null ? '' : it.ItemCode); if (!oStCode_(c) || seen[c]) return false; seen[c] = 1; return true; }) // a repeated code: listed once, the first row (as find())
    .map(function (it) { var o = oStCard_(it, oStGroups_(Q[String(it.ItemCode)], locs), kit, Q, locs, M); if (!(oStYes_(it.StockTracked) || oStYes_(it.IsSet) || oStHas_(Q[String(it.ItemCode)], locs))) o.cata = true; return o; }); // cata: catalogue only (untracked, no stock; CR run 13: a balance, not move history): listed under "All items", not counted
  var out = { can: oStCan_(a), head: H, money: M, price: oIsDir_(a), rows: rows, cats: oStLs_(db, 'ItemCategory'), units: oStLs_(db, 'Unit'), defs: oStDefs_(db), today: oDayOf_(env.now()) };
  if (H) { var op = oStMap_(); db.rows('StockMoves').forEach(function (v) { if (String(v.RefType) !== 'Opening' || blank(v.ToLoc)) return; var c = String(v.ItemCode), a = op[c] = op[c] || []; if (a.indexOf(String(v.ToLoc)) < 0) a.push(String(v.ToLoc)); });
    rows.forEach(function (o) { if (op[o.code]) o.op = op[o.code]; }); } // CR run 15: item + location already opened (the post refuses them: EXISTS)
  if (H) out.locs = Object.keys(locs).filter(function (k) { var t = String(locs[k].Type); return (t === 'Yard' || t === 'Repair') && String(locs[k].Status || 'Active') === 'Active'; }).map(function (k) { return { code: k, name: oUncell_(locs[k].Name), type: String(locs[k].Type) }; });
  return out;
}
function oStDefs_(db) { // a new item's starting For hire / For sale: what most items of its category have (none / a tie: hire Yes, sale No)
  var c = oStMap_(), yn = function (v) { v = String(v == null ? '' : v).trim(); return v === 'Yes' ? 1 : v === 'No' ? -1 : 0; };
  db.rows('Items').forEach(function (it) { var k = oUncell_(it.Category).trim(); if (!k || blank(it.ItemCode)) return; var x = c[k] = c[k] || [0, 0]; x[0] += yn(it.ForHire); x[1] += yn(it.ForSale); });
  return Object.keys(c).sort().map(function (k) { return [k, c[k][0] >= 0 ? 'Yes' : 'No', c[k][1] > 0 ? 'Yes' : 'No']; });
}
function officeStockItem(token, code) {
  var L = officeGate_(token, null), a = oAcc_(L); if (!oStSee_(a)) oFail_('NOACCESS');
  var M = oCanSeeMoney_(a), env = oEnv_(), db = env.db();
  if (!db) oFail_('BUSY');
  var it = oStItem_(db, code), c = String(it.ItemCode), locs = oStLocs_(db), Q = oStQty_(db), kit = oStKit_(db), g = oStGroups_(Q[c], locs), sites = oStSites_(db), items = oStMap_();
  db.rows('Items').forEach(function (x) { var k = String(x.ItemCode); if (!blank(x.ItemCode) && !items[k]) items[k] = x; }); // CR run 17: the first row of a repeated code
  var o = oStCard_(it, g, kit, Q, locs, M), ord = { Yard: 0, Site: 1, Repair: 2, Lost: 3, Scrap: 4 };
  o.kg = oStN_(it.WeightKg); o.forHire = oStYes_(it.ForHire); o.forSale = oStYes_(it.ForSale); o.ev = oStEv_(it, M); o.can = oStCan_(a); o.head = oStHead_(a); o.money = M; o.price = oIsDir_(a);
  o.lists = { cats: oStLs_(db, 'ItemCategory'), units: oStLs_(db, 'Unit') }; o.ulk = o.can && oStUnitUsed_(db, c); // ulk: the unit can't change (CR run 4); only for a login that edits items (no extra reads for viewers)
  if (M) { o.hire = oStN_(it.HireRateMonth); o.sale = oStN_(it.SalePrice); o.repl = oStN_(it.ReplacementCost); o.repair = oStN_(it.RepairRate); o.avg = oStN_(it.AvgCost); }
  o.where = Object.keys(Q[c] || {}).filter(function (l) { return Q[c][l] && locs[l] && OST_GRP_[String(locs[l].Type)]; })
    .map(function (l) { var x = oStLocOut_(locs[l], sites); x.qty = r2(Q[c][l]); return x; })
    .sort(function (x, y) { return (ord[x.type] - ord[y.type]) || (x.code < y.code ? -1 : x.code > y.code ? 1 : 0); });
  var mv = db.rows('StockMoves').filter(function (v) { return String(v.ItemCode) === c; }).map(function (v) { return { d: oDay_(v.MoveDate), id: String(v.MoveID || ''), f: String(v.FromLoc || ''), t: String(v.ToLoc || ''), q: isFinite(num(v.Qty)) ? num(v.Qty) : 0, ref: oUncell_(v.RefNo), k: String(v.RefType || ''), job: String(v.JobNo || '') }; });
  mv.sort(function (x, y) { return x.d !== y.d ? (x.d < y.d ? 1 : -1) : (x.id < y.id ? 1 : x.id > y.id ? -1 : 0); });
  o.moves = mv.slice(0, OST_MOVES_).map(function (m) { delete m.id; return m; }); o.nMoves = mv.length;
  var pi = function (p) { var x = items[p] || {}; return { code: p, name: oUncell_(x.Name), size: oUncell_(x.Size) }; };
  if (o.isSet) o.kit = (kit[c] || []).map(function (p) { var x = pi(p.p); x.q = p.q; x.yard = oStGroups_(Q[p.p], locs).yard; x.mk = oStMake_([p], Q, locs); return x; }); // CR run 12: mk = sets this part is enough for (raw balance, as the set total)
  else o.sets = Object.keys(kit).filter(function (s) { return kit[s].some(function (p) { return p.p === c; }); }).sort().map(function (s) { var x = pi(s); x.q = kit[s].filter(function (p) { return p.p === c; })[0].q; return x; });
  o.opened = db.rows('StockMoves').filter(function (v) { return String(v.ItemCode) === c && String(v.RefType) === 'Opening' && !blank(v.ToLoc); }).map(function (v) { return String(v.ToLoc); })
    .filter(function (x, i, A) { return A.indexOf(x) === i; });
  return o;
}
function oStLs_(db, k) { // Lists column k (ItemCategory is not one of uiLists_' keys, so it is read here)
  if (oHas_(UI_LISTS_DEFAULT_, k)) return uiList_(db, k);
  if (!db.hasTab('Lists') || db.headers('Lists').indexOf(k) < 0) return [];
  return db.rows('Lists').map(function (r) { return r[k]; }).filter(function (x, i, A) { return !blank(x) && A.indexOf(x) === i; }).map(String);
}
function oStList_(db, k, v, cur, what) { // a value from Lists (or the item's own current value); no list -> plain text
  var Ls = oStLs_(db, k);
  if (typeof v === 'string' && cur != null && v === String(cur) && v !== '') return v;
  if (!Ls.length) return oQeTxt_(v, 40, what, true);
  if (typeof v !== 'string' || Ls.indexOf(v) < 0) oFail_('BADINPUT|' + what);
  return v;
}
var OST_PRINT_ = { Quotes: ['Size'], Challans: ['Name', 'Unit', 'WeightKg'], POs: ['Name', 'Unit'], Notes: ['Name'] }; // item fields each document prints (PDF.gs specs + the W4 quote grid)
function oStOpen_(r) { return blank(r.Status) || String(r.Status) === 'Draft'; }
function oStDraftDN_(db, code) { // a Draft debit note that prints this item's repair / replacement rate (specNote reads Items live; its Amount is stored)
  if (!db.hasTab('Damage') || !db.hasTab('Notes')) return '';
  var dn = oStMap_(); db.rows('Damage').forEach(function (d) { if (String(d.ItemCode) === code && !blank(d.DNNo)) dn[String(d.DNNo)] = 1; });
  var n = db.rows('Notes').filter(function (x) { return dn[String(x.NoteNo)] && oStOpen_(x); })[0];
  return n ? String(n.NoteNo) : '';
}
function oStPdfOld_(env, db, code, ch) { // CR7 rule (before the write): open documents that print a changed field -> quote PDFs marked old, Draft challan / PO / note PDF links cleared (old URL in the Log)
  var hit = function (t) { return OST_PRINT_[t].some(function (k) { return ch.indexOf(k) >= 0; }); }, n = 0, nos = [], qo = [], clr = [];
  // CR run 3: every open document is handled, not only those this execution's read showed with a link (a sheet-panel PDF may have written one since)
  if (hit('Quotes')) {
    var qs = oStMap_(); db.rows('QuoteLines').forEach(function (l) { if (String(l.ItemCode) === code) qs[String(l.QuoteNo)] = 1; });
    db.rows('Quotes').forEach(function (q) { var no = String(q.QuoteNo); if (qs[no] && oQNo_(no) && !oQLocked_(db, q)) { nos.push(no); qo.push(no); } });
  }
  [['Challans', 'ChallanNo', 'ChallanLines', 'ChallanNo'], ['POs', 'PONo', 'POLines', 'PONo'], ['Notes', 'NoteNo', 'Damage', 'DNNo']].forEach(function (t) {
    if (!hit(t[0]) || !db.hasTab(t[0]) || !db.hasTab(t[2]) || db.headers(t[0]).indexOf('PDF') < 0) return;
    var ls = oStMap_(); db.rows(t[2]).forEach(function (l) { if (String(l.ItemCode) === code && !blank(l[t[3]])) ls[String(l[t[3]])] = 1; });
    db.rows(t[0]).forEach(function (r) { if (!ls[String(r[t[1]])] || !oStOpen_(r)) return; nos.push(String(r[t[1]])); clr.push([t[0], r, String(r[t[1]])]); });
  });
  oPeBump_(env, nos); // first: a sheet-panel PDF of one of them being made right now does not keep its link (also those with no PDF yet)
  // CR run 10: every "PDF out of date" line is logged before any cell is cleared (a failed log clears none); undo = the cleared links
  var cl = clr.map(function (c) { return [c, oPdfNow_(db, c[0], c[1])]; });
  cl.forEach(function (x) { if (x[1]) log_(db, 'PDF out of date', x[0][2], 'Item ' + code + ' changed; old PDF ' + x[1]); });
  // CR run 11: undo kept as it goes (an OQP marker written, a link about to be cleared); a throw part way puts back what was done (the item is not written yet)
  var po = { n: 0, undo: [], oqp: [] };
  try {
    qo.forEach(function (no) { var k = 'OQP:' + no, p0 = env.get(k); if (oQPdfStale_(env, db, no, true)) n++; var p1 = env.get(k); if (JSON.stringify(p1) !== JSON.stringify(p0)) po.oqp.push([k, p0, p1]); });
    cl.forEach(function (x) { if (x[1]) po.undo.push([x[0][0], x[0][1], x[0][2], x[1]]); db.update(x[0][0], x[0][1], { PDF: '' }); if (x[1]) n++; });
  } catch (e) { oStUndo_(env, db, po, code); throw e; }
  po.n = n; return po;
}
// CR run 10: the item write threw -> the links cleared for it go back, but only when a fresh read shows the item row as it was (a write
// that threw yet went in, e.g. a time-out, keeps them cleared: an old link never stays on changed printed data). Unreadable -> cleared.
var OST_NUMF_ = ['WeightKg', 'ReorderLevel', 'HireRateMonth', 'SalePrice', 'ReplacementCost', 'RepairRate', 'AvgCost']; // item number fields
function oStPdfBack_(env, db, po, code, prev) { // CR run 11: also the OQP markers (a quote PDF still current is not left "old")
  if (!po || !(po.undo.length || po.oqp.length)) return;
  // CR run 12: a text field compared as text ('10' and '+010' print differently); numeric equality only for the number fields
  var same = function (k, a, b) { var x = blank(a) ? '' : String(a), y = blank(b) ? '' : String(b); if (x === y) return true; x = x.trim(); y = y.trim(); return OST_NUMF_.indexOf(k) >= 0 && x !== '' && y !== '' && isFinite(+x) && isFinite(+y) && +x === +y; }; // CR run 17: text exactly (' 10 mm' is not '10 mm')
  try { var d = env.db(); if (!d) return; var r = find(d.rows('Items'), 'ItemCode', code); if (!r || Object.keys(prev).some(function (k) { return !same(k, r[k], prev[k]); })) return; } catch (e) { return; }
  oStUndo_(env, db, po, code);
}
// CR run 11: put back what oStPdfOld_ did for an item that did not change: an OQP marker only while it is still the one written there, a
// cleared link only while its cell is still blank (nothing written there since). One that fails stays as it is (old: made again).
function oStUndo_(env, db, po, code) {
  po.oqp.forEach(function (x) { try { if (JSON.stringify(env.get(x[0])) !== JSON.stringify(x[2])) return; if (x[1] == null) env.del(x[0]); else env.put(x[0], x[1]); } catch (e) { /* stays marked old */ } });
  oPdfUndo_(db, po.undo, 'Item ' + code + ' not saved');
}
function oPdfUndo_(db, u, why) { // [tab, row, doc no., old link]
  (u || []).forEach(function (x) { try { if (oPdfNow_(db, x[0], x[1])) return; db.update(x[0], x[1], { PDF: x[3] }); log_(db, 'PDF link kept', x[2], why + '; PDF ' + x[3]); } catch (e) { /* that one stays cleared: make it again */ } });
}
function oStPart_(db, code) { // listed as a part (KitParts.ItemCode) of some set: its "Is a set" can't change (a set's stock is kept as its parts)
  return db.hasTab('KitParts') && db.rows('KitParts').some(function (k) { return !blank(k.SetCode) && String(k.ItemCode == null ? '' : k.ItemCode).trim().toUpperCase() === code; });
}
// CR run 3: the PDF cell as the sheet holds it now (a sheet-panel PDF runs without the script lock and may have written it after this execution read the tab)
function oPdfNow_(db, t, r) {
  if (!r) return '';
  if (db.ss && r._r) { var c = db.headers(t).indexOf('PDF'); if (c >= 0) r.PDF = db.sheet(t).getRange(r._r, c + 1).getValue(); }
  return blank(r.PDF) ? '' : String(r.PDF);
}
// open document whose printed data changes: its PDF cell is cleared whatever this execution's read showed; a real link is logged first
// (a failed log stops before the clear). true = there was a link.
function oPdfClr_(db, t, r, no, why) {
  var u = oPdfNow_(db, t, r);
  if (u) log_(db, 'PDF out of date', no, why + '; old PDF ' + u);
  db.update(t, r, { PDF: '' }); // this cell only (SheetDb.update writes cell by cell)
  return !!u;
}
// CR run 4: the unit an item's quantities are counted in. Once moves (= any stock) / set parts / challan, damage or PO lines hold quantities
// of it (they print or post them in Items.Unit), the unit can't change: nothing converts those quantities. Quote lines keep their own unit.
function oStUnitUsed_(db, code) {
  if (oStSetRef_(db, code) || oStPart_(db, code)) return true;
  var cu = String(code).trim().toUpperCase(), me = function (r) { return String(r.ItemCode == null ? '' : r.ItemCode).trim().toUpperCase() === cu; };
  return ['StockMoves', 'ChallanLines', 'Damage', 'POLines'].some(function (t) { return db.hasTab(t) && db.rows(t).some(me); });
}
// CR run 8: KitParts rows that name this item as their set, valid or not (oStKit_ leaves out the rows a challan refuses; they still point here)
// CR run 9: the first open PO (Draft / Sent / Part received, as the reorder list counts them) that still has this item to receive; '' = none
function oStOnOrder_(db, code) {
  if (!db.hasTab('POs') || !db.hasTab('POLines')) return '';
  var C = function (v) { return String(v == null ? '' : v).trim().toUpperCase(); }, c = C(code), H = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); }, open = {}, ord = {}, got = {};
  db.rows('POs').forEach(function (p) { if (['Draft', 'Sent', 'Part received', ''].indexOf(String(p.Status == null ? '' : p.Status).trim()) >= 0 && !blank(p.PONo)) open[String(p.PONo)] = 1; });
  db.rows('POLines').forEach(function (l) { var k = String(l.PONo); if (H(open, k) && C(l.ItemCode) === c) ord[k] = (H(ord, k) ? ord[k] : 0) + num(l.Qty); });
  if (!Object.keys(ord).length) return '';
  db.rows('StockMoves').forEach(function (v) { var k = String(v.RefNo); if (String(v.RefType) === 'PO' && H(ord, k) && C(v.ItemCode) === c) got[k] = (H(got, k) ? got[k] : 0) + num(v.Qty); });
  return Object.keys(ord).filter(function (k) { return ord[k] > (H(got, k) ? got[k] : 0) + 1e-9; })[0] || '';
}
function oStSetRef_(db, code) {
  var cu = String(code).trim().toUpperCase();
  return db.hasTab('KitParts') && db.rows('KitParts').some(function (k) { return String(k.SetCode == null ? '' : k.SetCode).trim().toUpperCase() === cu; });
}
function oStYN_(v, what) { if (v !== 'Yes' && v !== 'No') oFail_('BADINPUT|' + what); return v; }
function oStNum_(v, lo, hi, dp, what) { return v == null || v === '' ? '' : oQeNum_(v, lo, hi, dp, what); }
function officeItemSave(token, x) {
  officeGate_(token, null);
  return oStW_(token, oStCan_, function (env, db, L) {
    x = x && typeof x === 'object' && !Array.isArray(x) ? x : {};
    var nw = x.ev == null, row = null, code;
    if (nw) {
      code = oStCode_(x.code); if (!code) oFail_('BADINPUT|item code');
      if (db.rows('Items').some(function (r) { return String(r.ItemCode == null ? '' : r.ItemCode).trim().toUpperCase() === code; })) oFail_('EXISTS|' + code);
    } else {
      row = oStItem_(db, x.code); code = String(row.ItemCode);
      if (typeof x.ev !== 'number' || x.ev !== oStEv_(row, oCanSeeMoney_(oAcc_(L)))) oFail_('STALE');
    }
    var cur = function (k) { return row ? row[k] : null; };
    var t = { Name: oQeTxt_(x.name, 80, 'name', true), Category: oStList_(db, 'ItemCategory', x.cat, cur('Category'), 'category'), Size: oQeTxt_(x.size, 40, 'size'), Unit: row && x.unit === '' && blank(row.Unit) ? '' : oStList_(db, 'Unit', x.unit, cur('Unit'), 'unit') }; // CR run 13: an unchanged blank unit (legacy item) passes on edit
    var n = { WeightKg: oStNum_(x.kg, 0, 10000, 3, 'weight'), ReorderLevel: oStNum_(x.reorder, 0, 1e6, 0, 'reorder level') };
    if (x.status !== 'Active' && x.status !== 'Inactive') oFail_('BADINPUT|status');
    var tr = oStYN_(x.tracked, 'stock tracked'), st = oStYN_(x.isSet, 'set'), fh = oStYN_(x.forHire, 'for hire'), fs = oStYN_(x.forSale, 'for sale'); // for hire / sale: the quote form offers the item on Rental / Sale quotes
    if (oIsDir_(oAcc_(L))) Object.keys(OST_PRICE_).forEach(function (k) { n[OST_PRICE_[k]] = oStNum_(x[k], 0, 1e9, 2, { hire: 'hire rate', sale: 'sale price', repl: 'replacement cost', repair: 'repair rate' }[k]); }); // others: kept
    if (row) { // stock already there must stay readable
      var q = oStQty_(db)[code] || {}, has = oStHas_(q, oStLocs_(db));
      var moved = db.rows('StockMoves').some(function (v) { return String(v.ItemCode) === code; }), kitN = oStSetRef_(db, code);
      if ((st === 'Yes') !== oStYes_(row.IsSet) && (moved || kitN || oStPart_(db, code))) oFail_('BADINPUT|set');
      if (tr === 'No' && oStYes_(row.StockTracked) && has) oFail_('BADINPUT|stock tracked');
      if (tr === 'No' && oStYes_(row.StockTracked) && oStPart_(db, code)) oFail_('BADINPUT|part tracked'); // CR run 6: a part of a set must stay tracked (the challan refuses the set)
      var po = tr === 'No' && oStYes_(row.StockTracked) ? oStOnOrder_(db, code) : ''; if (po) oFail_('ONORDER|' + po); // CR run 9: receivePO takes only tracked items
    }
    if (!row && st === 'Yes' && oStPart_(db, code)) oFail_('BADINPUT|set'); // listed as a part of a set already: a set can't be a part
    if (!row && tr === 'No' && oStPart_(db, code)) oFail_('BADINPUT|part tracked'); // listed as a part already: it must be tracked
    if (st === 'Yes' && tr === 'Yes') oFail_('BADINPUT|set tracked'); // CR run 15: a set's stock is its parts' (Sets.gs: sets StockTracked No; receivePO would post the set code)
    var p = {}, ch = [];
    Object.keys(t).forEach(function (k) { p[k] = oCell_(t[k]); if (!row || String(cur(k) == null ? '' : cur(k)) !== t[k]) ch.push(k); });
    Object.keys(n).forEach(function (k) { p[k] = n[k]; var a = cur(k); if (!row || (k === 'ReorderLevel' ? (n[k] || 0) !== (blank(a) ? 0 : num(a)) : n[k] === '' ? !blank(a) : blank(a) || num(a) !== n[k])) ch.push(k); }); // reorder: blank = 0
    p.Status = x.status; if (!row || oStSt_(row) !== x.status) ch.push('Status');
    p.StockTracked = tr; if (!row || oStYes_(row.StockTracked) !== (tr === 'Yes')) ch.push('StockTracked');
    p.IsSet = st === 'Yes' ? 'Yes' : ''; if (!row || oStYes_(row.IsSet) !== (st === 'Yes')) ch.push('IsSet');
    [['ForHire', fh], ['ForSale', fs]].forEach(function (f) { p[f[0]] = f[1]; if (!row || String(cur(f[0]) == null ? '' : cur(f[0])).trim() !== f[1]) ch.push(f[0]); }); // a blank cell becomes Yes / No
    if (row && ch.indexOf('Unit') >= 0 && oStUnitUsed_(db, code)) oFail_('BADINPUT|unit'); // CR run 4: before any write
    if (row && !ch.length) return { code: code, same: true };
    var dn = row && (ch.indexOf('RepairRate') >= 0 || ch.indexOf('ReplacementCost') >= 0) ? oStDraftDN_(db, code) : '';
    if (dn) oFail_('DNOPEN|' + dn); // the draft note would print the new rate next to its stored amount: issue or cancel it first
    oQeRate_(env, L);
    var w, old = 0;
    if (!row) { var r = { ItemCode: code }; Object.keys(p).forEach(function (k) { r[k] = p[k]; }); db.insert('Items', r); w = oCtLog_(db, 'Item added', code, t.Name); }
    else { var patch = {}; ch.forEach(function (k) { patch[k] = p[k]; }); var prev = {}; ch.forEach(function (k) { prev[k] = row[k]; }); var po = oStPdfOld_(env, db, code, ch); old = po.n; try { uiPutRow_(db, 'Items', row, patch); } catch (e) { oStPdfBack_(env, db, po, code, prev); throw e; } w = oCtLog_(db, 'Item updated', code, ch.join(', ')); }
    var o = { code: code }; if (row) o.old = old; if (w) o.warn = w;
    return o;
  });
}
function officeStockOpening(token, d) {
  officeGate_(token, null);
  return oStW_(token, oStHead_, function (env, db, L) {
    d = d && typeof d === 'object' && !Array.isArray(d) ? d : {};
    if (d.date == null || d.date === '') oFail_('BADINPUT|count date');
    var dt = oCtDay_(d.date, env, 'count date'); if (d.date > oDayOf_(env.now())) oFail_('BADINPUT|count date');
    if (!Array.isArray(d.rows) || !d.rows.length || d.rows.length > OST_LINES_) oFail_('BADINPUT|lines');
    var locs = oStLocs_(db), seen = oStMap_(), done = oStMap_();
    db.rows('StockMoves').forEach(function (v) { if (String(v.RefType) === 'Opening') done[String(v.ItemCode) + '|' + String(v.ToLoc)] = 1; });
    var rows = d.rows.map(function (r, i) {
      var n = 'line ' + (i + 1); r = r && typeof r === 'object' && !Array.isArray(r) ? r : {};
      var c = oStCode_(r.item), it = c ? find(db.rows('Items'), 'ItemCode', c) : null;
      if (!it || oStYes_(it.IsSet) || !oStYes_(it.StockTracked) || oStSt_(it) !== 'Active') oFail_('BADINPUT|' + n + ' item');
      var l = typeof r.loc === 'string' ? locs[r.loc] : null;
      if (!l || ['Yard', 'Repair'].indexOf(String(l.Type)) < 0 || String(l.Status || 'Active') !== 'Active') oFail_('BADINPUT|' + n + ' location');
      var q = oQeNum_(r.qty, 1, 1e6, 0, n + ' qty'), k = c + '|' + r.loc; if (!Number.isInteger(q)) oFail_('BADINPUT|' + n + ' qty'); // CR run 9: whole units only (oQeNum_ lets 1.0000001 through)
      if (seen[k]) oFail_('BADINPUT|' + n + ' (twice)');
      if (done[k]) oFail_('EXISTS|' + c + '|' + r.loc);
      seen[k] = 1;
      return { ItemCode: c, LocID: r.loc, Qty: q };
    });
    oQeRate_(env, L);
    var n0 = db.rows('StockMoves').length;
    try { postOpeningStock(db, rows, dt); }
    catch (e) { if (db.rows('StockMoves').length >= n0 + rows.length) return { n: rows.length, warn: 'LOG' }; throw e; } // the moves are in; only the audit line failed (SheetDb.insert writes all the moves in one setValues: never part of them)
    return { n: rows.length };
  });
}
function officeLocList(token) {
  var L = officeGate_(token, null); if (!oStSee_(oAcc_(L))) oFail_('NOACCESS');
  var env = oEnv_(), db = env.db();
  if (!db) oFail_('BUSY');
  var sites = oStSites_(db), ord = { Yard: 0, Repair: 1, Site: 2, Lost: 3, Scrap: 4 };
  var rows = db.rows('Locations').filter(function (l) { return !blank(l.LocID) && oHas_(ord, String(l.Type)); }).map(function (l) { return oStLocOut_(l, sites); })
    .sort(function (x, y) { return (ord[x.type] - ord[y.type]) || (x.code < y.code ? -1 : x.code > y.code ? 1 : 0); });
  return { can: oStHead_(oAcc_(L)), rows: rows };
}
function officeLocSave(token, x) {
  officeGate_(token, null);
  return oStW_(token, oStHead_, function (env, db, L) {
    x = x && typeof x === 'object' && !Array.isArray(x) ? x : {};
    var code = oStCode_(x.code); if (!code || /^LOC-S\d+$/.test(code)) oFail_('BADINPUT|location code'); // LOC-S0001 ... = site locations (Sequences LOC)
    var name = oQeTxt_(x.name, 60, 'location name', true);
    if (x.type !== 'Yard' && x.type !== 'Repair') oFail_('BADINPUT|location type');
    var up = code.toUpperCase(); if (db.rows('Locations').some(function (l) { return String(l.LocID == null ? '' : l.LocID).trim().toUpperCase() === up; })) oFail_('EXISTS|' + code);
    oQeRate_(env, L);
    db.insert('Locations', { LocID: code, Name: oCell_(name), Type: x.type, SiteID: '', Status: 'Active' });
    var w = oCtLog_(db, 'Location added', code, x.type + ' · ' + name);
    return w ? { code: code, warn: w } : { code: code };
  });
}
// ----------------------------------------------------------------- M8 (25 Nov): challans. PS: Delivery / Sale / Return; YW: Transfer / Hire-in / Off-hire (rent-in)
// Stock moves only on Post (Sets.gs postChallan: sets expand, From checked, owner split: StockMoves.Owner '' = own, SupID = rented in).
// See: as Stock (YW, PS, SC, PR, AC 1+, Directors). Make / edit / post: that kind's department level 2+; cancel a posted one: its head (3) or a Director.
// No prices anywhere. Numbering CAE/DC/YYYY/NNN (Sequences DC), the same for every kind.
// officeChallanList(token)            -> {can, rows: [card], jobs, sups, locs, items, kit, pool: item -> loc -> owner -> qty, hire: job -> item -> qty, hpool, rent, today}
// officeChallanGet(token, no)         -> one challan: header, lines, ev, al (posted: taken from, per owner), pdf, doc, can*
// officeChallanSave(token, c)         c = {no + ev (edit) | none (new), kind, job, from, to, sup, sref, date, veh, notes, lines: [{it, q}] | Return [{it, g, dm, l}]} -> {no, ev}
// officeChallanPost(token, no, ev, veh) -> {no, url};  officeChallanCancel(token, no, ev, why) -> {no, url};  officeChallanPdf(token, no) -> {url, doc}
// Codes: NOTFOUND, STALE, BADINPUT|field, CHSTATE|status, CHDATE, NOTPOSTED|text, NOCANCEL|text, POSTUNSURE, SAVEUNSURE|no|ev, NOPDF, NOACCESS, SLOW, BUSY.
var OCH_KINDS_ = ['Delivery', 'Sale', 'Return', 'Transfer', 'Hire-in', 'Off-hire'];
var OCH_YW_ = ['Transfer', 'Hire-in', 'Off-hire'];
var OCH_NO_ = /^CAE\/DC\/20\d\d\/\d{3,6}$/, OCH_LINES_ = 200;
var OCH_COLS_ = [['Challans', 'SupID'], ['Challans', 'SupplierRef'], ['Challans', 'MadeBy'], ['Challans', 'CancelReason'], ['StockMoves', 'Owner']];
var OCH_EVF_ = ['Kind', 'ChallanDate', 'JobNo', 'FromLoc', 'ToLoc', 'Vehicle', 'Status', 'Notes', 'SupID', 'SupplierRef'];
function oChDept_(k) { return OCH_YW_.indexOf(k) >= 0 ? 'YW' : 'PS'; }
function oChCan_(a, k) { return oIsDir_(a) || (a[oChDept_(k)] || 0) >= 2; }
function oChHead_(a, k) { return oIsDir_(a) || (a[oChDept_(k)] || 0) >= 3; }
function oChKind_(k) { if (typeof k !== 'string' || OCH_KINDS_.indexOf(k) < 0) oFail_('BADINPUT|kind'); return k; }
function oChRow_(db, no) { var c = typeof no === 'string' && OCH_NO_.test(no) ? find(db.rows('Challans'), 'ChallanNo', no) : null; if (!c || OCH_KINDS_.indexOf(String(c.Kind)) < 0) oFail_('NOTFOUND'); return c; }
function oChLines_(db, no) { return db.rows('ChallanLines').filter(function (l) { return String(l.ChallanNo) === no; }); }
function oChEv_(db, c) {
  var h = OCH_EVF_.map(function (k) { var x = c[k]; return x instanceof Date ? x.getTime() : String(x == null ? '' : x); });
  oChLines_(db, String(c.ChallanNo)).forEach(function (l) { h.push(['LineID', 'ItemCode', 'Qty', 'QtyGood', 'QtyDamaged', 'QtyLost'].map(function (k) { return String(l[k] == null ? '' : l[k]); }).join('~')); });
  return oQHash_(JSON.stringify(h));
}
function oChSetup_(env, db) { // new columns at the end + the two new kinds valid in the Kind dropdown (once)
  if (OCH_COLS_.every(function (x) { return db.headers(x[0]).indexOf(x[1]) >= 0; }) && env.get('OCHSET') === 1) return;
  OCH_COLS_.forEach(function (x) { db.ensureColumn(x[0], x[1]); });
  if (db.ss && typeof ensureAllowed_ === 'function') ensureAllowed_(db, 'Challans', 'Kind', OCH_KINDS_);
  if (db.hasTab(ODOC_REG_)) oDocSetup_(env, db); // M8: the rent-in forms CAE-YW-F02 / F03 join the register
  env.put('OCHSET', 1);
}
function oChItems_(db) { var m = oStMap_(); db.rows('Items').forEach(function (i) { var k = String(i.ItemCode == null ? '' : i.ItemCode); if (oStCode_(k) && !m[k]) m[k] = i; }); return m; }
function oChKg_(it, q, kit, items) {
  if (!it) return 0;
  if (oStYes_(it.IsSet)) return (kit[String(it.ItemCode)] || []).reduce(function (s, p) { return s + p.q * q * num((items[p.p] || {}).WeightKg); }, 0);
  return q * num(it.WeightKg);
}
function oChCard_(c, lines, X) {
  var k = String(c.Kind), job = X.jobs[String(c.JobNo)] || null, sup = blank(c.SupID) ? '' : String(c.SupID), q = 0, kg = 0;
  lines.forEach(function (l) { var n = num(l.Qty); q += n; kg += oChKg_(X.items[String(l.ItemCode)], n, X.kit, X.items); });
  return { no: String(c.ChallanNo), kind: k, st: String(c.Status || 'Draft'), d: oDay_(c.ChallanDate), job: job ? String(job.JobNo) : '', cust: job ? X.cust(job) : '',
    from: String(c.FromLoc || ''), to: String(c.ToLoc || ''), sup: sup, supName: sup ? oUncell_((X.sups[sup] || {}).Name || sup) : '', sref: oUncell_(c.SupplierRef),
    veh: oUncell_(c.Vehicle), n: lines.length, qty: r2(q), kg: Math.round(kg), dn: X.dn[String(c.ChallanNo)] || '', by: oUncell_(c.MadeBy) };
}
function oChCtx_(db) {
  var X = { items: oChItems_(db), kit: oStKit_(db), jobs: oStMap_(), sups: oStMap_(), dn: oStMap_(), cus: oStMap_(), sites: oStMap_() };
  db.rows('Jobs').forEach(function (j) { if (!blank(j.JobNo) && !X.jobs[String(j.JobNo)]) X.jobs[String(j.JobNo)] = j; });
  if (db.hasTab('Suppliers')) db.rows('Suppliers').forEach(function (s) { if (!blank(s.SupID) && !X.sups[String(s.SupID)]) X.sups[String(s.SupID)] = s; });
  db.rows('Customers').forEach(function (c) { X.cus[String(c.CustID)] = c; });
  db.rows('Sites').forEach(function (s) { X.sites[String(s.SiteID)] = s; });
  db.rows('Damage').forEach(function (d) { if (!blank(d.DNNo) && String(d.Status) !== 'Cancelled' && !X.dn[String(d.ChallanNo)]) X.dn[String(d.ChallanNo)] = String(d.DNNo); });
  X.cust = function (j) { return oUncell_((X.cus[String(j.CustID)] || {}).Name || j.CustID || ''); };
  return X;
}
function oChPool_(db) { // item|loc -> {owner: qty} (no Owner column: all own)
  if (chOwnCol_(db)) return chOwnMap_(db);
  var m = {}, s = stockMap(db); Object.keys(s).forEach(function (k) { m[k] = { '': s[k] }; }); return m;
}
function officeChallanList(token) {
  var L = officeGate_(token, null), a = oAcc_(L); if (!oStSee_(a)) oFail_('NOACCESS');
  var env = oEnv_(), db = env.db(); if (!db) oFail_('BUSY');
  var X = oChCtx_(db), locs = oStLocs_(db), byNo = oStMap_();
  db.rows('ChallanLines').forEach(function (l) { var k = String(l.ChallanNo); (byNo[k] = byNo[k] || []).push(l); });
  var seen = oStMap_(), rows = db.rows('Challans').filter(function (c) { var n = String(c.ChallanNo); if (!OCH_NO_.test(n) || OCH_KINDS_.indexOf(String(c.Kind)) < 0 || seen[n]) return false; seen[n] = 1; return true; })
    .map(function (c) { return oChCard_(c, byNo[String(c.ChallanNo)] || [], X); });
  var jobs = [], hire = {}, hpool = {}, P = oChPool_(db), oc = chOwnCol_(db);
  Object.keys(X.jobs).forEach(function (n) { var j = X.jobs[n]; if (String(j.Status) === 'Closed') return;
    var si = X.sites[String(j.SiteID)] || {}, sl = blank(si.LocID) ? '' : String(si.LocID);
    jobs.push({ no: n, cust: X.cust(j), site: sl, siteName: oUncell_(si.Project || si.Address || ''), type: String(j.JobType || ''), ref: oUncell_(j.ClientWONo), st: String(j.Status || '') });
    if (String(j.JobType) === 'Sale') return;
    var h = onHire(db, n), o = {}; Object.keys(h).forEach(function (k) { if (h[k] > 1e-9) o[k] = r2(h[k]); }); if (!Object.keys(o).length) return; hire[n] = o;
    if (sl && oc) { var jm = chOwnMap_(db, n), hp = {}; Object.keys(o).forEach(function (k) { var x = jm[k + '|' + sl]; if (x) { hp[k] = {}; Object.keys(x).forEach(function (w) { if (x[w] > 1e-9) hp[k][w] = r2(x[w]); }); } }); hpool[n] = hp; } });
  var pool = {}, rent = oStMap_();
  Object.keys(P).forEach(function (k) { var p = k.split('|'), l = locs[p[1]], t = l ? String(l.Type) : ''; if (['Yard', 'Repair', 'Lost', 'Site', 'Scrap'].indexOf(t) < 0) return;
    Object.keys(P[k]).forEach(function (w) { var q = P[k][w]; if (Math.abs(q) < 1e-9) return;
      if (t !== 'Site') { var x = pool[p[0]] = pool[p[0]] || {}, y = x[p[1]] = x[p[1]] || {}; y[w] = r2(q); }
      if (w) { var rk = w + '|' + p[0], r = rent[rk] = rent[rk] || { sup: w, it: p[0], yard: 0, rep: 0, site: 0, lost: 0 }; r[OST_GRP_[t]] += q; } }); });
  var items = Object.keys(X.items).filter(function (c) { var i = X.items[c]; return oStSt_(i) === 'Active' && (oStYes_(i.StockTracked) || oStYes_(i.IsSet)); })
    .map(function (c) { var i = X.items[c]; return { code: c, name: oUncell_(i.Name), size: oUncell_(i.Size), unit: oUncell_(i.Unit), kg: num(i.WeightKg) || 0, set: oStYes_(i.IsSet) }; });
  var kit = {}; Object.keys(X.kit).forEach(function (s) { if (!X.kit[s].bad) kit[s] = X.kit[s].map(function (p) { return { p: p.p, q: p.q }; }); });
  return { can: { PS: oChCan_(a, 'Delivery'), YW: oChCan_(a, 'Transfer'), psH: oChHead_(a, 'Delivery'), ywH: oChHead_(a, 'Transfer') }, rows: rows, jobs: jobs, hire: hire, hpool: hpool, pool: pool,
    rent: Object.keys(rent).sort().map(function (k) { var r = rent[k]; ['yard', 'rep', 'site', 'lost'].forEach(function (g) { r[g] = r2(r[g]); }); return r; }).filter(function (r) { return r.yard || r.rep || r.site || r.lost; }),
    sups: Object.keys(X.sups).filter(function (s) { return String(X.sups[s].Status) !== 'Inactive'; }).map(function (s) { return { id: s, name: oUncell_(X.sups[s].Name || s) }; }),
    locs: Object.keys(locs).filter(function (k) { var t = String(locs[k].Type); return ['Yard', 'Repair', 'Lost', 'Site'].indexOf(t) >= 0 && String(locs[k].Status || 'Active') === 'Active'; }).map(function (k) { return { code: k, name: oUncell_(locs[k].Name), type: String(locs[k].Type) }; }),
    items: items, kit: kit, today: oDayOf_(env.now()), sup: LOC.SUPPLIER };
}
function oChOfJob_(db, jn) { // C5: cards of one job's challans, newest first (same card as the list)
  var seen = oStMap_(), cs = db.rows('Challans').filter(function (c) { var n = String(c.ChallanNo); if (String(c.JobNo) !== jn || !OCH_NO_.test(n) || OCH_KINDS_.indexOf(String(c.Kind)) < 0 || seen[n]) return false; seen[n] = 1; return true; });
  if (!cs.length) return [];
  var X = oChCtx_(db), by = oStMap_();
  db.rows('ChallanLines').forEach(function (l) { var k = String(l.ChallanNo); if (seen[k]) (by[k] = by[k] || []).push(l); });
  return cs.map(function (c) { return oChCard_(c, by[String(c.ChallanNo)] || [], X); }).sort(function (x, y) { return x.no < y.no ? 1 : x.no > y.no ? -1 : 0; });
}
function oChView_(env, db, c, a) {
  var X = oChCtx_(db), no = String(c.ChallanNo), lines = oChLines_(db, no), k = String(c.Kind), o = oChCard_(c, lines, X), st = o.st;
  o.lines = lines.map(function (l) { var d = num(l.QtyDamaged), lo = num(l.QtyLost), q = num(l.Qty);
    return k === 'Return' ? { it: String(l.ItemCode), g: blank(l.QtyGood) ? q - d - lo : num(l.QtyGood), dm: d, l: lo } : { it: String(l.ItemCode), q: q }; });
  o.notes = oUncell_(c.Notes); o.reason = oUncell_(c.CancelReason); o.ev = oChEv_(db, c);
  var job = X.jobs[String(c.JobNo)], si = job ? X.sites[String(job.SiteID)] || {} : {};
  if (job) { o.ref = oUncell_(job.ClientWONo); o.siteName = oUncell_(si.Project || si.Address || ''); o.jst = String(job.Status || ''); o.jtype = String(job.JobType || ''); }
  if (st !== 'Draft') { var al = {}, mine = db.rows('StockMoves').filter(function (v) { return String(v.RefNo) === no && String(v.RefType) === 'Challan'; });
    mine.forEach(function (v) { var w = chOwnOf_(v), i = String(v.ItemCode), x = al[i] = al[i] || {};
      if (k === 'Return') { var t = locType(db, v.ToLoc), j = t === 'Repair' ? 1 : t === 'Lost' ? 2 : 0, y = x[w] = x[w] || [0, 0, 0]; y[j] = r2(y[j] + num(v.Qty)); } else x[w] = r2((x[w] || 0) + num(v.Qty)); });
    o.al = al; }
  var p = env.get('OCHP:' + no);
  o.pdf = blank(c.PDF) ? '' : String(c.PDF); o.pdfOk = !!(o.pdf && p && p.e === o.ev); o.doc = o.pdfOk && typeof p.d === 'string' ? p.d : '';
  o.canEdit = st === 'Draft' && oChCan_(a, k); o.canPost = o.canEdit; o.canCancel = st === 'Posted' ? oChHead_(a, k) && !o.dn : st === 'Draft' && oChCan_(a, k);
  return o;
}
function officeChallanGet(token, no) {
  var L = officeGate_(token, null), a = oAcc_(L); if (!oStSee_(a)) oFail_('NOACCESS');
  var env = oEnv_(), db = env.db(); if (!db) oFail_('BUSY');
  return oChView_(env, db, oChRow_(db, no), a);
}
function oChHdr_(env, db, k, x) { // the header fields of a save, checked
  var date = oCtDay_(x.date, env, 'date'); if (!date) oFail_('BADINPUT|date');
  var locs = oStLocs_(db), lt = function (id) { var l = typeof id === 'string' && id ? locs[id] : null; return l && String(l.Status || 'Active') === 'Active' ? String(l.Type) : ''; };
  var pick = function (id, types, what) { if (types.indexOf(lt(id)) < 0) oFail_('BADINPUT|' + what); return id; };
  var o = { ChallanDate: date, JobNo: '', FromLoc: '', ToLoc: '', Vehicle: oCell_(oQeTxt_(x.veh, 30, 'vehicle no.')), Notes: oCell_(oQeTxt_(x.notes, 300, 'note')), SupID: '', SupplierRef: '' }, sl = '', supNeed = false;
  if (OCH_YW_.indexOf(k) < 0) {
    var job = typeof x.job === 'string' && x.job ? find(db.rows('Jobs'), 'JobNo', x.job) : null;
    if (!job || blank(job.JobNo) || String(job.Status) === 'Closed' || (k === 'Sale') !== (String(job.JobType) === 'Sale')) oFail_('BADINPUT|job');
    o.JobNo = String(job.JobNo);
    if (k !== 'Sale') { var si = find(db.rows('Sites'), 'SiteID', job.SiteID); if (!si) oFail_('BADINPUT|job'); sl = ensureSiteLoc(db, si); }
  }
  if (k === 'Delivery') { if (x.from === LOC.SUPPLIER && locType(db, LOC.SUPPLIER) === 'Supplier') { o.FromLoc = LOC.SUPPLIER; supNeed = true; } else o.FromLoc = pick(x.from, ['Yard'], 'from'); o.ToLoc = sl; }
  else if (k === 'Sale') { o.FromLoc = pick(x.from, ['Yard'], 'from'); o.ToLoc = LOC.SOLD; if (locType(db, LOC.SOLD) !== 'Sold') oFail_('BADINPUT|to'); }
  else if (k === 'Return') { o.FromLoc = sl; o.ToLoc = pick(x.to == null || x.to === '' ? LOC.YARD : x.to, ['Yard'], 'to'); }
  else if (k === 'Transfer') { o.FromLoc = pick(x.from, ['Yard', 'Repair'], 'from'); o.ToLoc = pick(x.to, ['Yard', 'Repair'], 'to'); if (o.FromLoc === o.ToLoc) oFail_('BADINPUT|to'); }
  else { if (locType(db, LOC.SUPPLIER) !== 'Supplier') oFail_('BADINPUT|supplier');
    if (k === 'Hire-in') { o.FromLoc = LOC.SUPPLIER; o.ToLoc = pick(x.to, ['Yard'], 'received into'); supNeed = true; } else { o.FromLoc = pick(x.from, ['Yard', 'Repair', 'Lost'], 'from'); o.ToLoc = LOC.SUPPLIER; } }
  if (supNeed || k === 'Off-hire') {
    var s = typeof x.sup === 'string' && x.sup && db.hasTab('Suppliers') ? find(db.rows('Suppliers'), 'SupID', x.sup) : null;
    if (!s || blank(s.SupID) || String(s.Status) === 'Inactive') oFail_('BADINPUT|supplier');
    o.SupID = String(s.SupID); o.SupplierRef = oCell_(oQeTxt_(x.sref, 40, 'supplier\'s DO no.', supNeed));
  }
  return o;
}
function oChLinesIn_(db, k, ls) {
  if (!Array.isArray(ls) || !ls.length || ls.length > OCH_LINES_) oFail_('BADINPUT|lines');
  var items = oChItems_(db), seen = oStMap_();
  return ls.map(function (r, i) {
    var n = 'line ' + (i + 1); r = r && typeof r === 'object' && !Array.isArray(r) ? r : {};
    var c = oStCode_(r.it), it = c ? items[c] : null;
    if (!it || oStSt_(it) !== 'Active' || !(oStYes_(it.StockTracked) || oStYes_(it.IsSet))) oFail_('BADINPUT|' + n + ' item');
    if (seen[c]) oFail_('BADINPUT|' + n + ' (twice)'); seen[c] = 1;
    var w = function (v, lo, what) { var q = v == null || v === '' ? 0 : oQeNum_(v, lo, 1e6, 0, n + ' ' + what); if (!Number.isInteger(q)) oFail_('BADINPUT|' + n + ' ' + what); return q; };
    if (k === 'Return') {
      var g = w(r.g, 0, 'good'), d = w(r.dm, 0, 'damaged'), lo = w(r.l, 0, 'lost');
      if (!(g + d + lo > 0)) oFail_('BADINPUT|' + n + ' qty');
      if (oStYes_(it.IsSet) && (d || lo)) oFail_('BADINPUT|' + n + ' (a set comes back whole)');
      return { ItemCode: c, Qty: g + d + lo, QtyGood: g, QtyDamaged: d || '', QtyLost: lo || '', Remarks: '' };
    }
    var q = w(r.q, 1, 'qty'); if (!(q >= 1)) oFail_('BADINPUT|' + n + ' qty');
    return { ItemCode: c, Qty: q, QtyGood: '', QtyDamaged: '', QtyLost: '', Remarks: '' };
  });
}
function oChCode_(e) { var m = String(e && e.message || e); return /^[A-Z][A-Z0-9]+(\||$)/.test(m) ? m : ''; } // one of our codes (passed on as it is)
function officeChallanSave(token, x) {
  var L = officeGate_(token, null); if (!oStSee_(oAcc_(L))) oFail_('NOACCESS');
  if (!x || typeof x !== 'object' || Array.isArray(x)) oFail_('BADINPUT|challan');
  var made = null; // a new challan whose header went in, then a later step / the lock-exit flush failed -> SAVEUNSURE|no|ev (Save again edits it)
  try {
    return oStW_(token, oStSee_, function (env, db, L) {
      var a = oAcc_(L), k = oChKind_(x.kind); if (!oChCan_(a, k)) oFail_('NOACCESS');
      oChSetup_(env, db);
      var old = null;
      if (x.no != null && x.no !== '') {
        old = oChRow_(db, x.no);
        if (String(old.Kind) !== k) oFail_('BADINPUT|kind');
        if (String(old.Status || 'Draft') !== 'Draft') oFail_('CHSTATE|' + String(old.Status));
        if (typeof x.ev !== 'number' || x.ev !== oChEv_(db, old)) oFail_('STALE');
      }
      var h = oChHdr_(env, db, k, x), ls = oChLinesIn_(db, k, x.lines), no;
      oQeRate_(env, L);
      if (!old) {
        no = oChFree_(db, 'Challans', 'ChallanNo', function () { return nextId(db, 'DC', h.ChallanDate); });
        var row = { ChallanNo: no, Kind: k, Status: 'Draft', Driver: '', ReceivedBy: '', MadeBy: oCell_(String(L.name || L.email)) };
        Object.keys(h).forEach(function (f) { row[f] = h[f]; });
        db.insert('Challans', row); made = { no: no };
        var ids = oChLineIds_(db, ls.length);
        db.insert('ChallanLines', ls.map(function (l, i) { l.LineID = ids[i]; l.ChallanNo = no; return l; }));
      } else {
        no = String(old.ChallanNo);
        var prev = oChLines_(db, no).slice(), keep = { PDF: old.PDF == null ? '' : old.PDF }, nids = oChLineIds_(db, ls.length);
        Object.keys(h).forEach(function (f) { keep[f] = old[f] == null ? '' : old[f]; });
        db.insert('ChallanLines', ls.map(function (l, i) { l.LineID = nids[i]; l.ChallanNo = no; return l; })); // new lines first, then the old ones go
        try { var p = {}; Object.keys(h).forEach(function (f) { p[f] = h[f]; }); p.PDF = ''; uiPutRow_(db, 'Challans', old, p); uiDelRows_(db, 'ChallanLines', prev); }
        catch (e) {
          try { var d2 = env.db() || db, nw = d2.rows('ChallanLines').filter(function (l) { return nids.indexOf(String(l.LineID)) >= 0; }), o2 = find(d2.rows('Challans'), 'ChallanNo', no);
            if (prev.every(function (l) { return find(d2.rows('ChallanLines'), 'LineID', l.LineID); })) { uiDelRows_(d2, 'ChallanLines', nw); if (o2) uiPutRow_(d2, 'Challans', o2, keep); } } catch (e2) { /* the error below says try again */ }
          oFail_('BUSY');
        }
        if (!blank(keep.PDF)) oCtLog_(db, 'Challan PDF out of date', no, String(keep.PDF));
      }
      var w = oCtLog_(db, old ? 'Challan edited' : 'Challan made', no, k + (h.JobNo ? ' · ' + h.JobNo : '') + ' · ' + ls.length + ' lines');
      var d3 = env.db() || db, out = { no: no };
      try { out.ev = oChEv_(d3, oChRow_(d3, no)); } catch (e) { /* the page opens the challan again */ }
      if (made) made.ev = out.ev;
      if (w) out.warn = w;
      return out;
    });
  } catch (e) { if (made) oFail_('SAVEUNSURE|' + made.no + '|' + (typeof made.ev === 'number' ? made.ev : '')); throw e; }
}
function oChFree_(db, t, col, next) { // next() until a number not already in the tab (a counter behind the sheet never reuses one; live 26 Nov: DC/004)
  for (var i = 0; i < 200; i++) { var v = next(); if (!find(db.rows(t), col, v)) return v; } oFail_('BUSY');
}
function oChLineIds_(db, n) { var out = []; while (out.length < n) { var v = oChFree_(db, 'ChallanLines', 'LineID', function () { return nextId(db, 'CL'); }); if (out.indexOf(v) < 0) out.push(v); } return out; }
function oChMoved_(db, no, t) { return db.rows('StockMoves').some(function (v) { return String(v.RefNo) === no && String(v.RefType) === t; }); }
function officeChallanPost(token, no, ev, veh) {
  officeGate_(token, null);
  var env = oEnv_(), res = oStW_(token, oStSee_, function (env2, db, L) {
    var a = oAcc_(L), c = oChRow_(db, no), k = String(c.Kind);
    if (!oChCan_(a, k)) oFail_('NOACCESS');
    if (String(c.Status || 'Draft') !== 'Draft') oFail_('CHSTATE|' + String(c.Status));
    if (typeof ev !== 'number' || ev !== oChEv_(db, c)) oFail_('STALE');
    var day = oDay_(c.ChallanDate); if (!day || day > oDayOf_(env2.now())) oFail_('CHDATE');
    var v0 = oUncell_(c.Vehicle), v = veh == null || veh === '' ? v0.trim() : oQeTxt_(veh, 30, 'vehicle no.');
    if ((k === 'Delivery' || k === 'Sale') && !v) oFail_('BADINPUT|vehicle no.');
    if (!blank(c.JobNo)) { var j = find(db.rows('Jobs'), 'JobNo', c.JobNo); if (!j || String(j.Status) === 'Closed') oFail_('BADINPUT|job'); }
    oChSetup_(env2, db); c = oChRow_(db, no);
    oQeRate_(env2, L);
    if (oChMoved_(db, no, 'Challan')) { db.update('Challans', c, { Status: 'Posted', PostedAt: new Date(env2.now()) }); oCtLog_(db, 'Challan post finished', no, 'moves were in'); return { no: no }; } // an earlier post wrote its moves, then failed: finished, never moved twice
    if (v !== v0) db.update('Challans', c, { Vehicle: oCell_(v) });
    try { postChallan(db, no); }
    catch (e) {
      if (oChCode_(e)) throw e;
      var d2 = env2.db() || db; if (oChMoved_(d2, no, 'Challan')) oFail_('POSTUNSURE');
      try { if (v !== v0) d2.update('Challans', oChRow_(d2, no), { Vehicle: v0 }); } catch (x) { /* the vehicle no. stays; the challan is still a Draft */ }
      oFail_('NOTPOSTED|' + String(e && e.message || e).replace(/^Not posted:\s*/, '').replace(/\|/g, '/').slice(0, 1500));
    }
    return { no: no };
  });
  try { var p = oChPdfAs_(env, no, token); res.url = p.url; res.doc = p.doc; } catch (e) { res.url = ''; res.pdfErr = 1; }
  return res;
}
function officeChallanCancel(token, no, ev, why) {
  officeGate_(token, null);
  var env = oEnv_(), res = oStW_(token, oStSee_, function (env2, db, L) {
    var a = oAcc_(L), c = oChRow_(db, no), k = String(c.Kind), st = String(c.Status || 'Draft');
    if (st !== 'Posted' && st !== 'Draft') oFail_('CHSTATE|' + st);
    if (st === 'Posted' ? !oChHead_(a, k) : !oChCan_(a, k)) oFail_('NOACCESS');
    if (typeof ev !== 'number' || ev !== oChEv_(db, c)) oFail_('STALE');
    var r = oQeTxt_(why, 200, 'reason', true);
    oChSetup_(env2, db); c = oChRow_(db, no);
    oQeRate_(env2, L);
    if (st === 'Posted' && oChMoved_(db, no, 'Challan-Cancel')) { // an earlier cancel reversed the moves, then failed: finished, never reversed twice
      db.rows('Damage').filter(function (x) { return String(x.ChallanNo) === no && String(x.Status) !== 'Cancelled'; }).forEach(function (x) { db.update('Damage', x, { Status: 'Cancelled' }); });
      db.update('Challans', c, { Status: 'Cancelled' });
    } else {
      try { cancelChallan(db, no); }
      catch (e) { if (oChCode_(e)) throw e; var d2 = env2.db() || db; if (oChMoved_(d2, no, 'Challan-Cancel')) oFail_('POSTUNSURE'); oFail_('NOCANCEL|' + String(e && e.message || e).replace(/^Cannot cancel:\s*/, '').replace(/\|/g, '/').slice(0, 1500)); }
    }
    var out = { no: no, posted: st === 'Posted' };
    try { var d3 = env2.db() || db; d3.update('Challans', oChRow_(d3, no), { CancelReason: oCell_(r) }); } catch (e) { out.warn = 'REASON'; }
    var w = oCtLog_(db, 'Challan cancel reason', no, r); if (w) out.warn = w;
    return out;
  });
  if (res.posted) try { var p = oChPdfAs_(env, no, token); res.url = p.url; res.doc = p.doc; } catch (e) { res.pdfErr = 1; }
  delete res.posted;
  return res;
}
// The PDF is made outside the script lock (~10 s) with no link; the link goes in holding the script lock only if the challan is still as it
// was rendered (OCHP:no = its ev + the editable Doc); otherwise the new files go to the bin and the old link stays.
function oChPdf_(env, no) {
  var db = env.db(); if (!db) oFail_('BUSY');
  var c = oChRow_(db, no), ev = oChEv_(db, c), bin = [], k0 = OPDF_BIN_, st = QF5_STUB_ || {}, r;
  OPDF_BIN_ = bin;
  try { r = (st.make || makePdf)(db, 'Challan', no, { noLink: true }); } finally { OPDF_BIN_ = k0; }
  var url = String(r && r.url || ''), ids = oPdfIds_(r), ok = false, wr = false;
  var drop = function () { ids.forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* an unlinked copy may stay */ } }); };
  try {
    oScrLock_(function () {
      var d1 = env.db() || db, c1 = find(d1.rows('Challans'), 'ChallanNo', no);
      if (!url || !c1 || oChEv_(d1, c1) !== ev || d1.headers('Challans').indexOf('PDF') < 0) return;
      env.put('OCHP:' + no, { e: ev, d: String(r.doc || '') }); wr = true; d1.update('Challans', c1, { PDF: url }); ok = true;
    });
  } catch (e) { if (!wr) drop(); throw e; }
  if (!ok) { drop(); oFail_('BUSY'); }
  oBinNow_(bin, ids);
  return { url: url, doc: String(r.doc || '') };
}
function oChPdfAs_(env, no, token) { var L = officeGate_(token, null), prev = OQ_ACT_; OQ_ACT_ = 'office:' + L.email; try { return oChPdf_(env, no); } finally { OQ_ACT_ = prev; } }
function officeChallanPdf(token, no) {
  var L = officeGate_(token, null), a = oAcc_(L); if (!oStSee_(a)) oFail_('NOACCESS');
  var env = oEnv_(), db = env.db(); if (!db) oFail_('BUSY');
  var c = oChRow_(db, no), p = env.get('OCHP:' + String(c.ChallanNo));
  if (!blank(c.PDF) && p && p.e === oChEv_(db, c)) return { url: String(c.PDF), doc: typeof p.d === 'string' ? p.d : '' };
  if (!oChCan_(a, String(c.Kind))) { if (!blank(c.PDF)) return { url: String(c.PDF), doc: '' }; oFail_('NOPDF'); }
  var prev = OQ_ACT_; OQ_ACT_ = 'office:' + L.email;
  try { return oChPdf_(env, String(c.ChallanNo)); } finally { OQ_ACT_ = prev; }
}
// CR run 2: a sheet-panel PDF (pdf / quotePdf actions run without the script lock: a PDF takes 10-30 s) of a document an office edit
// changes meanwhile must not get a link made from the old data. Each edit counts its documents first (OPE: {n, d: [[no, n]], b}, under
// the script lock, before it writes); the panel reads n before it reads the sheet. CR run 9: the panel run makes the PDF without its link;
// after the run (its document lock let go) oPeCheck_ writes the link holding the script lock, only for a document not changed since n.
// The last 120 changes are kept by number; an older one dropped from the list lives on in b (256 buckets by document number: the highest
// change dropped there), so only a bucket clash makes another document's change count for this one.
var OPE_K_ = 'OPE', OPE_KEEP_ = 120, OPE_NB_ = 256, OPE_RUN_ = null; // OPE_RUN_ = {n, hit: [no], busy: [no], made: [{db, what, no, r, bin}]} while a panel PDF action runs
var OPE_DOC_ = { Quote: ['Quotes', 'QuoteNo'], Invoice: ['Invoices', 'InvNo'], Challan: ['Challans', 'ChallanNo'], PO: ['POs', 'PONo'], Note: ['Notes', 'NoteNo'] };
function oPeH_(no) { var s = String(no), h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000003; return h % OPE_NB_; }
function oPeGet_(env) {
  var p = env.get(OPE_K_); p = p && typeof p === 'object' ? p : {};
  var n = isFinite(+p.n) ? +p.n : 0, d = Array.isArray(p.d) ? p.d : [], b = Array.isArray(p.b) && p.b.length === OPE_NB_ ? p.b.map(function (x) { return isFinite(+x) ? +x : n; }) : null;
  if (!b) { // a record without buckets (before run 9): what it may have dropped counts as changed, as it did then
    var f = d.length >= OPE_KEEP_ ? (Array.isArray(d[0]) && isFinite(+d[0][1]) ? +d[0][1] - 1 : n) : (d.length ? 0 : n); b = [];
    for (var i = 0; i < OPE_NB_; i++) b.push(f > 0 ? f : 0);
  }
  return { n: n, d: d, b: b };
}
function oPeBump_(env, nos) {
  var u = (nos || []).filter(function (x, i, A) { return typeof x === 'string' && x && A.indexOf(x) === i; }); if (!u.length) return;
  var p = oPeGet_(env); u.forEach(function (x) { p.d.push([x, ++p.n]); });
  while (p.d.length > OPE_KEEP_) { var e = p.d.shift(); if (Array.isArray(e)) { var h = oPeH_(e[0]); if (+e[1] > p.b[h]) p.b[h] = +e[1]; } }
  env.put(OPE_K_, { n: p.n, d: p.d, b: p.b });
}
// CR run 3: the count is read under the script lock (briefly, before the panel's document lock: same order as withLock). Office writes
// flush before the lock is let go (env.lock), so an edit is wholly before this read (its writes in the sheet) or wholly after it (counted).
function oPeN_() {
  var env = oEnv_(); if (OLK_.s || (typeof LockService === 'undefined' && !OLK_.ls)) return oPeGet_(env).n;
  var l = oLs_().getScriptLock(); try { l.waitLock(30000); } catch (e) { throw new Error('The office app is busy saving a change. Try the PDF again in a moment.'); }
  OLK_.s++; OLK_.g++; try { return oPeGet_(env).n; } finally { OLK_.s--; OLK_.g++; l.releaseLock(); }
}
function oPeSince_(env, n0, no) { // a change to document no after count n0 (a dropped one: its bucket)
  var p = oPeGet_(env); if (p.n <= n0) return false;
  if (p.b[oPeH_(no)] > n0) return true;
  return p.d.some(function (x) { return Array.isArray(x) && String(x[0]) === String(no) && +x[1] > n0; });
}
// CR run 7: the script lock for a short write that must not interleave with another holder of it. A web app gets no document lock
// (LockService.getDocumentLock() is null there), so the office app's PDF link write and the panel's after-check below both use this one.
// Held already by this execution -> just runs (no second lock). Flushed before the lock is let go (as env.lock).
function oScrLock_(fn) {
  if (OLK_.s || (typeof LockService === 'undefined' && !OLK_.ls)) return fn();
  var l = oLs_().getScriptLock(); try { l.waitLock(30000); } catch (e) { oFail_('BUSY'); }
  OLK_.s++; OLK_.g++; var ok = false; try { var v = fn(); ok = true; return v; } finally { oLkEnd_(l, ok); }
}
// CR run 10: the exit of a script lock this execution took: count down, flush, let the lock go. A flush that fails after a failed
// operation does not hide that operation's error (e.g. BUSY after a rollback); after a good one the flush failure is the error.
function oLkEnd_(l, ok) { OLK_.s--; OLK_.g++; try { SpreadsheetApp.flush(); } catch (e) { if (ok) throw e; } finally { l.releaseLock(); } }
// CR run 6/7: a PDF link written by the office app (oQPdfMake_ makes outside the locks) goes in holding the script lock. The sheet panel's
// after-check (oPeCheck_) compares and clears holding the script lock too, after its PDF run let the document lock go -> the two never
// interleave, and the panel never holds both locks (no order inversion with its normal writes: script, then document).
// CR run 10: the cell already links a PDF made after this one (a later run published first and bins this one's file), or this file is in
// the bin already: this one must not be linked. Drive unreadable -> false (linked as before).
function oPdfNewer_(cur, url) {
  var a = oPdfIdOf_(cur), b = oPdfIdOf_(url); if (!b) return false;
  try { var B = DriveApp.getFileById(b); if (B.isTrashed() === true) return true; return !!a && a !== b && DriveApp.getFileById(a).getDateCreated().getTime() > B.getDateCreated().getTime(); } catch (e) { return false; }
}
function oPdfLinkSet_(db, t, k, no, url) {
  oScrLock_(function () { var r = find(db.rows(t), k, no); if (r && db.headers(t).indexOf('PDF') >= 0) db.update(t, r, { PDF: url }); });
}
// CR run 9: the panel PDF run's links, written once its document lock is let go, holding the script lock (as the office app's writes; the
// panel never holds both locks), in the rows as they are now: only for a document with no office change since the run's count. Changed,
// or the script lock busy for 30 s: no link (the cell keeps what it has now: blank after the change's clear, or a newer office link), the
// new files to the bin, the panel says to make it again. The old same-named copies go to the bin only once the new link is in.
function oPeCheck_(R) {
  var m = R && Array.isArray(R.made) ? R.made.splice(0) : []; if (!m.length) return;
  if (!Array.isArray(R.hit)) R.hit = []; if (!Array.isArray(R.busy)) R.busy = []; if (!Array.isArray(R.newer)) R.newer = [];
  var env = oEnv_(), bad = null;
  try {
    oScrLock_(function () {
      m.forEach(function (x) {
        if (bad) return;
        if (oPeSince_(env, R.n, x.no)) { x.st = 'old'; return; }
        try { var p = oPePub_(env, x); x.st = p === 'newer' ? 'newer' : p ? 'in' : 'none'; } catch (e) { x.st = 'fail'; bad = e; }
      });
    });
  } catch (e) { var em = String(e && e.message || e); if (em !== 'BUSY') throw new Error('The PDF was made, but its link may not have been saved (' + em + '). Make the PDF again.'); } // busy: nothing written; CR run 10: another failure (the flush) -> both copies kept, said plainly
  m.forEach(function (x) {
    var ids = oPdfIds_(x.r);
    if (x.st === 'in') { oBinNow_(x.bin, ids); oPeAfter_(x); return; }
    oPeKeep_(R, x); // CR run 12: not linked -> the previous PDF qf5Pdf_ asked to bin stays (the cell still opens it)
    if (x.st === 'none') return; // no PDF column / no row: nothing to link (as makePdf)
    if (x.st === 'newer') { R.newer.push(x.no); ids.forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* an unlinked copy may stay */ } }); return; } // CR run 10: a newer PDF is linked
    (x.st === 'old' ? R.hit : R.busy).push(x.no);
    if (x.st !== 'fail') ids.forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* an unlinked copy may stay */ } });
    try { log_(x.db, 'PDF out of date', x.no, (x.st === 'old' ? 'Changed in the office app while this PDF was made' : 'The office app was busy when this PDF was made') + '; link not kept (' + x.r.url + ')'); } catch (e) { /* the panel is told */ }
  });
  if (bad) throw new Error('The PDF was made, but its link could not be saved (' + (bad && bad.message || bad) + '). Make the PDF again.');
}
// CR run 12: in a panel PDF run qf5Pdf_ bins the previous quote PDF through this drive: the bin waits for oPeCheck_ ('in' -> oPeAfter_);
// a link not kept (office edit, busy, newer, a failed check) keeps that file, so the cell never links a binned file
function oPeDrive_(R, d0) {
  var nm = '';
  return { officePe_: d0, name: function (u) { nm = d0.name(u); return nm; },
    trash: function (u, b) { var x = R.made[R.made.length - 1], a = { u: u, b: b, nm: nm, d: d0 }; if (x) (x.after = x.after || []).push(a); else (R.kept = R.kept || []).push(nm); } };
}
function oPeAfter_(x) { (x.after || []).forEach(function (a) { try { a.d.trash(a.u, a.b); } catch (e) { /* already gone or no access (as qf5Pdf_) */ } }); }
function oPeKeep_(R, x) { (x.after || []).forEach(function (a) { (R.kept = R.kept || []).push(a.nm); }); }
function oPePub_(env, x) { // the link written (true); false = no row / no PDF column; 'newer' = a newer PDF is linked already
  if (typeof x.what !== 'string' || !oHas_(OPE_DOC_, x.what) || !x.r || !x.r.url) return false;
  var t = OPE_DOC_[x.what], d = env.db() || x.db;
  if (!d.hasTab(t[0]) || d.headers(t[0]).indexOf('PDF') < 0) return false;
  var row = find(d.rows(t[0]), t[1], x.no); if (!row) return false;
  if (oPdfNewer_(row.PDF, x.r.url)) return 'newer'; // CR run 10
  d.update(t[0], row, { PDF: String(x.r.url) });
  return true;
}
if (typeof makePdf === 'function' && !makePdf.officePe_) {
  var OPE_makePdf0_ = makePdf;
  makePdf = function (db, what, no, o) { // CR run 9: in a panel PDF run its link is not written here: oPeCheck_ writes it after the run
    var R = OPE_RUN_;
    if (!R || (o && o.noLink) || typeof what !== 'string' || !oHas_(OPE_DOC_, what)) return OPE_makePdf0_.apply(this, arguments);
    var o2 = {}; if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { o2[k] = o[k]; });
    var lg = !o2.noLog, k0 = OPDF_BIN_, bin = OPDF_BIN_ = [], r; o2.noLink = true; o2.noLog = true;
    try { r = OPE_makePdf0_.call(this, db, what, no, o2); } finally { OPDF_BIN_ = k0; }
    if (r && r.url) R.made.push({ db: db, what: what, no: String(no), r: r, bin: bin });
    if (lg && r) { try { log_(db, 'PDF', no, r.file + (r.placeholders ? ' · ' + r.placeholders + ' placeholders' : '')); } catch (e) { /* the PDF and its link go on (as the panel's other log lines) */ } } // as makePdf logs it
    return r;
  };
  makePdf.officePe_ = OPE_makePdf0_; makePdf.officePdf_ = OPE_makePdf0_.officePdf_;
}
if (typeof uiDo === 'function' && !uiDo.officePe_) {
  var OPE_uiDo0_ = uiDo;
  uiDo = function (action, args) {
    if (action !== 'pdf' && action !== 'quotePdf') return OPE_uiDo0_.apply(this, arguments);
    var k = OPE_RUN_, R = { n: oPeN_(), hit: [], busy: [], newer: [], made: [], kept: [] }, r, ok = false; OPE_RUN_ = R; // the count is read before the sheet is
    var dv = typeof QF5_DRIVE_ === 'object' && QF5_DRIVE_ ? QF5_DRIVE_ : null; if (dv) QF5_DRIVE_ = oPeDrive_(R, dv.officePe_ || dv); // CR run 12
    try { r = OPE_uiDo0_.apply(this, arguments); ok = true; } finally {
      if (dv) QF5_DRIVE_ = dv;
      OPE_RUN_ = k; // the run's document lock is let go here
      if (!ok) { try { oPeCheck_(R); } catch (e) { /* a PDF made before the failure gets its link too; the run's own error is reported */ } }
    }
    oPeCheck_(R);
    if (r && typeof r === 'object' && typeof r.msg === 'string') R.kept.forEach(function (n) { r.msg = r.msg.split(' (the old ' + n + ' went to the bin)').join(' (the old ' + n + ' was kept)'); }); // CR run 12
    var U = function (a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }).join(', '); };
    if ((R.hit.length || R.busy.length || R.newer.length) && r && typeof r === 'object') {
      r.warn = true; r.links = []; // CR run 9: no Open PDF / Doc for files whose link was not kept (they went to the bin)
      r.msg = String(r.msg == null ? '' : r.msg) + (R.hit.length ? '\n' + U(R.hit) + ' was changed in the office app while this PDF was being made, so its link was not kept. Make the PDF again.' : '')
        + (R.busy.length ? '\n' + U(R.busy) + ': the office app was busy, so the link was not saved. Make the PDF again.' : '')
        + (R.newer.length ? '\n' + U(R.newer) + ': a newer PDF was made meanwhile and is the one linked; this one was not kept.' : '');
    }
    return r;
  };
  uiDo.officePe_ = OPE_uiDo0_; uiDo.officeLk_ = OPE_uiDo0_.officeLk_;
}
// d = {no, ev, type, cust, site, attention, subject, date, valid, prep, adv, pdf, lines: [{code, desc, qty, unit, rate, opt, basis, dim}]}
function oQeArgs_(db, d, q, env) {
  if (OQE_TYPES_.indexOf(d.type) < 0) oFail_('BADINPUT|type');
  var cu = typeof d.cust === 'string' && d.cust ? find(db.rows('Customers'), 'CustID', d.cust) : null; if (!cu) oFail_('BADINPUT|customer');
  var si = typeof d.site === 'string' && d.site ? find(db.rows('Sites'), 'SiteID', d.site) : null; if (!si || String(si.CustID) !== String(cu.CustID)) oFail_('BADINPUT|project');
  var now = oQDn_(new Date(env.now())), dd = oDayOk_(d.date) ? oQDn_(oDayCell_(d.date)) : null, dv = oDayOk_(d.valid) ? oQDn_(oDayCell_(d.valid)) : null;
  if (dd == null || dd < oQDn_(new Date(2020, 0, 1)) || (now != null && dd > now + 366)) oFail_('BADINPUT|date');
  if (dv == null || dv - dd < 1 || dv - dd > 365) oFail_('BADINPUT|valid until');
  var prep = d.prep == null || d.prep === '' ? '' : (typeof d.prep === 'string' && find(db.rows('Staff'), 'StaffID', d.prep) ? d.prep : oFail_('BADINPUT|prepared by'));
  var adv = oQeNum_(d.adv, 0, 100, 2, 'advance');
  var att = oQeTxt_(d.attention, 120, 'attention'), sub = oQeTxt_(d.subject, 200, 'subject');
  if (!Array.isArray(d.lines) || !d.lines.length || d.lines.length > OQE_MAXL_) oFail_('BADINPUT|lines');
  var type = d.type === 'Project' && q && oQType_(q) === 'Service' ? 'Service' : d.type; // an old Service quote keeps its type + terms (one-off lines only)
  var units = uiList_(db, 'Unit').map(String), items = {}, mine = {};
  db.rows('Items').forEach(function (i) { items[String(i.ItemCode)] = i; });
  if (q) oQLines_(db, q.QuoteNo).forEach(function (l) { mine[String(l.ItemCode)] = 1; });
  var lines = d.lines.map(function (l, i) {
    var n = 'line ' + (i + 1) + ' ';
    if (!l || typeof l !== 'object' || Array.isArray(l)) oFail_('BADINPUT|' + n.trim());
    var code = l.code == null || l.code === '' ? '' : (typeof l.code === 'string' && Object.prototype.hasOwnProperty.call(items, l.code) && (oQeActive_(items[l.code]) || mine[l.code] === 1) ? l.code : oFail_('BADINPUT|' + n + 'item'));
    var desc = oQeDesc_(l.desc, n + 'description'), lump = l.basis === 'lump';
    if (l.basis != null && l.basis !== 'lump' && l.basis !== 'unit') oFail_('BADINPUT|' + n + 'rate basis');
    var u = typeof l.unit === 'string' && l.unit.length <= 40 ? oQeUnit_(l.unit) : oFail_('BADINPUT|' + n + 'unit');
    if (lump) u.u = 'lot';
    if (units.indexOf(u.u) < 0 || (u.mo && (type === 'Sale' || type === 'Service'))) oFail_('BADINPUT|' + n + 'unit');
    var qty = lump ? 1 : oQeNum_(l.qty, 0.001, 1e7, 3, n + 'qty'); if (!(qty > 0)) oFail_('BADINPUT|' + n + 'qty');
    var rate = oQeNum_(l.rate, 0, 1e9, 2, n + 'rate');
    if (l.opt != null && typeof l.opt !== 'boolean') oFail_('BADINPUT|' + n + 'optional');
    if (l.chosen != null && typeof l.chosen !== 'boolean') oFail_('BADINPUT|' + n + 'optional');
    if (qty * rate > 1e12) oFail_('BADINPUT|' + n + 'amount'); // an optional line the client chose (chosen) stays in the total
    var o = { ItemCode: code, Description: oCell_(desc), Unit: u.u, Qty: qty, Rate: rate, Billing: u.mo ? 'Monthly' : 'One-off', Months: u.mo ? 1 : '',
      Optional: l.opt === true ? 'Yes' : 'No', Selected: l.opt === true && l.chosen !== true ? 'No' : 'Yes', DimL: '', DimW: '', DimH: '', DimN: '', RateBasis: lump ? 'Lump sum' : '' };
    if (l.dim != null && !lump) {
      if (typeof l.dim !== 'object' || Array.isArray(l.dim)) oFail_('BADINPUT|' + n + 'size');
      var dn = function (k, whole) { var v = l.dim[k]; if (v === '' || v == null) return ''; return oQeNum_(v, 0.001, whole ? 1000 : 10000, whole ? 0 : 3, n + 'size'); };
      o.DimL = dn('L'); o.DimW = dn('W'); o.DimH = dn('H'); o.DimN = dn('N', true);
      if (o.DimL === '' || o.DimH === '') { if (o.DimL !== '' || o.DimW !== '' || o.DimH !== '' || o.DimN !== '') oFail_('BADINPUT|' + n + 'size'); }
      else o.RateBasis = 'Per unit';
      if (o.RateBasis && !(qfDim_(o, i).qty > 0 && qfDim_(o, i).qty <= 1e7 && qfDim_(o, i).qty * rate <= 1e12)) oFail_('BADINPUT|' + n + 'size');
      if (o.RateBasis && units.indexOf(qfDim_(o, i).unit) < 0) oFail_('BADINPUT|' + n + 'unit');
    }
    return o;
  });
  if (!att && !blank(cu.ContactPerson)) att = oUncell_(cu.ContactPerson).trim() + (blank(cu.Designation) ? '' : ', ' + oUncell_(cu.Designation).trim()); // here, as text (qfSaveQuoteFull_ would copy it raw)
  var h = { QuoteType: type, QuoteDate: oDayCell_(d.date), CustID: String(cu.CustID), SiteID: String(si.SiteID), Attention: oCell_(att), Subject: oCell_(sub), AdvancePct: Math.round(adv * 1e4) / 1e6, PreparedBy: prep };
  if (q) { // kept as they are on an edit (the screen does not show them)
    ['YourRef', 'Notes'].forEach(function (k) { if (!blank(q[k])) h[k] = oCell_(oUncell_(q[k])); });
    if (!blank(q.HireMonths)) h.HireMonths = num(q.HireMonths);
    if (!blank(q.MinMonths) && (type === 'Rental' || type === 'Project')) h.MinMonths = num(q.MinMonths);
    ['VATPct'].concat(typeof QF4_COLS_ !== 'undefined' ? QF4_COLS_ : []).forEach(function (k) { if (!blank(q[k])) h[k] = num(q[k]); });
  }
  return { a: { quoteNo: q ? String(q.QuoteNo) : '', header: h, lines: lines, customer: { mode: 'existing', id: String(cu.CustID) }, site: { mode: 'existing', id: String(si.SiteID) } }, days: dv - dd };
}
// W4g: would this save change any cell? The same save (every wrapper of saveQuoteFull) runs on a copy-on-read shadow of the
// lock's batch (a tab's rows are copied when first read; writes stay in the copy). Any error, another type, other validity days,
// a new tab / column, another row count or any cell that would differ = changed -> the normal save runs as before. Log not compared.
function OW4gShadow_(db) { this.b = db; this.h = {}; this.t = {}; this.nt = {}; this.ow4gL_ = uiLists_(db); }
if (typeof MemDb === 'function') {
  OW4gShadow_.prototype = Object.create(MemDb.prototype);
  OW4gShadow_.prototype.hasTab = function (t) { return !!this.h[t] || this.b.hasTab(t); };
  OW4gShadow_.prototype.headers = function (t) { if (!this.h[t]) this.h[t] = this.b.headers(t).slice(); return this.h[t]; };
  OW4gShadow_.prototype.rows = function (t) { this.headers(t); if (!this.t[t]) this.t[t] = this.b.rows(t).map(function (r) { return Object.assign({}, r); }); return this.t[t]; };
  OW4gShadow_.prototype.wr = function (o) { if (!Object.prototype.hasOwnProperty.call(o, '__w4g')) Object.defineProperty(o, '__w4g', { value: {}, enumerable: false }); return o.__w4g; }; // cells this save wrote
  OW4gShadow_.prototype.update = function (t, o, patch) { var h = this.headers(t), w = this.wr(o); Object.keys(patch).forEach(function (k) { if (h.indexOf(k) < 0) throw new Error(t + ': no column ' + k); o[k] = patch[k]; w[k] = 1; }); }; // CR 3: the raw value stays in the row, as in the SheetDb cache
  OW4gShadow_.prototype.insert = function (t, objs) { if (t === 'Log' && !this.nt.Log) return objs; this.rows(t); var h = this.headers(t), self = this, r = MemDb.prototype.insert.call(this, t, objs); this.t[t].slice(-(Array.isArray(objs) ? objs.length : 1)).forEach(function (o) { var w = self.wr(o); h.forEach(function (k) { w[k] = 1; }); }); return r; }; // CR 2 + 3: the stored rows (whatever MemDb keeps) marked as written, raw values as in the cache // review M5: a Log row is not compared -> the Log tab is never read
  OW4gShadow_.prototype.ensureTab = function (t, headers) { if (this.hasTab(t)) return false; this.h[t] = headers.slice(); this.t[t] = []; this.nt[t] = 1; return true; };
  OW4gShadow_.prototype.ensureColumn = function (t, col, after) { this.rows(t); return MemDb.prototype.ensureColumn.call(this, t, col, after); };
}
// what the sheet keeps for a written value: the write adds a leading ' (cellVal_ / oCell_) that the sheet takes as "this is text" and drops
function oW4gStore_(v) { v = cellVal_(v); return typeof v === 'string' && v.charAt(0) === "'" ? v.slice(1) : v; }
function oW4gCell_(o, k) { return o.__w4g && o.__w4g[k] ? oW4gStore_(o[k]) : o[k]; } // a shadow cell as the sheet would hold it after the save
function oW4gEq_(a, b) { // a = what the save would store (oW4gStore_), b = the sheet's value now; strict (another type = a change)
  if (a == null) a = ''; if (b == null) b = '';
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  return a === b;
}
function oW4gSame_(db, q, x, ty0) {
  if (typeof MemDb !== 'function' || !(OW4gShadow_.prototype instanceof MemDb) || String(x.a.header.QuoteType) !== ty0) return false;
  try {
    if (db.headers('Quotes').indexOf('ValidityDays') >= 0) { var std = num(S(db, 'QuoteValidityDays', 30)), v = x.days === std ? '' : x.days; if (String(q.ValidityDays == null ? '' : q.ValidityDays) !== String(v)) return false; }
    var a = x.a, sh = new OW4gShadow_(db), cp = function (o) { return o && typeof o === 'object' ? Object.assign({}, o) : o; };
    UI_ACTIONS_.saveQuoteFull(sh, { quoteNo: a.quoteNo, header: cp(a.header), lines: a.lines.map(cp), customer: cp(a.customer), site: cp(a.site) });
    for (var t in sh.h) {
      if (t === 'Log') continue;
      if (sh.nt[t]) return false; // a new tab (the shadow read every other one from the batch)
      var h1 = sh.h[t]; if (db.headers(t).length !== h1.length) return false;
      if (!sh.t[t]) continue;
      var r0 = db.rows(t), r1 = sh.t[t]; if (r0.length !== r1.length) return false;
      for (var i = 0; i < r1.length; i++) for (var k = 0; k < h1.length; k++) if (!oW4gEq_(oW4gCell_(r1[i], h1[k]), r0[i][h1[k]])) return false;
    }
    return true;
  } catch (e) { return false; }
}
function officeQuoteSave(token, d) {
  officeGate_(token, OQ_NEED_);
  if (!d || typeof d !== 'object' || Array.isArray(d)) oFail_('BADINPUT|quote');
  // CR run 17 L2334: a new quote whose write went in, then a later step or the lock-exit flush failed -> SAVEUNSURE|no|ev: the page keeps
  // the number, so Save again edits that quote (no second Draft). A save that did not get that far keeps its own error.
  var made = null, res;
  try { res = oQW_(token, function (env, db, L) {
    if (!oCanSeeMoney_(oAcc_(L))) oFail_('NOACCESS');
    var no = d.no == null || d.no === '' ? '' : d.no, q = no ? oQRow_(db, no) : null;
    if (q) { oQRevFix_(env, db, q.QuoteNo); q = oQRow_(db, no); }
    if (q) { if (oQLocked_(db, q)) oFail_('QLOCKED'); if (typeof d.ev !== 'number' || d.ev !== oQeEv_(db, q)) oFail_('STALE'); oQeOld_(db, q.QuoteNo); }
    oQeRate_(env, L);
    if (!oIsDir_(oAcc_(L)) && !(d.prep == null || d.prep === '' || (typeof d.prep === 'string' && !!L.staff && d.prep === String(L.staff)))) oFail_('BADINPUT|prepared by'); // D2: own name only
    var x = oQeArgs_(db, d, q, env), was = q ? String(q.Status || 'Draft') : '', ty0 = q ? oQType_(q) : '';
    if (q && oW4gSame_(db, q, x, ty0)) { // W4g: nothing would change -> no row write, no Log, no refetch; the view from this lock's batch
      var o5 = { no: String(q.QuoteNo), rev: num(q.Rev), status: String(q.Status || 'Draft'), was: was, changed: false, ev: d.ev };
      if (d.pdf !== true) try { var db5 = env.db() || db; o5.view = oQView_(db5, env, oQRow_(db5, q.QuoteNo), L); } catch (e) { delete o5.view; }
      return o5;
    }
    if (q) oPeBump_(env, [String(q.QuoteNo)]); // CR run 4/6: counted before anything is written (the pending-revision record too; a new quote has no PDF yet)
    var r, rk = q ? 'OQRV:' + String(q.QuoteNo) : '';
    if (q && was === 'Sent') env.put(rk, { rev: num(q.Rev) + 1, at: env.now() }); // CR10: before the lines are written; dropped below if nothing changed
    try { r = UI_ACTIONS_.saveQuoteFull(db, x.a); }
    catch (e) { if (rk) env.del(rk); var m = String(e && e.message || e); if (/^[A-Z]{3,}(\|.*)?$/.test(m)) throw e; oFail_('SAVEFAIL|' + m.replace(/[\r\n]+/g, ' ').slice(0, 160)); }
    var ref = String(r.ref); if (!q) made = { no: ref };
    var d2 = env.db() || db, q2 = must(d2, 'Quotes', 'QuoteNo', ref), p = {};
    if (d2.headers('Quotes').indexOf('ValidityDays') >= 0) { var std = num(S(d2, 'QuoteValidityDays', 30)), v = x.days === std ? '' : x.days; if (String(q2.ValidityDays == null ? '' : q2.ValidityDays) !== String(v)) p.ValidityDays = v; }
    var changed = !q || oQeEv_(d2, q2) !== d.ev || ('ValidityDays' in p); // a save that changed nothing makes no new Rev
    if (q && changed) oQPdfStale_(env, d2, ref, true); else if (rk) env.del(rk); // CR7 first, before any other write; CR10 record kept only for a change
    if (q && ty0 !== String(x.a.header.QuoteType)) { // CR11: another type = its standard terms (this quote's changes dropped)
      uiDelRows_(d2, 'QuoteTerms', qtRows_(d2, ref));
      ['PaymentDays', 'NoticeDays', 'LateInterestPct', 'PartPeriodRule'].forEach(function (k) { if (d2.headers('Quotes').indexOf(k) >= 0 && !blank(q2[k])) p[k] = ''; });
    }
    if (was === 'Sent' && changed) { p.Rev = num(q2.Rev) + 1; p.Status = 'Draft'; } // CR10: the OQRV record above is kept until this is written
    if (Object.keys(p).length) uiPutRow_(d2, 'Quotes', q2, p);
    if (p.Rev != null) { try { log_(d2, 'Quote revised', ref, 'Rev ' + p.Rev + ' (edited in the web app)'); } catch (e) { /* log only */ } env.del('OQRV:' + ref); }
    var d3 = env.db() || d2, q3 = must(d3, 'Quotes', 'QuoteNo', ref), out = { no: ref, rev: num(q3.Rev), status: String(q3.Status || 'Draft'), was: was, changed: changed };
    try { out.ev = oQeEv_(d3, q3); } catch (e) { /* W4g: the page then opens the form again for the next save */ }
    if (made) made.ev = out.ev;
    if (d.pdf !== true) try { var db4 = env.db(); if (db4) out.view = oQView_(db4, env, oQRow_(db4, ref), L); } catch (e) { delete out.view; } // W4f: in the lock = this lock's batch (no 4th read); the save stands either way
    return out;
  }); } catch (e) { if (made) oFail_('SAVEUNSURE|' + made.no + '|' + (typeof made.ev === 'number' ? made.ev : '')); throw e; }
  if (d.pdf === true) {
    try { var L2 = officeGate_(token, OQ_NEED_), env = oEnv_(), db = env.db(); res.pdf = String(oQPdfUse_(env, db, oQRow_(db, res.no), L2).url || ''); }
    catch (e) { res.pdf = ''; res.pdfErr = String(e && e.message || e).split('|')[0].slice(0, 40); }
  }
  // W4c: the quote view comes back with the save (the page shows it without a second call); fresh read, same rules as officeQuoteGet
  if (!res.view) try { var L3 = officeGate_(token, OQ_NEED_), env3 = oEnv_(), db3 = env3.db(); if (db3) res.view = oQView_(db3, env3, oQRow_(db3, res.no), L3); }
  catch (e) { delete res.view; /* the save stands; the page loads the view itself (a session that ended meanwhile is told there) */ }
  return res;
}
// Quote PDF price grid: # Description Size Qty Unit Rate Amount (the same 7 columns as the screen)
function oQePdfGrid_(db, no, spec) {
  var g = null, note = null;
  (spec.blocks || []).forEach(function (b) { if (!g && b.t === 'grid' && b.cols && b.cols[1] && b.cols[1].h === 'Description') g = b; if (!note && b.t === 'p' && typeof b.text === 'string' && /^Amount = /.test(b.text)) note = b; });
  if (!g) return spec;
  var items = {}, lines = oQLines_(db, no).filter(function (l) { return l.Selected === 'Yes' || l.Optional === 'Yes'; }), more = false;
  db.rows('Items').forEach(function (i) { items[String(i.ItemCode)] = i; });
  g.cols = [{ h: 'No.', w: 24, al: 'C' }, { h: 'Description', w: 160 }, { h: 'Size', w: 70 }, { h: 'Qty', w: 36, al: 'R' }, { h: 'Unit', w: 50 }, { h: 'Rate (BDT)', w: 57, al: 'R' }, { h: 'Amount (BDT)', w: 85, al: 'R' }];
  g.rows = lines.map(function (l, i) {
    var amt = lineAmt(l), off = l.Selected !== 'Yes', m = blank(l.Months) ? 0 : num(l.Months), ms = typeof isMilestone === 'function' && isMilestone(l);
    var u = dash(l.Unit) + (ms ? ' (stages)' : m > 0 ? ' / month' : '') + (m > 1 && !ms ? ' × ' + qtyTxt(m) : '');
    if (m > 1 && !ms) more = true;
    return [String(i + 1), (l.Optional === 'Yes' ? 'Optional: ' : '') + dash(l.Description), oQeSizeOf_(l, items) || '—', qtyTxt(l.Qty), u, tk(l.Rate), off ? '(' + tk(amt) + ')' : tk(amt)];
  });
  if (note) note.text = note.text.replace(/^Amount = [^.]*\./, 'Amount = Qty × Rate' + (more ? ' (× months where shown)' : '') + '.');
  return spec;
}
// inside the D1 footer wrapper (docCtl is added after the grid, the officeCtl_ marker stays). The self-tests of the earlier
// layers (PDF.gs P24, QF1b G26) check their own grid, so they run with the W4 grid off; O266 / O267 check the W4 grid.
var OQE_GRID_ = true;
if (typeof PDF_SPECS === 'object' && PDF_SPECS && typeof PDF_SPECS.Quote === 'function') {
  var OQE_spec0_ = PDF_SPECS.Quote.officeCtl_ || PDF_SPECS.Quote;
  PDF_SPECS.Quote = oCtlWrap_('Quote', function (db, no) { var sp = OQE_spec0_.apply(this, arguments); if (!OQE_GRID_) return sp; try { return oQePdfGrid_(db, no, sp); } catch (e) { return sp; } });
}
function oQeNoGrid_(f) { return typeof f !== 'function' ? f : function () { var k = OQE_GRID_; OQE_GRID_ = false; try { return f.apply(this, arguments); } finally { OQE_GRID_ = k; } }; }
if (typeof selfTestPdf === 'function') selfTestPdf = oQeNoGrid_(selfTestPdf);
if (typeof selfTestQF1b === 'function') selfTestQF1b = oQeNoGrid_(selfTestQF1b);
function oQeScopeAdd_(db) {
  var h = db.headers('Items'), have = {}, add = [];
  db.rows('Items').forEach(function (i) { have[String(i.ItemCode)] = 1; });
  OQE_SCOPES_.forEach(function (s) {
    if (have[s[0]]) return;
    var r = {}, v = { ItemCode: s[0], Name: s[1], Category: OQE_SCOPE_CAT_, Unit: 'm²', StockTracked: 'No', ForSale: 'No', ForHire: 'No', IsSet: 'No', Status: 'Active' };
    Object.keys(v).forEach(function (k) { if (h.indexOf(k) >= 0) r[k] = v[k]; });
    add.push(r);
  });
  if (add.length) { db.insert('Items', add); log_(db, 'Items added', add.map(function (r) { return r.ItemCode; }).join(', '), 'W4 project scopes'); }
  return add.length;
}
function officeScopeItemsAdd() { var env = oEnv_(), n = env.lock(function () { return oQeScopeAdd_(env.db()); }); Logger.log('Project scope items added: ' + n); return n; }

// ----------------------------------------------------------------- D2 (18 Nov): signatures + company stamp on every system PDF
// Rules (user, 18 Nov): signer = the preparer. Commercial documents (quote, proforma, invoice, debit / credit note, PO) are
// signed by PreparedBy automatically (quote: its PreparedBy; proforma: its quote's; invoice / note / PO have no PreparedBy
// column -> the name picked when the PDF is made, else unsigned). Other documents (challans, transfer notes): optional, the
// person making the PDF picks a name or leaves it unsigned. Every PDF: company stamp + the line OSG_LINE_. No signature on
// file -> name + title + an empty sign line (never refused). A Staff row that is not Active never signs with an image.
// Store: private Drive folder "Signatures (directors)" (OSG_FOLDER_, owner only). Script Properties OSG:<StaffID> and
// OSG_STAMP = {f: file id, by, at, n: bytes, m: mime}. Images never go to other users' browsers: lists say on file yes / no;
// the image itself only to that person or a Director. Uploads: PNG / JPEG only (checked by their bytes, not the name),
// <= 1 MB, 16..8000 px a side, <= 25 megapixels; the old system-made file is binned on replace (seed files are left in the folder).
// officeSigSeed (editor, run once, safe to repeat): the 4 director signatures + the MOU stamp.
var OSG_FOLDER_ = '1QywJPfmepRZsiE5Ay6UPrvzdFuWVyBAr';
// 18 Nov (user): STF-002 + STF-004 = the signatures of the MOU soft copy (were Signature_3 ... Jamal_Uddin.png + ..._HD_black.png)
var OSG_SEED_ = [['STF-002', '1mXoXkAwuOT78-W-2liOmqwRMSvolwy7n'], ['STF-004', '1hbcIkXI5bK-gaaHRFgQkYYFd2fEzRGIf'],
  ['STF-005', '12UKYwC05dagdVlkFsE-qK34gVO2RtTFo'], ['STF-006', '1w7Qr_8zJ6TCWJ7RjpexSAMFdlLana7PP']];
var OSG_STAMP_SEED_ = '1-UaQigrHwvVFfn3SFv8MOGiDJlkJpYns';
var OSG_MAX_ = 1048576, OSG_PER_HOUR_ = 20;
var OSG_COMM_ = { Quote: 1, PI: 1, Invoice: 1, Note: 1, PO: 1 };
var OSG_LINE_ = 'Digitally generated by the Core Access Ops system — valid without signature.';
var OSG_HEAD_ = 'For and on behalf of Core Access Engineering Ltd.';
var OSG_DRV_ = null, OSG_PICK_ = null, OSG_NOIMG_ = false, OSG_IMGUSED_ = false, OSG_FELL_ = false; // tests set OSG_DRV_; OSG_PICK_ = signer picked for the PDF being made (StaffID)
function oSgDrv_() {
  return OSG_DRV_ || {
    file: function (id) { try { var f = DriveApp.getFileById(id); return f.isTrashed() ? null : f; } catch (e) { return null; } },
    info: function (id) { var f = this.file(id); return f ? { size: f.getSize(), mime: f.getMimeType(), name: f.getName() } : null; },
    blob: function (id) { var f = this.file(id); return f ? f.getBlob() : null; },
    b64: function (id) { var f = this.file(id); return f && f.getSize() <= 1.5 * OSG_MAX_ ? Utilities.base64Encode(f.getBlob().getBytes()) : null; },
    add: function (name, mime, bytes) {
      return DriveApp.getFolderById(OSG_FOLDER_).createFile(Utilities.newBlob(bytes.map(function (x) { return x << 24 >> 24; }), mime, name)).getId();
    },
    bin: function (id) { try { DriveApp.getFileById(id).setTrashed(true); return true; } catch (e) { return false; } },
    decodes: function (bytes, mime) { // CR5: Apps Script converts the picture (a full decode); a broken one throws
      try { var o = Utilities.newBlob(bytes.map(function (x) { return x << 24 >> 24; }), mime, 'check').getAs(mime === 'image/png' ? 'image/jpeg' : 'image/png'); return !!o && o.getBytes().length > 0; }
      catch (e) { return false; }
    }
  };
}
var OSG_B64_ = (function () { var m = {}, a = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; for (var i = 0; i < 64; i++) m[a.charAt(i)] = i; return m; })();
// base64 text -> bytes 0..255, or null. Strict: only the base64 alphabet, padding at the end, length a multiple of 4.
function oB64Dec_(s) {
  if (typeof s !== 'string' || s.length % 4 || s.length > Math.ceil(OSG_MAX_ / 3) * 4 + 4 || !/^[A-Za-z0-9+\/]*={0,2}$/.test(s)) return null;
  var out = [], pad = s.charAt(s.length - 1) === '=' ? (s.charAt(s.length - 2) === '=' ? 2 : 1) : 0;
  for (var i = 0; i < s.length; i += 4) {
    var n = (OSG_B64_[s.charAt(i)] << 18) | (OSG_B64_[s.charAt(i + 1)] << 12) | ((OSG_B64_[s.charAt(i + 2)] || 0) << 6) | (OSG_B64_[s.charAt(i + 3)] || 0);
    out.push(n >>> 16 & 255, n >>> 8 & 255, n & 255);
  }
  if (pad) out.length -= pad;
  return out;
}
// bytes -> {mime, w, h} or throws BADIMG|<why>. PNG: signature, IHDR first, IEND last. JPEG: SOI, a frame header (SOF), EOI.
function oSgImg_(b) {
  var bad = function (w) { oFail_('BADIMG|' + w); };
  if (!b || !b.length) bad('type');
  if (b.length > OSG_MAX_) bad('size');
  var u32 = function (i) { return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0; }, w, h, mime;
  var png = [137, 80, 78, 71, 13, 10, 26, 10];
  if (png.every(function (x, i) { return b[i] === x; })) {
    if (b.length < 45 || String.fromCharCode(b[12], b[13], b[14], b[15]) !== 'IHDR' || u32(8) !== 13) bad('broken');
    var p = 8, idat = false, ty = '';
    while (p + 12 <= b.length) { // walk the chunks: each length must fit, IDAT present, IEND exactly at the end
      var n = u32(p); ty = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
      if (n > b.length - p - 12) bad('broken');
      if (ty === 'IDAT') idat = idat || n > 0;
      p += 12 + n;
      if (ty === 'IEND') break;
    }
    if (ty !== 'IEND' || p !== b.length || !idat) bad('broken');
    w = u32(16); h = u32(20); mime = 'image/png';
  } else if (b[0] === 255 && b[1] === 216 && b[2] === 255) {
    var end = b.length; while (end > 2 && b[end - 1] === 0) end--;
    if (end < 4 || b[end - 2] !== 255 || b[end - 1] !== 217) bad('broken');
    var i = 2, sos = false;
    while (i + 9 < end) {
      if (b[i] !== 255) bad('broken');
      var mk = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
      if (mk === 255) { i++; continue; }
      if (len < 2) bad('broken');
      if (i + 2 + len > end) bad('broken');
      if ((mk === 192 || mk === 193 || mk === 194) && !w) { if (len < 11) bad('broken'); h = (b[i + 5] << 8) | b[i + 6]; w = (b[i + 7] << 8) | b[i + 8]; }
      else if (mk >= 195 && mk <= 207 && mk !== 196 && mk !== 200 && mk !== 204) bad('type'); // lossless / arithmetic JPEG: not for Docs
      if (mk === 218) { sos = true; break; } // scan data starts
      i += 2 + len;
    }
    if (!w || !h || !sos) bad('broken');
    mime = 'image/jpeg';
  } else bad('type');
  if (w < 16 || h < 16 || w > 8000 || h > 8000 || w * h > 25e6) bad('pixels'); // Google Docs takes images up to 25 megapixels
  return { mime: mime, w: w, h: h };
}
function oSgStaff_(db, id) {
  id = typeof id === 'string' ? id.trim() : '';
  if (!id || id.length > 40) return null;
  return db.rows('Staff').filter(function (s) { return oUncell_(s.StaffID).trim() === id; })[0] || null;
}
function oSgActive_(s) { return !!s && (!oHas_(s, 'Status') || blank(s.Status) || /^active$/i.test(String(s.Status).trim())); }
function oSgRec_(env, key) { var r = env.get(key); return r && typeof r.f === 'string' && /^[\w-]{10,80}$/.test(r.f) ? r : null; }
// Who may see / change the signature of this Staff record: the login linked to it, or a Director.
function oSgMay_(L, staffId) { return oIsDir_(oAcc_(L)) || (!!L.staff && String(L.staff) === staffId); }
function oSgSlow_(env, email, read) { // writes 20 an hour, reads 120 an hour per login (cache count: may be a little loose under parallel calls)
  var k = (read ? 'OSG_R:' : 'OSG_N:') + email, c = env.cget(k) || { n: 0 }, n = (+c.n || 0) + 1;
  env.cput(k, { n: n }, 3600);
  if (n > (read ? 6 * OSG_PER_HOUR_ : OSG_PER_HOUR_)) oFail_('SLOW');
}
function oSgView_(env, staffId, row, withImg) {
  var r = oSgRec_(env, 'OSG:' + staffId), d = oSgDrv_(), i = r ? d.info(r.f) : null, o = { staff: staffId, name: row ? oUncell_(row.Name) : '', title: row ? oUncell_(row.Role) : '',
    on: !!i, at: r && i ? +r.at || 0 : 0, by: r && i ? String(r.by || '') : '', bytes: i ? i.size : 0, img: '' };
  if (withImg && i && /^image\/(png|jpeg)$/.test(i.mime)) { var b = d.b64(r.f); if (b) o.img = 'data:' + i.mime + ';base64,' + b; }
  return o;
}
function officeSigGet(token, staffId) {
  var L = officeGate_(token, null), env = oEnv_(); oSgSlow_(env, L.email, true);
  var db = env.db(), row = oSgStaff_(db, staffId);
  if (!row) oFail_(oIsDir_(oAcc_(L)) ? 'NOSTAFF' : 'NOACCESS');
  if (!oSgMay_(L, oUncell_(row.StaffID).trim())) oFail_('NOACCESS');
  return oSgView_(env, oUncell_(row.StaffID).trim(), row, true);
}
// Saves one image (base64 text) as this person's signature (kind 'sig') or the company stamp (kind 'stamp', Directors only).
function oSgPut_(token, pre, kind, staffId, b64) {
  var env = oEnv_();
  oSgSlow_(env, pre.email); // every try counts, refused ones too
  if (kind === 'stamp' ? !oIsDir_(oAcc_(pre)) : (typeof staffId !== 'string' || !staffId)) oFail_(kind === 'stamp' ? 'NOACCESS' : 'NOSTAFF');
  if (kind === 'sig' && !oIsDir_(oAcc_(pre)) && String(pre.staff || '') !== staffId.trim()) oFail_('NOACCESS'); // before any work
  var bytes = oB64Dec_(b64);
  if (!bytes) oFail_(typeof b64 === 'string' && b64.length > Math.ceil(OSG_MAX_ / 3) * 4 + 4 ? 'BADIMG|size' : 'BADIMG|type');
  var im = oSgImg_(bytes);
  if (!oSgDrv_().decodes(bytes, im.mime)) oFail_('BADIMG|broken'); // before anything is written or binned
  return env.lock(function () {
    var L = officeSession_(token), now = env.now(), db = env.db(), key, name, row = null;
    if (kind === 'stamp') { if (!oIsDir_(oAcc_(L))) oFail_('NOACCESS'); key = 'OSG_STAMP'; name = 'CoreAccess_Company_Stamp_' + now; }
    else {
      row = oSgStaff_(db, staffId);
      if (!row) oFail_(oIsDir_(oAcc_(L)) ? 'NOSTAFF' : 'NOACCESS');
      staffId = oUncell_(row.StaffID).trim();
      if (!oSgMay_(L, staffId)) oFail_('NOACCESS');
      key = 'OSG:' + staffId; name = 'Signature_' + staffId.replace(/[^\w-]/g, '') + '_' + now;
    }
    var d = oSgDrv_(), old = oSgRec_(env, key), id = d.add(name + (im.mime === 'image/png' ? '.png' : '.jpg'), im.mime, bytes);
    env.put(key, { f: id, by: L.email, at: now, n: bytes.length, m: im.mime, w: im.w, h: im.h, sys: 1 });
    if (old && old.sys === 1 && old.f !== id) d.bin(old.f); // seed files (user's own masters) stay in the folder
    try { log_(db, kind === 'stamp' ? 'Company stamp' : 'Signature', kind === 'stamp' ? '' : staffId, 'saved by ' + L.email + ' (' + bytes.length + ' bytes)'); } catch (e) { /* log only */ }
    return kind === 'stamp' ? oSgStampView_(env, false) : oSgView_(env, staffId, row, false);
  });
}
function officeSigSave(token, staffId, b64) { var L = officeGate_(token, null); return oSgPut_(token, L, 'sig', staffId, b64); }
function officeStampSave(token, b64) { var L = officeGate_(token, null); return oSgPut_(token, L, 'stamp', '', b64); }
function officeSigRemove(token, staffId) {
  var L = officeGate_(token, null), env = oEnv_();
  oSgSlow_(env, L.email);
  if (!oIsDir_(oAcc_(L)) && String(L.staff || '') !== String(staffId || '').trim()) oFail_('NOACCESS');
  return env.lock(function () {
    var L = officeSession_(token), db = env.db(), row = oSgStaff_(db, staffId);
    if (!row) oFail_(oIsDir_(oAcc_(L)) ? 'NOSTAFF' : 'NOACCESS');
    var id = oUncell_(row.StaffID).trim();
    if (!oSgMay_(L, id)) oFail_('NOACCESS');
    var old = oSgRec_(env, 'OSG:' + id);
    env.put('OSG:' + id, { off: 1, by: L.email, at: env.now() }); // a removed one stays removed (the seed skips it)
    if (old && old.sys === 1) oSgDrv_().bin(old.f);
    try { log_(db, 'Signature', id, 'removed by ' + L.email); } catch (e) { /* log only */ }
    return oSgView_(env, id, row, false);
  });
}
function oSgStampView_(env, withImg) {
  var r = oSgRec_(env, 'OSG_STAMP'), d = oSgDrv_(), i = r ? d.info(r.f) : null, o = { on: !!i, name: i ? String(i.name) : '', bytes: i ? i.size : 0, at: r && i ? +r.at || 0 : 0, by: r && i ? String(r.by || '') : '', img: '' };
  if (withImg && i && /^image\/(png|jpeg)$/.test(i.mime)) { var b = d.b64(r.f); if (b) o.img = 'data:' + i.mime + ';base64,' + b; }
  return o;
}
function officeStampGet(token) { var L = officeGate_(token, null), env = oEnv_(); oSgSlow_(env, L.email, true); if (!oIsDir_(oAcc_(L))) oFail_('NOACCESS'); return oSgStampView_(env, true); }
// Editor, run once (safe to repeat): records for the 4 director signatures + the company stamp (files already in Drive).
function oSgSeed_(env) {
  var d = oSgDrv_(), out = [], now = env.now();
  OSG_SEED_.forEach(function (x) {
    var cur = env.get('OSG:' + x[0]);
    if (cur) { out.push(x[0] + (cur.off ? ' removed earlier (left off)' : ' kept')); return; }
    var i = d.info(x[1]);
    if (!i) { out.push(x[0] + ' FILE MISSING'); return; }
    env.put('OSG:' + x[0], { f: x[1], by: 'seed', at: now, n: i.size, m: i.mime }); out.push(x[0] + ' added');
  });
  if (env.get('OSG_STAMP')) out.push('stamp kept');
  else { var s = d.info(OSG_STAMP_SEED_); if (s) { env.put('OSG_STAMP', { f: OSG_STAMP_SEED_, by: 'seed', at: now, n: s.size, m: s.mime }); out.push('stamp added'); } else out.push('stamp FILE MISSING'); }
  return out.join(', ');
}
function officeSigSeed() { var env = oEnv_(), r = env.lock(function () { return oSgSeed_(env); }); Logger.log('Signatures: ' + r); return r; }
// Editor only: points records the seed made at the current OSG_SEED_ files (a record a person uploaded or removed is left alone).
function oSgReseed_(env) {
  var d = oSgDrv_(), out = [], now = env.now();
  OSG_SEED_.forEach(function (x) {
    var cur = env.get('OSG:' + x[0]);
    if (cur && (cur.by !== 'seed' || cur.off || cur.f === x[1])) { out.push(x[0] + ' left'); return; }
    var i = d.info(x[1]);
    if (!i) { out.push(x[0] + ' FILE MISSING'); return; }
    env.put('OSG:' + x[0], { f: x[1], by: 'seed', at: now, n: i.size, m: i.mime }); out.push(x[0] + (cur ? ' replaced' : ' added'));
  });
  return out.join(', ');
}
function officeSigReseed() { var env = oEnv_(), r = env.lock(function () { return oSgReseed_(env); }); Logger.log('Signatures: ' + r); return r; }

// ---- PDF side. Signer {id, name, title, sig: file id or ''} resolved when the spec is made (the file id is part of the spec,
// so a new signature gives a new PDF version). Names: StaffID first, else the Staff name (case / spaces ignored), else the
// text as typed (no title, no image).
function oSgSigner_(db, who) {
  var w = oUncell_(who).trim();
  if (!w) return null;
  var st = db.rows('Staff'), k = function (v) { return oUncell_(v).trim().replace(/\s+/g, ' ').toLowerCase(); };
  var m = st.filter(function (x) { return oUncell_(x.StaffID).trim() === w; });
  if (!m.length) m = st.filter(function (x) { return k(x.Name) && k(x.Name) === k(w); });
  var s = m[0];
  if (!s) return { id: '', name: w.slice(0, 80), title: '', sig: '' };
  var id = oUncell_(s.StaffID).trim(), one = m.length === 1 && st.filter(function (x) { return oUncell_(x.StaffID).trim() === id; }).length === 1;
  var r = one && oSgActive_(s) ? oSgRec_(oEnv_(), 'OSG:' + id) : null; // two rows with one id / name: name only, no image
  return { id: id, name: oUncell_(s.Name).trim(), title: oUncell_(s.Role).trim(), sig: r ? r.f : '' };
}
function oSgWho_(db, what, spec) {
  var q;
  if (what === 'Quote') { q = find(db.rows('Quotes'), 'QuoteNo', spec.id); return q ? q.PreparedBy : ''; }
  if (what === 'PI') { var p = find(db.rows('Proformas'), 'PINo', spec.id); q = p ? find(db.rows('Quotes'), 'QuoteNo', p.QuoteNo) : null; return q ? q.PreparedBy : ''; }
  return '';
}
function oSgIsOurs_(b) { return !!b && b.t === 'sig' && Array.isArray(b.cols) && b.cols.length && /Core Access/.test(String(b.cols[0].head || '')); }
function oSgApply_(db, what, s) {
  if (!s || !Array.isArray(s.blocks)) return s;
  var env = oEnv_(), st = oSgRec_(env, 'OSG_STAMP'), comm = oHas_(OSG_COMM_, what), pick = typeof OSG_PICK_ === 'string' ? OSG_PICK_ : '';
  var who = comm ? (oUncell_(oSgWho_(db, what, s)).trim() || pick) : pick;
  var sg = { t: 'osign', head: OSG_HEAD_, s: oSgSigner_(db, who), role: comm ? (who ? 'Prepared by' : '') : (what === 'Challan' ? 'Issued by' : ''), stamp: st ? st.f : '' };
  var i = -1; s.blocks.forEach(function (b, j) { if (i < 0 && oSgIsOurs_(b)) i = j; });
  if (i >= 0 && what === 'Challan' && /^Received by/.test(String(s.blocks[i].cols[0].head))) sg.role = 'Received by'; // D1: return / rent-in receipt
  if (i >= 0) {
    var rest = s.blocks[i].cols.slice(1);
    s.blocks.splice.apply(s.blocks, [i, 1, sg].concat(rest.length ? [{ t: 'sig', cols: rest }] : []));
  } else s.blocks.push(sg);
  s.blocks.push({ t: 'p', text: OSG_LINE_, size: 7.5, italic: true, color: 'grey', before: 10, after: 0 });
  return s;
}
function oSgWrap_(what, f) {
  if (typeof f !== 'function' || f.officeSg_) return f;
  var w = function (db) { var s = f.apply(this, arguments); try { return oSgApply_(db, what, s); } catch (e) { return s; } };
  w.officeSg_ = f; w.officeCtl_ = f.officeCtl_ || f; // a later layer must wrap the current entry, not .officeCtl_ (that drops D2)
  return w;
}
if (typeof PDF_SPECS === 'object' && PDF_SPECS) Object.keys(PDF_SPECS).forEach(function (k) { PDF_SPECS[k] = oSgWrap_(k, PDF_SPECS[k]); });
// One image into a paragraph, scaled to fit w x h points (ratio kept). Any error: no image (the PDF is still made).
function oSgImgInto_(p, fileId, w, h) {
  if (!fileId || OSG_NOIMG_) return false;
  OSG_IMGUSED_ = true;
  try {
    var bl = oSgDrv_().blob(fileId); if (!bl) return false;
    var im = p.appendInlineImage(bl), iw = im.getWidth(), ih = im.getHeight(), k = Math.min(w / iw, h / ih, 1);
    im.setWidth(Math.max(1, Math.round(iw * k))).setHeight(Math.max(1, Math.round(ih * k)));
    return true;
  } catch (e) { return false; }
}
if (typeof BLOCKS_ === 'object' && BLOCKS_) BLOCKS_.osign = function (body, b) {
  var s = b.s || null;
  para_(body, b.head || OSG_HEAD_, { size: 9, bold: true, color: 'teal', before: 6, after: 0 });
  var tb = body.appendTable([['', '']]); tb.setBorderWidth(0); tb.setColumnWidth(0, 250); tb.setColumnWidth(1, BODY_W - 250);
  var c0 = tb.getCell(0, 0), c1 = tb.getCell(0, 1);
  [c0, c1].forEach(function (c) { c.setPaddingTop(2).setPaddingBottom(2).setPaddingLeft(0).setPaddingRight(4); c.setVerticalAlignment(DocumentApp.VerticalAlignment.BOTTOM); });
  var p0 = c0.getChild(0).asParagraph(), has = oSgImgInto_(p0, s && s.sig, 160, 46);
  styleP_(p0, '', { before: has ? 4 : 40, after: 0, line: 1 });
  styleP_(c0.appendParagraph('______________________________'), '______________________________', { size: 9, color: 'grey', after: 1 });
  styleP_(c0.appendParagraph(s && s.name ? s.name : 'Name: ______________________'), s && s.name ? s.name : 'Name: ______________________', { size: 9.5, bold: !!(s && s.name), after: 0 });
  var t = s ? [s.title, b.role].filter(function (x) { return !!x; }).join(' · ') : '', tl = t || (s && s.name ? '' : 'Designation: ________________');
  if (tl) styleP_(c0.appendParagraph(tl), tl, { size: 8.5, color: 'grey', after: 0 });
  var p1 = c1.getChild(0).asParagraph();
  if (!oSgImgInto_(p1, b.stamp, 84, 84)) styleP_(p1, '', { after: 0 });
};
// makePdf: o.signer (StaffID) = the name picked by whoever makes the PDF (optional documents, or commercial ones without
// PreparedBy). Panel "Make a PDF" passes it; the Docs list gets the signer names (_signers).
if (typeof makePdf === 'function' && !makePdf.officeSg_) {
  var OSG_makePdf0_ = makePdf;
  makePdf = function (db, what, no, o) {
    var k = OSG_PICK_, me = this, a = arguments; if (o && oHas_(o, 'signer')) OSG_PICK_ = typeof o.signer === 'string' && o.signer.length <= 40 ? o.signer : null;
    try {
      try { return OSG_makePdf0_.apply(me, a); }
      catch (e) { // an image Docs accepted but the PDF export refused must never stop PDFs: once more without images
        if (OSG_NOIMG_ || !OSG_IMGUSED_) throw e;
        OSG_NOIMG_ = true; try { Logger.log('PDF made again without signature / stamp images: ' + e.message); } catch (x) { /* no log */ }
        try { var r2 = OSG_makePdf0_.apply(me, a); OSG_FELL_ = true; return r2; } finally { OSG_NOIMG_ = false; } // OSG_FELL_: made without images
      }
    } finally { OSG_PICK_ = k; OSG_IMGUSED_ = false; }
  };
  makePdf.officeSg_ = OSG_makePdf0_; makePdf.officePdf_ = OSG_makePdf0_.officePdf_;
}
function oSgSigners_(db) {
  return db.rows('Staff').filter(function (s) { return !blank(s.StaffID) && !blank(s.Name) && oSgActive_(s); })
    .map(function (s) { var id = oUncell_(s.StaffID).trim(); return [id, oUncell_(s.Name).trim() + (oSgRec_(oEnv_(), 'OSG:' + id) ? '' : ' (no signature on file)')]; });
}
if (typeof uiGetDb_ === 'function') {
  var OSG_uiGet0_ = uiGetDb_;
  uiGetDb_ = function (db, kind, a) { var r = OSG_uiGet0_.apply(this, arguments); if (kind === 'docs' && r && typeof r === 'object') { try { r._signers = oSgSigners_(db); } catch (e) { r._signers = []; } } return r; };
}
// The panel's PDF action (QF5 sends quotes through its own PDF step) runs with the picked signer.
if (typeof UI_ACTIONS_ === 'object' && UI_ACTIONS_ && typeof UI_ACTIONS_.pdf === 'function' && !UI_ACTIONS_.pdf.officeSg_) {
  var OSG_uiPdf0_ = UI_ACTIONS_.pdf;
  UI_ACTIONS_.pdf = function (db, a) {
    var k = OSG_PICK_, g = a && typeof a.signer === 'string' && a.signer.length <= 40 ? a.signer : null;
    OSG_PICK_ = g; try { return OSG_uiPdf0_.apply(this, arguments); } finally { OSG_PICK_ = k; }
  };
  UI_ACTIONS_.pdf.officeSg_ = OSG_uiPdf0_;
}
// Editor: live look at the sign block without touching a real record: TEST quote (preparer STF-002) + TEST challan (picked
// STF-004) from the self-test data, real Settings / Staff / signatures / stamp, saved in PDF > _Samples (test folder).
function officeSigPdfCheck() {
  var sdb = oEnv_().db(), db = pdfTestDb_(), out = [], smp = pdfSampleList_(db); // sample challans made before the quote is renamed
  db.t.Settings = sdb.rows('Settings').map(function (r) { return Object.assign({}, r); });
  db.t.Staff = sdb.rows('Staff').map(function (r) { return Object.assign({}, r); });
  var q = find(db.rows('Quotes'), 'QuoteNo', 'CAE/Q/2026/001'), c = find(db.rows('Customers'), 'CustID', q.CustID);
  c.Name = 'TEST – signature check'; q.QuoteNo = 'CAE/Q/2026/T02'; q.PreparedBy = 'STF-002';
  db.rows('QuoteLines').forEach(function (l) { if (l.QuoteNo === 'CAE/Q/2026/001') l.QuoteNo = 'CAE/Q/2026/T02'; });
  var ch = { ChallanNo: smp.filter(function (x) { return x[0] === 'Challan'; })[0][1] }, folder = subFolder_(subFolder_(opsFolder_(sdb), 'PDF'), '_Samples');
  [['Quote', 'CAE/Q/2026/T02', {}], ['Challan', ch.ChallanNo, { signer: 'STF-004' }]].forEach(function (x) {
    var r = makePdf(db, x[0], x[1], Object.assign({ folder: folder, noLink: true, noLog: true }, x[2])); out.push('TEST ' + x[0] + ': ' + r.url);
  });
  Logger.log(out.join('\n'));
  return out;
}

// Editor only (CR5 live check): the real decode check takes a good 16 x 16 PNG and refuses one whose IDAT holds no image.
// Expected log: "good PNG decodes: true · broken PNG decodes: false". Nothing is written.
function officeSigImgCheck() {
  var g = oB64Dec_('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGElEQVR42mNgYGD4TyEeNWDUgFEDhocBAJvM/wFK6ATsAAAAAElFTkSuQmCC');
  var b = oB64Dec_('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAklEQVR4AewaftIAAAAASUVORK5CYII=');
  var d = oSgDrv_(), out = 'good PNG decodes: ' + d.decodes(g, oSgImg_(g).mime) + ' · broken PNG decodes: ' + d.decodes(b, oSgImg_(b).mime);
  Logger.log(out); return out;
}

// ----------------------------------------------------------------- W4c (18 Nov): fewer sheet calls (speed)
// Measured 18 Nov (Executions, Version 13): officeQuoteSave 44 s (with PDF), officeQuoteForm 11 s, officeQuoteGet 8 s,
// officeQuoteList 6 s; every Spreadsheet call costs ~0.17 s from the web app, so the number of calls is the time.
// SheetDb (Code.gs) read a tab with 8 calls (sheet twice, last column, header row, last row, data) and insert read the
// whole tab first (Log, Sequences ...). Here, same results with fewer calls:
//   - one Sheet handle per tab and SheetDb (getSheetByName once);
//   - rows: headers + rows in one getDataRange().getValues() when neither is cached yet (same width / rows as before:
//     getLastColumn x getLastRow); headers() alone stays the old header-row read (appSweep reads headers before its
//     lock: rows must still be read inside the lock);
//   - insert into the Log tab (add-only, never read back to rewrite a row) does not read the whole tab first. Every
//     other tab keeps the old insert (the new rows stay in memory as written: '= text marks kept for a row rewrite).
// Nothing else changes: same values, same row numbers (_r), same writes. (Review 18 Nov: 2 High + 1 Medium fixed.)
var OW4C_NOREAD_ = { Log: 1 };
var OW4C_ON_ = true;
if (typeof SheetDb === 'function' && SheetDb.prototype && !SheetDb.prototype.ow4c_) {
  (function (P) {
    var sheet0 = P.sheet, hasTab0 = P.hasTab, headers0 = P.headers, rows0 = P.rows, insert0 = P.insert;
    var fill = function (db, t) { // one read: header row + data rows
      var s = db.sheet(t), v = s.getDataRange().getValues();
      if (!v.length || v[0].every(blank)) return false; // a blank tab: the old path (it throws as before)
      var h = db.hc[t] || v[0].map(String), out = [];
      if (!db.hc[t]) db.hc[t] = h;
      for (var i = 1; i < v.length; i++) {
        var r = v[i]; if (r.every(blank)) continue;
        var o = { _r: i + 1 }; h.forEach(function (k, j) { o[k] = j < r.length ? r[j] : ''; }); out.push(o);
      }
      db.c[t] = out; return true;
    };
    P.sheet = function (t) {
      if (!OW4C_ON_) return sheet0.call(this, t);
      var m = this.sc_ || (this.sc_ = {});
      if (!m[t]) { var s = this.ss.getSheetByName(t); if (!s) throw new Error('Missing tab ' + t); m[t] = s; }
      return m[t];
    };
    P.hasTab = function (t) {
      if (!OW4C_ON_) return hasTab0.call(this, t);
      var m = this.sc_ || (this.sc_ = {}); if (m[t]) return true;
      var s = this.ss.getSheetByName(t); if (s) m[t] = s; return !!s;
    };
    P.headers = headers0; // header row only (uses the cached Sheet handle)
    P.rows = function (t) {
      if (!OW4C_ON_ || this.c[t] || !fill(this, t)) return rows0.call(this, t);
      return this.c[t];
    };
    P.insert = function (t, objs) {
      if (OW4C_ON_ && OW4C_NOREAD_[t] && !Object.keys(CALC[t] || {}).length) { // CR run 13: Log = one atomic appendRow per row (no getLastRow + setValues)
        var ar = Array.isArray(objs) ? objs : [objs]; if (!ar.length) return objs;
        var sa = this.sheet(t), ha = this.hc[t] || headers0.call(this, t), ca = this.c[t];
        ar.forEach(function (o) { sa.appendRow(ha.map(function (k) { return cellVal_(o[k]); })); if (ca) ca.push(o); }); // read already: in memory as written
        return objs;
      }
      if (!OW4C_ON_ || this.c[t] || !OW4C_NOREAD_[t]) return insert0.call(this, t, objs);
      var arr = Array.isArray(objs) ? objs : [objs];
      if (!arr.length) return objs;
      var s = this.sheet(t), h = this.hc[t] || headers0.call(this, t), calc = CALC[t] || {}, self = this; // header row only
      var start = Math.max(s.getLastRow(), 1) + 1;
      var vals = arr.map(function (o, i) {
        o._r = start + i;
        return h.map(function (k) { return calc[k] ? resolveF(self, t, calc[k], o._r) : cellVal_(o[k]); });
      });
      s.getRange(start, 1, arr.length, h.length).setValues(vals);
      return objs;
    };
    P.ow4c_ = true;
  })(SheetDb.prototype);
}

// ----------------------------------------------------------------- W4d (19 Nov): one combined read (speed)
// Measured 19 Nov (editor probes, Executions): the time is the FIRST read of each tab, 0.26-0.70 s whatever its size; one
// Sheets API values:batchGet of 13 tabs = 0.6 s with the same values (5 019 cells checked). So a SheetDb made by the office
// env (env.db) reads the quote tabs below in one batch, at its first read of one of them. Same results as the tab reads:
//   - lazy: the batch runs where the old first read ran (inside the lock when that read was inside the lock);
//   - a tab comes from the batch only while nothing was written and no lock taken / let go since the batch: a sheet handle
//     used outside a read (insert, update, formulas, formats, direct writes) ends batching for that SheetDb (its later first
//     reads are tab reads, as before) and drops the batch of every other SheetDb (their next first read batches again, at
//     most OW4D_MAX_ times); a lock taken or let go since the batch drops it too;
//   - values as getDataRange().getValues() (W4c fill): UNFORMATTED_VALUE; date / time cells come as serial numbers and are
//     told apart by a second request (FORMATTED_STRING: those cells are text there) sent at the same time; missing trailing
//     cells = ''; header width = the widest row; _r = sheet row; blank rows skipped; a blank tab = the old read (throws);
//   - SpreadsheetApp.flush() before each batch (pending writes of this execution reach the sheet, as getValues sees them);
//   - any error (HTTP, missing tab, other shape, sheet time zone not the script's) = the old tab reads.
var OW4D_ON_ = true;
var OW4D_TABS_ = ['Customers', 'DocRegister', 'Items', 'Jobs', 'KitParts', 'Lists', 'Locations', 'Milestones', 'QuoteLines', 'QuoteTerms', 'Quotes',
  'Sequences', 'Settings', 'Sites', 'Staff', 'Terms']; // the tabs the quote calls read (traced 19 Nov: List, Get, Form, Save, Pdf, CustomerAdd, SiteAdd)
var OW4D_MAX_ = 3;      // batches per SheetDb
var OW4D_FETCH_ = null; // self-tests: function (id, tabs) -> {tz, a, b}
var OW4D_W_ = 0;        // sheet handles used outside a read in this execution (any SheetDb)
function oW4dOn_(db) { if (db && OW4D_ON_ && typeof SheetDb === 'function' && db instanceof SheetDb && SheetDb.prototype.ow4d_) { db.w4d_ = true; db.ow4e_ = true; oW4fSc_(db); } return db; } // W4e: ow4e_ = an office SheetDb (Lists from its rows)
function oW4dHttp_(id, tabs) { // 2 batchGets (serial / formatted dates) + the sheet's time zone, in parallel
  var h = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, base = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id);
  var q = tabs.map(function (t) { return 'ranges=' + encodeURIComponent("'" + String(t).replace(/'/g, "''") + "'"); }).join('&');
  var u = function (dt) { return { url: base + '/values:batchGet?' + q + '&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=' + dt, headers: h, muteHttpExceptions: true }; };
  var rs = UrlFetchApp.fetchAll([u('SERIAL_NUMBER'), u('FORMATTED_STRING'), { url: base + '?fields=properties.timeZone', headers: h, muteHttpExceptions: true }]);
  var j = rs.map(function (r) { if (r.getResponseCode() !== 200) throw new Error('batchGet HTTP ' + r.getResponseCode()); return JSON.parse(r.getContentText()); });
  return { tz: String((j[2].properties || {}).timeZone || ''), a: j[0].valueRanges, b: j[1].valueRanges };
}
function oW4dDate_(v) { // serial number -> the Date getValues gives (sheet time zone = script time zone)
  var d = new Date(Math.round((v - 25569) * 864e5)), y = d.getUTCFullYear();
  var r = new Date(y, d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds());
  if (y < 100) r.setFullYear(y);
  return r;
}
function oW4dTab_(range) { // "'Quote Terms'!A1:Z9" / "Quotes!A1:AF5" -> the tab name
  var s = String(range || ''), i = s.lastIndexOf('!'); if (i < 0) return null; s = s.slice(0, i);
  return /^'.*'$/.test(s) ? s.slice(1, -1).replace(/''/g, "'") : s;
}
function oW4dRead_(db, tabs) { // {tab: rows as getDataRange().getValues()} or null (= the old reads)
  SpreadsheetApp.flush(); // review H1: writes still held by SpreadsheetApp reach the sheet first (getValues sees them, the REST API would not)
  var R = (OW4D_FETCH_ || oW4dHttp_)(db.ss.getId(), tabs);
  if (!R || !Array.isArray(R.a) || !Array.isArray(R.b) || R.a.length !== tabs.length || R.b.length !== tabs.length) return null;
  if (!R.tz || R.tz !== Session.getScriptTimeZone()) return null;
  var out = {};
  for (var t = 0; t < tabs.length; t++) {
    if (oW4dTab_(R.a[t].range) !== tabs[t] || oW4dTab_(R.b[t].range) !== tabs[t]) return null;
    var a = R.a[t].values || [], b = R.b[t].values || [], w = 0, v = [];
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return null;
    for (var i = 0; i < a.length; i++) {
      var x = a[i] || [], y = b[i] || [];
      if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length) return null;
      var r = [];
      for (var k = 0; k < x.length; k++) {
        var c = x[k], e = y[k];
        if (typeof c === 'number' && typeof e === 'string') { if (!/\d/.test(e)) return null; c = oW4dDate_(c); } // W4f (CR): a date / time text only (else a cell changed between the 2 reads); review L5: any digit (a 'Nov 2026' format keeps the batch)
        else if (c === null || c === undefined || c === '') { if (!(e === null || e === undefined || e === '')) return null; c = ''; }
        else if (typeof c !== 'number' && typeof c !== 'string' && typeof c !== 'boolean') return null;
        else if (c !== e) return null; // W4f (CR): the 2 reads differ -> the old tab reads
        r.push(c);
      }
      if (r.length > w) w = r.length;
      v.push(r);
    }
    v.forEach(function (r) { while (r.length < w) r.push(''); });
    if (v.length && !v[0].every(blank)) out[tabs[t]] = v; // a blank tab: not taken (the old read throws as before)
  }
  return out;
}
if (typeof SheetDb === 'function' && SheetDb.prototype && SheetDb.prototype.ow4c_ && !SheetDb.prototype.ow4d_) {
  (function (P) {
    var sheet1 = P.sheet, hasTab1 = P.hasTab, headers1 = P.headers, rows1 = P.rows, ensureTab1 = P.ensureTab;
    var old = function (db, f, t) { db.rd_ = (db.rd_ || 0) + 1; try { return f.call(db, t); } finally { db.rd_--; } }; // a read: keeps the batch
    var live = function (db) { var p = db.pl_; if (p && (p.lk !== OLK_.g || p.w !== OW4D_W_)) p = db.pl_ = null; return p; };
    var wrote = function (db, t) { if (!db.rd_) { OW4D_W_++; db.w4d_ = false; db.pl_ = null; oW4fDirty_(t); } }; // W4f: t + the tabs whose formulas read t
    var get = function (db, t) { // tab t from the batch (made now if needed), or null
      if (!OW4D_ON_ || !db.w4d_ || OW4D_TABS_.indexOf(t) < 0) return null;
      var p = live(db);
      if (!p) {
        if ((db.nb_ || 0) >= OW4D_MAX_) return null;
        var tabs = OW4D_TABS_.filter(function (x) { return !db.c[x]; });
        db.nb_ = (db.nb_ || 0) + 1;
        var v = null; try { v = oW4fRead_(db, tabs); } catch (e) { v = null; } // W4f: from this lock's batch, only the written tabs fetched again
        if (!v) { db.w4d_ = false; return null; } // the old tab reads for the rest of this SheetDb
        p = db.pl_ = { lk: OLK_.g, w: OW4D_W_, v: v };
      }
      return Object.prototype.hasOwnProperty.call(p.v, t) ? p.v[t] : null;
    };
    P.sheet = function (t) { if (t === 'Lists' && !this.rd_) { this.ow4eLw_ = true; OW4E_LW_++; } wrote(this, t); return sheet1.call(this, t); }; // outside a read = maybe a write (W4e: of Lists -> uiLists_ reads the sheet again)
    P.ensureTab = function (t) { if (t === 'Lists') { this.ow4eLw_ = true; OW4E_LW_++; } wrote(this, t); return ensureTab1.apply(this, arguments); };
    P.hasTab = function (t) { var p = OW4D_ON_ && this.w4d_ ? live(this) : null; return p && Object.prototype.hasOwnProperty.call(p.v, t) ? true : hasTab1.call(this, t); };
    P.headers = function (t) {
      if (!this.hc[t]) { var v = get(this, t); if (v) this.hc[t] = v[0].map(String); }
      return this.hc[t] || old(this, headers1, t);
    };
    P.rows = function (t) {
      if (this.c[t]) return this.c[t];
      var v = get(this, t); if (!v) return old(this, rows1, t);
      var h = this.hc[t] || v[0].map(String), out = [];
      if (!this.hc[t]) this.hc[t] = h;
      for (var i = 1; i < v.length; i++) {
        var r = v[i]; if (r.every(blank)) continue;
        var o = { _r: i + 1 }; h.forEach(function (k, j) { o[k] = j < r.length ? r[j] : ''; }); out.push(o);
      }
      this.c[t] = out; return out;
    };
    P.ow4d_ = true;
  })(SheetDb.prototype);
}

// ----------------------------------------------------------------- W4f (19 Nov): one batch per lock (speed)
// Measured 19 Nov (editor probe, 2 saves of a TEST quote): a save made 4 batches (1.8-2.2 s): each new office SheetDb (the save,
// the re-read after the panel save, the Rev / Status re-read, the view after the lock) fetched all the tabs again, because any
// write dropped every batch. Now, inside one script lock (no other script writes meanwhile), a new office SheetDb takes this
// lock's batch and only the tabs written since it was fetched are fetched again (after SpreadsheetApp.flush, as before):
// a tab counts as written when a sheet handle of it is taken outside a read (as W4d) - and with it every tab whose CALC formulas
// read it (QuoteLines -> Quotes, Milestones -> Jobs ...), so formula results are fresh too. Outside a lock, another lock, another
// spreadsheet, a failed read = the W4d batch as before. The save's view is made inside the lock (not with "Save + PDF" = d.pdf
// true: the old path). Sheet handles are shared by the office SheetDbs of one lock (W4c cached them per SheetDb).
// Rule (review L3): write through a sheet handle right after taking it (insert / update / uiPutRow_ / uiDelRows_ do); a handle
// kept while another office SheetDb reads would write a tab that is no longer marked as written.
// Also (CodeRabbit on W4c-W4e): the 2 batchGets must agree cell by cell (a number + text pair only for a date / time text),
// else the old tab reads.
var OW4F_ON_ = true;
var OW4F_S_ = null;   // this lock's batch: {id, lk, f: tabs fetched, d: tabs written since, v: {tab: values}}
var OW4F_SC_ = null;  // this lock's sheet handles: {id, lk, m}
var OW4F_DEP_ = null; // tab -> {tabs whose CALC formulas read it}
function oW4fDeps_() {
  if (OW4F_DEP_) return OW4F_DEP_;
  var m = {}, C = typeof CALC === 'object' && CALC ? CALC : {};
  Object.keys(C).forEach(function (T) { Object.keys(C[T] || {}).forEach(function (k) { String(C[T][k]).replace(/\[(\w+)\./g, function (a, X) { (m[X] = m[X] || {})[T] = 1; return a; }); }); });
  return (OW4F_DEP_ = m);
}
function oW4fDirty_(t) { // t written: t and the tabs whose formulas read it (closure) are fetched again
  var S = OW4F_S_; if (!S) return;
  var st = [String(t)], dep = oW4fDeps_(), seen = {}; // review M1: always mark the whole closure (a dependent may have been fetched again meanwhile)
  while (st.length) { var x = st.pop(); if (seen[x]) continue; seen[x] = 1; S.d[x] = 1; Object.keys(dep[x] || {}).forEach(function (y) { st.push(y); }); }
}
function oW4fId_(db) { try { var id = db && db.ss && typeof db.ss.getId === 'function' ? db.ss.getId() : ''; return id ? String(id) : ''; } catch (e) { return ''; } }
function oW4fSc_(db) { // office SheetDbs of one lock share the sheet handles
  if (!OW4F_ON_ || !(OLK_.s > 0)) return;
  var id = oW4fId_(db); if (!id) return;
  if (!OW4F_SC_ || OW4F_SC_.id !== id || OW4F_SC_.lk !== OLK_.g) OW4F_SC_ = { id: id, lk: OLK_.g, m: {} };
  db.sc_ = OW4F_SC_.m;
}
function oW4fRead_(db, tabs) { // = oW4dRead_(db, tabs); inside a lock from this lock's batch, the written tabs fetched again
  var own = Object.prototype.hasOwnProperty, id = OW4F_ON_ && OLK_.s > 0 ? oW4fId_(db) : '', S = OW4F_S_;
  if (id && S && S.id === id && S.lk === OLK_.g) {
    var need = tabs.filter(function (t) { return S.d[t] || !S.f[t]; });
    if (need.length) {
      var n = oW4dRead_(db, need); if (!n) { OW4F_S_ = null; return null; }
      need.forEach(function (t) { S.f[t] = 1; delete S.d[t]; if (own.call(n, t)) S.v[t] = n[t]; else delete S.v[t]; });
    }
    S.n = (S.n || 0) + 1;
    var out = {}; tabs.forEach(function (t) { if (own.call(S.v, t)) out[t] = S.v[t]; });
    return out;
  }
  var v = oW4dRead_(db, tabs);
  OW4F_S_ = null;
  if (v && id) { var f = {}, c = {}; tabs.forEach(function (t) { f[t] = 1; if (own.call(v, t)) c[t] = v[t]; }); OW4F_S_ = { id: id, lk: OLK_.g, f: f, d: {}, v: c, n: 0 }; }
  return v;
}

// ----------------------------------------------------------------- W4e (19 Nov): Lists from the rows (speed)
// Measured 19 Nov (editor probe, self time per function, live): uiLists_ read the Lists tab with db.sheet('Lists').getDataRange()
// = 0.4 s each time (3 times in a save) AND, as a sheet handle used outside a read, it ended the W4d batch -> every later tab was
// read one by one again (form 3.3-4.0 s, save 5.8 s inside the call). For an office SheetDb (env.db) uiLists_ now takes the Lists
// tab from db.rows / db.headers (the batch, the rows already read, or one tab read that keeps the batch). Same result: a column
// per header (last one wins for a repeated header, as before), blank cells left out, values as String. The old read stays for
// any other SheetDb, MemDb, an office SheetDb that took a sheet handle of Lists outside a read (it may have written it), any
// SheetDb after a Lists handle was taken by ANY SheetDb of this execution (OW4E_LW_, review L1), and a read that fails (a blank
// Lists tab: the old read gives the defaults, review M1).
var OW4E_LW_ = 0; // Lists sheet handles taken outside a read in this execution (any SheetDb)
if (typeof uiLists_ === 'function' && !uiLists_.ow4e_) {
  var OW4E_lists0_ = uiLists_;
  var OW4E_old_ = function (db) { // the old read; its Lists handle is a read (does not count as a write, keeps a batch)
    if (!(typeof SheetDb === 'function' && db instanceof SheetDb)) return OW4E_lists0_(db);
    db.rd_ = (db.rd_ || 0) + 1; try { return OW4E_lists0_(db); } finally { db.rd_--; }
  };
  uiLists_ = function (db) {
    if (!(OW4D_ON_ && typeof SheetDb === 'function' && db instanceof SheetDb && db.ow4e_ && !db.ow4eLw_ && db.ss && OW4E_LW_ === 0)) return OW4E_old_(db);
    var out = {};
    try {
      Object.keys(UI_LISTS_DEFAULT_).forEach(function (k) { out[k] = UI_LISTS_DEFAULT_[k].slice(); });
      if ((db.c && db.c.Lists) || db.hasTab('Lists')) { // rows already read = the tab is there (no sheet call)
        var rs = db.rows('Lists');
        db.headers('Lists').forEach(function (k) { if (out[k]) out[k] = rs.map(function (r) { return r[k]; }).filter(function (x) { return !blank(x); }).map(String); });
      }
    } catch (e) { return OW4E_old_(db); }
    out.PayMethod = out.PayMethod.filter(function (m) { return PAY_METHODS.indexOf(m) >= 0; }); // no cash, ever
    return out;
  };
  uiLists_.ow4e_ = true;
}
if (typeof uiLists_ === 'function' && !uiLists_.ow4g_) { // W4g: the dry-run shadow sees the Lists of the batch it copies
  var OW4G_lists0_ = uiLists_;
  uiLists_ = function (db) { if (db && db instanceof OW4gShadow_ && db.ow4gL_) return JSON.parse(JSON.stringify(db.ow4gL_)); return OW4G_lists0_(db); };
  uiLists_.ow4e_ = true; uiLists_.ow4g_ = true;
}

// ----------------------------------------------------------------- project-wide gate (web app = execute as me, access Anyone)
var OFFICE_WEB_API_ = ['doGet', 'officeLogin', 'officeMe', 'officeLogout', // later screens add theirs (each starts with officeGate_)
  'officeUsersList', 'officeStaffList', 'officeUserSave', 'officeUserReset', 'officeUserBlock', 'officeUserSignOutAll',
  'officeDocList', 'officeDocSave', 'officeDocRevise', 'officeDocStatus',
  'officeQuoteList', 'officeQuoteGet', 'officeQuoteTerm', 'officeQuotePdf', 'officeQuoteEmail',
  'officeQuoteForm', 'officeCustomerAdd', 'officeSiteAdd', 'officeQuoteSave',
  'officeCustList', 'officeCustGet', 'officeCustomerSave', 'officeSiteSave',
  'officeContractList', 'officeContractGet', 'officeContractMake', 'officeContractSave', 'officeContractFab', 'officeContractAdvance',
  'officeStockList', 'officeStockItem', 'officeItemSave', 'officeStockOpening', 'officeLocList', 'officeLocSave',
  'officeChallanList', 'officeChallanGet', 'officeChallanSave', 'officeChallanPost', 'officeChallanCancel', 'officeChallanPdf',
  'officeSigGet', 'officeSigSave', 'officeSigRemove', 'officeStampGet', 'officeStampSave'];
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
      eq('O137 set-up: 2 tabs + 12 rows + 12 history rows; repeat adds nothing', oDocSetup_(e3, db) + ':' + db.rows(ODOC_REG_).length + ':' + db.rows(ODOC_HIST_).length + ':' + oDocSetup_(e3, db) + ':' + db.rows(ODOC_HIST_).length + ':' + j(db.headers(ODOC_REG_)), '12:12:12:0:12:' + j(ODOC_H_));
      var codes = function (t) { return officeDocList(t).rows.map(function (r) { return r.code; }).join(','); };
      eq('O138 Director sees all 12, can write; QH Head + PS View sees only QH + PS documents, can write; QH View + PS Staff the same, read only', [officeDocList(tD).rows.length, officeDocList(tD).can, codes(tQ), officeDocList(tQ).can, j(officeDocList(tQ).depts), codes(tV), officeDocList(tV).can].join('|'),
        '12|true|CAE-QH-P01,CAE-PS-F01,CAE-PS-F02|true|["PS","QH"]|CAE-QH-P01,CAE-PS-F01,CAE-PS-F02|false');
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
      eq('O153 history is add-only: every action added exactly one row, none changed', db.rows(ODOC_HIST_).length + ':' + db.rows(ODOC_HIST_).every(function (h) { return h.Code && h.At instanceof Date; }), '23:true');
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
    // --- W3 quotes (SC): list, view, terms, PDF, email (QT1 / QF5 / QF3 reused; stubs for Drive + Gmail)
    if (typeof pdfTestDb_ === 'function') (function () {
      var e4 = oMemEnv_(); OFFICE_ENV_ = e4; var j = JSON.stringify, keepQ5 = QF5_STUB_, keepQ3 = QF3_STUB_;
      var add = function (em, acc) { oSaveLogin_(e4, { email: em, name: em.split('@')[0], depts: acc, password: 'GoodPass1' }); return officeLogin(em, 'GoodPass1', false).token; };
      var db = pdfTestDb_(); upgradeQT(db); db.ensureColumn('Quotes', 'PDF'); e4.clock.db = db;
      (function () { var i0 = db.insert, u0 = db.update, cut = function (o) { Object.keys(o).forEach(function (k) { if (typeof o[k] === 'string' && o[k].charAt(0) === "'") o[k] = o[k].slice(1); }); return o; }; // a sheet drops one leading quote
        db.insert = function (t, r) { return i0.call(db, t, Array.isArray(r) ? r.map(cut) : cut(r)); }; db.update = function (t, r, p) { return u0.call(db, t, r, cut(p)); }; })();
      var Q1 = 'CAE/Q/2026/001', Q2 = 'CAE/Q/2026/002', Q3 = 'CAE/Q/2026/003', Q4 = 'CAE/Q/2026/004';
      db.update('Customers', must(db, 'Customers', 'CustID', 'CUST-0001'), { Email: 'buyer@client.com' });
      db.insert('Terms', [{ ClauseID: 'TC-0101', QuoteType: 'Sale', Section: '4', SectionTitle: 'Payment Terms', ClauseNo: '4.1', Title: 'Schedule', Text: '{{AdvancePct}} advance with the order. Payable within {{PaymentDays}} days.', SortOrder: 410, Active: 'Yes' },
        { ClauseID: 'TC-0102', QuoteType: 'Sale', Section: '5', SectionTitle: 'General', ClauseNo: '5.1', Title: 'Validity', Text: 'Valid for {{ValidityDays}} days.', SortOrder: 510, Active: 'Yes' }]);
      var tD = add('dir@t.com', oDir_()), tS = add('sales@t.com', { SC: 2, PS: 1 }), tV = add('scview@t.com', { SC: 1 }), tY = add('yard@t.com', { YW: 2, PS: 1 });
      var sent = [], made = 0, boom = false, mail = { aliases: function () { return []; }, me: function () { return 'ops@test'; }, user: function () { return ''; },
        name: function (u) { return /^https:\/\/x\/\d+$/.test(u) ? 'PDF ' + u.slice(10) + '.pdf' : ''; },
        blob: function (u) { if (!/^https:\/\/x\/\d+$/.test(u)) throw new Error('gone'); return { getName: function () { return 'PDF ' + u.slice(10) + '.pdf'; } }; },
        send: function (to, s, b, o) { if (boom) throw new Error('Service invoked too many times'); sent.push({ to: to, s: s, b: b, o: o }); } };
      QF5_STUB_ = { make: function (d, w, n, o) { var u = 'https://x/' + (++made); if (!(o && o.noLink)) d.update('Quotes', must(d, 'Quotes', 'QuoteNo', n), { PDF: u }); return { url: u, file: 'PDF ' + made + '.pdf', placeholders: 0 }; },
        drive: { name: function () { return ''; }, trash: function () {} } };
      QF3_STUB_ = { mail: mail, now: function () { return new Date(2026, 10, 20, 9, 5); } };
      try {
        var G = function (t, no) { return officeQuoteGet(t, no || Q1); }, op = function (t, no, o, tv) { return officeQuoteTerm(t, no, tv === undefined ? G(t, no).tv : tv, o); };
        var V = function (v, k) { return v.terms.vars.filter(function (x) { return x.k === k; })[0]; }, C = function (v, id) { var o = null; v.terms.secs.forEach(function (s) { s.cl.forEach(function (c) { if (c.id === id) o = c; }); }); return o; };
        var L1 = officeQuoteList(tV);
        eq('O196 list: any SC level, 4 quotes, read only for SC View, amounts sent', L1.rows.length + ':' + L1.can + ':' + L1.money + ':' + (typeof L1.rows[0].total), '4:false:true:number');
        eq('O197 list refused for yard / bad token; Sales can write', [err(function () { officeQuoteList(tY); }), err(function () { officeQuoteList('x'); }), officeQuoteList(tS).can].join(), 'NOACCESS,NOSESSION,true');
        var v1 = G(tV), r1 = L1.rows.filter(function (r) { return r.no === Q1; })[0];
        eq('O198 Rental fields (page names) + fixed tokens', v1.terms.vars.map(function (x) { return x.k + (x.kind === 'fixed' ? '*' : ''); }).join(), 'AdvancePct,PaymentDays,ValidityDays,LateInterest,MinMonths,NoticeDays,PartPeriod,PeriodDays*,BillingSchedule*');
        eq('O199 Sale has no hire fields', G(tV, Q2).terms.vars.filter(function (x) { return x.kind !== 'fixed'; }).length, 4);
        eq('O200 clause text {Token} on the page, never {{ }}', j(G(tV, Q2).terms.secs).indexOf('{{') < 0 && /\{PaymentDays\}/.test(j(G(tV, Q2).terms.secs)), true);
        eq('O201 list + view agree on fill / changed (min hire 2 = 1 change, 8 [ ] to fill)', [r1.fill, r1.changed, v1.fill, v1.changed].join(), '8,1,8,1');
        eq('O202 view: lines (size from Items, optional line), totals + words, dates', v1.lines.length + ':' + v1.lines[3].optional + ':' + v1.tot.vatPct + ':' + /^Taka /.test(v1.tot.words) + ':' + v1.date + ':' + v1.valid, '4:true:15:true:2026-11-20:2026-12-20');
        eq('O203 tv is a number, same when nothing changed', typeof v1.tv === 'number' && v1.tv > 0 && G(tS).tv === v1.tv, true);
        var v2 = op(tS, Q1, { k: 'var', key: 'AdvancePct', value: 40 });
        eq('O204 field change: value, token text, advance, stored 0.4, new tv', [V(v2, 'AdvancePct').value, V(v2, 'AdvancePct').tok, v2.tot.advPct, must(db, 'Quotes', 'QuoteNo', Q1).AdvancePct, v2.tv !== v1.tv].join(), '40,40%,40,0.4,true');
        eq('O205 old tv -> STALE, nothing written', err(function () { officeQuoteTerm(tS, Q1, v1.tv, { k: 'var', key: 'AdvancePct', value: 30 }); }) + ':' + must(db, 'Quotes', 'QuoteNo', Q1).AdvancePct, 'STALE:0.4');
        eq('O206 bad values refused', [err(function () { op(tS, Q1, { k: 'var', key: 'AdvancePct', value: 101 }); }), err(function () { op(tS, Q1, { k: 'var', key: 'PaymentDays', value: 2.5 }); }),
          err(function () { op(tS, Q1, { k: 'var', key: 'PaymentDays', value: '9' }); }), err(function () { op(tS, Q1, { k: 'var', key: 'Nope', value: 1 }); }), err(function () { op(tS, Q1, { k: 'var', key: 'LateInterest', value: 1.155 }); })].join(),
          'BADINPUT|Advance with the order,BADINPUT|Invoices payable within,BADINPUT|Invoices payable within,BADINPUT|field,BADINPUT|Late payment interest');
        eq('O207 1.15 % late interest kept (no float slip)', V(op(tS, Q1, { k: 'var', key: 'LateInterest', value: 1.15 }), 'LateInterest').value, 1.15);
        var v3 = op(tS, Q1, { k: 'var', key: 'AdvancePct', value: null });
        eq('O208 back to standard', V(v3, 'AdvancePct').value + ':' + must(db, 'Quotes', 'QuoteNo', Q1).AdvancePct, 'null:0.5');
        eq('O209 part month pick', must(db, 'Quotes', 'QuoteNo', (op(tS, Q1, { k: 'var', key: 'PartPeriod', value: 'Pro rata' }), Q1)).PartPeriodRule + ':' + err(function () { op(tS, Q1, { k: 'var', key: 'PartPeriod', value: 'Weekly' }); }), 'Pro rata:BADINPUT|Part month');
        var cl0 = v1.terms.secs[0].cl[0], pc = null; G(tV, Q2).terms.secs.forEach(function (s) { s.cl.forEach(function (c) { if (!pc && /\{PaymentDays\}/.test(c.text)) pc = c; }); });
        var v4 = op(tS, Q2, { k: 'clause', id: pc.id, text: 'Pay within {PaymentDays} days, please.' }), ov = qtRows_(db, Q2).filter(function (o) { return o.ClauseID === pc.id; })[0];
        eq('O210 clause wording: {Field} stored as {{Field}}, shown changed', ov.Action + ':' + ov.Text + ':' + C(v4, pc.id).st + ':' + C(v4, pc.id).text, 'Replace:Pay within {{PaymentDays}} days, please.:changed:Pay within {PaymentDays} days, please.');
        eq('O211 unknown field, stray brace, empty, too long refused', [err(function () { op(tS, Q2, { k: 'clause', id: pc.id, text: 'Pay {Foo} now' }); }), err(function () { op(tS, Q2, { k: 'clause', id: pc.id, text: 'Pay } now' }); }),
          err(function () { op(tS, Q2, { k: 'clause', id: pc.id, text: '  ' }); }), err(function () { op(tS, Q2, { k: 'clause', id: pc.id, text: new Array(1002).join('a') }); }), err(function () { op(tS, Q2, { k: 'clause', id: pc.id, text: 'Pay {{PaymentDays}}' }); })].join(),
          'BADINPUT|wording,BADINPUT|wording,BADINPUT|wording,BADINPUT|wording,BADINPUT|wording');
        op(tS, Q2, { k: 'clause', id: pc.id, text: '=HYPERLINK("x")' });
        var ins0 = db.insert, seen = []; db.insert = function (t, r) { if (t === 'QuoteTerms') (Array.isArray(r) ? r : [r]).forEach(function (x) { seen.push(x.Text); }); return ins0.call(db, t, r); };
        op(tS, Q2, { k: 'var', key: 'ValidityDays', value: 21 }); db.insert = ins0;
        eq('O212 formula-like wording always written with the text mark (also when another change re-writes the rows)', seen.join() + ':' + qtRows_(db, Q2).filter(function (o) { return o.ClauseID === pc.id; })[0].Text, '\'=HYPERLINK("x"):=HYPERLINK("x")');
        eq('O213 fill in [Description] -> one less to fill', op(tS, Q1, { k: 'clause', id: cl0.id, text: 'Scaffold to the boiler house.' }).fill, 7);
        var v5 = op(tS, Q2, { k: 'clause', id: pc.id, reset: true });
        eq('O214 clause back to standard (row gone)', C(v5, pc.id).st + ':' + qtRows_(db, Q2).filter(function (o) { return o.ClauseID === pc.id; }).length, 'std:0');
        var v6 = op(tS, Q2, { k: 'clause', id: pc.id, remove: true });
        eq('O215 remove: shown struck, PDF leaves it out; edit / reset-twice rules', C(v6, pc.id).st + ':' + (j(PDF_SPECS.Quote(db, Q2).blocks).indexOf('Payable within') < 0) + ':' + (j(PDF_SPECS.Quote(db, Q2).blocks).indexOf('Valid for') >= 0) + ':' + err(function () { op(tS, Q2, { k: 'clause', id: pc.id, text: 'x y' }); }), 'removed:true:true:BADINPUT|clause');
        eq('O216 put back; back on a normal clause refused', C(op(tS, Q2, { k: 'clause', id: pc.id, back: true }), pc.id).st + ':' + err(function () { op(tS, Q2, { k: 'clause', id: pc.id, back: true }); }), 'std:BADINPUT|clause');
        var v7 = op(tS, Q1, { k: 'add', sec: -1, text: 'Night work at 1.5 x the day rate.' }), v8 = op(tS, Q1, { k: 'add', sec: 0, text: 'Extra scope line.' });
        var sp = v8.terms.secs[v8.terms.secs.length - 1];
        eq('O217 add: special section at the end + clause in section 1 (ids A0, A1)', sp.t + ':' + sp.cl.map(function (c) { return c.id + '=' + c.st; }).join() + ':' + v8.terms.secs[0].cl.filter(function (c) { return c.st === 'added'; }).map(function (c) { return c.id; }).join(), 'Special Conditions:A1=added:A0');
        eq('O218 special condition prints in the PDF', j(PDF_SPECS.Quote(db, Q1).blocks).indexOf('Night work at 1.5') >= 0, true);
        var aid = sp.cl[0].id, v9 = op(tS, Q1, { k: 'clause', id: aid, text: 'Night work at 2 x the day rate.' });
        eq('O219 added clause: edit, reset refused, delete', C(v9, aid).text + ':' + err(function () { op(tS, Q1, { k: 'clause', id: aid, reset: true }); }) + ':' + j(op(tS, Q1, { k: 'clause', id: aid, remove: true }).terms).indexOf('Night work') , 'Night work at 2 x the day rate.:BADINPUT|clause:-1');
        eq('O220 unknown clause / section / change refused', [err(function () { op(tS, Q1, { k: 'clause', id: 'TC-9999', remove: true }); }), err(function () { op(tS, Q1, { k: 'clause', id: 'A9', remove: true }); }), err(function () { op(tS, Q1, { k: 'add', sec: 99, text: 'x y' }); }),
          err(function () { op(tS, Q1, { k: 'drop' }); }), err(function () { op(tS, Q1, null); }), err(function () { op(tS, Q1, [1]); })].join(), 'NOTFOUND,NOTFOUND,BADINPUT|section,BADINPUT|change,BADINPUT|change,BADINPUT|change');
        var vR = op(tS, Q1, { k: 'resetAll' });
        eq('O221 all to standard (min hire 2 -> standard 1, rows gone)', vR.changed + ':' + qtRows_(db, Q1).length + ':' + must(db, 'Quotes', 'QuoteNo', Q1).MinMonths, '0:0:1');
        eq('O222 SC View / yard / bad token cannot change terms; Director can', [err(function () { op(tV, Q1, { k: 'resetAll' }); }), err(function () { officeQuoteTerm(tY, Q1, 1, { k: 'resetAll' }); }), err(function () { officeQuoteTerm('x', Q1, 1, { k: 'resetAll' }); }), op(tD, Q1, { k: 'resetAll' }).changed].join(), 'NOACCESS,NOACCESS,NOSESSION,0');
        eq('O223 unknown / junk quote numbers', [err(function () { G(tV, 'CAE/Q/2026/999'); }), err(function () { G(tV, { a: 1 }); }), err(function () { G(tV, '../../x'); }), err(function () { officeQuoteTerm(tS, 'nope', 1, { k: 'resetAll' }); })].join(), 'NOTFOUND,NOTFOUND,NOTFOUND,NOTFOUND');
        eq('O224 tv must be the number shown (string / missing = STALE)', [err(function () { officeQuoteTerm(tS, Q1, String(G(tS).tv), { k: 'resetAll' }); }), err(function () { officeQuoteTerm(tS, Q1, undefined, { k: 'resetAll' }); })].join(), 'STALE,STALE');
        // PDF: the stored one while current; locked quotes never remade; SC View never makes one
        eq('O225a SC View: no PDF yet -> NOPDF (makes nothing)', err(function () { officeQuotePdf(tV, Q2); }) + ':' + made, 'NOPDF:0');
        var p1 = officeQuotePdf(tS, Q2), p2 = officeQuotePdf(tV, Q2), vp = G(tV, Q2);
        eq('O225 PDF made once, then the same link (View too); view sends it', p1.made + ':' + p2.made + ':' + (p1.url === p2.url) + ':' + (vp.pdf === p1.url) + ':' + made, 'true:false:true:true:1');
        op(tS, Q2, { k: 'var', key: 'ValidityDays', value: 20 });
        eq('O226 a terms change -> view has no PDF; View gets the old one, Staff makes a new one', G(tV, Q2).pdf + ':' + officeQuotePdf(tV, Q2).made + ':' + officeQuotePdf(tS, Q2).made + ':' + made, ':false:true:2');
        db.update('Customers', must(db, 'Customers', 'CustID', 'CUST-0001'), { Name: 'Test Client Renamed' });
        eq('O227 anything printed changes the PDF version (customer renamed) -> made again', officeQuotePdf(tS, Q2).made + ':' + made, 'true:3');
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q2), { PDF: 'https://x/77' });
        eq('O227b a PDF made elsewhere (panel remakes on every save) is trusted', officeQuotePdf(tS, Q2).url + ':' + made, 'https://x/77:3');
        e4.put('OQPB:x', 1); e4.put('OQPB:' + Q3, { t: 'other', u: e4.now() + 60000 }); db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q3), { PDF: '' });
        eq('O228 one PDF make per quote at a time', err(function () { officeQuotePdf(tS, Q3); }), 'BUSY');
        var lz = e4.get('OQPB:' + Q3).t; e4.put('OQPB:' + Q3, { t: 'other', u: e4.now() - 1 }); var mz = made, pz = officeQuotePdf(tS, Q3);
        eq('O324 PDF lease: a run-out lease is taken over; the new one is removed after the make (owner token)', [lz, pz.made, made - mz, e4.get('OQPB:' + Q3)].join('|'), 'other|true|1|');
        // email
        var A = function (no, o) { return Object.assign({ to: 'buyer@client.com', cc: '', note: '' }, o || {}); }, ns = sent.length;
        eq('O229 [to fill] left -> TOFILL, nothing sent', err(function () { officeQuoteEmail(tS, Q1, G(tS).tv, A(Q1)); }) + ':' + (sent.length - ns), 'TOFILL|8:0');
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q2), { Status: 'Draft' }); var vq = G(tS, Q2);
        var m1 = officeQuoteEmail(tS, Q2, vq.tv, A(Q2, { cc: 'Sales@T.com', note: 'As discussed on site today.' })), s1 = sent[sent.length - 1];
        eq('O230 email: sent with a fresh PDF, Draft -> Sent, note after the greeting, cc', m1.status + ':' + m1.was + ':' + s1.to + ':' + s1.o.cc + ':' + /^Dear [^\n]+,\n\nAs discussed on site today\.\n\nPlease find/.test(s1.b) + ':' + s1.o.attachments[0].getName(), 'Sent:Draft:buyer@client.com:sales@t.com:true:PDF 77.pdf');
        eq('O231 log says who (office login)', db.rows('Log').filter(function (x) { return x.Action === 'Quote emailed' && x.Ref === Q2; }).map(function (x) { return x.User; }).pop() + ':' + db.rows('Log').filter(function (x) { return x.Action === 'Quote terms'; }).map(function (x) { return x.User; }).pop() + ':' + OQ_ACT_, 'office:sales@t.com:office:sales@t.com:');
        eq('O232 after sending: view still has the PDF (status change only)', G(tS, Q2).pdf !== '', true);
        ns = sent.length;
        eq('O233 refusals send nothing', [err(function () { officeQuoteEmail(tS, Q2, 1, A(Q2)); }), err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2, { to: 'not-an-email' })); }), err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2, { to: '' })); }),
          err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2, { to: new Array(12).join('a@b.co,') })); }), err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2, { note: new Array(2002).join('n') })); }),
          err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2, { cc: ['x'] })); }), err(function () { officeQuoteEmail(tV, Q2, G(tV, Q2).tv, A(Q2)); }), err(function () { officeQuoteEmail(tY, Q2, 1, A(Q2)); })].join() + ':' + (sent.length - ns),
          'STALE,BADINPUT|to,BADINPUT|to,BADINPUT|to,BADINPUT|message,BADINPUT|cc,NOACCESS,NOACCESS:0');
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q4), { Status: 'Lost' });
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q3), { Status: 'Expired' });
        eq('O234 Lost / Expired: not sent (QSTATE), terms locked (QLOCKED)', [err(function () { officeQuoteEmail(tS, Q4, G(tS, Q4).tv, A(Q4)); }), err(function () { officeQuoteEmail(tS, Q3, G(tS, Q3).tv, A(Q3)); }), err(function () { op(tS, Q4, { k: 'resetAll' }); }), G(tS, Q4).locked].join() + ':' + (sent.length - ns), 'QSTATE|Lost,QSTATE|Expired,QLOCKED,STATUS:0');
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q3), { Status: 'Sent' }); db.insert('Jobs', { JobNo: 'CAE/J/2026/009', QuoteNo: Q3, Status: 'Active' });
        eq('O235 quote with a job: terms locked (JOB), list shows the job', G(tS, Q3).locked + ':' + err(function () { op(tS, Q3, { k: 'resetAll' }); }) + ':' + officeQuoteList(tS).rows.filter(function (r) { return r.no === Q3; })[0].job, 'JOB:QLOCKED:CAE/J/2026/009');
        eq('O236a a second send within a minute -> SENTNOW', err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2)); }), 'SENTNOW');
        e4.cdel('OQE:' + Q2); boom = true; ns = sent.length; var st2 = must(db, 'Quotes', 'QuoteNo', Q2).Status;
        eq('O236 Gmail error: message says nothing was sent, status unchanged', /nothing was sent/.test(err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2)); })) + ':' + (must(db, 'Quotes', 'QuoteNo', Q2).Status === st2), 'true:true');
        boom = false;
        var dy = Math.floor((e4.now() + 216e5) / 864e5); e4.put('OQM:sales@t.com', { d: dy, n: 30 });
        eq('O236b 30 emails a day per login -> LIMIT', err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2)); }), 'LIMIT');
        e4.put('OQM:sales@t.com', { d: dy - 1, n: 30 }); ns = sent.length; var mY = officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2));
        eq('O325 the day count is kept in Script Properties for the whole Dhaka day; a new day starts at 0', [sent.length - ns, JSON.stringify(e4.get("OQM:sales@t.com"))].join("|"), "1|" + JSON.stringify({ d: dy, n: 1 }));
        // CR2: the preparer is part of the version the sender saw
        e4.cdel('OQE:' + Q2); var tvP = G(tS, Q2).tv, qP = must(db, 'Quotes', 'QuoteNo', Q2), pb0 = qP.PreparedBy; db.update('Quotes', qP, { PreparedBy: 'STF-777' });
        eq('O326 another preparer since the view -> STALE, nothing sent', err(function () { officeQuoteEmail(tS, Q2, tvP, A(Q2)); }) + ':' + (sent.length - ns), 'STALE:1');
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q2), { PreparedBy: pb0 == null ? '' : pb0 });
        // CR15: Gmail took it, the status / log write failed -> SENTNOREC, durable receipt, no second delivery
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q2), { Status: 'Draft' });
        var s0m = mail.send, u0m = db.update, failQ = false; mail.send = function () { s0m.apply(mail, arguments); failQ = true; };
        db.update = function (t) { if (t === 'Quotes' && failQ) { failQ = false; throw new Error('Service Spreadsheets timed out'); } return u0m.apply(db, arguments); };
        ns = sent.length; var eN = err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2)); }); mail.send = s0m; db.update = u0m;
        var stN = must(db, 'Quotes', 'QuoteNo', Q2).Status; e4.clock.now += 120000; var eN2 = err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2)); });
        eq('O336 the next try records the send that went out: Sent + a log line, and refuses a second delivery', [stN, must(db, 'Quotes', 'QuoteNo', Q2).Status, /recorded later/.test(j(db.rows('Log').slice(-2))), e4.get('OQES:' + Q2).done].join('|'), 'Draft|Sent|true|1');
        eq('O327 delivered but not recorded: SENTNOREC, counted, a resend within 10 min refused', [eN, eN2, sent.length - ns, e4.get('OQM:sales@t.com').n, e4.get('OQES:' + Q2).nr].join('|'), 'SENTNOREC|SENTNOW|1|2|1');
        e4.clock.now += 600000; e4.cdel('OQE:' + Q2);
        // CR4 / CR8: fingerprint of the spec that was rendered; a PDF made without images is tried again later
        var q5k = qf5Pdf_, mk5 = made; qf5Pdf_ = function () { var r = q5k.apply(this, arguments); OSG_FELL_ = true; return r; };
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q2), { PDF: '' }); var f1p;
        try { f1p = officeQuotePdf(tS, Q2); } finally { qf5Pdf_ = q5k; }
        var ni = e4.get('OQP:' + Q2).ni, f2p = officeQuotePdf(tS, Q2); e4.clock.now += 660000; var f3p = officeQuotePdf(tS, Q2);
        eq('O328 PDF made without the images: current for 10 min, then made again (with images)', [f1p.made, ni, f2p.made, f3p.made, made - mk5, e4.get('OQP:' + Q2).ni].join('|'), 'true|1|false|true|2|');
        var sm6 = QF5_STUB_.make, nm6 = []; QF5_STUB_.make = function (d) { nm6.push(String(must(d, 'Customers', 'CustID', 'CUST-0001').Name)); if (nm6.length === 1) db.update('Customers', must(db, 'Customers', 'CustID', 'CUST-0001'), { Name: 'Renamed During Export' }); return sm6.apply(this, arguments); };
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q2), { PDF: '' }); var mk6 = made, b329 = '', c329 = '', p329 = null;
        try { try { officeQuotePdf(tS, Q2); } catch (e) { b329 = String(e && e.message || e); } c329 = String(must(db, 'Quotes', 'QuoteNo', Q2).PDF || ''); p329 = officeQuotePdf(tS, Q2); } finally { QF5_STUB_.make = sm6; }
        eq('O329 renamed during the render -> that PDF gets no link (BUSY); the next Open renders the new name and links it', [b329, c329, p329.made, made - mk6, nm6[0] !== 'Renamed During Export', nm6[1], must(db, 'Quotes', 'QuoteNo', Q2).PDF === 'https://x/' + made].join('|'), 'BUSY||true|2|true|Renamed During Export|true');
        // CR7: a PDF from the sheet panel (no OQP record) is out of date after a terms change here
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q2), { PDF: 'https://x/88' }); var mk7 = made, t7 = officeQuotePdf(tS, Q2).url;
        op(tS, Q2, { k: 'var', key: 'ValidityDays', value: 22 });
        eq('O330 panel PDF trusted until a change here, then made again', [t7, officeQuotePdf(tS, Q2).made, made - mk7].join('|'), 'https://x/88|true|1');
        // locked quote keeps its PDF (Q3 has a job now)
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q3), { PDF: 'https://x/55' }); e4.put('OQP:' + Q3, { v: 1, f: 'https://x/55' }); var m0 = made;
        eq('O239 locked quote: stored PDF opened / emailed, never made again', officeQuotePdf(tS, Q3).url + ':' + G(tS, Q3).pdf + ':' + (made - m0), 'https://x/55:https://x/55:0');
        // a failing sheet write in the middle of qtSave_ puts the old rows back
        op(tS, Q2, { k: 'add', sec: -1, text: 'Keep me.' }); var n0 = qtRows_(db, Q2).length, i1 = db.insert;
        var once = 1; db.insert = function (t, r) { if (t === 'QuoteTerms' && once) { once = 0; throw new Error('Service Spreadsheets timed out'); } return i1.call(db, t, r); };
        var eB = err(function () { op(tS, Q2, { k: 'add', sec: -1, text: 'Lost?' }); }); db.insert = i1;
        eq('O240 sheet error mid-save -> BUSY, old clause rows back', eB + ':' + (qtRows_(db, Q2).length === n0) + ':' + qtRows_(db, Q2).some(function (o) { return o.Text === 'Keep me.'; }), 'BUSY:true:true');
        op(tS, Q2, { k: 'var', key: 'PaymentDays', value: 9 }); once = 1; db.insert = function (t, r) { if (t === 'QuoteTerms' && once) { once = 0; throw new Error('Service Spreadsheets timed out'); } return i1.call(db, t, r); };
        var eP = err(function () { op(tS, Q2, { k: 'var', key: 'PaymentDays', value: 14 }); }); db.insert = i1;
        eq('O335 sheet error after the quote row was written -> BUSY, PaymentDays back to 9, the old view still saves', [eP, must(db, 'Quotes', 'QuoteNo', Q2).PaymentDays, op(tS, Q2, { k: 'var', key: 'PaymentDays', value: 14 }) ? must(db, 'Quotes', 'QuoteNo', Q2).PaymentDays : 'x'].join('|'), 'BUSY|9|14');
        op(tS, Q2, { k: 'var', key: 'PaymentDays', value: null });
        // placeholders counted as the PDF counts them (long, newline, empty)
        op(tS, Q2, { k: 'clause', id: 'TC-0102', text: 'Valid at [' + new Array(91).join('s') + '] and [] for {ValidityDays} days.' });
        eq('O241 long / empty [ ] count like the PDF -> TOFILL|2', err(function () { officeQuoteEmail(tS, Q2, G(tS, Q2).tv, A(Q2)); }) + ':' + G(tS, Q2).fill, 'TOFILL|2:2');
        eq('O242 wording back to the standard text = standard (no row)', C(op(tS, Q2, { k: 'clause', id: 'TC-0102', text: 'Valid for {ValidityDays} days.' }), 'TC-0102').st + ':' + qtRows_(db, Q2).filter(function (o) { return o.ClauseID === 'TC-0102'; }).length, 'std:0');
        db.insert('QuoteTerms', { QuoteNo: Q2, ClauseID: 'TC-0102', Action: 'Replace', Section: '5', ClauseNo: '5.1', Text: '', SortOrder: 510 });
        eq('O243 a blank Replace row (hand-made) does not block changes', V(op(tS, Q2, { k: 'var', key: 'AdvancePct', value: 45 }), 'AdvancePct').value, 45);
        var ins2 = db.insert, all = []; db.insert = function (t, r) { if (t === 'QuoteTerms') (Array.isArray(r) ? r : [r]).forEach(function (x) { all.push(x.Text); }); return ins2.call(db, t, r); };
        op(tS, Q2, { k: 'var', key: 'AdvancePct', value: 46 }); db.insert = ins2;
        eq('O244 every clause text written with the text mark', all.filter(function (x) { return !/^'/.test(x); }).join('|') + ':' + all.length, ':1');
        db.ensureColumn('Quotes', 'Total'); db.update('Quotes', must(db, 'Quotes', 'QuoteNo', Q4), { Total: 1234.5 });
        eq('O245 list uses the sheet Total when there is one', officeQuoteList(tS).rows.filter(function (r) { return r.no === Q4; })[0].total, 1234.5);
        eq('O237 W3 calls are on the web API list', ['officeQuoteList', 'officeQuoteGet', 'officeQuoteTerm', 'officeQuotePdf', 'officeQuoteEmail'].every(function (n) { return OFFICE_WEB_API_.indexOf(n) >= 0; }), true);
        eq('O238 user_ is the Google user again outside a web call', OQ_ACT_ === '' && user_() === OQ_user0_(), true);
        var QU = [Q1, Q2, Q3, Q4].filter(function (n) { return !oQLocked_(db, oQRow_(db, n)); })[0] || Q1;
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', QU), { PreparedBy: 'STF-0777' });
        eq('O323 D2: terms of a quote someone else prepared: QPREP for Sales, a Director may', [err(function () { op(tS, QU, { k: 'var', key: 'PaymentDays', value: 9 }); }), err(function () { op(tD, QU, { k: 'var', key: 'PaymentDays', value: 9 }); })].join(','), 'QPREP,no error');
        db.update('Quotes', must(db, 'Quotes', 'QuoteNo', QU), { PreparedBy: '' });
      } finally { QF5_STUB_ = keepQ5; QF3_STUB_ = keepQ3; }
    })();
    // --- W4 new / edit quote (SC Staff+): form, new customer / project, save (panel save reused), PDF grid of 7 columns
    if (typeof pdfTestDb_ === 'function') (function () {
      var e5 = oMemEnv_(); OFFICE_ENV_ = e5; var keepQ5 = QF5_STUB_;
      var add = function (em, acc) { oSaveLogin_(e5, { email: em, name: em.split('@')[0], depts: acc, password: 'GoodPass1' }); return officeLogin(em, 'GoodPass1', false).token; };
      var db = pdfTestDb_(); upgradeQT(db); db.ensureColumn('Quotes', 'PDF'); if (typeof upgradeO7 === 'function') { try { upgradeO7(db); } catch (x) { /* sets optional */ } }
      e5.clock.db = db; e5.clock.now = new Date(2026, 10, 20, 10, 0).getTime();
      db.insert('Staff', { StaffID: 'STF-0001', Name: 'Jamal Uddin' });
      var sq = find(db.rows('Sequences'), 'SeqKey', 'Q-2026'); if (sq) db.update('Sequences', sq, { LastNo: 4 }); else nextIds(db, 'Q', 4, new Date(2026, 10, 20));
      db.update('Customers', must(db, 'Customers', 'CustID', 'CUST-0001'), { Email: 'buyer@client.com' });
      var Q2 = 'CAE/Q/2026/002', Q4 = 'CAE/Q/2026/004', made = 0, boom = false;
      QF5_STUB_ = { make: function (d, w, n, o) { if (boom) throw new Error('Drive is down'); var u = 'https://x/' + (++made); if (!(o && o.noLink)) d.update('Quotes', must(d, 'Quotes', 'QuoteNo', n), { PDF: u }); return { url: u, file: 'PDF ' + made + '.pdf', placeholders: 0 }; },
        drive: { name: function () { return ''; }, trash: function () {} } };
      var tD = add('dir4@t.com', oDir_()), tS = (function () { var t = add('sales4@t.com', { SC: 2 }), L = e5.get('OL:sales4@t.com'); L.staff = 'STF-0001'; e5.put('OL:sales4@t.com', L); return t; })(), tV = add('scv4@t.com', { SC: 1 }), tY = add('yard4@t.com', { YW: 2, PS: 1 }), tA = add('acc4@t.com', { AC: 2, PR: 2, SC: 1 });
      var j = JSON.stringify, n0 = function () { return db.rows('Quotes').length; };
      var ql = function (no) { return db.rows('QuoteLines').filter(function (l) { return l.QuoteNo === no; }).sort(function (a, b) { return a.LineNo - b.LineNo; }); };
      var base = function (o) { return Object.assign({ type: 'Rental', cust: 'CUST-0001', site: 'SITE-0001', attention: '', subject: '', date: '2026-11-20', valid: '2026-12-20', prep: 'STF-0001', adv: 50,
        lines: [{ code: 'RL-STD-20', desc: 'Ringlock standard 2.0 m', qty: 100, unit: 'pc / month', rate: 90 }, { code: '', desc: 'Transport', qty: 2, unit: 'trip', rate: 5000 }] }, o || {}); };
      var bad = function (t, o) { return err(function () { officeQuoteSave(t, base(o)); }); };
      var L1 = function (o) { return base({ lines: [Object.assign({ code: '', desc: 'Item', qty: 1, unit: 'pc', rate: 10 }, o)] }); };
      try {
        eq('O250 W4 calls are on the web API list; the scope set-up is not', ['officeQuoteForm', 'officeCustomerAdd', 'officeSiteAdd', 'officeQuoteSave'].every(function (n) { return OFFICE_WEB_API_.indexOf(n) >= 0; }) && OFFICE_WEB_API_.indexOf('officeScopeItemsAdd') < 0, true);
        eq('O251 form: SC View / Accounts (SC View) / Yard / no session refused', [err(function () { officeQuoteForm(tV, ''); }), err(function () { officeQuoteForm(tA, ''); }), err(function () { officeQuoteForm(tY, ''); }), err(function () { officeQuoteForm('nope', ''); })].join(','), 'NOACCESS,NOACCESS,NOACCESS,NOSESSION');
        var F = officeQuoteForm(tS, '');
        eq('O252 new form: customers, projects, items with rates, units, company rates, no quote', [F.money, F.customers.length, F.sites[0].id, F.items.some(function (i) { return i.code === 'RL-STD-20' && i.hire === 90; }), F.units.indexOf('pc') >= 0, F.set.vat, F.set.adv, F.set.validDays, F.quote, F.today].join('|'), 'true|1|SITE-0001|true|true|15|50|30||2026-11-20');
        eq('O253 old-format quotes (months 2, milestone) refused for edit: QOLD', [err(function () { officeQuoteForm(tS, 'CAE/Q/2026/001'); }), err(function () { officeQuoteForm(tS, 'CAE/Q/2026/003'); })].join(','), 'QOLD|2,QOLD|2');
        var F4 = officeQuoteForm(tS, Q4);
        eq('O254 edit form: old Service quote opens as Project, lines in the 7 columns, ev', [F4.quote.type, F4.quote.lines.length, F4.quote.lines[0].unit, F4.quote.lines[0].rate, typeof F4.quote.ev, F4.quote.adv].join('|'), 'Project|1|visit|6000|number|50');
        // new customer / project
        var c1 = officeCustomerAdd(tS, { name: '  New  Builders Ltd ', contact: 'Mr. Karim', phone: '01811-222333', email: 'Karim@NB.test', address: 'Gulshan' });
        eq('O255 new customer registered at once', [/^CUST-\d+$/.test(c1.id), c1.name, c1.email, c1.phone, must(db, 'Customers', 'CustID', c1.id).Status].join('|'), 'true|New Builders Ltd|Karim@NB.test|01811-222333|Active');
        eq('O256 duplicates refused with the existing id: name (Ltd / case / dots), phone, email', [err(function () { officeCustomerAdd(tS, { name: 'NEW BUILDERS LIMITED.' }); }), err(function () { officeCustomerAdd(tS, { name: 'Other Co', phone: '+880 1811 222333' }); }),
          err(function () { officeCustomerAdd(tS, { name: 'Third', email: 'buyer@CLIENT.com' }); }), err(function () { officeCustomerAdd(tS, { name: 'the test client' }); })].join(','), 'DUP|' + c1.id + '|name,DUP|' + c1.id + '|phone,DUP|CUST-0001|email,DUP|CUST-0001|name');
        eq('O257 bad customer input refused', [err(function () { officeCustomerAdd(tS, { name: '  ' }); }), err(function () { officeCustomerAdd(tS, { name: new Array(200).join('a') }); }), err(function () { officeCustomerAdd(tS, { name: 'X1', phone: 'call me' }); }),
          err(function () { officeCustomerAdd(tS, { name: 'X2', email: 'x@' }); }), err(function () { officeCustomerAdd(tS, 'str'); }), err(function () { officeCustomerAdd(tS, { name: ['a'] }); }), err(function () { officeCustomerAdd(tV, { name: 'Viewer Co' }); })].join(','),
          'BADINPUT|name,BADINPUT|name,BADINPUT|phone,BADINPUT|email,BADINPUT|name,BADINPUT|name,NOACCESS');
        var c2 = officeCustomerAdd(tS, { name: '=HYPERLINK("x")' });
        eq('O258 formula-like name stored as text', String(must(db, 'Customers', 'CustID', c2.id).Name).charAt(0), "'");
        var s1 = officeSiteAdd(tS, { cust: c1.id, project: 'Tower B façade', address: 'Plot 9, Gulshan' });
        eq('O259 new project for the customer; same project + address again -> DUP with its id', [/^SITE-\d+$/.test(s1.id), s1.cust, err(function () { officeSiteAdd(tS, { cust: c1.id, project: 'tower b FAÇADE', address: 'plot 9 gulshan' }); })].join('|'), 'true|' + c1.id + '|DUP|' + s1.id + '|project');
        eq('O260 project: same name for another customer is fine; bad input refused', [!!officeSiteAdd(tS, { cust: 'CUST-0001', project: 'Tower B façade', address: 'Plot 9, Gulshan' }).id, err(function () { officeSiteAdd(tS, { cust: 'CUST-9999', project: 'P' }); }),
          err(function () { officeSiteAdd(tS, { cust: c1.id, project: '' }); }), err(function () { officeSiteAdd(tY, { cust: c1.id, project: 'Y' }); })].join(','), 'true,BADINPUT|customer,BADINPUT|project,NOACCESS');
        // save new Rental
        var r1 = officeQuoteSave(tS, base({ attention: 'Mr. X', subject: '-Hire' })), q1 = must(db, 'Quotes', 'QuoteNo', r1.no), l1 = ql(r1.no);
        eq('O261 new Rental saved as Draft Rev 0; "/ month" = Unit pc + Monthly + Months 1, one-off = blank months', [r1.rev, r1.status, l1.length, l1[0].Unit, l1[0].Billing, l1[0].Months, l1[1].Unit, l1[1].Billing, l1[1].Months, q1.AdvancePct, q1.PreparedBy].join('|'), '0|Draft|2|pc|Monthly|1|trip|One-off||0.5|STF-0001');
        var t1 = quoteTotals(db, r1.no);
        eq('O262 totals = Qty x Rate (one month of hire) + VAT', [t1.subtotal, t1.total].join('|'), '19000|21850');
        eq('O263 valid until -> ValidityDays (30 = standard, blank); formula-like subject stored as text', [q1.ValidityDays === '' || q1.ValidityDays == null, String(q1.Subject).charAt(0), q1.Attention].join('|'), "true|'|Mr. X");
        var r2 = officeQuoteSave(tS, base({ valid: '2026-12-05' }));
        eq('O264 15 days valid -> ValidityDays 15', must(db, 'Quotes', 'QuoteNo', r2.no).ValidityDays, 15);
        // Project: measure + lump sum + optional
        var r3 = officeQuoteSave(tS, base({ type: 'Project', lines: [{ code: '', desc: 'External scaffold\nsupply, erect, hire, dismantle', qty: 999, unit: 'm² / month', rate: 95, dim: { L: 20, W: '', H: 12, N: '' } },
          { code: '', desc: 'Design', qty: 5, unit: 'pc', rate: 25000, basis: 'lump' }, { code: '', desc: 'Night work', qty: 1, unit: 'lot', rate: 7000, opt: true }] })), l3 = ql(r3.no);
        eq('O265 measured line: server works out 240 m², monthly; lump sum = 1 lot; optional not in total', [l3[0].Qty, l3[0].Unit, l3[0].Months, l3[0].DimL, l3[0].RateBasis, l3[0].Description.split('\n').length, l3[1].Qty, l3[1].Unit, l3[1].RateBasis, l3[2].Optional + l3[2].Selected, quoteTotals(db, r3.no).subtotal].join('|'), '240|m²|1|20|Per unit|2|1|lot|Lump sum|YesNo|47800');
        var g3 = PDF_SPECS.Quote(db, r3.no).blocks.filter(function (b) { return b.t === 'grid'; })[0];
        eq('O266 PDF grid = the 7 columns (width as before), size + "/ month" in their own columns', [g3.cols.map(function (c) { return c.h; }).join(','), g3.cols.reduce(function (s, c) { return s + c.w; }, 0), g3.rows[0][2], g3.rows[0][4], g3.rows[0][1].indexOf('L 20') < 0, g3.rows[2][6]].join('|'),
          'No.,Description,Size,Qty,Unit,Rate (BDT),Amount (BDT)|482|L 20 m × H 12 m = 240 m²|m² / month|true|(7,000.00)');
        var g1 = PDF_SPECS.Quote(db, 'CAE/Q/2026/001').blocks, gr1 = g1.filter(function (b) { return b.t === 'grid'; })[0];
        eq('O267 old quote PDF (months 2) still totals the same and says x months', [gr1.rows[0][4], gr1.rows[0][6], j(g1).indexOf('Amount = Qty × Rate (× months where shown)') >= 0, gr1.rows[0][2]].join('|'), 'pc / month × 2|10,000.00|true|—');
        // edit
        var F2 = officeQuoteForm(tS, Q2), e2 = F2.quote.lines.map(function (l) { return Object.assign({}, l); }); e2[0].qty = 30;
        var r4 = officeQuoteSave(tS, base({ no: Q2, ev: F2.quote.ev, type: 'Sale', lines: e2 })), q4 = must(db, 'Quotes', 'QuoteNo', Q2);
        eq('O268 edit a Sent quote: same number, Rev 1, Draft; Notes / VAT kept; qty saved', [r4.no, r4.rev, r4.status, r4.was, q4.Notes, q4.VATPct, ql(Q2)[0].Qty, ql(Q2).length].join('|'), Q2 + '|1|Draft|Sent|Include AIT|0.15|30|2');
        eq('O269 same form sent again -> STALE (nothing changed)', [bad(tS, { no: Q2, ev: F2.quote.ev, type: 'Sale', lines: e2 }), ql(Q2)[0].Qty].join('|'), 'STALE|30');
        var F2b = officeQuoteForm(tS, Q2), r5 = officeQuoteSave(tS, base({ no: Q2, ev: F2b.quote.ev, type: 'Sale', lines: F2b.quote.lines }));
        eq('O270 edit a Draft: Rev stays 1; the log names the office login', [r5.rev, r5.status, j(db.rows('Log').slice(-3)).indexOf('office:sales4@t.com') >= 0].join('|'), '1|Draft|true');
        eq('O271 ev must be a number; old-format quote save refused', [bad(tS, { no: Q2, ev: String(F2b.quote.ev) }), bad(tS, { no: 'CAE/Q/2026/001', ev: 1 })].join(','), 'STALE,STALE');
        // CR11: another type -> this quote's term changes go back to standard
        var qT = officeQuoteSave(tS, L1()).no; db.insert('QuoteTerms', [{ QuoteNo: qT, ClauseID: 'X1', Action: 'Replace', Text: 'Custom.' }]); db.update('Quotes', must(db, 'Quotes', 'QuoteNo', qT), { PaymentDays: 7 });
        var FT = officeQuoteForm(tS, qT).quote; officeQuoteSave(tS, base({ no: qT, ev: FT.ev, lines: [{ code: '', desc: 'Item', qty: 3, unit: 'pc', rate: 10 }] }));
        var kT = qtRows_(db, qT).length + ':' + must(db, 'Quotes', 'QuoteNo', qT).PaymentDays; FT = officeQuoteForm(tS, qT).quote;
        officeQuoteSave(tS, base({ no: qT, ev: FT.ev, type: 'Sale', lines: [{ code: '', desc: 'Item', qty: 3, unit: 'pc', rate: 10 }] }));
        eq('O332 same type keeps the term changes; Rental -> Sale drops them (standard Sale terms)', [kT, qtRows_(db, qT).length, must(db, 'Quotes', 'QuoteNo', qT).PaymentDays].join('|'), '1:7|0|');
        // CR10: lines saved but the Rev +1 write failed -> completed on the next action
        var qR = officeQuoteSave(tS, L1()).no; db.update('Quotes', must(db, 'Quotes', 'QuoteNo', qR), { Status: 'Sent' });
        var FR = officeQuoteForm(tS, qR).quote, u0r = db.update, failR = 1, l2 = [{ code: '', desc: 'Item', qty: 2, unit: 'pc', rate: 10 }];
        db.update = function (t, r, p) { if (t === 'Quotes' && p && p.Rev != null && failR) { failR = 0; throw new Error('Service Spreadsheets timed out'); } return u0r.apply(db, arguments); };
        var eR = err(function () { officeQuoteSave(tS, base({ no: qR, ev: FR.ev, lines: l2 })); }); db.update = u0r;
        var pR = e5.get('OQRV:' + qR).rev, r0 = must(db, 'Quotes', 'QuoteNo', qR).Rev + ':' + must(db, 'Quotes', 'QuoteNo', qR).Status, eR2 = bad(tS, { no: qR, ev: FR.ev, lines: l2 }), qR2 = must(db, 'Quotes', 'QuoteNo', qR);
        eq('O333 Rev +1 not written: kept as pending, done on the next save (then STALE: open the latest)', [/timed out/.test(eR), pR, r0, eR2, qR2.Rev, qR2.Status, e5.get('OQRV:' + qR), ql(qR)[0].Qty].join('|'), 'true|1|0:Sent|STALE|1|Draft||2');
        // CR14: the panel's withLock also takes the script lock; inside a web-app lock it does not take it again
        var lk = [], fk = { getScriptLock: function () { return { waitLock: function () { lk.push('s+'); }, releaseLock: function () { lk.push('s-'); } }; }, getDocumentLock: function () { return { waitLock: function () { lk.push('d+'); }, releaseLock: function () { lk.push('d-'); } }; } };
        var ls0 = OLK_.ls; OLK_.ls = fk;
        var sw0 = uiDo.officeLk_ || (uiDo.officeRaw_ || {}).officeLk_;
        try { withLock(function () { lk.push('in:' + OLK_.s); }); officeEnv_().lock(function () { withLock(function () { lk.push('in2:' + OLK_.s); }); });
          OLK_.np = true; withLock(function () { lk.push('np:' + OLK_.s); }); OLK_.np = false; } finally { OLK_.ls = ls0; OLK_.np = false; }
        eq('O334 panel writes hold the script lock around the panel\'s own (document) lock; nested calls take nothing twice; a panel PDF does not', [lk.join(' '), OLK_.s, typeof sw0].join('|'), 's+ in:1 s- s+ in2:1 s- np:0|0|function');
        // refusals: nothing written
        var nq = n0();
        eq('O272 bad header input', [bad(tS, { type: 'Service' }), bad(tS, { cust: 'CUST-0999' }), bad(tS, { site: s1.id }), bad(tS, { date: '2026-02-30' }), bad(tS, { valid: '2026-11-19' }), bad(tS, { valid: '2028-01-01' }),
          bad(tS, { adv: 101 }), bad(tS, { adv: '50' }), bad(tS, { adv: 33.333 }), bad(tS, { prep: 'STF-0999' }), bad(tS, { attention: { x: 1 } }), bad(tS, { date: '2019-12-31' })].join(','),
          'BADINPUT|type,BADINPUT|customer,BADINPUT|project,BADINPUT|date,BADINPUT|valid until,BADINPUT|valid until,BADINPUT|advance,BADINPUT|advance,BADINPUT|advance,BADINPUT|prepared by,BADINPUT|attention,BADINPUT|date');
        var many = []; for (var k = 0; k < 201; k++) many.push({ code: '', desc: 'x' + k, qty: 1, unit: 'pc', rate: 1 });
        eq('O273 bad lines', [bad(tS, { lines: [] }), bad(tS, { lines: many }), bad(tS, { lines: 'x' }), bad(tS, { lines: [null] }), err(function () { officeQuoteSave(tS, L1({ unit: 'bags' })); }), err(function () { officeQuoteSave(tS, base({ type: 'Sale', lines: [{ desc: 'x', qty: 1, unit: 'pc / month', rate: 1 }] })); }),
          err(function () { officeQuoteSave(tS, L1({ qty: 0 })); }), err(function () { officeQuoteSave(tS, L1({ qty: -1 })); }), err(function () { officeQuoteSave(tS, L1({ qty: '5' })); }), err(function () { officeQuoteSave(tS, L1({ rate: -5 })); }), err(function () { officeQuoteSave(tS, L1({ rate: 1.234 })); }),
          err(function () { officeQuoteSave(tS, L1({ code: 'NOPE' })); }), err(function () { officeQuoteSave(tS, L1({ code: '__proto__' })); }), err(function () { officeQuoteSave(tS, L1({ desc: '  ' })); }), err(function () { officeQuoteSave(tS, L1({ desc: new Array(600).join('a') })); }), err(function () { officeQuoteSave(tS, L1({ opt: 'yes' })); }),
          err(function () { officeQuoteSave(tS, L1({ dim: { L: 20, H: '' } })); }), err(function () { officeQuoteSave(tS, L1({ dim: { L: 20, H: 3, N: 1.5 } })); }), err(function () { officeQuoteSave(tS, L1({ basis: 'free' })); }), err(function () { officeQuoteSave(tS, L1({ qty: NaN })); }), err(function () { officeQuoteSave(tS, L1({ rate: Infinity })); })].join(','),
          'BADINPUT|lines,BADINPUT|lines,BADINPUT|lines,BADINPUT|line 1,BADINPUT|line 1 unit,BADINPUT|line 1 unit,BADINPUT|line 1 qty,BADINPUT|line 1 qty,BADINPUT|line 1 qty,BADINPUT|line 1 rate,BADINPUT|line 1 rate,BADINPUT|line 1 item,BADINPUT|line 1 item,BADINPUT|line 1 description,BADINPUT|line 1 description,BADINPUT|line 1 optional,BADINPUT|line 1 size,BADINPUT|line 1 size,BADINPUT|line 1 rate basis,BADINPUT|line 1 qty,BADINPUT|line 1 rate');
        eq('O274 no access: SC View, Accounts (SC View), Yard, stranger; bad shapes', [bad(tV), bad(tA), bad(tY), bad('x'), err(function () { officeQuoteSave(tS, 'x'); }), err(function () { officeQuoteSave(tS, [1]); }), err(function () { officeQuoteSave(tS, base({ no: 'NO SUCH' })); })].join(','),
          'NOACCESS,NOACCESS,NOACCESS,NOSESSION,BADINPUT|quote,BADINPUT|quote,NOTFOUND');
        eq('O275 nothing written by any refusal', n0(), nq);
        db.insert('Staff', { StaffID: 'STF-0009', Name: 'Other Person' });
        eq('O322 D2: a non-Director names only themselves as preparer (they sign the PDF); a Director anyone', [bad(tS, { prep: 'STF-0009' }), n0() === nq, err(function () { officeQuoteSave(tS, base({ prep: '' })); }), err(function () { officeQuoteSave(tD, base({ prep: 'STF-0009' })); })].join(','), 'BADINPUT|prepared by,true,no error,no error');
        // locked
        db.insert('Jobs', { JobNo: 'CAE/J/2026/009', QuoteNo: Q4 });
        var F4b = F4.quote;
        eq('O276 a quote with a job: form + save QLOCKED; Accepted too', [err(function () { officeQuoteForm(tS, Q4); }), bad(tS, { no: Q4, ev: F4b.ev, type: 'Project', lines: F4b.lines }),
          (db.update('Quotes', must(db, 'Quotes', 'QuoteNo', r2.no), { Status: 'Accepted' }), err(function () { officeQuoteForm(tS, r2.no); }))].join(','), 'QLOCKED,QLOCKED,QLOCKED');
        // PDF with the save
        var r6 = officeQuoteSave(tS, base({ pdf: true }));
        boom = true; var r7 = officeQuoteSave(tS, base({ pdf: true })); boom = false;
        eq('O277 Save & make PDF: link back; a PDF failure keeps the saved quote', [/^https:\/\/x\/\d+$/.test(r6.pdf), r7.pdf, !!r7.pdfErr, !!find(db.rows('Quotes'), 'QuoteNo', r7.no)].join('|'), 'true||true|true');
        // flood
        e5.cput('OQEW:sales4@t.com', { t: e5.clock.now, n: OQE_RATE_.n }, 600);
        eq('O278 too many writes from one login in 10 min -> SLOW; a Director is counted separately', [bad(tS), !!officeQuoteSave(tD, base()).no].join('|'), 'SLOW|true');
        e5.clock.now += 601000;
        eq('O279 the count starts again after 10 min', !!officeQuoteSave(tS, base()).no, true);
        // scope items
        eq('O280 project scopes: 5 Items rows once (Category Project scope, no stock, not for hire / sale)', [oQeScopeAdd_(db), oQeScopeAdd_(db), must(db, 'Items', 'ItemCode', 'SV-ALU').Category, must(db, 'Items', 'ItemCode', 'SV-ALU').StockTracked, must(db, 'Items', 'ItemCode', 'SV-ALU').ForHire, must(db, 'Items', 'ItemCode', 'SV-TWR').Name].join('|'), '5|0|Project scope|No|No|Tower scaffold');
        var F5 = officeQuoteForm(tS, '');
        eq('O281 form lists the scopes; inactive items are left out; sets come with their parts', [F5.items.filter(function (i) { return i.cat === 'Project scope'; }).length,
          (db.update('Items', must(db, 'Items', 'ItemCode', 'SV-INT'), { Status: 'Inactive' }), officeQuoteForm(tS, '').items.some(function (i) { return i.code === 'SV-INT'; })),
          db.hasTab('KitParts') ? Object.keys(F5.kits).length >= 0 : true].join('|'), '5|false|true');
        eq('O282 the monthly flag: hire billing sees the "/ month" line only', ql(r1.no).filter(function (l) { return num(l.Months) > 0; }).map(function (l) { return l.ItemCode; }).join(','), 'RL-STD-20');
        // review fixes
        var c3 = officeCustomerAdd(tS, { name: 'Formula Contact Co', contact: '=IMPORTXML("http://x/"&A1,"//a")', phone: '+880 1911-777888' });
        var s3 = officeSiteAdd(tS, { cust: c3.id, project: 'P3' }), r8 = officeQuoteSave(tS, base({ cust: c3.id, site: s3.id }));
        eq('O284 blank attention filled from the contact as text; +880 phone accepted', [String(must(db, 'Quotes', 'QuoteNo', r8.no).Attention).charAt(0), c3.phone].join('|'), "'|+880 1911-777888");
        eq('O285 email / phone that could be formulas refused', [err(function () { officeCustomerAdd(tS, { name: 'E1', email: '=A1@b.co' }); }), err(function () { officeCustomerAdd(tS, { name: 'E2', email: 'a@b.co, -x+1@b.co' }); }), err(function () { officeCustomerAdd(tS, { name: 'E3', phone: '-1234567' }); })].join(','), 'BADINPUT|email,BADINPUT|email,BADINPUT|phone');
        var qS = officeQuoteSave(tS, base()).no; db.update('Quotes', must(db, 'Quotes', 'QuoteNo', qS), { Status: 'Sent' });
        var FS = officeQuoteForm(tS, qS).quote, rS = officeQuoteSave(tS, base({ no: qS, ev: FS.ev, lines: FS.lines, attention: FS.attention, subject: FS.subject, valid: FS.valid, date: FS.date }));
        eq('O286 a Sent quote saved without changes stays Sent, same Rev', [rS.rev, rS.status, rS.changed].join('|'), '0|Sent|false');
        db.update('QuoteLines', ql(qS)[1], { Optional: 'Yes', Selected: 'Yes' });
        var FO = officeQuoteForm(tS, qS).quote, rO = officeQuoteSave(tS, base({ no: qS, ev: FO.ev, lines: FO.lines, attention: FO.attention, subject: FO.subject, valid: FO.valid }));
        eq('O287 an optional line the client chose keeps Optional + Selected', [FO.lines[1].opt, FO.lines[1].chosen, ql(qS)[1].Optional, ql(qS)[1].Selected].join('|'), 'true|true|Yes|Yes');
        db.insert('Quotes', { QuoteNo: 'CAE/Q/2026/090', Rev: 0, QuoteType: 'Service', QuoteDate: toDate('20-Nov-2026'), CustID: 'CUST-0001', SiteID: 'SITE-0001', AdvancePct: 0.5, VATPct: 0.15, Status: 'Draft' });
        db.insert('QuoteLines', { LineID: 'QL-0901', QuoteNo: 'CAE/Q/2026/090', LineNo: 1, Description: 'Inspection', Unit: 'visit', Qty: 2, Rate: 100, Optional: 'No', Selected: 'Yes' });
        var FV = officeQuoteForm(tS, 'CAE/Q/2026/090').quote, rV = officeQuoteSave(tS, base({ no: 'CAE/Q/2026/090', ev: FV.ev, type: 'Project', lines: FV.lines }));
        eq('O288 an old Service quote opens as Project and stays Service', [FV.type, FV.svc, must(db, 'Quotes', 'QuoteNo', 'CAE/Q/2026/090').QuoteType].join('|'), 'Project|true|Service');
        var FV2 = officeQuoteForm(tS, 'CAE/Q/2026/090').quote;
        eq('O293 a kept Service quote takes no "/ month" line', err(function () { officeQuoteSave(tS, base({ no: 'CAE/Q/2026/090', ev: FV2.ev, type: 'Project', lines: [{ desc: 'Hire', qty: 1, unit: 'm² / month', rate: 1 }] })); }), 'BADINPUT|line 1 unit');
        eq('O289 huge measure / amount refused', [err(function () { officeQuoteSave(tS, L1({ dim: { L: 10000, H: 10000, N: 1000 }, unit: 'm²' })); }), err(function () { officeQuoteSave(tS, L1({ qty: 1e7, rate: 1e9 })); })].join(','), 'BADINPUT|line 1 size,BADINPUT|line 1 amount');
        eq('O290 Bengali names that differ only in vowel signs are not duplicates', [oQeKey_('কলা') === oQeKey_('কালো'), oQeKey_('ABC Ltd.') === oQeKey_('abc')].join('|'), 'false|true');
        db.update('Items', must(db, 'Items', 'ItemCode', 'SV-TRANS'), { Status: 'Inactive' });
        eq('O291 an inactive item is refused on a new line, kept on a quote that has it', [err(function () { officeQuoteSave(tS, L1({ code: 'SV-TRANS' })); }), (function () { var F9 = officeQuoteForm(tS, Q2).quote; return officeQuoteSave(tS, base({ no: Q2, ev: F9.ev, type: 'Sale', lines: F9.lines })).no; })()].join(','), 'BADINPUT|line 1 item,' + Q2);
        e5.cdel('OQEW:sales4@t.com'); for (var z = 0; z < OQE_RATE_.n; z++) err(function () { officeCustomerAdd(tS, { name: 'NEW BUILDERS' }); });
        eq('O292 refused tries count too (SLOW after 60 duplicates)', err(function () { officeCustomerAdd(tS, { name: 'Fresh Name' }); }), 'SLOW');
        eq('O283 user_ is the Google user again outside a web call', OQ_ACT_ === '' && user_() === OQ_user0_(), true);
        e5.cdel('OQEW:sales4@t.com'); var sv = officeQuoteSave(tS, base({ subject: 'W4c view' })), gv = officeQuoteGet(tS, sv.no);
        var kv = oQView_, n37 = n0(); oQView_ = function () { throw new Error('NOSESSION'); }; var sv2 = null; e5.cdel('OQEW:sales4@t.com');
        try { sv2 = officeQuoteSave(tS, base({ subject: 'W4c gate' })); } catch (x) { sv2 = String(x.message); } finally { oQView_ = kv; }
        eq('O346 W4c: a save that worked is reported as saved even if the view fails (no view, page loads it)', [typeof sv2 === 'object' && /^CAE\/Q\//.test(sv2.no), sv2 && sv2.view === undefined, n0() === n37 + 1].join('|'), 'true|true|true');
        eq('O337 W4c: the save returns the quote view = officeQuoteGet (no second call)', [!!sv.view, sv.view && sv.view.no === sv.no, j(sv.view) === j(gv), sv.view && sv.view.subject].join('|'), 'true|true|true|W4c view');
      } finally { QF5_STUB_ = keepQ5; }
    })();
    // --- D2 signatures + company stamp: uploads (own / Director), checks by bytes, PDF sign block on every kind
    if (typeof pdfTestDb_ === 'function') (function () {
      var e6 = oMemEnv_(); OFFICE_ENV_ = e6; var keepDrv = OSG_DRV_, keepPick = OSG_PICK_;
      var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      var enc = function (b) { var s = ''; for (var i = 0; i < b.length; i += 3) { var n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0); s += A.charAt(n >>> 18 & 63) + A.charAt(n >>> 12 & 63) + (i + 1 < b.length ? A.charAt(n >>> 6 & 63) : '=') + (i + 2 < b.length ? A.charAt(n & 63) : '='); } return s; };
      var be = function (n) { return [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255]; };
      var png = function (w, h, pad) { var d = [120, 1]; for (var i = 0; i < (pad || 0); i++) d.push(0); return [137, 80, 78, 71, 13, 10, 26, 10].concat(be(13), [73, 72, 68, 82], be(w), be(h), [8, 6, 0, 0, 0], [1, 2, 3, 4], be(d.length), [73, 68, 65, 84], d, [5, 6, 7, 8], be(0), [73, 69, 78, 68], [174, 66, 96, 130]); };
      var jpg = function (w, h, eoi, sof) { return [255, 216, 255, 224, 0, 4, 1, 2, 255, sof || 192, 0, 17, 8, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 34, 0, 2, 17, 1, 3, 17, 1, 255, 218, 0, 8, 1, 1, 0, 0, 63, 0, 9, 9, 9].concat(eoi === false ? [1, 2] : [255, 217]); };
      var files = {}, fid = 0, made = [], undec = [];
      var put = function (id, bytes, mime, name, w, h) { files[id] = { b: bytes, m: mime, n: name, w: w || 600, h: h || 200, bin: false }; return id; };
      OSG_DRV_ = {
        info: function (id) { var f = files[id]; return f && !f.bin ? { size: f.b.length, mime: f.m, name: f.n } : null; },
        blob: function (id) { var f = files[id]; if (f && f.boom) throw new Error('drive down'); return f && !f.bin ? { id: id, w: f.w, h: f.h } : null; },
        b64: function (id) { var f = files[id]; return f && !f.bin ? enc(f.b) : null; },
        add: function (name, mime, bytes) { var id = 'FILE-' + ('00000' + (++fid)).slice(-6); made.push(id); return put(id, bytes, mime, name); },
        bin: function (id) { if (files[id]) files[id].bin = true; return true; },
        decodes: function (b) { return !undec.some(function (u) { return u.length === b.length && u.every(function (x, i) { return x === b[i]; }); }); }
      };
      OSG_SEED_.forEach(function (x) { put(x[1], png(800, 300), 'image/png', 'seed ' + x[0]); });
      put(OSG_STAMP_SEED_, png(500, 500), 'image/png', 'CoreAccess_Company_Stamp.png');
      var db = pdfTestDb_(); e6.clock.db = db; e6.clock.now = new Date(2026, 10, 20, 10, 0).getTime();
      db.insert('Staff', [{ StaffID: 'STF-002', Name: 'Jamal Uddin', Role: 'Contracts & Technical Director', Status: 'Active' }, { StaffID: 'STF-004', Name: 'Md. Mohosin Miah', Role: 'Managing Director' }, { StaffID: 'STF-005', Name: 'Mohammad Junait', Role: 'Chairman' },
        { StaffID: 'STF-101', Name: 'Sales Person', Role: 'Sales Engineer' }, { StaffID: 'STF-102', Name: 'Left Person', Role: 'Engineer', Status: 'Left' }, { StaffID: 'STF-103', Name: 'Other Person', Role: 'Site Engineer' }]);
      var add = function (em, acc, staff) { oSaveLogin_(e6, { email: em, name: em.split('@')[0], depts: acc, password: 'GoodPass1' }); if (staff) { var L = e6.get('OL:' + em); L.staff = staff; e6.put('OL:' + em, L); } return officeLogin(em, 'GoodPass1', false).token; };
      var tD = add('dir6@t.com', oDir_(), 'STF-002'), tS = add('sales6@t.com', { SC: 2 }, 'STF-101'), tN = add('none6@t.com', { SC: 2 }), tO = add('other6@t.com', { PS: 2 }, 'STF-103');
      var clr = function () { Object.keys(e6.cache).forEach(function (k) { if (/^OSG_/.test(k)) delete e6.cache[k]; }); };
      var j = JSON.stringify, cnt = function () { return j([Object.keys(files).length, e6.keys().filter(function (k) { return /^OSG/.test(k) && k.indexOf('OSG_N:') < 0; }).sort().map(function (k) { return k + j(e6.get(k)); })]); };
      var P = enc(png(400, 150)), lists = PDF_SPECS && typeof pdfSampleList_ === 'function' ? pdfSampleList_(db) : [], no = function (k) { var x = lists.filter(function (y) { return y[0] === k; })[0]; return x ? x[1] : ''; };
      var sp = function (k, n) { return PDF_SPECS[k](db, n || no(k)); }, os = function (s) { return s.blocks.filter(function (b) { return b.t === 'osign'; }); };
      try {
        eq('O294 D2 calls are on the web API list; the seed is not', ['officeSigGet', 'officeSigSave', 'officeSigRemove', 'officeStampGet', 'officeStampSave'].every(function (n) { return OFFICE_WEB_API_.indexOf(n) >= 0; }) && OFFICE_WEB_API_.indexOf('officeSigSeed') < 0, true);
        var miss = OSG_SEED_[3][1]; files[miss].bin = true;
        eq('O295 seed: signatures + stamp added once; a missing file is listed', [oSgSeed_(e6), (files[miss].bin = false, oSgSeed_(e6)), oSgSeed_(e6)].join(' / '),
          'STF-002 added, STF-004 added, STF-005 added, STF-006 FILE MISSING, stamp added / STF-002 kept, STF-004 kept, STF-005 kept, STF-006 added, stamp kept / STF-002 kept, STF-004 kept, STF-005 kept, STF-006 kept, stamp kept');
        var g1 = officeSigGet(tD, 'STF-004');
        eq('O296 get: a Director sees anyone\'s (image as a data URL); own signature; others refused', [g1.on, /^data:image\/png;base64,[A-Za-z0-9+\/]+=*$/.test(g1.img), g1.name, officeSigGet(tS, 'STF-101').on,
          err(function () { officeSigGet(tS, 'STF-004'); }), err(function () { officeSigGet(tN, 'STF-101'); }), err(function () { officeSigGet(tD, 'STF-999'); }), err(function () { officeSigGet(tS, 'STF-999'); }),
          err(function () { officeSigGet('x', 'STF-101'); }), err(function () { officeSigGet(tD, { a: 1 }); }), err(function () { officeSigGet(tD, '__proto__'); })].join(','),
          'true,true,Md. Mohosin Miah,false,NOACCESS,NOACCESS,NOSTAFF,NOACCESS,NOSESSION,NOSTAFF,NOSTAFF');
        var s1 = officeSigSave(tS, 'STF-101', P), f1 = made[0];
        eq('O297 own upload: PNG saved in the folder, record says on file; no image in the save reply', [s1.on, s1.bytes, files[f1].m, /^Signature_STF-101_\d+\.png$/.test(files[f1].n), s1.img, e6.get('OSG:STF-101').by].join('|'), 'true|' + png(400, 150).length + '|image/png|true||sales6@t.com');
        officeSigSave(tS, 'STF-101', enc(jpg(300, 120)));
        eq('O298 replace: the old system file is binned; a JPEG is stored as JPEG', [files[f1].bin, files[made[1]].m, /\.jpg$/.test(files[made[1]].n)].join('|'), 'true|image/jpeg|true');
        officeSigSave(tD, 'STF-004', P);
        clr(); var k5 = j(e6.get('OSG:STF-101')), f5 = e6.get('OSG:STF-101').f, ub = png(401, 150); undec.push(ub); var m5 = made.length;
        eq('O331 a picture that does not decode: BADIMG|broken, the old signature + file kept, nothing new in Drive', [err(function () { officeSigSave(tS, 'STF-101', enc(ub)); }), j(e6.get('OSG:STF-101')) === k5, files[f5].bin, made.length - m5].join('|'), 'BADIMG|broken|true|false|0');
        clr();
        eq('O299 a Director replaces a seeded signature: the seed file stays in the folder', [files[OSG_SEED_[1][1]].bin, e6.get('OSG:STF-004').f === made[2]].join('|'), 'false|true');
        var c0 = cnt(), big = png(800, 300, OSG_MAX_);
        var B = function (t, s, d) { return err(function () { officeSigSave(t, s, d); }); };
        eq('O300 bad uploads refused, nothing written', [B(tS, 'STF-101', 'not base64!'), B(tS, 'STF-101', enc([60, 115, 118, 103, 32, 111, 110, 108, 111, 97, 100, 61, 34, 120, 34, 62])), B(tS, 'STF-101', enc([71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0])),
          B(tS, 'STF-101', enc([37, 80, 68, 70, 45, 49, 46, 52])), B(tS, 'STF-101', enc(jpg(300, 120, false))), B(tS, 'STF-101', enc(png(400, 150).slice(0, 40))), B(tS, 'STF-101', enc(big)), B(tS, 'STF-101', new Array(2e6).join('A')),
          B(tS, 'STF-101', enc(png(8, 8))), B(tS, 'STF-101', enc(png(9000, 100))), B(tS, 'STF-101', enc(png(6000, 6000))), B(tS, 'STF-101', enc(png(100, 100).slice(0, 33).concat(png(100, 100).slice(-12)))), B(tS, 'STF-101', enc(jpg(100, 100, true, 195))),
          B(tS, 'STF-101', enc([255, 216, 255, 192, 0, 17, 8, 0, 100, 0, 100, 255, 217])), B(tS, 'STF-101', 12345), B(tS, 'STF-101', { a: 1 }), B(tS, 'STF-101', ''), B(tS, 'STF-101', 'QUJD=A==')].join(','),
          'BADIMG|type,BADIMG|type,BADIMG|type,BADIMG|type,BADIMG|broken,BADIMG|broken,BADIMG|size,BADIMG|size,BADIMG|pixels,BADIMG|pixels,BADIMG|pixels,BADIMG|broken,BADIMG|type,BADIMG|broken,BADIMG|type,BADIMG|type,BADIMG|type,BADIMG|type');
        clr();
        eq('O301 someone else\'s signature by a non-Director; no Staff link; unknown staff; stamp by a non-Director -> refused, nothing written',
          [B(tS, 'STF-004', P), B(tO, 'STF-101', P), B(tN, 'STF-101', P), B(tD, 'STF-999', P), B(tN, '', P), err(function () { officeStampSave(tS, P); }), err(function () { officeStampGet(tS); }), err(function () { officeSigRemove(tS, 'STF-004'); }), cnt() === c0].join(','),
          'NOACCESS,NOACCESS,NOACCESS,NOSTAFF,NOSTAFF,NOACCESS,NOACCESS,NOACCESS,true');
        clr();
        var st = officeStampSave(tD, P);
        eq('O302 stamp: Director replaces it; the MOU stamp file is kept; get shows the image', [st.on, files[OSG_STAMP_SEED_].bin, e6.get('OSG_STAMP').f === made[made.length - 1], /^data:image\/png/.test(officeStampGet(tD).img)].join('|'), 'true|false|true|true');
        clr();
        var keepF = e6.get('OSG:STF-101').f, rm = officeSigRemove(tS, 'STF-101');
        eq('O303 remove own: record gone, system file binned; seeded one removed by a Director: file kept', [rm.on, !!oSgRec_(e6, 'OSG:STF-101'), files[keepF].bin, (officeSigRemove(tD, 'STF-005'), files[OSG_SEED_[2][1]].bin), !!oSgRec_(e6, 'OSG:STF-005')].join('|'), 'false|false|true|false|false');
        eq('O318 the seed never brings back a removed signature', [oSgSeed_(e6).indexOf('STF-005 removed earlier (left off)') >= 0, !!oSgRec_(e6, 'OSG:STF-005')].join('|'), 'true|false');
        clr();
        var L6 = e6.get('OL:sales6@t.com'); L6.status = 'Blocked'; e6.put('OL:sales6@t.com', L6);
        eq('O304 a blocked login can not read or upload', [err(function () { officeSigGet(tS, 'STF-101'); }), B(tS, 'STF-101', P)].join(','), 'NOSESSION,NOSESSION');
        L6.status = 'Active'; e6.put('OL:sales6@t.com', L6);
        clr(); for (var z2 = 0; z2 < OSG_PER_HOUR_; z2++) B(tS, 'STF-004', P);
        eq('O321 refused NOACCESS tries count too (someone else\'s signature 20 times -> SLOW, even for own)', B(tS, 'STF-101', P), 'SLOW');
        e6.cdel('OSG_N:other6@t.com'); for (var z = 0; z < OSG_PER_HOUR_; z++) B(tO, 'STF-103', 'bad');
        eq('O305 refused tries count: 21st upload in an hour -> SLOW; a new hour starts again', [B(tO, 'STF-103', P), (e6.cdel('OSG_N:other6@t.com'), officeSigSave(tO, 'STF-103', P).on)].join(','), 'SLOW,true');
        // PDF specs (sample set): quote by its preparer, PI by the quote's, invoice / note / PO by the pick, challan optional
        var Q = no('Quote'), q = find(db.rows('Quotes'), 'QuoteNo', Q); db.update('Quotes', q, { PreparedBy: 'STF-002' });
        var sq = sp('Quote'), o1 = os(sq)[0], last = sq.blocks[sq.blocks.length - 1];
        eq('O306 quote: our sign block = preparer + signature file + stamp; acceptance block kept; digital line last', [os(sq).length, o1.s.name, o1.s.title, o1.s.sig === e6.get('OSG:STF-002').f, o1.role, o1.stamp === e6.get('OSG_STAMP').f,
          sq.blocks.filter(oSgIsOurs_).length, sq.blocks.some(function (b) { return b.t === 'sig' && b.cols[0].head === 'For the client'; }), last.text === OSG_LINE_, !!sq.docCtl].join('|'),
          '1|Jamal Uddin|Contracts & Technical Director|true|Prepared by|true|0|true|true|true');
        var pi = find(db.rows('Proformas'), 'PINo', no('PI')); if (pi) db.update('Proformas', pi, { QuoteNo: Q });
        OSG_PICK_ = 'STF-004';
        eq('O307 proforma: its quote\'s preparer wins over a pick', os(sp('PI'))[0].s.id, 'STF-002');
        eq('O308 invoice / notes / PO: the picked signer', ['Invoice', 'Note', 'PO'].map(function (k) { return os(sp(k))[0].s.name; }).join(','), 'Md. Mohosin Miah,Md. Mohosin Miah,Md. Mohosin Miah');
        OSG_PICK_ = null;
        var ch = no('Challan') ? sp('Challan') : null, chs = ch ? ch.blocks.filter(function (b) { return b.t === 'sig'; })[0] : null;
        eq('O309 no pick: invoice unsigned (empty lines); challan: our block + Driver / Received by kept; PO keeps the supplier side',
          [j(os(sp('Invoice'))[0].s), os(ch)[0].role, chs.cols.map(function (c) { return c.head; }).join('+'),
            sp('PO').blocks.filter(function (b) { return b.t === 'sig'; })[0].cols[0].head, ['PI', 'Invoice', 'Note', 'PO', 'Challan'].every(function (k) { var s = sp(k); return s.blocks[s.blocks.length - 1].text === OSG_LINE_; })].join('|'),
          'null|Issued by|Transporter / driver+Received by (client, with seal)|Supplier acceptance|true');
        db.update('Quotes', q, { PreparedBy: 'left person' });
        var a1 = os(sp('Quote'))[0].s; db.update('Quotes', q, { PreparedBy: 'A. Stranger' }); var a2 = os(sp('Quote'))[0].s;
        e6.put('OSG:STF-102', { f: made[0], by: 'x', at: 1 });
        eq('O310 preparer by name (case ignored); a Staff row not Active signs without image; a name not in Staff prints as typed', [a1.id, a1.name, os(sp('Quote', Q))[0].s.sig || '-', a2.name, a2.title || '-', a2.sig || '-'].join('|'), 'STF-102|Left Person|-|A. Stranger|-|-');
        db.update('Quotes', q, { PreparedBy: 'STF-002' });
        clr();
        var v1 = j(sp('Quote').blocks); officeSigSave(tD, 'STF-002', enc(png(500, 160)));
        eq('O311 a new signature changes the quote PDF spec (the web app makes a new PDF); the same one does not', [v1 !== j(sp('Quote').blocks), j(sp('Quote').blocks) === j(sp('Quote').blocks)].join('|'), 'true|true');
        // renderer with a fake document
        var calls = [], P2 = function () { var p = { t: '', imgs: [], setSpacingBefore: function () { return p; }, setSpacingAfter: function () { return p; }, setLineSpacing: function () { return p; }, setAlignment: function () { return p; },
          setIndentStart: function () { return p; }, setIndentFirstLine: function () { return p; }, editAsText: function () { var t = {}; ['setFontFamily', 'setFontSize', 'setForegroundColor', 'setBold', 'setItalic'].forEach(function (m) { t[m] = function () { return t; }; }); return t; },
          appendInlineImage: function (bl) { var im = { w: bl.w, h: bl.h, getWidth: function () { return im.w; }, getHeight: function () { return im.h; }, setWidth: function (x) { im.w = x; return im; }, setHeight: function (x) { im.h = x; return im; } }; p.imgs.push(im); calls.push(im); return im; } }; return p; };
        var paras = [], body = { appendParagraph: function (t) { var p = P2(); p.t = t; paras.push(p); return p; }, appendTable: function () {
          var mk = function () { var kids = [P2()], c = { getChild: function (i) { return { asParagraph: function () { return kids[i]; } }; }, appendParagraph: function (t) { var p = P2(); p.t = t; kids.push(p); paras.push(p); return p; } };
            ['setPaddingTop', 'setPaddingBottom', 'setPaddingLeft', 'setPaddingRight', 'setVerticalAlignment'].forEach(function (m) { c[m] = function () { return c; }; }); return c; };
          var cs = [mk(), mk()], t = { setBorderWidth: function () { return t; }, setColumnWidth: function () { return t; }, getCell: function (r, i) { return cs[i]; } }; return t; } };
        var ob = os(sp('Quote'))[0];
        BLOCKS_.osign(body, ob);
        eq('O312 render: signature fitted in 160 x 46 pt, stamp in 84 x 84 pt, name + title · Prepared by', [calls.length, calls[0].w <= 160 && calls[0].h <= 46, calls[1].w <= 84 && calls[1].h <= 84, paras.some(function (p) { return p.t === 'Jamal Uddin'; }), paras.some(function (p) { return p.t === 'Contracts & Technical Director · Prepared by'; })].join('|'), '2|true|true|true|true');
        calls.length = 0; paras.length = 0; files[ob.s.sig].boom = true; files[ob.stamp].bin = true;
        var ok = err(function () { BLOCKS_.osign(body, ob); });
        BLOCKS_.osign(body, { t: 'osign', s: null, role: '', stamp: '' });
        eq('O313 render never fails: a broken / binned image -> empty sign line; unsigned -> Name / Designation lines', [ok, calls.length, paras.some(function (p) { return p.t === 'Name: ______________________'; }), paras.some(function (p) { return p.t === 'Designation: ________________'; })].join('|'), 'no error|0|true|true');
        files[ob.s.sig].boom = false; files[ob.stamp].bin = false;
        // wrappers + lists
        eq('O314 every PDF kind is wrapped (D1 marker kept); makePdf keeps the folder marker and restores the pick', [Object.keys(PDF_SPECS).every(function (k) { return !!PDF_SPECS[k].officeSg_ && !!PDF_SPECS[k].officeCtl_; }),
          !!((makePdf.officeRaw_ || makePdf).officeSg_), !!((makePdf.officeRaw_ || makePdf).officePdf_), typeof BLOCKS_.osign].join('|'), 'true|true|true|function');
        var seen = [], mk0 = OSG_makePdf0_; OSG_makePdf0_ = function () { seen.push(OSG_PICK_); if (seen.length > 1) throw new Error('x'); return { file: 'f.pdf', url: 'u', doc: '', placeholders: 0 }; };
        try { var pr = UI_ACTIONS_.pdf(db, { what: 'Challan', no: 'X', signer: 'STF-004' }); err(function () { makePdf(db, 'Challan', 'X', { signer: { a: 1 } }); }); } finally { OSG_makePdf0_ = mk0; }
        eq('O315 panel PDF passes the picked signer; an odd pick is ignored; the pick is cleared after (also on error)', [seen.join(','), pr.msg, j(OSG_PICK_)].join('|'), 'STF-004,|f.pdf saved.|null');
        clr();
        var us = officeUsersList(tD).rows, flag = function (e) { return us.filter(function (r) { return r.email === e; })[0].sig; };
        eq('O316 users list: on-file flag only (never the image); signer list for the panel: active staff only', [flag('dir6@t.com'), flag('none6@t.com'), j(us).indexOf('base64') < 0, officeMe(tS).staff,
          j(uiGetDb_(db, 'docs', {})._signers.map(function (x) { return x[0]; })).indexOf('STF-102') < 0, uiGetDb_(db, 'docs', {})._signers.filter(function (x) { return x[0] === 'STF-101'; })[0][1]].join('|'), 'true|false|true|STF-101|true|Sales Person (no signature on file)');
        db.insert('Staff', { StaffID: 'STF-004', Name: 'Copy Row', Role: 'x' });
        OSG_PICK_ = 'STF-004'; var dup = os(sp('Invoice'))[0].s; OSG_PICK_ = null;
        eq('O319 two Staff rows with one StaffID: name only, no image', [dup.name, dup.sig || '-'].join('|'), 'Md. Mohosin Miah|-');
        var tries = 0, mk1 = OSG_makePdf0_, r9, e9;
        OSG_makePdf0_ = function () { tries++; if (!OSG_NOIMG_) { OSG_IMGUSED_ = true; throw new Error('export failed'); } return { file: 'ok.pdf' }; };
        try { r9 = makePdf(db, 'Quote', Q); OSG_makePdf0_ = function () { tries++; throw new Error('no folder'); }; e9 = err(function () { makePdf(db, 'Quote', Q); }); } finally { OSG_makePdf0_ = mk1; }
        eq('O320 a PDF that fails after an image went in is made again without images; other errors stay errors', [r9.file, tries, e9, OSG_NOIMG_, OSG_IMGUSED_].join('|'), 'ok.pdf|3|no folder|false|false');
        eq('O317 base64 decoder: round trip; bad shapes refused', [j(oB64Dec_(enc([0, 1, 2, 250, 255]))), j(oB64Dec_('abc')), j(oB64Dec_('ab=c')), j(oB64Dec_('ÿÿÿÿ')), j(oB64Dec_(null)), j(oB64Dec_(''))].join('|'), '[0,1,2,250,255]|null|null|null|null|[]');
      } finally { OSG_DRV_ = keepDrv; OSG_PICK_ = keepPick; }
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
    if (typeof SheetDb === 'function' && SheetDb.prototype.ow4c_) (function () { // W4c: one-read SheetDb against a fake spreadsheet
      var j = JSON.stringify;
      var mk = function () {
        var n = 0, D = { Items: [['ItemCode', 'Name', 'Rate', ''], ['A1', 'Tube', 5, ''], ['', '', '', ''], ['A2', 'Clamp', 0, 'x']], Log: [['At', 'What']], Empty: [['K', 'V']] };
        var rng = function (t, r, c, nr, nc) { return {
          getValues: function () { n++; var o = []; for (var i = 0; i < nr; i++) { var w = D[t][r - 1 + i] || [], x = []; for (var k = 0; k < nc; k++) x.push(w[c - 1 + k] === undefined ? '' : w[c - 1 + k]); o.push(x); } return o; },
          setValues: function (v) { n++; v.forEach(function (w, i) { var d = D[t][r - 1 + i] || (D[t][r - 1 + i] = []); w.forEach(function (x, k) { d[c - 1 + k] = x; }); }); },
          setValue: function (x) { n++; (D[t][r - 1] || (D[t][r - 1] = []))[c - 1] = x; } }; };
        var sh = function (t) { return { getLastRow: function () { n++; return D[t].length; }, getLastColumn: function () { n++; return D[t].reduce(function (m, w) { return Math.max(m, w.length); }, 0); },
          appendRow: function (w) { n++; D[t].push(w.slice()); }, getRange: function (r, c, nr, nc) { n++; return rng(t, r, c, nr || 1, nc || 1); }, getDataRange: function () { n++; return rng(t, 1, 1, D[t].length, D[t].reduce(function (m, w) { return Math.max(m, w.length); }, 0)); } }; };
        return { D: D, n: function () { return n; }, ss: { getSheetByName: function (t) { n++; return D[t] ? sh(t) : null; } } };
      };
      var run = function (on) {
        var k = OW4C_ON_; OW4C_ON_ = on;
        try {
          var F = mk(), db = new SheetDb(F.ss), out = [];
          out.push(j(db.rows('Items')), j(db.headers('Items')), db.hasTab('Items'), db.hasTab('Nope'), j(db.rows('Empty')));
          db.insert('Log', [{ At: 'a', What: 'one' }, { At: 'b', What: 'two' }]);
          var r2 = new SheetDb(F.ss).rows('Log'); out.push(j(r2), j(F.D.Log));
          var d3 = new SheetDb(F.ss); d3.rows('Items'); d3.insert('Items', { ItemCode: 'A3', Name: '=x' }); out.push(j(d3.rows('Items')), j(F.D.Items));
          d3.update('Items', d3.rows('Items')[0], { Rate: 6 }); out.push(j(new SheetDb(F.ss).rows('Items')));
          var e = ''; try { new SheetDb(F.ss).rows('Nope'); } catch (x) { e = x.message; } out.push(e);
          return { o: out.join('\n'), n: F.n() };
        } finally { OW4C_ON_ = k; }
      };
      var A = run(false), B = run(true);
      eq('O338 W4c SheetDb: rows / headers / hasTab / insert / update read the same as before', B.o, A.o);
      eq('O339 W4c SheetDb: fewer sheet calls for the same work', B.n < A.n && B.n <= Math.ceil(A.n * 0.6), true);
      var F2 = mk(), d4 = new SheetDb(F2.ss), n0 = F2.n(); d4.rows('Items'); d4.headers('Items'); d4.rows('Items');
      eq('O340 W4c a tab is read once (sheet handle + one data read)', F2.n() - n0, 3);
      var F3 = mk(), d5 = new SheetDb(F3.ss), m0 = F3.n(); d5.insert('Log', { At: 'z', What: 'w' });
      eq('O341 W4c insert into Log does not read the tab (header row + one atomic append)', [F3.n() - m0, F3.D.Log.length, d5.c.Log == null].join('|'), '5|2|true');
      var F4 = mk(), d6 = new SheetDb(F4.ss); d6.headers('Items'); var h6 = d6.rows('Items');
      eq('O342 W4c headers alone = the header row (as before); rows after it one data read; _r = sheet row', [h6.length, h6[1]._r, h6[1].ItemCode, F4.n()].join('|'), '2|4|A2|6');
      var F5 = mk(), d7 = new SheetDb(F5.ss); d7.headers('Items');
      eq('O343 W4c headers() does not cache rows (appSweep reads rows only inside its lock)', d7.c.Items == null && j(d7.hc.Items) === j(['ItemCode', 'Name', 'Rate', '']), true);
      var F6 = mk(), d8 = new SheetDb(F6.ss); d8.insert('Items', { ItemCode: 'A9', Name: "'=y" });
      eq('O344 W4c insert into any tab but Log = the old insert (rows in memory as written, text mark kept)', [d8.c.Items && d8.c.Items.length, d8.c.Items && d8.c.Items.slice(-1)[0].Name].join('|'), "3|'=y");
      var F7 = mk(); F7.D.Blank = [['', '']]; var e7 = ''; try { new SheetDb(F7.ss).rows('Blank'); } catch (x) { e7 = 'threw'; }
      var k7 = OW4C_ON_; OW4C_ON_ = false; var e8 = ''; try { new SheetDb(F7.ss).rows('Blank'); } catch (x) { e8 = 'threw'; } finally { OW4C_ON_ = k7; }
      eq('O345 W4c a blank tab behaves as before', e7, e8);
      if (SheetDb.prototype.ow4d_) (function () { // W4d: one batch read = the same as the tab reads
        var d1 = new Date(2026, 10, 19), d2 = new Date(2026, 0, 5, 14, 30), ser = function (d) { return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()) / 864e5 + 25569; };
        var mk4 = function () {
          var F = mk(); F.D.Items = [['ItemCode', 'Name', 'Rate', 'Since', 'On', ''], ['A1', 'Tube', 5, d1, true, ''], ['', '', '', '', '', ''], ['A2', '=x', '0171', d2, false, 'y'], ['A3', "+88", 0, '-5 m', '@y', ''], ['', '', '', '', '', '']];
          F.D.Customers = [['CustID', 'Name'], ['C1', "O'Neil"]]; F.D.Quotes = [['QuoteNo', 'Total'], ['Q1', 10]]; F.D.Blank = [['', '']];
          F.f = 0; F.ss.getId = function () { return 'ID'; };
          F.fetch = function (id, tabs) {
            F.f++; if (F.fail) throw new Error('HTTP 500');
            var vr = function (fmt) { return tabs.map(function (t) {
              var v = (F.D[t] || []).map(function (r) { var o = r.map(function (c) { return c instanceof Date ? (fmt ? '19-Nov-2026' : ser(c)) : c; }); while (o.length && o[o.length - 1] === '') o.pop(); return o; });
              while (v.length && !v[v.length - 1].length) v.pop();
              var nm = F.badName === t ? 'Other' : "'" + t.replace(/'/g, "''") + "'";
              return v.length ? { range: nm + '!A1:Z9', values: v } : { range: nm + '!A1:Z9' };
            }); };
            var a = vr(false), b = vr(true); if (F.shape) b[0].values.pop();
            return { tz: F.tz || Session.getScriptTimeZone(), a: F.short ? a.slice(1) : a, b: b };
          };
          return F;
        };
        var T4 = ['Items', 'Customers', 'Quotes', 'Blank'], k4 = [OW4D_TABS_, OW4D_FETCH_, OW4D_ON_];
        var dump = function (db) { var o = []; ['Items', 'Customers', 'Quotes'].forEach(function (t) { o.push(j(db.rows(t)), j(db.headers(t))); }); o.push(db.hasTab('Quotes'), db.hasTab('Nope')); var e = ''; try { db.rows('Blank'); } catch (x) { e = 'threw'; } o.push(e); return o.join('\n'); };
        var use = function (F, on) { OW4D_FETCH_ = F.fetch; var db = new SheetDb(F.ss); if (on) oW4dOn_(db); return db; };
        try {
          OW4D_TABS_ = T4;
          var F0 = mk4(), n0 = F0.n(), A0 = dump(use(F0, false)), F1 = mk4(), n1 = F1.n(), B1 = dump(use(F1, true));
          eq('O347 W4d batch read = tab reads (dates, times, text 0171 / =x / +88 / -5 m / @y / O\'Neil, true / false, trailing and blank cells, _r, blank tab throws)', B1, A0);
          eq('O348 W4d one batch for all the tabs, no sheet reads (only the blank tab and the missing tab ask the sheet)', [F0.f, F1.f, (F1.n() - n1) * 2 < F0.n() - n0].join('|'), '0|1|true');
          var F2 = mk4(), db2 = use(F2, true); db2.rows('Items'); db2.update('Items', db2.rows('Items')[0], { Rate: 7 }); F2.D.Customers.push(['C2', 'New']);
          eq('O349 W4d a write ends batching for that SheetDb: its next first read is a tab read (sees the sheet now)', [db2.rows('Customers').length, F2.f, db2.w4d_].join('|'), '2|1|false');
          var F3 = mk4(), a3 = use(F3, true), b3 = use(F3, true); a3.rows('Items'); b3.insert('Customers', { CustID: 'C3', Name: 'Third' });
          eq('O350 W4d a write by another SheetDb drops this batch: the next first read batches again', [a3.rows('Customers').length, F3.f, a3.w4d_].join('|'), '2|2|true');
          var F4 = mk4(), a4 = use(F4, true); a4.rows('Items'); OLK_.s++; OLK_.g++; try { F4.D.Quotes.push(['Q2', 5]); var q4 = a4.rows('Quotes').length; } finally { OLK_.s--; OLK_.g++; }
          var F4b = mk4(), a4b = use(F4b, true), g4 = OLK_.g; OLK_.g++; a4b.rows('Items'); OLK_.g++; OLK_.g++; F4b.D.Quotes.push(['Q3', 5]); var q4b = a4b.rows('Quotes').length; OLK_.g = g4;
          eq('O351 W4d a lock taken after the batch: read again inside the lock; also a new lock at the same depth', [q4, F4.f, q4b, F4b.f].join('|'), '2|2|2|2');
          var fb = function (set) { var F = mk4(); set(F); var db = use(F, true), r = dump(db); return [r === A0, db.w4d_].join(); };
          eq('O352 W4d fall back to the tab reads (same results): HTTP error / other tab name / fewer ranges / other shape / sheet time zone not the script\'s',
            [fb(function (F) { F.fail = 1; }), fb(function (F) { F.badName = 'Quotes'; }), fb(function (F) { F.short = 1; }), fb(function (F) { F.shape = 1; }), fb(function (F) { F.tz = 'UTC+9'; })].join(' '), 'true,false true,false true,false true,false true,false');
          var F6 = mk4(), a6 = use(F6, true), c6 = 0; a6.rows('Items');
          for (var i6 = 0; i6 < 5; i6++) { use(F6, false).sheet('Quotes'); a6.c.Customers = null; a6.rows('Customers'); c6++; }
          eq('O353 W4d at most ' + OW4D_MAX_ + ' batches per SheetDb, then tab reads', [F6.f, c6].join('|'), OW4D_MAX_ + '|5');
          var F7 = mk4(); OW4D_ON_ = false; var a7 = use(F7, true); a7.rows('Items'); OW4D_ON_ = true;
          var F8 = mk4(), a8 = oW4dOn_(use(F8, false)); a8.rows('Staff' in F8.D ? 'Staff' : 'Log');
          eq('O354 W4d off = tab reads; a tab not on the list = tab read (no batch); MemDb not marked', [F7.f, F8.f, !!oW4dOn_({ rows: 1 }).w4d_].join('|'), '0|0|false');
          var dd = [new Date(2026, 10, 19), new Date(1999, 11, 31, 23, 59, 58), new Date(2030, 1, 28, 7, 5)];
          eq('O355 W4d serial -> Date = the cell date; tab names from ranges', dd.every(function (d) { return oW4dDate_(ser(d)).getTime() === d.getTime(); }) + '|' + [oW4dTab_("'O''Neil s'!A1:B2"), oW4dTab_('Quotes!A1:AF5'), oW4dTab_('x')].join(','), "true|O'Neil s,Quotes,");
          eq('O356 W4d pending writes are flushed before each batch (review H1)', /^function oW4dRead_[^{]*\{[^\n]*\n\s*SpreadsheetApp\.flush\(\);[^\n]*\n\s*var R = \(OW4D_FETCH_ \|\| oW4dHttp_\)/.test(String(oW4dRead_.officeRaw_ || oW4dRead_)), true);
          // W4e: Lists from the rows
          OW4D_TABS_ = T4.concat(['Lists']); var kLW = OW4E_LW_; OW4E_LW_ = 0;
          var mkL = function () { var F = mk4(); F.D.Lists = [['Unit', 'PayMethod', 'Unit', 'Other', ''], ['pc', 'Bank transfer', 'kg', 'x', ''], ['', 'Cash', '', '', ''], ['m', '', d1, 'y', ''], ['', 'Cheque', 7, '', '']]; return F; };
          var FL0 = mkL(), L0 = j(OW4E_old_(new SheetDb(FL0.ss))), FL = mkL(), dL = use(FL, true); dL.rows('Items'); var nL = FL.n(), L1 = j(uiLists_(dL));
          eq('O357 W4e uiLists_ on an office SheetDb = the old read (repeated header: last wins, blanks out, dates / numbers as text, no cash), from the batch: no sheet read, batch kept',
            [L1 === L0, FL.n() - nL, FL.f, dL.w4d_, L0.indexOf('Cash') < 0 && L0.indexOf('"7"') > 0].join('|'), 'true|0|1|true|true');
          dL.insert('Customers', { CustID: 'C9', Name: 'Nine' }); var nL2 = FL.n(), L2 = j(uiLists_(dL));
          eq('O358 W4e after a write to another tab: Lists from the rows already read (no sheet read)', [L2 === L0, FL.n() - nL2].join('|'), 'true|0');
          var FL3 = mkL(), d3L = use(FL3, true); uiLists_(d3L); d3L.sheet('Lists'); FL3.D.Lists.push(['', '', 't', '', '']); d3L.c.Lists = null;
          var L3 = uiLists_(d3L);
          eq('O359 W4e a Lists sheet handle taken outside a read (maybe a write) = the old read from then on (sees the sheet now)', [!!d3L.ow4eLw_, j(L3) === j(OW4E_old_(new SheetDb(FL3.ss))), L3.Unit.slice(-1)[0]].join('|'), 'true|true|t');
          var FL4 = mkL(), d4L = use(FL4, false), n4L = FL4.n(), L4 = j(uiLists_(d4L)), FL5 = mkL(), d5L = use(FL5, true); OW4D_ON_ = false; var L5 = j(uiLists_(d5L)); OW4D_ON_ = true;
          var mL = new MemDb(); mL.ensureTab('Lists', ['Unit']); mL.insert('Lists', [{ Unit: 'zz' }]);
          eq('O360 W4e not an office SheetDb / W4d off / MemDb = the old read', [L4 === L0, FL4.n() > n4L, L5 === L0, FL5.f, uiLists_(mL).Unit.join(',')].join('|'), 'true|true|true|0|' + OW4E_old_(mL).Unit.join(','));
          var FB = mk4(); FB.D.Lists = [['']]; var dB = use(FB, true), rB = '', oB = '';
          try { rB = j(uiLists_(dB)); } catch (x) { rB = 'threw ' + x.message; } try { oB = j(OW4E_old_(new SheetDb(FB.ss))); } catch (x) { oB = 'threw ' + x.message; }
          var FT = mkL(), dT = use(FT, true), sv = SheetDb.prototype.rows, rT = '';
          SheetDb.prototype.rows = function (t) { if (t === 'Lists') throw new Error('Number of columns must be at least 1'); return sv.call(this, t); };
          try { rT = j(uiLists_(dT)); } catch (x) { rT = 'threw'; } finally { SheetDb.prototype.rows = sv; }
          eq('O361 W4e a blank Lists tab / a failing read = the old read (defaults), never an error from the new path (review M1)', [rB === oB, rT === L0].join('|'), 'true|true');
          OW4E_LW_ = 0; var FX = mkL(), aX = use(FX, true), bX = new SheetDb(FX.ss); uiLists_(aX); bX.insert('Lists', { Unit: 'zz' }); var LX = uiLists_(aX).Unit.join(',');
          eq('O362 W4e Lists written through another SheetDb of this execution: the next uiLists_ reads the sheet (review L1)', [OW4E_LW_ > 0, LX === OW4E_old_(new SheetDb(FX.ss)).Unit.join(','), /zz/.test(LX)].join('|'), 'true|true|true');
          // W4f: one batch per lock
          var lk = function (f) { OW4F_S_ = null; OW4F_SC_ = null; OLK_.s++; OLK_.g++; try { return f(); } finally { OLK_.s--; OLK_.g++; OW4F_S_ = null; OW4F_SC_ = null; } };
          var rec = function (F) { var f0 = F.fetch; F.tabs = []; F.fetch = function (id, t) { F.tabs.push(t.join(',')); return f0(id, t); }; return F; };
          OW4D_TABS_ = T4;
          var F9 = rec(mk4()), r9 = lk(function () { use(F9, true).rows('Items'); return dump(use(F9, true)); });
          eq('O363 W4f inside one lock a new office SheetDb takes the lock\'s batch: no new fetch, same rows as the tab reads', [r9 === A0, F9.f].join('|'), 'true|1');
          var F10 = rec(mk4()), r10 = lk(function () { use(F10, true).rows('Items'); use(F10, true).insert('Customers', { CustID: 'C3', Name: 'Third' }); var c = use(F10, true); return [c.rows('Customers').length, dump(c) === dump(use(F10, false))].join('|'); });
          eq('O364 W4f a write: the next office SheetDb fetches only the written tab again (sees the new row, same as the tab reads)', [r10, F10.f, F10.tabs[1]].join('|'), '2|true|2|Customers');
          var dp = oW4fDeps_(), dS = OW4F_S_; OW4F_S_ = { d: {} }; oW4fDirty_('QuoteLines'); var dq = Object.keys(OW4F_S_.d).sort().join(','); OW4F_S_ = dS;
          eq('O365 W4f a written tab also marks the tabs whose formulas read it (CALC, closure)', [dq, !!(dp.Settings && dp.Settings.Quotes), !!(dp.Quotes && dp.Quotes.Jobs)].join('|'), 'Invoices,Jobs,Milestones,QuoteLines,Quotes|true|true');
          var mS = OW4F_S_; OW4F_S_ = { d: {} }; oW4fDirty_('QuoteLines'); delete OW4F_S_.d.Quotes; delete OW4F_S_.d.Jobs; delete OW4F_S_.d.Invoices; delete OW4F_S_.d.Milestones; oW4fDirty_('QuoteLines'); var mq = Object.keys(OW4F_S_.d).sort().join(','); OW4F_S_ = mS;
          eq('O370 W4f a second write marks the dependents again after they were fetched (review M1)', mq, 'Invoices,Jobs,Milestones,QuoteLines,Quotes');
          var F11 = mk4(); use(F11, true).rows('Items'); use(F11, true).rows('Items');
          var F12 = mk4(); lk(function () { use(F12, true).rows('Items'); OLK_.g++; use(F12, true).rows('Items'); });
          var F13 = mk4(), F14 = mk4(); F14.ss.getId = function () { return 'ID2'; }; lk(function () { use(F13, true).rows('Items'); use(F14, true).rows('Items'); });
          eq('O366 W4f no shared batch outside a lock, after the lock changed, or for another spreadsheet', [F11.f, F12.f, F13.f, F14.f].join('|'), '2|2|1|1');
          var cr = function (a, b) { OW4D_FETCH_ = function () { return { tz: Session.getScriptTimeZone(), a: [{ range: 'Items!A1:B2', values: a }], b: [{ range: 'Items!A1:B2', values: b }] }; };
            var r = oW4dRead_({ ss: { getId: function () { return 'ID'; } } }, ['Items']); return r === null ? 'null' : (r.Items[1][1] instanceof Date ? 'date' : String(r.Items[1][1])); };
          var H = ['K', 'V'];
          eq('O367 W4f (CR) the 2 reads must agree: number + text only for a date / time text, same cells equal, else the old reads',
            [cr([H, ['A', 100]], [H, ['A', 'POA']]), cr([H, ['A', 100]], [H, ['A', 101]]), cr([H, ['A', 'x']], [H, ['A', 'y']]), cr([H, ['A', null]], [H, ['A', 'POA']]),
             cr([H, ['A', 46345]], [H, ['A', '19-Nov-2026']]), cr([H, ['A', 0.5]], [H, ['A', '12:00:00']]), cr([H, ['A', 5]], [H, ['A', 5]]), cr([H, ['A', true]], [H, ['A', true]])].join(','),
            'null,null,null,null,date,date,5,true');
          var sq = String(officeQuoteSave.officeRaw_ || officeQuoteSave);
          eq('O368 W4f the save\'s view is made inside the lock (not for Save + PDF); the old view read only when that gave none',
            [/if \(d\.pdf !== true\) try \{ var db4 = env\.db\(\); if \(db4\) out\.view = oQView_\(db4, env, oQRow_\(db4, ref\), L\); \} catch \(e\) \{ delete out\.view; \}[^\n]*\s*return out;\s*\}\);/.test(sq), /\n  if \(!res\.view\) try \{ var L3 = officeGate_/.test(sq)].join('|'), 'true|true');
          var F15 = mk4(), h15 = lk(function () { var a = use(F15, true); a.sheet('Quotes'); var n = F15.n(); use(F15, true).sheet('Quotes'); return F15.n() === n; });
          var F16 = mk4(); use(F16, true).sheet('Quotes'); var n16 = F16.n(); use(F16, true).sheet('Quotes');
          eq('O369 W4f the office SheetDbs of one lock share the sheet handles (not outside a lock)', [h15, F16.n() > n16].join('|'), 'true|true');
          OW4E_LW_ = kLW;
        } finally { OW4D_TABS_ = k4[0]; OW4D_FETCH_ = k4[1]; OW4D_ON_ = k4[2]; }
      })();
    })();
  } catch (e) { fail++; log.push('FAIL OF crashed: ' + e.message); }
  finally { OFFICE_ENV_ = keep; OFFICE_CFG_.kdfIters = keepIt; OFFICE_CFG_.maxPerMin = keepPm; }
  log.unshift('OF ' + pass + ' passed, ' + fail + ' failed');
  return { pass: pass, fail: fail, log: log };
}

// LAST statement of the LAST file: guard every public function of the project (see header).
oGuardAll_(OFFICE_G_);
