// Refusals on the wire. A handler fails with the blueprint's error classes; the API sends the generated wire classes,
// matched by name, carrying the same fields.
import type { Effect } from "effect";

/** The generated wire classes, by error name. */
export type WireClasses = { readonly [name: string]: new (fields: never) => unknown };

export interface WireApi {
  /** Turn each declared error into its wire class. An error with no wire class was never declared: it dies. */
  readonly refusals: (classes: WireClasses) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, unknown, R>;
}
