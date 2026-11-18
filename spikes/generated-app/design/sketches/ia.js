// The two other IA options, drawn at the same moment as option A's operation page: someone looking at spend.
const sideB = (tab) => `<div class="brand"><span class="dot">a</span>acme <small>· forman app</small></div>
  <div style="display:flex;gap:4px;margin:0 6px 12px"><span class="pill${tab === "pages" ? " dark" : ""}">Pages</span><span class="pill${tab === "analytics" ? " dark" : ""}">Analytics</span><span class="pill">Chat</span></div>
  ${tab === "pages"
    ? `<div class="group">Docs · generated</div>${Object.keys(M.things).map((t) => node(t === "allowance" ? "▾" : "▸", t)).slice(0, 1).join("")}${opsOf("allowance").map((o) => node("●", o.verb, { ind: 1, on: o.verb === "spend" })).join("")}${Object.keys(M.things).slice(1).map((t) => node("▸", t)).join("")}<div class="group">Notes · written</div>${node("✎", "How allowances should feel")}${node("✎", "Research: monthly reset")}`
    : `<div class="group">Dashboards</div>${node("▦", "Overview")}${node("▦", "Refusals")}${node("▦", "Budgets", { on: true })}${node("▦", "Events")}<div class="group">Explore</div>${node("⌕", "Traces")}${node("⌕", "Logs")}${node("▣", "Environments")}`}`;

const iaB = () => `<div class="app nochat" style="grid-template-columns:248px 1fr 1fr"><nav class="side">${sideB("pages")}</nav>
  <main class="main" style="border-right:1px solid var(--line)"><div class="top"><span class="crumbs">Pages / allowance / <b>spend</b></span></div><div class="doc" style="padding:20px 26px">
    <h1>allowance.spend</h1><p class="lede">${M.operations["allowance.spend"].description}</p>
    ${derived("Payload", "spend.ts:10", fieldsTable(M.operations["allowance.spend"].payload))}
    ${derived("Refusals", "spend.ts:13-14", `<table>${refusalRows(M.operations["allowance.spend"]).replace(/<td class="num"><b>\d+<\/b><\/td>|<td class="num">0<\/td><\/tr>/g, "</tr>")}</table>`)}
    <div class="caption">No live numbers on this side. "See it live →" opens the Analytics half.</div></div></main>
  <main class="main"><div class="top"><span class="crumbs">Analytics / Budgets / <b>allowance.spend</b></span></div><div class="doc" style="padding:20px 26px">
    <h1 style="font-size:22px">spend · dashboard</h1>${kpis("allowance.spend")}${live("Calls", callsChart("allowance.spend", 90))}${live("Trace", waterfall(A.samples.exceeded, "allowance.spend"))}
    <div class="caption">A second home for spend, in another template's shape. "Read the docs →" goes back.</div></div></main></div>`;

const sideC = () => `<div class="brand"><span class="dot">a</span>acme <small>· forman app</small></div><div class="search">Search…</div>
  ${node("◉", "Live", { on: true, liveDot: true })}${node("!", "Refusals", { n: 275, bad: true })}${node("✕", "Defects", { n: 0 })}${node("⏱", "Budgets")}${node("✦", "Events", { n: 1158 })}${node("▣", "Environments")}
  <div class="group">Reference</div>${node("▸", "Operations", { n: 15 })}${node("▸", "Things", { n: 8 })}${node("▸", "Machines")}<div class="group">Notes</div>${node("✎", "How allowances should feel")}`;

const iaC = () => `<div class="app"><nav class="side">${sideC()}</nav><main class="main">${topbar("Live / operations / <b>allowance.spend</b>")}<div class="doc wide">
  <h1 style="font-size:22px">allowance.spend <span class="chip ok" style="vertical-align:4px">live</span></h1>${kpis("allowance.spend")}
  <div class="grid2">${live("Calls", callsChart("allowance.spend", 100))}${live("Trace · exceeded", waterfall(A.samples.exceeded, "allowance.spend"))}</div>
  ${live("Recent calls", recentTable("allowance.spend", 6))}
  <div class="blk" style="border-style:dashed"><div class="hd"><span class="t">Reference ▸</span><span class="src">collapsed: payload, answer, machine, refusals, notes</span></div></div>
  <div class="caption">The docs are a drawer under the numbers. Notes and written pages live in a corner of the tree.</div></div></main>
  ${chat("screen: <code>live/allowance.spend</code>", `<div class="msg u">is spend ok?</div><div class="msg a">Yes. ${A.ops["allowance.spend"].calls} calls, p95 ${A.ops["allowance.spend"].p95} ms of ${A.ops["allowance.spend"].budget}, no defects.</div>`)}</div>`;
