# Spike: portal-observability

**Question.** Can one operation's page show its docs and its live spans together, built only from the compiled model plus
one telemetry query, on HeroUI Pro, all running on this machine?

**Answer.** Yes. `allowance.spend`'s page in `app/` shows its declaration from `model.json` and its live calls, waterfalls,
refusals and logs from a local acme run. The page is one pure function, `operationPage(model, name, telemetry)`, and the
same function draws all 15 operations and the matrix. Two conditions: read telemetry from the Collector's own files, not
from Tempo; and keep HeroUI Pro out of anything Forman publishes, because its licence is per developer.

## Run it

```bash
cd spikes/portal-observability && ./run.sh up      # viewer, forman dev (acme), portal server, vite, traffic
open "http://127.0.0.1:5193/#/operations/allowance.spend"
./run.sh down                                      # stops all of it and removes the viewer
```

`app/` is its own pnpm workspace (like `spikes/portal-fumadocs`), so HeroUI Pro never enters the repository's lockfile.
Its install needs a HeroUI Pro login on the machine (`npx heroui-pro login`). Test: `cd app && node --test src/page/operation.test.ts`.

## What is in it

| Path | What |
|---|---|
| `research/README.md` | The open-source survey (licences, reuse, local running) and the data-path decision, by a research subagent, plus what the spike measured |
| `sketches/` | Three IA options as HTML screens with real acme model data and sample telemetry, plus the matrix, an event page and an error page. `shots/` has the screenshots; `tools/build.py` rebuilds them from the model |
| `app/src/page/` | The page as data: `operation.ts` (`operationPage`) and `trace.ts` (`traceView`). No clock, no fetch, no state |
| `app/server/` | The portal's small server: `/api/model`, `/api/journeys`, `/api/telemetry?source=file\|tempo&since=`. `file` is prove's own `FileSource.window`; `tempo` is a 70-line adapter over Tempo and Loki |
| `app/src/ui/` | The screens, on HeroUI Pro: AppLayout, Sidebar, Navbar, Segment, KPI, ComposedChart, and DataGrid (as a tree for the waterfall) |
| `app/traffic.ts` | Real calls against `forman dev`: answers, all three refusals, and replayed request keys |
| `shots/` | Screenshots of the live page |

## What was tried

1. Started the local viewer (`forman telemetry view`) and ran `forman prove --env local` in acme: `prove ✔` in 14 s, spans in
   Tempo, logs in Loki, linked by `trace_id` and `span_id`.
2. Ran `forman dev` for acme. It writes `.forman/dev-telemetry/{traces,logs}.jsonl` and also exports to the viewer.
   `traffic.ts` called it about once a second for 30 minutes as three test people from `/_world/cast`.
3. Built the page twice over: once as data (`operationPage`, tested), once as screens (layout A from the sketches: docs on
   the left, live on the right, F2's `/operations/allowance.spend?trace=&span=` URLs).
4. Fed the same page from two sources, the Collector's files and Tempo + Loki, switchable in the navbar.
5. Tried to break it: let the page poll Tempo every 3 s for 15 minutes, and checked what a build of the app contains.

## What was found

1. **The page is a pure function of model and telemetry.** `operationPage(model, "allowance.spend", telemetry)` gives
   the same page twice and leaves its inputs untouched (`operation.test.ts`, 5 tests passing, on 15 real traces). Every
   docs fact (fields, visibility, the move, the event, refusal codes and exits, steps, budget, ways in) comes from
   `model.json`. That keeps the door open for the portal to be generated from a blueprint later.
2. **Journeys are not in the model.** The portal's own `blueprint.json` says so (`extensions.journeys: unavailable`). The
   server reads journey files for their name and the verbs they import. That is a stopgap: the compiler should project
   journeys into the model.
3. **`NotAllowed` is visible today, from the HTTP span.** It is decided before the operation's span opens, so there is
   no `allowance.spend` span. But the `POST` span carries `http.route=/allowance/spend` and status 403, so the page counts
   it (23 in 30 minutes) and says where it came from. The sketches assumed it needed O2's metric. That metric is still needed
   for calls that don't arrive over HTTP.
4. **The commit is already in the trace, unnamed.** Every answered call has a `BATCH` span (D1's batch) under
   `allowance.spend`, beside the steps. That is O2 gap 1 seen live: it should become `allowance.spend.commit`.
5. **Query spans hang off the HTTP span, not the steps.** The `sqlite` span that `allowance.spend.load` caused is a
   child of `POST`, not of `allowance.spend.load`. So the step reads `<1 ms` and its query sits elsewhere. Worth a line
   in O2: the store's spans should run inside the step's span.
6. **Durations are whole milliseconds.** workerd's clock only moves on I/O, so most spans read 0 ms and the waterfall is
   coarse. Fine for a 150 ms budget; it can't show sub-millisecond steps. Nothing to fix on our side.
7. **Tempo is the wrong source for a live page.** Search found new traces about 30 s late (by id at once). Search
   returns at most its limit (300 of 1,412 traces), then the page needs one fetch per trace. After 15 minutes of 3 s
   polls (with requests overlapping) the viewer was at 550% CPU and 5.5 GB and stopped answering; it had to be restarted.
   TraceQL's p95 works, but from power-of-two buckets (a 2 ms p95 reads 2.097 ms; near 150 ms it can only say 134 or 268).
8. **The Collector's files are the right local source.** prove's `FileSource.window` answered 1,412 traces (6 MB of
   JSONL) in about 50 ms, with logs included and no lag. It is the same `TraceSource` prove and `watch` already use, so
   Axiom (staging) slots in behind the same call.
9. **HeroUI Pro works as the basis, and its licence decides where it can go.** It installs from HeroUI's CDN through a
   postinstall that uses the developer's login (Aaron's, valid 143 more days); nothing of it is committed
   (`node_modules/` is ignored). DataGrid's tree rows made the waterfall with little code. But a build of the app puts
   the compiled Pro components in the bundle (1.5 MB JS, 443 kB gzipped). The licence allows that inside an application
   the licensee builds. It does not allow redistributing the package, and each developer working with it needs a seat.
   So a **generator** that emits Pro code into every Forman user's project would make every user need a licence.
10. **Root imports pull every Pro peer.** `@heroui-pro/react`'s barrel needs motion, resizable panels and more;
    importing per component (`@heroui-pro/react/data-grid`) keeps the peers to motion and react-aria.

## Measurements

| What | Value |
|---|---|
| `forman prove --env local`, acme, viewer running | 14 s, every eval ✔ |
| Traffic | about 1 spend call per second; 30 min window: 238 spend calls, 58 refused, 0 defects, p95 3 ms against 150 |
| File source, whole window | 1,412 traces, 6 MB traces + 2 MB logs, 46–56 ms per poll |
| Tempo source | 0.2 s (12 traces) to 6.3 s (300, cold); capped at 300; viewer overloaded after about 15 min of polling |
| Tempo search lag | about 30 s after the calls; by id immediately |
| `operationPage` on 15 traces | under 1 ms per test |
| App bundle | 1.51 MB JS (443 kB gzip), 840 kB CSS (85 kB gzip): Pro's CSS is most of it |

## The decision it supports

- **Data path:** the portal's server reads a `TraceSource` (`window`, `find`): the Collector's files locally, Axiom on
  staging. The page maths (calls, refusals by tag, p95, minute buckets) is one pure module over `Trace[]`, shared by
  every source. Tempo stays as "open in Grafana" by trace id only. Recorded in `research/README.md`; to be folded into O1.
- **Page shape:** IA option A (docs and live on one page), at F2's URLs. Pending Aaron's answer to the grill in the PR.
- **Page data contract:** `OperationPage` (`app/src/page/types.ts`) is what a generator would emit; the screens render it.
  This is the seam that lets the renderer change without touching the data.
- **HeroUI Pro:** pending Aaron's answer (grill question 3). The spike's recommendation is to keep Pro in the portal
  Forman itself runs, and to let the generated portal render the same `OperationPage` with HeroUI OSS.

## Open risks

- **No defect was produced.** acme's journeys and the traffic raise none, so the red path (`defect` attribute, status 2)
  is coded and typed but not seen live. A fixture handler that dies would prove it.
- The file source rereads whole files each poll. 6 MB took 50 ms; a long-running `forman dev` will grow past that. It
  needs a cache keyed on size and modified time, or rotation.
- Private values: the files hold whatever the Collector kept. The page shows only `payload.*` and `answer.*` that are on
  the span, which the L2.P allowlist already limits; the span inspector shows every attribute, so any leak upstream shows here.
- Proof status in the matrix is not live: the logbook keeps one verdict per operation and isn't wired in. The sketches show
  where it would go.
- The Tempo overload had two causes mixed: the per-trace fetches and overlapping polls (the page doesn't wait for one
  answer before asking again). Not separated.
- HeroUI Pro is `1.0.0-beta.11`; its API may move. The login expires (143 days left); CI would need `HEROUI_AUTH_TOKEN`.
- Event and error pages exist only as sketches; the live page links to their sections on the operation page.
