# Context pack for the blueprint refactor (16 November 2026, 08:15 UTC)

From the 🎼 cloud conductor, for Aaron's local thread on `slice/blueprint-studio`. Read this with the brief
(`blueprint-studio-brief.md`). It gathers everything so nothing has to be rediscovered. Facts are as of `master` 5657dbe
unless marked.

## 0. The situation in one paragraph

All work is paused (Aaron, 16 November 2026, about 08:00 UTC) so the blueprint system can be refactored first. No lane
is building, no world run or deploy is pending, and nothing is left running in Cloudflare or Neon beyond the standing
shared world and the hub doors. Finished work waits in open pull requests (section 5). Milestone 3 is complete.
Milestone 4 (measurement) was cut short and a cleanup milestone added after it, by Aaron's yes this morning; the state
designer's #476 writes that into the roadmap.

## 1. What Aaron wants (his words, condensed)

- The blueprint becomes its own product: a framework for declaring what a system is, measuring it and proving it.
  Capxul imports it. An agent writes the declarations by importing the package; everything else is generated or checked
  against them, so nothing drifts.
- People understand and change it through a visual app, not code (HeroUI Pro, licence held; design in Figma first;
  Fumadocs or its components for docs; a Notion-style editor for prose). Two-way: blueprint changes show in the app; a
  change asked for in the app becomes a blueprint change made by an agent.
- The way work gets done is codified as blueprint things: goal, milestones, tasks, threads, handbacks. Agent-agnostic:
  Claude Code, Codex, or a Pi agent in the app. Longer term, move off Claude Code and Codex onto a Pi-based harness,
  with the HeroUI chat template as its face.
- Precisely: what is a blueprint, what does it do, what does it generate, what are the primitives and state machines,
  what is part of the blueprint package and what is Capxul. Audit what exists and the current plan, then make a new plan
  with the cuts.
- Answers this morning: the roadmap's tables generated from a plan declared in the blueprint (yes); the sitrep package
  (paused, folded into this work); a `state` branch (no: state leaves git, see section 4).
- Cleanup after milestone 4: "we start doing too many optimizations before things are done… I want to go back and clean
  up the entire code base… we may have to refactor some other things over there too."

## 2. The handover map (read this next)

`docs/design/blueprint-open-work.md` (#478, landing now; branch `work/blueprint-open-work` at 04866d90 until merged),
by the lead who built milestone 3. It covers, with file paths:

1. Every ratchet and its count: R1 666, R2 743, R3 38, R5 13, R6 306, R7 17, R8 10, R10 63, R15 599 words, R16 16,
   R17 21, R18 21, R19 8, R20 15; registered but uncounted R4, R9, R11, R12, R13, R14 and what will count each.
2. Everything planned and unfinished: `docs/design/blueprint.md` parts 5, 8, 10, 12, 14, 15; roadmap 3.7, 4.1, 4.2,
   4.7, 4.11 (#347), 5.1 to 5.4, 6.1, 7.2; `docs/design/docs.md`; `docs/design/sitrep.md`; deferred items.
3. The dated decisions that shaped the blueprint, and five things its author would do differently (count from day one;
   one ratchet per gap; drop the hand-typed domain table; ratchet lists in the registry, not in lint; measure before
   declaring steps).
4. Where the framework ends and Capxul begins, and what's tangled: Capxul paths inside `blueprint-tools`;
   `packages/generate` straddling both; `packages/lint` holding Capxul rules and ratchet data; the status feed; generated
   code checked in beside declarations.
5. The CLI: generated (command paths), derived at run time (tree, flags, schemas, exit codes, serving group),
   hand-written (login/logout/use, profile, target, help, `callVia`), and meant to be generated but not (the CLI tree as
   an artefact, the pipeline's commands, Frappe's and the Safe's commands, help text, real sign-in).

## 3. Telemetry and the blueprint (from the telemetry lead's pause report)

- **Declared** in `packages/blueprint/src/telemetry/` (759 lines): `envelope.ts` (every attribute key with its schema
  and where it applies), `values.ts`, `producers.ts` (service names per process), `step-kinds.ts`, `metrics.ts`,
  `datasets.ts` (Axiom datasets per grade and signal, Cloudflare destinations), `watch.ts` (the 1.5 review factor,
  monitors, dashboards), `conventions.ts` (OTel semconv 1.37.0). Declared steps (spans) and logs live per verb in
  `src/things/<thing>/verbs/*`, and the pipeline's in its work verbs.
- **Nothing is generated from it.** Processes import it directly (Core, platform collector, world, runner, lint,
  blueprint-tools). Axiom's datasets, monitors and dashboards are not created from the declarations.
- **A duplicate owner:** Core keeps its own attribute keys (`core/src/telemetry/attributes.ts`: `SPAN_ATTRIBUTES`,
  `WARP_ATTRIBUTES`); the runner imports them from Core.
- **The flow:** Core exports OTLP per request (Effect's exporters) to the collector Worker on staging
  (`packages/platform/src/collector/`), which checks a per-world token, stamps world, stage and grade, and forwards to
  Axiom (`capxul-test-*`). In test worlds Core also writes a tap (`telemetry.otlp` table), which the runner's generic
  checks read since the flip. Cloudflare's Workers Observability also sends to Axiom (`capxul-cloudflare-*`). Core still
  writes `app.spans` on master; #471 removes it.
- **Checks built:** one operation span per call, outcome, declared events with their contents, path through the
  machine, timings. **Not built (4.1):** "a declared step that is missing fails the call", "one log where each refusal
  is decided".
- **Ratchets:** R6 undeclared spans 306 (`lint:declared-steps`; `STEPS_CEILING` 315 should drop to the list's total);
  R14 own telemetry tables (closes after #471); R18 operations without steps and logs 21.

## 4. State leaves git: the logbook (Aaron's yes, 16 November)

`docs/design/state-store.md` (#476, landing). The logbook: a Cloudflare Worker on SQLite Durable Objects (an index
object, one object per run), R2 for files, telemetry stays in Axiom. Git keeps only what is reviewed. Only CI writes a
verdict, proven by GitHub's OIDC token. Its things and verbs are declared in the blueprint, so the CLI, SDK and app make
the same calls. Under a dollar a day. Records are deleted from the tree after moving; history is not rewritten.

Aaron's six yeses: the logbook replaces the proofs branch with OIDC as notary; "State is not in git", history kept; an
exception to "destroy everything" for the logbook; one agents' write token via the proxy; "logbook" in the glossary;
drop the sitrep's `state` branch. Effective now: proofs cite CI runs (run id, job ids, artifact); no records are
committed. **Constraint for this work:** a generated roadmap holds the plan only, never step state, or every verdict
would break `generate:check`; step state lives in the logbook and the app joins the two.

## 5. Paused work: open pull requests and branches

| What | Where | State |
|---|---|---|
| 3.9, the CLI's grammar | #473, `slice/cli` d99e155d into master | Green, both 🔍 passed, not merged |
| Telemetry landing 11: retire `app.spans` (migration 0012), chain-read follow-up | #471, `slice/telemetry` 15b2f3cd | Green, 🔍 passed, not merged; needs a master merge; its proof is a world run |
| Starting points take the journey's cast | #347 into `slice/blueprint` | Held for the speed lead |
| Speed proof for landing 3 | #477 draft | Must drop its records and cite run 43819398010 |
| Speed lane, into `slice/run-time` (3cd9c20) | #456 sites check, #464 log-scan fix, #465 door company pool and machine profile, #467 own worlds from nothing, #468 layered destroys, #474 parallel `world.create`, #475 parallel snapshot save; #460 and #470 carried | All drafts. Resume order #456, #464, #465, #467, #468, #474, #475; then builder C (world client, runner plumbing, the profile cap), A-1, B-3 |
| Speed lane, also | #461 Track A's tests (A-1's cases still todo), #430 the `RUNNER_JOURNEYS` smoke for platform deploys | Drafts, held. True heads: #467 7647143, #468 8530f8e, #474 0205030, #475 99d34f5 (stacked on #474) |
| State store note | #476 | Landing (documents) |
| Blueprint handover | #478 | Landing (documents) |

Speed's measured state: the last green run is serial, 9/9 in 35.4 minutes (run 43819398010). Shared runs fail at the
bench host (a `t3.large`) making company sites. Chain reads were 457 s of that run (eth_call 227, eth_getLogs 178).
Projected 5 to 6 minutes with ready company sites, the own-world track and the world track.

## 6. How the work was run (what to codify)

- Threads by type (`.agents/skills/threads`): 🎼 conductor, 🧭 lead per lane on `slice/<lane>`, ✍️ author writes
  journeys and checks first, 🔨 builder does one PR, 🔍 reviewer, 📐 designer, 🖥️ local.
- The landing queue: one landing into master at a time; a lead sends "landing #N now" and waits for "go"; the head must
  include the current master with a fresh `gate`; world runs hold master until they end. Leads merged before "go"
  several times; the rule needs teeth.
- World runs paused except the speed lane; drafts skip world; deploys and world runs share the `staging-bench` lock.
- Every decision is dated in `docs/decisions.md`; a roadmap decision needs Aaron's written yes; a blueprint delta is the
  lead's call.
- Aaron listens by text-to-speech; messages between threads stay exact.

## 7. Where things are

- Repository AaronAbuUsama/capxul-next, line `master` (never `main` or `integration/build`).
- Docs: `AGENTS.md`, `docs/roadmap.md`, `docs/decisions.md`, `docs/guides/`, `docs/design/blueprint.md`,
  `docs/design/blueprint-open-work.md`, `docs/design/state-store.md`, `docs/design/sitrep.md`, `spikes/sitrep/`.
- Packages: `packages/blueprint-tools` (framework), `packages/blueprint` (declarations), `packages/generate`,
  `packages/lint`, `packages/cli`, `packages/sdk`, `packages/core`, `packages/runner`, `packages/scenarios`,
  `packages/world`, `packages/platform`.
- Pages: the sitrep, https://claude.ai/artifact/CjRhEey4CEwXciharu1bPF (its hourly dashboard refresh is switched off).
