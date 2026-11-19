// The lint baseline's command (packages/lint/README.md, "The baseline"). Run from the repository's root:
//   node packages/lint/scripts/baseline.ts            check: fail on a new breach, or on a baseline that should shrink
//   node packages/lint/scripts/baseline.ts --shrink   lower the baseline to what is left (never raises an entry)
//   node packages/lint/scripts/baseline.ts --seed     write today's counts (a new rule, or a branch taking the rules in)
// It lints package source with the code rules' baselines turned off, counts what they report, and compares.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Baseline } from "../src/modules/baseline/service.ts";
import type { Breach, Counts } from "../src/modules/baseline/types.ts";

const repo = resolve(import.meta.dirname, "../../..");
const RULES = ["effect-only", "max-lines", "six-slots"];
const mode = process.argv[2] ?? "--check";
const config = JSON.parse(readFileSync(join(repo, ".oxlintrc.json"), "utf8"));
const file = join(repo, config.rules["ortho/effect-only"][1].baseline);

// The workspace's own options for the three rules, minus their baseline, in a config of their own.
const scratch = mkdtempSync(join(tmpdir(), "ortho-baseline-"));
const options = (rule: string) => {
  const { baseline: _, ...rest } = config.rules[`ortho/${rule}`][1];
  return ["error", rest];
};
writeFileSync(join(scratch, "oxlintrc.json"), JSON.stringify({
  jsPlugins: [join(repo, "packages/lint/src/main.ts")],
  categories: { correctness: "off" },
  plugins: [],
  ignorePatterns: config.ignorePatterns,
  rules: Object.fromEntries(RULES.map((r) => [`ortho/${r}`, options(r)])),
}));
const run = spawnSync(join(repo, "node_modules/.bin/oxlint"), ["-c", join(scratch, "oxlintrc.json"), "--format", "json", "packages"], { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
rmSync(scratch, { recursive: true, force: true });
const diagnostics = (JSON.parse(run.stdout || "{}").diagnostics ?? []) as ReadonlyArray<{ readonly code: string; readonly filename: string }>;
if (run.status !== 0 && run.status !== 1) {
  console.error(`oxlint did not run (exit ${run.status}):\n${run.stderr}`);
  process.exit(2);
}

const actual = Baseline.count(diagnostics.flatMap((d) => {
  const m = /^ortho\((.+)\)$/.exec(d.code);
  return m?.[1] !== undefined && RULES.includes(m[1]) ? [{ rule: m[1], path: Baseline.keyOf(m[1], d.filename) }] : [];
}));
const baseline = JSON.parse(readFileSync(file, "utf8")) as Counts;
const verdict = Baseline.compare(baseline, actual);
const line = (b: Breach) => `  ortho/${b.rule} ${b.path}: ${b.actual} (baseline ${b.allowed})`;
const totals = (c: Counts) => RULES.map((r) => `${r} ${Object.values(c[r] ?? {}).reduce((a, n) => a + n, 0)} in ${Object.keys(c[r] ?? {}).length} files`).join(", ");

if (mode === "--seed") {
  writeFileSync(file, Baseline.render(actual));
  console.log(`baseline seeded: ${totals(actual)}`);
} else if (mode === "--shrink") {
  const shrunk = Baseline.shrink(baseline, actual);
  writeFileSync(file, Baseline.render(shrunk));
  console.log(`baseline shrunk to ${totals(shrunk)}`);
  if (verdict.over.length > 0) {
    console.error(`new breaches, not added (fix them):\n${verdict.over.map(line).join("\n")}`);
    process.exit(1);
  }
} else {
  if (verdict.over.length > 0) console.error(`new breaches of the code rules (fix them; the baseline never grows):\n${verdict.over.map(line).join("\n")}`);
  if (verdict.stale.length > 0) console.error(`fixed, so the baseline must shrink: run \`pnpm nx run lint:baseline\` and commit packages/lint/baseline.json\n${verdict.stale.map(line).join("\n")}`);
  if (verdict.over.length + verdict.stale.length > 0) process.exit(1);
  console.log(`lint baseline holds: ${totals(actual)}`);
}
