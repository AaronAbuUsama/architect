// A thing's unique fields (G4): which instances are in a field's scope, and whether a set of rows breaks one.
import type { Thing } from "orthograph";
import type { Instance, Write } from "../types.ts";

/** Is `instance` in the scope of `thing`'s unique `field`: in one of its `while` states, or any state when it has none. */
export const inScope = (thing: Thing, field: string, instance: Instance): boolean => {
  const states = thing.unique[field]?.while;
  return states === undefined || (instance.state !== undefined && states.includes(instance.state));
};

/** Does `instance` hold `value` in a unique field, within its scope? Compared as text, as a list filter is. */
export const holds = (thing: Thing, field: string, instance: Instance, value: unknown): boolean =>
  inScope(thing, field, instance) && String(instance[field]) === String(value);

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
      const held = after.filter((r) => r.thing === thing && inScope(thing, field, r.instance)).map((r) => String(r.instance[field]));
      return new Set(held).size < held.length;
    }));
};
