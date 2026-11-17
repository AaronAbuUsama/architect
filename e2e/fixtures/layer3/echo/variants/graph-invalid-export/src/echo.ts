import { Blueprint } from "@architect/blueprint";

export const Echo = Blueprint.thing({ description: "A fixture echo.", fields: { id: Blueprint.id("echo") } });
const repeat = Blueprint.operation(Echo, {
  description: "Answer with the configured prefix and supplied text.",
  payload: { text: Blueprint.text({ max: 64 }) },
  answer: { text: Blueprint.text({ max: 128 }) },
  allowed: [Blueprint.anyone],
});

// An unused declaration exercises stable wire naming without changing the adopted successful repeat body.
export class EchoProblem extends Blueprint.error({}, { exit: 78 }) {}

export { repeat as "bad/name" };
