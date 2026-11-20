# Spike: vitest-fixtures

**Question.** Can the checks that start real worlds be written on Vitest's own fixtures and custom matchers, in place of
the hand-kept copies, memos, `afterAll` and rows of `expect`, with the same tests, the same assertions and no loss?

**Answer.** Yes, for clean-up and for what a red check says. The climbability check came out as the same 26 tests, all
green against real `ortho prove`, in 41 lines where it was 108. It is no faster, and one part stays hand-written: a
fixture cannot be made once per planted kind, so that cache is still a `Map`.

20 November 2026. Vitest 4.1.12, the version the repository pins. Nothing was added to any `package.json`.

## Where it runs

The climbability check lives on `goal/stage-1` (`e2e/climb/`), so the spike was run on a checkout of `goal/stage-1` at
`8e9a712f` with this folder laid on top. On `main` this folder is a record only: `climb.spike.test.ts` imports
`e2e/climb/support.ts`, which `main` does not have yet. The break attempts in `breaks/` run anywhere.

```bash
node_modules/.bin/vitest run --root spikes/vitest-fixtures --config vitest.config.ts
```

```bash
node_modules/.bin/vitest run --root spikes/vitest-fixtures/breaks --config vitest.config.ts
```

## What was tried

- `fixtures.ts`: `test.extend` with three file-scoped fixtures and two test-scoped ones.
  - `copy` hands out copies of acme and, when the file ends, removes each one and then checks no process still names
    its folder. This replaces the `copies` array and the `afterAll`.
  - `control` proves the whole project once. This replaces the `control()` memo.
  - `runs` needs `control`, so Vitest makes the control first; that is the warm-up before anything is timed, said as a
    dependency where it was a call and a comment.
  - `kind` and `ran` are test-scoped: a `describe` sets the kind with `test.scoped({ kind })` and its tests ask for `ran`.
- `matchers.ts`: `expect.extend` with `toPassJourneys`, `toFailStep`, `toSayExpectedAndGot` and `toPointAt`. Each reads
  prove's exit code, its lines and its `--report`, makes every assertion the original test made, and reports all the
  ones that failed at once, followed by what prove printed.
- `climb.spike.test.ts`: `e2e/climb/climb.test.ts` again on those two files. Same test names, same count.
- `breaks/`: five small files with no world, each trying to break one part of the idea.

## What was found

1. **The rewrite is the same check.** 26 tests, 26 pass, against real workerd and a real collector, eleven proves as
   before. `pgrep` for the worktree's path printed nothing afterwards.

2. **A file-scoped fixture is made only when asked for, and once** (`breaks/1-lazy.break.ts`, 4 of 4 pass). A fixture no
   test names is never made. Run with `-t "the wrong state"`, the spike proved the control and that one kind and
   skipped the other four: 5 tests passed, 21 skipped, 48 seconds where the whole file takes 114. The original has
   this too, by hand.

3. **A leak cannot pass unnoticed** (`breaks/2-teardown-throws.break.ts`). When a file-scoped fixture's clean-up
   throws, the run exits 1 even though every test passed:

   ```text
    FAIL  2-teardown-throws.break.ts [ 2-teardown-throws.break.ts ]
   Error: left running: workerd 4242
    Test Files  1 failed (1)
         Tests  1 passed (1)
   ```

   Vitest reports it against the file, not against a test. The ratchet already has a key for exactly that
   (`m1/NN.test.ts > [file error]`), so its rules need no change.

4. **A fixture cannot be made once per planted kind. Two ways were tried and both fail.**
   - A file-scoped fixture that needs a test-scoped value (`breaks/3-file-needs-test.break.ts`) is refused when the
     file loads: `FixtureDependencyError: The file "world" fixture cannot depend on a test fixture "kind".` No test runs.
   - One fixture per kind made in a loop and asked for by a computed name (`breaks/4-dynamic-name.break.ts`) gives
     `undefined`, silently. Vitest reads which fixtures a test needs from the text of its parameter list, so
     `({ [k]: world })` names nothing. The TypeScript compiler accepts it, which makes this the dangerous one.

   So `runs` is one file-scoped fixture holding a `Map`, as the original does. The fixture adds the clean-up and the
   ordering; the cache itself is still ours.

5. **A red matcher says more than a red `expect`** (`breaks/5-matcher-message.break.ts`). The original stops at its
   first failed `expect`. The matcher lists every failed assertion and then prove's own lines:

   ```text
   Error: expected prove to fail "olga spends some" of "climb: a wrong answer", but:
     - exit 0, expected 1
     - journey line: journey climb: a wrong answer ✔ 1/1 steps, expected "… ✘ 0/1 steps"
     - no line starts  ✘ "olga spends some"
     - report: journey verdict pass, expected fail
     - report: step verdict pass, expected fail
   prove said:
   journey climb: a wrong answer ✔ 1/1 steps
   ```

6. **Everything typechecks** under the repository's base `tsconfig`, the new matchers included (declared on Vitest's
   `Matchers` interface). A fixture that needs nothing must still be written `async ({}, use)`, which oxlint's
   `no-empty-pattern` flags; each such line carries a disable comment.

## Measurements

One run each, on the shared Mac, one after the other.

| | Original (`e2e/climb/climb.test.ts`) | Spike |
|---|---|---|
| Tests | 26 pass | 26 pass |
| Wall time, whole file | 103 s | 115 s |
| Wall time, one kind only (`-t`) | not measured | 48 s |
| Lines in the test file | 108 | 41 |
| `expect(` calls in the test file | 20 | 8 |
| Lines of shared support added | 0 | 132 (`fixtures.ts` 66, `matchers.ts` 66) |

The twelve seconds between the two whole-file runs is one sample each on a busy machine and both do the same eleven
proves; read it as "no faster", not as "slower". The line count only pays back when a second check uses the same two
files: on this one check alone, the total goes up.

## The decision it supports

Worth adopting for the world-starting checks, as shared support in `e2e/`, on three conditions:

- **It is the checks author's change, not a builder's.** These files are checks (AGENTS.md, "Journeys and checks come
  first"), so each suite moves in an `-check` pull request.
- **Start with the leak check.** The `copy` fixture is the piece with the clearest gain: every test that copies a
  project gets removal and the nothing-left-running check without writing either. Layer 1's checks 2, 3 and 6 each
  write their own `try`/`finally` today.
- **Matchers read prove's `--report`.** They need the structured report, which is on `goal/stage-1` and not yet on
  `main`, so the matchers follow it there.

It does not make anything faster and it is not a reason to change `ortho prove` or how journeys are declared.

## Open risks

- **Computed fixture names fail silently** (finding 4). A lint rule or a review note is needed, or someone will write
  the loop and get `undefined`.
- **File scope is one file.** A warm world shared by several files is not a fixture; it would be `globalSetup` with
  `provide` and `inject`. Not tried here.
- **Sharding.** A file-scoped fixture lives and dies with its file, so shards should be unaffected, but no sharded run
  was made.
- **The ratchet's custom runner.** It rewrites each test's body to tell hook errors apart. It was not run with
  fixtures; a fixture's set-up error may be attributed differently from a `beforeEach` error.
- **One sample.** The timings are single runs.

## Not asked, noted

Whether the ratchet's custom runner can go, and whether `@effect/vitest` works with Effect 4.1.1, are separate
questions. Neither was touched.

---

TO THE CONDUCTOR

- **Answer.** Fixtures and matchers carry the climbability check unchanged: 26 of 26 green on real prove, 41 lines for
  108, a leak now fails the file by itself. No speed gain. The per-kind cache stays a `Map`.
- **Decision it supports.** Move the world-starting checks onto shared `e2e` fixtures and report matchers, one suite
  per `-check` pull request, starting with the copy-and-leak-check fixture.
- **Steps it changes.** None in `milestones.md`. It adds one piece of checks-author work on `goal/stage-1`, after the
  structured report is there for every suite that would use the matchers.
