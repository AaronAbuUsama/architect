// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "@formants/forman";
import { machine } from "../blueprint/things/sheet/machine.ts";
import { SheetClosed } from "../blueprint/things/sheet/events.ts";
import close from "../blueprint/things/sheet/verbs/close.ts";
import join from "../blueprint/things/sheet/verbs/join.ts";
import get from "../blueprint/things/sheet/verbs/get.ts";

export default Blueprint.journey("a closed sheet takes no one", {
  cast: { visitor: Blueprint.anyone },
  starts: "opened",
  steps: (s) => [
    s.step(
      "the visitor closes the sheet",
      s.visitor.run(close, { sheet: s.world.sheet }),
      emits(SheetClosed, { sheet: s.world.sheet }),
      machine.isIn(s.world.sheet, "closed"),
      spans({ present: ["sheet.close", "sheet.close.record"] }),
    ),
    s.step(
      "joining it is refused",
      s.visitor.run(join, { sheet: s.world.sheet, people: 1n }, { request: "late-1" }),
      refuses(machine.notFrom, { state: "closed" }),
      noEvents(),
      spans({ absent: ["sheet.join.record"] }),
    ),
    s.step(
      "closing it again is refused",
      s.visitor.run(close, { sheet: s.world.sheet }),
      refuses(machine.notFrom, { state: "closed" }),
      noEvents(),
      spans({ absent: ["sheet.close.record"] }),
    ),
    s.step(
      "reading it back shows a closed sheet with nobody on it",
      s.visitor.run(get, { id: s.world.sheet }),
      expect((a) => [a.taken, a.state]).toEqual([0n, "closed"]),
    ),
  ],
});
