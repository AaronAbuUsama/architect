// The generated CLI as a Node single executable (D3 #9; spikes/single-binary): the official Node binary for a platform, with the CLI's
// bundle injected as a blob by postject. Built here for the platform this machine is; Node's own cross-build works too, and CI builds the
// other one on its own runner.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { PublishFailed, type Binary } from "../types.ts";
import { bundle } from "./bundle.ts";

export const NODE_VERSION = "24.22.2";
export type Target = "darwin-arm64" | "linux-x64";

/** The fuse sentinel Node's single-executable support looks for, the same in every Node release. */
const SENTINEL = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

/** The platform this machine is, when a single executable can be built for it here. */
export const hostTarget = (): Target | undefined =>
  process.platform === "darwin" && process.arch === "arm64" ? "darwin-arm64" : process.platform === "linux" && process.arch === "x64" ? "linux-x64" : undefined;

const run = (what: string, command: string, args: ReadonlyArray<string>, cwd?: string) =>
  Effect.try({
    try: () => {
      const r = spawnSync(command, [...args], { encoding: "utf8", ...(cwd === undefined ? {} : { cwd }), maxBuffer: 64 * 1024 * 1024 });
      if (r.status !== 0) throw new Error(`${what} failed (${command} exited ${r.status}): ${(r.stderr || r.stdout).trim().split("\n").slice(-4).join(" | ")}`);
      return r.stdout;
    },
    catch: (e) => new PublishFailed({ message: String((e as { message?: unknown }).message ?? e) }),
  });

const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

/**
 * Node's official binary for a platform, from nodejs.org, checked against the release's `SHASUMS256.txt` and kept in the cache:
 * downloaded once for every project and every run after.
 */
export const nodeBinary = (cache: string, target: Target): Effect.Effect<string, PublishFailed> =>
  Effect.gen(function* () {
    const kept = join(cache, `node-v${NODE_VERSION}-${target}`, "node");
    if (existsSync(kept)) return kept;
    const base = `https://nodejs.org/dist/v${NODE_VERSION}`;
    const archive = `node-v${NODE_VERSION}-${target}.tar.gz`;
    const work = join(cache, `download-${process.pid}`);
    yield* Effect.try({ try: () => { rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true }); }, catch: (e) => new PublishFailed({ message: String(e) }) });
    yield* run("the download of Node's checksums", "curl", ["-fsS", "--max-time", "600", "-o", join(work, "SHASUMS256.txt"), `${base}/SHASUMS256.txt`]);
    yield* run(`the download of ${archive}`, "curl", ["-fsS", "--max-time", "900", "-o", join(work, archive), `${base}/${archive}`]);
    const expected = readFileSync(join(work, "SHASUMS256.txt"), "utf8").split("\n").find((l) => l.endsWith(`  ${archive}`))?.split(/\s+/)[0];
    if (expected === undefined || sha256(join(work, archive)) !== expected) {
      rmSync(work, { recursive: true, force: true });
      return yield* new PublishFailed({ message: `${archive} does not match nodejs.org's SHASUMS256.txt; nothing was installed` });
    }
    yield* run(`unpacking ${archive}`, "tar", ["-xzf", archive, "--strip-components=2", `node-v${NODE_VERSION}-${target}/bin/node`], work);
    yield* Effect.try({
      try: () => { mkdirSync(dirname(kept), { recursive: true }); renameSync(join(work, "node"), kept); rmSync(work, { recursive: true, force: true }); },
      catch: (e) => new PublishFailed({ message: String(e) }),
    });
    return kept;
  });

/** Build `<project>-<version>-<target>.tar.gz` in `out`: the executable named `<project>`, and the tarball's sha256. */
export const buildBinary = (options: {
  readonly root: string;
  readonly project: string;
  readonly version: string;
  readonly out: string;
  readonly cache: string;
  readonly target: Target;
}): Effect.Effect<Binary, PublishFailed> =>
  Effect.gen(function* () {
    const { root, project, version, out, target } = options;
    const node = yield* nodeBinary(options.cache, target);
    const work = join(out, `sea-${target}`);
    yield* Effect.try({ try: () => { rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true }); }, catch: (e) => new PublishFailed({ message: String(e) }) });
    // CommonJS, with every package inside: the single executable has no node_modules to look in.
    yield* bundle({ root, entry: "generated/cli/src/main.ts", outfile: join(work, "bundle.cjs"), format: "cjs", platform: "node", version, inline: true });
    // The blob without a code cache, which is platform-specific, so one blob serves every target.
    writeFileSync(join(work, "sea-config.json"), JSON.stringify({ main: join(work, "bundle.cjs"), output: join(work, "sea.blob"), disableExperimentalSEAWarning: true, useCodeCache: false }));
    yield* run("the single-executable blob", node, ["--experimental-sea-config", join(work, "sea-config.json")]);
    const binary = join(work, project);
    const postject = join(dirname(createRequire(import.meta.url).resolve("postject/package.json")), "dist/cli.js");
    yield* Effect.try({ try: () => { copyFileSync(node, binary); chmodSync(binary, 0o755); }, catch: (e) => new PublishFailed({ message: String(e) }) });
    // On macOS the copied Node's signature goes before the blob and an ad hoc one is made after (a downloaded binary also wants Apple's: the cloud pass's).
    if (target === "darwin-arm64") yield* run("removing Node's signature", "codesign", ["--remove-signature", binary]);
    yield* run("injecting the CLI into Node", process.execPath, [postject, binary, "NODE_SEA_BLOB", join(work, "sea.blob"), "--sentinel-fuse", SENTINEL, ...(target === "darwin-arm64" ? ["--macho-segment-name", "NODE_SEA"] : [])]);
    if (target === "darwin-arm64") yield* run("signing the executable", "codesign", ["--sign", "-", binary]);
    const tarball = join(out, `${project}-${version}-${target}.tar.gz`);
    yield* run("tarring the executable", "tar", ["-czf", tarball, "-C", work, project]);
    yield* Effect.try({ try: () => rmSync(work, { recursive: true, force: true }), catch: (e) => new PublishFailed({ message: String(e) }) });
    return { target, tarball, sha256: sha256(tarball), bytes: statSync(tarball).size } satisfies Binary;
  });
