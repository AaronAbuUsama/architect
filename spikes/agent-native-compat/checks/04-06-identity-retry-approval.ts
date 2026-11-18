import { defineAction, isActionExposedToExternalAgents } from "@agent-native/core/action";
import { actionsToEngineTools } from "@agent-native/core/server";
import { agentToolCall, mount } from "./lib.ts";
import { options } from "../src/generated/proposal-vote.ts";
import { host } from "../app/actions/_host.ts";
import { startWorker, worker } from "../src/stand-in.ts";

const w = await startWorker();
const seen: Record<string, any>[] = [];
const snap = (label: string, ctx: any) => seen.push({ via: label, ctx: Object.fromEntries(Object.entries(ctx ?? {}).map(([k, v]) => [k, k === "requestHeaders" ? Object.fromEntries((v as Headers).entries()) : typeof v === "function" ? "[fn]" : v instanceof AbortSignal ? "[AbortSignal]" : v])) });
let runs = 0;
const who = defineAction({ description: "who", readOnly: false, run: (_a: any, ctx: any) => { snap(ctx?.__label ?? "?", ctx); return "ok"; } });
const gatedGenerated = defineAction(options(host)); // needsApproval: true exactly as the generated options say
const counting = defineAction({ ...options(host), run: async (a: any, c: any) => { runs++; return options(host).run(a, c); } });
const actions: any = { who, "vote-gated": gatedGenerated, "vote-gated-counting": counting };
const http = mount(actions);
const voteArgs = { proposal: "p1", choice: "yes", weight: 1, stake: "1" };

console.log("## 4/5 ctx that reaches run");
// run reads ctx but cannot know the door: label by the headers we send
await http("who", {}).then(() => {}); seen[seen.length - 1]!.via = "HTTP (no frontend header)";
await http("who", {}, { "x-agent-native-frontend": "1", "x-agent-native-browser-tab": "tab-1", "x-request-source": "tab-1", "idempotency-key": "k-123" }); seen[seen.length - 1]!.via = "frontend header (useActionMutation shape, unproven UI)";
await agentToolCall("who", { who }, {}); seen[seen.length - 1]!.via = "agent tool (real loop, executeAgentToolCall)";
await who.run({}, { caller: "cli", userEmail: "dev@local.test" } as any); seen[seen.length - 1]!.via = "CLI runner (ctx per scripts/runner, read not run)";
for (const s of seen) console.log(JSON.stringify(s));

console.log("## 5 retry identity: two tool calls with the same args, as a model retry makes them");
worker.calls.length = 0; worker.committed.clear(); worker.mode = "ok";
const gen = defineAction({ ...options(host), needsApproval: false });
await agentToolCall("vote", { vote: gen }, voteArgs, { callId: "toolu_A" });
await agentToolCall("vote", { vote: gen }, voteArgs, { callId: "toolu_A" }); // loop step replay: same id
await agentToolCall("vote", { vote: gen }, voteArgs, { callId: "toolu_B" }); // model re-issues the call: new id
console.log("worker saw keys:", JSON.stringify(worker.calls.map((c) => c.requestKey)), "committed votes:", worker.committed.size);
const viaHttp = await http("vote-gated", voteArgs, { "idempotency-key": "k-1" });
console.log("HTTP vote with needsApproval:true ->", JSON.stringify(viaHttp));

console.log("## 6 approvals");
console.log("HTTP plain      :", JSON.stringify(await http("vote-gated-counting", voteArgs)));
console.log("frontend header :", JSON.stringify(await http("vote-gated-counting", voteArgs, { "x-agent-native-frontend": "1" })));
console.log("agent tool      :", JSON.stringify(await agentToolCall("vote", { vote: counting }, voteArgs)));
console.log("run() invocations after those three:", runs);
const first: any = await agentToolCall("vote", { vote: counting }, voteArgs);
const ctxSeen: any[] = [];
const withCtx = defineAction({ ...options(host), run: async (a: any, c: any) => { ctxSeen.push({ approvedToolCallKey: c?.approvedToolCallKey, toolCallId: c?.toolCallId }); return options(host).run(a, c); } });
const second: any = await agentToolCall("vote", { vote: withCtx }, voteArgs, { approvedToolCalls: [first.approvalKey], consumeApproval: async () => true });
console.log("after the person approves (approvedToolCalls=[key]):", JSON.stringify({ status: second.status, output: second.output, ctxSeenByRun: ctxSeen }));
console.log("exposure: mcpTool:false ->", isActionExposedToExternalAgents({ agentTool: true, mcpTool: false }), "; agent tool list:", JSON.stringify(actionsToEngineTools({ vote: gatedGenerated } as any).map((t: any) => t.name)));
await w.stop();
process.exit(0);
