import { Blueprint } from "@architect/blueprint";
import { Mission } from "../mission/thing.ts";
import { Environment, Subject, TaskKinds, Title } from "../../values/work.ts";

// A row in a mission, never an owner (F4 8.1). Scope changes are new rows, so the burn-down shows them as steps.
export const Milestone = Blueprint.thing({
  description: "A stage of a mission: which steps of the build loop, over which thing or operation, and how far.",
  fields: { id: Blueprint.id("mst"), mission: Mission.fields.id, title: Title, kinds: TaskKinds, of: Subject, until: Environment },
  code: "ML",
});
