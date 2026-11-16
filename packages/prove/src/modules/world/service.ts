import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect, Schedule } from "effect";
import { WorldFailed, type WorldsApi } from "./types.ts";
import { applyMigrations, startWrangler, stop } from "./internal/wrangler.ts";

const answers = (url: string) =>
  Effect.tryPromise({ try: () => fetch(url).then((r) => r.ok), catch: () => false }).pipe(
    Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail(false))),
  );

export const Worlds: WorldsApi = {
  start: ({ root, port, name, otlp }) =>
    Effect.gen(function* () {
      const config = resolve(root, "generated/server/wrangler.jsonc");
      if (!existsSync(config)) return yield* new WorldFailed({ message: `${config} is missing: run nx sync first` });
      // A fresh world each run: stage one has no migrations between versions.
      const state = resolve(root, ".architect", name);
      rmSync(state, { recursive: true, force: true });
      mkdirSync(state, { recursive: true });
      yield* applyMigrations(config, state);
      const log = join(state, "wrangler.log");
      const secret = randomBytes(32).toString("hex");
      const url = `http://127.0.0.1:${port}`;
      const vars = { AUTH_SECRET: secret, ...(otlp ? { OTLP_URL: otlp } : {}) };
      // wrangler picks the worker's internal sockets itself, and two worlds starting together can pick the same one;
      // it then exits at once, so an early exit for a taken address starts it again.
      const attempt = Effect.gen(function* () {
        const from = existsSync(log) ? readFileSync(log, "utf8").length : 0;
        const child = yield* Effect.acquireRelease(startWrangler(config, state, port, vars, log), stop);
        const up = Effect.suspend((): Effect.Effect<void, "exited" | "silent"> =>
          child.exitCode !== null ? Effect.fail("exited") : answers(`${url}/_world/health`).pipe(Effect.mapError(() => "silent" as const)));
        yield* up.pipe(
          Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 480, while: (e) => e !== "exited" }),
          Effect.mapError((e) => new WorldFailed({ message: e === "exited" ? `the world exited (${child.exitCode}); see ${log}` : `the world didn't answer within 120 s; see ${log}`, taken: e === "exited" && readFileSync(log, "utf8").slice(from).includes("Address already in use") })),
        );
      });
      yield* attempt.pipe(Effect.retry({ times: 3, while: (e) => e.taken === true }));
      return { url, log };
    }),
};
