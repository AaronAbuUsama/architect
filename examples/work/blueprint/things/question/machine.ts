import { Blueprint } from "@formants/forman";
import { Question } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Question, {
  states: ["asked", "answered", "spiked"],
  moves: {
    ask: { from: [], to: "asked", emits: Events.QuestionAsked },
    answer: { from: ["asked"], to: "answered", emits: Events.QuestionAnswered },
    spike: { from: ["asked"], to: "spiked", emits: Events.QuestionSpiked },
  },
  notFrom: { exit: 53 },
});
