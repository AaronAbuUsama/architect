import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { Clock, Effect } from "effect";
import { Compiler, nodeSource } from "@compiler/index.ts";
import { Prove } from "@prove/modules/prove/service.ts";
import { FileSource } from "@prove/modules/telemetry/service.ts";
import { Wire } from "@portal/modules/wire/service.ts";
import { decodeProofReport } from "./modules/proof-report/service.ts";
import type { Capture } from "./modules/operations/types.ts";
import { projectActivity } from "./modules/site/service.tsx";

const [projectRoot] = process.argv.slice(2);
if (!projectRoot) {
  console.error("Usage: npm run capture -- <project root>");
  process.exit(1);
}

const localRun = (root: string) => Effect.gen(function* () {
  const scratch = yield* Effect.acquireRelease(
    Effect.sync(() => mkdtempSync(join(root, ".portal-proof."))),
    (folder) => Effect.sync(() => rmSync(folder, { force: true, recursive: true, maxRetries: 4 })),
  );
  for (const part of ["blueprint", "generated", "src", "journeys", "package.json"]) {
    if (existsSync(join(root, part))) cpSync(join(root, part), join(scratch, part), {
      recursive: true, filter: (path) => !basename(path).startsWith(".") && basename(path) !== "node_modules",
    });
  }
  const beganAt = new Date(yield* Clock.currentTimeMillis).toISOString();
  const report = yield* Effect.scoped(Prove.run({ root: scratch, port: 45732 }));
  const endedAt = new Date(yield* Clock.currentTimeMillis).toISOString();
  return { root: scratch, report: { ...report, beganAt, endedAt } };
});

const captureReport = Effect.gen(function* () {
  const root = resolve(projectRoot);
  const input = JSON.parse(readFileSync(join(root, "generated/portal/blueprint.json"), "utf8"));
  const blueprint = yield* Wire.decode(input);
  const compiled = yield* Compiler.model.pipe(Effect.provide(nodeSource(root)));
  if (Wire.digestOf(compiled) !== Wire.digestOf(input.model)) {
    return yield* Effect.fail("The generated portal blueprint is out of date. Generate the project before capturing proof.");
  }
  const captured = yield* localRun(root);
  const proof = decodeProofReport(captured.report, Object.keys(blueprint.model.operations));
  const end = Date.parse(proof.endedAt);
  if (!Number.isFinite(end)) return yield* Effect.fail("The local proof report needs an end timestamp.");
  const start = end - 3_600_000;
  const source = join(captured.root, ".architect/prove-telemetry");
  if (!existsSync(join(source, "traces.jsonl"))) return yield* Effect.fail("No collector capture for this local run.");
  const traces = yield* FileSource.open(source).window(end - start, end);
  const activity = projectActivity(blueprint, traces, start, end);
  const implementation = Object.fromEntries(Object.values(blueprint.model.operations).map((op) => {
    if (op.kind === "read") return [op.name, "Generated read"];
    const handler = join(captured.root, "src", op.thing, `${op.verb}.ts`);
    if (!existsSync(handler)) return [op.name, "Ready to scaffold"];
    return [op.name, readFileSync(handler, "utf8").includes("Handlers.blank(") ? "Scaffolded" : "Handler present"];
  }));
  const capture: Capture = {
    blueprintDigest: blueprint.digest, environment: "local", start, end,
    calls: Object.fromEntries(activity.calls), implementation, proof,
  };
  mkdirSync("public", { recursive: true });
  writeFileSync(resolve("public/capture.json"), JSON.stringify(capture));
  console.info(`Captured ${traces.size} traces, ${proof.journeys.length} journeys and ${Object.values(proof.checks).flat().length} eval results.`);
});

await Effect.runPromise(Effect.scoped(captureReport));
