# G1: local-first, re-sliced, evals wide from the start

Decided 16 November 2026, by the conductor, on Aaron's direction: "be as ambitious as possible", test the Cloudflare
pieces locally so there are no API keys, slice the layers so every milestone works, and get a wide range of evals in
as early as possible.

## The decision

1. **Every layer is built and gated on real services running on this Mac:** workerd with real D1, Durable Objects
   and R2, Containers on Docker, Anvil, Verdaccio, a real local tap, a real OIDC issuer and a real OpenTelemetry
   Collector. Nothing is faked or mocked (Aaron: "local but not fake"). The cloud is one later pass, behind config
   switches. The full map is in `goals/01-the-whole-framework-locally.md`.
2. **Gate 2 changes meaning.** "Production" and "staging" are isolated local worlds until the cloud pass. L2.01's check
   becomes `architect deploy --env sandbox` against a local world, and `destroy` leaving its folder and ports empty.
3. **Stage 1 pulls the grant's slice of L1.20 to L1.25 forward,** so all nine evals run, each with a planted fixture,
   before the allowance widens. This changes the critical path in `build-plan.md`. The steps stay the same; the grant
   meets them early, and the rest of the allowance meets them in stage 2.
4. **Spikes S2, S4 and S5 are folded into the build.** The build answers them for real. S3 and S6 run inside stage 2,
   where they're first needed.
5. **Process:** goals replace one thread per step (see `AGENTS.md`). Separate agents still write the journeys, and the
   🔍 review still gates each landing.

## Evidence

Installed locally: wrangler 4.45, Anvil, forge and cast 1.8.6, Docker 29, Homebrew, Node 24, pnpm 11, Claude Code (for
Gate 1's scripted agent check). Three spikes (durable-object, world-clock, names-from-paths) already ran on Miniflare
and Anvil with no cloud.
