import { Cause, Effect, Ref, Schema } from "effect";
import type { Operation, Principal } from "@architect/blueprint";
import { Access } from "#modules/access/service.ts";
import { Busy } from "#modules/work/types.ts";
import { BlankReached, InvalidPayload, type HandlerApi } from "./types.ts";
import { answerAttributes, payloadAttributes, principalAttributes } from "./internal/attributes.ts";
import { applyMove, chooseOutcome } from "./internal/move.ts";

type AnyCodec = Schema.Codec<object, unknown>;
type AnyHandler = (payload: object, context: { principal: Principal; steps: object; move: (to?: string) => Effect.Effect<void> }) => Effect.Effect<object, unknown, never>;

const tagOf = (e: unknown): string =>
  typeof e === "object" && e !== null && typeof (e as { _tag?: unknown })._tag === "string" ? (e as { _tag: string })._tag : String(e);

const serve = ({ name, operation, handler }: { readonly name: string; readonly operation: unknown; readonly handler: AnyHandler }) => {
  const op = operation as Operation;
  const decode = Schema.decodeUnknownEffect(op.payloadSchema as unknown as AnyCodec);
  const check = Schema.encodeEffect(op.answerSchema as unknown as AnyCodec);
  const steps = Object.fromEntries(
    Object.keys(op.steps).map((key) => [key, <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.withSpan(work, `${name}.${key}`)]),
  );
  // The handler's own span: opened only once the caller may call, so a refused caller leaves no handler span.
  const handle = (payload: object, principal: Principal) =>
    Effect.gen(function* () {
      const busy = yield* Busy;
      yield* Effect.annotateCurrentSpan(payloadAttributes(payload));
      const chosen = yield* Ref.make<string | undefined>(undefined);
      const move = (to?: string) => chooseOutcome(name, op, to).pipe(Effect.flatMap((o) => Ref.set(chosen, o)));
      const answer = yield* busy.counted(handler(payload, { principal, steps, move }));
      // Recorded before the check, so an answer outside its declaration is evidence `prove` can name.
      yield* Effect.annotateCurrentSpan(answerAttributes(answer));
      // An answer that breaks its declaration is the handler's bug, never the caller's: it dies, loudly.
      yield* check(answer).pipe(
        Effect.mapError((e) => new Error(`${name} answered outside its declaration: ${e.message}`)),
        Effect.orDie,
      );
      const outcome = yield* Ref.get(chosen);
      if (outcome !== undefined) yield* applyMove(name, op, payload, answer, outcome);
      return answer;
    }).pipe(
      // Every refusal and every defect is written on the operation's span: what `prove` reads.
      Effect.tapCause((cause) =>
        Effect.annotateCurrentSpan(
          Cause.hasDies(cause) ? { defect: Cause.pretty(cause).split("\n")[0] ?? "" } : { refusal: tagOf(Cause.squash(cause)) },
        ),
      ),
      Effect.withSpan(name, { attributes: { operation: name, ...principalAttributes(principal) } }),
    );
  const run = (payload: object, principal: Principal) =>
    Access.check({ allowed: op.allowed, payloadFields: op.payload, payload, principal }).pipe(
      Effect.andThen(handle(payload, principal)),
    );
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
