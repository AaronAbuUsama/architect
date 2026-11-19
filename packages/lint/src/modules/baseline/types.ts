// The lint baseline: the breaches of the repository's own code rules that existed when each rule arrived, file by file.
// A rule tolerates up to its count in a file; the baseline only shrinks (README.md). Pure: the script that reads oxlint's
// output and writes the file is packages/lint/scripts/baseline.ts.

/** rule (without `ortho/`) -> path from the repository's root -> how many breaches. */
export type Counts = Readonly<Record<string, Readonly<Record<string, number>>>>;

/** One file where today's count and the baseline's differ. */
export interface Breach {
  readonly rule: string;
  readonly path: string;
  readonly allowed: number;
  readonly actual: number;
}

export interface Verdict {
  /** More breaches than the baseline allows: new ones. Lint fails on these. Sorted by rule, then path. */
  readonly over: ReadonlyArray<Breach>;
  /** Fewer than the baseline allows: fixed, so the baseline must shrink to match. Sorted by rule, then path. */
  readonly stale: ReadonlyArray<Breach>;
}

export interface BaselineApi {
  /** The baseline's key for a breach: the file, except six-slots, which is about a module, so its key is the module's folder. */
  readonly keyOf: (rule: string, path: string) => string;
  /** Tally reports into counts. */
  readonly count: (reports: ReadonlyArray<{ readonly rule: string; readonly path: string }>) => Counts;
  /** Today's counts against the baseline. A rule or path absent from one side counts 0. */
  readonly compare: (baseline: Counts, actual: Counts) => Verdict;
  /** The baseline lowered to what is left: each entry min(allowed, actual), zeros and empty rules dropped. Never adds or raises. */
  readonly shrink: (baseline: Counts, actual: Counts) => Counts;
  /** Stable text: rules and paths in code-point order, 2-space JSON, a trailing newline. */
  readonly render: (counts: Counts) => string;
}
