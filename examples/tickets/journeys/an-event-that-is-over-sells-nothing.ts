// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, noEvents, refuses, spans } from "orthograph";
import { machine } from "../blueprint/things/event/machine.ts";
import { EventOver } from "../blueprint/things/event/events.ts";
import close from "../blueprint/things/event/verbs/close.ts";
import claim from "../blueprint/things/event/verbs/claim.ts";

export default Blueprint.journey("an event that is over sells nothing", {
  cast: { organiser: Blueprint.anyone, guest: Blueprint.anyone },
  starts: "on-sale",
  steps: (s) => [
    s.step(
      "the organiser closes the event",
      s.organiser.run(close, { event: s.world.event }),
      emits(EventOver, { event: s.world.event }),
      machine.isIn(s.world.event, "over"),
      spans({ present: ["event.close", "event.close.record"] }),
    ),
    s.step(
      "a claim is refused: an event that is over is not on sale",
      s.guest.run(claim, { event: s.world.event, holder: "Amina", seats: 1n }, { request: "late-1" }),
      refuses(machine.notFrom, { state: "over" }),
      noEvents(),
      spans({ absent: ["event.claim.issue", "event.claim.count"] }),
    ),
    s.step(
      "closing it again is refused: it is already over",
      s.organiser.run(close, { event: s.world.event }),
      refuses(machine.notFrom, { state: "over" }),
      noEvents(),
      spans({ absent: ["event.close.record"] }),
    ),
  ],
});
