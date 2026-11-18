# The app that falls out of `forman generate`

> **Layout superseded by `UX.md` (pass 3).** The parts, the blocks and F6's four answers below still hold. The screens
> and the page language's look are replaced: see `UX.md` and `shots/`. Pass-1 screens are in `shots/pass-1/`, and
> agent-native is now a source of ideas, not the shell.

Design for pass 1, 18 November 2026. It replaces "the portal" with one agent-native app. Nothing here is built yet; the
prototype (pass 2) waits for Aaron's answers to the four questions at the end.

The sketches are real: every name, field, count and span in them comes from acme's `generated/model/model.json` and
one local run's Collector file (1,631 traces over 24 minutes, from the `portal-observability` spike's traffic, PR #39). The
extractor is `tools/extract.py`; the screens are `sketches/index.html`; `tools/shoot.mjs` makes `shots/`.

## In one paragraph

Forman is the spine and agent-native is the shell. `forman generate` writes one app: a tree of pages, a chat that
sees the screen, and one action per operation. Most pages are generated from the model. They are made of **blocks**:
a derived block is drawn from the model every time it is shown, so it can't drift, and it names its source file and
hash. A live block is drawn from telemetry for the environment in scope. Between the blocks, people and agents write
prose. Prose is pinned to the hash of what it talks about, so when the code changes the prose is flagged, not lost.
People and agents can also make pages of their own, and put any block in them. The shell never writes domain data:
its actions call acme's Worker through the generated SDK, as a caller.

## What it's made of

| Part | Who owns it | What it is |
|---|---|---|
| Model | Forman | `generated/model/model.json`: things, operations, machines, events, errors, roles, environments, hashes |
| Worker | Forman | acme's server on workerd, D1 and Durable Objects. `forman dev` runs it at `127.0.0.1:8787` |
| Telemetry | Forman | spans and logs through the Collector into `.forman/dev-telemetry/{traces,logs}.jsonl`, read by prove's `TraceSource` |
| Proof | Forman | the logbook's verdicts (not wired in pass 2; cells say "unavailable", never green) |
| Shell | agent-native `0.228.2` | React 19, react-router, Tailwind 4, Nitro 3, Better Auth, Drizzle on PGlite, the chat, actions |
| The app | generated | `generated/app/`: the actions, the page templates, the block components, the server's two readers |

**Version.** `@agent-native/core@0.228.2`, published 13 November 2026, five days before today, so it passes R1's
three-day rule with no override. `0.229.0` (16 November) is too young. The package moves daily (a nightly every few
hours), so the prototype pins it exactly and records it here.

## The page language: four blocks and prose

A generated page is a list of blocks with prose between them. The blocks are the docs canon's components (PR #38),
plus one for live data:

| Block | Draws from | Can be stale? | Example |
|---|---|---|---|
| `<Model>` | the model, at render time | no, it is never copied | `<Model operation="allowance.spend" show="errors" />` |
| `<Live>` | a `TraceSource` window, for the environment in scope | it says its window and source | `<Live operation="allowance.spend" show="calls" />` |
| `<Scenario>` | a journey file (journeys aren't in the model yet) | it names the file | `<Scenario journey="examples/acme/journeys/spend-within-allowance.ts" />` |
| `<Note>` | the page itself: a question, a decision, a status | it names its slice or decision | `<Note kind="decision" decision="O2">…</Note>` |
| prose | a person or an agent | **yes**: pinned to a hash | "Olga's team spends from this all day…" |

Each block shows where it came from in its header: `blueprint/things/allowance/verbs/spend.ts:13-14` for a derived
block, `local · last 24 min · 1631 traces` for a live one. You can't type inside a derived block; you can comment on
it, and write around it.

## Derived, written, and stale

- **Derived blocks can't go stale.** They are references, not text. The page stores `<Model operation="allowance.spend"
  show="errors" />`, and the app draws it from today's model.
- **Prose can go stale, and says so.** Each prose section is saved with what it is about and that thing's hash:
  `about: allowance.spend@aee8ecae`. When `forman generate` moves the hash, the section turns amber: "spend changed
  after this was written: `errors` gained `AllowanceExceeded`". The change is read from `Compare` (the same diff the
  versioner uses). Two buttons: show the change, or "still true", which re-pins it to the new hash.
- **Generate never touches prose.** A regenerated page keeps its prose slots by their anchor. If a declaration is
  removed, its page becomes an orphan with its prose kept, flagged, until someone deletes it.
- **Agents write as suggestions.** An agent's prose arrives as a suggestion (Content's `suggest-document-edit`) until a
  person accepts it. The note page in the sketches shows one.
- **What we borrow, and what we add.** Content keeps Markdown documents in a tree, with Yjs live editing and comments
  anchored to quoted text. It has no locked or derived regions; the blocks are what we add, as MDX-style components the
  editor renders but won't let you type into.

## The page kinds

| Kind | URL | Derived | Live | Written |
|---|---|---|---|---|
| Live (home) | `/live` | operation list, budgets | calls, events, refusals, defects, every operation against its budget | — |
| Environments | `/environments` | the four declared, from `environments.*` | which is up, where, what it's running | — |
| Thing | `/allowance` | fields, operations, events, errors, roles, machine | counts per operation | prose |
| Operation (and read) | `/allowance/spend` | payload, answer, move, refusals, ways in, the action | calls, recent calls, a trace waterfall | prose |
| Machine | `/allowance/machine` | states, moves, the generated refusal | moves seen, refusals by the machine | prose |
| Event | `/allowance/events/AllowanceSpent` | fields, which move emits it | latest, rate | prose |
| Error | `/allowance/errors/AllowanceExceeded` | code, exit, carried fields, which operations refuse with it | where it was seen | prose |
| Role | `/allowance/roles/grantee` | which operations it opens | refusals `NotAllowed` | prose |
| Journey | `/journeys/spend-within-an-allowance` | steps and assertions, from the file | last run's spans | prose |
| A page someone wrote | `/pages/how-allowances-should-feel` | any block they put in | any block they put in | all of it |
| A conversation | `/chats/<id>` | — | the traces it opened | the chat, saved |

## How a page links to its live data

One scope and one reader:

- **The scope** is in the top bar: environment, window, and who you are acting as. Every live block on the screen uses
  it. F2 already decided the environment is a scope, not a section.
- **The reader** is the shell's server, which owns two adapters: the model (one JSON file) and a `TraceSource`
  (`window`, `find`), the same interface prove and `watch` use. A live block asks for a named slice, never raw
  spans: `calls(op, window)`, `trace(id)`, `refusals(window)`, `events(window)`, `budget(op, window)`.
- **The maths is pure.** `operationPage(model, name, telemetry)` from the `portal-observability` spike is already one
  pure function over `Trace[]`, tested on real traces. The prototype moves it in.
- **Fresh enough.** The page asks every 2 seconds through agent-native's poll helper. The spike measured 50 ms for a
  6 MB file; it needs a cache keyed on size and modified time before a long `forman dev` grows past that.

## The data path, and Docker (decided here)

The shell reads the Collector's files. It does not receive OTLP itself, and it does not use Tempo.

- **Not Tempo.** The observability spike (PR #39) measured it: search lags about 30 seconds, caps at 300 traces, and fell over after 15 minutes
  of polling (550% CPU, 5.5 GB).
- **Not OTLP straight into the shell.** The Collector is where private attributes are stripped
  (`.forman/dev-telemetry/collector.yaml`: `attributes/private` deletes `payload.password`, `answer.token` and more).
  Sending OTLP to the shell would skip that, and the shell would hold secrets it must never hold.
- **Docker stays where it is, for now.** `forman dev` already runs the Collector in Docker (`forman-collector-<pid>`).
  The shell needs no Docker of its own: it reads a file. Moving the Collector to a native `otelcol-contrib` binary is
  worth doing, but it is a `forman dev` change, not an app change, and it doesn't block the prototype.

## The actions

One action per operation, generated into `generated/app/actions/<thing>-<verb>.ts`. The app's buttons, the chat, HTTP,
MCP, A2A and the CLI all run the same file.

| Forman | agent-native |
|---|---|
| payload | `schema` (zod) |
| answer | `outputSchema` |
| declared errors and refusals | `errors: defineActionErrors(...)`; the codes are `refusals`, so `NotAllowed` and the machine's refusal are in the set |
| `idempotent: "request"` | `retrySafe: true`, and `run` sends a request key |
| a read | `readOnly: true` |
| `.notVia(Via.agent)` | `needsApproval: true`. Not in the model until M2.01, so every action is `false` today |
| the body | `run`, which calls the Worker through the generated SDK, as the caller |

This is spend's, as the generator would write it (the sketch's operation page shows it from the model):

```ts
// Generated from blueprint/things/allowance/verbs/spend.ts. Do not edit.
import { defineAction, defineActionErrors } from "@agent-native/core/action";
import { z } from "zod";
import { acme } from "../server/acme.ts";

export const errors = defineActionErrors("AllowanceExceeded", "AllowanceNotActive", "NotAllowed");

export default defineAction({
  description: "Spend from what is left of this month's allowance.",
  schema: z.object({ allowance: z.string().startsWith("alw_"), amount: z.string().regex(/^\d+$/), memo: z.string().max(200) }),
  outputSchema: z.object({ remaining: z.string().regex(/^\d+$/) }),
  errors,
  readOnly: false,
  retrySafe: true,      // idempotent: "request"
  needsApproval: false, // no .notVia(Via.agent) yet (M2.01)
  run: (args, ctx) => acme.call("allowance.spend", args, ctx), // the SDK, as ctx's caller
});
```

Actions live one per file under `actions/`, named from the file in kebab case, and are served at
`POST /_agent-native/actions/allowance-spend`, to the UI (`useActionMutation`), the chat, MCP, A2A and
`pnpm action allowance-spend '{json}'`. agent-native has no general idempotency key, so `run` sends spend's request key
itself. A refusal comes back as `errors.fail(message, "AllowanceExceeded", { details })`, with the error's carried fields
(`remaining`) in `details`. That is agent-native's typed failure, so a chat can switch on it. Forman's errors stay
values inside the Worker; the shell turns the answer into agent-native's failure only at its edge.

The shell's own actions are hand-written once in the template, not per project: `screen`, `describe`, `calls`,
`trace`, `refusals`, `events`, `environments`, `read-page`, `write-page`.

## The chat

The chat is agent-native's. It knows the current screen, and Forman gives it tools to read the rest:

- **the screen**: the page writes agent-native's `navigation` and `selection:<tab>` keys (the page, the scope, the open
  trace), and the app's `view-screen` action turns them into the `<current-screen>` block core injects on every turn;
- **the docs**: `describe` (the model), `read-page` (any page, prose included);
- **the traces**: `calls`, `trace`, `refusals`, `events`, over the same `TraceSource`.

"Why did spend refuse ada?" is the test. The sketch's operation page shows the honest answer from today's data: ada
never called spend under her name in that window, but 92 spend calls were refused `NotAllowed` and nobody is named on
them, because the role check runs before the operation's span opens (O2 gap 3). The model says spend is open only to
`allowance.grantee`, and ada is `organization.owner`, so if one of them was ada, that's why.

When the call goes **through the app**, the app knows who it called as (`ctx.userEmail`, and the cast name it acted
as). Better still, agent-native can export its own spans over OTLP (`@agent-native/otel`, when
`OTEL_EXPORTER_OTLP_ENDPOINT` is set). Pointed at the same local Collector, and with the action passing `traceparent`
to the Worker, the app's action span becomes the parent of acme's `POST` span: one trace, from the button to the
commit, with the caller named on the app's side. So It records the caller next to the trace id the
Worker answered with. "run it as ada" gives an exact answer. That is the prototype's check.

## Gaps found while drawing

1. **Journeys aren't in the model** (`LATER = ["starting-worlds", "journeys"]`). The `<Scenario>` block reads the
   journey file, as the observability spike did. The compiler should project them.
2. **`NotAllowed` names nobody.** Only the HTTP span sees it (status 403), and it carries no principal. O2's metric will
   count it (M1.20) but, by design, won't name a person. The app's own call log fills this only for calls it made.
3. **`allowance.revoke`'s span has no `move.name`.** Its handler calls `move("revoked")` inside `steps.update(…)`, so
   `chooseOutcome` writes `move.name` on the step's span (`packages/language-effect/src/modules/handler/internal/move.ts:48`,
   called from `service.ts:59`). The sketch counts moves from events instead. Small fix: annotate the parent span.
4. **"Where allowances are now"** (a count by state) isn't in telemetry. It needs a read over the store, which the app
   would call as a read action. Not in pass 2.
5. **workerd's clock moves only on I/O,** so most spans read 0 ms. Fine against a 150 ms budget, but the waterfall is
   coarse. Nothing to fix on our side.

## What agent-native already has that the brief didn't expect

Read from its source at commit `49a844c1b` (13 November, version 0.228.2); the full notes are
`agent-native-0.228.2.md` beside this file.

- **A state machine** (`packages/core/src/state-machine/index.ts`, `defineMachine`): a typed lifecycle for rows in its
  own SQL. It is for the shell's own records. acme's machines stay Forman's; the app only draws them.
- **Its own observability** of agent runs (tokens, cost, latency, tool calls) in its SQL, and OTLP export. It emits
  OTLP; it doesn't accept it, which fits reading the Collector's files.
- **Local-folder sync for Content** (`contentDatabaseSource*` tables), which is what question 3's option C leans on.
- **Templates are copied, not mounted.** There is no way to mount Content's pages inside another app; borrowing means
  copying source, and `agent-native eject` records what was taken. So "our own template" is a template we keep.
- **Port 8080** for `agent-native dev`, beside `forman dev` on 8787. Node 22.22 or later.

## Not now

Dispatch (agent management), the factory, funnels and conversions, the proof matrix wired to the logbook, deploying
the app anywhere but this machine.

## What pass 2 will prove

1. `forman generate` (or the spike's generator) reads acme's `model.json` and writes the app: 15 actions, a page per
   declaration, the live views. Every generated file opens with its `// Generated from …` line.
2. The app starts with `agent-native dev`, on PGlite, with no Docker of its own, against a running `forman dev`.
3. The operation page for `allowance.spend` shows real calls and a real waterfall within 2 seconds of a call.
4. Running spend as ada from the app is refused `NotAllowed`, and the chat answers "why did spend refuse ada?" from the
   screen, the model and the app's call log, naming the role she lacks.
5. Changing `spend.ts` and regenerating flags the prose pinned to the old hash, and keeps it.
6. Try to break it: a page whose declaration was deleted; a 50 MB traces file; the chat asked about a trace that
   isn't on screen; an action called as nobody.
