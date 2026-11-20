// handle.claim's Contract tab as each G5 option draws it: how a refusal names its rule (Q2), and whether the spine
// has a stop for rules (Q4), with one refused claim of "aaron" traced through it.
import { ItemCard } from "@heroui-pro/react/item-card";
import { ItemCardGroup } from "@heroui-pro/react/item-card-group";
import { Chip } from "@heroui/react";
import { DoorIcon, ScalesIcon } from "@phosphor-icons/react/ssr";
import { Code as CodeBlock } from "../code.tsx";
import { model } from "../model.ts";
import { Move } from "../kit/key-path.tsx";
import { TraceWaterfall } from "../kit/trace-waterfall.tsx";
import type { Row, Trace } from "../trace.ts";
import { OpShell, spineOf } from "../pages/op.tsx";
import { Block, FieldTable } from "../ui.tsx";
import { codes, docsRows, rules, type Q2 } from "./data.ts";

const o = model.operations["handle.claim"]!;
export type Snippets = { scaffold: string; scaffoldHtml: string; mcp: string; mcpHtml: string; decl: string; declHtml: string };

const Exit = ({ name }: { name: string }) => <><Chip size="sm" variant="soft" className="mono">{codes[name]!.code}</Chip><Chip size="sm" variant="soft" className="mono">exit {codes[name]!.exit}</Chip></>;

/** Q2: the band's refusals, each saying which rule refused it, and how. */
const Refusals = ({ q }: { q: Q2 }) => (
  <ItemCardGroup variant="transparent" className="g5-refusals">
    {rules.map((r) => (
      <ItemCard key={r.refuse} variant="transparent">
        <ItemCard.Icon><ScalesIcon size={17} aria-hidden="true" /></ItemCard.Icon>
        <ItemCard.Content>
          <ItemCard.Title><span className="row-chips"><span className="mono">{r.refuse}</span><Exit name={r.refuse} /></span></ItemCard.Title>
          <ItemCard.Description>
            {q === "a" && <>{r.because[0]!.toUpperCase() + r.because.slice(1)}. <a className="mono" href="#">{r.name} ▸</a></>}
            {q === "b" && <a className="mono" href="#">{r.name} ▸</a>}
            {q === "c" && <>{r.written} <a className="mono" href="#">{r.name} ▸</a></>}
          </ItemCard.Description>
        </ItemCard.Content>
      </ItemCard>))}
    <ItemCard variant="transparent">
      <ItemCard.Icon><DoorIcon size={17} aria-hidden="true" /></ItemCard.Icon>
      <ItemCard.Content><ItemCard.Title><span className="row-chips"><span className="mono">NotAllowed</span><Exit name="NotAllowed" /></span></ItemCard.Title><ItemCard.Description>At the door, when the caller isn't signed in.</ItemCard.Description></ItemCard.Content>
    </ItemCard>
  </ItemCardGroup>
);

const Band = ({ q }: { q: Q2 }) => (
  <Block title="In and out" desc="What goes in, what comes out, and every way it can say no. Each code is fixed once released.">
    <div className="band">
      <div><div className="eyebrow">in</div><FieldTable fields={o.payload} at={o.name} /></div>
      <div className="band-op mono">{o.verb}</div>
      <div><div className="eyebrow">out</div><FieldTable fields={o.answer} at={o.name} /></div>
    </div>
    <div className="two band-foot">
      <div><div className="eyebrow">refusals</div><Refusals q={q} /></div>
      <div><div className="eyebrow">moves and records</div>
        <div className="row-chips"><Move from={[]} to={["claimed"]} /><span className="muted small">emits</span><Chip size="sm" variant="soft" color="success" className="mono">HandleClaimed</Chip></div></div>
    </div>
  </Block>
);

/** Q4: the spine, with a "rules" stop between the move and the commit (A), or without (B). */
const spineRows = (q4: "a" | "b") => spineOf(o).flatMap((r) => r.row === "move claim" && q4 === "a"
  ? [r, { row: "rules", what: <span className="row-chips">{rules.map((x) => <Chip key={x.name} size="sm" variant="soft" color="accent" className="mono">{x.name}</Chip>)}</span> }] : [r]);

const Spine = ({ q4 }: { q4: "a" | "b" }) => {
  const rows = spineRows(q4);
  return (
    <Block title="The spine" desc="The fixed order every operation runs in, with this operation's declared steps in their place. A call's trace lights it up: open one from the calls table on the Metrics tab." flush>
      <ol className="spine">{rows.map((r, i) => (
        <li key={r.row} className={r.row === "rules" ? "g5-new" : undefined}><span className="mono muted">{i === rows.length - 1 ? "└" : "├"}</span><span className="mono">{r.row}</span><span className="mono muted">{r.what}</span>{r.row !== "rules" && <span />}
          <span>{r.row === "rules" && <Chip size="sm" variant="soft" color="accent">new</Chip>}</span></li>))}</ol>
    </Block>
  );
};

/** One claim of "aaron", refused because another claimed handle has that name: where each option stops it. */
const traceOf = (q4: "a" | "b"): Trace => {
  const at = { "role check": "signed-in: passed", replay: "new request key", "machine check": "machine.check: passed", "step load": "step.kind: database",
    "step record": "step.kind: database", "answer check": "passed", "move claim": "move.name: claim" } as Record<string, string>;
  const ms = { "step load": 2.0, "step record": 1.1 } as Record<string, number>;
  let t = 0;
  const rows: Row[] = spineRows(q4).map((r) => {
    const refused = q4 === "a" ? r.row === "rules" : r.row === "commit";
    const attr = refused ? `refusal.invariant: ${rules[0]!.full}` : r.row === "commit" ? "not reached: nothing written" : at[r.row] ?? "passed";
    const row: Row = { key: r.row, name: r.row, attr, start: t, ms: r.row === "commit" && !refused ? 0 : r.row === "rules" ? 0.6 : ms[r.row] ?? 0.1, depth: 1, tone: refused ? "refused" : undefined };
    t += row.ms;
    return row;
  });
  return { id: "c-aaron", who: "signed-in", at: "12:04:29", outcome: "HandleTaken", callerKind: "a person (signed-in)", attempts: 1, logs: 1, total: t,
    summary: q4 === "a" ? "Refused HandleTaken at the rules stop: oneHolderPerName found another claimed handle named aaron. Nothing was committed."
      : "Refused HandleTaken, marked on the commit row: oneHolderPerName found another claimed handle named aaron. Nothing was committed.",
    rows: [{ key: "a1", name: "attempt 1", attr: "attempt: 1", start: 0, ms: t, depth: 0 }, ...rows] };
};

/** Q2: the same refusal on the three surfaces outside the portal. */
const Elsewhere = ({ q, s }: { q: Q2; s: Snippets }) => (
  <Block title="The same refusals, outside the portal" desc="Drawn here to compare. The docs page is generated/docs/handle/claim.md; the scaffold header opens src/handle/claim.ts; the MCP description is what an agent reads before it calls.">
    <div className="eyebrow">generated docs page, refusals</div>
    <table className="tbl g5-docs"><thead><tr><th>refusal</th><th className="num">exit</th><th>code</th><th>when</th></tr></thead>
      <tbody>{docsRows(q).map((r) => <tr key={r.refusal}><td className="mono">{r.refusal}</td><td className="num mono">{r.exit}</td><td className="mono">{r.code}</td><td className="small">{r.when}</td></tr>)}</tbody></table>
    <div className="g5-snips">
      <CodeBlock title="scaffold header · src/handle/claim.ts" code={s.scaffold} html={s.scaffoldHtml} />
      <div className="wrap-code"><CodeBlock title="MCP tool · generated/mcp/src/index.ts" code={s.mcp} html={s.mcpHtml} /></div>
      {q === "c" && <CodeBlock title="what you write, once per rule" code={s.decl} html={s.declHtml} />}
    </div>
  </Block>
);

export const ClaimQ2 = ({ q, s }: { q: Q2; s: Snippets }) => (
  <OpShell o={o} tab="contract"><Band q={q} /><Elsewhere q={q} s={s} /></OpShell>
);

export const ClaimQ4 = ({ q4 }: { q4: "a" | "b" }) => (
  <OpShell o={o} tab="contract">
    <Band q="a" />
    <Spine q4={q4} />
    <Block title={`One call traced: a claim of "aaron", refused`} desc="What the trace drawer shows for this call, opened from the calls table on the Metrics tab. Drawn here, under the spine, to compare. Timings are illustrative." flush>
      <div className="pad"><TraceWaterfall t={traceOf(q4)} /></div>
    </Block>
  </OpShell>
);
