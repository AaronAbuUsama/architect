# Where everything stands

Kept by the 🎼 conductor, so a fresh conductor can take over. Last updated 16 November 2026, mid stage 3 (Gate 2). The section "Where the goal stands" ends with what is in flight now.

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
Stage 2 (Gate 1) is on `layer/2`. Done: wayfinding (`wayfinding/stage-2.md`, decisions in
`decisions/D2-stage-two.md` #35 to #48); the journey author's stage-two journeys and planted fixtures (in
`examples/acme/journeys/`, `blueprint/starting-worlds/funded.ts`, `test/fixtures/{types,check}/`: never edit them);
L1.20 (commit b150981, evidence in `evidence/L1.20/`), which also built L1.23 (reads, idempotency) and L1.22's bob
journey. The store is `host-cloudflare/store` (`StoreD1`, D1 batch plus actor routing) and `host-cloudflare/actors`
(the `Actor` DO); the runtime's `Records` holds writes back and the wrapper commits once, retrying conflicts.
`prove` passes on acme's six journeys. Also done, each with evidence and CI green: L1.21 (a refusal's span carries
`refusal.log`; `generators/src/modules/render/handler-type.test.ts` compiles a copy of acme with the author's
undeclared-error fixture and expects tsc to fail), L1.24 (step spans carry `step.kind`; the steps eval checks declared
order from span start times), L1.25 (coverage is each operation's eighth eval, so `9 evals ✔` per operation, plus one
coverage line), L1.30 (`Blueprint.todo` blanks, `architect add thing|operation|read|journey`), L1.31 (`architect
generate`), L1.32 (generated docs and `edges.json`, the full SDK and CLI with exit codes and `--json`), L1.33
(`architect brief`), L1.40 (`architect check`: blanks, types, rules, drift, ratchets; the oxlint plugin is
`packages/lint`, run through real oxlint with the model's facts as rule options; the author's four
`test/fixtures/check/` fixtures each fail it). L1.41 (`Compare` in the compiler; prove writes
`.architect/evidence/proven.json`; `architect impact` prints stale, proven, unproven). Decisions through D2 #60. L1.50 (commits 8107b6d, 163b5ef, 02623af; evidence in `evidence/L1.50/`): `examples/starter` (system, person and session
on Better Auth, organization, membership, invitation, api-key; 5 journeys, 11 ops × 9 evals); Better Auth is
`host-cloudflare/auth` (`AuthD1`, tables `auth_*`, keys `ak_`), the runtime's `Auth` service is in target-effect;
`packages/preset` writes the starter; the nine published packages build to `dist/` (imports spelled
`#modules/….js`, D2 #67) and `tools/e2e/starter.sh` (CI job `starter`) publishes them to Verdaccio, runs
`create-nx-workspace --preset=@architect/preset`, then check and prove in the new workspace. Decisions through D2 #72.
L1.51 done (commit 79be956, evidence `evidence/L1.51/`): acme is the starter plus the allowance (D2 #73).
L1.60 done: Gate 1 passes locally and in CI (4218f19, run 43951988847; evidence `evidence/L1.60/`). `e2e/` is a
workspace project; `nx run e2e:layer1` runs the seven checks of D2 #74 from `e2e/layer1/0N-*.test.ts`, each in a copy
outside the repository (`support.ts` `copyOf`): 19 tests, check 3 covering all nine evals (performance's break is a
slow grant, D2 #77). Check 4 runs on the Claude Agent SDK with only our tools, traced into prove's collector (D2
#76); in CI it is skipped with a message until there is an `ANTHROPIC_API_KEY`. Test copies skip dot-folders (D2
#78). The 🔍 review failed once (transitive packages under two weeks old) and passed after the fixes: pnpm's
`minimumReleaseAge` enforces the rule tree-wide (D2 #79), and a prove with a failing journey proves nothing (D2 #80).
Decisions through D2 #80.
Stage 2 is on main (PR 2, merge e9e3194, main CI green).
Stage 3 (Gate 2) is open on `layer/3`. Wayfinding is done: `wayfinding/stage-3.md` (research R1–R4) and
`decisions/D3.md` (#1–#13 how shipping runs on local worlds; #14 the command surface; #15 Gate 2's eight checks).
L2.03 done on `build/L2.03` (the logbook, `packages/logbook`; decisions D3 #30 to #34; evidence `evidence/L2.03/`): a
worker with a Durable Object and R2, `POST /verdicts` with a verified OIDC token, and `Logbook.launch` for the CLI's
`env up logbook`, which the conductor wires once L2.01 lands.
L2.07 done on `build/L2.07`, the local reading (device sign-in; decisions D3 #40 to #44; evidence `evidence/L2.07/`):
Better Auth's `deviceAuthorization` is in the server's auth, `/api/auth/*` is mounted in the generated server, and
`acme session sign-in --env <env>` / `session show --env <env>` work against a real local world (ports 8960 to 8961 in
`prove/world/device-sign-in.test.ts`). The real staging sign-in is the cloud pass.
Now (16 November 2026, evening). On `layer/3`: the three spikes are done and merged into main (PRs 5 to 7), the ✍️
author's Gate 2 checks are in `e2e/layer2/` (red for the right reason), and L2.01, L2.03 and L2.07 are merged
(HEAD bb51313). In flight, each a 🔨 builder subagent in its own worktree, branching from `layer/3`: L2.02 (test
worlds, `prove --env test` posting signed verdicts, `worlds reap`, the logbook wired into `env up`; D3 from #50) on
`build/L2.02`, and L2.04 (versions, staleness, `Blueprint.read` where/order/page; D3 from #60) on `build/L2.04`.
Merge each into `layer/3` when it reports (run `pnpm nx reset` before `nx sync` after merging generator code, or the
daemon writes from the old generator). Then L2.P (privacy seams, decision `N1-noir-target.md`), L2.05, L2.06, L2.08,
L2.09, L2.10 and Gate 2 (L2.11: CI job `e2e-layer2`, evidence, the 🔍 review, PR to main).
Side work: the agent harness is designed (`decisions/H1-agent-harness.md`, on main) and waits on Aaron's four answers
(the Command Code key's provider, reading the key by name from config, free or paid models, machine or Docker as the
sandbox). The Noir on Aztec handoff is filed in `design/noir/` as a later target (N1). Don't build either on a layer
branch.
The evidence page is https://claude.ai/artifact/ChdX1m7bdTxTS1FGF2EZxB; republish it with
`python3 tools/evidence/page.py` after each step. For plants, back up with `cp` and restore with `cp`, never
`git checkout`.

L2.01 (local reading) is built on `build/L2.01` (decisions D3 #17 to #25, evidence `evidence/L2.01/`): `architect build`
(`built <rev> sha256:<hash>`, kept at `.architect/artefacts/<rev>/main.js`), `architect env up|down|status <env>` for
test, staging and production (state under `.architect/environments/<env>/`), `GET /_architect/bundle`, and the
declarations `Blueprint.environment|config|secret`, `Identity`, `Cloud`, `Deploy` read into `model.environments`. The code
is in `packages/prove` (`build`, `environments`, and `Worlds.launch`). The Alchemy stack and `architect deploy` wait for
the cloud pass. The logbook (L2.03) plugs in at `OWN_WORKER` in `packages/prove/src/modules/environments/service.ts`.

L2.04 done on `build/L2.04` (decisions D3 #60 to #68; evidence `evidence/L2.04/`): reads list (`where`, `order`, `page`, `{ items, next }`;
the store's `list`, generated api, server, sdk, cli and docs), `Compare.release` (minor, major, patch) and `architect version --next`,
`architect impact` with `next` and `stale <ops> in <envs>` from the logbook (found by `ARCHITECT_LOGBOOK_URL`, else the `logbook`
environment's pidfile), `generated/model/changes.json`, and `Releases.record` in `@architect/prove`, which L2.05's `promote --to production`
calls. Check 3 of Gate 2 also needs L2.02 (`prove --env test`, `env up logbook`) and L2.05 (`promote`).
L2.02 (local reading) is built on `build/L2.02` (decisions D3 #50 to #56, evidence `evidence/L2.02/`): `architect prove --env test`
(`world test-<id> · expires in <lifetime>`, the journeys and evals, `verdicts <op> ✔ …   (revision <rev>)`, `world destroyed`), with each
world a Durable Object with an alarm in the test environment (`host-cloudflare/world`, `/_world/worlds`), `architect worlds reap`
(`reaped <n>`), `env status test` adding `worlds <n>`, and `architect env up|down|status logbook` through `Logbook.launch`. The test
environment has its own collector (a container `env down` removes). `prove` now depends on `@architect/logbook`, which `tools/e2e/starter.sh`
publishes with the rest. Author's checks 01 and 02 pass. The GitHub Action (`test-pr-<n>`) is the cloud pass's.

L2.L (branch `build/L2.L`, D3 #70, evidence `evidence/L2.L/`): Aaron's layout call. Handlers are `src/<thing>/<operation>.ts`, mirroring `blueprint/things/`; there is no `implementation/` folder, and a thing's contract and workflows join its folder in later layers. The e2e files still say `implementation/`; the journey author updates them.

## Open

- A last consistency review of the design docs was still running at handoff. Its findings, if any, are small fixes to
  `docs/index.html`; the decisions and the build plan are the contract and don't depend on it.
- `docs/source/` holds the files the docs page was built from; the build script points at the design session's working
  folder, so treat `docs/index.html` as the artefact and edit it directly, or rebuild the docs as a step later.

L2.05 (local reading) is built on `build/L2.05` (decisions D3 #90 to #98; evidence `evidence/L2.05/`): `architect promote --to staging|production`
(`Promote` in `@architect/prove`): the exact built bundle, refusing a dirty tree, an unbuilt bundle and a revision without `main` verdicts (test earns
staging, staging earns production), checking `/_architect/bundle`; staging is proved where it runs (`Prove.against`, people signing up through Better
Auth; staging has its own collector now) and posts staging verdicts; production records the release and carries staging's verdicts. One token source
(`Verdicts.sourceOf`). Author's checks 01, 02, 03 and 06 pass; 04 and 05 call `promote --to staging` without `prove --env test` (the author must add it);
publishing is L2.06's, the MCP server L2.08's, watch L2.09's, the portal L2.10's. `/_world/*` is still open on every environment (D3 #96, `later.md`).
