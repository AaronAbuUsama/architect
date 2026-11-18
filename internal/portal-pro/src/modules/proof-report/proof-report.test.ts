import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { decodeProofReport } from "./service.ts";

test("the recorded Acme report supplies operation evals and keeps project coverage at project scope", () => {
  const report = readFileSync(new URL("../../../../../design/evidence/L2.P/04-local-prove.txt", import.meta.url), "utf8");
  const proof = decodeProofReport({
    lines: report.split(/^prove [✔✘].*$/mu, 1)[0]!.split("\n"), passed: true, beganAt: "2026-11-16T00:00:00Z", endedAt: "2026-11-16T00:00:01Z",
  }, ["allowance.spend"]);
  const checks = proof.checks["allowance.spend"]!;
  assert.equal(checks.length, 9);
  assert.ok(checks.every((check) => check.passed));
  assert.deepEqual(checks.find((check) => check.name === "performance")?.timing, { p50Ms: 0, p95Ms: 3 });
  assert.equal(proof.journeys.length, 11);
  assert.ok(proof.coverage.some(({ name, reached, total }) => name === "moves" && reached === total));
});
