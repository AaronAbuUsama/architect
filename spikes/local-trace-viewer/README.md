# Spike: local-trace-viewer

**Question.** Can prove's existing OpenTelemetry Collector also feed a real, one-container, no-account viewer, so that a
run of `examples/acme` leaves the `allowance.grant` trace there, with its step spans and its logs linked?

**Answer.** Yes, with no change to the Collector's file exporters and no code in `acme`. Adding one `otlphttp` exporter
to each pipeline was enough. `grafana/otel-lgtm` shows the trace as a tree and keeps the logs linked both ways. One
real finding came out of it: private values are already attributes (below).

## Pins

`grafana/otel-lgtm:0.39.0`, digest `sha256:4c8056c9c05fcb3c8fd93800e85334bfd79b4d0271b47a54a121a64af41fe1fe`, pushed
30 October 2026 (17 days before 16 November; 0.40.0 on 6 November is too new). Grafana 13.3.0 inside. The Collector is
the one prove already pins, `otel/opentelemetry-collector-contrib:0.164.0`. Docker Desktop 29.8.2 on macOS.

## What was tried

1. Started the viewer: `docker run -d --rm -p 127.0.0.1:13000:3000 -p 127.0.0.1:14318:4318 <image>`. It is one
   container: Grafana, Tempo (traces), Loki (logs), Prometheus, an OTLP receiver on 4318, all provisioned.
2. Temporarily patched `packages/prove/src/modules/telemetry/internal/docker.ts` (the patch is
   `collector-second-exporter.patch`; reverted afterwards, nothing in `packages/` changed): an `otlphttp/viewer`
   exporter pointing at `http://host.docker.internal:14318`, added to both pipelines beside the file exporters.
3. Ran `architect prove --env local` in `examples/acme`: every eval and `prove ✔` printed, about 15 s with the viewer
   running (the first time on this machine after the image pull; the project's own measure is about 6 s). Prove removed
   its Collector itself.
4. Read the trace back through the viewer's own APIs, with Grafana's datasource proxy: Tempo `GET /api/traces/<id>`
   and Loki `query_range`. `tree.py` prints the answer. `run.sh` repeats the whole thing; the steps above were run by
   hand, `run.sh` itself was not run as a script.

## Found

**The `allowance.grant` trace, as the viewer answered** (`evidence/allowance-grant.tree.txt`; the raw answers are
`evidence/allowance-grant.tempo-trace.json` and `evidence/allowance-grant.loki-logs.json`):

```text
6 spans, 1 root(s)
POST  5.0 ms
  log: Sent HTTP response
  sqlite  0.0 ms
  allowance.grant  2.0 ms  {'operation': 'allowance.grant', 'principal.person': 'per_…', 'payload.organization': 'org_…',
                            'payload.member': 'per_…', 'payload.limit': '500', 'move.name': 'grant', 'move.to': 'active'}
    allowance.grant.insert  0.0 ms  {'step.kind': 'database'}
    sqlite  1.0 ms
    BATCH  1.0 ms
```

- The step span `allowance.grant.insert` is a child of the operation span with `step.kind`; the move is on the operation
  span (`move.name`, `move.to`). The log line is attached to the `POST` span by `span_id` and found by `trace_id`.
- **Linked both ways, provisioned by the image.** Tempo's datasource has `tracesToLogsV2` (query
  `{service_name} | trace_id = "<id>"`) and Loki's has a derived field on `trace_id` that links back to Tempo.
- **Loki keeps the logs as logs,** labelled by `service_name`, `trace_id` and `span_id`. Jaeger (the other candidate,
  in the `otlp-from-workerd` spike) stores no OTLP logs at all and loses log order inside a span. That is why Jaeger is
  not the pick.
- **By id, the trace was there at once.** The viewer's trace-search listing (`TraceQL`, Aaron's "find a trace") did not
  show it for the first minute or so; it did a few minutes later. Not measured more tightly. So: print the trace id
  everywhere (`x-trace-id` already does) and open by id; search is for browsing.
- **The root shows as "root span not yet received".** The trace's top span `POST` has a parent (the journey runner's
  `traceparent` span), and that span is never exported. Every trace made by prove looks headless in any viewer. Fix is
  small: prove exports a `journey.<name>` span as the root. Proposed as a step in O1.
- **The attribute-name index (`evidence/attribute-names-in-tempo.txt`) lists `payload.password`, `answer.token`,
  `answer.apiKey` and `answer.session`.** Today `target-effect` writes every payload field and every answer field as a
  span attribute (`handler/internal/attributes.ts`). With a local viewer that is a local leak; with Axiom it is a
  secret in a third party. The L2.P allowlist must land before any real sink (O1 makes that a rule).
- Not done: a screenshot (Grafana wants a login, `admin`/`admin` by default; the proposed viewer config turns the login
  off, to be verified in the build step). Axiom was not touched: no credentials, no account.
- The Collector reached the viewer through `host.docker.internal`, which Docker Desktop and OrbStack provide; on Linux
  it needs `--add-host=host.docker.internal:host-gateway`. The viewer is never started in CI.

## Decision it supports

`design/decisions/O1-observability.md`: the viewer is `grafana/otel-lgtm`, started by `architect telemetry view`, fed
by a second exporter on the same Collector. Prove's file read-back is untouched.

## Open risks

- The image is large; the first pull here took several minutes. It is pulled once, only by `telemetry view`.
- Tempo's search lag (minutes) is a property of its block flush, not measured here beyond "not at first".
- The viewer's start-up time to healthy was not timed; the pull dominated.
- Grafana anonymous access (`GF_AUTH_ANONYMOUS_ENABLED`, `GF_AUTH_DISABLE_LOGIN_FORM`) is untested here.
- The deep link to a trace in Grafana's Explore is written in O1 from Grafana's URL shape and not clicked.
