// The proof, as functions over plain fetch and the MCP SDK client. Runs in Node against a running `wrangler dev`.
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js"
import type { OAuthClientInformationMixed, OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js"
import { createRemoteJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify } from "jose"

export const ORIGIN = "http://localhost:8802"
export const MCP_URL = `${ORIGIN}/mcp`
export const ISSUER = `${ORIGIN}/api/auth`
const CALLBACK = "http://localhost:8899/callback"

export const log: string[] = []
export const note = (s: string) => { log.push(s); console.log(`    ${s}`) }

let failed = 0
export const failures = () => failed
export const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failed++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`)
}
export const timed = async <T>(label: string, f: () => Promise<T>): Promise<T> => {
  const t0 = performance.now()
  const r = await f()
  console.log(`    [${label}: ${Math.round(performance.now() - t0)} ms]`)
  return r
}

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${ORIGIN}${path}`, { method: "POST", headers: { "content-type": "application/json", origin: ORIGIN, ...headers }, body: JSON.stringify(body) })

export interface Person { email: string; cookie: string; bearer: string; id: string }

const cookieOf = (res: Response) =>
  res.headers.getSetCookie().map((c) => c.split(";")[0]!).join("; ")

export const signUp = async (name: string, email: string, password: string): Promise<Person> => {
  const res = await post("/api/auth/sign-up/email", { name, email, password })
  const body: any = await res.json()
  if (res.status !== 200) throw new Error(`sign-up ${res.status} ${JSON.stringify(body)}`)
  return { email, cookie: cookieOf(res), bearer: res.headers.get("set-auth-token") ?? "", id: body.user.id }
}
export const signIn = async (email: string, password: string): Promise<{ status: number; person?: Person }> => {
  const res = await post("/api/auth/sign-in/email", { email, password })
  if (res.status !== 200) return { status: res.status }
  const body: any = await res.json()
  return { status: 200, person: { email, cookie: cookieOf(res), bearer: res.headers.get("set-auth-token") ?? "", id: body.user.id } }
}

/** An OAuthClientProvider that only remembers; redirectToAuthorization records the URL instead of opening a browser. */
class HeadlessProvider implements OAuthClientProvider {
  info?: OAuthClientInformationMixed
  tok?: OAuthTokens
  verifier = ""
  authUrl?: URL
  get redirectUrl() { return CALLBACK }
  get clientMetadata() {
    return { client_name: "mcp-oauth-spike", redirect_uris: [CALLBACK], grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none" }
  }
  clientInformation() { return this.info }
  saveClientInformation(i: OAuthClientInformationMixed) { this.info = i }
  tokens() { return this.tok }
  saveTokens(t: OAuthTokens) { this.tok = t }
  saveCodeVerifier(v: string) { this.verifier = v }
  codeVerifier() { return this.verifier }
  redirectToAuthorization(u: URL) { this.authUrl = u }
}

export interface Consent { statuses: string[]; consentSeen: boolean; consentPostBody?: unknown }

/** Follow the authorize URL as a signed-in person. Returns the authorization code. */
const authorizeAs = async (person: Person, authUrl: URL, c: Consent): Promise<string> => {
  let next = authUrl.toString()
  for (let i = 0; i < 8; i++) {
    if (next.startsWith(CALLBACK)) {
      const code = new URL(next).searchParams.get("code")
      if (!code) throw new Error(`callback without code: ${next}`)
      return code
    }
    const res =await fetch(next, { redirect: "manual", headers: { cookie: person.cookie } })
    let loc = res.headers.get("location") ?? ""
    // Without a browser's navigation headers the plugin answers 200 {redirect:true,url} instead of a 302.
    if (!loc && res.status === 200 && (res.headers.get("content-type") ?? "").includes("json")) {
      const b: any = await res.json()
      if (b.redirect && b.url) loc = b.url
    }
    c.statuses.push(`${res.status} ${loc.replace(ORIGIN, "").slice(0, 70)}`)
    if (loc.startsWith(CALLBACK)) {
      const u = new URL(loc)
      const code = u.searchParams.get("code")
      if (!code) throw new Error(`callback without code: ${loc}`)
      return code
    }
    if (new URL(loc, ORIGIN).pathname === "/consent") {
      c.consentSeen = true
      const q = new URL(loc, ORIGIN).search.slice(1)
      const r = await post("/api/auth/oauth2/consent", { accept: true, oauth_query: q }, { cookie: person.cookie })
      const body: any = await r.json()
      c.consentPostBody = body
      c.statuses.push(`POST /oauth2/consent -> ${r.status} ${JSON.stringify(body).slice(0, 90)}`)
      const to: string | undefined = body.redirect_uri ?? body.url ?? body.redirectTo
      if (!to) throw new Error(`consent gave no redirect: ${JSON.stringify(body)}`)
      next = to
      continue
    }
    if (!loc) throw new Error(`authorize ${res.status} without location: ${await res.text()}`)
    next = new URL(loc, ORIGIN).toString()
  }
  throw new Error("too many redirects")
}

export interface McpResult { clientInfo: OAuthClientInformationMixed; consent: Consent; tokens: OAuthTokens; clientId: string; text: string; isError: boolean; tools: string[] }

/** Discovery, DCR, PKCE, authorize as `person`, token exchange, then call allowance.get. */
export const mcpAs = async (person: Person, reuseClient?: OAuthClientInformationMixed): Promise<McpResult> => {
  const provider = new HeadlessProvider()
  provider.info = reuseClient
  const consent: Consent = { statuses: [], consentSeen: false }
  const t1 = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: provider })
  const c1 = new Client({ name: "spike", version: "0.0.0" })
  let redirected = false
  try { await c1.connect(t1) } catch (e: any) { redirected = e?.name === "UnauthorizedError" || !!provider.authUrl }
  if (!redirected || !provider.authUrl) throw new Error("expected an authorization redirect")
  const code = await authorizeAs(person, provider.authUrl, consent)
  await t1.finishAuth(code)
  const t2 = new StreamableHTTPClientTransport(new URL(MCP_URL), { authProvider: provider })
  const c2 = new Client({ name: "spike", version: "0.0.0" })
  await c2.connect(t2)
  const tools = (await c2.listTools()).tools.map((t) => t.name)
  const r: any = await c2.callTool({ name: "allowance.get", arguments: {} })
  await c2.close()
  return { consent, tokens: provider.tok!, clientId: (provider.info as any).client_id, clientInfo: provider.info!, text: r.content?.[0]?.text ?? "", isError: !!r.isError, tools }
}

export const verifyJwt = async (token: string) => {
  const jwks = createRemoteJWKSet(new URL(`${ORIGIN}/jwks`))
  return jwtVerify(token, jwks, { issuer: ISSUER, audience: MCP_URL })
}
export { decodeJwt, decodeProtectedHeader }
