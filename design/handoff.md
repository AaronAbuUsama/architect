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

Stage 1 (`layer/1`, now on main). Done: wayfinding (`wayfinding/stage-1.md`, decisions D1 and D2), L1.01, L1.10 to L1.15, each
with evidence in `evidence/`. Packages: `blueprint` (declarations, journeys and their checks), `compiler`, `cli`
(`architect model`, `dev`, `prove`), `target-effect` (`Handlers.serve` with who-may-call, `move`, answer/refusal/move
evidence on the span, `Journal`, `Busy`, `Timers`, `Principals`, `Records`, `Ids`, `Wire`), `host-cloudflare`
(`Database.d1`, `RecordsD1`, `JournalD1`, `Telemetry` (per-request OTLP), `Tokens`, the `World` Durable Object and its
facts door), `generators`, and `prove` (`Worlds` (moved from cli), `Collectors` (a real OTel collector in Docker),
`Journeys`, `Evals` (all nine), `Prove`). `architect prove --env local` in `examples/acme` prints every eval ✔ and
`prove ✔` in about 6 s and leaves nothing running; `packages/prove/src/modules/prove/prove.test.ts` is the gate: acme
passes, the scaffolded handlers fail, and each of the journey author's eight planted fixtures fails its own eval.
Decisions for L1.15 are D2 #24 to #32. Run Nx with `NX_DAEMON=false` after changing generator code. Stage 1 landed on main on 16 November 2026 (pull request #1, merged with CI green after a 🔍 review that passed).
Next: stage 2 (Gate 1, the allowance's whole life) on `layer/2`: wayfinding first (`wayfinding/stage-2.md`: list the
unknowns, research them in parallel subagents, spike what research can't settle), then a journey author writes the
stage's journeys and planted fixtures, then the build steps. The build plan's L1.20 to L1.25 rows were built only as
far as grant needs (move, event, steps, budgets, the evals); their remaining parts (reads, idempotency, `step.wait`,
spend, one transaction for a move) belong to stage 2. The evidence page is
https://claude.ai/artifact/ChdX1m7bdTxTS1FGF2EZxB; republish it with `python3 tools/evidence/page.py` after each step.

## Open

- A last consistency review of the design docs was still running at handoff. Its findings, if any, are small fixes to
  `docs/index.html`; the decisions and the build plan are the contract and don't depend on it.
- `docs/source/` holds the files the docs page was built from; the build script points at the design session's working
  folder, so treat `docs/index.html` as the artefact and edit it directly, or rebuild the docs as a step later.
