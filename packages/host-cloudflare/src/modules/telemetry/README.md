# telemetry

`Telemetry.serve`: runs a web handler with a per-request OTLP tracer and logger (Effect's `OtlpTracer`/`OtlpLogger`
over fetch), disposed under `waitUntil` so the export finishes after the response. Keeps a caller's `traceparent`,
mints one otherwise, and answers with `x-trace-id`. With no collector URL it exports nothing. Rules from
`spikes/otlp-from-workerd`. Test: `telemetry.test.ts`.
