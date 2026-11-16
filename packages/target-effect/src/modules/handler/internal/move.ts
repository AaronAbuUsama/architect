// The operation's move: chosen by the handler with `move(to?)`, applied by the wrapper once the handler has answered.
import { Effect, Schema } from "effect";
import type { Operation } from "@architect/blueprint";
import { EventNames } from "@architect/blueprint/server";
import { Journal } from "#modules/journal/types.ts";
import { Records } from "#modules/records/types.ts";

type Codec = Schema.Codec<Record<string, unknown>, Record<string, unknown>>;

/** The outcome a handler asked for: one of the move's `to`, or it dies naming what it asked for. */
export const chooseOutcome = (name: string, op: Operation, to: string | undefined) =>
  Effect.gen(function* () {
    if (!op.move) return yield* Effect.die(new Error(`${name} has no move, so its handler cannot make one`));
    const outcome = to ?? (op.move.to.length === 1 ? op.move.to[0] : undefined);
    // Written before the check, so a wrong outcome is evidence too, not just a crash.
    yield* Effect.annotateCurrentSpan({ "move.name": op.move.key, "move.to": String(outcome) });
    if (outcome === undefined || !op.move.to.includes(outcome)) {
      return yield* Effect.die(new Error(`${name} moved to ${outcome}, which ${op.move.key} does not declare (${op.move.to.join(", ")})`));
    }
    return outcome;
  });

/** The instance that moves: the answer's or the payload's field declared as the thing's own id. */
const subjectOf = (op: Operation, payload: object, answer: object): string | undefined => {
  const idField = op.thing.fields["id"];
  for (const [fields, values] of [[op.answer, answer], [op.payload, payload]] as const) {
    for (const [k, f] of Object.entries(fields)) {
      const v = (values as Record<string, unknown>)[k];
      if (f === idField && typeof v === "string") return v;
    }
  }
  return undefined;
};

/** Set the state and journal the event, its fields taken from the answer, then the payload. */
export const applyMove = (name: string, op: Operation, payload: object, answer: object, outcome: string) =>
  Effect.gen(function* () {
    const move = op.move!;
    const subject = subjectOf(op, payload, answer);
    if (subject === undefined) return yield* Effect.die(new Error(`${name} moved, but neither its answer nor its payload names the ${move.key}'s instance`));
    const event = EventNames.nameOf(move.emits) ?? "UnnamedEvent";
    const source = { ...payload, ...answer } as Record<string, unknown>;
    const missing = Object.keys(move.emits.fields).filter((k) => !(k in source));
    if (missing.length > 0) return yield* Effect.die(new Error(`${name}: ${event} needs ${missing.join(", ")}, found in neither answer nor payload`));
    const picked = Object.fromEntries(Object.keys(move.emits.fields).map((k) => [k, source[k]]));
    const fields = yield* Schema.encodeEffect(move.emits.schema as unknown as Codec)(picked).pipe(Effect.orDie);
    const records = yield* Records;
    yield* records.setState(op.thing, subject, outcome);
    const trace = yield* Effect.currentSpan.pipe(Effect.map((s) => s.traceId), Effect.orElseSucceed(() => ""));
    const journal = yield* Journal;
    yield* journal.record({ trace, operation: name, move: move.key, subject, event, fields });
    yield* Effect.annotateCurrentSpan({ "event.name": event });
  });
