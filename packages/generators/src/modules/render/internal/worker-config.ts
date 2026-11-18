// The Worker's configuration and its database, both from the model.
import type { Model } from "@orthograph/compiler";
import type { RenderedFile } from "../types.ts";
import { GENERATED, lines } from "./names.ts";

/** The compatibility date every Worker and test uses: the test pool's workerd accepts dates up to 2026-08-22. */
export const COMPATIBILITY_DATE = "2026-08-01";

export const renderWrangler = (name: string, entities: boolean): RenderedFile => ({
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
    entities
      ? `  "durable_objects": { "bindings": [{ "name": "WORLD", "class_name": "World" }, { "name": "ENTITIES", "class_name": "Entity" }] },`
      : `  "durable_objects": { "bindings": [{ "name": "WORLD", "class_name": "World" }] },`,
    entities
      ? `  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["World", "Entity"] }],`
      : `  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["World"] }],`,
    "  // Where telemetry goes. `ortho prove` and `ortho dev --otlp` set it; unset, nothing is exported.",
    `  "vars": { "OTLP_URL": "" }`,
    "}",
  ),
});

const JOURNAL = `CREATE TABLE "_journal" (
  "seq" INTEGER PRIMARY KEY AUTOINCREMENT,
  "trace" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "move" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "fields" TEXT NOT NULL
);
CREATE INDEX "_journal_trace" ON "_journal" ("trace");
-- Each idempotent call's answer, under its operation, caller and request key, committed with the call itself.
CREATE TABLE "_requests" (
  "key" TEXT PRIMARY KEY,
  "answer" TEXT NOT NULL
);`;

/**
 * One table per thing that lives in the database: a text column per field (each field's wire form), `state` when it
 * has a machine, and the `version` every update is guarded by (D2 #36). Entitys keep their own rows.
 */
export const renderMigration = (model: Model): RenderedFile => ({
  path: "generated/server/migrations/0001_things.sql",
  scaffold: false,
  content: lines(
    "-- Generated from the blueprint. Do not edit.",
    "-- Stage one rebuilds the local database on every `ortho dev`; migrations between versions arrive in stage three.",
    Object.values(model.things).filter((t) => t.lives === "database").map((t) => {
      const columns = Object.keys(t.fields).map((f) => (f === "id" ? `  "id" TEXT PRIMARY KEY` : `  "${f}" TEXT NOT NULL`));
      // Empty until the thing's first move sets it.
      if (t.machine) columns.push(`  "state" TEXT`);
      columns.push(`  "version" INTEGER NOT NULL DEFAULT 0`);
      return `CREATE TABLE "${t.name}" (\n${columns.join(",\n")}\n);`;
    }),
    "-- Every event a move emitted, with the trace of the call that made it (language-effect's Journal).",
    JOURNAL,
  ),
});
