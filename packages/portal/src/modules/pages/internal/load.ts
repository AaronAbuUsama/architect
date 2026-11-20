// Reading the data API from the browser: the blueprint, then the snapshot for its digest. Each is a failure with the request named,
// never a guess; the page says what it could not read.
import { Effect } from "effect";
import type { PortalSnapshot } from "#modules/snapshot/types.js";
import type { BlueprintWire } from "#modules/wire/types.js";
import type { DataFailed, PortalData } from "../types.ts";

const failed = (request: string, reason: string): DataFailed => ({ _tag: "DataFailed", request, reason });

/** One GET of the data API, answered as JSON; a status that is not 200, or a body that is not JSON, is a failure naming the request. */
const read = <T>(request: string): Effect.Effect<T, DataFailed> =>
  Effect.tryPromise({ try: () => fetch(request), catch: (error) => failed(request, String(error)) }).pipe(
    Effect.flatMap((response) =>
      response.status === 200
        ? Effect.tryPromise({ try: () => response.json() as Promise<T>, catch: () => failed(request, "its answer was not JSON") })
        : Effect.fail(failed(request, `it answered ${response.status}`)),
    ),
  );

export const load = (): Effect.Effect<PortalData, DataFailed> =>
  Effect.gen(function* () {
    const blueprint = yield* read<BlueprintWire>("/_portal/v1/blueprint");
    const snapshot = yield* read<PortalSnapshot>(`/_portal/v1/snapshot?digest=${encodeURIComponent(blueprint.digest)}`);
    return { blueprint, snapshot };
  });
