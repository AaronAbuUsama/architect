// The shell: sidebar, top bar, search, the router and the view toggles. All of it is static in the real site.
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
window.SCOPE = store.get("scope") ?? "all";

const dot = (op) => `<span class="slot"><span class="chip s-${worst(op)}" style="padding:0 5px;margin:0">${worst(op) === "recorded-pass" ? "✔" : worst(op) === "stale" ? "stale" : worst(op) === "failed" ? "✘" : "–"}</span></span>`;
function sidebar(route) {
  const on = (href) => (route === href ? " on" : "");
  const item = (href, text, extra = "") => `<a class="${on(href).trim()}" href="${href}"><span>${esc(text)}</span>${extra}</a>`;
  const things = Object.values(M.things).map((t) => {
    const open = route.startsWith(L.thing(t.name)) || opsOf(t.name).some((o) => route === L.op(o.name));
    return `<details${open ? " open" : ""}><summary><span>${esc(t.name)}</span><span class="dim small">${esc(t.code)}</span></summary><div>
      ${item(L.thing(t.name), "Overview")}${opsOf(t.name).map((o) => item(L.op(o.name), o.verb, dot(o.name))).join("")}
      ${Object.keys(t.events || {}).map((e) => item(L.event(t.name, e), e)).join("")}</div></details>`;
  }).join("");
  return `${item(L.home, "Overview")}${item(L.proof, "Proof")}
    <h6>Things</h6>${things}
    <h6>Reference</h6>${item(L.machines, "Machines")}${item(L.events, "Events")}${item(L.errors, "Errors")}${item(L.values, "Values")}${item(L.roles, "Roles")}
    <h6>Runtime</h6>${item(L.traces, "Traces", `<span class="dim small">${TRACES.length}</span>`)}
    <h6>Environments</h6>${Object.keys(M.environments).map((e) => item(L.env(e), e)).join("")}
    <h6>Stories</h6>${item(L.journeys, "Journeys", `<span class="dim small">soon</span>`)}`;
}

function resolve(path) {
  const p = path.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!p.length) return PAGES.home();
  if (p[0] === "proof") return PAGES.proof();
  if (p[0] === "things" && p.length === 1) return PAGES.things();
  if (p[0] === "things" && p[2] === "events") return PAGES.event(p[1], p[3]);
  if (p[0] === "things") return PAGES.thing(p[1]);
  if (p[0] === "operations") return PAGES.op(p[1]);
  if (p[0] === "environments") return PAGES.env(p[1]);
  if (p[0] === "reference" && PAGES[p[1]]) return PAGES[p[1]]();
  if (p[0] === "journeys") return PAGES.journeys();
  if (p[0] === "traces") return p[1] ? PAGES.trace(p[1]) : PAGES.traces();
  if (p[0] === "docs") return PAGES.doc(p.slice(1).join("/"));
  return null;
}

function render() {
  const [route, anchor] = (location.hash || "#/").split(/(?<=.)#/);
  const parts = route.replace(/^#\/?/, "").split("/");
  const sub = parts[0] === "reference" && parts[2] ? parts[2] : anchor; const base = parts[0] === "reference" ? `#/reference/${parts[1]}` : route;
  const page = resolve(base) ?? { title: "Not found", crumbs: [[L.home, BP.project]], toc: [], html: `<h1>Not found</h1><p>Nothing in ${esc(BP.project)}'s blueprint has that address.</p>` };
  document.title = `${page.title} · ${BP.project} docs`;
  document.querySelector(".side").innerHTML = sidebar(base);
  document.querySelector(".page").innerHTML = `<div class="crumbs">${page.crumbs.map(([h, t]) => (h ? a(h, t) : esc(t))).join(" / ")}</div>${page.html}`;
  document.querySelector(".toc").innerHTML = page.toc.length ? `<b>On this page</b>${page.toc.map(([id, t]) => `<a href="${base}#${id}">${esc(t)}</a>`).join("")}` : "";
  document.body.classList.remove("nav-open"); mountTables();
  const target = sub && document.getElementById(sub); if (target) target.scrollIntoView(); else scrollTo(0, 0);
  document.querySelectorAll(".tabs").forEach((t) => t.querySelectorAll("nav button").forEach((b) => b.onclick = () => {
    t.querySelectorAll("nav button").forEach((x) => x.classList.toggle("on", x === b));
    t.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
  }));
}

// Search: a static index built from the blueprint, the same as the real site's build would make.
const INDEX = [
  ...Object.values(M.things).map((t) => [t.name, `thing · ${t.code}`, L.thing(t.name)]),
  ...Object.values(M.operations).map((o) => [o.name, `operation · ${o.description}`, L.op(o.name)]),
  ...Object.values(M.things).flatMap((t) => Object.keys(t.events || {}).map((e) => [e, `event of ${t.name}`, L.event(t.name, e)])),
  ...Object.values(ERRORS).map((e) => [`${e.name} ${e.code}`, `error · exit ${e.exit ?? "–"}`, `${L.errors}/${e.name}`]),
  ...Object.keys(M.values).map((v) => [v, "value", `${L.values}/${v}`]),
  ...Object.keys(M.environments).map((e) => [e, "environment", L.env(e)]),
];
function openSearch() {
  const d = document.querySelector("dialog"), input = d.querySelector("input"), list = d.querySelector("ul"); let sel = 0, hits = [];
  const draw = () => { const q = input.value.toLowerCase().trim();
    hits = INDEX.filter(([n, k]) => !q || n.toLowerCase().includes(q) || k.toLowerCase().includes(q)).slice(0, 12); sel = Math.min(sel, Math.max(hits.length - 1, 0));
    list.innerHTML = hits.map(([n, k, h], i) => `<li><a class="${i === sel ? "on" : ""}" href="${h}"><span>${esc(n)}</span><small>${esc(k.slice(0, 60))}</small></a></li>`).join("") || `<li class="muted" style="padding:10px">No match.</li>`; };
  input.value = ""; draw(); d.showModal(); input.focus();
  input.oninput = () => { sel = 0; draw(); };
  input.onkeydown = (e) => { if (e.key === "ArrowDown") { sel = Math.min(sel + 1, hits.length - 1); draw(); e.preventDefault(); }
    if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    if (e.key === "Enter" && hits[sel]) { location.hash = hits[sel][2]; d.close(); } };
  list.onclick = (e) => { if (e.target.closest("a")) d.close(); };
}

function controls() {
  const seg = (sel, key, values, apply) => { const el = document.querySelector(sel);
    el.innerHTML = values.map(([v, t]) => `<button data-v="${v}">${t}</button>`).join("");
    const set = (v) => { el.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === v)); store.set(key, v); apply(v); };
    el.onclick = (e) => { const b = e.target.closest("button"); if (b) set(b.dataset.v); }; set(store.get(key) ?? values[0][0]); };
  seg(".view", "view", [["served", "Served"], ["static", "Static file"]], (v) => document.body.classList.toggle("static", v === "static"));
  document.querySelector(".seams").onclick = () => document.body.classList.toggle("seams");
  document.querySelector(".theme").onclick = () => { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; r.dataset.theme = dark ? "light" : "dark"; };
  document.querySelector(".search").onclick = openSearch;
  document.querySelector(".menu").onclick = () => document.body.classList.toggle("nav-open");
  addEventListener("keydown", (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); openSearch(); } if (e.key === "/" && document.activeElement === document.body) { e.preventDefault(); openSearch(); } });
  document.querySelector(".brand").innerHTML = `<span class="logo"></span>${esc(BP.project)} <small>docs</small>`;
}
addEventListener("hashchange", render);
controls(); render();
