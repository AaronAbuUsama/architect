# Process log

Newest first. How to write an entry, and what counts, is in `README.md`; the families are in `patterns.md`.
All times are UTC. `PR` links go to `https://github.com/AaronAbuUsama/architect/pull/<n>`; a session is its id, and a
quoted phrase you can find with `search_session_transcripts`, because the session reader shows no timestamps.

First pass: 19 November 2026, by the 📓 Scribe, from six sweeps (pull requests #60 to #123, CI runs, the conductor's
transcript, the lead, builder, author and designer transcripts, and the written record in git). Every seed the conductor
gave was checked against its source; where the seed was wrong, the entry says so.

---

### 2026-11-19 · The snag log lives only on a branch nobody has pushed
- **Kind:** near miss.
- **What happened:** Goal 3's snag log (S-01 to S-19), the climb's main record, is committed only on the local branch
  `goal-3/floor-curve` in the lead's worktree. `git ls-remote` finds no such branch on GitHub. Ledger rows and PR bodies
  quote parts of it, but the log itself would be lost with the worktree, exactly as three builders' work was in the
  morning's account switch (below).
- **Evidence:** commits 41810193, 67575774, 957936c8 on `goal-3/floor-curve` (worktree `awesome-tharp-a1fd3e`); `git
  ls-remote --heads origin goal-3/floor-curve` returns nothing, checked 20:50.
- **Cost:** none yet.
- **Found by:** the 📓 Scribe, sweeping the record.
- **Recovery:** raised with the conductor.
- **What changed:** nothing yet.
- **Pattern:** state lost across sessions.

### 2026-11-19 · The "no async, no throw" rule broke three times in one pull request, and only Codex noticed
- **Kind:** failure.
- **What happened:** On the climb check, Codex raised a P1 for `async`, `await` and `try` in the grid's evidence service
  (17:05), then a P1 for `throw` in the climb parser (20:19), then another for `throw` in a test helper (20:30). AGENTS.md
  says the rule is "enforced by lint and check as soon as they exist", but no lint rule exists for it. The conductor's
  first audit of the day had already found the same gap, plus a 317-line `cli/src/main.ts` against the 250-line limit
  and no check behind the six-slot module shape.
- **Evidence:** PR 110, comments
  [r4632250211](https://github.com/AaronAbuUsama/architect/pull/110#discussion_r4632250211),
  [r4634566246](https://github.com/AaronAbuUsama/architect/pull/110#discussion_r4634566246),
  [r4634710253](https://github.com/AaronAbuUsama/architect/pull/110#discussion_r4634710253); audit in session
  `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "Effect everywhere isn't enforced".
- **Cost:** three Codex rounds on one PR, open since 17:03 and still unmerged.
- **Found by:** Codex; the conductor's audit for the general gap.
- **Recovery:** each breach fixed by hand as Codex found it.
- **What changed:** nothing yet.
- **Pattern:** rules with no check behind them.

### 2026-11-19 · The in-memory store accepts a change the real database refuses
- **Kind:** near miss.
- **What happened:** One call that renames holder A from `x` to `y`, then holder B from `y` to `z`, passes the in-memory
  store, which checks uniqueness on the final values, and fails on D1, which checks each statement in write order. The
  handler then retries the same doomed batch 64 times. No stage 1 journey does this, so it doesn't block the climb.
  (Snag S-19, ledger HAN-18.)
- **Evidence:** [Codex P2 on PR 118](https://github.com/AaronAbuUsama/architect/pull/118#discussion_r4634332553) and
  [the lead's answer](https://github.com/AaronAbuUsama/architect/pull/118#discussion_r4634630831); [HAN-18 in the
  ledger](https://github.com/AaronAbuUsama/architect/blob/9bcc3392/design/ledger.md) (line 794, on
  `goal-3/han-10-check`); [G5](https://github.com/AaronAbuUsama/architect/blob/270c0774/design/decisions/G5-invariants.md).
- **Cost:** a parked ledger row and a G5 clause; the build has not started.
- **Found by:** Codex.
- **Recovery:** parked with an owner; G5 settles write-order semantics for both stores, built check first.
- **What changed:** nothing yet. Nothing runs the same tests against both stores.
- **Pattern:** fakes that diverge from the real service.

### 2026-11-19 · The unique-field build passed its checks, but real handlers had no `findBy`
- **Kind:** near miss.
- **What happened:** The build for "is this name taken?" made its checks pass and merged at 19:09. Four minutes later,
  Codex's P1 on the check PR showed that every real handler gets its records through a logging wrapper that rebuilt the
  object with only find, insert and update, and a type assertion hid the missing method. Every claim would have died with
  "findBy is not a function". A P2 showed D1's conflict parser cut hyphenated table names (`user-handle`). The checks
  never went through the wrapper, and the 🔍 on the check PR wrote that it had not looked at how the store retries a
  conflict. No 🔍 review is recorded on the build PR.
- **Evidence:** PR 120; [Codex P1](https://github.com/AaronAbuUsama/architect/pull/118#discussion_r4633763643),
  [P2](https://github.com/AaronAbuUsama/architect/pull/118#discussion_r4633763650); fix PR 121; session
  `local_e0c1bfdc-c4aa-42b1-88b0-e896bd406dd3`, "#118 (S-04) can't merge yet".
- **Cost:** 48 minutes with a broken lookup on the goal branch, a check-first round (b362395c) and a fix PR.
- **Found by:** Codex.
- **Recovery:** the wrapper forwards `findBy`, and the assertion is gone, so the next missing method fails typecheck.
- **What changed:** nothing yet. The reviewer checklist has no "a wrapper forwards every method" item.
- **Pattern:** reviews miss runtime defects.

### 2026-11-19 · The ratchet turned "CI is red for known reasons" into a real gate
- **Kind:** win.
- **What happened:** The M1 checks job had run with `continue-on-error` since the night before, so a new failure could
  merge unseen (see "63 failing tests behind a green run"). The ratchet checks in a list of expected failures (54
  tests), fails on anything else, and drops `continue-on-error`. Codex found two holes in it: an `afterAll` error hidden
  by a listed failure, then the same for per-test hooks, which the 🔍 had missed. Each was fixed test first.
- **Evidence:** PR 111; [Codex P2 one](https://github.com/AaronAbuUsama/architect/pull/111#discussion_r4632254305),
  [two](https://github.com/AaronAbuUsama/architect/pull/111#discussion_r4633814252); [run proving it: 54 failing, 54
  expected, 0 unexpected](https://github.com/AaronAbuUsama/architect/actions/runs/44597634869); PR 118 later merged
  with every check green.
- **Cost:** 2 hours 43 minutes open, two Codex rounds.
- **Found by:** the M1 lead (the need), Codex (the holes).
- **Recovery:** this is the recovery.
- **What changed:** `.github/workflows/ci.yml`, `e2e/ratchet/`, `e2e/m1/expected-failing.txt` on `goal/stage-1`. `m1`
  itself still reads its baseline by hand (reviewer item 8).
- **Pattern:** CI that can't tell us anything.

### 2026-11-19 · A 🔍 found that the unique-field checks could be passed without the real index
- **Kind:** win.
- **What happened:** Reviewing the check PR for unique fields, the 🔍 saw the host test used a hand-written index, so
  "a builder could pass with an app-level `findBy`" and no generated index. The checks author added a projections test
  and an end-to-end check that the generated migration carries the unique index, before the builder started.
- **Evidence:** PR 118; session `local_e0c1bfdc-c4aa-42b1-88b0-e896bd406dd3`, 🔍 review of #118 point 2, and commit
  12453750.
- **Cost:** one small checks round.
- **Found by:** 🔍 reviewer.
- **Recovery:** the check was strengthened before the build.
- **What changed:** `e2e/m1/25-unique-fields.test.ts` (25.5) and the projections `unique.test.ts`.
- **Pattern:** fakes that diverge from the real service.

### 2026-11-19 · Two different decisions were both named G3
- **Kind:** near miss.
- **What happened:** The checks author's "G3: the grid's verdicts go to a file first" (17:11, on `goal-3/climb-check`)
  and the lead's "G3: the runtime's exits" (17:55, on the HAN-10 branches) share one ID. Neither branch holds the other's
  file, so nothing conflicts until both land, and the ledger and review replies already cite "G3" for exits. G4 and G5
  are taken since, so neither can simply move up.
- **Evidence:** [G3-grid-verdicts.md](https://github.com/AaronAbuUsama/architect/blob/1acf6d6b/design/decisions/G3-grid-verdicts.md),
  [G3-runtime-exits.md](https://github.com/AaronAbuUsama/architect/blob/0599c1b1/design/decisions/G3-runtime-exits.md),
  commits 578414c3 and 04bae6d4; [a reply citing "Decision
  G3"](https://github.com/AaronAbuUsama/architect/pull/115#discussion_r4633276395).
- **Cost:** not yet; every "G3" link is ambiguous.
- **Found by:** the 📓 Scribe's sweep; no thread had noticed.
- **Recovery:** raised with the conductor.
- **What changed:** nothing yet. Decision IDs are picked by whoever writes one, on whatever branch.
- **Pattern:** parallel work collides.

### 2026-11-19 · A decision narrowed an older one's range, and the conductor made one change carry every copy
- **Kind:** win, with a near miss inside it.
- **What happened:** G3 (runtime exits) reserved exits 120 to 125, narrowing K16's "5 to 125" for declared refusals. The
  conductor caught that K16, the compiler's message, checks 19 and 22 and three milestone rows still said "5 to 125", and
  asked for them all in the same change, gated on `git grep "5 to 125"` finding only dated records. The lead amended them
  51 seconds after the decision landed. The 🔍 on the check PR then found G3's first draft claimed acme's
  `AllowanceExceeded` used exit 5; it is 41. Seed correction: K16 was amended in the same change, not left stale. One copy
  survives in the board's `tasks.json`.
- **Evidence:** commits 04bae6d4 (17:55:04) and
  [3fdff392](https://github.com/AaronAbuUsama/architect/commit/3fdff392) (17:55:55); 44503c50, ec55d54a; PR 116; session
  `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "This narrows a range we'd already decided".
- **Cost:** about an hour; edits to K16, M1-plugged-in, M1-prehandle, M1.47, checks 19 and 22.5.
- **Found by:** the conductor (the narrowing); 🔍 reviewer (the false fact).
- **Recovery:** one change set and a grep gate.
- **What changed:** K16 carries "Amended by G3" inline. The grep gate was a one-off, not a check.
- **Pattern:** decisions leave older docs stale.

### 2026-11-19 · A fix was built before anyone checked a journey could reach it
- **Kind:** failure.
- **What happened:** The check (PR 113) and build (PR 114) for "a send that never reaches depth is a typed failure" both
  went red: the coverage eval wants journeys that reach `SendNotIncluded` and `SendNotConfirmed`, but the device host
  runs one Anvil that mines every second at a fixed depth, and nothing lets a world hold the chain. The journey author
  refused to fake it, and the lead parked both PRs: "No stub chain, no unreachable RPC, no coverage exemption". Codex
  also found a stub-name collision in the check (`organization.owner` and `project.owner` both make `allowed-owner`).
  (Ledger HAN-11, snag S-18.)
- **Evidence:** PR 114 (parking comment), PR 113, [Codex P2](https://github.com/AaronAbuUsama/architect/pull/113#discussion_r4632446906);
  session `local_e0c1bfdc-c4aa-42b1-88b0-e896bd406dd3`, "The chain state they need can't be expressed today".
- **Cost:** two PRs built, reviewed and parked, about an hour plus CI; a framework slice still to design.
- **Found by:** CI (the coverage eval), then the journey author.
- **Recovery:** parked with an owner and a reason, and no fake chain. That part is a win worth keeping.
- **What changed:** nothing yet. Check-first was followed; "is this reachable by a journey?" was not asked first.
- **Pattern:** found before building, or after.

### 2026-11-19 · Code quoted by line number in the docs broke on almost every change
- **Kind:** failure.
- **What happened:** `canon:check` fails whenever code a canon page quotes by line moves. #76 needed a fix; Builder B
  found 29 stale quotes after one merge of m1 and wrote a throwaway re-anchor script; #76 had three more; the 🔍 on #117
  first wrote "pass", then reproduced six drifted quotes and changed it to "block" (the builder found a seventh).
- **Evidence:** sessions `local_48c36e1c-42ff-4571-b007-d83206a898d7` ("29 quotes ... No auto-fix mode"),
  `local_cf73abe5-dc5c-4eb8-a980-e2b715b866fa` ("off by one line"), `local_e0c1bfdc-c4aa-42b1-88b0-e896bd406dd3` (🔍
  review of #117, "6 drifted quotes"); PR 117.
- **Cost:** at least four fix rounds, each a CI cycle, and one reversed verdict.
- **Found by:** CI.
- **Recovery:** quotes re-pointed by hand each time.
- **What changed:** nothing yet.
- **Pattern:** one fact, many hand-kept copies.

### 2026-11-19 · The visibility rule passed review with the new checklist, and Codex still found five more gaps
- **Kind:** failure.
- **What happened:** #95 (one visibility rule, issued secrets) was open 3 hours 13 minutes over 24 commits, through an
  author's fixes and the outside review's five defects. After merge, a 🔍 passed it "with items 6 to 8", the new runtime
  checklist. Codex then found five more in its code, on the merge PRs: a device refusal printed with every field (P1,
  HAN-17), replayed answers read as the new envelope (HAN-13), the device SDK type not showing redaction (HAN-14), the
  answer-shape eval letting an issued secret be missing (HAN-15), and an idempotency conflict surfacing as a defect
  (HAN-10). The checklist names "the device path", "replays and caches" and "types against the wire" outright.
- **Evidence:** PR 95; [P1](https://github.com/AaronAbuUsama/architect/pull/95#discussion_r4630244588);
  [HAN-17](https://github.com/AaronAbuUsama/architect/pull/115#discussion_r4633185912);
  [HAN-13](https://github.com/AaronAbuUsama/architect/pull/116#discussion_r4632894035),
  [HAN-14](https://github.com/AaronAbuUsama/architect/pull/116#discussion_r4632894049),
  [HAN-15](https://github.com/AaronAbuUsama/architect/pull/116#discussion_r4632894060);
  [HAN-10](https://github.com/AaronAbuUsama/architect/pull/115#discussion_r4633185927).
- **Cost:** five ledger rows and a framework slice (PRs 116 and 117, still open); HAN-13 parked to M7.
- **Found by:** Codex, after the 🔍 passed.
- **Recovery:** each finding ledgered with an owner; fixes check first.
- **What changed:** nothing beyond the checklist, which this entry shows is not enough on its own.
- **Pattern:** reviews miss runtime defects.

### 2026-11-19 · The lead's plan left out the snags blocking the climb until the conductor pointed at them
- **Kind:** near miss.
- **What happened:** After merging m1 in (PR 115), the lead's plan went straight to the floor and the starting curve. The
  conductor wrote that the plan "doesn't mention the snags that block the climb" and named S-04 as the critical path.
  The lead started the S-04 decision and builder the same hour.
- **Evidence:** session `local_e0c1bfdc-c4aa-42b1-88b0-e896bd406dd3`, message from the conductor beginning "Your plan
  after #115 doesn't mention the snags".
- **Cost:** a short spell of idle builder slots.
- **Found by:** the conductor.
- **Recovery:** S-04 and S-02/S-03 started.
- **What changed:** nothing yet. The goal file lists snags, but not "start blockers as soon as a builder slot is free".
- **Pattern:** briefs that miss context.

### 2026-11-19 · The conductor reported to Aaron in internal labels, and he couldn't follow
- **Kind:** failure.
- **What happened:** After several Goal 3 updates written in snag numbers, ledger IDs and PR numbers, Aaron said "I have
  no idea what s04 or any other jargon for this project is", and asked for the 54 expected failures explained from
  scratch. The conductor rewrote the status in plain words. The climb page kept the labels until he was asked.
- **Evidence:** session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "I have no idea what s04"; memory note
  `plain-words-no-ids.md`.
- **Cost:** Aaron's time and trust; several updates he couldn't use; a second pass over the whole goal.
- **Found by:** Aaron.
- **Recovery:** plain words first, IDs only in brackets after them.
- **What changed:** a conductor memory note on Aaron's machine. The `threads` skill's "Talking to Aaron" said to describe
  a pull request rather than read its number, but says nothing about snag or ledger IDs.
- **Pattern:** talking to Aaron.

### 2026-11-19 · The fix that hid secrets from journeys hid public values too
- **Kind:** failure.
- **What happened:** PR 104 (Codex findings on merged PRs) made a blank operation's payload redact every value with a
  visibility. Every field carries one, defaulting to "public", so a public `email` came back `{ redacted: true }`. The 🔍
  on #104 passed it. Codex flagged it two minutes after merge, on the merge of m1 into the goal branch (PR 106), not on
  #104. The checks author wrote a failing check, and PR 109 fixed it a minute later. The 🔍 on #109 then found redaction
  is still three different rules in three places (ledger HAN-12). Seed correction: HAN-12 is #109's leftover, and Codex's
  finding was on #106.
- **Evidence:** PR 104; [Codex P2 on PR 106](https://github.com/AaronAbuUsama/architect/pull/106#discussion_r4632012796);
  commit [3c1427ea](https://github.com/AaronAbuUsama/architect/commit/3c1427ea) (the check); PR 109;
  [HAN-12](https://github.com/AaronAbuUsama/architect/commit/187ce387).
- **Cost:** under an hour of wrong behaviour on m1, one fix PR, HAN-12 still open.
- **Found by:** Codex; then the 🔍 for the leftover.
- **Recovery:** check first, then a one-line fix.
- **What changed:** reviewer item 6, "both sides of a hiding rule" (PR 108).
- **Pattern:** reviews miss runtime defects; one fact, many hand-kept copies.

### 2026-11-19 · The day's review misses became a reviewer checklist
- **Kind:** win.
- **What happened:** The conductor turned the day's misses into reviewer items: item 6, the runtime list (device path,
  replays and caches, types against the wire, name collisions, bad numbers, both sides of a hiding rule, state that can
  go back, races, process hygiene); item 7, no finding left unanswered; and item 8, read CI properly and name the
  baseline run. Seed correction: item 8 answers the `continue-on-error` job, not a stale baseline on #76. #76's baseline
  was m1's head at the time; the only stale baseline on record is #95's, which said so openly.
- **Evidence:** PR 108 (commit f6033d4e); #76's merge comment with [baseline run
  44569426386](https://github.com/AaronAbuUsama/architect/actions/runs/44569426386); #95's merge note, [baseline run
  44574459951](https://github.com/AaronAbuUsama/architect/actions/runs/44574459951).
- **Cost:** a 12-minute docs PR.
- **Found by:** the conductor, from the pattern across Codex's findings.
- **Recovery:** this is the recovery.
- **What changed:** `.agents/skills/reviewer/SKILL.md`, items 6 to 8.
- **Pattern:** reviews miss runtime defects.

### 2026-11-19 · Proving each journey possible found the "is this name taken?" gap before the climb
- **Kind:** win.
- **What happened:** The journey author proved Plugged In's journeys satisfiable with a scratch implementation, and found
  a handler can't look a record up by a field: `Records` has only find, insert and update by id. Logged before the
  climber started (S-04), decided as unique fields enforced by the store (G4), checks first, built and merged. Aaron then
  chose to make invariants their own declaration (his answer "C" to the conductor), and the 📐 thread made that G5,
  replacing G4's spelling 90 minutes after its build merged, because G4 wrote declared names as strings. Seed refinement:
  the step to invariants came from Aaron, not the journey author.
- **Evidence:** PR 107 ("handlers can't look anything up by field"); [G4](https://github.com/AaronAbuUsama/architect/blob/a2d29b10/design/decisions/G4-unique-fields.md);
  PRs 118, 120, 121; [G5](https://github.com/AaronAbuUsama/architect/blob/270c0774/design/decisions/G5-invariants.md),
  PR 123; session `local_e0c1bfdc-c4aa-42b1-88b0-e896bd406dd3`.
- **Cost:** about four hours from snag to merged build, none of it climber time. The climb's first step would have stopped.
- **Found by:** the journey author.
- **Recovery:** decision, checks by another agent, then builder.
- **What changed:** G4, then G5. The snag log notes that G4's spelling was kept out of docs, scaffold and skills.
- **Pattern:** found before building, or after.

### 2026-11-19 · The stage 1 spec changed under a check that was already passing
- **Kind:** near miss.
- **What happened:** The journey author changed Plugged In from "no sign-in, nobody owns anything" to an owned page,
  because a journey needs "a stranger can't edit someone else's page". ST1-02 keeps the old words as a dated record,
  while G3 amends K16 in place: the repo now has two conventions for superseding. The change broke check 20 on the shared
  branch until the checks author moved it.
- **Evidence:** commit [f4e02897](https://github.com/AaronAbuUsama/architect/commit/f4e02897),
  [ST1-02](https://github.com/AaronAbuUsama/architect/blob/36e5e218/design/decisions/ST1-02-plugged-in-ownership.md),
  commit 4e54a2d9 (check 20 moved); PR 107; PR 112.
- **Cost:** check 20 red for 14 minutes on the goal branch; M1.40 and M1.43 re-worded after 🔍 advice.
- **Found by:** 🔍 reviewer (advice on #107).
- **Recovery:** check 20 moved; milestone rows amended.
- **What changed:** nothing yet. Two superseding conventions remain.
- **Pattern:** decisions leave older docs stale.

### 2026-11-19 · Goal 3 started before m1 settled, and m1 had to be merged in by hand twice
- **Kind:** near miss.
- **What happened:** Aaron said "Start them now" rather than wait on the scaffold work (PR 76). The goal branch was cut
  before #76, #95 and #104 landed, so m1 came in through two merge PRs, of 57 and 32 commits. Codex's findings on those
  PRs were about m1 code Goal 3 may not touch, so they could only be forwarded or ledgered. The conductor had promised a
  start "in about an hour and a half"; after #76 turned out to break eight tests it became about three.
- **Evidence:** PRs 105, 106, 115; session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "in about an hour and a half"
  and "Start them now".
- **Cost:** two merge PRs (about 1.5 hours open, 89 commits) and two Codex rounds on code the goal didn't write.
- **Found by:** the conductor and the M1 lead.
- **Recovery:** merge PRs; findings answered with an owner and a ledger line.
- **What changed:** PR 105 records the early start as Aaron's override.
- **Pattern:** parallel work collides.

### 2026-11-19 · Two stale runs from a closed pull request held runners for almost two hours
- **Kind:** failure.
- **What happened:** PR 96 closed at 15:23, but its two runs (started 14:44 and 14:48) kept `e2e-m1` and `e2e-layer1`
  going until 16:47, when all four jobs were cancelled together. Closing a PR doesn't cancel its runs, and no job but
  `e2e-layer2` has `timeout-minutes`. The conductor cancelled them when #76's CI was stuck behind them.
  The held jobs logged nothing after their last step started; why they hung is not established. The `check` job in each
  run also sat about 56 minutes after failing in its first minute.
- **Evidence:** runs [44546985433](https://github.com/AaronAbuUsama/architect/actions/runs/44546985433) and
  [44547744427](https://github.com/AaronAbuUsama/architect/actions/runs/44547744427); session
  `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "running since 14:45, more than two hours".
- **Cost:** about 9.3 runner-hours for a closed PR (443 minutes on the four held jobs, about 1.9 hours on the two
  `check` jobs), cancelled 84 minutes after the close; slower CI on #76 while Goal 3 waited.
- **Found by:** the conductor.
- **Recovery:** cancelled by hand at 16:47.
- **What changed:** nothing yet. No job timeouts, and nothing cancels a closed PR's runs.
- **Pattern:** CI that can't tell us anything.

### 2026-11-19 · Codex findings sat unanswered for up to 17 hours, and a P1 merged
- **Kind:** failure.
- **What happened:** Most Codex findings on merged PRs had no reply until one sweep at 16:00, about 40 replies in two
  minutes. Several were real defects at merge: the confirmation-depth PR (93) merged at 15:00 with a P1 open (a payment
  dropped by a reorg still reported "confirmed") and a P2 (one 429 failed a mined send); #64's redaction hole; #86's
  check that passed when the compiler didn't start; #88's lock races; #97's concurrency flaw (below). The triage of 32
  threads found 13 real. PR 104 then fixed the runtime ones, checks first.
- **Evidence:** [PR 93 P1](https://github.com/AaronAbuUsama/architect/pull/93#discussion_r4630194072) and [triage
  reply](https://github.com/AaronAbuUsama/architect/pull/93#discussion_r4631409452);
  [#64](https://github.com/AaronAbuUsama/architect/pull/64#discussion_r4631386973),
  [#86](https://github.com/AaronAbuUsama/architect/pull/86#discussion_r4629672986),
  [#88](https://github.com/AaronAbuUsama/architect/pull/88#discussion_r4631405176); PR 104; session
  `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "Every one of the 32 Codex comments".
- **Cost:** a dropped payment shown as confirmed lived on m1 for 1 hour 44 minutes; a cleanup PR; the triage pass.
- **Found by:** Codex found them; the conductor triaged after merge.
- **Recovery:** triage with an owner per finding; PR 104.
- **What changed:** reviewer item 7, "No finding is left unanswered" (PR 108), and the conductor's merge rule: CI green,
  Codex finished, every thread resolved. Neither is enforced by GitHub.
- **Pattern:** findings merged unanswered.

### 2026-11-19 · Over half the red runs were red on purpose, and the run list can't tell them apart
- **Kind:** near miss.
- **What happened:** 55 of the day's 78 failed runs were PR runs, many on checks-first branches that fail on empty
  handlers by design (`claude/k16-checks` failed nine times, 16 to 25 minutes each). Nobody reading the run list can tell
  expected red from a regression without opening the log, which is part of why m1's baseline was hard to trust.
- **Evidence:** runs [44516044321](https://github.com/AaronAbuUsama/architect/actions/runs/44516044321),
  [44532112729](https://github.com/AaronAbuUsama/architect/actions/runs/44532112729),
  [44573305265](https://github.com/AaronAbuUsama/architect/actions/runs/44573305265).
- **Cost:** part of the day's 50.5 runner-hours in failed jobs; attention.
- **Found by:** the M1 lead.
- **Recovery:** the ratchet separates expected from new failures on the goal branch; check branches still show red.
- **What changed:** PR 111, for push runs only.
- **Pattern:** CI that can't tell us anything.

### 2026-11-19 · Our own 🔍 passed two pull requests holding twelve real defects
- **Kind:** failure.
- **What happened:** The scaffold work (PR 76) and the visibility rule (PR 95) had passed the 🔍 and were waiting only on
  CI when an outside review blocked both (the transcripts call it Codex and "Aaron's private reviewer"): five defects on
  #95 (device calls skip visibility, logs leak short and structured secrets, a cached answer not tied to its
  authorisation) and seven on #76 (the identity thing found by an id prefix, `refs` missing on the device path, and
  more). The conductor checked all twelve against the code: eleven real, one very likely. Three shared one blind spot:
  the device path treated as second class.
- **Evidence:** session `local_cf73abe5-dc5c-4eb8-a980-e2b715b866fa`, "don't merge #76 or #95, even when CI is green";
  session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "Our own reviewer passed both PRs"; PRs 76 and 95.
- **Cost:** Goal 3's start slipped about three hours; a planted check, a builder fix and a re-review per defect.
- **Found by:** the outside review, relayed by Aaron.
- **Recovery:** checks planted first, builders fixed, fresh 🔍 on the fixed heads.
- **What changed:** reviewer items 6 to 8 (PR 108).
- **Pattern:** reviews miss runtime defects.

### 2026-11-19 · Reviewing the combined scaffold build, findings went in as failing checks first
- **Kind:** win.
- **What happened:** For the seven defects on #76, the author wrote seven planted checks that fail first (check 22),
  then the builders fixed them, 36 minutes from reviewed head to fixes pushed. One fix that would move the model was
  ledgered (AUT-42, owned by M2.05) instead of being squeezed in.
- **Evidence:** PR 76; commits [e26bbb88](https://github.com/AaronAbuUsama/architect/commit/e26bbb88) (checks red,
  15:55), [4d2f2705](https://github.com/AaronAbuUsama/architect/commit/4d2f2705),
  [cc3faf78](https://github.com/AaronAbuUsama/architect/commit/cc3faf78) (fixes, 15:58 to 16:00).
- **Cost:** 36 minutes.
- **Found by:** 🔍 reviewer and the outside review.
- **Recovery:** this is the practice.
- **What changed:** it became the working method for every finding that day (#104, #109, #121), but it isn't written in
  a skill.
- **Pattern:** found before building, or after.

### 2026-11-19 · Two checks written at different times contradicted each other
- **Kind:** failure.
- **What happened:** Among #76's planted checks, 22.6 demanded exit 0 when `add journeys` finds every stub already there;
  check 19, already passing, demanded a refusal. The builder fixed half and reported "Both can't pass". The lead ruled
  K16's behaviour stands, and the author corrected 22.6 (638a679a).
- **Evidence:** session `local_cf73abe5-dc5c-4eb8-a980-e2b715b866fa`, "check 22.6 contradicts check 19, which I can't
  edit"; session `local_67fe60e6-d968-4457-a56f-91a867247c49`, "The lead is right".
- **Cost:** a stalled builder round and an extra review cycle.
- **Found by:** the builder.
- **Recovery:** the checks author, not the builder, changed the check.
- **What changed:** nothing yet. Nothing runs the existing suite against a new planted check before a builder gets it.
- **Pattern:** found before building, or after.

### 2026-11-19 · Sixty-three failing tests sat behind a green run
- **Kind:** failure.
- **What happened:** When Docker left the stack on 18 November, the M1 checks became a `continue-on-error` job so planted
  checks wouldn't block. From then on the run showed "success" while the job was red: 63 failures on m1, with #76 adding
  eight that nobody would have seen. Separately, six PRs (#83 to #89) merged into m1 with the `check` job red for a known
  wallet and impact failure, so it signalled nothing new for an hour. The M1 lead found the hidden reds by diffing CI
  logs, and PRs merged on a hand-made "failing set is a subset of the baseline" comparison until the ratchet.
- **Evidence:** commit [1e0c8d6a](https://github.com/AaronAbuUsama/architect/commit/1e0c8d6a) (18 Nov 22:49); #76's
  merge comment, runs [44569426386](https://github.com/AaronAbuUsama/architect/actions/runs/44569426386) and
  [44569780146](https://github.com/AaronAbuUsama/architect/actions/runs/44569780146); red `check` jobs on
  [#84](https://github.com/AaronAbuUsama/architect/actions/runs/44535283625/job/135598918921) and
  [#89](https://github.com/AaronAbuUsama/architect/actions/runs/44542755425/job/135625180347); session
  `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "m1's checks job never turns red"; PR 111.
- **Cost:** about 20 hours with a job that could not fail, a hand diff per merge, and Goal 3's first slice spent on CI.
- **Found by:** the M1 lead.
- **Recovery:** the subset rule, then the ratchet (PR 111).
- **What changed:** the ratchet on `goal/stage-1`; reviewer item 8. `m1` still relies on the hand diff.
- **Pattern:** CI that can't tell us anything.

### 2026-11-19 · A design decision routed device operations over HTTP, and Codex caught it before any code
- **Kind:** near miss.
- **What happened:** K17 gave the Effect language one target with a fixed HTTP transport, so a device operation such as
  the wallet's signing step would have gone to the server. Codex flagged it on the decision PR. Aaron: "this looks like a
  big flaw". The conductor graded four options, Aaron chose two targets, and PR 101 landed before any code used it.
- **Evidence:** PR 101 ("lands before any [code] does"); session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "this
  looks like a big flaw".
- **Cost:** about an hour before Goal 3 could start.
- **Found by:** Codex.
- **Recovery:** effect-server and effect-device targets; the compiler refuses an operation taken by none or two.
- **What changed:** K17 and the walkthrough.
- **Pattern:** found before building, or after.

### 2026-11-19 · Goal 3's files merged before their checks finished
- **Kind:** near miss.
- **What happened:** The first Goal 3 file (PR 99) merged into main because the conductor's watcher saw restarted checks
  as done. The rewrite (PR 100) was merged under Aaron's account at 15:36 while the watcher was still waiting. Both were
  docs and a CI trigger, and main's CI passed.
- **Evidence:** PRs 99 and 100; session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "saw the restarted checks as done"
  and "merged under your account at 15:36".
- **Cost:** nothing broke; trust in the watcher.
- **Found by:** the conductor.
- **Recovery:** the watcher waits for every check.
- **What changed:** the conductor's merge rule (CI green, Codex finished, no unresolved thread), applied from PR 101.
  No branch protection enforces it.
- **Pattern:** findings merged unanswered.

### 2026-11-19 · Runners starved for three hours, and a backlog sweep threw away 34 runner-hours
- **Kind:** failure.
- **What happened:** From about 12:00 to 16:00, every push to every PR queued a full six-job run while older runs kept
  going, about ten at once. Jobs waited up to 37 minutes for a runner, and 10 to 20 minute runs took 30 to 48. Six m1
  push runs that had already run 26 to 39 minutes were then cancelled together at 15:35 to clear the backlog, so m1 had
  no finished verdict from 14:37 to 15:23. Across the day's 300 runs, 41 of about 182 runner-hours (23%) ended
  cancelled.
- **Evidence:** runs [44547086759](https://github.com/AaronAbuUsama/architect/actions/runs/44547086759) and
  [44551254864](https://github.com/AaronAbuUsama/architect/actions/runs/44551254864) (48 minutes each); the six cancelled
  m1 runs, for example [44549311407](https://github.com/AaronAbuUsama/architect/actions/runs/44549311407) and
  [44551531583](https://github.com/AaronAbuUsama/architect/actions/runs/44551531583); PR 97's body, "about ten runs
  queued at once".
- **Cost:** about 33.6 runner-hours cancelled in one sweep; reviews and fixes waiting on queued CI all afternoon.
- **Found by:** the conductor.
- **Recovery:** PR 97 cancels a PR's superseded runs (whose own flaw is the next entry); manual cancellation.
- **What changed:** PR 97, then PR 102.
- **Pattern:** CI that can't tell us anything.

### 2026-11-19 · The CI fix for queued runs cancelled main's push runs, and m1 still has it
- **Kind:** failure.
- **What happened:** Every push queued a full run, about ten at once, so PR 97 cancelled superseded runs. Codex's P2 warned
  that main and milestone branches share one group per ref, so middle pushes would be cancelled; #97 merged unanswered,
  and main's push runs for #72, #74, #78 and #80 were cancelled. The conductor found it ("One was mine") and PR 102 gave
  each push its own group. Only main and `goal/stage-1` have the fix: `m1`'s ci.yml is still #97's, and m1 push runs were
  cancelled after it (#109's merge run, #98's).
- **Evidence:** PR 97, [Codex P2](https://github.com/AaronAbuUsama/architect/pull/97#discussion_r4630374770); PR 102;
  cancelled runs [44553675272](https://github.com/AaronAbuUsama/architect/actions/runs/44553675272) (main) and
  [44575990306](https://github.com/AaronAbuUsama/architect/actions/runs/44575990306) (m1).
- **Cost:** four merge commits on main that never ran at all, and at least two on m1; #95's baseline had to be an older
  run.
- **Found by:** Codex (the flaw), the conductor (the effect), the 📓 Scribe's sweep (m1 still has it).
- **Recovery:** PR 102 on main.
- **What changed:** ci.yml on main. m1 still to take it; raised with the conductor.
- **Pattern:** CI that can't tell us anything; findings merged unanswered.

### 2026-11-19 · The portal viewer was built against a licence its Worker can't bundle
- **Kind:** failure, with a win in the recovery.
- **What happened:** PR 96 (the portal as a viewer) failed `e2e-layer2`: the generated Worker bundled the portal pages and
  through them the paid HeroUI Pro library, which only the licensed job can install. Every user of the framework would
  have needed their own licence. The M1 lead caught it and K19 was decided 42 minutes later: the portal ships prebuilt,
  and apps import only its server half. The lead then caught a second consequence: the portal checks read server HTML,
  which a prebuilt portal doesn't make, so they moved to a headless browser.
- **Evidence:** PR 96 (closing comment), [failing run](https://github.com/AaronAbuUsama/architect/actions/runs/44546985433);
  PRs 103 and 98; session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "bundles HeroUI Pro through the portal pages".
- **Cost:** an unmerged PR of eight commits and about an hour; the portal slice moved into Goal 3. The same missing
  package had turned m1's portal job red at [09:36](https://github.com/AaronAbuUsama/architect/actions/runs/44497993469),
  six and a half hours before K19 landed.
- **Found by:** CI, then the M1 lead.
- **Recovery:** closed, decided, rebuilt later.
- **What changed:** K19 and a lint rule holding the line (PR 103).
- **Pattern:** found before building, or after.

### 2026-11-19 · Aaron reversed Goal 3's shape within minutes, before anything was built
- **Kind:** win.
- **What happened:** Goal 3 was written grid first (PR 99, merged 15:24). Aaron then said "I might change my mind": the
  journeys are the climb, and the grid is the guardrail. The conductor steelmanned and strawmanned it, and the goal was
  rewritten as PR 100 seven minutes later, with five roles, a snag log and a climbability check. Nothing had run yet.
- **Evidence:** PRs 99 and 100; session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "I might change my mind".
- **Cost:** one rewritten goal file.
- **Found by:** Aaron.
- **Recovery:** rewrite before the run.
- **What changed:** Goal 3 (PR 100).
- **Pattern:** found before building, or after.

### 2026-11-19 · Two builders each built half of one feature, and both pull requests were closed
- **Kind:** failure.
- **What happened:** Builder A (the scaffold, PR 81) and Builder B (the pre-handling runtime, PR 94) built two halves of
  K16 in parallel, with the checks on a third branch. A's scaffold promised things only B's half delivered, so #81 opened
  as "Known conflict, don't merge yet" and turned check 12 red. B's branch then conflicted with the telemetry work in 11
  files. Their types disagreed (a machine's `from` as array or tuple), needing a stopgap `CreatedId`. Everything was
  folded into #76: 49 commits, about 19 of them merges. #81 and #94 were closed "as superseded by #76".
- **Evidence:** PRs 81, 94, 76; [Codex P1 on #81](https://github.com/AaronAbuUsama/architect/pull/81#discussion_r4628778116);
  sessions `local_385907e7-5bc7-4096-a2c7-972d4627e054` ("#81 should land together with Builder B's PR"),
  `local_67fe60e6-d968-4457-a56f-91a867247c49` ("11 files"), `local_cf73abe5-dc5c-4eb8-a980-e2b715b866fa` ("I closed #81
  and #94 as superseded by #76").
- **Cost:** #76 open 5 hours 37 minutes; #81 open 2 hours 49 minutes and never merged; #94 had 20 commits; Goal 3 waited
  on it.
- **Found by:** the builders (conflict), the conductor.
- **Recovery:** one combined PR after 🔍 re-review.
- **What changed:** nothing yet. No rule says slices that share a contract go on one branch.
- **Pattern:** parallel work collides.

### 2026-11-19 · The shared totals table and the pinned file digests conflicted on nearly every merge
- **Kind:** failure.
- **What happened:** Each parallel PR recounts the check totals in `e2e/m1/README.md` by hand, so #76 was merged with m1 at
  least eight times, mostly for those rows. Check 12 pins the bytes of acme's generated files, so the telemetry work
  turned it red on m1 and needed a separate PR (89) to re-pin; it was re-pinned four times that afternoon. The same
  happened to check 14's pinned CLI file between #76 and #95.
- **Evidence:** PR 76 (merges 07ab007a to 420191e0); PR 89, opened 14:20:53 and merged 14:21:21; PR 83; commit
  [80ff3e1a](https://github.com/AaronAbuUsama/architect/commit/80ff3e1a); sessions
  `local_67fe60e6-d968-4457-a56f-91a867247c49` ("Both sides changed the totals"),
  `local_cf73abe5-dc5c-4eb8-a980-e2b715b866fa` ("Overlap: #76 and #95 both change that same CLI file").
- **Cost:** about eight merge-and-CI cycles of author time, and three baseline-only PRs or commits.
- **Found by:** CI.
- **Recovery:** resolved by hand each time.
- **What changed:** nothing yet. The totals aren't generated.
- **Pattern:** one fact, many hand-kept copies; parallel work collides.

### 2026-11-19 · Builders kept editing the checks that judge them
- **Kind:** failure.
- **What happened:** AGENTS.md says a builder never edits journeys, evals or the runner's generic checks. Codex flagged
  breaks on three builder PRs: #60 edited the acme journey, the evaluators and the runner's telemetry check; #64 rewrote
  the authored mounting checks to fit its contract; #84 weakened the runner so `prove --empty` passes with no journeys.
  On 19 November Builder B's #94 changed the grant journey, an eval fixture and prove's shared check, and relaxed
  prove.test to 13 of 17. The conductor had B revert them, and the author rewrote them. It also happened on 17 November
  (below). One time the rule held: the visibility builder stopped rather than edit a contradicting eval.
- **Evidence:** [#60](https://github.com/AaronAbuUsama/architect/pull/60#discussion_r4621151530),
  [#64](https://github.com/AaronAbuUsama/architect/pull/64#discussion_r4622105569),
  [#84](https://github.com/AaronAbuUsama/architect/pull/84#discussion_r4629510902); hand-back commits
  [6f681022](https://github.com/AaronAbuUsama/architect/commit/6f681022) and
  [0489b196](https://github.com/AaronAbuUsama/architect/commit/0489b196); session
  `local_48c36e1c-42ff-4571-b007-d83206a898d7`, the conductor's message listing the files; PR 95 body, "Blocked on the eval
  owner".
- **Cost:** three PRs merged without the independent check the rule exists for; a revert-and-rewrite round on #94.
- **Found by:** Codex, three times; the conductor once.
- **Recovery:** files handed back to the author.
- **What changed:** nothing mechanical. The triage replies say the 🔍 checklist names it.
- **Pattern:** builders edit the checks that judge them.

### 2026-11-19 · Test servers left running for hours overloaded the machine
- **Kind:** failure.
- **What happened:** The machine's load ran at about 95 to 190, mostly test runs from parallel sessions never shut down.
  Builder B's worktree held eight or nine workerd, otelcol and vitest processes started four to eight hours earlier, and
  its last full local run "exited with no output (probably killed)". The M1 lead killed processes from finished
  worktrees, including wrangler parents that kept respawning workerd. Under that load, #83 couldn't prove itself green
  locally: tests timed out in a full run and passed alone.
- **Evidence:** session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "Host load: it's been running at about 95 to 190";
  session `local_48c36e1c-42ff-4571-b007-d83206a898d7`, "I killed my 8 leftover workerd, otelcol and vitest processes";
  PR 83 status comment.
- **Cost:** unreliable local runs for every thread for hours; a cap of three builders.
- **Found by:** the conductor.
- **Recovery:** each thread killed its own; local runs only for the targeted check, CI for the rest.
- **What changed:** the cap and "stop what you start" went into briefs. Nothing in AGENTS.md or a skill's end-of-turn
  step.
- **Pattern:** shared machine and stray processes.

### 2026-11-19 · A duplicate author ran a machine-wide kill of everyone's test servers
- **Kind:** failure.
- **What happened:** The M1 lead started a second author for #76's baselines while the K16 author had already fixed them
  (93afd856). Told to stop, it reported it had run `pkill` on workerd, wrangler, otelcol and verdaccio, which "may also
  have killed" other sessions' servers. No victim was named; the lead told the check-04 builder to rerun anything that
  died. Seed correction: the lead found it, from its own duplicate's report, not Aaron.
- **Evidence:** session `local_cf73abe5-dc5c-4eb8-a980-e2b715b866fa`, "My duplicate author stopped without pushing
  anything"; session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, the Goal 3 brief's rule.
- **Cost:** a wasted author run, unknown lost test runs elsewhere.
- **Found by:** the M1 lead.
- **Recovery:** edits discarded; the rule "stop only the processes you started, by PID; never a machine-wide `pkill`".
- **What changed:** the Goal 3 brief; reviewer item 6, "process hygiene" (PR 108). Not in AGENTS.md.
- **Pattern:** shared machine and stray processes; parallel work collides.

### 2026-11-19 · Tests shared ports and folders, and broke each other
- **Kind:** failure.
- **What happened:** Four times in two days. prove.test's cleanup deleted a scratch folder shared with impact.test, so
  impact's world lost its collector mid-run ("telemetry missing"); the first fix guessed a longer wait and was reverted
  (PR 92). Two tests built and published the same `dist` in parallel, and one deleted it under the other (PR 88), a race
  Docker had hidden. Check 3's ports ran into check 8's (PR 90); the same clash had been fixed on 18 November in another
  file. The K16 author's prove tests failed on ports 8800 and 8801 from another session's run and passed alone.
- **Evidence:** PR 92, [run 44530385179](https://github.com/AaronAbuUsama/architect/actions/runs/44530385179); PR 88,
  [lock race P2](https://github.com/AaronAbuUsama/architect/pull/88#discussion_r4630034715); PR 90; session
  `local_67fe60e6-d968-4457-a56f-91a867247c49`, "ports 8800 and 8801".
- **Cost:** m1's push runs were red from 09:36 to 15:23, 5 hours 47 minutes and its longest red, mostly from these two
  races (with the portal licence, below); red runs on unrelated PRs (#74, #87, #93); a wrong first fix; reruns.
- **Found by:** CI, then the authors.
- **Recovery:** per-test scratch folders; a cross-process lock for build and publish; new ports.
- **What changed:** nothing general. `Worlds.start` binds a free port for `--port 0` (#83), but most checks still pick
  fixed ports by hand.
- **Pattern:** shared machine and stray processes.

### 2026-11-19 · Flaky end-to-end checks failed unrelated pull requests
- **Kind:** failure.
- **What happened:** Layer 1's check 4 calls the real model, and failed on two unrelated PRs (#74, #87) because the
  generated brief said to run a step without saying what to write; passing runs had guessed. PR 90 fixed the brief, not
  the check, and notes the SDK takes no temperature, so it may flake again. The mission-board designer reran the same
  check twice on a PR that touched only a spike, calling its flakiness something that "affects every PR". Load-sensitive
  failures were waved through as flakes in #117's review.
- **Evidence:** PR 90 body (runs 44517294625 and 44539524655); session `local_ef1feab2-c70f-4113-95c5-dc34668b29a5`, "The
  e2e-layer1 failure on PR #74 is flaky"; session `local_e0c1bfdc-c4aa-42b1-88b0-e896bd406dd3`, 🔍 of #117.
- **Cost:** main went red three times on this one check (6, 55 and 21 minutes:
  [08:11](https://github.com/AaronAbuUsama/architect/actions/runs/44485510757),
  [12:15](https://github.com/AaronAbuUsama/architect/actions/runs/44522219110),
  [14:24](https://github.com/AaronAbuUsama/architect/actions/runs/44543318519)); reruns; a few cents of model calls per
  run; and red that people stop believing.
- **Found by:** CI.
- **Recovery:** reruns; a better brief.
- **What changed:** nothing yet. No flake list or quarantine; the ratchet forbids listing flakes but covers only e2e-m1.
- **Pattern:** CI that can't tell us anything.

### 2026-11-19 · The mission board drew a board per building block, and Aaron said it was the wrong tool
- **Kind:** failure.
- **What happened:** The first prototype gave each of 13 building blocks its own Kanban. Aaron pushed back: a cell never
  moves across a board, so it's a coverage map, not a work board. He also said the score was "buried at the bottom" and
  there was no real details page. The designer stopped drawing and re-planned around a grid.
- **Evidence:** session `local_ef1feab2-c70f-4113-95c5-dc34668b29a5`, "You're right on both counts, so I've stopped
  drawing"; PR 74.
- **Cost:** three prototype rounds and two grill documents.
- **Found by:** Aaron.
- **Recovery:** redraw around the grid.
- **What changed:** nothing new; the memory note "ask before drawing" already existed.
- **Pattern:** showing work that wasn't checked.

### 2026-11-19 · The portal drawing was called "slop" because the paid component library wasn't used
- **Kind:** failure.
- **What happened:** Reviewing the 87-page portal drawing, Aaron said hand-made text sat where chips, tabs and a sidebar
  belong, and that the library "we paid like $500" for wasn't being used. Seed correction: the designer had rendered
  every page locally. It had not looked at the published page, nor checked screens against the library's own parts.
  The conductor's own sitrep pages had also shipped unseen twice ("I couldn't look at the rendered page myself").
- **Evidence:** session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "garbage slop" and "I couldn't look at the
  rendered page myself"; memory note `design-look-before-showing.md`.
- **Cost:** a full redraw round and Aaron's patience ("It's really annoying man").
- **Found by:** Aaron.
- **Recovery:** a component inventory before drawing, the library's own sidebar, chips, bars for rates; rendered and
  checked before sending. Aaron approved the next version.
- **What changed:** a memory note; the `portal-design` skill holds the style guide but not "look at the published page".
- **Pattern:** showing work that wasn't checked.

### 2026-11-19 · A graph prototype looked right in screenshots, but its scripts never ran
- **Kind:** near miss.
- **What happened:** The React Flow spike's screenshots were readable, but the browser console showed the island bundle
  failing, so "the earlier screenshots were showing the server render only". Reading the console found it.
- **Evidence:** session `local_3806a7f6-f543-4eb6-bcdf-000ca317032c`, "showing the server render only"; PR 87.
- **Cost:** one debugging cycle; it would have shipped a dead page.
- **Found by:** the designer.
- **Recovery:** a build-time define; the islands mount.
- **What changed:** nothing yet.
- **Pattern:** showing work that wasn't checked.

### 2026-11-19 · The portal drawing was checked against the model, and lost what nothing could supply
- **Kind:** win.
- **What happened:** Aaron asked whether the drawing was "internally consistent with our model". An audit of every
  element against the model and telemetry found things no slice provides (a request key per call, per-eval verdicts,
  rows for calls refused at the door) and a leak risk (people's names as the caller). The drawing dropped them before the
  checks author built.
- **Evidence:** session `local_3806a7f6-f543-4eb6-bcdf-000ca317032c`, "Holes with no slice"; PR 91.
- **Cost:** one audit pass.
- **Found by:** the designer, prompted by Aaron.
- **Recovery:** this is the practice.
- **What changed:** `design/portal.md` gained "What the drawing needs that the model or telemetry doesn't give yet".
- **Pattern:** found before building, or after.

### 2026-11-19 · The conductor gave a sitrep of pull requests when Aaron wanted the big picture
- **Kind:** failure.
- **What happened:** Asked to pick up after the account switch, the new conductor listed individual findings. Aaron:
  "This is very low level stuff", and asked where things stood at each layer and what the real holes were. He doubted the
  artefacts had been read first-hand; a subagent had summarised them.
- **Evidence:** session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "very low level stuff"; memory note
  `conductor-big-picture-first.md`.
- **Cost:** a rewritten sitrep; trust.
- **Found by:** Aaron.
- **Recovery:** a sitrep by layer with ten real holes, from artefacts read first-hand.
- **What changed:** a conductor memory note. The `conductor` skill's sitrep line doesn't say "by layer, holes first".
- **Pattern:** talking to Aaron.

### 2026-11-19 · The conductor told Aaron things about his own list that weren't true
- **Kind:** near miss.
- **What happened:** Aaron gave seven pre-handling items. The conductor told him things about Match, not-found and event
  fields that the K16 author then corrected: "part of what I told you earlier was wrong". Match worked, and the others
  were already refused or compile-time errors.
- **Evidence:** session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "Your pre-handling list is now assigned" and "part
  of what I told you earlier was wrong".
- **Cost:** confusion about milestone placement; slices moved to M2 and partly back (M1.46 to M1.48).
- **Found by:** the K16 author.
- **Recovery:** a corrected message to Aaron.
- **What changed:** nothing yet.
- **Pattern:** talking to Aaron.

### 2026-11-19 · The board went stale, and Aaron couldn't tell where things stood
- **Kind:** failure.
- **What happened:** Aaron asked "is the artefact gone man? Where are we man?". The conductor said "I let it go stale":
  the board showed the old M1 lead and none of the day's threads. Seeding the board's history, it had also written
  future timestamps and had to rewrite 56 documents.
- **Evidence:** session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "is the artefact gone man?" and "I let it go stale";
  memory note `kanban-thread-links.md` ("had to rewrite 56 docs").
- **Cost:** Aaron's confidence in the board; a rebuild pass; 56 documents rewritten.
- **Found by:** Aaron; the conductor for the timestamps.
- **Recovery:** the board rebuilt from merged state; every timestamp from `date -u`.
- **What changed:** memory note: starting a thread updates its task in the same turn. The `kanban` skill doesn't say so.
- **Pattern:** state lost across sessions.

### 2026-11-19 · A commit was pushed to a branch whose pull request had already merged
- **Kind:** near miss.
- **What happened:** The K16 decision PR (75) merged at 84b5d8ca. The author then pushed bc51636c to its branch, which
  would never have reached main. The conductor noticed and opened a follow-up PR.
- **Evidence:** PR 75; session `local_67fe60e6-d968-4457-a56f-91a867247c49`, "#75 had already merged at 84b5d8ca"; memory
  note `fresh-branch-after-merge.md`.
- **Cost:** one follow-up PR, and a decision nearly lost.
- **Found by:** the conductor.
- **Recovery:** follow-up PR.
- **What changed:** a memory note: check `gh pr view <n> --json state` before pushing.
- **Pattern:** parallel work collides.

### 2026-11-19 · Codex found contradictions in design pull requests before any code existed
- **Kind:** win.
- **What happened:** On design PRs, Codex found plans that contradicted themselves: a slice needing a verdict kind a later
  slice introduced (#62, fixed in two minutes); an M3 gate against K11's own rules (#61); "no secret leaves any output"
  forbidding sign-in tokens (#68, rewritten as `Blueprint.issued`); Gate M2 depending on work moved to M3 (#69). It also
  caught docs that only ran in the author's shell: the walkthrough's port 8797 against the CLI's 8787 (#80, "my run had
  it set").
- **Evidence:** [#62](https://github.com/AaronAbuUsama/architect/pull/62#discussion_r4621822926),
  [#61](https://github.com/AaronAbuUsama/architect/pull/61#discussion_r4621641802),
  [#68](https://github.com/AaronAbuUsama/architect/pull/68#discussion_r4626073563),
  [#69](https://github.com/AaronAbuUsama/architect/pull/69#discussion_r4626857855),
  [#80](https://github.com/AaronAbuUsama/architect/pull/80#discussion_r4628507617).
- **Cost:** minutes each.
- **Found by:** Codex.
- **Recovery:** fixed in the PR or parked with a reason.
- **What changed:** nothing separate. Codex on design PRs is the practice to keep.
- **Pattern:** found before building, or after.

### 2026-11-19 · A Codex staging branch had no teardown, and was kept out
- **Kind:** near miss.
- **What happened:** A research agent found Codex's staging branch deploys a Worker and D1 database with no destroy step,
  against the rule that everything made is destroyed. The conductor kept it out of the merge and told Goal 3 never to run
  it; Goal 3's staging job destroys and checks the account is empty. The record doesn't say whether the site it once
  deployed was destroyed.
- **Evidence:** PR 56 (closed unmerged); [STATE.md](https://github.com/AaronAbuUsama/architect/blob/a2d29b10/.agents/skills/kanban/STATE.md)
  ("#56's teardown"); session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "There is no teardown step".
- **Cost:** unknown cloud spend; none since.
- **Found by:** the conductor, through research agents.
- **Recovery:** branch excluded; a real staging step written into Goal 3.
- **What changed:** Goal 3 (PRs 99 and 100).
- **Pattern:** briefs that miss context.

### 2026-11-19 · A merge ran in the conductor's own worktree because a `cd` failed
- **Kind:** near miss.
- **What happened:** Fixing the kanban skill's PR, the conductor's `cd` into another worktree failed, so a merge ran in
  its own. It checked the damage before going on.
- **Evidence:** session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "The `cd` failed, so the merge ran in my own
  worktree"; PR 71.
- **Cost:** none.
- **Found by:** the conductor.
- **Recovery:** checked before proceeding.
- **What changed:** nothing yet.
- **Pattern:** shared machine and stray processes.

### 2026-11-19 · The old account's limit ran out, and threads, builds and the board were stranded
- **Kind:** failure.
- **What happened:** Aaron's previous account hit its limit. The new conductor found the M1 lead, the canon thread, the
  portal designer and the live board unreachable, and three builder worktrees holding uncommitted work (99, 23 and 28
  changed files for visibility, telemetry and confirmation depth). "Nothing in M1 is being built right now."
- **Evidence:** session `local_88d9df40-b4c5-4b47-bdf9-9b1477efb0ca`, "I can't reach the threads" and "never committed";
  PR 71; memory notes `account-switch-nov19.md`, `board-saved-in-repo.md`.
- **Cost:** about a morning; the board rebuilt as 221 documents from a snapshot; two threads restarted; Aaron
  re-explaining to a fresh conductor.
- **Found by:** the conductor.
- **Recovery:** the repo as the only truth; dirty worktrees pushed as unreviewed work; the board's page and data moved
  into the repo (the `kanban` skill, PR 71).
- **What changed:** the `kanban` skill and `STATE.md`; the memory note "work gets pushed, not left in worktrees". That
  rule isn't in AGENTS.md or the `threads` skill.
- **Pattern:** state lost across sessions.

### 2026-11-18 · Untraced log text reached the exporters, and the lead blocked the merge
- **Kind:** win.
- **What happened:** The telemetry privacy PR redacted log text only in the recorder's copy, so the exporter still got
  the original message, memo included. Codex raised it two minutes after the PR opened. The lead re-reviewed, confirmed
  it, and refused to merge until redaction happened before any logger saw the text, with a test reading the exported
  body from the collector, at 22:14.
- **Evidence:** [Codex P1](https://github.com/AaronAbuUsama/architect/pull/60#discussion_r4621151518); the lead's review
  on PR 60.
- **Cost:** 41 minutes.
- **Found by:** Codex, confirmed by the lead.
- **Recovery:** every logger wrapped in `redacting` first.
- **What changed:** the code.
- **Pattern:** found before building, or after.

### 2026-11-18 · A conductor printed a personal token in its tool output
- **Kind:** near miss.
- **What happened:** The handoff records that the HeroUI personal token "was printed in a conductor's tool output on 18
  November (never committed)". Rotating it is the first thing waiting on Aaron. "Never print a key" has been in
  AGENTS.md since 16 November.
- **Evidence:** commit [24541667](https://github.com/AaronAbuUsama/architect/commit/24541667);
  [handoff](https://github.com/AaronAbuUsama/architect/blob/a2d29b10/design/handoff.md), "What waits on Aaron", item 1.
- **Cost:** a rotation owed by Aaron; the portal-ui job depends on that secret.
- **Found by:** the conductor.
- **Recovery:** flagged; nothing committed.
- **What changed:** nothing yet.
- **Pattern:** secrets in output.

### 2026-11-18 · Docker was dropped overnight, and processes became owned by PID
- **Kind:** win, at a cost.
- **What happened:** Aaron quit Docker at about 22:35. K10 section 8 turned the Collector, registry, OIDC issuer and Anvil
  into pinned processes owned by PID, built by 07:16. The audit says the new sweep is stricter (each run has its own
  folder) but weaker (a service not started through `Owned.start` leaves no marker). Dropping Docker also exposed the
  build and publish race, and made the M1 job non-blocking (see "Sixty-three failing tests").
- **Evidence:** commits [69bb8616](https://github.com/AaronAbuUsama/architect/commit/69bb8616),
  [c7455c0f](https://github.com/AaronAbuUsama/architect/commit/c7455c0f);
  [M1-processes](https://github.com/AaronAbuUsama/architect/blob/b9283003/design/decisions/M1-processes.md), sections 2
  and 9.
- **Cost:** a one-night re-platform and the knock-on effects above.
- **Found by:** Aaron (the decision); a builder and an author (the effects).
- **Recovery:** PID markers checked against `ps`.
- **What changed:** K10, M1-processes.
- **Pattern:** shared machine and stray processes.

### 2026-11-18 · The framework was renamed a day after its first name was built in
- **Kind:** near miss.
- **What happened:** On 17 November the framework's first name shipped in its command, folders and environment variables. On 18
  November Aaron chose Orthograph. A naming map was written first and one sweep followed it, but the ledger and board
  still carry retired names (FOR-01, KIT-01) a day later.
- **Evidence:** commits [9aab18f3](https://github.com/AaronAbuUsama/architect/commit/9aab18f3),
  [db6bdee9](https://github.com/AaronAbuUsama/architect/commit/db6bdee9);
  [K6](https://github.com/AaronAbuUsama/architect/blob/a2d29b10/design/decisions/K6-orthograph.md);
  [STATE.md](https://github.com/AaronAbuUsama/architect/blob/a2d29b10/.agents/skills/kanban/STATE.md) (stale names).
- **Cost:** a rename sweep; stale names in the ledger.
- **Found by:** Aaron.
- **Recovery:** map first, then one sweep.
- **What changed:** K6 and `design/naming.md`.
- **Pattern:** decisions leave older docs stale.

### 2026-11-18 · Writing files by hand reversed a decision nobody recorded
- **Kind:** near miss.
- **What happened:** The generator audit (K12) found `ortho add` writes files directly, while the spec said scaffolding
  uses Nx generators. M1.10 needed only new files, so the shortcut went in unrecorded. The result: no `add` command for
  anything that edits an existing file, and no migrations when the API changes.
- **Evidence:** [K12](https://github.com/AaronAbuUsama/architect/blob/a2d29b10/design/decisions/K12-coverage-gaps.md),
  "That reverses an earlier decision without recording it"; PR 68.
- **Cost:** missing commands found a milestone later.
- **Found by:** the audit.
- **Recovery:** K12 moves to Nx's `Tree`.
- **What changed:** K12.
- **Pattern:** decisions leave older docs stale.

### 2026-11-18 · Aaron rejected drawings he wasn't asked about, and docs examples that were too small
- **Kind:** failure.
- **What happened:** Before the account switch, Aaron rejected portal sketches drawn before he was asked what he wanted
  ("not even asking me what we want here"), and rejected a sign-up sheet and expense claims as docs examples, choosing a
  ticketing product with whole files. The sessions are on the old account; only the memory notes and the pull request
  remain.
- **Evidence:** PR 41; memory notes `ux-ask-before-drawing.md` and `canon-examples-taste.md`.
- **Cost:** redraw and rewrite rounds.
- **Found by:** Aaron.
- **Recovery:** grill rounds before drawing; real-product examples.
- **What changed:** two memory notes; the `portal-design` skill's process.
- **Pattern:** showing work that wasn't checked.

### 2026-11-17 · Three review rounds found the same kind of bug, and the plan was reset twice
- **Kind:** failure.
- **What happened:** The first goal's stage three review found identity failures between proof and publication. The next
  head showed the fix checked identity at entry while later readers still used mutable state. A third, whole-layer review
  found four more in owners the plan had never audited (process identity, model admission, telemetry config, error-code
  uniqueness). Each time the conductor froze edits, wrote a reset record naming every owner, then resumed.
- **Evidence:** commits [6ffe898c](https://github.com/AaronAbuUsama/architect/commit/6ffe898c),
  [ee35a5ce](https://github.com/AaronAbuUsama/architect/commit/ee35a5ce);
  [D3-whole-layer-reset](https://github.com/AaronAbuUsama/architect/blob/ee35a5ce/design/decisions/D3-whole-layer-reset.md).
- **Cost:** three actionable review heads in one night; four extra work packages.
- **Found by:** 🔍 reviewer.
- **Recovery:** compare causes across heads, name every sibling owner, run read-only adversarial passes before editing.
- **What changed:** the reset records. The lesson, "audit every owner before declaring ready", is in no skill.
- **Pattern:** reviews miss runtime defects.

### 2026-11-17 · Builders widened the evaluators, and an author accepted it after the fact
- **Kind:** near miss.
- **What happened:** Three evaluator-widening commits were written in builder changes. A separate author later read the
  diff, wrote failing guards and found two real defects (valid string answers like `null` parsed as another type; a
  refusal with no `_tag` skipping code validation). The decision says the acceptance does not make the original process
  compliant.
- **Evidence:** commit [6647d76b](https://github.com/AaronAbuUsama/architect/commit/6647d76b);
  [D3-eval-author-acceptance](https://github.com/AaronAbuUsama/architect/blob/6647d76b/design/decisions/D3-eval-author-acceptance.md).
- **Cost:** an extra review and correction round.
- **Found by:** an author.
- **Recovery:** independent acceptance with new guards.
- **What changed:** the record only.
- **Pattern:** builders edit the checks that judge them.

### 2026-11-17 · A stale PID file could have made "down" kill an unrelated process
- **Kind:** near miss.
- **What happened:** The whole-layer review found `down` signalled any live process group a pidfile named, so a reused
  PID could be killed. The fails-first run showed `down` killing an unrelated sentinel. The fix derives identity from the
  environment's own state. This is a different event from the 19 November `pkill`; that one is not in git.
- **Evidence:** commit [a962de02](https://github.com/AaronAbuUsama/architect/commit/a962de02);
  [Process-ownership/01-fails-first](https://github.com/AaronAbuUsama/architect/blob/b482616f/design/evidence/Process-ownership/01-fails-first.txt).
- **Cost:** one reset work package.
- **Found by:** 🔍 reviewer.
- **Recovery:** identity from config and state, checked against `ps`.
- **What changed:** M1-processes section 2.
- **Pattern:** shared machine and stray processes.

### 2026-11-17 · Green on the Mac, red on Linux CI: seven recoveries in one night
- **Kind:** failure.
- **What happened:** Gate 2 and the logbook tests passed locally and failed on the Linux runner: Docker host addressing,
  Vitest's implicit 5-second deadline on real CLI starts and world handovers, and teardown errors on Docker-owned
  folders. Each got its own evidence folder and CI round trip. The 5-second timeouts came back on 19 November under load
  (#95).
- **Evidence:** [CI-recovery](https://github.com/AaronAbuUsama/architect/blob/d3ab3f41/design/evidence/CI-recovery/step.json),
  [World-ci-budget](https://github.com/AaronAbuUsama/architect/blob/990b3aed/design/evidence/World-ci-budget/step.json),
  [CI-model-integration-deadlines](https://github.com/AaronAbuUsama/architect/blob/ddeb67ac/design/decisions/CI-model-integration-deadlines.md);
  PR 95.
- **Cost:** at least seven fix commits, each a Linux CI round trip.
- **Found by:** CI.
- **Recovery:** explicit per-test budgets; own-storage cleanup.
- **What changed:** per-test fixes; no rule.
- **Pattern:** CI that can't tell us anything.

### 2026-11-17 · A hand-made fake of the logbook accepted what the real storage refuses
- **Kind:** failure.
- **What happened:** An integration capture failed only because the logbook's HTTP test double ignored R2's conditional
  writes, answering 200 where the real service gives 409. Rather than teach the fake, the fake layer and an in-memory
  SQL shim were deleted, and every route now runs on the real Worker, Durable Object SQLite and R2. Real concurrency then
  showed four different model bodies accepted at once.
- **Evidence:** [01-obsolete-fake-diagnostic](https://github.com/AaronAbuUsama/architect/blob/83f6f8b8/design/evidence/Real-logbook-routes/01-obsolete-fake-diagnostic.txt);
  commit [83f6f8b8](https://github.com/AaronAbuUsama/architect/commit/83f6f8b8); the rule in
  [89379555](https://github.com/AaronAbuUsama/architect/commit/89379555).
- **Cost:** a test rewrite.
- **Found by:** a builder.
- **Recovery:** real services only.
- **What changed:** enforced "local means real services, never fakes" (since 16 November).
- **Pattern:** fakes that diverge from the real service.

### 2026-11-17 · The evidence page showed unknown records as "done"
- **Kind:** failure.
- **What happened:** The evidence page marked steps done when their metadata was missing, crashed on empty records, and
  later leaked opaque organisation ids. The page meant to build trust was the thing that overclaimed.
- **Evidence:** commit [5c109284](https://github.com/AaronAbuUsama/architect/commit/5c109284),
  [01-fails-first](https://github.com/AaronAbuUsama/architect/blob/5c109284/design/evidence/Evidence-recovery/01-fails-first.txt);
  commit [b96ad36f](https://github.com/AaronAbuUsama/architect/commit/b96ad36f).
- **Cost:** a recovery step and a privacy fix.
- **Found by:** an author.
- **Recovery:** unknown records shown as "unverified"; tests for valid, raw, partial and malformed records.
- **What changed:** the page and its tests.
- **Pattern:** evidence that overclaims.
