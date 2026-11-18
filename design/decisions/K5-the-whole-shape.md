# K5: the whole shape

Written 18 November 2026 by the building agent, under "Who decides" in `AGENTS.md`. This record holds the whole of
Forman on one page: every primitive, every boundary, who owns each one and what crosses it. Where it disagrees with the
frame decided in K2 (`K2-forman-frame.md`, `design/frame/`), this record wins. The details stay with the layers of the
canon. The overall shape is settled here.

Three forks are Aaron's to answer, because each one touches a call of his own or the goal itself. They are in the pull
request's body as one batched round, and in [Forks for Aaron](#forks-for-aaron) below with the recommendation written
in. Until he answers, the recommendations hold provisionally, and nothing is built on them.

## Why this record exists

Aaron, 18 November 2026:

- "there's two separate competing ways of doing this then isn't there? … where is our boundary?"
- "it definitely shouldn't be two things. It should be one thing. Ideally, if Agent Native already does it, and it
  does it in a way that's satisfactory, we should plug into that … and figure out what else falls out of that. We
  shouldn't be competing with that."
- "The whole thing has got to be thought about together … at least design it out now … we can do the details in the
  layer, but the overall thing … has to all be making sense now."
- "layer one is not even specified properly … What about languages? … What are the actual primitives generally like
  plugins, adapters? How does data … all of these things need to be thought of first."

The overlap he named is real. Forman generates its own doors: `examples/acme/generated/{api,sdk,cli,mcp,docs,portal}`.
agent-native serves one `defineAction` through HTTP, its UI hooks, its chat agent, MCP, a CLI and A2A. The
generated-app spike (PR #41) ran both side by side. That gave two MCPs, two CLIs, two HTTP APIs, two auths, two
databases and two runtimes.

## In one breath

**An operation is served once, by one wrapper, and every door is a projection of that one served operation.**
Forman owns what is true: the description, the model, the served operations, the stores, the identity and the proof.
agent-native is plugged in as it is, as the projection that makes the app. That means its UI, its chat, its content
and the actions that reach the served operations. Each kind of door exists once per operation, so nothing is built
twice. Where agent-native already does a job and Forman doesn't, Forman uses it. Where both do it, this record names
the one owner.

## The picture

```text
                         ┌──────────── the description: blueprint/ ────────────┐
                         │ core: things · machines · operations · reads ·      │
  plugins ──mount──────▶ │       roles · events · journeys · starting worlds   │
  feature · adapter ·    │ stores · views · secrets · environments             │
  projection             └──────────────────────┬──────────────────────────────┘
                                                │ compile (@formants/compiler)
                                                ▼
                          the model: one JSON, every declaration hashed, the uses graph
                                                │
              ┌──────────────── a language renders the frame and runs the wrapper ───────────────┐
              │ language-effect: frames, blanks, the wrapper (decode · Access.check · span ·      │
              │   replay · checkFrom · steps · answer check · commit), clients                    │
              │ language-solidity (M6) · language-noir (later) · language-python (clients only)   │
              └───────────────────────────────┬────────────────────────────────────────────────────┘
                                              │ runs on
              ┌──────────────── a host supplies where it runs ───────────────────────────────────┐
              │ host-cloudflare: workerd · store kinds database (D1) and actor (Durable Object) · │
              │   Timers · secrets · telemetry export · the fetch entry                           │
              │ Host.chain (EVM, M6: runs language-solidity's chain store) · Host.node · Host.browser│
              └───────────────────────────────┬────────────────────────────────────────────────────┘
                                              ▼
                          THE SERVED OPERATION  (Handlers.serve: one per operation)
                                              │
        ┌──────────────────────── doors: each kind exists once per operation ─────────────────────────┐
        │ Forman's projections, on the one Worker or built on its SDK:                                │
        │   HTTP API + OpenAPI · SDK · CLI binary · MCP for outside agents · docs                     │
        │ agent-native, as the app projection (Node, Postgres for its own state only):                │
        │   generated actions ──SDK──▶ the served operation, which gives the UI hooks, the chat       │
        │   agent's tools and A2A                                                                     │
        └──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                       ▼
            evidence under model names: spans · events · refusals · forman.calls ──▶ Collector ──▶ sinks
                                                       ▼
                                 evals ──▶ verdicts ──▶ logbook ──▶ stale ──▶ round again
```

## The boundaries

Each row is one boundary: who owns it, what crosses it, and what never does.

| Boundary | Owned by | What crosses it | What never crosses it |
|---|---|---|---|
| Description → model | `@formants/forman` (the API), `@formants/compiler` | declarations, read by path; out comes `model.json`, with its hashes and its uses graph | a name written as a string; anything not declared |
| Model → language | the language package (`language-effect`) | the model and the declarations as imports. The language renders frames, types, blanks and clients | behaviour: that is only ever in `src/` |
| Language → host | the host package (`host-cloudflare`) | the wrapper's needs as Effect services: `Store`, `Journal`, `Busy`, `Timers`, `Principals`, telemetry | a host's own types in a handler: handlers see the language's services only |
| Handler ↔ wrapper | `language-effect` (`handler/service.ts`) | the decoded payload, `principal`, `steps` and `move` in; an answer or a declared error out | storage, HTTP, spans written by hand |
| Served operation ↔ door | the projection that makes the door | the payload, the caller's credential, a request key and a `traceparent` in; the answer, the refusal with its code, or a defect out | a second role check; a door that changes an answer's meaning |
| Store ↔ the world | the store's kind, supplied by a host or a language (K3) | one commit per call: writes, journal entries, the outbox and the request key, guarded by a version | another writer; a commit across two stores |
| Source ↔ handler | the adapter (K3 item 8) | typed calls with declared errors, as steps (`Blueprint.step.call`); events in through `on:` | a migration; a commit |
| App projection ↔ system | the app projection (agent-native, generated) | the SDK's calls, made as the signed-in person; telemetry; the model | the app's own database as a place where any thing lives; the app checking roles itself |
| Identity ↔ everything | `@formants/auth` and `@formants/organizations` (M2; Q2 below) | a principal, resolved once at the door | a second user table that decides who may call |
| Evidence ↔ proof | `@formants/prove` and the logbook | spans, events, refusals and counts under model names | values of untraced or private fields (O2) |

## The primitives

### The description, the compiler and the model

You write `blueprint/`, one declaration per file, named by its path. `@formants/compiler` reads it and writes the
model: one JSON, every declaration with its hash and the uses graph. From M1 (M1.03) the model also holds the journeys,
the starting worlds, the role rules and the blanks. **Nothing downstream reads `blueprint/` except through the model or
by importing a declaration for its types.** This is unchanged from K2.

### The core pieces

These are the words of the description. A language gives each one meaning, and none of them belongs to a host.

| Piece | What it is | Who gives it meaning at run time |
|---|---|---|
| value | a named field type that is the same in every language | each language's mapping |
| thing | a noun with an id, fields and a store | the store's kind |
| machine | a thing's states and moves; a move from a wrong state is a generated refusal | the language's `checkFrom` and `applyMove` |
| event | what a move records, `<Thing><PastTense>` | the journal, through the commit |
| error | a declared refusal, with a stable code | the language's wire classes |
| operation | a verb on a thing: payload, answer, errors, move, `allowed`, steps, budget, `runs`, `idempotent` | the wrapper |
| read | an operation that changes nothing and has no handler | `Reads.serve` |
| handler | the only freehand code: fills the operation's blank | the language |
| role and principal | who may call, decided by a rule over the caller and the thing | `Access.check`, inside the wrapper, always |
| journey and starting world | a story through real operations, and a setup made by running them | `@formants/prove`, through every door that replays |

agent-native has a `defineMachine` of its own (`packages/core/src/state-machine/index.ts:95` at 49a844c1b). It is never
used for a Forman thing, because a Forman machine has to mean the same in Solidity and Noir, and its refusals are
declared errors. The app's template may use it for its own screens.

### Languages

**A language is what behaviour is written in, and what the model is rendered into.** It owns the frame (types,
scaffolds, blanks), the wrapper's meaning (the same refusals, events and span names in every language), and the
clients written in it.

- `language-effect`: TypeScript on Effect. Server handlers, the wrapper, the SDK. Today it also renders the HTTP API,
  the CLI and MCP. From M1.11 those renderers move into projection plugins (`frame/projections.md`).
- `language-solidity` (M6): contracts. The machine is compiled into the contract, and refusals are custom errors with
  the same codes.
- `language-noir` (later, N1) and `language-python` (clients only, S31 to S33).

A language never chooses where its output runs. That is the host's job.

### Hosts

**A host is a kind of machine that code runs on. It supplies what the language's runtime needs there.** That is the
store kinds, `Timers`, where secrets come from, the telemetry export and the entry (a `fetch`, a process, a
transaction).

| Host | Supplies | State |
|---|---|---|
| `host-cloudflare` (workerd) | store kinds `database` (D1) and `actor` (a Durable Object), alarms, the Worker entry, OTLP export | built |
| `Host.node` | a process entry, for the CLI and for adapters workerd can't reach (K3's MariaDB fallback) | the CLI today |
| `Host.browser` | client operations' code, the eip1193 adapter | M6 |
| `Host.chain` | an EVM: runs the `chain` store kind that `language-solidity` supplies; the transaction is the commit | M6 |

**Chain is settled here** (ledger `LAH-04`, `X-18`, `STO-02`). A chain is a host. The store kind on it keeps K3's name, `chain`,
and K3's supplier, `language-solidity`: the language writes the contract, and the chain host runs it. The commit test of K3 holds at the transaction: it is atomic,
versioned by the nonce and the state, and it has one writer, the contract. "Pending until mined" is not the store's
problem. It belongs to the caller. A server operation that sends a transaction writes to two stores (its own and the
chain's), so by K3 item 5 it is a workflow. Its in-between state is the generated waiting state of S25. **Private
state** (ledger `G-04`) is a capability a store kind declares, like `lists`. The Noir kind declares it, and the
compiler refuses a read the kind can't serve. Its meaning is the Noir layer's work.

### Plugins

These are unchanged from K2. Each kind is named by what it adds.

- A **feature** adds to what the system *is*: things, operations, handlers, journeys, exports and its own stores.
- An **adapter** brings in what is *outside*: calls out, events in, a source, a `service` principal and a stand-in.
- A **projection** makes the model *real* in one form: it renders outputs, opens or reaches a door, and replays the
  journeys it takes.

**agent-native enters Forman as one projection, `@formants/app`, and as nothing else.** It is not a feature, because
it adds no things that callers' operations use. It is not an adapter, because Forman doesn't call it. Its own working
state is the projection's business, in the same way `@formants/auth` keeps Better Auth's tables in its own store
(K3 item 7).

### Data

Data has three kinds of place, as K3 decided, and this record adds a fourth.

1. **Stores**, which are ours. A store is where a thing lives. It takes the commit, and Forman writes its migrations.
2. **Sources**, which are theirs. A source is reached only through an adapter's calls and events.
3. **Views**, which are lists kept from events across stores and sources.
4. **A projection's own state**, which is new. This is agent-native's Postgres: chats, threads, runs, application
   state, settings, its sessions, layouts and scratch pages. It is not a store, because no thing lives there and no
   commit goes there. It is not a source either, because no handler reads it. It belongs to the app, like a browser's
   local storage belongs to a page.

Prose about a declaration lives beside the declaration in the repository (F6 Q3). That keeps it in the pull request
that changes the declaration.

**Why agent-native's database can't be a store.** It is Postgres or PGlite only. Commit cc2a915ad, "Remove non-Postgres
database support (#4326)" (4 September 2026), removed D1, SQLite and libSQL, and `db/client.ts:1938` throws on any
other URL. It brings about 170 framework tables (174 `CREATE TABLE` lines in `db/schema-snapshot.generated.ts`), and
no subset of them is enough to run chat alone. Its agent can run raw `SELECT` over the app's tables (`db-query`, on by
default, `scripts/db/tool-mode.ts:5-11`). That is safe only because no Forman thing is in those tables. If it ever
holds a thing, that thing is outside the commit, the journal and the roles.

### The doors

**The served operation** is `Handlers.serve` (`packages/language-effect/src/modules/handler/service.ts:26`). It decodes
(`:104`), checks the role (`:46`), opens the span (`:83`), replays a request key (`:52`), checks the machine (`:57`),
runs the counted handler and its steps (`:60`), checks the answer (`:64`) and commits (`:71`). A door is everything
around it: transport, the credential and the shape of the answer. **The rule: each kind of door exists once for each
operation, and every door calls the served operation. No door ever calls another door's handler.**

| Door | Owner | Audience | Built on |
|---|---|---|---|
| HTTP API and its OpenAPI | Forman, the `api` and `server` projections | other systems | the served operation, on the Worker |
| SDK (TypeScript, later Python) | Forman, `sdk` | code that calls the system | the HTTP API |
| CLI binary | Forman, `cli` | people at a terminal; outside agents such as Claude Code | the SDK |
| MCP for outside agents | Forman, `mcp`, a door of the one Worker (K2, Aaron's call 7) | agents that aren't in the app | the served operation, on the Worker (`examples/acme/generated/server/main.ts:189-216`) |
| docs | the app (F6), from the model | readers | nothing: not proved by replay |
| the app's UI | agent-native, through generated actions | people signed in to the app | the SDK, from the action's `run` |
| the app's chat tools | agent-native | the app's own agent | the same generated actions |
| A2A | agent-native | other agent-native apps | the same actions; writes go through the chat loop (`agent-chat-plugin.ts:2696-2706`) |

What this removes from the spike's side-by-side picture:

- **One MCP per operation.** A generated action sets `mcpTool: false`. That is a hard veto
  (`action.ts:1046-1075`, `isActionExposedToExternalAgents` at `:1871`). agent-native's `/mcp` then carries only the
  app's own actions, such as navigating and writing pages, and no operation is reachable through it.
- **One CLI.** `pnpm action <name>` is the app repository's developer tool. It loads `actions/<name>.ts` and runs as
  the dev user (`scripts/runner.ts:243`). It is never shipped or documented as a door. The `forman`-generated CLI is.
- **One public HTTP API.** `/_agent-native/actions/*` is the app's internal call from its UI. It is fixed under that
  prefix (`server/action-routes.ts:789-793`) and is never promised to outside callers.

A generated action, for signup's `sheet.join` (the canon's example), under Q1's recommendation:

```ts
// apps/app/actions/sheet-join.ts. Generated from blueprint/things/sheet/verbs/join.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { declaration } from "../../generated/api/src/sheet/join.ts";
import { standard, system } from "../server/forman/system.ts"; // the generated SDK, with the caller's credential

const errors = defineActionErrors("SheetFull", "SheetNotOpen"); // from the model's refusals
export default defineAction({
  description: declaration.description,
  // standard(s) = Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(s)): the validator and the JSON Schema,
  // both from Effect 4.1.1. Without the second, agent-native advertises "any object" (action.ts:2263).
  schema: standard(declaration.payloadSchema),
  outputSchema: standard(declaration.answerSchema),
  errors,
  mcpTool: false,                      // the system's MCP is Forman's: one MCP tool per operation
  retrySafe: true,                     // idempotent: "request", with the key below
  run: (args, ctx) => system.call("sheet.join", args, { ctx, requestKey: ctx?.toolCallId, errors }),
});
```

`system.call` runs the SDK's Effect and maps its outcome to agent-native's contract:

- a declared refusal becomes `errors.noWrite(code, { statusCode: 422 })`. It is `noWrite` because a refusal commits
  nothing, and agent-native treats any other throw after `run` starts as an unknown outcome
  (`action.ts:1572-1645`). It is 422 because its UI reads a 403 as "you lack permission" (the spike, PR #41);
- `InvalidPayload` becomes a 400 `fail`;
- a defect is thrown as a plain error and shows as a 500.

It sends the action's `toolCallId` as the request key and sends a `traceparent`.

### agent-native's place: the five questions, answered from its source

The source is `@agent-native/core` 0.228.2, release commit 49a844c1b (`chore: release packages … (#9129)`, 13 November
2026), read in TypeScript. The full notes are in the session group's shared notes, `k5-an-actions.md` and
`k5-an-runtime-auth-data.md`.

1. **Can an action's `run` be Forman's handler itself? Technically yes. It still runs where the stores are.**
   `run` is `(args, ctx?) => Promise | value` (`action.ts:1037`), with no constraint against Effect. `schema` and
   `outputSchema` are Standard Schema (`action.ts:1011-1018`), and Effect 4.1.1 supplies both the validator and the JSON
   Schema (`Schema.toStandardSchemaV1`, `Schema.toStandardJSONSchemaV1`). Actions can be registered from code
   (`createAgentChatPlugin({ actions })`, `plugin-options.ts:42`), but the typed hooks and `pnpm action` see only files
   in `actions/` (`vite/action-types-plugin.ts:660`), so generating files is the way. `run` receives the decoded value,
   so it would call `served.run`, not `.call` (`service.ts:87`). Forman's own MCP door already runs a served operation
   this way, through a `ManagedRuntime` (`examples/acme/generated/server/main.ts:197-216`). **But** the served operation
   needs `Store`, `Journal` and `Auth` on D1 and Durable Objects, and `ctx` carries no environment or bindings
   (`action.ts:190-270`). So in-process means agent-native has to run inside the Worker that holds those bindings,
   which is question 2. Until then, `run` is a hop through the SDK.
2. **Can agent-native be the one server on Workers? Not as Forman's server.** Cloudflare is a supported deploy target
   only as Nitro's `cloudflare_module` (`deploy/build.ts:142`, `:751-797`, with `nodejs_compat` and `nodejs_als` added
   at `:786-788`; Pages was removed, `:6785`). Its database must be a Postgres outside the Worker. Issue #2766 (Better
   Auth on D1) was closed on 11 August 2026 with a D1 fix, and that whole path was deleted three weeks later by
   cc2a915ad. Issue #7148 (a shared Neon pool that stalled for 8 seconds) was fixed by PR #7320 (`fbba54f4c`), which
   scopes pools per request (`db/request-pool-context.ts`). It was tested on `wrangler dev --local`, not on a deployed
   Worker. Background work needs no long process: runs are rows with heartbeats, swept by a once-a-minute cron
   (`deploy/build.ts:492-570`). Its first path is Node and Postgres. We found no workerd test in the package itself.
3. **Whose auth?** agent-native uses Better Auth 1.7.6 (`packages/core/package.json:750`), configured at
   `server/better-auth-instance.ts:2422`, with its own organisations: `organizations`, `org_members` (keyed by email,
   with roles owner, admin and member, `org/types.ts:4`), `app_member_roles` and `app_permission_overrides`, all in
   Postgres. Session resolution can be replaced (`AuthOptions.getSession`) or extended (`getAdditionalSession`,
   `server/auth.ts:466-510`). Even then it still writes `org_members` (`backfillSessionOrg`, `server/auth.ts:5073`).
   `ctx` gives `userEmail`, `orgId`, `appRoles` and `appPermissions`, but no user id and no organisation role. It has
   per-action checks of its own (`authorize`, `access`, `defineAppRoles`, `org/app-roles.ts:101`). Forman's auth today
   is Better Auth 1.7.15 on D1 (`packages/host-cloudflare/package.json:17`). **So agent-native's Better Auth can't be
   removed. It can be told who the person is.** That is Q2.
4. **Its database against Forman's stores.** This is settled above, under Data. agent-native's Postgres is the app
   projection's own state, and no thing ever lives there. Actions are free to reach an outside system, so app data
   stays in Forman's stores, behind the served operations.
5. **If actions are a door, what does Forman still generate, and what falls out?** agent-native has no OpenAPI emitter,
   no typed SDK for outside callers, no versioned public paths, no HTTP idempotency key (`retrySafe` is a flag with no
   key) and no per-operation docs. `dist/catalog.json` is a map of dependency versions, not of actions. So Forman still
   generates the HTTP API, the SDK, the CLI binary, MCP for outside agents and the model. **It newly generates the
   actions and the app's pages.** For free, with no Forman code, come the UI's data hooks (`useActionQuery`,
   `useActionMutation`), the chat agent's tools (`agent/production-agent.ts:5968`), approval prompts (`needsApproval`,
   set from `.notVia(Via.agent)` and money moves), A2A reads, screen awareness, content pages, threads and the
   agent's own run traces. **What Forman stops building:** any UI of its own, the portal as a separate projection
   (F6), and any chat.

### Auth and organisations

**There is one identity, and it is Forman's** (the provisional answer to Q2). `@formants/auth` owns people,
sessions, keys, the device flow and OAuth for MCP. `@formants/organizations` owns organisations, memberships,
invitations and `holds` (K2, M2). The app signs a person in through Forman's auth. Its `getSession` resolves that
session with `session.show` and gives agent-native a person. agent-native's `org_members` row is written from the
person's memberships as they resolve. It is a cache for the template's own screens, never the source of a role.
Forman's roles are never written as agent-native `authorize` rules. `Access.check` in the wrapper decides, every time,
on every door. The agent in the app calls as `Via.agent` acting for the signed-in person (M2.03). In a local world,
the cast switcher stays (F6 #4), because the cast are people in that world's auth.

### The generated app

The app is F6, unchanged in its pages: one tree from the model, with live data inside each page, blocks drawn by
reference and prose pinned to a hash. K5 settles what the app *is* in the shape:

- It is the projection `@formants/app`. Its template is our own agent-native template, copied once and pinned
  (agent-native's templates are copied, not mounted).
- `forman generate` writes its actions, one per operation and read, and its derived pages. The template's own code is
  scaffolded: "Yours from now on".
- It runs on Node with Postgres for its own state (PGlite locally). In a cloud environment it is a second place in
  the environment file, beside the Worker.
- It reaches the system only through the SDK, so it is proved by replay like any SDK-built projection. A journey step
  through `--through app` calls the generated action's route.

Who the app is for is Q3.

### Telemetry

O1 and O2 are unchanged. Spans, events, refusals and `forman.calls` are named from the model and go through OTLP to
the Collector, then to the sinks. The app adds one link and one stream:

- **The link.** A generated action sends a `traceparent`, so the operation's span is a child of the app's call. The
  Worker keeps it (`packages/host-cloudflare/src/modules/telemetry/service.ts:32`, proved in PR #41).
- **The stream.** agent-native keeps its agent runs (tokens, cost, tool calls) in its own SQL, and it can also export
  them through `registerObservabilityProvider` from `@agent-native/core/server`. The app registers the Collector as
  that provider, so a chat turn, its tool call and the operation it reached read as one trace.

The private-field rule of O2 stays at the Collector, which is why the app reads traces from the Collector's files
(PR #39) and never straight from OTLP.

## Decided here

These are the building agent's calls, with the evidence above. Aaron can overrule any of them.

1. The served operation is the one place an operation's meaning lives. Every door calls it, and each kind of door
   exists once per operation.
2. agent-native is the app projection, `@formants/app`, and nothing else. Its generated actions set `mcpTool: false`.
   `pnpm action` is a developer tool, not a door.
3. agent-native's Postgres is a projection's own state, a fourth kind of place beside stores, sources and views. No
   thing ever lives there.
4. Forman's machines, roles and refusals are never expressed in agent-native's `defineMachine`, `authorize` or
   `access`.
5. A chain is a host. Its store kind is K3's `chain`, supplied by `language-solidity`. A server call that sends a
   transaction is a workflow. Private
   state is a declared capability of a store kind.
6. A language owns meaning and rendering. A host owns where code runs and the store kinds there. Neither does the
   other's job.
7. Refusals leave a generated action as `noWrite` with status 422 and the refusal code. Request keys come from the
   action's `toolCallId`.
8. The app is proved by replay through its actions, like any projection callers use.

## Forks for Aaron

These are put to Aaron in the pull request's body, in the grill format, as one round. The recommendation is written
in. Each section here is updated with his answer.

| # | Joint | Recommendation |
|---|---|---|
| Q1 | Where an operation runs, and who serves it | **B**: Forman's Worker serves every operation. The app is a projection whose actions reach it through the SDK |
| Q2 | Whose identity and organisations | **A**: Forman's auth and organizations plugins. agent-native resolves its session through them |
| Q3 | Who the generated app is for | **A**: the people who build and run the system, first. End users' screens come later, from the same template |

## What changes elsewhere

- **K2.** "Auth is two feature plugins" still stands under Q2 A. Its audiences table gains the app as a projection for
  callers. Projections now include `@formants/app`.
- **K3.** Amended in this change: item 11 adds the fourth kind of place, a projection's own state, and item 2 says
  a chain is a host that runs the `chain` store kind, which passes the commit test at the transaction.
- **`design/frame/README.md`.** `Host.chain` stays a host. The portal is replaced by the app (F6). The audiences gain
  the app.
- **`design/frame/projections.md`.** Section 3.8, "the portal", becomes "the app". The doors table above replaces the
  `reaches` list in section 1.
- **Milestones.** M1.13 becomes "Part three: docs and the app's actions and pages, as the `app` projection". That gives
  the app a slice (ledger `G-01`, `PRJ-01`, `X-01`). M3.14 and M5.06 put the factory's board and the data page in the
  app. M2.06 adds the app's `getSession` through `@formants/auth`. M2.08's `--through` gains `app`. The edits are made
  when Aaron has answered.
- **Ledger items answered.** `PRJ-43` (the doors), `LAH-04`, `X-18`, `STO-02` (chain), `G-04` (private state, in
  principle), `G-03` (no "home": a thing lives in a store), and `X-05` (MCP is a door of the one Worker).
- **The canon.** The note `action-beside-or-instead` in `operations.mdx` is answered: beside, as one more door.

## The corrected layer order for the canon

Layer 1 was the core pieces. But a handler can't be explained without a language. An operation can't be explained
without its doors, and a thing can't be explained without a store. So **layer 1 is the shape**: one page per
primitive at the level of this record, each saying what the primitive is, who owns it and what crosses it. The details
come in the later layers.

| Layer | Pages | Leans on |
|---|---|---|
| 1 · the shape | `forman` (this record's picture and boundary table), `blueprint` (description, compiler, model), `languages-and-hosts`, `plugins`, `data` (stores, sources, views and a projection's own state, at the primitive level), `doors` (the served operation; one door of each kind) | nothing |
| 2 · the core | `things`, `machines`, `operations`, `roles`, `handlers` | 1: stores, the language's frame, the wrapper, the doors |
| 3 · proof | `journeys`, `proof`, `traces`, `stand-ins` | 2, and the doors (replay) |
| 4 · data in depth | `stores`, `views`, sources (on `adapters`) | 2 and 3 (events, the commit's span) |
| 5 · plugins in depth | `features`, `adapters`, `projections`, `the-app`, `secrets` | 1 to 4 |
| 6 · running | `workflows`, `environments` | 4 (cross-store work), 5 |
| 7 · what Forman ships | `auth`, `agents`, `factory`, `agent-kit` | everything above |

`doors`, `data` and `the-app` are new pages. `stores` keeps its depth in layer 4, and `data` in layer 1 is its
one-screen summary. The signup example carries layers 1 and 2. acme carries the pages that need auth, organisations
or several stores.

## Open risks

- **agent-native moves fast.** It released daily through November. A pinned copy of the template drifts from
  upstream, so the pin moves only by a recorded decision under R1.
- **Better Auth versions differ.** Forman's 1.7.15 and agent-native's 1.7.6 are separate instances under Q2 A, joined
  only through `getSession`. They are never one database.
- **Two runtimes stay.** The Worker for the system, and Node for the app. Under Q1 B that is a deployment fact, not two
  truths. If Q1 C is chosen, a spike decides it first.
- **The app in the cloud needs a Postgres** that is outside Cloudflare, under the $10 a day cap, with a credential only
  on Aaron's yes (M7.01).
- **Effect's JSON Schema through `assertUsableSchema`** is unproved. A schema with only `validate` is advertised as
  "any object" (`action.ts:2263`). The first generated action's test proves it.
