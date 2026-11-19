// The goal's score: how many needed cards are green, built, partly and red, with the change since a point when there
// is one. A HeroUI Pro KPIGroup; it is its own surface, so it sits straight in a Widget, never in Widget.Content.
import { KPI } from "@heroui-pro/react/kpi";
import { KPIGroup } from "@heroui-pro/react/kpi-group";
import type { Score } from "../../data/derive.ts";
import type { CellState } from "../../data/types.ts";
import { stateWord } from "../shared/vocab.ts";

export interface GoalScoreProps {
  readonly now: Score;
  /** The score at the point compared with, or null for no comparison. */
  readonly then?: Score | null;
  /** How that point is named in the trend, for example "since 11-19 14:05". */
  readonly sinceLabel?: string;
}

const kpis: ReadonlyArray<CellState> = ["green", "built", "partly", "red"];
const count = (s: Score, k: CellState) => (k === "not-needed" ? s.notNeeded : s[k]);

export const GoalScore = ({ now, then = null, sinceLabel = "" }: GoalScoreProps) => (
  <KPIGroup className="widget-kpis" aria-label={`Score, of ${now.needed} needed cards`}>
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
