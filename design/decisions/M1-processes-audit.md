# M1.33's harness edits, audited (author, 19 November 2026)

The record for `design/decisions/M1-processes.md`, which exists only on `origin/m1-33-processes` until M1.33 merges; when it does,
this file is its last section. M1.33's builder was allowed to edit the harness that starts or sweeps services, in a commit of its
own, for an author's audit. That commit is `c7455c0f` ("Harness: the gates start and sweep services as processes"). It touches
`e2e/layer1/teardown.ts`, `e2e/layer2/teardown.ts`, `e2e/layer2/services.ts`, `tools/e2e/starter.sh`, `tools/e2e/verdaccio.yaml`
(now a template) and deletes `e2e/layer2/verdaccio.yaml`. Other commits on the branch touch `e2e/package.json` (adds
`@orthograph/services`), `e2e/project.json` (tag `env:build` to `env:gate`) and comments in `e2e/vitest*.config.ts`. The audit
read `git diff origin/m1...origin/m1-33-processes -- e2e tools/e2e` and ran the changed teardown.

## What was checked

- **No assertion changed and no case removed.** No `*.test.ts` under `e2e/` is in the diff. The only `expect`s touched are in
  `services.ts` (the `docker run` exit status and the registry's `created.status < 300`, both of which go with the code that made
  them; `finish` still expects `problems` to equal `[]` and still calls `nothingRunning(root)`). The vitest configs lose a word in
  a comment and nothing else (`globalSetup`, `maxWorkers`, timeouts and includes are as they were).
- **The issuer still gives what checks 02 and its siblings read.** The claims, the `ortho` issuer id, the 600 s expiry and the
  `client_id` mapping to the `ci-main` claims are the same object (`interactiveLogin: false` goes: the new issuer has no login).
  Only `mintToken(s.issuer)` (client `ci-main`) and `mintToken(s.rogue)` are used; the rogue is a second `Issuer.start` with its
  own key made at start, so its token never verifies against the first, as before. `mintToken` and `forge` are unchanged.
- **The registry still never proxies the project's names.** The generated config lists `@acme/*`, `acme`, `orthograph` and
  `@orthograph/*` as own packages (anyone may read, publish, unpublish) and proxies the rest with the old uplink timeouts, as the
  deleted `e2e/layer2/verdaccio.yaml` did. `Stack` keeps its `{ url, npmrc }` and the token still goes only to a 0600 file.
  The URL's host is `127.0.0.1` now, not `localhost`; no Gate 2 file asserts the old text.
- **`starter.sh` starts the same registry the same way.** Same Verdaccio version (the pinned package), same package rules, a
  ping loop that now fails with the log instead of falling through, the same user, publish and install steps; the npmrc key host
  follows the registry URL. Cleanup kills and waits for its own PID, and deletes its marker.
- **Teardowns.** Both globalSetups give the run a folder of its own, put it in `ORTHO_RUN_DIR` (the workers inherit it: a probe
  test that started a marked `sleep` and left it saw the variable, and the layer-1 teardown stopped the process and failed the run
  with `left running: probe <pid>`), then `Owned.sweep` the folder: every marker whose PID is alive and whose `ps` command still
  starts with the marked command is stopped (SIGTERM, then SIGKILL after five seconds) and reported, and the run fails if any was
  found. A PID that was reused by something else is not touched.

## What is weaker, and what is stricter

- **Stricter:** layer 2's old teardown listed every `ortho-*` container that was not there before, so another gate's containers
  looked like a leak and layer 1 and 2 could not run at once. A run folder is its own, so another run's processes are never one.
  Layer 1's old one matched only two name patterns; the new one covers every kind of process the framework starts.
- **Weaker, in one way: the authority is no longer independent.** `docker ps` asked Docker, which the code under test did not
  write. The sweep reads markers that `Owned.start` writes, so a service started some other way (a bare `spawn`, a child of a
  child) leaves no marker and passes. A bare `ps` for the Collector, Verdaccio or the issuer cannot stand in for it: other
  worktrees run the same binaries at the same time, which is why the markers exist. The compensation is that the per-check
  `nothingRunning(root)` (`pgrep -f` on the copy's folder, unchanged) still sees workerd, wrangler and node processes that name
  the copy, and that every service the framework starts goes through `Owned.start`, whose marker is written before the process
  is asked anything. Residual: `Owned.stop` forgets a marker after SIGKILL and ten seconds even if the PID somehow still lives.
- **No marker is still a pass.** A run that starts nothing has nothing to sweep, as before. The teardown cannot demand a marker.

## Verdict

**Accept as authored; no harness file was rewritten.** The teardowns prove "nothing of ours left running" by owned PIDs, strictly
for everything started through `Owned`, which is everything the gates start; the one independence lost is named above and bounded
by `nothingRunning`. Services start the way the checks expect: same claims, same package rules, same ports from `ports(n)`.
Nothing the checks judge was weakened.

Two follow-ups, neither blocking: M1.33's decision section 7 says the `e2e-m1` job does not yet take `docker` off the PATH
because check 09 asked `docker info`. Check 09 no longer does (its precondition is now only that an `ORTHO_COLLECTOR_BIN`, when
set, names a file; prove fetches and verifies the pinned Collector itself), so the lead may take `docker` off the PATH in that
job too. And `docs/canon` or any page quoting lines of `e2e/m1/09-wallet-journeys.test.ts` should be re-checked with
`node docs/canon/check.mjs` after merge (none quoted it at `56ea4b31`).
