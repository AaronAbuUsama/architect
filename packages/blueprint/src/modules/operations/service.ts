import { structOf } from "#modules/things/service.ts";
import type { Operation, OperationsApi, Step } from "./types.ts";

export const Operations: OperationsApi = {
  operation: (thing, spec) =>
    Object.freeze({
      kind: "operation",
      thing,
      description: spec.description,
      payload: spec.payload,
      answer: spec.answer,
      payloadSchema: structOf(spec.payload),
      answerSchema: structOf(spec.answer),
      move: spec.move,
      errors: spec.errors ?? [],
      allowed: spec.allowed,
      steps: spec.steps ?? {},
      idempotent: spec.idempotent,
      budget: spec.budget,
    }) as unknown as Operation<typeof thing, typeof spec.payload, typeof spec.answer, never, never> as never,
  read: (thing, spec) =>
    Object.freeze({ kind: "read", thing, by: spec.by, fields: spec.fields, allowed: spec.allowed, budget: spec.budget }),
  step: {
    database: () => Object.freeze({ kind: "step", type: "database" }) as Step<"database">,
    wait: () => Object.freeze({ kind: "step", type: "wait" }) as Step<"wait">,
  },
};
