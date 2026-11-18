// Made-up work over acme's real operations: what a Plan, Manager and Runs would hold mid-mission. Illustration only.
import type { Fact, Mission, Run, RunEvent, Task, WorkerType } from "./types.ts";
import { realMission, realRuns, realTasks } from "./real/real.ts";

const DAYS = ["Nov 12", "Nov 13", "Nov 14", "Nov 15", "Nov 16", "Nov 17"];
export const TODAY = "Nov 17";

export const workers: WorkerType[] = [
  { id: "manager", name: "Manager", does: "Sets a mission up, then only orchestrates: reads facts, starts runs, asks you.", kinds: [], models: ["claude-opus-5-5", "claude-sonnet-5-5"], skills: ["mission-intake", "hill-climb"], mcps: ["plan", "logbook"], tools: ["start run", "stop run", "ask you", "read facts"], sandbox: null, budgetUsd: 1, file: "architect/workers/manager.ts", limits: { maxTurns: 400, timeoutMin: 1440, parallel: 1 }, asks: ["start a mission", "promote to production", "spend past the daily cap"] },
  { id: "specifier", name: "Specifier", does: "Fills an operation's blanks; runs spikes on what nobody knows yet.", kinds: ["specify", "spike"], models: ["claude-opus-5-5", "claude-fable-5-2"], skills: ["specify", "spike"], mcps: ["project", "logbook"], tools: ["read", "write blueprint", "check"], sandbox: "e2b · node24", budgetUsd: 2, file: "architect/workers/specifier.ts", limits: { maxTurns: 60, timeoutMin: 30, parallel: 2 }, asks: ["change a decided operation"] },
  { id: "designer", name: "Machine designer", does: "Designs a thing's states and moves; validates coverage.", kinds: ["design machine", "validate machine"], models: ["claude-opus-5-5"], skills: ["design-machine"], mcps: ["project"], tools: ["read", "write blueprint", "check"], sandbox: "e2b · node24", budgetUsd: 2, file: "architect/workers/designer.ts", limits: { maxTurns: 60, timeoutMin: 30, parallel: 1 }, asks: ["remove a state"] },
  { id: "journeys", name: "Journey writer", does: "Writes an operation's journeys before anyone builds it. Never the builder.", kinds: ["build"], models: ["claude-sonnet-5-5", "qwen3-coder"], skills: ["journeys"], mcps: ["project"], tools: ["read", "write journeys", "check"], sandbox: "e2b · node24", budgetUsd: 1, file: "architect/workers/journeys.ts", limits: { maxTurns: 40, timeoutMin: 20, parallel: 3 }, asks: [] },
  { id: "builder", name: "Builder", does: "Writes the handler until its journeys and evals pass.", kinds: ["build", "prove"], models: ["claude-sonnet-5-5", "claude-opus-5-5", "kimi-k2"], skills: ["build", "prove"], mcps: ["project", "axiom (read)"], tools: ["read", "write handler", "check", "prove"], sandbox: "e2b · node24", budgetUsd: 2, file: "architect/workers/builder.ts", limits: { maxTurns: 80, timeoutMin: 45, parallel: 3 }, asks: ["add a dependency", "write outside its grant"] },
  { id: "sre", name: "SRE", does: "Finds out why a run or an eval failed, from traces.", kinds: ["prove"], models: ["claude-sonnet-5-5", "claude-haiku-5-5"], skills: ["axiom-sre"], mcps: ["axiom (read)", "logbook"], tools: ["query traces", "report"], sandbox: null, budgetUsd: 1, file: "architect/workers/sre.ts", limits: { maxTurns: 30, timeoutMin: 15, parallel: 2 }, asks: [] },
  { id: "reviewer", name: "🔍 Reviewer", does: "Reviews a change against its brief before it is promoted.", kinds: ["promote"], models: ["claude-opus-5-5"], skills: ["reviewer"], mcps: ["project", "logbook"], tools: ["read", "diff", "report"], sandbox: "e2b · node24", budgetUsd: 1, file: "architect/workers/reviewer.ts", limits: { maxTurns: 40, timeoutMin: 20, parallel: 1 }, asks: [] },
];

export const missions: Mission[] = [
  { id: "allowances", title: "Allowances to production", hue: ["#c4b5fd", "#6d28d9"], until: "production", started: "Nov 12", status: "running",
    milestones: [{ title: "Specify", kinds: ["specify", "design machine", "validate machine", "spike"], of: "allowance" }, { title: "Ship", kinds: ["build", "prove", "promote"], of: "allowance" }],
    daily: { day: DAYS, open: [16, 14, 12, 12, 9, 7], scope: [16, 16, 16, 17, 17, 17], spend: [1.9, 2.6, 3.4, 2.2, 4.1, 3.2], toolFail: [9.1, 7.4, 6.2, 5.9, 4.8, 4.2], evalPass: [0, 41, 63, 78, 87, 91], closed: [0, 2, 4, 5, 8, 10], closeMin: [0, 64, 52, 47, 41, 38] } },
  { id: "invitations", title: "Invitations hardening", hue: ["#99f6e4", "#0f766e"], until: "staging", started: "Nov 15", status: "idle",
    milestones: [{ title: "Prove", kinds: ["prove", "promote"], of: "invitation" }],
    daily: { day: DAYS, open: [0, 0, 0, 6, 5, 5], scope: [0, 0, 0, 6, 6, 6], spend: [0, 0, 0, 1.1, 0.8, 0], toolFail: [0, 0, 0, 3.0, 2.5, 0], evalPass: [0, 0, 0, 70, 81, 81], closed: [0, 0, 0, 0, 1, 1], closeMin: [0, 0, 0, 0, 55, 55] } },
  { id: "sign-in", title: "Sign-in v1", hue: ["#e5e7eb", "#6b7280"], until: "production", started: "Nov 8", status: "done",
    milestones: [{ title: "Ship", kinds: ["build", "prove", "promote"], of: "session" }],
    daily: { day: DAYS, open: [2, 1, 0, 0, 0, 0], scope: [9, 9, 9, 9, 9, 9], spend: [0.9, 0.4, 0, 0, 0, 0], toolFail: [5, 4, 0, 0, 0, 0], evalPass: [96, 100, 100, 100, 100, 100], closed: [7, 8, 9, 9, 9, 9], closeMin: [33, 31, 30, 30, 30, 30] } },
];

const t = (id: string, mission: string, milestone: string, kind: Task["kind"], subject: string, column: Task["column"], closesWhen: string, rest: Partial<Task> = {}): Task =>
  ({ id, mission, milestone, kind, subject, column, closesWhen, runs: [], ...rest });
const EVALS9 = "all nine evals pass in test";
export const tasks: Task[] = [
  t("t1", "allowances", "Specify", "specify", "allowance.spend", "done", "its blanks are gone", { note: "blanks 1 → 0", progress: [1, 1] }),
  t("t2", "allowances", "Specify", "specify", "allowance.revoke", "done", "its blanks are gone", { note: "blanks 2 → 0", progress: [2, 2] }),
  t("t3", "allowances", "Specify", "design machine", "allowance", "done", "every move has from, to and emits", { note: "3 states, 4 moves" }),
  t("t4", "allowances", "Specify", "validate machine", "allowance", "proven", "coverage reaches every move and error", { progress: [7, 7] }),
  t("t5", "allowances", "Specify", "spike", "Daily cap or per-spend limit?", "done", "its README is on main", { note: "per-spend, plus a daily cap later" }),
  t("t6", "allowances", "Ship", "build", "allowance.get", "done", "implementation: written", { runs: ["r_31"] }),
  t("t7", "allowances", "Ship", "build", "allowance.grant", "done", "implementation: written", { runs: ["r_33"] }),
  t("t8", "allowances", "Ship", "build", "allowance.spend", "running", "implementation: written", { runs: ["r_37", "r_41"], progress: [5, 7], note: "5 of 7 journeys green" }),
  t("t9", "allowances", "Ship", "build", "allowance.revoke", "running", "implementation: written", { runs: ["r_42"], progress: [0, 4], note: "journeys first" }),
  t("t10", "allowances", "Ship", "prove", "allowance.get", "proven", EVALS9, { progress: [9, 9] }),
  t("t11", "allowances", "Ship", "prove", "allowance.grant", "proven", EVALS9, { runs: ["r_39"], progress: [9, 9] }),
  t("t12", "allowances", "Ship", "prove", "allowance.spend", "open", EVALS9, { runs: ["r_40"], progress: [8, 9], reopened: "performance: p95 212 ms against 150" }),
  t("t13", "allowances", "Ship", "prove", "allowance.revoke", "open", EVALS9, { progress: [0, 9] }),
  t("t14", "allowances", "Ship", "promote", "allowance.get", "done", "a pass recorded in each environment to production", { progress: [3, 3] }),
  t("t15", "allowances", "Ship", "promote", "allowance.grant", "waiting", "a pass recorded in each environment to production", { progress: [2, 3], note: "production needs your yes" }),
  t("t16", "allowances", "Ship", "promote", "allowance.spend", "open", "a pass recorded in each environment to production", { progress: [0, 3] }),
  t("t17", "allowances", "Ship", "promote", "allowance.revoke", "open", "a pass recorded in each environment to production", { progress: [0, 3] }),
  t("t21", "invitations", "Prove", "prove", "invitation.send", "open", EVALS9, { progress: [7, 9] }),
  t("t22", "invitations", "Prove", "prove", "invitation.accept", "proven", EVALS9, { progress: [9, 9] }),
];

const turn = (at: number, n: number, i: number, o: number, c: number, text: string): RunEvent => ({ at, kind: "turn", n, tokensIn: i, tokensOut: o, cached: c, text });
const cmd = (at: number, c: string, exit: number, ms: number, tail?: string): RunEvent => ({ at, kind: "command", cmd: c, exit, ms, tail });
const tool = (at: number, name: string, args: string, ok: boolean, ms: number, error?: string, more: Partial<Extract<RunEvent, { kind: "tool" }>> = {}): RunEvent => ({ at, kind: "tool", name, args, ok, ms, error, ...more });
export const runs: Run[] = [
  { id: "r_41", task: "t8", worker: "builder", model: "claude-sonnet-5-5", status: "running", started: "09:34", seconds: 372, costUsd: 0.41, sandbox: "e2b iztf5r…", sandboxUp: true, events: [
    turn(4, 1, 18200, 410, 0, "Reading the brief and the **spend** journeys. The scaffold answers every call with `OverLimit`, so all seven journeys are red."),
    tool(6, "read", "handlers/spend.ts", true, 120, undefined, { input: { path: "handlers/spend.ts" }, lang: "ts", output: "// Scaffolded from blueprint/allowance.ts. Yours from now on.\nexport const spend = Handler.of(Allowance.spend, ({ input }) =>\n  Effect.fail(new OverLimit({ remaining: 0n })));" }),
    tool(9, "read", "journeys/spend.journey.ts", true, 95, undefined, { input: { path: "journeys/spend.journey.ts" }, lang: "ts", output: "journey(\"spends within remaining\", ...)\njourney(\"spends past remaining\", ...)\njourney(\"spends on a revoked allowance\", ...)\n// 4 more" }),
    cmd(15, "pnpm install --frozen-lockfile", 0, 21400),
    turn(41, 2, 24100, 1220, 17900, "The handler reads the allowance twice; one read can serve both checks."),
    { at: 52, kind: "edit", file: "handlers/spend.ts", added: 18, removed: 9, diff: " export const spend = Handler.of(Allowance.spend, ({ input }) =>\n-  Effect.fail(new OverLimit({ remaining: 0n })));\n+  Effect.gen(function* () {\n+    const a = yield* Allowances.get(input.allowance);\n+    if (a.state !== \"active\") return yield* new AllowanceNotActive({ state: a.state });\n+    yield* Allowances.debit(a.id, input.amount);\n+    if (a.remaining < input.amount) return yield* new OverLimit({ remaining: a.remaining });\n+    return { remaining: a.remaining - input.amount };\n+  }));" },
    { at: 60, kind: "command", cmd: "architect check", exit: 1, ms: 8300, tail: "journey 'spends past remaining' expected OverLimit, got answer", out: "✓ spends within remaining\n✘ spends past remaining\n    expected  OverLimit { remaining: 40n }\n    received  answer { remaining: -60n }\n✓ spends on a revoked allowance\n✓ spends on an expired allowance\n✓ spends twice in one second\n✓ spends the exact remaining\n✓ spends zero\n\n6 of 7 journeys pass" },
    turn(74, 3, 26800, 640, 23100, "Over-limit is checked after the debit. Moving it before."),
    tool(80, "write_handler", "handlers/shared/limits.ts", false, 40, "path outside grant: handlers/shared/limits.ts", { input: { path: "handlers/shared/limits.ts", content: "export const withinLimit = (a: Allowance, amount: bigint) => a.remaining >= amount;" }, output: "Refused by the grant. builder may write: handlers/spend.ts" }),
    turn(88, 4, 27300, 380, 26100, "That file is outside my grant; keeping the check inside spend.ts."),
    { at: 95, kind: "edit", file: "handlers/spend.ts", added: 6, removed: 2, diff: "     if (a.state !== \"active\") return yield* new AllowanceNotActive({ state: a.state });\n-    yield* Allowances.debit(a.id, input.amount);\n     if (a.remaining < input.amount) return yield* new OverLimit({ remaining: a.remaining });\n+    yield* Allowances.debit(a.id, input.amount);\n     return { remaining: a.remaining - input.amount };" },
    { at: 140, kind: "resume", text: "Run object evicted; resumed from the stored checkpoint, sandbox reconnected by id." },
    { at: 150, kind: "command", cmd: "architect check", exit: 0, ms: 7900, tail: "7 of 7 journeys pass", out: "✓ spends within remaining\n✓ spends past remaining\n✓ spends on a revoked allowance\n✓ spends on an expired allowance\n✓ spends twice in one second\n✓ spends the exact remaining\n✓ spends zero\n\n7 of 7 journeys pass" },
    { at: 168, kind: "report", report: "progress", text: "Journeys green. Running prove on the local world (it proves every operation)." },
    cmd(175, "architect prove --env local", 0, 0, "running…"),
  ] },
  { id: "r_42", task: "t9", worker: "journeys", model: "qwen3-coder", status: "running", started: "10:01", seconds: 128, costUsd: 0.06, sandbox: "e2b k3vq0d…", sandboxUp: true, events: [
    turn(3, 1, 14100, 520, 0, "Revoke has 2 refusals and 1 move; writing 4 journeys."),
    { at: 30, kind: "edit", file: "journeys/revoke.journey.ts", added: 64, removed: 0 },
    cmd(44, "architect check", 0, 5200, "4 journeys fail on the empty handler, as they should"),
    { at: 50, kind: "report", report: "progress", text: "4 journeys written and red on the empty handler." },
  ] },
  { id: "r_37", task: "t8", worker: "builder", model: "kimi-k2", status: "failed", started: "Nov 16 15:10", seconds: 1260, costUsd: 0.33, sandbox: "e2b 9mfx2a…", sandboxUp: false, events: [
    turn(5, 1, 18200, 300, 0, "Starting on spend."),
    cmd(90, "architect check", 1, 8100, "3 journeys fail"),
    tool(300, "write_handler", "handlers/spend.ts", false, 30, "schema: amount must be uint64"),
    tool(420, "write_handler", "handlers/spend.ts", false, 28, "schema: amount must be uint64"),
    { at: 1250, kind: "report", report: "failed", text: "Out of budget with 3 journeys red." },
  ] },
  { id: "r_39", task: "t11", worker: "builder", model: "claude-sonnet-5-5", status: "passed", started: "Nov 16 11:02", seconds: 540, costUsd: 0.22, sandbox: "e2b 1xq8re…", sandboxUp: false, events: [
    cmd(20, "architect prove --env local", 0, 61000, "allowance.grant 9 evals ✔ · prove ✔"), { at: 90, kind: "report", report: "ready", text: "Proven in test." }] },
  { id: "r_40", task: "t12", worker: "sre", model: "claude-haiku-5-5", status: "passed", started: "Nov 17 10:06", seconds: 95, costUsd: 0.02, sandbox: "none", sandboxUp: false, events: [
    tool(10, "queryDataset", "spans where operation = allowance.spend | p95", true, 840),
    { at: 60, kind: "report", report: "ready", text: "Two reads of allowance per call; the second is 61% of the time." }] },
  { id: "r_33", task: "t7", worker: "builder", model: "claude-opus-5-5", status: "passed", started: "Nov 15 09:40", seconds: 610, costUsd: 0.58, sandbox: "e2b pp1c0w…", sandboxUp: false, events: [] },
  { id: "r_31", task: "t6", worker: "builder", model: "claude-sonnet-5-5", status: "passed", started: "Nov 14 16:20", seconds: 300, costUsd: 0.12, sandbox: "e2b 0akd7s…", sandboxUp: false, events: [] },
];

export const facts: Fact[] = [
  { seq: 98, at: "Nov 13 10:02", subject: "allowance.spend", kind: "spike", text: "Spike answered: per-spend limit (README on main)" },
  { seq: 112, at: "Nov 14 09:12", subject: "allowance.spend", kind: "compiled", text: "Compiled 53d0: blanks 1 → 0", tone: "good" },
  { seq: 113, at: "Nov 14 09:12", subject: "allowance.spend", kind: "compiled", text: "implementation: missing → scaffold" },
  { seq: 131, at: "Nov 16 15:10", subject: "allowance.spend", kind: "claimed", text: "Claimed by r_37 (builder, kimi-k2)" },
  { seq: 140, at: "Nov 16 15:31", subject: "allowance.spend", kind: "claimed", text: "r_37 ended: failed, out of budget", tone: "bad" },
  { seq: 151, at: "Nov 17 09:34", subject: "allowance.spend", kind: "claimed", text: "Claimed by r_41 (builder, claude-sonnet-5-5)" },
  { seq: 156, at: "Nov 17 10:05", subject: "allowance.spend", kind: "evals", text: "Evals in test: 8 pass, 1 fail (performance 212 / 150 ms)", tone: "bad" },
  { seq: 157, at: "Nov 17 10:06", subject: "allowance.spend", kind: "claimed", text: "prove reopened; r_40 (SRE) started on the trace" },
];

missions.unshift(realMission); tasks.push(...realTasks); runs.push(...realRuns);

export const missionOf = (id: string) => missions.find((m) => m.id === id);
export const tasksOf = (mission: string) => tasks.filter((x) => x.mission === mission);
export const runsOf = (mission: string) => runs.filter((r) => tasks.find((x) => x.id === r.task)?.mission === mission);
export const taskOf = (id: string) => tasks.find((x) => x.id === id);
export const runOf = (id: string) => runs.find((r) => r.id === id);
export const workerOf = (id: string) => workers.find((w) => w.id === id)!;

/** What an agent type can be given: the models the gateway serves, the skills in .agents/skills, the MCPs and tools
 * the runner knows, and the sandbox templates. The settings page picks from these. */
export const catalog = {
  models: [
    { id: "claude-opus-5-5", by: "Anthropic", inPerM: 5, outPerM: 25 }, { id: "claude-sonnet-5-5", by: "Anthropic", inPerM: 3, outPerM: 15 },
    { id: "claude-haiku-5-5", by: "Anthropic", inPerM: 1, outPerM: 5 }, { id: "claude-fable-5-2", by: "Anthropic", inPerM: 4, outPerM: 20 },
    { id: "kimi-k2", by: "Moonshot", inPerM: 0.6, outPerM: 2.5 }, { id: "qwen3-coder", by: "Alibaba", inPerM: 0.4, outPerM: 1.6 },
  ],
  skills: ["mission-intake", "hill-climb", "specify", "spike", "design-machine", "journeys", "build", "prove", "axiom-sre", "reviewer"],
  mcps: [
    { id: "project", does: "Reads and writes the repository through the grant" }, { id: "plan", does: "The Plan object: tasks, columns, facts" },
    { id: "logbook", does: "The Book object: every fact, by seq" }, { id: "axiom (read)", does: "Traces and logs, read-only" },
  ],
  tools: ["read", "write blueprint", "write journeys", "write handler", "check", "prove", "diff", "report", "query traces", "start run", "stop run", "ask you", "read facts"],
  sandboxes: [{ id: "e2b · node24", does: "Node 24, pnpm, architect CLI; resumes by id" }, { id: "e2b · node24 + anvil", does: "Adds a local chain, for layer four" }],
};
