import { Effect, Schema } from "effect";
import { NotAllowed, type Principal } from "@architect/blueprint";
import { Access } from "#modules/access/service.js";
import { Unit } from "#modules/records/service.js";
import { Records, Store } from "#modules/records/types.js";
import { answerAttributes, payloadAttributes, principalAttributes } from "./attributes.ts";
import type { ReadsApi } from "../types.ts";

type AnyCodec = Schema.Codec<object, unknown>;

/** Reads are served beside operations: the same role check, the same span, no handler. */
export const Reads: ReadsApi = {
  serve: ({ name, read }) => {
    const decode = Schema.decodeUnknownEffect(read.payloadSchema as unknown as AnyCodec);
    const check = Schema.encodeEffect(read.answerSchema as unknown as AnyCodec);
    const run = (payload: { readonly id: string }, principal: Principal) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(yield* Store);
        yield* Access.check({ allowed: read.allowed, payloadFields: read.payload, payload, principal, thing: read.thing }).pipe(
          Effect.provideService(Records, unit.records),
        );
        return yield* Effect.gen(function* () {
          yield* Effect.annotateCurrentSpan(payloadAttributes(payload));
          const found = yield* unit.read(read.thing, payload.id);
          if (!found) return yield* new NotAllowed();
          const answer = Object.fromEntries(read.fields.map((f) => [f, f === "state" ? (found.state ?? "none") : found[f as string]]));
          yield* Effect.annotateCurrentSpan(answerAttributes(answer));
          yield* check(answer).pipe(Effect.mapError((e) => new Error(`${name} answered outside its declaration: ${e.message}`)), Effect.orDie);
          return answer;
        }).pipe(Effect.withSpan(name, { attributes: { operation: name, ...principalAttributes(principal) } }));
      });
    return {
      name,
      run,
      call: (raw, principal) => decode(raw).pipe(Effect.flatMap((p) => run(p as { id: string }, principal))),
    };
  },
};
