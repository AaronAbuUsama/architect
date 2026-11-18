import { Cause, Data, Effect, Ref, Schema } from "effect";
import type { Operation, Principal } from "@architect/blueprint";
import { Access } from "#modules/access/service.js";
import { Unit } from "#modules/records/service.js";
import { Records, Store } from "#modules/records/types.js";
import { Busy } from "#modules/work/types.js";
import { BlankReached, InvalidPayload, type HandlerApi } from "./types.ts";
import { answerAttributes, payloadAttributes, principalAttributes } from "./internal/attributes.ts";
import { applyMove, checkFrom, chooseOutcome } from "./internal/move.ts";
import { recordingLogs } from "./internal/decided.ts";
import { spanned } from "./internal/span.ts";
export { Reads } from "./internal/read.ts";

type AnyCodec = Schema.Codec<object, unknown>;
type AnyHandler = (payload: object, context: { principal: Principal; steps: object; move: (to?: string) => Effect.Effect<void> }) => Effect.Effect<object, unknown, unknown>;

/** An update's version had moved on, so this attempt committed nothing. Never leaves the wrapper. */
class Conflict extends Data.TaggedError("Conflict")<{}> {}

/** Every round of contenders has at least one winner, so this many attempts outlasts any fair race (D2 #36). */
const ATTEMPTS = 64;

const tagOf = (e: unknown): string =>
  typeof e === "object" && e !== null && typeof (e as { _tag?: unknown })._tag === "string" ? (e as { _tag: string })._tag : String(e);

const serve = ({ name, operation, handler, notFrom }: { readonly name: string; readonly operation: unknown; readonly handler: AnyHandler; readonly notFrom?: string }) => {
  const op = operation as Operation;
  const decode = Schema.decodeUnknownEffect(op.payloadSchema as unknown as AnyCodec);
  const check = Schema.encodeEffect(op.answerSchema as unknown as AnyCodec);
  const steps = Object.fromEntries(
    // Each step is its own span, marked with its kind: a `database` step's work is the store's, a `wait` step's a timer's.
    Object.entries(op.steps).map(([key, step]) => [
      key,
      <A, E, R>(work: Effect.Effect<A, E, R>) => spanned(`${name}.${key}`, { "step.kind": step.type })(work),
    ]),
  );

  // One attempt: who may call, then the operation's own span (opened only once the caller may call, so a refused
  // caller leaves no handler span), the machine's check, the handler, its answer checked, its move, one commit.
  const decodeAnswer = Schema.decodeUnknownEffect(op.answerSchema as unknown as AnyCodec);
  const attempt = (payload: object, principal: Principal, key: string | undefined) =>
    Effect.gen(function* () {
      const store = yield* Store;
      const unit = yield* Unit.make(store);
      const withRecords = Effect.provideService(Records, unit.records);
      yield* Access.check({ allowed: op.allowed, payloadFields: op.payload, payload, principal, thing: op.thing }).pipe(withRecords);
      const logs = yield* recordingLogs;
      return yield* Effect.gen(function* () {
        const busy = yield* Busy;
        yield* Effect.annotateCurrentSpan(payloadAttributes(payload, op.payload));
        // The same request key from the same caller is one call: answer what was answered, and change nothing.
        const kept = key === undefined ? undefined : yield* store.answered(key);
        if (kept !== undefined) {
          yield* Effect.annotateCurrentSpan({ "request.replayed": true });
          return yield* decodeAnswer(JSON.parse(kept)).pipe(Effect.orDie);
        }
        yield* checkFrom(op, notFrom, payload, unit);
        const chosen = yield* Ref.make<string | undefined>(undefined);
        const move = (to?: string) => chooseOutcome(name, op, to).pipe(Effect.flatMap((o) => Ref.set(chosen, o)));
        const answer = yield* busy.counted(handler(payload, { principal, steps, move })).pipe(withRecords, logs.around);
        // Recorded before the check, so an answer outside its declaration is evidence `prove` can name.
        yield* Effect.annotateCurrentSpan(answerAttributes(answer, op.answer));
        // An answer that breaks its declaration is the handler's bug, never the caller's: it dies, loudly.
        const wire = yield* check(answer).pipe(
          Effect.mapError((e) => new Error(`${name} answered outside its declaration: ${e.message}`)),
          Effect.orDie,
        );
        const outcome = yield* Ref.get(chosen);
        const entries = outcome === undefined ? [] : [yield* applyMove(name, op, payload, answer, outcome, unit)];
        const request = key === undefined ? {} : { request: { key, answer: JSON.stringify(wire) } };
        const committed = yield* store.commit({ writes: yield* unit.writes, entries, ...request });
        if (committed === "conflict") return yield* new Conflict();
        return answer;
      }).pipe(
        // Every refusal and every defect is written on the operation's span: what `prove` reads.
        // A refusal also carries the log that decided it, when the handler logged one before refusing.
        Effect.tapCause((cause) =>
          Cause.hasDies(cause)
            ? Effect.annotateCurrentSpan({ defect: Cause.pretty(cause).split("\n")[0] ?? "" })
            : logs.last.pipe(Effect.flatMap((log) =>
                Effect.annotateCurrentSpan({ refusal: tagOf(Cause.squash(cause)), ...(log === undefined ? {} : { "refusal.log": log }) }))),
        ),
        spanned(name, { operation: name, ...principalAttributes(principal) }),
      );
    });

  const run = (payload: object, principal: Principal, request?: string) => {
    // Keyed by operation and caller as well, so one caller's key never answers another's call.
    const who = principal.kind === "person" ? principal.person : "anonymous";
    const key = op.idempotent === "request" && request !== undefined ? `${name}|${who}|${request}` : undefined;
    const loop = (left: number): Effect.Effect<object, unknown, unknown> =>
      attempt(payload, principal, key).pipe(
        Effect.catch((e) =>
          !(e instanceof Conflict) ? Effect.fail(e)
          : left > 1 ? loop(left - 1)
          : Effect.die(new Error(`${name} lost its version race ${ATTEMPTS} times in a row`)),
        ),
      );
    return loop(ATTEMPTS);
  };
  return {
    name,
    call: (raw: unknown, principal: Principal) =>
      decode(raw).pipe(
        Effect.mapError((e) => new InvalidPayload({ issues: e.message })),
        Effect.flatMap((payload) => run(payload, principal)),
      ),
    run,
  };
};

/** Typed at the edge (`HandlerApi`); inside, one untyped implementation serves every operation. */
export const Handlers: HandlerApi = {
  serve: serve as unknown as HandlerApi["serve"],
  blank: (what) => Effect.die(new BlankReached({ what })),
};
