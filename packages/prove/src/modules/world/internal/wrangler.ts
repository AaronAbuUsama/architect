import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { openSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { WorldFailed } from "../types.ts";

const bin = join(dirname(fileURLToPath(import.meta.resolve("wrangler/package.json"))), "bin/wrangler.js");

/** Apply the generated migrations to the local database. `CI=1` stops wrangler asking to confirm. */
export const applyMigrations = (config: string, state: string) =>
  Effect.try({
    try: () => {
      const run = spawnSync(process.execPath, [bin, "d1", "migrations", "apply", "DB", "--local", "--config", config, "--persist-to", state], {
        encoding: "utf8",
        env: { ...process.env, CI: "1" },
      });
      if (run.status !== 0) throw new Error(run.stderr || run.stdout);
    },
    catch: (e) => new WorldFailed({ message: `the local database couldn't be made: ${String(e)}` }),
  });

/** `wrangler dev`, its output in `log`. Vars (the world secret among them) travel as arguments, never through a file. */
export const startWrangler = (config: string, state: string, port: number, vars: Readonly<Record<string, string>>, log: string) =>
  Effect.sync((): ChildProcess => {
    const out = openSync(log, "a");
    return spawn(
      process.execPath,
      [bin, "dev", "--config", config, "--port", String(port), "--ip", "127.0.0.1", "--persist-to", state, ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])],
      { stdio: ["ignore", out, out], env: { ...process.env, CI: "1" } },
    );
  });

export const stop = (child: ChildProcess) =>
  Effect.callback<void>((resume) => {
    if (child.exitCode !== null) return resume(Effect.void);
    child.once("exit", () => resume(Effect.void));
    child.kill("SIGTERM");
  });
