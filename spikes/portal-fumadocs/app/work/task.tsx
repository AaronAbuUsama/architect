// One task: what closes it and how close it is, its attempts in aggregate, and one timeline that mixes the recorded
// facts with what each thread did (commands, refused tool calls, reports, resumes), filterable.
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { M } from "../blueprint/model.ts";
import { EvalStrip } from "../views/status.tsx";
import { facts, missionOf, runOf, taskOf, tasks, workerOf } from "./fixtures.ts";
import { Kpi, KpiGroup } from "./kpi.tsx";
import { OpLink } from "./manager.tsx";
import { HeadLink, RunStatus, TYPE_TONE, WorkShell } from "./shell.tsx";
import { runStats } from "./thread.tsx";
import type { Run } from "./types.ts";

export function meta() { return [{ title: "Task · acme work" }]; }
type Item = { at: string; kind: "fact" | "thread" | "command" | "failure"; text: string; tone?: "good" | "bad"; run?: Run; seq?: number };
const day = (r: Run) => (r.started.includes(" ") && r.started.length > 6 ? r.started : `Nov 17 ${r.started}`);
const plus = (base: string, s: number) => { const [d, hm] = [base.slice(0, 6), base.slice(7)]; const [h, m] = hm.split(":").map(Number); const t = h! * 60 + m! + Math.floor(s / 60); return `${d} ${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };

function timeline(subject: string, runs: Run[]): Item[] {
  const items: Item[] = facts.filter((f) => f.subject === subject).map((f) => ({ at: f.at, kind: "fact", text: f.text, tone: f.tone, seq: f.seq }));
  for (const r of runs) {
    items.push({ at: day(r), kind: "thread", text: `${r.id} started: ${workerOf(r.worker).name} on ${r.model}`, run: r });
    for (const e of r.events) {
      const at = plus(day(r), e.at);
      if (e.kind === "command") items.push({ at, kind: e.exit ? "failure" : "command", text: `$ ${e.cmd} → ${e.ms === 0 ? "running" : `exit ${e.exit}`}${e.tail ? ` · ${e.tail}` : ""}`, tone: e.exit ? "bad" : undefined, run: r });
      if (e.kind === "tool" && !e.ok) items.push({ at, kind: "failure", text: `${e.name} refused: ${e.error}`, tone: "bad", run: r });
      if (e.kind === "report") items.push({ at, kind: e.report === "failed" ? "failure" : "thread", text: `${r.id} reports ${e.report}: ${e.text}`, tone: e.report === "failed" ? "bad" : e.report === "ready" ? "good" : undefined, run: r });
      if (e.kind === "resume") items.push({ at, kind: "thread", text: `${r.id} resumed after eviction`, run: r });
    }
  }
  return items.sort((a, b) => a.at.localeCompare(b.at));
}
const FILTERS = ["all", "fact", "thread", "command", "failure"] as const;
const DOT = { fact: "bg-fd-primary", thread: "", command: "bg-zinc-500", failure: "bg-red-500" };

export default function TaskPage() {
  const t = taskOf(useParams().task ?? "") ?? tasks[0]!, m = missionOf(t.mission)!, navigate = useNavigate();
  const rs = t.runs.map((id) => runOf(id)!), st = rs.map(runStats), isOp = !!M.operations[t.subject];
  const [f, setF] = useState<(typeof FILTERS)[number]>("all");
  const items = timeline(t.subject, rs), shown = items.filter((i) => f === "all" || i.kind === f);
  const secs = rs.reduce((a, r) => a + r.seconds, 0), cost = rs.reduce((a, r) => a + r.costUsd, 0), tools = st.reduce((a, s) => a + s.tools, 0), fails = st.reduce((a, s) => a + s.toolFails, 0);
  return (
    <WorkShell mission={m.id} title={<span className="flex items-center gap-2"><span className="rounded-md bg-fd-muted px-2 py-0.5 text-sm font-normal">{t.kind}</span>{t.subject}</span>} sub={`${m.title} · ${t.milestone} · ${t.column}`}
      actions={<><HeadLink to={`/work/m/${m.id}/board`}>Board</HeadLink><HeadLink to={`/work/m/${m.id}`}>Manager</HeadLink>{isOp && <HeadLink to={`/operations/${t.subject}`} primary>{t.subject} in the portal</HeadLink>}</>}>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
        <div className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 ${t.reopened ? "border-red-500/50" : "border-fd-border"} bg-fd-card`}>
          <div className="min-w-0 flex-1"><div className="text-xs text-fd-muted-foreground">Closes when</div><div className="font-medium">{t.closesWhen}</div>
            {t.reopened && <div className="mt-1 text-sm text-red-600 dark:text-red-400">Reopened by a fact: {t.reopened}</div>}{t.note && !t.reopened && <div className="mt-1 text-sm text-fd-muted-foreground">{t.note}</div>}</div>
          {t.progress && <div className="w-48"><div className="flex justify-between text-xs text-fd-muted-foreground"><span>progress</span><span className="tabular-nums">{t.progress[0]} of {t.progress[1]}</span></div><div className="mt-1 h-2 rounded-full bg-fd-muted"><div className="h-2 rounded-full bg-fd-primary" style={{ width: `${(t.progress[0] / t.progress[1]) * 100}%` }} /></div></div>}
          {isOp && t.kind === "prove" && <div><div className="text-xs text-fd-muted-foreground">Nine evals in test</div><EvalStrip op={t.subject} env="test" /></div>}
        </div>
        <KpiGroup cols={4}>
          <Kpi icon="↻" title="Attempts" value={rs.length} footer={rs.length ? `${rs.filter((r) => r.status === "failed").length} failed · models: ${[...new Set(rs.map((r) => r.model))].join(", ")}` : "no thread yet"} />
          <Kpi icon="⏱" title="Time spent" value={`${Math.round(secs / 60)}m`} footer="across every attempt" />
          <Kpi icon="$" title="Cost" value={`$${cost.toFixed(2)}`} footer={rs.length ? `$${(cost / rs.length).toFixed(2)} an attempt` : "–"} />
          <Kpi icon="⚒" title="Tool calls failed" value={fails} of={`of ${tools}`} tone={fails ? "bad" : undefined} footer="refused by a grant or a schema" />
        </KpiGroup>
        {rs.length > 0 && <div className="overflow-hidden rounded-2xl border border-fd-border"><table className="w-full text-sm"><thead className="bg-fd-muted/50 text-left text-fd-muted-foreground"><tr>{["Thread", "Agent", "Model", "Time", "Cost", "Tool calls failed"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{rs.map((r, i) => <tr key={r.id} onClick={() => navigate(`/work/r/${r.id}`)} className="cursor-pointer border-t border-fd-border hover:bg-fd-accent/40">
            <td className="px-4 py-2.5"><span className="flex items-center gap-2"><RunStatus s={r.status} />{r.id}</span></td><td className="px-4"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: TYPE_TONE[r.worker] }} />{workerOf(r.worker).name}</span></td>
            <td className="px-4 font-mono text-xs">{r.model}</td><td className="px-4 tabular-nums">{Math.round(r.seconds / 60)}m</td><td className="px-4 tabular-nums">${r.costUsd.toFixed(2)}</td><td className="px-4 tabular-nums">{st[i]!.toolFails} of {st[i]!.tools}</td></tr>)}</tbody></table></div>}
        <section className="rounded-2xl border border-fd-border bg-fd-card p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2"><h2 className="mr-2 font-semibold">Timeline</h2>{FILTERS.map((x) => <button key={x} onClick={() => setF(x)} className={`rounded-full px-3 py-1 text-xs ${f === x ? "bg-fd-primary text-fd-primary-foreground" : "border border-fd-border"}`}>{x === "all" ? "all" : `${x}s`} {items.filter((i) => x === "all" || i.kind === x).length}</button>)}
            <span className="ml-auto text-xs text-fd-muted-foreground">facts from the logbook and plan; the rest from each thread</span></div>
          <ol className="relative ml-2 border-l border-fd-border">{shown.map((i, n) => (
            <li key={n} className="mb-3 ml-4">
              <span className={`absolute -left-[5px] mt-1.5 size-2.5 rounded-full ${DOT[i.kind] || ""}`} style={i.kind === "thread" && i.run ? { background: TYPE_TONE[i.run.worker] } : undefined} />
              <div className="flex gap-3"><span className="w-24 shrink-0 font-mono text-xs text-fd-muted-foreground">{i.at}</span>
                <span className={`text-sm ${i.kind === "command" || i.kind === "failure" ? "font-mono text-xs" : ""} ${i.tone === "bad" ? "text-red-600 dark:text-red-400" : i.tone === "good" ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{i.seq && <span className="mr-1 text-fd-muted-foreground">#{i.seq}</span>}{i.text}</span>
                {i.run && <Link to={`/work/r/${i.run.id}`} className="ml-auto shrink-0 text-xs text-fd-primary hover:underline">thread</Link>}</div>
            </li>))}</ol>
          {isOp || !M.things[t.subject] ? null : <p className="text-sm text-fd-muted-foreground">About <OpLink subject={t.subject} />.</p>}
        </section>
      </div>
    </WorkShell>
  );
}
