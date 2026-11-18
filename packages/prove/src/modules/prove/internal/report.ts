// Turning journeys and verdicts into prove's lines.
import type { Model } from "@orthograph/compiler";
import type { Verdict } from "#modules/evals/types.js";
import type { CallRecord, JourneyRun, StepResult } from "#modules/journeys/types.js";
import type { Trace } from "#modules/telemetry/types.js";

/** World facts predict the access refusal before the server answers. */
const refusedBeforeSpan = (call: CallRecord | undefined): boolean =>
  call?.mayCall === false && call.status === 403 &&
  typeof call.body === "object" && call.body !== null && "_tag" in call.body && call.body._tag === "NotAllowed";

/** A step's span checks, now that its trace is in. */
export const spanFailures = (step: StepResult, trace: Trace | undefined, call: CallRecord | undefined): ReadonlyArray<string> => {
  const names = new Set((trace?.spans ?? []).map((s) => s.name));
  if (names.size === 0 && !refusedBeforeSpan(call)) return ["telemetry missing: no span of this call reached the collector"];
  return [
    ...step.spans.present.filter((n) => !names.has(n)).map((n) => `span ${n} missing`),
    ...step.spans.absent.filter((n) => names.has(n)).map((n) => `span ${n} present, expected absent`),
  ];
};

/** The defect a call's span recorded when the server died (`BlankReached`, or the error's message), if any. */
const defectOf = (trace: Trace | undefined): string | undefined => {
  const defect = trace?.spans.find((s) => typeof s.attrs["defect"] === "string")?.attrs["defect"];
  const said = typeof defect === "string" ? defect.replace(/:\s*$/, "").trim() : "";
  return said === "" ? undefined : said;
};

/** Why a starting world stopped, with the defect the operation's span recorded when the server died. */
const stoppedLine = (run: JourneyRun, traces: ReadonlyMap<string, Trace>) => {
  const last = run.calls[run.calls.length - 1];
  const defect = last ? defectOf(traces.get(last.trace)) : undefined;
  return `journey ${run.name} ✘ ${run.stopped}${defect ? ` (${defect})` : ""}; no step ran`;
};

/** A failed step whose call died says what it died of, from the call's own span. */
const diedOf = (trace: Trace | undefined, call: CallRecord | undefined): ReadonlyArray<string> => {
  const defect = call !== undefined && call.status >= 500 ? defectOf(trace) : undefined;
  return defect ? [`the server died: ${defect}`] : [];
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
    const calls = new Map(run.calls.map((call) => [call.trace, call]));
    const steps = run.steps.map((s) => {
      const failures = [...s.failures, ...spanFailures(s, traces.get(s.trace), calls.get(s.trace))];
      return { s, failures: failures.length > 0 ? [...failures, ...diedOf(traces.get(s.trace), calls.get(s.trace))] : failures };
    });
    const bad = steps.filter((x) => x.failures.length > 0);
    lines.push(`journey ${run.name} ${bad.length === 0 ? "✔" : "✘"} ${steps.length - bad.length}/${steps.length} steps`);
    for (const { s, failures } of bad) for (const f of failures) lines.push(`  ✘ "${s.title}": ${f}`);
    for (const s of run.skipped ?? []) lines.push(`  skipped "${s.step}": it runs ${s.operation}, which ${s.file} omits`);
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
