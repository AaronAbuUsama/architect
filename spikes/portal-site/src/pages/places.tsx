// Where the app runs and what it is made of: environments side by side (Q2 A), plugins and stores (Q3 A).
import { Chip, Tabs } from "@heroui/react";
import { Fragment, type ReactNode } from "react";
import { refusedTotal, thingStat } from "../live.ts";
import { environments, model, operations, page, opsOf } from "../model.ts";
import { mounts, stores, type MountName } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block, Verdict } from "../ui.tsx";

const Title = ({ h, p }: { h: string; p: string }) => <header className="page-title"><h1>{h}</h1><p>{p}</p></header>;
const EnvTabs = ({ tab }: { tab: "setup" | "proof" }) => (
  <Tabs selectedKey={tab} className="page-tabs"><Tabs.ListContainer><Tabs.List aria-label="Environment views">
    <Tabs.Tab id="setup" href="environments.html">Setup<Tabs.Indicator /></Tabs.Tab><Tabs.Tab id="proof" href="environments-proof.html">Proof<Tabs.Indicator /></Tabs.Tab>
  </Tabs.List></Tabs.ListContainer></Tabs>
);
const dash = <span className="muted">—</span>;
const rows: [string, (e: (typeof environments)[number]) => ReactNode][] = [
  ["runs", (e) => e.runs],
  ["who calls", (e) => e.identity === "test-principals" ? "the cast (test principals)" : "people signed in (better-auth)"],
  ["lifetime", (e) => e.lifetimeMs ? `${e.lifetimeMs / 3_600_000} h per world` : dash],
  ["database", (e) => e.database ?? e.cloud?.database ?? dash],
  ["cloud", (e) => e.cloud?.provider ?? dash],
  ["secrets", (e) => Object.keys(e.secrets).length ? Object.entries(e.secrets).map(([k, v]) => `${k} (${v})`).join(", ") : <span className="muted">none declared</span>],
  ["telemetry sink", (e) => e.telemetry?.map((t) => t.sink).join(", ") ?? <span className="muted">none declared</span>],
  ["deploy", (e) => Object.entries(e.deploy).map(([k, d]) => `${k}: ${d.how}${d.domain ? ` at ${d.domain}` : ""}`).join(", ") || dash],
  ["publish", (e) => Object.entries(e.publish).map(([k, p]) => `${k}: ${p.map((x) => `${x.how}${x.tag ? ` ${x.tag}` : ""}`).join(", ")}`).join(" · ") || dash],
  ["promotes from", (e) => e.promotesFrom ?? dash],
  ["file", (e) => <span className="mono small">{e.file}</span>],
  ["live version", (e) => e.name === "local" ? "the working tree" : e.name === "test" ? "each pull request" : e.name === "staging" ? <span className="mono">rev 9c1e2a0</span> : <span className="mono">not released</span>],
];

export const Environments = () => (
  <Shell here={{ id: "environments" }} crumbs={["Plugged In", "Blueprint", "Environments"]} rail={false}>
    <div className="page">
      <Title h="Environments" p="Every environment side by side. Only bindings change between them, never a shape, a name or a code. You are in local, so live numbers are local's; setup and proof are readable from any portal." />
      <EnvTabs tab="setup" />
      <Block title="Setup" desc="From each file in blueprint/environments" flush>
        <div className="tbl-wrap"><table className="tbl env-tbl"><thead><tr><th />{environments.map((e) => <th key={e.name}>{e.name}{e.name === "local" && <Chip size="sm" variant="soft" color="success" className="here">you are here</Chip>}</th>)}</tr></thead>
          <tbody>{rows.map(([label, f]) => <tr key={label}><td className="muted">{label}</td>{environments.map((e) => <td key={e.name} className="small">{f(e)}</td>)}</tr>)}</tbody></table></div>
      </Block>
      <p className="muted small">The switcher in the top bar lists these four and their domains; picking one opens that environment's own portal, which reads only its own sink.</p>
      <Foot>Generated from `Model.environments`. Domains are not declared yet in Plugged In (`Deploy.worker()` with no domain).</Foot>
    </div>
  </Shell>
);

const cell = (op: string, env: string) => env === "production" ? "unproven" : env === "staging" && op === "session.sign-in" ? "stale" : env === "staging" && op === "link.order" ? "fail" : "pass";
export const EnvProof = () => (
  <Shell here={{ id: "environments" }} crumbs={["Plugged In", "Blueprint", "Environments", "Proof"]} rail={false}>
    <div className="page">
      <Title h="Environments" p="Every operation against every environment: pass, fail, stale or unproven, from the logbook. Stale means it passed against a declaration that has since changed." />
      <EnvTabs tab="proof" />
      <Block title="Proof matrix" desc="Verdicts from the logbook; no telemetry token needed" flush>
        <table className="tbl"><thead><tr><th>operation</th>{environments.map((e) => <th key={e.name}>{e.name}</th>)}<th>why</th></tr></thead>
          <tbody>{operations.map((o) => <tr key={o.name}><td><a className="mono" href={page.op(o.name, "proof")}>{o.name}</a></td>
            {environments.map((e) => <td key={e.name}><Verdict v={cell(o.name, e.name)} /></td>)}
            <td className="small muted">{o.name === "session.sign-in" ? "staging: SessionCredentialsWrong changed since (was exit 3, now 10)" : o.name === "link.order" ? "staging: edit a public page, step 5" : ""}</td></tr>)}</tbody></table>
      </Block>
    </div>
  </Shell>
);

export const Plugins = () => (
  <Shell here={{ id: "plugins" }} crumbs={["Plugged In", "Blueprint", "Plugins"]}>
    <div className="page">
      <Title h="Plugins" p="Each plugin Plugged In mounts, with one file each. Deleting that file removes its things, its pages and its tables." />
      <Block title="Mounted" desc="From blueprint/features" flush>
        <table className="tbl"><thead><tr><th>plugin</th><th>kind</th><th>package</th><th>things</th><th>needs</th><th className="num">calls</th></tr></thead>
          <tbody>{(Object.keys(mounts) as MountName[]).map((k) => { const m = mounts[k]; return (
            <tr key={k}><td><a href={`plugin-${k}.html`}>{k}</a></td><td>{m.kind}</td><td className="mono">{m.package} {m.version}</td><td>{m.things.join(", ")}</td><td>{m.needs.join(", ") || "—"}</td>
              <td className="num mono">{m.things.reduce((a, t) => a + thingStat(t).calls, 0).toLocaleString("en-US")}</td></tr>); })}</tbody></table>
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
        <header className="page-title"><div className="title-row"><h1>{name}</h1><span className="mono muted">{m.kind} · {m.package} {m.version}</span></div>
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
            <tr key={t}><td><a href={page.thing(t)}>{t}</a></td><td className="small">{model.things[t]!.description}</td><td className="num mono">{s.calls.toLocaleString("en-US")} calls</td>
              <td className={`num mono${refusedTotal(s) ? " tone-warning" : ""}`}>{refusedTotal(s)} refused</td><td className="num mono">{s.defects} defects</td></tr>); })}</tbody></table>
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
