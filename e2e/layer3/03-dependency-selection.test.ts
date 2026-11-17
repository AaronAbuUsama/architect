// A dependency is not Effect-only: these real packed callable packages include Promise, Effect and Node-capable signatures.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addDependency, dependencyArgs, errorRef, failed, fillMapper, prepareDependency } from "./dependencies.ts";
import { addKit, project, succeeds, textAt, type Copy } from "./support.ts";
import { bundle, typecheckSdk, violations } from "./closures.ts";

const copies: Array<Copy> = [];
const fresh = (kind = "remote") => { const copy = project(); copies.push(copy); prepareDependency(copy.root, kind); return copy; };
afterEach(() => { for (const copy of copies.splice(0)) copy.remove(); });

describe("L3.01: installed dependency selection", () => {
  it("the default raw Promise callable creates two files atomically with exactly one runtime-only mapper blank", () => {
    const { root } = fresh();
    addDependency(root);
    const declaration = textAt(root, "blueprint/dependencies/pricing.ts");
    const implementation = textAt(root, "src/dependencies/pricing.ts");
    expect(declaration).toContain("Blueprint.dependency");
    expect(declaration).toContain('@fixture/remote');
    expect(declaration).toMatch(/version:\s*["']1\.0\.0["']/);
    expect(declaration).toMatch(/mode:\s*["']promise["']/);
    expect(declaration).not.toMatch(/\bfrom\s*["']@fixture\/|import\(["']@fixture\//);
    expect(declaration).not.toMatch(/\b(call|failure)\s*:/);
    expect(declaration).not.toContain("Blueprint.todo");
    expect(implementation).toContain("Dependencies.implementation");
    expect(implementation).toContain('@fixture/remote');
    expect(implementation.match(/Blueprint\.todo\(/g)).toHaveLength(1);
    expect(declaration + implementation).not.toContain("dependency:pricing.quote");
    const before = [declaration, implementation];
    failed(root, dependencyArgs(), /already|exist/i);
    expect([textAt(root, "blueprint/dependencies/pricing.ts"), textAt(root, "src/dependencies/pricing.ts")]).toEqual(before);
  });

  it("dry-run writes neither file, and an existing runtime destination cannot leave a half-written declaration", () => {
    const { root } = fresh();
    const dry = addDependency(root, "remote", undefined, "--dry-run");
    expect(dry.out).toContain("blueprint/dependencies/pricing.ts");
    expect(dry.out).toContain("src/dependencies/pricing.ts");
    expect(existsSync(join(root, "blueprint/dependencies/pricing.ts"))).toBe(false);
    expect(existsSync(join(root, "src/dependencies/pricing.ts"))).toBe(false);
    mkdirSync(join(root, "src/dependencies"), { recursive: true });
    writeFileSync(join(root, "src/dependencies/pricing.ts"), "// keep this exact source\n");
    failed(root, dependencyArgs(), /src\/dependencies\/pricing\.ts/);
    expect(existsSync(join(root, "blueprint/dependencies/pricing.ts"))).toBe(false);
    expect(textAt(root, "src/dependencies/pricing.ts")).toBe("// keep this exact source\n");
  });

  it("explicit Effect mode and a selected error union are retained rather than inventing an error band", () => {
    const { root } = fresh("effect-remote");
    addDependency(root, "effect-remote", "effect", "--error", "blueprint/things/allowance/errors.ts#UnselectedRefusal");
    const declaration = textAt(root, "blueprint/dependencies/pricing.ts");
    expect(declaration).toMatch(/mode:\s*["']effect["']/);
    expect(declaration).toContain("PriceUnavailable");
    expect(declaration).toContain("UnselectedRefusal");
    expect(declaration).not.toMatch(/\bfrom\s*["']@fixture\//);
  });

  it("rejects a missing callable and missing selected error before creating either destination", () => {
    const { root } = fresh();
    // First validate that the good command exists; otherwise an unknown subcommand is not a rejection proof.
    addDependency(root, "remote", undefined, "--dry-run");
    failed(root, ["add", "dependency", "@fixture/remote", "--export", "notExported", "--as", "pricing", "--step", "network", "--error", errorRef], /notExported/);
    failed(root, ["add", "dependency", "@fixture/remote", "--export", "quote", "--as", "pricing", "--step", "network", "--error", "blueprint/things/allowance/errors.ts#NotExported"], /NotExported/);
    expect(existsSync(join(root, "blueprint/dependencies/pricing.ts"))).toBe(false);
    expect(existsSync(join(root, "src/dependencies/pricing.ts"))).toBe(false);
  });

  it("Node-capable Promise SDK types and runtime stay out of API/SDK clients", () => {
    const { root } = fresh("node-remote");
    addKit(root);
    addDependency(root, "node-remote");
    fillMapper(root);
    const declaration = textAt(root, "blueprint/dependencies/pricing.ts");
    expect(declaration).not.toMatch(/\bfrom\s*["']@fixture\/|import\(["']@fixture\//);
    const health = readFileSync(join(root, "blueprint/things/system/verbs/health.ts"), "utf8");
    writeFileSync(join(root, "blueprint/things/system/verbs/health.ts"), 'import {quote} from "../../../dependencies/pricing.ts";\n' + health.replace('  payload: {},', '  uses: [quote],\n  payload: {},'));
    succeeds(root, "generate");
    typecheckSdk(root);
    expect(violations(root, bundle(root, "generated/api/src/index.ts", "node-sdk-api"), "client")).toEqual([]);
    expect(violations(root, bundle(root, "generated/sdk/src/index.ts", "node-sdk-client"), "client")).toEqual([]);
  });
});
