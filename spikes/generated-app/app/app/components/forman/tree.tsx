// The one page tree (F6 #1): Live and Environments, then each thing with its operations, machine, events, errors and
// roles, all generated from the model; then prose whose declaration is gone.
import { useActionQuery } from "@agent-native/core/client";
import { useState } from "react";
import { Link, useLocation } from "react-router";

import { cn } from "@/lib/utils";

type Any = any;

const Node = ({ to, label, on, depth = 0, dot }: { to: string; label: string; on: boolean; depth?: number; dot?: boolean }) => (
  <Link to={to} className={cn("flex items-center gap-1.5 truncate rounded px-2 py-0.5 text-[13px] text-sidebar-foreground/80 hover:bg-sidebar-accent", on && "bg-sidebar-accent font-medium text-sidebar-accent-foreground")} style={{ paddingLeft: 8 + depth * 14 }}>
    {label}{dot ? <span className="ml-auto size-1.5 rounded-full bg-emerald-500" /> : null}
  </Link>
);

export const FormanTree = () => {
  const { pathname } = useLocation();
  const tree = useActionQuery("page-tree", {}, { refetchInterval: 10000, method: "POST" });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const data = tree.data as Any;
  if (!data?.pages) return null;
  const pages: Any[] = data.pages;
  const things = pages.filter((p) => p.kind === "thing");
  const isOpen = (t: string) => open[t] ?? pathname.startsWith(t);
  return (
    <div className="px-2 pb-2">
      <Node to="/live" label="Live" on={pathname === "/live" || pathname === "/"} dot />
      <Node to="/environments" label="Environments" on={pathname === "/environments"} />
      <div className="px-2 pb-0.5 pt-3 text-[11px] uppercase tracking-wide text-sidebar-foreground/50">acme · generated</div>
      {things.map((t) => (
        <div key={t.path}>
          <div className="flex items-center">
            <button type="button" className="w-4 text-[10px] text-sidebar-foreground/50" onClick={() => setOpen({ ...open, [t.path]: !isOpen(t.path) })}>{isOpen(t.path) ? "▾" : "▸"}</button>
            <div className="flex-1"><Node to={t.path} label={t.title} on={pathname === t.path} /></div>
          </div>
          {isOpen(t.path) ? pages.filter((p) => p.under === t.path).map((p) => <Node key={p.path} to={p.path} label={p.kind === "operation" ? p.title.split(".")[1] : p.kind === "machine" ? "machine" : `${p.kind} · ${p.title.split(".").pop()}`} on={pathname === p.path} depth={1} />) : null}
        </div>
      ))}
      {data.orphans?.length ? <><div className="px-2 pb-0.5 pt-3 text-[11px] uppercase tracking-wide text-amber-600">orphaned prose</div>{data.orphans.map((o: Any) => <Node key={o.path} to={o.path} label={o.title} on={pathname === o.path} />)}</> : null}
    </div>
  );
};
