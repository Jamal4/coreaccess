// W4g: everything the dry run (oW4gSame_) touches outside its shadow, over the whole self-test. node w4g_fx.js <dir>
process.env.GSDIR = process.argv[2];
const { ctx } = require('./run.js'), vm = require('vm');
const hits = {}, rec = k => { if (ctx.__dry) hits[k] = (hits[k] || 0) + 1; };
const deep = (o, name, d) => new Proxy(o, { get(t, p) { const v = t[p]; if (typeof p === 'symbol') return v;
  if (typeof v === 'function') return function (...a) { rec(name + '.' + String(p)); const r = v.apply(t, a); return r && typeof r === 'object' && d < 3 ? deep(r, name + '.' + String(p) + '()', d + 1) : r; };
  return v; } });
['PropertiesService', 'CacheService', 'LockService', 'ScriptApp', 'SpreadsheetApp', 'DriveApp', 'GmailApp', 'MailApp', 'UrlFetchApp', 'DocumentApp', 'HtmlService', 'Session', 'Utilities']
  .forEach(n => { if (ctx[n]) ctx[n] = deep(ctx[n], n, 0); });
vm.runInContext(`
  var OW4G_FX_ = oW4gSame_; oW4gSame_ = function () { __dry = true; __n++; try { return OW4G_FX_.apply(this, arguments); } finally { __dry = false; } };
  ['oEnv_', 'log_', 'nextId', 'nextIds'].forEach(function (f) { var g = this[f]; if (typeof g !== 'function') return; var w = function () { __rec_(f); return g.apply(this, arguments); }; Object.keys(g).forEach(function (k) { w[k] = g[k]; }); if (g.officeRaw_) w.officeRaw_ = g.officeRaw_; this[f] = w; }, this);
  ['SheetDb', 'MemDb'].forEach(function (c) { var P = this[c] && this[c].prototype; if (!P) return; ['update', 'insert', 'ensureColumn', 'ensureTab', 'fillFormulas', 'sheet'].forEach(function (m) { var g = P[m]; if (typeof g !== 'function') return;
    P[m] = function () { if (!(this instanceof OW4gShadow_)) __rec_(c + '.' + m + ' on the REAL db'); return g.apply(this, arguments); }; }); }, this);
`, Object.assign(ctx, { __dry: false, __n: 0, __rec_: rec }));
const r = vm.runInContext('selfTestSummary_()', ctx);
console.log(String(r).split("\n").filter(x=>/FAIL|passed/.test(x)).join("\n").slice(0,900));
console.log('dry runs:', ctx.__n, '| touched outside the shadow:', JSON.stringify(hits));
