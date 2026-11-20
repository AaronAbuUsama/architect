// /portal/reference/<access|refusals|events|values|machines>: the model's tables, one page each. Refusal codes are counted by name and code;
// a refusal the door gave opens no span, and its row says `no span`.
import type { PortalData } from "../types.ts";
import { refusalCount } from "./live.ts";
import { eventsOf, refusalsOf } from "./model.ts";
import { NotYet } from "./not-yet.tsx";
import { Page, Table, who } from "./parts.tsx";

type Kind = "access" | "refusals" | "events" | "values" | "machines";
const TITLE: Readonly<Record<Kind, string>> = { access: "Access", refusals: "Refusal codes", events: "Events", values: "Values", machines: "Machines" };

const Body = ({ data, kind }: { readonly data: PortalData; readonly kind: Kind }) => {
  const { blueprint } = data;
  const things = Object.values(blueprint.model.things);
  if (kind === "access") {
    return <Table head={["Operation", "Who may call"]} rows={Object.values(blueprint.model.operations).map((o) => [<a href={`/portal/operations/${o.name}`}>{o.name}</a>, who(o)])} />;
  }
  if (kind === "refusals") {
    return (
      <table>
        <thead><tr><th>Refusal</th><th>Code</th><th>Count</th><th>Trace</th></tr></thead>
        <tbody>
          {Object.entries(refusalsOf(blueprint)).map(([name, code]) => (
            <tr key={name} data-portal="ref-row" data-name={name} data-code={code} data-count={String(refusalCount(data, name))} data-span="none">
              <td>{name}</td><td>{code}</td><td>{refusalCount(data, name)}</td><td>no span</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (kind === "events") {
    return <ul>{things.flatMap((t) => eventsOf(t).map(([name, fields]) => <li key={name}>{`${name} (${t.name}): ${Object.keys(fields).join(", ")}`}</li>))}</ul>;
  }
  if (kind === "machines") {
    return <ul>{things.filter((t) => t.machine !== null).map((t) => <li key={t.name}><a href={`/portal/things/${t.name}`}>{t.name}</a>{`: ${t.machine!.states.join(", ")}`}</li>)}</ul>;
  }
  return <p>The values the blueprint names: <NotYet hole="values" what="the wire does not carry them yet (M1.42)" /></p>;
};

export const ReferencePage = ({ data, kind }: { readonly data: PortalData; readonly kind: Kind }) => (
  <Page status={200} data={data}>
    <h1>{TITLE[kind]}</h1>
    <Body data={data} kind={kind} />
  </Page>
);
