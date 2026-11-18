import { describe, expect, expectTypeOf, it } from "vitest";
import { Values } from "#modules/values/service.js";
import { Things } from "./service.ts";
import { structOf } from "./internal/fields.ts";
import { Schema } from "effect";

const Organization = Things.thing({ description: "A company.", fields: { id: Values.id("org"), name: Values.text() } });
const Allowance = Things.thing({
  description: "Money a member may spend.",
  fields: { id: Values.id("alw"), organization: Organization.fields.id, limit: Values.uint(128) },
});

describe("things", () => {
  it("fields know the thing they came from", () => {
    expect(Allowance.fields.organization.value).toBe(Organization.fields.id.value);
    expect(Organization.fields.id.of).toBe(Organization);
    expect(Allowance.fields.limit.of).toBe(Allowance);
    expect(Allowance.fields.organization.from).toBe(Organization.fields.id);
    expect(Allowance.fields.limit.from).toBeUndefined();
  });

  it("fields become one schema", () => {
    const s = structOf({ organization: Allowance.fields.organization, limit: Allowance.fields.limit });
    expect(Schema.decodeUnknownExit(s)({ organization: "org_1", limit: "5" })._tag).toBe("Success");
    expect(Schema.decodeUnknownExit(s)({ organization: "alw_1", limit: "5" })._tag).toBe("Failure");
    expectTypeOf<(typeof s)["Type"]["limit"]>().toEqualTypeOf<bigint>();
  });

  it("is frozen", () => {
    expect(Object.isFrozen(Allowance)).toBe(true);
  });
});
