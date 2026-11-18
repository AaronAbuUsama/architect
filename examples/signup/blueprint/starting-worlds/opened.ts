// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import open from "../things/sheet/verbs/open.ts";

/** A visitor has put up a sheet with 2 places. Nobody has joined it. */
export default Blueprint.startingWorld("opened", {
  cast: { visitor: Blueprint.anyone },
  makes: (s) => [s.visitor.run(open, { title: "Saturday clean-up", places: 2n })],
  gives: (s) => ({ sheet: s.last.sheet }),
});
