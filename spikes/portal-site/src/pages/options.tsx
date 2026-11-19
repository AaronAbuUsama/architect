// Round 3's open questions as drawn options (Aaron, 19 November: "need options as designs", "show me"): the screens
// only option B or C needs, and the Options page that puts A, B and C side by side with the references they draw on.
import { ItemCard } from "@heroui-pro/react";
import { Chip } from "@heroui/react";
import { PlugsIcon } from "@phosphor-icons/react/ssr";
import { journeys } from "../journeys.ts";
import { thingStat, refusedTotal } from "../live.ts";
import { environments, operations, page } from "../model.ts";
import { blank, mounts, stores, type MountName } from "../overlay.ts";
import { Foot, Shell } from "../shell.tsx";
import { Block, Verdict } from "../ui.tsx";

const verdict = (op: string, env: string) => env === "production" ? "unproven" : env === "staging" && op === "session.sign-in" ? "stale" : env === "staging" && op === "link.order" ? "fail" : "pass";

/** Q2 B: a page per environment. Drawn for staging. */
export const EnvPage = () => {
  const e = environments.find((x) => x.name === "staging")!;
  const counts = operations.reduce<Record<string, number>>((a, o) => { const v = verdict(o.name, e.name); a[v] = (a[v] ?? 0) + 1; return a; }, {});
  return (
    <Shell here={{ id: "env:staging" }} crumbs={["Plugged In", "Environments", "staging"]} rail={false}>
      <div className="page">
        <header className="page-title"><div className="title-row"><h1>staging</h1><span className="mono muted">{e.file}</span></div>
          <p>{e.runs} · people signed in (better-auth) · promotes to production</p>
          <div className="props"><Chip size="sm" variant="soft">cloudflare · d1</Chip><Chip size="sm" variant="soft" className="mono">rev 9c1e2a0</Chip><Chip size="sm" variant="soft">no domain declared</Chip></div></header>
        <div className="two">
          <Block title="Setup" desc="From its file">
            <dl className="kv"><dt>database</dt><dd>d1</dd><dt>secrets</dt><dd className="muted">none declared</dd><dt>telemetry</dt><dd className="muted">none declared</dd>
              <dt>deploy</dt><dd>server: worker</dd><dt>publish</dt><dd>cli: npm next · sdk: npm next</dd><dt>promotes to</dt><dd>production</dd></dl>
          </Block>
          <Block title="Proof" desc={`${operations.length} operations against staging`}>
            <div className="verdict-sum">{Object.entries(counts).map(([v, n]) => <span key={v}><Verdict v={v as "pass"} /> <b className="mono">{n}</b></span>)}</div>
            <ul className="plain small">{operations.filter((o) => verdict(o.name, "staging") !== "pass").map((o) => <li key={o.name}><a className="mono" href={page.op(o.name, "proof")}>{o.name}</a> <Verdict v={verdict(o.name, "staging") as "fail"} /></li>)}</ul>
          </Block>
        </div>
        <Block title="Journeys in staging" flush>
          <table className="tbl"><tbody>{journeys.map((j) => <tr key={j.slug}><td><a href={`journey-${j.slug}.html`}>{j.name}</a></td><td><Verdict v={j.verdicts.staging!} /></td></tr>)}</tbody></table>
        </Block>
        <Block title="Live"><p className="muted small">Live numbers show only in staging's own portal. You are in local, so this page has setup and proof only.</p></Block>
        <Foot>Option Q2 B. local, test and production each get the same page; comparing two means opening two pages.</Foot>
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
        <div className="item-cards">{(Object.keys(mounts) as MountName[]).map((k) => { const m = mounts[k], calls = m.things.reduce((a, t) => a + thingStat(t).calls, 0); return (
          <ItemCard key={k} variant="secondary">
            <ItemCard.Icon><PlugsIcon size={18} /></ItemCard.Icon>
            <ItemCard.Content><ItemCard.Title>{k} <span className="muted small mono">{m.package} {m.version}</span></ItemCard.Title>
              <ItemCard.Description>{m.things.join(", ")} · needs {m.needs.join(", ") || "nothing"} · left out {m.omitted.join(", ") || "nothing"}</ItemCard.Description></ItemCard.Content>
            <ItemCard.Action><span className="mono small">{calls.toLocaleString("en-US")} calls · {m.things.reduce((a, t) => a + refusedTotal(thingStat(t)), 0)} refused</span></ItemCard.Action>
          </ItemCard>); })}</div>
      </Block>
      <Block title="Stores" flush>
        <table className="tbl"><thead><tr><th>store</th><th>kind</th><th>things</th>{environments.map((e) => <th key={e.name}>{e.name}</th>)}</tr></thead>
          <tbody>{stores.map((s) => <tr key={s.name}><td className="mono">{s.name}</td><td>{s.kind}</td><td className="small">{s.things.join(", ")}</td>{environments.map((e) => <td key={e.name} className="small">{e.database ?? e.cloud?.database ?? "—"}</td>)}</tr>)}</tbody></table>
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
    { letter: "A", name: "One sidebar, sections", file: "q1-a.html", rec: true, gets: "Things first, then Blueprint and Monitor sections in the same sidebar. Everything one click away.", refs: [{ app: "WorkOS", id: "ffd52966-155c-492d-8508-0c428d3de985", what: "grouped sections" }, { app: "Exa", id: "f4a34c68-7448-45cb-ad21-81d9c576d90e", what: "labelled groups" }] },
    { letter: "B", name: "Icon rail swaps the sidebar", file: "q1-b-proof.html", gets: "Five icons down the left; each swaps the sidebar for its section. Drawn on Proof.", refs: [{ app: "Railway", id: "a1ee572f-24ca-494c-b1f4-a3d49cbeabd1", what: "icon rail" }, { app: "StackAI", id: "a7d6a9ce-bdb9-4284-9a06-9f6445749611", what: "rail + section panel" }, { app: "Plain", id: "0bb4fd33-262c-4180-b316-aec4d20f4297", what: "rail + tree" }] },
    { letter: "C", name: "Things only, ⌘K for the rest", file: "q1-c.html", gets: "The sidebar is only the tree. Environments, journeys, codes and the rest are found by search.", refs: [{ app: "fal", id: "3786699a-7b92-4f81-9545-737fd5edfcff", what: "search-first top bar" }, { app: "Grok", id: "a07b68c7-61f4-4220-85ef-cb790a39b3d9", what: "short sidebar, search" }] },
  ] },
  { q: "Q2", title: "Environments: one page comparing them, or a page each?", ask: "Aaron: \"same need designs\"", options: [
    { letter: "A", name: "One page, environments as columns", file: "q2-a.html", rec: true, gets: "Setup side by side, proof as a matrix tab. Answers \"what differs between staging and production\" at a glance.", refs: [{ app: "StackAI", id: "a7d6a9ce-bdb9-4284-9a06-9f6445749611", what: "dev / staging / prod as columns" }, { app: "Neon", id: "5fb28d4d-e574-43e5-9ea4-79cbee893e0f", what: "compare two branches" }] },
    { letter: "B", name: "A page per environment", file: "q2-b.html", gets: "Environments listed in the sidebar; each has its own setup, proof and journeys. Drawn for staging.", refs: [{ app: "Vercel", id: "11def438-b12a-4f4c-938e-ec13525dd1dd", what: "list, then one page each" }, { app: "Render", id: "3e106d4a-c875-45d5-be51-387a519355f8", what: "a section per environment" }] },
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
