// An island: a library component that only works in the browser (Pro's BarChart, Command, HoverCard), rendered on
// the server as a fallback and mounted for real by `client.tsx`. Props travel as JSON, so they are plain data.
import type { ReactNode } from "react";

export type IslandName = "CallsBars" | "CommandPalette" | "StepPreviews" | "EnvCompare" | "GraphView";
export const Island = ({ name, props, children, className }: { name: IslandName; props: object; children?: ReactNode; className?: string }) => (
  <div className={className} data-island={name} data-props={JSON.stringify(props)}>{children}</div>
);
