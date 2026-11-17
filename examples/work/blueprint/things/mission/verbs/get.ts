import { Blueprint } from "@architect/blueprint";
import { Mission } from "../thing.ts";
import { owner } from "../roles.ts";

export default Blueprint.read(Mission, {
  by: "id",
  fields: ["owner", "title", "target", "blueprint", "state"],
  allowed: [owner],
  budget: { p95: "50 millis" },
});
