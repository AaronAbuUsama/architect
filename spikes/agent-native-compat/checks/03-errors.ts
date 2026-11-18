import { agentToolCall, mount } from "./lib.ts";
import { buildProbes } from "./probes.ts";
import { startWorker, worker } from "../src/stand-in.ts";

const w = await startWorker();
const actions = buildProbes();
const http = mount(actions);
const validArgs = { proposal: "p1", choice: "yes", weight: 1, stake: "1" };
const rows: string[] = [];
const cases: Array<[string, string, "ok" | "soldout" | "defect"]> = [];
for (const name of Object.keys(actions)) {
  if (name.startsWith("e-generated")) { cases.push([name, `${name} [worker=soldout]`, "soldout"]); cases.push([name, `f-generated-defect-${name.slice(-3)} [worker=defect]`, "defect"]); }
  else cases.push([name, name, "ok"]);
}
for (const [name, label, mode] of cases) {
  const args = name.startsWith("e-generated") ? validArgs : {};
  worker.mode = mode;
  const h = await http(name, args);
  worker.mode = mode;
  const t = await agentToolCall(name, { [name]: actions[name] }, args);
  rows.push(JSON.stringify({ case: label, http: h, tool: t }));
}
console.log(rows.join("\n"));
await w.stop();
process.exit(0);
