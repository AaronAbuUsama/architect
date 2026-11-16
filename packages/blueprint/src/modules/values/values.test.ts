import { Schema } from "effect";
import { describe, expect, expectTypeOf, it } from "vitest";
import { Values } from "./service.ts";

const decode = <S extends Schema.Constraint>(s: S, x: unknown) =>
  Schema.decodeUnknownExit(s as never)(x)._tag;

describe("values", () => {
  it("describe themselves for the model", () => {
    expect(Values.id("alw").meta).toEqual({ type: "id", prefix: "alw" });
    expect(Values.value(Values.uint(128)).meta).toEqual({ type: "uint", bits: 128 });
  });

  it("ids keep their prefix and brand", () => {
    const AllowanceId = Values.id("alw");
    expect(decode(AllowanceId.schema, "alw_7f3k")).toBe("Success");
    expect(decode(AllowanceId.schema, "org_7f3k")).toBe("Failure");
    const OrgId = Values.id("org");
    expectTypeOf<Schema.Schema.Type<typeof AllowanceId.schema>>().not.toEqualTypeOf<Schema.Schema.Type<typeof OrgId.schema>>();
  });

  it("uints are bounded bigints", () => {
    const U8 = Values.uint(8);
    expect(decode(U8.schema, 255n)).toBe("Success");
    expect(decode(U8.schema, 256n)).toBe("Failure");
    expect(decode(U8.schema, -1n)).toBe("Failure");
  });

  it("text is never empty", () => {
    expect(decode(Values.text().schema, "")).toBe("Failure");
    expect(decode(Values.text({ max: 3 }).schema, "abcd")).toBe("Failure");
  });
});
