// Spike code. Derives the staging wrangler config from the generated one and writes the sink's.
// usage: node config.mjs <prefix> <d1-id> <sink-url|""> <out-dir>
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [prefix, d1id, sinkUrl, out] = process.argv.slice(2);
const server = resolve(import.meta.dirname, "../../examples/plugged-in/generated/server");
// The generated file is JSONC: whole-line comments only, so drop them and parse.
const text = readFileSync(resolve(server, "wrangler.jsonc"), "utf8").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
const generated = JSON.parse(text);

const main = {
  ...generated,
  name: `${prefix}plugged-in`,
  // Said out loud: run 2's wrangler warned that leaving these unset turns the workers.dev address and Preview URLs on.
  workers_dev: true,
  preview_urls: false,
  main: resolve(server, generated.main),
  d1_databases: generated.d1_databases.map((d) => ({ ...d, database_name: `${prefix}db`, database_id: d1id, migrations_dir: resolve(server, d.migrations_dir) })),
  vars: { ...generated.vars, OTLP_URL: sinkUrl, ORTHO_ENVIRONMENT: "staging", ORTHO_REVISION: process.env.GITHUB_SHA ?? "spike" },
};
writeFileSync(resolve(out, "wrangler.main.json"), JSON.stringify(main, null, 2));

const sink = {
  name: `${prefix}sink`, main: resolve(import.meta.dirname, "sink.js"), compatibility_date: generated.compatibility_date,
  workers_dev: true, preview_urls: false,
  durable_objects: { bindings: [{ name: "SINK", class_name: "Sink" }] },
  migrations: [{ tag: "v1", new_sqlite_classes: ["Sink"] }],
};
writeFileSync(resolve(out, "wrangler.sink.json"), JSON.stringify(sink, null, 2));
