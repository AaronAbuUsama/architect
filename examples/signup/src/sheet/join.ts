// Scaffolded from blueprint/things/sheet/verbs/join.ts. Yours from now on.
import { Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/sheet/join.handler.ts";
import { Sheet } from "../../blueprint/things/sheet/thing.ts";
import { SheetFull } from "../../blueprint/things/sheet/errors.ts";

/** Take places on a sheet, for yourself and anyone with you. */
const join: Handler = ({ sheet, people }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // The machine's check already found the sheet open, so it exists.
    const found = yield* steps.load(records.find(Sheet, sheet));
    if (!found) return yield* Effect.die(new Error(`sheet ${sheet} was checked and then not found`));
    const places = found["places"] as bigint;
    const taken = found["taken"] as bigint;
    const left = places - taken;
    if (people > left) {
      yield* Effect.logInfo("more people than places left").pipe(Effect.annotateLogs({ people: String(people), left: String(left) }));
      return yield* new SheetFull({ left });
    }
    yield* steps.record(records.update(Sheet, sheet, { taken: taken + people }));
    yield* move(people === left ? "full" : "open");
    return { left: left - people };
  });

export default join;
