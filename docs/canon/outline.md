# The canon's outline

Twenty-four concept pages and three reference pages, in the order a newcomer reads them. Each page explains one idea,
and each word in the glossary (`design/docs/index.html`, the table headed "Word") has exactly one page that owns it.
Other pages link to that page and never explain the word again.

A page's **job** is the one idea it carries. Its **questions** are the ones a reader brings to it: if a question
isn't answered on the page, the page isn't done. **Links** are the pages it leans on. **Owns** is the list of glossary
words this page defines, so the check can find a word explained twice.

Pass 1 writes `stores` and `traces` in full. Pass 2 writes the rest.

## Part 1: the idea

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 1 | `forman` | Describe a system once; everything else is made from it | blueprint, model, projection (as an idea), the loop | What is Forman? What do I write, and what is made for me? What is the only code I write by hand? | every part's first page | built (the loop closes at M3) |

## Part 2: describing a system

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 2 | `things` | A noun with an id, fields and a home | thing, value, field, id, visibility (public, secret, private) | What is a thing? Why are values named? Who may see a field? How is a name made from a path? | machines, stores, traces | built |
| 3 | `machines` | A thing's states, the moves between them, and what each move records | machine, state, move, event | Why a machine and not a status field? What happens on a move from the wrong state? What is an event for? | things, operations, views | built |
| 4 | `operations` | A verb on a thing, and everything it declares | operation, read, payload, answer, error (refusal), step, budget, idempotent | What does an operation declare, and why each part? What is a refusal? What is a step? What does `idempotent: "request"` promise? | machines, roles, handlers, traces | built |
| 5 | `roles` | Who may call, and how they got in | role, principal, way in (`Via.*`), `anyone`, `signedIn`, `system` | When is a role checked? Which principals are there? How does an agent acting for Ada pass Ada's roles? | operations, auth, agents | person built · the rest M2 |
| 6 | `journeys` | Proof written as stories through real operations | journey, story, starting world, cast, the empty-handler rule | Why does a different agent write the journey? Why are starting worlds made by operations? What does "proved by the description" mean? | operations, proof | executable built · stories M1 |
| 7 | `handlers` | The only freehand code, and the frame it must fit | blank, handler, frame, scaffold, generated vs scaffolded | What does a handler get and return? Which files are mine? What is a blank, and who fills it? | operations, journeys, factory | built · blanks in the model M1 |

## Part 3: data

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 8 | **`stores`** | Where a thing's state lives, and the commit that makes a place a home | store, store kind, default store, commit, migration | Where does my data live? Can I have more than one database? Why can't KV or R2 hold a thing? What about a database I don't own? | things, views, adapters, workflows, environments | database, actor built · stores M1 · chain M6 |
| 9 | `views` | Lists across stores and sources, kept from events | view, data map | How do I list things that live as actors, or across stores? How fresh is a view? Where do I see all my data? | stores, machines, adapters | M5 |

## Part 4: plugins

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 10 | `plugins` | Built once, mounted anywhere: the three kinds and the one-file mount | plugin, feature, adapter, projection (as kinds), mount, choose, include, narrow, omit, choice, setting, need | What are the three kinds, and how do I pick? What can a mount say, and why only that? Choice or setting? | features, adapters, projections | M1 |
| 11 | `features` | Adding to what the system is | feature, export, root feature | What does a feature add? How does my app use what a feature exports? How is a feature proved alone? | plugins, stores, auth | M1 · tooling M2 |
| 12 | `adapters` | Bringing the outside in, both ways | adapter, call, source, `on:`, `service(<mount>)` | How do I call Stripe? How do events come in? Where does a database we don't own go? Another Forman app? | plugins, stores, stand-ins, secrets, roles | core M1 · Stripe M5 · sources M5 |
| 13 | `projections` | What the model becomes: server, SDK, CLI, MCP, docs, portal | output, artifact, door, the replay rule | What does each projection make from one operation? What is a door? Why must every client leave the same evidence? | plugins, languages-and-hosts, proof | built · as plugins M1 |
| 14 | `languages-and-hosts` | What code is written in, and what it runs on | language, host, `runs` | What is the difference between a language, a host and a projection? How does a value mean the same thing in Effect and Solidity? | projections, things | Effect built · Solidity M6 |
| 15 | `secrets` | A value the description names but never holds | secret, stored, generated, runtime / release / builder | Who may read a secret? Where does its value come from per environment? Why never in a world? | adapters, environments | M2 |

## Part 5: running and shipping

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 16 | `workflows` | Durable work: processes that wait, and work across stores | workflow, activity, the replay rule for workflows | When do I need a workflow? Why does a step run once even after an eviction? How do I work across two stores? | stores, adapters, agents | M3 |
| 17 | `environments` | Where each projection lives, and how a revision moves | environment, place, promote, release, version, rollback, destroy | What goes in an environment file, and what doesn't? How is a version worked out? How do I roll back? | projections, secrets, stores, proof | built locally · cloud M7 |

## Part 6: proof

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 18 | `proof` | Facts, not claims: worlds, evidence, evals, verdicts | world, evidence, eval, verdict, stale, ratchet | What does `prove` do, step by step? Who may write a verdict? What makes a verdict stale? | journeys, traces, stand-ins | built · per-operation verdicts M1 |
| 19 | `stand-ins` | Local, never fake | stand-in, the ladder, conformance | What plays Stripe in a world? Why never our own fake? How does a stand-in stay honest? | adapters, proof | the ladder M5 |
| 20 | **`traces`** | What a call leaves behind, made from the declaration | span, refusal vs defect (in a trace), attribute, `forman.calls`, sink | Where do spans come from? Why is a refusal not red? What do I look for? What is never traced? | operations, proof, environments | spans built · gaps M1 |

## Part 7: what Forman ships

| # | Page | Job | Owns | Questions a reader brings | Links | Milestone |
|---|---|---|---|---|---|---|
| 21 | `auth` | Identity and tenancy, as two features | `@formants/auth`, `@formants/organizations`, membership, invitation, `holds` | Why two plugins? What do I mount, and what do I get in each client? How do my roles use organisations? | roles, features, secrets | M2 |
| 22 | `agents` | Agents inside the app: runs, declarations, model providers | run, `Blueprint.agent`, model provider | What is a run, and where does its loop live? Who may start one? How is an agent limited? | features, roles, adapters, workflows | M4 |
| 23 | `factory` | The feature that builds projects: work worked out from facts | mission, milestone, task, attention, fact, worker | Where do tasks come from? What closes one? People or agents? | agents, proof, handlers | M3 · agents join M4 |
| 24 | `agent-kit` | How any agent builds a Forman app: the generated agent kit and the builder's tools | agent kit, skill, role definition, code mode, `bp` | What does `forman new` give my agents? What may a builder touch? Why code mode? | factory, handlers, journeys | M3 · `bp` tools M4 |

## Reference (generated, never hand-written)

| # | Page | Made from | Milestone |
|---|---|---|---|
| R1 | `reference/commands` | the CLI's own command tree (`packages/cli/src/main.ts`) | after pass 2 |
| R2 | `reference/blueprint-api` | the `Blueprint.*` types in `@formants/forman` | after pass 2 |
| R3 | `reference/glossary` | every page's `owns` list and its one-paragraph idea | after pass 2 |

## What was merged, and why

- **Principals and ways in** are part of `roles`: a reader never asks "who is calling" without asking "may they".
- **Actors** are a store kind (K3), so they live on `stores`, not a "long work" page. What was left of long work is
  `workflows`; agent runs belong to `agents`.
- **Mounting** is part of `plugins`. A mount is how a plugin is used; it has no meaning without one.
- **Sources** are part of `adapters`: a source is an adapter whose calls happen to read data (K3 item 8). `stores`
  says what a source is not, and links there.
- **Shipping** and **deployment** are `environments`: the environment file is where both are decided.
- **What gets generated** is spread to its owners: the generated/scaffolded rule on `handlers`, each projection's
  outputs on `projections`, the agent kit on `agent-kit`.

## What was split, and why

- **`agents`** and **`agent-kit`** stay apart. One is agents inside your app (a feature, M4); the other is agents
  building your app (a projection, M3). K2 says each is usable without the other, and a reader who wants one would
  get lost in the other.
- **`stand-ins`** has its own page. "Local, never fake" is a standing rule of Aaron's, and the ladder is asked about
  on its own.
