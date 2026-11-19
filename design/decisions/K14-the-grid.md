# K14: the grid

Decided 19 November 2026 by the 📐 grid designer thread, under "Who decides" in `AGENTS.md`, from Aaron's words the same
day. The calls that are his are batched at the end, under "Questions for Aaron"; nothing in this record settles them.
`design/grid/grid.json` holds the same content as data, for the board.

## Aaron's words

> "I want to rebuild this board again from first principle … each one of these things should essentially be a swim
> lane … we have a goal here, which is to fill in all of these areas here … We need to have some details about what
> that goal is, not just a one or two lines … for each of these swim lanes we have some sort of end state, something
> that proves all of these different things, which should be probably the portal … the telemetry should be able to see
> in the portal, the docs should be like a content area in the portal … the CLI, the SDK, the MCP, those all have
> their own evidences through their journeys … that way we can hill climb together and we will be fully sure about
> what the situation is at each step and we can't get lost in the weeds."

And earlier the same day: each cell of the grid "is essentially an eval", and once they are all done "we have some
sort of story that we can run … proven end-to-end: using the CLI, creating something new, then going through the
link-tree example with various levels of complexity."

## The goal

**What Orthograph promises.** You write a blueprint: the things your app keeps, the operations that change them, the
steps each operation takes, the machine each thing moves through, the events a move emits, the errors a call can be
refused with, the roles allowed to call, which fields are private or secret, the environments and stores it runs in,
the plugins it mounts, where an operation runs, and the journeys that prove it works. Everything else falls out of
that one declaration for free: the model, the HTTP API, the server, the SDK, the CLI, the MCP tools, the docs, the
portal and the telemetry. Nothing is configured twice, and nothing an output shows is written by hand.

**Why a grid measures it.** "Falls out for free" is a claim about every pair of building block and output. The
coverage audit of 19 November (K12) drew that as a grid of 13 building blocks by 9 outputs, 117 cells, and found the
claim fully true only for operations. A promise that holds for one row is not yet the promise. So the grid is the
goal: each row is a lane, each cell in it is a card, and each card is an eval. A card says, in one or two sentences,
what green means for that building block in that output, and names the evidence that proves it: an e2e check, a
journey run through that output, or a view in the portal. A card is green only when its evidence runs in CI and
passes. A card that exists in code but has no evidence is not green; it is "built, unproved", and the board shows it
amber.

**What "done" looks like.** Every card is green, or Aaron has agreed it is not needed by design. A "not needed" card
is not deleted: it stays on the board, greyed, with the one-line reason, so nobody reopens it by accident and anyone
can see the grid is whole. Where an absence is itself a safety property (no secret field leaves through any output,
no step leaks into a client's contract), the card stays live and its evidence proves the absence. When the last card
turns green, the end-to-end story below runs from a fresh folder through all four stages of the links app, and the
grid stays green after it.

**How it relates to the gates.** The grid does not replace the milestones; it is how we see them. Gate M1 (M1.15) is
the first band: the basics of things, operations, steps, machines, events and errors in every output (K13's 5 by 5,
M1.41 and M1.42), one visibility rule (M1.35), telemetry that carries the model (M1.36), and the portal as a viewer
(M1.13). Gate M2, "workable" (M2.12, also the stage 1 gate), is the second: roles and principals (M2.01 to M2.07),
secrets by declaration (M2.04), journeys run through the SDK, CLI and MCP (M2.08) so those three columns are proved by
journeys rather than by hand-picked calls, `ortho new` (M2.09) so the story can start from nothing, and `ortho add`
for the blocks that edit files in place (M2.14 to M2.16). The v1.0 stages fill the rest: stage 2 (ST2.06) the device
lane and the adapter half of the mount lane, stage 3 (ST3.08) stores on a chain and workflows, stage 4 (ST4.08) the
visibility lane at its hardest, a club whose members never show. The lanes this grid does not have yet (workflows,
views, agents, chains as stores) join it as rows when their milestone's decision slice names their outputs; until
then they are listed under "Rows still to come".

**How we use it.** The board shows one lane per row, its cards left to right in the column order below, each card
green, amber (built, unproved), red (missing) or grey (not needed, agreed). Work is picked by lane, not by cell: a lane
is climbed until it is fully green, so at each step we know exactly which building block is whole. The order is under
"Hill-climb order".

## How to read a card

| Field | What it holds |
|---|---|
| green means | one or two sentences: what must be true of this output for this building block |
| evidence | the check, journey or portal view that proves it; "new" when no check exists yet |
| today | ✓ carried and useful, ~ partly (the gap named), ✗ dropped; graded from the code on `origin/m1` at `6419d4b7`, never from the audit's word |
| today ref | one `path:line` on `origin/m1`: where the output carries it, or where it drops it |
| owner | the existing slice in `milestones.md` that turns it green, or "new slice needed" with a one-line proposal |
| not needed? | a proposal only, flagged for Aaron (Q2); this record settles none |

The grades were first read by four reviewers in parallel, one per group of lanes, each reading the code itself; where
this record regrades a card against the card's own green, its note says so and why. Every reference below is to
`origin/m1` at `6419d4b7` unless it says otherwise. On that commit checks 16 (M1.35), 17
(M1.36) and 18 (M1.38) are written ahead of their builds and red, and `examples/links` is not yet on `m1` (it is
M1.40; Codex's draft is on `links/stage-1`, #56).

## The columns

| Column | What it is on `m1` |
|---|---|
| model | the compiler's `Model` (`packages/compiler/src/modules/model`), written to `generated/model` |
| api | the HTTP API declaration, `packages/projections/src/modules/api` |
| server | the generated server and the Effect runtime it runs on (`packages/projections/src/modules/server`, `packages/language-effect`) |
| sdk | the typed client, `packages/generators/src/modules/render/internal/sdk.ts` |
| cli | the app's own command, `render/internal/cli.ts` and `cli-session.ts` (not `ortho`, the framework's command) |
| mcp | the MCP tools, `render/internal/mcp.ts` and `packages/language-effect/src/modules/mcp` |
| docs | the generated reference, `render/internal/docs.ts`, written to `generated/docs` |
| portal | the data file (`packages/generators/src/modules/portal`) and what the portal decodes and draws (`packages/portal`) |
| telemetry | spans, metrics, step signals and the journal, from `packages/language-effect/src/modules/handler` |

## The grid today

Graded from the code on `origin/m1` at `6419d4b7`. ⁿ marks a card proposed as not needed by design (Q2). Each
cell's `path:line` and what it means are in its lane's section below.

| # | Lane | model | api | server | sdk | cli | mcp | docs | portal | telemetry |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | [Operation & read](#1-operation) | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ~ | ✓ |
| 2 | [Error & refusal code](#2-error) | ✓ | ~ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ~ |
| 3 | [Thing & fields](#3-thing) | ~ | ✓ | ✓ | ~ | ~ | ~ | ~ | ~ | ✓ |
| 4 | [Step](#4-step) | ✓ | ✓ | ✓ | ✗ⁿ | ✗ⁿ | ✗ⁿ | ~ | ~ | ✓ |
| 5 | [Machine, states, move](#5-machine) | ✓ | ~ | ✓ | ✗ | ✗ | ✗ | ✓ | ~ | ~ |
| 6 | [Event](#6-event) | ✓ | ✓ | ✓ | ✗ | ✗ⁿ | ✗ⁿ | ~ | ~ | ~ |
| 7 | [Field visibility (secret, private)](#7-visibility) | ✓ | ✗ | ✗ | ✗ | ~ | ✓ | ~ | ✗ | ✓ |
| 8 | [Journey & starting world](#8-journey) | ✓ | ✗ⁿ | ✗ⁿ | ✗ⁿ | ✗ⁿ | ✗ⁿ | ✗ | ✗ | ~ |
| 9 | [Roles](#9-roles) | ✓ | ✓ | ✓ | ✗ | ✗ | ~ | ✓ | ~ | ~ |
| 10 | [Environment](#10-environment) | ✓ | ✗ⁿ | ~ | ✗ | ~ | ✗ⁿ | ✗ | ~ | ~ |
| 11 | [Store](#11-store) | ✓ | ✗ⁿ | ✓ | ✗ⁿ | ✗ⁿ | ✗ⁿ | ~ | ✗ | ✗ |
| 12 | [Mount, adapter, plugin origin](#12-mount) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| 13 | [Runs on the device (runs: "client")](#13-device) | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ⁿ | ✗ | ✗ | ~ |

**In numbers:** 48 ✓, 31 ~ and 38 ✗ of 117. 17 of the ✗ are proposed not needed (Q2), which leaves 52 cards to build. By column, ✓ out of 13: model 12, api 7, server 10, sdk 4, cli 3, mcp 4, docs 4, portal 0, telemetry 4.

**Where this differs from the audit.** The audit's grid (K12) was read from a wider sweep; this one is read cell
by cell against each card's own green, so some cells moved. Up: the CLI and MCP refusal cards (both print the code,
`render/internal/cli.ts:55`, `mcp/internal/tool.ts:36`); event on the server (the runtime journals it in the commit,
`handler/internal/move.ts:61`); event and machine telemetry partly there (`event.name` is written, on the wrong span,
`move.ts:73`); journey telemetry (prove reads its spans back); environment on the server, the CLI (`session sign-in
--env`) and telemetry (`deployment.environment` on every span's resource); the device lane's CLI (check 11 runs a
client operation through the generated CLI). Down: the model and docs of things (no field can carry a description), the
CLI of operations (no `--help` text), the API of errors (`InvalidPayload` has no code), the API and portal of
machines (states are plain strings; the portal draws a table, not the lifecycle strip), docs of steps (no
`optional`, writes or call), the portal of operations (no list options, `runs` or `via`). And where a card's green
is "looks native" or an absence, the mount lane's clients and the device lane's API and server count as ✓.

### 1. operation

**Operation & read.** Every operation and read is one endpoint, one SDK function, one CLI command, one MCP tool, one docs page and one portal page, with its description, who may call, its idempotency and its budget, and every call is counted and traced.

**How it is proved.** The operation's page in the portal (the in-and-out band, the spine, the proof tab with its journeys' verdicts) and the operations matrix on home (calls, refused, defects, p95 against budget); journeys through each client (M2.08).

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:73` | Each operation and read is in the model with its kind, description, payload, answer, allowed, idempotency, budget, list options, `via` and `runs`. | the compiler's model tests; e2e/m1/12-projections.test.ts. | M1.03 (done) |  |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:73` | One endpoint per operation and read, its schemas from the declaration. | e2e/m1/12-projections.test.ts. | M1.11 (done) |  |
| server | ✓ `packages/language-effect/src/modules/handler/internal/read.ts:42` | Each operation is served through its handler and each read generically, with the role check and a span. | e2e/layer2; e2e/m1/12-projections.test.ts. | M1.11 (done) |  |
| sdk | ✓ `packages/generators/src/modules/render/internal/sdk.ts:23` | One function per operation and read, with the description as its doc comment, calling the API. | e2e/m1/14-clients.test.ts; M1.41 calls every operation once through the SDK; M2.08 runs journeys `--through sdk`. | M1.12 (contract); M2.08 (journeys) |  |
| cli | ~ `packages/generators/src/modules/render/internal/cli.ts:6` | One command per operation and read whose `--help` is the operation's description; a refusal exits with its declared code. | e2e/m1/14-clients.test.ts; M1.41 calls every operation through the CLI; M2.08 runs journeys `--through cli`. | M1.42 (help text); M2.08 (journeys) |  |
| mcp | ✓ `packages/generators/src/modules/render/internal/mcp.ts:21` | One tool per operation and read, described from the model, reads marked read-only, operations closed to agents left out. | e2e/m1/14-clients.test.ts; packages/language-effect/src/modules/mcp/mcp.test.ts; M2.08 runs journeys `--through mcp`. | M2.08 (journeys); M1.37 adds hints (M3) |  |
| docs | ✓ `packages/generators/src/modules/render/internal/docs.ts:34` | One page per operation and read: description, who may call, read paging, idempotency, budget, payload, answer, refusals. | packages/generators/src/modules/render/render.test.ts; M1.41. | built; evidence M1.41 |  |
| portal | ~ `packages/portal/src/modules/wire/types.ts:49` | Each operation has its page (the in-and-out band and the spine), and home's operations matrix counts its calls, refusals, defects and p95 against its budget; a read's list options, `runs` and `via` are decoded too. | M1.13's screenshot of `handle.claim`'s page and the matrix lit by a journey's run. | M1.13 |  |
| telemetry | ✓ `packages/language-effect/src/modules/handler/service.ts:102` | Each call has the operation's span (`operation`, `attempt`, principal) and is counted in `ortho.calls` and `ortho.call.duration`, reads included. | packages/language-effect/src/modules/handler/internal/call-metrics.test.ts; e2e/m1/17-telemetry-model.test.ts. | M1.18, M1.20 (done) |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **cli.** One command per operation and read, a flag per payload field. The operation's description is only a doc comment in the generated source, never the command's `--help`, so a person at the terminal can't read it. Regraded from the reader's ✓ against this card's green.
- **portal.** Wire Operation has kind, description, payload, answer, allowed, idempotent, budget.p95Ms and detail.ts renders them. Missing from the wire: list (where/order/page), runs, via.

### 2. error

**Error & refusal code.** Every refusal a caller can get, declared or the runtime's own, has a name, a code and an exit, and the same three reach the SDK as a typed class, the CLI as `[code] Name` and its exit, MCP as an error with its code, the docs' refusals table, the portal's arrows and counts, and the span.

**How it is proved.** Refusals on the arrow they guard and in the in-and-out band, counted by code (portal.md); M1.41's refused claim prints `HN-001`; `refusal.code` on the span (M1.36).

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:50` | Every declared error and wrong-state refusal has its fields, exit and code, and the model maps every refusal to its code. | the compiler's model tests. | built |  |
| api | ~ `packages/projections/src/modules/api/internal/api.ts:56` | Every refusal is a typed error with its code and exit, the runtime's own `InvalidPayload` included. | e2e/m1/14-clients.test.ts; M1.41 reads every refusal's code. | M1.42 (proposed addition: a code for `InvalidPayload`) |  |
| server | ✓ `packages/language-effect/src/modules/handler/service.ts:100` | Each refusal leaves the server typed with its code: declared ones from the handler, `NotAllowed` from the role check, the wrong-state one from the machine check. | e2e/layer2; e2e/m1/14-clients.test.ts. | built |  |
| sdk | ✓ `packages/generators/src/modules/render/internal/sdk.ts:133` | Each refusal is a typed class in the call's error channel, with its code. | e2e/m1/14-clients.test.ts:181. | M1.12 |  |
| cli | ✓ `packages/generators/src/modules/render/internal/cli.ts:55` | A refusal prints `[code] Name { public fields }` and exits with its declared code. | e2e/m1/14-clients.test.ts; M1.41's refused claim prints its code. | built; evidence M1.41 |  |
| mcp | ✓ `packages/language-effect/src/modules/mcp/internal/tool.ts:36` | A refusal is an error result carrying its code and name, its fields cut to what the agent may see. | packages/language-effect/src/modules/mcp/mcp.test.ts:70. | built; M1.37 makes it structured (M3) |  |
| docs | ✓ `packages/generators/src/modules/render/internal/docs.ts:17` | Each operation's page has a refusals table: name, exit, code and when. | render.test.ts. | built |  |
| portal | ~ `packages/portal/src/modules/wire/types.ts:44` | Errors are decoded with their codes and exits and shown on the thing's page, on the arrow they guard and in the band, counted by code. | M1.41 reads errors with codes in the data file; M1.13's screenshot. | M1.42 (wire), M1.13 (pages) |  |
| telemetry | ~ `packages/language-effect/src/modules/handler/service.ts:100` | The span carries `refusal` and `refusal.code`, and `ortho.calls` counts by code. | e2e/m1/17-telemetry-model.test.ts:251 (written ahead, red). | M1.36 |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** Each declared refusal is a tagged error with its code, exit and the fields shown. The runtime's own `InvalidPayload` has no code in the model, so one refusal a caller can get has none. Regraded from the reader's ✓ (who noted the gap) against this card's green.
- **portal.** Wire Operation errors and refusals are name arrays; no codes or exits in the structured model, and detail.ts:43 lists names only. Codes appear only inside the embedded docs markdown the page also renders.
- **telemetry.** Operation span gets refusal: <name> (and refusal.log) but no refusal.code; reads do the same (read.ts:67). The ortho.calls counter carries the refusal name only.

### 3. thing

**Thing & fields.** Every thing the blueprint declares, with every field's type, reference, optionality, visibility and description, is the same in every output: typed in the SDK, a typed and described flag in the CLI, an input and output schema in MCP, a reference page in the docs, and a card and page in the portal.

**How it is proved.** The portal's home (one card per thing, grouped by `from`) and each thing's page, with the in-and-out band showing every field and its visibility; M1.41 reads every output for each thing's type and fields; the stage 1 journeys run through the SDK, CLI and MCP (M2.08).

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ~ `packages/compiler/src/modules/model/types.ts:18-26` | Each thing is in the model with its description and every field's type, named value, reference, optionality, visibility and description. | M1.41 reads `generated/model/model.json` for every field's description; the compiler's model tests. | M1.42 (it needs a way to declare a field's description first: see note) |  |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:80-81` | Every endpoint's payload and answer schemas are the declaration's own fields, so each field is typed on the wire. | e2e/m1/12-projections.test.ts; M1.41's generated-API read. | M1.11 (done); evidence in M1.41 |  |
| server | ✓ `packages/language-effect/src/modules/handler/service.ts:60` | The server decodes every payload and answer against the declaration's fields and refuses a bad one. | e2e/layer1/05-the-generated-surfaces.test.ts; M1.41's calls. | M1.11 (done) |  |
| sdk | ~ `packages/generators/src/modules/render/internal/sdk.ts:132-134` | The SDK exports a type for each thing (and its fields), not only one function per operation, so a caller can name a `Link` or a `Profile`. | M1.41: the generated SDK exports each thing's type; ST1.02's journeys through the SDK (M2.08). | M1.42 |  |
| cli | ~ `packages/generators/src/modules/render/internal/cli.ts:9` | Each payload field is a flag typed from its value (number, enum, id), whose help is the field's description; an answer prints by field, not as one blob. | M1.41: `links link add --help` shows each field's description; a mistyped flag is refused before the call. | M1.42 |  |
| mcp | ~ `packages/generators/src/modules/render/internal/mcp.ts:24` | Each tool's input schema describes every public field, and it offers an output schema from the answer, so an agent knows the shape it gets back. | M1.41 for described inputs; M1.37's check (an MCP client lists output schemas) for the output schema. | M1.42 (inputs described); M1.37 (output schema, in M3 since K13) |  |
| docs | ~ `packages/generators/src/modules/render/internal/docs.ts:12` | Each thing has a reference page with a field table: type, reference or named value, optional, visibility and description. | packages/generators/src/modules/render/render.test.ts; M1.41 reads the docs for each field. | M1.42 (descriptions); the rest is built |  |
| portal | ~ `packages/portal/src/modules/wire/types.ts:12-17` | Home shows one card per thing, and the thing's page shows every field with its type, visibility and description, decoded from the data file (not only the embedded docs). | M1.13's screenshot of links' home and `profile`'s page at a fixed `now`; M1.41 reads the data file. | M1.42 (the wire), M1.13 (the pages) |  |
| telemetry | ✓ `packages/language-effect/src/modules/handler/internal/attributes.ts:10-23` | A thing's public, non-text fields (and text fields marked `traced`) appear as `payload.*` and `answer.*` attributes on the operation's span; nothing else does. | packages/language-effect/src/modules/handler/internal/attributes.test.ts; M1.19's "leaks nothing" eval; e2e/m1/16-visibility.test.ts for the telemetry audience. | M1.19 (done); M1.35 moves it onto the one rule |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **model.** Things, fields, types, references, optionality and visibility are all in the model. No field has a description: `FieldModel` has no such key, and the blueprint has nowhere to write one (`Blueprint.thing` takes a description for the thing only, `packages/orthograph/src/modules/things/types.ts:27`). M1.41 asks for each field's description in every output, so M1.42 must add one to the blueprint and the model first.
- **sdk.** Operation functions take PayloadOf<typeof declaration> and return the answer, so fields are typed per call; but index.ts exports no type for a thing or its fields, only one function per operation.
- **cli.** One Flag.String per payload field, decoded by the declaration; flags have no help text (and the model has no field description to draw on); a single-field answer prints its bare value, otherwise whole JSON (cli.ts:77-78).
- **mcp.** Catalog entry has only the operation description and declaration; input schema is made at runtime from the payload (mcp/internal/tool.ts:86); no output schema is offered.
- **docs.** Thing and operation pages have a field table with type, reference or named value, optional and visibility. No field has a description to show, because the model has none. Regraded from the reader's ✓ against this card's green.
- **portal.** Wire Field decodes only value/named/ref/optional; visibility is in the data file (model embedded) but dropped on decode; no description.
- **telemetry.** Payload and answer fields become `payload.<f>` and `answer.<f>` attributes when public and non-text, or marked traced (O2, M1.19). That limit is the rule, not a gap, so the card is green by its own definition; the reader graded it ~ against "every field".

### 4. step

**Step.** Every declared step (its kind, the stores it writes, whether it is optional, and the adapter it calls) is in the model, run in order by the server, documented, drawn on the operation's spine and traced as its own span, and never part of a client's contract.

**How it is proved.** The operation's spine in the portal: each declared step in its place, a finished call's spans down it, a running call's step signals as they arrive (M1.21); `ortho prove --empty` shows one red step per blank.

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:64` | Each step's name, kind, writes, optional and call are in the model. | the compiler's model tests. | M1.03, M1.14 (done) |  |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:84` | The endpoint carries the declared steps with the declaration the handler is built from. | e2e/m1/12-projections.test.ts. | built |  |
| server | ✓ `packages/language-effect/src/modules/handler/service.ts:43` | The handler is given one wrapper per declared step, run in a span; a call step goes through the adapter's runner. | e2e/m1/04-adapter-calls.test.ts; e2e/m1/13-live-steps.test.ts; e2e/m1/10-empty-and-scaffold.test.ts. | M1.14, M1.26 (done) |  |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:23` | Steps never appear in the SDK's surface: a caller sees the answer or a refusal, never the steps. | new: a generated check that the SDK's exported types name no step (Q1). | Q1 for Aaron | Not needed by design: steps are the handler's inside, and exposing them would make every handler refactor a breaking change for callers (K13). Proposed as a live absence check, Q1. |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:6` | Steps never appear in the CLI's commands or output. | new: the same absence check (Q1). | Q1 for Aaron | Not needed by design, as for the SDK (Q1). |
| mcp | ✗ `packages/generators/src/modules/render/internal/mcp.ts:21` | Steps never appear in a tool's schema; an agent calls the tool. | new: the same absence check (Q1). | Q1 for Aaron | Not needed by design, as for the SDK (Q1). |
| docs | ~ `packages/generators/src/modules/render/internal/docs.ts:46` | The operation's page lists each step with its kind, the stores it writes, whether it is optional and the adapter call it makes. | render.test.ts extended; M1.41 reads the docs for step details. | M1.42 (proposed: name the docs in its row beside the portal) |  |
| portal | ~ `packages/portal/src/modules/wire/types.ts:47` | The spine draws each declared step with its kind, writes, optional and call, and lights each from its span or step signal. | M1.41 reads step details in the data file; M1.13's screenshot of the spine with a call down it; e2e/m1/13-live-steps.test.ts. | M1.42 (wire), M1.13 (spine) |  |
| telemetry | ✓ `packages/language-effect/src/modules/handler/service.ts:43-49` | Each step is a span named `<op>.<step>` with `step.kind`, and sends a signal as it starts and ends. | e2e/m1/13-live-steps.test.ts; packages/language-effect/src/modules/handler/internal/signal.test.ts. | M1.21 (done) |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **sdk.** SDK function takes payload and returns answer; steps are not mentioned.
- **cli.** CLI command maps flags to the SDK call; no step shown.
- **mcp.** Catalog entry has description and declaration only; steps not in the tool.
- **docs.** Operation page has a Steps section listing name and type per step. Missing: optional, the stores a step writes, and the adapter call of a call step.
- **portal.** Wire step is only { name, type } and detail.ts:44 prints that; optional, writes and call are dropped. Live view joins step signals by span id (live/internal/join.ts) separately.

### 5. machine

**Machine, states, move.** A thing's lifecycle (its states, its moves, what each move emits and the refusal for a wrong state) is typed in every client, documented, drawn as the lifecycle strip in the portal, and every move is traced from and to.

**How it is proved.** The lifecycle strip on a thing's card and page, with move counts on each arrow and refusals on the arrow they guard (portal.md, "A thing's page"), lit by `move.name`, `move.from` and `move.to`.

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:48` | Each thing's machine (states, moves with from, to and emits, the wrong-state refusal) and each operation's move are in the model. | e2e/m1/12-projections.test.ts. | built |  |
| api | ~ `packages/projections/src/modules/api/internal/api.ts:35` | Each move-guarded endpoint declares the wrong-state refusal, and a thing's `state` is typed as the union of its states, not a string. | M1.41 reads the generated API for each machine's states. | M1.42 (proposed addition: `state` as a literal union in the answer schema) |  |
| server | ✓ `packages/language-effect/src/modules/handler/internal/move.ts:39` | A wrong-state call is refused before the handler; a move sets the state and commits it with its journal entry. | packages/language-effect/src/modules/handler/internal/commit.test.ts; e2e/layer2. | built |  |
| sdk | ✗ `examples/acme/generated/sdk/src/organization/get.ts:8` | A thing's state is a typed union in the SDK, and the wrong-state refusal is a typed class. | M1.41 reads the SDK's types; ST1.02 through the SDK (M2.08). | M1.42 |  |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:1` | A `get` prints the state, and a command's help says which states it moves from and to. | M1.41 reads `--help`. | M1.42 |  |
| mcp | ✗ `packages/language-effect/src/modules/mcp/internal/tool.ts:32` | A tool's description says which states it moves from and to, and its output schema types the state. | M1.37's output-schema check. | M1.37 (M3) |  |
| docs | ✓ `packages/generators/src/modules/render/internal/docs.ts:66` | The thing's page lists its states, the wrong-state refusal and a move table; each operation's page has its move. | render.test.ts; M1.41. | built; evidence M1.41 |  |
| portal | ~ `packages/portal/src/modules/site/internal/detail.ts:58` | The lifecycle strip is drawn from the machine on the thing's card and page, with live move counts on each arrow. | M1.13's screenshot of `handle`'s lifecycle lit by a journey's claim. | M1.13 |  |
| telemetry | ~ `packages/language-effect/src/modules/handler/internal/move.ts:48` | Every move writes `move.name`, `move.from` and `move.to` on the operation's span. | e2e/m1/17-telemetry-model.test.ts (written ahead, red on `move.from`). | M1.36 |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** The wrong-state refusal is declared on each guarded endpoint, carrying `state`. States are plain strings: no union type, so the SDK, CLI and MCP can't carry one either. Regraded from the reader's ✓ against this card's green.
- **sdk.** SDK is a thin wrapper over the API client; no state union type, no allowed-moves listing. State is visible only as a string in a get answer and the refusal class's `state`.
- **cli.** No state types and no way to see allowed moves; `get --json` prints the state string with the answer, and a refusal prints `state`.
- **mcp.** Reads keep `state` in list items and the machine refusal exposes `state` as public, but tool schemas carry no state enum and nothing lists allowed moves.
- **portal.** The thing's page draws its states and a move, from, to and emits table from the wire. There is no lifecycle strip and no live count on a move, because no trace source reaches the portal yet (`packages/portal/src/modules/wire/service.ts:8`). Regraded from the reader's ✓ against this card's green.
- **telemetry.** Writes move.name and move.to on the operation span; move.from is not written, and the machine's refusal writes no state. Subject state at call time is not on any span.

### 6. event

**Event.** Every event a move emits is typed in the SDK, documented with its fields, shown on the thing's page with its fields, named on the commit span, and its committed occurrences show in the portal with the commit that wrote them.

**How it is proved.** The thing's page lists its events with their fields; an operation's spine shows the event its commit emitted and the `on:` handlers it set off (M1.21's committed events from the journal).

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/internal/describe.ts:88` | Each thing's events with their fields, and the event each move emits, are in the model. | e2e/m1/12-projections.test.ts. | built |  |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:133` | The generated API exports each event, named, with its schema. | M1.41 reads `generated/api/src/events.ts`. | built; evidence M1.41 |  |
| server | ✓ `packages/language-effect/src/modules/handler/internal/move.ts:61` | A move's event is written to the journal in the same commit, without its secret or private fields. | packages/language-effect/src/modules/handler/internal/commit.test.ts; e2e/m1/13-live-steps.test.ts. | built (M1.21 reads it) |  |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:1` | The SDK exports each event's type, so a caller can name what a move emitted. | M1.41 reads the SDK's exports for `Events`. | M1.42 |  |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:1` | Decided by Q3. | Q3. | Q3 for Aaron | Proposed not needed: a CLI of operations has nothing to do with an event until events can be followed (M5.05). Q3. |
| mcp | ✗ `packages/language-effect/src/modules/mcp/internal/tool.ts:1` | Decided by Q3. | Q3. | Q3 for Aaron | Proposed: events as MCP resources come with M1.37's resources, not before. Q3. |
| docs | ~ `packages/generators/src/modules/render/internal/docs.ts:68` | Each event is documented with its fields and visibility, on its thing's page. | render.test.ts extended; M1.41 reads each event's fields in the docs. | M1.42 (proposed: name the docs in its row) |  |
| portal | ~ `packages/portal/src/modules/wire/types.ts:43` | The thing's page lists its events with their fields, decoded from the data file; committed events show on the operation's spine with their commit. | M1.41 reads events with their fields in the data file; M1.13's screenshot. | M1.42 (wire), M1.13 (pages) |  |
| telemetry | ~ `packages/language-effect/src/modules/handler/internal/move.ts:73` | The commit span `<op>.commit` carries `event.name`. | e2e/m1/17-telemetry-model.test.ts (written ahead, red: today `event.name` lands on the operation's span, not the commit's). | M1.36 |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **sdk.** SDK exports operations and errors only; the API's Events namespace is not re-exported and no event types reach clients.
- **cli.** No command or output names an event.
- **mcp.** No tool, resource or description mentions events or the journal.
- **docs.** Machine table and operation Move section name the emitted event, but the event's fields are not documented and events have no page.
- **portal.** Event is a string in move.emits and the Machine table; the Thing wire has no events field, so event fields are not decoded or drawn.
- **telemetry.** event.name is annotated on the current span inside applyMove, which runs before the commit span opens (service.ts:83-88), so it lands on the operation span; check 17 wants it on `<op>.commit`. Event fields are not traced; a refusal writes none.

### 7. visibility

**Field visibility (secret, private).** One rule decides, per audience, what each field shows: a secret leaves only in the answer of the call that issued it, a private field only to the roles it names, and every output (HTTP answers and refusals, SDK, CLI, MCP, docs, portal, spans, journal, logs) calls the same rule and fails closed.

**How it is proved.** Check 16 renders every output for every audience over a fixture with a public, a private and a secret field (M1.35); the portal's "no leak" check (M1.13); stage 4's club, whose portal shows nothing that names a member (ST4.07).

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/internal/describe.ts:31-41` | Each field's visibility (public by default, private to roles, or secret) is in the model, on payloads, answers, events and errors alike. | the compiler's model tests. | built |  |
| api | ✗ `packages/projections/src/modules/api/internal/api.ts:80-81` | The HTTP schemas a caller is served are cut by the one rule for that caller: a refusal never carries a field the caller may not see. | e2e/m1/16-visibility.test.ts (written ahead, red). | M1.35 |  |
| server | ✗ `packages/language-effect/src/modules/wire/service.ts:5-14` | The server redacts answers and refusals through the one rule before they leave. | e2e/m1/16-visibility.test.ts (red). | M1.35 |  |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:132-134` | The SDK's types and decoded values are the caller's audience's, so a secret never arrives where it wasn't issued. | e2e/m1/16-visibility.test.ts (red). | M1.35, M1.12 |  |
| cli | ~ `packages/generators/src/modules/render/internal/cli.ts:55-58` | Answers and refusals print through the one rule; `Errors.shown` goes. | e2e/m1/16-visibility.test.ts (red). | M1.35 |  |
| mcp | ✓ `packages/language-effect/src/modules/mcp/internal/shown.ts:8-22` | The agent audience: public always, private to a role held, secret never, failing closed on an undeclared field. | packages/language-effect/src/modules/mcp/mcp.test.ts; e2e/m1/16-visibility.test.ts. | built; M1.35 makes it the agent case of the one rule |  |
| docs | ~ `packages/generators/src/modules/render/internal/docs.ts:12` | Every field table (payload, answer, event, error) marks each field's visibility. | render.test.ts extended; M1.41 reads visibility in the docs. | M1.42 (proposed: event and error fields) |  |
| portal | ✗ `packages/portal/src/modules/wire/types.ts:12-17` | The data file's visibility is decoded and drawn (the in-and-out band marks secret and private), and the trace drawer shows only what the telemetry audience may see. | M1.41 reads visibility in the data file; M1.13's "no leak" check. | M1.42 (wire), M1.13 (no leak) |  |
| telemetry | ✓ `packages/language-effect/src/modules/handler/internal/attributes.ts:39` | Spans, the journal and logs carry only fields the telemetry audience may see: public, and text only when marked traced. | packages/language-effect/src/modules/handler/internal/attributes.test.ts; e2e/m1/16-visibility.test.ts. | built (M1.19); M1.35 moves it onto the one rule |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** Answer and payload schemas are the declaration's whole schemas; visibility is used only to build the CLI 'shown' list of refusal fields (api.ts:21), nothing is cut from an HTTP body.
- **server.** Refusals are rebuilt with every field but _tag, secret and private included; answers go out whole. No visibility module exists in language-effect (modules list has none); only mcp/internal/shown.ts redacts.
- **sdk.** SDK decodes the whole answer and typed failure; visibility is not read.
- **cli.** Refusal print shows only public fields (Errors.shown); an answer prints whole (cli.ts:77-78) and --json prints the whole text(a).
- **docs.** Field tables mark '(secret)' or 'private to <roles>' on thing and operation pages; refusal fields in the errors table not checked, and no audience concept.
- **portal.** Wire Field has no visibility; the model is embedded in the data file but the schema drops the key, so pages cannot show it.

### 8. journey

**Journey & starting world.** Every journey and starting world is in the model, runs through each client (SDK, CLI, MCP), is listed in the docs as the worked example of the operations it covers, and shows in the portal as the proof on each operation, its runs lighting up what it touched.

**How it is proved.** The proof tab on each operation (the journeys that cover it and their verdicts, M1.04) and the proof matrix per environment (portal.md); `ortho prove` passing `--through sdk|cli|mcp` (M2.08).

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:144` | Journeys (cast, start, steps with their checks) and starting worlds are in the model. | packages/prove/src/modules/journeys/journeys.test.ts; Gate M1 item 4. | M1.03 (done) |  |
| api | ✗ `packages/projections/src/modules/api/internal/api.ts:1` | Not needed. | none. | none | Proposed not needed (Q2): a journey is a proof, not something a client calls. |
| server | ✗ `packages/projections/src/modules/server/service.ts:22` | Not needed. | none. | none | Proposed not needed (Q2): proof runs beside the server, never in it (`ortho prove` builds its own worker). |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:62` | Not needed as a surface; journeys run through the SDK (M2.08). | M2.08. | M2.08 | Proposed not needed (Q2): a journey runs the SDK; it is not part of it. The SDK column is proved by journeys, which is this lane's job. |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:1` | Not needed in the app's CLI; `ortho prove` runs journeys, and runs them through the CLI (M2.08). | M2.08. | M2.08 | Proposed not needed (Q2): journeys belong to the framework's `ortho`, not the app's command. |
| mcp | ✗ `packages/language-effect/src/modules/mcp/internal/tool.ts:1` | Not needed as a tool; journeys run through MCP (M2.08). | M2.08. | M2.08 | Proposed not needed (Q2): proving is not an agent's tool. |
| docs | ✗ `packages/generators/src/modules/render/internal/docs.ts:1` | Each operation's page lists the journeys that cover it, as worked examples drawn from the model. | new: render.test.ts. | M1.13 (proposed addition) |  |
| portal | ✗ `packages/portal/src/modules/wire/service.ts:7` | The wire decodes journeys and starting worlds (today it says "unavailable", and the reason is stale), and each operation's proof tab shows its journeys and their verdicts. | M1.13's proof tab; M1.41 reads journeys in the data file (proposed addition). | M1.13 (journeys, starting worlds, the proof tab) |  |
| telemetry | ~ `packages/prove/src/modules/journeys/internal/device.ts:62` | A journey's calls are traced under the journey's name and step, so the portal lights what a run touched. | e2e/layer1/02-acme-proves.test.ts (spans read back); new for the names. | M1.13 (proposed addition: `journey` and `journey.step` on prove's spans, which its "a journey's run lights up its operation" needs) |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** Journeys are not part of the HTTP surface.
- **server.** The deployed server carries no journeys. Prove builds a temporary empty-handler Worker (emptyServer) just to run them; a prove-time tool, not the served output.
- **sdk.** SDK has no journey surface; journeys call operations through a cast (s.ada.run), not the SDK (examples/acme/journeys/README.md:64).
- **cli.** The generated app CLI has no journey command; running journeys is the framework's `ortho prove`.
- **mcp.** No journey tool or resource.
- **docs.** Docs render things and operations only; the journeys that exercise an operation are not rendered as examples or pages, though the model holds them.
- **portal.** The portal wire marks journeys explicitly unavailable ('the compiler's model has no journey projection'); the reason is stale, the model has journeys, but ModelSchema (wire/types.ts:68) does not read them.
- **telemetry.** A journey call runs under a trace and a parent span (prove prefix) and prove reads spans back through trace-trees to check present/absent spans (checks.ts:82). The runtime writes no journey.name attribute and no journey record is exported.

### 9. roles

**Roles.** Who may call each operation is declared once and is true everywhere: enforced by the server, said in the SDK's doc comment, the CLI's help and the MCP tool's description, MCP lists only the tools the caller's roles allow, the docs and portal show each role rule, and each span says which role let the call through.

**How it is proved.** Roles on a thing's page and `allowed` in each operation's band (portal.md); the stage 1 journeys "a stranger can't edit" run through every client (ST1.02 with M2.08); M2.02's principal journeys.

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/internal/describe.ts:90-102` | Each thing's roles and role rules, and each operation's `allowed`, are in the model. | the compiler's model tests. | M1.03 (done) |  |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:40-42` | Every operation declares `NotAllowed` with its code. | e2e/layer1/05-the-generated-surfaces.test.ts. | built |  |
| server | ✓ `packages/language-effect/src/modules/handler/service.ts:60` | The role check runs before the handler on every operation and read, and refuses with `NotAllowed`. | packages/language-effect/src/modules/access/access.test.ts; acme's journey "an outsider can't revoke"; ST1.02 "a stranger can't edit". | built; M2.03 adds the new principals |  |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:132-134` | Each function's doc comment says who may call it. | M1.41 reads the SDK's doc comments (proposed addition to M1.41). | M2.03 (proposed addition) |  |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:9` | Each command's help says who may call it; `NotAllowed` prints its code and exits 3. | M1.41 reads `--help` (proposed addition). | M2.03 (proposed addition) |  |
| mcp | ~ `packages/language-effect/src/modules/mcp/internal/tool.ts:19-24` | Only the tools the caller's roles allow are listed, each description says who may call, and an operation closed to agents (`.notVia(Via.agent)`) has no tool. | M2.02's "an agent passes the owner rule unless `.notVia(Via.agent)`"; M3.22's tool exposure from `allowed` and `via`. | M2.03 (`.via`, `.notVia`), M3.22 (exposure) |  |
| docs | ✓ `packages/generators/src/modules/render/internal/docs.ts:15` | Each operation's page says who may call, and each thing's page shows its role rules. | render.test.ts. | M1.13 (role rule text) |  |
| portal | ~ `packages/portal/src/modules/wire/types.ts:46` | The thing's page lists its roles with their rules, and each operation's band shows `allowed`. | M1.13's screenshot; M1.41 reads role rules in the data file. | M1.13 (role rules, K12 section 6) |  |
| telemetry | ~ `packages/language-effect/src/modules/handler/internal/attributes.ts:17-18` | Each span says which kind of caller it was and which role let the call through, never which person. | e2e/m1/17-telemetry-model.test.ts extended (proposed). | M2.03 (proposed addition: `principal.role`) |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **server.** `Access.check` runs before the handler, and role rules and role-of paths are decided in `access/service.ts`; acme's journeys prove refusals end to end. The reader graded ~ for want of an HTTP-level test; journeys are that test, so the card is green by its definition.
- **sdk.** SDK says nothing about who may call an operation or what roles exist; callers learn from a NotAllowed failure.
- **cli.** No help line or command text says who may call; NotAllowed prints its code and exit 3.
- **mcp.** Roles the caller holds are computed (Access.holds) to redact private fields; every tool is listed regardless of the caller's roles and the description omits who may call. Via.agent narrows tools at generation (render/internal/mcp.ts:10); notVia is not in the code at all.
- **portal.** Wire has thing roles (names) and operation allowed with kind/role/path; detail.ts:15,60 draws them. roleRules and the 'private to' link are not decoded.
- **telemetry.** Spans carry principal.person or principal.kind, and ortho.calls has principal.kind; the role held in the call is not recorded.

### 10. environment

**Environment.** Each declared environment (where it runs, its identity, its stores' bindings, its secrets by name, its telemetry sink, its domains) is served as declared, named on every call's span, documented, and is the portal's switcher; whether the clients know environments by name is Q4.

**How it is proved.** The portal's environment switcher in the top bar and the proof matrix (every operation against every environment, portal.md "Environments"); `environment` on every span (M1.36).

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:116` | Each environment's runs, identity, lifetime, cloud and database, store bindings, secret names, sinks, deploy domains and publish targets are in the model. | the compiler's model tests. | built |  |
| api | ✗ `packages/projections/src/modules/api/internal/api.ts:1` | Not needed. | none. | none | Proposed not needed (Q2): the HTTP contract is the same in every environment; only where it is served differs. |
| server | ~ `packages/projections/src/modules/server/internal/server.ts:148` | The server reads which environment it is, binds each store as that environment declares, and gates test-world routes to environments with a lifetime. | packages/projections/src/modules/server/server.test.ts; M7.03's `ortho env up staging` plans per-environment bindings. | M7.03 (bindings per environment) |  |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:98` | Decided by Q4. | Q4. | Q4 for Aaron |  |
| cli | ~ `packages/generators/src/modules/render/internal/cli-session.ts:41` | Decided by Q4. | Q4. | Q4 for Aaron |  |
| mcp | ✗ `packages/generators/src/modules/render/internal/mcp.ts:6` | Not needed. | none. | none | Proposed not needed (Q2): each environment serves its own MCP at its own domain; the tool list does not change by environment. |
| docs | ✗ `packages/generators/src/modules/render/internal/docs.ts:1` | The docs have an environments page: each environment, where it is served, its sink, its stores' bindings and its secrets by name. | new: render.test.ts for the page. | M1.13 (proposed addition: the environments page) |  |
| portal | ~ `packages/portal/src/modules/wire/types.ts:67` | The top bar's switcher is built from the model's environments and their domains; each environment's portal reads only its own sink. | M1.13's screenshot of the switcher; M1.41 reads environments in the data file. | M1.13 (environments, K12 section 6) |  |
| telemetry | ~ `packages/host-cloudflare/src/modules/telemetry/service.ts:9` | Every call's span carries `environment` (the resource already carries `deployment.environment`). | e2e/m1/17-telemetry-model.test.ts:267 (written ahead, red). | M1.36 |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** No environment appears in the api projection or generated/api.
- **server.** Server reads ORTHO_ENVIRONMENT, gates /_world/* by the environments that declare a lifetime, and passes the name to Telemetry. wrangler.jsonc (worker-config.ts:9) is one local file: no per-environment bindings, domains or database from the environment declarations (those are done by ortho env up / ship in packages/cli).
- **sdk.** Sdk.layer(baseUrl, token) takes a URL; the SDK knows no environment names or per-environment URLs.
- **cli.** `session sign-in --env <env>` and `session show --env` keep one session per environment name, but the name is a free string (not checked against the model) and the server address is a single ACME_URL variable, defaulting to localhost; there is no environment-to-URL map and no --env on ordinary operation commands (cli.ts:112 uses ACME_URL/ACME_TOKEN).
- **mcp.** The MCP catalog has no environment; the worker only forwards ORTHO_ENVIRONMENT to telemetry (server.ts:209).
- **docs.** Docs pages are per thing and operation; no environments page or mention (acme/generated/docs has no environment content).
- **portal.** Wire has Environment {name, runs, promotesFrom, lifetimeMs} only. Identity, database, per-store binding, secrets, sinks, deploy domains and publish are dropped by the decoder.
- **telemetry.** Every span's resource already carries deployment.environment (host-cloudflare, prove tests). The per-call `environment` plain attribute on the operation span (check 17 item 5) is not written.

### 11. store

**Store.** Each store the blueprint declares (or a mounted plugin brings) has its own binding and migrations, says what lives in it in the docs and the portal's data page, and is named on every call's span; callers never see where a thing lives.

**How it is proved.** The portal's data page (every store, its kind, binding and migrations, M5.06) and a thing's header naming its store; `store` on every span (M1.36); K3's check that a call writing two stores is refused (Gate M1 item 5).

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:178` | Each store (name, kind, from, hash), each thing's store and each environment's store bindings are in the model; a call writing two stores is refused. | packages/compiler/src/modules/model/stores.test.ts; Gate M1 item 5. | M1.17 (done) |  |
| api | ✗ `packages/projections/src/modules/api/internal/api.ts:1` | Not needed. | none. | none | Proposed not needed (Q2): where a thing lives is invisible to an HTTP caller (K12, "What the grid leaves alone"). |
| server | ✓ `packages/projections/src/modules/server/internal/worker-config.ts:21` | Each store gets its own binding and migrations folder, with its things, journal and request keys. | packages/generators/src/modules/render/stores.test.ts. | M1.17 (done) |  |
| sdk | ✗ `packages/generators/src/modules/render/internal/sdk.ts:1` | Not needed. | none. | none | Proposed not needed (Q2): callers do not see where a thing lives. |
| cli | ✗ `packages/generators/src/modules/render/internal/cli.ts:1` | Not needed. | none. | none | Proposed not needed (Q2): callers do not see where a thing lives. |
| mcp | ✗ `packages/generators/src/modules/render/internal/mcp.ts:1` | Not needed. | none. | none | Proposed not needed (Q2): an agent does not need storage placement. |
| docs | ~ `packages/generators/src/modules/render/internal/docs.ts:64` | Each store has a page (its kind, what lives in it, its migrations), and each thing's page links its store. | stores.test.ts extended; M5.06's `generated/data/map.md`. | M5.06 (the data map) |  |
| portal | ✗ `packages/portal/src/modules/wire/types.ts:53` | The data file and wire carry stores, the thing's header names its store, and the data page lists every store. | M5.06's data page; M1.41 reads stores in the data file. | M1.13 (stores in the wire, K12 section 6); M5.06 (the page) |  |
| telemetry | ✗ `packages/language-effect/src/modules/handler/internal/attributes.ts:1` | Every call's span carries `store`. | e2e/m1/17-telemetry-model.test.ts:267 (written ahead, red). | M1.36 |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** api.ts does not mention stores.
- **sdk.** No store in the SDK.
- **cli.** No store in the CLI.
- **mcp.** No store in the MCP catalog.
- **docs.** Thing page says 'in the store <name>' (and database vs actor); there is no page for a store, no list of what lives in it, and no kind.
- **portal.** Wire Thing has `lives` but no `store`; Model has no stores key, so the portal cannot show stores.
- **telemetry.** The operation span does not carry `store` (the kind of the store, check 17 item 5).

### 12. mount

**Mount, adapter, plugin origin.** A plugin mounted with one file brings its things, operations, stores and adapters into every output as if they were the app's own, honouring the mount's narrowing, while the docs, the portal and the spans say where each came from (plugin, package, version) and which adapter a call step called.

**How it is proved.** The portal's tree, one folded group per mounted plugin with its version in the page header (portal.md, "The frame"); a call step on the spine naming its adapter; check 01 mounts a plugin with one command (Gate M1 item 1).

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:12` | `from` (mount, package, version) on things, operations and stores, the mounts, `via` and each call step's adapter are in the model. | e2e/m1/01-mounting.test.ts. | M1.03, M1.06 (done) |  |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:73` | A mounted plugin's operations are served as the app's own, without the ones its mount omits. | e2e/m1/01-mounting.test.ts; e2e/m1/08-verbs.test.ts. | M1.07 (done) | Proposed not needed (Q2): showing a plugin's origin in the HTTP contract; the API is meant to look native. |
| server | ✓ `packages/projections/src/modules/server/internal/server.ts:25` | Each mount is imported once and its operations served; call steps are wired to the adapter's callables. | e2e/m1/04-adapter-calls.test.ts. | M1.09, M1.14 (done) |  |
| sdk | ✓ `packages/generators/src/modules/render/internal/sdk.ts:65` | A mounted plugin's operations are in the SDK as the app's own; a device operation runs from the plugin's host entry. | e2e/m1/03-adapter-mounting.test.ts; e2e/m1/11-client-operations.test.ts. | built | Proposed not needed (Q2): origin in the SDK's surface. |
| cli | ✓ `packages/generators/src/modules/render/internal/cli.ts:6` | A mounted plugin's operations are commands as the app's own. | e2e/m1/01-mounting.test.ts (proposed addition: through the CLI). | built; evidence M1.41 | Proposed not needed (Q2): origin in the CLI. |
| mcp | ✓ `packages/generators/src/modules/render/internal/mcp.ts:10` | A mounted plugin's operations are tools as the app's own; a mount that narrows away `Via.agent` leaves no tool. | e2e/m1/01-mounting.test.ts. | built; M3.22 (exposure from `via`) | Proposed not needed (Q2): origin in a tool. |
| docs | ✗ `packages/generators/src/modules/render/internal/docs.ts:1` | Each page from a plugin names its plugin, package and version, and a call step names its adapter and call. | new: render.test.ts over a mounted fixture. | M1.13 (proposed addition: `from` in the docs) |  |
| portal | ✗ `packages/portal/src/modules/wire/types.ts:35` | The tree groups things by plugin, each page's header names its plugin and version, and a call step names its adapter. | M1.41 reads `from` and mounts in the data file; M1.13's screenshot of links with handles mounted. | M1.42 (`from` in the wire), M1.13 (the tree) |  |
| telemetry | ✗ `packages/language-effect/src/modules/handler/service.ts:28` | An operation's span names its mount, and a call step's span names its adapter and call. | new: e2e/m1/17-telemetry-model.test.ts extended. | M1.36 (proposed addition: `from.mount`, `call.mount`, `call.name`) |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** A mounted plugin's operations are generated as the app's own, and an omitted one is gone (check 08). The reader graded ✗ for showing no origin; this card's green is serving them natively, and the origin is proposed not needed here.
- **sdk.** Mounted operations are in the SDK as the app's own, and `from` is used to load a device operation's host entry. The reader graded ~ for showing no origin; that is proposed not needed here.
- **cli.** Commands are generated per thing and verb from the whole model, mounted operations included. The reader graded ✗ for showing no origin; that is proposed not needed here.
- **mcp.** Mounted operations are tools, and an operation narrowed without `Via.agent` has none. The reader graded ~ for showing no origin; that is proposed not needed here.
- **docs.** No `from`, mount, package or version in docs.
- **portal.** Operation and Thing wire carry no `from`, no mounts, no via; step has only {name,type}, so a call step shows no adapter.
- **telemetry.** A call step is a span `<op>.<step>` with step.kind=call; the adapter, mount, package or call name is not an attribute.

### 13. device

**Runs on the device (runs: "client").** An operation declared `runs: "client"` runs in the caller's process from the SDK and the CLI with no server request, never on the server, is documented as running on the device, marked in the portal, and its spans reach the environment's sink like any call.

**How it is proved.** Check 11 (a client operation through the SDK and CLI with no server call); stage 2's wallet created on the device (ST2.06); the operation's page in the portal marked "on your device", lit by its spans (portal.md gap 4).

| Output | Today | Green means | Evidence | Owner | Not needed? |
|---|---|---|---|---|---|
| model | ✓ `packages/compiler/src/modules/model/types.ts:93` | `runs` is in the model; a client operation is accepted only from a plugin with host entries, and refused without one. | e2e/m1/11-client-operations.test.ts. | M1.27 (done) |  |
| api | ✓ `packages/projections/src/modules/api/internal/api.ts:88` | A client operation has its declaration in the API, for the clients' types, and no route. | e2e/m1/11-client-operations.test.ts. | M1.27 (done) |  |
| server | ✓ `packages/projections/src/modules/names/internal/names.ts:58` | The server holds no code for a client operation. | e2e/m1/11-client-operations.test.ts (the worker holds none). | M1.27 (done) | Kept live as an absence check: a device operation must never run on the server. |
| sdk | ✓ `packages/generators/src/modules/render/internal/sdk.ts:125` | A client operation runs in-process from the SDK, under the app's mount, with its steps as spans. | e2e/m1/11-client-operations.test.ts. | M1.27 (done) |  |
| cli | ✓ `packages/generators/src/modules/render/internal/cli.ts:28` | A client operation runs in-process from the CLI with no server request. | e2e/m1/11-client-operations.test.ts:139-141. | M1.27 (done) |  |
| mcp | ✗ `packages/generators/src/modules/render/service.ts:19` | Not needed through remote MCP. | e2e/m1/11-client-operations.test.ts (no tool). | none | Proposed not needed (Q2): remote MCP reaches the server, which cannot run device code; a local MCP on the device is later work. |
| docs | ✗ `packages/generators/src/modules/render/internal/docs.ts:40` | A client operation's page says it runs on the device and which hosts it supports. | new: render.test.ts. | M1.13 (proposed addition) |  |
| portal | ✗ `packages/portal/src/modules/wire/types.ts:35` | The wire carries `runs`, and the operation's page marks it "on your device". | M1.41 reads `runs` in the data file; M1.13's screenshot. | M1.13 (`runs`, K12 section 6) |  |
| telemetry | ~ `packages/language-effect/src/modules/handler/internal/device.ts:36` | A device operation's spans (operation, steps, refusal, `environment`) reach the environment's sink, so the portal lights it like any call. | e2e/m1/11-client-operations.test.ts:214 (spans exported); new for the sink. | new slice needed: device spans to the environment's sink (portal.md gap 4, ledger `LAH-02`), proposed ST2.07 before ST2.03 |  |

What "today" means, for each card not yet ✓ (and each regraded one):

- **api.** A client operation gets its declaration and no route (`declarationOnly`). That is this card's green; the reader graded ~ against a route.
- **server.** `serverModel` drops client operations, and check 11 proves the worker holds none. That absence is this card's green; the reader graded ✗ by design.
- **mcp.** renderMcp is given serverModel, so a client op has no MCP tool.
- **docs.** Docs page for a client op is written like a server op's; no `runs` or 'runs on your device' text, no host entries.
- **portal.** Wire Operation has no `runs` field; the portal lists the client op's steps (check 11 item 6) but cannot say it runs on the device.
- **telemetry.** Operation span plus a span per step (step.kind), payload/answer attributes and principal, exported over OTLP before return. No journal, commit span, move or refusal attributes (no store, 'no one to ask'), and the `environment`/`store` attributes of check 17 do not apply.

## How the columns relate

The nine columns are not nine independent results. They form three tiers, and a card's evidence follows the tier.

**The source tier: model.** Every other column is generated from the model, so the model card is the floor of its lane.
A building block missing from the model is missing everywhere, and no other card in the lane can be green before it.
The model column is the only one that is green in all thirteen lanes today.

**The surfaces tier: api, server, sdk, cli, mcp.** The SDK, CLI and MCP are all generated from the one API declaration
(`packages/generators/src/modules/render/internal/sdk.ts`, `cli.ts` and `mcp.ts` each import the generated API), so a
fix in the API reaches all three, and a leak in the API reaches all three too (K12 section 1). The server runs what the
API declares. These cards are proved by calls: first by M1.41's loop, which calls every operation once through the
SDK and once through the CLI, then by journeys run through each client (M2.08: `--through sdk|cli|mcp`), which is
Aaron's "the CLI, the SDK, the MCP, those all have their own evidences through their journeys". Until M2.08, journeys
call the server over raw HTTP (`packages/prove/src/modules/journeys/internal/world.ts`, ledger `JOU-02`), so no journey
proves a client.

**The evidence tier: docs, portal, telemetry.** These three describe and show the app; the portal combines the other
two with the model and the logbook:

```text
portal card  =  model structure     (G: what exists, drawn from model.json: the tree, the lifecycle, the in-and-out band)
             +  docs content        (G: the description and reference shown as the page's prose, never copied)
             +  telemetry evidence  (L: calls, refusals, defects, p95, spans and step signals, lighting up the structure)
             +  logbook proof       (L: M1.04's verdicts, the journeys that cover it, what is unproven)
```

So a portal card is green only when, for that building block:

1. the **model** card is green (the portal draws nothing the model lacks);
2. the **portal's data file and wire** carry it (today the wire drops much of what the data file holds: visibility,
   event fields, error codes, `from`; `packages/portal/src/modules/wire/types.ts:12-17`, `:43-44`);
3. the **docs** card is green where the page shows prose for it (the portal links the docs content; it is the docs'
   content area, as Aaron asked, so the docs card's content is what the portal shows);
4. the **telemetry** card is green where the page shows live numbers or traces for it (the portal "can only light up
   what telemetry carries", K12 section 2), and a trace source reaches the portal: today the wire marks traces, journeys
   and evals "unavailable" (`packages/portal/src/modules/wire/service.ts:6-9`), so no portal card is ✓ anywhere;
5. and the portal view itself renders it, checked by M1.13's screenshot at a fixed `now`.

On the board, a portal card shows its dependencies: when it is red because telemetry is red, it says so and links to
the telemetry card, so the lane is climbed bottom-up (model, then the surfaces, then docs and telemetry, then the
portal) rather than by painting the portal first.

**The portal is the end state of every lane.** For each lane the record names the portal view that shows the whole
lane at once. When that view renders the block from the model, with its docs content and its live evidence, and the
surface cards are proved by journeys, the lane is done. The CLI, SDK and MCP are the exception Aaron named: their
proof is their journeys, not a portal view, though the portal shows those journeys' verdicts on the operation's proof
tab.

## The end-to-end story

The grid is proved cell by cell; the story proves it whole, the way a person meets Orthograph. It is one run, in a
fresh folder with nothing but Node and the published packages (Verdaccio locally, npm after M7.02):

| # | Step | What it proves | Lanes it lights | Already described by | Gap |
|---|---|---|---|---|---|
| 1 | `npm create orthograph links` in an empty folder | the front door works with no checkout of this repository | all, at the model | M2.09 (`ortho new` scaffolds `links` at stage 1, identical to `examples/links`) | none once M2.09 lands |
| 2 | `ortho generate`, then `ortho prove --env local` | every output is written and every journey passes on workerd | thing, operation, step, machine, event, error, roles, journey | M1.41 (the loop through the real `ortho` binary), M2.12 | M1.41 copies `examples/links` into the folder; the story starts from `ortho new` instead, so the two meet only at M2.09 |
| 3 | the server runs; every operation is called once through the SDK, the CLI and MCP; a refused claim prints `HN-001` and exits 3 | the surfaces tier, for every lane in stage 1 | the surfaces columns of every stage 1 lane | M1.41 (SDK and CLI), M2.08 (journeys `--through sdk|cli|mcp`) | M1.41 calls no MCP tool; M2.08 brings it |
| 4 | the portal opens on links' things; a claim lights `handle.claim` and its move, its event, its commit; the proof tab shows the journeys' verdicts | the evidence tier | docs, portal, telemetry of every stage 1 lane | M1.13 (the portal opens on links' things, a journey's run lights its operation and move) | the portal wire still says traces and journeys are "unavailable" (`packages/portal/src/modules/wire/service.ts:6-9`) |
| 5 | `ortho add feature @orthograph/handles`, then auth (ST1.03, ST1.07); the grid stays green | mounting keeps the promise: a mounted plugin's blocks reach every output with their `from` | mount | M1.10, ST1.03, ST1.07 | no check reads every output for a mounted block's `from` |
| 6 | stage 2: `ortho add feature @orthograph/wallets`; create a wallet on the device; be paid by handle on Anvil; a reorg corrects it | device operations, adapters, chain events, environments with a chain | device, mount (adapters), event (from the follower), environment | ST2.06 | the device lane's CLI, MCP and portal cards have no slice (see that lane) |
| 7 | stage 3: a Safe with the budgets plugin, hats, owners sign above a budget | stores on a chain, workflows, agents under their own hat | store, roles (hats), and the rows still to come | ST3.08 | workflows and agents are not rows yet |
| 8 | stage 4: the same on Aztec; the portal shows the footprint and never a member | visibility at its hardest | visibility | ST4.08 (`the portal shows nothing that names a member`, ST4.07) | none beyond the stage's own slices |

**What is missing to run it as one story.** Each stage gate proves its stage, but nothing yet runs the stages in one
folder from nothing, and nothing reads the grid at each step. Proposed, a new slice after Gate M2: **the story check**
(`e2e/story`), written by an author who is not the builder: steps 1 to 5 in a fresh folder through the real `ortho`
binary, and after each step it evaluates every card's evidence that applies and writes one verdict per card to the
logbook (kind `grid`, keyed by card id and revision), so the board's colours come from verdicts, never from a hand
edit. Steps 6 to 8 are appended as each stage gate lands. Until it exists, the board's colours are set from this record
and each card's evidence run by hand.

## Hill-climb order

No lane can be fully green before M1.13, because every lane's end state is a portal view and the portal column is ✗
or ~ in all thirteen today (its wire drops most of the model, and no trace source reaches it:
`packages/portal/src/modules/wire/service.ts:6-9`). So the climb is: build the evidence path once on the lane that
needs least besides it, then let every lane after reuse it.

| Order | Lane | Why here | What turns it green |
|---|---|---|---|
| 1 | Operation & read | Seven of nine cards are ✓ already. Climbing it builds the whole evidence path (M1.41's loop through the real binary, M1.13's portal opening on links, journeys' verdicts on the proof tab) with almost no new model work, so it is the first fully green lane and the template for the rest | M1.42 (the CLI's `--help`), M1.13 (the operation page, the matrix) |
| 2 | Error & refusal code | Six ✓; refusals are what a person meets first when something goes wrong, and `HN-001` is in M1.41's done-when | M1.42 (codes in the wire, a code for `InvalidPayload`), M1.36 (`refusal.code`), M1.13 |
| 3 | Thing & fields | The model card is ~ because no field can be described; that is a blueprint change, small but upstream of every other output's help and schema text, so it lands early | M1.42 (a field description in the blueprint and model, thing types in the SDK, typed and described flags, the wire), M1.13 |
| 4 | Step | Only docs and the portal are left, and Q1 settles the three client cards | M1.42 (step details in the docs and the wire), M1.13 (the spine) |
| 5 | Machine, states, move | Needs the state union in the API, which the SDK, CLI and MCP then carry | M1.42 (the union), M1.36 (`move.from`), M1.13 (the lifecycle strip), M1.37 for MCP (M3) |
| 6 | Event | Waits on Q3 for the CLI and MCP; the rest is M1.42 and M1.36 | M1.42, M1.36, M1.13 |
| 7 | Field visibility | The safety lane: Gate M1 item 8. Check 16 is already written and red, so it climbs by itself beside 1 to 6 | M1.35, then M1.42 and M1.13 for the portal |
| 8 | Journey & starting world | The carrier of the SDK, CLI and MCP columns' proof; its own cards are docs, portal and telemetry | M1.13 (proof tab, journey names on spans), M2.08 (through each client) |
| 9 | Roles | M2's principals change what roles mean, so climbing it before M2.01 would be done twice | M2.01 to M2.07, M3.22 for MCP's exposure |
| 10 | Environment | Waits on Q4; staging makes it real (M7.01) | M1.36, M1.13, Q4's slice, M7.03 |
| 11 | Store | Mostly ✓ or not needed; the data page is M5.06 | M1.36, M1.13, M5.06 |
| 12 | Mount, adapter, plugin origin | `from` reaches the docs, portal and spans; real once stage 1 mounts handles and auth | M1.42 (`from` in the wire), M1.13, M1.36 (proposed) |
| 13 | Runs on the device | Stage 2's wallet is its first real use | M1.13 (`runs`), the proposed ST2.07 (device spans to the sink) |

Lanes 1 to 8 are Gate M1's band, 9 and 10 Gate M2's, 11 to 13 finish with stage 2. Lane 7 runs beside the others from
the start because its check is already written.

**Proposed additions to existing slices**, each named on its card above and collected here so the conductor can put
them on the rows in one change (this record does not edit `milestones.md`):

| Slice | Proposed addition | Lane |
|---|---|---|
| M1.41 | read roles in the SDK's doc comments and the CLI's help; read journeys in the portal's data file; call each operation once through MCP | roles, journey, operation |
| M1.42 | a field description in the blueprint (`Blueprint.thing` fields, values) and the model; a code for `InvalidPayload`; each thing's `state` as a literal union; step details and event fields in the docs, not only the portal | thing, error, machine, step, event |
| M1.36 | `from.mount` on the operation's span, `call.mount` and `call.name` on a call step's span | mount |
| M1.13 | `journey` and `journey.step` on prove's spans; an environments page and `from`, `runs` and each operation's covering journeys in the docs | journey, environment, mount, device |
| M2.03 | who may call, in the SDK's doc comment and the CLI's help; `principal.role` on the span | roles |

**New slices proposed:** the story check (`e2e/story`, after Gate M2, see "The end-to-end story") and ST2.07 (a
device operation's spans reach the environment's sink, ledger `LAH-02`, before ST2.03).

## Rows still to come

The audit's thirteen rows are the blocks that exist today. These join the grid as rows when their decision slice names
their outputs, each with nine cards like the rest: **workflows** (M3.01; stage 3's owner signatures), **views**
(M5.01, M5.05), **agents and runs** (M4.01, M4.10), **chains as stores and chain events** (M6.01, M6.09), and
**secrets by declaration** (M2.04; today a field's visibility covers secret fields, not the environment's secrets).
None of them changes a card above.

## Decided here

1. The grid is the goal: 13 lanes (the building blocks) by 9 cards (the outputs), each card an eval with its green,
   its evidence, its grade today with `path:line`, and its owner. `design/grid/grid.json` is the same content as data,
   and the board reads it.
2. A card is green only when its evidence runs in CI and passes; built but unproved is amber, never green.
3. A card agreed not needed stays on the board, greyed, with its reason; one that guards a safety property (no secret
   leaves, no step leaks) stays live as an absence check.
4. Every lane's end state is a portal view, except the clients' columns, which are proved by journeys run through
   them (M2.08). A portal card depends on the model, docs and telemetry cards of its lane.
5. The hill-climb order above, operation first.
6. The proposed slice additions and the two new slices above are proposals for the conductor to put on
   `milestones.md`; this record edits no row.

## What this changes elsewhere

| Was | Now | Why |
|---|---|---|
| K12's grid and K13's 5 by 5 as the measure | this grid, 13 by 9, graded per card against its own green | Aaron, 19 November: the grid is the goal |
| K12, "What the grid leaves alone on purpose": a paragraph | the not-needed cards, one by one, for Aaron (Q2) | each card needs a reason a board can show |
| M1.41 "fails only where K13's grid says ✗ or ~" | unchanged; this grid is wider, and M1.41 checks its stage 1 basics | M1.41's scope stays the basics; the story check (proposed) covers the rest |
| The portal's gaps table (`portal.md`, "Gaps") | unchanged; gap 4 gets an owner proposed here (ST2.07) | it had none |

## Open risks

- **Field descriptions are a blueprint change.** M1.41 already asks for them; until M1.42 adds a place to write them,
  the thing lane's model card and everything downstream of it stays ~.
- **The portal column carries the whole grid's last mile.** Every lane waits on M1.13, the largest slice in M1. If it
  slips, no lane is fully green before Gate M1.
- **Grades drift.** They are read from `6419d4b7`. Until the story check writes verdicts per card, the board's colours
  are this record's and go stale as `m1` moves; the conductor regrades a lane when a slice that owns one of its cards
  merges.

## Questions for Aaron

Four calls are his: they decide what a person using a generated app experiences, not how Orthograph is built. Every
other call in this record is the building agent's, under "Who decides".

**Terms for this round.** A *card* is one cell of the grid: one building block in one output. *Green* means the
card's evidence runs in CI and passes. *Not needed* means the card stays on the board, greyed, with its reason, and
nobody builds it. An *absence check* is a card that stays live to prove something never shows. The *clients* are the
SDK, the CLI and MCP. All code is on `origin/m1` at `6419d4b7`.

### Q1 — Should a client (SDK, CLI or MCP) ever show an operation's steps?

**The problem, in code.** The generated API carries each operation's steps, because the handler is built from the
same declaration:

```ts
// examples/acme/generated/api/src/allowance/spend.ts:12
export const steps = ["allowance.spend.load", "allowance.spend.record"] as const;
```

No client shows them. The SDK's function is the payload in and the answer out, and MCP's catalog entry is a
description and the declaration (`packages/generators/src/modules/render/internal/mcp.ts:21`). K13 called that "by
design", but nobody asked you. If nobody decides, three cards in the step lane stay red forever, or somebody builds
step help into the CLI and every handler refactor becomes a change callers can see.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The step lane's sdk, cli and mcp cards | they are built, absence-checked, or greyed |
| Versions from the model diff (`packages/prove/src/modules/releases`) | anything in a client's surface bumps its version when it changes |
| M1.37 (MCP from the whole model, M3) | a tool description is where steps would go |
| The portal's spine (M1.13) | shows steps already, to the builder; unaffected |

**The options**

**Today** — `examples/acme/generated/sdk/src/allowance/spend.ts`:
```ts
/** Spend from what is left of this month's allowance. */
export const spend = (payload: PayloadOf<typeof declaration>) =>
  Effect.flatMap(Acme, (client) => client.allowance.spend({ payload }));
```

**A · Never, with an absence check** (recommended)
```ts
// e2e/m1, a generated check: no client names a step
for (const file of clientFiles) expect(file.content).not.toMatch(/allowance\.spend\.(load|record)/);
```

**B · Described: steps in the CLI's help and the tool's description**
```bash
acme allowance spend --help
# Spend from what is left of this month's allowance.
# Steps: load (database), record (database)
```

**C · Streamed: the caller sees each step as it runs**
```ts
yield* allowance.spend(payload, { onStep: (s) => Console.log(`${s.name} ${s.state}`) });
```

**You do X → what happens**

| Scenario | A · Never | B · Described | C · Streamed |
|---|---|---|---|
| You split `load` into two steps | callers see nothing change | the CLI's help and MCP's descriptions change; the client's version bumps | every caller's progress handler sees new names |
| An agent picks a tool | it reads the operation's description | it also reads the steps, which may help it guess cost | it can show progress |
| A slow call in the terminal | the person waits for the answer | the same | the person sees which step is slow |
| What you build | one absence check | help text, a version rule | a streaming channel through HTTP, the SDK, the CLI and MCP |

**Rubric**

| Axis | A · Never | B · Described | C · Streamed |
|---|---|---|---|
| Floor-first | ✅ ships now, one check | ⚠️ small, but in three outputs | ❌ new transport |
| Reversibility | ✅ adding steps later is additive | ⚠️ removing them later breaks help readers | ❌ removing breaks callers |
| Blast radius | ✅ none | ⚠️ every client's version moves on refactors | ❌ HTTP, SDK, CLI, MCP |
| Correctness | ✅ the handler's inside stays inside | ⚠️ describes internals as contract | ⚠️ internals as live contract |
| Fit | ✅ K13, the portal already shows steps to builders | ⚠️ | ❌ step signals are telemetry (M1.21), not a client channel |

**Recommendation: A.** Steps are how the handler works, not what the caller asked for; the builder already sees them
on the portal's spine. The three cards become absence checks, not grey.

### Q2 — Which cards are not needed by design?

**The problem, in code.** Seventeen cards are ✗ because the block has, arguably, no place in that output. A store in
the HTTP API is the clearest:

```ts
// packages/projections/src/modules/api/internal/api.ts:73 — one endpoint per operation; nothing reads model.stores
```

K12 already said some ✗ "stay" ("What the grid leaves alone on purpose"), but never listed them per card or asked you.
If nobody decides, the grid can never be all green, or someone builds a store in the SDK to make a cell turn green.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The board | grey cards versus red ones; the climb's finish line |
| The story check (proposed) | it skips grey cards and checks absence cards |
| K12's "leaves alone" paragraph | becomes this list |

**The options**

**Today** — no list; K12 names "a store, an environment or a journey" in "the HTTP API or the SDK", events written
by the runtime, and reads with no handler.

**A · Accept the list as proposed** (recommended)
```jsonc
// design/grid/grid.json, notNeededProposal on each of these cards
{
  "step":        ["sdk", "cli", "mcp"],              // kept live as absence checks (Q1)
  "event":       ["cli", "mcp"],                     // until events can be followed (Q3)
  "journey":     ["api", "server", "sdk", "cli", "mcp"], // proved through the clients instead (M2.08)
  "environment": ["api", "mcp"],
  "store":       ["api", "sdk", "cli", "mcp"],
  "device":      ["mcp"],                            // remote MCP reaches the server, which can't run device code
  "mount":       ["origin in api, sdk, cli, mcp"]    // the operations are there; only the plugin's name isn't shown
}
```

**B · Accept, but keep the device's MCP card open**
```jsonc
{ "device": [] } // a local MCP server on the person's machine could run device operations; stage 2 decides
```

**C · Nothing is greyed: every card is built**
```ts
// e.g. the SDK gains a store's name per thing, the API a journey list
export const stores = { allowance: "default" } as const;
```

**You do X → what happens**

| Scenario | A · Accept | B · Device MCP open | C · Build all |
|---|---|---|---|
| The grid's finish line | 100 cards to green; 17 not needed, of which the 3 step cards stay live as absence checks | 101 to green, 16 not needed | 117 to green |
| An agent on your laptop wants to create a wallet | it can't through MCP; it uses the CLI | stage 2 decides whether a local MCP runs it | it can, once built |
| A store is renamed | callers see nothing | the same | every client's version bumps |
| Someone reads the board | sees why each grey card is grey | the same | sees red that will never matter |

**Rubric**

| Axis | A · Accept | B · Device MCP open | C · Build all |
|---|---|---|---|
| Floor-first | ✅ the finish line is real now | ✅ | ❌ months of surface nobody uses |
| Reversibility | ✅ a grey card can turn red again | ✅ | ⚠️ removing surface breaks callers |
| Blast radius | ✅ none | ✅ none | ❌ every client |
| Correctness | ✅ each reason is one line, checkable | ✅ | ⚠️ leaks internals (stores) into contracts |
| Fit | ✅ K12's "leaves alone" | ✅ | ❌ |

**Recommendation: A.** Each grey card's reason is one sentence on the card, and turning one red later is a board edit,
not a rewrite. B is fine too if you expect agents on the device soon.

### Q3 — Should the CLI and MCP see events?

**The problem, in code.** The API exports every event, but no client does:

```ts
// examples/acme/generated/api/src/index.ts:30
export * as Events from "./events.ts";
```
```ts
// examples/acme/generated/sdk/src/index.ts:1-11 — client, layer, Errors and one namespace per thing; no Events
```

M1.42 already adds event types to the SDK. The CLI and MCP have nothing to show: no endpoint serves the journal, and
following events is M5's (M5.03 to M5.05). If nobody decides, the event lane's CLI and MCP cards stay red, or someone
builds a journal endpoint just to fill them.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The event lane's cli and mcp cards | built now, later, or never |
| M5.05 (views, reads generated in the SDK, CLI and MCP) | where following events naturally lands |
| M1.37 (MCP resources, M3) | events could be a resource |
| Visibility (M1.35) | any journal read is a new audience to cut for |

**The options**

**Today** — `acme --help` lists operations only; MCP lists tools only.

**A · Types now, CLI and MCP when events can be followed** (recommended)
```ts
// generated/sdk/src/index.ts (M1.42)
export { Events } from "../../api/src/index.ts";
// CLI and MCP cards: not needed until M5.05, then reopened
```

**B · Readable now: a journal read in every client**
```bash
links events list --thing handle --since 10m
# 12:04:31 HandleClaimed { handle: hdl_7f3a, name: aaron }
```

**C · Followable now: subscribe**
```bash
links events follow --event HandleClaimed
```

**You do X → what happens**

| Scenario | A · Types now | B · Readable now | C · Followable now |
|---|---|---|---|
| An agent wants to know what just happened | it reads the thing with a `get` | it reads the journal | it is told as it happens |
| What you build | nothing more in M1 | an endpoint, its visibility cut, a CLI command, an MCP resource | B plus a live channel and delivery (M5's outbox) |
| The portal | shows committed events anyway (M1.21) | the same | the same |
| A private event field | never leaves | must be cut for a new audience | the same, live |

**Rubric**

| Axis | A · Types now | B · Readable now | C · Followable now |
|---|---|---|---|
| Floor-first | ✅ M1.42 as written | ⚠️ new surface in M1 | ❌ pulls M5 forward |
| Reversibility | ✅ B or C later is additive | ⚠️ | ❌ |
| Blast radius | ✅ SDK only | ⚠️ API, clients, visibility | ❌ runtime, clients |
| Correctness | ✅ | ⚠️ a new leak surface | ⚠️ delivery guarantees |
| Fit | ✅ M5.05's views are the reads over events | ⚠️ | ❌ |

**Recommendation: A.** Events are the runtime's record; a caller reads state, and following events belongs with views
in M5.

### Q4 — Should the generated CLI and SDK know the environments by name?

**The problem, in code.** The model knows each environment's domains, but the CLI talks to one URL from a variable,
and `--env` is a free label for where a session is kept:

```ts
// examples/acme/blueprint/environments/staging.ts:7-10
deploy: {
  server: Deploy.worker({ domain: "api.staging.acme.dev" }),
```
```ts
// examples/acme/generated/cli/src/main.ts:41
Effect.provide(Sdk.layer(process.env["ACME_URL"] ?? "http://127.0.0.1:8787", process.env["ACME_TOKEN"])),
```

If nobody decides, `acme session sign-in --env staging` keeps a session called "staging" while talking to whatever
`ACME_URL` says, which can be production.

**What it touches**

| Dependent | Why it cares |
|---|---|
| The environment lane's sdk and cli cards | what green means |
| `cli-session.ts:41` and `sdk.ts:98` | the two generated places that pick a URL |
| M7.06 (real releases: npm, Homebrew) | a published CLI would carry the domains |
| M2.06 (the device flow, sign-in per environment) | the session is kept per environment |

**The options**

**Today**
```bash
ACME_URL=https://api.staging.acme.dev acme session sign-in --env staging
acme allowance spend --amount 5      # goes to ACME_URL, whatever --env said
```

**A · Named environments from the model** (recommended)
```bash
acme --env staging allowance spend --amount 5   # https://api.staging.acme.dev, from the model
acme --env prod allowance spend                 # refused: no environment "prod" (local, staging, production)
```
```ts
Sdk.layer.env("staging", token)   // the domain from the model; Sdk.layer(baseUrl) stays for anything else
```

**B · URLs only, `--env` stays a session label** (today, written down)
```bash
ACME_URL=https://api.staging.acme.dev acme allowance spend --amount 5
```

**C · A published CLI defaults to production**
```bash
acme allowance spend --amount 5   # production unless --env says otherwise
```

**You do X → what happens**

| Scenario | A · Named | B · URLs only | C · Production default |
|---|---|---|---|
| You try a call on staging | `--env staging` | set a variable | `--env staging` |
| A typo in the environment | refused, with the list | silently the wrong server | refused |
| A new environment is declared | its name works after `ortho generate` | set its URL by hand | the same as A |
| A published CLI | carries the public domains of the declared environments | carries nothing | carries them, and a forgotten flag hits production |

**Rubric**

| Axis | A · Named | B · URLs only | C · Production default |
|---|---|---|---|
| Floor-first | ✅ small: two generated files | ✅ nothing | ✅ small |
| Reversibility | ✅ `ACME_URL` still wins when set | ✅ | ⚠️ users rely on the default |
| Blast radius | ✅ CLI and SDK only | ✅ | ⚠️ every careless call |
| Correctness | ✅ the session and the URL agree | ❌ they can disagree | ⚠️ the risky default |
| Fit | ✅ "falls out of the blueprint" | ⚠️ hand-configured | ⚠️ |

**Recommendation: A**, with `local` as the default and `ACME_URL` still overriding.

### At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | Steps in the SDK, CLI or MCP | A · never, kept as absence checks |
| Q2 | Which cards are not needed | A · accept the seventeen as proposed |
| Q3 | Events in the CLI and MCP | A · types in the SDK now; CLI and MCP with views (M5.05) |
| Q4 | Environments in the CLI and SDK | A · by name from the model, `local` by default |

**Answer key.** Reply with one letter per question, for example "1A 2A 3A 4A". "Agreed to all" means every
recommendation. Anything else, say which and why, and the card's owner and the board change with it.
