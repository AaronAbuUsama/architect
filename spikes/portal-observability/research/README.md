# Research: what to reuse, and how live data reaches the portal

Read on 18 November 2026. Licences come from the LICENSE files (raw GitHub) and the GitHub / npm registry APIs,
fetched that day. Nothing was pulled or run: no images, no accounts, no keys.

## 1. Survey

| Project | Licence (SPDX) | Parts to flag | What we could reuse | Runs locally | Verdict |
|---|---|---|---|---|---|
| [SigNoz](https://github.com/SigNoz/signoz/blob/main/LICENSE) | `MIT` for most; GitHub shows `NOASSERTION` | `ee/` and `cmd/enterprise/` are under the [SigNoz Enterprise licence](https://github.com/SigNoz/signoz/blob/main/ee/LICENSE): production use needs an agreement | Look and feel only. The UI is a whole app, not a package | Docker compose: ClickHouse, collector, query service. Not run, size not measured | Copy the layout idea. Take no code: mixed licence, and it is an app |
| [HyperDX / ClickStack](https://github.com/hyperdxio/hyperdx/blob/main/LICENSE) (repo moved to `ClickHouse/ClickStack`) | `MIT` (API says MIT) | None found | `packages/app/src/components/DBTraceWaterfallChart.tsx` (waterfall) as a reference. Schema and `@hyperdx/common-utils` (npm 0.0.14, MIT per repo) | [One command](https://github.com/hyperdxio/hyperdx): `docker run -p 8080:8080 -p 4317:4317 -p 4318:4318 docker.clickhouse.com/clickhouse/clickstack-all-in-one`. Bundles ClickHouse, UI, collector, MongoDB. README asks for 4 GB RAM, 2 cores. Size not stated | Best look to copy, MIT. The waterfall is tied to its own query hooks and Mantine, so read it, rebuild it |
| [Jaeger UI](https://github.com/jaegertracing/jaeger-ui/blob/main/LICENSE) | `Apache-2.0` | None | The trace view is not a published package. `@jaegertracing/jaeger-ui` is private; the `trace-view` and `jaeger-ui-components` names are not on npm | Jaeger backend, one binary or image | Good reference for waterfall maths (span rows, collapse, ruler). Not installable |
| [Grafana Tempo](https://github.com/grafana/tempo/blob/main/LICENSING.md) | `AGPL-3.0-only` | `operations/` and `pkg/tempopb` are `Apache-2.0` | A backend with an HTTP API (TraceQL). Already inside otel-lgtm | In `grafana/otel-lgtm:0.39.0` (see O1) | Use as a service over HTTP. Never link its code |
| Grafana's trace view panel | The Grafana repo is `AGPL-3.0`. `@grafana/ui` on npm 13.3.1 is `Apache-2.0` | `public/app/features/explore/TraceView` lives in the AGPL repo, not in `@grafana/ui` | Nothing to import. It is a fork of Jaeger's view | Grafana is in otel-lgtm | Link out to it ("open in Grafana"); do not embed |
| [Perses](https://github.com/perses/perses/blob/main/LICENSE) + [plugins](https://github.com/perses/plugins) | `Apache-2.0` (both) | None | npm plugins: `@perses-dev/tracing-gantt-chart-plugin` 0.14.1 (2 Nov 2026), `@perses-dev/trace-table-plugin` 0.12.1 (2 Nov 2026), `@perses-dev/tempo-plugin` 0.60.1 (2 Nov 2026), `@perses-dev/clickhouse-plugin` 0.7.1 | Go binary or image. Not run | Only real packaged, permissive tracing UI. But it pulls Perses' plugin runtime and MUI. Spike it, do not adopt blind |
| [OpenObserve](https://github.com/openobserve/openobserve/blob/main/LICENSE) | `AGPL-3.0` | A commercial Enterprise edition exists (the repo ships `Cross.ent.toml`) | A backend only | [One docker run](https://github.com/openobserve/openobserve), port 5080, needs a root user and password env | Out. AGPL, and a second store beside Tempo |
| [Uptrace](https://github.com/uptrace/uptrace/blob/master/LICENSE) | `AGPL-3.0` (not BSL; the LICENSE file is the AGPL text) | None found | A backend only | ClickHouse 26.3+, PostgreSQL 15+ and Redis 6+. Heavy | Out. Three databases for a local viewer |
| [Highlight](https://github.com/highlight/highlight/blob/main/LICENSE) | `Apache-2.0` for the rest. GitHub shows `NOASSERTION` | `highlight.io/` and `enterprise/` directories have their own licences | Nothing. Last push 23 Oct 2026, not archived | Heavy stack | Joined LaunchDarkly, [announced 23 April 2025](https://www.highlight.io/blog/joining-launchdarkly), repo to stay open. One third-party post says the hosted product closes 28 Feb 2026; I could not confirm it from an official page. Out |
| `recharts` 3.10.1 (25 Jul 2026) | `MIT` | 3.11.0 is dated 17 Nov 2026: too young, skip | Sparklines, bars. React, easy | npm | Fine for sparklines. Heavier than needed |
| `uplot` 1.6.32 (14 Mar 2025) | `MIT` | None | Tiny canvas time-series, very dense. No React wrapper needed | npm | Best fit for the matrix sparklines and p95 line. Hand-drawn sparklines are even smaller |
| `@visx/xychart` 4.0.0 (11 Jun 2026) | `MIT` | None | Low-level SVG building blocks | npm | Good if we want SVG we can style like SigNoz. More code to write |
| `react-flame-graph` 1.4.0 (8 Feb 2020) | `MIT` | Unmaintained for six years | Flame graph, not a waterfall | npm | Skip. Wrong shape for a trace |
| `speedscope` 1.25.0 (3 Dec 2025) | `MIT` | None | A flame-graph app, not a component | npm | Skip. Profiles, not traces |
| `d3-flame-graph` 5.0.0 | `Apache-2.0` | None | Flame graph | npm | Skip |

Notes on what I could not settle. The HyperDX component's licence is the repo's MIT; I did not read every file's header.
No image size was measured for any of these: nothing was pulled. HyperDX is a good model for the look, but its
UI is an app that talks to ClickHouse, so we cannot embed it in a generated page.

## 2. The data path

### What is already here

- The core speaks only OTLP (O1). The local sinks are the viewer (`grafana/otel-lgtm:0.39.0`, released 30 Oct 2026)
  and Axiom. Aaron's call: Axiom only for now.
- `TraceSource` (`packages/prove/src/modules/telemetry/types.ts`) already has `traces`, `find(trace)` and
  `window(since)`. `window` returns whole traces, spans and logs, for every trace that started in the last `since` ms.
- Two adapters exist: `FileSource` (reads `traces.jsonl` and `logs.jsonl` the Collector writes) and an Axiom source
  (APL over `<group>-traces` and `<group>-logs`). `watch` already uses `window` to judge p95 against budgets.
- Inside otel-lgtm: Tempo on 3200, Loki on 3100, Prometheus on 9090. The image `EXPOSE`s 3000, 3200, 4040, 4317,
  4318 and 9090, but the viewer module publishes only 3000 and 4318. Tempo's config turns on the `span-metrics`
  and `service-graphs` processors and remote-writes to Prometheus ([docker-otel-lgtm `tempo-config.yaml`](https://github.com/grafana/docker-otel-lgtm/blob/main/docker/tempo-config.yaml)). It does not turn on `local-blocks`, which TraceQL metrics need (I could not confirm; check before relying on it).

### The four options

The queries below are for `allowance.spend` in service `acme`. The operation span is named after the operation.

| | (a) Tempo + Loki + Prometheus | (b) ClickHouse behind the Collector | (c) Collector JSONL files | (d) Jaeger query API |
|---|---|---|---|---|
| Last 50 calls | `GET :3200/api/search?q={name="allowance.spend"}&limit=50&spss=1&start=<s>&end=<s>` | `SELECT TraceId, Duration, StatusCode FROM otel_traces WHERE SpanName='allowance.spend' ORDER BY Timestamp DESC LIMIT 50` over HTTP :8123 | `FileSource.window(since)`, then filter for the operation span, newest 50 | `GET :16686/api/traces?service=acme&operation=allowance.spend&limit=50` (the `/api/*` JSON is documented as internal and unstable) |
| p95 over 30 min | Tempo `GET /api/metrics/query_range?q={name="allowance.spend"}\|quantile_over_time(duration,.95)&since=30m&step=60s` (needs `local-blocks`, unconfirmed). Or Prometheus `histogram_quantile(0.95, sum by (le)(rate(traces_spanmetrics_latency_bucket{span_name="allowance.spend"}[5m])))` (bucket p95 is coarse) | `SELECT toStartOfMinute(Timestamp) t, quantile(0.95)(Duration)/1e6 FROM otel_traces WHERE SpanName='allowance.spend' AND Timestamp > now() - INTERVAL 30 MINUTE GROUP BY t` | Computed in our code from `window(30min)`. Exact, not bucketed | Not supported: no aggregation API |
| Logs for trace X | Loki `GET :3100/loki/api/v1/query_range?query={service_name="acme"} \| trace_id="X"` (the shape the local spike used) | `SELECT Body, SpanId FROM otel_logs WHERE TraceId='X'` | Already in the `Trace` that `find(X)` returns | None. Jaeger keeps no logs, [per its docs](https://www.jaegertracing.io/docs/latest/apis/) |
| Latency to visibility | By id: immediate. Search: minutes (spike found it missing at first, there a minute or so). Span metrics: seconds to a minute | Seconds: Collector batch plus insert | Milliseconds (`flush_interval: 10ms` in prove's collector config) | Seconds |
| Footprint | Already running as otel-lgtm. One big image; first pull took minutes | New container beside the Collector. Exporter traces and logs are `beta`, metrics `alpha`. The default schema is the exporter's, not ClickStack's | Zero. Files exist already | One more container; no logs, so rejected before |
| Maps to Axiom (APL) | Poorly: three APIs, three query languages | Closest: SQL maps to APL line by line | Best: the same `TraceSource` shape the Axiom adapter already fills | No |

The Axiom equivalents (verified from the repo's own `axiom-source.ts`, and Axiom's `percentile` page):

```apl
['capxul-test-traces'] | where name == 'allowance.spend' | order by _time desc | take 50
['capxul-test-traces'] | where name == 'allowance.spend' | extend ms = toreal(duration / 1ms)
  | summarize percentile(ms, 95) by bin(_time, 1m)
['capxul-test-logs']   | where trace_id == 'X' | project body, span_id
```

Axiom's time-binned `percentile` is an extrapolation from its docs, not run. Axiom lags a few seconds (the repo
uses a 15 s margin).

### Recommendation

**Use (c) as the portal's local source, and Axiom as its staging source. Keep Tempo for "open in Grafana".**

- (c) is zero new infrastructure, has no lag, includes logs, and the adapter already exists. It is the same code path
  `prove` and `watch` use. Dev traffic is small, so reading the files per request is fine (add a cache keyed on file
  size and mtime before it is not).
- Aggregation (p95, refusals by tag, sparkline buckets) is one pure function over `Trace[]`. It runs the same over
  files or Axiom rows. We do not need three query languages. If Axiom volume grows, push the heavy ones (series,
  p95) down to APL behind the same interface.
- Tempo is the wrong primary: its search lags by minutes, which is exactly the "I just called it, where is it?"
  moment a live page must beat. It also needs ports published, CORS dealt with, and three APIs. Use its by-id link
  only: `viewer.link(viewing, trace)` already exists.
- ClickHouse (b) is the right answer if we ever need history beyond one environment's files. Not now.
- Jaeger (d): stays rejected.

### Browser or server?

**Through a small server, not from the browser.** Three reasons.

1. Axiom's query token must never reach a browser (AGENTS.md: never print or write a key). Only a server can hold it.
2. Tempo, Loki, Prometheus and ClickHouse send no CORS headers by default and are not published to the host.
3. The files are on disk. A browser cannot read them.

The portal's own dev server exposes a few JSON routes (and a Server-Sent Events route for live updates). It is the
only place that opens a `TraceSource`. Credentials stay in an entry file (`main.ts`), as AGENTS.md requires.

### The interface

It extends `TraceSource` rather than replacing it. Five queries. Each returns plain data; the summary maths is a pure
module, shared by every adapter.

```ts
// Sketch only. Types follow TraceSource's Span / Log / Trace.
export interface PortalSource {
  /** Newest-first calls of one operation: root operation span only, never the HTTP wrapper. */
  readonly calls: (op: string, o: { since: number; limit: number }) => Effect<ReadonlyArray<CallRow>, SourceFailed>;
  /** One whole trace: spans for the waterfall, logs for the log pane. Immediate. = TraceSource.find */
  readonly trace: (id: string) => Effect<Trace | undefined, SourceFailed>;
  /** Count, refusals by tag, defects, p95 and the declared budget, over a window. One operation. */
  readonly summary: (op: string, o: { since: number }) => Effect<OpSummary, SourceFailed>;
  /** Buckets of calls / refusals / p95 for the matrix sparklines. All operations at once. */
  readonly series: (o: { since: number; step: number }) => Effect<ReadonlyMap<string, ReadonlyArray<Bucket>>, SourceFailed>;
  /** Cheap "anything new?" cursor so the page can poll or stream. Returns the newest span start seen. */
  readonly latest: () => Effect<number, SourceFailed>;
}
```

`calls`, `summary` and `series` are derived from `TraceSource.window(since)` by default (`fromTraceSource(source)`),
so a new adapter needs only `window` and `find`. An adapter may override one with a native query.

What the page needs and where it comes from:

| Portal piece | Query | Note |
|---|---|---|
| Recent calls table | `calls` | Refusal tag from the span's `refusal` attribute (what `watch` already reads) |
| Span waterfall | `trace` | Children come from `parentSpanId`; start from `Span.start`, width from `Span.ms` |
| Defects in red | `trace` / `summary` | Span `status` 2 plus the `defect` tag (O1) |
| p95 versus budget | `summary` | Budget comes from the blueprint model, not from telemetry |
| Logs per trace | `trace` | Joined on `traceId` / `spanId`, already in `Trace.logs` |
| Matrix sparklines | `series` | One call for all rows, not one per row |

Two data caveats to carry into the build. (1) Every prove trace is headless (its root is the caller's span, never
exported): the waterfall must cope with a root whose parent is missing; O1 already proposes the `journey.<name>`
span. (2) The file source reads private attributes today (`payload.password`, `answer.token` showed in the spike).
The portal must show only the L2.P allowlist, whatever the source holds.

## 3. Build ourselves, or reuse

| Piece | Decision |
|---|---|
| `PortalSource` interface, `fromTraceSource` adapter, summary maths (p95, refusals by tag, buckets) | Build. Pure, small, tested in-process |
| Small server and SSE route (portal dev server) | Build. It is the credential boundary |
| Trace waterfall (rows, ruler, collapse, red defects) | Build, using HyperDX's `DBTraceWaterfallChart.tsx` (MIT) and Jaeger UI's trace view (Apache-2.0) as references. Nothing installable fits, except Perses' plugin (below) |
| Perses `tracing-gantt-chart-plugin` | Spike for a day, with a go/no-go: Apache-2.0 and packaged, but it brings Perses' plugin runtime and MUI, which fights a dark dense SigNoz look |
| Sparklines | Hand-drawn SVG polyline first (a few lines of code, zero dependency). If a real chart is needed: `uplot` 1.6.32 (MIT) |
| Operations matrix, per-operation cards, dark mono theme | Build. Look comes from SigNoz and HyperDX; copy ideas, no code |
| Local backends (Collector files) | Reuse. Already there |
| Deep dive | Reuse `grafana/otel-lgtm:0.39.0` through the existing `viewer.link` |
| Staging source | Reuse the Axiom adapter; add `series` and `summary` natives only if needed |

### Sources

Repos and files: `github.com/SigNoz/signoz` (LICENSE, `ee/LICENSE`), `github.com/hyperdxio/hyperdx` (now
`ClickHouse/ClickStack`), `github.com/jaegertracing/jaeger-ui`, `github.com/grafana/tempo` (`LICENSING.md`),
`github.com/grafana/grafana`, `github.com/perses/perses`, `github.com/perses/plugins`,
`github.com/openobserve/openobserve`, `github.com/uptrace/uptrace`, `github.com/highlight/highlight`,
`github.com/grafana/docker-otel-lgtm` (`tempo-config.yaml`, `otelcol-config.yaml`, Dockerfile). Docs:
`grafana.com/docs/tempo/latest/api_docs/`, `grafana.com/docs/tempo/latest/operations/traceql-metrics/`,
`jaegertracing.io/docs/latest/apis/`, the OpenTelemetry `clickhouseexporter` README, `axiom.co/docs/apl/aggregation-function/percentile`.
npm registry for versions and dates. Repo files: `design/decisions/O1-observability.md`, `spikes/local-trace-viewer/README.md`,
`packages/prove/src/modules/{telemetry,viewer,watch}`.

## 4. Measured afterwards, in the spike (18 November 2026)

The working spike (`../README.md`) ran both (a) and (c) against real acme traffic. Two things above are now settled:

- **TraceQL metrics do work in `grafana/otel-lgtm` 0.39.0.** `{name="allowance.spend"} | quantile_over_time(duration, .95)`
  and `| count_over_time() by (span.refusal)` both answered. But the p95 comes from power-of-two buckets: a real p95
  of about 2 ms came back as 2.097 ms (2^21 ns). Near a 150 ms budget it can only say 134 ms or 268 ms, so it cannot
  judge a budget. Exact p95 from the calls (option c) can.
- **Search lag was about 30 seconds here**, not minutes: spans were found by search 30 s after the run, by id at once.
- **Tempo broke under the portal's own polling.** Search caps at its limit (300 traces when the window held 1,412), and
  the page then needs one fetch per trace. After about 15 minutes of polling every 3 seconds (with requests
  overlapping), the viewer sat at 550% CPU and 5.5 GB and stopped answering until restarted. The files answered the
  same window, all 1,412 traces and 6 MB, in about 50 ms per poll.

The recommendation stands, more firmly: (c) locally, Axiom for staging, Tempo only as "open in Grafana".
