import { mkdirSync, rmSync } from "node:fs";
import { Effect, Schedule } from "effect";
import { Viewer } from "#modules/viewer/service.js";
import { CollectorFailed, type CollectorsApi } from "./types.ts";
import { ownedName, removeCollector, runCollector, sweepOrphans } from "./internal/docker.ts";
import { FileSource } from "./internal/file-source.ts";

export { FileSource } from "./internal/file-source.ts";
export { AxiomSource } from "./internal/axiom-source.ts";
export { PROVE_SPAN_PREFIX } from "./types.ts";
export { exportRoots, rootOf, type JourneyRoot } from "./internal/journey-root.ts";
export { privateKeys } from "./internal/private-keys.ts";

/** An empty export answers `{"partialSuccess":{}}` once the receiver is up: the spike's readiness check. */
const ready = (url: string) =>
  Effect.tryPromise({
    try: () => fetch(`${url}/v1/traces`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.ok),
    catch: () => false,
  }).pipe(Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail(false))));

/** Wait until the collector at `url` takes an export. */
const waitReady = (url: string) =>
  ready(url).pipe(
    Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 100 }),
    Effect.mapError(() => new CollectorFailed({ message: `the collector didn't answer at ${url} within 10 s` })),
  );

/** Where a collector started now should also send what it hears: the local viewer, if it is running. */
const viewerEndpoint = Viewer.running().pipe(Effect.map((v) => v?.otlpFromContainers));

export const Collectors: CollectorsApi = {
  start: (dir, options) =>
    Effect.gen(function* () {
      yield* sweepOrphans();
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      const name = ownedName(process.pid);
      const viewer = yield* viewerEndpoint;
      const url = yield* Effect.acquireRelease(runCollector(dir, name, { strip: options?.strip ?? [], viewer }), () => removeCollector(name));
      yield* waitReady(url);
      return { url, ...FileSource.open(dir) };
    }),
  launch: ({ dir, name, strip }) =>
    Effect.gen(function* () {
      yield* sweepOrphans();
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir, { recursive: true });
      yield* removeCollector(name);
      const viewer = yield* viewerEndpoint;
      const url = yield* runCollector(dir, name, { strip: strip ?? [], viewer });
      yield* waitReady(url).pipe(Effect.tapError(() => removeCollector(name)));
      return url;
    }),
  stop: removeCollector,
  read: (dir) => FileSource.open(dir),
};
