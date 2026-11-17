// What a promotion publishes (D3 #111): staging the prerelease of the next version, production the release, as each environment's
// `publish` list in the blueprint says, to the registry in `FORMAN_REGISTRY` (Verdaccio, on this machine).
import { Effect } from "effect";
import type { Model } from "@formants/compiler";
import { Publish } from "#modules/publish/service.js";
import { Releases } from "#modules/releases/service.js";
import { PromoteFailed } from "../types.ts";

type Common = { readonly root: string; readonly revision: string; readonly env: Readonly<Record<string, string | undefined>>; readonly say: (line: string) => Effect.Effect<void> };

const failed = (e: { readonly message: string }) => new PromoteFailed({ message: e.message });

/**
 * Staging: `<next>-next.<n>`, n one past the highest the registry has, under the dist-tag `next`. The next version is the one
 * production will release, so it is worked out from the model against the last release. Nothing is published without a registry,
 * and the line says so.
 */
export const stagingPrerelease = ({ root, revision, env, say, logbook, model }: Common & { readonly logbook: string; readonly model: Model }) =>
  Effect.gen(function* () {
    if (Publish.registry(env) === undefined) return yield* say("skipped npm (set FORMAN_REGISTRY to a registry on this machine to publish to)");
    const next = yield* Releases.next(logbook, model).pipe(Effect.mapError(failed));
    const version = yield* Publish.prerelease({ root, env, version: next }).pipe(Effect.mapError(failed));
    yield* Publish.run({ root, sourceRevision: revision, env, environment: "staging", version, mode: "publish", localTap: false, say }).pipe(Effect.mapError(failed));
  });

/** Production: the release itself, which takes `latest`. A version the registry already has is left alone, so a promotion can be run again. */
export const productionRelease = ({ root, revision, env, say, version }: Common & { readonly version: string }) =>
  Publish.run({ root, sourceRevision: revision, env, environment: "production", version, mode: "publish", localTap: false, say }).pipe(Effect.mapError(failed), Effect.asVoid);
