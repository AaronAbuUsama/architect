// Home (design/portal.md, "The first page"): one card per thing, in the tree's order, with its lifecycle and its window's counts;
// then the operations matrix, each with its calls and its proof per environment. A card with a defect turns red; a refusal stays amber.
import { CallsMeter, Chip, Grid, Widget } from "@orthograph/portal-ui";
import type { ReactElement } from "react";
import type { PortalSnapshot } from "#modules/snapshot/types.js";
import type { OperationWire } from "#modules/wire/types.js";
import type { PageData } from "../types.ts";
import { Frame } from "./frame.tsx";
import { Lifecycle } from "./lifecycle.tsx";
import { link } from "./links.ts";
import { Banner, noteOf, ProofCell, proofOf } from "./proof.tsx";
import { none, operationsOf, statOf, statOfAll } from "./stats.ts";

const who = (op: OperationWire): string =>
  op.allowed.map((a) => (a.kind === "anyone" ? "anyone" : a.kind === "signed-in" ? "anyone signed in" : `${a.kind} ${a.role ?? ""}${a.path === undefined ? "" : ` of its ${a.path}`}`.trim())).join(", or ");

export const Home = ({ data, snapshot }: { readonly data: PageData; readonly snapshot: PortalSnapshot }): ReactElement => {
  const { blueprint, view } = data;
  const release = snapshot.release.state === "available" && snapshot.release.value !== null ? `Released ${snapshot.release.value.version} at ${snapshot.release.value.revision}.` : "";
  const rows = snapshot.operations.map((name) => ({ name, op: blueprint.model.operations[name], s: view?.byOperation[name] ?? none }));
  return (
    <Frame data={data} title="Home" here={{ id: "home" }} crumbs={[blueprint.project, "Home"]} scope={{ id: "all", operations: "all", stat: statOfAll(view) }}>
      <div className="page">
        <header className="page-title">
          <h1>{blueprint.project}</h1>
          <p className="small">Bundle {snapshot.bundleRevision ?? "unknown"}. Judged against {snapshot.candidate.revision ?? "unknown"} ({snapshot.candidate.source === "logbook" ? "newest revision proved in test" : "this bundle's own model"}). {release} Ledger read: {snapshot.consistency}.</p>
        </header>
        <Banner snapshot={snapshot} />
        <section className="cards" aria-label="Things">
          {Object.values(blueprint.model.things).map((thing) => {
            const s = statOf(view, operationsOf(blueprint, thing.name));
            return (
              <div key={thing.name} data-portal="thing-card" data-thing={thing.name} data-calls={String(s.calls)} data-refused={String(s.refused)} data-defects={String(s.defects)}>
                <Widget className={s.defects > 0 ? "thing-card is-red" : "thing-card"}>
                  <Widget.Header>
                    <div className="head-text"><Widget.Title><a href={link.thing(thing.name)}>{thing.name}</a></Widget.Title><Widget.Description>{thing.description || "No description declared."}</Widget.Description></div>
                    {s.defects > 0 && <Chip size="sm" variant="soft" color="danger">{s.defects} defects</Chip>}
                  </Widget.Header>
                  <Widget.Content>
                    <Lifecycle thing={thing} view={view} compact />
                    {view !== undefined && <div className="thing-stats"><CallsMeter split={{ answered: s.answered, refused: s.refused, defects: s.defects }} size="sm" label={thing.name} /></div>}
                  </Widget.Content>
                </Widget>
              </div>
            );
          })}
        </section>
        <section>
          <h2 className="group-title">Operations</h2>
          <p className="muted small">Every operation: who may call it, its calls in the window, and the proof the logbook holds for each environment.</p>
          <Grid
            aria-label="Operations"
            data={rows}
            getRowId={(r: (typeof rows)[number]) => r.name}
            columns={[
              { id: "operation", header: "Operation", isRowHeader: true, minWidth: 170, cell: (r: (typeof rows)[number]) => (r.op === undefined ? <span className="mono">{r.name}</span> : <a className="mono" href={link.operation(r.name)}>{r.name}</a>) },
              { id: "who", header: "Who may call", minWidth: 120, cell: (r: (typeof rows)[number]) => <span className="small">{r.op === undefined ? "" : who(r.op)}</span> },
              ...(view === undefined ? [] : [
                { id: "calls", header: "Calls", width: 80, align: "end" as const, cell: (r: (typeof rows)[number]) => <span className="mono">{r.s.calls}</span> },
                { id: "refused", header: "Refused", width: 90, align: "end" as const, cell: (r: (typeof rows)[number]) => <span className={r.s.refused > 0 ? "mono tone-warning" : "mono"}>{r.s.refused}</span> },
                { id: "defects", header: "Defects", width: 90, align: "end" as const, cell: (r: (typeof rows)[number]) => <span className={r.s.defects > 0 ? "mono tone-danger" : "mono"}>{r.s.defects}</span> },
              ]),
              ...snapshot.environments.map((env) => ({ id: `env:${env}`, header: env, minWidth: 130, cell: (r: (typeof rows)[number]) => <ProofCell proof={proofOf(snapshot, r.name, env)} /> })),
              { id: "notes", header: "Notes", minWidth: 200, cell: (r: (typeof rows)[number]) => <span className="small muted">{snapshot.environments.map((env) => proofOf(snapshot, r.name, env)).flatMap((p) => (p === undefined ? [] : [noteOf(p, snapshot.candidate.revision)])).filter((n) => n !== "").join(" · ")}</span> },
            ]}
          />
        </section>
        <p className="page-foot">A tick is a recorded pass from main whose contract is as it is now, not a fresh run. Unproven means no verdict; unavailable means the portal could not tell.</p>
      </div>
    </Frame>
  );
};
