// The handler wrapper: what every generated operation runs through. Decode, check who may call, run the handler as
// counted work inside the operation's span, check the answer, give it back.
import { Data, type Effect, type Schema } from "effect";
import type { AnswerOf, ErrorOf, PayloadOf, Principal, Read, StepsOf } from "orthograph";
import type { NotAllowed } from "#modules/access/types.js";
import type { CallRunner, CallWiring, Callable } from "#modules/calls/types.js";
import type { Records, Store } from "#modules/records/types.js";
import type { Busy } from "#modules/work/types.js";

/** The payload didn't match the operation's declaration. Refused before the handler runs. */
export class InvalidPayload extends Data.TaggedError("InvalidPayload")<{ readonly issues: string }> {}

/**
 * Each declared step, as a function that runs its work in a span named `<thing>.<verb>.<key>`. A call step runs the
 * adapter's callable instead (`steps.price([payload.origin], failure)`), typed by `C[key]`, the callable's own type.
 */
export type StepRunners<St, C = {}> = {
  readonly [K in keyof St]: St[K] extends { readonly type: "call" }
    ? CallRunner<K extends keyof C ? (C[K] extends Callable ? C[K] : Callable) : Callable>
    : <A, E, R>(work: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
};

export interface HandlerContext<O, C = {}> {
  readonly principal: Principal;
  readonly steps: StepRunners<StepsOf<O>, C>;
  /**
   * Make the operation's move, ending in `to` (or its only outcome). Applied once the handler answers: the instance's
   * state is set and the move's event journalled. A handler that never calls it makes no move and emits nothing.
   */
  readonly move: (to?: MoveTo<O>) => Effect.Effect<void>;
}

type MoveTo<O> = O extends { readonly move: infer M } ? (NonNullable<M> extends { readonly to: ReadonlyArray<infer S> } ? S : never) : never;

/** What a project writes in `<verb>.handler.ts`: the declared payload in, the declared answer or a declared error out. */
export type Handler<O, R = never, C = {}> = (payload: PayloadOf<O>, context: HandlerContext<O, C>) => Effect.Effect<AnswerOf<O>, ErrorOf<O>, R>;

export interface Served<O, R> {
  readonly name: string;
  /** From the outside: decode first, refusing with `InvalidPayload`. */
  readonly call: (payload: unknown, principal: Principal) => Effect.Effect<AnswerOf<O>, ErrorOf<O> | InvalidPayload | NotAllowed | NotFrom, Exclude<R, Records> | Busy | Store>;
  /**
   * From a server that has already decoded the payload against the same declaration. `request` is the caller's
   * idempotency key: for an operation declared `idempotent: "request"`, the same key from the same caller is one call.
   */
  readonly run: (payload: PayloadOf<O>, principal: Principal, request?: string) => Effect.Effect<AnswerOf<O>, ErrorOf<O> | NotAllowed | NotFrom, Exclude<R, Records> | Busy | Store>;
}

/** The machine's own refusal: the instance is in a state the move can't start from. Named `<Thing>Not<State>`. */
export class NotFrom extends Data.Error<{ readonly _tag: string; readonly state: string }> {}

/** A scaffolded handler not written yet. Reaching it is a defect that names what's missing. */
export class BlankReached extends Data.TaggedError("BlankReached")<{ readonly what: string }> {
  override get message() { return this.what; }
}

export interface HandlerApi {
  /** `name` comes from the generated code, which got it from the operation's path. */
  readonly serve: <O, R>(spec: {
    readonly name: string;
    readonly operation: O;
    readonly handler: Handler<O, R, any>;
    /** What each call step runs: the adapter's callable, and its layer when it has one. Wired by the generated server. */
    readonly calls?: Readonly<Record<string, CallWiring>>;
    /** The machine's refusal for this operation's move, `<Thing>Not<State>`, named by the generated code. */
    readonly notFrom?: string;
  }) => Served<O, R>;
  readonly blank: {
    /** What a scaffold returns until it is written: dies with `BlankReached`, typed as anything. */
    <A = never>(what: string): Effect.Effect<A>;
    /** In the place of a call's failure mapping: the call that reaches it is a defect that names what's missing. */
    (what: string, kind: "failure"): (failure: unknown) => never;
  };
}

// Reads: a thing's instance by its id, or a page of them, answered from the store with no handler (L1.23, L2.04).

/** What a read answers: the fields it names, decoded, with `state` as text; or a list's `{ items, next }`. */
export type ReadAnswer = { readonly [field: string]: unknown };

/** What a read is called with: `{ id }`, or a list's filters and cursor. */
export type ReadPayload = { readonly [field: string]: unknown };

export interface ServedRead {
  readonly name: string;
  /** From the outside: the payload decoded first. */
  readonly call: (payload: unknown, principal: Principal) => Effect.Effect<ReadAnswer, NotAllowed | Schema.SchemaError, Store>;
  /** From a server that already decoded the payload. */
  readonly run: (payload: ReadPayload, principal: Principal) => Effect.Effect<ReadAnswer, NotAllowed, Store>;
}

export interface ReadsApi {
  /**
   * Serve a read: who may read is checked first (on the instance itself for a read by id, on the thing a filter names
   * for a list), then its answer is made. A missing id is refused `NotAllowed`, so a read never tells an outsider what
   * exists; a list answers `{ items, next }`, and `next` goes back as the `cursor` of the page after it.
   */
  readonly serve: <R extends Read<any, any, any>>(spec: { readonly name: string; readonly read: R }) => ServedRead;
}
