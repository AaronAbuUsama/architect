// What the logbook's verdicts say about the working model: a proof is stale when what it rested on has changed since.
import { Effect, Schema } from "effect";
import { Compare, type Model } from "@architect/compiler";
import { ReleaseFailed, SHIPPED, type StaleIn } from "../types.ts";
import { call, ok } from "./http.ts";

const Verdicts = Schema.Array(Schema.Struct({ revision: Schema.String, environment: Schema.String, operation: Schema.String, verdict: Schema.String }));

/** The model the logbook holds for a revision. */
export const modelAt = (logbook: string, revision: string): Effect.Effect<Model, ReleaseFailed> =>
  call("GET", `${logbook}/models/${encodeURIComponent(revision)}`).pipe(
    Effect.flatMap((a) => ok(`the model of ${revision}`, a)),
    Effect.map((body) => body as Model),
  );

/** Every hash the operation's proof rested on, as it was in `proved`, still the same in `now`. */
const holds = (now: Model, proved: Model, operation: string) =>
  Object.entries(Compare.dependsOn(proved, operation)).every(([key, hash]) => Compare.hashOf(now, key) === hash);

/**
 * For staging and production: the latest passing verdict of each operation among those posted from `main` (a pull
 * request's verdict never counts, D3 #8), judged against the model of the revision it proved.
 */
export const staleness = (logbook: string, model: Model): Effect.Effect<{ readonly stale: ReadonlyArray<StaleIn>; readonly proven: ReadonlyArray<string> }, ReleaseFailed> =>
  Effect.gen(function* () {
    const models = new Map<string, Model>();
    const staleIn = new Map<string, Array<string>>();
    const proven = new Set<string>();
    for (const environment of SHIPPED) {
      const body = yield* call("GET", `${logbook}/verdicts/latest?environment=${environment}&ref=refs/heads/main`).pipe(Effect.flatMap((a) => ok(`${environment}'s verdicts`, a)));
      const rows = yield* Schema.decodeUnknownEffect(Verdicts)(body).pipe(Effect.mapError((e) => new ReleaseFailed({ message: `the logbook's verdicts were not as expected: ${e.message}` })));
      for (const row of rows) {
        if (row.verdict !== "pass" || !(row.operation in model.operations)) continue;
        if (!models.has(row.revision)) models.set(row.revision, yield* modelAt(logbook, row.revision));
        const proved = models.get(row.revision)!;
        if (!(row.operation in proved.operations)) continue;
        if (holds(model, proved, row.operation)) proven.add(row.operation);
        else staleIn.set(row.operation, [...(staleIn.get(row.operation) ?? []), environment]);
      }
    }
    const stale = [...staleIn].sort(([a], [b]) => a.localeCompare(b)).map(([operation, environments]): StaleIn => ({ operation, environments }));
    return { stale, proven: [...proven].filter((op) => !staleIn.has(op)).sort() };
  });
