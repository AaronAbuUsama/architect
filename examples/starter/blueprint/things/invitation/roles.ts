import { Blueprint } from "@formants/forman";
import { Invitation } from "./thing.ts";

// Whoever signed in with the address the invitation was sent to.
export const invitee = Blueprint.role(Invitation, { rule: (invitation, principal) => invitation.email === principal.email });
