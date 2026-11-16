import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect, Schedule } from "effect";
import { DevFailed, type DevApi } from "./types.ts";
import { applyMigrations, startWrangler, stop } from "./internal/wrangler.ts";

const answers = (url: string) =>
  Effect.tryPromise({ try: () => fetch(url).then((r) => r.ok), catch: () => false }).pipe(
    Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail(false))),
  );

export const Dev: DevApi = {
  start: ({ root, port }) =>
    Effect.gen(function* () {
      const config = resolve(root, "generated/server/wrangler.jsonc");
      if (!existsSync(config)) return yield* new DevFailed({ message: `${config} is missing: run nx sync first` });
      // A fresh world each run: stage one has no migrations between versions.
      const state = resolve(root, ".architect/dev");
      rmSync(state, { recursive: true, force: true });
      mkdirSync(state, { recursive: true });
      yield* applyMigrations(config, state);
      const log = join(state, "wrangler.log");
      const secret = randomBytes(32).toString("hex");
      const child = yield* Effect.acquireRelease(startWrangler(config, state, port, secret, log), stop);
      const url = `http://127.0.0.1:${port}`;
      yield* answers(`${url}/_world/health`).pipe(
        Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 160 }),
        Effect.mapError(() => new DevFailed({ message: `the world didn't answer within 40 s (exit ${child.exitCode}); see ${log}` })),
      );
      return { url, log };
    }),
};
