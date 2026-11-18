// The app's frame: the one page tree on the left, the environment scope on top, the agent chat on the right.
const node = (ic, label, { on, ind = 0, n, liveDot, bad } = {}) =>
  `<div class="node${on ? " on" : ""}${ind ? ` ind${ind > 1 ? 2 : ""}` : ""}"><span class="ic">${ic}</span>${label}${n !== undefined ? `<span class="n${bad ? " bad" : ""}">${n}</span>` : ""}${liveDot ? '<span class="live"></span>' : ""}</div>`;

/** The tree is derived from the model, plus the pages and conversations people and agents made. */
const tree = (on) => {
  const things = Object.keys(M.things);
  const open = "allowance";
  const refusedOf = (t) => opsOf(t).reduce((s, o) => s + Object.values(A.ops[o.name]?.refused ?? {}).reduce((a, b) => a + b, 0), 0);
  return `<div class="brand"><span class="dot">a</span>acme <small>· forman app</small></div><div class="search">Search pages, operations, traces…  ⌘K</div>
    ${node("◉", "Live", { on: on === "live", liveDot: true })}${node("▣", "Environments", { on: on === "envs", n: 4 })}
    <div class="group">The system · derived</div>
    ${things.map((t) => t === open
      ? node("▾", t, { on: on === "thing" }) + opsOf(t).map((o) => node(o.kind === "read" ? "○" : "●", o.verb, { ind: 1, on: on === o.name, n: A.ops[o.name]?.calls || undefined })).join("")
        + node("◇", "machine", { ind: 1, on: on === "machine" }) + node("✦", "events", { ind: 1, n: 3 }) + node("!", "errors", { ind: 1, n: refusedOf(t), bad: true }) + node("⚑", "role: grantee", { ind: 1 })
      : node("▸", t, { n: opsOf(t).length })).join("")}
    ${node("⚑", "Roles", { n: 4 })}${node("⇢", "Journeys", { n: 11 })}
    <div class="group">Pages · written</div>
    ${node("✎", "How allowances should feel", { on: on === "note" })}${node("✎", "Research: monthly reset")}${node("✎", "Plan: spend from an API key")}${node("+", '<span class="muted">New page</span>')}
    <div class="group">Conversations</div>
    ${node("💬", "Why did spend refuse ada?", { on: on === "convo" })}${node("💬", "Is spend near its budget?")}`;
};

const topbar = (crumbs, { env = "local" } = {}) =>
  `<div class="top"><span class="crumbs">${crumbs}</span><span class="sp"></span>
   <span class="pill"><span class="g"></span>${env} · forman dev · 127.0.0.1:8787</span><span class="pill">last ${A.source.minutes} min ▾</span><span class="pill">acting as <b>olga</b> ▾</span><span class="pill dark">Ask agent ⌘I</span></div>`;

const chat = (ctx, msgs) =>
  `<aside class="chat"><div class="hd">Agent <span class="chip a">sees this screen</span></div><div class="ctx">${ctx}</div><div class="msgs">${msgs}</div><div class="in">Ask about this page, a trace, or the system…</div></aside>`;

const frame = (on, crumbs, page, chatHtml) =>
  `<div class="app${chatHtml ? "" : " nochat"}"><nav class="side">${tree(on)}</nav><main class="main">${topbar(crumbs)}${page}</main>${chatHtml ?? ""}</div>`;
