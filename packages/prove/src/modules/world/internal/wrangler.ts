import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect, Schedule } from "effect";
import { WorldFailed } from "../types.ts";

const bin = join(dirname(fileURLToPath(import.meta.resolve("wrangler/package.json"))), "bin/wrangler.js");

/** Apply the generated migrations to the local database. `CI=1` stops wrangler asking to confirm. */
export const applyMigrations = (config: string, state: string) =>
  Effect.try({
    try: () => {
      const run = spawnSync(process.execPath, [bin, "d1", "migrations", "apply", "DB", "--local", "--config", config, "--persist-to", state], {
        encoding: "utf8",
        env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" },
      });
      if (run.status !== 0) throw new Error(run.stderr || run.stdout);
    },
    catch: (e) => new WorldFailed({ message: `the local database couldn't be made: ${String(e)}` }),
  });

/** How to run one `wrangler dev`: its own state, its own inspector port, its output in `log`. */
export interface Wrangle {
  readonly config: string;
  readonly state: string;
  readonly port: number;
  readonly log: string;
  /** Vars travel as arguments: only for a throwaway secret. A real one goes in `envFile`. */
  readonly vars?: Readonly<Record<string, string>>;
  /** A file of secrets (`NAME=value` lines), read by wrangler and never shown by `ps`. */
  readonly envFile?: string;
  /** Own process group, outliving this process: a long-lived environment. */
  readonly detached?: boolean;
  /** Written with the process id as soon as it exists, so a caller killed part-way can still find what it started. */
  readonly pidFile?: string;
}

/**
 * `wrangler dev`, its output appended to `log`. `--inspector-port 0` keeps two of them off the same inspector port (9229).
 */
export const startWrangler = (w: Wrangle) =>
  Effect.sync((): ChildProcess => {
    const out = openSync(w.log, "a");
    const args = [
      bin, "dev", "--config", w.config, "--port", String(w.port), "--ip", "127.0.0.1", "--persist-to", w.state, "--inspector-port", "0",
      ...(w.envFile ? ["--env-file", w.envFile] : []),
      ...Object.entries(w.vars ?? {}).flatMap(([k, v]) => ["--var", `${k}:${v}`]),
    ];
    const child = spawn(process.execPath, args, { stdio: ["ignore", out, out], detached: w.detached === true, env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" } });
    if (w.detached) child.unref();
    if (w.pidFile) writeFileSync(w.pidFile, `${child.pid}\n`);
    return child;
  });

export const stop = (child: ChildProcess) =>
  Effect.callback<void>((resume) => {
    if (child.exitCode !== null || child.signalCode !== null) return resume(Effect.void);
    child.once("exit", () => resume(Effect.void));
    child.kill("SIGTERM");
  });

const answers = (url: string) =>
  Effect.tryPromise({ try: () => fetch(url).then((r) => r.ok), catch: () => false }).pipe(
    Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail(false))),
  );

/**
 * Start wrangler and wait until `ready` answers. wrangler picks the worker's internal sockets itself, and two of them
 * starting together can pick the same one; it then exits at once, so an early exit for a taken address starts it again.
 * A process that never comes up is stopped. One that does is the caller's.
 */
export const bringUp = (w: Wrangle, ready: string) => {
  const url = `http://127.0.0.1:${w.port}${ready}`;
  const attempt = Effect.gen(function* () {
    const from = readLog(w.log).length;
    const child = yield* startWrangler(w);
    const up = Effect.suspend((): Effect.Effect<void, "exited" | "silent"> =>
      child.exitCode !== null ? Effect.fail("exited") : answers(url).pipe(Effect.mapError(() => "silent" as const)));
    yield* up.pipe(
      Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 480, while: (e) => e !== "exited" }),
      Effect.tapError(() => stop(child)),
      Effect.mapError((e) => new WorldFailed({
        message: e === "exited" ? `the world exited (${child.exitCode}); see ${w.log}` : `the world didn't answer within 120 s; see ${w.log}`,
        taken: e === "exited" && readLog(w.log).slice(from).includes("Address already in use"),
      })),
    );
    return child;
  });
  return attempt.pipe(Effect.retry({ times: 3, while: (e) => e.taken === true }));
};

const readLog = (log: string) => (existsSync(log) ? readFileSync(log, "utf8") : "");
