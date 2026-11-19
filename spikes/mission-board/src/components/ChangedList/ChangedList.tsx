// What moved since a point: one Timeline item per move, newest first, each naming the card and linking to it.
import { Timeline } from "@heroui-pro/react/timeline";
import type { Change, LaneView } from "../../data/derive.ts";
import type { CellId } from "../../data/types.ts";
import { stateWord } from "../shared/vocab.ts";

export interface ChangedListProps {
  readonly changes: ReadonlyArray<Change>;
  readonly lanes: ReadonlyArray<LaneView>;
  readonly onCard?: (cell: CellId) => void;
}

export const ChangedList = ({ changes, lanes, onCard }: ChangedListProps) => {
  const name = (c: CellId) => {
    const l = lanes.find((x) => x.cards.some((k) => k.cell.id === c));
    const card = l?.cards.find((k) => k.cell.id === c);
    return l && card ? `${l.block.name} · ${card.output.name}` : c;
  };
  if (changes.length === 0) return <p className="muted">Nothing has moved.</p>;
  return (
    <Timeline size="sm">
      {changes.map((c) => (
        <Timeline.Item key={c.cell + c.event.at} status={c.event.state === "green" ? "success" : "current"}>
          <Timeline.Rail><Timeline.Marker /><Timeline.Connector /></Timeline.Rail>
          <Timeline.Content>
            <button type="button" className="link" onClick={() => onCard?.(c.cell)}>{name(c.cell)}</button>
            <p className="small">{stateWord[c.from]} → <b>{stateWord[c.event.state]}</b> <span className="muted mono">{c.event.at.slice(5, 16).replace("T", " ")}</span></p>
            <p className="muted small">{c.event.note}</p>
          </Timeline.Content>
        </Timeline.Item>
      ))}
    </Timeline>
  );
};
