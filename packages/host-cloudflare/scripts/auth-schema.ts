// Writes src/modules/auth/internal/schema.ts: Better Auth's tables for `options`, compiled with no database at all.
// `auth generate` needs a live connection; a Kysely DummyDriver makes getMigrations() emit every statement instead.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { DummyDriver, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler, type Kysely } from "kysely";
import { getMigrations } from "better-auth/db/migration";
import { optionsFor } from "../src/modules/auth/internal/options.ts";

export const compile = async (): Promise<ReadonlyArray<string>> => {
  const dialect = {
    createAdapter: () => new SqliteAdapter(),
    createDriver: () => new DummyDriver(),
    createIntrospector: (db: Kysely<unknown>) => new SqliteIntrospector(db),
    createQueryCompiler: () => new SqliteQueryCompiler(),
  };
  const { compileMigrations } = await getMigrations({ ...optionsFor("cli"), secret: "x".repeat(32), baseURL: "http://architect.local", database: { dialect, type: "sqlite" } } as never);
  const sql = (await compileMigrations()).replace(/create table "/g, 'create table if not exists "').replace(/create (unique )?index "/g, 'create $1index if not exists "');
  return sql.split(/;\s*/).map((s) => s.trim()).filter(Boolean);
};

export const render = (statements: ReadonlyArray<string>) =>
  `// Generated from internal/options.ts by scripts/auth-schema.ts. Do not edit.\n/** Better Auth's tables, each statement safe to run again. */\nexport const SCHEMA: ReadonlyArray<string> = ${JSON.stringify(statements, null, 2)};\n`;

if (import.meta.main) writeFileSync(join(import.meta.dirname, "../src/modules/auth/internal/schema.ts"), render(await compile() as never));
