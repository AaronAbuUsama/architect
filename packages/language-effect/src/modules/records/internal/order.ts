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

/** The steps in an order the store can apply, or the field that stops one. Rows that free and take nothing keep the order they were written in. */
export const orderSteps = (steps: ReadonlyArray<Step>): ReadonlyArray<Step> | Unwritable => {
  const held = steps.map((s) => keysOf(s.write.thing, s.after));
  for (let i = 0; i < steps.length; i++)
    for (let j = i + 1; j < steps.length; j++) {
      const clash = held[i]!.find((k) => held[j]!.some((o) => same(k, o)));
      if (clash) return { field: clash.field, thing: clash.thing, why: "clash" };
    }
  const frees = steps.map((s, i) => without(keysOf(s.write.thing, s.before), held[i]!));
  const takes = steps.map((s, i) => without(held[i]!, keysOf(s.write.thing, s.before)));
  // `after[i]` must come after `i` when i takes a key that j frees.
  const blockedBy = (i: number) => steps.flatMap((_, j) => (j !== i && takes[i]!.some((k) => frees[j]!.some((f) => same(k, f))) ? [j] : []));
  const done = new Set<number>();
  const ordered: Array<Step> = [];
  while (ordered.length < steps.length) {
    const next = steps.findIndex((_, i) => !done.has(i) && blockedBy(i).every((j) => done.has(j)));
    if (next === -1) {
      const stuck = steps.findIndex((_, i) => !done.has(i));
      const key = takes[stuck]!.find((k) => frees.some((f, j) => !done.has(j) && f.some((o) => same(k, o))))!;
      return { field: key.field, thing: key.thing, why: "cycle" };
    }
    done.add(next);
    ordered.push(steps[next]!);
  }
  return ordered;
};
