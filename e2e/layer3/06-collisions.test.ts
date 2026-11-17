// Independent malformed declarations: every negative starts after a successful ordinary fixture control.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { Compare, type Model } from "@architect/compiler";
import { installFixture } from "./packages.ts";
import { addDependency, fillMapper, prepareDependency } from "./dependencies.ts";
import { addKit, model, project, repo, run, succeeds, textAt, tree, type Copy } from "./support.ts";

const copies: Array<Copy> = [];
const variants = ["graph-invalid-namespace", "graph-invalid-export", "graph-identifier-collision", "graph-ambiguous-tags",
  "graph-final-code", "graph-reserved-prefix", "graph-no-worker", "graph-order-forward", "graph-order-reverse"];
const fresh = (variant?: string) => { const copy = project(variant); copies.push(copy); return copy; };
afterEach(() => { for (const copy of copies.splice(0)) rmSync(dirname(copy.root), {recursive:true,force:true,maxRetries:3,retryDelay:100}); });
const selected = () => {
  const copy = fresh(); addKit(copy.root); model(copy.root); succeeds(copy.root, "generate"); return copy;
};
const invalid = (root: string, diagnostic: RegExp, sources: ReadonlyArray<string>, command = "model") => {
  const result = run(root, command, ...(command === "model" ? ["--json"] : []));
  expect(result.status, result.out).not.toBe(0);
  expect(result.out).toMatch(diagnostic);
  for (const source of sources) expect(result.out).toContain(source);
  expect(result.out).not.toMatch(/unknown command|unknown blueprint folder|is not a function|Cannot redefine property|SyntaxError/i);
  return result;
};
const withOverlay = (variant: string) => {
  const copy = selected();
  installFixture(copy.root, "echo", variant);
  return copy;
};

describe("L3.01: collision fixture positive controls", () => {
  for (const variant of variants) it(`${variant} is a valid TypeScript package and remains pure at its descriptor/declaration entries`, async () => {
    const copy = fresh(variant); // Real declaration emit + npm pack + extraction run before this assertion.
    const descriptor = await import(pathToFileURL(join(copy.fixture.installed, "dist/descriptor.js")).href) as { Fixture: { declarations: object; sources: Record<string, string> } };
    expect(descriptor.Fixture.sources.descriptor).toBe("@fixture/echo");
    expect(Object.keys(descriptor.Fixture.declarations).length).toBeGreaterThan(0);
    // Loading metadata must not load a runtime entry. Their actual closures are separately checked by check 02.
    expect(readFileSync(join(copy.fixture.installed, "dist/descriptor.js"), "utf8")).not.toMatch(/from ["'].*(?:worker|node)\.js["']/);
    expect(readFileSync(join(copy.fixture.installed, "dist/blueprint.js"), "utf8")).not.toMatch(/from ["'].*(?:worker|node)\.js["']/);
  });
});

describe("L3.01: canonical names, tags, codes and graph refusals", () => {
  for (const alias of ["../escape", "bad/name", "bad:alias", "1starts-with-digit"]) it(`rejects invalid alias ${alias} before writing selections`, () => {
    const { root } = selected();
    // The valid compile/generate establishes the feature. Remove that mount so duplicate-singleton validation cannot mask alias validation.
    rmSync(join(root, "blueprint/kits/fixture.ts"));
    const before = tree(root, "blueprint");
    const result = run(root, "add", "kit", "@fixture/echo", "--as", alias);
    expect(result.status, result.out).not.toBe(0);
    expect(result.out).toMatch(/alias|identifier|name/i);
    expect(result.out).toContain(alias);
    expect(tree(root, "blueprint")).toEqual(before);
  });

  it("rejects an invalid namespace without silently turning it into a path", () => {
    const { root } = withOverlay("graph-invalid-namespace");
    invalid(root, /namespace|name|path/i, ["bad/name", "@fixture/echo/blueprint"]);
  });

  it("rejects an invalid operation export without stripping its punctuation", () => {
    const { root } = withOverlay("graph-invalid-export");
    invalid(root, /export|identifier|name|path/i, ["bad/name", "@fixture/echo/blueprint"]);
  });

  it("rejects distinct namespaces that normalize to one generated identifier, with separate codes", () => {
    const { root } = withOverlay("graph-identifier-collision");
    invalid(root, /identifier.*colli|colli.*identifier/i, ["foo-bar", "fooBar"]);
  });

  it("rejects mounting the same singleton descriptor under two aliases, naming both files", () => {
    const { root } = selected();
    writeFileSync(join(root, "blueprint/kits/again.ts"), textAt(root, "blueprint/kits/fixture.ts"));
    invalid(root, /singleton|twice|duplicate/i, ["kits/fixture.ts", "kits/again.ts"]);
  });

  it("rejects two distinct error classes with one wire tag in an operation's error union", () => {
    const { root } = withOverlay("graph-ambiguous-tags");
    // EC and QA keep final codes distinct; the collision here is EchoProblem in repeat's union.
    invalid(root, /ambiguous|tag|union/i, ["EchoProblem", "echo", "audit", "repeat"]);
  });

  it("rejects duplicate final error codes from project and kit declarations", () => {
    const { root } = withOverlay("graph-final-code");
    invalid(root, /code|prefix|duplicate/i, ["AL", "allowance", "echo"]);
  });

  it("reserves the runtime AR code prefix for runtime refusals", () => {
    const { root } = withOverlay("graph-reserved-prefix");
    invalid(root, /reserved|runtime/i, ["AR", "echo"]);
  });

  it("rejects an unmounted descriptor reference rather than silently omitting its uses edge", () => {
    const { root } = selected();
    const file = "blueprint/things/allowance/verbs/grant.ts";
    const imports = 'import {Fixture} from "@fixture/echo";\nconst unmounted = Blueprint.kit({...Fixture}, {prefix:"unmounted",meta:null});\n';
    // Spread makes this a distinct singleton, so the intended failure is a dangling reference rather than duplicate mounting.
    writeFileSync(join(root, file), imports + textAt(root, file).replace('  description:', '  uses: [unmounted],\n  description:'));
    invalid(root, /dangling|unmounted|not.*(?:selected|declared|mounted|blueprint)|unresolved/i, ["grant.ts"]);
  });


  it("prevents a dependency cycle by immutable input/snapshot or reports its actual graph cycle", () => {
    const { root } = selected(); prepareDependency(root); addDependency(root); fillMapper(root);
    const source = `import {Blueprint} from "@architect/blueprint";
import {PriceUnavailable} from "../blueprint/things/allowance/errors.ts";
const outgoing: Array<ReturnType<typeof Blueprint.dependency>> = [];
export const quote = Blueprint.dependency({package:"@fixture/remote",version:"1.0.0",mode:"promise",errors:[PriceUnavailable],step:"network",uses:outgoing});
export const peer = Blueprint.dependency({package:"@fixture/remote",version:"1.0.0",mode:"promise",errors:[PriceUnavailable],step:"network",uses:[quote]});
export const link = () => Reflect.set(outgoing,"0",peer);
`;
    writeFileSync(join(root, "src/graph-cycle.ts"), source);
    writeFileSync(join(root, "blueprint/dependencies/pricing.ts"), 'export {quote} from "../../src/graph-cycle.ts";\n');
    writeFileSync(join(root, "blueprint/dependencies/peer.ts"), 'export {peer as quote} from "../../src/graph-cycle.ts";\n');
    writeFileSync(join(root, "src/dependencies/peer.ts"), textAt(root, "src/dependencies/pricing.ts").replaceAll('dependencies/pricing.ts', 'dependencies/peer.ts'));
    const grant = "blueprint/things/allowance/verbs/grant.ts";
    writeFileSync(join(root, grant), 'import {quote} from "../../../dependencies/pricing.ts";\n' + textAt(root, grant).replace('  description:', '  uses:[quote],\n  description:'));
    const health = "blueprint/things/system/verbs/health.ts";
    writeFileSync(join(root,health),'import {quote} from "../../../dependencies/peer.ts";\n' + textAt(root,health).replace('  description:','  uses:[quote],\n  description:'));
    const probe = spawnSync(process.execPath, [join(repo, "e2e/layer3/graph-entry/main.ts"), root, "--cycle"], {cwd:repo,encoding:"utf8",timeout:120_000});
    expect(probe.status, probe.stdout + probe.stderr).toBe(0); // A native TDZ/stack overflow is never a cycle proof.
    type Observation = {a:Record<string,string>; b:Record<string,string>; aHash:string; bHash:string};
    const result = JSON.parse(probe.stdout) as {before:Observation; linked:boolean; after:Observation & {boundary:string;failure?:{_tag:string;problems:ReadonlyArray<string>}}};
    const directed = (observed:Observation) => {
      expect(observed.aHash).toBeTypeOf("string"); expect(observed.bHash).toBeTypeOf("string");
      expect(observed.a["dependency:pricing.quote"]).toBe(observed.aHash);
      expect(observed.a).not.toHaveProperty("dependency:peer.quote");
      expect(observed.b["dependency:pricing.quote"]).toBe(observed.aHash);
      expect(observed.b["dependency:peer.quote"]).toBe(observed.bHash);
    };
    directed(result.before); // Positive A → B → O and asymmetric A-root control precede any cycle assertion.
    if (result.after.boundary === "compiler") {
      expect(result.after.failure?._tag).toBe("BlueprintInvalid");
      expect(result.after.failure?.problems.join("\n")).toMatch(/cycle|cyclic/i);
      expect(result.after.failure?.problems.join("\n")).toContain("pricing");
      expect(result.after.failure?.problems.join("\n")).toContain("peer");
    } else {
      // Reflect.set's boolean alone proves nothing. Both public consumers must demonstrate retained acyclic direction.
      expect(result.after.boundary).toBe("compiled"); directed(result.after);
      expect(result.after.aHash).toBe(result.before.aHash); expect(result.after.bHash).toBe(result.before.bHash);
    }
  });

  it("refuses an operation object in uses after a real accepted dependency reference compiled", () => {
    const {root} = selected(); prepareDependency(root); addDependency(root); fillMapper(root);
    const file = "blueprint/things/allowance/verbs/grant.ts";
    const original = textAt(root,file);
    writeFileSync(join(root,file),'import {quote} from "../../../dependencies/pricing.ts";\n'+original.replace('  description:','  uses:[quote],\n  description:'));
    const current = model(root) as unknown as Model;
    expect(Compare.dependsOn(current,"allowance.grant")["dependency:pricing.quote"]).toBeTypeOf("string");
    writeFileSync(join(root,file),'import health from "../../system/verbs/health.ts";\n'+original.replace('  description:','  uses:[health],\n  description:'));
    expect(invalid(root,/uses|reference|operation/i,["grant.ts"]).out).toMatch(/kit|dependency/i);
  });

  it("refuses a kit without a Worker capability rather than generating a Node shim", () => {
    const { root } = withOverlay("graph-no-worker");
    invalid(root, /unsupported|not supported|missing|does not (?:provide|support)|no.*worker/i, ["worker", "@fixture/echo"], "generate");
  });

  it("repeated compiles and a second alias preserve export-derived tags on the same cached package class", () => {
    const first = selected();
    const second = fresh();
    // Both project selections really resolve to the SAME installed package/class object in one Node loader.
    rmSync(second.fixture.installed, { recursive: true });
    symlinkSync(first.fixture.installed, second.fixture.installed);
    mkdirSync(join(second.root, "blueprint/kits"), { recursive: true });
    writeFileSync(join(second.root, "blueprint/kits/other.ts"), textAt(first.root, "blueprint/kits/fixture.ts"));
    const result = spawnSync(process.execPath, [join(repo, "e2e/layer3/graph-entry/main.ts"), first.root, second.root],
      { cwd: repo, encoding: "utf8", timeout: 120_000 });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ operations: [["kit:fixture:echo.repeat"], ["kit:fixture:echo.repeat"],
      ["kit:other:echo.repeat"], ["kit:fixture:echo.repeat"]], tag: "EchoProblem" });
  });
});
