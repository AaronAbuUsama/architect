import { describe, expect, it } from "vitest";
import { Deploy } from "./service.ts";

describe("deploy", () => {
  it("says what runs, with a domain when there is one", () => {
    expect(Deploy.worker({ domain: "api.acme.dev" })).toEqual({ kind: "deployment", how: "worker", domain: "api.acme.dev" });
    expect(Deploy.site().domain).toBeNull();
  });
  it("says what is installed", () => {
    expect(Deploy.npm({ tag: "next" })).toEqual({ kind: "publication", how: "npm", tag: "next" });
    expect(Deploy.npm()).toEqual({ kind: "publication", how: "npm", tag: null });
    expect(Deploy.homebrew({ tap: "acme/tap" }).how).toBe("homebrew");
    expect(Deploy.binaries({ on: "github-releases" }).how).toBe("binaries");
  });
});
