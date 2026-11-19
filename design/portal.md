# The portal's design (M1.25)

Agreed with Aaron on 19 November 2026, over two grill rounds (answers below, with their dates). This is the spec that
M1.13 (the portal's pages), M1.24 (the shell), M4.16 (the chat), M4.23 (the Factory face) and M3.17 (the board)
build to. The drawing is in [`../spikes/portal-mock/`](../spikes/portal-mock/README.md).

**The idea in one line.** The portal shows a blueprint's declared behaviour, generated from the model, and lets live
evidence light up that same structure. It starts from things and their lifecycles, then operations, machines, events,
errors and notes attached to their thing. It is telemetry, not analytics: it counts calls, refusals, defects, moves
and time, and never counts or browses the app's stored data.

## Aaron's answers

### Round 1 (18 November 2026, by speech, relayed by the conductor)

- **Q1, the chat: A.** "We are defo using Pi Durable for the portal's chat. We are going to make our own thing on top of
  Pi Durable that can automatically connect into any function and use the application, whatever it is you're building.
  But in the portal we are going to have a customised set of agents for building the application." So the chat is a
  Pi Durable run, with our own layer on top that reaches every action. The building agents (the factory) are K10's.
- **Q8, HeroUI Pro: neither A nor B.** "We're using it privately anyway, so it's no problem for now. If it ever does
  become a problem, we'll just clean-room the components that we need." So the portal is HeroUI Pro only, with no free
  face. **Fallback, recorded:** if Pro's licence ever blocks distribution, we clean-room the components the portal uses
  into our own package; the page contract stays as it is, so only the face changes. "HeroUI Pro behind one package (F7)"
  below settles how.

### Round 2 (19 November 2026, in the chat: "Agreed to all questions")

All recommended options, including the Q11 addendum carrying the factory's needs:

| # | Joint | Answer |
|---|---|---|
| 2 | The first page | A · one card per thing: its lifecycle strip and a stat block |
| 3 | The tree as plugins pile up | A · the app's own things first, then one folded group per plugin (`from` in the model) |
| 4 | What lights up on a lifecycle | A · move counts in the window, each refusal on the arrow it guards; no populations |
| 5 | An operation's page | A · the spine, drawn from the model and lit by live calls; the in-and-out band on top |
| 6 | The live rail | A · scoped to the page: stat blocks, a sparkline, the last calls |
| 7 | The chat | A · a drawer over the rail; conversations kept under the thing they touch (as Runs, see below) |
| 9 | Every action | A · the portal is a feature written in Orthograph, so its verbs are actions too |
| 10 | Sign-in and roles | A · the app's own auth, plus `owner` and `builder` roles in the portal feature |
| 11 | Extensions | A · a feature with a portal face: generated pages free, typed slots for custom views |
| 12 | Environments | A · one portal per environment, its own sink only, a switcher, proof from the logbook |

**Made consistent with K10 and K11 (merged after round 1).** K10 decision 9 and M4.16 say the chat is rendered with
HeroUI Pro's AI components over a Pi Durable run; round 1's wording said "Pi's surface". They agree once read
together: Pi Durable is the agent and the source of truth for the transcript (K10, H1.9), and what draws it is Pro's
`ChatConversation`, `ChatMessage` and `ChatTool`. Q7's "threads kept under their thing" becomes "Runs kept under the
thing they touch": a chat conversation is one `@orthograph/agents` Run (K10 section 1), so the portal feature owns no
thread thing of its own (K5:475 and M1.24's "threads as things in the portal's store" are superseded by this).

## The frame

```text
┌ top bar ───────────────────────────────────────────────────────────────────────────────────────────┐
│ links   [ local ▾ · last 30 min ]                         [⌘K search]   [Needs you 2]   [💬 chat] │
├ tree ──────────┬ reading column ──────────────────────────────────────────┬ live rail ────────────┤
│ links          │ the page: a thing, an operation, a view                  │ ● scoped to the page  │
│   ▸ profile    │                                                          │ stat blocks           │
│   ▸ link       │                                                          │ sparkline             │
│ handles · feat │                                                          │ last calls            │
│   ▾ handle     │                                                          │ (extension cards)     │
│     claim      │                                                          │                       │
│     release    │                                                          │  drawer slides over   │
│     resolve    │                                                          │  the rail: a trace,   │
│ auth · feat    │                                                          │  or the chat          │
│   ▸ person     │                                                          │                       │
│   ▸ session    │                                                          │                       │
│ portal · feat  │                                                          │                       │
└────────────────┴──────────────────────────────────────────────────────────┴───────────────────────┘
```

- **Place tells kind** (UX.md rule 2): the tree is the model, the reading column is one page of it, the rail is now,
  the drawer is detail.
- **The tree (Q3 A).** The app's own things first, then one folded group per mounted plugin, labelled with its kind.
  A thing folds to its operations. Its machine, events and errors are sections of its page, not tree rows (UX.md
  note 2). The portal's own things sit last, under `portal`.
- **The top bar.** The environment and window control (Q12), search over the model (`⌘K`), the "Needs you" count
  (K11's attention, from any mounted feature) and the chat.
- **Built on HeroUI Pro's app shell** (Aaron, Q8), always through `@orthograph/portal-ui` (F7): its sidebar, navbar,
  drawer, KPI and chat components. No free kit.

**Where each piece comes from.** Every table below marks its pieces:

- **G**, generated from the model (`model.json`), so nothing is written by hand;
- **L**, live, from the environment's telemetry or the logbook;
- **H**, hand-written. Each one is a **gap**, with its owner in "Gaps" at the end.

## The first page (Q2 A)

One card per thing, grouped as the tree is. Each card shows the thing's description, its lifecycle strip and a stat
block for the window. A card with a defect turns red; refusals stay amber, because a refusal is the app working.

```text
links
┌ profile ───────────────────────────────┐ ┌ link ──────────────────────────────────┐
│ A person's public page: their handle   │ │ One link on a profile, in order.       │
│ and their links, in order.             │ │ listed ──remove──► removed             │
│ (no lifecycle)                         │ │                                        │
│ calls 388  refused 2  defects 0  p95 4 │ │ calls 960 refused 11 defects 1● p95 9 │
└────────────────────────────────────────┘ └────────────────────────────────────────┘
handles · feature
┌ handle ────────────────────────────────┐
│ A name, claimed once.                  │
│ · ──claim──► claimed ──release──► released                                       │
│ calls 412  refused 37  defects 0  p95 6 ms of 150                               │
└────────────────────────────────────────┘
```

| Piece | Source | From |
|---|---|---|
| Groups and their order | G | `ThingModel.from: { kind, mount }` (gap 1) |
| Description, lifecycle strip | G | `ThingModel.description`, `MachineModel.states` and `moves` |
| calls, refused, defects | L | `ortho.calls` by operation and outcome (M1.20), summed per thing |
| p95 against budget | L, G | `ortho.call.duration` (M1.20); the budget from the operation's declared latency, if any (gap 2) |
| "Needs you" above the cards | L | each mounted feature's `attention` slot (Q11) |

## A thing's page

It opens on the lifecycle (UX.md note 8), then its operations, events, errors, roles, notes and the conversations
that touched it.

```text
handle                                                         handles · feature · @orthograph/handles 0.1.0
A name, claimed once.

Lifecycle                                           (window: local · last 30 min)
          claim  375                  release  3
  ( · ) ─────────────────► (claimed) ─────────────────► (released)
          ▲ HandleTaken ×31             ▲ HandleNotClaimed ×2
Operations
  claim    person   Claim a free name. A name is claimed once.      412 calls · 37 refused · p95 6 ms
  release  person   Give the name back.                               5 calls ·  2 refused · p95 5 ms
  resolve  anyone   Find a handle by its name. (read)               1,904 calls · 0 refused · p95 2 ms
Events     HandleClaimed { handle, name, owner } · HandleReleased { handle }
Errors     HandleTaken HN-001 exit 3 · HandleNotClaimed HN-002 exit 3
Roles      person · anyone
Notes (2)  "claim retries once on a version race; that's by design" (pinned to model 4e1c…, still current)
Conversations (1)  "why do releases get refused?"  · builder agent · 18 Nov
```

| Piece | Source | From |
|---|---|---|
| Header, plugin and version | G | `ThingModel`, `from`, the mount's package version |
| Lifecycle diagram | G | `MachineModel` |
| Move counts on each arrow | L | answered calls whose span carries `move.name` (the operation's span, M1.18); the operations list counts every call |
| Refusals on the arrow they guard | L, G | span outcome and error tag; the arrow from the operation's `move` |
| Operations list | G, L | `OperationModel` (description, `allowed`, read or write), with its window's stat |
| Events, errors, roles | G | `ThingModel.events`, `errors`, `roles` |
| Notes | L | the portal's `note` thing, kept in its own store (Q9), pinned to the model's hash; "stale" once the hash moves |
| Conversations | L | `@orthograph/agents` Runs whose `touches` is this thing (gap 3) |
| Extension sections | per slot | `sections.thing` (Q11) |

**No populations** (Q4 A): the page never says how many handles are in each state. That count is stored data, and a
plugin with a million rows would pay for it on every refresh.

## An operation's page (Q5 A)

On top, the in-and-out band: what goes in, the operation, what comes out, and the ways it can say no. Under it, the
spine: the fixed order every Effect operation runs in (`packages/language-effect/src/modules/handler/service.ts:41-84`),
drawn from the model, with each declared step in its place. Live calls run down it.

```text
handle.claim                               handles · feature · allowed: person · idempotent by request
Claim a free name. A name is claimed once.

 IN   name: HandleName ───────► handle.claim ───────► OUT  handle: HandleId
      refusals: HandleTaken HN-001 ×31 · NotAllowed ×6 · bad payload ×0          emits HandleClaimed

 the spine (from the model)            call 7f3a… by ada, 12:04:31, attempt 2, answered in 9 ms
 ├ role check     person               ▏ 0.1 ms  ok
 ├ replay         request key          ▏ miss
 ├ machine check  · → claimed          ▏ ok
 ├ step lookup    database             ▇▇ 2.0 ms
 ├ step insert    database             ▇ 1.1 ms
 ├ answer check                        ▏ ok
 ├ move claim     → claimed            ▏ HandleClaimed
 └ commit         1 store              ▇▇▇ attempt 1 conflict ─► attempt 2 committed  3.2 ms
     └ on: HandleClaimed → profile.create   (links)  ▇▇ 2.4 ms  committed
 [Try it]  (calls as you, through the SDK; locally as a cast member)       [open the full trace ▸]
```

| Piece | Source | From |
|---|---|---|
| In and out band | G | `OperationModel.payload`, `answer`, `errors`, `allowed`, `idempotent`, `emits` |
| Refusal counts | L | `ortho.calls` by error tag (M1.20), so refusals that open no span (`NotAllowed`, a bad payload) still count |
| The spine's rows | G | the spine's fixed order plus the operation's declared steps and their kinds (M1.03 puts steps in the model) |
| A finished call down the spine | L | the call's spans: the operation span, one per step, the commit span with `attempt` (M1.18) |
| A running call down the spine | L | step signals as each step starts and ends (M1.21) |
| What the commit set off | L | committed events read from the journal (M1.21) and the spans of their `on:` handlers |
| Try it | G | the operation's generated action (M1.22), called as the signed-in builder |
| Docs prose | G | the operation's `description`; the canon page it belongs to is linked, never copied |

**Reads** draw a shorter spine: role check, then the read. **A call that stopped** is marked on the row where it
stopped: the role check for `NotAllowed`, the machine check for a move from the wrong state, the handler for a
declared refusal, any row for a defect.

### The trace drawer

"Open the full trace" slides a drawer over the rail with the waterfall and every attribute that may be shown. Private
fields and untraced free text are never shown, in any environment (M1.19 traces a field only when it is public, and free
text only when marked). The example trace is always one worth
seeing: the claim above, with its commit conflict on attempt 1, the retry, the commit on attempt 2, and the profile
created through `on:`.

## The live rail (Q6 A)

Scoped to the page, the same shape everywhere. On home it covers everything; on `handle`, its operations; on
`handle.claim`, that operation alone.

```text
 ● local · last 30 min                       scope: handle.claim
 ┌ calls ┐┌ answered ┐┌ refused ┐┌ defects ┐┌ p95 of 150 ┐
 │  412  ││   375    ││   37    ││    0    ││   6 ms     │
 ▁▂▃▅▃▂▄▆▅▃▂▃▅  per minute
 12:04:31  claim  ada     answered   9 ms  attempt 2
 12:04:29  claim  bob     HandleTaken
 12:04:20  claim  carol   answered   5 ms
 Runs touching handle
 ◌ builder · "add a reserved-names list" · running 3 min
```

| Piece | Source | From |
|---|---|---|
| Stat blocks and sparkline | L | `ortho.calls` and `ortho.call.duration` (M1.20) in the window |
| Last calls | L | `TraceSource.window` over the environment's sink: the Collector's files locally, about 50 ms a poll |
| Runs touching the thing | L | `rail.on(thing, …)` from `@orthograph/agents` (Q11, gap 3) |

Numbers are shown as data, in stat blocks, never as sentences (UX.md note 5). There is no status sentence.

## The chat (Q1 A, Q7 A)

A drawer over the rail, opened from the top bar or from any page. It knows the page, the environment and window, and
the open trace, if any (screen context, M1.24). Each conversation is one `@orthograph/agents` Run (M4.16), resumed
from its durable record. The composer picks the agent spoken to: the app's own assistant, or any agent a mounted
feature lists (`chat.addressees`, filled by the factory's roster). A conversation is kept under the thing it touches.

```text
┌ chat · on handle.claim · local · 30 min · trace 7f3a… ────────────────┐
│ to: [ assistant ▾ ]   (assistant · builder · reviewer · designer …)   │
│ you  why did this claim need two attempts?                            │
│ assistant  Another claim committed between its read and its write.    │
│   ┌ tool · handle.resolve { name: "ada" } ─ output-available ────────┐│
│   └──────────────────────────────────────────────────────────────────┘│
│   ┌ tool · note.write { on: handle, body: "…" } ─ requires-action ───┐│
│   │                                       [ Approve ]  [ Reject ]    ││
│   └──────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────┘
```

| Piece | Source | From |
|---|---|---|
| The transcript | L | the Run's committed record (Pi Durable is its source of truth) |
| Tool cards and their states | G, L | the generated actions; `ChatTool`'s `state` maps one to one onto an action's (K10 section 6) |
| Approvals | G | `needsApproval` in the `defineAction` wrapper (M1.23), so a host that asks first never asks twice |
| Refusals in a card | G | the `ActionRefusal`'s code and message (M1.23), never a raw defect |
| The agent picker | G | `chat.addressees`, from the model's `Blueprint.agent` declarations (K10, M4.10) |
| Screen context | L | the page, the window, the open trace; extensions add to it with `context` (Q11) |

## Every action (Q9 A)

The portal is a feature written in Orthograph, `@orthograph/portal`'s own blueprint, kept in the portal's own store
(K5 decision 5). Every verb it has is a declared operation, so it is a generated action, a button, an agent tool, an
MCP tool and a CLI command, all from one declaration. A person and an agent use the same door, and the portal's own
calls light up its own spine.

| Thing | Operations | Allowed |
|---|---|---|
| `note` (`kept → removed`) | `note.write { on, body }`, `note.remove`, `note.list { on }` (read) | builder |
| `grant` (`given → revoked`) | `grant.give { person, role }`, `grant.revoke`, `grant.list` (read) | owner |

```ts
// packages/portal/blueprint/things/note/verbs/write.ts
export default Blueprint.operation(Note, {
  description: "Write a note on a thing, pinned to the model's hash.",
  payload: { on: Note.fields.on, body: NoteBody },
  answer: { note: Note.fields.id },
  move: machine.moves.write,
  allowed: [builder],
});
```

`Note.fields.on` points at any thing (gap 3). "Try it" is not a portal verb: it calls the app's own action as the
signed-in builder, so the app's roles decide what it may do.

## Sign-in and roles (Q10 A)

There is no second login. A person signs in through the app's own auth (K5 seam 9). Inside the portal:

| Role | Rule | May |
|---|---|---|
| `owner` | holds an owner grant | everything a builder may, plus `grant.give` and `grant.revoke` |
| `builder` | holds an active builder grant | see every page, write notes, use Try it and the chat |
| anyone else signed in | | refused with `NotAllowed` |

The first owner comes from the environment, by person id, held as a declared secret, never an email in the repo:

```ts
// blueprint/environments/production.ts
settings: [portal.settings.firstOwner.is(Secret.stored("PORTAL_FIRST_OWNER"))],
```

Locally (`identity: "test-principals"`) there is no sign-in: you are the owner, and inside Try it you act as a cast
member. The chat's agent acts as `agent for <you>` (M2.01), within your role. M2.06 builds the sign-in; until then
M1.24 signs in through acme's copied auth.

## Extensions (Q11 A)

An extension is a feature whose package also exports a portal face. It is mounted with one file, like any feature, and
deleting that file removes its pages, its store tables and its actions. Its things get every generated page for free;
a slot is only for what a thing's generated page cannot show. There is no fourth plugin kind and no free-form route.

**Settled here for M4.23 and M3.17.** The export is `Portal.face`, from `@orthograph/portal/face`, exported at the
feature package's `./portal` subpath, so the feature itself never depends on the portal and runs without it. A lint
rule, `orthograph/face-actions-only`, fails a face that imports a store, calls `fetch`, or writes through anything but
its own feature's generated actions; reads go through its declared reads only. It lands with M1.13, the first slice
that renders a face.

```ts
// @orthograph/work: package.json "exports": { "./portal": "./portal/face.js" }
// portal/face.ts
export const face = Portal.face({
  sidebar:   { group: "Work", items: [Item, Goal] },
  views:     { list: { [Item.name]: Portal.view.board({ by: Item.machine }) } },
  sections:  { thing: [Portal.section("Work on this", ItemsOn)] },
  rail:      { on: [] },
  attention: Attention.list,                 // "Needs you", shown across the portal
  context:   (page) => ({}),
});
// the app: blueprint/features/work.ts. One file in, one file out.
export default Blueprint.use(work, (w) => []);
```

| Slot | Takes | Gets, typed |
|---|---|---|
| `sidebar` | a group name and the things in it | the tree group (Q3) |
| `views.list[thing]` | a view over a thing's instances | the thing's model, its machine, its actions with their refusals, a live feed of its committed events |
| `views.one[thing]` | a view of one instance | the same, for one id |
| `sections.thing`, `sections.operation` | a section on any thing's or operation's page | the page's model and the window |
| `rail.on(thing, …)` | a rail card beside a thing | the thing and the window |
| `attention` | a declared read of what needs a person | shown in the top bar and on home |
| `chat.addressees` | agents the composer can address | `Blueprint.agent` declarations |
| `context` | `(page) => ({ … })`, added to the chat's screen context | the page |

### The factory (K10 section 6)

| Need | Carried by |
|---|---|
| A Factory group: Agents, Runs, Workspaces, Experiments | `sidebar`; each a thing with its generated pages |
| The roster, the runs list, one live run, a workspace | `views.list[Agent]`, `views.list[Run]`, `views.one[Run]`, `views.one[Workspace]` |
| Every button is an action | the lint rule above |
| An agent picker; a conversation is a Run | `chat.addressees`; Runs are `@orthograph/agents`' |
| A running Run beside the thing it touches | `rail.on(thing, RunsTouching)` (gap 3) |
| A run's context includes its workspace | `context: (page) => ({ workspace: { branch, revision } })` |
| Experiment start, keep, throw away | moves on its lifecycle, so buttons on its generated page |

### The work board (K11, "The board in the portal")

| Need | Carried by |
|---|---|
| 1. A page for the feature, its own actions as its only writes | `views.list[Item]` as `Portal.view.board({ by: Item.machine })`, held by the lint rule |
| 2. The item's machine on the client, refusing illegal drops before any call | every view gets the thing's `MachineModel`; the board's `getDropOperation` returns `cancel` for a move the machine forbids |
| 3. Each action's typed refusals, shown on the card | every view gets the actions with their declared errors; `Portal.refusal` renders an `ActionRefusal` |
| 4. Live updates per board | the view's live feed of committed events (M1.21), per thing |
| 5. "Needs you" everywhere | the `attention` slot, in the top bar and on home |
| 6. The manager's conversation bound to a goal | a Run that touches the goal (gap 3), opened from the goal's page |
| 7. Pro's virtualised `DataGrid` for long columns | a face is composed from Pro's components; the generic list view uses `DataGrid` too |
| 8. Live updates held still while a card is held | the live feed's `hold()` and `release()`, then the changed cards highlighted |

## Environments (Q12 A)

Each environment has its own portal, a route on its own Worker (`design/frame/projections.md:171`). It reads only its
own sink, with one read token, a declared secret (M2.04). The top bar switches between them, built from
`model.environments` and each one's deploy domain. Proof comes from the logbook for every environment, which needs no
telemetry token.

| | local | staging | production |
|---|---|---|---|
| Spans and step signals | Collector files, about 50 ms, no lag | its sink (Axiom), seconds of lag | its sink |
| Calls and durations | the Collector's metrics pipeline (M1.20) | the sink's metrics | the sink's metrics |
| Which version | the working tree's model hash | the logbook's revision, and what's stale against the declarations | the logbook's releases: which version is live |
| Proof | the latest `ortho prove` | logbook verdicts | logbook verdicts |
| Who calls | the cast; you act as one | people signed in | people signed in |
| What matters most | does it run; spans as they arrive | does this revision keep its declarations | defects, refusal rates, p95 against budget, the live version |

The proof matrix (every operation against every environment: pass, fail, stale or unproven) is a page of its own,
reached from the top bar's environment menu. It is generated from the model and the logbook.

## The worked app: `links`, and how it grows

**Stage 1** (K9): the things `profile` and `link` (the app's), `handle` (`@orthograph/handles`), `person` and `session`
(auth), and the portal's own `note` and `grant`. Home has four groups; `handle` is the richest page, with a lifecycle,
a data-dependent refusal (`HandleTaken`) and idempotency by request. A claim lights up `handle.claim` and, through
`on:`, the profile it creates. Every page above is drawn on stage 1.

| Stage | What it adds to the portal | What it needs |
|---|---|---|
| 2 · wallets | `wallets` and `chain-evm` groups, an `adapters` group (`erc20`). `payment`'s lifecycle (simulated, submitted, included, confirmed, dropped, reverted, corrected) lights up from the follower's events. Adapter calls show as `step.call` rows on the spine, with their declared errors. Staging becomes real | client operations' spans from the device (gap 4); chain submissions as spans |
| 3 · the vault | about 15 things in eight groups. Runs on the rail beside what they touch; calls by `agent for <person>` shown as such; approvals in the chat; owner signatures as a workflow, so a workflow's steps on the spine (M3). The factory and the board mount as extensions | workflow spans (M3.03); `rail.on` |
| 4 · the club | private members and ballots. The public tally and footprint show; nothing that names a member shows (ST4.07). Proof generation as a step on the device | private fields never traced (M1.19); on-device spans (gap 4) |

## Gaps

Each hand-written or missing piece, with the slice that owns it.

| # | Gap | Owner |
|---|---|---|
| 1 | `from: { kind, mount }` on each thing and operation in the model | M1.03 (on the `m1` branch since #64: `FromModel` on things and operations, `types.ts:53` and `:100` there; not yet on `main`) |
| 2 | A declared latency budget per operation, for "p95 of 150" | none yet; until then the stat shows p95 alone (ledger, by the conductor) |
| 3 | A field that can point to any thing (a declaration name plus an id), for Run's `touches` and Note's `on` | M1.03, beside gap 1 (K10 section 1) |
| 4 | Spans from operations that run on the person's device (stage 2's wallet, stage 4's proofs) | LAH-02, no slice yet |
| 5 | The `orthograph/face-actions-only` lint rule | M1.13 |
| 6 | `Portal.face`, its slots and `Portal.view.board` | M1.13 (the contract), M3.17 and M4.23 (the first faces) |

Nothing else on these pages is hand-written: every label, list and diagram is generated, and every number is live.

## HeroUI Pro behind one package (F7)

Aaron, 19 November 2026: "Yes, add the seam". Recorded in [`decisions/F7-portal-ui-seam.md`](decisions/F7-portal-ui-seam.md),
with the licence clauses. In short:

- **`@orthograph/portal-ui`** (`packages/portal-ui`) is the only importer of `@heroui-pro/react`, which it takes as a
  peer dependency and never bundles, so it is published like our other packages and each user brings their own Pro
  licence (Aaron: "we can import it"). It exports our own names, shaped by these pages: `Shell` (tree, top bar, rail, drawer), `Board`,
  `Grid`, `Chart`, `Stat`, `Card`, `Widget`, `Timeline`, `Command`, `Code`, `Markdown`, `Editor` and the `Chat` parts. Every page in this
  file, M1.24's shell and chat parts, and every extension face import from it, never from Pro.
- **A lint rule** bans `@heroui-pro/*` everywhere else, generated code included. Spikes are exempt.
- **Pro installs at build time** from the `HEROUI_AUTH_TOKEN` CI secret (Aaron created it on 19 November 2026), never committed, never run on
  pull requests from forks. Locally it installs from his `heroui-pro login`, as the mock does.
- **The fallback**, if the licence lapses or its terms change, rebuilds `portal-ui`'s exports on open libraries; the
  pages don't change. It is later work (`later.md`).

This replaces round 1's "clean-room the components we need" with one place to do it.

## What this changes elsewhere

- **M1.24** keeps the shell, screen context and the approval cards' contract, all through `portal-ui`. The chat's surface is M4.16 on Pro's AI
  components over a Pi Durable run, and conversations are Runs, not things in the portal's store. Its row is reworded
  in `milestones.md` in the same change as this file.
- **M1.34** (new, before M1.13) builds `@orthograph/portal-ui`, its lint rule and the CI install (F7).
- **M1.13** builds these pages on `portal-ui`, the face contract (`Portal.face`, its slots, `Portal.view.board`) and the lint rule; its
  row in `milestones.md` says so, in the same change as this file.
- **M4.23** takes `Portal.face` at the `./portal` subpath and the lint rule as settled here.
- **M3.17** takes `views.list` with `Portal.view.board`, the live feed's `hold()`, and the `attention` slot.
