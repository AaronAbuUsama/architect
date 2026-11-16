# N1: Noir on Aztec as a later target, and the seams layer two keeps open for it

Decided 16 November 2026, by the building agent, from the Noir handoff (`design/noir/addendum.md`, with the two spike
reports and the design study beside it). The Noir work runs in its own thread; this records what it changes here.

## What the handoff is

Two code spikes ran the allowance on Aztec 5.3.0 on a local network. They validated a `target-noir` that generates the
same shape as the Effect and Solidity targets (states, moves, coded refusals, the machine, a scaffold with blanks, an
Effect client over Aztec's artifact), and a set of primitives Architect lacks: `visibility`, `runs`, `custody`,
`takesEffect`, time moves as guards with no keeper, sponsored fees, and a `network` test kind. Aaron's direction after
the spikes is product, not framework: a private Capxul on Aztec, built in six layers from a private organisation account.

## Decisions

1. **The five layers and their gates don't change.** Noir on Aztec is a sixth target that comes after Gate 5, like
   Python. Its own layer gets a build-plan section only when Gate 5 is on `main`. Recorded in `design/later.md`.
2. **The private Capxul layers are a product roadmap built with Architect, not part of Architect.** They live with the
   Noir thread's records; Architect takes from them only primitives that a gate proves.
3. **Layer one is already on `main`, so the handoff's "cheap layer-one items" become one layer-two step, L2.P,** after
   L2.04 and before L2.08 (MCP) and L2.09 (`watch`). Those two are the first consumers outside the server to read
   arguments and telemetry. Building them before the seams exist would bake in "everything is public".
   L2.P adds, each with a default that keeps today's behaviour:
   - `visibility` on fields, events, arguments and refusal payloads, defaulting to `public`; the compiler carries it
     into the model;
   - `runs` on operations, defaulting to `server`; only `server` is accepted until a target supports another;
   - telemetry through an attribute allowlist built from `visibility`: a public field's value may be an attribute, a
     private one never is. Today `target-effect` writes every `payload.<field>` as an attribute
     (`packages/target-effect/src/modules/handler/service.ts`), so this is the one item that changes behaviour;
   - refusal codes stable across targets, `[AL-002] Name { field: value }`, added to the error's answer and never
     replacing the tag;
   - the step list open to new kinds (`sync`, `check`, `prove`), which costs nothing beyond not closing the union;
   - a test-kind marker, so a target can say a guarantee needs a network test.
4. **Not taken now:** `custody`, `takesEffect`, time moves as guards, fees and the `std/aztec` kit. Each needs a chain
   target to prove it. Stage 5 (Solidity) and stage 6 (time) wayfinding read `design/noir/` so their clock and kit
   seams don't close off a client-proved target. In particular, the clock primitive declares, per target, what time it
   can trust.

## Open, for the Noir thread

The things the handoff itself marks unvalidated: key rotation after a revoke, two members racing, a production fee
payer, proof verification, browser proving, version 6, bridging, pool funding.
