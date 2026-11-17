// D4 adapter semantics, through the generated public Pricing service and an actual HTTP hold/release server.
import { spawn } from "node:child_process";
import { createServer, type ServerResponse } from "node:http";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addDependency, dependencyConsumer, fillMapper, prepareDependency } from "./dependencies.ts";
import { fixtures } from "./packages.ts";
import { PORTS, project, repo, succeeds } from "./support.ts";

const json = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(value));
};
const withHttp = async (use: (origin: string) => Promise<void>) => {
  const held = new Set<ServerResponse>();
  const waiters = new Set<ServerResponse>();
  const release = () => { for (const response of held) json(response, 200, { value: "released" }); held.clear(); };
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
const ready = (kind = "remote", mode?: "effect", mapper: "normal" | "defect" | "unselected" = "normal") => {
  const copy = project();
  try {
    prepareDependency(copy.root, kind); addDependency(copy.root, kind, mode); fillMapper(copy.root, mapper);
    dependencyConsumer(copy.root); succeeds(copy.root, "generate"); return copy;
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

  it("Promise success/sync throw/rejection map once; interruption cannot release counted work before actual settlement", async () => {
    const copy = ready();
    try { await withHttp(async (origin) => {
      const output = await execute(copy.root, "promise-main.ts", origin);
      expect(output.includes("foreign-private-canary")).toBe(false);
      const result = data<{ answers: Array<{ mode: string; success: boolean; selected: boolean; defect: boolean }>; protectedWhileHeld: boolean; interrupted: boolean; finalCount: number }>(output);
      expect(result.answers).toEqual([{ mode: "ok", success: true, selected: false, defect: false },
        { mode: "reject", success: false, selected: true, defect: false }, { mode: "throw", success: false, selected: true, defect: false }]);
      expect(result.protectedWhileHeld).toBe(true); expect(result.interrupted).toBe(true); expect(result.finalCount).toBe(0);
    }); } finally { copy.remove(); }
  });

  it("Effect mode preserves required services and only maps typed failure, never defects or interruption", async () => {
    const copy = ready("effect-remote", "effect");
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
        { mode: "interrupt", selected: false, defect: false, interrupted: true }]);
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
