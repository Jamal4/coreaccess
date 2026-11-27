        // ---- M8 CodeRabbit run 3 (harness only): CH-60 ... CH-61
        (function () { var LAST = '', EQ = function (n) { LAST = n; return eq.apply(this, arguments); }; try {
          var SD = SheetDb, U0 = uiDo, uR0 = uiRun_, q5 = QF5_STUB_, qd0 = QF5_DRIVE_, mk0 = OPE_makePdf0_, DA0 = typeof DriveApp === 'undefined' ? undefined : DriveApp;
          if (!db.hasTab('AppQuotes')) db.ensureTab('AppQuotes', QA_H_, []);
          ['AppPdf', 'AppPdfBy'].forEach(function (c) { db.ensureColumn('Quotes', c); });
          var qn = String(db.rows('Quotes')[0].QuoteNo), qq = find(db.rows('Quotes'), 'QuoteNo', qn), pdf0 = qq.PDF, n = 0;
          var AQ = function (id, msg, no) { var r = find(db.rows('AppQuotes'), 'AQID', id), v = { Status: 'Posted', QuoteNo: no || qn, AppMsg: msg }; if (!r) { v.AQID = id; db.insert('AppQuotes', v); r = find(db.rows('AppQuotes'), 'AQID', id); } else db.update('AppQuotes', r, v); return r; };
          var M = function (id) { var r = find(db.rows('AppQuotes'), 'AQID', id); return r.Status + '~' + r.AppMsg; };
          var ID = function () { return 'CHE3CX' + (++n) + 'abcdefghijklmnopqrs'; }, UR = function (id) { return 'https://drive.google.com/file/d/' + id + '/view'; };
          try {
            SheetDb = function () { return db; };
            // CH-60 (#1): the sweep's queued quote PDF finishes the app quote's message
            var res = [], set = function () { db.update('Quotes', qq, { AppPdf: 'Requested' }); AQ('AQ-E3C1', 'Posted ' + qn + ' · total Tk 1 · PDF being made'); AQ('AQ-E3C2', 'Posted ' + qn + ' · PDF made'); AQ('AQ-E3C3', 'Posted OTHER · PDF being made', 'CAE/Q/2026/OTHER'); };
            set(); uiDo = function () { return { msg: 'ok', links: [{ url: 'u' }] }; }; qaLater_([{ k: 'q', no: qn, by: 'x' }], Date.now() + 60000);
            res.push(M('AQ-E3C1'), M('AQ-E3C2'), /^Made /.test(String(qq.AppPdf)));
            set(); uiDo = function () { throw new Error('render $& failed'); }; qaLater_([{ k: 'q', no: qn, by: 'x' }], Date.now() + 60000);
            res.push(M('AQ-E3C1'), M('AQ-E3C2'), String(qq.AppPdf), M('AQ-E3C3'));
            set(); var called = 0; uiDo = function () { called++; return { msg: 'ok', links: [{ url: 'u' }] }; }; qaLater_([{ k: 'q', no: qn, by: 'x' }], Date.now() - 1);
            res.push(M('AQ-E3C1'), String(qq.AppPdf), called);
            EQ('CH-60 app quote posted by the sweep: its "PDF being made" becomes "PDF made" / "PDF not made: <error> (use Make PDF)" (Status Posted, other rows untouched); out of time: left as queued (Requested)',
              res.join('|'), ['Posted~Posted ' + qn + ' · total Tk 1 · PDF made', 'Posted~Posted ' + qn + ' · PDF made', 'true',
                'Posted~Posted ' + qn + ' · total Tk 1 · PDF not made: render $& failed (use Make PDF)', 'Posted~Posted ' + qn + ' · PDF made', 'Error: render $& failed', 'Posted~Posted OTHER · PDF being made',
                'Posted~Posted ' + qn + ' · total Tk 1 · PDF being made', 'Requested', '0'].join('|'));
            // CH-62 (step R): the AppQuotes write fails (before / after it goes in): the quote stays Requested, so the next sweep finishes both
            res = []; uiDo = function () { return { msg: 'ok', links: [{ url: 'u' }] }; };
            ['before', 'after'].forEach(function (m) { var u0 = db.update; set();
              db.update = function (t) { if (t === 'AppQuotes') { if (m === 'after') u0.apply(this, arguments); throw new Error('sheet down'); } return u0.apply(this, arguments); };
              try { qaLater_([{ k: 'q', no: qn, by: 'x' }], Date.now() + 60000); } finally { db.update = u0; }
              res.push(m, String(qq.AppPdf) === 'Requested', / · PDF being made$/.test(M('AQ-E3C1')));
              if (String(qq.AppPdf) === 'Requested') qaLater_([{ k: 'q', no: qn, by: 'x' }], Date.now() + 60000);
              res.push(/^Made /.test(String(qq.AppPdf)), / · total Tk 1 · PDF made$/.test(M('AQ-E3C1'))); });
            EQ('CH-62 the app message write fails before / after it goes in: the quote stays Requested (never Made with the message stuck on "being made"); the next sweep -> Made, "PDF made"',
              res.join('|'), 'before|true|true|true|true|after|true|false|true|true');
            // CH-61 (#2): the real panel quote PDF run (uiDo -> OPE wrapper -> makePdf): an office edit mid-render -> no links, the sweep writes Error, never Made
            uiDo = U0; res = []; var mid = null, TR = {};
            uiRun_ = function (fn) { return uiClean_(withLock(function () { return fn(db); })); };
            QF5_STUB_ = {}; QF5_DRIVE_ = { name: function () { return ''; }, trash: function () {} };
            DriveApp = { getFileById: function (id) { return { setTrashed: function (v) { TR[id] = v; }, isTrashed: function () { return !!TR[id]; }, getDateCreated: function () { return new Date(1e12); } }; } };
            OPE_makePdf0_ = function (d, what, no, o) { if (mid) { var f = mid; mid = null; f(); } var a = ID(), r = { url: UR(a), doc: 'https://docs.google.com/document/d/' + a + 'D/edit', file: no + '.pdf', placeholders: 0 };
              if (!(o && o.noLink)) d.update('Quotes', find(d.rows('Quotes'), 'QuoteNo', no), { PDF: r.url }); return r; };
            db.update('Quotes', qq, { PDF: '' });
            var p1 = uiDo('quotePdf', { quoteNo: qn }); res.push(!!p1.warn, p1.links.length, String(qq.PDF) === String(p1.links[0] && p1.links[0].url));
            db.update('Quotes', qq, { PDF: '' }); mid = function () { oPeBump_(oEnv_(), [qn]); };
            var p2 = uiDo('quotePdf', { quoteNo: qn }); res.push(!!p2.warn, p2.links.length, String(qq.PDF), /changed in the office app/.test(p2.msg));
            set(); db.update('Quotes', qq, { PDF: '' }); mid = function () { oPeBump_(oEnv_(), [qn]); };
            qaLater_([{ k: 'q', no: qn, by: 'x' }], Date.now() + 60000);
            res.push(/^Error: .*changed in the office app/.test(String(qq.AppPdf)), /· PDF not made: .*changed in the office app.*\(use Make PDF\)$/.test(M('AQ-E3C1')), String(qq.PDF));
            set(); db.update('Quotes', qq, { PDF: '' }); mid = null; qaLater_([{ k: 'q', no: qn, by: 'x' }], Date.now() + 60000);
            res.push(/^Made /.test(String(qq.AppPdf)), / · PDF made$/.test(M('AQ-E3C1')), !!String(qq.PDF));
            EQ('CH-61 real panel quote PDF run: unchanged -> linked, links; changed in the office app mid-render -> warn, no links, no link written; the sweep then writes Error (not Made) and the app message says so; unchanged again -> Made',
              res.join('|'), 'false|2|true|true|0||true|true|true||true|true|true');
          } finally { SheetDb = SD; uiDo = U0; uiRun_ = uR0; QF5_STUB_ = q5; QF5_DRIVE_ = qd0; OPE_makePdf0_ = mk0; OPE_RUN_ = null; if (DA0 === undefined) DriveApp = {}; else DriveApp = DA0; db.update('Quotes', qq, { PDF: pdf0 == null ? '' : pdf0 }); }
        } catch (e) { eq('CH-E3C crashed after ' + LAST.slice(0, 6), String(e && e.stack || e).slice(0, 400), 'no crash'); } })();
