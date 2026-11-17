import { Blueprint } from "@architect/blueprint";
import { Fact } from "../thing.ts";

export default Blueprint.operation(Fact, {
  description: "Record a fact (spike only: the logbook's job once L3.01 lands).",
  payload: { subject: Fact.fields.subject, kind: Fact.fields.kind, env: Fact.fields.env, result: Fact.fields.result, note: Fact.fields.note, revision: Fact.fields.revision },
  answer: { fact: Fact.fields.id },
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
  budget: { p95: "200 millis" },
});
