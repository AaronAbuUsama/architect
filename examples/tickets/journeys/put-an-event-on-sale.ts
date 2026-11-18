// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, spans } from "orthograph";
import { machine } from "../blueprint/things/event/machine.ts";
import { EventOpened } from "../blueprint/things/event/events.ts";
import open from "../blueprint/things/event/verbs/open.ts";
import get from "../blueprint/things/event/verbs/get.ts";

export default Blueprint.journey("put an event on sale", {
  cast: { organiser: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "an organiser puts an event on sale with 3 places",
      s.organiser.run(open, { title: "Book launch", places: 3n }),
      expect((a) => a.event).toMatch(/^evt_/),
      emits(EventOpened, { event: s.last.event, places: 3n }),
      machine.isIn(s.last.event, "onSale"),
      spans({ present: ["event.open", "event.open.insert"] }),
    ),
    s.step(
      "reading it back shows an event on sale with nothing claimed",
      s.organiser.run(get, { id: s.last.event }),
      expect((a) => [a.title, a.places, a.claimed, a.state]).toEqual(["Book launch", 3n, 0n, "onSale"]),
      noEvents(),
    ),
  ],
});
