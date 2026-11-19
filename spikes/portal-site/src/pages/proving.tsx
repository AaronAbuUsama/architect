// Journeys and starting worlds (round 3 Q4 A): a list, a page per journey, a page per world.
import { Timeline } from "@heroui-pro/react";
import { Chip } from "@heroui/react";
import { Dots, Sequence, WorldTree } from "../flow.tsx";
import { journeys, worlds, type Journey, type World } from "../journeys.ts";
import { environments, page } from "../model.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block, Verdict } from "../ui.tsx";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { EnvironmentPill } from "../kit/environment-pill.tsx";
import { Island } from "../kit/island.tsx";
import { VerdictTile } from "../kit/verdict-matrix.tsx";

export const Journeys = () => (
  <Shell here={{ id: "journeys" }} crumbs={["Plugged In", "Blueprint", "Journeys"]}>
    <div className="page">
      <header className="page-title"><h1>Journeys</h1><p>How the app is proved: each journey is a story of calls with checks, run in a fresh world. Verdicts from the logbook, per environment.</p></header>
      <Block title="Where each journey starts" desc="Every journey runs in a fresh world: an empty one, or a starting world built by calls first. Click a world or a journey to open it.">
        <WorldTree />
      </Block>
      <Block title={`${journeys.length} journeys`} desc="Written by a different agent from the builder; the builder never edits them" flush>
        <table className="tbl"><thead><tr><th>journey</th><th>starts from</th><th>steps</th><th>operations</th>{environments.map((e) => <th key={e.name}>{e.name}</th>)}</tr></thead>
          <tbody>{journeys.map((j) => <tr key={j.slug}><td><a href={`journey-${j.slug}.html`}>{j.name}</a></td>
            <td>{j.starts ? <a href={`world-${j.starts}.html`}><Chip size="sm" variant="soft" className="mono">{j.starts}</Chip></a> : <Chip size="sm" variant="soft">an empty world</Chip>}</td>
            <td><span className="steps-cell"><b>{j.steps.length}</b><Dots j={j} /></span></td><td><span className="chips">{[...new Set(j.steps.map((s) => s.op))].map((op) => <a key={op} href={page.op(op)}><Chip size="sm" variant="secondary" className="mono">{op}</Chip></a>)}</span></td>
            {environments.map((e) => <td key={e.name}><VerdictTile v={j.verdicts[e.name]!} title={`${j.verdicts[e.name]} in ${e.name}`} /></td>)}</tr>)}</tbody></table>
      </Block>
      <Block title="Starting worlds" desc="Shared starting points; a world can build on another" flush>
        <table className="tbl"><tbody>{worlds.map((w) => <tr key={w.slug}><td><a className="mono" href={`world-${w.slug}.html`}>{w.slug}</a></td><td><span className="chips">{w.gives.map((g) => <Chip key={g} size="sm" variant="secondary">gives {g}</Chip>)}</span></td>
          <td><span className="chips">{journeys.filter((j) => j.starts === w.slug).map((j) => <a key={j.slug} href={`journey-${j.slug}.html`}><Chip size="sm" variant="soft">{j.name}</Chip></a>)}</span></td></tr>)}</tbody></table>
      </Block>
      <Foot>From `Model.journeys` and `Model.startingWorlds` (on m1), written here from Plugged In's journey files; the portal wire on m1 still marks them unavailable.</Foot>
    </div>
  </Shell>
);

export const JourneyPage = ({ j }: { j: Journey }) => (
  <Shell here={{ id: "journeys", scope: { label: j.name, ops: [...new Set(j.steps.map((s) => s.op))] } }} crumbs={["Plugged In", "Journeys", j.name]}>
    <div className="page">
      <header className="page-title"><h1>{j.name}</h1>
        <div className="props">{environments.map((e) => <span key={e.name} className="env-verdict"><EnvironmentPill env={e} size="sm" showRuns={false} live={e.name === "local"} /><VerdictTile v={j.verdicts[e.name]!} /></span>)}
          <Chip size="sm" variant="soft" className="mono">{j.file}</Chip></div></header>
      <div className="two">
        <Block title="Cast" desc="Fixtures, not people"><span className="chips">{Object.entries(j.cast).map(([n, k]) => <Chip key={n} size="md" variant="secondary">{n}<span className="muted">{k}</span></Chip>)}</span></Block>
        <Block title="Starts from">{j.starts ? <span className="chips"><a href={`world-${j.starts}.html`}><Chip variant="soft" className="mono">{j.starts}</Chip></a>{worlds.find((w) => w.slug === j.starts)?.gives.map((g) => <Chip key={g} size="sm" variant="secondary">gives {g}</Chip>)}</span> : <Chip variant="soft">an empty world</Chip>}</Block>
      </div>
      <Block title="The journey" desc="One lane per member of the cast, one column per step; under it, each environment's verdict for every step.">
        <Island name="StepPreviews" props={{ slug: j.slug }}><Sequence j={j} /></Island>
      </Block>
      <Block title="Steps" desc="Who calls what, and every check. A failed step opens its trace.">
        <Timeline className="steps-tl">{j.steps.map((s, i) => (
          <Timeline.Item key={s.title} status={s.ok ? "success" : "danger"}>
            <Timeline.Marker aria-hidden="true"><span className="tl-n">{i + 1}</span></Timeline.Marker>
            <Timeline.Content>
              <div className="t">{s.title}</div>
              <div className="c"><Chip size="sm" variant="secondary">{s.actor}</Chip><ArrowRightIcon size={12} aria-hidden="true" /><a href={page.op(s.op, s.ok ? "contract" : "spans")}><Chip size="sm" variant="soft" color="accent" className="mono">{s.op}</Chip></a><code className="payload">{s.payload}</code></div>
              <div className="checks">{s.checks.map((c) => <Chip key={c} size="sm" variant="soft" color={s.ok ? "default" : "danger"}>{c}</Chip>)}</div>
              {!s.ok && <p className="small tone-danger">Failed in staging. <a href={page.op(s.op, "spans")}>Open the trace</a></p>}
            </Timeline.Content>
          </Timeline.Item>))}</Timeline>
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
        <Block title="Makes" desc="The calls that build it, in order">
          <Timeline>{w.makes.map((m, i) => (
            <Timeline.Item key={m} status="success"><Timeline.Marker aria-hidden="true"><span className="tl-n">{i + 1}</span></Timeline.Marker>
              <Timeline.Content><span className="mono small">{m}</span></Timeline.Content></Timeline.Item>))}</Timeline>
        </Block>
        <Block title="Gives" desc="What journeys starting here can use"><ul className="plain">{w.gives.map((g) => <li key={g} className="mono">world.{g}</li>)}</ul>
          <p className="muted small">Cast: {Object.entries(w.cast).map(([n, k]) => `${n} (${k})`).join(", ")}</p></Block>
      </div>
      <Block title="Where it sits" desc="Built from an empty world; the journeys hanging off it start here"><WorldTree here={w.slug} /></Block>
      <Block title="Journeys that start here"><ul className="plain">{journeys.filter((j) => j.starts === w.slug).map((j) => <li key={j.slug}><a href={`journey-${j.slug}.html`}>{j.name}</a></li>)}</ul></Block>
      <Foot>From `Model.startingWorlds["{w.slug}"]`: from, cast, makes, gives.</Foot>
    </div>
  </Shell>
);
