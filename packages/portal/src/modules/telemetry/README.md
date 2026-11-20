# telemetry

What a portal reads of its environment's live traffic (M1.13, `design/portal.md` holes 2 and 7), put on the wire for the client.
`PortalContext.live` is `{ environment, source, metrics, now, windowMs }`: `source` is a `TraceSource`'s `window` and `find`, `metrics` a
reader of `ortho.calls` (`prove`'s `FileMetrics`), `now` the only clock. Both are structural, so the portal never imports `prove`.

- `Telemetry.read(blueprint, live)` is the snapshot's `telemetry` (`GET /_portal/v1/snapshot?digest=`): `calls` (one row per call, newest
  first: a retry is one row; caller kind derived; duration the extent of its attempt spans; over budget from the model; request key and
  role held `null`, the page says `not yet`), `moves` and `journeys` per operation, and `metrics` (counts per operation and refusal from
  `ortho.calls`, with door refusals: counted by the metric, accounted for by no span, never a row). A source that fails is
  `unavailable` with its reason: nothing it would have filled is zero.
- `Telemetry.trace(live, id)` is `GET /_portal/v1/traces/<id>`: structure, timing, outcome, attempt and a log count per span.
- Scrubbed here: only declared operation and refusal names and a whitelist of structural attributes are copied, so a statement, a person's
  id, a payload value or a log body has nowhere to land. Test: `telemetry.test.ts`.
