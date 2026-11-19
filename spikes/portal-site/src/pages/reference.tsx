// The reference pages (round 3 Q5 A): one table each, every row an anchor. Machines, refusal codes, access, events, values.
import { Chip } from "@heroui/react";
import { WarningIcon } from "@phosphor-icons/react/ssr";
import { moveCounts, statOf } from "../live.ts";
import { allowedText, model, operations, page, refusalRows, things, typeText } from "../model.ts";
import { roleRules } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block, Lifecycle } from "../ui.tsx";
import { guardsOf } from "./thing.tsx";

const Title = ({ h, p }: { h: string; p: string }) => <header className="page-title"><h1>{h}</h1><p>{p}</p></header>;
const refusedIn = (name: string) => operations.reduce((a, o) => a + (statOf(o).refused[name] ?? 0), 0);

export const Machines = () => (
  <Shell here={{ id: "machines" }} crumbs={["Plugged In", "Blueprint", "Machines"]}>
    <div className="page">
      <Title h="Machines" p="Every lifecycle in the app, drawn from its machine and lit by the moves answered in the window." />
      <div className="callout"><WarningIcon size={16} aria-hidden="true" /><span>No state distribution. How many links are listed right now is stored data, which round 2 (Q4) keeps out of the portal. What falls out instead is the moves per arrow and the refusals each arrow guards. A dwell-time view is asked in K18.</span></div>
      {things.filter((t) => t.machine).map((t) => (
        <Block key={t.name} title={t.name} desc={t.description} flush>
          <div className="pad"><Lifecycle thing={t} counts={moveCounts} guards={guardsOf(t.name)} /></div>
          <table className="tbl"><thead><tr><th>move</th><th>from</th><th>to</th><th>emits</th><th>operation</th><th className="num">answered</th></tr></thead>
            <tbody>{Object.entries(t.machine!.moves).map(([k, m]) => { const op = operations.find((o) => o.thing === t.name && o.move?.key === k); return (
              <tr key={k}><td className="mono">{k}</td><td className="mono muted">{m.from.join(" | ") || "·"}</td><td className="mono">{m.to.join(" | ")}</td>
                <td><a className="mono" href={`events.html#${m.emits}`}>{m.emits}</a></td><td>{op && <a className="mono" href={page.op(op.name)}>{op.name}</a>}</td>
                <td className="num mono">{moveCounts[`${t.name}.${k}`] ?? 0}</td></tr>); })}
              <tr><td className="mono muted">wrong state</td><td colSpan={3} className="muted small">any move from a state it doesn't leave</td><td colSpan={2}><a className="mono" href={`refusals.html#${t.machine!.notFrom.error}`}>{t.machine!.notFrom.code} {t.machine!.notFrom.error}</a></td></tr>
            </tbody></table>
        </Block>))}
      <p className="muted small">Things without a machine: {things.filter((t) => !t.machine).map((t) => t.name).join(", ")}.</p>
      <Foot>Generated from each `ThingModel.machine`: states, moves (from, to, emits) and `notFrom`.</Foot>
    </div>
  </Shell>
);

export const Refusals = () => (
  <Shell here={{ id: "refusals" }} crumbs={["Plugged In", "Blueprint", "Refusal codes"]}>
    <div className="page">
      <Title h="Refusal codes" p="Every way the app can say no, with its code. A code never moves once released. A refusal is the app working; a defect is not on this page." />
      <Block title={`${Object.keys(model.refusals).length} codes`} desc="Refused in the window: local · last 30 min" flush>
        <table className="tbl"><thead><tr><th>code</th><th>name</th><th>from</th><th className="num">exit</th><th>raised by</th><th className="num">refused</th></tr></thead>
          <tbody>{refusalRows().map((r) => (
            <tr key={r.name} id={r.name}><td className="mono">{r.code}</td><td className="mono">{r.name}</td>
              <td className="small">{r.source === "runtime" ? "the runtime, at the door" : r.source === "machine" ? <>{r.thing}'s machine</> : <a href={page.thing(r.thing)}>{r.thing}</a>}</td>
              <td className="num mono">{r.exit}</td><td className="small">{r.raisedBy.map((o) => <a key={o} className="mono" href={page.op(o)}>{o} </a>)}</td>
              <td className={`num mono${refusedIn(r.name) ? " tone-warning" : ""}`}>{refusedIn(r.name)}</td></tr>))}</tbody></table>
      </Block>
      <Foot>Generated from `Model.refusals`, each thing's `errors` and `machine.notFrom`, and each operation's `refusals`. Counts from `ortho.calls` by error tag.</Foot>
    </div>
  </Shell>
);

export const Access = () => (
  <Shell here={{ id: "access" }} crumbs={["Plugged In", "Blueprint", "Access"]}>
    <div className="page">
      <Title h="Access" p="Who may call what. A caller without the role is refused NotAllowed (AR-001) before the handler runs." />
      <Block title="Roles" desc="Declared on a thing; the rule decides it from the thing's own fields" flush>
        <table className="tbl"><thead><tr><th>role</th><th>on</th><th>rule</th></tr></thead>
          <tbody>{Object.entries(roleRules).map(([r, rule]) => <tr key={r} id={r}><td className="mono">{r.split(".")[1]}</td><td><a href={page.thing(r.split(".")[0]!)}>{r.split(".")[0]}</a></td><td className="mono muted">{rule}</td></tr>)}</tbody></table>
      </Block>
      <Block title="Operations" desc="Grouped by who may call them" flush>
        <table className="tbl"><thead><tr><th>who may call</th><th>operations</th><th className="num">NotAllowed in the window</th></tr></thead>
          <tbody>{["anyone", "signed-in", "handleOwner", "linkOwner"].map((k) => { const ops = operations.filter((o) => o.allowed.some((a) => allowedText(a) === k)); return (
            <tr key={k}><td><Chip size="sm" variant="soft">{k}</Chip></td><td>{ops.map((o) => <a key={o.name} className="mono" href={page.op(o.name)}>{o.name} </a>)}</td>
              <td className="num mono">{ops.reduce((a, o) => a + (statOf(o).refused.NotAllowed ?? 0), 0)}</td></tr>); })}</tbody></table>
      </Block>
      <Foot>Generated from each operation's `allowed` and each thing's `roles` and `roleRules`.</Foot>
    </div>
  </Shell>
);

const eventRate: Record<string, number> = { HandleClaimed: 375, HandleReleased: 2, LinkAdded: 946, LinkRemoved: 62 };
export const Events = () => (
  <Shell here={{ id: "events" }} crumbs={["Plugged In", "Blueprint", "Events"]}>
    <div className="page">
      <Title h="Events" p="What each move records, what it carries, and who listens. Events are the operator's and the builder's; callers read state, not the journal." />
      <Block title="Events" desc="Committed in the window, from the journal" flush>
        <table className="tbl"><thead><tr><th>event</th><th>carries</th><th>emitted by</th><th>listened to by (on:)</th><th className="num">committed</th></tr></thead>
          <tbody>{things.flatMap((t) => Object.entries(t.events).map(([e, f]) => { const op = operations.find((o) => o.move?.emits === e); return (
            <tr key={e} id={e}><td className="mono">{e}</td><td className="mono muted">{Object.entries(f).map(([k, v]) => `${k}: ${typeText(v)}`).join(", ")}</td>
              <td>{op ? <a className="mono" href={page.op(op.name)}>{op.name}</a> : "—"}</td><td className="muted small">none declared</td>
              <td className="num mono">{eventRate[e] ?? 0}</td></tr>); }))}</tbody></table>
      </Block>
      <Foot>Generated from each thing's `events` and each operation's `move.emits`. Listeners appear once the model carries `on:` handlers.</Foot>
    </div>
  </Shell>
);

export const Values = () => (
  <Shell here={{ id: "values" }} crumbs={["Plugged In", "Blueprint", "Values"]}>
    <div className="page">
      <Title h="Values" p="The named types the app's fields use, with their limits." />
      <Block title="Values" desc="Each with the fields that use it" flush>
        <table className="tbl"><thead><tr><th>value</th><th>type</th><th>used by</th></tr></thead>
          <tbody>{Object.entries(model.values).map(([n, v]) => {
            const users = [...things.flatMap((t) => Object.entries(t.fields).filter(([, f]) => f.named === n).map(([k]) => `${t.name}.${k}`)),
              ...operations.flatMap((o) => Object.entries(o.payload).filter(([, f]) => f.named === n).map(([k]) => `${o.name} ${k}`))];
            return <tr key={n} id={n}><td className="mono">{n}</td><td className="mono muted">{typeText({ value: v })}</td><td className="mono small">{users.join(", ") || <span className="muted">not used by stage 1</span>}</td></tr>;
          })}</tbody></table>
      </Block>
      <Foot>Generated from `Model.values`. A `schema` value's detail is not in the model yet.</Foot>
    </div>
  </Shell>
);
