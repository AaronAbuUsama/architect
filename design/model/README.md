# What Orthograph is, and how to think in it

A draft for a working session between Aaron and the conductor, written 20 November 2026. It answers five questions: what
Orthograph is, how to think in it, what the loops look like, where the core ends, and how the repositories should split.
It ends with five decisions for Aaron.

Every claim carries a mark:

- **built**: in the code, with a `file:line` or the check that proves it. Line numbers are at `origin/goal/stage-1`,
  commit `06097ecf`, unless a line says `main`.
- **designed**: written down, not built, with the design file.
- **open**: nobody has decided it yet.

The words are the canon's (`docs/canon/outline.md`). Three working words sort packages into buckets: **core**, **standard
library** and **ours** (Capxul's own). They are not canon words; the canon's plugin kinds are feature, adapter and
projection.

## 1. What Orthograph is

Orthograph is a framework where you describe a system once and everything else falls out of that description. You write
the blueprint: the things your app keeps, the operations that change them, who may call each one, the machine each thing
moves through, the events and refusals, and the journeys that prove it works. Orthograph compiles that into one model,
then generates the server, the HTTP API, the SDK, the command line tool, the MCP tools, the docs and the portal from it.
The only code you write by hand is behaviour: a handler for each operation, inside a frame the blueprint generated, so
code that breaks the contract doesn't compile. Everything that runs is then judged against the description, by the same
names, and a change to the description marks exactly what it made stale (**designed** in `design/frame/README.md:34`;
most of it **built**, as the rest of this page shows).

### The layers of generation

Five layers, top to bottom. What flows down is the description. What flows back up is evidence.

| Layer | What it is | Where it lives | Who owns it | Mark |
|---|---|---|---|---|
| 1 · the blueprint | what you write: one declaration per file, its name from its path | `blueprint/`, plus `journeys/` | you | **built** |
| 2 · the model | the compiled blueprint: one JSON, every declaration with its hash and what it uses | `ortho model --json` (`packages/cli/src/main.ts:23`), written to `generated/model/model.json` | the compiler | **built** |
| 3 · generated | every output, rendered from the model on each generate, never edited | `generated/<output>/` | the model | **built** |
| 4 · scaffolded | written once, then yours: a handler per operation, a mount file | `src/<thing>/<verb>.ts`, `blueprint/projections/*.ts` | you, from then on | **built** |
| 5 · the running world | the project running for a purpose: `ortho dev`, a prove's world, `ortho env up` | local workerd, D1, Durable Objects | nobody: made and destroyed | **built** locally; staging and production are **designed** |

**What flows down.**

1. You write `blueprint/things/handle/verbs/claim.ts`.
2. `ortho generate` compiles it and writes the outputs. Each generated file opens with
   `// Generated from the blueprint. Do not edit.` (`examples/plugged-in/generated/sdk/src/handle/claim.ts:1`). It also
   scaffolds a handler once, for every operation of the app's own that has none
   (`packages/generators/src/modules/render/service.ts:28`). The handler opens with
   `// Scaffolded from blueprint/things/handle/verbs/claim.ts. Yours from now on.` and a header that explains the
   operation (`examples/plugged-in/src/handle/claim.ts:1-43`).
3. `ortho dev` or `ortho prove` runs it all in a world (`packages/cli/src/main.ts:37`, `:65`).

**What flows back up.**

1. **Drift.** `ortho check` fails if any file in `generated/` differs from what the model renders
   (`packages/cli/src/modules/check/service.ts:31`). That is how "never edited" holds. **built**
2. **Evidence.** Every call leaves spans, events and refusals named from the model (`handle.claim`,
   `handle.claim.record`). Journeys assert on them (`examples/plugged-in/journeys/claim-a-handle.ts:43`). **built**
3. **Verdicts and staleness.** A full prove writes a ledger of what each passing operation rested on
   (`packages/prove/src/modules/prove/service.ts:60`, written to `.ortho/evidence/proven.json` by
   `packages/prove/src/modules/impact/internal/ledger.ts:6`). `ortho impact` compares today's model and handler bodies
   with it and names each operation stale, proven or unproven (`packages/prove/src/modules/impact/service.ts:35-52`).
   **built**
4. **The portal.** Live calls during a prove feed the portal's metrics and traces
   (`packages/prove/src/modules/prove/service.ts:55`). **built**, but only during a prove (section 5).
5. **The scaffold growing with the blueprint.** When a declaration grows after you wrote a handler, the scaffold doesn't
   tell you (snag in `design/goals/03-snags.md:68-71`). **open**

## 2. The mental model

### The ideas you think in

Each idea is one plain sentence and the real file that declares it in Plugged In (`examples/plugged-in/`) or the
starter (`examples/starter/`).

| Idea | In one sentence | Declared in | Mark |
|---|---|---|---|
| **thing** | A noun with an id, fields and an owner of its state. | `examples/plugged-in/blueprint/things/handle/thing.ts:4` | **built** |
| **field** | One named part of a thing, made of a value. | same file, line 8 | **built** |
| **value** | A named field type that says what it is in every language. | `examples/plugged-in/blueprint/values/page.ts:3` (`HandleName`) | **built** |
| **machine and states** | A thing's states and the moves between them; a move from the wrong state is refused for you. | `examples/plugged-in/blueprint/things/handle/machine.ts:5-12` | **built** |
| **operation** | A verb on a thing: payload, answer, refusals, move, who may call, steps, budget. | `examples/plugged-in/blueprint/things/handle/verbs/claim.ts:6-16` | **built** |
| **read** | An operation that changes nothing and has no handler. | `examples/starter/blueprint/things/organization/verbs/get.ts:5` | **built** |
| **refusal** | A declared error with an exit code and a stable code (`HN-001`). | `examples/plugged-in/blueprint/things/handle/errors.ts:3` | **built** |
| **event** | What a move records, named `<Thing><PastTense>`. | `examples/plugged-in/blueprint/things/handle/events.ts:4` | **built** |
| **role** | Who may call, as a rule over one thing, or a built-in (`anyone`, `signedIn`). | `examples/plugged-in/blueprint/things/handle/roles.ts:5` | **built** |
| **rule** (invariant) | Something that must hold across records, such as "one holder per name". | today `unique:` on the thing (`handle/thing.ts:9`, **built**); its own declaration `Blueprint.invariant.unique` in `invariants.ts` is **designed** (`design/decisions/G5-invariants.md`, "The spelling") | built, then designed |
| **journey** | A story through real operations, played by a cast, that is the spec. | `examples/plugged-in/journeys/claim-a-handle.ts:14` | **built** |
| **starting world** | A named setup, made only by running operations. | `examples/plugged-in/blueprint/starting-worlds/claimed.ts:7` | **built** |
| **environment** | One file saying where the app runs, who signs in, and its database. | `examples/plugged-in/blueprint/environments/local.ts:3` | **built** |
| **mount** | One file that says "use this plugin here, like this". | `examples/plugged-in/blueprint/projections/server.ts:5` | **built** |

A rule today is half in the blueprint and half in the handler. The store holds the rule at commit, but the handler still
checks it and refuses by hand (`examples/plugged-in/src/handle/claim.ts:51-54`). The invariants decision moves the
refusal into the declaration so the handler stops writing it.

### How to think in Orthograph

1. **Declare what you know.** Write the things, the operations and, if you know them, the machine and the rules. Don't
   write what you don't know yet.
2. **Leave blanks for the agent.** A gap is a `Blueprint.todo("what goes here")`
   (`packages/orthograph/src/modules/blanks/service.ts:4`). It compiles, and `ortho check` names every one until it is
   filled (`packages/cli/src/modules/check/service.ts:21`). **built**
3. **Journeys are the spec.** A different agent from the builder writes them, and they fail on empty handlers before
   anyone builds (`AGENTS.md`, "Journeys and checks come first"; `ortho prove --empty`, `packages/cli/src/main.ts:71`).
   Building is hill climbing: run prove, fix the handler, run again, until every journey is green. **built**: Plugged
   In climbs all seven journeys, 56 of 56 steps (the demo, `demo-out/README.md`, "The climb").
4. **The grid is the guardrail.** Thirteen building blocks by nine outputs, 117 cards, each an eval
   (`design/grid/grid.json`, `design/decisions/K14-the-grid.md`). The climb proves the app works; the grid proves every
   output carries every building block. **built** as data and a check (`nx run e2e:grid`); most cards are not green yet.
5. **Outputs fall out.** You never write the SDK, the CLI, MCP or the docs. A change to the blueprint changes all of them
   (`packages/generators/src/modules/render/service.ts:20-29`). **built**

## 3. The loops

### The ideation loop: from an idea to a demo

1. **Name the idea in one sentence.** Plugged In's: "claim `@name`; a public page of links"
   (`design/milestones.md`, the stage table). **built** as a habit, no command.
2. **Declare the things.** `ortho add thing handle` writes six files: the thing, its machine, roles, events, errors and
   values, each gap a blank (`packages/cli/src/modules/add/internal/templates.ts:7-63`). **built**
3. **Declare the operations.** `ortho add operation handle.claim`, once per verb
   (`packages/cli/src/modules/add/internal/templates.ts:66`). **built**
4. **Maybe a machine and states.** Fill the blank in `machine.ts` by hand. **built**, no command.
5. **Maybe rules.** Today `unique:` on the thing; the invariant file is **designed** (G5).
6. **Journeys.** `ortho add journeys handle` writes a stub for every path through the machine, every role and every
   declared refusal (`packages/cli/src/main.ts:166`; `packages/cli/src/modules/add/README.md:7`). A journey author fills
   them in. **built**
7. **Check.** `ortho check` names blanks, type errors, lint findings and drift. **built**
8. **Climb.** `ortho generate`, then `ortho prove`, then fix handlers until green. **built**
9. **The portal.** The portal opens on the app's things and operations (M1 gate item 9). **built** locally; rough
   (section 5).
10. **The demo.** A person uses the generated CLI against `ortho dev` (`demo-out/02-app-session.txt`). **built**; no
    user screens (section 5).

**The friction in step 2 to 6.** "Declaring what I know" is four or more separate commands, and each writes blanks for
things you already knew. A thing with three verbs and a known machine is
`ortho add thing handle`, then `ortho add operation handle.claim`, `handle.release`, `handle.resolve`, then hand edits
to fill the states you knew all along:

```ts
// packages/cli/src/modules/add/internal/templates.ts:28-32, what `ortho add thing` writes into machine.ts
export const machine = Blueprint.machine(${T}, {
  states: Blueprint.todo("the states ${article(thing)} can be in, the first one where it starts"),
  moves: {},
  notFrom: { exit: 40 },
});
```

There is also a small split: `ortho add journey` writes to `blueprint/journeys/`
(`packages/cli/src/modules/add/internal/templates.ts:95`), while Plugged In keeps its journeys in `journeys/` at the
project root, and `ortho brief` reads both (`packages/cli/src/main.ts:274`). Question 3 asks how this should work.

### The dev loop: edit, check, prove, see what's stale

1. **Edit** a handler in `src/` or a declaration in `blueprint/`. **built**
2. **`ortho generate`** re-renders `generated/` and scaffolds any new handler. It prints each change, and marks a new
   scaffold "yours from now on" (`packages/cli/src/modules/generate/service.ts:22`). **built**
3. **`ortho check`**: blanks, types, rules, drift and ratchets (`packages/cli/src/modules/check/README.md:3-14`).
   **built**
4. **`ortho prove`**: a world, every journey, nine evals per operation, and a report with `--report`
   (`packages/cli/src/main.ts:65-75`). `--only <journey>` runs one. **built**
5. **`ortho impact`**: what this change made stale, from the ledger the last full prove wrote. Editing one handler makes
   only that operation stale (M1 gate item 3; `design/milestones.md`, M1.04 ✅). **built**, and local only: CI never
   reads it (section 5).
6. **See it.** `ortho dev` serves the app; the portal shows live calls only while a prove runs (section 5). **built**,
   partly.

### The extraction loop: from app code to a plugin

Aaron's rule: build a thing once inside an app, use it, then extract it. Here is the loop with the real candidate:
the starter's hand-written people, sessions, organisations and invitations.

**What the candidate looks like today.** The starter declares `person`, `session`, `api-key`, `organization`,
`membership` and `invitation` as its own things (`examples/starter/blueprint/things/`), with nine handlers in
`examples/starter/src/`, 153 lines in all. Sign-in calls the runtime's `Auth` service
(`examples/starter/src/session/sign-in.ts:3`), which is Better Auth inside the Cloudflare host
(`packages/host-cloudflare/src/modules/auth/README.md:3`). Every new project gets a copy, and from then on it is that
project's own code.

```ts
// examples/starter/blueprint/things/organization/thing.ts:4-7
export const Organization = Blueprint.thing({
  description: "A company or team that people belong to.",
  fields: { id: Blueprint.id("org"), name: Blueprint.text(), owner: Person.fields.id },
});
```

**The loop, step by step.**

1. **Find the seam.** Identity (person, session, api-key) and tenancy (organisation, membership, invitation) are two
   plugins, `@orthograph/auth` and `@orthograph/organizations` (**designed**: `design/milestones.md`, M2.05 and M2.07;
   `design/frame/mounting.md`, "Auth, mounted rather than copied").
2. **Make the package.** `ortho new feature auth` makes a package with its own `blueprint/`, `src/`, journeys, example
   app and world. **designed** (M2.10); **open** in shape (`design/milestones.md`, risk 7: "Workable rests on the least
   specified slice").
3. **Move the declarations and handlers in, unchanged.** The starter's journeys move with them (M2.02). **designed**
4. **Write the descriptor.** One `feature.ts`: its description, needs and choices. **built** as an API
   (`packages/orthograph/src/modules/plugins/service.ts:16`); wallets has one (`packages/wallets/feature.ts:4-7`).
5. **Prove it alone, in its own world and CI.** **designed** (M2.10).
6. **Publish it.** `ortho publish --local` today publishes an app's generated SDK and CLI, not a plugin
   (`packages/cli/src/modules/ship/README.md:13`). Publishing a plugin is **designed** (M2.10).
7. **Mount it with one file.** `ortho add feature @orthograph/auth` pins the version, refuses one under three days old,
   writes the mount and lists unmet needs (`packages/cli/src/modules/mounting/README.md:3-8`). **built**
8. **Delete the copy.** The starter keeps no `person/` or `organization/` folder (M2.07's done-when). **designed**

**What exists today.** Mounting is real: descriptors, the four verbs, needs and clashes are built and checked
(`design/milestones.md`, M1.07 and M1.08 ✅). `packages/wallets` is the one real feature plugin, with its own journeys
(`packages/wallets/blueprint/journeys/`). Three projections are real plugins: model, API and server
(`packages/projections/src/main.ts:4-6`).

**What doesn't.** No example app mounts a feature. Wallets is mounted only by tests: a fixture copy of it (`@fixture/wallets`) into a copy of acme, by hand
(`e2e/m1/09-wallet-journeys.test.ts:75`), and the package itself into a test project (`packages/prove/test/device-journeys.ts:65`). `ortho new feature`, a plugin's
own CI and publishing a plugin are M2.10. So the extraction loop has never been run end to end.

**The next candidate after auth** is already on the plan: `@orthograph/handles`, Plugged In's own `handle` thing made a
feature (**designed**: `design/milestones.md`, ST1.03). That one fits Aaron's rule exactly: it was built in the app first.

## 4. The framework map

### The core: the smallest Orthograph that is useful alone

The proposal (question 1 asks it): **the core is everything needed to go from a blueprint to a proved app on one
host, in one language, on this machine.** That is the `Blueprint` API, the compiler, the generators, the Effect
language, the Cloudflare host, prove with its evals, the `ortho` command and its lint rules. With only the core you can
write Plugged In, generate its server and API, and climb its journeys. That is **built** today.

### The extension points

| Kind | What it adds | Real plugins today | Built in today | Mark |
|---|---|---|---|---|
| **feature** | what else the system is: things, operations, handlers, journeys | `@orthograph/wallets` | auth (in the host and the starter) | **built** as a mount; one plugin |
| **adapter** | what is outside it: calls out, events in, a stand-in | none; fixtures only (`e2e/m1/03-adapter-mounting.test.ts`) | none | **built** as a descriptor (`packages/orthograph/src/modules/plugins/service.ts:17`) |
| **projection** | what it becomes | `model`, `api`, `server` (`packages/projections/src/main.ts:4-6`) | SDK, CLI, MCP, docs, portal: still fixed renderers (`packages/generators/src/modules/render/service.ts:22-26`) | **built** for three of eight |
| **language** | what behaviour is written in | `@orthograph/language-effect` | none | a package, not a mounted plugin; Solidity is a placeholder (`design/packages.md:28`) |
| **host** | where it runs | `@orthograph/host-cloudflare` | none | a package, not a mounted plugin |

Languages and hosts are packages chosen by the project's dependencies, not mounts (`design/packages.md:65-66`). Whether
they should ever be mounted is **open**.

### The standard library: what Orthograph ships for apps to mount

| Plugin | What it is | Mark |
|---|---|---|
| `@orthograph/auth` | people, sessions, API keys, the device flow, OAuth for MCP | **designed** (M2.05, M2.06); built today inside the host and the starter |
| `@orthograph/organizations` | organisations, memberships, invitations, `holds` | **designed** (M2.07); built today as starter copies |
| `@orthograph/handles` | a public name one person holds | **designed** (ST1.03); built today as Plugged In's own thing |
| `@orthograph/wallets` | keys on a device or a server: make, import, sign, send | **built** (`packages/wallets/README.md:3`) |
| `@orthograph/react` | one hook per operation and per read | **designed** (ST1.01) |
| the Safe, budgets and hats plugins | a multisig vault with budgets, for stage 3 | **designed** (`design/milestones.md`, stage 3) |
| `@orthograph/stripe`, `@orthograph/resend` | payments and email adapters | **designed** (M5) |
| `@orthograph/agents`, `@orthograph/work` | durable agents; the factory | **designed** (M3, M4) |

### Our own: Capxul's pieces

Capxul (`/Users/abuusama/projects/capxul-next`, read at `50851875`) is not built on Orthograph. It has its own blueprint
package and its own generator, with the same ideas by hand: a `things/<thing>/` folder per domain
(`packages/blueprint/src/things/`) and generated indexes (`packages/generate/README.md`). So moving Capxul onto
Orthograph means declaring it again, not mounting what is there.

| Capxul piece | What it does | Where | Kind once on Orthograph |
|---|---|---|---|
| identity | a caller acts as the world's owner or a named person; real sign-in waits for its phase 8 | `packages/blueprint/src/protocol/sign-in.ts:12` | mounts `@orthograph/auth` |
| hats | each role is a hat someone wears, on Hats Protocol; Frappe roles come from hats | `packages/core/src/organizations/grant.ts:29` | feature, needs Safe |
| budgets | a tree of USDC allowances, each tied to a hat | `packages/contracts/src/money/Budgets.sol:18` | feature, partly on chain |
| approvals | directors sign a proposal, then it goes out as a Safe transaction | `packages/core/src/approvals/sign.ts:37` | feature |
| payments | on-chain payments, then an ERPNext Payment Entry | `packages/core/src/approvals/payments.ts:33` | feature plus a bench adapter |
| Safe | builds and relays Safe transactions | `packages/core/src/chain/safe.ts:56` | adapter |
| Bridge | banking through Bridge accounts | no code; `docs/roadmap.md:59` | adapter, **open** |
| the Frappe bench | an ERPNext site per company, reached through a door | `packages/frappe-app/capxul/hooks.py`, `packages/core/src/site/SiteDoor.ts:58` | a source through an adapter (`design/decisions/K3-stores-and-sources.md`) |
| agents as users | an agent may act for a member, and may own a Safe | `packages/contracts/src/agents/AgentOwner.sol:89` | the `agent` principal (M2.03) and the agents feature (M4) |

One overlap matters. Plugged In's stage 3 plans a Safe with budgets and hats as plugins (`design/milestones.md`, stage
3). Those are Capxul's core pieces. So hats, budgets and the Safe adapter are likely standard library, not ours. What
stays ours is what only Capxul needs: approvals as its directors run them, payments into ERPNext, and the bench.

### A proposal for splitting repositories

Three buckets, two repositories now (question 2):

- **`orthograph`**: the core and the standard library, one monorepo, as today. Nx tags say which bucket each package is
  in, and lint holds the line: the core may not import the standard library.
- **`capxul`**: the app, plus its own plugins in `plugins/`, mounting Orthograph's packages from the registry.
- **Later, only if release pace differs:** the standard library in its own repository.

Every package in `packages/` today, by bucket:

| Package | Bucket | Why |
|---|---|---|
| `orthograph` | core | the front door: the `Blueprint` API; depends only on Effect |
| `compiler` | core | the blueprint to the model |
| `generators` | core | the Nx plugin that renders and scaffolds |
| `language-effect` | core | the one language, and the runtime generated code runs on |
| `host-cloudflare` | core | the one host; its auth module moves to the standard library (M2.05) |
| `prove` | core | worlds, journeys, evals, verdicts, impact |
| `cli` | core | the `ortho` command |
| `lint` | core | the rules types can't see |
| `logbook` | core | where verdicts and releases are kept |
| `preset` | core, for now | makes a new project until `ortho new` (M2.09) |
| `projections` | core, for now | model, API and server; question 1 asks whether the client projections join the standard library |
| `portal` | standard library | a projection by design (`design/frame/projections.md`, 3.8); built in today |
| `portal-ui` | standard library | the portal's components; the only importer of HeroUI Pro |
| `wallets` | standard library | the first feature plugin |
| `chain-evm` | standard library | the EVM chain port wallets is built on; not an Orthograph adapter plugin |
| `language-solidity` | standard library, later | a placeholder until on-chain work |
| `services` | neither: private | stand-ins for tests and gates; never published (`packages/services/README.md`) |

## 5. Rough edges that block the loops

Grouped by what they block. Sources are the snags file (`design/goals/03-snags.md`), the demo
(`.claude/worktrees/invariant-screens-c4a7f1/demo-out/README.md`, in another worktree, not in this repository, so each
fact used here is said in place) and CI.

**Starting an app.**

- Orthograph is not on public npm, so a new app needs a throwaway local registry and a publish first (demo, lines
  177-180).
- Every local publish is version 0.0.0, so caches must be kept per run or an old build installs (demo, 181-183).
- The preset's starter folder is git-ignored and filled only by a test, so a real release would ship it empty (demo,
  184-189).
- Creating an app needs `--trustThirdPartyPreset`, or Nx stops to ask (demo, 190-191).
- Plugged In's own README still says "declarations and empty handlers only" (`examples/plugged-in/README.md:3`), and
  the repository's `README.md` is empty, though `AGENTS.md` points to it for the goal.

**Using the app as a person.**

- Plugged In has no web pages: `/@aaron`, `/claim` and `/edit` answer 404 (demo, 172-174). The three screens are
  planned in ST1.04.
- Sign-in isn't mounted, so a live MCP call over HTTP is refused as `invalid_token`, and the OAuth discovery document
  is empty (demo, 166-171).

**Seeing it work.**

- `ortho dev` has no telemetry collector, so a person's session never shows in the portal; only a prove feeds live
  calls, for its twelve seconds (demo, 192-199).
- The portal needs the licensed HeroUI Pro to build its pages, and without a logbook running it shows no proof (demo,
  200-218).
- The portal is rough: navigation words run together, pages are bare tables, docs show raw markdown (demo, 210-213).

**Writing journeys and handlers.**

- A starting world serves one journey, and gives back only the last answer (snags, 42-51).
- A step can't compare with the answer before it, and no journey can send a malformed payload or reach the
  request-key conflict (snags, 53-66).
- A handler scaffold doesn't learn about declarations added after it was written (snags, 68-71).
- Machine states are written as strings (snags, 237-248); the planned fix is a generated constant per state.
- Prove prints about 400 lines, and `--only` still fails on coverage for the journeys it left out (snags, 217-220).

**Proving every client.** Journeys call the server over plain HTTP
(`packages/prove/src/modules/journeys/internal/world.ts:18`), so the SDK, the CLI and MCP are never proved by a
journey. Proving through each client is M2.08.

**CI, and what it knows about a change.**

- On `main`, CI runs lint, types and tests for every project, with prove's tests in three shards
  (`.github/workflows/ci.yml:37-67` on `main`). It decides what to skip only by asking "is this docs only?" from file
  paths (`tools/ci/docs-only.sh:17-30`).
- `goal/stage-1` isn't strict, because its jobs take up to 45 minutes (`design/decisions/CI-branch-protection.md:67`).
- The CI speed record rejected Nx's cache and `nx affected`, because prove's tests start `examples/acme` and the
  starter by path, and the project graph can't see that (`design/decisions/CI-speed.md:114-117` on `main`).

**The invalidation question.** Orthograph already knows, per operation, what a change makes stale: `ortho impact`
compares blueprint hashes, handler hashes and journey hashes against the last proof. Nx knows the project graph.
Today nothing connects them. CI never calls `ortho impact`, and the ledger impact reads lives in `.ortho/`, which is
git-ignored (`.gitignore:13`), so every CI prove starts from nothing and proves everything. Should one feed the other?
Question 5.

## 6. How we build

The process log (`design/process/log.md`, `patterns.md`, `proposals.md`) records the patterns that worked. They split
into two sets of skills.

### Skills for building Orthograph

1. **Checks before builds, by a different agent.** The author writes journeys and checks, they fail on empty handlers,
   and the builder never edits them; branches end in `-check` or `-build`, and CI holds the line
   (`design/process/patterns.md:161-220`). Covered by the `author` skill and `AGENTS.md`.
2. **Prove a check is fair by trying to fool it.** Pass it with a wrong output, once per way it reads; a second finding in
   the same family means rewrite the check, not patch it (`design/process/proposals.md:409-471`). In `author`.
3. **Probe every door.** A review lists every way a call reaches the code (HTTP, device, SDK, CLI, MCP, replay) and
   sends one probe through each (`design/process/proposals.md:27-60`). In `reviewer`.
4. **The ratchet.** A checked-in list of expected failures turns known red into a real gate; lines only come off
   (`design/process/patterns.md:104-113`). In `conductor`; the M1 list has 68 entries today
   (`e2e/m1/expected-failing.txt`).
5. **Parallel only when nothing is shared**, decision ids from one list (`design/process/patterns.md:72-91`). In
   `conductor` and `threads`.
6. **One way to supersede**, so a check finds leftover words (`design/process/patterns.md:190-205`). In `AGENTS.md`
   only: no skill.
7. **A fix reaches the branches where work runs**, because sessions read skills from their own checkout
   (`design/process/log.md:13`). In `conductor`.
8. **Leave the shared machine as you found it**: free ports, own folders, stop your own processes by PID
   (`design/process/patterns.md:123-140`). In `threads`.

### Skills for building on Orthograph

No skill is written for an app author yet; all of `.agents/skills/` is for building the framework. The patterns that
carry over, recast:

1. **Declare, then let check name the blanks.** (Section 2.)
2. **Walk each journey with a throwaway handler before building**, using only what a real handler can reach; this
   found the "is this name taken?" gap early (`design/process/log.md:466`).
3. **Climb**: prove after every handler change, and let the tool write the progress, not you
   (`design/process/log.md:139`). In no skill.
4. **Real services, never fakes**; a stand-in runs the same tests as the real thing
   (`design/process/patterns.md:261-273`). In `AGENTS.md` only.
5. **Quote facts from generated files**: codes, exits and totals come from `generated/`, never typed again
   (`design/process/patterns.md:243-259`).
6. **A design that says a path is clear shows one handler walking it** (`design/process/patterns.md:186-188`). No
   skill, no proposal yet.

The frame already designs this second set as generated skills, one per action (`design/frame/skills.md`, sections 3
and 6; `design/frame/generators.md`, section 3). None is built.

## 7. Questions for Aaron

Five forks, in [`questions.md`](questions.md), each in the grill format: the problem in code, what it touches, the
options as code, what happens in each, the rubric and a recommendation.

1. **Where does the core end?** Recommended: model, API and server are core; every client is a standard projection.
2. **How should the repositories split?** Recommended: two, Orthograph (core and standard library) and Capxul (the app
   and its own plugins).
3. **How does "declare what you know" work?** Recommended: say the states and verbs on `ortho add thing`.
4. **When does an app's code become a plugin?** Recommended: at its second real user; auth now, handles later.
5. **Should Orthograph's staleness feed CI?** Recommended: honest Nx inputs now; proving only what is stale later, as a
   feature for apps.
