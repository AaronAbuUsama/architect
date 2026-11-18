import { isActionExposedToExternalAgents } from "@agent-native/core/action";
import { actionsToEngineTools, autoDiscoverActions, loadActionsFromStaticRegistry, mergeCoreSharingActions } from "@agent-native/core/server";
import { options } from "../src/generated/proposal-vote.ts";
import { host } from "../app/actions/_host.ts";
import { mount } from "./lib.ts";
import { startWorker } from "../src/stand-in.ts";

const summarize = (reg: Record<string, any>) => Object.fromEntries(Object.entries(reg).map(([k, e]) => [k, { toolParams: Object.keys(e.tool?.parameters?.properties ?? {}), needsApproval: e.needsApproval, agentTool: e.agentTool, mcpTool: e.mcpTool, retrySafe: e.retrySafe, readOnly: e.readOnly, errorCodes: e.errorCodes, http: e.http }]));

console.log("## (a) file in actions/ via autoDiscoverActions() (cwd = app/)");
process.chdir(new URL("../app/", import.meta.url).pathname);
const discovered = await autoDiscoverActions();
console.log(JSON.stringify(summarize(discovered)));

console.log("## (b) static registry, module default = agent-native defineAction(options)");
const wrapped = await import("../app/actions/proposal-vote.ts");
const staticReg = loadActionsFromStaticRegistry({ "proposal-vote": wrapped });
console.log(JSON.stringify(summarize(staticReg)));

console.log("## (c) static registry, module default = OUR raw options object (no agent-native wrap)");
const raw = loadActionsFromStaticRegistry({ "proposal-vote": { default: options(host) } as any });
console.log("registered keys:", JSON.stringify(Object.keys(raw)));

console.log("## doors from (b)");
const w = await startWorker();
const http = mount(staticReg);
const approvalRefusal = await http("proposal-vote", { proposal: "p1", choice: "yes", weight: 1, stake: "1" });
console.log("HTTP route mounted:", approvalRefusal.status, JSON.stringify(approvalRefusal.body).slice(0, 90));
console.log("agent tools:", JSON.stringify(actionsToEngineTools(staticReg).map((t: any) => t.name)));
const e = staticReg["proposal-vote"];
console.log("MCP exposed (mcpTool:false):", isActionExposedToExternalAgents(e), "| if mcpTool were true/unset:", isActionExposedToExternalAgents({ ...e, mcpTool: undefined }));
await w.stop();
process.exit(0);
