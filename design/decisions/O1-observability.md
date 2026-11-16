# O1: observability, from a span to Aaron's screen

Proposed 16 November 2026 by a 📐 designer thread, answering Aaron: "How is this supposed to work? What is the Axiom way
of doing this? How am I supposed to look at this and view this?" Evidence: `spikes/local-trace-viewer/` (run for real),
the existing code (`packages/target-effect` handler, `packages/host-cloudflare` Telemetry, `packages/prove` telemetry),
and primary docs read on 16 November 2026 (Axiom, Cloudflare, Grafana; sources at the end). Nothing was sent to Axiom:
there is no account and no credential, and none was made.

## How it works

Say this aloud. Every operation you call makes a trace. A trace is the story of one call: one big span for the
operation, and a smaller span inside it for each step, with the move, the refusal and the payload written on it. The
code that makes these spans is the same everywhere, and it always speaks the same standard language, OpenTelemetry,
over the web.

Where the story goes depends on where you are. On your machine, the spans go to a small program called the Collector,
which runs in Docker. The Collector does two jobs. It writes plain files, which `prove` reads to judge its nine evals.
And, when you ask for it, it also passes everything on to a viewer, which is a second container with a web page. You
open that page and click through the trace. No account, nothing leaves your machine.

In the cloud, there is no Collector. The deployed worker sends its spans and logs straight to Axiom, with a token that
can only write, one dataset for traces and one for logs, per environment. In Axiom you open the traces page, click a
trace, and see the same tree. A dataset is just a named table of events in Axiom; the traces and the logs of the
staging environment are two tables, and production has two more.

The same evals can then run on what Axiom holds. That is `watch`. It asks Axiom for recent traces with a read-only
token, in Axiom's query language, and judges them with the same code that reads the local files. Prove itself never
reads from Axiom, so a pull request from a fork, which has no credentials, still proves.

One rule protects secrets. Only fields declared public are allowed to become attributes. Today every payload field and
answer field becomes one, passwords and tokens included, and that has to be fixed before the first real token goes
near Axiom.

## The shape, in one picture

```text
handler span ── Effect OTLP/JSON, per request, flushed under waitUntil ──┐
                                                                         │ sink, from architect.config.ts + environment
 local  ┌──────────────────────────────────────────────────────────────┐ │
        │ Collector 0.164.0 (Docker)                                   │◀┘
        │   ├─ file/traces, file/logs  ──▶ prove and `watch --env local` read these (unchanged)
        │   └─ otlphttp/viewer (only while the viewer runs) ──▶ grafana/otel-lgtm 0.39.0: Tempo, Loki, Grafana
        │   └─ otlphttp/axiom  (only when a token is present and `--also axiom`) ──▶ Axiom
        └──────────────────────────────────────────────────────────────┘
 cloud   worker ── OTLP/JSON, Authorization + X-Axiom-Dataset ──▶ https://<edge>/v1/{traces,logs} ──▶ Axiom
 watch   `architect watch` ── APL over HTTPS, query token ──▶ Axiom ──▶ the same evals as prove
```

## The Axiom model (what the docs say)

- **Organisation, datasets.** An organisation has datasets. Logs and traces go to an *events* dataset; metrics to a
  *metrics* dataset. "Each OTel component needs its own dedicated dataset", so traces and logs are two datasets.
- **Endpoints.** `https://<edge domain>/v1/traces`, `/v1/logs`, `/v1/metrics`. Edge domains: `us-east-1.aws.edge.axiom.co`
  and `eu-central-1.aws.edge.axiom.co`. The organisation's default edge is fixed when it is created and a dataset's edge
  can never change, so pick the region once. Headers: `Authorization: Bearer <token>` and `X-Axiom-Dataset: <dataset>`
  (metrics use `x-axiom-metrics-dataset`). OTLP over HTTP is the documented route (no gRPC mentioned); Cloudflare's own
  exporter documents that it sends JSON, not binary, and points at `api.axiom.co/v1/traces`, so JSON is accepted. Our
  `Telemetry` already sends JSON. To confirm on the first real send.
- **Tokens.** Two kinds that matter. A *basic API token* only ingests, into the datasets you pick. An *advanced API
  token* picks datasets and actions (for example query on one dataset) and can carry hourly and daily dollar caps on
  query cost (over the cap, queries get HTTP 429; ingest is not affected). A token's privileges cannot be changed after
  creation, so rotate by creating a new one. A *personal access token* does everything its owner can; never use it.
- **Seeing a trace.** Dashboards, "OpenTelemetry Traces" (it detects OTel trace datasets by itself), a table of traces;
  click a trace id for the waterfall, with parent and child spans (right-click collapses a span). The Query tab works
  too: a query that returns `_time` and `trace_id`; click the id. Trace dataset fields: `trace_id`, `span_id`,
  `parent_span_id`, `name`, `kind`, `duration`, `error`, `status.code`, `status.message`, `attributes`, `events`,
  `links`, `resource`, `service.name`. The pages I could read did not document a service map, a direct URL to one
  trace, or how logs link to traces; to check on the first real ingest, not assumed.
- **Query API.** `POST https://<edge domain>/v1/query/_apl?format=tabular`, `Authorization: Bearer`, JSON body
  `{ "apl": "...", "startTime": "...", "endTime": "..." }`. Tabular answers are column-oriented with a status block
  (`isPartial`, timings). The docs read do not state row limits or rate limits.
- **Free tier (Personal plan, $0, no card).** 500 GB a month of ingest, 25 GB storage, 30 days' retention, 10 GB-hours
  a month of query compute, community support, soft limits on datasets (no fixed number). Next plan: $25 a month with
  1 TB ingest, 100 GB-hours and 100 GB storage. Compute, not ingest, is what polling would eat.
- **Cloudflare.** Workers can export traces and logs by themselves to an OTLP destination (a destination made in the
  dashboard, named in `wrangler`: `observability.traces` and `observability.logs` with `enabled`, `destinations`,
  `head_sampling_rate`, `persist`). `persist` defaults to true, and from 1 December 2026 persisted data counts against
  Cloudflare's observability usage, so export-only would set it false. Workers metrics and custom metrics are not
  exported. The pages read say nothing about spans a program makes itself, or about Durable Objects. Alchemy has an
  `ObservabilityDestination` resource, so the destination can be code.

## Why the shape is this one

Three things are true at once. The spans that matter to Architect (step spans with `step.kind`, the refusal, the move,
the payload) are made by our own Effect layer, not by the platform. Local runs in workerd, where Cloudflare's built-in
export is not documented to exist. And `prove` has to run on a fork with no secrets, and judge its evals in about six
seconds, deterministically. So: **one exporter, ours, in every environment; only its destination changes.** Cloudflare's
built-in export can be added later for the platform's own spans, into the same datasets, once a spike shows custom spans
merge into its traces (unknown today).

## Aaron's alternatives, weighed

Aaron asked why Docker at all, and whether everything should go straight to Axiom. Each option below is graded against
this design on: real not fake, CI without credentials, eval read-back latency and determinism, cost and free-tier
volume, and what Aaron sees. The Axiom figures are from the docs; nothing was measured against a live Axiom, so
read-back latency there is the one number I could not get, and is marked so.

**1. Deployed environments straight to Axiom, no Collector.** Two ways to do it.

```ts
// A. our own layer, Authorization header on each exporter (host-cloudflare/telemetry/service.ts)
OtlpTracer.layer({ url: "https://us-east-1.aws.edge.axiom.co/v1/traces",
                   headers: { Authorization: `Bearer ${token}`, "X-Axiom-Dataset": "acme-staging-traces" }, ...options })
OtlpLogger.layer({ url: "https://us-east-1.aws.edge.axiom.co/v1/logs",
                   headers: { Authorization: `Bearer ${token}`, "X-Axiom-Dataset": "acme-staging-logs" }, ...options })
```

```jsonc
// B. Cloudflare's built-in export (wrangler.jsonc, destinations made in the dashboard or by Alchemy)
"observability": { "traces": { "enabled": true, "destinations": ["axiom-traces"], "head_sampling_rate": 1, "persist": false },
                   "logs":   { "enabled": true, "destinations": ["axiom-logs"],   "head_sampling_rate": 1, "persist": false } }
```

Decision: **yes, A is the cloud path.** It is what carries the step spans and the refusal. B is an add-on later.
Effect's exporters accept `headers` (`OtlpTracer.ts:57`), so the change is small: `Telemetry.serve` takes headers and a
dataset per signal, where today it takes only a `url`.

**2. Local `dev` and `env up` also to Axiom, no local viewer.**

```yaml
# the Collector, only when AXIOM_INGEST_TOKEN is in the environment. The token is read by the Collector, never written.
exporters:
  otlphttp/axiom:
    endpoint: https://us-east-1.aws.edge.axiom.co
    headers: { authorization: "Bearer ${env:AXIOM_INGEST_TOKEN}", x-axiom-dataset: acme-dev-traces }   // logs: its own exporter
```

**3. Prove and the evals read back from Axiom.**

```ts
// TraceSource: the one reader. FileSource (today) and AxiomSource answer the same call.
traces(wanted): Effect<Map<traceId, { spans, logs }>>
// AxiomSource.traces: POST https://<edge>/v1/query/_apl?format=tabular
//   ['acme-ci-traces'] | where trace_id in ("<id>", ...) | project trace_id, span_id, parent_span_id, name, duration, ['status.code'], attributes
```

| Question | Today: Collector, files, optional viewer | Option 1: cloud straight to Axiom | Option 2: local also to Axiom, no viewer | Option 3: prove reads from Axiom |
|---|---|---|---|---|
| Real, not fake | Real Collector, real OTLP, real viewer | Real | Real | Real |
| CI with no credentials (forks get none) | Passes: files only | Not relevant: CI deploys nothing | Falls back to nothing: a fork with no token sees no telemetry at all | Fails on forks. Needs a token in CI, and a pull request from a fork has none |
| Eval read-back latency and determinism | About 12 ms after the response, 50 concurrent requests complete and unmixed (the `otlp-from-workerd` spike) | n/a | n/a | Unmeasured. Axiom ingests then indexes; every run would need a poll loop with a quiet window, and parallel runs share a dataset. Slower and less deterministic by construction |
| Cost, free-tier volume | Free, local | A grant trace is a few KB; 500 GB a month is far above any staging load. `persist: false` avoids Cloudflare's charge from 1 December 2026 | Every `dev` save and prove run ingests; still small, but the 30-day retention fills with throwaway worlds | Polling burns the 10 GB-hours of free query compute that `watch` needs |
| What Aaron sees | The viewer page, after `telemetry view`; or the trace tree in the terminal | Axiom, with real traffic | Axiom for everything, one place | Axiom |
| Offline, no account | Works | Needs the network | Needs the network and an account to see anything | Same |

**Native `otelcol-contrib` instead of Docker.** A native build exists: `otelcol-contrib_0.164.0_darwin_arm64.tar.gz` is
a real release asset (98 MB, checked with a HEAD request). It would remove Docker for prove on macOS. It is not worth it
now: CI is Linux and would fetch a second asset with its own checksum, a download-and-cache step becomes our code and
its failure modes, and the pinned image already gives one identical Collector on every machine. The seam is
`Collectors.start`; swapping Docker for a binary later changes one file. Keep Docker; revisit only if Docker's absence
blocks someone. The viewer needs Docker anyway.

## Decision

**Recommendation: Axiom is the one place to look whenever a token exists; the local viewer is the no-account default;
prove's read-back stays on local files.**

1. **Cloud (staging, production):** the worker exports straight to Axiom with our own layer (option 1A). No Collector.
2. **Local `dev` and `env up`:** the Collector always writes the files. With `AXIOM_INGEST_TOKEN` set, `dev` also tees to
   Axiom (`dev` datasets); with none, `architect telemetry view` is how Aaron looks. Axiom is not required locally,
   because a fork, a plane and a new machine have no token. (So Aaron's prior holds where a token exists. The viewer
   stays because "no token" is a real state.)
3. **Prove and CI:** files only, always. `watch` is the only reader of Axiom.
4. **Docker stays** for the Collector and the viewer. A native Collector is a possible later swap behind `Collectors`.
5. **Jaeger is rejected:** no logs. `grafana/otel-lgtm` is the viewer.

## Design

### The path of a span

Handler (Effect span, step child spans) → `Telemetry.serve` per-request `ManagedRuntime` (flushed under `waitUntil`;
`x-trace-id` on every response) → sink.

| Environment | Sink | Where it lands |
|---|---|---|
| `local` (dev, env up, prove) | the Collector in Docker, URL from `Collectors` | `traces.jsonl`, `logs.jsonl`; the viewer when running; Axiom when teed |
| `ci` (prove on a fresh world) | the Collector | files only |
| `staging`, `production` | Axiom direct | `<project>-<env>-traces`, `<project>-<env>-logs` |

### Datasets

One dataset per environment per signal, named from the project and the environment (never typed by hand):

| Environment | Traces dataset | Logs dataset |
|---|---|---|
| `dev` (local, teed) | `acme-dev-traces` | `acme-dev-logs` |
| `staging` | `acme-staging-traces` | `acme-staging-logs` |
| `production` | `acme-production-traces` | `acme-production-logs` |

Why per environment: a token is scoped to datasets, so a staging worker's token cannot write production, and a leaked
staging token cannot read anything. Why per signal: Axiom requires it. Every span also carries `deployment.environment.name`
and `service.name` as resource attributes, so a cross-environment query is possible later. Metrics: none today (Workers
metrics are not exported); `<project>-<env>-metrics` is reserved, as a metrics dataset. Edge: one region chosen once for
the organisation (the docs say it cannot change); recommendation `us-east-1` unless Aaron needs EU residency. Datasets
are created by `architect deploy`, not by hand (an open question: whether Axiom's API lets a token with only dataset
rights do this, or an admin token must; see the questions).

### Tokens, and where they live

| Token | Kind | Scope | Lives | Used by |
|---|---|---|---|---|
| `AXIOM_INGEST_TOKEN` per environment | basic API token | ingest into that environment's two datasets only | the environment's secret store (a Cloudflare secret set by Alchemy, D3 #2); locally, the shell or Aaron's keychain | the deployed worker; `dev` teeing |
| `AXIOM_QUERY_TOKEN` | advanced API token | query on the environment's two datasets; hourly and daily dollar cap | Aaron's keychain, and CI secrets only for a deliberate staging `watch` job | `architect watch`, `telemetry trace` |
| none | personal access token | never used | | |

The config names a secret, never holds it (D3 #2). Neither token is printed (the CLI shows `AXIOM_INGEST_TOKEN set`),
written to a file, a commit, a log or an attribute. The Collector's config refers to `${env:AXIOM_INGEST_TOKEN}`; the
config file in the repository never contains it. Tokens are created by Aaron, in Axiom, and rotated by creating a new
one, because a token's privileges cannot change after creation. Nothing in this design creates a token.

### The config switch

```ts
// architect.config.ts: the project default
telemetry: Telemetry.otlp({ sink: "local" }),

// environments/staging.ts and production.ts: where that environment's spans go
telemetry: Telemetry.axiom({ edge: "us-east-1", ingestToken: Secret.named("AXIOM_INGEST_TOKEN"), queryToken: Secret.named("AXIOM_QUERY_TOKEN") }),
```

`sink` is `"local"` (the Collector) or `"axiom"` (direct). `Telemetry.axiom` derives the dataset names. The docs page's
`Telemetry.otlp({ sink: "axiom", dataset: "acme" })` becomes this, so the one place a project says where telemetry goes
stays the config. The compiler resolves the sink into the generated worker's `url` and `headers`, so a project's code
never builds a URL.

### The CLI

| Command | What it does |
|---|---|
| `architect telemetry view` | Starts the viewer (`grafana/otel-lgtm` pinned by digest, loopback only, no volume, anonymous access) named `architect-viewer`; prints its address; the next prove or `dev` Collector also forwards to it. Idempotent |
| `architect telemetry stop` | Stops and removes it. Nothing stays running or open |
| `architect telemetry trace <id> [--env <e>]` | Prints the trace as a tree with its logs, read from the files or Axiom: works with no viewer and over SSH |
| `architect telemetry open <id> [--env <e>]` | Opens the viewer's page for that trace (local), or prints the dataset and id and opens Axiom's traces page (cloud) |
| `architect prove --view` | Starts the viewer if needed and prints, for every failed eval, the trace id and its viewer link |

### How `watch` reads either sink

`TraceSource` is one seam in `prove`'s `telemetry` module: `traces(wanted)` returns spans and logs by trace id.
`FileSource` is today's reader. `AxiomSource` runs APL on the environment's datasets with the query token:

```text
['acme-staging-traces'] | where _time > ago(15m) and name == "allowance.grant" | summarize p95 = percentile(duration, 95), n = count() by name
['acme-staging-traces'] | where trace_id in ("<id>", ...) | project trace_id, span_id, parent_span_id, name, duration, ['status.code'], attributes
```

The first answers performance and refusal counts per operation; the second fetches whole traces for the evals that need
a tree (steps, machine path, events). The completeness rule is the same as prove's, minus the quiet window (production
data is old): a root span is present and no span points at a missing parent. Attribute paths inside `attributes` in APL
(and so the exact field mapping) are the thing to confirm on the first real ingest, which is why L2.O5 is the first
step to touch Axiom. `watch` excludes coverage (L2.09) and stays inside the 10 GB-hours of free query compute by
asking for windows, not for everything.

### The allowlist and redaction

Today `target-effect` writes every payload and answer field as an attribute, so a local Tempo already lists
`payload.password`, `answer.token`, `answer.apiKey` and `answer.session` as attribute names
(`spikes/local-trace-viewer/evidence/attribute-names-in-tempo.txt`). L2.P (N1) fixes this at the source: a field's
value becomes an attribute only if the compiler marked it `public`. Three rules follow.

1. **The source is the only dependable layer,** because the cloud path has no Collector in front of it. The allowlist
   lives in `target-effect`, from the compiled model.
2. **No sink that leaves the machine is switched on before L2.P is done.** The first `Telemetry.axiom` environment waits
   for it.
3. **Defence in depth locally:** the Collector config also carries an `attributes` processor that deletes any key
   matching the model's private field names, and prove gets a check that fails if a private field's name appears as an
   attribute key in any trace. That check is the proof, not a promise.

The agent harness (H1) exports spans through the same layer; its content rule ("never in attributes") is the same rule.

### What Aaron clicks

**Locally.** 1. Run `architect telemetry view`; it prints the address. 2. Run `architect dev`, a journey, or
`architect prove --view`; a failing eval prints its trace id. 3. Open the address. Choose Explore, then the Tempo
source. 4. Paste a trace id, or search `{ span.operation = "allowance.grant" }` (the search list can lag a few minutes;
by id is immediate). 5. Click the trace: a tree opens, `POST`, then `allowance.grant`, then its step
`allowance.grant.insert`; click a span to see its attributes: the payload, `move.to`, `step.kind`, the refusal. 6.
Click "Logs for this span": Loki shows its lines. From any log line, the `trace_id` field jumps back. 7. When done,
`architect telemetry stop`.

**In Axiom** (after the questions below are answered). 1. Sign in to Axiom, open Dashboards, then "OpenTelemetry Traces",
and pick `acme-staging-traces`. 2. Search for a trace id (every `acme` call prints it, and `x-trace-id` is on every
response), or sort by duration or errors. 3. Click the id: the waterfall opens. 4. For logs, open `acme-staging-logs` in
the Query tab and filter on that `trace_id`. 5. `architect telemetry open <id> --env staging` takes you to the right
dataset.

## Build steps (proposal; not edited into the plan)

Each ends green with its check. Order: after L2.04 and L2.P; L2.O5 and L2.O6 need Aaron's yes.

| Step | What | Needs | Done when |
|---|---|---|---|
| L2.O1 | The viewer: `Viewer` in `prove`'s telemetry module (`start`, `stop`, pinned image and digest, loopback ports, anonymous Grafana), the Collector's optional second exporter, `architect telemetry view` and `stop` | L1.15 | `telemetry view` then `prove --env local` in `examples/acme`: the viewer's Tempo API answers for the `allowance.grant` trace with the step span `allowance.grant.insert` and its log by `trace_id`; `telemetry stop` leaves no container and no open port; plain `prove` is unchanged and starts no viewer |
| L2.O2 | A root span: prove exports `journey.<name>` as the root of each call's trace | L2.O1 | The viewer shows `journey.grant-an-allowance` as root, with no "root span not yet received", and the nine evals still pass |
| L2.O3 | `telemetry trace <id>` and `open`: the tree and logs from the files | L2.O1 | `architect telemetry trace <id>` prints the tree of `tree.py`'s spike output for a recorded run |
| L2.O4 | `TraceSource` and `FileSource`: prove reads through the seam | L2.O1 | All of prove's tests pass unchanged; a unit test shows `watch` code accepting a fake source |
| L2.O5 | The Axiom sink: `Telemetry.axiom`, `headers` and a dataset per signal in `host-cloudflare` telemetry, the config switch, the Collector `otlphttp/axiom` exporter; needs L2.P | L2.P, **Aaron's yes and token** | One staging call: its trace is in `acme-staging-traces` with the step spans and `acme-staging-logs` has its lines, by trace id; no token string in any file, log or span; `grep` over the repository and the evidence finds none |
| L2.O6 | `AxiomSource` and `watch --env staging`, with the cap on the query token | L2.O4, L2.O5, L2.09 | Against staging traffic replayed by a script, `architect watch --env staging` prints p95 against budget and refusal counts, and a planted slow handler shows as drift; read-back works with the query token only |
| L2.O7 | The private-attribute check and the Collector's delete processor | L2.P | A fixture with a `private` field makes prove fail naming the attribute key; acme passes |
| L2.O8 ∥ | Datasets and tokens declared in `architect deploy`: create the datasets, set the ingest secret through Alchemy, `architect destroy` removes the datasets | L2.01, L2.O5 | `deploy --env sandbox` then `destroy` leaves no dataset (confirmed through Axiom's API with a query-only token), subject to the dataset-creation question below |

## Questions for Aaron (batched; all wait on him)

1. **The Axiom account.** Please sign up (free Personal plan, no card) or give me the organisation to use. Which region:
   US East 1, or EU Central 1 (it can never be changed)? My recommendation is US East 1.
2. **Tokens, in writing.** May I (a 🖥️ Local thread on your machine) be given, and use only for this, two tokens you
   create in Axiom: a basic ingest token scoped to the staging traces and logs datasets, and an advanced query-only
   token on the same two datasets with a dollar cap? I would keep them in your keychain, never print or write them. I do
   not create any token or account myself.
3. **Datasets by hand or by deploy?** Axiom may need an admin token to create datasets. Do you want to create the six
   datasets (three environments, two signals) once by hand and have `deploy` only write to them? My recommendation is by
   hand for now.
4. **Sample and keep?** Production could use `head_sampling_rate` below one to save volume. At today's scale I
   recommend keeping everything.

## Records of what is not known

Marked here so nothing reads as fact: Axiom accepts our JSON OTLP (implied by Cloudflare's own exporter, not tested);
the APL field paths for attributes; whether Axiom links logs to traces; a service map; ingest-to-query lag; query rate
limits; whether built-in Cloudflare export merges with our spans; Grafana anonymous mode; the viewer's start-up time.
None blocks L2.O1 to L2.O4; all are answered by L2.O5's first real send.

## Sources (read 16 November 2026)

Axiom: `axiom.co/docs/send-data/opentelemetry`, `/reference/tokens`, `/reference/edge-deployments`, `/restapi/query`,
`/query-data/traces`, `axiom.co/pricing`. Cloudflare: `developers.cloudflare.com/workers/observability/opentelemetry-export/`
and `/exporting-opentelemetry-data/`. Grafana: `grafana.com/docs/opentelemetry/docker-lgtm/`. Image tags and digests:
Docker Hub `grafana/otel-lgtm`. Collector: `opentelemetry-collector-releases` v0.164.0. Effect: `OtlpTracer.ts:57`
(`headers`).
