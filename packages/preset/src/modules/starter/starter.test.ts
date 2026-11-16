// The preset writes the starter under a new name: the starter's own blueprint, handlers and journeys, generated/
// rendered for the new name, and a project around them that installs @architect at the preset's version.
import { resolve } from "node:path";
import { createTreeWithEmptyWorkspace } from "nx/src/generators/testing-utils/create-tree-with-empty-workspace.js";
import { describe, expect, it } from "vitest";
import { Starter } from "./service.ts";

const starter = resolve(import.meta.dirname, "../../../../../examples/starter");

describe("the starter preset", () => {
  const tree = createTreeWithEmptyWorkspace();
  const source = Starter.read(starter, "1.2.3");
  const install = Starter.write(tree, { name: "bakery" }, source);

  it("copies the starter's blueprint, handlers and journeys unchanged", () => {
    for (const f of source.files) expect(tree.read(f.path, "utf8"), f.path).toBe(f.content);
    expect(source.files.some((f) => f.path === "implementation/handlers/session/sign-in.ts")).toBe(true);
    expect(source.files.some((f) => f.path.startsWith("journeys/"))).toBe(true);
  });

  it("renders generated/ under the new name, and writes no scaffold over a handler", () => {
    expect(tree.exists("generated/server/main.ts")).toBe(true);
    expect(tree.read("generated/cli/src/main.ts", "utf8")).toContain("bakery");
    expect(tree.read("generated/cli/src/main.ts", "utf8")).not.toContain("starter");
    // The written handler, not a blank one: a scaffold would reach a BlankReached.
    expect(tree.read("implementation/handlers/session/sign-in.ts", "utf8")).not.toContain("Blank");
  });

  it("writes a project that installs every @architect package at the preset's version", () => {
    const pkg = JSON.parse(tree.read("package.json", "utf8")!) as Record<string, Record<string, string>>;
    expect(pkg["scripts"]!["architect"]).toBe("architect");
    expect(pkg["devDependencies"]!["@architect/cli"]).toBe("1.2.3");
    expect(pkg["dependencies"]!["@architect/host-cloudflare"]).toBe("1.2.3");
    expect(tree.read(".gitignore", "utf8")).toContain(".architect/");
    expect(typeof install).toBe("function");
  });
});
