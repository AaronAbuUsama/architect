// An operation's other tabs: Metrics, Spans (the trace waterfall), Proof (the nine evals by environment), Docs, Notes.
import { Chip } from "@heroui/react";
import { journeysCalling } from "../journeys.ts";
import { lastCalls, p95Series, statOf } from "../live.ts";
import { model, type Operation } from "../model.ts";
import { notes } from "../overlay.ts";
import { Foot } from "../shell.tsx";
import { traceOf } from "../trace.ts";
import { Bars, Block, Outcome, Spark, Tiles, Verdict } from "../ui.tsx";
import { Code } from "../code.tsx";
import { OpShell } from "./op.tsx";

export const Metrics = ({ o }: { o: Operation }) => {
  const s = statOf(o), p95 = p95Series(o), within = s.budget ? (s.p95 > s.budget ? 93.8 : 99.4) : null;
  return (
    <OpShell o={o} tab="metrics">
      <Tiles s={s} />
      <div className="two">
        <Block title="Calls per minute" desc="Every call in the window: answered, refused and defects together">
          <Spark values={s.spark} label={`${o.name} calls per minute, last 30 minutes`} w={520} h={120} />
          <div className="axis mono muted"><span>11:35</span><span>11:50</span><span>12:05</span></div>
        </Block>
        <Block title="p95 per minute against the budget" desc={s.budget ? `The dashed line is the declared budget, ${s.budget} ms` : "No budget declared"}>
          <Spark values={p95} label={`${o.name} p95 per minute against a budget of ${s.budget} ms`} w={520} h={120} tone={s.budget && Math.max(...p95) > s.budget ? "danger" : "accent"} budget={s.budget ?? undefined} />
          <div className="axis mono muted"><span>11:35</span><span>11:50</span><span>12:05</span></div>
        </Block>
      </div>
      <div className="two">
        <Block title="Refusals by code" desc="Declared answers, not failures. Amber, never red.">
          {Object.keys(s.refused).length ? <Bars label={`${o.name} refusals by code`} rows={Object.entries(s.refused).map(([k, n]) => ({ name: `${model.refusals[k]} ${k}`, n }))} /> : <p className="muted small">No refusals in the window.</p>}
        </Block>
        <Block title="Latency objective · proposed (K18)" desc="Falls out of the budget: 95% of calls within it over 28 days, with burn alerts at the standard windows">
          {within === null ? <p className="muted small">No budget, so no objective.</p> : (<>
            <div className="slo"><span className={`kpi-text${within < 95 ? " tone-danger" : ""}`}>{within}%</span><span className="muted small">within {s.budget} ms · target 95% · 28 days</span></div>
            <p className="small muted">{within < 95 ? "Burning: the budget is being spent faster than 14.4× in the last hour. An alert is open." : "Error budget left: 88%. No burn."}</p>
          </>)}
        </Block>
      </div>
      <Foot>Every panel here is generated from `operations.{o.name}` (its refusals, its budget) over `ortho.calls` and `ortho.call.duration`. Nothing is configured.</Foot>
    </OpShell>
  );
};

export const Spans = ({ o }: { o: Operation }) => {
  const t = traceOf(o), calls = lastCalls.filter((c) => c.op === o.name);
  return (
    <OpShell o={o} tab="spans">
      <Block title={`Call ${t.id}`} desc={`${t.who}, ${t.at} · ${t.summary}`} action={<Outcome o={t.outcome} />} flush>
        <ol className="spine waterfall">{t.rows.map((r) => (
          <li key={r.key} className={r.depth ? "sub" : undefined}><span className="mono muted">{r.depth ? "└" : "├"}</span><span className="mono">{r.name}</span>
            <span className="mono muted">{r.attr}</span>
            <span className="wf-track"><span className={`bar${r.tone ? ` ${r.tone}` : ""}`} style={{ marginLeft: `${(r.start / t.total) * 100}%`, width: `${Math.max(0.6, (r.ms / t.total) * 100)}%` }} /></span>
            <span className="mono ms">{r.ms ? `${r.ms} ms` : ""}</span></li>))}</ol>
      </Block>
      <div className="two">
        <Block title="What a span may show" desc="Structure, timing, outcome, the declared refusal, how many logs, the caller's kind">
          <ul className="plain small"><li>caller: <strong>{t.callerKind}</strong> (locally named by the journey's cast)</li><li>attempts: {t.attempts}</li><li>logs: {t.logs}</li></ul>
        </Block>
        <Block title="Never shown, in any environment" desc="M1.19 and the no-leak check: a planted one fails M1.13">
          <ul className="plain small"><li>raw statements</li><li>which person called (principal.person)</li><li>log bodies</li><li>secret or private field values</li></ul>
        </Block>
      </div>
      <Block title="Recent calls" desc="This operation's last calls in the window" flush>
        <table className="tbl"><tbody>{(calls.length ? calls : [{ at: "12:03:12", op: o.name, who: "anyone", outcome: "answered", ms: 3 }]).map((c) => (
          <tr key={c.at}><td className="mono muted">{c.at}</td><td className="small">{c.who}</td><td><Outcome o={c.outcome} /></td><td className="num mono">{c.ms} ms</td></tr>))}</tbody></table>
      </Block>
    </OpShell>
  );
};

const evals = ["answer shape", "declared errors", "machine path", "events", "who may call", "steps", "performance", "coverage", "explainability"];
const envs = ["local", "test", "staging", "production"] as const;
const verdict = (o: Operation, e: string, env: string) => env === "production" ? "unproven" : e === "performance" && o.name === "profile.get" && env === "staging" ? "review"
  : e === "coverage" && o.name === "link.order" && env === "staging" ? "fail" : env === "staging" && o.name === "session.sign-in" ? "stale" : "pass";

export const Proof = ({ o }: { o: Operation }) => {
  const js = journeysCalling(o.name);
  const reached = new Set(js.flatMap((j) => j.steps.filter((s) => s.op === o.name).flatMap((s) => s.checks.join(" ").match(/[A-Z][A-Za-z]+/g) ?? [])));
  return (
    <OpShell o={o} tab="proof">
      <Block title="The nine evals, by environment" desc="M1.04's verdicts from the logbook, keyed by the model's hash and the handler's hash. Latency is the live p95, not an eval's note." flush>
        <table className="tbl"><thead><tr><th>eval</th>{envs.map((e) => <th key={e}>{e}</th>)}</tr></thead>
          <tbody>{evals.map((e) => <tr key={e}><td>{e}</td>{envs.map((env) => <td key={env}><Verdict v={verdict(o, e, env)} /></td>)}</tr>)}</tbody></table>
      </Block>
      <div className="two">
        <Block title="Journeys that cover it" desc="Each step that calls this operation">
          {js.length === 0 ? <p className="muted small">No journey calls it: eval 8 (coverage) has nothing to stand on.</p> :
            <ul className="plain">{js.map((j) => <li key={j.slug}><a href={`journey-${j.slug}.html`}>{j.name}</a> <span className="muted small">{j.steps.filter((s) => s.op === o.name).length} steps · staging {j.verdicts.staging}</span></li>)}</ul>}
        </Block>
        <Block title="What is unproven" desc="Each declared refusal no journey reaches">
          <ul className="plain">{o.refusals.map((r) => <li key={r}><span className="mono">{r}</span> {reached.has(r) ? <Chip size="sm" variant="soft" color="success">reached</Chip> : <Chip size="sm" variant="soft" color="warning">no journey reaches it</Chip>}</li>)}</ul>
        </Block>
      </div>
    </OpShell>
  );
};

export const Docs = ({ o, code }: { o: Operation; code: { sdk: string; cli: string; sdkHtml: string; cliHtml: string } }) => (
  <OpShell o={o} tab="docs">
    <div className="two">
      <Block title="Reference" desc="The generated docs page for this operation; the canon page it belongs to is linked, never copied">
        <div className="prose"><p>{o.description}</p><h3>Who may call</h3><p>{o.allowed.map((a) => a.kind).join(", ")}.</p>
          <h3>Refusals</h3><p>{o.refusals.map((r) => `${r} (${model.refusals[r]})`).join(", ")}.</p>
          {o.idempotent && <><h3>Retries</h3><p>Send the same request key and you get the same answer, with no second write.</p></>}</div>
      </Block>
      <div className="stack"><Code title="SDK" code={code.sdk} html={code.sdkHtml} /><Code title="CLI" code={code.cli} html={code.cliHtml} /></div>
    </div>
  </OpShell>
);

export const Notes = ({ o }: { o: Operation }) => (
  <OpShell o={o} tab="notes">
    <Block title="Notes" desc="Markdown pinned to this operation's hash. Stale once the declaration changes (M3.21).">
      <div className="notes">{(notes[o.name] ?? []).map((n) => (
        <div key={n.body} className="note"><p>{n.body}</p><span className="muted small">{n.by} · {n.when} · {n.stale ? <Chip size="sm" variant="soft" color="warning">stale: the declaration changed since</Chip> : "pinned to the current hash"}</span></div>))}
        {!(notes[o.name] ?? []).length && <p className="muted small">No notes yet. A note is written with `note.write`, an action like any other.</p>}</div>
    </Block>
    <Block title="Conversations" desc="Runs that touched this operation (M4.16)"><p className="muted small">{o.name === "handle.claim" ? "builder agent · \"add a reserved-names list\" · 17 Nov" : "None yet."}</p></Block>
  </OpShell>
);
