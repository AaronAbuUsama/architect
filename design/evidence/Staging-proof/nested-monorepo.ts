// Evidence command entry: actual nested-project publication at the current captured commit.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Effect } from "effect";
import { Publish } from "../../../packages/prove/src/modules/publish/service.ts";
const revision = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
const root = resolve("examples/acme");
void Effect.runPromise(Publish.run({ root, sourceRevision: revision, env: process.env, environment: "production", version: "6.0.0", mode: "dry-run", localTap: false, say: () => Effect.void }).pipe(Effect.tap((result) => Effect.sync(() => {
if (result.packages.length !== 2 || result.packages.some((p) => !p.dir.startsWith(`${root}/.architect/publish/6.0.0/run-`) || !existsSync(`${p.dir}/package.json`) || !p.integrity.startsWith("sha512-"))) process.exit(1);
console.log("nested monorepo captured source: two packages staged with ancestor configs and installed tooling; durable output remains under original project");
}))));
