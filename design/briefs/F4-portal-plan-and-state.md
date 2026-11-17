# F4: the portal as the one place for what's current — missions, tasks and the durable state behind them

Status: **accepted direction** (Aaron, 17 November 2026: "go with A"). 📐 designer brief; steps below are proposed rows.

> **Changed by F5 (`design/decisions/F5-work-blueprint.md`).** Missions, milestones, questions, runs and attention are
> declared as an Architect project, `examples/work`, not a hand-written `Plan` Durable Object (§4 to §6, F4.3). Missions
> and runs are database rows; the manager and run Durable Objects are agents that call its operations, not its storage
> (8.1, 8.2). The rule in §2, the task kinds in §3 and the closed loop in §8 stand.

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
| F4.5 | spike `sandbox-from-a-do`: a Run DO drives a Cloudflare container (local: Docker) holding a copy of the repo; Pi Durable's `env` points at it | `spikes/`, throwaway | a run edits a handler, runs `architect check`, pushes a branch, and survives an eviction mid-command |
| F4.6 | Run DO: one Pi Durable harness per run (H1 option B), grant from `architect brief`, reports as Plan facts | `@architect/agent` | three cards cross the board as three runs prove them; a killed run resumes |
| F4.7 | Manager DO: one per mission; reads the plan and the Book, starts and steers runs, raises attention | `@architect/agent` | a failed eval reopens its card and the manager starts a new run without being asked |
| F4.8 | intake: the manager's first phase turns blueprint gaps into questions, spikes and a mission | `@architect/agent`, portal chat | a mission over `allowance` is set up from one conversation, with the gaps from the portal's warn callouts asked, not guessed |

F4.1 and F4.2 are independent and can run in parallel; F4.3 needs neither to start but needs both to close tasks. F4.5 can run
beside all of them. The board (F4.4) is useful before any agent exists: Claude Code threads and people move cards the
same way, by producing facts.

## 6. Durable shape

| Piece | Primitive | Why |
|---|---|---|
| `Book` | one DO per project (exists) | one ordered ledger of facts; signed writes |
| `Plan` | one DO per project, beside `Book` in the same Worker | missions are few and need one serialised owner; same auth, same `seq` discipline |
| manager | one DO per mission (§8) | one conversation per goal; serialises assignment; alarm-driven |
| run | one DO per run (H1), driving a sandbox container | survives eviction; its transcript is the run record H2 benchmarks |
| portal | the Worker route (exists) | stores nothing; computes views per request, cacheable by `(digest, seq)` |
| live updates | WebSocket hibernation on `Book` and `Plan` | pushes "seq moved"; open pages refresh their slots |

On Cloudflare a DO class is the entity type and `idFromName` the sharding, so there is no separate cluster to run.
Each DO sits behind an Effect service shaped like an `@effect/cluster` entity, so leaving Cloudflare is one seam.

## 7. Open risks

- Comparing a handler to its scaffold must survive a formatter: record the scaffold's normalised hash when rendering.
- Times come from the signed token and git, not a clock; CI queueing skews them by minutes, fine for a burn-down.
- A renamed operation orphans its tasks until the mission is regenerated; the Plan page shows orphans, never hides them.
- One `Book` and one `Plan` per project is a single writer each; revisit with real numbers.

## 8. The closed loop: one manager, runs, board, timeline (Aaron, 17 November 2026)

Aaron's intent, steelmanned: you talk to one agent. It sets a mission up properly by asking you the right questions and
spiking what nobody knows yet, then it only orchestrates: it starts runs, watches them, and comes back to you only when
something is truly yours. Everything it and the runs do lands as durable facts, so the portal shows a live board, and any
operation's page shows everything that touched it, in order. Cloudflare-native, as few moving parts as possible.

The calls, made by the building agent:

| # | Call | Why |
|---|---|---|
| 8.1 | **The manager is one DO per mission**, not per milestone (replaces `codex-handoff.md` phase 6) | one conversation per goal is what Aaron asked for; milestones are rows in the mission, not owners |
| 8.2 | **Each run is its own DO with its own Pi Durable harness**, not a child conversation inside the manager's harness | Pi Durable allows one storage owner at a time, so children in one harness serialise; separate DOs run in parallel, crash alone, and each transcript is one run record for H2 |
| 8.3 | **Code runs in a sandbox the Run DO drives**: a Cloudflare container in the cloud, Docker locally (F4.5) | a DO cannot run `pnpm` or `git`; Pi Durable's `env` is the seam; H1 only ships Node and SSH envs |
| 8.4 | **Only facts move a card.** A run's reports (`progress`, `waiting`, `blocked`, `failed`) say how it is going; they never close a task | from dsh-superagent: the ticket owns its state, independent of the executor. A run that says "done" while an eval fails stays Running |
| 8.5 | **The manager reads facts, never code.** It has no file tools: plan, Book, start run, steer run, ask you | keeps it an orchestrator; anything that needs code is a run |
| 8.6 | **Intake is the manager's first phase**, not a separate agent. Its questions come from the blueprint's gaps (blanks, errors without a when, roles without a holder, missing machines), one at a time as lettered choices; "not sure" makes a `spike` task | good questions are the ones the portal already shows as warn callouts; nothing starts until you press Start mission |
| 8.7 | **A seventh task kind, `spike`**: generated by intake, closed when its README lands on `main` (a git fact CI records) | Aaron's "does the first things right, like code spikes"; it fits the rule that a fact closes a task |
| 8.8 | **Board columns are derived**: Open, Running (a claim and a live run), Waiting on you (attention), Proven (eval facts), Done (promoted to the target) | no column is set by hand; a failed eval moves a card back to Open with its reason |
| 8.9 | **An operation's timeline is every fact keyed by it**, ordered by `seq`: compiled revisions, claims, reports, eval rows, verdicts, releases | the Book and Plan ledgers already order by `seq`; the page is one query, no new store |
| 8.10 | **What stays yours**: promoting to production, money beyond the cap, credentials, stopping a mission | from dsh-superagent: stop is a person's act; and `AGENTS.md`'s standing rules |

Taken from dsh-superagent: the ticket owns its state (8.4), assignments that start and end apart from the ticket (a
claim and its run), reports as a fixed enum, attention as the only way a question reaches you, stop as a person's act.
Left out, because one project and one person do not need them: Source, Trigger, Thread, Correlation, Subscription, Policy
versions and Mandate as an entity. The mandate survives as the run's grant (allowed paths and budget from
`architect brief`), written into the claim fact.

Four DO classes in all: `Book`, `Plan`, `Manager`, `Run`. No cluster: `idFromName` is the sharding. Each sits behind an
Effect service shaped like an `@effect/cluster` entity, and Pi Durable sits behind H1's seam, so its churn stays in one file.

Pushbacks recorded:

- **The manager comes last, not first.** Without F4.1 and F4.2 it would have nothing true to read and would close cards on
  a run's word. The board, filled by facts, is the floor; the manager is built on it.
- **"Closed" stops at the person.** The loop closes itself for build and prove; it does not promote to production or
  spend past the cap on its own.
- **CI stays the prover.** GitHub Actions runs `prove`; a run's own tests are its draft, not the verdict.
- **This is layer-3 phase-6 work**, built on `layer/3` after the gate, per `AGENTS.md`'s layer rule. Until then it is design.

Open risks: Cloudflare containers' cold start and cost against the $10 a day cap (F4.5 measures both); Pi Durable's
churn (pinned, behind the seam); a manager steering too often wastes tokens (it wakes only on a `seq` move or a report).
