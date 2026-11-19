// Journeys and starting worlds (round 3 Q4 A): a list, a page per journey, a page per world.
import { Chip } from "@heroui/react";
import { journeys, worlds, type Journey, type World } from "../journeys.ts";
import { environments, page } from "../model.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block, Verdict } from "../ui.tsx";

export const Journeys = () => (
  <Shell here={{ id: "journeys" }} crumbs={["Plugged In", "Blueprint", "Journeys"]}>
    <div className="page">
      <header className="page-title"><h1>Journeys</h1><p>How the app is proved: each journey is a story of calls with checks, run in a fresh world. Verdicts from the logbook, per environment.</p></header>
      <Block title={`${journeys.length} journeys`} desc="Written by a different agent from the builder; the builder never edits them" flush>
        <table className="tbl"><thead><tr><th>journey</th><th>starts from</th><th className="num">steps</th><th>operations</th>{environments.map((e) => <th key={e.name}>{e.name}</th>)}</tr></thead>
          <tbody>{journeys.map((j) => <tr key={j.slug}><td><a href={`journey-${j.slug}.html`}>{j.name}</a></td>
            <td>{j.starts ? <a className="mono" href={`world-${j.starts}.html`}>{j.starts}</a> : <span className="muted small">an empty world</span>}</td>
            <td className="num mono">{j.steps.length}</td><td className="mono small">{[...new Set(j.steps.map((s) => s.op))].join(", ")}</td>
            {environments.map((e) => <td key={e.name}><Verdict v={j.verdicts[e.name]!} /></td>)}</tr>)}</tbody></table>
      </Block>
      <Block title="Starting worlds" desc="Shared starting points; a world can build on another" flush>
        <table className="tbl"><tbody>{worlds.map((w) => <tr key={w.slug}><td><a className="mono" href={`world-${w.slug}.html`}>{w.slug}</a></td><td className="small">gives {w.gives.join(", ")}</td>
          <td className="small muted">used by {journeys.filter((j) => j.starts === w.slug).map((j) => j.name).join(", ") || "no journey"}</td></tr>)}</tbody></table>
      </Block>
      <Foot>From `Model.journeys` and `Model.startingWorlds` (on m1), written here from Plugged In's journey files; the portal wire on m1 still marks them unavailable.</Foot>
    </div>
  </Shell>
);

export const JourneyPage = ({ j }: { j: Journey }) => (
  <Shell here={{ id: "journeys", scope: { label: j.name, ops: [...new Set(j.steps.map((s) => s.op))] } }} crumbs={["Plugged In", "Journeys", j.name]}>
    <div className="page">
      <header className="page-title"><h1>{j.name}</h1>
        <div className="props">{environments.map((e) => <Chip key={e.name} size="sm" variant="soft" color={j.verdicts[e.name] === "pass" ? "success" : j.verdicts[e.name] === "fail" ? "danger" : "default"}>{e.name} {j.verdicts[e.name]}</Chip>)}
          <Chip size="sm" variant="soft" className="mono">{j.file}</Chip></div></header>
      <div className="two">
        <Block title="Cast" desc="Fixtures, not people"><ul className="plain">{Object.entries(j.cast).map(([n, k]) => <li key={n}><span className="mono">{n}</span> <span className="muted small">{k}</span></li>)}</ul></Block>
        <Block title="Starts from">{j.starts ? <p><a className="mono" href={`world-${j.starts}.html`}>{j.starts}</a> <span className="muted small">gives {worlds.find((w) => w.slug === j.starts)?.gives.join(", ")}</span></p> : <p className="muted small">An empty world.</p>}</Block>
      </div>
      <Block title="Steps" desc="Each step: who calls what, and every check. A failed step opens its trace." flush>
        <ol className="steps">{j.steps.map((s, i) => (
          <li key={s.title}><span className="n">{i + 1}</span>
            <div><div className="t">{s.title}</div><div className="c"><span className="mono">{s.actor}</span> → <a className="mono" href={page.op(s.op)}>{s.op}</a> <span className="mono">{s.payload}</span></div>
              <div className="checks">{s.checks.map((c) => <Chip key={c} size="sm" variant="soft" color={s.ok ? "default" : "danger"}>{c}</Chip>)}</div>
              {!s.ok && <p className="small tone-danger">Failed in staging: links[0].title was "GitHub". <a href={page.op(s.op, "spans")}>Open the trace</a></p>}</div>
            <Verdict v={s.ok ? "pass" : "fail"} /></li>))}</ol>
      </Block>
      <Foot>From `Model.journeys["{j.name}"]`: cast, starts, steps with each call and its checks. Verdicts from the logbook.</Foot>
    </div>
  </Shell>
);

export const WorldPage = ({ w }: { w: World }) => (
  <Shell here={{ id: "journeys" }} crumbs={["Plugged In", "Journeys", "worlds", w.slug]}>
    <div className="page">
      <header className="page-title"><h1 className="mono-title">{w.slug}</h1><div className="props"><Chip size="sm" variant="soft" className="mono">{w.file}</Chip><Chip size="sm" variant="soft">builds on {w.from ?? "an empty world"}</Chip></div></header>
      <div className="two">
        <Block title="Makes" desc="The calls that build it, in order"><ol className="plain">{w.makes.map((m) => <li key={m} className="mono small">{m}</li>)}</ol></Block>
        <Block title="Gives" desc="What journeys starting here can use"><ul className="plain">{w.gives.map((g) => <li key={g} className="mono">world.{g}</li>)}</ul>
          <p className="muted small">Cast: {Object.entries(w.cast).map(([n, k]) => `${n} (${k})`).join(", ")}</p></Block>
      </div>
      <Block title="Journeys that start here"><ul className="plain">{journeys.filter((j) => j.starts === w.slug).map((j) => <li key={j.slug}><a href={`journey-${j.slug}.html`}>{j.name}</a></li>)}</ul></Block>
      <Foot>From `Model.startingWorlds["{w.slug}"]`: from, cast, makes, gives.</Foot>
    </div>
  </Shell>
);
