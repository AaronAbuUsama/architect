// The operation's move: the machine's check before the handler, the outcome the handler chose, and the state and
// journal entry the commit carries.
import { Effect, Schema } from "effect";
import type { Operation } from "orthograph";
import { EventNames } from "orthograph/server";
import type { Entry } from "#modules/journal/types.js";
import type { Unit } from "#modules/records/types.js";
import { NotFrom } from "../types.ts";
import { journalled } from "./attributes.ts";

type Codec = Schema.Codec<Record<string, unknown>, Record<string, unknown>>;

/** The instance that moves: the answer's or the payload's field declared as the thing's own id. */
export const subjectOf = (op: Operation, payload: object, answer: object = {}): string | undefined => {
  const idField = op.thing.fields["id"];
  for (const [fields, values] of [[op.answer, answer], [op.payload, payload]] as const) {
    for (const [k, f] of Object.entries(fields)) {
      const v = (values as Record<string, unknown>)[k];
      // By place, not by identity: a field marked secret is a copy of the thing's own, and still is it.
      if (f.kind === "field" && idField && f.of === idField.of && f.key === idField.key && typeof v === "string") return v;
    }
  }
  return undefined;
};

/**
 * The machine's own refusal, before the handler: the subject exists but is in a state the move can't start from.
 * Reading it here also fixes the version the commit is guarded by, so the check still holds when the move lands.
 * Gives back the state the subject was in (the span's `move.from`), or nothing when the move creates or the subject is absent.
 */
export const checkFrom = (op: Operation, refusal: string | undefined, payload: object, unit: Unit) =>
  Effect.gen(function* () {
    const move = op.move;
    if (!move || move.from.length === 0 || refusal === undefined) return undefined;
    const subject = subjectOf(op, payload);
    if (subject === undefined) return undefined;
    const found = yield* unit.read(op.thing, subject);
    if (!found) return undefined;
    const state = found.state ?? "none";
    if (!move.from.includes(state)) return yield* Effect.fail(new NotFrom({ _tag: refusal, state }));
    return state;
  });

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

/** Set the subject's state in this attempt's unit, and give back the journal entry the commit writes with it. */
export const applyMove = (name: string, op: Operation, payload: object, answer: object, outcome: string, unit: Unit) =>
  Effect.gen(function* () {
    const move = op.move!;
    const subject = subjectOf(op, payload, answer);
    if (subject === undefined) return yield* Effect.die(new Error(`${name} moved, but neither its answer nor its payload names the ${move.key}'s instance`));
    const event = EventNames.nameOf(move.emits) ?? "UnnamedEvent";
    // An event's fields come from the subject as this call left it, then the payload, then the answer.
    const instance = (yield* unit.read(op.thing, subject)) ?? {};
    const source = { ...instance, ...payload, ...answer } as Record<string, unknown>;
    const missing = Object.keys(move.emits.fields).filter((k) => !(k in source));
    if (missing.length > 0) return yield* Effect.die(new Error(`${name}: ${event} needs ${missing.join(", ")}, found in neither its instance, answer nor payload`));
    const picked = Object.fromEntries(Object.keys(move.emits.fields).map((k) => [k, source[k]]));
    const encoded = yield* Schema.encodeEffect(move.emits.schema as unknown as Codec)(picked).pipe(Effect.orDie);
    // The journal is a record anyone who reads it can see: a secret or private field of the event is not written to it.
    const fields = Object.fromEntries(Object.entries(encoded).filter(([k]) => journalled(move.emits.fields, k)));
    yield* unit.setState(op.thing, subject, outcome);
    const trace = yield* Effect.currentSpan.pipe(Effect.map((s) => s.traceId), Effect.orElseSucceed(() => ""));
    return { trace, operation: name, move: move.key, subject, event, fields } satisfies Entry;
  });
