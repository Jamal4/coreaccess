# M8 Challans: complete scope (plan 25 Nov 2026, from r18 / e62b137)

Rule: tick a box only when it's done and checked. A ticked item is **never redone or re-asked**. Next chat: read this file first and carry on from the first unticked box.

## Paste prompt (next chat — cloud session, no desktop link needed)
`Token-saving mode. Read claude/ops/CH_PLAN.md (same file as ops/CH_PLAN.md in the repo) and carry on from the first unticked box (E3b-3 install r29 on TEST, then E4-2, then F3 rental pictures per component). Repo: Jamal4/coreaccess branch m3-stock (add it with push access, clone that branch). Harness: cd ops/test && npm install && export TMPDIR=$HOME/tx && bash tools8/run_ch_tests.sh .. ; pages: node h/pg/<pg_ch|pg_w4g|pg_m3_r18|pg_f>.js .. (one at a time). Browser = Linux Chrome (Browser 2); I keep its window in front. Install on TEST via Claude in Chrome (Apps Script editor, sha256 checked). Files the app's picker needs: upload with the Drive connector instead. Ask me for any permission straight away.`

## Apps Script editor tips (cloud session, 27 Nov)
- Install: in the editor tab, `fetch('https://raw.githubusercontent.com/Jamal4/coreaccess/<commit>/ops/<file>')` → sha256 check → `model.pushEditOperations` on `monaco.editor.getModels()[i]` (order = the Files list) → click **Save project** → reload → sha256 all 16.
- Run a function: open its file (click the file entry by coordinates), open the Select-function listbox, scrollIntoView the option, wait 1.5 s, click its coordinates, check `[aria-selected=true]`, click Run; read the log from `document.body.innerText` after 'Execution log'. Keep each JS eval under 45 s.
- Deploy: Deploy › Manage deployments › (TEST row selected) Edit › Version: New version › Description › Deploy.

## Working rules (27 Nov, user)
- **No sabotage runs.** Proof per fix = its new test fails on the previous round's code and passes on the new one (run the suite once on each).
- **No more CodeRabbit for M8** (user 27 Nov): skip E3f; one CodeRabbit run only when the whole project is complete.
- **Everything is built inside the repo** (27 Nov): rounds = commits on `m3-stock`, no ~/Downloads copies. All 16 sources are tracked in `ops/` since `19d1759`; the harness is `ops/test` (runners default to `..` = ops/). Patch scripts live in `ops/test/tools8/pNN*.py`.

## Self-review before every commit (step R)
Read the whole diff of this round (`git diff <last commit>..`) as a reviewer, not the author. For each changed function, check:
1. **Partial failure:** each write that can go in and then throw: what state is left, and does a retry fix it or double it?
2. **Concurrency:** another office save / post / PDF render / panel PDF / sweep at the same moment: same lock? same check (ev, fingerprint, `oPdfNewer_`, OPE marker)?
3. **Every other path to the same data:** list, view, save, post, cancel, PDF, panel, sweep, stock card.
4. **Status edge values:** blank, Draft, Posted, Cancelled, Inactive, closed job, Qty 0, sets, rented (Owner) vs own stock.
5. **Lock length:** anything slow added inside the script lock?
For each risk found: a test that fails first, then the fix. List in the reply what step R checked and found.

## What already exists (reuse, don't rebuild)
- Core: `createChallan` (Code.gs 358), `postChallan` / `cancelChallan` (Sets.gs), `onHire`, `stockMap`, `siteLoc`. Numbering CAE/DC/YYYY/NNN.
- PDF: `specChallan` (PDF.gs). Editable Doc next to each PDF. Office path `PDF/Projects/Active/<job>/Challans`.
- Register: CAE-PS-F01 Delivery, PS-F02 Return, YW-F01 Transfer, YW-F02 Rent-in receipt, YW-F03 Off-hire note.
- Blank template: Google Doc "CAE Challan Template" (id `1BZcoTmLx7KidBg88iK05JaP-WXRnrBmHLdVc2X_3Pwk`, Settings row 45 `ChallanTemplateID`).
- The live `appSweep` is the one in **QuoteApp.gs** (two phases; quote PDF marker `AppPdf = 'Queued <stamp>'`, see r25/r26).
- **Quote picture (QP, r26):** quote editor field Picture → `Quotes.PicID`; PDF block under the Subject. Set-up: run `upgradeQPLive` once (adds `Quotes.PicID`).
- **Quote unit (r26/r27):** a Unit dropdown on every line. Lists › Unit + `nos`.
- **F1 (r28):** challan Job / quote picker. `officeChallanList.quotes` = quotes with no job yet (not Lost / Expired / Cancelled). A Delivery / Sale saved from a quote has `Challans.QuoteNo` (JobNo blank), goes to the quote's site; **Post makes the job** (`chQuoteJob_` → `quoteToJob`: Awaiting order, quote → Accepted, no PO needed) then posts as usual. PDF / view print the quote no.; PO/WO ref shows when the job has one. A quote Lost etc. before Post: refused, no job.
- **F2 (r28):** Delivery `Material source` = Own stock (default) / Vendor rental. Vendor = pick (Suppliers, active) or **+ New vendor** (name, phone, address; same name = same vendor, made only after all checks). `Challans.MatSource = 'Vendor'`, `SupID` = vendor, `SupplierRef` = vendor's DO (optional), From = LOC-SUPPLIER. **No StockMoves** on any path (`postChallan` → `chPostVendor_`, office + sheet panel; cancel reverses nothing); not on hire (`jobEvents` skips it); vehicle no. optional; vendor printed in the PDF From row + view (rent payable tracked later in Accounts). Return of vendor items (vendor collects from site) is **not built** — next step if wanted.
- New columns (auto on first office save / post / cancel, `oChSetup_`): `Challans.QuoteNo`, `Challans.MatSource`.
- Harness helpers: python exact-match edits (count == 1). **Never put a `//` comment in a replacement followed by more code on the same line.**

## State (27 Nov 2026, r29 in repo; TEST = r28)
- **Main `AKfycbzuf7yk…` = V52** (unchanged; rollback = Version 29). **TEST = V58 = r29** (28 Nov 13:52): https://script.google.com/macros/s/AKfycbxCJqJWFmxhP6j1RFhEmZTq7CZevSumUSfYDBpklD2H2PT3FcajW2kAa_Eds8sV9IcXMQ/exec TEST Apps Script project id `1aZ5DH6Gr_FgcMUP1gM2vMHJ9Qfq1FLbgIUzY5vrXJE3vDQnXNPwMhfTS` (bound to CAE Ops DB `130OrVMdQ2tjCa_FQac2ebbWcbWzgW6l4VX5sfNWrKCw`, account info.coreaccess).
- Repo `Jamal4/coreaccess` branch `m3-stock` (pushed): … `d2a12da` r27 → `4a07117` harness in repo → `19d1759` all 16 sources tracked → **`6477d3e` r28**. Old branch `m3-stock-old` was local only (not on GitHub).
- r28 changed vs r27 (sha256 first 8): Office.gs **c58f6c25**, Sets.gs **af167ee5**, PDF.gs **7e1a665e**, Office.html **eb2f11ba** (QuoteApp.gs, UI.gs as r27). TEST editor (r21) needs: Office.gs, PDF.gs, QuoteApp.gs, Sets.gs, Office.html.
- Tests r28: server **1471 / 0** (`tools8/run_ch_tests.sh`; CH-78 F1, CH-79 F2, CH-80 step R in `tools8/ch_f.js`; next tests CH-81…, add after ch_f.js). Pages: pg_ch 28, pg_w4g 75, pg_m3_r18 113, **pg_f 12** (new, F1/F2 page smoke).
- **TEST records to delete at go-live (28 Nov E3b-4):** Quotes **Q/017** (+ line, terms) and **Q/012 back to Draft or delete** (r29 bug set it Accepted); Jobs **J/2026/007** (from Q/012, made by the r29 bug) + **J/2026/008** (Q/017); Challans **DC/008–DC/014** + lines + PDFs / Docs (incl. DC/008 draft PDF `1ornXSy7…`); StockMoves **MV-000013…MV-000018**; Log lines for DC/008–014; TEST hire-in stock: 9 × RL-STD-20 of SUP-0004 still in the yard (+1 on J/003, +1 on J/008). **Earlier:** Quotes Q/016 + its line + PDF, Jobs J/2026/006, Challans DC/006 + DC/007 + lines + PDFs / Docs, Suppliers SUP-0004 "TEST Vendor E3b (delete)"; Challans CAE/DC/2026/005 + its line + 2 StockMoves rows + PDFs / Docs (PDF › Yard › Transfers › 2026); Log lines for DC/004 / DC/005; DC/004 (TEST, edited 26 Nov) + its draft PDFs / Docs.
- 26 Nov user answers: challan PDF is signed by **whoever made the challan**; the stamp sits **next to the signature**.

## Scope: tick list
### A–D
- [x] A1, A2 · B1–B7, B6a–c · C1–C5 · D1, D1a, D1b, D2, D3

### E. Tests + release
- [x] E1 · E2 · E3 · E3c · E3d · E3e · E3g (see git log r22…r27)
- [~] E3f **skipped** (user 27 Nov: no more CodeRabbit for M8)

### F. User requests 27 Nov 21:13 (r28)
- [x] **F1 Challan → quoted customers / quote ref.** Cause: the picker listed Jobs only, and a job exists only after `quoteToJob` (order entry). Fixed in r28 (see above).
- [x] **F2 Challan material source (optional dropdown).** Own stock / Vendor rental, vendor pick or create, no stock moves. Done in r28 (see above).
- [x] E3b-1 r28 installed on TEST (all 16 editor files sha256 = repo `6477d3e`, saved), `upgradeQPLive` run once ("Done: Quotes + PicID"), live selfTestLog **1037 / 0**, TEST deployment **Version 57**. **Never run upgradeQPLive again.**
- [x] E3b-2 live check on TEST V57 (27 Nov, Linux Chrome): Q/015 picture = image29 (ringlock bay) — uploaded to Drive › Core Access Ops › **Quote pictures** (`1X0IWOKHbh7f5BDkAKYH56btmE6Slojqt`, file `1Q69KL8FzC3Buq64WlATvW4GUOKwL9Otj`) + `Quotes.PicID` set by connector (the app's file picker can't be driven from a cloud session); "Make PDF" picked up the change by itself, PDF shows the picture under the Subject, editor shows thumb + Change/Remove ✔. Unit dropdown (Q/015 m³ / month) ✔. **DC/006 (TEST)** vendor rental on TEST J/003 with + New vendor → SUP-0004 "TEST Vendor E3b (delete)", Post with no vehicle, PDF From row = vendor + DO ✔, StockMoves unchanged ✔. **F1:** TEST rental quote **Q/016** → Delivery **DC/007 (TEST)** vendor rental, no PO → Post made **J/2026/006**, Q/016 → Accepted, PDF shows Job + Quotation ✔, 0 moves ✔. Finding → **r29** `bf0cf88`: the Post toast said "Stock moved" for vendor rental → now "No stock moved (vendor rental)" (pg_f F2i fails on r28, passes on r29; pg_f 13, pg_ch 28, pg_w4g 75, m3_r18 113, server 1471/0). Sweep ✔: Q/016 `AppPdf = Requested` (by admin@) → `appSweep` run once by hand in the TEST editor (23:24 SGT, 41 s) → "Made 27-Nov-2026 21:25" + new PDF (opened for the user). **The TEST project has NO time trigger** (Triggers page: 0) — app requests only move when appSweep runs; add the 5-min trigger only on the user's order (it is persistent config). r29 (Office.html **d3cfc2fb**) not yet installed on TEST.
- [x] E4-1 PR **#15** opened `m3-stock` → main (not merged): https://github.com/Jamal4/coreaccess/pull/15
- [x] E3b-3 r29 installed on TEST (28 Nov 13:52 SGT): Office.html d3cfc2fb pasted, saved, reload → all 16 editor files sha256 = repo `6293bf6`; TEST deployment **Version 58**.
- [x] E3b-4 live challan tests on TEST V58 (28 Nov, Linux Chrome, director login): own stock short → DC/008 draft saves (red "need 2, usable 0"), Post refused "nothing moved" ✔ · Draft PDF (DRAFT — not posted) ✔ · Hire-in DC/009 10 × RL-STD-20 from SUP-0004 ✔ · Delivery from job J/003 DC/008 Post (2 from TEST vendor stock, Post PDF clean) ✔ · Return DC/010 1 good ✔ · Transfer DC/011 yard → repair ✔ + **Cancel posted** DC/011 (moves reversed, owner kept, PDF CANCELLED) ✔ · Sale from Sale quote Q/012 DC/012: rented can't be sold, Post refused ✔ **but r29 made J/2026/007 + Q/012 → Accepted (bug 3)** · Delivery from quote no PO: TEST rental quote Q/017 → DC/013 Post made **J/2026/008**, on hire ✔ · vendor rental pick SUP-0004 DC/014, no vehicle, toast "No stock moved (vendor rental)", 0 moves ✔ (+ New vendor was done in E3b-2). Every PDF opened for the user. appSweep 5-min trigger added on TEST (user said yes 28 Nov).
  Bugs → **r30**: (1) Office.html: Draft PDF busy label landed on the Discard / Cancel button (closure reused `var e`) → `chPdf(c,this)` (pg_f F3a fails on r29, passes); (2) PDF.gs: Return "Related challan" listed vendor-rental deliveries (never on hire) → own-stock only (CH-81 fails on r29, passes); (3) Sets.gs: a refused Post of a draft made from a quote still made the job + accepted the quote → the job is made only after every check passed (CH-82 fails on r29, passes). Server 1473/0, pages pg_ch 28, pg_w4g 75, pg_m3_r18 113, pg_f 15. Step R: partial failure (job made just before the moves; a retry finds the challan's JobNo), same lock, sheet panel uses postChallan, Lost quote still refused (CH-80), nothing slow added. Noted, not changed: `hireStartDay` counts a vendor-rental delivery as the hire start (by design?).
- [ ] E3b-5 install r30 on TEST (Office.html **c4493f9a**, Sets.gs **d5c38089**, PDF.gs **51ca5c93**) → new TEST version.
- [ ] E4-2 files to Drive (Drive copies are from 18 Nov; do it from the browser, not by pasting content), project docs `claude/ops/` = repo, delete `m3-stock-old` (local only: user runs `cd ~/COMPANY_WEB/site && git branch -D m3-stock-old`); main deployment → new version only on the user's order. Then start the next module.
- [ ] **F3 (user 27 Nov):** Project quotes = one picture (done, QP); **Rental quotes = a picture per component** (catalogue item picture, printed with the rental lines). Items have no picture field yet — build after E4-2 (the next module).
