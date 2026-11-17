// Spike entry file (spikes/work-real). Feeds the running work server with real facts about acme, then drives one
// mission through its real API. Nothing here is invented: the facts are acme's compiled model and the lines
// `architect prove --env local` prints. Run: node spikes/work-real/feed.ts [workUrl]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const WORK = process.argv[2] ?? "http://127.0.0.1:8801";
const ROOT = "examples/acme";
const cli = (...args: string[]) => execFileSync("node", ["packages/cli/src/main.ts", ...args], { encoding: "utf8", maxBuffer: 64 << 20 });

let token = "";
async function call(path: string, body: object) {
  const res = await fetch(`${WORK}/${path}`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text}`);
  return JSON.parse(text);
}

// 1. A real person, signed up and signed in through Better Auth on the work server.
const email = "aaron.local@example.test", password = "spike-only-password-1";
await call("person/sign-up", { email, password, name: "Aaron" }).catch(() => undefined); // already there on a rerun
token = (await call("session/sign-in", { email, password })).token;

// 2. Real facts: acme's model, its handlers, and a real prove run.
const revision = execFileSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8" }).trim();
const model = JSON.parse(cli("model", "--root", ROOT, "--json"));
console.log(`compiling acme at ${revision}: ${Object.keys(model.things).length} things, ${Object.keys(model.operations).length} operations`);
const started = Date.now();
const prove = cli("prove", "--env", "local", "--root", ROOT, "--port", "8811");
console.log(`proved acme locally in ${((Date.now() - started) / 1000).toFixed(1)} s: ${prove.trim().split("\n").at(-1)}`);

const facts: Array<object> = [];
for (const [name, t] of Object.entries<any>(model.things)) {
  const operations = Object.values<any>(model.operations).filter((o) => o.thing === name).map((o) => o.name);
  facts.push({ subject: name, kind: "compiled", env: "test", result: "info", note: JSON.stringify({ operations, states: t.machine?.states ?? [] }), revision });
}
for (const op of Object.values<any>(model.operations)) {
  const file = `${ROOT}/src/${op.thing}/${op.verb}.ts`;
  const implementation = op.kind === "read" ? "written" : !existsSync(file) ? "missing" : readFileSync(file, "utf8").includes("Handlers.blank") ? "scaffold" : "written";
  facts.push({ subject: op.name, kind: "compiled", env: "test", result: "info", note: JSON.stringify({ blanks: 0, implementation }), revision });
}
// "allowance.grant answer shape ✔", one line per operation and eval; the "9 evals" lines are summaries.
for (const line of prove.split("\n")) {
  const m = /^([a-z-]+\.[a-z-]+) (.+?) (✔|✘)/.exec(line);
  if (m && !/^\d+ evals$/.test(m[2]!)) facts.push({ subject: m[1], kind: "eval", env: "test", result: m[3] === "✔" ? "pass" : "fail", note: m[2], revision });
}
for (const f of facts) await call("fact/record", f);
console.log(`recorded ${facts.length} facts`);

// 3. A mission, set up the way the manager would: milestones, intake questions, start, a run, and one promote for you.
const { mission } = await call("mission/open", { title: "Allowances to production", target: "production", blueprint: revision });
await call("milestone/add", { mission, title: "Specify", kinds: ["specify", "machine", "validate"], of: "allowance", until: "test" });
await call("milestone/add", { mission, title: "Ship", kinds: ["build", "prove", "promote"], of: "allowance", until: "production" });
const q = async (asks: string, about: string, gap: string, options: string[]) => (await call("question/ask", { mission, asks, about, gap, options })).question;
const q1 = await q("When does spend refuse with OverLimit?", "allowance.spend", "AllowanceExceeded has no when", ["The amount is above what remains", "Above what remains, or above a daily cap", "Not sure yet: spike it"]);
const q2 = await q("What does revoking do to what's left?", "allowance.revoke", "revoke's effect on spent is not declared", ["It's gone", "It goes back to the grantor"]);
const q3 = await q("How far should this go?", "allowance", "mission target", ["Test", "Staging", "Production, with your yes for each promote"]);
const early = await call("mission/start", { mission }).then(() => "started", (e: Error) => e.message.split(":").slice(1).join(":").trim());
console.log(`start before answering: ${early}`);
await call("question/spike", { mission, question: q1 });
await call("question/answer", { mission, question: q2, picked: "B" });
await call("question/answer", { mission, question: q3, picked: "C" });
await call("mission/start", { mission });
const { run } = await call("run/start", { mission, task: "spike:allowance.spend", agent: "specifier", model: "claude-sonnet-5-5", budget: "200" });
await call("run/report", { mission, run, report: "progress", note: "Reading AllowanceExceeded and the spend journeys" });
await call("attention/raise", { mission, kind: "promote", title: "Promote allowance.grant to production?", why: "Proven 9 of 9 locally. Production can't be undone for its data.", task: "promote:allowance.grant" });

const { tasks } = await call("mission/tasks", { mission });
console.log(`snapshot: node spikes/work-real/snapshot.ts ${mission}`);
const cols = ["open", "running", "waiting", "proven", "done"];
console.log(`\nmission ${mission} · ${tasks.length} tasks`);
for (const c of cols) console.log(`  ${c.padEnd(8)} ${tasks.filter((t: any) => t.column === c).map((t: any) => t.key).join(", ") || "-"}`);
