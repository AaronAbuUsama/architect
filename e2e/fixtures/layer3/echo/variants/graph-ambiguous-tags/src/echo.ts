import { EchoProblem as OtherProblem } from "./audit.js";
import { Blueprint } from "@architect/blueprint";

export const Echo = Blueprint.thing({ description: "A fixture echo.", fields: { id: Blueprint.id("echo") } });
export class EchoProblem extends Blueprint.error({}, { exit: 78 }) {}
export const repeat = Blueprint.operation(Echo, {
  description: "Answer with the configured prefix and supplied text.",
  payload: { text: Blueprint.text({ max: 64 }) },
  answer: { text: Blueprint.text({ max: 128 }) },
  errors: [EchoProblem, OtherProblem],
  allowed: [Blueprint.anyone],
});

// An unused declaration exercises stable wire naming without changing the adopted successful repeat body.
