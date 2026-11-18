// Ids for new instances: the thing's prefix, then random base-36. Random comes from Effect, so a world can seed it.
import type { Effect } from "effect";
import type { Field, Value } from "@formants/forman";

export interface IdsApi {
  /** A fresh id with this prefix: `alw_3k9x...`. */
  readonly make: (prefix: string) => Effect.Effect<string>;
  /** A fresh id for a thing's id field, typed as that field: `Ids.of(Allowance.fields.id)`. */
  readonly of: <V extends Value>(field: Field<V>) => Effect.Effect<V["schema"]["Type"]>;
}
