import { Blueprint } from "@architect/blueprint";
import { System } from "../thing.ts";
import { Ok } from "../../../values/identity.ts";

export default Blueprint.operation(System, {
  description: "Is the application up?",
  payload: {},
  answer: { status: Ok },
  allowed: [Blueprint.anyone],
  budget: { p95: "50 millis" },
});
