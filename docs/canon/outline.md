# The canon's outline

There are twenty-eight concept pages and three reference pages, in the order a newcomer reads them. Each page explains
one idea, and each word in the glossary (`design/docs/index.html`, the table headed "Word") has exactly one page that
owns it. Other pages link to that page and never explain the word again.

A page's **job** is the one idea it carries. Its **questions** are the ones a reader brings to it: if a question
isn't answered on the page, the page isn't done. **Links** are the pages it leans on. **Owns** is the list of glossary
words this page defines, so the check can find a word explained twice.

## Layers: the order pages are written in

The canon is written in layers, and each layer rests on the layers below it (Aaron, 18 November 2026: "let's start
with layers … and then we build up as we're going along"). A layer is written, checked, rendered and reviewed by Aaron
before the next one starts. A page may link forward to a later layer, but it never depends on one to make sense.

The order is K5's (`design/decisions/K5-the-whole-shape.md`, "The corrected layer order for the canon"). The first
order began with things and operations. But a handler can't be explained without its language and enforcer, an
operation without its doors, or a thing without its store. So **layer 1 is the shape**: one page per primitive, at K5's
level, and the details wait for the layers that own them.

| Layer | Pages | Leans on |
|---|---|---|
| 1 · the shape | `forman` (to be `orthograph`), `blueprint`, `languages-and-hosts`, `plugins`, `data`, `doors` | nothing |
| 2 · the core | `things`, `machines`, `operations` (with steps), `roles`, `handlers` | 1 |
| 3 · proof | `journeys`, `proof`, `traces`, `stand-ins` | 2, and the doors (replay) |
| 4 · data in depth | `stores`, `views`, sources (on `adapters`) | 2 and 3 |
| 5 · plugins in depth | `features`, `adapters`, `projections`, `portal`, `secrets` | 1 to 4 |
| 6 · running | `workflows`, `environments` | 4 and 5 |
| 7 · what Orthograph ships | `auth`, `agents`, `factory`, `agent-kit` | everything above |

**Examples.** Layers 1 and 2 teach with the sign-up sheet, `examples/signup` (Aaron, 18 November 2026): one thing,
open to anyone, and nothing in it that needs explaining from outside. From layer 4 on, the end-to-end example is K5's
community workshop: drafts in D1, a governance contract, a publish workflow, and later Noir. acme stays the fixture
the tests and gates run on.

**Names.** The framework is Orthograph, its command `ortho` (K5, "Names"). Pages say Orthograph and `ortho` in prose,
and quote code by today's paths and output, which still say `forman` and `@formants` until the rename sweep (K6). A
page's file name stays as it is here until then.

**Chain.** A chain is a host, and its store kind is `chain` (K3 item 2). How an operation maps to a contract, which
functions clients may reach, and how Solidity, Noir and Solana fit together all wait on K7. Until K7 lands, a page
says that a chain part waits on K7. It doesn't guess.

## Layer 1: the shape

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 1 | `forman` | Describe a system once; each operation is enforced in one place, and everything else falls out | the loop, projection (as an idea), behaviour as the only freehand, Orthograph | What is Orthograph? What is made for me, and what is the only code I write by hand? How does the loop close? | blueprint, languages-and-hosts, plugins, data, doors | built (the loop closes at M3) |
| 2 | `blueprint` | What you write, and the model it compiles to | blueprint, declaration, model, name from path, `ortho check` | What goes in `blueprint/`, and where does each declaration live? How does a name come from its path, and why is it never written as a string? What is the model, and what does `ortho check` tell me? | forman, things, operations, journeys, plugins, handlers | built · blanks and journeys in the model M1.03 |
| 3 | `languages-and-hosts` | What behaviour is written in, and where it runs | language, host, `runs` | What is a language, and what does it own? What is a host, and what does it supply? Why does a language never choose where it runs? Where does a chain fit? | forman, doors, data, handlers | Effect and Cloudflare built · chain languages wait on K7 |
| 4 | `plugins` | Built once, mounted anywhere: the three kinds and the one-file mount | plugin, feature, adapter, projection (as kinds), mount, choose, include, narrow, omit, choice, setting, need | What are the three kinds, and how do I pick? What can a mount say, and why only that? A choice or a setting? | forman, features, adapters, projections | M1.06 to M1.13 |
| 5 | `data` | Where every kind of data lives, and who may write it | `lives`, a projection's own state | Where does my data live? What is a store, a source and a view, and how do I tell them apart? Who may write each? Where does the portal keep its own state? | things, stores, views, adapters, portal | database, actor built · views M5 · chain waits on K7 |
| 6 | `doors` | One enforcer per operation, and every door that reaches it | door, enforcer, served operation, SDK contract, request key, action | What enforces an operation, and where? What does each door make, and from what? How does the SDK carry the caller, retries and refusals? What is an action, and why does it hold no authority? | operations, handlers, roles, projections, portal | HTTP, SDK, CLI, MCP built · SDK contract M1.12 · actions M1.22, M1.23 |

## Layer 2: the core

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 7 | `things` | A noun with an id and fields, living in a store | thing, value, field, id, visibility (public, secret, private) | What is a thing? Why are values named? Who may see a field? | blueprint, data, machines, stores | built |
| 8 | `machines` | A thing's states, the moves between them, and what each move records | machine, state, move, event | Why a machine and not a status field? What happens on a move from the wrong state? What is an event for? | things, operations, views | built |
| 9 | `operations` | A verb on a thing, and everything it declares | operation, read, payload, answer, error (refusal), step, optional step, budget, idempotent, `emits` | What does an operation declare, and why each part? What is a refusal? What is a step, and when is one optional? What does `idempotent: "request"` promise? When does an operation emit its own event? | machines, roles, handlers, doors, traces | built · optional steps M1.26 · `emits` M3.16 |
| 10 | `roles` | Who may call, and how they got in | role, principal, way in (`Via.*`), `anyone`, `signedIn`, `system` | When is a role checked? Which principals are there? How does an agent acting for Ada pass Ada's roles? | operations, doors, auth, agents | person built · the rest M2 |
| 11 | `handlers` | The only freehand code, and the frame it must fit | blank, handler, frame, scaffold, wired scaffold, generated vs scaffolded | What does a handler get and return? Which files are mine? What does the scaffold write for me? What is a blank, and who fills it? | operations, doors, journeys, proof | built · the wired scaffold M1.26 · blanks in the model M1.03 |

## Layer 3: proof

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 12 | `journeys` | Proof written as stories through real operations | journey, story, starting world, cast, the empty-handler rule | Why does a different agent write the journey? Why are starting worlds made by operations? What does "proved by the description" mean? | operations, proof | executable built · stories M1 · `prove --empty` M1.16 |
| 13 | `proof` | Facts, not claims: worlds, evidence, evals, verdicts | world, evidence, eval, verdict, stale, ratchet | What does `prove` do, step by step? What do the nine evals check? Who may write a verdict? What makes a verdict stale? | journeys, traces, stand-ins | built · per-operation verdicts M1.04 |
| 14 | **`traces`** | What a call leaves behind, made from the declaration | span, refusal vs defect (in a trace), attribute, `forman.calls`, sink, step signal | Where do spans come from? Why is a refusal not red? What do I look for? What is never traced? | operations, proof, environments | spans built · gaps M1.18 to M1.20 · step signals M1.21 |
| 15 | `stand-ins` | Local, never fake | stand-in, the ladder, conformance | What plays Stripe in a world? Why never our own fake? How does a stand-in stay honest? | adapters, proof | the ladder M5 |

## Layer 4: data in depth

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 16 | **`stores`** | Where a thing's state is written, and the commit that makes a place a store | store, store kind, default store, commit, migration | Can I have more than one database? Why can't KV or R2 hold a thing? What does a commit promise? What about a database I don't own? | data, things, views, adapters, workflows, environments | database, actor built · stores M1.17 · chain waits on K7 |
| 17 | `views` | Lists across stores and sources, kept from events | view, data map | How do I list things that live as actors, or across stores? How fresh is a view? Where do I see all my data? | data, stores, machines, adapters | M5 |

## Layer 5: plugins in depth

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 18 | `features` | Adding to what the system is | feature, export, root feature | What does a feature add? How does my app use what a feature exports? How is a feature proved alone? | plugins, stores, auth | M1 · tooling M2 |
| 19 | `adapters` | Bringing the outside in, both ways, and sources | adapter, call, source, `on:`, `service(<mount>)` | How do I call Stripe? How do events come in? Where does a database we don't own go? A contract we didn't write? | plugins, data, stand-ins, secrets, roles | core M1 · Stripe M5 · sources M5 |
| 20 | `projections` | What the model becomes, as plugins | output, artifact, the replay rule | What does each projection make from one operation? Why must every client leave the same evidence? How is a projection mounted? | plugins, doors, portal, proof | built · as plugins M1.11 to M1.13 |
| 21 | `portal` | The builder's place to understand and plan with the running system | portal, note, live evidence | What does the portal show first, and why? How does live evidence light up the declaration? What is ported from agent-native, and what isn't? | projections, doors, data, traces | design M1.25 · port M1.23, M1.24 · built M1.13 |
| 22 | `secrets` | A value the description names but never holds | secret, stored, generated, runtime / release / builder | Who may read a secret? Where does its value come from per environment? Why never in a world? | adapters, environments | M2 |

## Layer 6: running

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 23 | `workflows` | Durable work: processes that wait, and work across stores and owners | workflow, activity, the replay rule for workflows | When do I need a workflow and not a step? Why does an activity run once even after an eviction? How do I work across D1 and a chain? | stores, adapters, agents, operations | M3.01 |
| 24 | `environments` | Where each projection lives, and how a revision moves | environment, place, promote, release, version, rollback, destroy | What goes in an environment file, and what doesn't? How is a version worked out? How do I roll back? | projections, secrets, stores, proof | built locally · cloud M7 |

## Layer 7: what Orthograph ships

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 25 | `auth` | Identity and tenancy, as two features | `@formants/auth`, `@formants/organizations`, membership, invitation, `holds` | Why two plugins? What do I mount, and what do I get in each client? How do my roles use organisations? | roles, features, secrets | M2 |
| 26 | `agents` | Durable agents inside the app: runs, declarations, model providers | run, `Blueprint.agent`, model provider | What is a run, and where does its loop live? Who may start one? How is an agent limited? How does the portal's chat use one? | features, roles, adapters, workflows | M4 · the portal's chat M4.16 |
| 27 | `factory` | The feature that builds projects: work worked out from facts | mission, milestone, task, attention, fact, worker | Where do tasks come from? What closes one? People or agents? | agents, proof, handlers | M3 · its portal surfaces parked (M3.14) |
| 28 | `agent-kit` | How any agent builds an Orthograph app | agent kit, skill, role definition, code mode, `bp` | What does `ortho new` give my agents? What may a builder touch? Why code mode? | factory, handlers, journeys | parked with the skills design (M3.12) |

## Reference (generated, never hand-written)

| # | Page | Made from | Milestone |
|---|---|---|---|
| R1 | `reference/commands` | the CLI's own command tree (`packages/cli/src/main.ts`) | after pass 2 |
| R2 | `reference/blueprint-api` | the `Blueprint.*` types in `@formants/forman` | after pass 2 |
| R3 | `reference/glossary` | every page's `owns` list and its one-paragraph idea | after pass 2 |

## What was merged, and why

- **Principals and ways in** are part of `roles`: a reader never asks "who is calling" without asking "may they".
- **Actors** are a store kind (K3), so they are on `stores`, not a "long work" page. What was left of long work is
  `workflows`; agent runs belong to `agents`.
- **Mounting** is part of `plugins`. A mount is how a plugin is used; it has no meaning without one.
- **Sources** are part of `adapters`: a source is an adapter whose calls happen to read data (K3 item 8). `data` and
  `stores` say what a source is not, and link there.
- **Steps** are part of `operations`: a step is a span inside one attempt, declared with the operation (K5 seam 3).
  Durable work across attempts is a workflow activity, on `workflows`.
- **Shipping** and **deployment** are `environments`: the environment file is where both are decided.
- **What gets generated** is spread to its owners: the generated/scaffolded rule on `handlers`, each door on `doors`,
  each projection's outputs on `projections`, the agent kit on `agent-kit`.

## What was split, and why

- **`blueprint`** has its own page, apart from `forman`. `forman` is why: one description, one enforcer per
  operation, and the loop. `blueprint` is what you actually write: the folder, one declaration per file, names from
  paths, and the model `ortho check` compiles.
- **`data`** is apart from `stores` and `views` (K5). Layer 2 needs to know where a thing lives and who writes it
  before it can say what a thing is. The commit, migrations and store kinds in depth are `stores`, in layer 4.
- **`doors`** is apart from `operations` and `projections` (K5). An operation says what a call is; `doors` says what
  enforces it and what reaches it: the served operation, the SDK contract, the CLI, MCP and actions. `projections` is
  how those outputs are made and mounted.
- **`portal`** replaces "the app" (K5 decision 1). It is our own template on pieces ported from agent-native, for the
  builder, not an agent-native app.
- **`agents`** and **`agent-kit`** stay apart. One is durable agents inside your app (a feature, M4); the other is
  agents building your app (parked). K2 says each is usable without the other.
- **`stand-ins`** has its own page. "Local, never fake" is a standing rule of Aaron's, and the ladder is asked about
  on its own.
