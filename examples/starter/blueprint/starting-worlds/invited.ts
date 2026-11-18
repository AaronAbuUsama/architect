// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/organization/roles.ts";
import send from "../things/invitation/verbs/send.ts";

/** From founded: ada, who owns the organisation, has invited olga by her email. The invitation is pending. */
export default Blueprint.startingWorld("invited", {
  from: "founded",
  cast: { ada: owner, olga: Blueprint.signedIn },
  makes: (s) => [s.ada.run(send, { organization: s.world.organization, email: s.olga.email })],
  gives: (s) => ({ organization: s.world.organization, invitation: s.last.invitation }),
});
