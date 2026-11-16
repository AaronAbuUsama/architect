// Type tests: the declaration decides what a handler and a client may say. `@ts-expect-error` lines are checked by tsc.
import { describe, expect, expectTypeOf, it } from "vitest";
import { Values } from "#modules/values/service.js";
import { Things } from "#modules/things/service.js";
import { Errors } from "#modules/errors/service.js";
import { Roles } from "#modules/roles/service.js";
import { Operations } from "./service.ts";
import type { AnswerOf, ErrorOf, PayloadOf, StepsOf } from "./types.ts";

const Organization = Things.thing({ description: "x", fields: { id: Values.id("org"), owner: Values.id("per") } });
const owner = Roles.role(Organization, { rule: (o, p) => o.owner === p.person });
const Allowance = Things.thing({
  description: "x",
  fields: { id: Values.id("alw"), organization: Organization.fields.id, limit: Values.uint(128) },
});
class AllowanceLimitTooHigh extends Errors.error({ cap: Values.uint(128) }, { exit: 44 }) {}

const grant = Operations.operation(Allowance, {
  description: "Grant.",
  payload: { organization: Allowance.fields.organization, limit: Allowance.fields.limit },
  answer: { allowance: Allowance.fields.id },
  errors: [AllowanceLimitTooHigh],
  allowed: [owner.of("organization")],
  steps: { insert: Operations.step.database() },
  budget: { p95: "200 millis" },
});

describe("operations", () => {
  it("keep what was declared", () => {
    expect(grant.kind).toBe("operation");
    expect(grant.steps.insert.type).toBe("database");
    expect(grant.errors).toEqual([AllowanceLimitTooHigh]);
  });

  it("type the payload, answer, errors and steps", () => {
    expectTypeOf<PayloadOf<typeof grant>["limit"]>().toEqualTypeOf<bigint>();
    expectTypeOf<keyof AnswerOf<typeof grant>>().toEqualTypeOf<"allowance">();
    expectTypeOf<ErrorOf<typeof grant>>().toEqualTypeOf<AllowanceLimitTooHigh>();
    expectTypeOf<keyof StepsOf<typeof grant>>().toEqualTypeOf<"insert">();
  });

  it("refuse an answer of the wrong type", () => {
    // @ts-expect-error a number is not an allowance id
    const wrongType: AnswerOf<typeof grant> = { allowance: 123 };
    // @ts-expect-error an organisation id is not an allowance id
    const wrongId: AnswerOf<typeof grant> = { allowance: "org_1" as PayloadOf<typeof grant>["organization"] };
    expect([wrongType, wrongId]).toHaveLength(2);
  });

  it("refuse a role pointing at a field the payload doesn't have", () => {
    Operations.operation(Allowance, {
      description: "Grant.",
      payload: { limit: Allowance.fields.limit },
      answer: {},
      // @ts-expect-error the payload has no field `organization`
      allowed: [owner.of("organization")],
    });
  });
});
