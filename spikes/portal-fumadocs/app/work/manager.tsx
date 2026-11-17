// A manager's conversation: you talk to it, it asks you questions and for approvals, and system lines show every thread
// it starts or ends. Only HeroUI Pro chat parts: messages, a tool call for each promote, and the prompt input.
import { Chip } from "@heroui/react";
import { CircleCheck, CircleXmark, Thunderbolt } from "@gravity-ui/icons";
import { ChatConversation, ChatLoader, ChatMessage, ChatMessageActions, PromptInput, TextShimmer } from "@heroui-pro/react";
import { ChatTool } from "@heroui-pro/react/chat-tool";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { conversations, type Msg } from "./conversation.ts";
import { missionOf, missions, runOf, tasksOf, taskOf } from "./fixtures.ts";
import { Md } from "./output.tsx";
import { HeadLink, Orb, WorkShell } from "./shell.tsx";

export function meta() { return [{ title: "Manager · acme work" }]; }

/** An operation name anywhere in work links to its page in the portal. */
export const OpLink = ({ subject }: { subject: string }) =>
  <Link to={subject.includes(".") ? `/operations/${subject}` : `/things/${subject}`} className="font-medium text-accent hover:underline">{subject}</Link>;

const RefChip = ({ to, children }: { to: string; children: ReactNode }) =>
  <Link to={to}><Chip size="sm" variant="secondary" color="accent">{children}</Chip></Link>;

const Manager = ({ text, children }: { text?: string; children: ReactNode }) => (
  <ChatMessage.Assistant>
    <ChatMessage.Avatar alt="Manager" fallback="M" show />
    <ChatMessage.Body>
      {children}
      {text && <ChatMessageActions><ChatMessageActions.Copy onPress={() => void navigator.clipboard?.writeText(text)} /></ChatMessageActions>}
    </ChatMessage.Body>
  </ChatMessage.Assistant>);

const You = ({ text }: { text: string }) =>
  <ChatMessage.User><ChatMessage.Bubble><ChatMessage.Content>{text}</ChatMessage.Content></ChatMessage.Bubble></ChatMessage.User>;

/** A question is an ordinary message: the question, its lettered answers, and where in the blueprint it came from. */
const question = (m: Extract<Msg, { kind: "choice" }>) =>
  `**${m.question}**\n\n${m.options.map(([l, t]) => `- **${l}** ${t}`).join("\n")}\n\n*From the blueprint: ${m.from}*`;

/** A promote is a tool call that waits for your yes. */
function Promote({ m }: { m: Extract<Msg, { kind: "approve" }> }) {
  const [done, setDone] = useState(m.done);
  const input = { task: m.task, to: "production", why: m.why };
  return (
    <Manager>
      <ChatMessage.Content>{m.title}</ChatMessage.Content>
      <ChatTool toolName="promote" triggerPrefix="Wants to run: " input={input} defaultExpanded
        state={done === "approved" ? "output-available" : done === "not yet" ? "output-error" : "requires-action"}
        output={done === "approved" ? { promoting: m.task } : undefined} errorText={done === "not yet" ? "You said not yet." : undefined}
        approveLabel="Promote" rejectLabel="Not yet" onApprove={() => setDone("approved")} onReject={() => setDone("not yet")} />
    </Manager>);
}

function Message({ m }: { m: Msg }) {
  switch (m.kind) {
    case "you": return <You text={m.text} />;
    case "manager": return <Manager text={m.text}><ChatMessage.Content><Md>{m.text}</Md></ChatMessage.Content></Manager>;
    case "thinking": return <Manager><span className="flex items-center gap-2"><ChatLoader.Dots /><TextShimmer className="text-sm text-muted">{m.text}…</TextShimmer></span></Manager>;
    case "choice": { const q = question(m), a = m.options.find(([l]) => l === m.picked); return (<>
      <Manager text={q}><ChatMessage.Content><Md>{q}</Md></ChatMessage.Content></Manager>
      {a && <You text={`${a[0]}. ${a[1]}`} />}</>); }
    case "approve": return <Promote m={m} />;
    case "system": {
      const Icon = m.tone === "bad" ? CircleXmark : m.tone === "good" ? CircleCheck : Thunderbolt;
      return (
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
          <Chip size="sm" variant="soft" color={m.tone === "bad" ? "danger" : m.tone === "good" ? "success" : "default"}><Icon className="size-3" />{m.text}</Chip>
          {m.run && <RefChip to={`/work/r/${runOf(m.run)?.id ?? m.run}`}>thread {m.run}</RefChip>}
          {m.task && <RefChip to={`/work/t/${m.task}`}>task {m.task}</RefChip>}
        </div>);
    }
  }
}

export default function ManagerPage() {
  const m = missionOf(useParams().mission ?? "") ?? missions[0]!;
  const all = tasksOf(m.id), closed = all.filter((t) => t.column === "done" || t.column === "proven").length;
  const [sent, setSent] = useState<Msg[]>([]), [draft, setDraft] = useState("");
  const msgs = [...(conversations[m.id] ?? []), ...sent];
  const send = () => { const text = draft.trim(); if (text) { setSent((s) => [...s, { kind: "you", at: "Nov 17 now", text }, { kind: "thinking", at: "Nov 17 now", text: "Reading what you asked" }]); setDraft(""); } };
  return (
    <WorkShell mission={m.id} title={<span className="flex items-center gap-2"><Orb hue={m.hue} size={20} />{m.title}</span>} sub={`Manager · ${closed} of ${all.length} tasks closed · until ${m.until} · started ${m.started}`}
      actions={<><HeadLink to={`/work/m/${m.id}/board`}>Board</HeadLink><HeadLink to={`/things/${m.milestones[0]!.of}`}>{m.milestones[0]!.of} in the portal</HeadLink></>}>
      <div className="flex h-[calc(100dvh-4.5rem)] min-h-0 flex-col">
        <ChatConversation className="min-h-0 flex-1">
          <ChatConversation.Content className="mx-auto w-full max-w-3xl px-6 py-6">
            {msgs.map((msg, i) => <div key={i} className="flex flex-col gap-4">
              {(i === 0 || msgs[i - 1]!.at.slice(0, 6) !== msg.at.slice(0, 6)) && <div className="text-center"><Chip size="sm" variant="tertiary">{msg.at.slice(0, 6)}</Chip></div>}
              <Message m={msg} /></div>)}
          </ChatConversation.Content>
          <ChatConversation.ScrollAnchor />
        </ChatConversation>
        <div className="mx-auto w-full max-w-3xl px-6 pb-5">
          <PromptInput value={draft} onValueChange={setDraft} onSubmit={send}>
            <PromptInput.Shell>
              <PromptInput.Content><PromptInput.TextArea placeholder="Tell the manager…" /></PromptInput.Content>
              <PromptInput.Toolbar><PromptInput.ToolbarEnd><PromptInput.Send /></PromptInput.ToolbarEnd></PromptInput.Toolbar>
            </PromptInput.Shell>
          </PromptInput>
        </div>
      </div>
    </WorkShell>
  );
}
export { taskOf };
