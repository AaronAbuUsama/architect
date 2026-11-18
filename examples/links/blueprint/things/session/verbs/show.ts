import { Blueprint } from "orthograph";
import { Session } from "../thing.ts";
import { Person } from "../../person/thing.ts";

export default Blueprint.operation(Session, {
  description: "Who is signed in.",
  payload: {},
  answer: { person: Person.fields.id, email: Person.fields.email },
  allowed: [Blueprint.signedIn],
  budget: { p95: "100 millis" },
});
