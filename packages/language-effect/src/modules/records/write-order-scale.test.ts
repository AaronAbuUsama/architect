// S-19 follow-up: ordering and committing one call's writes costs time in proportion to the writes, not to the writes times the rows of the thing.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store } from "./types.ts";

const Tag = Blueprint.thing({
  description: "A name someone holds.",
  code: "TG",
  fields: { id: Blueprint.id("tag"), name: Blueprint.text({ max: 40 }) },
  unique: { name: { while: ["claimed"] } },
});
const N = 3000;

describe("a call writing many rows (S-19)", () => {
  it(`a chain of ${N} moves is ordered and committed in memory in under a second`, async () => {
    const memory = storeMemory(Array.from({ length: N }, (_, i) => [Tag, { id: `tag_${i}`, name: `n${i}`, state: "claimed" }] as const) as never);
    const program = Effect.gen(function* () {
      const store = yield* Store;
      const unit = yield* Unit.make(store);
      // Row i takes the name row i + 1 holds, so the whole chain is written from its far end back.
      for (let i = 0; i < N; i++) yield* unit.records.update(Tag, `tag_${i}`, { name: `n${i + 1}` });
      const started = performance.now();
      const writes = yield* unit.writes;
      const outcome = yield* store.commit({ writes, entries: [] });
      return { outcome, ms: performance.now() - started, first: (writes[0] as { id: string }).id };
    });
    const { outcome, ms, first } = await Effect.runPromise(program.pipe(Effect.provide(memory.layer)) as Effect.Effect<{ outcome: string; ms: number; first: string }>);
    expect(outcome).toBe("committed");
    expect(first).toBe(`tag_${N - 1}`);
    expect(ms).toBeLessThan(1000);
  });
});
