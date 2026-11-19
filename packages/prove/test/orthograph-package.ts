// `orthograph` is built into one folder of this repository (packages/orthograph/dist) and published from it. Test files run in
// parallel workers, and two of them (publish, staging) each put it on a registry of their own: a build that cleans `dist` while
// the other's `pnpm publish` is packing it leaves a tarball with no `dist` (exit 254, or an installed package that cannot load).
// So the build and the publish are one step taken under a lock every worker shares, and no test deletes `dist` afterwards.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const lock = join(tmpdir(), "ortho-orthograph-package.lock");
const pause = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const alive = (pid: string) => spawnSync("kill", ["-0", pid]).status === 0;
/** The pid in a lock folder, or "" when the folder or its file is gone or not written yet: one read, so a lock released meanwhile is no error. */
const ownerIn = (folder: string) => {
  try { return readFileSync(join(folder, "pid"), "utf8").trim(); } catch { return ""; }
};
/** A lock with no owner file is from a crash between making it and writing the owner; it counts as abandoned once it is too old for a worker to be between those steps. */
const orphaned = (folder: string) => {
  try { return Date.now() - statSync(folder).mtimeMs > 30_000; } catch { return false; }
};
/**
 * Clears the lock when the process that took it is gone, so that a worker that was killed does not hold everyone else for good.
 * The owner is read once; the folder is then moved aside (a rename: atomic, and only one worker wins it) and the owner is read
 * again from the moved folder, so a lock that another worker took after our first look is never the one removed.
 */
const reclaim = () => {
  const seen = ownerIn(lock);
  if (seen === "" ? !orphaned(lock) : alive(seen)) return;
  const aside = `${lock}.reclaim-${process.pid}`;
  try { renameSync(lock, aside); } catch { return; }
  if (ownerIn(aside) === seen) { rmSync(aside, { recursive: true, force: true }); return; }
  try { renameSync(aside, lock); } catch { rmSync(aside, { recursive: true, force: true }); }
};
/**
 * The lock folder is made whole, owner file in it, and only then renamed to the lock's name. A rename onto a folder that has files
 * in it fails, so exactly one process takes the lock, and a lock never exists without the file that says whose it is.
 */
const take = () => {
  const mine = mkdtempSync(join(tmpdir(), "ortho-orthograph-package-"));
  writeFileSync(join(mine, "pid"), String(process.pid));
  for (;;) {
    try { renameSync(mine, lock); return; } catch { reclaim(); pause(250); }
  }
};

/** Builds `orthograph` and publishes it to `registry`, alone; what each command printed and how it ended, for the test to assert. */
export const publishOrthograph = (repo: string, registry: string, env: Record<string, string | undefined>) => {
  take();
  try {
    const built = spawnSync("pnpm", ["nx", "run", "orthograph:build", "--outputStyle=static"], { cwd: repo, encoding: "utf8", env: { ...env, NX_DAEMON: "false" } });
    const published = built.status === 0
      ? spawnSync("pnpm", ["publish", "--registry", registry, "--no-git-checks"], { cwd: join(repo, "packages/orthograph"), encoding: "utf8", env })
      : undefined;
    return { built, published };
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
};
