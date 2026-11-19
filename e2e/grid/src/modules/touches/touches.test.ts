// Which rows a journey touches, read from acme's own compiled model (real) and a prove report line.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Grid } from "../grid/service.ts";
import { Touches } from "./service.ts";
import type { TouchModel } from "./types.ts";

const model = JSON.parse(readFileSync(join(import.meta.dirname, "../../../../../examples/acme/generated/model/model.json"), "utf8")) as TouchModel;
const ok = (journey: string, steps = 3) => [`journey ${journey} ✔ ${steps}/${steps} steps`, "allowance.get answer shape ✔"];

describe("a green journey", () => {
  const touched = Touches.of({ model, journey: "revoke then spend", report: ok("revoke then spend") });

  it("touches the operations, things, machine, events, refusals, steps and roles it used", () => {
    expect(touched.green).toBe(true);
    const rows = touched.rows.map((r) => `${r.block}:${r.subject}`);
    expect(rows).toEqual(expect.arrayContaining([
      "journey:revoke then spend",
      "operation:allowance.revoke", "operation:allowance.spend",
      "thing:allowance", "machine:allowance",
      "event:AllowanceRevoked", "event:AllowanceSpent",
      "step:allowance.revoke.update", "step:allowance.spend.load", "step:allowance.spend.record",
      "roles:organization.owner", "roles:allowance.grantee",
    ]));
  });

  it("names a refusal the journey proves, resolving the machine's own and the built-in one", () => {
    const errors = touched.rows.filter((r) => r.block === "error").map((r) => r.subject);
    expect(errors).toEqual(["AllowanceNotActive", "NotAllowed"]);
  });

  it("lists each row once, in a stable order", () => {
    const keys = touched.rows.map((r) => `${r.block}:${r.subject}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual([...keys].sort((a, b) => a.split(":")[0]!.localeCompare(b.split(":")[0]!) || a.localeCompare(b)));
    expect(Touches.of({ model, journey: "revoke then spend", report: ok("revoke then spend") })).toEqual(touched);
  });

  it("touches the declared refusal of a data-dependent step, by its own name", () => {
    const spend = Touches.of({ model, journey: "spend within an allowance", report: ok("spend within an allowance", 4) });
    expect(spend.rows).toContainEqual({ block: "error", subject: "AllowanceExceeded" });
  });
});

describe("a journey that is not green", () => {
  it("touches nothing, and says why", () => {
    const red = Touches.of({ model, journey: "revoke then spend", report: ["journey revoke then spend ✘ 1/3 steps"] });
    expect(red).toMatchObject({ green: false, rows: [] });
    expect(red.problems[0]).toMatch(/touches nothing until every step is green/);
    expect(Touches.of({ model, journey: "revoke then spend", report: [] }).green).toBe(false);
  });
  it("is not found when the model has no such journey", () => {
    expect(Touches.of({ model, journey: "no such journey", report: ok("no such journey") }).problems).toEqual(['the model has no journey named "no such journey"']);
  });
});

describe("switching on", () => {
  it("switches on every touched block in all nine outputs, whether or not an eval exists, with the journey that touched it", () => {
    const touched = Touches.of({ model, journey: "revoke then spend", report: ok("revoke then spend") });
    const entries = Touches.entries(touched, "revoke then spend");
    const cells = entries.map((e) => e.cell);
    for (const block of ["operation", "thing", "machine", "event", "roles", "error", "step", "journey"]) {
      for (const output of ["model", "api", "server", "sdk", "cli", "mcp", "docs", "portal", "telemetry"]) expect(cells, `${block}.${output}`).toContain(`${block}.${output}`);
    }
    expect(entries.find((e) => e.cell === "error.cli")).toEqual({ cell: "error.cli", subjects: ["AllowanceNotActive", "NotAllowed"], switchedBy: "revoke then spend" });
    expect(entries.find((e) => e.cell === "event.docs")?.subjects).toEqual(["AllowanceRevoked", "AllowanceSpent"]);
    expect(Grid.switchOn({ cells: [] }, entries).cells).toHaveLength(entries.length);
  });
});
