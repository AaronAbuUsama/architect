// Ratchets: `.architect/ratchets.json` holds how many findings of a rule a project still allows itself. A count may
// only go down: more findings than it allows fail, and fewer say the file should be lowered.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Finding } from "../types.ts";

export const ratchetsOf = (root: string): Readonly<Record<string, number>> => {
  const file = join(root, ".architect/ratchets.json");
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Record<string, number>) : {};
};

/** The findings no ratchet allows, and what the ratchets say. */
export const ratchet = (findings: ReadonlyArray<Finding>, allowed: Readonly<Record<string, number>>) => {
  const count = (rule: string) => findings.filter((f) => f.rule === rule).length;
  const over = findings.filter((f) => count(f.rule) > (allowed[f.rule] ?? 0));
  const lower = Object.entries(allowed).filter(([rule, n]) => count(rule) < n).map(([rule, n]) => `  ${rule} allows ${n} but has ${count(rule)}: lower it`);
  const total = Object.values(allowed).reduce((a, b) => a + b, 0);
  return { over, lines: [`ratchets ${total}`, ...lower] };
};
