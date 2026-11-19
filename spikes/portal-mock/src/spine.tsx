// The spine (Q5 A): the fixed order every Effect operation runs in, drawn from the model, with one call down it.
import { Chip } from "@heroui/react";
import type { Row } from "./data.ts";

const bar = (tone?: Row["tone"]) => tone === "warning" ? "var(--warning)" : tone === "success" ? "var(--success)" : tone === "danger" ? "var(--danger)" : "var(--accent)";

/** Rows on the left, each row's time as a bar on the call's timeline. */
export function Waterfall({ rows, total, wide }: { rows: Row[]; total: number; wide?: boolean }) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      {rows.map((r) => (
        <div key={r.label} className="grid items-center gap-2" style={{ gridTemplateColumns: wide ? "15rem 9rem 1fr 10rem" : "9rem 1fr 4.5rem" }}>
          <span className="truncate" style={{ paddingLeft: (r.depth ?? 0) * 14 }}>
            <span className="mr-1 text-muted">{r.depth ? "└" : "├"}</span><span className="font-medium">{r.label}</span></span>
          {wide && <span className="truncate text-muted">{r.detail}</span>}
          <span className="relative h-3.5 rounded bg-surface-secondary">
            <span className="absolute inset-y-0 rounded" style={{ left: `${(r.start / total) * 100}%`, width: `max(3px, ${(r.ms / total) * 100}%)`, background: bar(r.tone) }} />
          </span>
          <span className="flex items-center justify-end gap-1 tabular-nums">
            {r.tone ? <Chip size="sm" color={r.tone} variant="soft">{r.result}</Chip> : <span className="text-muted">{r.result}</span>}
            {wide && <span className="w-10 text-right text-muted">{r.ms} ms</span>}
          </span>
        </div>))}
    </div>
  );
}
