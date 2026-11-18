# M1-plugins: the plugin descriptor, mounts and the verbs

Decided 18 November 2026 by the 🧭 lead of M1's plugin path (goal 3, [`../goals/03-m1-plugin-path.md`](../goals/03-m1-plugin-path.md)).
Slice M1.01. It harvests sections 1 to 3 of Codex's D4 (`layer/4:design/decisions/D4.md`, "kits, dependencies and
the chain") under the frame's words ([`../frame/mounting.md`](../frame/mounting.md),
[`../frame/projections.md`](../frame/projections.md), [`../frame/adapters.md`](../frame/adapters.md),
[`../frame/writing-a-feature.md`](../frame/writing-a-feature.md)), and folds in what K5 needs of the descriptor.

This is the public surface the ported checks in `e2e/m1` judge. A builder implements it; a ✍️ author writes the checks
from it. Where this record and a frame page disagree, this record wins and the frame page is fixed in the same change.

## What D4 said, and what changes

| D4 (kits) | Here (plugins) | Why |
|---|---|---|
| a kit, `blueprint/kits/<alias>.ts`, `Blueprint.kit(Kit, choices)` | a feature, adapter or projection, `blueprint/{features,adapters,projections}/<name>.ts`, `Blueprint.use(plugin, (p) => [...])` | the frame's three kinds and four verbs (K2 Q3, Q4) |
| choices are canonical JSON values (`{ prefix: "" }`) | a **choice** is a pick among options the plugin proved; a value that differs by environment is a **setting** | frame: "a choice never varies by environment"; a free JSON value is unproved |
| declarations as one namespace per thing from `./blueprint`, names from export identifiers | a feature's `blueprint/` folder has the **same layout as an app's** and is read by the same layout reader: names from paths | one rule for apps and plugins; a plugin author writes exactly what an app writes |
| canonical names `kit:fixture:echo.repeat`, paths `kits/fixture/echo` | names as in an app: `echo.repeat` when the mount keeps the plugin's own name, `fixture-echo.repeat` when it is renamed | frame, "Names and clashes" |
| `make(choices, declarations)` returns `{ handlers, layer }` | one handler module per operation in the package's `src/`, the same layout as an app's `src/`, plus an optional `layer` | names from paths again; open to K7 F1's one generated entry per operation (below) |
| `uses: [kit]` on an operation; dependency descriptors | `needs:` between plugins now; an app operation reaching a plugin is a **step** (`Blueprint.step.call` for an adapter's call, `Blueprint.step.use` for a feature's export), M1.14 | frame: calls out are steps, so each is a span with declared errors |
| `architect add dependency` writes a declaration and a mapper | an adapter is its own package, mounted like the others; its one blank is the error mapping in the calling handler | frame, adapters.md "Calling out" |

Kept from D4 unchanged: the descriptor and declaration entries are pure (no runtime import, checked on the real import
closure, never by tree shaking); runtime entries are separate per host and requesting a missing one fails explicitly,
never shimmed; one plugin is mounted once in M1; error wire tags come from exported class names and are never
alias-stamped; ambiguous tags in one error union and duplicate final codes are refused; the uses graph is one
normalized list of edges that `impact` prints; a plugin's hash includes its exact resolved identity and the bytes of
its installed files, and fails closed without them; nothing absolute or transient enters a hash; D4 section 3's
Promise and Effect call semantics (below).

## 1. Three kinds, one package shape

A plugin is one npm package. Its `package.json` carries an `orthograph` key, which is how `ortho` knows it is a plugin
and where its parts are:

```jsonc
// @fixture/echo/package.json
{
  "name": "@fixture/echo",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/feature.d.ts", "default": "./dist/feature.js" },              // the descriptor: pure
    "./blueprint/*": { "types": "./dist/blueprint/*.d.ts", "default": "./dist/blueprint/*" }, // declarations: pure
    "./src/*": { "types": "./dist/src/*.d.ts", "default": "./dist/src/*" }                 // behaviour, by host
  },
  "orthograph": { "kind": "feature", "blueprint": "./dist/blueprint", "src": "./dist/src" },
  "peerDependencies": { "orthograph": "0.0.0", "@orthograph/language-effect": "0.0.0" }
}
```

- `kind` is `feature`, `adapter` or `projection`. `ortho add <kind>` refuses a package whose kind differs.
- `blueprint` is a folder with an app's layout: `things/<thing>/{thing,machine,events,errors,roles}.js` and
  `things/<thing>/verbs/<verb>.js`, `values/*.js`, `choices.js`, and `journeys/*.js`. Names come from these paths, by the
  same reader and the same rules as an app's (`packages/compiler/src/modules/model/internal/layout.ts`).
- `src` holds behaviour with an app's layout: `<thing>/<verb>.js` is the handler of a server operation, by default
  export; `<thing>/<verb>.node.js` and `<thing>/<verb>.browser.js` are an operation's code on those hosts (for
  `runs: "client"`, M1.27); `layer.js`, when present, exports `layer`, the services the plugin's handlers need.
- A published plugin ships JavaScript and declaration files (Node does not strip types inside `node_modules`). In a
  workspace the same keys may point at TypeScript sources.

## 2. The descriptors

The package's root export is its descriptor, made with one of three functions in `orthograph` (Effect-only, per the
package rules). Each is pure metadata.

```ts
// @fixture/echo: src/feature.ts
import { Blueprint } from "orthograph";
import * as choices from "./blueprint/choices.ts";

export default Blueprint.feature({
  description: "Repeats what it is given.",
  choices,                       // what an app may pick when it mounts it
  needs: [],                     // other plugins it needs mounted beside it
  // settings, exports: shapes below; settings land in a later slice, exports in M1.14
});
```

```ts
// @fixture/echo: src/blueprint/choices.ts
import { Blueprint } from "orthograph";
/** How the echo is said. The first option is the default. */
export const style = Blueprint.choice({ plain: "Repeats the text as it was given.", loud: "Repeats it in capitals." });
```

| Field | `feature` | `adapter` | `projection` | Meaning |
|---|---|---|---|---|
| `description` | ✔ | ✔ | ✔ | one sentence, shown by `describe`, docs and `add` |
| `choices` | ✔ | ✔ | ✔ | named `Blueprint.choice` objects; each option is something the plugin proved |
| `settings` | ✔ | ✔ | — | named `Blueprint.setting.<kind>(Value, …)`; each environment gives a value (shape only in M1, below) |
| `needs` | ✔ | ✔ | — | plugin descriptors, or `Blueprint.need(descriptor, { when: option })` |
| `exports` | ✔ | — | — | `Blueprint.export` values an app's handlers use as steps (M1.14) |
| `calls`, `events`, `standIn`, `host` | — | ✔ | — | adapters.md; `calls` are `Blueprint.call` values (section 9) |
| `host`, `builtOn`, `reaches`, `via`, `takes`, `render`, `replay`, `ships` | — | — | ✔ | projections.md section 1; `render` takes a project and returns files, as an Effect |

A wrong field, a missing `description`, or an option from another choice is a compile error in TypeScript (M1.05).
`Blueprint.feature` and its kin return frozen objects with `kind: "feature" | "adapter" | "projection"`.

**Projection descriptors** are typed here so a third party can write one (ledger PRJ-14, PRJ-32), but the compiler
reads projection mounts only from M1.11; until then a `blueprint/projections/` mount is recorded in the model and
generates nothing. **Adapter descriptors** are typed here and mounted from M1.14, which builds their calls (section 9).

## 3. The mount and the four verbs

A mount is one file. Its name is the file's name. It is the only thing a plugin puts in a project.

```ts
// blueprint/features/echo.ts. Scaffolded from @fixture/echo 1.0.0. Yours from now on.
import { Blueprint } from "orthograph";
import echo from "@fixture/echo";

export default Blueprint.use(echo, (p) => [p.choose(p.choices.style.plain)]);
```

`Blueprint.use(plugin, verbs)` returns a frozen mount (`kind: "mount"`). The callback receives a view of the plugin
whose verbs are bound to it; it returns the list of verb results. The verbs:

| Verb | Call | Kinds | Rule the compiler checks |
|---|---|---|---|
| choose | `p.choose(p.choices.style.loud)` | all | one option per choice; an unpicked choice takes its first option; an option of another plugin or another choice is refused |
| include | `p.include(p.calls.refunds.create, p.events.paid)` | adapters | only what is named is reachable (M1.14) |
| narrow | `p.narrow(op, { via: [Via.session, Via.key] })` | features, projections | `via` only removes ways in; an empty `via` is refused (it would empty the operation: use omit) |
| omit | `p.omit(op)` | features | the operation is not in the model, so nothing is generated for it (only `mounts.<name>.omitted` names it, in the model and what is the model: `generated/model/`, `generated/portal/blueprint.json`); a journey's step that runs it is skipped and named, and the journey's other steps run |

`op` is the plugin's own declaration object, imported from its pure entry
(`import shout from "@fixture/echo/blueprint/things/echo/verbs/shout.js"`). The compiler matches it by identity; an
operation that isn't the plugin's is refused naming the mount file. There is no override and no widening.

**Ways in.** `Via` is exported from `orthograph` with the four ways in from K1: `Via.session`, `Via.key`, `Via.device`,
`Via.agent`. In M1, the only door that can tell them apart is MCP, which is `Via.agent`: an operation narrowed without
`Via.agent` has no MCP tool and the MCP door refuses it. The other three are recorded in the model (`via` on the
operation) and enforced when M2.03 gives principals their way in (M2.01 decides `.via` and `.notVia` on roles).
Narrowing by the app's own roles is **not** offered (ledger X-11: K1 kept narrowing provable; `frame/examples/factory.md`
is changed to omit and via).

## 4. Names

- The mount's name is its file's name, lowercase words joined by dashes; anything else (`../escape`, `bad/name`,
  `bad:alias`, a leading digit) is refused, by `ortho add` before it writes and by the compiler naming the file.
- A plugin's own name is the last part of its package name: `@fixture/echo` is `echo`.
- When the mount's name is the plugin's own name, its things keep their names: thing `echo`, operation `echo.repeat`.
  Otherwise each thing is prefixed with the mount's name and a dash: mounted as `fixture`, thing `fixture-echo`,
  operation `fixture-echo.repeat`. Everything generated follows the thing's name, exactly as for an app's own:
  `generated/api/src/fixture-echo/repeat.ts`, `generated/sdk/src/fixture-echo/repeat.ts`, `Sdk.fixtureEcho.repeat`,
  HTTP `POST /fixture-echo/repeat`, MCP tool `fixture-echo.repeat`, span `fixture-echo.repeat`, identifier `FixtureEcho`.
- Refusal codes use the thing's prefix as for an app's things (`code` on the thing, else two letters of its final
  name). Their numbers follow declaration order in `errors`, as for an app's things (D3 #193: a code is never
  silently renumbered), so two errors declared the other way round swap numbers: reordering a released plugin's errors is
  a code change, a major bump. Names, identifiers and tags never depend on order. (Decided in M1.08.) Error class names keep their export names: two mounts can't be told apart by them, so one plugin is mounted
  **once** in M1. A second mount of the same descriptor is refused, naming both files. Mounting one plugin twice waits
  for per-mount error names, recorded in `later.md`.
- Nothing about a plugin is written as a string by the app: the mount imports the package; names come from paths.

## 5. Choices and settings

```ts
Blueprint.choice({ plain: "…", loud: "…" })     // a choice: its options, each with what it means; the first is the default
echo.choices.style.loud                           // an option, an object: { kind: "option", choice, key }
```

- `choices` may nest plain objects (`signer: { node: Blueprint.choice(…), browser: Blueprint.choice(…) }`); a choice is
  named by its path in them (`signer.browser`).
- The model records each mount's picked options by name (`chosen: { style: "loud" }`), so a changed pick changes the
  mount's hash and stales exactly the operations that depend on the mount (section 7).
- A handler asks what was picked with `Mount.picked(option)`, an `Effect<boolean>` from `@orthograph/language-effect`.
  The generated server provides each plugin's mount to its own handlers; a handler never reads another plugin's mount.
- **Settings** (shape only): `Blueprint.setting.list(ChainId, { min: 1 })` in the descriptor's `settings`; each
  environment gives it, `settings: [wallets.settings.chains.is([1, 8453])]`, by importing the mount. M1 types this
  shape so a descriptor written today keeps compiling; reading settings in the model and delivering them to handlers
  per environment is a later slice (recorded in the ledger, owner to be given by the conductor).

## 6. Needs

```ts
needs: [auth, Blueprint.need(eip1193, { when: choices.signer.browser.injected })]
```

- A need is another plugin's descriptor. The compiler meets it with the app's mount of that descriptor (identity),
  whatever the mount is named, or
  refuses: `blueprint/features/wallets.ts: @orthograph/wallets needs @orthograph/auth, which isn't mounted: ortho add
  feature @orthograph/auth`. A need with `when` applies only if the mount picked that option.
- A need is never met by a copy inside the plugin, so an app has one of each, however many plugins use it.
- `Blueprint.need(x, { atLeast })` (the agents feature, FEA-08 and G-15) is not in M1; it is decided with M4's agents.
- `ortho add` lists each need as met (naming the mount) or not (naming the command that mounts it). It does not install
  or mount a need by itself in M1; `ortho check` and the compiler refuse until it is met.

## 7. What a mount adds to the model

The model gains a `mounts` section, present only when there are mounts, so plugin mounting alone adds no mount metadata to a project that mounts nothing:

```jsonc
"mounts": {
  "echo": {
    "kind": "feature", "file": "blueprint/features/echo.ts",
    "package": "@fixture/echo", "version": "1.0.0",
    "integrity": "sha256-…",            // the installed package's files (paths relative to it, and bytes), not node_modules
    "chosen": { "style": "plain" }, "omitted": ["echo.shout"], "narrowed": { "echo.repeat": ["key", "session"] },
    "needs": ["feature:auth"],
    "hash": "…"
  }
}
```

Each thing and operation that came from a plugin carries `from: { "kind": "feature", "mount": "echo", "package": "@fixture/echo",
"version": "1.0.0", "thing": "echo" }` (`thing` is the plugin's own name for it). A plugin operation's `file` is the
specifier of its pure declaration, `@fixture/echo/blueprint/things/echo/verbs/repeat.js`, which generated code imports
and every loader resolves from the project's root. An app's own declarations keep `blueprint/…` paths and carry `from: { kind: "app" }`. See [M1.03](M1-model.md).

**The graph.** `Compare.dependsOn` adds `feature:<mount>` (or `adapter:` or `projection:`) with the mount's hash to every
operation that came from it, and `Compare.hashOf` answers those keys. `ortho impact` prints the edges first, sorted
and without duplicates, one per line:

```text
feature:echo -> echo.repeat  provides
feature:wallets -> feature:auth  needs
```

`used-by` edges, from an app operation's `step.call` or `step.use` to the mount it reaches, arrive with those steps in
M1.14. A changed pick, a changed `omit` or `narrow`, or changed bytes in the installed package (even at the same
version) change the mount's hash and stale only its operations; an unrelated operation keeps its hash. A plugin whose
`package.json` or declared `blueprint` folder is missing fails closed in the model, naming the package; a missing
handler module is refused at `generate` (section 8).

## 8. Behaviour, hosts and the import rule

- The generated server imports a plugin operation's handler from `<package>/src/<thing>/<verb>.js` and its declaration
  from `<package>/blueprint/…`, never from a copy. `src/` in the app gains nothing.
- A server operation whose handler module is missing is refused at `generate`, naming the operation, the package and
  "worker". Nothing is shimmed.
- The plugin's `layer`, when present, is provided to that plugin's handlers only, on every door (HTTP and MCP), and its
  services stay in the context the routes capture.
- **The import rule (amends `AGENTS.md`, ledger LAH-28, X-27, PLU-06).** Generated code may import, besides the
  language's runtime, `orthograph`, the host and project code: a mounted plugin's descriptor and `blueprint/*` entries
  everywhere, and its `src/*` entries for the host the generated file runs on. API and SDK code import only the two pure
  entries. Worker code never imports a `.node.js` or `.browser.js` entry. Project code never imports a plugin's `src/*`.
  This is checked on the real import closure (esbuild's metafile), never by tree shaking (M1.09).
- **K7 F1.** F1 proposes one generated entry per operation, with a manifest `ortho check` checks. This layout is already
  one module per operation per host, found by path; if F1 is decided as proposed, the package gains a generated manifest
  of those entries beside `orthograph` in `package.json`, and `check` refuses an entry not in it. Mounts, names and the
  model don't change. Nothing of the manifest is built here.

## 9. Adapters, harvested from D4 section 3 for M1.14

The surface M1.14 builds and checks `03` and `04` judge; M1.14's builder may refine it only through its own decision
step:

```ts
// @fixture/remote: src/adapter.ts
export default Blueprint.adapter({
  description: "Prices from the remote service.",
  calls: { quote: Blueprint.call({ mode: "promise", errors: [PriceUnavailable] }) },  // mode "promise" (default) or "effect"
  standIn: Stand.process(...),
});
// its src/calls/quote.js exports the callable; argument and answer types are inferred from it, never retyped
```

```ts
// blueprint/adapters/pricing.ts
export default Blueprint.use(remote, (r) => [r.include(r.calls.quote)]);
// blueprint/things/allowance/verbs/grant.ts
steps: { price: Blueprint.step.call(pricing.calls.quote) }
```

D4 section 3's semantics hold for the step's runner: Promise mode calls lazily inside `Effect.tryPromise`, the raw wait
alone is uninterruptible and counted until it settles, a synchronous throw and a rejection reach the handler as
`unknown`; Effect mode keeps the callable's typed failure and its service requirements, and maps nothing. The one
blank is the handler's error mapping, scaffolded as a `Handlers.blank`; an unmapped failure is a defect. Foreign
callables and their types never enter a pure entry or a client closure. The step's span is
`<thing>.<verb>.<step>` with `kind: call`; foreign failure payloads are not logged.

## 10. A plugin's journeys

A feature's `blueprint/journeys/*.js` run on every `ortho prove` of the app that mounts it, in the app's worlds, beside
the app's own, so a feature's operations are covered by its own journeys. A step that runs an omitted operation is
skipped and named (`  skipped "<step>": it runs echo.shout, which blueprint/features/echo.ts omits`), the journey's
other steps run, so what the mount keeps is still covered, and prove still passes. (Built in M1.07: skipping the whole
journey would leave the kept operations it covers uncovered.) Span names follow the mount's names and `spans()` takes written names, so a
plugin's journeys assert no spans in M1; the declared-steps eval still judges them. Starting-world fragments stay open
(mounting.md).

## 11. `ortho add feature|adapter|projection`

```text
$ ortho add feature @fixture/echo
wrote blueprint/features/echo.ts
pinned @fixture/echo 1.0.0 (local: no registry release to age)
needs none
next ortho generate, then ortho check
```

- Arguments: `<package> [--as <name>] [--dry-run]`. `--dry-run` prints `would write …` and writes nothing.
- It reads the installed package. A package that isn't installed is refused with the install command
  (`pnpm add --save-exact <package>`); a package with no `orthograph` key or another `kind` is refused.
- It pins exactly: the dependency in `package.json` becomes the installed version with no range.
- R1, three days: when the package came from a registry, its version's publish time is read from that registry and a
  version under three days old is refused unless the package is named in the project's `minimumReleaseAgeExclude`
  (pnpm's own override, with its reason). A package from no registry (a local tarball or link) says so and is pinned.
- It writes the mount with each choice's first option picked (`p.choose(p.choices.style.plain)`, the callback's
  parameter `p` so it never shadows the import), and refuses to overwrite an existing mount
  (`blueprint/features/echo.ts already exists`), leaving it byte for byte.
- It is one command: after it, `ortho generate`, `ortho check` and `ortho prove` work with no other step. Its last line
  says to generate first, because `check` holds `generated/` to the blueprint (section 12).
- Each need is listed at the first picks: `needs @x/auth: met by blueprint/features/auth.ts`, or
  `needs @x/auth: not mounted: ortho add feature @x/auth`. Nothing is mounted for it.
- Whether a release came from a registry is read from the project's `pnpm-lock.yaml` (an `integrity` with no `tarball`
  or `directory`); its publish time from `npm_config_registry`, else npm's registry.

## 12. What `check` refuses, each naming its files

`check` keeps its drift rule after a mount is written by hand: `generated/` must be what the blueprint gives, so a
hand-made mount is followed by `ortho generate` before `ortho check` passes (`ortho add` says so in its next steps).
A problem found in a plugin's own files names its package path and is prefixed with the mount file that brought it in.

Two things with one name (app and plugin, or two plugins); two refusals with one name; two things with one code
prefix; a plugin thing using `AR`, reserved for the runtime; one descriptor mounted twice; a mount name that isn't
lowercase words with dashes; an unmet need; an option of another plugin or two options of one choice; `omit` or
`narrow` of an operation that isn't the plugin's; an empty `via`; two error classes with one tag in an operation's
union; a server operation whose handler module is missing. Each message names the app file and the package path.

## 13. K5, folded in

- **Seams.** A plugin's things and operations are an app's things and operations: every seam K5 draws for an operation
  (decode, role, span, request key, machine, steps, answer, commit) is the same wrapper, so a plugin gets each for free.
- **`emits:`** (Q5, M3.16) and **optional steps** (`Blueprint.step.<kind>({ optional: true })`, M1.26) are fields of an
  operation, read by the same layout reader, so the descriptor neither blocks nor duplicates them.
- **Stores** (K3, M1.17): a feature's `blueprint/stores/` folder is read by the same reader, and its stores are named by
  the mount, as its things are.
- **The SDK contract** (seam 5, M1.12) and **actions** (M1.22) see plugin operations like the app's.

## 14. Which check proves which slice

| Check (`e2e/m1`) | Proves | Slice |
|---|---|---|
| `00` controls | the fixture packs and installs for real; a project with no mounts generates as before and proves its nine evals | M1.02 |
| `01` mounting | a mount by hand (M1.06) and through one `ortho add feature` (M1.10): names, provenance, files, refusals | M1.06, M1.10 |
| `02` runtime and closures | SDK, HTTP and a first MCP call answer from the plugin's handler in workerd; prove runs its journey; closures | M1.09 |
| `03`, `04` adapters | adapter mounts, `step.call`, D4 section 3's Promise and Effect semantics | M1.14 |
| `05` graph | edges, `feature:` keys, staleness by pick and by bytes, fails closed, order-stable | M1.08 |
| `06` collisions and needs | every refusal in section 12, and needs met or refused by name | M1.08 |
| `07` descriptors | the three descriptors type-check; a wrong field fails to compile | M1.05 |
| `08` verbs | choose, narrow and omit change the model and `generated/` as section 3 says | M1.07 |

All new world and HTTP work in `e2e/m1` uses ports 19260 to 19279.

## 15. The ledger

Closed or folded by this record: PLU-02 (the descriptor decisions), PLU-15 (kit words superseded), X-10 (projection
package names: the projections Orthograph ships are one package, `@orthograph/projections`, exporting `server`, `api`,
`sdk`, `cli`, `mcp`, `docs` and `portal`, so `@orthograph/cli` stays the command's package; a third party's projection
is its own package), X-11 (no narrowing by roles), CMD-19 and X-02 for `add` (three days), ENV-22
(choices fixed at mount time). Given owners: settings in the model and runtime (new, for the conductor to place), mounting
one plugin twice (`later.md`), exports and `step.use` with `used-by` edges (M1.14), FEA-08 and G-15's `atLeast` (M4),
PLU-13's "an app operation calls an omitted one" (M1.14, when app operations can reach plugin ones).

## Builder-edited checks, audited (author, 18 November 2026)

M1.03's builder (PR #64, commit 9f8cebb) edited four checks: `e2e/m1/01-mounting.test.ts`, `03-adapter-mounting.test.ts`, `support.ts` and `README.md`. AGENTS.md doesn't allow that. A ✍️ author who wrote none of the code audited each hunk against section 7 here, [M1-model.md](M1-model.md) and M1.03's row in `milestones.md`:

- **`support.ts`**: `from` is now required, and is `{ kind: "app" }` or `{ kind: "feature" | "adapter", mount, package, version, thing }`. This is the union change itself. Accept as authored.
- **`03-adapter-mounting.test.ts`**: an app operation's `from` was `toBeUndefined()` and is now `toEqual({ kind: "app" })`. The mechanical change. Accept as authored. The assertion sits after the `probe.quote` scaffold, which needs M1.14's code, so it does not run on #64's head; it is correct by reading.
- **`01-mounting.test.ts`**: the two `toEqual` on a mounted thing's and operation's `from` gain `kind: "feature"`, and `before` operations expect `{ kind: "app" }`. Mechanical. The builder also added four assertions that the union change did not require: `echo.shout`'s `from`, `fixture-echo`'s thing `from` (renamed mount), each app thing's `from` is `{ kind: "app" }`, and each app thing is `toEqual` to its pre-mount record. Each one makes the check stricter and follows the row ("every thing and operation") and M1-model.md; none removes or loosens a case. Accept as authored.
- **`README.md`**: assumption 3 now states the union, as M1-model.md does. Accept as authored.

Both edited tests in `01` fail on the code before M1.03 (`c75bbb6^`, with these check files laid over it) and pass on #64's head. In `01` all 16 tests pass on the head. In `03`, 7 of 8 fail on the head at an earlier line (`can't load blueprint/things/probe/verbs/quote.ts`, M1.14's code), none at an edited assertion.

The author found no weakened assertion, removed case or expectation fitted to the builder's code. Verdict: accept as authored; no check was rewritten. One note outside the checks: the same commit range reworded section 7 above ("keeps its model and its generated/ byte for byte" became "adds no mount metadata"). `00-controls` still asserts the narrower claim, that installing fixtures changes nothing for a project that mounts nothing, and it passes. Gate item 2 in `milestones.md` (acme's `generated/` the same as before, byte for byte) cannot hold for `generated/model/model.json` once M1.03 adds `from` and the journeys; no check compares against pre-M1 bytes. The lead should reword that gate item.
