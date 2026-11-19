// A Graph with its lightings to switch between (structure, live, a trace). Server-rendered on the first one, then
// mounted as an island so the switch, the hover and pan and zoom work.
import { Segment } from "@heroui-pro/react";
import { useState } from "react";
import { Graph } from "./graph.tsx";
import type { Laid, Lighting } from "./types.ts";

const name = (l: Lighting) => l.mode === "structure" ? "Structure" : l.mode === "live" ? `Live · ${l.window.split("· ")[1]}` : `Trace · ${l.name}`;

export const GraphView = ({ graph, lightings, start = 0, label, height, width, controls }: { graph: Laid; lightings: Lighting[]; start?: number; label: string; height?: number; width?: number; controls?: boolean }) => {
  const [i, setI] = useState(start);
  return (
    <div className="g-view">
      {lightings.length > 1 && (
        <Segment selectedKey={String(i)} onSelectionChange={(k) => setI(Number(k))} aria-label={`Light ${label} by`} size="sm">
          {lightings.map((l, n) => <Segment.Item key={n} id={String(n)}>{name(l)}</Segment.Item>)}
        </Segment>
      )}
      <Graph graph={graph} lighting={lightings[i]} label={label} height={height} width={width} controls={controls} />
    </div>
  );
};
