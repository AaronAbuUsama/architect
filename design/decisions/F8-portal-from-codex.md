# F8: What the portal takes from Codex's portal

Decided 19 November 2026. Aaron: "Yes, fold them in" (relayed by the conductor), on an audit of Codex's portal against
`m1`. The 📐 portal thread checked each point in the code and made the calls below under "Who decides" in `AGENTS.md`.
Where Codex's portal and Aaron's agreed design (`design/portal.md`, rounds 1 and 2) differ, the agreed design stands.

**Credit.** Codex built a working portal on `experimental/portal-pro`, under `internal/portal-pro`. The ideas below are
its. Its code is not imported: it breaks the six-slot rule in places (`src/capture.ts` and `src/action-cli.ts` are entry
files beside `main.ts`), the clock rule (`new Date(...)`, `Date.parse`, top-level `await` in `capture.ts`), and it uses
retired names (`architect`, `.architect/prove-telemetry`).

## Taken, and where each lands

| # | Idea | Codex's code (on `experimental/portal-pro`) | Ours | Slice |
|---|---|---|---|---|
| 1 | Notes are Markdown pinned to one declaration's hash, flagged stale when it moves, saved only against the revision the writer opened | `workspace-notes/service.ts:29-33` (`about: kind:name@hash`, `stale`), `:42-58` (a save checks `expectedRevision`, else 409) | The body is Markdown and the pin is `kind:name@hash`, but the store is the portal's own `note` thing (Q9), never files in the repository. `note.edit` takes the revision it was opened at and refuses `NoteChanged` otherwise | M1.13 |
| 2 | The operations matrix: calls, refused, defects and p95 against budget, one row per operation | `operations/internal/grid.tsx` (sortable columns, p95 toned against the budget) | The stat grid under home's thing cards and on each thing's page, from `ortho.calls` and `ortho.call.duration`; the budget is the operation's declared `budget.p95` | M1.13 |
| 3 | The span waterfall with collapsible groups | `operations/internal/trace-panel.tsx:23-44` (spans grouped under their parent, each a `<details>`) | The trace drawer, grouped by attempt, then step, then each `on:` handler | M1.13 |
| 4 | Sanitising spans for the portal, with a test that nothing leaks | `site/internal/calls.ts:46-58` keeps ids, timing, outcome, a log count and declared refusals; `site/site.test.ts:44-75` plants a raw statement, a log body and a failure message and asserts none renders | Keep structure and timing and the caller's kind; never show raw statements, payload values that are not public, which person called (`principal.person`) or log bodies. Locally the journey's cast names (fixtures) may show. The "no leak" check is M1.13's, in line with M1.19 | M1.13 |
| 5 | Replaying a window that ends at a fixed time | `capture.ts:49`, `main.ts:27` | `TraceSource.window(since, now)` already takes `now` (`packages/prove/src/modules/telemetry/types.ts:68` on `m1`); the portal's tests and screenshots pass a fixed `now`, so they are deterministic | M1.13 |
| 6 | An action host an agent can drive: `list`, `view-screen`, `navigate` with a tab id, and an `AGENTS.md` that says to read the screen first | `action-cli.ts`, `agent/internal/actions.ts`, `AGENTS.md` | `list` is the `defineAction` registry's listing with input schemas (M1.23, over M1.22's generated actions); `view-screen` and `navigate { tab, to }` are the shell's, with screen context held per tab (M1.24); the portal's `AGENTS.md` is generated from the model (M1.24) | M1.23, M1.24 |
| 7 | Extensions in sandboxed iframes, with an allowlist of actions | `extension-host/service.tsx:15` (CSP `default-src 'none'; connect-src 'none'`), `:81` (`sandbox="allow-scripts"`); `extensions/proof-summary/extension.json` (`permissions.appActions`) | Every `Portal.face` renders in a sandboxed frame with that CSP, and its bridge calls only the actions the face declares. This is the runtime partner to the `orthograph/face-actions-only` lint rule. No free-form `extension.json`: the face's typed slots are its manifest. The drawing slots run in a frame served from a portal route, loading `portal-ui` and Pro from the deployed portal's build (never bundled into a face, F7); reads, actions, the live feed and a Run's stream cross one bridge (`design/portal.md`, "Extensions") | M1.13; M3.17 and M4.23 prove it on their faces |
| 8 | A proof tab on each operation: evals with timings, journeys, coverage | `operations/internal/proof.tsx`, `proof-report/service.ts:5-34` (scrapes a report's printed lines with regexes) | Rebuilt on M1.04's verdicts, keyed by the model's hash and the handler body's hash, read from the logbook, never scraped: each eval's verdict, the covering journeys, what is unproven. No eval timing: on `m1` it is only a printed note (`packages/prove/src/modules/evals/internal/run.ts:16`), so latency is the live p95 beside it | M1.13 |

## Kept, where Codex's portal differs

- **Typed `Portal.face` slots** (Q11), not repository `extension.json` files with string slot names.
- **Generated per-operation actions** with `ActionRefusal` (M1.22, M1.23), not a hand-written action host.
- **The chat is a Pi Durable run** (Q1, Q7), drawn with `portal-ui`'s chat parts (F7).
- **The app's own sign-in and roles** (Q10), not an unauthenticated local host.
- **One live portal per environment** (Q12), not a captured `public/capture.json`.
- **Home is thing cards with lifecycles, grouped by `from`** (Q2, Q3). The operations matrix sits under them and does
  not replace them.

## The data the pages need, checked on `m1`

These go on M1.13's row, so the drawing is never ahead of the data.

1. **No HTTP request span.** The wire turns the automatic HTTP span off
   (`packages/language-effect/src/modules/wire/internal/call-telemetry.ts:39`, `HttpMiddleware.TracerDisabledWhen`), so
   a call refused at the door (`NotAllowed`, a bad payload) has no span. Call counts and door refusals come from
   `ortho.calls` and `ortho.call.duration` (`handler/internal/call-metrics.ts:4-5`). Codex's portal reads status codes
   from an HTTP parent span; ours never does.
2. **Retries group by attempt.** Each attempt is the operation's span with `attempt` (`handler/service.ts:102`); the
   commit is `<op>.commit` with `commit.outcome`, `commit.writes` and `commit.entries` (`:87-88`). There is no HTTP parent
   to group under.
3. **Database steps are `step.kind: "database"`** (`handler/service.ts:48`), never a regex over SQL (Codex's
   `calls.ts:22-23`).
4. **What a call shows:** `move.name` and `move.to` (`handler/internal/move.ts:48`), the public `payload.*` and
   `answer.*` attributes (M1.19), the environment and its sink, and M1.21's step signals.
5. **The portal wire is short.** It decodes things, operations, environments and blanks
   (`packages/portal/src/modules/wire/types.ts:70-75` on `m1`). Operations carry `errors` and `refusals` as names. The
   agreed pages also need `from`, each thing's events and errors with their codes and exits, journeys, starting worlds,
   stores and mounts. M1.13 adds them to the wire and its schema version.

One gap closes: an operation may already declare its latency budget (`budget: { p95: "200 millis" }`,
`packages/orthograph/src/modules/operations/` on `main`), and on `m1` it reaches the portal wire as `budget.p95Ms`
(`wire/types.ts:49`). So "p95 of 150" is generated where a budget is declared, p95 alone where not, and
`design/portal.md`'s gap 2 is closed.

## Where it lands

M1.13 (notes, the matrix, the waterfall, sanitising and its check, the fixed window, sandboxed faces, the proof tab,
the wire), which now also needs M1.04. M1.23 (`list`) and M1.24 (`view-screen`, `navigate`, per-tab screen context,
the generated `AGENTS.md`).
