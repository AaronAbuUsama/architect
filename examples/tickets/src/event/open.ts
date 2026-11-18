// Scaffolded from blueprint/things/event/verbs/open.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/event/open.handler.ts";
import { Event } from "../../blueprint/things/event/thing.ts";

/** Put an event on sale with a number of places. */
const open: Handler = ({ title, places }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    const event = yield* Ids.of(Event.fields.id);
    yield* steps.insert(records.insert(Event, { id: event, title, places, claimed: 0n }));
    yield* move("onSale");
    return { event };
  });

export default open;
