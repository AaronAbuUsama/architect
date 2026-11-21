// The wire of a whole number: base-unit digits only (M6-money (c)). The pattern is on the string, so `007`, `-0`, `+1`,
// `1.5`, `1e3` and spaces are refused before any number is made; the range is on the bigint.
import { Schema, SchemaTransformation } from "effect";

const UNSIGNED = /^(0|[1-9][0-9]*)$/;
const SIGNED = /^(0|-?[1-9][0-9]*)$/;

/** `uint<bits>` when unsigned, `int<bits>` when signed: a bigint in code, a digit string on the wire. */
export const whole = (signed: boolean, bits: number): Schema.BigIntFromString => {
  const [low, high] = signed ? [-(1n << BigInt(bits - 1)), (1n << BigInt(bits - 1)) - 1n] : [0n, (1n << BigInt(bits)) - 1n];
  return Schema.String.check(Schema.isPattern(signed ? SIGNED : UNSIGNED)).pipe(
    Schema.decodeTo(Schema.BigInt, SchemaTransformation.bigintFromString),
  ).check(Schema.isGreaterThanOrEqualToBigInt(low), Schema.isLessThanOrEqualToBigInt(high)) as unknown as Schema.BigIntFromString;
};
