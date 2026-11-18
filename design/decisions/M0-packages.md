# M0: the package map, and what the rename leaves alone

> **Superseded in its names on 18 November 2026 by [`K6-orthograph.md`](K6-orthograph.md):** the scope `@formants` is
> now `@orthograph`, the front door `@formants/forman` is the plain package `orthograph`, and the command is `ortho`
> ([`../naming.md`](../naming.md) maps every name). The map's shape and its rules stand.

Decided 17 November 2026 by the M0 builder, under K2 Q4 ("one front door, plus one package per plugin, language and
host") and Aaron's own calls in [`K2-forman-frame.md`](K2-forman-frame.md). This is slice M0.01 of
[`../milestones.md`](../milestones.md). Nothing is published to npm before M7, so every name here can still change
until then; only the local Verdaccio sees them.

## 1. The map

| Today | Folder after M0 | Package after M0 | Tags after M0 | What it is |
|---|---|---|---|---|
| `@architect/blueprint` | `packages/forman` | **`@formants/forman`** | `scope:forman`, `env:runtime` | the front door: the `Blueprint.*` API every project imports; Effect only |
| `@architect/target-effect` | `packages/language-effect` | `@formants/language-effect` | `scope:language`, `env:runtime` | the Effect language: renderers and the runtime generated code runs on |
| `@architect/target-solidity` | `packages/language-solidity` | `@formants/language-solidity` | `scope:language-solidity`, `env:build` | the Solidity language (a placeholder until M6) |
| `@architect/host-cloudflare` | `packages/host-cloudflare` | `@formants/host-cloudflare` | unchanged | the Cloudflare host |
| `@architect/portal` | `packages/portal` | `@formants/portal` | unchanged | the portal (a projection from M1.13) |
| `@architect/cli` | `packages/cli` | `@formants/cli`, bin **`forman`** | unchanged | the command (see section 2) |
| `@architect/compiler` | `packages/compiler` | `@formants/compiler`, bin `forman-model` | unchanged | internal: blueprint to model |
| `@architect/generators` | `packages/generators` | `@formants/generators` | unchanged | internal: the Nx sync and scaffold generators |
| `@architect/prove` | `packages/prove` | `@formants/prove` | unchanged | internal: worlds, journeys, evals, verdicts, promote, publish |
| `@architect/lint` | `packages/lint` | `@formants/lint` | unchanged | internal: oxlint rules |
| `@architect/logbook` | `packages/logbook` | `@formants/logbook` | unchanged | internal: verdicts and models per project |
| `@architect/preset` | `packages/preset` | `@formants/preset` | unchanged | internal: the Nx preset, until `forman new` replaces it (M2.09) |
| `@architect/std` | removed | none | none | an empty placeholder for "the standard library's kits"; plugins are one package each (K2 Q4) |
| `@architect/source`, `@architect/e2e` | root, `e2e` | `@formants/source`, `@formants/e2e` (private) | unchanged | the workspace and its gates |

Plugins come later, one package each, named for what they are without the kind: `@formants/auth`,
`@formants/organizations` (M2), `@formants/work` (M3), `@formants/agents` (M4), `@formants/stripe`, `@formants/resend`
(M5), `@formants/wallets` (M6). Languages and hosts keep their kind as a prefix (`language-`, `host-`), because a
project picks one of each and the prefix is what tells them apart.

## 2. The front door, and what ships inside it

**`@formants/forman` is today's `@architect/blueprint`, renamed.** It is what a project and its generated code import
(`import { Blueprint } from "@formants/forman"`), and it keeps the package rule that it depends on Effect alone. That
is what the frame already assumes (`frame/examples/payments.md`: "`@formants/forman` is today's
`@architect/blueprint`"; M1.05 puts the plugin descriptors in it, "Effect-only, per the package rules").

**The `forman` command ships from `@formants/cli` until M2.09.** The front door can't carry the bin today without a
cycle: the bin needs the CLI, the CLI needs the compiler, and the compiler needs the API (`forman` → `cli` →
`compiler` → `forman`). Today's starter already installs the CLI as a dev dependency beside the API, so a user sees
`forman check` and `forman prove` with nothing else changed.

**Which internal packages ship inside the front door** (compiler, generators, prove, lint, logbook, cli, preset) is
settled in M2.09, when `npm create formants` replaces the preset and a new project should need one dependency. The
shape to settle then: a thin `@formants/forman` whose main entry stays Effect-only and whose `bin` reaches the
toolchain, with the API itself moved to an internal package so the cycle breaks. M0 bundles nothing: its slices are
mechanical renames (milestones, risk 1), and every internal package is still published to the local Verdaccio under
`@formants/*`, as today's eleven are under `@architect/*`.

## 3. Tags and rules

- `scope:blueprint` becomes `scope:forman`; `scope:target` becomes `scope:language`; `scope:target-solidity` becomes
  `scope:language-solidity`. The module-boundary rules in `.oxlintrc.json` follow: `scope:forman` imports only Effect,
  and a project (`scope:project`) depends only on `scope:forman`, `scope:language` and `scope:host`.
- `AGENTS.md`'s package rules say the same in the new words.

## 4. Commands, folders and variables (for M0.03)

- The command `architect` becomes `forman`; `architect-model` becomes `forman-model`.
- `.architect/` (run folders, caches, worlds) becomes `.forman/`; every `ARCHITECT_*` variable becomes `FORMAN_*`
  with the same suffix; local Docker containers and temporary folders named `architect-*` become `forman-*`.
- `architect.config.ts` becomes `forman.config.ts`, and its `outputs` field is removed: nothing reads it (D3 #112);
  projections are mounted instead (M1.11). What it still holds (the project's name, auth and telemetry choices) moves
  into mounts in M1 and M2.

## 5. What keeps the old name: the records

A record says what happened, in the words used then; rewriting it would falsify it. So the old names stay in records,
and the gate's name check (M0.06), the lint rule (M0.04) and the docs' "kit" check (M0.05) skip exactly these:

- `design/history/`, which now also holds the old design docs (`design/history/docs-layers-1-2/`), the old
  `handoff.md` narrative and `KICKOFF.md`;
- `design/decisions/` and `design/decisions.md` (decision records, this one included, which names the old packages
  to map them);
- `design/evidence/`, `design/briefs/`, `design/wayfinding/`, `design/spikes/`, `design/noir/`, `design/state/`;
- `design/build-plan.md`, the record of layers 1 and 2 (milestones.md: "Layers 1 and 2 stay in the build plan as the
  record of what was built");
- `design/goals/01-the-whole-framework-locally.md`, goal 1's prompt, and `design/frame/questions.md`, the question
  round K2 answered, which quotes the code as it was;
- `spikes/` (spike code is throwaway and never imported by packages).

Everything else speaks the new names: the code, the examples, the gates, `README.md`, `AGENTS.md`, the skills, the
frame, the milestones, goal 2, `handoff.md`, `later.md`, `packages.md` and the design docs. The milestones say
"outside `design/history/`"; they mean these records, and `milestones.md` is updated to say so in this commit.

**Two names that are not ours to change in M0** stay, and the name check allows them by exact form: the GitHub
repository `AaronAbuUsama/architect` (renaming it is outward-facing: Aaron's call, whenever he wants) and the local
checkout path `~/projects/architect`.

## 6. The gates under the rename

Milestones M0.03 asks for `e2e:layer1` and `e2e:layer2` to pass "renamed", and Gate M0 runs them "under the new
names". So the Gate 1 and Gate 2 suites, their fixtures and the journeys are edited by the builder in M0, but only by
the rename: package names, the command, variables, folders and container names. No assertion, request, budget,
deadline or journey step changes. The 🔍 reviewer checks that the diff under `e2e/` and `examples/*/journeys/` is
names only. The gate's new name check (M0.06) is written by a separate checks author, as the rules ask.
