import { Names } from "orthograph/server";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { WorldFailed, type WorldsApi } from "./types.ts";
import { anyPort } from "./internal/ports.ts";
import { applyMigrations, bringUp, stop } from "./internal/wrangler.ts";

export const Worlds: WorldsApi = {
  anyPort,
  start: ({ root, port: asked, name, otlp, environment, secretEnv }) =>
    Effect.gen(function* () {
      const config = resolve(root, "generated/server/wrangler.jsonc");
      if (!existsSync(config)) return yield* new WorldFailed({ message: `${config} is missing: run nx sync first` });
      // A fresh world each run: stage one has no migrations between versions.
      const state = resolve(root, Names.folder, name);
      rmSync(state, { recursive: true, force: true });
      mkdirSync(state, { recursive: true });
      yield* applyMigrations(config, state);
      const log = join(state, "wrangler.log");
      const secret = randomBytes(32).toString("hex");
      // Port 0 asks for any free port; wrangler is told a named one, and `url` is the one it got.
      const port = asked === 0 ? yield* anyPort : asked;
      const url = `http://127.0.0.1:${port}`;
      const vars = { AUTH_SECRET: secret, [Names.variable("ENVIRONMENT")]: environment ?? "local", ...(otlp ? { OTLP_URL: otlp } : {}) };
      yield* Effect.acquireRelease(bringUp({ config, state, port, log, vars, ...(secretEnv ? { secretEnv } : {}) }, "/_world/health"), stop);
      return { url, log };
    }),
  launch: ({ config, state, port, log, pidFile, envFile, secretEnv, ready }) =>
    Effect.gen(function* () {
      yield* applyMigrations(config, state);
      const child = yield* bringUp({ config, state, port, log, pidFile, ...(envFile ? { envFile } : {}), ...(secretEnv ? { secretEnv } : {}), detached: true }, ready);
      return { pid: child.pid!, url: `http://127.0.0.1:${port}`, log };
    }),
};
