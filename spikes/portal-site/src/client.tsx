// The browser build: mounts each island (kit/island.tsx) with the real library component. Built by tools/build.sh
// into out/site/islands.js. Everything else on the page stays as the server rendered it.
import { BarChart } from "@heroui-pro/react/bar-chart";
import { HoverCard } from "@heroui-pro/react";
import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import { Sequence, type StepWrap } from "./flow.tsx";
import { journeys } from "./journeys.ts";
import type { MinuteCalls } from "./live.ts";
import { callsBarKeys } from "./kit/calls-bars.tsx";
import { CommandPalette } from "./kit/command-palette.tsx";
import { EnvCompare } from "./pages/env-compare.tsx";
import { StepCard } from "./kit/step-card.tsx";
import { GraphView } from "../../react-flow-graphs/src/graph/graph-view.tsx";
import { CallsTable } from "./kit/calls-table.tsx";

const CallsBars = ({ series, height }: { series: MinuteCalls[]; height: number }) => (
  <BarChart data={series} height={height} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
    <BarChart.Grid vertical={false} />
    <BarChart.XAxis dataKey="m" tickMargin={6} interval={9} />
    <BarChart.YAxis width={28} allowDecimals={false} />
    {callsBarKeys.map((k, i) => <BarChart.Bar key={k.key} dataKey={k.key} name={k.label} stackId="calls" fill={k.color} isAnimationActive={false} radius={i === 2 ? [2, 2, 0, 0] : 0} />)}
    <BarChart.Tooltip cursor={{ fill: "var(--default)", opacity: 0.4 }} content={<BarChart.TooltipContent indicator="dot" />} />
  </BarChart>
);

// `#preview-3` opens step 3's preview on load, so a screenshot can show one.
const shown = Number(/^#preview-(\d+)$/.exec(location.hash)?.[1] ?? 0) - 1;
const Hover: StepWrap = ({ j, i, children }) => (
  <HoverCard openDelay={150} closeDelay={120} defaultOpen={i === shown}>
    <HoverCard.Trigger>{children}</HoverCard.Trigger>
    <HoverCard.Content placement="bottom"><HoverCard.Arrow /><StepCard j={j} i={i} /></HoverCard.Content>
  </HoverCard>
);
const StepPreviews = ({ slug }: { slug: string }) => <Sequence j={journeys.find((j) => j.slug === slug)!} Wrap={Hover} />;

const islands: Record<string, ComponentType<any>> = { CallsBars, CommandPalette, StepPreviews, EnvCompare, CallsTable, GraphView };
for (const el of document.querySelectorAll<HTMLElement>("[data-island]")) {
  const C = islands[el.dataset.island!];
  if (C) createRoot(el).render(<C {...JSON.parse(el.dataset.props ?? "{}")} />);
}
document.documentElement.dataset.islands = "ready";

// Sidebar items carry `data-href` (React Aria routes them in the browser); with no router here, follow it.
document.addEventListener("click", (e) => {
  const item = (e.target as HTMLElement).closest<HTMLElement>("[data-href]");
  if (item && !(e.target as HTMLElement).closest("[data-slot='sidebar-menu-trigger']")) location.href = item.dataset.href!;
});
