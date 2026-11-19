// The mission board page: the Goal's tabs (GRILL Q2), the lanes, a card's detail where the switch says (GRILL Q3),
// and the hill climb (GRILL Q4). All state is UI state; everything shown comes from `derive.ts`.
import { Segment } from "@heroui-pro/react/segment";
import { Button, Chip, Modal, Tabs } from "@heroui/react";
import { ArrowLeftIcon, CaretRightIcon, FlagBannerIcon, WarningIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { changedSince, climb, climbTimes, join, matches, type Filter } from "../data/derive.ts";
import type { Board, CellId, CellState, Grid } from "../data/types.ts";
import { CardDetail, EndStateDetail } from "./detail.tsx";
import { HillClimb, type SinceOption } from "./climb.tsx";
import { Lanes } from "./lanes.tsx";
import { Overview } from "./overview.tsx";
import type { ColumnsBy, DetailAt } from "./vocab.ts";

export type Tab = "overview" | "board" | "climb";
export interface PageProps {
  readonly grid: Grid;
  readonly board: Board;
  readonly columns: ColumnsBy;  // switch 1 (GRILL Q1)
  readonly detail: DetailAt;    // switch 2 (GRILL Q3)
  readonly tab: Tab;
  readonly open: CellId | null; // the card open at first
}

type Open = { kind: "card"; cell: CellId } | { kind: "lane"; block: string } | null;
const show: Record<string, Filter["states"] | undefined> = {
  all: undefined, open: ["red", "partly", "built"] as CellState[], red: ["red"] as CellState[],
};

const when = (at: string) => at.slice(5, 16).replace("T", " ");

export const Page = (p: PageProps) => {
  const view = useMemo(() => join(p.grid, p.board), [p.grid, p.board]);
  const times = useMemo(() => climbTimes(p.board), [p.board]);
  const lanesClimb = useMemo(() => climb(p.grid, p.board, times), [p.grid, p.board, times]);
  const [tab, setTab] = useState<Tab>(p.tab);
  const [open, setOpen] = useState<Open>(p.open ? { kind: "card", cell: p.open } : null);
  const [states, setStates] = useState("all");
  const [since, setSince] = useState(p.grid.asOf);

  const options: SinceOption[] = [{ id: p.grid.asOf, label: "the grid" }, ...times.slice(-3).map((t) => ({ id: t, label: when(t) }))];
  const changes = since === p.grid.asOf ? changedSince(p.grid, p.board, "") : changedSince(p.grid, p.board, since);
  const filter: Filter = { states: show[states] };
  const lane = open?.kind === "card" ? view.lanes.find((l) => l.cards.some((c) => c.cell.id === open.cell)) : open ? view.lanes.find((l) => l.block.id === open.block) : undefined;
  const card = open?.kind === "card" ? lane?.cards.find((c) => c.cell.id === open.cell) : undefined;
  const close = () => setOpen(null);
  const toCard = (cell: CellId) => { setOpen({ kind: "card", cell }); setTab("board"); };

  const detail = lane && (card
    ? <CardDetail view={view} card={card} lane={lane} onCard={toCard} onClose={close} />
    : <EndStateDetail lane={lane} onClose={close} />);

  const board = (
    <>
      <div className="filters">
        <span className="muted small">Show</span>
        <Segment aria-label="Which cards" size="sm" selectedKey={states} onSelectionChange={(k) => setStates(String(k))}>
          <Segment.Item id="all">All cards</Segment.Item>
          <Segment.Item id="open">Not green yet</Segment.Item>
          <Segment.Item id="red">Red only</Segment.Item>
        </Segment>
      </div>
      <Lanes view={view} columns={p.columns} visible={(c) => matches(c, filter)} selected={card?.cell.id ?? null}
        onCard={toCard} onEndState={(l) => setOpen({ kind: "lane", block: l.block.id })} />
    </>
  );

  return (
    <div className="mb-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <span>Orthograph</span><CaretRightIcon size={12} aria-hidden="true" /><span aria-current="page">Goal</span>
      </nav>
      <header className="goal-head">
        <span className="goal-icon"><FlagBannerIcon size={20} aria-hidden="true" /></span>
        <h1>{view.goal.title}</h1>
        <p className="muted">{view.goal.summary}</p>
        <div className="props-row">
          <Chip size="sm" variant="soft">Graded at <span className="mono">{view.asOf}</span></Chip>
          <Chip size="sm" variant="soft"><span className="mono">{view.record}</span></Chip>
          <Chip size="sm" variant="soft" color="success">{view.score.green} green</Chip>
          <Chip size="sm" variant="soft" color="warning">{view.score.built} built</Chip>
          <Chip size="sm" variant="soft">of {view.score.needed} needed</Chip>
          {view.illustrative && <Chip size="sm" variant="soft" color="warning"><WarningIcon size={12} aria-hidden="true" />Made-up history, for the prototype</Chip>}
        </div>
      </header>
      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as Tab)} className="page-tabs">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Goal views">
            <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="board">Board<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="climb">Hill climb<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {tab === "overview" && <Overview view={view} />}
      {tab === "climb" && <HillClimb view={view} climb={lanesClimb} changes={changes} since={since} options={options} onSince={setSince} onCard={toCard} />}
      {tab === "board" && p.detail === "page" && detail && (
        <div className="detail-page">
          <Button size="sm" variant="ghost" onPress={close}><ArrowLeftIcon size={14} />Back to the board</Button>
          {detail}
        </div>
      )}
      {tab === "board" && !(p.detail === "page" && detail) && (
        <div className={p.detail === "panel" && detail ? "board-with-panel" : "board-only"}>
          <div className="board-main">{board}</div>
          {p.detail === "panel" && detail && <aside className="panel">{detail}</aside>}
        </div>
      )}
      {p.detail === "modal" && (
        <Modal.Backdrop isOpen={tab === "board" && !!detail} onOpenChange={(o) => { if (!o) close(); }}>
          <Modal.Container size="lg">
            <Modal.Dialog aria-label="Card detail">{detail}</Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
    </div>
  );
};
