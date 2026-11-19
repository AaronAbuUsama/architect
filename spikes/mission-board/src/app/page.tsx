// The mission board page, composed only from the components in `src/components` (the same ones the stories show, so
// the two cannot drift). Tabs: the goal written once, the grid, the board of lanes, and the hill climb. UI state only;
// everything shown comes from `derive.ts`.
import { Segment } from "@heroui-pro/react/segment";
import { Widget } from "@heroui-pro/react/widget";
import { Button, Chip, Modal, Tabs } from "@heroui/react";
import { ArrowLeftIcon, CaretRightIcon, FlagBannerIcon, WarningIcon } from "@phosphor-icons/react";
import { useMemo, useState, type ReactNode } from "react";
import { CardDetail } from "../components/CardDetail/CardDetail.tsx";
import { ChangedList } from "../components/ChangedList/ChangedList.tsx";
import { ClimbChart } from "../components/ClimbChart/ClimbChart.tsx";
import { CoverageMatrix } from "../components/CoverageMatrix/CoverageMatrix.tsx";
import { GoalOverview } from "../components/GoalOverview/GoalOverview.tsx";
import { GoalScore } from "../components/GoalScore/GoalScore.tsx";
import { Lane } from "../components/Lane/Lane.tsx";
import { LaneEndState } from "../components/LaneEndState/LaneEndState.tsx";
import { columnsFor, type ColumnsBy, type DetailAt } from "../components/shared/vocab.ts";
import { changedSince, climb, climbTimes, join, matches, scoreAt, type Filter } from "../data/derive.ts";
import type { Board, CellId, CellState, Grid } from "../data/types.ts";

export type Tab = "overview" | "grid" | "board" | "climb";
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
const tabWord: Record<Tab, string> = { overview: "overview", grid: "grid", board: "board", climb: "hill climb" };
const when = (at: string) => at.slice(5, 16).replace("T", " ");

export const Page = (p: PageProps) => {
  const view = useMemo(() => join(p.grid, p.board), [p.grid, p.board]);
  const times = useMemo(() => climbTimes(p.board), [p.board]);
  const lanesClimb = useMemo(() => climb(p.grid, p.board, times), [p.grid, p.board, times]);
  const [tab, setTab] = useState<Tab>(p.tab);
  const [open, setOpen] = useState<Open>(p.open ? { kind: "card", cell: p.open } : null);
  const [block, setBlock] = useState<string>(view.lanes[0]!.block.id);
  const [states, setStates] = useState("all");
  const [since, setSince] = useState(p.grid.asOf);

  const options = [{ id: p.grid.asOf, label: "the grid" }, ...times.slice(-3).map((t) => ({ id: t, label: when(t) }))];
  const changes = changedSince(p.grid, p.board, since === p.grid.asOf ? "" : since);
  const moved = new Set(changes.map((c) => c.cell));
  const sinceIdx = lanesClimb[0]?.points.findIndex((x) => x.at === since) ?? -1;
  const sinceLabel = `since ${options.find((o) => o.id === since)?.label ?? since}`;
  const columns = columnsFor(p.columns, view.outputs, view.lanes);
  const filter: Filter = { states: show[states] };
  const lane = open?.kind === "card" ? view.lanes.find((l) => l.cards.some((c) => c.cell.id === open.cell))
    : open ? view.lanes.find((l) => l.block.id === open.block) : undefined;
  const card = open?.kind === "card" ? lane?.cards.find((c) => c.cell.id === open.cell) : undefined;
  const close = () => setOpen(null);
  const toCard = (cell: CellId) => setOpen({ kind: "card", cell }); // opens where you are: the panel sits beside every tab with cards
  const toLane = (b: string) => { setBlock(b); setOpen({ kind: "lane", block: b }); };

  const detail = lane && (card
    ? <CardDetail card={card} lane={lane} view={view} layout={p.detail === "page" ? "page" : "panel"} onCard={toCard} onClose={close} />
    : <LaneEndState lane={lane} onClose={close} />);
  const withDetail = (main: ReactNode) => (
    <div className={p.detail === "panel" && detail ? "board-with-panel" : "board-only"}>
      <div className="board-main">{main}</div>
      {p.detail === "panel" && detail && <aside className="panel">{detail}</aside>}
    </div>
  );
  const asPage = p.detail === "page" && tab !== "overview" && !!detail; // a full page replaces any tab with cards
  const laneOf = (id: string) => view.lanes.find((l) => l.block.id === id)!;
  const gridBlock = lane?.block.id ?? block; // the Grid tab shows the lane of whatever is open

  return (
    <div className="mb-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <span>Orthograph</span><CaretRightIcon size={12} aria-hidden="true" /><span aria-current="page">Goal</span>
      </nav>
      <header className="goal-head">
        <h1><span className="goal-icon"><FlagBannerIcon size={20} aria-hidden="true" /></span>{view.goal.title}</h1>
        <p className="muted">{view.goal.summary}</p>
        <div className="props-row">
          <Chip size="sm" variant="soft">Graded at&nbsp;<span className="mono">{view.asOf}</span></Chip>
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
            <Tabs.Tab id="grid">Grid<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="board">Board<Tabs.Indicator /></Tabs.Tab>
            <Tabs.Tab id="climb">Hill climb<Tabs.Indicator /></Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {tab === "overview" && <GoalOverview view={view} onOutput={() => setTab("grid")} />}

      {tab === "grid" && !asPage && withDetail(
        <div className="grid-tab">
          <CoverageMatrix lanes={view.lanes} outputs={view.outputs} selected={card?.cell.id ?? null} onCard={(c) => setOpen({ kind: "card", cell: c })} onLane={toLane} />
          <Lane lane={laneOf(gridBlock)} outputs={view.outputs} columns={columns} by={p.columns} selected={card?.cell.id ?? null}
            onCard={(c) => setOpen({ kind: "card", cell: c })} onEndState={(l) => toLane(l.block.id)} />
        </div>,
      )}

      {asPage && (
        <div className="detail-page">
          <Button size="sm" variant="ghost" onPress={close}><ArrowLeftIcon size={14} />Back to the {tabWord[tab]}</Button>
          {detail}
        </div>
      )}
      {tab === "board" && !asPage && withDetail(
        <>
          <div className="filters">
            <span className="muted small">Show</span>
            <Segment aria-label="Which cards" size="sm" selectedKey={states} onSelectionChange={(k) => setStates(String(k))}>
              <Segment.Item id="all">All cards</Segment.Item>
              <Segment.Item id="open">Not green yet</Segment.Item>
              <Segment.Item id="red">Red only</Segment.Item>
            </Segment>
          </div>
          <div className="lanes">
            {view.lanes.map((l) => (
              <Lane key={l.block.id} lane={l} outputs={view.outputs} columns={columns} by={p.columns} visible={(c) => matches(c, filter)}
                selected={card?.cell.id ?? null} onCard={toCard} onEndState={(x) => setOpen({ kind: "lane", block: x.block.id })} />
            ))}
          </div>
        </>,
      )}

      {tab === "climb" && !asPage && withDetail(
        <div className="climb-tab">
          <div className="climb-bar">
            <span className="muted small">Since</span>
            <Segment aria-label="Compare with" size="sm" selectedKey={since} onSelectionChange={(k) => setSince(String(k))}>
              {options.map((o) => <Segment.Item key={o.id} id={o.id}>{o.label}</Segment.Item>)}
            </Segment>
          </div>
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>Where the grid stands</Widget.Title><Widget.Description>Of {view.score.needed} needed cards</Widget.Description></div></Widget.Header>
            <GoalScore now={view.score} then={sinceIdx >= 0 ? scoreAt(lanesClimb, sinceIdx) : null} sinceLabel={sinceLabel} />
          </Widget>
          <div className="climb-grid">
            <Widget>
              <Widget.Header><div className="head-text"><Widget.Title>Every card</Widget.Title><Widget.Description>Outlined: moved {sinceLabel}</Widget.Description></div></Widget.Header>
              <Widget.Content><CoverageMatrix lanes={view.lanes} outputs={view.outputs} moved={moved} selected={card?.cell.id ?? null} onCard={toCard} onLane={toLane} /></Widget.Content>
            </Widget>
            <Widget>
              <Widget.Header><div className="head-text"><Widget.Title>What moved</Widget.Title><Widget.Description>{changes.length} moves {sinceLabel}, newest first</Widget.Description></div></Widget.Header>
              <Widget.Content><ChangedList changes={changes} lanes={view.lanes} onCard={toCard} /></Widget.Content>
            </Widget>
          </div>
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>Green and built over time</Widget.Title><Widget.Description>Across all {view.score.needed} needed cards, one point per recorded move</Widget.Description></div></Widget.Header>
            <Widget.Legend><Widget.LegendItem color="var(--success)">Green</Widget.LegendItem><Widget.LegendItem color="var(--warning)">Built</Widget.LegendItem></Widget.Legend>
            <Widget.Content><ClimbChart climb={lanesClimb} /></Widget.Content>
          </Widget>
        </div>,
      )}

      {p.detail === "modal" && (
        <Modal.Backdrop isOpen={tab !== "overview" && !!detail} onOpenChange={(o) => { if (!o) close(); }}>
          <Modal.Container size="lg">
            <Modal.Dialog aria-label="Detail">{detail}</Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
    </div>
  );
};
