import { Blueprint } from "@formants/forman";
import { Allowance } from "../thing.ts";
import { grantee } from "../roles.ts";
import { owner } from "../../organization/roles.ts";

// A read. It changes nothing, so it has no move and no handler: it answers from the allowance's records.
export default Blueprint.read(Allowance, {
  by: "id",
  fields: ["organization", "member", "limit", "spent", "state"],
  allowed: [grantee, owner.of("organization")],
  budget: { p95: "50 millis" },
});
