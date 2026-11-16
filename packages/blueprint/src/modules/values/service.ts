import { Schema } from "effect";
import type { Value, ValueMeta, ValuesApi } from "./types.ts";

const isValue = (x: unknown): x is Value =>
  typeof x === "object" && x !== null && (x as { kind?: unknown }).kind === "value";

const value = <S extends Schema.Constraint>(schema: S | Value<S>): Value<S> =>
  isValue(schema) ? (schema as Value<S>) : Object.freeze({ kind: "value", schema: schema as S, meta: { type: "schema" } as const });

const described = <S extends Schema.Constraint>(schema: S, meta: ValueMeta): Value<S> =>
  Object.freeze({ kind: "value", schema, meta: Object.freeze(meta) });

// Schema.brand refuses a generic key; every prefix here is one literal, so the narrowing is sound.
const brandBy = Schema.brand as unknown as <B extends string>(b: B) => (s: Schema.String) => Schema.brand<Schema.String, B>;

const id = <const P extends string>(prefix: P) =>
  described(brandBy(prefix)(Schema.String.check(Schema.isPattern(new RegExp(`^${prefix}_[0-9a-z]+$`)))), { type: "id", prefix });

export const Values: ValuesApi = {
  value,
  id,
  uint: (bits) =>
    described(Schema.BigIntFromString.check(Schema.isGreaterThanOrEqualToBigInt(0n), Schema.isLessThanBigInt(1n << BigInt(bits))), {
      type: "uint",
      bits,
    }),
  text: (options) => {
    const max = options?.max ?? 200;
    return described(Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(max)), { type: "text", max });
  },
};

export { isValue };
