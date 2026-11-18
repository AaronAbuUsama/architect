// Planted fixture: a new operation, organization.rename, that no journey calls. New file at
// blueprint/things/organization/verbs/rename.ts.
import { Blueprint } from "@formants/forman";
import { Organization } from "../thing.ts";
import { owner } from "../roles.ts";

export default Blueprint.operation(Organization, {
  description: "Rename an organisation.",
  payload: { organization: Organization.fields.id, name: Organization.fields.name },
  answer: { organization: Organization.fields.id },
  allowed: [owner.of("organization")],
  budget: { p95: "200 millis" },
});
