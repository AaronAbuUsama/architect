// D4 graph acceptance through real produced models, public Compare/Impact, and printed CLI output.
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { Compare, type Model } from "@architect/compiler";
import { Impact } from "@architect/prove";
import { afterEach, describe, expect, it } from "vitest";
import { addDependency, dependencyConsumer, fillMapper, prepareDependency } from "./dependencies.ts";
import { installFixture } from "./packages.ts";
import { addKit, model, project, repo, selectKit, run, succeeds, textAt, type Copy } from "./support.ts";

const copies: Array<Copy> = [];
const fresh = (variant?: string) => { const copy = project(variant); copies.push(copy); return copy; };
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });
const produced = (root: string) => model(root) as unknown as Model;
const grant = "blueprint/things/allowance/verbs/grant.ts";
const consumer = (root: string, dependency = false) => {
  const imports = 'import fixture from "../../../kits/fixture.ts";\n' + (dependency ? 'import {quote} from "../../../dependencies/pricing.ts";\n' : "");
  const uses = dependency ? "fixture, quote, fixture, quote" : "fixture, fixture";
  writeFileSync(join(root, grant), imports + textAt(root, grant).replace('  description:', `  uses: [${uses}],\n  description:`));
};
const ready = (dependency = false) => {
  const copy = fresh();
  addKit(copy.root);
  if (dependency) { prepareDependency(copy.root); addDependency(copy.root); fillMapper(copy.root); }
  consumer(copy.root, dependency);
  return copy;
};
const deps = (current: Model, operation = "allowance.grant") => Compare.dependsOn(current, operation);
// A retained-ledger fixture, from actual compiled hashes, exercises staleness only. It does not claim evals passed.
const retainHashes = (root: string, current: Model) => {
  const ledger = { model: current, proven: Object.fromEntries(Object.keys(current.operations).map((op) => [op, deps(current, op)])) };
  mkdirSync(join(root, ".architect/evidence"), { recursive: true });
  writeFileSync(join(root, ".architect/evidence/proven.json"), JSON.stringify(ledger));
};
const changed = (before: Model, after: Model, operation: string) =>
  Object.entries(deps(before, operation)).some(([key, hash]) => Compare.hashOf(after, key) !== hash);
const staleOnlyConsumers = async (root: string, before: Model, after: Model, direct: string) => {
  expect(changed(before, after, direct)).toBe(true);
  expect(changed(before, after, "allowance.grant")).toBe(true);
  expect(changed(before, after, "system.health")).toBe(false);
  const impact = await Effect.runPromise(Impact.of(root, after));
  expect([...impact.stale].sort()).toEqual([...new Set([direct, "allowance.grant"])].sort());
  expect(impact.proven).toContain("system.health");
  expect(Compare.release(before, after).bump).toBe("patch");
  expect(Compare.release(before, after).changes.length).toBeGreaterThan(0);
};

describe("L3.01: normalized graph and effective source integrity", () => {
  it("prints deduplicated sorted provides/used-by edges and uses those identities in Compare", () => {
    const { root } = ready(true);
    const current = produced(root);
    const dependencies = deps(current);
    expect(dependencies["kit:fixture"]).toBeTypeOf("string");
    expect(dependencies["dependency:pricing.quote"]).toBeTypeOf("string");
    for (const [key, hash] of Object.entries(dependencies)) expect(Compare.hashOf(current, key)).toBe(hash);
    expect(deps(current, "kit:fixture:echo.repeat")["kit:fixture"]).toBe(dependencies["kit:fixture"]);
    expect(deps(current, "system.health")).not.toHaveProperty("kit:fixture");
    const output = succeeds(root, "impact").stdout;
    const edges = output.split("\n").filter((line) => line.includes("->"));
    for (const [from, to, relation] of [["kit:fixture", "kit:fixture:echo.repeat", "provides"],
      ["kit:fixture", "allowance.grant", "used-by"], ["dependency:pricing.quote", "allowance.grant", "used-by"]]) {
      const matching = edges.filter((line) => line.includes(`${from} -> ${to}`) && line.includes(relation!));
      expect(matching, output).toHaveLength(1);
    }
    expect(edges).toEqual([...new Set(edges)].sort());
    // Nothing about descriptor functions or Effect layers can leak into canonical model data as hash inputs.
    expect(JSON.stringify(current)).not.toMatch(/\[object Function\]|\[object Object\]|"_op"\s*:/);
  });

  it("decoded choices stale kit operations and their users while unrelated operations retain their hashes", async () => {
    const { root } = ready();
    const before = produced(root); retainHashes(root, before);
    selectKit(root, "changed choice: ");
    const after = produced(root);
    await staleOnlyConsumers(root, before, after, "kit:fixture:echo.repeat");
  });

  it("same-version package runtime bytes cannot false-green Compare or retained proof staleness", async () => {
    const { root } = fresh();
    const fixture = installFixture(root, "echo", undefined, "0.0.0");
    addKit(root); consumer(root);
    const before = produced(root); retainHashes(root, before);
    // Effective packed runtime bytes change; package name/version and all wire declarations stay identical.
    appendFileSync(join(fixture.installed, "dist/runtime/worker-body.js"), '\nexport const authoredIntegrityRevision = "second";\n');
    expect(JSON.parse(textAt(root, "node_modules/@fixture/echo/package.json")).version).toBe("0.0.0");
    await staleOnlyConsumers(root, before, produced(root), "kit:fixture:echo.repeat");
  });

  it("same-version dependency mapper bytes stale only its declared consumers", async () => {
    const { root } = ready(true);
    const before = produced(root); retainHashes(root, before);
    appendFileSync(join(root, "src/dependencies/pricing.ts"), '\n// Authored mapping implementation byte revision.\n');
    const after = produced(root);
    await staleOnlyConsumers(root, before, after, "allowance.grant");
    expect(changed(before, after, "kit:fixture:echo.repeat")).toBe(false);
    expect(deps(after)["dependency:pricing.quote"]).not.toBe(deps(before)["dependency:pricing.quote"]);
  });

  it("follows kit → dependency → operation transitively for choices and same-version runtime bytes", async () => {
    const copy = fresh();
    const {root, fixture} = copy;
    addKit(root); prepareDependency(root); addDependency(root); fillMapper(root);
    const file = "blueprint/dependencies/pricing.ts";
    writeFileSync(join(root, file), 'import fixture from "../kits/fixture.ts";\n' + textAt(root, file).replace("Blueprint.dependency({", "Blueprint.dependency({uses:[fixture],"));
    writeFileSync(join(root, grant), 'import {quote} from "../../../dependencies/pricing.ts";\n' + textAt(root, grant).replace('  description:', '  uses: [quote],\n  description:'));
    const before = produced(root); retainHashes(root, before);
    expect(deps(before)["kit:fixture"]).toBeTypeOf("string");
    expect(deps(before)["dependency:pricing.quote"]).toBeTypeOf("string");
    const edges = succeeds(root, "impact").stdout;
    expect(edges).toContain("kit:fixture -> dependency:pricing.quote");
    expect(edges).toContain("dependency:pricing.quote -> allowance.grant");
    selectKit(root, "transitive choice: ");
    const choiceChange = produced(root);
    await staleOnlyConsumers(root, before, choiceChange, "kit:fixture:echo.repeat");
    expect(deps(choiceChange)["dependency:pricing.quote"]).not.toBe(deps(before)["dependency:pricing.quote"]);
    retainHashes(root, choiceChange);
    appendFileSync(join(fixture.installed, "dist/runtime/worker-body.js"), '\nexport const transitiveIntegrityRevision = "changed";\n');
    const byteChange = produced(root);
    await staleOnlyConsumers(root, choiceChange, byteChange, "kit:fixture:echo.repeat");
  });

  it("transient outputs and absolute checkout paths do not enter kit identity or source hashes", () => {
    const first = ready();
    const before = produced(first.root);
    mkdirSync(join(first.root, ".architect/temporary-run"), { recursive: true });
    writeFileSync(join(first.root, ".architect/temporary-run/random.txt"), "a transient run output");
    succeeds(first.root, "generate");
    expect(deps(produced(first.root))).toEqual(deps(before));
    const second = fresh(); addKit(second.root); consumer(second.root);
    expect(first.root).not.toBe(second.root);
    expect(deps(produced(second.root))).toEqual(deps(before));
  });

  it("missing effective package integrity fails closed, and points to the selected source", () => {
    const { root, fixture } = ready();
    produced(root); // Establish that this selected source was valid before removing its implementation.
    rmSync(join(fixture.installed, "dist/worker.js"));
    const result = run(root, "model", "--json");
    expect(result.status, result.out).not.toBe(0);
    expect(result.out).toMatch(/integrity|source|runtime|resolve|missing/i);
    expect(result.out).toContain("@fixture/echo");
  });

  it("an operation cannot acquire an undeclared dependency service through a generic Handler escape", () => {
    const {root} = fresh();
    prepareDependency(root); addDependency(root); fillMapper(root); dependencyConsumer(root);
    succeeds(root, "generate");
    const config = join(root, ".architect/graph-typecheck.json");
    writeFileSync(config, JSON.stringify({extends:join(root,"tsconfig.json"),include:[join(root,"src/probe/quote.ts")]}));
    const typecheck = () => spawnSync(join(repo,"node_modules/.bin/tsc"),["-p",config],{cwd:root,encoding:"utf8",timeout:120_000});
    const good = typecheck(); expect(good.status,good.stdout+good.stderr).toBe(0);
    const operation = "blueprint/things/probe/verbs/quote.ts";
    writeFileSync(join(root,operation),textAt(root,operation).replace("uses: [quote],", ""));
    succeeds(root,"generate");
    const missing = typecheck(); expect(missing.status,missing.stdout+missing.stderr).not.toBe(0);
    expect(missing.stdout+missing.stderr).toMatch(/Pricing|requirements|Effect|Context|Service/);
    const handler = "src/probe/quote.ts";
    writeFileSync(join(root,handler),textAt(root,handler).replace(/:\s*Handler\s*=/,": Handler<Pricing> ="));
    expect(textAt(root,handler)).toContain("Handler<Pricing>");
    const bypass = typecheck(); expect(bypass.status,bypass.stdout+bypass.stderr).not.toBe(0);
    expect(bypass.stdout+bypass.stderr).toMatch(/Pricing|generic|constraint|assignable/);
  });

  it("namespace enumeration order preserves canonical identities, identifiers, codes and wire tags", () => {
    const first = fresh("graph-order-forward"); addKit(first.root);
    const second = fresh("graph-order-reverse"); addKit(second.root);
    const identity = (current: Model) => ({
      things: Object.fromEntries(Object.entries(current.things).map(([key, value]) => [key, { name: value.name, identifier: value.identifier, code: value.code, errors: value.errors }])),
      operations: Object.fromEntries(Object.entries(current.operations).map(([key, value]) => [key, { name: value.name, thing: value.thing, identifier: value.identifier, verb: value.verb }])),
      refusals: current.refusals,
    });
    expect(identity(produced(first.root))).toEqual(identity(produced(second.root)));
    // Reordered source bytes may legitimately change conservative integrity hashes; do not assert those equal.
  });
});
