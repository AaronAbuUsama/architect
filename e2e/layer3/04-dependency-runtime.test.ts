// D4 adapter semantics, through the generated public Pricing service and an actual HTTP hold/release server.
import { spawn } from "node:child_process";
import { createServer, type ServerResponse } from "node:http";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect } from "effect";
import { Prove, Worlds } from "@architect/prove";
import { describe, expect, it } from "vitest";
import { addDependency, dependencyConsumer, fillMapper, prepareDependency } from "./dependencies.ts";
import { fixtures, installFixture } from "./packages.ts";
import { PORTS, project, repo, succeeds } from "./support.ts";

const json = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(value));
};
const withHttp = async (use: (origin: string) => Promise<void>) => {
  const held = new Set<ServerResponse>();
  const waiters = new Set<ServerResponse>();
  const release = () => { for (const response of held) if (!response.destroyed && !response.writableEnded) json(response, 200, { value: "released" }); held.clear(); };
  const server = createServer((request, response) => {
    if (request.url === "/hold") { held.add(response); for (const waiter of waiters) json(waiter, 200, { held: 1 }); waiters.clear(); return; }
    if (request.url === "/wait-held") { if (held.size) json(response, 200, { held: held.size }); else waiters.add(response); return; }
    if (request.url === "/release") { release(); json(response, 200, { released: true }); return; }
    if (request.url === "/state") return json(response, 200, { held: held.size });
    if (request.url === "/reject") return json(response, 503, { marker: "foreign-private-canary" });
    json(response, 200, { value: "ok" });
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(PORTS.hold, "127.0.0.1", resolve); });
  try { await use(`http://127.0.0.1:${PORTS.hold}`); }
  finally { release(); for (const waiter of waiters) waiter.destroy(); await new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }); }
};
const entry = (root: string, name: string) => {
  const directory = join(root, ".architect/dependency-proof");
  mkdirSync(directory, { recursive: true });
  cpSync(join(fixtures, "dependency-cases", name), join(directory, name));
  return join(directory, name);
};
const execute = (root: string, name: string, origin: string) => new Promise<string>((resolve, reject) => {
  const child = spawn(process.execPath, [entry(root, name), origin], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk: Buffer) => { output += chunk.toString(); });
  const deadline = setTimeout(() => child.kill("SIGKILL"), 120_000);
  child.once("error", (error) => { clearTimeout(deadline); reject(error); });
  child.once("close", (code) => { clearTimeout(deadline); if (code === 0) resolve(output); else reject(new Error(`dependency proof exited ${code}: ${output}`)); });
});
const data = <T>(output: string) => JSON.parse(output.trim().split("\n").find((line) => line.startsWith("DEPENDENCY_RESULT "))!.slice("DEPENDENCY_RESULT ".length)) as T;
const ready = (kind = "remote", mode?: "effect", mapper: "normal" | "defect" | "unselected" | "typed-effect" = "normal") => {
  const copy = project();
  try {
    prepareDependency(copy.root, kind); addDependency(copy.root, kind, mode); fillMapper(copy.root, mapper);
    if (kind === "remote") dependencyConsumer(copy.root);
    else cpSync(join(fixtures, "project/dependency-health.ts"), join(copy.root, "blueprint/things/system/verbs/health.ts"));
    succeeds(copy.root, "generate"); return copy;
  } catch (error) { copy.remove(); throw error; }
};

describe("L3.01: real dependency call boundaries", () => {
  it("the independent missing-mask implementation is rejected while its real HTTP request is still held", async () => {
    const copy = project();
    try {
      entry(copy.root, "missing-mask.ts");
      await withHttp(async (origin) => {
        const output = await execute(copy.root, "missing-mask-main.ts", origin);
        expect(data<{ missingMaskRejected: boolean }>(output)).toEqual({ missingMaskRejected: true });
      });
    } finally { copy.remove(); }
  });

  it("the Node-capable fixture really executes its native SDK, rather than exposing only a phantom Node type", async () => {
    const copy = project();
    try {
      const installed = installFixture(copy.root, "node-remote");
      const library = await import(pathToFileURL(join(installed.installed, "dist/index.js")).href) as { quote: () => Promise<{value:string}>; close: () => void };
      try { expect(await library.quote()).toEqual({ value: "node-capable" }); } finally { library.close(); }
    } finally { copy.remove(); }
  });

  it("the same unsupported native initializer fails explicitly in a real Worker, not through an added platform shim", async () => {
    const copy = ready("node-remote");
    try {
      const result = await Effect.runPromiseExit(Effect.scoped(Worlds.start({ root: copy.root, port: 19177, name: "unsupported-node-sdk" })));
      expect(result._tag).toBe("Failure");
      expect(String(result)).toMatch(/node:sqlite|Illegal constructor|unsupported/i);
    } finally { copy.remove(); }
  });

  it("the real HTTP caller retains nine evals, the dependency step/refusal log, and no default foreign payload log", async () => {
    const copy = ready();
    try { await withHttp(async () => {
      cpSync(join(fixtures, "journeys/dependency.ts"), join(copy.root, "journeys/dependency.ts"));
      const report = await Effect.runPromise(Effect.scoped(Prove.run({ root: copy.root, port: PORTS.dependency })));
      expect(report.passed, report.lines.join("\n")).toBe(true);
      expect(report.lines.some((line) => line.startsWith("probe.quote 9 evals ✔"))).toBe(true);
      const telemetry = ["traces.jsonl", "logs.jsonl"].map((file) => readFileSync(join(copy.root, ".architect/prove-telemetry", file), "utf8")).join("\n");
      expect(telemetry).toContain("dependency:pricing.quote");
      type Span = { name: string; traceId: string; spanId: string; attributes?: Array<{ key: string; value: { stringValue?: string } }> };
      type Log = { traceId: string; spanId: string; body?: { stringValue?: string } };
      type Export = { resourceSpans?: Array<{ scopeSpans?: Array<{ spans?: Array<Span> }> }>; resourceLogs?: Array<{ scopeLogs?: Array<{ logRecords?: Array<Log> }> }> };
      const spans = readFileSync(join(copy.root, ".architect/prove-telemetry/traces.jsonl"), "utf8").split("\n").filter((line) => line.trim()).flatMap((line) =>
        ((JSON.parse(line) as Export).resourceSpans ?? []).flatMap((resource) => (resource.scopeSpans ?? []).flatMap((scope) => scope.spans ?? [])));
      const dependencySpans = spans.filter((span) => span.name === "dependency:pricing.quote");
      expect(dependencySpans.length).toBeGreaterThan(0);
      expect(dependencySpans.every((span) => span.attributes?.some((attribute) => attribute.key === "step.kind" && attribute.value.stringValue === "network"))).toBe(true);
      const refused = new Set(spans.filter((span) => span.name === "probe.quote" && span.attributes?.some((attribute) =>
        attribute.key === "refusal" && attribute.value.stringValue === "PriceUnavailable")).map((span) => span.traceId));
      expect(refused.size).toBeGreaterThanOrEqual(2);
      const logs = readFileSync(join(copy.root, ".architect/prove-telemetry/logs.jsonl"), "utf8").split("\n").filter((line) => line.trim()).flatMap((line) =>
        ((JSON.parse(line) as Export).resourceLogs ?? []).flatMap((resource) => (resource.scopeLogs ?? []).flatMap((scope) => scope.logRecords ?? [])));
      for (const traceId of refused) {
        const children = dependencySpans.filter((candidate) => candidate.traceId === traceId);
        expect(children.length).toBeGreaterThan(0);
        for (const span of children) expect(logs.some((log) => log.traceId === span.traceId && log.spanId === span.spanId && Boolean(log.body?.stringValue))).toBe(true);
      }
      expect(telemetry.includes("foreign-private-canary")).toBe(false);
    }); } finally { copy.remove(); }
  });

  it("Promise success reply and mapped rejection/throw stay intact; interruption cannot release counted work before actual settlement", async () => {
    const copy = ready();
    try { await withHttp(async (origin) => {
      const typeEntry = entry(copy.root, "promise-types.ts");
      const config = join(copy.root, ".architect/dependency-proof/tsconfig.json");
      writeFileSync(config, JSON.stringify({ extends: join(copy.root, "tsconfig.json"), include: [typeEntry] }));
      const { spawnSync } = await import("node:child_process");
      const typed = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", config], { cwd: copy.root, encoding: "utf8", timeout: 180_000 });
      expect(typed.status, typed.stdout + typed.stderr).toBe(0);
      const output = await execute(copy.root, "promise-main.ts", origin);
      expect(output.includes("foreign-private-canary")).toBe(false);
      const result = data<{ answers: Array<{ mode: string; success: boolean; value?: { value: string }; selected: boolean; defect: boolean }>; protectedWhileHeld: boolean; interrupted: boolean; finalCount: number }>(output);
      expect(result.answers).toEqual([{ mode: "ok", success: true, value: { value: "ok" }, selected: false, defect: false },
        { mode: "reject", success: false, selected: true, defect: false }, { mode: "throw", success: false, selected: true, defect: false }]);
      expect(result.protectedWhileHeld).toBe(true); expect(result.interrupted).toBe(true); expect(result.finalCount).toBe(0);
    }); } finally { copy.remove(); }
  });

  it("Effect mode preserves required services and only maps typed failure, never defects or interruption", async () => {
    const copy = ready("effect-remote", "effect", "typed-effect");
    try {
      const proof = entry(copy.root, "effect-types.ts");
      const config = join(copy.root, ".architect/dependency-proof/tsconfig.json");
      writeFileSync(config, JSON.stringify({ extends: join(copy.root, "tsconfig.json"), include: [proof] }));
      // Typecheck the actual imported public service; an erased requirement makes @ts-expect-error fail.
      const { spawnSync } = await import("node:child_process");
      const typed = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", config], { cwd: copy.root, encoding: "utf8", timeout: 180_000 });
      expect(typed.status, typed.stdout + typed.stderr).toBe(0);
      const output = await execute(copy.root, "effect-main.ts", "unused");
      expect(output.includes("foreign-private-canary")).toBe(false);
      expect(data(output)).toEqual([{ mode: "ok", value: { value: "configured-setting" }, selected: false, defect: false, interrupted: false },
        { mode: "fail", selected: true, defect: false, interrupted: false }, { mode: "defect", selected: false, defect: true, interrupted: false },
        { mode: "invoke-defect", selected: false, defect: true, interrupted: false }, { mode: "interrupt", selected: false, defect: false, interrupted: true }]);
    } finally { copy.remove(); }
  });

  for (const variant of ["defect", "unselected"] as const) it(`a ${variant} failure mapper is a defect rather than a fabricated selected refusal`, async () => {
    const copy = ready("remote", undefined, variant);
    try { await withHttp(async (origin) => {
      const output = await execute(copy.root, "mapper-main.ts", origin);
      expect(data(output)).toEqual({ defect: true, selected: false });
    }); } finally { copy.remove(); }
  });
});
