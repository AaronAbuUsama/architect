import { Effect, Schema } from "effect";
import { LogbookUnavailable, ModelMissing, type LogbookReader, type ReaderApi } from "./types.ts";
import { VerdictRows, ReleaseRow } from "./internal/rows.ts";

/** Each read is given this long. A logbook that is slower than this is, for the portal, not there. */
const LIMIT_MS = 5_000;

const get = (base: string, path: string): Effect.Effect<{ readonly status: number; readonly body: unknown }, LogbookUnavailable> =>
  Effect.tryPromise({
    try: () =>
      fetch(`${base}${path}`, { signal: AbortSignal.timeout(LIMIT_MS) }).then((r) => r.text().then((text) => ({ status: r.status, text }))),
    catch: () => new LogbookUnavailable({ reason: "the logbook did not answer" }),
  }).pipe(
    Effect.flatMap(({ status, text }) =>
      Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(text).pipe(
        Effect.map((body) => ({ status, body })),
        Effect.mapError(() => new LogbookUnavailable({ reason: `the logbook answered ${status} with something that is not JSON` })),
      ),
    ),
  );

const rows = <S extends Schema.Decoder<unknown>>(what: string, schema: S, body: unknown): Effect.Effect<S["Type"], LogbookUnavailable> =>
  Schema.decodeUnknownEffect(schema)(body as never).pipe(
    Effect.mapError(() => new LogbookUnavailable({ reason: `the logbook's ${what} are not the shape the portal reads` })),
  ) as Effect.Effect<S["Type"], LogbookUnavailable>;

const http = (url: string): LogbookReader => {
  const base = url.replace(/\/+$/, "");
  return {
    latest: (ref) =>
      get(base, `/verdicts/latest?ref=${encodeURIComponent(ref)}`).pipe(
        Effect.flatMap((a) => (a.status === 200 ? rows("verdicts", VerdictRows, a.body) : Effect.fail(new LogbookUnavailable({ reason: `the logbook refused its verdicts: ${a.status}` })))),
      ),
    model: (revision) =>
      get(base, `/models/${encodeURIComponent(revision)}`).pipe(
        Effect.flatMap((a): Effect.Effect<unknown, LogbookUnavailable | ModelMissing> =>
          a.status === 200 ? Effect.succeed(a.body)
            : a.status === 404 ? Effect.fail(new ModelMissing({ revision }))
            : Effect.fail(new LogbookUnavailable({ reason: `the logbook refused the model of ${revision}: ${a.status}` }))),
      ),
    release: () =>
      get(base, "/releases/latest").pipe(
        Effect.flatMap((a) =>
          a.status === 404 ? Effect.succeed(null)
            : a.status === 200 ? rows("release", ReleaseRow, a.body)
            : Effect.fail(new LogbookUnavailable({ reason: `the logbook refused its release: ${a.status}` }))),
      ),
  };
};

export const Reader: ReaderApi = { http };
