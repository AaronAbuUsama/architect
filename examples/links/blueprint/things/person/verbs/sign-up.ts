import { Blueprint } from "orthograph";
import { Person } from "../thing.ts";
import { PersonEmailTaken } from "../errors.ts";
import { Password } from "../../../values/identity.ts";

export default Blueprint.operation(Person, {
  description: "Sign up with an email address and a password.",
  payload: { email: Person.fields.email, password: Password, name: Person.fields.name },
  answer: { person: Person.fields.id },
  errors: [PersonEmailTaken],
  allowed: [Blueprint.anyone],
  steps: { create: Blueprint.step.database() },
  budget: { p95: "400 millis" },
});
