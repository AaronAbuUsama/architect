# K6: the framework is Orthograph

Decided 18 November 2026. Aaron, after reading the shortlist in [`../naming-search.md`](../naming-search.md):
"lets use orthograph tho". This record replaces the name in [`K2-forman-frame.md`](K2-forman-frame.md) (Aaron's call
1) and the package scope in [`M0-packages.md`](M0-packages.md). Nothing else in those records changes.

## Aaron's calls

1. The framework is **Orthograph**. The name comes from orthographic projection: one object drawn as several exact
   views (plan, front, side) that together describe it. One blueprint, projected as the server, the SDK, the CLI,
   the MCP tools, the docs, the portal and the traces, is the same idea.
2. **Blueprint stays** as what you write: the `blueprint/` folder and the `Blueprint.*` API. Capxul keeps `@capxul`.
3. **Nothing is renamed until the names are written down** (Aaron, 18 November 2026: "we should be a bit more clear
   about naming, about what's named, where and how"). [`../naming.md`](../naming.md) is that map: every name, where
   it lives, and the rule that forms it. The sweep follows the map and nothing else.

## The building agent's calls

- **Three forms of one name.** *Orthograph* in prose; `ortho` for everything typed or machine-facing (the command,
  binaries, `ORTHO_` variables, `.ortho/`, `ortho.config.ts`, `/_ortho/`, telemetry scopes, lint rules); `@orthograph`
  only as the npm scope. The rules and every row are in [`../naming.md`](../naming.md).
- **The front door is the plain package `orthograph`**, the same shape as `effect` and `@effect/*`. A project writes
  `import { Blueprint } from "orthograph"`. It keeps its rule of depending on Effect alone.
- **The command is `ortho`.** Nothing called `ortho` is on PATH or in Homebrew. The npm package `ortho` installs a
  binary named `orth`, so the command name is clear.

Availability was checked on 18 November 2026: the `@orthograph` scope and the plain `orthograph` package were both
free. The one clash found is OrthoGraph, a floor plan app for building surveyors (a different field, but an
architecture product with the same name). The evidence is in [`../naming-search.md`](../naming-search.md), "Round two".

## Order

> **Done 18 November 2026:** the sweep ran as one slice; what it changed and found is in [`../naming.md`](../naming.md).

1. **No code is renamed yet.** The sweep is one mechanical slice, like M0. It runs after the open design pull
   requests land (#37 skills, #38 the canon, #41 the generated app, #43 the ledger, and K5, the whole shape), so it
   doesn't conflict with all of them at once.
2. **Aaron creates the `@orthograph` npm org himself**, because creating it needs his sign-in. Until it exists,
   anyone could take the scope, so he should recheck it first.
3. The sweep then follows [`../naming.md`](../naming.md) category by category. It adds the old names to the
   old-names lint rule so that lint proves the sweep is complete.
