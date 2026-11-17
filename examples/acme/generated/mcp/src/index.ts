// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@formants/language-effect";
import { declaration as allowanceGet } from "../../api/src/allowance/get.ts";
import { declaration as allowanceGrant } from "../../api/src/allowance/grant.ts";
import { declaration as allowanceRevoke } from "../../api/src/allowance/revoke.ts";
import { declaration as allowanceSpend } from "../../api/src/allowance/spend.ts";
import { declaration as apiKeyCreate } from "../../api/src/api-key/create.ts";
import { declaration as invitationAccept } from "../../api/src/invitation/accept.ts";
import { declaration as invitationRevoke } from "../../api/src/invitation/revoke.ts";
import { declaration as invitationSend } from "../../api/src/invitation/send.ts";
import { declaration as membershipGet } from "../../api/src/membership/get.ts";
import { declaration as organizationCreate } from "../../api/src/organization/create.ts";
import { declaration as organizationGet } from "../../api/src/organization/get.ts";
import { declaration as personSignUp } from "../../api/src/person/sign-up.ts";
import { declaration as sessionShow } from "../../api/src/session/show.ts";
import { declaration as sessionSignIn } from "../../api/src/session/sign-in.ts";
import { declaration as systemHealth } from "../../api/src/system/health.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "allowance.get": { description: "Read one allowance by its id: organization, member, limit, spent, state.", operation: allowanceGet },
  "allowance.grant": { description: "Let a member spend from the organisation, up to a limit each month.", operation: allowanceGrant },
  "allowance.revoke": { description: "Stop an allowance. Nothing more can be spent from it.", operation: allowanceRevoke },
  "allowance.spend": { description: "Spend from what is left of this month's allowance.", operation: allowanceSpend },
  "api-key.create": { description: "Create an API key in an organisation. The key itself is shown once.", operation: apiKeyCreate },
  "invitation.accept": { description: "Accept an invitation and become a member of its organisation.", operation: invitationAccept },
  "invitation.revoke": { description: "Withdraw an invitation that hasn't been accepted.", operation: invitationRevoke },
  "invitation.send": { description: "Invite someone to an organisation by email.", operation: invitationSend },
  "membership.get": { description: "Read one membership by its id: organization, person, role.", operation: membershipGet },
  "organization.create": { description: "Found an organisation with its cap. Whoever founds it owns it, and is its first member.", operation: organizationCreate },
  "organization.get": { description: "Read one organization by its id: name, owner, state.", operation: organizationGet },
  "person.sign-up": { description: "Sign up with an email address and a password.", operation: personSignUp },
  "session.show": { description: "Who is signed in.", operation: sessionShow },
  "session.sign-in": { description: "Sign in with email and password. The token is the bearer for every later call.", operation: sessionSignIn },
  "system.health": { description: "Is the application up?", operation: systemHealth },
} as const satisfies { readonly [name: string]: McpEntry };
