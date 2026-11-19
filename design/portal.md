# The portal's design (M1.25)

Agreed with Aaron on 19 November 2026, over two grill rounds (answers below, with their dates). This is the spec that
M1.13 (the portal's pages and the shell's frame), M1.24 (the shell's chat and screen context, in M3 since K13), M3.21
(faces and notes), M4.16 (the chat), M4.23 (the Factory face) and M3.17 (the board)
build to. The drawing is in [`../spikes/portal-mock/`](../spikes/portal-mock/README.md). What it takes from Codex's
portal (`experimental/portal-pro`) is in [`decisions/F8-portal-from-codex.md`](decisions/F8-portal-from-codex.md).

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

### Round 3 (19 November 2026, relayed by the conductor)

Aaron's words, verbatim, then what was decided.

| # | Joint | Aaron | Status |
|---|---|---|---|
| 1 | Where the pages beyond things live | "need options as designs" | Open. A, B and C drawn side by side on the Options page |
| 2 | Environments | "same need designs" | Open. A, B and C drawn |
| 3 | Plugins and stores | "same designs" | Open. A, B and C drawn |
| 4 | Journeys and starting worlds | "no we need to have them and show them graphically" | **Decided: pages for both, drawn as pictures** (below) |
| 5 | Access, refusal codes, events, values | "reference pages and we have telemetry on the page with spans and tracing etc" | **Decided: four reference pages, each with live telemetry** (below) |
| 6 | Blank operations | "show me" | Open. A, B and C drawn |

**Q4, decided.** There is a Journeys page, a page per journey and a page per starting world, and each is drawn, not
listed:

- A journey is a **sequence diagram**. Its cast are the lanes and its steps are the columns. Under the steps sit four
  rows of dots, one per environment, so a failure shows on the step where it happened ("failed here", then "not
  reached").
- Clicking a step opens its operation. A failed step opens its trace.
- Under the diagram the steps are a HeroUI Pro `Timeline`, with each check as a chip.
- The worlds are a **tree**. It starts from the empty world, then the starting worlds and what each gives, then the
  journeys that start from each, coloured by verdict.
- The Journeys page opens on that tree. Each journey's row carries one dot per step.

**Q5, decided.** The reference pages are Access, Refusal codes, Events, Values and Machines. Each is one table with
anchored rows, and each carries live telemetry:

- **Every row has its numbers.** It shows its count in the window, its rate per minute and a trend sparkline:
  - refusals per code, from `ortho.calls` by error tag;
  - NotAllowed per rule, with the role check's time;
  - commits per event, from the commit span's `event.name`;
  - door rejections per value;
  - answered moves per arrow.
- **Every row opens its trace.** Each row with spans has a "trace" link.
- **Every page lists its recent spans.** Each one opens its trace. A call refused at the door has no span (M1.20), so
  it shows its count and says "no span".

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
| p95 against budget | L, G | `ortho.call.duration` (M1.20); the budget is the operation's declared `budget.p95` (F8) |
| "Needs you" above the cards | L | each mounted feature's `attention` slot (Q11) |
| The operations matrix under the cards | G, L | one row per operation: calls, refused, defects, p95 against budget, sortable (F8) |

**The operations matrix** (from Codex's portal, F8) sits under the cards, never in place of them: one row per
operation, grouped like the cards, each count a link to those calls. A thing's page shows the same grid for its own
operations.

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
Notes (2)  "claim retries once on a version race; that's by design" (pinned to thing:handle@4e1c…, current)
Conversations (1)  "why do releases get refused?"  · builder agent · 18 Nov
```

| Piece | Source | From |
|---|---|---|
| Header, plugin and version | G | `ThingModel`, `from`, the mount's package version |
| Lifecycle diagram | G | `MachineModel` |
| Move counts on each arrow | L | answered calls whose span carries `move.name` (the operation's span, M1.18); the operations list counts every call |
| Refusals on the arrow they guard | L, G | span outcome and error tag; the arrow from the operation's `move` |
| Operations grid | G, L | `OperationModel` (description, `allowed`, read or write), with its window's stat: the operations matrix, filtered to this thing (F8) |
| Events, errors, roles | G | `ThingModel.events`, `errors`, `roles` |
| Notes | L | the portal's `note` thing, kept in its own store (Q9): Markdown pinned to `kind:name@hash`, the declaration's own hash; "stale" once that hash moves (F8) |
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
| A finished call down the spine | L | the call's spans: one operation span per attempt, keyed by `attempt`; one per step, its kind from `step.kind`; `<op>.commit` with `commit.outcome` and `commit.writes` (M1.18); `move.name` and `move.to` on the move |
| A running call down the spine | L | step signals as each step starts and ends (M1.21) |
| What the commit set off | L | committed events read from the journal (M1.21) and the spans of their `on:` handlers |
| Try it | G | the operation's generated action (M1.22), called as the signed-in builder; arrives with M1.22 in M3 (K13), so M1.13's portal shows no button |
| Docs prose | G | the operation's `description`; the canon page it belongs to is linked, never copied |
| The proof tab | L | M1.04's verdicts from the logbook, keyed by the model's hash and the handler body's hash: each eval's verdict, the journeys that cover the operation, and what is unproven; latency is the live p95 beside it, not an eval's printed note (F8) |

The rows come from span attributes, never from names: a database step is `step.kind: "database"`, not a span whose
name looks like SQL, and a retry is a second `attempt`, not a second child of an HTTP span. There is no HTTP span to
group under (the wire turns it off, F8), so a call refused at the door shows in the counts and never as a trace.

**Reads** draw a shorter spine: role check, then the read. **A call that stopped** is marked on the row where it
stopped: the role check for `NotAllowed`, the machine check for a move from the wrong state, the handler for a
declared refusal, any row for a defect.

### The trace drawer

"Open the full trace" slides a drawer over the rail with the waterfall and every attribute that may be shown. The
waterfall's groups fold (from Codex's portal, F8): each attempt, then its steps, then each `on:` handler, with the path
to the selected span open. Private fields and untraced free text are never shown, in any environment (M1.19 traces a
field only when it is public, and free text only when marked). The portal also keeps out what M1.19 does not cover:
raw statements, which person called (`principal.person`) and log bodies; it shows a span's structure, timing, outcome,
declared refusal, how many logs it has, and the caller's kind (a person, an agent for a person, anyone), derived by the portal, since a person's span carries
`principal.person` and not `principal.kind`. Locally the
caller may be named by the journey's cast (`ada`, `bob`), which are fixtures, not people. A "no leak" check (M1.13)
plants each hidden item in a staging trace and fails if any renders. The example trace is always one worth
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
| Last calls | L | `TraceSource.window(since, now)` over the environment's sink: the Collector's files locally, about 50 ms a poll; tests and screenshots pass a fixed `now` (F8) |
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

An agent drives the portal the way a person does (from Codex's portal, F8). `list` gives every action with its input
schema (M1.23). `view-screen` returns the screen context of one tab, and `navigate { tab, to }` moves that tab; each tab
keeps its own (M1.24). The portal's `AGENTS.md` is generated from the model and says to read the screen first.

## Every action (Q9 A)

The portal is a feature written in Orthograph, `@orthograph/portal`'s own blueprint, kept in the portal's own store
(K5 decision 5). Every verb it has is a declared operation, so it is a generated action, a button, an agent tool, an
MCP tool and a CLI command, all from one declaration. A person and an agent use the same door, and the portal's own
calls light up its own spine.

| Thing | Operations | Allowed |
|---|---|---|
| `note` (`kept → removed`) | `note.write { on, body }`, `note.edit { note, body, revision }`, `note.remove`, `note.list { on }` (read) | builder |
| `grant` (`given → revoked`) | `grant.give { person, role }`, `grant.revoke`, `grant.list` (read) | owner |

```ts
// packages/portal/blueprint/things/note/verbs/write.ts
export default Blueprint.operation(Note, {
  description: "Write a note on a thing or an operation, pinned to its declaration's hash.",
  payload: { on: Note.fields.on, body: NoteBody },
  answer: { note: Note.fields.id },
  move: machine.moves.write,
  allowed: [builder],
});
```

`Note.fields.on` names a declaration, a thing or an operation (its kind and name, from the model), not an instance; the
note keeps that declaration's hash it was written against and a Markdown body. `note.edit` has no move (the note stays
`kept`), and the `note` thing declares `NoteChanged`. `note.edit` takes the revision the page opened and refuses `NoteChanged` if another edit landed first
(from Codex's portal, F8), so two builders never overwrite each other silently. "Try it" is not a portal verb: it calls the app's own action as the
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
that renders a face. At run time the same line holds (from Codex's portal, F8): every face renders in a sandboxed frame
(`sandbox="allow-scripts"`, CSP `default-src 'none'; connect-src 'none'`): all its traffic crosses one bridge,
and it writes only through the actions its slots declare. The face's typed slots are its manifest; there is no `extension.json`.

**What runs in a frame, and how it reaches the portal.** The slots that draw something (`views.list`, `views.one`,
`sections.thing`, `sections.operation`, and each `rail.on` card) render in the face's frame. The slots that are data
(`sidebar`, `attention`, `chat.addressees`) are declarations the shell reads and draws itself; `context` runs in the
frame of a face on the page and posts what it adds. The frame is a portal route (`/face/<feature>/<slot>`), never a
`srcdoc`, served with the CSP above and `script-src` limited to the portal's own built assets, so `portal-ui` and Pro
load from the deployed portal's build, not from a bundle inside each face (F7: Pro is never bundled into a published
package, a face included). With the network closed, everything crosses one bridge: the face's declared reads, its
declared actions, the live feed of committed events (with `hold()` and `release()`), a Run's stream for a face that
shows one, and the screen context. Drag and drop stay inside the frame; only the drop's action crosses.

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
| 3 · the vault | about 15 things in eight groups. Runs on the rail beside what they touch; calls by an agent for a person shown as such, never which person; approvals in the chat; owner signatures as a workflow, so a workflow's steps on the spine (M3). The factory and the board mount as extensions | workflow spans (M3.03); `rail.on` |
| 4 · the club | private members and ballots. The public tally and footprint show; nothing that names a member shows (ST4.07). Proof generation as a step on the device | private fields never traced (M1.19); on-device spans (gap 4) |

## The model, field by field (round 3, 19 November 2026)

Every field of the compiler's `Model` (`packages/compiler/src/modules/model/types.ts` on `origin/m1`, with
`MountModel` from `modules/mounts/types.ts` and `ValueMeta` from `orthograph`), and the page that shows it. The portal
falls out of this table: a page shows a field only if a row here names it, and a field with no page is listed as such,
never hidden. **Wire** says whether the portal's wire decodes it today (`packages/portal/src/modules/wire/types.ts` on
`m1`): ✓ yes, ~ partly, ✗ no. Every ✗ and ~ is M1.13's or M1.42's (F8 gap 7, K12 section 6, K14's portal column).
**R3** marks a page that does not exist yet and is asked in round 3 (`briefs/portal-round-3.md`).

Real values below are from Plugged In's model as Codex generated it on `links/stage-1`
(`examples/links/generated/model/model.json`, before M1.03, so no `from`, journeys, worlds, stores or mounts yet).

### `Model`

| Field | Page | Wire |
|---|---|---|
| `things` | home cards, the tree, a thing's page | ✓ |
| `operations` | the tree under each thing, an operation's page, the operations matrix | ✓ |
| `refusals` (every code: `HandleTaken: HN-001`, `HandleNotClaimed: HN-900`, `NotAllowed: AR-001`) | the band and the lifecycle arrows by name; the code table **R3 Q5** | ✗ |
| `values` (`HandleName`, `LinkTitle`, `LinkUrl`) | a field's type links to it; the values index **R3 Q5** | ✗ |
| `stores` | the thing's header chip; the stores page **R3 Q3** | ✗ |
| `journeys` | the operation's proof tab; the journeys pages **R3 Q4** | ✗ (`wire/service.ts:7`, "unavailable") |
| `startingWorlds` | the world page **R3 Q4** | ✗ |
| `blankOperations`, `blanks` | the tree and the spec section **R3 Q6** | ~ `blanks` only |
| `environments` | the switcher; the environments page **R3 Q2** | ~ name, runs, promotion, lifetime |
| `mounts` | the tree's plugin groups (Q3); the plugin page **R3 Q3** | ✗ |

### `ThingModel`

| Field | Page | Wire |
|---|---|---|
| `name`, `description` | home card, page header, tree | ✓ |
| `identifier` (`Handle`) | page header, as the code name, in mono | ✗ |
| `code` (`HN`) | page header beside the name; the code table groups by it | ✗ |
| `fields` | the thing's **Fields** section (added in round 3, see below): name, type, `named` value, `ref`, visibility | ~ no visibility, no description |
| `lives` (`database`, `actor`) | page header chip | ✓ |
| `store` | page header chip, linking to its store | ✗ |
| `machine.states`, `moves` | the lifecycle strip on home and the page; moves on the arrows | ✓ |
| `machine.notFrom` (`HandleNotClaimed HN-900 exit 5`) | the errors section, marked generated; on the arrow it guards | ~ no code |
| `events` with fields | the events section; the events page **R3 Q5** | ✗ names only, via `emits` |
| `errors` with fields, `exit`, `code` | the errors section; the code table **R3 Q5** | ✗ |
| `roles`, `roleRules` (`handleOwner`) | the roles section with each rule; the access page **R3 Q5** | ~ names only |
| `from` | the tree group and the page header (`handles · feature · @orthograph/handles 0.1.0`) | ✗ |
| `hash` | notes pin to it; the header's short hash; proof staleness | ✓ |

### `FieldModel` and `ValueMeta`

| Field | Page | Wire |
|---|---|---|
| `value` (`id` with `prefix`, `uint` with `bits`, `text` with `max`, `schema`) | the type column of every field table and the band | ✓ |
| `named` | the type shows the value's name, linking to the values index | ✓ |
| `ref` (`handle.id`) | a link to the field it was taken from | ✓ |
| `optional` | marked in the band | ✓ |
| `visibility` (`secret`, `{ private: [roles] }`) | a lock chip in field tables and the band; the trace drawer hides the value | ✗ |
| description | not in the model yet (K14's finding; M1.42 adds it) | ✗ |

### `OperationModel` and `StepModel`

| Field | Page | Wire |
|---|---|---|
| `kind`, `name`, `thing`, `verb`, `description` | the tree, the operation page header, the matrix | ✓ |
| `identifier`, `file` | the header, as the code name and the source path | ✗ |
| `payload`, `answer` | the in-and-out band | ✓ |
| `move` | the band ("· → claimed") and the spine's machine-check and move rows | ✓ |
| `errors`, `refusals` | the band's refusal list, each with its code and live count | ✓ names, ✗ codes |
| `allowed` (`signed-in`, `role handle.handleOwner`, `anyone`) | the header chip; the access page **R3 Q5** | ✓ |
| `steps` (`name`, `type`) | the spine's rows | ✓ |
| `steps.writes`, `.optional`, `.call` | the spine: what a row writes, a dashed optional row, an adapter call naming its mount | ✗ |
| `idempotent` | the header chip ("idempotent by request") and the spine's replay row | ✓ |
| `runs` (`server`, `client`) | the header chip "on your device"; the spine drawn from the device's spans | ✗ |
| `test` (`unit`, `network`) | the proof tab | ✗ |
| `budget.p95Ms` | the matrix and the rail ("p95 6 ms of 150") | ✓ |
| `list` (`where`, `order`, `page`) | a read's band | ✗ |
| `from` | the tree and the header | ✗ |
| `blanks` | the spec section **R3 Q6** | ✗ |
| `via` | the band: the ways in the mount left it ("not in MCP") | ✗ |
| `hash` | notes, proof staleness | ✓ |

### `EnvironmentModel`

| Field | Page | Wire |
|---|---|---|
| `name`, `deploy.*.domain` | the switcher (Q12) | ~ name only |
| `file`, `runs`, `identity`, `lifetimeMs`, `cloud`, `database`, `stores`, `secrets` (names and how, never values), `promotesFrom`, `telemetry`, `deploy`, `publish`, `hash` | the environments page **R3 Q2** | ~ runs, promotion, lifetime |

### `JourneyModel`, `StartingWorldModel`

| Field | Page | Wire |
|---|---|---|
| `name`, `file`, `sourceHash`, `cast`, `starts`, `steps` (title, call with actor, operation and request, checks by kind, skipped) | the journey page; each step links to its operation **R3 Q4** | ✗ |
| `name`, `file`, `from`, `cast`, `makes`, `gives` | the world page **R3 Q4** | ✗ |

### `StoreModel`, `MountModel`

| Field | Page | Wire |
|---|---|---|
| store `name`, `file`, `kind`, `from`, `hash` | the stores page, with the things in each and each environment's binding **R3 Q3** | ✗ |
| mount `kind`, `file`, `package`, `version`, `integrity`, `hash` | the plugin page header **R3 Q3** | ✗ |
| mount `chosen`, `omitted`, `narrowed` | the plugin page: the choices made, what was left out | ✗ |
| mount `needs`, `calls`, `layer`, `standIn` | the plugin page: what it needs, an adapter's calls, what stands in for it in a world | ✗ |

### Made consistent with the model in round 3 (the designer's call, under AGENTS.md)

1. **A thing's page gains a Fields section**, after the lifecycle and before the operations. The agreed page had none,
   but K14's thing card needs every field with its type, visibility and description.
2. **Who may call is the model's words**: `signed-in`, `anyone`, or a role such as `handleOwner`. The sketches above
   wrote `person`, which is not a model term.
3. **Codes are the model's**: the machine's refusal is generated as `<Thing>Not<FirstState>` with code `<PREFIX>-900`
   (`HandleNotClaimed HN-900 exit 5`); `HN-002` is `HandleAlreadyOwned`. The sketches above are kept as drawn on 19
   November; the drawing follows the model.
4. **The example app is Plugged In** (K15). Where the sketches above say `links`, read Plugged In.

## Screens not drawn yet

What the model has and no agreed page shows, and the menus that tie them together. Each is asked in round 3.

All of them are drawn in [`spikes/portal-site`](../spikes/portal-site/README.md), published at
https://claude.ai/artifact/NzDgHFzQSk8yvX8cLNqUKj:

- Q4 and Q5 are drawn as decided.
- Q1, Q2, Q3 and Q6 are drawn three ways each on the Options page, which the artifact opens on.
- The same drawing adds Issues and Alerts, proposed in
  [`decisions/K18-monitoring-falls-out.md`](decisions/K18-monitoring-falls-out.md).

| Screen | Model it falls out of | Round 3 |
|---|---|---|
| The navigation: where every page below lives, beside the things tree | all of it | Q1 |
| Environments, with the switcher's menu and the proof matrix (Q12 agreed both, neither drawn) | `environments`, the logbook | Q2 |
| Plugins (one per mount) and stores | `mounts`, `stores`, `from` | Q3 |
| Journeys and starting worlds | `journeys`, `startingWorlds`, the logbook | Q4 |
| Access (roles), refusal codes, events, values: the reference pages | `refusals`, `roleRules`, `allowed`, `events`, `values` | Q5 |
| What's missing: blanks and blank operations | `blankOperations`, `blanks` | Q6 |

## Gaps

Each hand-written or missing piece, with the slice that owns it.

| # | Gap | Owner |
|---|---|---|
| 1 | `from: { kind, mount }` on each thing and operation in the model | M1.03 (on the `m1` branch since #64: `FromModel` on things and operations, `types.ts:53` and `:100` there; not yet on `main`) |
| 2 | ~~A declared latency budget per operation~~ | closed: operations may declare `budget: { p95 }` (on `main`), and on `m1` it reaches the portal wire as `budget.p95Ms` (F8); an operation without one shows p95 alone |
| 3 | A field that can point to any thing (a declaration name plus an id), for Run's `touches` | M1.03, beside gap 1 (K10 section 1) |
| 4 | Spans from operations that run on the person's device (stage 2's wallet, stage 4's proofs) | LAH-02, no slice yet |
| 5 | The `orthograph/face-actions-only` lint rule | M1.13 |
| 6 | `Portal.face`, its slots and `Portal.view.board` | M1.13 (the contract), M3.17 and M4.23 (the first faces) |
| 7 | The portal wire decodes only things, operations, environments and blanks; the pages also need `from`, each thing's events and errors with their codes and exits, journeys, starting worlds, stores and mounts | M1.13 (F8) |

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

- **K13** (19 November) splits this further: M1.13 builds the shell's frame (tree, top bar, live rail, drawer) and the
  pages as a viewer; M1.24 keeps the chat, "Needs you" and screen context, in M3; the face contract, its lint rule,
  notes and sandboxed faces are M3.21. The bullets below are the F8 split, kept for the record.
- **M1.24** keeps the shell, screen context and the approval cards' contract, all through `portal-ui`. The chat's surface is M4.16 on Pro's AI
  components over a Pi Durable run, and conversations are Runs, not things in the portal's store. Its row is reworded
  in `milestones.md` in the same change as this file.
- **M1.34** (new, before M1.13) builds `@orthograph/portal-ui`, its lint rule and the CI install (F7).
- **M1.13** builds these pages on `portal-ui`, the face contract (`Portal.face`, its slots, `Portal.view.board`) and the lint rule; its
  row in `milestones.md` says so, in the same change as this file. With F8 it also builds the notes, the operations
  matrix, the folding waterfall, the "no leak" check, the fixed window, sandboxed faces, the proof tab on M1.04's
  verdicts and the wire's missing parts, and needs M1.04.
- **M1.23** lists every action with its input schema (`list`); **M1.24** adds `view-screen`, `navigate`, per-tab
  screen context and the generated `AGENTS.md` (F8).
- **M4.23** takes `Portal.face` at the `./portal` subpath and the lint rule as settled here.
- **M3.17** takes `views.list` with `Portal.view.board`, the live feed's `hold()`, and the `attention` slot.
