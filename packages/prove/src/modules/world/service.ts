import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
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
      const child = yield* Effect.acquireRelease(startWrangler(config, state, port, { AUTH_SECRET: secret, ...(otlp ? { OTLP_URL: otlp } : {}) }, log), stop);
      const url = `http://127.0.0.1:${port}`;
      yield* answers(`${url}/_world/health`).pipe(
        Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 480 }),
        Effect.mapError(() => new WorldFailed({ message: `the world didn't answer within 120 s (exit ${child.exitCode}); see ${log}` })),
      );
      return { url, log };
    }),
};
