import { Blueprint } from "orthograph";
import { Sheet } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Sheet, {
  states: ["open", "full", "closed"],
  moves: {
    open: { from: [], to: "open", emits: Events.SheetOpened },
    join: { from: ["open"], to: ["open", "full"], emits: Events.PlaceTaken }, // the last place fills it
    close: { from: ["open", "full"], to: "closed", emits: Events.SheetClosed },
  },
  notFrom: { exit: 70 }, // generates SheetNotOpen
});
