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
  /**
   * Errors vitest's JSON report leaves out, written by reporter.ts: a hook that threw (beforeAll, afterAll, ...) in a
   * suite (`path` is the describe titles) or at the top of a file (`path` empty).
   */
  readonly suiteErrors?: ReadonlyArray<{ readonly name: string; readonly path: ReadonlyArray<string>; readonly label?: string }>;
  /** Errors that belong to no file (an unhandled rejection): the first line of each. */
  readonly unhandled?: ReadonlyArray<string>;
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
 * under it and no recorded hook error is keyed by the file alone; a hook error is keyed `file > describe > [suite error]` (or
 * `file > [file error]`), and never absorbed by a failing test in the same file. Same key twice: failed wins.
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
    const hooked = (report.suiteErrors ?? []).filter((error) => fileKey(error.name, root) === name);
    // A hook error is its own key, whatever else failed in the file: a listed failing test never covers it.
    for (const error of hooked) put([name, ...error.path, error.label ?? (error.path.length === 0 ? "[file error]" : "[suite error]")].join(" > "), "failed");
    if (hooked.length === 0 && file.status === "failed" && !tests.some((test) => test.status === "failed")) put(name, "failed");
  }
  for (const message of report.unhandled ?? []) put(`unhandled error > ${message}`, "failed");
  return out;
};

/** The list file's text to its entries: blank lines and lines starting with "#" are not entries. */
export const parseList = (text: string): ReadonlyArray<string> =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

/**
 * The list is a folder of files, one per check file, each named after the check it lists (`21-portal-viewer.txt` holds `m1/21-portal-viewer.test.ts > ...`). Every entry of every file, and the
 * entries filed under another check's name: a key belongs to the file named after its own test file, so a line can only conflict with a change to the same check.
 */
export const parseFolder = (files: ReadonlyArray<{ readonly name: string; readonly text: string }>): { readonly keys: ReadonlyArray<string>; readonly misfiled: ReadonlyArray<string> } => {
  const keys = files.flatMap((file) => parseList(file.text));
  const misfiled = files.flatMap((file) => parseList(file.text).filter((key) => `${(key.split(" > ")[0] ?? "").split("/").pop()?.replace(/\.test\.ts$/, "")}.txt` !== file.name).map((key) => `${file.name}: ${key}`));
  return { keys, misfiled };
};

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
