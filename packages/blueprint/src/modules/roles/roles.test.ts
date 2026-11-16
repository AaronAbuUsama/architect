import { describe, expect, it } from "vitest";
import { Values } from "#modules/values/service.ts";
import { Things } from "#modules/things/service.ts";
import { Roles } from "./service.ts";

const Organization = Things.thing({ description: "x", fields: { id: Values.id("org"), owner: Values.id("per") } });
const owner = Roles.role(Organization, { rule: (org, principal) => org.owner === principal.person });

describe("roles", () => {
  it("decide on an instance and a principal", () => {
    const org = { id: "org_1", owner: "per_ada", state: "active" } as never;
    expect(owner.rule(org, { kind: "person", person: "per_ada" })).toBe(true);
    expect(owner.rule(org, { kind: "person", person: "per_bob" })).toBe(false);
  });

  it("point at another thing through a payload field", () => {
    const of = owner.of("organization");
    expect(of.role).toBe(owner);
    expect(of.path).toBe("organization");
  });
});
