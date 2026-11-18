// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
import { Blueprint, emits, expect, noEvents, spans } from "orthograph";
import { PlaceTaken } from "../blueprint/things/sheet/events.ts";
import join from "../blueprint/things/sheet/verbs/join.ts";
import get from "../blueprint/things/sheet/verbs/get.ts";

export default Blueprint.journey("join twice with one request", {
  cast: { visitor: Blueprint.anyone },
  starts: "opened",
  steps: (s) => [
    s.step(
      "the visitor joins",
      s.visitor.run(join, { sheet: s.world.sheet, people: 1n }, { request: "me-1" }),
      expect((a) => a.left).toBe(1n),
      emits(PlaceTaken, { sheet: s.world.sheet, left: 1n }),
    ),
    s.step(
      "the same request again gives the same answer and takes nothing",
      s.visitor.run(join, { sheet: s.world.sheet, people: 1n }, { request: "me-1" }),
      expect((a) => a.left).toBe(1n),
      noEvents(),
      spans({ absent: ["sheet.join.record"] }),
    ),
    s.step(
      "only one place was taken",
      s.visitor.run(get, { id: s.world.sheet }),
      expect((a) => [a.taken, a.state]).toEqual([1n, "open"]),
    ),
  ],
});
