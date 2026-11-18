// Drift becomes a task (D3 #144): a file under `.forman/tasks/`, written by a watch that finds an operation over its
// budget and removed by the first watch that finds it back under. `.forman/` is where the project already keeps what
// forman writes, and a task there is what `forman brief` and an agent are pointed at.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import type { Model } from "@formants/compiler";
import type { Drifting } from "./report.ts";

const taskPath = (environment: string, operation: string) => `.forman/tasks/drift-${environment}-${operation}.md`;

const textOf = (environment: string, d: Drifting, model: Model): string => {
  const op = model.operations[d.operation];
  return [
    `# ${d.operation} is over its budget in ${environment}`,
    "",
    `Written by \`forman watch --env ${environment}\`. The next watch that finds ${d.operation} back under its budget removes this file.`,
    "",
    `- p95 ${d.p95}ms against a budget of ${d.budget}ms (p50 ${d.p50}ms, over ${d.calls} calls in the window).`,
    `- The slowest calls, to read as a tree: ${d.slowest.map((t) => `\`forman telemetry trace ${t} --env ${environment}\``).join(", ")}.`,
    `- What it must do, and what it must not touch: \`forman brief ${d.operation}\`.${op ? ` Its handler is \`src/${op.thing}/${op.verb}.ts\`.` : ""}`,
    "- The budget is the operation's `budget` in its declaration. Make the handler faster; loosening the budget is a decision that makes the operation's verdicts stale.",
    "",
  ].join("\n");
};

/** Write a task for each operation drifting now, remove the one of each operation that no longer does. Returns the paths written. */
export const syncTasks = (root: string, environment: string, model: Model, drifting: ReadonlyArray<Drifting>): Effect.Effect<ReadonlyArray<string>> =>
  Effect.sync(() => {
    const now = new Set(drifting.map((d) => d.operation));
    for (const name of Object.keys(model.operations)) if (!now.has(name)) rmSync(join(root, taskPath(environment, name)), { force: true });
    return drifting.map((d) => {
      const path = taskPath(environment, d.operation);
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), textOf(environment, d, model));
      return path;
    });
  });
