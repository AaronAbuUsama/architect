# Plugins

> **This is what M1 builds.** Today's code has no plugins. The projections are a fixed list of renderers called in one
> place, nothing is mounted, and auth is copied into each new project. Everything below is the design, decided in
> [`K2-forman-frame.md`](../../decisions/K2-forman-frame.md) and set out in [`frame/mounting.md`](../../frame/mounting.md),
> [`frame/adapters.md`](../../frame/adapters.md) and [`frame/projections.md`](../../frame/projections.md). Milestone M1
> writes the plugin descriptor as a decision, then builds it ([where it stands](status.md)).

A **plugin** is something built once that any project can mount. There are three kinds, and the line between them is
simple.

| Kind | It adds to | Examples |
|---|---|---|
| **feature** | what the system *is*: things, operations, handlers, journeys, exports | `@formants/auth`, `@formants/organizations`, `@formants/work`, `@formants/agents`, `@formants/wallets` |
| **adapter** | what is *outside* it: calls out, events in, a stand-in for worlds | `@formants/stripe`, `@formants/resend`, an EVM chain, a browser wallet |
| **projection** | what it *becomes*: one real form of the description | the server, SDK, CLI, MCP endpoint, docs, portal, Solidity contracts |

The app itself is the **root feature**. Its own things live in `blueprint/things/`.

## A mount

A mount is one small file that says "use this plugin here, like this". It is the only thing a plugin puts in your
project. The plugin's declarations, handlers and journeys stay in its package, pinned to one version.

```ts
// blueprint/features/wallets.ts: the mount is called `wallets`, after its file
import { Blueprint } from "@formants/forman";
import wallets from "@formants/wallets";

export default Blueprint.use(wallets, (w) => [
  w.signer.browser.injected,                                        // choose: a signer wallets has proved
  w.narrow(w.operations.list, { via: [w.via.session, w.via.device] }), // narrow: fewer ways in
  w.omit(w.operations.import),                                      // omit: acme doesn't import keys
]);
```

A project then looks like this:

```text
blueprint/
  features/<name>.ts     one mount each: what else the system is
  adapters/<name>.ts     one mount each: what is outside it
  projections/<name>.ts  one mount each: what it becomes
  environments/<name>.ts where each projection lives this time
package.json             the plugins' packages, pinned exactly
```

There is no loose config file. What the app becomes is mounted like everything else, so "what does this app become?"
is answered by `ls blueprint/projections`, the same way "what is it?" is answered by `ls blueprint/things`.
`forman.config.ts` holds only what is not yet a mount (the project's name, for now) and has no `outputs`, because
nothing ever read it.

## The four mount verbs

A mount may say four things, the same for every kind of plugin, and only four. Each keeps the plugin's proof true.

| Verb | What it does | Used by |
|---|---|---|
| **choose** | picks one of the options the plugin offers (a signer, a CLI's command name) | features, adapters, projections |
| **include** | names which of an adapter's calls and events are reachable; nothing else of the outside system is | adapters |
| **narrow** | removes ways in, or operations: fewer callers cannot break a journey that passed with more | features, projections |
| **omit** | drops an operation; `check` fails if anything of the app's calls it | features |

There is no "override". If an app needs a feature's operation to behave differently, it writes its own operation over
what the feature exports.

## Choices and settings

A **choice** is made at mount time and never varies by environment (a signer, a command name). A **setting** is a value
a plugin declares and each environment gives, such as which chains a wallet links for:

```ts
// blueprint/environments/production.ts
settings: [wallets.settings.chains.is([1, 8453])]
```

## Needs

A plugin names the plugins it needs in its own descriptor, and mounting resolves them.

```ts
// @formants/wallets: blueprint/feature.ts
export default Blueprint.feature({
  needs: [auth, Blueprint.need(eip1193, { when: signer.browser.injected })], // eip1193 only with a browser signer
});
```

`forman add feature @formants/wallets` finds a mount that satisfies each need, or offers to add one. A need is never
satisfied by a copy inside the plugin, so the app has one auth, one Stripe and one browser wallet, however many features
use them.

## What mounting does, stage by stage

| Stage | What happens |
|---|---|
| `forman add` | pins the package exactly, refusing a version under three days old unless overridden; writes the mount with the plugin's default choices; resolves its needs |
| compile | folds the plugin's declarations into the model under the mount's name; each carries `from: wallets@1.2.0` |
| check | names clashes, unmet needs, a narrowing that would empty an operation, an app operation that calls an omitted one |
| generate | every projection sees the feature's operations like the app's own; its handlers are imported from its package, never copied |
| secrets | the plugin's secrets join every environment, named from mount and export |
| prove | the feature's journeys run in the app's worlds, through the app's projections, beside the app's own |
| `forman upgrade` | compares the two versions' models: a new operation is a minor change to the app, a changed payload a major one; `impact` names what is now stale |
| `forman remove` | refuses while anything of the app's uses it; otherwise removes the mount, and generate removes the rest |

## Names and clashes

- A mount's name is its file's name. If it matches the plugin's own name, the plugin's things keep their names (`wallet`,
  `wallet.link`). If it differs, they are prefixed with it. That is how one plugin is mounted twice.
- Two things with the same name, from the app and a feature or from two features, are a `check` error naming both files.
- Error and refusal codes are prefixed by the mount, so two mounts cannot share a code.

## Features

A feature adds things, operations, handlers and journeys, plus **exports**: typed functions your handlers use with
`Blueprint.step.use`, with an implementation per host. A feature never contains an adapter: it needs one.

Auth is two features. `@formants/auth` is identity (people, sessions, keys, the device flow, OAuth for MCP);
`@formants/organizations` is tenancy (organisations, memberships, invitations, `holds`), and needs auth. Nothing of
either is copied into a project. The factory (`@formants/work`) and agents (`@formants/agents`) are features too.

A whole feature written from scratch is in [`frame/writing-a-feature.md`](../../frame/writing-a-feature.md).

> **Today.** The starter copies the auth things into each project. **Proposed.** Auth and organizations mounted (M2).

## Adapters

An adapter brings one outside system within reach, and it provides six things once:

| | What |
|---|---|
| 1 | its **shape**, owned by the outside system (an OpenAPI document, an ABI, another app's model) |
| 2 | its **calls out**, as typed exports with declared errors, used as steps |
| 3 | its **events in**, as a door that verifies, decodes and calls one of our operations |
| 4 | a **principal**, `service(<mount>)`, for what comes in through that door |
| 5 | its **secrets**, declared by export, read only by the adapter |
| 6 | a **stand-in for worlds**, and a conformance test against it |

An adapter adds no things and no operations. The one blank an adapter call leaves is the mapping: which of the outside
system's errors become your declared errors. Anything you do not map is a defect, not a refusal.

```ts
// blueprint/adapters/stripe.ts
export default Blueprint.use(stripe, (s) => [
  s.include(s.calls.refunds.create),
  s.include(s.events.checkoutCompleted),
]);
```

Another Forman app is an adapter too: its published model is a complete contract, so the adapter is generated.
Stand-ins follow a labelled ladder, never our own fakes. See [`frame/adapters.md`](../../frame/adapters.md) and
[`frame/secrets.md`](../../frame/secrets.md).

## Projections

A projection makes the description real in one form. Each is a pure function from the model to files, with the rest of
what it needs to be a plugin: which operations it takes (`takes`), where it runs, how it ships, and how it replays
journeys.

The catalogue, from [`frame/projections.md`](../../frame/projections.md):

| Projection | What it is |
|---|---|
| server | the Worker that runs every server operation, with D1 and a Durable Object per actor |
| HTTP API | the endpoints, wire errors and handler types, and an OpenAPI document |
| TypeScript SDK | typed client calls and errors |
| React | hooks over the SDK, with typed refusals and pending states |
| CLI | a command per operation, exit codes from errors |
| MCP | a tool per operation, behind OAuth |
| docs | a page per thing and operation: who may call it, what goes in and out, every refusal; from M1 a page per mount, with an origin badge |
| portal | a read-only site for people and agents: things, the proof matrix, the plan |
| Solidity contracts | for every thing that lives on a chain |
| keeper | the built-in caller for time: it makes every timed move |
| infrastructure | the stack per environment: Workers, D1, R2, Durable Object bindings, domains, secret names |
| Python SDK | a typed client for Python callers, built from the model, with typed exceptions |
| mobile client | later: React Native over the TypeScript SDK |
| builder | for builders, not callers: the typed `bp` an agent builds with, in `generated/builder/` |

**The replay rule.** A projection that callers use replays every journey it takes, and the same story through the SDK,
the CLI and MCP must leave the same evidence.

> **Today.** The renderers are a fixed list in the generators package. Adding one means editing the framework, nothing
> can be left out, and only the server is proved by journeys. **Proposed.** Projections as mounts, one file each (M1).

## Where it goes next

Plugins arrive in order: the descriptor and projections as plugins in M1, auth and organizations in M2 (which makes
Forman workable), the factory in M3, agents in M4, Stripe and Resend in M5, wallets in M6. See [where it stands](status.md).
