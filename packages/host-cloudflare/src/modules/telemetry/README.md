# telemetry

`Telemetry.serve`: runs a web handler with a per-request OTLP tracer and logger (Effect's `OtlpTracer`/`OtlpLogger`
over fetch), disposed under `waitUntil` so the export finishes after the response. Keeps a caller's `traceparent`,
mints one otherwise, and answers with `x-trace-id`. With no collector URL it exports nothing. Rules from
`spikes/otlp-from-workerd`. Test: `telemetry.test.ts`.

L2.O: `Telemetry.serve` also takes `sinks` (`OTLP_SINKS`, JSON: each sink's endpoints and headers) and `environment`
(`deployment.environment` on the resource, so on every span and log). One `Fetch` fans each export out to the local Collector and every
sink, each with its own headers; one failing never fails the others. Everything sent to a sink has `user.*`, `organization.id` and `*.email`
attributes removed first (D3 #120); the local Collector gets what it was sent. Tests: `telemetry.test.ts`.
