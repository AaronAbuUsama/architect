// What `watch` prints: p95 against budget, the refusals, the defects, the evals, and the drift. One line each, and the
// lines Gate 2's check 8 reads are exact: `<op> p95 <n>ms (budget <n>ms) ✔|✘`, `refusals: <Error> <n> …`, `drift <ops>|none`.
import type { Model } from "@orthograph/compiler";
import type { Evidence, Verdict } from "#modules/evals/types.js";
import { Evals } from "#modules/evals/service.js";

export interface Drifting {
  readonly operation: string;
  readonly p50: number;
  readonly p95: number;
  readonly budget: number;
  readonly calls: number;
  /** The slowest calls' trace ids, slowest first: what to read with `ortho telemetry trace`. */
  readonly slowest: ReadonlyArray<string>;
}

export interface Judged {
  readonly lines: ReadonlyArray<string>;
  readonly drifting: ReadonlyArray<Drifting>;
  readonly passed: boolean;
}

const SHOWN = 5;
/** Calls needed before a p95 over budget is drift: below 20, the p95 is just the slowest call. */
const MIN_CALLS = 20;
/** The evals watch can judge, in the order they print. */
const LIVE_EVALS = ["answer shape", "declared errors", "steps", "explainability"] as const;
const NOT_LIVE = "who may call, machine path, events, coverage";

const byOperation = (evidence: ReadonlyArray<Evidence>) => {
  const groups = new Map<string, Array<Evidence>>();
  for (const e of evidence) (groups.get(e.call.operation) ?? groups.set(e.call.operation, []).get(e.call.operation)!).push(e);
  return [...groups].sort(([a], [b]) => a.localeCompare(b));
};

const countsLine = (label: string, counts: ReadonlyMap<string, number>, show: (key: string, n: number) => string) =>
  counts.size === 0
    ? `${label}: none`
    : `${label}: ${[...counts].sort(([a, x], [b, y]) => y - x || a.localeCompare(b)).map(([k, n]) => show(k, n)).join("  ")}`;

const tally = (keys: ReadonlyArray<string>) => keys.reduce((m, k) => m.set(k, (m.get(k) ?? 0) + 1), new Map<string, number>());

/** The evals' failures, each as a line naming the eval and the operation. A long list is cut short and says by how much. */
const failureLines = (verdicts: ReadonlyArray<Verdict>) =>
  verdicts.flatMap((v) =>
    v.failures.length === 0 ? [] : [
      ...v.failures.slice(0, SHOWN).map((f) => `✘ ${v.eval} ${v.operation ?? ""}  ${f}`),
      ...(v.failures.length > SHOWN ? [`✘ ${v.eval} ${v.operation ?? ""}  … and ${v.failures.length - SHOWN} more`] : []),
    ]);

const evalsLine = (verdicts: ReadonlyArray<Verdict>) =>
  `evals: ${LIVE_EVALS.map((name) => {
    const failed = verdicts.filter((v) => v.eval === name).reduce((n, v) => n + v.failures.length, 0);
    return failed === 0 ? `${name} ✔` : `${name} ✘ ${failed}`;
  }).join("  ")}  (judged by prove only: ${NOT_LIVE})`;

export const judge = (model: Model, project: Parameters<typeof Evals.judgeLive>[0], evidence: ReadonlyArray<Evidence>): Judged => {
  const drifting: Array<Drifting> = [];
  const thin: Array<string> = [];
  const perOperation = byOperation(evidence).map(([name, calls]) => {
    const times = calls.flatMap((e) => (e.opSpan ? [e.opSpan.ms] : [])).sort((a, b) => a - b);
    const budget = model.operations[name]?.budget?.p95Ms ?? null;
    const p95 = Math.ceil(Evals.percentile(times, 95));
    process.getBuiltinModule("node:fs").appendFileSync("/private/tmp/claude-501/-Users-abuusama-projects-architect--claude-worktrees-awesome-tharp-a1fd3e/cb17a1a8-2c6b-4573-94a9-21ceef1d1399/scratchpad/times.log", JSON.stringify({ name, times: times.map((t) => Math.round(t)) }) + "\n"); // TEMP-DIAG
    const above = budget !== null && Evals.percentile(times, 95) > budget;
    // A p95 over fewer than MIN_CALLS calls is the slowest call: a lone slow request is noise, not drift. It is said, and judged once there is traffic.
    const over = above && calls.length >= MIN_CALLS;
    if (above && !over) thin.push(`${name} p95 ${p95}ms is over its budget of ${budget}ms but ${calls.length} calls are too few to call drift (${MIN_CALLS} needed)`);
    if (over) {
      const slowest = calls.filter((e) => e.opSpan).sort((a, b) => b.opSpan!.ms - a.opSpan!.ms).slice(0, 3).map((e) => e.call.trace);
      drifting.push({ operation: name, p50: Math.ceil(Evals.percentile(times, 50)), p95, budget: budget!, calls: calls.length, slowest });
    }
    return { name, calls: calls.length, line: `${name} p95 ${p95}ms (${budget === null ? "no budget" : `budget ${budget}ms`}) ${over ? "✘" : "✔"}` };
  });
  const verdicts = Evals.judgeLive(project, evidence);
  const failures = failureLines(verdicts);
  const refusals = evidence.flatMap((e) => (e.refusal ? [e.refusal] : []));
  const defects = evidence.flatMap((e) => (e.call.status === 500 ? [e.call.operation] : []));
  const lines = [
    ...perOperation.map((o) => o.line),
    `calls: ${perOperation.map((o) => `${o.name} ${o.calls}`).join("  ")}`,
    countsLine("refusals", tally(refusals), (tag, n) => `${tag} ${n}${model.refusals[tag] ? ` (${model.refusals[tag]})` : ""}`),
    countsLine("defects", tally(defects), (op, n) => `${op} ${n}`),
    evalsLine(verdicts),
    ...thin.map((t) => `thin: ${t}`),
    ...failures,
  ];
  return { lines, drifting, passed: failures.length === 0 };
};
