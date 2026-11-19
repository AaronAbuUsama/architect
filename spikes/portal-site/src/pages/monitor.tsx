// Monitor, proposed in K18: issues and alerts that fall out of the model with nothing configured. Plus "About this drawing".
import { Chip } from "@heroui/react";
import { journeys } from "../journeys.ts";
import { statOf } from "../live.ts";
import { model, operations, page } from "../model.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block, Spark, SparkBars } from "../ui.tsx";
import { KeyPath } from "../kit/key-path.tsx";

const Title = ({ h, p }: { h: string; p: string }) => <header className="page-title"><div className="title-row"><h1>{h}</h1><Chip size="sm" variant="soft" color="accent">proposed in K18</Chip></div><p>{p}</p></header>;

export const Issues = () => (
  <Shell here={{ id: "issues", scope: { label: "link.add", ops: ["link.add"] } }} crumbs={["Plugged In", "Monitor", "Issues"]}>
    <div className="page">
      <Title h="Issues" p="A defect is a failure the blueprint didn't declare, so it is always a bug. Each is grouped by operation, step and error, never by a stack trace. A refusal is never an issue: it is the app answering." />
      <Block title="Open" desc="One issue per (operation, step, error). First and last seen by model hash, so a fix that comes back is marked regressed." flush>
        <table className="tbl"><thead><tr><th>issue</th><th>state</th><th>first seen</th><th>last seen</th><th className="num">defects</th><th className="num">of calls</th><th>owner</th><th>trend</th></tr></thead>
          <tbody><tr><td><a href={page.op("link.add", "spans")}><KeyPath parts={["link.add", "record", "DatabaseError"]} tone="danger" /></a></td><td><Chip size="sm" variant="soft" color="danger">new</Chip></td>
            <td><span className="chips"><Chip size="sm" variant="soft" className="mono">7c07c87</Chip><Chip size="sm" variant="soft" className="mono">11:52</Chip></span></td><td className="mono small">12:04:20</td><td className="num mono tone-danger">3</td><td className="num mono">0.31%</td>
            <td><span className="chips"><Chip size="sm" variant="secondary">the app</Chip><Chip size="sm" variant="soft" className="mono">things/link/verbs/add.ts</Chip></span></td><td style={{ width: 100 }}><SparkBars values={[0, 0, 0, 1, 0, 0, 0, 1, 0, 1]} tone="danger" label="link.add defects per 3 minutes" /></td></tr></tbody></table>
      </Block>
      <div className="two">
        <Block title="What falls out" desc="With nothing configured">
          <ul className="plain small"><li>The key: operation, step and error tag, all on every span already.</li><li>Owner: the plugin or file that declared the operation.</li>
            <li>Regressed: seen again under a later hash of that operation's declaration.</li><li>The issue page is the operation's Spans tab, filtered to defects.</li></ul>
        </Block>
        <Block title="What would be declared" desc="Asked in K18">
          <ul className="plain small"><li>Where alerts go, per environment.</li><li>Optionally, a step that fails several ways splits by a field it names.</li></ul>
        </Block>
      </div>
      <Foot>Sample data. Grouping follows the research in design/research/monitoring.md.</Foot>
    </div>
  </Shell>
);

type Rule = { rule: string; from: string; state: "firing" | "warning" | "ok"; route: string };
const rules = (): Rule[] => [
  ...operations.filter((o) => o.budget).map((o) => ({ rule: `${o.name} latency: 95% within ${o.budget!.p95Ms} ms`, from: "budget.p95Ms", state: statOf(o).p95 > o.budget!.p95Ms ? "firing" as const : "ok" as const, route: "builder" })),
  ...operations.map((o) => ({ rule: `${o.name} defects: 99.9% of calls without one`, from: "every operation", state: statOf(o).defects ? "warning" as const : "ok" as const, route: "builder" })),
  ...Object.keys(model.refusals).filter((r) => r !== "NotAllowed").map((r) => ({ rule: `${r} (${model.refusals[r]}) rate against its usual`, from: "each declared error", state: "ok" as const, route: "builder" })),
  ...journeys.map((j) => ({ rule: `journey "${j.name}" passes in staging`, from: "each journey", state: j.verdicts.staging === "fail" ? "firing" as const : "ok" as const, route: "builder" })),
];

export const Alerts = () => {
  const all = rules(), open = all.filter((r) => r.state !== "ok");
  return (
    <Shell here={{ id: "alerts" }} crumbs={["Plugged In", "Monitor", "Alerts"]}>
      <div className="page">
        <Title h="Alerts" p={`${all.length} alert rules fall out of Plugged In's declarations. None is written by hand. Locally they show here and are never sent; in staging they go to the builder, in production they page.`} />
        <Block title="Open" desc="Firing or warning in local, in the last 30 minutes" flush>
          <table className="tbl"><tbody>{open.map((r) => <tr key={r.rule}><td><Chip size="sm" variant="soft" color={r.state === "firing" ? "danger" : "warning"}>{r.state}</Chip></td><td>{r.rule}</td><td className="small muted">from {r.from}</td></tr>)}</tbody></table>
        </Block>
        <Block title="Every rule" desc="Grouped by the declaration it falls out of. Standard burn windows: 14.4× over 1 h and 5 min, 6× over 6 h and 30 min." flush>
          <table className="tbl"><thead><tr><th>rule</th><th>falls out of</th><th>state</th></tr></thead>
            <tbody>{all.map((r) => <tr key={r.rule}><td className="small">{r.rule}</td><td className="small muted">{r.from}</td><td><Chip size="sm" variant="soft" color={r.state === "firing" ? "danger" : r.state === "warning" ? "warning" : "success"}>{r.state}</Chip></td></tr>)}</tbody></table>
        </Block>
        <Foot>Proposed in K18. A machine state held too long needs a declared limit, so no such rule exists yet.</Foot>
      </div>
    </Shell>
  );
};

export const About = () => (
  <Shell here={{ id: "about" }} crumbs={["Plugged In", "About this drawing"]} rail={false}>
    <div className="page prose-page">
      <header className="page-title"><h1>About this drawing</h1><p>The Orthograph portal for Plugged In, drawn with HeroUI Pro on the model Codex generated for stage 1. Every page is generated from that model by the same code, one page per declaration.</p></header>
      <Block title="What is real, what is filled in">
        <ul className="plain"><li><strong>From the model:</strong> things, fields, machines, events, errors and codes, operations with payload, answer, refusals, who may call, steps, budgets, and the four environments.</li>
          <li><strong>From the journey files:</strong> three journeys and two starting worlds, step by step.</li>
          <li><strong>Filled in by hand</strong>, because that model predates them: the plugin groups and plugin pages, role rules, secret fields, the store, notes, and the blank operation link.pin.</li>
          <li><strong>Sample numbers:</strong> every count, p95, trace and verdict.</li>
          <li><strong>Proposed, not agreed:</strong> the Monitor section (Issues, Alerts) and the round 3 layout throughout.</li></ul>
      </Block>
      <Block title="Left out on purpose"><p>The acme leftovers in that model (organization, invitation, membership, api-key, system), and any count of stored data: how many links exist, or how many are in each state.</p></Block>
    </div>
  </Shell>
);
