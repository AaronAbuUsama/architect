# Patterns

The families the log's entries fall into, most costly first. Each one gives its entries (by date and title in
`log.md`), what already covers it, and the gap that's left. A pattern with three or more entries and no fix is raised
with the conductor straight away (`README.md`, rule 6). The proposals for each gap are in `proposals.md`.

Status: **open** (no fix), **partly covered** (a rule or skill exists but entries keep arriving, or nothing enforces it),
**covered** (a check or skill change landed and nothing has hit since).

| Pattern | Entries | Failures | Status | Proposal |
|---|---|---|---|---|
| Reviews miss runtime defects | 6 | 4 | partly covered | 1 |
| Parallel work collides | 6 | 3 | open | 3 |
| CI that can't tell us anything | 8 | 6 | partly covered | 4 |
| Shared machine and stray processes | 6 | 3 | partly covered | 5 |
| Findings merged unanswered | 3 | 2 | partly covered | 2 |
| Found before building, or after | 10 | 3 | the wins to keep; gap open | 7 |
| Decisions leave older docs stale | 4 | 0 | partly covered | 8 |
| Builders edit the checks that judge them | 2 | 1 | open | 6 |
| Talking to Aaron, and showing unchecked work | 7 | 5 | partly covered | 9 |
| One fact, many hand-kept copies | 3 | 3 | open | 10 |
| Fakes that diverge from the real service | 3 | 1 | partly covered | 11 |
| State lost across sessions | 3 | 2 | partly covered | 12 |
| Rules with no check behind them | 1 | 1 | open | 13 |
| Briefs that miss context | 2 | 0 | open, small | none yet |
| Secrets in output | 1 | 0 | open, small | none yet |
| Evidence that overclaims | 1 | 1 | covered | none |

---

## Reviews miss runtime defects

Our own 🔍 reviewer reads the diff and its tests, and passes code that breaks when it actually runs, most often on a
second door (the device path beside the server path), a wrapper, or a replay. Codex, or a review run from Aaron's side,
then finds it. On 19 November this cost Goal 3 about three hours, and the checklist written that afternoon did not stop
the next one.

Entries:
- 2026-11-19 · The unique-field build passed its checks, but real handlers had no `findBy` (near miss)
- 2026-11-19 · The visibility rule passed review with the new checklist, and Codex still found five more gaps (failure)
- 2026-11-19 · The fix that hid secrets from journeys hid public values too (failure)
- 2026-11-19 · The day's review misses became a reviewer checklist (win)
- 2026-11-19 · Our own 🔍 passed two pull requests holding twelve real defects (failure)
- 2026-11-17 · Three review rounds found the same kind of bug, and the plan was reset twice (failure)

**Covers it today:** reviewer items 6 to 8 (PR 108); the practice of planting a failing check per finding.

**Gap:** the checklist is something to read, not something to run. On #95 the 🔍 passed "with items 6 to 8", and
Codex found five defects in exactly the areas item 6 names. The 🔍 doesn't have to exercise a second door, and nothing
asks it to list the doors a change touches. The build PR for unique fields (120) had no recorded 🔍 at all.

## Parallel work collides

Two pieces of work that depend on each other run as if they didn't: two builders build halves of one contract, two
threads pick the same decision ID, a goal starts on a branch that's still moving, a commit goes to a branch whose PR
already merged.

Entries:
- 2026-11-19 · Two different decisions were both named G3 (near miss)
- 2026-11-19 · Goal 3 started before m1 settled, and m1 had to be merged in by hand twice (near miss)
- 2026-11-19 · Two builders each built half of one feature, and both pull requests were closed (failure)
- 2026-11-19 · The shared totals table and the pinned file digests conflicted on nearly every merge (failure)
- 2026-11-19 · A duplicate author ran a machine-wide kill of everyone's test servers (failure)
- 2026-11-19 · A commit was pushed to a branch whose pull request had already merged (near miss)

**Covers it today:** "Land on a fresh base" in the `threads` skill; a memory note to check a PR's state before pushing.

**Gap:** nothing in the `conductor` skill says how to cut slices so that two builders never share a contract, nothing
allocates decision IDs, and nothing stops a lead starting a duplicate of a running thread. The K16 split cost the most
of any single event on 19 November: #76 open 5 hours 37 minutes with 49 commits, two closed PRs, and Goal 3 waiting.

## CI that can't tell us anything

CI that is red for known reasons, green while a job fails, flaky, cancelled, or stuck behind dead runs. Each one makes
people stop believing red, and then a real failure merges. In the 300 runs from 18 November 22:35 to 19 November 20:27,
about 182 runner-hours were spent: 90.5 in jobs that passed, 50.5 in jobs that failed, 41.1 in jobs that were cancelled.
m1's longest red lasted 5 hours 47 minutes.

Entries:
- 2026-11-19 · The ratchet turned "CI is red for known reasons" into a real gate (win)
- 2026-11-19 · Two stale runs from a closed pull request held runners for almost two hours (failure)
- 2026-11-19 · Over half the red runs were red on purpose, and the run list can't tell them apart (near miss)
- 2026-11-19 · Sixty-three failing tests sat behind a green run (failure)
- 2026-11-19 · Runners starved for three hours, and a backlog sweep threw away 34 runner-hours (failure)
- 2026-11-19 · The CI fix for queued runs cancelled main's push runs, and m1 still has it (failure)
- 2026-11-19 · Flaky end-to-end checks failed unrelated pull requests (failure)
- 2026-11-17 · Green on the Mac, red on Linux CI: seven recoveries in one night (failure)

**Covers it today:** the ratchet on `goal/stage-1` (PR 111); per-push concurrency groups on main (PR 102); reviewer
item 8.

**Gap:** `m1` has neither the ratchet nor PR 102's fix (PR 125, open, brings the fix and timeouts; `main` got
timeouts in PR 124). Closing a PR leaves its runs going. No flake list exists, so a flake is rerun rather than fixed or quarantined. The `check` job has no ratchet, so it
merged red six times in an hour.

## Shared machine and stray processes

Every local thread shares one Mac: its ports, its CPU, its process table and its folders. One thread's leftovers or
cleanup break another's run.

Entries:
- 2026-11-19 · Test servers left running for hours overloaded the machine (failure)
- 2026-11-19 · A duplicate author ran a machine-wide kill of everyone's test servers (failure)
- 2026-11-19 · Tests shared ports and folders, and broke each other (failure)
- 2026-11-19 · A merge ran in the conductor's own worktree because a `cd` failed (near miss)
- 2026-11-18 · Docker was dropped overnight, and processes became owned by PID (win)
- 2026-11-17 · A stale PID file could have made "down" kill an unrelated process (near miss)

**Covers it today:** "Touch only your own resources" (AGENTS.md); PID markers (M1-processes); the Goal 3 brief's "stop
only what you started, by PID"; reviewer item 6, "process hygiene".

**Gap:** the by-PID rule is in one brief and a review checklist, not in AGENTS.md or the `threads` skill, so a thread
started without that brief doesn't have it. No thread is told to list and stop its own processes before it reports.
Most checks still pick fixed ports by hand, and the same port clash came back a day after it was fixed.

## Findings merged unanswered

A review finding (Codex's, or a reviewer's) is still open when the PR merges. Some were real defects at merge.

Entries:
- 2026-11-19 · Codex findings sat unanswered for up to 17 hours, and a P1 merged (failure)
- 2026-11-19 · Goal 3's files merged before their checks finished (near miss)
- 2026-11-19 · The CI fix for queued runs cancelled main's push runs, and m1 still has it (failure)

**Covers it today:** reviewer item 7, "No finding is left unanswered"; the conductor's merge rule (CI green, Codex
finished, every thread resolved).

**Gap:** both are things an agent remembers. GitHub can enforce it: "Require conversation resolution before merging" on
`main`, `m1` and `goal/*`.

## Found before building, or after

The cheapest catches came before code: proving a journey satisfiable, Codex on a design PR, an audit of a drawing
against the model. The costliest came after: a fix built that no journey could reach, a portal built against a licence
it couldn't bundle, two checks that contradicted each other. This family is mostly wins, and the gap is making the
winning steps routine.

Entries:
- 2026-11-19 · A fix was built before anyone checked a journey could reach it (failure)
- 2026-11-19 · Proving each journey possible found the "is this name taken?" gap before the climb (win)
- 2026-11-19 · Reviewing the combined scaffold build, findings went in as failing checks first (win)
- 2026-11-19 · Two checks written at different times contradicted each other (failure)
- 2026-11-19 · A design decision routed device operations over HTTP, and Codex caught it before any code (near miss)
- 2026-11-19 · The portal viewer was built against a licence its Worker can't bundle (failure)
- 2026-11-19 · Aaron reversed Goal 3's shape within minutes, before anything was built (win)
- 2026-11-19 · The portal drawing was checked against the model, and lost what nothing could supply (win)
- 2026-11-19 · Codex found contradictions in design pull requests before any code existed (win)
- 2026-11-18 · Untraced log text reached the exporters, and the lead blocked the merge (win)

**Covers it today:** "journeys and checks come first" (AGENTS.md); Goal 3's journey author proving satisfiability.

**Gap:** the satisfiability proof was one author's good habit, not a written step. A checks author isn't asked to show
that each new refusal or state is reachable by a journey, nor to run the whole suite against a new check to find
contradictions, before a builder gets it.

## Decisions leave older docs stale

A new decision changes something an older doc, check or board row still states.

Entries:
- 2026-11-19 · A decision narrowed an older one's range, and the conductor made one change carry every copy (win)
- 2026-11-19 · The stage 1 spec changed under a check that was already passing (near miss)
- 2026-11-18 · The framework was renamed a day after its first name was built in (near miss)
- 2026-11-18 · Writing files by hand reversed a decision nobody recorded (near miss)

**Covers it today:** AGENTS.md "Who decides": fix the other in the same change, and record the call.

**Gap:** the rule held this time because the conductor read the decision. Nothing checks it, and the repo has two ways
to supersede (amend in place, as G3 did to K16; keep the old words as a dated record, as ST1-02 did), so a reader can't
tell which text is live.

## Builders edit the checks that judge them

A builder changes a journey, an eval or a shared check, usually to make its own work pass.

Entries:
- 2026-11-19 · Builders kept editing the checks that judge them (failure)
- 2026-11-17 · Builders widened the evaluators, and an author accepted it after the fact (near miss)

**Covers it today:** AGENTS.md: "A builder never edits journeys, the evals or the runner's generic checks."

**Gap:** five events in three days, all caught by Codex or the conductor after the fact, three of them merged. No path
guard exists. **Raised with the conductor on 19 November** (three or more with no fix).

## Talking to Aaron, and showing unchecked work

Aaron listens rather than reads, and judges the thing he is shown. Labels he doesn't know, a sitrep at the wrong height,
or a drawing nobody looked at cost his trust more than any defect.

Entries:
- 2026-11-19 · The conductor reported to Aaron in internal labels, and he couldn't follow (failure)
- 2026-11-19 · The mission board drew a board per building block, and Aaron said it was the wrong tool (failure)
- 2026-11-19 · The portal drawing was called "slop" because the paid component library wasn't used (failure)
- 2026-11-19 · A graph prototype looked right in screenshots, but its scripts never ran (near miss)
- 2026-11-19 · The conductor gave a sitrep of pull requests when Aaron wanted the big picture (failure)
- 2026-11-19 · The conductor told Aaron things about his own list that weren't true (near miss)
- 2026-11-18 · Aaron rejected drawings he wasn't asked about, and docs examples that were too small (failure)

**Covers it today:** "Talking to Aaron" in the `threads` skill; the `portal-design` skill's process; five conductor
memory notes.

**Gap:** the lessons live in memory notes on Aaron's Mac that only the conductor reads. A designer or lead started
fresh, or any other project, gets none of them: plain words with IDs only in brackets, sitreps by layer, look at the
published page and the console, check a claim against the code before telling Aaron.

## One fact, many hand-kept copies

AGENTS.md says every fact has one owner. Where a fact is copied by hand (line-numbered code quotes, check totals, pinned
digests, a rule restated in a second package), every change breaks the copies.

Entries:
- 2026-11-19 · Code quoted by line number in the docs broke on almost every change (failure)
- 2026-11-19 · The fix that hid secrets from journeys hid public values too (failure)
- 2026-11-19 · The shared totals table and the pinned file digests conflicted on nearly every merge (failure)

**Covers it today:** nothing.

**Gap:** quotes should anchor on a name, totals should be generated, and a pin should be moved by its owner in one
place.

## Fakes that diverge from the real service

A stand-in (a test double, an in-memory store, a copied rule, an author's shell) accepts what the real thing refuses.

Entries:
- 2026-11-19 · The in-memory store accepts a change the real database refuses (near miss)
- 2026-11-19 · A 🔍 found that the unique-field checks could be passed without the real index (win)
- 2026-11-17 · A hand-made fake of the logbook accepted what the real storage refuses (failure)

**Covers it today:** "local means real services, never fakes" (G1).

**Gap:** the in-memory store is part of the framework, so it can't simply be deleted like the logbook fake. Nothing runs
the same records tests against both stores.

## State lost across sessions

Work or knowledge that lived in one session, one worktree or one artefact, and was lost or went stale when that
session ended.

Entries:
- 2026-11-19 · The snag log lives only on a branch nobody has pushed (near miss)
- 2026-11-19 · The board went stale, and Aaron couldn't tell where things stood (failure)
- 2026-11-19 · The old account's limit ran out, and threads, builds and the board were stranded (failure)

**Covers it today:** the `kanban` skill keeps the board in the repo (PR 71); a memory note, "work gets pushed".

**Gap:** "push your work before you end a turn" is in no skill, and the snag log shows it still happening hours later.

## Rules with no check behind them

AGENTS.md says its code rules are enforced "as soon as they exist". Four aren't: no `async`, `await`, `try` or `throw`;
files under about 250 lines; six slots per module; builders don't edit checks.

Entries:
- 2026-11-19 · The "no async, no throw" rule broke three times in one pull request, and only Codex noticed (failure)

**Gap:** lint rules (and the path guard above).

## Briefs that miss context

Entries:
- 2026-11-19 · The lead's plan left out the snags blocking the climb until the conductor pointed at them (near miss)
- 2026-11-19 · A Codex staging branch had no teardown, and was kept out (near miss)

**Gap:** small so far; watching.

## Secrets in output

Entries:
- 2026-11-18 · A conductor printed a personal token in its tool output (near miss)

**Gap:** small so far. The token is still waiting on Aaron to rotate it.

## Evidence that overclaims

Entries:
- 2026-11-17 · The evidence page showed unknown records as "done" (failure)

**Covered** by the page's own tests since 17 November.
