// What an operation's handler starts as: the scaffold says where it came from and is the project's from then on.
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { callSteps, renderHandlerScaffold } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), join(repo, "examples/acme")], { encoding: "utf8" })) as Model;

describe("handlers", () => {
  it("scaffolds an operation that calls nothing as one blank per step, in the project's src/", () => {
    const op = model.operations["allowance.spend"]!;
    expect(callSteps(op)).toEqual([]);
    const scaffold = renderHandlerScaffold(op);
    expect(scaffold).toMatchObject({ path: "src/allowance/spend.ts", scaffold: true });
    expect(scaffold.content.split("\n")[0]).toBe("// Scaffolded from blueprint/things/allowance/verbs/spend.ts. Yours from now on.");
  });
});
