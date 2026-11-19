// The Hill climb tab (GRILL Q4): where each lane stands, what moved since a point, and the climb over time.
import { KPI } from "@heroui-pro/react/kpi";
import { KPIGroup } from "@heroui-pro/react/kpi-group";
import { Segment } from "@heroui-pro/react/segment";
import { Timeline } from "@heroui-pro/react/timeline";
import { Widget } from "@heroui-pro/react/widget";
import type { BoardView, Change, LaneClimb, Score } from "../data/derive.ts";
import type { CellId, CellState } from "../data/types.ts";
import { stateWord } from "./vocab.ts";

const kpis: ReadonlyArray<CellState> = ["green", "built", "partly", "red"];
const count = (s: Score, k: CellState) => (k === "not-needed" ? s.notNeeded : s[k]);

export const ScoreKPIs = ({ now, then, sinceLabel }: { now: Score; then: Score | null; sinceLabel: string }) => (
  <KPIGroup className="widget-kpis">
    {kpis.map((k, i) => {
      const delta = then ? count(now, k) - count(then, k) : 0;
      return [
        i > 0 && <KPIGroup.Separator key={`sep-${k}`} />,
        <KPI key={k}>
          <KPI.Header><KPI.Title>{stateWord[k]}</KPI.Title></KPI.Header>
          <KPI.Content>
            <KPI.Value value={count(now, k)} maximumFractionDigits={0} />
            {then && delta !== 0 && <KPI.Trend trend={delta > 0 ? "up" : "down"}>{Math.abs(delta)} {sinceLabel}</KPI.Trend>}
          </KPI.Content>
        </KPI>,
      ];
    })}
  </KPIGroup>
);

const Matrix = ({ view, moved, onCard }: { view: BoardView; moved: ReadonlySet<CellId>; onCard: (c: CellId) => void }) => (
  <div className="matrix" role="grid" aria-label="Every card by lane and output">
    <div className="m-row m-head" role="row">
      <span role="columnheader" />
      {view.outputs.map((o) => <span key={o.id} role="columnheader" className="m-out">{o.name}</span>)}
    </div>
    {view.lanes.map((l) => (
      <div key={l.block.id} className="m-row" role="row">
        <span role="rowheader" className="m-lane">{l.block.name}</span>
        {l.cards.map((c) => (
          <button
            key={c.cell.id} type="button" role="gridcell" onClick={() => onCard(c.cell.id)}
            className={`m-cell st-${c.state}${c.proposedNotNeeded ? " is-proposed" : ""}${moved.has(c.cell.id) ? " is-moved" : ""}`}
            aria-label={`${l.block.name}, ${c.output.name}: ${stateWord[c.state]}${moved.has(c.cell.id) ? ", moved" : ""}`}
          />
        ))}
      </div>
    ))}
    <div className="m-legend" aria-hidden="true">
      {(["green", "built", "partly", "red"] as const).map((k) => <span key={k}><span className={`legend-swatch st-${k}`} />{stateWord[k]}</span>)}
      <span><span className="legend-swatch st-not-needed" />Proposed not needed</span>
    </div>
  </div>
);

/** Green and built across the whole grid at each point: a step chart in plain SVG. */
const Climb = ({ lanes }: { lanes: ReadonlyArray<LaneClimb> }) => {
  const n = lanes[0]?.points.length ?? 0;
  const total = (i: number, k: "green" | "built") => lanes.reduce((a, l) => a + l.points[i]!.score[k], 0);
  const max = lanes.reduce((a, l) => a + l.points[0]!.score.needed, 0);
  const W = 640, H = 150, x = (i: number) => (n < 2 ? 0 : (i / (n - 1)) * W), y = (v: number) => H - (v / max) * H;
  const path = (k: "green" | "built") => Array.from({ length: n }, (_, i) => `${i ? "L" : "M"}${x(i)},${y(total(i, k))}`).join(" ");
  const last = n - 1;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max));
  return (
    <svg viewBox={`-36 -10 ${W + 80} ${H + 20}`} className="climb" role="img"
      aria-label={`Green ${total(0, "green")} to ${total(last, "green")}, built ${total(0, "built")} to ${total(last, "built")}, of ${max}, over ${n} points`}>
      {ticks.map((t) => (
        <g key={t}><line x1={0} x2={W} y1={y(t)} y2={y(t)} className="grid" /><text x={-8} y={y(t) + 4} className="tick" textAnchor="end">{t}</text></g>
      ))}
      <path d={path("built")} className="line-built" />
      <path d={path("green")} className="line-green" />
      <text x={W + 6} y={y(total(last, "built")) + 4} className="end-label">{total(last, "built")}</text>
      <text x={W + 6} y={y(total(last, "green")) + 4} className="end-label">{total(last, "green")}</text>
    </svg>
  );
};

export interface SinceOption { readonly id: string; readonly label: string }

export const HillClimb = ({ view, climb, changes, since, options, onSince, onCard }: {
  view: BoardView; climb: ReadonlyArray<LaneClimb>; changes: ReadonlyArray<Change>;
  since: string; options: ReadonlyArray<SinceOption>; onSince: (id: string) => void; onCard: (c: CellId) => void;
}) => {
  const idx = climb[0]?.points.findIndex((p) => p.at === since) ?? -1;
  const then = idx >= 0 ? sumAt(climb, idx) : null;
  const label = options.find((o) => o.id === since)?.label ?? since;
  const moved = new Set(changes.map((c) => c.cell));
  const name = (c: CellId) => {
    const l = view.lanes.find((x) => x.cards.some((k) => k.cell.id === c))!;
    return `${l.block.name} · ${l.cards.find((k) => k.cell.id === c)!.output.name}`;
  };
  return (
    <div className="climb-tab">
      <div className="climb-bar">
        <span className="muted small">Since</span>
        <Segment aria-label="Compare with" size="sm" selectedKey={since} onSelectionChange={(k) => onSince(String(k))}>
          {options.map((o) => <Segment.Item key={o.id} id={o.id}>{o.label}</Segment.Item>)}
        </Segment>
      </div>
      <Widget>
        <Widget.Header><div className="head-text"><Widget.Title>Where the grid stands</Widget.Title><Widget.Description>Of {view.score.needed} needed cards. Green: its evidence ran and passed. Built: the code carries it, no verdict yet.</Widget.Description></div></Widget.Header>
        <ScoreKPIs now={view.score} then={then} sinceLabel={`since ${label}`} />
      </Widget>
      <div className="climb-grid">
        <Widget>
          <Widget.Header><div className="head-text"><Widget.Title>Every card</Widget.Title><Widget.Description>Outlined: moved since {label}. Pick one to open it on the board.</Widget.Description></div></Widget.Header>
          <Widget.Content><Matrix view={view} moved={moved} onCard={onCard} /></Widget.Content>
        </Widget>
        <Widget>
          <Widget.Header><div className="head-text"><Widget.Title>What moved since {label}</Widget.Title><Widget.Description>{changes.length} moves, newest first</Widget.Description></div></Widget.Header>
          <Widget.Content>
            {changes.length === 0 ? <p className="muted">Nothing has moved.</p> : (
              <Timeline size="sm">
                {changes.map((c) => (
                  <Timeline.Item key={c.cell + c.event.at} status={c.event.state === "green" ? "success" : "current"}>
                    <Timeline.Rail><Timeline.Marker /><Timeline.Connector /></Timeline.Rail>
                    <Timeline.Content>
                      <button type="button" className="link" onClick={() => onCard(c.cell)}>{name(c.cell)}</button>
                      <p className="small">{stateWord[c.from]} → <b>{stateWord[c.event.state]}</b> <span className="muted mono">{c.event.at.slice(11, 16)}</span></p>
                      <p className="muted small">{c.event.note}</p>
                    </Timeline.Content>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
          </Widget.Content>
        </Widget>
      </div>
      <Widget>
        <Widget.Header><div className="head-text"><Widget.Title>Green and built over time</Widget.Title><Widget.Description>Across all {view.score.needed} needed cards, one point per recorded move</Widget.Description></div></Widget.Header>
        <Widget.Legend><Widget.LegendItem color="var(--success)">Green</Widget.LegendItem><Widget.LegendItem color="var(--warning)">Built</Widget.LegendItem></Widget.Legend>
        <Widget.Content><Climb lanes={climb} /></Widget.Content>
      </Widget>
    </div>
  );
};

const sumAt = (climb: ReadonlyArray<LaneClimb>, i: number): Score => climb.reduce<Score>((a, l) => {
  const s = l.points[i]!.score;
  return { green: a.green + s.green, built: a.built + s.built, partly: a.partly + s.partly, red: a.red + s.red, notNeeded: a.notNeeded + s.notNeeded, needed: a.needed + s.needed };
}, { green: 0, built: 0, partly: 0, red: 0, notNeeded: 0, needed: 0 });
