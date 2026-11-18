import { Blueprint } from "orthograph";
import { Handle } from "../thing.ts";
import { HandleNotFound } from "../errors.ts";

export default Blueprint.operation(Handle, {
  description: "Find the handle for a claimed name.",
  payload: { name: Handle.fields.name },
  answer: { handle: Handle.fields.id },
  errors: [HandleNotFound],
  allowed: [Blueprint.anyone],
  steps: { load: Blueprint.step.database() },
  budget: { p95: "150 millis" },
});
