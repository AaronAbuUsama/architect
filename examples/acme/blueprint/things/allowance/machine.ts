import { Blueprint } from "@architect/blueprint";
import { Allowance } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Allowance, {
  states: ["active"],
  moves: {
    grant: { from: [], to: "active", emits: Events.AllowanceGranted },
  },
  notFrom: { exit: 40 },
});
