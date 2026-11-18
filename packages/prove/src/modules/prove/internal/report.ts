// Turning journeys and verdicts into prove's lines.
import type { Model } from "@orthograph/compiler";
import type { Verdict } from "#modules/evals/types.js";
import type { JourneyRun, StepResult } from "#modules/journeys/types.js";
import type { Trace } from "#modules/telemetry/types.js";

/** A step's span checks, now that its trace is in. */
export const spanFailures = (step: StepResult, trace: Trace | undefined): ReadonlyArray<string> => {
  const names = new Set((trace?.spans ?? []).map((s) => s.name));
  if (!trace || trace.spans.length === 0) return ["telemetry missing: no span of this call reached the collector"];
  return [
    ...step.spans.present.filter((n) => !names.has(n)).map((n) => `span ${n} missing`),
    ...step.spans.absent.filter((n) => names.has(n)).map((n) => `span ${n} present, expected absent`),
  ];
};

/** Why a starting world stopped, with the defect the operation's span recorded when the server died. */
const stoppedLine = (run: JourneyRun, traces: ReadonlyMap<string, Trace>) => {
  const last = run.calls[run.calls.length - 1];
  const defect = last ? traces.get(last.trace)?.spans.find((s) => typeof s.attrs["defect"] === "string")?.attrs["defect"] : undefined;
  return `journey ${run.name} ✘ ${run.stopped}${defect ? ` (${String(defect)})` : ""}; no step ran`;
};

export const journeyLines = (runs: ReadonlyArray<JourneyRun>, traces: ReadonlyMap<string, Trace>) => {
  const lines: Array<string> = [];
  /** The traces of every call that went wrong, for `prove --view` to point at. */
  const failedTraces: Array<{ readonly trace: string; readonly what: string }> = [];
  let failed = 0;
  for (const run of runs) {
    if (run.stopped) {
      lines.push(stoppedLine(run, traces));
      const last = run.calls[run.calls.length - 1];
      if (last) failedTraces.push({ trace: last.trace, what: `journey ${run.name}` });
      failed++;
      continue;
    }
    const steps = run.steps.map((s) => ({ s, failures: [...s.failures, ...spanFailures(s, traces.get(s.trace))] }));
    const bad = steps.filter((x) => x.failures.length > 0);
    lines.push(`journey ${run.name} ${bad.length === 0 ? "✔" : "✘"} ${steps.length - bad.length}/${steps.length} steps`);
    for (const { s, failures } of bad) for (const f of failures) lines.push(`  ✘ "${s.title}": ${f}`);
    for (const { s } of bad) failedTraces.push({ trace: s.trace, what: `${run.name} "${s.title}"` });
    failed += bad.length;
  }
  return { lines, failed, failedTraces };
};

export const evalLines = (model: Model, verdicts: ReadonlyArray<Verdict>) => {
  const lines: Array<string> = [];
  let failed = 0;
  for (const op of Object.keys(model.operations)) {
    const mine = verdicts.filter((v) => v.operation === op);
    for (const v of mine) {
      if (v.failures.length === 0) lines.push(`${op} ${v.eval} ✔${v.notes.length ? ` ${v.notes.join("; ")}` : ""}`);
      for (const f of v.failures) lines.push(`${op} ${v.eval} ✘ ${f}`);
    }
    const bad = mine.filter((v) => v.failures.length > 0).length;
    const timing = mine.find((v) => v.eval === "performance")?.notes[0];
    lines.push((bad === 0 ? `${op} ${mine.length} evals ✔` : `${op} ${bad} of ${mine.length} evals ✘`) + (timing ? ` ${timing}` : ""));
    failed += bad;
  }
  for (const v of verdicts.filter((x) => x.operation === undefined)) {
    lines.push(`${v.eval} ${v.failures.length === 0 ? "✔" : "✘"} ${v.notes.join("; ")}`);
    for (const f of v.failures) lines.push(`${v.eval} ✘ ${f}`);
    if (v.failures.length > 0) failed++;
  }
  return { lines, failed };
};
