// The sidebar's Docs group, drawn from Fumadocs' page tree (the headless part we keep): separators become headings,
// folders fold, pages are links. The folder holding the current page starts open.
import type { Node, Root } from "fumadocs-core/page-tree";
import { useState } from "react";
import { NavLink, useLocation } from "react-router";

const link = ({ isActive }: { isActive: boolean }) => `block truncate rounded-xl px-2.5 py-1.5 text-sm ${isActive ? "bg-default font-medium text-default-foreground" : "text-foreground/80 hover:bg-default/60"}`;
const within = (n: Node, path: string): boolean => n.type === "page" ? n.url === path : n.type === "folder" ? n.index?.url === path || n.children.some((c) => within(c, path)) : false;

function Folder({ n, path }: { n: Extract<Node, { type: "folder" }>; path: string }) {
  const [open, setOpen] = useState(within(n, path));
  return (
    <li>
      <div className="flex items-center">
        {n.index ? <NavLink to={n.index.url} end className={(s) => `${link(s)} flex-1`}>{n.name}</NavLink> : <span className="flex-1 px-2 py-1 text-sm">{n.name}</span>}
        <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Fold" : "Unfold"} className="grid size-6 place-items-center rounded text-muted hover:bg-default/60"><span className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}>›</span></button>
      </div>
      {open && <ul className="ml-3 border-l border-border pl-2">{n.children.map((c, i) => <Item key={i} n={c} path={path} />)}</ul>}
    </li>
  );
}
function Item({ n, path }: { n: Node; path: string }) {
  if (n.type === "separator") return <li className="px-2 pb-0.5 pt-3 text-xs font-medium text-muted">{n.name}</li>;
  if (n.type === "folder") return <Folder n={n} path={path} />;
  return <li><NavLink to={n.url} end className={link}>{n.name}</NavLink></li>;
}
export function DocsTree({ tree }: { tree: Root }) {
  const path = useLocation().pathname.replace(/\/$/, "") || "/";
  return <ul className="flex flex-col">{tree.children.map((n, i) => <Item key={i} n={n} path={path} />)}</ul>;
}
