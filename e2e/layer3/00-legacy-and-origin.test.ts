// Positive controls: the fixture's successful business body is adopted, and existing kits-free behavior remains real.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Effect, type Layer } from "effect";
import { describe, expect, it } from "vitest";
import { acme, architect, copyOf, nothingRunning } from "../layer1/support.ts";
import { fixtures, installFixture } from "./packages.ts";
import { PORTS, model, succeeds, textAt } from "./support.ts";

type Runtime = { make: (choices: { prefix: string; meta: null }, declarations: unknown) => {
  handlers: { echo: { repeat: (payload: { text: string }) => Effect.Effect<{ text: string }, never, unknown> } };
  layer: Layer.Layer<unknown>;
} };

describe("L3.01 positive controls", () => {
  it("adopts the independent spike's tiny successful body, and the packed fixture supplies its real Effect service", async () => {
    const copy = copyOf(acme);
    try {
      const installed = installFixture(copy.root);
      const original = readFileSync(join(fixtures, "echo/origin/worker.ts.txt"), "utf8");
      expect(readFileSync(join(fixtures, "echo/src/runtime/worker-body.ts"), "utf8").startsWith(original)).toBe(true);
      expect(readFileSync(join(fixtures, "echo/src/node.ts"), "utf8")).toBe(readFileSync(join(fixtures, "echo/origin/node.ts.txt"), "utf8"));
      const declarations: unknown = await import(pathToFileURL(join(installed.installed, "dist/blueprint.js")).href);
      const runtime = await import(pathToFileURL(join(installed.installed, "dist/worker.js")).href) as Runtime;
      const selected = runtime.make({ prefix: "configured: ", meta: null }, declarations);
      const answer = await Effect.runPromise(selected.handlers.echo.repeat({ text: "hello" }).pipe(Effect.provide(selected.layer)));
      expect(answer).toEqual({ text: "configured: hello" });
    } finally { copy.remove(); }
  });

  it("keeps unselected-package/kits-free generated interfaces and every original operation's nine evals", () => {
    const copy = copyOf(acme);
    try {
      installFixture(copy.root);
      const before = textAt(copy.root, "generated/sdk/src/index.ts");
      const current = model(copy.root);
      expect(Object.keys(current.operations).some((name) => name.startsWith("kit:"))).toBe(false);
      succeeds(copy.root, "generate");
      expect(textAt(copy.root, "generated/sdk/src/index.ts")).toBe(before);
      const proved = architect(copy.root, "prove", "--env", "local", "--port", String(PORTS.kit));
      expect(proved.status, proved.stdout + proved.stderr).toBe(0);
      for (const name of Object.keys(current.operations)) expect(proved.stdout).toContain(`${name} 9 evals ✔`);
      expect(proved.stdout).toContain("coverage ✔ moves 7/7");
      nothingRunning(copy.root);
    } finally { copy.remove(); }
  });
});
