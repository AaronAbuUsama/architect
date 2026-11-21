// Journey-author file (M2.02, the principal part; M2.03 builds it). The builder never edits it (AGENTS.md, "Journeys and checks come first").
// It lives in the adapter fixture app (`e2e/fixtures/m1/service-caller`), which mounts `@fixture/remote` as `pricing` and `@fixture/ledger`
// as `ledger`; the refusals and the pass are the runtime's, so the handlers are real and none is blank.
//
// A `service` role admits `service(<its mount>)` and nobody else; `signedIn` admits a person or an agent and not a service (M2-auth, fork 3).
// Steps 4 and 5 are the controls: a person is let through where the service was refused, and refused where the service was let through, so a
// runtime that refuses (or admits) everyone cannot pass.
import { Blueprint, expect, noEvents, refuses, spans } from "orthograph";
import { ledgerer, pricer } from "../things/probe/roles.ts";
import who from "../things/probe/verbs/who.ts";
import price from "../things/probe/verbs/price.ts";

export default Blueprint.journey("a service is nobody signed in", {
  cast: { pricer, other: ledgerer, ada: Blueprint.signedIn },
  steps: (s) => [
    s.step(
      "the pricing service can't call what needs a person signed in",
      s.pricer.run(who, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.who.refused"], absent: ["probe.who"] }),
    ),
    s.step(
      "the pricing service can call what its own role admits",
      s.pricer.run(price, {}),
      expect((a) => a.status).toBe("ok"),
      noEvents(),
      spans({ present: ["probe.price"] }),
    ),
    s.step(
      "the ledger service, another mount's, can't call the pricing service's operation",
      s.other.run(price, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.price.refused"], absent: ["probe.price"] }),
    ),
    s.step(
      "ada, a person, is let through where the service was refused",
      s.ada.run(who, {}),
      expect((a) => a.status).toBe("ok"),
      spans({ present: ["probe.who"] }),
    ),
    s.step(
      "ada, a person, is refused where the service was let through",
      s.ada.run(price, {}),
      refuses(Blueprint.NotAllowed),
      noEvents(),
      spans({ present: ["probe.price.refused"], absent: ["probe.price"] }),
    ),
  ],
});
