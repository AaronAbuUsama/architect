# K4: the framework is Orthograph

Decided 18 November 2026. Aaron, after reading the naming shortlist in [`../naming.md`](../naming.md): "lets use
orthograph tho". This record supersedes the name in [`K2-forman-frame.md`](K2-forman-frame.md) (Aaron's call 1) and
the package names in [`M0-packages.md`](M0-packages.md). Nothing else in either record changes.

## Aaron's call

The framework is **Orthograph**. The name comes from orthographic projection: one object drawn as several exact
views (plan, front, side) that together describe it. One blueprint, projected as the server, SDK, CLI, MCP, docs,
portal and traces, is the same idea.

**Blueprint stays** what you write: the `blueprint/` folder and the `Blueprint.*` API. Capxul keeps `@capxul`.

## The names that follow (the building agent's calls)

| Today | Becomes | Why |
|---|---|---|
| Forman (the product) | **Orthograph** | Aaron's call |
| command `forman` | **`ortho`** | the command is typed all day; the product name can be long. Nothing named `ortho` is on PATH or in Homebrew; the npm package `ortho` installs a binary called `orth`, so the command is clear |
| npm scope `@formants` | **`@orthograph`** | free on 18 November 2026 (`{"error":"Scope not found"}`) |
| front door `@formants/forman` | **`orthograph`**, the plain package | free on 18 November 2026 (404). The same shape as `effect` and `@effect/*`: a project writes `import { Blueprint } from "orthograph"`. The package keeps its rule: it depends on Effect alone |
| `@formants/<name>` | `@orthograph/<name>` | `@orthograph/cli`, `@orthograph/compiler`, `@orthograph/language-effect`, `@orthograph/host-cloudflare`, `@orthograph/auth`, `@orthograph/organizations`, and so on: the rule in `M0-packages.md` stands, only the scope changes |
| compiler bin `forman-model` | `ortho-model` | follows the command |
| `packages/forman` | `packages/orthograph` | the folder is named for its package |

The GitHub organization `orthograph` is taken (an empty org of the OrthoGraph floor plan company, 2013);
`orthograph-dev` was free. Whether the repository moves is Aaron's to decide; nothing in the code depends on it.

## Evidence and risks

The checks, run 18 November 2026, are in [`../naming.md`](../naming.md), "Round two". The one clash seen is
OrthoGraph, a floor plan and building survey app sold since 2004: a different field, but an architecture product
with the same name.

## What has to happen

1. **Aaron** creates the npm org `@orthograph` (he has to sign in), and a GitHub org if he wants one. Until the org
   exists, anyone could take the scope; recheck it first.
2. **A rename slice** sweeps the repository the way M0 did: packages, the command, folders, variables, docs and
   generated headers. It adds `forman`, `@formants` and the `forman` command to the old-names lint rule
   (`packages/lint/src/modules/rules/internal/old-names.ts`) so the sweep is proved complete. On 18 November
   `formants` appeared 914 times in 540 files.
