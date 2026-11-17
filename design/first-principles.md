# Architect from first principles

A frame, not a decision. It is written in plain words from a reading of the whole design (`decisions.md`,
`build-plan.md`, `docs/index.html`, `history/`, the D, F, G, H, N and O records, the wayfinding notes) and of acme's
code on `layer/3` at `3bacbf3`. Aaron agreed with it on 17 November 2026 ("mostly correct"), before working through its
DX. Where it disagrees with `decisions/K1-kits.md` section 3, this frame is the newer thinking; the DX work settles it
and the record is then brought in line.

## In one breath

You write one description of a system. Everything else is a projection of it. The only thing written by hand is
behaviour, inside frames the description generates. Everything that runs is judged against the description by the same
names.

## Four principles

1. **One description.** What exists (things), how it changes (machines, operations), who may change it (roles), what is
   recorded (events, steps), what must hold (journeys). That is the blueprint; compiled, it is the model.
2. **Many projections.** The server is the description projected onto a host. The SDK, CLI and MCP are projections onto
   callers. Docs and the portal are projections onto readers. Solidity is a projection onto a chain. A world is a
   projection onto a test. None of them is the system; each is a view of it.
3. **Behaviour is the only freehand.** Handlers fill blanks in generated frames. Their types come from the declaration,
   so code that breaks the contract doesn't compile.
4. **Evidence comes back under the same names.** Spans, events and refusals carry the names that came from paths. Evals
   read the evidence and judge it against the description.

"Never drifts" follows from two rules: nothing is written twice, and everything written by hand is both framed by the
description and judged against it.

## Servers and clients are projections

The missing idea is not a new primitive called server or client. It is that servers and clients are projections, and
today the projections are fixed:

- The generators have one renderer per output, written into the framework
  (`packages/generators/src/modules/render/internal/{server,sdk,cli,mcp}.ts`).
- `architect.config.ts` declares `outputs`, and nothing reads it (D3 #112, `later.md`).
- Journeys call the server over raw HTTP (`packages/prove/src/modules/journeys/internal/world.ts:85`,
  `` fetch(`${url}/${thing}/${verb}`) ``). The SDK, CLI and MCP are never proved by a journey.

## Plugins: three kinds

Something you build once, and that then just exists for every project, is a plugin. A plugin adds to exactly one of
three things:

| Kind | What it adds to | Examples |
|---|---|---|
| **Feature** | what the system *is*: things, operations, handlers, journeys | auth, wallets, payment flows, the agent `Run` |
| **Projection** | what it *becomes*: one way the description is made real | the Cloudflare server, the TypeScript SDK, the CLI, MCP, docs, the portal, Solidity, later a mobile client |
| **Adapter** | what is *outside*: something called and not owned, with its errors and spans | viem and the chain, Stripe, Resend |

- **The app is the root feature.** It is the same kind of thing as wallets, with no parent.
- **The standard library** is the first-party plugins of all three kinds.
- **Internal and external commands.** An external command is an operation; projections expose it to callers. An
  internal command is a dependency a feature exports to the app's handlers, such as `Payments.refund`.
- **What reaches where.** A feature's operation reaches a projection when its `runs` fits what the projection hosts, and
  its `allowed` (with `via`) admits the way that projection's callers sign in.

### Each plugin brings its proof

- **A feature** brings journeys, proved in its own example app and again in every app that mounts it.
- **A projection** replays every journey through itself: the same story through the SDK, the CLI and MCP must leave the
  same evidence.
- **An adapter** brings a conformance test against a stand-in that runs in the world.

## What a person looks at

```text
blueprint/            what it is: the app's own declarations, and the features it mounts
architect.config.ts   what it becomes: the projections it turns on
environments/         where each projection lives this time
src/                  how it behaves: the only hand-written logic
generated/            everything else; never edited
```

## The builder is an audience too

The agent that builds the app gets projections of its own: a brief for each blank, scaffolds, and a builder MCP with
`brief`, `check`, `prove`, `impact`, `trace`, and "call this operation as a principal in a world". Errors and traces
carry the declared names, so every failure points back to its declaration. Today the builder has the CLI only; the
generated MCP serves the app's callers, not its builders.

## Where today's design falls short of this

- The model leaves out journeys, starting worlds and role rules, and drops an operation that still has a blank
  (`compiler/.../describe.ts:99`), so an unfinished model looks smaller rather than unfinished (F2 section 0).
- A proof is keyed by blueprint hashes, not handler bodies (F1, `later.md`).
- Principals are `anonymous | person` only; an agent acting for a person looks like the person (F5 section 4).
- "Dependency" means three things (the model's staleness graph, a call outward, F5's declared read) and "output" means
  three (a generated folder, something deployed or published, a config key).
- A kit has no defined shape, and the starter copies the auth things into each project, which clashes with auth
  becoming a kit (D2 #61, L3.03).
