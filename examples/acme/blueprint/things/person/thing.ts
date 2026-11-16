import { Blueprint } from "@architect/blueprint";

export const Person = Blueprint.thing({
  description: "Someone who signs in. People arrive through sign-in from stage two.",
  fields: { id: Blueprint.id("per"), name: Blueprint.text() },
});
