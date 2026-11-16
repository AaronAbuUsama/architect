// The Worker's configuration and its database, both from the model.
import type { Model } from "@architect/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, lines } from "./names.ts";

/** The compatibility date every Worker and test uses: the test pool's workerd accepts dates up to 2026-08-22. */
export const COMPATIBILITY_DATE = "2026-08-01";

export const renderWrangler = (name: string): RenderedFile => ({
  path: "generated/server/wrangler.jsonc",
  scaffold: false,
  content: lines(
    GENERATED,
    "// Local only: the database id is a placeholder until a deploy names a real one (stage two).",
    "{",
    `  "name": "${name}",`,
    `  "main": "main.ts",`,
    `  "compatibility_date": "${COMPATIBILITY_DATE}",`,
    `  "compatibility_flags": ["nodejs_compat"],`,
    `  "d1_databases": [`,
    `    { "binding": "DB", "database_name": "${name}", "database_id": "00000000-0000-0000-0000-000000000000", "migrations_dir": "migrations" }`,
    "  ],",
    `  "durable_objects": { "bindings": [{ "name": "WORLD", "class_name": "World" }] },`,
    `  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["World"] }]`,
    "}",
  ),
});

/** One table per thing: a text column per field (each field's wire form), `state` when it has a machine. */
export const renderMigration = (model: Model): RenderedFile => ({
  path: "generated/server/migrations/0001_things.sql",
  scaffold: false,
  content: lines(
    "-- Generated from the blueprint. Do not edit.",
    "-- Stage one rebuilds the local database on every `architect dev`; migrations between versions arrive in stage three.",
    Object.values(model.things).map((t) => {
      const columns = Object.keys(t.fields).map((f) => (f === "id" ? `  "id" TEXT PRIMARY KEY` : `  "${f}" TEXT NOT NULL`));
      if (t.machine) columns.push(`  "state" TEXT NOT NULL`);
      return `CREATE TABLE "${t.name}" (\n${columns.join(",\n")}\n);`;
    }),
  ),
});
