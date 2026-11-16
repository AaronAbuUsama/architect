// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "@architect/blueprint";
import { owner } from "../things/organization/roles.ts";
import create from "../things/organization/verbs/create.ts";

/** Ada has founded an organisation with a cap of 1000 on each allowance. She owns it. */
export default Blueprint.startingWorld("founded", {
  cast: { ada: owner },
  makes: (s) => [s.ada.run(create, { name: "Acme Demo", cap: 1000n })],
  gives: (s) => ({ organization: s.last.organization }),
});
