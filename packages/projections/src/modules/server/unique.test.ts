// G4 (S-04), the DDL's half: the migration the server projection generates makes a partial unique index for a unique field, so the
// store enforces it at commit (a hand-written index in a host test would prove nothing about what a project actually gets).
// The model is acme's with `unique` set on one thing, in the shape G4 says the model carries: `unique.<field>.while = [states]`.
// Written by the checks author; the builder never edits this file.
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { renderMigration } from "./internal/worker-config.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), join(repo, "examples/acme")], { encoding: "utf8" })) as Model;
const withUnique = (unique: unknown): Model => ({ ...model, things: { ...model.things, allowance: { ...model.things["allowance"]!, unique } as never } });
const sqlOf = (m: Model) => renderMigration(m).content;

describe("G4 control: the migration today", () => {
  it("makes a table for allowance, with its state column, and no unique index when nothing is declared unique", () => {
    const sql = sqlOf(model);
    expect(sql).toMatch(/CREATE TABLE "allowance"/);
    expect(sql).not.toMatch(/UNIQUE INDEX/i);
  });
});

describe("the generated migration enforces a unique field (G4)", () => {
  it("makes a partial unique index on the field, scoped to the states in `while`", () => {
    const sql = sqlOf(withUnique({ member: { while: ["active"] } }));
    expect(sql).toMatch(/CREATE UNIQUE INDEX[^;]*ON\s+"allowance"\s*\(\s*"member"\s*\)\s*WHERE\s+"state"\s+IN\s*\(\s*'active'\s*\)\s*;/i);
  });

  it("scopes to every state listed, and names no state outside them", () => {
    const sql = sqlOf(withUnique({ member: { while: ["active", "exhausted"] } }));
    expect(sql).toMatch(/UNIQUE INDEX[^;]*"member"[^;]*WHERE\s+"state"\s+IN\s*\(\s*'active'\s*,\s*'exhausted'\s*\)/i);
    expect(sql.match(/UNIQUE INDEX[^;]*;/i)?.[0]).not.toMatch(/revoked/);
  });
});
