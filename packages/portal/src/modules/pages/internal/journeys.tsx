// Journeys, drawn: each journey run seen in the window is a sequence diagram (the cast as lanes, the steps as columns, an arrow from the
// caller to the thing each step reached, coloured by what came of it) with its steps below as a timeline. The journey model itself
// (cast, checks, per-environment verdicts, starting worlds) arrives on the wire with M1.42; until then this is what the window shows.
import { Chip, Timeline, Widget } from "@orthograph/portal-ui";
import type { ReactElement } from "react";
import type { JourneyRun } from "#modules/window/types.js";
import type { PageData } from "../types.ts";
import { Frame } from "./frame.tsx";
import { link } from "./links.ts";
import { statOfAll } from "./stats.ts";

const COLUMN = 170;
const LANE = 56;
const LEFT = 130;

const Sequence = ({ run, thingOf }: { readonly run: JourneyRun; readonly thingOf: (operation: string) => string }): ReactElement => {
  const lanes = [run.caller === "anyone" ? "anyone" : run.caller, ...new Set(run.steps.map((s) => thingOf(s.operation)))];
  const width = LEFT + run.steps.length * COLUMN;
  const height = 24 + lanes.length * LANE;
  const y = (lane: number): number => 24 + lane * LANE;
  return (
    <svg className="seq" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: width }} role="img" aria-label={`${run.journey}: ${run.steps.map((s) => s.title).join(", then ")}`}>
      {lanes.map((lane, i) => <g key={lane}><line className="seq-lane" x1={LEFT - 20} x2={width - 10} y1={y(i)} y2={y(i)} /><text x={8} y={y(i) + 4}>{lane}</text></g>)}
      {run.steps.map((s, k) => {
        const x = LEFT + k * COLUMN + COLUMN / 2 - 20;
        const to = lanes.indexOf(thingOf(s.operation));
        return (
          <g key={`${s.title}-${k}`} data-portal="journey-step" data-step={s.title} data-operation={s.operation} data-outcome={s.outcome}>
            <line className={`seq-arrow is-${s.outcome}`} x1={x} x2={x} y1={y(0)} y2={y(to)} markerEnd="url(#seq-head)" />
            <text x={x + 6} y={y(0) + 16}>{s.title}</text>
            <circle cx={x} cy={y(0)} r="4" fill="var(--foreground)" />
          </g>
        );
      })}
      <defs><marker id="seq-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)" /></marker></defs>
    </svg>
  );
};

export const JourneysPage = ({ data }: { readonly data: PageData }): ReactElement => {
  const { blueprint, view } = data;
  const thingOf = (operation: string): string => blueprint.model.operations[operation]?.thing ?? operation.split(".")[0] ?? operation;
  const runs = new Map<string, Array<JourneyRun>>();
  for (const run of view?.journeyRuns ?? []) runs.set(run.journey, [...(runs.get(run.journey) ?? []), run]);
  return (
    <Frame data={data} title="Journeys" here={{ id: "journeys" }} crumbs={[blueprint.project, "Journeys"]} scope={{ id: "all", operations: "all", stat: statOfAll(view) }}>
      <div className="page">
        <header className="page-title"><h1>Journeys</h1><p>A journey is a story told through the real operations. Here is each one that ran in the window, drawn from its trace: who called, which thing each step reached, and how it ended.</p></header>
        {runs.size === 0 && <p className="muted">No journey ran in the window.</p>}
        {[...runs].map(([name, list]) => {
          const run = list[0];
          if (run === undefined) return null;
          return (
            <Widget key={name}>
              <Widget.Header><div className="head-text"><Widget.Title>{name}</Widget.Title><Widget.Description>{list.length} {list.length === 1 ? "run" : "runs"} in the window; the latest is drawn.</Widget.Description></div></Widget.Header>
              <Widget.Content>
                <div data-portal="journey" data-journey={name} data-runs={String(list.length)}><Sequence run={run} thingOf={thingOf} /></div>
                <Timeline>
                  {run.steps.map((s, k) => (
                    <Timeline.Item key={`${s.title}-${k}`}>
                      <Timeline.Marker />
                      <Timeline.Content><a className="mono" href={link.operation(s.operation)}>{s.operation}</a> <span className="small">{s.title}</span> <Chip size="sm" variant="soft" color={s.outcome === "answered" ? "success" : s.outcome === "refused" ? "warning" : "danger"}>{s.outcome}</Chip> <a className="small" href={link.trace(run.trace)}>trace</a></Timeline.Content>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Widget.Content>
            </Widget>
          );
        })}
      </div>
    </Frame>
  );
};
