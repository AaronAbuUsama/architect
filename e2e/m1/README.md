# M1 checks: the plugin path

Authored by the ✍️ Author for slice M1.02, from [`design/decisions/M1-plugins.md`](../../design/decisions/M1-plugins.md)
(the contract) and Codex's `layer/4:e2e/layer3/00` to `06` (the rigour), in the frame's words: a feature, an adapter or a
projection is mounted by one file; there are no kits, dependencies or retired package names. **A builder never edits anything
here or in `e2e/fixtures/m1`** (AGENTS.md, "Journeys and checks come first"). If a check is wrong, the lead says so in a
decision and a new author fixes it.

Run them with `nx run e2e:m1-checks` (`e2e:m1` runs them and, later, the rest of Gate M1: items 2 to 6 belong to other
slices), or one file: `pnpm exec vitest run --root e2e --config vitest.m1.config.ts m1/05`. Files run one at a time.

## The check map

| File | Slice | What it proves | On `main` |
|---|---|---|---|
| `00-controls` | M1.02 | the fixture plugins are real packed packages; a project that mounts nothing is untouched by them (model, `generated/` byte for byte, `ortho check`, nine evals each) | **all 7 pass**: controls, and they must keep passing |
| `01-mounting` | M1.06, M1.10 | a mount by hand: names, provenance, `mounts`, generated files, nothing in `src/`; through one `ortho add feature`: one file, header, pin, refusals | 16 tests, all red |
| `02-runtime-and-closures` | M1.09 | SDK, HTTP and a first MCP call answer from the plugin's handler in workerd; prove runs the feature's journey; closures on the real import graph; empty and defect handlers fail | 9 tests: 1 control passes (the planted Node entry is caught), 8 red |
| `03-adapter-mounting` | M1.14 | `ortho add adapter`, `include`, `Blueprint.step.call`, used-by edges, foreign code out of pure entries and clients | 8 tests, all red until M1.14 |
| `04-adapter-calls` | M1.14 | Promise and Effect semantics through a real HTTP hold/release server in a world; the one blank; defect against mapped refusal | 6 tests: 1 control passes (the held-request instrument), 5 red until M1.14 |
| `05-graph` | M1.08 | `impact` edges, `feature:<mount>` keys in `Compare`, staleness by pick and by installed bytes, fails closed, order-stable | 10 tests, all red |
| `06-collisions-and-needs` | M1.08 | every refusal of section 12, each after a successful control; needs met, unmet, and `when` | 16 tests, all red |
| `07-descriptors` | M1.05 | the three descriptors type-check; wrong field, missing description, another choice's option and a wrong `render` do not | 4 tests: 1 control passes (each negative case holds exactly one directive), 3 red |
| `08-verbs` | M1.07 | choose, narrow and omit change the model, `generated/`, HTTP and MCP; the refusals of `via: []` and a foreign operation; a skipped journey is named | 10 tests, all red |
| `09-wallet-journeys` | M1.28 | the wallet plugin's four journeys (one per host signer, `e2e/fixtures/m1/wallets/source/blueprint/journeys/`) fail on empty handlers, each naming its first step, none skipped; M1.29's copy is byte for byte; a tripwire for the chain (M1.30, M1.31) | 5 tests: 2 pass (shape, copy rule); the empty-handler control needs Docker; the stand-in as shipped is red until M1.27; the chain tripwire is red until M1.30 and M1.31 |

Ten controls pass on `main` and seventy-six tests are red, eighty-six in all.

A **control** passes today and keeps passing: it proves the instrument (the fixture, a closure check, a held-request
observation) or the non-regression (acme without mounts). A **readiness-red** test fails today because the framework
cannot yet do the thing, and its first failure is the unbuilt surface itself (`ortho add` has no `feature`;
`Blueprint.choice is not a function`; TypeScript: `Property 'feature' does not exist`), never a helper, a fixture build or a
timeout. Where a test starts by succeeding at something that already exists (`ortho model --json` on a valid mount) and
only then expects a refusal, the success comes first, so a refusal can't be an unrelated failure.

## Fixtures

`e2e/fixtures/m1/<kind>/{package.json,source/**,variants/<name>/**}`. `packages.ts` builds one for real: `tsc` declaration
emit and `esbuild` to `dist/`, `npm pack --offline`, the archive extracted into the project copy's `node_modules/@fixture/<kind>`
and the dependency written in its `package.json` (exact; a range with `pin: "range"`, for `ortho add` to pin). The
fixture is linked to the repository's `orthograph`, `@orthograph/language-effect` and `effect` to compile; the installed copy
resolves them from the project. Until M1.05 lands, `tsc` errors in a source file that uses the new surface
(`Blueprint.feature`, `choice`, `Mount` …) are expected and tolerated, and only those; any other error, and every error once
`Blueprint.feature` exists, fails the build.

| Package | Kind | What it is for |
|---|---|---|
| `@fixture/echo` | feature | thing `echo` (code `EC`), operations `repeat` and `shout`, a `style` choice (`plain`, `loud`) read by `Mount.picked`, a journey, node and browser code beside the handler |
| `@fixture/greet` | feature | `needs: [echo]`; variants `when` (a `Blueprint.need(echo, { when })`) and `name-clash-echo` |
| `@fixture/plain` | none | a library with no `orthograph` key |
| `@fixture/wallets` | feature | the stand-in for `@orthograph/wallets` (M1.28): thing `wallet`, five client operations, four journeys, empty `node`, `browser` and `world` entries; variant `server-run` (server handlers instead) |
| `@fixture/remote`, `effect-remote`, `node-remote` | adapter | a Promise callable over HTTP, an Effect callable with its own layer, a Node-only callable |

Echo's variants (overlays over `source/`; `REMOVE` lists files to delete): `empty-handler`, `defect-handler`,
`name-clash-thing`, `refusal-name-clash`, `code-prefix-clash`, `reserved-prefix`, `invalid-thing-folder`, `invalid-verb-name`,
`ambiguous-tags`, `no-handler`, `order-forward`, `order-reverse`. `e2e/fixtures/m1/descriptors` holds check 07's TypeScript
cases; `adapter-cases` holds check 04's planted runner.

## Ports

Check 00 to 08 use 19260 to 19279 and nothing else (`support.ts`, `PORTS`): 19260 control, 19261 sdk, 19262 mcp, 19263 loud,
19264 empty, 19265 defect, 19266 prove, 19267 narrow, 19268 omit, 19269 journey, 19270 promise, 19271 effect, 19272 mapper,
19275 the held-request service of check 04.

## Assumptions beyond M1-plugins

Where the contract is silent the checks go through the CLI, HTTP, files and the model JSON, and these readings:

1. The root export of an adapter is `dist/adapter.js` (a feature's is `dist/feature.js`, as section 1 says); an adapter's
   callable is the default export of `src/calls/<call>.js`; its error classes live in its own blueprint folder
   (`blueprint/things/pricing/errors.js`), not in a descriptor.
2. `mounts.<name>` has `kind`, `file`, `package`, `version`, `integrity` (`sha256-…`), `chosen`, `hash`, and `omitted`,
   `narrowed` (kept ways in, compared as a set) and `needs` (`["feature:echo"]`) where there are some.
3. Every thing and operation has a `from`. It is `{ kind: "app" }` for app declarations and
   `{ kind: "feature" | "adapter", mount, package, version, thing }` for mounted declarations.
4. `ortho add` prints `wrote <file>`, `pinned <pkg> <version> (local …)`, `needs none` on three lines in that order; the
   scaffold's first line contains `Scaffolded from <pkg> <version>. Yours from now on.`; an existing mount is refused with
   `<file> already exists`; `--dry-run` prints `would write <file>`; a package that is not installed is refused naming it and
   `pnpm add --save-exact <package>`.
5. Section 12's refusals come from `ortho check` (and the compiler under it); a missing handler module from
   `ortho generate`, as section 8 says (section 7 says the graph fails closed: both name the package). "Both files named" is
   the mount file plus the package path, plus the app's declaration where the clash is with the app.
6. `ortho impact` prints its edge lines first, sorted and unique, `<from> -> <to>  <relation>`; a mount that needs another
   is `feature:greet -> feature:echo  needs` (from the needer).
7. `via` on an operation and `narrowed` hold the way names `key`, `session`, `device`, `agent`; without `agent`, no MCP
   catalogue entry and the MCP door refuses the call.
8. A feature's journey asserts only what holds for every option (a journey runs for every pick), and names no span.
9. A journey that runs an omitted operation is reported with the word `skipped`, naming the operation, and prove still passes.
10. Adapters (checks 03 and 04), the weakest ground because M1.14 refines its own surface: the mount's default export has
    `calls`; the scaffold of an operation with a `Blueprint.step.call` wires the callable by the payload's field names and
    leaves exactly one `Handlers.blank(...)` for the error mapping, `(failure: unknown) => <error>`; a declared refusal is
    HTTP 422 with its name as `_tag`; a client that goes away while a held Promise call is outstanding does not make the
    Worker drop the raw wait. `standIn` is not exercised (its surface is unpinned).
