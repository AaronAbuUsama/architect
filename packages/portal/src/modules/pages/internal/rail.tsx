// The live rail, scoped to the page (design/portal.md, "The live rail"): the window's four counts from `ortho.calls`, and the last calls
// from the source, one row per trace. Numbers as data in stat blocks, never as a sentence. No window, no numbers.
import { CallsMeter, Chip, EnvironmentPill, Stat } from "@orthograph/portal-ui";
import type { ReactElement } from "react";
import type { CallStat, WindowView } from "#modules/window/types.js";
import { link } from "./links.ts";
import { minutes } from "./stats.ts";

export interface Scope {
  /** `all`, `thing:<name>` or `operation:<name>`. */
  readonly id: string;
  readonly operations: ReadonlyArray<string> | "all";
  readonly stat: CallStat;
}

const outcomeTone = { answered: "success", refused: "warning", defect: "danger" } as const;
const stats = (s: CallStat): ReadonlyArray<readonly [string, number]> => [["calls", s.calls], ["answered", s.answered], ["refused", s.refused], ["defects", s.defects]];

export const Rail = ({ view, scope }: { readonly view: WindowView | undefined; readonly scope: Scope }): ReactElement => {
  if (view === undefined) return <div className="rail" data-portal="rail" data-scope={scope.id}><p className="muted small">No live source is wired to this portal, so there are no numbers to show.</p></div>;
  const calls = view.lastCalls.filter((c) => scope.operations === "all" || scope.operations.includes(c.operation)).slice(0, 10);
  return (
    <div className="rail" data-portal="rail" data-scope={scope.id}>
      <div className="rail-head"><EnvironmentPill name={view.environment} live size="sm" /><Chip size="sm" variant="soft">last {minutes(view.windowMs)}</Chip><Chip size="sm" variant="soft" className="mono">{scope.id}</Chip></div>
      <CallsMeter split={{ answered: scope.stat.answered, refused: scope.stat.refused, defects: scope.stat.defects }} label={scope.id} />
      <div className="rail-stats">
        {stats(scope.stat).map(([name, value]) => (
          <div key={name} data-portal="stat" data-stat={name} data-value={String(value)}>
            <Stat><Stat.Header><Stat.Title>{name}</Stat.Title></Stat.Header><Stat.Content><span className="mono">{value.toLocaleString("en-US")}</span></Stat.Content></Stat>
          </div>
        ))}
      </div>
      <div>
        <div className="eyebrow">last calls</div>
        {calls.length === 0 && <p className="muted small">No calls in the window.</p>}
        <ul className="calls-list">
          {calls.map((c) => (
            <li key={c.trace} data-portal="last-call" data-trace={c.trace} data-operation={c.operation} data-outcome={c.outcome} data-caller-kind={c.callerKind} data-attempts={String(c.attempts)}>
              <a className="mono" href={link.trace(c.trace)}>{c.operation}</a>
              <Chip size="sm" variant="soft" color={outcomeTone[c.outcome]}>{c.outcome}</Chip>
              <span className="small muted">{c.callerKind}</span>
              {c.attempts > 1 && <span className="small muted">attempt {c.attempts}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
