import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { Compare, canonical } from "@architect/compiler";
import { Environments } from "#modules/environments/service.js";
import { ReleaseFailed, type ReleasesApi, type Shipping } from "./types.ts";
import { call, ok } from "./internal/http.ts";
import { modelAt, staleness } from "./internal/stale.ts";
import { tokenOf } from "./internal/token.ts";

/** The last production release's version and revision, or undefined when there has been none. */
const lastRelease = (logbook: string) =>
  call("GET", `${logbook}/releases/latest`).pipe(
    Effect.flatMap((a) => {
      if (a.status === 404) return Effect.succeed(undefined);
      return ok("the last release", a).pipe(Effect.map((body) => body as { readonly version: string; readonly revision: string }));
    }),
  );

const shipping: ReleasesApi["shipping"] = (logbook, model) =>
  Effect.gen(function* () {
    const last = yield* lastRelease(logbook);
    const { stale, proven } = yield* staleness(logbook, model);
    if (last === undefined) return { from: null, version: "1.0.0", bump: null, changes: [], proven, stale } satisfies Shipping;
    const released = Compare.release(yield* modelAt(logbook, last.revision), model);
    const version = Compare.next(last.version, released.bump);
    if (version === undefined) return yield* new ReleaseFailed({ message: `the last release's version is not x.y.z: ${last.version}` });
    return { from: last.version, version, bump: released.bump, changes: released.changes, proven, stale } satisfies Shipping;
  });

const changesJson: ReleasesApi["changesJson"] = (s) =>
  JSON.stringify({ from: s.from, to: s.version, changes: s.changes, stale: s.stale.map((x) => x.operation), proven: s.proven }, null, 2) + "\n";

export const Releases: ReleasesApi = {
  locate: ({ root, env }) => {
    const given = env["ARCHITECT_LOGBOOK_URL"];
    if (given) return Effect.succeed(given.replace(/\/+$/, ""));
    return Environments.status({ root, name: "logbook" }).pipe(
      Effect.map((s) => (s.state === "up" ? s.url : undefined)),
      Effect.mapError((e) => new ReleaseFailed({ message: e.message })),
    );
  },
  shipping,
  next: (logbook, model) => Effect.map(shipping(logbook, model), (s) => s.version),
  record: ({ logbook, env, model, revision, version }) =>
    Effect.gen(function* () {
      const token = yield* tokenOf(env);
      const put = yield* call("PUT", `${logbook}/models/${encodeURIComponent(revision)}`, { token, body: canonical(model) });
      yield* ok(`the model of ${revision}`, put);
      const posted = yield* call("POST", `${logbook}/releases`, { token, body: JSON.stringify({ version, revision }) });
      yield* ok(`release ${version}`, posted);
    }),
  changesJson,
  writeChanges: (root, s) =>
    Effect.sync(() => {
      const path = join(root, "generated/model/changes.json");
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, changesJson(s));
    }),
};
