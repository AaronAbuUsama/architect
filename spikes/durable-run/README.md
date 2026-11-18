# Spike: One durable agent run per Durable Object

**Question.** Can one Pi Durable run on workerd use Orthograph's clock and timers, survive eviction with an operation in flight, and resume without calling the model again for the completed step?

**Answer.** Yes at the tool boundary. After the model's choice was committed, eviction replayed the SDK call, signup committed once, and each model step ran once. Eviction during the model request itself repeated that request. Pi used the injected clock and timers for scheduling, and the OpenAI provider path still called `Date.now` and `setTimeout`.

## What was tried

- A SQLite Durable Object per run, with one Pi Durable harness and one root conversation. Pi Durable, Pi AI and Chord are pinned at 1.5.0, published on 2 November 2026. The spike lockfile passed the three-day release-age policy. Miniflare 5.20261101.0-beta ran workerd 1.20261101.1.
- The generated signup Worker ran beside it on a separate workerd instance, with its generated migration applied to a fresh local D1 database. The tool called the generated `sheet.join` SDK helper. The helper has no request-key argument, so the spike supplied the `Idempotency-Key` header through Effect's fetch service. Signup's declaration allows anonymous calls.
- A local HTTP server returned scripted OpenAI-compatible SSE replies. It counted model requests by whether their transcript ended in a tool result. It also relayed the SDK call to signup, with the option to hold the reply after signup committed. The Pi AI adapter ran with retries disabled. It required a local auth marker to construct the request, which the fetch adapter stripped before sending. The server asserted that it received no Authorization header.
- The host set a recovery alarm before submission and drove Pi's `onWake` and the SDK's clock from an injected Effect `Clock`. The clock used a one-day offset from the platform clock. Pi's foreground `setTimer` callbacks went through Orthograph's `TimersMemory`, fired by the same alarm. The spike declined background cache-expiry timers, which Pi can service on subsequent commits.

## What was found

1. **Cut after the operation committed, before Pi got the result.** D1 already showed sheet version 1 while the HTTP reply was held. The driver called `DurableObjectState.abort()`, then waited for the replay to reach the relay before sending another request to the object. A new object instance handled the alarm, used the original submission, and finished the transcript. The replay returned the same signup answer with the same request key. D1 still showed one place taken, version 1 and one request receipt.
2. **Cut while the first model request was in flight, before its reply.** The alarm reopened the run and retried the same model step. Signup still committed once. A local HTTP count can distinguish this retry from the expected follow-up model call that sees the tool result.
3. **Request keys need a run namespace.** An early run keyed the call by Pi's conversation ID and the provider's tool-call ID. The next Durable Object reused both IDs, so signup returned the first sheet's receipt and left the second sheet at version 0. The measured run includes the Durable Object ID and Pi tool task ID in the key, alongside the provider call ID. The script deliberately reuses the provider ID in three runs and asserts three distinct request keys.
4. **Injected time worked for scheduling.** The stored user entry carried the shifted timestamp even after recovery. In the baseline the stand-in held the completion stream open until an injected foreground timer fired. It observed one timer callback through `Timers`. The model-cut case took two alarms on the measured run, one to recover and one to retry.
5. **The provider path still used ambient time on successful requests.** The baseline recorded 17 calls to `Date.now` and 2 calls to `setTimeout` inside the agent Worker. The probe attributed the clock reads to Pi AI's UUID, lazy-stream, event-stream and OpenAI timestamp code, and OpenAI's request bookkeeping. It attributed both timeouts to the OpenAI SDK's `fetchWithTimeout`. It saw no calls from Pi Durable's default clock or timer on this path. The probe counted calls after the Worker installed its wrappers, inside the agent Worker only.

## Measurements

The model elected to call the tool once, then gave a final answer after seeing the result. A second row entry under a model step would be a repeat of that step.

| Case | Calls for tool choice | Calls after tool result | SDK requests | Signup commits | Submission finished |
|---|---:|---:|---:|---:|---|
| Baseline | 1 | 1 | 1 | 1 | Yes |
| Evict with tool reply held | 1 | 1 | 2 | 1 | Yes, on a new instance |
| Evict with first model reply held | 2 | 1 | 1 | 1 | Yes, on a new instance |

The minified esbuild ESM bundle executed by workerd was **1,400,710 bytes raw and 419,089 bytes gzip**, with 673 input modules. The metafile attributed 392,936 output bytes to files under `@earendil-works/*`. The full size includes the selected OpenAI adapter and SDK, Effect, the generated signup SDK, and the spike's probes. It excludes the separately running signup Worker and source maps.

The emitted imports were `cloudflare:workers` and one external `require("node:fs")`. The latter is in Pi AI's `utils/provider-env.js`, behind its Bun-only environment fallback. All three cases also passed with `nodejs_compat` disabled for the agent Worker. The signup Worker used its own Node compatibility flag in both runs.

## The decision it supports

- **M4.01.** Keep one SQLite Durable Object per run and Pi Durable 1.5.0 behind the Effect seam. Record the model checkpoint as the limit of the no-repeat guarantee. Keep the injected scheduling seam and decide how the model adapter will handle UUIDs, timestamps and request deadlines if the gate requires zero ambient calls across the provider path.
- **M4.09.** Arm recovery before admitting work and prove it via an alarm before any reconnect. Keep separate assertions for a lost tool reply and a lost model reply. Generate a stable key per run and tool task, and allow replay only for operations whose request-key behavior is proved.
- **M4.16.** Keep a stable mapping from chat thread to run. Reconnect to the same run and submission. Use the committed transcript to restore the tool card, and give approval and refusal their own journey coverage.

## Open risks

- An eviction before a model reply commits can incur a second provider request. Suppressing that repeat would need a durable result or a provider that can resume or deduplicate the request.
- The spike uses an offset platform clock and in-memory foreground timers, plus a persistent alarm. Stepped world time, crash recovery under prolonged load, and concurrent or repeated aborts are unmeasured.
- Signup's anonymous request receipt demonstrates the replay mechanism. Principal propagation, approved and refused actions, other providers, and the full portal bundle still need their milestone checks.

## Reproduce

From the repository root, with Node 24 or newer and pnpm 11.20.0:

```sh
pnpm install --frozen-lockfile
pnpm --dir spikes/durable-run install --frozen-lockfile
pnpm --dir spikes/durable-run spike
pnpm --dir spikes/durable-run spike --no-node-compat
```

Each run prints one bundle measurement and three assertion-checked case records. The two Workers use ephemeral local storage and the HTTP listener uses a free loopback port. The driver closes all three in its cleanup.
