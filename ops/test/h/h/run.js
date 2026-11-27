// harness: all 15 .gs in one vm with Apps Script stubs; usage: node run.js <dir> [expr]
const vm = require('vm'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const dir = process.env.GSDIR || process.argv[2], expr = process.argv[3] || 'selfTestSummary_()';
const ORDER = ['Code.gs', 'CAE_Ops_PDF.gs', 'CAE_Ops_UI.gs', 'CAE_Ops_Reports.gs', 'CAE_Ops_App.gs', 'CAE_Ops_Sets.gs', 'CAE_Ops_Order.gs', 'CAE_Ops_QuoteReq.gs',
  'CAE_Ops_Site.gs', 'CAE_Ops_Roles.gs', 'CAE_Ops_Terms.gs', 'CAE_Ops_QuoteForm.gs', 'CAE_Ops_QuoteForm2.gs', 'CAE_Ops_QuoteApp.gs', 'CAE_Ops_Office.gs'];
const props = {}, cache = {};
const toBytes = s => Array.from(Buffer.from(String(s), 'utf8')).map(x => x << 24 >> 24);
const ub = b => Buffer.from(b.map(x => x & 255));
const Utilities = {
  getUuid: () => crypto.randomUUID(),
  DigestAlgorithm: { SHA_256: 'sha256', MD5: 'md5' }, Charset: { UTF_8: 'utf8' },
  computeDigest: (alg, s) => Array.from(crypto.createHash(alg).update(typeof s === 'string' ? Buffer.from(s, 'utf8') : ub(s)).digest()).map(x => x << 24 >> 24),
  computeHmacSha256Signature: (v, k) => Array.from(crypto.createHmac('sha256', typeof k === 'string' ? Buffer.from(k) : ub(k)).update(typeof v === 'string' ? Buffer.from(v) : ub(v)).digest()).map(x => x << 24 >> 24),
  base64Encode: b => (typeof b === 'string' ? Buffer.from(b) : ub(b)).toString('base64'),
  base64EncodeWebSafe: b => (typeof b === 'string' ? Buffer.from(b) : ub(b)).toString('base64url'),
  newBlob: s => ({ getBytes: () => toBytes(s), getDataAsString: () => String(s) }),
  formatDate: (d, tz, f) => { const p = n => String(n).padStart(2, '0'); return f === 'yyyy-MM-dd' ? d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) : d.toISOString(); },
  sleep: () => {},
};
const lock = { tryLock: () => true, waitLock: () => {}, releaseLock: () => {}, hasLock: () => true };
const ctx = {
  console, Utilities,
  Logger: { log: (...a) => { ctx.__log.push(a.join(' ')); } }, __log: [],
  Session: { getScriptTimeZone: () => 'Asia/Dhaka', getActiveUser: () => ({ getEmail: () => ctx.__active }), getEffectiveUser: () => ({ getEmail: () => 'info.coreaccess@gmail.com' }) },
  __active: 'info.coreaccess@gmail.com',
  PropertiesService: { getScriptProperties: () => ({
    getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; },
    getProperties: () => Object.assign({}, props), getKeys: () => Object.keys(props), setProperties: o => Object.assign(props, o) }) },
  CacheService: { getScriptCache: () => ({ get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; }, getAll: ks => { const o = {}; ks.forEach(k => { if (k in cache) o[k] = cache[k]; }); return o; }, putAll: o => Object.assign(cache, o), removeAll: ks => ks.forEach(k => delete cache[k]) }) },
  LockService: { getScriptLock: () => lock, getDocumentLock: () => lock },
  ScriptApp: { getProjectTriggers: () => [], getService: () => ({ getUrl: () => '' }), deleteTrigger: () => {}, newTrigger: () => ({ timeBased: () => ({ everyMinutes: () => ({ create: () => {} }) }) }) },
  SpreadsheetApp: { getUi: () => { throw new Error('no ui'); }, flush: () => {}, getActive: () => null, newDataValidation: () => ({}), CopyPasteType: {}, ProtectionType: {}, DataValidationCriteria: {} },
  HtmlService: { createHtmlOutput: () => ({ setTitle() { return this; }, addMetaTag() { return this; }, setXFrameOptionsMode() { return this; }, setWidth() { return this; }, setHeight() { return this; } }), XFrameOptionsMode: {} },
  DocumentApp: { HorizontalAlignment: {}, ElementType: { HEADER_SECTION: 'H', FOOTER_SECTION: 'F', BODY_SECTION: 'B', PARAGRAPH: 'P', TABLE: 'T' }, VerticalAlignment: {} },
  DriveApp: {}, GmailApp: {}, MailApp: {}, UrlFetchApp: {},
};
vm.createContext(ctx);
const src = {};
ORDER.forEach(f => { src[f] = fs.readFileSync(path.join(dir, f), 'utf8'); vm.runInContext(src[f], ctx, { filename: f }); });
ctx.__html = fs.existsSync(path.join(dir, 'Office.html')) ? fs.readFileSync(path.join(dir, 'Office.html'), 'utf8') : '';
ctx.HtmlService.createHtmlOutputFromFile = () => ({ getContent: () => ctx.__html, setTitle() { return this; }, addMetaTag() { return this; }, setXFrameOptionsMode() { return this; } });
// CR run 7: a deployed web app gets no document lock (LockService.getDocumentLock() is null there): during every web-API call
// (OFFICE_WEB_API_, doGet incl.) the lock service in use -- the stub or a test's fake, global or OLK_.ls -- returns null for it.
(function () {
  const api = Array.isArray(ctx.OFFICE_WEB_API_) ? ctx.OFFICE_WEB_API_ : []; let depth = 0;
  const nd = L => { if (!L) return L; const o = Object.create(L); o.getDocumentLock = () => null; return o; };
  api.forEach(n => {
    const f = ctx[n]; if (typeof f !== 'function') return;
    const w = function () {
      if (depth++) { try { return f.apply(this, arguments); } finally { depth--; } }
      const L0 = ctx.LockService, O = ctx.OLK_, ls0 = O ? O.ls : null; ctx.LockService = nd(L0); if (O && ls0) O.ls = nd(ls0);
      try { return f.apply(this, arguments); } finally { depth--; ctx.LockService = L0; if (O && ls0) O.ls = ls0; }
    };
    Object.keys(f).forEach(x => { w[x] = f[x]; }); w.toString = () => f.toString(); ctx[n] = w;
  });
  ctx.__webNullDoc = api.filter(n => typeof ctx[n] === 'function').length;
})();
module.exports = { ctx, props, cache };
if (require.main === module) {
  const t0 = Date.now(), r = vm.runInContext(expr, ctx);
  console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1).slice(0, 4000));
  console.log('time', Date.now() - t0, 'ms');
}
