// Scaffolded from blueprint/things/sheet/verbs/open.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/sheet/open.handler.ts";
import { Sheet } from "../../blueprint/things/sheet/thing.ts";

/** Put up a sheet with a number of places. */
const open: Handler = ({ title, places }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const sheet = yield* Ids.of(Sheet.fields.id);
    yield* steps.insert(records.insert(Sheet, { id: sheet, title, places, taken: 0n }));
    yield* move("open");
    return { sheet };
  });

export default open;
