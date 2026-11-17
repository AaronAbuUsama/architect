// The shell: navigation, breadcrumbs, the global environment scope and a hash router. Pages live in pages-*.js.
const ROUTES = [
  [/^#\/?$/, () => pageHome()],
  [/^#\/thing\/([\w-]+)$/, (t) => pageThing(t)],
  [/^#\/thing\/([\w-]+)\/machine$/, (t) => pageMachine(t)],
  [/^#\/thing\/([\w-]+)\/event\/(\w+)$/, (t, e) => pageEvent(t, e)],
  [/^#\/op\/([\w.-]+)$/, (o) => pageOperation(o)],
  [/^#\/env\/([\w-]+)$/, (e) => pageEnvironment(e)],
  [/^#\/work$/, () => pageWork()],
  [/^#\/(journeys|worlds|errors|roles|values|operations|events|releases|docs)$/, (k) => pageIndex(k)],
];

function nav(hash) {
  const here = (h) => (hash === h || (h !== "#/" && hash.startsWith(h + "/")) ? "on" : "");
  const cur = hash.match(/^#\/(?:thing\/([\w-]+)|op\/([\w-]+)\.)/);
  const openThing = cur ? cur[1] || cur[2] : null;
  const events = THINGS.reduce((n, t) => n + Object.keys(t.events || {}).length, 0);
  const errors = Object.keys(M.refusals).length;
  const thingItems = THINGS.map((t) => {
    let s = `<a class="${here(L.thing(t.name))}" href="${L.thing(t.name)}">${esc(t.name)}<span>${OPS.filter((o) => o.thing === t.name).length}</span></a>`;
    if (t.name === openThing) {
      s += `<a class="sub ${hash === L.machine(t.name) ? "on" : ""}" href="${L.machine(t.name)}">Machine</a>`;
      for (const o of OPS.filter((o) => o.thing === t.name)) s += `<a class="sub ${hash === L.op(o.name) ? "on" : ""}" href="${L.op(o.name)}">${esc(o.verb)}<span>${o.kind === "read" ? "read" : ""}</span></a>`;
      for (const e of Object.keys(t.events || {})) s += `<a class="sub ${hash === L.event(t.name, e) ? "on" : ""}" href="${L.event(t.name, e)}">${esc(e)}</a>`;
    }
    return s;
  }).join("");
  document.getElementById("nav").innerHTML = `
    <a class="${hash === "#/" || hash === "" ? "on" : ""}" href="#/">Overview</a>
    <h4>Things</h4>${thingItems}
    <h4>Reference</h4>
    <a class="${here("#/operations")}" href="#/operations">Operations &amp; reads<span>${OPS.length}</span></a>
    <a class="${here("#/events")}" href="#/events">Events<span>${events}</span></a>
    <a class="${here("#/errors")}" href="#/errors">Errors &amp; refusals<span>${errors}</span></a>
    <a class="${here("#/roles")}" href="#/roles">Roles</a>
    <a class="${here("#/values")}" href="#/values">Values<span>${Object.keys(M.values).length}</span></a>
    <h4>Proof</h4>
    <a class="${here("#/journeys")}" href="#/journeys">Journeys<span>${SRC.journeys.length}</span></a>
    <a class="${here("#/worlds")}" href="#/worlds">Starting worlds<span>${SRC.worlds.length}</span></a>
    ${ENVS.map((e) => `<a class="${here(L.env(e))}" href="${L.env(e)}">${esc(e)}<span>env</span></a>`).join("")}
    <a class="${here("#/releases")}" href="#/releases">Releases</a>
    <h4>Work</h4>
    <a class="${here("#/work")}" href="#/work">Board</a>
    <h4>Read</h4>
    <a class="${here("#/docs")}" href="#/docs">Docs <span>Fumadocs</span></a>
    <a href="sitemaps.html">IA options <span>4</span></a>`;
}

function crumbs(hash) {
  const parts = [`<a href="#/">acme</a>`];
  const t = hash.match(/^#\/thing\/([\w-]+)/); const o = hash.match(/^#\/op\/([\w.-]+)/);
  if (t) { parts.push(`<a href="#/">Things</a>`, `<a href="${L.thing(t[1])}">${esc(t[1])}</a>`); const m = hash.match(/\/(machine|event)\/?(\w*)$/); if (m) parts.push(`<b>${m[1] === "machine" ? "Machine" : esc(m[2])}</b>`); }
  else if (o) { const op = M.operations[o[1]]; if (op) parts.push(`<a href="${L.thing(op.thing)}">${esc(op.thing)}</a>`, `<b>${esc(op.verb)}</b>`); }
  else if (hash.startsWith("#/env/")) parts.push("Environments", `<b>${esc(hash.slice(6))}</b>`);
  else if (hash.length > 2) parts.push(`<b>${esc(hash.slice(2))}</b>`);
  document.getElementById("crumbs").innerHTML = parts.join(" / ");
}

function render() {
  const hash = location.hash.split("#").slice(0, 2).join("#") || "#/";
  nav(hash); crumbs(hash);
  let html = `<h1>Not found</h1><p class="muted">No declaration has this address.</p>`;
  for (const [re, fn] of ROUTES) { const m = hash.match(re); if (m) { html = fn(...m.slice(1)); break; } }
  const main = document.getElementById("main"); main.innerHTML = html;
  const anchor = location.hash.split("#")[2]; if (anchor) document.getElementById(anchor)?.scrollIntoView(); else window.scrollTo(0, 0);
  for (const b of main.querySelectorAll("[data-tabs] .tabs button")) b.onclick = () => {
    const box = b.closest("[data-tabs]"); box.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
    box.querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== b.dataset.tab));
  };
}

window.addEventListener("DOMContentLoaded", () => {
  const env = document.getElementById("env"); for (const e of ENVS) env.add(new Option(e, e));
  env.onchange = () => { S.env = env.value; render(); };
  const sc = document.getElementById("scenario"); sc.onchange = () => { S.scenario = sc.value; render(); };
  const cb = document.getElementById("comps");
  cb.onclick = () => { const on = document.body.classList.toggle("nocomp"); cb.classList.toggle("on", !on); cb.setAttribute("aria-pressed", String(!on)); };
  window.addEventListener("hashchange", render); render();
});
