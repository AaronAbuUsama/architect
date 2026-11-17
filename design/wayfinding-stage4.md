# Stage 4 wayfinding: kits and the chain

Opened 17 November 2026 by the conductor, after Gate 2 passed on main.

## Proven starting point

Main `6a4fe088027e1df1b21bae7350356c9d0909b823` passed all three jobs in
[run 44034847309](https://github.com/AaronAbuUsama/architect/actions/runs/44034847309).
The same clean main commit passed local Gate 2: eight files, ten tests, zero skips,
real Mac Homebrew, and verified cleanup. Captures 33–40 under `evidence/L2.11/`
retain the commands, source identity, results and resource boundary.

The full goal remains all five gates locally and in CI on main. Stage 4 is layer
three of the framework; its integration branch is `layer/4`, following the existing
stage-number convention (`layer/3` held Stage 3 / Gate 2).

## Unknowns to settle before building

1. **Kit declarations and provenance.** How a package declares finished operations,
   schemas, handlers, Effect services and choices; how a single project selection
   file brings those declarations into the model; how canonical kit identities,
   TypeScript identifiers, import paths, hashes, collisions and dependency edges
   stay distinct and deterministic. The generated runtime import rule and the
   declaration-only client surface must remain explicit.
2. **Wallets and authentication.** The Signer interface, encrypted local keystore,
   world-scoped test wallets, and CLI create/import/link/list. How the existing
   Better Auth adapter becomes a kit without changing its journeys, and how a real
   SIWE challenge links an address to the authenticated principal without replay
   or a person's key entering a server.
3. **Chain adapters and eligible versions.** Which exact viem and Anvil versions
   work together; what can be adapted from MIT reference implementations without
   adding their dependencies; how typed errors, receipts and signing fit Effect,
   telemetry and the existing service interfaces. Check publication timestamps
   against the actual fourteen-day rule when adding a dependency.
4. **A chain owned by a world.** Local child-process ownership and cleanup versus
   real Cloudflare Containers under local Wrangler in CI; isolated chain state,
   timestamp interval zero, and whole seconds. Never capture Anvil's default
   private-key output or leave a node running.
5. **Relaying and following.** Real Durable Object serialization for 100 concurrent
   nonces, replacement of a dropped transaction, receipt write-through, alarms,
   persisted checkpoints, chunked logs, reorg corrections and restart without
   double counting. Identify the actual Anvil reorg API at the selected version.
6. **Simulation and delegation.** The selected node's `eth_call` and
   `eth_simulateV1`, a real fork fallback when needed, and proof that a reverting
   simulation sends nothing. Verify Prague EIP-7702 support; defer L3.09 only if
   evidence shows it blocks the gate, as the build plan permits.

## Research receipts

Three independent read-only passes are complete. They inspected current source,
installed types and pinned upstream sources; they did not start services or
implement framework code.

- **Kits.** `compiler/src/modules/model/internal/layout.ts` rejects `kits/`;
  `model/types.ts` has no kit or provenance surface. Generator API/server imports
  reconstruct project paths, and `render/internal/names.ts` only normalizes
  dashes. Canonical kit identities cannot simply become paths or TypeScript
  identifiers. `Compare.dependsOn`, release staleness and impact need one shared
  dependency graph. The proposed pure descriptor plus separate declaration,
  Worker and Node exports requires a narrowly stated generated-import decision;
  correctness must not depend on tree shaking.
- **Authentication.** Better Auth 1.7.15's SIWE plugin creates a session for the
  wallet's user rather than attaching the address to the current session. Its
  [pinned implementation](https://github.com/better-auth/better-auth/blob/v1.7.15/packages/better-auth/src/plugins/siwe/index.ts)
  therefore does not satisfy linking by itself. Preserve Architect's Auth and
  Principal tags; investigate additive authenticated linking with durable replay
  state. Generated HTTP and MCP runtimes construct separate AuthD1 instances that
  share D1, so an instance-local association is insufficient. Test-person signing
  material belongs in the CLI/prove process; the server receives public links and
  signatures. Session show needs an explicit additive declaration/handler change.
- **Chain versions.** Installed Anvil/Forge 1.8.6 has an October 21 build. Prefer
  viem 2.57.15: [npm metadata](https://registry.npmjs.org/viem) records publication
  at November 3, 01:08:58.990 UTC, more than fourteen days before this research at
  November 17, 07:15 UTC. Its [release](https://github.com/wevm/viem/releases/tag/viem@2.57.15)
  fixes fee-field filling with Anvil 1.8.5 and later. This satisfies the actual
  age rule; November 2 was only a conservative research cutoff. Do not choose the
  older pin and add a workaround for a fix that is already eligible.
- **Reference code.** Adapt MIT concepts from
  [PRB Effect EVM 5.0.2](https://github.com/PaulRBerg/prb-effect/tree/3308c6d6254c5edfbf7e0d025f73f64f88d52c5f/evm)
  and [effective-indexer 0.2.10](https://github.com/cybervoid0/effective-indexer/tree/2da5efbd81a0a8b9296ac00152091786a87515a8).
  Neither becomes a dependency. The latter uses Effect 3 and Node SQLite, so its
  persistence implementation is not Architect's Durable Object implementation.
- **Runtime ownership.** Pinned Wrangler 4.156.1 and Workers types expose native
  `ctx.container`; [local Containers](https://developers.cloudflare.com/containers/guides/local-dev/)
  run through Docker without a cloud account. Source viability still needs real
  lifecycle proof. Current Busy and Timers implementations are process-local;
  durable alarms and cross-process quiescence must not be assumed to exist.

## Focused spike results

Each runs in its own existing worktree and touches only its spike directory.
They are throwaway experiments, never imported by framework packages.

1. `spikes/kit-package-exports/`, `c9be9c83`: published-style resolution,
   declaration emit/typechecking, real workerd execution, and negative checks for
   Node/runtime crossing into API or Worker bundles pass. Capturing the Effect
   service Context or retaining it with `provideMerge` is necessary. These are
   representative generated shapes, not production compiler support.
2. `spikes/world-anvil-container/`, `c28a5d25`: seventeen real Mac checks pass:
   native DO ownership, Anvil RPC, fixed whole-second timestamps, explicit end,
   isolation, alarm expiry, failed startup and resurrection refusal. Cleanup also
   tracks Wrangler's unlabelled proxy sidecars by unique run identity; three
   Anvil containers and three proxies were removed, nine existing containers
   preserved. Node 24/Linux CI execution remains unproven.
3. `spikes/authenticated-siwe-link/`, `b11d5777`: twenty-six real workerd/D1
   checks pass, including exactly one concurrent successful consume, unchanged
   person/session/email, and persistent replay refusal after runtime restart.
   Keys remained in Node client memory. This proves EOA linking, not contract
   wallets, a keystore, or unchanged starter journeys.

All three have independent read-only source/retained-receipt passes. The reviewer
did not rerun the experiments. Each commit is confined to its spike directory;
each gets its own record pull request into main with fresh CI and serialized
model-budget reservations. Generic earlier-gate CI does not execute the spike
scripts and cannot prove their untested portability. The kit record is in PR23;
the others follow after the paid-job reservation is released. The conductor keeps
the full goal active while those records land. PR23's first run hit implicit CLI
test deadlines. The separate author's three per-body sixty-second caps landed in
PR24, and main764 passed all jobs; assertions, runtime and domain budgets are
unchanged. Refreshed PR23 then passed all jobs and merged at e3a551b9. Its main
CI44055581164 is running before the next spike record can land. One of three
records has merged; no production kit implementation is claimed.

All three experiments stopped their owned services and released ports
19100–19109, 19120–19129 and 19140–19149. No production implementation has started.
Future full gate runs remain exclusive.

The conductor has folded the kit/source receipts into [D4](decisions/D4.md),
including the selected-kit import amendment and raw Promise dependency behavior.
An independent contract audit found that putting a foreign callable or its
failure mapper in a dependency descriptor would leak that runtime through the
API's whole-operation imports. D4 now separates a vendor-free declaration from
`src/dependencies/<alias>.ts`, with the one blank in the latter. Callable types
are inferred there and stay out of client declarations. A Node-capable SDK closure
and client typecheck are required acceptance cases. The kit factory, generated SDK
paths, HTTP/MCP names and generated dependency service invocation are also explicit.
The same independent reviewer passed the correction at `66e28fb7`; the contract
is frozen for authoring. The package rules and affected documentation now agree.
The separate author on
`author/stage4-checks` now owns the Stage 4 acceptance matrix and immediate L3.01
journeys/fixtures/red checks, with ports 19160–19179 reserved. That author writes
Stage 4 journeys,
planted fixtures and checks, with their failure on empty handlers recorded before
builders start. Builders never edit those checks or the generic eval runner.

The stage ends at L3.10: real wallet create/link, 100 relayed nonces without gaps,
a forced reorg correction, and no handwritten viem import in acme, verified by
`nx run e2e:layer3` locally and in CI on main. Later layers remain closed.
