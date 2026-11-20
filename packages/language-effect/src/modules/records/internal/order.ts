// S-19 / HAN-18: the order a call's writes go in. A row that frees a unique key (leaves the field's scope, or changes the key) is written before a row that
// takes it, because D1 checks its index statement by statement. No order, or two of the call's own rows holding one key, is the handler's bug.
import type { Thing } from "orthograph";
import { inScope, keyOf } from "./unique.ts";
import type { Instance, Write } from "../types.ts";

export interface Step {
  readonly write: Write;
  /** The row as the call found it; undefined for an insert. */
  readonly before: Instance | undefined;
  /** The row as the call leaves it. */
  readonly after: Instance;
}

/** What a call cannot be written as: the unique field, and why. */
export type Unwritable = { readonly field: string; readonly thing: Thing; readonly why: "clash" | "cycle" };

type Key = { readonly thing: Thing; readonly field: string; readonly key: string };
const keysOf = (thing: Thing, instance: Instance | undefined): ReadonlyArray<Key> =>
  instance === undefined ? [] : Object.keys(thing.unique).filter((field) => inScope(thing, field, instance)).map((field) => ({ thing, field, key: keyOf(thing, field, instance[field]) }));
const same = (a: Key, b: Key) => a.thing === b.thing && a.field === b.field && a.key === b.key;
const without = (keys: ReadonlyArray<Key>, other: ReadonlyArray<Key>) => keys.filter((k) => !other.some((o) => same(k, o)));

const slot = (k: Key) => `${k.field}\u0000${k.key}`;
const indexed = (keys: ReadonlyArray<ReadonlyArray<Key>>) => {
  const by = new Map<Thing, Map<string, Array<number>>>();
  keys.forEach((row, i) => row.forEach((k) => {
    const at = by.get(k.thing) ?? by.set(k.thing, new Map()).get(k.thing)!;
    at.set(slot(k), [...(at.get(slot(k)) ?? []), i]);
  }));
  return (k: Key): ReadonlyArray<number> => by.get(k.thing)?.get(slot(k)) ?? [];
};

/** The steps in an order the store can apply, or the field that stops one. Rows that free and take nothing keep the order they were written in. */
export const orderSteps = (steps: ReadonlyArray<Step>): ReadonlyArray<Step> | Unwritable => {
  const held = steps.map((s) => keysOf(s.write.thing, s.after));
  const holders = indexed(held);
  for (let i = 0; i < steps.length; i++) {
    const clash = held[i]!.find((k) => holders(k).some((j) => j !== i));
    if (clash) return { field: clash.field, thing: clash.thing, why: "clash" };
  }
  const frees = steps.map((s, i) => without(keysOf(s.write.thing, s.before), held[i]!));
  const takes = steps.map((s, i) => without(held[i]!, keysOf(s.write.thing, s.before)));
  const freers = indexed(frees);
  // Worked out once: `i` must be written after each `j` that frees a key `i` takes.
  const blockers = takes.map((row, i) => [...new Set(row.flatMap((k) => freers(k)))].filter((j) => j !== i));
  const done = new Set<number>();
  const ordered: Array<Step> = [];
  while (ordered.length < steps.length) {
    const next = steps.findIndex((_, i) => !done.has(i) && blockers[i]!.every((j) => done.has(j)));
    if (next === -1) {
      const stuck = steps.findIndex((_, i) => !done.has(i));
      const key = takes[stuck]!.find((k) => freers(k).some((j) => !done.has(j)))!;
      return { field: key.field, thing: key.thing, why: "cycle" };
    }
    done.add(next);
    ordered.push(steps[next]!);
  }
  return ordered;
};
