// What an environment leaves on disk to be found again: a pid, a port, and the bundle it runs. And stopping it.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { join } from "node:path";
import { Effect, Schedule } from "effect";
import { Collectors } from "#modules/telemetry/service.js";
import { collectorName } from "./collector.ts";

export const files = (dir: string) => ({
  config: join(dir, "wrangler.jsonc"),
  secrets: join(dir, "secrets.env"),
  state: join(dir, "state"),
  pid: join(dir, "pid"),
  port: join(dir, "port"),
  bundle: join(dir, "bundle.json"),
  log: join(dir, "wrangler.log"),
});

const readNumber = (file: string): number | undefined => {
  const n = existsSync(file) ? Number(readFileSync(file, "utf8").trim()) : NaN;
  return Number.isInteger(n) && n > 1 ? n : undefined;
};
export const readPid = (dir: string) => readNumber(files(dir).pid);
export const readPort = (dir: string) => readNumber(files(dir).port);
export const writePort = (dir: string, port: number) => writeFileSync(files(dir).port, `${port}\n`);

/** Something of this process group still runs. The group, not just wrangler: workerd is wrangler's child. */
export const groupAlive = (pid: number) =>
  Effect.try({ try: () => process.kill(-pid, 0), catch: () => "gone" as const }).pipe(Effect.match({ onFailure: () => false, onSuccess: () => true }));

/** The pid is wrangler's, not a process that has since taken the number. */
export const isWrangler = (pid: number): boolean => {
  const ps = spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });
  return ps.status === 0 && ps.stdout.includes("wrangler");
};

const signal = (pid: number, name: "SIGTERM" | "SIGKILL") =>
  Effect.try({ try: () => process.kill(-pid, name), catch: () => "gone" as const }).pipe(Effect.ignore);

/** Stop the group: ask, wait up to ten seconds, then insist. */
export const stopGroup = (pid: number) =>
  Effect.gen(function* () {
    const gone = groupAlive(pid).pipe(Effect.flatMap((alive) => (alive ? Effect.fail("alive" as const) : Effect.void)));
    yield* signal(pid, "SIGTERM");
    const stopped = yield* gone.pipe(Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 100 }), Effect.option);
    if (stopped._tag === "None") {
      yield* signal(pid, "SIGKILL");
      yield* gone.pipe(Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 50 }), Effect.ignore);
    }
  });

/** What marks an environment as running goes: the state, the secrets and the port stay for the next start. */
export const forget = (dir: string) => {
  const f = files(dir);
  for (const file of [f.pid, f.bundle]) rmSync(file, { force: true });
};

/** Whether a port can be listened on at 127.0.0.1 now. */
export const isFree = (port: number) =>
  Effect.callback<boolean>((resume) => {
    const server = createServer();
    server.once("error", () => resume(Effect.succeed(false)));
    server.listen(port, "127.0.0.1", () => server.close(() => resume(Effect.succeed(true))));
  });

/** A port the system says is free. */
export const anyPort = Effect.callback<number>((resume) => {
  const server = createServer();
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address() as { port: number };
    server.close(() => resume(Effect.succeed(port)));
  });
});

/** Stop whatever the pid file names and the collector that went with it, and clear what marks the environment as running. */
export const reap = (dir: string) =>
  Effect.gen(function* () {
    const pid = readPid(dir);
    if (pid !== undefined && (yield* groupAlive(pid))) yield* stopGroup(pid);
    yield* Collectors.stop(collectorName(dir));
    forget(dir);
  });

/** The port asked for if it is free (an explicit one that isn't is refused), else the one it last had, else any. */
export const choosePort = (dir: string, wanted: number | undefined) =>
  Effect.gen(function* () {
    if (wanted !== undefined) {
      if (!(yield* isFree(wanted))) return yield* Effect.fail(`port ${wanted} is already in use`);
      return wanted;
    }
    const last = readPort(dir);
    return last !== undefined && (yield* isFree(last)) ? last : yield* anyPort;
  });

/** Run a command detached in its own process group, its output appended to `log`, its pid written at once. */
export const spawnDetached = (run: { readonly command: string; readonly args: ReadonlyArray<string>; readonly env: Readonly<Record<string, string>> }, log: string, pidFile: string) =>
  Effect.sync((): ChildProcess => {
    const out = openSync(log, "a");
    const child = spawn(run.command, [...run.args], { stdio: ["ignore", out, out], detached: true, env: { ...process.env, ...run.env } });
    child.unref();
    writeFileSync(pidFile, `${child.pid}\n`);
    return child;
  });
