// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { SoldOut } from "../blueprint/things/event/errors.ts";
import { machine } from "../blueprint/things/event/machine.ts";
import { TicketsClaimed } from "../blueprint/things/event/events.ts";
import claim from "../blueprint/things/event/verbs/claim.ts";
import get from "../blueprint/things/event/verbs/get.ts";

export default Blueprint.journey("sell out an event", {
  cast: { guest: Blueprint.anyone },
  starts: "on-sale",
  steps: (s) => [
    s.step(
      "the first guest claims 2 of the 3 places and one is left",
      s.guest.run(claim, { event: s.world.event, holder: "Amina", seats: 2n }, { request: "claim-1" }),
      expect((a) => a.ticket).toMatch(/^tkt_/),
      expect((a) => a.left).toBe(1n),
      emits(TicketsClaimed, { event: s.world.event, seats: 2n, left: 1n }),
      machine.isIn(s.world.event, "onSale"),
      spans({ present: ["event.claim", "event.claim.load", "event.claim.issue", "event.claim.count"] }),
    ),
    s.step(
      "two more seats are refused: only one place is left",
      s.guest.run(claim, { event: s.world.event, holder: "Bilal", seats: 2n }, { request: "claim-2-seats" }),
      refuses(SoldOut, { left: 1n }),
      noEvents(),
      machine.isIn(s.world.event, "onSale"),
      spans({ present: ["event.claim.load"], absent: ["event.claim.issue", "event.claim.count"] }),
    ),
    s.step(
      "the last place is claimed and the event is sold out",
      s.guest.run(claim, { event: s.world.event, holder: "Bilal", seats: 1n }, { request: "claim-3" }),
      expect((a) => a.left).toBe(0n),
      emits(TicketsClaimed, { event: s.world.event, seats: 1n, left: 0n }),
      machine.isIn(s.world.event, "soldOut"),
    ),
    s.step(
      "reading it back shows a sold out event",
      s.guest.run(get, { id: s.world.event }),
      expect((a) => [a.places, a.claimed, a.state]).toEqual([3n, 3n, "soldOut"]),
      noEvents(),
    ),
    s.step(
      "a further claim is refused: a sold out event is not on sale",
      s.guest.run(claim, { event: s.world.event, holder: "Chidi", seats: 1n }, { request: "claim-4" }),
      refuses(machine.notFrom, { state: "soldOut" }),
      noEvents(),
      spans({ absent: ["event.claim.issue", "event.claim.count"] }),
    ),
  ],
});
