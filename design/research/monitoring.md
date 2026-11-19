# Monitoring that falls out of the model

Research for K18, 19 November 2026, by the 📐 portal designer, answering Aaron: "we dont even have alearts, errors, or
dashboards we should research and design the critical path. the thing that we ship and space for designing more".

The question is how much of monitoring Orthograph can generate from the blueprint, with nothing set up by hand:
alerts, error tracking and dashboards. Then it asks what must still be declared, and where. The drawing is the
Issues and Alerts pages in `spikes/portal-site` (published at https://claude.ai/artifact/NzDgHFzQSk8yvX8cLNqUKj).

## For the ear

Every operation already declares most of what a monitoring tool asks you to type in.

- Its latency budget is a latency target. Its declared errors are the answers that are not failures. Anything else
  that goes wrong is a defect, and a defect is a bug.
- So the alerts write themselves:
  - A budget becomes a latency objective, with the standard alerts on how fast it is being missed.
  - Every operation gets a defect objective.
  - Every declared error gets a "more of these than usual" alert.
  - Every journey gets a "this stopped passing in staging" alert.
- Defects group into issues by operation, step and error. The model already knows all three, so there are no stack
  traces to guess from.
- Where alerts go is the one thing the blueprint can't know. It belongs in the environment file, next to the sink.
- Two things need a new declaration:
  - a state a thing should not sit in too long;
  - a dashboard of your own.

## What each tool teaches

The tools studied are Sentry, Datadog, Honeycomb, Grafana, Axiom, Encore and Supabase, from their documentation, read
on 19 November 2026. The sources are listed at the end.

| Tool | What it does well | What we take | What we leave |
|---|---|---|---|
| Sentry | Groups errors into issues by fingerprint. Marks an issue regressed when it comes back in a later release. Gives each issue an owner from code ownership | The issue as a group with first seen, last seen and a regressed state. The model hash stands in for the release. The declaring file is the owner | Stack-trace hashing: we have a better key |
| Datadog | Builds service dashboards and SLOs from service metadata. Has burn-rate monitors | One page per service. The SLO with its error budget | Hand-tagged services: our model is the tag |
| Honeycomb | SLOs over spans, defined as a query on which events count as good. Burn alerts | Good and bad decided per call from span attributes we already write | Hand-written good-event queries |
| Grafana | The Foundation SDK: dashboards and alert rules as typed code, versioned with the app. Variables, such as the environment | Typed dashboards as code, as the extension point. The environment as a variable | Click-built dashboards as the source of truth |
| Axiom | Monitors over APL queries: a threshold, a match or an anomaly. Notifiers for routing | Generated monitors when Axiom is the sink, since Axiom has no SLO object | Monitors kept by hand in the Axiom UI |
| Encore | Generates per-endpoint dashboards from the app's own model, with no configuration | Proof that "derive views from the app model" works for real users | Encore's fixed set: ours follows our declarations |
| Supabase | Ready-made reports per product area, such as API, database and auth | A page per area, ready when you open it | Reports that ignore the app's own meaning |

## What falls out, with nothing configured

Each row comes from a declaration Plugged In already has.

| From | Falls out as | Kind | Default |
|---|---|---|---|
| `budget.p95Ms` on an operation | A latency objective: 95% of calls within the budget over 28 days | SLO and two burn alerts | Fast burn: 14.4× over 1 h and over 5 min pages. Slow burn: 6× over 6 h and over 30 min pages. 1× over 3 days and over 6 h opens a ticket |
| Every operation | A defect objective: 99.9% of calls end without a defect. Refusals count as good | SLO and burn alerts | The same windows |
| Every operation | Calls, refusals by code, defects and p95 against the budget line | Panels on the Metrics tab | Always shown |
| Each declared error (refusal code) | Its rate against its usual rate at the same hour over the last 7 days | Anomaly alert, ticket only | Never pages: a refusal is the app answering |
| A defect | One issue per operation, step and error tag, with first seen, last seen, owner and regressed | Issue | Owner is the plugin or file that declared the operation |
| A machine | Moves per arrow, and refusals on the arrow they guard | Panel on the thing page | No counts of things in each state (round 2 Q4) |
| Each event | Its rate | Panel on the Events page | Always shown |
| Each journey | Its verdict per environment | Alert | Staging goes to the builder. Production pages |
| Each plugin | The roll-up of its things' operations | Panel on the plugin page | Always shown |
| Each environment | The same panels side by side | Comparison | Setup and proof readable from any portal |
| The whole app | The worst first: firing alerts, open issues, budget breaches | Home and "Needs you" | Always shown |

Every rule carries the same labels: `environment`, `operation` (or `journey`, `event` or `code`), `severity` and
`owner`. Routing works on labels only.

### Per environment

| Environment | Alerts | Issues |
|---|---|---|
| local | Shown in the portal and never sent | Shown in the portal |
| test | None: each world lives for one pull request. The verdicts are the signal | None |
| staging | Sent to the builder. Never pages | Kept, with the owner |
| production | Pages on fast burn, a ticket on slow burn. Journeys page | Kept, with the owner and regressed |

## What must be declared, and where

| What | Why it can't fall out | Where it is declared | Default if absent |
|---|---|---|---|
| Where alerts go | The model doesn't know your pager or channel | `alerts` on the environment file, next to `telemetry` | local: shown only; staging: the portal's "Needs you"; production: the same, until a route is named |
| A different target from the defaults | 95% within budget and 99.9% without a defect suit most operations, but not all | Optional `slo` on the operation | The defaults above |
| Owner, when it isn't the declaring file | A file can have several owners | Optional `owner` on the operation or the plugin mount | The declaring file or plugin |
| Turning off one refusal's anomaly alert | Some refusals spike for good reasons, like a campaign that sends people to claim names | Optional `alert: false` on the error | On |
| How long a thing may stay in a state | The machine says where a thing can go, not how long it may wait | Optional limit on a machine state (K18 Q3) | No rule |
| A dashboard of your own | Only you know which operations you want side by side | `blueprint/dashboards/<name>.ts`, typed, referring to declarations (K18) | None: the generated pages cover the basics |
| Splitting one step's defects | A generic error tag, such as `DatabaseError`, can hide several bugs | Optional `groupBy` field on the step | Operation, step and error tag |

Routes can lower a severity but never raise it. A route can only send fewer pages, so it can't page anyone for
something the model considers routine.

## Pitfalls found

- **Generic error tags.** One `DatabaseError` can be three bugs. Splitting by a declared field fixes this, not hashing.
- **Infrastructure fan-out.** When the database is down, every operation's defect alert fires at once. A rollup by
  `step.kind` across operations sends one alert, not twelve.
- **Renames.** Renaming an operation would orphan its issues and objectives. The model hash history maps the old name
  to the new one.
- **Regressed must compare the right hash.** It should compare the operation's own declaration hash, not the whole
  model's. Otherwise any unrelated change marks every issue regressed.
- **Low traffic.** With a handful of calls an hour, one slow call blows a burn-rate alert. Burn alerts need a minimum
  number of calls in the window before they fire. The research suggests 20 calls in the short window.
- **Axiom has no SLO object.** For Axiom, generate threshold monitors that compute the burn rate in APL, one per
  window pair. Grafana and Datadog take SLOs natively.
- **Counting things in a state.** That is reading stored data, which round 2 Q4 rules out of the portal. Alerting on a
  thing held too long needs another signal (K18 Q3).

## Custom dashboards: conventions

- Golden signals come first: calls, refusals, defects, then latency against the budget.
- One time control for the whole page.
- The environment is a variable, not a copy of the page.
- Red means defects only. Refusals are amber.
- A panel refers to declarations, never to a metric name typed as a string:

```ts
// blueprint/dashboards/public-page.ts
import { Dashboard, Panel } from "orthograph";
import get from "../things/profile/verbs/get.ts";
import order from "../things/link/verbs/order.ts";

export default Dashboard.make({
  description: "What a visitor to a public page experiences.",
  panels: [Panel.latency(get), Panel.refusals(order), Panel.rate(order.move.emits)],
});
```

## Sources

These were read on 19 November 2026. Nothing was sent to any of these services, and no account or token was made.

- Google SRE Workbook, "Alerting on SLOs": multiwindow, multi-burn-rate alerts. https://sre.google/workbook/alerting-on-slos/
- Sentry, event grouping, fingerprints and regressions. https://docs.sentry.io/concepts/data-management/event-grouping/
- Datadog, service level objectives and burn-rate alerts. https://docs.datadoghq.com/service_management/service_level_objectives/
- Honeycomb, SLOs and burn alerts. https://docs.honeycomb.io/notify/alert/slos/
- Grafana, the Foundation SDK: dashboards as code. https://grafana.com/docs/grafana/latest/observability-as-code/foundation-sdk/
- Axiom, monitors and notifiers. https://axiom.co/docs/monitor-data/monitors
- Encore, built-in metrics and dashboards. https://encore.dev/docs/observability/metrics
- Supabase, reports. https://supabase.com/docs/guides/telemetry/reports
