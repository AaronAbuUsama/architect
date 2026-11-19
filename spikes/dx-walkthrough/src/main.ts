// `node spikes/dx-walkthrough/src/main.ts [--fetch]`: run origin/m1's compiler and generators against Plugged In's
// draft blueprint, trace every output line to the declaration that makes it, and write `data/walkthrough.json`.
// The only entry file: it reads arguments, loads the checkout's toolchain, prints progress and writes the result.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { anchorsOf } from "#modules/anchors/service.js";
import { assemble } from "#modules/assemble/service.js";
import { prepare, resolveRef } from "#modules/checkout/service.js";
import { readK16 } from "#modules/k16/service.js";
import { runtimeSteps } from "#modules/runtime/service.js";
import { trace } from "#modules/trace/service.js";
import type { Toolchain } from "#modules/trace/types.js";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1]! : fallback;
};
const repo = execFileSync("git", ["-C", here, "rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const refs = {
  m1: arg("m1", "origin/m1"),
  source: arg("source", "origin/links/stage-1"),
  sourcePath: arg("source-path", "examples/links"),
  k16: arg("k16", "origin/claude/k16-scaffold-dfdb79"),
};
const out = arg("out", join(here, "data", "walkthrough.json"));
const work = arg("work", join(here, ".work"));
const log = (s: string) => process.stderr.write(`${s}\n`);

if (process.argv.includes("--fetch")) execFileSync("git", ["-C", repo, "fetch", "--quiet", "origin"], { stdio: "inherit" });
const m1Sha = resolveRef(repo, refs.m1);
const sourceSha = resolveRef(repo, refs.source);
if (!m1Sha || !sourceSha) {
  log(`can't resolve ${!m1Sha ? refs.m1 : refs.source}; run with --fetch`);
  process.exit(2);
}

const started = performance.now();
log(`checkout: ${refs.m1} ${m1Sha.slice(0, 8)}, blueprint from ${refs.source} ${sourceSha.slice(0, 8)}`);
const checkout = prepare({ repo, work, m1Sha, sourceSha, sourcePath: refs.sourcePath });

const fromM1 = (path: string) => pathToFileURL(join(checkout.m1Dir, path)).href;
const { Render } = await import(fromM1("packages/generators/src/modules/render/service.ts"));
const { Effect } = await import(fromM1("packages/generators/node_modules/effect/dist/index.js"));
const ts = createRequire(join(checkout.m1Dir, "package.json"))("typescript");
const compilerMain = join(checkout.m1Dir, "packages/compiler/src/main.ts");

const toolchain: Toolchain = {
  compile: (dir) => {
    try {
      const json = execFileSync(process.execPath, [compilerMain, dir], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 });
      return { ok: true, model: JSON.parse(json) };
    } catch (e) {
      return { ok: false, problems: String((e as { stderr?: unknown }).stderr ?? e) };
    }
  },
  render: (name, model, root) =>
    (Effect.runSync(Render.files({ name, model, root })) as ReadonlyArray<{ path: string; content: string; scaffold?: boolean }>).map((f) => ({
      path: f.path,
      content: f.content,
      scaffold: f.scaffold === true,
    })),
};

const anchors = anchorsOf(ts, checkout.projectDir);
log(`anchors: ${anchors.length} declarations`);
const traced = trace({
  projectDir: checkout.projectDir,
  name: "plugged-in",
  anchors,
  toolchain,
  now: () => performance.now(),
  progress: (done, total, id) => {
    if (done % 25 === 0 || done === total) log(`  traced ${done}/${total} (${id})`);
  },
});
const data = assemble({ projectDir: checkout.projectDir, anchors, traced, model: traced.model });
const k16 = readK16(repo, refs.k16);

const result = {
  version: 1,
  meta: {
    app: "Plugged In",
    slug: "plugged-in",
    folder: checkout.projectRel,
    m1: { ref: refs.m1, sha: m1Sha },
    source: { ref: refs.source, sha: sourceSha, path: refs.sourcePath, pr: 56, label: "draft (#56)" },
    renames: checkout.renames,
    fallback: null,
    millis: { ...traced.millis, run: Math.round(performance.now() - started) },
    counts: data.counts,
    generators: data.generators,
  },
  blueprint: data.blueprint,
  anchors: data.anchors,
  files: data.files,
  operations: data.operations,
  runtime: runtimeSteps(checkout.m1Dir),
  k16,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(result)}\n`);
const c = data.counts;
log(`wrote ${out}: ${c.files} files, ${c.attributed}/${c.lines} output lines traced to ${c.traced} declarations (${c.refused} refused, ${c.noChange} moved nothing); K16 ${k16.status}; ${result.meta.millis.run} ms`);
