import { Effect, Layer } from "effect";
import { Journal, type Entry } from "./types.ts";

/** A journal held in memory, for tests. */
export const journalMemory = () => {
  const entries: Array<Entry> = [];
  return {
    entries,
    layer: Layer.succeed(Journal, Journal.of({
      record: (entry) => Effect.sync(() => void entries.push(entry)),
      ofTrace: (trace) => Effect.sync(() => entries.filter((e) => e.trace === trace)),
    })),
  };
};
