// The types and rules parts: tsc and oxlint, run for real on the project, their output read back as findings.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import type { Model } from "@architect/compiler";
import type { ProjectFacts } from "@architect/lint";
import type { Finding } from "../types.ts";
import { binOf, tsFiles } from "./files.ts";

export const RULES = ["no-name-as-string", "refusal-has-log", "declared-errors-only", "no-wall-clock", "handler-matches-path"] as const;

export const types = (root: string): ReadonlyArray<Finding> => {
  const tsc = binOf(root, "tsc");
  if (!tsc) return [{ part: "types", rule: "tsc", file: "tsconfig.json", message: "no tsc found in node_modules/.bin" }];
  const run = spawnSync(tsc, ["-p", join(root, "tsconfig.json"), "--noEmit", "--pretty", "false"], { cwd: root, encoding: "utf8" });
  return (run.stdout ?? "").split("\n").flatMap((l) => {
    const m = /^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/.exec(l);
    return m ? [{ part: "types" as const, rule: m[3]!, file: m[1]!, line: Number(m[2]), message: m[4]! }] : [];
  });
};

export const factsOf = (root: string, model: Model): ProjectFacts => {
  const ops = Object.values(model.operations);
  const things = Object.values(model.things);
  return {
    root,
    names: [...ops.map((o) => o.name), ...ops.flatMap((o) => Object.values(o.steps).map((s) => s.name)),
      ...things.flatMap((t) => [...Object.keys(t.events), ...Object.keys(t.errors)])],
    errors: things.flatMap((t) => Object.keys(t.errors)),
    handlers: Object.fromEntries(ops.filter((o) => o.kind === "operation").map((o) => [`implementation/handlers/${o.thing}/${o.verb}.ts`, o.errors])),
  };
};

export const rules = (root: string, model: Model): ReadonlyArray<Finding> => {
  const oxlint = binOf(root, "oxlint");
  if (!oxlint) return [{ part: "rules", rule: "oxlint", file: ".", message: "no oxlint found in node_modules/.bin" }];
  const plugin = createRequire(import.meta.url).resolve("@architect/lint/plugin");
  const facts = factsOf(root, model);
  const dir = join(root, ".architect/check");
  mkdirSync(dir, { recursive: true });
  // Only the architect rules: the project's own lint config is its own business.
  const config = { jsPlugins: [plugin], categories: { correctness: "off" }, plugins: [], rules: Object.fromEntries(RULES.map((r) => [`architect/${r}`, ["error", facts]])) };
  writeFileSync(join(dir, "oxlintrc.json"), JSON.stringify(config, null, 2));
  // Files named one by one: walking a folder applies every .gitignore above it, which would skip a project kept in one.
  const targets = ["implementation", "blueprint"].flatMap((d) => tsFiles(join(root, d)).map((f) => relative(root, f)));
  if (targets.length === 0) return [];
  const run = spawnSync(oxlint, ["-c", join(dir, "oxlintrc.json"), "--no-ignore", "--format", "unix", ...targets], { cwd: root, encoding: "utf8" });
  return (run.stdout ?? "").split("\n").flatMap((l) => {
    const m = /^(.+?):(\d+):\d+: (.*) \[Error\/architect\((.+?)\)\]$/.exec(l);
    return m ? [{ part: "rules" as const, rule: m[4]!, file: m[1]!, line: Number(m[2]), message: m[3]! }] : [];
  });
};
