import { Kanban } from "@heroui-pro/react/kanban";
import type { Item } from "./board.ts";

/** One card's face: everything inside a Kanban.Card is ours to draw. */
export const CardFace = ({ item }: { item: Item }) => (
  <div className="flex flex-col gap-1 text-sm">
    <div className="flex items-center gap-2">
      <Kanban.DragHandle aria-label={`Drag ${item.title}`} />
      <span className="font-medium">{item.title}</span>
    </div>
    <div className="flex flex-wrap gap-2 text-xs opacity-70">
      <span>{item.id}</span>
      <span>{item.lane === "agent" ? "agent" : "person"}</span>
      {item.lease ? <span>held by {item.lease.holder}</span> : null}
      {item.needs.length > 0 ? <span>needs {item.needs.join(", ")}</span> : null}
      <span>{item.touches.join(" ")}</span>
    </div>
  </div>
);
