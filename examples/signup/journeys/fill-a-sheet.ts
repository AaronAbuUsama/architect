// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, refuses, spans } from "orthograph";
import { SheetFull } from "../blueprint/things/sheet/errors.ts";
import { machine } from "../blueprint/things/sheet/machine.ts";
import { PlaceTaken } from "../blueprint/things/sheet/events.ts";
import join from "../blueprint/things/sheet/verbs/join.ts";
import get from "../blueprint/things/sheet/verbs/get.ts";

export default Blueprint.journey("fill a sheet", {
  cast: { visitor: Blueprint.anyone },
  starts: "opened",
  steps: (s) => [
    s.step(
      "the first join leaves one place and the sheet stays open",
      s.visitor.run(join, { sheet: s.world.sheet, people: 1n }, { request: "join-1" }),
      expect((a) => a.left).toBe(1n),
      emits(PlaceTaken, { sheet: s.world.sheet, left: 1n }),
      machine.isIn(s.world.sheet, "open"),
      spans({ present: ["sheet.join", "sheet.join.load", "sheet.join.record"] }),
    ),
    s.step(
      "two people are refused: only one place is left",
      s.visitor.run(join, { sheet: s.world.sheet, people: 2n }, { request: "join-2-people" }),
      refuses(SheetFull, { left: 1n }),
      noEvents(),
      machine.isIn(s.world.sheet, "open"),
      spans({ present: ["sheet.join.load"], absent: ["sheet.join.record"] }),
    ),
    s.step(
      "the second join takes the last place and the sheet is full",
      s.visitor.run(join, { sheet: s.world.sheet, people: 1n }, { request: "join-3" }),
      expect((a) => a.left).toBe(0n),
      emits(PlaceTaken, { sheet: s.world.sheet, left: 0n }),
      machine.isIn(s.world.sheet, "full"),
    ),
    s.step(
      "a third join is refused: a full sheet is not open",
      s.visitor.run(join, { sheet: s.world.sheet, people: 1n }, { request: "join-4" }),
      refuses(machine.notFrom, { state: "full" }),
      noEvents(),
      spans({ absent: ["sheet.join.record"] }),
    ),
    s.step(
      "reading it back shows both places taken",
      s.visitor.run(get, { id: s.world.sheet }),
      expect((a) => [a.places, a.taken, a.state]).toEqual([2n, 2n, "full"]),
      noEvents(),
    ),
  ],
});
