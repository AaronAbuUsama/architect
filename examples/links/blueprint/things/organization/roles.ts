import { Blueprint } from "orthograph";
import { Organization } from "./thing.ts";

// Whoever founded the organisation.
export const owner = Blueprint.role(Organization, { rule: (organization, principal) => organization.owner === principal.person });
