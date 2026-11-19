import type { BaselineApi, Breach, Counts } from "./types.ts";
import { byCodePoint, tidy } from "./internal/order.ts";

const at = (counts: Counts, rule: string, path: string): number => counts[rule]?.[path] ?? 0;

/** Every (rule, path) on either side, sorted by rule, then path. */
const keys = (a: Counts, b: Counts): ReadonlyArray<readonly [string, string]> => {
  const seen = new Set<string>();
  for (const c of [a, b]) for (const rule of Object.keys(c)) for (const path of Object.keys(c[rule] ?? {})) seen.add(`${rule}\u0000${path}`);
  return [...seen].sort(byCodePoint).map((k) => k.split("\u0000") as unknown as readonly [string, string]);
};

const MODULE = /^(.*\/src\/modules\/[^/]+)\/.+$/;

export const Baseline: BaselineApi = {
  keyOf: (rule, path) => (rule === "six-slots" ? (MODULE.exec(path)?.[1] ?? path) : path),
  count: (reports) => {
    const out: Record<string, Record<string, number>> = {};
    for (const { rule, path } of reports) {
      const files = (out[rule] ??= {});
      files[path] = (files[path] ?? 0) + 1;
    }
    return tidy(out);
  },
  compare: (baseline, actual) => {
    const breaches: ReadonlyArray<Breach> = keys(baseline, actual).map(([rule, path]) => ({ rule, path, allowed: at(baseline, rule, path), actual: at(actual, rule, path) }));
    return { over: breaches.filter((b) => b.actual > b.allowed), stale: breaches.filter((b) => b.actual < b.allowed) };
  },
  shrink: (baseline, actual) =>
    tidy(Object.fromEntries(Object.keys(baseline).map((rule) => [rule, Object.fromEntries(Object.keys(baseline[rule] ?? {}).map((path) => [path, Math.min(at(baseline, rule, path), at(actual, rule, path))]))]))),
  render: (counts) => `${JSON.stringify(tidy(counts), null, 2)}\n`,
};
