// A thing's unique fields (G4): which instances are in a field's scope, and whether a set of rows breaks one.
import { Option, Schema } from "effect";
import type { Thing } from "orthograph";
import type { Instance } from "../types.ts";

/** Is `instance` in the scope of `thing`'s unique `field`: in one of its `while` states, or any state when it has none. */
export const inScope = (thing: Thing, field: string, instance: Instance): boolean => {
  const states = thing.unique[field]?.while;
  return states === undefined || (instance.state !== undefined && states.includes(instance.state));
};

/** A field value as the store writes it: its schema's encoded form, as text, so a struct or an array compares by what it holds. */
export const keyOf = (thing: Thing, field: string, value: unknown): string => {
  const encoded = Schema.encodeUnknownOption(thing.fields[field]!.value.schema as unknown as Schema.Encoder<unknown>)(value);
  return JSON.stringify(Option.isSome(encoded) ? encoded.value : value, (_, v: unknown) => (typeof v === "bigint" ? v.toString() : v));
};

/** Does `instance` hold `value` in a unique field, within its scope? */
export const holds = (thing: Thing, field: string, instance: Instance, value: unknown): boolean =>
  inScope(thing, field, instance) && keyOf(thing, field, instance[field]) === keyOf(thing, field, value);

/** Does any unique field of `thing` hold one value twice within its scope, among these rows? */
export const holdsTwice = (thing: Thing, instances: ReadonlyArray<Instance>): boolean =>
  Object.keys(thing.unique).some((field) => {
    const held = instances.filter((i) => inScope(thing, field, i)).map((i) => keyOf(thing, field, i[field]));
    return new Set(held).size < held.length;
  });
