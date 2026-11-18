// Small shared pieces: outcome colours, durations, file links, section frames.
import type { ReactNode } from "react";
import { Chip } from "@heroui/react";
import type { Outcome } from "../page/types.ts";

export const ms = (n: number | undefined) => (n === undefined ? "—" : n < 1 ? "<1 ms" : `${Math.round(n)} ms`);
export const ago = (t: number, now: number) => {
  const s = Math.max(0, Math.round((now - t) / 1000));
  return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`;
};
export const clock = (t: number) => new Date(t).toISOString().slice(11, 23);

export const colorOf: Record<Outcome, string> = { answered: "var(--ok)", refused: "var(--refusal)", defect: "var(--defect)" };

export const OutcomeChip = ({ outcome, tag }: { outcome: Outcome; tag?: string | undefined }) => (
  <Chip size="sm" variant="soft" color={outcome === "answered" ? "success" : outcome === "refused" ? "warning" : "danger"} className="mono">
    {outcome === "answered" ? "answered" : outcome === "defect" ? "defect" : tag}
  </Chip>
);

/** Absolute path for `vscode://file/…`: the repo root is the portal server's working tree. */
export const REPO = (import.meta.env["VITE_REPO_ROOT"] as string | undefined) ?? "";
export const FileLink = ({ path, children }: { path: string; children?: ReactNode }) => (
  <a className="mono text-xs text-accent hover:underline" href={REPO ? `vscode://file/${REPO}/${path}` : `#${path}`} title={`open ${path}`}>
    {children ?? path}
  </a>
);

export const Section = ({ title, right, children, id }: { title: ReactNode; right?: ReactNode; children: ReactNode; id?: string }) => (
  <section id={id} className="rounded-xl border border-border bg-surface">
    <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
      {right}
    </header>
    <div className="p-3">{children}</div>
  </section>
);

export const Mono = ({ children, className = "" }: { children: ReactNode; className?: string }) => <span className={`mono ${className}`}>{children}</span>;
