import { describe, expect, it } from "vitest";
import { Cloud } from "./service.ts";

describe("cloud", () => {
  it("names Cloudflare and a database", () => {
    expect(Cloud.cloudflare({ database: Cloud.d1() })).toEqual({ kind: "cloud", provider: "cloudflare", database: { kind: "database", which: "d1" } });
    expect(Cloud.d1.local().which).toBe("d1-local");
  });
});
