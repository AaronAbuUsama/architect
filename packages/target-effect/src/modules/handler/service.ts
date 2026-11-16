import { Effect, Schema } from "effect";
import type { Operation, Principal } from "@architect/blueprint";
import { Busy } from "#modules/work/types.ts";
import { BlankReached, InvalidPayload, type HandlerApi } from "./types.ts";
import { payloadAttributes, principalAttributes } from "./internal/attributes.ts";

type AnyCodec = Schema.Codec<object, unknown>;
type AnyHandler = (payload: object, context: { principal: Principal; steps: object }) => Effect.Effect<object, unknown, never>;

const serve = ({ name, operation, handler }: { readonly name: string; readonly operation: unknown; readonly handler: AnyHandler }) => {
  const op = operation as Operation;
  const decode = Schema.decodeUnknownEffect(op.payloadSchema as unknown as AnyCodec);
  const check = Schema.encodeEffect(op.answerSchema as unknown as AnyCodec);
  const steps = Object.fromEntries(
    Object.keys(op.steps).map((key) => [key, <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.withSpan(work, `${name}.${key}`)]),
  );
  const run = (payload: object, principal: Principal) =>
    Effect.gen(function* () {
      const busy = yield* Busy;
      yield* Effect.annotateCurrentSpan(payloadAttributes(payload));
      const answer = yield* busy.counted(handler(payload, { principal, steps }));
      // An answer that breaks its declaration is the handler's bug, never the caller's: it dies, loudly.
      yield* check(answer).pipe(
        Effect.mapError((e) => new Error(`${name} answered outside its declaration: ${e.message}`)),
        Effect.orDie,
      );
      return answer;
    });
  const span = { attributes: { operation: name } };
  return {
    name,
    call: (raw: unknown, principal: Principal) =>
      decode(raw).pipe(
        Effect.mapError((e) => new InvalidPayload({ issues: e.message })),
        Effect.flatMap((payload) => run(payload, principal)),
        Effect.withSpan(name, { attributes: { ...span.attributes, ...principalAttributes(principal) } }),
      ),
    run: (payload: object, principal: Principal) =>
      run(payload, principal).pipe(Effect.withSpan(name, { attributes: { ...span.attributes, ...principalAttributes(principal) } })),
  };
};

/** Typed at the edge (`HandlerApi`); inside, one untyped implementation serves every operation. */
export const Handlers: HandlerApi = {
  serve: serve as unknown as HandlerApi["serve"],
  blank: (what) => Effect.die(new BlankReached({ what })),
};
