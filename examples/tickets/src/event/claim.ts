// Scaffolded from blueprint/things/event/verbs/claim.ts. Yours from now on.
import { Effect } from "effect";
import { Ids, Records } from "@orthograph/language-effect";
import type { Handler } from "../../generated/api/src/event/claim.handler.ts";
import { Event } from "../../blueprint/things/event/thing.ts";
import { SoldOut } from "../../blueprint/things/event/errors.ts";
import { Ticket } from "../../blueprint/things/ticket/thing.ts";

/** Claim a ticket for one or more seats, held under a name. */
const claim: Handler = ({ event, holder, seats }, { steps, move }) =>
  Effect.gen(function* () {
    const records = yield* Records;
    // The machine's check already found the event on sale, so it exists.
    const found = yield* steps.load(records.find(Event, event));
    if (!found) return yield* Effect.die(new Error(`event ${event} was checked and then not found`));
    const places = found["places"] as bigint;
    const claimed = found["claimed"] as bigint;
    const left = places - claimed;
    if (seats > left) {
      yield* Effect.logInfo("more seats asked for than places left").pipe(Effect.annotateLogs({ seats: String(seats), left: String(left) }));
      return yield* new SoldOut({ left });
    }
    // The ticket is written in the same commit as the claim, already issued.
    const ticket = yield* Ids.of(Ticket.fields.id);
    yield* steps.issue(records.insert(Ticket, { id: ticket, event, holder, seats }, "issued"));
    yield* steps.count(records.update(Event, event, { claimed: claimed + seats }));
    yield* move(seats === left ? "soldOut" : "onSale");
    return { ticket, left: left - seats };
  });

export default claim;
