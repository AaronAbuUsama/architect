// The target environment: started or restarted onto the bundle, and asked what it runs.
import { Effect, Schema } from "effect";
import type { Built } from "#modules/build/types.js";
import { Environments } from "#modules/environments/service.js";
import type { Up } from "#modules/environments/types.js";
import { PromoteFailed, type Target } from "../types.ts";

const Bundle = Schema.Struct({ revision: Schema.String, sha256: Schema.String });

/** Start `target` on the bundle (or restart it onto it, its state kept), then check `GET /_architect/bundle` answers the same revision and hash. */
export const runningOn = (root: string, target: Target, built: Built): Effect.Effect<Up, PromoteFailed> =>
  Effect.gen(function* () {
    const up = yield* Environments.up({ root, name: target, revision: built.revision }).pipe(Effect.mapError((e) => new PromoteFailed({ message: e.message })));
    const body = yield* Effect.tryPromise({
      try: () => fetch(`${up.url}/_architect/bundle`).then((r) => r.json() as Promise<unknown>),
      catch: () => new PromoteFailed({ message: `${target} at ${up.url} did not say which bundle it runs` }),
    });
    const reported = yield* Schema.decodeUnknownEffect(Bundle)(body).pipe(
      Effect.mapError(() => new PromoteFailed({ message: `${target} at ${up.url} answered a bundle that isn't {revision, sha256}` })),
    );
    if (reported.revision !== built.revision || reported.sha256 !== built.sha256) {
      return yield* new PromoteFailed({ message: `${target} runs ${reported.revision} sha256:${reported.sha256}, not ${built.revision} sha256:${built.sha256}` });
    }
    return up;
  });
