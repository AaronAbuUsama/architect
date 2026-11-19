// Where the app runs and what it is made of (round 4, Aaron's picks): a page per environment (Q2 B) with its summary
// card and the proof matrix, a compare page reached from it, and one page for plugins and stores (Q3 B).
import { ItemCard } from "@heroui-pro/react";
import { Chip, Tabs } from "@heroui/react";
import { ArrowsLeftRightIcon, PlugsIcon } from "@phosphor-icons/react/ssr";
import { splitOf, sum } from "../live.ts";
import { CallsMeter } from "../kit/calls-meter.tsx";
import { EnvironmentPill } from "../kit/environment-pill.tsx";
import { Island } from "../kit/island.tsx";
import { VerdictMatrix } from "../kit/verdict-matrix.tsx";
import { environments, opsOf } from "../model.ts";
import { mounts, stores, type MountName } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block } from "../ui.tsx";
import { envFields, EnvCompare, FocusCard, journeyRows, opRows } from "./env-compare.tsx";

export const envPage = (name: string) => `env-${name}.html`;
const names = environments.map((e) => e.name);

/** Q2 B: one page per environment. Its summary card, what its file declares, and the proof with a tally per column. */
export const EnvPage = ({ name }: { name: string }) => {
  const e = environments.find((x) => x.name === name)!;
  return (
    <Shell here={{ id: `env:${name}` }} crumbs={["Plugged In", "Environments", name]} rail={false}>
      <div className="page">
        <header className="page-title"><div className="title-row"><h1>{name}</h1><a className="small compare-link" href="environments.html"><ArrowsLeftRightIcon size={14} aria-hidden="true" />Compare environments</a></div>
          <p>Read from <span className="mono">{e.file}</span>. Only bindings change between environments, never a shape, a name or a code.</p></header>
        <Tabs selectedKey={name} className="page-tabs"><Tabs.ListContainer><Tabs.List aria-label="Environments">
          {environments.map((x) => <Tabs.Tab key={x.name} id={x.name} href={envPage(x.name)}>{x.name}<Tabs.Indicator /></Tabs.Tab>)}
        </Tabs.List></Tabs.ListContainer></Tabs>
        <FocusCard e={e} />
        <section className="panel"><header className="panel__head"><h2>Proof</h2><span className="muted small">{name} highlighted; every column tallied</span></header>
          <VerdictMatrix rows={opRows()} envs={names} focus={name} of="operations" rowHead="operation" />
          <VerdictMatrix rows={journeyRows()} envs={names} focus={name} of="journeys" rowHead="journey" />
        </section>
        <section className="panel"><header className="panel__head"><h2>Declared</h2><span className="muted small">EnvironmentModel, field by field</span></header>
          <table className="tbl env-tbl"><tbody>{envFields.map((r) => <tr key={r.key}><th scope="row"><span className="field-label">{r.label}</span><code className="field-key">{r.key}</code></th><td>{r.show(e)}</td></tr>)}</tbody></table>
        </section>
        <Foot>Generated from `Model.environments.{name}` (EnvironmentModel) and the logbook's verdicts (M1.04).</Foot>
      </div>
    </Shell>
  );
};

/** Reached from each environment's page: two or more side by side, differing cells tinted. */
export const Environments = ({ focus = "staging" }: { focus?: string }) => (
  <Shell here={{ id: "environments" }} crumbs={["Plugged In", "Environments", "Compare"]} rail={false}>
    <div className="page">
      <header className="page-title"><h1>Compare environments</h1><p>Pick one; every other column shows where it differs from it.</p></header>
      <Island name="EnvCompare" props={{ focus }}><EnvCompare focus={focus} /></Island>
      <Foot>Generated from `Model.environments` (EnvironmentModel). Domains are not declared yet in Plugged In (`Deploy.worker()` with no domain).</Foot>
    </div>
  </Shell>
);

/** Q3 B: one list page for plugins and stores, no page per plugin. */
export const PluginsAndStores = () => (
  <Shell here={{ id: "plugins" }} crumbs={["Plugged In", "Plugins and stores"]}>
    <div className="page">
      <header className="page-title"><h1>Plugins and stores</h1><p>What Plugged In mounts and where its things live, on one page.</p></header>
      <Block title="Plugins" desc="One file each in blueprint/features. Deleting the file removes its things, its pages and its tables.">
        <div className="item-cards">{(Object.keys(mounts) as MountName[]).map((k) => { const m = mounts[k]; return (
          <ItemCard key={k} variant="secondary">
            <ItemCard.Icon><PlugsIcon size={18} /></ItemCard.Icon>
            <ItemCard.Content><ItemCard.Title>{k}<Chip size="sm" variant="soft" className="mono">{m.package}@{m.version}</Chip></ItemCard.Title>
              <ItemCard.Description><span className="chips">{m.things.map((t) => <Chip key={t} size="sm" variant="secondary">{t}</Chip>)}{m.needs.map((n) => <Chip key={n} size="sm" variant="soft">needs {n}</Chip>)}{m.omitted.map((n) => <Chip key={n} size="sm" variant="soft" color="warning">left out {n}</Chip>)}{Object.entries(m.chosen).map(([c, v]) => <Chip key={c} size="sm" variant="soft">{c}: {v}</Chip>)}</span></ItemCard.Description></ItemCard.Content>
            <ItemCard.Action><div style={{ width: 260 }}><CallsMeter split={splitOf(sum(m.things.flatMap(opsOf)))} size="sm" label={k} /></div></ItemCard.Action>
          </ItemCard>); })}</div>
      </Block>
      <Block title="Stores" desc="Stage 1 declares none, so everything is in the project's default store. Never a count of rows: that is stored data." flush>
        <table className="tbl"><thead><tr><th>store</th><th>kind</th><th>things</th>{environments.map((e) => <th key={e.name}>{e.name}</th>)}</tr></thead>
          <tbody>{stores.map((s) => <tr key={s.name}><td className="mono">{s.name}</td><td>{s.kind}</td><td><span className="chips">{s.things.map((t) => <Chip key={t} size="sm" variant="secondary">{t}</Chip>)}</span></td>{environments.map((e) => <td key={e.name}><EnvironmentPill env={e} size="sm" showRuns /></td>)}</tr>)}</tbody></table>
      </Block>
      <Foot>From `Model.mounts` and `Model.stores` (on m1). The choices a mount made, what it narrowed and its integrity are in the docs.</Foot>
    </div>
  </Shell>
);
