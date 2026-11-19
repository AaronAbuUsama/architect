// One building block's lane: its name, summary, end state and score, then its cards in a HeroUI Pro Kanban whose
// columns come from the columns switch (GRILL Q1). Takes a `LaneView` from derive.ts and nothing else.
import { Kanban } from "@heroui-pro/react/kanban";
import { FlagBannerIcon } from "@phosphor-icons/react";
import type { CardView, LaneView } from "../../data/derive.ts";
import type { CellId, Output } from "../../data/types.ts";
import { ColumnHeader } from "../ColumnHeader/ColumnHeader.tsx";
import { OutputCard } from "../OutputCard/OutputCard.tsx";
import type { Column, ColumnsBy } from "../shared/vocab.ts";
import { columnOf } from "../shared/vocab.ts";

export interface LaneProps {
  readonly lane: LaneView;
  readonly outputs: ReadonlyArray<Output>;
  readonly columns: ReadonlyArray<Column>;
  readonly by: ColumnsBy;
  readonly visible?: (c: CardView) => boolean;
  readonly selected?: CellId | null;
  readonly onCard?: (cell: CellId) => void;
  readonly onEndState?: (lane: LaneView) => void;
}

/** The outputs this card waits on that are still red or partly: the ones actually holding it back. */
export const heldBy = (lane: LaneView, outputs: ReadonlyArray<Output>, card: CardView): string[] =>
  card.waitsOn
    .filter((o) => ["red", "partly"].includes(lane.cards.find((c) => c.output.id === o)?.state ?? ""))
    .map((o) => outputs.find((x) => x.id === o)?.name ?? o);

export const Lane = ({ lane, outputs, columns, by, visible = () => true, selected = null, onCard, onEndState }: LaneProps) => {
  const cards = lane.cards.filter(visible);
  const s = lane.score;
  return (
    <section className="lane" aria-label={lane.block.name}>
      <header className="lane-head">
        <div className="lane-name">
          <h2>{lane.block.name}</h2>
          <p className="muted">{lane.block.summary}</p>
        </div>
        <button type="button" className="end-chip" onClick={() => onEndState?.(lane)} title={lane.block.endState.description}>
          <FlagBannerIcon size={14} aria-hidden="true" /><span>{lane.block.endState.title}</span>
        </button>
        <span className="lane-score mono" aria-label={`${s.green} green and ${s.built} built of ${s.needed} needed`}>
          <b>{s.green}</b> green · <b>{s.built}</b> built · of {s.needed}
        </span>
      </header>
      <Kanban className="lane-board" aria-label={`${lane.block.name} cards`}>
        {columns.map((col) => {
          const items = cards.filter((c) => columnOf(by, c) === col.id);
          return (
            <Kanban.Column key={col.id} className="lane-col">
              <ColumnHeader column={col} count={items.length} />
              <Kanban.ColumnBody>
                <Kanban.CardList
                  aria-label={`${lane.block.name}: ${col.title}`}
                  items={items.map((c) => ({ id: c.cell.id, c }))}
                  onAction={(key) => onCard?.(key as CellId)}
                  renderEmptyState={() => <span className="muted small">None</span>}
                >
                  {({ c }) => (
                    <Kanban.Card textValue={`${lane.block.name} ${c.output.name}`} className={selected === c.cell.id ? "is-selected" : undefined}>
                      <OutputCard card={c} block={lane.block.name} heldBy={heldBy(lane, outputs, c)} />
                    </Kanban.Card>
                  )}
                </Kanban.CardList>
              </Kanban.ColumnBody>
            </Kanban.Column>
          );
        })}
      </Kanban>
    </section>
  );
};
