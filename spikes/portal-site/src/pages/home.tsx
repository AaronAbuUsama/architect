// Home (Q2 A): one card per thing, grouped as the tree is, then the operations matrix (F8).
import { DataGrid, type DataGridColumn } from "@heroui-pro/react/data-grid";
import { Widget } from "@heroui-pro/react/widget";
import { Chip } from "@heroui/react";
import { moveCounts, refusedTotal, splitOf, statOf, thingStat } from "../live.ts";
import { BudgetMeter } from "../kit/budget-meter.tsx";
import { CallsMeter } from "../kit/calls-meter.tsx";
import { model, operations, page, type Operation } from "../model.ts";
import { blank, groups, mounts } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { Lifecycle, SparkBars } from "../ui.tsx";

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
        <div className="thing-stats"><CallsMeter split={splitOf(s)} size="sm" label={name} /><BudgetMeter p95={s.p95} budget={null} worst compact /></div>
      </Widget.Content>
    </Widget>
  );
};

type Row = Operation & { s: ReturnType<typeof statOf> };
const columns: DataGridColumn<Row>[] = [
  { id: "op", header: "Operation", isRowHeader: true, minWidth: 170, cell: (o) => <a className="mono" href={page.op(o.name)}>{o.name}</a> },
  { id: "who", header: "Who may call", minWidth: 120, cell: (o) => <span className="chips">{o.allowed.map((a) => <Chip key={a.kind + ("role" in a ? a.role : "")} size="sm" variant="soft">{a.kind === "role" ? a.role.split(".")[1] : a.kind}</Chip>)}</span> },
  { id: "calls", header: "Calls by outcome", minWidth: 180, cell: (o) => <CallsMeter split={splitOf(o.s)} size="sm" legend={false} label={o.name} /> },
  { id: "ref", header: "Refused", width: 90, align: "end", cell: (o) => <span className={`mono${refusedTotal(o.s) ? " tone-warning" : ""}`}>{refusedTotal(o.s)}</span> },
  { id: "def", header: "Defects", width: 90, align: "end", cell: (o) => <span className={`mono${o.s.defects ? " tone-danger" : ""}`}>{o.s.defects}</span> },
  { id: "p95", header: "p95 against budget", minWidth: 170, cell: (o) => <BudgetMeter p95={o.s.p95} budget={o.s.budget} compact /> },
  { id: "trend", header: "Calls per minute", width: 140, cell: (o) => <SparkBars values={o.s.spark} label={`${o.name} calls per minute`} /> },
];

export const Home = () => (
  <Shell here={{ id: "home" }} crumbs={["Plugged In", "Home"]}>
    <div className="page">
      <header className="page-title"><h1>Plugged In</h1><p>A link-in-bio app: claim a name, put your links on a public page. Stage 1 of the growing example, read from its model.</p></header>
      {groups.map((g) => (
        <section key={g.name} className="group">
          <h2 className="group-title">{g.mount ? <><a href="plugins.html">{g.label}</a><Chip size="sm" variant="soft" className="tag">PLUGIN</Chip><Chip size="sm" variant="soft" className="mono">{mounts[g.mount].package}@{mounts[g.mount].version}</Chip></> : g.label}</h2>
          <div className="cards">{g.things.map((n) => <ThingCard key={n} name={n} />)}</div>
        </section>))}
      <section className="group">
        <h2 className="group-title">Operations</h2><p className="muted small group-sub">Every operation: its calls in the window by outcome, and its p95 against the budget it declares.</p>
        <DataGrid aria-label="Operations" data={operations.map((o) => ({ ...o, s: statOf(o) }))} columns={columns} getRowId={(o) => o.name} />
        <p className="muted small">Still blank: <a href="op-link.pin.html" className="mono">{blank.name}</a> ({blank.blanks.join(", ")}); it has no entry points until they are filled.</p>
      </section>
      <Foot>Structure from Plugged In's model. Numbers are fixed sample telemetry. Plugin groups come from round 2's stage-1 plan; the model on links/stage-1 predates `from`.</Foot>
    </div>
  </Shell>
);
