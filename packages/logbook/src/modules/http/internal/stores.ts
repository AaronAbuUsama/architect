// The two stores behind the worker, each call wrapped once: the Durable Object's methods and R2's.
import { Effect } from "effect";
import type { Book } from "#modules/book/service.js";
import { Conflict, Unavailable, type LogbookEnv } from "../types.ts";

/** One Durable Object holds the whole ledger. */
export const book = <A>(env: LogbookEnv, call: (stub: DurableObjectStub<Book>) => Promise<A>): Effect.Effect<A, Unavailable> =>
  Effect.tryPromise({ try: () => call(env.BOOK.getByName("book")), catch: () => new Unavailable({ part: "book" }) });

const keyOf = (revision: string) => `models/${revision}.json`;

export const modelText = (env: LogbookEnv, revision: string): Effect.Effect<string | null, Unavailable> =>
  Effect.tryPromise({
    try: () => env.MODELS.get(keyOf(revision)).then((object) => (object === null ? null : object.text())),
    catch: () => new Unavailable({ part: "models" }),
  });

/** R2 owns admission: create atomically, then judge an identical retry against the committed winner. */
export const putModel = (env: LogbookEnv, revision: string, text: string): Effect.Effect<void, Unavailable | Conflict> =>
  Effect.gen(function* () {
    const created = yield* Effect.tryPromise({
      try: () => env.MODELS.put(keyOf(revision), text, { onlyIf: { etagDoesNotMatch: "*" }, httpMetadata: { contentType: "application/json" } }),
      catch: () => new Unavailable({ part: "models" }),
    });
    if (created !== null) return;
    const held = yield* modelText(env, revision);
    if (held === null) return yield* new Unavailable({ part: "models" });
    if (held !== text) return yield* new Conflict({ reason: `revision ${revision} already has a different model` });
  });
