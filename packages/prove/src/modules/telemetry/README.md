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
(`architect-collector-<pid>-<n>`) are removed. While the local viewer runs, a started Collector also exports to it. Every pipeline first
deletes `user.*` and `organization.id` (the agent SDK's records name the signed-in person), then the model's private keys (L2.P). `rootOf`
and `exportRoots` make and send the journey's own span, `journey.<name>`, built from the spans the server recorded for the call.
