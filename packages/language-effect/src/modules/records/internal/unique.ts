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

/** A per-field count of the keys held within scope, over a thing's rows: a write moves one row's keys, and only those keys are checked. */
export const uniqueIndex = (thing: Thing, instances: ReadonlyArray<Instance>) => {
  const counts = new Map<string, Map<string, number>>(Object.keys(thing.unique).map((field) => [field, new Map()]));
  const keysOf = (instance: Instance) => [...counts.keys()].filter((field) => inScope(thing, field, instance)).map((field) => [field, keyOf(thing, field, instance[field])] as const);
  const bump = (instance: Instance, by: 1 | -1) => {
    for (const [field, key] of keysOf(instance)) counts.get(field)!.set(key, (counts.get(field)!.get(key) ?? 0) + by);
  };
  for (const instance of instances) bump(instance, 1);
  return {
    /** A row becomes `to` (from `from`, or new): true when it now holds a key another row holds. */
    move: (from: Instance | undefined, to: Instance): boolean => {
      if (from) bump(from, -1);
      bump(to, 1);
      return keysOf(to).some(([field, key]) => counts.get(field)!.get(key)! > 1);
    },
  };
};
