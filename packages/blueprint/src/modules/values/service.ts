import { Schema } from "effect";
import type { Value, ValuesApi } from "./types.ts";

const isValue = (x: unknown): x is Value =>
  typeof x === "object" && x !== null && (x as { kind?: unknown }).kind === "value";

const value = <S extends Schema.Constraint>(schema: S | Value<S>): Value<S> =>
  isValue(schema) ? (schema as Value<S>) : { kind: "value", schema: schema as S };

// Schema.brand refuses a generic key; every prefix here is one literal, so the narrowing is sound.
const brandBy = Schema.brand as unknown as <B extends string>(b: B) => (s: Schema.String) => Schema.brand<Schema.String, B>;

const id = <const P extends string>(prefix: P) =>
  value(brandBy(prefix)(Schema.String.check(Schema.isPattern(new RegExp(`^${prefix}_[0-9a-z]+$`)))));

export const Values: ValuesApi = {
  value,
  id,
  uint: (bits) =>
    value(Schema.BigInt.check(Schema.isGreaterThanOrEqualToBigInt(0n), Schema.isLessThanBigInt(1n << BigInt(bits)))),
  text: (options) => value(Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(options?.max ?? 200))),
};

export { isValue };
