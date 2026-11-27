        // ---- QP quote picture (harness only): CH-74 ... CH-77
        (function () { var LAST = '', EQ = function (n) { LAST = n; return eq.apply(this, arguments); }, hasQP = typeof OQPIC_ADD_ !== 'undefined', kd = OSG_DRV_, ka = hasQP ? OQPIC_ADD_ : null; try {
          var rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); e5.cdel('OSG_N:' + e); }); };
          var be = function (n) { return [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255]; };
          var png = function (w, h) { var d = [120, 1]; return [137, 80, 78, 71, 13, 10, 26, 10].concat(be(13), [73, 72, 68, 82], be(w), be(h), [8, 6, 0, 0, 0], [1, 2, 3, 4], be(d.length), [73, 68, 65, 84], d, [5, 6, 7, 8], be(0), [73, 69, 78, 68], [174, 66, 96, 130]); };
          var files = {}, nf = 0, B64 = function (b) { return Utilities.base64Encode(b); };
          OSG_DRV_ = { file: function (id) { return files[id] || null; }, info: function (id) { var f = files[id]; return f ? { size: f.b.length, mime: f.m, name: f.n } : null; }, blob: function (id) { return files[id] ? { id: id, w: 400, h: 300 } : null; },
            b64: function (id) { var f = files[id]; return f ? B64(f.b) : null; }, add: function () { throw new Error('not here'); }, bin: function () { return true; }, decodes: function () { return true; } };
          if (hasQP) OQPIC_ADD_ = function (d, name, mime, bytes) { var id = 'QPIC' + ('00000' + (++nf)).slice(-5) + 'x'; files[id] = { b: bytes, m: mime, n: name }; return id; };
          files.FOREIGNdoc1 = { b: [1, 2, 3], m: 'application/pdf', n: 'x.pdf' }; files.FOREIGNpng1 = { b: png(10, 10), m: 'image/png', n: 'y.png' };
          db.ensureColumn('Quotes', 'PicID');
          var SV = function (o) { rc(); return officeQuoteSave(tS, o); }, PUT = function (b) { rc(); return officeQuotePicPut(tS, B64(b)); };
          var BQ = function (s, o) { return Object.assign(base({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] }), o || {}); };
          var E = function (f) { return String(err(f)).split('|').slice(0, 2).join('|'); };
          // CH-74: upload, Save with it = PicID; the form and the PDF show it; a file not uploaded here / not a picture refused; no pic = kept; blank = removed
          (function () { if (!hasQP) { EQ('CH-74 quote picture', 'no QP', 'QP'); return; } var res = [], s = SV(BQ('QP pic')), up = PUT(png(400, 300)); res.push(typeof up.id);
            var s2 = SV(BQ('QP pic', { no: s.no, ev: s.ev, pic: up.id })); res.push(String(oQRow_(db, s.no).PicID) === up.id, s2.changed === true);
            var f = officeQuoteForm(tS, s.no); res.push(f.picOk === true, !!(f.quote.pic && f.quote.pic.id === up.id && /^data:image\/png;base64,/.test(f.quote.pic.img)));
            var pb = PDF_SPECS.Quote(db, s.no).blocks.filter(function (b) { return b.t === 'pic'; })[0]; res.push(!!pb && pb.f === up.id);
            res.push(E(function () { SV(BQ('QP pic', { no: s.no, ev: s2.ev, pic: 'FOREIGNpng1' })); }), E(function () { SV(BQ('QP pic', { no: s.no, ev: s2.ev, pic: 'FOREIGNdoc1' })); }));
            var s3 = SV(BQ('QP pic', { no: s.no, ev: s2.ev })); res.push(String(oQRow_(db, s.no).PicID) === up.id);
            SV(BQ('QP pic', { no: s.no, ev: s3.ev, pic: '' })); res.push(blank(oQRow_(db, s.no).PicID), PDF_SPECS.Quote(db, s.no).blocks.some(function (b) { return b.t === 'pic'; }));
            EQ('CH-74 quote picture: upload, Save sets it, form + PDF show it; not uploaded here / not a picture refused; no pic kept; blank removes',
              res.join('|'), 'string|true|true|true|true|true|BADINPUT|picture|BADINPUT|picture|true|true|false'); })();
          // CH-75: a picture-only change on a Sent quote = next Rev (Draft), new PDF version
          (function () { if (!hasQP) { EQ('CH-75 quote picture', 'no QP', 'QP'); return; } var s = SV(BQ('QP sent')); db.update('Quotes', oQRow_(db, s.no), { Status: 'Sent' }); var v0 = oQPdfVer_(db, s.no).v, up = PUT(png(200, 200));
            var s2 = SV(BQ('QP sent', { no: s.no, ev: oQeEv_(db, oQRow_(db, s.no)), pic: up.id })), q2 = oQRow_(db, s.no);
            EQ('CH-75 picture-only change: a Sent quote becomes the next Rev (Draft); its PDF version changes', [num(q2.Rev), q2.Status, s2.changed, oQPdfVer_(db, s.no).v !== v0].join('|'), '1|Draft|true|true'); })();
          // CH-76 (CR run 5 #1): the Queued marker write fails -> no job queued, the request stays Requested
          (function () { var qq = db.rows('Quotes')[1] || db.rows('Quotes')[0], a0 = appRoleCheck_, u0 = db.update, own = Object.prototype.hasOwnProperty.call(db, 'update'), L = [], res = [];
            appRoleCheck_ = function () {};
            try { db.update('Quotes', qq, { AppPdf: 'Requested', AppPdfBy: 'x@t.com' });
              db.update = function (t, o, p) { if (t === 'Quotes' && p && /^Queued /.test(String(p.AppPdf))) throw new Error('write failed'); return u0.apply(this, arguments); };
              var r = qaPdf_(db, qq, { later: L }); res.push(L.length, String(qq.AppPdf), r.posted);
            } finally { if (own) db.update = u0; else delete db.update; appRoleCheck_ = a0; db.update('Quotes', qq, { AppPdf: '' }); }
            EQ('CH-76 sweep quote PDF: the Queued marker write fails -> nothing queued, still Requested for the next run', res.join('|'), '0|Requested|false'); })();
          // CH-77 (CR run 5 #2): cancelling the final set Return of a full off-hire job (CH-72's) puts the job back On hire
          (function () { var JS = 'CAE/J/2026/E3DS', rt = db.rows('Challans').filter(function (c) { return c.JobNo === JS && c.Kind === 'Return' && c.Status === 'Posted'; })[0], res = [];
            res.push(String(must(db, 'Jobs', 'JobNo', JS).Status)); if (rt) cancelChallan(db, rt.ChallanNo);
            res.push(rt ? String(rt.Status) : 'none', String(must(db, 'Jobs', 'JobNo', JS).Status));
            EQ('CH-77 cancel the final Return of an Off-hire job: equipment back on hire -> job On hire', res.join('|'), 'Off-hire|Cancelled|On hire'); })();
        } catch (e) { eq('CH-E3E crashed after ' + LAST.slice(0, 6), String(e && e.stack || e).slice(0, 400), 'no crash'); }
        finally { OSG_DRV_ = kd; if (hasQP) OQPIC_ADD_ = ka; } })();
