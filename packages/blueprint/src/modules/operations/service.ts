import { structOf } from "#modules/things/service.ts";
import { Values } from "#modules/values/service.ts";
import type { FieldsInput } from "#modules/things/types.ts";
import type { Operation, OperationsApi, Step } from "./types.ts";

/** A machine state as a read answers it: text. */
const State = Values.text({ max: 64 });

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
  read: (thing, spec) => {
    // A read by id: its payload is the thing's id, its answer the fields it names, `state` as text.
    const payload: FieldsInput = { id: thing.fields["id"]! };
    const answer: FieldsInput = Object.fromEntries(
      spec.fields.map((f) => [f, f === "state" ? State : thing.fields[f as string]!] as const),
    );
    return Object.freeze({
      kind: "read", thing, by: spec.by, fields: spec.fields, allowed: spec.allowed, budget: spec.budget,
      payload, answer, payloadSchema: structOf(payload), answerSchema: structOf(answer),
    }) as never;
  },
  step: {
    database: () => Object.freeze({ kind: "step", type: "database" }) as Step<"database">,
    wait: () => Object.freeze({ kind: "step", type: "wait" }) as Step<"wait">,
  },
};
