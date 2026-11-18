import { Blueprint, Schema } from "@architect/blueprint";

/** A short name a person reads: a mission's title, a question, what needs you. */
export const Title = Blueprint.value(Blueprint.text({ max: 200 }));
/** Why, in a few sentences. */
export const Note = Blueprint.value(Blueprint.text({ max: 4000 }));
/** Where a mission takes its work, and where a promote lands. */
export const Environment = Blueprint.value(Schema.Literals(["test", "staging", "production"]));
/** The steps of the build loop a milestone asks for. A task is one kind over one operation or thing. */
export const TaskKinds = Blueprint.value(Schema.Array(Schema.Literals(["specify", "machine", "validate", "build", "prove", "promote", "spike"])));
/** A thing or an operation of the project's blueprint: `allowance`, `allowance.spend`. */
export const Subject = Blueprint.value(Blueprint.text({ max: 120 }));
/** One task, named as `<kind>:<subject>`: `build:allowance.spend`. Tasks are worked out, never stored. */
export const TaskKey = Blueprint.value(Blueprint.text({ max: 160 }));
/** A compiled blueprint revision, by its digest. */
export const Digest = Blueprint.value(Blueprint.text({ max: 64 }));
/** An agent type declared in `architect/workers/<id>.ts`: `builder`, `sre`. */
export const AgentType = Blueprint.value(Blueprint.text({ max: 60 }));
/** A model id: `claude-sonnet-5-5`. */
export const ModelName = Blueprint.value(Blueprint.text({ max: 80 }));
/** Money in US cents. */
export const Cents = Blueprint.value(Blueprint.uint(64));
/** A git branch a run pushes. */
export const Branch = Blueprint.value(Blueprint.text({ max: 200 }));
/** How a run says it is going. A report never closes a task: only a fact (an eval row, a verdict) does. */
export const Report = Blueprint.value(Schema.Literals(["progress", "waiting", "blocked"]));
/** What only a person decides (F4 8.10). */
export const AttentionKind = Blueprint.value(Schema.Literals(["promote", "money", "credential", "question"]));
/** The lettered answers a question offers. */
export const Options = Blueprint.value(Schema.Array(Schema.String));
/** The letter picked. */
export const Letter = Blueprint.value(Blueprint.text({ max: 2 }));
/** A task as the board shows it: worked out from the milestones, the blueprint and the facts. */
export const Tasks = Blueprint.value(Schema.Array(Schema.Struct({
  key: Schema.String, kind: Schema.String, subject: Schema.String, milestone: Schema.String,
  column: Schema.Literals(["open", "running", "waiting", "proven", "done"]),
})));
