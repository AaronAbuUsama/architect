// Generates the D1 migration SQL from the Better Auth config, with no database at all.
// `auth generate` itself needs a live kysely connection; a Kysely DummyDriver (introspection returns no
// tables) makes getMigrations() emit every CREATE TABLE / CREATE INDEX.
import { writeFileSync } from "node:fs"
import { DummyDriver, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from "kysely"
import { getMigrations } from "better-auth/db/migration"
import { baseOptions } from "../src/auth-options.ts"

const dialect = {
  createAdapter: () => new SqliteAdapter(),
  createDriver: () => new DummyDriver(),
  createIntrospector: (db: any) => new SqliteIntrospector(db),
  createQueryCompiler: () => new SqliteQueryCompiler()
}

const { compileMigrations } = await getMigrations({
  ...baseOptions,
  secret: "x".repeat(32),
  baseURL: "http://localhost:8801",
  database: { dialect, type: "sqlite" }
} as any)
const sql = await compileMigrations()
const out = `-- Generated from src/auth-options.ts by scripts/generate-schema.ts (better-auth 1.7.15 getMigrations). Do not edit.\n${sql}\n`
writeFileSync("migrations/0001_better_auth.sql", out)
console.log(out)
