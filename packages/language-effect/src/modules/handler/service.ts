import { Cause, Data, Duration, Effect, Ref, Schema } from "effect";
import type { CallStep, Operation, Principal } from "orthograph";
import { ErrorNames } from "orthograph/server";
import { Access } from "#modules/access/service.js";
import { Calls } from "#modules/calls/service.js";
import type { CallRunner, CallWiring } from "#modules/calls/types.js";
import { Unit } from "#modules/records/service.js";
import { Records, Store } from "#modules/records/types.js";
import { Busy } from "#modules/work/types.js";
import { BlankReached, IdempotencyConflict, InvalidPayload, type HandlerApi } from "./types.ts";
import { canonical, sha256 } from "./internal/digest.ts";
import { answerAttributes, payloadAttributes, principalAttributes } from "./internal/attributes.ts";
import { measureCall } from "./internal/call-metrics.ts";
import { Environment } from "./internal/environment.ts";
import { applyMove, checkFrom, chooseOutcome } from "./internal/move.ts";
import { prehandle, type Prehandled } from "./internal/prehandle.ts";
import { recordingLogs } from "./internal/decided.ts";
import { signalled, spanned } from "./internal/span.ts";
export { Reads } from "./internal/read.ts";
export { Environment } from "./internal/environment.ts";

type AnyCodec = Schema.Codec<object, unknown>;
type AnyHandler = (payload: object, context: { principal: Principal; steps: object; move: (to?: string) => Effect.Effect<void> } & Prehandled) => Effect.Effect<object, unknown, unknown>;

/** An update's version had moved on, so this attempt committed nothing. Never leaves the wrapper. */
class Conflict extends Data.TaggedError("Conflict")<{}> {}

/** Every round of contenders has at least one winner, so this many attempts outlasts any fair race (D2 #36). */
const ATTEMPTS = 64;

/** A call step: the adapter's call in a span named after the step, marked `call`. */
const callStep = (span: string, run: CallRunner) => (args: ReadonlyArray<unknown>, failure: (failure: never) => never) =>
  spanned(span, { "step.kind": "call" })(signalled(span)(run(args as never, failure as never)));

const tagOf = (e: unknown): string =>
  typeof e === "object" && e !== null && typeof (e as { _tag?: unknown })._tag === "string" ? (e as { _tag: string })._tag : String(e);

interface Spec {
  readonly name: string;
  readonly operation: unknown;
  readonly handler: AnyHandler;
  readonly notFrom?: string;
  readonly notFound?: Readonly<Record<string, string>>;
  readonly calls?: Readonly<Record<string, CallWiring>>;
  readonly codes?: Readonly<Record<string, string>>;
}

const serve = ({ name, operation, handler, notFrom, notFound = {}, calls, codes }: Spec) => {
  const op = operation as Operation;
  const budgetMs = op.budget === undefined ? undefined : Duration.toMillis(op.budget.p95);
  const decode = Schema.decodeUnknownEffect(op.payloadSchema as unknown as AnyCodec);
  const check = Schema.encodeEffect(op.answerSchema as unknown as AnyCodec);
  const refusals = new Set(op.errors.map(ErrorNames.nameOf).filter((tag) => tag !== undefined));
  if (notFrom !== undefined) refusals.add(notFrom);
  for (const tag of Object.values(notFound)) refusals.add(tag);
  if (op.allowed.some((role) => role.kind !== "anyone")) refusals.add("NotAllowed");
  if (op.idempotent === "request") refusals.add("IdempotencyConflict");
  const callRefusals = new Set([...refusals, "InvalidPayload"]);
  const steps = Object.fromEntries(
    // Each step is its own span, marked with its kind: a `database` step's work is the store's, a `wait` step's a timer's.
    Object.entries(op.steps).map(([key, step]) => [
      key,
      step.type === "call"
        ? callStep(`${name}.${key}`, Calls.runner({ label: `${name}.${key}`, step: step as CallStep, wiring: calls?.[key] }))
        : <A, E, R>(work: Effect.Effect<A, E, R>) => spanned(`${name}.${key}`, { "step.kind": step.type })(signalled(`${name}.${key}`)(work)),
    ]),
  );

  // One attempt: who may call, then the operation's own span (opened only once the caller may call, so a refused
  // caller leaves no handler span), the machine's check, the handler, its answer checked, its move, one commit.
  const decodeAnswer = Schema.decodeUnknownEffect(op.answerSchema as unknown as AnyCodec);
  const attempt = (payload: object, principal: Principal, key: string | undefined, number: number) =>
    Effect.gen(function* () {
      const store = yield* Store;
      const unit = yield* Unit.make(store);
      const withRecords = Effect.provideService(Records, unit.records);
      yield* Access.check({ allowed: op.allowed, payloadFields: op.payload, payload, principal, thing: op.thing }).pipe(withRecords, Effect.withTracerEnabled(false));
      const logs = yield* recordingLogs(payload, op.payload);
      return yield* Effect.gen(function* () {
        const busy = yield* Busy;
        yield* Effect.annotateCurrentSpan(payloadAttributes(payload, op.payload));
        // Where the call ran: the world's environment, and the kind of store its thing lives in.
        yield* Effect.annotateCurrentSpan({ environment: yield* Environment, store: op.thing.lives });
        // The same request key from the same caller is one call: answer what was answered, and change nothing.
        const kept = key === undefined ? undefined : yield* store.answered(key);
        if (kept !== undefined) {
          // The kept answer is bound to the payload it was made for: the same key with another payload is another request.
          const { payload: madeFor, answer } = JSON.parse(kept) as { readonly payload: string; readonly answer: unknown };
          if (madeFor !== sha256(canonical(payload))) return yield* new IdempotencyConflict();
          yield* Effect.annotateCurrentSpan({ "request.replayed": true });
          return yield* decodeAnswer(answer).pipe(Effect.orDie);
        }
        // What the payload names, read once and handed in; a missing one is refused before the handler, then the from-check.
        const handed = yield* prehandle(op, notFound, payload, unit);
        const from = yield* checkFrom(op, notFrom, handed.subject);
        const chosen = yield* Ref.make<string | undefined>(undefined);
        const move = (to?: string) => chooseOutcome(name, op, to).pipe(Effect.flatMap((o) => Ref.set(chosen, o)));
        const answer = yield* busy.counted(handler(payload, { principal, steps, move, ...handed })).pipe(Effect.provideService(Records, logs.watching(unit.records)), logs.around);
        // Recorded before the check, so an answer outside its declaration is evidence `prove` can name.
        yield* Effect.annotateCurrentSpan(answerAttributes(answer, op.answer));
        // An answer that breaks its declaration is the handler's bug, never the caller's: it dies, loudly.
        const wire = yield* check(answer).pipe(
          Effect.mapError((e) => new Error(`${name} answered outside its declaration: ${e.message}`)),
          Effect.orDie,
        );
        const outcome = yield* Ref.get(chosen);
        const entries = outcome === undefined ? [] : [yield* applyMove(name, op, payload, answer, outcome, unit, handed.id)];
        // The state the subject was in, written once the move is made: a refused call made no move.
        if (from !== undefined && outcome !== undefined) yield* Effect.annotateCurrentSpan({ "move.from": from });
        const request = key === undefined ? {} : { request: { key, answer: JSON.stringify({ payload: sha256(canonical(payload)), answer: wire }) } };
        const writes = yield* unit.writes;
        const committed = yield* store.commit({ writes, entries, ...request }).pipe(
          Effect.tap((outcome) => Effect.annotateCurrentSpan({
            "commit.outcome": outcome,
            // The event the move emitted, named only on the commit that journalled it: a conflicted attempt emitted nothing.
            ...(outcome === "committed" && entries[0] !== undefined ? { "event.name": entries[0].event } : {}),
          })),
          spanned(`${name}.commit`, { "step.kind": "commit", "commit.writes": writes.length, "commit.entries": entries.length }),
        );
        if (committed === "conflict") return yield* new Conflict();
        return answer;
      }).pipe(
        // Every refusal and every defect is written on the operation's span: what `prove` reads.
        // A refusal also carries the log that decided it, when the handler logged one before refusing.
        Effect.tapCause((cause) => {
          if (Cause.hasDies(cause)) return Effect.annotateCurrentSpan({ defect: Cause.pretty(cause).split("\n")[0] ?? "" });
          const refusal = Cause.squash(cause);
          if (refusal instanceof Conflict) return Effect.void;
          const tag = tagOf(refusal);
          const code = codes?.[tag];
          return logs.last.pipe(Effect.flatMap((log) =>
            Effect.annotateCurrentSpan({ refusal: tag, ...(code === undefined ? {} : { "refusal.code": code }), ...(log === undefined ? {} : { "refusal.log": log }) })));
        }),
        spanned(name, { operation: name, attempt: number, ...principalAttributes(principal) }),
      );
    });

  const run = (payload: object, principal: Principal, request?: string) => {
    // Keyed by operation and caller as well, so one caller's key never answers another's call.
    const who = principal.kind === "person" ? principal.person : "anonymous";
    const key = op.idempotent === "request" && request !== undefined ? `${name}|${who}|${request}` : undefined;
    const loop = (number: number): Effect.Effect<object, unknown, unknown> =>
      attempt(payload, principal, key, number).pipe(
        Effect.catch((e) =>
          !(e instanceof Conflict) ? Effect.fail(e)
          : number < ATTEMPTS ? loop(number + 1)
          : Effect.die(new Error(`${name} lost its version race ${ATTEMPTS} times in a row`)),
        ),
      );
    return loop(1);
  };
  return {
    name,
    operation,
    call: (raw: unknown, principal: Principal) =>
      decode(raw).pipe(
        Effect.mapError((e) => new InvalidPayload({ issues: e.message })),
        Effect.flatMap((payload) => run(payload, principal)),
        measureCall(name, principal, callRefusals, budgetMs),
      ),
    run: (payload: object, principal: Principal, request?: string) => run(payload, principal, request).pipe(measureCall(name, principal, refusals, budgetMs)),
  };
};

/** Typed at the edge (`HandlerApi`); inside, one untyped implementation serves every operation. */
export const Handlers: HandlerApi = {
  serve: serve as unknown as HandlerApi["serve"],
  blank: ((what: string, kind?: "failure") => (kind === "failure" ? () => new BlankReached({ what }) : Effect.die(new BlankReached({ what })))) as unknown as HandlerApi["blank"],
};

/** Operations that run on the caller's device (M1.27): the generated SDK serves each plugin's `runs: "client"` operation with this. */
export { Device } from "./internal/device.ts";
