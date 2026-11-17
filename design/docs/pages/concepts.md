# Concepts: every word, one meaning

From the frame's vocabulary ([`frame/README.md`](../../frame/README.md)). Each word means one thing across the docs, the
code and the commands. Where a word was used for two things, one of them has been retired.

The framework is **Forman**. **Blueprint** is what you write: the `blueprint/` folder and the `Blueprint.*` API.

## The description

| Word | One meaning |
|---|---|
| **blueprint** | the description you write, in the folder `blueprint/` |
| **model** | the compiled blueprint: one JSON, every declaration with its hash, every name written once |
| **thing** | a noun with an identity, fields and an owner of its state (`lives`: the database, an actor, a chain) |
| **value** | a named field type that says what it is in every language (`Amount`: bigint in Effect, uint128 in Solidity) |
| **machine** | a thing's states and moves; refusals for a wrong state are generated |
| **event** | what a move emits, `<Thing><PastTense>` |
| **error** | a declared refusal, with an exit code and a stable refusal code |
| **operation** | a verb on a thing: payload, answer, errors, move, `allowed`, steps, budget, `runs`; named by its path |
| **read** | an operation that changes nothing and has no handler |
| **step** | a named span inside an operation: a database write, a wait, a call (`Blueprint.step.call`), or a use of a feature's export (`Blueprint.step.use`) |
| **role** | who may call: a right over one thing decided by a rule (`owner.of(...)`), a built-in role (`anyone`, `signedIn`), or a service role; any of them narrowed by way in (`.via(Via.session)`, `.notVia(Via.agent)`) |
| **principal** | who is calling: anonymous, a person, an agent acting for a person, a service, or the system |
| **journey** | a story through real operations, played by a cast, written by a different agent from the builder |
| **starting world** | a named setup, made by running operations, never by writing rows |
| **blank** | something not yet known or written: a question, an unwritten step, or a handler body |

## Plugins and mounts

| Word | One meaning |
|---|---|
| **plugin** | something built once that any project can mount: a feature, an adapter or a projection |
| **feature** | a plugin that adds to what the system *is*: things, operations, handlers, journeys, exports. The app itself is the root feature |
| **adapter** | a plugin that brings something *outside* into the description: calls out, events in, a principal kind, a stand-in for worlds |
| **projection** | a plugin that makes the description *real* in one form: renders outputs, replays journeys (if callers use it), says where it runs and how it ships |
| **mount** | one file in `blueprint/<kind>/<name>.ts` that says "use this plugin here, with these choices"; the file's name is the mount's name |
| **export** | typed functions a feature offers your handlers, with an implementation per host, such as `Payments.refund`; used with `Blueprint.step.use` |
| **call** | what an adapter offers: one operation of the outside system, typed from its contract, such as `stripe.calls.refunds.create`; used with `Blueprint.step.call` |
| **need** | a plugin another plugin requires, named in its descriptor; the app mounts it once |
| **mount verbs** | the only four things a mount may say: **choose**, **include**, **narrow**, **omit** |
| **choice** | an option a plugin offers at mount time, picked from what the plugin has proved; never varies by environment |
| **setting** | a value a plugin declares that each environment gives, such as which chains, which region |

See [plugins](plugins.md) for how they fit together.

## Where code runs

| Word | One meaning |
|---|---|
| **language** | what code is written in and rendered to: Effect, Solidity, Noir, Python. (Renamed from "target".) |
| **host** | a kind of machine code runs on, one namespace: `Host.worker`, `Host.node`, `Host.browser`, `Host.chain`, `Host.native`, `Host.python`, and `Host.world` (an implementation used only in worlds) |
| **runs** | where an operation's behaviour must execute: on the `server`, at the `client`, or on a `chain` |
| **output** | a file or folder a projection writes, under `generated/<mount>/`; the one exception is a scaffold written once into `src/` |
| **artifact** | what an output becomes when shipped: a deployed Worker, a published package, a released binary, or a file kept in the repository |
| **door** | an entrance a server-hosted projection opens: the API, the MCP endpoint, an adapter's inbound endpoint, and in a world the world door |
| **environment** | one file per environment: where each projection lives, which credential kinds it issues, its settings, and where each secret's value comes from |
| **world** | a running copy of an environment, made for a purpose and destroyed after: its own storage, clock and cast |

## Proof

| Word | One meaning |
|---|---|
| **evidence** | what a call left: its caller, answer or refusal, events, spans and logs, all under model names |
| **eval** | a rule over evidence: nine built in (answer shape, declared errors, machine path, events, who may call, steps, budget, coverage, explainability), a tenth for time |
| **verdict** | all of an operation's evals at one revision in one environment; only CI writes one |
| **stale** | a verdict whose evidence predates a change to something the operation uses |
| **uses** | the model's uses graph: what an operation reads, so a change knows what it makes stale (the word "dependency" is retired) |

## Principals and how each gets in

| Kind | How it gets in |
|---|---|
| anonymous | nothing; only `anyone` admits it |
| person | `Via.session`, `Via.key` or `Via.device` |
| agent, acting for a person | `Via.agent`: an OAuth token from the MCP sign-in |
| service | an adapter's door: the outside system's own verification, such as Stripe's signature |
| system | the keeper's own key, limited to time moves |

Today only `anonymous` and `person` exist. The rest arrive in M2.

## Audiences

| Who | What they get, all projections |
|---|---|
| **callers**: people, agents, other systems | the API, the SDK, the CLI, the MCP server, an app |
| **readers** | docs, the portal |
| **builders**: the agents and people making the app | briefs, scaffolds, the builder MCP, `check`, `prove`, `impact`, telemetry by name |
| **operators** | `watch`: the same evals on what the live system records |

## Four principles

1. **One description.** What exists, how it changes, who may change it, what is recorded, what must hold.
2. **Many projections.** The server, SDK, CLI, MCP, docs, portal and contracts are views of the model. None is the system.
3. **Behaviour is the only freehand.** Handlers fill blanks in generated frames, and their types come from the declaration.
4. **Evidence comes back under the same names.** Spans, events and refusals carry the names that came from paths.
