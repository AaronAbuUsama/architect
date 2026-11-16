import { Blueprint } from "@architect/blueprint";
import { Organization } from "../thing.ts";
import { owner } from "../roles.ts";

export default Blueprint.read(Organization, {
  by: "id",
  fields: ["name", "owner", "state"],
  allowed: [owner],
  budget: { p95: "50 millis" },
});
