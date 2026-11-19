// An operation's page (Q5 A): the header, the tabs, and the Contract tab: the in-and-out band, then the spine from the model.
import { Move } from "../kit/key-path.tsx";
import { Chip, Tabs } from "@heroui/react";
import type { ReactNode } from "react";
import { allowedText, model, page, short, thingOfError, type Operation } from "../model.ts";
import { groupOf, mounts } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block, FieldTable } from "../ui.tsx";

export const tabs = [
  ["contract", "Contract"], ["metrics", "Metrics"], ["proof", "Proof"], ["docs", "Docs"], ["notes", "Notes"],
] as const;
export type Tab = (typeof tabs)[number][0];

/** The fixed order every Effect operation runs in (language-effect handler/service.ts:41-84), with its declared steps. */
export const spineOf = (o: Operation) => {
  const rows: { row: string; what: ReactNode }[] = [{ row: "role check", what: o.allowed.map(allowedText).join(", ") }];
  if (o.kind === "read") return [...rows, ...Object.values(o.steps).map((s) => ({ row: `step ${s.name.split(".").pop()}`, what: s.type }))];
  if (o.idempotent) rows.push({ row: "replay", what: "by request key" });
  if (o.move) rows.push({ row: "machine check", what: <Move from={o.move.from} to={o.move.to} /> });
  for (const s of Object.values(o.steps)) rows.push({ row: `step ${s.name.split(".").pop()}`, what: s.type });
  rows.push({ row: "answer check", what: Object.keys(o.answer).join(", ") || "—" });
  if (o.move) rows.push({ row: `move ${o.move.key}`, what: `emits ${o.move.emits}` });
  rows.push({ row: "commit", what: "1 store" });
  return rows;
};

export const OpShell = ({ o, tab, children }: { o: Operation; tab: Tab; children: ReactNode }) => {
  const g = groupOf(o.thing), m = g.mount ? mounts[g.mount] : null;
  const via = m && "narrowed" in m ? (m.narrowed as Record<string, string[]>)[o.name] : undefined;
  return (
    <Shell here={{ id: `op:${o.name}`, thing: o.thing, op: o.name, scope: { label: o.name, ops: [o.name] } }} crumbs={["Plugged In", g.label, o.thing, o.verb]}>
      <div className="page">
        <header className="page-title">
          <div className="title-row"><h1 className="mono-title">{o.name}</h1>{o.kind === "read" && <Chip size="sm" variant="soft">read</Chip>}</div>
          <p>{o.description}</p>
          <div className="props">
            <Chip size="sm" variant="soft">who may call: {o.allowed.map(allowedText).join(", ")}</Chip>
            {o.idempotent && <Chip size="sm" variant="soft">idempotent by request</Chip>}
            <Chip size="sm" variant="soft">runs on the {o.runs}</Chip>
            {o.budget && <Chip size="sm" variant="soft">budget p95 {o.budget.p95Ms} ms</Chip>}
            {via && <Chip size="sm" variant="soft" color="warning">ways in: {via.join(", ")} (not MCP)</Chip>}
            <Chip size="sm" variant="soft" className="mono">{o.file}</Chip>
            <Chip size="sm" variant="soft" className="mono">@{short(o.hash)}</Chip>
          </div>
        </header>
        <Tabs selectedKey={tab} className="page-tabs">
          <Tabs.ListContainer><Tabs.List aria-label={`${o.name} views`}>
            {tabs.map(([id, label]) => <Tabs.Tab key={id} id={id} href={page.op(o.name, id)}>{label}<Tabs.Indicator /></Tabs.Tab>)}
          </Tabs.List></Tabs.ListContainer>
        </Tabs>
        {children}
      </div>
    </Shell>
  );
};

const Refusals = ({ o }: { o: Operation }) => (
  <ul className="plain">
    {o.refusals.map((r) => {
      const t = thingOfError(r), declared = o.errors.includes(r);
      return <li key={r}><a className="mono" href={`refusals.html#${r}`}>{model.refusals[r]}</a> <span className="mono">{r}</span>
        <Chip size="sm" variant="soft" color={r === "NotAllowed" ? "default" : declared ? "warning" : "accent"}>{r === "NotAllowed" ? "at the door" : declared ? "declared" : `${t?.name}'s machine`}</Chip></li>;
    })}
  </ul>
);

export const Contract = ({ o }: { o: Operation }) => (
  <OpShell o={o} tab="contract">
    <Block title="In and out" desc="What goes in, what comes out, and every way it can say no. Each code is fixed once released.">
      <div className="band">
        <div><div className="eyebrow">in</div><FieldTable fields={o.payload} at={o.name} /></div>
        <div className="band-op mono">{o.verb}</div>
        <div><div className="eyebrow">out</div>{Object.keys(o.answer).length ? <FieldTable fields={o.answer} at={o.name} /> : <p className="muted small">An empty answer.</p>}</div>
      </div>
      <div className="two band-foot">
        <div><div className="eyebrow">refusals</div><Refusals o={o} /></div>
        <div><div className="eyebrow">moves and records</div>
          {o.move ? <div className="row-chips"><Move from={o.move.from} to={o.move.to} /><span className="muted small">emits</span><a href={`events.html#${o.move.emits}`}><Chip size="sm" variant="soft" color="success" className="mono">{o.move.emits}</Chip></a></div>
            : <p className="muted small">Changes no state; emits nothing.</p>}
        </div>
      </div>
    </Block>
    <Block title="The spine" desc="The fixed order every operation runs in, with this operation's declared steps in their place. A call's trace lights it up: open one from the calls table on the Metrics tab." flush>
      <ol className="spine">{spineOf(o).map((r, i) => (
        <li key={r.row}><span className="mono muted">{i === spineOf(o).length - 1 ? "└" : "├"}</span><span className="mono">{r.row}</span><span className="mono muted">{r.what}</span><span /><span /></li>))}</ol>
    </Block>
    <Foot>Generated from `operations.{o.name}`: payload, answer, refusals, allowed, idempotent, move, steps, runs, budget and hash.</Foot>
  </OpShell>
);
