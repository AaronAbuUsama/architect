// The handler wrapper: what every generated operation runs through. Decode, check who may call, run the handler as
// counted work inside the operation's span, check the answer, give it back.
import { Data, type Effect } from "effect";
import type { AnswerOf, ErrorOf, PayloadOf, Principal, StepsOf } from "@architect/blueprint";
import type { NotAllowed } from "#modules/access/types.ts";
import type { Records } from "#modules/records/types.ts";
import type { Busy } from "#modules/work/types.ts";

/** The payload didn't match the operation's declaration. Refused before the handler runs. */
export class InvalidPayload extends Data.TaggedError("InvalidPayload")<{ readonly issues: string }> {}

/** Each declared step, as a function that runs its work in a span named `<thing>.<verb>.<key>`. */
export type StepRunners<St> = {
  readonly [K in keyof St]: <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
};

export interface HandlerContext<O> {
  readonly principal: Principal;
  readonly steps: StepRunners<StepsOf<O>>;
}

/** What a project writes in `<verb>.handler.ts`: the declared payload in, the declared answer or a declared error out. */
export type Handler<O, R = never> = (payload: PayloadOf<O>, context: HandlerContext<O>) => Effect.Effect<AnswerOf<O>, ErrorOf<O>, R>;

export interface Served<O, R> {
  readonly name: string;
  /** From the outside: decode first, refusing with `InvalidPayload`. */
  readonly call: (payload: unknown, principal: Principal) => Effect.Effect<AnswerOf<O>, ErrorOf<O> | InvalidPayload | NotAllowed, R | Busy | Records>;
  /** From a server that has already decoded the payload against the same declaration. */
  readonly run: (payload: PayloadOf<O>, principal: Principal) => Effect.Effect<AnswerOf<O>, ErrorOf<O> | NotAllowed, R | Busy | Records>;
}

/** A scaffolded handler not written yet. Reaching it is a defect that names what's missing. */
export class BlankReached extends Data.TaggedError("BlankReached")<{ readonly what: string }> {}

export interface HandlerApi {
  /** `name` comes from the generated code, which got it from the operation's path. */
  readonly serve: <O, R>(spec: { readonly name: string; readonly operation: O; readonly handler: Handler<O, R> }) => Served<O, R>;
  /** What a scaffold returns until it is written: dies with `BlankReached`, typed as anything. */
  readonly blank: <A = never>(what: string) => Effect.Effect<A>;
}
