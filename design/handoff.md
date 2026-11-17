# Where everything stands

## START HERE (17 November 2026, the conductor, for whoever continues: Claude Code or Codex)

**The goal** is `goals/01-the-whole-framework-locally.md`: all five gates passing locally and in CI, on `main`, in six
stages. The rules are `AGENTS.md`; the thread kit (conductor, threads, spike, reviewer, hashtags) is `.agents/skills/`.

**Current frontier.** Stages 1 and 2 (Gate 1) are on `main`. All layer-two build steps and review corrections are
integrated on the conductor branch; L2.11 passed locally; Linux CI and final independent review are next. Framework/author source is
`543611e`; main has been refreshed through `ca2fbf2` (F3 brief, separate Noir and E2B spike records, no framework imports).
The conductor uses its managed worktree on `codex/conductor-goal-01`, then pushes verified integration to `layer/3`.
The original checkout and ignored template files stay untouched.

**Local Gate2 is green and runtime reservation is released.** `build/L2.11` ran from clean committed candidate
`2b2aa3cc77ce9762d43ca98193e9acf2319c3897` (parent `759ebb4`):8files,10tests,0skips,283.2s. Real Macarm64
Homebrew installation executed. `02-local-gate.txt` and `03-cleanup.txt` were copied unchanged after merging the
single code commit. Cleanup proves zero Architect containers, exact gate-port listeners, gate taps/formulas and own
runtime processes. Two unrelated pre-existing Python document viewers on8978/8979 were preserved. No runtime
worker is active. The integrated CI wiring pins Node24.22.2 and requires Linuxbrew; it must now run in GitHub.

**First full Linux gate result: functional checks pass, cleanup is red.** Run `44014044365` on `7f662af` ran all10
Gate2 tests, including real Linuxbrew, with0skips. Four suites03/04/05/08 failed afterward at `services.ts:117` because
Verdaccio-owned nested storage could not be removed by the host. The general job also hit that same new staging
fixture cleanup issue and the world handover test’s implicit5s timeout (the following legacy case then saw409).
Current bounded fixes, with no runtime-product/assertion changes:
- `build/ci-registry-cleanup` at `0926a12` is merged: staging fixture empties only its live registry storage before own
  container removal, following the existing publish-test convention. Eight local staging tests pass; services stopped.
- `author/gate2-registry-cleanup` at `9404c7d` is merged, D3#182. Actual05 passed with real SDK/Homebrew; no runtime resources remain.
- `build/world-ci-budget` at `990b3ae` is merged and gives four real-workerd multi-transaction lease tests explicit60s budgets matching the
  existing actor-race integration budget, D3#173. Assertions, loop count and runtime algorithms stay unchanged.
These are normal fixture/deadline CI feedback; actionable product-review rounds remain2. Postmerge staging8 and host21 tests plus all16 static/sync checks passed. No focused runtime worker remains.
The gate verifier will now rerun the full local gate from this clean integrated source, then Linux CI follows.

**What landed in this takeover.**
- `d3ab3f4`, D3 #150–152: Linux Collector-to-viewer bridge routing, promotion-test fresh connections and bounded read
  integration setup budgets. Local tests and Linux CI run `43997952028` (`53d028d`) passed.
- `5c10928` and `b96ad36`, E1: evidence-page rebuild works; legacy/malformed records stay unverified, known failures
  remain red, and display-only redaction hides local paths, emails, token forms and organization IDs. Nine Python
  checks pass; raw history is unchanged.
- `9c0d42d`, D3 #160–164: immutable clean-source manifests; signed verdict hashes; additive nullable book column,
  preserved legacy rows; explicit legacy-cache rebuild/reprove recovery. Hashless proofs never open promotion gates.
- `c9d1285`, D3 #170–172: D1 owns one-live-lease admission, its atomic snapshot and guarded first teardown. Eight
  concurrent creates reproduced eight201s before the fix; seven world regressions and existing expiry/restart/reap
  tests now pass. Combined initial corrections passed Linux run `44002209543` (`dc9c673`).
- `bccd5be`, D3 #165–169: proof pins live PID/revision/hash and clean full commit; promotion publishes from that
  captured Git tree into invocation-owned durable output. npm versions are reused only for matching pack integrity.
  Publication precedes new release/pass facts; retry repairs missing carried facts without duplicates. The conductor
  reran all22 focused tests,3 test-world lifecycle tests, the real nested-monorepo publication probe and all16
  lint/typecheck/sync checks after integration. No services remained.
- `639aeee`, D3 #180–181, separate author: check08 fetches close connections; check05 runs real Homebrew on both
  Macarm64 and Linuxx64 and fails if it is absent. Actual05+08 passed locally (2files/3tests,276s), including SDK/Brew,
  watch/drift and portal stale checks. Cleanup found zero test containers, listeners, taps/formulas or processes.
  Linuxbrew execution still awaits Gate2 CI.

**Round3 whole-layer reset completed.** Review of `3a06e85` found four real source defects: config-specific
process ownership before signaling; immutable R2 model admission; first-MCP sinks/environment configuration;
reserved refusal-code uniqueness. `decisions/D3-whole-layer-reset.md` records history, owner tracing and the
independent adversarial plan pass. Private ledger counter is3. Implementation resumes only in those bounded owners;
no full-gate replay starts until their services stop. The earlier two causal clusters remain fixed.

Historical builder-authored evaluator changes are being dispositioned truthfully by separate-author independent
acceptance, without rewriting history or weakening checks. OAuth count is documented as a local throttle; strict
concurrent ceiling is cloud hardening before public deployment. Raw diagnostic whitespace stays raw data.

**Round-three source corrections and separate author acceptance are integrated.** The four bounded source fixes
are refusal `7cbc946`, MCP `0fec194`, immutable model `9a1aebb` and ownership `a962de0`. Separate author `83f6f8b`
replaced both forbidden platform-shim suites with real logbook route and ledger checks; all 25 tests passed after
integration. Separate author `6647d76` independently reviewed historical evaluator changes, found and fixed two
semantic gaps, and recorded the author-before-builder process deviation. Integrated source `543611e` passed 21 pure
evaluator/watch guards and 16 real-service planted/list/privacy guards. All 16 projects' lint/typecheck plus Nx sync
passed. D3 #197 records the remaining legacy adapter policy/enforcement debt without claiming universal compliance.

**Latest clean Gate2 attempt is red, with cleanup complete.** Clean candidate `c867e21` ran all eight files and ten
tests with zero skips in 282.8 seconds; nine tests passed, including actual Mac Homebrew, while check04 ended with a
direct test fetch ECONNRESET. All Architect containers, gate taps/formulas, exact gate listeners and own runtime
processes are gone; unrelated resources remain untouched. Raw attempt and preflight/cleanup are retained under
`evidence/L2.11/attempts/c867e21-*`. The separate author owns request-lifecycle diagnosis and focused check04 alone.
No product cause is claimed yet and no runtime-source correction has started. Linux run `44023299021` on the same
`c867e21` is green across all three jobs, including all ten Gate2 tests and actual Linuxbrew.

**Next, in order.**
1. Finish the separate author's focused request-lifecycle diagnosis. Integrate only its bounded correction, then
   reset Nx, sync, lint/typecheck and touched checks. Keep runtime services exclusive.
2. Repeat the clean full local Gate2 alone on the final committed candidate using stock configuration. Preserve
   raw output and scoped cleanup, then refresh Linux CI and each layer-two step's current ci.json and pages.
3. Obtain a fresh independent whole-layer verdict on the final candidate and CI evidence. The product-round ledger
   remains three; ordinary fixture feedback does not create a fourth product head.
4. Open `layer/3` into main, merge only fresh green CI and independent review, then verify main CI. Stage3 delivery
   hands the green main commit and cleanup proof back to root; only root opens Stage4 wayfinding. Claude alone
   republishes the private page links.

**For the cloud pass, from L2.08:** every deployed Worker must set `ARCHITECT_ENVIRONMENT`, or it reads as a local
world and opens `/_world/*` (`later.md`); `Facts` reads staging's SQLite file today and needs a D1 API reader behind the
same seam. MCP leaves out on purpose: idempotency keys for `idempotent: "request"`, CORS, and a consent page.

**Aaron's HeroUI Pro template** (his commit 7db5de6, 17 November) is on its own branch `portal/heroui-pro-template`
for his work elsewhere, and was reverted on `layer/3` (9233c20): `packages/portal` is L2.10's `@architect/portal`. His
Pro face will read the same `/_portal/v1/*` data later (F1). His main checkout at `~/projects/architect` still holds
those template files uncommitted (with a `.env`, a zip and `template-dashboard/`); don't touch, commit or delete them:
work from a fresh worktree, or ask him to move them out.

**Status page.** `design/state/index.html` is the page Aaron reads (also at its claude.ai link, which only Claude
publishes). The conductor keeps it current after every merge, PR and gate (`briefs/codex-conductor.md`).

**How the work runs.** The conductor keeps `layer/3` and merges; each step is one builder in its own worktree on
`build/<step>` from `layer/3`, given its D3 numbers, its ports and its contract (the build-plan row, D3, the author's
checks), and told never to edit `e2e/` or fixtures. Journeys, checks and fixtures are a separate ✍️ author's
(`author/<topic>` branches). The conductor merges, resolves conflicts (decision blocks append; generated files are
regenerated, never merged by hand), runs `pnpm nx reset` then `NX_DAEMON=false pnpm nx sync` after any generator change,
lint and typecheck, and pushes.

**Traps already hit.**
- Builders running tests at once collide on ports and Docker: give each its own port range (used so far 8900 to 9097),
  and run Gate 2 when no builder is. Gate 2's teardown removes every new `architect-*` container, other agents' too.
- A Collector whose run was killed stays up and holds its port; L2.O removes such orphans at the next start. Until it
  lands: `docker ps` for `architect-collector-<pid>-…` whose pid is gone, and remove those only.
- A stale Nx daemon writes generated files from the old generator: `pnpm nx reset` first.
- Two things in the author's check 08 that are the check's, not the build's (found by running its portal steps in the real flow, `evidence/L2.10/03-author-checks.txt`):
  it calls `promote --to staging` straight after `build` for the slow-spend revision, which L2.05's gate refuses (no `test` verdicts for that revision), so it
  needs `prove --env test` between; and its second `portal(url)` is a `fetch` on a pooled socket to a staging that `promote` has since restarted, with the event
  loop blocked by `spawnSync`, so it fails with `ECONNRESET` or `EPIPE` (a Worker cannot stop it: workerd drops a `Connection: close` response header; the cure is
  `headers: { connection: "close" }` on that fetch). The author's call; the builders never edit `e2e/`.
- A killed Gate 2 run leaves its registry: `architect-l2-registry-<pid>-<check>` holding `127.0.0.1:489<n>` (found on 4898, check 08's, with
  a pid that was gone), which makes the next run of that check fail at `docker run`. Remove only the ones whose pid is gone. To run
  a check beside another builder without Gate 2's teardown: a private vitest config without `globalSetup` under `.architect/`, and, when its
  ports are taken, a copy of `e2e/layer1` and `e2e/layer2` under the gitignored `tmp/` (so `repo` still resolves), the check number changed
  (`ports(n)` is `8900 + 10n`).
- The CI key for Gate 1 check 4 is given only to pull requests into `main` and pushes to `main` (D3 #71, $10 a day).

**Aaron's credentials, for the cloud pass and O1** (never print, never write to a file): the Axiom tokens are in his
keychain by service name (`capxul-ingest-test`, `capxul-ingest-real`, `capxul-ingest-agents`,
`capxul-ingest-cloudflare`, `capxul-query`), with `axiom-org-id` and `axiom-domain` (EU Central 1); `ANTHROPIC_API_KEY`
is a repository secret. Observability is Axiom only for now (O1, Aaron); PostHog is in `later.md`.

**Side work, not on the main line:** H1/H2 the agent harness (PR 9 waits on Aaron: his Command Code plan and the daily
cap), F1 the portal's design (PR 12), F2 the portal's information architecture (on main, PR 17; mocks in `spikes/portal-ia/`), the Codex handoff prompt (PR 13, 14), F3 the portal builder brief (on main, PR18), N1’s private-core spike (on main, PR19; framework integration later, with the cooperative-client/privacy limits in its README).

The history below is kept for the record; START HERE is what is current.


Kept by the 🎼 conductor, so a fresh conductor can take over. Last updated 17 November 2026: Codex resumed with CI recovery first; START HERE is current. The section "Where the goal stands" ends with what is in flight now.

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

L2.P done on `build/L2.P` (decisions D3 #80 to #87; evidence `evidence/L2.P/`): `Blueprint.visibility.secret|private|public` on values and fields
(`Password`, `Secret` and sign-in's `session` are secret in acme and the starter); span attributes through an allowlist of public fields
(`handler/internal/attributes.ts`), the journal likewise, a Collector `attributes` processor built from the model (`privateKeys`), and the leak
check inside eval 1 (answer shape); refusal codes `[AL-001] Name { … }` from the model (`refusals`, `things[].code`), on the wire, in the SDK,
the CLI and the docs; `runs` (only `server`), open step kinds, the `unit | network` test marker. L2.08 (MCP) and L2.09 (`watch`) may now read
arguments and telemetry. FOR THE AUTHOR: `e2e/layer1/05` line 40 expects the old CLI refusal line, now `[AL-001] AllowanceExceeded { remaining: 300 }` (D3 #87).

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

L2.08 done on `build/L2.08` (decisions D3 #122 to #127; evidence `evidence/L2.08/`): `generated/mcp` is the catalog and `Mcp` in `target-effect` makes one MCP tool per
operation and read on the SDK's stateless streamable HTTP server (input schema from the declaration, public fields only, private ones by role through
`Access.holds`, refusals as `[AL-001] …` tool errors, the API's role check); the generated server serves `/mcp` and the OAuth discovery, with Better Auth's
`oauthProvider` and `jwt` on `AuthD1` (one instance per origin, registration capped at 500 clients, consent headless). `/_world/*` is a 404 unless the
environment is `local` (or unnamed) or declares a lifetime and was started to host worlds; staging's proof reads its database file (`Facts`), not the door.
`zod` is pinned 4.5.4 in `target-effect` (4.6.7 breaks the Worker's start). The author's checks 01 to 07 and Gate 1 pass; 07 needed no change.
L2.O done on `build/L2.O` (decisions D3 #100 to #109, #120, #121; evidence `evidence/L2.O/`): `architect telemetry view|stop|trace <id>|open <id>` and `prove --view`
(`Viewer`, `grafana/otel-lgtm` by digest, anonymous Grafana, a second Collector exporter while it runs; `dev` gets a Collector only then), a Collector
whose owner pid is gone is removed at the next start, prove exports `journey.<name>` as each trace's root, a refusal ends its span ok and a defect ends
it as an error (`spanned`), a `TraceSource` seam with a `FileSource`, and the `Sink` seam: `Telemetry.sink.local()` and `.axiom({ group })` as `telemetry: [...]`
in `blueprint/environments/<env>.ts`. The Axiom sink exports from the Worker (a fan-out `fetch`, `Authorization` and `X-Axiom-Dataset` per signal, EU edge),
every value read by name from the keychain (`capxul-ingest-test|real`, `axiom-domain`, `axiom-org-id`) or `AXIOM_TOKEN`/`AXIOM_DOMAIN`, handed to the world's process
by environment only, skipped with one line when absent. `user.*`, `organization.id` and `*.email` never leave the machine. The live check ran against `capxul-test`:
`ARCHITECT_LIVE_AXIOM=1 pnpm exec vitest run --root packages/prove src/modules/sinks/sinks.live`. To see a trace: `architect telemetry view`, `architect prove --view` in acme,
open the viewer's Explore (Tempo) and paste the trace id; or `architect telemetry trace <id>` with no viewer.

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
publishing is L2.06's, the MCP server L2.08's, watch L2.09's, the portal L2.10's. `/_world/*` is closed outside world-hosting environments since L2.08 (D3 #126).

L2.06 (local reading) is built on `build/L2.06` (decisions D3 #110 to #119; evidence `evidence/L2.06/`): `architect publish --dry-run | --local`
(`Publish` in `@architect/prove`, composed by `Ship.publish`): the generated SDK and CLI as `@<folder>/sdk` and `@<folder>/cli` at `version --next`,
each one esbuild bundle with its dependencies as installed (the SDK with its type declarations), sent to the registry in `ARCHITECT_REGISTRY` (a real
Verdaccio in the tests); a prerelease is always `--tag next`; the CLI as a Node 24.22.2 single executable for this machine's platform (cached download,
postject, sha256 printed) and a formula committed to a tap repository (`ARCHITECT_TAP_REPO`, else `.architect/tap/`), installed with `brew` in the test.
`promote` publishes: staging the prerelease `<next>-next.<n>` after its proof passed and before its verdicts line, production the release after `released`
(`latest`); both skip npm without a registry. The generated CLI's `--version` now prints `<name> <version>` (the bundler stamps `ARCHITECT_VERSION`), and
`ReadAnswer` is exported from `@architect/blueprint`. npmjs.org and GitHub releases print `skipped … (cloud pass)`. Gate 2's global teardown removes every
new `architect-*` container, other builders' too, and checks 4 and 5 and the other layer-2 checks share ports 8900 to 8999: run Gate 2 when no other builder is.
