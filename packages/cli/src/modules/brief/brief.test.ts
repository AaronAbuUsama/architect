import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Brief } from "./service.ts";

const main = resolve(import.meta.dirname, "../../main.ts");
const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const architect = (...args: ReadonlyArray<string>) => spawnSync("node", [main, ...args, "--root", acme], { encoding: "utf8" });

describe("architect brief", () => {
  it("names the declaration to read, the files not to touch and the evals that must pass", { timeout: 60_000 }, () => {
    const run = architect("brief", "allowance.spend");
    expect(run.status).toBe(0);
    const out = run.stdout;
    expect(out).toContain("Write   implementation/handlers/allowance/spend.ts, and nothing else.");
    expect(out).toContain("  blueprint/things/allowance/verbs/spend.ts  the declaration");
    expect(out).toContain("  blueprint/journeys/**");
    expect(out).toContain("allowance.spend's 9 evals: answer shape, declared errors, machine path, events, who may call, steps, performance, coverage, explainability");
    expect(out).toContain("journeys/spend-within-allowance.ts");
    expect(out).toContain("refuse with AllowanceExceeded (exit 41)");
    expect(out).toContain("never refuse AllowanceNotActive or NotAllowed yourself");
    expect(Brief.forbidden).toContain("blueprint/journeys/**");
  });

  it("refuses a read or an unknown name, listing the operations that have handlers", { timeout: 60_000 }, () => {
    const run = architect("brief", "allowance.get");
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("allowance.get is not an operation with a handler: allowance.grant, allowance.revoke, allowance.spend, organization.create");
  });
});
