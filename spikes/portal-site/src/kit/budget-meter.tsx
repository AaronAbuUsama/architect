// BudgetMeter: p95 against the budget the operation declares, as a bar filled to p95 with the budget marked. Over
// budget turns it red. With no budget declared it says so instead of drawing a line it does not have.
import { Chip } from "@heroui/react";

export const BudgetMeter = ({ p95, budget, compact, worst }: { p95: number; budget: number | null; compact?: boolean; worst?: boolean }) => {
  const over = budget !== null && p95 > budget, scale = Math.max(p95, budget ?? 0) * 1.15 || 1;
  return (
    <div className={`budget-meter${compact ? " is-compact" : ""}${over ? " is-over" : ""}`} role="img" aria-label={`${worst ? "worst " : ""}p95 ${p95} ms${budget !== null ? `, budget ${budget} ms${over ? ", over" : ""}` : ", no budget"}`}>
      <div className="budget-meter__head"><span className="budget-meter__label">{worst ? "worst p95" : "p95"}</span><b>{p95}<small>ms</small></b>
        {budget !== null ? <Chip size="sm" variant="soft" color={over ? "danger" : "success"}>{over ? "over" : "within"} {budget} ms</Chip> : !compact && <Chip size="sm" variant="soft">no budget</Chip>}</div>
      <div className="budget-meter__track"><span className="budget-meter__fill" style={{ width: `${(p95 / scale) * 100}%` }} />
        {budget !== null && <span className="budget-meter__line" style={{ left: `${(budget / scale) * 100}%` }} />}</div>
    </div>
  );
};
