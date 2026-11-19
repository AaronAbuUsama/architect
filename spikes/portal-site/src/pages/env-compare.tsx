// Environments (round 3 Q2, redrawn after Aaron's review): start from what `EnvironmentModel` declares, pick one
// environment and compare the rest against it, and read proof as a matrix with labelled tallies. One body serves the
// server render and the browser island (Segment switches the focus there).
import { Segment } from "@heroui-pro/react";
import { Chip } from "@heroui/react";
import { ArrowRightIcon, KeyIcon, UserCircleIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";
import { useState, type ReactNode } from "react";
import { journeys } from "../journeys.ts";
import { allStat, splitOf } from "../live.ts";
import { environments, operations, page, short, type Environment } from "../model.ts";
import { CallsMeter } from "../kit/calls-meter.tsx";
import { EnvironmentPill, RunsOn } from "../kit/environment-pill.tsx";
import { VerdictMatrix, VerdictTally, type MatrixRow, type V } from "../kit/verdict-matrix.tsx";

export const opVerdict = (op: string, env: string): V => env === "production" ? "unproven" : env === "staging" && op === "session.sign-in" ? "stale" : env === "staging" && op === "link.order" ? "fail" : "pass";
const opNote: Record<string, string> = { "session.sign-in": "SessionCredentialsWrong changed since", "link.order": "fails at step 5" };
const none = <span className="none">none</span>;

/** Each field `EnvironmentModel` declares, as a component, with the key it compares by. */
export const envFields: { key: keyof Environment; label: string; show: (e: Environment) => ReactNode; cmp: (e: Environment) => string }[] = [
  { key: "runs", label: "runs", show: (e) => <span className="small">{e.runs}</span>, cmp: (e) => e.runs },
  { key: "identity", label: "who calls", show: (e) => e.identity === "test-principals" ? <Chip size="sm" variant="soft"><UsersThreeIcon size={12} />test principals</Chip> : <Chip size="sm" variant="soft" color="accent"><UserCircleIcon size={12} />better-auth</Chip>, cmp: (e) => e.identity },
  { key: "cloud", label: "runs on", show: (e) => <RunsOn env={e} />, cmp: (e) => `${e.cloud?.provider}${e.cloud?.database ?? e.database}` },
  { key: "lifetimeMs", label: "lifetime", show: (e) => e.lifetimeMs ? <Chip size="sm" variant="soft" color="warning">{e.lifetimeMs / 3_600_000} h per world</Chip> : none, cmp: (e) => String(e.lifetimeMs) },
  { key: "promotesFrom", label: "promotes from", show: (e) => e.promotesFrom ? <span className="promo"><Chip size="sm" variant="soft">{e.promotesFrom}</Chip><ArrowRightIcon size={11} /><Chip size="sm" variant="soft">{e.name}</Chip></span> : none, cmp: (e) => String(e.promotesFrom) },
  { key: "deploy", label: "deploy", show: (e) => Object.keys(e.deploy).length ? <span className="chips">{Object.entries(e.deploy).map(([k, d]) => <Chip key={k} size="sm" variant="soft">{k}<span className="muted">{d.how}</span></Chip>)}</span> : none, cmp: (e) => JSON.stringify(e.deploy) },
  { key: "publish", label: "publish", show: (e) => Object.keys(e.publish).length ? <span className="chips">{Object.entries(e.publish).flatMap(([k, p]) => p.map((x) => <Chip key={k + x.how} size="sm" variant="soft">{k}<span className="muted">{x.how}{x.tag ? `@${x.tag}` : ""}</span></Chip>))}</span> : none, cmp: (e) => JSON.stringify(e.publish) },
  { key: "secrets", label: "secrets", show: (e) => Object.keys(e.secrets).length ? <span className="chips">{Object.entries(e.secrets).map(([k, v]) => <Chip key={k} size="sm" variant="soft"><KeyIcon size={11} />{k}<span className="muted">{v}</span></Chip>)}</span> : none, cmp: (e) => JSON.stringify(e.secrets) },
  { key: "telemetry", label: "telemetry sinks", show: (e) => e.telemetry?.length ? <span className="chips">{e.telemetry.map((t) => <Chip key={t.sink} size="sm" variant="soft">{t.sink}</Chip>)}</span> : none, cmp: (e) => JSON.stringify(e.telemetry ?? []) },
  { key: "hash", label: "declaration", show: (e) => <Chip size="sm" variant="soft" className="mono">{short(e.hash)}</Chip>, cmp: () => "" },
];

export const opRows = (): MatrixRow[] => operations.map((o) => ({ id: o.name, group: o.thing, label: <span className="mono">{o.verb}</span>, href: page.op(o.name, "proof"),
  cells: Object.fromEntries(environments.map((e) => [e.name, opVerdict(o.name, e.name)])), note: opNote[o.name] ? { staging: opNote[o.name]! } : undefined }));
export const journeyRows = (): MatrixRow[] => journeys.map((j) => ({ id: j.slug, label: j.name, href: `journey-${j.slug}.html`, cells: j.verdicts as Record<string, V> }));

/** The chosen environment, summarised: what it is, its proof as tallies, and its live calls when you are in it. */
export const FocusCard = ({ e }: { e: Environment }) => {
  const ops = opRows(), js = journeyRows(), here = e.name === "local";
  return (
    <div className="focus-card">
      <div className="focus-card__id"><EnvironmentPill env={e} live={here} here={here} /><p className="small">{e.runs}</p><span className="mono muted small">{e.file}</span></div>
      <div className="focus-card__stat"><div className="eyebrow">operations proven</div><VerdictTally verdicts={ops.map((r) => r.cells[e.name]!)} of="operations" /></div>
      <div className="focus-card__stat"><div className="eyebrow">journeys proven</div><VerdictTally verdicts={js.map((r) => r.cells[e.name]!)} of="journeys" /></div>
      <div className="focus-card__stat"><div className="eyebrow">live, last 30 min</div>{here ? <CallsMeter split={splitOf(allStat())} size="sm" /> : <p className="muted small">Read in {e.name}'s own portal. This one is local.</p>}</div>
    </div>
  );
};

export const EnvCompare = ({ focus: start }: { focus: string }) => {
  const [focus, setFocus] = useState(start), f = environments.find((e) => e.name === focus)!;
  return (
    <div className="env-compare">
      <div className="env-compare__bar">
        <Segment selectedKey={focus} onSelectionChange={(k) => setFocus(String(k))} aria-label="Compare against" size="sm">
          {environments.map((e) => <Segment.Item key={e.name} id={e.name}>{e.name}</Segment.Item>)}
        </Segment>
        <span className="differs-key"><i />differs from {focus}</span>
      </div>
      <FocusCard e={f} />
      <section className="panel">
        <header className="panel__head"><h2>What each file declares</h2><span className="muted small">EnvironmentModel, field by field</span></header>
        <div className="tbl-wrap"><table className="tbl env-tbl">
          <thead><tr><th />{environments.map((e) => <th key={e.name} className={e.name === focus ? "is-focus" : undefined}><EnvironmentPill env={e} size="sm" showRuns={false} live={e.name === "local"} /></th>)}</tr></thead>
          <tbody>{envFields.map((r) => <tr key={r.key}><th scope="row"><span className="field-label">{r.label}</span><code className="field-key">{r.key}</code></th>
            {environments.map((e) => { const differs = e.name !== focus && r.key !== "hash" && r.cmp(e) !== r.cmp(f);
              return <td key={e.name} className={`${e.name === focus ? "is-focus" : ""}${differs ? " differs" : ""}`}>{r.show(e)}</td>; })}</tr>)}</tbody>
        </table></div>
      </section>
      <section className="panel">
        <header className="panel__head"><h2>Proof</h2><span className="muted small">From the logbook. Every operation and journey against every environment</span></header>
        <VerdictMatrix rows={opRows()} envs={environments.map((e) => e.name)} of="operations" focus={focus} rowHead="operation" />
        <VerdictMatrix rows={journeyRows()} envs={environments.map((e) => e.name)} of="journeys" focus={focus} rowHead="journey" />
      </section>
    </div>
  );
};
