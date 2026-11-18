// One metric as a HeroUI Pro KPI: icon and title, the value beside a trend chip, optional progress or sparkline, footer.
// Several of them sit in a KPIGroup. All the pieces are Pro's; this only maps a metric's numbers onto them.
import { ArrowDown, ArrowUp } from "@gravity-ui/icons";
import { KPIGroup, TrendChip } from "@heroui-pro/react";
import { KPI } from "@heroui-pro/react/kpi";
import type { ComponentProps, ReactNode } from "react";

type Status = "success" | "warning" | "danger";
export type Metric = {
  title: string; icon: ReactNode; value: number; status?: Status;
  /** How the number reads: Pro's NumberValue options, and an optional wrapper such as "%" or "of 17". */
  number?: Omit<ComponentProps<typeof KPI.Value>, "value" | "children">; render?: (formatted: string) => ReactNode;
  /** Change since the previous day; `lowerIsBetter` flips which direction is good. */
  delta?: { change: number; unit?: string; lowerIsBetter?: boolean };
  progress?: number; spark?: Array<number | null>; sparkColor?: string; footer?: ReactNode;
};

function Trend({ change, unit = "", lowerIsBetter }: NonNullable<Metric["delta"]>) {
  const tone = change === 0 ? "neutral" : change > 0 !== !!lowerIsBetter ? "up" : "down", Arrow = change > 0 ? ArrowUp : ArrowDown;
  return <KPI.Trend trend={tone}>{change !== 0 && <TrendChip.Indicator><Arrow /></TrendChip.Indicator>}{Math.abs(Math.round(change * 10) / 10)}{unit}</KPI.Trend>;
}

export function MetricKPI({ title, icon, value, status, number, render, delta, progress, spark, sparkColor, footer }: Metric) {
  return (
    <KPI>
      <KPI.Header><KPI.Icon status={status}>{icon}</KPI.Icon><KPI.Title>{title}</KPI.Title></KPI.Header>
      <KPI.Content><KPI.Value value={value} {...number}>{render}</KPI.Value>{delta && <Trend {...delta} />}</KPI.Content>
      {progress !== undefined && <KPI.Progress value={Math.min(100, progress)} status={status} />}
      {spark && <KPI.Chart data={spark.map((v) => ({ value: v }))} color={sparkColor ?? "var(--accent)"} height={48} />}
      {footer && <><KPI.Separator /><KPI.Footer className="text-xs text-muted">{footer}</KPI.Footer></>}
    </KPI>
  );
}

/** Metrics on one shared surface, hairline between each; stacks on a phone. */
export function MetricGroup({ metrics }: { metrics: Metric[] }) {
  return (
    <KPIGroup className="max-sm:flex-col">
      {metrics.flatMap((m, i) => [i > 0 && <KPIGroup.Separator key={`s${i}`} className="max-sm:hidden" />, <MetricKPI key={m.title} {...m} />])}
    </KPIGroup>
  );
}
