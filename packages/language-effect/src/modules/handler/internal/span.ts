// O1's conventions for how a span ends. A declared refusal is an outcome the operation was built to give, so its span
// ends ok (it must not turn a trace red, count in an error list or open an issue); a defect, a failure nothing
// declared, is the only error. Effect ends a span with the exit of its work, so a refusal would end it as an error.
import { Effect, Result, Tracer } from "effect";

/**
 * `work` in a span named `name` that ends ok when the work fails with a typed failure (a refusal), and as an error
 * when it dies. The failure itself still leaves the span, unchanged, for the caller to handle.
 */
export const spanned = (name: string, attributes: Record<string, unknown>) => <A, E, R>(work: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
  work.pipe(
    Effect.result,
    Effect.withSpan(name, { attributes }),
    Effect.flatMap((outcome) => (Result.isFailure(outcome) ? Effect.fail(outcome.failure) : Effect.succeed(outcome.success))),
  );

/** The role check, run as the operation's first child span `<name>.access`. Its refusal is written on the operation's span. */
export const accessSpan = <A, E, R>(name: string, check: Effect.Effect<A, E, R>) => spanned(`${name}.access`, { "step.kind": "access" })(check);

/** Writes attributes on a span. Attributes are always JSON-able values. */
export type Annotate = (attributes: Record<string, unknown>) => Effect.Effect<void>;

/** Writes on the span current now. Called once, at the top of a span, it gives that span to code that runs deeper. */
export const annotateHere: Effect.Effect<Annotate> = Effect.currentSpan.pipe(
  Effect.map((span: Tracer.Span): Annotate => (attributes) => Effect.sync(() => { for (const [k, v] of Object.entries(attributes)) span.attribute(k, v); })),
  Effect.orElseSucceed((): Annotate => (attributes) => Effect.annotateCurrentSpan(attributes)),
);
