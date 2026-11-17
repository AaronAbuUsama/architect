// Journey-author file. The builder of system.health never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, expect, noEvents, spans } from "@formants/forman";
import health from "../blueprint/things/system/verbs/health.ts";

export default Blueprint.journey("health is up", {
  // A visitor with no account and no token.
  cast: { visitor: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "anyone can ask if the application is up",
      s.visitor.run(health, {}),
      expect((a) => a.status).toBe("ok"),
      noEvents(),
      spans({ present: ["system.health"] }),
    ),
  ],
});
