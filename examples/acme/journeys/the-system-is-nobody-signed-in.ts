// Journey-author file (M2.02, the principal part; M2.03 builds it). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// It is acme's copy: the plugins' copy runs both plugins' operations, and M2.23 deletes this one.
//
// `Blueprint.system` is what the runtime calls itself when it runs its own work: no credential, nothing in a request. It is not a person, so
// `signedIn` and every rule role refuse it, and the refusal leaves no operation span, only `<operation>.refused`. Step 3 is the control: the same
// operation answers ada, so the refusals above are the caller's kind and not a dead server.
import { Blueprint, expect, noEvents, refuses, spans } from "orthograph";
import { owner } from "../blueprint/things/organization/roles.ts";
import show from "../blueprint/things/session/verbs/show.ts";
import create from "../blueprint/things/organization/verbs/create.ts";

export default Blueprint.journey("the system is nobody signed in", {
  cast: { clock: Blueprint.system, ada: owner },
  starts: "founded",
  steps: (s) => [
    s.step(
      "the system can't ask who is signed in: nobody is",
      s.clock.run(show, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["session.show.refused"], absent: ["session.show"] }),
    ),
    s.step(
      "the system can't found an organisation: that is for a person",
      s.clock.run(create, { name: "System Co", cap: 1000n }),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["organization.create.refused"], absent: ["organization.create", "organization.create.insert", "organization.create.owner"] }),
    ),
    s.step(
      "ada, a person, is let through where the system was refused",
      s.ada.run(show, {}),
      expect((a) => a.person).toBe(s.ada.person),
      noEvents(),
      spans({ present: ["session.show"] }),
    ),
  ],
});
