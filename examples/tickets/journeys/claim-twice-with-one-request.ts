// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, spans } from "orthograph";
import { TicketsClaimed } from "../blueprint/things/event/events.ts";
import claim from "../blueprint/things/event/verbs/claim.ts";
import get from "../blueprint/things/event/verbs/get.ts";

export default Blueprint.journey("claim twice with one request", {
  cast: { guest: Blueprint.anyone },
  starts: "on-sale",
  steps: (s) => [
    s.step(
      "the guest claims a ticket",
      s.guest.run(claim, { event: s.world.event, holder: "Amina", seats: 1n }, { request: "amina-1" }),
      expect((a) => a.left).toBe(2n),
      emits(TicketsClaimed, { event: s.world.event, seats: 1n, left: 2n }),
    ),
    s.step(
      "the same request again gives the same ticket and claims nothing",
      s.guest.run(claim, { event: s.world.event, holder: "Amina", seats: 1n }, { request: "amina-1" }),
      expect((a) => a.ticket).toMatch(/^tkt_/),
      expect((a) => a.left).toBe(2n),
      noEvents(),
      spans({ absent: ["event.claim.issue", "event.claim.count"] }),
    ),
    s.step(
      "only one seat was claimed",
      s.guest.run(get, { id: s.world.event }),
      expect((a) => [a.claimed, a.state]).toEqual([1n, "onSale"]),
    ),
  ],
});
