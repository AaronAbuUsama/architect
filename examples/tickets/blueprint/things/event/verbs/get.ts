import { Blueprint } from "orthograph";
import { Event } from "../thing.ts";

// A read. It changes nothing, so it has no move and no handler: it answers from the event's record.
export default Blueprint.read(Event, {
  by: "id",
  fields: ["title", "places", "claimed", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
