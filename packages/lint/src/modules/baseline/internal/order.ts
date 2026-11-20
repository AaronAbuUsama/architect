// Code-point order, so the baseline file and every listing are the same on every machine.
export const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The counts with rules and paths sorted, zeros and empty rules dropped. */
export const tidy = (counts: Readonly<Record<string, Readonly<Record<string, number>>>>): Record<string, Record<string, number>> =>
  Object.fromEntries(
    Object.keys(counts).sort(byCodePoint).flatMap((rule) => {
      const files = counts[rule] ?? {};
      const kept = Object.keys(files).sort(byCodePoint).filter((path) => (files[path] ?? 0) > 0).map((path) => [path, files[path] ?? 0] as const);
      return kept.length === 0 ? [] : [[rule, Object.fromEntries(kept)] as const];
    }),
  );
