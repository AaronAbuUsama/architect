// Round 3's open questions as drawn options (Aaron, 19 November: "need options as designs", "show me"): the screens
// only option B or C needs, and the Options page that puts A, B and C side by side with the references they draw on.
import { ItemCard } from "@heroui-pro/react";
import { Chip, Tabs } from "@heroui/react";
import { PlugsIcon } from "@phosphor-icons/react/ssr";
import { journeys } from "../journeys.ts";
import { splitOf, sum } from "../live.ts";
import { CallsMeter } from "../kit/calls-meter.tsx";
import { EnvironmentPill } from "../kit/environment-pill.tsx";
import { VerdictMatrix } from "../kit/verdict-matrix.tsx";
import { envFields, FocusCard, journeyRows, opRows } from "./env-compare.tsx";
import { environments, opsOf } from "../model.ts";
import { blank, mounts, stores, type MountName } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block, Verdict } from "../ui.tsx";

/** Q2 B: a page per environment, tabs across the four. Drawn for staging. */
export const EnvPage = () => {
  const e = environments.find((x) => x.name === "staging")!, envs = ["staging"];
  return (
    <Shell here={{ id: "env:staging" }} crumbs={["Plugged In", "Environments", "staging"]} rail={false}>
      <div className="page">
        <header className="page-title"><h1>Environments</h1></header>
        <Tabs selectedKey="staging" className="page-tabs"><Tabs.ListContainer><Tabs.List aria-label="Environments">
          {environments.map((x) => <Tabs.Tab key={x.name} id={x.name} href={x.name === "staging" ? "q2-b.html" : "#"}>{x.name}<Tabs.Indicator /></Tabs.Tab>)}
        </Tabs.List></Tabs.ListContainer></Tabs>
        <FocusCard e={e} />
        <div className="two">
          <section className="panel"><header className="panel__head"><h2>Declared</h2><span className="muted small">{e.file}</span></header>
            <table className="tbl env-tbl"><tbody>{envFields.map((r) => <tr key={r.key}><th scope="row"><span className="field-label">{r.label}</span><code className="field-key">{r.key}</code></th><td>{r.show(e)}</td></tr>)}</tbody></table>
          </section>
          <section className="panel"><header className="panel__head"><h2>Proof in staging</h2></header>
            <VerdictMatrix rows={opRows()} envs={envs} of="operations" rowHead="operation" />
            <VerdictMatrix rows={journeyRows()} envs={envs} of="journeys" rowHead="journey" />
          </section>
        </div>
        <Foot>Option Q2 B. Each environment gets this page; comparing two means switching tabs.</Foot>
      </div>
    </Shell>
  );
};

/** Q3 B: one list page for plugins and stores, no page per plugin. */
export const PluginsAndStores = () => (
  <Shell here={{ id: "plugins" }} crumbs={["Plugged In", "Blueprint", "Plugins and stores"]}>
    <div className="page">
      <header className="page-title"><h1>Plugins and stores</h1><p>What Plugged In mounts and where its things live, on one page.</p></header>
      <Block title="Plugins" desc="From blueprint/features">
        <div className="item-cards">{(Object.keys(mounts) as MountName[]).map((k) => { const m = mounts[k]; return (
          <ItemCard key={k} variant="secondary">
            <ItemCard.Icon><PlugsIcon size={18} /></ItemCard.Icon>
            <ItemCard.Content><ItemCard.Title>{k}<Chip size="sm" variant="soft" className="mono">{m.package}@{m.version}</Chip></ItemCard.Title>
              <ItemCard.Description><span className="chips">{m.things.map((t) => <Chip key={t} size="sm" variant="secondary">{t}</Chip>)}{m.needs.map((n) => <Chip key={n} size="sm" variant="soft">needs {n}</Chip>)}{m.omitted.map((n) => <Chip key={n} size="sm" variant="soft" color="warning">left out {n}</Chip>)}</span></ItemCard.Description></ItemCard.Content>
            <ItemCard.Action><div style={{ width: 260 }}><CallsMeter split={splitOf(sum(m.things.flatMap(opsOf)))} size="sm" label={k} /></div></ItemCard.Action>
          </ItemCard>); })}</div>
      </Block>
      <Block title="Stores" flush>
        <table className="tbl"><thead><tr><th>store</th><th>kind</th><th>things</th>{environments.map((e) => <th key={e.name}>{e.name}</th>)}</tr></thead>
          <tbody>{stores.map((s) => <tr key={s.name}><td className="mono">{s.name}</td><td>{s.kind}</td><td><span className="chips">{s.things.map((t) => <Chip key={t} size="sm" variant="secondary">{t}</Chip>)}</span></td>{environments.map((e) => <td key={e.name}><EnvironmentPill env={e} size="sm" showRuns /></td>)}</tr>)}</tbody></table>
      </Block>
      <Foot>Option Q3 B. The choices a mount made, what it narrowed and its integrity have no page: they are in the docs.</Foot>
    </div>
  </Shell>
);

/** Q6 B: one page of everything still blank; nothing in the tree. */
export const StillBlank = () => (
  <Shell here={{ id: "blanks" }} crumbs={["Plugged In", "Blueprint", "Still blank"]} rail={false}>
    <div className="page">
      <header className="page-title"><h1>Still blank</h1><p>Every operation and declaration with a <span className="mono">Blueprint.todo</span> in it. None of them is in the tree until it is filled.</p></header>
      <Block title="1 operation, 2 declarations" flush>
        <table className="tbl"><thead><tr><th>operation</th><th>file</th><th>blank</th><th>declared</th></tr></thead>
          <tbody><tr><td className="mono">{blank.name}</td><td className="mono small">{blank.file}</td><td>{blank.blanks.map((b) => <Chip key={b} size="sm" variant="soft" color="warning">{b}</Chip>)}</td><td className="small muted">{blank.has.join(", ")}</td></tr></tbody></table>
      </Block>
      <Foot>Option Q6 B. Illustrative: Plugged In has no blank operation today.</Foot>
    </div>
  </Shell>
);

const mob = (id: string) => `https://mobbin.com/screens/${id}`;
type Ref = { app: string; id: string; what: string };
type Option = { letter: "A" | "B" | "C"; name: string; file: string; gets: string; refs: Ref[]; rec?: boolean };
type Question = { q: string; title: string; ask: string; options: Option[] };
const questions: Question[] = [
  { q: "Q1", title: "Where do the pages beyond things live?", ask: "Aaron: \"need options as designs\"", options: [
    { letter: "A", name: "One sidebar, sections", file: "q1-a.html", gets: "Things first, then Blueprint and Monitor sections in the same sidebar. Everything one click away.", refs: [{ app: "WorkOS", id: "ffd52966-155c-492d-8508-0c428d3de985", what: "grouped sections" }, { app: "Exa", id: "f4a34c68-7448-45cb-ad21-81d9c576d90e", what: "labelled groups" }] },
    { letter: "B", name: "Icon rail swaps the sidebar", file: "q1-b-proof.html", rec: true, gets: "Aaron's pick (\"I want to have icon rail\"), rebuilt from Pro's Sidebar: the Icon Only pattern beside Sidebar.Pages, one panel per section. Drawn on Proof.", refs: [{ app: "Railway", id: "a1ee572f-24ca-494c-b1f4-a3d49cbeabd1", what: "icon rail" }, { app: "StackAI", id: "a7d6a9ce-bdb9-4284-9a06-9f6445749611", what: "rail + section panel" }, { app: "Plain", id: "0bb4fd33-262c-4180-b316-aec4d20f4297", what: "rail + tree" }] },
    { letter: "C", name: "Things only, ⌘K for the rest", file: "q1-c.html", gets: "The sidebar is only the tree. Environments, journeys, codes and the rest are found by search.", refs: [{ app: "fal", id: "3786699a-7b92-4f81-9545-737fd5edfcff", what: "search-first top bar" }, { app: "Grok", id: "a07b68c7-61f4-4220-85ef-cb790a39b3d9", what: "short sidebar, search" }] },
  ] },
  { q: "Q2", title: "Environments: one page comparing them, or a page each?", ask: "Aaron: \"same need designs\"", options: [
    { letter: "A", name: "One page: pick one, compare the rest", file: "q2-a.html", rec: true, gets: "Every field EnvironmentModel declares, as columns. Pick an environment and the others mark where they differ. Proof is one matrix, every column tallied.", refs: [{ app: "StackAI", id: "a7d6a9ce-bdb9-4284-9a06-9f6445749611", what: "dev / staging / prod as columns" }, { app: "Neon", id: "5fb28d4d-e574-43e5-9ea4-79cbee893e0f", what: "compare two branches" }] },
    { letter: "B", name: "A page per environment", file: "q2-b.html", gets: "Tabs across the four; each has its declaration beside its proof. Comparing means switching tabs. Drawn for staging.", refs: [{ app: "Vercel", id: "11def438-b12a-4f4c-938e-ec13525dd1dd", what: "list, then one page each" }, { app: "Render", id: "3e106d4a-c875-45d5-be51-387a519355f8", what: "a section per environment" }] },
    { letter: "C", name: "The switcher's menu only", file: "q2-c.html", gets: "No page. The top bar's switcher lists each environment and links to the proof matrix.", refs: [{ app: "WorkOS", id: "ffd52966-155c-492d-8508-0c428d3de985", what: "environment switcher in the top bar" }] },
  ] },
  { q: "Q3", title: "Plugins and stores: their own pages, or only labels?", ask: "Aaron: \"same designs\"", options: [
    { letter: "A", name: "A page per plugin, and Stores", file: "q3-a.html", rec: true, gets: "The tree's group header opens the plugin: its choices, what it left out and narrowed, its things live.", refs: [{ app: "Height", id: "25de2e30-f93f-473e-9f0a-149f89a2f08b", what: "an installed integration's own page" }] },
    { letter: "B", name: "One list page", file: "q3-b.html", gets: "Plugins as cards and stores as a table on one page; no page per plugin.", refs: [{ app: "TheyDo", id: "d0aa487e-b715-4005-a509-9e07d1234bd4", what: "one list of integrations" }, { app: "1Password", id: "85c81997-fba7-4909-a2d4-cf0bf65644db", what: "grouped integration list" }] },
    { letter: "C", name: "Labels only", file: "q3-c.html", gets: "Chips on the thing page say which plugin and store; details live in the docs.", refs: [{ app: "Render", id: "3e106d4a-c875-45d5-be51-387a519355f8", what: "runtime and region as labels on each row" }] },
  ] },
  { q: "Q6", title: "Where do blank operations show?", ask: "Aaron: \"show me\"", options: [
    { letter: "A", name: "In the tree, greyed", file: "q6-a.html", rec: true, gets: "link.pin sits under link where it will live, marked blank; its page is the spec.", refs: [{ app: "Confluence", id: "7f293643-90dc-4e53-945a-a1947df55b4f", what: "draft chip in the page tree" }, { app: "Plain", id: "0bb4fd33-262c-4180-b316-aec4d20f4297", what: "draft articles in place" }] },
    { letter: "B", name: "One \"Still blank\" page", file: "q6-b.html", gets: "Blanks are listed on their own page; the tree shows only what is real.", refs: [{ app: "Tines", id: "5992c2c8-7e67-4807-86a7-40251ba26656", what: "drafts as their own section" }, { app: "Aboard", id: "50b9ba6a-5a64-4fd0-b553-86ce7de15b81", what: "a Draft stack" }] },
    { letter: "C", name: "Hidden until filled", file: "q6-c.html", gets: "Nothing shows link.pin anywhere until its blanks are filled.", refs: [] },
  ] },
];

export const Options = () => (
  <Shell here={{ id: "options" }} crumbs={["Plugged In", "Round 3 options"]} rail={false}>
    <div className="page options-page">
      <header className="page-title"><h1>Round 3: pick by looking</h1>
        <p>Q1, Q2, Q3 and Q6 drawn three ways each. Every screen is the real portal with only that question changed. Click a screen to open it. Q4 (journeys and worlds, drawn graphically) and Q5 (reference pages with live telemetry) are decided and built into the site.</p></header>
      {questions.map((q) => (
        <section key={q.q} className="opt-q">
          <h2><span className="mono">{q.q}</span> {q.title} <span className="muted small">{q.ask}</span></h2>
          <div className="opt-row">{q.options.map((o) => (
            <article key={o.letter} className={`opt-card${o.rec ? " is-rec" : ""}`}>
              <a href={o.file} className="opt-shot"><img src={`opt/${o.file.replace(".html", ".jpg")}`} alt={`${q.q} option ${o.letter}: ${o.name}`} loading="lazy" /></a>
              <div className="opt-body">
                <div className="opt-name"><Chip size="sm" variant="soft" color={o.rec ? "accent" : "default"}>{o.letter}</Chip><b>{o.name}</b>{o.rec && <span className="muted small">recommended</span>}</div>
                <p className="small">{o.gets}</p>
                <p className="small muted">{o.refs.length ? <>From {o.refs.map((r, i) => <span key={r.id}>{i > 0 && ", "}<a href={mob(r.id)}>{r.app}</a> ({r.what})</span>)}, on Mobbin.</> : "No reference: this is the absence of a pattern."}</p>
              </div>
            </article>))}</div>
        </section>))}
      <p className="small muted">Answer as before, for example "Q1 A, Q2 B, Q3 A, Q6 A".</p>
    </div>
  </Shell>
);
