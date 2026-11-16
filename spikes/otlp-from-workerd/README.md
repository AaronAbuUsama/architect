# Spike: otlp-from-workerd

**Question.** Can spans and logs from Effect 4.1.1 running in a real local Worker (workerd via `wrangler dev`, including
inside a Durable Object) reach a real OpenTelemetry Collector in Docker, and can a Node process (`prove`) then read back
every span and log of one request by trace id, reliably and quickly?

**Answer.** Yes. With `OtlpTracer` + `OtlpLogger` over `FetchHttpClient`, a per-request `ManagedRuntime` disposed in
`ctx.waitUntil`, and the collector's `file` exporter (flush every 10 ms), all 7 spans and 6 logs of a Worker + Durable
Object request were readable by trace id a median of 12 ms after the response (max 36 ms), 50 concurrent requests all
came back complete and unmixed, and a Worker that never disposes loses its own telemetry. "The root span ended" is
**not** a safe completeness signal; use declared expectations plus a quiet window (below).

Pins: effect 4.1.1, wrangler 4.156.1 (workerd 1.20261101.1), @cloudflare/workers-types 5.20261101.1,
`otel/opentelemetry-collector-contrib:0.164.0` (published 2026-10-27; 0.165.0 is 2026-11-07, too new),
`jaegertracing/jaeger:2.22.0` (2026-10-06). Node 26.13.1, Docker Desktop 29.7.2 on macOS (bind mount, so the file path
crosses virtiofs).

## What was tried

Files, all under this folder: `docker-compose.yml`, `collector-config.yaml`, `wrangler.jsonc`, `src/telemetry.ts`,
`src/worker.ts`, `src/steps.ts` (the Durable Object), `src/read.ts` (the reader), `src/prove.ts` (the checks).
Run: `pnpm install --ignore-workspace` (the local `pnpm-workspace.yaml` only allows the esbuild and workerd build
scripts), `docker compose up -d`, `npx wrangler dev --port 8787 --ip 127.0.0.1`, then `node src/prove.ts one`.
Node runs the `.ts` directly (type stripping: no parameter properties, no enums).

**Collector** (`collector-config.yaml`): one OTLP/HTTP receiver on 4318, both stores wired at once so they could be compared.

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
exporters:
  file/traces:                       # option (a): OTLP JSON lines on a mounted folder
    path: /out/traces.jsonl
    flush_interval: 10ms             # default 1s; this is the whole latency budget, see Measurements
  file/logs:
    path: /out/logs.jsonl
    flush_interval: 10ms
  otlp/jaeger:                       # option (b): Jaeger v2 with a query API (traces only)
    endpoint: jaeger:4317
    tls: { insecure: true }
service:
  pipelines:
    traces: { receivers: [otlp], exporters: [file/traces, otlp/jaeger] }
    logs:   { receivers: [otlp], exporters: [file/logs] }
```

`docker-compose.yml` publishes only `127.0.0.1:4318` (collector, bind-mounting `./otel-out:/out`, `user: "0:0"` so it can
write the mount) and `127.0.0.1:16686` (Jaeger). No batch processor: it would only add delay.

**Worker layer setup** (`src/telemetry.ts`). The layer's scope finalizer flushes both exporters.

```ts
export const telemetry = (baseUrl: string, serviceName: string) =>
  Layer.mergeAll(
    OtlpTracer.layer({ url: `${baseUrl}/v1/traces`, resource: { serviceName },
      exportInterval: "100 millis", maxBatchSize: 64, shutdownTimeout: "3 seconds" }),
    OtlpLogger.layer({ url: `${baseUrl}/v1/logs`, resource: { serviceName },
      exportInterval: "100 millis", maxBatchSize: 64, shutdownTimeout: "3 seconds" }),
  ).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer))

export const parentFromTraceparent = (header: string | null): Tracer.AnySpan | undefined => {
  const m = header?.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/)
  return m ? Tracer.externalSpan({ traceId: m[1]!, spanId: m[2]!, sampled: true }) : undefined
}
export const traceparentOf = (span: Tracer.AnySpan) => `00-${span.traceId}-${span.spanId}-01`
```

**Worker entry** (`src/worker.ts`): a runtime per request, the effect runs, then the layer is disposed under `waitUntil`.
The trace id comes in as `traceparent` (or is minted) and always goes out as `x-trace-id`.

```ts
export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const mode = (new URL(req.url).searchParams.get("flush") ?? "waitUntil") as "inline" | "waitUntil" | "none"
    const rt = ManagedRuntime.make(telemetry(env.OTLP_URL, "worker"))
    const parent = parentFromTraceparent(req.headers.get("traceparent"))
    const res = await rt.runPromise(
      handle(req, env).pipe(Effect.withSpan("worker.fetch", { parent, root: parent === undefined })))
    if (mode === "inline") await rt.dispose()          // response waits for the export
    else if (mode === "waitUntil") ctx.waitUntil(rt.dispose())   // the recommended one
    return res                                          // "none": never exported (the break test)
  },
}
```

Inside `handle`, `Effect.withSpan` / `annotateCurrentSpan` / `Effect.log` are used as normal. The call to the Durable Object
passes `traceparent: traceparentOf(currentSpan)` so `do.run` becomes a child of `worker.call-do`. The Durable Object
(`src/steps.ts`) does exactly the same: its own `ManagedRuntime` with `serviceName "durable-object"`, parent from the
header, `this.ctx.waitUntil(rt.dispose())`, and spans `do.run` > `do.storage.incr`, `do.compute`.

**The reader** (`src/read.ts`, no dependencies). `FileStore` tails `traces.jsonl` and `logs.jsonl` by byte offset (keeping the
partial last line), indexes spans and logs by trace id, and reads OTLP JSON (`resourceSpans[].scopeSpans[].spans[]`,
`resourceLogs[].scopeLogs[].logRecords[]`). `JaegerStore` does `GET /api/v3/traces/<id>`. `tree()` prints the parent/child
tree with attributes, status and logs attached to their span; `complete()` is the check used here.

## What was found

1. **The tree for one request is complete** (real run, trace id chosen by the caller, response echoed it back):

   ```
   trace 53e9c4315e5496bd7b06460e93a66cfb (worker echoed 53e9c4315e5496bd7b06460e93a66cfb) store=file
   readable 8 ms after the response; 7 spans, 6 logs

   worker.fetch [worker] 32ms status=ok {http.method=GET http.path=/}
     log Info: worker: request received
     log Info: worker: done
     worker.step.validate [worker] 8ms status=ok {step.ms=5}
       log Info: step validate done
     worker.step.load [worker] 13ms status=ok {step.ms=10}
       log Info: step load done
     worker.call-do [worker] 11ms status=ok {do.key=default}
       do.run [durable-object] 8ms status=ok
         log Info: do: run started
         log Info: do: run done {"count":331}
         do.storage.incr [durable-object] 0ms status=ok {count=331}
         do.compute [durable-object] 7ms status=ok {kind=pure}
   ```

   Logs are real OTLP log records carrying `traceId` and `spanId` of the span they were written in. Effect also copies each
   log line onto the span as an event. An Effect failure inside a span exports as `status {code: 2, message: "card_declined"}`
   plus an `exception` event; `?fail=1` shows it. With no `traceparent` the Worker mints the id and `x-trace-id` returns it.
2. **Flushing in workerd.** The exporters are timer-driven batchers; in a Worker a timer only runs while a request is
   alive. So the layer must be disposed: closing its scope runs one final export of both buffers (bounded by
   `shutdownTimeout`). `ctx.waitUntil(rt.dispose())` does that without delaying the response (response ~35 ms either way
   on localhost). `ctx.waitUntil` works inside a Durable Object too. A per-request layer also resets the exporter's
   self-disable state (see 4). The layer's `Flusher.flush` exists but is not needed with dispose.
3. **The reader works against two stores, one shape.** Jaeger v2 also returns all 7 spans and (as span events) all 6
   lines, but: Jaeger stores no OTLP logs, so a log written outside a span is invisible to it; event timestamps come back
   set to the span's start, so log order inside a span is lost; it appends `@jaeger@warnings` attributes (clock-skew,
   negative-duration "sanitizing") and rewrites multi-argument log bodies. The file exporter keeps the exact bytes.
4. **Breaking it.**
   - Worker that never flushes (`flush=none`): only the Durable Object's telemetry arrived (3 spans, 2 logs; the 4 Worker
     spans and 4 Worker logs were never exported, waited 3 s). A Worker returning before export finishes is fine only
     because of `waitUntil`.
   - Collector stopped at request time: the response is still 200 and fast with `waitUntil` (31 and 34 ms); with `inline`
     it is 3.04 s because dispose waits the full `shutdownTimeout`. The telemetry is **lost for good**: restarting the
     collector 4 s later never delivered it (0 spans, 0 logs after 8 s). The exporter retries transient failures 3 times,
     then drops the buffer and (in a long-lived exporter) switches itself off for 60 s. No error reaches the user.
   - Collector frozen (`docker compose pause`) for 1.5 s and 5 s after the request: both traces still arrived
     (readable 1548 ms and 4969 ms after the response). The bytes were already with Docker's proxy; the exporter's
     3 s `shutdownTimeout` did not lose them. Not a guarantee for a real network.
   - Recovery: the next request after the collector returned was complete in 11 ms.
5. **`prove` must not treat the root span as completion.** The Worker and the Durable Object are separate exporters, so
   their batches arrive independently. Judged over 40 runs each against the settled trace (see Measurements):
   "root span present" was premature in 11/40 (`waitUntil`) and 12/40 (`inline`) runs; adding "no dangling parent ids"
   did not help (same counts), because a missing leaf child cannot be seen structurally.

## Measurements

Latency from the response arriving at the Node client until every span and log of that trace is readable
(10 ms polling, 20 runs each, collector `flush_interval: 10ms`):

| Store, flush mode | min | median | max |
|---|---|---|---|
| file, `waitUntil` | 2 ms | 12 ms | 36 ms |
| file, `inline` | 0 ms | 11 ms | 13 ms |
| file, `waitUntil`, collector `flush_interval: 100ms` | 11 ms | 96 ms | 118 ms (two clusters, ~12 and ~105) |
| Jaeger, `waitUntil` | 89 ms | 111 ms | 127 ms |
| Jaeger, `inline` | 85 ms | 109 ms | 198 ms |

The file exporter's `flush_interval` (default 1 s) is the cost to tune; at 10 ms it is not the bottleneck.

50 concurrent requests, each with its own caller-chosen trace id and its own Durable Object key:

| Store, mode | complete | incomplete | mixed up | latency after response min / median / max |
|---|---|---|---|---|
| file, `waitUntil` | 50 | 0 | 0 | 25 / 44 / 275 ms |
| file, `inline` | 50 | 0 | 0 | 9 / 22 / 80 ms |
| Jaeger, `waitUntil` | 50 | 0 | 0 | 47 / 53 / 273 ms |

"Mixed up" means a span or log under the wrong trace id, or a span id seen in two traces. Every echoed `x-trace-id` equalled
the one sent. `complete()` requires the exact set of 7 span names, at least 6 logs and no orphans, so a duplicate or missing
span fails it.

Completeness rules, 40 runs each, `flush=waitUntil` (`flush=inline` in brackets), judged against the settled trace:

| Rule | Premature verdicts | Verdict latency after response |
|---|---|---|
| A. root span present | 11/40 (12/40) | 0 to 12 ms |
| B. root + no dangling parent ids | 11/40 (12/40) | same |
| C. B + quiet 250 ms (no new span or log) | 0/40 (0/40) | median 259 ms (254 ms) |
| D. every declared span and log present | 0/40 (0/40) | median 8 ms (3 ms) |

Root span arrived before the DO's `do.run` in 5 of 20 runs (`waitUntil`) and 4 of 20 (`inline`).

## The decision it supports

- **Telemetry path:** Effect's `OtlpTracer`/`OtlpLogger` straight from the Worker and the Durable Object into a Docker
  Collector works as designed; no OpenTelemetry SDK is needed in the Worker.
- **Store for `prove`: the collector `file` exporter** (OTLP JSON lines, `flush_interval: 10ms`), read by Node. It is the
  only option that holds real OTLP logs with trace and span ids and exact timestamps, has no extra container, needs no
  query service, and was faster (median 12 ms vs 111 ms). Jaeger is a sound fallback if `prove` ever needs search across
  traces, but it loses logs outside spans and event order. Truncate or rotate the files per `prove` run (or set the file
  exporter's rotation) so the reader never scans old runs.
- **Worker rule:** one `ManagedRuntime` per request (and per Durable Object call), `ctx.waitUntil(rt.dispose())`, caller
  supplies `traceparent`, response always returns `x-trace-id`.
- **Completeness rule for `prove` (recommended):** a trace is complete when
  1. the root span is present and ended, **and**
  2. no span refers to a parent that is not present, **and**
  3. every span and log the operation's declaration requires is present (Architect already knows the steps, the
     cross-boundary calls and the declared errors; this is eval "steps" anyway), **and**
  4. the trace has been quiet (no new span or log) for a window of max(250 ms, 10 x the collector flush interval).

  Verdict as soon as 1 to 3 hold when the declaration is exact (D: median 8 ms); otherwise (undeclared extras are
  possible, or the declaration is a minimum) wait for 4 as well (C: about 260 ms). Hard timeout 10 s: a trace still
  incomplete then is a **failed check with the missing spans named** ("telemetry missing"), never a pass, never a retry
  loop. Never rely on the root span alone, on wall-clock sleeps, or on span count without names.

## Open risks

- **Lost telemetry is silent.** With the collector down at request time, or a Worker that does not dispose, nothing fails.
  `prove` must start by checking the collector is up (`POST /v1/traces` with an empty body returns `{"partialSuccess":{}}`),
  and a missing trace is reported as missing, not as an operation bug. Dropping the buffer after 3 transient retries is
  Effect's behaviour; a collector restart mid-run loses that run's data.
- **A shared, long-lived runtime was not tried.** A module-level runtime would batch across requests but depends on timers
  running outside a request, and the exporter's "disabled for 60 s after a failure" would then drop whole minutes of data.
  The per-request layer avoids both; it costs one exporter pair per request (cheap here: 35 ms responses).
- **Durable Object eviction or a crash** between response and `waitUntil` was not tried; the DO's export rides on
  `waitUntil` only.
- Only localhost: no TLS, auth headers, gzip (`compression: "gzip"` exists on both layers), or real Cloudflare network
  latency. `wrangler dev` against workerd locally only; the pool-workers test runner's separate wrangler was not used.
- Sampling is not exercised: every span is sampled. Large traces (`maxBatchSize` 64 triggers early flushes) were not stressed.
- macOS bind-mount reads had no visible lag at 10 ms, but file-event timing on other hosts or CI may differ; the reader
  polls the size, it does not watch events.
- Jaeger 2.22.0 `api/v3` ids and attribute shapes matched the OTLP JSON shape here; this is not a stable API contract.
- Side finding: Effect's `OtlpExporter` request timeouts rely on `shutdownTimeout` only; a hung collector during a long
  request has no per-request timeout.
