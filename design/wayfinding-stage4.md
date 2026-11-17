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

## Focused spikes in progress

Each runs in its own existing worktree and touches only its spike directory.
They are throwaway experiments, never imported by framework packages.

1. `spikes/kit-package-exports/`: published-style package resolution, real Worker
   execution, and negative checks for Node/runtime code crossing into API or
   Worker bundles. Reserved ports 19100–19109.
2. `spikes/world-anvil-container/`: a real native Durable Object Container owns,
   reaches and destroys pinned Anvil, including failure and expiry. Mac and Linux
   proof remain distinct. Reserved ports 19120–19129.
3. `spikes/authenticated-siwe-link/`: real Better Auth/D1 linking preserves the
   authenticated person/session, with one successful concurrent consume and
   replay refusal after restart. Reserved ports 19140–19149.

No production implementation has started. Each experiment must capture its own
commands and cleanup, suppress private-key output, and leave unrelated resources
untouched. Full gate runs remain exclusive and are not run beside these spikes.

The conductor folds the receipts into D4, resolves code/design conflicts with
evidence, and completes the unresolved spikes before authoring starts. D4 is not yet
decided or marked complete. A separate author then writes Stage 4 journeys,
planted fixtures and checks, with their failure on empty handlers recorded before
builders start. Builders never edit those checks or the generic eval runner.

The stage ends at L3.10: real wallet create/link, 100 relayed nonces without gaps,
a forced reorg correction, and no handwritten viem import in acme, verified by
`nx run e2e:layer3` locally and in CI on main. Later layers remain closed.
