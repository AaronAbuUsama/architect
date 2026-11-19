// Q1 B: a rule gets its own page, reached from a row under its thing in the tree and from ⌘K.
import { KPI } from "@heroui-pro/react/kpi";
import { KPIGroup } from "@heroui-pro/react/kpi-group";
import { Widget } from "@heroui-pro/react/widget";
import { Chip } from "@heroui/react";
import { ScalesIcon } from "@phosphor-icons/react/ssr";
import { Code as CodeBlock } from "../code.tsx";
import { groupOf } from "../overlay.ts";
import { Shell } from "../shell.tsx";
import { Move } from "../kit/key-path.tsx";
import { Block } from "../ui.tsx";
import { declaration, rules } from "./data.ts";
import { Code, State } from "./thing.tsx";

export const ruleRows = { handle: rules.map((r) => ({ id: `rule:${r.name}`, label: r.name, href: "#", chip: "RULE" })) };

export const RulePage = ({ html }: { html: string }) => {
  const r = rules[0]!, g = groupOf("handle");
  return (
    <Shell here={{ id: `rule:${r.name}`, thing: "handle", scope: { label: "handle.claim", ops: ["handle.claim"] } }} crumbs={[g.label, "handle", r.name]}>
      <div className="page">
        <header className="page-title">
          <div className="title-row"><h1 className="mono-title">{r.full}</h1><Chip size="sm" variant="soft" color="accent"><ScalesIcon size={11} aria-hidden="true" />rule</Chip></div>
          <p>{r.says}</p>
          <div className="props">
            <Chip size="sm" variant="soft">unique</Chip>
            <Chip size="sm" variant="soft" className="mono">key: {r.field}</Chip>
            <Chip size="sm" variant="soft">holds while claimed</Chip>
            <Chip size="sm" variant="soft" className="mono">blueprint/things/handle/invariants.ts</Chip>
            <Chip size="sm" variant="soft" className="mono">@3f0a9c2</Chip>
          </div>
        </header>
        <Widget>
          <Widget.Header><div className="head-text"><Widget.Title>In the window</Widget.Title><Widget.Description>Calls the rule was checked on, and how many it refused. Illustrative.</Widget.Description></div></Widget.Header>
          <KPIGroup className="widget-kpis">
            <KPI><KPI.Header><KPI.Title>checked</KPI.Title></KPI.Header><KPI.Content><span className="kpi-text">408</span></KPI.Content><KPI.Footer>claim calls that reached the rule</KPI.Footer></KPI>
            <KPI><KPI.Header><KPI.Title>refused</KPI.Title></KPI.Header><KPI.Content><span className="kpi-text tone-warning">{r.refused}</span></KPI.Content><KPI.Footer>with HandleTaken</KPI.Footer></KPI>
            <KPI><KPI.Header><KPI.Title>operations</KPI.Title></KPI.Header><KPI.Content><span className="kpi-text">1</span></KPI.Content><KPI.Footer>that can break it: claim</KPI.Footer></KPI>
          </KPIGroup>
        </Widget>
        <Block title="Declaration" desc="One export of the thing's invariants.ts"><CodeBlock title="invariants.ts" code={declaration} html={html} /></Block>
        <Block title="Operations" desc="How each of the handle's operations touches this rule" flush>
          <table className="tbl"><thead><tr><th>operation</th><th>move</th><th>touches the rule</th><th className="num">refused</th></tr></thead>
            <tbody>
              <tr><td className="mono"><a href="#">claim</a></td><td><Move from={[]} to={["claimed"]} /></td><td className="small">can break it: checked after the move, before the commit</td><td className="num mono tone-warning">{r.refused}</td></tr>
              <tr><td className="mono"><a href="#">release</a></td><td><Move from={["claimed"]} to={["released"]} /></td><td className="small">frees the name: a released handle is outside the rule</td><td className="num mono">0</td></tr>
              <tr><td className="mono"><a href="#">resolve</a></td><td><span className="muted small">read</span></td><td className="small">reads by it: findBy(oneHolderPerName, name)</td><td className="num mono">0</td></tr>
            </tbody></table>
        </Block>
        <div className="two">
          <Block title="The refusal it owns" desc="Declared once, on the rule; no operation lists it in its errors">
            <ul className="plain"><li><Code name={r.refuse} /></li></ul>
            <p className="small muted">The runtime fills it and counts it as a refusal, never a defect. The call's span carries <span className="mono">refusal.invariant: {r.full}</span>.</p>
          </Block>
          <Block title="Where it is enforced" desc="The same rule, at the runtime's stop and in the store">
            <dl className="kv kv-narrow">
            <dt>the runtime</dt><dd>after the move and before the commit, it looks for another claimed handle with the same name</dd>
            <dt>the store</dt><dd><span className="mono">{r.index}</span>, a partial unique index over <span className="mono">name</span> where the state is <State s="claimed" /></dd>
            <dt>a race</dt><dd>two claims at once: the index refuses the second commit, the call retries, and the retry's check refuses HandleTaken</dd>
          </dl>
        </Block>
        </div>
      </div>
    </Shell>
  );
};
