import { Blueprint } from "@architect/blueprint";
import { Organization } from "../thing.ts";

export default Blueprint.operation(Organization, {
  description: "Start an organisation. Whoever creates it owns it.",
  payload: { name: Organization.fields.name, cap: Organization.fields.cap },
  answer: { organization: Organization.fields.id },
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "200 millis" },
});
