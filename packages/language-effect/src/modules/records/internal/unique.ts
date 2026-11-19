// A thing's unique fields (G4): which instances are in a field's scope, and whether a set of rows breaks one.
import { Option, Schema } from "effect";
import type { Thing } from "orthograph";
import type { Instance, Write } from "../types.ts";

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

/** Would the rows, after these writes, hold one value of a unique field twice within its scope? */
export const breaksUnique = (rows: ReadonlyArray<{ readonly thing: Thing; readonly instance: Instance }>, writes: ReadonlyArray<Write>): boolean => {
  const after = rows.map(({ thing, instance }) => {
    const update = writes.find((w) => w.kind === "update" && w.thing === thing && w.id === instance["id"]);
    if (update?.kind !== "update") return { thing, instance };
    return { thing, instance: { ...instance, ...update.changes, ...(update.state ? { state: update.state } : {}) } };
  });
  for (const w of writes) if (w.kind === "insert") after.push({ thing: w.thing, instance: { ...w.fields, ...(w.state ? { state: w.state } : {}) } });
  return [...new Set(writes.map((w) => w.thing))].some((thing) =>
    Object.keys(thing.unique).some((field) => {
      const held = after.filter((r) => r.thing === thing && inScope(thing, field, r.instance)).map((r) => keyOf(thing, field, r.instance[field]));
      return new Set(held).size < held.length;
    }));
};
