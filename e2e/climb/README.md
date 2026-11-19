# The climbability check: `nx run e2e:climb`

Goal 3, "What 'climbable' means, as a check" (`design/goals/03-stage-1-hill-climbed.md`). Written by the checks author; a
builder never edits it or `e2e/fixtures/climb`. With a wrong handler planted, `ortho prove` must:

1. name the journey and the step that failed;
2. show what was expected and what came back;
3. point to the handler file and the declaration it answers to;
4. finish one journey in under 30 seconds once the world is warm;
5. give the same result on two runs in a row.

## How it works

A copy of acme in a temp folder (its own journeys stay, so the control is the whole project), with
`e2e/fixtures/climb/journeys/*.ts` added and, for a planted kind, `e2e/fixtures/climb/variants/<kind>/src/allowance/spend.ts`
laid over acme's correct handler. It does not use Plugged In. Five kinds, each one fault against one journey a correct handler passes:

| Kind | Planted fault | Journey step |
|---|---|---|
| wrong answer | answers what was left before the spend | `expect(remaining).toBe(380n)` |
| missing refusal | never refuses an amount over the allowance | `refuses(AllowanceExceeded)` |
| missing event | never calls `move`, so nothing is emitted | `emits(AllowanceSpent)` |
| wrong state | `move("active")` always | `machine.isIn(…, "exhausted")` |
| missing span | the record write is not a step | `spans({ present: [… "allowance.spend.record"] })` |

The **control** runs the whole project with the correct handler: every climb journey passes and prove exits 0. Each planted
kind is run twice with `--only <journey>` (property 5 compares the runs after taking out world-made ids and measured
times; property 4 times both). Each property is its own test, so a red test names a property that does not hold: a snag.
Prove prints text only, so the assertions read its lines. Ports 19400 to 19419. No Docker.

## What holds and what does not (today, 19 November 2026)

26 tests: 20 pass, 6 are red.

| Property | wrong answer | missing refusal | missing event | wrong state | missing span |
|---|---|---|---|---|---|
| control passes (prove exits 0) | pass | | | | |
| 1 names journey and step | pass | pass | pass | pass | pass |
| 2 expected and what came back | pass | pass | pass | pass | **red** |
| 3 handler file and declaration | **red** | **red** | **red** | **red** | **red** |
| 4 under 30 s (about 5 s each) | pass | pass | pass | pass | pass |
| 5 same result twice | pass | pass | pass | pass | pass |

### Snags (framework; the builder's, not the climber's)

- **S-C1 · prove names no file.** Its failing step line gives the journey, the step and the cause, never `src/allowance/spend.ts`
  or `blueprint/things/allowance/verbs/spend.ts`. Evidence: `✘ "olga spends some and is told what is left": answer "500", expected "380"`.
  The model already holds the operation's declaration file (`operations["allowance.spend"].file`), and the handler is
  `src/<thing>/<verb>.ts`. Five red tests (property 3).
- **S-C2 · a missing span says "missing", not what was expected and what came back.** Evidence:
  `✘ "olga spends some and the record step is traced": span allowance.spend.record missing`. It does not say the span was
  expected present, nor which spans did occur. One red test (property 2).
- **S-01 · prove has no machine-readable report.** Everything here, and the climb recorder, parses text. A JSON report would
  touch `packages/cli/src/main.ts`, which PR #76 owns.
- Not a failure, noted: two runs differ in world-made ids (`alw_…`) in the failing line and in measured p50 and p95; the check
  takes those out, and the rest is identical.

These six are not in an expected-failing list: the e2e ratchet is not on `goal/stage-1` yet. When it lands, list them there.
CI job `e2e-climb` is `continue-on-error: true` until then.

## The climb recorder

`node tools/climb/record.mjs <ortho prove args>` (or `nx run e2e:climb-record -- …`) runs `ortho prove`, streams its output
unchanged, and appends one line per journey to `design/evidence/climb/runs.jsonl`:
`{ at, commit, journey, green, total, seconds, exit }`, read from prove's own `journey <name> ✔|✘ n/m steps` lines (the parser,
`tools/climb/parse.mjs`, is tested on real prove lines in `e2e/grid/climb-record.test.mjs`). `seconds` is the whole prove
process, world start included. `--runs <file>` sends the lines elsewhere. Snag S-01 is its floor.
