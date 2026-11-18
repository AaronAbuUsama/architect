// The sidebar's three menus, all HeroUI Pro Sidebar.Menu trees: Work (each manager folds open into its threads), Agents
// (the agent types) and Docs (Fumadocs' page tree, drawn as Pro menu items).
import { Book, Cpu, Folder, LayoutColumns } from "@gravity-ui/icons";
import { Sidebar } from "@heroui-pro/react";
import type { Node, Root } from "fumadocs-core/page-tree";
import { useLocation } from "react-router";
import { RunStatus, runTitle, TYPE_TONE } from "../work/bits.tsx";
import { missions, runs, runsOf, tasksOf, workerOf, workers } from "../work/fixtures.ts";

const usePath = () => useLocation().pathname.replace(/\/$/, "") || "/";
const Dot = ({ tone }: { tone: string }) => <span className="size-2.5 rounded-full" style={{ background: tone }} />;

export function WorkMenu() {
  const path = usePath();
  const open = missions.filter((m) => m.status === "running" || runsOf(m.id).some((r) => path === `/work/r/${r.id}`) || path.startsWith(`/work/m/${m.id}`)).map((m) => m.id);
  return (
    <Sidebar.Menu aria-label="Managers" defaultExpandedKeys={open}>
      <Sidebar.MenuSection>
        <Sidebar.MenuHeader>Managers</Sidebar.MenuHeader>
        {missions.map((m) => {
          const threads = runsOf(m.id).sort((a, b) => Number(b.status === "running") - Number(a.status === "running"));
          const live = threads.filter((r) => r.status === "running").length, waits = tasksOf(m.id).filter((t) => t.column === "waiting").length;
          return (
            <Sidebar.MenuItem key={m.id} id={m.id} textValue={m.title} href={`/work/m/${m.id}`} isCurrent={path === `/work/m/${m.id}` || path === `/work/m/${m.id}/board`}>
              <Sidebar.MenuItemContent>
                <Sidebar.MenuIcon><span className="size-5 rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, ${m.hue[0]}, ${m.hue[1]})` }} /></Sidebar.MenuIcon>
                <Sidebar.MenuLabel>{m.title}</Sidebar.MenuLabel>
                {(live > 0 || waits > 0) && <Sidebar.MenuChip>{waits > 0 ? `${waits} waiting` : `${live} live`}</Sidebar.MenuChip>}
                <Sidebar.MenuTrigger><Sidebar.MenuIndicator /></Sidebar.MenuTrigger>
              </Sidebar.MenuItemContent>
              <Sidebar.Submenu>
                {threads.map((r) => (
                  <Sidebar.MenuItem key={r.id} id={r.id} textValue={runTitle(r)} href={`/work/r/${r.id}`} isCurrent={path === `/work/r/${r.id}`} tooltipProps={{ content: `${workerOf(r.worker).name} · ${r.model} · ${r.id}`, placement: "right" }}>
                    <Sidebar.MenuItemContent>
                      <Sidebar.MenuIcon><RunStatus s={r.status} /></Sidebar.MenuIcon>
                      <Sidebar.MenuLabel>{runTitle(r)}</Sidebar.MenuLabel>
                      <Sidebar.MenuChip><Dot tone={TYPE_TONE[r.worker]!} /></Sidebar.MenuChip>
                    </Sidebar.MenuItemContent>
                  </Sidebar.MenuItem>))}
              </Sidebar.Submenu>
            </Sidebar.MenuItem>);
        })}
      </Sidebar.MenuSection>
    </Sidebar.Menu>
  );
}

export function AgentsMenu() {
  const path = usePath();
  return (
    <Sidebar.Menu aria-label="Agent types">
      <Sidebar.MenuItem id="all" textValue="All agent types" href="/work/agents" isCurrent={path === "/work/agents"}>
        <Sidebar.MenuItemContent><Sidebar.MenuIcon><LayoutColumns /></Sidebar.MenuIcon><Sidebar.MenuLabel>All agent types</Sidebar.MenuLabel></Sidebar.MenuItemContent>
      </Sidebar.MenuItem>
      <Sidebar.MenuSection>
        <Sidebar.MenuHeader>Agent types</Sidebar.MenuHeader>
        {workers.map((w) => { const live = runs.filter((r) => r.worker === w.id && r.status === "running").length; return (
          <Sidebar.MenuItem key={w.id} id={w.id} textValue={w.name} href={`/work/agents/${w.id}`} isCurrent={path === `/work/agents/${w.id}`}>
            <Sidebar.MenuItemContent>
              <Sidebar.MenuIcon><Cpu style={{ color: TYPE_TONE[w.id] }} /></Sidebar.MenuIcon>
              <Sidebar.MenuLabel>{w.name}</Sidebar.MenuLabel>
              {live > 0 && <Sidebar.MenuChip>{live} live</Sidebar.MenuChip>}
            </Sidebar.MenuItemContent>
          </Sidebar.MenuItem>); })}
      </Sidebar.MenuSection>
    </Sidebar.Menu>
  );
}

// Fumadocs' tree → Pro menu items. Separators start a section; folders fold; the folders above this page start open.
type Section = { title?: string; nodes: Node[] };
const sectionsOf = (tree: Root): Section[] => tree.children.reduce<Section[]>((acc, n) => {
  if (n.type === "separator") acc.push({ title: String(n.name ?? ""), nodes: [] }); else acc[acc.length - 1]!.nodes.push(n);
  return acc;
}, [{ nodes: [] }]).filter((s) => s.nodes.length);
const within = (n: Node, path: string): boolean => n.type === "page" ? n.url === path : n.type === "folder" ? n.index?.url === path || n.children.some((c) => within(c, path)) : false;
const keyOf = (n: Node, i: number) => (n.type === "page" ? n.url : n.type === "folder" ? `${n.index?.url ?? n.name}#${i}` : `sep-${i}`);
const openKeys = (nodes: Node[], path: string): string[] => nodes.flatMap((n, i) => n.type === "folder" && within(n, path) ? [keyOf(n, i), ...openKeys(n.children, path)] : []);

function DocItem({ n, i, path, top }: { n: Node; i: number; path: string; top?: boolean }) {
  if (n.type === "separator") return null;
  const label = String(n.name ?? "");
  if (n.type === "page") return (
    <Sidebar.MenuItem id={keyOf(n, i)} textValue={label} href={n.url} isCurrent={n.url === path}>
      <Sidebar.MenuItemContent>{top && <Sidebar.MenuIcon><Book /></Sidebar.MenuIcon>}<Sidebar.MenuLabel>{label}</Sidebar.MenuLabel></Sidebar.MenuItemContent>
    </Sidebar.MenuItem>);
  return (
    <Sidebar.MenuItem id={keyOf(n, i)} textValue={label} href={n.index?.url} isCurrent={n.index?.url === path}>
      <Sidebar.MenuItemContent>{top && <Sidebar.MenuIcon><Folder /></Sidebar.MenuIcon>}<Sidebar.MenuLabel>{label}</Sidebar.MenuLabel><Sidebar.MenuTrigger><Sidebar.MenuIndicator /></Sidebar.MenuTrigger></Sidebar.MenuItemContent>
      <Sidebar.Submenu>{n.children.map((c, j) => <DocItem key={keyOf(c, j)} n={c} i={j} path={path} />)}</Sidebar.Submenu>
    </Sidebar.MenuItem>);
}

export function DocsMenu({ tree }: { tree: Root }) {
  const path = usePath();
  return (
    <Sidebar.Menu aria-label="Docs" defaultExpandedKeys={openKeys(tree.children, path)}>
      {sectionsOf(tree).map((s, si) => (
        <Sidebar.MenuSection key={si}>
          {s.title && <Sidebar.MenuHeader>{s.title}</Sidebar.MenuHeader>}
          {s.nodes.map((n) => { const i = tree.children.indexOf(n); return <DocItem key={keyOf(n, i)} n={n} i={i} path={path} top />; })}
        </Sidebar.MenuSection>))}
    </Sidebar.Menu>
  );
}
