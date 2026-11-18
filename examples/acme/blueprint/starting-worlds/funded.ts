// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "@formants/forman";
import { owner } from "../things/organization/roles.ts";
import { grantee } from "../things/allowance/roles.ts";
import grant from "../things/allowance/verbs/grant.ts";

/** From founded: ada, who owns the organisation, has granted olga an allowance of 500. */
export default Blueprint.startingWorld("funded", {
  from: "founded",
  cast: { ada: owner, olga: grantee },
  makes: (s) => [s.ada.run(grant, { organization: s.world.organization, member: s.olga.person, limit: 500n })],
  gives: (s) => ({ organization: s.world.organization, allowance: s.last.allowance }),
});
