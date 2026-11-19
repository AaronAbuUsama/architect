import { Blueprint } from "orthograph";
import { ApiKey } from "../thing.ts";
import { owner } from "../../organization/roles.ts";
import { Secret } from "../../../values/identity.ts";

export default Blueprint.operation(ApiKey, {
  description: "Create an API key in an organisation. The key itself is shown once.",
  payload: { organization: ApiKey.fields.organization, name: ApiKey.fields.name },
  answer: { apiKey: ApiKey.fields.id, key: Blueprint.issued(Secret) },
  allowed: [owner.of("organization")],
  steps: { issue: Blueprint.step.database(), insert: Blueprint.step.database() },
  budget: { p95: "250 millis" },
});
