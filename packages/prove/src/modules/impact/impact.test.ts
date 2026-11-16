// L1.41's done-when, on a real prove: loosening spend's budget makes exactly spend stale; adding a read makes nothing
// stale, only unproven.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import type { Model } from "@architect/compiler";
import { Prove } from "#modules/prove/service.ts";
import { Impact } from "./service.ts";

const acme = resolve(import.meta.dirname, "../../../../../examples/acme");
const scratch = join(acme, "test/tmp/impact");
const root = join(scratch, "acme");
const spend = join(root, "blueprint/things/allowance/verbs/spend.ts");
// Compiled in a fresh process each time, as the command is: this one's module cache would keep the old blueprint.
const compiler = resolve(import.meta.dirname, "../../../../compiler/src/main.ts");
const impact = () => {
  const model = JSON.parse(execFileSync(process.execPath, [compiler, root], { encoding: "utf8" })) as Model;
  return Effect.runPromise(Impact.of(root, model).pipe(Effect.map(Impact.lines)));
};

afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("impact", () => {
  it("after a prove, names only what a change unproves", { timeout: 240_000 }, async () => {
    rmSync(scratch, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
    for (const part of ["blueprint", "generated", "implementation", "journeys", "package.json"]) cpSync(join(acme, part), join(root, part), { recursive: true });
    writeFileSync(join(root, "tsconfig.json"), JSON.stringify({
      extends: relative(root, join(acme, "tsconfig.json")),
      include: ["blueprint/**/*.ts", "generated/**/*.ts", "implementation/**/*.ts", "journeys/**/*.ts"],
    }));
    expect(await impact()).toContain("stale none");

    const proved = await Effect.runPromise(Effect.scoped(Prove.run({ root, port: 8796 })));
    expect(proved.passed, proved.lines.join("\n")).toBe(true);
    expect(await impact()).toEqual(["stale none", "proven allowance.get, allowance.grant, allowance.revoke, allowance.spend, organization.create"]);

    const declared = readFileSync(spend, "utf8");
    writeFileSync(spend, declared.replace('budget: { p95: "150 millis" }', 'budget: { p95: "300 millis" }'));
    expect(await impact()).toEqual([
      "changed operation allowance.spend: budget",
      "stale allowance.spend",
      "proven allowance.get, allowance.grant, allowance.revoke, organization.create",
    ]);

    writeFileSync(spend, declared);
    cpSync(join(root, "blueprint/things/allowance/verbs/get.ts"), join(root, "blueprint/things/allowance/verbs/list.ts"));
    expect(await impact()).toEqual([
      "added operation allowance.list",
      "stale none",
      "proven allowance.get, allowance.grant, allowance.revoke, allowance.spend, organization.create",
      "unproven allowance.list",
    ]);
  });
});
