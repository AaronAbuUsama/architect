import { Blueprint } from "@architect/blueprint";
import { Organization } from "./thing.ts";

// Whoever founded the organisation.
export const owner = Blueprint.role(Organization, { rule: (organization, principal) => organization.owner === principal.person });
