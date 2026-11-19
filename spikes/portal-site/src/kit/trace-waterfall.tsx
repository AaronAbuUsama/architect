// One call's trace: its attempts and the spine's rows as a waterfall, from span attributes (attempt, step.kind,
// commit.outcome, move.name, refusal.code). What the trace drawer shows when a call is opened.
import { Chip } from "@heroui/react";
import type { Trace } from "../trace.ts";

export const TraceWaterfall = ({ t }: { t: Trace }) => (
  <div className="trace">
    <p className="small muted">{t.summary}</p>
    <ol className="spine waterfall">{t.rows.map((r) => (
      <li key={r.key} className={r.depth ? "sub" : undefined}><span className="mono muted">{r.depth ? "└" : "├"}</span><span className="mono">{r.name}</span>
        <span className="mono muted">{r.attr}</span>
        <span className="wf-track"><span className={`bar${r.tone ? ` ${r.tone}` : ""}`} style={{ marginLeft: `${(r.start / t.total) * 100}%`, width: `${Math.max(0.6, (r.ms / t.total) * 100)}%` }} /></span>
        <span className="mono ms">{r.ms ? `${r.ms.toFixed(1)} ms` : ""}</span></li>))}</ol>
    <div className="trace__facts">
      <span className="chips"><Chip size="sm" variant="soft">caller: {t.callerKind}</Chip><Chip size="sm" variant="soft">attempts: {t.attempts}</Chip><Chip size="sm" variant="soft">logs: {t.logs}</Chip></span>
      <p className="small muted">Never shown here: the raw statement, which person called, log bodies, secret or private field values (M1.19; M1.13's no-leak check).</p>
    </div>
  </div>
);
