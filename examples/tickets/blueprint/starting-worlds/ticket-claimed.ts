// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import claim from "../things/event/verbs/claim.ts";

/** On top of `on-sale`: a guest, Amina, has claimed one ticket for 2 of the 3 places. */
export default Blueprint.startingWorld("ticket-claimed", {
  from: "on-sale",
  cast: { guest: Blueprint.anyone },
  makes: (s) => [s.guest.run(claim, { event: s.world.event, holder: "Amina", seats: 2n }, { request: "amina-1" })],
  gives: (s) => ({ event: s.world.event, ticket: s.last.ticket }),
});
