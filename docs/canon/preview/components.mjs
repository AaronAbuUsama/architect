// The canon's five components, rendered for the preview from real data in the repository: <Note>, <Scenario> (the
// journey's own file), <Model> (the project's compiled model), <Scene> (the visuals skill's renders) and <Status>,
// plus the quoted and planned fences.
import { Fragment, h } from "./runtime.mjs";
import hljs from "highlight.js";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const code = (text, lang = "typescript") => h("pre", { className: "hljs-pre" }, h("code", { className: "hljs", dangerouslySetInnerHTML: { __html: hljs.highlight(text, { language: lang }).value } }));
const attrs = (meta) => Object.fromEntries([...meta.matchAll(/(\w+)=("[^"]*"|\S+)/g)].map((m) => [m[1], m[2].replace(/^"|"$/g, "")]));
const dedent = (text) => {
  const lines = text.split("\n");
  const n = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
  return lines.map((l) => l.slice(n)).join("\n");
};

export const components = ({ repo, gh, idOf, read, pageNames }) => {
  const decisionFile = (id) => readdirSync(join(repo, "design/decisions")).find((n) => n === `${id}.md` || n.startsWith(`${id}-`));
  const decisionLink = (id) => {
    const f = decisionFile(id);
    return f ? h("a", { href: gh(`design/decisions/${f}`), className: "chip decision" }, id) : h("span", { className: "chip" }, id);
  };
  const slice = (s) => h("a", { href: gh("design/milestones.md"), className: "chip slice" }, s);
  const usedScenes = new Set();
  const models = {};
  const modelOf = (project) => (models[project] ??= JSON.parse(read(join(repo, project, "generated/model/model.json"))));
  const typeOf = (f) => {
    const v = f.value ?? {};
    const detail = v.prefix ? ` "${v.prefix}"` : v.bits ? ` ${v.bits}` : v.max ? ` ≤${v.max}` : "";
    return `${v.type}${detail}`;
  };
  const fieldsTable = (fields) =>
    h("table", null, h("thead", null, h("tr", null, ["Field", "Value", "From", "Visibility"].map((c) => h("th", { key: c }, c)))),
      h("tbody", null, Object.entries(fields).map(([k, f]) => h("tr", { key: k },
        h("td", null, h("code", null, k)), h("td", null, typeOf(f)), h("td", null, f.ref ?? f.named ?? ""), h("td", null, typeof f.visibility === "object" ? "private" : f.visibility ?? "public")))));
  const modelBox = (title, project, body) =>
    h("figure", { className: "model" }, h("figcaption", null, h("span", { className: "kind" }, "Model"), " ", title, h("a", { className: "src", href: gh(`${project}/generated/model/model.json`) }, `rendered from ${project}/generated/model/model.json`)), body);

  const Fence = ({ meta, children }) => {
    const a = attrs(meta);
    // `name` anchors the quote; `lines` is only the hint check.mjs --fix keeps fresh, and the link's anchor.
    const [x, y = x] = (a.lines ?? "").split("-");
    const where = x ? `${a.file}:${x}${y !== x ? `-${y}` : ""}` : a.file;
    const label = a.name ? `${a.file} · ${a.name}` : where;
    const head = a.planned
      ? [h("span", { key: 1, className: "badge planned" }, "designed · not built"), " ", h("code", { key: 2 }, a.path ?? ""), " ", slice(a.planned)]
      : [h("span", { key: 1, className: "badge quoted" }, "quoted · checked"), " ", h("a", { key: 2, href: x ? `${gh(a.file)}#L${x}-L${y}` : gh(a.file), title: where }, h("code", null, label))];
    return h("figure", { className: `fence ${a.planned ? "is-planned" : ""}` }, h("figcaption", null, head), children);
  };

  const Note = ({ kind, id, slice: s, decision, children }) =>
    h("aside", { className: `note note-${kind}` },
      h("div", { className: "note-head" },
        h("span", { className: "kind" }, { question: "Open question", decision: "Decision", status: "Status today" }[kind] ?? kind),
        id ? h("code", { className: "note-id" }, id) : null, decision ? decisionLink(decision) : null, s ? slice(s) : null),
      h("div", { className: "note-body" }, children));

  const Scenario = ({ journey, step }) => {
    const text = read(join(repo, journey));
    const name = /Blueprint\.journey\("([^"]+)"/.exec(text)?.[1] ?? journey;
    const head = text.slice(text.indexOf("export default"), text.indexOf("steps:"));
    let body = text.slice(text.indexOf("export default"));
    if (step) {
      const at = text.lastIndexOf("s.step(", text.indexOf(JSON.stringify(step)));
      let depth = 0, end = at + 6;
      for (; end < text.length; end++) { if (text[end] === "(") depth++; if (text[end] === ")" && --depth === 0) break; }
      const from = text.lastIndexOf("\n", at) + 1;
      body = `${head.trimEnd()}\n  steps: (s) => [\n    …\n    ${dedent(text.slice(from, end + 1)).replace(/\n/g, "\n    ")},\n    …\n  ],\n});`;
    }
    return h("figure", { className: "scenario" },
      h("figcaption", null, h("span", { className: "kind" }, "Scenario"), " journey ", h("strong", null, `“${name}”`), step ? [" · step ", h("strong", { key: 1 }, `“${step}”`)] : null,
        h("a", { className: "src", href: gh(journey) }, journey)),
      code(body));
  };

  const Model = ({ project, thing, operation, stores, show = "all" }) => {
    const m = modelOf(project);
    if (thing) {
      const t = m.things[thing];
      const machine = t.machine ? h("div", { className: "machine" }, h("p", null, "States: ", t.machine.states.map((s) => h("code", { key: s, className: "state" }, s))),
        h("table", null, h("thead", null, h("tr", null, ["Move", "From", "To", "Emits"].map((c) => h("th", { key: c }, c)))),
          h("tbody", null, Object.entries(t.machine.moves).map(([k, mv]) => h("tr", { key: k }, h("td", null, h("code", null, k)), h("td", null, mv.from.join(", ") || "(new)"), h("td", null, mv.to.join(", ")), h("td", null, mv.emits)))))) : null;
      return modelBox([h("strong", { key: 1 }, t.identifier), ` lives in `, h("code", { key: 2 }, t.lives)], project,
        h("div", null, h("p", { className: "desc" }, t.description), show !== "machine" ? fieldsTable(t.fields) : null, show === "machine" || show === "all" ? machine : null));
    }
    if (operation) {
      const o = m.operations[operation];
      const steps = h("table", null, h("thead", null, h("tr", null, ["Step", "Span", "Kind"].map((c) => h("th", { key: c }, c)))),
        h("tbody", null, [h("tr", { key: "_op" }, h("td", null, "(the operation)"), h("td", null, h("code", null, o.name)), h("td", null, "operation")),
          ...Object.entries(o.steps).map(([k, s]) => h("tr", { key: k }, h("td", null, h("code", null, k)), h("td", null, h("code", null, s.name)), h("td", null, s.type)))]));
      const facts = h("p", { className: "facts" }, "Refusals: ", o.refusals.map((r) => h("code", { key: r }, r)), ` · budget p95 ${o.budget?.p95Ms} ms · idempotent: ${o.idempotent ?? "no"} · hash `, h("code", null, o.hash));
      return modelBox([h("strong", { key: 1 }, o.name)], project, h("div", null, h("p", { className: "desc" }, o.description), show !== "declaration" ? steps : null, facts, show === "all" ? fieldsTable(o.payload) : null));
    }
    if (stores) {
      const by = {};
      for (const t of Object.values(m.things)) (by[t.lives] ??= []).push(t.name);
      return modelBox("every store", project, h("table", null, h("thead", null, h("tr", null, h("th", null, "Store"), h("th", null, "Kind"), h("th", null, "Things"))),
        h("tbody", null, Object.entries(by).map(([k, ts]) => h("tr", { key: k }, h("td", null, k === "database" ? "(default)" : "(per instance)"), h("td", null, h("code", null, k)), h("td", null, ts.join(", ")))))));
    }
    return null;
  };

  const Scene = ({ name, caption }) => {
    usedScenes.add(name);
    return h("figure", { className: "scene" },
      h("div", { className: "frame" }, ["dark", "light"].map((t) => h("video", { key: t, className: `theme-${t}`, "data-scene": `${name}.${t}`, muted: true, loop: true, autoPlay: true, playsInline: true, controls: true }))),
      h("figcaption", null, h("span", { className: "kind" }, "Scene"), " ", h("code", null, name), " · ", caption));
  };

  const status = (fm) =>
    h("div", { className: "status-card" }, h("span", { className: `badge st-${fm.status}` }, fm.status), " milestone ", h("strong", null, fm.milestone), " · slices ",
      (fm.slices ?? []).map((s) => h(Fragment, { key: s }, slice(s), " ")), " · decisions ", (fm.decisions ?? []).map((d) => h(Fragment, { key: d }, decisionLink(d), " ")));

  const header = (fm) =>
    `<header class="page-head"><div class="eyebrow">concept · <code>${esc(fm.concept)}</code></div><h1>${esc(fm.title)}</h1>` +
    `<div class="meta"><span class="badge st-${fm.status}">${esc(fm.status)}</span> ${esc(fm.milestone)} · owns ${(fm.owns ?? []).map((w) => `<span class="chip">${esc(w)}</span>`).join(" ")}</div>` +
    `<details class="questions" open><summary>Questions this page answers</summary><ul>${(fm.questions ?? []).map((q) => `<li>${esc(q)}</li>`).join("")}</ul></details></header>`;

  const linkNames = (cell) => esc(cell).replace(/`([a-z-]+)`/g, (m, n) => (pageNames.has(n) ? `<a href="#${idOf(n)}"><code>${n}</code></a>` : m)).replace(/`([^`]+)`/g, "<code>$1</code>");
  const stub = (row, part) => {
    const [job, owns, questions, linksCell, milestone] = row.cells;
    const pageLinks = (linksCell ?? "").split(/,\s*/).map((n) => n.trim()).filter((n) => /^[a-z-]+$/.test(n));
    const rest = (linksCell ?? "").split(/,\s*/).filter((n) => !/^[a-z-]+$/.test(n.trim())).join(", ");
    if (row.n.startsWith("R")) return `<div class="eyebrow">${esc(part)}</div><h1>${esc(row.name)}</h1><div class="pending-banner">Generated, never hand-written. Made from ${linkNames(job)}. ${esc(owns ?? "")}</div>`;
    return `<div class="eyebrow">${esc(part)} · page ${row.n}</div><h1>${esc(row.name)}</h1>` +
      `<div class="pending-banner">Not written yet: pass 2 writes it. This is its line in the outline.</div>` +
      `<dl class="stub"><dt>Its one job</dt><dd>${linkNames(job)}</dd><dt>Owns</dt><dd>${linkNames(owns)}</dd>` +
      `<dt>Questions a reader brings</dt><dd><ul>${questions.split(/\?\s*/).filter(Boolean).map((q) => `<li>${linkNames(q.trim())}?</li>`).join("")}</ul></dd>` +
      `<dt>Links</dt><dd>${pageLinks.map((n) => `<a href="#${idOf(n)}"><code>${n}</code></a>`).join(" ")}${rest ? ` ${linkNames(rest)}` : ""}</dd><dt>Milestone</dt><dd>${linkNames(milestone)}</dd></dl>`;
  };

  const gallery = [
    "## `<Note>`", "",
    '<Note kind="question" id="kind-capabilities" slice="M1.17">How does a store kind declare what it can serve?</Note>', "",
    '<Note kind="decision" decision="K3">Option C: a thing lives in a store of an open kind; a system we don\'t own is a source, reached through an adapter.</Note>', "",
    '<Note kind="status" slice="M1.17">Today `lives` takes `"database"` or `"actor"`.</Note>', "",
    "## `<Scenario>`, one step and a whole journey", "",
    '<Scenario journey="examples/signup/journeys/fill-a-sheet.ts" step="two people are refused: only one place is left" />', "",
    '<Scenario journey="examples/signup/journeys/a-closed-sheet-takes-no-one.ts" />', "",
    "## `<Model>`: a thing, an operation, the stores", "",
    '<Model project="examples/signup" thing="sheet" show="all" />', "",
    '<Model project="examples/signup" operation="sheet.join" show="all" />', "",
    '<Model project="examples/signup" stores />', "",
    "## `<Scene>`", "",
    '<Scene name="trace-waterfall" caption="A real allowance.grant trace from prove, building span by span." />', "",
    "## `<Status>`", "", "<Status />", "",
    "## Fences: quoted and planned", "",
    "```ts file=packages/language-effect/src/modules/records/types.ts name=Committed lines=40-41",
    "/** `conflict`: an update's version had moved on, so nothing was written and the call runs again. */",
    'export type Committed = "committed" | "conflict";', "```", "",
    "```ts planned=M1.17 path=blueprint/stores/ledger.ts", "export default Blueprint.store.database();", "```",
  ].join("\n");

  // A render from the checkout, or else from the visuals spike's branch, until PR #34 brings the renders to main.
  const RENDERS = "spikes/visual-content/renders";
  const renderOf = (file) => {
    const local = join(repo, RENDERS, file);
    if (existsSync(local)) return readFileSync(local);
    try { return execFileSync("git", ["show", `origin/spike/visual-content:${RENDERS}/${file}`], { cwd: repo, maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }); }
    catch { return undefined; }
  };
  const sceneData = () => `const SCENES = ${JSON.stringify(Object.fromEntries([...usedScenes].flatMap((n) => ["dark", "light"].map((t) => {
    const mp4 = renderOf(`${n}.${t}.mp4`);
    return [`${n}.${t}`, mp4 ? `data:video/mp4;base64,${mp4.toString("base64")}` : ""];
  }))))};`;

  return { components: { Fence, Note, Scenario, Model, Scene }, status, header, stub, gallery, sceneData, esc };
};
