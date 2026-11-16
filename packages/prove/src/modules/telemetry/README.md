# telemetry

`Collectors.start(dir)`: a real OpenTelemetry Collector (`otel/opentelemetry-collector-contrib:0.164.0`) in Docker,
its OTLP/HTTP receiver on a port Docker picks, its file exporter writing OTLP JSON lines to `dir` (flushed every
10 ms). Removed when the scope closes. `traces(wanted)` reads each trace back once complete, by the rule from
`spikes/otlp-from-workerd`: root span present, no dangling parents, then quiet for 250 ms; 10 s at most, after which
the evals name what is missing. Test: `telemetry.test.ts`.
