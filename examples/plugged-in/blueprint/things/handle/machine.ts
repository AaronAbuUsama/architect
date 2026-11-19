import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import { HandleClaimed } from "./events.ts";

export const machine = Blueprint.machine(Handle, {
  states: ["claimed"],
  moves: {
    claim: { from: [], to: "claimed", emits: HandleClaimed },
  },
  notFrom: { exit: 11 },
});
