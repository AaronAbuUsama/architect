import { Blueprint } from "@formants/forman";
import { Milestone } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Milestone, {
  states: ["active", "dropped"],
  moves: {
    add: { from: [], to: "active", emits: Events.MilestoneAdded },
    drop: { from: ["active"], to: "dropped", emits: Events.MilestoneDropped },
  },
  notFrom: { exit: 52 },
});
