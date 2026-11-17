import { Blueprint } from "@architect/blueprint";
import { Person } from "../person/thing.ts";
import { Digest, Environment, Title } from "../../values/work.ts";

// A row, not an actor: missions are listed, and a list read needs the database. The manager's Durable Object is keyed by
// the mission's id and calls these operations; it holds the conversation, not the mission's state (F5 #3).
export const Mission = Blueprint.thing({
  description: "A goal: milestones of tasks over the blueprint, taken as far as one environment.",
  fields: { id: Blueprint.id("msn"), owner: Person.fields.id, title: Title, target: Environment, blueprint: Digest },
  code: "MS",
});
