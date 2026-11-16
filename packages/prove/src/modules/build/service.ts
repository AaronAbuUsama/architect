import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Effect } from "effect";
import { BuildFailed, type BuildApi } from "./types.ts";

const wrangler = join(dirname(fileURLToPath(import.meta.resolve("wrangler/package.json"))), "bin/wrangler.js");

const sha256 = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
const artefacts = (root: string, revision: string) => join(resolve(root), ".architect/artefacts", revision);

const git = (root: string, ...args: ReadonlyArray<string>) =>
  Effect.try({
    try: () => {
      const run = spawnSync("git", args, { cwd: root, encoding: "utf8" });
      if (run.status !== 0) throw new Error(run.stderr.trim() || `git ${args.join(" ")} exited ${run.status}`);
      return run.stdout.trim();
    },
    catch: (e) => new BuildFailed({ message: `${resolve(root)} is not in a git repository, and the revision is the git commit (${String(e).replace(/^Error: /, "")})` }),
  });

const revision: BuildApi["revision"] = (root) => git(root, "rev-parse", "--short", "HEAD");

const find: BuildApi["find"] = (root, rev) =>
  Effect.try({
    try: () => {
      const dir = artefacts(root, rev);
      const main = join(dir, "main.js");
      const record = join(dir, "bundle.json");
      if (!existsSync(main) || !existsSync(record)) return undefined;
      const recorded = (JSON.parse(readFileSync(record, "utf8")) as { sha256: string }).sha256;
      if (sha256(main) !== recorded) throw new Error(`${main} no longer matches the hash recorded when it was built`);
      return { revision: rev, sha256: recorded, main };
    },
    catch: (e) => new BuildFailed({ message: String(e).replace(/^Error: /, "") }),
  });

const build: BuildApi["build"] = (root) =>
  Effect.gen(function* () {
    const rev = yield* revision(root);
    const config = resolve(root, "generated/server/wrangler.jsonc");
    if (!existsSync(config)) return yield* new BuildFailed({ message: `${config} is missing: run nx sync first` });
    const dirty = (yield* git(root, "status", "--porcelain")).length > 0;
    const dir = artefacts(root, rev);
    const main = join(dir, "main.js");
    yield* Effect.try({
      try: () => {
        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dirname(dir), { recursive: true });
        // No credentials: a dry run bundles and stops, and nothing here may reach an account.
        const { CLOUDFLARE_API_TOKEN: _token, CLOUDFLARE_API_KEY: _key, CLOUDFLARE_ACCOUNT_ID: _account, ...env } = process.env;
        const run = spawnSync(process.execPath, [wrangler, "deploy", "--dry-run", "--outdir", dir, "--config", config], {
          cwd: resolve(root), encoding: "utf8", env: { ...env, CI: "1", WRANGLER_SEND_METRICS: "false" }, maxBuffer: 64 * 1024 * 1024,
        });
        if (run.status !== 0 || !existsSync(main)) throw new Error(`wrangler couldn't build the bundle:\n${run.stderr || run.stdout}`);
        writeFileSync(join(dir, "bundle.json"), JSON.stringify({ revision: rev, sha256: sha256(main) }) + "\n");
      },
      catch: (e) => new BuildFailed({ message: String(e).replace(/^Error: /, "") }),
    });
    return { revision: rev, sha256: sha256(main), main, dirty };
  });

export const Build: BuildApi = { revision, build, find };
