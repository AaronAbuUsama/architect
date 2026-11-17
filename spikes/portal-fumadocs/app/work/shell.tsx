// The Work shell, a chat app: managers down the side, each folding out into the threads it started, labelled by the
// type of agent running them. Picking a manager or a thread opens its conversation on the right.
import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { missions, runs, runsOf, taskOf, tasksOf, workerOf, workers } from "./fixtures.ts";
import type { Mission, Run } from "./types.ts";

export const TYPE_TONE: Record<string, string> = { manager: "#71717a", specifier: "#8b5cf6", designer: "#ec4899", journeys: "#14b8a6", builder: "#3b82f6", sre: "#f59e0b", reviewer: "#ef4444" };
export const Orb = ({ hue, size = 32 }: { hue: [string, string]; size?: number }) => (
  <span className="shrink-0 rounded-full" style={{ width: size, height: size, background: `radial-gradient(circle at 30% 30%, ${hue[0]}, ${hue[1]})` }} />
);
export const runTitle = (r: Run) => { const t = taskOf(r.task)!; return `${t.kind} ${t.subject}`; };
const STATUS: Record<Run["status"], [string, string]> = { running: ["●", "text-sky-500 animate-pulse"], passed: ["✓", "text-emerald-500"], failed: ["✘", "text-red-500"], stopped: ["■", "text-fd-muted-foreground"] };
export const RunStatus = ({ s }: { s: Run["status"] }) => <span className={`w-3 text-center text-xs ${STATUS[s][1]}`} aria-label={s}>{STATUS[s][0]}</span>;
const age = (r: Run) => (r.seconds < 3600 ? `${Math.round(r.seconds / 60)}m` : `${Math.round(r.seconds / 3600)}h`);
const navCls = ({ isActive }: { isActive: boolean }) => `flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm ${isActive ? "bg-fd-accent text-fd-accent-foreground" : "hover:bg-fd-accent/50"}`;

function ManagerRow({ m, open, toggle }: { m: Mission; open: boolean; toggle: () => void }) {
  const live = runsOf(m.id).filter((r) => r.status === "running").length, waits = tasksOf(m.id).filter((t) => t.column === "waiting").length;
  const threads = runsOf(m.id).sort((a, b) => Number(b.status === "running") - Number(a.status === "running"));
  return (
    <li>
      <div className="flex items-center">
        <NavLink to={`/work/m/${m.id}`} end className={(s) => `${navCls(s)} min-w-0 flex-1`}>
          <Orb hue={m.hue} size={28} />
          <span className="min-w-0"><span className={`block truncate font-medium ${m.status === "done" ? "text-fd-muted-foreground" : ""}`}>{m.title}</span>
            <span className="block truncate text-xs text-fd-muted-foreground">{m.status === "done" ? "done" : [live && `${live} running`, waits && `${waits} waits on you`].filter(Boolean).join(" · ") || "idle"}</span></span>
        </NavLink>
        {threads.length > 0 && <button onClick={toggle} aria-label={open ? "Fold threads" : "Show threads"} aria-expanded={open} className="ml-1 grid size-7 place-items-center rounded-lg text-fd-muted-foreground hover:bg-fd-accent/50">
          <span className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span></button>}
      </div>
      {open && <ul className="my-1 ml-5 border-l border-fd-border pl-2">{threads.map((r) => (
        <li key={r.id}><NavLink to={`/work/r/${r.id}`} className={(s) => `${navCls(s)} py-1`}>
          <RunStatus s={r.status} />
          <span className="min-w-0"><span className="block truncate">{runTitle(r)}</span>
            <span className="flex items-center gap-1 text-xs text-fd-muted-foreground"><span className="size-1.5 rounded-full" style={{ background: TYPE_TONE[r.worker] }} />{workerOf(r.worker).name} · {r.id} · {age(r)}</span></span>
        </NavLink></li>))}</ul>}
    </li>
  );
}

export function WorkShell({ mission, title, sub, actions, children }: { mission?: string; title: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(missions.map((m) => [m.id, m.id === mission || m.status === "running"])));
  return (
    <div className="flex h-screen bg-fd-background text-fd-foreground">
      <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-fd-border bg-fd-card/40 p-3">
        <div className="flex items-center gap-2 px-2 pt-1"><Orb hue={["#e9d5ff", "#60a5fa"]} size={34} /><div><div className="font-semibold">acme</div><div className="text-xs text-fd-muted-foreground">Work · blueprint 53d028d</div></div></div>
        <button className="rounded-xl border border-dashed border-fd-border px-3 py-2 text-left text-sm text-fd-muted-foreground hover:bg-fd-accent/50">＋ New mission</button>
        <section><h2 className="px-2 pb-1 text-xs font-medium text-fd-muted-foreground">Managers</h2>
          <ul className="flex flex-col gap-0.5">{missions.map((m) => <ManagerRow key={m.id} m={m} open={!!open[m.id]} toggle={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))} />)}</ul></section>
        <section><h2 className="px-2 pb-1 text-xs font-medium text-fd-muted-foreground">Agent types</h2>
          <ul>{workers.filter((w) => w.id !== "manager").map((w) => { const live = runs.filter((r) => r.worker === w.id && r.status === "running").length; return (
            <li key={w.id}><Link to={`/work/workers#${w.id}`} className="flex items-center gap-2 rounded-xl px-2 py-1 text-sm hover:bg-fd-accent/50"><span className="size-2 rounded-full" style={{ background: TYPE_TONE[w.id] }} />{w.name}{live > 0 && <span className="ml-auto text-xs text-sky-500">{live} live</span>}</Link></li>); })}</ul></section>
        <nav className="mt-auto flex flex-col gap-0.5 border-t border-fd-border pt-3">
          <NavLink to="/work/workers" className={navCls}>⚙ Agent types and models</NavLink>
          <Link to="/" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-fd-accent/50">📖 Portal docs</Link>
        </nav>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-fd-border px-6 py-3"><div className="min-w-0"><h1 className="truncate font-semibold">{title}</h1>{sub && <div className="truncate text-xs text-fd-muted-foreground">{sub}</div>}</div><div className="flex shrink-0 items-center gap-2">{actions}</div></header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}

export const HeadLink = ({ to, children, primary }: { to: string; children: ReactNode; primary?: boolean }) => (
  <Link to={to} className={`rounded-full px-3 py-1.5 text-sm ${primary ? "bg-fd-primary text-fd-primary-foreground" : "border border-fd-border hover:bg-fd-accent/50"}`}>{children}</Link>
);
