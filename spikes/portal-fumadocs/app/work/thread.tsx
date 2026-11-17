// One thread: a run, read-only. Its numbers on top; then two ways to read it. Narration tells what happened in plain
// sentences you can listen to; Transcript is the audit view: every turn, tool call (input and output), command (its
// terminal output), edit (its diff), report and resume. To change a run you talk to its manager.
import { Tabs, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { missionOf, runOf, runs, taskOf, workerOf } from "./fixtures.ts";
import { Kpi, KpiGroup } from "./kpi.tsx";
import { OpLink } from "./manager.tsx";
import { Narration } from "./narration.tsx";
import { clock, k, Transcript } from "./output.tsx";
import { HeadLink, RunStatus, TYPE_TONE, WorkShell, runTitle } from "./shell.tsx";
import type { Run, RunEvent } from "./types.ts";

export function meta() { return [{ title: "Thread · acme work" }]; }

export function runStats(r: Run) {
  const turns = r.events.filter((e) => e.kind === "turn"), tools = r.events.filter((e) => e.kind === "tool"), cmds = r.events.filter((e) => e.kind === "command");
  const tin = turns.reduce((a, e) => a + e.tokensIn, 0), cached = turns.reduce((a, e) => a + e.cached, 0);
  return { turns: turns.length, tokensIn: tin, tokensOut: turns.reduce((a, e) => a + e.tokensOut, 0), cachePct: tin ? Math.round((cached / tin) * 100) : 0,
    tools: tools.length, toolFails: tools.filter((e) => !e.ok).length, cmds: cmds.length, cmdFails: cmds.filter((e) => e.exit !== 0).length,
    resumes: r.events.filter((e) => e.kind === "resume").length, perTurn: turns.map((e) => e.tokensIn) };
}

const failed = (e: RunEvent) => (e.kind === "tool" && !e.ok) || (e.kind === "command" && e.exit !== 0) || (e.kind === "report" && (e.report === "failed" || e.report === "blocked"));
const FILTERS = { all: () => true, turns: (e: RunEvent) => e.kind === "turn", tools: (e: RunEvent) => e.kind === "tool", commands: (e: RunEvent) => e.kind === "command", edits: (e: RunEvent) => e.kind === "edit", failures: failed } as const;
type Filter = keyof typeof FILTERS;

export default function Thread() {
  const r = runOf(useParams().run ?? "") ?? runs[0]!, task = taskOf(r.task)!, m = missionOf(task.mission)!, w = workerOf(r.worker), s = runStats(r);
  const [tab, setTab] = useState<string>("narration"), [f, setF] = useState<Filter>("all"), [flash, setFlash] = useState<number | null>(null);
  const shown = r.events.map((e, i) => [i, e] as [number, RunEvent]).filter(([, e]) => FILTERS[f](e));
  const jump = (i: number) => { setF("all"); setTab("transcript"); setFlash(i); setTimeout(() => document.getElementById(`ev-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); setTimeout(() => setFlash(null), 2200); };
  return (
    <WorkShell mission={m.id} title={<span className="flex items-center gap-2"><RunStatus s={r.status} />{runTitle(r)}</span>}
      sub={<span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: TYPE_TONE[r.worker] }} />{w.name} · {r.model} · {r.id} · started {r.started} · for {m.title}</span>}
      actions={<><HeadLink to={`/work/m/${m.id}`}>Manager</HeadLink><HeadLink to={`/work/t/${task.id}`}>Task</HeadLink><HeadLink to={`/work/agents/${w.id}`}>{w.name} settings</HeadLink>{task.subject.includes(".") && <HeadLink to={`/operations/${task.subject}`} primary>{task.subject}</HeadLink>}</>}>
      <div className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-6">
        <KpiGroup cols={4}>
          <Kpi icon="⏱" title="Time · cost" value={clock(r.seconds)} of={`$${r.costUsd.toFixed(2)} of $${w.budgetUsd}`} progress={(r.costUsd / w.budgetUsd) * 100} tone={r.costUsd / w.budgetUsd > 0.8 ? "warn" : undefined} footer={`budget from ${w.file}`} />
          <Kpi icon="◇" title="Tokens" value={k(s.tokensIn + s.tokensOut)} of={`${s.turns} turns`} spark={s.perTurn} footer={`${s.cachePct}% of input from cache · ${k(s.tokensOut)} out`} />
          <Kpi icon="⚒" title="Tool calls failed" value={s.toolFails} of={`of ${s.tools}`} tone={s.toolFails ? "bad" : undefined} footer={s.toolFails ? "refused by the grant or a schema" : "none refused"} />
          <Kpi icon="$" title="Commands failed" value={s.cmdFails} of={`of ${s.cmds}`} tone={s.cmdFails ? "warn" : undefined} footer={`${s.resumes} resume${s.resumes === 1 ? "" : "s"} · sandbox ${r.sandboxUp ? "up" : "gone"} (${r.sandbox})`} />
        </KpiGroup>
        <Tabs selectedKey={tab} onSelectionChange={(key) => setTab(String(key))}>
          <div className="flex flex-wrap items-center gap-3">
            <Tabs.ListContainer>
              <Tabs.List aria-label="How to read this thread">
                <Tabs.Tab id="narration">Narration<Tabs.Indicator /></Tabs.Tab>
                <Tabs.Tab id="transcript">Transcript<Tabs.Indicator /></Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <span className="ml-auto text-xs text-muted">On <OpLink subject={task.subject} /> · grant: {w.tools.join(", ")}</span>
          </div>
          <Tabs.Panel id="narration" className="pt-4">{r.events.length ? <Narration run={r} onJump={jump} /> : <p className="text-muted">Nothing recorded in detail for this run.</p>}</Tabs.Panel>
          <Tabs.Panel id="transcript" className="flex flex-col gap-4 pt-4">
            <ToggleButtonGroup size="sm" selectionMode="single" disallowEmptySelection selectedKeys={new Set([f])} onSelectionChange={(sel) => { const v = [...sel][0]; if (v) setF(v as Filter); }}>
              {(Object.keys(FILTERS) as Filter[]).map((x) => <ToggleButton key={x} id={x}>{x} <span className="text-muted">{r.events.filter(FILTERS[x]).length}</span></ToggleButton>)}
            </ToggleButtonGroup>
            {shown.length ? <Transcript events={shown} flash={flash} /> : <p className="text-muted">Nothing recorded in detail for this run.</p>}
          </Tabs.Panel>
        </Tabs>
        <div className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-muted">Threads are read-only. To change this run, <Link to={`/work/m/${m.id}`} className="text-accent hover:underline">tell its manager</Link>.</div>
      </div>
    </WorkShell>
  );
}
