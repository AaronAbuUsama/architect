import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Model } from "#modules/model/types.js";
import { Compare } from "./service.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [resolve(repo, "packages/compiler/src/main.ts"), resolve(repo, "examples/acme")], { encoding: "utf8" })) as Model;
const edited = (edit: (m: { -readonly [K in keyof Model]: any }) => void): Model => {
  const copy = structuredClone(model) as { -readonly [K in keyof Model]: any };
  edit(copy);
  return copy as Model;
};

describe("Compare", () => {
  it("finds nothing between a model and itself", () => {
    expect(Compare.models(model, model)).toEqual([]);
  });

  it("names the declaration and the part that changed", () => {
    const looser = edited((m) => {
      m.operations["allowance.spend"] = { ...m.operations["allowance.spend"], budget: { p95Ms: 300 }, hash: "other" };
    });
    expect(Compare.models(model, looser)).toEqual([{ kind: "operation", name: "allowance.spend", change: "changed", parts: ["budget"] }]);
  });

  it("lists added and removed declarations", () => {
    const after = edited((m) => {
      m.operations["allowance.list"] = { ...m.operations["allowance.get"], name: "allowance.list" };
      delete m.operations["organization.create"];
    });
    expect(Compare.models(model, after)).toEqual([
      { kind: "operation", name: "allowance.list", change: "added", parts: [] },
      { kind: "operation", name: "organization.create", change: "removed", parts: [] },
    ]);
  });

  it("says an operation's proof rests on itself, its thing and the things it refers to", () => {
    const depends = Compare.dependsOn(model, "allowance.grant");
    expect(Object.keys(depends)).toEqual(["operation:allowance.grant", "thing:allowance", "thing:organization", "thing:person"]);
    for (const [key, hash] of Object.entries(depends)) expect(Compare.hashOf(model, key)).toBe(hash);
  });
});
