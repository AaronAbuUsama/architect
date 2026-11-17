import { Blueprint } from "@formants/forman";
import { Mission } from "../mission/thing.ts";
import { AgentType, Cents, ModelName, TaskKey } from "../../values/work.ts";

// A row, not an actor, for the same reason as a mission (F5 #3). The Run Durable Object (F4 8.2) is keyed by this id: it
// drives the sandbox and calls report, finish and fail.
export const Run = Blueprint.thing({
  description: "One agent working one task: which agent type, on which model, with what budget.",
  fields: { id: Blueprint.id("run"), mission: Mission.fields.id, task: TaskKey, agent: AgentType, model: ModelName, budget: Cents },
});
