// The sidebar's Work group: managers, each folding out into the threads it started, labelled by agent type.
import { NavLink } from "react-router";
import { runsOf, tasksOf, workerOf } from "../work/fixtures.ts";
import { age, navCls, Orb, RunStatus, runTitle, TYPE_TONE } from "../work/bits.tsx";
import type { Mission } from "../work/types.ts";

export function ManagerRow({ m, open, toggle }: { m: Mission; open: boolean; toggle: () => void }) {
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

