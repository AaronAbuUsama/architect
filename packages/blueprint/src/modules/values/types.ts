// Values: the named types fields are made of. A value carries its schema; later layers add its Solidity type.
import type { Schema } from "effect";

export interface Value<S extends Schema.Constraint = Schema.Constraint> {
  readonly kind: "value";
  readonly schema: S;
  /** What the value is, for the model: stable across reformatting, and readable by every target. */
  readonly meta: ValueMeta;
}

export type ValueMeta =
  | { readonly type: "id"; readonly prefix: string }
  | { readonly type: "uint"; readonly bits: number }
  | { readonly type: "text"; readonly max: number }
  | { readonly type: "schema" };

/** The TypeScript type a value holds. */
export type TypeOf<V extends Value> = V["schema"]["Type"];

export interface ValuesApi {
  /** Name a type: `export const Amount = Blueprint.value(Blueprint.uint(128))`. */
  readonly value: <S extends Schema.Constraint>(schema: S | Value<S>) => Value<S>;
  /** An identifier with a short prefix, such as `alw_7f3k`. Ids of different things never mix. */
  readonly id: <const P extends string>(prefix: P) => Value<Schema.brand<Schema.String, P>>;
  /** A whole number from 0 below 2^bits, carried as a bigint. */
  readonly uint: (bits: number) => Value<Schema.BigInt>;
  /** Text, never empty, at most `max` characters (default 200). */
  readonly text: (options?: { readonly max?: number }) => Value<Schema.String>;
}
