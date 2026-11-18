import { defineAction } from "@agent-native/core/action";
import { options } from "../src/generated/proposal-vote.ts";
import { host } from "../app/actions/_host.ts";
import { agentToolCall, mount } from "./lib.ts";
import { startWorker, worker } from "../src/stand-in.ts";

const w = await startWorker();
const entry: any = defineAction({ ...options(host), needsApproval: false });
const args = { proposal: "p1", choice: "yes", weight: 1, stake: "1" };
const http = mount({ vote: entry });

// 1. Effect inside run, through the real HTTP route and the real agent loop (AsyncLocalStorage execution frame active)
worker.mode = "ok";
console.log("HTTP :", JSON.stringify(await http("vote", args)));
console.log("tool :", JSON.stringify(await agentToolCall("vote", { vote: entry }, args)));

// 2. Is the execution frame (AsyncLocalStorage) alive through Effect.runPromiseExit + fetch? Its only visible effect is the
//    write classification: an observed outbound POST makes a plain failure "outcome unknown"; no POST makes it "no write".
//    (03-errors: a-plain-error-rs0 unknown vs h-plain-before-any-write-rs0 none.) Here: the generated action, worker down.
worker.mode = "defect";
const t = await agentToolCall("vote", { vote: defineAction({ ...options(host), needsApproval: false, retrySafe: false }) }, args);
console.log("generated action, worker 500, retrySafe:false ->", t.outcomeUnknown ? "OUTCOME UNKNOWN (frame saw the fetch POST made inside the Effect fiber)" : "no write (frame did NOT see it)");

// 3. ctx.signal -> Effect interruption
const ac = new AbortController();
worker.mode = "ok";
ac.abort();
const aborted = await entry.run(args, { caller: "http", signal: ac.signal }).then((v: unknown) => `resolved ${JSON.stringify(v)}`, (e: any) => `rejected: ${e?.name}: ${String(e?.message).slice(0, 80)}`);
console.log("pre-aborted signal ->", aborted);

// 4. cost: median wall time per call through defineAction's wrappers vs the bare options.run (no audit DB: direct entry.run)
const time = async (f: () => Promise<unknown>, n = 150) => { const xs: number[] = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); await f(); xs.push(performance.now() - t0); } xs.sort((a, b) => a - b); return +(xs[n >> 1]!).toFixed(2); };
worker.mode = "ok";
const bare = options(host).run;
console.log("median ms/call, bare options.run (Effect + fetch):", await time(() => bare({ ...args, stake: 1n } as any, { caller: "http" })));
console.log("median ms/call, defineAction entry.run (validate+audit+ALS frame):", await time(() => entry.run(args, { caller: "http", userEmail: "alice@example.com" })));
await w.stop();
process.exit(0);
