// Journey-author file. The builder never edits it.
import { Blueprint } from "orthograph";
import claim from "../things/handle/verbs/claim.ts";

export default Blueprint.startingWorld("claimed-aaron", {
  cast: { aaron: Blueprint.signedIn },
  makes: (s) => [s.aaron.run(claim, { name: "aaron" }, { request: "first-claim" })],
  gives: (s) => ({ aaronHandle: s.last.handle }),
});
