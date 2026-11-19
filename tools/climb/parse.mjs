// Reads `ortho prove --report <file>` (a `ProveReport`, schemaVersion 1, from @orthograph/prove) into one entry per journey.
// Pure: no clock, no git, no files. A report this reader does not know is refused rather than half-read.

/**
 * The lines to append to runs.jsonl: one per journey, with its steps green and total and its own time as prove measured it.
 * `total` counts the steps that ran; a journey whose starting world stopped has none and says why in `stopped`.
 * @param {{ report: any, at: string, commit: string, exit: number | null }} run
 */
export const entries = ({ report, at, commit, exit }) => {
  if (report?.schemaVersion !== 1) throw new Error(`prove's report has schemaVersion ${String(report?.schemaVersion)}; the recorder reads 1`);
  return report.journeys.map((j) => ({
    at, commit, journey: j.name,
    green: j.steps.filter((s) => s.verdict === "pass").length,
    total: j.steps.length,
    seconds: Math.round(j.ms) / 1000,
    run_seconds: report.seconds,
    exit,
    ...(j.stopped === undefined ? {} : { stopped: j.stopped }),
  }));
};
