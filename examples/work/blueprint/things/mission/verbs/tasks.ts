import { Blueprint } from "@architect/blueprint";
import { Mission } from "../thing.ts";
import { owner } from "../roles.ts";
import { Tasks } from "../../../values/work.ts";

// The board. Tasks are never stored: each milestone's kinds over its subject, against the blueprint revision, each put in
// a column by the facts. Open, running (a live run claims it), waiting (attention open), proven (eval rows pass in test),
// done (a recorded pass up to the target). A run's report never moves a card (F4 8.4, 8.8).
export default Blueprint.operation(Mission, {
  description: "The mission's tasks, each in the column its facts put it in.",
  payload: { mission: Mission.fields.id },
  answer: { tasks: Tasks },
  allowed: [owner.of("mission")],
  steps: {
    plan: Blueprint.step.database(), // milestones, questions spiked, runs and attention, from this project
    facts: Blueprint.step.database(), // SPIKE: the fact table stands in for the logbook (L3.01)
  },
  budget: { p95: "300 millis" },
});
