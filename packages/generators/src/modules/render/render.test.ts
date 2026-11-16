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
    expect(scaffolds).toEqual([
      "implementation/handlers/allowance/grant.ts", "implementation/handlers/allowance/revoke.ts", "implementation/handlers/allowance/spend.ts",
      "implementation/handlers/api-key/create.ts", "implementation/handlers/invitation/accept.ts", "implementation/handlers/invitation/revoke.ts",
      "implementation/handlers/invitation/send.ts", "implementation/handlers/organization/create.ts", "implementation/handlers/person/sign-up.ts",
      "implementation/handlers/session/show.ts", "implementation/handlers/session/sign-in.ts", "implementation/handlers/system/health.ts",
    ]);
    expect(byPath.get(scaffolds[0]!)!.content).toMatch(/^\/\/ Scaffolded from blueprint\/things\/allowance\/verbs\/grant\.ts\. Yours from now on\./);
  });

  it("writes a docs page per thing and operation, each refusal with its exit code, and the model's edges", () => {
    const spend = byPath.get("generated/docs/allowance/spend.md")!.content;
    expect(spend.split("\n")[0]).toBe("<!-- Generated from the blueprint. Do not edit. -->");
    expect(spend).toContain("| AllowanceExceeded | 41 | AL-001 |");
    expect(spend).toContain("| AllowanceNotActive | 40 | AL-900 |");
    expect(spend).toContain("acme allowance spend --allowance <allowance> --amount <amount> --memo <memo>");
    expect(byPath.get("generated/docs/allowance/index.md")!.content).toContain("| spend | active | active, exhausted | AllowanceSpent |");
    const edges = JSON.parse(byPath.get("generated/model/edges.json")!.content) as ReadonlyArray<{ from: string; to: string; kind: string }>;
    expect(edges).toContainEqual({ from: "allowance.organization", to: "organization.id", kind: "refers" });
    expect(edges).toContainEqual({ from: "allowance.spend", to: "allowance.grantee", kind: "allowed-by" });
  });

  it("declares each operation's refusals on its endpoint, with their exit codes", () => {
    expect(byPath.get("generated/api/src/allowance/grant.ts")!.content).toContain("error: [AllowanceLimitTooHigh, NotAllowed]");
    const errors = byPath.get("generated/api/src/errors.ts")!.content;
    expect(errors).toContain("AllowanceLimitTooHigh: 44,");
    expect(errors).toContain("AllowanceNotActive: 40,");
    expect(errors).toContain("NotAllowed: 3,");
  });

  it("gives every refusal its code beside its tag: on its wire class, in the SDK's codes, and in the CLI's line (L2.P)", () => {
    const errors = byPath.get("generated/api/src/errors.ts")!.content;
    expect(errors).toContain('{ code: Schema.Literal("AL-001"), ...structOf(Allowance.AllowanceExceeded.fields).fields }');
    expect(errors).toContain('static readonly code = "AL-001" as const;');
    expect(errors).toContain('AllowanceNotActive: "AL-900",');
    expect(errors).toContain('NotAllowed: "AR-001",');
    // Only a public field of a refusal is ever shown.
    expect(errors).toContain('AllowanceExceeded: ["remaining"],');
    const output = byPath.get("generated/cli/src/output.ts")!.content;
    expect(output).toContain("`${typeof code === \"string\" ? `[${code}] ` : \"\"}${tag}");
    expect(byPath.get("generated/docs/session/sign-in.md")!.content).toContain("| password | Password (secret) |");
  });

  it("is deterministic", () => {
    expect(Render.files({ name: "acme", model })).toEqual(files);
  });
});
