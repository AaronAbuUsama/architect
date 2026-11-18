import { Segment } from "@heroui-pro/react/segment";
import { operationViews, type Call, type CallFilter, type Operation, type OperationView, type ProofCheck } from "../types.ts";
import { budgetTone, ms, p95 } from "./shared.tsx";

export const OperationHeader = ({ operation, view, stage, calls, checks, href }: {
  operation: Operation;
  view: OperationView;
  stage: string | undefined;
  calls: readonly Call[] | undefined;
  checks: readonly ProofCheck[] | undefined;
  href: (name: string, tab?: OperationView, outcome?: CallFilter) => string;
}) => {
  const observed = calls === undefined ? undefined : p95(calls);
  const refused = calls?.filter((call) => call.outcome === "refused").length;
  const passed = checks?.filter((check) => check.passed).length;
  const tone = observed === undefined ? undefined : budgetTone(observed, operation.budget?.p95Ms);

  return <header className="op-page-heading">
    <div className="op-title-line">
      <h1 className="op-operation-name"><span>{operation.thing}.</span><strong>{operation.verb}</strong></h1>
      <Segment aria-label="Operation view" size="sm" selectedKey={view} onSelectionChange={(key) => {
        const next = operationViews.find((candidate) => key === candidate);
        if (next && next !== view) window.location.assign(href(operation.name, next));
      }}>
        {operationViews.map((name) => <Segment.Item key={name} id={name}>{name}</Segment.Item>)}
      </Segment>
    </div>
    {(stage || calls || !!checks?.length) && <div className="op-at-a-glance" aria-label="Operation status">
      {stage && <span>{stage}</span>}
      {!!checks?.length && <a href={href(operation.name, "Proof")} className={passed === checks.length ? "op-metric-success" : "op-metric-danger"}>
        {passed}/{checks.length} local evals
      </a>}
      {calls && <a href={href(operation.name, "Activity")}>{calls.length} observed {calls.length === 1 ? "call" : "calls"}</a>}
      {refused !== undefined && refused > 0 && <a href={href(operation.name, "Activity", "refused")} className="op-metric-warning">
        {refused} {refused === 1 ? "refusal" : "refusals"}
      </a>}
      {observed !== undefined && <a href={href(operation.name, "Activity")} className={tone && `op-metric-${tone}`}
        title={operation.budget ? `${ms(operation.budget.p95Ms)} budget` : undefined}>{ms(observed)} p95</a>}
    </div>}
  </header>;
};
