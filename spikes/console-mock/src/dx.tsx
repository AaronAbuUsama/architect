import { Widget } from "@heroui-pro/react/widget";
import { Chip } from "@heroui/react";
import { Code, highlight } from "./code.tsx";
import { Shell } from "./shell.tsx";

const plan = `import { defineDoc, defineExtension, defineTool } from "@earendil-works/pi-durable";
import { obj, str } from "@earendil-works/pi-schema";

// The plan is one typed JSON document per conversation.
export const Plan = defineDoc<PlanState>({
  kind: "app.plan", version: 1, scope: "conversation",
  history: "rewindable",   // the console scrubs back through revisions
  fork: "current",         // a forked worker starts with the plan as it is
  initial: () => ({ milestones: [], items: [] }),
  checkpointWhen: (doc) => doc.items.length % 50 === 0,
});

// Only the plan tools change it. Each call is one commit.
const finishItem = defineTool({
  name: "plan_finish_item",
  description: "Mark one of your work items done.",
  parameters: obj({ id: str(), note: str() }),
  execute: async ({ id, note }, api, context) => {
    await api.commit(async (tx) => {
      const plan = await tx.doc(Plan, api.conversationId);
      const item = plan.items.find((i) => i.id === id && i.owner === api.conversationId);
      if (!item) throw new Error(\`No item \${id} of yours\`);
      Object.assign(item, { status: "done", finishedAt: api.now(), note });
    }, context);
    return { output: [{ type: "text", text: "done" }] };
  },
});

export const PlanTools = defineExtension({
  name: "plan",
  tools: [setGoal, addMilestone, completeMilestone, addItem, startItem, finishItem, failItem],
});`;

const spawn = `// The manager chooses, per worker, how it starts.
const spawnWorker = defineTool({
  name: "spawn_worker",
  description:
    "Start a worker. fresh: a clean context with only the brief. " +
    "fork: a copy of your conversation up to now, for work that needs what you know.",
  parameters: obj({ preset: str(), brief: str(), start: union([lit("fresh"), lit("fork")]) }),
  replay: "safe",
  execute: async ({ preset, brief, start }, api, context) => {
    const child = await api.commit(async (tx) => {
      const ownership = { kind: "task", taskId: api.taskId } as const;
      const created = start === "fork"
        ? await tx.forkConversation(api.conversationId, await lastEntry(tx, api), { ownership })
        : await tx.createConversation({ ownership });
      await configure(tx, created.id, presets[preset]);   // model, tools, skills, maxTurns
      return created.id;
    }, context);
    await (await api.conversation(child, context))!
      .submit({ type: "input", content: brief, requestId: \`brief:\${api.taskId}\` }, context);
    return { output: [{ type: "text", text: child }], details: { child, start } };
  },
});`;

const channels = `// Every channel adapter does the same two things.

// 1. In: one message becomes one authored input, or a write that starts nothing.
export const receive = (msg: SlackMessage, root: Conversation, context: Context) =>
  root.submit(
    isMention(msg)
      ? { type: "input", whenBusy: "steer",
          content: \`\${msg.user} (slack \${msg.channel}): \${msg.text}\`,
          entry: { kind: "channel.message", data: origin(msg) },
          requestId: \`slack:\${msg.ts}\` }          // Slack retries never double-submit
      : { type: "write", entry: { kind: "channel.chatter", data: origin(msg) } },
    context,
  );

// 2. Out: the reply tool takes no address. It answers where the message came from.
const reply = defineTool({
  name: "reply",
  parameters: obj({ to: str({ description: "id of the message you answer" }), text: str() }),
  execute: async ({ to, text }, api, context) => {
    const from = await originOf(api, to, context);     // read from the channel.message entry
    await adapters[from.kind].post(from, text);        // same channel, same thread
    return { output: [{ type: "text", text: \`sent to \${from.label}\` }] };
  },
});`;

const narrator = `// A cheap model tells the story; nothing it writes reaches the agent's context.
export const Narrate = defineTask<{ every: number }, { phase: "wait" } | { phase: "tell" }, null>({
  name: "app.narrate", version: 1,
  initial: () => ({ phase: "wait" }),
  phases: {
    wait: (task, runtime, context) =>
      runtime.sleepUntil(runtime.now() + task.input.every, { phase: "tell" }, context),
    tell: async (task, runtime, context) => {
      const window = await entriesSinceLastChunk(runtime, context);
      const text = window.quiet ? undefined : await summarize("claude-haiku-5-5", window, {
        voice: "spoken English, no code, no tool payloads, name the workers",
      });
      await runtime.commit(async (tx) => {
        if (text) (await tx.doc(Narration, runtime.conversationId)).chunks.push({ ...window.span, text });
        // The sleep is stored with the chunk: a restart neither loses nor repeats one.
        return { status: "sleeping", until: runtime.now() + task.input.every, checkpoint: { phase: "tell" } };
      }, context);
    },
  },
  abort: (_task, runtime, context) =>
    runtime.commit(() => ({ status: "terminal", outcome: { status: "aborted" } }), context),
});
// Milestones and failed items don't wait for the clock: an afterTool hook on
// plan_complete_milestone and plan_fail_item starts a "tell" at once.
// Audio is rendered from the text on first play.`;

const blocks = [
  { title: "plan.ts", tag: "Q2 · the plan document and its tools", code: plan, lang: "ts" },
  { title: "spawn.ts", tag: "The manager picks fresh or fork", code: spawn, lang: "ts" },
  { title: "channels.ts", tag: "Q4 · in from anywhere, reply to origin", code: channels, lang: "ts" },
  { title: "narrator.ts", tag: "Q3 · every 5 minutes and at events", code: narrator, lang: "ts" },
];
const html = await Promise.all(blocks.map((b) => highlight(b.code, b.lang)));

export const Dx = () => (
  <Shell active="" crumbs={["support-desk", "Developer view"]}>
    <div className="page page--wide">
      <header className="page-head">
        <div className="page-title"><h1>What a developer writes</h1><p>Four small extensions on Pi Durable 1.5.2 give the console its plan, its fleet, its channels and its narration. Presets pick them up like any other extension. Helpers such as lastEntry, configure and summarize are yours.</p></div>
      </header>
      <div className="dx-grid">
        {blocks.map((b, i) => (
          <Widget key={b.title}>
            <Widget.Header className="row-head"><Widget.Title>{b.tag}</Widget.Title><Chip size="sm" variant="soft">{b.title}</Chip></Widget.Header>
            <Widget.Content><Code title={b.title} code={b.code} html={html[i]} /></Widget.Content>
          </Widget>
        ))}
      </div>
    </div>
  </Shell>
);
