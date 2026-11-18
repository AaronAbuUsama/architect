// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/organization/roles.ts";
import create from "../things/organization/verbs/create.ts";

/** Ada has founded an organisation called "Acme Demo". She owns it. */
export default Blueprint.startingWorld("founded", {
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { name: "Acme Demo" })],
  gives: (s) => ({ organization: s.last.organization }),
});
