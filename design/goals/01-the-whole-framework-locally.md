# Goal 1: the whole framework, proven locally

## The prompt

> Read `AGENTS.md`, then this file, then `design/decisions.md`, `design/build-plan.md` and `design/packages.md`. You own
> the architecture: decide, record, keep going. Build all six stages below in order, each on top of the last, looping
> generate, run, fix until each check passes. After each stage, land it on `main`. Keep `design/handoff.md` current
> after every commit, so a fresh or compacted session picks up exactly where you stopped. Stop only when every stage's
> check passes, locally and in CI, or when you are blocked as `AGENTS.md` defines it.

## The bound

All five layers of the build plan, against local stand-ins for every cloud service, with no key and no cloud account:

| Cloud piece | Local stand-in |
|---|---|
| Workers, Durable Objects, alarms, D1, R2 | Miniflare (workerd), through wrangler and `@cloudflare/vitest-pool-workers` |
| Environments (test, staging, production) | One isolated local world each: its own Miniflare persistence folder, port and secrets file |
| Alchemy infrastructure | The generated Alchemy stack, applied to the local world; cloud apply is a config switch |
| Containers for benches | Anvil as a child process (the build plan's local default) |
| The chain | Anvil and Foundry, both installed |
| npm and Homebrew | Verdaccio (through `npx`, pinned) and a local tap repository |
| GitHub's OIDC token for verdicts | A local issuer with a throwaway key made per run; GitHub Actions' real token in CI, which is free |
| Axiom, the OTLP sink | A local OTLP sink (in-memory, or a file exporter) |
| OAuth for the MCP server and Better Auth | Both running inside the local world |

**Not in this goal (the cloud pass, later and with Aaron's yes on credentials):** real Cloudflare deploys, publishing
to the real npm and Homebrew, Axiom, and sign-in on a real staging host. Everything is built so that each of these is a
config change, not new code.

## The rules that shape the stages

1. **Each stage ends with something that works,** shown by a short command session in its check, and it's built on
   the stage before it.
2. **Evals are wide from the start.** Stage 1 lands all nine layer-one evals, each with a planted fixture that it
   fails. From then on, every new primitive lands with its eval and its planted fixture in the same commit. The eval
   count never goes down.
3. **Journeys and checks come from another agent.** Before each stage's builder work, a subagent that writes no
   handlers writes that stage's journeys and planted fixtures. The builder never edits them.
4. **Gates run everywhere.** Each layer's gate is `nx run e2e:layer<n>`, green on a clean checkout locally and in
   GitHub Actions.
5. **Landing.** Work goes on `layer/<n>`, with one commit per build-plan step. A stage lands on `main` by a pull request
   once CI is green and a 🔍 reviewer subagent that wrote none of it passes it. Then the next layer branch is cut from
   `main`.

## The stages

### Stage 1: the skeleton, with every eval

The allowance's first operation, `allowance.grant`, goes the whole way: declaration, model, generated api, server,
sdk and cli, served on Miniflare, called from the CLI, proven by a journey. The grant already has what every eval
needs: a machine (it enters `active`), an event (`AllowanceGranted`), a role, a step, a budget and declared errors.

Covers L1.01, D1 and D2, L1.10 to L1.15, and the grant's slice of L1.20 to L1.25. Spikes S2, S4 and S5 are folded
into the build.

**Works when:** `acme allowance grant --to olga --limit 500` prints an id, `architect prove --env local` prints
`allowance.grant 9 evals ✔`, and each of nine planted fixtures makes it exit 1, naming the call and the eval.

### Stage 2: the allowance's whole life, which is Gate 1

Spend, revoke and get. Refusals with deciding logs, exit codes, roles, reads, idempotency, both owners (`database`
with a version column and `actor` as a Durable Object, with spike S3's race test), blanks and scaffolds, `brief`,
`check` with the lint rules (spike S6), docs output, `impact`, the starter preset with Better Auth, and acme built by
Architect's own commands.

Covers the rest of layer one. Check 4 of the gate is a scripted `claude -p` session given only
`architect brief allowance.spend`, with the journeys denied by its settings.

**Works when:** `nx run e2e:layer1` passes.

### Stage 3: ship it, across local environments, which is Gate 2

The pipeline runs across local worlds: the generated infrastructure, test worlds made and destroyed per run (in CI
too), the logbook as a Durable Object with signed verdicts, versions worked out from the model diff, staleness,
`promote` from staging to production with the same artefacts, publishing to Verdaccio and the local tap, the remote
MCP server with OAuth, `watch` on the local OTLP sink, and the portal.

**Works when:** `nx run e2e:layer2` replays walkthrough steps 9 to 12. A change goes from test to staging to
production with a verdict in each, `@acme/sdk` installs from Verdaccio at `architect version --next`, the tap formula
installs and runs, and an MCP client signs in with OAuth and calls `allowance.get`.

### Stage 4: the kits and the chain, which is Gate 3

The kit format (D4), `std/wallets`, `std/auth` with SIWE, `std/chain` on viem, Anvil as a bench in the world, the
relayer as an actor, simulation, the chain follower with reorgs, and EIP-7702.

**Works when:** `nx run e2e:layer3` passes: `acme wallet create` and `link` work with a local key, 100 relayed
submissions land with nonces 0 to 99 and no gaps, a forced reorg produces a correction, and acme has no hand-written
viem import.

### Stage 5: the allowance on chain, which is Gate 4

D5, target-solidity (types, the compiled machine, EIP-712 signatures, generated Foundry tests, the contract scaffold,
and the fuzz cross-check against the TypeScript machine), the contract's Effect client, the signing flow through the
relayer, worlds with a vault per organisation on Anvil, and contracts redeployed per local environment only when the
bytecode changes.

**Works when:** `nx run e2e:layer4` passes: `forge test` on the generated tests passes, the journeys pass on Anvil
with each person signing, the move to the chain is reported as a major version, and the no-key check holds.

### Stage 6: time, which is Gate 5

D6, a stepped clock that drives the chain, the alarms and the workflows; moves made by time in both targets; the
keeper with its own narrow key; durable workflows; and eval 10, on time.

**Works when:** `nx run e2e:layer5` passes: a journey moves a month and a year in seconds, reset and expire are both
`on time ✔`, a keeper delayed on purpose fails the eval, and coverage reads `moves 5/5`.

## The loop, for every step

1. Write the step's "done when" check first, as a test or script, and watch it fail.
2. Build, run, read the failure, fix. Repeat until it passes and every earlier check still passes.
3. Mark the step done in `build-plan.md` with its proof, update `handoff.md`, and commit.
4. **Stuck rule:** after three different failed approaches to one problem, answer it as a spike in `spikes/<name>/`,
   record the decision, and go back to the step. If a local stand-in can't do what a check needs, record that, check
   the closest thing it can do, and put the remainder in the cloud pass.
5. **Disagreements:** if building shows the design is wrong or inconsistent, fix the design in the same commit and
   record it in `design/decisions/`.
6. Stop everything you start. No dev server, Miniflare, Anvil, Verdaccio or port is left running at the end of a
   step.

## Reporting

After each stage lands, write Aaron a short report for the ear: what works now, what was decided, and what's next.
Don't ask him anything unless you're blocked.
