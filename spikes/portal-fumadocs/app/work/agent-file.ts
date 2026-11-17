// An agent type as the file that declares it (architect/workers/<id>.ts), and the diff between two versions of it.
// Settings are saved by proposing that diff as a pull request, so every thread can name the exact settings it ran on.
import type { WorkerType } from "./types.ts";

const list = (xs: string[]) => `[${xs.map((x) => JSON.stringify(x)).join(", ")}]`;

export function workerFile(w: WorkerType): string[] {
  const name = w.id[0]!.toUpperCase() + w.id.slice(1);
  return [
    `import { Worker } from "@architect/blueprint";`,
    ``,
    `export const ${name} = Worker.declare({`,
    `  name: ${JSON.stringify(w.name)},`,
    `  does: ${JSON.stringify(w.does)},`,
    `  kinds: ${list(w.kinds)},`,
    `  models: ${list(w.models)}, // first is the default`,
    `  skills: ${list(w.skills)},`,
    `  mcps: ${list(w.mcps)},`,
    `  tools: ${list(w.tools)},`,
    `  sandbox: ${w.sandbox ? JSON.stringify(w.sandbox) : "null"},`,
    `  budgetUsd: ${w.budgetUsd},`,
    `  limits: { maxTurns: ${w.limits.maxTurns}, timeoutMin: ${w.limits.timeoutMin}, parallel: ${w.limits.parallel} },`,
    `  asks: ${list(w.asks)},`,
    `});`,
  ];
}

/** Same-shaped files differ line by line, so the diff is a walk down both. */
export function lineDiff(before: string[], after: string[]): { text: string; changed: number } {
  let changed = 0;
  const out = after.flatMap((line, i) => {
    const was = before[i];
    if (was === line) return [` ${line}`];
    changed++;
    return [`-${was}`, `+${line}`];
  });
  return { text: out.join("\n"), changed };
}
