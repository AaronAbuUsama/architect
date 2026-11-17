# Packages

The package map, decided in [`M0-packages.md`](../../decisions/M0-packages.md) under K2 question 4: **one front door,
plus one package per plugin, language and host.** The old names, and which package each one became, are in that record.

Milestone M0 renamed the code to match this page: M0.02 the packages and imports, M0.03 the command, folders and
variables, and M0.04 added a lint rule that keeps the old names out. Nothing is published to npm before M7; only the
local Verdaccio sees these names, so any of them can still change.

## The packages

| Package | Folder | What it is |
|---|---|---|
| `@formants/forman` | `packages/forman` | the front door: the `Blueprint.*` API every project imports. Effect only |
| `@formants/language-effect` | `packages/language-effect` | the Effect language: renderers, and the runtime generated code runs on |
| `@formants/language-solidity` | `packages/language-solidity` | the Solidity language (a placeholder until M6) |
| `@formants/host-cloudflare` | `packages/host-cloudflare` | the Cloudflare host |
| `@formants/portal` | `packages/portal` | the portal (a projection from M1.13) |
| `@formants/cli` | `packages/cli` | the command, bin **`forman`** |
| `@formants/compiler` | `packages/compiler` | internal: blueprint to model (bin `forman-model`) |
| `@formants/generators` | `packages/generators` | internal: the Nx sync and scaffold generators |
| `@formants/prove` | `packages/prove` | internal: worlds, journeys, evals, verdicts, promote, publish |
| `@formants/lint` | `packages/lint` | internal: oxlint rules |
| `@formants/logbook` | `packages/logbook` | internal: verdicts and models per project |
| `@formants/preset` | `packages/preset` | internal: the Nx preset, until `forman new` replaces it (M2.09) |

The workspace and its gates are private packages, `@formants/source` and `@formants/e2e`.

A project imports the front door and nothing else of the framework's:

```ts
import { Blueprint } from "@formants/forman";
```

## Plugins come later, one package each

Named for what they are, without the kind: `@formants/auth`, `@formants/organizations` (M2), `@formants/work` (M3),
`@formants/agents` (M4), `@formants/stripe`, `@formants/resend` (M5), `@formants/wallets` (M6). Languages and hosts keep
their kind as a prefix (`language-`, `host-`), because a project picks one of each and the prefix tells them apart.
See [plugins](plugins.md).

## The command

The command is `forman` (and `forman-model` for the compiler). It ships from `@formants/cli` until M2.09, because the
front door cannot carry the bin without a cycle: `forman` needs `cli`, `cli` needs `compiler`, and `compiler` needs
`forman`. Which internal packages ship inside the front door is settled in M2.09, when `npm create formants` replaces
the preset and a new project should need one dependency.

## Package rules

These are checked by lint and `check`, in Nx tags:

- `scope:forman` (the front door) depends only on Effect.
- Generated code imports only the target's runtime, the front door, the host and project code.
- `compiler` and `generators` never run in production.
- A project (`scope:project`) depends only on `scope:forman`, `scope:language` and `scope:host`.
- Dependency versions are pinned exactly, and published at least three days before they are added.
- Inside each package, `src/` follows the six-slot module shape: `main.ts` as the only entry file, and
  `modules/<name>/{README.md,types.ts,service.ts,internal/,<name>.test.ts}`, no source file over about 250 lines.

## Commands, folders and variables

| Was | Is |
|---|---|
| the old command | `forman`; the compiler's bin is `forman-model` |
| the old run folder | `.forman/` (run folders, caches, worlds) |
| the old variables | `FORMAN_*`, with the same suffix |
| the old project config | `forman.config.ts`, without `outputs` (nothing read it; projections are mounted instead) |

The only names that keep the old form are the records, listed in section 5 of
[`M0-packages.md`](../../decisions/M0-packages.md), and the GitHub repository and checkout path, which are not ours to
rename in M0. The old design docs are one of those records ([the old design docs](../../history/docs-layers-1-2/)).
