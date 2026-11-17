// D4's configured finished handler must execute through actual generated SDK/HTTP and a fresh MCP runtime.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Prove, Worlds } from "@architect/prove";
import { describe, expect, it } from "vitest";
import { callAs } from "../layer2/mcp.ts";
import { addKit, echoJourney, fixtures, PORTS, project, succeeds } from "./support.ts";
import { bundle, typecheckSdk, violations } from "./closures.ts";

const ready = (variant?: string) => {
  const copy = project(variant);
  try { addKit(copy.root); echoJourney(copy.root); succeeds(copy.root, "generate"); return copy; }
  catch (error) { copy.remove(); throw error; }
};

describe("L3.01: configured kit execution and closure", () => {
  it("a typed logical SDK and real workerd HTTP call retain the kit layer; prove keeps all nine evals", async () => {
    const copy = ready();
    try {
      typecheckSdk(copy.root);
      await Effect.runPromise(Effect.scoped(Effect.gen(function* () {
        const world = yield* Worlds.start({ root: copy.root, port: PORTS.kit, name: "authored-kit-http" });
        const dir = join(copy.root, ".architect/sdk-call");
        mkdirSync(dir, { recursive: true });
        const entry = join(dir, "main.ts");
        writeFileSync(entry, 'import {Effect} from "effect";\nimport * as Sdk from "../../generated/sdk/src/index.ts";\nconst answer=await Effect.runPromise(Sdk.kits.fixture.echo.repeat({text:"hello"}).pipe(Effect.provide(Sdk.layer(process.argv[2]!))));\nconsole.log(JSON.stringify(answer));\n');
        const called = spawnSync(process.execPath, [entry, world.url], { cwd: copy.root, encoding: "utf8", timeout: 60_000 });
        expect(called.status, called.stdout + called.stderr).toBe(0);
        expect(JSON.parse(called.stdout)).toEqual({ text: "fixture: hello" });
        const response = yield* Effect.promise(() => fetch(`${world.url}/kits/fixture/echo/repeat`, {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "hello" }),
        }));
        expect(response.status).toBe(200);
        expect(yield* Effect.promise(() => response.json())).toEqual({ text: "fixture: hello" });
      })));
      const report = await Effect.runPromise(Effect.scoped(Prove.run({ root: copy.root, port: PORTS.kit })));
      expect(report.passed, report.lines.join("\n")).toBe(true);
      expect(report.lines).toContain("journey a finished kit repeats with its configured prefix ✔ 1/1 steps");
      expect(report.lines.some((line) => line.startsWith("kit:fixture:echo.repeat 9 evals ✔"))).toBe(true);
    } finally { copy.remove(); }
  });

  it("a fresh worker's first operation may be MCP: auth-only warmup does not supply the missing kit Context", () => {
    const copy = ready();
    return Effect.runPromise(Effect.scoped(Effect.gen(function* () {
      const world = yield* Worlds.start({ root: copy.root, port: PORTS.mcp, name: "authored-kit-mcp" });
      const who = { email: "fixture@acme.test", password: "not-a-real-person-password" };
      const response = yield* Effect.promise(() => fetch(`${world.url}/api/auth/sign-up/email`, { method: "POST",
        headers: { "content-type": "application/json", origin: world.url }, body: JSON.stringify({ ...who, name: "fixture" }) }));
      expect(response.status).toBe(200);
      const called = yield* Effect.promise(() => callAs(world.url, who, "kit:fixture:echo.repeat", { text: "hello" }));
      expect(called.isError, called.text).toBe(false);
      expect(called.text).toContain('"text":"fixture: hello"');
    }))).finally(copy.remove);
  });

  it("actual client closures contain selected pure descriptor/declarations only; Worker never imports the Node entry", () => {
    const copy = ready();
    try {
      // Exercise ordinary whole-operation -> uses -> kit selection -> selected pure descriptor root, not only the kit's direct op.
      cpSync(join(fixtures, "project/kit-health.ts"), join(copy.root, "blueprint/things/system/verbs/health.ts"));
      succeeds(copy.root, "generate");
      typecheckSdk(copy.root);
      for (const [name, entry] of [["api", "generated/api/src/index.ts"], ["sdk", "generated/sdk/src/index.ts"]] as const) {
        expect(violations(copy.root, bundle(copy.root, entry, name), "client")).toEqual([]);
      }
      expect(violations(copy.root, bundle(copy.root, "generated/server/main.ts", "worker"), "worker")).toEqual([]);
      const bad = join(copy.root, ".architect/planted-client.ts");
      writeFileSync(bad, 'export { make } from "@fixture/echo/worker";\nexport { fingerprint } from "@fixture/echo/node";\n');
      const caught = violations(copy.root, bundle(copy.root, bad, "bad-client"), "client");
      expect(caught).toContain("fixture:dist/worker.js");
      expect(caught).toContain("fixture:dist/node.js");
      expect(caught).toContain("node:crypto");
    } finally { copy.remove(); }
  });

  for (const [variant, marker, port] of [["empty-worker", "BlankReached", PORTS.empty], ["defect-worker", "authored kit repeat defect", PORTS.defect]] as const) {
    it(`the independent ${variant} fixture fails the real journey/prover once the kit pipeline exists`, async () => {
      const copy = ready(variant);
      try {
        const report = await Effect.runPromise(Effect.scoped(Prove.run({ root: copy.root, port })));
        expect(report.passed).toBe(false);
        expect(report.lines.join("\n")).toContain(marker);
        expect(report.lines.join("\n")).toContain("journey a finished kit repeats with its configured prefix ✘");
      } finally { copy.remove(); }
    });
  }
});
