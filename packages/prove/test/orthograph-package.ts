// `orthograph` is built into one folder of this repository (packages/orthograph/dist) and published from it. Test files run in
// parallel workers, and two of them (publish, staging) each put it on a registry of their own: a build that cleans `dist` while
// the other's `pnpm publish` is packing it leaves a tarball with no `dist` (exit 254, or an installed package that cannot load).
// So the build and the publish are one step taken under a lock every worker shares, and no test deletes `dist` afterwards.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const lock = join(tmpdir(), "ortho-orthograph-package.lock");
const owner = join(lock, "pid");
const pause = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
/** True when the process that took the lock is gone, so that a worker that was killed does not hold everyone else for good. */
const abandoned = () => {
  const pid = existsSync(owner) ? readFileSync(owner, "utf8").trim() : "";
  return pid !== "" && spawnSync("kill", ["-0", pid]).status !== 0;
};
/** `mkdir` without `-p` is atomic: exactly one process makes the folder. */
const take = () => {
  while (spawnSync("mkdir", [lock], { stdio: "ignore" }).status !== 0) {
    if (abandoned()) rmSync(lock, { recursive: true, force: true });
    else pause(250);
  }
  writeFileSync(owner, String(process.pid));
};

/** Builds `orthograph` and publishes it to `registry`, alone; what each command printed and how it ended, for the test to assert. */
export const publishOrthograph = (repo: string, registry: string, env: Record<string, string | undefined>) => {
  take();
  const built = spawnSync("pnpm", ["nx", "run", "orthograph:build", "--outputStyle=static"], { cwd: repo, encoding: "utf8", env: { ...env, NX_DAEMON: "false" } });
  const published = built.status === 0
    ? spawnSync("pnpm", ["publish", "--registry", registry, "--no-git-checks"], { cwd: join(repo, "packages/orthograph"), encoding: "utf8", env })
    : undefined;
  rmSync(lock, { recursive: true, force: true });
  return { built, published };
};
