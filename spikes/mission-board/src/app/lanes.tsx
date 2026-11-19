// The Board tab: one HeroUI Pro Kanban per lane (Kanban has no swim lanes; GRILL Q1), columns from the switch.
import { Kanban } from "@heroui-pro/react/kanban";
import { Chip } from "@heroui/react";
import { FlagBannerIcon, HourglassMediumIcon, QuestionIcon, UserCircleIcon } from "@phosphor-icons/react";
import type { BoardView, CardView, LaneView } from "../data/derive.ts";
import type { CellId } from "../data/types.ts";
import { chipColor, type ColumnsBy, columnOf, columnsFor, stageName, stageOf, stateTone, stateWord } from "./vocab.ts";

export interface LanesProps {
  readonly view: BoardView;
  readonly columns: ColumnsBy;
  readonly visible: (c: CardView) => boolean;
  readonly selected: CellId | null;
  readonly onCard: (cell: CellId) => void;
  readonly onEndState: (lane: LaneView) => void;
}

const names = (view: BoardView, ids: ReadonlyArray<string>) =>
  ids.map((id) => view.outputs.find((o) => o.id === id)?.name ?? id).join(", ");

/** The outputs this card waits on that are still red or partly: the ones actually holding it back. */
const blocking = (lane: LaneView, card: CardView) =>
  card.waitsOn.filter((o) => ["red", "partly"].includes(lane.cards.find((c) => c.output.id === o)?.state ?? ""));

const OutputCard = ({ view, lane, card, columns }: { view: BoardView; lane: LaneView; card: CardView; columns: ColumnsBy }) => {
  const held = blocking(lane, card);
  return (
    <>
      <span className="card-top">
        <span className="card-title">{card.output.name}</span>
        {card.thread
          ? <span className="thread" title={card.thread.name}><span aria-hidden="true">{card.thread.emoji}</span>{card.thread.name}</span>
          : <span className="thread"><UserCircleIcon size={13} aria-hidden="true" />nobody</span>}
      </span>
      <span className="card-chips">
        {columns !== "state" && <Chip size="sm" variant="soft" color={chipColor(stateTone[card.state])}>{stateWord[card.state]}</Chip>}
        {card.task && <Chip size="sm" variant="soft"><span className="mono">{card.task.ref}</span> · {stageName(stageOf(card))}</Chip>}
        {card.question && <Chip size="sm" variant="soft" color="warning"><QuestionIcon size={12} aria-hidden="true" />{card.question.id}</Chip>}
        {card.proposedNotNeeded && <Chip size="sm" variant="soft">Proposed not needed</Chip>}
      </span>
      {held.length > 0 && (
        <span className="card-waits"><HourglassMediumIcon size={12} aria-hidden="true" />Held by {names(view, held)}</span>
      )}
    </>
  );
};

const Lane = ({ lane, props }: { lane: LaneView; props: LanesProps }) => {
  const cols = columnsFor(props.columns, props.view);
  const cards = lane.cards.filter(props.visible);
  const s = lane.score;
  return (
    <section className="lane" aria-label={lane.block.name}>
      <header className="lane-head">
        <div className="lane-name">
          <h2>{lane.block.name}</h2>
          <p className="muted">{lane.block.summary}</p>
        </div>
        <button type="button" className="end-chip" onClick={() => props.onEndState(lane)} title={lane.block.endState.description}>
          <FlagBannerIcon size={14} aria-hidden="true" /><span>{lane.block.endState.title}</span>
        </button>
        <span className="lane-score mono" aria-label={`${s.green} green and ${s.built} built of ${s.needed} needed`}>
          <b>{s.green}</b> green · <b>{s.built}</b> built · of {s.needed}
        </span>
      </header>
      <Kanban size="sm" className="lane-board" aria-label={`${lane.block.name} cards`}>
        {cols.map((col) => {
          const items = cards.filter((c) => columnOf(props.columns, c) === col.id);
          return (
            <Kanban.Column key={col.id} className="lane-col">
              <Kanban.ColumnHeader>
                <Kanban.ColumnIndicator className={`tone-${col.tone}`} />
                <Kanban.ColumnTitle>{col.title}</Kanban.ColumnTitle>
                <Kanban.ColumnCount>{items.length}</Kanban.ColumnCount>
              </Kanban.ColumnHeader>
              <Kanban.ColumnBody>
                <Kanban.CardList
                  aria-label={`${lane.block.name}: ${col.title}`}
                  items={items.map((c) => ({ id: c.cell.id, c }))}
                  onAction={(key) => props.onCard(key as CellId)}
                  renderEmptyState={() => <span className="muted small">None</span>}
                >
                  {({ c }) => (
                    <Kanban.Card
                      textValue={`${lane.block.name} ${c.output.name}`}
                      className={`out-card${c.proposedNotNeeded ? " is-proposed" : ""}${props.selected === c.cell.id ? " is-selected" : ""}`}
                    >
                      <OutputCard view={props.view} lane={lane} card={c} columns={props.columns} />
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

export const Lanes = (props: LanesProps) => (
  <div className="lanes">{props.view.lanes.map((l) => <Lane key={l.block.id} lane={l} props={props} />)}</div>
);
