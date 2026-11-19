# K11: the work board

Decided 18 November 2026: the architecture by the 🗂 work-board thread under "Who decides" in `AGENTS.md`, the
board's behaviour by Aaron's answers to the grill round the same evening ("Aaron's answers" at the end).

## Aaron's words (18 November 2026, by speech)

> "We can build this as a plugin, but ultimately we need to have a system where we can have a Kanban type deal with
> work on it. We need a way to put work on that board (a manager agent), and we need a system of executing on the work
> with the maximum bandwidth and speed and minimum time."

> "We want everything to be small and modular … loads of experiments … what stays on production is just straight
> clean."

## The answer in one paragraph

Work is a feature, `@orthograph/work`, mounted with one file. Anything that might be work arrives in an **inbox**:
a GitHub issue, a Slack message, an alert, Aaron's words. What comes from an **authority** is work at once; anything
else is triaged and may become work. A **work item** is stored: a title, a brief, a done-when check, the items it
needs, the paths it will touch, and a column given by its machine. People and agents move items with the same
operations, so the board is those operations drawn. An item is closed by a fact (a verdict) or by an authority in
person, which is recorded as a fact; never by an agent, including the one that did the work. An authority agrees a
**goal** once; the **manager** is an agent that then carries as much of that authority as it can: it proposes the
goal's milestones and items, with their needs and touches, and runs them without asking again.
**Dispatch** is a workflow per board: it claims ready items whose needs are done and whose touches don't overlap
anything running, critical path first, up to the board's limit, and starts each as an agents-feature run in a
sandbox. The factory (K10) runs the work; the board never knows a sandbox exists. The board is an extension of the
one portal, built on HeroUI Pro's Kanban parts with our own state (`spikes/kanban-components`). (Through `@orthograph/portal-ui`, F7.)

## What changes in earlier decisions

| Was | Now | Why |
|---|---|---|
| F5 call 2: "a task is not a thing … worked out, never stored" | An **item** is stored. The derived view (each kind over each subject, F5's `mission.tasks`) becomes one **source** the manager reads to file items | A board you can put work on needs work that exists before a fact does: Aaron's words, a spike, a fix. A stored item can't disagree with its facts because its `close` move is taken only by a verdict |
| F5 call 5: only a fact moves a card to done | A fact, or an authority in person, closes an item; the person's close is written to the logbook as an `accepted` verdict, so a fact still exists. An agent never closes | Aaron, Q2: "person … can close a thing" |
| F5's `mission`, `milestone` | `goal` (an outcome an authority agreed: finite or standing) and `milestone` (a step the manager proposes toward it) | Aaron, Q3: the goal is agreed, the manager suggests the milestones |
| F5's mission start ("only when you press Start") and a plan approval | One agreement per goal. The manager's plan, milestones and items need no further yes | Aaron, Q3: "you give one authority and the manager carries as much authority as possible" |
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
  w.authority([owner]),                        // who may agree goals and close in person; signals from them skip the inbox
]);
```

Its things, in its own package (`@orthograph/work/blueprint/things/…`):

| Thing | Lives | What it is |
|---|---|---|
| `goal` | database | An outcome an authority agreed: finite (done when its check passes) or standing (a measure kept or climbed) |
| `milestone` | database | A step toward a goal, proposed by the manager: a group of items with its own check |
| `item` | database | One unit of work a worker can finish in one sitting, with a done-when check; starts in the inbox unless an authority filed it |
| `claim` | database | One worker on one item: holder, lease until, attempt, the agents run (if any) |
| `board` | database | A view: which goals, lanes, column limits, the running limit (the concurrency) |
| `question` | database | Intake, as F5: asked by the manager, answered by a person, or spiked |
| `attention` | database | What only a person decides, as F5: promote, money, credential, question, plus `goal` (a goal the manager proposes from a signal) |

## Words

| Word | Meaning |
|---|---|
| **Signal** | Something that arrived: a GitHub issue, a Slack message, an alert, a failing check, Aaron's words. It lands as an item in `inbox`. It is not yet work |
| **Authority** | Who may make work and agree goals: the board's owner (Aaron), and whoever he names. A signal from an authority skips the inbox |
| **Goal** | An outcome an authority agreed. **Finite**: done when its check passes ("links stage 1"). **Standing**: a measure to keep or climb, never done ("p95 under 200 ms", "no ledger item without an owner") |
| **Milestone** | A step toward a goal, proposed by the manager, with its own check. A standing goal's milestones are its next climbs |
| **Plan** | The manager's current milestones and items for a goal. It changes freely, without asking: the goal is what was agreed |
| **Item** | One unit of work, finished in one sitting, with one done-when check |
| **Triage** | Deciding what a signal from a non-authority is: an item under an agreed goal, a proposed new goal, or nothing |

The item:

```ts
// @orthograph/work/blueprint/things/item/thing.ts
export const Item = Blueprint.thing({
  description: "One unit of work, finished in one sitting, closed only by a fact.",
  fields: {
    id: Blueprint.id("itm"),
    goal: Blueprint.optional(Goal.fields.id), // set by triage; an inbox item may have none
    title: Title,
    brief: Brief,                 // what to do; the agent's whole prompt for an agent worker
    task: Blueprint.optional(TaskKey), // a model gap's key, `build:link.create`; absent for work from words
    check: DoneWhen,              // the fact that closes it: a journey's verdict, a gate, a README merged
    needs: ItemIds,               // items that must be done first; acyclic, checked by `goal.plan`
    touches: PathGlobs,           // what it may write; two running items never share a path
    kind: ItemKind,               // `build`, `fix`, `improve`, `write:journey`, `review`, `spike`, `specify` (K10, M3.09)
    worker: Worker,               // `person` or `agent`; an agent's role is `factory.roster.for(kind)`, a board may override it
    milestone: Blueprint.optional(Milestone.fields.id), // the step it belongs to; none while in the inbox
    source: Source,               // `words`, `github`, `slack`, `alert`, `check`, `ledger`, `model`, with a link back
    rank: Rank,                   // the person's order within a column; dispatch's tie-breaker
  },
  code: "WI",
});
```

Its machine. The board's columns are these states, `inbox` first (Aaron, Q1); `blocked` shows as a badge in place
and `dropped` is hidden:

```ts
// @orthograph/work/blueprint/things/item/machine.ts
export const machine = Blueprint.machine(Item, {
  states: ["inbox", "backlog", "ready", "running", "review", "done", "blocked", "dropped"],
  moves: {
    receive: { from: [], to: "inbox", emits: Events.ItemReceived },            // a signal from anyone else
    file:    { from: [], to: ["backlog", "ready"], emits: Events.ItemFiled },  // an authority, or the manager; a plan files into ready
    accept:  { from: ["inbox"], to: ["backlog", "ready"], emits: Events.ItemAccepted }, // triage: it is work
    dismiss: { from: ["inbox"], to: "dropped", emits: Events.ItemDismissed },  // triage: it is not
    ready:   { from: ["backlog", "blocked"], to: "ready", emits: Events.ItemReady },
    shelve:  { from: ["ready"], to: "backlog", emits: Events.ItemShelved },
    claim:   { from: ["ready"], to: "running", emits: Events.ItemClaimed },    // dispatch only; for a person worker it assigns the item
    release: { from: ["running"], to: "ready", emits: Events.ItemReleased },   // lease lapsed, or handed back
    submit:  { from: ["running"], to: "review", emits: Events.ItemSubmitted }, // a branch or a pull request exists
    return:  { from: ["review"], to: "ready", emits: Events.ItemReturned },    // CI red, review asked for changes
    close:   { from: ["backlog", "ready", "review", "blocked"], to: "done", emits: Events.ItemClosed }, // a verdict, or an authority in person
    block:   { from: ["ready", "running"], to: "blocked", emits: Events.ItemBlocked }, // retries spent; attention raised
    drop:    { from: ["backlog", "ready", "blocked"], to: "dropped", emits: Events.ItemDropped },
  },
});
```

Its operations, one per move plus the reads, all generated into the CLI, SDK, MCP and actions:

| Operation | Allowed | Refusals |
|---|---|---|
| `goal.open`, `goal.agree`, `goal.stop` | an authority; `open` also the manager, which then waits on a `goal` attention | `GoalHasOpenQuestions` |
| `goal.plan` | the manager, under an agreed goal | `GoalNotAgreed`, `PlanHasCycle`; overlapping touches are not refused but listed in the answer (below) |
| `item.receive` | any signal source: an adapter's event through `on:`, or anyone signed in | |
| `item.accept`, `item.dismiss` | an authority, or the manager under an agreed goal | `GoalNotAgreed` |
| `item.file`, `item.edit`, `item.ready`, `item.shelve`, `item.rank`, `item.drop` | an authority, the manager | `MoveNotAllowed`, `ItemClaimed` |
| `item.claim` | dispatch (`service(work)`) only: a person puts work in ready, dispatch starts it; a person never calls `claim` | `NeedsOpen`, `FilesBusy`, `BoardFull`, `ItemClaimed` |
| `item.block` | dispatch (`service(work)`), when retries are spent or a run ends `blocked`; raises attention in the same call | `MoveNotAllowed` |
| `item.release`, `item.submit` | the claim's holder; dispatch on lease expiry | `NotYourClaim` |
| `item.return` | the reviewer, or `service(logbook)` on a red verdict | |
| `item.close` | `service(logbook)` on a verdict; or an authority in person (`authority.notVia(Via.agent)`), which writes an `accepted` verdict first | `OnlyAFactCloses` for an agent, `ItemClaimed` while running |
| `claim.renew` | the holder | `ClaimLapsed` |
| `board.get`, `board.items`, `item.get`, `goal.list` | the owner, the manager | |

A person drags an item into backlog or ready, reorders within them, and drags to done to close it (Aaron, Q2). Every
other column is the system's: dispatch claims, runs submit, verdicts close or return. On the board those columns refuse
a person's drop on hover, from the item's machine and the caller's roles in the model.

`goal.plan` files a whole plan in one commit, straight into `ready` (the goal is already agreed): the milestones, the
items, their needs (checked acyclic) and their touches. Dispatch's ready set then waits on each item's needs. Two items
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
  operations: [item.accept, item.dismiss, item.file, item.ready, goal.open, question.ask, goal.plan, item.edit, item.drop,
    attention.raise, board.items],
  limits: { maxUsd: 3, wall: "1 day" },
});
```

Its flow:

1. **A signal arrives.** From an authority (Aaron's words in the portal's chat, M4.16, or a file he names) it is
   work: `item.file`, or `goal.open` when it is an outcome rather than a task. From anywhere else (a GitHub issue, a
   Slack message, an alert, a failing check, a ledger row, a model gap) it lands in the inbox with `item.receive`.
2. **Triage.** The manager reads each inbox item. If it serves an agreed goal (an alert on a measure a standing goal
   keeps, a failing check on a finite goal's work), it accepts it under that goal with no one asked: the goal's
   agreement is the authority. If it suggests a new outcome, the manager opens a proposed goal and raises a `goal`
   attention. Otherwise it dismisses it, with the reason.
3. **Agreement, once.** An authority agrees a goal (`goal.agree`), after the manager's questions (`question.ask`;
   `goal.agree` is refused while one is open). That is the only yes the goal needs.
4. **Plan.** The manager proposes the goal's milestones and splits each into items, each finishable in one sitting with
   one done-when check, with its `needs` and `touches`, and calls `goal.plan`. It runs at once. Splitting rules: an item
   touches as few paths as it can; journeys and checks are their own items, by a different worker, needed by the build
   items (AGENTS.md); a decision is its own item, needed by what depends on it; two items that must land together are
   one item.
5. **Climb a standing goal.** A standing goal has a measure, not an end. The manager plans the next milestone that
   moves the measure, and replans when a signal says it slipped.
6. **Replan on events.** An item blocked, returned twice, or a new failing check wakes the manager, which edits,
   splits or drops items. It never closes an item. What it can't decide alone (money over the goal's share, a
   credential, a promote) is attention, as F5.

The manager's loop is a workflow per goal (M3.10's shape): it waits on events, not on a clock, and each decision is
one agents run, so a replay never plans twice.

## Dispatch

One workflow per board, woken by `ItemReady`, `ItemSubmitted`, `ItemReleased`, `ItemClosed`, a lapsed lease, or a run
finishing. Each wake does one pass:

1. **The ready set.** Items in `ready` whose `needs` are all `done`.
2. **Remove conflicts.** Drop any item whose `touches` overlap a running item's. The rest may run together.
3. **Order.** Longest remaining dependency chain first (the critical path, so the whole plan finishes soonest), then
   the person's `rank`, then age.
4. **Slots.** `min(board limit − running, the goal's budget slots, the worker pool's free slots per role)`.
5. **Claim and start.** For each item in order, while slots remain and it doesn't overlap one claimed in this pass:
   `item.claim` (idempotent on item and attempt), then the factory's start (the seam below).
6. **Review pass.** Each item in `review` with no `review` verdict for its branch's revision and no live review run
   gets one: a claim that leaves the item in `review`, and a run of `factory.roster.for("review")` on the item and
   revision. It writes nothing, so it never conflicts, but it takes a slot. Its outcome is `reviewed`; the verdict it
   records closes or returns the item through the logbook's event.

Rules around it:

- **Claims end with their run.** An agent's claim holds while its agents run is working or waiting, and ends on the
  run's `runFinished` or `runFailed`; a durable run needs no heartbeat (from M4.13). A claim dispatch makes for a
  person worker assigns the item to them and carries a lease (a day, renewed by `claim.renew`); a lapsed lease
  releases the item (`item.release`, attempt + 1).
- **Retries.** A run that fails for a transient reason (sandbox lost, model error) is retried with backoff through
  `Timers`, three attempts; the fourth failure `block`s the item and raises attention. A run that finishes but whose
  check goes red is not a retry: the item is `return`ed and the manager sees it.
- **What blocks what.** `needs` (declared), `touches` (overlap at claim time), the board's limit, the goal's budget.
  After a run, the paths its branch changed (`runFinished.changed`) are compared with `touches`: a spill marks the
  item in review, so the manager can widen `touches` or split.
- **Where `touches` comes from.** For an item with a task key (a model gap), it is the factory's
  `factory.brief.of({ task }).write`, computed from the model with nothing run (today's `ortho brief`,
  `packages/cli/src/modules/brief/service.ts:19-43`: one handler file per operation). For an item from words, a spec
  or the ledger, the manager declares it at plan time. An experiment's write set is its own plugin package and its
  one mount file, so two experiments never conflict.
- **Throughput.** Dispatch never tries a claim it knows will be refused: the spike's agents, pushing moves at a full
  board, were refused 14 times in 16 (`spikes/kanban-components`, finding 7).
- **Work stays small.** A plan whose items mostly overlap serialises; `goal.plan`'s answer says so, and the manager
  re-splits.

## The seam with the factory (K10)

The factory runs the work; it doesn't decide it. Agreed with the 📐 factory thread through the conductor on
18 November 2026, every point confirmed by the factory thread (K10, recorded in its own decision). Its packages: `@orthograph/agents` (runs), `@orthograph/workspaces`
(sandboxes, opened by the factory's agents, never by work) and `@orthograph/factory` (the building agents and
`factory.roster`).

```ts
// out: work → agents feature (M4.13): one call per claim
agents.run.start({
  agent: factory.roster.for(item.kind),     // declared data: builder ← build, fix; author ← write:journey; …
  budget,
  brief: {
    project, revision,
    task: item.task,                        // a model gap's key; the factory derives the full brief (`bp.brief`)
    item: { id: item.id, text: item.brief, doneWhen: item.check }, // for work that is not a model gap
  },
  key: claim.id,                            // the request key: the DO host namespaces tool calls under it
});
// refused WorkspacePoolFull or RunPoolFull: a slot signal, dispatch stops the pass for that role

// back: agents feature → work, through `on:`
on: [
  Blueprint.on(agents.events.runFinished, (e) => e),   // outcome: "pushed" | "reviewed" | "answered" | "blocked"
  Blueprint.on(agents.events.runFailed, (e) => e),     // reason: "budget" | "turns" | "wall" | "refused" | "model" | "sandbox" | "crash"
  Blueprint.on(agents.events.runCancelled, (e) => e),  // never a failure
]
```

What work does with each answer:

| Event | Work's move |
|---|---|
| `runFinished`, `pushed` (branch, pull request, revision, changed) | `item.submit`; `changed` checked against `touches`, a spill flagged in review |
| `runFinished`, `reviewed` (pass or fail, revision) | the review claim ends; the verdict is in the logbook, and its event takes `close` or `return` |
| `runFinished`, `answered` (no branch) | `item.submit` with no branch; such an item's done-when must be a `review` verdict |
| `runFinished`, `blocked` (a question) | `item.block`, and `attention.raise` with the question; the run has ended |
| `runFailed`, `model`, `sandbox` or `crash` (transient) | `item.release`, retried with backoff through `Timers`, three attempts, then `block` |
| `runFailed`, `budget`, `turns`, `wall` or `refused` | `item.block` and attention: the manager re-splits or re-briefs |
| `runCancelled` | `item.release`, no attempt counted |

The five points, as agreed:

1. **Dispatch is `agents.run.start`**, keyed by the claim. The brief carries the task key when the item is a model
   gap, and the item's own text and done-when check when it isn't: Aaron's words have no task key. The DO host
   namespaces tool-call keys as (DO id, Pi task id, provider call id), so a replayed dispatch starts nothing and pays
   nothing twice.
2. **Results come back as events**, with the closed enums above. A run never closes an item. The pull request is
   opened by `workspace.push({ workspace, title, body })`, run as the agent acting for whoever started the run,
   through the github adapter; it answers `{ branch, pullRequest, revision, changed }`, which `runFinished` copies.
   Without a push a run has no branch.
3. **Review is a fact.** One `review` verdict kind in the logbook, keyed by revision, whether a person or an agent
   gives it, built early in M3.20 (K10) because the board and K10's experiments both close on it; `accepted`, an
   authority's close in person, is a verdict kind beside it. Dispatch sends every item in `review` to the reviewer
   (step 6 above). An item's done-when names the verdicts it needs (prove, review), and `item.close`, `service(logbook)`
   only, fires when all are recorded for its branch's revision.
4. **Work owns dispatch policy**: concurrency, the cap's share, retries, and the kind-to-role map, defaulting to
   `factory.roster` (builder: build, fix, improve; author: write:journey; reviewer: review; spike: spike; planner:
   specify; the designer is chat only). An item carries its `kind`, never a role, so the roster is written once.
5. **The factory opens workspaces.** Work sees run ids, branches, pull requests and changed paths. No heartbeat.

## The board in the portal

An extension of the one portal, built on HeroUI Pro's Kanban parts with our own hook (the spike's
`useServerColumn`). The portal renders it through `views.list` as `Portal.view.board({ by: machine })` on the item
thing: the columns are the item's machine states, and every board page belongs to a thing. Needs given to the portal thread (M1.25) through the conductor:

1. An extension slot for a feature's page, with the generated actions of that feature as its only writes.
2. The item's machine on the client, from the model, so an illegal column refuses a drop before any call.
3. Each action's typed refusals, to show on the card.
4. Live updates per board (FAC-08): a card moves when an agent moves it.
5. The `attention` items as a "needs you" surface the portal shows everywhere, not only on the board.
6. The manager's conversation (M4.16) bound to a goal.
7. HeroUI Pro's `DataGrid` (virtualised) for the long backlog and done columns. (Through `@orthograph/portal-ui`'s `Grid`, F7.)
8. From Aaron's answers: `inbox` as the first column; one lane per goal with "Needs you" pinned on top (Q4); live
   updates held still while a card is held, then applied with the changed cards highlighted (Q5); a person's drop
   refused on hover for every column but backlog, ready and done (Q2).

## The order

| When | Slice or spike | Needs | Done when |
|---|---|---|---|
| now | 🧪 `spikes/kanban-components` | nothing | merged (this PR) |
| now | 🧪 `spikes/dispatch-sim`: the dispatch rules on a synthetic plan with fake workers, critical path first against first-in first-out, touches on and off | K11 | its README gives makespan and conflicts for each rule |
| now | 🧪 `spikes/work-board`: the board over `examples/work`'s generated API, the inbox fed by this repository's GitHub issues through `gh` (throwaway; the real path is M4.25's adapter), the manager as a Claude Code session calling the CLI, on the agreed goal "links stage 1" | K11 | one real goal planned, dispatched to people, closed by facts |
| M3 | M3.04 to M3.11 reshaped by K11 (journeys, the package, handlers, dispatch, the manager) | M1.10, Gate M2 | see `milestones.md` |
| M3 | M3.17 the board extension (replaces parked M3.14) | M3.06, M1.13, M1.25 | the board in the portal matches `work board items` |
| M5 | M5.14 signals from GitHub issues (the github adapter of M4.25, not a second one), Slack and alerts: their adapters' events received into the inbox through `on:` | M5.03, M3.19, M4.25 | a Slack message and a fired alert each land once in the inbox, and an alert on a standing goal's measure is accepted under it |
| M4 | M4.13 the join: dispatch starts agents runs; the manager as an agent triages and plans | M4.10, M4.11, the K10 seam | an item dispatched to an agents run closes by its verdict; a failing check is accepted under its goal with no one asked |

## Aaron's answers (18 November 2026, by speech)

- **Q1, the columns: the item's states, with an inbox before them.** "I think there is one before, like an inbox. It
  could be from GitHub issue, Slack channel, anywhere. It's not specified as worthy of work. Like if it came from an
  authority source (me) it's definitely work, but something like an observability alert may turn into work." Hence
  the `inbox` state, `receive`, `accept`, `dismiss`, and authority.
- **Q2, what a person drags: into backlog or ready, and to done.** "Person can drag something into to-do or backlog,
  and can close a thing." Hence `item.close` for an authority in person, recorded as an `accepted` verdict, and
  `item.claim` for dispatch only.
- **Q3, a plan's start: the goal is agreed once, and the manager carries the authority.** "A plan has got to be agreed
  in the first place, or a goal has got to be agreed in the first place, right? And then the agent is suggesting the
  milestones for that goal, or it might be a continuous goal that you just hill-climb towards … You give one authority
  and the manager carries as much authority as possible." Hence "Words", finite and standing goals, `goal.agree`, and
  no plan approval.
- **Q4, lanes: one per goal, "Needs you" pinned on top.** "Agreed."
- **Q5, live moves: live, held still while a card is held, changed cards highlighted.** "Agreed."
