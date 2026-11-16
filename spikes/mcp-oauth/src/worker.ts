import { createLocalJWKSet, jwtVerify } from "jose"
import { oauthProviderAuthServerMetadata, oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider"
import { makeAuth, type Env } from "./auth.ts"
import { handleMcp } from "./mcp.ts"
import { ISSUER, MCP_URL, ORIGIN } from "./auth-options.ts"

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } })

const PRM_URL = `${ORIGIN}/.well-known/oauth-protected-resource`
const challenge = (error?: string) =>
  `Bearer resource_metadata="${PRM_URL}"${error ? `, error="${error}"` : ""}`

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const auth = makeAuth(env, url.origin)
    try {
      if (url.pathname.startsWith("/api/auth/")) return await auth.handler(request)

      // Path-aware discovery for an issuer that has a path (RFC 8414 section 3.1): the SDK client tries these first.
      if (url.pathname === "/.well-known/oauth-authorization-server/api/auth") return await oauthProviderAuthServerMetadata(auth)(request)
      if (url.pathname === "/.well-known/openid-configuration/api/auth") return await oauthProviderOpenIdConfigMetadata(auth)(request)

      if (url.pathname === "/jwks") return json(await auth.api.getJwks())

      if (url.pathname === "/.well-known/oauth-protected-resource" || url.pathname === "/.well-known/oauth-protected-resource/mcp")
        return json({ resource: MCP_URL, authorization_servers: [ISSUER], bearer_methods_supported: ["header"], scopes_supported: ["openid", "profile", "email", "offline_access"] })

      // The pages the authorize endpoint redirects a person to. Headless, nothing renders them; they echo what they were given.
      if (url.pathname === "/login" || url.pathname === "/consent") return json({ page: url.pathname, query: Object.fromEntries(url.searchParams) })

      // A session bearer (from the device flow) resolved to a person.
      if (url.pathname === "/me") {
        const session = await auth.api.getSession({ headers: request.headers })
        return session ? json({ id: session.user.id, email: session.user.email }) : json({ error: "unauthenticated" }, 401)
      }

      if (url.pathname === "/mcp") {
        const header = request.headers.get("authorization") ?? ""
        const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : ""
        if (!token) return json({ error: "unauthorized" }, 401, { "www-authenticate": challenge() })
        try {
          const jwks = createLocalJWKSet(await auth.api.getJwks())
          const { payload } = await jwtVerify(token, jwks, { issuer: ISSUER, audience: MCP_URL })
          if (typeof payload.sub !== "string") throw new Error("no sub")
          return await handleMcp(request, env, payload.sub, String(payload.scope ?? ""))
        } catch (e: any) {
          if (e?.name === "McpError") throw e
          if (typeof e?.code === "string" && e.code.startsWith("ERR_J")) return json({ error: "invalid_token", detail: e.code }, 401, { "www-authenticate": challenge("invalid_token") })
          throw e
        }
      }
      return json({ error: "not found" }, 404)
    } catch (e: any) {
      if (e && typeof e === "object" && "statusCode" in e) return json({ apiError: true, status: e.statusCode, body: e.body }, e.statusCode)
      return json({ error: String(e?.stack ?? e) }, 500)
    }
  }
}
