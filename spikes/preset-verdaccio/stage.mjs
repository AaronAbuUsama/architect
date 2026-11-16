// Spike: stage packages/<pkg> into work/ws/packages/<pkg> as a publishable copy.
// Source is untouched; the staged package.json gains `publishConfig` (the recipe proposed for the real packages).
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repo = new URL("../../", import.meta.url).pathname;
const ws = new URL("./work/ws/", import.meta.url).pathname;
const pkgs = process.argv.slice(2);

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const dist = (p) => p.replace(/^\.\/src\//, "./dist/").replace(/\.ts$/, ".js");
const types = (p) => dist(p).replace(/\.js$/, ".d.ts");

mkdirSync(ws, { recursive: true });
writeFileSync(join(ws, "pnpm-workspace.yaml"), "packages:\n  - packages/*\n");
writeFileSync(join(ws, "package.json"), '{"name":"spike-ws","private":true}\n');

for (const pkg of pkgs) {
  const from = join(repo, "packages", pkg);
  const to = join(ws, "packages", pkg);
  rmSync(to, { recursive: true, force: true });
  mkdirSync(to, { recursive: true });
  const pj = JSON.parse(readFileSync(join(from, "package.json"), "utf8"));
  cpSync(join(from, "src"), join(to, "src"), { recursive: true, filter: (s) => !s.endsWith(".test.ts") });
  for (const extra of ["README.md", "generators.json", "schema.json"]) {
    try { cpSync(join(from, extra), join(to, extra)); } catch {}
  }
  // `#modules/x.ts` is not relative, so tsc's rewriteRelativeImportExtensions leaves it as `.ts` (TS2877). Spell it `.js` in the staged copy.
  for (const f of walk(join(to, "src"))) {
    const s = readFileSync(f, "utf8");
    const t = s.replace(/(["'`])(#modules\/[^"'`]*?)\.ts\1/g, "$1$2.js$1");
    if (s !== t) writeFileSync(f, t);
  }
  const exp = pj.exports ?? {};
  const pubExports = {};
  for (const [k, v] of Object.entries(exp)) {
    pubExports[k] = k === "./package.json" ? v : { types: types(v), default: dist(v) };
  }
  const publishConfig = { access: "public", exports: pubExports };
  if (pj.imports) publishConfig.imports = Object.fromEntries(Object.entries(pj.imports).map(([k, v]) => [k, v.replace("./src/", "./dist/")]));
  if (pj.bin) publishConfig.bin = Object.fromEntries(Object.entries(pj.bin).map(([k, v]) => [k, dist(v)]));
  writeFileSync(join(to, "package.json"), JSON.stringify({ ...pj, files: ["dist", "generators.json", "schema.json", "README.md"], publishConfig }, null, 2) + "\n");
  writeFileSync(join(to, "tsconfig.build.json"), JSON.stringify({
    extends: "../../../../tsconfig.build.base.json",
    compilerOptions: { rootDir: "src", outDir: "dist" },
    include: ["src/**/*.ts"],
  }, null, 2) + "\n");
  console.log("staged", pkg);
}
