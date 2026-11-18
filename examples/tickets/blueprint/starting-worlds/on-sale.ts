// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import open from "../things/event/verbs/open.ts";

/** Someone has put an event on sale with 3 places. Nobody has claimed a ticket. */
export default Blueprint.startingWorld("on-sale", {
  cast: { organiser: Blueprint.anyone },
  makes: (s) => [s.organiser.run(open, { title: "Saturday concert", places: 3n })],
  gives: (s) => ({ event: s.last.event }),
});
