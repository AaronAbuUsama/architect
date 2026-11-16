import { bearer, deviceAuthorization, jwt } from "better-auth/plugins"
import { oauthProvider } from "@better-auth/oauth-provider"
import type { BetterAuthOptions } from "better-auth"

/** The fixed local port wrangler dev listens on; the origin is what issuer and resource are built from. */
export const PORT = 8802
export const ORIGIN = `http://localhost:${PORT}`
export const MCP_URL = `${ORIGIN}/mcp`
export const ISSUER = `${ORIGIN}/api/auth`

const prefixes: Record<string, string> = { user: "per", session: "ses", account: "acc", verification: "ver" }
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz"
const suffix = (n = 16): string => {
  let out = ""
  while (out.length < n) for (const b of crypto.getRandomValues(new Uint8Array(n))) if (b < 252 && out.length < n) out += ALPHABET[b % 36]
  return out
}
const generateId: NonNullable<NonNullable<BetterAuthOptions["advanced"]>["database"]>["generateId"] = ({ model }) =>
  `${prefixes[model] ?? model.slice(0, 3)}_${suffix()}`

const t = (name: string) => ({ modelName: `auth_${name}` })

/** Options shared by the worker and the schema script. Every table is prefixed `auth_`. */
export const baseOptions = {
  basePath: "/api/auth",
  emailAndPassword: { enabled: true },
  advanced: { database: { generateId } },
  user: t("user"),
  session: t("session"),
  account: t("account"),
  verification: t("verification"),
  // oauth-provider replaces the jwt plugin's /token (it would mint non-OAuth tokens).
  disabledPaths: ["/token"],
  plugins: [
    bearer(),
    jwt({ schema: { jwks: t("jwks") } }),
    oauthProvider({
      loginPage: "/login",
      consentPage: "/consent",
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      // MCP clients register `http://localhost:<port>/callback` and send no application_type; the default "web"
      // refuses any http redirect (measured), so infer native from the loopback redirect.
      clientRegistrationDefaultApplicationType: "infer",
      scopes: ["openid", "profile", "email", "offline_access"],
      resources: [MCP_URL],
      clientRegistrationDefaultResources: [MCP_URL],
      schema: {
        oauthClient: t("oauth_client"),
        oauthRefreshToken: t("oauth_refresh_token"),
        oauthAccessToken: t("oauth_access_token"),
        oauthConsent: t("oauth_consent"),
        oauthResource: t("oauth_resource"),
        oauthClientResource: t("oauth_client_resource"),
        oauthClientAssertion: t("oauth_client_assertion")
      }
    }),
    deviceAuthorization({
      verificationUri: "/device",
      interval: "1s",
      validateClient: (id) => id === "acme-cli",
      schema: { deviceCode: t("device_code") }
    })
  ]
} satisfies BetterAuthOptions
