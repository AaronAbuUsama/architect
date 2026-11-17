// One sitemap per IA option (F2 §3), built from acme's real names. A node is [label, children?, primary?].
const thingNodes = () => THINGS.map((t) => [t.name, [
  ...(t.machine ? [["machine"]] : []),
  ...OPS.filter((o) => o.thing === t.name).map((o) => [o.verb + (o.kind === "read" ? " (read)" : "")]),
  ...Object.keys(t.events || {}).map((e) => [e]),
]]);
const OPTIONS = [
  { key: "A", name: "Catalog: things are the hubs", rec: true,
    tree: [["Overview", null, true], ["Things", thingNodes(), true], ["Reference", [["Operations & reads"], ["Events"], ["Errors & refusals"], ["Roles"], ["Values"]], true],
      ["Proof", [["Journeys"], ["Starting worlds"], ...ENVS.map((e) => [e]), ["Releases"]], true], ["Work", [["Board"]], true], ["Docs (Fumadocs)", null, true]],
    path: ["Overview: matrix cell spend × staging is amber", "allowance.spend, Evidence: the staleness explainer names operation:allowance.spend and both hashes"],
    bad: "Cross-cutting questions (what changed this week, what is everyone working on) need the lenses; a pure catalog hides the loops." },
  { key: "B", name: "Lifecycle: the two loops are the navigation",
    tree: [["Design loop", [["Ideas"], ["Spikes"], ["Specify", [["Blanks"], ["Open decisions"]]]], true],
      ["Build loop", [["Implement", [["handlers missing"]]], ["Check"], ["Prove", ENVS.map((e) => [e])], ["Promote"], ["Watch"]], true],
      ["Blueprint (reference)", thingNodes().map(([n]) => [n])]],
    path: ["Build loop", "Prove", "staging", "allowance.spend row, stale", "explainer"],
    bad: "acme has no ideas, spikes or blanks projected, so half the navigation is empty today; a thing's facts split across five stages." },
  { key: "C", name: "Graph: one map, pages are zoom levels",
    tree: [["System map", [["refers (11)"], ["acts-on (12)"], ["reads (3)"], ["emits (7)"], ["allowed-by (12)"]], true],
      ["Zoom: thing", thingNodes().map(([n]) => [n])], ["Zoom: declaration detail"], ["Overlays", [["proof per environment"], ["staleness"], ["journeys"]], true]],
    path: ["System map", "turn on staleness overlay, pick staging", "click allowance.spend node", "detail panel"],
    bad: "45 edges for 8 things is already dense; graphs are poor at reading fields and refusals, and inaccessible without a parallel list." },
  { key: "D", name: "Work: board first, declarations as context",
    tree: [["Board", [["Specify"], ["Implement"], ["Cover"], ["Prove"], ["Promote · watch"]], true], ["Milestones", [["(none declared in acme)"]], true],
      ["Task", [["context: operation, errors, events, journeys, evals"]]], ["Blueprint (reference)", thingNodes().map(([n]) => [n])]],
    path: ["Board", "Prove column, allowance lane", "allowance.spend card (stale)", "task context, evidence"],
    bad: "Answers 'what next' but not 'what is acme'; with no declared milestones the board is a derived view, not a plan." },
];
function treeHtml(nodes) {
  return `<ul>${nodes.map(([label, kids, primary]) => `<li><span class="${primary ? "primary" : ""}">${esc(label)}</span>${kids && kids.length ? treeHtml(kids) : ""}</li>`).join("")}</ul>`;
}
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("maps").innerHTML = OPTIONS.map((o) => `<section class="card" ${o.rec ? 'style="border:2px solid var(--accent)"' : ""}>
    <div class="row"><h2 style="margin:0">${o.key} · ${esc(o.name)}</h2>${o.rec ? `<span class="chip plain k-op">Recommended primary axis</span>` : ""}</div>
    <div class="tree small" style="max-height:340px;overflow:auto;margin:10px 0">${treeHtml(o.tree)}</div>
    <h3>“Why is spend stale in staging?” in ${o.path.length} clicks</h3><ol class="small" style="margin:0;padding-left:18px">${o.path.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>
    <h3>Bad at</h3><p class="small muted" style="margin:0">${esc(o.bad)}</p></section>`).join("");
});
