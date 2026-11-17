// The logbook has no transactional read, so the snapshot reads the newest rows and the release, fetches the models they
// name (which never change), and reads the rows again. It accepts the read only when both agree; a bounded retry, then it
// says so (F1 §1 rule 4). `checked` means this stability check, not an atomic read of the storage.
import { Effect } from "effect";
import { LogbookUnavailable, ModelMissing, type LogbookReader, type Release, type Verdict } from "#modules/reader/types.js";
import { Wire } from "#modules/wire/service.js";
import type { Held } from "./judge.ts";

const ATTEMPTS = 3;

export interface Read {
  readonly rows: ReadonlyArray<Verdict>;
  readonly release: Release | null;
  readonly models: ReadonlyMap<string, Held>;
}

const once = (reader: LogbookReader, ref: string) =>
  Effect.all({ rows: reader.latest(ref), release: reader.release() });

const identity = (r: { readonly rows: ReadonlyArray<Verdict>; readonly release: Release | null }) =>
  JSON.stringify([r.rows.map((v) => v.seq).sort((a, b) => a - b), r.release?.seq ?? null]);

const held = (reader: LogbookReader, revision: string): Effect.Effect<Held, LogbookUnavailable> =>
  reader.model(revision).pipe(
    Effect.flatMap((json) => Wire.core(json).pipe(Effect.map((model): Held => ({ ok: true, model })), Effect.catch((e) => Effect.succeed<Held>({ ok: false, reason: e.reason })))),
    Effect.catchTag("ModelMissing", (e: ModelMissing) => Effect.succeed<Held>({ ok: false, reason: `the logbook has no model for ${e.revision}` })),
  );

/** The revisions to fetch models for: every row's, and the head's. */
export const headOf = (rows: ReadonlyArray<Verdict>): string | undefined =>
  rows.filter((r) => r.environment === "test").reduce<Verdict | undefined>((best, r) => (best === undefined || r.seq > best.seq ? r : best), undefined)?.revision;

export const stableRead = (reader: LogbookReader, ref: string): Effect.Effect<Read, LogbookUnavailable> => {
  const models = new Map<string, Held>();
  const attempt = (left: number): Effect.Effect<Read, LogbookUnavailable> =>
    Effect.gen(function* () {
      const first = yield* once(reader, ref);
      const wanted = new Set([...first.rows.map((r) => r.revision), ...(headOf(first.rows) === undefined ? [] : [headOf(first.rows)!])]);
      for (const revision of wanted) if (!models.has(revision)) models.set(revision, yield* held(reader, revision));
      const second = yield* once(reader, ref);
      if (identity(first) === identity(second)) return { ...second, models };
      return left > 1 ? yield* attempt(left - 1) : yield* new LogbookUnavailable({ reason: "the ledger kept changing while it was read, so what it says could not be checked" });
    });
  return attempt(ATTEMPTS);
};
