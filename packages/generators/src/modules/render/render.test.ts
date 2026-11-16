import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "@architect/compiler";
import { Render } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [resolve(repo, "packages/compiler/src/main.ts"), resolve(repo, "examples/acme")], { encoding: "utf8" })) as Model;
const files = Render.files({ name: "acme", model });
const byPath = new Map(files.map((f) => [f.path, f]));

describe("render", () => {
  it("writes the four outputs for every operation", () => {
    for (const op of ["allowance/grant", "organization/create"]) {
      for (const p of [`generated/api/src/${op}.ts`, `generated/api/src/${op}.handler.ts`, `generated/sdk/src/${op}.ts`, `generated/cli/src/${op}.ts`]) {
        expect(byPath.has(p), p).toBe(true);
      }
    }
    expect(byPath.has("generated/server/main.ts")).toBe(true);
  });

  it("marks every generated file do-not-edit, and every scaffold with where it came from", () => {
    for (const f of files.filter((f) => !f.scaffold && f.path.endsWith(".ts"))) {
      expect(f.content.split("\n").find((l) => !l.startsWith("#!")), f.path).toMatch(/^\/\/ Generated from .+\. Do not edit\.$/);
    }
    const scaffolds = files.filter((f) => f.scaffold).map((f) => f.path);
    expect(scaffolds).toEqual(["implementation/handlers/allowance/grant.ts", "implementation/handlers/organization/create.ts"]);
    expect(byPath.get(scaffolds[0]!)!.content).toMatch(/^\/\/ Scaffolded from blueprint\/things\/allowance\/verbs\/grant\.ts\. Yours from now on\./);
  });

  it("declares each operation's refusals on its endpoint, with their exit codes", () => {
    expect(byPath.get("generated/api/src/allowance/grant.ts")!.content).toContain("error: [AllowanceLimitTooHigh, NotAllowed]");
    const errors = byPath.get("generated/api/src/errors.ts")!.content;
    expect(errors).toContain("AllowanceLimitTooHigh: 44,");
    expect(errors).toContain("AllowanceNotActive: 40,");
    expect(errors).toContain("NotAllowed: 3,");
  });

  it("is deterministic", () => {
    expect(Render.files({ name: "acme", model })).toEqual(files);
  });
});
