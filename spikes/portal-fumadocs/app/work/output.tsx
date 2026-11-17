// The audit view of a thread, built from HeroUI Pro's AI parts: ChatConversation holds the run; a turn is a ChatMessage
// (Pro Markdown); consecutive tool calls, commands and edits fold into one ChainOfThought; each tool call and command is
// a ChatTool; command output and edits are CodeBlocks (edits as diff). Nothing here is hand-styled beyond layout.
import { Alert } from "@heroui/react";
import { ChainOfThought, ChatConversation, ChatMessage, TextShimmer } from "@heroui-pro/react";
import { ChatTool } from "@heroui-pro/react/chat-tool";
import { CodeBlock } from "@heroui-pro/react/code-block";
import { Markdown } from "@heroui-pro/react/markdown";
import type { ReactNode } from "react";
import type { Run, RunEvent } from "./types.ts";

export const Md = ({ children }: { children: string }) => <Markdown>{children}</Markdown>;

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
export const ms = (n: number) => (n === 0 ? "running" : n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`);
export const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const Code = ({ code, lang, label }: { code: string; lang: string; label: ReactNode }) => (
  <CodeBlock><CodeBlock.Header><span>{label}</span><CodeBlock.CopyButton code={code} /></CodeBlock.Header><CodeBlock.Code code={code} language={lang} /></CodeBlock>
);

function Tool({ e }: { e: Extract<RunEvent, { kind: "tool" }> }) {
  return (
    <ChatTool state={e.ok ? "output-available" : "output-error"} toolName={e.name} defaultExpanded={!e.ok}>
      <ChatTool.Trigger>
        <ChatTool.StatusIcon /><span className="font-mono">{e.name}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{e.args}</span>
        <span className="text-xs text-muted tabular-nums">{e.ok ? ms(e.ms) : `refused · ${ms(e.ms)}`}</span>
      </ChatTool.Trigger>
      <ChatTool.Content>
        <ChatTool.Args input={e.input ?? { path: e.args }} label="Input" />
        {e.error && <ChatTool.Error errorText={e.error} />}
        {e.output && <ChatTool.Result label="Output"><Code code={e.output} lang={e.lang ?? "plaintext"} label={e.lang ?? "output"} /></ChatTool.Result>}
      </ChatTool.Content>
    </ChatTool>);
}

function Command({ e }: { e: Extract<RunEvent, { kind: "command" }> }) {
  const running = e.ms === 0, bad = !running && e.exit !== 0, out = e.out ?? e.tail ?? "";
  return (
    <ChatTool state={running ? "input-available" : bad ? "output-error" : "output-available"} toolName="command" defaultExpanded={bad || running}>
      <ChatTool.Trigger>
        <ChatTool.StatusIcon />{running ? <TextShimmer className="font-mono text-sm">{e.cmd}</TextShimmer> : <span className="min-w-0 truncate font-mono text-sm">{e.cmd}</span>}
        <span className="ml-auto shrink-0 text-xs text-muted tabular-nums">{running ? "running" : `exit ${e.exit} · ${ms(e.ms)}`}</span>
      </ChatTool.Trigger>
      <ChatTool.Content>
        {out ? <Code code={out} lang="plaintext" label={running ? "terminal · running" : `terminal · exit ${e.exit} · ${ms(e.ms)}`} /> : <span className="text-sm text-muted">No output yet.</span>}
      </ChatTool.Content>
    </ChatTool>);
}

function Edit({ e }: { e: Extract<RunEvent, { kind: "edit" }> }) {
  const label = <span className="font-mono">{e.file} <span className="text-success">+{e.added}</span> <span className="text-danger">-{e.removed}</span></span>;
  return e.diff ? <Code code={e.diff} lang="diff" label={label} /> : <CodeBlock><CodeBlock.Header>{label}</CodeBlock.Header><CodeBlock.Code code="The diff is kept in the run's checkpoint." language="plaintext" /></CodeBlock>;
}

const Step = ({ e }: { e: RunEvent }) => e.kind === "tool" ? <Tool e={e} /> : e.kind === "command" ? <Command e={e} /> : e.kind === "edit" ? <Edit e={e} /> : null;
const isStep = (e: RunEvent) => e.kind === "tool" || e.kind === "command" || e.kind === "edit";

type Item = { type: "steps"; evs: Array<[number, RunEvent]> } | { type: "one"; i: number; e: RunEvent };
function group(events: Array<[number, RunEvent]>): Item[] {
  const out: Item[] = [];
  for (const [i, e] of events) {
    const last = out[out.length - 1];
    if (isStep(e)) { if (last?.type === "steps") last.evs.push([i, e]); else out.push({ type: "steps", evs: [[i, e]] }); } else out.push({ type: "one", i, e });
  }
  return out;
}

function One({ e }: { e: RunEvent }) {
  if (e.kind === "turn") return (
    <ChatMessage.Assistant>
      <ChatMessage.Avatar alt="Agent" fallback="AI" show />
      <ChatMessage.Body>
        <ChatMessage.Content><Markdown>{e.text}</Markdown></ChatMessage.Content>
        <div className="flex gap-3 text-xs text-muted tabular-nums"><span>turn {e.n}</span><span>{k(e.tokensIn)} in, {k(e.cached)} cached</span><span>{k(e.tokensOut)} out</span></div>
      </ChatMessage.Body>
    </ChatMessage.Assistant>);
  if (e.kind === "report") return (
    <Alert status={e.report === "failed" || e.report === "blocked" ? "danger" : e.report === "ready" ? "success" : "accent"}>
      <Alert.Indicator /><Alert.Content><Alert.Title>Reported {e.report}</Alert.Title><Alert.Description>{e.text}</Alert.Description></Alert.Content>
    </Alert>);
  if (e.kind === "resume") return <Alert status="warning"><Alert.Indicator /><Alert.Content><Alert.Title>Resumed</Alert.Title><Alert.Description>{e.text}</Alert.Description></Alert.Content></Alert>;
  return null;
}

/** The events in order; each keeps its index in the run as its anchor (`ev-<i>`), so the narration can jump to it. */
export function Transcript({ run, events, flash }: { run: Run; events: Array<[number, RunEvent]>; flash?: number | null }) {
  const items = group(events), live = run.status === "running" && events.at(-1)?.[0] === run.events.length - 1;
  const hot = (i: number) => (flash === i ? "rounded-xl bg-accent-soft transition-colors" : "transition-colors duration-700");
  return (
    <ChatConversation className="max-h-none overflow-visible">
      <ChatConversation.Content>
        {items.map((it, n) => it.type === "one"
          ? <div key={it.i} id={`ev-${it.i}`} className={`scroll-mt-24 ${hot(it.i)}`}><One e={it.e} /></div>
          : (
            <ChainOfThought key={it.evs[0]![0]} defaultExpanded isStreaming={live && n === items.length - 1}>
              <ChainOfThought.Trigger>{it.evs.length} step{it.evs.length === 1 ? "" : "s"}, {clock(it.evs[0]![1].at)} to {clock(it.evs.at(-1)![1].at)}</ChainOfThought.Trigger>
              <ChainOfThought.Content><ChainOfThought.Steps>
                {it.evs.map(([i, e]) => <ChainOfThought.Step key={i} id={`ev-${i}`} label={clock(e.at)} className={`scroll-mt-24 ${hot(i)}`}><Step e={e} /></ChainOfThought.Step>)}
              </ChainOfThought.Steps></ChainOfThought.Content>
            </ChainOfThought>))}
        {live && <ChatMessage.Assistant><ChatMessage.Avatar alt="Agent" fallback="AI" show /><ChatMessage.Body><TextShimmer className="text-sm">Working on the next step...</TextShimmer></ChatMessage.Body></ChatMessage.Assistant>}
      </ChatConversation.Content>
    </ChatConversation>);
}
