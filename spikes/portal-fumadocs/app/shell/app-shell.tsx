// The one app layout for the whole portal, in the shape of HeroUI's AppLayout: a full-height sidebar, a sticky navbar,
// the content, and an optional aside. The sidebar holds Work (managers and their threads) and Docs (the blueprint's
// pages), so a chat and an operation's page are always one click apart. Fumadocs supplies only the page tree and search.
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { source } from "../blueprint/source.ts";
import { navCls, Orb, TYPE_TONE } from "../work/bits.tsx";
import { missions, runs, workers } from "../work/fixtures.ts";
import { DocsTree } from "./docs-tree.tsx";
import { ManagerRow } from "./managers.tsx";

function Group({ title, open, toggle, children, extra }: { title: string; open: boolean; toggle: () => void; children: ReactNode; extra?: ReactNode }) {
  return (
    <section>
      <div className="flex items-center px-2 pb-1"><button onClick={toggle} aria-expanded={open} className="flex flex-1 items-center gap-1 text-xs font-medium text-fd-muted-foreground hover:text-fd-foreground"><span className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span>{title}</button>{extra}</div>
      {open && children}
    </section>
  );
}

function Sidebar({ mission }: { mission?: string }) {
  const inDocs = !useLocation().pathname.startsWith("/work");
  const [groups, setGroups] = useState({ work: true, docs: inDocs, agents: !inDocs });
  const flip = (k: keyof typeof groups) => () => setGroups((g) => ({ ...g, [k]: !g[k] }));
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(missions.map((m) => [m.id, m.id === mission || (!mission && !inDocs && m.status === "running")])));
  const { setOpenSearch } = useSearchContext();
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-r border-fd-border bg-fd-card/40 p-3">
      <Link to="/" className="flex items-center gap-2 px-2 pt-1"><Orb hue={["#e9d5ff", "#60a5fa"]} size={34} /><div><div className="font-semibold">acme</div><div className="text-xs text-fd-muted-foreground">blueprint 53d028d</div></div></Link>
      <button onClick={() => setOpenSearch(true)} className="flex items-center gap-2 rounded-xl border border-fd-border bg-fd-background px-3 py-1.5 text-sm text-fd-muted-foreground hover:bg-fd-accent/50">⌕ Search<kbd className="ml-auto rounded border border-fd-border px-1 text-xs">⌘K</kbd></button>
      <Group title="Work" open={groups.work} toggle={flip("work")} extra={<span className="text-xs text-fd-muted-foreground">＋ Mission</span>}>
        <ul className="flex flex-col gap-0.5">{missions.map((m) => <ManagerRow key={m.id} m={m} open={!!open[m.id]} toggle={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))} />)}</ul>
      </Group>
      <Group title="Docs" open={groups.docs} toggle={flip("docs")}><DocsTree tree={source.pageTree} /></Group>
      <Group title="Agent types" open={groups.agents} toggle={flip("agents")}>
        <ul>{workers.filter((w) => w.id !== "manager").map((w) => { const live = runs.filter((r) => r.worker === w.id && r.status === "running").length; return (
          <li key={w.id}><Link to={`/work/workers#${w.id}`} className="flex items-center gap-2 rounded-xl px-2 py-1 text-sm hover:bg-fd-accent/50"><span className="size-2 rounded-full" style={{ background: TYPE_TONE[w.id] }} />{w.name}{live > 0 && <span className="ml-auto text-xs text-sky-500">{live} live</span>}</Link></li>); })}</ul>
      </Group>
      <nav className="mt-auto flex items-center gap-1 border-t border-fd-border pt-3">
        <NavLink to="/work/workers" className={(s) => `${navCls(s)} flex-1`}>⚙ Agent types and models</NavLink>
        <ThemeSwitch />
      </nav>
    </aside>
  );
}

export function AppShell({ mission, title, sub, actions, aside, children }: { mission?: string; title: ReactNode; sub?: ReactNode; actions?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex h-screen bg-fd-background text-fd-foreground">
      {!collapsed && <Sidebar mission={mission} />}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-fd-border px-4 py-3">
          <button onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Show sidebar" : "Hide sidebar"} className="grid size-8 place-items-center rounded-lg text-fd-muted-foreground hover:bg-fd-accent/50">▤</button>
          <div className="min-w-0 flex-1"><h1 className="truncate font-semibold">{title}</h1>{sub && <div className="truncate text-xs text-fd-muted-foreground">{sub}</div>}</div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </header>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
          {aside && <aside className="hidden w-60 shrink-0 overflow-y-auto border-l border-fd-border p-4 xl:block">{aside}</aside>}
        </div>
      </main>
    </div>
  );
}
