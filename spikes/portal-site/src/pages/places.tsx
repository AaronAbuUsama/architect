// Where the app runs and what it is made of: environments side by side (Q2 A), plugins and stores (Q3 A).
import { Chip, Tabs } from "@heroui/react";
import { Fragment, type ReactNode } from "react";
import { splitOf, sum, thingStat } from "../live.ts";
import { CallsMeter } from "../kit/calls-meter.tsx";
import { environments, model, operations, page, opsOf } from "../model.ts";
import { mounts, stores, type MountName } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block } from "../ui.tsx";
import { Island } from "../kit/island.tsx";
import { EnvCompare } from "./env-compare.tsx";

const Title = ({ h, p }: { h: string; p: string }) => <header className="page-title"><h1>{h}</h1><p>{p}</p></header>;
export const Environments = ({ focus = "staging" }: { focus?: string }) => (
  <Shell here={{ id: "environments" }} crumbs={["Plugged In", "Blueprint", "Environments"]} rail={false}>
    <div className="page">
      <Title h="Environments" p="Where Plugged In runs, read from blueprint/environments. Only bindings change between them, never a shape, a name or a code." />
      <Island name="EnvCompare" props={{ focus }}><EnvCompare focus={focus} /></Island>
      <Foot>Generated from `Model.environments` (EnvironmentModel). Domains are not declared yet in Plugged In (`Deploy.worker()` with no domain).</Foot>
    </div>
  </Shell>
);
export const EnvProof = () => <Environments focus="staging" />;

export const Plugins = () => (
  <Shell here={{ id: "plugins" }} crumbs={["Plugged In", "Blueprint", "Plugins"]}>
    <div className="page">
      <Title h="Plugins" p="Each plugin Plugged In mounts, with one file each. Deleting that file removes its things, its pages and its tables." />
      <Block title="Mounted" desc="From blueprint/features" flush>
        <table className="tbl"><thead><tr><th>plugin</th><th>kind</th><th>package</th><th>things</th><th>needs</th><th>calls, last 30 min</th></tr></thead>
          <tbody>{(Object.keys(mounts) as MountName[]).map((k) => { const m = mounts[k]; return (
            <tr key={k}><td><a href={`plugin-${k}.html`}>{k}</a></td><td>{m.kind}</td><td><span className="chips"><Chip size="sm" variant="soft" className="mono">{m.package}</Chip><Chip size="sm" variant="soft" className="mono">{m.version}</Chip></span></td><td><span className="chips">{m.things.map((t) => <Chip key={t} size="sm" variant="secondary">{t}</Chip>)}</span></td><td><span className="chips">{m.needs.length ? m.needs.map((n) => <Chip key={n} size="sm" variant="soft">{n}</Chip>) : <span className="muted small">nothing</span>}</span></td>
              <td style={{ width: 280 }}><CallsMeter split={splitOf(sum(m.things.flatMap(opsOf)))} size="sm" label={k} /></td></tr>); })}</tbody></table>
      </Block>
      <Foot>From `Model.mounts` (on m1). The model on links/stage-1 has no mounts yet: these two are round 2's stage-1 plan.</Foot>
    </div>
  </Shell>
);

export const Plugin = ({ name }: { name: MountName }) => {
  const m = mounts[name];
  return (
    <Shell here={{ id: "plugins", scope: { label: name, ops: m.things.flatMap((t) => opsOf(t).map((o) => o.name)) } }} crumbs={["Plugged In", "Plugins", name]}>
      <div className="page">
        <header className="page-title"><div className="title-row"><h1>{name}</h1><span className="chips"><Chip size="sm" variant="soft" color="accent">{m.kind}</Chip><Chip size="sm" variant="soft" className="mono">{m.package}</Chip><Chip size="sm" variant="soft" className="mono">{m.version}</Chip></span></div>
          <div className="props"><Chip size="sm" variant="soft" className="mono">{m.file}</Chip><Chip size="sm" variant="soft" className="mono">integrity {m.integrity}</Chip></div></header>
        <div className="two">
          <Block title="Choices" desc="Each choice the plugin offers, and the one made"><dl className="kv">{Object.entries(m.chosen).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl></Block>
          <Block title="Left out and narrowed" desc="What the mount took away">
            <dl className="kv"><dt>left out</dt><dd className="mono">{m.omitted.join(", ") || "nothing"}</dd>
              {Object.entries(m.narrowed).map(([op, via]) => <Fragment key={op}><dt className="mono">{op}</dt><dd>only through {via.join(", ")}</dd></Fragment>)}
              <dt>needs</dt><dd>{m.needs.join(", ") || "nothing"}</dd></dl>
          </Block>
        </div>
        <Block title="Its things" desc="Each with its operations' numbers in the window" flush>
          <table className="tbl"><tbody>{m.things.map((t) => { const s = thingStat(t); return (
            <tr key={t}><td><a href={page.thing(t)}>{t}</a></td><td className="small">{model.things[t]!.description}</td><td style={{ width: 300 }}><CallsMeter split={splitOf(s)} size="sm" label={t} /></td></tr>); })}</tbody></table>
        </Block>
        <Foot>From `Model.mounts.{name}`: kind, package, version, integrity, chosen, omitted, narrowed, needs. An adapter would add its calls and what stands in for it in a world.</Foot>
      </div>
    </Shell>
  );
};

export const Stores = () => (
  <Shell here={{ id: "stores" }} crumbs={["Plugged In", "Blueprint", "Stores"]}>
    <div className="page">
      <Title h="Stores" p="Where things live, and what each environment binds the store to. Rebinding a store never changes a caller's contract." />
      <Block title="Stores" desc="Stage 1 declares none, so everything is in the project's default store" flush>
        <table className="tbl"><thead><tr><th>store</th><th>kind</th><th>from</th><th>things</th>{environments.map((e) => <th key={e.name}>{e.name}</th>)}</tr></thead>
          <tbody>{stores.map((s) => <tr key={s.name}><td className="mono">{s.name}</td><td>{s.kind}</td><td>{s.from}</td><td>{s.things.map((t) => <a key={t} href={page.thing(t)}>{t} </a>)}</td>
            {environments.map((e) => <td key={e.name} className="small">{e.database ?? e.cloud?.database ?? "—"}</td>)}</tr>)}</tbody></table>
      </Block>
      <Foot>From `Model.stores` and each environment's `stores` bindings. Never a count of rows: that is stored data.</Foot>
    </div>
  </Shell>
);
