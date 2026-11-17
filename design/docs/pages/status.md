# Where it stands

Eight milestones, M0 to M7, written on 17 November 2026. The full list, with every slice and its check, is
[`design/milestones.md`](../../milestones.md). This page is the short version.

Forman is the only focus until it is **workable, at the end of M2**. From there, Capxul's plugins are built on it, small
and reusable. Nothing in a milestone starts until the one before it has passed its gate on `main`.

## What exists on `main`

- **Declare and call.** Things, machines, operations, roles, events, journeys and starting worlds in `blueprint/`; the
  compiler, the model, and the generated server, SDK, CLI, MCP, docs and portal.
- **Prove and ship.** Worlds, journeys and nine evals; verdicts signed by CI into the logbook; versions from the model
  diff; `promote`, `publish` to a local registry, and `watch`.
- **Auth.** Better Auth on D1: people, sessions, API keys, the device flow, OAuth for remote MCP.
- **Examples.** `examples/acme` (the allowance) and `examples/work`.
- **Everything runs locally.** There is no cloud yet.
- **Not built anywhere:** plugins and mounts, adapters, the `agent`, `service` and `system` principals, secrets read by
  handlers, the agents feature, the factory loop, a Solidity language beyond a placeholder, and any cloud destination.

## The milestones

| Milestone | Goal | Ships |
|---|---|---|
| **M0** Land and rename | one name and one vocabulary, with nothing broken | `@formants/*` packages, the `forman` command, these docs |
| **M1** The complete model and plugins | a plugin is a package mounted with one file; every verdict knows what it judged | plugin descriptors, mounts, the four verbs, needs, `forman add`, projections as plugins |
| **M2** Auth and organizations | auth stops being copied; every kind of caller exists. **Workable.** | `@formants/auth`, `@formants/organizations`, principals and `Via`, secrets by declaration, `forman new` |
| **M3** The factory | `@formants/work` works out tasks from the model; people and outside agents work them | the factory plugin, declared workflows, the agent files, `forman ci` |
| **M4** Agents | `@formants/agents` runs agents durably, alone or as the factory's workers | the agents feature, model adapters, the builder's code mode and telemetry tools |
| **M5** Reach out | adapters both ways with real vendors' software; our own events drive work | `@formants/stripe`, `@formants/resend`, views, the general outbox |
| **M6** On chain | the allowance can live on chain, written once and generated in two languages | `@formants/wallets`, the chain adapter, `@formants/language-solidity`, Anvil in worlds |
| **M7** The cloud, then Capxul | every local destination swapped for the real one, each credential created only with Aaron's written yes | the cloud destinations, `@formants` on npm, Capxul's first feature |

## M0, in slices

| Slice | What |
|---|---|
| M0.01 | the package map ([packages](packages.md)) |
| M0.02 | rename packages and imports |
| M0.03 | the command, folders and variables |
| M0.04 | a lint rule against the old names |
| M0.05 | these docs: plugins instead of the old plugin word, the story as the spine |
| M0.06 | Gate M0: `nx run e2e:m0` |

M0.05's check is that the docs build, their link check passes, and the retired word appears only in history. Run
`pnpm nx run docs:check`.

## How these docs are built

Pages are Markdown in `design/docs/pages/`. `design/docs/build.mjs` turns them into `design/docs/site/`, which is
committed so the docs can be read from the repository without building. `design/docs/links.mjs` checks every relative
link and anchor in the built pages, and fails if the retired words or old names appear anywhere under `design/docs/`.

```text
pnpm nx run docs:build    write design/docs/site/
pnpm nx run docs:check    fresh build equals committed output, then the link check
```
