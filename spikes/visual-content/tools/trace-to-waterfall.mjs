#!/usr/bin/env node
// A recorded trace (Tempo's JSON, or OTLP JSON) to a waterfall scene: spans in tree order, times in ms from the trace's
// start, names and colours by the `trace-waterfall` skill's rules, and the operation span's attributes as chips. It
// writes scenes/<name>.js; you then write the words (`intro`, `outro`, each span's `say`) and check the stills.
//
//   node tools/trace-to-waterfall.mjs <trace.json> <scene-name> [--force]
import { readFile, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [input, name] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const force = process.argv.includes("--force");
if (!input || !name) {
  console.error("usage: node tools/trace-to-waterfall.mjs <trace.json> <scene-name> [--force]");
  process.exit(2);
}

/** Every span object anywhere in the document: Tempo's `batches` and OTLP's `resourceSpans` both nest them. */
function* spansIn(o) {
  if (Array.isArray(o)) for (const v of o) yield* spansIn(v);
  else if (o && typeof o === "object") {
    if ("spanId" in o && "startTimeUnixNano" in o) yield o;
    for (const v of Object.values(o)) yield* spansIn(v);
  }
}

const valueOf = (v) => (v ? Object.values(v)[0] : undefined);
const attrsOf = (s) => Object.fromEntries((s.attributes ?? []).map((a) => [a.key, String(valueOf(a.value))]));
const looksLikeId = (v) => /^[a-z]{2,5}_[a-z0-9]{8,}$/i.test(v);
const tables = (sql) => [...sql.matchAll(/(?:FROM|INTO|UPDATE)\s+"?([\w.]+)"?/gi)].map((m) => m[1]);

/** A span's name in the picture: the route for a request, the statement's shape for a database call. */
const nameOf = (s, a) => {
  if (a["http.request.method"]) return `${a["http.request.method"]} ${a["http.route"] ?? a["url.path"] ?? ""}`.trim();
  if (a["db.system.name"] || a["db.system"]) {
    const sql = a["db.query.text"] ?? a["db.statement"] ?? "";
    if (a["db.operation.name"] === "BATCH" || s.name === "BATCH") return `BATCH · ${[...new Set(tables(sql))].join(" + ")}`;
    const verb = (sql.trim().split(/\s+/)[0] ?? s.name).toUpperCase();
    return `${a["db.system.name"] ?? a["db.system"]} · ${verb} ${[...new Set(tables(sql))].join(", ")}`.trim();
  }
  return s.name;
};

/** Colour by what a span is: the request blue, the framework's spans violet, the commit teal, outcomes amber or red. */
const colorOf = (s, a, name) => {
  if (s.status?.code === "STATUS_CODE_ERROR" || s.status?.code === 2 || a.defect) return "defect";
  if (a.refusal) return "refusal";
  if (a["http.request.method"]) return "accent";
  if (a.operation || a["step.kind"]) return "step";
  if (name.startsWith("BATCH") && name.includes("_journal")) return "journal";
  return "muted";
};

const all = [...spansIn(JSON.parse(await readFile(input, "utf8")))];
if (all.length === 0) throw new Error(`no spans in ${input}`);
const t0 = Math.min(...all.map((s) => Number(BigInt(s.startTimeUnixNano) / 1000n)));
const ms = (ns) => Math.round((Number(BigInt(ns) / 1000n) - t0) / 100) / 10;
const ids = new Set(all.map((s) => s.spanId));
const kids = (parent) => all.filter((s) => (parent ? s.parentSpanId === parent : !s.parentSpanId || !ids.has(s.parentSpanId)))
  .sort((a, b) => ms(a.startTimeUnixNano) - ms(b.startTimeUnixNano));

const rows = [];
const walk = (parent, depth) => {
  for (const s of kids(parent)) {
    const a = attrsOf(s);
    const shown = nameOf(s, a);
    rows.push({ name: shown, depth, start: ms(s.startTimeUnixNano), end: ms(s.endTimeUnixNano), color: colorOf(s, a, shown), a });
    walk(s.spanId, depth + 1);
  }
};
walk(undefined, 0);

const op = rows.find((r) => r.a.operation);
// Chips read as a sentence: what ran, how it moved, what it refused, then what the journal kept.
const rank = (text) => ["operation=", "move.", "refusal=", "event.", "payload."].findIndex((p) => text.startsWith(p));
const items = op
  ? Object.entries(op.a).flatMap(([k, v]) => {
      if (k === "operation" || k.startsWith("move.") || k === "refusal") return [{ text: `${k}=${v}`, color: k === "refusal" ? "refusal" : "step" }];
      if (k.startsWith("event.") || (k.startsWith("payload.") && !looksLikeId(v))) return [{ text: `${k}=${v}`, color: "journal" }];
      return [];
    }).sort((x, y) => rank(x.text) - rank(y.text))
  : [];
const wholeMs = rows.every((r) => Number.isInteger(r.start) && Number.isInteger(r.end));

const q = JSON.stringify;
const out = `// ${op?.a.operation ?? rows[0].name}, built up span by span (the \`trace-waterfall\` skill).
// Data: ${input}, times in ms from the trace's start. Written by tools/trace-to-waterfall.mjs; the words are yours.
import { waterfall } from "/lib/kinds/waterfall.js";

export default waterfall({
  title: "One trace, span by span",
  subtitle: ${q(`${op?.a.operation ?? rows[0].name} · recorded by prove`)},
  unit: "ms",
  intro: ${q(`${op?.a.operation ?? rows[0].name}, one call, as prove recorded it`)},
  outro: "TODO: what the finished picture says, in one line",
  spans: [
${rows.map((r) => `    { name: ${q(r.name)}, depth: ${r.depth}, start: ${r.start}, end: ${r.end}, color: ${q(r.color)}, say: "TODO" },`).join("\n")}
  ],
${op ? `  attrs: {\n    on: ${q(op.name)},\n    items: [\n${items.map((i) => `      { text: ${q(i.text)}, color: ${q(i.color)} },`).join("\n")}\n    ],\n  },\n` : ""}${wholeMs ? `  footnote: "workerd's clock moves only on I/O: times come in whole ms",\n` : ""}});
`;

const file = join(root, "scenes", `${name}.js`);
if (!force && (await access(file).then(() => true, () => false))) throw new Error(`${file} exists; pass --force to replace it`);
await writeFile(file, out);
console.log(`wrote scenes/${name}.js: ${rows.length} spans${rows.length > 6 ? " (more than six: fold the minor ones, see the skill)" : ""}. Now write each TODO.`);
