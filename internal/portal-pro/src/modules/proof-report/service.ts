import type { LocalProof, ProofCheck } from "@ops/types.ts";

type Report = { readonly beganAt: string; readonly endedAt: string; readonly passed: boolean; readonly lines: readonly string[] };

export const decodeProofReport = (report: Report, operationNames: readonly string[]): LocalProof => {
  const checks = Object.fromEntries(operationNames.map((op) => {
    const found = new Map<string, ProofCheck>();
    for (const line of report.lines) {
      if (!line.startsWith(`${op} `)) continue;
      const check = /^([a-z][a-z ]+) ([✔✘])(?: (.*))?$/u.exec(line.slice(op.length + 1));
      if (!check) continue;
      const [, label, status, note] = check;
      if (found.has(label!)) continue;
      const timing = note && /^p50 (\d+)ms p95 (\d+)ms/u.exec(note);
      found.set(label!, {
        name: label!,
        passed: status === "✔",
        ...(timing ? { timing: { p50Ms: Number(timing[1]), p95Ms: Number(timing[2]) } } : {}),
      });
    }
    return [op, [...found.values()]];
  }));
  const journeys = report.lines.flatMap((line) => {
    const found = /^journey ([\p{L}\d ._-]+) ([✔✘])(?: (\d+)\/(\d+) steps)?/u.exec(line);
    if (!found) return [];
    return [{ name: found[1]!, passed: found[2] === "✔", completed: Number(found[3] ?? 0), total: Number(found[4] ?? 0) }];
  });
  const coverageLine = report.lines.find((line) => line.startsWith("coverage ✔") || line.startsWith("coverage ✘")) ?? "";
  const coverage = [...coverageLine.matchAll(/(moves|outcomes|runtime refusals|refusals) (\d+)\/(\d+)/gu)]
    .map(([, name, reached, total]) => ({ name: name!, reached: Number(reached), total: Number(total) }));
  return { beganAt: report.beganAt, endedAt: report.endedAt, passed: report.passed, checks, journeys, coverage };
};
