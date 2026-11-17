// The sidebar in Work: managers, each folding out into the threads it started, labelled by agent type.
import { NavLink } from "react-router";
import { runsOf, tasksOf, workerOf } from "../work/fixtures.ts";
import { age, navCls, Orb, RunStatus, runTitle, TYPE_TONE } from "../work/bits.tsx";
import type { Mission } from "../work/types.ts";

export function ManagerRow({ m, open, toggle }: { m: Mission; open: boolean; toggle: () => void }) {
  const live = runsOf(m.id).filter((r) => r.status === "running").length, waits = tasksOf(m.id).filter((t) => t.column === "waiting").length;
  const threads = runsOf(m.id).sort((a, b) => Number(b.status === "running") - Number(a.status === "running"));
  return (
    <li>
      <div className="group flex items-center">
        <NavLink to={`/work/m/${m.id}`} end className={(s) => `${navCls(s)} min-w-0 flex-1`}>
          <Orb hue={m.hue} size={30} />
          <span className="min-w-0 flex-1"><span className={`block truncate ${m.status === "done" ? "text-muted" : ""}`}>{m.title}</span>
            <span className="flex gap-1.5 truncate text-xs font-normal text-muted">{m.status === "done" ? "done" : <>
              {live > 0 ? <span className="text-accent">● {live} live</span> : <span>idle</span>}
              {waits > 0 && <span className="text-warning">· {waits} waits on you</span>}</>}</span></span>
        </NavLink>
        {threads.length > 0 && <button onClick={toggle} aria-label={open ? "Fold threads" : "Show threads"} aria-expanded={open} className="ml-0.5 grid size-7 place-items-center rounded-lg text-muted hover:bg-default/60">
          <span className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}>›</span></button>}
      </div>
      {open && <ul className="my-1 ml-6 flex flex-col gap-0.5 border-l border-border pl-2">{threads.map((r) => (
        <li key={r.id}><NavLink to={`/work/r/${r.id}`} className={(s) => `${navCls(s)} py-1`}>
          <RunStatus s={r.status} />
          <span className="min-w-0"><span className="block truncate">{runTitle(r)}</span>
            <span className="flex items-center gap-1 text-xs font-normal text-muted"><span className="size-1.5 rounded-full" style={{ background: TYPE_TONE[r.worker] }} />{workerOf(r.worker).name} · {r.id} · {age(r)}</span></span>
        </NavLink></li>))}</ul>}
    </li>
  );
}
