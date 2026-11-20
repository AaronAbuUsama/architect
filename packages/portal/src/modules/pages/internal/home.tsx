// /portal: the matrix of every operation in every environment, what is stale and why, and the way into each thing and operation.
import { Card } from "@orthograph/portal-ui";
import type { PortalData } from "../types.ts";
import { Banner, Cell, Page, Table, noteOf } from "./parts.tsx";

export const Home = ({ data: { blueprint, snapshot: s } }: { readonly data: PortalData }) => {
  const rows = s.operations.map((operation) => {
    const mine = s.environments.map((e) => s.proofs.find((p) => p.operation === operation && p.environment === e)!);
    const known = operation in blueprint.model.operations;
    return [
      known ? <a href={`/portal/operations/${encodeURIComponent(operation)}`}>{operation}</a> : operation,
      ...mine.map((p) => <Cell key={p.environment} proof={p} />),
      <span className="note">{mine.map((p) => noteOf(p, s.candidate.revision)).filter((n) => n !== "").join(" / ")}</span>,
    ];
  });
  const release = s.release.state === "available" && s.release.value !== null ? `Released ${s.release.value.version} at ${s.release.value.revision}.` : "";
  return (
    <Page status={200}>
      <h1>{blueprint.project}</h1>
      <p className="meta">{`Bundle ${s.bundleRevision ?? "unknown"}. Judged against ${s.candidate.revision ?? "unknown"} (${s.candidate.source === "logbook" ? "newest revision proved in test" : "this bundle's own model"}). ${release} Ledger read: ${s.consistency}.`}</p>
      <Banner snapshot={s} />
      <h2>Operations</h2>
      <Table head={["Operation", ...s.environments, "Notes"]} rows={rows} />
      <h2>Things</h2>
      <ul className="things">
        {Object.values(blueprint.model.things).map((t) => (
          <li key={t.name}>
            <Card data-portal="thing-card" data-thing={t.name}>
              <Card.Content>
                <Card.Title><a href={`/portal/things/${encodeURIComponent(t.name)}`}>{t.name}</a></Card.Title>
                <Card.Description>{t.description}</Card.Description>
              </Card.Content>
            </Card>
          </li>
        ))}
      </ul>
      <p className="meta">A tick is a recorded pass from main whose contract is as it is now, not a fresh run. Stale: it passed an older contract. Unproven: no verdict. Unavailable: the portal could not tell.</p>
    </Page>
  );
};
