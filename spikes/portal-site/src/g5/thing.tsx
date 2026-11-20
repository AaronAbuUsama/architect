// The handle's page as each G5 option draws it: round 4's thing page (pages/thing.tsx), with a Rules section (Q1 A),
// rules as notes in Errors (Q1 C), and the lifecycle with or without a badge on the states a rule holds in (Q3).
import { Badge, Chip } from "@heroui/react";
import { ScalesIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { journeysCalling } from "../journeys.ts";
import { moveCounts, refusedTotal, statOf } from "../live.ts";
import { allowedText, model, opsOf, page, short } from "../model.ts";
import { groupOf, mounts, roleRules } from "../overlay.ts";
import { Shell } from "../shell.tsx";
import { VerdictTile } from "../kit/verdict-matrix.tsx";
import { Block, FieldTable, Lifecycle, SparkBars } from "../ui.tsx";
import { guardsOf } from "../pages/thing.tsx";
import { codes, ruleOf, rules } from "./data.ts";

const t = model.things.handle!;

/** A refusal as a code, its name and its exit, each in its own chip. */
export const Code = ({ name, exit = true, children }: { name: string; exit?: boolean; children?: ReactNode }) => (
  <span className="row-chips"><Chip size="sm" variant="soft" className="mono">{codes[name]!.code}</Chip><span className="mono">{name}</span>
    {exit && <Chip size="sm" variant="soft" className="mono">exit {codes[name]!.exit}</Chip>}{children}</span>
);
export const State = ({ s }: { s: string }) => <Chip size="sm" variant="soft" color="accent" className="mono">{s}</Chip>;

/** Q3: the lifecycle, with a badge counting the rules that hold in each state (B), or not (A). */
const LifecycleBlock = ({ badge }: { badge: boolean }) => (
  <Block title="Lifecycle" desc={`Moves answered in the window, on each arrow; the most common refusal on the arrow it guards.${badge ? " A badge counts the rules that hold in a state." : ""}`}>
    <div className="lc-wrap">
      <Lifecycle thing={t} counts={moveCounts} guards={guardsOf("handle")} />
      {badge && <Badge.Anchor className="lc-anchor" aria-label="2 rules hold in claimed">
        <span className="lc-hit" />
        <Badge color="accent" placement="top-right"><Badge.Label className="lc-badge"><ScalesIcon size={11} aria-hidden="true" />2</Badge.Label></Badge>
      </Badge.Anchor>}
    </div>
    {badge && <p className="muted small lc-key"><Chip size="sm" variant="soft" color="accent"><ScalesIcon size={11} aria-hidden="true" />2</Chip>on claimed: the rules that hold while a handle is claimed. Hover the state to name them.</p>}
    <p className="muted small">Moving from the wrong state is refused <span className="mono">HandleNotClaimed HN-900</span> (generated, exit 11).</p>
  </Block>
);

/** Q1 A: a Rules section under the lifecycle, one row per export of invariants.ts. */
export const RulesBlock = () => (
  <Block title="Rules" desc="What can never be true, from invariants.ts. The runtime checks each rule after the move and before the commit, and refuses with the error the rule owns." flush>
    <table className="tbl">
      <thead><tr><th>rule</th><th>says</th><th>holds while</th><th>refuses with</th><th className="num">refused</th></tr></thead>
      <tbody>{rules.map((r) => (
        <tr key={r.name}><td><a className="mono" href="#">{r.name}</a></td><td className="small">{r.says}</td>
          <td>{r.while.map((s) => <State key={s} s={s} />)}</td><td><Code name={r.refuse} exit={false} /></td><td className="num mono tone-warning">{r.refused}</td></tr>))}</tbody>
    </table>
  </Block>
);

const ErrorsBlock = ({ q1 }: { q1: "a" | "c" }) => (
  <Block title="Errors" desc={q1 === "c" ? "Declared refusals, then the machine's. A refusal a rule owns carries the rule as a note." : "Declared refusals, then the machine's. A rule's refusal names the rule."}>
    <ul className="plain g5-errors">
      {["HandleTaken", "HandleAlreadyOwned", "HandleNotFound"].map((e) => { const r = ruleOf(e); return (
        <li key={e}><Code name={e} />
          {r && q1 === "a" && <Chip size="sm" variant="soft" color="accent"><ScalesIcon size={11} aria-hidden="true" />rule {r.name}</Chip>}
          {r && q1 === "c" && <span className="err-note small"><span>{r.says}</span><Chip size="sm" variant="soft" color="accent"><ScalesIcon size={11} aria-hidden="true" />rule {r.name}</Chip><Chip size="sm" variant="soft">holds while claimed</Chip></span>}
        </li>); })}
      <li><Code name="HandleNotClaimed"><Chip size="sm" variant="soft">generated</Chip></Code></li>
    </ul>
  </Block>
);

export const HandlePage = ({ q1, q3 }: { q1: "a" | "c"; q3: "a" | "b" }) => {
  const g = groupOf("handle"), m = g.mount ? mounts[g.mount] : null, ops = opsOf("handle");
  const journeys = [...new Set(ops.flatMap((o) => journeysCalling(o.name)))];
  return (
    <Shell here={{ id: "thing:handle", thing: "handle", scope: { label: "handle", ops: ops.map((o) => o.name) } }} crumbs={["Plugged In", g.label, "handle"]}>
      <div className="page">
        <header className="page-title">
          <div className="title-row"><h1>handle</h1><span className="chips"><Chip size="sm" variant="soft" className="mono">id {t.identifier}</Chip><Chip size="sm" variant="soft" className="mono">codes {t.code}-…</Chip></span></div>
          <p>{t.description}</p>
          <div className="props">
            {m && <Chip size="sm" variant="soft"><a href="plugins.html">{m.package} {m.version}</a></Chip>}
            <Chip size="sm" variant="soft">lives in {t.lives} rows</Chip>
            {q1 === "a" && <Chip size="sm" variant="soft"><ScalesIcon size={11} aria-hidden="true" />{rules.length} rules</Chip>}
            <Chip size="sm" variant="soft" className="mono">thing:handle@{short(t.hash)}</Chip>
          </div>
        </header>
        <LifecycleBlock badge={q3 === "b"} />
        {q1 === "a" && <RulesBlock />}
        <Block title="Fields" desc="Every field with its type and where it was taken from" flush><FieldTable fields={t.fields} at="handle" /></Block>
        <Block title="Operations" desc="Each with who may call it and its numbers in the window" flush>
          <table className="tbl"><thead><tr><th>operation</th><th>who may call</th><th>description</th><th className="num">calls</th><th className="num">refused</th><th className="num">defects</th><th className="num">p95</th><th>trend</th></tr></thead>
            <tbody>{ops.map((o) => { const s = statOf(o); return (
              <tr key={o.name}><td><a className="mono" href={page.op(o.name)}>{o.verb}</a>{o.kind === "read" && <span className="muted small"> read</span>}</td>
                <td className="small">{o.allowed.map(allowedText).join(", ")}</td><td className="small">{o.description}</td>
                <td className="num mono">{s.calls.toLocaleString("en-US")}</td><td className={`num mono${refusedTotal(s) ? " tone-warning" : ""}`}>{refusedTotal(s)}</td>
                <td className="num mono">{s.defects}</td><td className="num mono">{s.p95} ms</td>
                <td style={{ width: 100 }}><SparkBars values={s.spark} label={`${o.name} calls per minute`} /></td></tr>); })}</tbody></table>
        </Block>
        <div className="two">
          <Block title="Events" desc="What a move records, with what it carries">
            <ul className="plain">{Object.entries(t.events).map(([e, f]) => <li key={e}><span className="mono">{e}</span> <span className="mono muted">{`{ ${Object.keys(f).join(", ")} }`}</span></li>)}</ul>
          </Block>
          <ErrorsBlock q1={q1} />
        </div>
        <div className="two">
          <Block title="Roles" desc="Declared on this thing, with their rules">
            <ul className="plain">{t.roles.map((r) => <li key={r}><span className="mono">{r}</span> <span className="mono muted">{roleRules[`handle.${r}`] ?? ""}</span></li>)}</ul>
          </Block>
          <Block title="Journeys" desc="Journeys that call this thing's operations">
            <ul className="plain">{journeys.map((j) => <li key={j.slug}>{j.name} <span className="row-chips">{Object.entries(j.verdicts).map(([e, v]) => <VerdictTile key={e} v={v} title={`${v} in ${e}`} />)}</span></li>)}</ul>
          </Block>
        </div>
      </div>
    </Shell>
  );
};
