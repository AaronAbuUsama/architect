// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, spans } from "@formants/forman";
import { machine } from "../blueprint/things/sheet/machine.ts";
import { SheetOpened } from "../blueprint/things/sheet/events.ts";
import open from "../blueprint/things/sheet/verbs/open.ts";
import get from "../blueprint/things/sheet/verbs/get.ts";

export default Blueprint.journey("put up a sheet", {
  cast: { visitor: Blueprint.anyone },
  steps: (s) => [
    s.step(
      "a visitor puts up a sheet with 3 places",
      s.visitor.run(open, { title: "Book club", places: 3n }),
      expect((a) => a.sheet).toMatch(/^sht_/),
      emits(SheetOpened, { sheet: s.last.sheet, places: 3n }),
      machine.isIn(s.last.sheet, "open"),
      spans({ present: ["sheet.open", "sheet.open.insert"] }),
    ),
    s.step(
      "reading it back shows an open sheet with nobody on it",
      s.visitor.run(get, { id: s.last.sheet }),
      expect((a) => [a.title, a.places, a.taken, a.state]).toEqual(["Book club", 3n, 0n, "open"]),
      noEvents(),
    ),
  ],
});
