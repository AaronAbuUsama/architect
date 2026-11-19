// Home (Q2 A): one card per thing, grouped as the tree is, then the operations matrix (F8).
import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { Widget } from "@heroui-pro/react/widget";
import { Chip } from "@heroui/react";
import { moveCounts, refusedTotal, statOf, thingStat } from "../live.ts";
import { model, operations, page, type Operation } from "../model.ts";
import { blank, groups, mounts } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { Lifecycle, Spark } from "../ui.tsx";

const ThingCard = ({ name }: { name: string }) => {
  const t = model.things[name]!, s = thingStat(name), red = s.defects > 0;
  return (
    <Widget className={`thing-card${red ? " is-red" : ""}`}>
      <Widget.Header>
        <div className="head-text"><Widget.Title><a href={page.thing(name)}>{name}</a></Widget.Title><Widget.Description>{t.description || "No description declared."}</Widget.Description></div>
        {red && <Chip size="sm" variant="soft" color="danger">{s.defects} defects</Chip>}
      </Widget.Header>
      <Widget.Content className="thing-card-body">
        <Lifecycle thing={t} counts={moveCounts} compact />
        <dl className="statline">
          <div><dt>calls</dt><dd>{s.calls.toLocaleString("en-US")}</dd></div>
          <div><dt>refused</dt><dd className={refusedTotal(s) ? "tone-warning" : ""}>{refusedTotal(s)}</dd></div>
          <div><dt>defects</dt><dd className={s.defects ? "tone-danger" : ""}>{s.defects}</dd></div>
          <div><dt>p95</dt><dd>{s.p95}<small> ms</small></dd></div>
        </dl>
      </Widget.Content>
    </Widget>
  );
};

type Row = Operation & { s: ReturnType<typeof statOf> };
const columns: DataGridColumn<Row>[] = [
  { id: "op", header: "Operation", isRowHeader: true, minWidth: 170, cell: (o) => <a className="mono" href={page.op(o.name)}>{o.name}</a> },
  { id: "who", header: "Who may call", minWidth: 120, cell: (o) => <span className="muted small">{o.allowed.map((a) => a.kind === "role" ? a.role.split(".")[1] : a.kind).join(", ")}</span> },
  { id: "calls", header: "Calls", width: 90, align: "end", cell: (o) => <span className="mono">{o.s.calls.toLocaleString("en-US")}</span> },
  { id: "ref", header: "Refused", width: 90, align: "end", cell: (o) => <span className={`mono${refusedTotal(o.s) ? " tone-warning" : ""}`}>{refusedTotal(o.s)}</span> },
  { id: "def", header: "Defects", width: 90, align: "end", cell: (o) => <span className={`mono${o.s.defects ? " tone-danger" : ""}`}>{o.s.defects}</span> },
  { id: "p95", header: "p95 / budget", width: 120, align: "end", cell: (o) => <span className={`mono${o.s.budget && o.s.p95 > o.s.budget ? " tone-danger" : ""}`}>{o.s.p95} / {o.s.budget ?? "—"} ms</span> },
  { id: "trend", header: "Calls, 30 min", width: 130, cell: (o) => <Spark values={o.s.spark} label={`${o.name} calls per minute`} /> },
];

export const Home = () => (
  <Shell here={{ id: "home" }} crumbs={["Plugged In", "Home"]}>
    <div className="page">
      <header className="page-title"><h1>Plugged In</h1><p>A link-in-bio app: claim a name, put your links on a public page. Stage 1 of the growing example, read from its model.</p></header>
      {groups.map((g) => (
        <section key={g.name} className="group">
          <h2 className="group-title">{g.mount ? <><a href={`plugin-${g.mount}.html`}>{g.label}</a><span className="muted"> · feature · {mounts[g.mount].package} {mounts[g.mount].version}</span></> : g.label}</h2>
          <div className="cards">{g.things.map((n) => <ThingCard key={n} name={n} />)}</div>
        </section>))}
      <section className="group">
        <h2 className="group-title">Operations<span className="muted"> · every operation, its calls in the window and its p95 against the declared budget</span></h2>
        <DataGrid aria-label="Operations" data={operations.map((o) => ({ ...o, s: statOf(o) }))} columns={columns} getRowId={(o) => o.name} />
        <p className="muted small">Still blank: <a href="op-link.pin.html" className="mono">{blank.name}</a> ({blank.blanks.join(", ")}); it has no entry points until they are filled.</p>
      </section>
      <Foot>Structure from Plugged In's model. Numbers are fixed sample telemetry. Plugin groups come from round 2's stage-1 plan; the model on links/stage-1 predates `from`.</Foot>
    </div>
  </Shell>
);
