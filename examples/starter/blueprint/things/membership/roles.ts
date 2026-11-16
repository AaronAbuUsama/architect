import { Blueprint } from "@architect/blueprint";
import { Membership } from "./thing.ts";

// The person the membership belongs to.
export const holder = Blueprint.role(Membership, { rule: (membership, principal) => membership.person === principal.person });
