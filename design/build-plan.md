# Architect: the build plan

## How to use this plan

> **Run order:** goal 1 (`goals/01-the-whole-framework-locally.md`) builds these steps in six stages, against local
> stand-ins, and pulls the grant's slice of L1.20 to L1.25 into the skeleton. See `decisions/G1-local-first.md`.

This plan takes Architect from an empty repository to all five layers. One local agent follows it, working with Aaron.

**Rules**

1. **One step, one session.** Each step fits in one agent session with Aaron. It ends green, meaning every existing check still passes. It is proven by the check named in *Done when*: a command and its expected output, or a named journey passing. If a step won't fit in a session, split it before starting. Don't stretch a step across sessions.
2. **Gates.** Each layer ends in a gate step: a single e2e suite holding that layer's success checks. Nothing in layer N+1 starts until gate N passes on a clean checkout. Ideas for later layers go in `design/later.md`, not into code.
3. **Decisions come just in time.** A decision step (`D…`) sits right before the first step that needs it. It ends with a short record in `design/decisions/` that gives the choice and the evidence. Don't reopen it without new evidence.
4. **Spike results are inputs.** Three spikes are done: names from paths (S1), the clock and world controller (S7), and a thing as a Durable Object (S8). Their results are in `spikes/`, and intake steps I1 and I2 below fold them in. Their findings come in at intake steps (`I…`). Each intake step names the steps it may rewrite.
5. **Where the worked example lives.** `examples/acme` is Architect's own test project. Every layer's gate runs the allowance through that layer.
6. **Parallel work.** ∥ marks steps whose needs are already met, so they can run in either order or in separate sessions. Everything else runs in the order listed.

**Conventions in this plan**

- "Fixture" means a small blueprint under `packages/*/test/fixtures/`.
- "e2e" means `nx run e2e:<name>`. It generates a fresh workspace in a temporary folder from the local packages, published to a local Verdaccio.
- The package rules are enforced from L1.01 by Nx module boundaries:
  - blueprint depends only on Effect;
  - generated code imports only the runtime, blueprint and project code;
  - compiler and generators never run in production.

---

## Layer 1: Declare and call

> **L1.01 done (16 November 2026):** `pnpm nx run-many -t lint,typecheck,test` is green over 13 package shells and acme. `packages/lint/test/boundaries.test.ts` shows `@nx/enforce-module-boundaries` failing on three planted fixtures (blueprint importing compiler, blueprint importing a package other than Effect, runtime importing generators). Lint is oxlint with `@nx/oxlint`'s boundaries plugin, with no ESLint. Verdaccio runs as `nx local-registry workspace`. CI runs the same, plus `nx sync:check`.

**Goal.** The allowance runs off chain, on this machine only. It is declared in `blueprint/` and served by a generated server, API, SDK, CLI and docs. Its journeys pass all nine evals, and `architect check` enforces the rules. The clock and the world controller are wired in, even though nothing moves by time yet.

### Foundations and spikes

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| L1.01 ✅ | Architect's own workspace | none | all (empty) | Nx and pnpm monorepo with every package shell. `examples/acme` is an empty project. Module-boundary tags hold the package rules. The CI workflow runs lint, typecheck and test. A local Verdaccio target is set up for e2e. | `pnpm nx run-many -t lint,typecheck,test` is green. A fixture where blueprint imports compiler fails lint with `@nx/enforce-module-boundaries`. |
| S2 ∥ | Spike: one declaration through the whole chain | L1.01 | spikes/ | One hand-written `allowance.grant` taken all the way through: declaration → model JSON → a generated HttpApi route → a handler → an SDK call → a CLI command, with a span. | `pnpm tsx spikes/chain/run.ts` prints the CLI output and the span tree. The README lists every seam that needed a hand-edit. |
| S3 ∥ | Spike: a move without races | L1.01 | spikes/ | 50 concurrent `spend` calls on one allowance, tried two ways: a version column in D1, and a Durable Object (the Durable Object half is answered by S8). | Both runs end with `spent` equal to the sum of the accepted calls, with no lost update. The README has latency for each way. |
| S4 ∥ | Spike: evals from telemetry | L1.01 | spikes/ | An in-memory OTel exporter under Effect's tracer. Three evals (answer shape, declared errors, refusal has a deciding log) run over the spans and logs it records. | `pnpm tsx spikes/evals/run.ts` passes on good calls. It fails, naming the call, on a planted bad call. |
| S5 ∥ | Spike: Nx scaffolds and outputs | L1.01 | spikes/ | A local Nx plugin with one scaffold generator and one sync generator. A `create-nx-workspace` preset. | `nx g` writes the file and supports `--dry-run`. `nx sync:check` fails after a generated file is hand-edited. The preset makes a workspace that builds. |
| S6 ∥ | Spike: two lint rules | L1.01 | spikes/ | Two oxlint rules (JS plugin): `no-name-as-string` and `refusal-has-log`. | Each rule flags its bad fixture and passes its good one: `oxlint` exits 1 and 0. |
| I1 | Intake: names from paths (S1), done | S1 result | none | S1 said yes: a compiler loads each declaration by path and writes the only copy of each name into `generated/`; errors are named by their exported class, narrowed by module augmentation; `--check` fails on stale output; blueprint files must have no side effects on import; the compiler runs before `tsc`; dashed file names are mapped to identifiers (decided). | A decision record is written from `spikes/names-from-paths.md`. L1.11 uses the module-loader approach. |
| I2 | Intake: the Durable Object world (S8) and the clock (S7), done | S7, S8 results | none | S8 said yes, with a generated per-object lock of one permit around every move (input gates alone don't stop a race once a move awaits), and named three needs: an outbox for thing-to-index delivery retried by alarm, an in-between state for chain calls, and a timeout on the permit. S7 said yes, under three rules: all handler, workflow and keeper work is counted work (quiescence is a service, not TestClock); raw sleeps are banned by lint; Anvil runs with timestamp interval 0, in whole seconds. It also found that periods need an anchor (decided: calendar months from the grant). | Decision records are written from `spikes/durable-object.md` and `spikes/world-clock.md`. L1.12 adds Busy (counted work) beside Clock and Timers; L1.20 adds the per-object lock and the outbox; L1.40 adds `no-raw-sleep`; L3.05 sets Anvil's interval to 0; L4.06 adds the in-between state for chain calls. |

### Decisions before the walking skeleton

**D1: runtime and storage.** This is one session, with spike evidence from S3, S8 and I2.

1. **Who owns a thing's state.** The options are `lives: database | actor | chain`.
   *Recommendation:* adopt all three in the language now. Build `database` and `actor` in layer 1 and `chain` in layer 4. Make `database` the default. Use `actor` where S3 shows it's needed: the move without races, and the world.
2. **The local host.**
   - (a) Miniflare/workerd through `wrangler dev` and `@cloudflare/vitest-pool-workers`;
   - (b) Node, with a Durable Object shim.

   *Recommendation:* (a). That way there is one runtime, Durable Objects are real locally, and the target-effect runtime stays host-neutral behind a `Host` service. Node becomes the fallback if risk R1 bites.
3. **The local database. Decided (Aaron, 16 November 2026): Cloudflare-native, all SQLite.** D1 for things that live in the database, each Durable Object's own SQLite storage for actors and organisation indexes, R2 for exports. Locally, Miniflare emulates D1 and Durable Object storage, so a local world needs no database process. No Postgres and no Neon; a project that needs Postgres later gets it as a kit. Check that Effect's SQL layer has a D1 driver at the pinned Effect version; if not, the runtime wraps the D1 binding directly.
4. **The Effect version.** *Recommendation:* the current stable major, pinned exactly. Upgrade on purpose, as its own step.
5. **Auth in layer 1. Decided (Aaron, 16 November 2026): (a),** a built-in Better Auth adapter in layer 1, with email/password, organisations, API keys and device login, on D1, which L3.03 later turns into a kit. Test principals for journeys either way.

**D2: layer-1 primitives still open.** Also decided on 16 November 2026: verb file names keep their dashes (`change-role.ts`) and the compiler maps them to identifiers (`changeRole`); the monthly reset counts calendar months from the grant.

1. **Moves with more than one outcome.** *Recommendation:* `to` takes a list. The handler returns an outcome; the runtime checks it against the list.
2. **Reads.** *Recommendation:* `Blueprint.read`, answered from the thing's records, with no handler.
3. **Idempotency.** *Recommendation:* `idempotent: "request"`, keyed by a request-key header, with the stored answer replayed for a retry.
4. **Starting worlds.** *Recommendation:* they run operations and never write rows.

### The walking skeleton: allowance.grant, end to end

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| L1.10 ✅ | Language core, minimal | D1, D2, I1 | blueprint | `thing`, `operation`, `value`, `Schema` re-exports and `anyone`. Type tests use expect-type. | `nx test blueprint` is green. The fixture `things/allowance/{thing.ts,verbs/grant.ts}` typechecks. An answer with a wrong type fails in a type test. |
| L1.11 ✅ | Compiler, minimal | L1.10 | compiler | Loads `blueprint/` by path, using I1's method. Builds the model: things, operations, payload and answer fields described by value (D2 item 10; generators derive JSON Schema). Gives each declaration a canonical hash. | `architect model --json` on the fixture matches its snapshot. Renaming `verbs/grant.ts` to `award.ts` renames the operation. Reformatting a file leaves the hash unchanged. |
| L1.12 ✅ | Runtime, minimal | L1.10, I2 | target-effect (runtime), host-cloudflare | The handler wrapper, v0: decode, run the handler, encode, one span per operation. `Clock` and `Timers` services are wired in from the start, and the runtime never reads the wall clock. A database layer per D1. | A unit test with the in-memory exporter shows a span named `allowance.grant` with its payload's attributes. |
| L1.13 ✅ | Generators v0: api, server, sdk, cli | L1.11, L1.12, S5 | generators, target-effect | Sync generators that write `generated/{api,server,sdk,cli}` for every operation. | In `examples/acme`, `nx sync` writes the four outputs and `nx sync:check` passes. Editing `generated/sdk/...` makes `nx sync:check` fail. |
| L1.14 ✅ | `architect dev` | L1.13 | cli, host-cloudflare | Boots the generated server on Miniflare with the world Durable Object (registry and front door) and the local database. | `architect dev &` then `acme allowance grant --to olga --limit 500` prints an allowance id. `curl` to the route returns 200. |
| L1.15 ✅ | Prove v0, with every eval | L1.14, S4 | prove | Local world: fresh database, world Durable Object, a real OpenTelemetry Collector in Docker (it replaces the in-memory exporter, D2 #29). Journey DSL v0. All nine evals (D2 #31), each with the journey author's planted fixture. Done: `prove.test.ts` is the gate. | `architect prove --env local` prints `allowance.grant 8 evals ✔`, coverage ✔ and `prove ✔`. Each planted fixture makes prove exit 1 and names the call on its own eval. |

**Skeleton milestone.** The full chain now runs: declaration, model, generated route and CLI, journey, evals. From here on, every step widens something that already runs end to end.

### Widening the runtime (the allowance gets its life)

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| L1.20 | Machines and moves | L1.15 | blueprint, compiler, target-effect | `machine`, `move`, `event`. `to` lists (D2). The generated `<Thing>Not<State>` refusal. Owner per D1: a version column for `database`, a Durable Object for `actor`. Events written in the same transaction as the move. Built with L1.23's reads and idempotency and L1.22's bob journey in one commit, because the journey author's stage-two journeys needed all three (D2 #43 to #48). | The race test from S3, now in `host-cloudflare` tests (D2 #39; it needs workerd), passes for both owners. The allowance has active, exhausted and revoked, and `AllowanceNotActive` carries the state it was in. |
| L1.21 ∥ | Errors, exit codes, deciding logs | L1.20 | blueprint, target-effect | `Blueprint.error` with `exit`. The handler's error type is exactly the declared union. Each refusal is annotated with the log that decided it. | A type test shows that returning an undeclared error fails to compile. A refusal span carries its deciding log record. |
| L1.22 ∥ | Roles and principals | L1.20 | blueprint, target-effect | `role`, `anyone`, `signedIn`, `owner.of("field")`. Test principals. The role check runs before the handler. | A journey: bob calls `allowance.revoke` and is refused with `NotAllowed`, and the handler span is absent. |
| L1.23 ∥ | Reads and idempotency | L1.20 | blueprint, target-effect | `read`, answered from the thing's records with no handler. `idempotent: "request"`. | `allowance.get` works without a handler file. Calling `allowance.spend` twice with the same request key spends once and returns the same answer. |
| L1.24 | Steps and budgets | L1.21 | blueprint, target-effect | `step.database` and `step.wait` as named spans. `budget.p95`. | The spend span tree shows the declared step spans in order. |
| L1.25 | The nine evals and coverage | L1.21–L1.24 | prove | Answer shape, declared errors, machine path, events, who may call, steps, performance (review only, never fails), coverage, explainability. | `architect prove --env local` on acme prints `9 evals ✔` for grant, spend, revoke and get, and `coverage ✔ moves 3/3 · outcomes 3/3 · refusals 2/2 · runtime refusals 4/7` (D2 #52). Each eval has a planted fixture that it fails. |

### Generators and scaffolds (the authoring loop)

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| L1.30 ∥ | Blanks and the add scaffolds | L1.20 | blueprint (`todo`), generators, cli | `Blueprint.todo`. `architect add thing / operation / read / journey`, each with `--dry-run`. A blank compiles, and check names it. | In a fresh acme, `architect add thing allowance` writes 5 files and a values file. `architect check` prints `allowance has 3 blanks` with the file and line of each. |
| L1.31 | Handler scaffold and what a handler is given | L1.30, L1.24 | generators, target-effect | Once a declaration has no blanks, generate writes `generated/api/.../<op>.handler.ts` (steps, move, error union). It scaffolds `implementation/handlers/<thing>/<op>.ts` with blanks once, and never overwrites it. | After the operations are filled in, `architect generate` creates three handler scaffolds. Running it again changes nothing. |
| L1.32 ∥ | Docs, model, full SDK and CLI | L1.25 | target-effect, generators | `generated/docs` with a page per thing and operation (machine, refusals, how to call). `generated/model` with edges. CLI exit codes per error, `--json`, and sign-in. | `acme allowance spend` past the limit exits 41. `generated/docs/allowance/spend.md` lists AllowanceExceeded and AllowanceNotActive. |
| L1.33 | `architect brief` | L1.31 | cli, compiler | The brief for one handler: the declaration to read, the files it must not touch, the evals that must pass. | `architect brief allowance.spend` prints all three. Its forbidden files include `blueprint/journeys/**`. |

### Check, lint and impact

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| L1.40 ∥ | `architect check`: types, rules, drift, ratchets | L1.31, S6 | lint, cli | oxlint rules: `no-name-as-string`, `refusal-has-log`, `declared-errors-only` (D2 #50), `no-wall-clock` (no `Date.now`, `new Date()` or `setTimeout` outside the runtime), `handler-matches-path`, `no-edited-output`. Drift through `nx sync:check`. Ratchet files. | Four fixtures each make `architect check` exit 1 with a message naming the file: an edited output, a name as a string, an undeclared error, and a refusal with no log. Clean acme passes with `ratchets 0`. |
| L1.41 ∥ | Model comparison, staleness, `impact` | L1.25 | compiler, prove | Compares two models and lists the change for each declaration. Local evidence is kept under `.architect/evidence`, keyed by the hashes it depends on. `architect impact`. | Loosening `allowance.spend`'s budget shows exactly `stale allowance.spend`, while grant, revoke and get stay proven. Adding `allowance.list` shows `stale none`. |

### Starter and example

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| L1.50 | The starter preset | L1.32, L1.40, D1.5 | cli (preset), target-effect (auth adapter) | `npx create-nx-workspace acme --preset=@architect/preset` with system, session (Better Auth), organization, membership, invitation and API keys, plus 3 journeys. | In a temporary folder, the preset runs, then `pnpm architect check` and `pnpm architect prove --env local` are both green. |
| L1.51 | examples/acme: the allowance off chain | L1.50 | examples/acme | The allowance built by Architect's own commands on top of the starter (walkthrough steps 3–8). Starting world `funded`. Journeys `spend-within-allowance` and `revoke-then-spend`. | `architect prove --env local` in acme shows four operations each with `9 evals ✔`. |
| L1.60 | **Gate 1** | L1.51, L1.41 | e2e | `nx run e2e:layer1` holds the seven checks. Check 4 is a scripted, fresh agent session given only `architect brief allowance.spend`, with read access to the journeys' code denied by its config. | All seven tests pass on a clean checkout in CI. |

---

## Layer 2: Prove and ship

**Goal.** A change goes from pull request to production with a verdict per environment. The published SDK and CLI carry the version the model worked out.

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| D3 | Decision: destinations, versions, secrets | Gate 1 | none | (1) Version rules from the model diff. *Recommendation:* added operation or read = minor; changed payload, answer or errors = major; budget or docs = patch. (2) Secrets named per environment. *Recommendation:* declared in `environments/<env>.ts` by name only, with values in Cloudflare secrets set by Alchemy. (3) Where verdicts live. *Recommendation:* the logbook as a Durable Object with R2, behind one Worker. | A decision record is written. |
| L2.01 | Infra output and cloud deploy | D3 | host-cloudflare, generators | `generated/infra`: an Alchemy stack per environment (Worker, Durable Objects, D1 databases, R2 buckets). `architect deploy` and `architect destroy`. | `architect deploy --env sandbox`, then `acme system health --env sandbox` prints `ok`. `architect destroy` leaves no resources, per the Alchemy state. |
| L2.02 | Test worlds in CI | L2.01 | prove, host-cloudflare | A GitHub Action that creates world `test-pr-N` (fresh D1 database, world Durable Object with `lifetime`), runs `prove --env test`, then destroys it. The world's alarm destroys it at expiry if the run dies. | A PR shows `architect / prove (test)` green. A run killed on purpose leaves a world that is gone after its lifetime. |
| L2.03 ∥ | The logbook and signed verdicts | L2.02 | logbook | Stores verdicts, signed with the GitHub OIDC token (repository, branch, workflow), plus the model per revision. | A verdict posted from CI is accepted. One posted with a forged or local token is rejected with 401. |
| L2.04 | Versions and staleness against the logbook | L2.03, L1.41 | compiler, prove | The next version is worked out from the last release's model. Staleness is read from the logbook. | Adding `allowance.list` reports `next 1.1.0, stale none`. A budget edit makes stale exactly spend in staging and production. |
| L2.05 | Staging, production, `promote` | L2.04 | cli, host-cloudflare | Promotion goes only from a staging revision whose verdicts are all green. Production gets the same artefacts, not a rebuild. | `architect promote --to production` refuses a revision without staging verdicts and accepts one that has them. |
| L2.06 ∥ | Publishing the SDK and CLI | L2.04 | cli, target-effect | npm packages, CLI binaries, a Homebrew tap formula and GitHub releases, all at the model's version. | Against Verdaccio and a test tap repo, `architect publish --dry-run` then `--local` gives `@acme/sdk@1.1.0` and a formula that `brew install` runs. |
| L2.07 ∥ | Real sign-in in deployed environments | L2.01 | target-effect (auth adapter) | Better Auth on staging and production. Device login for the CLI. API keys. | `acme session sign-in` through device code against staging, then `acme session show`, prints the principal. |
| L2.08 | Remote MCP with OAuth | L2.07 | target-effect (mcp), generators | `generated/mcp`: one tool per operation and read, built on the SDK, deployed with OAuth. | An MCP client test connects, completes OAuth as ada, calls `allowance.get` and receives the typed answer. A call without the role is refused. |
| L2.09 ∥ | `watch` | L2.05 | prove | The same evals running on production telemetry from the OTLP sink (Axiom), excluding coverage. Drift becomes a task. | Against staging traffic replayed by a script, `architect watch --env staging` prints p95 against budget and the refusal counts. A planted slow handler shows as drift. |
| L2.10 ∥ | The portal | L2.04 | portal | A read-only site: the blueprint, the docs, verdicts per environment, what is stale. | The deployed portal shows `allowance.spend` with `test ✔ staging ✔`, and after a budget edit, `stale` on spend only. |
| L2.11 | **Gate 2** | all of L2 | e2e | `nx run e2e:layer2` replays walkthrough steps 9–12 on a sandbox account. | A PR goes to test, then staging, then production. There is a verdict in each environment, and the npm version equals `architect version --next`. |

---

## Layer 3: Reach out

**Goal.** The kits arrive finished. The example uses the wallets and chain kits without wrapping any package itself, and the CLI's wallet commands work with a local key.

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| D4 | Decision: the kit format | Gate 2 | none | The kit's shape. *Recommendation:* a kit is a package exporting declarations (things, operations, errors, roles), services (Effect layers) and a choices schema. `architect add kit` writes one `blueprint/kits/<kit>.ts` of choices, and generate folds the kit's declarations into the model under a `kit:` namespace. | A decision record is written. |
| L3.01 | Kits, dependencies and edges | D4 | blueprint, compiler, generators, cli | `Blueprint.kit`, `architect add kit`, `architect add dependency` (writes a wrapper with one blank: failure → your error), dependency edges in the model. | A fixture kit is added with one command. Its operations appear in the generated SDK, and `architect impact` shows edges from the kit to the operations that use it. |
| L3.02 ∥ | std/wallets: the signer primitive | L3.01 | std | `Signer` service, local key (encrypted keystore), test keys for each world, CLI `wallet create · import · link · list`. | `acme wallet create && acme wallet list` shows the address. In every world, each test person has a wallet. |
| L3.03 ∥ | std/auth: the starter's adapter becomes a kit, plus SIWE | L3.01 | std, target-effect | The layer-1 adapter moved into a kit with no change to behaviour, plus Sign-In with Ethereum linking a wallet to a principal. | The starter journeys still pass unchanged. `acme wallet link` signs a SIWE message, and `acme session show` lists the linked address. |
| L3.04 | std/chain: viem wrapped once | L3.01 | std | Contract services, typed chain errors, transaction tracking and typed-data signing, all adapted from @prb/effect-evm. viem is the only real dependency. | Against local Anvil: deploy a fixture ERC20, call transfer, read the receipt as a span. A revert decodes to a typed error. |
| L3.05 | Benches: Anvil in a world | L3.04, I2 | host-cloudflare, prove | Locally, Anvil as a child process. In CI and cloud worlds, Anvil in a Cloudflare Container owned by the world's Durable Object. The world gets `chain`. | A world with a chain starts, `eth_chainId` answers, and the container stops when the world is destroyed. |
| L3.06 | The relayer as an actor | L3.05 | std | A Durable Object per relayer key: nonces handed out in order, stuck transactions replaced, receipts written through. | 100 concurrent submissions land with nonces 0–99 and no gaps. A dropped transaction is replaced with a higher fee. |
| L3.07 ∥ | Simulation | L3.04 | std | `simulate`: the node's `eth_call` and `eth_simulateV1`, falling back to a forked Anvil. Tenderly is opt-in. | Simulating a reverting transfer returns the typed error without sending anything. |
| L3.08 | The chain follower | L3.06 | std, host-cloudflare | A Durable Object per contract: alarm, checkpoint, chunked log ranges, reorg ring, corrections. Ideas from effective-indexer. | A fixture reorg on Anvil (`anvil_reorg`) emits a correction, and the follower's view equals the chain's view. Restarting from the checkpoint does no double counting. |
| L3.09 ∥ | EIP-7702 (wallets) | L3.02, L3.04 | std | A 7702-delegated signer. It can move to layer 4 if it blocks the gate. | A delegated test account sends a sponsored call on Anvil (Prague). |
| L3.10 | **Gate 3** | L3.02–L3.08 | e2e | acme adds the `wallets` and `chain` kits. | `nx run e2e:layer3`: `acme wallet create` and `link` work with a local key, and acme has no hand-written viem import (enforced by lint). |

---

## Layer 4: On chain

**Goal.** The allowance moves into a vault as one declared change, which is a major version. The generated Foundry tests pass, and the journeys pass on Anvil with each person signing. The server holds no person's key.

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| D5 | Decision: values across targets, signing, one contract per owner | Gate 3 | none | (1) Values carry their Solidity type (`uint256` as a bigint, `address`). (2) `signedBy: role`, where the signed payload is the operation's payload as EIP-712 typed data with a nonce and deadline, checked by OpenZeppelin's SignatureChecker. (3) One vault per organisation from a factory, deployed by the starting world. *Recommendation:* adopt all three as drafted in the docs. | A decision record is written. |
| L4.01 | Values with Solidity types, and `lives: chain` | D5 | blueprint, compiler | Value types for every target. `lives: Blueprint.chain({ contract, per })`. The model marks the change as major. | `architect check` in acme reports `allowance.spend.payload major, next 2.0.0` and lists the stale proofs. |
| L4.02 | target-solidity: types and the compiled machine | L4.01 | target-solidity | `<Thing>Types.sol` (states, moves, events, errors) and `<Thing>Machine.sol` (a step function the vault inherits). | `forge build` compiles the generated files. |
| L4.03 | Signatures and generated Foundry tests | L4.02 | target-solidity | `<Thing>Signatures.sol` (EIP-712 from payloads). Tests: every move from every state, every write signed by the wrong wallet, every signed request sent twice. | `forge test` on the scaffold gives `0 passed · 24 failed: NotWritten(...)`. |
| L4.04 | Contract scaffold, brief, and a cross-check | L4.03 | target-solidity, generators, cli | `implementation/contracts/<Vault>.sol` with `notWritten` blanks. `architect brief` for contracts. A fuzz test comparing the TypeScript machine with the Solidity machine. | An agent given the brief fills the vault, and `forge test` gives `24 passed`. The fuzz test runs 10k sequences with no divergence. |
| L4.05 | The contract's client from the ABI | L4.04, L3.04 | target-effect, generators | `generated/contracts/abi.ts` from `forge build`. An Effect client: every write a span, every custom error decoded to its typed error. | `nx sync` regenerates the client after `forge build`. A planted revert reaches the handler as `AllowanceExceeded`. |
| L4.06 | The signing flow | L4.05, L3.02, L3.06 | target-effect, std | The SDK fetches what to sign, signs it with the caller's signer, and the relayer submits. The handler is given the vault's client and a signature already checked. CLI `--wallet`. | `acme allowance spend --wallet olga` succeeds on Anvil. Signing with bob's wallet is refused before anything is sent. |
| L4.07 | Worlds with a chain, and journeys on Anvil | L4.06, L3.05 | prove | The starting world deploys a vault per organisation and funds it with TestUSD, with test wallets. Evidence includes receipts, and reads come back through the follower or by write-through. | `architect prove --env local` shows `9 evals ✔ signed by ada / olga` for grant, spend, revoke and get. |
| L4.08 | Contracts in the pipeline | L4.07, L2.05 | host-cloudflare, cli | Contracts deployed and verified per environment, redeployed only when the bytecode hash changes. Test worlds on a bench Anvil. | Promoting twice with the same bytecode deploys nothing the second time. A changed vault is redeployed and verified on the testnet. |
| L4.09 | **Gate 4** | L4.08 | e2e, lint | `nx run e2e:layer4`. A check that the server holds no person's key: no private key in the server's secrets or bindings (checked against the Alchemy state), and the relayer key can only submit already-signed payloads. | The release is 2.0.0. Forge tests pass, journeys pass on Anvil with each person signing, and the no-key check passes. |

---

## Layer 5: Time

**Goal.** One clock per world. A journey moves the clock a month and a year in seconds. Both moves made by time happen on time, locally and in CI.

| id | name | needs | packages | what is built | done when |
|---|---|---|---|---|---|
| D6 | Decision: moves made by time, and the keeper's key | Gate 4 | none | (1) `by: Blueprint.time.every("1 month", { lazy: true })` and `after: grant + "1 year", by: keeper, late: "10 minutes"`. (2) The keeper's key can only call time moves (checked by a role in the contract). (3) Keeper moves as per-thing Durable Object alarms, not scans. *Recommendation:* adopt all three. | A decision record is written. |
| L5.01 | The clock reaches everything | D6 | prove, host-cloudflare, std | Stepped and scaled modes now also drive the chain (`evm_setNextBlockTimestamp`/`evm_mine`), Durable Object alarms and sleeping workflows. The world steps time and waits until quiet. | A fixture world: `clock +1 month` advances server time, database `now` (passed as a parameter, never the database's own `now()`) and the block timestamp to the same instant. |
| L5.02 | Moves made by time in the language and Solidity | L5.01 | blueprint, compiler, target-solidity | Time moves in the machine. Solidity `_period`, `_dueAfter`, `Reset`, `Expire`, `AllowanceNotDue`, `NotKeeper`. A lazy reset is worked out on the next spend. | `forge test` passes, with new cases for each time move from each state. |
| L5.03 | The keeper | L5.02, L3.06 | target-effect, generators, host-cloudflare | `generated/keeper`: a per-thing alarm set by grant, which fires expire through the relayer using the keeper's own narrow key. | In a stepped world, `clock +1 year` makes the keeper fire `allowance.expire` before the step returns. |
| L5.04 ∥ | Durable workflows for long waits | L5.01 | target-effect | `step.wait` as durable activities keyed by the request key, so a restart never runs a finished step twice. | Killing the Durable Object mid-way through `invitation.send` and restarting it gives one email, not two. |
| L5.05 | The on-time eval | L5.03 | prove | Eval 10: every move made by time happened when due, within its lateness. Lazy moves are checked at their first use. | Journey `monthly-reset` and an expiry journey print `on time ✔`. A keeper delayed on purpose fails the eval. |
| L5.06 | Keeper in production, watched | L5.05, L2.09 | host-cloudflare, prove | The keeper deployed on schedule and alarms. `watch` tracks lateness. | Staging shows keeper lateness in `architect watch`. |
| L5.07 | **Gate 5** | L5.06 | e2e | `nx run e2e:layer5`. | Locally and in CI, a journey moves a month and a year in seconds, reset and expire are both on time, and coverage is `moves 5/5`. |

---

## Dependency summary

**Critical path**

L1.01 → spikes S2–S6 with intake I1/I2 → D1, D2 → L1.10 → L1.11 → L1.12 → L1.13 → L1.14 → L1.15 *(skeleton)* → L1.20 → L1.21 → L1.24 → L1.25 → L1.32 → L1.50 → L1.51 → **Gate 1**
→ D3 → L2.01 → L2.02 → L2.03 → L2.04 → L2.05 → **Gate 2**
→ D4 → L3.01 → L3.04 → L3.05 → L3.06 → L3.08 → **Gate 3**
→ D5 → L4.01 → L4.02 → L4.03 → L4.04 → L4.05 → L4.06 → L4.07 → L4.08 → **Gate 4**
→ D6 → L5.01 → L5.02 → L5.03 → L5.05 → L5.06 → **Gate 5**

**Work that can run in parallel**

- **Spikes.** S2–S6 run in parallel with each other and with the three spikes already under way.
- **After L1.20.** L1.21, L1.22 and L1.23 can run together. L1.30 (scaffolds) runs alongside the runtime work.
- **After L1.25.** L1.32, L1.40 and L1.41 can run together.
- **Layer 2.** After L2.04, three things can run together: L2.06 (publish), L2.10 (portal), and L2.07 → L2.08 (auth and MCP). L2.09 (watch) starts after L2.05.
- **Layer 3.** After L3.01, three things can run together: L3.02 (wallets), L3.03 (auth kit), and L3.04 → L3.07 (chain and simulation). L3.09 (7702) is off the path.
- **Layer 4.** The path is mostly serial. L4.04's fuzz cross-check can be written while L4.05 is built.
- **Layer 5.** L5.04 (durable waits) runs in parallel with L5.02 and L5.03.

---

## Risks

1. **Cloudflare as the only runtime, run locally.** The things at risk are Miniflare's Durable Objects and D1, and Containers for Anvil, any of which could bite late.
   *How it's contained:*
   - S8 and D1 settle this before any language code is written.
   - The skeleton (L1.14) runs on Miniflare before anything widens.
   - target-effect's runtime is host-neutral behind a `Host` service, so a Node host is a contained fallback that doesn't touch generated code.
   - Containers aren't needed until L3.05, where local Anvil as a child process is the default anyway.
2. **The stepped clock and wait-until-quiet.** Detecting that a world is quiet across the server, the database, Durable Object alarms, the chain and the keeper is the hardest runtime problem, and layer 5 depends on it.
   *How it's contained:*
   - S7 spikes it now.
   - From L1.12, every wait goes through `Timers`, which counts work in flight, and the `no-wall-clock` lint rule (L1.40) forbids any other way to wait.
   - Wait-until-quiet is tested in L1.15, so by L5.01 only the chain and alarms are new.
3. **Type and generator complexity.** Inferring rich types from declarations can make `tsc` slow and its errors unreadable, and a change in Effect's version would ripple through every generator.
   *How it's contained:*
   - Generate the types handlers see (L1.31) rather than infer them deeply.
   - A type-performance budget in CI (`tsc --extendedDiagnostics`, failing on a regression).
   - Effect pinned exactly (D1.4), with upgrades done as their own steps.
4. **Scope creep across layers, and checks that are hard to make runnable.** Chain and kit ideas could leak into layer 1. Check 4 (an agent working from its brief alone) and "the server holds no key" could become judgement calls.
   *How it's contained:*
   - The gate rule, with later ideas kept in `design/later.md`.
   - Every gate is one e2e suite.
   - Check 4 is a scripted agent session with file access enforced by its config.
   - The no-key check reads the deployed state.
   - Solidity generation, where a bug could fail the same way in the generated tests, is cross-checked against the TypeScript machine by fuzzing (L4.04).