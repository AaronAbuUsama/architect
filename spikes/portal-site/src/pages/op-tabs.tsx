// An operation's other tabs: Metrics (with the calls table, each call opening its trace), Proof (the nine evals by environment), Docs, Notes.
import { Chip } from "@heroui/react";
import { journeysCalling } from "../journeys.ts";
import { p95Series, perMinute, statOf } from "../live.ts";
import { model, type Operation } from "../model.ts";
import { notes } from "../overlay.ts";
import { Foot } from "../shell.tsx";
import { CallsTable } from "../kit/calls-table.tsx";
import { Island } from "../kit/island.tsx";
import { Bars, Block, Spark, Tiles } from "../ui.tsx";
import { ProgressBar } from "@heroui/react";
import { CallsBars } from "../kit/calls-bars.tsx";
import { VerdictMatrix, VerdictTile, type V } from "../kit/verdict-matrix.tsx";
import { Code } from "../code.tsx";
import { OpShell } from "./op.tsx";

export const Metrics = ({ o }: { o: Operation }) => {
  const s = statOf(o), p95 = p95Series(o), within = s.budget ? (s.p95 > s.budget ? 93.8 : 99.4) : null;
  return (
    <OpShell o={o} tab="metrics">
      <Tiles s={s} />
      <div className="two">
        <Block title="Calls per minute" desc="Stacked by outcome: answered, refused and defects">
          <CallsBars series={perMinute(s)} height={150} label={`${o.name} calls per minute, by outcome`} />
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
        <Block title="Latency objective" action={<Chip size="sm" variant="soft" color="accent">K18 · M1.49</Chip>} desc="Falls out of the budget: 95% of calls within it over 28 days, with burn alerts at the standard windows">
          {within === null ? <p className="muted small">No budget, so no objective.</p> : (<>
            <div className="slo"><span className={`kpi-text${within < 95 ? " tone-danger" : ""}`}>{within}%</span><span className="chips"><Chip size="sm" variant="soft">within {s.budget} ms</Chip><Chip size="sm" variant="soft">target 95%</Chip><Chip size="sm" variant="soft">28 days</Chip></span></div>
            <ProgressBar aria-label="Calls within budget against the 95% target" value={within} minValue={80} maxValue={100} color={within < 95 ? "danger" : "success"} size="sm"><ProgressBar.Track><ProgressBar.Fill /></ProgressBar.Track></ProgressBar>
            <p className="small muted">{within < 95 ? "Burning: the budget is being spent faster than 14.4× in the last hour. An alert is open." : "Error budget left: 88%. No burn."}</p>
          </>)}
        </Block>
      </div>
      <Block title="Calls" desc="Every call in the window, newest first. Filter by environment, caller kind, outcome or refusal code, duration over budget, request key and time. Click a call to open its trace." flush>
        <Island name="CallsTable" props={{ op: o.name }}><CallsTable op={o.name} /></Island>
      </Block>
      <Foot>Every panel here is generated from `operations.{o.name}` (its refusals, its budget) over `ortho.calls` and `ortho.call.duration`; the calls table joins each call to its root span. Nothing is configured.</Foot>
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
        <VerdictMatrix of="evals" rowHead="eval" envs={[...envs]} rows={evals.map((e, i) => ({ id: e, label: <span className="eval-name"><b>{i + 1}</b>{e}</span>,
          cells: Object.fromEntries(envs.map((env) => { const v = verdict(o, e, env); return [env, v === "review" ? "stale" : v]; })) as Record<string, V>,
          note: Object.fromEntries(envs.flatMap((env) => { const v = verdict(o, e, env); return v === "review" ? [[env, "p95 near budget, review"]] : v === "fail" ? [[env, "no journey reaches LinkAlreadyRemoved"]] : []; })) }))} />
      </Block>
      <div className="two">
        <Block title="Journeys that cover it" desc="Each step that calls this operation">
          {js.length === 0 ? <p className="muted small">No journey calls it: eval 8 (coverage) has nothing to stand on.</p> :
            <ul className="plain">{js.map((j) => <li key={j.slug} className="row-chips"><a href={`journey-${j.slug}.html`}>{j.name}</a><Chip size="sm" variant="soft">{j.steps.filter((s) => s.op === o.name).length} steps call it</Chip>{envs.map((e) => <VerdictTile key={e} v={j.verdicts[e]!} title={`${j.verdicts[e]} in ${e}`} />)}</li>)}</ul>}
        </Block>
        <Block title="What is unproven" desc="Each declared refusal no journey reaches">
          <ul className="plain">{o.refusals.map((r) => <li key={r}><Chip size="sm" variant="secondary" className="mono">{r}</Chip> {reached.has(r) ? <Chip size="sm" variant="soft" color="success">reached</Chip> : <Chip size="sm" variant="soft" color="warning">no journey reaches it</Chip>}</li>)}</ul>
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
        <div key={n.body} className="note"><p>{n.body}</p><span className="chips"><Chip size="sm" variant="secondary">{n.by}</Chip><Chip size="sm" variant="soft">{n.when}</Chip>{n.stale ? <Chip size="sm" variant="soft" color="warning">stale: the declaration changed since</Chip> : <Chip size="sm" variant="soft" color="success">pinned to the current hash</Chip>}</span></div>))}
        {!(notes[o.name] ?? []).length && <p className="muted small">No notes yet. A note is written with `note.write`, an action like any other.</p>}</div>
    </Block>
    <Block title="Conversations" desc="Runs that touched this operation (M4.16)">{o.name === "handle.claim" ? <span className="chips"><Chip size="sm" variant="secondary">builder agent</Chip><span className="small">"add a reserved-names list"</span><Chip size="sm" variant="soft">17 Nov</Chip></span> : <p className="muted small">None yet.</p>}</Block>
  </OpShell>
);
