import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { journalMemory } from "./service.ts";
import { Journal } from "./types.ts";

describe("journal", () => {
  it("gives back a trace's entries in order", async () => {
    const j = journalMemory();
    const entry = (trace: string, subject: string) => ({ trace, operation: "box.pack", move: "pack", subject, event: "Packed", fields: { box: subject } });
    const got = await Effect.runPromise(Effect.gen(function* () {
      const journal = yield* Journal;
      yield* journal.record(entry("t1", "box_1"));
      yield* journal.record(entry("t2", "box_2"));
      yield* journal.record(entry("t1", "box_3"));
      return yield* journal.ofTrace("t1");
    }).pipe(Effect.provide(j.layer)));
    expect(got.map((e) => e.subject)).toEqual(["box_1", "box_3"]);
  });
});
