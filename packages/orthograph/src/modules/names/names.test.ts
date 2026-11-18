import { describe, expect, it } from "vitest";
import { Names } from "./service.ts";

describe("names", () => {
  it("spell the three forms of one name (design/naming.md)", () => {
    expect([Names.product, Names.short, Names.scope, Names.frontDoor]).toEqual(["Orthograph", "ortho", "@orthograph", "orthograph"]);
  });
  it("build packages, variables, the folder and the config file from the short form and the scope", () => {
    expect(Names.pkg("cli")).toBe("@orthograph/cli");
    expect(Names.variable("REVISION")).toBe("ORTHO_REVISION");
    expect([Names.folder, Names.config]).toEqual([".ortho", "ortho.config.ts"]);
  });
});
