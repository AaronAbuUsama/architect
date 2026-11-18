# telemetry

`Collectors.start(dir)`: a real OpenTelemetry Collector (`otel/opentelemetry-collector-contrib:0.164.0`) in Docker,
its OTLP/HTTP receiver on a port Docker picks, its file exporter writing OTLP JSON lines to `dir` (flushed every
10 ms). Removed when the scope closes. `traces(wanted)` reads each trace back once complete, by the rule from
`spikes/otlp-from-workerd`: root span present, no dangling parents, then quiet for 250 ms; 10 s at most, after which
the evals name what is missing. Test: `telemetry.test.ts`.

`Collectors.launch({ dir, name })`, `.stop(name)` and `.read(dir)` are the same collector for an environment that has
one of its own (D3 #52): launched without a scope, removed by whoever launched it, and read back from its folder by
whoever proves against the environment.

`Collectors.start(dir, { strip })` and `launch({ …, strip })` add an `attributes` processor that deletes each key in `strip` from every
span and log before the file exporter (L2.P, D3 #82): the second guard behind the runtime's allowlist. `privateKeys(model)` builds the keys
from the model's `visibility`; `prove` and `env up` pass it. Test: `prove/secrets.test.ts`, against the real Collector's files.

L2.O (O1, D3 #100 to #109, #120, #121): `TraceSource` is the seam prove reads through (`traces(wanted)`, which waits until complete, and `find(id)`), and
`FileSource.open(dirs)` is the one over the Collector's files. Before any `start` or `launch`, collectors whose owner process is gone
(`ortho-collector-<pid>-<n>`) are removed. While the local viewer runs, a started Collector also exports to it. Every pipeline first
deletes `user.*` and `organization.id` (the agent SDK's records name the signed-in person), then the model's private keys (L2.P). `rootOf`
and `exportRoots` make and send the journey's own span, `journey.<name>`, built from the spans the server recorded for the call.

L2.09 (D3 #140 to #143): `TraceSource` gains `window(since, now?)`, every trace with a span newer than the window, whole, read without waiting: what
`watch` judges. `FileSource.window` reads the Collector's files against the clock (`Clock`, never `Date.now`). `AxiomSource.open({ group,
environment, env })` is the one over Axiom's query API: APL over `<group>-traces` filtered by `deployment.environment`, spans from the columns
`attributes.custom`, `status.code`, `_time` and `duration`, and the logs of refused calls from `<group>-logs`; the query token, edge and organisation
are read by name (`AXIOM_QUERY_TOKEN` / `capxul-query`, `AXIOM_DOMAIN` / `axiom-domain`, `AXIOM_ORG_ID` / `axiom-org-id`) and kept in memory for the queries only.
The window stops 15 s short of now (Axiom takes a span some seconds after it ended) and reads at most 50 000 spans. Prove's own calls carry a caller
span id that starts with `PROVE_SPAN_PREFIX`, which is how `watch` tells them from traffic. Tests: `sources.test.ts` (a stand-in for the query API),
and `watch/watch.live.test.ts` against Axiom with `ORTHO_LIVE_AXIOM=1`.
