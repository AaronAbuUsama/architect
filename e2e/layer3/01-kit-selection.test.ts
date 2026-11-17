// L3.01, D4: one installed packed kit, one validated choice file, no project handler and stable names/provenance.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addKit, model, project, run, succeeds, textAt, tree, type Copy } from "./support.ts";

const copies: Array<Copy> = [];
const fresh = () => { const copy = project(); copies.push(copy); return copy; };
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

// The CLI must succeed before later assertions count: unknown CLI/layout errors are not accepted validation proofs.
describe("L3.01: select a finished kit", () => {
  it("one command writes one valid choices file; duplicate selection never overwrites it", () => {
    const { root } = fresh();
    const source = tree(root, "src");
    const added = addKit(root);
    const file = "blueprint/kits/fixture.ts";
    expect(added.out).toContain(file);
    expect(textAt(root, file)).toContain("Blueprint.kit");
    expect(textAt(root, file)).toContain("@fixture/echo");
    expect(textAt(root, file)).not.toContain("Blueprint.todo");
    expect(tree(root, "blueprint/kits")).toEqual([file]);
    expect(tree(root, "src")).toEqual(source);
    const before = textAt(root, file);
    const duplicate = run(root, "add", "kit", "@fixture/echo", "--as", "fixture");
    expect(duplicate.status).not.toBe(0);
    expect(duplicate.out).toMatch(/already|exist/i);
    expect(textAt(root, file)).toBe(before);
  });

  it("dry-run validates the installed descriptor and writes nothing", () => {
    const { root } = fresh();
    const dry = addKit(root, "--dry-run");
    expect(dry.out).toContain("blueprint/kits/fixture.ts");
    expect(existsSync(join(root, "blueprint/kits"))).toBe(false);
  });

  it("canonical identities, physical paths, identifiers and module/export provenance stay separate", () => {
    const { root } = fresh();
    addKit(root);
    const got = model(root);
    expect(got.things["kit:fixture:echo"]).toMatchObject({ name: "kit:fixture:echo", identifier: "KitFixtureEcho" });
    expect(got.operations["kit:fixture:echo.repeat"]).toMatchObject({ name: "kit:fixture:echo.repeat", thing: "kit:fixture:echo", verb: "repeat" });
    expect(JSON.stringify(got.operations["kit:fixture:echo.repeat"])).toContain("@fixture/echo/blueprint");
    expect(model(root).things["kit:fixture:echo"]!.code).toBe("EC");
    expect(model(root).things["kit:fixture:echo"]!.identifier).toBe("KitFixtureEcho");
    expect(JSON.stringify(model(root).operations["kit:fixture:echo.repeat"])).toContain("@fixture/echo/blueprint");
    succeeds(root, "generate");
    expect(existsSync(join(root, "generated/sdk/src/kits/fixture/echo/repeat.ts"))).toBe(true);
    expect(existsSync(join(root, "generated/sdk/src/kits/fixture/echo/index.ts"))).toBe(true);
    expect(existsSync(join(root, "src/kits"))).toBe(false);
    expect(tree(root, "generated").some((file) => file.includes("kit:"))).toBe(false);
  });

  it("invalid choices and non-JSON decoded choices fail with their source, before output is generated", () => {
    const { root } = fresh();
    addKit(root);
    const file = join(root, "blueprint/kits/fixture.ts");
    writeFileSync(file, 'import { Blueprint } from "@architect/blueprint";\nimport { Fixture } from "@fixture/echo";\nexport default Blueprint.kit(Fixture, {prefix: 7, meta: null});\n');
    const bad = run(root, "model", "--json");
    expect(bad.status).not.toBe(0);
    expect(bad.out).toMatch(/fixture\.ts/);
    expect(bad.out).toMatch(/prefix/);
    expect(bad.out).toMatch(/string/i);
    writeFileSync(file, 'import { Blueprint } from "@architect/blueprint";\nimport { Fixture } from "@fixture/echo";\nexport default Blueprint.kit(Fixture, {prefix: "ok", meta: () => null});\n');
    const nonJson = run(root, "model", "--json");
    expect(nonJson.status).not.toBe(0);
    expect(nonJson.out).toMatch(/JSON|canonical/i);
    expect(nonJson.out).toMatch(/fixture\.ts/);
  });

  it("mounting one singleton descriptor twice names both selections rather than alias-stamping shared objects", () => {
    const { root } = fresh();
    addKit(root);
    writeFileSync(join(root, "blueprint/kits/again.ts"), textAt(root, "blueprint/kits/fixture.ts"));
    const duplicate = run(root, "model", "--json");
    expect(duplicate.status).not.toBe(0);
    expect(duplicate.out).toMatch(/fixture\.ts/);
    expect(duplicate.out).toMatch(/again\.ts/);
    expect(duplicate.out).toMatch(/singleton|twice|duplicate/i);
  });
});
