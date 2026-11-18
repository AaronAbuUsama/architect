import { Blueprint } from "orthograph";
import { Attention } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Attention, {
  states: ["open", "approved", "declined"],
  moves: {
    raise: { from: [], to: "open", emits: Events.AttentionRaised },
    approve: { from: ["open"], to: "approved", emits: Events.AttentionApproved },
    decline: { from: ["open"], to: "declined", emits: Events.AttentionDeclined },
  },
  notFrom: { exit: 55 },
});
