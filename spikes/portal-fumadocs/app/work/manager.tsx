// A manager's conversation: you talk to it, it asks you lettered questions and for approvals, and system lines show
// every thread it starts or ends. Threads and tasks link out; operations link back to the portal.
import { Alert, Button, Card, Chip } from "@heroui/react";
import { CircleCheck, CircleXmark, Pulse, Thunderbolt } from "@gravity-ui/icons";
import { ChatConversation, ChatLoader, ChatMessage, ChatMessageActions, ItemCard, PromptInput, PromptSuggestion, RadioButtonGroup, TextShimmer } from "@heroui-pro/react";
import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { conversations, quick, type Msg } from "./conversation.ts";
import { missionOf, missions, runOf, runsOf, taskOf, tasksOf, workerOf } from "./fixtures.ts";
import { HeadLink, Orb, WorkShell, runTitle } from "./shell.tsx";

export function meta() { return [{ title: "Manager · acme work" }]; }

/** An operation name anywhere in work links to its page in the portal. */
export const OpLink = ({ subject }: { subject: string }) =>
  <Link to={subject.includes(".") ? `/operations/${subject}` : `/things/${subject}`} className="font-medium text-accent hover:underline">{subject}</Link>;

/** A thread or task a system line points at: a HeroUI Chip inside a router link. */
const RefChip = ({ to, children }: { to: string; children: ReactNode }) =>
  <Link to={to}><Chip size="sm" variant="secondary" color="accent">{children}</Chip></Link>;

const Manager = ({ children, actions }: { children: ReactNode; actions?: ReactNode }) => (
  <ChatMessage.Assistant>
    <ChatMessage.Avatar alt="Manager" fallback="M" show />
    <ChatMessage.Body>{children}{actions}</ChatMessage.Body>
  </ChatMessage.Assistant>);

const Actions = ({ text }: { text: string }) => (
  <ChatMessageActions>
    <ChatMessageActions.Copy onPress={() => void navigator.clipboard?.writeText(text)} />
    <ChatMessageActions.Regenerate />
  </ChatMessageActions>);

function Choice({ m }: { m: Extract<Msg, { kind: "choice" }> }) {
  const [picked, setPicked] = useState(m.picked);
  return (
    <Manager>
      <Card variant="secondary" className="w-full max-w-xl">
        <Card.Header><Card.Description>From the blueprint: {m.from}</Card.Description><Card.Title>{m.question}</Card.Title></Card.Header>
        <Card.Content>
          <RadioButtonGroup aria-label={m.question} value={picked} onChange={setPicked} layout="grid" className="grid-cols-1">
            {m.options.map(([l, t]) => (
              <RadioButtonGroup.Item key={l} value={l}><RadioButtonGroup.ItemContent><span className="text-sm"><b className="mr-2">{l}</b>{t}</span></RadioButtonGroup.ItemContent><RadioButtonGroup.Indicator /></RadioButtonGroup.Item>))}
          </RadioButtonGroup>
        </Card.Content>
      </Card>
    </Manager>);
}

function Approve({ m }: { m: Extract<Msg, { kind: "approve" }> }) {
  const [done, setDone] = useState(m.done);
  return (
    <Manager>
      <Alert status="warning" className="w-full max-w-xl">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{m.title}</Alert.Title><Alert.Description>{m.why}</Alert.Description>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {done ? <Chip size="sm" color={done === "approved" ? "success" : "default"}>{done === "approved" ? "Promoting" : "Not yet"}</Chip> : <>
              <Button size="sm" variant="primary" onPress={() => setDone("approved")}>Promote</Button>
              <Button size="sm" variant="secondary" onPress={() => setDone("not yet")}>Not yet</Button></>}
            <HeadLink to={`/work/t/${m.task}`}>See the task</HeadLink>
          </div>
        </Alert.Content>
      </Alert>
    </Manager>);
}

function Message({ m }: { m: Msg }) {
  switch (m.kind) {
    case "you": return <ChatMessage.User><ChatMessage.Bubble><ChatMessage.Content>{m.text}</ChatMessage.Content></ChatMessage.Bubble></ChatMessage.User>;
    case "manager": return <Manager actions={<Actions text={m.text} />}><ChatMessage.Content>{m.text}</ChatMessage.Content></Manager>;
    case "thinking": return <Manager><ChatMessage.Content><span className="flex items-center gap-2"><ChatLoader.Dots /><TextShimmer className="text-muted text-sm">{m.text}…</TextShimmer></span></ChatMessage.Content></Manager>;
    case "choice": return <Choice m={m} />;
    case "approve": return <Approve m={m} />;
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
  const live = runsOf(m.id).filter((r) => r.status === "running"), all = tasksOf(m.id), closed = all.filter((t) => t.column === "done" || t.column === "proven").length;
  const [sent, setSent] = useState<Msg[]>([]), [draft, setDraft] = useState("");
  const msgs = [...(conversations[m.id] ?? []), ...sent];
  const send = () => { const text = draft.trim(); if (text) { setSent((s) => [...s, { kind: "you", at: "Nov 17 now", text }, { kind: "thinking", at: "Nov 17 now", text: "Reading what you asked" }]); setDraft(""); } };
  return (
    <WorkShell mission={m.id} title={<span className="flex items-center gap-2"><Orb hue={m.hue} size={20} />{m.title}</span>} sub={`Manager · ${closed} of ${all.length} tasks closed · until ${m.until} · started ${m.started}`}
      actions={<><HeadLink to={`/work/m/${m.id}/board`}>Board</HeadLink><HeadLink to={`/things/${m.milestones[0]!.of}`}>{m.milestones[0]!.of} in the portal</HeadLink></>}>
      <div className="flex h-[calc(100dvh-4.5rem)] min-h-0 flex-col">
        {live.length > 0 && <div className="mx-auto w-full max-w-3xl px-6 pt-4">
          <div className="mb-2 text-xs text-muted">Working now</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {live.map((r) => (
              <Link key={r.id} to={`/work/r/${r.id}`} className="min-w-56 flex-1">
                <ItemCard variant="secondary"><ItemCard.Icon><Pulse /></ItemCard.Icon><ItemCard.Content><ItemCard.Title>{runTitle(r)}</ItemCard.Title><ItemCard.Description>{workerOf(r.worker).name} · {r.model}</ItemCard.Description></ItemCard.Content></ItemCard>
              </Link>))}
          </div>
        </div>}
        <ChatConversation className="min-h-0 flex-1">
          <ChatConversation.Content className="px-6 py-6">
            {msgs.map((msg, i) => <div key={i} className="flex flex-col gap-4">
              {(i === 0 || msgs[i - 1]!.at.slice(0, 6) !== msg.at.slice(0, 6)) && <div className="text-center"><Chip size="sm" variant="tertiary">{msg.at.slice(0, 6)}</Chip></div>}
              <Message m={msg} /></div>)}
          </ChatConversation.Content>
          <ChatConversation.ScrollAnchor />
        </ChatConversation>
        <div className="mx-auto w-full max-w-3xl px-6 pb-5">
          <PromptSuggestion className="mb-3"><PromptSuggestion.Items className="flex flex-row flex-wrap gap-2">
            {(quick[m.id] ?? []).map((q) => <PromptSuggestion.Item key={q} className="w-auto rounded-full border border-border px-3 py-1" onPress={() => setDraft(q)}><PromptSuggestion.ItemTitle>{q}</PromptSuggestion.ItemTitle></PromptSuggestion.Item>)}
          </PromptSuggestion.Items></PromptSuggestion>
          <PromptInput value={draft} onValueChange={setDraft} onSubmit={send}>
            <PromptInput.Shell>
              <PromptInput.Content><PromptInput.TextArea placeholder="Tell the manager…" /></PromptInput.Content>
              <PromptInput.Toolbar>
                <PromptInput.ToolbarStart><Chip size="sm" variant="tertiary">claude-opus-5-5</Chip></PromptInput.ToolbarStart>
                <PromptInput.ToolbarEnd><PromptInput.Send /></PromptInput.ToolbarEnd>
              </PromptInput.Toolbar>
            </PromptInput.Shell>
          </PromptInput>
        </div>
      </div>
    </WorkShell>
  );
}
export { taskOf };
