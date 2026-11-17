# Spike: the work system on real data

**Question.** Can the work system declared in F5 (missions, milestones, questions, runs, attention) run as an ordinary
Architect project, locally, and put real tasks on a board by reading real facts about another project (acme) rather
than anything hand-written?

**Answer.** Yes. `examples/work` compiles, generates and serves through `architect dev` like acme does. A Node script
fed it acme's real compiled model and a real `architect prove --env local`, drove one mission through the generated
REST API, and the server worked out 19 tasks into the five columns from those facts alone. The portal mock renders that
mission read back through the same API. Getting there found three framework bugs, all fixed here or in F5's pull
request, and two gaps in the work blueprint.

## What was tried

- `examples/work` from `design/work-blueprint`, plus `person` and `session` copied from acme so it has Better Auth
  sign-in, and a spike-only `fact` thing (`subject`, `kind` compiled/eval/verdict, `env`, `result`, `note`,
  `revision`) standing in for the logbook that L3.01 will provide. `mission.tasks`'s blank `facts` step became a
  database step reading that table.
- Handlers for all 26 operations (`examples/work/src`), and `src/board.ts`, the rule that turns facts into columns:
  running if a live run claims the task, waiting if attention is open on it, otherwise by kind (specify: no blanks;
  machine: the thing has states; validate: a coverage eval passes for every operation; build: the handler is written,
  not a scaffold; prove: all nine evals pass; promote: proven, done once a verdict exists in every environment up to
  the target).
- `feed.ts` (entry file): signs a local test person up and in; runs `architect model --json` and
  `architect prove --env local` on acme; records 158 facts; opens "Allowances to production" with two milestones;
  asks three intake questions; tries `mission.start` while they are open (refused, `MS-001 MissionHasOpenQuestions`,
  open 3); spikes one, answers two, starts; starts a specifier run on `spike:allowance.spend`; raises a promote
  attention on `promote:allowance.grant`; reads `mission.tasks`.
- `snapshot.ts` (entry file): reads the mission back through `mission.get`, the four list reads and `mission.tasks`,
  and writes `snapshot.json`. The portal mock (`spikes/portal-fumadocs`, branch `spike/portal-docs`) renders it as
  the mission "Allowances to production · real": board, KPIs and the manager conversation.

## What was found

1. **It works end to end on real data.** acme at `5cf3f734e8be`: 8 things, 15 operations, prove passed in 9.2 s.
   The board: running `spike:allowance.spend`; waits on you `promote:allowance.grant`; proven `validate:allowance`,
   the four `prove:` tasks and three `promote:` tasks; done the four `specify:`, `machine:allowance` and the four
   `build:` tasks. 17 of 19 closed by facts, none by hand.
2. **D1 can't bind an array field.** `milestone.add` returned 500, `D1_TYPE_ERROR: Type 'object' not supported`, for
   `kinds: ["specify", …]`. Fixed in `host-cloudflare`'s store (`internal/rows.ts`): a field whose encoded schema is an
   array or a struct is stored as JSON and parsed back; the schema decides, so a string starting with `[` stays a
   string. Tested in `store.test.ts`. acme never hit this because it has no array fields.
3. **The work project could not sign anyone in.** F5's blueprint had no `person` or `session`, so every
   `owner.of("mission")` operation was unreachable. Added here; F5 should carry them.
4. Two bugs found while landing F5 (#27) and fixed there: the MCP target's tool type did not accept a list read
   (`McpOperation`), and the generated CLI clashed on an operation named `answer` (namespace import).
5. **Gap: the answer to a question is not kept.** `question.answer` takes `picked` and moves to `answered`, but the
   thing has no field for it, so the board and the manager can say a question was answered but not how. The blueprint
   needs a `picked` field, which needs optional fields or a separate `answer` row.
6. **Gap: facts have no history.** The board is right now, but the burn-down and the KPIs need per-day rollups; the
   mock shows today's value for every day. That belongs with the logbook (L3.01), not here.

## The decision it supports

F5 stands: the work system is an Architect project, its board is computed from facts, never stored. The build path
in F5 §5 holds, with two changes: W1 must include `person`/`session` and the store's JSON columns; and the `fact`
thing here is a stand-in to delete when the logbook lands, not something to promote into the blueprint.

## Open risks

- `board.ts` reads facts with raw SQL through `SqlClient`. Fine for a spike; the real one reads the logbook through a
  declared dependency, and its query cost on a big project is unmeasured.
- The prove facts are parsed from the CLI's printed lines. The ledger (`.architect/evidence/proven.json`) is the
  stable source and should be what the logbook records.
- Runs and attention are written by a script here. Nothing yet runs an agent, so `run.report` and budgets are untested
  against a live model.

## Run it

```bash
node packages/cli/src/main.ts dev --root examples/work --port 8801
```

```bash
node spikes/work-real/feed.ts
```

```bash
node spikes/work-real/snapshot.ts <mission id printed by feed.ts>
```

Stop the dev server afterwards; it leaves only `examples/work/.architect/` behind, which is ignored.
