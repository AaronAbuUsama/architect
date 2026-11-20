# Proposals

One change for each pattern with a gap, ranked by how often the pattern hit and what it cost (`patterns.md`). Each says
what it fixes, shows the change as a diff or a new file, and says who applies it. The Scribe proposes and never applies a
skill change: the conductor, or the thread that owns the skill, does.

| Rank | Proposal | Pattern | Kind | Size |
|---|---|---|---|---|
| 1 | The 🔍 names every door and runs one probe through each | Reviews miss runtime defects | skill change | small |
| 2 | GitHub refuses a merge with an open review thread; Codex is a merge gate | Merged before review and CI finished | check, workflow step | small |
| 3 | Cut slices so two builders never share a contract; one allocator for decision IDs | Parallel work collides | skill change | small |
| 4 | Every job gets a timeout, a closed PR cancels its runs, m1 takes the push-group fix | CI that can't tell us anything | check | small |
| 5 | "Stop what you started, by PID" moves into AGENTS.md, with an end-of-turn step | Shared machine and stray processes | rule, skill change | small |
| 6 | A path guard fails a builder PR that touches journeys, evals or checks | Builders edit the checks that judge them | check | medium |
| 7 | An `author` skill: prove each new check reachable, satisfiable and consistent first | Found before building, or after | new skill | medium |
| 8 | One way to supersede, and a check that superseded phrases are gone | Decisions leave older docs stale | check, skill change | medium |
| 9 | Aaron's lessons move from memory notes into the skills | Talking to Aaron, and showing unchecked work | skill change | small |
| 10 | Quote code by name, generate the totals | One fact, many hand-kept copies | check | medium |
| 11 | One records suite runs against both stores | Fakes that diverge from the real service | check | medium |
| 12 | Push before you end a turn | State lost across sessions | skill change | small |
| 13 | Lint rules for the four unenforced code rules | Rules with no check behind them | check | medium |
| 14 | Plant a wrong output for every way a check reads, pass it through a hostile reviewer, and fix families, not instances | Checks a wrong output can pass | skill change | small |
| 15 | Applied means it reached the branches where the work runs | Fixes that don't reach the working branch | skill change | small |

---

## 1. The 🔍 names every door and runs one probe through each

**Fixes:** six entries. Our own 🔍 passed #76 and #95 (twelve real defects, about three hours of Goal 3's start), passed
#95 again "with items 6 to 8" before Codex found five more, and nobody reviewed the unique-field build that shipped
without `findBy` on the handler path. Item 6 is a list to read. Every miss was on a second door: the device path beside
the server path, a wrapper beside the object it wraps, a replay beside a first answer.

**Change:** `.agents/skills/reviewer/SKILL.md`.

```diff
 6. **It holds at runtime, not only in its own tests.** Read the code paths, not just the diff's tests, and try each of
    these where the change touches it. They are the defects reviews missed on 19 November 2026:
+   - **First, list the doors.** Write down every way a call reaches the changed code: HTTP, the device path, the SDK,
+     the CLI, MCP, a replay from the idempotency cache, and every wrapper the handler's dependencies pass through (the
+     logging wrapper over `Records`, for one). Then run one probe through each door, a journey, a test or a script,
+     and name it in your verdict. A door you didn't run is a finding, not a pass.
    - **the device path as well as the server path:** a rule added for HTTP must also hold for device operations;
+   - **wrappers forward everything:** a wrapper or proxy over a service passes every method through, with no type
+     assertion hiding one it dropped;
...
 Answer with a verdict on the first line, **pass** or **block**, then numbered findings.
+Under the verdict, list the doors and the probe you ran through each.
```

And one line in `.agents/skills/threads/SKILL.md`'s rules, so a build PR always gets a 🔍:

```diff
 - **A layer into `main` needs a 🔍 pass** as well as CI and its gate.
+- **Every build pull request needs a 🔍 pass,** not only layers and milestones. A builder's PR into a check branch is
+  where the runtime defects merge (the unique-field build on 19 November had none).
```

**Applies it:** the conductor, in the reviewer and threads skills.
**Applied, 19 November:** [PR 129](https://github.com/AaronAbuUsama/architect/pull/129), by the process-skills thread.

## 2. GitHub refuses a merge with an open review thread; Codex is a merge gate

**Fixes:** four entries. Codex findings sat up to 17 hours unanswered, a P1 (a dropped payment shown as confirmed) and
#97's concurrency flaw merged with their findings open, and Goal 3's files and then the G5 screens (PR 127) merged
before their checks finished. "Merge when green" merges at once when nothing is required. Item 7 and the conductor's
merge rule say the right thing; nothing enforces them.

**Change:** a repository setting, branch protection on `main`, `m1` and `goal/**`:

```bash
# main's jobs are check, e2e-layer1, e2e-layer2 and e2e-m0; m1 and goal/** add e2e-m1 and portal-ui.
gh api -X PUT repos/AaronAbuUsama/architect/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["check", "e2e-layer1", "e2e-layer2", "e2e-m0"] },
  "required_conversation_resolution": true,
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
JSON
```

And the conductor skill's landing list:

```diff
 ## Landing a layer into main

-All four must hold:
+All five must hold:
 1. **No conflicts:** the pull request merges cleanly.
 2. **A fresh CI run:** green on a head that includes the current `main`.
 3. **The layer's gate passes:** its one e2e suite, on a clean checkout.
 4. **A 🔍 pass.** ...
+5. **Codex has finished, and every review thread is resolved:** fixed with a check, or answered with the ledger entry
+   or decision that takes it. Branch protection refuses the merge while a thread is open.
```

**Applies it:** the conductor. Branch protection changes how Aaron's own merges behave, so tell him in the next report.
**Applied, 19 November:** [PR 130](https://github.com/AaronAbuUsama/architect/pull/130) by the ci-guards thread (`design/decisions/CI-branch-protection.md`), on `main`, `m1` and `goal/stage-1`, with a `codex-finished` status as the Codex gate. One change from the diff above: `enforce_admins` is on, because every agent merges through Aaron's admin account and with it off the protection binds no one.

## 3. Cut slices so two builders never share a contract; one allocator for decision IDs

**Fixes:** six entries, and the single most costly event of 19 November: K16 split across two builders, two closed
PRs, #76 open 5 hours 37 minutes with 49 commits. Also two decisions both named G3 (caught by the checks author, by luck), a duplicate author started beside a
running one, and a commit pushed to an already-merged branch.

**Change:** `.agents/skills/conductor/SKILL.md`, under "Starting a thread" (the same text goes into goal files for
leads):

```diff
 1. **Pick its type,** and check the step's `needs` are done on `main` (`design/build-plan.md`). Start every thread whose needs are met at once, so independent work runs in parallel.
+   **Parallel only when nothing is shared.** Two slices run in parallel only when neither changes a type, a generated
+   file or a header the other reads. If one slice's output promises what another delivers (the K16 scaffold promising
+   M1.46's pre-handling), they are one branch, built in order. Before starting a thread, check the thread list for one
+   already doing the job; never start a second.
+   **Decision IDs come from one place.** The lead of a goal (or the conductor, on `main`) hands out decision IDs. A
+   thread asks for one before it writes the file, and the lead adds the ID with a one-line title to
+   `design/decisions.md` on the goal branch at once, so two branches can't take the same number.
```

And `.agents/skills/threads/SKILL.md`, rules every type keeps:

```diff
+- **Never push to a merged branch.** Before pushing, check the pull request is still open
+  (`gh pr view <n> --json state`). Once it has merged, cut a fresh branch from the target.
```

**Applies it:** the conductor.
**Applied, 19 November:** [PR 129](https://github.com/AaronAbuUsama/architect/pull/129): parallel slices only when nothing is shared, and decision IDs from one list on `main`.

## 4. Every job gets a timeout, a closed PR cancels its runs, m1 takes the push-group fix

**Fixes:** eight entries. #96's closed runs held four jobs for about two hours (9.3 runner-hours). A backlog sweep threw
away 34 runner-hours. Main lost four merge runs to #97. 41 of the day's 182 runner-hours ended cancelled.

**Change:** `.github/workflows/ci.yml` on `m1` and `goal/stage-1` (main's four jobs already have timeouts), every
job:

```diff
 jobs:
   check:
     runs-on: ubuntu-latest
+    timeout-minutes: 40
 ...
   e2e-layer1:
+    timeout-minutes: 45
 ...
   e2e-m1:
+    timeout-minutes: 60
```

A new workflow, `.github/workflows/cancel-closed.yml`:

```yaml
name: cancel-closed
on:
  pull_request:
    types: [closed]
permissions:
  actions: write
jobs:
  cancel:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - env:
          GH_TOKEN: ${{ github.token }}
          BRANCH: ${{ github.event.pull_request.head.ref }}
        run: |
          gh run list -R "$GITHUB_REPOSITORY" --branch "$BRANCH" --event pull_request \
            --json databaseId,status -q '.[] | select(.status != "completed") | .databaseId' \
          | xargs -r -n1 gh run cancel -R "$GITHUB_REPOSITORY"
```

And merge `main` into `m1` (or cherry-pick 352f316a), so m1's pushes stop cancelling each other.

**Applies it:** the conductor. **Partly applied, 19 November:** timeouts on `main` ([PR 124](https://github.com/AaronAbuUsama/architect/pull/124)); timeouts and
per-push groups on `m1` ([PR 125](https://github.com/AaronAbuUsama/architect/pull/125), merged 21:05). **Applied, 19 November:** the closed-PR workflow, `cancel-closed`, in [PR 130](https://github.com/AaronAbuUsama/architect/pull/130). Merging `main` into `m1` is still to do. `goal/stage-1` has it since [PR 145](https://github.com/AaronAbuUsama/architect/pull/145).

## 5. "Stop what you started, by PID" moves into AGENTS.md, with an end-of-turn step

**Fixes:** six entries. A machine-wide `pkill` from a duplicate author; load of 95 to 190 from leftovers four to eight
hours old; tests clashing on fixed ports and shared folders, breaking m1 for most of its 5-hour-47-minute red. The rule
lives in one goal brief and a review checklist; a thread started without that brief has never seen it.

**Change:** `AGENTS.md`, standing rules:

```diff
 - Every world, stage and site you make is destroyed; nothing is left running. Touch only your own resources.
+- On the shared Mac, stop only the processes you started, by PID, and never run a machine-wide `pkill` or `killall`.
+  Before you report, list what still runs from your worktree (`pgrep -fl "$(pwd)"`) and stop it. A test picks a free
+  port (`--port 0`) and its own scratch folder; it never assumes a fixed port or deletes a folder it shares.
```

And `.agents/skills/threads/SKILL.md`, rules every type keeps:

```diff
+- **Leave the machine as you found it.** Before each report, stop every process your thread started, by PID.
```

**Applies it:** the conductor (AGENTS.md and the threads skill). Fixed ports in existing checks are a separate builder
slice: grep for literal ports in `e2e/` and `packages/*/test`.
**Applied, 19 November:** the rule in [PR 129](https://github.com/AaronAbuUsama/architect/pull/129); the test half (free ports, own folders) in [PR 133](https://github.com/AaronAbuUsama/architect/pull/133). `e2e/m1`'s fixed ports are on `goal/stage-1`, with the Goal 3 lead.

## 6. A path guard fails a builder PR that touches journeys, evals or checks

**Fixes:** five events in three days (#60, #64, #84, #94, and the 17 November evaluator widening). Three merged before
anyone noticed. Raised with the conductor on 19 November.

**Change:** Goal 3 already names branches by role (`goal-3/<x>-check` for authors, `goal-3/<x>-build` for builders). Make
that the rule everywhere, and add a CI step that reads it. In `.github/workflows/ci.yml`, a job:

```yaml
  builder-paths:
    if: github.event_name == 'pull_request' && endsWith(github.head_ref, '-build')
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v7.0.1
        with:
          fetch-depth: 0
      - name: A builder never edits journeys, evals or the runner's checks (AGENTS.md)
        run: |
          base="origin/${{ github.base_ref }}"
          hits=$(git diff --name-only "$base"...HEAD -- \
            'e2e/**' '**/journeys/**' 'packages/prove/src/modules/evals/**' \
            'packages/prove/src/modules/*/checks*.ts' 'e2e/m1/expected-failing.txt')
          if [ -n "$hits" ]; then echo "$hits"; exit 1; fi
```

And `AGENTS.md`, "How work flows":

```diff
-- **Journeys and checks come first.** A different agent from the builder writes an operation's journeys and checks,
-  and they fail on empty handlers before the builder starts. A builder never edits journeys, the evals or the runner's
-  generic checks.
+- **Journeys and checks come first.** A different agent from the builder writes an operation's journeys and checks,
+  and they fail on empty handlers before the builder starts. A builder never edits journeys, the evals or the runner's
+  generic checks. Authors' branches end in `-check` and builders' in `-build`; CI fails a `-build` pull request that
+  touches those paths. A builder that needs a check changed stops and asks its author.
```

**Applies it:** the conductor, with the checks author owning the exact path list.
**Applied, 19 November:** the `builder-paths` job in [PR 130](https://github.com/AaronAbuUsama/architect/pull/130), for branches ending in `-build`. Required on `main`; it reaches `m1` and `goal/stage-1` when `main` is next merged into them. **Update, 20 November:** `goal/stage-1` runs and requires it since [PR 145](https://github.com/AaronAbuUsama/architect/pull/145); `m1` not yet.

## 7. An `author` skill: prove each new check reachable, satisfiable and consistent first

**Fixes:** the costliest "after" failures (a fix built that no journey could reach, PRs 113 and 114; two checks that
contradicted each other, 22.6 and 19), and it makes the day's best wins routine: the journey author's satisfiability
proof, which found the "is this name taken?" gap before the climb, and planting a failing check per review finding.

**Change:** a new skill, `.agents/skills/author/SKILL.md`:

```md
---
name: author
description: ✍️ Writing journeys and checks before any build, for one step or one review finding. Use it when your brief
  names you an author, a journey author or a checks author.
---

You write what judges the builder. You never write the handlers or the framework code that makes your checks pass.

Before you hand a check to a builder, show all five, and paste the runs in your pull request:
1. **It fails on empty handlers,** with the step, the expected and the actual named.
2. **It can pass.** Write a throwaway implementation that passes it, using only what a handler can reach (no
   `Store.list`, no back door). Where you can't, that's a snag: log it before anyone builds.
3. **Every new refusal, state and event is reachable by a journey** in today's worlds. If a world can't produce it
   (a chain that won't hold a block, a clock you can't move), log the snag and don't hand it over.
4. **It agrees with every check already there.** Run the whole suite with your check in; a check that contradicts a
   passing one is yours to fix.
5. **It can't be passed hollow.** Name the cheapest wrong implementation that would pass (an app-level lookup instead
   of the generated index) and make the check refuse it.

A review finding becomes one planted check that fails first, then the builder's fix, then a fresh 🔍.
```

And a row in the threads skill's table points ✍️ Author at it.

**Applies it:** the conductor, with the Goal 3 lead reading it against how its journey and checks authors work today.
**Applied, 19 November:** the `author` skill, [PR 129](https://github.com/AaronAbuUsama/architect/pull/129).

## 8. One way to supersede, and a check that superseded phrases are gone

**Fixes:** four entries. G3 narrowed K16 and was caught only because the conductor read it; ST1-02 kept the old words as
a dated record while G3 amended K16 in place, so readers can't tell which convention is live; the rename and the K12
reversal left stale words for a day or more.

**Change:** one convention in `AGENTS.md`, "Who decides":

```diff
 - When code and design disagree, or two design files disagree, decide which is right, fix the other in the same
   change, and record the call in `design/decisions/` with the evidence.
+  The older doc is amended in place, with "Amended by <id>, <date>" beside the changed words; the new decision keeps
+  the old words under "Supersedes", each as a phrase to search for.
```

A decision's "Supersedes" block, for example in G3:

```md
## Supersedes
- K16: "5 to 125" → "5 to 119"
```

And a check, `tools/design/supersedes.mjs`, run in the `check` job: for each decision's "Supersedes" phrases, `git grep`
must find each old phrase only inside `design/decisions/` dated records and `design/process/`. This turns the
conductor's one-off `git grep "5 to 125"` gate into a standing one.

**Applies it:** the conductor (AGENTS.md), a builder for the script.
**Partly applied, 19 November:** the check, `tools/ci/supersedes.sh` as a step in `e2e-m0`, in [PR 130](https://github.com/AaronAbuUsama/architect/pull/130). The rule in AGENTS.md is with the process-skills thread; until a decision carries a `## Supersedes` list, the check has nothing to read.
**Applied, 19 November:** the rule in AGENTS.md, [PR 129](https://github.com/AaronAbuUsama/architect/pull/129), changed so dated records keep their words beside a "Superseded by" pointer (`design/naming.md` rule 6).

## 9. Aaron's lessons move from memory notes into the skills

**Fixes:** seven entries, the ones that cost Aaron's trust: labels he couldn't follow, a sitrep at the wrong height, a
wrong claim about his own list, "slop", a dead page in a screenshot, drawing before asking. The lessons are in memory
notes on his Mac that only the conductor reads.

**Change:** `.agents/skills/threads/SKILL.md`, "Talking to Aaron":

```diff
 - **Write to him for the ear.** ...
+- **Plain words, never an ID alone.** A snag, ledger row, decision or pull request is said as what it does; its ID goes
+  in brackets after, if at all. He doesn't know S-04 or HAN-10.
+- **The big picture first.** A sitrep goes by layer (goal, framework, proof, example, portal, cloud, how work is run),
+  with the real holes, before any pull request or CI detail. Read the artefacts yourself; don't relay a summary.
+- **Check a claim before you make it.** Anything you tell him about the code, check against the code first.
+- **Show only what you have looked at.** Open the published page in a browser, read its console, and check it against
+  the component library's own parts before you show it. Ask what he wants before drawing.
```

**Applies it:** the conductor. The memory notes can then point at the skill.
**Applied, 19 November:** [PR 129](https://github.com/AaronAbuUsama/architect/pull/129): plain words before IDs, real screens from a designer thread, render and look. "Big picture first" and "check a claim" were left out.

## 10. Quote code by name, generate the totals

**Fixes:** four entries: canon quotes by line number broke at least four times and reversed a 🔍 verdict; the hand-kept
check totals in `e2e/m1/README.md` caused about eight merges on one PR; redaction lives as three rules in three places
(HAN-12); and a design grill put a wrong refusal code in front of Aaron, copied from a design page that gives two codes
and two exits for it.

**Change:** two small tools and a rule.
- `canon:check` anchors a quote on an exported name (`<!-- quote: packages/x/src/y.ts#Handler -->`) and has a `--fix`
  mode that rewrites the quoted text from the source. A line number is only a hint.
- The totals in `e2e/m1/README.md` move into a generated block between `<!-- totals:start -->` and `<!-- totals:end -->`,
  written by `nx run e2e:totals` and checked in CI. No PR edits them by hand.
- HAN-12 stays with its owner, as the first slice of "one rule, one place" for redaction.
- A design page, brief or grill quotes a refusal's code and exit from the example's generated `errors.ts` (or the
  generated docs), naming the file, never from another design page. Add it to the `portal-design` skill, and fix
  `design/portal.md` lines 226, 592 and 662 now (`HandleNotClaimed` is `HN-900`, exit 11).

**Applies it:** a builder thread, from a brief the conductor writes.
**Applied, 19 November:** [PR 134](https://github.com/AaronAbuUsama/architect/pull/134) (quotes by name, `e2e:totals`, the refusal-code check) and the skill half in [PR 129](https://github.com/AaronAbuUsama/architect/pull/129). `e2e/m1`'s totals markers are with the Goal 3 lead; HAN-12 with its owner.

## 11. One records suite runs against both stores

**Fixes:** three entries, most recently the in-memory store accepting a unique-value move that D1 refuses (HAN-18). The
"no fakes" rule can't delete this one: the memory store is part of the framework.

**Change:** the records tests in `packages/language-effect` run as one suite parameterised over both stores:

```ts
// records.conformance.test.ts
for (const store of [StoreMemory.layer, StoreD1.layer(localD1)]) {
  describe(`Records on ${store.name}`, () => {
    it.effect("a unique value moved between two holders in one call", () => /* … */)
    // every Records behaviour, written once
  })
}
```

Any test that passes on memory and fails on D1 is a divergence, found by CI instead of Codex.

**Applies it:** G5's builder, as part of HAN-18.

## 12. Push before you end a turn

**Fixes:** three entries: three builders' work lost in the account switch, the board going stale, and Goal 3's snag log
on a branch nobody has pushed, hours after the switch.

**Change:** `.agents/skills/threads/SKILL.md`, rules every type keeps:

```diff
+- **Push before you end a turn.** Commit and push your branch, even as work in progress, before every report. A
+  worktree or a session can disappear; GitHub is the only copy that survives.
```

**Applies it:** the conductor. The Goal 3 lead should push `goal-3/floor-curve` now.
**Applied, 19 November:** [PR 129](https://github.com/AaronAbuUsama/architect/pull/129). The snag log was pushed and merged in [PR 135](https://github.com/AaronAbuUsama/architect/pull/135).

## 13. Lint rules for the four unenforced code rules

**Fixes:** the "no async, no throw" rule broken three times in one PR and caught only by Codex, plus `cli/src/main.ts` over
the limit (313 lines on `main`, 339 on `m1`) and the unchecked six-slot shape found in the conductor's audit.

**Change:** `packages/lint` already carries the project's own rules (`ortho/no-old-names`, `ortho/no-pro-outside-portal-ui`,
and others). Add:
- `ortho/effect-only`: reports `async`, `await`, `try`, `throw`, `Date.now`, `new Date()` and `setTimeout` outside a
  module's `main.ts` (and the named entry files), with a test per construct in `rules.test.ts`.
- `max-lines` at 250 (skipping blank lines and comments) for `packages/*/src/**`.
- `ortho/six-slots`: every `src/modules/<name>/` has `README.md`, `types.ts`, `service.ts`, `internal/` and
  `<name>.test.ts`.

Turn each on as `warn` first, ratchet the existing breaches into a list like `e2e/m1/expected-failing.txt`, then `error`.

**Applies it:** a builder thread, checks first by an author.
**Applied, 19 November:** [PR 132](https://github.com/AaronAbuUsama/architect/pull/132), `design/decisions/P1-code-rules.md`, each rule from a baseline that only shrinks.

## 14. Plant a wrong output for every way a check reads, pass it through a hostile reviewer, and fix families, not instances

**Fixes:** two entries from 20 November, both checks pull requests into `goal/stage-1` with no product bug found:
PR 154 (sixteen Codex rounds, 22 findings, four hours) and PR 166 (three rounds, four findings, the third a repeat of
the second's kind). Neither author had the `author` skill in their checkout (proposal 15), so these loops don't show
proof 5 failing. They show that a long list of planted cases, without a method, didn't stop Codex: PR 154's author
planted many before the first review, and Codex found the next one every round. Proof 5 as written asks for one
cheapest wrong implementation, which is less than that list.

**Does it hold up?** The 22 wrong outputs that passed, across both pull requests, each fall in one row of this table:

| A wrong output that… | PR 154 | PR 166 | Total |
|---|---|---|---|
| is right on one input and wrong on another (one sample, one state, an optional or role-private field, the first answer; one operation of many) | 6 | 1 | 7 |
| widens a type (an array, a union, `null`, `undefined`, another literal) | 5 | 0 | 5 |
| leaves a part out (one required field or element at a time) | 2 | 1 | 3 |
| adds to it (an extra member, signature or intersected part) | 3 | 0 | 3 |
| repeats it, or points two at one target | 0 | 2 | 2 |
| sets the value the check expects (the expected value came from the output judged) | 1 | 0 | 1 |
| is misread by the check (`null` read as the text `"null"`) | 1 | 0 | 1 |

Five generic ways cover 20 of the 22. The two in the last rows are about where the check gets its evidence. The
table is drawn from these same findings, so it's a hypothesis: that an author working through it, and a hostile pass
after, would have planted these cases is not shown. The next checks pull request is the test, and its entry records
the Codex rounds with findings. The repeats are what cost the time. Seven of PR 154's findings were one
family (a type wider than the model) in rounds 1 to 15, and six were another (one sample of many) in rounds 1 to 16.
Each family ended only when the check was rewritten to judge the whole: the whole type against the model, every
recorded answer. PR 166's loop ended the same way: its third fix asked for exactly one wherever the contract says one,
and the next review was clean. A hostile pass before Codex already worked once: a 🔍 found the unique-field checks could pass on a
hand-written index, before any build.

**Change:** `.agents/skills/author/SKILL.md`:

```diff
@@ before you hand a check to a builder
-Prove all five, and paste the runs into your pull request:
+Prove all six, and paste the runs into your pull request:
@@ proof 5, and a new proof 6
-5. **It can't be passed hollow.** Name the cheapest wrong implementation that would pass it (an app-level lookup
-   instead of the generated index, an answer hard-coded for the journey's one input) and make the check refuse it.
+5. **It can't be passed hollow.** List what the check reads: each field, element, row, link and type, and each input
+   it judges (every recorded answer, every state, every role). For each, plant one wrong output for every way below
+   that applies, and show it fails:
+   - right on one input, wrong on another: the first answer only, one state, a field only some roles see
+   - a wider type: a union, `null`, `undefined`, a list, another literal
+   - one required part left out, one at a time
+   - something added: an extra member, field, row or signature
+   - something repeated, or two pointing at one target
+   The check's expected values come from the model or a recording, never from the output it judges. Paste the table,
+   each thing read against each way, with the planted case or "doesn't apply", in the pull request. Where things of
+   one kind repeat (twenty fields of one type), plant each way once for the kind and say which it stands for.
+6. **A hostile pass, before Codex.** A subagent that didn't write the check gets the table and tries to pass the
+   check with a wrong output. Each one that passes becomes a row, planted, before the first "@codex review".

@@ review findings
 ## Review findings

 A review finding becomes one planted check that fails first. Then the builder fixes it, and a fresh 🔍 reviews the fix.
+
+A finding on your own check is planted with its whole family: the finding and every sibling in its row of the table.
+When a second finding lands in a row that already had one, stop patching. Rewrite the check to judge the whole thing
+(every input, the whole type against the model), then plant the row again.
```

And "the five proofs" becomes "the six proofs" in "Finished when" and in the ✍️ Author row of
`.agents/skills/threads/SKILL.md`.

**Applies it:** the conductor, or the thread that owns the skills, with the Goal 3 lead. The test: on the next checks
pull request, count the Codex rounds with findings.

## 15. Applied means it reached the branches where the work runs

**Fixes:** one entry. The `author` skill merged on `main` at 22:57 on 19 November and reached `goal/stage-1` at 06:47
on 20 November, after both checks above were written. `builder-paths` and `cancel-closed` took two hours to reach
`goal/stage-1` and haven't reached `m1`.

**Change:** `.agents/skills/conductor/SKILL.md`, beside landing a pull request:

```diff
+- **A process change lands everywhere work runs.** When a skill, AGENTS.md or a CI guard lands on `main`, merge `main`
+  into each live goal branch the same hour, and tell its lead to have open branches merge their base.
```

And the Scribe logs a proposal "applied" with where it reached: "on `main`; on `goal/stage-1` at …; on `m1` at …".
`m1` still lacks PR 130's guards.

**Applies it:** the conductor. The Scribe's half is in this change.
