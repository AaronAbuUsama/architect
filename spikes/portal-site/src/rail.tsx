// The live rail (Q6 A): scoped to the page, the same shape everywhere. Calls split by outcome, p95 against budget,
// calls per minute as stacked bars, and the last calls.
import { KPI } from "@heroui-pro/react/kpi";
import { Chip } from "@heroui/react";
import { CallsBars } from "./kit/calls-bars.tsx";
import { CallsMeter } from "./kit/calls-meter.tsx";
import { EnvironmentPill } from "./kit/environment-pill.tsx";
import { lastCalls, perMinute, splitOf, statOf, sum } from "./live.ts";
import { environments, model, operations, page } from "./model.ts";
import { Outcome } from "./ui.tsx";

export const P95 = ({ p95, budget, worst }: { p95: number; budget: number | null; worst?: boolean }) => {
  const over = budget !== null && p95 > budget;
  return (
    <KPI className="p95-kpi"><KPI.Header><KPI.Title>{worst ? "worst p95" : "p95"}</KPI.Title></KPI.Header>
      <KPI.Content><span className={`kpi-text${over ? " tone-danger" : ""}`}>{p95}<span className="kpi-unit">ms</span></span>
        {budget !== null ? <Chip size="sm" variant="soft" color={over ? "danger" : "success"}>{over ? "over" : "within"} {budget} ms</Chip> : <Chip size="sm" variant="soft">no budget</Chip>}</KPI.Content></KPI>
  );
};

export const Rail = ({ scope }: { scope: { label: string; ops: string[] } }) => {
  const ops = scope.ops.length ? scope.ops.map((n) => model.operations[n]!) : operations;
  const s = ops.length === 1 ? statOf(ops[0]!) : sum(ops);
  const calls = lastCalls.filter((c) => !scope.ops.length || scope.ops.includes(c.op));
  return (
    <div className="rail">
      <div className="rail-head"><EnvironmentPill env={environments[0]!} live size="sm" /><Chip size="sm" variant="soft">last 30 min</Chip><Chip size="sm" variant="soft" color="accent" className="mono">{scope.label}</Chip></div>
      <CallsMeter split={splitOf(s)} label={scope.label} />
      <P95 p95={s.p95} budget={ops.length === 1 ? s.budget : null} worst={ops.length > 1} />
      <div className="rail-section">
        <div className="eyebrow">calls per minute</div>
        <CallsBars series={perMinute(s)} height={96} label={`Calls per minute for ${scope.label}, by outcome`} />
      </div>
      <div className="rail-section">
        <div className="eyebrow">last calls</div>
        {calls.length === 0 && <p className="muted small">No calls in the window.</p>}
        <ul className="calls">
          {calls.map((c) => (
            <li key={c.at + c.op}><span className="mono muted">{c.at}</span><a className="mono" href={page.op(c.op, "spans", c.outcome)}>{c.op.split(".")[1]}</a>
              <span className="small">{c.who}</span><Outcome o={c.outcome} /><span className="mono muted num">{c.ms} ms</span></li>))}
        </ul>
      </div>
    </div>
  );
};
