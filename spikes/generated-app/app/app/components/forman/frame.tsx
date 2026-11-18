// The look of a block: derived blocks (grey, locked, show their source), live blocks (green, show their window).
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const Derived = ({ title, src, children }: { title: string; src?: string | undefined; children: ReactNode }) => (
  <section className="my-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/40">
    <header className="flex items-center gap-2 border-b border-slate-200 bg-slate-100/70 px-3 py-1.5 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{title}</span>
      <span title="Drawn from the model each time. You can't type in it.">🔒</span>
      {src ? <span className="ml-auto font-mono">{src}</span> : null}
    </header>
    <div className="px-3 py-2 text-[13px]">{children}</div>
  </section>
);

export const Live = ({ title, src, children }: { title: string; src?: string | undefined; children: ReactNode }) => (
  <section className="my-3 overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/20">
    <header className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-slate-500 dark:border-emerald-900 dark:bg-emerald-950/40">
      <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
      <span className="font-medium text-slate-700 dark:text-slate-200">{title}</span>
      {src ? <span className="ml-auto font-mono text-[11px]">{src}</span> : null}
    </header>
    <div className="px-3 py-2 text-[13px]">{children}</div>
  </section>
);

export const Chip = ({ tone = "plain", children }: { tone?: "plain" | "ok" | "warn" | "bad" | "accent"; children: ReactNode }) => (
  <span
    className={cn(
      "inline-flex items-center rounded border px-1.5 py-px text-xs",
      tone === "plain" && "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
      tone === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-700",
      tone === "warn" && "border-amber-200 bg-amber-50 text-amber-700",
      tone === "bad" && "border-red-200 bg-red-50 text-red-700",
      tone === "accent" && "border-indigo-200 bg-indigo-50 text-indigo-700",
    )}
  >
    {children}
  </span>
);

export const Table = ({ head, rows }: { head: ReadonlyArray<string>; rows: ReadonlyArray<ReadonlyArray<ReactNode>> }) => (
  <table className="w-full border-collapse text-[13px]">
    <thead>
      <tr>{head.map((h) => <th key={h} className="border-b border-slate-200 px-2 py-1 text-left text-[11.5px] font-medium text-slate-400 dark:border-slate-700">{h}</th>)}</tr>
    </thead>
    <tbody>
      {rows.map((r, i) => (
        <tr key={i} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
          {r.map((c, j) => <td key={j} className="px-2 py-1 align-top">{c}</td>)}
        </tr>
      ))}
    </tbody>
  </table>
);

export const Empty = ({ children }: { children: ReactNode }) => <p className="py-1 text-xs text-slate-400">{children}</p>;

export const ago = (at: number, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - at) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`;
};
