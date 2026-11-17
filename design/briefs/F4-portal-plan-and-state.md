# F4: the portal as the one place for what's current — missions, tasks and the durable state behind them

Status: **accepted direction** (Aaron, 17 November 2026: "go with A"). 📐 designer brief; steps below are proposed rows.

Aaron's intent, in his words: every time an eval runs and passes it updates durable state, and that updates the portal;
a person or an agent sets a **mission** (a goal): milestones with tasks in them, the tasks generated from the
blueprint and of different kinds (specify an operation, design and validate its state machine, build it, prove it,
promote it); the portal is a static template that the blueprint and the durable state fill, always fresh, so no
hand-made status artifact is needed.

This replaces `codex-handoff.md` phase 5 (the plan as a separate `examples/workbench` project) and an earlier draft of
this brief that put milestones in the blueprint (option B). Phase 6 (manager and workers) is unchanged, except that the
manager reads its tasks from the plan below.

## 1. Where things live today (layer/3)

| Store | What it is | Holds | Code |
|---|---|---|---|
| **Journal** | acme's own event log, in acme's D1 | one row per state-machine move, written in the same transaction as the row (`trace, operation, move, subject, event, fields`) | `host-cloudflare/src/modules/store/service.ts:33`; read by `Journal.ofTrace` for the Events and Machine path evals |
| **Logbook** | Architect's record about acme: one `Book` Durable Object, SQLite | `verdicts` (one pass/fail per operation, environment, revision) and `releases`; no time | `logbook/src/modules/book/internal/sql.ts:4` |
| **Models** | R2 | each compiled blueprint, by digest | `logbook` `http` module |
| **Actors** | acme's things with `lives: "actor"` | one DO per instance | `host-cloudflare/src/modules/actors` |

The journal is about acme's data, never about our work; it stays as it is. Work state goes in the logbook's Worker.

Two losses today: `prove` judges nine evals per operation (`evals/types.ts:19`) and posts only
`{ operation, verdict }` (`verdicts/types.ts:18`); and the compiler leaves a blank operation out of the model
(`compiler/…/describe.ts:44`) though it knows its blanks (`describe.ts:45`).

## 2. The rule: record facts, declare missions, derive the rest

| Kind | Home | Written by |
|---|---|---|
| **Facts**: compiled revisions, eval results, verdicts, releases, claims | logbook Worker, append-only, ordered by `seq`, each row with a time | CI (`prove`, `promote`), the compiler's CI step, the fleet |
| **Missions**: title, milestones, which task kinds over which things or operations, target environment | a `Plan` Durable Object in the logbook Worker | a person (CLI) or an agent (signed HTTP) |
| **Views**: tasks, their status, progress, burn-down, attention | computed on read, never stored | the portal route |

A task is never stored and never ticked by hand: it is generated from a milestone and the blueprint, and closed by a
fact. A worker cannot mark its own task done.

## 3. Task kinds

| Kind | Generated when | Done when | Fact from |
|---|---|---|---|
| specify | the operation has blanks | its blanks are gone | compiled revision |
| design machine | the thing's machine has blanks or no states | states set; every move has from, to, emits | compiled revision |
| validate machine | the thing has a machine | coverage reaches every move and declared error | eval rows |
| build | handler missing or still the scaffold | `implementation: written` | compiled revision |
| prove | built | all nine evals pass in `test` | eval rows |
| promote | proved, target beyond `test` | a recorded pass in each environment up to the target | verdicts, releases |

## 4. DX

```bash
architect mission new "Allowances to production" \
  --milestone "Specify" --kinds specify,machine,validate --of allowance \
  --milestone "Ship" --kinds build,prove,promote --of allowance --until production
# ✔ mission m_7 · 2 milestones · 16 tasks from blueprint 53d028ded1
architect mission show m_7
```

An agent does the same with `POST /plan/v1/missions { title, milestones: [{ title, kinds, of, until }] }`, signed with
the same token sources as a verdict (`verdicts/types.ts` `TokenSource`). Missions are append-only facts too: a scope
change is a new row, so the burn-down shows it as a step.

## 5. What changes

| Step | Change | Blast radius | Done when |
|---|---|---|---|
| F4.1 | `prove` posts the nine eval results per operation; logbook adds `evals (seq, verdict_seq, eval, result, failures, notes, at)` and a time on every row (the signed token's issue time) | `prove/verdicts`, `logbook/book`; additive | `extensions.evals` is no longer `unavailable`; the portal's nine squares are real |
| F4.2 | compiler keeps blank operations (marked with their blanks) and adds `implementation: missing \| scaffold \| written` per operation; CI records each compiled revision (digest, blanks count, time) in the logbook | `compiler/model`, wire schemaVersion 2; generators read the blank marker instead of absence | an emptied handler shows *build* open, a `Blueprint.todo` shows *specify* open |
| F4.3 | `Plan` DO in the logbook Worker; `architect mission`; `/plan/v1` | new module in `logbook`, new command | a mission of two milestones generates the tasks in §3 and they match Needs attention |
| F4.4 | portal Plan page: board by milestone, progress, burn-down from timed rows; `/_portal/v1/plan` fills the static slot | portal route and template | an eval passing in CI moves a card without a rebuild |
| F4.5 | phase 6's manager reads tasks from the plan; claims are facts in the plan's ledger | `@architect/agent` | three cards cross the board as three workers prove them |

F4.1 and F4.2 are independent and can run in parallel; F4.3 needs neither to start but needs both to close tasks.

## 6. Durable shape

| Piece | Primitive | Why |
|---|---|---|
| `Book` | one DO per project (exists) | one ordered ledger of facts; signed writes |
| `Plan` | one DO per project, beside `Book` in the same Worker | missions are few and need one serialised owner; same auth, same `seq` discipline |
| milestone manager | one DO per milestone (phase 6) | serialises assignment; alarm-driven |
| worker run | one DO per run (H1) | survives eviction |
| portal | the Worker route (exists) | stores nothing; computes views per request, cacheable by `(digest, seq)` |
| live updates | WebSocket hibernation on `Book` and `Plan` | pushes "seq moved"; open pages refresh their slots |

On Cloudflare a DO class is the entity type and `idFromName` the sharding, so there is no separate cluster to run.
Each DO sits behind an Effect service shaped like an `@effect/cluster` entity, so leaving Cloudflare is one seam.

## 7. Open risks

- Comparing a handler to its scaffold must survive a formatter: record the scaffold's normalised hash when rendering.
- Times come from the signed token and git, not a clock; CI queueing skews them by minutes, fine for a burn-down.
- A renamed operation orphans its tasks until the mission is regenerated; the Plan page shows orphans, never hides them.
- One `Book` and one `Plan` per project is a single writer each; revisit with real numbers.
