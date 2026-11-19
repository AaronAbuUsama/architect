// `node spikes/dx-walkthrough/src/main.ts [--fetch]`: run origin/m1's compiler and generators against Plugged In's
// draft blueprint, trace every output line to the declaration that makes it, and write `data/walkthrough.json`.
// The only entry file: it reads arguments, loads the checkout's toolchain, prints progress and writes the result.
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { anchorsOf } from "#modules/anchors/service.js";
import { assemble } from "#modules/assemble/service.js";
import { prepare, resolveRef } from "#modules/checkout/service.js";
import { readK16 } from "#modules/k16/service.js";
import { runtimeSteps } from "#modules/runtime/service.js";
import { runSteps } from "#modules/steps/service.js";
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
  // The generators speak Effect; their failure becomes a value here, at the entry, and nowhere else.
  render: (name, model, root) => {
    try {
      const files = Effect.runSync(Render.files({ name, model, root })) as ReadonlyArray<{ path: string; content: string; scaffold?: boolean }>;
      return { ok: true, files: files.map((f) => ({ path: f.path, content: f.content, scaffold: f.scaffold === true })) };
    } catch (e) {
      return { ok: false, problems: String((e as Error).message ?? e) };
    }
  },
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
if (!traced.ok) {
  log(traced.problems);
  process.exit(2);
}
const runtime = runtimeSteps(checkout.m1Dir);
if (runtime.problems.length > 0) {
  log(runtime.problems.join("\n"));
  process.exit(2);
}
const data = assemble({ projectDir: checkout.projectDir, anchors, traced, model: traced.model });
const k16 = readK16(repo, refs.k16);

// The steps run in the project folder itself, so the name every command derives from its folder is plugged-in.
// The draft is kept aside first: the "you write it" steps copy from it.
const draftDir = join(work, "draft");
rmSync(draftDir, { recursive: true, force: true });
cpSync(checkout.projectDir, draftDir, { recursive: true, filter: (p) => !p.includes("/node_modules") });
const fromPreset = createRequire(join(checkout.m1Dir, "packages/preset/package.json"));
const { FsTree, flushChanges } = fromPreset("nx/src/generators/tree.js");
const { Starter } = await import(fromM1("packages/preset/src/modules/starter/service.ts"));
const presetVersion = JSON.parse(execFileSync("git", ["-C", checkout.m1Dir, "show", "HEAD:packages/preset/package.json"], { encoding: "utf8" })).version;
const cliMain = join(checkout.m1Dir, "packages/cli/src/main.ts");
log("steps: running Plugged In from the first command");
const steps = runSteps(
  {
    projectDir: checkout.projectDir,
    draftDir,
    name: "plugged-in",
    tools: {
      // As create-nx-workspace runs a preset: the generator writes a tree, and the tree's changes are flushed to disk.
      preset: (dir, name) => {
        const tree = new FsTree(dir, false);
        Starter.write(tree, { name }, Starter.read(join(checkout.m1Dir, "examples/starter"), presetVersion));
        const changes = tree.listChanges();
        flushChanges(dir, changes);
        return changes.map((c: { path: string }) => c.path);
      },
      ortho: (dir, args) => {
        const r = spawnSync("sh", ["-c", 'node "$0" "$@" 2>&1', cliMain, ...args], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 26, env: { ...process.env, ORTHO_RUN_DIR: join(work, "run"), NO_COLOR: "1" } });
        return { out: r.stdout ?? "", exit: r.status ?? 1 };
      },
      now: () => performance.now(),
    },
  },
  new Map(traced.files.filter((f) => f.path.startsWith("generated/")).map((f) => [f.path, f.content])),
);
if (steps.problems.length > 0) {
  log(steps.problems.join("\n"));
  process.exit(2);
}

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
  runtime: runtime.steps,
  k16,
  steps: steps.steps,
  blobs: steps.blobs,
  traces: steps.traces,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(result)}\n`);
const c = data.counts;
log(`wrote ${out}: ${c.files} files, ${c.attributed}/${c.lines} output lines traced to ${c.traced} declarations (${c.refused} refused, ${c.noChange} moved nothing); K16 ${k16.status}; ${steps.steps.length} steps, ${steps.traces.length} traces; ${result.meta.millis.run} ms`);
