// A thing's page: its lifecycle first, then fields (added in round 3), operations, events, errors, access, journeys, notes.
import { Chip } from "@heroui/react";
import { journeysCalling } from "../journeys.ts";
import { moveCounts, refusedTotal, statOf } from "../live.ts";
import { allowedText, model, opsOf, page, short } from "../model.ts";
import { useOpt } from "../opt.tsx";
import { groupOf, mounts, roleRules, stores } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { VerdictTile } from "../kit/verdict-matrix.tsx";
import { Block, FieldTable, Lifecycle, Spark, SparkBars } from "../ui.tsx";

/** Each move's refusals, on the arrow they guard: the moving operation's refusals, NotAllowed aside (it stops at the door). */
export const guardsOf = (thing: string) => Object.fromEntries(opsOf(thing).filter((o) => o.move).map((o) => {
  const s = statOf(o), top = Object.entries(s.refused).filter(([k]) => k !== "NotAllowed").sort((a, b) => b[1] - a[1])[0];
  return [o.move!.key, top ? `${top[0]} ×${top[1]}` : ""];
}));

export const ThingPage = ({ name }: { name: string }) => {
  const t = model.things[name]!, g = groupOf(name), m = g.mount ? mounts[g.mount] : null, ops = opsOf(name);
  const journeys = [...new Set(ops.flatMap((o) => journeysCalling(o.name)))];
  const labelsOnly = useOpt().plugins === "c"; // round 3 Q3 C: labels, no plugin or store pages
  return (
    <Shell here={{ id: `thing:${name}`, thing: name, scope: { label: name, ops: ops.map((o) => o.name) } }} crumbs={["Plugged In", g.label, name]}>
      <div className="page">
        <header className="page-title">
          <div className="title-row"><h1>{name}</h1><span className="chips"><Chip size="sm" variant="soft" className="mono">id {t.identifier}</Chip><Chip size="sm" variant="soft" className="mono">codes {t.code}-…</Chip></span></div>
          <p>{t.description}</p>
          <div className="props">
            {labelsOnly ? <>
              {m ? <><Chip size="sm" variant="soft">{g.label}</Chip><Chip size="sm" variant="soft" className="tag">PLUGIN</Chip><Chip size="sm" variant="soft" className="mono">{m.version}</Chip></> : <Chip size="sm" variant="soft">the app's own</Chip>}
              <Chip size="sm" variant="soft">lives in: {t.store ?? stores[0]!.name} (database)</Chip></> : <>
              {m ? <Chip size="sm" variant="soft"><a href="plugins.html">{m.package} {m.version}</a></Chip> : <Chip size="sm" variant="soft">the app's own</Chip>}
              <Chip size="sm" variant="soft">lives in {t.lives} rows</Chip>
              <Chip size="sm" variant="soft"><a href="plugins.html">store: {t.store ?? stores[0]!.name}</a></Chip></>}
            <Chip size="sm" variant="soft" className="mono">thing:{name}@{short(t.hash)}</Chip>
          </div>
        </header>
        <Block title="Lifecycle" desc="Moves answered in the window, on each arrow; the most common refusal on the arrow it guards. No counts of how many are in each state: that is stored data.">
          <Lifecycle thing={t} counts={moveCounts} guards={guardsOf(name)} />
          {t.machine && <p className="muted small">Moving from the wrong state is refused <a href={`refusals.html#${t.machine.notFrom.error}`} className="mono">{t.machine.notFrom.error} {t.machine.notFrom.code}</a> (generated, exit {t.machine.notFrom.exit}).</p>}
        </Block>
        <Block title="Fields" desc="Every field with its type and where it was taken from. Field descriptions arrive with M1.42." flush><FieldTable fields={t.fields} at={name} /></Block>
        <Block title="Operations" desc="Each with who may call it and its numbers in the window" flush>
          <table className="tbl"><thead><tr><th>operation</th><th>who may call</th><th>description</th><th className="num">calls</th><th className="num">refused</th><th className="num">defects</th><th className="num">p95</th><th>trend</th></tr></thead>
            <tbody>{ops.map((o) => { const s = statOf(o); return (
              <tr key={o.name}><td><a className="mono" href={page.op(o.name)}>{o.verb}</a>{o.kind === "read" && <span className="muted small"> read</span>}</td>
                <td className="small">{o.allowed.map(allowedText).join(", ")}</td><td className="small">{o.description}</td>
                <td className="num mono">{s.calls.toLocaleString("en-US")}</td><td className={`num mono${refusedTotal(s) ? " tone-warning" : ""}`}>{refusedTotal(s)}</td>
                <td className={`num mono${s.defects ? " tone-danger" : ""}`}>{s.defects}</td><td className={`num mono${s.budget && s.p95 > s.budget ? " tone-danger" : ""}`}>{s.p95} ms</td>
                <td style={{ width: 100 }}><SparkBars values={s.spark} label={`${o.name} calls per minute`} /></td></tr>); })}</tbody></table>
        </Block>
        <div className="two">
          <Block title="Events" desc="What a move records, with what it carries">
            {Object.keys(t.events).length === 0 ? <p className="muted small">No events declared.</p> :
              <ul className="plain">{Object.entries(t.events).map(([e, f]) => <li key={e}><a href={`events.html#${e}`} className="mono">{e}</a> <span className="mono muted">{`{ ${Object.keys(f).join(", ")} }`}</span></li>)}</ul>}
          </Block>
          <Block title="Errors" desc="Declared refusals, then the machine's">
            <ul className="plain">
              {Object.entries(t.errors).map(([e, x]) => <li key={e}><a className="mono" href={`refusals.html#${e}`}>{x.code}</a> <span className="mono">{e}</span> <span className="muted small">exit {x.exit}</span></li>)}
              {t.machine && <li><a className="mono" href={`refusals.html#${t.machine.notFrom.error}`}>{t.machine.notFrom.code}</a> <span className="mono">{t.machine.notFrom.error}</span> <Chip size="sm" variant="soft" className="mono">exit {t.machine.notFrom.exit}</Chip><Chip size="sm" variant="soft">generated</Chip></li>}
              {Object.keys(t.errors).length === 0 && !t.machine && <li className="muted small">None declared.</li>}
            </ul>
          </Block>
        </div>
        <div className="two">
          <Block title="Roles" desc="Declared on this thing, with their rules">
            {t.roles.length === 0 ? <p className="muted small">No roles declared. Its operations are open to anyone or to anyone signed in.</p> :
              <ul className="plain">{t.roles.map((r) => <li key={r}><a href="access.html" className="mono">{r}</a> <span className="mono muted">{roleRules[`${name}.${r}`] ?? ""}</span></li>)}</ul>}
          </Block>
          <Block title="Journeys" desc="Journeys that call this thing's operations">
            {journeys.length === 0 ? <p className="muted small">No journey calls it yet.</p> :
              <ul className="plain">{journeys.map((j) => <li key={j.slug}><a href={`journey-${j.slug}.html`}>{j.name}</a> <span className="row-chips">{Object.entries(j.verdicts).map(([e, v]) => <VerdictTile key={e} v={v} title={`${v} in ${e}`} />)}</span></li>)}</ul>}
          </Block>
        </div>
        <Foot>Generated from `things.{name}` in the model. Plugin, store and role rules come from the overlay for fields the links/stage-1 model predates (`from`, `stores`, `roleRules`).</Foot>
      </div>
    </Shell>
  );
};
