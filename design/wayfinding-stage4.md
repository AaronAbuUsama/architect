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

## Current research and next checks

Three independent read-only researchers own kit/compiler integration, wallets/auth,
and chain/runtime behavior. Each reads current code and pinned primary sources,
returns exact source references and concrete interface sketches, and identifies
only the questions that require a throwaway spike. No implementation or service
is started by the research pass.

The conductor folds those receipts into D4, resolves code/design conflicts with
evidence, and runs the unresolved spikes before authoring starts. D4 is not yet
decided or marked complete. A separate author then writes Stage 4 journeys,
planted fixtures and checks, with their failure on empty handlers recorded before
builders start. Builders never edit those checks or the generic eval runner.

The stage ends at L3.10: real wallet create/link, 100 relayed nonces without gaps,
a forced reorg correction, and no handwritten viem import in acme, verified by
`nx run e2e:layer3` locally and in CI on main. Later layers remain closed.
