import { Blueprint } from "@architect/blueprint";
import { Membership } from "../thing.ts";
import { holder } from "../roles.ts";
import { owner } from "../../organization/roles.ts";

export default Blueprint.read(Membership, {
  by: "id",
  fields: ["organization", "person", "role"],
  allowed: [holder, owner.of("membership.organization")],
  budget: { p95: "50 millis" },
});
