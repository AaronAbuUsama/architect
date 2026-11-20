# Patterns

The families the log's entries fall into, most costly first. Each one gives its entries (by date and title in
`log.md`), what already covers it, and the gap that's left. A pattern with three or more entries and no fix is raised
with the conductor straight away (`README.md`, rule 6). The proposals for each gap are in `proposals.md`.

Status: **open** (no fix), **partly covered** (a rule or skill exists but entries keep arriving, or nothing enforces it),
**covered** (a check or skill change landed and nothing has hit since).

| Pattern | Entries | Failures | Status | Proposal |
|---|---|---|---|---|
| Reviews miss runtime defects | 6 | 4 | partly covered | 1 (applied) |
| Parallel work collides | 6 | 3 | partly covered | 3 (applied) |
| CI that can't tell us anything | 11 | 8 | partly covered | 4 (applied) |
| Shared machine and stray processes | 6 | 3 | partly covered | 5 (applied) |
| Merged before review and CI finished | 4 | 2 | partly covered | 2 (applied) |
| Found before building, or after | 12 | 3 | partly covered | 7 (applied) |
| Decisions leave older docs stale | 4 | 0 | partly covered | 8 (applied) |
| Builders edit the checks that judge them | 2 | 1 | partly covered | 6 (applied) |
| Talking to Aaron, and showing unchecked work | 7 | 5 | partly covered | 9 (applied) |
| One fact, many hand-kept copies | 4 | 4 | partly covered | 10 (applied) |
| Fakes that diverge from the real service | 3 | 1 | partly covered | 11 |
| State lost across sessions | 3 | 2 | partly covered | 12 (applied) |
| Rules with no check behind them | 1 | 1 | partly covered | 13 (applied) |
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

**Covers it today:** reviewer items 6 to 8 (PR 108); the practice of planting a failing check per finding; since
[PR 129](https://github.com/AaronAbuUsama/architect/pull/129), the 🔍 lists every door a call reaches the change through and runs one probe through each.

**Gap:** the probes are now written into the skill; whether a 🔍 runs them is still on trust. Watching the next build
PRs for a defect Codex finds that a door probe should have.

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

**Covers it today:** "Land on a fresh base" and "Never push to a merged branch" in the `threads` skill; the
`conductor` skill's "Parallel only when nothing is shared" and one list of decision IDs on `main` ([PR 129](https://github.com/AaronAbuUsama/architect/pull/129)).

**Gap:** nothing stops a lead starting a duplicate of a running thread. The rest is now written down, and watching.
Before it: the K16 split cost the most of any single event on 19 November (#76 open 5 hours 37 minutes with 49
commits, two closed PRs, and Goal 3 waiting).

## CI that can't tell us anything

CI that is red for known reasons, green while a job fails, flaky, cancelled, or stuck behind dead runs. Each one makes
people stop believing red, and then a real failure merges. In the 300 runs from 18 November 22:35 to 19 November 20:27,
about 182 runner-hours were spent: 90.5 in jobs that passed, 50.5 in jobs that failed, 41.1 in jobs that were cancelled.
m1's longest red lasted 5 hours 47 minutes.

Entries:
- 2026-11-19 · Codex found that a security-only review would hold the merge guard at pending (near miss)
- 2026-11-19 · Strict branch protection made a docs-only pull request run CI five times in 81 minutes (failure)
- 2026-11-19 · A lint boundary test timed out on a docs-only pull request (failure)
- 2026-11-19 · The ratchet turned "CI is red for known reasons" into a real gate (win)
- 2026-11-19 · Two stale runs from a closed pull request held runners for almost two hours (failure)
- 2026-11-19 · Over half the red runs were red on purpose, and the run list can't tell them apart (near miss)
- 2026-11-19 · Sixty-three failing tests sat behind a green run (failure)
- 2026-11-19 · Runners starved for three hours, and a backlog sweep threw away 34 runner-hours (failure)
- 2026-11-19 · The CI fix for queued runs cancelled main's push runs, and m1 still has it (failure)
- 2026-11-19 · Flaky end-to-end checks failed unrelated pull requests (failure)
- 2026-11-17 · Green on the Mac, red on Linux CI: seven recoveries in one night (failure)

**Covers it today:** the ratchet on `goal/stage-1` (PR 111); per-push concurrency groups on main (PR 102) and on `m1`
(PR 125); a timeout on every job (PRs 124 and 125); a closed PR cancels its runs (`cancel-closed` on `main` and, since
[PR 145](https://github.com/AaronAbuUsama/architect/pull/145), on `goal/stage-1`; [PR 130](https://github.com/AaronAbuUsama/architect/pull/130)); a docs-only pull request
skips the layer gates, and the flaky lint test has a 30-second timeout ([PR 160](https://github.com/AaronAbuUsama/architect/pull/160)); reviewer item 8.

**Gap:** `m1` has no ratchet, and no `cancel-closed` until `main` is merged into it. No flake list exists, so the next
flake is rerun rather than fixed or quarantined. The `check` job has no ratchet, so it merged red six times in an hour.
`strict` on `main` still reruns `check` and `e2e-m0` for every pull request each time another lands, and code pull
requests still rerun everything.

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

**Covers it today:** "Touch only your own resources" and "stop only the processes you started, by PID" (AGENTS.md);
"Leave the machine as you found it" in the `threads` skill ([PR 129](https://github.com/AaronAbuUsama/architect/pull/129)); PID markers (M1-processes); reviewer item 6;
tests and worlds on free ports and their own folders ([PR 133](https://github.com/AaronAbuUsama/architect/pull/133)).

**Gap:** `e2e/m1`'s fixed ports are on `goal/stage-1`, with the Goal 3 lead. Watching the load and the leftovers.

## Merged before review and CI finished

A PR merges while a review finding (Codex's, or a reviewer's) is still open, or while its CI is still running. Some
were real defects at merge. `main` has no branch protection, so "merge when green" merges at once.

Entries:
- 2026-11-19 · A screens pull request merged before its CI finished, because main requires no checks (near miss)
- 2026-11-19 · Codex findings sat unanswered for up to 17 hours, and a P1 merged (failure)
- 2026-11-19 · Goal 3's files merged before their checks finished (near miss)
- 2026-11-19 · The CI fix for queued runs cancelled main's push runs, and m1 still has it (failure)

**Covers it today:** branch protection on `main`, `m1` and `goal/stage-1` ([PR 130](https://github.com/AaronAbuUsama/architect/pull/130), 19 November): each branch's CI jobs
and a `codex-finished` status are required, every conversation must be resolved, and admins are bound too. Reviewer
item 7 and the conductor's merge rule still hold.

**Gap:** closed for the three protected branches; since [PR 138](https://github.com/AaronAbuUsama/architect/pull/138), `codex-finished` also needs Codex to have
reviewed the head (or only clean merges from the base since). Other `goal/*` branches are not protected yet. Watching
for a merge that gets through.

## Found before building, or after

The cheapest catches came before code: proving a journey satisfiable, Codex on a design PR, an audit of a drawing
against the model. The costliest came after: a fix built that no journey could reach, a portal built against a licence
it couldn't bundle, two checks that contradicted each other. This family is mostly wins, and the gap is making the
winning steps routine.

Entries:
- 2026-11-19 · The first journey climbed from 0 to 8 of 8 steps in four recorded runs, each run written by the tool (win)
- 2026-11-19 · A design said nothing blocked the first journey, without trying a handler, and the climb hit the block (near miss)
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

**Covers it today:** "journeys and checks come first" (AGENTS.md); the `author` skill ([PR 129](https://github.com/AaronAbuUsama/architect/pull/129)): before a builder
starts, each check fails on empty handlers, can pass, is reachable by a journey, agrees with the suite, and can't be
passed hollow.

**Gap:** the author's proofs are written; a design is not asked for the same. G5 said nothing blocked the first
journey, without writing the handlers it depended on, and the climb hit the block within minutes. A design that says a
path is clear could show one handler that walks it.

## Decisions leave older docs stale

A new decision changes something an older doc, check or board row still states.

Entries:
- 2026-11-19 · A decision narrowed an older one's range, and the conductor made one change carry every copy (win)
- 2026-11-19 · The stage 1 spec changed under a check that was already passing (near miss)
- 2026-11-18 · The framework was renamed a day after its first name was built in (near miss)
- 2026-11-18 · Writing files by hand reversed a decision nobody recorded (near miss)

**Covers it today:** AGENTS.md "Who decides": fix the other in the same change, and record the call. A `supersedes`
step in `e2e-m0` ([PR 130](https://github.com/AaronAbuUsama/architect/pull/130)) fails when a phrase listed under a decision's `## Supersedes` is still in a live doc.

**Gap:** one way to supersede is now the rule (AGENTS.md, [PR 129](https://github.com/AaronAbuUsama/architect/pull/129)): live docs are rewritten, dated records keep
their words with "Superseded by", and the decision lists each replaced phrase for the check. It holds from 19 November;
older notes stand as written. Watching the first decisions that use it.

## Builders edit the checks that judge them

A builder changes a journey, an eval or a shared check, usually to make its own work pass.

Entries:
- 2026-11-19 · Builders kept editing the checks that judge them (failure)
- 2026-11-17 · Builders widened the evaluators, and an author accepted it after the fact (near miss)

**Covers it today:** AGENTS.md: "A builder never edits journeys, the evals or the runner's generic checks." The
`builder-paths` job ([PR 130](https://github.com/AaronAbuUsama/architect/pull/130)) fails a `-build` branch that touches them; required on `main`, and
on `goal/stage-1` since `main` was merged into it ([PR 145](https://github.com/AaronAbuUsama/architect/pull/145), 19 November 23:58).

**Gap:** the guard reaches only branches named `-build`, and `m1` doesn't run it until `main` is merged into it. Before the guard: five events in three days, all caught after the fact, three of them merged. Watching.

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

**Covers it today:** "Talking to Aaron" in the `threads` skill, now with plain words before IDs, real screens from a
designer thread, and "Render and look before you show" ([PR 129](https://github.com/AaronAbuUsama/architect/pull/129)); the `portal-design` skill's process; the
conductor's memory notes.

**Gap:** "big picture first" (sitreps by layer) and "check a claim against the code before telling Aaron" are still
only in the conductor's memory notes.

## One fact, many hand-kept copies

AGENTS.md says every fact has one owner. Where a fact is copied by hand (line-numbered code quotes, check totals, pinned
digests, a rule restated in a second package), every change breaks the copies.

Entries:
- 2026-11-19 · A design grill quoted a refusal's code from a stale doc, not from the code (failure)
- 2026-11-19 · Code quoted by line number in the docs broke on almost every change (failure)
- 2026-11-19 · The fix that hid secrets from journeys hid public values too (failure)
- 2026-11-19 · The shared totals table and the pinned file digests conflicted on nearly every merge (failure)

**Covers it today:** [PR 134](https://github.com/AaronAbuUsama/architect/pull/134): canon quotes code by name with `--fix`; `e2e:totals` generates the totals; a check
compares `design/portal.md`'s refusal codes with the generated tables. The `portal-design` skill quotes generated facts
only from the generated files ([PR 129](https://github.com/AaronAbuUsama/architect/pull/129)).

**Gap:** pins are still moved by hand; `e2e/m1`'s totals markers are on `goal/stage-1`, with the Goal 3 lead; the
rule restated in a second package (HAN-12) is with its owner.

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

**Covers it today:** the `kanban` skill keeps the board in the repo (PR 71); "Push before you end a turn" in the
`threads` skill ([PR 129](https://github.com/AaronAbuUsama/architect/pull/129)).

**Gap:** the rule is written; watching for work that lives only in a worktree.

## Rules with no check behind them

AGENTS.md says its code rules are enforced "as soon as they exist". Four aren't: no `async`, `await`, `try` or `throw`;
files under about 250 lines; six slots per module; builders don't edit checks.

Entries:
- 2026-11-19 · The "no async, no throw" rule broke three times in one pull request, and only Codex noticed (failure)

**Covers it today:** lint rules for effect-only, max-lines and six-slots, each from a baseline that only shrinks
([PR 132](https://github.com/AaronAbuUsama/architect/pull/132), `design/decisions/P1-code-rules.md`); the builder path guard ([PR 130](https://github.com/AaronAbuUsama/architect/pull/130)).

**Gap:** the baselines hold today's breaches until they are paid down.

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
