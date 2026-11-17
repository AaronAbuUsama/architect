# F5: the work system is an Architect project with its own blueprint

Design decision, 17 November 2026, by the building agent under AGENTS.md ("the building agent owns the architecture").
Aaron asked for it: "I want the blueprint designed and landed properly", after asking "what is this mission campaign
thing? Have we even got a thing for that? Do we have tools for that?". It changes F4 (`design/briefs/F4-portal-plan-and-state.md`)
where it said a hand-written `Plan` Durable Object would hold missions.

**The answer in one paragraph.** Missions, milestones, intake questions, agent runs and what waits on you are declared
as an Architect project, `examples/work`, in the same language acme uses. Architect then generates the work system's
server, SDK, `work` CLI, MCP server (the manager's and the runs' tools), docs and portal wire, and proves it with the same
evals. Tasks stay what F4 made them: never stored, worked out from milestones, the blueprint and the facts. The facts
(eval rows, verdicts, compiled revisions) stay in the logbook. The blueprint compiles today: 6 things, 26 operations,
26 MCP tools, `types ✔ rules ✔ drift ✔`, and one blank, which waits on L3.01.

## 1. The question

Where do missions and the rest of the work state get declared, and in what? F4 §6 said: a `Plan` Durable Object in the
logbook Worker, with `architect mission` and `POST /plan/v1/missions` written by hand.

## 2. The options

**A · Plan DO in the logbook (F4 as written).** New `plan` module in `packages/logbook`: SQL tables, HTTP routes, a hand
CLI command, a hand MCP tool list for the manager, hand docs.

**B · Work as an Architect project (chosen).** `examples/work/blueprint/things/{mission,milestone,question,run,attention}`,
generated like acme. The tools come from the generators; the handlers are written into scaffolds.

**C · Milestones in the project's own blueprint.** Already rejected by F4 (option B there): it puts our work into acme's
model, and a scope change becomes a blueprint change.

| Axis | A · Plan DO | B · Work project | C · In acme's blueprint |
|---|---|---|---|
| Floor-first | ⚠️ routes, CLI, MCP and docs are all hand work before anything is usable | ✅ CLI, SDK, MCP and docs exist now, generated; only handlers remain | ⚠️ changes the compiler first |
| Reversibility | ✅ one module | ✅ one example project; nothing imports it | ❌ every project's model carries it |
| Blast radius | ⚠️ logbook gains a second job | ✅ new project; two small generator fixes it found | ❌ compiler, model, every project |
| Correctness | ⚠️ roles, refusals and evals hand-rolled | ✅ the same roles, refusal codes, journal and nine evals as acme | ⚠️ |
| Fit | ⚠️ a second way to declare an API | ✅ Architect describes its own work in its own language | ❌ |

## 3. The calls

| # | Call | Evidence |
|---|---|---|
| 1 | **Work is a project, `examples/work`.** It moves to `apps/work` when its handlers are built and it is deployed. | `architect model --root examples/work` lists 6 things and 26 operations |
| 2 | **Six things**: `person`, `mission`, `milestone`, `question`, `run`, `attention`. A task is not a thing: `mission.tasks` works them out, each `<kind>:<subject>` in the column its facts put it in. | F4 §2 and 8.8 kept; `blueprint/things/mission/verbs/tasks.ts` |
| 3 | **Missions and runs are database rows, not actors.** The compiler refuses a list read on a thing that lives as actors, and the board and sidebar need lists. The manager's Durable Object (one per mission) and the run's (one per run) are agents keyed by those ids that call these operations over MCP. They hold a conversation or a harness, never the mission's state. | `a list read needs a thing that lives in the database, and mission lives as actors` (compiler, first run) |
| 4 | **Facts stay in the logbook.** Eval rows (F4.1), compiled revisions with blanks (F4.2), verdicts and releases are written where they are now. Work reads them through a declared dependency, so `mission.tasks` carries a blank until L3.01 (kits, dependencies and edges) lands. | `architect check`: `mission has 1 blank … tasks.ts:16` |
| 5 | **Only a fact moves a card.** `run.finish` records a pushed branch; it cannot close the task. `run.report` moves no card. | F4 8.4; `run/machine.ts` |
| 6 | **Intake is `question`**: `ask`, `answer` (a letter), `spike` ("not sure yet" makes a spike task, closed when its README lands). `mission.start` refuses with `MissionHasOpenQuestions` until every question is answered or spiked. | F4 8.6, 8.7 |
| 7 | **What stays yours is `attention`**: `promote`, `money`, `credential`, `question`. `approve` and `decline` are the only way past it. | F4 8.10 |
| 8 | Refusal codes `MS` (mission) and `ML` (milestone) are set by hand: both would take `MI`. Exit codes 50 to 63. | compiler: `mission and milestone would both have refusal codes starting MI-` |

## 4. What the second project found in Architect itself

Fixed in this change (each proven by `nx run-many -t lint,typecheck,test` on work, acme, starter, generators,
target-effect and cli, and `nx sync:check`):

- **List reads broke the MCP catalog's types.** `McpEntry.operation` was `Operation | Read`, which is a read by id only;
  acme has no list read, so nothing exercised it. Now `McpOperation = Operation | Read<Thing, unknown, unknown>`; the runtime
  already handled list reads (`mcp/internal/tool.ts`).
- **A verb named like a CLI helper clashed.** `question.answer` generated `import { answer } from "../output.ts"` beside
  `export const answer = Command.make(...)`. The CLI now imports `* as Output`.

Open, for the language (not changed here):

- **A person and an agent acting for them look the same.** `Principal` is `anonymous | person`. F4 8.10 needs
  `attention.approve` to be the owner in person, so `Principal` needs to say when an agent signed in for someone. Until
  then it is `owner.of("mission")` either way, with a comment.
- **A blank cannot sit in `allowed`.** `Blueprint.todo(...)` there fails with `uses a role not exported from a roles.ts`,
  so an undecided role cannot be left as a blank.
- **`notFrom` names its one refusal after the first state.** `mission.pause` refuses with `MissionNotIntake` though it
  moves from `running`. The refusal carries the real state; the name misleads.

## 5. What it gives, and what is left

Generated now: `work` CLI (`work mission open --title … --target … --blueprint …`), `@work/sdk`, 26 MCP tools named as the
operations (`mission.open`, `question.answer`, `run.start`, `attention.approve`, …), docs and the portal wire.

| Step | What | Needs |
|---|---|---|
| W1 | journeys and checks for work's operations, by an agent other than the builder | this decision |
| W2 | handlers: the scaffolds in `examples/work/src` | W1 failing on empty handlers |
| W3 | `mission.tasks` reads the logbook | F4.1, F4.2, L3.01 |
| W4 | the portal's Work side reads work's API: the mock in `spikes/portal-fumadocs` becomes real | W2, W3 |
| W5 | the run and manager Durable Objects as MCP clients of work (F4.6, F4.7, F4.8) | W2; the E2B spike (PR 20) |

F4.3 is replaced by W1 to W3. F4.1, F4.2, F4.4 to F4.8 stand. It is layer-3 work, built after Gate 3's own steps, per the
layer rule; until then this blueprint is the design, and it compiles.
