# Orthograph: the milestones

Written 17 November 2026, from [`frame/delta.md`](frame/delta.md) and the decisions in
[`decisions/K2-forman-frame.md`](decisions/K2-forman-frame.md). This replaces layers 3 to 5 of
[`build-plan.md`](build-plan.md), its decision steps D4 to D6, the work steps W1 to W3 and the agent track A0 to A9.
Layers 1 and 2 stay in the build plan as the record of what was built.

Aaron's intent: Orthograph is the only focus until it is **workable, at the end of M2**. From there, Capxul's plugins are
built on it, small and reusable, and Orthograph is refined by building them. The factory (M3) and agents (M4) make that
faster but don't gate it.

## What exists on `main`

- **Gate 1 and Gate 2 are green** (`build-plan.md` L1.60 and L2.11; Gate 2's final source passed Linux CI in run
  `44027211261`). Everything runs locally: no cloud.
- **Declare and call.** Things, machines, operations, roles, events, journeys and starting worlds in `blueprint/`; the
  compiler, the model, and the generated server, SDK, CLI, MCP, docs and portal (`packages/compiler`,
  `packages/generators`).
- **Prove and ship.** Worlds, journeys and nine evals; verdicts signed by CI into the logbook; versions from the model
  diff; `promote`, `publish` to Verdaccio and a local tap, and `watch` (`packages/prove`, `packages/logbook`).
- **Auth.** Better Auth on D1 inside `packages/host-cloudflare/src/modules/auth`: people, sessions, API keys, the
  device flow, OAuth for remote MCP. Organisations, memberships and invitations are copied into each project by the
  starter (`packages/preset`).
- **Examples.** `examples/acme` (the allowance) and `examples/work` (F5: 6 things, 26 operations, one blank). A fuller
  work app is on `spike/work-real`.
- **Codex's unmerged work** on `layer/4`: `D4.md` (kits and dependencies) and author checks `e2e/layer3/00` to `06`
  plus `99`, red for readiness, never green.
- **Not built anywhere:** plugins and mounts, adapters, the `agent`, `service` and `system` principals, secrets read by
  handlers, the agents feature (no `packages/agent`), the factory loop, a Solidity language beyond a placeholder, and
  any cloud destination.

## How a milestone works

The build plan's rules, unchanged except for names:

1. **One slice, one session.** A slice ends green: every existing check passes. It is proved by its *done when*, a
   command and its expected output. A slice that won't fit a session is split before it starts.
2. **Gates.** Each milestone ends in one e2e suite, `nx run e2e:m<n>`. Nothing in milestone n+1 starts until gate n
   passes on `main` from a clean checkout, locally and in CI. **After Gate M2 the order is by stage** ("v1.0: four
   stages" below, K9): a stage's slices may come from any milestone, and each stage ends in its own gate.
3. **Decisions just in time.** A decision slice sits right before the first slice that needs it and ends with a record
   in `design/decisions/`.
4. **Checks first.** A checks slice (journeys and checks) is written by a different agent from the builder, and fails
   on empty handlers before the build slices it judges start. Builders never edit it.
5. **One branch, one pull request.** A milestone runs on `m<n>`, one commit per slice, merged when CI is green, the gate
   passes and a 🔍 reviewer passed it. Ideas for later go in `later.md`.

Kinds: **decision**, **spike**, **checks**, **build**, **e2e**. ∥ marks a slice that may run beside the one before it.
Names below are today's, Orthograph's (K6, `naming.md`).

## v1.0: four stages

Aaron, 18 November 2026: one example grows through four stages, "each stage is a meta milestone. All of them is
v1.0" ([`decisions/K9-growing-example.md`](decisions/K9-growing-example.md)). The app is `links`, in
`examples/links`. The milestones below keep their slices and ids; this section says which slices each stage needs,
adds the slices no milestone had (ids `ST<stage>.<n>`), and gives each stage its gate. Each passing stage is tagged
`links/stage-<n>`.

**v1.0** is the four stage gates on `main`, plus the release: M7.01 to M7.04 and M7.06 (the cloud pass, the npm
release, the infra projection, a deploy and destroy that leaves nothing, real releases), each credential with Aaron's
written yes.

| Stage | A person can… | Needs from the milestones | Its own slices | Gate |
|---|---|---|---|---|
| 1 · links | claim `@name`; a public page of links | all of M1 and M2 | ST1.01 to ST1.08 | Gate M2 (M2.12) |
| 2 · wallets | create or link a wallet; be paid by handle | K7's wallet slices (M1.27 to M1.32, and M2.13 for linking), M6.01, M6.02, M6.07, M6.09, M6.15, M6.18, M5.01, M5.03 | ST2.01 to ST2.05 | ST2.06 |
| 3 · the vault | a Safe with the budgets plugin; hats with budgets; owners sign above a budget | M6.10 to M6.14, M6.16, M6.17, M3.01 to M3.03, M4.01 to M4.10, M4.16 | ST3.01 to ST3.07 | ST3.08 |
| 4 · the club | stage 3 on Aztec: private members, private spends, private ballots | (Later's Noir line, brought in) | ST4.01 to ST4.07 | ST4.08 |

**Beside the stages, off v1.0's path:** the factory (M3.04 to M3.14), the builder's tools and the bench (M4.11 to
M4.14), views, Stripe, Resend, adapters from OpenAPI, MariaDB and a second app (M5.05 to M5.09, M5.11, M5.13), the
`examples/workshop` (M6.20, dropped by K9), and Capxul (M7.07 to M7.11). They run when a thread is free; a stage
never waits on them.

**The gates of M3 to M6 no longer order the work.** Their suites still run, beside, once their slices exist. Where a
stage's slice `needs` one of those gates, a stage gate stands in:

| Slice | Its `needs` says | Read it as |
|---|---|---|
| M6.01 (stage 2's chain decision) | Gate M5 | Gate M2 |
| M5.01 (the decision M5.03 needs, for stage 2's follower events) | Gate M4 | Gate M2 |
| M3.01 (workflows, stage 3) | Gate M2 | Gate M2, unchanged |
| M4.01 (agents, stage 3) | Gate M3 | the stage 2 gate, ST2.06 |
| M7.01 (the cloud pass, v1.0's release) | Gate M6 | the stage 4 gate, ST4.08 |

Everything downstream of these five follows from them: M6.02 and the K7 wallet slices from M6.01, M5.03 from M5.01,
M3.02 and M3.03 from M3.01, M4.02 to M4.10 and M4.16 from M4.01, and M7.02 to M7.04 and M7.06 from M7.01. None of
them needs a factory, bench or M5 slice.

### Stage 1: links

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| ST1.01 ∥ | The react projection ([`frame/projections.md`](frame/projections.md) 3.4): `@orthograph/react`, one mutation hook per operation and one query hook per read, declared refusals as classes in the hook's error, `pending`, one `requestKey` per form open kept across retries; `--through react` replays a journey in headless Chromium, never jsdom | M1.12 | build | acme's `spend twice with one request` passes `--through react`; an overspend arrives as `AllowanceExceeded` with its code; the pending state is observed before the answer | M |
| ST1.02 | Journeys for `handles` and `links` at stage 1: claim, a taken name, one request twice, release, resolve; add, order and remove a link; a stranger can't edit; anyone reads a page | M1.10 | checks | they fail on empty handlers | M |
| ST1.03 | `@orthograph/handles`, a feature: handle, claim, release, resolve, `HandleTaken`, a `names` choice; mounted by `ortho add` | ST1.02 | build | the handles journeys pass with `examples/links` mounting it | M |
| ST1.04 | `examples/links` at stage 1 on auth copied from the starter: `profile`, `link`, their handlers, and three screens in `src/web/` (`/@name`, `/claim`, `/edit`) on the hooks, served by the Worker | ST1.01, ST1.03 | build | `ortho prove --root examples/links` is green; in Chromium a claim and a link show on `/@aaron` | M |
| ST1.05 ∥ | The host's caller for actions (K9, agent-native finding 4): a host key that acts as `agent for <person>`, named by email, for actions hosted outside our portal | M2.03, M1.22 | build | an agent-native-shaped host claims a handle for ada and the Worker's span says `agent for ada`; a `.notVia(Via.agent)` operation is refused | S |
| ST1.06 ∥ | Hooks behind a signed-in session (`Via.session`) | ST1.01, M2.06 | build | the links screens sign in and claim through the hooks with the auth plugin mounted | S |
| ST1.07 | `links` mounts auth: the copied identity deleted | M2.05, ST1.04 | build | `examples/links` has no `person/` or `session/` folder and proves green | S |
| ST1.08 ∥ | `examples/signup` deleted once the canon quotes `links` (the canon thread's change, K9); `e2e/layer1/08-*` moved onto `links`. A checks slice: it edits a gate's suite, so an author writes it, never the builder | ST1.04 | checks | no file outside the records names `examples/signup`; `e2e/layer1/08-*` proves `links` | S |

### Stage 2: wallets

The wallet's shape is K7's ([`decisions/K7-chain-languages.md`](decisions/K7-chain-languages.md), "The wallet plugin";
its forks F1 to F5 are working assumptions until Aaron answers them).

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| ST2.01 | Journeys for stage 2: create on the device, link your own, pay by handle, confirmed then corrected, an agent can't link | M6.02 | checks | they fail on empty handlers | M |
| ST2.02 ∥ | Adapters from an ABI (K7 Q2): `ortho new adapter --from-abi`, typed calls and events, a stand-in contract deployed into the world; the first is `erc20` over a test token | M1.30, M1.31 | build | the `erc20` adapter's transfer and `Transfer` event are typed; a revert decodes typed; conformance passes against the stand-in | M |
| ST2.03 ∥ | Hooks for client operations and chain submissions: the submission lifecycle as hook state (`simulated`, `submitted`, `included`, `confirmed`, `dropped`, `reverted`, `corrected`); the wallet's device half in the browser | ST1.01, M1.27, M6.15 | build | in Chromium a payment's hook passes through each state to `confirmed`; a reorg shows `corrected` | M |
| ST2.04 | `links` at stage 2: `/wallet`, Pay @name, `payment` kept from the follower's events through `on:` | ST2.01 to ST2.03, M2.13, M6.09, M5.03 | build | the stage 2 journeys pass | M |
| ST2.05 ∥ | The gates' fixture moves from acme to `links`; acme retired (its allowance kept in the history as the budgets feature's source). A checks slice: it rewrites the gates' suites, so an author writes it, never the builder | ST2.04 | checks | every gate suite runs on `links`; `examples/acme` is gone; Gates 1, 2, M0, M1 and M2 still pass | L |
| ST2.06 | **The stage 2 gate** | ST2.01 to ST2.04, and the stage's milestone slices | e2e | on Anvil: aaron creates a wallet, bob links his; bob pays `@aaron` 5 test tokens, simulated first; the page shows it once confirmed; a forced reorg corrects it; the key-hygiene check passes; an agent's link is refused. `links/stage-2` tagged | S |

### Stage 3: the vault

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| ST3.01 | A Safe, Hats Protocol and a module on Anvil: their releases pinned (R1), a module enabled on a Safe executing after a Hats read, the SafeTx signature format | ST2.02 | spike | `spikes/safe-hats-module/README.md` answers it with a run | S |
| ST3.02 | The budgets feature: a budget per hat and period, what lives in D1 and what on chain, signature collection as a workflow, an agent under its own hat | ST3.01, M6.01, M3.01 | decision | `decisions/ST3-budgets.md` written | S |
| ST3.03 | Journeys for stage 3 (the gate's list below), and the budgets machine's reference for the fuzz | ST3.02 | checks | they fail on empty handlers | M |
| ST3.04 ∥ | The `safe` and `hats` adapters from their ABIs | ST2.02, ST3.02 | build | a Safe's owners and threshold and a hat's wearer read typed from the world | M |
| ST3.05 | `@orthograph/budgets`: acme's allowance machine as a feature; its on-chain half one Solidity module generated by `language-solidity` and filled; the fuzz against the TypeScript machine | ST3.03, ST3.04, M6.13 | build | `forge test` passes on the module; fixed seeds show no divergence; within-budget spends execute from the Safe | L |
| ST3.06 | Owner signatures as a durable workflow: propose, collect each owner's signature, execute at the threshold, await the confirmed event | ST3.05, M3.03, M6.15 | build | a 2-of-3 spend executes once, even when the workflow's Durable Object is evicted mid-wait | M |
| ST3.07 | `links` at stage 3: `/@group`, hats, spend, pending; an agent spending under its own hat | ST3.06, M4.10, M4.16, M2.07 | build | the stage 3 journeys pass | M |
| ST3.08 | **The stage 3 gate** | ST3.01 to ST3.07, and the stage's milestone slices | e2e | on Anvil, `@workshop` has a 2-of-3 Safe with the module enabled: ada wears the spender hat at 100 a month and spends 20 alone; 500 waits for two owners and executes once across an eviction; a revoked hat refuses with `HatNotWorn`; ada's agent under its own 20 hat spends 20 and is refused 21; the fuzz finds no divergence. `links/stage-3` tagged | S |

### Stage 4: the club

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| ST4.01 | The budgets declaration in Noir on Aztec: a private budget note spent down, a private ballot with a public tally, in an in-process `proofs: "verified"` network (K7 Q7) | ST3.08 | spike | `spikes/aztec-club/README.md` answers it with a run, a tampered proof rejected | S |
| ST4.02 | `language-noir`, the `aztec` store kind, `chain-aztec` on the `ChainPort`, `proofs: "verified"` worlds, from K7's design | ST4.01 | decision | `decisions/ST4-aztec.md` written | S |
| ST4.03 | Journeys for the club | ST4.02 | checks | they fail on empty handlers | M |
| ST4.04 | `chain-aztec`, and Aztec in a world with proofs verified | ST4.02 | build | a world's Aztec network rejects a tampered proof and is gone when the world ends | M |
| ST4.05 | `language-noir`: private notes, one-use claims, enqueued public calls; the budgets feature's Aztec choice from the same declaration | ST4.04 | build | the budgets journeys pass on Aztec with `choose(onChain.aztec)` and no change to the declaration | L |
| ST4.06 ∥ | `@orthograph/ballots`: private ballots, one per member, public tally (K7's governance contract as a feature) | ST4.05 | build | a second ballot by one member is refused by its claim | M |
| ST4.07 | `links` at stage 4: `/@club`'s public footprint, the members' area, private spends and ballots; casting is `.notVia(Via.agent)` | ST4.05, ST4.06 | build | the club journeys pass; the portal shows nothing that names a member | M |
| ST4.08 | **The stage 4 gate** | ST4.01 to ST4.07 | e2e | in a verified world: three private members join; one spends 20 privately and the footprint shows the total, not the member; 500 passes by private ballot with a public tally; a second ballot is refused; a tampered proof is rejected. `links/stage-4` tagged | S |

## M0: Land and rename

**Goal.** One name and one vocabulary, with nothing broken.
**Ships.** The frame on `main`; `@orthograph/*` packages; the `ortho` command; the design docs rewritten around plugins
and [`frame/story.md`](frame/story.md).
**Gate.** `nx run e2e:m0` runs the Gate 1 and Gate 2 suites under the new names, plus a name check: none of the old names (the
package scope, the command, the variable prefix and the folder, listed in
[`decisions/M0-packages.md`](decisions/M0-packages.md) section 4) outside the records. "History" in this section means
the records listed in [`decisions/M0-packages.md`](decisions/M0-packages.md) section 5: `design/history/`, the decision,
evidence, brief, wayfinding, spike, Noir and state records, the layer 1 and 2 build plan, and `spikes/`.
**Goal file.** [`goals/02-m0-land-and-rename.md`](goals/02-m0-land-and-rename.md).

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M0.01 ✅ | The package map: each package's `@orthograph` name per K2 Q4 (front door `orthograph`; `language-effect`, `language-solidity`, `host-cloudflare`, `portal`; which internal packages ship inside the front door) | Gate 2 | decision | `decisions/M0-packages.md` written. **Proof:** [`decisions/M0-packages.md`](decisions/M0-packages.md) | S |
| M0.02 ✅ | Rename packages and imports; `target-*` becomes `language-*`; Nx tags follow | M0.01 | build | `nx run-many -t check test` green; `rg` finds the old package scope nowhere outside history. **Proof:** [`evidence/M0.02/`](evidence/M0.02/): 16 projects' lint, typecheck and test, `sync:check`, the scope search empty | M |
| M0.03 ✅ | The command, folders and variables: `ortho`, `.ortho/`, `ORTHO_*`; the config file renamed `ortho.config.ts` and its unread `outputs` removed (D3 #112) | M0.02 | build | `nx run e2e:layer1` and `e2e:layer2` pass, renamed. **Proof:** [`evidence/M0.03/`](evidence/M0.03/): Gate 1, 7 files, 19 passed and check 4's agent skipped for want of a key, as on any keyless run (D2 #41); Gate 2, 8 files, 10 passed | M |
| M0.04 ✅ | A lint rule against the old names | M0.03 | build | the rule fails on a planted import from the old package scope. **Proof:** [`evidence/M0.04/`](evidence/M0.04/): `ortho(no-old-names)` names the planted import and exits 1; the rule runs in this repository's own lint and in `ortho check` | S |
| M0.05 ∥ ✅ | Design docs rewritten: plugins instead of kits, the story as the spine; `build-plan.md` marked superseded from layer 3 | M0.01 | build | the docs build and their link check passes; "kit" (the word for a plugin) appears only in history. **Proof:** the docs are one page, [`docs/index.html`](docs/index.html), ported from Orthograph Docs ([`decisions/M0-build.md`](decisions/M0-build.md) #7 to #10); `nx run docs:check` ([`evidence/M0.05/`](evidence/M0.05/)); `build-plan.md` line 4 already points layers 3 to 5 here | M |
| M0.06 ✅ | **Gate M0** | M0.04, M0.05 | e2e | `nx run e2e:m0` passes on `main` | S |

**Gate M0 proof:** a clean clone of `m0` at `091cc86` passes the workspace check, `sync:check`, `docs:check` and `nx run e2e:m0` ([`evidence/M0.06/`](evidence/M0.06/)); CI runs the same on [#32](https://github.com/AaronAbuUsama/architect/pull/32) and on `main` (jobs `check`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`).

The npm org `@orthograph` is not needed until M7: every milestone before it publishes to the local Verdaccio.

## M1: The complete model and plugins

**Goal.** A plugin is a package mounted with one file, the model holds everything declared, and every verdict knows
exactly what it judged.
**Ships.** Plugin descriptors (`Blueprint.feature`, `Blueprint.adapter`, `Blueprint.projection`), mounts under
`blueprint/{features,adapters,projections}/`, the mount verbs (choose, include, narrow, omit), needs, choices and
settings, `ortho add`, adapter calls out as steps, stores (K3), the three trace fixes (O2), the projections re-homed as plugins,
and the first real plugin, `@orthograph/wallets`, on `@orthograph/chain-evm` with Anvil in worlds (K7 F4)
([`frame/mounting.md`](frame/mounting.md), [`frame/projections.md`](frame/projections.md)).
**Gate.** `nx run e2e:m1`: (1) Codex's checks `00` to `06`, renamed, pass: a fixture plugin mounted with one command,
its typed SDK and MCP answer, collisions are refused, the graph is whole; (2) acme with its projections mounted
generates the same `generated/` as before, byte for byte except header paths; (3) editing one handler makes only that
operation stale; (4) `ortho describe --json` lists acme's journeys, starting worlds, role rules and the work app's
blank; (5) a fixture feature brings its own store, and a call writing two stores is refused (K3); (6) a commit has its
own span, free text is absent from spans, and refused calls are counted (O2); (7) `acme wallet create && acme wallet send`
confirms on Anvil in a world, signed from the CLI and from a server-held key (K7 F4).

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M1.01 ✅ | The plugin descriptor, harvested from D4 sections 1 to 3 under the frame's words: three kinds, mount files named by path, the verbs, choices against settings, `Blueprint.need(x, { when })`, runtime entries per host | Gate M0 | decision | `decisions/M1-plugins.md` written. **Proof:** [`decisions/M1-plugins.md`](decisions/M1-plugins.md); goal file [`goals/03-m1-plugin-path.md`](goals/03-m1-plugin-path.md) | S |
| M1.02 ✅ | Port `layer/4:e2e/layer3/00` to `06` and their fixtures to `e2e/m1` in the new words | M1.01 | checks | they run and fail for the right reason on `main`. **Proof:** [`evidence/M1.02/`](evidence/M1.02/) holds each file's run on `main` (86 tests: `00` passes in full, three single controls pass in `02`, `04` and `07`, and the other 76 fail on the unbuilt surface: `ortho add feature` unknown, `Blueprint.choice`, `Blueprint.call` and `Via` not exported, `Property 'feature' does not exist`); the map, ports and assumptions are in [`e2e/m1/README.md`](../e2e/m1/README.md) | M |
| M1.03 ∥ | The complete model: journeys, starting worlds, role rules and operations with blanks (marked) are in it (`describe.ts:99`) | Gate M0 | build | `ortho describe --json` on acme and work lists them all | M |
| M1.04 ∥ | Verdicts keyed by the model's hash and each handler body's hash, one per operation per journey | M1.03 | build | editing `src/allowance/spend.ts` makes `ortho impact` name `allowance.spend` alone | M |
| M1.05 ✅ | The descriptors in `orthograph` (Effect-only, per the package rules) | M1.01 | build | a fixture feature, adapter and projection type-check; a wrong field fails to compile. **Proof:** [`evidence/M1.05/`](evidence/M1.05/): check `07` passes (a feature, an adapter and a projection type-check; a wrong field, an option of another choice and a projection without `render` fail to compile), `00` stays green, and `packages/orthograph/src/modules/plugins/plugins.test.ts` holds the same as type tests. `Mount.picked` and `Mount.under` are in `@orthograph/language-effect` | S |
| M1.06 ✅ | Mounts: the compiler reads the three folders, names from paths, folds each plugin's declarations into the model | M1.05 | build | check `01` passes. **Proof:** [`evidence/M1.06/`](evidence/M1.06/): check `01`'s five "mounted by hand" tests pass (the model folds echo in with `from` and a specifier `file`, `mounts.echo` has its integrity, pick and hash, generated code imports the plugin's declarations and handler from the package and `src/` gains nothing, a mount named `fixture` gives `fixture-echo`, and an invalid pick fails naming the mount file); `00` and `07` stay green. Its eleven `ortho add` tests are M1.10's | M |
| M1.07 ✅ | The verbs: choose, include, narrow, omit | M1.06 | build | a fixture narrowed and with one operation omitted generates without it. **Proof:** [`evidence/M1.07/`](evidence/M1.07/): check `08` passes 10/10. Omit leaves the model and `generated/` (only `mounts.echo.omitted` names it) and the world has no route for it; a journey's step that runs it is skipped and named while its other steps run; narrow records `via`, keeps HTTP and the SDK, and drops the MCP tool without `Via.agent`; two picks, an empty `via` and another plugin's operation are refused, naming the mount file. `00`, `01` by hand and `07` stay green. `include` is the adapters' verb: its descriptor surface is in M1.05 and its check is M1.14's (`03`, `04`) | M |
| M1.08 ✅ | Needs and collisions: needs resolved or refused by name; clashing names refused | M1.07 | build | checks `05` and `06` pass. **Proof:** [`evidence/M1.08/`](evidence/M1.08/): `05` and `06` pass 26/26. Needs are met by the mount of the descriptor (`needs: ["feature:echo"]`, `when` honoured) or refused with `ortho add feature <pkg>`; every clash (thing, refusal, code prefix, `AR`, ambiguous tags, bad names, a descriptor mounted twice, another plugin's option) is refused naming the mount file and the package path; a missing handler is refused at `generate` naming the operation, package and worker; `Compare` gains `feature:<mount>` keys and `ortho impact` prints `provides`/`needs` edges first; a changed pick or changed installed bytes stale only the mount's operations. Two decisions recorded in M1-plugins (codes follow declaration order; `check` keeps its drift rule) and the checks amended by an author to match. `00`, `01` by hand, `07` and `08` stay green | M |
| M1.09 ∥ | Runtime entries per host and import closures (`worker`, `node`) | M1.08 | build | check `02` passes | M |
| M1.10 | `ortho add feature\|adapter\|projection`: pins exactly (three-day rule, R1), writes the mount, offers needs | M1.08 | build | check `01` passes through one command | S |
| M1.11 | Projections as plugins, part one: model, api, server | M1.10 | build | acme mounts them; its `generated/server` is unchanged | L |
| M1.12 ∥ | Part two: sdk, cli, mcp, and the SDK contract ([`decisions/K5-the-whole-shape.md`](decisions/K5-the-whole-shape.md) seam 5): the caller on the client's layer, a stable `requestKey` across retries, declared refusals typed in the error channel, tool exposure from `allowed` and `via` | M1.11 | build | acme's generated clients unchanged apart from the new options; the CLI and MCP journeys still pass; a retried SDK call with one `requestKey` commits once | M |
| M1.13 ∥ | Part three: docs and the portal, our design (M1.25) on the pieces ported from agent-native (K5 seam 10): things and lifecycles first, drawn from the model; live evidence lights up the same structure | M1.03, M1.11, M1.21, M1.24, M1.25 | build | acme's docs unchanged; the portal opens on acme's things, and a journey's run lights up its operation and machine move | M |
| M1.14 ∥ | Adapter calls out: `Blueprint.step.call`, declared errors, the one mapping blank, a stand-in declared (D4 section 3) | M1.08 | build | checks `03` and `04` pass | M |
| M1.16 ∥ | `ortho prove --empty`: the journeys run against scaffolded handlers; each step that needs behaviour goes red, and one that passes is labelled "proved by the description" (S3) | Gate M0 | build | on acme, `revoke then spend` shows two red steps and one proved by the description | S |
| M1.17 ∥ | Stores ([`decisions/K3-stores-and-sources.md`](decisions/K3-stores-and-sources.md)): `Blueprint.store.<kind>()` under `blueprint/stores/`, `lives` takes a store or nothing for the default, kinds supplied by hosts (`database`, `actor`), `stores:` bindings typed in environments, one store per commit (cross-store writes refused), migrations per store, a feature's own stores named by its mount | M1.06 | build | acme unchanged; a fixture feature with its own store mounts beside acme's default and both migrate; an operation writing two stores fails to compile | M |
| M1.18 ∥ | The commit as a span ([`decisions/O2-trace-gaps.md`](decisions/O2-trace-gaps.md) gap 1): `<op>.commit` with `commit.writes`, `commit.entries`, `commit.outcome`, and `attempt` on the operation's span | Gate M0 | build | a forced conflict shows `attempt=2` after a `conflict` commit; a journey asserts `allowance.spend.commit` | S |
| M1.19 ∥ | Free text untraced unless marked (O2 gap 2): `Blueprint.traced(x)`; ids, amounts, enums, booleans and times traced when public | Gate M0 | build | `payload.memo` is absent from `spend`'s span; a traced text field is present; the "leaks nothing" eval passes | S |
| M1.20 ∥ | Every call counted (O2 gap 3): `ortho.calls` and `ortho.call.duration` through Effect `Metric` to OTLP; the local Collector gains a metrics pipeline | Gate M0 | build | a bad payload and a stranger show as two refusals in `ortho.calls`, with no spans | S |
| M1.21 ∥ | Live steps (K5 seam 10): a step signal as each step starts and ends, sent under `waitUntil`, not at dispose; committed events read from the journal for the portal | M1.18 | build | a slow handler's `load` step shows in the portal before the response; a committed event shows with its commit, a refused call shows none | S |
| M1.22 ∥ | The actions projection (K5 seam 5, corrected by K9 from `spikes/agent-native-compat/`): one module per operation exporting `options(host)` in agent-native's field names, never a `defineAction` call; `host` supplies the SDK client, the caller and `requestKey(ctx)`; `run` turns a declared refusal into the no-write `ActionRefusal` and redacts defects; no `retrySafe: true`; payload schemas through Effect's Standard Schema and Standard JSON Schema, optional fields as `optionalKey`; our portal wraps each with our `defineAction` | M1.12, M1.23 | build | an action's `run` refused by the role check returns the same typed refusal as the SDK; an operation `.notVia(Via.agent)` has no agent tool; a type test checks each generated `options(host)` against the field list and the no-write error's fields recorded from agent-native 0.228.2, with no agent-native package installed; every generated action advertises non-empty parameters | M |
| M1.23 ∥ | The port from agent-native, part one (K5, "Porting from agent-native"; K9): `defineAction` with agent-native's field names and approvals, in `orthograph`'s `actions` module, in Effect. Approvals live in the wrapper, never in `run`, so a host that asks first never asks twice. `ActionRefusal` carries `actionContractError`, `noWrite`, `errorCode`, `statusCode: 422` and `details`, the shape agent-native reads (K9) | M1.12 | build | a generated action refused by the role check writes nothing and returns the typed refusal; one with `needsApproval` waits for a yes; with approval already given by its host, `run` runs once and asks nothing | S |
| M1.24 ∥ | The port, part two: the shell, the chat's surface (thread, stream, tool-call cards, approvals, refusals) and screen context; threads as things in the portal's store; signed in through acme's own auth until M2.06. The agent behind the chat is M4.16 | M1.17, M1.23 | build | the shell and screen context run on acme's Worker over D1; a stored thread renders with its approval card; no `@agent-native/*` package is installed | L |
| M1.25 | The portal's design, with Aaron (UX.md's intent; agent-native's templates as the reference). Aaron asks to see UX before it is drawn, so this is his session by his rule, not a block | Gate M0 | decision | `design/portal.md` agreed: the first page, a thing's page, an operation's page, the live rail, the chat | M |
| M1.26 ∥ | The scaffold as a wired function (K5 seam 3): each declared step in declared order, the move, a stub per refusal, every hole a `Handlers.blank`; `Blueprint.step.<kind>({ optional: true })`, allowed absent by eval 6; `ortho check` warns on a non-optional step the handler never calls; `ortho prove` reports an optional step no journey ran both ways | Gate M0 | build | a fresh scaffold compiles and `ortho prove --empty` shows one red step per blank; a fixture with an unchanged edit that skips its optional `save` passes eval 6; a fixture whose journeys always run its optional step is reported as never exercised both ways; deleting `steps.record` from `spend` gives a check warning | M |
| M1.27 ∥ | Operations that run on the device (K7, ledger `LAH-02`, `G-10`): the compiler accepts `runs: "client"` (`describe.ts:108` refuses it today) for an operation whose plugin supplies `node`, `browser` and `world` entries, adding the `browser` and `world` host entries M1.09 doesn't cover; the generated client runs it in-process with its steps as spans | M1.09, M1.14 | build | a fixture plugin's client operation runs from the SDK and the CLI with no server call, and shows its steps in the portal; one missing its `browser` entry is refused | M |
| M1.28 | Journeys for the wallet plugin's first version (K7 F4), written by a different agent: create and import a key, list keys, sign, send on Anvil and see it confirmed, a doomed send refused before sending; one journey per host signer | M1.01 | checks | they fail on empty handlers | M |
| M1.29 | `@orthograph/wallets`, the first real plugin (was M6.03, L3.02): `create`, `import`, `keys`, `sign`, `send`; one `Signer` per host: `browser` (EIP-1193), `node` (encrypted keystore), `keystore` on a server (a server-held key; in M1 only a world-generated test key, real secrets come with M2.04 and the hygiene check with M6.18), `world` (test wallets); each wallet declares where its key lives (K7 F5); values are CAIP-10 accounts | M1.27, M1.28, M1.30, M1.31, M1.32 | build | `acme wallet create && acme wallet send` confirms on Anvil from the CLI, and from a server operation signing with a world-generated server key | M |
| M1.30 | The chain adapter `@orthograph/chain-evm` (was M6.05, L3.04): the per-family `ChainPort` (prepare, simulate, sign, submit, track), its transaction manager, nonces, viem error mapping and event streams vendored from `@prb/effect-evm` (MIT, notice kept), reshaped to our module shape with every wait through `Timers`; `ChainFault` typed; receipts as spans (K7) | M1.14 | build | a fixture ERC20 transfer on Anvil; a revert decodes typed; an empty revert arrives as `ChainFault`; a hand-written `viem` import outside `chain-evm` fails lint | M |
| M1.31 | Anvil in a world (was M6.06, L3.05): `Stand.process`, always `--silent`; a container in CI | M1.30 | build | a world's chain answers `eth_chainId` and is gone when the world ends; nothing it printed holds a key | M |
| M1.32 ∥ | Simulation, mandatory before every send (was M6.08, L3.07): plain `eth_call`, which works on Anvil (K7 Q5) | M1.30 | build | a reverting call returns its typed error and sends nothing; no SDK path sends without simulating | S |
| M1.15 | **Gate M1** | M1.02 to M1.14, M1.16 to M1.32 | e2e | `nx run e2e:m1` passes on `main` | S |

## M2: Auth and organizations (workable)

**Goal.** Auth stops being copied: identity and tenancy are two mounted plugins, every kind of caller exists, secrets
come from the plugins that need them, and journeys prove the clients people actually use.
**Ships.** `@orthograph/auth` and `@orthograph/organizations` (K2); principals `agent`, `service`, `system` and `Via`;
roles as rules with `holds`; secrets by declaration ([`frame/secrets.md`](frame/secrets.md)); `ortho new`;
`ortho new feature` with its own CI.
**Gate: workable.** `nx run e2e:m2`: (1) `npm create orthograph demo` scaffolds an app with auth and organizations
mounted and nothing copied, and `ortho prove --env local` is green; (2) a new `notes` feature is made with
`ortho new feature`, proved in its own world, published to the local registry, and mounted into acme and work with
`ortho add`, with every journey in all three still green; (3) the sign-up and sign-in journeys pass through the SDK,
the CLI and MCP; (4) no environment file names a secret by string; (5) the stage 1 check (K9): the scaffold is
`links` at stage 1, a person signs in, claims `aaron` and adds a link in headless Chromium, and a second claim is
refused with `HandleTaken` through the SDK, the CLI, MCP, an action and the hook.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M2.01 | The detail of principals and roles: `agent` acting for a person, `service(<mount>)`, `system`; `.via` and `.notVia`; what auth and organizations each own; how acme's copied things move; a plugin's own CI | Gate M1 | decision | `decisions/M2-auth.md` written | S |
| M2.02 | Journeys for both plugins, moved out of acme (sign up and in, an owner makes a key, invite and accept, an invitation used once, an outsider can't revoke) plus new ones: service and system refused where not allowed; an agent passes the owner rule unless `.notVia(Via.agent)` | M2.01 | checks | they fail on empty handlers | M |
| M2.03 | Principals in `roles/types.ts` (today `anonymous \| person`, lines 6 to 8) and the runtime; `issues:` per environment | M2.01 | build | the principal journeys pass in acme | M |
| M2.04 ∥ | Secrets by declaration: `Blueprint.secret`, names from mount and export, `Redacted` through the plugin's layer, `ortho secrets` and `secrets set` locally | M2.01 | build | acme's environments name no secret; prove passes | M |
| M2.05 | `@orthograph/auth`, identity: person, session, api-key; Better Auth behind its worker entry; `AUTH_SECRET` declared | M2.03, M2.04 | build | the identity journeys pass with acme mounting it | L |
| M2.06 | `@orthograph/auth`, ways in: the device flow, OAuth for MCP, the builder's sign-in to the portal (K5 seam 9), choices (`signIn`, `keys`), settings (`sessionLength`, `allowedOrigins`) | M2.05 | build | `acme login` and MCP sign-in journeys pass | M |
| M2.07 | `@orthograph/organizations`: organisation, membership, invitation, owner, member, `holds`, starting worlds `founded` and `invited`; acme's copies deleted | M2.05 | build | the tenancy journeys pass from the plugin; acme has no `organization/` folder | M |
| M2.08 ∥ | Journeys through the clients: a world runs steps through the SDK, with `--through cli\|mcp\|actions` (`journeys/internal/world.ts:85` calls HTTP directly today) | M2.05 | build | the auth journeys pass all three ways | M |
| M2.09 | `ortho new` replaces the Nx preset: the app it scaffolds is `links` at stage 1 (K9), with auth and handles mounted; `examples/starter` becomes that template | M2.07, ST1.07 | build | `npm create orthograph demo` from Verdaccio, then `ortho prove --env local` is green; the template's `blueprint/` and `src/` are identical to `examples/links`'s on the same commit; once `links/stage-1` is tagged (M2.12), the check compares against the tag | M |
| M2.10 | `ortho new feature`, a plugin's own world and CI, `ortho publish --local` for plugins | M2.07 | build | the `notes` feature goes from new to proved to published to mounted | M |
| M2.11 ∥ | The work app mounts auth and organizations | M2.07 | build | `ortho prove --root examples/work` passes with no copied identity | S |
| M2.13 ∥ | SIWE linking in the wallet plugin (was M6.04, L3.03): `challenge`, `complete`, `link`, `unlink`, `list`; agents never link (`notVia(Agent)`) | M2.05, M1.29 | build | `acme wallet link`, then `acme session show` lists the address; an agent's link is refused | M |
| M2.12 | **Gate M2: workable**, and the stage 1 gate (K9) | M2.02 to M2.11, M2.13, ST1.01 to ST1.08 | e2e | `nx run e2e:m2` passes on `main`; `examples/links` is tagged `links/stage-1` | S |

## M3: The factory, with people as workers

**Goal.** `@orthograph/work` takes a mission over a project, works out its tasks from the model and the facts, and lets
people and outside agents (Claude Code through the factory's CLI or MCP) work them. Only a fact closes a task.
**Ships.** The factory plugin ([`frame/examples/factory.md`](frame/examples/factory.md)); declared workflows on Effect's
Cloudflare engine; the logbook adapter; the generated agent kit ([`frame/generators.md`](frame/generators.md));
`ortho ci`.
**Gate.** `nx run e2e:m3`: a mission "allowances to production" over acme shows its derived tasks in their columns; a
person claims `build:allowance.revoke` with `work task claim`, pushes a branch, the local CI proves it and the verdict
closes the task; closing a task by hand is refused; evicting the manager's Durable Object mid-loop dispatches nothing
twice; `generated/agents/` passes its drift check.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M3.01 | `Blueprint.workflow`: its shape (activities, `await` on an event, durable clocks), where it lives, and the Effect and platform-cloudflare pins. Starts from K5 seam 6: an activity is keyed by run id and activity name; the workshop's publish is the example; settles wake-up, deduplication and replay, and settles where `emits:` on an operation with no machine sits beside workflows (K5 Q5, Aaron: "B, on the operation"; built in M3.16) | Gate M2 | decision | `decisions/M3-workflows.md` written | S |
| M3.02 | `effect` 4.1.1 to 4.1.3 everywhere, as its own slice | M3.01 | build | every existing gate still green | M |
| M3.03 | `CloudflareWorkflowEngine` under local workerd: does a replay after eviction skip finished activities? | M3.02 | spike | `spikes/effect-workflow-workerd/README.md` answers it with a run | S |
| M3.04 | Journeys for the factory (W1): its operations, and "derived, never stored", "only a fact closes", claims, attention | M3.01 | checks | they fail on empty handlers | M |
| M3.05 | `@orthograph/work` as a feature: the work blueprint moves into a package, mounted by `examples/work`; choice `workers: people` (agents comes in M4) | M3.04 | build | the work app proves with the plugin mounted | M |
| M3.06 | Its handlers (W2) | M3.05 | build | all but `mission.tasks` journeys pass | M |
| M3.07 | The logbook adapter, hand-written (S18): `facts.list` and the models per revision | M3.06 | build | a factory read returns acme's verdicts from a local logbook | S |
| M3.08 | Events in through `on:`, first for one adapter: `logbook.events.verdictRecorded` wakes `mission.notice` as `service(logbook)` | M3.07 | build | a posted verdict calls `mission.notice` once, even when posted twice | M |
| M3.09 | Tasks derived (W3): kinds `write:journey`, `build`, `fix`, `improve`, plus attention, from the model and the facts | M3.07 | build | a mission over acme shows the tasks `factory.md` lists, each in its column | M |
| M3.10 | The manager as a declared workflow, one per mission, waiting on durable deferreds and a daily clock (absorbs L5.04 for the factory) | M3.03, M3.08, M3.09 | build | killing its Durable Object mid-loop starts nothing twice | M |
| M3.11 | Claims for people and outside agents: `work task claim` writes the brief and a branch, over the CLI and MCP | M3.09 | build | a scripted claim, push and CI run closes the task by its verdict | M |
| M3.12 ∥ | **Parked** with the skills design (PR #37; K5). The `agents` projection, built on `builder`: skills, role definitions and rules under `generated/agents/`, neutral, Claude Code and Pi forms, the Markdown header (S8, S10 to S13) | M3.05 | build | a model change rewrites the kit; a hand edit fails the drift check | L |
| M3.13 ∥ | `ortho ci <stage>` and the short scaffolded workflow (S9) | M3.11 | build | `ortho new` projects run test worlds and verdicts through it | M |
| M3.14 ∥ | **Parked** (K5, Aaron's decision 2: no separate plans or factory surfaces). The portal's Work side: board, KPIs, attention | M3.09 | build | the board in the portal matches `work mission board` | M |
| M3.16 ∥ | `emits:` on an operation with no machine (K5 Q5): the event committed with the call's writes, only on success, and only when the call wrote | M3.01 | build | journeys assert `DraftEdited` present after a successful edit, absent after `DraftChanged`, and absent after an unchanged edit | S |
| M3.15 | **Gate M3** | M3.02 to M3.11, M3.13, M3.16 | e2e | `nx run e2e:m3` passes on `main` | S |

## M4: Agents, proved with the factory

**Goal.** `@orthograph/agents` runs agents durably, usable alone or as the factory's workers, joined by one optional need.
**Ships.** The agents feature ([`frame/examples/agents.md`](frame/examples/agents.md)); model adapters with a local
stand-in model; `Blueprint.agent`; the builder's code-mode tools and telemetry tools ([`frame/builder.md`](frame/builder.md));
the join, `workers: agents`.
**Gate.** `nx run e2e:m4`: (1) acme's support agent spends from Bob's allowance as an agent for Bob, and is refused on
an operation marked `.notVia(Via.agent)`; (2) evicting a run's Durable Object mid-turn resumes it with no second model
call; (3) a mission over acme with `workers: agents` runs: the manager starts builder runs from briefs, a builder using
only the generated kit and `bp` fills `allowance.revoke`, the verdict closes the task, and the promote waits for a
person; (4) the run's trace is read back through `bp.telemetry`. CI uses the local stand-in model (S14).

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M4.01 | H1 and H2 under the frame: the Run thing, where Pi runs (a Durable Object per run, Node for the bench), the local model server and model, pinned | Gate M3 | decision | `decisions/M4-agents.md` written | S |
| M4.02 | Journeys for the agents feature, prose then steps | M4.01 | checks | they fail on empty handlers | M |
| M4.03 | The floor (A0): the run record and folder, the trusted scorer, check 4 as the first runner | M4.01 | build | check 4 runs through the runner and writes a scored record | M |
| M4.04 | The Pi Durable seam on Node SQLite (A1) | M4.03 | build | a run survives a process kill and resumes its transcript | M |
| M4.05 ∥ | Model adapters: `@orthograph/anthropic` and an OpenAI-compatible adapter; keys as declared secrets (A2) | M4.04 | build | the same task runs on both behind one interface | M |
| M4.06 ∥ | The local stand-in model, `Stand.process` (S14) | M4.05 | build | journeys run against it with no key | M |
| M4.07 ∥ | Tools and skills: `toolsOf(operations)`, shared with MCP; project tools with denied paths; `SKILL.md` folders (A3) | M4.04 | build | an operator agent's tool call is checked by the real server's roles | M |
| M4.08 ∥ | Run telemetry through the Collector (A4) | M4.04 | build | a run's trace is read back by its id | S |
| M4.09 | The Durable Object host: one per run, alarms, Pi's closure measured for workerd (A6) | M4.04 | build | evicting mid-turn resumes with no duplicate model call | L |
| M4.10 | `@orthograph/agents`: Run, its machine, start, steer, cancel, the system's moves, `Blueprint.agent` | M4.02, M4.09 | build | the agents journeys pass, mounted in acme | M |
| M4.11 | The builder's typed API and code mode: `generated/builder/bp.d.ts`, the sandbox, the direct tools | M4.10 | build | a builder script lists blanks and runs one journey through `bp` | L |
| M4.12 ∥ | `bp.telemetry` over `TraceSource`: trace, calls, refusals, defects, slow | M4.11 | build | a script finds the slowest step of a run | M |
| M4.13 | The join: `workers: agents`, `Blueprint.need(agents, { when })`, dispatch through `agents.run.start`, `runFinished` back through `on:` | M4.10, M4.11 | build | a task dispatched to an agents run closes by its verdict | M |
| M4.14 ∥ | The `pi` runner in the bench (A5) and suites, spend and the report (A8), off the gate | M4.04 | build | `bench` writes one suite's report | M |
| M4.16 | The portal's chat on a durable agent (K5): one `@orthograph/agents` run per thread, the actions as its tools, approvals through the chat | M4.10, M1.24 | build | evicting a chat's run mid-turn resumes it with no second model call; a refused action shows its typed refusal in the thread | M |
| M4.15 | **Gate M4** | M4.02 to M4.13, M4.16 | e2e | `nx run e2e:m4` passes on `main` | S |

## M5: Reach out

**Goal.** Adapters both ways with real vendors' software, our own events driving work, and lists across homes.
**Ships.** [`frame/examples/payments.md`](frame/examples/payments.md) and
[`frame/examples/notifications.md`](frame/examples/notifications.md); `@orthograph/stripe`, `@orthograph/resend`; views
(K2 Q1); the general outbox; declared workflows in apps.
**Gate.** `nx run e2e:m5`: checkout runs against stripe-mock, labelled vendor; a world-sent signed event settles a
payment as `service(stripe)` (S19); a refund is refused through an agent (S20); an invitation's email arrives once in
Mailpit even when the actor is killed mid-send; a view lists an organisation's allowances while allowances live as
actors; `ortho prove` names each adapter's stand-in.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M5.01 | Views (where a view lives, how it is rebuilt), the general outbox (S22, S24), `step.await` on adapter events | Gate M4 | decision | `decisions/M5-reach-out.md` written | S |
| M5.02 | Journeys for payments and notifications | M5.01 | checks | they fail on empty handlers | M |
| M5.03 | Events in, general: doors that verify signatures, `on:` for adapter events and our own as `system`, idempotency by event id | M5.01 | build | a webhook sent twice settles once | M |
| M5.04 | The outbox for every move: events written with the state, delivered at least once; an undeliverable one is a defect with a redelivery command | M5.03 | build | killing a delivery mid-way delivers once after restart | M |
| M5.05 | Views at runtime: `Blueprint.view`, kept from events, reads generated in the SDK, CLI and MCP | M5.04 | build | the allowances view lists actor-homed allowances | L |
| M5.06 ∥ | The data map and the portal's data page | M5.05 | build | `generated/data/map.md` and the page list every store (kind, binding, migrations), every source (adapter, calls, stand-in) and every view | S |
| M5.07 | `ortho new adapter --from-openapi` and the conformance harness | M5.03 | build | a generated adapter's calls pass against its stand-in | M |
| M5.08 | `@orthograph/stripe`: stripe-mock stand-in, `provision`, money calls `.notVia(Via.agent)` by default (S20, S21) | M5.07 | build | the payments journeys pass | M |
| M5.09 ∥ | `@orthograph/resend` over SMTP, Mailpit as the stand-in (S23) | M5.07 | build | the notification journeys read the inbox | S |
| M5.10 | Declared workflows in apps: notifications, and `invitation.send` once across a kill (absorbs L5.04) | M5.04 | build | one email, not two, after a mid-send kill | M |
| M5.13 ∥ | A source we don't own (K3 items 8 and 9): first a spike on reaching MariaDB from workerd (TCP sockets or Hyperdrive, with a Node host as the fallback), then a fixture adapter over a MariaDB database it doesn't migrate, its stand-in real MariaDB loaded from a schema dump, conformance against it, and events from it kept in a view | M5.07 | spike, build | a handler reads a candidate through `step.call` with its own span; the conformance test fails when the dump's schema changes; Orthograph writes no migration for it | M |
| M5.11 ∥ | Another Orthograph app as an adapter, `--from-model`, its stand-in a world of that app | M5.07 | build | acme calls a second fixture app through a generated adapter | M |
| M5.12 | **Gate M5** | M5.02 to M5.11, M5.13 | e2e | `nx run e2e:m5` passes on `main` | S |

## M6: On chain

**Goal.** The allowance can live on chain, written once and generated in two languages. Where each key lives is declared, on a device
or on a server (Aaron, 18 November 2026, K7).
**Ships.** `@orthograph/language-solidity`, the relayer and follower, one vault per organisation (S27);
[`frame/examples/allowance-on-chain.md`](frame/examples/allowance-on-chain.md).
**Gate.** `nx run e2e:m6` (old Gates 3 and 4 together; the wallet, the chain adapter and Anvil in worlds landed in M1 and M2):
`forge test` passes on the filled vault; the fixed-seed fuzz of the TypeScript machine against the Solidity one finds
no divergence (S26); journeys pass on Anvil with each person signing; 100 relayed submissions take nonces 0 to 99; a
forced reorg is corrected; a pending chain call shows its in-between state (S25); the key-hygiene check passes.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M6.01 | Starts from [`decisions/K7-chain-languages.md`](decisions/K7-chain-languages.md), which settles the operation-to-chain mapping, client exposure, refusals, the submission lifecycle and `confirmed`. What is left: D5 (values across languages, `signedBy` as EIP-712, one vault per organisation) and the exact schema of `surface.json` and `refusals.lock` | Gate M5 | decision | `decisions/M6-chain.md` written | S |
| M6.02 | Journeys for the chain: contracts, the relayer and the follower (Codex's planned files `06` to `08`; the wallet's are M1.28 and M2.13) | M6.01 | checks | they fail on empty handlers | M |
| M6.03 | Moved to M1.29 (K7 F4: the wallet is the first plugin) | | | | |
| M6.04 | Moved to M2.13 (K7 F4: the wallet is the first plugin) | | | | |
| M6.05 | Moved to M1.30 (K7 F4: the wallet is the first plugin) | | | | |
| M6.06 | Moved to M1.31 (K7 F4: the wallet is the first plugin) | | | | |
| M6.07 | The relayer actor (L3.06) | M1.31 | build | 100 concurrent submissions, nonces 0 to 99, a dropped one replaced | M |
| M6.08 | Moved to M1.32 (K7 F4: the wallet is the first plugin) | | | | |
| M6.09 | The chain follower (L3.08), which also feeds the portal's committed chain events (K5 seam 10); its checkpoint is a block number plus a window of block hashes, and a take-back emits `<Event>Corrected { wasConfirmed }` (K7 Q6) | M6.07 | build | an `anvil_reorg` that replays a different digest emits a correction and then the new event; a restart doesn't double count | M |
| M6.10 | Values with Solidity types and `lives: Blueprint.chain.evm(...)` (`chain` as a family of store kinds, K7 Q4); the compiler accepts `runs: "chain"` (L4.01; `describe.ts:108` refuses it today); `blueprint/refusals.lock` for every language, so codes no longer come from declaration order (`describe.ts:79`; K7 Q5) | M6.01 | build | `ortho check` reports the change as major; swapping two declared errors keeps both codes; renaming a published code is refused | M |
| M6.11 | `language-solidity`, no longer a placeholder: types, the compiled machine, roles and refusals compiled in (one custom error per declared error), the ABI, roles generated in (OpenZeppelin-style `onlyRole`, generated, not imported), and `generated/solidity/surface.json` listing every external function for the clients; `ortho check` warns on a hand-written external writer with no role modifier (L4.02; K7 Q1, F1) | M6.10 | build | `forge build` compiles the generated files; the SDK reaches every external function; a hand-written writer with no role gives a check warning | M |
| M6.12 | Signatures and generated Foundry tests (L4.03) | M6.11 | build | the scaffold gives `0 passed · 24 failed: NotWritten` | M |
| M6.13 | The contract scaffold, its brief, the fuzz cross-check against the reference machine generated from the blueprint, driving the generated client with its pre-check (L4.04; K7 Q8) | M6.12 | build | the filled vault gives `24 passed`; fixed seeds show no divergence; the planted mutant diverges | M |
| M6.14 | The contract's client from the ABI (L4.05) | M6.13, M1.30 | build | a planted revert reaches the handler as `AllowanceExceeded` | S |
| M6.15 | The signing flow and the in-between state (L4.06, S25); the SDK's submission lifecycle (`simulated → submitted → included → confirmed`, `dropped`, `reverted`, `corrected`), where `confirmed` matches the intent's event, not the transaction (K7 Q3) | M6.14, M1.29, M6.07 | build | `acme allowance spend --wallet olga` succeeds; bob's signature is refused before sending; a second relayer's mined revert still ends `confirmed` | M |
| M6.16 | Worlds with a chain: a vault per organisation, journeys on Anvil (L4.07) | M6.15, M1.31, M6.09 | build | `ortho prove --env local` shows each operation signed by its person | M |
| M6.17 | Contracts in the local pipeline, redeployed only on a new bytecode hash (L4.08, local part) | M6.16 | build | promoting twice with the same bytecode deploys nothing the second time | M |
| M6.18 ∥ | The key-hygiene and custody checks (S29): each wallet declares where its key lives (`device` or `server`), and no key appears in plain text in a binding, a commit or a log. A server may hold keys (Aaron, 18 November 2026, K7) | M6.16 | build | a planted plain-text private key in a binding fails the check; a declared server-held key from secrets passes | S |
| M6.20 | `examples/workshop` (K5): the governance feature, the vote as a contract operation, the publish workflow across D1 and the chain, the forum adapter's stand-in | M6.16, M3.10 | build | a vote twice by one member is refused by the contract through the SDK, the CLI and an action; a publish run links the confirmed proposal to its exact revision | M |
| M6.19 | **Gate M6** | M6.02, M6.07, M6.09 to M6.18 (M6.20 dropped by K9) | e2e | `nx run e2e:m6` passes on `main` | S |

## M7: The cloud, then Capxul

**Goal.** Every local destination swapped for the real one, each credential created only with Aaron's written yes and
the spend under $10 a day; then Capxul's first feature running on Orthograph.
**Gate.** `nx run e2e:m7`: acme goes from a pull request to test, staging and production on Cloudflare with a verdict
in each, Orthograph's packages are released under `@orthograph` on npm, and everything the gate made is destroyed after.
Capxul's first feature runs in its staging.

| id | what | needs | kind | done when | size |
|---|---|---|---|---|---|
| M7.01 | The cloud pass: every credential named, a cost estimate under the cap, which secret store `Cloudflare.secrets` means | Gate M6 | decision | `decisions/M7-cloud.md` written, with Aaron's yes per credential | S |
| M7.02 | The npm org `@orthograph` (Aaron signs in) and Orthograph's first real release | M7.01 | build | `npm view orthograph` shows the release | S |
| M7.03 | The infra projection: an Alchemy stack per environment from the model and mounts | M7.01 | build | `ortho env up staging` plans the expected resources | L |
| M7.04 | Deploy and destroy on Cloudflare (L2.01, cloud part) | M7.03 | build | `ortho env destroy` leaves nothing in the account | M |
| M7.05 | Test worlds and signed verdicts from GitHub Actions (L2.02, L2.03, cloud parts) | M7.04 | build | a pull request gets a verdict signed with GitHub's OIDC token | M |
| M7.06 ∥ | Real releases: npm, Homebrew, GitHub (L2.06, cloud part) | M7.02 | build | `brew install` of acme's CLI works from the real tap | S |
| M7.07 ∥ | Adapters against the real vendors: Stripe test mode, `provision`, conformance | M7.04 | build | the conformance test passes against Stripe's test mode | M |
| M7.08 ∥ | The builder's read-only staging telemetry token (with Aaron's yes) | M7.04 | build | an unattended builder reads staging traces, redacted | S |
| M7.09 ∥ | Contracts on a testnet (L4.08, cloud part) | M7.04 | build | a changed vault is redeployed and verified | M |
| M7.10 | Capxul's plugins mapped: which exist, which are new, which are Capxul's own | M7.01 | decision | `decisions/M7-capxul.md` written | S |
| M7.11 | Capxul's first feature on Orthograph, in its staging | M7.10, M7.05 | build | its journeys are green in Capxul's staging | M |
| M7.12 | **Gate M7** | all of M7 | e2e | `nx run e2e:m7` passes, and the gate's resources are destroyed | S |

## Later

- **Noir** ([`frame/examples/private-membership.md`](frame/examples/private-membership.md), N1, S28, S30), with the workshop's private membership as its example (K5 seam 7). `language-noir` and the `aztec` store kind, designed in K7. Any claim about proofs runs in a `proofs: "verified"` world (the in-process network with `realProofs: true`, K7 Q7); the CLI local network accepts forged proofs. A production promote still needs a network that verifies rollup proofs.
- **Solana**: `language-solana` (Anchor 1.2.2), the `solana` store kind and `chain-solana` on the same `ChainPort`, designed in K7 and spiked in `spikes/chain-languages/solana/`.
- **The Python client** ([`frame/examples/python-sdk.md`](frame/examples/python-sdk.md), S31 to S33).
- **Time**: one clock per world, moves made by time, the keeper, the on-time eval (D6, L5.01 to L5.03, L5.05 to L5.07),
  and agent waits on the world clock (L5.08). Workflows' durable clocks (M3, M5) cover long waits until then.
- **EIP-7702** delegation (L3.09), off the path as the old plan allowed.
- **The Docker sandbox** for agents (A7) and **baselines** (A9).
- Sequence diagrams as journeys (S5) and project-wide ratchets (S6).

## Where every unfinished build-plan step went

| Step | Now | | Step | Now |
|---|---|---|---|---|
| D4 | M1.01 | | L4.01 | M6.10 |
| L3.01 | M1.05 to M1.10, M1.14 | | L4.02 | M6.11 |
| L3.02 | M1.29 | | L4.03 | M6.12 |
| L3.03 | M2.05 (auth as a plugin), M2.13 (SIWE) | | L4.04 | M6.13 |
| L3.04 | M1.30 | | L4.05 | M6.14 |
| L3.05 | M1.31 | | L4.06 | M6.15 |
| L3.06 | M6.07 | | L4.07 | M6.16 |
| L3.07 | M1.32 | | L4.08 | M6.17 (local), M7.09 (testnet) |
| L3.08 | M6.09 | | L4.09 | M6.19 |
| L3.09 | Later | | D6, L5.01 to L5.03, L5.05 to L5.08 | Later |
| W1 | M3.04 | | L5.04 | M3.10 (factory), M5.10 (apps) |
| W2 | M3.06 | | A0 | M4.03 |
| W3 (with F4.1, F4.2) | M3.07, M3.09 | | A1 | M4.04 |
| L3.10 | M6.19 | | A2 | M4.05 |
| D5 | M6.01 | | A3 | M4.07 |
| A4 | M4.08 | | A5, A8 | M4.14 |
| A6 | M4.09 | | A7, A9 | Later |
| Cloud parts of L2.01, L2.02, L2.03, L2.06 | M7.04 to M7.06 | | | |

S2 to S6, I1, I2 and D3 carry no tick in the build plan's table, but Gates 1 and 2 passed after them, their spikes are
in `spikes/` and D3's records exist, so they are done in substance.

**Dropped, with reasons:**

- D4's old recommendation of a `kit:` namespace in the model: mounts are named by their file's path (K2).
- The config file's `outputs`: never read (D3 #112); projections are mounted instead (M0.03, M1.11).
- "Kit" and "dependency" as words: they become feature and adapter (K2, Q3).

## The critical path to workable

```text
M0.01 → M0.02 → M0.03 → M0.04 → Gate M0
  → M1.01 → M1.05 → M1.06 → M1.07 → M1.08 → M1.10 → M1.11 → Gate M1
  → M2.01 → M2.03 → M2.05 → M2.07 → M2.10 → Gate M2 (workable)
```

**Beside it:**

- **M0:** M0.05 (the docs), after M0.01.
- **M1:**
  - M1.02 (the checks) after M1.01.
  - M1.03 then M1.04, from the gate, beside the plugin slices.
  - M1.09, M1.14 after M1.08.
  - M1.12, M1.13 after M1.11.
- **M2:**
  - M2.02 (the checks) and M2.04 (secrets) after M2.01.
  - M2.06, M2.08 after M2.05.
  - M2.09, M2.11 after M2.07.

The M1 and M2 gates need every slice, so the side slices must land before them.

**After workable (K9):** stage 2 (wallets) next, then stage 3 (the vault), stage 4 (the club) and the release. Capxul's
first plugin, the wallet, is stage 2.

## Risks

1. **The rename touches everything.** Mechanical slices only (M0.02, M0.03), the old gates as the net, and a lint rule
   so the old names can't creep back.
2. **"Identical output" in M1.11 to M1.13 may hide real changes.** Only header paths may differ, and the diff is part of
   each slice's evidence.
3. **Codex's checks carry the old shape.** They are ported as authored checks, re-run red before any builder starts
   (M1.02), and rewritten where the frame differs rather than built to.
4. **Effect 4.1.3 and the experimental Cloudflare engine.** Upgraded in its own slice (M3.02), spiked before use
   (M3.03), behind a seam; the fallback is a hand-written Durable Object workflow.
5. **Pi's closure on workerd** (M4.09) may not bundle or may be too big. Measured first; the fallback is running agent
   runs on the Node host.
6. **A small local model can't build much.** The M4 gate uses it for durability, roles and the join. How well builders
   build is measured in the bench (M4.14), with a real model, off the gate.
7. **Workable rests on the least specified slice**, a plugin's own CI (M2.10). M2.01 settles its shape first.
8. **Time is deferred.** Journeys can't step a month until the world clock lands. That's acceptable until a plugin
   Capxul needs depends on it; then it moves forward as its own milestone.

9. **MariaDB from workerd is unproved** (M5.13). Spiked first; the fallback is the adapter running on a Node host beside
   the Worker, with the same port.