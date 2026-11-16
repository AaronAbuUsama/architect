/* ---------- Helpers ---------- */
function fid(p) { return "f-" + p.replace(/[^A-Za-z0-9]+/g, "-").replace(/-+$/, ""); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
const KIND = { scaffold: "scaffolded, then yours", generated: "generated, never edited", framework: "Architect itself" };
const kindOf = (k) => (k === "write" ? "scaffold" : k);
function langOf(path) {
  if (/\.tsx?$/.test(path)) return "typescript";
  if (/\.json$/.test(path)) return "json";
  if (/\.ya?ml$/.test(path)) return "yaml";
  if (/\.md$/.test(path)) return "markdown";
  if (/\.sol$/.test(path)) return "solidity";
  if (/\.rb$/.test(path)) return "ruby";
  return "none";
}
function highlight(code, lang) {
  const grammar = window.Prism && lang !== "none" ? Prism.languages[lang] : null;
  return code.split("\n").map((raw) => {
    let cls = "";
    let line = raw;
    if (/^\+ /.test(line) || line === "+") { cls = "ln-add"; line = line.slice(2); }
    else if (/^- /.test(line)) { cls = "ln-del"; line = line.slice(2); }
    if (/(Architect|Blueprint)\.todo\(|notWritten\(/.test(line) && cls !== "ln-del") cls = (cls + " ln-todo").trim();
    const body = grammar ? Prism.highlight(line, grammar, lang) : esc(line);
    return '<span class="ln ' + cls + '">' + (body || " ") + "</span>";
  }).join("");
}
const resting = (c) => c.split("\n").filter((l) => !/^- /.test(l)).map((l) => (l === "+" ? "" : l.replace(/^\+ /, ""))).join("\n");  // "+ " then the line exactly

/* ---------- The project at each step ---------- */
const FILE_BY_PATH = new Map(FILES.map((f) => [f.p, f]));
const FRAMEWORK = FILES.filter((f) => f.k === "framework");
const SNAPSHOTS = [];
{
  const base = new Map();
  for (const f of FILES) {
    if (f.k === "framework" || EXAMPLE_FILES.test(f.p)) continue;
    base.set(f.p, { k: kindOf(f.k), c: BASE_OVERRIDES[f.p] ?? f.c, n: f.n, status: "new" });
  }
  SNAPSHOTS.push(base);
  for (let i = 1; i < STEPS.length; i++) {
    const map = new Map([...SNAPSHOTS[i - 1]].map(([p, v]) => [p, { ...v, status: "same", display: undefined }]));
    for (const f of STEPS[i].files) {
      const raw = f.use ? FILE_BY_PATH.get(f.use).c : f.c;
      const existed = map.has(f.p);
      map.set(f.p, { k: kindOf(f.k), c: resting(raw), display: raw, n: FILE_BY_PATH.get(f.p)?.n || "", status: f.s || (existed ? "changed" : "new") });
    }
    SNAPSHOTS.push(map);
  }
}
const LAST = STEPS.length;
function fileAt(step, path) {
  if (path.startsWith("architect/")) { const f = FILE_BY_PATH.get(path); return f && { k: "framework", c: f.c, n: f.n, status: "same" }; }
  return SNAPSHOTS[step - 1].get(path);
}

/* ---------- Trees ---------- */
const ORDER = (d) => ({ blueprint: 0, implementation: 1, generated: 2 }[d] ?? 3) + d;
const ancestors = (p) => { const out = []; const parts = p.split("/"); for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join("/") + "/"); return out; };
const allDirs = (paths) => [...new Set(paths.flatMap(ancestors))];
const treeTools = '<div class="ttools"><button type="button" data-fold="open">Expand all</button><button type="button" data-fold="close">Collapse all</button></div>';
function treeHtml(paths, opts) {
  const isOpen = (full) => !opts.open || opts.open.has(full);
  const root = {};
  for (const p of paths) {
    const parts = p.split("/");
    let node = root;
    parts.forEach((part, i) => { if (i === parts.length - 1) (node.__f ||= []).push(p); else node = node[part] ||= {}; });
  }
  const render = (node, prefix) => {
    const dirs = Object.keys(node).filter((k) => k !== "__f").sort((a, b) => ORDER(a).localeCompare(ORDER(b)));
    let html = "<ul>";
    for (const d of dirs) {
      const full = prefix + d + "/";
      const note = opts.notes?.[full] ? '<span class="tnote">' + esc(opts.notes[full]) + "</span>" : "";
      const o = isOpen(full);
      html += '<li class="dir"><button type="button" class="tdir" data-dir="' + esc(full) + '" aria-expanded="' + o + '"><span class="chev">' + (o ? "▾" : "▸") + "</span> " + esc(d) + "/" + note + "</button>" + render(node[d], full).replace("<ul>", o ? "<ul>" : "<ul hidden>") + "</li>";
    }
    for (const p of node.__f || []) {
      const f = opts.get(p);
      const mark = f.status === "new" && opts.marks ? '<span class="tmark m-new">N</span>' : f.status === "changed" && opts.marks ? '<span class="tmark m-chg">M</span>' : "";
      const note = opts.notes?.[p] ? '<span class="tnote">' + esc(opts.notes[p]) + "</span>" : "";
      html += '<li><button type="button" class="tfile" data-path="' + esc(p) + '"><span class="dot d-' + f.k + '"></span><span class="tname">' + esc(p.split("/").pop()) + "</span>" + mark + note + "</button></li>";
    }
    return html + "</ul>";
  };
  return treeTools + render(root, "");
}
/* Every folder folds. Folding one folds everything under it, so it reopens one level at a time.
   `openSet` is the tree's memory of what's open; it survives re-rendering between steps. */
function setDir(b, open) {
  b.setAttribute("aria-expanded", String(open));
  b.querySelector(".chev").textContent = open ? "▾" : "▸";
  const ul = b.nextElementSibling;
  if (ul) ul.hidden = !open;
}
function wireTree(el, onFile, openSet) {
  el.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !el.contains(b)) return;
    if (b.dataset.path) { onFile(b.dataset.path); return; }
    if (b.dataset.fold) {
      const open = b.dataset.fold === "open";
      el.querySelectorAll(".tdir").forEach((d) => { setDir(d, open); if (open) openSet.add(d.dataset.dir); else openSet.delete(d.dataset.dir); });
      return;
    }
    const open = b.getAttribute("aria-expanded") !== "true";
    setDir(b, open);
    if (open) openSet.add(b.dataset.dir);
    else {
      openSet.delete(b.dataset.dir);
      b.parentElement.querySelectorAll(".tdir").forEach((d) => { if (d !== b) { setDir(d, false); openSet.delete(d.dataset.dir); } });
    }
  });
}
function fileView(path, f, showDisplay) {
  const code = showDisplay && f.display ? f.display : f.c;
  const status = f.status === "new" ? '<span class="badge s-new">new in this step</span>' : f.status === "changed" ? '<span class="badge s-changed">changed in this step</span>' : "";
  return '<div class="path">' + esc(path) + ' <span class="badge b-' + f.k + '">' + KIND[f.k] + "</span>" + status + "</div>" +
    (f.n ? '<p class="note">' + esc(f.n) + "</p>" : "") + derivedLinks(path) +
    '<pre class="code">' + highlight(code, langOf(path)) + "</pre>";
}
function derivedLinks(path) {
  const m = path.match(/acme\/blueprint\/things\/([^/]+)\/verbs\/([^/.]+)\.ts$/);
  if (!m) return "";
  const [, thing, verb] = m;
  const targets = [
    ["handler", "acme/implementation/handlers/" + thing + "/" + verb + ".ts"],
    ["handler is given", "acme/generated/api/src/" + thing + "/" + verb + ".handler.ts"],
    ["api", "acme/generated/api/src/" + thing + "/" + verb + ".ts"],
    ["sdk", "acme/generated/sdk/src/" + thing + "/" + verb + ".ts"],
    ["cli", "acme/generated/cli/src/" + thing + "/" + verb + ".ts"],
    ["docs", "acme/generated/docs/" + thing + "/" + verb + ".md"],
  ].filter(([, p]) => SNAPSHOTS[current.step - 1]?.has(p));
  if (!targets.length) return "";
  return '<p class="derived">Operation <b>' + thing + "." + verb + "</b> → " + targets.map(([l, p]) => '<a href="#s' + current.step + "-" + fid(p) + '">' + l + "</a>").join(" · ") + "</p>";
}

/* ---------- Explorer with the walkthrough rail ---------- */
let current = { mode: "docs", step: LAST, path: null };
const explorerOpen = new Set(["acme/"]);
const pathById = (id) => {
  for (const snap of SNAPSHOTS) for (const p of snap.keys()) if (fid(p) === id) return p;
  for (const f of FRAMEWORK) if (fid(f.p) === id) return f.p;
  return null;
};
document.getElementById("rail-dots").innerHTML = STEPS.map((s, i) => '<button type="button" data-step="' + (i + 1) + '" title="' + esc(s.t) + '">' + (i + 1) + "</button>").join("");

function renderExplorer(step, path) {
  current.step = step;
  const s = STEPS[step - 1];
  const snap = SNAPSHOTS[step - 1];
  const focus = path || s.focus;
  current.path = focus;
  document.getElementById("rail-count").textContent = "Step " + step + " of " + STEPS.length;
  document.getElementById("rail-title").textContent = s.t;
  document.getElementById("rail-stage").textContent = s.stage || "";
  document.getElementById("rail-say").textContent = s.say;
  const see = document.getElementById("rail-see");
  see.innerHTML = s.see && PAGE_TITLE(s.see) ? 'Explained in <a href="#' + s.see + '">' + esc(PAGE_TITLE(s.see)) + "</a>" : "";
  document.getElementById("rail-cmd").innerHTML = highlight(s.cmd, "bash");
  document.getElementById("rail-out").textContent = s.out;
  document.getElementById("rail-back").disabled = step === 1;
  document.getElementById("rail-next").disabled = step === STEPS.length;
  document.querySelectorAll("#rail-dots button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.step === String(step))));
  const paths = [...snap.keys(), ...FRAMEWORK.map((f) => f.p)];
  const tree = document.getElementById("tree");
  // Open the way to the file in focus and to whatever this step added or changed; the rest stays as you left it.
  ancestors(focus).forEach((d) => explorerOpen.add(d));
  for (const [p, f] of snap) if (f.status === "new" || f.status === "changed") ancestors(p).forEach((d) => explorerOpen.add(d));
  tree.innerHTML = treeHtml(paths, { get: (p) => fileAt(step, p), marks: true, open: explorerOpen });
  tree.querySelectorAll(".tfile").forEach((b) => b.setAttribute("aria-current", String(b.dataset.path === focus)));
  const f = fileAt(step, focus) || fileAt(step, s.focus);
  document.getElementById("pane").innerHTML = fileView(focus, f, true);
}
wireTree(document.getElementById("tree"), (p) => go("s" + current.step + "-" + fid(p)), explorerOpen);

/* ---------- Inline explorers in the docs ---------- */
const PAGE_TITLE = (id) => PAGES.find((p) => p.id === id)?.t;
const MINIS = {
  layout: {
    paths: [
      "acme/architect.config.ts",
      "acme/blueprint/values/money.ts",
      "acme/blueprint/values/chain.ts",
      "acme/blueprint/things/allowance/thing.ts",
      "acme/blueprint/things/allowance/machine.ts",
      "acme/blueprint/things/allowance/events.ts",
      "acme/blueprint/things/allowance/errors.ts",
      "acme/blueprint/things/allowance/roles.ts",
      "acme/blueprint/things/allowance/verbs/spend.ts",
      "acme/blueprint/things/allowance/verbs/get.ts",
      "acme/blueprint/kits/wallets.ts",
      "acme/blueprint/kits/chain.ts",
      "acme/blueprint/journeys/monthly-reset.ts",
      "acme/blueprint/starting-worlds/funded.ts",
      "acme/blueprint/environments/local.ts",
      "acme/blueprint/environments/production.ts",
      "acme/implementation/contracts/AllowanceVault.sol",
      "acme/implementation/handlers/allowance/spend.ts",
      "acme/implementation/services.ts",
      "acme/generated/server/main.ts",
      "acme/generated/contracts/AllowanceMachine.sol",
      "acme/generated/contracts/AllowanceSignatures.sol",
      "acme/generated/api/src/allowance/spend.handler.ts",
      "acme/generated/sdk/src/allowance/spend.ts",
      "acme/generated/cli/src/allowance/spend.ts",
      "acme/generated/cli/src/wallet.ts",
      "acme/generated/mcp/src/server.ts",
      "acme/generated/keeper/src/allowance.expire.ts",
      "acme/generated/docs/allowance/spend.md",
      "acme/generated/infra/src/production.ts",
      "acme/generated/model/changes.json",
    ],
    notes: {
      "acme/blueprint/": "what the system is: scaffolded, then yours",
      "acme/blueprint/values/": "named types, with what each is in every target",
      "acme/blueprint/things/": "one folder per thing",
      "acme/blueprint/things/allowance/verbs/": "one file per operation or read",
      "acme/blueprint/kits/": "the standard library's kits you use",
      "acme/blueprint/journeys/": "the stories that prove it",
      "acme/blueprint/environments/": "one file per environment: clock, chain, destinations",
      "acme/implementation/": "how it does it: scaffolded with blanks, then yours",
      "acme/implementation/contracts/": "your Solidity",
      "acme/generated/": "rewritten every time, never edited",
      "acme/generated/server/": "the server, wiring your handlers to routes",
      "acme/generated/contracts/": "the Solidity target: types, machine, signatures, tests",
      "acme/generated/sdk/": "built on the API",
      "acme/generated/cli/": "built on the SDK",
      "acme/generated/mcp/": "built on the SDK",
      "acme/generated/keeper/": "fires the moves made by time",
      "acme/generated/infra/": "Alchemy, one stack per environment",
    },
    open: "acme/blueprint/things/allowance/verbs/spend.ts",
  },
  spend: {
    paths: [
      "acme/blueprint/things/allowance/verbs/spend.ts",
      "acme/implementation/handlers/allowance/spend.ts",
      "acme/generated/api/src/allowance/spend.handler.ts",
      "acme/generated/api/src/contracts/allowance-vault.ts",
      "acme/generated/contracts/AllowanceSignatures.sol",
      "acme/generated/sdk/src/allowance/spend.ts",
      "acme/generated/cli/src/allowance/spend.ts",
      "acme/generated/mcp/src/server.ts",
      "acme/generated/docs/allowance/spend.md",
    ],
    notes: {
      "acme/blueprint/things/allowance/verbs/spend.ts": "the declaration",
      "acme/implementation/handlers/allowance/spend.ts": "the handler",
      "acme/generated/api/src/allowance/spend.handler.ts": "what the handler is given",
      "acme/generated/api/src/contracts/allowance-vault.ts": "the contract's client",
      "acme/generated/contracts/AllowanceSignatures.sol": "what the grantee signs",
      "acme/generated/sdk/src/allowance/spend.ts": "SDK call",
      "acme/generated/cli/src/allowance/spend.ts": "CLI command",
      "acme/generated/mcp/src/server.ts": "MCP tool",
      "acme/generated/docs/allowance/spend.md": "docs page",
    },
    open: "acme/blueprint/things/allowance/verbs/spend.ts",
  },
};
function mountMinis(root) {
  root.querySelectorAll("[data-mini]").forEach((el) => {
    const spec = MINIS[el.dataset.mini];
    if (!spec) return;
    const get = (p) => fileAt(LAST, p);
    el.innerHTML = '<div class="mini-tree"></div><div class="mini-pane"></div>';
    const tree = el.querySelector(".mini-tree");
    const pane = el.querySelector(".mini-pane");
    const open = new Set(spec.paths.flatMap(ancestors).filter((d) => d.split("/").length <= 3));
    ancestors(spec.open).forEach((d) => open.add(d));
    tree.innerHTML = treeHtml(spec.paths, { get, notes: spec.notes, open });
    const show = (p) => {
      tree.querySelectorAll(".tfile").forEach((b) => b.setAttribute("aria-current", String(b.dataset.path === p)));
      const f = get(p);
      pane.innerHTML = '<div class="path">' + esc(p.replace(/^acme\//, "")) + ' <span class="badge b-' + f.k + '">' + KIND[f.k] + '</span><a class="openx" href="#s' + LAST + "-" + fid(p) + '">Open in Explorer</a></div>' +
        '<pre class="code">' + highlight(f.c, langOf(p)) + "</pre>";
    };
    wireTree(tree, show, open);
    show(spec.open);
  });
}

/* ---------- Docs ---------- */
const nav = document.getElementById("docnav");
{
  let group = "";
  nav.innerHTML = PAGES.map((pg) => {
    const head = pg.group !== group ? "<h4>" + pg.group + "</h4>" : "";
    group = pg.group;
    return head + '<a href="#' + pg.id + '" data-id="' + pg.id + '">' + pg.t + "</a>";
  }).join("");
}
function renderDoc(id) {
  const page = PAGES.find((p) => p.id === id) || PAGES[0];
  const doc = document.getElementById("doc");
  doc.innerHTML = page.h();
  doc.querySelectorAll("pre:not(.code)").forEach((pre) => pre.classList.add("plain"));
  mountMinis(doc);
  mountLifecycles(doc);
  nav.querySelectorAll("a").forEach((a) => a.setAttribute("aria-current", a.dataset.id === page.id ? "page" : "false"));
  current.page = page.id;
}

/* ---------- Routing ---------- */
function setMode(mode) {
  for (const m of ["docs", "explorer"]) {
    document.getElementById(m + "-view").hidden = mode !== m;
    document.getElementById("mode-" + m).setAttribute("aria-pressed", String(mode === m));
  }
  current.mode = mode;
}
let quietNav = false;      // set while the reader itself moves between steps
function go(hash) { if (location.hash.slice(1) === hash) route(); else location.hash = hash; }
function route() {
  const h = location.hash.slice(1);
  const before = { mode: current.mode, page: current.page, step: current.step };
  let m;
  if ((m = h.match(/^s(\d+)(?:-(f-.+))?$/))) {
    setMode("explorer");
    const step = Math.min(Math.max(parseInt(m[1], 10), 1), STEPS.length);
    renderExplorer(step, m[2] ? pathById(m[2]) : null);
  } else if (h.startsWith("f-")) {
    setMode("explorer");
    renderExplorer(LAST, pathById(h));
  } else {
    setMode("docs");
    renderDoc(h || "intro");
  }
  const moved = before.mode !== current.mode || (current.mode === "docs" && before.page !== current.page);
  if (!quietNav) { if (moved || before.step !== current.step) { if (current.mode !== "explorer" || moved) window.scrollTo(0, 0); } Reader.onNavigate(moved); }
  else Reader.show();
  quietNav = false;
}
document.getElementById("mode-docs").addEventListener("click", () => go("intro"));
document.getElementById("mode-explorer").addEventListener("click", () => go("s1"));
document.getElementById("rail-back").addEventListener("click", () => { Reader.stepTo(current.step - 1); });
document.getElementById("rail-next").addEventListener("click", () => { Reader.stepTo(current.step + 1); });
document.getElementById("rail-dots").addEventListener("click", (e) => { const b = e.target.closest("button[data-step]"); if (b) Reader.stepTo(+b.dataset.step); });

/* ---------- Reader: recorded narration ----------
   Every docs page and the walkthrough have a recording, made from this page's own text with an open-source voice.
   AUDIO[key] = { src, lines: [start seconds per line] }. Docs lines are the page's headings, paragraphs and list
   items, in order; the walkthrough has one line per step, and the Explorer follows the voice. A plain <audio>
   element plays it, so it works anywhere a page can play sound, the Claude mobile apps included. */
const Reader = (() => {
  const $ = (id) => document.getElementById(id);
  const play = $("r-play"), back = $("r-back"), fwd = $("r-fwd"), rateSel = $("r-rate"), status = $("r-status");
  const audio = new Audio();
  audio.preload = "none";
  let key = null, lines = [], index = 0, rate = 1;
  try { rate = parseFloat(localStorage.getItem("architect-rate")) || 1; } catch (e) {}
  rateSel.value = String(rate);

  function docEls() {
    const els = [...document.querySelectorAll("#doc h1, #doc h2, #doc h3, #doc > p, #doc li, #doc .callout")];
    return els.filter((el) => !el.closest("pre, .mini, .life, .loops") && el.innerText.trim());
  }
  const rec = () => AUDIO[current.mode === "explorer" ? "walkthrough" : "page-" + current.page];
  function load() {
    const k = current.mode === "explorer" ? "walkthrough" : "page-" + current.page;
    if (k === key) return;
    key = k;
    audio.pause();
    const r = AUDIO[k];
    lines = current.mode === "explorer" ? STEPS.map((s, i) => ({ step: i + 1 })) : docEls().map((el) => ({ el }));
    if (r) { audio.src = r.src; audio.playbackRate = rate; }
    else audio.removeAttribute("src");
    index = current.mode === "explorer" ? current.step - 1 : 0;
  }
  function lineAt(t) {
    const r = rec();
    if (!r) return 0;
    let i = 0;
    while (i + 1 < r.lines.length && r.lines[i + 1] <= t + 0.05) i++;
    return i;
  }
  function mark(el) {
    document.querySelectorAll(".speaking").forEach((e) => e.classList.remove("speaking"));
    if (el) { el.classList.add("speaking"); el.scrollIntoView({ block: "center", behavior: "smooth" }); }
  }
  function show() {
    const r = rec();
    const playing = !audio.paused;
    play.textContent = playing ? "❚❚" : "▶";
    play.setAttribute("aria-label", playing ? "Pause" : "Play");
    [play, back, fwd].forEach((b) => (b.disabled = !r));
    if (!r) { status.textContent = "No recording for this page yet"; return; }
    status.textContent = current.mode === "explorer" ? "Step " + current.step + " of " + STEPS.length : (index + 1) + " / " + r.lines.length;
  }
  function seek(i) {
    const r = rec();
    if (!r) return;
    index = Math.min(Math.max(i, 0), r.lines.length - 1);
    audio.currentTime = r.lines[index];
    follow();
  }
  function follow() {
    if (current.mode === "explorer") {
      const step = index + 1;
      if (step !== current.step) { quietNav = true; location.hash = "s" + step; }
    } else if (!audio.paused || audio.currentTime > 0) mark(lines[index]?.el);
    show();
  }
  audio.addEventListener("timeupdate", () => {
    const i = lineAt(audio.currentTime);
    if (i !== index) { index = i; follow(); }
  });
  audio.addEventListener("play", show);
  audio.addEventListener("pause", show);
  audio.addEventListener("ended", () => { mark(null); show(); });
  audio.addEventListener("error", () => { if (audio.getAttribute("src")) status.textContent = "The recording didn't load"; });

  play.addEventListener("click", () => {
    load();
    if (!rec()) return;
    if (!audio.paused) { audio.pause(); return; }
    audio.playbackRate = rate;
    if (current.mode === "explorer" && lineAt(audio.currentTime) !== current.step - 1) { index = current.step - 1; audio.currentTime = rec().lines[index]; }
    else if (audio.currentTime === 0 && index > 0) audio.currentTime = rec().lines[index];
    audio.play().then(() => { if (current.mode === "docs") mark(lines[index]?.el); show(); }).catch(() => { status.textContent = "Tap play again to listen"; });
  });
  back.addEventListener("click", () => { load(); current.mode === "explorer" ? stepTo(current.step - 1) : seek(lineAt(audio.currentTime) - 1); });
  fwd.addEventListener("click", () => { load(); current.mode === "explorer" ? stepTo(current.step + 1) : seek(lineAt(audio.currentTime) + 1); });
  rateSel.addEventListener("change", () => {
    rate = parseFloat(rateSel.value);
    audio.playbackRate = rate;
    try { localStorage.setItem("architect-rate", String(rate)); } catch (e) {}
  });
  function stepTo(step) {
    if (step < 1 || step > STEPS.length) return;
    quietNav = true;
    go("s" + step);
    load();
    if (rec()) { index = step - 1; audio.currentTime = rec().lines[index]; }
    show();
  }
  return {
    stepTo,
    show,
    onNavigate(moved) {
      if (moved) { audio.pause(); key = null; mark(null); }
      load();
      if (current.mode === "explorer" && audio.paused) index = current.step - 1;
      show();
    },
  };
})();

window.addEventListener("hashchange", route);
route();
