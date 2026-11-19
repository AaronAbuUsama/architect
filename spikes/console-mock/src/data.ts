// One story across every Operate screen: desk-lead clears a support backlog.

export const goal = {
  text: "Get the support backlog under 20 open tickets by Friday",
  doneWhen: "Zendesk shows fewer than 20 open tickets and none is older than 48 hours",
  done: 28, total: 45, open: 31, target: 20, eta: "Thu 16:00",
};

export type Milestone = { id: string; title: string; status: "done" | "active" | "open"; done: number; total: number; note: string };
export const milestones: Milestone[] = [
  { id: "M1", title: "Triage the backlog", status: "done", done: 12, total: 12, note: "Done 13:40 · took 3 h 10 m" },
  { id: "M2", title: "Refunds and billing", status: "active", done: 9, total: 15, note: "9 of 15 · 2 workers" },
  { id: "M3", title: "CSV export timeout", status: "active", done: 2, total: 8, note: "2 of 8 · started early" },
  { id: "M4", title: "Help-center articles", status: "open", done: 0, total: 10, note: "Added by Ann in Slack" },
];

export type Health = "healthy" | "struggling" | "idle";
export type Worker = {
  name: string; preset: string; spawn: string; milestone: string; item: string; at: number; of: number;
  health: Health; okRate: number; perItem: string; calls: number; spark: number[];
};
export const workers: Worker[] = [
  { name: "resolver-4183", preset: "Ticket resolver", spawn: "fresh", milestone: "M2", item: "Refund the double charge on T-4183", at: 4, of: 5, health: "healthy", okRate: 99.1, perItem: "5 m 10 s", calls: 214, spark: [3, 4, 4, 5, 6, 6, 7, 8] },
  { name: "resolver-4190", preset: "Ticket resolver", spawn: "fresh", milestone: "M2", item: "Prorate the seat downgrade on T-4190", at: 2, of: 4, health: "healthy", okRate: 98.4, perItem: "5 m 48 s", calls: 96, spark: [1, 2, 2, 3, 4, 4, 5, 5] },
  { name: "fixer-4177", preset: "Code fixer", spawn: "fork of desk-lead", milestone: "M3", item: "Rewrite the export query", at: 3, of: 6, health: "struggling", okRate: 90.2, perItem: "12 m 40 s", calls: 142, spark: [2, 3, 3, 3, 3, 3, 3, 3] },
  { name: "research-okta", preset: "Researcher", spawn: "fresh", milestone: "M2", item: "Report SCIM findings to desk-lead", at: 4, of: 4, health: "healthy", okRate: 100, perItem: "4 m 02 s", calls: 61, spark: [1, 2, 3, 3, 4, 4, 4, 4] },
  { name: "reviewer-4177", preset: "Reviewer", spawn: "fork of fixer-4177", milestone: "M3", item: "Waiting for the fix to review", at: 0, of: 3, health: "idle", okRate: 100, perItem: "—", calls: 0, spark: [0, 0, 0, 0, 0, 0, 0, 0] },
  { name: "docs-writer", preset: "Docs writer", spawn: "fresh", milestone: "M4", item: "Outline the refund policy article", at: 1, of: 10, health: "healthy", okRate: 97.0, perItem: "8 m 15 s", calls: 33, spark: [0, 0, 0, 0, 0, 1, 1, 1] },
];
export const healthTone = { healthy: "success", struggling: "danger", idle: "default" } as const;

export const tools = [
  { tool: "mcp__zendesk__get_ticket", calls: 412, failed: 2 },
  { tool: "read", calls: 301, failed: 3 },
  { tool: "bash", calls: 233, failed: 19 },
  { tool: "mcp__zendesk__update_ticket", calls: 128, failed: 1 },
  { tool: "web_fetch", calls: 88, failed: 11 },
  { tool: "edit", calls: 71, failed: 2 },
  { tool: "subagent", calls: 31, failed: 0 },
  { tool: "mcp__billing__refund", calls: 14, failed: 0 },
];

export const narrationNow = {
  window: "14:05 – 14:10", length: "0:48", position: 31,
  paragraphs: [
    "desk-lead split the refund queue in two. resolver-4183 took the double charges and has the refund for T-4183 ready, but it is $49, over the $25 limit, so it is waiting for you. resolver-4190 is working through seat downgrades and finished two in under six minutes each.",
    "fixer-4177 is having a harder time. Its fix for the CSV export timeout failed the test suite twice. It is now on its third try at the query, twenty-three minutes into a task that usually takes seven. desk-lead noticed and told it to try the indexed column Ann suggested in Slack.",
    "Ann asked in Slack whether T-4183 was sorted. desk-lead answered in her thread: the refund is ready and waiting on approval.",
  ],
};

export const chunks = [
  { id: "c1", when: "14:00 – 14:05", title: "research-okta finished the SCIM research and reported back", len: "0:36", kind: "5 min" },
  { id: "c2", when: "13:40", title: "Milestone M1 done: all 12 backlog tickets triaged", len: "0:52", kind: "Milestone" },
  { id: "c3", when: "13:00 – 14:00", title: "The hour: refunds started, the export bug found, Ann added docs", len: "1:44", kind: "Hour" },
  { id: "c4", when: "02:00 – 09:00", title: "Overnight: 9 tickets closed, one worker restarted cleanly", len: "2:10", kind: "Rollup" },
];

export const approvals = [
  { who: "Refund $49 on T-4183", why: "resolver-4183 · over the $25 limit you set for refunds", tool: "mcp__billing__refund" },
  { who: "Push the export fix branch", why: "fixer-4177 · pushes always ask", tool: "bash · git push" },
];

export type Channel = { id: string; name: string; kind: string; runs: string; steer: string; reply: string; today: number; waiting?: number };
export const channels: Channel[] = [
  { id: "slack-support", name: "#support", kind: "Slack", runs: "Mentions start a run · chatter is only recorded", steer: "Members", reply: "Same thread", today: 46, waiting: 1 },
  { id: "telegram-ops", name: "Ops group", kind: "Telegram", runs: "Every message starts a run", steer: "Operators", reply: "Same chat", today: 12 },
  { id: "zendesk", name: "Ticket events", kind: "Webhook", runs: "Recorded, picked up by the plan", steer: "Nobody", reply: "Never replies", today: 31 },
  { id: "console", name: "Console", kind: "Console", runs: "Every message starts a run", steer: "Operators", reply: "Console", today: 4 },
  { id: "standup", name: "Daily 09:00", kind: "Schedule", runs: "Starts a run with the standup prompt", steer: "—", reply: "#support", today: 1 },
];
