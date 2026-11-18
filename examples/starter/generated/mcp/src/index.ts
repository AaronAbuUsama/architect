// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as apiKeyCreate } from "../../api/src/api-key/create.ts";
import { declaration as handleClaim } from "../../api/src/handle/claim.ts";
import { declaration as handleRelease } from "../../api/src/handle/release.ts";
import { declaration as handleResolve } from "../../api/src/handle/resolve.ts";
import { declaration as invitationAccept } from "../../api/src/invitation/accept.ts";
import { declaration as invitationRevoke } from "../../api/src/invitation/revoke.ts";
import { declaration as invitationSend } from "../../api/src/invitation/send.ts";
import { declaration as linkAdd } from "../../api/src/link/add.ts";
import { declaration as linkOrder } from "../../api/src/link/order.ts";
import { declaration as linkRemove } from "../../api/src/link/remove.ts";
import { declaration as membershipGet } from "../../api/src/membership/get.ts";
import { declaration as organizationCreate } from "../../api/src/organization/create.ts";
import { declaration as organizationGet } from "../../api/src/organization/get.ts";
import { declaration as personSignUp } from "../../api/src/person/sign-up.ts";
import { declaration as profileGet } from "../../api/src/profile/get.ts";
import { declaration as sessionShow } from "../../api/src/session/show.ts";
import { declaration as sessionSignIn } from "../../api/src/session/sign-in.ts";
import { declaration as systemHealth } from "../../api/src/system/health.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "api-key.create": { description: "Create an API key in an organisation. The key itself is shown once.", operation: apiKeyCreate },
  "handle.claim": { description: "Claim a free name and make it the address of your public profile.", operation: handleClaim },
  "handle.release": { description: "Free your name and take its public profile offline.", operation: handleRelease },
  "handle.resolve": { description: "Find the handle for a claimed name.", operation: handleResolve },
  "invitation.accept": { description: "Accept an invitation and become a member of its organisation.", operation: invitationAccept },
  "invitation.revoke": { description: "Withdraw an invitation that hasn't been accepted.", operation: invitationRevoke },
  "invitation.send": { description: "Invite someone to an organisation by email.", operation: invitationSend },
  "link.add": { description: "Append a link to your public profile.", operation: linkAdd },
  "link.order": { description: "Move a link to a zero-based position. A position past the end puts it last.", operation: linkOrder },
  "link.remove": { description: "Remove one of your links from your public profile.", operation: linkRemove },
  "membership.get": { description: "Read one membership by its id: organization, person, role.", operation: membershipGet },
  "organization.create": { description: "Found an organisation. Whoever founds it owns it, and is its first member.", operation: organizationCreate },
  "organization.get": { description: "Read one organization by its id: name, owner, state.", operation: organizationGet },
  "person.sign-up": { description: "Sign up with an email address and a password.", operation: personSignUp },
  "profile.get": { description: "Read a claimed name's public profile and its links in display order.", operation: profileGet },
  "session.show": { description: "Who is signed in.", operation: sessionShow },
  "session.sign-in": { description: "Sign in with email and password. The token is the bearer for every later call.", operation: sessionSignIn },
  "system.health": { description: "Is the application up?", operation: systemHealth },
} as const satisfies { readonly [name: string]: McpEntry };
