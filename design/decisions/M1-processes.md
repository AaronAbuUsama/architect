# M1-processes: the services as processes (M1.33)

Made 19 November 2026, building [K10 section 8](K10-factory.md) (Aaron quit Docker on 18 November). Each call below says what
was decided and the evidence for it. Evidence of the whole slice is in [`evidence/M1.33/`](../evidence/M1.33/).

## 1. The Collector is the pinned `otelcol-contrib` binary

`packages/prove/src/modules/telemetry/internal/binary.ts`. Version **0.164.0**, the one every gate already ran as an image,
published **26 October 2026** (24 days old; the release API says `published_at: 2026-10-26T23:46:44Z`). It is fetched from
`github.com/open-telemetry/opentelemetry-collector-releases` (`otelcol-contrib_0.164.0_<os>_<arch>.tar.gz`), checked against a
SHA-256 pinned in the source, unpacked and moved into `<cache>/otelcol-contrib/0.164.0/<os>_<arch>/`, where `<cache>` is
`ORTHO_CACHE_DIR`, else `$XDG_CACHE_HOME/orthograph`, else `~/.cache/orthograph`: never inside a repository. A mismatch is
refused and nothing is kept. `ORTHO_COLLECTOR_BIN` names a binary of the caller's own.

The four digests (darwin arm64 and amd64, linux amd64 and arm64) were read from the release's asset digests and each checked
against the `.sha256` file the release carries beside its archive: all four agree
(`af6a0c56…` darwin arm64, `b53ab416…` darwin amd64, `f0c1ce9f…` linux amd64, `8bd4a7f4…` linux arm64). The darwin arm64
archive downloaded here hashed to its pinned digest and ran (`otelcol-contrib version 0.164.0`).

CI caches `~/.cache/orthograph/otelcol-contrib` with `actions/cache@v6.1.0` keyed on the version, and the same code fetches and
verifies it when the cache is empty. The first start on a machine downloads about 100 MB; every later one finds it.

What the container gave for free and the process has to do itself: the Collector's own metrics server is switched off in the
config (`service.telemetry.metrics.level: none`), because two collectors on one machine would fight for its port 8888; the
receiver is on `127.0.0.1` and a port the system picks (found by binding port 0 and passing it on); the log goes to
`<dir>/collector.log`, and the start-up error quotes its last lines.

## 2. Processes are owned by PID, and found by their command, never by a name

`docker ps` found leaks by container name. A process has no name, so each one Orthograph starts leaves a marker
`<kind>-<pid>.json` (`kind`, `pid`, `owner`, `command`, and a `title` when the program renames itself) in the **run folder**:
`ORTHO_RUN_DIR`, else `<cache>/run`. A marker is a claim. A PID is signalled only while `ps -ww -o command=` still shows the
command it was started with, so a PID the system has since given to something else is never touched
(`telemetry.test.ts`: "never signals a process that only has the same PID"; `owned.test.ts`: the sweep leaves a stranger with a
marker that names another command alone).

- A started collector (`Collectors.start`) is a child of its scope; if its owner is killed first, the next `start` or `launch`
  stops it (`sweepOrphans`: marker owner gone, process still its command). This replaces the `ortho-collector-<pid>-<n>`
  container sweep.
- An environment's collector (`Collectors.launch`) is detached, its marker kept in its own folder, and `env down` stops it by that
  marker. `Collectors.stop` takes the folder where it took a container name.
- A gate gives its run a run folder of its own (`e2e/layer1/teardown.ts`, `e2e/layer2/teardown.ts`), and at the end
  `Owned.sweep` stops whatever its markers still name alive and fails the run. Other runs have folders of their own, so a parallel
  builder's processes never look like a leak. `tools/e2e/starter.sh` writes its Verdaccio's marker there too.
- Verdaccio renames its process to `verdaccio` (`ps` shows only that), so the marker carries `title: "verdaccio"` as the other
  form `ps` may show. The first draft had no title, and the registry outlived its scope: the test that found it is
  `registry.test.ts`.

## 3. `@orthograph/services`: a private package, tag `env:support`

The OIDC issuer, Verdaccio and the process owner are needed by tests in `logbook`, `portal`, `cli`, `prove` and by the gates, so
they live in one package that nothing shipped imports: `packages/services`, `private`, six-slot modules `owned`, `issuer`,
`registry`, entry `src/main.ts`. `.oxlintrc.json` gets the tag: `env:support` may depend only on `env:support`; **test files** of
`env:runtime` and `env:build` projects may depend on it (the test override of the module-boundary rule), source files may not. The gates (`e2e`) are tagged `env:gate`, which may depend on build, runtime and support code in source and tests alike: their teardown and stack files import it.
The Collector stays in `@orthograph/prove`, which ships and so cannot depend on a private package; the small marker code is
written there too (`internal/runs.ts`), in the same format, which is what lets one sweep find both.

## 4. The OIDC issuer: ours, over `jose`, the same scenario file

`Issuer.start` runs `node src/main.ts issuer --port <n> --config <file>`: discovery, a JWKS with one RSA key made at start (so a
second issuer's token and a forged one do not verify, which the logbook's refusals rest on), and `POST /<issuerId>/token` for
`client_credentials`, minting an RS256 JWT with `iss` (from the request's `Host`), `iat`, `nbf`, `exp`, `jti` and the scenario's
claims. The scenario file is the part of `mock-oauth2-server`'s config the gates used (`tokenCallbacks[].issuerId`,
`tokenExpiry`, `requestMappings[].requestParam/match/claims`), so every test's scenarios moved over as they were. It is no
faker than what it replaces: both are standing in for GitHub's issuer, and the logbook verifies the same way against either
(`jwtVerify`, issuer, audience, RS256, required claims; `issuer.test.ts` runs that verification through discovery, and the
logbook's own `local.test.ts` and `routes.test.ts` run it against this issuer). What it leaves out: the interactive login and the
other grants (nothing used them).

## 5. Verdaccio under Node, at `127.0.0.1`

`Registry.start` runs the pinned `verdaccio` package's own `bin` under the Node running the caller, on `127.0.0.1` and a port of
the caller's choosing (else one the system picks), with a generated config (storage in the run's folder; the project's own
names `@acme/*`, `acme`, `orthograph`, `@orthograph/*` never proxied to npm). The three copies of the yaml (the starter's, Gate
2's, prove's) collapsed into the generated one, except `tools/e2e/verdaccio.yaml`, which the shell script fills in. The
registry's URL host is now `127.0.0.1`, not `localhost`: a process bound to loopback should be asked for by its address, and
only `publish.test.ts` (prove's own) asserted the old text. The user's token goes to `<dir>/npmrc` (mode 0600) as before.

## 6. The viewer is gone

`Viewer`, `ortho telemetry view | stop | open` and `ortho prove --view` are removed with the Grafana container. The replacement
named in K10 is the portal's trace view (K5), which is not built yet; until it is, `ortho telemetry trace <id>` reads the
same files (`ortho dev` records nothing while no collector runs for it, as before without a viewer). The collector's second
exporter and the `otlpFromContainers` bridge address went with it. Recorded here because it removes CLI commands a person could
type; nothing else called them.

## 7. CI

The check, layer 1 and layer 2 jobs take `docker` off the runner's PATH before they run, so a test that still reaches for it
fails there (the runner image carries Docker). The `e2e-m1` job does not yet: check `09-wallet-journeys` asks `docker info`
(`e2e/m1/09-wallet-journeys.test.ts:46`, called at 121 and 131) and fails closed. That job is `continue-on-error`, and the check
is the author's to change (see the slice's report); it too starts nothing in Docker now.

## 8. What stays

The spikes under `spikes/` that start containers (`ci-oidc`, `preset-verdaccio`, `local-trace-viewer`, `portal-observability`,
`world-anvil-container`) are throwaway records and are never imported by a package (AGENTS.md); they are left as they were, with
their evidence. Anything in M5 that needs a stand-in is a process or a sandbox (K10 section 8) and follows this shape:
`Owned.start` for the process, a marker, a sweep.
