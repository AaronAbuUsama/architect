// The target environment: started or restarted onto the bundle, and asked what it runs.
import { Effect } from "effect";
import type { Built } from "#modules/build/types.js";
import { Environments } from "#modules/environments/service.js";
import type { Up } from "#modules/environments/types.js";
import { PromoteFailed, type Target } from "../types.ts";

/** Start `target` on the bundle (or restart it onto it, its state kept), then check `GET /_forman/bundle` answers the same revision and hash. */
export const runningOn = (root: string, target: Target, built: Built): Effect.Effect<Up, PromoteFailed> =>
  Effect.gen(function* () {
    const up = yield* Environments.up({ root, name: target, revision: built.revision }).pipe(Effect.mapError((e) => new PromoteFailed({ message: e.message })));
    yield* Environments.verify({ root, name: target, pid: up.pid, revision: built.revision, sha256: built.sha256 }).pipe(Effect.mapError((e) => new PromoteFailed({ message: e.message })));
    return up;
  });
