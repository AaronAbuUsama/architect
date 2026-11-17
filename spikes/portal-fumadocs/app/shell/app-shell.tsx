// The one app layout for the whole portal, in the shape of HeroUI's AppLayout: a full-height sidebar, and beside it an
// inset surface holding a sticky navbar, the content and an optional aside. The sidebar's top switch picks its side:
// Work (managers and their threads), Agents (types and settings) or Docs (the blueprint's pages, from Fumadocs' tree).
import { Button, Chip, Kbd, ScrollShadow } from "@heroui/react";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router";
import { source } from "../blueprint/source.ts";
import { navCls, TYPE_TONE } from "../work/bits.tsx";
import { missions, runs, workers } from "../work/fixtures.ts";
import { DocsTree } from "./docs-tree.tsx";
import { ManagerRow } from "./managers.tsx";
import { sectionOf, SectionSwitch, type Section } from "./section-switch.tsx";

const Heading = ({ children }: { children: ReactNode }) => <div className="px-2.5 pb-1 pt-3 text-xs font-medium text-muted">{children}</div>;

function WorkNav({ mission }: { mission?: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(missions.map((m) => [m.id, m.id === mission || (!mission && m.status === "running")])));
  return (<>
    <Heading>Managers</Heading>
    <ul className="flex flex-col gap-0.5">{missions.map((m) => <ManagerRow key={m.id} m={m} open={!!open[m.id]} toggle={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))} />)}</ul>
    <Button size="sm" variant="ghost" className="mt-2 justify-start text-muted">＋ New mission</Button>
  </>);
}

function AgentsNav() {
  return (<>
    <ul className="flex flex-col gap-0.5"><li><NavLink to="/work/agents" end className={navCls}><span className="grid size-5 place-items-center text-muted">▦</span>All agent types</NavLink></li></ul>
    <Heading>Agent types</Heading>
    <ul className="flex flex-col gap-0.5">{workers.map((w) => { const live = runs.filter((r) => r.worker === w.id && r.status === "running").length; return (
      <li key={w.id}><NavLink to={`/work/agents/${w.id}`} className={navCls}>
        <span className="grid size-5 place-items-center"><span className="size-2.5 rounded-full" style={{ background: TYPE_TONE[w.id] }} /></span>
        <span className="min-w-0 flex-1"><span className="block truncate">{w.name}</span><span className="block truncate text-xs font-normal text-muted">{w.models.length} model{w.models.length === 1 ? "" : "s"} · ${w.budgetUsd} a {w.id === "manager" ? "day" : "thread"}</span></span>
        {live > 0 && <Chip size="sm" color="accent" variant="soft">{live} live</Chip>}
      </NavLink></li>); })}</ul>
  </>);
}

function Sidebar({ mission, section }: { mission?: string; section: Section }) {
  const { setOpenSearch } = useSearchContext();
  return (
    <aside className="flex w-72 shrink-0 flex-col gap-3 p-3">
      <SectionSwitch value={section} />
      <button onClick={() => setOpenSearch(true)} className="flex items-center gap-2 rounded-xl bg-default/70 px-3 py-2 text-sm text-muted hover:bg-default">
        <span>⌕</span>Search docs<Kbd className="ml-auto"><Kbd.Abbr keyValue="command" /><Kbd.Content>K</Kbd.Content></Kbd></button>
      <ScrollShadow className="-mx-1 min-h-0 flex-1 px-1" hideScrollBar>
        {section === "work" ? <WorkNav mission={mission} /> : section === "agents" ? <AgentsNav /> : <DocsTree tree={source.pageTree} />}
      </ScrollShadow>
      <div className="flex items-center gap-2.5 rounded-xl px-2 pt-2">
        <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-rose-500 text-sm font-semibold text-white">A</span>
        <span className="min-w-0 flex-1 text-sm"><span className="block font-medium">acme</span><span className="block text-xs text-muted">blueprint 53d028d</span></span>
        <ThemeSwitch />
      </div>
    </aside>
  );
}

export function AppShell({ mission, title, sub, actions, aside, children }: { mission?: string; title: ReactNode; sub?: ReactNode; actions?: ReactNode; aside?: ReactNode; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const section = sectionOf(useLocation().pathname);
  return (
    <div className="flex h-screen bg-background-secondary text-foreground">
      {!collapsed && <Sidebar mission={mission} section={section} />}
      <main className={`my-2 mr-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-surface ${collapsed ? "ml-2" : ""}`}>
        <header className="flex items-center gap-3 border-b border-separator px-4 py-2.5">
          <Button isIconOnly size="sm" variant="ghost" onPress={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}>▤</Button>
          <div className="min-w-0 flex-1"><h1 className="truncate font-semibold">{title}</h1>{sub && <div className="truncate text-xs text-muted">{sub}</div>}</div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </header>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
          {aside && <aside className="hidden w-60 shrink-0 overflow-y-auto border-l border-separator p-4 xl:block">{aside}</aside>}
        </div>
      </main>
    </div>
  );
}
