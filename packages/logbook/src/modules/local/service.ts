import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Effect, Schedule } from "effect";
import { LogbookFailed, type LogbookApi } from "./types.ts";
import { launch, spawnLaunch, stop } from "./internal/wrangler.ts";

const answers = (url: string) =>
  Effect.tryPromise({ try: () => fetch(url).then((r) => r.ok), catch: () => false }).pipe(
    Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail(false))),
  );

const ready = (url: string, exited?: () => number | null) =>
  Effect.suspend((): Effect.Effect<void, "exited" | "silent"> =>
    exited?.() != null ? Effect.fail("exited") : answers(`${url}/health`).pipe(Effect.mapError(() => "silent" as const))).pipe(
    Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 480, while: (e) => e !== "exited" }),
  );

export const Logbook: LogbookApi = {
  launch,
  ready: (url) => ready(url).pipe(Effect.mapError(() => new LogbookFailed({ message: `the logbook at ${url} didn't answer within 120 s` }))),
  discoverJwks: (issuer) =>
    Effect.tryPromise({
      try: () => fetch(`${issuer}/.well-known/openid-configuration`).then((r) => r.json() as Promise<{ jwks_uri?: unknown }>),
      catch: () => new LogbookFailed({ message: `no discovery document at ${issuer}` }),
    }).pipe(Effect.flatMap(({ jwks_uri }) =>
      typeof jwks_uri === "string" ? Effect.succeed(jwks_uri) : Effect.fail(new LogbookFailed({ message: `${issuer} names no jwks_uri` })))),
  start: (options) =>
    Effect.gen(function* () {
      mkdirSync(options.state, { recursive: true });
      mkdirSync(dirname(options.log), { recursive: true });
      const url = `http://127.0.0.1:${options.port}`;
      const child = yield* Effect.acquireRelease(spawnLaunch(launch(options), options.log), stop);
      yield* ready(url, () => child.exitCode).pipe(
        Effect.mapError((e) => new LogbookFailed({ message: e === "exited" ? `the logbook exited (${child.exitCode}); see ${options.log}` : `the logbook didn't answer within 120 s; see ${options.log}` })),
      );
      return { url, log: options.log };
    }),
};
