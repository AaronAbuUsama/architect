# monitor

The portal's monitor (M1.49, K18, `design/decisions/K18-monitoring-falls-out.md` and its addendum of fixed shapes). It answers `GET /_portal/v1/monitor?digest=`
(400 without a digest, 409 for another blueprint's, 404 without a live source) with `{ environment, now, alerts, issues }`.

- **Alerts.** `Monitor.read` evaluates `model.alertRules`, the list the compiler derived and the wire carries, over `live.source.window(ms, now)` for each
  window an alert names. A burn alert fires when `bad >= burn * (1 - target) * calls` over both its windows (equality fires, decided in integers) and its short
  window held at least `minCalls` calls. Every call counts, a refusal included: a refusal is a good call for the defect objective, and a latency call is bad when
  it took longer than the rule's `thresholdMs`, whatever it ended as. Calls are the telemetry module's (a retry is one call, its duration the extent of its
  attempts). A refusal that opened no span (a door refusal) is counted by `ortho.calls` and is not a call here. An anomaly or a verdict has no burn to read and is
  `unknown`, never `ok`. A window the source could not read leaves its alerts `unknown`.
- **Issues.** One per (operation, step, `error.tag`): the step is the deepest span under the failing attempt that ended as an error, the tag is the one the runtime
  writes on the attempt. A refusal opens none; a defect no step explains opens none. `occurrences` counts calls, never evaluations. `firstSeen` and `lastSeen`
  are a call's start and the operation's declaration hash in the wire in force when the portal saw it; `regressed` is the two differing.
- **The ledger.** Issues live past the window in the `MonitorLedger` the portal is handed (`PortalContext.ledger`): opaque JSON by key, one key
  (`monitor/issues`). With none the monitor keeps nothing. A Worker's ledger is `env.PORTAL_LEDGER` (a key-value binding, the shape of Workers KV), or, without
  one, a book that lives as long as the isolate (`server/internal/ledger.ts`). The read-modify-write is not atomic across requests: two portals racing can
  lose one count, never invent one.
- Nothing here sends anything or reads a clock: `now` is `live.now`. Local shows a firing alert and never delivers it.

Test: `monitor.test.ts`; the check is `e2e/m1/39-m1-49-monitor-derived.test.ts`.
