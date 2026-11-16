import { bearer, organization } from "better-auth/plugins"
import { apiKey } from "@better-auth/api-key"
import type { BetterAuthOptions } from "better-auth"

const prefixes: Record<string, string> = {
  user: "per",
  session: "ses",
  account: "acc",
  verification: "ver",
  organization: "org",
  member: "mem",
  invitation: "inv",
  apikey: "key"
}

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"

/** 16 lowercase base36 chars, rejection-sampled so there is no modulo bias. */
export const suffix = (n = 16): string => {
  let out = ""
  while (out.length < n) {
    const bytes = crypto.getRandomValues(new Uint8Array(n))
    for (const b of bytes) {
      if (b < 252 && out.length < n) out += ALPHABET[b % 36]
    }
  }
  return out
}

export const generateId: NonNullable<NonNullable<BetterAuthOptions["advanced"]>["database"]>["generateId"] = ({ model }) =>
  `${prefixes[model] ?? model.slice(0, 3)}_${suffix()}`

export const plugins = () => [
    bearer(),
    organization({
      // No sendInvitationEmail on purpose: question 5 asks whether invitations work without email.
      // With a custom generateId the default is to demand a verified email to list/accept invitations
      // (run 1 measured 403 EMAIL_VERIFICATION_REQUIRED_*). Our ids are 16 random base36 chars, so opt out.
      requireEmailVerificationOnInvitation: false
    }),
    apiKey([
      { configId: "user", references: "user", enableSessionForAPIKeys: true },
      { configId: "org", references: "organization" }
    ])
  ]

export const baseOptions = {
  emailAndPassword: { enabled: true },
  advanced: { database: { generateId } },
  plugins: plugins()
} satisfies BetterAuthOptions
