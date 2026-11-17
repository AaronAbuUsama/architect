// DataTable: one table everywhere, with a toolbar (Filter, Sort, Columns, Search) and a row count.
// A page writes `dataTable(spec)` into its HTML; the shell calls `mountTables()` after rendering.
// spec: { id, title, rows, columns: [{ key, label, render(row), sort?(row), hide?, align? }], filters: [{ key, label, of(row) }],
//         search(row) -> text, sort: { key, dir }, empty }
const TABLES = {};
const tstate = {};
function dataTable(spec) {
  TABLES[spec.id] = spec;
  tstate[spec.id] ??= { q: "", sort: spec.sort ?? null, filters: {}, hidden: new Set(spec.columns.filter((c) => c.hide).map((c) => c.key)), open: null };
  return `<div class="dt" data-dt="${spec.id}"></div>`;
}
const icon = { filter: "⚲", sort: "⇅", cols: "▥" };
function drawTable(el) {
  const spec = TABLES[el.dataset.dt], st = tstate[spec.id];
  const cols = spec.columns.filter((c) => !st.hidden.has(c.key));
  let rows = spec.rows.filter((r) => (!st.q || spec.search(r).toLowerCase().includes(st.q.toLowerCase()))
    && Object.entries(st.filters).every(([k, set]) => !set.size || set.has(String(spec.filters.find((f) => f.key === k).of(r)))));
  if (st.sort) { const c = spec.columns.find((x) => x.key === st.sort.key); const v = (r) => (c.sort ? c.sort(r) : String(c.render(r)));
    rows = [...rows].sort((x, y) => (v(x) < v(y) ? -1 : v(x) > v(y) ? 1 : 0) * (st.sort.dir === "asc" ? 1 : -1)); }
  const active = Object.values(st.filters).reduce((n, s) => n + s.size, 0);
  const pop = st.open === "filter" ? `<div class="pop">${spec.filters.map((f) => { const opts = [...new Set(spec.rows.map((r) => String(f.of(r))))].sort();
      return `<div class="pop-group"><b>${esc(f.label)}</b>${opts.map((o) => `<label><input type="checkbox" data-f="${f.key}" value="${esc(o)}"${st.filters[f.key]?.has(o) ? " checked" : ""}> ${esc(o)} <span class="muted">${spec.rows.filter((r) => String(f.of(r)) === o).length}</span></label>`).join("")}</div>`; }).join("")}
      ${active ? `<button class="link" data-clear>Clear filters</button>` : ""}</div>`
    : st.open === "sort" ? `<div class="pop">${spec.columns.filter((c) => c.sort !== false).map((c) => `<label><input type="radio" name="s-${spec.id}" data-s="${c.key}"${st.sort?.key === c.key ? " checked" : ""}> ${esc(c.label)}</label>`).join("")}
      <div class="pop-row"><button class="pill${st.sort?.dir !== "desc" ? " on" : ""}" data-dir="asc">Ascending</button><button class="pill${st.sort?.dir === "desc" ? " on" : ""}" data-dir="desc">Descending</button></div></div>`
    : st.open === "cols" ? `<div class="pop">${spec.columns.map((c, i) => `<label><input type="checkbox" data-c="${c.key}"${st.hidden.has(c.key) ? "" : " checked"}${i === 0 ? " disabled" : ""}> ${esc(c.label)}</label>`).join("")}</div>` : "";
  el.innerHTML = `<div class="dt-head">${spec.title ? `<span class="dt-title">${esc(spec.title)} <span class="count">${rows.length}</span></span>` : ""}
      <button class="tool${st.open === "filter" || active ? " on" : ""}" data-open="filter">${icon.filter} Filter${active ? ` · ${active}` : ""}</button>
      <button class="tool${st.open === "sort" ? " on" : ""}" data-open="sort">${icon.sort} Sort</button>
      <button class="tool${st.open === "cols" ? " on" : ""}" data-open="cols">${icon.cols} Columns</button>
      <span class="spacer"></span><input class="dt-search" placeholder="Search…" value="${esc(st.q)}" aria-label="Search this table">${pop}</div>
    <div class="dt-body"><table><thead><tr>${cols.map((c) => `<th class="${c.align ?? ""}" data-h="${c.key}">${esc(c.label)}${st.sort?.key === c.key ? (st.sort.dir === "asc" ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.align ?? ""}">${c.render(r)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length}" class="muted">${esc(spec.empty ?? "Nothing matches.")}</td></tr>`}</tbody></table></div>`;
  el.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => { st.open = st.open === b.dataset.open ? null : b.dataset.open; drawTable(el); }));
  el.querySelectorAll("[data-f]").forEach((i) => (i.onchange = () => { const s = (st.filters[i.dataset.f] ??= new Set()); i.checked ? s.add(i.value) : s.delete(i.value); drawTable(el); }));
  el.querySelectorAll("[data-s]").forEach((i) => (i.onchange = () => { st.sort = { key: i.dataset.s, dir: st.sort?.dir ?? "asc" }; drawTable(el); }));
  el.querySelectorAll("[data-dir]").forEach((b) => (b.onclick = () => { st.sort = { key: st.sort?.key ?? spec.columns[0].key, dir: b.dataset.dir }; drawTable(el); }));
  el.querySelectorAll("[data-c]").forEach((i) => (i.onchange = () => { i.checked ? st.hidden.delete(i.dataset.c) : st.hidden.add(i.dataset.c); drawTable(el); }));
  el.querySelectorAll("[data-h]").forEach((h) => (h.onclick = () => { const k = h.dataset.h; st.sort = { key: k, dir: st.sort?.key === k && st.sort.dir === "asc" ? "desc" : "asc" }; drawTable(el); }));
  el.querySelector("[data-clear]")?.addEventListener("click", () => { st.filters = {}; drawTable(el); });
  const input = el.querySelector(".dt-search"); input.oninput = () => { st.q = input.value; const pos = input.selectionStart; drawTable(el); const n = el.querySelector(".dt-search"); n.focus(); n.setSelectionRange(pos, pos); };
}
const mountTables = () => document.querySelectorAll(".dt").forEach(drawTable);
