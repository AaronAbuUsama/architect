// The one mission in the Work area that is not made up: read out of the work server's API by
// spikes/work-real/snapshot.ts (on spike/work-real). Its tasks were computed by the server from acme's compiled model
// and a real `architect prove --env local`; nothing here edits them, only reshapes them for the mock's views.
import type { Msg } from "../conversation.ts";
import type { Kind, Mission, Run, Task } from "../types.ts";
import snap from "./snapshot.json";

export const REAL = "real";
const KIND: Record<string, Kind> = { machine: "design machine", validate: "validate machine" };
const kindOf = (k: string) => KIND[k] ?? (k as Kind);
const CLOSES: Record<string, string> = {
  specify: "no blanks left in the compiled operation", machine: "the thing has states", validate: "every operation has a coverage eval passing",
  build: "the handler is written, not a scaffold", prove: "all nine evals pass locally", promote: "a verdict in every environment up to the target", spike: "the spike's README is merged",
};
const day = snap.readAt.slice(5, 10) === "11-17" ? "Nov 17" : snap.readAt.slice(0, 10);
const zeros = [0, 0, 0, 0, 0, 0];
const flat = (n: number) => zeros.map(() => n);
const proves = snap.tasks.filter((t) => t.kind === "prove");
/** Share of prove tasks whose nine evals all passed, which is what the server's board rule checks. */
const evalPass = proves.length ? Math.round((proves.filter((t) => t.column !== "open").length / proves.length) * 100) : 0;
const closed = snap.tasks.filter((t) => t.column === "done" || t.column === "proven").length;

export const realMission: Mission = {
  id: REAL, title: `${snap.mission.title} · real`, hue: ["#fde68a", "#b45309"], until: snap.mission.target, started: day, status: "running",
  milestones: snap.milestones.map((m) => ({ title: m.title, kinds: m.kinds.map(kindOf), of: m.of })),
  // One day of history: the server keeps facts, not daily rollups, so every day shows today's value.
  daily: { day: ["Nov 12", "Nov 13", "Nov 14", "Nov 15", "Nov 16", day], open: flat(snap.tasks.length - closed), scope: flat(snap.tasks.length), spend: zeros, toolFail: zeros, evalPass: flat(evalPass), closed: flat(closed), closeMin: zeros },
};

export const realRuns: Run[] = snap.runs.map((r) => ({
  id: r.id, task: r.task, worker: r.agent, model: r.model, status: r.state === "running" ? "running" : r.state === "finished" ? "passed" : r.state === "failed" ? "failed" : "stopped",
  started: day, seconds: 0, costUsd: 0, sandbox: "local", sandboxUp: true, events: [],
}));

const milestoneTitle = (id: string) => snap.milestones.find((m) => m.id === id)?.title ?? id;
export const realTasks: Task[] = snap.tasks.map((t) => ({
  id: t.key, mission: REAL, milestone: milestoneTitle(t.milestone), kind: kindOf(t.kind), subject: t.subject, column: t.column as Task["column"],
  closesWhen: CLOSES[t.kind] ?? "", runs: snap.runs.filter((r) => r.task === t.key).map((r) => r.id),
}));

const letters = "ABCDEFGH";
export const realConversation: Msg[] = [
  { kind: "manager", at: `${day} live`, text: `Read from the work server at blueprint revision \`${snap.mission.blueprint}\`: ${snap.tasks.length} tasks across ${snap.milestones.length} milestones, ${closed} already closed by facts.` },
  ...snap.questions.flatMap((q): Msg[] => [
    { kind: "choice", at: `${day} live`, from: `${q.about} · ${q.gap}`, question: q.asks, options: q.options.map((o, i) => [letters[i]!, o] as [string, string]) },
    { kind: "system", at: `${day} live`, text: q.state === "spiked" ? "Sent to a spike" : q.state === "answered" ? "Answered (the blueprint doesn't keep which letter yet)" : "Waiting for you", tone: q.state === "asked" ? undefined : "good" },
  ]),
  ...snap.runs.map((r): Msg => ({ kind: "system", at: `${day} live`, text: `Started ${r.agent} on ${r.model}, budget ${r.budget}¢`, run: r.id, task: r.task })),
  ...snap.attention.filter((a) => a.kind === "promote").map((a): Msg => ({ kind: "approve", at: `${day} live`, title: a.title, why: a.why, task: a.task, done: a.state === "approved" ? "approved" : a.state === "declined" ? "not yet" : undefined })),
];
