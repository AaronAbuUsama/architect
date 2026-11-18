import { Blueprint } from "orthograph";
import { Ticket } from "../thing.ts";

// A read: who holds the ticket, for which event, how many seats, and whether it has been used.
export default Blueprint.read(Ticket, {
  by: "id",
  fields: ["event", "holder", "seats", "state"],
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
