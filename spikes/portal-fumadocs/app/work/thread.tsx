// One thread: a run's own conversation, read-only. Its numbers on top; then every model turn, tool call, command, edit,
// report and resume in order, filterable down to the commands or the failures. To change a run you talk to its manager.
import { useState } from "react";
import { Link, useParams } from "react-router";
import { missionOf, runOf, runs, taskOf, workerOf } from "./fixtures.ts";
import { Kpi, KpiGroup } from "./kpi.tsx";
import { OpLink } from "./manager.tsx";
import { HeadLink, RunStatus, TYPE_TONE, WorkShell, runTitle } from "./shell.tsx";
import type { Run, RunEvent } from "./types.ts";

export function meta() { return [{ title: "Thread · acme work" }]; }
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const ms = (n: number) => (n === 0 ? "running" : n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`);
const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export function runStats(r: Run) {
  const turns = r.events.filter((e) => e.kind === "turn"), tools = r.events.filter((e) => e.kind === "tool"), cmds = r.events.filter((e) => e.kind === "command");
  const tin = turns.reduce((a, e) => a + e.tokensIn, 0), cached = turns.reduce((a, e) => a + e.cached, 0);
  return { turns: turns.length, tokensIn: tin, tokensOut: turns.reduce((a, e) => a + e.tokensOut, 0), cachePct: tin ? Math.round((cached / tin) * 100) : 0,
    tools: tools.length, toolFails: tools.filter((e) => !e.ok).length, cmds: cmds.length, cmdFails: cmds.filter((e) => e.exit !== 0).length,
    resumes: r.events.filter((e) => e.kind === "resume").length, perTurn: turns.map((e) => e.tokensIn) };
}

const failed = (e: RunEvent) => (e.kind === "tool" && !e.ok) || (e.kind === "command" && e.exit !== 0) || (e.kind === "report" && (e.report === "failed" || e.report === "blocked"));
const FILTERS = { all: () => true, commands: (e: RunEvent) => e.kind === "command", tools: (e: RunEvent) => e.kind === "tool", edits: (e: RunEvent) => e.kind === "edit", failures: failed } as const;

function Event({ e }: { e: RunEvent }) {
  const at = <span className="w-10 shrink-0 pt-0.5 text-right font-mono text-xs text-fd-muted-foreground">{clock(e.at)}</span>;
  switch (e.kind) {
    case "turn": return <div className="flex gap-3">{at}<div className="flex-1 leading-relaxed">{e.text}<div className="mt-1 text-xs text-fd-muted-foreground">turn {e.n} · {k(e.tokensIn)} in ({k(e.cached)} cached) · {k(e.tokensOut)} out</div></div></div>;
    case "tool": return <div className="flex gap-3">{at}<div className={`flex-1 rounded-xl border px-3 py-1.5 text-sm ${e.ok ? "border-fd-border" : "border-red-500/50 bg-red-500/5"}`}>
      <span className="font-mono">{e.name}</span> <span className="text-fd-muted-foreground">{e.args}</span><span className="float-right text-xs text-fd-muted-foreground">{e.ok ? "✓" : "✘"} {ms(e.ms)}</span>
      {e.error && <div className="text-xs text-red-600 dark:text-red-400">{e.error}</div>}</div></div>;
    case "command": return <div className="flex gap-3">{at}<div className="flex-1 overflow-hidden rounded-xl bg-zinc-950 font-mono text-xs text-zinc-200">
      <div className="flex justify-between gap-2 px-3 py-2"><span><span className="text-zinc-500">$ </span>{e.cmd}</span><span className={e.ms === 0 ? "text-sky-400" : e.exit === 0 ? "text-emerald-400" : "text-red-400"}>{e.ms === 0 ? "running…" : `exit ${e.exit} · ${ms(e.ms)}`}</span></div>
      {e.tail && <div className="border-t border-zinc-800 px-3 py-1.5 text-zinc-400">{e.tail}</div>}</div></div>;
    case "edit": return <div className="flex gap-3">{at}<div className="rounded-lg border border-fd-border px-2.5 py-1 font-mono text-xs">✎ {e.file} <span className="text-emerald-500">+{e.added}</span> <span className="text-red-500">−{e.removed}</span></div></div>;
    case "report": return <div className="flex gap-3">{at}<div className={`rounded-full px-3 py-1 text-xs ${e.report === "failed" || e.report === "blocked" ? "bg-red-500/10 text-red-600" : e.report === "ready" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-fd-muted"}`}>reports {e.report}: {e.text}</div></div>;
    case "resume": return <div className="flex gap-3">{at}<div className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-400">↻ {e.text}</div></div>;
  }
}

export default function Thread() {
  const r = runOf(useParams().run ?? "") ?? runs[0]!, task = taskOf(r.task)!, m = missionOf(task.mission)!, w = workerOf(r.worker), s = runStats(r);
  const [f, setF] = useState<keyof typeof FILTERS>("all");
  const shown = r.events.filter(FILTERS[f]);
  return (
    <WorkShell mission={m.id} title={<span className="flex items-center gap-2"><RunStatus s={r.status} />{runTitle(r)}</span>}
      sub={<span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: TYPE_TONE[r.worker] }} />{w.name} · {r.model} · {r.id} · started {r.started} · for {m.title}</span>}
      actions={<><HeadLink to={`/work/m/${m.id}`}>Manager</HeadLink><HeadLink to={`/work/t/${task.id}`}>Task</HeadLink>{task.subject.includes(".") && <HeadLink to={`/operations/${task.subject}`}>{task.subject} in the portal</HeadLink>}</>}>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
        <KpiGroup cols={4}>
          <Kpi icon="⏱" title="Time · cost" value={clock(r.seconds)} of={`$${r.costUsd.toFixed(2)} of $${w.budgetUsd}`} progress={(r.costUsd / w.budgetUsd) * 100} tone={r.costUsd / w.budgetUsd > 0.8 ? "warn" : undefined} footer={`budget from ${w.file}`} />
          <Kpi icon="◇" title="Tokens" value={k(s.tokensIn + s.tokensOut)} of={`${s.turns} turns`} spark={s.perTurn} footer={`${s.cachePct}% of input from cache · ${k(s.tokensOut)} out`} />
          <Kpi icon="⚒" title="Tool calls failed" value={s.toolFails} of={`of ${s.tools}`} tone={s.toolFails ? "bad" : undefined} footer={s.toolFails ? "refused by the grant or a schema" : "none refused"} />
          <Kpi icon="$" title="Commands failed" value={s.cmdFails} of={`of ${s.cmds}`} tone={s.cmdFails ? "warn" : undefined} footer={`${s.resumes} resume${s.resumes === 1 ? "" : "s"} · sandbox ${r.sandboxUp ? "up" : "gone"} (${r.sandbox})`} />
        </KpiGroup>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(FILTERS) as Array<keyof typeof FILTERS>).map((x) => <button key={x} onClick={() => setF(x)} className={`rounded-full px-3 py-1 text-sm ${f === x ? "bg-fd-primary text-fd-primary-foreground" : "border border-fd-border"}`}>{x} <span className="opacity-70">{r.events.filter(FILTERS[x]).length}</span></button>)}
          <span className="ml-auto text-xs text-fd-muted-foreground">Working on <OpLink subject={task.subject} /> · grant: {w.tools.join(", ")}</span>
        </div>
        <div className="flex flex-col gap-3">{shown.length ? shown.map((e, i) => <Event key={i} e={e} />) : <p className="text-fd-muted-foreground">Nothing recorded in detail for this run.</p>}</div>
        <div className="rounded-2xl border border-dashed border-fd-border px-4 py-3 text-sm text-fd-muted-foreground">Threads are read-only. To change this run, <Link to={`/work/m/${m.id}`} className="text-fd-primary hover:underline">tell its manager</Link>.</div>
      </div>
    </WorkShell>
  );
}
