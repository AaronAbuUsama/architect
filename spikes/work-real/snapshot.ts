// Spike entry file (spikes/work-real). Reads one mission back out of the running work server through its real API
// (mission, milestones, questions, runs, attention and the computed tasks) and writes it as the snapshot the portal
// mock renders. Run: node spikes/work-real/snapshot.ts <mission> [workUrl] [outFile]
import { writeFileSync } from "node:fs";

const [mission, WORK = "http://127.0.0.1:8801", out = "spikes/work-real/snapshot.json"] = process.argv.slice(2);
if (!mission) throw new Error("usage: snapshot.ts <mission> [workUrl] [outFile]");
let token = "";
async function call(path: string, body: object) {
  const res = await fetch(`${WORK}/${path}`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text}`);
  return JSON.parse(text);
}
// The spike's local test person, the same one feed.ts signs up.
token = (await call("session/sign-in", { email: "aaron.local@example.test", password: "spike-only-password-1" })).token;

const items = (r: any) => r.items ?? r.rows ?? r;
const snapshot = {
  readAt: new Date().toISOString(),
  mission: { id: mission, ...(await call("mission/get", { id: mission })) },
  milestones: items(await call("milestone/list", { mission })),
  questions: items(await call("question/list", { mission })),
  runs: items(await call("run/list", { mission })),
  attention: items(await call("attention/list", { mission })),
  tasks: (await call("mission/tasks", { mission })).tasks,
};
// Who owns it is a person id; the portal has no use for it.
delete (snapshot.mission as any).owner;
writeFileSync(out, JSON.stringify(snapshot, null, 2) + "\n");
console.log(`${out}: ${snapshot.milestones.length} milestones, ${snapshot.questions.length} questions, ${snapshot.runs.length} runs, ${snapshot.attention.length} attention, ${snapshot.tasks.length} tasks`);
