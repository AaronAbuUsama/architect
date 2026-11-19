// The live rail (Q6 A): scoped to the page. And the two drawers that take its place: the trace and the chat.
import { Xmark } from "@gravity-ui/icons";
import { Button, Chip } from "@heroui/react";
import { ChatConversation, ChatMessage, PromptInput } from "@heroui-pro/react";
import { ChatTool } from "@heroui-pro/react/chat-tool";
import type { ReactNode } from "react";
import { callTotal, lastCalls, perMinute, spine, type Stat } from "./data.ts";
import { StatBlock } from "./parts.tsx";
import { Waterfall } from "./spine.tsx";

const Panel = ({ title, sub, onClose, children }: { title: ReactNode; sub?: ReactNode; onClose?: () => void; children: ReactNode }) => (
  <div className="flex h-full flex-col gap-3 overflow-auto border-l border-border bg-surface p-4">
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{title}</div>{sub && <div className="text-xs text-muted">{sub}</div>}</div>
      {onClose && <Button isIconOnly size="sm" variant="ghost" aria-label="Close" onPress={onClose}><Xmark /></Button>}
    </div>
    {children}
  </div>
);

const tone = (o: string) => o === "answered" ? "success" : o === "NotAllowed" || o === "HandleTaken" ? "warning" : "danger";

export function Rail({ scope, stat, runs }: { scope: string; stat: Stat; runs?: boolean }) {
  return (
    <Panel title={<span className="flex items-center gap-2"><span className="size-2 animate-pulse rounded-full bg-success" />local · last 30 min</span>} sub={`scope: ${scope}`}>
      <StatBlock stat={stat} spark={perMinute} columns={2} />
      <div>
        <div className="mb-1 text-xs font-medium text-muted">Last calls</div>
        <ul className="divide-y divide-border text-xs">
          {lastCalls.map((c) => (
            <li key={c.at} className="flex items-center gap-2 py-1.5 tabular-nums">
              <span className="text-muted">{c.at}</span><span className="font-medium">{c.verb}</span><span className="text-muted">{c.who}</span>
              <span className="ml-auto"><Chip size="sm" color={tone(c.outcome)} variant="soft">{c.outcome}</Chip></span>
              <span className="w-10 text-right text-muted">{c.ms} ms</span>
            </li>))}
        </ul>
      </div>
      {runs && <div>
        <div className="mb-1 text-xs font-medium text-muted">Runs touching handle</div>
        <div className="rounded-lg border border-border p-2 text-xs"><span className="mr-1 inline-block size-2 animate-pulse rounded-full bg-accent" />
          <span className="font-medium">builder</span> · "add a reserved-names list" · running 3 min</div>
      </div>}
    </Panel>
  );
}

export function TraceDrawer({ onClose }: { onClose: () => void }) {
  return (
    <Panel title="handle.claim · call 7f3a…" sub={`ada · 12:04:31 · attempt 2 · ${callTotal} ms`} onClose={onClose}>
      <Waterfall rows={spine} total={callTotal} />
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-surface-secondary p-3 text-xs">
        {[["principal", "person:ada"], ["payload.name", "ada"], ["answer.handle", "hdl_8Kq2…"], ["move.name", "claim"], ["move.to", "claimed"],
          ["attempt", "2"], ["commit.writes", "2"], ["commit.outcome", "committed"], ["request key", "rk_19c…"]].map(([k, v]) => (
          <div key={k} className="contents"><span className="text-muted">{k}</span><span className="font-mono">{v}</span></div>))}
      </div>
      <p className="text-xs text-muted">Private fields and untraced free text are never shown.</p>
    </Panel>
  );
}

export function ChatDrawer({ onClose }: { onClose: () => void }) {
  return (
    <Panel title="Chat · on handle.claim" sub="local · last 30 min · trace 7f3a… open" onClose={onClose}>
      <div className="flex items-center gap-2 text-xs"><span className="text-muted">to</span>
        <Chip size="sm" variant="secondary">assistant ▾</Chip><span className="text-muted">assistant · builder · reviewer · designer</span></div>
      <ChatConversation className="min-h-0 flex-1">
        <ChatConversation.Content className="flex flex-col gap-3">
          <ChatMessage.User><ChatMessage.Bubble><ChatMessage.Content>Why did this claim need two attempts?</ChatMessage.Content></ChatMessage.Bubble></ChatMessage.User>
          <ChatMessage.Assistant>
            <ChatMessage.Avatar alt="assistant" fallback="A" show />
            <ChatMessage.Body>
              <ChatMessage.Content>Another claim committed between this call's lookup and its write, so attempt 1 lost the version race and the commit re-ran. That's by design: a name is claimed once.</ChatMessage.Content>
              <ChatTool toolName="handle.resolve" triggerPrefix="Called " input={{ name: "ada" }} state="output-available" output={{ handle: "hdl_8Kq2…", owner: "person:ada" }} />
              <ChatMessage.Content>Shall I keep that as a note on handle?</ChatMessage.Content>
              <ChatTool toolName="note.write" triggerPrefix="Wants to run: " defaultExpanded state="requires-action"
                input={{ on: "handle", body: "claim retries once on a version race; that's by design" }}
                approveLabel="Approve" rejectLabel="Reject" onApprove={() => {}} onReject={() => {}} />
            </ChatMessage.Body>
          </ChatMessage.Assistant>
        </ChatConversation.Content>
      </ChatConversation>
      <PromptInput value="" onValueChange={() => {}} onSubmit={() => {}}>
        <PromptInput.Shell>
          <PromptInput.Content><PromptInput.TextArea placeholder="Ask about this page…" /></PromptInput.Content>
          <PromptInput.Toolbar><PromptInput.ToolbarEnd><PromptInput.Send /></PromptInput.ToolbarEnd></PromptInput.Toolbar>
        </PromptInput.Shell>
      </PromptInput>
    </Panel>
  );
}
