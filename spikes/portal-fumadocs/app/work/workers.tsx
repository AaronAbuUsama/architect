// Agent types: one card each, declared in a file in the repository (so a change is a reviewed pull request). Each lists
// every model it may run on; the manager picks one per thread, and the numbers show how each model has done.
import { Link } from "react-router";
import { runs, taskOf, workers } from "./fixtures.ts";
import { HeadLink, TYPE_TONE, WorkShell } from "./shell.tsx";
import { runStats } from "./thread.tsx";

export function meta() { return [{ title: "Agent types · acme work" }]; }
const Chips = ({ items, mono }: { items: string[]; mono?: boolean }) => <span className="flex flex-wrap gap-1">{items.map((x) => <span key={x} className={`rounded-md border border-fd-border px-1.5 py-0.5 text-xs ${mono ? "font-mono" : ""}`}>{x}</span>)}</span>;

export default function Workers() {
  return (
    <WorkShell title="Agent types and models" sub="Declared in architect/workers/*.ts · changing one is a pull request, so every thread stays reproducible" actions={<HeadLink to="/work">Managers</HeadLink>}>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6">
        {workers.map((w) => { const mine = runs.filter((r) => r.worker === w.id); return (
          <section key={w.id} id={w.id} className="scroll-mt-4 rounded-2xl border border-fd-border bg-fd-card target:border-fd-primary">
            <header className="flex flex-wrap items-start gap-3 border-b border-fd-border p-4">
              <span className="mt-1 size-3 rounded-full" style={{ background: TYPE_TONE[w.id] }} />
              <div className="min-w-0 flex-1"><h2 className="font-semibold">{w.name}</h2><p className="text-sm text-fd-muted-foreground">{w.does}</p></div>
              <code className="rounded bg-fd-muted px-2 py-0.5 text-xs">{w.file}</code>
            </header>
            <div className="grid gap-x-6 gap-y-3 p-4 text-sm md:grid-cols-[9rem_1fr]">
              <span className="text-fd-muted-foreground">Task kinds</span><Chips items={w.kinds.length ? w.kinds : ["all: it orchestrates"]} />
              <span className="text-fd-muted-foreground">Skills</span><Chips items={w.skills} mono />
              <span className="text-fd-muted-foreground">MCPs</span><Chips items={w.mcps} mono />
              <span className="text-fd-muted-foreground">Tools (its grant)</span><Chips items={w.tools} />
              <span className="text-fd-muted-foreground">Sandbox · budget</span><span>{w.sandbox ?? "none: reads only"} · ${w.budgetUsd} {w.id === "manager" ? "a day" : "a thread"}</span>
            </div>
            <div className="border-t border-fd-border p-4">
              <div className="mb-2 text-sm text-fd-muted-foreground">Models it may run on <span className="text-xs">(the manager picks per thread; first is the default)</span></div>
              <table className="w-full text-sm"><thead className="text-left text-xs text-fd-muted-foreground"><tr><th className="py-1 font-medium">Model</th><th className="font-medium">Threads</th><th className="font-medium">Passed</th><th className="font-medium">Avg cost</th><th className="font-medium">Tool calls failed</th></tr></thead>
                <tbody>{w.models.map((m, i) => { const rs = mine.filter((r) => r.model === m), st = rs.map(runStats), tools = st.reduce((a, s) => a + s.tools, 0), fails = st.reduce((a, s) => a + s.toolFails, 0); return (
                  <tr key={m} className="border-t border-fd-border">
                    <td className="py-2 font-mono text-xs">{m}{i === 0 && <span className="ml-2 rounded bg-fd-primary/15 px-1.5 py-0.5 font-sans text-fd-primary">default</span>}</td>
                    <td className="tabular-nums">{rs.length ? rs.map((r) => <Link key={r.id} to={`/work/r/${r.id}`} title={taskOf(r.task)?.subject} className="mr-1 text-fd-primary hover:underline">{r.id}</Link>) : <span className="text-fd-muted-foreground">none yet</span>}</td>
                    <td className="tabular-nums">{rs.length ? `${rs.filter((r) => r.status === "passed").length} of ${rs.filter((r) => r.status !== "running").length}` : "–"}</td>
                    <td className="tabular-nums">{rs.length ? `$${(rs.reduce((a, r) => a + r.costUsd, 0) / rs.length).toFixed(2)}` : "–"}</td>
                    <td className={`tabular-nums ${fails ? "text-red-600 dark:text-red-400" : ""}`}>{tools ? `${fails} of ${tools}` : "–"}</td>
                  </tr>); })}</tbody></table>
            </div>
          </section>); })}
      </div>
    </WorkShell>
  );
}
