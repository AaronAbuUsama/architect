// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { machine } from "../blueprint/things/ticket/machine.ts";
import { TicketCheckedIn } from "../blueprint/things/ticket/events.ts";
import checkIn from "../blueprint/things/ticket/verbs/check-in.ts";
import get from "../blueprint/things/ticket/verbs/get.ts";

export default Blueprint.journey("check in at the door", {
  cast: { guest: Blueprint.anyone },
  starts: "ticket-claimed",
  steps: (s) => [
    s.step(
      "the ticket is checked in at the door",
      s.guest.run(checkIn, { ticket: s.world.ticket }),
      emits(TicketCheckedIn, { ticket: s.world.ticket }),
      machine.isIn(s.world.ticket, "checkedIn"),
      spans({ present: ["ticket.checkIn", "ticket.checkIn.record"] }),
    ),
    s.step(
      "reading it back shows a checked in ticket",
      s.guest.run(get, { id: s.world.ticket }),
      expect((a) => [a.holder, a.seats, a.state]).toEqual(["Amina", 2n, "checkedIn"]),
      noEvents(),
    ),
    s.step(
      "checking it in again is refused: a ticket gets in once",
      s.guest.run(checkIn, { ticket: s.world.ticket }),
      refuses(machine.notFrom, { state: "checkedIn" }),
      noEvents(),
      spans({ absent: ["ticket.checkIn.record"] }),
    ),
  ],
});
