import { Blueprint } from "orthograph";
import { Organization } from "./thing.ts";

export const OrganizationCreated = Blueprint.event({ organization: Organization.fields.id, owner: Organization.fields.owner });
