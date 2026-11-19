// The grid itself (GRILL-2 Q1 A): one row per building block in hill-climb order, one square per output, coloured by
// state. Click a square for its eval, a row name for its block. Moved squares are outlined.
import type { LaneView } from "../../data/derive.ts";
import type { CellId, Output } from "../../data/types.ts";
import { stateWord } from "../shared/vocab.ts";

export interface CoverageMatrixProps {
  readonly lanes: ReadonlyArray<LaneView>;
  readonly outputs: ReadonlyArray<Output>;
  /** Cells that moved since the point compared with. */
  readonly moved?: ReadonlySet<CellId>;
  readonly selected?: CellId | null;
  readonly onCard?: (cell: CellId) => void;
  readonly onLane?: (block: string) => void;
}

export const CoverageMatrix = ({ lanes, outputs, moved = new Set(), selected = null, onCard, onLane }: CoverageMatrixProps) => (
  <div className="matrix" role="grid" aria-label="Every card by building block and output">
    <div className="m-row m-head" role="row">
      <span role="columnheader" />
      {outputs.map((o) => <span key={o.id} role="columnheader" className="m-out">{o.name}</span>)}
      <span role="columnheader" className="m-out">Green</span>
    </div>
    {lanes.map((l) => (
      <div key={l.block.id} className="m-row" role="row">
        <button type="button" role="rowheader" className="m-lane" onClick={() => onLane?.(l.block.id)}>{l.block.name}</button>
        {l.cards.map((c) => (
          <button
            key={c.cell.id} type="button" role="gridcell" onClick={() => onCard?.(c.cell.id)}
            className={`m-cell st-${c.state}${c.proposedNotNeeded ? " is-proposed" : ""}${moved.has(c.cell.id) ? " is-moved" : ""}${selected === c.cell.id ? " is-selected" : ""}`}
            aria-label={`${l.block.name}, ${c.output.name}: ${stateWord[c.state]}${c.proposedNotNeeded ? ", proposed not needed" : ""}${moved.has(c.cell.id) ? ", moved" : ""}`}
          />
        ))}
        <span className="m-score mono" aria-label={`${l.score.green} of ${l.score.needed} green`}>{l.score.green}/{l.score.needed}</span>
      </div>
    ))}
    <div className="m-legend" aria-hidden="true">
      {(["green", "built", "partly", "red"] as const).map((k) => <span key={k}><span className={`legend-swatch st-${k}`} />{stateWord[k]}</span>)}
      <span><span className="legend-swatch st-not-needed" />Proposed not needed</span>
      {moved.size > 0 && <span><span className="legend-swatch is-moved" />Moved</span>}
    </div>
  </div>
);
