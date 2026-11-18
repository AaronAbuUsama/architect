// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { machine } from "../blueprint/things/ticket/machine.ts";
import { TicketCancelled } from "../blueprint/things/ticket/events.ts";
import cancel from "../blueprint/things/ticket/verbs/cancel.ts";
import checkIn from "../blueprint/things/ticket/verbs/check-in.ts";
import get from "../blueprint/things/ticket/verbs/get.ts";

export default Blueprint.journey("cancel a ticket", {
  cast: { guest: Blueprint.anyone },
  starts: "ticket-claimed",
  steps: (s) => [
    s.step(
      "the guest cancels the ticket",
      s.guest.run(cancel, { ticket: s.world.ticket }),
      emits(TicketCancelled, { ticket: s.world.ticket }),
      machine.isIn(s.world.ticket, "cancelled"),
      spans({ present: ["ticket.cancel", "ticket.cancel.record"] }),
    ),
    s.step(
      "reading it back shows a cancelled ticket",
      s.guest.run(get, { id: s.world.ticket }),
      expect((a) => [a.holder, a.seats, a.state]).toEqual(["Amina", 2n, "cancelled"]),
      noEvents(),
    ),
    s.step(
      "checking in a cancelled ticket is refused",
      s.guest.run(checkIn, { ticket: s.world.ticket }),
      refuses(machine.notFrom, { state: "cancelled" }),
      noEvents(),
      spans({ absent: ["ticket.checkIn.record"] }),
    ),
  ],
});
