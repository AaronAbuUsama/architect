import { Effect } from "effect";
import { Journal, type Entry } from "./types.ts";

/** A journal read from entries held in memory: what the in-memory store gives tests. */
export const journalOf = (entries: ReadonlyArray<Entry>) =>
  Journal.of({ ofTrace: (trace) => Effect.sync(() => entries.filter((e) => e.trace === trace)) });
