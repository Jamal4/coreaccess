        // ---- M3 CR run 17 L2334 (harness only): a new quote whose write went in, then a later step / the lock-exit flush failed
        (function () {
          var rc = function () { ['yard4@t.com', 'dir4@t.com', 'sales4@t.com'].forEach(function (e) { e5.cdel('OQEW:' + e); }); };
          var lk0 = e5.lock, db0 = e5.db, sq0 = UI_ACTIONS_.saveQuoteFull, nQ = function () { return db.rows('Quotes').length; };
          var BQ = function (s, o) { return Object.assign(base({ subject: s, lines: [{ code: 'RL-STD-20', desc: 'std', qty: 2, unit: 'pc / month', rate: 50 }] }), o || {}); };
          try {
            // (a) the operation worked, the lock-exit flush failed (oLkEnd_ throws after a good operation) -> SAVEUNSURE|no|ev; Save again with them = same quote
            var n0 = nQ(), ea; rc(); e5.lock = function (fn) { fn(); throw new Error('Flush failed'); };
            try { ea = err(function () { officeQuoteSave(tS, BQ('CR17b flush')); }); } finally { e5.lock = lk0; }
            var pa = String(ea).split('|'), qa = oQRow_(db, pa[1]); rc(); var ra = qa ? officeQuoteSave(tS, BQ('CR17b flush', { no: pa[1], ev: +pa[2] })) : {};
            eq('CR17-4a new quote, flush failed at the lock exit: SAVEUNSURE with its number + version; Save again with them = that quote, nothing changed, no second Draft (r17: "Flush failed", a retry made another)',
              [pa[0], !!qa, qa ? +pa[2] === oQeEv_(db, qa) : '', ra.no === pa[1], ra.changed, nQ() - n0].join('|'), 'SAVEUNSURE|true|true|true|false|1');
            // (b) a step after the write failed (the re-read) -> SAVEUNSURE with the number, no version (the page then says NOEV / Open the latest)
            var n1 = nQ(), eb, arm = false; rc();
            UI_ACTIONS_.saveQuoteFull = function () { var v = sq0.apply(this, arguments); arm = true; return v; };
            e5.db = function () { if (arm) { arm = false; throw new Error('Service Spreadsheets timed out'); } return db0.apply(this, arguments); };
            try { eb = err(function () { officeQuoteSave(tS, BQ('CR17b reread')); }); } finally { UI_ACTIONS_.saveQuoteFull = sq0; e5.db = db0; }
            var pb = String(eb).split('|');
            eq('CR17-4b new quote, a step after its write failed: SAVEUNSURE|no| (no version), the quote is there', [pb[0], !!oQRow_(db, pb[1]), pb[2], pb.length, nQ() - n1].join('|'), 'SAVEUNSURE|true||3|1');
            // (c) not reached: the save itself failed -> its own error, no quote; an edit save with the flush failure -> its own error
            var n2 = nQ(), ec, ed; rc(); UI_ACTIONS_.saveQuoteFull = function () { throw new Error('write failed'); };
            try { ec = err(function () { officeQuoteSave(tS, BQ('CR17b none')); }); } finally { UI_ACTIONS_.saveQuoteFull = sq0; }
            rc(); e5.lock = function (fn) { fn(); throw new Error('Flush failed'); };
            try { ed = err(function () { officeQuoteSave(tS, BQ('CR17b edit', { no: pa[1], ev: oQeEv_(db, oQRow_(db, pa[1])), attention: 'CR17b' })); }); } finally { e5.lock = lk0; }
            eq('CR17-4c the save itself failed -> SAVEFAIL, no quote; an edit with the flush failure -> its own error (not SAVEUNSURE)', [String(ec).split('|')[0], nQ() - n2, ed].join('|'), 'SAVEFAIL|0|Flush failed');
          } finally { e5.lock = lk0; e5.db = db0; UI_ACTIONS_.saveQuoteFull = sq0; }
        })();
