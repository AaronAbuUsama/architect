# Questions for Aaron: the model, the loops, the map

Section 7 of [`README.md`](README.md), kept apart for length. Five forks; each one changes what gets built next. Line
numbers are at `origin/goal/stage-1` `06097ecf`, as in the README.

**Terms used in every question.**

- **core**: the packages every Orthograph app needs, released together.
- **standard library**: plugins Orthograph ships that an app chooses to mount.
- **ours**: plugins only Capxul needs.
- **extract**: move code from an app into a plugin package, then mount it back.
- **ledger**: the file the last full prove wrote, which `ortho impact` reads.

Core, standard library and ours are this draft's working words for buckets, not canon words. The canon's words are the
plugin kinds: feature, adapter and projection (`docs/canon/outline.md`, layer 1).

### Q1 — Where does the core end?

**The problem, in code.** The client projections are still built into the generators, while model, API and server are
already plugins. Until we decide whether the SDK, CLI, MCP, docs and portal are core or standard library, nobody knows
which package they move to, or whether an app may leave one out.

```ts
// packages/generators/src/modules/render/service.ts:20-26
return [
  ...made.flat(),                          // model, api, server: mounted projections
  ...docs,
  ...PortalRender.files({ name, model, docs }),
  ...renderMcp(served),
  ...renderSdk(model, name),
  ...renderCli(model, name),
```

If nobody decides, each projection slice picks its own home, and the core keeps growing by accident.

**What it touches**

| Dependent | Why it cares |
|---|---|
| the clients' move (M3.22) | the SDK, CLI and MCP move from the generators into `@orthograph/projections`; this decides whether that is core or standard library |
| docs and the portal (M1.13, M3.21) | the portal as a viewer now, its faces later; both need a home |
| `packages/projections` | where those projections land |
| the repo split (Q2) | the core's edge is the split's edge |
| HeroUI Pro's licence | the portal needs it; a core that needs a paid licence can't be open |

**The options**

**Today** — every app gets every output, whether mounted or not (`render/service.ts:22-26` above).

**A · Core is model, API and server; every client is a standard projection** (recommended)
```ts
// blueprint/projections/cli.ts: an app that wants a CLI mounts one
import { Blueprint } from "orthograph";
import { cli } from "@orthograph/projections";
export default Blueprint.use(cli);
```

**B · Core is everything in `packages/` today**
```ts
// nothing to mount: every app keeps every output, as today
```

**C · Core is the API and compiler only; even the server is a plugin**
```ts
// blueprint/projections/server.ts must name a host plugin before anything runs
export default Blueprint.use(server, (s) => [s.choose(s.choices.host.cloudflare)]);
```

**You do X → what happens**

| Scenario | A · core is model, API and server | B · everything | C · API only |
|---|---|---|---|
| A back-office app wants no MCP | delete one mount file | can't | delete one mount file |
| Someone without HeroUI Pro builds an app | works; the portal is a mount they leave out | the build needs the licence | works |
| A first app, made from the starter | the template mounts the usual five; no difference felt | no difference | one more choice before it runs |
| A third party ships a Python SDK | a projection like ours | a framework change | a projection like ours |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ the pattern is built for three already | ✅ nothing to do | ⚠️ more to move before value |
| Reversibility | ✅ a mount can be made default again | ⚠️ hard to take things out later | ✅ |
| Blast radius | ⚠️ generators and the starter | ✅ none | ❌ every example |
| Correctness | ✅ outputs only where mounted | ❌ an unmounted MCP still serves | ✅ |
| Fit | ✅ `design/frame/projections.md` already says this | ❌ against the frame | ⚠️ one host only, today |

**Recommendation: A.** It carries the pattern built for model, API and server (M1.11) over to the clients when they move (M3.22), and keeps a paid licence out of the core.

### Q2 — How should the repositories split?

**The problem, in code.** Capxul has its own blueprint and generator, not Orthograph's. Its hats, budgets and Safe
overlap with Plugged In's stage 3 plugins.

```ts
// capxul-next, packages/core/src/handlers.ts:2 (read only): Capxul's own registry, one file per domain
// "A new domain is one import here and one entry in each group it serves"
```

If nobody decides, Capxul's plugins get written twice: once for stage 3 here and once in Capxul.

**What it touches**

| Dependent | Why it cares |
|---|---|
| stage 3 (`design/milestones.md`) | it plans the Safe, budgets and hats plugins |
| M7's npm release | each repository publishes on its own schedule |
| Nx module boundaries | the bucket lines become tags or repository walls |
| CI | one repository's CI or three |

**The options**

**Today** — one repository, `architect`, with everything; Capxul separate and not on Orthograph.

**A · Two repositories: Orthograph (core and standard library), Capxul (app and its own plugins)** (recommended)
```bash
orthograph/packages/{orthograph,compiler,…}   # tag scope:core
orthograph/packages/{wallets,safe,budgets,…}   # tag scope:stdlib
capxul/plugins/{approvals,bench}               # ours; mounted from capxul/blueprint/features/
```

**B · Three repositories now**
```bash
orthograph/   orthograph-plugins/   capxul/
```

**C · Everything in one repository, Capxul included**
```bash
architect/examples/capxul/   architect/plugins/capxul-*/
```

**You do X → what happens**

| Scenario | A · two | B · three | C · one |
|---|---|---|---|
| Change the compiler and a plugin together | one pull request | two, released in order | one |
| Capxul pins an older Orthograph | yes, from the registry | yes | no: always the same commit |
| Budgets proves generic in Capxul | move it to `orthograph/packages/` | move it to the plugins repo | rename a folder |
| Open-source the framework, keep Capxul private | yes | yes | no |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ one new repository, the one Capxul already has | ⚠️ a new repo before any plugin exists | ✅ nothing to make |
| Reversibility | ✅ the standard library can split out later | ⚠️ merging repos back is costly | ❌ Capxul's history entangled |
| Blast radius | ✅ Capxul only | ⚠️ every stdlib package moves | ⚠️ the repo's CI grows |
| Correctness | ✅ Capxul consumes Orthograph as anyone would | ✅ | ❌ never proves the published path |
| Fit | ✅ matches "built once, mounted anywhere" | ⚠️ | ❌ |

**Recommendation: A.** Capxul is then the first real outside user, which is the test the framework needs.

### Q3 — How does "declare what you know" work?

**The problem, in code.** Every piece is its own command, and each writes blanks for what you already knew.

```ts
// packages/cli/src/main.ts:187-189
const add = Command.make("add").pipe(
  Command.withSubcommands([addOne("thing"), addOne("operation"), addOne("read"), addOne("journey"), addJourneys, …]),
```

If nobody decides, every new app starts with four or more commands and a round of hand edits, and agents learn the commands
instead of the blueprint.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `packages/cli/src/modules/add/` | where the change lands |
| the generated skills (`design/frame/skills.md`, "Describe") | they would call it |
| `ortho add journeys` | it needs the machine filled to write good stubs |

**The options**

**Today** — four commands, then hand edits.
```bash
ortho add thing handle
ortho add operation handle.claim
ortho add operation handle.release
ortho add operation handle.resolve
# then edit machine.ts by hand: states are a blank
```

**A · Say it on `ortho add thing`; blanks only where you said nothing** (recommended)
```bash
ortho add thing handle --states claimed,released --verbs claim,release,resolve
# writes the thing, a machine with both states and a move per verb, three operations, blanks for the rest
```

**B · Agents write `blueprint/` directly; `ortho check` names the blanks**
```bash
# no command: a skill tells the agent which files to write
ortho check   # blanks ✘ 7 …
```

**C · A new "describe the app" file the CLI expands**
```jsonc
// a new file kind: { "handle": { "states": ["claimed","released"], "verbs": ["claim","release"] } }
```

**You do X → what happens**

| Scenario | A · flags on add | B · write directly | C · a describe file |
|---|---|---|---|
| A person knows the states and verbs | one command | write six files by hand | write one file, then run |
| An agent declares a thing | one command, nothing to get wrong | it may mis-shape a file; check catches it | one file |
| Later you add a verb | `ortho add operation`, as today | edit by hand | edit the file, rerun: does it overwrite yours? |
| A new word to learn | none | none | a new file kind |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ small change to a built module | ✅ nothing to build | ⚠️ a new format |
| Reversibility | ✅ flags can go | ✅ | ⚠️ files to migrate |
| Blast radius | ✅ one module | ✅ skills only | ⚠️ the CLI and docs |
| Correctness | ✅ same templates, fewer blanks | ⚠️ shape errors found late | ❌ two sources of truth |
| Fit | ✅ writes once, never overwrites, as `add` does | ✅ | ❌ against "the blueprint is the description" |

**Recommendation: A.** It keeps one source of truth and removes most of the friction.

### Q4 — When does an app's code graduate to a plugin?

**The problem, in code.** The starter's identity code is copied into every new project, so the second user exists
already. Plugged In's `handle` has one user.

```ts
// examples/plugged-in/blueprint/things/handle/thing.ts:7-8
// The person is Better Auth's (M2): the project refers to them by id, as acme's organisation does.
fields: { id: Blueprint.id("hdl"), name: HandleName, owner: Blueprint.id("per") },
```

If nobody decides, either we extract too early (against Aaron's rule) or code is copied into each new app and drifts.

**What it touches**

| Dependent | Why it cares |
|---|---|
| M2.05 and M2.07 | auth and organisations as plugins |
| ST1.03 | handles as a plugin |
| Capxul's pieces | which become standard library, which stay ours |

**The options**

**Today** — the plan extracts auth, organisations and handles in M2 and stage 1, before a second app uses handles.

**A · Extract at the second real user, or when the starter copies it** (recommended)
```text
auth, organisations: extract now (every new app gets a copy: that is the second user)
handles:             stays in Plugged In until Capxul or a second app needs a public name
budgets, hats, Safe: built in Capxul or stage 3 first; extracted when the other one needs them
```

**B · Extract at each stage gate**
```text
stage 1 gate: handles, auth, organisations; stage 3 gate: Safe, budgets, hats
```

**C · Build as plugins from the start**
```bash
ortho new feature budgets   # before any app uses it
```

**You do X → what happens**

| Scenario | A · second user | B · stage gate | C · plugin first |
|---|---|---|---|
| Handles in stage 1 | stays app code; ST1.03 waits | extracted, one user | a plugin before Plugged In uses it |
| A bug in sign-in after ten apps | fixed once, upgraded everywhere | fixed once | fixed once |
| A plugin's API is wrong | found by its first user before it is a plugin | found after | found after |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ auth now, the rest when needed | ⚠️ extracts on a calendar | ❌ speculative |
| Reversibility | ✅ | ✅ | ⚠️ a published API to keep |
| Blast radius | ✅ small | ⚠️ | ⚠️ |
| Correctness | ✅ shaped by real use | ⚠️ | ❌ |
| Fit | ✅ Aaron's rule | ⚠️ | ❌ against Aaron's rule |

**Recommendation: A.** It moves ST1.03 (handles) off the stage 1 path and keeps auth and organisations on it.

### Q5 — Should Orthograph's staleness feed CI?

**The problem, in code.** CI decides what to run from file paths only; impact knows per operation, but its ledger is
never in CI.

```bash
# tools/ci/docs-only.sh:24-26
case "$file" in
  design/*) ;;
  packages/* | e2e/* | examples/*) docs_only=false ;;
```

If nobody decides, CI keeps proving everything on every push, and users' own CI will copy that.

**What it touches**

| Dependent | Why it cares |
|---|---|
| `design/decisions/CI-speed.md` | it rejected `nx affected` for hidden inputs |
| `packages/generators` | it is already the Nx plugin, so it could tell Nx the inputs |
| the logbook | it holds verdicts CI signed, by revision |
| apps built on Orthograph | their CI is the product |

**The options**

**Today** — everything runs, in shards; only docs-only pull requests skip.

**A · Tell Nx the truth first: the hidden inputs, from the generators' Nx plugin** (recommended)
```jsonc
// nx.json, the prove project's test target
"inputs": ["default", "{workspaceRoot}/examples/acme/**/*", "{workspaceRoot}/examples/starter/**/*"]
// later: the Nx plugin adds each example's model-derived inputs, so `nx affected` is honest
```

**B · CI asks the logbook what is proven at the base, and proves only the stale**
```bash
# needs what doesn't exist yet: a JSON output from impact, the ledger in CI (from the logbook),
# and the journeys each stale operation appears in. `--only` takes one journey, so it loops.
ortho impact --json > stale.json
for j in $(jq -r '.journeys[]' stale.json); do ortho prove --only "$j"; done
```

**C · Keep running everything; add shards**
```bash
pnpm nx run prove:test -- --shard=1/6
```

**You do X → what happens**

| Scenario | A · honest Nx inputs | B · prove only the stale | C · more shards |
|---|---|---|---|
| Change a doc comment in `compiler` | compiler's dependents rerun | every app operation using it reruns | everything reruns |
| Change one handler in acme | prove's tests rerun, not portal-ui's | one operation reproves | everything reruns |
| Impact has a bug | a test may skip that should have run | a proof is skipped silently | nothing skipped |
| An app author's own CI | unchanged | could get a new way to prove only what is stale: the product | unchanged |

**Rubric**

| Axis | A | B | C |
|---|---|---|---|
| Floor-first | ✅ a config change, measurable now | ⚠️ needs JSON output, a ledger in CI | ✅ |
| Reversibility | ✅ | ✅ | ✅ |
| Blast radius | ✅ `nx.json` | ⚠️ prove, CI, logbook | ✅ |
| Correctness | ✅ once inputs are complete | ⚠️ a skipped proof weakens the gate | ✅ |
| Fit | ✅ answers CI-speed's own objection | ✅ the frame's promise | ⚠️ costs grow with the code |

**Recommendation: A for our CI now; B as a feature for apps' CI**, after proving through the clients (M2.08), with a
full prove still on every push to a protected branch.

### At a glance

| # | Joint | Recommendation |
|---|---|---|
| Q1 | Where the core ends | A · model, API and server in the core; every client a standard projection |
| Q2 | Repository split | A · two: Orthograph (core and standard library), Capxul (app and its own) |
| Q3 | Declaring what you know | A · flags on `ortho add thing` for states and verbs |
| Q4 | When code becomes a plugin | A · at the second real user; auth now, handles later |
| Q5 | Staleness and CI | A now (honest Nx inputs); B later, for apps |

**Answer key.** Reply with one letter per question, for example `1A 2A 3A 4A 5A`, or name a letter and say what to
change.
