// The live rail (Q6 A): scoped to the page, the same shape everywhere: stat tiles, calls per minute, the last calls.
import { lastCalls, statOf, sum } from "./live.ts";
import { model, operations } from "./model.ts";
import { Outcome, Spark, Tiles } from "./ui.tsx";

export const Rail = ({ scope }: { scope: { label: string; ops: string[] } }) => {
  const ops = scope.ops.length ? scope.ops.map((n) => model.operations[n]!) : operations;
  const s = ops.length === 1 ? statOf(ops[0]!) : sum(ops);
  const calls = lastCalls.filter((c) => !scope.ops.length || scope.ops.includes(c.op));
  return (
    <div className="rail">
      <div className="rail-head"><span className="dot dot--success" aria-hidden="true" /><strong>local · last 30 min</strong><span className="muted small">scope: {scope.label}</span></div>
      <Tiles s={s} compact worst={ops.length > 1} />
      <div className="rail-section">
        <div className="eyebrow">calls per minute</div>
        <Spark values={s.spark} label={`Calls per minute for ${scope.label} over the last 30 minutes`} w={300} h={44} />
      </div>
      <div className="rail-section">
        <div className="eyebrow">last calls</div>
        {calls.length === 0 && <p className="muted small">No calls in the window.</p>}
        <ul className="calls">
          {calls.map((c) => (
            <li key={c.at + c.op}><span className="mono muted">{c.at}</span><a className="mono" href={`op-${c.op}-spans.html`}>{c.op.split(".")[1]}</a>
              <span className="muted small">{c.who}</span><Outcome o={c.outcome} /><span className="mono muted">{c.ms} ms</span></li>))}
        </ul>
      </div>
    </div>
  );
};
