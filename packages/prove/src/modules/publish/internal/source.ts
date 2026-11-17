import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { Effect } from "effect";
import { PublishFailed } from "../types.ts";

const io = <A>(work: () => A) => Effect.try({ try: work, catch: (e) => new PublishFailed({ message: String(e) }) });
const git = (root: string, ...args: ReadonlyArray<string>) => Effect.gen(function* () {
  const result = yield* io(() => spawnSync("git", [...args], { cwd: root, encoding: "utf8" }));
  if (result.status !== 0) return yield* new PublishFailed({ message: `cannot capture publication source: ${result.stderr || result.error?.message || result.status}` });
  return result.stdout.trim();
});

/** Archive the whole committed tree so nested projects retain ancestor configs; dependencies remain installed tooling. */
const capture = (root: string, revision: string, scratch: string) => Effect.gen(function* () {
  if (!/^[0-9a-f]{40}$/.test(revision)) return yield* new PublishFailed({ message: "publication sourceRevision must be a full Git commit" });
  const project = yield* io(() => realpathSync(resolve(root)));
  const top = yield* git(project, "rev-parse", "--show-toplevel");
  const repo = yield* io(() => realpathSync(top));
  const commit = yield* git(repo, "rev-parse", "--verify", "--end-of-options", `${revision}^{commit}`);
  const tree = join(scratch, basename(repo));
  yield* io(() => mkdirSync(tree));
  const archive = yield* io(() => spawnSync("git", ["archive", "--format=tar", commit], { cwd: repo, maxBuffer: 256 * 1024 * 1024 }));
  if (archive.status !== 0) return yield* new PublishFailed({ message: "git could not archive the captured publication revision" });
  const unpacked = yield* io(() => spawnSync("tar", ["-xf", "-", "-C", tree], { input: archive.stdout, encoding: "utf8" }));
  if (unpacked.status !== 0) return yield* new PublishFailed({ message: `cannot unpack captured publication source: ${unpacked.stderr}` });
  for (let original = project; ; original = dirname(original)) {
    const installed = join(original, "node_modules");
    const target = join(tree, relative(repo, original), "node_modules");
    if (existsSync(installed) && !existsSync(target)) yield* io(() => symlinkSync(installed, target, "dir"));
    if (original === repo) break;
  }
  return join(tree, relative(repo, project));
});

/** Only the source tree is temporary. All packages, binaries and formula URLs are owned by the original root. */
export const withSource = <A, E, R>(root: string, revision: string | undefined, use: (source: string) => Effect.Effect<A, E, R>) =>
  revision === undefined ? use(root) : Effect.acquireUseRelease(
    io(() => mkdtempSync(join(realpathSync(tmpdir()), "forman-publish-source-"))),
    (scratch) => capture(root, revision, scratch).pipe(Effect.flatMap(use)),
    (scratch) => io(() => rmSync(scratch, { recursive: true, force: true })).pipe(Effect.ignore),
  );
