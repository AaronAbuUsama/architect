# Spike: generated-app

**Question.** Can `forman generate` write one working agent-native app from acme's `model.json`? It would hold one
action per operation, a page per declaration with its live calls on it, and a chat that answers "why did spend refuse
ada?" from the screen and the trace.

**Answer.** Yes, with two conditions. The chat needs a model key: there is none on this machine, so its turn was run
through a stand-in with the same screen and the same tools. And `NotAllowed` can be put down to a person only for calls
the app makes itself. The generator writes 15 actions and 44 pages in 0.1 s. The app runs on PGlite against a running
`forman dev`, and every check below passes.

The design this tests is `design/DESIGN.md`; Aaron's four answers are `design/decisions/F6-the-app.md`.

## How to run it

```bash
cd examples/acme && node ../../packages/cli/src/main.ts telemetry view   # needed, see found 2
cd examples/acme && node ../../packages/cli/src/main.ts dev --port 8795
node spikes/generated-app/generator/main.ts examples/acme spikes/generated-app/app
cd spikes/generated-app/app && pnpm install && PORT=8096 pnpm dev        # .env: AUTH_DISABLED=true
node spikes/generated-app/tools/traffic.ts http://127.0.0.1:8795 120      # real traffic, copied from #39
spikes/generated-app/tools/ask.sh "why did spend refuse ada?"             # the chat stand-in
```

Stop it all afterwards: both dev servers, then `forman telemetry stop`.

## What was tried

- **`generator/`.** It reads `model.json` and writes three things into the app:
  - `actions/<thing>-<verb>.ts`, one per operation;
  - `server/forman/generated/pages.ts`, the page tree as blocks by reference;
  - `server/forman/generated/entries/<hash>.json`, every declaration it has seen.
- **`app/`.** The agent-native `0.228.2` chat template, every version pinned. The hand-written parts are:
  - `server/forman/` (the model, the Collector's files, cast calls, the call log, prose);
  - eight shell actions;
  - one React route for every page;
  - the page tree in the sidebar.
- **`prose/`.** Prose about a declaration, at the same paths as `blueprint/`. The product writes it beside the
  declaration (F6 #3). The spike may not add files under `examples/acme`, so it uses this folder instead.
- **`tools/`.**
  - `traffic.ts`: real acme traffic.
  - `check-ada.mjs`: check 4 in a real browser.
  - `big-file.ts`: the 50 MB break case.
  - `ask.sh`: the chat stand-in.
  - `shoot-app.mjs`: the screenshots in `shots/`.

## What was found

1. **The generated action is plain.** Spend's comes out as below; the full file is in `shots/ada-page.png`:
   ```ts
   // Generated from blueprint/things/allowance/verbs/spend.ts. Do not edit.
   export const errors = defineActionErrors("AllowanceExceeded", "AllowanceNotActive", "NotAllowed");
   const answer = z.object({ remaining: z.string().regex(/^\d+$/).describe("Amount") });
   export default defineAction({ …, outputSchema: answer, errors, readOnly: false, retrySafe: true, needsApproval: false,
     run: (args, ctx) => acme.call<z.output<typeof answer>>({ operation: "allowance.spend", route: "allowance/spend", requestKey: true, … }, args, ctx, errors) });
   ```
   - The error codes are the operation's `refusals`, so `NotAllowed` and the machine's refusal are typed failures too.
   - A secret answer field (api-key's `key`, sign-in's `token`) comes back as `•••`, and the call log never holds it.
   - Running the generator twice changes nothing. All 15 actions typecheck under the template's strict settings.
2. **The app runs no Docker of its own. But `forman dev` writes no telemetry unless the viewer is already running.**
   - `packages/prove/src/modules/prove/service.ts:50` starts the Collector only when `Viewer.running()`.
   - So a plain `forman dev` gives the app nothing to read. The workaround is `forman telemetry view` first, as #39 did.
   - That starts Grafana in Docker, only to get the files. Starting the Collector without the viewer is a `forman dev`
     fix.
3. **Spend's page shows real calls and a real waterfall.**
   - The page calls `read-page` every 2 s.
   - A call made from the page shows in Recent calls 150 to 174 ms later: the action's own refetch beats the poll.
   - See `shots/spend.png`, `shots/live.png`, `shots/machine.png` and `shots/environments.png`.
4. **Spend as ada is refused `NotAllowed`, and the app knows it was ada; the trace doesn't.**
   - The app picks the trace id and sends it as `traceparent`, and the Worker keeps it
     (`packages/host-cloudflare/src/modules/telemetry/service.ts:32`). The app's call log and the Collector's trace then
     share one id.
   - The trace holds only `POST` and `sqlite`, with no person on it. The call log says ada, via the frontend.
   - The chat's answer (in full in `chat-answers.md`) names the trace and `allowance.grantee`. It says the refusal came
     before the operation's span opened, and that the app called as ada.
   - This needed no `@agent-native/otel` spans: an id the app picks itself is enough to join the two.
5. **agent-native turned acme's 403 into "You don't have permission to do that".**
   - Its UI reads a 403 from an action as the app's user lacking permission, and toasts that, which is wrong.
   - The fix is at the shell's edge: a refusal from acme leaves the action as 422, and acme's status stays in
     `details.acmeStatus`.
   - The toast now carries the true message (`shots/ada-page.png`, bottom left).
6. **Stale prose works, and needs a history the model doesn't keep.**
   - The test: `spend.ts` gained `AllowanceNotFound` and its budget went from 150 to 100 ms, then everything was
     regenerated.
   - The prose turned amber and said exactly what changed (`shots/stale.png`): `errors` gained AllowanceNotFound,
     `refusals` gained AllowanceNotFound, `budget` went from 150 to 100.
   - "Still true" re-pinned it. The prose was kept throughout, and acme was put back afterwards.
   - `model.json` holds only today's hash, so the generator keeps each entry by its hash. The diff is a key-by-key
     compare in the app. The compiler's `Compare` would do it better, but the compiler never runs in production.
7. **Break cases.** All five hold.

   | Case | What happened |
   |---|---|
   | A deleted declaration (`allowance/verbs/get.ts` moved away, then regenerated) | The generator removed `allowance-get.ts` and nothing else. The page left the tree, and its prose stayed under "orphaned prose", flagged and kept. |
   | A 50 MB traces file (13,482 real lines, ids changed) | The first read took 272 ms. A poll with nothing new takes 2 ms; 1,000 new lines take 23 ms. Heap 54 MB. |
   | The chat asked about a trace not on screen | It read it with `trace` and answered correctly. A trace id that doesn't exist got "no trace … in the 343 read". |
   | The chat misread who made a call | Before the fix, it said "the app called as" for a call a script had made. `trace` now says `madeBy` ("not this app: no entry in its call log") and names the cast member behind `principal.person`. Rerun: correct. |
   | An action called as nobody | Refused `NoCaller` (400): "choose ada, olga or bob in the top bar". Nothing reaches acme. |
8. **What agent-native needed that the docs didn't say.**
   - `useActionQuery` sends GET by default, while actions are POST-only, which gives a 405. Every query passes
     `method: "POST"`.
   - `/mcp` asks for OAuth even with `AUTH_DISABLED=true`. `agent-native connect` would write into a client's global
     config, so it wasn't used.
   - `pnpm action` needs `AGENT_USER_EMAIL`, and it prints objects cut off two levels deep (`[Object]`). Through MCP or
     the chat, results are full JSON.
   - `retrySafe` needs a request key. agent-native has none, so the action sends `app-<toolCallId>`. A retry from the
     UI gets a fresh key, so the UI's retry isn't safe yet.
9. **Telemetry gaps, confirmed live.**
   - `allowance.revoke`'s span has no `move.name`, so moves are counted from events; the machine page says so.
   - `NotAllowed` names nobody (found 4).
   - Journeys aren't in the model, so the `<Scenario>` block wasn't built.

## Measurements

| What | Value |
|---|---|
| Generate: 15 actions, 44 pages, 24 entries | 0.08 to 0.10 s (3 runs) |
| From a call on the page to it showing in Recent calls | 150 to 174 ms (3 runs) |
| `read-page` refetch | every 2 s |
| Trace reader, 50 MB: first read / nothing new / 1,000 new lines | 272 ms / 2 ms / 23 ms |
| Heap after reading 50 MB | 54 MB |
| Spend over a 30-minute window (real traffic) | 291 calls, p95 4 ms against a 150 ms budget |

## The decision it supports

**F6 holds as decided. Building it means these steps:**

1. **`packages/generators` gets an app target.**
   - It writes `generated/app/actions/*.ts`, the page tree and the declaration history from the model. The code is
     what `generator/` does today.
   - The template (the `app/` here, minus the generated parts) becomes a template we keep, under our own name.
2. **`forman dev` starts its Collector whether or not the viewer runs** (found 2). That is a small change in `prove`.
3. **The app's call log is the answer to "who".**
   - The app picks the trace id and logs who it called as.
   - Calls the app didn't make still name nobody on `NotAllowed`, until M1.20/M2.01 put a principal on that path.
4. **A refusal leaves the shell as 422** (found 5). Make it a rule of the template.
5. **Prose staleness needs a history of declarations.**
   - The generator keeps one, or `forman generate` writes one beside `model.json`.
   - The app diffs against it. The compiler's `Compare` should move somewhere the app may import.

## Open risks

- **No model key on this machine.** The chat's turn was run through `tools/ask.sh` (Claude Code with the app's screen
  and actions), not agent-native's own chat. Setting a key in the gitignored `.env` runs the real thing.
- **The trace reader keeps every trace in memory.** A day of `forman dev` could hold hundreds of MB. It needs a
  window-sized eviction.
- **The cost of each poll grows with the window.** Each poll recomputes every call in the window: fine at 30 minutes,
  not measured at 24 hours.
- **agent-native moves fast.** 0.228.2 is five days old and releases come daily. The template is copied, not mounted,
  so upgrades are manual.
- **The shell's code isn't written to Forman's rules.** It uses `async`, `Date.now` and throws through `fail`, as
  agent-native's own code does. Whether the template follows `AGENTS.md`'s Effect rules is a decision for step 1.
- **The UI's retry isn't safe yet.** A request key comes from the chat's `toolCallId`, so a retry from the UI is not
  recognised as the same request (found 8).
- **Prose was mirrored here, not written beside the declaration.** No pull request carried prose with its declaration,
  so F6 #3 is untested in the repo itself.

```text
TO THE CONDUCTOR
Answer: yes. forman generate can write the agent-native app from model.json: 15 actions, 44 pages, live calls,
  stale prose and a chat that answers "why did spend refuse ada?" from the screen, the model and the app's call log.
Decision: F6 holds. Building it is: an app target in packages/generators, a template we keep, the app picks trace ids
  and logs who it called as, refusals leave the shell as 422, and a history of declarations for stale prose.
Steps changed:
  - forman dev must start its Collector without the viewer (prove/service.ts:50).
  - the trace reader needs eviction.
  - Compare should be importable by the app.
  - the chat needs a model key (Aaron).
```
