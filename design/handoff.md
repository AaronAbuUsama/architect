# Where everything stands

Kept by the 🎼 conductor, so a fresh conductor can take over. Last updated 16 November 2026, at handoff from the
design session.

## Done

- **The design.** Decisions in `decisions.md`, the build plan in `build-plan.md` (49 steps, five layers, a gate per
  layer), the packages in `packages.md`, the design docs in `docs/index.html` (also published, privately to Aaron, at
  https://claude.ai/artifact/K7KtHJwu7YzZe43BeSPHo2).
- **Three spikes,** each a yes with rules attached: names from paths, the world clock, a thing as a Durable Object.
  Write-ups with full code in `spikes/`; intake steps I1 and I2 in the build plan are already folded in.
- **Decided on 16 November 2026, beyond the docs:** the database is Cloudflare-native (D1, each Durable Object's own
  SQLite, R2 for exports; no Postgres); the monthly reset counts calendar months from the grant; multi-word file names
  keep their dashes and the compiler maps them; sign-in in layer one is a built-in Better Auth adapter that becomes the
  auth kit in layer three.

## Next

1. Done: the GitHub repository, public since 16 November 2026 (Aaron), so Actions minutes are free. CI is green on `layer/1`.
2. Goal 1, the whole framework proven locally, in six stages, one per gate, with stage 1 being the skeleton with
   every eval: `goals/01-the-whole-framework-locally.md`. Why it's sliced that way: `decisions/G1-local-first.md`.
3. After that, the cloud pass, which needs Aaron's yes on credentials.

Aaron's rule from 16 November 2026: the building agent owns the architecture and asks only when blocked (see
"Who decides" in `AGENTS.md`).

## Where the goal stands

Stage 1. Wayfinding is done (`wayfinding/stage-1.md`, `decisions/D1.md`). L1.01 is done on `layer/1`. Next: D2's record, then L1.10, the language core.

## Open

- A last consistency review of the design docs was still running at handoff. Its findings, if any, are small fixes to
  `docs/index.html`; the decisions and the build plan are the contract and don't depend on it.
- `docs/source/` holds the files the docs page was built from; the build script points at the design session's working
  folder, so treat `docs/index.html` as the artefact and edit it directly, or rebuild the docs as a step later.
