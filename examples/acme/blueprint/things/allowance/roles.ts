import { Blueprint } from "@architect/blueprint";
import { Allowance } from "./thing.ts";

// The person the allowance was granted to.
export const grantee = Blueprint.role(Allowance, { rule: (allowance, principal) => allowance.member === principal.person });
