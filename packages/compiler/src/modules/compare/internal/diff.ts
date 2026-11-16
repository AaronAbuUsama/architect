import type { Model } from "#modules/model/types.js";
import type { Change, Kind } from "../types.ts";

const KINDS: ReadonlyArray<readonly [Kind, (m: Model) => Readonly<Record<string, unknown>>]> = [
  ["value", (m) => m.values],
  ["thing", (m) => m.things],
  ["operation", (m) => m.operations],
];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** The top-level fields of two entries that differ, leaving out the hash, which differs whenever any of them does. */
const partsOf = (a: unknown, b: unknown): ReadonlyArray<string> => {
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return same(a, b) ? [] : ["value"];
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => k !== "hash").sort();
  return keys.filter((k) => !same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};

export const diff = (before: Model, after: Model): ReadonlyArray<Change> =>
  KINDS.flatMap(([kind, of]) => {
    const a = of(before);
    const b = of(after);
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().flatMap((name): ReadonlyArray<Change> => {
      if (!(name in b)) return [{ kind, name, change: "removed", parts: [] }];
      if (!(name in a)) return [{ kind, name, change: "added", parts: [] }];
      const parts = partsOf(a[name], b[name]);
      return parts.length === 0 ? [] : [{ kind, name, change: "changed", parts }];
    });
  });
