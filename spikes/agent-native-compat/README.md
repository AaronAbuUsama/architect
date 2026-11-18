# Spike: agent-native-compat

**Question.** Is generating actions that use agent-native's `defineAction` field names enough for an agent-native 0.228.2 app to register them and call our Worker?

**Answer.** No, not as K5 writes it (`design/decisions/K5-the-whole-shape.md:350-379`). The field names do match, and every flag, the schema and the registration work when run through agent-native's own code. But the K5 `run` body does not compile (`ctx.sdk` and `ctx.callId` do not exist), `retrySafe: true` is harmful, and three things K5 leaves out are needed: the generated module must export the options object (not call a `defineAction`), refusals must be thrown as agent-native's duck-typed "no write" error, and the request key must come from somewhere K5 does not name. With those, an agent-native app registers the action in a two-line file and the whole thing works on Node.

All "file:line" references to agent-native are to the installed `dist/` of `@agent-native/core@0.228.2` (this install has no `src/`; `dist/*.js` is the compiled form of the `src/` files the research notes cite). Paths are relative to `node_modules/@agent-native/core/dist/`.

## What was tried

A standalone package (pnpm `--ignore-workspace`, own lockfile, `node_modules` ignored; nothing added to `packages/` or the root lockfile). Pinned exactly: `@agent-native/core@0.228.2` (13 Nov 2026), `effect@4.1.1`, `typescript@6.0.2`, `@types/node@24.19.2`, plus dev-only `h3@2.0.8`, `@electric-sql/pglite@0.5.16` (agent-native's own local database), `tsx@4.23.15` (the `agent-native action` CLI spawns it). Every version is older than three days.

- `src/stand-in.ts`: a declaration (string, branded id, optional field, literal union, number, bigint-from-string), two `Schema.TaggedError` refusals shaped like signup's (`code`, `httpApiStatus`), and a stand-in SDK whose `.confirmed` does a **real `fetch` POST** to a local node HTTP server that plays the Worker (it counts calls, records the `x-request-key` header, replays a repeated key, and can be told to refuse with 422 or die with 500). The real signup SDK was not used: it imports `workspace:*` packages, which cannot be installed without touching the workspace.
- `src/k5-shape.ts`: K5's example, passed to agent-native's own `defineAction`.
- `src/generated/`: a hand-written module in the shape a generator would emit (`proposal-vote.ts`), and the part of our `orthograph/actions` it needs (`refusal.ts`). Neither imports agent-native.
- `app/actions/`: what the agent-native app writes (`_host.ts`, and the one-line `proposal-vote.ts`).
- `checks/`: scripts that run agent-native's real code: its real HTTP route (`mountActionRoutes` on a bare h3 app, default plugins switched off by its own `AGENT_NATIVE_DISABLED_PLUGINS`, PGlite behind it), its real in-app agent loop through the exported `executeAgentToolCall` (`agent/production-agent.js:3838`, which drives `runAgentLoop` with a one-tool-call stub engine, so no model), `autoDiscoverActions`, `loadActionsFromStaticRegistry`, and the `agent-native action` CLI.

Reproduce: `pnpm install --ignore-workspace --ignore-scripts`, then `pnpm typecheck`, `pnpm typecheck:k5` (fails on purpose), `pnpm check:02` and so on (Node 26).

## What was found

1. **Type fit: K5's shape does not compile; a corrected shape does. Validated.**
   Against agent-native's own `defineAction`, with `strict` and `exactOptionalPropertyTypes`, every field of K5's example is accepted (`description`, `schema`, `outputSchema`, `errors`, `readOnly`, `retrySafe`, `needsApproval`, `agentTool`, `mcpTool`). Only the `run` body fails ([evidence/01-k5-shape-tsc.txt](evidence/01-k5-shape-tsc.txt)):
   ```
   src/k5-shape.ts(19,23): error TS18048: 'ctx' is possibly 'undefined'.
   src/k5-shape.ts(19,27): error TS2339: Property 'sdk' does not exist on type 'ActionRunContext'.
   src/k5-shape.ts(19,56): error TS18048: 'ctx' is possibly 'undefined'.
   src/k5-shape.ts(19,60): error TS2339: Property 'callId' does not exist on type 'ActionRunContext'.
   ```
   (`ctx` is also optional: `run(args, ctx?)`, `action.d.ts`.) The corrected shape compiles clean ([evidence/01-corrected-tsc.txt](evidence/01-corrected-tsc.txt)): the generated module exports `options(host)` (the object, with `run` closed over the SDK and a `host` that derives the key), and the app writes `export default defineAction(options(host))` ([app/actions/proposal-vote.ts](app/actions/proposal-vote.ts)). The generated `run` takes a structural `CallContext` (`caller`, `toolCallId?`, `userEmail?`, `signal?`, `requestHeaders?`), which the real `ActionRunContext` is assignable to.
   **`errors` without importing agent-native: yes.** The type is `{ codes; fail(); noWrite() }` (`action.d.ts:139`), but at runtime only `.codes` is ever read (`action.js:897`, copied to `entry.errorCodes`), and nothing in `dist/` reads `errorCodes` after that (grep: only `action.js`). The static registry even drops it ([evidence/07b-errorcodes.txt](evidence/07b-errorcodes.txt)). So `errors` is a declaration only; the behaviour is in what is thrown (finding 3).

2. **Schema: works with both Effect adapters; two traps. Validated.**
   `toStandardJSONSchemaV1(toStandardSchemaV1(payload))` gives a correct, non-empty `tool.parameters` for string, branded id (`type: string`), literal union (`enum`), `required` correct, and the bigint-from-string as `{type: string, pattern: "^-?\\d+$"}`. The in-app agent's engine tool carries the same properties. `run` receives the **decoded** value (`stake` arrives as `7n`). Invalid input is refused before `run` with a readable message ([evidence/02-schema.txt](evidence/02-schema.txt)).
   - **Trap 1, validate-only schema.** With only `~standard.validate`, the action is advertised as `{"type":"object","properties":{}}`, and the in-app agent is still given the tool with `properties = []` (`action.js:1240` `anyObject`, `:1244-1247`). Nothing warns. The generator must assert `Object.keys(tool.parameters.properties).length > 0`.
   - **Trap 2, `Schema.optional(String)`** is advertised as `anyOf[string, null]` while agent-native's validator rejects `null` (`Expected string`). `optionalKey(String)` advertises and validates `string`; `optional(NullOr(String))` accepts null ([evidence/02b-optional.txt](evidence/02b-optional.txt)). A model that sends `null` for an optional field gets refused for what the schema invited. The generator should emit `optionalKey` or a nullable pair.
   - Smaller: `Number` is advertised as `number | "Infinity" | "-Infinity" | "NaN"`, and `additionalProperties: true`.

3. **Errors through the doors: validated; the duck typing is the way in.** ([evidence/03-errors.md](evidence/03-errors.md), raw: [03-errors.raw.jsonl](evidence/03-errors.raw.jsonl)). Each case is a write that first made a real outbound POST to the Worker, then failed. Rows `rs0` / `rs1` are `retrySafe: false / true`.

   | `run` throws | HTTP route | in-app agent loop (`retrySafe:false`) |
   |---|---|---|
   | (a) plain `Error` | 500, `{"error":"Internal server error"}` (message hidden) | OUTCOME UNKNOWN, run stops; the model is shown the raw message, a postgres URL included |
   | (b) rejected `Effect.runPromise` (`FiberFailure`) | 500, same | OUTCOME UNKNOWN; message shown |
   | (c) duck `Error` with `statusCode:422, errorCode, details` | 422, `{error, errorCode}`, **no `details`** | OUTCOME UNKNOWN |
   | (d1) `fail(...)` | 422 with `error, errorCode, details` | OUTCOME UNKNOWN |
   | (d2) `defineActionErrors(...).noWrite(...)` | 422 with `error, errorCode, details` | no write ("rejected", model may retry) |
   | **generated `ActionRefusal`** (duck-typed, no agent-native import) | 422 `{error:"Sold out: 0 places left", errorCode:"PR-001", details:{remaining:0}}` | **no write** |
   | generated, Worker answered 500 (a defect) | 500 hidden | OUTCOME UNKNOWN |

   - **Instanceof or duck-typed?** Duck-typed. `isActionContractError` is `instanceof ActionContractError || (error.actionContractError === true && typeof error.errorCode === "string")` (`action.js:82-89`); `isNoWriteError` adds `error.noWrite === true` (`action.js:128-131`). The route's own branches read `err.statusCode`, `err.errorCode`, `err.details` by property (`server/action-routes.js:1267-1366`); `markedExpected` is `expected === true` plus a string `errorCode` (`:~255`). The "no write" label is only honoured when the error was raised by this handler with no nested write (`action.js:704-708` adds it to `verifiedNoWrites`); a duck-typed one passes that gate, as the generated row shows.
   - **The classification that matters.** For a failed write, `invocationEffect` returns `typed ?? (wrote && !retrySafe ? "unknown" : "none")` (`action.js:255-299`, the last line is `:297`). With `retrySafe:false`, any untyped failure after an observed outbound POST (agent-native patches `fetch` inside its execution frame) is "unknown" and the loop ends the run as `write_tool_outcome_unknown` (`agent/production-agent.js:8263-8270`). A typed no-write is "none". With `retrySafe:true` everything is "none", **including the Worker-500 case, which may have committed**. K5's `retrySafe: true` therefore tells the model "safe to retry" when it is not (finding 5).
   - A plain error *before* any write was observed is "none" either way (row `h-plain-before-any-write`), so the classifier does not need our help there.
   - Frontend/UI calls get the same HTTP mapping as plain HTTP callers.
   - MCP was **not run**: `mcp/execute-action-call.js` `failedOutcome` (`:502-`) needs a signed context; read only. The notes say it redacts the message and shows the `errorCode`.

4. **Caller identity: only an email reaches `run`. Validated; the Worker side is missing.** ([evidence/04-06-identity-retry-approval.txt](evidence/04-06-identity-retry-approval.txt)).
   - HTTP: `userEmail, orgId, appId, caller:"http", requestHeaders (all of the request's headers), signal, actionName` (`server/action-routes.js:1132-1190`).
   - Frontend (`x-agent-native-frontend: 1`): same, `caller:"frontend"`, plus whatever headers the page sent.
   - In-app agent tool (real loop): `userEmail, orgId, appId, caller:"tool", threadId, runId, turnId, toolCallId, signal, actionName, send, settle, maxResultChars`, and `approvedToolCallKey` once approved (`agent/production-agent.js:7810-7850`, `:5003-5011`). **No `requestHeaders`.** `appRoles` / `appPermissions` come from `resolveTurnAppAuthorization` (`:7789`), which answers the notes' "who fills `appRoles`": the loop, only for an app that declares app roles. Not exercised.
   - CLI: `caller:"cli"`, `userEmail` = the dev user (`scripts/runner`, read not run; the CLI door itself ran, see 7).
   - There is no person id, only an email, and no agent-acts-for-person claim. What our Worker would need: a credential the app holds (a key or a signed assertion) naming the acting person and, for the tool and CLI doors, the fact that an agent is acting; the Worker's `agent` principal "acting for a person" (M2.01 decision, M2.03 runtime in `design/milestones.md`) and the auth plugin's api-key (M2.05). **Until M2 the generated action can only call operations allowed to `anyone`, or call as one fixed identity the app holds a key for; it cannot tell the Worker who the person is.** `ctx.requestHeaders` carries the browser's own `Authorization`/cookie for agent-native, not ours; it must never be forwarded.

5. **Retry identity: `toolCallId` for the agent door only, and it is not enough. Validated.**
   - Agent tool: `ctx.toolCallId` is the loop's call id. The same id is reused when the loop replays the same step, so the Worker dedupes it. A model that re-issues the call gets a **new** id. Measured with the generated action, key `tool:<toolCallId>`: calls with ids A, A, B reached the Worker with keys `tool:toolu_A, tool:toolu_A, tool:toolu_B` and **2 votes were committed**, not 1.
   - Frontend: no key by default. The client sends `X-Request-Source` (the tab id, not per call) and the *response* carries `x-agent-native-request-id` (`client/use-action.js:623`), which `run` never sees. A per-call key can be supplied: `useActionMutation({ headers: (vars) => ({"Idempotency-Key": ...}) })` (`client/use-action.d.ts:192`, applied at `client/use-action.js:420`); measured: it arrives in `ctx.requestHeaders["idempotency-key"]`. HTTP callers: the same header, or nothing. CLI: nothing.
   - So K5's `requestKey: ctx.callId` has no field to read, and the nearest one (`toolCallId`) protects only loop replay. `retrySafe`'s own doc says not to set it on an action that appends, sends or charges "except for inputs carrying an idempotency key the action answers with its first result" (`action.d.ts:~540`); `retrySafe` may be a predicate on the input.

6. **Approvals: agent-native gates before `run`, on every door; the person is asked once only if our `run` never asks. Validated.**
   - With `needsApproval:true`, `run` was invoked **0 times** by an HTTP call, a frontend call and a tool call ([evidence/04-06-...txt](evidence/04-06-identity-retry-approval.txt)). Tool call: the loop returns `approval_required` ("This action did NOT execute"). After approval it runs once, and `ctx.approvedToolCallKey` is set (`:7843`).
   - **Plain HTTP can never approve:** 409 `approval_required` (`server/action-approval.js:8-25`). A frontend call without a proven UI session gets 403 `ui_capability_required`; only a same-origin browser cookie session with the minted UI capability bypasses the gate (`server/action-routes.js:162-173`, gate at `:1225-1241`; the proven path needs cookies and a DB session, so it was read, not run). The CLI says "requires human approval ... rerun with `--approved`" ([evidence/07c-cli.txt](evidence/07c-cli.txt)).
   - **If our own runtime also waited for a yes, the person would be asked twice** (once by agent-native's card, once by ours). That cannot happen as long as the wait lives in our `defineAction` wrapper (M1.23) and not in the generated `run`, because the wrapper is not used when agent-native wraps the options. Where the approval lives: agent-native hosts it (its card, "always allow", MCP elicitation, CLI flag); our options only declare `needsApproval`. If an agent-native app calls our `run` and needs to know it was approved, `ctx.approvedToolCallKey` says so.

7. **Registration: module in `actions/` gets five doors; static registry gets four; our raw options get none. Validated.** ([evidence/07-registration.txt](evidence/07-registration.txt)).
   - `autoDiscoverActions()` (cwd `app/`) found `proposal-vote` with `needsApproval, agentTool, mcpTool:false, retrySafe, readOnly` intact (`_host.ts` was skipped, underscore). `loadActionsFromStaticRegistry({ "proposal-vote": module })` gives the same entry (`server/action-discovery.js:201-232`); `registerPackageActions` (`:62`) was read, not run.
   - **Passing our raw `options(host)` object (not wrapped in agent-native's `defineAction`) registers nothing** (`registered keys: []`): the registry needs `tool` and `run` that only `defineAction` builds. So the wrap line in the app is not optional.
   - Doors for the `actions/` file: HTTP (`POST /_agent-native/actions/proposal-vote`, mounted, ran); in-app agent tool (`actionsToEngineTools` listed it); CLI (`agent-native action proposal-vote ... --approved` loaded the file, validated, reached our `run`); typed hooks: generated from files in `actions/` by agent-native's Vite plugin (**not run**; the hook parameter type comes from `run`'s first parameter, which is the decoded type, so a bigint field would be typed `bigint` while JSON cannot carry one: a real risk to test before relying on it). A static registry loses hooks and the CLI (notes 1.11, consistent with the CLI reading `actions/<name>.ts` by path).
   - MCP: `mcpTool:false` makes `isActionExposedToExternalAgents` false (run); with it unset it is true. MCP `tools/list` was not mounted (needs OAuth), read only.

8. **Runtime: Effect inside `run` works on Node under agent-native's execution frame. Validated on Node; Worker not tested.** The route and the real loop both ran the Effect program (`Effect.runPromiseExit` with `{signal}`) and the SDK `fetch` inside it ([evidence/08-runtime.txt](evidence/08-runtime.txt)). The `AsyncLocalStorage` frame survived the Effect fiber: agent-native saw the POST made inside the fiber (the same action with the Worker answering 500 was classified "outcome unknown"; the same failure with no POST was "no write"). A pre-aborted `ctx.signal` interrupts the program and surfaces as `Error: All fibers interrupted without error`, which should be mapped to something readable. Not tested: workerd (agent-native on Workers needs `nodejs_compat` + `nodejs_als` and an external Postgres, per the notes and `deploy/build.ts`; our actions are the Node/agent-native side calling our Worker over HTTP, so the Worker side is unchanged).

## Measurements

- Median wall time per call, 150 runs, local loopback: bare `options.run` (Effect + fetch) 0.37 ms; the same through `defineAction`'s `entry.run` (validation, audit, execution frame) 0.40 ms. Agent-native's wrapper cost is below measurement noise next to the HTTP hop.
- 18 error cases, each through the HTTP route and the real agent loop, in one run ([evidence/03-errors.md](evidence/03-errors.md)).
- Request-key replay: 3 tool calls, 2 distinct ids, 2 committed votes.

## The decision it supports

**What a generated action module must look like for an agent-native app** (corrected sketch, as run in `src/generated/proposal-vote.ts` and `app/actions/`):

```ts
// generated/actions/proposal/vote.ts. Generated from blueprint/things/proposal/verbs/vote.ts. Do not edit.
// Imports Effect, the SDK and `orthograph/actions`. Never imports agent-native.
export const options = (host: Host) => ({
  description, schema: standard(payloadSchema), outputSchema: standard(answerSchema),
  errors: errorsOf(["PR-001", "AR-001"]),          // { codes, fail, noWrite }: declaration only, nothing reads it
  readOnly: false,
  needsApproval: true,                             // agent-native gates; our run never waits
  agentTool: true, mcpTool: false,
  // retrySafe: emitted only as a predicate, only for an operation whose payload carries its own key (finding 5)
  run: (args, ctx?: CallContext) => runForAction(     // refusal -> ActionRefusal, defect -> plain Error (redacted)
    vote(args, { requestKey: host.requestKey(ctx) }).pipe(Effect.flatMap((s) => s.confirmed)), ctx, refusalTags),
});
// app/actions/proposal-vote.ts, written by the agent-native app (one line, and `_host.ts` beside it)
export default defineAction(options(host));
```

`ActionRefusal` (in `orthograph/actions`) is an `Error` with `actionContractError = true`, `noWrite = true`, `errorCode`, `statusCode` (from the refusal's `httpApiStatus`) and `details`. That is all agent-native needs, and the class carries no agent-native import.

**What `defineAction` in our own `orthograph/actions` module (M1.23) should keep:** the field names and the flags exactly as K5 lists them; `needsApproval` as an approval that waits **in the wrapper**, never in `run`; the type `run(args, ctx?)` with a structural context (`caller, userEmail, orgId, signal, toolCallId, requestHeaders`) and no `sdk` or `callId` (the SDK is a closure from the host). Drop `retrySafe: true` from the generator's output.

**What changes in K5 and the slices:**
- K5 lines 350-379: replace the example and the sentence "`ctx` carries the SDK client and the call's id"; "an agent-native app registers them" becomes "wraps each with its own `defineAction`" (finding 7).
- **M1.22**: the type test must also check the context members the generated `run` reads against agent-native's `ActionRunContext` (the K5 shape's field list passes while `ctx.sdk` does not exist), and that each generated action's `tool.parameters` is non-empty (trap 1) and optional fields advertise what they accept (trap 2). The check can compile against a recorded copy of `ActionRunContext` without installing agent-native.
- **M1.23**: the "waits for a yes" check stays on the wrapper; add that the generated `options.run` never waits. Refusals thrown as the duck-typed no-write error; defects thrown as a plain Error whose message is redacted (the loop shows the model the raw message of an untyped error, finding 3).
- **M2.01 / M2.03 / M2.05 / M2.08**: an agent-native host needs a way to tell the Worker who is calling: a host-held credential plus the acting person's email, mapped to an `agent` principal acting for that person. M2.08's `--through actions` journeys can run the generated action against the Worker with the stand-in host here.
- **Request key**: derive from content (operation + canonical payload) for operations where two identical calls mean one intent, or accept a caller-supplied `Idempotency-Key` header; leave `retrySafe` unset for the rest and let "outcome unknown" stop the run, which is the right answer for a Worker 500.

## Open risks

- The Vite plugin's typed hooks and `useActionMutation` against a real browser session (the proven-UI path, the capability retry at `client/use-action.js:~575`) were not run. The decoded-vs-wire type mismatch for bigint-like fields is read, not measured.
- MCP `tools/list`, `tools/call` and their approval elicitation were not run (they need OAuth).
- Workerd: not run; agent-native itself needs Postgres, so "one server" is out of reach, and this spike assumed the action host is a Node/agent-native app calling our Worker over HTTP.
- The SDK was a stand-in over a node HTTP server, not the generated signup SDK; the header name `x-request-key` is the stand-in's, not the real SDK's.
- `requestHeaders` are the caller's headers; a generated action must never forward them. A key read from them is caller-controlled.
- Interruption surfaces as an opaque error; and `outputSchema` was passed but not exercised against a transforming answer schema (the notes' 1.5; the stand-in answer has no transform).
- agent-native's HTTP route hides messages of untyped errors but the tool path shows them; any secret in a defect message reaches the model. The generator must redact.
- Version drift: 0.229.0 is already out; the checks are cheap to re-run (`pnpm check:03`).
