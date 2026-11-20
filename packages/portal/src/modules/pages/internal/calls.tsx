// The Metrics tab's body: the window's tiles, this operation's refusals by code, and the calls table (one row per call, newest first, each
// opening its trace). Drawn from the snapshot's telemetry; a source that is not there, or failed, is said with its reason and draws no number.
import type { OperationWire } from "#modules/wire/types.js";
import type { PortalData } from "../types.ts";
import { NOT_YET, callsOf, doorRefusalsOf, refusalCount, tallyOf, truncatedOf, whyNot } from "./live.ts";
import { refusalsFor } from "./model.ts";
import { NotYet } from "./not-yet.tsx";

const FILTERS = [["environment", true], ["caller", true], ["outcome", true], ["request-key", false], ["over-budget", true], ["window", true]] as const;
const COLUMNS = [["time", "Time"], ["environment", "Environment"], ["caller", "Caller"], ["outcome", "Outcome"], ["duration", "Duration"], ["request-key", "Request key"], ["attempts", "Attempts"]] as const;

const Tiles = ({ data, op }: { readonly data: PortalData; readonly op: OperationWire }) => {
  const why = whyNot(data, "metrics");
  if (why !== undefined) return <p>Counts: <NotYet hole="metrics" what={why} /></p>;
  const t = tallyOf(data, op.name);
  return (
    <>
      <div className="tiles">
        {(["calls", "answered", "refused", "defects"] as const).map((s) => <div key={s} data-portal="tile" data-stat={s} data-value={t[s]}><span className="meta">{s}</span> <b>{t[s]}</b></div>)}
      </div>
      <h3>Refusals by code</h3>
      <ul>
        {refusalsFor(data.blueprint, op).filter(([name]) => (refusalCount(data, name, op.name) ?? 0) > 0).map(([name, code]) => (
          <li key={name}><span data-portal="refusal-code" data-refusal={name} data-code={code} data-count={String(refusalCount(data, name, op.name))}>{`${name} ${code}`}</span>{` ${refusalCount(data, name, op.name)}`}</li>
        ))}
      </ul>
      <p className="meta">Refusals counted include the ones the door gave before a call opened a span: those are counted and never a row.</p>
    </>
  );
};

/** What is counted and what is listed. Each figure is drawn only when its source was read; an unread one says `not yet` and carries no attribute. */
const Footer = ({ data, op, shown }: { readonly data: PortalData; readonly op: OperationWire; readonly shown: number | null }) => {
  const total = whyNot(data, "metrics") === undefined ? tallyOf(data, op.name).calls : null;
  const door = doorRefusalsOf(data, op.name);
  const truncated = truncatedOf(data);
  return (
    <p data-portal="calls-footer" {...(shown === null ? {} : { "data-shown": String(shown) })} {...(total === null ? {} : { "data-total": total })} {...(door === null ? {} : { "data-door-refusals": String(door) })}>
      {`${shown ?? NOT_YET} of ${total ?? NOT_YET} calls listed; ${door ?? NOT_YET} refused at the door are counted and never a row.${truncated === null || truncated === 0 ? "" : ` ${truncated} older calls are not sent.`}`}
    </p>
  );
};

const Table = ({ data, op }: { readonly data: PortalData; readonly op: OperationWire }) => {
  const why = whyNot(data, "calls");
  const rows = callsOf(data, [op.name]);
  return (
    <>
      <h3>Calls</h3>
      <div className="filters">
        {FILTERS.map(([name, available]) => (
          <span key={name} data-portal="calls-filter" data-filter={name} data-available={String(available)}>{name === "request-key" ? <>request key <NotYet hole="request-key" what="no span carries the idempotency key yet" /></> : name}</span>
        ))}
      </div>
      <p className="meta">Role held: <NotYet hole="role-held" what="nothing carries the role a caller held yet" /></p>
      {why !== undefined ? <p>The calls: <NotYet hole="calls" what={why} /></p> : null}
      <table>
        <thead><tr>{COLUMNS.map(([col, label]) => <th key={col} data-portal="calls-col" data-col={col}>{label}</th>)}</tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.trace} data-portal="call-row" data-trace={c.trace} data-operation={c.operation} data-outcome={c.outcome} {...(c.refusal === null ? {} : { "data-refusal": c.refusal })}
              data-caller-kind={c.caller} data-attempts={String(c.attempts)} data-duration-ms={String(c.durationMs)} data-over-budget={String(c.overBudget)}
              data-environment={c.environment} data-start={String(c.start)} data-request-key="not yet" data-role-held="not yet">
              <td><a href={`/portal/traces/${c.trace}`}>{new Date(c.start).toISOString()}</a></td>
              <td>{c.environment}</td><td>{c.caller}</td><td>{c.refusal === null ? c.outcome : `${c.outcome} ${c.refusal}`}</td>
              <td>{`${c.durationMs} ms${c.overBudget ? " over budget" : ""}`}</td><td>not yet</td><td>{c.attempts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Footer data={data} op={op} shown={why === undefined ? rows.length : null} />
    </>
  );
};

export const Calls = ({ data, op }: { readonly data: PortalData; readonly op: OperationWire }) => (
  <>
    <Tiles data={data} op={op} />
    <Table data={data} op={op} />
  </>
);
