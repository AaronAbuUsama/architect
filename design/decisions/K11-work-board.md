# K11: the work board

Draft, 18 November 2026, by the 🗂 work-board thread under "Who decides" in `AGENTS.md`. The architecture below is
decided. The board's UX waits on Aaron's answers to the grill round (Q1 to Q5 at the end); each answer is recorded
here with its date before anything is drawn.

## Aaron's words (18 November 2026, by speech)

> "We can build this as a plugin, but ultimately we need to have a system where we can have a Kanban type deal with
> work on it. We need a way to put work on that board (a manager agent), and we need a system of executing on the work
> with the maximum bandwidth and speed and minimum time."

> "We want everything to be small and modular … loads of experiments … what stays on production is just straight
> clean."

## The answer in one paragraph

Work is a feature, `@orthograph/work`, mounted with one file. A **work item** is stored: a title, a brief, a done-when
check, the items it needs, the paths it will touch, and a column given by its machine. People and agents move items
with the same operations, so the board is those operations drawn. Only a fact closes an item: the `close` move belongs
to the logbook's verdict, never to a person or the agent that did the work (F5 call 5 kept). The **manager** is an
agent with the work operations as its tools: it turns a goal (Aaron's words, a spec, a failing check, ledger rows, or
the model's own gaps) into a plan of items with their needs and touches, which lands on the board in one call.
**Dispatch** is a workflow per board: it claims ready items whose needs are done and whose touches don't overlap
anything running, critical path first, up to the board's limit, and starts each as an agents-feature run in a
sandbox. The factory (K10) runs the work; the board never knows a sandbox exists. The board is an extension of the
one portal, built on HeroUI Pro's Kanban parts with our own state (`spikes/kanban-components`).

## What changes in earlier decisions

| Was | Now | Why |
|---|---|---|
| F5 call 2: "a task is not a thing … worked out, never stored" | An **item** is stored. The derived view (each kind over each subject, F5's `mission.tasks`) becomes one **source** the manager reads to file items | A board you can put work on needs work that exists before a fact does: Aaron's words, a spike, a fix. A stored item can't disagree with its facts because its `close` move is taken only by a verdict |
| F5's `mission`, `milestone` | `goal` (the why, with an owner and a source). Milestones become the plan's groups, a field on the item | One level fewer; the board's lanes do what milestones did |
| F5's `run` | `claim`: who works an item, until when, and which agents-feature run (if any) | FAC-12: the factory references an agents run and never contains it |
| K5 decision 2 parked "separate plans and factory surfaces" | The board is an **extension** of the one portal, not a separate surface | It keeps K5's rule (one portal) and serves Aaron's ask |
| K4 parked Dispatch | Dispatch is decided here, as the work feature's workflow | Aaron asked for it by name, with "maximum bandwidth" |
| M3.09 "tasks derived" | "the model's gaps as a source": the derivation files items instead of being the board | as above |

F5 calls 3 to 8 stand: rows not actors, facts in the logbook, intake as `question`, `attention` for what stays
Aaron's, the refusal codes.

## The work feature

Mounted with `ortho add feature @orthograph/work` (M1.10), so `blueprint/features/work.ts` is its one file:

```ts
// blueprint/features/work.ts: the mount is `work`
import { Blueprint } from "orthograph";
import work from "@orthograph/work";

export default Blueprint.use(work, (w) => [
  w.choose(w.choices.workers.people),          // `agents` once M4.13 lands: dispatch starts agents-feature runs
  w.choose(w.choices.closer.logbook),          // what may take `close`: the logbook's verdicts
]);
```

Its things, in its own package (`@orthograph/work/blueprint/things/…`):

| Thing | Lives | What it is |
|---|---|---|
| `goal` | database | Why work exists: title, owner, source (`words`, `spec`, `check`, `ledger`, `model`), state |
| `item` | database | One unit of work a worker can finish in one sitting, with a done-when check |
| `claim` | database | One worker on one item: holder, lease until, attempt, the agents run (if any) |
| `board` | database | A view: which goals, lanes, column limits, the running limit (the concurrency) |
| `question` | database | Intake, as F5: asked by the manager, answered by a person, or spiked |
| `attention` | database | What only a person decides, as F5: promote, money, credential, question, plus `plan` |

The item:

```ts
// @orthograph/work/blueprint/things/item/thing.ts
export const Item = Blueprint.thing({
  description: "One unit of work, finished in one sitting, closed only by a fact.",
  fields: {
    id: Blueprint.id("itm"),
    goal: Goal.fields.id,
    title: Title,
    brief: Brief,                 // what to do; the agent's whole prompt for an agent worker
    check: DoneWhen,              // the fact that closes it: a journey's verdict, a gate, a README merged
    needs: ItemIds,               // items that must be done first; acyclic, checked by `goal.plan`
    touches: PathGlobs,           // what it may write; two running items never share a path
    worker: WorkerKind,           // `person`, or an agent type (`builder`, `author`, `spike`)
    group: GroupName,             // the plan's slice: what milestones were
    rank: Rank,                   // the person's order within a column; dispatch's tie-breaker
  },
  code: "WI",
});
```

Its machine. The columns are these states (Q1 asks whether the board shows them as they are):

```ts
// @orthograph/work/blueprint/things/item/machine.ts
export const machine = Blueprint.machine(Item, {
  states: ["backlog", "ready", "running", "review", "done", "blocked", "dropped"],
  moves: {
    file:    { from: [], to: "backlog", emits: Events.ItemFiled },             // the manager or a person
    ready:   { from: ["backlog", "blocked"], to: "ready", emits: Events.ItemReady },
    shelve:  { from: ["ready"], to: "backlog", emits: Events.ItemShelved },
    claim:   { from: ["ready"], to: "running", emits: Events.ItemClaimed },    // dispatch, or a person taking it
    release: { from: ["running"], to: "ready", emits: Events.ItemReleased },   // lease lapsed, or handed back
    submit:  { from: ["running"], to: "review", emits: Events.ItemSubmitted }, // a branch or a pull request exists
    return:  { from: ["review"], to: "ready", emits: Events.ItemReturned },    // CI red, review asked for changes
    close:   { from: ["review"], to: "done", emits: Events.ItemClosed },       // a fact: the check's verdict passed
    block:   { from: ["ready", "running"], to: "blocked", emits: Events.ItemBlocked }, // retries spent; attention raised
    drop:    { from: ["backlog", "ready", "blocked"], to: "dropped", emits: Events.ItemDropped },
  },
});
```

Its operations, one per move plus the reads, all generated into the CLI, SDK, MCP and actions:

| Operation | Allowed | Refusals |
|---|---|---|
| `goal.open`, `goal.plan`, `goal.start`, `goal.stop` | the goal's owner; `plan` also the manager, via agent | `PlanHasCycle`, `PlanTouchesOverlap` (warning, see below), `GoalHasOpenQuestions` |
| `item.file`, `item.edit`, `item.ready`, `item.shelve`, `item.rank`, `item.drop` | the goal's owner, the manager | `MoveNotAllowed`, `ItemClaimed` |
| `item.claim` | dispatch (`service(work)`), or a person for a `person` item | `NeedsOpen`, `FilesBusy`, `BoardFull`, `ItemClaimed` |
| `item.release`, `item.submit` | the claim's holder; dispatch on lease expiry | `NotYourClaim` |
| `item.return` | the reviewer, or `service(logbook)` on a red verdict | |
| `item.close` | `service(logbook)` only: `on: logbook.events.verdictRecorded` | `OnlyAFactCloses` for anyone else |
| `claim.renew` | the holder | `ClaimLapsed` |
| `board.get`, `board.items`, `item.get`, `goal.list` | the owner, the manager | |

`goal.plan` files a whole plan in one commit: the items, their needs (checked acyclic) and their touches. Two items
with overlapping touches and no `needs` edge between them are allowed (dispatch keeps them apart), but the answer
lists the overlaps, because they serialise and so cost throughput.

## The manager

The manager is an agent of the agents feature (M4), declared with the work operations as its only tools, as in
`frame/examples/factory.md`. Before M4 the manager is a person (Aaron, or a Claude Code session) calling the same
operations through the CLI or MCP: the floor.

```ts
// blueprint/agents/manager.ts
export default Blueprint.agent({
  instructions: "./manager.md",
  operations: [goal.open, question.ask, goal.plan, item.edit, item.drop, attention.raise, board.items],
  limits: { maxUsd: 3, wall: "1 day" },
});
```

Its flow, the same for every source:

1. **A goal arrives.** `goal.open` with a source: Aaron's words (from the portal's chat, M4.16), a spec or decision
   file, a failing check (a red verdict through `on:`), ledger rows with no owner, or the model's gaps (blanks,
   journeys red on empty handlers: F5's derivation, now a source).
2. **Intake.** The manager asks what it can't work out (`question.ask`). `goal.start` is refused while a question is
   open, as F5.
3. **Plan.** It splits the goal into items, each finishable in one sitting with one done-when check, each with its
   `needs` and `touches`, and calls `goal.plan` once. Splitting rules it follows: an item touches as few paths as it
   can; journeys and checks are their own items, by a different worker, needed by the build items (AGENTS.md); a
   decision is its own item, needed by what depends on it; two items that must land together are one item.
4. **Approval** (Q3 asks how much). The plan lands as an `attention` of kind `plan`, or straight into `ready`.
5. **Replan on events.** An item blocked, returned twice, or a new failing check wakes the manager, which edits,
   splits or drops items. It never moves an item to `done`.

The manager's loop is a workflow per goal (M3.10's shape): it waits on events, not on a clock, and each decision is
one agents run, so a replay never plans twice.

## Dispatch

One workflow per board, woken by `ItemReady`, `ItemSubmitted`, `ItemReleased`, `ItemClosed`, a lapsed lease, or a run
finishing. Each wake does one pass:

1. **The ready set.** Items in `ready` whose `needs` are all `done`.
2. **Remove conflicts.** Drop any item whose `touches` overlap a running item's. The rest may run together.
3. **Order.** Longest remaining dependency chain first (the critical path, so the whole plan finishes soonest), then
   the person's `rank`, then age.
4. **Slots.** `min(board limit − running, the goal's budget slots, the worker pool's free slots per agent type)`.
5. **Claim and start.** For each item in order, while slots remain and it doesn't overlap one claimed in this pass:
   `item.claim` (idempotent on item and attempt), then the factory's start (the seam below). The claim carries a lease
   (ten minutes, renewed by the run's heartbeat).

Rules around it:

- **Leases.** A lease that lapses releases the item (`item.release`, attempt + 1). A person's claim has a longer lease
  and no heartbeat.
- **Retries.** A run that fails for a transient reason (sandbox lost, model error) is retried with backoff through
  `Timers`, three attempts; the fourth failure `block`s the item and raises attention. A run that finishes but whose
  check goes red is not a retry: the item is `return`ed and the manager sees it.
- **What blocks what.** `needs` (declared), `touches` (overlap at claim time), the board's limit, the goal's budget.
  After a run, the files its branch actually changed are compared with `touches`: a spill marks the item in review,
  so the manager can widen `touches` or split.
- **Throughput.** Dispatch never tries a claim it knows will be refused: the spike's agents, pushing moves at a full
  board, were refused 14 times in 16 (`spikes/kanban-components`, finding 7).
- **Work stays small.** A plan whose items mostly overlap serialises; `goal.plan`'s answer says so, and the manager
  re-splits.

## The seam with the factory (K10)

The factory runs the work; it doesn't decide it. Proposed to the 📐 factory thread through the conductor:

```ts
// out: work → agents feature (M4.13): one call per claim
agents.run.start({
  agent: item.worker,                       // `builder`, `author`, `spike`
  model, budget,
  brief: item.brief,                        // plus the done-when check and the touches, rendered
  workspace: { repo, base: "main", branch: `work/${item.id}-${claim.attempt}`, touches: item.touches },
  key: `${claim.id}`,                       // the request key: a replay starts nothing twice
});

// back: agents feature → work, through `on:`
on: [
  Blueprint.on(agents.events.runFinished, (e) => ({ claim: e.key, branch: e.branch })), // → item.submit
  Blueprint.on(agents.events.runFailed,   (e) => ({ claim: e.key, transient: e.transient })), // → retry or block
  Blueprint.on(agents.events.runHeartbeat, (e) => ({ claim: e.key })),                  // → claim.renew
]
```

Open for K10: whether `workspace` is the agents feature's or the factory's (sandbox) field; whether the run or work
opens the pull request; the heartbeat's period.

## The board in the portal

An extension of the one portal, built on HeroUI Pro's Kanban parts with our own hook (the spike's
`useServerColumn`). Needs given to the portal thread (M1.25) through the conductor:

1. An extension slot for a feature's page, with the generated actions of that feature as its only writes.
2. The item's machine on the client, from the model, so an illegal column refuses a drop before any call.
3. Each action's typed refusals, to show on the card.
4. Live updates per board (FAC-08): a card moves when an agent moves it.
5. The `attention` items as a "needs you" surface the portal shows everywhere, not only on the board.
6. The manager's conversation (M4.16) bound to a goal.
7. HeroUI Pro's `DataGrid` (virtualised) for the long backlog and done columns.

## The order

| When | Slice or spike | Needs | Done when |
|---|---|---|---|
| now | 🧪 `spikes/kanban-components` | nothing | merged (this PR) |
| now | 🧪 `spikes/dispatch-sim`: the dispatch rules on a synthetic plan with fake workers, critical path first against first-in first-out, touches on and off | K11 | its README gives makespan and conflicts for each rule |
| now | 🧪 `spikes/work-board`: the board over `examples/work`'s generated API, the manager as a Claude Code session calling the CLI, on goal "links stage 1" | K11's Q1 to Q5 | one real goal planned, dispatched to people, closed by facts |
| M3 | M3.04 to M3.11 reshaped by K11 (journeys, the package, handlers, dispatch, the manager) | M1.10, Gate M2 | see `milestones.md` |
| M3 | M3.17 the board extension (replaces parked M3.14) | M1.13, M1.25 | the board in the portal matches `work board items` |
| M4 | M4.13 the join: dispatch starts agents runs | M4.10, K10 | an item dispatched to an agents run closes by its verdict |

## The grill: what waits on Aaron

Put to Aaron on 18 November 2026; answers recorded here with their date.

- **Q1.** What are the board's columns: the item's states as they are, or columns a person names?
- **Q2.** What may a person drag?
- **Q3.** When the manager plans a goal, does the plan start by itself?
- **Q4.** What are the lanes?
- **Q5.** What happens when an agent moves a card while you're looking at it?
