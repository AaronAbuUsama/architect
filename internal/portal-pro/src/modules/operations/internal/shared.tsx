import { KPI } from "@heroui-pro/react/kpi";
import { KPIGroup } from "@heroui-pro/react/kpi-group";
import { Chip } from "@heroui/react";
import { Fragment } from "react";
import type { Call } from "../types.ts";

export const outcomeLabel = { answered: "Answered", refused: "Refused", defect: "Defect", unknown: "Unknown" } as const;
export const result = (call: Call) => call.refusal ?? outcomeLabel[call.outcome];

export const ms = (value: number) => `${Number(value.toFixed(1))} ms`;
export const utc = (value: number) => new Date(value).toISOString().slice(11, 19);
export const p95 = (calls: readonly Call[]) => {
  const sorted = calls.filter((call) => call.reached).map((call) => call.ms).sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * .95) - 1];
};

type MetricTone = "success" | "warning" | "danger";

export const budgetTone = (value: number, budget: number | undefined): MetricTone | undefined =>
  budget === undefined ? undefined : value <= budget ? "success" : "warning";

export const Metrics = ({ items }: { items: readonly {
  label: string; value: number; unit?: string; note?: string; tone?: MetricTone | undefined;
}[] }) => (
  <KPIGroup className="op-metrics">
    {items.map(({ label, value, unit, note, tone }, index) => (
      <Fragment key={label}>
        {index > 0 && <KPIGroup.Separator />}
        <KPI className="op-kpi">
          <KPI.Header><KPI.Title>{label}</KPI.Title></KPI.Header>
          <KPI.Content className={tone && `op-metric-${tone}`}><KPI.Value value={value} maximumFractionDigits={1} />{unit && <span className="op-metric-unit">{unit}</span>}</KPI.Content>
          {note && <p>{note}</p>}
        </KPI>
      </Fragment>
    ))}
  </KPIGroup>
);

export const Outcome = ({ pass }: { pass: boolean }) => (
  <Chip size="sm" variant="soft" color={pass ? "success" : "danger"}>{pass ? "Passed" : "Failed"}</Chip>
);
