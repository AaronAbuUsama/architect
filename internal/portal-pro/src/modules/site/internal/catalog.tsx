import { Chip } from "@heroui/react";
import { ArrowDownRightIcon, ArrowRightIcon, CubeIcon } from "@phosphor-icons/react/ssr";
import type { Activity, BlueprintWire } from "../types.ts";
import { ms, p95 } from "./calls.ts";
import { link } from "./links.ts";

type Model = BlueprintWire["model"];
type Operation = Model["operations"][string];

export const allowedLabel = (entry: Operation["allowed"][number]) => {
  if (entry.kind === "anyone") return "Anyone";
  if (entry.kind === "signed-in") return "Signed-in callers";
  return <><code>{entry.role ?? entry.kind}</code>{entry.path && <> via <code>{entry.path}</code></>}</>;
};



export const Kind = ({ kind }: { kind: Model["operations"][string]["kind"] }) => (
  <Chip className={`kind kind--${kind}`} size="sm" variant="soft">{kind === "read" ? "Read" : "Operation"}</Chip>
);

export const OperationTable = ({ operations, base, blueprint, activity }: {
  operations: readonly Operation[]; base: string; blueprint?: BlueprintWire; activity?: Activity | undefined;
}) => {
  if (operations.length === 0) return <p className="empty">No operations or reads declared.</p>;
  const groups = Map.groupBy(operations, (operation) => operation.thing);
  const columns = blueprint ? 7 : 4;
  return (
    <>
      {blueprint && <p className="catalog-availability">{activity
        ? "Counts and p95 are from the collector capture. Journey coverage is unavailable."
        : "Calls, refusals and defects require a collector capture. Journey coverage is unavailable."}</p>}
      <div className="table-wrap">
        <table className={blueprint ? "operations-table operations-table--matrix" : "operations-table"}>
          <thead><tr><th scope="col">Operation</th><th scope="col">Who can call</th><th scope="col">State move</th>
            {blueprint && <><th scope="col">Calls</th><th scope="col">Refused</th><th scope="col">Defects</th></>}
            <th scope="col">{blueprint ? "p95 / budget" : "p95 budget"}</th>
          </tr></thead>
          {[...groups].map(([thing, entries]) => (
            <tbody key={thing}>
              {blueprint && <tr className="operation-group"><th colSpan={columns} scope="rowgroup">
                {Object.hasOwn(blueprint.model.things, thing)
                  ? <a href={base + link("things", thing)}><code>{thing}</code></a> : <code>{thing}</code>}
              </th></tr>}
              {entries.map((operation) => {
                const calls = activity?.calls.get(operation.name);
                const latency = calls && p95(calls);
                const move = operation.move;
                return <tr key={operation.name}>
                  <td><a className="record-link" href={base + link("operations", operation.name)}><code>{operation.name}</code><ArrowDownRightIcon aria-hidden="true" /></a>
                    {operation.kind === "read" && <small>Read</small>}</td>
                  <td>{operation.allowed.map((entry, i) => <div key={i}>{allowedLabel(entry)}</div>)}</td>
                  <td>{move ? <code>{move.from.join(" / ") || "Creation"} → {move.to.join(" / ")}</code> : "—"}</td>
                  {blueprint && <>
                    <td className="measure">{calls?.length ?? "—"}</td>
                    <td className="measure">{calls?.filter((call) => call.outcome === "refused").length ?? "—"}</td>
                    <td className="measure">{calls?.filter((call) => call.outcome === "defect").length ?? "—"}</td>
                  </>}
                  <td className="measure">{blueprint && <>{latency === undefined ? "—" : ms(latency)} / </>}
                    {operation.budget ? ms(operation.budget.p95Ms) : "—"}</td>
                </tr>;
              })}
            </tbody>
          ))}
        </table>
      </div>
    </>
  );
};

export const Things = ({ model, base }: { model: Model; base: string }) => {
  const things = Object.values(model.things);
  return things.length === 0 ? <p className="empty">No things declared.</p> : (
    <ul className="thing-list">{things.map((thing) => (
      <li key={thing.name}>
        <a href={base + link("things", thing.name)}>
          <CubeIcon aria-hidden="true" /><span><strong>{thing.name}</strong><small>{thing.description}</small></span>
          <ArrowRightIcon aria-hidden="true" />
        </a>
      </li>
    ))}</ul>
  );
};

export const Overview = ({ blueprint }: { blueprint: BlueprintWire }) => {
  const { model } = blueprint;
  const metrics = [
    { title: "Things", count: Object.keys(model.things).length, href: link("things") },
    { title: "Operations & reads", count: Object.keys(model.operations).length, href: link("operations") },
    { title: "Environments", count: Object.keys(model.environments ?? {}).length, href: link("environments") },
  ];
  return (
    <>
      <header className="page-heading"><h1>{blueprint.project}</h1><p>Blueprint overview</p></header>
      <div className="overview-counts">{metrics.map(({ title, count, href }) => (
        <a key={title} href={href}><span>{title}</span><strong>{count}</strong><ArrowRightIcon aria-hidden="true" /></a>
      ))}</div>
      <section className="overview-section">
        <div className="section-heading"><h2>Things</h2><a href={link("things")}>View catalog <ArrowRightIcon aria-hidden="true" /></a></div>
        <Things model={model} base="" />
      </section>
    </>
  );
};

export const Environments = ({ model }: { model: Model }) => {
  const environments = Object.values(model.environments ?? {});
  return (
    <>
      <header className="page-heading"><h1>Environments</h1><p>Declared execution and promotion settings.</p></header>
      {environments.length === 0 ? <p className="empty">No environments declared.</p> :
        <div className="table-wrap"><table>
          <thead><tr><th scope="col">Environment</th><th scope="col">Runs</th><th scope="col">Promotes from</th><th scope="col">Lifetime</th></tr></thead>
          <tbody>{environments.map((environment) => (
            <tr key={environment.name}>
              <th scope="row"><code>{environment.name}</code></th><td>{environment.runs}</td>
              <td>{environment.promotesFrom ?? "—"}</td><td>{environment.lifetimeMs === null ? "—" : `${environment.lifetimeMs} ms`}</td>
            </tr>
          ))}</tbody>
        </table></div>}
    </>
  );
};
