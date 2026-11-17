// How an agent's output is drawn, for auditing: the model's words as Markdown (Streamdown), each tool call as a folding
// card with its input and output, commands as a terminal, edits as a highlighted diff (Shiki through Streamdown's code
// plugin). The frame is HeroUI; nothing here is styled by Fumadocs.
import { Chip, Disclosure } from "@heroui/react";
import { code } from "@streamdown/code";
import type { ReactNode } from "react";
import { Streamdown } from "streamdown";
import type { RunEvent } from "./types.ts";

const plugins = { code };
export const Md = ({ children }: { children: string }) => (
  <Streamdown mode="static" plugins={plugins} shikiTheme={["github-light", "github-dark"]} controls={{ code: true, table: false, mermaid: false }} className="text-[15px] leading-relaxed [&_code]:text-[13px]">{children}</Streamdown>
);
const fence = (lang: string, body: string) => `\`\`\`${lang}\n${body}\n\`\`\``;

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
export const ms = (n: number) => (n === 0 ? "running" : n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`);
export const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/** One row of the transcript: time on the left, a marker on the rail, the content on the right. */
function Row({ at, dot, children }: { at: number; dot: string; children: ReactNode }) {
  return (
    <div className="relative grid grid-cols-[3rem_1.25rem_1fr] gap-x-2">
      <span className="pt-2.5 text-right font-mono text-xs text-muted tabular-nums">{clock(at)}</span>
      <span className="relative flex justify-center"><span className="absolute inset-y-0 w-px bg-separator" /><span className={`relative mt-3 size-2.5 rounded-full ring-4 ring-background ${dot}`} /></span>
      <div className="min-w-0 pb-4">{children}</div>
    </div>
  );
}

function Folding({ head, children, open, danger }: { head: ReactNode; children: ReactNode; open?: boolean; danger?: boolean }) {
  return (
    <Disclosure defaultExpanded={open} className={`overflow-hidden rounded-xl border bg-surface ${danger ? "border-danger/50" : "border-border"}`}>
      <Disclosure.Heading><Disclosure.Trigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-secondary">{head}<Disclosure.Indicator className="ml-1 text-muted" /></Disclosure.Trigger></Disclosure.Heading>
      <Disclosure.Content><Disclosure.Body className="border-t border-separator px-3 py-2">{children}</Disclosure.Body></Disclosure.Content>
    </Disclosure>
  );
}

const Label = ({ children }: { children: ReactNode }) => <div className="mb-1 mt-1 text-xs font-medium uppercase tracking-wide text-muted">{children}</div>;

export function Output({ e }: { e: RunEvent }) {
  switch (e.kind) {
    case "turn": return (
      <Row at={e.at} dot="bg-foreground/70">
        <div className="pt-1"><Md>{e.text}</Md></div>
        <div className="mt-1 flex gap-3 text-xs text-muted tabular-nums"><span>turn {e.n}</span><span>{k(e.tokensIn)} in · {k(e.cached)} cached</span><span>{k(e.tokensOut)} out</span></div>
      </Row>);
    case "tool": return (
      <Row at={e.at} dot={e.ok ? "bg-accent" : "bg-danger"}>
        <Folding danger={!e.ok} open={!e.ok} head={<>
          <Chip size="sm" variant="soft" color={e.ok ? "default" : "danger"}><span className="font-mono">{e.name}</span></Chip>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{e.args}</span>
          <Chip size="sm" variant="soft" color={e.ok ? "success" : "danger"}>{e.ok ? "ok" : "refused"}</Chip>
          <span className="w-14 text-right text-xs text-muted tabular-nums">{ms(e.ms)}</span></>}>
          {e.error && <div className="mb-2 rounded-lg bg-danger-soft px-2.5 py-1.5 text-sm text-danger-soft-foreground">{e.error}</div>}
          <Label>Input</Label><Md>{fence("json", JSON.stringify(e.input ?? { path: e.args }, null, 2))}</Md>
          {e.output && <><Label>Output</Label><Md>{fence(e.lang ?? "text", e.output)}</Md></>}
        </Folding>
      </Row>);
    case "command": { const running = e.ms === 0, bad = !running && e.exit !== 0; return (
      <Row at={e.at} dot={running ? "bg-accent animate-pulse" : bad ? "bg-danger" : "bg-success"}>
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-[13px] text-zinc-200">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2">
            <span className="flex gap-1"><span className="size-2.5 rounded-full bg-zinc-700" /><span className="size-2.5 rounded-full bg-zinc-700" /><span className="size-2.5 rounded-full bg-zinc-700" /></span>
            <span className="min-w-0 flex-1 truncate"><span className="text-emerald-400">❯ </span>{e.cmd}</span>
            <span className={`rounded-md px-1.5 py-0.5 text-xs ${running ? "bg-sky-500/15 text-sky-300" : bad ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>{running ? "running…" : `exit ${e.exit} · ${ms(e.ms)}`}</span>
          </div>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap px-3 py-2 leading-relaxed">{(e.out ?? e.tail ?? "").split("\n").map((l, i) => <div key={i} className={l.startsWith("✘") ? "text-red-300" : l.startsWith("✓") ? "text-emerald-300" : /^\s+(expected|received)/.test(l) ? "text-zinc-400" : ""}>{l || " "}</div>)}</pre>
        </div>
      </Row>); }
    case "edit": return (
      <Row at={e.at} dot="bg-warning">
        <Folding open={!!e.diff} head={<><span className="font-mono text-xs">✎ {e.file}</span><span className="ml-auto font-mono text-xs"><span className="text-success">+{e.added}</span> <span className="text-danger">−{e.removed}</span></span></>}>
          {e.diff ? <Md>{fence("diff", e.diff)}</Md> : <span className="text-sm text-muted">The diff is kept in the run's checkpoint.</span>}
        </Folding>
      </Row>);
    case "report": { const bad = e.report === "failed" || e.report === "blocked"; return (
      <Row at={e.at} dot={bad ? "bg-danger" : e.report === "ready" ? "bg-success" : "bg-accent"}>
        <div className={`rounded-xl px-3 py-2 text-sm ${bad ? "bg-danger-soft text-danger-soft-foreground" : e.report === "ready" ? "bg-success-soft text-success-soft-foreground" : "bg-accent-soft text-accent-soft-foreground"}`}><span className="font-medium">Reported {e.report}.</span> {e.text}</div>
      </Row>); }
    case "resume": return (
      <Row at={e.at} dot="bg-warning"><div className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">↻ {e.text}</div></Row>);
  }
}

/** The events in order; each keeps its index in the run as its anchor, so the narration can jump to it. */
export const Transcript = ({ events, flash }: { events: Array<[number, RunEvent]>; flash?: number | null }) => (
  <ol className="flex flex-col">{events.map(([i, e]) => <li key={i} id={`ev-${i}`} className={`scroll-mt-24 rounded-xl transition-colors duration-700 ${flash === i ? "bg-accent-soft" : ""}`}><Output e={e} /></li>)}</ol>
);
