// VerdictMatrix: what is proven where. Rows are operations or journeys, columns are environments, and each cell is a
// verdict tile. Every column heads with its tally (a stacked bar and the counts by name), so "pass 8" always says
// 8 of what. Verdicts come from the logbook, so the matrix needs no telemetry.
import { CheckIcon, ClockCounterClockwiseIcon, MinusIcon, XIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";

export type V = "pass" | "fail" | "stale" | "unproven";
export type MatrixRow = { id: string; label: ReactNode; href?: string; group?: string; cells: Record<string, V>; note?: Record<string, string> };
const order: V[] = ["pass", "fail", "stale", "unproven"];
const tone: Record<V, string> = { pass: "success", fail: "danger", stale: "warning", unproven: "default" };
const Icon = ({ v }: { v: V }) => v === "pass" ? <CheckIcon size={13} weight="bold" /> : v === "fail" ? <XIcon size={13} weight="bold" />
  : v === "stale" ? <ClockCounterClockwiseIcon size={13} weight="bold" /> : <MinusIcon size={13} weight="bold" />;

export const VerdictTile = ({ v, title }: { v: V; title?: string }) => (
  <span className={`v-tile v-tile--${v}`} title={title ?? v} aria-label={title ?? v}><Icon v={v} /></span>
);

/** One column's verdicts as a stacked bar with named counts: "6 pass, 1 fail, 1 stale of 8 operations". */
export const VerdictTally = ({ verdicts, of }: { verdicts: V[]; of: string }) => {
  const n = (v: V) => verdicts.filter((x) => x === v).length;
  return (
    <div className="v-tally" role="img" aria-label={`${order.filter(n).map((v) => `${n(v)} ${v}`).join(", ")} of ${verdicts.length} ${of}`}>
      <div className="v-tally__bar">{order.map((v) => n(v) > 0 && <span key={v} className={`tone-bg-${tone[v]}`} style={{ flexGrow: n(v) }} />)}</div>
      <div className="v-tally__counts">{order.filter(n).map((v) => <span key={v} className={`v-count v-count--${v}`}><b>{n(v)}</b>{v}</span>)}<span className="v-of">of {verdicts.length} {of}</span></div>
    </div>
  );
};

export const VerdictMatrix = ({ rows, envs, of, focus, rowHead }: { rows: MatrixRow[]; envs: string[]; of: string; focus?: string; rowHead: string }) => {
  const groups = [...new Set(rows.map((r) => r.group ?? ""))];
  return (
    <div className="v-matrix-wrap">
      <table className="v-matrix">
        <thead>
          <tr><th className="v-matrix__rowhead">{rowHead}</th>{envs.map((e) => (
            <th key={e} className={e === focus ? "is-focus" : undefined}><span className="v-matrix__env">{e}</span><VerdictTally verdicts={rows.map((r) => r.cells[e]!)} of={of} /></th>))}</tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g}>
            {g && <tr className="v-matrix__group"><th colSpan={envs.length + 1}>{g}</th></tr>}
            {rows.filter((r) => (r.group ?? "") === g).map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.href ? <a href={r.href}>{r.label}</a> : r.label}</th>
                {envs.map((e) => <td key={e} className={e === focus ? "is-focus" : undefined}><VerdictTile v={r.cells[e]!} title={r.note?.[e] ? `${r.cells[e]}: ${r.note[e]}` : `${r.cells[e]} in ${e}`} />{r.note?.[e] && <span className="v-note">{r.note[e]}</span>}</td>)}
              </tr>))}
          </tbody>))}
      </table>
      <div className="v-legend">{order.map((v) => <span key={v}><VerdictTile v={v} />{v === "stale" ? "stale: passed, then its declaration changed" : v === "unproven" ? "unproven: never run there" : v}</span>)}</div>
    </div>
  );
};
