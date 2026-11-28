# usage (harness root): python3 tools7/sabotage_m2.py <src dir>  -> each sabotage must make the M2 tests fail (server or page)
import sys, os, shutil, subprocess, tempfile
src = sys.argv[1]
G = 'CAE_Ops_Office.gs'; H = 'Office.html'; C = 'Code.gs'
SAB = [
 (G, "  'officeContractList', 'officeContractGet', 'officeContractMake', 'officeContractSave', 'officeContractFab', 'officeContractAdvance',\n", '', 'S1 calls off the web API list'),
 (G, "    if (ex) oFail_('EXISTS|' + ex.JobNo);\n", '', 'S2 make twice allowed'),
 (G, "    if (String(q.Status) !== 'Sent') oFail_('QSTATE|' + String(q.Status || 'Draft'));\n", '', 'S3 make from any status'),
 (G, "    if (OCT_KINDS_.indexOf(d.kind) < 0) oFail_('BADINPUT|order kind');\n    var wo = oQeTxt_(d.no, 60, 'order no.'), wd = oCtDay_(d.date, env, 'order date');\n", "    var wo = oQeTxt_(d.no, 60, 'order no.'), wd = oCtDay_(d.date, env, 'order date');\n", 'S4 make: no kind check'),
 (G, "if (typeof tot !== 'number' || !isFinite(tot) || tot <= 0) oFail_('NOTOTAL');", '', 'S5 make: no total check'),
 (G, "oQDn_(new Date(2020, 0, 1)) || (now != null && d > now + 366)", "oQDn_(new Date(2020, 0, 1)) || (now != null && d > now + 9999)", 'S6 dates far ahead'),
 (G, "if (oCt4_(p) !== oCt4_(qp)) pct = p;", "pct = p;", 'S7 make: quote % stored'),
 (G, "var p = Math.round(oQeNum_(d.adv, 0, 100, 2, 'advance') * 100) / 1e4;", "var p = r2(oQeNum_(d.adv, 0, 100, 2, 'advance') / 100);", 'S8 make: % rounded to whole'),
 (G, "    if (typeof d.ev !== 'number' || d.ev !== oCtEvX_(db, j)) oFail_('STALE');\n    if (oCtClosed_(j)) oFail_('CLOSED');\n    if (OCT_KINDS_", "    if (oCtClosed_(j)) oFail_('CLOSED');\n    if (OCT_KINDS_", 'S9 save: no STALE'),
 (G, "    if (oCtClosed_(j)) oFail_('CLOSED');\n    if (OCT_KINDS_", "    if (OCT_KINDS_", 'S10 save: closed editable'),
 (G, "if (qn && oCtPis_(db, qn).length) oFail_('PIMADE'); ", '', 'S11 save: % changes after a PI'),
 (G, "    if (!ch.length) return { ok: true, same: true, old: 0 };\n", '', 'S12 save: unchanged still writes'),
 (G, "var old = ch.indexOf('ClientWONo') >= 0 ? oCtPdfOld_(db, jn) : 0;", "var old = 0;", 'S13 save: PDFs not marked old'),
 (G, "!(blank(r.Status) || String(r.Status) === 'Draft')", "false", 'S14 PDFs of issued docs cleared'),
 (G, "if (String(r.JobNo) !== jn || blank(r.PDF)", "if (blank(r.PDF)", 'S15 PDFs of other jobs cleared'),
 (G, "      if (d.sdStatus !== 'None' && !(sa > 0)) oFail_('BADINPUT|deposit amount');\n", '', 'S16 deposit held without amount'),
 (G, "    if (typeof d.status !== 'string' || (d.status !== String(j.Status || '') && uiList_(db, 'JobStatus').indexOf(d.status) < 0)) oFail_('BADINPUT|status'); // an unchanged status stays even if no longer listed\n", '', 'S17 any status'),
 (G, "String(l.QuoteNo) !== String(j.QuoteNo) || ", '', 'S18 fab: other contract line'),
 (G, " || l.Selected !== 'Yes') oFail_('NOTFOUND');", ") oFail_('NOTFOUND');", 'S19 fab: unselected line'),
 (G, "var j = oCtRow_(db, d.job); if (oCtClosed_(j)) oFail_('CLOSED');", "var j = oCtRow_(db, d.job);", 'S20 fab on closed'),
 (G, "    if (typeof d.fab !== 'boolean') oFail_('BADINPUT|fabrication');\n", '', 'S21 fab: any value'),
 (G, "    if (typeof d.ev !== 'number' || d.ev !== oCtEvX_(db, j)) oFail_('STALE');\n    if (oCtClosed_(j)) oFail_('CLOSED');\n    if (oCtPis_", "    if (oCtClosed_(j)) oFail_('CLOSED');\n    if (oCtPis_", 'S22 advance: no STALE'),
 (G, "    if (oCtPis_(db, qn).length) oFail_('PIMADE');\n    var v", "    var v", 'S23 advance: second PI'),
 (G, "Math.abs(amt - r2(v * pct)) < 0.005 ?", "true ?", 'S24 advance: % text for any amount'),
 (G, "oQeNum_(d.amount, 0.01, v, 2, 'amount')", "oQeNum_(d.amount, 0.01, 1e12, 2, 'amount')", 'S25 advance over the value'),
 (G, "a.DocType === 'PI' && no.indexOf", "no.indexOf", 'S26 paid counts other allocations'),
 (G, "String(i.JobNo) === String(j.JobNo) && i.Status !== 'Cancelled'", "String(i.JobNo) === String(j.JobNo)", 'S27 set off counts cancelled'),
 (G, "!has[n] && String(qs[n].Status) === 'Sent'", "String(qs[n].Status) === 'Sent'", 'S28 picker offers quotes with a job'),
 (G, "can: oQCan_(a) && !cl", "can: !cl", 'S29 viewer can edit'),
 (G, "return q ? oCuQTot_(db, q, String(q.QuoteNo)) : null;", "return q ? 0 : null;", 'S30 no fallback to quote total'),
 (G, "    if (!q) oFail_('NOTFOUND');\n    if (typeof d.ev", "    if (typeof d.ev", 'S31 advance without a quote'),
 (G, "if (!oCanSeeMoney_(oAcc_(L))) oFail_('NOACCESS');\n    d = d", "d = d", 'S32 advance without money access'),
 (H, "{job:c.job,ev:c.ev,amount:+a,date:dd}", "{job:c.job,amount:+a,date:dd}", 'H1 advance sends no ev'),
 (H, "      if(k==='STALE'){staleClose(function(){viewContract(c.job);});return;}\n      if(k==='PIMADE')", "      if(k==='PIMADE')", 'H2 advance STALE not handled'),
 (H, "o.closed=r.closed===true;o.ev=typeof r.ev==='number'?r.ev:0;", "o.closed=r.closed===true;o.ev=0;", 'H3 normaliser drops ev'),
 (H, "(M&&!c.pi&&c.value>0&&c.quote?'<button", "(M&&!c.pi&&c.quote?'<button", 'H4 PI button without a value'),
 (H, "var k=code(m).split('|')[0];\n      if(k==='STALE'){staleClose(function(){viewContract(c.job);});return;}\n      if(k==='CLOSED'){closeDlg();viewContract(c.job);toast('This contract is closed now — nothing saved.');return;}", "var k=code(m).split('|')[0];\n      if(k==='CLOSED'){closeDlg();viewContract(c.job);toast('This contract is closed now — nothing saved.');return;}", 'H5 edit STALE not handled'),
 (H, "k:'contracts',t:'Contracts (PO / WO)',x:'Client orders, advance',ic:'contract',l:1,r:1}", "k:'contracts',t:'Contracts (PO / WO)',x:'Client orders, advance',ic:'contract',l:1}", 'H6 tile not ready'),
 (H, "call('officeContractFab',S.token,{job:c.job,line:id,fab:to})", "call('officeContractFab',S.token,{job:c.job,line:id,fab:true})", 'H7 fab always on'),
 (H, "value=\"'+(c.advPct==null?'':ctR2(c.advPct*100))+'\"", "value=\"'+(c.advPct==null?'':Math.round(c.advPct*100))+'\"", 'H8 edit form rounds the %'),
 (C, "  if (o.extra) Object.keys(o.extra).forEach(function (k) { job[k] = o.extra[k]; }); // M2: contract fields in the same row write\n", '', 'S33 make: fields not in the insert'),
 (C, "  if (o.description) pi.Description = String(o.description); // M2: contract advance text in the same row write\n", '', 'S34 PI text not in the insert'),
 (G, "    oQRevFix_(env, db, String(oQRow_(db, d.quote).QuoteNo)); // CR10", "    // CR10", 'S35 make: half-saved revision not completed'),
 (G, "  return oQHash_(oCtEv_(j) + '|' + oCtPct_(db, j, q) + '|' + oCtValue_(db, j, q));", "  return oCtEv_(j);", 'S36 ev without effective % / value'),
 (G, "o.pi = m.pi ? m.pi.amount : null; }", "o.pi = null; }", 'S37 list without PI amount'),
 (G, "qStatus: q ? String(q.Status || '') : '',", "qStatus: 'Accepted',", 'S38 quote status fixed text'),
 (H, "if(my!==CT.nseq||!anc||!anc.isConnected)return;\n    if(r&&isDay", "if(my!==CT.nseq)return;\n    if(r&&isDay", 'H9 new-contract answer opens on another page'),
 (H, "pick=pre?(F.some(function(q){return q.no===pre;})?pre:''):(F.length===1?F[0].no:'')", "pick=pre&&F.some(function(q){return q.no===pre;})?pre:(F.length===1?F[0].no:'')", 'H10 other quote preselected'),
 (H, "base=c.pi&&c.pi.amount!=null?c.pi.amount:adv,", "base=adv,", 'H11 balance from the advance, not the PI'),
 (H, "var b=c.pi!=null?c.pi:c.adv,", "var b=c.adv,", 'H12 card balance from the advance'),
 (H, "c.quote?esc(c.quote)+(c.qStatus?' ('+esc(c.qStatus)+', locked)':' (locked)'):'—'", "c.quote?esc(c.quote)+' (Accepted, locked)':'—'", 'H13 Accepted always'),
 (H, "function ctToday(){if(CT.today)return CT.today;", "function ctToday(){", 'H14 browser date'),
 (H, "(M&&!c.pi&&c.value>0&&c.quote?'<button", "(M&&!c.pi&&c.value>0?'<button", 'H15 PI button without a quote'),
 (G, "    if (typeof d.qv !== 'number' || d.qv !== oCtQv_(db, q)) oFail_('STALE'); // the quote changed since the picker was shown\n", '', 'S39 make: no quote version check'),
 (G, "return oQHash_([q.Rev, q.Status, oCuQTot_(db, q, n), q.AdvancePct, q.CustID, q.SiteID, q.QuoteType]", "return oQHash_([q.Status, q.AdvancePct, q.CustID, q.SiteID, q.QuoteType]", 'S40 version ignores revision / total'),
 (G, ", qv: oCtQv_(db, q) };", " };", 'S41 picker without the version'),
 (G, "      if (oCt4_(pct) !== oCt4_(cur)) {", "      if (Math.abs(pct - cur) > 1e-9) {", 'S42 save: display rounding = % change'),
 (G, "(d.pm === String(j.PM == null ? '' : j.PM) || find(db.rows('Staff'), 'StaffID', d.pm))", "find(db.rows('Staff'), 'StaffID', d.pm)", 'S43 unchanged PM refused'),
 (G, "(d.status !== String(j.Status || '') && uiList_(db, 'JobStatus').indexOf(d.status) < 0)", "uiList_(db, 'JobStatus').indexOf(d.status) < 0", 'S44 unchanged status refused'),
 (G, "(d.sdStatus !== String(j.SecDepStatus || 'None') && uiList_(db, 'SecDepStatus').indexOf(d.sdStatus) < 0)", "uiList_(db, 'SecDepStatus').indexOf(d.sdStatus) < 0", 'S45 unchanged deposit status refused'),
 (G, "return k in lg ? !(cur(k) === String(lg[k]) || cur(k) === p[k]) : nv(k, p[k]) !== nv(k, j[k]);", "return nv(k, p[k]) !== nv(k, j[k]);", 'S46 apostrophe stripped in the compare'),
 (G, "      var u = String(r.PDF); log_(db, 'PDF out of date', String(r[t[1]]), 'WO no. of ' + jn + ' changed; old PDF ' + u); // logged first: a failed log stops before the link is cleared\n      uiPutRow_(db, t[0], r, { PDF: '' }); n++;", "      var u = String(r.PDF); uiPutRow_(db, t[0], r, { PDF: '' }); n++;\n      try { log_(db, 'PDF out of date', String(r[t[1]]), 'WO no. of ' + jn + ' changed; old PDF ' + u); } catch (e) { }", 'S47 link cleared before the log'),
 (H, "var d={quote:pick,qv:(F.filter(function(q){return q.no===pick;})[0]||{}).qv,", "var d={quote:pick,", 'H16 page sends no quote version'),
 (H, "      if(k[0]==='STALE'){closeDlg();ctNew(pre);toast('Quote '+pick+' was changed meanwhile — reloaded. Please check it again.');return;}\n", '', 'H17 make STALE not handled'),
 (H, "'+(c.pend&&c.pend[l.id]?' disabled':'')+'>", "'+'>", 'H18 pending line enabled after a redraw'),
 (H, "if(b.disabled||CT.c!==c||(c.pend&&c.pend[id]))return;", "if(b.disabled||CT.c!==c)return;", 'H19 pending line accepts a second click'),
 (H, "qv:typeof r.qv==='number'?r.qv:0};}", "};}", 'H20 normaliser drops the quote version'),
 (G, "function oCtLog_(db, a, r, t) { try { log_(db, a, r, t); return ''; } catch (e) { return 'LOG'; } }", "function oCtLog_(db, a, r, t) { log_(db, a, r, t); return ''; }", 'S48 post-write log failure thrown again'),
 (G, "function oCtLog_(db, a, r, t) { try { log_(db, a, r, t); return ''; } catch (e) { return 'LOG'; } }", "function oCtLog_(db, a, r, t) { try { log_(db, a, r, t); return ''; } catch (e) { return ''; } }", 'S49 log failure not reported'),
 (G, "    var w = oCtLog_(db, 'Contract made',", "    var w = log_(db, 'Contract made',", 'S50 make: log throws'),
 (G, "    var w = oCtLog_(db, 'Contract updated',", "    var w = log_(db, 'Contract updated',", 'S51 save: log throws'),
 (G, "    var w = oCtLog_(db, 'Contract line',", "    var w = log_(db, 'Contract line',", 'S52 fab: log throws'),
 (H, "is now Accepted.'+(r&&r.warn==='LOG'?' (Log entry not written.)':''));", "is now Accepted.');", 'H21 make toast hides the log warning'),
 (H, "' of this job marked old.':'')+(r&&r.warn==='LOG'?' (Log entry not written.)':''));", "' of this job marked old.':''));", 'H22 save toast hides the log warning'),
 (H, "' (saved).'+(r&&r.warn==='LOG'?' (Log entry not written.)':''));", "' (saved).');", 'H23 fab toast hides the log warning'),
]
SAB = SAB[int(os.environ.get('A', 0)):int(os.environ.get('B', 999))]  # optional slice (long runs)
os.environ['TMPDIR'] = '/tmp'; bad = 0
for f, a, b, name in SAB:
    t = tempfile.mkdtemp(dir='/tmp'); [shutil.copy(os.path.join(src, x), t) for x in os.listdir(src)]
    p = os.path.join(t, f); s = open(p, encoding='utf-8').read()
    if s.count(a) != 1: print('SKIP(not found x%d)' % s.count(a), name); bad += 1; shutil.rmtree(t); continue
    open(p, 'w', encoding='utf-8').write(s.replace(a, b))
    r1 = subprocess.run(['tools7/run_m2_tests.sh', t], capture_output=True, text=True).stdout.strip()
    r2 = subprocess.run(['node', 'h/pg/pg_m2.js', t], capture_output=True, text=True).stdout.strip().splitlines()
    r2 = r2[-1] if r2 else '?'; srv_ok = ' 0 failed' in r1 and 'passed' in r1; pg_ok = r2.startswith('page-m2') and r2.split()[-1].split('/')[0] == r2.split()[-1].split('/')[1]
    caught = not (srv_ok and pg_ok); bad += not caught
    print(('CAUGHT ' if caught else 'MISSED ') + name, '| srv:', r1.split('(')[0].strip(), '| page:', r2)
    shutil.rmtree(t)
print('sabotage', len(SAB) - bad, '/', len(SAB), 'caught')
