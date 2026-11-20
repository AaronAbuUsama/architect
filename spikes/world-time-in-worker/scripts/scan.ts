// Lists every wall-clock read in the ESM each library ships: `Date.now()`, an argument-less `new Date()`,
// `performance.now()`, `setTimeout` and `setInterval`. Writes findings/wall-clock-reads.txt.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const store = "node_modules/.pnpm";
const packages: ReadonlyArray<[string, string]> = [
  ["better-auth@1.7.15", "better-auth"],
  ["@better-auth+core@1.7.15", "@better-auth/core"],
  ["@better-auth+kysely-adapter@1.7.15", "@better-auth/kysely-adapter"],
  ["@better-auth+utils@0.5.1", "@better-auth/utils"],
  ["better-call@1.4.4", "better-call"],
  ["jose@6.2.15", "jose"],
  ["viem@2.57.20", "viem"],
  ["ox@0.14.67", "ox"],
  ["effect@4.1.1", "effect"],
  ["kysely@0.29.7", "kysely"],
];
const patterns: ReadonlyArray<[string, RegExp]> = [
  ["Date.now()", /\bDate\.now\(\)/],
  ["new Date()", /new Date\(\s*\)/],
  ["performance.now()", /performance\.now\(\)/],
  ["setTimeout", /\bsetTimeout\(/],
  ["setInterval", /\bsetInterval\(/],
];
const skip = (p: string) => /\.d\.(m|c)?ts$|\.map$|\.cjs$|\/(cjs|_cjs|umd|_types|types)\//.test(p) || !/\.(m?js)$/.test(p);
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (n === "node_modules") return [];
    return statSync(p).isDirectory() ? walk(p) : skip(p) ? [] : [p];
  });

const out: string[] = [];
const summary: string[] = [];
for (const [prefix, name] of packages) {
  const dir = readdirSync(store).find((d) => d === prefix || d.startsWith(prefix + "_"));
  if (!dir) { summary.push(`${name}: not installed`); continue; }
  const root = join(store, dir, "node_modules", name);
  const counts = new Map<string, number>();
  for (const file of walk(root)) {
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      for (const [label, re] of patterns) {
        if (!re.test(line)) continue;
        counts.set(label, (counts.get(label) ?? 0) + 1);
        out.push(`${name}/${file.slice(root.length + 1)}:${i + 1}\t${label}\t${line.trim().slice(0, 160)}`);
      }
    });
  }
  summary.push(`${name}: ${[...counts].map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`);
}
writeFileSync("findings/wall-clock-reads.txt", summary.join("\n") + "\n\n" + out.join("\n") + "\n");
console.log(summary.join("\n"));
