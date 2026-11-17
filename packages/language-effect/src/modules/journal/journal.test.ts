import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { journalOf } from "./service.ts";

describe("journal", () => {
  it("gives back a trace's entries in order", async () => {
    const entry = (trace: string, subject: string) => ({ trace, operation: "box.pack", move: "pack", subject, event: "Packed", fields: { box: subject } });
    const journal = journalOf([entry("t1", "box_1"), entry("t2", "box_2"), entry("t1", "box_3")]);
    const got = await Effect.runPromise(journal.ofTrace("t1"));
    expect(got.map((e) => e.subject)).toEqual(["box_1", "box_3"]);
  });
});
