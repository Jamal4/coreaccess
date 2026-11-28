        // ---- C5: a job's challans on its contract (harness only)
        (function () { try {
          var t = add('chc5@t.com', { SC: 1 }), J = 'CAE/J/2026/801';
          db.insert('Jobs', { JobNo: 'CAE/J/2026/803', CustID: 'CUST-0001', SiteID: 'SITE-0801', JobType: 'Rental', HireBasis: 'Item', Status: 'Awaiting order' });
          var g = officeContractGet(t, J), want = {}; db.rows('Challans').forEach(function (c) { if (c.JobNo === J && /^CAE\/DC\/20\d\d\/\d{3,6}$/.test(c.ChallanNo)) want[c.ChallanNo] = 1; });
          var nos = (g.ch || []).map(function (c) { return c.no; }), srt = nos.slice().sort().reverse();
          eq('CH-28 contract view lists exactly its job\'s challans, newest first, no prices; a job without any gets []', [Array.isArray(g.ch), nos.length > 2, nos.length === Object.keys(want).length, nos.join() === srt.join(),
            g.ch.every(function (c) { return c.job === J && want[c.no]; }), !/price|rate|amount|value|cost/i.test(JSON.stringify(g.ch)), JSON.stringify(officeContractGet(t, 'CAE/J/2026/803').ch)].join('|'), 'true|true|true|true|true|true|[]');
          var c0 = db.rows('Challans').filter(function (c) { return c.JobNo === J; })[0], keep = c0.Kind; db.update('Challans', c0, { Kind: 'Bogus' });
          eq('CH-29 a challan row with an unknown kind is left off the contract (as on the list)', officeContractGet(t, J).ch.some(function (c) { return c.no === c0.ChallanNo; }), false); db.update('Challans', c0, { Kind: keep });
          // ---- D1: challan PDF as the 31 Oct template
          var C = db.rows('Challans'), one = function (f) { return C.filter(f)[0]; }, T = function (sp) { return JSON.stringify(sp.blocks); }, SG = function (sp) { return sp.blocks.filter(function (b) { return b.t === 'sig'; })[0].cols.map(function (c) { return c.head; }).join('+'); };
          var dv = one(function (c) { return c.JobNo === J && c.Kind === 'Delivery' && c.Status === 'Posted' && c.FromLoc !== 'LOC-SUPPLIER'; }), rt = one(function (c) { return c.JobNo === J && c.Kind === 'Return' && c.Status === 'Posted'; });
          var sl = one(function (c) { return c.Kind === 'Sale'; }), hi = one(function (c) { return c.Kind === 'Hire-in'; }), tr = one(function (c) { return c.Kind === 'Transfer'; });
          var jb = find(db.rows('Jobs'), 'JobNo', J); db.update('Jobs', jb, { QuoteNo: 'CAE/Q/2026/077', ClientWONo: 'WO-55', OrderKind: 'PO' }); db.update('Sites', find(db.rows('Sites'), 'SiteID', 'SITE-0801'), { SiteRep: 'Karim', SiteRepPhone: '017' });
          var pd = specChallan(db, dv.ChallanNo), pg = pd.blocks.filter(function (b) { return b.t === 'grid'; })[0], pp = pd.blocks.filter(function (b) { return b.t === 'pairs'; })[0].rows;
          eq('CH-30 delivery PDF: ticks, site contact, quotation / PO, job no., size column, notes 1-4, 3 signatures, copy line', [/☒ Delivery to site.*☐ Return from site/.test(T(pd)) && !/"From"|"To"/.test(T(pd)), pp[2].join('~'), pp[3][0] + '=' + pp[3][1], pg.cols.map(function (c) { return c.h; }).join(','),
            pd.blocks.filter(function (b) { return /^[1-4]\. /.test(b.text); }).length, /never becomes the client/.test(T(pd)), SG(pd), /Copy 1: client  ·  Copy 2: Core Access store  ·  Copy 3: accounts/.test(T(pd)), /Steel Co/.test(T(pd))].join('|'),
            'true|Site contact~Karim, 017~Quotation / PO~CAE/Q/2026/077  /  PO WO-55|Job no.=' + J + '|No.,Item code,Description,Size / spec.,Unit,Qty,Condition / remarks|4|true|Issued by (Core Access)+Transporter / driver+Received by (client, with seal)|true|false');
          var pr = specChallan(db, rt.ChallanNo), rp = pr.blocks.filter(function (b) { return b.t === 'pairs'; })[0].rows, rel = rp[rp.length - 1], dls = C.filter(function (c) { return c.JobNo === J && c.Kind === 'Delivery' && c.Status === 'Posted'; }).length;
          eq('CH-31 return PDF: Return ticked, related delivery challans, Core Access receives (office signature says Received by), 3 notes, grid good/damaged/lost unchanged', [/☐ Delivery to site.*☒ Return from site/.test(T(pr)) && !/"From"|"To"/.test(T(pr)), rel[2], rel[3].indexOf(dv.ChallanNo) >= 0 || /more/.test(rel[3]), dls > 0, SG(pr),
            oSgApply_(db, 'Challan', specChallan(db, rt.ChallanNo)).blocks.filter(function (b) { return b.t === 'osign'; })[0].role, pr.blocks.filter(function (b) { return /^[1-4]\. /.test(b.text); }).length, /48 hours/.test(T(pr)),
            pr.blocks.filter(function (b) { return b.t === 'grid'; })[0].cols.map(function (c) { return c.h; }).slice(4, 8).join(',')].join('|'),
            'true|Related challan|true|true|Received by (Core Access)+Transporter / driver+Handed over by (client)|Received by|3|true|Qty,Good,Damaged,Lost');
          var ps = specChallan(db, sl.ChallanNo), ph = specChallan(db, hi.ChallanNo), pt = specChallan(db, tr.ChallanNo);
          eq('CH-32 sale: "(sale)", 3 sale notes; hire-in: Core Access signs first (Received by), supplier copy; transfer: no ticks, store copies; delivery still signed Issued by', [/☒ Delivery to site \(sale\)/.test(T(ps)), ps.blocks.filter(function (b) { return /^[1-4]\. /.test(b.text); }).length, /pass to the client on payment/.test(T(ps)) && !/never becomes/.test(T(ps)),
            SG(ph), oSgApply_(db, 'Challan', specChallan(db, hi.ChallanNo)).blocks.filter(function (b) { return b.t === 'osign'; })[0].role, /Copy 1: supplier/.test(T(ph)), /☐|☒/.test(T(pt)) || /☐|☒/.test(T(ph)), /Copy 1: issuing store  ·  Copy 2: receiving store/.test(T(pt)),
            oSgApply_(db, 'Challan', specChallan(db, dv.ChallanNo)).blocks.filter(function (b) { return b.t === 'osign'; })[0].role].join('|'),
            'true|3|true|Received by (Core Access)+Driver+Delivered by (supplier)|Received by|true|false|true|Issued by');
          db.update('Jobs', jb, { QuoteNo: '', ClientWONo: '', OrderKind: '' });
          eq('CH-33 no quote / WO: notes say "the agreed order", the Quotation / WO cell is a dash', [/under the agreed order/.test(T(specChallan(db, dv.ChallanNo))), specChallan(db, dv.ChallanNo).blocks.filter(function (b) { return b.t === 'pairs'; })[0].rows[2].slice(2).join('~')].join('|'), 'true|Quotation / WO~');
          // ---- D2: blank challan template linked in the register
          (function () { var td = add('chd2@t.com', oDir_()), env = oEnv_(); if (!db.hasTab(ODOC_REG_)) oDocSetup_(env, db); if (!db.hasTab('Settings')) db.ensureTab('Settings', ['Key', 'Value', 'Note']);
            var st = find(db.rows('Settings'), 'Key', 'ChallanTemplateID'); if (st) db.update('Settings', st, { Value: '' });
            var bl = function () { var m = {}; officeDocList(td).rows.forEach(function (r) { m[r.code] = r.blank; }); return m; }, b0 = bl();
            if (st) db.update('Settings', st, { Value: '1BZcoTmLx7KidBg88iK05JaP-WXRnrBmHLdVc2X_3Pwk' }); else db.insert('Settings', { Key: 'ChallanTemplateID', Value: '1BZcoTmLx7KidBg88iK05JaP-WXRnrBmHLdVc2X_3Pwk' });
            var b1 = bl(); db.update('Settings', find(db.rows('Settings'), 'Key', 'ChallanTemplateID'), { Value: 'javascript:alert(1)//' }); var b2 = bl();
            eq('CH-34 register: PS-F01 / F02 / YW-F01 link the blank challan template once Settings has its id; other forms none; a bad id links nothing',
              [b0['CAE-PS-F01'], b1['CAE-PS-F01'], b1['CAE-PS-F02'] === b1['CAE-PS-F01'], b1['CAE-YW-F01'] === b1['CAE-PS-F01'], b1['CAE-SC-F01'], b2['CAE-PS-F01']].join('|'),
              '|https://docs.google.com/document/d/1BZcoTmLx7KidBg88iK05JaP-WXRnrBmHLdVc2X_3Pwk/edit|true|true||'); })();
          // ---- sign: whoever made the challan signs it; stamp right beside the signature
          (function () { var em = 'chsig@t.com'; if (!find(db.rows('Staff'), 'StaffID', 'STF-002')) db.insert('Staff', { StaffID: 'STF-002', Name: 'Sig Maker' }); oSaveLogin_(e5, { email: em, name: 'Sig Maker', depts: { PS: 2 }, password: 'GoodPass1' }); var LL = e5.get('OL:' + em); LL.staff = 'STF-002'; e5.put('OL:' + em, LL); var ts = officeLogin(em, 'GoodPass1', false).token;
            try { e5.cdel('OQEW:' + em); } catch (x) {}
            var r = officeChallanSave(ts, { kind: 'Delivery', job: 'CAE/J/2026/801', from: 'CH-YARD', date: officeChallanList(ts).today, lines: [{ it: 'CH-STD', q: 1 }] }), row = find(db.rows('Challans'), 'ChallanNo', r.no);
            var og = function (no) { return PDF_SPECS.Challan(db, no).blocks.filter(function (b) { return b.t === 'osign'; })[0] || {}; }, o1 = og(r.no);
            db.update('Challans', row, { MadeBy: 'Jamal Uddin', MadeByID: '' }); var o2 = og(r.no); db.update('Challans', row, { MadeBy: 'nobody here', MadeByID: '' }); var o3 = og(r.no);
            db.update('Challans', row, { MadeBy: 'Sig Maker', MadeByID: 'STF-002' }); row = find(db.rows('Challans'), 'ChallanNo', r.no);
            var W = [], P = function () { var q = { setSpacingBefore: function () { return q; }, setSpacingAfter: function () { return q; }, setLineSpacing: function () { return q; }, setAlignment: function () { return q; }, setIndentStart: function () { return q; }, setIndentFirstLine: function () { return q; },
              editAsText: function () { var t = {}; ['setFontFamily', 'setFontSize', 'setForegroundColor', 'setBold', 'setItalic'].forEach(function (m) { t[m] = function () { return t; }; }); return t; } }; return q; };
            var mk = function () { var c = { getChild: function () { return { asParagraph: function () { return P(); } }; }, appendParagraph: function () { return P(); } }; ['setPaddingTop', 'setPaddingBottom', 'setPaddingLeft', 'setPaddingRight', 'setVerticalAlignment'].forEach(function (m) { c[m] = function () { return c; }; }); return c; };
            var body = { appendParagraph: function () { return P(); }, appendTable: function () { var t = { setBorderWidth: function () { return t; }, setColumnWidth: function (i, w) { W.push(i + ':' + w); return t; }, getCell: function (r0, i) { return mk(); } }; return t; } };
            var ni = OSG_NOIMG_; OSG_NOIMG_ = true; try { BLOCKS_.osign(body, o1); } finally { OSG_NOIMG_ = ni; }
            eq('CH-35 the maker signs: new challan stores MadeByID; its PDF signer = that staff (Issued by); an old one by Staff name; an unknown maker = name only, no image; stamp column right beside the sign (160 + 80 pt, left half)',
              [row.MadeBy, row.MadeByID, (o1.s || {}).id, o1.role, (o2.s || {}).name, (o3.s || {}).id === '' && (o3.s || {}).sig === '', W.join(',')].join('|'), 'Sig Maker|STF-002|STF-002|Issued by|Jamal Uddin|true|0:160,1:80'); })();
        } catch (e) { eq('CH-C5 crashed', String(e && e.message || e), 'no crash'); } })();
