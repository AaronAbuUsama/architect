import { mkdirSync, rmSync } from "node:fs";
import { Effect, Schedule } from "effect";
import { CollectorFailed, type CollectorsApi, type Trace } from "./types.ts";
import { removeCollector, runCollector } from "./internal/docker.ts";
import { looksComplete, readAll } from "./internal/otlp.ts";

/** An empty export answers `{"partialSuccess":{}}` once the receiver is up: the spike's readiness check. */
const ready = (url: string) =>
  Effect.tryPromise({
    try: () => fetch(`${url}/v1/traces`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.ok),
    catch: () => false,
  }).pipe(Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail(false))));

/** Nothing new for this long after every trace looks complete: the spike's rule C. */
const QUIET_MS = 250;
const POLL_MS = 25;
const LIMIT_MS = 10_000;

export const Collectors: CollectorsApi = {
  start: (dir) =>
    Effect.gen(function* () {
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      const name = `architect-collector-${process.pid}-${Math.floor(Math.random() * 1e9)}`;
      const url = yield* Effect.acquireRelease(runCollector(dir, name), () => removeCollector(name));
      yield* ready(url).pipe(
        Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 100 }),
        Effect.mapError(() => new CollectorFailed({ message: `the collector didn't answer at ${url} within 10 s` })),
      );
      const traces = (wanted: ReadonlyArray<{ readonly trace: string; readonly parent: string }>) =>
        Effect.gen(function* () {
          let last = readAll(dir);
          let quietMs = 0;
          const settled = Effect.sync(() => {
            const now = readAll(dir);
            quietMs = now.size === last.size ? quietMs + POLL_MS : 0;
            last = now;
            return quietMs >= QUIET_MS && wanted.every((w) => looksComplete(now.byTrace.get(w.trace), w.parent));
          });
          yield* settled.pipe(
            Effect.repeat({ schedule: Schedule.spaced(`${POLL_MS} millis`), until: (done) => done }),
            Effect.timeoutOption(`${LIMIT_MS} millis`),
          );
          return new Map(wanted.map((w): [string, Trace] => [w.trace, last.byTrace.get(w.trace) ?? { spans: [], logs: [] }]));
        });
      return { url, traces };
    }),
};
