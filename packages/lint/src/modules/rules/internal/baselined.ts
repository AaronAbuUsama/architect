// What the repository's own code rules share: which files they judge, and the baseline that tolerates today's breaches.
// A rule collects its reports for a file and, at the end of the file, reports all of them only when there are more than
// the baseline allows for that file (as ESLint's bulk suppressions do). The baseline only shrinks: packages/lint/README.md.
import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import type { CodeRuleOptions, Context, Node } from "../types.ts";
import { Baseline } from "#modules/baseline/service.js";

/** Package source: `packages/<pkg>/src/…`, never generated code. */
const SOURCE = /^packages\/[^/]+\/src\//;

export const optionsOf = (context: Context): CodeRuleOptions => (context.options[0] as CodeRuleOptions | undefined) ?? {};

/** The file's path from cwd, when it is package source these rules judge. */
export const sourcePath = (context: Context): string | undefined => {
  const path = relative(context.cwd, context.filename).split("\\").join("/");
  if (isAbsolute(path) || path.startsWith("../") || !SOURCE.test(path) || path.includes("/generated/")) return undefined;
  return path;
};

type Counts = Readonly<Record<string, Readonly<Record<string, number>>>>;

// Every linted file asks for the same baseline: read it again only when it changed (an editor's server lives long).
const loaded = new Map<string, { readonly at: number; readonly counts: Counts }>();
const baselineAt = (file: string): Counts => {
  const at = existsSync(file) ? statSync(file).mtimeMs : -1;
  const known = loaded.get(file);
  if (known !== undefined && known.at === at) return known.counts;
  const counts: Counts = at === -1 ? {} : (JSON.parse(readFileSync(file, "utf8")) as Counts);
  loaded.set(file, { at, counts });
  return counts;
};

/** How many of `rule`'s breaches the baseline tolerates in `path` (for six-slots, in its module). */
export const allowed = (context: Context, rule: string, path: string): number => {
  const file = optionsOf(context).baseline;
  return file === undefined ? 0 : (baselineAt(resolve(context.cwd, file))[rule]?.[Baseline.keyOf(rule, path)] ?? 0);
};

/** A per-file collector: `add` while visiting, `flush` at the end of the file reports all when over the baseline. */
export const collector = (context: Context, rule: string, path: string) => {
  const found: Array<{ readonly node: Node; readonly message: string }> = [];
  return {
    add: (node: Node, message: string): void => void found.push({ node, message }),
    flush: (): void => {
      if (found.length <= allowed(context, rule, path)) return;
      for (const r of found) context.report(r);
    },
  };
};
