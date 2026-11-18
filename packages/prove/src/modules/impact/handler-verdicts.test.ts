import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { Journeys } from "#modules/journeys/service.js";
import type { CallRecord } from "#modules/journeys/types.js";
import { proofVerdicts } from "#modules/prove/internal/proof-verdicts.js";
import { handlerHashes, modelHash, scenarioOf } from "#modules/verdicts/internal/proof.js";
import { Impact } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = join(repo, "examples/acme");
const cli = join(repo, "packages/cli/src/main.ts");

it("retains one verdict per operation per journey and stales only the edited handler", { timeout: 120_000 }, async () => {
  const root = mkdtempSync(join(acme, ".handler-proof-"));
  const run = (...args: Array<string>) => execFileSync(process.execPath, [cli, ...args, "--root", root], { encoding: "utf8" });
  try {
    for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true });
    const model = JSON.parse(run("describe", "--json")) as Model;
    const project = await Effect.runPromise(Journeys.load(root, model));
    const handlers = handlerHashes(root, model);
    const judged = Object.keys(model.operations).map((operation) => ({ operation, eval: "coverage" as const, failures: [], notes: [] }));
    // Replay only the operation names. This tests verdict grouping and the CLI's comparison without a Collector.
    const runs = project.journeys.map(({ name }, i) => ({
      name, calls: [...scenarioOf(model, model.journeys[project.journeyFiles![i]!]!).operationNames].map((operation) => ({ operation }) as CallRecord),
      steps: [], stopped: undefined,
    }));
    const traces = new Map();
    const results = proofVerdicts(project, runs, traces, judged, handlers);
    const spend = results.find((r) => r.operation === "allowance.spend")!;
    expect(spend.journeys).toHaveLength(3);
    expect(new Set(spend.journeys?.map((v) => v.journey)).size).toBe(3);
    expect(spend.journeys).toEqual(spend.journeys!.map(({ journey }) => ({
      journey, modelHash: modelHash(model), handlerHash: handlers[spend.operation], verdict: "pass",
    })));
    const replay = runs.map((r) => r.name === "spend twice with one request" ? { ...r, stopped: "setup failed", calls: [] } : r);
    const failed = proofVerdicts(project, replay, traces, judged, handlers).find((r) => r.operation === spend.operation);
    expect(failed?.journeys?.filter((v) => v.verdict === "fail").map((v) => v.journey)).toEqual(["journeys/spend-twice-with-one-request.ts"]);
    await Effect.runPromise(Impact.record(root, model, judged, results));

    expect((await Effect.runPromise(Impact.of(root, model))).stale).toEqual([]);
    const file = join(root, "src/allowance/spend.ts");
    const before = readFileSync(file, "utf8");
    const after = before.replace("remaining: remaining - amount", "remaining: remaining");
    expect(after).not.toBe(before);
    writeFileSync(file, after);
    const impact = run("impact");
    expect(impact.split("\n").filter((line) => line.startsWith("stale "))).toEqual(["stale allowance.spend"]);
    expect(impact).toMatch(/^proven .*allowance\.get.*allowance\.grant.*allowance\.revoke/m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
