// A mission's board: how it is going in aggregate (numbers that say better or worse, a burn-down), then the tasks by
// column. Every column comes from facts, so there is no dragging; a card opens its task.
import { Link, useParams } from "react-router";
import { missionOf, missions, runOf, runs, runsOf, tasksOf, workerOf, workers } from "./fixtures.ts";
import { BurnDown, Kpi, KpiGroup, Widget } from "./kpi.tsx";
import { HeadLink, Orb, TYPE_TONE, WorkShell } from "./shell.tsx";
import { runStats } from "./thread.tsx";
import type { Column, Task } from "./types.ts";

export function meta() { return [{ title: "Board · acme work" }]; }
const COLS: Array<[Column, string, string]> = [["open", "Open", "○"], ["running", "Running", "▶"], ["waiting", "Waits on you", "!"], ["proven", "Proven", "✓"], ["done", "Done", "●"]];
const last = (xs: number[]) => xs[xs.length - 1]!, prev = (xs: number[]) => xs[xs.length - 2]!;
const pct = (n: number) => `${Math.round(n)}%`;
const kindTone = (t: Task) => ({ specify: "specifier", spike: "specifier", "design machine": "designer", "validate machine": "designer", build: "builder", prove: "builder", promote: "reviewer" })[t.kind];

function Card({ t }: { t: Task }) {
  const live = t.runs.map(runOf).find((r) => r?.status === "running");
  return (
    <Link to={`/work/t/${t.id}`} className={`flex flex-col gap-2 rounded-xl border bg-fd-card p-3 text-sm shadow-sm hover:border-fd-primary/60 ${t.reopened ? "border-red-500/50" : t.column === "waiting" ? "border-amber-500/60" : live ? "border-sky-500/50" : "border-fd-border"}`}>
      <div className="flex items-center justify-between"><span className="rounded-md px-1.5 py-0.5 text-xs" style={{ background: `${TYPE_TONE[kindTone(t)]}22`, color: TYPE_TONE[kindTone(t)] }}>{t.kind}</span><span className="text-xs text-fd-muted-foreground">{t.milestone}</span></div>
      <div className={`font-medium ${t.column === "done" ? "text-fd-muted-foreground line-through" : ""}`}>{t.subject}</div>
      {t.reopened ? <div className="text-xs text-red-600 dark:text-red-400">reopened: {t.reopened}</div> : t.note && <div className="text-xs text-fd-muted-foreground">{t.note}</div>}
      {t.progress && t.column !== "done" && <div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-fd-muted"><div className="h-1.5 rounded-full bg-fd-primary" style={{ width: `${(t.progress[0] / t.progress[1]) * 100}%` }} /></div><span className="text-xs tabular-nums text-fd-muted-foreground">{t.progress[0]}/{t.progress[1]}</span></div>}
      {t.runs.length > 0 && <div className="flex items-center justify-between text-xs text-fd-muted-foreground">
        <span className="flex -space-x-1">{t.runs.map((id) => { const r = runOf(id)!; return <span key={id} title={`${id} · ${workerOf(r.worker).name} · ${r.status}`} className="size-4 rounded-full border-2 border-fd-card" style={{ background: TYPE_TONE[r.worker], opacity: r.status === "failed" ? 0.4 : 1 }} />; })}</span>
        {live ? <span className="text-sky-500">{live.id} · {Math.round(live.seconds / 60)}m · ${live.costUsd.toFixed(2)}</span> : <span>{t.runs.length} run{t.runs.length > 1 ? "s" : ""}</span>}</div>}
    </Link>
  );
}

export default function Board() {
  const m = missionOf(useParams().mission ?? "") ?? missions[0]!, ts = tasksOf(m.id), d = m.daily, rs = runsOf(m.id);
  const closed = ts.filter((t) => t.column === "done" || t.column === "proven").length, stats = rs.map(runStats);
  const tools = stats.reduce((a, s) => a + s.tools, 0), toolFails = stats.reduce((a, s) => a + s.toolFails, 0), reopened = ts.filter((t) => t.reopened);
  const delta = (xs: number[], unit = "", good: "up" | "down" = "up") => { const v = last(xs) - prev(xs); return { delta: `${Math.abs(Math.round(v * 10) / 10)}${unit}`, dir: v > 0 ? "up" as const : v < 0 ? "down" as const : "flat" as const, good: good === "up" ? v >= 0 : v <= 0 }; };
  return (
    <WorkShell mission={m.id} title={<span className="flex items-center gap-2"><Orb hue={m.hue} size={20} />{m.title}</span>} sub={`Board · until ${m.until} · ${m.milestones.map((x) => x.title).join(" → ")}`}
      actions={<HeadLink to={`/work/m/${m.id}`} primary>Manager chat</HeadLink>}>
      <div className="flex flex-col gap-5 px-6 py-6">
        <KpiGroup cols={6}>
          <Kpi icon="✓" title="Tasks closed" value={closed} of={`of ${ts.length}`} progress={(closed / ts.length) * 100} trend={delta(d.closed)} footer={`scope grew by ${last(d.scope) - d.scope[0]!} (a spike)`} />
          <Kpi icon="◎" title="Eval pass rate" value={pct(last(d.evalPass))} trend={delta(d.evalPass, " pts")} spark={d.evalPass} sparkTone="#10b981" footer="across the mission's operations, in test" />
          <Kpi icon="$" title="Spend today" value={`$${last(d.spend).toFixed(2)}`} of="of $10 cap" progress={last(d.spend) * 10} tone={last(d.spend) > 8 ? "warn" : undefined} footer={`$${d.spend.reduce((a, b) => a + b, 0).toFixed(2)} since ${m.started}`} />
          <Kpi icon="⚒" title="Tool calls failed" value={pct(last(d.toolFail))} trend={delta(d.toolFail, " pts", "down")} spark={d.toolFail} sparkTone="#ef4444" footer={`${toolFails} of ${tools} in today's threads`} />
          <Kpi icon="⏱" title="Median time to close" value={`${last(d.closeMin)}m`} trend={delta(d.closeMin, "m", "down")} spark={d.closeMin.filter(Boolean)} footer="claim to closing fact" />
          <Kpi icon="↺" title="Reopened" value={reopened.length} tone={reopened.length ? "bad" : undefined} footer={reopened.map((t) => `${t.subject}: ${t.reopened?.split(":")[0]}`).join(", ") || "none"} />
        </KpiGroup>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2"><Widget title="Burn-down" sub="open tasks per day; the dashed line reaches zero on the last day" legend={[["#3b82f6", "Open"], ["#a1a1aa", "Scope"]]}><BurnDown day={d.day} open={d.open} scope={d.scope} /></Widget></div>
          <Widget title="Agents on this mission" sub="threads by type">
            <ul className="flex flex-col gap-3 text-sm">{workers.filter((w) => rs.some((r) => r.worker === w.id)).map((w) => { const mine = rs.filter((r) => r.worker === w.id), ok = mine.filter((r) => r.status === "passed").length; return (
              <li key={w.id}><Link to={`/work/agents/${w.id}`} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: TYPE_TONE[w.id] }} />{w.name}<span className="ml-auto tabular-nums text-fd-muted-foreground">{mine.length} threads · {ok} passed · ${mine.reduce((a, r) => a + r.costUsd, 0).toFixed(2)}</span></Link></li>); })}</ul>
          </Widget>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">{COLS.map(([c, label, icon]) => { const here = ts.filter((t) => t.column === c); return (
          <section key={c} className="flex flex-col gap-2 rounded-2xl bg-fd-muted/40 p-2">
            <h2 className="flex items-center gap-2 px-1 py-1 text-sm font-medium"><span className="text-fd-muted-foreground">{icon}</span>{label}<span className="rounded-full bg-fd-card px-2 text-xs text-fd-muted-foreground">{here.length}</span></h2>
            {here.map((t) => <Card key={t.id} t={t} />)}
          </section>); })}</div>
      </div>
    </WorkShell>
  );
}
export { runs };
