# Sketches: docs and live observability on the same page

Open `index.html`. Every sketch is static HTML, dark, 1440 by 900. Screenshots are in `shots/` (`*-full.png` is the whole page).
`tools/build.py` regenerates all of it from the real model: `python3 tools/build.py`.

**What is real and what is sample.** Everything about the blueprint is real: names, fields, roles, the machine move, the
event, errors with codes and exits, steps, budgets, journeys, handler lines (`examples/acme/generated/model/model.json`,
`src/allowance/spend.ts`, `journeys/`). The traffic is made up, in the shape of a real trace. Each page says so in its footer.

**Two honest findings the sketches show.**
1. A `NotAllowed` refusal happens before the operation span opens, so it leaves no `allowance.spend` span, only the HTTP root.
   The sketches count it from the `forman.calls` metric (O2 gap 3) and say "metric only, no span". Until O2 lands those rows read 0.
2. `memo` is public free text, so today it is in every trace. The field table flags it: "untraced after O2" (O2 gap 2).
   The event keeps `memo`; only the trace loses it. The commit shows as a dashed span "once O2 lands" (O2 gap 1).

## The three options

### A. Docs page with a live rail (recommended)
One operation, one page. Docs on the left (ways in, payload, answer, move, event, refusals, steps, journeys, annotated handler).
Live on the right (waterfall per call, span inspector, p95 against budget, recent calls, refusals with the log that decided each,
correlated logs). A strip of numbers sits on top. The handler source carries live numbers in its gutter, so the trace is on the function.
Files: `a-operation.html`.

| Page | URL | Click-through |
|---|---|---|
| Operations matrix (home of the catalog) | `/operations` | row to its operation page |
| Operation | `/operations/allowance.spend?trace=<id>&span=<name>` | to its thing, event, each refusal, each role, each journey; a span to the handler line and back |
| Thing hub | `/things/allowance` | operations, events, errors, with live counts |
| Event | `/things/allowance/events/AllowanceSpent` | to the emitting operation and one occurrence's trace |
| Error | `/things/allowance/errors/AllowanceExceeded` | to the operations that raise it; a refusal to its trace |

### B. Operation as a service card with tabs
The page is a card (name, chips, four numbers, p95 chart) with tabs Docs, Calls, Traces, Logs, Refusals, like a SigNoz service.
One tab at a time. Files: `b-operation.html` (Traces tab), `b-operation-docs.html` (Docs tab).

| Page | URL | Click-through |
|---|---|---|
| Operations matrix | `/operations` | row to the card |
| Operation card | `/operations/allowance.spend?tab=docs\|calls\|traces\|logs\|refusals` | tab keeps the selected trace in the URL; "docs for the selected span" panel links to the Docs tab |
| Event, Error | same as A | same as A |

### C. Trace-first: the explorer is home, docs in a side sheet
Home is a trace explorer with facets (operation, outcome, refusal, duration). Docs open in a sheet beside the selected call.
Matrix is one more view. Files: `c-operation.html`.

| Page | URL | Click-through |
|---|---|---|
| Trace explorer | `/traces?operation=allowance.spend&outcome=refused&trace=<id>` | facet counts; a row opens the waterfall |
| Docs sheet | same URL plus `&sheet=allowance.spend` | "open full page" goes to `/operations/allowance.spend` |
| Matrix, Event, Error | `/operations`, `/things/...` | same as A |

## You do X, what happens

| You do | A · live rail | B · tabs | C · trace-first |
|---|---|---|---|
| A call was slow: where do I click? | Matrix row (p95 red against budget), then the operation page: the slow call is in the recent calls, click it, the waterfall opens beside the docs for the step | Matrix row, card, Traces tab, sort by duration | Home explorer, filter "over budget", click the row |
| Refusals spike | Matrix refused column, operation page "refusals by tag", read the `refusal.log`; or the error page for the same tag | Card, Refusals tab | Facet "refusal", one click; docs sheet shows what the refusal means |
| I want the payload fields | Same page, left column, no click | Docs tab, one click | Open the sheet |
| I came from a log line (trace id) | Paste the id: `/operations/allowance.spend?trace=<id>`, scrolls to its waterfall | Same URL with `tab=traces` | `/traces?trace=<id>` |
| Is NotAllowed happening? | Refusals table, marked "metric only, no span", count from `forman.calls` | Refusals tab, same note | Facet shows `14*` with the same note; no row to click, because there is no trace |
| A span is odd: what code is it? | Inspector: handler `spend.ts:13`; the gutter in the source card shows the same span's numbers | Panel under the waterfall links out | Sheet scrolls to the handler line |

## Graded

| Axis | A · live rail | B · tabs | C · trace-first |
|---|---|---|---|
| Floor-first (ships the real thing now) | ✅ docs half works today from the model; live half fills as telemetry arrives | ⚠️ same data, but docs hide behind a tab | ❌ needs a trace store and an explorer first; docs wait |
| Reversibility | ✅ the rail is a column; drop it and the docs page remains | ✅ tabs are additive | ⚠️ home changes, URLs change |
| Blast radius | ✅ one URL per declaration, nothing re-homed | ✅ same | ❌ new top-level IA beside the catalog |
| Correctness (honest about gaps) | ✅ each gap is shown where it bites (NotAllowed, memo, commit) | ✅ | ⚠️ NotAllowed has no row at all |
| Fit with F2 (`/operations/allowance.spend`, thing hubs) | ✅ exact | ✅ exact, adds `?tab=` | ⚠️ adds `/traces`, makes the matrix secondary |
| Aaron's ask: docs and traces on the same page | ✅ visible together | ⚠️ together only by switching tabs | ⚠️ together only in the sheet |

## Recommendation

**A.** It is the only one where the docs and the spans on the functions are in the same view, and it keeps F2's URLs.
Take B's deep-linkable `?trace=&span=` and add a `?tab=` later if the rail gets long. Keep the matrix as the operations index.
The matrix, event and error sketches are in A's style.
