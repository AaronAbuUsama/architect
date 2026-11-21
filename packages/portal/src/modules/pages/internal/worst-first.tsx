// Home's worst-first list (M1.49): what needs a look before anything else, in this order: alerts firing (pages before tickets), then open issues, then
// operations whose p95 is over their budget. Each item links to where it is shown. From the monitor's answer and the window's calls, nothing else.
import type { PortalData } from "../types.ts";
import { callsOf } from "./live.ts";
import { worstFirst } from "./monitor.tsx";

/** Operations whose nearest-rank p95 over the window's calls is over their declared budget. A median under it is not a breach. */
export const breachesOf = (data: PortalData): ReadonlyArray<string> =>
  Object.values(data.blueprint.model.operations).flatMap((op) => {
    if (op.budget == null) return [];
    const d = callsOf(data, [op.name]).map((c) => c.durationMs).sort((a, b) => a - b);
    return d.length > 0 && d[Math.ceil(0.95 * d.length) - 1]! > op.budget.p95Ms ? [op.name] : [];
  });

const Item = ({ kind, subject, href, children }: { readonly kind: string; readonly subject: string; readonly href: string; readonly children?: Readonly<Record<string, string>> }) => (
  <li data-portal="worst-item" data-kind={kind} data-subject={subject} {...children}><a href={href}>{subject}</a></li>
);

export const WorstFirst = ({ data }: { readonly data: PortalData }) => {
  const { monitor } = data;
  if (monitor === null) return <section data-portal="worst-first"><p className="meta">Worst first: not yet (this portal has no live source to read it from).</p></section>;
  const firing = worstFirst(monitor.alerts).filter((a) => a.state === "firing");
  const ids = [...new Set(firing.map((a) => a.rule))].map((rule) => ({ rule, severity: firing.some((a) => a.rule === rule && a.severity === "page") ? "page" : "ticket" }));
  return (
    <section data-portal="worst-first">
      <h2>Worst first</h2>
      <ul>
        {ids.map((f) => <Item key={`alert:${f.rule}`} kind="alert" subject={f.rule} href="/portal/monitor/alerts">{{ "data-severity": f.severity }}</Item>)}
        {monitor.issues.map((i) => <Item key={`issue:${i.key}`} kind="issue" subject={i.key} href="/portal/monitor/issues">{{ "data-regressed": String(i.regressed) }}</Item>)}
        {breachesOf(data).map((op) => <Item key={`breach:${op}`} kind="breach" subject={op} href={`/portal/operations/${encodeURIComponent(op)}?tab=metrics`} />)}
      </ul>
      {ids.length + monitor.issues.length === 0 && breachesOf(data).length === 0 ? <p className="meta">Nothing is firing, open or over budget.</p> : null}
    </section>
  );
};
