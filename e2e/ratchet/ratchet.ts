// The ratchet's comparison: a vitest JSON report and the checked-in list of expected failures in, a verdict out. Pure:
// no files, no process, no printing (check.ts does those).

/** The slice of vitest's JSON report the ratchet reads. */
export interface Report {
  readonly testResults: ReadonlyArray<{
    readonly name: string;
    readonly status: string;
    readonly assertionResults?: ReadonlyArray<{
      readonly ancestorTitles?: ReadonlyArray<string>;
      readonly title: string;
      readonly status: string;
    }>;
  }>;
}

export interface Verdict {
  /** Failing and not on the list: the build fails on these. */
  readonly unexpected: ReadonlyArray<string>;
  /** On the list and passing now: take them off the list. */
  readonly nowPassing: ReadonlyArray<string>;
  /** On the list and not in the report at all (renamed, deleted, or hidden behind a file that no longer loads). */
  readonly missing: ReadonlyArray<string>;
  /** On the list, neither failed nor passed (skipped or todo): left alone. */
  readonly notRun: ReadonlyArray<string>;
  readonly failing: number;
}

type Outcome = "failed" | "passed" | "other";

const toPosix = (path: string): string => path.split("\\").join("/");

/** "m1/09-wallet-journeys.test.ts": the file's path from the e2e folder, whatever the machine's absolute prefix. */
export const fileKey = (absolutePath: string, root: string): string => {
  const path = toPosix(absolutePath);
  const base = toPosix(root).replace(/\/+$/, "") + "/";
  return path.startsWith(base) ? path.slice(base.length) : path;
};

/**
 * Every test's key and outcome. A key is "<file> > <describe> > ... > <test>"; a file that failed with no failing test
 * under it (it did not load, or a hook threw) is keyed by the file alone. Same key twice: failed wins.
 */
export const outcomes = (report: Report, root: string): ReadonlyMap<string, Outcome> => {
  const out = new Map<string, Outcome>();
  const put = (key: string, outcome: Outcome): void => {
    const was = out.get(key);
    if (was === "failed" || (was === "passed" && outcome === "other")) return;
    out.set(key, outcome);
  };
  for (const file of report.testResults) {
    const name = fileKey(file.name, root);
    const tests = file.assertionResults ?? [];
    for (const test of tests) {
      const key = [name, ...(test.ancestorTitles ?? []), test.title].join(" > ");
      put(key, test.status === "failed" ? "failed" : test.status === "passed" ? "passed" : "other");
    }
    if (file.status === "failed" && !tests.some((test) => test.status === "failed")) put(name, "failed");
  }
  return out;
};

/** The list file's text to its entries: blank lines and lines starting with "#" are not entries. */
export const parseList = (text: string): ReadonlyArray<string> =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

export const compare = (report: Report, list: ReadonlyArray<string>, root: string): Verdict => {
  const seen = outcomes(report, root);
  const expected = new Set(list);
  const failed = [...seen].filter(([, outcome]) => outcome === "failed").map(([key]) => key);
  return {
    unexpected: failed.filter((key) => !expected.has(key)).sort(),
    nowPassing: list.filter((key) => seen.get(key) === "passed"),
    missing: list.filter((key) => !seen.has(key)),
    notRun: list.filter((key) => seen.get(key) === "other"),
    failing: failed.length,
  };
};

export const ok = (verdict: Verdict): boolean => verdict.unexpected.length === 0;
